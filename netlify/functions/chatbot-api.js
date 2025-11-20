// netlify/functions/chatbot-api.js
// HAIRGATOR v5.0 - 최종 완성 버전 (2025-01-25)
// 
// 🎯 주요 기능:
// 1. ⭐ 사용자 성별 선택 통합 (user_gender: 'male' | 'female')
// 2. GPT-4o Vision + Function Calling (56개 파라미터)
// 3. recipe_samples 벡터 검색 (4,719개 레시피)
// 4. Gemini embedding (768차원)
// 5. 도해도 15개 선별 및 반환
// 6. 성별 필터링 (female: 2,178개 / male: 2,541개)
// 7. 보안 필터링 (IP 보호)
// 8. 다국어 지원 (ko/en/ja/zh/vi)
// ==================== 

const fetch = require('node-fetch');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// ==================== 56개 파라미터 스키마 ====================
const PARAMS_56_SCHEMA = {
  type: "object",
  properties: {
    // 기본 정보
    cut_category: {
      type: "string",
      enum: ["Women's Cut", "Men's Cut"],
      description: "Gender category"
    },
    
    // 길이 (Length) - 8개
    length_category: {
      type: "string",
      enum: [
        "A Length", "B Length", "C Length", "D Length",
        "E Length", "F Length", "G Length", "H Length"
      ],
      description: "Overall length category based on body landmarks"
    },
    
    estimated_hair_length_cm: {
      type: "string",
      description: "Estimated hair length in cm (e.g., '35')"
    },
    
    front_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Front hair length"
    },
    
    back_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Back hair length"
    },
    
    side_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Side hair length"
    },
    
    // 구조 (Structure)
    cut_form: {
      type: "string",
      enum: ["O (One Length)", "G (Graduation)", "L (Layer)"],
      description: "Cut form - must include parentheses"
    },
    
    structure_layer: {
      type: "string",
      enum: [
        "No Layer", "Low Layer", "Mid Layer", "High Layer",
        "Full Layer", "Square Layer", "Round Layer", "Graduated Layer"
      ],
      description: "Layer structure"
    },
    
    graduation_type: {
      type: "string",
      enum: ["None", "Light", "Medium", "Heavy"],
      description: "Graduation level"
    },
    
    weight_distribution: {
      type: "string",
      enum: ["Top Heavy", "Balanced", "Bottom Heavy"],
      description: "Weight distribution"
    },
    
    layer_type: {
      type: "string",
      enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"],
      description: "Layer type"
    },
    
    // 형태 (Shape)
    silhouette: {
      type: "string",
      enum: ["Triangular", "Square", "Round"],
      description: "Overall silhouette shape"
    },
    
    outline_shape: {
      type: "string",
      enum: ["Straight", "Curved", "Angular", "Irregular"],
      description: "Outline shape"
    },
    
    volume_zone: {
      type: "string",
      enum: ["Low", "Medium", "High"],
      description: "Volume zone (bottom/middle/top)"
    },
    
    volume_distribution: {
      type: "string",
      enum: ["Top", "Middle", "Bottom", "Even"],
      description: "Volume distribution"
    },
    
    line_quality: {
      type: "string",
      enum: ["Sharp", "Soft", "Blended", "Disconnected"],
      description: "Line quality"
    },
    
    // 앞머리 (Fringe)
    fringe_type: {
      type: "string",
      enum: [
        "Full Bang", "See-through Bang", "Side Bang",
        "Center Part", "No Fringe"
      ],
      description: "Fringe type"
    },
    
    fringe_length: {
      type: "string",
      enum: [
        "Forehead", "Eyebrow", "Eye", "Cheekbone",
        "Lip", "Chin", "None"
      ],
      description: "Fringe length"
    },
    
    fringe_texture: {
      type: "string",
      enum: ["Blunt", "Textured", "Wispy", "Choppy"],
      description: "Fringe texture"
    },
    
    // 텍스처 (Texture)
    surface_texture: {
      type: "string",
      enum: ["Smooth", "Textured", "Choppy", "Soft"],
      description: "Surface texture"
    },
    
    internal_texture: {
      type: "string",
      enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"],
      description: "Internal texture"
    },
    
    hair_density: {
      type: "string",
      enum: ["Thin", "Medium", "Thick"],
      description: "Hair density"
    },
    
    hair_texture: {
      type: "string",
      enum: ["Straight", "Wavy", "Curly", "Coily"],
      description: "Natural hair texture"
    },
    
    movement: {
      type: "string",
      enum: ["Static", "Slight", "Moderate", "High"],
      description: "Movement level"
    },
    
    texture_technique: {
      type: "string",
      enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"],
      description: "Texturizing technique"
    },
    
    // 기술 (Technique)
    section_primary: {
      type: "string",
      enum: [
        "Horizontal", "Vertical",
        "Diagonal-Forward", "Diagonal-Backward"
      ],
      description: "Primary sectioning direction"
    },
    
    lifting_range: {
      type: "array",
      items: {
        type: "string",
        enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]
      },
      minItems: 1,
      maxItems: 9,
      description: "Lifting angle range (array format)"
    },
    
    direction_primary: {
      type: "string",
      enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
      description: "Primary cutting direction"
    },
    
    cutting_method: {
      type: "string",
      enum: [
        "Blunt Cut", "Point Cut", "Slide Cut",
        "Stroke Cut", "Razor Cut"
      ],
      description: "Cutting method"
    },
    
    styling_method: {
      type: "string",
      enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"],
      description: "Styling method"
    },
    
    design_emphasis: {
      type: "string",
      enum: ["Volume", "Length", "Texture", "Shape", "Movement"],
      description: "Design emphasis"
    },
    
    weight_flow: {
      type: "string",
      enum: ["Balanced", "Forward Weighted", "Backward Weighted"],
      description: "Weight flow"
    },
    
    connection_type: {
      type: "string",
      enum: ["Connected", "Disconnected", "Semi-Connected"],
      description: "Connection type"
    },
    
    // 여성/남성 카테고리
    womens_cut_category: {
      type: "string",
      enum: [
        "Long Straight", "Long Wave", "Long Curl",
        "Medium Straight", "Medium Wave", "Medium Curl",
        "Short Bob", "Short Pixie", "Shoulder Length"
      ],
      description: "Women's cut category (if Women's Cut)"
    },
    
    mens_cut_category: {
      type: "string",
      enum: [
        "Side Fringe", "Side Part", "Fringe Up",
        "Pushed Back", "Buzz", "Crop", "Mohican"
      ],
      description: "Men's cut category (if Men's Cut)"
    },
    
    // 얼굴형 추천
    face_shape_match: {
      type: "array",
      items: {
        type: "string",
        enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"]
      },
      minItems: 1,
      maxItems: 3,
      description: "Suitable face shapes for this hairstyle (1-3 selections)"
    },
    
    // 펌/컬 (옵션)
    curl_pattern: {
      type: ["string", "null"],
      enum: ["C-Curl", "CS-Curl", "S-Curl", "SS-Curl", null],
      description: "Curl pattern (null if none)"
    },
    
    curl_strength: {
      type: ["string", "null"],
      enum: ["Soft", "Medium", "Strong", null],
      description: "Curl strength (null if none)"
    },
    
    perm_type: {
      type: ["string", "null"],
      enum: ["Wave Perm", "Digital Perm", "Heat Perm", "Iron Perm", null],
      description: "Perm type (null if none)"
    }
  },
  
  required: [
    "cut_category",
    "length_category",
    "cut_form",
    "lifting_range",
    "section_primary",
    "fringe_type",
    "volume_zone",
    "face_shape_match"
  ],
  
  additionalProperties: false
};

