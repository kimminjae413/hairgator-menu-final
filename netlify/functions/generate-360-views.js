/**
 * 360° 뷰 이미지 생성 Netlify Function
 * Gemini 3 Pro Image로 4개 뷰(앞, 오른쪽, 뒤, 왼쪽) 이미지 생성
 */

const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'hairgator-70a28.firebasestorage.app'
    });
}

const bucket = admin.storage().bucket();

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

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
 * Firebase Storage에 이미지 업로드
 */
async function uploadToStorage(styleId, viewKey, imageData, mimeType) {
    const extension = mimeType.includes('jpeg') ? 'jpg' : 'png';
    const filePath = `styles/${styleId}/360/${viewKey}.${extension}`;

    const buffer = Buffer.from(imageData, 'base64');
    const file = bucket.file(filePath);

    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
            metadata: {
                generatedBy: 'gemini-360-view',
                generatedAt: new Date().toISOString()
            }
        }
    });

    // 공개 URL 생성
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    console.log(`✅ Uploaded ${viewKey}: ${publicUrl}`);
    return publicUrl;
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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' })
            };
        }

        console.log(`🔄 Generating 360° views for style: ${styleId}`);

        // 1. 소스 이미지 다운로드
        console.log('📥 Downloading source image...');
        const { base64: sourceBase64, mimeType: sourceMimeType } = await downloadImageAsBase64(imageUrl);
        console.log(`✅ Source image downloaded (${sourceMimeType})`);

        // 2. 4개 뷰 이미지 생성
        const views360 = {};

        for (const viewDir of VIEW_DIRECTIONS) {
            console.log(`🎨 Generating ${viewDir.key} view...`);

            try {
                // Gemini로 이미지 생성
                const generated = await generateSingleView(apiKey, sourceBase64, viewDir, sourceMimeType);

                // Firebase Storage에 업로드
                const publicUrl = await uploadToStorage(styleId, viewDir.key, generated.data, generated.mimeType);

                views360[viewDir.key] = publicUrl;
                console.log(`✅ ${viewDir.key} view complete`);

                // API 레이트 리밋 방지
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (viewError) {
                console.error(`❌ Failed to generate ${viewDir.key}:`, viewError.message);
                // 실패해도 계속 진행 (null로 표시)
                views360[viewDir.key] = null;
            }
        }

        // 최소 front 이미지는 있어야 함
        if (!views360.front) {
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
                views360
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
