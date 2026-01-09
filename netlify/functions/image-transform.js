// netlify/functions/image-transform.js
// Gemini 기반 의상/배경 변환 API
// REST API 직접 호출 방식 (이미지 생성 지원)
// Node.js 18+ 내장 fetch 사용

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

        // Gemini REST API 직접 호출 (이미지 생성 지원)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`;

        console.log('🚀 Gemini REST API 호출 중...');

        const requestBody = {
            contents: [{
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    { text: prompt }
                ]
            }],
            generationConfig: {
                temperature: 0.05,
                responseModalities: ['TEXT', 'IMAGE']
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await apiResponse.json();
        console.log('📥 Gemini API 응답 상태:', apiResponse.status);

        if (!apiResponse.ok) {
            console.error('❌ Gemini API 오류:', result);
            throw new Error(result.error?.message || 'Gemini API error');
        }

        // 응답에서 이미지 추출
        if (result.candidates && result.candidates[0]) {
            const parts = result.candidates[0].content?.parts || [];

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

            // 텍스트만 있는 경우
            const textPart = parts.find(p => p.text);
            if (textPart) {
                console.log('⚠️ Gemini 텍스트 응답:', textPart.text);
            }
        }

        console.log('⚠️ 전체 응답:', JSON.stringify(result, null, 2));
        throw new Error('Gemini API did not return an image - model may not support image generation');

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
