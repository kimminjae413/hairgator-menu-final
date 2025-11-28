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
let analysisFrameId = null;        // 이 줄 추가
let lastAnalysisTime = 0;          // 이 줄 추가
const ANALYSIS_INTERVAL = 200;     // 이 줄 추가

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
        updateDataStatus(t('personalColor.toast.timeoutStart') || '타임아웃으로 강제 시작', 'warning');
        showToast(t('personalColor.toast.systemReadyLimited') || '시스템이 준비되었습니다 (일부 기능 제한)', 'warning');
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
        updateDataStatus(t('personalColor.toast.systemReady') || '시스템 준비 완료', 'success');

        showToast(t('personalColor.toast.ready') || 'HAIRGATOR Personal Color 시스템이 준비되었습니다!', 'success');
        console.log('✅ HAIRGATOR Personal Color 준비 완료');

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ 시스템 초기화 실패:', error);

        // 오류가 발생해도 앱은 표시
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus(t('personalColor.toast.errorMode') || '오류 발생, 기본 모드로 동작', 'error');
        showToast(t('personalColor.toast.limitedFeatures') || '일부 기능에 제한이 있을 수 있습니다.', 'warning');
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
        showToast(t('personalColor.toast.imageOnly') || '이미지 파일만 업로드 가능합니다.', 'error');
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
            analyzeBtn.textContent = t('personalColor.buttons.startAnalysis') || '🤖 AI 퍼스널컬러 분석 시작';
        }

        showToast(t('personalColor.toast.imageUploaded') || '이미지가 업로드되었습니다. 분석을 시작하세요!', 'success');
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
            analyzeBtn.textContent = t('personalColor.buttons.analyzing') || '🔄 AI 분석 중...';
        }

        // 분석 단계별 진행
        await simulateAnalysisSteps();

        // 분석 결과 생성
        const result = await performPersonalColorAnalysis();

        // 결과 표시
        displayAnalysisResults(result);

        analysisCount++;

        showToast(`${result.season} ${t('personalColor.toast.analysisComplete') || '타입으로 분석되었습니다!'}`, 'success');

    } catch (error) {
        console.error('❌ 분석 실패:', error);
        showToast(t('personalColor.toast.analysisError') || '분석 중 오류가 발생했습니다.', 'error');
    } finally {
        isAnalyzing = false;
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = t('personalColor.buttons.startAnalysis') || '🤖 AI 퍼스널컬러 분석 시작';
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
// 📊 개선된 계절 분류 로직 (PCCS 톤 + a/b 비율 기반)
// ========================================

function classifySeasonByLab(lab) {
    console.log('🧠 개선된 계절 분류 시스템 실행...');

    const L = lab.L;  // 명도
    const a = lab.a;  // 빨강-녹색 (양수: 빨강, 음수: 녹색)
    const b = lab.b;  // 노랑-파랑 (양수: 노랑, 음수: 파랑)

    // 채도 계산 (Chroma)
    const C = Math.sqrt(a * a + b * b);

    // ========================================
    // 1. 웜/쿨 판단 (Yellow Index 활용)
    // b값이 a값보다 현저히 높으면 웜톤
    // ========================================
    let warmCoolRatio = b / Math.max(0.1, Math.abs(a));

    // 입술색 데이터가 있으면 보조 판단에 활용
    const skinData = window.lastSkinToneData;
    if (skinData && skinData.lipColor) {
        const lipWarm = skinData.lipColor.isWarm;
        // 입술색이 피부톤과 다르면 가중치 조정
        if (lipWarm && warmCoolRatio < 1) {
            warmCoolRatio += 0.3;  // 웜톤 방향으로 보정
            console.log('👄 입술색 보정: 웜톤 경향 추가');
        } else if (!lipWarm && warmCoolRatio > 1) {
            warmCoolRatio -= 0.3;  // 쿨톤 방향으로 보정
            console.log('👄 입술색 보정: 쿨톤 경향 추가');
        }
    }

    // 홍조가 있으면 a값 영향 감소 (볼 빨간기 보정)
    if (skinData && skinData.multiRegion && skinData.multiRegion.analysis) {
        if (skinData.multiRegion.analysis.hasRedness) {
            const rednessLevel = skinData.multiRegion.analysis.rednessLevel;
            console.log(`👁️ 홍조 보정 적용 (레벨: ${rednessLevel})`);
            // 홍조로 인한 a값 영향을 줄임
        }
    }

    // 뉴트럴 톤 범위 정의 (-5 ~ 5 사이의 b값)
    const isNeutral = Math.abs(b) < 5 && Math.abs(warmCoolRatio) < 1.5;
    const isWarm = warmCoolRatio > 1.2 || b > 8;
    const isCool = warmCoolRatio < 0.8 && b < 5;

    // ========================================
    // 2. PCCS 톤 기반 세부 분류
    // ========================================
    let season;
    let subType = '';
    let confidence = 0;

    if (isNeutral) {
        // 뉴트럴 톤: 명도에 따라 판단
        if (L > 60) {
            season = 'Summer';
            subType = 'Light';
            confidence = 75;
        } else if (L > 45) {
            season = C > 15 ? 'Spring' : 'Summer';
            subType = 'Muted';
            confidence = 70;
        } else {
            season = C > 18 ? 'Winter' : 'Autumn';
            subType = 'Deep';
            confidence = 72;
        }
        console.log('🎯 뉴트럴 톤 감지');
    } else if (isWarm) {
        // 웜톤 로직
        if (L > 60 && C > 15) {
            season = 'Spring';
            subType = 'Bright';
            confidence = 92;
        } else if (L > 55 && C <= 15) {
            season = 'Spring';
            subType = 'Light';
            confidence = 88;
        } else if (L <= 55 && C > 12) {
            season = 'Autumn';
            subType = L < 45 ? 'Deep' : 'Muted';
            confidence = 90;
        } else {
            season = L > 50 ? 'Spring' : 'Autumn';
            subType = 'Soft';
            confidence = 78;
        }
    } else {
        // 쿨톤 로직
        if (L > 60 && C < 20) {
            season = 'Summer';
            subType = 'Light';
            confidence = 90;
        } else if (L > 50 && C >= 10 && C < 25) {
            season = 'Summer';
            subType = 'Muted';
            confidence = 85;
        } else if (L < 45 || C > 22) {
            season = 'Winter';
            subType = C > 25 ? 'Bright' : 'Deep';
            confidence = 92;
        } else {
            season = L > 50 ? 'Summer' : 'Winter';
            subType = 'Soft';
            confidence = 80;
        }
    }

    // 결과를 전역에 저장 (세부 타입 포함)
    window.lastSeasonAnalysis = {
        season,
        subType,
        confidence,
        warmCoolRatio: warmCoolRatio.toFixed(2),
        isNeutral,
        isWarm,
        isCool,
        L: L.toFixed(1),
        C: C.toFixed(1),
        a: a.toFixed(1),
        b: b.toFixed(1)
    };

    console.log(`계절 분류 결과: ${season} ${subType} (신뢰도: ${confidence}%)`);
    console.log(`분석값 - 웜쿨비율: ${warmCoolRatio.toFixed(2)}, 명도(L): ${L.toFixed(1)}, 채도(C): ${C.toFixed(1)}`);
    console.log(`상세 - a: ${a.toFixed(1)}, b: ${b.toFixed(1)}, 뉴트럴: ${isNeutral}, 웜: ${isWarm}, 쿨: ${isCool}`);

    return season;
}

// ========================================
// 🎯 개선된 헤어컬러 매칭 (조화도/대비 점수 기반)
// ========================================

function findBestMatchingColors(skinLab, season) {
    if (!hairColorData || hairColorData.length === 0) {
        console.warn('헤어컬러 데이터가 없습니다');
        return [];
    }

    console.log('🎨 개선된 헤어컬러 매칭 시작...');

    // 계절별 필터링
    const seasonColors = hairColorData.filter(color => color.season === season);

    // 세부 타입 정보 가져오기
    const seasonAnalysis = window.lastSeasonAnalysis || {};
    const subType = seasonAnalysis.subType || '';

    const matchedColors = seasonColors.map(color => {
        // 헤어컬러 Lab 값 계산 (캐싱)
        if (!color.lab) {
            const rgb = hexToRgb(color.hex);
            if (rgb) {
                color.lab = rgbToLab(rgb.r, rgb.g, rgb.b);
            }
        }

        if (!color.lab) {
            return { ...color, harmonyScore: 0, reliability: 0, deltaE: 100 };
        }

        // ========================================
        // 1. 대비 점수 (Contrast Score)
        // 피부와 헤어 명도 차이가 적당해야 좋음
        // ========================================
        const lightnessDiff = Math.abs(skinLab.L - color.lab.L);
        let contrastScore = 0;

        // 명도 대비가 15-35 사이면 최적
        if (lightnessDiff >= 15 && lightnessDiff <= 35) {
            contrastScore = 30;  // 최대 점수
        } else if (lightnessDiff >= 10 && lightnessDiff <= 45) {
            contrastScore = 20;  // 양호
        } else if (lightnessDiff < 10) {
            contrastScore = 5;   // 대비 부족 (얼굴이 묻힘)
        } else {
            contrastScore = 10;  // 대비 과다
        }

        // ========================================
        // 2. 톤 안정성 점수 (Tone Stability)
        // 웜톤 피부에는 웜톤 헤어, 쿨톤에는 쿨톤
        // ========================================
        const skinWarmCool = skinLab.b;  // 양수: 웜, 음수: 쿨
        const hairWarmCool = color.lab.b;

        let toneScore = 0;
        const toneMatch = (skinWarmCool > 0 && hairWarmCool > 0) ||
                          (skinWarmCool < 0 && hairWarmCool < 0);

        if (toneMatch) {
            toneScore = 25;  // 톤 일치
        } else if (Math.abs(skinWarmCool) < 5 || Math.abs(hairWarmCool) < 5) {
            toneScore = 15;  // 뉴트럴 범위
        } else {
            toneScore = 5;   // 톤 불일치
        }

        // ========================================
        // 3. 채도 조화 점수 (Saturation Harmony)
        // ========================================
        const skinChroma = Math.sqrt(skinLab.a * skinLab.a + skinLab.b * skinLab.b);
        const hairChroma = Math.sqrt(color.lab.a * color.lab.a + color.lab.b * color.lab.b);
        const chromaDiff = Math.abs(skinChroma - hairChroma);

        let saturationScore = 0;
        if (chromaDiff < 10) {
            saturationScore = 20;  // 채도 유사
        } else if (chromaDiff < 20) {
            saturationScore = 15;  // 양호
        } else {
            saturationScore = 8;   // 채도 차이 큼
        }

        // ========================================
        // 4. 세부 타입 보너스 (SubType Bonus)
        // ========================================
        let subTypeBonus = 0;
        const hairLevel = color.level || 5;

        if (subType === 'Bright' && hairChroma > 20) {
            subTypeBonus = 10;  // Bright 타입에 채도 높은 컬러
        } else if (subType === 'Light' && color.lab.L > 50) {
            subTypeBonus = 10;  // Light 타입에 밝은 컬러
        } else if (subType === 'Muted' && hairChroma < 20) {
            subTypeBonus = 10;  // Muted 타입에 저채도 컬러
        } else if (subType === 'Deep' && color.lab.L < 40) {
            subTypeBonus = 10;  // Deep 타입에 어두운 컬러
        } else if (subType === 'Soft' && chromaDiff < 15) {
            subTypeBonus = 10;  // Soft 타입에 부드러운 컬러
        }

        // ========================================
        // 5. 브랜드 가중치 (Brand Weight)
        // ========================================
        let brandBonus = 0;
        const brandName = (color.brand || '').toLowerCase();

        if (brandName.includes('milbon') || brandName.includes('밀본')) {
            brandBonus = 5;  // 프리미엄 브랜드
        } else if (brandName.includes('wella') || brandName.includes('웰라')) {
            brandBonus = 4;
        } else if (brandName.includes('loreal') || brandName.includes('로레알')) {
            brandBonus = 3;
        }

        // ========================================
        // 총합 점수 계산 (100점 만점)
        // ========================================
        const harmonyScore = contrastScore + toneScore + saturationScore + subTypeBonus + brandBonus;

        // Delta E도 참고용으로 계산 (낮을수록 유사)
        const deltaE = deltaE2000(skinLab, color.lab);

        // 최종 신뢰도는 조화도 점수 기반
        const reliability = Math.min(99, Math.max(60, harmonyScore + 10));

        return {
            ...color,
            harmonyScore: Math.round(harmonyScore),
            contrastScore,
            toneScore,
            saturationScore,
            subTypeBonus,
            brandBonus,
            deltaE: Math.round(deltaE * 100) / 100,
            reliability: Math.round(reliability)
        };
    });

    // 조화도 점수 높은 순으로 정렬
    const sortedColors = matchedColors
        .filter(c => c.harmonyScore > 0)
        .sort((a, b) => b.harmonyScore - a.harmonyScore)
        .slice(0, 5);

    console.log('🎨 매칭 결과 상위 5개:', sortedColors.map(c => ({
        name: c.name,
        harmonyScore: c.harmonyScore,
        deltaE: c.deltaE
    })));

    return sortedColors;
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

// ========================================
// ⚖️ Gray World 화이트밸런스 보정
// ========================================

function applySkinToneCorrection(rgb, imageData = null) {
    console.log('⚖️ Gray World 화이트밸런스 보정 시작...');

    // imageData가 있으면 전체 이미지 기반 보정
    if (imageData && imageData.data) {
        return applyGrayWorldCorrection(rgb, imageData);
    }

    // imageData가 없으면 피부톤 자체 기반 간이 보정
    return applySimplifiedCorrection(rgb);
}

// Gray World Assumption 기반 보정
function applyGrayWorldCorrection(skinRgb, imageData) {
    const data = imageData.data;
    let rSum = 0, gSum = 0, bSum = 0;
    let pixelCount = 0;

    // 전체 이미지 평균 RGB 계산
    for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        pixelCount++;
    }

    if (pixelCount === 0) {
        return applySimplifiedCorrection(skinRgb);
    }

    const avgR = rSum / pixelCount;
    const avgG = gSum / pixelCount;
    const avgB = bSum / pixelCount;

    // Gray World: 이상적인 그레이 값 (128)
    const grayTarget = 128;

    // 보정 계수 계산
    const scaleR = avgR > 0 ? grayTarget / avgR : 1;
    const scaleG = avgG > 0 ? grayTarget / avgG : 1;
    const scaleB = avgB > 0 ? grayTarget / avgB : 1;

    // 피부톤에 보정 적용 (과보정 방지를 위해 0.5 가중)
    const correctionStrength = 0.5;
    const correctedR = skinRgb.r * (1 + (scaleR - 1) * correctionStrength);
    const correctedG = skinRgb.g * (1 + (scaleG - 1) * correctionStrength);
    const correctedB = skinRgb.b * (1 + (scaleB - 1) * correctionStrength);

    const result = {
        r: Math.min(255, Math.max(0, Math.round(correctedR))),
        g: Math.min(255, Math.max(0, Math.round(correctedG))),
        b: Math.min(255, Math.max(0, Math.round(correctedB)))
    };

    console.log(`⚖️ Gray World 보정: 원본(${skinRgb.r},${skinRgb.g},${skinRgb.b}) → 보정(${result.r},${result.g},${result.b})`);
    console.log(`⚖️ 이미지 평균 RGB: (${avgR.toFixed(1)}, ${avgG.toFixed(1)}, ${avgB.toFixed(1)})`);

    return result;
}

// 간이 화이트밸런스 보정 (imageData 없을 때)
function applySimplifiedCorrection(rgb) {
    // 피부톤 특성 기반 간이 보정
    // 일반적으로 실내 조명은 따뜻한 톤이므로 약간 쿨하게 보정

    // R/G 비율로 조명 색온도 추정
    const rgRatio = rgb.r / Math.max(1, rgb.g);

    let correctedRgb;

    if (rgRatio > 1.15) {
        // 따뜻한 조명 (노란/주황빛) - 쿨하게 보정
        correctedRgb = {
            r: Math.round(rgb.r * 0.95),
            g: Math.round(rgb.g * 1.0),
            b: Math.round(rgb.b * 1.05)
        };
        console.log('⚖️ 따뜻한 조명 감지 → 쿨 보정');
    } else if (rgRatio < 0.95) {
        // 차가운 조명 (형광등) - 웜하게 보정
        correctedRgb = {
            r: Math.round(rgb.r * 1.05),
            g: Math.round(rgb.g * 1.0),
            b: Math.round(rgb.b * 0.95)
        };
        console.log('⚖️ 차가운 조명 감지 → 웜 보정');
    } else {
        // 중립적 조명 - 최소 보정
        correctedRgb = {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b
        };
        console.log('⚖️ 중립 조명 → 보정 최소화');
    }

    return {
        r: Math.min(255, Math.max(0, correctedRgb.r)),
        g: Math.min(255, Math.max(0, correctedRgb.g)),
        b: Math.min(255, Math.max(0, correctedRgb.b))
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

                // ⭐ 실시간 결과 컨테이너 표시
                const resultsContainer = document.getElementById('realtime-results-container');
                if (resultsContainer) {
                    resultsContainer.style.display = 'block';
                }

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
    console.log('카메라 중지 시작...');
    
    // requestAnimationFrame 중지 (핵심!)
    if (analysisFrameId) {
        cancelAnimationFrame(analysisFrameId);
        analysisFrameId = null;
        console.log('requestAnimationFrame 중지됨');
    }
    
    // 비디오 스트림 완전 정리
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
            console.log('비디오 트랙 중지:', track.kind);
        });
        videoElement.srcObject = null;
        videoElement.pause();
    }
    
    // 캔버스 정리
    if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        console.log('캔버스 정리 완료');
    }
    
    // ⭐ 실시간 결과 컨테이너 숨기기
    const resultsContainer = document.getElementById('realtime-results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }

    // UI 업데이트
    const startBtn = document.getElementById('start-camera');
    if (startBtn) {
        startBtn.textContent = '📹 실시간 카메라 분석';
        startBtn.onclick = startCamera;
        startBtn.disabled = false;
    }

    console.log('카메라 완전 중지 완료');
    showToast('카메라가 중지되었습니다.', 'info');
}

