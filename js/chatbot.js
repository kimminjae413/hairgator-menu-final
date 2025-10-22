// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 스트리밍 + 42포뮬러 최종 완성

const fetch = require('node-fetch');

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
    const { action, payload } = JSON.parse(event.body);

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');
    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not configured');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, GEMINI_KEY);
      
      case 'generate_recipe':
        return await generateRecipe(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
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

// ==================== 이미지 분석 (42포뮬러) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 42포뮬러 전문 헤어 분석가입니다.

**미션**: 이미지를 3D 공간으로 분석하여 42포뮬러 + 56파라미터를 추출하세요.

## 📐 42포뮬러 (7개 섹션)

1. **가로섹션** (2층) - 정수리~이마
2. **후대각섹션** (9층) - 뒷머리 볼륨
3. **전대각섹션** (6층) - 측면~앞머리
4. **세로섹션** (12층) - 중앙 축 ⭐
5. **현대각백준** (3층) - 귀라인
6. **네이프존** (4층) - 목 부위
7. **업스컵** (6층) - 정수리

**각 층 분석**: 
- Lifting Angle: L0(0°)~L8(180°)
- Length: cm
- Cut Method: Blunt/Slide/Point/Brick

**출력 형식 (JSON만):**
{
  "formula_42": {
    "세로섹션": [
      {"층": 1, "angle": "L0 (0°)", "length_cm": 45, "method": "Blunt Cut"},
      ...
    ],
    "후대각섹션": [...],
    "네이프존": [...]
  },
  "parameters_56": {
    "womens_cut_category": "허그컷",
    "estimated_hair_length_cm": 45,
    ...
  }
}

**중요**: 보이는 섹션만 분석, JSON만 출력`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
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
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  
  let analysisResult;
  try {
    analysisResult = JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysisResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('JSON 파싱 실패');
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: analysisResult })
  };
}

// ==================== 레시피 생성 (스트리밍) ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { analysis_result } = payload;

  const formula42 = analysis_result.formula_42 || {};
  const params56 = analysis_result.parameters_56 || analysis_result;

  // 검색 쿼리 생성
  const searchQuery = createSearchQuery(params56);
  
  // 유사 스타일 검색
  const similarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey);

  // 레시피 예시 준비
  let recipeExamples = '';
  if (similarStyles && similarStyles.length > 0) {
    recipeExamples = '\n\n**유사 스타일 레시피:**\n' + 
      similarStyles.map((s, i) => {
        if (s.recipe) {
          let recipeData = typeof s.recipe === 'string' ? JSON.parse(s.recipe) : s.recipe;
          return `[${i+1}] ${s.name}\n${JSON.stringify(recipeData, null, 2)}`;
        }
        return `[${i+1}] ${s.name} - 레시피 없음`;
      }).join('\n\n');
  }

  // GPT 스트리밍 호출
  const systemPrompt = `당신은 42포뮬러 헤어 마스터입니다.

**미션**: Supabase와 동일한 구조의 **사람이 이해하기 쉬운** 레시피를 생성하세요.

## 📋 출력 형식 (이미지 참고)

# ✂️ [E / 바그컷] 커트 매뉴얼

**컷 정보**
- 길이: 어깨보다 살짝 위
- 레이어: 자글스럽고 부드러운 라인 증감
- 앞머리: 시스루 빛 or 풀 빛 (선택 가능)
- 전체 느낌: 가볍고 산뜻하지만 우끌치 않게 모든 C를 중심의 블룸감

---

## ✅ 1. 섹션별 (4단 분할)

**① 귀 위에서 탑(Top) 섹션 분리**
**② 귀 위에서 백(Back) 섹션 묶을 포인트(Front) 섹션**
**③ 앞머리 또는 프린지(Fringe) 섹션으로 분리**

💡 **이 구조를 기반으로 하면 커트가 훨씬 효율적입니다.**

---

## ✅ 2. 기장 설정 (Base Length Cut)

**백(Back) 섹션부터 시작**
- 어깨선보다 2cm 위에서 가볍게 '일자'로 기준 길이 설정
- 살짝 라운드되게, 양쪽 사이드와 부드럽게 연결

💡 **이때 부케감이 너무 상기켜 앉도록 1~1.5cm 호도 포인트 컷(Point cut) 추천**

---

## ✅ 3. 사이드 연결 커트 (Side Cut)

- 기존 길이와 연결하되 턱 아래→어깨쪽 사이드를 자연스럽게 연결
- 귀 밑쪽은 약간 레이어 적용

💡 **고객 얼굴형 따라, 턱 근처에 약간 승량 블렌딩 소프트한 분위기 연출 가능**

---

## ✅ 4. 레이어링 (Layer Cut)

탑 섹션을 무가운 너무 짧지 않고, 중간~관리할 자연스럽게 층을 줍니다.
- 물론 양쪽은 일레이먼에서 연결되도록 자연스럽고 가볍게 공선형태를

💡 **포거온 층 X, 너무 기계적 지면 될 우치가 어려워요.**

---

## ✅ 5. 앞머리 커트 (Fringe Cut)

눈썹~눈 끝 길이의 시스루 빛
- 가장터치 가장 흔고, 양쪽으로 길쏠을 길이주는 아치형으로
- 물론 너무 흐틀하지 않게 툭이 드리는 느낌으로 포인컬

💡 **이 스타일을 앞머리 같이 가능하지만, 시스루 빛을 볼모면 얼굴에 더 작아 보입니다.**

---

## ✅ 6. 텍스처 정리 (Point & Slide Cut)

전체적으로 끝 라인이 포인터 것 모든 슬라이드 것을 이용해 가볍게 정리
- 특히 넵쪽 밑장 끝은 날은 사이드 끝날보는 질감 정감 필수

💡 **무거감은 살리되 풍만한 없이 자연스럽고 흐드도록 마무리**

---

## 💡 스타일 완성 팁

- 물건 시 바그컷 / 무쌍랑 추천
- 드라이 시 끝만 바깥 방향 or 안쪽으로 굴려 C줄 ↓ 조
- 앞머리는 드라이어 살짝 믹하여 얼굴에 닿지해 보이기 없도록`;

  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      stream: true,  // ⭐ 스트리밍 활성화
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `**분석 결과:**\n\n42포뮬러:\n${JSON.stringify(formula42, null, 2)}\n\n56파라미터:\n${JSON.stringify(params56, null, 2)}${recipeExamples}\n\n---\n\n위 결과와 유사 레시피를 참고하여, **사람이 쉽게 이해할 수 있는 실무 커트 매뉴얼**을 생성하세요. 이미지 예시처럼 단계별로 명확하게 작성하세요.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!gptResponse.ok) {
    throw new Error('GPT API failed');
  }

  // ⭐ 스트리밍 응답 처리
  let fullText = '';
  const reader = gptResponse.body;
  
  for await (const chunk of reader) {
    const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content || '';
          fullText += content;
        } catch (e) {
          // 파싱 에러 무시
        }
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: {
        recipe: fullText,
        similar_styles_count: similarStyles.length
      }
    })
  };
}

