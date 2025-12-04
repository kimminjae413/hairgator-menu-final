// netlify/functions/chatbot-api.js
// HAIRGATOR v5.0 FINAL - 일반대화 제거 버전 (2025-01-25)
// 
// 🎯 주요 변경사항:
// ❌ 일반대화 구분 완전 제거
// ✅ 모든 텍스트 질문 → generateProfessionalResponse()
// ✅ 간단한 인사 → 짧게 응답 + 질문 유도
// ✅ theory_chunks 자동 검색 → 이론 기반 답변
// ✅ 검색 결과 없으면 → 일반 지식 + 구체적 질문 유도
// 
// 기존 기능 유지:
// 1. ⭐ 사용자 성별 선택 통합 (user_gender: 'male' | 'female')
// 2. GPT-4o Vision + Function Calling (56개 파라미터)
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

      // ⭐ 어드민: z-image로 헤어스타일 이미지 생성
      case 'generate_hairstyle_image':
        return await generateHairstyleImage(payload);

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

전문가처럼 깊이 있고 맥락을 이해한 답변을 작성하세요.`,

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

Answer like a deep-thinking expert who understands the full context.`,

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

専門家のように深い回答を作成してください。`,

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

像专家一样深入回答。`,

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

Trả lời như chuyên gia hiểu sâu.`
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

### 🎯 LENGTH 분류 (가장 중요!)
머리카락이 **신체의 어느 위치까지 닿는지** 확인:
- A Length (5cm): 이마선 - 픽시컷, 매우 짧은 커트
- B Length (10cm): 눈썹선 - 짧은 숏컷
- C Length (15cm): 입술선 - 숏밥, 턱선 위
- D Length (25cm): 턱선 - 단발, 보브컷 ⭐ 기준점
- E Length (35cm): 어깨선 - 미디엄, 어깨에 닿는 길이
- F Length (40cm): 쇄골 - 미디엄롱, 가슴 위
- G Length (50cm): 가슴 중간 - 롱헤어
- H Length (65cm): 가슴 아래 - 허리까지 오는 긴 머리

### 분석 순서:
1. 뒷머리 가장 긴 부분이 어디까지 닿는지 확인
2. 신체 랜드마크(턱, 어깨, 쇄골)와 비교
3. 턱선 = D Length, 어깨선 = E Length 기준

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

## LENGTH CLASSIFICATION EXAMPLES (FOLLOW EXACTLY):

Example 1: Hair ends at mid-chest, covers the bra line area
→ Correct: "B Length"  ❌ Wrong: "D Length"

Example 2: Hair ends at armpit level
→ Correct: "C Length"

Example 3: Hair ends below shoulder but above armpit (collarbone area)
→ Correct: "D Length"

Example 4: Hair ends at shoulder line
→ Correct: "E Length"

## LENGTH DEFINITION:
- B Length = MID-CHEST (가슴 중간, 브라라인) = LONG HAIR
- D Length = BELOW SHOULDER, ABOVE ARMPIT = MEDIUM-LONG (NOT chest level!)

If you see long hair reaching the chest area, output "B Length".

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

    console.log('✅ Gemini 2.0 Flash Vision 분석 완료 (56개 파라미터)');

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
- FAL: 숏 (A Length)
- FBL: 미디엄 숏 (B Length)
- FCL: 미디엄 (C Length)
- FDL: 미디엄 롱 (D Length)
- FEL: 롱 (E Length)
- FFL: 세미롱 (F Length)
- FGL: 롱 (G Length)
- FHL: 엑스트라 롱 (H Length)

■ 길이(Length) 체계
- A Length: 5cm, 이마선 (가장 짧음) → FAL 시리즈
- B Length: 10cm, 눈썹선
- C Length: 15cm, 입술선
- D Length: 25cm, 턱선
- E Length: 35cm, 어깨선
- F Length: 40cm, 쇄골
- G Length: 50cm, 가슴 중간
- H Length: 65cm, 가슴 아래 (가장 김)

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
            maxOutputTokens: 2048,
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
  const { user_query } = payload;
  const userLanguage = detectLanguage(user_query);

  console.log(`🔍 Gemini File Search 스트리밍: "${user_query}"`);
  console.log(`🔑 Gemini Key 앞 15자: ${geminiKey ? geminiKey.substring(0, 15) : 'MISSING'}...`);

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
    // Gemini File Search API 호출 (비스트리밍으로 전체 받아서 SSE로 변환)
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
            maxOutputTokens: 2048,
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

    // SSE 형식으로 변환 (청크 단위로 전송)
    let sseBuffer = '';
    const chunkSize = 50; // 50자씩 청크

    for (let i = 0; i < answer.length; i += chunkSize) {
      const chunk = answer.substring(i, i + chunkSize);
      sseBuffer += `data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`;
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

        // 도해도 배열 추출
        let diagrams = [];
        if (fields.diagrams && fields.diagrams.arrayValue && fields.diagrams.arrayValue.values) {
          diagrams = fields.diagrams.arrayValue.values.map(v => {
            const mapValue = v.mapValue?.fields || {};
            return {
              step: parseInt(mapValue.step?.integerValue || 0),
              url: mapValue.url?.stringValue || ''
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
 * Gemini Vision으로 이미지 분석 - 56개 파라미터 + 42포뮬러 기반 추출
 */
async function analyzeImageStructured(imageBase64, mimeType, geminiKey) {
  const systemPrompt = `당신은 "HAIRGATOR AI", 20년 경력의 2WAY CUT 시스템 전문가입니다.
이미지 속 헤어스타일을 **56개 파라미터**로 분석하여 JSON 형식으로 출력하세요.

【LENGTH 분류 - Body Landmark 기반】⭐⭐⭐ 가장 중요!

**신체 부위(Body Landmark)를 기준으로 가장 긴 머리카락 끝이 어디에 닿는지 판단:**

| 코드 | 신체 기준점 | 설명 |
|-----|-----------|------|
| H | 목덜미/후두부(NAPE) | Short - 픽시컷, 베리숏 |
| G | 목 아래(BASE OF NECK) | Bob 상단 - 짧은 단발 |
| F | 목~어깨 사이(NECK TO SHOULDER) | Bob 하단 - 어깨 안 닿음 |
| E | 어깨선(SHOULDER LINE) | Medium - 어깨에 닿음 |
| D | 어깨 아래~겨드랑이 위(BELOW SHOULDER) | Medium - 쇄골 덮음 |
| C | 겨드랑이선(ARMPIT LEVEL) | Semi Long |
| B | 가슴 중간/브라라인(MID-CHEST) | Long - 가슴 중간 ⭐ |
| A | 가슴 아래~허리(BELOW CHEST) | Very Long |