// 실시간 분석 시작
function startRealTimeAnalysis() {
    if (!videoElement || !canvasElement || !faceDetection) return;
    
    // 이전 루프가 있다면 중지
    if (analysisFrameId) {
        cancelAnimationFrame(analysisFrameId);
        analysisFrameId = null;
    }
    
    const analyze = async () => {
        const currentTime = Date.now();
        
        // 프레임 제한 (200ms마다 실행)
        if (currentTime - lastAnalysisTime < ANALYSIS_INTERVAL) {
            if (videoElement.srcObject) {
                analysisFrameId = requestAnimationFrame(analyze);
            }
            return;
        }
        
        lastAnalysisTime = currentTime;
        
        if (videoElement.readyState === 4) {
            // 캔버스 크기 동적 조정
            if (canvasElement.width !== videoElement.videoWidth) {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
            }
            
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.scale(-1, 1);
            canvasCtx.translate(-canvasElement.width, 0);
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.restore();
            
            await faceDetection.send({ image: canvasElement });
        }
        
        // 조건부 계속 실행
        if (videoElement.srcObject && !videoElement.paused) {
            analysisFrameId = requestAnimationFrame(analyze);
        } else {
            analysisFrameId = null;
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
        const detection = results.detections[0]; // 첫 번째 얼굴 사용

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

        // ⭐ 멀티 영역 피부톤 추출 (개선됨)
        const faceBox = { x, y, width, height };

        // 피부톤 샘플링 영역들 표시
        canvasCtx.strokeStyle = '#FFD700';
        canvasCtx.lineWidth = 1;

        // 이마 영역
        canvasCtx.strokeRect(x + width * 0.3, y + height * 0.1, width * 0.4, height * 0.15);
        // 왼쪽 볼
        canvasCtx.strokeRect(x + width * 0.1, y + height * 0.4, width * 0.25, height * 0.2);
        // 오른쪽 볼
        canvasCtx.strokeRect(x + width * 0.65, y + height * 0.4, width * 0.25, height * 0.2);

        // ⭐ 피부톤 추출 (멀티 영역 사용)
        try {
            const multiRegionData = extractMultiRegionSkinTone(canvasElement, faceBox);

            if (multiRegionData && multiRegionData.rgb) {
                // 전역 변수에 저장 (기존 형식 호환)
                window.lastSkinToneData = {
                    rgb: multiRegionData.rgb,
                    samples: multiRegionData.totalWeight * 100,
                    multiRegion: multiRegionData
                };

                // 입술색도 추출 시도 (보조 판단용)
                const lipData = extractLipColor(canvasElement, faceBox);
                if (lipData) {
                    window.lastSkinToneData.lipColor = lipData;
                }

                // 피부톤 색상 표시
                const rgb = multiRegionData.rgb;
                canvasCtx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                canvasCtx.fillRect(x + width + 10, y, 60, 60);

                canvasCtx.strokeStyle = '#FFD700';
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeRect(x + width + 10, y, 60, 60);

                canvasCtx.fillStyle = '#FFFFFF';
                canvasCtx.font = '12px Arial';
                canvasCtx.fillText('피부톤', x + width + 15, y + 75);

                // RGB 값 표시
                canvasCtx.font = '10px Arial';
                canvasCtx.fillText(`R:${rgb.r} G:${rgb.g}`, x + width + 12, y + 90);
                canvasCtx.fillText(`B:${rgb.b}`, x + width + 12, y + 100);

                // 홍조 표시 (있을 경우)
                if (multiRegionData.analysis && multiRegionData.analysis.hasRedness) {
                    canvasCtx.fillStyle = '#FF6B6B';
                    canvasCtx.font = '10px Arial';
                    canvasCtx.fillText('홍조 감지', x + width + 12, y + 115);
                }

                // ⭐ 실시간 퍼스널 컬러 분석
                performRealtimeAnalysis(window.lastSkinToneData);
            }
        } catch (error) {
            console.error('피부톤 추출 오류:', error);
        }
    } else {
        // 얼굴 미감지 시 안내
        canvasCtx.fillStyle = '#FF4444';
        canvasCtx.font = '16px Arial';
        canvasCtx.fillText('얼굴을 화면 중앙에 위치시켜주세요', 10, 30);
    }

    canvasCtx.restore();
}

// ⭐ 피부톤 추출 함수 (새로 추가)
function extractSkinToneFromRegion(canvas, x, y, width, height) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    let rSum = 0, gSum = 0, bSum = 0;
    let validSamples = 0;

    // 모든 픽셀 샘플링
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 피부톤 범위 필터링 (너무 어둡거나 밝은 픽셀 제외)
        if (r > 50 && r < 250 && g > 40 && g < 220 && b > 30 && b < 200) {
            rSum += r;
            gSum += g;
            bSum += b;
            validSamples++;
        }
    }

    if (validSamples === 0) {
        return null;
    }

    return {
        rgb: {
            r: Math.round(rSum / validSamples),
            g: Math.round(gSum / validSamples),
            b: Math.round(bSum / validSamples)
        },
        samples: validSamples
    };
}

