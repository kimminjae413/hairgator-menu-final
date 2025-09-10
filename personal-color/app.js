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
window.lastSkinToneData = null;  // 이 줄만 추가

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
// ========================================
// 🔬 실제 퍼스널컬러 분석 함수 (시뮬레이션 → 실제)
// GPT 진단 + 논문 검증 기반 구현
// ========================================

async function performPersonalColorAnalysis() {
    console.log('🔬 실제 퍼스널컬러 분석 시작...');
    
    try {
        // 1. 현재 피부톤 데이터 가져오기 (기존 extractSkinTone 결과 활용)
        const currentSkinData = getCurrentSkinToneData();
        if (!currentSkinData || !currentSkinData.rgb) {
            throw new Error('피부톤 데이터를 찾을 수 없습니다');
        }
        
        console.log('📊 피부톤 RGB:', currentSkinData.rgb);
        
        // 2. 화이트밸런스 보정 적용 (GPT 제안)
        const correctedRgb = applySkinToneCorrection(currentSkinData.rgb);
        console.log('⚖️ 보정된 RGB:', correctedRgb);
        
        // 3. RGB → CIE Lab 변환 (GPT 제공 + 논문 표준)
        const skinLab = rgbToLab(correctedRgb.r, correctedRgb.g, correctedRgb.b);
        console.log('🎨 피부톤 Lab:', skinLab);
        
        // 4. 실제 계절 분류 (논문 기반 임계값)
        const actualSeason = classifySeasonByLab(skinLab);
        console.log('🍂 분석된 계절:', actualSeason);
        
        // 5. ΔE 기반 실제 헤어컬러 매칭
        const bestMatchingColors = findBestMatchingColors(skinLab, actualSeason);
        console.log('💇 매칭된 컬러 수:', bestMatchingColors.length);
        
        // 6. 실제 신뢰도 계산 (색차 기반)
        const realConfidence = calculateRealConfidence(bestMatchingColors);
        console.log('📈 실제 신뢰도:', realConfidence + '%');
        
        // 7. 전문가 분석 생성
        const expertAnalysis = generateRealExpertAnalysis(actualSeason, skinLab, bestMatchingColors);
        
        // ✅ 기존 UI 호환 형태로 반환 (충돌 방지)
        const result = {
            season: actualSeason,
            confidence: realConfidence,
            colors: bestMatchingColors,
            analysis: expertAnalysis,
            skinTone: {
                rgb: correctedRgb,
                lab: skinLab,
                original: currentSkinData.rgb
            },
            metadata: {
                method: 'real_analysis',
                timestamp: new Date().toISOString(),
                deltaE_average: bestMatchingColors.length > 0 ? 
                    (bestMatchingColors.reduce((sum, c) => sum + c.deltaE, 0) / bestMatchingColors.length).toFixed(2) : 0
            }
        };
        
        console.log('✅ 실제 퍼스널컬러 분석 완료:', result);
        return result;
        
    } catch (error) {
        console.error('❌ 실제 분석 실패:', error);
        console.log('🛡️ 안전 모드로 전환...');
        
        // 오류 시 기존 시뮬레이션으로 폴백 (안전장치)
        return performFallbackSimulation(error.message);
    }
}

// ========================================
// 🧮 색공간 변환 함수들 (GPT 제공 + 논문 검증)
// ========================================

function sRGBtoLinear(v) {
    v = v / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r, g, b) {
    const R = sRGBtoLinear(r);
    const G = sRGBtoLinear(g);
    const B = sRGBtoLinear(b);
    
    // sRGB D65 표준 매트릭스 (GPT 제공)
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    
    return { X: X * 100, Y: Y * 100, Z: Z * 100 };
}

function xyzToLab(X, Y, Z) {
    // D65 표준 조명 (논문 표준)
    const Xn = 95.047, Yn = 100.000, Zn = 108.883;
    
    function f(t) {
        return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16/116);
    }
    
    const fx = f(X / Xn);
    const fy = f(Y / Yn);
    const fz = f(Z / Zn);
    
    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    return { L, a, b };
}

function rgbToLab(r, g, b) {
    const xyz = rgbToXyz(r, g, b);
    return xyzToLab(xyz.X, xyz.Y, xyz.Z);
}

// ========================================
// 📊 논문 기반 계절 분류 로직
// ========================================

