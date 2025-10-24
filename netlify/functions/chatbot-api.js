// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 56파라미터 기반 7섹션 레시피 완성 버전
// ✅ Cut Form: O/G/L 3개만 (Combination 완전 제거)
// ✅ Volume: 엄격한 기준 (Low: 0~44°, Medium: 45~89°, High: 90°~)
// ✅ 리프팅 각도 → 볼륨 자동 매핑

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

### Women's Cut Length Categories (매우 중요 - 신체 랜드마크 기준)

**길이 분류 - 이미지에서 머리카락 끝이 신체 어느 부위에 닿는지 정확히 확인:**

A Length (65cm): **가슴 아래 밑선**
  - 머리카락 끝이 가슴보다 확실히 아래, 배꼽 근처
  - 기준: 유두보다 최소 10cm 이상 아래

B Length (50cm): **가슴 상단~중간**
  - 머리카락 끝이 유두 높이 전후 (±5cm 이내)
  - 기준: 가슴 위쪽에서 중간 사이
  - **주의:** 쇄골 아래 5cm부터 가슴 중간까지

C Length (40cm): **쇄골 밑선**
  - 머리카락 끝이 쇄골뼈에 정확히 닿거나 바로 아래
  - 기준: 쇄골뼈 ±3cm 범위

D Length (35cm): **어깨선**
  - 머리카락 끝이 **어깨에 정확히 닿음**
  - **핵심 판단 기준: 어깨선과 머리카락이 맞닿음** ← 중요!
  - 목 전체가 보이고, 어깨 시작 부분에 닿음
  - 쇄골과 어깨 사이 거리 있음

**🔥 D vs E vs F vs G 구분 (가장 헷갈리는 부분! 어깨 기준으로 판단)**

E Length (30cm): **어깨 바로 위**
  - 머리카락 끝이 어깨선 위 2-3cm
  - **핵심 판단 기준: 어깨와 머리카락 사이 공간 있음** ← 중요!
  - 목 전체 + 어깨 시작 부분 모두 보임
  - 어깨에 닿지 않음

F Length (25cm): **턱선 바로 밑**
  - 머리카락 끝이 턱뼈 아래
  - **핵심 판단 기준: 목 상단만 보임, 목 중간까지 머리카락** ← 중요!
  - 어깨와 상당한 거리 있음 (5cm 이상)
  - 턱에서 목으로 넘어가는 지점

G Length (20cm): **턱선 (Jaw Line)**
  - 머리카락 끝이 턱뼈 각도 라인
  - **핵심 판단 기준: 목이 거의 안 보임** ← 중요!
  - 턱선 바로 아래
  - 얼굴 윤곽선 따라감

H Length (15cm): **귀 중간**
  - 숏헤어, 머리카락 끝이 귀 높이
  - 기준: 귀 아래 ~ 턱선 사이

**판단 방법 (우선순위대로 확인):**
1. **어깨선 확인** (가장 먼저!): 
   - **머리카락이 어깨에 닿음** → **D Length**
   - 어깨보다 아래 → A/B/C 중 하나
   - 어깨보다 위 (공간 있음) → E/F/G/H 중 하나

2. **쇄골 확인** (어깨 아래인 경우):
   - 쇄골에 닿음 → **C Length**
   - 쇄골 아래 ~ 가슴 중간 → **B Length**
   - 가슴 중간 아래 → **A Length**

3. **목 노출 정도 확인** (어깨 위인 경우) ← 중요!:
   - **목 전체 보임 + 어깨와 공간** → **E Length**
   - **목 상단만 보임** (턱 아래 일부만) → **F Length**
   - **목 거의 안 보임** (턱선에 가려짐) → **G Length**
   - 귀 높이 → **H Length**

4. **애매한 경우 규칙**:
   - D와 E 사이: 어깨에 닿는가?
     → 살짝이라도 닿음 = D, 공간 있음 = E
   - E와 F 사이: 목이 얼마나 보이는가? 
     → 목 전체 보임 = E, 일부만 = F
   - F와 G 사이: 목이 보이는가?
     → 목 조금이라도 보임 = F, 거의 안 보임 = G
   - 두 길이 중간이면 → **더 긴 쪽 선택**

### Men's Cut Categories (해당 시)
- Side Fringe / Side Part / Fringe Up / Pushed Back / Buzz / Crop / Mohican

### 스타일 형태 (Cut Form) - 반드시 3가지 중 하나만 선택
**⚠️ 중요: O, G, L 중 하나만 선택하세요. Combination(C)은 절대 사용 금지**

- **O (One Length, 원렝스)**: 모든 머리카락이 같은 길이로 떨어지는 형태
  → 머리카락 끝이 일직선, 층이 없음
  
