// scripts/update-recipe-keywords.js
// recipe_samples 테이블의 keywords 필드를 자동으로 채우는 스크립트

const fs = require('fs');
const path = require('path');
const https = require('https');

// .env 파일 직접 파싱
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

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// params_56에서 키워드 추출
function extractKeywordsFromParams56(params56) {
  const keywords = new Set();

  if (!params56) return [];

  // 모든 값을 재귀적으로 추출
  function extractValues(obj) {
    if (typeof obj === 'string') {
      keywords.add(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractValues(item));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => extractValues(value));
    }
  }

  extractValues(params56);

  return Array.from(keywords);
}

// recipe_full_text_ko에서 기술 용어 추출
function extractKeywordsFromText(text) {
  if (!text) return [];

  const technicalTerms = [
    // 커팅 기법
    '클리퍼 오버 콤', 'Clipper Over Comb',
    '시저 오버 콤', 'Scissor Over Comb',
    '포인트 컷', 'Point Cut',
    '슬라이드 컷', 'Slide Cut',
    '블런트 컷', 'Blunt Cut',

    // 구조
    '레이어', 'Layer',
    '그라데이션', 'Graduation',
    '원렝스', 'One Length',

    // 기법
    '텍스처라이징', 'Texturizing',
    '코너 오프', 'Corner Off',
    '크로스 체킹', 'Cross Checking',

    // 섹션
    '수평 섹션', 'Horizontal Section',
    '수직 섹션', 'Vertical Section',
    '대각선 섹션', 'Diagonal Section',

    // 방향
    'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',

    // 들어올림
    'L0', 'L1', 'L2', 'L3', 'L4', 'L5',

    // 길이
    '짧은', 'Short',
    '중간', 'Medium',
    '긴', 'Long',

    // 질감
    '부드러운', 'Soft',
    '거친', 'Rough',
    '매끄러운', 'Smooth',

    // 스타일
    '앞머리', 'Fringe', 'Bang',
    '측면', 'Side',
    '뒷머리', 'Back'
  ];

  const foundTerms = [];

  technicalTerms.forEach(term => {
    if (text.includes(term)) {
      foundTerms.push(term);
    }
  });

  return foundTerms;
}

// 메인 실행
async function updateRecipeKeywords() {
  try {
    console.log('🔍 recipe_samples 테이블에서 데이터 가져오는 중...\n');

    // 모든 레시피 가져오기 (페이지네이션 사용)
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
      console.log(`  페이지 ${Math.floor(offset / limit) + 1}: ${batch.length}개 가져옴 (총 ${recipes.length}개)`);

      if (batch.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    console.log(`📊 총 ${recipes.length}개 레시피 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const recipe of recipes) {
      // 스킵하지 않고 모두 업데이트 (기존 키워드가 있어도 다시 생성)

      const allKeywords = new Set();

      // 1. params_56에서 추출
      const params56Keywords = extractKeywordsFromParams56(recipe.params_56);
      params56Keywords.forEach(kw => allKeywords.add(kw));

      // 2. recipe_full_text_ko에서 추출
      const textKeywords = extractKeywordsFromText(recipe.recipe_full_text_ko);
      textKeywords.forEach(kw => allKeywords.add(kw));

      // 3. 성별 추가
      const isFemale = recipe.sample_code.startsWith('F');
      const gender = isFemale ? 'Female' : 'Male';
      const genderKo = isFemale ? '여성' : '남성';
      allKeywords.add(gender);
      allKeywords.add(genderKo);

      const finalKeywords = Array.from(allKeywords).filter(kw => kw.trim().length > 0);

      if (finalKeywords.length > 0) {
        // Supabase 업데이트
        try {
          await supabaseRequest('PATCH', `recipe_samples?id=eq.${recipe.id}`, {
            keywords: finalKeywords
          });

          console.log(`✅ ${recipe.sample_code}: ${finalKeywords.length}개 키워드 추가`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ ${recipe.sample_code} 업데이트 실패:`, error.message);
        }
      }
    }

    console.log('\n📈 작업 완료!');
    console.log(`- 업데이트: ${updatedCount}개`);
    console.log(`- 스킵: ${skippedCount}개`);

  } catch (error) {
    console.error('💥 오류 발생:', error.message);
    console.error(error.stack);
  }
}

// 실행
updateRecipeKeywords();