🚨🚨🚨 B Length vs D Length 구분 (매우 중요!) 🚨🚨🚨

❌ 흔한 오류: 가슴까지 오는 긴 머리를 D Length로 분류
✅ 올바른 분류:
- 머리가 가슴(CHEST/브라라인)까지 옴 → B Length!
- 머리가 어깨 아래~겨드랑이 위 → D Length

**체크리스트:**
Q1. 머리카락이 가슴(브라라인) 높이까지 오는가?
- YES → B Length (절대 D가 아님!)
- NO → 다음 체크

Q2. 머리카락이 겨드랑이 높이인가?
- YES → C Length

Q3. 머리카락이 어깨 아래~겨드랑이 위인가?
- YES → D Length

Q4. 머리카락이 어깨선에 닿는가?
- YES → E Length

🔍 현재 이미지 체크 포인트:
- 목이 보이는가? (예 = F 또는 G일 가능성 높음)
- 머리가 쇄골을 넘어가는가? (아니오 = D Length 아님!)
- 어깨에 머리가 닿는가? (닿으면 E, 안 닿으면 F)

❌ 흔한 실수:
- 귀 높이 숏컷을 E로 분류 (틀림! → H가 정답)
- 턱선 보브를 E로 분류 (틀림! → G가 정답)
- 목이 보이는 짧은 머리를 E, F로 분류 (틀림! → G 또는 H)
- 어깨에 닿지 않는 보브를 E로 분류 (틀림! → F가 정답)

【CUT FORM】
- L (Layer): 90도 이상 리프팅, 전체적으로 가벼움, 층 많음
- G (Graduation): 45~89도, 하단에 무게감, 층 적음
- O (One Length): 0도, 일자 무게선, 층 없음

【LIFTING RANGE】⭐ 핵심 파라미터!
리프팅 각도를 배열로 반환:
- ["L0"]: 0도 (원렝스, 무게선 명확)
- ["L1"]: 22.5도 (Low Graduation)
- ["L2"]: 45도 (Mid Graduation)
- ["L3"]: 67.5도 (High Graduation)
- ["L4"]: 90도 (기본 Layer)
- ["L5"]: 112.5도 (Mid-High Layer)
- ["L6"]: 135도 (High Layer)
- ["L7"]: 157.5도 (Very High Layer)
- ["L8"]: 180도 (Extreme Layer)

🎯 판단 기준 (무게감 기반):
- 뒷머리가 뾰족하게 들어올려짐, 매우 가벼움 → L6~L8 (High Layer)
- 층이 많지만 전체적으로 가벼움 → L4~L5 (Mid Layer)
- **층이 있지만 무게감 유지** → L2~L3 (Low Layer/Graduation) ⭐
- 무게선이 일자로 명확함 → L0~L1 (One Length)

⚠️ 무게감 있는 레이어 (Low Layer) 판별:
- 하단에 무게감이 있으면서 층이 살짝 → **L2 (45°) ~ L3 (67.5°)**
- 끝이 무겁게 떨어지는 스타일 → L4(90°)가 아닌 **L2~L3**!
- 윈드컷, 허쉬컷 같은 차분한 레이어 → **L2~L3 권장**

❌ 흔한 오류:
- 무게감 있는 미디엄 레이어를 모두 L4(90°)로 분류 (틀림!)
- 차분하게 흘러내리는 스타일을 High Layer로 분류 (틀림!)

【SECTION PRIMARY - 존별 적용】⭐⭐ 중요!
섹션은 **존(Zone)별로 다르게 적용**됩니다:

| 존 | 권장 섹션 | 설명 |
|-----|---------|------|
| Back | DBS (Diagonal-Backward) | 볼륨 형성, 층 형성 |
| Side | VS (Vertical) | 얼굴 라인 유지, A라인 형성 |
| Top | DBS or VS | 볼륨에 따라 선택 |
| Fringe | HS (Horizontal) | 앞머리 라인 정리 |

- Horizontal: 가로 섹션 (원렝스/그래쥬에이션 기본)
- Diagonal-Backward: 후대각 (뒤로 흐르는 층, **Back 존에 적합**)
- Diagonal-Forward: 전대각 (앞으로 흐르는 층)
- Vertical: 세로 섹션 (레이어 기본, **Side 존에 적합**)

⚠️ 섹션 선택 규칙:
- Back → DBS (볼륨과 층)
- Side → **VS 권장** (얼굴 라인 유지, DBS는 과도하게 가벼워짐)
- Top → 볼륨 원하면 DBS, 자연스러우면 VS

