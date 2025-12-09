// netlify/functions/chatbot-api.js
// HAIRGATOR v5.1 - 9 Matrix 기반 스타일 매칭 (2025-12-05)
//
// 🎯 주요 변경사항:
// ✅ 9 Matrix (3x3) 기반 스타일 매칭 추가
// ✅ 도해도 중복 제거 로직 개선
// ✅ 스타일 파라미터 기반 매칭 강화
//
// 기존 기능 유지:
// 1. ⭐ 사용자 성별 선택 통합 (user_gender: 'male' | 'female')
// 2. GPT-4o Vision + Function Calling
// 3. recipe_samples 벡터 검색 (4,719개 레시피)
// 4. theory_chunks 하이브리드 검색 (벡터 + 키워드)
// 5. Gemini embedding (768차원)
// 6. 도해도 15개 선별 및 반환
// 7. 성별 필터링 (female: 2,178개 / male: 2,541개)
// 8. 보안 필터링 (IP 보호)
// 9. 다국어 지원 (ko/en/ja/zh/vi)
// ==================== 

// Node.js 18+ 내장 fetch 사용 (node-fetch 불필요)
// const fetch = require('node-fetch'); // 제거됨

// 스타일 매칭 함수 import - 2WAY CUT SYSTEM 전체 스키마
const {
  // 스키마
  FEMALE_PARAMS_SCHEMA,
  MALE_PARAMS_SCHEMA,
  // 카테고리 정보
  MALE_STYLE_CATEGORIES,
  FEMALE_LENGTH_CATEGORIES,
  // 공통 변수 & 좌표
  GLOBAL_VARIABLES,
  REFERENCE_POINTS,
  SECTIONING_VECTORS,
  WEIGHT_ZONES,
  // 모듈 정의
  MODULE_A_OUTLINE,
  MODULE_B_DFS,
  MODULE_C_DBS,
  MODULE_D_VS,
  // 매트릭스
  MATRIX_9,
  // 함수들
  selectMatrix,
  determineSectionType,
  determineTechniqueNumber,
  matchStyleFromParams,
  // 상세 기법 함수들
  determineDFSTechnique,
  determineDBSTechnique,
  determineVSTechnique,
  determineDirectionMode
} = require('./lib/schemas');

// 기장 가이드 이미지 Base64 (Vision API에 참조 이미지로 전송)
const LENGTH_GUIDE_BASE64 = require('./lib/length-guide-base64');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// ==================== 스타일 분석 파라미터 스키마 ====================
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
      description: "CRITICAL: A=below chest/waist, B=mid-chest(bra line), C=armpit, D=below shoulder ONLY, E=shoulder, F/G/H=short. If hair reaches CHEST level, MUST be B or A, NEVER D!"
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
        "Diagonal-Forward", "Diagonal-Backward",
        "Vertical+Horizontal", "Diagonal-Backward+Vertical"
      ],
      description: "Primary sectioning direction (can be mixed like 'Vertical+Horizontal')"
    },

    // 존별 섹션 (선택사항)
    section_by_zone: {
      type: "object",
      properties: {
        back: { type: "string", description: "Back zone section" },
        side: { type: "string", description: "Side zone section" },
        top: { type: "string", description: "Top zone section" },
        fringe: { type: "string", description: "Fringe zone section" }
      },
      description: "Section by zone (optional, for detailed analysis)"
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

    // ⭐ 존별 리프팅 - 스텝별 도해도 매칭에 중요!
    lifting_by_zone: {
      type: "object",
      properties: {
        back: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"], description: "Back zone lifting (Step 1)" },
        side: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"], description: "Side zone lifting (Step 2)" },
        top: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"], description: "Top zone lifting (Step 3)" },
        fringe: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"], description: "Fringe zone lifting (Step 4)" }
      },
      description: "Lifting by zone for step-based diagram matching"
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

    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');

    console.log('🔑 환경변수 확인 완료 (Firebase 기반)');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, OPENAI_KEY);

      // ⭐ 이미지+질문 분석 (Gemini Vision)
      case 'analyze_image_with_question':
        return await analyzeImageWithQuestion(payload, GEMINI_KEY);

      // ⭐ Gemini File Search 기반 응답
      case 'generate_response':
        return await generateGeminiFileSearchResponse(payload, GEMINI_KEY);

      case 'generate_response_stream':
        return await generateGeminiFileSearchResponseStream(payload, GEMINI_KEY);

      // ⭐ Firestore 스타일 검색 (임베딩 기반 Top-3)
      case 'search_firestore_styles':
        return await searchFirestoreStyles(payload, GEMINI_KEY);

      // ⭐⭐⭐ 이미지 분석 + 최적 레시피 매칭 (NEW!) ⭐⭐⭐
      case 'analyze_and_match_recipe':
        return await analyzeAndMatchRecipe(payload, GEMINI_KEY);

      // ⭐ 남자 스타일 수정 재분석 (사용자가 스타일 코드 변경)
      case 'regenerate_male_recipe':
        return await regenerateMaleRecipeWithStyle(payload, GEMINI_KEY);

      // ⭐ 여자 스타일 수정 재분석 (사용자가 길이/형태 변경)
      case 'regenerate_female_recipe':
        return await regenerateFemaleRecipeWithStyle(payload, GEMINI_KEY);

      // ⭐ 파라미터 기반 커스텀 레시피 생성 (Firebase 기반)
      case 'generate_custom_recipe':
        return await generateCustomRecipeFromParams(payload, GEMINI_KEY);

      // ⭐ 어드민: 스타일 분석 (이미지 생성용)
      case 'analyze_style_for_generation':
        return await analyzeStyleForGeneration(payload, GEMINI_KEY);

      // ⭐ 어드민: URL에서 이미지 가져와서 분석
      case 'analyze_style_from_url':
        return await analyzeStyleFromUrl(payload, GEMINI_KEY);

      // ⭐ 어드민: Gemini로 헤어스타일 이미지 생성
      case 'generate_hairstyle_image':
        return await generateHairstyleImage(payload);

      case 'generate_hairstyle_direct':
        return await generateHairstyleDirect(payload);

      // ⭐ 어드민: AI 카드뉴스 생성
      case 'generate_cardnews':
        return await generateCardNews(payload);

      // ⭐ 어드민: 카드뉴스 키워드/해시태그 추천
      case 'generate_cardnews_keywords':
        return await generateCardNewsKeywords(payload);

      // ⭐ 어드민: Veo 3.1 영상 생성
      case 'generate_video':
        return await generateVideo(payload);

      // ⭐ 헤어스타일 각도별 이미지 생성 (앞/옆/뒤/대각선)
      case 'generate_angle_views':
        return await generateAngleViews(payload);

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

// ==================== 전문 답변 생성 (일반대화 통합) ⭐⭐⭐ NEW ⭐⭐⭐ ====================
async function generateProfessionalResponse(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);

  console.log(`💬 전문 답변: "${user_query}"`);

  // ⭐ 질문 정규화 (동의어 처리)
  let normalizedQuery = user_query
    .replace(/A\s*렝스|A\s*랭스|에이\s*렝스|에이\s*랭스|A\s*기장/gi, 'A Length')
    .replace(/B\s*렝스|B\s*랭스|비\s*렝스|비\s*랭스|B\s*기장/gi, 'B Length')
    .replace(/C\s*렝스|C\s*랭스|씨\s*렝스|씨\s*랭스|C\s*기장/gi, 'C Length')
    .replace(/D\s*렝스|D\s*랭스|디\s*렝스|디\s*랭스|D\s*기장/gi, 'D Length')
    .replace(/E\s*렝스|E\s*랭스|이\s*렝스|이\s*랭스|E\s*기장/gi, 'E Length')
    .replace(/F\s*렝스|F\s*랭스|에프\s*렝스|에프\s*랭스|F\s*기장/gi, 'F Length')
    .replace(/G\s*렝스|G\s*랭스|지\s*렝스|지\s*랭스|G\s*기장/gi, 'G Length')
    .replace(/H\s*렝스|H\s*랭스|에이치\s*렝스|에이치\s*랭스|H\s*기장/gi, 'H Length')
    .replace(/레이어|layer/gi, 'Layer')
    .replace(/그래쥬에이션|그라데이션|graduation/gi, 'Graduation');

  if (normalizedQuery !== user_query) {
    console.log(`📝 질문 정규화: "${user_query}" → "${normalizedQuery}"`);
  }

  // 1. 간단한 인사말 감지
  const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워', '여보세요'];
  const isSimpleGreeting = simpleGreetings.some(g => {
    const query = user_query.toLowerCase().trim();
    return query === g ||
      query === g + '하세요' ||
      query === g + '!' ||
      query === g + '?';
  }) && user_query.length < 15;

  if (isSimpleGreeting) {
    const greetingResponses = {
      korean: '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "렝스별로 설명해줘"\n• "레이어드 컷이 뭐야?"\n• "G Length가 뭐야?"\n• "얼굴형에 맞는 스타일 추천해줘"',
      english: 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "Explain length categories"\n• "What is layered cut?"\n• "Recommend styles for my face shape"',
      japanese: 'こんにちは！ヘアスタイルについて何でも聞いてください。😊',
      chinese: '你好！请随便问关于发型的问题。😊',
      vietnamese: 'Xin chào! Hỏi gì về kiểu tóc cũng được. 😊'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: greetingResponses[userLanguage] || greetingResponses['korean']
      })
    };
  }

  // 2. 보안 키워드 필터링
  const securityKeywords = [
    '42포뮬러', '42개 포뮬러', '42 formula',
    '9매트릭스', '9개 매트릭스', '9 matrix',
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
    '42층', '7개 섹션', '7 section'
  ];

  const isSecurityQuery = securityKeywords.some(keyword =>
    user_query.toLowerCase().includes(keyword.toLowerCase())
  );

  if (isSecurityQuery) {
    const securityResponse = {
      korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"\n• "헤어 길이 분류 시스템"',
      english: 'I apologize, but that information is proprietary to the 2WAY CUT system.\n\nHow about these questions instead?\n• "Basic principles of layer cut"\n• "Recommended styles by face shape"',
      japanese: '申し訳ございませんが、その情報は企業秘密です。',
      chinese: '抱歉，该信息属于核心商业机密。',
      vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh.'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: securityResponse[userLanguage] || securityResponse['korean'],
        security_filtered: true
      })
    };
  }

  // 3. theory_chunks 확장 검색 실행 (연관 개념 포함)
  const theoryChunks = await searchTheoryChunksEnhanced(normalizedQuery, geminiKey, supabaseUrl, supabaseKey);

  console.log(`📚 theory_chunks 확장 검색 결과: ${theoryChunks.length}개`);

  // ⭐ 유사도 필터링 (낮은 점수 제거)
  const filteredChunks = theoryChunks.filter(chunk =>
    (chunk.combined_score || chunk.vector_similarity || 0) > 0.5
  );

  console.log(`🎯 필터링 후: ${filteredChunks.length}개`);

  // 4. 검색 결과에 따라 프롬프트 생성
  let systemPrompt;

  if (filteredChunks.length > 0) {
    // ⭐ 청크 배열 직접 전달
    systemPrompt = buildTheoryBasedPrompt(normalizedQuery, filteredChunks, userLanguage);
  } else {
    // 일반 지식 기반 답변
    systemPrompt = buildGeneralPrompt(normalizedQuery, userLanguage);
  }

  // 5. GPT 답변 생성
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user_query }
        ],
        temperature: 0.5,        // ⬆️ 0.3 → 0.5
        max_tokens: 1200,        // ⬆️ 300 → 1200
        top_p: 0.9,              // ➕ 추가
        presence_penalty: 0.1    // ➕ 추가
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();

    const gptResponse = data.choices[0].message.content;
    console.log(`✅ GPT 응답 생성 완료 (${gptResponse.length}자)`);
    console.log(`📝 응답 내용: "${gptResponse.substring(0, 100)}..."`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: gptResponse,
        theory_used: filteredChunks.length > 0,
        theory_count: filteredChunks.length
      })
    };
  } catch (error) {
    console.error('💥 GPT 호출 실패:', error);

    // 폴백: 간단한 응답
    const fallbackResponse = {
      korean: '죄송합니다. 답변 생성 중 오류가 발생했습니다.\n다시 시도해주시거나, 더 구체적으로 질문해주세요.',
      english: 'Sorry, an error occurred while generating the response.\nPlease try again or ask more specifically.',
      japanese: '申し訳ございません。エラーが発生しました。',
      chinese: '抱歉，生成回复时出错。',
      vietnamese: 'Xin lỗi, đã xảy ra lỗi khi tạo phản hồi.'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: fallbackResponse[userLanguage] || fallbackResponse['korean']
      })
    };
  }
}

// ==================== 이론 기반 프롬프트 (시스템 지식 주입) ====================
function buildTheoryBasedPrompt(query, theoryChunks, language) {
  // ⭐ 전체 컨텍스트 활용 (500자 제한 제거!)
  const contextText = theoryChunks.map((chunk, idx) => {
    const title = chunk.section_title || '이론 자료';
    const category = chunk.category_code ? `[${chunk.category_code}/${chunk.sub_category || ''}]` : '';
    const page = chunk.page_number ? `(p.${chunk.page_number})` : '';
    const content = chunk.content_ko || chunk.content || '';
    const similarity = chunk.vector_similarity ? `(${(chunk.vector_similarity * 100).toFixed(1)}% 매칭)` : '';
    const keywords = chunk.keywords?.slice(0, 5).join(', ') || '';

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【참고 ${idx + 1}】${category} ${title} ${page} ${similarity}
${keywords ? `🔑 키워드: ${keywords}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${content}
    `;
  }).join('\n\n');

  // ⭐ 2WAY CUT 시스템 전체 지식 주입
  const systemKnowledge = `
【2WAY CUT 시스템 기초 지식】

1. 길이 체계 (8단계) - Body Landmark 기준 ⭐
   | 코드 | 신체 기준점 | 설명 |
   |-----|-----------|------|
   | H | 귀볼(EAR LOBE) 높이 또는 위 | Very Short, 픽시컷 |
   | G | 턱선(JAWLINE/CHIN) | Short Bob, 목 완전히 보임 |
   | F | 턱 아래, 어깨 위 | Bob, 목 일부 가림 |
   | E | 어깨선/쇄골(SHOULDER) | Medium, 어깨에 닿음 |
   | D | 쇄골 아래, 겨드랑이 위 | Semi-Long |
   | C | 겨드랑이/가슴선(CHEST) | Long |
   | B | 가슴 아래, 중간 등 | Very Long |
   | A | 허리/배꼽 이하 | Super Long |

   ⚠️ 판단 순서:
   1. 머리카락 끝이 턱 위? → H 또는 G
   2. 턱 아래, 어깨 안 닿음? → F (Bob)
   3. 어깨에 닿음? → E (Medium)
   4. 쇄골 아래로 넘어감? → D 이하

2. 컷 폼 (3가지):
   - O (One Length): 원렝스, 같은 길이, 0도 리프팅
   - G (Graduation): 그래쥬에이션, 하단 무게, 0~89도
   - L (Layer): 레이어, 전체 움직임, 90도 이상

3. 섹션 체계 - 존별 적용:
   | 존 | 권장 섹션 | 설명 |
   |-----|---------|------|
   | Back | DBS | 볼륨/층 형성 |
   | Side | VS | 얼굴 라인 유지 |
   | Top | DBS/VS | 볼륨에 따라 |
   | Fringe | HS | 앞머리 정리 |

4. 리프팅 각도 (9단계) ⭐:
   - L0 (0°) → 원렝스 (Natural Fall)
   - L1 (22.5°) → Low Graduation
   - L2 (45°) → Mid Graduation (무게감 있는 층)
   - L3 (67.5°) → High Graduation
   - L4 (90°) ⭐ Square Layer (기본 레이어)
   - L5 (112.5°) → High Layer
   - L6 (135°) → Very High Layer
   - L7 (157.5°) → 정수리 레이어
   - L8 (180°) → On Base (완전 수직)

   ⚠️ 무게감 있는 레이어 → L2~L3 (L4 아님!)

5. 볼륨 존 (각도 기반):
   - Low Volume: 0~44° (하단 무게)
   - Medium Volume: 45~89° (중단 볼륨)
   - High Volume: 90°+ (상단 볼륨)
  `;

  const prompts = {
    korean: `당신은 2WAY CUT 시스템을 **완벽히 이해한 20년차 전문가**입니다.

${systemKnowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
사용자 질문: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

다음은 질문과 관련된 상세 자료입니다:

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

답변 작성 지침:
1. **위 기초 지식을 바탕으로** 질문을 해석
2. **검색된 자료로 뒷받침**하며 답변
3. **연관 개념을 함께 설명** (예: A Length → B Length와 비교, Layer 기법 연결)
4. **실무 관점 추가** (얼굴형, 난이도, 주의사항)
5. **구조화된 답변** (3-5개 단락)

⚠️ 절대 금지: "크리스기", "CHRISKI", "2WAY CUT 시스템에 의하면", "투웨이컷" 등 시스템명/출처 언급 금지!
그냥 전문가처럼 자연스럽게 설명하세요.`,

    english: `You are a 20-year veteran expert who **completely understands** the 2WAY CUT system.

${systemKnowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User Question: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Related detailed materials:

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Answer Guidelines:
1. **Interpret the question based on foundational knowledge**
2. **Support with retrieved materials**
3. **Explain related concepts** (e.g., A Length → compare with B Length, connect to Layer techniques)
4. **Add practical insights** (face shapes, difficulty, precautions)
5. **Structured answer** (3-5 paragraphs)

⚠️ NEVER mention: "CHRISKI", "2WAY CUT system says...", "According to 2WAY CUT..." - No source references!
Just explain naturally like an expert.`,

    japanese: `あなたは2WAY CUTシステムを**完全に理解した20年のベテラン専門家**です。

${systemKnowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
質問: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

関連資料:

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

回答ガイドライン:
1. **基礎知識に基づいて**質問を解釈
2. **検索資料で裏付け**ながら回答
3. **関連概念を一緒に説明**
4. **実務観点を追加** (顔型、難易度、注意事項)
5. **構造化された回答** (3-5段落)

⚠️ 絶対禁止: "CHRISKI", "2WAY CUT システムによると" など出典の言及禁止！
専門家のように自然に説明してください。`,

    chinese: `您是**完全理解**2WAY CUT系统的20年资深专家。

${systemKnowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
问题: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

相关资料:

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

回答指南:
1. **基于基础知识**理解问题
2. **用检索资料支持**回答
3. **解释相关概念**
4. **添加实务观点** (脸型、难度、注意事项)
5. **结构化回答** (3-5段)

⚠️ 绝对禁止: "CHRISKI", "根据2WAY CUT系统" 等出处提及禁止！
像专家一样自然地解释。`,

    vietnamese: `Bạn là chuyên gia 20 năm kinh nghiệm **hoàn toàn hiểu** hệ thống 2WAY CUT.

${systemKnowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Câu hỏi: "${query}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tài liệu liên quan:

${contextText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hướng dẫn trả lời:
1. **Dựa trên kiến thức cơ bản** để hiểu câu hỏi
2. **Hỗ trợ bằng tài liệu tìm được**
3. **Giải thích khái niệm liên quan**
4. **Thêm quan điểm thực tế** (hình dạng khuôn mặt, độ khó, lưu ý)
5. **Câu trả lời có cấu trúc** (3-5 đoạn)

⚠️ Cấm tuyệt đối: "CHRISKI", "Theo hệ thống 2WAY CUT" - Cấm đề cập nguồn!
Giải thích tự nhiên như chuyên gia.`
  };

  return prompts[language] || prompts['korean'];
}

// ==================== 일반 프롬프트 (참고자료 없을 때) ====================
function buildGeneralPrompt(query, language) {
  const prompts = {
    korean: `질문: ${query}

(정확한 자료 없음)

일반 지식으로 2문장 답변:`,

    english: `Question: ${query}

(No exact data)

Answer in 2 sentences:`,

    japanese: `質問: ${query}

(データなし)

2文で答えて:`,

    chinese: `问题: ${query}

(无数据)

2句话:`,

    vietnamese: `Câu hỏi: ${query}

(Không có dữ liệu)

2 câu:`
  };

  return prompts[language] || prompts['korean'];
}

// ==================== 이미지+질문 분석 (Gemini Vision) ====================
async function analyzeImageWithQuestion(payload, geminiKey) {
  const { image_base64, mime_type, question, language } = payload;

  console.log(`📸 Gemini Vision 이미지 분석 시작`);
  console.log(`📝 질문: ${question}`);

  const systemPrompt = `당신은 CHRISKI 2WAY CUT 시스템을 완벽히 이해한 헤어 전문가입니다.

## 내부 분석 (전문 용어 사용)
이미지를 보고 다음을 정확히 분석하세요:

### 🎯 LENGTH 분류 (가장 중요!) ⭐⭐⭐⭐⭐

🚨🚨🚨 **판단 전 필수 단계:** 🚨🚨🚨
1. 이미지에서 뒷머리(후면) 가장 긴 부분 찾기
2. 그 끝이 닿는 **신체 부위**를 정확히 식별
3. 아래 표에서 해당 부위 찾아 코드 결정

| 코드 | 신체 부위 | 약 cm | 설명 |
|------|----------|-------|-----|
| **H** | 후두부/목덜미 | ~10cm | 목 시작점 |
| **G** | 목 상단 | ~15cm | 목 위쪽 |
| **F** | 목 하단 | ~20cm | 목 아래쪽 |
| **E** | 어깨선 상단 | ~25cm | 어깨 바로 위 |
| **D** | 어깨선 하단 | ~30cm | 어깨에서 끝 |
| **C** | 겨드랑이 | ~40cm | 겨드랑이 높이 |
| **B** | 가슴 중간 | ~50cm | 가슴 중간 ⭐ |
| **A** | 가슴 하단/허리 | 60cm+ | 허리까지 |

🔴🔴🔴 **핵심 구분법:**
- 머리가 **가슴에 닿으면** → 무조건 **B 또는 A** (절대 D 아님!)
- 머리가 **겨드랑이까지 내려오면** → **C** (절대 D 아님!)
- 머리가 **어깨에만 닿으면** → **D 또는 E**
- 머리가 **목에서 끝나면** → **F, G, H**

❌❌❌ **흔한 오류 (절대 금지!):**
1. 가슴까지 오는 긴 머리를 D로 분류 → **틀림! B가 정답**
2. 겨드랑이까지 오는데 D로 분류 → **틀림! C가 정답**
3. 50cm 이상 긴 머리를 어깨 길이(30cm)로 판단 → **틀림!**

### 형태(Cut Form):
- O (One Length/원렝스): 무게선이 있는 일자 커트
- G (Graduation/그래쥬에이션): 0-89도, 층이 살짝 있음
- L (Layer/레이어): 90도 이상, 가벼운 층

## 외부 응답 (자연어로!)
❌ 금지: "H1SQ_DB1", "L4", "DBS NO.2" 같은 코드
✅ 필수: "턱선 길이의 단정한 보브", "어깨선까지 오는 미디엄"

## 응답 형식
**📏 길이 분석**
- (A~H 중 하나) Length: (구체적 설명)

**✂️ 형태 분석**
- (O/G/L 중 하나): (특징 설명)

**💇 스타일 특징**
- (볼륨, 질감, 앞머리 등)

**💡 추천 포인트**
- (이 스타일이 어울리는 얼굴형, 관리법 등)`;

  const userPrompt = question || '이 헤어스타일을 분석해주세요.';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + '\n\n사용자 질문: ' + userPrompt },
                {
                  inline_data: {
                    mime_type: mime_type,
                    data: image_base64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('✅ Gemini Vision 분석 완료');
    console.log('📝 응답 미리보기:', responseText.substring(0, 200));

    // Length 추출
    const lengthMatch = responseText.match(/([A-H])\s*Length/i);
    const extractedLength = lengthMatch ? lengthMatch[1].toUpperCase() + ' Length' : null;

    // 형태 추출
    let extractedForm = null;
    if (responseText.includes('One Length') || responseText.includes('원렝스')) {
      extractedForm = 'O (One Length)';
    } else if (responseText.includes('Graduation') || responseText.includes('그래쥬에이션')) {
      extractedForm = 'G (Graduation)';
    } else if (responseText.includes('Layer') || responseText.includes('레이어')) {
      extractedForm = 'L (Layer)';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          response: responseText,
          parameters: {
            length_category: extractedLength,
            cut_form: extractedForm
          }
        }
      })
    };

  } catch (error) {
    console.error('💥 analyzeImageWithQuestion Error:', error);
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

// ==================== 이미지 분석 (Gemini 2.0 Flash Vision) ====================
async function analyzeImage(payload, openaiKey) {
  const { image_base64, mime_type, user_gender } = payload;

  // Gemini API 키 가져오기
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error('❌ GEMINI_API_KEY not configured');
    throw new Error('Gemini API key not configured');
  }

  console.log(`🎯 이미지 분석 시작 (Gemini 2.0 Flash) - 사용자 선택 성별: ${user_gender || 'unspecified'}`);

  const genderContext = user_gender === 'male'
    ? `\n\n⚠️ IMPORTANT: This is a MALE hairstyle. Focus on men's cut categories and techniques.\n- Use "Men's Cut" for cut_category\n- Select from mens_cut_category options\n- Consider typical male length ranges (mostly E~H Length)`
    : user_gender === 'female'
      ? `\n\n⚠️ IMPORTANT: This is a FEMALE hairstyle. Focus on women's cut categories and techniques.\n- Use "Women's Cut" for cut_category\n- Select from womens_cut_category options\n- Consider typical female length ranges (A~H Length)`
      : `\n\nAnalyze the hairstyle gender and select appropriate cut_category.`;

  const systemPrompt = `You are "HAIRGATOR AI," an expert hair analyst.
${genderContext}

## LENGTH CLASSIFICATION (Body Landmark) ⭐⭐⭐⭐⭐ MOST CRITICAL!

🚨🚨🚨 **MANDATORY STEPS BEFORE CLASSIFICATION:** 🚨🚨🚨
1. Find the LONGEST part of BACK hair (not front/side)
2. Identify EXACTLY which BODY PART the hair tip touches
3. Match to the table below

| Code | Body Part | ~cm | Description |
|------|-----------|-----|-------------|
| **H** | Nape/Occipital | ~10cm | Hair ends at neck start |
| **G** | Upper Neck | ~15cm | Upper neck area |
| **F** | Lower Neck | ~20cm | Lower neck area |
| **E** | Upper Shoulder | ~25cm | Just above shoulder |
| **D** | Lower Shoulder | ~30cm | Shoulder level |
| **C** | Armpit | ~40cm | Armpit level |
| **B** | Mid Chest | ~50cm | Mid chest ⭐ |
| **A** | Lower Chest/Waist | 60cm+ | Below chest to waist |

🔴🔴🔴 **CRITICAL DISTINCTION:**
- Hair reaches **CHEST** → ALWAYS **B or A** (NEVER D!)
- Hair reaches **ARMPIT** → ALWAYS **C** (NEVER D!)
- Hair ends at **SHOULDER ONLY** → **D or E**
- Hair ends at **NECK** → **F, G, or H**

❌❌❌ **COMMON ERRORS TO AVOID (ABSOLUTELY FORBIDDEN!):**
1. Classifying chest-length hair as D → WRONG! Answer is **B**
2. Classifying armpit-length hair as D → WRONG! Answer is **C**
3. Classifying 50cm+ hair as shoulder-length (30cm) → WRONG!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## OTHER KEY PARAMETERS

**Cut Form (with parentheses!):**
- "O (One Length)" / "G (Graduation)" / "L (Layer)"

**Lifting Range (array!):**
- ["L0"] / ["L2"] / ["L2", "L4"]

**Volume Zone:**
- Low (0-44°) / Medium (45-89°) / High (90°+)

**Face Shape Match (1-3 selections!):**
- ["Oval", "Round"] or ["Square", "Heart", "Long"] etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT - MUST BE VALID JSON!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON object with these exact fields:
{
  "cut_category": "Women's Cut" or "Men's Cut",
  "womens_cut_category": "Layer Cut" or "Graduation Cut" or "One Length" or "Combination Cut",
  "mens_cut_category": "Two Block" or "Dandy Cut" or "Pomade Style" or "Textured Crop" or "Classic Cut" or "Fade Cut" or "Undercut" or "Comma Hair" or null,
  "length_category": "A Length" or "B Length" or "C Length" or "D Length" or "E Length" or "F Length" or "G Length" or "H Length",
  "cut_form": "O (One Length)" or "G (Graduation)" or "L (Layer)",
  "texture_type": "Straight" or "Wavy" or "Curly" or "Coily",
  "hair_density": "Thin" or "Medium" or "Thick",
  "hair_thickness": "Fine" or "Medium" or "Coarse",
  "face_shape_match": ["Oval", "Round", "Square", "Heart", "Long", "Diamond"],
  "style_mood": "Natural" or "Modern" or "Classic" or "Trendy" or "Elegant" or "Casual" or "Edgy" or "Romantic",
  "age_group_target": "10s" or "20s" or "30s" or "40s" or "50s+",
  "maintenance_level": "Low" or "Medium" or "High",
  "styling_difficulty": "Easy" or "Medium" or "Hard",
  "bangs_style": "No Bangs" or "Full Bangs" or "Side Bangs" or "See-through Bangs" or "Curtain Bangs" or "Baby Bangs" or "Wispy Bangs",
  "parting_style": "Center Part" or "Side Part" or "No Part" or "Zigzag Part" or "Deep Side Part",
  "overall_silhouette": "Round" or "Oval" or "Square" or "A-line" or "V-line" or "Asymmetric",
  "weight_line_position": "High" or "Medium" or "Low",
  "graduation_degree": "None" or "Low (15-30°)" or "Medium (31-45°)" or "High (46-60°)",
  "layer_type": "None" or "Surface Layer" or "Internal Layer" or "Disconnected Layer" or "Uniform Layer",
  "volume_zone": "Low" or "Medium" or "High",
  "lifting_range": ["L0", "L2", "L4", "L6", "L8"],
  "crown_volume": "Flat" or "Natural" or "Boosted" or "Maximum",
  "nape_treatment": "Tapered" or "Rounded" or "Square" or "V-shape" or "Disconnected",
  "perimeter_line": "Blunt" or "Textured" or "Feathered" or "Razored" or "Point Cut",
  "interior_texture": "Solid" or "Sliced" or "Chunky" or "Wispy",
  "outline_shape": "Straight" or "Curved" or "Asymmetric" or "Disconnected",
  "recommended_styling_products": ["Wax", "Mousse", "Serum", "Spray", "Pomade", "Gel", "Cream", "Oil"],
  "heat_styling_required": true or false,
  "recommended_tools": ["Round Brush", "Flat Iron", "Curling Iron", "Diffuser", "Blow Dryer", "Hot Rollers"],
  "color_recommendation": "Natural" or "Warm Tones" or "Cool Tones" or "Vivid" or "Pastel" or "Balayage" or "Highlights" or "Ombre",
  "scalp_visibility": "None" or "Minimal" or "Moderate" or "High",
  "suitability_for_thinning_hair": "Good" or "Moderate" or "Poor",
  "seasonal_recommendation": ["Spring", "Summer", "Fall", "Winter"],
  "occasion_match": ["Daily" or "Office" or "Date" or "Party" or "Wedding" or "Interview"],
  "back_view_shape": "U-shape" or "V-shape" or "Straight" or "Rounded" or "Layered",
  "side_profile_volume": "Flat" or "Natural" or "Full" or "Dramatic",
  "front_framing": "Face Framing" or "Curtain" or "Blunt" or "Layered" or "None",
  "ear_exposure": "Full" or "Partial" or "None",
  "neck_exposure": "Full" or "Partial" or "None",
  "versatility_score": 1-10,
  "trend_score": 1-10,
  "celebrity_reference": "string or null",
  "similar_style_keywords": ["keyword1", "keyword2", "keyword3"],
  "contradicted_styles": ["style1", "style2"],
  "grow_out_maintenance_weeks": 4-12,
  "difficulty_for_stylist": "Beginner" or "Intermediate" or "Advanced" or "Expert",
  "consultation_notes": "string",
  "key_cutting_points": ["point1", "point2", "point3"],
  "potential_issues": ["issue1", "issue2"],
  "client_home_care_tips": ["tip1", "tip2", "tip3"]
}

Return ONLY the JSON object, no markdown, no explanation, no code blocks!`;

  try {
    console.log('📸 Gemini 2.0 Flash Vision 분석 시작');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mime_type,
                  data: image_base64
                }
              },
              {
                text: systemPrompt
              }
            ]
          }],
          generationConfig: {
            temperature: 0,  // 완전 결정적 출력
            maxOutputTokens: 4000,
            responseMimeType: "application/json"  // JSON 출력 강제
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Gemini 응답에서 텍스트 추출
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response text from Gemini');
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const params56 = JSON.parse(cleanedText);

    // 🔍 Gemini 원본 응답 로깅 (디버깅용)
    console.log('🔍 Gemini 원본 length_category:', params56.length_category);
    console.log('🔍 Gemini 원본 cut_form:', params56.cut_form);
    console.log('🔍 Gemini 전체 응답:', JSON.stringify(params56).substring(0, 500));

    // 성별 강제 적용
    if (user_gender === 'male' && params56.cut_category !== "Men's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Men's Cut`);
      params56.cut_category = "Men's Cut";
    } else if (user_gender === 'female' && params56.cut_category !== "Women's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Women's Cut`);
      params56.cut_category = "Women's Cut";
    }

    console.log('✅ Gemini 2.0 Flash Vision 분석 완료');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: params56,
        user_gender: user_gender,
        model: 'gemini-2.0-flash',
        method: 'vision_analysis'
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
      'H Length': '픽시컷 숏',
      'G Length': '짧은 보브',
      'F Length': '보브 단발',
      'E Length': '어깨선 미디엄',
      'D Length': '어깨 아래 미디엄',
      'C Length': '세미롱',
      'B Length': '가슴 롱헤어',
      'A Length': '허리 롱헤어'
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
          match_threshold: 0.55,
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
  const allDiagrams = [];

  recipeSamples.forEach(sample => {
    const parts = sample.sample_code.split('_');
    const styleCode = parts[0];
    const stepNumber = parseInt(parts[1]) || 1;

    const diagramIndex = stepNumber - 1;

    if (sample.diagram_images &&
      Array.isArray(sample.diagram_images) &&
      sample.diagram_images[diagramIndex]) {

      allDiagrams.push({
        style_code: styleCode,
        step_number: stepNumber,
        image_url: sample.diagram_images[diagramIndex],
        recipe_text: sample.recipe_full_text_ko,
        similarity: sample.similarity,
        sample_code: sample.sample_code
      });
    }
  });

  // 유사도 순으로 정렬
  allDiagrams.sort((a, b) => b.similarity - a.similarity);

  // step_number 중복 제거 (같은 step이면 유사도 높은 것만 유지)
  const seenSteps = new Set();
  const selectedDiagrams = [];

  for (const diagram of allDiagrams) {
    if (!seenSteps.has(diagram.step_number)) {
      seenSteps.add(diagram.step_number);
      selectedDiagrams.push(diagram);
    }
  }

  // step_number 순서대로 정렬
  selectedDiagrams.sort((a, b) => a.step_number - b.step_number);

  console.log(`📊 도해도 추출: ${recipeSamples.length}개 샘플 → ${allDiagrams.length}개 → 중복제거 ${selectedDiagrams.length}개`);

  const final = selectedDiagrams.slice(0, maxDiagrams);

  console.log(`✅ 최종 선택: ${final.length}개 도해도 (step: ${final.map(d => d.step_number).join(',')})`);

  return final;
}

// ==================== 여성 기장(Length) 상세 설명 ====================
const FEMALE_LENGTH_DETAILS = {
  'A': {
    code: 'A Length',
    ko: '허리 롱헤어',
    en: 'Waist Long',
    position: '가슴 하단/허리',
    description: '가장 긴 기장. 허리선까지 내려오는 롱헤어. 무게감이 많고 볼륨 조절이 중요.',
    characteristics: ['무게감 최대', '레이어로 볼륨 조절 필수', '관리 난이도 높음'],
    suitableFor: ['풍성한 머릿결', '여성스러운 이미지 강조', '다양한 업스타일 가능']
  },
  'B': {
    code: 'B Length',
    ko: '가슴 롱헤어',
    en: 'Chest Long',
    position: '가슴 중간',
    description: '가슴 중간까지 내려오는 롱헤어. 가장 대중적인 롱헤어 길이.',
    characteristics: ['대중적인 롱헤어', '레이어/그라데이션 다양하게 적용', '스타일링 다양'],
    suitableFor: ['기본 롱헤어 선호', '웨이브/컬 스타일링', '다양한 묶음 스타일']
  },
  'C': {
    code: 'C Length',
    ko: '세미롱',
    en: 'Semi Long',
    position: '겨드랑이/가슴 상단',
    description: '겨드랑이에서 가슴 상단 사이. 롱과 미디엄의 중간 길이로 활용도 높음.',
    characteristics: ['롱과 미디엄 중간', '관리 용이', '다양한 스타일 가능'],
    suitableFor: ['관리 편한 롱헤어', '직장인/활동적인 분', '묶음/풀기 모두 가능']
  },
  'D': {
    code: 'D Length',
    ko: '어깨 아래 미디엄',
    en: 'Below Shoulder Medium',
    position: '어깨선 하단',
    description: '어깨선에 닿아 밖으로 뻗치기 쉬운 길이. 컬이나 웨이브로 뻗침 보완 필요.',
    characteristics: ['어깨에 닿아 뻗치기 쉬움', '컬/웨이브 권장', '그라데이션으로 무게 조절'],
    suitableFor: ['펌 스타일 선호', '볼륨감 원하는 분', '세미롱으로 기르는 중간 단계']
  },
  'E': {
    code: 'E Length',
    ko: '어깨선 미디엄',
    en: 'Shoulder Medium',
    position: '어깨선 상단',
    description: '어깨선 길이보다 조금 짧은 길이. 뻗침이 적고 단정한 미디엄 스타일.',
    characteristics: ['어깨 위 단정한 길이', 'D보다 뻗침 적음', '보브와 미디엄 중간'],
    suitableFor: ['단정한 이미지', '직장인/면접', '관리 쉬운 중간 길이']
  },
  'F': {
    code: 'F Length',
    ko: '보브 단발',
    en: 'Bob',
    position: '턱선 아래',
    description: '턱선 아래 목까지의 보브 길이. 클래식한 단발 스타일.',
    characteristics: ['클래식 보브', '턱선 아래~목', '세련된 단발'],
    suitableFor: ['세련된 이미지', '얼굴형 보완', '관리 용이한 단발']
  },
  'G': {
    code: 'G Length',
    ko: '짧은 보브',
    en: 'Short Bob',
    position: '턱선 위',
    description: '턱선 위까지의 짧은 보브. 얼굴이 더 드러나고 시원한 느낌.',
    characteristics: ['짧은 보브', '턱선 위', '얼굴 노출 많음'],
    suitableFor: ['시원한 이미지', '개성 있는 스타일', '여름철/활동적인 분']
  },
  'H': {
    code: 'H Length',
    ko: '픽시컷 숏',
    en: 'Pixie Short',
    position: '후두부/목덜미',
    description: '숏 헤어. 픽시컷, 베리숏 등 가장 짧은 여성 기장.',
    characteristics: ['숏 헤어/픽시컷', '가장 짧은 기장', '개성 강한 스타일'],
    suitableFor: ['개성 강한 이미지', '관리 최소화', '시원하고 활동적인 스타일']
  }
};

