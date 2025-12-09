// lib/male-recipe.js
// 남자 커트 레시피 생성 모듈 (스타일별 분류: SF, SP, FU, PB, BZ, CP, MC)

const { searchFirestoreStyles, selectBestDiagrams, getMenStyles, queryFileSearchForTheory } = require('./embedding');
const { sanitizeRecipeForPublic, getMaleStyleCode } = require('./utils');
const { MALE_STYLE_CATEGORIES } = require('./schemas');

// ==================== 남자 스타일 용어 (PDF 기반 상세 분류) ====================
const MALE_TERMS = {
  style: {
    'SF': {
      ko: '사이드 프린지',
      en: 'Side Fringe',
      desc: '앞머리를 앞으로 내려 자연스럽게 흐르는 스타일',
      subStyles: ['댄디컷', '시스루 댄디컷', '슬릭컷']
    },
    'SP': {
      ko: '사이드 파트',
      en: 'Side Part',
      desc: '가르마를 기준으로 나누는 스타일',
      subStyles: ['가일컷', '시스루 가일컷', '시스루 가르마컷', '플랫컷', '리프컷', '포마드컷', '드롭컷', '하프컷', '숏가일컷', '리젠트컷', '시스루 애즈컷']
    },
    'FU': {
      ko: '프린지 업',
      en: 'Fringe Up',
      desc: '앞머리 끝만 위로 올린 스타일',
      subStyles: ['아이비리그컷', '크랙컷']
    },
    'PB': {
      ko: '푸시드 백',
      en: 'Pushed Back',
      desc: '모발 전체가 뒤쪽으로 넘어가는 스타일',
      subStyles: ['폼파도르컷', '슬릭백', '슬릭백 언더컷']
    },
    'BZ': {
      ko: '버즈 컷',
      en: 'Buzz Cut',
      desc: '가장 짧은 남자 커트',
      subStyles: ['버즈컷']
    },
    'CP': {
      ko: '크롭 컷',
      en: 'Crop Cut',
      desc: '버즈보다 조금 더 긴 트렌디한 스타일',
      subStyles: ['크롭컷', '스왓컷']
    },
    'MC': {
      ko: '모히칸',
      en: 'Mohican',
      desc: '센터 부분을 위쪽으로 세워 강조하는 스타일',
      subStyles: ['모히칸컷']
    }
  },
  fade: {
    'None': '페이드 없음',
    'Low Fade': '낮은 페이드 (사이드 하단만)',
    'Mid Fade': '중간 페이드 (귀 높이)',
    'High Fade': '높은 페이드 (관자놀이)',
    'Skin Fade': '스킨 페이드 (피부까지)',
    'Taper': '테이퍼 (자연스러운 그라데이션)'
  },
  texture: {
    'Smooth': '매끈한 질감',
    'Textured': '질감 있는',
    'Messy': '자연스럽게 흐트러진',
    'Spiky': '뾰족한 질감'
  },
  product: {
    'Wax': '왁스 - 자연스러운 홀드',
    'Pomade': '포마드 - 광택과 강한 홀드',
    'Clay': '클레이 - 매트한 질감',
    'Gel': '젤 - 강한 홀드와 광택'
  }
};