【VOLUME ZONE】
- Low: 하단 볼륨 (0~44도, 무게감 있는 스타일)
- Medium: 중단 볼륨 (45~89도)
- High: 상단 볼륨 (90도 이상, 가볍고 풍성)

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
  "length_category": "A~H 중 이미지에 맞는 것 (가슴=B, 어깨아래=D, 어깨=E)",
  "estimated_hair_length_cm": "숫자",
  "front_length": "Very Short/Short/Medium/Long/Very Long 중 선택",
  "back_length": "Very Short/Short/Medium/Long/Very Long 중 선택",
  "cut_form": "O (One Length) 또는 G (Graduation) 또는 L (Layer)",
  "structure_layer": "No Layer/Low Layer/Mid Layer/High Layer 중 선택",
  "graduation_type": "None/Low/Medium/High 중 선택",
  "weight_distribution": "Top Heavy/Balanced/Bottom Heavy 중 선택",
  "layer_type": "No Layer/Low Layer/Mid Layer/High Layer 중 선택",
  "silhouette": "Round/Oval/Square/A-line/V-line 중 선택",
  "outline_shape": "Round/Square/Curved/Asymmetric/Pointed 중 선택",
  "volume_zone": "Low/Medium/High 중 선택",
  "volume_distribution": "Top/Middle/Bottom/All Over 중 선택",
  "line_quality": "Soft/Hard/Mixed 중 선택",
  "fringe_type": "Full Bang/See-through Bang/Side Bang/Curtain Bang/No Fringe 중 선택",
  "fringe_length": "Forehead/Eyebrow/Eye/Cheekbone/Chin/Ear/None 중 선택",
  "fringe_texture": "Blunt/Textured/Wispy/None 중 선택",
  "surface_texture": "Smooth/Textured/Layered 중 선택",
  "hair_density": "Thin/Medium/Thick 중 선택",
  "hair_texture": "Straight/Wavy/Curly 중 선택",
  "movement": "None/Minimal/Moderate/Maximum 중 선택",
  "texture_technique": "Blunt Cut/Point Cut/Slide Cut/Razor Cut/None 중 선택",
  "section_primary": "Horizontal/Vertical/Diagonal-Forward/Diagonal-Backward 또는 혼합(예: Vertical+Horizontal)",
  "section_by_zone": {"back": "섹션", "side": "섹션", "top": "섹션", "fringe": "섹션"} (존별 섹션 - 선택사항),
  "lifting_range": ["L0"~"L8" 중 해당하는 것들을 배열로"],
  "direction_primary": "D0~D8 중 선택",
  "cutting_method": "Blunt/Point Cut/Slide Cut/Razor 중 선택",
  "cutting_zone": "Crown/Top/Side/Back/Nape/Fringe/Perimeter 중 선택",
  "guide_type": "Stationary/Traveling 중 선택",
  "over_direction": true 또는 false,
  "connection_type": "Connected/Disconnected/Semi-Connected 중 선택",
  "styling_method": "Blow Dry/Air Dry/Iron/Curling 중 선택",
  "design_emphasis": "Volume/Texture/Shape/Movement 중 선택",
  "face_shape_match": ["어울리는 얼굴형 배열"],
  "perm_applied": true 또는 false (이미지에 펌이 있으면 true),
  "perm_type": "펌 종류 또는 null",
  "perm_rod_size": "롯드 사이즈 또는 null",
  "perm_technique": "펌 기법 또는 null",
  "curl_pattern": "컬 패턴 또는 null",
  "curl_strength": "컬 강도 또는 null",
  "curl_direction": "컬 방향 또는 null",
  "wave_type": "웨이브 타입 또는 null",
  "color_applied": true 또는 false (염색이 있으면 true),
  "base_color": "베이스 컬러 또는 null",
  "color_level": 1-10 또는 null,
  "color_tone": "톤 또는 null",
  "highlight_applied": true 또는 false,
  "highlight_color": "하이라이트 컬러 또는 null",
  "highlight_technique": "하이라이트 기법 또는 null",
  "lowlight_applied": true 또는 false,
  "lowlight_color": "로우라이트 컬러 또는 null",
  "balayage_applied": true 또는 false,
  "ombre_applied": true 또는 false,
  "color_placement": "컬러 배치 또는 null",
  "description": "이 스타일에 대한 1-2문장 설명"
}

⚠️ 필수 규칙:
1. lifting_range는 반드시 배열! ["L2"] 또는 ["L2", "L4"]
2. cut_form은 괄호 포함! "L (Layer)" 형식
3. length_category: 가슴까지=B, 겨드랑이=C, 어깨아래=D, 어깨=E
4. 모든 값은 이미지를 보고 판단! 예시를 그대로 복사하지 마세요!

