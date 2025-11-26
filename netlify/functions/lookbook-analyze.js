// netlify/functions/lookbook-analyze.js
// HAIRGATOR Lookbook AI Analysis
//
// 모델 구성:
// - 분석: Gemini 2.0 Flash ($0.10/1M input, $0.40/1M output) → ~1원/회
// - 이미지 생성: Imagen 4 Fast ($0.02/장) → ~81원/3장
// - 총 비용: ~82원/회
//
// 기능:
// 1. 성별 분석 (남성/여성)
// 2. 헤어스타일 특징 분석
// 3. 어울리는 얼굴형 분석
// 4. 패션 추천 + 이미지 생성 (3장: 각각 다른 모델, 포즈, 패션 스타일)
// 5. 스타일링 가이드

const fetch = require('node-fetch');

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
        const { imageUrl, language = 'ko', generateImages = true } = JSON.parse(event.body);

        if (!imageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'imageUrl is required' })
            };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            throw new Error('Gemini API key not configured');
        }

        console.log('📖 Lookbook 분석 시작 (Gemini 2.0 Flash + Imagen 4 Fast)');

        // 1단계: Gemini 2.0 Flash로 헤어스타일 분석
        const analysisResult = await analyzeWithGemini2Flash(imageUrl, GEMINI_KEY, language);

        // 2단계: Imagen 4 Fast로 이미지 생성 (옵션)
        let generatedImages = null;
        if (generateImages) {
            try {
                generatedImages = await generateWithImagen4Fast(analysisResult, GEMINI_KEY);
            } catch (imgError) {
                console.warn('이미지 생성 실패, 분석 결과만 반환:', imgError.message);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                analysis: analysisResult,
                generatedImages: generatedImages
            })
        };

    } catch (error) {
        console.error('Lookbook 분석 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Analysis failed'
            })
        };
    }
};

// ==================== Gemini 2.0 Flash 분석 ====================
async function analyzeWithGemini2Flash(imageUrl, apiKey, language) {
    const languageInstructions = {
        ko: '한국어로 답변해주세요.',
        en: 'Please respond in English.',
        ja: '日本語で回答してください。',
        zh: '请用中文回答。',
        vi: 'Vui lòng trả lời bằng tiếng Việt.'
    };

    const langInstruction = languageInstructions[language] || languageInstructions.ko;

    const prompt = `당신은 세계적인 헤어 스타일리스트이자 패션 에디터입니다. 이 헤어스타일 이미지를 분석해주세요.

${langInstruction}

다음 JSON 형식으로 정확히 응답해주세요:

{
    "gender": "male 또는 female",
    "styleName": "이 헤어스타일의 이름 (예: 히피펌, 레이어드컷, 투블럭 등)",
    "styleDescription": "이 헤어스타일의 특징을 2-3문장으로 설명",
    "characteristics": {
        "length": "길이 (숏, 미디엄, 롱 등)",
        "texture": "텍스처 (웨이브, 스트레이트, 컬 등)",
        "volume": "볼륨감 (높음, 중간, 낮음)",
        "layering": "레이어링 (많음, 중간, 없음)"
    },
    "faceShapes": {
        "best": ["가장 잘 어울리는 얼굴형 2-3개"],
        "description": "왜 이 얼굴형에 어울리는지 설명"
    },
    "fashionRecommendations": [
        {
            "style": "패션 스타일명 (예: 캐주얼, 오피스룩 등)",
            "items": ["추천 아이템 3-4개"],
            "reason": "이 헤어스타일과 어울리는 이유"
        },
        {
            "style": "두 번째 패션 스타일",
            "items": ["추천 아이템 3-4개"],
            "reason": "어울리는 이유"
        },
        {
            "style": "세 번째 패션 스타일",
            "items": ["추천 아이템 3-4개"],
            "reason": "어울리는 이유"
        }
    ],
    "stylingTips": [
        {
            "title": "스타일링 팁 제목",
            "description": "상세 설명"
        },
        {
            "title": "두 번째 팁",
            "description": "설명"
        },
        {
            "title": "세 번째 팁",
            "description": "설명"
        }
    ],
    "maintenance": {
        "hydration": "높음/중간/낮음",
        "trimCycle": "커트 주기 (주 단위)",
        "products": ["추천 제품 타입 2-3개"],
        "tips": "관리 팁 한 문장"
    },
    "tags": ["관련 태그 4-5개 (예: #볼륨, #웨이브, #내추럴 등)"]
}

JSON만 출력하고 다른 텍스트는 포함하지 마세요.`;

    try {
        const imageBase64 = await fetchImageAsBase64(imageUrl);

        // Gemini 2.0 Flash API 호출
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini 2.0 Flash API 오류:', errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Gemini 2.0 Flash 응답:', JSON.stringify(result).substring(0, 200));

        // 응답에서 텍스트 추출
        const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            throw new Error('No text content in Gemini response');
        }

        // JSON 파싱 (마크다운 코드 블록 제거)
        let jsonStr = textContent.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const analysis = JSON.parse(jsonStr);
        console.log('✅ 분석 완료:', analysis.styleName);

        return analysis;

    } catch (error) {
        console.error('Gemini 분석 오류:', error);
        return getDefaultAnalysis(language);
    }
}

