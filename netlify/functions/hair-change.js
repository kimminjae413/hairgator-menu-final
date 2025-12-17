// netlify/functions/hair-change.js
// HAIRGATOR Hair Change API (헤어체험)
//
// 2단계 처리:
// 1. Vmodel Tasks API - 헤어스타일 합성
// 2. Gemini Image Generation - 자연스러운 후처리

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// AI Hairstyle 모델 버전 ID
const HAIR_SWAP_VERSION = '5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e';

// Gemini 이미지 생성 모델
// gemini-2.0-flash-preview-image-generation: 빠른 이미지 생성
// 실패 시 gemini-2.5-flash-image 또는 imagen-3.0-generate-001 시도
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

exports.handler = async (event) => {
    // CORS preflight
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
        const {
            customerPhotoUrl,      // 고객 사진 URL (Firebase Storage 등)
            styleImageUrl,         // 적용할 헤어스타일 이미지 URL
            gender = 'male'        // 성별 (후처리 프롬프트 조정용)
        } = JSON.parse(event.body);

        if (!customerPhotoUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'customerPhotoUrl is required' })
            };
        }

        if (!styleImageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'styleImageUrl is required' })
            };
        }

        // API 키 확인
        const VMODEL_KEY = process.env.VMODEL_API_KEY;
        const GEMINI_KEY = process.env.GEMINI_API_KEY;

        if (!VMODEL_KEY) {
            throw new Error('VMODEL API key not configured');
        }
        if (!GEMINI_KEY) {
            throw new Error('GEMINI API key not configured');
        }

        console.log('💇 헤어체험 API 호출 시작 (2단계 처리)');
        console.log('📋 고객 사진:', customerPhotoUrl);
        console.log('📋 스타일 이미지:', styleImageUrl);
        console.log('📋 성별:', gender);

        // ========== 1단계: vModel 헤어 합성 ==========
        console.log('\n🔄 [1단계] vModel 헤어 합성 시작...');
        const taskId = await createTask(customerPhotoUrl, styleImageUrl, VMODEL_KEY);
        console.log('📝 Task 생성됨:', taskId);

        const vmodelResult = await pollTaskResult(taskId, VMODEL_KEY, 20000);
        console.log('✅ vModel 완료:', vmodelResult.status);

        if (vmodelResult.status !== 'succeeded' || !vmodelResult.output || vmodelResult.output.length === 0) {
            throw new Error(vmodelResult.error || 'vModel task failed');
        }

        const vmodelImageUrl = vmodelResult.output[0];
        console.log('📸 vModel 결과:', vmodelImageUrl);

        // ========== 2단계: Gemini 후처리 ==========
        console.log('\n🔄 [2단계] Gemini 후처리 시작...');
        const enhancedImageBase64 = await enhanceWithGemini(vmodelImageUrl, gender, GEMINI_KEY);

        if (!enhancedImageBase64) {
            // Gemini 후처리 실패 시 vModel 결과 반환
            console.log('⚠️ Gemini 후처리 실패, vModel 결과 반환');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    resultImageUrl: vmodelImageUrl,
                    taskId: taskId,
                    enhanced: false,
                    message: 'Hair change completed (without enhancement)'
                })
            };
        }

        console.log('✅ Gemini 후처리 완료');

        // Base64 데이터 URL로 반환
        const resultDataUrl = `data:image/png;base64,${enhancedImageBase64}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                resultImageUrl: resultDataUrl,
                taskId: taskId,
                enhanced: true,
                message: 'Hair change completed with Gemini enhancement'
            })
        };

    } catch (error) {
        console.error('💇 헤어체험 API 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Hair change failed',
                message: error.message
            })
        };
    }
};

/**
 * Gemini로 헤어 이미지 후처리 (REST API 직접 호출)
 * @param {string} imageUrl - vModel 결과 이미지 URL
 * @param {string} gender - 성별 (male/female)
 * @param {string} apiKey - Gemini API 키
 * @returns {string|null} - Base64 이미지 데이터 또는 null
 */
async function enhanceWithGemini(imageUrl, gender, apiKey) {
    try {
        // 이미지 다운로드
        console.log('📥 vModel 결과 이미지 다운로드...');
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Image download failed: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        console.log('✅ 이미지 다운로드 완료, 크기:', Math.round(imageBuffer.byteLength / 1024), 'KB');

        // 성별에 따른 프롬프트 조정
        const genderSpecificPrompt = gender === 'female'
            ? `- CRITICAL: The hair ends must be sharp, clear, and well-defined - NOT blurry, smudged, or faded
