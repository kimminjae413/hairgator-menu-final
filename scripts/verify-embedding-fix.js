// scripts/verify-embedding-fix.js
// 임베딩 컬럼 타입 변환이 정상적으로 완료되었는지 검증

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

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('🔍 임베딩 컬럼 타입 변환 검증 시작...\n');
  console.log('='.repeat(80));

  let allPassed = true;

  // 1. recipe_samples 검증
  console.log('\n📊 1. recipe_samples 테이블 검증\n');
  try {
    const url = `${SUPABASE_URL}/rest/v1/recipe_samples?select=id,image_embedding,recipe_embedding,summary_embedding&limit=1`;
    const data = await httpsGet(url);

    if (data.length > 0) {
      const sample = data[0];

      console.log('   image_embedding:');
      if (Array.isArray(sample.image_embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.image_embedding.length}차원)`);
      } else if (typeof sample.image_embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.image_embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }

      console.log('\n   recipe_embedding:');
      if (Array.isArray(sample.recipe_embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.recipe_embedding.length}차원)`);
      } else if (typeof sample.recipe_embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.recipe_embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }

      console.log('\n   summary_embedding:');
      if (Array.isArray(sample.summary_embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.summary_embedding.length}차원)`);
      } else if (typeof sample.summary_embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.summary_embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }
    } else {
      console.log('   ⚠️  데이터 없음');
    }
  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
    allPassed = false;
  }

  // 2. theory_chunks 검증
  console.log('\n\n📚 2. theory_chunks 테이블 검증\n');
  try {
    const url = `${SUPABASE_URL}/rest/v1/theory_chunks?select=id,embedding,image_embedding&limit=1`;
    const data = await httpsGet(url);

    if (data.length > 0) {
      const sample = data[0];

      console.log('   embedding:');
      if (Array.isArray(sample.embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.embedding.length}차원)`);
      } else if (typeof sample.embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }

      console.log('\n   image_embedding:');
      if (Array.isArray(sample.image_embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.image_embedding.length}차원)`);
      } else if (typeof sample.image_embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.image_embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }
    } else {
      console.log('   ⚠️  데이터 없음');
    }
  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
    allPassed = false;
  }

  // 3. hairstyles 검증
  console.log('\n\n💇 3. hairstyles 테이블 검증\n');
  try {
    const url = `${SUPABASE_URL}/rest/v1/hairstyles?select=id,embedding&limit=1`;
    const data = await httpsGet(url);

    if (data.length > 0) {
      const sample = data[0];

      console.log('   embedding:');
      if (Array.isArray(sample.embedding)) {
        console.log(`   ✅ VECTOR 타입 (${sample.embedding.length}차원)`);
      } else if (typeof sample.embedding === 'string') {
        console.log(`   ❌ 여전히 TEXT 타입 (${sample.embedding.length}자)`);
        allPassed = false;
      } else {
        console.log(`   ⚠️  NULL 또는 알 수 없는 타입`);
      }
    } else {
      console.log('   ⚠️  데이터 없음');
    }
  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
    allPassed = false;
  }

  // 최종 결과
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('\n✅ 모든 임베딩 컬럼이 VECTOR 타입으로 정상 변환되었습니다!\n');
    console.log('💡 다음 단계:');
    console.log('   1. 챗봇 검색 기능 테스트');
    console.log('   2. RPC 함수 동작 확인');
    console.log('   3. 문제 없으면 백업 컬럼 삭제 (선택사항)\n');
  } else {
    console.log('\n❌ 일부 컬럼이 아직 TEXT 타입입니다.\n');
    console.log('💡 해결 방법:');
    console.log('   1. fix-embedding-columns.sql 파일을 Supabase 대시보드에서 다시 실행하세요');
    console.log('   2. SQL Editor에서 오류 메시지를 확인하세요\n');
  }
  console.log('='.repeat(80) + '\n');
}

verify().catch(console.error);
