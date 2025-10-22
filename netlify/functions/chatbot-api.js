// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 상세 커트 레시피 최종 버전

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

// ==================== 언어 감지 ====================
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

// ==================== 1단계: 이미지 분석 (Gemini) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 업로드된 헤어스타일 이미지를 분석하고, 56개 파라미터를 빠짐없이 추출하세요.

**56개 파라미터 전체 (NULL 허용):**
{
  // === 기본 분류 (6개) ===
  "cut_category": "Women's Cut" | "Men's Cut",
  "womens_cut_length": "A (가슴 아래)" | "B (가슴-쇄골 중간)" | "C (쇄골라인)" | "D (어깨 닿는 선)" | "E (어깨 바로 위)" | "F (턱선 바로 밑)" | "G (Jaw 라인)" | "H (숏헤어)" | null,
  "womens_cut_category": "허그컷" | "에어컷" | "구름컷" | "프릴컷" | "그레이스컷" | "레이컷" | "엘리자벳컷" | "샌드컷" | "페미닌컷" | "젤리컷" | "스무스컷" | "포그컷" | "미스티컷" | "허쉬컷" | "빌드컷" | "플라워컷" | "플리츠컷" | "레이스컷" | "타미컷" | "벌룬컷" | "클래식컷" | "보니컷" | "바그컷" | "에그컷" | "빌로우컷" | "모즈컷" | "엘리스컷" | "슬림컷" | "브록컷" | "리플컷" | "코튼컷" | "이지컷" | "본컷" | "듀컷" | "플컷" | "다이앤컷" | "리프컷" | null,
  "mens_cut_category": "투블럭" | "시저컷" | "페이드컷" | "언더컷" | "크롭컷" | null,
  "estimated_hair_length_cm": 0,
  "gender": "Female" | "Male" | "Unisex",

  // === 컷 형태 & 구조 (8개) ===
  "cut_form": "S (Solid)" | "G (Graduation)" | "I (Increase Layer)" | "L (Layer)" | null,
  "weight_flow": "Forward Weighted" | "Backward Weighted" | "Evenly Distributed" | null,
  "structure_layer": "One Length" | "Graduated Layer" | "Uniform Layer" | "Increase Layer" | null,
  "fringe_type": "Full Fringe" | "Side Bang" | "Curtain Bang" | "Micro Bang" | "See-Through Bang" | "No Fringe" | null,
  "fringe_length": "Eyebrow" | "Eye Level" | "Nose" | "Chin" | "None" | null,
  "perimeter_line": "Blunt" | "Point Cut" | "Slide Cut" | "Round" | null,
  "outline_shape": "Round" | "Square" | "Oval" | "Triangle" | null,
  "nape_treatment": "Tapered" | "Blocked" | "Natural" | null,

  // === 길이 & 볼륨 (7개) ===
  "top_section_length_cm": 0,
  "side_section_length_cm": 0,
  "back_section_length_cm": 0,
  "crown_height": "High" | "Medium" | "Low" | null,
  "volume_placement": "Top" | "Crown" | "Sides" | "Back" | "Even" | null,
  "silhouette": "Round" | "Oval" | "Diamond" | "Square" | null,
  "shape_emphasis": "Volume" | "Texture" | "Movement" | null,

  // === 텍스처 & 마감 (9개) ===
  "hair_texture": "Fine" | "Medium" | "Coarse" | null,
  "hair_density": "Thin" | "Medium" | "Thick" | null,
  "natural_texture": "Straight" | "Wavy" | "Curly" | "Coily" | null,
  "texturizing_technique": "Point Cut" | "Slide Cut" | "Thinning Shears" | "Razor" | "None" | null,
  "finish_look": "Sleek" | "Textured" | "Tousled" | "Polished" | null,
  "interior_texture": "Heavy" | "Light" | "Moderate" | null,
  "end_texture": "Blunt" | "Feathered" | "Choppy" | null,
  "surface_treatment": "Smooth" | "Choppy" | "Layered" | null,
  "detailing": "Razor Detail" | "Point Cut Detail" | "None" | null,

  // === 스타일링 & 방향 (8개) ===
  "styling_direction": "Forward" | "Backward" | "Side" | "Mixed" | null,
  "parting": "Center" | "Side" | "No Part" | "Zigzag" | null,
  "styling_method": "Blow Dry" | "Air Dry" | "Iron" | "Diffuse" | null,
  "movement_direction": "Forward" | "Outward" | "Inward" | "Mixed" | null,
  "face_framing": "Strong" | "Soft" | "None" | null,
  "styling_product": "Light" | "Medium" | "Heavy" | "None" | null,
  "maintenance_level": "Low" | "Medium" | "High" | null,
  "versatility": "High" | "Medium" | "Low" | null,

  // === 컬러 & 톤 (5개) ===
  "color_level": "Level 1" | "Level 2" | "Level 3" | "Level 4" | "Level 5" | "Level 6" | "Level 7" | "Level 8" | "Level 9" | "Level 10" | null,
  "color_tone": "Warm" | "Cool" | "Neutral" | "Ash" | null,
  "color_technique": "Single Process" | "Highlights" | "Balayage" | "Ombre" | "None" | null,
  "dimension": "High" | "Medium" | "Low" | "None" | null,
  "root_shadow": "Yes" | "No" | null,

  // === 디자인 & 특수 기법 (7개) ===
  "design_emphasis": "Shape Emphasis" | "Color Emphasis" | "Texture Emphasis" | "Balanced" | null,
  "disconnection": "Yes" | "No" | null,
  "undercut_presence": "Yes" | "No" | null,
  "graduation_angle": "Low (0-45°)" | "Medium (45-90°)" | "High (90°+)" | null,
  "elevation_angle": "0°" | "45°" | "90°" | "180°" | null,
  "cutting_angle": "Horizontal" | "Vertical" | "Diagonal" | null,
  "section_pattern": "Horizontal" | "Vertical" | "Radial" | "Diagonal" | null,

  // === 메타 정보 (6개) ===
  "confidence_score": 0.85,
  "difficulty_level": "초급" | "중급" | "고급" | "마스터",
  "estimated_time_minutes": 0,
  "face_shape_match": "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "All",
  "age_suitability": "10대" | "20대" | "30대" | "40대" | "50대+" | "전연령",
  "occasion": "Daily" | "Professional" | "Formal" | "Casual"
}

