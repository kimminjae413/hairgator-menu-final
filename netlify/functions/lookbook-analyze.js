// netlify/functions/lookbook-analyze.js
// HAIRGATOR Lookbook AI Analysis
//
// 모델 구성:
// - 분석: Gemini 2.0 Flash ($0.10/1M input, $0.40/1M output) → ~1원/회
// - 이미지 편집: Gemini 2.5 Flash Image (원본 헤어 유지, 옷만 변경)
// - 총 비용: ~30원/회
//
// 기능:
// 1. 성별 분석 (남성/여성)
// 2. 헤어스타일 특징 분석
// 3. 어울리는 얼굴형 분석
// 4. 패션 추천 + 이미지 편집 (3장: 원본 이미지 기반으로 옷만 변경)
// 5. 스타일링 가이드

// Node 18+ 에서는 fetch가 기본 내장되어 있음 (node-fetch 불필요)
const sharp = require('sharp');

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

        console.log('📖 Lookbook 분석 시작 (Gemini 2.0 Flash 분석 + Gemini 2.5 Flash Image 편집)');
        console.log('📋 전달된 성별:', gender || '없음 (AI가 판단)');

        // 1단계: Gemini 2.0 Flash로 헤어스타일 분석
        const analysisResult = await analyzeWithGemini2Flash(imageUrl, GEMINI_KEY, language, gender);

        // 2단계: Gemini 2.5 Flash Image로 이미지 편집 (원본 이미지 기반, 옷만 변경)
        let generatedImages = null;
        if (generateImages) {
            try {
                generatedImages = await editWithGemini25FlashImage(imageUrl, analysisResult, GEMINI_KEY);
            } catch (imgError) {
                console.warn('이미지 편집 실패, 분석 결과만 반환:', imgError.message);
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
        "best": ["이 헤어스타일이 자연스럽게 잘 맞는 얼굴형 1-2개 (계란형/원형/긴형/사각형/역삼각형 중)"],
        "description": "이 얼굴형에 자연스럽게 어울리는 이유를 헤어 디자이너 관점에서 설명",
        "adjustments": {
            "oval": "계란형: 이상적 기본형이므로 이 스타일을 그대로 연출 가능. 윤곽을 드러내는 방향으로",
            "round": "원형: 두정부(정수리) 볼륨을 더 살려 세로 길이감 강조, 양쪽 뺨을 살짝 가리는 방향으로 조정",
            "oblong": "긴형: 양옆 볼륨을 추가하고, 앞머리를 내려 이마를 덮어 세로 길이 완화. 어깨 아래 긴 머리는 피하는 것이 좋음",
            "square": "사각형: 옆머리로 뺨과 턱 라인을 부드럽게 감싸고, 정수리 볼륨과 웨이브로 각진 인상 완화",
            "heart": "역삼각형: 이마 양쪽을 덮고 턱 부분에 볼륨을 주어 좁은 턱선을 보완, 여성스러운 실루엣 강조"
        }
    },
    "fashionRecommendations": [
        {
            "style": "8가지 헤어패션감각 중 이 헤어와 가장 자연스러운 감각 1개만 선택 (섹시/아방가르드/내추럴/소피스티케이트/엘레강스/로맨틱프리티/스포티/에스닉)",
            "styleDescription": "해당 패션감각의 무드와 분위기 설명",
            "items": ["이 패션감각에 맞는 구체적인 옷 아이템 4개 - 반드시 소재와 컬러 포함 (예: '아이보리 린넨 셔츠', '블랙 실크 슬립 드레스')"],
            "reason": "이 헤어스타일의 구체적 특징(길이/웨이브형태/볼륨위치/질감)이 이 패션감각의 어떤 요소와 시너지를 내는지 2-3문장으로 설명. 예: '어깨를 타고 흐르는 S컬 웨이브가 바디컨셔스 실루엣의 곡선미와 조화를 이루어 성숙한 섹시미를 배가시킵니다.'"
        },
        {
            "style": "두 번째로 어울리는 헤어패션감각 1개",
            "styleDescription": "해당 패션감각의 무드와 분위기 설명",
            "items": ["구체적인 옷 아이템 4개 - 소재와 컬러 포함"],
            "reason": "이 헤어스타일과 두 번째 패션감각이 어울리는 구체적 이유 2-3문장"
        },
        {
            "style": "세 번째 - 도전적인 변신을 위한 헤어패션감각 1개",
            "styleDescription": "해당 패션감각의 무드와 분위기 설명",
            "items": ["구체적인 옷 아이템 4개 - 소재와 컬러 포함"],
            "reason": "현재 헤어스타일로도 이 감각을 연출할 수 있는 이유와 스타일링 팁 포함 2-3문장"
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

// ==================== Gemini 2.5 Flash Image 이미지 편집 ====================
// 원본 헤어스타일 이미지를 기반으로 옷만 변경하여 3장 생성
async function editWithGemini25FlashImage(originalImageUrl, analysis, apiKey) {
    const { gender, styleName, characteristics, fashionRecommendations } = analysis;

    const results = {
        variations: [],
        fashion: []
    };

    // 원본 이미지 Base64로 가져오기
    const originalImageBase64 = await fetchImageAsBase64(originalImageUrl);

    // 헤어패션감각별 어울리는 패션 스타일 가이드 (논문 기반)
    // "헤어패션감각과 토탈패션감각은 상관관계가 있다" - 안현경·조규화(2006)
    const hairFashionToClothingGuide = {
        '섹시': {
            mood: '성숙하고 매혹적인',
            hairFeature: '길고 굵은 웨이브/스트레이트, 층과 볼륨이 많거나 촉촉하고 젖은 듯한 이미지',
            clothingStyle: '바디컨셔스 실루엣, 깊은 V넥/오프숄더, 광택 있는 실크/새틴 소재, 슬릿 디테일',
            matchReason: '섹시한 헤어스타일의 관능적 웨이브와 볼륨감이 바디컨셔스 의상의 곡선과 조화를 이룸'
        },
        '아방가르드': {
            mood: '실험적이고 전위적인',
            hairFeature: '이색적·실험적 스타일, 독특한 염색이나 비대칭 커트',
            clothingStyle: '비대칭 디자인, 대담한 컬러블로킹, 해체주의적 실루엣, 오버사이즈 구조물',
            matchReason: '실험적인 헤어의 개성이 전위적 패션과 만나 완성도 높은 아방가르드 룩을 완성'
        },
        '내추럴': {
            mood: '자연스럽고 소박한',
            hairFeature: '매끄러운 질감의 긴 생머리, 단순하게 묶은 스타일',
            clothingStyle: '어스톤(베이지/카키/브라운), 린넨/코튼 소재, 편안한 핏, 미니멀한 디자인',
            matchReason: '자연스러운 생머리의 단순미가 편안한 내추럴 룩의 소박함과 완벽히 어울림'
        },
        '소피스티케이트': {
            mood: '세련되고 도시적인',
            hairFeature: '매끈한 스트레이트, 층이 없거나 적은 깔끔한 스타일',
            clothingStyle: '테일러드 블레이저, 깔끔한 라인, 모노크롬(블랙/화이트/그레이), 구조적인 핏',
            matchReason: '매끈한 헤어라인의 깔끔함이 테일러드 슈트의 정돈된 실루엣과 세련된 도시적 이미지 연출'
        },
        '엘레강스': {
            mood: '우아하고 고급스러운',
            hairFeature: '웨이브와 볼륨의 업스타일, 중간 질감과 볼륨',
            clothingStyle: '흐르는 시폰/실크 소재, 부드러운 드레이핑, 진주/골드 액세서리, 여성스러운 A라인',
            matchReason: '우아한 웨이브 업스타일이 흐르는 드레스 라인과 고급스러운 조화를 이룸'
        },
        '로맨틱프리티': {
            mood: '사랑스럽고 소녀다운',
            hairFeature: '굵은 웨이브, 땋은 머리, 핀·리본 사용',
            clothingStyle: '플로럴 프린트, 러플/프릴 디테일, 파스텔 컬러(핑크/라벤더), 리본 포인트',
            matchReason: '사랑스러운 웨이브와 리본의 귀여움이 플로럴/러플 디테일과 로맨틱한 감성 완성'
        },
        '스포티': {
            mood: '활동적이고 경쾌한',
            hairFeature: '짧은 머리, 단순하고 경쾌한 스타일',
            clothingStyle: '애슬레틱 웨어, 스니커즈, 후드/집업, 캐주얼 레이어드, 밝은 액센트 컬러',
            matchReason: '경쾌한 숏컷의 활동성이 스포티한 캐주얼 룩의 에너지와 시너지 발휘'
        },
        '에스닉': {
            mood: '전통적이고 단아한',
            hairFeature: '가운데 가르마/쪽머리, 볼륨 없고 매끄러운 질감',
            clothingStyle: '전통 영감 자수 디테일, 천연 소재(린넨/면), 차분한 컬러, 클래식 실루엣',
            matchReason: '단아한 가르마 스타일이 전통적 영감의 의상과 만나 품격 있는 에스닉 무드 완성'
        }
    };

    // 각 패션 스타일별 편집 프롬프트 생성
    const editPrompts = fashionRecommendations.slice(0, 3).map((rec, index) => {
        const fashionItems = rec.items.join(', ');
        const fashionStyle = rec.style;
        const fashionReason = rec.reason || '';

        // 패션감각 가이드에서 매칭
        const senseKey = Object.keys(hairFashionToClothingGuide).find(key => fashionStyle.includes(key));
        const guide = senseKey ? hairFashionToClothingGuide[senseKey] : {
            mood: '스타일리시한',
            clothingStyle: fashionItems,
            matchReason: '헤어스타일과 조화로운 패션'
        };

        // 영어 프롬프트로 이미지 생성 유도 (한국어는 텍스트만 반환하는 문제 있음)
        return `Edit this image: Change ONLY the clothing/outfit. Generate a new image.

KEEP EXACTLY THE SAME:
- Hair (do not change hairstyle at all)
- Face (same person, same expression)
- Pose and angle
- Background

CHANGE ONLY THE OUTFIT TO:
Style: ${fashionStyle}
Clothing: ${guide.clothingStyle}
Specific items: ${fashionItems}

Generate a fashion magazine quality photo with the new outfit clearly visible.`;
    });

    try {
        console.log('🎨 Gemini 2.5 Flash Image 패션 스타일링 이미지 편집');
        console.log('📋 AI 분석 기반 패션 추천:');
        fashionRecommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec.style}: ${rec.items.join(', ')} - ${rec.reason}`);
        });

        // 병렬로 이미지 3장 동시 편집
        console.log('🚀 이미지 3장 병렬 편집 시작...');
        const imagePromises = editPrompts.map((prompt, i) =>
            editImageWithGemini25(originalImageBase64, prompt, apiKey, i)
        );

        const imageResults = await Promise.allSettled(imagePromises);

        imageResults.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
                results.variations.push(result.value);
                console.log(`✅ 이미지 ${i + 1} 편집 성공`);
            } else {
                console.warn(`⚠️ 이미지 ${i + 1} 편집 실패:`, result.reason?.message || 'null 반환');
            }
        });

        console.log(`✅ 패션 스타일링 이미지 편집 완료: ${results.variations.length}장`);

    } catch (error) {
        console.error('이미지 편집 오류:', error);
    }

    return results;
}

// Gemini 2.5 Flash Image API 호출 - 이미지 편집
async function editImageWithGemini25(imageBase64, editPrompt, apiKey, imageIndex = 0) {
    try {
        console.log(`📝 이미지 ${imageIndex + 1} 편집 프롬프트 (일부): ${editPrompt.substring(0, 80)}...`);
        console.log(`📏 이미지 ${imageIndex + 1} Base64 길이: ${imageBase64.length} 문자`);

        // Gemini 2.5 Flash Image API (이미지 생성/편집)
        // 공식 모델명: gemini-2.5-flash-image
        // responseModalities: ["IMAGE"] - 이미지만 반환하도록 설정
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: editPrompt },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageBase64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE"]
                    }
                })
            }
        );

        console.log(`📡 이미지 ${imageIndex + 1} API 응답 상태: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 이미지 ${imageIndex + 1} Gemini 2.5 Flash Image API 오류:`, response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log(`📦 이미지 ${imageIndex + 1} 결과 키:`, Object.keys(result));

        // 상세 응답 로깅
        if (result.candidates && result.candidates[0]) {
            const candidate = result.candidates[0];
            console.log(`📋 이미지 ${imageIndex + 1} candidate 키:`, Object.keys(candidate));
            if (candidate.content) {
                console.log(`📋 이미지 ${imageIndex + 1} content 키:`, Object.keys(candidate.content));
                if (candidate.content.parts) {
                    console.log(`📋 이미지 ${imageIndex + 1} parts 개수:`, candidate.content.parts.length);
                    candidate.content.parts.forEach((p, i) => {
                        console.log(`📋 이미지 ${imageIndex + 1} part[${i}] 키:`, Object.keys(p));
                    });
                }
            }
            if (candidate.finishReason) {
                console.log(`📋 이미지 ${imageIndex + 1} finishReason:`, candidate.finishReason);
            }
        }

        // 응답에서 이미지 추출
        const parts = result.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inline_data && part.inline_data.data) {
                const imageData = part.inline_data.data;
                const mimeType = part.inline_data.mime_type || 'image/png';
                console.log(`📊 이미지 ${imageIndex + 1} 원본 크기: ${(imageData.length / 1024 / 1024).toFixed(2)}MB`);

                // 압축
                const compressedImage = await compressBase64Image(imageData);
                console.log(`✅ 이미지 ${imageIndex + 1} 압축 후 크기: ${(compressedImage.length / 1024 / 1024).toFixed(2)}MB`);

                return `data:image/jpeg;base64,${compressedImage}`;
            }
        }

        // 텍스트 응답만 있는 경우 로그
        const textPart = parts.find(p => p.text);
        if (textPart) {
            console.log(`📝 이미지 ${imageIndex + 1} 텍스트 응답:`, textPart.text.substring(0, 200));
        }

        console.warn(`⚠️ 이미지 ${imageIndex + 1} 이미지 데이터 없음`);
        return null;
    } catch (error) {
        console.error(`❌ 이미지 ${imageIndex + 1} Gemini 2.5 Flash Image 호출 실패:`, error.message);
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

// PNG Base64를 JPEG로 압축 (크기 약 70% 감소)
async function compressBase64Image(base64Data) {
    try {
        // Base64 → Buffer
        const inputBuffer = Buffer.from(base64Data, 'base64');

        // Sharp로 JPEG 변환 (품질 75%, 리사이즈 800px)
        const compressedBuffer = await sharp(inputBuffer)
            .resize(800, 1067, { // 3:4 비율 유지
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 75 })
            .toBuffer();

        // Buffer → Base64
        return compressedBuffer.toString('base64');
    } catch (error) {
        console.error('이미지 압축 실패:', error.message);
        // 압축 실패 시 원본 반환 (PNG 그대로)
        return base64Data;
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
            best: isKorean ? ["계란형", "역삼각형"] : ["Oval", "Heart"],
            description: isKorean
                ? "볼륨감이 얼굴의 각진 부분을 부드럽게 감싸줍니다."
                : "The volume softly wraps around angular parts of the face.",
            adjustments: isKorean ? {
                oval: "계란형: 이상적 기본형이므로 이 스타일을 그대로 연출 가능. 윤곽을 드러내는 방향으로",
                round: "원형: 두정부 볼륨을 더 살려 세로 길이감 강조, 양쪽 뺨을 살짝 가리는 방향으로 조정",
                oblong: "긴형: 양옆 볼륨을 추가하고, 앞머리를 내려 이마를 덮어 세로 길이 완화",
                square: "사각형: 옆머리로 뺨과 턱 라인을 부드럽게 감싸고, 웨이브로 각진 인상 완화",
                heart: "역삼각형: 이마 양쪽을 덮고 턱 부분에 볼륨을 주어 좁은 턱선 보완"
            } : {
                oval: "Oval: Ideal face shape, can style as-is. Highlight facial contours",
                round: "Round: Add crown volume for vertical length, cover cheeks slightly",
                oblong: "Oblong: Add side volume, use bangs to cover forehead",
                square: "Square: Soften jaw with side hair, add waves to reduce angular look",
                heart: "Heart: Cover forehead sides, add volume at chin level"
            }
        },
        fashionRecommendations: [
            {
                style: isKorean ? "내추럴" : "Natural",
                styleDescription: isKorean
                    ? "자연스럽고 소박한 감성, 편안하면서도 정돈된 느낌"
                    : "Effortless, organic, relaxed aesthetic",
                items: isKorean
                    ? ["베이지 리넨 셔츠", "화이트 코튼 티셔츠", "내추럴 톤 와이드 팬츠", "가죽 샌들"]
                    : ["Beige Linen Shirt", "White Cotton T-shirt", "Natural Tone Wide Pants", "Leather Sandals"],
                reason: isKorean
                    ? "자연스러운 웨이브와 편안한 내추럴 룩의 완벽한 조화"
                    : "Perfect harmony of natural waves with relaxed natural look"
            },
            {
                style: isKorean ? "로맨틱프리티" : "Romantic Pretty",
                styleDescription: isKorean
                    ? "귀엽고 소녀다운 감성, 사랑스럽고 여성스러운 느낌"
                    : "Sweet, youthful, charming aesthetic",
                items: isKorean
                    ? ["플로럴 프린트 원피스", "아이보리 카디건", "리본 헤어핀", "메리제인 슈즈"]
                    : ["Floral Print Dress", "Ivory Cardigan", "Ribbon Hair Pin", "Mary Jane Shoes"],
                reason: isKorean
                    ? "부드러운 웨이브가 여성스럽고 사랑스러운 룩을 완성"
                    : "Soft waves complete the feminine and lovely look"
            },
            {
                style: isKorean ? "소피스티케이트" : "Sophisticate",
                styleDescription: isKorean
                    ? "세련되고 도시적인 감성, 정돈되고 고급스러운 느낌"
                    : "Refined, urban, polished aesthetic",
                items: isKorean
                    ? ["블랙 테일러드 블레이저", "화이트 실크 블라우스", "하이웨이스트 슬랙스", "포인티드 토 힐"]
                    : ["Black Tailored Blazer", "White Silk Blouse", "High-waist Slacks", "Pointed Toe Heels"],
                reason: isKorean
                    ? "구조적인 패션과 유연한 웨이브 헤어의 세련된 대비"
                    : "Sophisticated contrast between structured fashion and flowing waves"
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