// ==================== 남자 레시피 프롬프트 빌드 ====================
function buildMaleRecipePrompt(params, diagrams, theoryContext = null, language = 'ko') {
  const styleCode = params.style_category;
  const styleInfo = MALE_TERMS.style[styleCode] || { ko: params.style_name, desc: '', subStyles: [] };
  const subStyleName = params.sub_style || styleInfo.subStyles?.[0] || styleInfo.ko;
  const fadeDesc = MALE_TERMS.fade[params.fade_type] || params.fade_type;
  const textureDesc = MALE_TERMS.texture[params.texture] || params.texture;

  const faceShapesKo = (params.face_shape_match || []).join(', ');
  const availableSubStyles = styleInfo.subStyles?.join(', ') || '';

  const diagramsContext = diagrams.map((d, idx) =>
    `Step ${d.step_number}: ${d.style_id}\n` +
    `  - Zone: ${d.zone || 'N/A'}\n` +
    `  - Lifting: ${d.lifting || 'N/A'}\n` +
    `  - Direction: ${d.direction || 'N/A'}\n` +
    `  - Section: ${d.section || 'N/A'}\n` +
    `  - Cutting Method: ${d.cutting_method || 'N/A'}`
  ).join('\n\n');

  // 이론 컨텍스트 섹션 (abcde 북 참조)
  const theorySection = theoryContext
    ? `\n**📚 참고 이론 (2WAY CUT 교재):**\n${theoryContext}\n`
    : '';

  return `당신은 남자 헤어컷 전문 스타일리스트입니다.

**📊 분석 결과:**
- 카테고리: ${styleInfo.ko} (${styleCode})
- 구체적 스타일: ${subStyleName}
- 관련 스타일: ${availableSubStyles}
- 스타일 설명: ${styleInfo.desc}
- 탑 길이: ${params.top_length || 'Medium'}
- 사이드 길이: ${params.side_length || 'Short'}
- 페이드: ${fadeDesc}
- 텍스처: ${textureDesc}
- 어울리는 얼굴형: ${faceShapesKo || '모든 얼굴형'}
${theorySection}
**🎯 도해도 분석 결과 (${diagrams.length}개):**

${diagramsContext}

**📋 레시피 작성 지침:**
${theoryContext ? '참고 이론의 커팅 기법과 원리를 레시피에 자연스럽게 반영하세요.' : ''}

⚠️ 중요: 반드시 [엑스터널 부분]과 [인터널 부분]으로 구분하여 작성하세요!

---

### 스타일 개요 (2-3줄)
- ${subStyleName} 스타일의 핵심 특징
- 이 스타일이 어울리는 고객 유형

---

[엑스터널 부분] (머리 바깥쪽, 겉으로 보이는 부분)

### 1. 사이드 커팅
- 페이드 종류: ${fadeDesc}
- 클리퍼 가드 사이즈 순서 (예: 0.5mm → 3mm → 6mm)
- 페이드 시작 위치와 블렌딩 포인트

### 2. 백(뒷머리) 커팅
- 네이프라인 처리 방법
- 오시피탈 본(후두골) 주변 블렌딩

### 3. 아웃라인 정리
- 귀 주변 라인 정리
- 구레나룻/네이프 라인 클린업

---

[인터널 부분] (머리 안쪽, 겉으로 잘 보이지 않는 부분)

### 4. 탑(상단) 커팅
- 탑 길이: ${params.top_length || 'Medium'}
- 기준선 설정 (Guide Line)
- Lifting 각도와 커팅 방향

### 5. 크라운(정수리) 커팅
- 텍스처 기법 (Point Cut, Slide Cut 등)
- 볼륨 조절 방법

### 6. 연결 작업 (블렌딩)
- 사이드 ↔ 탑 연결부 처리
- 자연스러운 그라데이션

---

### 스타일링 가이드
- 추천 제품: ${params.product_type || 'Wax'}
- 스타일링 방향: ${params.styling_direction || 'Forward'}
- 드라이/셋팅 방법

총 1000자 이내로 작성하세요.
전문 용어와 💡 초보자 설명을 함께 포함하세요.`;
}

