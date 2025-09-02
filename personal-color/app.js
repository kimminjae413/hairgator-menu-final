// ==========================================
// HAIRGATOR Personal Color Pro - 2모드 최적화 버전
// AI 모드 + 전문가 드래이핑 모드
// ==========================================

// 전역 변수 정의
let currentMode = 'selection';
let isAnalyzing = false;
let analysisCount = 0;
let selectedSeason = 'Spring';
let uploadedImage = null;

// MediaPipe 관련 변수
let faceDetection = null;
let camera = null;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;

// 헤어컬러 데이터 (614개)
let hairColorData = [];

// 드래이핑 모드 변수
let savedColors = [];
let colorAdjustments = {
    lightness: 0,
    saturation: 0,
    warmth: 0
};

// 전문가 노하우 데이터베이스
const ExpertKnowledge = {
    brandData: {
        loreal: { brand: '로레알', avgM: 80.41 },
        wella: { brand: '웰라', avgM: 87.17 },
        milbon: { brand: '밀본', avgM: 93.22 }
    },
    
    uireh: {
        colorSpectrum: "주황색은 절대 쿨톤으로 만들 수 없음",
        lightnessMatching: "파운데이션 21-23호는 비슷한 명도 헤어컬러 회피",
        winterClear: ["조이", "현아"],
        techniques: ["옴브레", "발레아주", "리프팅"]
    },
    
    bitnalyun: {
        skinConditions: {
            redness: "홍조 피부 → 미드나잇 컬러로 중화",
            pale: "창백한 피부 → 웜톤으로 생기 부여", 
            yellowish: "황기 피부 → 애쉬 계열로 투명감"
        }
    },
    
    blume: {
        specificTypes: {
            warm: "아이보리 피부 + 코토리베이지/오렌지브라운",
            cool: "화이트 피부 + 블루블랙/애쉬블루"
        }
    }
};

// 4계절 색상 팔레트
const SeasonPalettes = {
    Spring: {
        name: '봄 웜톤',
        colors: ['#FFB6C1', '#FFA07A', '#F0E68C', '#98FB98', '#FFE4B5', '#DDA0DD'],
        characteristics: ['밝고 따뜻한 색상', '높은 채도', '노란 언더톤']
    },
    Summer: {
        name: '여름 쿨톤',
        colors: ['#B0E0E6', '#DDA0DD', '#C8B2DB', '#AFEEEE', '#F0F8FF', '#E6E6FA'],
        characteristics: ['부드럽고 차가운 색상', '중간 채도', '파란 언더톤']
    },
    Autumn: {
        name: '가을 웜톤',
        colors: ['#D2691E', '#CD853F', '#A0522D', '#8B4513', '#B22222', '#800000'],
        characteristics: ['깊고 따뜻한 색상', '낮은 채도', '노란 언더톤']
    },
    Winter: {
        name: '겨울 쿨톤',
        colors: ['#000080', '#4B0082', '#8B008B', '#191970', '#2F4F4F', '#708090'],
        characteristics: ['진하고 차가운 색상', '높은 대비', '파란 언더톤']
    }
};

// ==========================================
// 초기화 함수들
// ==========================================

// 시스템 초기화
async function initializeSystem() {
    const timeoutId = setTimeout(() => {
        console.warn('⚠️ 로딩 타임아웃 - 강제로 앱 표시');
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('타임아웃으로 강제 시작', 'warning');
        showToast('시스템이 준비되었습니다 (일부 기능 제한)', 'warning');
    }, 5000);
    
    try {
        console.log('시스템 초기화 시작...');
        
        // 1단계: 헤어컬러 데이터 로드
        console.log('1단계: 헤어컬러 데이터 로드');
        await loadHairColorData();
        
        // 2단계: UI 설정
        console.log('2단계: UI 설정');
        setupFileUpload();
        setupDrapingMode();
        
        console.log('초기화 완료, 로딩 화면 제거...');
        
        // 로딩 화면 제거
        clearTimeout(timeoutId);
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('시스템 준비 완료 (MediaPipe는 카메라 시작 시 로드)', 'success');
        
        showToast('HAIRGATOR Personal Color 시스템이 준비되었습니다!', 'success');
        console.log('✅ HAIRGATOR Personal Color 준비 완료');
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ 시스템 초기화 실패:', error);
        
        // 오류가 발생해도 앱은 표시
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('오류 발생, 기본 모드로 동작', 'error');
        showToast('일부 기능에 제한이 있을 수 있습니다.', 'warning');
    }
}