**여성 컷 길이 분류 (A~H):**
- A: 가슴 아래 밑선
- B: 가슴-쇄골 중간
- C: 쇄골라인 밑선
- D: 어깨에 닿는 선
- E: 어깨 바로 위
- F: 턱선 바로 밑
- G: Jaw 라인
- H: 숏헤어

**중요**: 
1. 56개 파라미터 모두 포함
2. womens_cut_length는 A~H 중 반드시 선택
3. 확인 불가능하면 null
4. JSON만 출력`;

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
    const errorData = await response.json();
    console.error('Gemini API Error:', errorData);
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

// ==================== 2-4단계: 파라미터 기반 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { analysis_result } = payload;

  console.log('레시피 생성 시작:', analysis_result);

  const searchQuery = createSearchQueryFromParams(analysis_result);
  console.log('생성된 검색 쿼리:', searchQuery);

  const similarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey);
  console.log(`찾은 유사 스타일: ${similarStyles.length}개`);

  const recipe = await generateCutRecipe(analysis_result, similarStyles, openaiKey);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: {
        recipe: recipe,
        similar_styles_count: similarStyles.length,
        parameters_used: Object.keys(analysis_result).filter(k => analysis_result[k] !== null).length
      }
    })
  };
}

// ==================== 파라미터 → 검색 쿼리 변환 ====================
function createSearchQueryFromParams(params) {
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

  if (params.structure_layer) {
    keywords.push(params.structure_layer.replace(' Layer', ''));
  }

  if (params.fringe_type && params.fringe_type !== 'No Fringe') {
    keywords.push('앞머리');
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

    if (!embeddingResponse.ok) {
      throw new Error('OpenAI embedding failed');
    }

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
      console.log('벡터 검색 실패, 직접 검색으로 전환');
      return await directTableSearch(supabaseUrl, supabaseKey, 5);
    }

    const results = await supabaseResponse.json();
    return results || [];

  } catch (error) {
    console.error('검색 오류:', error);
    return await directTableSearch(supabaseUrl, supabaseKey, 5);
  }
}

// ==================== 대체 검색 ====================
async function directTableSearch(supabaseUrl, supabaseKey, limit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/hairstyles?select=id,code,name,description,image_url,recipe&limit=${limit}`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

