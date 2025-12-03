// lib/vision-analyzer.js
// Gemini Vision 이미지 분석 모듈

const { FEMALE_PARAMS_SCHEMA, MALE_PARAMS_SCHEMA } = require('./schemas');

// ==================== 여자 이미지 분석 프롬프트 ====================
function getFemaleVisionPrompt() {
  return `You are "HAIRGATOR AI," an expert hair analyst for WOMEN's hairstyles.

## LENGTH CLASSIFICATION (Body Landmark Based) ⭐ CRITICAL!

| Code | Body Reference | Description |
|------|---------------|-------------|
| H | Ear level/Nape | Very Short - Pixie, Very Short Cut |
| G | Jawline | Short Bob - Neck fully visible |
| F | Below jaw, Above shoulder | Bob - Neck partially covered |
| E | Shoulder line | Medium - Hair touches shoulder |
| D | Below shoulder, Above armpit | Semi-Long |
| C | Armpit/Chest line | Long |
| B | Mid-chest (Bra line) | Very Long ⭐ |
| A | Below chest/Waist | Super Long |

🚨 B Length vs D Length (CRITICAL):
- Hair reaching CHEST level → B Length (NOT D!)
- Hair below shoulder but above armpit → D Length

## CUT FORM
- O (One Length): 0° lifting, solid weight line
- G (Graduation): 45-89°, weight at bottom
- L (Layer): 90°+, movement throughout

## VOLUME ZONE (Based on Lifting)
- Low: 0-44° (bottom weight)
- Medium: 45-89° (mid volume)
- High: 90°+ (top volume)

## SECTION PRIMARY (Zone-Based)
- Back → Diagonal-Backward (DBS)
- Side → Vertical (VS)
- Top → DBS or VS
- Fringe → Horizontal (HS)

## OUTPUT - MUST BE VALID JSON!
Return ONLY a valid JSON object with exact field names from the schema.
NO markdown, NO explanation, NO code blocks!`;
}

// ==================== 남자 이미지 분석 프롬프트 ====================
// NOTE: chatbot-api.js의 analyzeManImageVision 함수에서 별도 프롬프트 사용 중
// 이 프롬프트는 lib 모듈용 백업으로 유지
function getMaleVisionPrompt() {
  return `You are a men's hairstyle classifier.

## 🚨 MOST IMPORTANT: Check for VISIBLE PART LINE first! 🚨

STEP 1: Look at the scalp/head top area.
- Can you see a CLEAR LINE where hair divides? (두피가 보이는 가르마)
- Is there a visible separation where scalp shows through?

If NO visible part line → style_category = "SF"
If YES visible part line → style_category = "SP"

## SF (Side Fringe) - 90% of natural Korean men's styles
- Bangs fall onto forehead (앞머리가 이마로 내려옴)
- Hair may be textured, messy, or slightly flowing
- NO visible scalp line dividing the hair
- 댄디컷, 시스루컷, 자연스러운 앞머리 = ALL SF

## SP (Side Part) - ONLY with visible part line
- You MUST see the scalp through a clear part line
- Hair clearly divided into two directions from the part
- 가르마가 눈에 보여야만 SP

## Other styles
- FU: Fringe styled UP (앞머리 위로)
- PB: ALL hair pushed back, forehead exposed
- BZ: Buzz cut (very short clipper)
- CP: Crop cut (short textured top)
- MC: Mohawk

## OUTPUT (JSON only)
{
  "has_part_line": false,
  "style_category": "SF",
  "style_name": "Side Fringe",
  "sub_style": "댄디컷",
  "top_length": "Medium",
  "side_length": "Short",
  "fade_type": "None",
  "texture": "Textured"
}

⚠️ DEFAULT TO SF unless you clearly see a part line on scalp!`;
}

// ==================== 여자 이미지 분석 ====================
async function analyzeWomanImage(imageBase64, mimeType, geminiKey) {
  console.log('📸 Gemini Vision 여자 이미지 분석 시작');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              },
              { text: getFemaleVisionPrompt() }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4000,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response text from Gemini');
    }

    // JSON 파싱
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const params = JSON.parse(cleanedText);

    // 성별 강제 설정
    params.cut_category = "Women's Cut";

    console.log('✅ 여자 이미지 분석 완료:', params.length_category);
    return params;

  } catch (error) {
    console.error('💥 analyzeWomanImage Error:', error);
    throw error;
  }
}

