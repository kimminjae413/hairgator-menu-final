/**
 * 헤어스타일 매칭 시스템
 * - 사용자 이미지 분석 → 유사 스타일 Top-3 추천
 * - Gemini Vision + 임베딩 기반 코사인 유사도 검색
 */

class StyleMatcher {
  constructor() {
    this.embeddings = null;
    this.isLoaded = false;
  }

  /**
   * 임베딩 데이터 로드
   */
  async loadEmbeddings() {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/data/styles-embeddings.json');
      const data = await response.json();
      this.embeddings = data.styles;
      this.isLoaded = true;
      console.log(`[StyleMatcher] ${this.embeddings.length}개 스타일 임베딩 로드됨`);
    } catch (error) {
      console.error('[StyleMatcher] 임베딩 로드 실패:', error);
      throw error;
    }
  }

  /**
   * 코사인 유사도 계산
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  /**
   * 유사 스타일 검색
   * @param {Array} queryEmbedding - 쿼리 이미지의 임베딩 벡터
   * @param {number} topK - 반환할 결과 수
   * @returns {Array} 유사 스타일 목록
   */
  findSimilarStyles(queryEmbedding, topK = 3) {
    if (!this.isLoaded) {
      throw new Error('임베딩이 로드되지 않았습니다');
    }

    const similarities = this.embeddings.map(style => ({
      styleId: style.styleId,
      series: style.series,
      length: style.length,
      shape: style.shape,
      description: style.description,
      similarity: this.cosineSimilarity(queryEmbedding, style.embedding)
    }));

    // 유사도 내림차순 정렬
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * Gemini로 이미지 분석 후 매칭
   * (서버 사이드 API 호출 필요)
   */
  async matchFromImage(imageBase64) {
    try {
      const response = await fetch('/.netlify/functions/style-matcher-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageBase64 })
      });

      if (!response.ok) {
        throw new Error('스타일 매칭 API 오류');
      }

      const result = await response.json();
      return result.matches;
    } catch (error) {
      console.error('[StyleMatcher] 매칭 오류:', error);
      throw error;
    }
  }

  /**
   * 기장/형태 필터링
   */
  filterByAttributes(length = null, shape = null) {
    if (!this.isLoaded) {
      throw new Error('임베딩이 로드되지 않았습니다');
    }

    return this.embeddings.filter(style => {
      if (length && style.length !== length) return false;
      if (shape && style.shape !== shape) return false;
      return true;
    });
  }
}

// 전역 인스턴스
window.styleMatcher = new StyleMatcher();

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.styleMatcher.loadEmbeddings().catch(console.error);
});
