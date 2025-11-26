// scripts/diagnose-embedding-type.js
// recipe_embedding 컬럼의 타입과 데이터 구조 진단

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

async function diagnose() {
  console.log('🔍 recipe_embedding 진단 시작...\n');
  console.log('='.repeat(80));

  // 1개 샘플 가져오기
  const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
  url.searchParams.set('select', 'id,sample_code,recipe_embedding');
  url.searchParams.set('recipe_embedding', 'not.is.null');
  url.searchParams.set('limit', '1');

  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  };

  const req = https.request(url, options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const results = JSON.parse(body);

        if (results.length === 0) {
          console.log('❌ recipe_embedding 데이터가 하나도 없습니다!');
          return;
        }

        const sample = results[0];
        console.log(`📊 샘플 코드: ${sample.sample_code}`);
        console.log(`\n📦 recipe_embedding 데이터 구조:`);
        console.log(`   타입: ${typeof sample.recipe_embedding}`);
        console.log(`   생성자: ${sample.recipe_embedding?.constructor?.name || 'N/A'}`);
        console.log(`   Array 여부: ${Array.isArray(sample.recipe_embedding)}`);

        if (typeof sample.recipe_embedding === 'string') {
          console.log(`\n⚠️  문제 발견: recipe_embedding이 STRING으로 저장되어 있습니다!`);
          console.log(`   길이: ${sample.recipe_embedding.length}자`);
          console.log(`   앞 100자: ${sample.recipe_embedding.substring(0, 100)}...`);

          // JSON 파싱 시도
          try {
            const parsed = JSON.parse(sample.recipe_embedding);
            console.log(`\n   ✅ JSON 파싱 성공`);
            console.log(`   파싱된 타입: ${typeof parsed}`);
            console.log(`   파싱된 Array 여부: ${Array.isArray(parsed)}`);
            if (Array.isArray(parsed)) {
              console.log(`   파싱된 배열 길이: ${parsed.length}차원`);
              console.log(`   샘플 값: [${parsed.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...]`);
            }
          } catch (parseError) {
            console.log(`\n   ❌ JSON 파싱 실패: ${parseError.message}`);
          }

          console.log(`\n💡 해결 방법:`);
          console.log(`   Supabase에서 recipe_embedding 컬럼 타입을 TEXT → VECTOR(768)로 변경해야 합니다.`);
          console.log(`   또는 RPC 함수가 JSON 텍스트를 파싱하도록 수정해야 합니다.`);

        } else if (Array.isArray(sample.recipe_embedding)) {
          console.log(`\n✅ recipe_embedding이 ARRAY로 올바르게 저장되어 있습니다!`);
          console.log(`   배열 길이: ${sample.recipe_embedding.length}차원`);
          console.log(`   샘플 값: [${sample.recipe_embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...]`);
        } else {
          console.log(`\n❓ 알 수 없는 타입입니다.`);
          console.log(`   값: ${JSON.stringify(sample.recipe_embedding).substring(0, 200)}`);
        }

        console.log('\n' + '='.repeat(80));

      } catch (error) {
        console.error('❌ 응답 파싱 오류:', error.message);
        console.error('응답:', body);
      }
    });
  });

  req.on('error', error => {
    console.error('❌ 요청 오류:', error.message);
  });

  req.end();
}

// 실행
diagnose();