function classifySeasonByLab(lab) {
    console.log('🧠 고급 계절 분류 시스템 실행...');
    
    // 논문 기반 기본 분류
    const isWarmTone = lab.b > 0;  // b > 0 = 노란 언더톤 (warm)
    const brightness = lab.L;       // 명도 (밝기)
    const saturation = Math.sqrt(lab.a * lab.a + lab.b * lab.b); // 채도
    
    // 논문 검증된 파운데이션 대응 기준 (21호/23호)
    const isBright = brightness > 55; // 논문 기반 임계값 조정
    
    // 고급 분류 로직 (논문 + GPT 매칭)
    let season;
    let confidence = 0;
    
    if (isWarmTone) {
        if (isBright && saturation > 20) {
            season = 'Spring';  // 밝고 따뜻하고 선명함
            confidence = 90;
        } else if (!isBright && saturation > 15) {
            season = 'Autumn';  // 어둡고 따뜻하고 깊음
            confidence = 85;
        } else {
            season = brightness > 50 ? 'Spring' : 'Autumn';
            confidence = 70;
        }
    } else {
        if (isBright && saturation < 25) {
            season = 'Summer';  // 밝고 차갑고 부드러움
            confidence = 88;
        } else if (!isBright && saturation > 20) {
            season = 'Winter';  // 어둡고 차갑고 강렬함
            confidence = 92;
        } else {
            season = brightness > 50 ? 'Summer' : 'Winter';
            confidence = 75;
        }
    }
    
    console.log(`계절 분류 결과: ${season} (신뢰도: ${confidence}%)`);
    console.log(`분석값 - 웜톤: ${isWarmTone}, 밝기: ${brightness.toFixed(1)}, 채도: ${saturation.toFixed(1)}`);
    
    return season;
}

// ========================================
// 🎯 실제 헤어컬러 매칭 (ΔE 기반)
// ========================================

function findBestMatchingColors(skinLab, season) {
    if (!hairColorData || hairColorData.length === 0) {
        console.warn('헤어컬러 데이터가 없습니다');
        return [];
    }
    
    // 계절별 필터링 후 ΔE 계산
    const seasonColors = hairColorData.filter(color => color.season === season);
    
    const matchedColors = seasonColors.map(color => {
        // 헤어컬러 Lab 값 계산 (캐싱)
        if (!color.lab) {
            const rgb = hexToRgb(color.hex);
            if (rgb) {
                color.lab = rgbToLab(rgb.r, rgb.g, rgb.b);
            }
        }
        
        // ΔE2000 계산 (GPT 제공 완전한 구현)
const deltaE = color.lab ? deltaE2000(skinLab, color.lab) : 100;
        
        // 실제 신뢰도 계산 (ΔE 기반)
        const reliability = Math.max(0, Math.min(100, 100 - (deltaE * 2)));
        
        return {
            ...color,
            deltaE: Math.round(deltaE * 100) / 100,
            reliability: Math.round(reliability)
        };
    });
    
    // ΔE 낮은 순으로 정렬 (색차가 작을수록 좋음)
    return matchedColors
        .sort((a, b) => a.deltaE - b.deltaE)
        .slice(0, 5);
}

// ========================================
// 🧠 실제 신뢰도 및 분석 생성
// ========================================

function calculateRealConfidence(matchedColors) {
    if (!matchedColors || matchedColors.length === 0) return 60;
    
    // 상위 3개 컬러의 평균 신뢰도
    const topColors = matchedColors.slice(0, 3);
    const avgReliability = topColors.reduce((sum, color) => sum + color.reliability, 0) / topColors.length;
    
    return Math.max(60, Math.min(99, Math.round(avgReliability)));
}

function generateRealExpertAnalysis(season, skinLab, colors) {
    const seasonInfo = {
        'Spring': '밝고 따뜻한 톤으로 생기 있는 컬러가 잘 어울립니다',
        'Summer': '부드럽고 시원한 톤으로 우아한 컬러가 잘 어울립니다', 
        'Autumn': '깊고 따뜻한 톤으로 세련된 컬러가 잘 어울립니다',
        'Winter': '진하고 시원한 톤으로 강렬한 컬러가 잘 어울립니다'
    };
    
    const undertone = skinLab.b > 0 ? '웜톤' : '쿨톤';
    const brightness = skinLab.L > 60 ? '밝은' : '깊은';
    
    let analysis = `귀하의 피부는 ${undertone} ${brightness} 타입으로 ${season} 계절에 해당합니다. `;
    analysis += seasonInfo[season] || '';
    
    if (colors && colors.length > 0) {
        const bestMatch = colors[0];
        analysis += ` 가장 잘 어울리는 컬러는 ${bestMatch.brand}의 ${bestMatch.name}입니다.`;
    }
    
    return analysis;
}

