// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 42포뮬러 + 56파라미터 최종 완성 버전
// punycode 경고 해결 (node-fetch 사용 최적화)

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

  const systemPrompt = `당신은 **42포뮬러 전문 헤어 분석가**입니다.

**미션**: 업로드된 이미지를 **3D 공간 구조**로 분석하여 42포뮬러 + 56파라미터를 추출하세요.

---

## 📐 42포뮬러 (3D 공간 분석)

두상을 7개 공간 영역으로 나눠 각 층의 커트 정보를 추출:

**7개 섹션:**
1. **가로섹션** (2층) - 정수리~이마 라인
2. **후대각섹션** (9층) - 뒷머리 대각선 볼륨
3. **전대각섹션** (6층) - 측면~앞머리 연결
4. **세로섹션** (12층) - 중앙 실루엣 축 ⭐ 가장 중요
5. **현대각백준** (3층) - 목덜미~귀라인
6. **네이프존** (4층) - 목 부위 볼륨 조절
7. **업스컵** (6층) - 정수리 최상단 볼륨

**각 층의 분석 항목:**
- **Lifting Angle**: L0(0°), L1(22.5°), L2(45°), L3(67.5°), L4(90°), L5(112.5°), L6(135°), L7(157.5°), L8(180°)
- **Length**: 각 층의 길이 (cm)
- **Cut Method**: Blunt Cut, Slide Cut, Point Cut, Brick Cut, Channel Cut, Razor Cut, Scissor Over Comb

---

## 📊 56파라미터 (기존 유지)

기본 분류, 컷 형태, 길이, 텍스처, 스타일링, 컬러, 디자인 등 56개 전체 파라미터

**⚠️ 중요: 여성 헤어 길이 분류 (A~H만 사용)**
- **A**: 가슴 아래 (60cm 이상)
- **B**: 가슴~쇄골 중간 (45~60cm)
- **C**: 쇄골라인 (40~45cm)
- **D**: 어깨 닿는 선 (35~40cm)
- **E**: 어깨 바로 위 (30~35cm)
- **F**: 턱선 바로 밑 (25~30cm)
- **G**: Jaw 라인 (20~25cm)
- **H**: 숏헤어 (20cm 이하)

**반드시 A~H 중 하나만 사용하세요. S, M, L 같은 다른 분류는 사용하지 마세요!**

---

## 🎯 출력 형식 (JSON만 출력)

\`\`\`json
{
  "formula_42": {
    "가로섹션": [
      {"층": 1, "angle": "L0 (0°)", "length_cm": 45, "method": "Blunt Cut"},
      {"층": 2, "angle": "L1 (22.5°)", "length_cm": 42, "method": "Point Cut"}
    ],
    "후대각섹션": [
      {"층": 1, "angle": "L2 (45°)", "length_cm": 40},
      {"층": 2, "angle": "L3 (67.5°)", "length_cm": 38},
      {"층": 3, "angle": "L3 (67.5°)", "length_cm": 35, "method": "Slide Cut"},
      {"층": 4, "angle": "L4 (90°)", "length_cm": 32},
      {"층": 5, "angle": "L4 (90°)", "length_cm": 30},
      {"층": 6, "angle": "L5 (112.5°)", "length_cm": 28},
      {"층": 7, "angle": "L5 (112.5°)", "length_cm": 25},
      {"층": 8, "angle": "L6 (135°)", "length_cm": 22},
      {"층": 9, "angle": "L6 (135°)", "length_cm": 20}
    ],
    "전대각섹션": [
      {"층": 1, "angle": "L2 (45°)", "length_cm": 38},
      {"층": 2, "angle": "L3 (67.5°)", "length_cm": 35},
      {"층": 3, "angle": "L3 (67.5°)", "length_cm": 32},
      {"층": 4, "angle": "L4 (90°)", "length_cm": 30},
      {"층": 5, "angle": "L4 (90°)", "length_cm": 28},
      {"층": 6, "angle": "L5 (112.5°)", "length_cm": 25}
    ],
    "세로섹션": [
      {"층": 1, "angle": "L0 (0°)", "length_cm": 45},
      {"층": 2, "angle": "L0 (0°)", "length_cm": 45},
      {"층": 3, "angle": "L1 (22.5°)", "length_cm": 43},
      {"층": 4, "angle": "L2 (45°)", "length_cm": 40},
      {"층": 5, "angle": "L2 (45°)", "length_cm": 38},
      {"층": 6, "angle": "L3 (67.5°)", "length_cm": 35},
      {"층": 7, "angle": "L3 (67.5°)", "length_cm": 32},
      {"층": 8, "angle": "L4 (90°)", "length_cm": 30},
      {"층": 9, "angle": "L4 (90°)", "length_cm": 28},
      {"층": 10, "angle": "L5 (112.5°)", "length_cm": 25},
      {"층": 11, "angle": "L5 (112.5°)", "length_cm": 22},
      {"층": 12, "angle": "L6 (135°)", "length_cm": 20}
    ],
    "현대각백준": [
      {"층": 1, "angle": "L0 (0°)", "length_cm": 8},
      {"층": 2, "angle": "L1 (22.5°)", "length_cm": 6},
      {"층": 3, "angle": "L2 (45°)", "length_cm": 4}
    ],
    "네이프존": [
      {"층": 1, "angle": "L0 (0°)", "length_cm": 5, "method": "Blunt Cut"},
      {"층": 2, "angle": "L0 (0°)", "length_cm": 5, "method": "Brick Cut"},
      {"층": 3, "angle": "L1 (22.5°)", "length_cm": 4, "method": "Taper"},
      {"층": 4, "angle": "L2 (45°)", "length_cm": 3}
    ],
    "업스컵": [
      {"층": 1, "angle": "L4 (90°)", "length_cm": 15},
      {"층": 2, "angle": "L4 (90°)", "length_cm": 14},
      {"층": 3, "angle": "L5 (112.5°)", "length_cm": 13},
      {"층": 4, "angle": "L5 (112.5°)", "length_cm": 12},
      {"층": 5, "angle": "L6 (135°)", "length_cm": 11},
      {"층": 6, "angle": "L6 (135°)", "length_cm": 10}
    ]
  },
  
  "parameters_56": {
    "cut_category": "Women's Cut",
    "womens_cut_length": "B (가슴-쇄골 중간)",
    "womens_cut_category": "허그컷",
    "mens_cut_category": null,
    "estimated_hair_length_cm": 45,
    "gender": "Female",
    "cut_form": "L (Layer)",
    "weight_flow": "Evenly Distributed",
    "structure_layer": "Increase Layer",
    "fringe_type": "Side Bang",
    "fringe_length": "Chin",
    "perimeter_line": "Point Cut",
    "outline_shape": "Round",
    "nape_treatment": "Tapered",
    "top_section_length_cm": 20,
    "side_section_length_cm": 35,
    "back_section_length_cm": 45,
    "crown_height": "Medium",
    "volume_placement": "Crown",
    "silhouette": "Oval",
    "shape_emphasis": "Volume",
    "hair_texture": "Medium",
    "hair_density": "Medium",
    "natural_texture": "Straight",
    "texturizing_technique": "Point Cut",
    "finish_look": "Textured",
    "interior_texture": "Light",
    "end_texture": "Feathered",
    "surface_treatment": "Layered",
    "detailing": "Point Cut Detail",
    "styling_direction": "Backward",
    "parting": "Center",
    "styling_method": "Blow Dry",
    "movement_direction": "Outward",
    "face_framing": "Soft",
    "styling_product": "Light",
    "maintenance_level": "Medium",
    "versatility": "High",
    "color_level": null,
    "color_tone": null,
    "color_technique": "None",
    "dimension": "None",
    "root_shadow": null,
    "design_emphasis": "Shape Emphasis",
    "disconnection": "No",
    "undercut_presence": "No",
    "graduation_angle": "Medium (45-90°)",
    "elevation_angle": "90°",
    "cutting_angle": "Vertical",
    "section_pattern": "Radial",
    "confidence_score": 0.85,
    "difficulty_level": "중급",
    "estimated_time_minutes": 60,
    "face_shape_match": "Oval",
    "age_suitability": "20대",
    "occasion": "Daily"
  }
}
\`\`\`

---

## ⚠️ 분석 가이드라인

1. **3D 구조 추론**: 2D 이미지여도 그림자/하이라이트/각도로 3D 구조 파악
2. **세로섹션 최우선**: 중앙 실루엣 축(12층)이 가장 중요
3. **확신 없으면 생략**: 보이지 않는 섹션/층은 배열에서 제외
4. **JSON만 출력**: 설명 없이 순수 JSON만 반환

**중요**: 이미지에서 명확히 보이는 섹션/층만 분석하고, 불확실하면 해당 섹션 전체를 빈 배열 []로 반환하세요.`;

  const data = await httpRequest(
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

// ==================== 2단계: 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { analysis_result } = payload;
  
  console.log('레시피 생성 시작:', analysis_result.parameters_56);

  // 1. 검색 쿼리 생성
  const params = analysis_result.parameters_56;
  const searchQuery = [
    params.womens_cut_category || params.mens_cut_category,
    params.womens_cut_length?.split('(')[0]?.trim(),
    params.structure_layer,
    params.fringe_type !== 'No Fringe' ? '앞머리' : null
  ].filter(Boolean).join(' ');

  console.log('생성된 검색 쿼리:', searchQuery);

  // 2. Supabase에서 유사 스타일 검색
  const similarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey);
  console.log('찾은 유사 스타일:', similarStyles.length + '개');

  // 3. GPT로 레시피 생성
  const recipe = await generateDetailedRecipe(
    analysis_result.formula_42,
    analysis_result.parameters_56,
    similarStyles,
    openaiKey
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: recipe
    })
  };
}