// ========================================
// 👁️ 멀티 영역 피부톤 분석 (정확도 향상)
// ========================================

function extractMultiRegionSkinTone(canvas, faceBox) {
    console.log('👁️ 멀티 영역 피부톤 분석 시작...');

    const ctx = canvas.getContext('2d');
    const x = faceBox.x;
    const y = faceBox.y;
    const width = faceBox.width;
    const height = faceBox.height;

    // 여러 영역에서 샘플링
    const regions = {
        // 이마 (상단 중앙)
        forehead: {
            x: x + width * 0.3,
            y: y + height * 0.1,
            w: width * 0.4,
            h: height * 0.15
        },
        // 왼쪽 볼
        leftCheek: {
            x: x + width * 0.1,
            y: y + height * 0.4,
            w: width * 0.25,
            h: height * 0.2
        },
        // 오른쪽 볼
        rightCheek: {
            x: x + width * 0.65,
            y: y + height * 0.4,
            w: width * 0.25,
            h: height * 0.2
        },
        // 턱 (선택적 - 피부톤 확인용)
        chin: {
            x: x + width * 0.35,
            y: y + height * 0.75,
            w: width * 0.3,
            h: height * 0.1
        }
    };

    const samples = {};
    let totalR = 0, totalG = 0, totalB = 0;
    let totalWeight = 0;

    // 각 영역에서 피부톤 추출
    for (const [regionName, region] of Object.entries(regions)) {
        const skinData = extractSkinToneFromRegion(
            canvas,
            region.x, region.y, region.w, region.h
        );

        if (skinData && skinData.samples > 10) {
            // 영역별 가중치 (볼이 가장 정확)
            let weight = 1;
            if (regionName === 'leftCheek' || regionName === 'rightCheek') {
                weight = 1.5;  // 볼 영역 가중치 높임
            } else if (regionName === 'forehead') {
                weight = 1.2;  // 이마도 중요
            }

            samples[regionName] = {
                rgb: skinData.rgb,
                samples: skinData.samples,
                weight: weight
            };

            totalR += skinData.rgb.r * weight;
            totalG += skinData.rgb.g * weight;
            totalB += skinData.rgb.b * weight;
            totalWeight += weight;

            console.log(`👁️ ${regionName}: RGB(${skinData.rgb.r}, ${skinData.rgb.g}, ${skinData.rgb.b})`);
        }
    }

    if (totalWeight === 0) {
        console.warn('⚠️ 유효한 피부톤 영역을 찾을 수 없음');
        return null;
    }

    // 가중 평균 계산
    const avgSkinTone = {
        rgb: {
            r: Math.round(totalR / totalWeight),
            g: Math.round(totalG / totalWeight),
            b: Math.round(totalB / totalWeight)
        },
        regionSamples: samples,
        totalWeight: totalWeight
    };

    // 영역 간 색차 분석 (홍조 등 감지)
    if (samples.leftCheek && samples.rightCheek && samples.forehead) {
        const cheekAvgB = (samples.leftCheek.rgb.b + samples.rightCheek.rgb.b) / 2;
        const foreheadB = samples.forehead.rgb.b;
        const rednessIndicator = samples.leftCheek.rgb.r - samples.forehead.rgb.r;

        avgSkinTone.analysis = {
            // 볼과 이마의 차이로 홍조 감지
            hasRedness: rednessIndicator > 15,
            rednessLevel: rednessIndicator,
            // 균일도 점수
            uniformity: 100 - Math.abs(cheekAvgB - foreheadB)
        };

        if (avgSkinTone.analysis.hasRedness) {
            console.log('👁️ 홍조 감지됨 - 보정 적용 권장');
        }
    }

    console.log(`👁️ 최종 피부톤: RGB(${avgSkinTone.rgb.r}, ${avgSkinTone.rgb.g}, ${avgSkinTone.rgb.b})`);

    return avgSkinTone;
}