- **G (Graduation, 그래쥬에이션)**: 외곽이 짧고 내부가 긴 층, 무게감이 하단
  → 뒤에서 보면 삼각형 모양, 아래가 무거움
  
- **L (Layer, 레이어)**: 층을 두어 자르는 기법, 전체적인 볼륨과 움직임
  → 여러 층으로 나뉘어져 있음, 가벼운 느낌

**선택 가이드:**
- 끝이 일직선, 층 없음 → **O**
- 아래가 무겁고 위가 가벼움 → **G**
- 전체적으로 층이 많음 → **L**

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

**중요: JSON 출력 시 절대 규칙**
- womens_cut_category 필드 생성 금지 (스타일명은 포함하지 말것)
- length_category만 A~H Length 형식으로 출력
- cut_form은 O, G, L 중 하나만 (C 사용 금지)

**출력 형식 (JSON만):**
\`\`\`json
{
  "cut_category": "Women's Cut",
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
  "direction_primary": "D0"
}
\`\`\`

**재확인 체크리스트:**
- ✅ **머리카락이 어깨에 닿는가? → D Length**
- ✅ 머리카락 끝이 쇄골 위치인가? → C Length
- ✅ 머리카락 끝이 가슴 중간인가? → B Length
- ✅ 머리카락 끝이 가슴 아래인가? → A Length
- ✅ **목 전체 보이고 어깨와 공간 있는가? → E Length**
- ✅ **목 상단만 보이고 턱 아래인가? → F Length**
- ✅ **목이 거의 안 보이고 턱선인가? → G Length**
- ✅ 애매하면 더 긴 쪽 선택
- ✅ cut_form은 O/G/L만 사용 (C 금지)
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
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
            temperature: 0.3,
            topP: 0.95,
            topK: 40,
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

    // womens_cut_category 필드가 있으면 제거
    if (params56.womens_cut_category) {
      delete params56.womens_cut_category;
    }

    // Cut Form에서 C (Combination) 제거 - L로 기본 변경
    if (params56.cut_form && params56.cut_form.startsWith('C')) {
      params56.cut_form = 'L (Layer)';
      console.log('⚠️ Cut Form "C" 감지 → "L (Layer)"로 자동 변경');
    }

    // ⚠️ CRITICAL: Cut Form 괄호 강제 추가!
    if (params56.cut_form && !params56.cut_form.includes('(')) {
      const formChar = params56.cut_form.charAt(0).toUpperCase();
      const formMap = {
        'O': 'O (One Length)',
        'G': 'G (Graduation)',
        'L': 'L (Layer)'
      };
      params56.cut_form = formMap[formChar] || 'L (Layer)';
      console.log('✅ Cut Form 괄호 자동 추가:', params56.cut_form);
    }

    // 리프팅 각도 → 볼륨 자동 매핑 (엄격한 기준)
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      params56.volume_zone = calculateVolumeFromLifting(maxLifting);
    }

    console.log('✅ Gemini 분석 완료:', params56.length_category, params56.estimated_hair_length_cm + 'cm', params56.cut_form, params56.volume_zone);

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

// 리프팅 각도 → 볼륨 자동 계산 (엄격한 기준)
function calculateVolumeFromLifting(liftingCode) {
  const angles = {
    'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5,
    'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
  };
  
  const angle = angles[liftingCode] || 0;
  
  if (angle < 45) return 'Low';      // 0~44° (L0, L1)
  if (angle < 90) return 'Medium';   // 45~89° (L2, L3)
  return 'High';                      // 90°~ (L4, L5, L6, L7, L8)
}

// ==================== 2단계: 레시피 생성 (56파라미터 → 7섹션 구조) ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56 } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56);

    // 벡터 검색으로 유사 스타일 찾기
    const searchQuery = `${params56.length_category || ''} ${params56.structure_layer || ''} ${params56.cut_form || ''}`;
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
STEP1. 스타일 설명: 
**⚠️ 반드시 아래 "참고할 유사 스타일 설명"을 활용하여 2-3문장으로 작성**
- 유사 스타일의 특징을 분석하여 자연스럽게 재작성
- 원문을 그대로 복사하지 말고, 핵심 특징을 조합하여 새롭게 표현

STEP2. 스타일 길이(Style Length): 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm, ${getLengthDescription(params56.length_category)})**

STEP3. 스타일 형태(Style Form): 
**⚠️ CRITICAL: 반드시 O/G/L 중 하나와 괄호 안에 풀네임 표기**
- O (One Length): 원렝스, 모든 머리카락이 같은 길이
- G (Graduation): 그래쥬에이션, 외곽이 짧고 내부가 긴 층
- L (Layer): 레이어, 층을 두어 자르는 기법
**형식: ${params56.cut_form} (${getFormDescription(params56.cut_form)})**

STEP4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type} (${getFringeTypeDescription(params56.fringe_type)}) - ${params56.fringe_length} (${getFringeLengthDescription(params56.fringe_length)})**

STEP5. 베이스 커트(Base Cut)
**인터널(Internal) 진행:**
A 존(A Zone, 귀 아래-목 부위): [구체적 시술 내용]
B 존(B Zone, 귀 위 중단 부위): [구체적 시술 내용]

**엑스터널(External) 진행:**
C 존(C Zone, 정수리 상단 부위): [구체적 시술 내용]

**다이렉션(Direction, 커트 방향)**: ${params56.direction_primary || 'D0'} (${getDirectionDescription(params56.direction_primary || 'D0')})

**섹션(Section, 분할 방식)**: ${params56.section_primary} (${getSectionDescription(params56.section_primary)})

**리프팅(Lifting, 들어올리는 각도)**: ${(params56.lifting_range || []).map(l => `${l} (${getLiftingDescription(l)})`).join(', ')}

**아웃라인(Outline, 외곽선 설정)**: ${params56.length_category}

**볼륨(Volume, 볼륨 위치)**: ${params56.volume_zone} (${getVolumeDescription(params56.volume_zone)})

STEP6. 질감처리(Texturizing): 
[포인트 커트 (Point Cut), 슬라이드 커트 (Slide Cut) 등 구체적인 텍스처 기법을 상세히 기술]

STEP7. 스타일링(Styling): 
[블로우 드라이 (Blow Dry), 아이론 스타일링 등 구체적인 스타일링 방법과 제품 사용법을 상세히 기술]

# 절대 포함하지 말 것
❌ 스타일명 (엘리자벳컷, 허그컷 등 고유명사)
❌ 예상길이 중복 설명
❌ 인크리스 레이어
❌ 컷 셰이프

# 반드시 포함할 것
✅ 각 STEP 번호 명확히 표시
✅ 괄호 안에 한글 설명 포함
✅ A/B/C 존 각각 구체적 시술 내용
✅ 리프팅 각도와 볼륨 위치의 논리적 일치

`;

    function getLengthDescription(length) {
      const desc = {
        'A Length': '가슴 아래 밑선, 긴 머리',
        'B Length': '가슴 상단~중간, 긴 머리',
        'C Length': '쇄골 밑선, 긴 머리',
        'D Length': '어깨선, 미디움 머리',
        'E Length': '어깨 위 5cm, 미디움 머리',
        'F Length': '턱 아래, 미디움 머리',
        'G Length': '턱선, 짧은 머리',
        'H Length': '귀 중간, 숏헤어'
      };
      return desc[length] || '미분류 길이';
    }

    function getFormDescription(form) {
      // C (Combination) 제거, O/G/L만 허용
      if (!form) return '미분류 형태';
      const firstChar = form.charAt(0).toUpperCase();
      const desc = {
        'O': 'One Length, 원렝스 - 모든 머리카락이 같은 길이',
        'G': 'Graduation, 그래쥬에이션 - 외곽이 짧고 내부가 긴 층',
        'L': 'Layer, 레이어 - 층을 두어 자르는 기법'
      };
      return desc[firstChar] || 'Layer, 레이어 - 층을 두어 자르는 기법';
    }

    function getFringeTypeDescription(type) {
      const desc = {
        'Full Bang': '전체 앞머리, 이마를 완전히 덮음',
        'See-through Bang': '시스루 앞머리, 이마가 비침',
        'Side Bang': '옆으로 넘긴 앞머리',
        'No Fringe': '앞머리 없음'
      };
      return desc[type] || '앞머리 형태 미분류';
    }

    function getFringeLengthDescription(length) {
      const desc = {
        'Forehead': '이마 길이',
        'Eyebrow': '눈썹 길이',
        'Eye': '눈 길이',
        'Cheekbone': '광대 길이',
        'Lip': '입술 길이',
        'Chin': '턱 길이',
        'None': '없음'
      };
      return desc[length] || '길이 미분류';
    }

    function getDirectionDescription(dir) {
      const desc = {
        'D0': '정면 방향, 0도',
        'D1': '우측 전방, 45도',
        'D2': '우측 측면, 90도',
        'D3': '우측 후방, 135도',
        'D4': '정후방, 180도',
        'D5': '좌측 후방, 225도',
        'D6': '좌측 측면, 270도',
        'D7': '좌측 전방, 315도',
        'D8': '전체 방향, 360도'
      };
      return desc[dir] || '방향 미분류';
    }

    function getSectionDescription(section) {
      const desc = {
        'Horizontal': '가로 섹션, 수평 분할',
        'Vertical': '세로 섹션, 수직 분할',
        'Diagonal Forward': '전대각 섹션, 앞쪽 대각선',
        'Diagonal Backward': '후대각 섹션, 뒤쪽 대각선'
      };
      return desc[section] || '섹션 미분류';
    }

    function getLiftingDescription(lift) {
      const desc = {
        'L0': '0도, 자연낙하',
        'L1': '22.5도, 낮은 각도',
        'L2': '45도, 대각선',
        'L3': '67.5도, 중간 각도',
        'L4': '90도, 수평',
        'L5': '112.5도, 중상 각도',
        'L6': '135도, 대각선 위',
        'L7': '157.5도, 높은 각도',
        'L8': '180도, 수직'
      };
      return desc[lift] || '미분류 각도';
    }

    function getVolumeDescription(volume) {
      // 엄격한 기준 명시
      const desc = {
        'Low': '하단 볼륨 (0~44도, L0~L1)',
        'Medium': '중단 볼륨 (45~89도, L2~L3)',
        'High': '상단 볼륨 (90도 이상, L4~L8)'
      };
      return desc[volume] || '미분류 볼륨';
    }

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