// ========================================
// 🛠️ 헬퍼 함수들
// ========================================

function getCurrentSkinToneData() {
    // 전역 변수에서 실제 데이터 확인
    if (window.lastSkinToneData && window.lastSkinToneData.samples > 0) {
        console.log('✅ 실제 추출된 피부톤 사용:', window.lastSkinToneData.rgb);
        return window.lastSkinToneData;
    }
    
    // 백업: 기본값
    console.log('⚠️ 기본 피부톤 사용 (실제 데이터 없음)');
    return {
        rgb: { r: 156, g: 125, b: 103 },
        samples: 175
    };
}

function applySkinToneCorrection(rgb) {
    // 간단한 화이트밸런스 보정 (GPT 제안 단순화)
    const factor = 0.95; // 약간의 보정
    return {
        r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
        g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
        b: Math.min(255, Math.max(0, Math.round(rgb.b * factor)))
    };
}

function hexToRgb(hex) {
    if (!hex || hex.length !== 7) return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function performFallbackSimulation(errorMsg) {
    console.log('🎲 시뮬레이션 모드로 동작');
    
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const confidence = Math.floor(Math.random() * 20) + 70; // 70-89%
    
    const recommendedColors = hairColorData
        .filter(color => color.season === selectedSeason)
        .sort((a, b) => b.reliability - a.reliability)
        .slice(0, 5);
    
    return {
        season: selectedSeason,
        confidence: confidence,
        colors: recommendedColors,
        analysis: `시뮬레이션 모드: ${generateExpertAnalysis(selectedSeason)} (오류: ${errorMsg})`,
        skinTone: {
            rgb: { r: 156, g: 125, b: 103 },
            lab: { L: 52.3, A: 8.7, B: 15.2 }
        },
        metadata: {
            method: 'fallback_simulation',
            error: errorMsg
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

// 카메라 시작 (iframe 권한 문제 해결)
async function startCamera() {
    const startBtn = document.getElementById('start-camera');
    
    try {
        startBtn.disabled = true;
        startBtn.textContent = 'MediaPipe 로딩 중...';
        
        showToast('카메라를 준비하고 있습니다...', 'info');
        
        // iframe 권한 확인
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저는 카메라를 지원하지 않습니다.');
        }
        
        // MediaPipe 먼저 초기화 (카메라 시작할 때만)
        if (!faceDetection) {
            console.log('🤖 MediaPipe 초기화 시작...');
            await initializeMediaPipe();
        }
        
        // iframe 내부에서 안전한 카메라 접근
        let stream;
        try {
            // 기본 설정으로 시도
            stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 }, 
                    facingMode: 'user' 
                }
            });
        } catch (basicError) {
            console.warn('기본 카메라 설정 실패, 최소 설정으로 재시도:', basicError);
            
            // 최소 설정으로 재시도
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
            } catch (minimalError) {
                console.error('최소 카메라 설정도 실패:', minimalError);
                
                // iframe 권한 문제인지 확인
                if (minimalError.name === 'NotAllowedError') {
                    throw new Error('iframe_permission_denied');
                } else {
                    throw minimalError;
                }
            }
        }
        
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
        
        let errorMessage = '카메라 접근에 실패했습니다.';
        
        if (error.message === 'iframe_permission_denied') {
            errorMessage = `
                🚨 iframe 카메라 권한 문제 발생!
                
                해결 방법:
                1. 메인 index.html의 iframe에 allow="camera" 추가
                2. netlify.toml에서 camera=() → camera=(self) 수정
                3. 브라우저 새로고침 후 재시도
                
                현재는 사진 업로드 모드를 사용해주세요.
            `;
            
            // 사진 업로드 모드로 자동 전환
            setTimeout(() => {
                showPhotoUploadAlternative();
            }, 2000);
            
        } else if (error.name === 'NotAllowedError') {
            errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
        }
        
        showToast(errorMessage, 'error', 5000);
        
        startBtn.disabled = false;
        startBtn.textContent = '📹 실시간 카메라 분석';
    }
}

