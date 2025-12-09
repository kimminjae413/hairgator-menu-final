// ============================================================
// Personal Analysis - 고객 정보 수동 입력 모듈
// MediaPipe가 감지할 수 없는 정보를 헤어디자이너가 입력
// Personal Color 페이지 전용
// ============================================================

// 고객 프로필 데이터
let customerProfile = {
  // 헤어디자이너 수동 입력 (MediaPipe 불가)
  height: null,              // 키 (150-190cm)
  currentLength: null,       // 현재 기장 (short/medium/long)
  desiredLength: null,       // 원하는 기장 (A-H)
  fringePreference: null,    // 앞머리 선호 (forehead/eyebrow/eye/cheekbone/lips/none)
  skinType: null,            // 피부 타입 (TP/NP/BP)
  curlPreference: null,      // 컬 선호 (straight/C/S/CS/SS/none)

  // MediaPipe 자동 분석 (Personal Color 기존 기능 활용)
  faceShape: null,           // 얼굴형
  faceShapeKr: null,         // 한국어 얼굴형
  undertone: null,           // 언더톤 (WARM/NEUTRAL/COOL)
  season: null,              // 4계절 (Spring/Summer/Autumn/Winter)

  analysisComplete: false    // 분석 완료 여부
};

// 현재 단계
let paCurrentStep = 1;

// 기장 데이터 (PDF 기반)
const PA_LENGTH_DATA = {
  A: { name: 'A Length', position: '허리선', desc: '가장 긴 기장, 허리까지' },
  B: { name: 'B Length', position: '가슴 중간', desc: '대중적인 롱헤어' },
  C: { name: 'C Length', position: '겨드랑이', desc: '세미롱, 관리 용이' },
  D: { name: 'D Length', position: '어깨 아래', desc: '어깨선 하단, 뻗침 주의' },
  E: { name: 'E Length', position: '어깨 위', desc: '단정한 미디엄' },
  F: { name: 'F Length', position: '턱선 아래', desc: '클래식 보브' },
  G: { name: 'G Length', position: '턱선 위', desc: '짧은 보브' },
  H: { name: 'H Length', position: '후두부', desc: '픽시컷/숏' }
};

// 앞머리 데이터
const PA_FRINGE_DATA = {
  forehead: { name: '이마선', desc: '이마 중간까지' },
  eyebrow: { name: '눈썹선', desc: '눈썹까지' },
  eye: { name: '눈선', desc: '눈까지' },
  cheekbone: { name: '광대선', desc: '광대까지' },
  lips: { name: '입술선', desc: '입술까지' },
  none: { name: '앞머리 없음', desc: '앞머리 생략' }
};

// 피부 타입 데이터 (Personal Analysis 기준)
const PA_SKIN_TYPE_DATA = {
  TP: { name: 'TP (Transparent)', desc: '투명한 피부톤', tone: 'COOL' },
  NP: { name: 'NP (Neutral)', desc: '중성 피부톤', tone: 'NEUTRAL' },
  BP: { name: 'BP (Base)', desc: '베이스 피부톤', tone: 'WARM' }
};

// 컬 선호도 데이터
const PA_CURL_DATA = {
  straight: { name: '스트레이트', desc: '직모 스타일' },
  C: { name: 'C컬', desc: '자연스러운 웨이브' },
  S: { name: 'S컬', desc: '굵은 웨이브' },
  CS: { name: 'C+S컬', desc: '믹스 웨이브' },
  SS: { name: 'SS컬', desc: '강한 컬' },
  none: { name: '선호 없음', desc: '어떤 스타일이든 OK' }
};

// 키에 따른 기장 추천 (Personal Analysis PDF 기준)
const PA_HEIGHT_RECOMMENDATIONS = {
  WARM: {  // 어깨 넓음
    short: ['F', 'G', 'H'],
    medium: ['D', 'E', 'F'],
    tall: ['A', 'B', 'C', 'D']
  },
  NEUTRAL: {  // 어깨 보통
    short: ['E', 'F', 'G'],
    medium: ['C', 'D', 'E', 'F'],
    tall: ['A', 'B', 'C', 'D', 'E']
  },
  COOL: {  // 어깨 좁음
    short: ['D', 'E', 'F'],
    medium: ['B', 'C', 'D', 'E'],
    tall: ['A', 'B', 'C']
  }
};