// ==================== GPT 레시피 생성 (⭐ 상세 버전) ====================
async function generateCutRecipe(params, similarStyles, openaiKey) {
  
  // 파라미터 요약
  const paramsSummary = `
**📊 분석된 56개 파라미터:**

=== 기본 분류 ===
- 컷 카테고리: ${params.cut_category || 'null'}
- 여성 컷 길이: ${params.womens_cut_length || 'null'}
- 여성 컷 스타일: ${params.womens_cut_category || 'null'}
- 남성 컷: ${params.mens_cut_category || 'null'}
- 예상 길이: ${params.estimated_hair_length_cm || 0}cm
- 성별: ${params.gender || 'null'}

=== 컷 형태 & 구조 ===
- 컷 형태: ${params.cut_form || 'null'}
- 무게감: ${params.weight_flow || 'null'}
- 레이어 구조: ${params.structure_layer || 'null'}
- 앞머리 타입: ${params.fringe_type || 'null'}
- 앞머리 길이: ${params.fringe_length || 'null'}
- 끝선 처리: ${params.perimeter_line || 'null'}
- 윤곽 형태: ${params.outline_shape || 'null'}
- 넵 처리: ${params.nape_treatment || 'null'}

=== 길이 & 볼륨 ===
- 탑 섹션: ${params.top_section_length_cm || 0}cm
- 사이드 섹션: ${params.side_section_length_cm || 0}cm
- 백 섹션: ${params.back_section_length_cm || 0}cm
- 크라운 높이: ${params.crown_height || 'null'}
- 볼륨 위치: ${params.volume_placement || 'null'}
- 실루엣: ${params.silhouette || 'null'}
- 형태 강조: ${params.shape_emphasis || 'null'}

=== 텍스처 & 마감 ===
- 모질: ${params.hair_texture || 'null'}
- 모발 밀도: ${params.hair_density || 'null'}
- 자연 텍스처: ${params.natural_texture || 'null'}
- 텍스처라이징 기법: ${params.texturizing_technique || 'null'}
- 마감 룩: ${params.finish_look || 'null'}
- 내부 텍스처: ${params.interior_texture || 'null'}
- 끝 텍스처: ${params.end_texture || 'null'}
- 표면 처리: ${params.surface_treatment || 'null'}
- 디테일링: ${params.detailing || 'null'}

=== 스타일링 & 방향 ===
- 스타일링 방향: ${params.styling_direction || 'null'}
- 가르마: ${params.parting || 'null'}
- 스타일링 방법: ${params.styling_method || 'null'}
- 무브먼트 방향: ${params.movement_direction || 'null'}
- 얼굴 프레이밍: ${params.face_framing || 'null'}
- 스타일링 제품: ${params.styling_product || 'null'}
- 유지 관리: ${params.maintenance_level || 'null'}
- 다용도성: ${params.versatility || 'null'}

=== 컬러 & 톤 ===
- 컬러 레벨: ${params.color_level || 'null'}
- 컬러 톤: ${params.color_tone || 'null'}
- 컬러 기법: ${params.color_technique || 'null'}
- 디멘션: ${params.dimension || 'null'}
- 루트 섀도우: ${params.root_shadow || 'null'}

=== 디자인 & 특수 기법 ===
- 디자인 강조: ${params.design_emphasis || 'null'}
- 디스커넥션: ${params.disconnection || 'null'}
- 언더컷: ${params.undercut_presence || 'null'}
- 그라데이션 각도: ${params.graduation_angle || 'null'}
- 엘리베이션 각도: ${params.elevation_angle || 'null'}
- 커팅 각도: ${params.cutting_angle || 'null'}
- 섹션 패턴: ${params.section_pattern || 'null'}

=== 메타 정보 ===
- 신뢰도: ${params.confidence_score || 0}
- 난이도: ${params.difficulty_level || 'null'}
- 예상 시간: ${params.estimated_time_minutes || 0}분
- 얼굴형: ${params.face_shape_match || 'null'}
- 연령대: ${params.age_suitability || 'null'}
- 상황: ${params.occasion || 'null'}
`.trim();

  // 유사 스타일 레시피
  let recipeExamples = '';
  if (similarStyles && similarStyles.length > 0) {
    recipeExamples = '\n\n**🔍 데이터베이스의 유사 스타일 레시피 (56개 파라미터):**\n\n' + 
      similarStyles.map((s, i) => {
        if (s.recipe) {
          let recipeData;
          try {
            recipeData = typeof s.recipe === 'string' ? JSON.parse(s.recipe) : s.recipe;
          } catch (e) {
            recipeData = s.recipe;
          }
          
          return `[레시피 ${i+1}] ${s.name} (${s.code})\n${JSON.stringify(recipeData, null, 2)}`;
        }
        return `[레시피 ${i+1}] ${s.name} (${s.code})\n레시피 데이터 없음`;
      }).join('\n\n');
  }

  // ⭐ 개선된 시스템 프롬프트
  const systemPrompt = `당신은 경력 20년 이상의 **헤어 마스터 교육자**입니다. 

**미션**: 분석된 56개 파라미터와 데이터베이스의 유사 스타일 레시피를 학습하여, **초보자도 따라할 수 있는 상세한 커트 레시피**를 생성하세요.

**핵심 원칙:**
1. 모든 단계를 **구체적인 숫자와 위치**로 설명
2. **왜 그렇게 하는지** 이유 포함
3. **주의사항과 팁** 명시
4. 데이터베이스 레시피의 정확한 파라미터 값 활용

**출력 형식:**

# ✂️ ${params.womens_cut_category || params.mens_cut_category || '헤어'} 커트 레시피

---

## 📋 1. 스타일 개요

### 특징
- [스타일의 핵심 특징 2-3문장]
- [어울리는 얼굴형과 헤어 타입]

### 시술 정보
- ⏱ **예상 시간**: ${params.estimated_time_minutes || 60}분
- 🎯 **난이도**: ${params.difficulty_level || '중급'}
- 👤 **추천 대상**: ${params.age_suitability || '전연령'}, ${params.face_shape_match || 'All'} 얼굴형
- 💼 **적합 상황**: ${params.occasion || 'Daily'}

---

## 🎨 2. 준비 단계

### 필요한 도구
- 가위 (커팅용, 텍스처라이징용)
- 빗 (테일 콤, 와이드 콤)
- 클립 (섹셔닝용 4-6개)
- 스프레이 (물, 세팅용)
${params.texturizing_technique !== 'None' ? `- ${params.texturizing_technique} 도구` : ''}

### 모발 준비
1. **샴푸 후 80% 건조** (촉촉한 상태 유지)
2. **자연 스타일링 확인** (모발 흐름 파악)
3. **섹셔닝 라인 표시** (테일 콤으로 미리 그려두기)

---

## 📐 3. 베이스 커트

### 3-1. 섹션 분할
**패턴**: ${params.section_pattern || 'Horizontal'}
**섹션 개수**: 4개 (Crown, Top, Side, Back)

\`\`\`
[상세 섹셔닝 순서]
1. 이어투이어 라인 (Ear to Ear)
   └ 크라운 포인트에서 양쪽 귀 위로 수평 라인

2. 센터 파트 라인
   └ 이마 센터에서 넵까지 수직 라인
   
3. 4개 섹션 완성:
   ├ 섹션 1: Front Top (이마~크라운)
   ├ 섹션 2: Back Crown (크라운~넵)
   ├ 섹션 3: Left Side
   └ 섹션 4: Right Side
\`\`\`

### 3-2. 가이드 라인 설정
**위치**: ${params.womens_cut_length || params.estimated_hair_length_cm + 'cm'}
**컷 형태**: ${params.cut_form || 'Layer'}

\`\`\`
[가이드 설정 순서]
1. 백 센터에서 시작
   └ 위치: ${params.back_section_length_cm || params.estimated_hair_length_cm}cm
   └ 각도: ${params.cutting_angle || 'Horizontal'}

2. 가이드 확인
   └ 좌우 균형 체크 (거울 이용)
   └ 자연스러운 낙하 확인
\`\`\`

### 3-3. 베이스 커팅
**커팅 각도**: ${params.cutting_angle || 'Horizontal'}
**텐션**: 중간 (너무 당기지 않기)

\`\`\`
[커팅 순서]
1. 백 섹션 (Back)
   └ 하단부터 상단으로 (Bottom to Top)
   └ 1cm 두께 슬라이스로 진행
   └ 가이드 라인에 정확히 맞추기
   
   💡 TIP: 매 슬라이스마다 이전 라인을 1cm 포함

2. 사이드 섹션 (Side)
   └ 백 섹션 연결 확인
   └ 얼굴 라인 고려 (${params.face_framing || 'Soft'})
   
   ⚠️ 주의: 귀 주변은 클라이언트 편안함 확인

3. 탑 섹션 (Top)
   └ 크라운부터 이마 방향
   └ 자연스러운 연결 확인
\`\`\`

---

## 🌊 4. 레이어링

### 4-1. 레이어 구조
**타입**: ${params.structure_layer || 'Increase Layer'}
**시작 지점**: ${params.crown_height === 'High' ? '크라운 높게' : params.crown_height === 'Low' ? '크라운 낮게' : '크라운 중간'}

### 4-2. 엘리베이션 설정
**각도 설정**:
- 탑 섹션: ${params.elevation_angle || '90°'}
- 사이드 섹션: ${params.elevation_angle === '90°' ? '45-90°' : params.elevation_angle || '45°'}
- 백 섹션: ${params.graduation_angle || 'Medium (45-90°)'}

\`\`\`
[레이어 커팅 순서]
1. 크라운 포인트 설정
   └ 길이: ${params.top_section_length_cm || 15}cm
   └ 엘리베이션: ${params.elevation_angle || '90°'}
   └ 모발을 진행 방향으로 당기기
   
   💡 TIP: 크라운 포인트가 전체 레이어의 기준

2. 레이디얼 섹션 (Radial)
   └ 크라운에서 방사형으로 진행
   └ 각 섹션을 크라운 가이드와 연결
   
3. 레이어 확인
   └ 손가락으로 빗어내며 매끄러움 체크
   └ 좌우 대칭 확인
\`\`\`

### 4-3. 무게감 조절
**무게 흐름**: ${params.weight_flow || 'Evenly Distributed'}
**볼륨 위치**: ${params.volume_placement || 'Even'}

\`\`\`
${params.weight_flow === 'Forward Weighted' ? 
`[전방 무게감]
- 앞쪽을 길게 유지
- 뒷쪽 레이어를 짧게 커트
- 얼굴 쪽으로 무게감 집중` :
params.weight_flow === 'Backward Weighted' ?
`[후방 무게감]  
- 뒷쪽을 길게 유지
- 앞쪽 레이어 짧게 커트
- 뒷모습 강조` :
`[균등 분배]
- 전체적으로 일정한 레이어
- 자연스러운 볼륨 분포`}
\`\`\`

---

## ✨ 5. 텍스처링 & 디테일

### 5-1. 텍스처 기법
**기법**: ${params.texturizing_technique || 'Point Cut'}
**적용 위치**: ${params.interior_texture === 'Heavy' ? '전체 내부' : params.interior_texture === 'Light' ? '끝부분만' : '중간부터'}

\`\`\`
[${params.texturizing_technique || 'Point Cut'} 적용법]
${params.texturizing_technique === 'Point Cut' ?
`1. 가위를 45° 각도로
2. 모발 끝에서 2-3cm 위로
3. 미세하게 'V' 모양으로 커트
4. 깊이: 0.5-1cm (모질에 따라)

💡 TIP: 굵은 모발은 깊게, 가는 모발은 얕게` :
params.texturizing_technique === 'Slide Cut' ?
`1. 가위를 닫은 상태로
2. 모발 중간에서 끝까지 슬라이딩
3. 압력: 가볍게 (끊지 않기)

⚠️ 주의: 너무 세게 누르면 끊김` :
`기본 텍스처링 기법 적용`}
\`\`\`

### 5-2. 끝선 처리
**스타일**: ${params.perimeter_line || 'Point Cut'}
**효과**: ${params.end_texture || 'Feathered'}

\`\`\`
[끝선 마무리]
1. 전체 길이 최종 확인
2. ${params.perimeter_line || 'Point Cut'}으로 끝선 소프트하게
3. 자연스러운 연결 체크

💡 TIP: 건조 후 재확인 필수
\`\`\`

### 5-3. 표면 처리
**기법**: ${params.surface_treatment || 'Layered'}

\`\`\`
[표면 마무리]
${params.surface_treatment === 'Choppy' ?
`- 포인트 커트로 표면에 움직임 추가
- 불규칙한 패턴으로 현대적 느낌` :
params.surface_treatment === 'Smooth' ?
`- 슬라이드 커트로 매끄럽게
- 광택과 윤기 강조` :
`- 레이어드 처리로 자연스러운 흐름`}
\`\`\`

${params.fringe_type !== 'No Fringe' ? `

---

## 💇 6. 앞머리 커트

### 앞머리 정보
**타입**: ${params.fringe_type}
**길이**: ${params.fringe_length}

\`\`\`
[앞머리 커팅 순서]
1. 앞머리 섹션 분리
   └ 삼각형 섹션 (Triangle Section)
   └ 너비: 눈썹 바깥쪽까지
   └ 깊이: 크라운 앞 5-7cm

2. 가이드 설정
   └ 센터에서 시작
   └ 길이: ${params.fringe_length} 기준
   
3. 커팅
   └ 엘리베이션: 0° (자연 낙하)
   └ ${params.fringe_type === 'See-Through Bang' ? '포인트 커트로 투명도 조절' : 
       params.fringe_type === 'Curtain Bang' ? '센터 짧게, 사이드 길게' :
       '일자 또는 둥근 라인'}

💡 TIP: 건조 시 1cm 올라오므로 여유있게
\`\`\`
` : ''}

