// ========================================
// HAIRGATOR GPT Image 1 Netlify Function - GPT Image 1 전용 구현
// netlify/functions/openai-proxy.js - 얼굴 보존 최적화
// ========================================

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🎨 OpenAI Proxy 호출됨 (GPT Image 1 전용):', event.httpMethod);
    
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
        const { method, prompt, image, mask, quality, size, n, input_fidelity } = requestData;
        
        console.log('📋 요청 파라미터:', { 
            method, 
            hasPrompt: !!prompt, 
            hasImage: !!image, 
            hasMask: !!mask,
            input_fidelity 
        });
        
        // 테스트 요청 처리
        if (method === 'test') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'GPT Image 1 Function working', 
                    hasApiKey: !!process.env.OPENAI_API_KEY,
                    supportedMethods: ['generate', 'edit', 'test'],
                    model: 'gpt-image-1'
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

        // ========== GPT Image 1 이미지 편집 모드 (얼굴 보존) ==========
        if (method === 'edit') {
            console.log('🖼️ GPT Image 1 Edit 모드 실행 (얼굴 보존)');
            
            if (!image) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'image parameter is required for edit mode' })
                };
            }

            apiUrl = 'https://api.openai.com/v1/images/edits';
            
            // GPT Image 1용 FormData 생성
            const FormData = require('form-data');
            const formData = new FormData();
            
            // 모델 명시적 지정 (중요!)
            formData.append('model', 'gpt-image-1');
            
            // 얼굴 보존을 위한 핵심 설정
            formData.append('input_fidelity', input_fidelity || 'high');
            
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
            
            // 이미지는 배열 형태로 전송 (GPT Image 1 방식)
            formData.append('image[]', imageBuffer, { 
                filename: 'image.png', 
                contentType: 'image/png' 
            });
            
            formData.append('prompt', prompt);
            formData.append('n', n || 1);
            formData.append('size', size || '1024x1024');
            formData.append('quality', quality || 'high');
            formData.append('output_format', 'png');
            
            // 마스크가 있으면 추가
            if (mask) {
                let maskBuffer;
                if (mask.startsWith('data:image/')) {
                    const base64Data = mask.split(',')[1];
                    maskBuffer = Buffer.from(base64Data, 'base64');
                    formData.append('mask', maskBuffer, { 
                        filename: 'mask.png', 
                        contentType: 'image/png' 
                    });
                }
            }

            console.log('📤 GPT Image 1 Edit API 호출 중...');
            
            openaiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

        // ========== GPT Image 1 이미지 생성 모드 ==========
        } else if (method === 'generate') {
            console.log('✨ GPT Image 1 Generate 모드 실행');
            
            apiUrl = 'https://api.openai.com/v1/images/generations';
            
            requestBody = {
                model: 'gpt-image-1',  // GPT Image 1 명시적 지정
                prompt: prompt,
                size: size || '1024x1024',
                quality: quality || 'high',
                output_format: 'png',
                n: n || 1
            };

            console.log('📤 GPT Image 1 Generate API 호출 중...');

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
        console.log('📊 응답 데이터:', JSON.stringify(result, null, 2));
        
        if (!openaiResponse.ok) {
            console.error('❌ OpenAI API 오류:', result);
            return {
                statusCode: openaiResponse.status,
                headers,
                body: JSON.stringify({
                    error: result.error || { 
                        message: `OpenAI API 오류 (${openaiResponse.status})`,
                        type: 'api_error',
                        details: result
                    }
                })
            };
        }

        // GPT Image 1은 base64로 응답하므로 URL 변환 필요할 수 있음
        if (result.data && result.data[0] && result.data[0].b64_json) {
            console.log('🔄 Base64 이미지를 URL로 변환 중...');
            // Base64를 data URL로 변환
            result.data[0].url = `data:image/png;base64,${result.data[0].b64_json}`;
        }

        // 성공 응답
        console.log('✅ GPT Image 1 성공:', result.data?.length || 0, '개 이미지 생성');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('❌ Function 오류:', error.message);
        console.error('🔍 스택 트레이스:', error.stack);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: {
                    message: error.message || 'Internal server error',
                    type: 'function_error',
                    stack: error.stack
                }
            })
        };
    }
};
