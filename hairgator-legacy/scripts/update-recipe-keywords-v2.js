// scripts/update-recipe-keywords-v2.js
// theory_chunks의 keywords를 마스터 리스트로 사용하여 recipe_samples keywords 개선

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

// theory_chunks에서 모든 키워드 수집
async function getMasterKeywordList() {
  console.log('📚 theory_chunks에서 마스터 키워드 리스트 생성 중...\n');

  const theories = await supabaseRequest('GET', 'theory_chunks?select=keywords');

  const masterKeywords = new Set();

  theories.forEach(theory => {
    if (theory.keywords && Array.isArray(theory.keywords)) {
      theory.keywords.forEach(kw => {
        if (kw && kw.trim().length > 0) {
          masterKeywords.add(kw.trim());
        }
      });
    }
  });

  console.log(`✅ 총 ${masterKeywords.size}개의 마스터 키워드 생성\n`);
  return Array.from(masterKeywords);
}

// 텍스트에서 마스터 키워드 매칭
function extractKeywordsFromText(text, masterKeywords) {
  if (!text || typeof text !== 'string') return [];

  const foundKeywords = new Set();

  // 각 마스터 키워드가 텍스트에 있는지 확인
  masterKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      foundKeywords.add(keyword);
    }
  });

  return Array.from(foundKeywords);
}

// params_56에서 키워드 추출
function extractKeywordsFromParams56(params56) {
  const keywords = new Set();

  if (!params56) return [];

  function extractValues(obj) {
    if (typeof obj === 'string' && obj.trim().length > 0) {
      keywords.add(obj.trim());
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractValues(item));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => extractValues(value));
    }
  }

  extractValues(params56);
  return Array.from(keywords);
}

// 메인 실행
async function updateRecipeKeywords() {
  try {
    // 1. 마스터 키워드 리스트 생성
    const masterKeywords = await getMasterKeywordList();

    // 2. 모든 레시피 가져오기
    console.log('🔍 recipe_samples 가져오는 중...\n');

    const recipes = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
      url.searchParams.set('select', 'id,sample_code,params_56,recipe_full_text_ko,keywords');
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

    console.log(`\n📊 총 ${recipes.length}개 레시피 발견\n`);

    let updatedCount = 0;
    let improvedCount = 0;

    for (const recipe of recipes) {
      const allKeywords = new Set();

      // 1. params_56에서 추출
      if (recipe.params_56) {
        const params56Keywords = extractKeywordsFromParams56(recipe.params_56);
        params56Keywords.forEach(kw => allKeywords.add(kw));
      }

      // 2. recipe_full_text_ko에서 마스터 키워드 매칭
      if (recipe.recipe_full_text_ko && !recipe.recipe_full_text_ko.includes('죄송합니다')) {
        const textKeywords = extractKeywordsFromText(recipe.recipe_full_text_ko, masterKeywords);
        textKeywords.forEach(kw => allKeywords.add(kw));
      }

      // 3. 성별 추가
      const isFemale = recipe.sample_code.startsWith('F');
      allKeywords.add(isFemale ? 'Female' : 'Male');
      allKeywords.add(isFemale ? '여성' : '남성');

      const finalKeywords = Array.from(allKeywords).filter(kw => kw.trim().length > 0);

      // 기존 키워드 개수
      const oldCount = recipe.keywords ? recipe.keywords.length : 0;
      const newCount = finalKeywords.length;

      // 키워드가 개선되었으면 업데이트
      if (newCount > oldCount) {
        try {
          await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
            keywords: finalKeywords
          });

          if (oldCount > 0) {
            console.log(`🔄 ${recipe.sample_code}: ${oldCount}개 → ${newCount}개 (개선)`);
            improvedCount++;
          } else {
            console.log(`✅ ${recipe.sample_code}: ${newCount}개 키워드 추가`);
          }
          updatedCount++;
        } catch (error) {
          console.error(`❌ ${recipe.sample_code} 업데이트 실패:`, error.message);
        }
      }
    }

    console.log('\n📈 작업 완료!');
    console.log(`- 업데이트: ${updatedCount}개`);
    console.log(`- 개선: ${improvedCount}개`);
    console.log(`- 변경 없음: ${recipes.length - updatedCount}개`);

  } catch (error) {
    console.error('💥 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
updateRecipeKeywords();
