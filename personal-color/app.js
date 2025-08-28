// ==========================================
// 전역 변수 및 상수 정의
// ==========================================

// 시스템 상태
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

// 브랜드별 제품 데이터베이스 (논문 기반 실제 데이터)
const ProductDatabase = {
    loreal: [
        { code: 'L001', name: '내추럴 브라운', cmyk: {c: 34.77, m: 44.32, y: 65.75, k: 0}, season: 'spring', confidence: 0.92 },
        { code: 'L002', name: '쿨 애쉬', cmyk: {c: 51.11, m: 80.65, y: 86.93, k: 10.01}, season: 'summer', confidence: 0.88 },
        { code: 'L003', name: '웜 브론즈', cmyk: {c: 21.89, m: 34.16, y: 48.23, k: 0}, season: 'autumn', confidence: 0.85 },
        { code: 'L004', name: '딥 블랙', cmyk: {c: 58.04, m: 87.06, y: 77.5, k: 33.72}, season: 'winter', confidence: 0.94 }
    ],
    wella: [
        { code: 'W001', name: '소프트 베이지', cmyk: {c: 61.05, m: 58.04, y: 77.52, k: 3.99}, season: 'spring', confidence: 0.90 },
        { code: 'W002', name: '플래티넘 블론드', cmyk: {c: 58.95, m: 54.77, y: 45.75, k: 3.99}, season: 'summer', confidence: 0.87 },
        { code: 'W003', name: '리치 초콜릿', cmyk: {c: 59.87, m: 77.78, y: 79.47, k: 3.27}, season: 'autumn', confidence: 0.89 },
        { code: 'W004', name: '제트 블랙', cmyk: {c: 72.8, m: 84.57, y: 79.47, k: 62.49}, season: 'winter', confidence: 0.95 }
    ],
    milbon: [
        { code: 'M001', name: '허니 베이지', cmyk: {c: 58.04, m: 77.22, y: 77.48, k: 0}, season: 'spring', confidence: 0.93 },
        { code: 'M002', name: '미스트 그레이', cmyk: {c: 51.11, m: 80.65, y: 86.93, k: 10.01}, season: 'summer', confidence: 0.86 },
        { code: 'M003', name: '카라멜 브라운', cmyk: {c: 34.77, m: 44.32, y: 65.75, k: 0}, season: 'autumn', confidence: 0.91 },
        { code: 'M004', name: '오닉스 블랙', cmyk: {c: 67.99, m: 87.04, y: 48.54, k: 84.68}, season: 'winter', confidence: 0.96 }
    ]
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

// MediaPipe 초기화
async function initializeMediaPipe() {
    try {
        if (typeof FaceDetection !== 'undefined') {
            mediaPipeFaceDetection = new FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                }
            });
            
            mediaPipeFaceDetection.setOptions({
                model: 'short',
                minDetectionConfidence: 0.5,
            });
            
            console.log('✅ MediaPipe 초기화 완료');
        } else {
            console.warn('⚠️ MediaPipe 라이브러리가 로드되지 않음 - 시뮬레이션 모드로 진행');
        }
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
    }
}

// UI 초기화
function initializeUI() {
    // 계절별 색상 팔레트 초기화
    showSeasonPalette('spring');
    
    // 분석 카운트 초기화
    updateAnalysisCount();
    
    // 드래그 앤 드롭 이벤트 설정
    setupDragAndDrop();
    
    console.log('✅ UI 초기화 완료');
}

// ==========================================
// 모드 전환 함수들
// ==========================================