// 모달 열기
function openPersonalAnalysisModal() {
  const modal = document.getElementById('personal-analysis-modal');
  if (modal) {
    modal.style.display = 'flex';
    paCurrentStep = 1;
    paUpdateStepUI();
    console.log('📋 Personal Analysis 모달 열림');
  }
}

// 모달 닫기
function closePersonalAnalysisModal() {
  const modal = document.getElementById('personal-analysis-modal');
  if (modal) {
    modal.style.display = 'none';
    console.log('📋 Personal Analysis 모달 닫힘');
  }
}

// 프로필 초기화
function paResetProfile() {
  customerProfile = {
    height: null,
    currentLength: null,
    desiredLength: null,
    fringePreference: null,
    skinType: null,
    curlPreference: null,
    faceShape: null,
    faceShapeKr: null,
    undertone: null,
    season: null,
    analysisComplete: false
  };
  paCurrentStep = 1;
}

// 단계 UI 업데이트
function paUpdateStepUI() {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`pa-step-${i}`);
    if (stepEl) {
      stepEl.classList.remove('active');
    }
  }

  const currentStepEl = document.getElementById(`pa-step-${paCurrentStep}`);
  if (currentStepEl) {
    currentStepEl.classList.add('active');
  }

  paUpdateProgressBar();
  paUpdateNavigationButtons();
}

// 프로그레스 바 업데이트
function paUpdateProgressBar() {
  const indicators = document.querySelectorAll('.pa-step-indicator');
  indicators.forEach((indicator, idx) => {
    indicator.classList.remove('active', 'completed');
    if (idx + 1 < paCurrentStep) {
      indicator.classList.add('completed');
    } else if (idx + 1 === paCurrentStep) {
      indicator.classList.add('active');
    }
  });
}

// 네비게이션 버튼 업데이트
function paUpdateNavigationButtons() {
  const prevBtn = document.getElementById('pa-prev-btn');
  const nextBtn = document.getElementById('pa-next-btn');
  const submitBtn = document.getElementById('pa-submit-btn');

  if (prevBtn) {
    prevBtn.style.display = paCurrentStep === 1 ? 'none' : 'inline-flex';
  }

  if (nextBtn && submitBtn) {
    if (paCurrentStep === 3) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      nextBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }
  }
}

// 다음 단계
function paNextStep() {
  if (!paValidateCurrentStep()) {
    return;
  }

  if (paCurrentStep < 3) {
    paCurrentStep++;
    paUpdateStepUI();
    console.log(`📋 Step ${paCurrentStep}로 이동`);
  }
}

// 이전 단계
function paPrevStep() {
  if (paCurrentStep > 1) {
    paCurrentStep--;
    paUpdateStepUI();
    console.log(`📋 Step ${paCurrentStep}로 이동`);
  }
}

// 현재 단계 유효성 검사
function paValidateCurrentStep() {
  switch (paCurrentStep) {
    case 1:
      if (!customerProfile.height) {
        showToast('키를 선택해주세요.', 'warning');
        return false;
      }
      if (!customerProfile.currentLength) {
        showToast('현재 기장을 선택해주세요.', 'warning');
        return false;
      }
      return true;

    case 2:
      if (!customerProfile.desiredLength) {
        showToast('원하는 기장을 선택해주세요.', 'warning');
        return false;
      }
      if (!customerProfile.fringePreference) {
        showToast('앞머리 선호도를 선택해주세요.', 'warning');
        return false;
      }
      return true;

    case 3:
      if (!customerProfile.skinType) {
        showToast('피부 타입을 선택해주세요.', 'warning');
        return false;
      }
      if (!customerProfile.curlPreference) {
        showToast('컬 선호도를 선택해주세요.', 'warning');
        return false;
      }
      return true;

    default:
      return true;
  }
}

// 키 선택
function paSelectHeight(height) {
  customerProfile.height = height;

  document.querySelectorAll('.pa-height-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.height === String(height)) {
      btn.classList.add('selected');
    }
  });

  console.log(`📏 키 선택: ${height}cm`);
}

