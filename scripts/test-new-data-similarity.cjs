// 새 데이터 유사도 직접 계산
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// 코사인 유사도 계산
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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

async function testNewDataSimilarity() {
  console.log('=== 새 데이터 유사도 직접 계산 ===\n');

  // 1. 쿼리 임베딩 생성
  const query = "전대각이 뭐야?";
  console.log(`질문: "${query}"`);
  const queryEmbedding = await generateEmbedding(query);
  console.log('쿼리 임베딩 생성 완료\n');

  // 2. 새로 추가한 데이터 가져오기
  const { data: newChunks } = await supabase
    .from('theory_chunks')
    .select('id, section_title, embedding, content_ko')
    .gte('id', 5097)
    .lte('id', 5103);

  console.log('새 데이터 유사도 계산:');
  console.log('─'.repeat(60));

  const similarities = [];

  for (const chunk of newChunks) {
    const chunkEmbedding = JSON.parse(chunk.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
    similarities.push({
      id: chunk.id,
      title: chunk.section_title,
      similarity,
      content: chunk.content_ko?.substring(0, 80)
    });
  }

  // 유사도 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);

  similarities.forEach((s, i) => {
    console.log(`\n${i+1}. [유사도: ${(s.similarity * 100).toFixed(1)}%] ${s.title}`);
    console.log(`   ${s.content}...`);
  });

  // 3. 기존 데이터와 비교
  console.log('\n\n=== 기존 데이터 (상위 결과) 유사도 ===\n');

  const { data: oldChunk } = await supabase
    .from('theory_chunks')
    .select('id, section_title, embedding, content_ko')
    .eq('id', 2344)  // Book D - Page 192
    .single();

  if (oldChunk) {
    const oldEmbedding = JSON.parse(oldChunk.embedding);
    const oldSimilarity = cosineSimilarity(queryEmbedding, oldEmbedding);
    console.log(`기존 1위: [유사도: ${(oldSimilarity * 100).toFixed(1)}%] ${oldChunk.section_title}`);
    console.log(`   ${oldChunk.content_ko?.substring(0, 100)}...`);
  }

  // 4. 결론
  console.log('\n\n=== 분석 결과 ===\n');
  const bestNew = similarities[0];
  console.log(`새 데이터 최고 유사도: ${(bestNew.similarity * 100).toFixed(1)}%`);
  console.log(`기존 데이터 1위 유사도: 89.9%`);

  if (bestNew.similarity > 0.899) {
    console.log('\n✅ 새 데이터가 더 높은 유사도를 가집니다!');
    console.log('→ RPC 함수가 새 데이터를 검색하지 못하는 문제가 있습니다.');
  } else {
    console.log('\n⚠️ 기존 데이터가 더 높은 유사도를 가집니다.');
    console.log('→ 임베딩 품질 문제일 수 있습니다.');
  }
}

testNewDataSimilarity().catch(console.error);
