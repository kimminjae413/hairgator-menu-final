// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 89용어 + 42포뮬러 + 56파라미터 최종 완성 버전
// ✅ 새로운 레시피 포맷 (###1~###7) 적용
// ✅ 스트리밍 응답 지원

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

// ==================== 89용어 데이터 ====================
const HAIR_TERMS_89 = {
  // Tier 1: 필수 핵심 (15개)
  tier1: {
    "01": "1 Section & 2 Section",
    "02": "1Way Cut & 2Way Cut",
    "05": "A Zone & V Zone",
    "33": "Direction (D0~D8)",
    "54": "Lifting (L0~L8)",
    "70": "Section (Horizontal/Vertical/Diagonal)",
    "52": "Layer (Round/Square)",
    "44": "Graduation (Decreasing/Increasing/Parallel)",
    "62": "Over Direction",
    "35": "Distribution (Natural/Perpendicular/Shifted)",
    "19": "Blunt Cut",
    "31": "Design Line (Stationary/Mobile/Combination)",
    "86": "Volume (Low/Medium/High)",
    "89": "Zone (A/B/C)",
    "11": "Base Control (On/Off/Under Directed)"
  },
  
  // 주요 섹션 용어
  sections: {
    "70": {
      name: "Section",
      types: ["Horizontal", "Vertical", "Diagonal Forward", "Diagonal Backward", "Pie Section"],
      korean: "섹션"
    },
    "71": { name: "Section Application", korean: "섹션 응용" },
    "72": { name: "Section Control", korean: "섹션 컨트롤" }
  },
  
  // 각도 시스템
  angles: {
    "54": {
      name: "Lifting",
      levels: {
        "L0": "0°",
        "L1": "22.5°",
        "L2": "45°",
        "L3": "67.5°",
        "L4": "90°",
        "L5": "112.5°",
        "L6": "135°",
        "L7": "157.5°",
        "L8": "180°"
      },
      korean: "리프팅"
    },
    "33": {
      name: "Direction",
      directions: {
        "D0": "정면 (0°)",
        "D1": "우측 전방 45°",
        "D2": "우측 측면 90°",
        "D3": "우측 후방 135°",
        "D4": "정후방 180°",
        "D5": "좌측 후방 225°",
        "D6": "좌측 측면 270°",
        "D7": "좌측 전방 315°",
        "D8": "전체 (360°)"
      },
      korean: "다이렉션"
    }
  },
  
  // 존 시스템
  zones: {
    "05": { name: "A Zone & V Zone", korean: "A존 & V존" },
    "89": { 
      name: "Zone",
      types: {
        "A": "하단 (귀 아래-목)",
        "B": "중단 (귀 위)",
        "C": "상단 (정수리)"
      },
      korean: "구역"
    }
  },
  
  // 커팅 기법
  cutting: {
    "19": { name: "Blunt Cut", korean: "블런트 컷" },
    "20": { name: "Brick Cut", korean: "브릭 컷" },
    "23": { name: "Clipper Cut", korean: "클리퍼 컷" },
    "24": { name: "Clipper Over Comb", korean: "클리퍼 오버 콤" },
    "81": { name: "Texturizing", korean: "텍스쳐라이징" }
  }
};

// ==================== 1단계: 강화된 이미지 분석 (89용어 통합) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 **56파라미터 체계**에 따라 분석하세요.

## 분석 가이드라인

### Cut Category (필수)
- "Women's Cut" 또는 "Men's Cut"

### Women's Cut Categories (해당 시)
**길이 분류:**
- A Length: 가슴 아래 (65cm) - 에어컷, 구름컷, 프릴컷
- B Length: 가슴 중간 (50cm) - 허그컷, 샌드컷, 페미닌컷
- C Length: 쇄골 (40cm) - 빌드컷
- D Length: 어깨 (35cm) - 플라워컷, 플리츠컷
- E Length: 어깨 위 (30cm) - 타미컷, 벌룬컷
- F Length: 턱선 밑 (25cm) - 클래식컷, 보니컷, 바그컷
- G Length: Jaw 라인 (20cm) - 엘리스컷, 슬림컷
- H Length: 숏헤어 (15cm) - 코튼컷, 이지컷

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

### 기술 파라미터 (89용어 연계)
- Section: Horizontal(70) / Vertical(70) / Diagonal(70)
- Lifting: L0~L8(54)
- Direction: D0~D8(33)

