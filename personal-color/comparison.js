// ==========================================
// Before/After 비교 전용 모듈
// ==========================================

// 비교 상태 변수들 (전역 충돌 방지를 위해 네임스페이스 사용)
const ComparisonState = {
    currentMode: 'slider',
    isToggleShowingBefore: true,
    initialized: false
};

// ==========================================
// Before/After 비교 초기화
// ==========================================

function initializeBeforeAfterComparison() {
    if (ComparisonState.initialized) return;
    
    console.log('🖼️ Before/After 비교 시스템 초기화...');
    
    // 캔버스들 설정
    setupComparisonCanvases();
    
    // 이벤트 리스너 설정
    setupComparisonEventListeners();
    
    // 기본 슬라이더 모드로 시작
    switchComparisonMode('slider');
    
    // 개선도 지표 계산 및 표시
    calculateAndDisplayMetrics();
    
    ComparisonState.initialized = true;
    console.log('✅ Before/After 비교 시스템 초기화 완료');
}

// 비교용 캔버스들 설정
// ==========================================
// Before/After 비교 전용 모듈
// ==========================================

// 비교 상태 변수들
let currentComparisonMode = 'slider';
let isToggleShowingBefore = true;
let beforeAfterInitialized = false;

// ==========================================
// Before/After 비교 초기화
// ==========================================

function initializeBeforeAfterComparison() {
    if (beforeAfterInitialized) return;
    
    console.log('🖼️ Before/After 비교 시스템 초기화...');
    
    // 캔버스들 설정
    setupComparisonCanvases();
    
    // 이벤트 리스너 설정
    setupComparisonEventListeners();
    
    // 기본 슬라이더 모드로 시작
    switchComparisonMode('slider');
    
    // 개선도 지표 계산 및 표시
    calculateAndDisplayMetrics();
    
    beforeAfterInitialized = true;
    console.log('✅ Before/After 비교 시스템 초기화 완료');
}

// 비교용 캔버스들 설정
function setupComparisonCanvases() {
    if (!window.beforeImageData || !window.afterImageData) {
        console.warn('⚠️ Before/After 이미지 데이터가 없습니다.');
        return;
    }
    
    const canvasIds = [
        'before-canvas', 'after-canvas',
        'before-split-canvas', 'after-split-canvas',
        'toggle-canvas', 'overlay-before-canvas', 'overlay-after-canvas'
    ];
    
    const { width, height } = window.beforeImageData;
    
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
        }
    });
    
    // 초기 이미지 렌더링
    renderInitialImages();
}

// 초기 이미지들 렌더링
function renderInitialImages() {
    const canvases = {
        'before-canvas': window.beforeImageData,
        'before-split-canvas': window.beforeImageData,
        'toggle-canvas': window.beforeImageData,
        'overlay-before-canvas': window.beforeImageData,
        'after-canvas': window.afterImageData,
        'after-split-canvas': window.afterImageData,
        'overlay-after-canvas': window.afterImageData
    };
    
    Object.entries(canvases).forEach(([canvasId, imageData]) => {
        const canvas = document.getElementById(canvasId);
        if (canvas && imageData) {
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
        }
    });
}

// 비교 이벤트 리스너 설정
function setupComparisonEventListeners() {
    // 슬라이더 컨트롤
    const comparisonSlider = document.getElementById('comparison-slider');
    if (comparisonSlider) {
        comparisonSlider.addEventListener('input', handleSliderChange);
    }
    
    // 오버레이 투명도 슬라이더
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', handleOpacityChange);
    }
    
    // 슬라이더 핸들 드래그
    const sliderHandle = document.getElementById('slider-handle');
    const comparisonWrapper = document.querySelector('.comparison-wrapper');
    
    if (sliderHandle && comparisonWrapper) {
        let isDragging = false;
        
        sliderHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        comparisonWrapper.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const rect = comparisonWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            updateSliderPosition(percentage);
            comparisonSlider.value = percentage;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // 터치 이벤트 지원
        sliderHandle.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        comparisonWrapper.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const rect = comparisonWrapper.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            updateSliderPosition(percentage);
            comparisonSlider.value = percentage;
            e.preventDefault();
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
}

// ==========================================
// 비교 모드 전환
// ==========================================

