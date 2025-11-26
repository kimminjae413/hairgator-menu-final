// scripts/test-improved-vector-search.js
// 개선된 recipe_embedding으로 벡터 검색 테스트

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
const GEMINI_API_KEY = envVars.GEMINI_API_KEY;

// Google Gemini API로 임베딩 생성
function generateEmbedding(text) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

    const data = JSON.stringify({
      model: "models/text-embedding-004",
      content: {
        parts: [{
          text: text
        }]
      }
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(body);
          resolve(result.embedding.values);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Supabase RPC 호출
function callSupabaseRPC(functionName, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`);

    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(params));
    req.end();
  });
}

// 벡터 검색 수행
async function searchRecipes(query, gender = 'female', topK = 5) {
  const embedding = await generateEmbedding(query);

  const results = await callSupabaseRPC('match_recipe_samples', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: topK,
    filter_gender: gender
  });

  return results;
}

// 길이 코드 설명
const lengthDescriptions = {
  'A': '가슴 아래 (65cm)',
  'B': '가슴 (60cm)',
  'C': '쇄골 (55cm)',
  'D': '어깨선 (35cm)',
  'E': '어깨 위 (30cm)',
  'F': '턱선 (25cm)',
  'G': '짧은 보브 (20cm)',
  'H': '베리숏 (15cm)'
};

// 테스트 케이스들
const testCases = [
  {
    query: '짧은 보브',
    expectedLengthCodes: ['G'],
    description: '짧은 보브 → G (20cm, 이전에는 A/B 롱헤어가 나왔음)'
  },
  {
    query: '베리숏',
    expectedLengthCodes: ['H'],
    description: '베리숏 → H (15cm, 이전에는 A/B 롱헤어가 나왔음)'
  },
  {
    query: '어깨 길이 단발',
    expectedLengthCodes: ['D', 'E'],
    description: '어깨 길이 단발 → D/E (35-30cm)'
  },
  {
    query: '가슴까지 오는 긴 머리',
    expectedLengthCodes: ['B'],
    description: '가슴 길이 → B (60cm)'
  },
  {
    query: '쇄골 정도의 머리',
    expectedLengthCodes: ['C'],
    description: '쇄골 길이 → C (55cm)'
  },
  {
    query: '턱 밑에 오는 짧은 단발',
    expectedLengthCodes: ['F'],
    description: '턱선 → F (25cm)'
  },
  {
    query: '가슴 아래로 내려오는 롱헤어',
    expectedLengthCodes: ['A'],
    description: '가슴 아래 → A (65cm)'
  },
  {
    query: '측면 레이어가 있는 짧은 보브',
    expectedLengthCodes: ['G'],
    description: '짧은 보브 + 측면 레이어 → G (20cm)'
  }
];

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 개선된 벡터 검색 테스트 시작\n');
  console.log('='.repeat(80));
  console.log('목표: 수정된 요약문과 재생성된 embedding으로 올바른 길이 검색 확인');
  console.log('='.repeat(80));
  console.log();

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[테스트 ${i + 1}/${testCases.length}] ${testCase.description}`);
    console.log(`🔍 검색어: "${testCase.query}"`);
    console.log(`📏 예상 길이 코드: ${testCase.expectedLengthCodes.map(c => `${c} (${lengthDescriptions[c]})`).join(', ')}`);
    console.log();

    try {
      const results = await searchRecipes(testCase.query, 'female', 5);

      if (results.length === 0) {
        console.log('❌ 검색 결과 없음');
        failedTests++;
        continue;
      }

      console.log(`📊 상위 5개 결과:`);
      results.forEach((result, idx) => {
        const lengthCode = result.sample_code.charAt(1);
        const similarity = (result.similarity * 100).toFixed(1);
        console.log(`  ${idx + 1}. ${result.sample_code} (${lengthCode}=${lengthDescriptions[lengthCode]}) - ${similarity}% 유사도`);
        console.log(`     "${result.recipe_summary_ko}"`);
      });

      // 상위 3개 결과의 길이 코드 확인
      const top3LengthCodes = results.slice(0, 3).map(r => r.sample_code.charAt(1));
      const matchedCount = top3LengthCodes.filter(code =>
        testCase.expectedLengthCodes.includes(code)
      ).length;

      if (matchedCount >= 2) {
        console.log(`\n✅ 테스트 통과! (상위 3개 중 ${matchedCount}개가 예상 길이 코드와 일치)`);
        passedTests++;
      } else {
        console.log(`\n❌ 테스트 실패! (상위 3개 중 ${matchedCount}개만 예상 길이 코드와 일치)`);
        failedTests++;
      }

    } catch (error) {
      console.log(`\n❌ 오류 발생: ${error.message}`);
      failedTests++;
    }

    // API 호출 제한 방지를 위해 잠시 대기
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 테스트 결과 요약');
  console.log('='.repeat(80));
  console.log(`✅ 통과: ${passedTests}/${testCases.length}`);
  console.log(`❌ 실패: ${failedTests}/${testCases.length}`);
  console.log(`📊 성공률: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

  if (passedTests === testCases.length) {
    console.log('\n🎉 모든 테스트 통과! 벡터 검색이 올바르게 작동합니다.');
  } else {
    console.log(`\n⚠️  ${failedTests}개의 테스트가 실패했습니다. 추가 개선이 필요할 수 있습니다.`);
  }
}

// 실행
runTests().catch(error => {
  console.error('💥 치명적 오류:', error);
  console.error(error.stack);
});