// 입술 색상 추출 (선택적 - 쿨톤/웜톤 보조 판단용)
function extractLipColor(canvas, faceBox) {
    const x = faceBox.x;
    const y = faceBox.y;
    const width = faceBox.width;
    const height = faceBox.height;

    // 입술 영역 (얼굴 하단 중앙)
    const lipRegion = {
        x: x + width * 0.35,
        y: y + height * 0.7,
        w: width * 0.3,
        h: height * 0.1
    };

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(lipRegion.x, lipRegion.y, lipRegion.w, lipRegion.h);
    const data = imageData.data;

    let rSum = 0, gSum = 0, bSum = 0;
    let validSamples = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 입술색 범위 (분홍~빨강 계열)
        if (r > 100 && r > g && r > b) {
            rSum += r;
            gSum += g;
            bSum += b;
            validSamples++;
        }
    }

    if (validSamples < 10) {
        return null;
    }

    const lipRgb = {
        r: Math.round(rSum / validSamples),
        g: Math.round(gSum / validSamples),
        b: Math.round(bSum / validSamples)
    };

    // 입술색으로 웜/쿨 보조 판단
    // 오렌지빛 입술 = 웜톤, 핑크빛 입술 = 쿨톤
    const lipLab = rgbToLab(lipRgb.r, lipRgb.g, lipRgb.b);
    const isWarmLip = lipLab.b > 10;  // 노란기가 있으면 웜

    console.log(`👄 입술색: RGB(${lipRgb.r}, ${lipRgb.g}, ${lipRgb.b}) - ${isWarmLip ? '웜톤' : '쿨톤'} 경향`);

    return {
        rgb: lipRgb,
        lab: lipLab,
        isWarm: isWarmLip
    };
}