// ==================== 남자 레시피 생성 ====================
async function generateMaleRecipe(params, geminiKey, language = 'ko') {
  console.log('👨 남자 레시피 생성 시작:', params.style_category, params.style_name);

  try {
    // 1. 스타일 코드 확인
    const styleCode = params.style_category || getMaleStyleCode(params.style_name);
    if (!styleCode) {
      console.warn('⚠️ 스타일 코드 없음, 기본값 SF 사용');
    }

    // 2. 검색 쿼리 빌드 (남자 스타일 기반)
    const searchParts = [];
    if (params.style_name) searchParts.push(params.style_name);
    if (params.top_length) searchParts.push(`top ${params.top_length}`);
    if (params.fade_type && params.fade_type !== 'None') searchParts.push(params.fade_type);
    if (params.texture) searchParts.push(params.texture);

    const searchQuery = searchParts.join(' ') || 'Side Fringe Medium';
    console.log(`🔍 검색 쿼리: "${searchQuery}"`);

    // 3. Firestore men_styles에서 검색
    const matchedStyles = await searchFirestoreStyles(searchQuery, geminiKey, 'male', 5);
    console.log(`📊 매칭된 스타일: ${matchedStyles.length}개`);

    // 스타일 코드 필터링
    let filteredStyles = matchedStyles;
    if (styleCode) {
      filteredStyles = matchedStyles.filter(s =>
        s.styleId.startsWith(styleCode) || s.series === styleCode
      );
      console.log(`🎯 스타일 필터 (${styleCode}): ${filteredStyles.length}개`);

      // 필터 결과가 없으면 전체 결과 사용
      if (filteredStyles.length === 0) {
        filteredStyles = matchedStyles;
      }
    }

    // 4. 도해도 선별
    const selectedDiagrams = selectBestDiagrams(filteredStyles, 15);
    console.log(`✅ 도해도 선별 완료: ${selectedDiagrams.length}개`);

    // 5. ⭐ abcde 북에서 관련 이론 조회 (NEW!)
    const theoryContext = await queryFileSearchForTheory(params, geminiKey, 'male');
    if (theoryContext) {
      console.log(`📚 이론 컨텍스트 추가됨`);
    }

    // 6. 레시피 프롬프트 생성 (이론 컨텍스트 포함)
    const recipePrompt = buildMaleRecipePrompt(params, selectedDiagrams, theoryContext, language);

    // 7. GPT로 레시피 생성
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
          { role: 'system', content: '당신은 남자 헤어컷 전문가입니다. 모든 응답을 한국어로만 작성하세요. 클리퍼 가드 사이즈, 페이드 기법 등 실무적인 내용을 포함하세요.' },
          { role: 'user', content: recipePrompt }
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

    // 8. 보안 필터링
    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 남자 레시피 생성 완료');

    return {
      recipe: recipe,
      params: params,
      diagrams: selectedDiagrams,
      matched_styles: filteredStyles.slice(0, 3).map(s => ({
        styleId: s.styleId,
        similarity: s.similarity,
        resultImage: s.resultImage
      }))
    };

  } catch (error) {
    console.error('💥 generateMaleRecipe Error:', error);
    throw error;
  }
}

// ==================== 남자 이미지 분석 + 레시피 통합 ====================
async function analyzeAndGenerateMaleRecipe(imageParams, geminiKey, language = 'ko') {
  console.log('👨 남자 이미지 분석 + 레시피 생성 통합');

  // 레시피 생성
  const result = await generateMaleRecipe(imageParams, geminiKey, language);

  return {
    analysis: imageParams,
    recipe: result.recipe,
    diagrams: result.diagrams,
    matched_styles: result.matched_styles
  };
}

// ==================== 스타일 코드로 직접 검색 ====================
async function searchMaleStyleByCode(styleCode) {
  console.log(`🔍 남자 스타일 코드 검색: ${styleCode}`);

  const allStyles = await getMenStyles();

  const filtered = allStyles.filter(s =>
    s.styleId.startsWith(styleCode) || s.series === styleCode
  );

  console.log(`📊 ${styleCode} 스타일: ${filtered.length}개`);
  return filtered;
}

module.exports = {
  generateMaleRecipe,
  analyzeAndGenerateMaleRecipe,
  buildMaleRecipePrompt,
  searchMaleStyleByCode,
  MALE_TERMS
};
