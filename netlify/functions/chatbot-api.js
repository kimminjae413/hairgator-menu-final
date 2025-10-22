// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 42포뮬러 + 56파라미터 최종 완성 버전
// ✅ Netlify 배포 가능 버전 (fetch import 추가)

const fetch = require('node-fetch'); // ⭐ 필수!

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

    console.log('Environment check:', {
      hasOpenAI: !!OPENAI_KEY,
      hasGemini: !!GEMINI_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_KEY
    });

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

// ==================== HTTP 요청 헬퍼 (fetch 통일) ====================
async function httpRequest(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// ==================== 1단계: 이미지 분석 (42포뮬러 + 56파라미터) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  // ✅ 간소화된 프롬프트 (에러 방지)
  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 분석하고 JSON 형식으로 정보를 추출하세요.

**출력 형식 (JSON만):**
{
  "cut_category": "Women's Cut or Men's Cut",
  "womens_cut_category": "허그컷",
  "estimated_hair_length_cm": 35,
  "fringe_type": "Side Bang",
  "structure_layer": "Graduated Layer",
  "hair_texture": "Medium",
  "styling_method": "Blow Dry",
  "confidence_score": 0.85
}`;

  try {
    // ✅ gemini-2.5-flash-lite 사용
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mime_type,
                  data: image_base64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topP: 1,
            topK: 32,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        apiKeyPrefix: geminiKey.substring(0, 15) + '...'
      });
      throw new Error(`Gemini API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ 안전한 응답 파싱
    if (!data.candidates || !data.candidates[0]) {
      console.error('No candidates in response:', data);
      throw new Error('Gemini API returned no candidates');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini response received:', text.substring(0, 100) + '...');
    
    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    
    const analysisResult = JSON.parse(jsonText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analysisResult
      })
    };

  } catch (error) {
    console.error('💥 Image analysis failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Image analysis failed'
      })
    };
  }
}

// ==================== 2단계: 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { formula42, params56 } = payload;

  // Supabase에서 유사 레시피 찾기
  const similarRecipes = await searchSimilarStyles(
    params56.womens_cut_category || 'Layer Cut',
    openaiKey,
    supabaseUrl,
    supabaseKey
  );

  // 학습용 레시피 예제 생성
  const recipesWithData = similarRecipes.filter(r => r.recipe_42 || r.recipe_56);
  const recipeExamples = recipesWithData.slice(0, 3).map((recipe, i) => 
    `### 예제 ${i + 1}: ${recipe.name}\n\n` +
    `**42포뮬러:**\n\`\`\`json\n${JSON.stringify(recipe.recipe_42, null, 2)}\n\`\`\`\n\n` +
    `**56파라미터:**\n\`\`\`json\n${JSON.stringify(recipe.recipe_56, null, 2)}\n\`\`\``
  ).join('\n\n---\n\n');

  // GPT로 상세 레시피 생성
  const detailedRecipe = await generateDetailedRecipe(
    formula42,
    params56,
    recipeExamples,
    recipesWithData.length,
    openaiKey
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        recipe: detailedRecipe,
        similar_styles_count: recipesWithData.length
      }
    })
  };
}

