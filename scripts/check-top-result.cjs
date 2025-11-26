// 기존 상위 결과 상세 확인
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTopResult() {
  console.log('=== 기존 상위 결과 상세 확인 ===\n');

  const { data } = await supabase
    .from('theory_chunks')
    .select('*')
    .eq('id', 2344)
    .single();

  if (data) {
    console.log('ID:', data.id);
    console.log('제목:', data.section_title);
    console.log('카테고리:', data.category_code);
    console.log('서브카테고리:', data.sub_category);
    console.log('키워드:', data.keywords?.slice(0, 10));
    console.log('\n--- content ---');
    console.log(data.content?.substring(0, 500));
    console.log('\n--- content_ko ---');
    console.log(data.content_ko?.substring(0, 500));
  }

  // hybrid_search가 어떤 필터를 쓰는지 확인 위해 다양한 쿼리 테스트
  console.log('\n\n=== 키워드 검색 테스트 ===\n');

  // 전대각 키워드 직접 검색
  const { data: keywordSearch } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko')
    .or('content_ko.ilike.%전대각이 뭐%,content_ko.ilike.%전대각 정의%,keywords.cs.{전대각}')
    .limit(10);

  console.log('키워드 검색 결과:', keywordSearch?.length, '개');
  keywordSearch?.forEach((item, i) => {
    console.log(`\n${i+1}. [ID: ${item.id}] ${item.section_title}`);
    console.log(`   ${item.content_ko?.substring(0, 100)}...`);
  });

  // 새 데이터 ID 범위로 검색
  console.log('\n\n=== 새 데이터 확인 ===\n');

  const { data: newData } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko, keywords')
    .gte('id', 5097)
    .lte('id', 5103);

  newData?.forEach(item => {
    console.log(`[ID: ${item.id}] ${item.section_title}`);
    console.log(`   키워드: ${item.keywords?.slice(0, 5).join(', ')}`);
  });
}

checkTopResult().catch(console.error);