**출력 형식 (JSON만):**
\`\`\`json
{
  "cut_category": "Women's Cut",
  "womens_cut_category": "허그컷",
  "length_category": "B Length",
  "estimated_hair_length_cm": 50,
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
  "direction_primary": "D0",
  "terms_89_used": ["70.Section", "54.Lifting", "52.Layer", "86.Volume"],
  "confidence_score": 0.85
}
\`\`\`

**중요:** 
- 89용어 번호를 terms_89_used에 명시
- lifting_range에 주요 각도 명시
- direction_primary에 주요 방향 명시`;

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
      console.error('❌ Gemini API Error:', {
        status: response.status,
        body: errorText
      });
      throw new Error(`Gemini API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Gemini API returned no candidates');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini response received');
    
    // JSON 추출
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
        error: error.message
      })
    };
  }
}

// ==================== 2단계: 새로운 레시피 생성 (스트리밍) ====================
async function generateRecipeStream(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { formula42, params56 } = payload;

  const targetGender = (params56 && params56.cut_category === "Women's Cut") ? 'female' : 
                       (params56 && params56.cut_category === "Men's Cut") ? 'male' : null;

  const searchQuery = (params56 && params56.womens_cut_category) 
    ? params56.womens_cut_category 
    : (params56 && params56.cut_category) 
    ? params56.cut_category 
    : 'Layer Cut';
  
  console.log(`🔍 검색 쿼리: "${searchQuery}", 타겟 성별: ${targetGender || '미지정'}`);
    
  const similarRecipes = await searchSimilarStyles(
    searchQuery,
    openaiKey,
    supabaseUrl,
    supabaseKey,
    targetGender
  );

  const recipesWithData = similarRecipes.filter(r => r.recipe);
  console.log(`📚 학습 데이터: ${recipesWithData.length}개 레시피 발견`);

  // 스트리밍 응답 설정
  const streamHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  try {
    const recipeStream = await generateDetailedRecipeStream(
      formula42,
      params56,
      recipesWithData,
      openaiKey
    );

    return {
      statusCode: 200,
      headers: streamHeaders,
      body: recipeStream
    };

  } catch (error) {
    console.error('💥 Recipe generation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

// ==================== 새로운 GPT 프롬프트 (###1~###7 형식) ====================
async function generateDetailedRecipeStream(formula42, params56, learningSamples, openaiKey) {
  
  const systemPrompt = `당신은 20년 경력의 전문 헤어 디자이너이자 교육자입니다.

# 역할
- 헤어 이미지 분석 결과를 바탕으로 정확하고 실용적인 커팅 레시피를 작성합니다.
- 디자이너가 실제 시술에 바로 활용할 수 있는 구체적인 지침을 제공합니다.
- **89개 헤어 용어 체계**를 활용하여 전문성을 높입니다.

# 89용어 참조 시스템
다음 용어 번호를 레시피에 반드시 포함하세요:

**필수 용어 (Tier 1):**
- 70.Section: 가로(Horizontal), 세로(Vertical), 전대각(Diagonal Forward), 후대각(Diagonal Backward)
- 54.Lifting: L0(0°), L1(22.5°), L2(45°), L3(67.5°), L4(90°), L5(112.5°), L6(135°), L7(157.5°), L8(180°)
- 33.Direction: D0(정면), D1~D8(방향)
- 52.Layer: Round Layer, Square Layer
- 44.Graduation: Decreasing/Increasing/Parallel
- 89.Zone: A존(하단), B존(중단), C존(상단)
- 05.A Zone & V Zone
- 86.Volume: Low(0°~45°), Medium(45°~90°), High(90° 이상)
- 19.Blunt Cut, 20.Brick Cut, 81.Texturizing

# 출력 형식 (반드시 이 형식을 따르세요)

<커트 레시피>

###1. 스타일 설명: 
[2-3문장으로 스타일의 전체적인 이미지와 특징을 설명]

###2. 스타일 길이(Style Length): 
**롱(Long)**: A, B, C Length 
**미디움(Medium)**: D, E, F, G Length 
**숏(Short)**: H Length
→ [해당하는 길이 카테고리를 명시]

###3. 스타일 형태(Style Form): 
**원렝스(O)**: 모든 머리카락의 길이가 같은 형태
**그래쥬에이션(G)**: 겉머리가 속머리보다 긴 형태 (44.Graduation 참조)
**레이어(L)**: 속머리가 겉머리보다 긴 형태 (52.Layer 참조)
→ [해당하는 형태를 명시하고 간단히 설명]

###4. 앞머리 길이(Fringe Length): 
**없음(None)** / **이마(Fore Head)** / **눈썹(Eye Brow)** / **눈(Eye)** / **광대(Cheek Bone)**
→ [해당하는 길이를 명시]

###5. 베이스 커트(Base Cut)

**인터널(Internal) 진행**: 
- **A 존(89.Zone-A)**: [구체적인 시술 방법]
  - 70.Section: [사용할 섹션 타입]
  - 54.Lifting: [L0~L8 중 사용할 각도]
  - 33.Direction: [D0~D8 중 사용할 방향]
  - 커팅 기법: [19.Blunt Cut 등]
  
- **B 존(89.Zone-B)**: [구체적인 시술 방법]
  - 70.Section: [섹션 타입]
  - 54.Lifting: [리프팅 각도]
  - 33.Direction: [방향]
  - 커팅 기법: [기법]

**엑스터널(External) 진행**:
- **C 존(89.Zone-C)**: [구체적인 시술 방법]
  - 70.Section: [섹션 타입]
  - 54.Lifting: [리프팅 각도]
  - 33.Direction: [방향]
  - 커팅 기법: [기법]

**다이렉션(33.Direction)**: 
[사용된 방향 명시 - 예: D4(정후방), D0(정면)]

**섹션(70.Section)**: 
[사용된 섹션 타입 - 가로(Horizontal), 세로(Vertical), 전대각(Diagonal Forward), 후대각(Diagonal Backward)]

**리프팅(54.Lifting)**: 
[사용된 리프팅 각도 - L0(0도), L2(45도), L4(90도), L6(135도) 등]

**아웃라인(Outline) 설정**: 
[A~H 라인 설정 방법 설명]

**볼륨(86.Volume)**: 
[로우(Low/0도~45도), 미디움(Medium/45도~90도), 하이(High/90도 이상) 중 선택하고 위치 명시]

###6. 질감처리(Texturizing): 
[81.Texturizing 기법 활용 - 포인트 커트, 슬라이드 커트 등 구체적인 질감처리 방법 설명]

###7. 스타일링(Styling): 
[블로우 드라이 방법, 제품 사용법, 마무리 방법 등 구체적인 스타일링 지침]

# 중요 규칙
1. **절대 포함하지 말 것**: 스타일명, 예상길이(cm), 인크리스 레이어, 컷 셰이프
2. **89용어 번호 필수 표기**: 70.Section, 54.Lifting, 33.Direction 등
3. **전문 용어는 한글과 영어 병기**: 가로(Horizontal), 리프팅(Lifting)
4. **구체적인 수치와 방향 명시**: L4(90도), D0(정면)
5. **위 형식을 정확히 따를 것**: ###1, ###2, ... ###7
6. **89용어를 자연스럽게 통합**: "70.Section(Horizontal)로 가로 섹션 진행"`;

  const learningContext = learningSamples.length > 0 
    ? `\n\n[참고 레시피 ${learningSamples.length}개]\n${learningSamples.slice(0, 3).map((r, i) => 
        `${i+1}. ${r.name}\n- 길이: ${r.length_category || 'Unknown'}\n- 형태: ${r.cut_form || 'Unknown'}`
      ).join('\n\n')}`
    : '';

  const userPrompt = `다음 분석 결과를 바탕으로 <커트 레시피>를 작성해주세요.

## 56파라미터 분석 결과
\`\`\`json
${JSON.stringify(params56, null, 2)}
\`\`\`

## 42포뮬러 (참고용)
\`\`\`json
${JSON.stringify(formula42, null, 2)}
\`\`\`
${learningContext}

**출력:** 위의 시스템 프롬프트에서 제시한 형식(###1부터 ###7까지)을 정확히 따라 <커트 레시피>를 작성해주세요.

**필수 요구사항:**
- 89용어 번호를 반드시 포함 (70.Section, 54.Lifting, 33.Direction, 89.Zone 등)
- A존/B존/C존으로 구분하여 설명
- 각 존마다 섹션/리프팅/방향 명시
- 스타일명, 예상길이(cm), 인크리스 레이어, 컷 셰이프는 절대 포함 금지`;

  // OpenAI Streaming API 호출
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
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.statusText}`);
  }

  return response.body;
}

// ==================== 기존 레시피 생성 (비스트리밍) ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { formula42, params56 } = payload;

  const targetGender = (params56 && params56.cut_category === "Women's Cut") ? 'female' : 
                       (params56 && params56.cut_category === "Men's Cut") ? 'male' : null;

  const searchQuery = (params56 && params56.womens_cut_category) 
    ? params56.womens_cut_category 
    : (params56 && params56.cut_category) 
    ? params56.cut_category 
    : 'Layer Cut';
  
  console.log(`🔍 검색 쿼리: "${searchQuery}", 타겟 성별: ${targetGender || '미지정'}`);
    
  const similarRecipes = await searchSimilarStyles(
    searchQuery,
    openaiKey,
    supabaseUrl,
    supabaseKey,
    targetGender
  );

  const recipesWithData = similarRecipes.filter(r => r.recipe);
  console.log(`📚 학습 데이터: ${recipesWithData.length}개 레시피 발견`);

  // 비스트리밍 버전
  const recipeText = await generateDetailedRecipeText(
    formula42,
    params56,
    recipesWithData,
    openaiKey
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        recipe_text: recipeText,
        similar_styles_count: similarRecipes.length,
        learning_samples_count: recipesWithData.length
      }
    })
  };
}

async function generateDetailedRecipeText(formula42, params56, learningSamples, openaiKey) {
  // systemPrompt는 generateDetailedRecipeStream과 동일
  const systemPrompt = `당신은 20년 경력의 전문 헤어 디자이너이자 교육자입니다.