// ==================== 상세 레시피 생성 ====================
async function generateDetailedRecipe(formula42, params56, recipeExamples, recipesCount, openaiKey) {
  const systemPrompt = `당신은 **42포뮬러 헤어 전문가**입니다. 

업로드된 이미지 분석 결과(42포뮬러 + 56파라미터)와 Supabase 학습 데이터를 바탕으로, 
**실무에서 바로 사용 가능한 7단계 커트 레시피**를 생성하세요.

---

## ✂️ 커트 레시피 포맷

### 1. 스타일 설명
부드럽고 여성스러운 이미지를 갖는 ...

### 2. 스타일 길이 (Style Length)
- 롱(Long): A, B, C Length
- 미디움(Medium): D, E, F, G Length
- 숏(Short): H Length

### 3. 스타일 형태 (Style Form)
- 원렝스(O)
- 그래쥬에이션(G)
- 레이어(L)

### 4. 앞머리 길이 (Fringe Length)
- 없음(None), 이마(Fore Head), 눈썹(Eye Brow), 눈(Eye), 광대(Cheek Bone)...

### 5. 베이스 커트 (Base Cut)

#### 다이렉션 (Direction)
D8, D7, D6, D5, D4, D3, D2, D1, D0

#### 섹션 (Section)
- 가로(Horizontal)
- 세로(Vertical)
- 전대각(Diagonal Forward)
- 후대각(Diagonal Backward)

#### 리프팅 (Lifting)
L0(0도), L1(22.5도), L2(45도), L3(67.5도), L4(90도), L5(112.5도), L6(135도), L7(157.5도), L8(180도)

#### 아웃라인 (Outline) 설정
A~H 라인 설정

#### 인터널 (Internal) 진행

**A 존 (A Zone)**
\`\`\`
(세로섹션 1-6층 데이터)
\`\`\`

**B 존 (B Zone)**
\`\`\`
(세로섹션 7-12층 데이터)
\`\`\`

#### 엑스터널 (External) 진행

**C 존 (C Zone)**
\`\`\`
(후대각섹션 1-5층 데이터)
\`\`\`

#### 볼륨 (Volume)
로우(Low/0도~45도), 미디움(Medium/45도~90도), 하이(High/90 이상)

### 6. 질감처리 (Texturizing)
포인트 커트를 이용하여...

### 7. 스타일링 (Styling)
블로우 드라이 후 손가락을 이용하여...

---

**📋 참고사항:**
1. ❌ 나오지 않게할 내용: 스타일명, 예상길이(cm), Increase Layer 용어, Cut Shape 용어
2. ✅ A~H 라인만 사용 (S, M, L 금지)
3. ✅ 실무 용어 사용 (가로섹션, 세로섹션, 후대각섹션...)
`;

  const userContent = `**📸 업로드 이미지 분석 결과:**

42포뮬러:
${JSON.stringify(formula42, null, 2)}

56파라미터:
${JSON.stringify(params56, null, 2)}

${recipeExamples}

---

위 분석 결과와 Supabase 레시피들을 학습하여, **7단계 커트 레시피**를 생성하세요.`;

  // 🔥 스트리밍 방식으로 변경
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`GPT API failed: ${response.status}`);
  }

  // 스트리밍 응답 읽기
  let fullContent = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
            }
          } catch (e) {
            // JSON 파싱 오류 무시
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

// ==================== 유사 스타일 검색 (벡터 검색) ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey) {
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
      console.error('Supabase vector search failed, using fallback');
      return await directTableSearch(supabaseUrl, supabaseKey, query);
    }

    const results = await supabaseResponse.json();
    return results;
  } catch (error) {
    console.error('Supabase search error:', error);
    return await directTableSearch(supabaseUrl, supabaseKey, query);
  }
}

// ==================== 대체 검색 ====================
async function directTableSearch(supabaseUrl, supabaseKey, query) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/hairstyles?select=*&limit=5`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Direct table search failed');
  }

  return await response.json();
}

// ==================== 기존 함수들 ====================
function detectLanguage(text) {
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  if (koreanRegex.test(text)) return 'korean';
  
  const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseRegex.test(text)) return 'vietnamese';
  
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (japaneseRegex.test(text)) return 'japanese';
  
  const chineseRegex = /[\u4E00-\u9FFF]/;
  if (chineseRegex.test(text)) return 'chinese';
  
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
  const casualPrompts = {
    korean: '당신은 친근한 헤어 AI 어시스턴트입니다.',
    english: 'You are a friendly hair AI assistant.',
    japanese: 'あなたは親しみやすいヘアAIアシスタントです。',
    chinese: '你是友好的发型AI助手。',
    vietnamese: 'Bạn là trợ lý AI tóc thân thiện.'
  };

  const data = await httpRequest('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: casualPrompts[userLanguage] || casualPrompts['korean'] },
        { role: 'user', content: user_query }
      ],
      temperature: 0.9,
      max_tokens: 100
    })
  });
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content
    })
  };
}

async function professionalAdvice(user_query, search_results, userLanguage, openaiKey) {
  // ⭐ 다국어 시스템 프롬프트
  const systemPrompts = {
    korean: '당신은 경력 20년 이상의 헤어 마스터입니다. 실무 조언을 2-3문장으로 제공하세요.',
    english: 'You are a master hair stylist with 20+ years of experience. Provide practical advice in 2-3 sentences.',
    japanese: 'あなたは20年以上の経験を持つヘアマスターです。実務アドバイスを2-3文で提供してください。',
    chinese: '你是拥有20年以上经验的发型大师。用2-3句话提供实用建议。',
    vietnamese: 'Bạn là bậc thầy tóc với hơn 20 năm kinh nghiệm. Cung cấp lời khuyên thực tế trong 2-3 câu.'
  };

  // ⭐ 다국어 사용자 프롬프트
  const userPrompts = {
    korean: (query, context) => `질문: ${query}\n\n참고 스타일:\n${context}`,
    english: (query, context) => `Question: ${query}\n\nReference styles:\n${context}`,
    japanese: (query, context) => `質問: ${query}\n\n参考スタイル:\n${context}`,
    chinese: (query, context) => `问题: ${query}\n\n参考风格:\n${context}`,
    vietnamese: (query, context) => `Câu hỏi: ${query}\n\nKiểu tóc tham khảo:\n${context}`
  };

  const context = search_results.map(r => 
    `${r.name}: ${r.description || '스타일 정보'}`
  ).join('\n');

  const systemPrompt = systemPrompts[userLanguage] || systemPrompts['korean'];
  const userPromptFn = userPrompts[userLanguage] || userPrompts['korean'];

  const data = await httpRequest('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptFn(user_query, context) }
      ],
      temperature: 0.8,
      max_tokens: 200
    })
  });
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content,
      detected_language: userLanguage
    })
  };
}