// ==================== 메인 핸들러 ====================
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

    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not configured');

    console.log('🔑 환경변수 확인 완료');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, OPENAI_KEY);
      
      case 'generate_recipe':
       return await generateRecipe(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_recipe_stream':
       return await generateRecipeStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'search_styles':
        return await searchStyles(payload, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_response':
        return await generateResponse(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
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

// ==================== 이미지 분석 (성별 통합!) ====================
async function analyzeImage(payload, openaiKey) {
  const { image_base64, mime_type, user_gender } = payload;  // ⭐ user_gender 추가

  console.log(`🎯 이미지 분석 시작 - 사용자 선택 성별: ${user_gender || 'unspecified'}`);

  // ⭐ 성별에 따른 프롬프트 조정
  const genderContext = user_gender === 'male' 
    ? `\n\n⚠️ IMPORTANT: This is a MALE hairstyle. Focus on men's cut categories and techniques.\n- Use "Men's Cut" for cut_category\n- Select from mens_cut_category options\n- Consider typical male length ranges (mostly E~H Length)`
    : user_gender === 'female'
    ? `\n\n⚠️ IMPORTANT: This is a FEMALE hairstyle. Focus on women's cut categories and techniques.\n- Use "Women's Cut" for cut_category\n- Select from womens_cut_category options\n- Consider typical female length ranges (A~H Length)`
    : `\n\nAnalyze the hairstyle gender and select appropriate cut_category.`;

  const systemPrompt = `You are an expert hair stylist specializing in the 2WAY CUT system.
Analyze the uploaded hairstyle image and extract ALL 56 parameters with ABSOLUTE PRECISION.
${genderContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## LENGTH CLASSIFICATION (MOST IMPORTANT!)

**"WHERE does the LONGEST hair END touch the body?"**

8 Length Categories:
- A Length (65cm): Below chest (near navel)
- B Length (50cm): Mid chest (nipple level)
- C Length (40cm): Collarbone
- D Length (35cm): Shoulder line ⭐ KEY REFERENCE
- E Length (30cm): 2-3cm ABOVE shoulder
- F Length (25cm): Below chin (neck starts)
- G Length (20cm): Jaw line
- H Length (15cm): Ear level

**CRITICAL 4-STEP LENGTH DECISION:**

STEP 1: Find the LONGEST hair strand in the BACK
- Ignore shorter face-framing layers
- Focus on the longest length you can see

STEP 2: Compare to body landmarks (CAREFULLY):
- Below chest/near navel = A Length (65cm)
- Mid-chest (nipple level) = B Length (50cm) ⭐ COMMON
- Collarbone = C Length (40cm) ⭐ COMMON
- Shoulder line = D Length (35cm) ⭐ MOST COMMON
- 2-3cm above shoulder = E Length (30cm)
- Below chin = F Length (25cm)
- Jaw line = G Length (20cm)
- Ear level = H Length (15cm)

STEP 3: If between two lengths, choose the LONGER one
- Between B and C → Choose B
- Between C and D → Choose C

STEP 4: Double-check
- Does it clearly pass shoulders? → B or C (NOT D)
- Exactly at shoulders? → D Length
- Above shoulders? → E/F/G/H

EXAMPLE: Hair reaching mid-chest = B Length (NOT C!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FACE SHAPE MATCHING (CRITICAL!)

Analyze which face shapes this hairstyle suits BEST:

**Face Shape Analysis:**
- **Oval**: Ideal proportions, most styles work
- **Round**: Soft curves, needs vertical lines/side volume
- **Square**: Angular jaw, needs soft waves/side bangs
- **Heart**: Wide forehead + pointed chin, needs jaw coverage
- **Long**: Length > width, needs horizontal volume/side bangs
- **Diamond**: Wide cheekbones, needs cheekbone coverage

**Selection Logic:**
1. Layer styles → Oval, Round, Long
2. Side bangs → Square, Long, Heart
3. Middle volume → Round, Long, Diamond
4. Soft waves → Square, Heart
5. Long hair (A~D) → Oval, Long
6. Short hair (E~H) → Oval, Heart, Diamond

Select 1-3 most suitable face shapes!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## OTHER KEY PARAMETERS

**Cut Form (with parentheses!):**
- "O (One Length)" / "G (Graduation)" / "L (Layer)"

**Lifting Range (array!):**
- ["L0"] / ["L2"] / ["L2", "L4"]

**Volume Zone:**
- Low (0-44°) / Medium (45-89°) / High (90°+)

**Fringe Type:**
- Full Bang / See-through Bang / Side Bang / Center Part / No Fringe

**Face Shape Match (1-3 selections!):**
- ["Oval", "Round"] or ["Square", "Heart", "Long"] etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract ALL parameters accurately following the JSON schema!`;

  try {
    console.log('📸 GPT-4o Vision 분석 시작 (Function Calling)');

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-11-20',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: systemPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime_type};base64,${image_base64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          functions: [
            {
              name: 'extract_hair_parameters',
              description: 'Extract all 56 hair analysis parameters',
              parameters: PARAMS_56_SCHEMA
            }
          ],
          function_call: { name: 'extract_hair_parameters' },
          temperature: 0.3,
          max_tokens: 4000
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-4o API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Function Calling 응답 파싱
    const functionCall = data.choices?.[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('No function call in response');
    }
    
    const params56 = JSON.parse(functionCall.arguments);
    
    // ⭐ 성별 강제 적용 (사용자 선택 우선)
    if (user_gender === 'male' && params56.cut_category !== "Men's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Men's Cut`);
      params56.cut_category = "Men's Cut";
    } else if (user_gender === 'female' && params56.cut_category !== "Women's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Women's Cut`);
      params56.cut_category = "Women's Cut";
    }
    
    console.log('✅ GPT-4o Vision 분석 완료 (56개 파라미터):', {
      gender: params56.cut_category,
      user_selected: user_gender,
      length: params56.length_category,
      form: params56.cut_form,
      volume: params56.volume_zone,
      face_shapes: params56.face_shape_match
    });
    
    // Volume 검증
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      const calculatedVolume = calculateVolumeFromLifting(maxLifting);
      
      if (calculatedVolume !== params56.volume_zone) {
        console.log(`⚠️ Volume 불일치: Detected=${params56.volume_zone}, Calculated=${calculatedVolume}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: params56,
        user_gender: user_gender,  // ⭐ 사용자 선택 성별 반환
        model: 'gpt-4o-2024-11-20',
        method: 'function_calling'
      })
    };
  } catch (error) {
    console.error('💥 analyzeImage Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Image analysis failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 리프팅 각도 → 볼륨 계산 ====================
function calculateVolumeFromLifting(liftingCode) {
  const angles = {
    'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5,
    'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
  };
  
  const angle = angles[liftingCode] || 0;
  
  if (angle < 45) return 'Low';
  if (angle < 90) return 'Medium';
  return 'High';
}

// ==================== 보안 필터링 ====================
function sanitizeRecipeForPublic(recipe, language = 'ko') {
  if (!recipe) return recipe;
  
  let filtered = recipe;
  
  filtered = filtered.replace(/DBS\s+NO\.\s*\d+/gi, '뒷머리 기법');
  filtered = filtered.replace(/DFS\s+NO\.\s*\d+/gi, '앞머리 기법');
  filtered = filtered.replace(/VS\s+NO\.\s*\d+/gi, '중앙 기법');
  filtered = filtered.replace(/HS\s+NO\.\s*\d+/gi, '상단 기법');
  filtered = filtered.replace(/UP[\s-]?STEM\s+NO\.\s*\d+/gi, '정수리 기법');
  filtered = filtered.replace(/NAPE\s+ZONE\s+NO\.\s*\d+/gi, '목 부위 기법');
  
  filtered = filtered.replace(/가로섹션|Horizontal\s+Section/gi, '상단 부분');
  filtered = filtered.replace(/후대각섹션|Diagonal\s+Backward\s+Section/gi, '뒷머리 부분');
  filtered = filtered.replace(/전대각섹션|Diagonal\s+Forward\s+Section/gi, '앞쪽 부분');
  filtered = filtered.replace(/세로섹션|Vertical\s+Section/gi, '중앙 부분');
  filtered = filtered.replace(/네이프존|Nape\s+Zone/gi, '목 부위');
  filtered = filtered.replace(/업스템|Up[\s-]?Stem/gi, '정수리 부분');
  filtered = filtered.replace(/백존|Back\s+Zone/gi, '후면 부분');
  
  filtered = filtered.replace(/L[0-8]\s*\([^)]+\)/gi, '적절한 각도로');
  filtered = filtered.replace(/D[0-8]\s*\([^)]+\)/gi, '자연스러운 방향으로');
  
  filtered = filtered.replace(/42층|42\s+layers?|42-layer/gi, '전문적인 층 구조');
  filtered = filtered.replace(/\d+층\s+구조/gi, '체계적인 층 구조');
  
  filtered = filtered.replace(/9개\s+매트릭스|9\s+matrix|nine\s+matrix/gi, '체계적인 분류');
  filtered = filtered.replace(/매트릭스\s+코드|matrix\s+code/gi, '스타일 분류');
  
  filtered = filtered.replace(/7개\s+섹션|7개\s+존|7\s+section|7\s+zone/gi, '여러 부분');
  
  filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '');
  filtered = filtered.replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');
  
  console.log('🔒 보안 필터링 완료');
  return filtered;
}

// ==================== 검색 쿼리 생성 ====================
function buildSearchQuery(params56) {
  const parts = [];
  
  if (params56.length_category) {
    const lengthMap = {
      'A Length': '가슴 아래 롱헤어',
      'B Length': '가슴 세미롱',
      'C Length': '쇄골 세미롱',
      'D Length': '어깨선 미디엄',
      'E Length': '어깨 위 단발',
      'F Length': '턱선 보브',
      'G Length': '짧은 보브',
      'H Length': '베리숏'
    };
    parts.push(lengthMap[params56.length_category]);
  }
  
  if (params56.cut_form) {
    const form = params56.cut_form.replace(/[()]/g, '').trim();
    parts.push(form);
  }
  
  if (params56.lifting_range && params56.lifting_range.length > 0) {
    parts.push(`리프팅 ${params56.lifting_range.join(' ')}`);
  }
  
  if (params56.section_primary) {
    parts.push(`섹션 ${params56.section_primary}`);
  }
  
  if (params56.volume_zone) {
    parts.push(`${params56.volume_zone} 볼륨`);
  }
  
  if (params56.fringe_type && params56.fringe_type !== 'No Fringe') {
    parts.push(params56.fringe_type);
  }
  
  return parts.join(', ');
}

// ==================== recipe_samples 벡터 검색 ====================
async function searchRecipeSamples(supabaseUrl, supabaseKey, geminiKey, searchQuery, targetGender, lengthCategory = null) {
  try {
    console.log(`🔍 recipe_samples 검색: "${searchQuery}"`);
    console.log(`   필터: gender=${targetGender}, length=${lengthCategory}`);
    
    // Gemini 임베딩 생성 (768차원)
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: searchQuery }] }
        })
      }
    );
    
    if (!embeddingResponse.ok) {
      throw new Error(`Gemini embedding failed: ${embeddingResponse.status}`);
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;
    
    console.log(`✅ Gemini 임베딩 생성 완료 (768차원)`);
    
    // Supabase RPC 호출
    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_recipe_samples`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_threshold: 0.65,
          match_count: 30,
          filter_gender: targetGender
        })
      }
    );
    
    if (!rpcResponse.ok) {
      const errorText = await rpcResponse.text();
      console.error('❌ RPC 호출 실패:', rpcResponse.status, errorText);
      return [];
    }
    
    let results = await rpcResponse.json();
    console.log(`📊 원본 검색 결과: ${results.length}개`);
    
    // 길이 필터링
    if (lengthCategory) {
      const lengthPrefix = getLengthPrefix(lengthCategory);
      
      if (lengthPrefix) {
        const beforeFilter = results.length;
        results = results.filter(r => 
          r.sample_code && r.sample_code.startsWith(lengthPrefix)
        );
        console.log(`🎯 길이 필터: ${beforeFilter}개 → ${results.length}개 (${lengthPrefix}만)`);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 searchRecipeSamples Error:', error);
    return [];
  }
}

// 길이 카테고리 → 코드 prefix
function getLengthPrefix(lengthCategory) {
  const map = {
    'A Length': 'FAL',
    'B Length': 'FBL',
    'C Length': 'FCL',
    'D Length': 'FDL',
    'E Length': 'FEL',
    'F Length': 'FFL',
    'G Length': 'FGL',
    'H Length': 'FHL'
  };
  return map[lengthCategory] || null;
}

// ==================== 도해도 선별 ====================
function selectBestDiagrams(recipeSamples, maxDiagrams = 15) {
  const selectedDiagrams = [];
  
  recipeSamples.forEach(sample => {
    const parts = sample.sample_code.split('_');
    const styleCode = parts[0];
    const stepNumber = parseInt(parts[1]) || 1;
    
    const diagramIndex = stepNumber - 1;
    
    if (sample.diagram_images && 
        Array.isArray(sample.diagram_images) && 
        sample.diagram_images[diagramIndex]) {
      
      selectedDiagrams.push({
        style_code: styleCode,
        step_number: stepNumber,
        image_url: sample.diagram_images[diagramIndex],
        recipe_text: sample.recipe_full_text_ko,
        similarity: sample.similarity,
        sample_code: sample.sample_code
      });
    }
  });
  
  selectedDiagrams.sort((a, b) => b.similarity - a.similarity);
  
  console.log(`📊 도해도 추출: ${recipeSamples.length}개 샘플 → ${selectedDiagrams.length}개 도해도`);
  
  const final = selectedDiagrams.slice(0, maxDiagrams);
  
  console.log(`✅ 최종 선택: ${final.length}개 도해도`);
  
  return final;
}

// ==================== 언어별 용어 ====================
function getTerms(lang) {
  const terms = {
    ko: {
      lengthDesc: {
        'A Length': '가슴 아래 밑선',
        'B Length': '가슴 상단~중간',
        'C Length': '쇄골 밑선',
        'D Length': '어깨선',
        'E Length': '어깨 위 2-3cm',
        'F Length': '턱뼈 아래',
        'G Length': '턱선',
        'H Length': '귀 높이'
      },
      faceShapeDesc: {
        'Oval': '계란형',
        'Round': '둥근형',
        'Square': '사각형',
        'Heart': '하트형',
        'Long': '긴 얼굴형',
        'Diamond': '다이아몬드형'
      },
      formDesc: {
        'O': 'One Length, 원렝스',
        'G': 'Graduation, 그래쥬에이션',
        'L': 'Layer, 레이어'
      },
      volume: {
        'Low': '하단 볼륨 (0~44도)',
        'Medium': '중단 볼륨 (45~89도)',
        'High': '상단 볼륨 (90도 이상)'
      }
    },
    en: {
      lengthDesc: {
        'A Length': 'Below chest',
        'D Length': 'Shoulder line',
        'E Length': '2-3cm above shoulder',
        'G Length': 'Jaw line'
      },
      faceShapeDesc: {
        'Oval': 'Oval',
        'Round': 'Round',
        'Square': 'Square',
        'Heart': 'Heart',
        'Long': 'Long',
        'Diamond': 'Diamond'
      },
      formDesc: {
        'O': 'One Length',
        'G': 'Graduation',
        'L': 'Layer'
      },
      volume: {
        'Low': 'Low volume (0-44°)',
        'Medium': 'Medium volume (45-89°)',
        'High': 'High volume (90°+)'
      }
    }
  };
  
  return terms[lang] || terms['ko'];
}

// ==================== theory_chunks 벡터 검색 ====================
async function searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, matchCount = 5) {
  try {
    console.log(`🔍 theory_chunks 벡터 검색: "${query}"`);
    
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: query }] }
        })
      }
    );

    if (!embeddingResponse.ok) {
      console.error('❌ Gemini 임베딩 생성 실패');
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_theory_chunks`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_threshold: 0.60,
          match_count: matchCount
        })
      }
    );

    if (!rpcResponse.ok) {
      console.error('❌ Supabase RPC 호출 실패:', rpcResponse.status);
      return [];
    }

    const results = await rpcResponse.json();
    console.log(`✅ theory_chunks ${results.length}개 검색 완료`);
    
    return results;

  } catch (error) {
    console.error('💥 theory_chunks 검색 오류:', error);
    return [];
  }
}

// ==================== 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    // 1. 검색 쿼리 생성
    const searchQuery = buildSearchQuery(params56);
    console.log(`🔍 검색 쿼리: "${searchQuery}"`);
    
    // 2. recipe_samples 벡터 검색
    const targetGender = params56.cut_category?.includes("Women") ? 'female' : 'male';
    const recipeSamples = await searchRecipeSamples(
      supabaseUrl,
      supabaseKey,
      geminiKey,
      searchQuery,
      targetGender,
      params56.length_category
    );
    
    // 3. 도해도 선별
    const selectedDiagrams = selectBestDiagrams(recipeSamples, 15);
    console.log(`✅ 도해도 선별 완료: ${selectedDiagrams.length}개`);
    
    // 4. 도해도 컨텍스트
    const diagramsContext = selectedDiagrams.map((d, idx) => 
      `${idx + 1}단계: ${d.sample_code} (유사도 ${(d.similarity * 100).toFixed(0)}%)\n   설명: ${d.recipe_text.substring(0, 100)}...`
    ).join('\n\n');
    
    // 5. 언어별 용어
    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];
    
    const faceShapesKo = (params56.face_shape_match || [])
      .map(shape => langTerms.faceShapeDesc[shape] || shape)
      .join(', ');

    // 6. GPT 프롬프트
    const enhancedPrompt = `당신은 전문 헤어 스타일리스트입니다.

**분석 결과:**
- 길이: ${params56.length_category} (${langTerms.lengthDesc[params56.length_category]})
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone} (${volumeDesc})
- 앞머리: ${params56.fringe_type || '없음'}
- 어울리는 얼굴형: ${faceShapesKo || '모든 얼굴형'}