- Each individual strand of hair should be visible and distinct, especially at the tips
- Long hair should have natural flow and movement with crisp, detailed ends
- Fix any fuzzy or pixelated areas in the hair`
            : `- Ensure clean, sharp edges around the hairline and sideburns
- Short hair should have natural texture, volume, and defined styling`;

        // 후처리 프롬프트
        const prompt = `Enhance and retouch this AI-generated hair swap photo to look completely natural and photorealistic.

CRITICAL REQUIREMENTS:
1. HAIR-FACE BLENDING: Make the hair blend seamlessly with the face, skin tone, and lighting
2. REALISTIC HAIR TEXTURE: The hair must look like real human hair with natural shine, highlights, and shadows
3. CONSISTENT LIGHTING: Match the lighting and shadows between hair and face perfectly
4. SHARP DETAILS: All hair must be crisp, sharp, and well-defined - remove any artificial blur or fuzziness
5. NATURAL HAIRLINE: The hairline where hair meets forehead/face must look completely natural
${genderSpecificPrompt}

PRESERVE (DO NOT CHANGE):
- The person's face, facial features, and expression
- The overall hairstyle shape and style
- The background
- The person's clothing

OUTPUT: A single enhanced photo that looks like a professional photograph, not AI-generated.`;

        // Gemini REST API 호출 (이미지 생성 모델)
        console.log('🤖 Gemini API 호출 중...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: imageBase64
                                }
                            },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE'],
                        temperature: 0.4
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API Error:', response.status, errorText);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('📄 Gemini 응답 수신');

        // 응답에서 이미지 추출
        if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inline_data && part.inline_data.data) {
                    console.log('🎨 Gemini 이미지 생성 성공');
                    return part.inline_data.data;
                }
            }
        }

        console.log('⚠️ Gemini 응답에 이미지 없음:', JSON.stringify(data).substring(0, 500));
        return null;

    } catch (error) {
        console.error('❌ Gemini 후처리 오류:', error.message);
        return null;
    }
}

/**
 * Vmodel Task 생성
 * @param {string} customerPhotoUrl - 고객 사진 URL
 * @param {string} styleImageUrl - 헤어스타일 이미지 URL
 * @param {string} apiKey - API 키
 * @returns {string} - task_id
 */
async function createTask(customerPhotoUrl, styleImageUrl, apiKey) {
    const response = await fetch('https://api.vmodel.ai/api/tasks/v1/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: HAIR_SWAP_VERSION,
            input: {
                source: styleImageUrl,     // 헤어스타일 참조 이미지 (적용할 헤어)
                target: customerPhotoUrl   // 바꾸고 싶은 사람 사진 (고객 사진)
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Task 생성 오류:', response.status, errorText);
        throw new Error(`Task creation failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Task 생성 응답:', JSON.stringify(result));

    if (result.code === 200 && result.result && result.result.task_id) {
        return result.result.task_id;
    } else {
        throw new Error(result.message?.en || 'Task creation failed');
    }
}

/**
 * Task 결과 폴링
 * @param {string} taskId - Task ID
 * @param {string} apiKey - API 키
 * @param {number} timeout - 최대 대기 시간 (ms)
 * @returns {Object} - Task 결과
 */
async function pollTaskResult(taskId, apiKey, timeout = 20000) {
    const startTime = Date.now();
    const pollInterval = 2000; // 2초마다 폴링

    while (Date.now() - startTime < timeout) {
        const response = await fetch(`https://api.vmodel.ai/api/tasks/v1/get/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Task 조회 오류:', response.status, errorText);
            throw new Error(`Task query failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.code === 200 && result.result) {
            const task = result.result;
            console.log(`📊 Task 상태: ${task.status} (${Math.round((Date.now() - startTime) / 1000)}초 경과)`);

            if (task.status === 'succeeded') {
                return task;
            } else if (task.status === 'failed') {
                throw new Error(task.error || 'Task failed');
            } else if (task.status === 'canceled') {
                throw new Error('Task was canceled');
            }
            // starting, processing 상태면 계속 폴링
        }

        // 다음 폴링까지 대기
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Task timeout - exceeded maximum wait time');
}
