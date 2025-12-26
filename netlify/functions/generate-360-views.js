/**
 * @DEPRECATED - 2025-12-26
 * AI 생성 기능 제거됨. 수동 업로드로 대체.
 * 이 함수는 더 이상 사용되지 않음.
 *
 * 360° 뷰 이미지 생성 Netlify Function
 * 한 번에 1개 뷰만 생성 (응답 크기 제한 6MB 회피)
 */

/**
 * Gemini API로 단일 뷰 이미지 생성
 */
async function generateSingleView(apiKey, sourceImageBase64, viewKey, angle, mimeType) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const viewDescriptions = {
        front: 'front view (0°)',
        right: 'right side profile (90°)',
        back: 'back view (180°)',
        left: 'left side profile (270°)'
    };

    const prompt = `[STRICT IMAGE TRANSFORMATION TASK]

You are rotating a virtual camera around this person. Generate a ${viewDescriptions[viewKey]} of the EXACT SAME person.

⚠️ ABSOLUTE RULES - DO NOT VIOLATE:
1. FACE: Keep the EXACT same face. Same eyes, nose, lips, skin tone, facial structure. NO changes.
2. HAIR: Keep the EXACT same hairstyle. Same cut, length, color, texture, styling, volume. NO changes.
3. CLOTHES: Keep the EXACT same clothing. Same color, pattern, style. NO changes.
4. BACKGROUND: Keep the EXACT same background color/pattern. NO changes.
5. LIGHTING: Keep the EXACT same lighting conditions. NO changes.

📐 ONLY CHANGE: The camera viewing angle to ${angle}° (${viewKey})

This is NOT creative generation. This is a STRICT camera rotation task.
The output must look like a photo of the SAME person taken from a different angle.
If you cannot maintain 100% consistency, do NOT generate anything different.

Output: Single image showing the ${viewDescriptions[viewKey]} of this exact person.`;

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