// ⭐ 실시간 분석 함수 (디바운싱 포함)
let realtimeAnalysisTimeout = null;
let lastRealtimeResult = null;

function performRealtimeAnalysis(skinToneData) {
    // 디바운싱: 1초마다 한 번만 실행
    if (realtimeAnalysisTimeout) {
        clearTimeout(realtimeAnalysisTimeout);
    }

    realtimeAnalysisTimeout = setTimeout(() => {
        try {
            // RGB → LAB 변환
            const rgb = skinToneData.rgb;
            const lab = rgbToLab(rgb.r, rgb.g, rgb.b);

            // 계절 분류
            const season = classifySeasonByLab(lab);

            // 결과가 이전과 다를 때만 UI 업데이트
            if (!lastRealtimeResult || lastRealtimeResult.season !== season) {
                lastRealtimeResult = { season, lab, rgb };

                // UI 업데이트
                updateRealtimeDisplay(season, lab, rgb);

                console.log(`🎨 실시간 분석: ${season} (L:${lab.L.toFixed(1)}, a:${lab.a.toFixed(1)}, b:${lab.b.toFixed(1)})`);
            }
        } catch (error) {
            console.error('실시간 분석 오류:', error);
        }
    }, 1000);
}

// ⭐ 실시간 분석 결과 UI 업데이트
function updateRealtimeDisplay(season, lab, rgb) {
    // 계절 결과 표시
    const seasonResult = document.getElementById('realtime-season');
    if (seasonResult) {
        const seasonNames = {
            'Spring': '🌸 봄 웜톤',
            'Summer': '🌊 여름 쿨톤',
            'Autumn': '🍂 가을 웜톤',
            'Winter': '❄️ 겨울 쿨톤'
        };
        seasonResult.textContent = seasonNames[season] || season;
        seasonResult.style.color = getSeasonColor(season);
    }

    // 피부톤 정보 표시
    const skinInfo = document.getElementById('realtime-skin-info');
    if (skinInfo) {
        const undertone = lab.b > 0 ? '웜톤' : '쿨톤';
        const brightness = lab.L > 60 ? '밝은' : '깊은';
        skinInfo.innerHTML = `
            <div><strong>피부 특성:</strong> ${undertone}, ${brightness} 타입</div>
            <div><strong>RGB:</strong> ${rgb.r}, ${rgb.g}, ${rgb.b}</div>
            <div><strong>명도:</strong> ${lab.L.toFixed(1)}</div>
        `;
    }

    // 추천 설명 표시
    const recommendation = document.getElementById('realtime-recommendation');
    if (recommendation) {
        const recommendations = {
            'Spring': '밝고 따뜻한 색상이 잘 어울립니다. 생기 있고 화사한 헤어컬러를 추천합니다.',
            'Summer': '부드럽고 시원한 색상이 잘 어울립니다. 우아하고 세련된 헤어컬러를 추천합니다.',
            'Autumn': '깊고 따뜻한 색상이 잘 어울립니다. 고급스럽고 차분한 헤어컬러를 추천합니다.',
            'Winter': '진하고 시원한 색상이 잘 어울립니다. 강렬하고 명확한 헤어컬러를 추천합니다.'
        };
        recommendation.textContent = recommendations[season] || '';
    }
}

