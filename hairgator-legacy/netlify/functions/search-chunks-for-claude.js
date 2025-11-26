// netlify/functions/search-chunks-for-claude.js
// Claude가 Supabase의 이론 청크를 검색할 수 있게 하는 API

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { search_type, query, limit = 10 } = JSON.parse(event.body);
    
    // 환경변수
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    let results;
    let metadata = {};
    
    switch (search_type) {
      case 'keywords':
        // 키워드 검색
        results = await searchByKeywords(supabase, query, limit);
        metadata.search_type = 'keywords';
        break;
      
      case 'vector':
        // 벡터 검색
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        results = await searchByVector(supabase, genAI, query, limit);
        metadata.search_type = 'vector';
        break;
      
      case 'formula':
        // 포뮬러 검색
        results = await searchByFormula(supabase, query, limit);
        metadata.search_type = 'formula';
        break;
      
      case 'category':
        // 카테고리별 샘플
        results = await searchByCategory(supabase, query, limit);
        metadata.search_type = 'category';
        break;
      
      case 'stats':
        // 통계
        results = await getStatistics(supabase);
        metadata.search_type = 'stats';
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid search_type' })
        };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        search_type,
        query,
        results,
        metadata: {
          ...metadata,
          count: Array.isArray(results) ? results.length : 0,
          timestamp: new Date().toISOString()
        }
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
};

// 키워드 검색
async function searchByKeywords(supabase, keywords, limit) {
  const { data, error } = await supabase
    .from('theory_chunks')
    .select('page_number, section_title, content, formula_codes, keywords, sub_category, importance_level')
    .or(`keywords.cs.{${keywords}},section_title.ilike.%${keywords}%,content.ilike.%${keywords}%`)
    .order('importance_level', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// 벡터 검색
async function searchByVector(supabase, genAI, query, limit) {
  // 임베딩 생성
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(query);
  const embedding = result.embedding.values;
  
  // 벡터 검색
  const { data, error } = await supabase.rpc('match_theory_chunks', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit
  });
  
  if (error) throw error;
  return data;
}

// 포뮬러 검색
async function searchByFormula(supabase, formulaCode, limit) {
  const { data, error } = await supabase
    .from('theory_chunks')
    .select('page_number, section_title, content, formula_codes, keywords, sub_category')
    .contains('formula_codes', [formulaCode])
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// 카테고리별 샘플
async function searchByCategory(supabase, category, limit) {
  const { data, error } = await supabase
    .from('theory_chunks')
    .select('page_number, section_title, content, keywords, importance_level, sub_category')
    .eq('sub_category', category)
    .order('importance_level', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// 통계
async function getStatistics(supabase) {
  // 전체 개수
  const { count: totalCount, error: countError } = await supabase
    .from('theory_chunks')
    .select('*', { count: 'exact', head: true });
  
  if (countError) throw countError;
  
  // 카테고리별 개수
  const { data: allData, error: dataError } = await supabase
    .from('theory_chunks')
    .select('sub_category');
  
  if (dataError) throw dataError;
  
  const categoryStats = {};
  allData.forEach(item => {
    categoryStats[item.sub_category] = (categoryStats[item.sub_category] || 0) + 1;
  });
  
  return {
    total_chunks: totalCount,
    categories: Object.entries(categoryStats).map(([name, count]) => ({
      category: name,
      count
    })),
    last_updated: new Date().toISOString()
  };
}
