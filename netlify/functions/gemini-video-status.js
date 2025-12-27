/**
 * Gemini Video Status Polling
 * 영상 생성 작업 상태 확인
 */

const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

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
        const { operationName } = JSON.parse(event.body);

        if (!operationName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'operationName이 필요합니다' })
            };
        }

        const apiKey = process.env.GEMINI_VIDEO_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다' })
            };
        }

        const genAI = new GoogleGenAI({ apiKey });

        // 작업 상태 확인
        const operation = await genAI.operations.get({ name: operationName });

        if (!operation) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: '작업을 찾을 수 없습니다' })
            };
        }

        // 작업 완료
        if (operation.done) {
            // 에러 발생
            if (operation.error) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        done: true,
                        error: operation.error.message || '영상 생성 실패'
                    })
                };
            }

            // 성공 - 영상 URL 추출
            const result = operation.response;
            if (result && result.generatedVideos && result.generatedVideos.length > 0) {
                const video = result.generatedVideos[0];
                const videoUrl = video.video?.uri || video.uri;

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        done: true,
                        videoUrl: videoUrl,
                        // Base64 데이터가 있으면 함께 반환
                        videoData: video.video?.videoBytes
                    })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    done: true,
                    error: '영상 데이터를 찾을 수 없습니다'
                })
            };
        }

        // 아직 처리 중
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                done: false,
                status: 'processing',
                message: '영상 생성 중입니다...'
            })
        };

    } catch (error) {
        console.error('Gemini Video Status Error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || '상태 확인 중 오류가 발생했습니다'
            })
        };
    }
};