JSON만 반환하세요.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
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

    console.log(`📷 56개 파라미터 분석 완료:`, {
      length: params56.length_category,
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
    // 기본값 반환 (56개 파라미터 전체)
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
 * 56파라미터 기반 정확한 L/D/Section 매칭으로 도해도 선별
 * Firestore에 저장된 도해도 메타데이터(lifting, direction, section)를 사용
 * @param {Array} top3Styles - 42포뮬러 기반 Top-3 스타일 (diagrams에 메타데이터 포함)
 * @param {Object} params56 - 56파라미터 분석 결과
 * @param {number} maxDiagrams - 최대 도해도 수
 * @returns {Array} 기술 매칭 점수 순으로 정렬된 도해도 배열
 */
function selectDiagramsByTechnique(top3Styles, params56, maxDiagrams = 20) {
  // 타겟 파라미터 추출
  const targetLiftingRange = params56.lifting_range || ['L4'];
  const targetSection = params56.section_primary || 'Diagonal-Backward';
  const targetDirection = params56.direction_primary || 'D4';
  const targetVolume = params56.volume_zone || 'Medium';
  const targetZone = params56.cutting_zone || 'Back';

  // Section 영문 → 약어 매핑
  const sectionToCode = {
    'Horizontal': 'HS',
    'Diagonal-Backward': 'DBS',
    'Diagonal-Forward': 'DFS',
    'Vertical': 'VS',
    'Radial': 'RS'
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

  // Zone 매핑
  const zoneMapping = {
    'Crown': ['Crown', 'Top'],
    'Top': ['Top', 'Crown'],
    'Side': ['Side'],
    'Back': ['Back', 'Nape'],
    'Nape': ['Nape', 'Back'],
    'Fringe': ['Fringe', 'Perimeter']
  };
  const targetZones = zoneMapping[targetZone] || [targetZone];

  const scoredDiagrams = [];

  console.log(`🎯 도해도 매칭 타겟: L=[${targetLiftingRange.join(',')}], D=${targetDirectionCode}, S=${targetSectionCode}, Zone=${targetZone}`);

  top3Styles.forEach((style, styleRank) => {
    style.diagrams.forEach((diagram, idx) => {
      const stepNumber = diagram.step || (idx + 1);
      let techScore = 0;
      const matchedFeatures = [];

      // 도해도 메타데이터 추출 (Firestore에서 분석된 값)
      const diagLifting = diagram.lifting || null;       // "L4"
      const diagDirection = diagram.direction || null;   // "D4"
      const diagSection = diagram.section || null;       // "VS"
      const diagZone = diagram.zone || null;             // "Back"
      const diagCuttingMethod = diagram.cutting_method || null;

      // ⭐⭐⭐ 1. LIFTING 정확 매칭 (50점) - 가장 중요!
      if (diagLifting) {
        // 정확히 일치하는 경우
        if (targetLiftingRange.includes(diagLifting)) {
          techScore += 50;
          matchedFeatures.push(`L:${diagLifting}✓`);
        } else {
          // 근접 매칭 (1단계 차이)
          const liftingNum = parseInt(diagLifting.replace('L', ''));
          const isClose = targetLiftingRange.some(target => {
            const targetNum = parseInt(target.replace('L', ''));
            return Math.abs(liftingNum - targetNum) === 1;
          });
          if (isClose) {
            techScore += 25;
            matchedFeatures.push(`L:${diagLifting}~`);
          }
        }
      }

      // ⭐⭐ 2. DIRECTION 정확 매칭 (35점)
      if (diagDirection) {
        if (diagDirection === targetDirectionCode) {
          techScore += 35;
          matchedFeatures.push(`D:${diagDirection}✓`);
        } else {
          // 근접 매칭 (1단계 차이)
          const dirNum = parseInt(diagDirection.replace('D', ''));
          const targetNum = parseInt(targetDirectionCode.replace('D', ''));
          if (Math.abs(dirNum - targetNum) === 1) {
            techScore += 17;
            matchedFeatures.push(`D:${diagDirection}~`);
          }
        }
      }

      // ⭐ 3. SECTION 정확 매칭 (25점)
      if (diagSection) {
        if (diagSection === targetSectionCode) {
          techScore += 25;
          matchedFeatures.push(`S:${diagSection}✓`);
        } else {
          // 관련 섹션 부분 점수
          const relatedSections = {
            'DBS': ['VS', 'HS'],
            'DFS': ['VS', 'HS'],
            'VS': ['DBS', 'DFS'],
            'HS': ['DBS', 'DFS'],
            'RS': ['VS', 'HS']
          };
          if (relatedSections[targetSectionCode]?.includes(diagSection)) {
            techScore += 12;
            matchedFeatures.push(`S:${diagSection}~`);
          }
        }
      }

      // 4. ZONE 매칭 (15점)
      if (diagZone && targetZones.includes(diagZone)) {
        techScore += 15;
        matchedFeatures.push(`Zone:${diagZone}`);
      }

      // 5. 스타일 순위 보너스 (1등: 10점, 2등: 6점, 3등: 3점)
      techScore += Math.max(10 - styleRank * 4, 3);

      // 6. 핵심 스텝 보너스 (step 3~8 커팅 핵심 구간에 추가 점수)
      if (stepNumber >= 3 && stepNumber <= 8) {
        techScore += 5;
      }

      scoredDiagrams.push({
        styleId: style.styleId,
        step: stepNumber,
        url: diagram.url,
        techScore: techScore,
        matchedFeatures: matchedFeatures,
        styleRank: styleRank + 1,
        // 프론트엔드에서 표시할 메타데이터
        lifting: diagLifting,
        direction: diagDirection,
        section: diagSection,
        zone: diagZone,
        cuttingMethod: diagCuttingMethod
      });
    });
  });

  // 기술 점수로 먼저 필터링 (상위 도해도 선별)
  scoredDiagrams.sort((a, b) => b.techScore - a.techScore);
  const topScored = scoredDiagrams.slice(0, maxDiagrams);

  // 선별된 도해도를 커트 순서(step)대로 정렬
  const selected = topScored.sort((a, b) => {
    // 같은 스타일이면 step 순서로
    if (a.styleId === b.styleId) return a.step - b.step;
    // 다른 스타일이면 step 순서로 (커트 진행 순서)
    return a.step - b.step;
  });

  console.log(`📊 56파라미터 기반 도해도 선별 (${selected.length}장):`);
  selected.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.styleId} step${d.step} (${d.techScore}점) - ${d.matchedFeatures.join(', ') || '기본매칭'}`);
  });

  return selected;
}

/**
 * 특성 기반 스타일 점수 계산 - 42포뮬러 기반 (8가지 기준, 150점 만점)
 */
function calculateFeatureScore(style, params56, captionText) {
  let score = 0;
  const reasons = [];

  if (!captionText) return { score: 0, reasons: ['자막 없음'] };

  const caption = captionText.toLowerCase();

  // ⭐⭐⭐ 1. CUT FORM 매칭 (35점) - 가장 중요!
  if (params56.cut_form) {
    const form = params56.cut_form.charAt(0); // "L", "G", "O"

    if (form === 'L' && (caption.includes('레이어') || caption.includes('layer'))) {
      score += 35;
      reasons.push('Layer 매칭');
    } else if (form === 'G' && (caption.includes('그래쥬에이션') || caption.includes('graduation') || caption.includes('그라데이션'))) {
      score += 35;
      reasons.push('Graduation 매칭');
    } else if (form === 'O' && (caption.includes('원렝스') || caption.includes('one length') || caption.includes('일자'))) {
      score += 35;
      reasons.push('One Length 매칭');
    }
  }

  // ⭐⭐ 2. LIFTING RANGE 매칭 (30점)
  if (params56.lifting_range && Array.isArray(params56.lifting_range)) {
    const liftingCodes = params56.lifting_range.join(' '); // "L2 L4"

    // 높은 각도 (L5~L8) - High Layer
    if (/L[5-8]/.test(liftingCodes)) {
      if (caption.includes('하이레이어') || caption.includes('high layer') || caption.includes('하이 레이어') ||
          caption.includes('135') || caption.includes('157') || caption.includes('180')) {
        score += 30;
        reasons.push('High Lifting (L5-L8)');
      } else if (caption.includes('레이어') || caption.includes('layer')) {
        score += 15; // 부분 점수
        reasons.push('Layer (부분매칭)');
      }
    }
    // 중간 각도 (L3~L4) - Mid Layer
    else if (/L[3-4]/.test(liftingCodes)) {
      if (caption.includes('미들레이어') || caption.includes('mid layer') || caption.includes('미드레이어') ||
          caption.includes('90도') || caption.includes('90°')) {
        score += 30;
        reasons.push('Mid Lifting (L3-L4)');
      } else if (caption.includes('레이어') || caption.includes('layer')) {
        score += 20; // 부분 점수
        reasons.push('Layer (부분매칭)');
      }
    }
    // 낮은 각도 (L1~L2) - Graduation
    else if (/L[1-2]/.test(liftingCodes)) {
      if (caption.includes('로우') || caption.includes('low') || caption.includes('그래쥬') ||
          caption.includes('45도') || caption.includes('45°')) {
        score += 30;
        reasons.push('Low Lifting (L1-L2)');
      } else if (caption.includes('무게') || caption.includes('weight')) {
        score += 15;
        reasons.push('무게감 (부분매칭)');
      }
    }
    // 0도 (L0) - One Length
    else if (/L0/.test(liftingCodes)) {
      if (caption.includes('원렝스') || caption.includes('one length') || caption.includes('0도') ||
          caption.includes('일자')) {
        score += 30;
        reasons.push('Zero Lifting (L0)');
      }
    }
  }

  // ⭐ 3. VOLUME ZONE 매칭 (20점)
  if (params56.volume_zone) {
    if (params56.volume_zone === 'High') {
      if (caption.includes('정수리') || caption.includes('상단') || caption.includes('top') ||
          caption.includes('crown') || caption.includes('볼륨')) {
        score += 20;
        reasons.push('High Volume');
      }
    } else if (params56.volume_zone === 'Low') {
      if (caption.includes('하단') || caption.includes('무게') || caption.includes('bottom') ||
          caption.includes('weight') || caption.includes('네이프')) {
        score += 20;
        reasons.push('Low Volume');
      }
    } else if (params56.volume_zone === 'Medium') {
      if (caption.includes('중단') || caption.includes('middle') || caption.includes('균형')) {
        score += 15;
        reasons.push('Medium Volume');
      } else {
        score += 10; // 중간값은 기본 점수
        reasons.push('Balanced');
      }
    }
  }

  // 4. SECTION 매칭 (15점)
  if (params56.section_primary) {
    const sectionMap = {
      'Horizontal': ['가로', 'horizontal', 'hs', '수평'],
      'Diagonal-Backward': ['후대각', 'diagonal back', 'dbs', '뒤쪽'],
      'Diagonal-Forward': ['전대각', 'diagonal forward', 'dfs', '앞쪽'],
      'Vertical': ['세로', 'vertical', 'vs', '수직']
    };

    const keywords = sectionMap[params56.section_primary] || [];
    if (keywords.some(kw => caption.includes(kw))) {
      score += 15;
      reasons.push(`${params56.section_primary} Section`);
    }
  }

  // 5. WEIGHT DISTRIBUTION 매칭 (15점)
  if (params56.weight_distribution) {
    if (params56.weight_distribution === 'Bottom Heavy') {
      if (caption.includes('하단') || caption.includes('무게감') || caption.includes('bottom') ||
          caption.includes('heavy')) {
        score += 15;
        reasons.push('Bottom Heavy');
      }
    } else if (params56.weight_distribution === 'Top Heavy') {
      if (caption.includes('상단') || caption.includes('볼륨') || caption.includes('top') ||
          caption.includes('가벼')) {
        score += 15;
        reasons.push('Top Heavy');
      }
    } else if (params56.weight_distribution === 'Balanced') {
      score += 10; // 균형은 기본 점수
      reasons.push('Balanced Weight');
    }
  }

  // 6. CONNECTION TYPE 매칭 (10점)
  if (params56.connection_type) {
    if (params56.connection_type === 'Disconnected') {
      if (caption.includes('단절') || caption.includes('disconnect') || caption.includes('투블록') ||
          caption.includes('언더컷')) {
        score += 10;
        reasons.push('Disconnected');
      }
    } else if (params56.connection_type === 'Connected') {
      if (caption.includes('연결') || caption.includes('connect') || caption.includes('자연스러')) {
        score += 10;
        reasons.push('Connected');
      } else {
        score += 5; // 기본 점수
      }
    }
  }

  // 7. FRINGE (앞머리) 매칭 (15점)
  if (params56.fringe_type) {
    const hasFringe = params56.fringe_type !== 'No Fringe';
    const captionHasFringe = caption.includes('앞머리') || caption.includes('뱅') || caption.includes('bang') || caption.includes('fringe');

    if (hasFringe && captionHasFringe) {
      score += 15;
      reasons.push('Fringe 있음');

      // 앞머리 타입 세부 매칭 (보너스 5점)
      if (params56.fringe_type === 'Full Bang' && (caption.includes('풀뱅') || caption.includes('full'))) {
        score += 5;
        reasons.push('Full Bang');
      } else if (params56.fringe_type === 'See-through Bang' && (caption.includes('시스루') || caption.includes('see-through'))) {
        score += 5;
        reasons.push('See-through Bang');
      } else if (params56.fringe_type === 'Side Bang' && (caption.includes('사이드') || caption.includes('side'))) {
        score += 5;
        reasons.push('Side Bang');
      }
    } else if (!hasFringe && !captionHasFringe) {
      score += 10;
      reasons.push('No Fringe');
    }
  }

  // 8. TEXTURE 매칭 (10점)
  if (params56.hair_texture) {
    const textureMap = {
      'Wavy': ['웨이브', 'wave', '웨이비'],
      'Curly': ['컬', 'curl', '곱슬'],
      'Straight': ['스트레이트', 'straight', '생머리', '직모']
    };

    const keywords = textureMap[params56.hair_texture] || [];
    if (keywords.some(kw => caption.includes(kw))) {
      score += 10;
      reasons.push(`${params56.hair_texture} Texture`);
    }
  }

  return { score, reasons };
}

/**
 * Gemini로 맞춤 레시피 생성 - 56파라미터 + 42포뮬러 기반 + abcde 북 참조
 */
async function generateCustomRecipe(params56, top3Styles, geminiKey) {
  try {
    // Top-3 스타일의 레시피 텍스트 준비
    const recipeTexts = top3Styles.map((s, i) =>
      `[참고 스타일 ${i+1}: ${s.styleId}]\n${s.captionText || '레시피 없음'}`
    ).join('\n\n');

    // 42포뮬러 핵심 파라미터 추출
    const liftingStr = Array.isArray(params56.lifting_range) ? params56.lifting_range.join(', ') : 'L4';

    console.log('📚 abcde 북 참조하여 레시피 생성 중...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `당신은 2WAY CUT 시스템 전문가입니다. 고객 요청 스타일의 56개 파라미터와 참고 레시피 3개를 바탕으로 최적의 맞춤 레시피를 생성해주세요.

⭐ 중요: 업로드된 2WAY CUT 교재(abcde 북)의 이론과 기법을 참고하여 레시피를 작성하세요.

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

## 📚 참고 레시피 (Top-3)
${recipeTexts}

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
위 분석 파라미터와 참고 레시피들의 장점을 조합하여, 고객 요청 스타일에 최적화된 커스텀 레시피를 작성해주세요.

⚠️ **반드시 준수할 규칙:**
1. Outline Shape 규칙 (여성 레이어 = Round/Curved)
2. Fringe Length 규칙 (사이드 길이 명시)
3. **존별 Section/Lifting/Direction 규칙** (L4+DBS 남발 금지!)

## 📚 초보자 친화적 설명 규칙 (매우 중요!)
**모든 전문용어 뒤에는 💡로 시작하는 쉬운 설명을 추가하세요!**

예시 형식:
- Section: DBS (Diagonal-Backward Section)
  💡 머리를 대각선 뒤쪽 방향으로 나눠서 잡는 방식이에요
- Lifting: L3 (67.5°)
  💡 머리카락을 약 70도 각도로 들어올려요. 손가락 두 마디 정도 두피에서 띄우면 대략 이 각도예요
- Direction: D8 (Over-direction)
  💡 모발을 뒤쪽으로 당겨서 자르면, 놓았을 때 앞쪽이 더 길어져서 얼굴을 감싸는 효과가 나요

**💡 설명은 반드시 다음 줄에 작성하고, 초보자도 바로 이해할 수 있게 일상적인 말로 풀어주세요!**

다음 형식으로 작성:

### 1. 스타일 개요
완성될 스타일 설명 (2-3문장)

### 2. 스타일 요약
- Length: ${params56.length_category}
- Cut Form: ${params56.cut_form}
- Outline: ${params56.outline_shape || 'Round'}
- Weight: ${params56.weight_distribution}

### 3. 커트 순서 (존별 Section/Lifting/Direction 명시!)
각 Step마다 전문용어와 함께 💡 초보자 설명을 꼭 넣어주세요!

- **Step 1: Back 존** - Section, Lifting, Direction + 💡설명
- **Step 2: Side 존** - Section, Lifting, Direction + 💡설명
- **Step 3: Top 존** - Section, Lifting, Direction + 💡설명
- **Step 4: Fringe** - Section, 길이/스타일 + 💡설명
- **Step 5: Outline & Texture** - 마무리 기법 + 💡설명

### 4. 핵심 포인트 (3가지)
1. ...
2. ...
3. ...

### 5. 스타일링 팁
드라이/아이론/제품 등 마무리 방법 (💡 쉬운 설명 포함)`
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
 * 56파라미터 + 42포뮬러 기반
 */
async function analyzeAndMatchRecipe(payload, geminiKey) {
  const { image_base64, mime_type, gender } = payload;
  const startTime = Date.now();

  console.log(`🎯 이미지 분석 + 맞춤 레시피 생성 시작 (성별: ${gender || 'female'})...`);

  // 남자 스타일인 경우 별도 처리
  if (gender === 'male') {
    return await analyzeAndMatchMaleRecipe(payload, geminiKey);
  }

  // 여자 스타일 기본 처리 (기존 로직)
  try {
    // 1. 이미지 분석 - 56개 파라미터 추출
    const t1 = Date.now();
    const params56 = await analyzeImageStructured(image_base64, mime_type, geminiKey);
    console.log(`⏱️ [1] 이미지 분석: ${Date.now() - t1}ms`);

    // Length 코드 추출 (예: "D Length" → "D")
    const lengthCode = params56.length_category ? params56.length_category.charAt(0) : 'D';

    console.log(`📊 56파라미터 분석 완료:`);
    console.log(`   - Length: ${params56.length_category}`);
    console.log(`   - Cut Form: ${params56.cut_form}`);
    console.log(`   - Lifting: ${Array.isArray(params56.lifting_range) ? params56.lifting_range.join(', ') : params56.lifting_range}`);
    console.log(`   - Section: ${params56.section_primary}${params56.section_by_zone ? ` (존별: Back=${params56.section_by_zone.back || '-'}, Side=${params56.section_by_zone.side || '-'})` : ''}`);
    console.log(`   - Volume: ${params56.volume_zone}`);
    console.log(`   - Weight: ${params56.weight_distribution}`);
    console.log(`   - Fringe: ${params56.fringe_type || 'No Fringe'} (${params56.fringe_length || 'N/A'})`);
    console.log(`   - Outline: ${params56.outline_shape || 'N/A'}`);
    console.log(`   - Texture: ${params56.hair_texture || 'N/A'}`);
    console.log(`   - Silhouette: ${params56.silhouette || 'N/A'}`);

    // 2. 기장에 해당하는 시리즈 결정
    const targetSeries = LENGTH_TO_SERIES[lengthCode] || 'FDL';
    console.log(`📁 대상 시리즈: ${targetSeries}`);

    // 3. Firestore에서 해당 시리즈 스타일만 필터링
    const t2 = Date.now();
    const allStyles = await getFirestoreStyles();
    const seriesStyles = allStyles.filter(s => s.series === targetSeries);
    console.log(`⏱️ [2] Firestore 조회: ${Date.now() - t2}ms`);

    console.log(`📚 ${targetSeries} 시리즈: ${seriesStyles.length}개 스타일`);

    if (seriesStyles.length === 0) {
      throw new Error(`${targetSeries} 시리즈 스타일이 없습니다`);
    }

    // ⚡ 최적화: 임베딩을 루프 밖에서 1번만 생성 (기존: N번 호출 → 1번으로 감소)
    const t3 = Date.now();
    let queryEmbedding = null;
    if (params56.description) {
      queryEmbedding = await generateQueryEmbedding(params56.description, geminiKey);
      console.log(`⏱️ [3] 임베딩 생성: ${Date.now() - t3}ms`);
    }

    // 4. 1차 필터링: 자막 없이 특성 점수 + 임베딩 유사도 계산 (빠름)
    const stylesWithQuickScore = seriesStyles.map(style => {
      // 자막 없이도 계산 가능한 특성 점수 (메타데이터 기반)
      const { score, reasons } = calculateFeatureScore(style, params56, '');

      // 임베딩 유사도 (사전 계산된 queryEmbedding 사용)
      let embeddingSimilarity = 0;
      if (style.embedding && queryEmbedding) {
        embeddingSimilarity = cosineSimilarity(queryEmbedding, style.embedding);
      }

      return {
        ...style,
        featureScore: score,
        featureReasons: reasons,
        embeddingSimilarity,
        quickScore: score + (embeddingSimilarity * 30)
      };
    });

    // ⚡ 최적화: 상위 5개만 자막 fetch (기존: 모든 스타일 → 5개로 감소)
    const topCandidates = stylesWithQuickScore
      .sort((a, b) => b.quickScore - a.quickScore)
      .slice(0, 5);

    // 5. 상위 후보만 자막 가져와서 최종 점수 계산
    const stylesWithScores = await Promise.all(
      topCandidates.map(async (style) => {
        const captionText = await fetchCaptionContent(style.captionUrl);

        // 자막이 있으면 점수 재계산 (더 정확)
        const { score, reasons } = calculateFeatureScore(style, params56, captionText || '');

        return {
          ...style,
          captionText,
          featureScore: score,
          featureReasons: reasons,
          totalScore: score + (style.embeddingSimilarity * 30)
        };
      })
    );

    // 6. 총점 기준 Top-3 선정
    const top3 = stylesWithScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    console.log(`🎯 Top-3 참고 스타일 (42포뮬러 기반):`);
    top3.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.styleId} (${s.totalScore.toFixed(1)}점) - ${s.featureReasons.join(', ')}`);
    });

    // 7. Top-3를 참고하여 맞춤 레시피 생성 (56파라미터 전달)
    const t4 = Date.now();
    const customRecipe = await generateCustomRecipe(params56, top3, geminiKey);
    console.log(`⏱️ [4] 레시피 생성: ${Date.now() - t4}ms`);

    // 8. 기술 기반 도해도 선별 (lifting/section/volume 키워드 매칭)
    const selectedDiagrams = selectDiagramsByTechnique(top3, params56, 15);

    console.log(`⏱️ 총 처리 시간: ${Date.now() - startTime}ms`);

    // 9. 결과 구성 - 56파라미터 전체 포함
    const result = {
      // 56개 파라미터 전체 (프론트엔드에서 활용 가능)
      params56: params56,

      // 분석 요약 (UI 표시용)
      analysis: {
        length: lengthCode,
        lengthName: params56.length_category || `${lengthCode} Length`,
        form: params56.cut_form || 'L (Layer)',
        hasBangs: params56.fringe_type !== 'No Fringe',
        bangsType: params56.fringe_type || 'No Fringe',
        volumePosition: params56.volume_zone || 'Medium',
        silhouette: params56.silhouette || 'Round',
        texture: params56.hair_texture || 'Straight',
        layerLevel: params56.layer_type || 'Mid Layer',
        description: params56.description || '',
        // 42포뮬러 핵심
        liftingRange: params56.lifting_range || ['L4'],
        sectionPrimary: params56.section_primary || 'Diagonal-Backward',
        weightDistribution: params56.weight_distribution || 'Balanced',
        connectionType: params56.connection_type || 'Connected'
      },

      // 대상 시리즈
      targetSeries: {
        code: targetSeries,
        name: `${lengthCode} Length Series`,
        totalStyles: seriesStyles.length
      },

      // Top-3 참고 스타일
      referenceStyles: top3.map(s => ({
        styleId: s.styleId,
        series: s.series,
        totalScore: s.totalScore,
        featureReasons: s.featureReasons,
        diagrams: s.diagrams.slice(0, 5),
        diagramCount: s.diagramCount
      })),

      // 생성된 맞춤 레시피
      customRecipe: customRecipe,

      // 기술 기반 선별된 도해도 (lifting/section 매칭)
      mainDiagrams: selectedDiagrams.map(d => ({
        step: d.step,
        url: d.url,
        styleId: d.styleId,
        techScore: d.techScore,
        matchedFeatures: d.matchedFeatures
      }))
    };

    console.log(`✅ 맞춤 레시피 생성 완료 (56파라미터 + 42포뮬러 기반)`);

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

    // 4. 42포뮬러 기반 스코어링
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
 */
