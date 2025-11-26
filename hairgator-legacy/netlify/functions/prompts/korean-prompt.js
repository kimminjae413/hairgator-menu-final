// netlify/functions/prompts/korean-prompt.js
// 한국어 프롬프트 빌더 (Korean Prompt Builder)
// HAIRGATOR 2WAY CUT 시스템 - 도해도 기반 레시피 생성 (2025-11-20 업데이트)

function buildKoreanPrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc, selectedDiagrams = []) {
  const lengthDesc = langTerms.lengthDesc?.[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc?.[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType?.[params56.fringe_type] || params56.fringe_type;
  
  const textureDesc = Array.isArray(params56.texture_technique) 
    ? params56.texture_technique.join(', ') 
    : (params56.texture_technique || '자연스러운 질감');
  
  // 🔥 도해도 정보를 텍스트로 정리
  const diagramsContext = selectedDiagrams.length > 0 
    ? selectedDiagrams.map((d, idx) => 
        `${idx + 1}단계: ${d.sample_code} (유사도 ${(d.similarity * 100).toFixed(0)}%)\n   ${d.recipe_text.substring(0, 120)}...`
      ).join('\n\n')
    : '도해도 정보 없음';

  return `당신은 HAIRGATOR 시스템의 2WAY CUT 마스터입니다.

**🔒 보안 규칙 (철저히 준수):**
다음 용어들은 절대 언급 금지하되, 원리는 레시피에 반영:
- 포뮬러 번호 (DBS NO.3, VS NO.6 등) → "뒷머리 기법", "중앙 기법"으로 표현
- 각도 코드 (L2(45°), D4(180°) 등) → 각도 숫자는 명시하되 코드는 숨김
- 섹션 이름 (가로섹션, 후대각섹션 등) → "상단 부분", "뒷머리 부분"으로 표현
- 42층 구조, 7섹션 시스템 → "체계적인 구조"로 표현
- 9개 매트릭스 → "전문적인 분류"로 표현

**📊 분석 데이터:**
- 길이: ${params56.length_category} (${lengthDesc})
- 형태: ${params56.cut_form} (${formDesc})
- 볼륨: ${params56.volume_zone} (${volumeDesc})
- 앞머리: ${params56.fringe_type} (${fringeDesc})
- 리프팅: ${params56.lifting_range?.join(', ')}
- 질감: ${textureDesc}

**🎯 선별된 도해도 순서 (${selectedDiagrams.length}개):**

${diagramsContext}

**🎓 이론 근거 (참고용):**
${theoryContext}

---

**📋 레시피 작성 형식:**

### STEP 1: 스타일 개요
- 이 스타일의 핵심 특징 (2-3문장)
- 기대 효과 및 완성 실루엣

---

### STEP 2: 상세 커팅 순서 (${selectedDiagrams.length}단계)

**⭐ 중요: 위의 도해도 순서를 정확히 따라서 작성하세요 ⭐**

${selectedDiagrams.map((d, idx) => `
**【${idx + 1}단계: ${d.sample_code.split('_')[0]} - ${d.step_number}번 도해도】**
\`\`\`
참고: ${d.recipe_text.substring(0, 100)}...

분할 방법: (구체적 간격과 방향)
리프팅 각도: (명확한 각도 - 0도, 45도, 90도 등)
커팅 기법: 
  - 주 기법 __% (비율 명시)
  - 보조 기법 __% (비율 명시)
목표: (이 단계에서 달성할 형태)
주의사항: (핵심 포인트 1-2줄)
\`\`\`
`).join('\n')}

---

### STEP 3: 질감 처리 (텍스처링)

**1차 질감 (전체 형태):**
- 기법: 슬라이드 또는 포인트 컷 40%
- 목적: 부드러운 연결, 자연스러운 흐름

**2차 질감 (디테일):**
- 기법: 틴닝 또는 스트록 컷 30%
- 목적: 가벼운 느낌, 동적인 움직임

**마무리 (20-30%):**
- 끝부분 자연스러움
- 밀도에 맞춰 조절

---

### STEP 4: 스타일링 가이드

**드라이:**
1. 뿌리부터 (볼륨 살리며)
2. 중간~끝 (자연스럽게)
3. 마무리 (찬바람 고정)

**아이론/고데기:**
- 온도: 160-180도
- 방법: (구체적으로)

**제품:**
- 베이스: (제품 타입)
- 마무리: (제품 타입)

---

### STEP 5: 유지 관리

**얼굴형별:**
- 둥근 얼굴: (조언)
- 각진 얼굴: (조언)
- 긴 얼굴: (조언)

**모질별:**
- 가는 모발: 질감 20-30%, 볼륨 제품
- 보통 모발: 질감 30-40%
- 굵은 모발: 질감 40-50%, 세럼

**관리:**
- 다듬기: 3-6주
- 집 관리: 매일 또는 2-3일마다

---

**⚠️ 작성 규칙:**
1. 도해도 순서를 절대 바꾸지 마세요
2. 각 단계마다 구체적 수치 포함 (각도, 비율, 간격)
3. "준비", "확인", "조절" 같은 추상적 표현 금지
4. 포뮬러 번호, 각도 코드 직접 언급 금지
5. 총 1000자 이내로 간결하게

모든 내용을 **한국어로만** 작성하며, 실제 살롱에서 바로 적용 가능한 구체적 지시사항을 제공하세요.`;
}

module.exports = { buildKoreanPrompt };
