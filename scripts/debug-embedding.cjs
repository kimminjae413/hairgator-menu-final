// 임베딩 형식 디버깅
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEmbedding() {
  console.log('=== 임베딩 형식 디버깅 ===\n');

  // 1. 기존 데이터 임베딩 형식
  console.log('--- 기존 데이터 임베딩 ---');
  const { data: oldData } = await supabase
    .from('theory_chunks')
    .select('id, section_title, embedding')
    .eq('id', 4577)  // 기존 데이터 ID
    .single();

  if (oldData) {
    console.log('ID:', oldData.id);
    console.log('타입:', typeof oldData.embedding);
    console.log('길이:', oldData.embedding?.length);
    console.log('샘플:', oldData.embedding?.substring(0, 50));
  }

  // 2. 새로 추가한 데이터 임베딩 형식
  console.log('\n--- 새로 추가한 데이터 임베딩 ---');
  const { data: newData } = await supabase
    .from('theory_chunks')
    .select('id, section_title, embedding')
    .eq('id', 5097)  // 새 데이터 ID
    .single();

  if (newData) {
    console.log('ID:', newData.id);
    console.log('타입:', typeof newData.embedding);
    console.log('길이:', newData.embedding?.length);
    console.log('샘플:', newData.embedding?.substring(0, 50));
  }

  // 3. 파싱 테스트
  console.log('\n--- 파싱 테스트 ---');
  if (oldData?.embedding) {
    const oldParsed = JSON.parse(oldData.embedding);
    console.log('기존 데이터 파싱: 배열 길이 =', oldParsed.length, ', 첫 값 =', oldParsed[0]);
  }
  if (newData?.embedding) {
    const newParsed = JSON.parse(newData.embedding);
    console.log('새 데이터 파싱: 배열 길이 =', newParsed.length, ', 첫 값 =', newParsed[0]);
  }

  // 4. Supabase의 embedding 컬럼 타입 확인
  console.log('\n--- Supabase 컬럼 타입 확인 ---');

  // 직접 PostgreSQL 벡터 검색 시도
  console.log('\n--- 직접 유사도 계산 시도 ---');

  const queryEmbedding = await generateEmbedding("전대각이 뭐야?");
  console.log('쿼리 임베딩 생성: 768차원');

  // hybrid_search 테스트
  const { data: hybridResults, error: hybridError } = await supabase.rpc('hybrid_search_theory_chunks', {
    query_embedding: queryEmbedding,
    query_text: '전대각',
    vector_threshold: 0.3,
    vector_count: 10,
    keyword_count: 10,
    final_count: 5
  });

  if (hybridError) {
    console.log('hybrid_search 오류:', hybridError.message);
  } else {
    console.log('\nhybrid_search 결과:', hybridResults?.length, '개');
    hybridResults?.forEach((r, i) => {
      console.log(`${i+1}. [ID: ${r.id}] ${r.section_title}`);
      console.log(`   벡터 유사도: ${(r.vector_similarity * 100).toFixed(1)}%, 키워드 매칭: ${r.keyword_match_count}개`);
    });
  }
}

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

debugEmbedding().catch(console.error);
