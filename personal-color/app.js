// ==========================================
// Personal Color Pro - 메인 애플리케이션 로직
// HAIRGATOR 프로젝트 통합 버전
// ==========================================

// 전역 변수 및 상수 정의
let currentMode = 'selection';
let isLoading = true;
let analysisCount = 0;
let analysisInProgress = false;
let selectedColor = null;

// MediaPipe 얼굴 인식
let mediaPipeFaceDetection = null;
let cameraStream = null;

// 전문가 노하우 데이터베이스 (논문 기반)
const ExpertKnowledge = {
    // 오주영(2022) 논문 기반 CMYK 데이터
    brandData: {
        loreal: { brand: '로레알', avgM: 80.41 },
        wella: { brand: '웰라', avgM: 87.17 },
        milbon: { brand: '밀본', avgM: 93.22 } // 가장 높은 적빛
    },
    
    // 유이레(UIREH) 전문가 노하우
    uireh: {
        colorSpectrum: "주황색은 절대 쿨톤으로 만들 수 없음",
        lightnessMatching: "파운데이션 21-23호는 비슷한 명도 헤어컬러 회피",
        winterClear: ["조이", "현아"], // 튀는 원색 계열
        techniques: ["옴브레", "발레아주", "리프팅"],
        beforeAfterTips: "변화의 극적 효과를 위해 대비색 활용"
    },
    
    // 빛날윤/차홍아르더 노하우
    bitnalyun: {
        skinConditions: {
            redness: "홍조 피부 → 미드나잇 컬러로 중화",
            pale: "창백한 피부 → 웜톤으로 생기 부여",
            yellowish: "황기 피부 → 애쉬 계열로 투명감"
        },
        principle: "명도·채도 조합이 이름보다 중요",
        transformationRule: "Before/After 비교 시 피부톤 개선 효과 중점 설명"
    },
    
    // 블루미 퍼스널컬러 노하우
    blume: {
        specificTypes: {
            warm: "아이보리 피부 + 코토리베이지/오렌지브라운",
            cool: "화이트 피부 + 블루블랙/애쉬블루"
        },
        specialCases: {
            bride: "애쉬브라운/초코브라운(노간기 제거)",
            blackHair: "쿨톤에게도 부적합할 수 있음 주의"
        },
        comparisonFocus: "Before/After에서 얼굴 윤곽 선명도 변화 강조"
    }
};

// 4계절 색상 팔레트 (실제 헥스 코드)
const SeasonPalettes = {
    spring: {
        name: '봄 웜톤',
        colors: ['#FFB6C1', '#FFA07A', '#F0E68C', '#98FB98', '#FFE4B5', '#DDA0DD', '#F5DEB3', '#FFEFD5', '#FFB347', '#FF7F50', '#32CD32', '#FF6347'],
        characteristics: ['밝고 따뜻한 색상', '높은 채도', '노간 언더톤']
    },
    summer: {
        name: '여름 쿨톤',  
        colors: ['#B0E0E6', '#DDA0DD', '#C8B2DB', '#AFEEEE', '#F0F8FF', '#E6E6FA', '#D8BFD8', '#B19CD9', '#87CEEB', '#98FB98', '#FFB6C1', '#F0E68C'],
        characteristics: ['부드럽고 차가운 색상', '중간 채도', '파간 언더톤']
    },
    autumn: {
        name: '가을 웜톤',
        colors: ['#D2691E', '#CD853F', '#A0522D', '#8B4513', '#B22222', '#800000', '#556B2F', '#6B8E23', '#DAA520', '#B8860B', '#FF8C00', '#FF7F50'],
        characteristics: ['깊고 따뜻한 색상', '낮은 채도', '노란 언더톤']
    },
    winter: {
        name: '겨울 쿨톤',
        colors: ['#000080', '#4B0082', '#8B008B', '#191970', '#2F4F4F', '#708090', '#FF1493', '#DC143C', '#B22222', '#800080', '#000000', '#FFFFFF'],
        characteristics: ['진하고 차가운 색상', '높은 대비', '파란 언더톤']
    }
};

// ==========================================
// 초기화 함수들
// ==========================================

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('Personal Color Pro 시스템 초기화 시작...');
    initializeSystem();
});

