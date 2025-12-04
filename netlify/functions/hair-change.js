// netlify/functions/hair-change.js
// HAIRGATOR Hair Change API (헤어체험)
//
// Vmodel Tasks API를 통해 사용자 사진에 헤어스타일을 적용합니다.
// 비동기 방식: Task 생성 → 폴링으로 결과 확인

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// AI Hairstyle 모델 버전 ID
const HAIR_SWAP_VERSION = '5c0440717a995b0bbd93377bd65dbb4fe360f67967c506aa6bd8f6b660733a7e';

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
        const API_KEY = process.env.VMODEL_API_KEY;
        if (!API_KEY) {
            throw new Error('API key not configured');
        }


        console.log('💇 헤어체험 API 호출 시작');
        console.log('📋 고객 사진:', customerPhotoUrl);
        console.log('📋 스타일 이미지:', styleImageUrl);

        // 1. Task 생성
        const taskId = await createTask(customerPhotoUrl, styleImageUrl, API_KEY);
        console.log('📝 Task 생성됨:', taskId);

        // 2. 결과 폴링 (최대 24초 대기 - Netlify 26초 타임아웃 고려)
        const result = await pollTaskResult(taskId, API_KEY, 24000);
        console.log('✅ Task 완료:', result.status);

        if (result.status === 'succeeded' && result.output && result.output.length > 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    resultImageUrl: result.output[0],
                    taskId: taskId,
                    message: 'Hair change completed successfully'
                })
            };
        } else {
            throw new Error(result.error || 'Task failed without output');
        }

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
async function pollTaskResult(taskId, apiKey, timeout = 24000) {
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