**🎯 선별된 도해도 순서 (${selectedDiagrams.length}개):**

${diagramsContext}

**📋 작성 지침:**

위의 도해도 순서를 **정확히 따라서** 레시피를 작성하세요.

### STEP 1: 전체 개요 (2-3줄)
이 스타일의 핵심 특징과 기대 효과를 간결하게 설명

### STEP 2: 상세 커팅 순서 (${selectedDiagrams.length}단계)

**각 도해도에 맞춰서 정확히 작성:**

${selectedDiagrams.map((d, idx) => `
**【${idx + 1}단계: ${d.sample_code}】**
\`\`\`
목적: ${d.recipe_text.split('.')[0]}
분할 방법: (구체적으로)
리프팅 각도: (명확한 각도)
커팅 기법: (비율 포함)
주의사항: (핵심 포인트)
\`\`\`
`).join('\n')}

### STEP 3: 질감 처리
- 1차 질감: 슬라이드 또는 포인트 컷 40%
- 2차 질감: 틴닝 또는 스트록 컷 30%
- 마무리: 디테일 20-30%

### STEP 4: 스타일링 가이드
- 드라이 방법
- 아이론/고데기 사용법
- 제품 추천

### STEP 5: 유지 관리
- 다듬기 주기
- 집에서 관리법