---

## 💨 7. 스타일링 가이드

### 7-1. 블로우 드라이
**방향**: ${params.styling_direction || 'Mixed'}
**무브먼트**: ${params.movement_direction || 'Outward'}

\`\`\`
[블로우 드라이 순서]
1. 뿌리 건조 (80% 건조)
   └ 아래에서 위로 바람
   └ 볼륨 ${params.volume_placement || 'Even'} 위치 강조
   
2. 중간 건조 (15% 남기기)
   └ ${params.styling_direction === 'Forward' ? '전방으로 당기며' :
       params.styling_direction === 'Backward' ? '후방으로 넘기며' :
       params.styling_direction === 'Side' ? '사이드로 넘기며' :
       '자연스럽게 흐르도록'}
   
3. 마무리 (Cool Shot)
   └ 차가운 바람으로 세팅
   └ 형태 고정
\`\`\`

### 7-2. 스타일링 제품
**제품 레벨**: ${params.styling_product || 'Light'}
**마감 룩**: ${params.finish_look || 'Natural'}

\`\`\`
[제품 사용법]
${params.styling_product === 'Light' ?
`- 가벼운 에센스 또는 오일
- 양: 펌핑 1-2회
- 적용: 중간부터 끝까지` :
params.styling_product === 'Medium' ?
`- 크림 또는 로션 타입
- 양: 적당량 (손바닥 절반)
- 적용: 뿌리 제외 전체` :
params.styling_product === 'Heavy' ?
`- 왁스 또는 포마드
- 양: 소량 (손가락 한 마디)
- 적용: 뿌리에서 조금씩 분산` :
`- 필요 시 가벼운 제품 사용`}

💡 TIP: 항상 소량으로 시작, 필요 시 추가
\`\`\`

---

## 🔧 8. 유지 관리

### 관리 난이도
**레벨**: ${params.maintenance_level || 'Medium'}

### 정기 관리
- 🗓 **재방문 주기**: ${
  params.maintenance_level === 'Low' ? '8-10주' :
  params.maintenance_level === 'High' ? '3-4주' :
  '5-6주'
}
- ✂️ **트리밍 필요 부위**: ${params.fringe_type !== 'No Fringe' ? '앞머리 (2-3주), ' : ''}끝선

### 홈케어 팁
\`\`\`
1. 샴푸
   └ ${params.hair_texture === 'Fine' ? '볼륨 샴푸' : 
       params.hair_texture === 'Coarse' ? '모이스처 샴푸' :
       '일반 샴푸'} 사용
   └ 주 2-3회 (두피 타입에 따라)

2. 컨디셔너
   └ 중간~끝만 적용
   └ ${params.hair_density === 'Thick' ? '충분히 발라서 결 정리' : '소량만 사용'}

3. 스타일링
   └ 자연 건조 ${params.styling_method === 'Air Dry' ? '추천' : '또는 드라이'}
   └ 열 보호제 필수
\`\`\`

---

## 💡 9. 프로 팁 & 주의사항

### ✅ 성공 포인트
${params.difficulty_level === '초급' ?
`- 정확한 섹셔닝이 80%
- 가이드 라인 준수
- 서두르지 않기` :
params.difficulty_level === '고급' || params.difficulty_level === '마스터' ?
`- 모발 흐름 정확한 파악
- 미세한 각도 조절
- 클라이언트 두상 형태 고려` :
`- 섹션별 정확한 연결
- 일정한 텐션 유지
- 건조 후 재확인`}

### ⚠️ 주의사항
- ${params.hair_texture === 'Fine' ? '가는 모발: 과도한 레이어 주의 (비어보일 수 있음)' :
     params.hair_texture === 'Coarse' ? '굵은 모발: 충분한 텍스처링 필수 (뻣뻣해 보일 수 있음)' :
     '중간 모질: 균형잡힌 레이어와 텍스처'}
- ${params.natural_texture === 'Curly' ? '곱슬 모발: 건조 후 1-2cm 더 올라옴 (여유있게 커트)' :
     params.natural_texture === 'Straight' ? '직모: 끝선 라인이 명확히 보임 (정확한 커팅 필수)' :
     '웨이브 모발: 자연 흐름 고려'}
- 항상 건조 후 최종 체크

### 🎯 완성도 체크리스트
- [ ] 좌우 균형 (360° 확인)
- [ ] 자연스러운 낙하선
- [ ] 레이어 연결 매끄러움
- [ ] 끝선 처리 깔끔함
${params.fringe_type !== 'No Fringe' ? '- [ ] 앞머리 균형' : ''}
- [ ] 클라이언트 만족도

---

## 📝 레시피 요약

| 항목 | 세부사항 |
|------|----------|
| **스타일명** | ${params.womens_cut_category || params.mens_cut_category || '커스텀 스타일'} |
| **길이** | ${params.estimated_hair_length_cm || 0}cm |
| **컷 형태** | ${params.cut_form || 'Layer'} |
| **레이어** | ${params.structure_layer || 'Increase Layer'} |
| **앞머리** | ${params.fringe_type || 'None'} |
| **엘리베이션** | ${params.elevation_angle || '90°'} |
| **텍스처** | ${params.texturizing_technique || 'Point Cut'} |
| **난이도** | ${params.difficulty_level || '중급'} |
| **시술 시간** | ${params.estimated_time_minutes || 60}분 |

---

**📌 이 레시피는 56개 파라미터 분석과 ${similarStyles.length}개 유사 스타일 학습을 기반으로 생성되었습니다.**`;

  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: `${paramsSummary}${recipeExamples}\n\n위 분석 결과와 데이터베이스 레시피들을 참고하여, **초보자도 따라할 수 있는 매우 상세한** 커트 레시피를 생성해주세요. 모든 단계에 구체적인 수치와 위치, 주의사항을 포함하세요.`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000  // ⭐ 상세 레시피라 더 많이
    })
  });

  if (!gptResponse.ok) {
    throw new Error('GPT API failed');
  }

  const data = await gptResponse.json();
  return data.choices[0].message.content;
}

// ==================== 기존 함수들 ====================
async function searchStyles(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;
  
  return await searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey).then(results => ({
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  }));
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

  const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

  const data = await gptResponse.json();
  
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
  const context = search_results.map(r => 
    `${r.name}: ${r.description || '스타일 정보'}`
  ).join('\n');

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
          content: '당신은 헤어 전문가입니다. 실무 조언을 2-3문장으로 제공하세요.'
        },
        { 
          role: 'user', 
          content: `질문: ${user_query}\n\n참고:\n${context}`
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    })
  });

  const data = await gptResponse.json();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content
    })
  };
}