// ==================== 언어별 용어 ====================
function getTerms(lang) {
  const terms = {
    ko: {
      lengthDesc: {
        'H Length': FEMALE_LENGTH_DETAILS['H'].position + ' (Short)',
        'G Length': FEMALE_LENGTH_DETAILS['G'].position + ' (Bob)',
        'F Length': FEMALE_LENGTH_DETAILS['F'].position + ' (Bob)',
        'E Length': FEMALE_LENGTH_DETAILS['E'].position + ' (Medium)',
        'D Length': FEMALE_LENGTH_DETAILS['D'].position + ' (Medium)',
        'C Length': FEMALE_LENGTH_DETAILS['C'].position + ' (Semi Long)',
        'B Length': FEMALE_LENGTH_DETAILS['B'].position + ' (Long)',
        'A Length': FEMALE_LENGTH_DETAILS['A'].position + ' (Long)'
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
        'H Length': 'Nape/Occipital (Short)',
        'G Length': 'Upper Neck (Bob)',
        'F Length': 'Lower Neck (Bob)',
        'E Length': 'Upper Shoulder (Medium)',
        'D Length': 'Lower Shoulder (Medium)',
        'C Length': 'Armpit/Upper Chest (Semi Long)',
        'B Length': 'Mid Chest (Long)',
        'A Length': 'Lower Chest/Waist (Long)'
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

// ==================== 얼굴형-스타일 매칭 (이론 기반) ====================
/**
 * 2WAY CUT 이론에 기반한 얼굴형-스타일 매칭
 *
 * 이론 출처: general_theory.md
 * - WARM (둥근형/Round): Graduation, Round Form, 부드러운 곡선
 * - NEUTRAL (달걀형/Oval, 하트형/Heart, 땅콩형/Peanut): Graduation & Layer 혼합, Square Form
 * - COOL (각진형/Hexagon, 긴형/Bomb): Layer, Triangular Form, 직선적 실루엣
 */
function getSuitableFaceShapes(form, silhouette, outlineShape) {
  const suitableFaces = [];
  const reasons = [];

  // Form 기반 매칭 (O=One Length, G=Graduation, L=Layer)
  const formCode = (form || '').charAt(0).toUpperCase();

  // Silhouette/Outline 기반 매칭
  const sil = (silhouette || '').toLowerCase();
  const outline = (outlineShape || '').toLowerCase();

  // ========== Graduation (G) 스타일 ==========
  if (formCode === 'G' || formCode === 'O') {
    // Graduation: 둥근형(Round), 달걀형(Oval)에 잘 어울림
    suitableFaces.push('둥근형 (Round)');
    reasons.push('그래쥬에이션의 부드러운 볼륨감이 둥근 얼굴의 귀여움을 살려줍니다');

    suitableFaces.push('달걀형 (Oval)');
    reasons.push('균형잡힌 달걀형 얼굴에 자연스러운 볼륨을 더해줍니다');

    if (sil.includes('round') || outline.includes('round')) {
      suitableFaces.push('하트형 (Heart)');
      reasons.push('라운드 실루엣이 좁은 턱선을 부드럽게 보완해줍니다');
    }
  }

  // ========== Layer (L) 스타일 ==========
  if (formCode === 'L') {
    // Layer: 긴 얼굴형, 각진형에 잘 어울림
    suitableFaces.push('긴 얼굴형 (Long)');
    reasons.push('레이어의 옆 볼륨이 긴 얼굴을 가로로 넓어보이게 해줍니다');

    suitableFaces.push('각진형 (Square)');
    reasons.push('레이어의 자연스러운 움직임이 각진 윤곽을 부드럽게 만들어줍니다');

    suitableFaces.push('달걀형 (Oval)');
    reasons.push('어떤 스타일도 잘 소화하는 달걀형에 세련미를 더해줍니다');

    if (sil.includes('triangular') || outline.includes('triangular')) {
      suitableFaces.push('하트형 (Heart)');
      reasons.push('트라이앵귤러 라인이 이마의 넓이와 조화를 이룹니다');
    }
  }

  // ========== Silhouette 추가 매칭 ==========
  if (sil.includes('square') || outline.includes('square')) {
    if (!suitableFaces.includes('둥근형 (Round)')) {
      suitableFaces.push('둥근형 (Round)');
      reasons.push('스퀘어 라인이 둥근 얼굴에 세련된 구조감을 더해줍니다');
    }
  }

  if (sil.includes('triangular') || outline.includes('triangular')) {
    if (!suitableFaces.includes('긴 얼굴형 (Long)')) {
      suitableFaces.push('긴 얼굴형 (Long)');
      reasons.push('앞쪽이 강조되는 트라이앵귤러 라인이 얼굴 길이를 분산시킵니다');
    }
  }

  // 기본값 (모든 얼굴형)
  if (suitableFaces.length === 0) {
    suitableFaces.push('달걀형 (Oval)', '둥근형 (Round)', '긴 얼굴형 (Long)');
    reasons.push('다양한 얼굴형에 두루 어울리는 스타일입니다');
  }

  return {
    faceShapes: [...new Set(suitableFaces)].slice(0, 3),  // 중복 제거, 최대 3개
    reasons: [...new Set(reasons)].slice(0, 3)
  };
}

/**
 * 남자 스타일 코드 기반 얼굴형 매칭 (이론 기반)
 *
 * 【7개 대분류 상세 설명】
 *
 * SF (Side Fringe, 사이드 프린지)
 * - 핵심: 이마를 자연스럽게 덮고 한쪽 방향으로 흐르는 스타일
 * - 특징: 동안 이미지, 내추럴, 이마 노출 부담 없음
 * - 얼굴형: 긴 얼굴/넓은 이마에 적합 (이마를 가려 비율 조절)
 *
 * SP (Side Part, 사이드 파트)
 * - 핵심: 또렷한 가르마 라인이 핵심인 클래식 스타일
 * - 특징: 단정하고 신뢰감, 비즈니스/프로페셔널 이미지
 * - 얼굴형: 달걀형/긴형에 적합 (균형감 있는 분배)
 *
 * FU (Fringe Up, 프린지 업)
 * - 핵심: 앞머리를 위로 올려 이마를 완전히 드러내는 스타일
 * - 특징: 시원하고 남성적, 자신감/카리스마
 * - 얼굴형: 둥근형/짧은형에 적합 (세로 길이 강조)
 *
 * PB (Pushed Back, 푸시드 백)
 * - 핵심: 상단 전체를 뒤로 넘기는 스타일 (볼륨백/슬릭백)
 * - 특징: 성숙하고 세련됨, 고급스러움, 이목구비 드러남
 * - 얼굴형: 각진형/달걀형에 적합 (강한 턱선과 조화)
 *
 * BZ (Buzz Cut, 버즈 컷)
 * - 핵심: 클리퍼로 두피에 가깝게 밀어내는 초단발
 * - 특징: 강인함, 미니멀, 관리 매우 쉬움
 * - 얼굴형: 둥근 두상/달걀형에 적합 (두상 형태 그대로 노출)
 *
 * CP (Crop Cut, 크롭 컷)
 * - 핵심: 상단 짧게 커트 + 앞쪽으로 떨어뜨리는 모던 스타일
 * - 특징: 트렌디함, 스트리트 감성, 초저관리형
 * - 얼굴형: 둥근형/긴형에 적합 (텍스처로 볼륨 조절)
 *
 * MC (Mohican, 모히칸)
 * - 핵심: 사이드 짧게, 중앙만 길게 세우는 강한 대비 스타일
 * - 특징: 스포티, 개성 강함, 카리스마
 * - 얼굴형: 둥근형/사각형에 적합 (세로 길이 강조)
 */
function getMaleSuitableFaceShapes(styleCode) {
  const code = (styleCode || 'SF').toUpperCase();

  const styleMapping = {
    'SF': {
      faceShapes: ['긴 얼굴형 (Long)', '각진형 (Square)', '넓은 이마형'],
      reasons: [
        '옆으로 내린 앞머리가 긴 얼굴 길이를 분산시켜줍니다',
        '이마를 가려 얼굴 비율을 조절해줍니다',
        '부드러운 라인이 각진 윤곽을 완화해줍니다'
      ],
      styleInfo: '이마를 자연스럽게 덮고 한쪽으로 흐르는 스타일. 동안/내추럴 이미지.',
      styling: '드라이로 앞쪽으로 말린 후, 소량의 왁스로 질감 정리',
      targetCustomer: ['이마 넓은 분', '이마 노출 부담스러운 분', '동안 이미지 원하는 분']
    },
    'SP': {
      faceShapes: ['달걀형 (Oval)', '긴 얼굴형 (Long)', '하트형 (Heart)'],
      reasons: [
        '가르마 라인이 얼굴에 세로 균형감을 더해줍니다',
        '깔끔한 분배가 달걀형의 균형미를 살려줍니다',
        '사이드 볼륨으로 좁은 턱선을 보완해줍니다'
      ],
      styleInfo: '또렷한 가르마 라인이 핵심인 클래식 스타일. 단정하고 신뢰감 있는 이미지.',
      styling: '왁스나 포마드로 볼륨과 윤기감을 살려 완성',
      targetCustomer: ['직장인', '비즈니스룩', '프로페셔널 이미지 원하는 분']
    },
    'FU': {
      faceShapes: ['둥근형 (Round)', '짧은 얼굴형', '달걀형 (Oval)'],
      reasons: [
        '올린 앞머리가 얼굴을 세로로 길어보이게 해줍니다',
        '이마가 드러나면서 시원하고 활동적인 이미지를 줍니다',
        '볼륨감이 둥근 얼굴에 세련미를 더해줍니다'
      ],
      styleInfo: '앞머리를 위로 올려 이마 완전 노출. 시원하고 자신감 있는 남성미.',
      styling: '드라이로 앞머리 위로 세운 뒤 왁스/스프레이로 고정',
      targetCustomer: ['활동적/스포티한 이미지', '강한 남성미/카리스마 원하는 분']
    },
    'PB': {
      faceShapes: ['각진형 (Square)', '달걀형 (Oval)', '긴 얼굴형 (Long)'],
      reasons: [
        '뒤로 넘긴 스타일이 강한 턱선과 조화를 이룹니다',
        '깔끔하고 세련된 인상을 강조해줍니다',
        '이마를 드러내 자신감 있는 이미지를 연출합니다'
      ],
      styleInfo: '상단 전체를 뒤로 넘기는 스타일. 볼륨백 또는 슬릭백. 성숙하고 세련된 이미지.',
      styling: '고정력 강한 포마드/왁스로 뒤 방향 흐름 만든 후 고정',
      targetCustomer: ['클래식한 스타일 선호', '정장/댄디/포멀룩', '성숙한 이미지 원하는 분']
    },
    'BZ': {
      faceShapes: ['달걀형 (Oval)', '둥근형 (Round)', '균형잡힌 두상'],
      reasons: [
        '짧은 커트로 두상 형태가 그대로 보여 균형잡힌 두상에 적합합니다',
        '깔끔하고 남성적인 이미지를 강조해줍니다',
        '관리가 쉽고 시원한 인상을 줍니다'
      ],
      styleInfo: '클리퍼로 두피에 가깝게 밀어내는 초단발. 강인하고 미니멀한 이미지.',
      styling: '별도 스타일링 불필요. 샴푸만 하고 바로 외출 가능.',
      targetCustomer: ['손질 귀찮은 분', '운동 많이 하는 분', '두상 좋은 분', '강한 이미지']
    },
    'CP': {
      faceShapes: ['둥근형 (Round)', '긴 얼굴형 (Long)', '달걀형 (Oval)'],
      reasons: [
        '텍스처 있는 앞머리가 둥근 얼굴에 입체감을 더해줍니다',
        '짧고 깔끔한 라인이 모던한 느낌을 줍니다',
        '윗부분 볼륨으로 얼굴 비율을 조절할 수 있습니다'
      ],
      styleInfo: '상단 짧게 커트 + 앞쪽으로 떨어뜨리는 모던 스타일. 트렌디하고 초저관리형.',
      styling: '손질 거의 불필요. 단정하면서도 트렌디한 스타일.',
      targetCustomer: ['여름철/활동량 많은 분', '트렌디하면서 관리 쉬운 스타일', '스트리트 감성']
    },
    'MC': {
      faceShapes: ['둥근형 (Round)', '각진형 (Square)', '짧은 얼굴형'],
      reasons: [
        '중앙의 높이가 둥근 얼굴을 길어보이게 해줍니다',
        '강렬한 실루엣이 개성 있는 인상을 만들어줍니다',
        '사이드를 짧게 해 얼굴 너비를 좁아보이게 합니다'
      ],
      styleInfo: '사이드 짧게, 중앙만 길게 세우는 강한 대비 스타일. 스포티하고 개성 강한 이미지.',
      styling: '고정력 강한 왁스/스프레이로 상단을 위로 세워 고정. 관리 난이도 중~상.',
      targetCustomer: ['개성 강한 스타일', '스포티/퍼포먼스 이미지', '확실한 존재감 원하는 분']
    }
  };

  return styleMapping[code] || styleMapping['SF'];
}

// ==================== theory_chunks 하이브리드 검색 ====================
async function searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, matchCount = 5) {
  try {
    console.log(`🔍 theory_chunks 하이브리드 검색: "${query}"`);

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
      return await fallbackKeywordSearch(query, supabaseUrl, supabaseKey, matchCount);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/hybrid_search_theory_chunks`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          query_text: query,
          vector_threshold: 0.60,    // ⬆️ 0.55 → 0.60 (더 엄격)
          vector_count: 20,          // ⬆️ 10 → 20
          keyword_count: 20,         // ⬆️ 10 → 20
          final_count: matchCount * 2  // ⬆️ 더 많이 가져오기
        })
      }
    );

    if (!rpcResponse.ok) {
      console.warn(`⚠️ 하이브리드 검색 실패 (${rpcResponse.status}), 폴백 시작`);
      return await fallbackVectorSearch(queryEmbedding, supabaseUrl, supabaseKey, matchCount);
    }

    const results = await rpcResponse.json();
    console.log(`✅ 하이브리드 검색 ${results.length}개 완료`);

    if (results.length > 0) {
      console.log('📊 상위 3개 결과:');
      results.slice(0, 3).forEach((r, idx) => {
        const vectorScore = (r.vector_similarity * 100).toFixed(1);
        const combinedScore = (r.combined_score * 100).toFixed(1);
        console.log(`  ${idx + 1}. 종합: ${combinedScore}% | 벡터: ${vectorScore}% | 키워드: ${r.keyword_match_count}개`);
      });
    }

    return results;

  } catch (error) {
    console.error('💥 theory_chunks 검색 오류:', error);
    return [];
  }
}

// ============ 연관 개념 추출 ============
function extractRelatedConcepts(query) {
  const expansions = [];
  const lowerQuery = query.toLowerCase();

  // 길이 관련
  if (/[a-h]\s*(length|렝스|랭스|기장)/i.test(query)) {
    expansions.push('길이 분류 체계', 'Length Category System');
  }

  // 컷 폼 관련
  if (/layer|레이어/i.test(query)) {
    expansions.push('Graduation 그래쥬에이션', 'One Length 원렝스', 'Cut Form');
  }
  if (/graduation|그래쥬에이션/i.test(query)) {
    expansions.push('Layer 레이어', 'One Length 원렝스', 'Cut Form');
  }
  if (/one\s*length|원렝스/i.test(query)) {
    expansions.push('Layer 레이어', 'Graduation 그래쥬에이션', 'Cut Form');
  }

  // 섹션 관련
  if (/dfs|diagonal\s*forward/i.test(query)) {
    expansions.push('DBS Diagonal Backward', 'Sectioning System', '전대각섹션');
  }
  if (/dbs|diagonal\s*backward/i.test(query)) {
    expansions.push('DFS Diagonal Forward', 'Sectioning System', '후대각섹션');
  }
  if (/\bvs\b|vertical\s*section/i.test(query)) {
    expansions.push('HS Horizontal', 'Sectioning System', '세로섹션');
  }
  if (/\bhs\b|horizontal\s*section/i.test(query)) {
    expansions.push('VS Vertical', 'Sectioning System', '가로섹션');
  }

  // 리프팅/각도 관련
  if (/l[0-8]|lifting|리프팅|각도/i.test(query)) {
    expansions.push('Volume Zone 볼륨존', 'Lifting Range', '리프팅 각도');
  }

  // 볼륨 관련
  if (/volume|볼륨/i.test(query)) {
    expansions.push('Lifting Angle 리프팅각도', 'Volume Zone', '볼륨 분류');
  }

  return expansions.slice(0, 2); // 최대 2개
}

// ============ 확장 검색 (연관 개념 포함) ============
async function searchTheoryChunksEnhanced(query, geminiKey, supabaseUrl, supabaseKey) {
  console.log(`🔍 확장 검색: "${query}"`);

  // 1. 메인 검색
  const mainResults = await searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, 10);
  console.log(`📊 메인 검색: ${mainResults.length}개`);

  // 2. 연관 개념 검색
  const relatedQueries = extractRelatedConcepts(query);
  console.log(`🔗 연관 검색: ${relatedQueries.join(', ')}`);

  let expandedResults = [];
  for (const relatedQuery of relatedQueries) {
    const results = await searchTheoryChunks(relatedQuery, geminiKey, supabaseUrl, supabaseKey, 5);
    expandedResults = expandedResults.concat(results);
  }
  console.log(`📚 확장 검색: ${expandedResults.length}개`);

  // 3. 병합 및 중복 제거
  const allResults = [...mainResults, ...expandedResults];
  const uniqueResults = Array.from(
    new Map(allResults.map(r => [r.id, r])).values()
  );

  // 4. 점수 재정렬
  const sorted = uniqueResults
    .sort((a, b) => {
      const scoreA = a.combined_score || a.vector_similarity || 0;
      const scoreB = b.combined_score || b.vector_similarity || 0;
      return scoreB - scoreA;
    })
    .slice(0, 15);

  console.log(`✅ 최종 결과: ${sorted.length}개 (유니크)`);
  return sorted;
}

async function fallbackVectorSearch(queryEmbedding, supabaseUrl, supabaseKey, matchCount) {
  try {
    console.log('⚠️ 폴백: 기존 벡터 검색 수행');

    const response = await fetch(
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
          match_threshold: 0.3,      // ⬇️ 0.55 → 0.3 (더 관대하게)
          match_count: matchCount * 2  // ⬆️ 더 많이 가져오기
        })
      }
    );

    if (!response.ok) {
      console.error('❌ 벡터 검색 폴백 실패');
      return [];
    }

    const results = await response.json();
    console.log(`✅ 벡터 검색 ${results.length}개 완료`);
    return results;

  } catch (error) {
    console.error('💥 벡터 검색 폴백 오류:', error);
    return [];
  }
}

async function fallbackKeywordSearch(query, supabaseUrl, supabaseKey, matchCount) {
  try {
    console.log('⚠️ 폴백: 키워드 검색만 수행');

    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/theory_chunks?select=*&limit=${matchCount * 2}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('❌ 키워드 검색 실패');
      return [];
    }

    const allData = await response.json();

    const scored = allData.map(item => {
      let score = 0;
      const itemText = `${item.content || ''} ${item.content_ko || ''} ${(item.keywords || []).join(' ')}`.toLowerCase();

      keywords.forEach(kw => {
        if (itemText.includes(kw)) score++;
      });

      return { ...item, keyword_score: score };
    });

    const results = scored
      .filter(item => item.keyword_score > 0)
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, matchCount);

    console.log(`✅ 키워드 검색 ${results.length}개 완료`);
    return results;

  } catch (error) {
    console.error('💥 키워드 검색 오류:', error);
    return [];
  }
}

// ==================== 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    const searchQuery = buildSearchQuery(params56);
    console.log(`🔍 검색 쿼리: "${searchQuery}"`);

    const targetGender = params56.cut_category?.includes("Women") ? 'female' : 'male';
    const recipeSamples = await searchRecipeSamples(
      supabaseUrl,
      supabaseKey,
      geminiKey,
      searchQuery,
      targetGender,
      params56.length_category
    );

    const selectedDiagrams = selectBestDiagrams(recipeSamples, 15);
    console.log(`✅ 도해도 선별 완료: ${selectedDiagrams.length}개`);

    const theoryChunks = await searchTheoryChunks(
      searchQuery,
      geminiKey,
      supabaseUrl,
      supabaseKey,
      5
    );
    console.log(`✅ theory_chunks 검색 완료: ${theoryChunks.length}개`);

    const theoryContext = theoryChunks.length > 0
      ? theoryChunks.map((t, idx) =>
        `${idx + 1}. ${t.section_title || '이론'}: ${(t.content_ko || t.content || '').substring(0, 100)}...`
      ).join('\n')
      : '(이론 참고 자료 없음)';

    const diagramsContext = selectedDiagrams.map((d, idx) =>
      `${idx + 1}단계: ${d.sample_code} (유사도 ${(d.similarity * 100).toFixed(0)}%)\n   설명: ${d.recipe_text.substring(0, 100)}...`
    ).join('\n\n');

    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    const faceShapesKo = (params56.face_shape_match || [])
      .map(shape => langTerms.faceShapeDesc[shape] || shape)
      .join(', ');

    const enhancedPrompt = `당신은 전문 헤어 스타일리스트입니다.

**분석 결과:**
- 길이: ${params56.length_category} (${langTerms.lengthDesc[params56.length_category]})
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone} (${volumeDesc})
- 앞머리: ${params56.fringe_type || '없음'}
- 어울리는 얼굴형: ${faceShapesKo || '모든 얼굴형'}

**📚 이론적 근거 (${theoryChunks.length}개):**

${theoryContext}

**🎯 선별된 도해도 순서 (${selectedDiagrams.length}개):**

${diagramsContext}

**📋 작성 지침:**

위의 이론과 도해도 순서를 **정확히 따라서** 레시피를 작성하세요.

### STEP 1: 전체 개요 (2-3줄)
### STEP 2: 상세 커팅 순서 (${selectedDiagrams.length}단계)
### STEP 3: 질감 처리
### STEP 4: 스타일링 가이드
### STEP 5: 유지 관리

💡 설명을 포함하여 충분히 상세하게 작성하세요. 한국어로만 작성하세요.`;

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
        max_tokens: 3000
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const data = await completion.json();
    let recipe = data.choices[0].message.content;

    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 레시피 생성 완료');

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
          matched_samples: recipeSamples.slice(0, 3),
          theory_chunks: theoryChunks,
          theory_count: theoryChunks.length
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

async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  return await generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey);
}

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

// ==================== 스트리밍 응답 생성 (확장 검색 + 시스템 지식 주입) ====================
async function generateProfessionalResponseStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query } = payload;
  console.log('🔄 스트리밍 응답 시작:', user_query);

  const userLanguage = detectLanguage(user_query);

  // 쿼리 정규화
  let normalizedQuery = user_query
    .replace(/A\s*렝스|A\s*랭스|에이\s*렝스|에이\s*랭스|A\s*기장/gi, 'A Length')
    .replace(/B\s*렝스|B\s*랭스|비\s*렝스|비\s*랭스|B\s*기장/gi, 'B Length')
    .replace(/C\s*렝스|C\s*랭스|씨\s*렝스|씨\s*랭스|C\s*기장/gi, 'C Length')
    .replace(/D\s*렝스|D\s*랭스|디\s*렝스|디\s*랭스|D\s*기장/gi, 'D Length')
    .replace(/E\s*렝스|E\s*랭스|이\s*렝스|이\s*랭스|E\s*기장/gi, 'E Length')
    .replace(/F\s*렝스|F\s*랭스|에프\s*렝스|에프\s*랭스|F\s*기장/gi, 'F Length')
    .replace(/G\s*렝스|G\s*랭스|지\s*렝스|지\s*랭스|G\s*기장/gi, 'G Length')
    .replace(/H\s*렝스|H\s*랭스|에이치\s*렝스|에이치\s*랭스|H\s*기장/gi, 'H Length')
    .replace(/레이어|layer/gi, 'Layer')
    .replace(/그래쥬에이션|그라데이션|graduation/gi, 'Graduation');

  // 간단한 인사말 처리
  const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워', '여보세요'];
  const isGreeting = simpleGreetings.some(g => {
    const query = user_query.toLowerCase().trim();
    return query === g || query === g + '하세요' || query === g + '!' || query === g + '?';
  }) && user_query.length < 15;

  if (isGreeting) {
    const greetingResponses = {
      korean: '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "렝스별로 설명해줘"\n• "레이어드 컷이 뭐야?"\n• "G Length가 뭐야?"\n• "얼굴형에 맞는 스타일 추천해줘"',
      english: 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "Explain length categories"\n• "What is layered cut?"\n• "Recommend styles for my face shape"',
      japanese: 'こんにちは！ヘアスタイルについて何でも聞いてください。😊',
      chinese: '你好！请随便问关于发型的问题。😊',
      vietnamese: 'Xin chào! Hỏi gì về kiểu tóc cũng được. 😊'
    };
    const msg = greetingResponses[userLanguage] || greetingResponses['korean'];
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
    };
  }

  // 보안 키워드 체크
  const securityKeywords = ['42포뮬러', '42개 포뮬러', '42 formula', '9매트릭스', '9개 매트릭스', '9 matrix', 'DBS NO', 'DFS NO', 'VS NO', 'HS NO', '42층', '7개 섹션', '7 section'];
  const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));
  if (isSecurityQuery) {
    const securityResponse = {
      korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"\n• "헤어 길이 분류 시스템"',
      english: 'I apologize, but that information is proprietary to the 2WAY CUT system.\n\nHow about these questions instead?\n• "Basic principles of layer cut"\n• "Recommended styles by face shape"'
    };
    const msg = securityResponse[userLanguage] || securityResponse['korean'];
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
    };
  }

  // ⭐⭐⭐ 확장 검색 (연관 개념 포함) ⭐⭐⭐
  console.log('🔍 확장 이론 검색 시작:', normalizedQuery);
  const theoryChunks = await searchTheoryChunksEnhanced(normalizedQuery, geminiKey, supabaseUrl, supabaseKey);
  console.log(`📚 검색된 이론: ${theoryChunks.length}개`);

  // ⭐ 유사도 필터링 (낮은 점수 제거)
  const filteredChunks = theoryChunks.filter(chunk =>
    (chunk.combined_score || chunk.vector_similarity || 0) > 0.5
  );
  console.log(`🎯 필터링 후: ${filteredChunks.length}개`);

  // 시스템 프롬프트 빌드 (개선된 버전 사용)
  let systemPrompt;
  if (filteredChunks.length > 0) {
    systemPrompt = buildTheoryBasedPrompt(normalizedQuery, filteredChunks, userLanguage);
  } else {
    systemPrompt = buildGeneralPrompt(normalizedQuery, userLanguage);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: user_query }],
        temperature: 0.5,         // ⬆️ 0.3 → 0.5
        max_tokens: 1200,         // ⬆️ 300 → 1200
        top_p: 0.9,               // ➕ 추가
        presence_penalty: 0.1,    // ➕ 추가
        stream: true
      })
    });

    if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);

    // ⭐ Web Streams API로 처리 (Netlify Functions 호환)
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBuffer = '';
    let streamBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop() || ''; // 마지막 불완전한 라인 보관

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
          try {
            const jsonData = trimmedLine.slice(6);
            if (jsonData.trim()) {
              const data = JSON.parse(jsonData);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                sseBuffer += `data: ${JSON.stringify({ type: 'content', content })}\n\n`;
              }
            }
          } catch (e) {
            // JSON 파싱 실패 무시
          }
        }
      }
    }
    sseBuffer += 'data: [DONE]\n\n';

    console.log(`✅ 스트리밍 응답 완료 (버퍼 길이: ${sseBuffer.length})`);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      body: sseBuffer
    };
  } catch (error) {
    console.error('💥 스트리밍 오류:', error.message);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'error', error: `답변 생성 중 오류: ${error.message}` })}\n\ndata: [DONE]\n\n`
    };
  }
}

// ==================== Gemini File Search 기반 응답 (NEW!) ====================
// 14개 PDF가 업로드된 File Search Store 사용
const GEMINI_FILE_SEARCH_STORE = "fileSearchStores/hairgator2waycutstore-md6skhedgag7";

// 시스템 프롬프트 (CHRISKI 2WAY CUT 4계층 시스템 통합)
function buildGeminiSystemPrompt(userLanguage) {
  const coreKnowledge = `
【CHRISKI 2WAY CUT 시스템 - 4계층 통합 체계】

■ 계층 1: 2WAY CUT 철학 (핵심 원리)
모든 헤어커트는 Guide Panel을 기준으로 진행:
- 02.1Way Backward: Guide → Long (뒤로 갈수록 김)
- 02.1Way Forward: Short → Guide (앞으로 갈수록 김)
- 02.2Way Cut: Short ← Guide → Short (정수리 중심 양방향)

■ 계층 2: 89개 전문 용어 (실무 디자이너 언어)
[필수 Tier 1 - 15개]
- 02. 1Way Cut & 2Way Cut: 모든 커트의 DNA
- 54. Lifting (리프팅): L0(0°)~L8(180°) 9단계
- 33. Direction (방향): D0(정면)~D8(360° 전체) 9단계
- 70. Section: Horizontal(가로)/Diagonal(대각)/Vertical(세로)
- 05. A Zone & V Zone: 무게(A) vs 볼륨(V) 축
- 89. Zone: C존(상단)/B존(중단)/A존(하단)
- 52. Layer: Round Layer / Square Layer
- 44. Graduation: Decreasing / Increasing / Parallel
- 31. Design Line: Stationary(고정) / Mobile(이동) / Combination(혼합)
- 35. Distribution: Natural(자연) / Perpendicular(수직) / Shifted(변이)
- 62. Over Direction: On Base / Forward / Backward
- 19. Blunt Cut, 11. Base Control, 09. Balance

■ 계층 3: 42개 포뮬러 (공식 체계)
[7개 섹션 구조]
1. HS (가로섹션): 2층 - 아웃라인 결정 (SQUARE/ROUND)
2. DBS (후대각섹션): 7층 - 무게 흐름 제어
3. DFS (전대각섹션): 6층 - 측면 부피 조절
4. VS (세로섹션): 12층 - V Zone 볼륨 형성
5. 특수 섹션: 네이프/업스컵 등

[포뮬러 코드 예시]
- H1SQ_DB1 = HS NO.1(SQUARE) + DBS NO.1
- H1SQ_DB1_V6 = HS NO.1(SQUARE) + DBS NO.1 + VS NO.6
- DF1_JCRL = DFS NO.1 + J CURL

■ 계층 4: 70개 스타일 (실전 구현)
[시리즈별 구성]
- FHL: Short (H Length) - 픽시컷, 베리숏
- FGL: Bob (G Length) - 짧은 단발
- FFL: Bob (F Length) - 단발
- FEL: Medium (E Length) - 어깨선 상단
- FDL: Medium (D Length) - 어깨선 하단
- FCL: Semi Long (C Length) - 겨드랑이/가슴 상단
- FBL: Long (B Length) - 가슴 중간
- FAL: Long (A Length) - 가슴 하단/허리

■ 길이(Length) 체계 - Body Landmark 기준
- H Length: 후두부/목덜미 (Short) → FHL 시리즈
- G Length: 목 상단 (Bob)
- F Length: 목 하단 (Bob)
- E Length: 어깨선 상단 (Medium)
- D Length: 어깨선 하단 (Medium)
- C Length: 겨드랑이/가슴 상단 (Semi Long)
- B Length: 가슴 중간 (Long)
- A Length: 가슴 하단/허리 (Long, 가장 김)

■ 컬러(Color) / 펌(Perm) 이론
- PDF 자료에서 검색하여 답변
`;

  const prompts = {
    korean: `당신은 CHRISKI 2WAY CUT 시스템을 완벽히 이해한 헤어 AI입니다.

## 내부 처리 (절대 유저에게 노출 금지)
${coreKnowledge}

## 외부 표현 (유저에게 보여줄 것)
- 자연스러운 한국어로 설명
- 시각적 비유 사용 ("앞에서 뒤로", "정수리 중심")
- 쉬운 설명 ("일자로 자르기", "층 내기")

## 응답 가이드

### 이미지 업로드 시
1. 내부: 89개 용어 + 핵심 파라미터로 분석
2. 외부: "턱선 길이의 단정한 보브" 같은 자연어
3. 매칭: Top-3 스타일 추천
4. 레시피: 자연어 4단계 (아래쪽→측면→정수리→뒷머리)

### 텍스트 질문 시
- "단발 추천해줘" → "관리 쉬운 일자 단발" (X: H1SQ_DB1)
- "둥근 얼굴 어울려요?" → "각진 아웃라인으로 세로 라인 강조" (X: 70.Section Vertical)
- "유행 스타일 뭐예요?" → "부드러운 웨이브 보브" (X: H1RD_DB3)

## 금지 사항 (지적재산권 보호)
❌ "H1SQ_DB1_V6" - 포뮬러 코드 언급 금지
❌ "54.Lifting L0" - 용어 번호 노출 금지
❌ "02.1Way Backward" - 내부 코드 노출 금지
❌ "HS NO.1(SQUARE)" - 섹션 코드 금지
❌ "DBS NO.2" - 시스템 코드 금지
❌ "크리스기", "CHRISKI", "2WAY CUT 시스템에 의하면", "투웨이컷" - 시스템명 언급 금지
❌ 출처 언급 금지 - 그냥 전문가처럼 자연스럽게 설명

## 필수 포함 (자연어 변환)
✅ "앞쪽 기준선에서 뒤로 진행" (1Way Backward 대체)
✅ "정수리 중심으로 양쪽" (2Way Cut 대체)
✅ "자연스럽게 떨어지는 각도" (Lifting 대체)
✅ "일자로 자르기" / "층 내기" (Blunt/Layer 대체)

답변 형식:
1. **추천 스타일**: 질문에 대한 직접적인 추천 (1-2문장)
2. **특징 설명**: 쉬운 말로 구체적 설명 (3-5개 항목)
3. **실무 팁**: 관리법이나 주의사항 (선택)

모든 전문 지식은 내부에서만 사용하고, 유저에게는 친절하고 쉬운 말로 설명하세요.`,

    english: `You are a Hair AI that completely understands the CHRISKI 2WAY CUT system.

## Internal Processing (NEVER expose to users)
${coreKnowledge}

## External Expression (Show to users)
- Use natural, friendly language
- Visual metaphors ("from front to back", "centered at crown")
- Simple explanations ("cut straight across", "add layers")

## Response Guide

### When Image Uploaded
1. Internal: Analyze with 89 terms + 42 formulas
2. External: Natural language like "a neat chin-length bob"
3. Matching: Top-3 style recommendations
4. Recipe: 4-step natural language guide

### When Text Question
- "Recommend short hair" → "Easy-to-manage straight bob" (NOT: H1SQ_DB1)
- "Good for round face?" → "Angular outline to emphasize vertical lines" (NOT: 70.Section Vertical)

## Prohibited (Intellectual Property Protection)
❌ Formula codes like "H1SQ_DB1_V6"
❌ Term numbers like "54.Lifting L0"
❌ Internal codes like "02.1Way Backward"
❌ Section codes like "HS NO.1(SQUARE)"
❌ System names like "CHRISKI", "2WAY CUT system says...", "According to 2WAY CUT..."
❌ Never mention sources - just explain naturally like an expert

## Required (Natural Language Conversion)
✅ "Progress from front guideline to back" (replaces 1Way Backward)
✅ "Work from crown outward both sides" (replaces 2Way Cut)
✅ "Natural falling angle" (replaces Lifting)
✅ "Cut straight" / "Add layers" (replaces technical terms)

Answer format:
1. **Recommendation**: Direct answer (1-2 sentences)
2. **Features**: Easy explanation (3-5 items)
3. **Pro Tips**: Care tips or considerations (optional)

Use all professional knowledge internally, but explain to users in friendly, simple terms.`
  };

  return prompts[userLanguage] || prompts['korean'];
}

// 일반 응답 (비스트리밍)
async function generateGeminiFileSearchResponse(payload, geminiKey) {
  const { user_query } = payload;
  const userLanguage = detectLanguage(user_query);

  console.log(`🔍 Gemini File Search 응답: "${user_query}"`);

  // 간단한 인사말 처리
  const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워'];
  const isGreeting = simpleGreetings.some(g => {
    const query = user_query.toLowerCase().trim();
    return query === g || query === g + '하세요' || query === g + '!' || query === g + '?';
  }) && user_query.length < 15;

  if (isGreeting) {
    const msg = userLanguage === 'english'
      ? 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "What is A Length?"\n• "Explain Zone division"\n• "Difference between Layer and Graduation"'
      : '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "A Length가 뭐야?"\n• "존 구분을 어떻게해?"\n• "Layer와 Graduation 차이는?"';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: msg })
    };
  }

  // 보안 키워드 체크 (42포뮬러 원리 관련 질문 차단)
  const securityKeywords = [
    // 42포뮬러 관련
    '42포뮬러', '42개 포뮬러', '42 formula', '42공식', '42가지', '42개의',
    'forty two', 'fortytwo', '포뮬러 원리', 'formula 원리', '공식 원리',
    '42가지 공식', '42개 공식', '42종', '42종류',
    // 9매트릭스 관련
    '9매트릭스', '9 matrix', '나인매트릭스', 'nine matrix',
    // 섹션 NO 조합 (영업 기밀)
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
    'dbs no', 'dfs no', 'vs no', 'hs no'
  ];
  const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));

  if (isSecurityQuery) {
    const msg = '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n이 내용은 정규 교육과정에서만 배울 수 있습니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"\n• "헤어 길이 분류 시스템"';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: msg, security_filtered: true })
    };
  }

  try {
    // Gemini File Search API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: user_query }]
          }],
          systemInstruction: {
            parts: [{ text: buildGeminiSystemPrompt(userLanguage) }]
          },
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [GEMINI_FILE_SEARCH_STORE]
            }
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4000,  // ⬆️ 2048 → 4000 (긴 응답 지원)
            topP: 0.9
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성할 수 없습니다.';

    console.log(`✅ Gemini 응답 완료 (${answer.length}자)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: answer,
        method: 'gemini_file_search'
      })
    };

  } catch (error) {
    console.error('💥 Gemini File Search 오류:', error.message);

    // 에러 시 간단한 폴백 메시지
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: '죄송합니다. 답변 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        error: error.message
      })
    };
  }
}

// 스트리밍 응답
async function generateGeminiFileSearchResponseStream(payload, geminiKey) {
  const { user_query, chat_history, recipe_context } = payload;
  const userLanguage = detectLanguage(user_query);

  console.log(`🔍 Gemini File Search 스트리밍: "${user_query}"`);
  console.log(`🔑 Gemini Key 앞 15자: ${geminiKey ? geminiKey.substring(0, 15) : 'MISSING'}...`);

  // ⭐ 레시피 컨텍스트 로깅
  if (recipe_context) {
    console.log(`📋 레시피 컨텍스트 있음:`, recipe_context.analysis?.styleCode || recipe_context.analysis?.lengthName);
  }

  // 간단한 인사말 처리
  const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워'];
  const isGreeting = simpleGreetings.some(g => {
    const query = user_query.toLowerCase().trim();
    return query === g || query === g + '하세요' || query === g + '!' || query === g + '?';
  }) && user_query.length < 15;

  if (isGreeting) {
    const msg = userLanguage === 'english'
      ? 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "What is A Length?"\n• "Explain Zone division"\n• "Difference between Layer and Graduation"'
      : '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "A Length가 뭐야?"\n• "존 구분을 어떻게해?"\n• "Layer와 Graduation 차이는?"';

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
    };
  }

  // 보안 키워드 체크 (42포뮬러 원리 관련 질문 차단)
  const securityKeywords = [
    // 42포뮬러 관련
    '42포뮬러', '42개 포뮬러', '42 formula', '42공식', '42가지', '42개의',
    'forty two', 'fortytwo', '포뮬러 원리', 'formula 원리', '공식 원리',
    '42가지 공식', '42개 공식', '42종', '42종류',
    // 9매트릭스 관련
    '9매트릭스', '9 matrix', '나인매트릭스', 'nine matrix',
    // 섹션 NO 조합 (영업 기밀)
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
    'dbs no', 'dfs no', 'vs no', 'hs no'
  ];
  const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));

  if (isSecurityQuery) {
    const msg = '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n이 내용은 정규 교육과정에서만 배울 수 있습니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"';

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n`
    };
  }

  try {
    // 대화 히스토리를 Gemini 형식으로 변환
    const contents = [];

    // 이전 대화 히스토리 추가 (있으면)
    if (chat_history && Array.isArray(chat_history) && chat_history.length > 0) {
      console.log(`📜 대화 히스토리 ${chat_history.length}개 포함`);

      for (const msg of chat_history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // 현재 사용자 질문 추가
    contents.push({
      role: 'user',
      parts: [{ text: user_query }]
    });

    // ⭐ 시스템 프롬프트 생성 (레시피 컨텍스트 포함)
    let systemPrompt = buildGeminiSystemPrompt(userLanguage);

    // ⭐ 레시피 컨텍스트가 있으면 추가
    if (recipe_context && recipe_context.analysis) {
      const ctx = recipe_context;
      let recipeInfo = '';

      if (ctx.gender === 'male') {
        // 스타일 코드에 따른 상세 설명 가져오기
        const styleCode = ctx.analysis.styleCode || 'SF';
        const maleStyleInfo = {
          'SF': { name: '사이드 프린지', desc: '이마를 자연스럽게 덮고 한쪽 방향으로 흐르는 스타일. 동안/내추럴 이미지. 이마 노출 부담 없음.', target: '이마 넓은 분, 동안 이미지 선호' },
          'SP': { name: '사이드 파트', desc: '또렷한 가르마 라인이 핵심인 클래식 스타일. 단정하고 신뢰감 있는 이미지.', target: '직장인, 비즈니스룩, 프로페셔널 이미지' },
          'FU': { name: '프린지 업', desc: '앞머리를 위로 올려 이마 완전 노출. 시원하고 자신감 있는 남성미.', target: '활동적/스포티한 이미지, 강한 남성미' },
          'PB': { name: '푸시드 백', desc: '상단 전체를 뒤로 넘기는 스타일. 볼륨백 또는 슬릭백. 성숙하고 세련된 이미지.', target: '클래식/댄디/포멀룩, 성숙한 이미지' },
          'BZ': { name: '버즈 컷', desc: '클리퍼로 두피에 가깝게 밀어내는 초단발. 강인하고 미니멀한 이미지. 관리 매우 쉬움.', target: '손질 귀찮은 분, 운동 많이 하는 분, 두상 좋은 분' },
          'CP': { name: '크롭 컷', desc: '상단 짧게 커트 + 앞쪽으로 떨어뜨리는 모던 스타일. 트렌디하고 초저관리형.', target: '여름철/활동량 많은 분, 스트리트 감성' },
          'MC': { name: '모히칸', desc: '사이드 짧게, 중앙만 길게 세우는 강한 대비 스타일. 스포티하고 개성 강한 이미지.', target: '개성 강한 스타일, 퍼포먼스/스포티 이미지' }
        };
        const currentStyle = maleStyleInfo[styleCode] || maleStyleInfo['SF'];

        recipeInfo = `
【현재 분석된 레시피 컨텍스트 - 남자 스타일】
사용자가 방금 이미지를 업로드하여 레시피를 생성했습니다. 다음은 분석 결과입니다:
- 스타일 코드: ${styleCode} (${currentStyle.name})
- 스타일 설명: ${currentStyle.desc}
- 추천 대상: ${currentStyle.target}
- 스타일명: ${ctx.analysis.styleName || '-'}
- 서브스타일: ${ctx.analysis.subStyle || '-'}
- 탑 길이: ${ctx.analysis.topLength || '-'}
- 사이드 길이: ${ctx.analysis.sideLength || '-'}
- 페이드: ${ctx.analysis.fadeType || 'None'}
- 텍스처: ${ctx.analysis.texture || '-'}
- 스타일링 방향: ${ctx.analysis.stylingDirection || '-'}

【7개 남자 스타일 대분류 참고】
- SF (사이드 프린지): 이마 덮고 옆으로 흐름, 동안/내추럴
- SP (사이드 파트): 가르마 클래식, 단정/비즈니스
- FU (프린지 업): 앞머리 위로 올림, 시원/자신감
- PB (푸시드 백): 뒤로 넘김, 성숙/세련
- BZ (버즈 컷): 초단발, 강인/미니멀
- CP (크롭 컷): 짧은 탑 + 앞으로 떨어뜨림, 트렌디/스트리트
- MC (모히칸): 중앙만 세움, 스포티/개성

사용자가 "왜 ${styleCode}야?", "${currentStyle.name}이 뭐야?", "페이드가 뭐야?" 등 분석 결과에 대해 질문하면 위 컨텍스트를 참조하여 답변하세요.`;
      } else {
        recipeInfo = `
【현재 분석된 레시피 컨텍스트 - 여자 스타일】
사용자가 방금 이미지를 업로드하여 레시피를 생성했습니다. 다음은 분석 결과입니다:
- 기장: ${ctx.analysis.lengthName || '-'} (A~H Length: A=허리, B=가슴, C=겨드랑이, D=어깨아래, E=어깨, F=턱, G=목, H=귀)
- 형태: ${ctx.analysis.form || '-'} (L=Layer, G=Graduation, O=One Length)
- 앞머리: ${ctx.analysis.hasBangs ? ctx.analysis.bangsType : '없음'}
- 볼륨 위치: ${Array.isArray(ctx.analysis.volumePosition) ? ctx.analysis.volumePosition.join(', ') : ctx.analysis.volumePosition || '-'}
- 텍스처: ${ctx.analysis.texture || '-'}
- 리프팅: ${Array.isArray(ctx.analysis.liftingRange) ? ctx.analysis.liftingRange.join(', ') : ctx.analysis.liftingRange || '-'}
- 섹션: ${ctx.analysis.sectionPrimary || '-'}
- 연결: ${ctx.analysis.connectionType || '-'}

사용자가 "왜 D Length야?", "레이어가 뭐야?", "리프팅이 뭐야?" 등 분석 결과에 대해 질문하면 위 컨텍스트를 참조하여 답변하세요.`;
      }

      systemPrompt = systemPrompt + '\n\n' + recipeInfo;
      console.log(`📋 레시피 컨텍스트를 시스템 프롬프트에 추가함`);
    }

    // Gemini File Search API 호출 (비스트리밍으로 전체 받아서 SSE로 변환)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [GEMINI_FILE_SEARCH_STORE]
            }
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4000,  // ⬆️ 2048 → 4000 (긴 레시피/응답 지원)
            topP: 0.9
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성할 수 없습니다.';

    console.log(`✅ Gemini 응답 완료 (${answer.length}자)`);

    // ⭐ 가이드 이미지 감지 (기장/스타일 가이드)
    const guideImage = detectGuideImageForQuery(user_query);
    if (guideImage) {
      console.log(`📸 가이드 이미지 감지: ${guideImage.title}`);
    }

    // ⭐ 이론 이미지 감지 (89개 이론 인덱스)
    // 언어별 이론 인덱스 매핑: korean→ko, english→en, japanese→ja, chinese→zh, vietnamese→vi
    const langCodeMap = { korean: 'ko', english: 'en', japanese: 'ja', chinese: 'zh', vietnamese: 'vi' };
    const theoryLang = langCodeMap[userLanguage] || 'ko';
    const theoryImage = await detectTheoryImageForQuery(user_query, theoryLang);
    if (theoryImage) {
      console.log(`📚 이론 이미지 감지: ${theoryImage.title} (${theoryImage.term})`);
    }

    // SSE 형식으로 변환 (청크 단위로 전송)
    let sseBuffer = '';
    const chunkSize = 50; // 50자씩 청크

    for (let i = 0; i < answer.length; i += chunkSize) {
      const chunk = answer.substring(i, i + chunkSize);
      sseBuffer += `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`;
    }

    // ⭐ 가이드 이미지가 있으면 이미지 이벤트 전송
    if (guideImage) {
      sseBuffer += `data: ${JSON.stringify({
        type: 'guide_image',
        imageUrl: guideImage.url,
        title: guideImage.title
      })}\n\n`;
    }

    // ⭐ 이론 이미지가 있으면 이미지 이벤트 전송 (가이드 이미지가 없을 때만)
    if (theoryImage && !guideImage) {
      sseBuffer += `data: ${JSON.stringify({
        type: 'guide_image',
        imageUrl: theoryImage.url,
        title: theoryImage.title,
        term: theoryImage.term,
        description: theoryImage.description,
        isTheory: true
      })}\n\n`;
    }

    sseBuffer += 'data: [DONE]\n\n';

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: sseBuffer
    };

  } catch (error) {
    console.error('💥 Gemini File Search 스트리밍 오류:', error.message);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ type: 'error', error: `답변 생성 중 오류: ${error.message}` })}\n\ndata: [DONE]\n\n`
    };
  }
}

// ==================== 가이드 이미지 URL (Firestore guide_images 컬렉션) ====================
const GUIDE_IMAGES = {
  female_length: {
    id: 'female_length_guide',
    url: 'https://storage.googleapis.com/hairgatormenu-4a43e.firebasestorage.app/guides/female_length_guide.png',
    title: '여자 기장 가이드',
    keywords: ['기장', '길이', 'length', '렝스', '랭스', 'a length', 'b length', 'c length', 'd length', 'e length', 'f length', 'g length', 'h length', '여자 기장', '여성 기장', '머리 길이', 'short', 'bob', 'medium', 'long', 'semi long']
  },
  male_style: {
    id: 'male_style_guide',
    url: 'https://storage.googleapis.com/hairgatormenu-4a43e.firebasestorage.app/guides/male_style_guide.png',
    title: '남자 스타일 가이드',
    keywords: ['남자', '남성', '스타일', 'side fringe', 'side part', 'fringe up', 'pushed back', 'buzz', 'crop', 'mohican', '내린머리', '가르마', '올린머리', '넘긴머리', '삭발', '크롭', '모히칸', 'sf', 'sp', 'fu', 'pb', 'bz', 'cp', 'mc', '남자 스타일', '남성 스타일', '앞머리']
  }
};

// ==================== 이론 인덱스 캐시 (Firestore에서 동적 로드) ====================
let theoryIndexCache = null;
let theoryIndexCacheTime = 0;
const THEORY_CACHE_TTL = 30 * 60 * 1000; // 30분 캐시

/**
 * Firestore에서 이론 인덱스 로드 (커트 89개 + 펌 46개 = 135개, 캐시 적용)
 */
async function loadTheoryIndexes() {
  // 캐시가 유효하면 재사용
  if (theoryIndexCache && (Date.now() - theoryIndexCacheTime < THEORY_CACHE_TTL)) {
    return theoryIndexCache;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/hairgatormenu-4a43e/databases/(default)/documents/theory_indexes?pageSize=200`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('❌ 이론 인덱스 로드 실패:', response.status);
      return null;
    }

    const data = await response.json();
    const indexes = [];

    if (data.documents) {
      for (const doc of data.documents) {
        const fields = doc.fields;
        const docId = doc.name.split('/').pop();

        // 키워드 배열 추출
        const keywords = [];
        if (fields.keywords?.arrayValue?.values) {
          fields.keywords.arrayValue.values.forEach(v => {
            if (v.stringValue) keywords.push(v.stringValue.toLowerCase());
          });
        }

        // term 추가 (영문명도 키워드로)
        if (fields.term?.stringValue) {
          keywords.push(fields.term.stringValue.toLowerCase());
        }

        // title_ko 추가 (한글명도 키워드로)
        if (fields.title_ko?.stringValue) {
          keywords.push(fields.title_ko.stringValue.toLowerCase());
        }

        // 이미지 URL 맵 추출
        const images = {};
        if (fields.images?.mapValue?.fields) {
          const imgFields = fields.images.mapValue.fields;
          ['ko', 'en', 'ja', 'zh', 'vi'].forEach(lang => {
            if (imgFields[lang]?.stringValue) {
              images[lang] = imgFields[lang].stringValue;
            }
          });
        }

        // type 추출 (perm: 펌 이론, 없으면 커트 이론)
        const theoryType = fields.type?.stringValue || 'cut';

        // textContent 추출 (언어별)
        const textContent = fields.textContent?.stringValue || '';

        indexes.push({
          docId,
          term: fields.term?.stringValue || docId,
          title_ko: fields.title_ko?.stringValue || '',
          keywords,
          images,
          description: fields.description?.stringValue || '',
          type: theoryType,
          category: fields.category?.stringValue || '',
          textContent
        });
      }
    }

    theoryIndexCache = indexes;
    theoryIndexCacheTime = Date.now();
    console.log(`📚 이론 인덱스 ${indexes.length}개 로드 완료 (커트 + 펌)`);

    return indexes;
  } catch (e) {
    console.error('❌ 이론 인덱스 로드 오류:', e);
    return null;
  }
}