async function analyzeAndMatchMaleRecipe(payload, geminiKey) {
  const { image_base64, mime_type } = payload;
  const startTime = Date.now();

  console.log('👨 남자 이미지 분석 + 맞춤 레시피 생성 시작...');

  try {
    // 1. Gemini Vision으로 남자 스타일 분석
    const t1 = Date.now();
    const maleParams = await analyzeManImageVision(image_base64, mime_type, geminiKey);
    console.log(`⏱️ [1] 남자 이미지 분석: ${Date.now() - t1}ms`);

    const styleCode = maleParams.style_category || 'SF';
    const styleName = maleParams.style_name || 'Side Fringe';

    console.log(`📊 남자 스타일 분석 완료:`);
    console.log(`   - 스타일 코드: ${styleCode}`);
    console.log(`   - 스타일명: ${styleName}`);
    console.log(`   - Top 길이: ${maleParams.top_length || 'Medium'}`);
    console.log(`   - Side 길이: ${maleParams.side_length || 'Short'}`);
    console.log(`   - Fade: ${maleParams.fade_type || 'None'}`);
    console.log(`   - Texture: ${maleParams.texture || 'Smooth'}`);

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

      // 임베딩 추출
      let embedding = null;
      if (fields.embedding?.arrayValue?.values) {
        embedding = fields.embedding.arrayValue.values.map(v => parseFloat(v.doubleValue || 0));
      }

      // 도해도 추출
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
        embedding
      };
    });

    console.log(`⏱️ [2] Firestore men_styles 조회: ${Date.now() - t2}ms (${allMenStyles.length}개)`);

    // 3. 스타일 코드로 필터링
    const filteredStyles = allMenStyles.filter(s =>
      s.styleId.startsWith(styleCode) || s.series === styleCode
    );

    console.log(`🎯 ${styleCode} 스타일: ${filteredStyles.length}개`);

    // 필터 결과 없으면 전체에서 Top-3
    const targetStyles = filteredStyles.length > 0 ? filteredStyles : allMenStyles.slice(0, 10);

    // 4. 임베딩 기반 유사도 검색
    const t3 = Date.now();
    const searchQuery = `${styleName} ${maleParams.top_length || ''} ${maleParams.fade_type || ''} ${maleParams.texture || ''}`.trim();
    const queryEmbedding = await generateQueryEmbedding(searchQuery, geminiKey);
    console.log(`⏱️ [3] 임베딩 생성: ${Date.now() - t3}ms`);

    // 유사도 계산
    const stylesWithSimilarity = targetStyles.map(style => {
      let similarity = 0;
      if (style.embedding && queryEmbedding) {
        similarity = cosineSimilarity(queryEmbedding, style.embedding);
      }
      return { ...style, similarity };
    });

    // Top-3 선정
    const top3 = stylesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(`🎯 Top-3 참고 스타일:`);
    top3.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`);
    });

    // 5. 남자 레시피 생성 (GPT)
    const t4 = Date.now();
    const maleRecipe = await generateMaleCustomRecipe(maleParams, top3, geminiKey);
    console.log(`⏱️ [4] 레시피 생성: ${Date.now() - t4}ms`);

    // 6. 도해도 선별 (최대 15개)
    const selectedDiagrams = selectMaleDiagramsByTechnique(top3, maleParams, 15);

    console.log(`⏱️ 총 처리 시간: ${Date.now() - startTime}ms`);

    // 7. 결과 반환
    const subStyleName = maleParams.sub_style || MALE_STYLE_TERMS[styleCode]?.subStyles?.[0] || styleName;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          gender: 'male',
          analysis: {
            styleCode: styleCode,
            styleName: MALE_STYLE_TERMS[styleCode]?.ko || styleName,
            subStyle: subStyleName,
            topLength: maleParams.top_length || 'Medium',
            sideLength: maleParams.side_length || 'Short',
            fadeType: maleParams.fade_type || 'None',
            texture: maleParams.texture || 'Smooth',
            productType: maleParams.product_type || 'Wax',
            stylingDirection: maleParams.styling_direction || 'Forward'
          },
          targetSeries: {
            code: styleCode,
            name: MALE_STYLE_TERMS[styleCode]?.ko || styleName,
            subStyles: MALE_STYLE_TERMS[styleCode]?.subStyles || [],
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

    // 6. 도해도 선별
    const selectedDiagrams = selectDiagramsByTechnique(top3, params56, 15);

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

// 남자 스타일 용어 (PDF 기반 상세 분류)
const MALE_STYLE_TERMS = {
  'SF': {
    ko: '사이드 프린지',
    en: 'Side Fringe',
    subStyles: ['댄디컷', '시스루 댄디컷', '슬릭컷']
  },
  'SP': {
    ko: '사이드 파트',
    en: 'Side Part',
    subStyles: ['가일컷', '시스루 가일컷', '시스루 가르마컷', '플랫컷', '리프컷', '포마드컷', '드롭컷', '하프컷', '숏가일컷', '리젠트컷', '시스루 애즈컷']
  },
  'FU': {
    ko: '프린지 업',
    en: 'Fringe Up',
    subStyles: ['아이비리그컷', '크랙컷']
  },
  'PB': {
    ko: '푸시드 백',
    en: 'Pushed Back',
    subStyles: ['폼파도르컷', '슬릭백', '슬릭백 언더컷']
  },
  'BZ': {
    ko: '버즈 컷',
    en: 'Buzz Cut',
    subStyles: ['버즈컷']
  },
  'CP': {
    ko: '크롭 컷',
    en: 'Crop Cut',
    subStyles: ['크롭컷', '스왓컷']
  },
  'MC': {
    ko: '모히칸',
    en: 'Mohican',
    subStyles: ['모히칸컷']
  }
};

// 남자 이미지 Vision 분석
async function analyzeManImageVision(imageBase64, mimeType, geminiKey) {
  const prompt = `You are a professional men's hairstyle analyst. Analyze the image using cutting technique parameters.

