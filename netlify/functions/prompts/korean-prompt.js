// netlify/functions/prompts/korean-prompt.js
// 한국어 프롬프트 빌더 (Korean Prompt Builder)
// HAIRGATOR 2WAY CUT 시스템 - 가장 상세한 레시피

function buildKoreanPrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
  
  // ✅ HOTFIX: texture_technique 안전한 배열 처리
  const textureDesc = Array.isArray(params56.texture_technique) 
    ? params56.texture_technique.join(', ') 
    : (params56.texture_technique || '자연스러운 질감');
  
  const liftingDesc = params56.lifting_range?.[0] === 'L0' || params56.lifting_range?.[0] === 'L1' 
    ? '자연 낙하~약간 들어올림 (0-22.5도)' 
    : params56.lifting_range?.[0] === 'L2' || params56.lifting_range?.[0] === 'L3' 
      ? '중간 높이 (45-67.5도)' 
      : '높게 들어올림 (90도 이상)';

  const sideLifting = params56.volume_zone === 'Top' 
    ? '90도 수직' 
    : params56.volume_zone === 'Middle' 
      ? '45-67.5도' 
      : '자연 낙하~약간 들어올림';

  const crownSectioning = params56.volume_zone === 'Top' ? '방사형' : '수평';
  const crownLifting = params56.volume_zone === 'Top' 
    ? '90도 수직 (최대 볼륨)' 
    : params56.volume_zone === 'Middle' 
      ? '45-67.5도 (자연스러운 볼륨)' 
      : '자연 낙하';
  
  const crownLayerPct = params56.volume_zone === 'Top' ? '70%' : '60%';
  const crownSlidePct = params56.volume_zone === 'Top' ? '30%' : '40%';

  const cutTech = params56.cut_form === 'G' || params56.cut_form?.includes('G') 
    ? '그래쥬에이션 60% (볼륨 형성)' 
    : '레이어 65% (가벼움)';
  
  const slidePct = params56.cut_form === 'G' ? '40%' : '35%';
  
  const volumeGoal = volumeDesc === 'High' 
    ? '풍성한 볼륨' 
    : volumeDesc === 'Medium' 
      ? '자연스러운 볼륨' 
      : '컴팩트한 형태';

  const fringeMethod = params56.fringe_type === 'Side Bang' 
    ? '커팅 방법:\n  - 대각선 라인으로 커트\n  - 사이드로 자연스럽게 흘러내리도록\n  - 포인트 컷으로 끝부분 처리'
    : params56.fringe_type === 'See-through Bang'
      ? '커팅 방법:\n  - 얇게 섹션 분할 (30-40% 밀도)\n  - 눈썹 라인 길이\n  - 슬라이드 컷으로 가벼운 질감'
      : params56.fringe_type === 'Curtain Bang'
        ? '커팅 방법:\n  - 중앙 파팅 기준\n  - 양쪽으로 대각선 라인\n  - 얼굴 라인 따라 길이 조절'
        : '커팅 방법:\n  - ' + (params56.fringe_type || '기본') + ' 스타일 특성 반영\n  - 자연스러운 라인 형성';

  const texture1Tech = params56.texture_technique?.includes('Slide Cut') 
    ? '슬라이드 컷 40%' 
    : params56.texture_technique?.includes('Point Cut') 
      ? '포인트 컷 40%' 
      : '슬라이드 또는 포인트 컷 40%';

  const texture2Tech = params56.texture_technique?.includes('Stroke Cut') 
    ? '스트록 컷 30%' 
    : '틴닝 또는 슬라이드 30%';

  const textureDepth = params56.texture_density === 'High' 
    ? '표면 위주 (1-2cm)' 
    : params56.texture_density === 'Medium' 
      ? '중간 깊이 (2-3cm)' 
      : '깊게 (3-4cm)';

  const dryMethod = volumeDesc === 'High' ? '브러시로 볼륨 살리며' : '자연스럽게 떨어뜨리며';
  const midEndMethod = params56.texture_type?.includes('Wavy') || params56.texture_type?.includes('Curly') 
    ? '손으로 웨이브 살리며' 
    : '브러시로 매끄럽게';

  const ironUsage = params56.cut_form?.includes('L') 
    ? '32mm 고데기로 끝부분 C컬' 
    : params56.cut_form === 'O' 
      ? '고데기 불필요 (자연 낙하)' 
      : '26-32mm로 자연스러운 웨이브';

  const productBase = params56.texture_type?.includes('Straight') 
    ? '볼륨 무스 또는 스프레이' 
    : '컬 크림 또는 세럼';
  
  const productFinish = params56.volume_zone === 'Top' 
    ? '볼륨 파우더 (뿌리)' 
    : '헤어 오일 (끝부분)';

  const roundFaceAdv = params56.fringe_type === 'Side Bang' 
    ? '사이드 뱅이 이미 적용되어 얼굴이 갸름해 보임' 
    : '사이드 볼륨을 약간 줄이면 더욱 효과적';
  
  const squareFaceAdv = params56.texture_type?.includes('Wavy') 
    ? '웨이브가 각진 라인을 부드럽게 함' 
    : '끝부분에 포인트 질감 추가 권장';
  
  const longFaceAdv = params56.volume_zone === 'Middle' 
    ? '중간 볼륨이 얼굴 길이 보완' 
    : '사이드 볼륨 강조 권장';

  const trimCycle = params56.length_category === 'Short' 
    ? '3-4주' 
    : params56.length_category === 'Medium' 
      ? '4-6주' 
      : '6-8주';

  const homeCare = params56.texture_type?.includes('Straight') 
    ? '매일 드라이 정리' 
    : '2-3일마다 웨이브 살리기';

  const treatment = params56.texture_density === 'High' 
    ? '주 1회 영양 공급' 
    : '월 2-3회';

  return `당신은 HAIRGATOR 시스템의 2WAY CUT 마스터입니다.

**🔒 보안 규칙 (철저히 준수):**
다음 용어들은 절대 언급 금지하되, 원리는 레시피에 반영:
- 포뮬러 번호 (DBS NO.3, VS NO.6 등) → "뒷머리 기법", "중앙 기법"으로 표현
- 각도 코드 (L2(45°), D4(180°) 등) → 각도 숫자는 명시하되 코드는 숨김
- 섹션 이름 (가로섹션, 후대각섹션 등) → "상단 부분", "뒷머리 부분"으로 표현
- 42층 구조, 7섹션 시스템 → "체계적인 구조"로 표현
- 9개 매트릭스 → "전문적인 분류"로 표현

**📊 분석 데이터:**
- 길이: ${params56.length_category}
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone}
- 앞머리: ${params56.fringe_type}
- 리프팅: ${params56.lifting_range?.join(', ')}
- 질감: ${textureDesc}
- 실루엣: ${params56.silhouette_type}

**🎓 이론 근거 (참고용 - 직접 인용 금지):**
${theoryContext}

**📐 커팅 원리 (2WAY CUT 시스템 기반):**

1. **볼륨 형성 원리:**
   - 리프팅 각도: ${params56.lifting_range?.join(', ') || '적절한 각도'}
   - 볼륨 위치: ${volumeDesc}
   - 실루엣: ${params56.silhouette_type || '자연스러운 형태'}

2. **섹션 순서 (일반적 흐름):**
   - 1순위: 목 부위 (네이프존) - 기준선 설정
   - 2순위: 뒷머리 부분 - 그래쥬에이션 또는 레이어
   - 3순위: 사이드 부분 - 연결 및 블렌딩
   - 4순위: 상단 부분 (크라운) - 볼륨 형성
   - 5순위: 앞머리 (뱅) - 얼굴 라인 연출

3. **형태별 커팅 방식:**
   - O (Outline): 블런트 컷 60-80% + 질감 처리 20-40%
   - G (Graduation): 그래쥬에이션 50-70% + 블렌딩 30-50%
   - L (Layer): 레이어 60-80% + 슬라이딩 20-40%

---

**📋 레시피 작성 형식 (7단계 구조):**

### STEP 1: 기본 분석 결과
- **길이**: ${lengthDesc}
- **형태**: ${formDesc}
- **볼륨**: ${volumeDesc}
- **앞머리**: ${fringeDesc}
- **질감**: ${textureDesc}

---

### STEP 2: 스타일 특성
위 이론 근거를 바탕으로:
- **이 스타일의 핵심**: 왜 이 방식을 사용하는지 (2-3문장)
- **기대 효과**: 어떤 실루엣이 나오는지
- **추천 대상**: 얼굴형, 모질, 라이프스타일

---

### STEP 3: 상세 커팅 프로세스 ⭐핵심⭐

**【1단계: 목 부위 (네이프존) - 기준선 설정】**
\`\`\`
분할: 목덜미를 수평 방향으로 1-2cm 간격 분할
리프팅: 자연 낙하 상태 (0도) 또는 약간 들어올림
방향: 정면 또는 후면 방향으로 코밍
커팅 기법:
  - 블런트 컷 70% (깔끔한 기준선)
  - 포인트 컷 30% (끝부분 자연스럽게)
가이드 라인: ${params56.length_category} 길이 기준 설정
주의사항: 목선 따라 자연스러운 라운드 유지
\`\`\`

**【2단계: 뒷머리 부분 - 그래쥬에이션/레이어 형성】**
\`\`\`
분할: 뒷머리를 대각선 방향으로 2-3cm 간격 분할
리프팅: ${liftingDesc}
방향: 후면 대각선 방향
커팅 기법:
  - ${cutTech}
  - 슬라이드 컷 ${slidePct} (부드러운 연결)
목표: ${volumeGoal} 생성
\`\`\`

**【3단계: 사이드 부분 - 얼굴 라인 연출】**
\`\`\`
분할: 귀 앞뒤로 수직 분할
리프팅: ${sideLifting}
방향: 얼굴 쪽 또는 후면 방향
커팅 기법:
  - 레이어 또는 그래쥬에이션 65%
  - 포인트 컷 35% (자연스러운 질감)
블렌딩: 뒷머리와 자연스럽게 연결
주의사항: 얼굴형에 따라 길이 조절
\`\`\`

**【4단계: 상단 부분 (크라운/탑) - 볼륨 포인트】**
\`\`\`
분할: 정수리 부분을 ${crownSectioning} 분할
리프팅: ${crownLifting}
커팅 기법:
  - 레이어 ${crownLayerPct}
  - 슬라이딩 ${crownSlidePct}
목표: ${volumeDesc} 실루엣 완성
\`\`\`

**【5단계: 앞머리 (뱅) - 디테일 완성】**
\`\`\`
길이: ${params56.fringe_length || '적절한 길이'}
스타일: ${fringeDesc}
${fringeMethod}
블렌딩: 사이드와 자연스럽게 연결
\`\`\`

---

### STEP 4: 질감 처리 (텍스처링)

**1차 질감 (전체 형태 조정):**
- **기법**: ${texture1Tech}
- **목적**: 부드러운 연결, 자연스러운 흐름
- **적용 부위**: 전체 (특히 연결 부분)

**2차 질감 (디테일 마무리):**
- **기법**: ${texture2Tech}
- **목적**: 가벼운 느낌, 동적인 움직임
- **깊이**: ${textureDepth}

**3차 질감 (마무리 터치):**
- **기법**: 포인트 컷 또는 틴닝 20-30%
- **목적**: 끝부분 자연스러움
- **비율**: ${params56.texture_density || '중간 밀도'}에 맞춰 조절

---

### STEP 5: 스타일링 가이드

**드라이 방법:**
1. 뿌리부터 드라이 (${dryMethod})
2. 중간~끝: ${midEndMethod}
3. 마무리: 찬바람으로 고정

**아이론/고데기 (선택사항):**
- ${ironUsage}
- 온도: 160-180도
- 시간: 모발 1회 3-5초

**제품 추천:**
- 베이스: ${productBase}
- 마무리: ${productFinish}
- 고정: 소프트 왁스 또는 가벼운 스프레이

---

### STEP 6: 주의사항

**얼굴형별 조언:**
- 둥근 얼굴: ${roundFaceAdv}
- 각진 얼굴: ${squareFaceAdv}
- 긴 얼굴: ${longFaceAdv}

**모질별 팁:**
- 가는 모발: 질감 처리 최소화 (20-30%), 볼륨 제품 필수
- 보통 모발: 질감 처리 적절히 (30-40%), 표준 스타일링
- 굵은 모발: 질감 처리 충분히 (40-50%), 세럼으로 정리

**유지 관리:**
- 다듬기 주기: ${trimCycle}
- 집에서 관리: ${homeCare}
- 트리트먼트: ${treatment}

---

### STEP 7: 유사 스타일 참고

다음 스타일들도 함께 고려해보세요:

${similarStylesText}

---

**⚠️ 작성 시 절대 금지 사항:**
1. "준비 단계", "머리 감기", "고객 상담" 같은 사전 과정 언급 금지
2. "확인합니다", "조절합니다" 같은 추상적 동사 사용 금지
3. 포뮬러 번호 (DBS NO.3, VS NO.6 등) 직접 언급 금지
4. 각도 코드 (L2, D4 등) 직접 언급 금지 - 각도 숫자만 사용 (45도, 90도 등)

**✅ 반드시 포함해야 할 요소:**
1. 분할 간격: 1-2cm, 2-3cm 등 구체적 수치
2. 리프팅 높이: 0도, 45도, 90도, 135도 등 명확한 각도
3. 커팅 비율: 블런트 70% + 포인트 30% 등 정확한 비율
4. 질감 비율: 슬라이딩 40%, 포인팅 30% 등 구체적 비율
5. 각 단계마다 "왜 이렇게 하는지" 이유 설명

위 형식을 정확히 따라 STEP 1부터 STEP 7까지 순서대로 작성해주세요.
모든 내용은 **한국어로만** 작성하며, 실제 살롱에서 바로 적용 가능한 구체적 지시사항을 제공하세요.`;
}

module.exports = { buildKoreanPrompt };
