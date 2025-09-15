const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
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
        // 요청 데이터 파싱
        const { method, prompt, imageData } = JSON.parse(event.body);
        
        // 환경변수에서 OpenAI API 키 가져오기
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'OpenAI API key not configured' })
            };
        }

        let response;

        if (method === 'edit' && imageData) {
            // 이미지 편집 모드
            const formData = new FormData();
            
            // Base64를 Blob으로 변환
            const base64Data = imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            
            formData.append('image', buffer, { filename: 'image.png' });
            formData.append('prompt', prompt);
            formData.append('model', 'dall-e-2'); // gpt-image-1이 edit을 지원하지 않으면 dall-e-2 사용
            formData.append('size', '1024x1024');
            formData.append('response_format', 'url');

            response = await fetch('https://api.openai.com/v1/images/edits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData
            });
        } else {
            // 이미지 생성 모드
            const requestBody = {
                model: 'dall-e-3', // gpt-image-1 대신 dall-e-3 사용 (더 안정적)
                prompt: prompt,
                size: '1024x1024',
                quality: 'standard',
                response_format: 'url',
                n: 1
            };

            response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        }

        const result = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: result.error || 'OpenAI API error' })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};