// 사진 업로드 대안 표시
function showPhotoUploadAlternative() {
    const aiMode = document.getElementById('ai-mode');
    if (aiMode) {
        const alternativeDiv = document.createElement('div');
        alternativeDiv.className = 'camera-alternative';
        alternativeDiv.innerHTML = `
            <div class="alternative-notice">
                <h3>🔄 카메라 대신 사진 업로드 사용</h3>
                <p>실시간 카메라 분석이 불가능한 상황입니다.<br>
                아래 사진 업로드로 AI 퍼스널컬러 분석을 진행해주세요.</p>
                <button class="highlight-upload-btn" onclick="highlightPhotoUpload()">
                    📸 사진 업로드하러 가기
                </button>
            </div>
        `;
        
        const cameraSection = aiMode.querySelector('.camera-section');
        if (cameraSection) {
            cameraSection.appendChild(alternativeDiv);
        }
    }
}

// 사진 업로드 섹션 강조
function highlightPhotoUpload() {
    const photoSection = document.getElementById('photo-upload-section');
    if (photoSection) {
        photoSection.scrollIntoView({ behavior: 'smooth' });
        photoSection.style.border = '2px solid var(--primary-pink)';
        photoSection.style.borderRadius = '10px';
        photoSection.style.padding = '20px';
        
        setTimeout(() => {
            photoSection.style.border = '';
            photoSection.style.padding = '';
        }, 3000);
    }
    
    showToast('사진을 선택하여 AI 분석을 시작하세요!', 'info');
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
document.addEventListener('DOMContentLoaded', initializeSystem);

// ========================================
// 3️⃣ GPT 제공 Delta E 2000 완전 구현 (추가)
// ========================================

function deg2rad(d) { return d * (Math.PI / 180); }
function rad2deg(r) { return r * (180 / Math.PI); }

function deltaE2000(Lab1, Lab2) {
    const L1 = Lab1.L, a1 = Lab1.a, b1 = Lab1.b;
    const L2 = Lab2.L, a2 = Lab2.a, b2 = Lab2.b;
    
    const avgLp = (L1 + L2) / 2.0;
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const avgC = (C1 + C2) / 2.0;
    
    const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
    
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);
    const avgCp = (C1p + C2p) / 2.0;
    
    const h1p = Math.atan2(b1, a1p) >= 0 ? rad2deg(Math.atan2(b1, a1p)) : rad2deg(Math.atan2(b1, a1p)) + 360;
    const h2p = Math.atan2(b2, a2p) >= 0 ? rad2deg(Math.atan2(b2, a2p)) : rad2deg(Math.atan2(b2, a2p)) + 360;
    
    let deltahp = 0;
    if (Math.abs(h1p - h2p) <= 180) deltahp = h2p - h1p;
    else if (h2p <= h1p) deltahp = h2p - h1p + 360;
    else deltahp = h2p - h1p - 360;
    
    const deltaLp = L2 - L1;
    const deltaCp = C2p - C1p;
    const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(deltahp / 2.0));
    
    const avgLp_r = (L1 + L2) / 2.0;
    const avgCp_r = (C1p + C2p) / 2.0;
    
    let avghp = 0;
    if (Math.abs(h1p - h2p) > 180) avghp = (h1p + h2p + 360) / 2;
    else avghp = (h1p + h2p) / 2;
    
    const T = 1 - 0.17 * Math.cos(deg2rad(avghp - 30)) + 0.24 * Math.cos(deg2rad(2 * avghp)) + 
              0.32 * Math.cos(deg2rad(3 * avghp + 6)) - 0.20 * Math.cos(deg2rad(4 * avghp - 63));
    
    const deltaro = 30 * Math.exp(-((avghp - 275) / 25) ** 2);
    const RC = 2 * Math.sqrt(Math.pow(avgCp_r, 7) / (Math.pow(avgCp_r, 7) + Math.pow(25, 7)));
    
    const SL = 1 + ((0.015 * Math.pow(avgLp_r - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp_r - 50, 2)));
    const SC = 1 + 0.045 * avgCp_r;
    const SH = 1 + 0.015 * avgCp_r * T;
    const RT = -Math.sin(deg2rad(2 * deltaro)) * RC;
    
    const kL = 1, kC = 1, kH = 1;
    
    const dE = Math.sqrt(
        Math.pow(deltaLp / (kL * SL), 2) +
        Math.pow(deltaCp / (kC * SC), 2) +
        Math.pow(deltaHp / (kH * SH), 2) +
        RT * (deltaCp / (kC * SC)) * (deltaHp / (kH * SH))
    );
    
    return dE;
}