// ==================== Imagen 4 Fast 이미지 생성 ====================
// 패션 스타일링 이미지 3장 생성 (AI 분석 결과 기반, 각각 다른 모델/포즈)
async function generateWithImagen4Fast(analysis, apiKey) {
    const { gender, styleName, styleDescription, characteristics, fashionRecommendations } = analysis;

    // 성별에 따른 기본 설정
    const genderBase = gender === 'male' ? 'male' : 'female';

    // 다양성을 위한 모델/포즈 설정
    const modelVariations = [
        { age: '20s', pose: 'looking directly at camera with confident expression', angle: 'front view' },
        { age: 'early 30s', pose: 'slight side angle with gentle smile', angle: 'three-quarter view' },
        { age: 'mid 20s', pose: 'thoughtful expression, hand near face', angle: 'slight tilt' }
    ];

    const results = {
        variations: [], // 패션 착장 이미지 (메인으로 사용)
        fashion: []     // 빈 배열 (하위 호환성)
    };

    // AI 분석 결과의 패션 추천을 기반으로 프롬프트 생성
    const fashionPrompts = fashionRecommendations.slice(0, 3).map((rec, index) => {
        const model = modelVariations[index];
        const fashionItems = rec.items.join(', ');
        const fashionStyle = rec.style;
        const fashionReason = rec.reason; // AI가 분석한 "왜 어울리는지" 이유

        // 헤어스타일 특징 상세 설명
        const hairDetails = `${styleName} hairstyle with ${characteristics.texture} texture, ${characteristics.length} length, ${characteristics.volume} volume, ${characteristics.layering} layering`;

        return `Professional fashion editorial photography, upper body portrait of a Korean ${genderBase} model in ${model.age} with ${hairDetails}, wearing ${fashionItems} (${fashionStyle} style fashion), ${model.pose}, ${model.angle}, the outfit complements the hairstyle because: ${fashionReason}, soft diffused studio lighting, clean minimal background, high-end fashion magazine quality, sharp focus on face and hair, 4K resolution, photorealistic`;
    });

    try {
        console.log('🎨 Imagen 4 Fast 패션 스타일링 이미지 생성');
        console.log('📋 AI 분석 기반 패션 추천:');
        fashionRecommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec.style}: ${rec.items.join(', ')} - ${rec.reason}`);
        });

        // 병렬로 이미지 생성
        const fashionResults = await Promise.allSettled(
            fashionPrompts.map(prompt => generateImageWithImagen4(prompt, apiKey))
        );

        results.variations = fashionResults
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);

        console.log(`✅ 패션 스타일링 이미지 생성 완료: ${results.variations.length}장`);

    } catch (error) {
        console.error('이미지 생성 오류:', error);
    }

    return results;
}

// Imagen 4 Fast API 호출
async function generateImageWithImagen4(prompt, apiKey) {
    try {
        // Imagen 4 Fast API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "3:4",
                        safetyFilterLevel: "block_only_high",
                        personGeneration: "allow_adult"
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Imagen 4 Fast API 오류:', response.status, errorText);
            return null;
        }

        const result = await response.json();

        // base64 이미지 추출
        if (result.predictions && result.predictions[0]) {
            const imageData = result.predictions[0].bytesBase64Encoded;
            return `data:image/png;base64,${imageData}`;
        }

        return null;
    } catch (error) {
        console.error('Imagen 4 Fast 호출 실패:', error);
        return null;
    }
}

// 이미지 URL을 Base64로 변환
async function fetchImageAsBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return base64;
    } catch (error) {
        console.error('이미지 fetch 오류:', error);
        throw new Error('Failed to fetch image');
    }
}

// 기본 분석 결과 (폴백)
function getDefaultAnalysis(language) {
    const isKorean = language === 'ko';

    return {
        gender: "female",
        styleName: isKorean ? "내추럴 웨이브" : "Natural Wave",
        styleDescription: isKorean
            ? "자연스러운 웨이브가 특징인 스타일입니다. 부드럽고 여성스러운 느낌을 연출합니다."
            : "A style characterized by natural waves. Creates a soft and feminine look.",
        characteristics: {
            length: isKorean ? "미디엄" : "Medium",
            texture: isKorean ? "웨이브" : "Wave",
            volume: isKorean ? "중간" : "Medium",
            layering: isKorean ? "중간" : "Medium"
        },
        faceShapes: {
            best: isKorean ? ["계란형", "하트형", "긴 얼굴형"] : ["Oval", "Heart", "Long"],
            description: isKorean
                ? "볼륨감이 얼굴의 각진 부분을 부드럽게 감싸줍니다."
                : "The volume softly wraps around angular parts of the face."
        },
        fashionRecommendations: [
            {
                style: isKorean ? "캐주얼" : "Casual",
                items: isKorean
                    ? ["데님 재킷", "화이트 티셔츠", "와이드 팬츠"]
                    : ["Denim Jacket", "White T-shirt", "Wide Pants"],
                reason: isKorean
                    ? "자연스러운 웨이브와 편안한 캐주얼의 조화"
                    : "Harmony of natural waves with comfortable casual wear"
            },
            {
                style: isKorean ? "로맨틱" : "Romantic",
                items: isKorean
                    ? ["플로럴 원피스", "카디건", "메리제인 슈즈"]
                    : ["Floral Dress", "Cardigan", "Mary Jane Shoes"],
                reason: isKorean
                    ? "부드러운 웨이브가 여성스러운 룩을 완성"
                    : "Soft waves complete the feminine look"
            },
            {
                style: isKorean ? "시크" : "Chic",
                items: isKorean
                    ? ["오버사이즈 블레이저", "슬랙스", "로퍼"]
                    : ["Oversized Blazer", "Slacks", "Loafers"],
                reason: isKorean
                    ? "구조적인 패션과 유연한 헤어의 대비"
                    : "Contrast between structured fashion and flexible hair"
            }
        ],
        stylingTips: [
            {
                title: isKorean ? "디퓨저 사용" : "Use Diffuser",
                description: isKorean
                    ? "웨이브를 살리기 위해 디퓨저로 건조하세요."
                    : "Dry with a diffuser to enhance waves."
            },
            {
                title: isKorean ? "무스 스타일링" : "Mousse Styling",
                description: isKorean
                    ? "젖은 머리에 무스를 바르고 자연 건조하세요."
                    : "Apply mousse to wet hair and air dry."
            },
            {
                title: isKorean ? "오일 마무리" : "Oil Finish",
                description: isKorean
                    ? "끝부분에 오일을 발라 윤기를 더하세요."
                    : "Apply oil to the ends for added shine."
            }
        ],
        maintenance: {
            hydration: isKorean ? "높음" : "High",
            trimCycle: "8",
            products: isKorean
                ? ["수분 샴푸", "컬 크림", "헤어 오일"]
                : ["Moisturizing Shampoo", "Curl Cream", "Hair Oil"],
            tips: isKorean
                ? "정기적인 트리트먼트로 수분을 공급하세요."
                : "Provide moisture with regular treatments."
        },
        tags: isKorean
            ? ["#내추럴", "#웨이브", "#볼륨", "#여성스러움", "#데일리"]
            : ["#Natural", "#Wave", "#Volume", "#Feminine", "#Daily"]
    };
}
