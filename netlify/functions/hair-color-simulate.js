// netlify/functions/hair-color-simulate.js
// HAIRGATOR 헤어컬러 시뮬레이션 (Gemini 2.0 Flash + 자연스러운 염색 프롬프트)
//
// 사용자 사진의 머리카락 색상만 자연스럽게 변경한 이미지 생성

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

        // 색상 설명 생성 (자연스러운 염색을 위한 상세 설명)
        const colorDescription = getEnhancedColorDescription(hairColor, hairColorName);

        // Gemini 2.0 Flash 이미지 생성 API 호출
        const result = await generateNaturalHairColor(base64Data, colorDescription, GEMINI_API_KEY);

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
 * 색상 코드/이름을 자연스러운 염색 설명으로 변환
 * 프롬프트 엔지니어링: 머릿결 질감과 자연스러움 강조
 */
function getEnhancedColorDescription(hairColor, hairColorName) {
    // 색상별 상세 설명 (자연스러운 염색 느낌을 위해)
    const colorDescriptions = {
        // 브라운 계열
        '#8B4513': { name: 'natural brown', desc: 'warm natural brown with subtle caramel highlights' },
        '#A0522D': { name: 'sienna brown', desc: 'rich sienna brown with warm undertones' },
        '#CD853F': { name: 'caramel brown', desc: 'soft caramel brown with honey highlights' },
        '#D2691E': { name: 'honey gold', desc: 'golden honey brown with sun-kissed highlights' },
        '#6B4423': { name: 'chocolate brown', desc: 'deep chocolate brown with subtle dimension' },
        '#4A3728': { name: 'dark brown', desc: 'rich dark brown with natural depth' },

        // 블랙 계열
        '#1C1C1C': { name: 'natural black', desc: 'natural black with subtle blue-black shine' },
        '#000000': { name: 'jet black', desc: 'deep jet black with healthy shine' },

        // 레드/와인 계열
        '#8B0000': { name: 'burgundy red', desc: 'sophisticated burgundy red with wine undertones' },
        '#800000': { name: 'maroon', desc: 'deep maroon with subtle red highlights' },
        '#722F37': { name: 'wine red', desc: 'elegant wine red with depth' },

        // 골드/베이지 계열
        '#B8860B': { name: 'dark golden', desc: 'warm dark golden brown with bronze highlights' },
        '#DEB887': { name: 'light beige', desc: 'soft light beige brown with creamy tones' },
        '#F4A460': { name: 'sandy brown', desc: 'natural sandy brown with warm highlights' },
        '#FFD700': { name: 'golden blonde', desc: 'bright golden blonde with dimensional highlights' },

        // 애쉬/쿨톤 계열
        '#808080': { name: 'ash gray', desc: 'cool ash gray with silver undertones' },
        '#A9A9A9': { name: 'light ash', desc: 'soft light ash with cool undertones' },
        '#696969': { name: 'dark ash', desc: 'sophisticated dark ash brown' },

        // 패션 컬러
        '#4B0082': { name: 'indigo violet', desc: 'deep indigo violet with purple undertones' },
        '#800080': { name: 'purple', desc: 'rich purple with violet highlights' }
    };

    // 색상 이름이 있으면 그대로 사용하되, 자연스러움 키워드 추가
    if (hairColorName) {
        return `professional salon-quality ${hairColorName} hair dye, realistic hair texture`;
    }

    // HEX 코드로 매칭
    const upperHex = hairColor.toUpperCase();
    if (colorDescriptions[upperHex]) {
        return colorDescriptions[upperHex].desc;
    }

    // 매칭되지 않으면 기본 설명
    return `professional ${hairColor} hair color with natural dimension`;
}

/**
 * Gemini 2.0 Flash로 자연스러운 헤어컬러 변경 이미지 생성
 * 프롬프트 엔지니어링: Imagen 스타일의 자연스러운 결과 유도
 */
async function generateNaturalHairColor(imageBase64, colorDescription, apiKey) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;

    // 🎨 자연스러운 염색을 위한 상세 프롬프트
    const prompt = `You are a professional hair colorist creating a realistic hair dye simulation.

TASK: Edit this photo to show a natural-looking hair color change to ${colorDescription}.

CRITICAL REQUIREMENTS:
1. PRESERVE exactly: face, skin, expression, pose, clothes, background, lighting, shadows
2. CHANGE only: hair color (keep same hairstyle, length, texture, volume)
3. Make it look like a REAL professional salon hair dye, NOT a digital overlay or wig

HAIR COLOR TECHNIQUES to apply:
- Maintain natural hair TEXTURE and individual strand details
- Keep realistic HIGHLIGHTS and LOWLIGHTS based on lighting
- Preserve the SHINE and reflection patterns on hair
- Apply color with natural GRADIENT from roots to tips
- Keep the natural SHADOW areas slightly darker
- Maintain realistic COLOR DEPTH and dimension

QUALITY REQUIREMENTS:
- Photorealistic, 8K quality
- Professional salon result
- Natural blending at hairline and part
- Realistic light reflection on colored hair

DO NOT:
- Make it look like a solid color overlay
- Change face or skin color
- Alter hairstyle or hair volume
- Add unnatural shine or glow
- Create cartoon or artificial look`;

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
            responseModalities: ['Text', 'Image']
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    };

    console.log('📤 Gemini API 요청 중 (자연스러운 염색 프롬프트)...');

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
                const mimeType = part.inlineData.mimeType || 'image/png';
                console.log('✅ 이미지 생성 성공');
                return {
                    imageBase64: `data:${mimeType};base64,${part.inlineData.data}`
                };
            }
        }
    }

    // 텍스트 응답이 있으면 로그
    if (result.candidates && result.candidates[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
            if (part.text) {
                console.log('📝 텍스트 응답:', part.text);
            }
        }
    }

    console.error('응답 구조:', JSON.stringify(result, null, 2));
    throw new Error('No image generated in response');
}
