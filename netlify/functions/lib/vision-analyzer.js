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
function getMaleVisionPrompt() {
  return `You are "HAIRGATOR AI," an expert hair analyst for MEN's hairstyles.

## STYLE CLASSIFICATION (스타일 기반 분류) ⭐ CRITICAL!

| Code | Style Name | Description |
|------|-----------|-------------|
| SF | Side Fringe | 앞머리를 앞으로 내려 자연스럽게 흐르는 스타일 |
| SP | Side Part | 가르마를 기준으로 나누는 스타일 |
| FU | Fringe Up | 앞머리 끝만 위로 올린 스타일 |
| PB | Pushed Back | 모발 전체가 뒤쪽으로 넘어가는 스타일 |
| BZ | Buzz Cut | 가장 짧은 남자 커트 |
| CP | Crop Cut | 버즈보다 조금 더 긴 트렌디한 스타일 |
| MC | Mohican | 센터 부분을 위쪽으로 세워 강조하는 스타일 |

## STYLE IDENTIFICATION RULES:
1. 앞머리가 이마에 내려옴 → SF (Side Fringe)
2. 가르마가 명확히 있음 → SP (Side Part)
3. 앞머리 끝이 위로 올라감 → FU (Fringe Up)
4. 전체가 뒤로 넘김 → PB (Pushed Back)
5. 매우 짧은 전체 버즈 → BZ (Buzz Cut)
6. 짧지만 질감 있음 → CP (Crop Cut)
7. 센터가 세워짐 → MC (Mohican)

## FADE/TAPER
- None: 페이드 없음
- Low Fade: 낮은 페이드
- Mid Fade: 중간 페이드
- High Fade: 높은 페이드
- Skin Fade: 스킨 페이드
- Taper: 테이퍼

## SECTION (남자 기준)
- HS: 가로 섹션 (Horizontal)
- VS: 세로 섹션 (Vertical)
- DBS: 후대각 섹션 (Diagonal Backward)
- DFS: 전대각 섹션 (Diagonal Forward)
- RS: 방사형 섹션 (Radial)
- PS: 파이 섹션 (Pie) ⭐ 남자컷에서 자주 사용

## OUTPUT - MUST BE VALID JSON!
Return ONLY a valid JSON object with exact field names from the schema.
NO markdown, NO explanation, NO code blocks!`;
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
