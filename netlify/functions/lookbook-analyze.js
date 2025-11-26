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

// Node 18+ 에서는 fetch가 기본 내장되어 있음 (node-fetch 불필요)

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
        const { imageUrl, language = 'ko', generateImages = true, gender = '' } = JSON.parse(event.body);

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
        console.log('📋 전달된 성별:', gender || '없음 (AI가 판단)');

        // 1단계: Gemini 2.0 Flash로 헤어스타일 분석
        const analysisResult = await analyzeWithGemini2Flash(imageUrl, GEMINI_KEY, language, gender);

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
async function analyzeWithGemini2Flash(imageUrl, apiKey, language, providedGender = '') {
    const languageInstructions = {
        ko: '한국어로 답변해주세요.',
        en: 'Please respond in English.',
        ja: '日本語で回答してください。',
        zh: '请用中文回答。',
        vi: 'Vui lòng trả lời bằng tiếng Việt.'
    };

    const langInstruction = languageInstructions[language] || languageInstructions.ko;

    // 성별이 전달된 경우 해당 성별로 고정
    const genderInstruction = providedGender
        ? `중요: 이 헤어스타일은 ${providedGender === 'male' ? '남성' : '여성'} 스타일입니다. gender 필드는 반드시 "${providedGender}"로 설정하세요.`
        : '이미지를 보고 성별을 판단해주세요.';

    const prompt = `당신은 20년 경력의 최고급 헤어살롱 수석 디자이너이자 보그(Vogue) 매거진 뷰티 에디터입니다.
고객에게 직접 컨설팅하듯 이 헤어스타일 이미지를 전문가의 눈으로 세밀하게 분석해주세요.

${langInstruction}

${genderInstruction}

📋 분석 가이드라인:

【이미지 관찰 필수】
- 먼저 이미지를 꼼꼼히 살펴보세요: 길이, 결, 볼륨 위치, 앞머리 형태, 레이어 유무, 컬/웨이브 패턴
- 이 헤어스타일만의 고유한 특징을 찾아내세요

【텍스처별 맞춤 조언】
- 직모/스트레이트: 윤기 관리, 정전기 방지, 볼륨 루트, 엉킴 방지 등
- 웨이브/컬: 컬 패턴 유지, 프리즈 방지, 디퓨저 활용, 수분 밸런스 등
- 펌 스타일: 펌 유지 기간, 리터치 시기, 손상 관리 등

【전문가다운 구체적 조언】
- "수분이 필요합니다" (X) → "모발 중간~끝 부분의 푸석함을 줄이려면 주 2회 헤어 마스크를 권장합니다" (O)
- "볼륨을 살리세요" (X) → "정수리 부분에 볼륨 스프레이를 뿌리고 드라이기 바람을 아래에서 위로 넣어주세요" (O)

다음 JSON 형식으로 응답해주세요:

{
    "gender": "${providedGender || 'male 또는 female'}",
    "styleName": "정확한 스타일명 (예: 레이어드 미디엄 C컬펌, 시스루뱅 롱 스트레이트, 투블럭 댄디컷 등)",
    "styleDescription": "이 헤어스타일의 핵심 특징을 마치 고객에게 설명하듯 자연스럽게 3-4문장으로 서술. 앞머리 형태, 볼륨 포인트, 결의 흐름, 전체적인 실루엣을 포함하여 이 스타일이 주는 무드와 느낌까지 표현",
    "characteristics": {
        "length": "구체적 길이 (예: '쇄골 아래 5cm', '턱선 라인', '어깨에 닿는 미디엄' 등)",
        "texture": "정확한 텍스처 (예: '자연스러운 S컬 웨이브', '볼륨감 있는 C컬', '차분한 직모', '끝단 살짝 말림' 등)",
        "volume": "볼륨 위치와 정도 (예: '정수리에서 귀 라인까지 자연스러운 볼륨', '전체적으로 가벼운 에어리함' 등)",
        "layering": "레이어 상세 (예: '광대뼈 라인에서 시작하는 페이스 프레이밍 레이어', '레이어 없는 원랭스' 등)"
    },
    "faceShapes": {
        "best": ["가장 잘 어울리는 얼굴형 2-3개"],
        "description": "왜 이 얼굴형에 어울리는지 헤어 디자이너 관점에서 구체적으로 설명. 예: '광대뼈 라인의 레이어가 각진 턱선을 부드럽게 감싸주고, 정수리 볼륨이 긴 얼굴을 보완해줍니다'"
    },
    "fashionRecommendations": [
        {
            "style": "이 헤어와 어울리는 패션 무드 (예: 로맨틱 페미닌, 캐주얼 시크, 오피스 엘레강스 등)",
            "items": ["구체적인 아이템 4개 - 브랜드명이나 소재/컬러 포함 (예: '아이보리 캐시미어 니트', '하이웨이스트 와이드 데님', '베이지 트렌치코트')"],
            "reason": "이 헤어스타일의 어떤 특징이 이 패션과 조화를 이루는지 구체적으로"
        },
        {
            "style": "두 번째 패션 무드",
            "items": ["구체적인 아이템 4개"],
            "reason": "조화 포인트 설명"
        },
        {
            "style": "세 번째 패션 무드",
            "items": ["구체적인 아이템 4개"],
            "reason": "조화 포인트 설명"
        }
    ],
    "stylingTips": [
        {
            "title": "아침 스타일링 루틴",
            "description": "이 헤어스타일을 살리는 구체적인 스타일링 방법. 도구, 제품, 순서를 포함해서 실제로 따라할 수 있게 작성"
        },
        {
            "title": "볼륨 & 실루엣 유지법",
            "description": "이 스타일의 핵심인 볼륨 위치나 실루엣을 하루 종일 유지하는 실전 팁"
        },
        {
            "title": "손상 방지 & 윤기 관리",
            "description": "이 텍스처/길이의 모발이 특히 주의해야 할 점과 윤기를 유지하는 방법"
        }
    ],
    "maintenance": {
        "hydration": "높음/중간/낮음 중 선택",
        "trimCycle": "숫자만 (예: 6, 8, 12 등 - 주 단위)",
        "products": ["이 스타일에 꼭 필요한 제품 타입 3개 (예: '열보호 스프레이', '볼륨 무스', '실크 세럼' 등)"],
        "tips": "이 스타일을 오래 유지하기 위한 살롱급 핵심 관리 팁 한 문장"
    },
    "tags": ["이 스타일의 키워드 5개 (예: #레이어드컷, #볼륨펌, #페이스프레이밍, #여신머리, #내추럴웨이브)"]
}

JSON만 출력하세요.`;

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
        console.error('❌ Gemini 분석 오류:', error);
        console.error('⚠️ 폴백 분석 결과 사용 (주의: 실제 이미지 분석이 아닙니다)');
        return getDefaultAnalysis(language);
    }
}

