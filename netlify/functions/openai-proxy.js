// ========================================
// HAIRGATOR GPT Image 1 Netlify Function - 얼굴 보존 모드 지원
// netlify/functions/openai-proxy.js - 최종 수정 버전
// ========================================

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🎨 OpenAI Proxy 호출됨:', event.httpMethod);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // CORS 프리플라이트 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // POST 메서드만 허용
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const requestData = JSON.parse(event.body);
        const { method, prompt, image, mask, quality, size, n } = requestData;
        
        console.log('📋 요청 파라미터:', { method, hasPrompt: !!prompt, hasImage: !!image, hasMask: !!mask });
        
        // 테스트 요청 처리
        if (method === 'test') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'Function working', 
                    hasApiKey: !!process.env.OPENAI_API_KEY,
                    supportedMethods: ['generate', 'edit', 'test']
                })
            };
        }

        // API 키 확인
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'OpenAI API key not configured' })
            };
        }

        // prompt 필수 체크
        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'prompt parameter is required' })
            };
        }

        let apiUrl, requestBody, openaiResponse;

        // ========== 이미지 편집 모드 (얼굴 보존용) ==========
        if (method === 'edit') {
            console.log('🖼️ Edit 모드 실행 (얼굴 보존)');
            
            if (!image) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'image parameter is required for edit mode' })
                };
            }

            apiUrl = 'https://api.openai.com/v1/images/edits';
            
            // FormData 생성 (이미지 편집은 multipart/form-data 필요)
            const FormData = require('form-data');
            const formData = new FormData();
            
            // Base64 이미지를 Buffer로 변환
            let imageBuffer;
            if (image.startsWith('data:image/')) {
                const base64Data = image.split(',')[1];
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                // URL인 경우 fetch해서 가져오기
                const imageResponse = await fetch(image);
                imageBuffer = await imageResponse.buffer();
            }
            
            formData.append('image', imageBuffer, { filename: 'image.png', contentType: 'image/png' });
            formData.append('prompt', prompt);
            formData.append('n', n || 1);
            formData.append('size', size || '1024x1024');
            
            // 마스크가 있으면 추가
            if (mask) {
                let maskBuffer;
                if (mask.startsWith('data:image/')) {
                    const base64Data = mask.split(',')[1];
                    maskBuffer = Buffer.from(base64Data, 'base64');
                    formData.append('mask', maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
                }
            }

            openaiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

        // ========== 이미지 생성 모드 ==========
        } else if (method === 'generate') {
            console.log('✨ Generate 모드 실행');
            
            apiUrl = 'https://api.openai.com/v1/images/generations';
            
            requestBody = {
                model: 'dall-e-3',
                prompt: prompt,
                size: size || '1024x1024',
                quality: quality || 'standard',
                response_format: 'url',
                n: n || 1
            };

            openaiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid method. Supported methods: generate, edit, test' 
                })
            };
        }

        // OpenAI API 응답 처리
        const result = await openaiResponse.json();
        
        console.log('📤 OpenAI 응답 상태:', openaiResponse.status);
        
        if (!openaiResponse.ok) {
            console.error('❌ OpenAI API 오류:', result);
            return {
                statusCode: openaiResponse.status,
                headers,
                body: JSON.stringify({
                    error: result.error || { 
                        message: `OpenAI API 오류 (${openaiResponse.status})`,
                        type: 'api_error'
                    }
                })
            };
        }

        // 성공 응답
        console.log('✅ 성공:', result.data?.length || 0, '개 이미지 생성');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('❌ Function 오류:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: {
                    message: error.message || 'Internal server error',
                    type: 'function_error'
                }
            })
        };
    }
};
