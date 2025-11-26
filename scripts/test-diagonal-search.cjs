// 전대각/후대각 검색 테스트
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

async function testSearch() {
  console.log('=== 전대각/후대각 검색 테스트 ===\n');

  const testQueries = [
    "전대각이 뭐야?",
    "후대각 섹션이 뭐야?",
    "전대각과 후대각의 차이점",
    "앞과 뒤를 나누는 기준이 뭐야?",
    "중력의 개념을 커트에 어떻게 적용해?"
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 질문: "${query}"`);
    console.log('─'.repeat(50));

    try {
      // 임베딩 생성
      const queryEmbedding = await generateEmbedding(query);

      // 벡터 검색
      const { data: results, error } = await supabase.rpc('match_theory_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3
      });

      if (error) {
        console.log('❌ 검색 오류:', error.message);
        continue;
      }

      if (results && results.length > 0) {
        console.log(`✅ ${results.length}개 결과 발견:\n`);
        results.forEach((r, i) => {
          console.log(`${i + 1}. [유사도: ${(r.similarity * 100).toFixed(1)}%] ${r.section_title}`);
          console.log(`   내용: ${(r.content_ko || r.content || '').substring(0, 150)}...`);
          console.log('');
        });
      } else {
        console.log('❌ 검색 결과 없음');
      }

    } catch (err) {
      console.log('❌ 오류:', err.message);
    }

    // API 속도 제한
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n=== 테스트 완료 ===');
}

testSearch().catch(console.error);