/**
 * 질문에 맞는 가이드 이미지 찾기
 */
function detectGuideImageForQuery(query) {
  const lowerQuery = query.toLowerCase();

  // 여자 기장 관련 키워드
  if (GUIDE_IMAGES.female_length.keywords.some(k => lowerQuery.includes(k.toLowerCase()))) {
    // 남자 관련 키워드가 있으면 제외
    if (!lowerQuery.includes('남자') && !lowerQuery.includes('남성') && !lowerQuery.includes('male')) {
      return GUIDE_IMAGES.female_length;
    }
  }

  // 남자 스타일 관련 키워드
  if (GUIDE_IMAGES.male_style.keywords.some(k => lowerQuery.includes(k.toLowerCase()))) {
    return GUIDE_IMAGES.male_style;
  }

  return null;
}

/**
 * 질문에 맞는 이론 이미지 찾기 (Firestore 89개 인덱스 동적 매칭)
 */
async function detectTheoryImageForQuery(query, language = 'ko') {
  const lowerQuery = query.toLowerCase();
  // 공백 및 한국어 조사 제거한 정규화 버전
  const normalizedQuery = lowerQuery.replace(/\s+/g, '').replace(/[의은는이가을를에서로와과]/g, '');

  // Firestore에서 이론 인덱스 로드
  const indexes = await loadTheoryIndexes();
  if (!indexes || indexes.length === 0) {
    return null;
  }

  // 키워드 매칭으로 이론 찾기 (가장 많이 매칭되는 것 우선)
  let bestMatch = null;
  let bestMatchCount = 0;

  for (const index of indexes) {
    let matchCount = 0;

    // 1. 키워드 매칭 (공백/조사 무시)
    for (const keyword of index.keywords) {
      const normalizedKeyword = keyword.replace(/\s+/g, '').replace(/[의은는이가을를에서로와과]/g, '');
      // 일반 매칭 또는 정규화된 매칭
      if (lowerQuery.includes(keyword) || normalizedQuery.includes(normalizedKeyword)) {
        matchCount++;
      }
    }

    // 2. textContent 기반 매칭 (키워드 매칭 실패 시 보조)
    if (matchCount === 0 && index.textContent) {
      const textLower = index.textContent.toLowerCase();
      // 쿼리의 주요 단어들이 textContent에 포함되어 있는지 확인
      const queryWords = lowerQuery.split(/\s+/).filter(w => w.length >= 2);
      for (const word of queryWords) {
        if (textLower.includes(word)) {
          matchCount += 0.5; // textContent 매칭은 가중치를 낮게
        }
      }
    }

    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestMatch = index;
    }
  }

  if (bestMatch && bestMatchCount > 0) {
    // 언어별 이미지 URL 반환
    const imageUrl = bestMatch.images[language] || bestMatch.images['ko'] || bestMatch.images['en'];

    if (imageUrl) {
      console.log(`📚 이론 인덱스 매칭: "${bestMatch.term}" (${bestMatchCount}개 키워드 일치)`);
      return {
        url: imageUrl,
        title: bestMatch.title_ko || bestMatch.term,
        term: bestMatch.term,
        description: bestMatch.description
      };
    }
  }

  return null;
}

// ==================== Firestore 스타일 검색 (임베딩 기반 Top-3) ⭐⭐⭐ ====================

// Firebase 프로젝트 설정
const FIREBASE_PROJECT_ID = 'hairgatormenu-4a43e';

/**
 * Firestore REST API로 모든 스타일 가져오기
 */
async function getFirestoreStyles() {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/styles`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Firestore API Error: ${response.status}`);
    }

    const data = await response.json();
    const styles = [];

    if (data.documents) {
      for (const doc of data.documents) {
        const fields = doc.fields;
        const styleId = doc.name.split('/').pop();

        // 임베딩 배열 추출
        let embedding = null;
        if (fields.embedding && fields.embedding.arrayValue && fields.embedding.arrayValue.values) {
          embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
        }

        // 도해도 배열 추출 (메타데이터 포함)
        let diagrams = [];
        if (fields.diagrams && fields.diagrams.arrayValue && fields.diagrams.arrayValue.values) {
          diagrams = fields.diagrams.arrayValue.values.map(v => {
            const mapValue = v.mapValue?.fields || {};
            return {
              step: parseInt(mapValue.step?.integerValue || 0),
              url: mapValue.url?.stringValue || '',
              // ⭐ 도해도 메타데이터 추가
              lifting: mapValue.lifting?.stringValue || null,
              lifting_angle: parseInt(mapValue.lifting_angle?.integerValue || 0),
              direction: mapValue.direction?.stringValue || null,
              section: mapValue.section?.stringValue || null,
              zone: mapValue.zone?.stringValue || null,
              cutting_method: mapValue.cutting_method?.stringValue || null,
              over_direction: mapValue.over_direction?.booleanValue || false,
              notes: mapValue.notes?.stringValue || null
            };
          });
        }

        styles.push({
          styleId: styleId,
          series: fields.series?.stringValue || '',
          seriesName: fields.seriesName?.stringValue || '',
          resultImage: fields.resultImage?.stringValue || null,
          diagrams: diagrams,
          diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
          captionUrl: fields.captionUrl?.stringValue || null,
          textRecipe: fields.textRecipe?.stringValue || null,
          embedding: embedding
        });
      }
    }

    console.log(`📚 Firestore에서 ${styles.length}개 스타일 로드`);
    return styles;

  } catch (error) {
    console.error('❌ Firestore 스타일 로드 실패:', error);
    return [];
  }
}

/**
 * Gemini 임베딩 생성
 */
async function generateQueryEmbedding(query, geminiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/embedding-001',
          content: { parts: [{ text: query }] },
          taskType: 'RETRIEVAL_QUERY'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding?.values || null;

  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error);
    return null;
  }
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Firestore 스타일 검색 (임베딩 기반 Top-3)
 */