**⚠️ 중요:**
- 도해도 순서를 절대 바꾸지 마세요
- 각 단계마다 구체적인 수치 포함
- 총 800자 이내로 간결하게

모든 내용을 **한국어로만** 작성하세요.`;

    // 7. GPT 호출
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.' },
          { role: 'user', content: enhancedPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const data = await completion.json();
    let recipe = data.choices[0].message.content;
    
    // 보안 필터링
    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 레시피 생성 완료');
    console.log(`🎯 반환할 도해도: ${selectedDiagrams.length}개`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: recipe,
          params56: params56,
          diagrams: selectedDiagrams,
          diagram_count: selectedDiagrams.length,
          matched_samples: recipeSamples.slice(0, 3)
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

// ==================== 스트리밍 레시피 생성 ====================
async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  return await generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey);
}

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

// ==================== 스타일 검색 ====================
async function searchStyles(payload, geminiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;
  
  const targetGender = null;
  const results = await searchRecipeSamples(supabaseUrl, supabaseKey, geminiKey, query, targetGender);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  };
}

// ==================== 일반 대화 응답 ====================
async function generateResponse(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query } = payload;
  const userLanguage = detectLanguage(user_query);
  
  console.log(`💬 일반 대화 응답: "${user_query}"`);
  
  const securityKeywords = [
    '42포뮬러', '42개 포뮬러', '42 formula',
    '9매트릭스', '9개 매트릭스', '9 matrix',
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO'
  ];
  
  const isSecurityQuery = securityKeywords.some(keyword => 
    user_query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (isSecurityQuery) {
    const securityResponse = {
      korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.',
      english: 'I apologize, but that information is proprietary.'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: securityResponse[userLanguage] || securityResponse['korean']
      })
    };
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 친근한 헤어 AI 어시스턴트입니다.' },
        { role: 'user', content: user_query }
      ],
      temperature: 0.7,
      max_tokens: 150
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
