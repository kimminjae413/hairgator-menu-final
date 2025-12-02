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

      // ⭐ 이미지+질문 분석 (Gemini Vision)
      case 'analyze_image_with_question':
        return await analyzeImageWithQuestion(payload, GEMINI_KEY);

      case 'generate_recipe':
        return await generateRecipe(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

      case 'generate_recipe_stream':
        return await generateRecipeStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

      case 'search_styles':
        return await searchStyles(payload, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

      // ⭐⭐⭐ Gemini File Search 기반 응답 (NEW!) ⭐⭐⭐
      case 'generate_response':
        return await generateGeminiFileSearchResponse(payload, GEMINI_KEY);

      case 'generate_response_stream':
        return await generateGeminiFileSearchResponseStream(payload, GEMINI_KEY);

      // 폴백: 기존 Supabase 기반 응답
      case 'generate_response_supabase':
        return await generateProfessionalResponse(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

      case 'generate_response_stream_supabase':
        return await generateProfessionalResponseStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

      // ⭐⭐⭐ Firestore 스타일 검색 (임베딩 기반 Top-3) ⭐⭐⭐
      case 'search_firestore_styles':
        return await searchFirestoreStyles(payload, GEMINI_KEY);

      // ⭐⭐⭐ 이미지 분석 + 최적 레시피 매칭 (NEW!) ⭐⭐⭐
      case 'analyze_and_match_recipe':
        return await analyzeAndMatchRecipe(payload, GEMINI_KEY);

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

1. 길이 체계 (8단계):
   - A Length (65cm, 가슴 아래) → Long 스타일
   - B Length (50cm, 가슴 중간) → Semi-Long
   - C Length (40cm, 쇄골) → Semi-Long
   - D Length (35cm, 어깨선) ⭐ 가장 많이 사용
   - E Length (30cm, 어깨 위) → Medium/Bob
   - F Length (25cm, 턱 아래) → Bob
   - G Length (20cm, 턱선) → Short Bob
   - H Length (15cm, 귀) → Very Short

2. 컷 폼 (3가지):
   - O (One Length): 원렝스, 같은 길이, 0도 리프팅
   - G (Graduation): 그래쥬에이션, 하단 무게, 0~89도
   - L (Layer): 레이어, 전체 움직임, 90도 이상

3. 섹션 체계 (4가지):
   - HS (Horizontal Section): 가로 섹션, 원렝스/그래쥬에이션
   - DFS (Diagonal Forward Section): 전대각, 앞으로 흐르는 형태
   - DBS (Diagonal Backward Section): 후대각, 뒤로 흐르는 형태
   - VS (Vertical Section): 세로 섹션, 레이어

4. 리프팅 각도 (9단계):
   - L0 (0°) → 원렝스
   - L1 (22.5°) → 약간 그래쥬에이션
   - L2 (45°) → Low 그래쥬에이션
   - L3 (67.5°) → Mid 그래쥬에이션
   - L4 (90°) ⭐ 기본 레이어
   - L5 (112.5°) → High 레이어
   - L6 (135°) → Very High 레이어
   - L7 (157.5°) → 정수리 레이어
   - L8 (180°) → 완전 수직

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

// ==================== 이미지 분석 (성별 통합!) ====================
async function analyzeImage(payload, openaiKey) {
  const { image_base64, mime_type, user_gender } = payload;

  console.log(`🎯 이미지 분석 시작 - 사용자 선택 성별: ${user_gender || 'unspecified'}`);

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

STEP 1: Find the LONGEST hair strand in the BACK
STEP 2: Compare to body landmarks CAREFULLY
STEP 3: If between two lengths, choose the LONGER one
STEP 4: Double-check

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

    const functionCall = data.choices?.[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('No function call in response');
    }

    const params56 = JSON.parse(functionCall.arguments);

    // 성별 강제 적용
    if (user_gender === 'male' && params56.cut_category !== "Men's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Men's Cut`);
      params56.cut_category = "Men's Cut";
    } else if (user_gender === 'female' && params56.cut_category !== "Women's Cut") {
      console.log(`⚠️ 성별 수정: ${params56.cut_category} → Women's Cut`);
      params56.cut_category = "Women's Cut";
    }

    console.log('✅ GPT-4o Vision 분석 완료 (56개 파라미터)');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: params56,
        user_gender: user_gender,
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

총 800자 이내로 간결하게, 한국어로만 작성하세요.`;

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
1. 내부: 89개 용어 + 42포뮬러로 분석
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
 * Gemini Vision으로 이미지 분석 - 구조화된 특성 추출
 */
async function analyzeImageStructured(imageBase64, mimeType, geminiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              },
              {
                text: `이 여성 헤어스타일 이미지를 분석하여 다음 정보를 JSON 형식으로 반환해주세요.

**[중요] 기장(Length) 판단 - 머리카락 가장 긴 부분이 어디에 닿는지 확인:**
- A: 귀 위 (픽시컷, 아주 짧은 숏컷)
- B: 귀~턱선 (숏보브, 턱선 단발)
- C: 턱 아래~어깨 위 (단발, 쇄골 위 보브)
- D: 어깨선~쇄골 (어깨에 닿거나 쇄골 근처, 중단발)
- E: 쇄골 아래~가슴 위 (미디엄 롱)
- F: 가슴선 (롱헤어)
- G: 가슴~가슴 아래 (롱헤어)
- H: 허리 (매우 긴 머리)

{
  "length": "A/B/C/D/E/F/G/H 중 하나만",
  "form": "Layer / Graduation / One Length 중 하나",
  "hasBangs": true 또는 false,
  "bangsType": "풀뱅 / 시스루뱅 / 사이드뱅 / 없음",
  "volumePosition": "상단 / 중단 / 하단",
  "silhouette": "라운드 / 스퀘어 / 트라이앵글",
  "texture": "스트레이트 / 웨이브 / 컬",
  "layerLevel": "하이레이어 / 미들레이어 / 로우레이어 / 없음",
  "description": "스타일 설명 1-2문장"
}

JSON만 반환하세요.`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(text);

    console.log(`📷 이미지 분석 완료:`, analysis);
    return analysis;

  } catch (error) {
    console.error('❌ 이미지 분석 실패:', error);
    // 기본값 반환
    return {
      length: 'C',
      form: 'Layer',
      hasBangs: false,
      bangsType: '없음',
      volumePosition: '중단',
      silhouette: '라운드',
      texture: '스트레이트',
      layerLevel: '미들레이어',
      description: '분석 실패'
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
 * 특성 기반 스타일 점수 계산
 */
function calculateFeatureScore(style, analysis, captionText) {
  let score = 0;
  const reasons = [];

  if (!captionText) return { score: 0, reasons: ['자막 없음'] };

  const caption = captionText.toLowerCase();

  // 앞머리 매칭
  if (analysis.hasBangs) {
    if (caption.includes('앞머리') || caption.includes('뱅') || caption.includes('fringe')) {
      score += 30;
      reasons.push('앞머리 있음');
    }
  } else {
    if (!caption.includes('앞머리') && !caption.includes('뱅')) {
      score += 20;
      reasons.push('앞머리 없음');
    }
  }

  // 레이어 레벨 매칭
  if (analysis.layerLevel) {
    if (analysis.layerLevel.includes('하이') && (caption.includes('하이') || caption.includes('high'))) {
      score += 25;
      reasons.push('하이레이어');
    } else if (analysis.layerLevel.includes('로우') && (caption.includes('로우') || caption.includes('low'))) {
      score += 25;
      reasons.push('로우레이어');
    } else if (analysis.layerLevel.includes('미들') && (caption.includes('미들') || caption.includes('middle'))) {
      score += 25;
      reasons.push('미들레이어');
    }
  }

  // 볼륨 위치 매칭
  if (analysis.volumePosition === '상단' && (caption.includes('볼륨') && caption.includes('상'))) {
    score += 20;
    reasons.push('상단 볼륨');
  } else if (analysis.volumePosition === '하단' && (caption.includes('볼륨') && caption.includes('하'))) {
    score += 20;
    reasons.push('하단 볼륨');
  }

  // 텍스처 매칭
  if (analysis.texture === '웨이브' && caption.includes('웨이브')) {
    score += 15;
    reasons.push('웨이브');
  } else if (analysis.texture === '컬' && caption.includes('컬')) {
    score += 15;
    reasons.push('컬');
  }

  return { score, reasons };
}

/**
 * Gemini로 맞춤 레시피 생성
 */
async function generateCustomRecipe(analysis, top3Styles, geminiKey) {
  try {
    // Top-3 스타일의 레시피 텍스트 준비
    const recipeTexts = top3Styles.map((s, i) =>
      `[참고 스타일 ${i+1}: ${s.styleId}]\n${s.captionText || '레시피 없음'}`
    ).join('\n\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `당신은 전문 헤어 디자이너입니다. 고객 요청 스타일과 유사한 참고 레시피 3개를 바탕으로 최적의 맞춤 레시피를 생성해주세요.

## 고객 요청 스타일 분석
- 기장: ${analysis.length} Length
- 형태: ${analysis.form}
- 앞머리: ${analysis.hasBangs ? analysis.bangsType : '없음'}
- 볼륨 위치: ${analysis.volumePosition}
- 실루엣: ${analysis.silhouette}
- 텍스처: ${analysis.texture}
- 레이어: ${analysis.layerLevel}
- 설명: ${analysis.description}

## 참고 레시피 (Top-3)
${recipeTexts}

## 요청사항
위 참고 레시피들의 장점을 조합하여, 고객 요청 스타일에 최적화된 커스텀 레시피를 작성해주세요.

다음 형식으로 작성:
1. **스타일 개요**: 완성될 스타일 설명 (2-3문장)
2. **커트 순서**:
   - Step 1: ...
   - Step 2: ...
   (필요한 만큼)
3. **핵심 포인트**: 이 스타일의 핵심 기술 3가지
4. **참고한 스타일**: 어떤 스타일에서 어떤 요소를 참고했는지`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Recipe generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '레시피 생성 실패';

  } catch (error) {
    console.error('❌ 레시피 생성 실패:', error);
    return '레시피 생성 중 오류가 발생했습니다.';
  }
}

/**
 * 이미지 분석 → 시리즈 필터링 → Top-3 참고 → 맞춤 레시피 생성
 */
async function analyzeAndMatchRecipe(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  console.log('🎯 이미지 분석 + 맞춤 레시피 생성 시작...');

  try {
    // 1. 이미지 분석 (구조화된 특성 추출)
    const analysis = await analyzeImageStructured(image_base64, mime_type, geminiKey);
    console.log(`📊 분석 결과: ${analysis.length} Length, ${analysis.form}, 앞머리: ${analysis.hasBangs}`);

    // 2. 기장에 해당하는 시리즈 결정
    const targetSeries = LENGTH_TO_SERIES[analysis.length] || 'FCL';
    console.log(`📁 대상 시리즈: ${targetSeries}`);

    // 3. Firestore에서 해당 시리즈 스타일만 필터링
    const allStyles = await getFirestoreStyles();
    const seriesStyles = allStyles.filter(s => s.series === targetSeries);

    console.log(`📚 ${targetSeries} 시리즈: ${seriesStyles.length}개 스타일`);

    if (seriesStyles.length === 0) {
      throw new Error(`${targetSeries} 시리즈 스타일이 없습니다`);
    }

    // 4. 각 스타일의 자막(레시피) 가져오기 + 특성 점수 계산
    const stylesWithScores = await Promise.all(
      seriesStyles.map(async (style) => {
        const captionText = await fetchCaptionContent(style.captionUrl);
        const { score, reasons } = calculateFeatureScore(style, analysis, captionText);

        // 임베딩 유사도도 함께 고려
        let embeddingSimilarity = 0;
        if (style.embedding && analysis.description) {
          const queryEmb = await generateQueryEmbedding(analysis.description, geminiKey);
          if (queryEmb) {
            embeddingSimilarity = cosineSimilarity(queryEmb, style.embedding);
          }
        }

        return {
          ...style,
          captionText,
          featureScore: score,
          featureReasons: reasons,
          embeddingSimilarity,
          totalScore: score + (embeddingSimilarity * 50) // 특성 점수 + 임베딩 유사도
        };
      })
    );

    // 5. 총점 기준 Top-3 선정
    const top3 = stylesWithScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);

    console.log(`🎯 Top-3 참고 스타일:`);
    top3.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.styleId} (점수: ${s.totalScore.toFixed(1)}, 이유: ${s.featureReasons.join(', ')})`);
    });

    // 6. Top-3를 참고하여 맞춤 레시피 생성
    const customRecipe = await generateCustomRecipe(analysis, top3, geminiKey);

    // 7. 결과 구성
    const result = {
      // 이미지 분석 결과
      analysis: {
        length: analysis.length,
        lengthName: `${analysis.length} Length`,
        form: analysis.form,
        hasBangs: analysis.hasBangs,
        bangsType: analysis.bangsType,
        volumePosition: analysis.volumePosition,
        silhouette: analysis.silhouette,
        texture: analysis.texture,
        layerLevel: analysis.layerLevel,
        description: analysis.description
      },

      // 대상 시리즈
      targetSeries: {
        code: targetSeries,
        name: `${analysis.length} Layer`,
        totalStyles: seriesStyles.length
      },

      // Top-3 참고 스타일
      referenceStyles: top3.map(s => ({
        styleId: s.styleId,
        series: s.series,
        totalScore: s.totalScore,
        featureReasons: s.featureReasons,
        diagrams: s.diagrams.slice(0, 5), // 도해도 5장
        diagramCount: s.diagramCount
      })),

      // 생성된 맞춤 레시피
      customRecipe: customRecipe,

      // 대표 도해도 (Top-1의 도해도)
      mainDiagrams: top3[0]?.diagrams || []
    };

    console.log(`✅ 맞춤 레시피 생성 완료`);

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