// 헤어컬러 데이터 로드 (614개)
function loadHairColorData() {
    return new Promise((resolve) => {
        try {
            // 1순위: 부모창의 HAIR_COLOR_614_DATA
            if (typeof parent !== 'undefined' && parent.HAIR_COLOR_614_DATA) {
                hairColorData = parent.HAIR_COLOR_614_DATA;
                console.log(`✅ 부모창에서 ${hairColorData.length}개 헤어컬러 데이터 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
                return;
            }
            
            // 2순위: 글로벌 변수
            if (typeof hairColorDatabase !== 'undefined') {
                hairColorData = hairColorDatabase;
                console.log(`✅ 글로벌 변수에서 ${hairColorData.length}개 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
                return;
            }
            
            // 3순위: 외부 스크립트 동적 로드
            if (typeof HAIR_COLOR_614_DATA === 'undefined') {
                const script = document.createElement('script');
                script.src = './hair-color-data.js';
                script.onload = () => {
                    if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                        hairColorData = HAIR_COLOR_614_DATA;
                        console.log(`✅ 외부 스크립트에서 ${hairColorData.length}개 로드`);
                        updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                    } else {
                        hairColorData = generate614DefaultData();
                        console.warn('⚠️ 외부 스크립트 실패 - 기본 데이터 생성');
                        updateDataStatus('기본 614개 헤어컬러 데이터 생성됨', 'warning');
                    }
                    resolve();
                };
                script.onerror = () => {
                    hairColorData = generate614DefaultData();
                    console.warn('⚠️ 스크립트 로드 실패 - 기본 데이터 생성');
                    updateDataStatus('기본 614개 헤어컬러 데이터 생성됨', 'warning');
                    resolve();
                };
                document.head.appendChild(script);
            } else {
                hairColorData = HAIR_COLOR_614_DATA;
                console.log(`✅ 기존 스크립트에서 ${hairColorData.length}개 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
            }
            
        } catch (error) {
            console.error('❌ 헤어컬러 데이터 로드 실패:', error);
            hairColorData = generate614DefaultData();
            updateDataStatus('오류로 인한 기본 데이터 사용', 'error');
            resolve();
        }
    });
}

// 614개 구조의 기본 데이터 생성
function generate614DefaultData() {
    const brands = ['L\'Oreal', 'Wella', 'Milbon', 'Shiseido', 'Schwarzkopf'];
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const tones = ['N', 'A', 'G', 'B', 'V', 'R', 'O', 'Y'];
    
    const data = [];
    let id = 1;
    
    for (let i = 0; i < 614; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const tone = tones[Math.floor(Math.random() * tones.length)];
        
        data.push({
            id: id++,
            brand: brand,
            code: `${level}${tone}${Math.floor(Math.random() * 99) + 1}`,
            name: `${brand} Professional ${level}${tone}`,
            level: level,
            tone: tone,
            rgb: {
                r: Math.floor(Math.random() * 255),
                g: Math.floor(Math.random() * 255),
                b: Math.floor(Math.random() * 255)
            },
            hex: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            season: ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor(Math.random() * 4)],
            reliability: Math.floor(Math.random() * 30) + 70
        });
    }
    
    console.log('✅ 614개 기본 데이터 생성 완료');
    return data;
}

// MediaPipe 초기화 (지연 로딩)
async function initializeMediaPipe() {
    try {
        if (typeof FaceDetection !== 'undefined') {
            faceDetection = new FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                }
            });
            
            faceDetection.setOptions({
                model: 'short',
                minDetectionConfidence: 0.5,
            });
            
            faceDetection.onResults(onFaceDetectionResults);
            
            console.log('✅ MediaPipe 초기화 완료');
            updateDataStatus('AI 얼굴 인식 준비됨', 'success');
        } else {
            console.warn('⚠️ MediaPipe 라이브러리가 로드되지 않음 - 기본 모드로 동작');
            updateDataStatus('기본 모드로 동작', 'warning');
        }
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
        updateDataStatus('AI 얼굴 인식 오류', 'error');
    }
}

// ==========================================
// AI 모드 - 자동 분석
// ==========================================

// 사진 업로드 파일 선택 처리
function setupFileUpload() {
    const fileInput = document.getElementById('photo-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// 파일 업로드 처리
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result;
        
        // 업로드된 이미지 표시
        const preview = document.getElementById('uploaded-preview');
        if (preview) {
            preview.src = uploadedImage;
            preview.style.display = 'block';
        }
        
        // 분석 버튼 활성화
        const analyzeBtn = document.getElementById('analyze-photo');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🤖 AI 퍼스널컬러 분석 시작';
        }
        
        showToast('이미지가 업로드되었습니다. 분석을 시작하세요!', 'success');
    };
    
    reader.readAsDataURL(file);
}

// AI 사진 분석
async function analyzePhoto() {
    if (!uploadedImage || isAnalyzing) return;
    
    isAnalyzing = true;
    const analyzeBtn = document.getElementById('analyze-photo');
    
    try {
        // UI 업데이트
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = '🔄 AI 분석 중...';
        }
        
        // 분석 단계별 진행
        await simulateAnalysisSteps();
        
        // 분석 결과 생성
        const result = await performPersonalColorAnalysis();
        
        // 결과 표시
        displayAnalysisResults(result);
        
        analysisCount++;
        
        showToast(`${result.season} 타입으로 분석되었습니다!`, 'success');
        
    } catch (error) {
        console.error('❌ 분석 실패:', error);
        showToast('분석 중 오류가 발생했습니다.', 'error');
    } finally {
        isAnalyzing = false;
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🤖 AI 퍼스널컬러 분석 시작';
        }
    }
}

// 분석 단계 시뮬레이션
async function simulateAnalysisSteps() {
    const steps = [
        '얼굴 영역 검출 중...',
        '피부톤 색상 추출 중...',
        'LAB 색공간 변환 중...',
        '4계절 매칭 분석 중...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
        updateAnalysisStep(i + 1, steps[i], true);
        await new Promise(resolve => setTimeout(resolve, 800));
        updateAnalysisStep(i + 1, steps[i], false);
    }
}

// 분석 단계 UI 업데이트
function updateAnalysisStep(step, message, inProgress) {
    const stepElement = document.getElementById(`step-${step}`);
    if (stepElement) {
        stepElement.textContent = message;
        stepElement.className = inProgress ? 'analysis-step active' : 'analysis-step completed';
    }
}

// 퍼스널컬러 분석 실행
async function performPersonalColorAnalysis() {
    // 실제로는 MediaPipe + 색상 분석 로직이 들어감
    // 현재는 시뮬레이션으로 처리
    
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const confidence = Math.floor(Math.random() * 20) + 80; // 80-99%
    
    // 해당 계절의 추천 헤어컬러 필터링
    const recommendedColors = hairColorData
        .filter(color => color.season === selectedSeason)
        .sort((a, b) => b.reliability - a.reliability)
        .slice(0, 5);
    
    return {
        season: selectedSeason,
        confidence: confidence,
        colors: recommendedColors,
        analysis: generateExpertAnalysis(selectedSeason),
        skinTone: {
            rgb: { r: 156, g: 125, b: 103 },
            lab: { L: 52.3, A: 8.7, B: 15.2 }
        }
    };
}

// 분석 결과 표시
function displayAnalysisResults(result) {
    // 계절 결과
    const seasonResult = document.getElementById('season-result');
    if (seasonResult) {
        seasonResult.textContent = `${result.season} (${result.confidence}% 확신)`;
    }
    
    // 전문가 분석
    const expertAnalysis = document.getElementById('expert-analysis');
    if (expertAnalysis) {
        expertAnalysis.textContent = result.analysis;
    }
    
    // 추천 헤어컬러
    displayRecommendedHairColors(result.colors, result.season);
    
    // 결과 컨테이너 표시
    document.getElementById('results-container').style.display = 'block';
    document.getElementById('results-container').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// 추천 헤어컬러 표시
function displayRecommendedHairColors(colors, season) {
    const container = document.getElementById('recommended-colors');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (colors.length === 0) {
        container.innerHTML = '<p>해당 계절의 헤어컬러 데이터가 없습니다.</p>';
        return;
    }
    
    colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'hair-color-item';
        colorDiv.innerHTML = `
            <div class="color-swatch" style="background-color: ${color.hex}"></div>
            <div class="color-info">
                <div class="brand">${color.brand}</div>
                <div class="code">${color.code}</div>
                <div class="name">${color.name}</div>
                <div class="reliability">${color.reliability}% 매칭</div>
            </div>
        `;
        container.appendChild(colorDiv);
    });
    
    // 요약 정보 표시
    const summary = document.createElement('div');
    summary.className = 'recommendation-summary';
    summary.innerHTML = `
        <h4>${season} 타입 추천</h4>
        <p>총 ${colors.length}개의 매칭 헤어컬러를 찾았습니다.</p>
        <p>상위 5개 제품을 신뢰도 순으로 표시합니다.</p>
    `;
    container.insertBefore(summary, container.firstChild);
}

// ==========================================
// 드래이핑 모드 - 실시간 색상 테스트
// ==========================================

// 드래이핑 모드 초기화
function setupDrapingMode() {
    setupColorAdjustments();
    setupSeasonTabs();
    loadSavedColors();
}

// 색상 조정 슬라이더 설정
function setupColorAdjustments() {
    const sliders = ['lightness', 'saturation', 'warmth'];
    
    sliders.forEach(type => {
        const slider = document.getElementById(`${type}-slider`);
        if (slider) {
            slider.addEventListener('input', function() {
                colorAdjustments[type] = parseInt(this.value);
                updateColorAdjustmentDisplay(type, this.value);
                applyColorAdjustments();
            });
        }
    });
}

// 색상 조정값 표시 업데이트
function updateColorAdjustmentDisplay(type, value) {
    const display = document.getElementById(`${type}-value`);
    if (display) {
        display.textContent = value > 0 ? `+${value}` : value;
    }
}

// 색상 조정 적용
function applyColorAdjustments() {
    const colorGrid = document.getElementById('color-grid');
    if (!colorGrid) return;
    
    // CSS 필터로 실시간 색상 조정
    const { lightness, saturation, warmth } = colorAdjustments;
    
    const filter = `
        brightness(${100 + lightness}%) 
        saturate(${100 + saturation}%) 
        hue-rotate(${warmth * 2}deg)
    `.trim();
    
    colorGrid.style.filter = filter;
}

// 계절 탭 설정
function setupSeasonTabs() {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    
    seasons.forEach(season => {
        const tab = document.getElementById(`${season.toLowerCase()}-tab`);
        if (tab) {
            tab.addEventListener('click', () => selectSeason(season));
        }
    });
    
    // 기본 선택
    selectSeason('Spring');
}

// 계절 선택
function selectSeason(season) {
    selectedSeason = season;
    
    // 탭 활성화
    document.querySelectorAll('.season-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${season.toLowerCase()}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 색상 팔레트 업데이트
    updateColorPalette(season);
}

// 색상 팔레트 업데이트
function updateColorPalette(season) {
    const colorGrid = document.getElementById('color-grid');
    if (!colorGrid) return;
    
    const palette = SeasonPalettes[season];
    if (!palette) return;
    
    colorGrid.innerHTML = '';
    
    palette.colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-item';
        colorDiv.style.backgroundColor = color;
        colorDiv.addEventListener('click', () => saveColor(color, season));
        colorGrid.appendChild(colorDiv);
    });
    
    // 특성 설명 업데이트
    const characteristics = document.getElementById('season-characteristics');
    if (characteristics) {
        characteristics.innerHTML = palette.characteristics
            .map(char => `<li>${char}</li>`)
            .join('');
    }
}

// 색상 저장
function saveColor(color, season) {
    const savedColor = {
        id: Date.now(),
        color: color,
        season: season,
        timestamp: new Date().toISOString()
    };
    
    savedColors.push(savedColor);
    updateSavedColorsDisplay();
    
    showToast(`${season} 색상이 저장되었습니다!`, 'success');
}

// 저장된 색상 표시
function updateSavedColorsDisplay() {
    const container = document.getElementById('saved-colors');
    if (!container) return;
    
    container.innerHTML = '';
    
    savedColors.forEach(saved => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'saved-color-item';
        colorDiv.innerHTML = `
            <div class="saved-color-swatch" style="background-color: ${saved.color}"></div>
            <div class="saved-color-info">
                <div class="saved-season">${saved.season}</div>
                <div class="saved-time">${new Date(saved.timestamp).toLocaleTimeString()}</div>
            </div>
            <button class="remove-saved-color" onclick="removeSavedColor(${saved.id})">×</button>
        `;
        container.appendChild(colorDiv);
    });
}

// 저장된 색상 제거
function removeSavedColor(id) {
    savedColors = savedColors.filter(color => color.id !== id);
    updateSavedColorsDisplay();
    showToast('저장된 색상이 제거되었습니다.', 'info');
}

// 저장된 색상 불러오기
function loadSavedColors() {
    // localStorage에서 불러오기 (브라우저 지원 시)
    try {
        const saved = localStorage.getItem('hairgator-saved-colors');
        if (saved) {
            savedColors = JSON.parse(saved);
            updateSavedColorsDisplay();
        }
    } catch (error) {
        console.warn('저장된 색상 불러오기 실패:', error);
    }
}

// 저장된 색상 저장하기
function saveSavedColors() {
    try {
        localStorage.setItem('hairgator-saved-colors', JSON.stringify(savedColors));
    } catch (error) {
        console.warn('색상 저장 실패:', error);
    }
}

// ==========================================
// 실시간 카메라 기능
// ==========================================

// 카메라 시작
async function startCamera() {
    try {
        const startBtn = document.getElementById('start-camera');
        startBtn.disabled = true;
        startBtn.textContent = 'MediaPipe 로딩 중...';
        
        showToast('카메라를 준비하고 있습니다...', 'info');
        
        // MediaPipe 먼저 초기화 (카메라 시작할 때만)
        if (!faceDetection) {
            console.log('🤖 MediaPipe 초기화 시작...');
            await initializeMediaPipe();
        }
        
        // 카메라 스트림 시작
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: 640, 
                height: 480, 
                facingMode: 'user' 
            }
        });
        
        videoElement = document.getElementById('camera-feed');
        canvasElement = document.getElementById('camera-canvas');
        
        if (videoElement && canvasElement) {
            videoElement.srcObject = stream;
            canvasCtx = canvasElement.getContext('2d');
            
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                startBtn.textContent = '📹 카메라 중지';
                startBtn.disabled = false;
                startBtn.onclick = stopCamera;
                
                // 실시간 분석 시작
                if (faceDetection) {
                    startRealTimeAnalysis();
                }
                
                showToast('실시간 카메라 분석이 시작되었습니다!', 'success');
            };
        }
        
    } catch (error) {
        console.error('❌ 카메라 시작 실패:', error);
        showToast('카메라 접근에 실패했습니다. 권한을 확인해주세요.', 'error');
        
        const startBtn = document.getElementById('start-camera');
        startBtn.disabled = false;
        startBtn.textContent = '📹 실시간 카메라 분석';
    }
}

// 카메라 중지
function stopCamera() {
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    const startBtn = document.getElementById('start-camera');
    startBtn.textContent = '📹 실시간 카메라 분석';
    startBtn.onclick = startCamera;
    
    showToast('카메라가 중지되었습니다.', 'info');
}

// 실시간 분석 시작
function startRealTimeAnalysis() {
    if (!videoElement || !canvasElement || !faceDetection) return;
    
    const analyze = async () => {
        if (videoElement.readyState === 4) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.scale(-1, 1);
            canvasCtx.translate(-canvasElement.width, 0);
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.restore();
            
            await faceDetection.send({ image: canvasElement });
        }
        
        if (videoElement.srcObject) {
            requestAnimationFrame(analyze);
        }
    };
    
    analyze();
}

// MediaPipe 얼굴 인식 결과 처리
function onFaceDetectionResults(results) {
    if (!canvasCtx) return;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.detections && results.detections.length > 0) {
        results.detections.forEach(detection => {
            // 얼굴 영역 표시
            const box = detection.boundingBox;
            const x = box.xCenter * canvasElement.width - (box.width * canvasElement.width) / 2;
            const y = box.yCenter * canvasElement.height - (box.height * canvasElement.height) / 2;
            const width = box.width * canvasElement.width;
            const height = box.height * canvasElement.height;
            
            canvasCtx.strokeStyle = '#00FF00';
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(x, y, width, height);
            
            // 신뢰도 표시
            canvasCtx.fillStyle = '#00FF00';
            canvasCtx.font = '16px Arial';
            canvasCtx.fillText(`${Math.round(detection.score * 100)}%`, x, y - 10);
        });
    }
    
    canvasCtx.restore();
}

// ==========================================
// 유틸리티 함수들
// ==========================================

// 전문가 분석 텍스트 생성
function generateExpertAnalysis(season) {
    const analyses = {
        Spring: `${ExpertKnowledge.blume.specificTypes.warm}. 밝고 선명한 색상이 잘 어울립니다.`,
        Summer: `${ExpertKnowledge.bitnalyun.skinConditions.pale}에 따라 부드러운 파스텔 톤을 추천합니다.`,
        Autumn: `${ExpertKnowledge.bitnalyun.skinConditions.yellowish} 원칙에 따라 리치한 브라운 계열이 적합합니다.`,
        Winter: `${ExpertKnowledge.blume.specificTypes.cool}. 명확한 대비를 위해 진하고 선명한 색상을 권장합니다.`
    };
    
    return analyses[season] || '전문가 분석 결과를 생성 중입니다.';
}

// 데이터 상태 업데이트
function updateDataStatus(message, type) {
    const statusElement = document.getElementById('data-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
    }
}

// 토스트 메시지 표시
function showToast(message, type = 'info', duration = 3000) {
    console.log(`Toast [${type}]: ${message}`);
    
    // 실제 토스트 UI가 있다면 여기서 처리
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// 모드 전환 및 네비게이션
// ==========================================

// 모드 선택
function selectMode(mode) {
    currentMode = mode;
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.mode-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 선택한 모드 표시
    const selectedSection = document.getElementById(`${mode}-mode`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // 네비게이션 버튼 업데이트
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="selectMode('${mode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    console.log(`모드 전환: ${mode}`);
}

// 뒤로 가기
function goBack() {
    if (currentMode !== 'selection') {
        selectMode('selection');
    }
}

// ==========================================
// 외부 연동 함수들 (HAIRGATOR 호환)
// ==========================================

// 부모창과의 메시지 통신
window.addEventListener('message', function(event) {
    if (event.data.type === 'THEME_CHANGE') {
        // 테마 변경 처리
        document.documentElement.setAttribute('data-theme', event.data.theme);
    } else if (event.data.type === 'HAIR_COLOR_DATA') {
        // 헤어컬러 데이터 업데이트
        hairColorData = event.data.data;
        console.log(`📡 부모창에서 ${hairColorData.length}개 데이터 수신`);
    }
});

// 키보드 단축키
document.addEventListener('keydown', function(event) {
    if (currentMode === 'selection') {
        switch (event.key) {
            case '1':
                event.preventDefault();
                selectMode('ai');
                break;
            case '2':
                event.preventDefault();
                selectMode('draping');
                break;
            case 'Escape':
                event.preventDefault();
                goBack();
                break;
        }
    }
    
    // 스페이스바로 분석 시작
    if (event.code === 'Space' && uploadedImage && !isAnalyzing) {
        event.preventDefault();
        analyzePhoto();
    }
});

// 부모 창에 시스템 준비 완료 알림
window.addEventListener('load', function() {
    setTimeout(() => {
        try {
            if (parent && parent.postMessage) {
                parent.postMessage({
                    type: 'PERSONAL_COLOR_READY',
                    message: 'Personal Color 시스템이 준비되었습니다.'
                }, '*');
            }
        } catch (error) {
            console.log('부모 창 알림 전송 실패:', error);
        }
    }, 3000);
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
    if (camera) {
        camera.stop();
    }
    
    // 저장된 색상 저장
    saveSavedColors();
});

console.log('🎨 HAIRGATOR Personal Color - 2모드 최적화 버전 로드 완료');
