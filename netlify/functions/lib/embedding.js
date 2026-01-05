// lib/embedding.js
// 임베딩 생성 및 벡터 검색 모듈
/* eslint-disable no-unused-vars */

const { cosineSimilarity, getLengthPrefix } = require('./utils');

// ==================== Firebase 설정 ====================
const FIREBASE_PROJECT_ID = 'hairgatormenu-4a43e';

// ==================== Gemini 임베딩 생성 ====================
async function generateEmbedding(text, geminiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini embedding failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding?.values || null;

  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error);
    return null;
  }
}

// ==================== Firestore REST API 스타일 가져오기 ====================
// ⚠️ 올바른 컬렉션: hairstyles (styles, men_styles 사용 금지!)
async function getFirestoreStyles(genderFilter = null) {
  // 항상 hairstyles 컬렉션 사용
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/hairstyles`;

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
        const gender = fields.gender?.stringValue || '';

        // gender 필터 적용
        if (genderFilter && gender !== genderFilter) {
          continue;
        }

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
              url: mapValue.url?.stringValue || '',
              lifting: mapValue.lifting?.stringValue || null,
              direction: mapValue.direction?.stringValue || null,
              section: mapValue.section?.stringValue || null,
              zone: mapValue.zone?.stringValue || null,
              cutting_method: mapValue.cutting_method?.stringValue || null
            };
          });
        }

        styles.push({
          styleId: styleId,
          series: fields.series?.stringValue || '',
          seriesName: fields.seriesName?.stringValue || '',
          gender: gender,
          resultImage: fields.resultImage?.stringValue || null,
          diagrams: diagrams,
          diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
          captionUrl: fields.captionUrl?.stringValue || null,
          embedding: embedding
        });
      }
    }

    const filterLabel = genderFilter ? `(gender=${genderFilter})` : '(전체)';
    console.log(`📚 Firestore hairstyles${filterLabel}에서 ${styles.length}개 로드`);
    return styles;

  } catch (error) {
    console.error('❌ Firestore 스타일 로드 실패:', error);
    return [];
  }
}

// ==================== 남자 스타일 가져오기 (hairstyles에서 gender='male' 필터) ====================
async function getMenStyles() {
  return await getFirestoreStyles('male');
}

// ==================== 여자 스타일 가져오기 (hairstyles에서 gender='female' 필터) ====================
async function getWomenStyles() {
  return await getFirestoreStyles('female');
}

// ==================== 임베딩 기반 Top-K 검색 ====================
async function searchStylesByEmbedding(queryEmbedding, styles, topK = 3) {
  const scoredStyles = styles
    .filter(style => style.embedding && style.embedding.length > 0)
    .map(style => ({
      ...style,
      similarity: cosineSimilarity(queryEmbedding, style.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scoredStyles;
}

// ==================== Firestore 스타일 검색 (통합) ====================
async function searchFirestoreStyles(query, geminiKey, gender = 'female', topK = 3) {
  console.log(`🔍 Firestore 스타일 검색: "${query}" (${gender})`);

  try {
    // 1. 쿼리 임베딩 생성
    const queryEmbedding = await generateEmbedding(query, geminiKey);
    if (!queryEmbedding) {
      throw new Error('쿼리 임베딩 생성 실패');
    }

    console.log(`✅ 쿼리 임베딩 생성 완료 (${queryEmbedding.length}차원)`);

    // 2. 성별에 맞는 컬렉션에서 스타일 가져오기
    const styles = gender === 'male'
      ? await getMenStyles()
      : await getWomenStyles();

    if (styles.length === 0) {
      throw new Error('스타일 데이터 없음');
    }

    // 3. 유사도 검색
    const scoredStyles = await searchStylesByEmbedding(queryEmbedding, styles, topK);

    console.log(`🎯 Top-${topK} 스타일 검색 완료`);
    scoredStyles.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`);
    });

    // 4. 결과 반환 (임베딩 제외)
    return scoredStyles.map(style => ({
      styleId: style.styleId,
      series: style.series,
      seriesName: style.seriesName,
      resultImage: style.resultImage,
      diagrams: style.diagrams.slice(0, 15), // 도해도 15장까지
      diagramCount: style.diagramCount,
      captionUrl: style.captionUrl,
      similarity: style.similarity
    }));

  } catch (error) {
    console.error('❌ Firestore 스타일 검색 오류:', error);
    return [];
  }
}

