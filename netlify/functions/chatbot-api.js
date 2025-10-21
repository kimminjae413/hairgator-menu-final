// netlify/functions/chatbot-api.js
// Netlify Functions로 API 키 보호 + 다국어 지원

const fetch = require('node-fetch');

// CORS 헤더
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, payload } = JSON.parse(event.body);

    // 환경변수에서 API 키 가져오기 (안전!)
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, GEMINI_KEY);
      
      case 'search_styles':
        return await searchStyles(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_response':
        return await generateResponse(payload, OPENAI_KEY);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unknown action' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ==================== 언어 감지 함수 ====================
function detectLanguage(text) {
  // 한글 체크
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  if (koreanRegex.test(text)) {
    return 'korean';
  }
  
  // 일본어 체크
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  if (japaneseRegex.test(text)) {
    return 'japanese';
  }
  
  // 중국어 체크
  const chineseRegex = /[\u4E00-\u9FFF]/;
  if (chineseRegex.test(text)) {
    return 'chinese';
  }
  
  // 기본값: 영어
  return 'english';
}

// ==================== 이미지 분석 (Gemini) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 업로드된 헤어스타일 이미지를 분석하고, 
56개 파라미터 중 식별 가능한 항목을 JSON 형식으로 추출하세요.

**응답 형식:**
{
  "cut_category": "Women's Cut",
  "womens_cut_category": "허그컷",
  "estimated_hair_length_cm": 35,
  "fringe_type": "Side Bang",
  "structure_layer": "Graduated Layer",
  "confidence_score": 0.85
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type, data: image_base64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const analysisResult = JSON.parse(text);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: analysisResult })
  };
}

// ==================== 벡터 검색 ====================
async function searchStyles(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;

  // 1. OpenAI 임베딩 생성
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query
    })
  });

  if (!embeddingResponse.ok) {
    throw new Error('OpenAI embedding failed');
  }

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data[0].embedding;

  // 2. Supabase 벡터 검색
  const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/match_hairstyles`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_count: 5
    })
  });

  if (!supabaseResponse.ok) {
    throw new Error('Supabase search failed');
  }

  const results = await supabaseResponse.json();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  };
}

// ==================== GPT 답변 생성 (다국어 지원) ====================
async function generateResponse(payload, openaiKey) {
  const { user_query, search_results } = payload;

  // 사용자 질문의 언어 감지
  const userLanguage = detectLanguage(user_query);

  // 언어별 시스템 프롬프트
  const systemPrompts = {
    korean: '당신은 전문 헤어 스타일리스트입니다. 검색된 스타일 정보를 바탕으로 자연스럽게 한국어로 추천해주세요.',
    english: 'You are a professional hair stylist. Based on the search results, provide natural recommendations in English.',
    japanese: 'あなたはプロのヘアスタイリストです。検索されたスタイル情報をもとに、日本語で自然にお勧めしてください。',
    chinese: '你是专业的发型师。根据搜索结果，用中文自然地推荐发型。'
  };

  // 언어별 지시문
  const languageInstructions = {
    korean: '\n\n**중요**: 반드시 한국어로만 답변하세요.',
    english: '\n\n**Important**: Always respond in English.',
    japanese: '\n\n**重要**: 必ず日本語で回答してください。',
    chinese: '\n\n**重要**: 必须用中文回答。'
  };

  const context = search_results.map(r => 
    `${r.name}: ${r.description}`
  ).join('\n\n');

  const systemPrompt = (systemPrompts[userLanguage] || systemPrompts['korean']) + 
                       (languageInstructions[userLanguage] || languageInstructions['korean']);

  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `질문: ${user_query}\n\n관련 스타일:\n${context}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!gptResponse.ok) {
    throw new Error('GPT API failed');
  }

  const data = await gptResponse.json();
  const answer = data.choices[0].message.content;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: answer,
      detected_language: userLanguage 
    })
  };
}