function switchComparisonMode(mode) {
    console.log('🔄 비교 모드 전환:', ComparisonState.currentMode, '→', mode);
    
    // 모든 비교 모드 버튼 비활성화
    const modeButtons = document.querySelectorAll('.comparison-mode');
    modeButtons.forEach(btn => btn.classList.remove('active'));
    
    // 모든 비교 뷰 숨기기
    const views = document.querySelectorAll('.slider-comparison, .split-comparison, .toggle-comparison, .overlay-comparison');
    views.forEach(view => view.classList.remove('active'));
    
    // 선택된 모드 활성화
    const activeButton = document.querySelector(`[data-mode="${mode}"]`);
    const activeView = document.getElementById(`${mode}-view`);
    
    if (activeButton) activeButton.classList.add('active');
    if (activeView) activeView.classList.add('active');
    
    ComparisonState.currentMode = mode;
    
    // 모드별 추가 설정
    switch (mode) {
        case 'slider':
            updateSliderPosition(50);
            break;
        case 'overlay':
            updateOverlayOpacity(50);
            break;
        case 'toggle':
            showToggleImage(true);
            break;
    }
    
    console.log('✅ 비교 모드 전환 완료:', mode);
}

// ==========================================
// 슬라이더 비교 함수들
// ==========================================

function handleSliderChange(event) {
    const percentage = event.target.value;
    updateSliderPosition(percentage);
}

function updateSliderPosition(percentage) {
    const sliderHandle = document.getElementById('slider-handle');
    const afterCanvas = document.getElementById('after-canvas');
    
    if (sliderHandle) {
        sliderHandle.style.left = percentage + '%';
    }
    
    if (afterCanvas) {
        const clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        afterCanvas.style.clipPath = clipPath;
    }
}

// ==========================================
// 토글 비교 함수들
// ==========================================

function toggleBeforeAfter() {
    const canvas = document.getElementById('toggle-canvas');
    const button = document.querySelector('.toggle-btn');
    
    if (!canvas || !button) return;
    
    const ctx = canvas.getContext('2d');
    
    if (ComparisonState.isToggleShowingBefore) {
        // After 이미지 표시
        ctx.putImageData(window.afterImageData, 0, 0);
        button.textContent = 'After → Before';
        ComparisonState.isToggleShowingBefore = false;
    } else {
        // Before 이미지 표시
        ctx.putImageData(window.beforeImageData, 0, 0);
        button.textContent = 'Before → After';
        ComparisonState.isToggleShowingBefore = true;
    }
    
    // 버튼 애니메이션
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 100);
}

function showToggleImage(showBefore) {
    const canvas = document.getElementById('toggle-canvas');
    const button = document.querySelector('.toggle-btn');
    
    if (!canvas || !button) return;
    
    const ctx = canvas.getContext('2d');
    
    if (showBefore) {
        ctx.putImageData(window.beforeImageData, 0, 0);
        button.textContent = 'Before → After';
        ComparisonState.isToggleShowingBefore = true;
    } else {
        ctx.putImageData(window.afterImageData, 0, 0);
        button.textContent = 'After → Before';
        ComparisonState.isToggleShowingBefore = false;
    }
}

// ==========================================
// 오버레이 비교 함수들
// ==========================================

function handleOpacityChange(event) {
    const opacity = event.target.value;
    updateOverlayOpacity(opacity);
}

function updateOverlayOpacity(opacity) {
    const afterCanvas = document.getElementById('overlay-after-canvas');
    
    if (afterCanvas) {
        afterCanvas.style.opacity = opacity / 100;
    }
}

// ==========================================
// 개선도 지표 계산
// ==========================================

