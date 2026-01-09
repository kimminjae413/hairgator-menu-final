// netlify/functions/image-transform.js
// Gemini 기반 의상/배경 변환 API
// aimyapp-ai-video-server의 geminiService.ts 참고

const { GoogleGenerativeAI } = require('@google/generative-ai');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// 스마트 변환 프롬프트 생성
function getSmartModificationPrompt(combinedPrompt) {
    const hasClothing = combinedPrompt.toLowerCase().includes('clothing:');
    const hasBackground = combinedPrompt.toLowerCase().includes('background:');

    let modificationTarget = 'nothing';
    if (hasClothing && hasBackground) {
        modificationTarget = 'clothing AND background';
    } else if (hasClothing) {
        modificationTarget = 'ONLY clothing';
    } else if (hasBackground) {
        modificationTarget = 'ONLY background';
    }

    return `You are an expert image editor. Your task is to modify ONLY specific elements while preserving everything else.

MODIFICATION INSTRUCTIONS:
${combinedPrompt}

STRICT PRESERVATION RULES (CRITICAL):
1. HAIR: Preserve 100% - exact same hairstyle, color, texture, volume, parting, shine
2. FACE: Preserve 100% - exact same facial features, expression, skin tone, makeup
3. BODY POSE: Preserve 100% - exact same position, angle, posture

MODIFICATION TARGET: ${modificationTarget}

${hasClothing ? `
- CLOTHING: Change according to Clothing instruction
- Modify clothing style, color, pattern as specified
- Keep clothing within existing frame boundaries
` : ''}
${hasBackground ? `
- BACKGROUND: Change according to Background instruction
- Modify background scenery, wall, environment as specified
` : ''}
${!hasClothing ? `
- CLOTHING: DO NOT change clothing at all - keep identical
` : ''}
${!hasBackground ? `
- BACKGROUND: DO NOT change background at all - keep identical
` : ''}

MUST PRESERVE (DO NOT CHANGE):
- Hair style, color, and texture
- Facial features and expression
- Body pose and position
- Image crop and camera angle
- Lighting direction

IMPORTANT: Only modify what is explicitly mentioned in the instructions above. Everything else must remain pixel-perfect identical.`;
}

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
        const { imageBase64, clothingPrompt, backgroundPrompt } = body;

        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'imageBase64 is required' })
            };
        }

        if (!clothingPrompt && !backgroundPrompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'clothingPrompt or backgroundPrompt is required' })
            };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            throw new Error('GEMINI API key not configured');
        }

        console.log('🎨 이미지 변환 시작');
        console.log('- 의상 프롬프트:', clothingPrompt || '없음');
        console.log('- 배경 프롬프트:', backgroundPrompt || '없음');

        // 프롬프트 생성
        let combinedPrompt = '';
        if (clothingPrompt && backgroundPrompt) {
            combinedPrompt = `Clothing: ${clothingPrompt}. Background: ${backgroundPrompt}.`;
        } else if (clothingPrompt) {
            combinedPrompt = `Clothing: ${clothingPrompt}.`;
        } else if (backgroundPrompt) {
            combinedPrompt = `Background: ${backgroundPrompt}.`;
        }

        const prompt = getSmartModificationPrompt(combinedPrompt);

        // base64 데이터 추출
        let base64Data = imageBase64;
        let mimeType = 'image/jpeg';

        if (imageBase64.startsWith('data:')) {
            const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s);
            if (matches) {
                mimeType = `image/${matches[1]}`;
                base64Data = matches[2];
            }
        }

        // Gemini API 호출
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.05,
            }
        });

        console.log('🚀 Gemini API 호출 중...');

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            },
            { text: prompt }
        ]);

        const response = result.response;

        // 응답에서 이미지 추출
        if (response.candidates && response.candidates[0]) {
            const parts = response.candidates[0].content.parts;

            for (const part of parts) {
                if (part.inlineData) {
                    const resultBase64 = part.inlineData.data;
                    const resultMimeType = part.inlineData.mimeType || 'image/png';

                    console.log('✅ 이미지 변환 완료');

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            resultImage: `data:${resultMimeType};base64,${resultBase64}`,
                            message: 'Image transformation completed'
                        })
                    };
                }
            }
        }

        // 이미지가 없으면 텍스트 응답 확인
        const textResponse = response.text();
        console.log('⚠️ Gemini 텍스트 응답:', textResponse);

        throw new Error('Gemini API did not return an image');

    } catch (error) {
        console.error('🎨 이미지 변환 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Image transformation failed',
                message: error.message
            })
        };
    }
};
