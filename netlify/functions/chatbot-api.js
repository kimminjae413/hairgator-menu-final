// netlify/functions/chatbot-api.js
// Netlify Functions로 API 키 보호 + 다국어 지원 - 최종 완성 버전

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

    // 환경변수 검증
    console.log('Environment check:', {
      hasOpenAI: !!OPENAI_KEY,
      hasGemini: !!GEMINI_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_KEY,
      supabaseUrl: SUPABASE_URL
    });

    // 필수 환경변수 체크
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    if (!OPENAI_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!GEMINI_KEY) {
      throw new Error('Gemini API key not configured');
    }

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
  
  // 베트남어 체크 (베트남어 특수문자)
  const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseRegex.test(text)) {
    return 'vietnamese';
  }
  
  // 일본어 체크
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
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

  // ⭐ 모든 API 키에서 사용 가능한 안정 모델
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiKey}`,
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
          temperature: 0.1
          // ⭐ responseMimeType는 v1 API에서 지원 안 함 (제거)
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API Error:', errorData);
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

  console.log('searchStyles called with:', {
    query,
    supabaseUrl,
    hasSupabaseKey: !!supabaseKey
  });

  // URL 검증
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
  }

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

  // 2. Supabase 벡터 검색 (match_hairstyles 함수 사용)
  try {
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
      const errorText = await supabaseResponse.text();
      console.error('Supabase error:', errorText);
      
      // match_hairstyles 함수가 없으면 직접 테이블 검색
      console.log('Falling back to direct table query');
      return await directTableSearch(supabaseUrl, supabaseKey);
    }

    const results = await supabaseResponse.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: results,
        search_method: 'vector_search'
      })
    };
  } catch (error) {
    console.error('Supabase search error:', error);
    // 실패 시 대체 검색
    return await directTableSearch(supabaseUrl, supabaseKey);
  }
}

// ==================== 대체 검색 (벡터 함수 없을 때) ====================
async function directTableSearch(supabaseUrl, supabaseKey) {
  console.log('Using direct table search as fallback');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/hairstyles?select=id,code,name,description,image_url&limit=5`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Direct table search failed: ${errorText}`);
  }

  const results = await response.json();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: results,
      search_method: 'direct_table',
      note: 'Vector search unavailable, showing random results'
    })
  };
}

// ==================== GPT 답변 생성 (다국어 지원) ====================
async function generateResponse(payload, openaiKey) {
  const { user_query, search_results } = payload;

  // 사용자 질문의 언어 감지
  const userLanguage = detectLanguage(user_query);

  // 검색 결과가 없거나 비어있으면 일반 대화 모드
  const isCasualChat = !search_results || search_results.length === 0;

  if (isCasualChat) {
    // 일반 대화 모드
    return await casualConversation(user_query, userLanguage, openaiKey);
  }

  // 전문 멘토 모드 (스타일 검색 결과가 있을 때)
  return await professionalAdvice(user_query, search_results, userLanguage, openaiKey);
}

// ==================== 일반 대화 ====================
async function casualConversation(user_query, userLanguage, openaiKey) {
  const casualPrompts = {
    korean: '당신은 친근한 헤어 AI 어시스턴트입니다. 자연스럽고 편안하게 대화하세요.',
    english: 'You are a friendly hair AI assistant. Chat naturally and casually.',
    japanese: 'あなたは親しみやすいヘアAIアシスタントです。自然に会話してください。',
    chinese: '你是友好的发型AI助手。自然轻松地聊天。',
    vietnamese: 'Bạn là trợ lý AI tóc thân thiện. Trò chuyện tự nhiên và thoải mái.'
  };

  const systemPrompt = casualPrompts[userLanguage] || casualPrompts['korean'];

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
          content: user_query
        }
      ],
      temperature: 0.9,
      max_tokens: 100
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
      detected_language: userLanguage,
      mode: 'casual_chat'
    })
  };
}

// ==================== 전문 멘토 조언 ====================
async function professionalAdvice(user_query, search_results, userLanguage, openaiKey) {

  // 언어별 시스템 프롬프트
  const systemPrompts = {
    korean: `당신은 경력 20년 이상의 헤어 마스터입니다. 현장 헤어디자이너들에게 실무 기술과 노하우를 가르치는 선생님 역할을 합니다.

**답변 가이드:**
- 검색된 스타일의 핵심 커트 기법을 2-3문장으로 설명
- 시술 시 주의사항과 팁 제공
- 전문 용어 사용 (레이어, 그라데이션, 언더컷 등)
- 실무에 바로 적용 가능한 조언`,

    english: `You are a master hair stylist with 20+ years of experience, teaching practical techniques to salon professionals.

**Guide:**
- Explain key cutting techniques in 2-3 sentences
- Provide practical tips for execution
- Use professional terminology
- Give actionable advice`,

    japanese: `あなたは20年以上の経験を持つヘアマスターです。サロンのプロフェッショナルに実践的なテクニックを教える先生です。

**ガイド:**
- 主要なカット技術を2-3文で説明
- 施術時の注意点とコツを提供
- 専門用語を使用
- 実務に応用可能なアドバイス`,

    chinese: `你是拥有20年以上经验的发型大师，向沙龙专业人士传授实用技术的老师。

**指南:**
- 用2-3句话解释关键剪发技巧
- 提供实施技巧和注意事项
- 使用专业术语
- 给出可操作的建议`,

    vietnamese: `Bạn là bậc thầy tóc với hơn 20 năm kinh nghiệm, dạy kỹ thuật thực tế cho các chuyên gia salon.

**Hướng dẫn:**
- Giải thích kỹ thuật cắt chính trong 2-3 câu
- Cung cấp mẹo thực hiện và lưu ý
- Sử dụng thuật ngữ chuyên nghiệp
- Đưa ra lời khuyên khả thi`
  };

  // 언어별 지시문
  const languageInstructions = {
    korean: '\n\n**중요**: 반드시 한국어로, 헤어디자이너가 현장에서 바로 쓸 수 있는 실무 조언을 2-3문장으로 간결하게 제공하세요.',
    english: '\n\n**Important**: Respond in English with practical salon advice in 2-3 sentences.',
    japanese: '\n\n**重要**: 日本語で、サロンですぐ使える実務アドバイスを2-3文で簡潔に提供してください。',
    chinese: '\n\n**重要**: 用中文提供沙龙可直接使用的实用建议，保持在2-3句话。',
    vietnamese: '\n\n**Quan trọng**: Trả lời bằng tiếng Việt với lời khuyên thực tế cho salon trong 2-3 câu.'
  };

  const context = search_results.map(r => 
    `스타일명: ${r.name}\n설명: ${r.description || '스타일 정보'}\n코드: ${r.code}`
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
          content: `디자이너 질문: ${user_query}\n\n참고 스타일 정보:\n${context}\n\n위 스타일의 커트 기법과 시술 팁을 알려주세요.`
        }
      ],
      temperature: 0.8,
      max_tokens: 200
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
