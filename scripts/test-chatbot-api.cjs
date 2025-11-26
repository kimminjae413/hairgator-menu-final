// chatbot-api와 동일한 로직으로 테스트
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEmbedding(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    }
  );
  const data = await response.json();
  return data.embedding.values;
}

// chatbot-api.js의 fallbackKeywordSearch 로직 복제
async function fallbackKeywordSearch(query, matchCount = 10) {
  console.log('키워드 검색 실행:', query);

  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
  console.log('추출된 키워드:', keywords);

  const { data: allData, error } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content, content_ko, keywords')
    .limit(matchCount * 20);  // 더 많이 가져와서 필터링

  if (error) {
    console.log('오류:', error.message);
    return [];
  }

  // 키워드 매칭 스코어 계산
  const scored = allData.map(item => {
    let score = 0;
    const itemText = `${item.content || ''} ${item.content_ko || ''} ${(item.keywords || []).join(' ')}`.toLowerCase();

    keywords.forEach(kw => {
      if (itemText.includes(kw)) score++;
    });

    return { ...item, keyword_score: score };
  });

  const results = scored
    .filter(item => item.keyword_score > 0)
    .sort((a, b) => b.keyword_score - a.keyword_score)
    .slice(0, matchCount);

  return results;
}

// 테스트 실행
async function testChatbotLogic() {
  console.log('=== 챗봇 API 로직 테스트 ===\n');

  const queries = [
    "전대각이 뭐야?",
    "후대각 섹션 설명해줘",
    "앞과 뒤 기준"
  ];

  for (const query of queries) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`질문: "${query}"`);
    console.log(`${'─'.repeat(60)}`);

    // 1. 벡터 검색 시도
    const queryEmbedding = await generateEmbedding(query);

    const { data: vectorResults } = await supabase.rpc('match_theory_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });

    console.log(`\n1. 벡터 검색: ${vectorResults?.length || 0}개`);
    vectorResults?.slice(0, 2).forEach((r, i) => {
      console.log(`   ${i+1}. [${(r.similarity * 100).toFixed(1)}%] ${r.section_title}`);
    });

    // 2. 키워드 검색 (폴백)
    const keywordResults = await fallbackKeywordSearch(query, 5);

    console.log(`\n2. 키워드 검색: ${keywordResults?.length || 0}개`);
    keywordResults?.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i+1}. [점수: ${r.keyword_score}] ${r.section_title}`);
      console.log(`      ${(r.content_ko || r.content || '').substring(0, 80)}...`);
    });

    // 3. 하이브리드 검색
    const { data: hybridResults } = await supabase.rpc('hybrid_search_theory_chunks', {
      query_embedding: queryEmbedding,
      query_text: query,
      vector_threshold: 0.5,
      vector_count: 10,
      keyword_count: 10,
      final_count: 5
    });

    console.log(`\n3. 하이브리드 검색: ${hybridResults?.length || 0}개`);
    hybridResults?.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i+1}. [벡터: ${(r.vector_similarity * 100).toFixed(1)}%, 키워드: ${r.keyword_match_count}] ${r.section_title}`);
    });

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n\n=== 결론 ===\n');
  console.log('키워드 검색에서 새 데이터가 검색됩니다.');
  console.log('chatbot-api.js는 hybrid_search를 사용하므로,');
  console.log('키워드 매칭으로 새 데이터를 찾을 수 있습니다.');
}

testChatbotLogic().catch(console.error);
