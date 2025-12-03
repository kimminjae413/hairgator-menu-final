// lib/embedding.js
// 임베딩 생성 및 벡터 검색 모듈

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
async function getFirestoreStyles(collection = 'styles') {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`;

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
          resultImage: fields.resultImage?.stringValue || null,
          diagrams: diagrams,
          diagramCount: parseInt(fields.diagramCount?.integerValue || 0),
          captionUrl: fields.captionUrl?.stringValue || null,
          embedding: embedding
        });
      }
    }

    console.log(`📚 Firestore ${collection}에서 ${styles.length}개 로드`);
    return styles;

  } catch (error) {
    console.error('❌ Firestore 스타일 로드 실패:', error);
    return [];
  }
}

// ==================== 남자 스타일 가져오기 (men_styles 컬렉션) ====================
async function getMenStyles() {
  return await getFirestoreStyles('men_styles');
}

// ==================== 여자 스타일 가져오기 (styles 컬렉션) ====================
async function getWomenStyles() {
  return await getFirestoreStyles('styles');
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
  FIREBASE_PROJECT_ID
};
