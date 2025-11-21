// scripts/import-all-summaries.js
// 여성 컷 + 남성 컷 요약문을 DB에 업데이트

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
async function importAllSummaries() {
  try {
    console.log('📚 모든 레시피 요약문 임포트 시작\n');
    console.log('='.repeat(60));

    // 1. 여성 컷 요약문 임포트
    console.log('\n🚺 여성 컷 요약문 임포트 중...\n');
    const femalePath = path.join(__dirname, '..', 'data', 'recipe-summaries-female-cut-v2.tsv');
    const femaleSummaries = parseTSV(femalePath);
    console.log(`✅ ${femaleSummaries.length}개 여성 컷 요약문 로드\n`);

    let femaleSuccess = 0;
    let femaleNotFound = 0;
    let femaleError = 0;

    for (const summary of femaleSummaries) {
      try {
        // sample_code로 시작하는 모든 레시피 찾기
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
          femaleNotFound++;
          continue;
        }

        // 모든 변형 레시피에 요약문 업데이트
        for (const recipe of recipes) {
          await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
            recipe_summary_ko: summary.recipe_summary_ko
          });
        }

        console.log(`✅ ${summary.sample_code}: ${recipes.length}개 레시피에 요약문 추가`);
        femaleSuccess += recipes.length;

      } catch (error) {
        console.error(`❌ ${summary.sample_code}: ${error.message}`);
        femaleError++;
      }
    }

    // 2. 남성 컷 요약문 임포트
    console.log('\n\n🚹 남성 컷 요약문 임포트 중...\n');
    const malePath = path.join(__dirname, '..', 'data', 'recipe-summaries-male.tsv');
    const maleSummaries = parseTSV(malePath);
    console.log(`✅ ${maleSummaries.length}개 남성 컷 요약문 로드\n`);

    let maleSuccess = 0;
    let maleNotFound = 0;
    let maleError = 0;

    for (const summary of maleSummaries) {
      try {
        // sample_code로 시작하는 모든 레시피 찾기
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
          maleNotFound++;
          continue;
        }

        // 모든 변형 레시피에 요약문 업데이트
        for (const recipe of recipes) {
          await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
            recipe_summary_ko: summary.recipe_summary_ko
          });
        }

        console.log(`✅ ${summary.sample_code}: ${recipes.length}개 레시피에 요약문 추가`);
        maleSuccess += recipes.length;

      } catch (error) {
        console.error(`❌ ${summary.sample_code}: ${error.message}`);
        maleError++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 임포트 완료!\n');
    console.log('🚺 여성 컷:');
    console.log(`- 성공: ${femaleSuccess}개`);
    console.log(`- 레시피 없음: ${femaleNotFound}개`);
    console.log(`- 오류: ${femaleError}개\n`);
    console.log('🚹 남성 컷:');
    console.log(`- 성공: ${maleSuccess}개`);
    console.log(`- 레시피 없음: ${maleNotFound}개`);
    console.log(`- 오류: ${maleError}개\n`);
    console.log(`📊 총 ${femaleSuccess + maleSuccess}개 레시피 업데이트 완료!`);

  } catch (error) {
    console.error('💥 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
importAllSummaries();