// Supabase 벡터 검색
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey) {
  try {
    // 1. OpenAI 임베딩 생성
    const embeddingData = await httpRequest('https://api.openai.com/v1/embeddings', {
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

    const embedding = embeddingData.data[0].embedding;

    // 2. Supabase 벡터 검색
    try {
      const results = await httpRequest(`${supabaseUrl}/rest/v1/rpc/match_hairstyles`, {
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

      return results;
    } catch (rpcError) {
      console.log('벡터 검색 실패, 직접 검색으로 전환');
      return await directTableSearch(supabaseUrl, supabaseKey);
    }

  } catch (error) {
    console.error('벡터 검색 오류:', error);
    return await directTableSearch(supabaseUrl, supabaseKey);
  }
}

// 대체 검색
async function directTableSearch(supabaseUrl, supabaseKey) {
  return await httpRequest(`${supabaseUrl}/rest/v1/hairstyles?select=id,code,name,description,image_url,recipe&limit=5`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
}

// GPT 레시피 생성
async function generateDetailedRecipe(formula42, params56, similarStyles, openaiKey) {
  // 🔍 디버깅: 유사 스타일 확인
  console.log('📊 유사 스타일 분석:', {
    총개수: similarStyles.length,
    레시피있는개수: similarStyles.filter(s => s.recipe).length,
    스타일목록: similarStyles.map(s => ({ 
      name: s.name, 
      hasRecipe: !!s.recipe,
      recipeKeys: s.recipe ? Object.keys(s.recipe) : []
    }))
  });

  // Supabase 레시피 예제
  const recipesWithData = similarStyles.filter(style => style.recipe);
  const recipeExamples = recipesWithData.length > 0 
    ? recipesWithData.map((style, i) => `
**레시피 ${i + 1}: ${style.name}**
\`\`\`json
${JSON.stringify(style.recipe, null, 2)}
\`\`\`
`).join('\n')
    : '// ⚠️ Supabase에 레시피 데이터가 없습니다. 42포뮬러 분석만으로 레시피를 생성합니다.';

  const systemPrompt = `당신은 **42포뮬러 커트 레시피 전문가**입니다.

업로드 이미지의 42포뮬러 + 56파라미터 분석 결과와 Supabase의 유사 레시피들을 학습하여, **실무에서 바로 사용 가능한 커트 레시피**를 생성하세요.

**⚠️ 중요 - 다음 내용은 절대 출력하지 마세요:**
- 스타일명
- 예상 길이 (estimated_hair_length_cm)
- 인크리스 레이어 (Increase Layer 용어)
- 컷 셰이프 (Cut Shape 용어)

**출력 형식 (반드시 이 구조로만):**

# ✂️ 커트 레시피

## 1. 스타일 설명
부드럽고 여성스러운 이미지를 갖는 레이어 스타일입니다. [분석 결과 기반 1-2문장]

## 2. 스타일 길이 (Style Length)
- 롱(Long): A, B, C Length
- 미디움(Medium): D, E, F, G Length  
- 숏(Short): H Length
**해당 길이**: ${params56.womens_cut_length || 'Medium'}

## 3. 스타일 형태 (Style Form)
**기본 형태**: ${params56.cut_form === 'One Length' ? '원렝스(O)' : params56.cut_form === 'Graduation' ? '그래쥬에이션(G)' : '레이어(L)'}

## 4. 앞머리 길이 (Fringe Length)
**설정**: ${params56.fringe_type === 'No Fringe' ? '없음(None)' : params56.fringe_type || '이마(Fore Head)'}
- 옵션: 없음(None), 이마(Fore Head), 눈썹(Eye Brow), 눈(Eye), 광대(Cheek Bone)

## 5. 베이스 커트 (Base Cut)

### 다이렉션 (Direction)
**적용**: D${params56.direction_level || '4'} (D8부터 D0까지 선택)

### 섹션 (Section)
**주요 섹션**: ${params56.section_pattern || 'Vertical'} 
- 가로(Horizontal), 세로(Vertical), 전대각(Diagonal Forward), 후대각(Diagonal Backward)

### 리프팅 (Lifting)
**기준 각도**: L${Math.floor((params56.elevation_angle_degrees || 90) / 22.5)} (${params56.elevation_angle_degrees || 90}도)
- L0(0도), L1(22.5도), L2(45도), L3(67.5도), L4(90도), L5(112.5도), L6(135도), L7(157.5도), L8(180도)

### 아웃라인 (Outline) 설정
**라인**: ${params56.womens_cut_length?.charAt(0) || 'E'} 라인 (A~H 라인 중)

### 인터널 (Internal) 진행

**A 존 (A Zone)**
\`\`\`
${formula42?.vertical_section?.layers?.slice(0, 6).map((layer, i) => 
  `층 ${i+1}: ${layer.lifting || 'L0'} (${layer.lifting_degrees || 0}도), ${layer.length_cm || 0}cm`
).join('\n') || '세로섹션 1-6층 데이터 분석 필요'}
\`\`\`

**B 존 (B Zone)**
\`\`\`
${formula42?.vertical_section?.layers?.slice(6, 12).map((layer, i) => 
  `층 ${i+7}: ${layer.lifting || 'L0'} (${layer.lifting_degrees || 0}도), ${layer.length_cm || 0}cm`
).join('\n') || '세로섹션 7-12층 데이터 분석 필요'}
\`\`\`

### 엑스터널 (External) 진행

**C 존 (C Zone)**
\`\`\`
${formula42?.diagonal_backward_section?.layers?.slice(0, 5).map((layer, i) => 
  `층 ${i+1}: ${layer.lifting || 'L2'} (${layer.lifting_degrees || 45}도), ${layer.length_cm || 0}cm`
).join('\n') || '후대각섹션 1-5층 데이터 분석 필요'}
\`\`\`

### 볼륨 (Volume)
**볼륨 레벨**: ${params56.elevation_angle_degrees < 45 ? '로우(Low/0도~45도)' : params56.elevation_angle_degrees < 90 ? '미디움(Medium/45도~90도)' : '하이(High/90도 이상)'}

## 6. 질감처리 (Texturizing)
포인트 커트(Point Cut)를 이용하여 ${params56.texturizing_technique || '자연스러운 끝단 처리'} 효과를 적용합니다.

## 7. 스타일링 (Styling)
블로우 드라이 후 손가락을 이용하여 ${params56.styling_direction || '자연스러운 볼륨감'}을 연출합니다.

---
**📊 레시피 기반**: 42포뮬러 + 56파라미터 + Supabase 학습 ${recipesWithData.length}개`;

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
        { 
          role: 'user', 
          content: `**📸 업로드 이미지 분석 결과:**

42포뮬러:
${JSON.stringify(formula42, null, 2)}

56파라미터:
${JSON.stringify(params56, null, 2)}

${recipeExamples}

---

위 분석 결과와 Supabase 레시피들을 학습하여, **Supabase와 100% 동일한 구조의 42포뮬러 + 56파라미터 레시피**를 생성하세요.`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      stream: true  // ⭐ 스트리밍 활성화
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
