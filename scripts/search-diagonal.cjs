// 전대각/후대각 관련 청크 직접 검색
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchDiagonal() {
  console.log('=== 전대각/후대각 관련 청크 검색 ===\n');

  // 1. 키워드로 직접 검색 - content_ko에서
  const { data: contentSearch, error: err1 } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko, keywords, sub_category')
    .or('content_ko.ilike.%전대각%,content_ko.ilike.%후대각%')
    .limit(20);

  console.log('📊 content_ko에서 "전대각/후대각" 검색:', contentSearch?.length || 0, '개');

  if (contentSearch && contentSearch.length > 0) {
    contentSearch.forEach((item, i) => {
      console.log(`\n${i+1}. [${item.sub_category}] ${item.section_title}`);

      // 전대각/후대각이 포함된 문장 추출
      const content = item.content_ko || '';
      const lines = content.split('\n');
      const relevantLines = lines.filter(line =>
        line.includes('전대각') || line.includes('후대각') ||
        line.toLowerCase().includes('diagonal forward') ||
        line.toLowerCase().includes('diagonal backward')
      );

      if (relevantLines.length > 0) {
        console.log('   관련 문장:');
        relevantLines.slice(0, 3).forEach(line => {
          console.log(`   → ${line.trim().substring(0, 150)}`);
        });
      }
    });
  }

  // 2. 영어로 검색 - Diagonal
  console.log('\n\n=== "Diagonal Forward/Backward" 검색 ===\n');

  const { data: engSearch } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content, content_ko, sub_category')
    .or('content.ilike.%diagonal forward%,content.ilike.%diagonal backward%')
    .limit(10);

  console.log('영어 검색 결과:', engSearch?.length || 0, '개');
  engSearch?.forEach((item, i) => {
    console.log(`\n${i+1}. [${item.sub_category}] ${item.section_title}`);
    const content = item.content || item.content_ko || '';
    console.log(`   ${content.substring(0, 200)}...`);
  });

  // 3. sub_category 목록 확인
  console.log('\n\n=== sub_category 목록 ===\n');

  const { data: allChunks } = await supabase
    .from('theory_chunks')
    .select('sub_category')
    .limit(3000);

  const categories = {};
  allChunks?.forEach(c => {
    const cat = c.sub_category || 'null';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}개`);
    });

  // 4. "섹션" 관련 이론 검색
  console.log('\n\n=== "섹션" 관련 이론 검색 ===\n');

  const { data: sectionSearch } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko, sub_category')
    .ilike('content_ko', '%섹션%기준%')
    .limit(10);

  console.log('검색 결과:', sectionSearch?.length || 0, '개');
  sectionSearch?.forEach((item, i) => {
    console.log(`\n${i+1}. [${item.sub_category}] ${item.section_title}`);
    console.log(`   ${(item.content_ko || '').substring(0, 200)}...`);
  });

  // 5. keywords 배열에서 검색
  console.log('\n\n=== keywords 배열에서 검색 ===\n');

  const { data: keywordSearch } = await supabase
    .from('theory_chunks')
    .select('id, section_title, keywords, content_ko')
    .or('keywords.cs.{전대각},keywords.cs.{후대각},keywords.cs.{diagonal}')
    .limit(10);

  console.log('키워드 검색 결과:', keywordSearch?.length || 0, '개');
  keywordSearch?.forEach((item, i) => {
    console.log(`\n${i+1}. ${item.section_title}`);
    console.log(`   키워드: ${(item.keywords || []).slice(0, 10).join(', ')}`);
  });
}

searchDiagonal().catch(console.error);
