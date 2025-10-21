// js/gemini-analyzer.js
// HAIRGATOR 이미지 분석 전용 모듈

class GeminiHairAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey || 'gen-lang-client-0911375709';
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
  }

  // 56개 파라미터 분석 프롬프트
  getSystemPrompt() {
    return {
      contents: [{
        parts: [{
          text: `당신은 전문 헤어 스타일리스트입니다. 업로드된 헤어스타일 이미지를 분석하고, 
아래 56개 파라미터 중 식별 가능한 항목을 정확하게 추출하세요.

**분석 규칙:**
1. 이미지에서 명확하게 확인 가능한 파라미터만 추출
2. 불확실한 경우 null 반환
3. 한국어 컷 이름을 정확히 사용 (예: "허그컷", "에어컷")

**여성 컷 카테고리 (길이별 분류):**
- A (가슴 아래): 에어컷, 구름컷, 프릴컷, 그레이스컷, 레이컷
- B (가슴-쇄골 중간): 엘리자벳컷, 허그컷, 샌드컷, 페미닌컷, 젤리컷, 스무스컷, 포그컷, 미스티컷, 허쉬컷
- C (쇄골라인): 빌드컷
- D (어깨 닿는 선): 플라워컷, 플리츠컷, 레이스컷
- E (어깨 바로 위): 타미컷, 벌룬컷
- F (턱선 바로 밑): 클래식컷, 보니컷, 바그컷, 에그컷, 빌로우컷, 모즈컷
- G (Jaw 라인): 엘리스컷, 슬림컷, 브록컷, 리플컷
- H (숏헤어): 코튼컷, 이지컷, 본컷, 듀컷, 플컷, 다이앤컷, 리프컷

**응답 형식 (반드시 JSON만 출력):**
{
  "cut_category": "Women's Cut" | "Men's Cut",
  "womens_cut_category": "허그컷" | null,
  "cut_form": "G (Graduation)" | null,
  "weight_flow": "Forward Weighted" | null,
  "structure_layer": "Graduated Layer" | null,
  "fringe_type": "Side Bang" | "No Fringe" | null,
  "estimated_hair_length_cm": 35,
  "hair_texture": "Medium" | null,
  "color_level": "Level 5" | null,
  "color_tone": "Natural" | null,
  "styling_direction": "Forward" | null,
  "design_emphasis": "Shape Emphasis" | null,
  "finish_look": "Blow Dry" | null,
  "confidence_score": 0.85,
  "detected_parameters": 12,
  "analysis_notes": "분석 특이사항"
}

**중요:** 
- JSON 형식만 출력 (설명 텍스트 제외)
- 확실하지 않은 파라미터는 null
- 한국어 컷 이름 정확히 사용`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    };
  }

  // 이미지 분석 실행
  async analyzeImage(imageFile) {
    try {
      // 1. 이미지를 Base64로 변환
      const base64Image = await this.fileToBase64(imageFile);
      
      // 2. API 요청 준비
      const requestBody = this.getSystemPrompt();
      
      // 이미지 추가
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: imageFile.type,
          data: base64Image
        }
      });

      // 3. Gemini API 호출
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API 오류: ${error.error?.message || '알 수 없는 오류'}`);
      }

      const data = await response.json();
      
      // 4. 응답 파싱
      const text = data.candidates[0].content.parts[0].text;
      
      let analysisResult;
      try {
        analysisResult = JSON.parse(text);
      } catch (e) {
        // JSON 추출 재시도
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON 응답을 파싱할 수 없습니다');
        }
      }

      // 5. 결과 검증 및 보강
      return this.enhanceResult(analysisResult);

    } catch (error) {
      console.error('이미지 분석 실패:', error);
      throw error;
    }
  }

  // 파일을 Base64로 변환
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // "data:image/jpeg;base64," 부분 제거
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 결과 보강
  enhanceResult(result) {
    // 타임스탬프 추가
    result.analyzed_at = new Date().toISOString();
    
    // 감지된 파라미터 개수 계산
    if (!result.detected_parameters) {
      result.detected_parameters = Object.values(result)
        .filter(v => v !== null && v !== undefined).length;
    }

    // 신뢰도 점수 기본값
    if (!result.confidence_score) {
      result.confidence_score = Math.min(result.detected_parameters / 20, 1).toFixed(2);
    }

    return result;
  }

  // 분석 결과를 검색 쿼리로 변환
  toSearchQuery(analysisResult) {
    const keywords = [];
    
    // 1. 컷 이름 (최우선)
    if (analysisResult.womens_cut_category) {
      keywords.push(analysisResult.womens_cut_category);
    }
    if (analysisResult.mens_cut_category) {
      keywords.push(analysisResult.mens_cut_category);
    }

    // 2. 길이 정보
    if (analysisResult.estimated_hair_length_cm) {
      const length = analysisResult.estimated_hair_length_cm;
      if (length > 40) keywords.push('롱');
      else if (length > 25) keywords.push('미디엄');
      else if (length > 15) keywords.push('단발');
      else keywords.push('숏');
    }

    // 3. 스타일 특징
    if (analysisResult.fringe_type && analysisResult.fringe_type !== 'No Fringe') {
      keywords.push('앞머리');
    }

    // 4. 레이어 정보
    if (analysisResult.structure_layer) {
      keywords.push(analysisResult.structure_layer.replace(' Layer', '레이어'));
    }

    return keywords.join(' ');
  }

  // 사용자 친화적인 분석 결과 텍스트 생성
  toDisplayText(analysisResult) {
    const lines = [];
    
    lines.push('📊 **이미지 분석 결과**\n');
    
    // 컷 이름
    if (analysisResult.womens_cut_category) {
      lines.push(`✂️ 스타일: **${analysisResult.womens_cut_category}**`);
    }
    
    // 길이
    if (analysisResult.estimated_hair_length_cm) {
      lines.push(`📏 예상 길이: 약 **${analysisResult.estimated_hair_length_cm}cm**`);
    }

    // 주요 특징
    const features = [];
    if (analysisResult.fringe_type) {
      features.push(analysisResult.fringe_type);
    }
    if (analysisResult.structure_layer) {
      features.push(analysisResult.structure_layer);
    }
    if (analysisResult.design_emphasis) {
      features.push(analysisResult.design_emphasis);
    }
    
    if (features.length > 0) {
      lines.push(`\n🎨 주요 특징:`);
      features.forEach(f => lines.push(`- ${f}`));
    }

    // 신뢰도
    const confidence = (analysisResult.confidence_score * 100).toFixed(0);
    lines.push(`\n🎯 분석 신뢰도: ${confidence}%`);
    
    return lines.join('\n');
  }
}

// 전역 객체로 노출
window.GeminiHairAnalyzer = GeminiHairAnalyzer;