// ==================== 검색 쿼리 생성 ====================
function createSearchQuery(params) {
  const keywords = [];

  if (params.womens_cut_category) keywords.push(params.womens_cut_category);
  if (params.mens_cut_category) keywords.push(params.mens_cut_category);

  if (params.estimated_hair_length_cm) {
    const length = params.estimated_hair_length_cm;
    if (length > 40) keywords.push('롱헤어');
    else if (length > 25) keywords.push('미디엄');
    else if (length > 15) keywords.push('단발');
    else keywords.push('숏헤어');
  }

  return keywords.join(' ') || '헤어스타일';
}

// ==================== 유사 스타일 검색 ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey) {
  try {
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

    if (!embeddingResponse.ok) throw new Error('Embedding failed');

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

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
      return await directTableSearch(supabaseUrl, supabaseKey, 5);
    }

    return await supabaseResponse.json() || [];

  } catch (error) {
    return await directTableSearch(supabaseUrl, supabaseKey, 5);
  }
}

async function directTableSearch(supabaseUrl, supabaseKey, limit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/hairstyles?select=id,code,name,description,image_url,recipe&limit=${limit}`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) return [];
  return await response.json();
}

// ==================== 기존 함수들 ====================
function detectLanguage(text) {
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) return 'korean';
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) return 'vietnamese';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'japanese';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'chinese';
  return 'english';
}

async function searchStyles(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;
  const results = await searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  };
}

async function generateResponse(payload, openaiKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);
  const isCasualChat = !search_results || search_results.length === 0;

  if (isCasualChat) {
    return await casualConversation(user_query, userLanguage, openaiKey);
  }
  return await professionalAdvice(user_query, search_results, userLanguage, openaiKey);
}

async function casualConversation(user_query, userLanguage, openaiKey) {
  const prompts = {
    korean: '당신은 친근한 헤어 AI입니다.',
    english: 'You are a friendly hair AI.',
    japanese: 'あなたは親しみやすいヘアAIです。',
    chinese: '你是友好的发型AI。',
    vietnamese: 'Bạn là trợ lý AI tóc thân thiện.'
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompts[userLanguage] || prompts.korean },
        { role: 'user', content: user_query }
      ],
      temperature: 0.9,
      max_tokens: 100
    })
  });

  const data = await response.json();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: data.choices[0].message.content })
  };
}

async function professionalAdvice(user_query, search_results, userLanguage, openaiKey) {
  const context = search_results.map(r => `${r.name}: ${r.description || '정보'}`).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '헤어 전문가입니다. 2-3문장 조언.' },
        { role: 'user', content: `질문: ${user_query}\n\n참고:\n${context}` }
      ],
      temperature: 0.8,
      max_tokens: 200
    })
  });

  const data = await response.json();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: data.choices[0].message.content })
  };
}
