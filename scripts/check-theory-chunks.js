// theory_chunks 테이블 상태 확인 스크립트
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTheoryChunks() {
  console.log('=== theory_chunks 테이블 상태 확인 ===\n');

  // 1. 총 레코드 수
  const { count, error: countError } = await supabase
    .from('theory_chunks')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('❌ theory_chunks 조회 오류:', countError.message);
    console.log('\n테이블이 존재하지 않거나 접근 권한이 없습니다.');
    return;
  }

  console.log(`📊 총 레코드 수: ${count}개\n`);

  if (count === 0) {
    console.log('⚠️ theory_chunks 테이블이 비어있습니다!');
    console.log('이론 데이터가 없으면 챗봇이 이론적 질문에 답변할 수 없습니다.\n');
    return;
  }

  // 2. 샘플 데이터 확인
  const { data: samples, error: sampleError } = await supabase
    .from('theory_chunks')
    .select('id, section_title, content_ko, keywords, sub_category, importance_level')
    .limit(10);

  if (sampleError) {
    console.log('❌ 샘플 조회 오류:', sampleError.message);
    return;
  }

  console.log('📝 샘플 데이터 (상위 10개):');
  samples.forEach((s, i) => {
    console.log(`\n${i+1}. [${s.sub_category || '미분류'}] ${s.section_title}`);
    console.log(`   키워드: ${(s.keywords || []).join(', ')}`);
    console.log(`   내용: ${(s.content_ko || '').substring(0, 100)}...`);
  });

  // 3. 카테고리별 통계
  const { data: allData } = await supabase
    .from('theory_chunks')
    .select('sub_category');

  const categories = {};
  allData.forEach(item => {
    const cat = item.sub_category || '미분류';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  console.log('\n\n📊 카테고리별 분포:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}개`);
    });

  // 4. 전대각/후대각 관련 데이터 검색
  console.log('\n\n🔍 "전대각/후대각" 관련 데이터 검색:');

  const { data: angleData, error: angleError } = await supabase
    .from('theory_chunks')
    .select('section_title, content_ko, keywords')
    .or('content_ko.ilike.%전대각%,content_ko.ilike.%후대각%,keywords.cs.{전대각},keywords.cs.{후대각}')
    .limit(20);

  if (angleError) {
    console.log('❌ 검색 오류:', angleError.message);
  } else if (angleData.length === 0) {
    console.log('   ⚠️ 전대각/후대각 관련 데이터가 없습니다!');
  } else {
    console.log(`   ✅ ${angleData.length}개 발견:`);
    angleData.forEach((item, i) => {
      console.log(`\n   ${i+1}. ${item.section_title}`);
      console.log(`      ${(item.content_ko || '').substring(0, 150)}...`);
    });
  }

  // 5. 임베딩 상태 확인
  const { data: embeddingCheck } = await supabase
    .from('theory_chunks')
    .select('id, embedding')
    .limit(5);

  console.log('\n\n📊 임베딩 상태:');
  const hasEmbedding = embeddingCheck?.filter(e => e.embedding && e.embedding.length > 0).length || 0;
  console.log(`   임베딩 있는 레코드: ${hasEmbedding}/${embeddingCheck?.length || 0}개 (샘플 기준)`);
}

// 추가: recipe_samples에서 이론 관련 컬럼 확인
async function checkRecipeSamples() {
  console.log('\n\n=== recipe_samples 테이블 확인 ===\n');

  const { data, error } = await supabase
    .from('recipe_samples')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ recipe_samples 조회 오류:', error.message);
    return;
  }

  if (data.length > 0) {
    console.log('📋 컬럼 목록:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      const value = data[0][col];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`   - ${col} (${type})`);
    });

    // section_primary 검색 (전대각/후대각 관련)
    console.log('\n🔍 section_primary 컬럼의 고유 값:');
    const { data: sections } = await supabase
      .from('recipe_samples')
      .select('section_primary')
      .limit(1000);

    const uniqueSections = [...new Set(sections?.map(s => s.section_primary))];
    console.log('   ' + uniqueSections.join(', '));
  }
}

// RPC 함수 존재 확인
async function checkRPCFunctions() {
  console.log('\n\n=== RPC 함수 상태 확인 ===\n');

  // match_theory_chunks 테스트
  try {
    const testEmbedding = new Array(768).fill(0.1);
    const { data, error } = await supabase.rpc('match_theory_chunks', {
      query_embedding: testEmbedding,
      match_threshold: 0.1,
      match_count: 1
    });

    if (error) {
      console.log('❌ match_theory_chunks 오류:', error.message);
    } else {
      console.log('✅ match_theory_chunks 함수 작동 중');
      console.log(`   테스트 결과: ${data?.length || 0}개`);
    }
  } catch (e) {
    console.log('❌ RPC 호출 실패:', e.message);
  }

  // hybrid_search_theory_chunks 테스트
  try {
    const testEmbedding = new Array(768).fill(0.1);
    const { data, error } = await supabase.rpc('hybrid_search_theory_chunks', {
      query_embedding: testEmbedding,
      query_text: '전대각',
      vector_threshold: 0.1,
      vector_count: 5,
      keyword_count: 5,
      final_count: 3
    });

    if (error) {
      console.log('❌ hybrid_search_theory_chunks 오류:', error.message);
    } else {
      console.log('✅ hybrid_search_theory_chunks 함수 작동 중');
      console.log(`   테스트 결과: ${data?.length || 0}개`);
    }
  } catch (e) {
    console.log('❌ hybrid RPC 호출 실패:', e.message);
  }
}

async function main() {
  await checkTheoryChunks();
  await checkRecipeSamples();
  await checkRPCFunctions();
  console.log('\n=== 진단 완료 ===');
}

main().catch(console.error);
