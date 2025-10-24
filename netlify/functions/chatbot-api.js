// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 56파라미터 기반 7섹션 레시피 완성 버전
// ✅ 정확한 출력 형식: ###1~###7 구조

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
      
      case 'generate_recipe_stream':
        return await generateRecipeStream(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
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

// ==================== 1단계: 이미지 분석 (56파라미터) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 **56파라미터 체계**에 따라 분석하세요.

## 분석 가이드라인

### Cut Category (필수)
- "Women's Cut" 또는 "Men's Cut"

### Women's Cut Categories (해당 시)
**길이 분류:**
- A Length: 가슴 아래 (65cm)
- B Length: 가슴 중간 (50cm)
- C Length: 쇄골 (40cm)
- D Length: 어깨 (35cm)
- E Length: 어깨 위 (30cm)
- F Length: 턱선 밑 (25cm)
- G Length: Jaw 라인 (20cm)
- H Length: 숏헤어 (15cm)

### 스타일 형태 (Cut Form)
- O (One Length): 원렝스
- G (Graduation): 그래쥬에이션
- L (Layer): 레이어
- C (Combination): 복합

### Structure Layer
- Long Layer / Medium Layer / Short Layer
- Square Layer / Round Layer / Graduated Layer

### Fringe (앞머리)
**타입:** Full Bang / See-through Bang / Side Bang / No Fringe
**길이:** Forehead / Eyebrow / Eye / Cheekbone / Lip / Chin / None

### Volume & Weight
- Volume Zone: Low / Medium / High
- Weight Flow: Balanced / Forward Weighted / Backward Weighted

### 기술 파라미터
- Section: Horizontal / Vertical / Diagonal Forward / Diagonal Backward
- Lifting: L0~L8
- Direction: D0~D8

**출력 형식 (JSON만):**
\`\`\`json
{
  "cut_category": "Women's Cut",
  "womens_cut_category": "엘리스컷",
  "length_category": "G Length",
  "estimated_hair_length_cm": 20,
  "cut_form": "L (Layer)",
  "structure_layer": "Graduated Layer",
  "fringe_type": "Side Bang",
  "fringe_length": "Eye",
  "volume_zone": "Medium",
  "weight_flow": "Forward Weighted",
  "hair_texture": "Medium",
  "styling_method": "Blow Dry",
  "section_primary": "Vertical",
  "lifting_range": ["L2", "L4", "L6"],
  "direction_primary": "D0"
}
\`\`\``;

  try {
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
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
    const params56 = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: params56
      })
    };
  } catch (error) {
    console.error('💥 analyzeImage Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Image analysis failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 2단계: 레시피 생성 (56파라미터 → 7섹션 구조) ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56 } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56);

    // 벡터 검색으로 유사 스타일 찾기
    const searchQuery = `${params56.womens_cut_category || params56.cut_category} ${params56.structure_layer || ''} ${params56.length_category || ''}`;
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    // GPT 프롬프트 (정확한 형식 강제)
    const systemPrompt = `당신은 HAIRGATOR 시스템 전문가입니다.
다음 56파라미터를 바탕으로 **정확히 아래 형식**으로 커트 레시피를 작성하세요.

# 필수 출력 형식 (절대 변경 금지)

<커트 레시피>
###1. 스타일 설명: [이 스타일의 전체적인 이미지와 특징을 2-3문장으로 설명]

###2. 스타일 길이(Style Length): 
**${params56.length_category}** (${params56.estimated_hair_length_cm}cm)
- 롱(Long): A, B, C Length
- 미디움(Medium): D, E, F, G Length
- 숏(Short): H Length

###3. 스타일 형태(Style Form): 
**${params56.cut_form}**
- 원렝스(O): One Length
- 그래쥬에이션(G): Graduation
- 레이어(L): Layer
- 복합(C): Combination

###4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type}** - **${params56.fringe_length}**
- 없음(None)
- 이마(Fore Head)
- 눈썹(Eye Brow)
- 눈(Eye)
- 광대(Cheek Bone)
- 입술(Lip)
- 턱(Chin)

###5. 베이스 커트(Base Cut)
**인터널(Internal) 진행:**
A 존(A Zone): [귀 아래-목 부위 시술 내용을 구체적으로 기술]
B 존(B Zone): [귀 위 중단 부위 시술 내용을 구체적으로 기술]

**엑스터널(External) 진행:**
C 존(C Zone): [정수리 상단 부위 시술 내용을 구체적으로 기술]

**다이렉션(Direction)**: ${params56.direction_primary || 'D0'}
- D0: 정면, D1: 우측전방 45°, D2: 우측측면 90°, D3: 우측후방 135°
- D4: 정후방 180°, D5: 좌측후방 225°, D6: 좌측측면 270°, D7: 좌측전방 315°, D8: 전체 360°

**섹션(Section)**: ${params56.section_primary}
- 가로(Horizontal): 수평 섹션
- 세로(Vertical): 수직 섹션
- 전대각(Diagonal Forward): 앞쪽 대각선
- 후대각(Diagonal Backward): 뒤쪽 대각선

**리프팅(Lifting)**: ${(params56.lifting_range || []).join(', ')}
- L0(0도), L1(22.5도), L2(45도), L3(67.5도), L4(90도)
- L5(112.5도), L6(135도), L7(157.5도), L8(180도)

**아웃라인(Outline) 설정**: ${params56.length_category}
- A~H 라인 중 해당 라인에 맞춰 아웃라인 설정

**볼륨(Volume)**: ${params56.volume_zone}
- 로우(Low/0도~45도): 하단 볼륨
- 미디움(Medium/45도~90도): 중단 볼륨
- 하이(High/90도 이상): 상단 볼륨

###6. 질감처리(Texturizing): 
[포인트 커트, 슬라이드 커트 등 구체적인 텍스처 기법을 상세히 기술]

###7. 스타일링(Styling): 
[블로우 드라이 방법, 손가락/브러시 사용법, 최종 스타일링 팁을 3-4문장으로 기술]

# 중요: 절대 포함하지 말 것
- 스타일명 (${params56.womens_cut_category} 등)
- 예상길이 수치 중복
- "인크리스 레이어" 같은 불필요한 용어
- "컷 셰이프" 같은 중복 설명

# 입력 데이터
${JSON.stringify(params56, null, 2)}

# 참고 유사 스타일
${similarStyles.map(s => `- ${s.name}: ${s.recipe ? s.recipe.substring(0, 100) : '레시피 없음'}`).join('\n')}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: '당신은 HAIRGATOR 레시피 생성 전문가입니다. 주어진 형식을 정확히 따르세요.' 
          },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const recipe = data.choices[0].message.content;

    console.log('✅ 레시피 생성 완료');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: recipe,
          params56: params56,
          similar_styles: similarStyles.slice(0, 3)
        }
      })
    };

  } catch (error) {
    console.error('💥 generateRecipe Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Recipe generation failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 3단계: 스트리밍 레시피 생성 ====================
async function generateRecipeStream(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56 } = payload;

  try {
    const searchQuery = `${params56.womens_cut_category || params56.cut_category} ${params56.structure_layer || ''}`;
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    const systemPrompt = `당신은 HAIRGATOR 시스템 전문가입니다.
다음 56파라미터를 바탕으로 **정확히 아래 형식**으로 커트 레시피를 작성하세요.

# 필수 출력 형식 (절대 변경 금지)

<커트 레시피>
###1. 스타일 설명: [이 스타일의 전체적인 이미지와 특징을 2-3문장으로 설명]

###2. 스타일 길이(Style Length): 
**${params56.length_category}** (${params56.estimated_hair_length_cm}cm)
- 롱(Long): A, B, C Length
- 미디움(Medium): D, E, F, G Length
- 숏(Short): H Length

###3. 스타일 형태(Style Form): 
**${params56.cut_form}**
- 원렝스(O): One Length
- 그래쥬에이션(G): Graduation
- 레이어(L): Layer

###4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type}** - **${params56.fringe_length}**

###5. 베이스 커트(Base Cut)
**인터널(Internal) 진행:**
A 존(A Zone): [구체적 시술 내용]
B 존(B Zone): [구체적 시술 내용]

**엑스터널(External) 진행:**
C 존(C Zone): [구체적 시술 내용]

**다이렉션(Direction)**: ${params56.direction_primary || 'D0'}
**섹션(Section)**: ${params56.section_primary}
**리프팅(Lifting)**: ${(params56.lifting_range || []).join(', ')}
**아웃라인(Outline) 설정**: ${params56.length_category}
**볼륨(Volume)**: ${params56.volume_zone}

###6. 질감처리(Texturizing): 
[구체적 텍스처 기법]

###7. 스타일링(Styling): 
[구체적 스타일링 방법]

# 중요: 스타일명, 예상길이 수치 중복, 불필요한 용어 절대 금지

# 입력 데이터
${JSON.stringify(params56, null, 2)}`;

    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '당신은 HAIRGATOR 레시피 생성 전문가입니다.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    if (!streamResponse.ok) {
      throw new Error(`OpenAI Stream Error: ${streamResponse.status}`);
    }

    let fullRecipe = '';
    const reader = streamResponse.body;

    for await (const chunk of reader) {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.includes('[DONE]')) break;
        if (line.startsWith('data: ')) {
          const json = JSON.parse(line.slice(6));
          const content = json.choices[0]?.delta?.content || '';
          fullRecipe += content;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: fullRecipe,
          params56: params56,
          similar_styles: similarStyles.slice(0, 3)
        }
      })
    };

  } catch (error) {
    console.error('💥 generateRecipeStream Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Stream recipe generation failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 벡터 검색 함수 ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null) {
  try {
    console.log(`🔍 벡터 검색 시작: "${query}"${targetGender ? ` (${targetGender})` : ''}`);

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
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_hairstyles`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_count: 10
        })
      }
    );

    if (!rpcResponse.ok) {
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
    }

    let results = await rpcResponse.json();

    if (targetGender) {
      results = results.map(r => {
        const parsed = parseHairstyleCode(r.code);
        return { ...r, parsed_gender: parsed.gender };
      });

      const sameGender = results.filter(r => r.parsed_gender === targetGender);
      const otherGender = results.filter(r => r.parsed_gender !== targetGender);
      results = [...sameGender, ...otherGender].slice(0, 10);
    }

    return results;

  } catch (error) {
    console.error('💥 Vector search failed:', error);
    return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
  }
}