참고할 유사 스타일:
${similarStyles.slice(0, 3).map(s => `- ${s.name}: ${s.description || '설명 없음'}`).join('\n')}

**⚠️ 중요: STEP3 작성 규칙**
- Cut Form은 반드시 "X (Full Name)" 형식으로 작성
- 예: L (Layer), G (Graduation), O (One Length)
- 절대 "L"만 쓰지 말 것!

위 형식을 정확히 따라서 STEP1부터 STEP7까지 순서대로 작성해주세요.`;

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const gptData = await completion.json();
    const recipe = gptData.choices[0].message.content;

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

// ==================== 2-2단계: 스트리밍 레시피 생성 ====================
async function generateRecipeStream(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56 } = payload;

  try {
    console.log('🍳 스트리밍 레시피 생성 시작:', params56);

    const searchQuery = `${params56.length_category || ''} ${params56.structure_layer || ''} ${params56.cut_form || ''}`;
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    const systemPrompt = `당신은 HAIRGATOR 시스템 전문가입니다.
다음 56파라미터를 바탕으로 **정확히 아래 형식**으로 커트 레시피를 작성하세요.

# 필수 출력 형식

<커트 레시피>
STEP1. 스타일 설명: [2-3문장]

STEP2. 스타일 길이(Style Length): 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. 스타일 형태(Style Form): 
**⚠️ CRITICAL: 반드시 괄호 안에 풀네임 포함!**
**예: L (Layer), G (Graduation), O (One Length)**
**형식: ${params56.cut_form}**

