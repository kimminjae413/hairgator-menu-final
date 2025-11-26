// theory_chunks 상세 확인
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 30) + '...' : 'NULL');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTheoryChunks() {
  console.log('\n=== theory_chunks 테이블 상세 확인 ===\n');

  // 1. 총 개수
  const { count, error: countError } = await supabase
    .from('theory_chunks')
    .select('*', { count: 'exact', head: true });

  console.log('총 레코드:', count, '오류:', countError?.message || '없음');

  // 2. 샘플 데이터
  const { data: samples, error: sampleError } = await supabase
    .from('theory_chunks')
    .select('*')
    .limit(3);

  if (sampleError) {
    console.log('샘플 조회 오류:', sampleError.message);
    console.log('상세:', JSON.stringify(sampleError, null, 2));
  } else {
    console.log('\n샘플 데이터:');
    samples?.forEach((s, i) => {
      console.log(`\n--- ${i+1}번 레코드 ---`);
      console.log('컬럼들:', Object.keys(s).join(', '));

      // 주요 컬럼 출력
      if (s.section_title) console.log('section_title:', s.section_title);
      if (s.content) console.log('content:', s.content?.substring(0, 100) + '...');
      if (s.content_ko) console.log('content_ko:', s.content_ko?.substring(0, 100) + '...');
      if (s.keywords) console.log('keywords:', s.keywords);
      if (s.embedding) console.log('embedding 길이:', s.embedding?.length || 'null');
    });
  }

  // 3. 전대각/후대각 검색
  console.log('\n\n=== "전대각/후대각" 검색 ===\n');

  const { data: angleData, error: angleError } = await supabase
    .from('theory_chunks')
    .select('*')
    .or('content_ko.ilike.%전대각%,content_ko.ilike.%후대각%,content.ilike.%diagonal%')
    .limit(5);

  if (angleError) {
    console.log('검색 오류:', angleError.message);
  } else {
    console.log(`발견: ${angleData?.length || 0}개`);
    angleData?.forEach((item, i) => {
      console.log(`\n${i+1}. ${item.section_title || item.title || 'N/A'}`);
      console.log('   내용:', (item.content_ko || item.content || '').substring(0, 200));
    });
  }

  // 4. theory_categories 확인
  console.log('\n\n=== theory_categories ===\n');
  const { data: categories } = await supabase
    .from('theory_categories')
    .select('*')
    .limit(15);

  categories?.forEach(c => {
    console.log(`- ${c.name || c.category_name || JSON.stringify(c)}`);
  });

  // 5. theory_formulas42 확인
  console.log('\n\n=== theory_formulas42 (샘플) ===\n');
  const { data: formulas } = await supabase
    .from('theory_formulas42')
    .select('*')
    .limit(5);

  formulas?.forEach((f, i) => {
    console.log(`${i+1}. ${JSON.stringify(f).substring(0, 150)}...`);
  });
}

checkTheoryChunks().catch(console.error);