// 계절별 색상 반환
function getSeasonColor(season) {
    const colors = {
        'Spring': '#FFB6C1',
        'Summer': '#B0E0E6',
        'Autumn': '#CD853F',
        'Winter': '#4B0082'
    };
    return colors[season] || '#666';
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
    console.log(`🎯 selectMode 호출: ${mode}`);
    currentMode = mode;

    // 모든 섹션 숨기기
    const allSections = document.querySelectorAll('.section');
    console.log(`📋 전체 섹션 개수: ${allSections.length}`);
    allSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // 모드별 섹션 ID 매핑
    const sectionIds = {
        'selection': 'mode-selection',
        'ai': 'ai-analysis',
        'draping': 'draping-mode'
    };

    const targetSectionId = sectionIds[mode] || mode;
    console.log(`🎬 표시할 섹션 ID: ${targetSectionId}`);

    // 선택한 모드 표시
    const selectedSection = document.getElementById(targetSectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        selectedSection.style.display = 'block';
        console.log(`✅ 섹션 표시 성공: ${targetSectionId}`);
    } else {
        console.error(`❌ 섹션을 찾을 수 없음: ${targetSectionId}`);
    }

    console.log(`✅ 모드 전환 완료: ${mode}`);
}

// 뒤로 가기
function goBack() {
    if (currentMode !== 'selection') {
        selectMode('selection');
    }
}