// ==================== 시리즈/스타일 코드 기반 필터링 ====================
async function searchStylesByCode(codePrefix, gender = 'female') {
  const styles = gender === 'male'
    ? await getMenStyles()
    : await getWomenStyles();

  const filtered = styles.filter(style =>
    style.styleId.startsWith(codePrefix) ||
    style.series === codePrefix
  );

  console.log(`🔍 코드 기반 검색: ${codePrefix} → ${filtered.length}개`);
  return filtered;
}

// ==================== Gemini File Search 이론 조회 (abcde 북) ====================
const GEMINI_FILE_SEARCH_STORE = "fileSearchStores/hairgator2waycutstore-md6skhedgag7";

/**
 * abcde 북에서 레시피 관련 이론 조회
 * @param {Object} params - 분석된 스타일 파라미터
 * @param {string} geminiKey - Gemini API 키
 * @param {string} gender - 'male' | 'female'
 * @returns {string} - 관련 이론 텍스트
 */
async function queryFileSearchForTheory(params, geminiKey, gender = 'female') {
  console.log('📚 abcde 북 이론 조회 시작');

  try {
    // 검색 쿼리 생성 (스타일 파라미터 기반)
    let searchQuery = '';

    if (gender === 'female') {
      const parts = [];
      if (params.length_category) parts.push(`${params.length_category} 기장`);
      if (params.cut_form) parts.push(`${params.cut_form} 커트`);
      if (params.volume_zone) parts.push(`${params.volume_zone} 볼륨`);
      if (params.fringe_type) parts.push(`${params.fringe_type} 앞머리`);
      searchQuery = parts.join(' ') + ' 커팅 기법 테크닉';
    } else {
      const parts = [];
      if (params.style_name) parts.push(params.style_name);
      if (params.style_category) parts.push(params.style_category);
      if (params.fade_type && params.fade_type !== 'None') parts.push(`${params.fade_type} 페이드`);
      if (params.top_length) parts.push(`탑 ${params.top_length}`);
      searchQuery = parts.join(' ') + ' 남자 커트 기법';
    }

    console.log(`🔍 File Search 쿼리: "${searchQuery}"`);

    // Gemini File Search API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `다음 헤어 스타일에 대한 커팅 이론과 테크닉을 설명해주세요: ${searchQuery}

핵심 내용만 간결하게 3-5문장으로 요약해주세요.
- Zone 구분 및 커팅 순서
- Lifting 각도와 방향
- 주요 커팅 기법 (Layer, Graduation 등)
- 질감 처리 방법`
            }]
          }],
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [GEMINI_FILE_SEARCH_STORE]
            }
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
            topP: 0.8
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ File Search API Error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const theoryText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (theoryText) {
      console.log(`✅ 이론 조회 완료 (${theoryText.length}자)`);
      return theoryText;
    }

    return null;

  } catch (error) {
    console.error('❌ File Search 이론 조회 실패:', error.message);
    return null;
  }
}

// ==================== 도해도 선별 (중복 제거) ====================
function selectBestDiagrams(styles, maxDiagrams = 15) {
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

  console.log(`📊 도해도 선별: ${allDiagrams.length}개 → 중복제거 ${selectedDiagrams.length}개`);

  return selectedDiagrams.slice(0, maxDiagrams);
}

module.exports = {
  generateEmbedding,
  getFirestoreStyles,
  getMenStyles,
  getWomenStyles,
  searchStylesByEmbedding,
  searchFirestoreStyles,
  searchStylesByCode,
  selectBestDiagrams,
  queryFileSearchForTheory,
  FIREBASE_PROJECT_ID,
  GEMINI_FILE_SEARCH_STORE
};