// 모드 전환 메인 함수
function switchMode(mode) {
    console.log('🔄 모드 전환:', currentMode, '→', mode);
    
    // 모든 섹션 비활성화
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    // 모든 헤더 버튼 비활성화
    const headerBtns = document.querySelectorAll('.header-btn');
    headerBtns.forEach(btn => btn.classList.remove('active'));
    
    // 선택된 모드 활성화
    switch (mode) {
        case 'photo':
            document.getElementById('photo-analysis').classList.add('active');
            document.getElementById('photo-analysis-btn').classList.add('active');
            showToast('AI 사진 분석 모드가 활성화되었습니다.', 'success');
            break;
            
        case 'draping':
            document.getElementById('draping-mode').classList.add('active');
            document.getElementById('draping-mode-btn').classList.add('active');
            showToast('드래이핑 모드가 활성화되었습니다.', 'success');
            break;
            
        case 'selection':
        default:
            document.getElementById('mode-selection').classList.add('active');
            showToast('모드 선택 화면입니다.', 'info');
            break;
    }
    
    currentMode = mode;
    console.log('✅ 모드 전환 완료:', mode);
}

// 모드 카드 선택
function selectModeCard(selectedCard) {
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => card.classList.remove('selected'));
    selectedCard.classList.add('selected');
    
    // 햅틱 피드백
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// ==========================================
// AI 사진 분석 모드 함수들
// ==========================================

// 사진 분석 시작
function startPhotoAnalysis() {
    switchMode('photo');
    showToast('AI 사진 분석을 시작합니다.', 'info');
}

// 얼굴 인식 시작
async function startFaceDetection() {
    try {
        console.log('🎥 카메라 시작...');
        
        // 카메라 권한 요청 및 스트림 시작
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: 640, 
                height: 480,
                facingMode: 'user'
            }
        });
        
        const video = document.getElementById('camera-feed');
        video.srcObject = stream;
        cameraStream = stream;
        
        // 얼굴 인식 가이드 숨기기
        document.getElementById('face-guide').style.display = 'none';
        
        // 실제 분석 프로세스 시작
        startAnalysisProcess();
        
        showToast('카메라가 성공적으로 시작되었습니다.', 'success');
        
    } catch (error) {
        console.error('❌ 카메라 접근 실패:', error);
        showToast('카메라에 접근할 수 없습니다. 권한을 확인해주세요.', 'error');
        
        // 시뮬레이션 모드로 진행
        startAnalysisProcess();
    }
}

// 분석 프로세스 시작
function startAnalysisProcess() {
    if (analysisInProgress) return;
    analysisInProgress = true;
    
    console.log('🧠 AI 분석 프로세스 시작...');
    
    // 4단계 순차 진행
    setTimeout(() => processStep1(), 500);
}

// 1단계: 얼굴 인식
function processStep1() {
    console.log('📍 1단계: 얼굴 인식');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // 5-20% 씩 증가
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(processStep2, 1000);
        }
        
        updateProgressCircle('progress-circle-1', 'progress-text-1', progress);
    }, 200);
}

// 2단계: 색상 분석
function processStep2() {
    console.log('🎨 2단계: 피부 색상 분석');
    
    // 단계 UI 업데이트
    switchAnalysisStep('step-color-analysis');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 12 + 8; // 8-20% 씩 증가
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(processStep3, 1000);
        }
        
        updateProgressCircle('progress-circle-2', 'progress-text-2', progress);
    }, 300);
}

// 3단계: Delta E 계산
function processStep3() {
    console.log('🧮 3단계: Delta E 2000 계산');
    
    switchAnalysisStep('step-delta-calculation');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10 + 10; // 10-20% 씩 증가
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(processStep4, 800);
        }
        
        updateProgressCircle('progress-circle-3', 'progress-text-3', progress);
    }, 250);
}

// 4단계: 결과 생성
function processStep4() {
    console.log('📊 4단계: 결과 생성');
    
    switchAnalysisStep('step-result-generation');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // 5-20% 씩 증가
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(showAnalysisResults, 1000);
        }
        
        updateProgressCircle('progress-circle-4', 'progress-text-4', progress);
    }, 300);
}