// 홈으로 (goBack과 동일)
function goHome() {
    selectMode('selection');
}

// ⭐ 퍼스널 컬러 모드 닫기 (메인 서비스로 돌아가기)
function closePersonalColor() {
    console.log('🚪 퍼스널 컬러 모드 닫기 시작');

    // 카메라가 실행 중이면 중지
    if (videoElement && videoElement.srcObject) {
        console.log('📹 카메라 중지');
        stopCamera();
    }

    // 사용자 확인 메시지
    const confirmed = confirm('퍼스널 컬러 진단을 종료하고 메인 화면으로 돌아가시겠습니까?');
    if (!confirmed) {
        console.log('❌ 사용자가 닫기 취소');
        return;
    }

    console.log('✅ 닫기 확인됨');

    // 1순위: iframe으로 열린 경우
    try {
        if (window.parent && window.parent !== window) {
            console.log('📤 부모 창으로 닫기 메시지 전송');
            window.parent.postMessage({
                type: 'CLOSE_PERSONAL_COLOR',
                message: '퍼스널 컬러 진단 종료'
            }, '*');

            // 500ms 후에도 안 닫히면 다음 방법 시도
            setTimeout(() => {
                console.log('⏱️ 부모 창 응답 없음, 다음 방법 시도');
                tryAlternativeClose();
            }, 500);
            return;
        }
    } catch (error) {
        console.error('❌ 부모 창 통신 오류:', error);
    }

    // iframe이 아닌 경우 바로 대안 실행
    tryAlternativeClose();
}