// ==================== 남자 이미지 분석 ====================
async function analyzeManImage(imageBase64, mimeType, geminiKey) {
  console.log('📸 Gemini Vision 남자 이미지 분석 시작');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              },
              { text: getMaleVisionPrompt() }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4000,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response text from Gemini');
    }

    // JSON 파싱
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const params = JSON.parse(cleanedText);

    // 성별 강제 설정
    params.cut_category = "Men's Cut";

    console.log('✅ 남자 이미지 분석 완료:', params.style_category, params.style_name);
    return params;

  } catch (error) {
    console.error('💥 analyzeManImage Error:', error);
    throw error;
  }
}

// ==================== 통합 이미지 분석 (성별 기반) ====================
async function analyzeImage(imageBase64, mimeType, geminiKey, userGender = null) {
  console.log(`🎯 이미지 분석 시작 - 사용자 선택 성별: ${userGender || 'unspecified'}`);

  if (userGender === 'male') {
    return await analyzeManImage(imageBase64, mimeType, geminiKey);
  } else if (userGender === 'female') {
    return await analyzeWomanImage(imageBase64, mimeType, geminiKey);
  } else {
    // 성별 미지정 시 기본 여자로 (기존 동작 유지)
    console.log('⚠️ 성별 미지정, 기본값 female 사용');
    return await analyzeWomanImage(imageBase64, mimeType, geminiKey);
  }
}

// ==================== 이미지+질문 분석 ====================
async function analyzeImageWithQuestion(imageBase64, mimeType, question, geminiKey, language = 'ko') {
  console.log(`📸 Gemini Vision 이미지+질문 분석 시작`);
  console.log(`📝 질문: ${question}`);

  const systemPrompt = `당신은 CHRISKI 2WAY CUT 시스템을 완벽히 이해한 헤어 전문가입니다.

## 내부 분석 (전문 용어 사용)
이미지를 보고 다음을 정확히 분석하세요:

### 🎯 LENGTH 분류 (가장 중요!)
머리카락이 **신체의 어느 위치까지 닿는지** 확인:
- A Length (5cm): 이마선 - 픽시컷, 매우 짧은 커트
- B Length (10cm): 눈썹선 - 짧은 숏컷
- C Length (15cm): 입술선 - 숏밥, 턱선 위
- D Length (25cm): 턱선 - 단발, 보브컷 ⭐ 기준점
- E Length (35cm): 어깨선 - 미디엄, 어깨에 닿는 길이
- F Length (40cm): 쇄골 - 미디엄롱, 가슴 위
- G Length (50cm): 가슴 중간 - 롱헤어
- H Length (65cm): 가슴 아래 - 허리까지 오는 긴 머리

### 형태(Cut Form):
- O (One Length/원렝스): 무게선이 있는 일자 커트
- G (Graduation/그래쥬에이션): 0-89도, 층이 살짝 있음
- L (Layer/레이어): 90도 이상, 가벼운 층

## 외부 응답 (자연어로!)
❌ 금지: "H1SQ_DB1", "L4", "DBS NO.2" 같은 코드
✅ 필수: "턱선 길이의 단정한 보브", "어깨선까지 오는 미디엄"

## 응답 형식
**📏 길이 분석**
- (A~H 중 하나) Length: (구체적 설명)

**✂️ 형태 분석**
- (O/G/L 중 하나): (특징 설명)

**💇 스타일 특징**
- (볼륨, 질감, 앞머리 등)

**💡 추천 포인트**
- (이 스타일이 어울리는 얼굴형, 관리법 등)`;

  const userPrompt = question || '이 헤어스타일을 분석해주세요.';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + '\n\n사용자 질문: ' + userPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('✅ Gemini Vision 분석 완료');

    // Length 추출
    const lengthMatch = responseText.match(/([A-H])\s*Length/i);
    const extractedLength = lengthMatch ? lengthMatch[1].toUpperCase() + ' Length' : null;

    // 형태 추출
    let extractedForm = null;
    if (responseText.includes('One Length') || responseText.includes('원렝스')) {
      extractedForm = 'O (One Length)';
    } else if (responseText.includes('Graduation') || responseText.includes('그래쥬에이션')) {
      extractedForm = 'G (Graduation)';
    } else if (responseText.includes('Layer') || responseText.includes('레이어')) {
      extractedForm = 'L (Layer)';
    }

    return {
      response: responseText,
      parameters: {
        length_category: extractedLength,
        cut_form: extractedForm
      }
    };

  } catch (error) {
    console.error('💥 analyzeImageWithQuestion Error:', error);
    throw error;
  }
}

module.exports = {
  analyzeImage,
  analyzeWomanImage,
  analyzeManImage,
  analyzeImageWithQuestion,
  getFemaleVisionPrompt,
  getMaleVisionPrompt
};