## 스타일 카테고리 (Style Category)
| Code | Name | Feature |
|------|------|---------|
| SF | Side Fringe | 앞머리가 이마로 자연스럽게 내려옴 |
| SP | Side Part | 가르마를 기준으로 한쪽으로 넘김 |
| FU | Fringe Up | 앞머리 끝을 위로 올림 |
| PB | Pushed Back | 전체 모발을 뒤로 넘김 |
| BZ | Buzz Cut | 매우 짧은 버즈컷 |
| CP | Crop Cut | 짧은 크롭 스타일 |
| MC | Mohican | 센터를 세운 모히칸 |

## 커팅 파라미터 (42 Formula Based)

【CUT FORM】
- L (Layer): 층이 많고 가벼움, 텍스처 있음
- G (Graduation): 하단에 무게감, 층 적음
- O (One Length): 일자 무게선

【LIFTING RANGE】
- L0: 0° (원렝스)
- L1: 22.5° (Low Graduation)
- L2: 45° (Mid Graduation)
- L3: 67.5° (High Graduation)
- L4: 90° (기본 Layer)
- L5: 112.5° (Mid-High Layer)
- L6: 135° (High Layer)
- L7: 157.5° (Very High Layer)
- L8: 180° (Extreme Layer)

【SECTION】
- DBS: Diagonal-Backward Section (대각선 뒤)
- DFS: Diagonal-Forward Section (대각선 앞)
- VS: Vertical Section (수직)
- HS: Horizontal Section (수평)

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
  "lifting_range": ["L3", "L4"],
  "section_primary": "DBS|DFS|VS|HS",
  "direction_primary": "D4|D5|D6|D7|D8",
  "top_length": "Very Short|Short|Medium|Long",
  "side_length": "Skin|Very Short|Short|Medium",
  "fade_type": "None|Low Fade|Mid Fade|High Fade|Skin Fade|Taper",
  "texture": "Smooth|Textured|Messy|Spiky",
  "volume_zone": "High|Medium|Low",
  "weight_distribution": "Top Heavy|Balanced|Bottom Heavy",
  "connection_type": "Connected|Disconnected",
  "product_type": "Wax|Pomade|Clay|Gel",
  "styling_direction": "Forward|Backward|Side|Up"
}`;

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

  const systemPrompt = `당신은 남자 헤어컷 전문가입니다. 모든 응답을 한국어로만 작성하세요. 클리퍼 가드 사이즈, 페이드 기법 등 실무적인 내용을 포함하세요.${theoryContext ? ' 참고 이론의 내용을 레시피에 자연스럽게 반영하세요.' : ''}${captionContext ? ' 참고 스타일 레시피의 테크닉과 순서를 참고하세요.' : ''}`;

  // 42포뮬러 핵심 파라미터 추출
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

### STEP 1: 스타일 개요 (2-3줄)
- ${subStyleName} 스타일의 핵심 특징
- 이 스타일이 어울리는 고객 유형

### STEP 2: 사이드/백 커팅 (클리퍼 작업)
- 페이드 시작 위치와 높이
- 클리퍼 가드 사이즈 순서 (예: 0.5mm → 3mm → 6mm)
- 블렌딩 포인트
- **Section, Lifting 명시!**

### STEP 3: 탑/크라운 커팅 (가위 작업)
- 기준선 설정 (Guide Line)
- **Lifting 각도와 Section 타입 명시!**
- 텍스처 기법 (Point Cut, Slide Cut 등)

### STEP 4: 연결 작업 (블렌딩)
- 사이드와 탑 연결 부분 처리
- **Direction 명시!**
- 자연스러운 그라데이션 방법

### STEP 5: 마무리 & 스타일링
- 아웃라인 정리 (귀 주변, 목덜미)
- 추천 스타일링 제품과 방법

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

  try {
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

// ==================== 어드민: Gemini로 헤어스타일 이미지 생성 ====================
async function generateHairstyleImage(payload) {
  const { analysis, num_images, image_size } = payload;

  // 어드민 전용 Gemini API 키
  const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;

  console.log('🎨 Gemini 이미지 생성 시작');

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
    const genderKo = analysis.gender === 'male' ? '남성' : '여성';

    const prompt = `Create a professional hair salon photograph of a beautiful Korean ${genderWord} model showcasing this hairstyle:
- Hair Length: ${analysis.length || 'medium'}
- Hair Style: ${analysis.style || 'modern'}
- Hair Color: ${analysis.color || 'natural dark brown'}
- Hair Texture: ${analysis.texture || 'smooth'}
- Bangs: ${analysis.bangs || 'none'}

Style details: ${analysis.description || ''}

Requirements:
- Professional salon photography quality
- Soft, flattering studio lighting
- Clean, neutral background
- Sharp focus on hair details and texture
- Model facing slightly to the side to show hair dimension
- High-end fashion magazine aesthetic
- Photorealistic, 8K quality`;

    console.log('📝 생성 프롬프트:', prompt);

    // 이미지 생성 (num_images 만큼 반복)
    const numToGenerate = Math.min(num_images || 4, 4);
    const generatedImages = [];

    for (let i = 0; i < numToGenerate; i++) {
      console.log(`🖼️ 이미지 ${i + 1}/${numToGenerate} 생성 중...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${ADMIN_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
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
      const parts = result.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
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
