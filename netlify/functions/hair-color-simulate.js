// netlify/functions/hair-color-simulate.js
// HAIRGATOR 헤어컬러 시뮬레이션 (Gemini 2.0 Flash)
//
// 사용자 사진의 머리카락 색상만 변경한 이미지 생성

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

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
            imageBase64,      // 사용자 사진 (base64)
            hairColor,        // 목표 헤어컬러 (예: "#8B4513" 또는 "내추럴 브라운")
            hairColorName     // 색상 이름 (옵션)
        } = JSON.parse(event.body);

        if (!imageBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'imageBase64 is required' })
            };
        }

        if (!hairColor) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'hairColor is required' })
            };
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }

        console.log('🎨 헤어컬러 시뮬레이션 시작');
        console.log('📋 목표 색상:', hairColor, hairColorName || '');

        // Base64에서 prefix 제거
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // 색상 설명 생성
        const colorDescription = getColorDescription(hairColor, hairColorName);

        // Gemini 2.0 Flash 이미지 생성 API 호출
        const result = await generateHairColorImage(base64Data, colorDescription, GEMINI_API_KEY);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                generatedImage: result.imageBase64,
                message: 'Hair color simulation completed'
            })
        };

    } catch (error) {
        console.error('🎨 헤어컬러 시뮬레이션 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Hair color simulation failed',
                message: error.message
            })
        };
    }
};

/**
 * 색상 코드/이름을 자연어 설명으로 변환
 */
function getColorDescription(hairColor, hairColorName) {
    // 색상 이름이 있으면 사용
    if (hairColorName) {
        return hairColorName;
    }

    // HEX 코드를 대략적인 색상명으로 변환
    const colorMap = {
        '#8B4513': 'natural brown',
        '#A0522D': 'sienna brown',
        '#CD853F': 'caramel brown',
        '#D2691E': 'honey gold',
        '#6B4423': 'chocolate brown',
        '#4A3728': 'dark brown',
        '#1C1C1C': 'natural black',
        '#8B0000': 'burgundy red',
        '#B8860B': 'dark golden',
        '#DEB887': 'light beige brown',
        '#F4A460': 'sandy brown',
        '#800000': 'maroon',
        '#4B0082': 'indigo violet',
        '#FFD700': 'golden blonde'
    };

    return colorMap[hairColor.toUpperCase()] || `hair color ${hairColor}`;
}

/**
 * Gemini 2.0 Flash로 헤어컬러 변경 이미지 생성
 */
async function generateHairColorImage(imageBase64, colorDescription, apiKey) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const prompt = `Edit this photo to change ONLY the hair color to ${colorDescription}.
Keep everything else exactly the same - same face, same expression, same clothes, same background, same pose.
The hair color change should look natural and realistic, as if the person actually dyed their hair.
Do not change the hairstyle, length, or texture - only the color.
Generate a high-quality, photorealistic result.`;

    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageBase64
                    }
                }
            ]
        }],
        generationConfig: {
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/jpeg'
        }
    };

    console.log('📤 Gemini API 요청 중...');

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API 오류:', response.status, errorText);
        throw new Error(`Gemini API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('📥 Gemini 응답 수신');

    // 응답에서 이미지 추출
    if (result.candidates && result.candidates[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return {
                    imageBase64: `data:image/jpeg;base64,${part.inlineData.data}`
                };
            }
        }
    }

    throw new Error('No image generated in response');
}
