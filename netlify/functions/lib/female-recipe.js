// lib/female-recipe.js
// 여자 커트 레시피 생성 모듈 (기장별 분류: A~H Length)

const { searchFirestoreStyles, selectBestDiagrams, queryFileSearchForTheory } = require('./embedding');
const { getTerms, buildSearchQuery, sanitizeRecipeForPublic, getLengthPrefix } = require('./utils');

// ==================== 여자 레시피 프롬프트 빌드 ====================
function buildFemaleRecipePrompt(params, diagrams, theoryContext = null, language = 'ko') {
  const langTerms = getTerms(language);
  const volumeDesc = langTerms.volume[params.volume_zone] || langTerms.volume['Medium'];

  const faceShapesKo = (params.face_shape_match || [])
    .map(shape => langTerms.faceShapeDesc[shape] || shape)
    .join(', ');

  const diagramsContext = diagrams.map((d, idx) =>
    `Step ${d.step_number}: ${d.style_id}\n` +
    `  - Lifting: ${d.lifting || 'N/A'}\n` +
    `  - Direction: ${d.direction || 'N/A'}\n` +
    `  - Section: ${d.section || 'N/A'}\n` +
    `  - Zone: ${d.zone || 'N/A'}`
  ).join('\n\n');

  // 이론 컨텍스트 섹션 (abcde 북 참조)
  const theorySection = theoryContext
    ? `\n**📚 참고 이론 (2WAY CUT 교재):**\n${theoryContext}\n`
    : '';

  return `당신은 전문 헤어 스타일리스트입니다.

**분석 결과:**
- 기장: ${params.length_category} (${langTerms.lengthDesc[params.length_category] || params.length_category})
- 형태: ${params.cut_form}
- 볼륨: ${params.volume_zone} (${volumeDesc})
- 앞머리: ${params.fringe_type || '없음'}
- 어울리는 얼굴형: ${faceShapesKo || '모든 얼굴형'}
${theorySection}
**🎯 선별된 도해도 순서 (${diagrams.length}개):**

${diagramsContext}

**📋 작성 지침:**

위의 도해도 순서를 **정확히 따라서** 레시피를 작성하세요.
${theoryContext ? '참고 이론의 커팅 기법과 원리를 레시피에 자연스럽게 반영하세요.' : ''}

### STEP 1: 전체 개요 (2-3줄)
- 이 스타일의 핵심 특징과 목표를 설명

### STEP 2: 상세 커팅 순서 (${diagrams.length}단계)
각 도해도의 Zone, Section, Lifting을 참고하여 단계별 설명

### STEP 3: 질감 처리
- 텍스처 기법, 숱 조절 방법

### STEP 4: 스타일링 가이드
- 드라이 방법, 제품 추천

### STEP 5: 유지 관리
- 관리 주기, 홈케어 팁

총 800자 이내로 간결하게, 한국어로만 작성하세요.`;
}

// ==================== 여자 레시피 생성 ====================
async function generateFemaleRecipe(params, geminiKey, language = 'ko') {
  console.log('👩 여자 레시피 생성 시작:', params.length_category);

  try {
    // 1. 검색 쿼리 빌드
    const searchQuery = buildSearchQuery(params);
    console.log(`🔍 검색 쿼리: "${searchQuery}"`);

    // 2. Firestore에서 유사 스타일 검색
    const matchedStyles = await searchFirestoreStyles(searchQuery, geminiKey, 'female', 5);
    console.log(`📊 매칭된 스타일: ${matchedStyles.length}개`);

    // 기장 필터링
    const lengthPrefix = getLengthPrefix(params.length_category);
    let filteredStyles = matchedStyles;
    if (lengthPrefix) {
      filteredStyles = matchedStyles.filter(s =>
        s.styleId.startsWith(lengthPrefix) || s.series === lengthPrefix
      );
      console.log(`🎯 기장 필터 (${lengthPrefix}): ${filteredStyles.length}개`);

      // 필터 결과가 없으면 전체 결과 사용
      if (filteredStyles.length === 0) {
        filteredStyles = matchedStyles;
      }
    }

    // 3. 도해도 선별
    const selectedDiagrams = selectBestDiagrams(filteredStyles, 15);
    console.log(`✅ 도해도 선별 완료: ${selectedDiagrams.length}개`);

    // 4. ⭐ abcde 북에서 관련 이론 조회 (NEW!)
    const theoryContext = await queryFileSearchForTheory(params, geminiKey, 'female');
    if (theoryContext) {
      console.log(`📚 이론 컨텍스트 추가됨`);
    }

    // 5. 레시피 프롬프트 생성 (이론 컨텍스트 포함)
    const recipePrompt = buildFemaleRecipePrompt(params, selectedDiagrams, theoryContext, language);

    // 6. GPT로 레시피 생성
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
          { role: 'system', content: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.' },
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

    // 7. 보안 필터링
    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 여자 레시피 생성 완료');

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
    console.error('💥 generateFemaleRecipe Error:', error);
    throw error;
  }
}

// ==================== 여자 이미지 분석 + 레시피 통합 ====================
async function analyzeAndGenerateFemaleRecipe(imageParams, geminiKey, language = 'ko') {
  console.log('👩 여자 이미지 분석 + 레시피 생성 통합');

  // 레시피 생성
  const result = await generateFemaleRecipe(imageParams, geminiKey, language);

  return {
    analysis: imageParams,
    recipe: result.recipe,
    diagrams: result.diagrams,
    matched_styles: result.matched_styles
  };
}

module.exports = {
  generateFemaleRecipe,
  analyzeAndGenerateFemaleRecipe,
  buildFemaleRecipePrompt
};
