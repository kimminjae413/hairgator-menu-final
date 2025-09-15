exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
        const { prompt, imageData, method } = JSON.parse(event.body);
        
        // Netlify 환경변수에서 API 키 가져오기
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }

        let apiUrl, requestBody;
        
        if (method === 'edit') {
            // 이미지 편집
            apiUrl = 'https://api.openai.com/v1/images/edits';
            requestBody = {
                prompt: prompt,
                image: imageData,
                model: 'gpt-image-1',
                size: '1024x1024',
                response_format: 'url'
            };
        } else {
            // 이미지 생성
            apiUrl = 'https://api.openai.com/v1/images/generations';
            requestBody = {
                model: 'gpt-image-1',
                prompt: prompt,
                size: '1024x1024',
                quality: 'hd',
                style: 'natural',
                response_format: 'url',
                n: 1
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
