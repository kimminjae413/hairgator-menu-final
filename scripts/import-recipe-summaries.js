// scripts/import-recipe-summaries.js
// TSV 파일에서 레시피 요약문을 읽어서 DB에 업데이트

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

// TSV 파일 파싱
function parseTSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');

  const summaries = [];

  // 첫 행은 헤더이므로 건너뛰기
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [sample_code, recipe_summary_ko] = line.split('\t');

    if (sample_code && recipe_summary_ko) {
      summaries.push({
        sample_code: sample_code.trim(),
        recipe_summary_ko: recipe_summary_ko.trim()
      });
    }
  }

  return summaries;
}

// 메인 실행
async function importSummaries() {
  try {
    console.log('📚 레시피 요약문 임포트 시작\n');
    console.log('='.repeat(60));

    // TSV 파일 읽기
    const tsvPath = path.join(__dirname, '..', 'data', 'recipe-summaries-female-cut.tsv');
    const summaries = parseTSV(tsvPath);

    console.log(`✅ TSV 파일에서 ${summaries.length}개 요약문 로드\n`);

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const summary of summaries) {
      try {
        // sample_code로 시작하는 모든 레시피 찾기 (예: FAL0001 → FAL0001_001, FAL0001_002, ...)
        const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
        url.searchParams.set('sample_code', `like.${summary.sample_code}*`);
        url.searchParams.set('select', 'id,sample_code');

        const options = {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        };

        const recipes = await new Promise((resolve, reject) => {
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

        if (recipes.length === 0) {
          console.log(`⚠️  ${summary.sample_code}: 레시피 없음`);
          notFoundCount++;
          continue;
        }

        // 모든 변형 레시피에 요약문 업데이트
        for (const recipe of recipes) {
          await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
            recipe_summary_ko: summary.recipe_summary_ko
          });
        }

        console.log(`✅ ${summary.sample_code}: ${recipes.length}개 레시피에 요약문 추가`);
        successCount += recipes.length;

      } catch (error) {
        console.error(`❌ ${summary.sample_code}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 임포트 완료!');
    console.log(`- 성공: ${successCount}개`);
    console.log(`- 레시피 없음: ${notFoundCount}개`);
    console.log(`- 오류: ${errorCount}개`);

  } catch (error) {
    console.error('💥 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
importSummaries();
