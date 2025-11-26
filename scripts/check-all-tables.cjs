// 모든 테이블 확인 스크립트
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  console.log('=== Supabase 전체 테이블 확인 ===\n');

  // 가능한 테이블명 목록
  const possibleTables = [
    'theory_chunks',
    'theory_images',
    'face_design',
    'twoway_cut_books',
    'twoway_cut_book_a',
    'twoway_cut_book_b',
    'twoway_cut_book_c',
    'twoway_cut_book_d',
    'twoway_cut_book_e',
    'twowaycut_books',
    'hair_color',
    'haircolor',
    'hair_colors',
    'recipe_samples',
    'chunks',
    'embeddings',
    'documents',
    // 언더스코어 없는 버전들
    'theoryimages',
    'facedesign',
    'twowaycutbooks',
  ];

  console.log('📊 테이블별 레코드 수:\n');

  for (const table of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        console.log(`✅ ${table}: ${count}개`);

        // 샘플 데이터 확인
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (sample && sample.length > 0) {
          console.log(`   컬럼: ${Object.keys(sample[0]).join(', ')}`);
        }
        console.log('');
      }
    } catch (e) {
      // 테이블 없음 - 무시
    }
  }

  // PostgreSQL 메타데이터로 모든 테이블 조회 시도
  console.log('\n=== RPC로 모든 테이블 목록 조회 시도 ===\n');

  try {
    // information_schema 직접 조회는 안되므로, 알려진 테이블들만 확인
    const knownTables = ['recipe_samples'];

    for (const t of knownTables) {
      const { data } = await supabase.from(t).select('*').limit(1);
      if (data && data.length > 0) {
        console.log(`\n📋 ${t} 테이블 전체 컬럼:`);
        Object.keys(data[0]).forEach(col => {
          const val = data[0][col];
          const preview = typeof val === 'string' ? val.substring(0, 50) : JSON.stringify(val)?.substring(0, 50);
          console.log(`   - ${col}: ${preview}...`);
        });
      }
    }
  } catch (e) {
    console.log('메타데이터 조회 실패:', e.message);
  }
}

// 전대각/후대각 관련 데이터 검색
async function searchDiagonalContent() {
  console.log('\n\n=== "전대각/후대각/Diagonal" 키워드 검색 ===\n');

  // recipe_samples에서 검색
  const { data: recipes, error } = await supabase
    .from('recipe_samples')
    .select('sample_code, recipe_full_text_ko, section_primary, keywords')
    .or('recipe_full_text_ko.ilike.%전대각%,recipe_full_text_ko.ilike.%후대각%,section_primary.eq.Diagonal-Forward,section_primary.eq.Diagonal-Backward')
    .limit(10);

  if (error) {
    console.log('❌ 검색 오류:', error.message);
  } else {
    console.log(`📊 recipe_samples에서 발견: ${recipes?.length || 0}개`);
    recipes?.forEach((r, i) => {
      console.log(`\n${i+1}. ${r.sample_code} (${r.section_primary})`);
      console.log(`   키워드: ${(r.keywords || []).slice(0, 5).join(', ')}`);
      console.log(`   내용: ${(r.recipe_full_text_ko || '').substring(0, 100)}...`);
    });
  }
}

async function main() {
  await checkAllTables();
  await searchDiagonalContent();
  console.log('\n=== 완료 ===');
}

main().catch(console.error);
