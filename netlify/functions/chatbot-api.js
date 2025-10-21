// netlify/functions/chatbot-api.js
// 파라미터 기반 커트 레시피 생성 - 최종 완성 버전

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

    // 환경변수에서 API 키 가져오기
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // 환경변수 검증
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
        // ⭐ 새로운 액션: 파라미터 기반 레시피 생성
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
- A: 가슴 아래 밑선 (에어컷, 구름컷, 프릴컷, 그레이스컷, 레이컷)
- B: 가슴-쇄골 중간 (엘리자벳컷, 허그컷, 샌드컷, 페미닌컷, 젤리컷, 스무스컷, 포그컷, 미스티컷, 허쉬컷)
- C: 쇄골라인 밑선 (빌드컷)
- D: 어깨에 닿는 선 (플라워컷, 플리츠컷, 레이스컷)
- E: 어깨 바로 위 (타미컷, 벌룬컷)
- F: 턱선 바로 밑 (클래식컷, 보니컷, 바그컷, 에그컷, 빌로우컷, 모즈컷)
- G: Jaw 라인 (엘리스컷, 슬림컷, 브록컷, 리플컷)
- H: 숏헤어 (코튼컷, 이지컷, 본컷, 듀컷, 플컷, 다이앤컷, 리프컷)

**중요**: 
1. 56개 파라미터 모두 포함
2. womens_cut_length는 A~H 중 반드시 선택
3. womens_cut_category는 길이에 맞는 스타일명 선택
4. 확인 불가능하면 null
5. JSON만 출력`;

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

  // ⭐ 2단계: 파라미터 → 검색 쿼리 변환
  const searchQuery = createSearchQueryFromParams(analysis_result);
  console.log('생성된 검색 쿼리:', searchQuery);

  // ⭐ 3단계: 유사 스타일 3-5개 검색
  const similarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey);
  console.log(`찾은 유사 스타일: ${similarStyles.length}개`);

  // ⭐ 4단계: GPT가 파라미터 + 유사 스타일 학습 → 레시피 1개 생성
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

  // 1. 컷 이름 (최우선)
  if (params.womens_cut_category) keywords.push(params.womens_cut_category);
  if (params.mens_cut_category) keywords.push(params.mens_cut_category);

  // 2. 길이
  if (params.estimated_hair_length_cm) {
    const length = params.estimated_hair_length_cm;
    if (length > 40) keywords.push('롱헤어');
    else if (length > 25) keywords.push('미디엄');
    else if (length > 15) keywords.push('단발');
    else keywords.push('숏헤어');
  }

  // 3. 레이어
  if (params.structure_layer) {
    keywords.push(params.structure_layer.replace(' Layer', ''));
  }

  // 4. 앞머리
  if (params.fringe_type && params.fringe_type !== 'No Fringe') {
    keywords.push('앞머리');
  }

  return keywords.join(' ') || '헤어스타일';
}

// ==================== 유사 스타일 검색 ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey) {
  try {
    // OpenAI 임베딩 생성
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

    // Supabase 벡터 검색
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
  const response = await fetch(`${supabaseUrl}/rest/v1/hairstyles?select=id,code,name,description,image_url&limit=${limit}`, {
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

// ==================== GPT 레시피 생성 ====================
async function generateCutRecipe(params, similarStyles, openaiKey) {
  
  // 파라미터 요약 (56개 전체)
  const paramsSummary = `
**분석된 56개 파라미터:**

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
- 탑 섹션 길이: ${params.top_section_length_cm || 0}cm
- 사이드 섹션 길이: ${params.side_section_length_cm || 0}cm
- 백 섹션 길이: ${params.back_section_length_cm || 0}cm
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
- 유지 관리 레벨: ${params.maintenance_level || 'null'}
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
- 얼굴형 매치: ${params.face_shape_match || 'null'}
- 연령 적합성: ${params.age_suitability || 'null'}
- 상황: ${params.occasion || 'null'}
- 시즌 매치: ${params.season_match || 'null'}
`.trim();

  // 유사 스타일 요약
  let stylesSummary = '';
  if (similarStyles && similarStyles.length > 0) {
    stylesSummary = '\n\n**참고할 유사 스타일:**\n' + 
      similarStyles.map((s, i) => 
        `${i+1}. ${s.name} (${s.code}): ${s.description || '스타일 설명 없음'}`
      ).join('\n');
  }

  const systemPrompt = `당신은 경력 20년 이상의 헤어 마스터입니다. 

**미션**: 분석된 파라미터와 유사 스타일을 학습하여, 실무에서 바로 적용 가능한 **커트 레시피 1개**를 작성하세요.

**레시피 구조:**
1. **스타일 개요** (1문장)
2. **베이스 커트** 
   - 가이드 라인 설정
   - 섹션 분할
   - 커트 각도
3. **레이어링**
   - 레이어 높이 및 각도
   - 커트 방향
4. **마무리**
   - 텍스처 처리
   - 스타일링 팁

**중요**: 
- 파라미터에 기반하여 작성
- 실무 용어 사용
- 완결된 문장으로 작성`;

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
          content: `${paramsSummary}${stylesSummary}\n\n위 정보를 바탕으로 이 스타일의 커트 레시피를 작성해주세요.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000  // ⭐ 500 → 1000으로 증가
    })
  });

  if (!gptResponse.ok) {
    throw new Error('GPT API failed');
  }

  const data = await gptResponse.json();
  return data.choices[0].message.content;
}

// ==================== 기존 함수들 (일반 대화용) ====================
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