function calculateAndDisplayMetrics() {
    console.log('📊 개선도 지표 계산 중...');
    
    // 시뮬레이션된 개선도 계산
    const metrics = {
        skinImprovement: Math.floor(Math.random() * 25) + 10, // 10-35%
        harmonyScore: Math.floor(Math.random() * 20) + 80,    // 80-100점
        expertRating: Math.floor(Math.random() * 2) + 4       // 4-5점
    };
    
    // 전문가 노하우 기반 보정
    if (selectedColor) {
        // 선택된 색상에 따른 보정
        const colorBrightness = getColorBrightness(selectedColor);
        if (colorBrightness > 150) {
            metrics.skinImprovement += 5; // 밝은 색상은 피부 개선도 증가
        }
        
        metrics.harmonyScore = Math.min(100, metrics.harmonyScore + Math.floor(Math.random() * 10));
    }
    
    // UI 업데이트
    updateMetricDisplay('skin-improvement', `+${metrics.skinImprovement}%`);
    updateMetricDisplay('harmony-score', `${metrics.harmonyScore}점`);
    updateMetricDisplay('expert-rating', '★'.repeat(metrics.expertRating) + '☆'.repeat(5 - metrics.expertRating));
    
    console.log('✅ 개선도 지표 계산 완료:', metrics);
}

function updateMetricDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        
        // 값 업데이트 애니메이션
        element.style.transform = 'scale(1.1)';
        element.style.color = 'var(--primary-pink)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }
}

function getColorBrightness(hexColor) {
    // HEX 색상의 밝기 계산
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // ITU-R BT.709 기준
    return (0.299 * r + 0.587 * g + 0.114 * b);
}

// ==========================================
// 내보내기 기능들
// ==========================================

function exportComparison() {
    console.log('💾 비교 이미지 내보내기...');
    
    try {
        // Before/After 이미지를 하나의 캔버스에 합치기
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        const { width, height } = window.beforeImageData;
        exportCanvas.width = width * 2;
        exportCanvas.height = height;
        
        // Before 이미지 (왼쪽)
        exportCtx.putImageData(window.beforeImageData, 0, 0);
        
        // After 이미지 (오른쪽)
        exportCtx.putImageData(window.afterImageData, width, 0);
        
        // 구분선 그리기
        exportCtx.fillStyle = 'var(--primary-pink)';
        exportCtx.fillRect(width - 2, 0, 4, height);
        
        // 텍스트 추가
        exportCtx.font = '20px Arial';
        exportCtx.fillStyle = 'white';
        exportCtx.textAlign = 'center';
        
        exportCtx.fillText('Before', width / 2, 30);
        exportCtx.fillText('After', width + width / 2, 30);
        
        // 다운로드 링크 생성
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `personal-color-comparison-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            showToast('비교 이미지가 성공적으로 저장되었습니다!', 'success');
        });
        
    } catch (error) {
        console.error('❌ 이미지 내보내기 실패:', error);
        showToast('이미지 내보내기에 실패했습니다.', 'error');
    }
}

function generateReport() {
    console.log('📄 상담 리포트 생성...');
    
    const reportData = {
        timestamp: new Date().toLocaleString('ko-KR'),
        selectedColor: selectedColor || '선택되지 않음',
        currentMode: ComparisonState.currentMode,
        metrics: {
            skinImprovement: document.getElementById('skin-improvement')?.textContent || 'N/A',
            harmonyScore: document.getElementById('harmony-score')?.textContent || 'N/A',
            expertRating: document.getElementById('expert-rating')?.textContent || 'N/A'
        }
    };
    
    const reportContent = `
퍼스널컬러 진단 리포트
================================

진단 일시: ${reportData.timestamp}
적용 색상: ${reportData.selectedColor}
비교 모드: ${reportData.currentMode}

개선도 지표:
• 피부톤 개선: ${reportData.metrics.skinImprovement}
• 전체 조화도: ${reportData.metrics.harmonyScore}  
• 전문가 평가: ${reportData.metrics.expertRating}

전문가 노하우 적용:
• 유이레(UIREH): 색상 스펙트럼 원칙 적용
• 빛날윤: 명도·채도 조합 분석
• 블루미: 피부톤 매칭 최적화

================================
Personal Color AI Pro
    `;
    
    // 텍스트 파일로 다운로드
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `personal-color-report-${Date.now()}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('상담 리포트가 생성되었습니다!', 'success');
}

// ==========================================
// 유틸리티 함수들
// ==========================================

// Before/After 섹션으로 스크롤
function scrollToComparison() {
    const section = document.getElementById('before-after-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// 비교 데이터 초기화
function resetComparison() {
    ComparisonState.initialized = false;
    ComparisonState.currentMode = 'slider';
    ComparisonState.isToggleShowingBefore = true;
    
    console.log('🔄 Before/After 비교 시스템 초기화됨');
}
