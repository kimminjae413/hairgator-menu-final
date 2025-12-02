/**
 * 스타일 매칭 API
 * - 사용자 이미지 분석 → Gemini Vision으로 설명 생성
 * - 텍스트 임베딩으로 유사 스타일 검색
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// 임베딩 데이터 (빌드 시 포함)
let stylesEmbeddings = null;

// 코사인 유사도 계산
function cosineSimilarity(vec1, vec2) {
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

// 유사 스타일 검색
function findSimilarStyles(queryEmbedding, styles, topK = 3) {
  const similarities = styles.map(style => ({
    styleId: style.styleId,
    series: style.series,
    length: style.length,
    shape: style.shape,
    description: style.description,
    similarity: cosineSimilarity(queryEmbedding, style.embedding)
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK);
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리
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
    const { image, text } = JSON.parse(event.body);

    // API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' })
      };
    }

    // Gemini 초기화
    const genAI = new GoogleGenerativeAI(apiKey);

    // 임베딩 데이터 로드 (첫 요청 시)
    if (!stylesEmbeddings) {
      try {
        // 빌드 시 포함된 JSON 또는 외부 소스에서 로드
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(__dirname, '../../data/styles-embeddings.json');

        if (fs.existsSync(dataPath)) {
          const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          stylesEmbeddings = data.styles;
          console.log(`[StyleMatcher] ${stylesEmbeddings.length}개 스타일 로드됨`);
        } else {
          console.warn('[StyleMatcher] 임베딩 파일 없음, 데모 모드');
          stylesEmbeddings = [];
        }
      } catch (e) {
        console.error('[StyleMatcher] 임베딩 로드 오류:', e);
        stylesEmbeddings = [];
      }
    }

    let queryText = text;

    // 이미지가 제공된 경우 Vision으로 분석
    if (image) {
      console.log('[StyleMatcher] 이미지 분석 시작');

      const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `이 헤어스타일 이미지를 분석해주세요. 다음 항목을 포함해 간결하게 설명해주세요:
1. 머리 길이 (숏/미디엄/롱)
2. 커트 형태 (원랭스/레이어/그래쥬에이션 등)
3. 실루엣 특징
4. 앞머리 유무 및 스타일
5. 전체적인 볼륨감과 질감

한국어로 2-3문장으로 답변해주세요.`;

      // Base64 이미지 처리
      const imageData = image.replace(/^data:image\/\w+;base64,/, '');

      const result = await visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        }
      ]);

      queryText = result.response.text();
      console.log('[StyleMatcher] 이미지 분석 완료:', queryText.substring(0, 100));
    }

    if (!queryText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '이미지 또는 텍스트가 필요합니다' })
      };
    }

    // 텍스트 임베딩 생성
    console.log('[StyleMatcher] 임베딩 생성 시작');

    const embeddingResult = await genAI.getGenerativeModel({
      model: 'text-embedding-004'
    }).embedContent({
      content: { parts: [{ text: queryText }] },
      taskType: 'RETRIEVAL_QUERY'
    });

    const queryEmbedding = embeddingResult.embedding.values;
    console.log(`[StyleMatcher] 임베딩 생성 완료 (${queryEmbedding.length}차원)`);

    // 유사 스타일 검색
    let matches = [];
    if (stylesEmbeddings.length > 0) {
      matches = findSimilarStyles(queryEmbedding, stylesEmbeddings, 3);
      console.log('[StyleMatcher] 매칭 결과:', matches.map(m => `${m.styleId}(${m.similarity.toFixed(3)})`));
    } else {
      // 데모 응답
      matches = [
        { styleId: 'DEMO001', similarity: 0.95, description: '데모 스타일 1' },
        { styleId: 'DEMO002', similarity: 0.90, description: '데모 스타일 2' },
        { styleId: 'DEMO003', similarity: 0.85, description: '데모 스타일 3' }
      ];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: queryText,
        matches: matches
      })
    };

  } catch (error) {
    console.error('[StyleMatcher] 오류:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || '스타일 매칭 중 오류가 발생했습니다'
      })
    };
  }
};
