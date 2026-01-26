// netlify/functions/hair-change.js
// HAIRGATOR Hair Change API (헤어체험)
//
// 비동기 2단계 처리 (Netlify 10초 타임아웃 회피):
// 1. action: 'start' - vModel Task 생성 후 taskId 반환 (빠름)
// 2. action: 'status' - taskId로 상태 확인, 성공 시 Gemini 후처리

const admin = require('firebase-admin');
const { validateUserAndTokens, deductTokens } = require('./lib/auth-utils');

// Firebase Admin 초기화 함수
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.apps[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Firebase 환경변수 누락');
        return null;
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
        }),
        storageBucket: `${projectId}.firebasestorage.app`
    });
}

/**
 * Base64 이미지를 Firebase Storage에 업로드하고 공개 URL 반환
 * @param {string} base64Data - data:image/jpeg;base64,... 형식
 * @returns {Promise<string>} - 공개 접근 가능한 URL
 */
async function uploadBase64ToStorage(base64Data) {
    try {
        const app = initializeFirebaseAdmin();
        if (!app) {
            throw new Error('Firebase 초기화 실패');
        }

        const bucket = admin.storage().bucket();

        // base64 데이터 추출
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid base64 image format');
        }

        const imageType = matches[1]; // jpeg, png, etc.
        const imageData = matches[2];
        const buffer = Buffer.from(imageData, 'base64');

        // 고유 파일명 생성
        const fileName = `hair-try-temp/${Date.now()}_${Math.random().toString(36).substring(7)}.${imageType}`;
        const file = bucket.file(fileName);

        // 업로드
        await file.save(buffer, {
            metadata: {
                contentType: `image/${imageType}`,
                metadata: {
                    firebaseStorageDownloadTokens: 'public'
                }
            }
        });

        // 공개 URL 생성 (Firebase Storage 형식)
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const encodedFileName = encodeURIComponent(fileName);
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${projectId}.firebasestorage.app/o/${encodedFileName}?alt=media`;

        console.log('📤 이미지 업로드 완료:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('❌ 이미지 업로드 실패:', error.message);
        throw error;
    }
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// AI Hairstyle 모델 버전 ID
const HAIR_SWAP_VERSION = '5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e';

// Gemini 이미지 생성 모델
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

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
        const body = JSON.parse(event.body);
        const action = body.action || 'start';

        // API 키 확인
        const VMODEL_KEY = process.env.VMODEL_API_KEY;
        const GEMINI_KEY = process.env.GEMINI_API_KEY;

        if (!VMODEL_KEY) {
            throw new Error('VMODEL API key not configured');
        }
        if (!GEMINI_KEY) {
            throw new Error('GEMINI API key not configured');
        }

        // ========== action: 'start' - Task 생성만 ==========
        if (action === 'start') {
            const { customerPhotoUrl, styleImageUrl, gender = 'male', userId = '' } = body;

            // ⭐ 서버 측 토큰 검증 (API 비용 낭비 방지)
            if (userId) {
                const validation = await validateUserAndTokens(userId, 'hairTry');
                if (!validation.success || !validation.canUse) {
                    console.log('❌ 헤어체험 토큰 부족:', userId, validation);
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({
                            error: 'INSUFFICIENT_TOKENS',
                            message: validation.error || '토큰이 부족합니다',
                            currentBalance: validation.currentBalance || 0,
                            requiredTokens: validation.requiredTokens || 350
                        })
                    };
                }
                console.log('✅ 헤어체험 토큰 검증 통과:', userId, '잔액:', validation.currentBalance);
            }

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

            console.log('💇 헤어체험 Task 생성 시작');
            console.log('📋 고객 사진 길이:', customerPhotoUrl.length, '(base64:', customerPhotoUrl.startsWith('data:image'), ')');
            console.log('📋 스타일 이미지:', styleImageUrl);
            console.log('📋 성별:', gender);

            // base64 이미지인 경우 Firebase Storage에 업로드
            let finalCustomerPhotoUrl = customerPhotoUrl;
            if (customerPhotoUrl.startsWith('data:image')) {
                console.log('📤 base64 이미지를 Firebase Storage에 업로드 중...');
                finalCustomerPhotoUrl = await uploadBase64ToStorage(customerPhotoUrl);
                console.log('✅ 업로드 완료:', finalCustomerPhotoUrl);
            }

            // vModel Task 생성
            const taskId = await createTask(finalCustomerPhotoUrl, styleImageUrl, VMODEL_KEY);
            console.log('📝 Task 생성됨:', taskId);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: 'processing',
                    taskId: taskId,
                    message: 'Hair change task created. Poll with action=status'
                })
            };
        }

        // ========== action: 'status' - 상태 확인 + 후처리 ==========
        if (action === 'status') {
            const { taskId, gender = 'male', userId = '' } = body;

            if (!taskId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'taskId is required' })
                };
            }

            console.log('💇 헤어체험 상태 확인:', taskId);

            // vModel 상태 조회 (폴링 없이 1회 조회)
            const taskResult = await getTaskStatus(taskId, VMODEL_KEY);
            console.log('📊 Task 상태:', taskResult.status);

            // 아직 처리 중
            if (taskResult.status === 'starting' || taskResult.status === 'processing') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        status: 'processing',
                        taskId: taskId,
                        message: 'Still processing...'
                    })
                };
            }

            // 실패
            if (taskResult.status === 'failed' || taskResult.status === 'canceled') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        status: 'failed',
                        taskId: taskId,
                        message: taskResult.error || 'Task failed'
                    })
                };
            }

            // 성공 - Gemini 후처리 진행
            if (taskResult.status === 'succeeded') {
                if (!taskResult.output || taskResult.output.length === 0) {
                    throw new Error('헤어체험 결과를 생성하지 못했습니다');
                }

                const vmodelImageUrl = taskResult.output[0];
                console.log('📸 vModel 결과:', vmodelImageUrl);

                // Gemini 후처리
                console.log('🔄 Gemini 후처리 시작...');
                const enhancedImageBase64 = await enhanceWithGemini(vmodelImageUrl, gender, GEMINI_KEY);

                // ⭐ 서버 측 토큰 차감 (성공 시에만)
                let tokenDeducted = false;
                if (userId) {
                    const deductResult = await deductTokens(userId, 'hairTry', { taskId });
                    if (deductResult.success) {
                        console.log('💳 헤어체험 토큰 차감 완료:', userId, deductResult.newBalance, '남음');
                        tokenDeducted = true;
                    } else {
                        console.warn('⚠️ 헤어체험 토큰 차감 실패:', deductResult.error);
                    }
                }

                if (!enhancedImageBase64) {
                    // Gemini 후처리 실패 시 vModel 결과 반환
                    console.log('⚠️ Gemini 후처리 실패, vModel 결과 반환');
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            status: 'completed',
                            resultImageUrl: vmodelImageUrl,
                            taskId: taskId,
                            enhanced: false,
                            tokenDeducted: tokenDeducted,
                            message: 'Hair change completed (without enhancement)'
                        })
                    };
                }

                console.log('✅ Gemini 후처리 완료');
                const resultDataUrl = `data:image/png;base64,${enhancedImageBase64}`;

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        status: 'completed',
                        resultImageUrl: resultDataUrl,
                        taskId: taskId,
                        enhanced: true,
                        tokenDeducted: tokenDeducted,
                        message: 'Hair change completed with Gemini enhancement'
                    })
                };
            }

            // 알 수 없는 상태
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    status: 'unknown',
                    taskId: taskId,
                    message: `Unknown status: ${taskResult.status}`
                })
            };
        }

        // 알 수 없는 action
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Unknown action: ${action}` })
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
            ? `- For long hair: ensure hair ends are sharp and clear, not blurry or smudged
- Each strand should be distinct, especially at the tips`
            : `- For short hair: ensure clean edges around the hairline and sideburns`;

        // 후처리 프롬프트
        const prompt = `You are a photo retouching expert. Your task is to make this hair swap photo look natural.

#1 PRIORITY - HAIR-FACE HARMONY (MOST IMPORTANT):
- Make the hair blend NATURALLY with the face and skin tone
- Adjust the lighting and shadows so hair and face look like one unified photo
- The hairline where hair meets forehead/skin must look completely seamless
- Match the color temperature between hair and face

#2 PRIORITY - DO NOT MODIFY THE HAIRSTYLE:
- Keep the EXACT same hairstyle shape, length, and style
- Do NOT change the hair color
- Do NOT change the hair volume or direction
- Do NOT add or remove any hair

#3 PRIORITY - Natural Realism:
- Hair texture should look like real human hair
- Remove any artificial/AI-generated artifacts
- Ensure consistent lighting across the entire image
${genderSpecificPrompt}

ABSOLUTELY DO NOT CHANGE:
- The person's face, facial features, expression
- The hairstyle shape, length, color, volume
- The background
- The clothing

OUTPUT: The same photo with improved hair-face integration. The hair must look like it naturally belongs to this person.`;

        // Gemini REST API 호출
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
                const imageData = part.inlineData || part.inline_data;
                if (imageData && imageData.data) {
                    console.log('🎨 Gemini 이미지 생성 성공, mimeType:', imageData.mimeType);
                    return imageData.data;
                }
            }
        }

        console.log('⚠️ Gemini 응답에 이미지 없음');
        return null;

    } catch (error) {
        console.error('❌ Gemini 후처리 오류:', error.message);
        return null;
    }
}

/**
 * Vmodel Task 생성
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
                source: styleImageUrl,     // 헤어스타일 참조 이미지
                target: customerPhotoUrl   // 고객 사진
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
 * Task 상태 조회 (1회만, 폴링 없음)
 */
async function getTaskStatus(taskId, apiKey) {
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
        return result.result;
    } else {
        throw new Error(result.message?.en || 'Task query failed');
    }
}