// 현재 기장 선택
function paSelectCurrentLength(length) {
  customerProfile.currentLength = length;

  document.querySelectorAll('.pa-current-length-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.length === length) {
      btn.classList.add('selected');
    }
  });

  console.log(`📐 현재 기장 선택: ${length}`);
}

// 원하는 기장 선택
function paSelectDesiredLength(length) {
  customerProfile.desiredLength = length;

  document.querySelectorAll('.pa-desired-length-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.length === length) {
      btn.classList.add('selected');
    }
  });

  const lengthInfo = PA_LENGTH_DATA[length];
  console.log(`✂️ 원하는 기장 선택: ${length} (${lengthInfo.position})`);
}

// 앞머리 선호도 선택
function paSelectFringe(fringe) {
  customerProfile.fringePreference = fringe;

  document.querySelectorAll('.pa-fringe-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.fringe === fringe) {
      btn.classList.add('selected');
    }
  });

  const fringeInfo = PA_FRINGE_DATA[fringe];
  console.log(`💇 앞머리 선택: ${fringeInfo.name}`);
}

// 피부 타입 선택
function paSelectSkinType(type) {
  customerProfile.skinType = type;

  document.querySelectorAll('.pa-skin-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.skin === type) {
      btn.classList.add('selected');
    }
  });

  const skinInfo = PA_SKIN_TYPE_DATA[type];
  console.log(`🎨 피부 타입 선택: ${skinInfo.name} (${skinInfo.tone})`);
}

// 컬 선호도 선택
function paSelectCurl(curl) {
  customerProfile.curlPreference = curl;

  document.querySelectorAll('.pa-curl-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.curl === curl) {
      btn.classList.add('selected');
    }
  });

  const curlInfo = PA_CURL_DATA[curl];
  console.log(`🌀 컬 선택: ${curlInfo.name}`);
}

// 분석 제출
function paSubmitAnalysis() {
  if (!paValidateCurrentStep()) {
    return;
  }

  customerProfile.analysisComplete = true;

  // 피부타입에서 톤 결정
  const skinInfo = PA_SKIN_TYPE_DATA[customerProfile.skinType];
  customerProfile.undertone = skinInfo.tone;

  console.log('✅ Personal Analysis 완료:', customerProfile);

  // 결과 생성
  const result = paGenerateAnalysisResult();

  // 모달 닫기
  closePersonalAnalysisModal();

  // 결과 표시
  paDisplayResult(result);

  showToast('Personal Analysis 완료! 맞춤 추천이 업데이트되었습니다.', 'success');

  return result;
}

// 분석 결과 생성
function paGenerateAnalysisResult() {
  const skinInfo = PA_SKIN_TYPE_DATA[customerProfile.skinType];
  const lengthInfo = PA_LENGTH_DATA[customerProfile.desiredLength];
  const fringeInfo = PA_FRINGE_DATA[customerProfile.fringePreference];
  const curlInfo = PA_CURL_DATA[customerProfile.curlPreference];

  // 키에 따른 체형 분류
  let heightCategory = 'medium';
  if (customerProfile.height <= 158) {
    heightCategory = 'short';
  } else if (customerProfile.height >= 168) {
    heightCategory = 'tall';
  }

  // 추천 기장 확인
  const tone = skinInfo.tone;
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[tone][heightCategory];
  const isLengthRecommended = recommendedLengths.includes(customerProfile.desiredLength);

  return {
    profile: customerProfile,
    analysis: {
      heightCategory,
      tone: skinInfo.tone,
      isLengthRecommended,
      recommendedLengths,
      lengthInfo,
      fringeInfo,
      curlInfo,
      skinInfo
    },
    recommendation: paGenerateRecommendation(customerProfile, heightCategory, tone, isLengthRecommended)
  };
}

