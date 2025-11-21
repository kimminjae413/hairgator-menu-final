// scripts/test-search-quality.js
// 벡터 검색 품질 테스트 스크립트

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

// Supabase 벡터 검색
async function searchRecipes(query, gender = 'male', limit = 5) {
  console.log(`\n🔍 검색: "${query}" (성별: ${gender})`);

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

// Theory 검색
async function searchTheory(query, limit = 5) {
  console.log(`\n📚 이론 검색: "${query}"`);

  const start = Date.now();
  const embedding = await generateEmbedding(query);
  const embeddingTime = Date.now() - start;

  const searchStart = Date.now();
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/match_theory_chunks`);

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
    match_count: limit
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

// 테스트 케이스 정의
const testCases = [
  // 레시피 검색 - 남성
  { type: 'recipe', query: '단발 스타일 추천해줘', gender: 'male', expected: '남성 단발' },
  { type: 'recipe', query: '옆머리가 짧은 스타일', gender: 'male', expected: '사이드 프린지' },
  { type: 'recipe', query: '레이어가 있는 스타일', gender: 'male', expected: '레이어' },

  // 레시피 검색 - 여성
  { type: 'recipe', query: '긴 머리 레이어 스타일', gender: 'female', expected: '레이어' },
  { type: 'recipe', query: '단발 앞머리 있는 스타일', gender: 'female', expected: '앞머리' },

  // 이론 검색
  { type: 'theory', query: '레이어 커트가 뭐야?', expected: 'Layer' },
  { type: 'theory', query: '그라데이션과 레이어의 차이', expected: 'Graduation' },
  { type: 'theory', query: '클리퍼 오버 콤 기법', expected: 'Clipper Over Comb' },
];

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 Supabase 검색 품질 테스트 시작\n');
  console.log('='.repeat(60));

  const results = [];
  let totalTests = 0;
  let passedTests = 0;

  for (const test of testCases) {
    totalTests++;

    try {
      let searchResult;

      if (test.type === 'recipe') {
        searchResult = await searchRecipes(test.query, test.gender, 5);
      } else {
        searchResult = await searchTheory(test.query, 5);
      }

      const { results: items, timing } = searchResult;

      console.log(`⏱️  타이밍: 임베딩 ${timing.embedding}ms | 검색 ${timing.search}ms | 총 ${timing.total}ms`);
      console.log(`📊 결과: ${items.length}개 발견`);

      if (items.length > 0) {
        console.log('\n🎯 상위 3개 결과:');
        items.slice(0, 3).forEach((item, idx) => {
          if (test.type === 'recipe') {
            console.log(`   ${idx + 1}. ${item.sample_code} (유사도: ${(item.similarity * 100).toFixed(1)}%)`);
            console.log(`      키워드: ${item.keywords ? item.keywords.slice(0, 5).join(', ') : 'N/A'}`);
          } else {
            console.log(`   ${idx + 1}. ${item.section_title} (유사도: ${(item.similarity * 100).toFixed(1)}%)`);
            console.log(`      내용: ${item.content.substring(0, 80)}...`);
          }
        });

        // 기대값 검증
        const hasExpected = items.some(item => {
          if (test.type === 'recipe') {
            return item.keywords && item.keywords.some(kw => kw.includes(test.expected));
          } else {
            return item.section_title.includes(test.expected) || item.content.includes(test.expected);
          }
        });

        if (hasExpected) {
          console.log(`\n✅ PASS: "${test.expected}" 관련 결과 발견`);
          passedTests++;
        } else {
          console.log(`\n❌ FAIL: "${test.expected}" 관련 결과 없음`);
        }

        results.push({
          test: test.query,
          passed: hasExpected,
          timing,
          resultCount: items.length
        });
      } else {
        console.log('\n⚠️  검색 결과 없음');
        results.push({
          test: test.query,
          passed: false,
          timing,
          resultCount: 0
        });
      }

    } catch (error) {
      console.error(`\n❌ 오류 발생: ${error.message}`);
      results.push({
        test: test.query,
        passed: false,
        error: error.message
      });
    }

    console.log('-'.repeat(60));
  }

  // 최종 요약
  console.log('\n📈 테스트 요약');
  console.log('='.repeat(60));
  console.log(`총 테스트: ${totalTests}개`);
  console.log(`통과: ${passedTests}개 (${(passedTests/totalTests*100).toFixed(1)}%)`);
  console.log(`실패: ${totalTests - passedTests}개`);

  // 평균 타이밍
  const avgTiming = results
    .filter(r => r.timing)
    .reduce((acc, r) => ({
      embedding: acc.embedding + r.timing.embedding,
      search: acc.search + r.timing.search,
      total: acc.total + r.timing.total,
      count: acc.count + 1
    }), { embedding: 0, search: 0, total: 0, count: 0 });

  if (avgTiming.count > 0) {
    console.log(`\n⏱️  평균 응답 시간:`);
    console.log(`   임베딩: ${(avgTiming.embedding / avgTiming.count).toFixed(0)}ms`);
    console.log(`   검색: ${(avgTiming.search / avgTiming.count).toFixed(0)}ms`);
    console.log(`   총: ${(avgTiming.total / avgTiming.count).toFixed(0)}ms`);
  }

  console.log('\n✅ 테스트 완료!');
}

// 실행
runTests().catch(console.error);