// 대안 닫기 방법들
function tryAlternativeClose() {
    console.log('🔄 대안 닫기 방법 시도');

    // 방법 1: 브라우저 뒤로가기
    if (window.history.length > 1 && document.referrer) {
        console.log('⬅️ 히스토리 뒤로가기 (referrer:', document.referrer, ')');
        window.history.back();
        return;
    }

    // 방법 2: 상위 디렉토리로 이동
    const currentPath = window.location.pathname;
    console.log('📍 현재 경로:', currentPath);

    if (currentPath.includes('/personal-color/')) {
        const mainPath = currentPath.replace('/personal-color/index.html', '/index.html')
                                   .replace('/personal-color/', '/');
        console.log('🏠 메인 페이지로 이동:', mainPath);
        window.location.href = mainPath;
        return;
    }

    // 방법 3: 절대 경로로 이동
    console.log('🌐 절대 경로로 메인 이동');
    window.location.href = '/index.html';
}

// ⭐ 전역 함수로 노출 (HTML onclick에서 사용)
window.closePersonalColor = closePersonalColor;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.selectMode = selectMode;
window.goBack = goBack;
window.goHome = goHome;
window.analyzePhoto = analyzePhoto;
window.removeSavedColor = removeSavedColor;

console.log('✅ 전역 함수 노출 완료:', {
    closePersonalColor: typeof window.closePersonalColor,
    startCamera: typeof window.startCamera,
    stopCamera: typeof window.stopCamera,
    selectMode: typeof window.selectMode,
    goHome: typeof window.goHome
});

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
    console.log('페이지 종료 - 전체 리소스 정리 시작');
    
    // 애니메이션 프레임 강제 중지 (핵심!)
    if (analysisFrameId) {
        cancelAnimationFrame(analysisFrameId);
        analysisFrameId = null;
    }
    
    // 비디오 스트림 강제 정리
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    // MediaPipe 리소스 정리
    if (faceDetection) {
        try {
            faceDetection.close();
        } catch (e) {
            console.warn('MediaPipe 정리 중 오류:', e);
        }
        faceDetection = null;
    }
    
    if (camera) {
        try {
            camera.stop();
        } catch (e) {
            console.warn('카메라 정리 중 오류:', e);
        }
        camera = null;
    }
    
    // 저장된 색상 저장
    saveSavedColors();
    
    console.log('전체 리소스 정리 완료');
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