// 추천 텍스트 생성
function paGenerateRecommendation(profile, heightCategory, tone, isRecommended) {
  const lengthInfo = PA_LENGTH_DATA[profile.desiredLength];
  const fringeInfo = PA_FRINGE_DATA[profile.fringePreference];
  const curlInfo = PA_CURL_DATA[profile.curlPreference];

  let recommendation = `【Personal Analysis 결과】\n\n`;

  recommendation += `📏 고객 정보\n`;
  recommendation += `- 키: ${profile.height}cm (${heightCategory === 'short' ? '작은 편' : heightCategory === 'tall' ? '큰 편' : '보통'})\n`;
  recommendation += `- 현재 기장: ${profile.currentLength === 'short' ? '숏' : profile.currentLength === 'medium' ? '미디엄' : '롱'}\n`;
  recommendation += `- 피부 톤: ${PA_SKIN_TYPE_DATA[profile.skinType].name} (${tone})\n\n`;

  recommendation += `✂️ 희망 스타일\n`;
  recommendation += `- 원하는 기장: ${profile.desiredLength} Length (${lengthInfo.position})\n`;
  recommendation += `- 앞머리: ${fringeInfo.name}\n`;
  recommendation += `- 컬: ${curlInfo.name}\n\n`;

  recommendation += `💡 분석 결과\n`;
  if (isRecommended) {
    recommendation += `✅ 선택하신 ${profile.desiredLength} 기장은 고객님의 체형과 잘 어울립니다!\n`;
  } else {
    const recommended = PA_HEIGHT_RECOMMENDATIONS[tone][heightCategory];
    recommendation += `⚠️ 고객님 체형에는 ${recommended.join(', ')} 기장을 더 추천드립니다.\n`;
    recommendation += `선택하신 ${profile.desiredLength} 기장으로 진행하시려면 스타일링에 주의가 필요합니다.\n`;
  }

  return recommendation;
}

// 결과 표시
function paDisplayResult(result) {
  const container = document.getElementById('pa-result-container');
  if (!container) return;

  const p = result.profile;
  const a = result.analysis;

  container.innerHTML = `
    <div class="pa-result-card">
      <div class="pa-result-header">
        <h3>Personal Analysis</h3>
        <span class="pa-result-badge ${a.tone.toLowerCase()}">${a.tone}</span>
      </div>

      <div class="pa-result-section">
        <h4>📏 고객 정보</h4>
        <div class="pa-result-grid">
          <div class="pa-result-item">
            <label>키</label>
            <span>${p.height}cm (${a.heightCategory === 'short' ? '작은 편' : a.heightCategory === 'tall' ? '큰 편' : '보통'})</span>
          </div>
          <div class="pa-result-item">
            <label>현재 기장</label>
            <span>${p.currentLength === 'short' ? '숏' : p.currentLength === 'medium' ? '미디엄' : '롱'}</span>
          </div>
          <div class="pa-result-item">
            <label>피부 타입</label>
            <span>${a.skinInfo.name}</span>
          </div>
          <div class="pa-result-item">
            <label>톤</label>
            <span>${a.tone}</span>
          </div>
        </div>
      </div>

      <div class="pa-result-section">
        <h4>✂️ 희망 스타일</h4>
        <div class="pa-result-grid">
          <div class="pa-result-item">
            <label>원하는 기장</label>
            <span>${p.desiredLength} Length (${a.lengthInfo.position})</span>
          </div>
          <div class="pa-result-item">
            <label>앞머리</label>
            <span>${a.fringeInfo.name}</span>
          </div>
          <div class="pa-result-item">
            <label>컬</label>
            <span>${a.curlInfo.name}</span>
          </div>
        </div>
      </div>

      <div class="pa-result-section pa-recommendation">
        <h4>💡 분석 결과</h4>
        ${a.isLengthRecommended
          ? `<div class="pa-rec-good">✅ ${p.desiredLength} 기장은 고객님 체형에 잘 어울립니다!</div>`
          : `<div class="pa-rec-warning">⚠️ 추천 기장: ${a.recommendedLengths.join(', ')}</div>`
        }
      </div>
    </div>
  `;

  container.style.display = 'block';
}

// 전역 함수로 노출
window.openPersonalAnalysisModal = openPersonalAnalysisModal;
window.closePersonalAnalysisModal = closePersonalAnalysisModal;
window.paSelectHeight = paSelectHeight;
window.paSelectCurrentLength = paSelectCurrentLength;
window.paSelectDesiredLength = paSelectDesiredLength;
window.paSelectFringe = paSelectFringe;
window.paSelectSkinType = paSelectSkinType;
window.paSelectCurl = paSelectCurl;
window.paNextStep = paNextStep;
window.paPrevStep = paPrevStep;
window.paSubmitAnalysis = paSubmitAnalysis;
window.customerProfile = customerProfile;