STEP4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type} - ${params56.fringe_length}**

STEP5. 베이스 커트(Base Cut)
**인터널 진행:**
A 존: [시술 내용]
B 존: [시술 내용]

**엑스터널 진행:**
C 존: [시술 내용]

**다이렉션**: ${params56.direction_primary || 'D0'}
**섹션**: ${params56.section_primary}
**리프팅**: ${(params56.lifting_range || []).join(', ')}
**볼륨**: ${params56.volume_zone}

STEP6. 질감처리(Texturizing): [내용]

STEP7. 스타일링(Styling): [내용]

# 금지사항
❌ 스타일명, 예상길이 중복, 인크리스 레이어, 컷 셰이프
`;

    const userPrompt = `파라미터:
${JSON.stringify(params56, null, 2)}

# 참고할 유사 스타일 정보 (Supabase RAG 데이터):

${similarStyles.slice(0, 3).map((s, idx) => `
## 유사 스타일 ${idx + 1}: ${s.name || s.code}

**스타일 설명 (STEP1 참고용):**
${s.style_introduction || s.description || '정보 없음'}

**관리법 (STEP7 참고용):**
${s.management || s.styling || '정보 없음'}

**이미지 분석 (추가 참고):**
${s.image_analysis || s.analysis || '정보 없음'}
`).join('\n---\n')}

**작성 지침:**
1. STEP1은 위 "스타일 설명"들을 참고하여 새롭게 작성
2. STEP7은 위 "관리법"들을 참고하여 구체적으로 작성
3. **STEP3는 반드시 "X (Full Name)" 형식: L (Layer), G (Graduation), O (One Length)**
4. 단순 복사 금지 - 핵심 특징을 조합하여 자연스럽게 표현
`;

    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        stream: false
      })
    });

    const data = await streamResponse.json();
    const fullRecipe = data.choices[0].message.content;

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