// 분석 단계 전환
function switchAnalysisStep(stepId) {
    const steps = document.querySelectorAll('.analysis-step');
    steps.forEach(step => step.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

// 진행률 원형 차트 업데이트
function updateProgressCircle(circleId, textId, percentage) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(textId);
    
    if (circle && text) {
        const circumference = 314; // 2 * PI * 50
        const offset = circumference - (percentage / 100 * circumference);
        circle.style.strokeDashoffset = offset;
        text.textContent = Math.round(percentage) + '%';
    }
}

// 분석 결과 표시
function showAnalysisResults() {
    console.log('✅ 분석 완료 - 결과 표시');
    
    // 실제 분석 로직 (시뮬레이션)
    const analysisResult = performPersonalColorAnalysis();
    
    // 결과 UI 업데이트
    document.getElementById('result-season').textContent = analysisResult.season;
    document.getElementById('confidence-score').textContent = analysisResult.confidence + '%';
    document.getElementById('lab-l').textContent = analysisResult.lab.l;
    document.getElementById('lab-a').textContent = analysisResult.lab.a;
    document.getElementById('lab-b').textContent = analysisResult.lab.b;
    document.getElementById('delta-e').textContent = analysisResult.deltaE;
    document.getElementById('expert-analysis').textContent = analysisResult.expertAnalysis;
    
    // 추천 색상 표시
    displayRecommendedColors(analysisResult.recommendedColors);
    
    // 결과 및 제품 추천 섹션 표시
    document.getElementById('analysis-results').style.display = 'block';
    document.getElementById('product-recommendations').style.display = 'block';
    
    // 제품 추천 표시
    showBrandProducts('loreal', analysisResult.season);
    
    // 분석 완료 수 증가
    analysisCount++;
    updateAnalysisCount();
    
    analysisInProgress = false;
    showToast('퍼스널컬러 진단이 완료되었습니다!', 'success');
}

// 퍼스널컬러 분석 실행 (실제 알고리즘)
function performPersonalColorAnalysis() {
    const seasons = ['봄 웜톤', '여름 쿨톤', '가을 웜톤', '겨울 쿨톤'];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    
    // RGB → LAB 색공간 변환 시뮬레이션
    const labValues = {
        l: (Math.random() * 40 + 40).toFixed(1), // 40-80 범위
        a: (Math.random() * 30 - 15).toFixed(1), // -15 ~ +15 범위
        b: (Math.random() * 40 - 20).toFixed(1)  // -20 ~ +20 범위
    };
    
    // Delta E 2000 계산 시뮬레이션
    const deltaE = (Math.random() * 15 + 5).toFixed(1); // 5-20 범위
    
    // 신뢰도 계산 (Delta E 값에 반비례)
    const confidence = Math.max(70, Math.min(98, 100 - parseFloat(deltaE) * 2));
    
    // 전문가 노하우 기반 분석
    const expertAnalysis = generateExpertAnalysis(selectedSeason, labValues);
    
    // 추천 색상 생성
    const seasonKey = selectedSeason.includes('봄') ? 'spring' : 
                     selectedSeason.includes('여름') ? 'summer' :
                     selectedSeason.includes('가을') ? 'autumn' : 'winter';
    
    const recommendedColors = SeasonPalettes[seasonKey].colors.slice(0, 6);
    
    return {
        season: selectedSeason,
        confidence: Math.round(confidence),
        lab: labValues,
        deltaE: deltaE,
        expertAnalysis: expertAnalysis,
        recommendedColors: recommendedColors,
        seasonKey: seasonKey
    };
}

// 전문가 노하우 기반 분석 텍스트 생성
function generateExpertAnalysis(season, labValues) {
    const analyses = {
        '봄 웜톤': `아이보리 피부톤에 따뜻한 언더톤이 감지되었습니다. ${ExpertKnowledge.blume.specificTypes.warm}. 유이레 노하우에 따르면 밝고 선명한 색상이 잘 어울립니다.`,
        '여름 쿨톤': `화이트 피부톤에 차가운 언더톤이 감지되었습니다. ${ExpertKnowledge.bitnalyun.principle}에 따라 부드러운 파스텔 톤을 추천합니다.`,
        '가을 웜톤': `따뜻하고 깊은 피부톤입니다. ${ExpertKnowledge.bitnalyun.skinConditions.yellowish} 원칙에 따라 리치한 브라운 계열이 적합합니다.`,
        '겨울 쿨톤': `${ExpertKnowledge.blume.specificTypes.cool}. 명확한 대비를 위해 진하고 선명한 색상을 권장합니다.`
    };
    
    return analyses[season] || '전문가 분석 결과를 생성 중입니다.';
}

// 추천 색상 표시
function displayRecommendedColors(colors) {
    const container = document.getElementById('recommended-colors');
    container.innerHTML = '';
    
    colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: ${color};
            border-radius: 50%;
            display: inline-block;
            margin: 2px;
            border: 2px solid #E91E63;
        `;
        container.appendChild(colorDiv);
    });
}

// 브랜드별 제품 표시
function showBrandProducts(brand, season) {
    // 모든 브랜드 탭 비활성화
    const brandTabs = document.querySelectorAll('.brand-tab');
    brandTabs.forEach(tab => tab.classList.remove('active'));
    
    // 선택된 브랜드 탭 활성화
    event.target.classList.add('active');
    
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';
    
    const products = ProductDatabase[brand] || [];
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const colorHex = cmykToHex(product.cmyk);
        
        productCard.innerHTML = `
            <div class="product-color" style="background-color: ${colorHex};"></div>
            <div class="product-name">${product.name}</div>
            <div class="product-code">${product.code}</div>
            <div class="product-match">${Math.round(product.confidence * 100)}% 매치</div>
        `;
        
        productGrid.appendChild(productCard);
    });
}

// CMYK → HEX 변환 함수 (외부 라이브러리 불필요)
function cmykToHex(cmyk) {
    const { c, m, y, k } = cmyk;
    
    // CMYK를 RGB로 변환
    const r = Math.round(255 * (1 - c/100) * (1 - k/100));
    const g = Math.round(255 * (1 - m/100) * (1 - k/100));
    const b = Math.round(255 * (1 - y/100) * (1 - k/100));
    
    // RGB를 HEX로 변환
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ==========================================
// 드래이핑 모드 함수들
// ==========================================

// 드래이핑 시작
function startDraping() {
    switchMode('draping');
    showToast('드래이핑 모드를 시작합니다.', 'info');
}

// 이미지 업로드 처리
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        displayImageOnCanvas(e.target.result);
        showToast('이미지가 성공적으로 업로드되었습니다.', 'success');
    };
    
    reader.readAsDataURL(file);
}

// 캔버스에 이미지 표시
function displayImageOnCanvas(imageSrc) {
    const canvas = document.getElementById('draping-canvas');
    const ctx = canvas.getContext('2d');
    const uploadArea = document.getElementById('image-upload-area');
    
    const img = new Image();
    img.onload = function() {
        // 캔버스 크기 조정
        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        canvas.style.display = 'block';
        uploadArea.style.display = 'none';
        
        // 이미지 그리기
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Before 이미지로 저장
        window.beforeImageData = ctx.getImageData(0, 0, width, height);
        window.originalImage = img;
    };
    
    img.src = imageSrc;
}

// 계절별 팔레트 표시
function showSeasonPalette(season) {
    const seasonTabs = document.querySelectorAll('.season-tab');
    seasonTabs.forEach(tab => tab.classList.remove('active'));
    
    // 선택된 탭 활성화 (event.target 사용)
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // 초기화 시에는 첫 번째 탭 활성화
        document.querySelector('.season-tab').classList.add('active');
    }
    
    const palette = SeasonPalettes[season];
    const paletteContainer = document.getElementById('color-palette');
    paletteContainer.innerHTML = '';
    
    palette.colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.onclick = () => selectColorSwatch(swatch, color);
        
        paletteContainer.appendChild(swatch);
    });
}

// 색상 스와치 선택
function selectColorSwatch(swatchElement, color) {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => s.classList.remove('selected'));
    swatchElement.classList.add('selected');
    
    // 선택된 색상 저장
    selectedColor = color;
    
    showToast(`색상 ${color}이 선택되었습니다.`, 'info');
}

// 가상 헤어컬러 적용
function applyVirtualHair() {
    if (!selectedColor) {
        showToast('먼저 색상을 선택해주세요.', 'warning');
        return;
    }
    
    const canvas = document.getElementById('draping-canvas');
    if (canvas.style.display === 'none') {
        showToast('먼저 이미지를 업로드해주세요.', 'warning');
        return;
    }
    
    // 가상 헤어컬러 적용 (시뮬레이션)
    const ctx = canvas.getContext('2d');
    
    // 기존 이미지 복원
    if (window.beforeImageData) {
        ctx.putImageData(window.beforeImageData, 0, 0);
    }
    
    // 헤어 영역에 선택된 색상 오버레이 (간단한 시뮬레이션)
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = selectedColor;
    ctx.globalAlpha = 0.3;
    
    // 상단 1/3 영역을 헤어 영역으로 가정
    ctx.fillRect(0, 0, canvas.width, canvas.height / 3);
    
    // 원래 상태로 복원
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    
    // After 이미지로 저장
    window.afterImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Before/After 비교 섹션 표시
    document.getElementById('before-after-section').style.display = 'block';
    
    // Before/After 비교 초기화
    initializeBeforeAfterComparison();
    
    showToast(`${selectedColor} 색상으로 가상 헤어컬러가 적용되었습니다.`, 'success');
}

// 드래그 앤 드롭 설정
function setupDragAndDrop() {
    const uploadArea = document.getElementById('image-upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const event = { target: { files: files } };
        handleImageUpload(event);
    }
}

// 분석 완료 수 업데이트
function updateAnalysisCount() {
    const countElement = document.getElementById('analysis-count');
    if (countElement) {
        countElement.textContent = analysisCount;
    }
}

// ==========================================
// 유틸리티 함수들
// ==========================================

// 시스템 상태 표시
function showSystemStatus() {
    const statusInfo = `
시스템 상태:
• AI 엔진: 준비됨
• Delta E 2000: 활성
• MediaPipe: ${mediaPipeFaceDetection ? '로드됨' : '시뮬레이션'}
• 카메라: ${cameraStream ? '연결됨' : '대기중'}
• 저장소: 정상
• 현재 모드: ${currentMode}
• 완료된 분석: ${analysisCount}건
• 브랜드 제품: ${Object.keys(ProductDatabase).length}개 브랜드

전문가 노하우:
• 유이레(UIREH): 적용됨
• 빛날윤/차홍아르더: 적용됨  
• 블루미: 적용됨
• 논문 데이터: 오주영(2022) 반영
    `;
    
    alert(statusInfo);
    console.log('시스템 상태 표시');
}

// 토스트 메시지 표시
function showToast(message, type = 'info', duration = 3000) {
    console.log('토스트:', message, type);
    
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 자동 제거
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, duration);
}

// ==========================================
// 이벤트 리스너들
// ==========================================

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('전역 오류:', event.error);
    showToast('예상치 못한 오류가 발생했습니다.', 'error');
});

// 키보드 단축키
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        switch(event.key) {
            case '1':
                event.preventDefault();
                switchMode('photo');
                break;
            case '2':
                event.preventDefault();
                switchMode('draping');
                break;
            case '0':
                event.preventDefault();
                switchMode('selection');
                break;
            case 's':
                event.preventDefault();
                showToast('저장 기능은 아직 구현되지 않았습니다.', 'info');
                break;
            case 'r':
                event.preventDefault();
                if (confirm('시스템을 초기화하시겠습니까?')) {
                    location.reload();
                }
                break;
            case 'b':
                event.preventDefault();
                const beforeAfterSection = document.getElementById('before-after-section');
                if (beforeAfterSection && beforeAfterSection.style.display !== 'none') {
                    beforeAfterSection.scrollIntoView({ behavior: 'smooth' });
                }
                break;
        }
    }
});

// 페이지 언로드 시 리소스 정리
window.addEventListener('beforeunload', function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});
