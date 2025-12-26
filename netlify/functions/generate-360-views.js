/**
 * 360° 뷰 이미지 생성 Netlify Function
 * 한 번에 1개 뷰만 생성 (응답 크기 제한 6MB 회피)
 */

/**
 * Gemini API로 단일 뷰 이미지 생성
 */
async function generateSingleView(apiKey, sourceImageBase64, viewKey, angle, mimeType) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const viewPrompts = {
        front: 'front view, facing camera directly',
        right: 'right side profile view, 90 degrees rotated',
        back: 'back view, showing the back of the head',
        left: 'left side profile view, 270 degrees rotated'
    };

    const prompt = `You are an expert AI that generates different angle views of a person's hairstyle.

Given this reference image of a person with a specific hairstyle, generate a ${viewPrompts[viewKey]}.

CRITICAL REQUIREMENTS:
1. MAINTAIN THE EXACT SAME hairstyle - same cut, same color, same texture, same styling
2. MAINTAIN THE EXACT SAME person appearance - face structure, skin tone, clothing, background
3. Only rotate the view angle to ${angle}° (${viewKey} view)
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
        console.error(`Gemini API error for ${viewKey}:`, errorText);
        throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();

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

    throw new Error(`No image generated for ${viewKey}`);
}

/**
 * 소스 이미지를 Base64로 다운로드
 */
async function downloadImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    return { base64, mimeType: contentType };
}

exports.handler = async (event) => {
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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { styleId, imageUrl, viewKey } = JSON.parse(event.body || '{}');

        if (!styleId || !imageUrl || !viewKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'styleId, imageUrl, viewKey are required' })
            };
        }

        const viewAngles = { front: 0, right: 90, back: 180, left: 270 };
        if (!viewAngles.hasOwnProperty(viewKey)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'viewKey must be: front, right, back, left' })
            };
        }

        const apiKey = process.env.GEMINI_API_KEY_ADMIN;
        if (!apiKey) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
        }

        console.log(`🎨 Generating ${viewKey} view for: ${styleId}`);

        // 소스 이미지 다운로드
        const { base64: sourceBase64, mimeType: sourceMimeType } = await downloadImageAsBase64(imageUrl);

        // 단일 뷰 이미지 생성
        const generated = await generateSingleView(apiKey, sourceBase64, viewKey, viewAngles[viewKey], sourceMimeType);

        console.log(`✅ ${viewKey} view complete`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                viewKey,
                image: {
                    data: generated.data,
                    mimeType: generated.mimeType
                }
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
