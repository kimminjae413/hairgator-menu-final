// netlify/functions/face-swap.js
// AI 얼굴변환 API (Face Swap)
// aimyapp-ai-video-server의 vmodelService.ts 참고
//
// 용도: 원본 사진의 헤어스타일은 유지하고, 얼굴만 참조 이미지로 교체
// - target_image: 헤어스타일 유지할 원본 사진
// - swap_image: 바꿔 넣을 참조 얼굴

const admin = require('firebase-admin');

// Firebase Admin 초기화
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
 */
async function uploadBase64ToStorage(base64Data, prefix = 'face-swap') {
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

        const imageType = matches[1];
        const imageData = matches[2];
        const buffer = Buffer.from(imageData, 'base64');

        // 고유 파일명 생성
        const fileName = `${prefix}-temp/${Date.now()}_${Math.random().toString(36).substring(7)}.${imageType}`;
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

        // 공개 URL 생성
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

// VModel Face Swap 모델 버전 ID (aimyapp에서 사용하는 얼굴변환용)
const FACE_SWAP_VERSION = 'a3c8d261fd14126eecef9812b52b408111e9ed557ccc57064528888cdeeebc0b6';

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
        if (!VMODEL_KEY) {
            throw new Error('VMODEL API key not configured');
        }

        // ========== action: 'start' - Task 생성 ==========
        if (action === 'start') {
            const { targetImage, swapImage } = body;

            if (!targetImage) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'targetImage is required (헤어스타일 유지할 원본 사진)' })
                };
            }

            if (!swapImage) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'swapImage is required (바꿔 넣을 참조 얼굴)' })
                };
            }

            console.log('🎭 얼굴변환 Task 생성 시작');
            console.log('📋 target (원본):', targetImage.substring(0, 50) + '...');
            console.log('📋 swap (참조얼굴):', swapImage.substring(0, 50) + '...');

            // base64 이미지인 경우 Firebase Storage에 업로드
            let finalTargetImage = targetImage;
            let finalSwapImage = swapImage;

            if (targetImage.startsWith('data:image')) {
                console.log('📤 target 이미지 업로드 중...');
                finalTargetImage = await uploadBase64ToStorage(targetImage, 'face-swap-target');
            }

            if (swapImage.startsWith('data:image')) {
                console.log('📤 swap 이미지 업로드 중...');
                finalSwapImage = await uploadBase64ToStorage(swapImage, 'face-swap-swap');
            }

            // vModel Task 생성
            const taskId = await createFaceSwapTask(finalTargetImage, finalSwapImage, VMODEL_KEY);
            console.log('📝 Task 생성됨:', taskId);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: 'processing',
                    taskId: taskId,
                    message: 'Face swap task created. Poll with action=status'
                })
            };
        }

        // ========== action: 'status' - 상태 확인 ==========
        if (action === 'status') {
            const { taskId } = body;

            if (!taskId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'taskId is required' })
                };
            }

            console.log('🎭 얼굴변환 상태 확인:', taskId);

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

            // 성공
            if (taskResult.status === 'succeeded') {
                if (!taskResult.output || taskResult.output.length === 0) {
                    throw new Error('얼굴변환 결과를 생성하지 못했습니다');
                }

                const resultImageUrl = taskResult.output[0];
                console.log('📸 얼굴변환 결과:', resultImageUrl);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        status: 'completed',
                        resultUrl: resultImageUrl,
                        taskId: taskId,
                        message: 'Face swap completed'
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

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Unknown action: ${action}` })
        };

    } catch (error) {
        console.error('🎭 얼굴변환 API 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Face swap failed',
                message: error.message
            })
        };
    }
};

/**
 * VModel Face Swap Task 생성
 * aimyapp-ai-video-server의 vmodelService.ts 방식
 */
async function createFaceSwapTask(targetImageUrl, swapImageUrl, apiKey) {
    const response = await fetch('https://api.vmodel.ai/api/tasks/v1/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: FACE_SWAP_VERSION,
            input: {
                target_image: targetImageUrl,  // 헤어스타일 유지할 원본 사진
                swap_image: swapImageUrl,      // 바꿔 넣을 참조 얼굴
                disable_safety_checker: false
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
 * Task 상태 조회
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
