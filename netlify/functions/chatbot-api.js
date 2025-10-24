// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 56파라미터 기반 7섹션 레시피 완성 버전
// ✅ Gemini 길이 분석 정확도 개선 (신체 랜드마크 기반)

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

  // ========================================
  // 🔥 개선된 Gemini 프롬프트 (길이 판단 정확도 향상)
  // ========================================
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
  - 포함 스타일: 에어컷, 구름컷, 프릴컷, 그레이스컷, 레이컷

B Length (50cm): **가슴 상단~중간**
  - 머리카락 끝이 유두 높이 전후 (±5cm 이내)
  - 기준: 가슴 위쪽에서 중간 사이
  - **주의:** 쇄골 아래 5cm부터 가슴 중간까지
  - 포함 스타일: 엘리자벳컷, 허그컷, 샌드컷, 페미닌컷, 젤리컷, 스무스컷, 포그컷, 미스티컷, 허쉬컷

C Length (40cm): **쇄골 밑선**
  - 머리카락 끝이 쇄골뼈에 정확히 닿거나 바로 아래
  - 기준: 쇄골뼈 ±3cm 범위
  - 포함 스타일: 빌드컷

D Length (35cm): **어깨선**
  - 머리카락 끝이 어깨에 정확히 닿음
  - 기준: 어깨 뼈 위 (견봉 부위)
  - 포함 스타일: 플라워컷, 플리츠컷, 레이스컷

E Length (30cm): **어깨 위 5cm**
  - 머리카락 끝이 어깨보다 명확히 위
  - 기준: 어깨선 위 3-7cm
  - 포함 스타일: 타미컷, 벌룬컷

F Length (25cm): **턱 아래**
  - 머리카락 끝이 턱 밑 3-5cm
  - 기준: 턱선 아래 턱-어깨 사이
  - 포함 스타일: 클래식컷, 보니컷, 바그컷, 에그컷, 빌로우컷, 모즈컷

G Length (20cm): **턱선 (Jaw Line)**
  - 머리카락 끝이 턱 라인에 정확히 닿음
  - 기준: 턱뼈(jawline) 위치
  - 포함 스타일: 엘리스컷, 슬림컷, 브록컷, 리플컷

H Length (15cm): **귀 중간**
  - 숏헤어, 머리카락 끝이 귀 높이
  - 기준: 귀 아래 ~ 턱선 사이
  - 포함 스타일: 코튼컷, 이지컷, 본컷, 듀컷, 풀컷, 다이앤컷, 리프컷

**판단 방법 (우선순위대로 확인):**
1. **어깨선 확인**: 
   - 어깨보다 아래 → A/B/C/D 중 하나
   - 어깨보다 위 → E/F/G/H 중 하나

2. **쇄골 확인** (어깨 아래인 경우):
   - 쇄골에 닿음 → **C Length**
   - 쇄골 아래 ~ 가슴 중간 → **B Length**
   - 가슴 중간 아래 → **A Length**

3. **턱/귀 확인** (어깨 위인 경우):
   - 턱에 닿음 → **G Length**
   - 턱 아래 ~ 어깨 위 → **E 또는 F Length**
   - 귀 높이 → **H Length**

4. **애매한 경우 규칙**:
   - 두 길이 중간이면 → **더 긴 쪽 선택**
   - 예: B와 C 사이 → **B Length** 선택
   - 예: C와 D 사이 → **C Length** 선택

### Men's Cut Categories (해당 시)
- Side Fringe / Side Part / Fringe Up / Pushed Back / Buzz / Crop / Mohican

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

**중요: JSON 출력 시 절대 규칙**
- womens_cut_category 필드 생성 금지 (스타일명은 포함하지 말것)
- length_category만 A~H Length 형식으로 출력

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
- ✅ 머리카락 끝이 쇄골 위치인가? → C Length
- ✅ 머리카락 끝이 가슴 중간인가? → B Length
- ✅ 머리카락 끝이 가슴 아래인가? → A Length
- ✅ 애매하면 더 긴 쪽 선택
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
            temperature: 0.3,  // 낮춰서 더 정확하게
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

    console.log('✅ Gemini 분석 완료:', params56.length_category, params56.estimated_hair_length_cm + 'cm');

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
STEP1. 스타일 설명: [이 스타일의 전체적인 이미지와 특징을 2-3문장으로 설명]

