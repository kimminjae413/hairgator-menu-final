// scripts/generate-summary-embeddings.js
// recipe_summary_ko로 Gemini 임베딩 생성 및 DB 업데이트

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

// Supabase API 호출 헬퍼
function supabaseRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);

    const options = {
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };

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

// 메인 실행
async function generateSummaryEmbeddings() {
  try {
    console.log('🚀 레시피 요약문 임베딩 생성 시작\n');
    console.log('='.repeat(60));

    // recipe_summary_ko가 있는 레시피 가져오기
    console.log('📚 요약문이 있는 레시피 가져오는 중...\n');

    const recipes = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
      url.searchParams.set('select', 'id,sample_code,recipe_summary_ko');
      url.searchParams.set('recipe_summary_ko', 'not.is.null');
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());

      const options = {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      };

      const batch = await new Promise((resolve, reject) => {
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
        req.end();
      });

      recipes.push(...batch);
      console.log(`  페이지 ${Math.floor(offset / limit) + 1}: ${batch.length}개 (총 ${recipes.length}개)`);

      if (batch.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`\n✅ 총 ${recipes.length}개 레시피 발견\n`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];

      try {
        if (!recipe.recipe_summary_ko || recipe.recipe_summary_ko.trim().length === 0) {
          console.log(`⚠️  [${i+1}/${recipes.length}] ${recipe.sample_code}: 요약문 비어있음, 건너뜀`);
          skipCount++;
          continue;
        }

        // 임베딩 생성
        const embedding = await generateEmbedding(recipe.recipe_summary_ko);

        // DB 업데이트
        await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
          summary_embedding: embedding
        });

        console.log(`✅ [${i+1}/${recipes.length}] ${recipe.sample_code}: 임베딩 생성 완료`);
        successCount++;

        // Gemini API rate limit 고려 (초당 15회)
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ [${i+1}/${recipes.length}] ${recipe.sample_code}: ${error.message}`);
        errorCount++;

        // API 에러 발생시 잠시 대기
        if (error.message.includes('429') || error.message.includes('quota')) {
          console.log('⏸️  Rate limit 도달, 10초 대기...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 임베딩 생성 완료!');
    console.log(`- 성공: ${successCount}개`);
    console.log(`- 건너뜀: ${skipCount}개`);
    console.log(`- 오류: ${errorCount}개`);

  } catch (error) {
    console.error('💥 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
generateSummaryEmbeddings();
