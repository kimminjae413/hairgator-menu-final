// 공지사항 다국어 번역 API
// Gemini API를 사용하여 한국어 공지를 5개국어로 번역

const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
    // CORS 헤더
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS 요청 처리
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
        const { title, content } = JSON.parse(event.body);

        if (!title || !content) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'title과 content가 필요합니다' })
            };
        }

        // Gemini API 초기화
        const apiKey = process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 번역 프롬프트
        const prompt = `You are a professional translator. Translate the following Korean notice into 4 languages: English, Japanese, Chinese (Simplified), and Vietnamese.

Keep the tone professional and appropriate for a service announcement.
Return ONLY a valid JSON object with no additional text, markdown, or explanation.

Korean Title: ${title}
Korean Content: ${content}

Return format (JSON only):
{
  "en": { "title": "English title", "content": "English content" },
  "ja": { "title": "Japanese title", "content": "Japanese content" },
  "zh": { "title": "Chinese title", "content": "Chinese content" },
  "vi": { "title": "Vietnamese title", "content": "Vietnamese content" }
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // JSON 파싱 (마크다운 코드블록 제거)
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }

        const translations = JSON.parse(jsonStr);

        // 결과 구성 (한국어 원본 포함)
        const result_data = {
            ko: { title, content },
            en: translations.en,
            ja: translations.ja,
            zh: translations.zh,
            vi: translations.vi
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                translations: result_data
            })
        };

    } catch (error) {
        console.error('Translation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '번역 중 오류가 발생했습니다',
                detail: error.message
            })
        };
    }
};