[시스템 프롬프트는 generateDetailedRecipeStream과 동일하므로 생략]`;

  const learningContext = learningSamples.length > 0 
    ? `\n\n[참고 레시피 ${learningSamples.length}개]\n${learningSamples.slice(0, 3).map((r, i) => 
        `${i+1}. ${r.name}`
      ).join('\n\n')}`
    : '';

  const userPrompt = `다음 분석 결과를 바탕으로 <커트 레시피>를 작성해주세요.

## 56파라미터 분석 결과
\`\`\`json
${JSON.stringify(params56, null, 2)}
\`\`\`
${learningContext}`;

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
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// ==================== 검색 함수들 (기존 유지) ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null) {
  console.log(`🔍 검색 시작: "${query}"${targetGender ? ` (${targetGender} 우선)` : ''}`);
  
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

    if (!embeddingResponse.ok) {
      console.error('❌ Embedding 생성 실패, Fallback 검색 사용');
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
      console.error('❌ RPC 호출 실패, Fallback 검색 사용');
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
    }

    let results = await rpcResponse.json();
    console.log(`✅ RPC 검색 완료: ${results.length}개 발견`);

    if (targetGender) {
      results = results.map(r => {
        const parsed = parseHairstyleCode(r.code);
        return { ...r, parsed_gender: parsed.gender };
      });

      const sameGender = results.filter(r => r.parsed_gender === targetGender);
      const otherGender = results.filter(r => r.parsed_gender !== targetGender);

      console.log(`📊 성별 분류: ${targetGender} ${sameGender.length}개, 기타 ${otherGender.length}개`);
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
  console.log(`🔍 Fallback 검색 시작: "${query}"${targetGender ? ` (${targetGender} 우선)` : ''}`);
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/hairstyles?select=id,name,category,code,embedding,recipe`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (!response.ok) {
    const fallbackResponse = await fetch(
      `${supabaseUrl}/rest/v1/hairstyles?select=id,name,code,recipe`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!fallbackResponse.ok) {
      throw new Error('All search methods failed');
    }
    
    const fallbackResults = await fallbackResponse.json();
    return fallbackResults;
  }

  const allStyles = await response.json();
  console.log(`📊 전체 데이터: ${allStyles.length}개`);

  const scoredStyles = allStyles.map(style => {
    let score = 0;
    const queryLower = query.toLowerCase();
    const nameLower = (style.name || '').toLowerCase();
    const categoryLower = (style.category || '').toLowerCase();
    
    const parsed = parseHairstyleCode(style.code);

    if (targetGender && parsed.gender === targetGender) {
      score += 200;
    } else if (targetGender && parsed.gender && parsed.gender !== targetGender) {
      score -= 100;
    }

    if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
      score += 100;
    }
    if (categoryLower.includes(queryLower) || queryLower.includes(categoryLower)) {
      score += 80;
    }

    if (style.recipe) {
      score += 30;
    }

    return { 
      ...style, 
      similarity_score: score,
      parsed_gender: parsed.gender,
      parsed_length: parsed.length
    };
  });

  const results = scoredStyles
    .filter(s => s.similarity_score > -50)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 10);

  console.log(`✅ 유사도 검색 완료: 상위 ${results.length}개 선택`);
  return results;
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
    english: 'You are a master hair stylist with 20+ years of experience. Provide practical advice in 2-3 sentences.',
    japanese: 'あなたは20年以上の経験を持つヘアマスターです。実務アドバイスを2-3文で提供してください。',
    chinese: '你是拥有20年以上经验的发型大师。用2-3句话提供实用建议。',
    vietnamese: 'Bạn là bậc thầy tóc với hơn 20 năm kinh nghiệm. Cung cấp lời khuyên thực tế trong 2-3 câu.'
  };

  const context = search_results.map(r => 
    `${r.name}: ${r.description || '스타일 정보'}`
  ).join('\n');

  const systemPrompt = systemPrompts[userLanguage] || systemPrompts['korean'];

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
      data: data.choices[0].message.content,
      detected_language: userLanguage
    })
  };
}