STEP2. 스타일 길이(Style Length): 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm, ${getLengthDescription(params56.length_category)})**
- 롱(Long): A Length (65cm, 가슴 아래), B Length (50cm, 가슴 중간), C Length (40cm, 쇄골)
- 미디움(Medium): D Length (35cm, 어깨), E Length (30cm, 어깨 위), F Length (25cm, 턱 아래), G Length (20cm, 턱선)
- 숏(Short): H Length (15cm, 귀 중간)

STEP3. 스타일 형태(Style Form): 
**${params56.cut_form} (${getFormDescription(params56.cut_form)})**
- O (One Length, 원렝스 - 모든 머리카락이 같은 길이)
- G (Graduation, 그래쥬에이션 - 아래가 길고 위로 갈수록 짧아짐)
- L (Layer, 레이어 - 층을 두어 자르는 기법)
- C (Combination, 복합 - 여러 기법 혼합)

STEP4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type} (${getFringeTypeDescription(params56.fringe_type)}) - ${params56.fringe_length} (${getFringeLengthDescription(params56.fringe_length)})**
- 타입: Full Bang (전체 앞머리), See-through Bang (시스루 앞머리), Side Bang (옆으로 넘긴 앞머리), No Fringe (앞머리 없음)
- 길이: Forehead (이마), Eyebrow (눈썹), Eye (눈), Cheekbone (광대), Lip (입술), Chin (턱), None (없음)

STEP5. 베이스 커트(Base Cut)
**인터널(Internal) 진행:**
A 존(A Zone, 귀 아래-목 부위): [구체적 시술 내용]
B 존(B Zone, 귀 위 중단 부위): [구체적 시술 내용]

**엑스터널(External) 진행:**
C 존(C Zone, 정수리 상단 부위): [구체적 시술 내용]

**다이렉션(Direction, 커트 방향)**: ${params56.direction_primary || 'D0'} (${getDirectionDescription(params56.direction_primary || 'D0')})
- D0 (정면, 0도), D1 (우측전방, 45도), D2 (우측측면, 90도), D3 (우측후방, 135도)
- D4 (정후방, 180도), D5 (좌측후방, 225도), D6 (좌측측면, 270도), D7 (좌측전방, 315도), D8 (전체, 360도)

**섹션(Section, 분할 방식)**: ${params56.section_primary} (${getSectionDescription(params56.section_primary)})
- Horizontal (가로 섹션, 수평 분할), Vertical (세로 섹션, 수직 분할)
- Diagonal Forward (전대각 섹션, 앞쪽 대각선), Diagonal Backward (후대각 섹션, 뒤쪽 대각선)

**리프팅(Lifting, 들어올리는 각도)**: ${(params56.lifting_range || []).map(l => `${l} (${getLiftingDescription(l)})`).join(', ')}
- L0 (0도, 자연낙하), L1 (22.5도), L2 (45도, 대각선), L3 (67.5도)
- L4 (90도, 수평), L5 (112.5도), L6 (135도, 대각선 위), L7 (157.5도), L8 (180도, 수직)

**아웃라인(Outline, 외곽선 설정)**: ${params56.length_category}
- A~H 라인 중 해당 길이에 맞춰 외곽선 설정

**볼륨(Volume, 볼륨 위치)**: ${params56.volume_zone} (${getVolumeDescription(params56.volume_zone)})
- Low (낮은 볼륨, 0도~45도, 하단에 무게감)
- Medium (중간 볼륨, 45도~90도, 중단에 볼륨)
- High (높은 볼륨, 90도 이상, 상단에 볼륨)

STEP6. 질감처리(Texturizing): 
[포인트 커트 (Point Cut, 끝을 잘게 자르기), 슬라이드 커트 (Slide Cut, 미끄러지듯 자르기) 등 구체적인 텍스처 기법을 상세히 기술]

STEP7. 스타일링(Styling): 
[블로우 드라이 (Blow Dry, 드라이기 사용), 아이롱 (Iron, 고데기), 스타일링 제품 사용법 등을 구체적으로 기술]

**절대 포함 금지 사항:**
- ❌ 스타일명 (엘리자벳컷, 엘리스컷 등의 고유명사)
- ❌ "예상길이 XX cm" 같은 중복 수치
- ❌ "인크리스 레이어", "디크리스 레이어" 같은 불필요 용어
- ❌ "컷 셰이프" 같은 중복 설명