async function searchFirestoreStyles(payload, geminiKey) {
  const { query, top_k = 3 } = payload;

  console.log(`🔍 Firestore 스타일 검색: "${query}"`);

  try {
    // 1. 쿼리 임베딩 생성
    const queryEmbedding = await generateQueryEmbedding(query, geminiKey);
    if (!queryEmbedding) {
      throw new Error('쿼리 임베딩 생성 실패');
    }

    console.log(`✅ 쿼리 임베딩 생성 완료 (${queryEmbedding.length}차원)`);

    // 2. Firestore에서 모든 스타일 가져오기
    const styles = await getFirestoreStyles();
    if (styles.length === 0) {
      throw new Error('스타일 데이터 없음');
    }

    // 3. 유사도 계산 및 정렬
    const scoredStyles = styles
      .filter(style => style.embedding && style.embedding.length > 0)
      .map(style => ({
        ...style,
        similarity: cosineSimilarity(queryEmbedding, style.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, top_k);

    console.log(`🎯 Top-${top_k} 스타일 검색 완료`);
    scoredStyles.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`);
    });

    // 4. 결과 반환 (임베딩 제외)
    const results = scoredStyles.map(style => ({
      styleId: style.styleId,
      series: style.series,
      seriesName: style.seriesName,
      resultImage: style.resultImage,
      diagrams: style.diagrams.slice(0, 10), // 도해도 10장까지만
      diagramCount: style.diagramCount,
      captionUrl: style.captionUrl,
      similarity: style.similarity
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          query: query,
          results: results,
          total_styles: styles.length,
          styles_with_embedding: styles.filter(s => s.embedding).length
        }
      })
    };

  } catch (error) {
    console.error('❌ Firestore 스타일 검색 오류:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

// ==================== 이미지 분석 + 맞춤 레시피 생성 ⭐⭐⭐ ====================

// 기장별 시리즈 매핑
const LENGTH_TO_SERIES = {
  'A': 'FAL',
  'B': 'FBL',
  'C': 'FCL',
  'D': 'FDL',
  'E': 'FEL',
  'F': 'FFL',
  'G': 'FGL',
  'H': 'FHL'
};

/**
 * Gemini Vision으로 이미지 분석 - 2WAY CUT SYSTEM 스키마 기반 파라미터 추출
 */
async function analyzeImageStructured(imageBase64, mimeType, geminiKey) {
  const systemPrompt = `당신은 "HAIRGATOR AI", 20년 경력의 2WAY CUT 시스템 전문가입니다.

📌 **분석 대상**: 2개의 이미지가 제공됩니다.
1. **첫 번째 이미지 (기장 가이드)**: 신체 부위별 기장 코드(H~A) 참조표
2. **두 번째 이미지 (고객 사진)**: 실제 분석할 헤어스타일

⚠️ **반드시 첫 번째 가이드 이미지를 참고하여 두 번째 고객 이미지의 기장을 정확히 판단하세요!**

이미지 속 헤어스타일을 **2WAY CUT SYSTEM 스키마**에 맞게 분석하여 JSON 형식으로 출력하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【1. LENGTH 분류 - Body Landmark 기반】⭐⭐⭐⭐⭐ 최우선!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 **경고: 기장 분류가 가장 중요합니다!** 🚨🚨🚨

**⭐⭐⭐ 첫 번째 가이드 이미지를 반드시 참조하세요! ⭐⭐⭐**
가이드 이미지에 표시된 신체 위치(Short→Bob→Medium→Semi Long→Long)와
기장 코드(H~A)를 고객 사진과 비교하여 정확히 판단하세요.

**⭐⭐⭐ 필수 3단계 (반드시 순서대로!):**
1. 두 번째 고객 이미지에서 **뒷머리(Back hair)** 가장 긴 부분 찾기
2. 그 끝이 **정확히 어느 신체 부위**에 닿는지 확인
3. **첫 번째 가이드 이미지**와 비교하여 해당 코드 결정

**신체 기준점별 기장 코드 (가이드 이미지 참조!):**

| 코드 | 신체 위치 | 약 cm | 시각적 판단 |
|------|----------|-------|-----------|
| **H** | 후두부/목덜미 (Short) | ~10cm | 목이 완전히 보임 |
| **G** | 목 상단 (Short) | ~15cm | 목 위쪽 일부 가림 |
| **F** | 목 하단 (Bob) | ~20cm | 목 아래까지 |
| **E** | 어깨선 상단 (Medium) | ~25cm | 어깨 바로 위 |
| **D** | 어깨선 하단 (Medium) | ~30cm | 어깨에서 끝 (어깨선) |
| **C** | 겨드랑이 (Semi Long) | ~40cm | 겨드랑이 높이 |
| **B** | 가슴 중간 (Long) | ~50cm | 가슴 중간 ⭐⭐⭐ |
| **A** | 가슴 하단/허리 (Long) | 60cm+ | 허리까지 닿음 |

🔴🔴🔴 **핵심 구분법 (가이드 이미지와 비교!):**
- 머리가 **가슴에 닿으면** → 무조건 **B 또는 A** (절대 D 아님!)
- 머리가 **겨드랑이까지 내려오면** → **C** (절대 D 아님!)
- 머리가 **어깨에만 닿으면** → **D 또는 E**
- 머리가 **목에서 끝나면** → **F, G, H**

⭐⭐⭐ **짧은 기장 (H/G/F) 정밀 구분법 - 매우 중요!** ⭐⭐⭐
| H vs G vs F 구분 | 판단 기준 |
|----------------|----------|
| **H (후두부)** | 뒷머리가 **두상 곡선 안에서 끝남**, 목덜미가 **완전히 노출**, 귀 아래로 안 내려감 |
| **G (목 상단)** | 뒷머리가 **목 위쪽**까지 내려옴, 목덜미 **일부만** 가림, 귀 아래 5cm 이내 |
| **F (목 하단)** | 뒷머리가 **목 전체**를 가림, **어깨선 직전**까지, 귀 아래 10cm 정도 |

🔍 **H vs G 구분 체크리스트:**
1. 목덜미가 완전히 보이나요? → **H**
2. 목덜미 위쪽만 살짝 가려지나요? → **G**
3. 머리카락이 귀 아래로 내려가나요? → G 아니면 F (H 아님!)
4. 뒷머리가 두상의 둥근 곡선 안에서 끝나나요? → **H**

❌❌❌ **절대 하지 말 것 (흔한 오류):**
1. 가슴까지 내려오는 긴 머리를 D로 분류 → **틀림! B가 정답**
2. 겨드랑이까지 오는데 D로 분류 → **틀림! C가 정답**
3. 50cm 이상 긴 머리를 어깨 길이(30cm)로 판단 → **틀림!**
4. 앞머리 길이로 기장 판단 → **틀림! 뒷머리 기준!**
5. **목덜미가 완전히 보이는 짧은 머리를 G로 분류 → 틀림! H가 정답!**
6. **두상 곡선 안에서 끝나는 초단발을 G로 분류 → 틀림! H가 정답!**

📏 **길이 퀵 체크:**
- 머리끝이 어깨 아래로 10cm 이상 → C 이하 (세미롱~롱)
- 머리끝이 어깨 아래로 20cm 이상 → B 이하 (롱)
- 머리끝이 허리까지 → A (슈퍼롱)
- **목덜미 완전 노출** → H (초단발)
- **목 상단만 가림** → G (단발)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【2. CUT FORM & CELESTIAL ANGLE】⭐⭐⭐ 핵심!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CUT FORM (컷 형태):**
- O (One Length): 0도, 일자 무게선, 층 없음
- G (Graduation): 15~75도, 하단에 무게감, 층 적음
- L (Layer): 90도 이상 리프팅, 전체적으로 가벼움, 층 많음

**CELESTIAL ANGLE (천체축 각도):** ⭐ 새 필수 파라미터!
| 각도 | 형태 | 무게감 |
|-----|------|-------|
| 0 | One Length | 최대 (무거움) |
| 15 | Low Graduation | 높음 |
| 45 | Medium Graduation | 중간 |
| 75 | High Graduation | 낮음 |
| 90 | Layer | 가벼움 |
| 135 | High Layer | 매우 가벼움 |

**GRADUATION ANGLE (그래쥬에이션 각도):**
- 그래쥬에이션 스타일일 때 각도 (15, 30, 45, 60, 75)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【3. 2WAY CUT 핵심 변수】⭐⭐⭐ 가장 중요!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**HEAD POSITION (두상 자세):**
- Upright: 정자세 (기본)
- Tilt_15: 15도 숙임 (네이프 속머리 빠짐 방지)
- Tilt_30: 30도 숙임 (스퀘어 유지)

**DISTRIBUTION (분배/빗질 방향):** ⭐⭐ 매우 중요!
- Natural: 자연빗질 (기본)
- Perpendicular: 수직분배 (두피에 수직으로 빗질)
- Variable: 변이분배 (빗질 각도 비틀기) → **DFS의 핵심!**
- Directional: 방향성 분배

**GUIDE LINE (가이드 라인):**
- Fixed: 고정 (한곳으로 당김) → 무게감 유지
- Traveling: 이동 (가이드가 따라감) → 균일한 층

**FINGER POSITION (손가락 위치):**
- Parallel: 섹션과 평행
- Non_Parallel: 섹션과 비평행 → **DBS NO.1 핵심!**

**DIRECTION FLOW (방향 흐름):**
- Out_to_In: 바깥→안 (사이드 Long 유지, 네이프 타이트)
- In_to_Out: 안→바깥 (전체적으로 가벼움)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【4. SECTION & LIFTING】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SECTION TYPE (섹션 타입):**
- Horizontal: 가로 섹션 (HS)
- Vertical: 세로 섹션 (VS)
- Diagonal_Fwd: 전대각 (DFS) → **볼륨 위치 결정의 핵심!**
- Diagonal_Bkwd: 후대각 (DBS)
- Pie: 파이 섹션
- Radial: 방사선 섹션

**SECTION ANGLE (섹션 각도):** ⭐ DFS 핵심!
- 15: Low (완만한 전대각) → N.S.P 오목, 좁은 네이프
- 45: Medium (이상적인 달걀형)
- 75: High (가파른 전대각) → 플랫한 두상 보정

**LIFTING RANGE (리프팅 각도):**
- L0=0°, L1=22.5°, L2=45°, L3=67.5°, L4=90°, L5=112.5°, L6=135°, L7=157.5°, L8=180°

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【5. 라인 형태 & 실루엣 (3x3 Matrix)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SHAPE OF LINE (라인 형태):** ⭐ 3x3 매트릭스 결정!
- Triangular: 삼각형 라인 (OG, GO, LO)
- Square: 사각형 라인 (OL, GL, LG)
- Round: 둥근 라인 (OGL, LGO, GOL)

**OUTLINE SHAPE (아웃라인 형태):**
- Square: 사각 (일자/각진 라인)
- Round: 둥근 (부드러운 곡선)
- Triangle: 삼각 (뾰족한 라인)

**SILHOUETTE (실루엣):**
- Graduation Silhouette: 그래쥬에이션 실루엣
- Expanded Shape: 확장된 형태
- Combination: 복합

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【6. 볼륨 & 무게】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**VOLUME ZONE:**
- Low: 하단 볼륨 (0~44도, 무게감)
- Medium: 중단 볼륨 (45~89도)
- High: 상단 볼륨 (90도 이상, 가벼움)

**VOLUME POSITION (볼륨 위치):** 배열로 선택
- Crown, Top, Side, Back, Nape, Front, Bang

**WEIGHT ZONE (무게 영역):**
- Zone_A: Nape (기초 무게감)
- Zone_B: Middle (볼륨 형성)
- Zone_C: Top (표면 질감/율동감)

**WEIGHT DISTRIBUTION:**
- Top Heavy: 상단 무게 (레이어)
- Balanced: 균형
- Bottom Heavy: 하단 무게 (그래쥬에이션/원렝스)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【7. 두상 좌표 기준점】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TARGET POINT (주요 기준점):**
- C_P: Center Point (정중선)
- T_P: Top Point (정수리)
- G_P: Golden Point (2WAY 볼륨 중심) ⭐
- B_P: Back Point (후두부)
- N_P: Nape Point (목덜미)
- E_P: Ear Point (귀)
- F_S_P: Front Side Point (앞 사이드)
- S_P: Side Point (사이드)
- N_S_P: Neck Side Point (목 옆점) ⭐ 핵심!

**FOCUS POINTS:** 커트 시 집중할 기준점들 (배열)

【OUTLINE SHAPE - 아웃라인 형태】⭐⭐ 중요!
헤어스타일 외곽선(Hemline/Perimeter)의 형태를 정확히 판단:

| 형태 | 설명 | 대표 스타일 |
|-----|------|----------|
| Round | 부드러운 곡선, 여성스러운 느낌 (ㅇ) | 여성 숏컷, 레이어 보브 |
| Square | 일자/각진 라인, 블런트 느낌 (ㅁ) | 남성컷, 블런트 보브 |
| Curved | 자연스러운 곡선 | 자연스러운 레이어 |
| Asymmetric | 비대칭 아웃라인 | 어시메트릭 컷 |
| Pointed | 뾰족한 포인트 | V라인, 포인티드 컷 |

⚠️ 판단 기준:
- 여성 숏컷/레이어 스타일 → 대부분 "Round" 또는 "Curved"
- 남성컷, 투블록, 엣지 스타일 → "Square"
- 목덜미가 둥글게 처리됨 → "Round"
- 목덜미가 일자로 커팅됨 → "Square"

❌ 흔한 오류:
- 부드러운 여성 숏컷을 "Square"로 분류 (틀림! → Round가 정답)
- 레이어 스타일의 자연스러운 곡선을 "Square"로 분류 (틀림!)

【FRINGE LENGTH - 앞머리 길이】⭐⭐ 중요!
앞머리의 **가장 긴 부분**이 어디까지 내려오는지 판단:

| 길이 | 신체 기준 | 설명 |
|-----|---------|------|
| Forehead | 이마 중간 | 매우 짧은 앞머리 |
| Eyebrow | 눈썹 라인 | 풀뱅, 일자 앞머리 |
| Eye | 눈 덮음 | 긴 앞머리, 시스루뱅 |
| Cheekbone | 광대뼈 | 사이드뱅, 페이스프레이밍 |
| Chin | 턱선 | 긴 사이드뱅, 커튼뱅 |
| Ear | 귀 높이 | 귀를 덮는 긴 앞머리 |

⚠️ 판단 기준:
- 사이드뱅(Side Bang): 가운데는 짧고 **양쪽은 광대~턱까지** → "Cheekbone" 또는 "Chin"
- 커튼뱅(Curtain Bang): 양쪽으로 갈라지며 턱선까지 → "Chin"
- 시스루뱅(See-through Bang): 눈썹~눈 사이 → "Eyebrow" 또는 "Eye"
- 풀뱅(Full Bang): 눈썹 라인 → "Eyebrow"

❌ 흔한 오류:
- 사이드뱅의 측면 길이를 무시하고 "Eyebrow"로 분류 (틀림!)
- 광대까지 내려오는 앞머리를 "Eyebrow"로 분류 (틀림! → Cheekbone)

【WEIGHT DISTRIBUTION】
- Top Heavy: 상단에 무게 (레이어)
- Balanced: 균형잡힌 무게
- Bottom Heavy: 하단에 무게 (그래쥬에이션/원렝스)

【CONNECTION TYPE】
- Connected: 연결된 층 (자연스러운 흐름)
- Disconnected: 단절된 층 (투블록, 언더컷)
- Semi-Connected: 반연결

【PERM 파라미터】⭐ 펌이 있으면 분석!
- perm_applied: true/false (펌 여부)
- perm_type: "Digital Perm", "Cold Perm", "Volume Perm", "Setting Perm", "Body Perm", "Air Perm", null
- perm_rod_size: "Small (6-10mm)", "Medium (12-16mm)", "Large (18-24mm)", "Jumbo (26mm+)", null
- perm_technique: "Spiral", "Stack", "Piggyback", "Brick", "Directional", "Root Perm", null
- curl_pattern: "S-Wave", "C-Curl", "J-Curl", "Spiral", "Beach Wave", "Body Wave", null
- curl_strength: "Tight", "Medium", "Loose", "Subtle", null
- curl_direction: "Inward", "Outward", "Alternating", "Random", null
- wave_type: "Regular Wave", "Irregular Wave", "S-Wave", "Body Wave", null

🎯 펌 판단 기준:
- 전체적으로 웨이브/컬이 규칙적 → perm_applied: true
- 자연스러운 웨이브/스트레이트 → perm_applied: false
- 끝만 컬링 → perm_type: "Setting Perm" 또는 스타일링
- 볼륨감 있는 루트 → perm_type: "Volume Perm" 또는 "Root Perm"

【COLOR 파라미터】⭐ 염색이 있으면 분석!
- color_applied: true/false (염색 여부)
- base_color: "Black", "Dark Brown", "Brown", "Light Brown", "Ash Brown", "Blonde", "Red", "Burgundy", null
- color_level: 1-10 (1=가장 어두움, 10=가장 밝음), null
- color_tone: "Warm", "Cool", "Neutral", "Ash", "Golden", "Red", "Violet", null
- highlight_applied: true/false
- highlight_color: "Blonde", "Caramel", "Honey", "Ash", "Platinum", null
- highlight_technique: "Foil", "Balayage", "Baby Lights", "Face Framing", null
- lowlight_applied: true/false
- lowlight_color: "Dark Brown", "Chocolate", "Espresso", null
- balayage_applied: true/false
- ombre_applied: true/false
- color_placement: "All Over", "Roots Only", "Ends Only", "Partial", "Face Framing", null

🎯 컬러 판단 기준:
- 자연스러운 검정/흑갈색 → color_applied: false
- 밝은 갈색 이상/금발/레드 등 → color_applied: true
- 그라데이션 있음 → ombre_applied: true 또는 balayage_applied: true
- 포인트 하이라이트 → highlight_applied: true

【CUTTING ZONE & GUIDE】
- cutting_zone: "Crown", "Top", "Side", "Back", "Nape", "Fringe", "Perimeter"
- guide_type: "Stationary" (고정 가이드), "Traveling" (이동 가이드)
- over_direction: true/false (오버 디렉션 여부)

【OUTPUT JSON 형식】
⚠️ 모든 값은 이미지를 분석하여 결정하세요! 아래 예시값을 그대로 복사하지 마세요!

{
  "cut_category": "Women's Cut 또는 Men's Cut",
  "length_category": "A~H Length 형식 (예: D Length)",
  "estimated_hair_length_cm": "숫자",
  "front_length": "Very Short/Short/Medium/Long/Very Long",
  "back_length": "Very Short/Short/Medium/Long/Very Long",

  "cut_form": "O (One Length) 또는 G (Graduation) 또는 L (Layer)",
  "structure_layer": "No Layer/Low Layer/Mid Layer/High Layer/Full Layer",
  "graduation_type": "None/Light/Medium/Heavy",
  "graduation_angle": 0~90 사이 숫자 (그래쥬에이션 각도),
  "celestial_angle": 0/15/45/75/90/135 중 선택 ⭐필수,

  "head_position": "Upright/Tilt_15/Tilt_30" ⭐필수,
  "distribution": "Natural/Perpendicular/Variable/Directional" ⭐필수,
  "guide_line": "Fixed/Traveling" ⭐필수,
  "finger_position": "Parallel/Non_Parallel",
  "direction_flow": "Out_to_In/In_to_Out",

  "section_type": "Horizontal/Vertical/Diagonal_Fwd/Diagonal_Bkwd/Pie/Radial",
  "section_primary": "Horizontal/Vertical/Diagonal-Forward/Diagonal-Backward/Pie/Radial",
  "section_angle": 15/45/75 중 선택 (전대각 각도),
  "section_by_zone": {"back": "섹션", "side": "섹션", "top": "섹션", "fringe": "섹션"},

  "lifting_range": ["L0"~"L8" 배열],
  "lifting_by_zone": {"back": "L0~L8", "side": "L0~L8", "top": "L0~L8", "fringe": "L0~L8"},
  "lifting_degree": 0~180 사이 숫자 (주요 리프팅 각도),
  "angle_sequence": [각도 배열] (예: [45, 135, 112.5]),
  "direction_primary": "D0~D8",

  "shape_of_line": "Triangular/Square/Round" ⭐필수 (3x3 매트릭스),
  "outline_shape": "Square/Round/Triangle" ⭐필수,
  "silhouette": "Graduation Silhouette/Expanded Shape/Combination",

  "volume_zone": "Low/Medium/High",
  "volume_position": ["Crown", "Top", "Side", "Back", "Nape", "Front", "Bang"] 배열,
  "volume_distribution": "Top/Middle/Bottom/Even",
  "weight_zone": "Zone_A/Zone_B/Zone_C",
  "weight_distribution": "Top Heavy/Balanced/Bottom Heavy",
  "weight_line_position": "Nape/Jaw/Chin/Shoulder/Chest",

  "target_point": "C_P/T_P/G_P/B_P/N_P/E_P/F_S_P/S_P/N_S_P",
  "focus_points": ["기준점 배열"],

  "layer_type": "No Layer/Low Layer/Mid Layer/High Layer/Full Layer",
  "line_quality": "Sharp/Soft/Blended/Disconnected",
  "connection_type": "Connected/Disconnected/Semi-Connected",

  "fringe_type": "Full Bang/See-through Bang/Side Bang/Center Part/No Fringe",
  "fringe_length": "Forehead/Eyebrow/Eye/Cheekbone/Lip/Chin/None",
  "fringe_texture": "Blunt/Textured/Wispy/Choppy",

  "surface_texture": "Smooth/Textured/Choppy/Soft",
  "internal_texture": "Blunt/Point Cut/Slide Cut/Razor Cut",
  "hair_density": "Thin/Medium/Thick",
  "hair_texture": "Straight/Wavy/Curly/Coily",
  "movement": "Static/Slight/Moderate/High",
  "texture_technique": "None/Point Cut/Slide Cut/Razor/Texturizing",

  "cutting_method": "Blunt Cut/Point Cut/Slide Cut/Stroke Cut/Razor Cut",
  "cutting_zone": "Crown/Top/Side/Back/Nape/Fringe/Perimeter",
  "over_direction": true/false,

  "styling_method": "Blow Dry/Natural Dry/Iron/Curl/Wave",
  "design_emphasis": "Volume/Length/Texture/Shape/Movement",
  "weight_flow": "Balanced/Forward Weighted/Backward Weighted",
  "face_shape_match": ["Oval", "Round", "Square", "Heart", "Long", "Diamond"] 배열,

  "perm_applied": true/false,
  "perm_type": "Wave Perm/Digital Perm/Heat Perm/Iron Perm 또는 null",
  "curl_pattern": "C-Curl/CS-Curl/S-Curl/SS-Curl 또는 null",
  "curl_strength": "Soft/Medium/Strong 또는 null",

  "color_applied": true/false,
  "base_color": "컬러명 또는 null",
  "color_level": 1-10 또는 null,
  "highlight_applied": true/false,
  "balayage_applied": true/false,
  "ombre_applied": true/false,

  "description": "이 스타일에 대한 1-2문장 설명",

  "hair_regions": {
    "top": {"x": 0-100, "y": 0-100},
    "crown": {"x": 0-100, "y": 0-100},
    "side_left": {"x": 0-100, "y": 0-100},
    "side_right": {"x": 0-100, "y": 0-100},
    "back": {"x": 0-100, "y": 0-100},
    "fringe": {"x": 0-100, "y": 0-100},
    "nape": {"x": 0-100, "y": 0-100},
    "length_end": {"x": 0-100, "y": 0-100}
  }
}

⭐⭐⭐ **hair_regions 필수! (UI 오버레이용)** ⭐⭐⭐
이미지에서 각 헤어 영역의 **중심 좌표**를 0~100% 범위로 반환하세요.
- x: 이미지 왼쪽 기준 0%, 오른쪽 100%
- y: 이미지 상단 기준 0%, 하단 100%
- top: 정수리 위치 (보통 x:50, y:5~15)
- crown: 크라운 영역 (보통 x:50, y:15~25)
- side_left: 왼쪽 사이드 머리 (보통 x:15~25, y:30~40)
- side_right: 오른쪽 사이드 머리 (보통 x:75~85, y:30~40)
- back: 뒷머리 영역 (보이는 경우, 안보이면 null)
- fringe: 앞머리 영역 (있는 경우, 없으면 null)
- nape: 목덜미 영역 (보이는 경우, 안보이면 null)
- length_end: 머리카락 끝 위치 (가장 긴 부분의 끝)

⚠️ 필수 규칙:
1. lifting_range는 반드시 배열! ["L2"] 또는 ["L2", "L4"]
2. ⭐⭐ lifting_by_zone 필수! 존별로 다른 리프팅 적용:
   - Back 존: 보통 L2~L3 (무게감 있게)
   - Side 존: L4~L5 (볼륨)
   - Top 존: L4~L6 (더 높은 볼륨)
   - Fringe 존: L0~L2 (낮은 각도)
   예: {"back": "L2", "side": "L4", "top": "L5", "fringe": "L1"}
3. cut_form은 괄호 포함! "L (Layer)" 형식
4. ⭐⭐⭐ length_category 판단법:
   - 머리끝이 가슴에 닿음 → "B Length" 또는 "A Length"
   - 머리끝이 겨드랑이에 닿음 → "C Length"
   - 머리끝이 어깨에만 닿음 → "D Length" 또는 "E Length"
   - 머리끝이 목에서 끝남 → "F Length", "G Length", "H Length"
5. ⭐ 2WAY CUT 핵심 변수 필수: head_position, distribution, guide_line, celestial_angle, shape_of_line, outline_shape
6. 섹션 각도(section_angle)는 볼륨 위치를 결정! 15=Low, 45=Medium, 75=High
7. 모든 값은 이미지를 보고 판단! 예시를 그대로 복사하지 마세요!

🚨 중요: length_category를 결정할 때 머리카락 끝이 신체 어디에 닿는지 반드시 확인하세요!
가슴까지 내려오는 긴 머리를 D Length로 분류하면 안 됩니다! 그건 B Length입니다!

JSON만 반환하세요.`;

  try {
    // 기장 가이드 이미지 + 고객 이미지를 함께 전송
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              // 1. 기장 가이드 이미지 (참조용)
              { inline_data: { mime_type: 'image/png', data: LENGTH_GUIDE_BASE64 } },
              // 2. 고객 업로드 이미지 (분석 대상)
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              // 3. 프롬프트
              { text: systemPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0,  // 완전 결정적 출력
            maxOutputTokens: 2000,
            responseMimeType: "application/json"  // JSON 출력 강제
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vision API Error ${response.status}:`, errorText);
      throw new Error(`Vision API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const params56 = JSON.parse(text);

    // ⭐⭐⭐ 기장 검증 및 보정: estimated_hair_length_cm 기반
    const estimatedCm = parseInt(params56.estimated_hair_length_cm) || 0;
    const declaredLength = params56.length_category?.charAt(0) || 'E';

    // cm 기준 → 올바른 기장 코드 (H/G 경계 더 엄격하게)
    let correctLength = declaredLength;
    if (estimatedCm >= 60) correctLength = 'A';
    else if (estimatedCm >= 50) correctLength = 'B';
    else if (estimatedCm >= 40) correctLength = 'C';
    else if (estimatedCm >= 30) correctLength = 'D';
    else if (estimatedCm >= 25) correctLength = 'E';
    else if (estimatedCm >= 18) correctLength = 'F';  // 18~24cm = F (목 하단)
    else if (estimatedCm >= 12) correctLength = 'G';  // 12~17cm = G (목 상단)
    else correctLength = 'H';  // 12cm 미만 = H (후두부/목덜미)

    // 불일치 시 보정
    if (correctLength !== declaredLength) {
      console.log(`⚠️ 기장 보정: ${declaredLength} → ${correctLength} (${estimatedCm}cm 기준)`);
      params56.length_category = `${correctLength} Length`;
    }

    // ⭐ 추가 검증: H/G 경계가 애매한 경우 (10~15cm)
    // Gemini가 G라고 했는데 cm이 12 미만이면 H로 강제 보정
    if (declaredLength === 'G' && estimatedCm < 12) {
      console.log(`⚠️ H/G 경계 강제 보정: G → H (${estimatedCm}cm < 12cm)`);
      params56.length_category = 'H Length';
    }

    console.log(`📷 스타일 분석 완료:`, {
      length: params56.length_category,
      estimatedCm: estimatedCm,
      form: params56.cut_form,
      lifting: params56.lifting_range,
      section: params56.section_primary,
      volume: params56.volume_zone,
      perm: params56.perm_applied ? params56.perm_type : 'None',
      color: params56.color_applied ? params56.base_color : 'None'
    });

    return params56;

  } catch (error) {
    console.error('❌ 이미지 분석 실패:', error);
    // 기본값 반환
    return {
      // 기장 & 카테고리 (5개)
      cut_category: "Women's Cut",
      length_category: "E Length",  // 기본값을 E(어깨)로 변경
      estimated_hair_length_cm: "30",
      front_length: "Medium",
      back_length: "Long",
      // 구조 & 폼 (5개)
      cut_form: "L (Layer)",
      structure_layer: "Mid Layer",
      graduation_type: "None",
      weight_distribution: "Balanced",
      layer_type: "Mid Layer",
      // 실루엣 & 볼륨 (5개)
      silhouette: "Round",
      outline_shape: "Curved",
      volume_zone: "Medium",
      volume_distribution: "Middle",
      line_quality: "Soft",
      // 앞머리 (3개)
      fringe_type: "No Fringe",
      fringe_length: null,
      fringe_texture: null,
      // 텍스처 & 질감 (5개)
      surface_texture: "Natural",
      hair_density: "Medium",
      hair_texture: "Straight",
      movement: "Minimal",
      texture_technique: null,
      // 기술 파라미터 (8개)
      section_primary: "Diagonal-Backward",
      lifting_range: ["L4"],
      direction_primary: "D4",
      cutting_method: "Blunt",
      cutting_zone: "Back",
      guide_type: "Traveling",
      over_direction: false,
      connection_type: "Connected",
      // 스타일링 & 디자인 (3개)
      styling_method: "Natural Dry",
      design_emphasis: "Shape",
      face_shape_match: ["Oval"],
      // 펌 파라미터 (8개)
      perm_applied: false,
      perm_type: null,
      perm_rod_size: null,
      perm_technique: null,
      curl_pattern: null,
      curl_strength: null,
      curl_direction: null,
      wave_type: null,
      // 컬러 파라미터 (12개)
      color_applied: false,
      base_color: null,
      color_level: null,
      color_tone: null,
      highlight_applied: false,
      highlight_color: null,
      highlight_technique: null,
      lowlight_applied: false,
      lowlight_color: null,
      balayage_applied: false,
      ombre_applied: false,
      color_placement: null,
      // 설명 (1개)
      description: "분석 실패 - 기본값 사용"
    };
  }
}

/**
 * 자막 파일(레시피) 가져오기
 */
async function fetchCaptionContent(captionUrl) {
  try {
    if (!captionUrl) return null;
    const response = await fetch(captionUrl);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error('❌ 자막 가져오기 실패:', error);
    return null;
  }
}

/**
 * 도해도 선별 함수 - 2WAY CUT SYSTEM 기반 (Top-1 우선, 시리즈 내 보충)
 *
 * ⭐ 핵심 원칙:
 * 1. Top-1 스타일의 도해도를 step 순서대로 완전히 반환
 * 2. Top-1에 앞머리 도해도가 없는데 유저 이미지에 앞머리가 있으면 → 같은 시리즈에서 보충
 * 3. 시리즈 일관성 유지 (FAL → FAL, MAL → MAL)
 * 4. 각 스타일 내 도해도는 반드시 step 순서 유지
 *
 * @param {Array} top3Styles - 매칭된 Top-3 스타일 배열
 * @param {Object} params56 - 분석된 스타일 파라미터 (2WAY CUT 변수 포함)
 * @param {number} maxDiagrams - 최대 반환 도해도 수 (기본 20장)
 * @param {Array} allStyles - 전체 스타일 목록 (같은 시리즈에서 보충용)
 */
function selectDiagramsByTechnique(top3Styles, params56, maxDiagrams = 20, allStyles = null) {
  // 입력 유효성 검사
  if (!top3Styles || top3Styles.length === 0) {
    console.log('⚠️ selectDiagramsByTechnique: 스타일 없음');
    return [];
  }

  // ==================== 타겟 파라미터 추출 (2WAY CUT SYSTEM 기반) ====================

  // Celestial Angle (천체각) - 핵심 매칭 기준
  const targetCelestialAngle = params56.celestial_angle || 45;

  // Section 관련
  const targetSection = params56.section_primary || 'Diagonal-Backward';
  const targetSectionAngle = params56.section_angle || 45;

  // Guide Line & Distribution
  const targetGuideLine = params56.guide_line || 'Fixed';
  const targetDistribution = params56.distribution || 'Natural';

  // Lifting Range (전체)
  const targetLiftingRange = params56.lifting_range || ['L4'];

  // ⭐ 존별 리프팅 (스텝별 정확한 매칭에 사용!)
  const liftingByZone = params56.lifting_by_zone || {};
  const hasZoneLiftings = Object.keys(liftingByZone).length > 0;
  if (hasZoneLiftings) {
    console.log(`   ⭐ 존별 리프팅: Back=${liftingByZone.back || '-'}, Side=${liftingByZone.side || '-'}, Top=${liftingByZone.top || '-'}`);
  }

  // 기존 호환성
  const targetDirection = params56.direction_primary || 'D4';
  const targetZone = params56.cutting_zone || 'Back';

  // ⭐ 앞머리(Fringe) 타겟 - 핵심!
  const targetFringeType = params56.fringe_type || 'No Fringe';
  const userHasFringe = targetFringeType && targetFringeType !== 'No Fringe' && targetFringeType !== 'None';

  // Section 영문 → 약어 매핑 (확장)
  const sectionToCode = {
    'Horizontal': 'HS',
    'Diagonal-Backward': 'DBS',
    'Diagonal-Forward': 'DFS',
    'Vertical': 'VS',
    'Radial': 'RS',
    'Pie': 'PIE'
  };
  const targetSectionCode = sectionToCode[targetSection] || 'VS';

  // Direction 영문 → 코드 매핑
  const directionToCode = {
    'Front': 'D0',
    'Front-Diagonal': 'D1',
    'Side': 'D2',
    'Back-Diagonal': 'D3',
    'Back': 'D4',
    'Back-Opposite': 'D5',
    'Side-Opposite': 'D6',
    'Front-Diagonal-Opposite': 'D7',
    'Front-Opposite': 'D8'
  };
  const targetDirectionCode = directionToCode[targetDirection] || targetDirection;

  // Zone 매핑 (Weight Zones 반영)
  const zoneMapping = {
    'Crown': ['Crown', 'Top', 'Zone_C'],
    'Top': ['Top', 'Crown', 'Zone_C'],
    'Side': ['Side', 'Zone_B'],
    'Back': ['Back', 'Nape', 'Zone_A', 'Zone_B'],
    'Nape': ['Nape', 'Back', 'Zone_A'],
    'Fringe': ['Fringe', 'Perimeter', 'Zone_C', 'Front']
  };
  const targetZones = zoneMapping[targetZone] || [targetZone];

  console.log(`🎯 도해도 매칭 타겟 (2WAY CUT):`);
  console.log(`   Celestial: ${targetCelestialAngle}°, Section: ${targetSectionCode}, Guide: ${targetGuideLine}`);
  console.log(`   Lifting: [${targetLiftingRange.join(',')}], Direction: ${targetDirectionCode}, Zone: ${targetZone}`);
  console.log(`   Fringe: ${targetFringeType} (유저 앞머리: ${userHasFringe ? '있음' : '없음'})`);

  // ==================== Top-1 스타일 도해도 우선 선별 ====================

  const selectedDiagrams = [];
  const usedUrls = new Set();

  // Top-1 스타일 처리
  const topStyle = top3Styles[0];
  let top1HasFringe = false;  // Top-1에 앞머리 도해도가 있는지
  let seriesPrefix = '';      // 시리즈 접두사 (FAL, MAL 등)

  if (topStyle && topStyle.diagrams && topStyle.diagrams.length > 0) {
    console.log(`📊 Top-1 스타일 (${topStyle.styleId}): ${topStyle.diagrams.length}장 도해도`);

    // 시리즈 접두사 추출 (FAL0023 → FAL)
    const styleIdMatch = topStyle.styleId.match(/^([A-Z]+)/);
    seriesPrefix = styleIdMatch ? styleIdMatch[1] : '';
    console.log(`   시리즈: ${seriesPrefix}`);

    // ⭐ 리프팅 값을 각도로 변환 (L2=45°, L4=90° 등)
    const liftingToAngle = {
      'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5, 'L4': 90,
      'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
    };
    const targetLiftingAngles = targetLiftingRange.map(l => liftingToAngle[l] || 90);
    const maxTargetAngle = Math.max(...targetLiftingAngles);
    const minTargetAngle = Math.min(...targetLiftingAngles);

    // ⭐ 디렉션 값을 각도로 변환
    const directionToAngle = {
      'D0': 0, 'D1': 45, 'D2': 90, 'D3': 135, 'D4': 180
    };
    const targetDirAngle = directionToAngle[targetDirectionCode] ?? 90;

    console.log(`   🎯 타겟: 리프팅 ${targetLiftingRange.join(',')} (${minTargetAngle}°~${maxTargetAngle}°), 디렉션 ${targetDirectionCode}, 섹션 ${targetSectionCode}, 존 ${targetZone}`);

    // Top-1 도해도를 종합 매칭 점수로 정렬 (리프팅, 섹션, 존, 디렉션 모두 고려)
    const scoredDiagrams = topStyle.diagrams.map((diagram, idx) => {
      const diagLifting = diagram.lifting || 'L4';
      const diagAngle = liftingToAngle[diagLifting] || 90;
      const diagSection = diagram.section || '';
      const diagZone = (diagram.zone || '').toLowerCase();
      const diagDirection = diagram.direction || 'D2';
      const diagDirAngle = directionToAngle[diagDirection] ?? 90;

      // ⭐ 도해도의 존에 맞는 타겟 리프팅 결정
      let zoneTargetLifting = null;
      if (hasZoneLiftings) {
        if (diagZone.includes('back') || diagZone.includes('nape')) {
          zoneTargetLifting = liftingByZone.back;
        } else if (diagZone.includes('side')) {
          zoneTargetLifting = liftingByZone.side;
        } else if (diagZone.includes('top') || diagZone.includes('crown')) {
          zoneTargetLifting = liftingByZone.top;
        } else if (diagZone.includes('fringe') || diagZone.includes('front') || diagZone.includes('bang')) {
          zoneTargetLifting = liftingByZone.fringe;
        }
      }

      // === 1. 리프팅 점수 (0~100, 가중치 50%) - 존별 리프팅 우선! ===
      let liftingScore = 0;
      let exactZoneMatch = false;

      // ⭐ 존별 리프팅이 있으면 정확히 매칭 (최우선!)
      if (zoneTargetLifting && diagLifting === zoneTargetLifting) {
        liftingScore = 100;
        exactZoneMatch = true;
      } else if (targetLiftingRange.includes(diagLifting)) {
        liftingScore = 100; // 범위 내 매칭
      } else if (diagAngle >= minTargetAngle && diagAngle <= maxTargetAngle) {
        liftingScore = 80; // 각도 범위 내
      } else {
        const angleDiff = Math.min(
          Math.abs(diagAngle - minTargetAngle),
          Math.abs(diagAngle - maxTargetAngle)
        );
        liftingScore = Math.max(0, 60 - angleDiff);
      }

      // === 2. 섹션 점수 (0~100, 가중치 25%) ===
      let sectionScore = 0;
      if (diagSection === targetSectionCode) {
        sectionScore = 100; // 정확히 매칭
      } else if (diagSection && targetSectionCode) {
        // 비슷한 섹션 그룹 체크 (확장된 매핑)
        const horizontalSections = ['H', 'HD', 'HU', 'HS', 'Horizontal'];
        const verticalSections = ['V', 'VL', 'VR', 'VS', 'Vertical'];
        const diagonalForwardSections = ['DF', 'DFS', 'Diagonal-Forward', 'Diagonal_Fwd'];
        const diagonalBackwardSections = ['DB', 'DBS', 'Diagonal-Backward', 'Diagonal_Bkwd'];
        const radialSections = ['R', 'RS', 'Radial', 'Pie'];

        // 정확한 섹션 그룹 매칭
        const getDiagGroup = (sec) => {
          if (horizontalSections.some(s => sec.toUpperCase().includes(s.toUpperCase()))) return 'horizontal';
          if (verticalSections.some(s => sec.toUpperCase().includes(s.toUpperCase()))) return 'vertical';
          if (diagonalForwardSections.some(s => sec.toUpperCase().includes(s.toUpperCase()))) return 'dfs';
          if (diagonalBackwardSections.some(s => sec.toUpperCase().includes(s.toUpperCase()))) return 'dbs';
          if (radialSections.some(s => sec.toUpperCase().includes(s.toUpperCase()))) return 'radial';
          return 'other';
        };

        const diagGroup = getDiagGroup(diagSection);
        const targetGroup = getDiagGroup(targetSectionCode);

        if (diagGroup === targetGroup) {
          sectionScore = 100; // 같은 섹션 그룹
        } else if (
          // DFS와 DBS는 대각선 계열로 어느 정도 유사
          (diagGroup === 'dfs' && targetGroup === 'dbs') ||
          (diagGroup === 'dbs' && targetGroup === 'dfs')
        ) {
          sectionScore = 60; // 대각선 계열 (방향만 다름)
        } else {
          sectionScore = 30; // 완전히 다른 그룹
        }
      } else {
        sectionScore = 50; // 정보 없음
      }

      // === 3. 존(Zone) 점수 (0~100, 가중치 20%) ===
      let zoneScore = 50; // 기본값
      if (diagZone) {
        const zoneMatches = targetZones.some(tz =>
          diagZone.includes(tz.toLowerCase()) ||
          tz.toLowerCase().includes(diagZone)
        );
        zoneScore = zoneMatches ? 100 : 30;
      }

      // === 4. 디렉션 점수 (0~100, 가중치 15%) ===
      let directionScore = 50; // 기본값
      if (diagDirection && targetDirectionCode) {
        if (diagDirection === targetDirectionCode) {
          directionScore = 100;
        } else {
          const dirDiff = Math.abs(diagDirAngle - targetDirAngle);
          directionScore = Math.max(0, 100 - dirDiff);
        }
      }

      // === 종합 점수 (가중 평균) - 리프팅 강화! ===
      const totalScore = (
        liftingScore * 0.50 +    // 리프팅 50% (강화!)
        sectionScore * 0.25 +    // 섹션 25%
        zoneScore * 0.15 +       // 존 15%
        directionScore * 0.10    // 디렉션 10%
      );

      // ⭐⭐ 존별 정확한 리프팅 매칭 보너스 (최우선!)
      // - 존별 리프팅과 정확히 일치: +30점 (예: Back 존 도해도가 Back 리프팅 L2와 일치)
      // - 타겟 범위 내 일치: +20점
      let exactLiftingBonus = 0;
      if (exactZoneMatch) {
        exactLiftingBonus = 30; // 존별 정확한 매칭 (최고 우선순위!)
      } else if (targetLiftingRange.includes(diagLifting)) {
        exactLiftingBonus = 20; // 범위 내 매칭
      }

      // ⭐ 디렉션 정확 매칭 보너스 (+15점)
      const exactDirectionBonus = (diagDirection === targetDirectionCode) ? 15 : 0;

      return {
        ...diagram,
        idx,
        diagLifting,
        diagAngle,
        diagSection,
        diagZone,
        diagDirection,
        zoneTargetLifting, // 디버깅용
        exactZoneMatch,    // 존별 정확 매칭 여부
        exactDirectionMatch: diagDirection === targetDirectionCode, // 디렉션 정확 매칭
        liftingScore,
        sectionScore,
        zoneScore,
        directionScore,
        exactLiftingBonus,
        exactDirectionBonus,
        totalScore: totalScore + exactLiftingBonus + exactDirectionBonus  // 리프팅+디렉션 보너스 포함!
      };
    });

    // 종합 점수 + 존별 정확 매칭 + 리프팅 정확도 + step 순서로 정렬
    scoredDiagrams.sort((a, b) => {
      // 1차: 존별 정확 매칭 우선!
      if (a.exactZoneMatch !== b.exactZoneMatch) {
        return b.exactZoneMatch ? 1 : -1;
      }
      // 2차: 종합 점수 (보너스 포함)
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // 3차: 정확한 리프팅 매칭 우선
      if (b.exactLiftingBonus !== a.exactLiftingBonus) {
        return b.exactLiftingBonus - a.exactLiftingBonus;
      }
      // 4차: step 순서
      return (a.step || 0) - (b.step || 0);
    });

    // 매칭되는 도해도와 안 되는 도해도 분리 (종합 점수 50점 기준)
    const matchedDiagrams = scoredDiagrams.filter(d => d.totalScore >= 50);
    const unmatchedDiagrams = scoredDiagrams.filter(d => d.totalScore < 50);

    console.log(`   📊 종합 매칭: ${matchedDiagrams.length}장 매칭 (≥50점), ${unmatchedDiagrams.length}장 미매칭`);
    if (scoredDiagrams.length > 0) {
      const top5 = scoredDiagrams.slice(0, 5);
      top5.forEach((d, i) => {
        const zoneMatch = d.exactZoneMatch ? '⭐존매칭' : '';
        const dirMatch = d.exactDirectionMatch ? '🎯D매칭' : '';
        const zoneLift = d.zoneTargetLifting ? `타겟:${d.zoneTargetLifting}` : '';
        console.log(`      ${i+1}위: step${d.step || d.idx+1} [${d.diagLifting}/${d.diagDirection || '-'}/${d.diagZone}] - 총${d.totalScore.toFixed(0)}점 ${zoneMatch} ${dirMatch} ${zoneLift}`);
      });
    }

    // D4(온베이스) 매칭된 도해도가 있는지 체크
    const hasD4Diagram = scoredDiagrams.some(d => d.diagDirection === targetDirectionCode);
    console.log(`   📌 ${targetDirectionCode} 도해도: ${hasD4Diagram ? '있음' : '없음 → Fallback 필요'}`);
    if (!hasD4Diagram) {
      console.log(`   ⚠️ Top-1에 ${targetDirectionCode} 도해도 없음 - 시리즈 무관 Fallback 예정`);
    }

    // 매칭된 도해도 먼저 추가 (step 순서 유지)
    const addDiagram = (diagram, idx) => {
      if (selectedDiagrams.length >= maxDiagrams) return false;

      const urlKey = diagram.url ? diagram.url.split('/').pop() : `${topStyle.styleId}_${idx}`;
      if (usedUrls.has(urlKey)) return false;

      // 앞머리 도해도 체크
      const diagZone = diagram.zone || '';
      const isFringeDiagram = diagZone.toLowerCase().includes('fringe') ||
                              diagZone.toLowerCase().includes('bang') ||
                              diagZone.toLowerCase().includes('front') ||
                              (diagram.cutting_method || '').toLowerCase().includes('fringe');
      if (isFringeDiagram) {
        top1HasFringe = true;
      }

      usedUrls.add(urlKey);
      selectedDiagrams.push({
        styleId: topStyle.styleId,
        step: diagram.step || (idx + 1),
        url: diagram.url,
        styleRank: 1,
        source: 'Top-1',
        lifting: diagram.lifting || null,
        direction: diagram.direction || null,
        section: diagram.section || null,
        zone: diagram.zone || null,
        cuttingMethod: diagram.cutting_method || null,
        celestialAngle: diagram.celestial_angle || null,
        guideLine: diagram.guide_line || null,
        isFringe: isFringeDiagram,
        totalScore: diagram.totalScore || 0,
        liftingScore: diagram.liftingScore || 0,
        sectionScore: diagram.sectionScore || 0,
        zoneScore: diagram.zoneScore || 0,
        directionScore: diagram.directionScore || 0
      });
      return true;
    };

    // 1) 종합 점수 매칭된 도해도 먼저 (step 순서로)
    matchedDiagrams.sort((a, b) => (a.step || 0) - (b.step || 0));
    matchedDiagrams.forEach((d, i) => addDiagram(d, d.idx));

    // 2) 남은 자리에 미매칭 도해도 (step 순서로)
    unmatchedDiagrams.sort((a, b) => (a.step || 0) - (b.step || 0));
    unmatchedDiagrams.forEach((d, i) => addDiagram(d, d.idx));

    console.log(`   → Top-1에서 ${selectedDiagrams.length}장 선별 (종합 매칭 ${matchedDiagrams.length}장 우선)`);
    console.log(`   → Top-1 앞머리 도해도: ${top1HasFringe ? '있음' : '없음'}`);
  }

  // ==================== 누락된 기법/존 분석 및 같은 시리즈에서 보충 ====================

  // Top-1에서 커버된 기법/존 확인
  const coveredSections = new Set(selectedDiagrams.map(d => d.section).filter(Boolean));
  const coveredZones = new Set(selectedDiagrams.map(d => d.zone).filter(Boolean));
  const coveredLiftings = new Set(selectedDiagrams.map(d => d.lifting).filter(Boolean));

  // ⭐ 존별 리프팅에서 커버 여부 확인 (더 정확한 매칭!)
  // 각 존의 도해도가 해당 존의 타겟 리프팅과 일치하는지 체크
  const coveredZoneLiftings = {};
  if (hasZoneLiftings) {
    for (const diagram of selectedDiagrams) {
      const dZone = (diagram.zone || '').toLowerCase();
      const dLift = diagram.lifting;
      if (dZone.includes('back') || dZone.includes('nape')) {
        if (dLift === liftingByZone.back) coveredZoneLiftings.back = true;
      } else if (dZone.includes('side')) {
        if (dLift === liftingByZone.side) coveredZoneLiftings.side = true;
      } else if (dZone.includes('top') || dZone.includes('crown')) {
        if (dLift === liftingByZone.top) coveredZoneLiftings.top = true;
      } else if (dZone.includes('fringe') || dZone.includes('front') || dZone.includes('bang')) {
        if (dLift === liftingByZone.fringe) coveredZoneLiftings.fringe = true;
      }
    }
  }

  // ⭐ 필요한 리프팅 = 전체 범위 + 존별 리프팅 (중복 제거)
  const allNeededLiftings = new Set([
    ...targetLiftingRange,
    ...(hasZoneLiftings ? Object.values(liftingByZone).filter(Boolean) : [])
  ]);
  const missingLiftingsArray = [...allNeededLiftings].filter(l => !coveredLiftings.has(l));

  // 유저 이미지 분석 결과에서 필요한 기법/존 도출
  const requiredFeatures = {
    // 앞머리
    needsFringe: userHasFringe && !coveredZones.has('Fringe') && !coveredZones.has('Front'),
    // 섹션 기법
    needsTargetSection: !coveredSections.has(targetSectionCode),
    // 존 (Zone)
    needsNape: targetZones.includes('Nape') && !coveredZones.has('Nape'),
    needsBack: targetZones.includes('Back') && !coveredZones.has('Back'),
    needsSide: targetZones.includes('Side') && !coveredZones.has('Side'),
    needsCrown: targetZones.includes('Crown') && !coveredZones.has('Crown') && !coveredZones.has('Top'),
    // 리프팅 (전체 범위 + 존별 리프팅 포함!)
    missingLiftings: missingLiftingsArray,
    // ⭐ 존별 리프팅 누락 체크 (새로 추가)
    missingZoneLiftings: hasZoneLiftings ? {
      back: liftingByZone.back && !coveredZoneLiftings.back ? liftingByZone.back : null,
      side: liftingByZone.side && !coveredZoneLiftings.side ? liftingByZone.side : null,
      top: liftingByZone.top && !coveredZoneLiftings.top ? liftingByZone.top : null,
      fringe: liftingByZone.fringe && !coveredZoneLiftings.fringe ? liftingByZone.fringe : null
    } : {}
  };

  // ⭐ 존별 리프팅 누락 여부 체크
  const hasZoneLiftingGap = requiredFeatures.missingZoneLiftings && (
    requiredFeatures.missingZoneLiftings.back ||
    requiredFeatures.missingZoneLiftings.side ||
    requiredFeatures.missingZoneLiftings.top ||
    requiredFeatures.missingZoneLiftings.fringe
  );

  // 보충이 필요한지 확인 (존별 리프팅 누락 포함!)
  const needsSupplement = requiredFeatures.needsFringe ||
                          requiredFeatures.needsTargetSection ||
                          requiredFeatures.needsNape ||
                          requiredFeatures.needsBack ||
                          requiredFeatures.needsSide ||
                          requiredFeatures.needsCrown ||
                          requiredFeatures.missingLiftings.length > 0 ||
                          hasZoneLiftingGap;  // ⭐ 존별 리프팅 누락도 보충!

  // ⭐ 존별 리프팅 누락 시에는 maxDiagrams 제한 없이 보충!
  const canSupplement = selectedDiagrams.length < maxDiagrams || hasZoneLiftingGap;

  if (needsSupplement && seriesPrefix && canSupplement) {
    console.log(`\n⚠️ 누락된 기법/존 보충 필요 (${seriesPrefix} 시리즈 우선):`);
    if (requiredFeatures.needsFringe) console.log(`   - 앞머리 (Fringe)`);
    if (requiredFeatures.needsTargetSection) console.log(`   - 섹션: ${targetSectionCode}`);
    if (requiredFeatures.needsNape) console.log(`   - 존: Nape`);
    if (requiredFeatures.needsBack) console.log(`   - 존: Back`);
    if (requiredFeatures.needsSide) console.log(`   - 존: Side`);
    if (requiredFeatures.needsCrown) console.log(`   - 존: Crown/Top`);
    if (requiredFeatures.missingLiftings.length > 0) console.log(`   - 리프팅: ${requiredFeatures.missingLiftings.join(', ')}`);
    // ⭐ 존별 누락 리프팅 출력
    if (requiredFeatures.missingZoneLiftings) {
      const mzl = requiredFeatures.missingZoneLiftings;
      const missing = [];
      if (mzl.back) missing.push(`Back:${mzl.back}`);
      if (mzl.side) missing.push(`Side:${mzl.side}`);
      if (mzl.top) missing.push(`Top:${mzl.top}`);
      if (mzl.fringe) missing.push(`Fringe:${mzl.fringe}`);
      if (missing.length > 0) console.log(`   - 존별 리프팅 미매칭: ${missing.join(', ')}`);
    }

    // 검색 대상: allStyles (전체 스타일) > top3Styles
    const seriesToSearch = allStyles || top3Styles;

    // 같은 시리즈 스타일만 필터링 (Top-1 제외)
    const sameSeriesStyles = seriesToSearch.filter(style =>
      style && style.styleId &&
      style.styleId.startsWith(seriesPrefix) &&
      style.styleId !== topStyle.styleId &&
      style.diagrams && style.diagrams.length > 0
    );

    console.log(`   📂 같은 시리즈 스타일: ${sameSeriesStyles.length}개`);

    // 각 스타일에서 누락된 기법/존 도해도 찾기
    const supplementCandidates = [];

    for (const style of sameSeriesStyles) {
      for (const diagram of style.diagrams) {
        const urlKey = diagram.url ? diagram.url.split('/').pop() : `${style.styleId}_${diagram.step}`;
        if (usedUrls.has(urlKey)) continue;

        let supplementScore = 0;
        const reasons = [];
        let category = 'general'; // 분류: fringe, section, zone, lifting

        const diagZone = (diagram.zone || '').toLowerCase();
        const diagSection = diagram.section || '';
        const diagLifting = diagram.lifting || '';
        const diagMethod = (diagram.cutting_method || '').toLowerCase();

        // 1. 앞머리 보충 (최우선)
        if (requiredFeatures.needsFringe) {
          const isFringeDiagram = diagZone.includes('fringe') || diagZone.includes('bang') ||
                                  diagZone.includes('front') || diagMethod.includes('fringe') ||
                                  diagMethod.includes('bang');
          if (isFringeDiagram) {
            supplementScore += 50;
            reasons.push('앞머리');
            category = 'fringe';
          }
        }

        // 2. 섹션 기법 보충
        if (requiredFeatures.needsTargetSection && diagSection === targetSectionCode) {
          supplementScore += 40;
          reasons.push(`섹션:${diagSection}`);
          category = 'section';
        }

        // 3. 존(Zone) 보충
        if (requiredFeatures.needsNape && (diagZone.includes('nape') || diagZone === 'zone_a')) {
          supplementScore += 35;
          reasons.push('Nape존');
          category = 'zone';
        }
        if (requiredFeatures.needsBack && diagZone.includes('back')) {
          supplementScore += 30;
          reasons.push('Back존');
          category = 'zone';
        }
        if (requiredFeatures.needsSide && diagZone.includes('side')) {
          supplementScore += 30;
          reasons.push('Side존');
          category = 'zone';
        }
        if (requiredFeatures.needsCrown && (diagZone.includes('crown') || diagZone.includes('top') || diagZone === 'zone_c')) {
          supplementScore += 30;
          reasons.push('Crown존');
          category = 'zone';
        }

        // 4. 리프팅 보충
        if (requiredFeatures.missingLiftings.includes(diagLifting)) {
          supplementScore += 25;
          reasons.push(`리프팅:${diagLifting}`);
          category = 'lifting';
        }

        // ⭐ 5. 존별 리프팅 정확 매칭 보너스 (최우선!)
        // 도해도의 존과 리프팅이 타겟과 정확히 일치하면 +40점
        const mzl = requiredFeatures.missingZoneLiftings || {};
        if (mzl.back && (diagZone.includes('back') || diagZone.includes('nape')) && diagLifting === mzl.back) {
          supplementScore += 40;
          reasons.push(`Back존+${diagLifting}정확매칭`);
          category = 'zone_lifting';
        }
        if (mzl.side && diagZone.includes('side') && diagLifting === mzl.side) {
          supplementScore += 40;
          reasons.push(`Side존+${diagLifting}정확매칭`);
          category = 'zone_lifting';
        }
        if (mzl.top && (diagZone.includes('top') || diagZone.includes('crown')) && diagLifting === mzl.top) {
          supplementScore += 40;
          reasons.push(`Top존+${diagLifting}정확매칭`);
          category = 'zone_lifting';
        }
        if (mzl.fringe && (diagZone.includes('fringe') || diagZone.includes('front') || diagZone.includes('bang')) && diagLifting === mzl.fringe) {
          supplementScore += 40;
          reasons.push(`Fringe존+${diagLifting}정확매칭`);
          category = 'zone_lifting';
        }

        // 보충 점수가 있는 경우만 후보에 추가
        if (supplementScore > 0) {
          supplementCandidates.push({
            styleId: style.styleId,
            step: diagram.step || 99,
            url: diagram.url,
            urlKey: urlKey,
            supplementScore: supplementScore,
            category: category,
            reasons: reasons,
            // 메타데이터
            lifting: diagram.lifting || null,
            direction: diagram.direction || null,
            section: diagram.section || null,
            zone: diagram.zone || null,
            cuttingMethod: diagram.cutting_method || null,
            isFringe: category === 'fringe'
          });
        }
      }
    }

    // 점수순 정렬 후 보충
    supplementCandidates.sort((a, b) => b.supplementScore - a.supplementScore);

    console.log(`   🔍 보충 후보: ${supplementCandidates.length}개`);

    // 카테고리별 보충 (각 카테고리에서 최소 1개씩 보충 시도)
    const addedCategories = new Set();

    for (const supp of supplementCandidates) {
      // ⭐ zone_lifting 카테고리는 maxDiagrams 제한 무시! (정확한 존별 리프팅 매칭 중요)
      const isZoneLiftingMatch = supp.category === 'zone_lifting';
      if (selectedDiagrams.length >= maxDiagrams && !isZoneLiftingMatch) break;

      if (usedUrls.has(supp.urlKey)) continue;

      // 같은 카테고리에서 너무 많이 보충하지 않도록 (zone_lifting은 각 존당 1개씩, 일반은 최대 3개)
      const categoryCount = selectedDiagrams.filter(d => d.supplementCategory === supp.category).length;
      if (isZoneLiftingMatch && categoryCount >= 4) continue; // 존별 최대 4개 (back/side/top/fringe)
      if (!isZoneLiftingMatch && categoryCount >= 3) continue;

      usedUrls.add(supp.urlKey);

      // 커버된 기법/존 업데이트
      if (supp.section) coveredSections.add(supp.section);
      if (supp.zone) coveredZones.add(supp.zone);
      if (supp.lifting) coveredLiftings.add(supp.lifting);
      if (supp.isFringe) {
        coveredZones.add('Fringe');
        coveredZones.add('Front');
      }

      selectedDiagrams.push({
        styleId: supp.styleId,
        step: supp.step,
        url: supp.url,
        styleRank: 2, // 보충이므로 2순위
        source: `${seriesPrefix}-보충`,
        supplementReason: supp.reasons.join(', '),
        supplementCategory: supp.category,
        lifting: supp.lifting,
        direction: supp.direction,
        section: supp.section,
        zone: supp.zone,
        cuttingMethod: supp.cuttingMethod,
        isFringe: supp.isFringe
      });

      addedCategories.add(supp.category);
      console.log(`      ✅ ${supp.styleId} step${supp.step} (${supp.reasons.join(', ')})`);
    }

    // 보충 요약
    if (addedCategories.size > 0) {
      console.log(`   → 보충 완료: ${Array.from(addedCategories).join(', ')}`);
    } else {
      console.log(`   ⚠️ ${seriesPrefix} 시리즈에서 적합한 보충 도해도를 찾지 못함`);
    }
  }

  // ==================== 추가 보충 (Top-2, Top-3에서 - 시리즈 외) ====================

  // 아직 누락된 기법/존이 있고, 같은 시리즈에서 못 찾은 경우 Top-2, Top-3에서 보충
  if (selectedDiagrams.length < maxDiagrams && top3Styles.length > 1) {
    const stillMissing = {
      sections: !coveredSections.has(targetSectionCode),
      zones: targetZones.some(z => !coveredZones.has(z)),
      liftings: targetLiftingRange.some(l => !coveredLiftings.has(l))
    };

    if (stillMissing.sections || stillMissing.zones || stillMissing.liftings) {
      console.log(`\n   🔍 Top-2, Top-3에서 추가 보충 검토...`);

      for (let rank = 1; rank < Math.min(top3Styles.length, 3); rank++) {
        if (selectedDiagrams.length >= maxDiagrams) break;

        const style = top3Styles[rank];
        if (!style || !style.diagrams) continue;

        // 이미 같은 시리즈면 스킵 (위에서 처리됨)
        if (seriesPrefix && style.styleId.startsWith(seriesPrefix)) continue;

        const supplementDiagrams = [];

        style.diagrams.forEach((diagram, idx) => {
          const urlKey = diagram.url ? diagram.url.split('/').pop() : `${style.styleId}_${idx}`;
          if (usedUrls.has(urlKey)) return;

          let supplementScore = 0;
          const reasons = [];

          const diagSection = diagram.section;
          const diagZone = diagram.zone;
          const diagLifting = diagram.lifting;

          // 누락된 섹션
          if (stillMissing.sections && diagSection === targetSectionCode) {
            supplementScore += 30;
            reasons.push(`섹션:${diagSection}`);
          }

          // 누락된 존
          if (diagZone && !coveredZones.has(diagZone) && targetZones.includes(diagZone)) {
            supplementScore += 20;
            reasons.push(`존:${diagZone}`);
          }

          // 누락된 리프팅
          if (diagLifting && !coveredLiftings.has(diagLifting) && targetLiftingRange.includes(diagLifting)) {
            supplementScore += 25;
            reasons.push(`리프팅:${diagLifting}`);
          }

          if (supplementScore > 0) {
            supplementDiagrams.push({
              styleId: style.styleId,
              step: diagram.step || (idx + 1),
              url: diagram.url,
              urlKey: urlKey,
              supplementScore: supplementScore,
              styleRank: rank + 1,
              reasons: reasons,
              lifting: diagLifting,
              direction: diagram.direction || null,
              section: diagSection,
              zone: diagZone,
              cuttingMethod: diagram.cutting_method || null
            });
          }
        });

        supplementDiagrams.sort((a, b) => b.supplementScore - a.supplementScore);

        for (const supp of supplementDiagrams.slice(0, 3)) { // 각 스타일에서 최대 3개
          if (selectedDiagrams.length >= maxDiagrams) break;
          if (usedUrls.has(supp.urlKey)) continue;

          usedUrls.add(supp.urlKey);
          if (supp.section) coveredSections.add(supp.section);
          if (supp.zone) coveredZones.add(supp.zone);
          if (supp.lifting) coveredLiftings.add(supp.lifting);

          selectedDiagrams.push({
            styleId: supp.styleId,
            step: supp.step,
            url: supp.url,
            styleRank: supp.styleRank,
            source: `Top-${rank + 1}`,
            supplementReason: supp.reasons.join(', '),
            lifting: supp.lifting,
            direction: supp.direction,
            section: supp.section,
            zone: supp.zone,
            cuttingMethod: supp.cuttingMethod
          });

          console.log(`      + ${supp.styleId} step${supp.step} (${supp.reasons.join(', ')})`);
        }
      }
    }
  }

  // ==================== 리프팅/디렉션 도해도 Fallback (시리즈 무관) ====================
  // 리프팅/디렉션은 FAL/FBL 등 시리즈 상관없이 동일하므로, 없으면 아무 스타일에서나 가져옴

  const coveredDirections = new Set(selectedDiagrams.map(d => d.direction).filter(Boolean));
  const needsDirection = targetDirectionCode && !coveredDirections.has(targetDirectionCode);

  // 리프팅 Fallback: 타겟 리프팅 + 존별 리프팅이 커버되지 않았으면 시리즈 무관 검색
  // ⭐ 존별 리프팅(L3, L5, L6 등)도 포함!
  const allZoneLiftings = hasZoneLiftings ? Object.values(liftingByZone).filter(Boolean) : [];
  const allNeededLiftingsForFallback = [...new Set([...targetLiftingRange, ...allZoneLiftings])];
  const missingLiftingsAfterSupplement = allNeededLiftingsForFallback.filter(l => !coveredLiftings.has(l));

  // ⭐ 존별 리프팅 누락 시에는 maxDiagrams 제한 없이 Fallback!
  const canLiftingFallback = selectedDiagrams.length < maxDiagrams || hasZoneLiftingGap;

  if (missingLiftingsAfterSupplement.length > 0 && canLiftingFallback && allStyles) {
    console.log(`\n🔄 리프팅 ${missingLiftingsAfterSupplement.join(',')} 도해도 없음 → 시리즈 무관 검색...`);

    const liftingCandidates = [];

    for (const style of allStyles) {
      if (!style || !style.diagrams) continue;

      for (const diagram of style.diagrams) {
        const urlKey = diagram.url ? diagram.url.split('/').pop() : `${style.styleId}_${diagram.step}`;
        if (usedUrls.has(urlKey)) continue;

        const diagLifting = diagram.lifting || '';
        if (missingLiftingsAfterSupplement.includes(diagLifting)) {
          liftingCandidates.push({
            styleId: style.styleId,
            step: diagram.step || 99,
            url: diagram.url,
            urlKey: urlKey,
            lifting: diagLifting,
            direction: diagram.direction || null,
            section: diagram.section || null,
            zone: diagram.zone || null,
            cuttingMethod: diagram.cutting_method || null
          });
        }
      }
    }

    console.log(`   🔍 리프팅 ${missingLiftingsAfterSupplement.join(',')} 도해도 후보: ${liftingCandidates.length}개`);

    // 각 리프팅당 최대 2개까지 보충 (존별 리프팅 누락 시에는 제한 완화)
    const addedLiftings = new Set();
    for (const candidate of liftingCandidates) {
      // 존별 리프팅 누락 시에는 maxDiagrams 제한 완화 (최대 20장까지)
      if (selectedDiagrams.length >= maxDiagrams + 5 && !hasZoneLiftingGap) break;
      if (selectedDiagrams.length >= maxDiagrams && !hasZoneLiftingGap) break;
      if (usedUrls.has(candidate.urlKey)) continue;

      // 같은 리프팅은 2개까지만
      const sameCount = selectedDiagrams.filter(d => d.lifting === candidate.lifting && d.source === 'Lifting-Fallback').length;
      if (sameCount >= 2) continue;

      usedUrls.add(candidate.urlKey);
      coveredLiftings.add(candidate.lifting);
      addedLiftings.add(candidate.lifting);

      selectedDiagrams.push({
        styleId: candidate.styleId,
        step: candidate.step,
        url: candidate.url,
        styleRank: 3,
        source: 'Lifting-Fallback',
        supplementReason: `리프팅:${candidate.lifting}`,
        lifting: candidate.lifting,
        direction: candidate.direction,
        section: candidate.section,
        zone: candidate.zone,
        cuttingMethod: candidate.cuttingMethod
      });

      console.log(`      ✅ ${candidate.styleId} step${candidate.step} (리프팅:${candidate.lifting})`);
    }
  }

  if (needsDirection && selectedDiagrams.length < maxDiagrams && allStyles) {
    console.log(`\n🔄 디렉션 ${targetDirectionCode} 도해도 없음 → 시리즈 무관 검색...`);

    // 전체 스타일에서 디렉션 도해도 찾기 (시리즈 무관)
    const directionCandidates = [];

    for (const style of allStyles) {
      if (!style || !style.diagrams) continue;

      for (const diagram of style.diagrams) {
        const urlKey = diagram.url ? diagram.url.split('/').pop() : `${style.styleId}_${diagram.step}`;
        if (usedUrls.has(urlKey)) continue;

        const diagDirection = diagram.direction || '';
        if (diagDirection === targetDirectionCode) {
          directionCandidates.push({
            styleId: style.styleId,
            step: diagram.step || 99,
            url: diagram.url,
            urlKey: urlKey,
            direction: diagDirection,
            lifting: diagram.lifting || null,
            section: diagram.section || null,
            zone: diagram.zone || null,
            cuttingMethod: diagram.cutting_method || null
          });
        }
      }
    }

    console.log(`   🔍 ${targetDirectionCode} 도해도 후보: ${directionCandidates.length}개`);

    // 최대 2개까지 디렉션 도해도 보충
    for (const candidate of directionCandidates.slice(0, 2)) {
      if (selectedDiagrams.length >= maxDiagrams) break;
      if (usedUrls.has(candidate.urlKey)) continue;

      usedUrls.add(candidate.urlKey);
      coveredDirections.add(candidate.direction);

      selectedDiagrams.push({
        styleId: candidate.styleId,
        step: candidate.step,
        url: candidate.url,
        styleRank: 3, // fallback이므로 3순위
        source: 'Direction-Fallback',
        supplementReason: `디렉션:${candidate.direction}`,
        lifting: candidate.lifting,
        direction: candidate.direction,
        section: candidate.section,
        zone: candidate.zone,
        cuttingMethod: candidate.cuttingMethod
      });

      console.log(`      ✅ ${candidate.styleId} step${candidate.step} (디렉션:${candidate.direction})`);
    }
  }

  // ==================== 최종 정렬 (스타일 순위 → step 순서, 앞머리는 마지막) ====================

  const finalDiagrams = selectedDiagrams.sort((a, b) => {
    // 앞머리는 마지막으로
    if (a.isFringe && !b.isFringe) return 1;
    if (!a.isFringe && b.isFringe) return -1;

    // 1차: 스타일 순위 (Top-1 → 보충)
    if (a.styleRank !== b.styleRank) {
      return a.styleRank - b.styleRank;
    }
    // 2차: 같은 스타일 내에서 step 순서
    return a.step - b.step;
  });

  // ==================== 결과 로그 ====================

  console.log(`\n📊 최종 도해도 선별 결과: ${finalDiagrams.length}장`);

  // 스타일별 통계
  const styleStats = {};
  let fringeCount = 0;
  finalDiagrams.forEach(d => {
    if (!styleStats[d.styleId]) {
      styleStats[d.styleId] = { count: 0, rank: d.styleRank };
    }
    styleStats[d.styleId].count++;
    if (d.isFringe) fringeCount++;
  });

  Object.entries(styleStats).forEach(([styleId, stat]) => {
    console.log(`   ${styleId} (${stat.rank === 1 ? 'Top-1' : '보충'}): ${stat.count}장`);
  });

  if (fringeCount > 0) {
    console.log(`   📌 앞머리 도해도: ${fringeCount}장`);
  }

  // 상위 5개 도해도 상세 (URL 포함)
  console.log(`\n   상위 도해도:`);
  finalDiagrams.slice(0, 5).forEach((d, i) => {
    const meta = [d.lifting, d.section, d.zone].filter(Boolean).join('/');
    const fringeTag = d.isFringe ? ' [앞머리]' : '';
    console.log(`   ${i+1}. ${d.styleId} step${d.step} [${meta || '-'}] (${d.source})${fringeTag}`);
    console.log(`      URL: ${d.url || 'N/A'}`);
  });

  return finalDiagrams;
}

/**
 * 특성 기반 스타일 점수 계산 - 2WAY CUT SYSTEM 기반 (모듈별 기법 매칭, 250점 만점)
 * 자막(caption) 키워드 대신 구조화된 메타데이터와 스키마 함수 활용
 */
function calculateFeatureScore(style, params56, captionText) {
  let score = 0;
  const reasons = [];

  // 자막 (보조용)
  const caption = (captionText || '').toLowerCase();

  // ⭐ Firestore 도해도 메타데이터 추출 (구조화된 데이터 우선!)
  const diagrams = style.diagrams || [];
  const styleLiftings = [...new Set(diagrams.map(d => d.lifting).filter(Boolean))];
  const styleSections = [...new Set(diagrams.map(d => d.section).filter(Boolean))];
  const styleZones = [...new Set(diagrams.map(d => d.zone).filter(Boolean))];
  const styleDirections = [...new Set(diagrams.map(d => d.direction).filter(Boolean))];
  const styleLiftingAngles = [...new Set(diagrams.map(d => d.lifting_angle).filter(a => a !== null && a !== undefined))];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚫 필수 조건 필터링 - 핵심 변수 불일치 시 제외
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 1. Celestial Angle (리프팅 각도) 필수 매칭
  const targetAngle = params56.celestial_angle || params56.graduation_angle || null;
  if (targetAngle !== null && styleLiftingAngles.length > 0) {
    // 허용 범위: 정확히 일치하거나 ±15도 이내
    const hasMatchingAngle = styleLiftingAngles.some(angle =>
      angle === targetAngle || Math.abs(angle - targetAngle) <= 15
    );
    if (!hasMatchingAngle) {
      // 각도가 완전히 다르면 제외 (예: 90도 요청인데 0도 도해도)
      return { score: -1000, reasons: ['각도 불일치 제외'], excluded: true };
    }
  }

  // 2. Section 타입 필수 매칭 (메타데이터가 있는 경우)
  const targetSection = determineSectionType(params56);
  if (targetSection && styleSections.length > 0) {
    // 관련 섹션도 허용 (HS↔VS는 다르지만, DFS↔DBS는 대각선으로 유사)
    const relatedSections = {
      'HS': ['HS'],
      'VS': ['VS'],
      'DFS': ['DFS', 'DBS'],  // 대각선끼리는 허용
      'DBS': ['DBS', 'DFS']
    };
    const allowedSections = relatedSections[targetSection] || [targetSection];
    const hasMatchingSection = styleSections.some(s => allowedSections.includes(s));
    if (!hasMatchingSection) {
      return { score: -1000, reasons: ['섹션 불일치 제외'], excluded: true };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐⭐ 0. 9 Matrix 매칭 (30점) - 라인 형태 기반
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    const analysisMatch = matchStyleFromParams(params56);

    // 스타일에 저장된 shape_of_line과 비교
    if (style.shape_of_line && params56.shape_of_line) {
      if (style.shape_of_line === params56.shape_of_line) {
        score += 30;
        reasons.push(`라인형태: ${params56.shape_of_line}`);
      } else {
        // 자막에서 라인 형태 키워드 검색
        const lineTypeKw = {
          'Triangular': ['삼각', 'triangle', 'triangular', '뾰족', 'a-line'],
          'Square': ['사각', 'square', '각진', '네모', '박스', '스퀘어'],
          'Round': ['둥근', 'round', '곡선', '라운드', '부드러운']
        };
        const keywords = lineTypeKw[params56.shape_of_line] || [];
        if (keywords.some(kw => caption.includes(kw))) {
          score += 20;
          reasons.push(`${params56.shape_of_line} (자막매칭)`);
        }
      }
    }

    // 매트릭스 코드 매칭 (OG, GO, LO, OL, GL, LG, OGL, LGO, GOL)
    if (analysisMatch.matrix && caption.includes(analysisMatch.matrix.toLowerCase())) {
      score += 10;
      reasons.push(`Matrix: ${analysisMatch.matrix}`);
    }
  } catch (e) {
    // 매트릭스 매칭 실패 시 무시
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐⭐ 1. CELESTIAL ANGLE 매칭 (40점) - 핵심!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // targetAngle은 위에서 이미 선언됨 (3707)
  if (targetAngle !== null) {
    // 자막에서 각도 추출
    const anglePatterns = [
      { angle: 0, keywords: ['0도', '0°', '원렝스', 'one length', '천체축 각도 0'] },
      { angle: 15, keywords: ['15도', '15°', 'low grad', '로우 그래쥬'] },
      { angle: 45, keywords: ['45도', '45°', 'mid grad', '미디엄', '중간'] },
      { angle: 75, keywords: ['75도', '75°', 'high grad', '하이 그래쥬'] },
      { angle: 90, keywords: ['90도', '90°', 'layer', '레이어'] },
      { angle: 135, keywords: ['135도', '135°', 'high layer', '하이레이어'] }
    ];

    for (const pattern of anglePatterns) {
      if (pattern.keywords.some(kw => caption.includes(kw))) {
        if (pattern.angle === targetAngle) {
          score += 40;
          reasons.push(`Celestial Angle ${targetAngle}° 정확매칭`);
        } else if (Math.abs(pattern.angle - targetAngle) <= 15) {
          score += 20;
          reasons.push(`Celestial Angle 근접 (${pattern.angle}°)`);
        }
        break;
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐⭐ 2. GUIDE LINE 매칭 (25점) - Fixed vs Traveling
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.guide_line) {
    const guideKeywords = {
      'Fixed': ['고정', 'fixed', 'stationary', '고정 디자인 라인', '고정 가이드'],
      'Traveling': ['이동', 'traveling', 'mobile', '이동 가이드', '따라감']
    };
    const keywords = guideKeywords[params56.guide_line] || [];
    if (keywords.some(kw => caption.includes(kw))) {
      score += 25;
      reasons.push(`Guide: ${params56.guide_line}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐ 3. DISTRIBUTION 매칭 (25점) - 분배 방식
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.distribution) {
    const distKeywords = {
      'Natural': ['자연', 'natural', '자연빗질'],
      'Perpendicular': ['수직', 'perpendicular', '수직분배', '수직 분배'],
      'Variable': ['변이', 'variable', '변이분배', '변이 분배', '비틀'],
      'Directional': ['방향', 'directional', '방향성']
    };
    const keywords = distKeywords[params56.distribution] || [];
    if (keywords.some(kw => caption.includes(kw))) {
      score += 25;
      reasons.push(`Distribution: ${params56.distribution}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐ 4. SECTION 매칭 (30점) - 구조화된 데이터 우선!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sectionType = determineSectionType(params56);

  // ⭐ 도해도 메타데이터에서 직접 섹션 매칭 (20점)
  if (styleSections.length > 0) {
    if (styleSections.includes(sectionType)) {
      score += 20;
      reasons.push(`Section: ${sectionType} (메타데이터)`);
    } else {
      // 관련 섹션 부분 점수
      const relatedSections = {
        'HS': ['VS'],
        'VS': ['HS'],
        'DBS': ['VS', 'DFS'],
        'DFS': ['VS', 'DBS']
      };
      if (relatedSections[sectionType]?.some(s => styleSections.includes(s))) {
        score += 10;
        reasons.push(`Section 관련: ${styleSections.join(',')}`);
      }
    }
  } else {
    // 도해도 메타데이터 없으면 자막 기반 (fallback)
    const sectionKeywords = {
      'HS': ['가로', 'horizontal', 'hs', '수평', '가로섹션'],
      'DBS': ['후대각', 'diagonal back', 'dbs', '뒤쪽', '후대각섹션'],
      'DFS': ['전대각', 'diagonal forward', 'dfs', '앞쪽', '전대각섹션'],
      'VS': ['세로', 'vertical', 'vs', '수직', '세로섹션'],
      'PS': ['파이', 'pie', '파이섹션'],
      'RS': ['방사', 'radial', '방사섹션']
    };
    const sectionKws = sectionKeywords[sectionType] || [];
    if (sectionKws.some(kw => caption.includes(kw))) {
      score += 15;
      reasons.push(`Section: ${sectionType} (자막)`);
    }
  }

  // ⭐ Lifting Angle 직접 매칭 (10점) - 도해도의 lifting_angle 활용
  if (styleLiftingAngles.length > 0) {
    const targetAngleFromLifting = params56.celestial_angle || params56.graduation_angle || 45;
    // 정확히 일치하는 각도가 있는지
    if (styleLiftingAngles.includes(targetAngleFromLifting)) {
      score += 10;
      reasons.push(`Lifting Angle ${targetAngleFromLifting}° 매칭`);
    } else if (styleLiftingAngles.some(a => Math.abs(a - targetAngleFromLifting) <= 15)) {
      score += 5;
      reasons.push(`Lifting Angle 근접`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐⭐ 5. 모듈별 기법 매칭 (DFS/DBS/VS) (30점)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    if (sectionType === 'DFS') {
      const dfsTech = determineDFSTechnique(params56);
      // DFS NO.1, NO.2, NO.3 매칭
      if (caption.includes(`dfs no.${dfsTech.number}`) || caption.includes(`전대각 no.${dfsTech.number}`)) {
        score += 30;
        reasons.push(`DFS NO.${dfsTech.number}`);
      } else if (caption.includes(dfsTech.name.toLowerCase())) {
        score += 20;
        reasons.push(`DFS: ${dfsTech.name}`);
      }
    } else if (sectionType === 'DBS') {
      const dbsTech = determineDBSTechnique(params56);
      if (caption.includes(`dbs no.${dbsTech.number}`) || caption.includes(`후대각 no.${dbsTech.number}`)) {
        score += 30;
        reasons.push(`DBS NO.${dbsTech.number}`);
      } else if (dbsTech.name && caption.includes(dbsTech.name.toLowerCase())) {
        score += 20;
        reasons.push(`DBS: ${dbsTech.name}`);
      }
    } else if (sectionType === 'VS') {
      const vsTech = determineVSTechnique(params56);
      if (caption.includes(`vs no.${vsTech.number}`) || caption.includes(`세로 no.${vsTech.number}`)) {
        score += 30;
        reasons.push(`VS NO.${vsTech.number}`);
      }
    }
  } catch (e) {
    // 기법 매칭 실패 시 무시
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. CUT FORM 매칭 (20점)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.cut_form) {
    const form = params56.cut_form.charAt(0);
    const formKeywords = {
      'L': ['레이어', 'layer'],
      'G': ['그래쥬에이션', 'graduation', '그라데이션'],
      'O': ['원렝스', 'one length', '일자']
    };
    const kws = formKeywords[form] || [];
    if (kws.some(kw => caption.includes(kw))) {
      score += 20;
      reasons.push(`${form === 'L' ? 'Layer' : form === 'G' ? 'Graduation' : 'One Length'}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. LIFTING RANGE 매칭 (25점) - 구조화된 데이터 우선!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.lifting_range && Array.isArray(params56.lifting_range)) {
    // ⭐ 도해도 메타데이터에서 직접 lifting 매칭
    if (styleLiftings.length > 0) {
      const matchCount = params56.lifting_range.filter(l => styleLiftings.includes(l)).length;
      if (matchCount > 0) {
        const liftingScore = Math.min(matchCount * 8, 25);
        score += liftingScore;
        reasons.push(`Lifting ${params56.lifting_range.filter(l => styleLiftings.includes(l)).join(',')} 매칭`);
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7-1. ZONE 매칭 (15점) - 도해도 zone 메타데이터 활용
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (styleZones.length > 0) {
    // 타겟 존 (분석된 볼륨 위치 기반)
    const targetZones = [];
    if (params56.volume_position) {
      targetZones.push(...(Array.isArray(params56.volume_position) ? params56.volume_position : [params56.volume_position]));
    }
    if (params56.cutting_zone) {
      targetZones.push(params56.cutting_zone);
    }
    // 기본 존 추가
    if (targetZones.length === 0) {
      targetZones.push('Back', 'Side', 'Nape');
    }

    const zoneMatchCount = targetZones.filter(z =>
      styleZones.some(sz => sz.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(sz.toLowerCase()))
    ).length;

    if (zoneMatchCount > 0) {
      score += Math.min(zoneMatchCount * 5, 15);
      reasons.push(`Zone 매칭: ${zoneMatchCount}개`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7-2. DIRECTION 매칭 (10점) - 도해도 direction 메타데이터 활용
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (styleDirections.length > 0 && params56.direction_primary) {
    if (styleDirections.includes(params56.direction_primary)) {
      score += 10;
      reasons.push(`Direction: ${params56.direction_primary}`);
    } else {
      // 인접 방향 부분 점수 (D3 ↔ D4 등)
      const targetDir = parseInt(params56.direction_primary.replace('D', ''));
      const hasAdjacentDir = styleDirections.some(d => {
        const dirNum = parseInt(d.replace('D', ''));
        return Math.abs(dirNum - targetDir) === 1;
      });
      if (hasAdjacentDir) {
        score += 5;
        reasons.push(`Direction 인접`);
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. OUTLINE SHAPE 매칭 (15점)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.outline_shape) {
    const outlineKw = {
      'Square': ['스퀘어', 'square', '사각', '일자'],
      'Round': ['라운드', 'round', '둥근', '곡선'],
      'Triangle': ['삼각', 'triangle', '뾰족', 'a라인']
    };
    const kws = outlineKw[params56.outline_shape] || [];
    if (kws.some(kw => caption.includes(kw))) {
      score += 15;
      reasons.push(`Outline: ${params56.outline_shape}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. FRINGE (앞머리) 매칭 (15점) - 구조화된 데이터 우선!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.fringe_type) {
    const userHasFringe = params56.fringe_type !== 'No Fringe' && params56.fringe_type !== 'None';

    // ⭐ 도해도 zone에서 Fringe/Front/Bang 체크
    const styleHasFringe = styleZones.some(z =>
      z.toLowerCase().includes('fringe') ||
      z.toLowerCase().includes('bang') ||
      z.toLowerCase() === 'front'
    );

    // 정확히 일치 (둘 다 있거나 둘 다 없거나)
    if (userHasFringe === styleHasFringe) {
      score += 15;
      reasons.push(userHasFringe ? 'Fringe 매칭' : 'No Fringe 매칭');
    } else if (userHasFringe && !styleHasFringe) {
      // 유저는 앞머리 있는데 스타일에 없음 → 감점 아닌 0점
      reasons.push('Fringe 미매칭');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 10. WEIGHT/VOLUME 매칭 (10점)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (params56.weight_distribution) {
    const weightKw = {
      'Bottom Heavy': ['무게감', 'heavy', '하단', '무거'],
      'Top Heavy': ['가벼', 'light', '상단', '볼륨'],
      'Balanced': ['균형', 'balance', '중간']
    };
    const kws = weightKw[params56.weight_distribution] || [];
    if (kws.some(kw => caption.includes(kw))) {
      score += 10;
      reasons.push(`Weight: ${params56.weight_distribution}`);
    }
  }

  return { score, reasons };
}

/**
 * Gemini로 맞춤 레시피 생성 - 스타일 분석 기반 + abcde 북 참조
 */
async function generateCustomRecipe(params56, top3Styles, geminiKey) {
  try {
    // Top-3 스타일의 레시피 텍스트 준비 (textRecipe 우선, 없으면 captionText 사용)
    const recipeTexts = top3Styles.map((s, i) => {
      // textRecipe가 있으면 우선 사용 (Firestore에 저장된 정제된 레시피)
      const hasTextRecipe = !!s.textRecipe;
      const recipeContent = s.textRecipe || s.captionText || '레시피 없음';
      console.log(`   📝 ${s.styleId}: textRecipe=${hasTextRecipe ? '있음' : '없음'} (${recipeContent.length}자)`);
      return `[참고 스타일 ${i+1}: ${s.styleId}]\n${recipeContent}`;
    }).join('\n\n');

    console.log(`📚 참고 레시피 총 길이: ${recipeTexts.length}자`);

    // 핵심 파라미터 추출
    const liftingStr = Array.isArray(params56.lifting_range) ? params56.lifting_range.join(', ') : 'L4';

    // 스타일명 생성 (코드번호 제외, 한글 스타일명)
    const styleName = params56.style_name || params56.womens_cut_category || params56.mens_style_category || '맞춤 스타일';
    const lengthName = params56.length_category || 'D Length';
    const cutFormName = params56.cut_form || 'Layer';

    console.log('📚 abcde 북 참조하여 레시피 생성 중...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `당신은 2WAY CUT 시스템 전문가입니다.

## 📖 이론 인덱스 참조 (핵심 용어 정의)

### 2WAY CUT 핵심 개념
- **Lifting (리프팅)**: 모발을 두피에서 들어올리는 각도. L0~L8까지 9단계. L0=0°(원렝스), L4=90°(기본레이어), L8=180°(완전수직)
- **Direction (디렉션)**: 모발을 끌어당기는 방향. D0~D8까지 9단계. D0=정중앙, D4=측면(온베이스), D8=뒤쪽(오버디렉션)
- **Section (섹션)**: 머리를 나누는 구획. HS(수평), VS(수직), DFS(전대각), DBS(후대각)

### 커팅 형태 (Cut Form)
- **One Length (원렝스)**: 모든 모발이 같은 길이. L0 사용. 무게감 있고 깔끔한 라인
- **Graduation (그라데이션)**: 아래가 짧고 위가 긴 구조. L1~L3 사용. 무게선이 아래에 위치
- **Layer (레이어)**: 위가 짧고 아래가 긴 구조. L4~L8 사용. 가벼움과 움직임

### 존(Zone) & 섹션
- **A Zone & V Zone**: A존=앞쪽 영역(Anterior), V존=정수리 영역(Vertex)
- **Blocking (블로킹)**: 머리를 여러 구역으로 나누는 작업. 체계적 커팅의 기초
- **Panel (패널)**: 커팅 시 잡는 모발 묶음. 섹션 내의 작은 단위

### 디자인 요소
- **Design Line (디자인 라인)**: 고정 디자인라인(같은 길이 유지) vs 이동 디자인라인(점점 길이 변화)
- **Disconnection (디스커넥션)**: 층과 층을 연결하지 않고 분리. 극적인 볼륨과 움직임 생성
- **Perimeter Line (페리미터 라인)**: 모발의 가장 바깥쪽 경계선. 아웃라인

### 두상 & 균형
- **Head Point (헤드 포인트)**: 두상의 주요 기준점. 커팅의 기준이 됨
- **Occipital Bone (옥시피탈 본)**: 뒤통수 뼈. 후두부 커팅 시 중요한 기준점
- **Recession Area (리세션)**: 측두부 움푹 들어간 부분. 귀 위쪽 영역
- **Face Shape (페이스 쉐입)**: 얼굴형에 따른 스타일 추천. 둥근형, 긴형, 각진형 등

### 텍스처 & 마무리
- **Texturizing (텍스처라이징)**: 질감을 만드는 기법. 포인트컷, 슬라이싱 등
- **Personalizing (퍼스널라이징)**: 고객 개인에 맞춤화하는 작업

## ⭐⭐⭐ 핵심 규칙: 모든 전문용어와 수치에 쉬운 설명 추가! ⭐⭐⭐

참고 레시피의 기술적 내용(섹션, 리프팅, 디렉션 값)은 유지하되,
**모든 전문용어 뒤에 괄호()로 쉬운 설명을 추가**하세요.

### ⭐ 필수 설명 규칙 (매우 중요!) ⭐

**1. 리프팅 각도 설명:**
- "천체축각도 0도" → "천체축각도 0도 (머리를 들지 않고 자연스럽게 떨어뜨린 상태)"
- "천체축각도 67.5도" → "천체축각도 67.5도 (두피에서 약 70도 들어올림 - 손가락 두 마디 정도 띄움)"
- "천체축각도 75도" → "천체축각도 75도 (두피에서 약 75도 들어올림 - 거의 수직에 가깝게)"
- "천체축각도 90도" → "천체축각도 90도 (두피와 완전히 수직으로 들어올림)"
- "천체축각도 135도" → "천체축각도 135도 (수직을 넘어 반대쪽으로 45도 더 넘김)"
- "천체축각도 180도" → "천체축각도 180도 (두피와 완전히 평행하게 눕힘)"

**2. 디렉션 기점 설명:**
- "D0 기점" → "D0 기점 (머리 정중앙 - 앞이마 중앙선)"
- "D4 기점" → "D4 기점 (눈꼬리 위쪽 - 얼굴 측면)"
- "D6 기점" → "D6 기점 (귀 바로 위쪽)"
- "D8 기점" → "D8 기점 (뒤통수 중앙 방향)"
- "D8~D6" → "D8~D6 기점 (뒤통수에서 귀 쪽으로 이동하며)"
- "D8~D4" → "D8~D4 기점 (뒤통수에서 눈꼬리 방향으로 이동하며)"

**3. 섹션 설명:**
- "전대각 섹션" → "전대각 섹션 (앞쪽으로 기울어진 대각선 방향 슬라이스)"
- "후대각 섹션" → "후대각 섹션 (뒤쪽으로 기울어진 대각선 방향 슬라이스)"
- "파이섹션" → "파이섹션 (부채꼴 모양으로 머리카락을 모아 잡는 방식)"
- "수평섹션" → "수평섹션 (가로로 일자 슬라이스)"

**4. 기법 설명:**
- "고정 디자인라인" → "고정 디자인라인 (가이드 길이를 유지하며 같은 길이로 자름)"
- "이동 디자인라인" → "이동 디자인라인 (점점 길이가 변하도록 자름 - 층 생성)"
- "디스커넥션" → "디스커넥션 (층과 층 사이를 연결하지 않고 분리 - 볼륨 극대화)"
- "스퀘어라인" → "스퀘어라인 (직각으로 자르는 기본 커팅 라인)"

**5. 존 설명:**
- "엑스터널" → "External (Under Zone)"
- "인터널" → "Internal (Over Zone)"
- "리셋션" → "리셋션 (측두부 라인 - 구레나룻 위쪽 영역)"
- "C존" → "C존 (정수리 뒤쪽 - 크라운 영역)"
- "F.S.P" → "F.S.P (Front Side Point - 앞쪽 측면 기점)"
- "S.P" → "S.P (Side Point - 측면 기점, 귀 윗부분)"

**6. 리프팅 코드 설명:**
- "L8 기점" → "L8 기점 (180도 들어올림 - 머리를 완전히 세운 상태)"
- "L4" → "L4 (90도 리프팅 - 두피와 수직)"

### 출력 형식:
존별로 구분하여 작성하고, 모든 전문용어에 괄호 설명을 붙이세요.

## ⚠️ 2WAY CUT 리프팅 각도 (절대 기준!) ⭐
| 코드 | 각도 | 설명 |
|------|------|------|
| L0 | 0° | 원렝스 (Natural Fall) |
| L1 | 22.5° | Low Graduation |
| L2 | 45° | Mid Graduation |
| L3 | 67.5° | High Graduation |
| L4 | 90° | 기본 레이어 (Square Layer) ⭐ |
| L5 | 112.5° | High Layer |
| L6 | 135° | Very High Layer |
| L7 | 157.5° | 정수리 레이어 |
| L8 | 180° | 완전 수직 (On Base) |

❗ 중요: L4는 90도입니다! 45도가 아닙니다!
❗ 레시피에서 리프팅 각도를 언급할 때 반드시 위 표를 참조하세요.

## 🎯 고객 요청 스타일 분석

### 기본 정보
- **기장**: ${params56.length_category || 'D Length'} (${params56.estimated_hair_length_cm || '35'}cm)
- **카테고리**: ${params56.womens_cut_category || 'Shoulder Length'}

### 핵심 커팅 파라미터 ⭐
- **Cut Form**: ${params56.cut_form || 'L (Layer)'}
- **Lifting Range**: ${liftingStr}
- **Section Primary**: ${params56.section_primary || 'Diagonal-Backward'}
- **Direction**: ${params56.direction_primary || 'D4'}
- **Cutting Method**: ${params56.cutting_method || 'Point Cut'}

### 구조/형태
- **Weight Distribution**: ${params56.weight_distribution || 'Balanced'}
- **Volume Zone**: ${params56.volume_zone || 'Medium'}
- **Connection Type**: ${params56.connection_type || 'Connected'}
- **Silhouette**: ${params56.silhouette || 'Round'}
- **Layer Type**: ${params56.layer_type || 'Mid Layer'}

### 앞머리/텍스처
- **Fringe**: ${params56.fringe_type || 'No Fringe'} (${params56.fringe_length || '-'})
- **Hair Texture**: ${params56.hair_texture || 'Straight'}
- **Surface Texture**: ${params56.surface_texture || 'Textured'}

### 아웃라인/형태
- **Outline Shape**: ${params56.outline_shape || 'Round'}
- **Silhouette**: ${params56.silhouette || 'Round'}
- **Line Quality**: ${params56.line_quality || 'Soft'}

### 얼굴형 매칭
- **추천 얼굴형**: ${Array.isArray(params56.face_shape_match) ? params56.face_shape_match.join(', ') : 'Oval'}

### 스타일 설명
${params56.description || '고객 요청 스타일'}

## 📚 참고 레시피 (Top-3) ⭐⭐⭐ 이 내용을 기반으로 작성하세요! ⭐⭐⭐
**아래 레시피 내용을 최대한 그대로 사용하고, 고객 파라미터에 맞게 살짝만 조정하세요.**

${recipeTexts}

---
위 참고 레시피의 존별 작업 순서와 기법 설명을 **기반으로** 맞춤 레시피를 작성하세요.
---

## ⚠️ 중요 규칙 - Outline Shape
- **Women's Cut + Layer/Graduation** → 반드시 "Round" 또는 "Curved" 아웃라인 사용!
- **Men's Cut** 또는 **블런트/에지 스타일** → "Square" 아웃라인 가능
- 부드러운 여성 스타일에 "Square"를 적용하면 안 됩니다!

## ⚠️ 중요 규칙 - Fringe Length (얼굴형별 추천)
| 얼굴형 | 추천 앞머리 | 효과 |
|-------|-----------|-----|
| Round | Cheekbone~Chin | 긴 사이드뱅으로 얼굴 좁게 |
| Square | Eyebrow~Eye | 부드러운 앞머리로 각진 인상 완화 |
| Long | Eyebrow | 짧은 앞머리로 얼굴 단축 |
| Oval | Eye~Cheekbone | 다양하게 어울림 |
| Heart | Cheekbone | 광대 커버 |

- Side Bang은 가운데가 짧아도 **양쪽은 광대~턱까지** 흘러내리는 게 정석!
- "Eyebrow" 길이만 언급하면 안 됩니다 - 사이드 길이도 명시!

## ⚠️ 중요 규칙 - 존별 섹션/리프팅/디렉션 ⭐⭐⭐
**❌ L4(90°) + DBS 남발 금지! 존별로 다르게 적용하세요!**

### 섹션 (Section) - 존별 적용
| 존 | 권장 섹션 | 이유 |
|-----|---------|------|
| Back | DBS (Diagonal-Backward) | 볼륨과 층 형성 |
| Side | **VS (Vertical)** | 얼굴 라인 유지, A라인 형성 |
| Top | DBS or VS | 볼륨에 따라 선택 |
| Fringe | HS (Horizontal) | 앞머리 라인 정리 |

⚠️ Side에 DBS 사용 시 얼굴쪽이 과도하게 가벼워지거나 파먹을 위험!

### 리프팅 (Lifting) - 무게감 기반 ⭐
| 스타일 특성 | 권장 각도 | 설명 |
|-----------|---------|------|
| High Layer (가벼움) | L6~L8 (135°~180°) | 뒷머리 뾰족, 볼륨 최대 |
| Mid Layer (보통) | L4~L5 (90°~112.5°) | 일반적인 레이어 |
| **Low Layer (무게감)** | **L2~L3 (45°~67.5°)** | 차분하게 흘러내림 ⭐ |
| One Length | L0~L1 (0°~22.5°) | 무게선 명확 |

⚠️ 윈드컷, 허쉬컷 등 **무게감 있는 레이어**는 L2~L3 사용!
❌ 모든 레이어에 L4(90°) 적용하면 안 됩니다!

### 디렉션 (Direction) - 얼굴 감싸기 ⭐
| 존 | 권장 방향 | 효과 |
|-----|---------|------|
| Back | D4 (On Base) | 수평 층 형성 |
| Side | **D8 (Over-direction)** | 앞이 길어지며 얼굴 감싸기 |
| Top | D4 | 자연스러운 볼륨 |

⚠️ Side에 D4만 사용하면 앞머리가 너무 짧아집니다!
→ **D8 (뒤로 당겨서 자름)**을 적용해야 A라인으로 얼굴을 예쁘게 감쌉니다!

## ✨ 요청사항
참고 레시피의 **기술적 내용은 유지**하되, **모든 전문용어에 괄호 설명을 추가**하여 초보자도 이해할 수 있게 작성하세요.

## ⭐⭐⭐ 레시피 작성 형식 (필수!) ⭐⭐⭐

### 📋 출력 형식 - 반드시 이 구조로 작성!

**이 스타일의 정보:**
- 스타일명: ${styleName}
- 기장: ${lengthName}
- Cut Form: ${cutFormName}

**아래 형식을 정확히 따라 작성하세요:**

---

## 🎯 스타일 개요
- **스타일명**: ${styleName}
- **기장**: ${lengthName}
- **Cut Form**: ${cutFormName}
- **특징**: (참고 레시피 기반으로 한 줄 요약)

---

## ✂️ 커팅 레시피

[External] (Under Zone)

### 📍 STEP 1. 아웃라인 설정

- 📐 **섹션**: (섹션 타입 + 설명)
- 📐 **리프팅**: (L코드 + 각도 + 쉬운 설명)
- 🔄 **디렉션**: (D코드 + 방향 설명)
- ✂️ **기법**: (기법명 + 효과 설명)
- 💡 **포인트**: (이 단계의 핵심 목적)

---

### 📍 STEP 2. 사이드 & 프레임

- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**:
- 💡 **포인트**:

---

[Internal] (Over Zone)

### 📍 STEP 3. 인터널 레이어 (볼륨층)

- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**:
- 💡 **포인트**:

---

### 📍 STEP 4. 탑 & 크라운

- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**:
- 💡 **포인트**:

---

### 📍 STEP 5. 프린지 (앞머리가 있는 경우)

- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**:
- 💡 **포인트**:

---

## 💇 마무리 & 스타일링

- **텍스처링**: (질감 처리 - 포인트컷, 슬라이싱 등)
- **드라이 방향**: (볼륨 연출 방향)
- **추천 제품**: (왁스/무스/오일 등)

---

### ⚠️ 필수 규칙:
1. 반드시 [External] (Under Zone)과 [Internal] (Over Zone)으로 구분
2. 각 STEP마다 "---" 구분선 사용
3. 이모지(📐🔄✂️💡)로 항목 구분
4. 모든 전문용어 뒤에 괄호()로 쉬운 설명
5. 스타일명은 "${styleName}"으로 반드시 표기`
            }]
          }],
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [GEMINI_FILE_SEARCH_STORE]
            }
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4000,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Recipe API Error:', response.status, errorText);
      throw new Error(`Recipe generation failed: ${response.status}`);
    }

    const data = await response.json();

    // File Search 응답에서 텍스트 추출 (여러 parts가 있을 수 있음)
    let recipeText = '';
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        recipeText += part.text;
      }
    }

    if (!recipeText) {
      console.error('❌ 레시피 텍스트 없음, 응답 구조:', JSON.stringify(data).substring(0, 500));
      throw new Error('레시피 텍스트를 찾을 수 없습니다');
    }

    console.log('✅ abcde 북 참조 레시피 생성 완료');
    console.log(`📝 레시피 길이: ${recipeText.length}자`);
    return recipeText;

  } catch (error) {
    console.error('❌ 레시피 생성 실패:', error);
    return '레시피 생성 중 오류가 발생했습니다.';
  }
}

/**
 * 이미지 분석 → 시리즈 필터링 → Top-3 참고 → 맞춤 레시피 생성
 * 스타일 분석 기반
 */

// ==================== 차이점 분석 함수 (Top-1 매칭 vs 유저 이미지) ====================
function analyzeDifferences(userParams, matchedStyle) {
  const differences = [];

  // 1. 앞머리 차이
  const userHasBangs = userParams.fringe_type && userParams.fringe_type !== 'No Fringe';
  const styleHasBangs = matchedStyle.captionText &&
    (matchedStyle.captionText.includes('프린지') || matchedStyle.captionText.includes('앞머리') || matchedStyle.captionText.includes('뱅'));

  if (userHasBangs && !styleHasBangs) {
    differences.push({
      feature: 'fringe',
      description: '앞머리 있음 (매칭 스타일에는 없음)',
      userValue: userParams.fringe_type,
      styleValue: 'No Fringe',
      suggestion: '앞머리 커트는 별도 프린지 도해도 참고'
    });
  } else if (!userHasBangs && styleHasBangs) {
    differences.push({
      feature: 'fringe',
      description: '앞머리 없음 (매칭 스타일에는 있음)',
      userValue: 'No Fringe',
      styleValue: 'With Fringe',
      suggestion: '프린지 부분 생략 가능'
    });
  }

  // 2. 길이 차이
  const userLength = userParams.length_category ? userParams.length_category.charAt(0) : null;
  const styleLength = matchedStyle.series ? matchedStyle.series.charAt(1) : null;

  if (userLength && styleLength && userLength !== styleLength) {
    differences.push({
      feature: 'length',
      description: `길이 차이: ${userLength} Length → ${styleLength} Length`,
      userValue: userLength,
      styleValue: styleLength,
      suggestion: `기본 형태는 동일, 길이만 ${userLength} Length로 조절`
    });
  }

  // 3. 볼륨 위치 차이
  if (userParams.volume_zone && matchedStyle.captionText) {
    const userVolumeZone = userParams.volume_zone.toLowerCase();
    const captionLower = matchedStyle.captionText.toLowerCase();

    if (userVolumeZone.includes('top') && !captionLower.includes('탑') && !captionLower.includes('정수리')) {
      differences.push({
        feature: 'volume',
        description: '탑 볼륨 필요 (매칭 스타일은 다른 위치)',
        userValue: userParams.volume_zone,
        suggestion: '정수리 부분 리프팅 각도 높임'
      });
    }
  }

  // 4. 텍스처 차이 (직모 vs 웨이브)
  if (userParams.hair_texture) {
    const userTexture = userParams.hair_texture.toLowerCase();
    if (userTexture.includes('wave') || userTexture.includes('curl')) {
      differences.push({
        feature: 'texture',
        description: '웨이브/컬 텍스처',
        userValue: userParams.hair_texture,
        suggestion: '펌 또는 스타일링으로 텍스처 연출 필요'
      });
    }
  }

  return differences;
}

async function analyzeAndMatchRecipe(payload, geminiKey) {
  const { image_base64, mime_type, gender, category, series } = payload;
  const startTime = Date.now();

  console.log(`🎯 이미지 분석 + 맞춤 레시피 생성 시작 (성별: ${gender || 'female'}, 카테고리: ${category || 'auto'}, 시리즈: ${series || 'auto'})...`);

  // 남자 스타일인 경우 별도 처리
  if (gender === 'male') {
    return await analyzeAndMatchMaleRecipe(payload, geminiKey);
  }

  // ⭐⭐⭐ 사용자가 선택한 시리즈 사용 (AI 분석 X) ⭐⭐⭐
  try {
    // 1. 사용자가 선택한 시리즈 사용 (기장 분석 생략)
    const t1 = Date.now();
    console.log(`🔍 [DEBUG] 수신된 category: "${category}", series: "${series}"`);
    const lengthCode = category || 'D'; // 사용자가 선택한 기장
    const targetSeriesCode = series || `F${lengthCode}L`;
    console.log(`⏱️ [1] 사용자 선택 시리즈: ${targetSeriesCode}, 기장코드: ${lengthCode} (${Date.now() - t1}ms)`);

    // 2. Firestore에서 해당 시리즈 스타일만 가져오기
    const t2 = Date.now();
    const allStyles = await getFirestoreStyles();

    // 해당 시리즈 스타일 필터링
    const seriesStylesAll = allStyles.filter(s =>
      s.series === targetSeriesCode || s.styleId.startsWith(targetSeriesCode)
    );

    // 대표이미지가 있는 스타일
    const seriesStylesWithImage = seriesStylesAll.filter(s => s.resultImage);

    console.log(`⏱️ [2] Firestore 조회: ${Date.now() - t2}ms`);
    console.log(`📚 ${targetSeriesCode} 시리즈: 전체 ${seriesStylesAll.length}개, 대표이미지 ${seriesStylesWithImage.length}개`);

    if (seriesStylesAll.length === 0) {
      throw new Error(`${targetSeriesCode} 시리즈에 스타일이 없습니다`);
    }

    let top1;
    let visionResult = { selectedStyleId: '', confidence: 'low', reason: '' };

    // 3. 대표이미지가 있으면 Vision 비교, 없으면 임베딩 기반 매칭
    const t3 = Date.now();
    if (seriesStylesWithImage.length > 0) {
      // ⭐⭐⭐ Gemini Vision으로 대표이미지와 직접 비교하여 Top-1 선택
      visionResult = await selectBestStyleByVision(
        image_base64,
        mime_type,
        seriesStylesWithImage,
        geminiKey
      );
      console.log(`⏱️ [3] Gemini Vision 직접 비교: ${Date.now() - t3}ms`);
      console.log(`🎯 Vision 선택: ${visionResult.selectedStyleId} (신뢰도: ${visionResult.confidence})`);
      console.log(`   선택 이유: ${visionResult.reason}`);

      top1 = seriesStylesWithImage.find(s => s.styleId === visionResult.selectedStyleId) || seriesStylesWithImage[0];
    } else {
      // 대표이미지 없으면 임베딩 기반 매칭 (기존 방식)
      console.log(`⚠️ 대표이미지 없음, 임베딩 기반 매칭 사용`);
      const params56Temp = await analyzeImageStructured(image_base64, mime_type, geminiKey);
      let queryEmbedding = null;
      if (params56Temp.description) {
        queryEmbedding = await generateQueryEmbedding(params56Temp.description, geminiKey);
      }

      const stylesWithScore = seriesStylesAll.map(style => {
        let similarity = 0;
        if (style.embedding && queryEmbedding) {
          similarity = cosineSimilarity(queryEmbedding, style.embedding);
        }
        return { ...style, similarity };
      });

      top1 = stylesWithScore.sort((a, b) => b.similarity - a.similarity)[0];
      visionResult = {
        selectedStyleId: top1.styleId,
        confidence: 'medium',
        reason: '임베딩 기반 유사도 매칭 (대표이미지 없음)'
      };
      console.log(`⏱️ [3] 임베딩 매칭: ${Date.now() - t3}ms`);
      console.log(`🎯 임베딩 선택: ${top1.styleId} (유사도: ${(top1.similarity * 100).toFixed(1)}%)`);
    }

    // 4. 상세 파라미터 분석 (UI 표시용)
    const t4 = Date.now();
    const params56 = await analyzeImageStructured(image_base64, mime_type, geminiKey);

    // ⭐⭐⭐ 사용자가 선택한 기장으로 강제 덮어쓰기 (AI 분석 결과 무시!)
    console.log(`🔍 [DEBUG] AI 분석 기장: "${params56.length_category}" → 강제 변경: "${lengthCode} Length"`);
    params56.length_category = `${lengthCode} Length`;
    console.log(`⏱️ [4] 상세 파라미터 분석: ${Date.now() - t4}ms (기장 강제: ${lengthCode} Length)`);
    console.log(`🔍 [DEBUG] 매칭 스타일: ${top1.styleId}, 시리즈: ${top1.series}`);

    // 6. Top-1 스타일의 textRecipe 가져오기 (보충 레시피 없이 원본 사용)
    let originalRecipe = top1.textRecipe || '';
    // 스타일ID 언급 제거 (사용자에게 보이지 않도록)
    originalRecipe = originalRecipe
      .replace(/\[?[FM]?[A-Z]{2,3}\d{4}\]?/g, '')  // 스타일ID 제거 (괄호 포함)
      .replace(/\[\s*\]/g, '')  // 빈 괄호 [] 제거
      .replace(/\s{2,}/g, ' ')  // 연속 공백 정리
      .trim();
    // ⭐ External/Internal 형식으로 통일
    originalRecipe = normalizeRecipeFormat(originalRecipe);

    // ⭐⭐⭐ Top-1 스타일의 도해도에서 실제 레시피 파라미터 추출 (애니메이션용)
    const top1Params = extractRecipeParamsFromStyle(top1);

    // ⭐ 이론 기반 어울리는 얼굴형 분석
    const formValue = params56.cut_form || 'L (Layer)';
    const silhouetteValue = params56.silhouette || 'Round';
    const outlineValue = params56.outline_shape || 'Round';
    const faceShapeMatch = getSuitableFaceShapes(formValue, silhouetteValue, outlineValue);
    console.log(`👤 어울리는 얼굴형: ${faceShapeMatch.faceShapes.join(', ')}`);

    console.log(`⏱️ 총 처리 시간: ${Date.now() - startTime}ms`);

    // 7. 결과 구성 - Top-1 레시피 그대로 반환
    const result = {
      // 스타일 파라미터 전체
      params56: params56,

      // 대상 시리즈 정보
      targetSeries: {
        code: targetSeriesCode,
        name: `${lengthCode} Length Series`,
        totalStyles: seriesStylesAll.length
      },

      // 분석 요약 (UI 표시용) - ⭐⭐⭐ Top-1 스타일의 실제 수치 사용! (AI 분석 아님)
      analysis: {
        length: lengthCode,
        lengthName: `${lengthCode} Length`,  // 사용자가 선택한 기장 유지
        form: params56.cut_form || 'L (Layer)',
        hasBangs: params56.fringe_type !== 'No Fringe',
        bangsType: params56.fringe_type || 'No Fringe',
        fringeLength: params56.fringe_length || 'None',
        volumePosition: top1Params.volumePosition,  // ⭐ Top-1 스타일 수치
        silhouette: params56.silhouette || 'Round',
        outlineShape: params56.outline_shape || 'Round',
        texture: params56.hair_texture || 'Straight',
        layerType: params56.layer_type || 'Mid Layer',
        celestialAngle: params56.celestial_angle || 90,
        liftingRange: top1Params.liftingRange,  // ⭐ Top-1 스타일 수치
        sectionPrimary: top1Params.sectionPrimary,  // ⭐ Top-1 스타일 수치
        description: params56.description || '',
        // ⭐ 어울리는 얼굴형 추가 (이론 기반)
        suitableFaceShapes: faceShapeMatch.faceShapes,
        faceShapeReasons: faceShapeMatch.reasons
      },

      // ⭐⭐⭐ Top-1 매칭 스타일 (Vision 직접 선택)
      matchedStyle: {
        styleId: top1.styleId,
        series: top1.series,
        seriesName: top1.seriesName,
        resultImage: top1.resultImage,
        diagrams: top1.diagrams,
        diagramCount: top1.diagramCount,
        // Vision 선택 정보
        visionConfidence: visionResult.confidence,
        visionReason: visionResult.reason
      },

      // 차이점 없음 (Top-1 그대로 사용)
      differences: [],

      // 참고 스타일 (Top-1만)
      referenceStyles: [{
        styleId: top1.styleId,
        series: top1.series,
        resultImage: top1.resultImage,
        diagrams: top1.diagrams.slice(0, 10),
        diagramCount: top1.diagramCount
      }],

      // ⭐⭐⭐ 원본 레시피 그대로 반환 (보충 없음)
      customRecipe: originalRecipe,

      // 도해도 (Top-1 스타일의 도해도만)
      mainDiagrams: top1.diagrams.map((d, idx) => ({
        step: d.step || idx + 1,
        url: d.url,
        styleId: top1.styleId,
        lifting: d.lifting,
        section: d.section,
        direction: d.direction
      }))
    };

    console.log(`✅ Top-1 레시피 매칭 완료: ${top1.styleId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };

  } catch (error) {
    console.error('❌ 레시피 매칭 오류:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

// ==================== 기장(Length)만 빠르게 분석 ====================
async function analyzeImageLengthOnly(imageBase64, mimeType, geminiKey) {
  const prompt = `Analyze this hairstyle image and determine the hair LENGTH only.

Hair Length Categories (measure from crown to hair ends):
- A Length: Above ear (very short, pixie cut level)
- B Length: Ear to chin level (bob cut level)
- C Length: Chin to shoulder level
- D Length: Shoulder level (touching shoulders)
- E Length: Below shoulder to mid-back
- F Length: Mid-back level
- G Length: Lower back level
- H Length: Waist level or longer

Return ONLY a JSON object:
{
  "length_code": "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H",
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 기본값
    return { length_code: 'D', confidence: 'low' };
  } catch (error) {
    console.error('기장 분석 오류:', error);
    return { length_code: 'D', confidence: 'low' };
  }
}

// ==================== ⭐⭐⭐ Gemini Vision 1:1 순차 비교 (정확도 향상) ====================
async function selectBestStyleByVision(userImageBase64, mimeType, candidateStyles, geminiKey) {
  console.log(`🔍 Vision 1:1 비교 시작: ${candidateStyles.length}개 스타일`);

  // 각 스타일별 특징 설명 (시리즈별)
  const STYLE_FEATURES = {
    'FAL': { name: 'A Length (턱선)', desc: '턱선 길이의 숏컷, 볼륨이 위쪽에 집중, 가벼운 레이어' },
    'FBL': { name: 'B Length (턱~어깨)', desc: '턱과 어깨 사이 길이, 중간 볼륨, 자연스러운 레이어' },
    'FCL': { name: 'C Length (어깨선)', desc: '어깨 닿는 길이, 중간~아래 볼륨, 부드러운 곡선' },
    'FDL': { name: 'D Length (쇄골)', desc: '쇄골 길이, 아래쪽 볼륨, 레이어드 스타일' },
    'FEL': { name: 'E Length (가슴 위)', desc: '가슴 위 길이, 풍성한 레이어, 움직임 있는 스타일' },
    'FFL': { name: 'F Length (가슴)', desc: '가슴 길이, 긴 레이어, 자연스러운 웨이브' },
    'FGL': { name: 'G Length (가슴~배)', desc: '가슴과 배 사이, 롱 레이어, 부드러운 끝처리' },
    'FHL': { name: 'H Length (허리)', desc: '허리 길이, 매우 긴 레이어, 가벼운 끝처리' }
  };

  // 🚀 병렬 처리: 모든 스타일 동시에 비교 (타임아웃 방지)
  const compareStyle = async (style) => {
    if (!style.resultImage) return null;

    try {
      // 대표이미지 fetch
      const imgResponse = await fetch(style.resultImage, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!imgResponse.ok) {
        console.log(`⚠️ 이미지 로드 실패: ${style.styleId}`);
        return null;
      }

      const imgBuffer = await imgResponse.arrayBuffer();
      const styleImageBase64 = Buffer.from(imgBuffer).toString('base64');
      const styleMimeType = imgResponse.headers.get('content-type') || 'image/png';

      // 시리즈 특징
      const series = style.series || style.styleId.substring(0, 3);
      const feature = STYLE_FEATURES[series] || { name: series, desc: '레이어 스타일' };

      // 1:1 비교 프롬프트 (컬/웨이브 판단 강화)
      const prompt = `헤어 스타일리스트로서 두 이미지의 유사도를 엄격하게 평가하세요.
[이미지1] 고객 레퍼런스 [이미지2] ${style.styleId} - ${feature.name}

⚠️ 중요: 컬/웨이브 유무가 다르면 50점 이하로 평가!
- 이미지1이 컬/웨이브가 있는데 이미지2가 직모면 → 40점 이하
- 이미지1이 직모인데 이미지2가 컬/웨이브면 → 40점 이하

평가 기준 (100점):
1. 컬/웨이브 일치(30점): 둘 다 직모, 둘 다 C컬, 둘 다 S컬 등 일치해야 고득점
2. 실루엣 형태(25점): 전체적인 머리 모양
3. 볼륨 위치(20점): 볼륨이 어디에 있는지
4. 레이어 정도(15점): 레이어 양과 위치
5. 앞머리/끝선(10점): 앞머리 유무, 끝 처리

JSON만: {"total_score":<0-100>,"curl_match":<true/false>,"reason":"<1문장>"}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: userImageBase64 } },
                { inline_data: { mime_type: styleMimeType, data: styleImageBase64 } },
                { text: prompt }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 150 }
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const score = parseInt(result.total_score) || 0;
        console.log(`  📊 ${style.styleId}: ${score}점`);
        return { styleId: style.styleId, score, reason: result.reason || '' };
      }
      return null;
    } catch (error) {
      console.log(`⚠️ ${style.styleId} 비교 오류:`, error.message);
      return null;
    }
  };

  // 모든 스타일 병렬 비교
  const results = await Promise.all(candidateStyles.map(compareStyle));
  const scoreResults = results.filter(r => r !== null);

  // 점수 기준 정렬
  scoreResults.sort((a, b) => b.score - a.score);

  console.log(`\n🏆 최종 순위:`);
  scoreResults.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.styleId}: ${r.score}점`);
  });

  if (scoreResults.length > 0) {
    const best = scoreResults[0];
    const confidence = best.score >= 70 ? 'high' : best.score >= 50 ? 'medium' : 'low';

    return {
      selectedStyleId: best.styleId,
      confidence: confidence,
      score: best.score,
      reason: best.reason,
      allScores: scoreResults.slice(0, 5)
    };
  }

  return {
    selectedStyleId: candidateStyles[0]?.styleId,
    confidence: 'low',
    score: 0,
    reason: '비교 실패, 기본 스타일 선택'
  };
}

// ==================== Firestore Document 파싱 (메타데이터 포함) ====================
function parseFirestoreDocument(doc) {
  try {
    const fields = doc.fields;
    const styleId = doc.name.split('/').pop();

    // 임베딩 배열 추출
    let embedding = null;
    if (fields.embedding && fields.embedding.arrayValue && fields.embedding.arrayValue.values) {
      embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
    }

    // 도해도 배열 추출 (메타데이터 포함)
    let diagrams = [];
    if (fields.diagrams && fields.diagrams.arrayValue && fields.diagrams.arrayValue.values) {
      diagrams = fields.diagrams.arrayValue.values.map(v => {
        const mapValue = v.mapValue?.fields || {};
        return {
          step: parseInt(mapValue.step?.integerValue || 0),
          url: mapValue.url?.stringValue || '',
          // ⭐ 도해도 메타데이터
          lifting: mapValue.lifting?.stringValue || null,
          lifting_angle: parseInt(mapValue.lifting_angle?.integerValue || 0),
          direction: mapValue.direction?.stringValue || null,
          section: mapValue.section?.stringValue || null,
          zone: mapValue.zone?.stringValue || null,
          cutting_method: mapValue.cutting_method?.stringValue || null,
          over_direction: mapValue.over_direction?.booleanValue || false,
          notes: mapValue.notes?.stringValue || null
        };
      });
    }

    return {
      styleId: styleId,
      series: fields.series?.stringValue || '',
      seriesName: fields.seriesName?.stringValue || '',
      resultImage: fields.resultImage?.stringValue || null,
      diagrams: diagrams,
      diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
      captionUrl: fields.captionUrl?.stringValue || null,
      textRecipe: fields.textRecipe?.stringValue || null,  // ⭐ 텍스트 레시피 추가
      embedding: embedding
    };
  } catch (error) {
    console.error('parseFirestoreDocument 오류:', error);
    return null;
  }
}

// ==================== 레시피 형식 통일 ====================
/**
 * 레시피 텍스트를 [External] (Under Zone) / [Internal] (Over Zone) 형식으로 통일
 */
function normalizeRecipeFormat(recipe) {
  if (!recipe) return recipe;

  let normalized = recipe;

  // 다양한 형식을 [External] (Under Zone)으로 통일
  normalized = normalized
    .replace(/\[엑스터널\s*부분\]/gi, '[External] (Under Zone)')
    .replace(/\[External\s*부분\]/gi, '[External] (Under Zone)')
    .replace(/\[외부\s*부분\]/gi, '[External] (Under Zone)')
    .replace(/\[Under\s*Zone\]/gi, '[External] (Under Zone)')
    .replace(/\[아웃라인\s*설정\]/gi, '[External] (Under Zone)')
    .replace(/\*\*\[엑스터널\s*부분\]\*\*/gi, '**[External] (Under Zone)**')
    .replace(/\*\*엑스터널\s*부분\*\*/gi, '**[External] (Under Zone)**');

  // 다양한 형식을 [Internal] (Over Zone)으로 통일
  normalized = normalized
    .replace(/\[인터널\s*부분\]/gi, '[Internal] (Over Zone)')
    .replace(/\[Internal\s*부분\]/gi, '[Internal] (Over Zone)')
    .replace(/\[내부\s*부분\]/gi, '[Internal] (Over Zone)')
    .replace(/\[Over\s*Zone\]/gi, '[Internal] (Over Zone)')
    .replace(/\[인터널\s*레이어\]/gi, '[Internal] (Over Zone)')
    .replace(/\*\*\[인터널\s*부분\]\*\*/gi, '**[Internal] (Over Zone)**')
    .replace(/\*\*인터널\s*부분\*\*/gi, '**[Internal] (Over Zone)**');

  // [전체 과정] 형식인 경우 그대로 유지 (여자 레시피 일부)
  // 필요시 zone 기반으로 분리 가능

  return normalized;
}

/**
 * Top-1 스타일의 도해도에서 실제 레시피 파라미터 추출 (애니메이션용)
 */
function extractRecipeParamsFromStyle(style) {
  const diagrams = style.diagrams || [];

  // Lifting 수집 (중복 제거)
  const liftingSet = new Set();
  const sectionSet = new Set();
  const zoneSet = new Set();
  const directionSet = new Set();

  diagrams.forEach(d => {
    if (d.lifting) liftingSet.add(d.lifting);
    if (d.section) sectionSet.add(d.section);
    if (d.zone) zoneSet.add(d.zone);
    if (d.direction) directionSet.add(d.direction);
  });

  // Lifting을 L 코드로 변환 (예: "90" → "L4", "45" → "L2")
  const angleToLiftingCode = {
    '0': 'L0', '22.5': 'L1', '45': 'L2', '67.5': 'L3',
    '90': 'L4', '112.5': 'L5', '135': 'L6', '157.5': 'L7', '180': 'L8'
  };

  const liftingCodes = Array.from(liftingSet).map(lift => {
    // 이미 L코드 형식이면 그대로
    if (lift.startsWith('L')) return lift;
    // 숫자만 있으면 변환
    const angle = lift.replace(/[^0-9.]/g, '');
    return angleToLiftingCode[angle] || `L${Math.round(parseFloat(angle) / 22.5)}`;
  }).filter(Boolean);

  // Section 정리 (주요 섹션 추출)
  const sections = Array.from(sectionSet);
  const primarySection = sections.find(s =>
    s.includes('Diagonal') || s.includes('Horizontal') || s.includes('Vertical') || s.includes('Pivot')
  ) || sections[0] || 'Diagonal-Backward';

  // Zone에서 볼륨 위치 추출
  const zones = Array.from(zoneSet);
  let volumePosition = 'Medium';
  if (zones.some(z => z.toLowerCase().includes('top') || z.toLowerCase().includes('crown'))) {
    volumePosition = 'Top';
  } else if (zones.some(z => z.toLowerCase().includes('side') || z.toLowerCase().includes('parietal'))) {
    volumePosition = 'Side';
  } else if (zones.some(z => z.toLowerCase().includes('nape') || z.toLowerCase().includes('back'))) {
    volumePosition = 'Back';
  }

  console.log(`📊 Top-1 스타일 파라미터 추출:`);
  console.log(`   Lifting: ${liftingCodes.join(', ') || '없음'}`);
  console.log(`   Section: ${primarySection}`);
  console.log(`   Volume: ${volumePosition}`);
  console.log(`   Zones: ${zones.join(', ') || '없음'}`);

  return {
    liftingRange: liftingCodes.length > 0 ? liftingCodes : ['L4'],
    sectionPrimary: primarySection,
    volumePosition: volumePosition,
    zones: zones,
    directions: Array.from(directionSet)
  };
}

// ==================== 파라미터 기반 커스텀 레시피 생성 (Firebase 기반) ====================
async function generateCustomRecipeFromParams(payload, geminiKey) {
  const { params56, language } = payload;

  try {
    console.log('📋 파라미터 기반 레시피 생성 (Firebase):', params56?.length_category);

    // 1. Length 코드로 시리즈 결정
    const lengthCode = params56?.length_category?.charAt(0) || 'E';
    const targetGender = params56?.gender || 'female';
    const targetSeries = targetGender === 'male'
      ? `M${lengthCode}L`
      : `F${lengthCode}L`;

    // 2. Firestore에서 해당 시리즈 스타일 검색
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/styles`;
    const firebaseKey = process.env.FIREBASE_API_KEY || geminiKey;

    const response = await fetch(`${url}?key=${firebaseKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Firestore 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    const documents = data.documents || [];

    // 3. 시리즈 필터링
    const seriesStyles = documents
      .map(doc => parseFirestoreDocument(doc))
      .filter(style => style && style.series === targetSeries);

    console.log(`🎯 ${targetSeries} 시리즈: ${seriesStyles.length}개 스타일`);

    // 4. 스타일 스코어링
    const stylesWithScores = seriesStyles.map(style => {
      const score = calculate42FormulaScore(style, params56);
      return { ...style, ...score };
    });

    // 5. Top-3 선정
    const top3 = stylesWithScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    // 6. 커스텀 레시피 생성
    const customRecipe = await generateCustomRecipe(params56, top3, geminiKey);

    // 7. 스트리밍 응답 형식으로 반환
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    };

    // 레시피를 청크로 분할하여 스트리밍
    const chunks = customRecipe.match(/.{1,100}/g) || [customRecipe];
    let streamBody = '';

    for (const chunk of chunks) {
      streamBody += `data: ${JSON.stringify({ type: 'content', content: chunk })}\n`;
    }
    streamBody += 'data: [DONE]\n';

    return {
      statusCode: 200,
      headers,
      body: streamBody
    };

  } catch (error) {
    console.error('❌ 파라미터 기반 레시피 생성 오류:', error);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
      body: `data: ${JSON.stringify({ type: 'error', error: error.message })}\n`
    };
  }
}

// ==================== 남자 이미지 분석 + 맞춤 레시피 생성 ====================
/**
 * 남자 스타일: 스타일 코드 기반 (SF, SP, FU, PB, BZ, CP, MC)
 * ⭐⭐⭐ 새로운 방식: Gemini Vision으로 대표이미지 직접 비교 ⭐⭐⭐
 */
async function analyzeAndMatchMaleRecipe(payload, geminiKey) {
  const { image_base64, mime_type, category, series } = payload;
  const startTime = Date.now();

  console.log(`👨 남자 이미지 분석 + 맞춤 레시피 생성 시작... (카테고리: ${category || 'auto'}, 시리즈: ${series || 'auto'})`);

  try {
    // 1. 사용자가 선택한 스타일 코드 사용 (AI 분석 X)
    const t1 = Date.now();
    const styleCode = series || category || 'SF'; // 사용자가 선택한 스타일
    console.log(`⏱️ [1] 사용자 선택 스타일: ${styleCode} (${Date.now() - t1}ms)`);

    // 2. Firestore men_styles 컬렉션에서 검색
    const t2 = Date.now();
    const menStylesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/men_styles`;

    const firebaseResponse = await fetch(menStylesUrl);
    if (!firebaseResponse.ok) {
      throw new Error(`Firestore men_styles 조회 실패: ${firebaseResponse.status}`);
    }

    const firebaseData = await firebaseResponse.json();
    const allMenStyles = (firebaseData.documents || []).map(doc => {
      const fields = doc.fields || {};
      const styleId = doc.name.split('/').pop();

      let embedding = null;
      if (fields.embedding?.arrayValue?.values) {
        embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
      }

      let diagrams = [];
      if (fields.diagrams?.arrayValue?.values) {
        diagrams = fields.diagrams.arrayValue.values.map(v => {
          const map = v.mapValue?.fields || {};
          return {
            step: parseInt(map.step?.integerValue || 0),
            url: map.url?.stringValue || '',
            lifting: map.lifting?.stringValue || null,
            direction: map.direction?.stringValue || null,
            section: map.section?.stringValue || null,
            zone: map.zone?.stringValue || null,
            cutting_method: map.cutting_method?.stringValue || null
          };
        });
      }

      return {
        styleId,
        series: fields.series?.stringValue || '',
        seriesName: fields.seriesName?.stringValue || '',
        resultImage: fields.resultImage?.stringValue || null,
        diagrams,
        diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
        captionUrl: fields.captionUrl?.stringValue || null,
        textRecipe: fields.textRecipe?.stringValue || null,
        embedding,
        // 페이드 레벨 정보 추가
        fadeLevel: fields.fadeLevel?.stringValue || 'none'
      };
    });

    console.log(`⏱️ [2] Firestore men_styles 조회: ${Date.now() - t2}ms (${allMenStyles.length}개)`);

    // 3. 스타일 코드로 필터링
    const filteredStylesAll = allMenStyles.filter(s =>
      s.styleId.startsWith(styleCode) || s.series === styleCode
    );

    // 대표이미지가 있는 스타일
    const filteredStylesWithImage = filteredStylesAll.filter(s => s.resultImage);

    console.log(`🎯 ${styleCode} 스타일: 전체 ${filteredStylesAll.length}개, 대표이미지 ${filteredStylesWithImage.length}개`);

    // 스타일이 없으면 전체에서 검색
    const targetStylesAll = filteredStylesAll.length > 0 ? filteredStylesAll : allMenStyles;
    const targetStylesWithImage = filteredStylesWithImage.length > 0
      ? filteredStylesWithImage
      : allMenStyles.filter(s => s.resultImage).slice(0, 10);

    if (targetStylesAll.length === 0) {
      throw new Error('남자 스타일이 없습니다');
    }

    let top1;
    let visionResult = { selectedStyleId: '', confidence: 'low', reason: '' };

    // 4. 대표이미지가 있으면 Vision 비교, 없으면 임베딩 기반 매칭
    const t3 = Date.now();
    if (targetStylesWithImage.length > 0) {
      // ⭐⭐⭐ Gemini Vision으로 대표이미지와 직접 비교하여 Top-1 선택
      visionResult = await selectBestMaleStyleByVision(
        image_base64,
        mime_type,
        targetStylesWithImage,
        geminiKey
      );
      console.log(`⏱️ [3] Gemini Vision 직접 비교: ${Date.now() - t3}ms`);
      console.log(`🎯 Vision 선택: ${visionResult.selectedStyleId} (신뢰도: ${visionResult.confidence})`);
      console.log(`   선택 이유: ${visionResult.reason}`);

      top1 = targetStylesWithImage.find(s => s.styleId === visionResult.selectedStyleId) || targetStylesWithImage[0];
    } else {
      // 대표이미지 없으면 임베딩 기반 매칭 (기존 방식)
      console.log(`⚠️ 대표이미지 없음, 임베딩 기반 매칭 사용`);
      const maleParamsTemp = await analyzeManImageVision(image_base64, mime_type, geminiKey);
      const searchQuery = `${maleParamsTemp.style_name || ''} ${maleParamsTemp.top_length || ''} ${maleParamsTemp.texture || ''}`.trim();
      const queryEmbedding = await generateQueryEmbedding(searchQuery, geminiKey);

      const stylesWithScore = targetStylesAll.map(style => {
        let similarity = 0;
        if (style.embedding && queryEmbedding) {
          similarity = cosineSimilarity(queryEmbedding, style.embedding);
        }
        return { ...style, similarity };
      });

      top1 = stylesWithScore.sort((a, b) => b.similarity - a.similarity)[0];
      visionResult = {
        selectedStyleId: top1.styleId,
        confidence: 'medium',
        reason: '임베딩 기반 유사도 매칭 (대표이미지 없음)'
      };
      console.log(`⏱️ [3] 임베딩 매칭: ${Date.now() - t3}ms`);
      console.log(`🎯 임베딩 선택: ${top1.styleId} (유사도: ${(top1.similarity * 100).toFixed(1)}%)`);
    }

    // 6. 상세 파라미터 분석 (UI 표시용)
    const t4 = Date.now();
    const maleParams = await analyzeManImageVision(image_base64, mime_type, geminiKey);
    console.log(`⏱️ [4] 상세 파라미터 분석: ${Date.now() - t4}ms`);

    // 7. Top-1 스타일의 textRecipe 가져오기 (보충 레시피 없이 원본 사용)
    let originalRecipe = top1.textRecipe || '';
    // 스타일ID 언급 제거 (사용자에게 보이지 않도록)
    originalRecipe = originalRecipe
      .replace(/\[?[FM]?[A-Z]{2,3}\d{4}\]?/g, '')  // 스타일ID 제거 (괄호 포함)
      .replace(/\[\s*\]/g, '')  // 빈 괄호 [] 제거
      .replace(/\s{2,}/g, ' ')  // 연속 공백 정리
      .trim();
    // ⭐ External/Internal 형식으로 통일
    originalRecipe = normalizeRecipeFormat(originalRecipe);

    // ⭐⭐⭐ Top-1 스타일의 도해도에서 실제 레시피 파라미터 추출 (애니메이션용)
    const top1Params = extractRecipeParamsFromStyle(top1);

    // ⭐ 남자 스타일 코드 기반 어울리는 얼굴형 분석 (이론 기반)
    const maleFaceShapeMatch = getMaleSuitableFaceShapes(styleCode);
    console.log(`👤 남자 어울리는 얼굴형: ${maleFaceShapeMatch.faceShapes.join(', ')}`);

    console.log(`⏱️ 총 처리 시간: ${Date.now() - startTime}ms`);

    // 8. 결과 반환 - Top-1 레시피 그대로
    const subStyleName = maleParams.sub_style || MALE_STYLE_TERMS[styleCode]?.subStyles?.[0] || maleParams.style_name;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          gender: 'male',
          // ⭐⭐⭐ Top-1 스타일의 실제 수치 사용! (AI 분석 아님)
          analysis: {
            styleCode: styleCode,
            styleName: MALE_STYLE_TERMS[styleCode]?.ko || maleParams.style_name || styleCode,
            subStyle: subStyleName,
            topLength: maleParams.top_length || 'Medium',
            sideLength: maleParams.side_length || 'Short',
            fadeType: maleParams.fade_type || 'None',
            texture: maleParams.texture || 'Smooth',
            productType: maleParams.product_type || 'Wax',
            stylingDirection: maleParams.styling_direction || 'Forward',
            // ⭐ Top-1 스타일에서 추출한 실제 수치
            liftingRange: top1Params.liftingRange,
            sectionPrimary: top1Params.sectionPrimary,
            volumePosition: top1Params.volumePosition,
            // ⭐ 어울리는 얼굴형 추가 (이론 기반)
            suitableFaceShapes: maleFaceShapeMatch.faceShapes,
            faceShapeReasons: maleFaceShapeMatch.reasons,
            // ⭐ 스타일 상세 설명 추가 (MALE_STYLE_TERMS에서)
            styleDescription: MALE_STYLE_TERMS[styleCode]?.description || null,
            // ⭐ 얼굴형 매칭 추가 정보
            styleInfo: maleFaceShapeMatch.styleInfo || null,
            recommendedStyling: maleFaceShapeMatch.styling || null,
            targetCustomer: maleFaceShapeMatch.targetCustomer || null
          },
          targetSeries: {
            code: styleCode,
            name: MALE_STYLE_TERMS[styleCode]?.ko || maleParams.style_name || styleCode,
            subStyles: MALE_STYLE_TERMS[styleCode]?.subStyles || [],
            totalStyles: filteredStylesAll.length
          },
          // ⭐⭐⭐ Top-1 매칭 스타일 (Vision 직접 선택)
          matchedStyle: {
            styleId: top1.styleId,
            series: top1.series,
            seriesName: top1.seriesName,
            resultImage: top1.resultImage,
            diagrams: top1.diagrams,
            diagramCount: top1.diagramCount,
            visionConfidence: visionResult.confidence,
            visionReason: visionResult.reason
          },
          // 참고 스타일 (Top-1만)
          referenceStyles: [{
            styleId: top1.styleId,
            resultImage: top1.resultImage,
            diagrams: top1.diagrams.slice(0, 10),
            diagramCount: top1.diagramCount
          }],
          // ⭐⭐⭐ 원본 레시피 그대로 반환 (보충 없음)
          recipe: originalRecipe,
          // 도해도 (Top-1 스타일의 도해도만)
          diagrams: top1.diagrams.map((d, idx) => ({
            step: d.step || idx + 1,
            url: d.url,
            styleId: top1.styleId,
            lifting: d.lifting,
            section: d.section,
            direction: d.direction
          })),
          processingTime: Date.now() - startTime,
          params56: maleParams
        }
      })
    };

  } catch (error) {
    console.error('❌ 남자 레시피 생성 오류:', error);
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

// ==================== 남자 스타일 코드만 빠르게 분석 ====================
async function analyzeMaleStyleCodeOnly(imageBase64, mimeType, geminiKey) {
  const prompt = `Analyze this men's hairstyle image and determine the STYLE CATEGORY only.

Men's Style Categories (7개 대분류):

SF (Side Fringe, 사이드 프린지):
- 이마를 자연스럽게 덮고 한쪽 방향으로 흐르는 스타일
- 앞머리가 이마를 가리고 옆으로 흐름
- 동안 이미지, 내추럴한 느낌

SP (Side Part, 사이드 파트):
- 또렷한 가르마 라인이 핵심인 클래식 스타일
- 가르마 기준으로 상단을 뒤/옆으로 넘김
- 단정하고 신뢰감 있는 이미지

FU (Fringe Up, 프린지 업):
- 앞머리를 이마 위로 올리는 스타일
- 이마 완전 노출, 세로 볼륨
- 시원하고 자신감 있는 남성미

PB (Pushed Back, 푸시드 백):
- 상단 전체를 뒤로 넘기는 스타일
- 볼륨백(자연스럽게) 또는 슬릭백(밀착)
- 성숙하고 세련된 이미지

BZ (Buzz Cut, 버즈 컷):
- 클리퍼로 두피에 가깝게 밀어내는 초단발
- 전체 같은 길이 또는 상단만 살짝 길게
- 강인하고 미니멀한 이미지

CP (Crop Cut, 크롭 컷):
- 상단 짧게 커트 + 앞쪽으로 떨어뜨리는 모던 스타일
- 짧고 텍스처 있는 탑, 짧은 프린지
- 트렌디하고 스트리트 감성

MC (Mohican, 모히칸):
- 사이드 짧게, 중앙만 길게 세우는 강한 대비
- 중앙 라인 위로 강하게 세움, 피크 형태
- 스포티하고 개성 강한 이미지

Return ONLY a JSON object:
{
  "style_code": "SF" | "SP" | "FU" | "PB" | "BZ" | "CP" | "MC",
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { style_code: 'SF', confidence: 'low' };
  } catch (error) {
    console.error('남자 스타일 코드 분석 오류:', error);
    return { style_code: 'SF', confidence: 'low' };
  }
}

// ==================== ⭐ 사용자 이미지 페이드 레벨 사전 분석 ====================
async function analyzeUserFadeLevel(userImageBase64, mimeType, geminiKey) {
  console.log(`🔍 사용자 이미지 페이드 레벨 사전 분석...`);

  const prompt = `이 남성 헤어스타일 이미지에서 사이드/뒷머리의 페이드(Fade) 레벨을 분석하세요.

페이드 레벨 정의:
- none: 페이드 없음, 자연스러운 연결, 옆머리가 길게 내려옴
- low: 로우 페이드, 귀 아래 부분만 짧게, 위쪽은 자연스럽게 연결
- mid: 미드 페이드, 귀 위쪽까지 그라데이션, 중간 높이에서 짧아짐
- high: 하이 페이드, 관자놀이/측두부까지 짧게, 높은 위치까지 그라데이션
- skin: 스킨 페이드, 피부가 보일 정도로 매우 짧게 밀림

분석 포인트:
1. 사이드(옆머리)가 어디까지 짧은지
2. 피부가 보이는지
3. 그라데이션의 시작 높이

JSON만 응답: {"fade_level": "<none/low/mid/high/skin>", "confidence": "<high/medium/low>"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: userImageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`✅ 사용자 페이드 레벨: ${result.fade_level} (신뢰도: ${result.confidence})`);
      return result.fade_level || 'none';
    }
  } catch (error) {
    console.log(`⚠️ 페이드 분석 오류:`, error.message);
  }

  return 'none';
}

// ==================== ⭐⭐⭐ 남자 스타일 Vision 병렬 비교 (타임아웃 방지) ====================
async function selectBestMaleStyleByVision(userImageBase64, mimeType, candidateStyles, geminiKey) {
  console.log(`🔍 남자 Vision 병렬 비교 시작: ${candidateStyles.length}개 스타일`);

  // 남자 스타일별 특징 설명 + 페이드 중요도 + 상세 정보
  const MALE_STYLE_FEATURES = {
    'SF': {
      name: 'Side Fringe',
      desc: '앞머리 옆으로 내림',
      fadeImportance: 'low',
      detail: '이마를 자연스럽게 덮고 한쪽 방향으로 흐르는 스타일. 부드럽고 동안 이미지. 이마 노출 부담 없음.',
      topFeature: '앞머리가 이마를 덮고 옆으로 흐름, 자연스러운 볼륨',
      sideFeature: '사이드/백 짧고 깔끔하게 정리',
      targetCustomer: '이마 넓은 분, 동안/내추럴 이미지 선호'
    },
    'SP': {
      name: 'Side Part',
      desc: '가르마 스타일',
      fadeImportance: 'low',
      detail: '한쪽으로 또렷한 가르마 라인이 핵심인 클래식 스타일. 단정하고 신뢰감 있는 이미지.',
      topFeature: '가르마 기준 긴 상단을 뒤/옆으로 넘김, 포마드로 윤기와 볼륨',
      sideFeature: '사이드 짧게 트리밍, 상단과 대비',
      targetCustomer: '직장인, 비즈니스룩, 프로페셔널 이미지 선호'
    },
    'FU': {
      name: 'Fringe Up',
      desc: '앞머리 위로 올림',
      fadeImportance: 'low',
      detail: '앞머리를 이마 위로 또렷하게 올리는 스타일. 시원하고 자신감 있는 남성미.',
      topFeature: '앞머리 세로 볼륨 확실히 올림, 이마 완전 노출',
      sideFeature: '투블럭/페이드로 짧게, 상단 볼륨 강조',
      targetCustomer: '활동적/스포티한 이미지, 강한 남성미 원하는 분'
    },
    'PB': {
      name: 'Pushed Back',
      desc: '뒤로 넘김',
      fadeImportance: 'low',
      detail: '상단 전체를 이마에서 뒤로 넘기는 스타일. 성숙하고 세련된 이미지.',
      topFeature: '볼륨백(자연스럽게 뒤로) 또는 슬릭백(밀착시켜 클래식하게)',
      sideFeature: '페이드/투블럭으로 짧게, 뒤로 흐르는 실루엣 강조',
      targetCustomer: '정장/댄디룩, 성숙하고 고급스러운 이미지 선호'
    },
    'BZ': {
      name: 'Buzz',
      desc: '매우 짧은 컷',
      fadeImportance: 'critical',
      detail: '클리퍼로 두피에 가깝게 밀어내는 가장 단순한 스타일. 강인하고 미니멀한 이미지.',
      topFeature: '전체 같은 길이 또는 상단만 살짝 길게, 두상 형태 그대로 노출',
      sideFeature: '페이드로 면도 수준까지 정리, 스킨 보이는 초정돈',
      targetCustomer: '손질 귀찮은 분, 운동 많이 하는 분, 두상 좋은 분'
    },
    'CP': {
      name: 'Crop',
      desc: '짧은 탑 + 페이드',
      fadeImportance: 'critical',
      detail: '상단 짧게 커트하고 앞쪽으로 떨어뜨리는 모던 스타일. 초저관리형 트렌디 컷.',
      topFeature: '짧고 텍스처 있는 탑, 이마 살짝 덮는 짧은 프린지',
      sideFeature: '페이드 또는 극단적으로 짧게, 강한 대비',
      targetCustomer: '여름철, 활동량 많은 분, 트렌디하면서 관리 쉬운 스타일 원하는 분'
    },
    'MC': {
      name: 'Mohican',
      desc: '중앙 긴 스타일',
      fadeImportance: 'critical',
      detail: '사이드 짧게, 상단 중앙만 길게 남겨 위로 세우는 강한 대비 스타일. 스포티하고 개성 강한 이미지.',
      topFeature: '중앙 라인 위로 강하게 세움, 피크(뾰족) 형태가 포인트',
      sideFeature: '투블럭/페이드로 짧게, 모히칸 특유의 카리스마 강조',
      targetCustomer: '개성 강한 스타일, 스포티/퍼포먼스 이미지 원하는 분'
    }
  };

  // ⭐ 먼저 사용자 이미지의 페이드 레벨을 1회만 분석
  const styleCode = candidateStyles[0]?.styleId?.substring(0, 2) || '';
  const isFadeCriticalStyle = ['BZ', 'CP', 'MC'].includes(styleCode);

  let userFadeLevel = 'none';
  if (isFadeCriticalStyle) {
    userFadeLevel = await analyzeUserFadeLevel(userImageBase64, mimeType, geminiKey);
  }

  // 🚀 병렬 처리: 모든 스타일 동시에 비교
  const compareStyle = async (style) => {
    if (!style.resultImage) return null;

    try {
      const imgResponse = await fetch(style.resultImage, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!imgResponse.ok) {
        console.log(`⚠️ 이미지 로드 실패: ${style.styleId}`);
        return null;
      }

      const imgBuffer = await imgResponse.arrayBuffer();
      const styleImageBase64 = Buffer.from(imgBuffer).toString('base64');
      const styleMimeType = imgResponse.headers.get('content-type') || 'image/png';

      const styleCodeInner = style.styleId.substring(0, 2);
      const feature = MALE_STYLE_FEATURES[styleCodeInner] || { name: styleCodeInner, desc: '남성 스타일', fadeImportance: 'low' };
      const isFadeCritical = feature.fadeImportance === 'critical'; // BZ, CP, MC
      const dbFadeLevel = style.fadeLevel || 'none'; // DB에 저장된 페이드 레벨

      // 사전 분석된 사용자 페이드와 DB 페이드 일치 여부 (BZ/CP/MC만)
      const fadeMatched = isFadeCritical ? (userFadeLevel === dbFadeLevel) : null;

      // 스타일별 프롬프트 분기 (짧은 머리는 페이드 중요!)
      let prompt;
      if (isFadeCritical) {
        // BZ(버즈), CP(크롭), MC(모히칸) - 페이드가 핵심!
        // ⭐ 페이드는 이미 사전 분석됨! Gemini는 탑 길이/형태만 평가
        prompt = `남성 헤어 스타일리스트로서 두 이미지의 유사도를 평가하세요.
[이미지1] 고객 레퍼런스 (페이드: ${userFadeLevel})
[이미지2] ${style.styleId} - ${feature.name} (페이드: ${dbFadeLevel})

📋 스타일 특징:
- 설명: ${feature.detail}
- 탑 특징: ${feature.topFeature}
- 사이드 특징: ${feature.sideFeature}

📋 페이드 정보 (이미 분석됨):
- 고객 이미지 페이드: ${userFadeLevel}
- 스타일 DB 페이드: ${dbFadeLevel}
- 페이드 일치 여부: ${fadeMatched ? '✓ 일치' : '✗ 불일치'}

${fadeMatched ? '' : '⚠️ 페이드가 다르므로 기본 점수 50점에서 시작!'}

평가 기준 (${fadeMatched ? '100점 만점' : '50점 만점 - 페이드 불일치 패널티'}):
1. 탑 길이(${fadeMatched ? '35' : '20'}점): 탑 머리 길이감 일치
2. 탑 형태(${fadeMatched ? '35' : '15'}점): 평평/텍스처/스파이키
3. 전체 실루엣(${fadeMatched ? '20' : '10'}점): 머리 전체 형태
4. 라인/디테일(${fadeMatched ? '10' : '5'}점): 라인업, 디자인 유무

JSON만: {"total_score":<0-100>,"reason":"<1문장>"}`;
      } else {
        // SF, SP, FU, PB - 앞머리 방향이 핵심, 페이드는 참고
        prompt = `남성 헤어 스타일리스트로서 두 이미지의 유사도를 매우 엄격하게 평가하세요.
[이미지1] 고객 레퍼런스 [이미지2] ${style.styleId} - ${feature.name} (${feature.desc})

📋 스타일 특징:
- 설명: ${feature.detail}
- 탑 특징: ${feature.topFeature}
- 사이드 특징: ${feature.sideFeature}
- 추천 대상: ${feature.targetCustomer}

📋 이미지2의 DB 페이드 레벨: ${dbFadeLevel}

⚠️ 중요 패널티 (하나라도 다르면 감점!):
1. 앞머리 방향이 다르면 → 40점 이하
   - 내림 vs 올림 = 완전히 다른 스타일!
   - 가르마 vs 가르마 아님 = 완전히 다른 스타일!
2. 탑 볼륨 높이가 다르면 → 60점 이하
   - 눌린 스타일(이마에 붙음) vs 볼륨 있는 스타일(위로 솟음) = 다른 스타일!
3. 사이드/페이드가 다르면 → 70점 이하
   - 이미지1의 페이드와 이미지2(${dbFadeLevel})가 다르면 감점!

페이드 레벨 구분:
- none: 페이드 없음, 자연스러운 연결
- low: 로우 페이드 (귀 아래만)
- mid: 미드 페이드 (귀 위쪽까지)
- high: 하이 페이드 (관자놀이까지)

평가 기준 (100점):
1. 앞머리 방향(25점): 내림/올림/가르마/뒤로넘김 일치 필수
2. 탑 볼륨 높이(25점): 눌린 스타일 vs 볼륨 있는 스타일
3. 사이드/페이드(20점): 이미지1 페이드와 이미지2(${dbFadeLevel}) 일치 여부
4. 전체 실루엣(15점): 머리 전체 형태와 길이감
5. 텍스처(15점): 직모/펌/웨이브

JSON만: {"total_score":<0-100>,"fringe_match":<true/false>,"volume_match":<true/false>,"fade_match":<true/false>,"user_fade_level":"<none/low/mid/high>","reason":"<1문장>"}`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: userImageBase64 } },
                { inline_data: { mime_type: styleMimeType, data: styleImageBase64 } },
                { text: prompt }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const score = parseInt(result.total_score) || 0;
        const fringeMatch = result.fringe_match === true;
        const volumeMatch = result.volume_match === true;
        // BZ/CP/MC: 사전 분석된 fadeMatched 사용, 일반 스타일: Gemini 응답 사용
        const fadeMatchResult = isFadeCritical ? fadeMatched : (result.fade_match === true);

        // 스타일에 따라 다른 로그 출력
        if (isFadeCritical) {
          console.log(`  📊 ${style.styleId}(DB:${dbFadeLevel}): ${score}점 (페이드일치: ${fadeMatched ? '✓' : '✗'})`);
        } else {
          console.log(`  📊 ${style.styleId}(DB:${dbFadeLevel}): ${score}점 (앞머리: ${fringeMatch ? '✓' : '✗'}, 볼륨: ${volumeMatch ? '✓' : '✗'}, 페이드: ${fadeMatchResult ? '✓' : '✗'})`);
        }
        return { styleId: style.styleId, score, fringeMatch, volumeMatch, fadeMatch: fadeMatchResult, dbFadeLevel, userFadeLevel, isFadeCritical, reason: result.reason || '' };
      }
      return null;
    } catch (error) {
      console.log(`⚠️ ${style.styleId} 비교 오류:`, error.message);
      return null;
    }
  };

  // 모든 스타일 병렬 비교
  const results = await Promise.all(candidateStyles.map(compareStyle));
  const scoreResults = results.filter(r => r !== null);

  // 사전 분석된 사용자 페이드 레벨 출력 (BZ/CP/MC만)
  if (isFadeCriticalStyle) {
    console.log(`\n👤 사용자 이미지 페이드 (사전분석): ${userFadeLevel}`);
  }

  // 스타일 유형에 따라 다른 정렬 로직
  const hasFadeCritical = scoreResults.some(r => r.isFadeCritical);

  if (hasFadeCritical) {
    // BZ, CP, MC - 페이드 일치 > 점수
    scoreResults.sort((a, b) => {
      // 1. 페이드 일치 여부 우선
      if (a.fadeMatch && !b.fadeMatch) return -1;
      if (!a.fadeMatch && b.fadeMatch) return 1;
      // 2. 동일하면 점수순
      return b.score - a.score;
    });
  } else {
    // SF, SP, FU, PB - 앞머리 일치 > 볼륨 일치 > 페이드 일치 > 점수
    scoreResults.sort((a, b) => {
      // 1. 앞머리 일치 여부 우선
      if (a.fringeMatch && !b.fringeMatch) return -1;
      if (!a.fringeMatch && b.fringeMatch) return 1;
      // 2. 볼륨 일치 여부
      if (a.volumeMatch && !b.volumeMatch) return -1;
      if (!a.volumeMatch && b.volumeMatch) return 1;
      // 3. 페이드 일치 여부
      if (a.fadeMatch && !b.fadeMatch) return -1;
      if (!a.fadeMatch && b.fadeMatch) return 1;
      // 4. 동일하면 점수순
      return b.score - a.score;
    });
  }

  console.log(`\n🏆 남자 최종 순위:`);
  scoreResults.slice(0, 3).forEach((r, i) => {
    if (r.isFadeCritical) {
      console.log(`  ${i + 1}. ${r.styleId}(DB:${r.dbFadeLevel}): ${r.score}점 (페이드일치: ${r.fadeMatch ? '✓' : '✗'})`);
    } else {
      console.log(`  ${i + 1}. ${r.styleId}(DB:${r.dbFadeLevel}): ${r.score}점 (앞머리: ${r.fringeMatch ? '✓' : '✗'}, 볼륨: ${r.volumeMatch ? '✓' : '✗'}, 페이드: ${r.fadeMatch ? '✓' : '✗'})`);
    }
  });

  if (scoreResults.length > 0) {
    const best = scoreResults[0];
    const confidence = best.score >= 70 ? 'high' : best.score >= 50 ? 'medium' : 'low';

    return {
      selectedStyleId: best.styleId,
      confidence: confidence,
      score: best.score,
      reason: best.reason,
      allScores: scoreResults.slice(0, 5)
    };
  }

  return {
    selectedStyleId: candidateStyles[0]?.styleId,
    confidence: 'low',
    score: 0,
    reason: '비교 실패, 기본 스타일 선택'
  };
}

// ==================== 여자 스타일 수정 재분석 ====================
async function regenerateFemaleRecipeWithStyle(payload, geminiKey) {
  const { length_code, cut_form, original_analysis } = payload;
  const startTime = Date.now();

  console.log(`🔄 여자 스타일 재분석 시작 - 길이: ${length_code}, 형태: ${cut_form}`);

  try {
    // 1. 새 길이/형태로 분석 데이터 수정
    const lengthDescriptions = {
      'H': 'Very Short - 귀/목덜미',
      'G': 'Short Bob - 턱선',
      'F': 'Bob - 턱~어깨',
      'E': 'Medium - 어깨선',
      'D': 'Semi-Long - 어깨~겨드랑이',
      'C': 'Long - 겨드랑이/가슴',
      'B': 'Very Long - 가슴 중간',
      'A': 'Super Long - 가슴 아래/허리'
    };

    const lengthName = `${length_code} Length`;
    const lengthDescription = lengthDescriptions[length_code] || lengthName;

    // Lifting 범위 결정 (형태에 따라)
    let liftingRange = ['L4'];
    if (cut_form === 'One Length') {
      liftingRange = ['L0', 'L1'];
    } else if (cut_form === 'Graduation') {
      liftingRange = ['L2', 'L3'];
    } else if (cut_form === 'Layer') {
      liftingRange = ['L4', 'L5'];
    }

    // 수정된 params56 생성
    const params56 = {
      ...original_analysis,
      length_category: lengthName,
      cut_form: cut_form,
      lifting_range: liftingRange
    };

    // 2. Firestore에서 여자 스타일 가져오기
    const targetSeries = `F${length_code}L`;
    const stylesUrl = `https://firestore.googleapis.com/v1/projects/hairgatormenu-4a43e/databases/(default)/documents/styles`;
    const stylesResponse = await fetch(stylesUrl);
    const stylesData = await stylesResponse.json();

    const allStyles = (stylesData.documents || []).map(doc => {
      const fields = doc.fields;
      const styleId = doc.name.split('/').pop();

      let embedding = null;
      if (fields.embedding?.arrayValue?.values) {
        embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
      }

      let diagrams = [];
      if (fields.diagrams?.arrayValue?.values) {
        diagrams = fields.diagrams.arrayValue.values.map(v => {
          const map = v.mapValue?.fields || {};
          return {
            step: parseInt(map.step?.integerValue || 0),
            url: map.url?.stringValue || '',
            lifting: map.lifting?.stringValue || null,
            direction: map.direction?.stringValue || null,
            section: map.section?.stringValue || null,
            zone: map.zone?.stringValue || null,
            cutting_method: map.cutting_method?.stringValue || null
          };
        });
      }

      return {
        styleId,
        series: fields.series?.stringValue || '',
        seriesName: fields.seriesName?.stringValue || '',
        resultImage: fields.resultImage?.stringValue || null,
        captionUrl: fields.captionUrl?.stringValue || null,
        textRecipe: fields.textRecipe?.stringValue || null,
        diagrams,
        diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
        embedding
      };
    });

    // 3. 새 길이 코드로 필터링 (시리즈 매칭)
    const seriesStyles = allStyles.filter(s =>
      s.series === targetSeries || s.styleId.includes(length_code)
    );

    console.log(`🎯 ${targetSeries} 시리즈: ${seriesStyles.length}개`);

    const targetStyles = seriesStyles.length > 0 ? seriesStyles : allStyles.slice(0, 10);

    // 4. 임베딩 기반 유사도 검색
    const searchQuery = `${lengthName} ${cut_form} ${params56.fringe_type || ''} ${params56.volume_zone || ''}`.trim();
    const queryEmbedding = await generateQueryEmbedding(searchQuery, geminiKey);

    const stylesWithSimilarity = targetStyles.map(style => {
      let similarity = 0;
      if (style.embedding && queryEmbedding) {
        similarity = cosineSimilarity(queryEmbedding, style.embedding);
      }
      return { ...style, similarity, embeddingSimilarity: similarity };
    });

    const top3 = stylesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(`🎯 Top-3 참고 스타일:`);
    top3.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`);
    });

    // 5. 레시피 재생성
    const customRecipe = await generateCustomRecipe(params56, top3, geminiKey);

    // 6. 도해도 선별 (시리즈 내 앞머리 보충 포함)
    const selectedDiagrams = selectDiagramsByTechnique(top3, params56, 15, stylesWithSimilarity);

    console.log(`⏱️ 여자 재분석 완료: ${Date.now() - startTime}ms`);

    // 7. 결과 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          gender: 'female',
          params56: params56,
          analysis: {
            length: length_code,
            lengthName: lengthName,
            form: cut_form,
            hasBangs: params56.fringe_type !== 'No Fringe',
            bangsType: params56.fringe_type || 'No Fringe',
            volumePosition: params56.volume_zone || 'Medium',
            silhouette: params56.silhouette || 'Round',
            texture: params56.hair_texture || 'Straight',
            layerLevel: params56.layer_type || 'Mid Layer',
            liftingRange: liftingRange,
            sectionPrimary: params56.section_primary || 'Diagonal-Backward',
            weightDistribution: params56.weight_distribution || 'Balanced',
            connectionType: params56.connection_type || 'Connected'
          },
          targetSeries: {
            code: targetSeries,
            name: `${lengthName} Series`,
            totalStyles: seriesStyles.length
          },
          referenceStyles: top3.map(s => ({
            styleId: s.styleId,
            series: s.series,
            similarity: s.similarity,
            diagrams: s.diagrams.slice(0, 5),
            diagramCount: s.diagramCount
          })),
          customRecipe: customRecipe,
          mainDiagrams: selectedDiagrams.map(d => ({
            step: d.step,
            url: d.url,
            styleId: d.styleId,
            techScore: d.techScore,
            matchedFeatures: d.matchedFeatures
          })),
          processingTime: Date.now() - startTime
        }
      })
    };

  } catch (error) {
    console.error('❌ 여자 스타일 재분석 오류:', error);
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

// ==================== 남자 스타일 수정 재분석 ====================
async function regenerateMaleRecipeWithStyle(payload, geminiKey) {
  const { style_code, original_analysis } = payload;
  const startTime = Date.now();

  console.log(`🔄 남자 스타일 재분석 시작 - 새 스타일: ${style_code}`);

  try {
    // 1. 새 스타일 코드로 분석 데이터 수정
    const styleInfo = MALE_STYLE_TERMS[style_code] || { ko: style_code, subStyles: [] };
    const styleName = styleInfo.en || style_code;
    const subStyleName = styleInfo.subStyles?.[0] || styleInfo.ko;

    // 기존 분석 데이터 복사 및 스타일 코드 변경
    const maleParams = {
      ...original_analysis,
      style_category: style_code,
      style_name: styleName,
      sub_style: subStyleName
    };

    // 2. Firestore에서 남자 스타일 가져오기
    const menStylesUrl = `https://firestore.googleapis.com/v1/projects/hairgatormenu-4a43e/databases/(default)/documents/men_styles`;
    const menStylesResponse = await fetch(menStylesUrl);
    const menStylesData = await menStylesResponse.json();

    const allMenStyles = (menStylesData.documents || []).map(doc => {
      const fields = doc.fields;
      const styleId = doc.name.split('/').pop();

      let embedding = null;
      if (fields.embedding?.arrayValue?.values) {
        embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
      }

      let diagrams = [];
      if (fields.diagrams?.arrayValue?.values) {
        diagrams = fields.diagrams.arrayValue.values.map(v => {
          const map = v.mapValue?.fields || {};
          return {
            step: parseInt(map.step?.integerValue || 0),
            url: map.url?.stringValue || '',
            lifting: map.lifting?.stringValue || null,
            direction: map.direction?.stringValue || null,
            section: map.section?.stringValue || null,
            zone: map.zone?.stringValue || null,
            cutting_method: map.cutting_method?.stringValue || null
          };
        });
      }

      return {
        styleId,
        series: fields.series?.stringValue || '',
        seriesName: fields.seriesName?.stringValue || '',
        resultImage: fields.resultImage?.stringValue || null,
        diagrams,
        diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
        captionUrl: fields.captionUrl?.stringValue || null,
        textRecipe: fields.textRecipe?.stringValue || null,
        embedding
      };
    });

    // 3. 새 스타일 코드로 필터링
    const filteredStyles = allMenStyles.filter(s =>
      s.styleId.startsWith(style_code) || s.series === style_code
    );

    console.log(`🎯 ${style_code} 스타일: ${filteredStyles.length}개`);

    const targetStyles = filteredStyles.length > 0 ? filteredStyles : allMenStyles.slice(0, 10);

    // 4. 임베딩 기반 유사도 검색
    const searchQuery = `${styleName} ${maleParams.topLength || ''} ${maleParams.fadeType || ''} ${maleParams.texture || ''}`.trim();
    const queryEmbedding = await generateQueryEmbedding(searchQuery, geminiKey);

    const stylesWithSimilarity = targetStyles.map(style => {
      let similarity = 0;
      if (style.embedding && queryEmbedding) {
        similarity = cosineSimilarity(queryEmbedding, style.embedding);
      }
      return { ...style, similarity };
    });

    const top3 = stylesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(`🎯 Top-3 참고 스타일:`);
    top3.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`);
    });

    // 5. 레시피 재생성
    const maleRecipe = await generateMaleCustomRecipe(maleParams, top3, geminiKey);

    // 6. 도해도 선별
    const selectedDiagrams = selectMaleDiagramsByTechnique(top3, maleParams, 15);

    console.log(`⏱️ 재분석 완료: ${Date.now() - startTime}ms`);

    // 7. 결과 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          gender: 'male',
          analysis: {
            styleCode: style_code,
            styleName: styleInfo.ko || styleName,
            subStyle: subStyleName,
            topLength: maleParams.topLength || 'Medium',
            sideLength: maleParams.sideLength || 'Short',
            fadeType: maleParams.fadeType || 'None',
            texture: maleParams.texture || 'Smooth',
            productType: maleParams.productType || 'Wax',
            stylingDirection: maleParams.stylingDirection || 'Forward'
          },
          targetSeries: {
            code: style_code,
            name: styleInfo.ko || styleName,
            subStyles: styleInfo.subStyles || [],
            totalStyles: filteredStyles.length
          },
          referenceStyles: top3.map(s => ({
            styleId: s.styleId,
            similarity: s.similarity,
            resultImage: s.resultImage
          })),
          recipe: maleRecipe,
          diagrams: selectedDiagrams,
          processingTime: Date.now() - startTime
        }
      })
    };

  } catch (error) {
    console.error('❌ 남자 스타일 재분석 오류:', error);
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

// 남자 스타일 용어 (PDF 기반 상세 분류) + 대분류 상세 설명
const MALE_STYLE_TERMS = {
  'SF': {
    ko: '사이드 프린지',
    en: 'Side Fringe',
    subStyles: ['댄디컷', '시스루 댄디컷', '슬릭컷'],
    description: {
      core: '이마를 자연스럽게 덮고 한쪽 방향으로 흐르듯 연출하는 스타일. 답답하지 않으면서 부드러운 인상.',
      frontDesign: '이마를 덮되 살짝 옆으로 흐르게 커트. 무겁지 않고 자연스러운 볼륨감 유지.',
      sideBack: '사이드와 백은 짧고 깔끔하게 정리. 상단 모발의 질감과 흐름이 또렷하게 살아남.',
      impression: '동안 이미지, 내추럴한 이미지',
      styling: '드라이 시 앞쪽으로 말리듯 말린 후, 소량의 왁스로 앞머리 질감만 가볍게 정리. 데일리 스타일로 적합.',
      targetCustomer: ['이마가 넓어 고민인 분', '이마 노출이 부담스러운 분', '얼굴을 더 작고 부드럽게 보이고 싶은 분', '동안/내추럴 이미지 선호']
    }
  },
  'SP': {
    ko: '사이드 파트',
    en: 'Side Part',
    subStyles: ['가일컷', '시스루 가일컷', '시스루 가르마컷', '플랫컷', '리프컷', '포마드컷', '드롭컷', '하프컷', '숏가일컷', '리젠트컷', '시스루 애즈컷'],
    description: {
      core: '한쪽으로 또렷하게 나뉘는 가르마 라인이 가장 중요한 클래식 스타일. 단정하고 정돈된 이미지.',
      frontDesign: '가르마를 기준으로 긴 상단 모발을 뒤로 넘기거나 옆으로 자연스럽게 흐르듯 연출. 왁스나 포마드로 볼륨과 윤기감.',
      sideBack: '사이드는 아주 짧게 커트하거나 깔끔하게 트리밍. 상단 볼륨과 대비로 세련된 실루엣.',
      impression: '깔끔하고 신뢰감 있는 이미지. 성숙하고 고급스러운 분위기.',
      styling: '왁스나 포마드로 볼륨과 윤기감을 살려 스타일 완성.',
      targetCustomer: ['단정한 인상 선호', '직장인, 면접, 정장 착용이 잦은 고객', '클래식/신뢰감/프로페셔널 이미지']
    }
  },
  'FU': {
    ko: '프린지 업',
    en: 'Fringe Up',
    subStyles: ['아이비리그컷', '크랙컷'],
    description: {
      core: '앞머리를 이마 위로 또렷하게 들어 올리는 스타일. 이마를 완전히 드러내 시원하고 깔끔한 인상.',
      frontDesign: '앞머리에 세로 방향 볼륨을 확실하게 살리는 것이 핵심. 이마 전부 노출로 활동적이고 자신감 있는 분위기.',
      sideBack: '투블럭 또는 페이드 컷처럼 짧고 깔끔하게 정리. 상단 볼륨이 더욱 강조되며 입체적인 실루엣.',
      impression: '시원하고 남성적인 이미지. 자신감 있고 샤프한 남성미. 얼굴이 더 길고 날렵해 보이는 효과.',
      styling: '왁스, 스프레이 등 스타일링 제품 사용 필수. 드라이로 앞머리를 위로 세운 뒤 제품으로 고정.',
      targetCustomer: ['이마 노출이 잘 어울리는 얼굴형', '활동적/스포티한 느낌 원하는 분', '강한 남성미/카리스마 원하는 고객']
    }
  },
  'PB': {
    ko: '푸시드 백',
    en: 'Pushed Back',
    subStyles: ['폼파도르컷', '슬릭백', '슬릭백 언더컷'],
    description: {
      core: '상단 모발 전체를 이마에서 뒤쪽으로 깔끔하게 넘기는 스타일. 앞에서 뒤로 흐르는 모발 방향성과 라인이 핵심.',
      frontDesign: '볼륨 백(자연스럽게 뒤로 넘김) 또는 슬릭 백(윤기 있게 밀착시켜 클래식하게). 모발 결 따라 흐르는 라인이 완성도 좌우.',
      sideBack: '페이드 또는 투블럭으로 짧고 깔끔하게 정리. 상단의 정돈된 라인과 뒤로 흐르는 실루엣 강조.',
      impression: '성숙하고 자신감 있는 이미지. 차분하면서도 고급스럽고 세련된 분위기. 이목구비가 시원하게 드러남.',
      styling: '고정력 강한 포마드 또는 왁스 사용 필수. 드라이로 뒤 방향 흐름 만든 후 제품으로 고정.',
      targetCustomer: ['클래식한 스타일 선호', '정장/댄디/포멀룩이 잦은 고객', '성숙하고 남성적인 이미지 강조']
    }
  },
  'BZ': {
    ko: '버즈 컷',
    en: 'Buzz Cut',
    subStyles: ['버즈컷'],
    description: {
      core: '클리퍼로 두피에 가깝게 짧게 밀어내는 가장 단순한 스타일. 남성 헤어스타일 중 가장 깔끔하고 관리 쉬운 컷.',
      frontDesign: '전체를 같은 길이로 미는 방식 또는 상단만 살짝 더 길게 남기는 방식. 군더더기 없는 초단발 실루엣.',
      sideBack: '페이드로 매우 짧게 면도 수준까지 정리. 귀 라인, 네이프 라인이 깨끗하게 드러남. 스킨이 보이는 초정돈.',
      impression: '강인하고 단단한 이미지. 군인 같은 강한 남성미. 미니멀하고 시크한 분위기.',
      styling: '별도 스타일링 불필요. 왁스, 드라이 전혀 필요 없음. 샴푸만 하고 바로 외출 가능.',
      targetCustomer: ['손질이 귀찮은 분', '운동 자주 하거나 땀 많은 고객', '두상에 자신 있는 분', '강하고 담백한 이미지']
    }
  },
  'CP': {
    ko: '크롭 컷',
    en: 'Crop Cut',
    subStyles: ['크롭컷', '스왓컷'],
    description: {
      core: '상단을 짧게 커트하고 앞쪽으로 자연스럽게 떨어뜨리는 모던 스타일. 사이드와 확실한 대비가 포인트.',
      frontDesign: '짧고 텍스처가 살아 있는 커트. 앞머리는 이마를 살짝 덮는 짧은 프린지 형태.',
      sideBack: '페이드 또는 극단적으로 짧은 길이로 정리. 깔끔한 윤곽과 강한 남성적 라인.',
      impression: '깔끔함 + 강인함 + 트렌디함. 군더더기 없는 스트리트 감성의 현대적인 남성 이미지.',
      styling: '손질이 거의 필요 없는 초저관리형 스타일. 단정하면서도 트렌디하고 남성적.',
      targetCustomer: ['여름철, 활동량 많은 고객', '트렌디하면서 관리 쉬운 스타일', '스트리트/모던 감성']
    }
  },
  'MC': {
    ko: '모히칸',
    en: 'Mohican',
    subStyles: ['모히칸컷'],
    description: {
      core: '사이드는 매우 짧게, 상단 중앙 라인만 길게 남겨 위로 세우는 강한 대비 스타일. 중앙 피크(peak) 형태가 포인트.',
      frontDesign: '중앙 라인을 중심으로 모발을 위쪽으로 강하게 세워 연출. 볼륨보다 수직 라인과 각이 핵심.',
      sideBack: '투블럭 또는 페이드 기법으로 짧고 깔끔하게 정리. 상단과 대비되어 모히칸 특유의 카리스마 강조.',
      impression: '스포티하고 강한 남성미. 자신감 있고 공격적인 이미지. 얼굴 윤곽이 더 또렷하고 샤프한 인상.',
      styling: '고정력 강한 왁스 또는 스프레이 필수. 드라이로 상단을 위로 세운 뒤 제품으로 단단하게 고정. 관리 난이도 중~상.',
      targetCustomer: ['개성 강한 스타일 원하는 고객', '스포티/퍼포먼스 직군', '평범한 스타일보다 확실한 존재감']
    }
  }
};

// 남자 이미지 Vision 분석 - 2WAY CUT SYSTEM 반영
async function analyzeManImageVision(imageBase64, mimeType, geminiKey) {
  const prompt = `You are a professional men's hairstyle analyst using the 2WAY CUT SYSTEM methodology.

## 스타일 카테고리 (Style Category) - 7개 대분류 상세

### SF (Side Fringe) - 사이드 프린지
- 핵심: 이마를 자연스럽게 덮고 한쪽 방향으로 흐르는 스타일
- 앞머리: 이마를 덮되 살짝 옆으로 흐르게, 자연스러운 볼륨
- 사이드/백: 짧고 깔끔하게 정리
- 인상: 동안 이미지, 부드럽고 내추럴
- 추천: 이마 넓은 분, 이마 노출 부담스러운 분

### SP (Side Part) - 사이드 파트
- 핵심: 한쪽으로 또렷한 가르마 라인이 가장 중요한 클래식 스타일
- 앞머리: 가르마 기준 상단을 뒤/옆으로 넘김, 포마드로 윤기
- 사이드/백: 아주 짧게 트리밍, 상단과 대비
- 인상: 단정하고 신뢰감, 성숙하고 고급스러움
- 추천: 직장인, 비즈니스룩, 프로페셔널 이미지

### FU (Fringe Up) - 프린지 업
- 핵심: 앞머리를 이마 위로 또렷하게 올리는 스타일
- 앞머리: 세로 방향 볼륨, 이마 완전 노출
- 사이드/백: 투블럭/페이드로 짧게, 상단 볼륨 강조
- 인상: 시원하고 남성적, 자신감/카리스마
- 추천: 활동적/스포티한 이미지, 강한 남성미 원하는 분

### PB (Pushed Back) - 푸시드 백
- 핵심: 상단 전체를 뒤로 넘기는 스타일 (볼륨백/슬릭백)
- 앞머리: 앞에서 뒤로 흐르는 방향성과 라인
- 사이드/백: 페이드/투블럭으로 짧게
- 인상: 성숙하고 세련됨, 고급스러움
- 추천: 클래식/댄디/포멀룩, 정장 착용 잦은 분

### BZ (Buzz Cut) - 버즈 컷
- 핵심: 클리퍼로 두피에 가깝게 밀어내는 초단발
- 전체: 같은 길이로 밀거나 상단만 살짝 길게
- 사이드/백: 페이드로 면도 수준까지, 스킨 보이는 초정돈
- 인상: 강인함, 미니멀, 군인 같은 남성미
- 추천: 손질 귀찮은 분, 운동 많이 하는 분, 두상 좋은 분

### CP (Crop Cut) - 크롭 컷
- 핵심: 상단 짧게 커트 + 앞쪽으로 떨어뜨리는 모던 스타일
- 앞머리: 짧고 텍스처 있는 탑, 짧은 프린지로 이마 살짝 덮음
- 사이드/백: 페이드로 극단적으로 짧게, 강한 대비
- 인상: 깔끔함 + 트렌디함, 스트리트 감성
- 추천: 여름철, 활동량 많은 분, 초저관리 원하는 분

### MC (Mohican) - 모히칸
- 핵심: 사이드 짧게, 중앙만 길게 남겨 위로 세우는 강한 대비
- 앞머리: 중앙 라인 위로 강하게 세움, 피크(뾰족) 형태
- 사이드/백: 투블럭/페이드로 짧게, 카리스마 강조
- 인상: 스포티, 공격적, 얼굴 윤곽 또렷
- 추천: 개성 강한 스타일, 퍼포먼스/스포티 이미지

## 2WAY CUT SYSTEM 변수

【CELESTIAL ANGLE (천체각)】- 볼륨/무게감 결정
- 0°: One Length (최대 무게감)
- 15°: Low Graduation
- 45°: Medium Graduation
- 75°: High Graduation
- 90°: Layer
- 135°: High Layer (최대 가벼움)

【CUT FORM】
- L (Layer): 층이 많고 가벼움, 텍스처 있음
- G (Graduation): 하단에 무게감, 층 적음
- O (One Length): 일자 무게선

【LIFTING RANGE】
- L0: 0° (원렝스) | L1: 22.5° | L2: 45° | L3: 67.5°
- L4: 90° (기본 Layer) | L5: 112.5° | L6: 135° | L7: 157.5° | L8: 180°

【SECTION TYPE & ANGLE】
- HS: Horizontal Section (가로)
- VS: Vertical Section (세로)
- DFS: Diagonal-Forward Section (전대각) - 볼륨 위치 결정
- DBS: Diagonal-Backward Section (후대각)
- Section Angle: 15° (Low), 45° (Medium), 75° (High)

【DISTRIBUTION (분배 방식)】
- Natural: 자연 빗질
- Perpendicular: 수직 분배
- Variable: 변이 분배 (빗질 각도 비틀기)
- Directional: 방향성 분배

【GUIDE LINE】
- Fixed: 고정 디자인 라인 (한 곳으로 당김)
- Traveling: 이동 디자인 라인 (가이드가 따라감)

【DIRECTION】
- D0~D3: Under-direction (앞이 짧아짐)
- D4: On Base (자연스러운 낙하)
- D5~D8: Over-direction (앞이 길어짐)

## OUTPUT (JSON only)
{
  "style_category": "SF|SP|FU|PB|BZ|CP|MC",
  "style_name": "English style name",
  "sub_style": "Korean sub-style name",
  "cut_form": "L|G|O",
  "celestial_angle": 0|15|45|75|90|135,
  "lifting_range": ["L3", "L4"],
  "section_primary": "HS|VS|DFS|DBS",
  "section_angle": 15|45|75,
  "distribution": "Natural|Perpendicular|Variable|Directional",
  "guide_line": "Fixed|Traveling",
  "direction_primary": "D0|D1|D2|D3|D4|D5|D6|D7|D8",
  "top_length": "Very Short|Short|Medium|Long",
  "side_length": "Skin|Very Short|Short|Medium",
  "fade_type": "None|Low Fade|Mid Fade|High Fade|Skin Fade|Taper",
  "texture": "Smooth|Textured|Messy|Spiky",
  "volume_zone": "High|Medium|Low",
  "weight_distribution": "Top Heavy|Balanced|Bottom Heavy",
  "connection_type": "Connected|Disconnected",
  "product_type": "Wax|Pomade|Clay|Gel",
  "styling_direction": "Forward|Backward|Side|Up",
  "hair_regions": {
    "top": {"x": 0-100, "y": 0-100},
    "crown": {"x": 0-100, "y": 0-100},
    "side_left": {"x": 0-100, "y": 0-100},
    "side_right": {"x": 0-100, "y": 0-100},
    "back": {"x": 0-100, "y": 0-100} or null,
    "fringe": {"x": 0-100, "y": 0-100} or null,
    "nape": {"x": 0-100, "y": 0-100}
  }
}

⭐ **hair_regions 필수! (UI 오버레이용)**
이미지에서 각 헤어 영역의 중심 좌표를 0~100% 범위로 반환:
- x: 왼쪽 0%, 오른쪽 100%
- y: 상단 0%, 하단 100%
- 보이지 않는 영역은 null`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini Vision API Error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) {
    throw new Error('No response from Gemini Vision');
  }

  // JSON 파싱
  let cleanedText = responseText.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(cleanedText);
}

// 남자 커스텀 레시피 생성
async function generateMaleCustomRecipe(params, top3Styles, geminiKey) {
  const styleInfo = MALE_STYLE_TERMS[params.style_category] || { ko: params.style_name, en: params.style_name };
  const subStyleName = params.sub_style || styleInfo.subStyles?.[0] || styleInfo.ko;

  const diagramsContext = top3Styles.flatMap(style =>
    (style.diagrams || []).slice(0, 5).map(d =>
      `- ${style.styleId} Step ${d.step}: Zone=${d.zone || 'N/A'}, Lifting=${d.lifting || 'N/A'}, Section=${d.section || 'N/A'}`
    )
  ).join('\n');

  // ⭐ 자막 파일(레시피) 가져오기 - 참고 스타일의 실제 레시피 텍스트
  console.log('📝 참고 스타일 자막(레시피) 가져오는 중...');
  const captionTexts = await Promise.all(
    top3Styles.map(async (style) => {
      const captionText = await fetchCaptionContent(style.captionUrl);
      return captionText ? `[${style.styleId} 레시피]\n${captionText}` : null;
    })
  );
  const captionContext = captionTexts.filter(Boolean).join('\n\n');
  if (captionContext) {
    console.log(`✅ 자막(레시피) ${captionTexts.filter(Boolean).length}개 로드 완료`);
  }

  // ⭐ abcde 북에서 남자 커트 이론 조회
  console.log('📚 abcde 북에서 남자 커트 이론 조회 중...');
  let theoryContext = '';
  try {
    const searchQuery = `${params.style_name || ''} ${params.style_category || ''} ${params.fade_type || ''} 남자 커트 기법`;
    const theoryResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `다음 남자 헤어 스타일에 대한 커팅 이론과 테크닉을 설명해주세요: ${searchQuery}

핵심 내용만 간결하게 3-5문장으로 요약해주세요.
- 클리퍼 작업 순서와 가드 사이즈
- 페이드 블렌딩 기법
- 탑/크라운 커팅 각도
- 텍스처 처리 방법`
            }]
          }],
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [GEMINI_FILE_SEARCH_STORE]
            }
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
            topP: 0.8,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );
    if (theoryResponse.ok) {
      const theoryData = await theoryResponse.json();
      // 여러 parts에서 텍스트 추출
      const parts = theoryData.candidates?.[0]?.content?.parts || [];
      theoryContext = parts.map(p => p.text || '').join('');
      if (theoryContext) {
        console.log(`✅ 남자 커트 이론 조회 완료 (${theoryContext.length}자)`);
      }
    }
  } catch (err) {
    console.warn('⚠️ 이론 조회 실패 (계속 진행):', err.message);
  }

  const theorySection = theoryContext
    ? `\n**📚 참고 이론 (2WAY CUT 교재):**\n${theoryContext}\n`
    : '';

  // 자막(레시피) 섹션 추가
  const captionSection = captionContext
    ? `\n**📝 참고 스타일 레시피:**\n${captionContext}\n`
    : '';

  // 스타일별 상세 설명 가져오기
  const styleDesc = styleInfo.description || {};
  const styleDetailText = styleDesc.core ? `
【${styleInfo.ko} (${params.style_category}) 스타일 특징】
- 핵심: ${styleDesc.core}
- 앞머리/탑: ${styleDesc.frontDesign || '-'}
- 사이드/백: ${styleDesc.sideBack || '-'}
- 인상: ${styleDesc.impression || '-'}
- 스타일링: ${styleDesc.styling || '-'}
- 추천 대상: ${Array.isArray(styleDesc.targetCustomer) ? styleDesc.targetCustomer.join(', ') : '-'}
` : '';

  const systemPrompt = `당신은 남자 헤어컷 전문가입니다. 모든 응답을 한국어로만 작성하세요. 클리퍼 가드 사이즈, 페이드 기법 등 실무적인 내용을 포함하세요.${theoryContext ? ' 참고 이론의 내용을 레시피에 자연스럽게 반영하세요.' : ''}${captionContext ? ' 참고 스타일 레시피의 테크닉과 순서를 참고하세요.' : ''}
${styleDetailText}`;

  // 핵심 파라미터 추출
  const liftingStr = Array.isArray(params.lifting_range) ? params.lifting_range.join(', ') : 'L4';

  const userPrompt = `**📊 분석 결과:**
- 카테고리: ${styleInfo.ko} (${params.style_category})
- 구체적 스타일: ${subStyleName}
- 탑 길이: ${params.top_length || 'Medium'}
- 사이드 길이: ${params.side_length || 'Short'}
- 페이드: ${params.fade_type || 'None'}
- 텍스처: ${params.texture || 'Smooth'}
- 스타일링 제품: ${params.product_type || 'Wax'}

### 핵심 커팅 파라미터 ⭐
- **Cut Form**: ${params.cut_form || 'L (Layer)'}
- **Lifting Range**: ${liftingStr}
- **Section Primary**: ${params.section_primary || 'VS'}
- **Direction**: ${params.direction_primary || 'D4'}
- **Volume Zone**: ${params.volume_zone || 'Medium'}
- **Weight Distribution**: ${params.weight_distribution || 'Top Heavy'}
- **Connection Type**: ${params.connection_type || 'Connected'}

${theorySection}${captionSection}
**🎯 참고 도해도:**
${diagramsContext}

## ⚠️ 리프팅 각도 기준표 (매우 중요!)
| 코드 | 각도 | 설명 |
|-----|-----|------|
| L0 | 0° | 원렝스 (무게선 명확) |
| L1 | 22.5° | Low Graduation |
| L2 | 45° | Mid Graduation |
| L3 | 67.5° | High Graduation |
| L4 | 90° | 기본 Layer |
| L5 | 112.5° | Mid-High Layer |
| L6 | 135° | High Layer |
| L7 | 157.5° | Very High Layer |
| L8 | 180° | Extreme Layer |

❗ 중요: L4는 90도입니다! 45도가 아닙니다!

## ⚠️ 존별 Section/Lifting/Direction 규칙
**남자 커트에서도 존별로 다르게 적용하세요!**

### 섹션 (Section)
| 존 | 권장 섹션 | 이유 |
|-----|---------|------|
| Side | VS (Vertical) | 페이드 블렌딩에 효과적 |
| Top | DBS or VS | 볼륨에 따라 선택 |
| Back | HS (Horizontal) | 클리퍼 작업 기준선 |

### 디렉션 (Direction)
| 존 | 권장 방향 | 효과 |
|-----|---------|------|
| Side | D4 (On Base) | 자연스러운 낙하 |
| Top | D4~D6 | 볼륨과 흐름 방향에 따라 |
| Crown | D5~D7 | 정수리 볼륨 형성 |

**📋 레시피 작성 지침:**

## 🎯 스타일 개요
- **스타일명**: ${subStyleName}
- **카테고리**: ${styleInfo.ko} (${params.style_category})
- **특징**: (핵심 특징 1-2줄)

---

## ✂️ 커팅 레시피

[External] (Under Zone)

### 📍 STEP 1. 네이프 & 사이드 베이스
- 📐 **섹션**: (HS/VS + 설명)
- 📐 **리프팅**: (L코드 + 각도 + 쉬운 설명)
- 🔄 **디렉션**: (D코드 + 방향 설명)
- ✂️ **기법**: (클리퍼 가드 사이즈 또는 가위 기법)
- 💡 **포인트**: (이 단계의 핵심 목적)

---

### 📍 STEP 2. 사이드 페이드/그라데이션
- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**: (클리퍼 가드 순서: 0.5mm → 3mm → 6mm 등)
- 💡 **포인트**: (블렌딩 위치와 방법)

---

[Internal] (Over Zone)

### 📍 STEP 3. 탑 & 크라운 레이어
- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**: (가위 기법 - 포인트컷, 슬라이드컷 등)
- 💡 **포인트**: (볼륨과 질감 형성)

---

### 📍 STEP 4. 프린지 (앞머리)
- 📐 **섹션**:
- 📐 **리프팅**:
- 🔄 **디렉션**:
- ✂️ **기법**:
- 💡 **포인트**: (스타일 방향에 따른 앞머리 처리)

---

## 💇 마무리 & 스타일링
- **아웃라인**: (귀 주변, 목덜미 정리)
- **텍스처링**: (질감 처리 기법)
- **추천 제품**: (왁스/포마드/젤 등)
- **드라이 방향**: (볼륨 연출 방향)

---

### ⚠️ 필수 규칙:
1. 반드시 [External] (Under Zone)과 [Internal] (Over Zone)으로 구분
2. 각 STEP마다 "---" 구분선 사용
3. 이모지(📐🔄✂️💡)로 항목 구분
4. 모든 전문용어 뒤에 괄호()로 쉬운 설명

## 📚 초보자 친화적 설명 규칙 (매우 중요!)
**모든 전문용어 뒤에는 💡로 시작하는 쉬운 설명을 추가하세요!**

예시 형식:
- Lifting: L4 (90°)
  💡 머리카락을 두피에서 직각(90도)으로 들어올려서 자르는 각도예요
- Section: VS (Vertical Section)
  💡 머리를 수직으로 나눠서 잡는 방식이에요. 페이드 작업할 때 주로 써요
- Direction: D5 (Over-direction)
  💡 모발을 살짝 뒤로 당겨서 자르면, 놓았을 때 앞쪽이 조금 더 길어져요
- Low Fade (로우 페이드)
  💡 귀 아래쪽에서만 짧아지는 그라데이션이에요. 자연스럽고 직장인에게 좋아요
- 클리퍼 가드 1.5mm
  💡 손톱 두께 정도로 아주 짧게 밀리는 길이예요
- 블렌딩 (Blending)
  💡 짧은 부분과 긴 부분이 자연스럽게 연결되도록 섞어주는 기법이에요

💡 설명을 포함하여 충분히 상세하게 작성하세요.`;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 3000
    })
  });

  if (!completion.ok) {
    throw new Error(`OpenAI API Error: ${completion.status}`);
  }

  const data = await completion.json();
  return data.choices[0].message.content;
}

// 남자 도해도 선별
function selectMaleDiagramsByTechnique(styles, params, maxDiagrams = 15) {
  const allDiagrams = [];

  styles.forEach(style => {
    if (style.diagrams && Array.isArray(style.diagrams)) {
      style.diagrams.forEach(diagram => {
        allDiagrams.push({
          style_id: style.styleId,
          step_number: diagram.step,
          image_url: diagram.url,
          lifting: diagram.lifting,
          direction: diagram.direction,
          section: diagram.section,
          zone: diagram.zone,
          cutting_method: diagram.cutting_method,
          similarity: style.similarity || 0
        });
      });
    }
  });

  // step_number 중복 제거
  const seenSteps = new Set();
  const selectedDiagrams = [];

  // 유사도 순 정렬 후 중복 제거
  allDiagrams.sort((a, b) => b.similarity - a.similarity);

  for (const diagram of allDiagrams) {
    if (!seenSteps.has(diagram.step_number)) {
      seenSteps.add(diagram.step_number);
      selectedDiagrams.push(diagram);
    }
  }

  // step 순서대로 정렬
  selectedDiagrams.sort((a, b) => a.step_number - b.step_number);

  return selectedDiagrams.slice(0, maxDiagrams);
}

// ==================== 어드민: 스타일 분석 (이미지 생성용) ====================
async function analyzeStyleForGeneration(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  // 어드민 전용 Gemini API 키 (분리 사용)
  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || geminiKey;

  console.log('🎨 스타일 분석 (이미지 생성용) 시작');
  console.log('🔑 ADMIN_GEMINI_KEY 존재:', !!ADMIN_GEMINI_KEY, '길이:', ADMIN_GEMINI_KEY?.length);
  console.log('📷 이미지 데이터 길이:', image_base64?.length, 'mime_type:', mime_type);

  try {
    const prompt = `Analyze this hairstyle image in EXTREME DETAIL for image replication.

You must extract every visual detail so another AI can recreate the EXACT same hairstyle.

Return ONLY a JSON object with these fields:
{
  "gender": "male" or "female",
  "length": "Describe exactly where hair ends (e.g., 'chin-length', 'mid-chest', 'shoulder-length')",
  "length_cm": "Estimated length in cm (e.g., '25cm', '40cm')",
  "form": "Layer/Graduation/One Length/Textured - describe the layering pattern",
  "color": "Exact color with details (e.g., 'dark chocolate brown with subtle caramel highlights')",
  "style": "Specific style name (e.g., 'Korean wolf cut', 'layered bob with face-framing')",
  "texture": "Describe texture (e.g., 'soft waves with slight curl at ends', 'straight with natural body')",
  "bangs": "Detailed bang description (e.g., 'curtain bangs parted in center, reaching cheekbones')",
  "parting": "Center/Left/Right/None - describe the parting",
  "volume": "Describe volume distribution (e.g., 'voluminous at roots, tapered ends')",
  "silhouette": "Describe overall shape (e.g., 'A-line', 'rounded', 'V-shaped at back')",
  "face_framing": "Describe face-framing layers if any",
  "styling": "How the hair is styled (e.g., 'blow-dried with inward curl', 'natural air-dried')",
  "description": "Detailed 2-3 sentence description in Korean capturing the complete look"
}

Be EXTREMELY specific. Every detail matters for accurate replication.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ADMIN_GEMINI_KEY}`;
    console.log('🌐 API 호출 URL:', apiUrl.replace(ADMIN_GEMINI_KEY, 'API_KEY_HIDDEN'));

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mime_type || 'image/jpeg',
              data: image_base64
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    };

    console.log('📤 요청 본문 크기:', JSON.stringify(requestBody).length);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 에러 응답:', errorText);
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 파싱 실패');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('✅ 스타일 분석 완료:', analysis);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analysis
      })
    };

  } catch (error) {
    console.error('💥 스타일 분석 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: URL에서 이미지 가져와서 분석 ====================
async function analyzeStyleFromUrl(payload, geminiKey) {
  const { image_url } = payload;

  // 어드민 전용 Gemini API 키
  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || geminiKey;

  console.log('🔗 URL 이미지 분석 시작:', image_url);

  try {
    // 1. URL에서 이미지 가져오기
    const imageResponse = await fetch(image_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`이미지를 가져올 수 없습니다: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log('📷 이미지 가져오기 완료:', contentType);

    // 2. Gemini Vision으로 분석
    const prompt = `Analyze this hairstyle image for AI image generation.

Return ONLY a JSON object with these fields:
{
  "gender": "male" or "female",
  "length": "Short/Medium/Long/Very Long",
  "form": "Layer/Graduation/One Length/Textured",
  "color": "Black/Brown/Blonde/Red/etc (include highlights if any)",
  "style": "Bob/Pixie/Wolf Cut/Shag/etc",
  "texture": "Straight/Wavy/Curly/Permed",
  "bangs": "None/Full/Side/Curtain/Wispy",
  "description": "Brief 1-2 sentence description in Korean focusing on key visual features for image generation"
}

Be specific and visual. Focus on what makes this hairstyle unique.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ADMIN_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: contentType,
                  data: base64Image
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 파싱 실패');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('✅ URL 이미지 분석 완료:', analysis);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          analysis: analysis,
          image_base64: base64Image
        }
      })
    };

  } catch (error) {
    console.error('💥 URL 이미지 분석 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: Gemini로 헤어스타일 이미지 생성 ====================
async function generateHairstyleImage(payload) {
  const { analysis, reference_image, num_images, image_size } = payload;

  // 어드민 전용 Gemini API 키
  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('🎨 Gemini 이미지 생성 시작 (참고 이미지 포함)');

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  try {
    // 분석 결과로 프롬프트 생성
    const genderWord = analysis.gender === 'male' ? 'man' : 'woman';

    // 성별에 따른 톤앤매너 설정
    const styleGuide = analysis.gender === 'male'
      ? {
          clothing: 'plain white t-shirt or white crew neck shirt',
          background: 'clean white or light gray studio background',
          pose: 'front-facing or slightly angled, neutral expression'
        }
      : {
          clothing: 'white or beige/cream colored top, simple and elegant',
          background: 'soft white or warm cream/beige studio background',
          pose: 'front-facing or slightly angled, natural soft expression'
        };

    const prompt = `🚨 CRITICAL: You MUST replicate the EXACT hairstyle from this reference image.

Study the reference image and COPY these hairstyle details EXACTLY:
1. EXACT hair length (where the hair ends on the body)
2. EXACT layering pattern and cut structure
3. EXACT hair volume and silhouette shape
4. EXACT bang/fringe style and length
5. EXACT hair texture and wave pattern
6. EXACT hair parting position

Analyzed hairstyle details:
- Length: ${analysis.length || 'medium'}
- Style: ${analysis.style || 'layered'}
- Color: ${analysis.color || 'dark brown'}
- Texture: ${analysis.texture || 'natural'}
- Bangs: ${analysis.bangs || 'none'}
- Description: ${analysis.description || ''}

Generate a NEW photo of a Korean ${genderWord} model with THE IDENTICAL HAIRSTYLE.

Photo requirements:
- Model: Young Korean ${genderWord}, different face from reference
- Clothing: ${styleGuide.clothing}
- Background: ${styleGuide.background}
- Pose: ${styleGuide.pose}
- Lighting: Soft studio lighting
- Composition: Head and shoulders, centered

⚠️ THE HAIRSTYLE MUST BE A NEAR-EXACT COPY OF THE REFERENCE IMAGE.
Only the model's face should be different. The hair MUST look the same.`;

    console.log('📝 생성 프롬프트 (참고 이미지 포함)');

    // 이미지 생성 (num_images 만큼 반복)
    const numToGenerate = Math.min(num_images || 4, 4);
    const generatedImages = [];

    for (let i = 0; i < numToGenerate; i++) {
      console.log(`🖼️ 이미지 ${i + 1}/${numToGenerate} 생성 중...`);

      // 참고 이미지가 있으면 함께 전송
      const parts = [];
      if (reference_image) {
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: reference_image
          }
        });
      }
      parts.push({ text: prompt });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${ADMIN_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${response.status}`, errorText);
        continue; // 실패해도 다음 이미지 시도
      }

      const result = await response.json();

      // 이미지 데이터 추출
      const responseParts = result.candidates?.[0]?.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData) {
          generatedImages.push({
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType
          });
        }
      }
    }

    console.log('✅ Gemini 이미지 생성 완료:', generatedImages.length, '개');

    if (generatedImages.length === 0) {
      throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          images: generatedImages,
          prompt: prompt,
          count: generatedImages.length
        }
      })
    };

  } catch (error) {
    console.error('💥 Gemini 이미지 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: 이미지-to-이미지 직접 생성 (분석 단계 없음) ====================
async function generateHairstyleDirect(payload) {
  const { reference_image, mime_type, num_images, gender } = payload;

  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('🎨 이미지-to-이미지 직접 생성 시작');

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  if (!reference_image) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '참조 이미지가 필요합니다' })
    };
  }

  try {
    const genderWord = gender === 'male' ? 'man' : 'woman';
    const styleGuide = gender === 'male'
      ? {
          clothing: 'plain white t-shirt',
          background: 'clean white or light gray studio background'
        }
      : {
          clothing: 'white or beige/cream colored simple top',
          background: 'soft white or warm cream studio background'
        };

    const prompt = `Look at this reference hairstyle photo carefully.

Create a NEW professional salon photograph with the EXACT SAME HAIRSTYLE on a different Korean ${genderWord} model.

CRITICAL - The new image MUST have:
✅ IDENTICAL hair length (same position where hair ends)
✅ IDENTICAL layering and cut structure
✅ IDENTICAL hair texture and wave pattern
✅ IDENTICAL bang/fringe style and length
✅ IDENTICAL hair parting position
✅ IDENTICAL overall silhouette and volume

Photo requirements:
- Model: Young Korean ${genderWord}, attractive, different person from reference
- Clothing: ${styleGuide.clothing}
- Background: ${styleGuide.background}
- Lighting: Soft, even studio lighting
- Pose: Front-facing or slightly angled
- Quality: High resolution, professional hair salon portfolio style

THE HAIRSTYLE MUST BE VISUALLY IDENTICAL TO THE REFERENCE. Only the model's face should differ.`;

    const numToGenerate = Math.min(num_images || 4, 4);
    const generatedImages = [];

    for (let i = 0; i < numToGenerate; i++) {
      console.log(`🖼️ 직접 생성 ${i + 1}/${numToGenerate}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${ADMIN_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mime_type || 'image/jpeg',
                    data: reference_image
                  }
                },
                { text: prompt }
              ]
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${response.status}`, errorText);
        continue;
      }

      const result = await response.json();
      const responseParts = result.candidates?.[0]?.content?.parts || [];

      for (const part of responseParts) {
        if (part.inlineData) {
          generatedImages.push({
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType
          });
        }
      }
    }

    console.log('✅ 직접 생성 완료:', generatedImages.length, '개');

    if (generatedImages.length === 0) {
      throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          images: generatedImages,
          count: generatedImages.length
        }
      })
    };

  } catch (error) {
    console.error('💥 직접 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: AI 카드뉴스 생성 ====================
async function generateCardNews(payload) {
  const { title, pages, aspect_ratio, num_images, page_images } = payload;

  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('📰 카드뉴스 생성 시작:', { title, pageCount: pages?.length, aspect_ratio, hasPageImages: !!page_images });

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  if (!title && (!pages || !pages[0])) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '제목 또는 내용을 입력해주세요' })
    };
  }

  try {
    // 비율에 따른 사이즈 가이드
    const ratioGuide = {
      '1:1': 'square format (1:1 ratio, 1080x1080)',
      '4:5': 'vertical format (4:5 ratio, 1080x1350)',
      '9:16': 'story/reels format (9:16 ratio, 1080x1920)'
    };

    const sizeText = ratioGuide[aspect_ratio] || ratioGuide['1:1'];
    const numToGenerate = Math.min(num_images || pages?.length || 2, 8);
    const generatedImages = [];

    for (let i = 0; i < numToGenerate; i++) {
      console.log(`🖼️ 카드뉴스 생성 ${i + 1}/${numToGenerate}...`);

      // 각 장별 내용 가져오기
      const pageContent = pages?.[i] || '';
      const pageNum = i + 1;

      // HAIRGATOR 브랜드 스타일 카드뉴스 프롬프트 (각 장별)
      const cardNewsPrompt = `Create a professional Instagram card news image for HAIRGATOR.

⚠️ CRITICAL - KOREAN TEXT RULE:
- You MUST copy the user's Korean text EXACTLY as provided below
- DO NOT translate, modify, or generate any Korean text yourself
- If you cannot render Korean text perfectly, leave text area blank or use simple shapes instead

USER'S EXACT TEXT TO USE:
- Title: "${title || ''}"
- Page Content: "${pageContent || ''}"

COPY THESE TEXTS EXACTLY - character by character, no changes!

BRAND STYLE GUIDE:
- Background: Clean WHITE background
- Accent Color: Magenta Pink (#E91E63) for highlights
- Typography: If using text, copy user's Korean text EXACTLY as-is
- Overall Feel: Premium, professional, clean, minimal

IMAGE REQUIREMENTS:
- Format: ${sizeText}
- Page indicator: ${pageNum}/${numToGenerate}
- NO watermarks
- Focus on visual design, icons, illustrations
- Any text shown MUST be copied exactly from user input above`;

      // parts 구성
      const parts = [];

      // 해당 장의 참고 이미지가 있으면 추가
      const pageImageData = page_images?.[pageNum];
      if (pageImageData && pageImageData.data) {
        // 업로드 이미지를 그대로 유지하면서 카드뉴스 프레임 추가
        const imageContextPrompt = `⚠️ CRITICAL RULE - DO NOT MODIFY THE UPLOADED IMAGE:

You MUST keep the uploaded image EXACTLY as it is - no changes, no modifications, no alterations.

YOUR TASK:
1. Place the uploaded image as the MAIN VISUAL in the center
2. Add card news FRAME/BORDER around it with:
   - White background frame
   - Pink (#E91E63) accent decorations
   - Page indicator: ${pageNum}/${numToGenerate}
3. Add the user's text AROUND the image (not on top of it):
   - Title: "${title || ''}"
   - Content: "${pageContent || ''}"
   - Copy text EXACTLY as provided

IMPORTANT:
- The uploaded image must remain 100% UNCHANGED
- Only add decorative frame and text around it
- Format: ${sizeText}`;

        parts.push({
          inline_data: {
            mime_type: pageImageData.mimeType || 'image/jpeg',
            data: pageImageData.data
          }
        });
        parts.push({ text: imageContextPrompt });
      } else {
        parts.push({ text: cardNewsPrompt });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${ADMIN_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE']
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${response.status}`, errorText);
        throw new Error(`Gemini API 오류 (${response.status}): ${errorText.substring(0, 300)}`);
      }

      const result = await response.json();
      console.log('Gemini 응답 구조:', JSON.stringify(result).substring(0, 500));

      const responseParts = result.candidates?.[0]?.content?.parts || [];

      for (const part of responseParts) {
        if (part.inlineData) {
          generatedImages.push({
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            mimeType: part.inlineData.mimeType
          });
        }
      }

      // 이미지가 없으면 로그
      if (responseParts.length > 0 && !responseParts.some(p => p.inlineData)) {
        const textOnly = responseParts.map(p => p.text || '').join('');
        console.log('⚠️ 이미지 없이 텍스트만 반환:', textOnly.substring(0, 200));
      }
    }

    console.log('✅ 카드뉴스 생성 완료:', generatedImages.length, '개');

    if (generatedImages.length === 0) {
      throw new Error('카드뉴스 생성에 실패했습니다. 다시 시도해주세요.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          images: generatedImages,
          title: title,
          count: generatedImages.length
        }
      })
    };

  } catch (error) {
    console.error('💥 카드뉴스 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: 카드뉴스 키워드/해시태그 추천 ====================
async function generateCardNewsKeywords(payload) {
  const { title, pages } = payload;

  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  try {
    // 모든 페이지 내용 합치기
    const allContent = [title, ...(pages || [])].filter(Boolean).join(' ');

    const prompt = `당신은 인스타그램 마케팅 전문가입니다. 아래 헤어살롱/미용 관련 카드뉴스 콘텐츠를 분석하고, 인스타그램에서 높은 도달률과 참여율을 얻을 수 있는 해시태그를 추천해주세요.

콘텐츠:
제목: ${title || '(제목 없음)'}
내용: ${pages?.join(' | ') || '(내용 없음)'}

요구사항:
1. 총 15-20개의 해시태그를 추천해주세요
2. 대형 해시태그 (100만+ 게시물): 5개
3. 중형 해시태그 (10만-100만 게시물): 7개
4. 소형/니치 해시태그 (1만-10만 게시물): 5개
5. 헤어디자이너/미용사 타겟 해시태그 포함 필수
6. 한국어 해시태그 위주로 (일부 영어 가능)
7. HAIRGATOR 브랜드 해시태그 포함: #헤어게이터 #HAIRGATOR

출력 형식:
해시태그만 공백으로 구분해서 한 줄로 출력 (설명 없이)
예: #헤어스타일 #미용사 #헤어디자이너 ...`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ADMIN_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API 오류');
    }

    const result = await response.json();
    const keywords = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    console.log('✅ 키워드 생성 완료:', keywords.substring(0, 100));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { keywords }
      })
    };

  } catch (error) {
    console.error('💥 키워드 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 어드민: Veo 3.1 영상 생성 ====================
async function generateVideo(payload) {
  const { prompt, duration, aspect_ratio, reference_images } = payload;

  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('🎬 영상 생성 시작:', { prompt: prompt?.substring(0, 50), duration, aspect_ratio, refImageCount: reference_images?.length || 0 });

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '영상 설명을 입력해주세요' })
    };
  }

  try {
    // HAIRGATOR 브랜드 스타일 프롬프트 강화
    const enhancedPrompt = `Professional hair salon video for HAIRGATOR brand. ${prompt}.
Style: Premium, professional Korean hair salon atmosphere. Clean, modern interior with soft lighting.
Target audience: Professional hair designers and stylists.`;

    // Veo 3.1 API 요청 구성
    const requestBody = {
      instances: [{
        prompt: enhancedPrompt
      }],
      parameters: {
        aspectRatio: aspect_ratio || '9:16',
        durationSeconds: parseInt(duration) || 8
      }
    };

    // 참고 이미지가 있으면 추가 (최대 3개)
    if (reference_images && reference_images.length > 0) {
      requestBody.instances[0].referenceImages = reference_images.slice(0, 3).map(img => ({
        image: {
          bytesBase64Encoded: img.data,
          mimeType: img.mimeType || 'image/jpeg'
        }
      }));
    }

    // Veo 3.1 Long Running Operation 시작
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${ADMIN_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('Veo API 시작 오류:', startResponse.status, errorText);
      throw new Error(`Veo API 오류 (${startResponse.status}): ${errorText.substring(0, 200)}`);
    }

    const operationData = await startResponse.json();
    const operationName = operationData.name;

    console.log('🎬 영상 생성 작업 시작:', operationName);

    // 작업 완료까지 폴링 (최대 5분)
    const maxAttempts = 30;
    const pollInterval = 10000; // 10초

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${ADMIN_GEMINI_KEY}`,
        { method: 'GET' }
      );

      if (!pollResponse.ok) {
        console.error('폴링 오류:', pollResponse.status);
        continue;
      }

      const pollData = await pollResponse.json();

      if (pollData.done) {
        console.log('✅ 영상 생성 완료!');

        if (pollData.error) {
          throw new Error(pollData.error.message || '영상 생성 실패');
        }

        // 생성된 비디오 URL 추출
        const videoData = pollData.response?.generatedVideos?.[0];
        if (!videoData) {
          throw new Error('생성된 영상이 없습니다');
        }

        // base64 비디오 데이터를 data URL로 변환
        let videoUrl;
        if (videoData.video?.uri) {
          videoUrl = videoData.video.uri;
        } else if (videoData.video?.bytesBase64Encoded) {
          videoUrl = `data:video/mp4;base64,${videoData.video.bytesBase64Encoded}`;
        } else {
          throw new Error('비디오 데이터를 찾을 수 없습니다');
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              video_url: videoUrl,
              duration: duration,
              aspect_ratio: aspect_ratio
            }
          })
        };
      }

      console.log(`⏳ 영상 생성 중... (${attempt + 1}/${maxAttempts})`);
    }

    throw new Error('영상 생성 시간 초과 (5분)');

  } catch (error) {
    console.error('💥 영상 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}

// ==================== 헤어스타일 각도별 이미지 생성 (앞/옆/뒤/대각선) ====================
async function generateAngleViews(payload) {
  const { reference_image, mime_type, gender, analysis } = payload;

  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('🔄 각도별 이미지 생성 시작:', { gender, hasAnalysis: !!analysis });

  if (!ADMIN_GEMINI_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
    };
  }

  if (!reference_image) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '참조 이미지가 필요합니다' })
    };
  }

  try {
    const genderWord = gender === 'male' ? 'man' : 'woman';
    const genderKr = gender === 'male' ? '남성' : '여성';

    // 분석 정보가 있으면 활용
    const hairDescription = analysis ? `
Hair details from analysis:
- Length: ${analysis.lengthName || analysis.length || 'medium'}
- Style/Form: ${analysis.form || analysis.styleName || 'layered'}
- Volume Position: ${analysis.volumePosition || 'mid'}
- Bangs: ${analysis.hasBangs ? (analysis.bangsType || 'with bangs') : 'no bangs'}
- Texture: ${analysis.texture || 'natural'}
` : '';

    // 4가지 각도 정의
    const angles = [
      { name: '정면', nameEn: 'Front', prompt: 'front view, facing camera directly, symmetrical face visible' },
      { name: '측면', nameEn: 'Side', prompt: 'side profile view, 90 degree angle, showing ear and side of face' },
      { name: '후면', nameEn: 'Back', prompt: 'back view, showing the back of the head and hair, nape visible' },
      { name: '대각선', nameEn: '3/4 View', prompt: '3/4 angle view, 45 degree angle, showing both eye and ear partially' }
    ];

    const generatedImages = [];

    // 각 각도별로 이미지 생성
    for (const angle of angles) {
      console.log(`🖼️ ${angle.name} 각도 이미지 생성 중...`);

      const prompt = `Look at this reference hairstyle photo carefully.
You must generate the EXACT SAME HAIRSTYLE from a different angle.

${hairDescription}

Generate a professional salon photograph of the SAME hairstyle from a ${angle.prompt}.

CRITICAL REQUIREMENTS:
✅ SAME person/model as in the reference image
✅ IDENTICAL hair length, layering, and cut structure
✅ IDENTICAL hair color and texture
✅ IDENTICAL bang/fringe style
✅ The pose/angle should be: ${angle.prompt}
✅ Professional hair salon lighting
✅ Clean white or light gray background
✅ High quality, sharp focus on hair details

This is showing the same hairstyle from the ${angle.nameEn} angle.
The model should be the same Korean ${genderWord} from the reference photo.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${ADMIN_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inline_data: {
                      mime_type: mime_type || 'image/jpeg',
                      data: reference_image
                    }
                  },
                  { text: prompt }
                ]
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`${angle.name} 생성 오류:`, response.status, errorText.substring(0, 200));
          // 실패해도 계속 진행, placeholder 추가
          generatedImages.push({
            angle: angle.name,
            angleEn: angle.nameEn,
            url: null,
            error: true
          });
          continue;
        }

        const result = await response.json();
        const responseParts = result.candidates?.[0]?.content?.parts || [];

        let imageFound = false;
        for (const part of responseParts) {
          if (part.inlineData) {
            generatedImages.push({
              angle: angle.name,
              angleEn: angle.nameEn,
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType
            });
            imageFound = true;
            break;
          }
        }

        if (!imageFound) {
          generatedImages.push({
            angle: angle.name,
            angleEn: angle.nameEn,
            url: null,
            error: true
          });
        }

        // API 부하 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (angleError) {
        console.error(`${angle.name} 생성 중 오류:`, angleError.message);
        generatedImages.push({
          angle: angle.name,
          angleEn: angle.nameEn,
          url: null,
          error: true
        });
      }
    }

    const successCount = generatedImages.filter(img => img.url).length;
    console.log(`✅ 각도별 이미지 생성 완료: ${successCount}/4개 성공`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          images: generatedImages,
          successCount,
          totalCount: 4
        }
      })
    };

  } catch (error) {
    console.error('💥 각도별 이미지 생성 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}