// ==================== Imagen 4 Fast 이미지 생성 ====================
// 패션 스타일링 이미지 3장 생성 - 각각 다른 패션 착장
async function generateWithImagen4Fast(analysis, apiKey) {
    const { gender, styleName, characteristics, fashionRecommendations } = analysis;

    // 성별에 따른 기본 설정
    const genderBase = gender === 'male' ? 'man' : 'woman';

    const results = {
        variations: [],
        fashion: []
    };

    // 각 패션 스타일별로 구체적인 옷 프롬프트 생성
    const fashionPrompts = fashionRecommendations.slice(0, 3).map((rec, index) => {
        const fashionItems = rec.items.join(', ');
        const fashionStyle = rec.style;

        // 헤어스타일 상세 설명
        const hairDesc = `beautiful ${styleName} hairstyle, ${characteristics.texture || 'natural'} texture, ${characteristics.length || 'medium'} length`;

        // 상반신 촬영 + 헤어스타일 + 패션 모두 보이도록
        // CRITICAL: 머리부터 가슴까지만 보이는 상반신 클로즈업
        return `Close-up portrait photo from head to chest of a Korean ${genderBase} model. HAIR: ${hairDesc} - hair must be fully visible and styled beautifully. OUTFIT: wearing ${fashionStyle} style - ${fashionItems}. Framing: head and shoulders shot, face and hair clearly visible, chest level crop. Studio lighting, clean white or gray background, fashion magazine quality, sharp focus on hair and face. The hairstyle and clothing style (${fashionStyle}) must match perfectly.`;
    });

    try {
        console.log('🎨 Imagen 4 Fast 패션 스타일링 이미지 생성');
        console.log('📋 AI 분석 기반 패션 추천:');
        fashionRecommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec.style}: ${rec.items.join(', ')} - ${rec.reason}`);
        });

        // 병렬로 이미지 3장 동시 생성 (더 빠름)
        console.log('🚀 이미지 3장 병렬 생성 시작...');
        const imagePromises = fashionPrompts.map((prompt, i) =>
            generateImageWithImagen4(prompt, apiKey, i)
        );

        const imageResults = await Promise.allSettled(imagePromises);

        imageResults.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
                results.variations.push(result.value);
                console.log(`✅ 이미지 ${i + 1} 생성 성공`);
            } else {
                console.warn(`⚠️ 이미지 ${i + 1} 생성 실패:`, result.reason?.message || 'null 반환');
            }
        });

        console.log(`✅ 패션 스타일링 이미지 생성 완료: ${results.variations.length}장`);

    } catch (error) {
        console.error('이미지 생성 오류:', error);
    }

    return results;
}

// Imagen 4 Fast API 호출
async function generateImageWithImagen4(prompt, apiKey, imageIndex = 0) {
    try {
        console.log(`📝 이미지 ${imageIndex + 1} 프롬프트 (일부): ${prompt.substring(0, 100)}...`);

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

        console.log(`📡 이미지 ${imageIndex + 1} API 응답 상태: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 이미지 ${imageIndex + 1} Imagen 4 Fast API 오류:`, response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log(`📦 이미지 ${imageIndex + 1} 결과 키:`, Object.keys(result));

        // base64 이미지 추출
        if (result.predictions && result.predictions[0]) {
            const prediction = result.predictions[0];
            console.log(`📦 이미지 ${imageIndex + 1} prediction 키:`, Object.keys(prediction));

            if (prediction.bytesBase64Encoded) {
                const imageData = prediction.bytesBase64Encoded;
                console.log(`✅ 이미지 ${imageIndex + 1} base64 데이터 길이: ${imageData.length}`);
                return `data:image/png;base64,${imageData}`;
            } else {
                console.warn(`⚠️ 이미지 ${imageIndex + 1} bytesBase64Encoded 없음. prediction:`, JSON.stringify(prediction).substring(0, 200));
                return null;
            }
        }

        console.warn(`⚠️ 이미지 ${imageIndex + 1} predictions 없음. result:`, JSON.stringify(result).substring(0, 300));
        return null;
    } catch (error) {
        console.error(`❌ 이미지 ${imageIndex + 1} Imagen 4 Fast 호출 실패:`, error.message);
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
