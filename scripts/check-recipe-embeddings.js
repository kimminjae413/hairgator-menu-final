// scripts/check-recipe-embeddings.js
// recipe_embedding이 제대로 저장되었는지 확인

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

async function checkEmbeddings() {
  console.log('🔍 recipe_embedding 상태 확인 중...\n');

  // 1. 샘플 레시피 확인
  const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
  url.searchParams.set('select', 'id,sample_code,recipe_summary_ko,recipe_embedding');
  url.searchParams.set('recipe_embedding', 'not.is.null');
  url.searchParams.set('sample_code', 'like.FGL*');
  url.searchParams.set('limit', '3');

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

        console.log('📊 FGL (짧은 보브) 레시피 샘플:');
        console.log('='.repeat(80));

        if (results.length === 0) {
          console.log('❌ FGL 레시피에 recipe_embedding이 없습니다!');
        } else {
          results.forEach(r => {
            const embeddingInfo = r.recipe_embedding ?
              `[${r.recipe_embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...] (${r.recipe_embedding.length}차원)` :
              'NULL';
            console.log(`\n${r.sample_code}:`);
            console.log(`  요약문: ${r.recipe_summary_ko}`);
            console.log(`  임베딩: ${embeddingInfo}`);
          });
        }

        // 2. 전체 통계 확인
        setTimeout(() => {
          checkOverallStats();
        }, 500);

      } catch (error) {
        console.error('❌ JSON 파싱 오류:', error.message);
        console.error('응답:', body);
      }
    });
  });

  req.on('error', error => {
    console.error('❌ 요청 오류:', error.message);
  });

  req.end();
}

function checkOverallStats() {
  console.log('\n\n📈 전체 통계:');
  console.log('='.repeat(80));

  // recipe_embedding이 있는 레시피 개수
  const url1 = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
  url1.searchParams.set('select', 'count');
  url1.searchParams.set('recipe_embedding', 'not.is.null');

  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  };

  const req1 = https.request(url1, options, (res) => {
    const count = res.headers['content-range'];
    const withEmbedding = count ? count.split('/')[1] : 0;
    console.log(`✅ recipe_embedding이 있는 레시피: ${withEmbedding}개`);

    // 전체 레시피 개수
    setTimeout(() => {
      const url2 = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
      url2.searchParams.set('select', 'count');

      const req2 = https.request(url2, options, (res) => {
        const count = res.headers['content-range'];
        const total = count ? count.split('/')[1] : 0;
        console.log(`📊 전체 레시피: ${total}개`);
        console.log(`📉 진행률: ${(withEmbedding/total*100).toFixed(1)}%`);

        if (withEmbedding === '0') {
          console.log('\n⚠️  경고: recipe_embedding이 하나도 없습니다!');
          console.log('enhance-recipe-embeddings-with-summary.js 스크립트가 제대로 실행되지 않았을 수 있습니다.');
        }
      });
      req2.on('error', console.error);
      req2.end();
    }, 100);
  });
  req1.on('error', console.error);
  req1.end();
}

// 실행
checkEmbeddings();
