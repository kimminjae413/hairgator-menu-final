/**
 * 360° 뷰 이미지 생성 Netlify Function
 * Gemini로 4개 뷰(앞, 오른쪽, 뒤, 왼쪽) 이미지 생성 후 base64 반환
 * Firebase Storage 업로드는 클라이언트에서 처리
 */

// 뷰 방향 정의
const VIEW_DIRECTIONS = [
    { key: 'front', angle: 0, prompt: 'front view, facing camera directly' },
    { key: 'right', angle: 90, prompt: 'right side profile view, 90 degrees rotated' },
    { key: 'back', angle: 180, prompt: 'back view, showing the back of the head' },
    { key: 'left', angle: 270, prompt: 'left side profile view, 270 degrees rotated' }
];

/**
 * Gemini API로 단일 뷰 이미지 생성
 */
async function generateSingleView(apiKey, sourceImageBase64, viewDirection, mimeType) {
    // Gemini 2.0 Flash Experimental (이미지 생성 지원)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const prompt = `You are an expert AI that generates different angle views of a person's hairstyle.

Given this reference image of a person with a specific hairstyle, generate a ${viewDirection.prompt}.

CRITICAL REQUIREMENTS:
1. MAINTAIN THE EXACT SAME hairstyle - same cut, same color, same texture, same styling
2. MAINTAIN THE EXACT SAME person appearance - face structure, skin tone, clothing, background
3. Only rotate the view angle to ${viewDirection.angle}° (${viewDirection.key} view)
4. The hairstyle must be 100% consistent with the reference image
5. Professional quality, natural lighting, photorealistic

Generate ONLY the rotated view image. The hairstyle must be IDENTICAL to the reference.`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: sourceImageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                responseModalities: ["image", "text"],
                responseMimeType: "text/plain"
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error for ${viewDirection.key}:`, errorText);
        throw new Error(`Gemini API failed for ${viewDirection.key}: ${response.status}`);
    }

    const data = await response.json();

    // 이미지 데이터 추출
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const parts = data.candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png'
                };
            }
        }
    }

    throw new Error(`No image generated for ${viewDirection.key}`);
}

/**
 * 소스 이미지를 Base64로 다운로드
 */
async function downloadImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download source image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    return { base64, mimeType: contentType };
}

exports.handler = async (event) => {
    // CORS 헤더
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { styleId, imageUrl } = JSON.parse(event.body || '{}');

        if (!styleId || !imageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'styleId and imageUrl are required' })
            };
        }

        const apiKey = process.env.GEMINI_API_KEY_ADMIN;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'GEMINI_API_KEY_ADMIN not configured' })
            };
        }

        console.log(`🔄 Generating 360° views for style: ${styleId}`);

        // 1. 소스 이미지 다운로드
        console.log('📥 Downloading source image...');
        const { base64: sourceBase64, mimeType: sourceMimeType } = await downloadImageAsBase64(imageUrl);
        console.log(`✅ Source image downloaded (${sourceMimeType})`);

        // 2. 4개 뷰 이미지 생성 (base64로 반환)
        const generatedImages = {};

        for (const viewDir of VIEW_DIRECTIONS) {
            console.log(`🎨 Generating ${viewDir.key} view...`);

            try {
                const generated = await generateSingleView(apiKey, sourceBase64, viewDir, sourceMimeType);
                generatedImages[viewDir.key] = {
                    data: generated.data,
                    mimeType: generated.mimeType
                };
                console.log(`✅ ${viewDir.key} view complete`);

                // API 레이트 리밋 방지
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (viewError) {
                console.error(`❌ Failed to generate ${viewDir.key}:`, viewError.message);
                generatedImages[viewDir.key] = null;
            }
        }

        // 최소 front 이미지는 있어야 함
        if (!generatedImages.front) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to generate front view' })
            };
        }

        console.log(`✅ 360° views generation complete for ${styleId}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                styleId,
                images: generatedImages  // base64 이미지들 반환
            })
        };

    } catch (error) {
        console.error('360° generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || '360° view generation failed'
            })
        };
    }
};
