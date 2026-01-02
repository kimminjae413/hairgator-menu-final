// netlify/functions/lookbook-analyze.js
// HAIRGATOR Lookbook AI Analysis
/* eslint-disable no-unused-vars */
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
        const {
            imageUrl,
            language = 'ko',
            generateImages = true,
            gender = '',
            category = '',
            subcategory = '',
            styleName = ''
        } = JSON.parse(event.body);

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

        // 헤어스타일 정보 객체 생성
        const hairInfo = {
            gender,
            category,
            subcategory,
            styleName
        };

        console.log('📖 Lookbook 분석 시작 (Gemini 2.0 Flash 분석 + Gemini 2.5 Flash Image 편집)');
        console.log('📋 전달된 성별:', gender || '없음 (AI가 판단)');
        console.log('📋 헤어 카테고리:', category || '없음', '/', subcategory || '없음');
        console.log('📋 스타일명:', styleName || '없음');

        // 1단계: Gemini 2.0 Flash로 헤어스타일 분석
        const analysisResult = await analyzeWithGemini2Flash(imageUrl, GEMINI_KEY, language, gender);

        // 2단계: Gemini 2.5 Flash Image로 이미지 편집 (원본 이미지 기반, 옷만 변경)
        let generatedImages = null;
        if (generateImages) {
            try {
                generatedImages = await editWithGemini25FlashImage(imageUrl, analysisResult, GEMINI_KEY, hairInfo);
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
    // 언어별 프롬프트 생성
    const prompt = getLocalizedPrompt(language, providedGender);

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
async function editWithGemini25FlashImage(originalImageUrl, analysis, apiKey, hairInfo = {}) {
    const { gender, styleName, characteristics, fashionRecommendations } = analysis;

    // 헤어스타일 정보 구성 (메뉴판에서 전달받은 정보 우선 사용)
    const hairCategory = hairInfo.category || '';
    const hairSubcategory = hairInfo.subcategory || '';
    const hairStyleName = hairInfo.styleName || styleName || '';
    const hairGender = hairInfo.gender || gender || 'female';

    // 헤어 길이/스타일 설명 생성
    let hairLengthDesc = '';
    if (hairGender === 'male') {
        // 남성 카테고리별 헤어 설명
        const maleHairDesc = {
            'SIDE FRINGE': 'short side-swept fringe, short back and sides',
            'SIDE PART': 'short side-parted hair, clean cut',
            'FRINGE UP': 'short hair with upswept fringe, textured top',
            'PUSHED BACK': 'short slicked-back hair, neat and tidy',
            'BUZZ': 'very short buzz cut, almost shaved',
            'CROP': 'short cropped hair with textured fringe',
            'MOHICAN': 'short mohawk style, shaved sides'
        };
        hairLengthDesc = maleHairDesc[hairCategory] || 'short male hairstyle';
    } else {
        // 여성 카테고리별 헤어 설명
        const femaleHairDesc = {
            'A LENGTH': 'very long hair below chest',
            'B LENGTH': 'long hair between chest and collarbone',
            'C LENGTH': 'medium-long hair below collarbone',
            'D LENGTH': 'shoulder-length hair',
            'E LENGTH': 'short bob above shoulder',
            'F LENGTH': 'chin-length bob',
            'G LENGTH': 'jaw-length mini bob',
            'H LENGTH': 'very short pixie cut'
        };
        hairLengthDesc = femaleHairDesc[hairCategory] || 'medium length hairstyle';
    }

    console.log('📋 헤어 정보:', { hairCategory, hairSubcategory, hairStyleName, hairGender, hairLengthDesc });

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
    const editPrompts = fashionRecommendations.slice(0, 3).map((rec, _index) => {
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

        // 전신샷 프롬프트: 헤어스타일 유지 + 패션 코디
        return `Generate a FULL BODY fashion photo of a ${hairGender} model with the EXACT SAME HAIRSTYLE as the reference image.

⚠️ CRITICAL - HAIRSTYLE MUST BE PRESERVED EXACTLY:
- Gender: ${hairGender.toUpperCase()}
- Hairstyle: ${hairLengthDesc}
${hairCategory ? `- Hair Category: ${hairCategory}` : ''}
${hairStyleName ? `- Style Name: ${hairStyleName}` : ''}
- COPY THE EXACT HAIRSTYLE from the reference: same length, same cut, same texture, same color
- ${hairGender === 'male' ? '⚠️ THIS IS SHORT MALE HAIR - DO NOT generate long hair! Keep it SHORT!' : ''}
- The hairstyle is the MOST IMPORTANT element to preserve

FASHION OUTFIT TO WEAR:
- Style: ${fashionStyle}
- Clothing: ${guide.clothingStyle}
- Items: ${fashionItems}

OUTPUT:
- Full body shot (head to toe)
- Fashion editorial quality
- Clean background
- The model can look different, but the HAIRSTYLE must be IDENTICAL to the reference`;
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
        // API 응답은 camelCase (inlineData)를 사용함
        const parts = result.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            // camelCase: inlineData (REST API 응답 형식)
            if (part.inlineData && part.inlineData.data) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
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

// ==================== 다국어 프롬프트 생성 ====================
function getLocalizedPrompt(language, providedGender = '') {
    // 언어별 프롬프트 템플릿
    const prompts = {
        ko: getKoreanPrompt(providedGender),
        en: getEnglishPrompt(providedGender),
        ja: getJapanesePrompt(providedGender),
        zh: getChinesePrompt(providedGender),
        vi: getVietnamesePrompt(providedGender)
    };

    return prompts[language] || prompts.ko;
}

function getKoreanPrompt(providedGender) {
    const genderInstruction = providedGender
        ? `중요: 이 헤어스타일은 ${providedGender === 'male' ? '남성' : '여성'} 스타일입니다. gender 필드는 반드시 "${providedGender}"로 설정하세요.`
        : '이미지를 보고 성별을 판단해주세요.';

    return `당신은 20년 경력의 최고급 헤어살롱 수석 디자이너이자 보그(Vogue) 매거진 뷰티 에디터입니다.
고객에게 직접 컨설팅하듯 이 헤어스타일 이미지를 전문가의 눈으로 세밀하게 분석해주세요.

한국어로 답변해주세요.

${genderInstruction}

📋 분석 가이드라인:

【이미지 관찰 필수】
- 먼저 이미지를 꼼꼼히 살펴보세요: 길이, 결, 볼륨 위치, 앞머리 형태, 레이어 유무, 컬/웨이브 패턴
- 이 헤어스타일만의 고유한 특징을 찾아내세요

【헤어스타일 → 패션감각 매칭 가이드 (논문 기반)】
헤어스타일 특성에 따라 어울리는 패션감각을 추천하세요:
- 길고 굵은 웨이브/스트레이트, 볼륨 많음, 촉촉한 이미지 → 섹시
- 이색적/실험적 스타일, 독특한 염색, 비대칭 → 아방가르드
- 매끄러운 긴 생머리, 단순하게 묶은 스타일 → 내추럴
- 매끈한 스트레이트, 층 없거나 적음, 깔끔함 → 소피스티케이트
- 웨이브 업스타일, 중간 질감과 볼륨 → 엘레강스
- 굵은 웨이브, 땋은 머리, 핀/리본 사용 → 로맨틱프리티
- 짧은 머리, 단순하고 경쾌함 → 스포티
- 가운데 가르마, 볼륨 없고 매끄러움 → 에스닉

【얼굴형별 추천 포인트】
- 계란형: 어떤 스타일도 가능, 윤곽 드러내기
- 원형: 두정부 볼륨으로 길이 강조, 양쪽 뺨 가림 → 내추럴/소피스티케이트 추천
- 긴형: 양옆 볼륨, 앞머리로 세로 길이 완화 → 엘레강스/소피스티케이트 추천
- 사각형: 옆머리로 뺨 가림, 웨이브로 부드럽게 → 로맨틱프리티/스포티 추천
- 역삼각형: 이마 양쪽 덮고 턱 부분 볼륨 → 섹시/에스닉 추천

【전문가다운 구체적 조언】
- "수분이 필요합니다" (X) → "모발 중간~끝 부분의 푸석함을 줄이려면 주 2회 헤어 마스크를 권장합니다" (O)
- "볼륨을 살리세요" (X) → "정수리 부분에 볼륨 스프레이를 뿌리고 드라이기 바람을 아래에서 위로 넣어주세요" (O)

【⚠️ 패션 아이템 필수 가이드 - 2024-2025 트렌드】
옷 추천 시 반드시 현실적이고 트렌디한 아이템으로:
- ❌ 피해야 할 표현: "시폰 블라우스", "새틴 드레스", "테일러드 슬랙스", "클래식 펌프스" (너무 올드함)
- ✅ 사용할 표현:
  · 여성: 크롭가디건, 와이드팬츠, 발레코어, 미니스커트, 오버핏후드, 레이어드탑, 플리츠스커트, 메리제인슈즈, 청바지, 카고팬츠
  · 남성: 오버핏셔츠, 와이드데님, 스트릿후드, 트랙팬츠, 레이어드, 뉴발란스/아식스, 볼캡, 크로스백
- 무신사, 자라, 유니클로, 에이블리 등에서 실제 구매 가능한 스타일로
- "2024 F/W", "요즘 유행하는", "MZ세대" 같은 표현 활용

다음 JSON 형식으로 응답해주세요:

{
    "gender": "${providedGender || 'male 또는 female'}",
    "styleName": "정확한 스타일명 (예: 레이어드 미디엄 C컬펌, 시스루뱅 롱 스트레이트, 투블럭 댄디컷 등)",
    "styleDescription": "이 헤어스타일의 핵심 특징을 마치 고객에게 설명하듯 자연스럽게 3-4문장으로 서술",
    "characteristics": {
        "length": "구체적 길이",
        "texture": "정확한 텍스처",
        "volume": "볼륨 위치와 정도",
        "layering": "레이어 상세"
    },
    "faceShapes": {
        "best": ["추천 얼굴형 1-2개"],
        "description": "어울리는 이유 설명"
    },
    "fashionRecommendations": [
        {
            "style": "패션감각 (섹시/아방가르드/내추럴/소피스티케이트/엘레강스/로맨틱프리티/스포티/에스닉)",
            "styleDescription": "패션감각 설명",
            "items": ["2024-2025 트렌드 반영한 현실적인 옷 4개 - 무신사/자라/유니클로에서 살 수 있는 아이템으로 (예: 오버핏 크롭 가디건, 와이드 데님, 발레코어 플랫슈즈, 미니백)"],
            "reason": "어울리는 이유"
        },
        { "style": "두 번째 패션감각", "styleDescription": "설명", "items": ["트렌디하고 현실적인 아이템"], "reason": "이유" },
        { "style": "세 번째 패션감각", "styleDescription": "설명", "items": ["트렌디하고 현실적인 아이템"], "reason": "이유" }
    ],
    "stylingTips": [
        { "title": "스타일링 팁 1", "description": "설명" },
        { "title": "스타일링 팁 2", "description": "설명" },
        { "title": "스타일링 팁 3", "description": "설명" }
    ],
    "maintenance": {
        "hydration": "높음/중간/낮음",
        "trimCycle": "숫자만 (커트 주기 가이드: 남성 버즈/크롭컷 3-4주, 남성 일반 숏컷 4-5주, 여성 숏컷 4-6주, 여성 미디엄 6-8주, 여성 롱헤어 8-12주)",
        "products": ["제품 3개"],
        "tips": "관리 팁"
    },
    "tags": ["#키워드 5개"]
}

JSON만 출력하세요.`;
}

function getEnglishPrompt(providedGender) {
    const genderInstruction = providedGender
        ? `Important: This hairstyle is for ${providedGender === 'male' ? 'male' : 'female'}. Set the gender field to "${providedGender}".`
        : 'Please determine the gender from the image.';

    return `You are a senior hair designer with 20 years of experience at a top-tier salon and a beauty editor for Vogue magazine.
Analyze this hairstyle image with professional expertise as if you were consulting directly with a client.

Please respond in English.

${genderInstruction}

📋 Analysis Guidelines:

【Image Observation Required】
- Carefully examine the image: length, texture, volume placement, bangs style, layering, curl/wave patterns
- Identify unique characteristics of this hairstyle

【Hairstyle → Fashion Sense Matching Guide (Research-based)】
Recommend fashion senses based on hairstyle characteristics:
- Long voluminous waves/straight, wet look → Sexy
- Experimental/unique style, unusual colors, asymmetric → Avant-garde
- Smooth long straight hair, simple tied style → Natural
- Sleek straight, minimal layers, clean look → Sophisticate
- Wave updo, medium texture and volume → Elegance
- Bold waves, braids, pins/ribbons → Romantic Pretty
- Short hair, simple and energetic → Sporty
- Center part, no volume, smooth texture → Ethnic

【Face Shape Recommendations】
- Oval: Any style works, highlight contours
- Round: Crown volume for length, cover cheeks → Natural/Sophisticate recommended
- Oblong: Side volume, bangs to reduce length → Elegance/Sophisticate recommended
- Square: Side hair to soften jaw, waves → Romantic Pretty/Sporty recommended
- Heart: Cover forehead sides, chin volume → Sexy/Ethnic recommended

【Professional Specific Advice】
- Instead of "needs moisture" → "To reduce dryness at mid-lengths to ends, we recommend a hair mask twice weekly"
- Instead of "add volume" → "Apply volume spray at the crown and blow dry from underneath"

【⚠️ Fashion Items Guide - 2024-2025 Trends】
Recommend realistic, trendy items you can actually buy:
- ❌ Avoid: "chiffon blouse", "satin dress", "tailored slacks", "classic pumps" (too outdated)
- ✅ Use instead:
  · Women: crop cardigan, wide leg pants, balletcore flats, mini skirt, oversized hoodie, layered tops, pleated skirt, Mary Janes, denim, cargo pants
  · Men: oversized shirt, wide denim, streetwear hoodie, track pants, layered look, New Balance/Asics sneakers, cap, crossbody bag
- Items available at Zara, Uniqlo, H&M, ASOS
- Use terms like "2024 F/W trend", "Gen-Z style", "currently trending"

Respond in the following JSON format:

{
    "gender": "${providedGender || 'male or female'}",
    "styleName": "Exact style name (e.g., Layered Medium C-curl Perm, See-through Bangs Long Straight)",
    "styleDescription": "Describe key features naturally in 3-4 sentences as if explaining to a client",
    "characteristics": {
        "length": "Specific length",
        "texture": "Exact texture",
        "volume": "Volume placement and degree",
        "layering": "Layering details"
    },
    "faceShapes": {
        "best": ["1-2 recommended face shapes"],
        "description": "Why it suits these face shapes"
    },
    "fashionRecommendations": [
        {
            "style": "Fashion sense (Sexy/Avant-garde/Natural/Sophisticate/Elegance/Romantic Pretty/Sporty/Ethnic)",
            "styleDescription": "Fashion sense description",
            "items": ["4 trendy, realistic items from 2024-2025 (e.g., crop cardigan, wide denim, chunky sneakers, mini bag)"],
            "reason": "Why this fashion matches the hairstyle"
        },
        { "style": "Second fashion sense", "styleDescription": "description", "items": ["trendy realistic items"], "reason": "reason" },
        { "style": "Third fashion sense", "styleDescription": "description", "items": ["trendy realistic items"], "reason": "reason" }
    ],
    "stylingTips": [
        { "title": "Styling tip 1", "description": "description" },
        { "title": "Styling tip 2", "description": "description" },
        { "title": "Styling tip 3", "description": "description" }
    ],
    "maintenance": {
        "hydration": "High/Medium/Low",
        "trimCycle": "number only (Trim guide: male buzz/crop 3-4wks, male short 4-5wks, female short 4-6wks, female medium 6-8wks, female long 8-12wks)",
        "products": ["3 products"],
        "tips": "maintenance tip"
    },
    "tags": ["#5 keywords"]
}

Output JSON only.`;
}

function getJapanesePrompt(providedGender) {
    const genderInstruction = providedGender
        ? `重要：このヘアスタイルは${providedGender === 'male' ? '男性' : '女性'}向けです。genderフィールドは必ず"${providedGender}"に設定してください。`
        : '画像から性別を判断してください。';

    return `あなたは20年の経験を持つ一流ヘアサロンのシニアデザイナーであり、Vogueマガジンのビューティーエディターです。
お客様に直接カウンセリングするように、このヘアスタイル画像を専門家の目で詳細に分析してください。

日本語で回答してください。

${genderInstruction}

📋 分析ガイドライン：

【画像観察必須】
- 画像を注意深く確認：長さ、質感、ボリュームの位置、前髪の形、レイヤーの有無、カール/ウェーブパターン
- このヘアスタイル独自の特徴を見つけてください

【ヘアスタイル→ファッション感覚マッチングガイド（論文基盤）】
ヘアスタイルの特徴に基づいてファッション感覚を推奨：
- 長くボリュームのあるウェーブ/ストレート、ウェットルック → セクシー
- 実験的/ユニークなスタイル、独特な色、非対称 → アバンギャルド
- なめらかなロングストレート、シンプルなまとめ髪 → ナチュラル
- 艶やかストレート、レイヤー少なめ、クリーンな印象 → ソフィスティケート
- ウェーブアップスタイル、ミディアム質感とボリューム → エレガンス
- 大きなウェーブ、編み込み、ピン/リボン使用 → ロマンティック
- ショートヘア、シンプルで活発 → スポーティー
- センターパート、ボリュームなし、なめらかな質感 → エスニック

【顔型別推奨ポイント】
- 卵型：どんなスタイルもOK、輪郭を強調
- 丸型：頭頂部ボリュームで長さ強調、頬をカバー → ナチュラル/ソフィスティケート推奨
- 面長：サイドボリューム、前髪で縦の長さ緩和 → エレガンス/ソフィスティケート推奨
- 四角型：サイドヘアで顎をソフトに、ウェーブで → ロマンティック/スポーティー推奨
- 逆三角形：額の両側をカバー、顎にボリューム → セクシー/エスニック推奨

【⚠️ ファッションアイテムガイド - 2024-2025トレンド】
実際に購入できるトレンディなアイテムを推奨：
- ❌ 避ける表現：「シフォンブラウス」「サテンドレス」「テーラードスラックス」（古臭い）
- ✅ 使う表現：
  · 女性：クロップカーディガン、ワイドパンツ、バレエコア、ミニスカート、オーバーサイズパーカー、レイヤードトップス
  · 男性：オーバーサイズシャツ、ワイドデニム、ストリートパーカー、トラックパンツ、ニューバランス/アシックス
- ZARA、ユニクロ、GUで実際に買えるスタイルで
- 「2024 F/W」「今流行りの」「Z世代」などの表現を活用

以下のJSON形式で回答してください：

{
    "gender": "${providedGender || 'male または female'}",
    "styleName": "正確なスタイル名（例：レイヤードミディアムCカールパーマ）",
    "styleDescription": "このヘアスタイルの主な特徴を3-4文で自然に説明",
    "characteristics": {
        "length": "具体的な長さ",
        "texture": "正確なテクスチャー",
        "volume": "ボリュームの位置と程度",
        "layering": "レイヤーの詳細"
    },
    "faceShapes": {
        "best": ["おすすめの顔型1-2個"],
        "description": "似合う理由の説明"
    },
    "fashionRecommendations": [
        {
            "style": "ファッション感覚（セクシー/アバンギャルド/ナチュラル/ソフィスティケート/エレガンス/ロマンティック/スポーティー/エスニック）",
            "styleDescription": "ファッション感覚の説明",
            "items": ["服アイテム4つ"],
            "reason": "合う理由"
        },
        { "style": "2番目", "styleDescription": "説明", "items": ["アイテム"], "reason": "理由" },
        { "style": "3番目", "styleDescription": "説明", "items": ["アイテム"], "reason": "理由" }
    ],
    "stylingTips": [
        { "title": "スタイリングヒント1", "description": "説明" },
        { "title": "スタイリングヒント2", "description": "説明" },
        { "title": "スタイリングヒント3", "description": "説明" }
    ],
    "maintenance": {
        "hydration": "高い/中程度/低い",
        "trimCycle": "数字のみ（カット周期ガイド：男性バズ/クロップ3-4週、男性ショート4-5週、女性ショート4-6週、女性ミディアム6-8週、女性ロング8-12週）",
        "products": ["製品3つ"],
        "tips": "ケアのヒント"
    },
    "tags": ["#キーワード5つ"]
}

JSONのみ出力してください。`;
}

function getChinesePrompt(providedGender) {
    const genderInstruction = providedGender
        ? `重要：这个发型是${providedGender === 'male' ? '男性' : '女性'}风格。gender字段必须设置为"${providedGender}"。`
        : '请根据图片判断性别。';

    return `您是一位拥有20年经验的顶级沙龙首席发型设计师，同时也是Vogue杂志的美容编辑。
请像直接为客户咨询一样，用专业的眼光详细分析这张发型图片。

请用中文回答。

${genderInstruction}

📋 分析指南：

【图片观察必需】
- 仔细观察图片：长度、质地、蓬松位置、刘海形状、层次有无、卷/波浪图案
- 找出这个发型的独特特征

【发型→时尚感匹配指南（研究基础）】
根据发型特征推荐时尚感：
- 长而丰盈的波浪/直发、湿润感 → 性感
- 实验性/独特风格、特殊发色、不对称 → 前卫
- 光滑的长直发、简单的扎发 → 自然
- 光亮直发、少层次、干净利落 → 精致
- 波浪盘发、中等质感和蓬松度 → 优雅
- 大波浪、编发、发夹/蝴蝶结 → 浪漫
- 短发、简单活泼 → 运动
- 中分、无蓬松、光滑质感 → 民族

【脸型推荐要点】
- 椭圆形：任何风格都适合，突出轮廓
- 圆形：头顶蓬松增加长度感，遮盖脸颊 → 推荐自然/精致
- 长形：两侧蓬松，刘海减少纵向长度 → 推荐优雅/精致
- 方形：侧发柔化下颌，波浪 → 推荐浪漫/运动
- 心形：遮盖额头两侧，下巴处增加蓬松 → 推荐性感/民族

【⚠️ 时尚单品指南 - 2024-2025趋势】
推荐实际可购买的潮流单品：
- ❌ 避免：「雪纺衬衫」「缎面连衣裙」「西装裤」（太老气）
- ✅ 使用：
  · 女性：短款开衫、阔腿裤、芭蕾风平底鞋、迷你裙、oversize卫衣、叠穿上衣、百褶裙、玛丽珍鞋
  · 男性：宽松衬衫、阔腿牛仔裤、街头卫衣、运动裤、New Balance/亚瑟士球鞋、棒球帽、斜挎包
- ZARA、优衣库、H&M可以买到的款式
- 使用「2024秋冬」「当下流行」「Z世代」等表达

请按以下JSON格式回答：

{
    "gender": "${providedGender || 'male 或 female'}",
    "styleName": "准确的发型名称（例如：层次中长C卷烫）",
    "styleDescription": "用3-4句话自然地描述这个发型的主要特点",
    "characteristics": {
        "length": "具体长度",
        "texture": "准确的质地",
        "volume": "蓬松位置和程度",
        "layering": "层次细节"
    },
    "faceShapes": {
        "best": ["推荐脸型1-2个"],
        "description": "适合的原因说明"
    },
    "fashionRecommendations": [
        {
            "style": "时尚感（性感/前卫/自然/精致/优雅/浪漫/运动/民族）",
            "styleDescription": "时尚感说明",
            "items": ["服装单品4件"],
            "reason": "搭配原因"
        },
        { "style": "第二个", "styleDescription": "说明", "items": ["单品"], "reason": "原因" },
        { "style": "第三个", "styleDescription": "说明", "items": ["单品"], "reason": "原因" }
    ],
    "stylingTips": [
        { "title": "造型技巧1", "description": "说明" },
        { "title": "造型技巧2", "description": "说明" },
        { "title": "造型技巧3", "description": "说明" }
    ],
    "maintenance": {
        "hydration": "高/中/低",
        "trimCycle": "仅数字（剪发周期指南：男性寸头/短碎3-4周、男性短发4-5周、女性短发4-6周、女性中发6-8周、女性长发8-12周）",
        "products": ["产品3个"],
        "tips": "护理技巧"
    },
    "tags": ["#关键词5个"]
}

只输出JSON。`;
}

function getVietnamesePrompt(providedGender) {
    const genderInstruction = providedGender
        ? `Quan trọng: Kiểu tóc này dành cho ${providedGender === 'male' ? 'nam' : 'nữ'}. Trường gender phải được đặt là "${providedGender}".`
        : 'Vui lòng xác định giới tính từ hình ảnh.';

    return `Bạn là nhà thiết kế tóc cao cấp với 20 năm kinh nghiệm tại salon hàng đầu và biên tập viên làm đẹp của tạp chí Vogue.
Hãy phân tích hình ảnh kiểu tóc này với chuyên môn như đang tư vấn trực tiếp cho khách hàng.

Vui lòng trả lời bằng tiếng Việt.

${genderInstruction}

📋 Hướng dẫn phân tích：

【Quan sát hình ảnh bắt buộc】
- Kiểm tra kỹ hình ảnh: độ dài, kết cấu, vị trí phồng, kiểu mái, có lớp không, kiểu xoăn/sóng
- Xác định đặc điểm riêng biệt của kiểu tóc này

【Hướng dẫn kết hợp Kiểu tóc → Phong cách thời trang (Dựa trên nghiên cứu)】
Đề xuất phong cách thời trang dựa trên đặc điểm kiểu tóc:
- Sóng/thẳng dài bồng bềnh, vẻ ướt át → Quyến rũ
- Phong cách thử nghiệm/độc đáo, màu lạ, bất đối xứng → Tiên phong
- Tóc thẳng dài mượt, buộc đơn giản → Tự nhiên
- Thẳng bóng mượt, ít tầng, gọn gàng → Tinh tế
- Búi tóc xoăn, kết cấu và độ phồng trung bình → Thanh lịch
- Sóng lớn, tết tóc, kẹp/nơ → Lãng mạn
- Tóc ngắn, đơn giản năng động → Thể thao
- Ngôi giữa, không phồng, kết cấu mượt → Dân tộc

【Gợi ý theo hình dạng khuôn mặt】
- Hình trứng: Mọi phong cách đều phù hợp, làm nổi bật đường nét
- Tròn: Phồng đỉnh đầu tăng chiều dài, che má → Đề xuất Tự nhiên/Tinh tế
- Dài: Phồng hai bên, mái che bớt chiều dọc → Đề xuất Thanh lịch/Tinh tế
- Vuông: Tóc bên làm mềm hàm, xoăn sóng → Đề xuất Lãng mạn/Thể thao
- Trái tim: Che hai bên trán, phồng ở cằm → Đề xuất Quyến rũ/Dân tộc

【⚠️ Hướng dẫn đồ thời trang - Xu hướng 2024-2025】
Đề xuất món đồ thực tế, hợp xu hướng:
- ❌ Tránh: "áo voan", "váy lụa satin", "quần tây" (quá cũ)
- ✅ Sử dụng:
  · Nữ: áo cardigan croptop, quần ống rộng, giày ballet, chân váy mini, hoodie oversize, áo layer, chân váy xếp ly, giày Mary Jane
  · Nam: áo sơ mi oversize, quần jean ống rộng, hoodie streetwear, quần track, giày New Balance/Asics, nón lưỡi trai, túi đeo chéo
- Đồ có thể mua ở Zara, Uniqlo, H&M
- Sử dụng "xu hướng 2024", "đang hot", "Gen Z"

Vui lòng trả lời theo định dạng JSON sau：

{
    "gender": "${providedGender || 'male hoặc female'}",
    "styleName": "Tên kiểu tóc chính xác (ví dụ: Uốn xoăn C tầng trung)",
    "styleDescription": "Mô tả tự nhiên các đặc điểm chính trong 3-4 câu",
    "characteristics": {
        "length": "Độ dài cụ thể",
        "texture": "Kết cấu chính xác",
        "volume": "Vị trí và mức độ phồng",
        "layering": "Chi tiết lớp"
    },
    "faceShapes": {
        "best": ["1-2 hình dạng khuôn mặt được đề xuất"],
        "description": "Giải thích tại sao phù hợp"
    },
    "fashionRecommendations": [
        {
            "style": "Phong cách thời trang (Quyến rũ/Tiên phong/Tự nhiên/Tinh tế/Thanh lịch/Lãng mạn/Thể thao/Dân tộc)",
            "styleDescription": "Mô tả phong cách",
            "items": ["4 món đồ quần áo"],
            "reason": "Lý do phù hợp"
        },
        { "style": "Thứ hai", "styleDescription": "mô tả", "items": ["món đồ"], "reason": "lý do" },
        { "style": "Thứ ba", "styleDescription": "mô tả", "items": ["món đồ"], "reason": "lý do" }
    ],
    "stylingTips": [
        { "title": "Mẹo tạo kiểu 1", "description": "mô tả" },
        { "title": "Mẹo tạo kiểu 2", "description": "mô tả" },
        { "title": "Mẹo tạo kiểu 3", "description": "mô tả" }
    ],
    "maintenance": {
        "hydration": "Cao/Trung bình/Thấp",
        "trimCycle": "chỉ số (Hướng dẫn cắt: nam buzz/crop 3-4 tuần, nam ngắn 4-5 tuần, nữ ngắn 4-6 tuần, nữ trung 6-8 tuần, nữ dài 8-12 tuần)",
        "products": ["3 sản phẩm"],
        "tips": "mẹo chăm sóc"
    },
    "tags": ["#5 từ khóa"]
}

Chỉ xuất JSON.`;
}
