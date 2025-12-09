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

    // 프로필 초기화 및 첫 화면으로 이동
    paResetProfile();

    // 모드 선택 화면으로 돌아가기
    if (typeof goHome === 'function') {
      goHome();
    } else {
      // goHome이 없을 경우 직접 처리
      const modeSelection = document.getElementById('mode-selection');
      if (modeSelection) {
        document.querySelectorAll('.section').forEach(section => {
          section.classList.remove('active');
          section.style.display = '';
        });
        modeSelection.style.display = '';
        modeSelection.classList.add('active');
      }
    }
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
      stepEl.style.display = 'none'; // 인라인 스타일로 숨김
    }
  }

  const currentStepEl = document.getElementById(`pa-step-${paCurrentStep}`);
  if (currentStepEl) {
    currentStepEl.classList.add('active');
    currentStepEl.style.display = 'block'; // 인라인 스타일로 표시
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

  // 모달 닫기
  closePersonalAnalysisModal();

  showToast('고객 정보 입력 완료! AI 분석을 시작합니다.', 'success');

  // AI 분석 화면으로 이동
  proceedToAIAnalysis();
}

// AI 분석 화면으로 이동 (고객 정보 입력 완료 후)
function proceedToAIAnalysis() {
  // 모드 선택 화면 숨기기
  document.getElementById('mode-selection').style.display = 'none';

  // 모든 섹션 비활성화
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // AI 분석 섹션 활성화
  const aiSection = document.getElementById('ai-analysis');
  aiSection.classList.add('active');
  aiSection.style.display = 'block';

  console.log('🎥 AI 분석 화면으로 이동');
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

// ========== 고객 요약 패널 표시 (왼쪽 하단) ==========
function displayCustomerSummary(mediaPipeData) {
  const panel = document.getElementById('customer-summary-panel');
  const content = document.getElementById('customer-summary-content');
  if (!panel || !content) return;

  // 수동 입력 데이터
  const p = customerProfile;
  const lengthNames = { short: '숏', medium: '미디엄', long: '롱' };
  const skinTypeNames = { TP: 'TP (투명)', NP: 'NP (중성)', BP: 'BP (베이스)' };
  const curlNames = { straight: '스트레이트', C: 'C컬', S: 'S컬', CS: 'C+S컬', SS: 'SS컬', none: '선호없음' };
  const fringeNames = { forehead: '이마선', eyebrow: '눈썹선', eye: '눈선', cheekbone: '광대선', lips: '입술선', none: '없음' };

  // MediaPipe 데이터 저장
  customerProfile.mediaPipeData = mediaPipeData;

  // AI 분석 데이터
  const aiUndertone = mediaPipeData?.personalColor?.undertone || '-';
  const aiSeason = mediaPipeData?.personalColor?.season || '-';
  const aiConfidence = mediaPipeData?.personalColor?.confidence || 0;
  const skinHex = mediaPipeData?.correctedRgb ?
    `#${mediaPipeData.correctedRgb.r.toString(16).padStart(2,'0')}${mediaPipeData.correctedRgb.g.toString(16).padStart(2,'0')}${mediaPipeData.correctedRgb.b.toString(16).padStart(2,'0')}` : '#999';

  // 성별에 따른 테마 색상
  const isMale = document.body.classList.contains('male-theme');
  const themeColor = isMale ? '#4A90E2' : '#E91E63';

  // 체형 분류
  let heightCategory = 'medium';
  if (p.height <= 158) heightCategory = 'short';
  else if (p.height >= 168) heightCategory = 'tall';
  const heightCatKr = { short: '작은 편', medium: '보통', tall: '큰 편' };

  // 톤 매핑
  const toneMap = { 'Warm': 'WARM', 'Cool': 'COOL', 'Neutral': 'NEUTRAL' };
  const aiTone = toneMap[aiUndertone] || 'NEUTRAL';
  const manualTone = PA_SKIN_TYPE_DATA[p.skinType]?.tone || 'NEUTRAL';

  // 추천 기장
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[aiTone]?.[heightCategory] || ['C', 'D', 'E'];
  const isLengthRecommended = recommendedLengths.includes(p.desiredLength);

  content.innerHTML = `
    <!-- 수동 입력 섹션 -->
    <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 8px; font-size: 11px;">✍️ 수동 입력</div>
      <div style="display: flex; flex-direction: column; gap: 4px; color: #333; font-size: 11px;">
        <div><span style="color: #888;">키:</span> ${p.height || '-'}cm (${heightCatKr[heightCategory]})</div>
        <div><span style="color: #888;">현재→희망:</span> ${lengthNames[p.currentLength] || '-'} → <b>${p.desiredLength || '-'}</b></div>
        <div><span style="color: #888;">앞머리:</span> ${fringeNames[p.fringePreference] || '-'}</div>
        <div><span style="color: #888;">피부타입:</span> ${skinTypeNames[p.skinType] || '-'}</div>
        <div><span style="color: #888;">컬:</span> ${curlNames[p.curlPreference] || '-'}</div>
      </div>
    </div>

    <!-- AI 분석 섹션 -->
    <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 8px; font-size: 11px;">🤖 AI 분석</div>
      <div style="display: flex; flex-direction: column; gap: 4px; color: #333; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #888;">피부톤:</span>
          <div style="width: 14px; height: 14px; background: ${skinHex}; border-radius: 3px; border: 1px solid #ddd;"></div>
          <span>${skinHex}</span>
        </div>
        <div><span style="color: #888;">언더톤:</span> <b style="color: ${aiUndertone === 'Warm' ? '#FF6B35' : aiUndertone === 'Cool' ? '#4A90E2' : '#8E8E93'};">${aiUndertone}</b></div>
        <div><span style="color: #888;">시즌:</span> <b>${aiSeason}</b> (${aiConfidence}%)</div>
      </div>
    </div>

    <!-- 연계 분석 결과 -->
    <div style="grid-column: 1 / -1; background: linear-gradient(135deg, ${themeColor}15, ${themeColor}08); padding: 10px; border-radius: 8px; border: 1px solid ${themeColor}30; margin-top: 4px;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 6px; font-size: 11px;">🔗 연계 분석</div>
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #333;">
        <div>${manualTone === aiTone ? '✅' : '⚠️'} 수동(${manualTone}) vs AI(${aiTone}) ${manualTone === aiTone ? '일치' : '불일치'}</div>
        <div>${isLengthRecommended ? '✅' : '💡'} ${p.desiredLength} 기장 ${isLengthRecommended ? '적합' : `(추천: ${recommendedLengths.join(',')})`}</div>
      </div>
    </div>
  `;

  panel.style.display = 'block';
  console.log('📋 고객 요약 패널 표시 완료');
}

// ========== 통합 분석 결과 생성 ==========
function generateIntegratedAnalysis(mediaPipeData) {
  const p = customerProfile;

  // 피부타입과 AI 언더톤 비교
  const manualTone = PA_SKIN_TYPE_DATA[p.skinType]?.tone || 'NEUTRAL';
  const aiUndertone = mediaPipeData?.personalColor?.undertone || 'Neutral';

  // 톤 매칭 여부
  const toneMap = { 'Warm': 'WARM', 'Cool': 'COOL', 'Neutral': 'NEUTRAL' };
  const aiTone = toneMap[aiUndertone] || 'NEUTRAL';
  const toneMatch = manualTone === aiTone;

  // 키에 따른 체형 분류
  let heightCategory = 'medium';
  if (p.height <= 158) heightCategory = 'short';
  else if (p.height >= 168) heightCategory = 'tall';

  // 추천 기장 확인
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[aiTone]?.[heightCategory] || ['C', 'D', 'E'];
  const isLengthRecommended = recommendedLengths.includes(p.desiredLength);

  // 통합 결과 객체
  const integrated = {
    customer: {
      height: p.height,
      heightCategory,
      currentLength: p.currentLength,
      desiredLength: p.desiredLength,
      fringePreference: p.fringePreference,
      curlPreference: p.curlPreference,
      manualSkinType: p.skinType,
      manualTone
    },
    ai: {
      undertone: aiUndertone,
      tone: aiTone,
      season: mediaPipeData?.personalColor?.season,
      confidence: mediaPipeData?.personalColor?.confidence,
      skinRgb: mediaPipeData?.correctedRgb
    },
    analysis: {
      toneMatch,
      finalTone: toneMatch ? aiTone : aiTone, // AI 우선
      recommendedLengths,
      isLengthRecommended,
      hairRecommendations: mediaPipeData?.hairRecommendations
    }
  };

  console.log('🔗 통합 분석 결과:', integrated);
  return integrated;
}

// ========== 통합 분석 결과 HTML 생성 (오른쪽 패널) ==========
function generateIntegratedResultHTML(integrated, personalColor) {
  if (!integrated || !customerProfile.analysisComplete) {
    return ''; // 고객 정보 미입력 시 빈 문자열 반환
  }

  const c = integrated.customer;
  const a = integrated.ai;
  const analysis = integrated.analysis;

  // 체형 카테고리 한글
  const heightCatKr = { short: '작은 편', medium: '보통', tall: '큰 편' };
  const lengthNames = { short: '숏', medium: '미디엄', long: '롱' };
  const curlNames = { straight: '스트레이트', C: 'C컬', S: 'S컬', CS: 'C+S컬', SS: 'SS컬', none: '선호없음' };
  const fringeNames = { forehead: '이마선', eyebrow: '눈썹선', eye: '눈선', cheekbone: '광대선', lips: '입술선', none: '없음' };

  // 기장 변화량 계산
  const lengthOrder = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const currentLengthIdx = { short: 6, medium: 4, long: 1 }; // short=G위치, medium=E위치, long=B위치
  const desiredIdx = lengthOrder.indexOf(c.desiredLength);
  const currentIdx = currentLengthIdx[c.currentLength] || 4;
  const lengthChange = currentIdx - desiredIdx;
  const lengthChangeText = lengthChange > 0 ? `${Math.abs(lengthChange)}단계 길게` : lengthChange < 0 ? `${Math.abs(lengthChange)}단계 짧게` : '유지';
  const lengthChangeIcon = lengthChange === 0 ? '➡️' : lengthChange > 0 ? '📏⬆️' : '✂️⬇️';

  // 시술 난이도 계산
  const difficultyScore = Math.abs(lengthChange) + (c.curlPreference !== 'straight' && c.curlPreference !== 'none' ? 1 : 0);
  const difficultyText = difficultyScore <= 1 ? '쉬움' : difficultyScore <= 3 ? '보통' : '어려움';
  const difficultyColor = difficultyScore <= 1 ? '#4CAF50' : difficultyScore <= 3 ? '#FF9800' : '#F44336';

  // 톤 매칭 여부에 따른 스타일
  const toneMatchStyle = analysis.toneMatch
    ? 'background: rgba(76,175,80,0.15); border-color: rgba(76,175,80,0.3); color: #2E7D32;'
    : 'background: rgba(255,152,0,0.15); border-color: rgba(255,152,0,0.3); color: #E65100;';
  const toneMatchIcon = analysis.toneMatch ? '✅' : '⚠️';
  const toneMatchText = analysis.toneMatch
    ? '수동 입력과 AI 분석 결과가 일치합니다'
    : `수동(${c.manualTone}) ≠ AI(${a.tone}) → AI 결과 우선 적용`;

  // 기장 추천 여부
  const lengthMatchStyle = analysis.isLengthRecommended
    ? 'color: #2E7D32;'
    : 'color: #E65100;';
  const lengthMatchIcon = analysis.isLengthRecommended ? '✅' : '💡';
  const lengthMatchText = analysis.isLengthRecommended
    ? `${c.desiredLength} Length 체형 적합!`
    : `추천: ${analysis.recommendedLengths.join(', ')} (선택: ${c.desiredLength})`;

  // 성별에 따른 테마 색상
  const isMale = document.body.classList.contains('male-theme');
  const themeGradient = isMale
    ? 'linear-gradient(135deg, #4A90E2, #3A7BC8)'
    : 'linear-gradient(135deg, #E91E63, #C2185B)';
  const themeColor = isMale ? '#4A90E2' : '#E91E63';

  // 컬 추천 텍스트
  const curlRecommendText = getCurlRecommendation(c.curlPreference, a.season);

  return `
    <!-- 🎯 통합 분석 결과 -->
    <div style="background: ${themeGradient}; padding: 16px; border-radius: 14px; margin-bottom: 14px; color: #fff;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 20px;">🎯</span>
        <span style="font-size: 16px; font-weight: 700;">Personal Analysis 종합 결과</span>
      </div>

      <!-- 고객 프로필 요약 -->
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; margin-bottom: 10px;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">👤 고객 프로필</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
          <div>키: <b>${c.height}cm</b> (${heightCatKr[c.heightCategory]})</div>
          <div>피부톤: <b>${a.tone}</b></div>
          <div>희망 기장: <b>${c.desiredLength} Length</b></div>
          <div>앞머리: <b>${fringeNames[c.fringePreference]}</b></div>
          <div>컬 선호: <b>${curlNames[c.curlPreference]}</b></div>
          <div>시즌: <b>${a.season}</b></div>
        </div>
      </div>

      <!-- 기장 변화 정보 -->
      <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <div>${lengthChangeIcon} <b>${lengthNames[c.currentLength]} → ${c.desiredLength}</b> (${lengthChangeText})</div>
          <div style="background: ${difficultyColor}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">
            난이도: ${difficultyText}
          </div>
        </div>
      </div>

      <!-- 분석 매칭 결과 -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="padding: 10px; border-radius: 8px; font-size: 12px; ${toneMatchStyle}">
          <span>${toneMatchIcon}</span> ${toneMatchText}
        </div>
        <div style="padding: 10px; border-radius: 8px; font-size: 12px; background: rgba(255,255,255,0.9); ${lengthMatchStyle}">
          <span>${lengthMatchIcon}</span> ${lengthMatchText}
        </div>
      </div>
    </div>

    <!-- 💇 스타일 추천 -->
    <div style="background: linear-gradient(135deg, ${themeColor}15, ${themeColor}08); padding: 14px; border-radius: 12px; border: 1px solid ${themeColor}30; margin-bottom: 14px;">
      <div style="font-size: 13px; font-weight: 600; color: ${themeColor}; margin-bottom: 10px;">💇 맞춤 스타일 추천</div>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #333;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span><b>${c.desiredLength} Length</b> + <b>${fringeNames[c.fringePreference]}</b> 앞머리 조합</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span>${curlRecommendText}</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span>${a.season} 시즌 컬러와 조화되는 염색 추천</span>
        </div>
      </div>
    </div>
  `;
}

// 컬 추천 텍스트 생성
function getCurlRecommendation(curlPref, season) {
  const curlDesc = {
    straight: '스트레이트로 깔끔하고 단정한 이미지 연출',
    C: 'C컬로 자연스러운 볼륨감과 여성스러운 분위기',
    S: 'S컬로 풍성한 웨이브와 화려한 스타일',
    CS: 'C+S컬 믹스로 입체적이고 세련된 느낌',
    SS: 'SS컬로 강한 컬감과 개성있는 스타일',
    none: '고객 선호에 따라 다양한 컬 스타일 가능'
  };
  return curlDesc[curlPref] || curlDesc.none;
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
window.displayCustomerSummary = displayCustomerSummary;
window.generateIntegratedAnalysis = generateIntegratedAnalysis;
window.generateIntegratedResultHTML = generateIntegratedResultHTML;