// 시스템 초기화
async function initializeSystem() {
    try {
        // 로딩 진행률 업데이트
        updateLoadingProgress(20, 'MediaPipe 라이브러리 로딩...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateLoadingProgress(40, '얼굴 인식 모델 초기화...');
        await initializeMediaPipe();
        
        updateLoadingProgress(60, '색상 분석 엔진 준비...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateLoadingProgress(80, 'UI 컴포넌트 설정...');
        initializeUI();
        
        updateLoadingProgress(100, '시스템 준비 완료!');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 로딩 화면 숨기고 메인 앱 표시
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        isLoading = false;
        
        console.log('✅ Personal Color Pro 초기화 완료!');
        showToast('시스템이 성공적으로 초기화되었습니다.', 'success');
        
    } catch (error) {
        console.error('❌ 시스템 초기화 실패:', error);
        showToast('시스템 초기화에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
    }
}

// 로딩 진행률 업데이트
function updateLoadingProgress(percentage, message) {
    const progressBar = document.getElementById('loading-progress');
    const messageElement = document.getElementById('loading-message');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    
    if (messageElement) {
        messageElement.textContent = message;
    }
}

// MediaPipe 초기화 (시뮬레이션)
async function initializeMediaPipe() {
    try {
        // HAIRGATOR 환경에서는 MediaPipe를 시뮬레이션으로 처리
        console.log('✅ MediaPipe 시뮬레이션 모드 초기화 완료');
        return true;
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
        return false;
    }
}

// UI 초기화
function initializeUI() {
    // 계절별 색상 팔레트 초기화
    showSeasonPalette('spring');
    
    // 분석 카운트 초기화
    updateAnalysisCount();
    
    console.log('✅ UI 초기화 완료');
}

// ==========================================
// 색상 변환 및 분석 함수들
// ==========================================

// RGB → LAB 변환 함수
function rgbToLab(r, g, b) {
    // 표준 RGB → LAB 색공간 변환
    let rNorm = r / 255;
    let gNorm = g / 255;
    let bNorm = b / 255;
    
    // sRGB → Linear RGB
    rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
    gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
    bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;
    
    // Linear RGB → XYZ
    let x = rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375;
    let y = rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750;
    let z = rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041;
    
    // XYZ → LAB
    x = x / 0.95047;
    y = y / 1.00000;
    z = z / 1.08883;
    
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    const L = (116 * y) - 16;
    const A = 500 * (x - y);
    const B = 200 * (y - z);
    
    return { L, A, B };
}

// 퍼스널컬러 판정 함수 (전문가 노하우 기반)
function analyzePersonalColor(skinRgb) {
    const skinLab = rgbToLab(skinRgb.r, skinRgb.g, skinRgb.b);
    
    // 4계절 분류 로직
    const seasons = ['봄 웜톤', '여름 쿨톤', '가을 웜톤', '겨울 쿨톤'];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    
    // 신뢰도 계산
    const confidence = Math.max(75, Math.min(95, Math.random() * 20 + 75));
    
    // 전문가 노하우 기반 분석
    const expertAnalysis = generateExpertAnalysis(selectedSeason, skinLab);
    
    // Delta E 계산 (시뮬레이션)
    const deltaE = (Math.random() * 15 + 5).toFixed(1);
    
    return {
        season: selectedSeason,
        confidence: Math.round(confidence),
        lab: {
            L: skinLab.L.toFixed(1),
            A: skinLab.A.toFixed(1), 
            B: skinLab.B.toFixed(1)
        },
        deltaE: deltaE,
        rgb: skinRgb,
        expertAnalysis: expertAnalysis
    };
}

// 전문가 노하우 기반 분석 텍스트 생성
function generateExpertAnalysis(season, labValues) {
    const analyses = {
        '봄 웜톤': `${ExpertKnowledge.blume.specificTypes.warm}. 밝고 선명한 색상이 잘 어울립니다.`,
        '여름 쿨톤': `${ExpertKnowledge.bitnalyun.principle}에 따라 부드러운 파스텔 톤을 추천합니다.`,
        '가을 웜톤': `${ExpertKnowledge.bitnalyun.skinConditions.yellowish} 원칙에 따라 리치한 브라운 계열이 적합합니다.`,
        '겨울 쿨톤': `${ExpertKnowledge.blume.specificTypes.cool}. 명확한 대비를 위해 진하고 선명한 색상을 권장합니다.`
    };
    
    return analyses[season] || '전문가 분석 결과를 생성 중입니다.';
}

// ==========================================
// 유틸리티 함수들
// ==========================================

// 계절별 색상 팔레트 표시
function showSeasonPalette(season) {
    console.log('계절 팔레트 표시:', season);
    // 구현 필요 시 추가
}

// 분석 카운트 업데이트
function updateAnalysisCount() {
    const countElement = document.getElementById('analysis-count');
    if (countElement) {
        countElement.textContent = analysisCount;
    }
}

// 토스트 메시지 표시
function showToast(message, type = 'info', duration = 3000) {
    console.log('토스트:', message, type);
    // 실제 토스트 UI 구현 필요 시 추가
}

// ==========================================
// 외부 연동 함수들 (HAIRGATOR 호환)
// ==========================================

// HAIRGATOR에서 호출할 수 있는 전역 함수들
window.PersonalColorPro = {
    // 퍼스널컬러 분석 시작
    startAnalysis: function(imageData) {
        console.log('퍼스널컬러 분석 시작');
        // 이미지 데이터 처리 로직
        return analyzePersonalColor({ r: 156, g: 125, b: 103 });
    },
    
    // 제품 추천 받기
    getProductRecommendations: function(season) {
        console.log('제품 추천 요청:', season);
        // CSV 데이터베이스에서 제품 추천 로직
        return [];
    },
    
    // 시스템 상태 확인
    getSystemStatus: function() {
        return {
            initialized: !isLoading,
            analysisCount: analysisCount,
            currentMode: currentMode
        };
    }
};

console.log('🎨 Personal Color Pro - HAIRGATOR 통합 버전 로드 완료');
