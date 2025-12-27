/**
 * Gemini Veo 2 Video Generation Proxy
 * 이미지를 영상으로 변환하는 API
 */

const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event) => {
    // CORS
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
        const { images, prompt, duration = 5, aspectRatio = '9:16', lastFrameImage } = JSON.parse(event.body);

        if (!images || images.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '이미지가 필요합니다' })
            };
        }

        // 5초 또는 8초만 지원
        if (duration !== 5 && duration !== 8) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '영상 길이는 5초 또는 8초만 가능합니다' })
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

        // 이미지 준비
        const imageContents = images.map(base64 => ({
            inlineData: {
                mimeType: 'image/png',
                data: base64
            }
        }));

        // 마지막 프레임 이미지 (보간용)
        if (lastFrameImage) {
            imageContents.push({
                inlineData: {
                    mimeType: 'image/png',
                    data: lastFrameImage
                }
            });
        }

        // Veo 2 모델로 영상 생성
        const response = await genAI.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt || '자연스럽게 움직이는 모습',
            image: imageContents[0],
            ...(lastFrameImage && { lastFrame: imageContents[imageContents.length - 1] }),
            config: {
                videoDuration: `${duration}s`,
                aspectRatio: aspectRatio,
                numberOfVideos: 1
            }
        });

        // 비동기 작업 - 작업 이름 반환
        if (response.name) {
            return {
                statusCode: 202,
                headers,
                body: JSON.stringify({
                    success: true,
                    operationName: response.name,
                    estimatedTime: duration === 5 ? '3-5분' : '5-8분',
                    message: '영상 생성이 시작되었습니다. 상태를 폴링해주세요.'
                })
            };
        }

        // 즉시 결과 반환 (일반적이지 않음)
        if (response.generatedVideos && response.generatedVideos.length > 0) {
            const video = response.generatedVideos[0];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    done: true,
                    videoUrl: video.video?.uri || video.uri,
                    videoData: video.video?.videoBytes
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '영상 생성에 실패했습니다' })
        };

    } catch (error) {
        console.error('Gemini Video Proxy Error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || '영상 생성 중 오류가 발생했습니다',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