**반드시 포함해야 할 사항:**
- ✅ 모든 파라미터에 괄호로 설명 추가
- ✅ STEP1~STEP7 형식 사용
- ✅ D0~D8, L0~L8 각도 표기 시 괄호로 의미 설명
- ✅ A/B/C 존 구분
- ✅ 구체적인 시술 방법
`;

    // 설명 함수들
    function getLengthDescription(length) {
      const desc = {
        'A Length': '가슴 아래 밑선, 매우 긴 머리',
        'B Length': '가슴 상단~중간, 긴 머리',
        'C Length': '쇄골 밑선',
        'D Length': '어깨선에 닿는 길이',
        'E Length': '어깨 위 5cm',
        'F Length': '턱선 아래',
        'G Length': '턱선, Jaw 라인',
        'H Length': '귀 중간, 숏헤어'
      };
      return desc[length] || '미분류 길이';
    }

    function getFormDescription(form) {
      const desc = {
        'O (One Length)': '원렝스, 모든 머리카락이 같은 길이',
        'G (Graduation)': '그래쥬에이션, 아래가 길고 위로 갈수록 짧음',
        'L (Layer)': '레이어, 층을 두어 자르는 기법',
        'C (Combination)': '복합, 여러 기법 혼합'
      };
      return desc[form] || form?.replace(/[OGLCoглc]\s*\(([^)]+)\)/, '$1') || '미분류';
    }

    function getFringeTypeDescription(type) {
      const desc = {
        'Full Bang': '전체 앞머리, 이마를 완전히 덮음',
        'See-through Bang': '시스루 앞머리, 비치는 앞머리',
        'Side Bang': '옆으로 넘긴 앞머리',
        'No Fringe': '앞머리 없음'
      };
      return desc[type] || '미분류 앞머리';
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
      return desc[length] || '미분류 길이';
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
      return desc[dir] || '미분류 방향';
    }

    function getSectionDescription(section) {
      const desc = {
        'Horizontal': '가로 섹션, 수평으로 분할',
        'Vertical': '세로 섹션, 수직으로 분할',
        'Diagonal Forward': '전대각 섹션, 앞쪽 대각선',
        'Diagonal Backward': '후대각 섹션, 뒤쪽 대각선'
      };
      return desc[section] || '미분류 섹션';
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
      const desc = {
        'Low': '낮은 볼륨, 하단에 무게감',
        'Medium': '중간 볼륨, 중단에 볼륨',
        'High': '높은 볼륨, 상단에 볼륨'
      };
      return desc[volume] || '미분류 볼륨';
    }

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

참고할 유사 스타일:
${similarStyles.slice(0, 3).map(s => `- ${s.name}: ${s.description || '설명 없음'}`).join('\n')}

위 형식을 정확히 따라서 ###1부터 ###7까지 순서대로 작성해주세요.`;

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

# 필수 출력 형식 (절대 변경 금지)

<커트 레시피>
STEP1. 스타일 설명: [이 스타일의 전체적인 이미지와 특징을 2-3문장으로 설명]

STEP2. 스타일 길이(Style Length): 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. 스타일 형태(Style Form): 
**${params56.cut_form}**

STEP4. 앞머리 길이(Fringe Length): 
**${params56.fringe_type} - ${params56.fringe_length}**

STEP5. 베이스 커트(Base Cut)
**인터널(Internal) 진행:**
A 존(A Zone, 귀 아래-목 부위): [시술 내용]
B 존(B Zone, 귀 위 중단 부위): [시술 내용]

**엑스터널(External) 진행:**
C 존(C Zone, 정수리 상단 부위): [시술 내용]

**다이렉션(Direction, 커트 방향)**: ${params56.direction_primary || 'D0'}
**섹션(Section, 분할 방식)**: ${params56.section_primary}
**리프팅(Lifting, 들어올리는 각도)**: ${(params56.lifting_range || []).join(', ')}
**볼륨(Volume, 볼륨 위치)**: ${params56.volume_zone}

STEP6. 질감처리(Texturizing): 
[구체적인 텍스처 기법 기술]

STEP7. 스타일링(Styling): 
[구체적인 스타일링 방법 기술]

**주의: 모든 파라미터에 괄호로 설명을 추가하세요 (예: D0 (정면, 0도), L4 (90도, 수평))**
`;

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

위 형식을 정확히 따라서 ###1부터 ###7까지 순서대로 작성해주세요.`;

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
        stream: false  // Netlify Functions에서는 스트리밍 대신 일반 응답
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
