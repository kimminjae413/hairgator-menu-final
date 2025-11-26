// scripts/full-diagnosis.js
// 완전한 Supabase 상태 진단

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

function httpsRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ body: JSON.parse(body), status: res.statusCode });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          resolve({ body: body, status: res.statusCode, raw: true });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function diagnose() {
  console.log('🔍 완전한 Supabase 상태 진단\n');
  console.log('='.repeat(80));

  // 1. 테이블 데이터 확인
  console.log('\n📊 1. 테이블 데이터 타입 확인\n');

  try {
    const url = `${SUPABASE_URL}/rest/v1/recipe_samples?select=id,sample_code,image_embedding,recipe_embedding,summary_embedding&limit=1`;
    const response = await httpsRequest(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.body.length > 0) {
      const sample = response.body[0];

      console.log('   image_embedding:');
      console.log(`     타입: ${typeof sample.image_embedding}`);
      console.log(`     Array: ${Array.isArray(sample.image_embedding)}`);
      if (typeof sample.image_embedding === 'string') {
        console.log(`     길이: ${sample.image_embedding.length}자`);
        console.log(`     시작: ${sample.image_embedding.substring(0, 30)}...`);
      } else if (Array.isArray(sample.image_embedding)) {
        console.log(`     차원: ${sample.image_embedding.length}`);
      }

      console.log('\n   recipe_embedding:');
      console.log(`     타입: ${typeof sample.recipe_embedding}`);
      console.log(`     Array: ${Array.isArray(sample.recipe_embedding)}`);

      console.log('\n   summary_embedding:');
      console.log(`     타입: ${typeof sample.summary_embedding}`);
      console.log(`     Array: ${Array.isArray(sample.summary_embedding)}`);
    }
  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
  }

  // 2. RPC 함수 테스트
  console.log('\n\n🔧 2. RPC 함수 작동 테스트\n');

  try {
    // 간단한 임베딩 생성
    console.log('   Gemini 임베딩 생성 중...');
    const embUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`;
    const embResponse = await httpsRequest(embUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      model: 'models/text-embedding-004',
      content: { parts: [{ text: '짧은 보브 테스트' }] }
    });

    const testEmbedding = embResponse.body.embedding.values;
    console.log(`   ✅ 테스트 임베딩 생성 완료 (${testEmbedding.length}차원)`);

    // RPC 함수 호출 테스트
    console.log('\n   match_recipe_samples RPC 테스트...');
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/match_recipe_samples`;
    const rpcResponse = await httpsRequest(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, {
      query_embedding: testEmbedding,
      match_threshold: 0.5,
      match_count: 3,
      filter_gender: 'female'
    });

    if (rpcResponse.body && Array.isArray(rpcResponse.body)) {
      console.log(`   ✅ RPC 함수 작동! ${rpcResponse.body.length}개 결과 반환`);

      if (rpcResponse.body.length > 0) {
        const result = rpcResponse.body[0];
        console.log(`\n   샘플 결과:`);
        console.log(`     - sample_code: ${result.sample_code}`);
        console.log(`     - similarity: ${result.similarity || result.match_score || 'N/A'}`);
      }
    } else {
      console.log(`   ⚠️  예상과 다른 응답: ${JSON.stringify(rpcResponse.body).substring(0, 100)}`);
    }

  } catch (error) {
    console.log(`   ❌ RPC 테스트 실패: ${error.message}`);
  }

  // 3. 전체 통계
  console.log('\n\n📈 3. 전체 데이터 통계\n');

  try {
    const url = `${SUPABASE_URL}/rest/v1/recipe_samples?select=count`;
    const response = await httpsRequest(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    // Content-Range 헤더에서 count 추출이 안 되므로 다른 방법
    console.log('   (통계 조회 시도...)');

  } catch (error) {
    console.log(`   ⚠️  통계 조회 실패`);
  }

  // 최종 결론
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 진단 결과 요약\n');
  console.log('   이 결과를 보고 다음을 판단하세요:');
  console.log('   1. 임베딩이 Array로 반환되면 → ✅ 이미 VECTOR 타입 (작업 불필요)');
  console.log('   2. 임베딩이 String으로 반환되면 → ❌ TEXT 타입 (변환 필요)');
  console.log('   3. RPC 함수가 작동하면 → ✅ 챗봇 사용 가능');
  console.log('   4. RPC 함수가 실패하면 → ❌ 수정 필요\n');
  console.log('='.repeat(80) + '\n');
}

diagnose().catch(console.error);
