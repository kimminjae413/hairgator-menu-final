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

    return `You are a photo retouching expert. Edit this image with MINIMAL changes.

TASK: ${combinedPrompt}

⚠️ CRITICAL - DO NOT CHANGE THESE (MUST BE PIXEL-PERFECT IDENTICAL):
1. HAIRSTYLE - Keep exact same hair: style, color, texture, volume, parting, highlights, every strand
2. FACE - Keep exact same: facial features, expression, skin tone, makeup, face angle
3. HEAD/BODY ANGLE - Keep exact same pose and camera angle. DO NOT rotate or tilt.
4. IMAGE COMPOSITION - Keep same framing, crop, aspect ratio
5. LIGHTING - Keep same lighting direction and intensity

${hasClothing ? `
✅ CLOTHING CHANGE:
- Replace ONLY the visible clothing with: ${combinedPrompt.match(/Clothing:\s*([^.]+)/i)?.[1] || 'new clothing'}
- Keep the SAME neckline position on the body
- Do NOT add extra layers or accessories
- Do NOT change the body pose or angle
- Match the lighting of the original clothing
` : `
❌ CLOTHING: Keep exactly as-is, do not modify
`}

${hasBackground ? `
✅ BACKGROUND CHANGE:
- Replace ONLY the background with: ${combinedPrompt.match(/Background:\s*([^.]+)/i)?.[1] || 'new background'}
- Keep person in exact same position
- Match lighting naturally
` : `
❌ BACKGROUND: Keep exactly as-is, do not modify
`}

FINAL CHECK: The output image should look like the same photo with only the specified element changed. Hair and face must be IDENTICAL to input.`;
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
        let { imageBase64, imageUrl, clothingPrompt, backgroundPrompt } = body;

        // imageBase64 또는 imageUrl 중 하나 필요
        if (!imageBase64 && !imageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'imageBase64 or imageUrl is required' })
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

        // imageUrl이 있으면 서버에서 fetch (Flutter WebView CORS 우회)
        if (imageUrl && !imageBase64) {
            console.log('🔄 이미지 URL 서버 측 fetch:', imageUrl.substring(0, 80) + '...');
            try {
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Image fetch failed: ${imageResponse.status}`);
                }
                const arrayBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
                imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
                console.log('✅ 이미지 URL → base64 변환 완료');
            } catch (fetchError) {
                console.error('❌ 이미지 URL fetch 실패:', fetchError.message);
                throw new Error(`Failed to fetch image from URL: ${fetchError.message}`);
            }
        }

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
