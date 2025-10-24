// js/gemini-analyzer.js
// HAIRGATOR 이미지 분석 전용 모듈 - FINAL VERSION
// ⚠️ 현재 사용 안 함 (Backend chatbot-api.js가 대신 처리)
// 📝 독립 실행 또는 미래 확장용 참고 파일

class GeminiHairAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey || 'AIzaSyDpYourKeyHere'; // 실제 키로 교체 필요
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
  }

  // 56개 파라미터 분석 프롬프트 (chatbot-api.js와 동일)
  getSystemPrompt() {
    return {
      contents: [{
        parts: [{
          text: `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 **56파라미터 체계**에 따라 분석하세요.

## 분석 가이드라인

### Cut Category (필수)
- "Women's Cut" 또는 "Men's Cut"

### Women's Cut Length Categories (매우 중요 - 신체 랜드마크 기준)

**길이 분류 - 이미지에서 머리카락 끝이 신체 어느 부위에 닿는지 정확히 확인:**

A Length (65cm): **가슴 아래 밑선**
  - 머리카락 끝이 가슴보다 확실히 아래, 배꼽 근처
  - 기준: 유두보다 최소 10cm 이상 아래

B Length (50cm): **가슴 상단~중간**
  - 머리카락 끝이 유두 높이 전후 (±5cm 이내)
  - 기준: 가슴 위쪽에서 중간 사이
  - **주의:** 쇄골 아래 5cm부터 가슴 중간까지

C Length (40cm): **쇄골 밑선**
  - 머리카락 끝이 쇄골뼈에 정확히 닿거나 바로 아래
  - 기준: 쇄골뼈 ±3cm 범위

D Length (35cm): **어깨선**
  - 머리카락 끝이 **어깨에 정확히 닿음**
  - **핵심 판단 기준: 어깨선과 머리카락이 맞닿음** ← 중요!
  - 목 전체가 보이고, 어깨 시작 부분에 닿음
  - 쇄골과 어깨 사이 거리 있음

**🔥 D vs E vs F vs G 구분 (가장 헷갈리는 부분! 어깨 기준으로 판단)**

E Length (30cm): **어깨 바로 위**
  - 머리카락 끝이 어깨선 위 2-3cm
  - **핵심 판단 기준: 어깨와 머리카락 사이 공간 있음** ← 중요!
  - 목 전체 + 어깨 시작 부분 모두 보임
  - 어깨에 닿지 않음

F Length (25cm): **턱선 바로 밑**
  - 머리카락 끝이 턱뼈 아래
  - **핵심 판단 기준: 목 상단만 보임, 목 중간까지 머리카락** ← 중요!
  - 어깨와 상당한 거리 있음 (5cm 이상)
  - 턱에서 목으로 넘어가는 지점

G Length (20cm): **턱선 (Jaw Line)**
  - 머리카락 끝이 턱뼈 각도 라인
  - **핵심 판단 기준: 목이 거의 안 보임** ← 중요!
  - 턱선 바로 아래
  - 얼굴 윤곽선 따라감

H Length (15cm): **귀 중간**
  - 숏헤어, 머리카락 끝이 귀 높이
  - 기준: 귀 아래 ~ 턱선 사이

**판단 방법 (우선순위대로 확인):**
1. **어깨선 확인** (가장 먼저!): 
   - **머리카락이 어깨에 닿음** → **D Length**
   - 어깨보다 아래 → A/B/C 중 하나
   - 어깨보다 위 (공간 있음) → E/F/G/H 중 하나

2. **쇄골 확인** (어깨 아래인 경우):
   - 쇄골에 닿음 → **C Length**
   - 쇄골 아래 ~ 가슴 중간 → **B Length**
   - 가슴 중간 아래 → **A Length**

3. **목 노출 정도 확인** (어깨 위인 경우) ← 중요!:
   - **목 전체 보임 + 어깨와 공간** → **E Length**
   - **목 상단만 보임** (턱 아래 일부만) → **F Length**
   - **목 거의 안 보임** (턱선에 가려짐) → **G Length**
   - 귀 높이 → **H Length**

4. **애매한 경우 규칙**:
   - D와 E 사이: 어깨에 닿는가?
     → 살짝이라도 닿음 = D, 공간 있음 = E
   - E와 F 사이: 목이 얼마나 보이는가? 
     → 목 전체 보임 = E, 일부만 = F
   - F와 G 사이: 목이 보이는가?
     → 목 조금이라도 보임 = F, 거의 안 보임 = G
   - 두 길이 중간이면 → **더 긴 쪽 선택**

### Men's Cut Categories (해당 시)
- Side Fringe / Side Part / Fringe Up / Pushed Back / Buzz / Crop / Mohican

### 스타일 형태 (Cut Form) - 반드시 3가지 중 하나만 선택
**⚠️ 중요: O, G, L 중 하나만 선택하세요.**

- **O (One Length, 원렝스)**: 모든 머리카락이 같은 길이로 떨어지는 형태
  → 머리카락 끝이 일직선, 층이 없음
  
- **G (Graduation, 그래쥬에이션)**: 외곽이 짧고 내부가 긴 층, 무게감이 하단
  → 뒤에서 보면 삼각형 모양, 아래가 무거움
  
- **L (Layer, 레이어)**: 층을 두어 자르는 기법, 전체적인 볼륨과 움직임
  → 여러 층으로 나뉘어져 있음, 가벼운 느낌

**선택 가이드:**
- 끝이 일직선, 층 없음 → **O**
- 아래가 무겁고 위가 가벼움 → **G**
- 전체적으로 층이 많음 → **L**

### Structure Layer
- Long Layer / Medium Layer / Short Layer
- Square Layer / Round Layer / Graduated Layer

### Fringe (앞머리)
**타입:** Full Bang / See-through Bang / Side Bang / No Fringe
**길이:** Forehead / Eyebrow / Eye / Cheekbone / Lip / Chin / None

### Volume & Weight
- Volume Zone: Low / Medium / High
- Weight Flow: Balanced / Forward Weighted / Backward Weighted

### 기술 파라미터
- Section: Horizontal / Vertical / Diagonal Forward / Diagonal Backward
- Lifting: L0~L8
- Direction: D0~D8

**중요: JSON 출력 시 절대 규칙**
- womens_cut_category 필드 생성 금지
- length_category만 A~H Length 형식으로 출력
- cut_form은 O, G, L 중 하나만 (괄호 포함 예: "L (Layer)")

**출력 형식 (JSON만):**
\`\`\`json
{
  "cut_category": "Women's Cut",
  "length_category": "D Length",
  "estimated_hair_length_cm": 35,
  "cut_form": "L (Layer)",
  "structure_layer": "Graduated Layer",
  "fringe_type": "Side Bang",
  "fringe_length": "Eye",
  "volume_zone": "Medium",
  "weight_flow": "Forward Weighted",
  "hair_texture": "Medium",
  "styling_method": "Blow Dry",
  "section_primary": "Vertical",
  "lifting_range": ["L2", "L4", "L6"],
  "direction_primary": "D0"
}
\`\`\`

**재확인 체크리스트:**
- ✅ **머리카락이 어깨에 닿는가? → D Length**
- ✅ 머리카락 끝이 쇄골 위치인가? → C Length
- ✅ 머리카락 끝이 가슴 중간인가? → B Length
- ✅ 머리카락 끝이 가슴 아래인가? → A Length
- ✅ **목 전체 보이고 어깨와 공간 있는가? → E Length**
- ✅ **목 상단만 보이고 턱 아래인가? → F Length**
- ✅ **목이 거의 안 보이고 턱선인가? → G Length**
- ✅ cut_form은 O/G/L만 사용 (괄호 포함)`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048
      }
    };
  }

  // 이미지 분석 실행
  async analyzeImage(imageFile) {
    try {
      const base64Image = await this.fileToBase64(imageFile);
      const requestBody = this.getSystemPrompt();
      
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: imageFile.type,
          data: base64Image
        }
      });

      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API 오류: ${error.error?.message || '알 수 없는 오류'}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      let analysisResult;
      try {
        analysisResult = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error('JSON 응답을 파싱할 수 없습니다');
        }
      }

      // Cut Form 괄호 강제 추가 (Backend와 동일)
      if (analysisResult.cut_form && !analysisResult.cut_form.includes('(')) {
        const formChar = analysisResult.cut_form.charAt(0).toUpperCase();
        const formMap = {
          'O': 'O (One Length)',
          'G': 'G (Graduation)',
          'L': 'L (Layer)'
        };
        analysisResult.cut_form = formMap[formChar] || 'L (Layer)';
      }

      return this.enhanceResult(analysisResult);

    } catch (error) {
      console.error('이미지 분석 실패:', error);
      throw error;
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  enhanceResult(result) {
    result.analyzed_at = new Date().toISOString();
    
    if (!result.detected_parameters) {
      result.detected_parameters = Object.values(result)
        .filter(v => v !== null && v !== undefined).length;
    }

    if (!result.confidence_score) {
      result.confidence_score = Math.min(result.detected_parameters / 20, 1).toFixed(2);
    }

    return result;
  }

  toSearchQuery(analysisResult) {
    const keywords = [];
    
    if (analysisResult.womens_cut_category) {
      keywords.push(analysisResult.womens_cut_category);
    }
    if (analysisResult.mens_cut_category) {
      keywords.push(analysisResult.mens_cut_category);
    }

    if (analysisResult.estimated_hair_length_cm) {
      const length = analysisResult.estimated_hair_length_cm;
      if (length > 40) keywords.push('롱');
      else if (length > 25) keywords.push('미디엄');
      else if (length > 15) keywords.push('단발');
      else keywords.push('숏');
    }

    if (analysisResult.fringe_type && analysisResult.fringe_type !== 'No Fringe') {
      keywords.push('앞머리');
    }

    if (analysisResult.structure_layer) {
      keywords.push(analysisResult.structure_layer.replace(' Layer', '레이어'));
    }

    return keywords.join(' ');
  }

  toDisplayText(analysisResult) {
    const lines = [];
    
    lines.push('📊 **이미지 분석 결과**\n');
    
    if (analysisResult.womens_cut_category) {
      lines.push(`✂️ 스타일: **${analysisResult.womens_cut_category}**`);
    }
    
    if (analysisResult.length_category) {
      lines.push(`📏 길이: **${analysisResult.length_category}** (${analysisResult.estimated_hair_length_cm}cm)`);
    }

    if (analysisResult.cut_form) {
      lines.push(`✂️ 형태: **${analysisResult.cut_form}**`);
    }

    const features = [];
    if (analysisResult.fringe_type) features.push(analysisResult.fringe_type);
    if (analysisResult.structure_layer) features.push(analysisResult.structure_layer);
    if (analysisResult.design_emphasis) features.push(analysisResult.design_emphasis);
    
    if (features.length > 0) {
      lines.push(`\n🎨 주요 특징:`);
      features.forEach(f => lines.push(`- ${f}`));
    }

    const confidence = (analysisResult.confidence_score * 100).toFixed(0);
    lines.push(`\n🎯 분석 신뢰도: ${confidence}%`);
    
    return lines.join('\n');
  }
}

// 전역 객체로 노출
window.GeminiHairAnalyzer = GeminiHairAnalyzer;
