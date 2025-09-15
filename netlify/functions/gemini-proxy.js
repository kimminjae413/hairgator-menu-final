// netlify/functions/gemini-proxy.js
exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS 요청 처리 (CORS 프리플라이트)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    // POST 요청만 허용
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // 환경변수에서 API 키 가져오기
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: '서버에 API 키가 설정되지 않았습니다' 
                })
            };
        }

        // 클라이언트에서 전달받은 요청 데이터
        const requestData = JSON.parse(event.body);
        
        console.log('제미나이 프록시 요청:', {
            hasImageData: !!requestData.imageBase64,
            colorCount: requestData.colorRecommendations?.length || 0
        });

        // 제미나이 API 호출
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: requestData.prompt
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: requestData.imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('제미나이 API 오류:', response.status, errorText);
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `제미나이 API 오류: ${response.status}`,
                    details: errorText
                })
            };
        }

        const result = await response.json();
        
        console.log('제미나이 응답 성공:', {
            candidatesCount: result.candidates?.length || 0
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                result: result,
                colorRecommendations: requestData.colorRecommendations
            })
        };

    } catch (error) {
        console.error('제미나이 프록시 에러:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: '서버 처리 중 오류가 발생했습니다',
                details: error.message
            })
        };
    }
};
