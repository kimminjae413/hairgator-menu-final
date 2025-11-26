// 임베딩 형식 확인
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmbeddingFormat() {
  console.log('=== 임베딩 형식 확인 ===\n');

  // 1. theory_chunks 임베딩 확인
  const { data, error } = await supabase
    .from('theory_chunks')
    .select('id, section_title, embedding')
    .limit(1);

  if (error) {
    console.log('오류:', error.message);
    return;
  }

  const sample = data[0];
  console.log('ID:', sample.id);
  console.log('제목:', sample.section_title);
  console.log('\n--- embedding 컬럼 분석 ---');
  console.log('타입:', typeof sample.embedding);
  console.log('길이:', sample.embedding?.length);

  if (typeof sample.embedding === 'string') {
    console.log('첫 100자:', sample.embedding.substring(0, 100));
    console.log('마지막 100자:', sample.embedding.substring(sample.embedding.length - 100));

    // JSON 파싱 시도
    try {
      const parsed = JSON.parse(sample.embedding);
      console.log('\n✅ JSON 파싱 성공!');
      console.log('파싱된 타입:', typeof parsed);
      console.log('파싱된 배열 길이:', Array.isArray(parsed) ? parsed.length : 'N/A');
      if (Array.isArray(parsed)) {
        console.log('첫 5개 값:', parsed.slice(0, 5));
      }
    } catch (e) {
      console.log('\n❌ JSON 파싱 실패:', e.message);
    }
  } else if (Array.isArray(sample.embedding)) {
    console.log('✅ 이미 배열 형식!');
    console.log('배열 길이:', sample.embedding.length);
    console.log('첫 5개 값:', sample.embedding.slice(0, 5));
  }

  // 2. RPC 함수 테스트
  console.log('\n\n=== match_theory_chunks RPC 테스트 ===\n');

  try {
    // 올바른 768차원 테스트 벡터 생성
    const testEmbedding = new Array(768).fill(0).map(() => Math.random() * 0.1);

    const { data: rpcData, error: rpcError } = await supabase.rpc('match_theory_chunks', {
      query_embedding: testEmbedding,
      match_threshold: 0.3,  // 낮은 임계값
      match_count: 5
    });

    if (rpcError) {
      console.log('❌ RPC 오류:', rpcError.message);
      console.log('상세:', JSON.stringify(rpcError, null, 2));
    } else {
      console.log('✅ RPC 성공!');
      console.log('반환 개수:', rpcData?.length || 0);
      if (rpcData && rpcData.length > 0) {
        console.log('첫 번째 결과:', {
          id: rpcData[0].id,
          title: rpcData[0].section_title,
          similarity: rpcData[0].similarity
        });
      }
    }
  } catch (e) {
    console.log('❌ RPC 호출 실패:', e.message);
  }

  // 3. 실제 Gemini 임베딩으로 테스트
  console.log('\n\n=== 실제 Gemini 임베딩으로 테스트 ===\n');

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.log('GEMINI_API_KEY가 없습니다.');
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: '전대각이 뭐야?' }] }
        })
      }
    );

    const embData = await response.json();
    const queryEmbedding = embData.embedding?.values;

    if (queryEmbedding) {
      console.log('Gemini 임베딩 생성 완료:', queryEmbedding.length, '차원');

      // RPC 검색
      const { data: searchData, error: searchError } = await supabase.rpc('match_theory_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 5
      });

      if (searchError) {
        console.log('❌ 검색 오류:', searchError.message);
      } else {
        console.log('✅ "전대각이 뭐야?" 검색 결과:', searchData?.length || 0, '개');
        searchData?.forEach((r, i) => {
          console.log(`\n${i+1}. [유사도: ${(r.similarity * 100).toFixed(1)}%] ${r.section_title}`);
          console.log(`   ${(r.content_ko || r.content || '').substring(0, 100)}...`);
        });
      }
    }
  } catch (e) {
    console.log('Gemini 오류:', e.message);
  }
}

checkEmbeddingFormat().catch(console.error);
