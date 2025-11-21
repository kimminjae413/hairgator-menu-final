// scripts/test-summary-search.js
// 요약문 기반 벡터 검색 품질 테스트

const fs = require('fs');
const path = require('path');
const https = require('https');

// .env 파일 파싱
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = envVars.GEMINI_API_KEY;

// HTTP 요청 헬퍼
function httpsRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Gemini 임베딩 생성
async function generateEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`;

  const data = await httpsRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    model: 'models/text-embedding-004',
    content: { parts: [{ text }] }
  });

  return data.embedding.values;
}

// 요약문 기반 벡터 검색
async function searchRecipesBySummary(query, gender = 'female', limit = 5) {
  console.log(`\n🔍 요약문 검색: "${query}" (성별: ${gender})`);

  const start = Date.now();
  const embedding = await generateEmbedding(query);
  const embeddingTime = Date.now() - start;

  const searchStart = Date.now();
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/match_recipe_summaries`);

  const results = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  }, {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: limit,
    filter_gender: gender
  });

  const searchTime = Date.now() - searchStart;
  const totalTime = Date.now() - start;

  return {
    results,
    timing: {
      embedding: embeddingTime,
      search: searchTime,
      total: totalTime
    }
  };
}

// 기존 레시피 텍스트 기반 검색 (비교용)
async function searchRecipesByText(query, gender = 'female', limit = 5) {
  const start = Date.now();
  const embedding = await generateEmbedding(query);
  const embeddingTime = Date.now() - start;

  const searchStart = Date.now();
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/match_recipe_samples`);

  const results = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  }, {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: limit,
    filter_gender: gender
  });

  const searchTime = Date.now() - searchStart;
  const totalTime = Date.now() - start;

  return {
    results,
    timing: {
      embedding: embeddingTime,
      search: searchTime,
      total: totalTime
    }
  };
}

// 테스트 케이스 (여성 컷 중심 - 요약문이 있는 레시피)
const testCases = [
  { query: '긴 머리 레이어 스타일', expected: '레이어', gender: 'female' },
  { query: '단발 앞머리 있는 스타일', expected: '앞머리', gender: 'female' },
  { query: '허리까지 오는 긴 생머리', expected: '롱', gender: 'female' },
  { query: '가볍고 자연스러운 단발머리', expected: '단발', gender: 'female' },
  { query: '얼굴을 감싸는 레이어 컷', expected: '레이어', gender: 'female' },
  { query: '일자로 떨어지는 단발', expected: '단발', gender: 'female' },
  { query: '뒤가 짧고 앞이 긴 스타일', expected: 'A라인', gender: 'female' },
  { query: '무게감 있는 롱헤어', expected: '롱', gender: 'female' },
];

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 요약문 기반 검색 vs 텍스트 기반 검색 비교\n');
  console.log('='.repeat(70));

  let summaryPassCount = 0;
  let textPassCount = 0;
  const avgSimilarity = { summary: [], text: [] };

  for (const test of testCases) {
    console.log(`\n📝 쿼리: "${test.query}"`);
    console.log(`   기대 키워드: "${test.expected}"\n`);

    try {
      // 1. 요약문 기반 검색
      const summaryResult = await searchRecipesBySummary(test.query, test.gender, 3);
      console.log(`⏱️  요약문 검색 시간: ${summaryResult.timing.total}ms`);

      if (summaryResult.results.length > 0) {
        console.log('🎯 요약문 검색 상위 3개:');
        summaryResult.results.forEach((item, idx) => {
          console.log(`   ${idx + 1}. ${item.sample_code} (유사도: ${(item.similarity * 100).toFixed(1)}%)`);
          console.log(`      키워드: ${item.keywords ? item.keywords.slice(0, 5).join(', ') : 'N/A'}`);
          if (item.recipe_summary_ko) {
            console.log(`      요약: ${item.recipe_summary_ko.substring(0, 80)}...`);
          }
          avgSimilarity.summary.push(item.similarity);
        });

        const summaryPassed = summaryResult.results.some(item =>
          item.keywords && item.keywords.some(kw => kw.includes(test.expected))
        );
        if (summaryPassed) {
          console.log(`   ✅ 요약문 검색 성공`);
          summaryPassCount++;
        } else {
          console.log(`   ❌ 요약문 검색 실패`);
        }
      } else {
        console.log('⚠️  요약문 검색 결과 없음');
      }

      // 잠시 대기 (API rate limit)
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. 기존 텍스트 기반 검색 (비교용)
      const textResult = await searchRecipesByText(test.query, test.gender, 3);
      console.log(`\n⏱️  텍스트 검색 시간: ${textResult.timing.total}ms`);

      if (textResult.results.length > 0) {
        console.log('📄 텍스트 검색 상위 3개:');
        textResult.results.forEach((item, idx) => {
          console.log(`   ${idx + 1}. ${item.sample_code} (유사도: ${(item.similarity * 100).toFixed(1)}%)`);
          console.log(`      키워드: ${item.keywords ? item.keywords.slice(0, 5).join(', ') : 'N/A'}`);
          avgSimilarity.text.push(item.similarity);
        });

        const textPassed = textResult.results.some(item =>
          item.keywords && item.keywords.some(kw => kw.includes(test.expected))
        );
        if (textPassed) {
          console.log(`   ✅ 텍스트 검색 성공`);
          textPassCount++;
        } else {
          console.log(`   ❌ 텍스트 검색 실패`);
        }
      } else {
        console.log('⚠️  텍스트 검색 결과 없음');
      }

      // 유사도 비교
      if (summaryResult.results.length > 0 && textResult.results.length > 0) {
        const avgSummarySim = summaryResult.results.reduce((sum, r) => sum + r.similarity, 0) / summaryResult.results.length;
        const avgTextSim = textResult.results.reduce((sum, r) => sum + r.similarity, 0) / textResult.results.length;
        const improvement = ((avgSummarySim - avgTextSim) / avgTextSim * 100);

        console.log(`\n📊 평균 유사도 비교:`);
        console.log(`   요약문: ${(avgSummarySim * 100).toFixed(1)}% vs 텍스트: ${(avgTextSim * 100).toFixed(1)}%`);
        if (improvement > 0) {
          console.log(`   🎉 요약문이 ${improvement.toFixed(1)}% 더 높음`);
        } else {
          console.log(`   ⚠️  텍스트가 ${Math.abs(improvement).toFixed(1)}% 더 높음`);
        }
      }

    } catch (error) {
      console.error(`\n❌ 오류 발생: ${error.message}`);
    }

    console.log('-'.repeat(70));

    // API rate limit 고려
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 최종 결과 요약
  console.log('\n📈 테스트 결과 요약');
  console.log('='.repeat(70));
  console.log(`총 테스트: ${testCases.length}개\n`);

  console.log(`🎯 요약문 기반 검색:`);
  console.log(`   통과: ${summaryPassCount}/${testCases.length} (${(summaryPassCount/testCases.length*100).toFixed(1)}%)`);
  if (avgSimilarity.summary.length > 0) {
    const avgSim = avgSimilarity.summary.reduce((a, b) => a + b, 0) / avgSimilarity.summary.length;
    console.log(`   평균 유사도: ${(avgSim * 100).toFixed(1)}%`);
  }

  console.log(`\n📄 텍스트 기반 검색:`);
  console.log(`   통과: ${textPassCount}/${testCases.length} (${(textPassCount/testCases.length*100).toFixed(1)}%)`);
  if (avgSimilarity.text.length > 0) {
    const avgSim = avgSimilarity.text.reduce((a, b) => a + b, 0) / avgSimilarity.text.length;
    console.log(`   평균 유사도: ${(avgSim * 100).toFixed(1)}%`);
  }

  // 개선도 계산
  if (avgSimilarity.summary.length > 0 && avgSimilarity.text.length > 0) {
    const avgSummary = avgSimilarity.summary.reduce((a, b) => a + b, 0) / avgSimilarity.summary.length;
    const avgText = avgSimilarity.text.reduce((a, b) => a + b, 0) / avgSimilarity.text.length;
    const improvement = ((avgSummary - avgText) / avgText * 100);

    console.log(`\n🎊 전체 개선도:`);
    if (improvement > 0) {
      console.log(`   요약문 기반 검색이 평균 ${improvement.toFixed(1)}% 더 높은 유사도를 보였습니다!`);
    } else {
      console.log(`   텍스트 기반 검색이 평균 ${Math.abs(improvement).toFixed(1)}% 더 높은 유사도를 보였습니다.`);
    }
  }

  console.log('\n✅ 테스트 완료!');
}

// 실행
runTests().catch(console.error);