function parseHairstyleCode(code) {
  if (!code || typeof code !== 'string') return { gender: null, length: null };
  
  const gender = code.startsWith('F') ? 'female' : code.startsWith('M') ? 'male' : null;
  const lengthMatch = code.match(/([A-H])L/);
  const length = lengthMatch ? lengthMatch[1] : null;
  
  return { gender, length, code };
}

async function directTableSearch(supabaseUrl, supabaseKey, query, targetGender = null) {
  console.log(`🔍 Fallback 검색 시작: "${query}"`);
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/hairstyles?select=id,name,category,code,recipe`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('All search methods failed');
  }

  const allStyles = await response.json();

  const scoredStyles = allStyles.map(style => {
    let score = 0;
    const queryLower = query.toLowerCase();
    const nameLower = (style.name || '').toLowerCase();
    
    const parsed = parseHairstyleCode(style.code);

    if (targetGender && parsed.gender === targetGender) {
      score += 200;
    }

    if (nameLower.includes(queryLower)) {
      score += 100;
    }

    if (style.recipe) {
      score += 30;
    }

    return { 
      ...style, 
      similarity_score: score,
      parsed_gender: parsed.gender
    };
  });

  return scoredStyles
    .filter(s => s.similarity_score > -50)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 10);
}

// ==================== 기타 함수들 ====================
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  
  const data = await response.json();
  
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
  const systemPrompts = {
    korean: '당신은 경력 20년 이상의 헤어 마스터입니다. 실무 조언을 2-3문장으로 제공하세요.',
    english: 'You are a master hair stylist with 20+ years of experience.',
    japanese: 'あなたは20年以上の経験を持つヘアマスターです。',
    chinese: '你是拥有20年以上经验的发型大师。',
    vietnamese: 'Bạn là bậc thầy tóc với hơn 20 năm kinh nghiệm.'
  };

  const context = search_results.map(r => 
    `${r.name}: ${r.description || '스타일 정보'}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompts[userLanguage] || systemPrompts['korean'] },
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
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content
    })
  };
}
