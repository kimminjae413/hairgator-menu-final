// Supabase의 모든 테이블 찾기
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllTables() {
  console.log('=== Supabase 테이블 전체 검색 ===\n');
  console.log('URL:', supabaseUrl);
  console.log('');

  // 더 많은 가능한 테이블명들
  const possibleTables = [
    // 기본
    'recipe_samples',
    'theory_chunks',

    // 사용자가 언급한 테이블들
    'theory_images',
    'theoryimages',
    'theory-images',

    'face_design',
    'facedesign',
    'face-design',
    'face_designs',

    'twoway_cut_books',
    'twowaycutbooks',
    'twoway-cut-books',
    'twoway_books',
    'twowaybooks',
    '2way_cut_books',
    '2waycut_books',

    // 개별 책들
    'twoway_cut_book_a',
    'twoway_cut_book_b',
    'twoway_cut_book_c',
    'twoway_cut_book_d',
    'twoway_cut_book_e',
    'book_a',
    'book_b',
    'book_c',
    'book_d',
    'book_e',
    'books_a',
    'books_b',
    'books_c',
    'books_d',
    'books_e',

    // 헤어컬러
    'hair_color',
    'haircolor',
    'hair_colors',
    'haircolors',
    'hair-color',
    'color',
    'colors',

    // 일반적인 이름들
    'chunks',
    'embeddings',
    'documents',
    'pages',
    'sections',
    'content',
    'contents',
    'data',
    'images',
    'texts',
    'knowledge',
    'knowledge_base',

    // 한국어 관련
    'theory',
    'theories',
    'cut_theory',
    'cutting_theory',
  ];

  const foundTables = [];

  for (const table of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        foundTables.push({ name: table, count });
      }
    } catch (e) {
      // 테이블 없음
    }
  }

  console.log('📊 발견된 테이블들:\n');

  if (foundTables.length === 0) {
    console.log('❌ recipe_samples 외에 다른 테이블을 찾지 못했습니다.');
  } else {
    for (const t of foundTables) {
      console.log(`✅ ${t.name}: ${t.count}개`);

      // 각 테이블의 컬럼 확인
      const { data } = await supabase.from(t.name).select('*').limit(1);
      if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        console.log(`   컬럼(${cols.length}개): ${cols.slice(0, 10).join(', ')}${cols.length > 10 ? '...' : ''}`);

        // 임베딩 컬럼 확인
        const embeddingCols = cols.filter(c => c.includes('embedding') || c.includes('vector'));
        if (embeddingCols.length > 0) {
          console.log(`   📌 임베딩 컬럼: ${embeddingCols.join(', ')}`);
        }
      }
      console.log('');
    }
  }

  // REST API로 테이블 목록 시도
  console.log('\n=== REST API 테이블 목록 조회 시도 ===\n');

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('API 응답:', JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      console.log('API 상태:', response.status);
    }
  } catch (e) {
    console.log('REST API 오류:', e.message);
  }
}

findAllTables().catch(console.error);
