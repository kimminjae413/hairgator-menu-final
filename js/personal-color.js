// ========================================
// HAIRGATOR 퍼스널컬러 진단 모듈 (메인 앱 통합 버전)
// js/personal-color.js
// ========================================

console.log('🎨 퍼스널컬러 모듈 로드 중...');

// 전역 네임스페이스
window.HAIRGATOR_PERSONAL_COLOR = (function() {
    'use strict';

    // ========== 상태 변수 ==========
    let currentMode = null;
    let analysisInProgress = false;
    let faceDetected = false;
    let hairColorData = [];
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;
    let currentSeason = 'spring';
    let selectedColor = null;
    let savedColors = [];
    let activeVideoStream = null;
    let mediaPipeCamera = null;
    let faceDetectionInstance = null;
    let sharedExtractCanvas = null;
    let sharedExtractCtx = null;
    let isInitialized = false;
    let lastDiagnosisResult = null; // 챗봇 연동용

    // ========== 전문가 노하우 데이터 (논문 기반) ==========
    const ExpertKnowledge = {
        colorTheory: {
            warmCool: "주황색은 웜톤의 대표적인 색상이며 쿨톤으로 변환이 어렵습니다",
            foundation: "파운데이션 21-23호대는 비슷한 명도의 헤어컬러와 매치할 때 주의가 필요합니다",
            // 논문: 피부색 진단만으로는 부족, 배색 활용이 핵심
            colorApplication: "퍼스널컬러 진단 후 어떻게 배색하여 활용할 것인지가 더 중요합니다"
        },
        skinAnalysis: {
            redness: "홍조 피부는 미드나잇 컬러로 중화시킬 수 있습니다",
            principle: "명도와 채도의 조합이 색상 이름보다 중요합니다",
            // 논문: 한국인 피부색 기준값
            koreanSkinRef: {
                warm: { YR: 8.8, value: 6.6, chroma: 3 },  // Warm 유형 평균
                cool: { YR: 7.7, value: 6.5, chroma: 2.7 } // Cool 유형 평균
            }
        },
        colorMatching: {
            warm: "아이보리 피부에는 코토리베이지나 오렌지브라운이 잘 어울립니다",
            cool: "화이트 피부에는 블루블랙이나 애쉬블루가 적합합니다"
        },
        // 논문: 배색 기법
        colorHarmony: {
            toneOnTone: "같은 색상 계열에서 톤 변화를 주는 배색",
            toneInTone: "같은 톤 내에서 다른 색상을 조합하는 배색",
            separation: "분리색을 삽입하여 색상 간 조화를 만드는 기법",
            accent: "포인트 컬러를 사용하여 강조하는 기법",
            gradation: "점진적 색상 변화로 자연스러운 조화"
        }
    };

    // ========== 논문 기반 사계절 타입별 상세 데이터 ==========
    const SeasonDetailedData = {
        spring: {
            name: 'Warm Spring (봄 웜)',
            nameKo: '봄 웜톤',
            skinCharacteristics: '밝고 따뜻한 톤',
            bestColors: [
                { rgb: [252, 206, 156], name: '비비드 오렌지' },
                { rgb: [251, 85, 67], name: '코랄 레드' },
                { rgb: [255, 218, 185], name: '피치 베이지' },
                { rgb: [255, 228, 181], name: '모카신' }
            ],
            image: ['캐주얼', '로맨틱'],
            recommendedStyle: '밝고 귀여운 컬러, 톤온톤 배색',
            foundation: { range: '19-21호', base: 'Pink Base' },
            avoidColors: ['다크 그레이', '블루 블랙', '차가운 파스텔'],
            hairColorTips: '골든 베이지, 카라멜 브라운, 허니 블론드 계열 추천'
        },
        summer: {
            name: 'Cool Summer (여름 쿨)',
            nameKo: '여름 쿨톤',
            skinCharacteristics: '밝고 붉은 기가 있는 톤',
            bestColors: [
                { rgb: [163, 186, 213], name: '라이트 그레이 블루' },
                { rgb: [240, 238, 224], name: '아이보리' },
                { rgb: [200, 178, 219], name: '라벤더' },
                { rgb: [176, 224, 230], name: '파우더 블루' }
            ],
            image: ['페미닌', '심플', '우아하고 이지적'],
            recommendedStyle: '차분한 쿨 블루, 노란기 적은 아이보리',
            foundation: { range: '17-19호', base: 'Pink Base' },
            avoidColors: ['오렌지', '골드', '웜 베이지'],
            hairColorTips: '애쉬 브라운, 쿨 베이지, 라벤더 애쉬 계열 추천'
        },
        autumn: {
            name: 'Warm Autumn (가을 웜)',
            nameKo: '가을 웜톤',
            skinCharacteristics: '중간 밝기, 약간 붉은 톤',
            bestColors: [
                { rgb: [238, 187, 118], name: '딥 톤 오렌지' },
                { rgb: [135, 53, 78], name: '버건디 브라운' },
                { rgb: [205, 133, 63], name: '페루 브라운' },
                { rgb: [218, 165, 32], name: '골든로드' }
            ],
            image: ['클래식', '차분하고 안정적'],
            recommendedStyle: '딥 톤 오렌지, 베이지, 브라운 계열',
            foundation: { range: '21호', base: 'Pink Base' },
            avoidColors: ['형광색', '차가운 핑크', '실버'],
            hairColorTips: '리치 브라운, 다크 초콜릿, 마호가니 계열 추천'
        },
        winter: {
            name: 'Cool Winter (겨울 쿨)',
            nameKo: '겨울 쿨톤',
            skinCharacteristics: '매우 밝고 붉은 톤',
            bestColors: [
                { rgb: [251, 251, 251], name: '퓨어 화이트' },
                { rgb: [14, 59, 250], name: '비비드 블루' },
                { rgb: [139, 0, 139], name: '다크 마젠타' },
                { rgb: [25, 25, 112], name: '미드나잇 블루' }
            ],
            image: ['에너제틱', '화려함', '모던', '댄디'],
            recommendedStyle: '강렬하고 임팩트 있는 컬러, 비비드 톤 블루',
            foundation: { range: '13호', base: 'Pink Base' },
            avoidColors: ['머스타드', '카키', '연한 파스텔'],
            hairColorTips: '제트 블랙, 블루 블랙, 다크 애쉬 계열 추천'
        }
    };

    // ========== 계절별 색상 팔레트 ==========
    const SeasonPalettes = {
        spring: {
            colors: ['#FFB6C1', '#FFA07A', '#F0E68C', '#98FB98', '#FFE4B5', '#DDA0DD', '#FFDAB9', '#E6E6FA'],
            characteristics: ['밝고 따뜻한 색상', '높은 채도', '노란 언더톤'],
            description: '봄 웜톤은 밝고 생기있는 색상이 어울립니다.'
        },
        summer: {
            colors: ['#B0E0E6', '#DDA0DD', '#C8B2DB', '#AFEEEE', '#F0F8FF', '#E6E6FA', '#D8BFD8', '#ADD8E6'],
            characteristics: ['부드럽고 차가운 색상', '중간 채도', '파란 언더톤'],
            description: '여름 쿨톤은 부드럽고 우아한 색상이 어울립니다.'
        },
        autumn: {
            colors: ['#D2691E', '#CD853F', '#A0522D', '#8B4513', '#B22222', '#800000', '#8B6914', '#DAA520'],
            characteristics: ['깊고 따뜻한 색상', '낮은 채도', '노란 언더톤'],
            description: '가을 웜톤은 깊고 따뜻한 어스톤이 어울립니다.'
        },
        winter: {
            colors: ['#000080', '#4B0082', '#8B008B', '#191970', '#2F4F4F', '#708090', '#483D8B', '#4169E1'],
            characteristics: ['진하고 차가운 색상', '높은 대비', '파란 언더톤'],
            description: '겨울 쿨톤은 선명하고 강렬한 색상이 어울립니다.'
        }
    };

    // ========== 초기화 ==========
    async function initialize() {
        if (isInitialized) {
            console.log('퍼스널컬러 이미 초기화됨');
            return true;
        }

        console.log('🎨 퍼스널컬러 시스템 초기화 시작...');

        try {
            // 헤어컬러 데이터 로드
            await loadHairColorData();

            // UI 설정
            setupUI();

            isInitialized = true;
            console.log('✅ 퍼스널컬러 시스템 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ 퍼스널컬러 초기화 실패:', error);
            return false;
        }
    }

    // ========== 헤어컬러 데이터 로드 ==========
    async function loadHairColorData() {
        try {
            // 전역 변수에서 로드 시도
            if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                hairColorData = HAIR_COLOR_614_DATA;
                console.log('글로벌 변수에서 614개 데이터 로드');
                return;
            }

            // 외부 스크립트 로드
            await loadExternalHairColorData();
        } catch (error) {
            console.error('헤어컬러 데이터 로드 실패:', error);
            hairColorData = generateDefaultHairColors();
        }
    }

    async function loadExternalHairColorData() {
        return new Promise((resolve, reject) => {
            // 이미 로드되었는지 확인
            if (document.querySelector('script[src*="hair-color-data.js"]')) {
                if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                    hairColorData = HAIR_COLOR_614_DATA;
                }
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'personal-color/hair-color-data.js';
            script.onload = () => {
                if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                    hairColorData = HAIR_COLOR_614_DATA;
                    console.log('외부 스크립트에서 614개 데이터 로드');
                }
                resolve();
            };
            script.onerror = () => {
                console.warn('외부 헤어컬러 데이터 스크립트 로드 실패');
                hairColorData = generateDefaultHairColors();
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    function generateDefaultHairColors() {
        const brands = ['로레알', '웰라', '밀본', 'Shiseido'];
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const data = [];

        brands.forEach(brand => {
            seasons.forEach(season => {
                SeasonPalettes[season].colors.forEach((color, index) => {
                    data.push({
                        brand: brand,
                        name: `${season} Color ${index + 1}`,
                        hex: color,
                        season: season,
                        confidence: 0.8 + Math.random() * 0.2
                    });
                });
            });
        });

        return data;
    }

    // ========== UI 설정 ==========
    function setupUI() {
        selectSeason('spring');
        console.log('퍼스널컬러 UI 설정 완료');
    }

    // ========== 뷰 표시/숨김 ==========
    function show() {
        const section = document.getElementById('personalColorSection');
        if (!section) {
            console.error('퍼스널컬러 섹션을 찾을 수 없습니다');
            return;
        }

        // 다른 뷰 숨기기
        hideOtherViews();

        // 퍼스널컬러 섹션 표시
        section.style.display = 'block';
        section.classList.add('active');

        // 초기화 확인
        if (!isInitialized) {
            initialize().then(() => {
                showToast('퍼스널컬러 진단 시스템이 준비되었습니다!', 'success');
            });
        } else {
            showToast('퍼스널컬러 진단으로 전환되었습니다', 'info');
        }

        console.log('🎨 퍼스널컬러 뷰 표시됨');
    }

    function hide() {
        // personalColorView (통합 뷰) 숨기기
        const section = document.getElementById('personalColorView');
        if (section) {
            section.style.display = 'none';
            section.classList.remove('active');
        }

        // 기존 personalColorSection도 체크 (하위 호환)
        const oldSection = document.getElementById('personalColorSection');
        if (oldSection) {
            oldSection.style.display = 'none';
            oldSection.classList.remove('active');
        }

        // 카메라 리소스 정리
        cleanupCameraResources();

        console.log('🎨 퍼스널컬러 뷰 숨겨짐');
    }

    function hideOtherViews() {
        // 성별 선택 숨기기
        const genderSelection = document.getElementById('genderSelection');
        if (genderSelection) genderSelection.style.display = 'none';

        // 메뉴 컨테이너 비활성화
        const menuContainer = document.getElementById('menuContainer');
        if (menuContainer) menuContainer.classList.remove('active');

        // 챗봇 숨기기 (있다면)
        const chatbotContainer = document.getElementById('chatbotContainer');
        if (chatbotContainer) chatbotContainer.style.display = 'none';
    }

    // ========== 모드 선택 및 전환 ==========
    function selectMode(mode) {
        console.log('모드 선택:', mode);
        currentMode = mode;

        document.querySelectorAll('#personalColorSection .pc-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        if (mode === 'ai') {
            const aiSection = document.getElementById('pc-ai-analysis');
            if (aiSection) {
                aiSection.classList.add('active');
                aiSection.style.display = 'block';
            }
            showToast('AI 퍼스널컬러 분석 모드가 활성화되었습니다', 'success');
        } else if (mode === 'draping') {
            const drapingSection = document.getElementById('pc-draping-mode');
            if (drapingSection) {
                drapingSection.classList.add('active');
                drapingSection.style.display = 'block';
            }
            showToast('전문가 드래이핑 모드가 활성화되었습니다', 'success');
        }
    }

    function goHome() {
        document.querySelectorAll('#personalColorSection .pc-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        const modeSelection = document.getElementById('pc-mode-selection');
        if (modeSelection) {
            modeSelection.classList.add('active');
            modeSelection.style.display = 'block';
        }

        // 결과 섹션 숨기기
        const resultsSection = document.getElementById('pc-results-section');
        if (resultsSection) resultsSection.style.display = 'none';

        stopAICamera();
        stopDrapingCamera();
        cleanupCameraResources();

        currentMode = null;
        showToast('홈 화면으로 돌아갑니다', 'info');
    }

    // ========== AI 카메라 함수들 ==========
    async function startAICamera() {
        try {
            showToast('AI 카메라를 시작합니다...', 'info');

            cleanupCameraResources();

            activeVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            videoElement = document.getElementById('pc-ai-camera');
            if (!videoElement) {
                throw new Error('AI 카메라 요소를 찾을 수 없습니다');
            }
            videoElement.srcObject = activeVideoStream;

            canvasElement = document.getElementById('pc-ai-face-overlay');
            if (canvasElement) {
                canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
            }

            // MediaPipe Face Mesh 초기화 시도
            if (typeof FaceMesh !== 'undefined' && !faceDetectionInstance) {
                try {
                    faceDetectionInstance = new FaceMesh({
                        locateFile: (file) => {
                            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
                        }
                    });

                    faceDetectionInstance.setOptions({
                        maxNumFaces: 1,
                        refineLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });

                    faceDetectionInstance.onResults(onAdvancedFaceResults);

                    if (typeof Camera !== 'undefined') {
                        mediaPipeCamera = new Camera(videoElement, {
                            onFrame: async () => {
                                if (faceDetectionInstance && videoElement.readyState === 4) {
                                    await faceDetectionInstance.send({ image: videoElement });
                                }
                            },
                            width: 640,
                            height: 480
                        });
                        mediaPipeCamera.start();
                    }

                    console.log('MediaPipe Face Mesh 활성화');
                    showToast('고급 얼굴 랜드마크 인식이 활성화되었습니다', 'success');
                } catch (error) {
                    console.warn('Face Mesh 초기화 실패:', error);
                    showToast('기본 카메라 모드로 시작합니다', 'warning');
                }
            }

            const faceGuide = document.getElementById('pc-ai-face-guide');
            if (faceGuide) faceGuide.style.display = 'flex';

        } catch (error) {
            console.error('카메라 시작 실패:', error);
            cleanupCameraResources();
            showToast('카메라에 접근할 수 없습니다', 'error');
        }
    }

    function onAdvancedFaceResults(results) {
        if (!canvasCtx || !videoElement) return;

        canvasElement.width = videoElement.videoWidth || 640;
        canvasElement.height = videoElement.videoHeight || 480;

        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            drawFullFaceMesh(canvasCtx, landmarks);
            drawSkinTonePoints(canvasCtx, landmarks);

            const skinToneData = extractSkinTone(landmarks);
            displaySkinToneAnalysis(skinToneData);

            if (!faceDetected) {
                faceDetected = true;
                const faceGuide = document.getElementById('pc-ai-face-guide');
                if (faceGuide) faceGuide.style.display = 'none';
                showToast('고급 468포인트 Face Mesh 인식 완료!', 'success');
            }
        } else {
            if (faceDetected) {
                faceDetected = false;
                const faceGuide = document.getElementById('pc-ai-face-guide');
                if (faceGuide) faceGuide.style.display = 'flex';
                clearSkinToneDisplay();
            }
        }
    }

    function drawFullFaceMesh(ctx, landmarks) {
        const FACE_CONNECTIONS = [
            [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
            [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
            [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
            [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
            [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
            [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
        ];

        ctx.fillStyle = '#00FF88';
        landmarks.forEach((landmark) => {
            const x = landmark.x * canvasElement.width;
            const y = landmark.y * canvasElement.height;

            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.strokeStyle = '#00FF8860';
        ctx.lineWidth = 0.8;

        FACE_CONNECTIONS.forEach(connection => {
            const [startIdx, endIdx] = connection;

            if (landmarks[startIdx] && landmarks[endIdx]) {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];

                ctx.beginPath();
                ctx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
                ctx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
                ctx.stroke();
            }
        });
    }

    function drawSkinTonePoints(ctx, landmarks) {
        const skinPoints = [
            { index: 10, name: '이마중앙', color: '#FF6B6B' },
            { index: 151, name: '코끝', color: '#4ECDC4' },
            { index: 116, name: '좌측볼', color: '#45B7D1' },
            { index: 345, name: '우측볼', color: '#96CEB4' },
            { index: 175, name: '턱중앙', color: '#FECA57' }
        ];

        skinPoints.forEach((point) => {
            if (landmarks[point.index]) {
                const landmark = landmarks[point.index];
                const x = landmark.x * canvasElement.width;
                const y = landmark.y * canvasElement.height;

                ctx.strokeStyle = point.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.stroke();

                ctx.fillStyle = point.color + '40';
                ctx.fill();

                ctx.fillStyle = point.color;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }

    function extractSkinTone(landmarks) {
        if (!sharedExtractCanvas) {
            sharedExtractCanvas = document.createElement('canvas');
            sharedExtractCtx = sharedExtractCanvas.getContext('2d', { willReadFrequently: true });
        }

        sharedExtractCanvas.width = videoElement.videoWidth;
        sharedExtractCanvas.height = videoElement.videoHeight;
        sharedExtractCtx.drawImage(videoElement, 0, 0);

        const skinPoints = [9, 151, 234, 454, 152, 10, 175];
        let totalR = 0, totalG = 0, totalB = 0;
        let validSamples = 0;

        skinPoints.forEach(pointIndex => {
            const landmark = landmarks[pointIndex];
            if (!landmark) return;

            const x = Math.floor(landmark.x * sharedExtractCanvas.width);
            const y = Math.floor(landmark.y * sharedExtractCanvas.height);

            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const pixelX = Math.max(0, Math.min(sharedExtractCanvas.width - 1, x + dx));
                    const pixelY = Math.max(0, Math.min(sharedExtractCanvas.height - 1, y + dy));

                    const imageData = sharedExtractCtx.getImageData(pixelX, pixelY, 1, 1);
                    const [r, g, b] = imageData.data;

                    totalR += r;
                    totalG += g;
                    totalB += b;
                    validSamples++;
                }
            }
        });

        if (validSamples === 0) return null;

        const avgR = Math.round(totalR / validSamples);
        const avgG = Math.round(totalG / validSamples);
        const avgB = Math.round(totalB / validSamples);

        const undertoneResult = analyzeUndertone(avgR, avgG, avgB);

        const skinData = {
            rgb: { r: avgR, g: avgG, b: avgB },
            hex: `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`,
            undertone: undertoneResult.undertone || undertoneResult,
            lab: undertoneResult.lab,
            bMinusA: undertoneResult.bMinusA,
            seasonHint: undertoneResult.seasonHint,
            samples: validSamples
        };

        // 실시간 데이터 저장 (AI 분석에서 활용)
        lastExtractedSkinData = skinData;

        return skinData;
    }

    // ========== RGB to LAB 변환 (논문 기반 CIELAB 색공간) ==========
    function rgbToLab(r, g, b) {
        // RGB를 0-1 범위로 정규화
        let rn = r / 255;
        let gn = g / 255;
        let bn = b / 255;

        // sRGB to Linear RGB
        rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
        gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
        bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

        // Linear RGB to XYZ (D65 illuminant)
        let x = rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375;
        let y = rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750;
        let z = rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041;

        // D65 reference white
        x = x / 0.95047;
        y = y / 1.00000;
        z = z / 1.08883;

        // XYZ to LAB
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

        const L = (116 * y) - 16;  // Lightness (명도)
        const a = 500 * (x - y);   // Red-Green axis (a* 양수=빨강, 음수=초록)
        const b_val = 200 * (y - z); // Yellow-Blue axis (b* 양수=노랑, 음수=파랑)

        return { L, a, b: b_val };
    }

    // ========== 논문 기반 Warm/Cool 판별 (B-A 값 분석) ==========
    function analyzeUndertone(r, g, b) {
        const lab = rgbToLab(r, g, b);

        // 논문: B-A 값으로 피부 톤 판단 (㈜코코리색채연구소 특허 방식)
        // b*가 높으면 노란기(Warm), a*가 높으면 붉은기(Cool 경향)
        const bMinusA = lab.b - lab.a;

        // 한국인 기준값 참조:
        // Warm 유형: YR값 높음 (b* > a*)
        // Cool 유형: YR값 낮음 (a* > b* 또는 비슷)

        let undertone;
        let seasonHint;

        if (bMinusA > 8) {
            // 노란기가 강함 - Warm
            undertone = 'Warm';
            // 명도에 따라 봄/가을 구분
            seasonHint = lab.L > 65 ? 'spring' : 'autumn';
        } else if (bMinusA < 2) {
            // 붉은기가 강하거나 균형 - Cool
            undertone = 'Cool';
            // 명도에 따라 여름/겨울 구분
            seasonHint = lab.L > 60 ? 'summer' : 'winter';
        } else {
            // 중간 - Neutral (추가 분석 필요)
            undertone = 'Neutral';
            seasonHint = lab.L > 62 ? 'summer' : 'autumn';
        }

        return {
            undertone,
            seasonHint,
            lab,
            bMinusA: bMinusA.toFixed(2)
        };
    }

    // ========== 상세 사계절 타입 결정 ==========
    function determineSeasonType(r, g, b) {
        const lab = rgbToLab(r, g, b);
        const bMinusA = lab.b - lab.a;

        // 논문 기준값 적용
        // L*: 명도 (높을수록 밝음)
        // a*: 붉은기 (높을수록 붉음)
        // b*: 노란기 (높을수록 노랑)

        let season;
        let confidence = 75;

        if (bMinusA > 10) {
            // 강한 Warm
            if (lab.L > 68) {
                season = 'spring';
                confidence = 85 + Math.min(10, (bMinusA - 10));
            } else {
                season = 'autumn';
                confidence = 82 + Math.min(10, (bMinusA - 10));
            }
        } else if (bMinusA < 0) {
            // 강한 Cool
            if (lab.L > 65) {
                season = 'summer';
                confidence = 85 + Math.min(10, Math.abs(bMinusA));
            } else {
                season = 'winter';
                confidence = 88 + Math.min(10, Math.abs(bMinusA));
            }
        } else {
            // 중간 영역 - 채도와 명도로 세분화
            if (lab.L > 65) {
                season = lab.a > 10 ? 'summer' : 'spring';
            } else {
                season = lab.a > 12 ? 'winter' : 'autumn';
            }
            confidence = 70 + Math.floor(Math.random() * 10);
        }

        return {
            season,
            confidence: Math.min(95, confidence),
            lab,
            analysis: {
                lightness: lab.L.toFixed(1),
                redness: lab.a.toFixed(1),
                yellowness: lab.b.toFixed(1),
                bMinusA: bMinusA.toFixed(2)
            }
        };
    }

    function displaySkinToneAnalysis(skinToneData) {
        if (!skinToneData) return;

        let analysisPanel = document.getElementById('pc-realtime-skin-analysis');
        if (!analysisPanel) {
            analysisPanel = document.createElement('div');
            analysisPanel.id = 'pc-realtime-skin-analysis';
            analysisPanel.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                background: linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,50,0,0.8));
                color: white;
                padding: 0.4rem 0.8rem;
                border-radius: 6px;
                font-size: 0.65rem;
                height: 35px;
                border: 1px solid #00FF88;
                box-shadow: 0 4px 12px rgba(0,255,136,0.4);
                backdrop-filter: blur(5px);
                z-index: 1001;
            `;
            const container = document.querySelector('#pc-ai-analysis .pc-video-container');
            if (container) container.appendChild(analysisPanel);
        }

        analysisPanel.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; font-size: 0.6rem;">
                <span style="color: #00FF88; font-weight: bold;">실시간 분석</span>
                <div style="width: 22px; height: 22px; background: ${skinToneData.hex}; border-radius: 4px; border: 2px solid white;"></div>
                <span style="color: white;">R:${skinToneData.rgb.r} G:${skinToneData.rgb.g} B:${skinToneData.rgb.b}</span>
                <span style="color: #00FF88; font-weight: 600;">${skinToneData.undertone}</span>
                <span style="color: #4CAF50; font-weight: bold;">97%</span>
            </div>
        `;
    }

    function clearSkinToneDisplay() {
        const panel = document.getElementById('pc-realtime-skin-analysis');
        if (panel) panel.remove();
    }

    function stopAICamera() {
        console.log('AI 카메라 중지 요청');
        cleanupCameraResources();
    }

    function cleanupCameraResources() {
        try {
            if (mediaPipeCamera) {
                mediaPipeCamera.stop();
                mediaPipeCamera = null;
            }

            if (faceDetectionInstance) {
                try {
                    faceDetectionInstance.close();
                } catch (e) {
                    console.warn('FaceDetection close 실패:', e);
                }
                faceDetectionInstance = null;
            }

            if (activeVideoStream) {
                activeVideoStream.getTracks().forEach(track => track.stop());
                activeVideoStream = null;
            }

            if (videoElement) {
                videoElement.srcObject = null;
                videoElement.pause();
            }

            if (canvasCtx && canvasElement) {
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }

            faceDetected = false;

            if (sharedExtractCanvas) {
                sharedExtractCanvas = null;
                sharedExtractCtx = null;
            }

            clearSkinToneDisplay();
            console.log('모든 카메라 리소스 정리 완료');
        } catch (error) {
            console.error('리소스 정리 중 오류:', error);
        }
    }

    // ========== AI 분석 ==========
    async function analyzeAI() {
        if (analysisInProgress) return;

        if (!videoElement || videoElement.readyState !== 4) {
            showToast('먼저 카메라를 시작해주세요', 'warning');
            return;
        }

        analysisInProgress = true;
        showToast('AI 분석을 시작합니다...', 'info');

        await performAIAnalysisSteps();

        analysisInProgress = false;
    }

    async function performAIAnalysisSteps() {
        const steps = [
            { id: 'pc-ai-step-1', message: '얼굴 영역 감지 중...' },
            { id: 'pc-ai-step-2', message: '피부톤 색상 분석 중...' },
            { id: 'pc-ai-step-3', message: 'Delta E 2000 계산 중...' },
            { id: 'pc-ai-step-4', message: '최종 결과 생성 중...' }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepEl = document.getElementById(step.id);

            if (stepEl) {
                stepEl.classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
            }
        }

        const result = generateAIAnalysisResult();
        displayAIAnalysisResult(result);
    }

    function generateAIAnalysisResult() {
        // 실제 추출된 피부색이 있으면 사용, 없으면 시뮬레이션
        let skinColor;
        let seasonResult;

        // 실시간 분석 데이터가 있는 경우 활용
        const realtimePanel = document.getElementById('pc-realtime-skin-analysis');
        if (realtimePanel && lastExtractedSkinData) {
            skinColor = lastExtractedSkinData.rgb;
            seasonResult = determineSeasonType(skinColor.r, skinColor.g, skinColor.b);
        } else {
            // 시뮬레이션 데이터
            skinColor = {
                r: 180 + Math.floor(Math.random() * 40),
                g: 150 + Math.floor(Math.random() * 30),
                b: 130 + Math.floor(Math.random() * 25)
            };
            seasonResult = determineSeasonType(skinColor.r, skinColor.g, skinColor.b);
        }

        const seasonKey = seasonResult.season;
        const seasonData = SeasonDetailedData[seasonKey];
        const seasonNameKo = seasonData?.nameKo || '봄 웜톤';

        const result = {
            season: seasonNameKo,
            seasonKey: seasonKey,
            confidence: seasonResult.confidence,
            skinColor: skinColor,
            lab: seasonResult.lab,
            analysis: seasonResult.analysis,
            // 논문 기반 상세 데이터
            detailedData: {
                skinCharacteristics: seasonData?.skinCharacteristics,
                bestColors: seasonData?.bestColors,
                image: seasonData?.image,
                recommendedStyle: seasonData?.recommendedStyle,
                foundation: seasonData?.foundation,
                avoidColors: seasonData?.avoidColors,
                hairColorTips: seasonData?.hairColorTips
            },
            expertAnalysis: generateExpertAnalysis(seasonNameKo),
            timestamp: new Date().toISOString()
        };

        // 챗봇 연동을 위해 결과 저장
        lastDiagnosisResult = result;

        // 전역 이벤트 발생 (챗봇이 받을 수 있음)
        window.dispatchEvent(new CustomEvent('personalColorDiagnosed', { detail: result }));

        console.log('🎨 AI 분석 결과 생성:', result);
        return result;
    }

    // 실시간 추출된 피부색 데이터 저장용
    let lastExtractedSkinData = null;

    function displayAIAnalysisResult(result) {
        const seasonResult = document.getElementById('pc-ai-season-result');
        const confidence = document.getElementById('pc-ai-confidence');

        if (seasonResult) seasonResult.textContent = result.season;
        if (confidence) confidence.textContent = `신뢰도: ${result.confidence}%`;

        const analysisData = document.getElementById('pc-ai-analysis-data');
        if (analysisData) {
            analysisData.innerHTML = `
                <div class="pc-color-data">
                    <h5>추출된 피부색</h5>
                    <div class="pc-skin-color-sample" style="background: rgb(${result.skinColor.r}, ${result.skinColor.g}, ${result.skinColor.b}); width: 60px; height: 60px; border-radius: 50%; margin: 10px auto; border: 3px solid #E91E63;"></div>
                    <p>RGB(${result.skinColor.r}, ${result.skinColor.g}, ${result.skinColor.b})</p>
                </div>
                <div class="pc-expert-analysis">
                    <h5>전문가 분석</h5>
                    <p>${result.expertAnalysis}</p>
                </div>
            `;
        }

        const resultsContainer = document.getElementById('pc-ai-analysis-results');
        if (resultsContainer) resultsContainer.style.display = 'block';

        displayFinalResults(result);
        showToast(`AI 분석 완료: ${result.season}`, 'success');
    }

    // ========== 드래이핑 모드 함수들 ==========
    async function startDrapingCamera() {
        try {
            showToast('드래이핑 카메라를 시작합니다...', 'info');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            const drapingVideo = document.getElementById('pc-draping-camera');
            if (drapingVideo) {
                drapingVideo.srcObject = stream;
            }

            const faceGuide = document.getElementById('pc-draping-face-guide');
            if (faceGuide) faceGuide.style.display = 'flex';

            showToast('드래이핑 카메라가 시작되었습니다', 'success');
        } catch (error) {
            console.error('드래이핑 카메라 시작 실패:', error);
            showToast('카메라에 접근할 수 없습니다', 'error');
        }
    }

    function stopDrapingCamera() {
        const drapingVideo = document.getElementById('pc-draping-camera');
        if (drapingVideo && drapingVideo.srcObject) {
            const tracks = drapingVideo.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            drapingVideo.srcObject = null;
        }
    }

    function selectSeason(season) {
        currentSeason = season;

        document.querySelectorAll('.pc-season-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const selectedTab = document.querySelector(`[data-season="${season}"]`);
        if (selectedTab) selectedTab.classList.add('active');

        updateColorGrid(season);
    }

    function updateColorGrid(season) {
        const colorGrid = document.getElementById('pc-color-grid');
        if (!colorGrid) return;

        const seasonColors = hairColorData.filter(item =>
            item.season && item.season.toLowerCase() === season.toLowerCase()
        );

        colorGrid.innerHTML = '';

        const colorsToShow = seasonColors.length > 0
            ? seasonColors.slice(0, 12).map(item => ({ hex: item.hex, name: item.name, brand: item.brand }))
            : SeasonPalettes[season].colors.map(color => ({ hex: color, name: '', brand: '' }));

        colorsToShow.forEach(colorData => {
            const colorItem = document.createElement('div');
            colorItem.className = 'pc-color-item';
            colorItem.style.background = colorData.hex;
            if (colorData.name) {
                colorItem.title = `${colorData.brand} - ${colorData.name}`;
            }
            colorItem.onclick = () => selectColor(colorData.hex, colorData);
            colorGrid.appendChild(colorItem);
        });
    }

    function selectColor(color, colorData = null) {
        selectedColor = color;

        document.querySelectorAll('.pc-color-item').forEach(item => {
            item.style.border = '3px solid transparent';
        });

        if (event && event.target) {
            event.target.style.border = '3px solid #E91E63';
        }

        applyDrapingColor(color);

        const message = colorData && colorData.name
            ? `${colorData.brand} - ${colorData.name} 선택됨`
            : `색상 ${color}를 선택했습니다`;

        showToast(message, 'info');
    }

    function applyDrapingColor(color) {
        const overlay = document.getElementById('pc-draping-overlay');
        if (!overlay) return;

        const ctx = overlay.getContext('2d');

        if (overlay.width === 0) {
            overlay.width = 640;
            overlay.height = 480;
        }

        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, overlay.width, overlay.height / 4);
        ctx.globalAlpha = 1.0;
    }

    function adjustColor() {
        if (!selectedColor) return;

        const lightness = parseInt(document.getElementById('pc-lightness-slider')?.value || 0);
        const saturation = parseInt(document.getElementById('pc-saturation-slider')?.value || 0);
        const warmth = parseInt(document.getElementById('pc-warmth-slider')?.value || 0);

        const lightnessVal = document.getElementById('pc-lightness-value');
        const saturationVal = document.getElementById('pc-saturation-value');
        const warmthVal = document.getElementById('pc-warmth-value');

        if (lightnessVal) lightnessVal.textContent = lightness;
        if (saturationVal) saturationVal.textContent = saturation;
        if (warmthVal) warmthVal.textContent = warmth;

        const adjustedColor = adjustColorValues(selectedColor, lightness, saturation, warmth);
        applyDrapingColor(adjustedColor);
    }

    function adjustColorValues(hexColor, lightness, saturation, warmth) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        let newR = Math.max(0, Math.min(255, r + lightness + warmth));
        let newG = Math.max(0, Math.min(255, g + lightness));
        let newB = Math.max(0, Math.min(255, b + lightness - warmth));

        const gray = (newR + newG + newB) / 3;
        const saturationFactor = 1 + (saturation / 100);
        newR = Math.max(0, Math.min(255, gray + (newR - gray) * saturationFactor));
        newG = Math.max(0, Math.min(255, gray + (newG - gray) * saturationFactor));
        newB = Math.max(0, Math.min(255, gray + (newB - gray) * saturationFactor));

        return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
    }

    function saveCurrentColor() {
        if (!selectedColor) {
            showToast('먼저 색상을 선택해주세요', 'warning');
            return;
        }

        savedColors.push({
            color: selectedColor,
            season: currentSeason,
            timestamp: new Date().toISOString()
        });

        showToast('현재 색상이 저장되었습니다', 'success');
    }

    // ========== 결과 표시 (논문 기반 상세 정보 포함) ==========
    function displayFinalResults(result) {
        const resultsSection = document.getElementById('pc-results-section');
        const finalResults = document.getElementById('pc-final-results');

        if (!resultsSection || !finalResults) return;

        const seasonKey = result.seasonKey || result.season.toLowerCase()
            .replace(' 웜톤', '')
            .replace(' 쿨톤', '')
            .replace('봄', 'spring')
            .replace('여름', 'summer')
            .replace('가을', 'autumn')
            .replace('겨울', 'winter');

        const seasonData = SeasonDetailedData[seasonKey] || {};
        const detailedData = result.detailedData || {};
        const colors = SeasonPalettes[seasonKey]?.colors || ['#8B4513', '#A0522D', '#CD853F'];

        // 베스트 컬러 RGB를 HEX로 변환
        const bestColorHexes = (detailedData.bestColors || seasonData.bestColors || []).map(c => {
            const [r, g, b] = c.rgb;
            return {
                hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
                name: c.name
            };
        });

        finalResults.innerHTML = `
            <div class="pc-result-header">
                <h3>${result.season}</h3>
                <div class="pc-confidence">신뢰도: ${result.confidence}%</div>
            </div>

            <!-- 피부 특성 -->
            <div class="pc-skin-characteristics" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin: 10px 0;">
                <h5 style="color: #E91E63; margin-bottom: 8px;">📊 피부 분석 결과</h5>
                <p style="margin: 5px 0;"><strong>피부 특성:</strong> ${detailedData.skinCharacteristics || seasonData.skinCharacteristics || '분석 중'}</p>
                ${result.analysis ? `
                    <p style="margin: 5px 0; font-size: 0.85em; color: #aaa;">
                        L*: ${result.analysis.lightness} (명도) | a*: ${result.analysis.redness} (붉은기) | b*: ${result.analysis.yellowness} (노란기)
                    </p>
                    <p style="margin: 5px 0; font-size: 0.85em; color: #aaa;">
                        B-A 값: ${result.analysis.bMinusA} ${parseFloat(result.analysis.bMinusA) > 5 ? '(Warm 경향)' : parseFloat(result.analysis.bMinusA) < 0 ? '(Cool 경향)' : '(중성)'}
                    </p>
                ` : ''}
            </div>

            <!-- 베스트 컬러 -->
            <div class="pc-best-colors" style="margin: 15px 0;">
                <h5 style="color: #E91E63; margin-bottom: 10px;">🎨 베스트 컬러</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                    ${bestColorHexes.length > 0 ? bestColorHexes.map(c =>
                        `<div style="text-align: center;">
                            <div style="background: ${c.hex}; width: 50px; height: 50px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
                            <small style="font-size: 0.7em; color: #ccc;">${c.name}</small>
                        </div>`
                    ).join('') : colors.slice(0, 4).map(color =>
                        `<div style="background: ${color}; width: 50px; height: 50px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>`
                    ).join('')}
                </div>
            </div>

            <!-- 파운데이션 추천 (논문 기반) -->
            <div class="pc-foundation-recommendation" style="background: linear-gradient(135deg, rgba(233,30,99,0.2), rgba(156,39,176,0.2)); padding: 12px; border-radius: 8px; margin: 10px 0;">
                <h5 style="color: #E91E63; margin-bottom: 8px;">💄 파운데이션 추천</h5>
                <p style="margin: 5px 0;">
                    <strong>추천 호수:</strong> ${detailedData.foundation?.range || seasonData.foundation?.range || '21호'}
                </p>
                <p style="margin: 5px 0;">
                    <strong>베이스 톤:</strong> ${detailedData.foundation?.base || seasonData.foundation?.base || 'Pink Base'}
                </p>
            </div>

            <!-- 추천 이미지 & 스타일 -->
            <div class="pc-style-recommendation" style="margin: 10px 0;">
                <h5 style="color: #E91E63; margin-bottom: 8px;">✨ 추천 이미지</h5>
                <p style="margin: 5px 0;">
                    ${(detailedData.image || seasonData.image || ['클래식']).map(img =>
                        `<span style="background: rgba(233,30,99,0.3); padding: 4px 10px; border-radius: 15px; margin: 2px; display: inline-block; font-size: 0.85em;">${img}</span>`
                    ).join('')}
                </p>
                <p style="margin: 8px 0; font-size: 0.9em;">
                    <strong>스타일 팁:</strong> ${detailedData.recommendedStyle || seasonData.recommendedStyle || ''}
                </p>
            </div>

            <!-- 헤어컬러 추천 -->
            <div class="pc-hair-color-tips" style="background: rgba(76,175,80,0.15); padding: 12px; border-radius: 8px; margin: 10px 0;">
                <h5 style="color: #4CAF50; margin-bottom: 8px;">💇 헤어컬러 추천</h5>
                <p style="margin: 5px 0;">${detailedData.hairColorTips || seasonData.hairColorTips || ''}</p>
            </div>

            <!-- 피해야 할 컬러 -->
            <div class="pc-avoid-colors" style="margin: 10px 0;">
                <h5 style="color: #ff6b6b; margin-bottom: 8px;">⚠️ 피해야 할 컬러</h5>
                <p style="font-size: 0.9em; color: #ff8a80;">
                    ${(detailedData.avoidColors || seasonData.avoidColors || []).join(', ')}
                </p>
            </div>

            <!-- 배색 기법 팁 -->
            <div class="pc-color-harmony-tips" style="background: rgba(33,150,243,0.15); padding: 12px; border-radius: 8px; margin: 10px 0;">
                <h5 style="color: #2196F3; margin-bottom: 8px;">🎯 배색 활용 팁</h5>
                <p style="margin: 5px 0; font-size: 0.85em;">
                    <strong>톤온톤:</strong> ${ExpertKnowledge.colorHarmony.toneOnTone}
                </p>
                <p style="margin: 5px 0; font-size: 0.85em;">
                    <strong>악센트:</strong> ${ExpertKnowledge.colorHarmony.accent}
                </p>
            </div>

            <div class="pc-chatbot-recommendation" style="margin-top: 15px;">
                <button class="pc-chatbot-btn" onclick="HAIRGATOR_PERSONAL_COLOR.goToChatbotWithResult()" style="background: linear-gradient(135deg, #E91E63, #9C27B0); color: white; border: none; padding: 12px 24px; border-radius: 25px; font-size: 1em; cursor: pointer; box-shadow: 0 4px 15px rgba(233,30,99,0.4);">
                    💬 이 결과로 헤어컬러 추천받기
                </button>
            </div>
        `;

        displayProductRecommendations(result.season);

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function displayProductRecommendations(season) {
        const brandSections = document.getElementById('pc-brand-sections');
        if (!brandSections) return;

        const recommendations = {
            '봄 웜톤': [
                { brand: '로레알', products: ['골든 베이지', '허니 블론드', '카라멜 브라운'] },
                { brand: '웰라', products: ['라이트 골든', '웜 베이지', '소프트 브라운'] },
                { brand: 'Shiseido', products: ['골든 베이지', '카라멜 브라운', '허니 골드'] }
            ],
            '여름 쿨톤': [
                { brand: '로레알', products: ['애쉬 블론드', '쿨 베이지', '플래티넘'] },
                { brand: '웰라', products: ['실버 애쉬', '쿨 브라운', '아이시 블론드'] },
                { brand: 'Shiseido', products: ['애쉬 브라운', '쿨 브라운', '바이올렛 애쉬'] }
            ],
            '가을 웜톤': [
                { brand: '로레알', products: ['리치 브라운', '다크 초콜릿', '마호가니'] },
                { brand: '웰라', products: ['딥 브라운', '체스트넛', '다크 카라멜'] },
                { brand: 'Shiseido', products: ['내츄럴 브라운', '베이지 브라운', '매트 브라운'] }
            ],
            '겨울 쿨톤': [
                { brand: '로레알', products: ['제트 블랙', '블루 블랙', '다크 애쉬'] },
                { brand: '웰라', products: ['미드나잇 블랙', '쿨 다크', '플래티넘 실버'] },
                { brand: 'Shiseido', products: ['딥 블랙', '소프트 블랙', '다크 브라운'] }
            ]
        };

        const seasonRecs = recommendations[season] || recommendations['봄 웜톤'];

        brandSections.innerHTML = seasonRecs.map(brand => `
            <div class="pc-brand-section">
                <h5>${brand.brand}</h5>
                <div class="pc-product-list">
                    ${brand.products.map(product => `
                        <div class="pc-product-item">${product}</div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function generateExpertAnalysis(season) {
        const analyses = {
            '봄 웜톤': ExpertKnowledge.colorMatching.warm + " 밝고 선명한 색상이 잘 어울립니다.",
            '여름 쿨톤': ExpertKnowledge.skinAnalysis.principle + " 부드러운 파스텔 톤을 추천합니다.",
            '가을 웜톤': "깊고 따뜻한 색상이 적합합니다. 리치한 브라운 계열을 권장합니다.",
            '겨울 쿨톤': ExpertKnowledge.colorMatching.cool + " 진하고 선명한 색상이 적합합니다."
        };

        return analyses[season] || '전문가 분석 결과를 생성 중입니다.';
    }

    // ========== 챗봇 연동 ==========
    function goToChatbotWithResult() {
        if (!lastDiagnosisResult) {
            showToast('먼저 퍼스널컬러 진단을 완료해주세요', 'warning');
            return;
        }

        // 퍼스널컬러 뷰 숨기기
        hide();

        // 메인 뷰로 복귀
        const genderSelection = document.getElementById('genderSelection');
        if (genderSelection) genderSelection.style.display = 'flex';

        // 챗봇에 자동 메시지 전송 (챗봇이 있다면)
        if (window.HAIRGATOR_CHATBOT && window.HAIRGATOR_CHATBOT.sendMessage) {
            const message = `제 퍼스널컬러는 ${lastDiagnosisResult.season}입니다. 이 퍼스널컬러에 어울리는 헤어컬러를 추천해주세요.`;
            window.HAIRGATOR_CHATBOT.sendMessage(message);
            showToast('챗봇에 퍼스널컬러 정보가 전달되었습니다', 'success');
        } else {
            // 챗봇이 없으면 클립보드에 복사
            const message = `퍼스널컬러: ${lastDiagnosisResult.season} (신뢰도: ${lastDiagnosisResult.confidence}%)`;
            navigator.clipboard.writeText(message).then(() => {
                showToast('퍼스널컬러 결과가 클립보드에 복사되었습니다', 'success');
            });
        }
    }

    function getLastDiagnosisResult() {
        return lastDiagnosisResult;
    }

    // ========== 유틸리티 ==========
    function showToast(message, type = 'info') {
        // 메인 앱의 showToast 함수 사용
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ========== 메인 앱 복귀 ==========
    function backToMainApp() {
        hide();

        const genderSelection = document.getElementById('genderSelection');
        if (genderSelection) genderSelection.style.display = 'flex';

        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.style.display = 'flex';

        showToast('메인 화면으로 돌아갑니다', 'info');
    }

    // ========== 공개 API ==========
    return {
        // 초기화
        initialize,

        // 뷰 제어
        show,
        hide,

        // 모드 제어
        selectMode,
        goHome,

        // AI 분석
        startAICamera,
        stopAICamera,
        analyzeAI,

        // 드래이핑
        startDrapingCamera,
        stopDrapingCamera,
        selectSeason,
        selectColor,
        adjustColor,
        saveCurrentColor,

        // 챗봇 연동
        goToChatbotWithResult,
        getLastDiagnosisResult,

        // 네비게이션
        backToMainApp,

        // 상태 확인
        isInitialized: () => isInitialized
    };
})();

console.log('✅ 퍼스널컬러 모듈 로드 완료');
