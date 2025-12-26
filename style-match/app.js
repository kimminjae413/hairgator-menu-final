// ==========================================
// AI Style Match - MediaPipe Face Mesh 분석
// 얼굴형 기반 헤어스타일 추천 시스템
// ==========================================

// ========== 전역 변수 ==========
let faceMesh = null;
let selectedGender = null;
let uploadedImage = null;
let analysisResults = null;
let allStyles = [];

// 카메라 관련
let cameraStream = null;
let cameraFaceMesh = null;
let isCameraMode = true;
let isFaceDetected = false;
let lastFaceResults = null;

// 랜드마크 인덱스 (MediaPipe Face Mesh 468 포인트)
const LANDMARKS = {
    hairline: 10,       // 헤어라인 중심
    glabella: 9,        // 미간 (눈썹 사이)
    nose_tip: 1,        // 코끝
    chin: 152,          // 턱끝
    left_zygoma: 234,   // 좌 광대
    right_zygoma: 454,  // 우 광대
    left_gonion: 58,    // 좌 턱각
    right_gonion: 288,  // 우 턱각
    left_eye_outer: 33, // 좌 눈 외측
    right_eye_outer: 263, // 우 눈 외측
    nose_root: 6,       // 콧대 시작점
    upper_lip: 0,       // 윗입술 중심
    forehead_top: 10    // 이마 상단
};

// 대분류 카테고리
const FEMALE_CATEGORIES = ['A LENGTH', 'B LENGTH', 'C LENGTH', 'D LENGTH', 'E LENGTH', 'F LENGTH', 'G LENGTH', 'H LENGTH'];
const MALE_CATEGORIES = ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'];

// 중분류 (앞머리)
const SUB_CATEGORIES = {
    'N': 'None',
    'FH': 'Fore Head',
    'EB': 'Eye Brow',
    'E': 'Eye',
    'CB': 'Cheekbone'
};

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 AI Style Match 초기화');

    // 테마 상속
    inheritTheme();

    // 파일 업로드 이벤트
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // MediaPipe 초기화
    await initFaceMesh();

    // Firestore에서 스타일 로드
    await loadStyles();

    // 번역 적용
    applyTranslations();

    // 카메라 모드로 시작
    await startCamera();
});

// 테마 상속
function inheritTheme() {
    try {
        if (parent && parent.document && parent.document.body.classList.contains('light-theme')) {
            document.body.classList.add('light-theme');
        }
    } catch (e) {
        // cross-origin 무시
    }
}

// 번역 함수
function t(key) {
    try {
        const lang = getCurrentLanguage();
        if (typeof HAIRGATOR_I18N === 'undefined' || !HAIRGATOR_I18N[lang]) return null;

        const keys = key.split('.');
        let result = HAIRGATOR_I18N[lang];
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return null;
            }
        }
        return typeof result === 'string' ? result : null;
    } catch (e) {
        return null;
    }
}

function getCurrentLanguage() {
    try {
        if (parent && parent !== window && parent.currentLanguage) return parent.currentLanguage;
        if (parent && parent !== window && parent.localStorage) {
            const parentLang = parent.localStorage.getItem('hairgator_language');
            if (parentLang) return parentLang;
        }
    } catch (e) {}
    return localStorage.getItem('hairgator_language') || 'ko';
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (translated) el.textContent = translated;
    });
}

// ========== MediaPipe 초기화 ==========
async function initFaceMesh() {
    try {
        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onFaceMeshResults);
        console.log('✅ MediaPipe Face Mesh 초기화 완료');
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
    }
}

// ========== 카메라 기능 ==========
async function startCamera() {
    const video = document.getElementById('cameraVideo');
    const captureBtn = document.getElementById('captureBtn');
    const indicator = document.getElementById('faceDetectedIndicator');

    if (!video) return;

    try {
        // 기존 스트림 정리
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }

        // 카메라 스트림 요청
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video.srcObject = cameraStream;
        await video.play();

        console.log('📷 카메라 스트림 시작');

        // 실시간 얼굴 감지용 FaceMesh 설정
        cameraFaceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        cameraFaceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        cameraFaceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                if (!isFaceDetected) {
                    isFaceDetected = true;
                    indicator.style.display = 'flex';
                    captureBtn.disabled = !selectedGender;
                    console.log('👤 얼굴 감지됨');
                }
                lastFaceResults = results;

                // 실시간으로 랜드마크와 측정선 그리기
                drawLandmarksOnCanvas(results.multiFaceLandmarks[0], video);
            } else {
                if (isFaceDetected) {
                    isFaceDetected = false;
                    indicator.style.display = 'none';
                    captureBtn.disabled = true;
                    clearLandmarkCanvas();
                }
                lastFaceResults = null;
            }
        });

        // 실시간 감지 루프
        detectFacesLoop(video);

    } catch (error) {
        console.error('❌ 카메라 접근 실패:', error);
        // 카메라 실패 시 업로드 모드로 전환
        switchInputMode('upload');
    }
}

async function detectFacesLoop(video) {
    if (!cameraFaceMesh || !isCameraMode) return;

    try {
        await cameraFaceMesh.send({ image: video });
    } catch (e) {
        // 무시
    }

    if (isCameraMode && cameraStream) {
        requestAnimationFrame(() => detectFacesLoop(video));
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    isFaceDetected = false;
    lastFaceResults = null;
    clearLandmarkCanvas();
}

// ========== 랜드마크 시각화 ==========
function drawLandmarksOnCanvas(landmarks, video) {
    const canvas = document.getElementById('landmarkCanvas');
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext('2d');

    // 캔버스 크기를 비디오에 맞춤
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // 주요 랜드마크 인덱스
    const keyPoints = {
        hairline: 10,
        glabella: 9,
        noseTip: 1,
        chin: 152,
        leftZygoma: 234,
        rightZygoma: 454,
        leftGonion: 58,
        rightGonion: 288,
        leftEye: 33,
        rightEye: 263
    };

    // 1. 얼굴 윤곽선 그리기 (연한 선)
    const faceOutline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.4)';
    ctx.lineWidth = 1;
    faceOutline.forEach((idx, i) => {
        const x = landmarks[idx].x * w;
        const y = landmarks[idx].y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. 주요 측정선 그리기
    // 세로선: 이마 ~ 턱 (핑크)
    drawMeasurementLine(ctx, landmarks, keyPoints.hairline, keyPoints.chin, w, h, '#E91E63', '세로');

    // 가로선: 광대 너비 (파랑)
    drawMeasurementLine(ctx, landmarks, keyPoints.leftZygoma, keyPoints.rightZygoma, w, h, '#4A90E2', '광대');

    // 가로선: 턱 너비 (노랑)
    drawMeasurementLine(ctx, landmarks, keyPoints.leftGonion, keyPoints.rightGonion, w, h, '#fbbf24', '턱');

    // 3. 주요 포인트 그리기 (밝은 점)
    Object.values(keyPoints).forEach(idx => {
        const x = landmarks[idx].x * w;
        const y = landmarks[idx].y * h;

        // 외곽 원
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(233, 30, 99, 0.3)';
        ctx.fill();

        // 내부 점
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#E91E63';
        ctx.fill();
    });

    // 4. 측정 값 표시
    updateMeasurementDisplay(landmarks, w, h);
}

function drawMeasurementLine(ctx, landmarks, idx1, idx2, w, h, color, label) {
    const x1 = landmarks[idx1].x * w;
    const y1 = landmarks[idx1].y * h;
    const x2 = landmarks[idx2].x * w;
    const y2 = landmarks[idx2].y * h;

    // 점선
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 끝점 표시
    [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

function updateMeasurementDisplay(landmarks, w, h) {
    let display = document.querySelector('.measurement-display');
    if (!display) {
        display = document.createElement('div');
        display.className = 'measurement-display';
        // 카메라 영역 다음에 삽입 (카메라 밖에 표시)
        const cameraArea = document.getElementById('cameraArea');
        cameraArea.parentNode.insertBefore(display, cameraArea.nextSibling);
    }

    // 비율 계산
    const hairline = landmarks[10];
    const glabella = landmarks[9];
    const noseTip = landmarks[1];
    const chin = landmarks[152];
    const leftZygoma = landmarks[234];
    const rightZygoma = landmarks[454];
    const leftGonion = landmarks[58];
    const rightGonion = landmarks[288];

    const dist = (a, b) => Math.sqrt(Math.pow((a.x - b.x) * w, 2) + Math.pow((a.y - b.y) * h, 2));

    const totalHeight = dist(hairline, chin);
    const upperHeight = dist(hairline, glabella);
    const middleHeight = dist(glabella, noseTip);
    const lowerHeight = dist(noseTip, chin);
    const faceWidth = dist(leftZygoma, rightZygoma);
    const jawWidth = dist(leftGonion, rightGonion);

    const upperRatio = Math.round(upperHeight / totalHeight * 100);
    const middleRatio = Math.round(middleHeight / totalHeight * 100);
    const lowerRatio = Math.round(lowerHeight / totalHeight * 100);
    const widthRatio = (faceWidth / jawWidth).toFixed(2);

    display.innerHTML = `
        <div class="measurement-line">
            <span class="measurement-label">상안부:</span>
            <span class="measurement-value">${upperRatio}%</span>
            <span class="measurement-label">중안부:</span>
            <span class="measurement-value">${middleRatio}%</span>
            <span class="measurement-label">하안부:</span>
            <span class="measurement-value">${lowerRatio}%</span>
        </div>
        <div class="measurement-line">
            <span class="measurement-label">광대/턱:</span>
            <span class="measurement-value">${widthRatio}</span>
        </div>
    `;
}

function clearLandmarkCanvas() {
    const canvas = document.getElementById('landmarkCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const display = document.querySelector('.measurement-display');
    if (display) display.remove();
}

// 카메라에서 캡처
window.captureFromCamera = function() {
    if (!lastFaceResults || !isFaceDetected) {
        alert('얼굴을 감지할 수 없습니다. 카메라를 정면으로 바라봐주세요.');
        return;
    }

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');

    // 캔버스 크기 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 거울 모드로 캡처 (CSS와 동일하게)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 캡처한 이미지를 uploadedImage로 설정
    uploadedImage = canvas.toDataURL('image/jpeg', 0.9);

    console.log('📸 카메라에서 캡처 완료');

    // 분석 버튼 활성화 체크
    checkReadyState();

    // 바로 분석 시작
    if (selectedGender) {
        startAnalysis();
    }
};

// 입력 모드 전환
window.switchInputMode = function(mode) {
    const cameraArea = document.getElementById('cameraArea');
    const uploadArea = document.getElementById('uploadArea');
    const tabs = document.querySelectorAll('.mode-tab');

    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    if (mode === 'camera') {
        isCameraMode = true;
        cameraArea.style.display = 'block';
        uploadArea.style.display = 'none';
        startCamera();
    } else {
        isCameraMode = false;
        cameraArea.style.display = 'none';
        uploadArea.style.display = 'block';
        stopCamera();
    }
};

// ========== 파일 업로드 ==========
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = e.target.result;

        const previewImg = document.getElementById('previewImage');
        const placeholder = document.getElementById('uploadPlaceholder');
        const uploadArea = document.getElementById('uploadArea');

        previewImg.src = uploadedImage;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        uploadArea.classList.add('has-image');

        checkReadyState();
    };
    reader.readAsDataURL(file);
}

// ========== 성별 선택 ==========
window.selectGender = function(gender) {
    selectedGender = gender;

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });

    checkReadyState();

    // 카메라 모드에서 캡처 버튼 활성화
    if (isCameraMode && isFaceDetected) {
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.disabled = false;
        }
    }
};

function checkReadyState() {
    const analyzeBtn = document.getElementById('analyzeBtn');

    // 카메라 모드: 얼굴 감지 + 성별 선택
    // 업로드 모드: 이미지 업로드 + 성별 선택
    if (isCameraMode) {
        analyzeBtn.disabled = true; // 카메라 모드에서는 캡처 버튼 사용
    } else {
        analyzeBtn.disabled = !(uploadedImage && selectedGender);
    }
}

// ========== 분석 시작 ==========
window.startAnalysis = async function() {
    if (!uploadedImage || !selectedGender) return;

    showLoading(true);

    try {
        // 이미지를 캔버스에 그리고 MediaPipe 분석
        const img = new Image();
        img.onload = async () => {
            const canvas = document.getElementById('faceCanvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // MediaPipe 분석 실행
            await faceMesh.send({ image: canvas });
        };
        img.src = uploadedImage;
    } catch (error) {
        console.error('분석 오류:', error);
        showLoading(false);
        alert('분석 중 오류가 발생했습니다.');
    }
};

// ========== MediaPipe 결과 처리 ==========
function onFaceMeshResults(results) {
    showLoading(false);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        alert(t('styleMatch.noFaceDetected') || '얼굴을 감지할 수 없습니다. 정면 사진을 사용해주세요.');
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    console.log('🎯 랜드마크 감지:', landmarks.length, '포인트');

    // 비율 계산
    const ratios = calculateFaceRatios(landmarks);
    console.log('📊 비율 계산:', ratios);

    // 분석 해석
    const analysis = interpretAnalysis(ratios);
    console.log('💡 분석 결과:', analysis);

    // 결과 저장
    analysisResults = { ratios, analysis };

    // UI 업데이트
    displayAnalysisResults(ratios, analysis);

    // 스타일 추천
    generateRecommendations(analysis);
}

// ========== 비율 계산 ==========
function calculateFaceRatios(landmarks) {
    // 거리 계산 함수
    const distance = (p1, p2) => {
        const dx = (p1.x - p2.x);
        const dy = (p1.y - p2.y);
        return Math.sqrt(dx * dx + dy * dy);
    };

    // 주요 포인트
    const hairline = landmarks[LANDMARKS.hairline];
    const glabella = landmarks[LANDMARKS.glabella];
    const noseTip = landmarks[LANDMARKS.nose_tip];
    const chin = landmarks[LANDMARKS.chin];
    const leftZygoma = landmarks[LANDMARKS.left_zygoma];
    const rightZygoma = landmarks[LANDMARKS.right_zygoma];
    const leftGonion = landmarks[LANDMARKS.left_gonion];
    const rightGonion = landmarks[LANDMARKS.right_gonion];

    // 수직 거리
    const upperFace = distance(hairline, glabella);  // 상안부
    const middleFace = distance(glabella, noseTip);  // 중안부
    const lowerFace = distance(noseTip, chin);       // 하안부
    const totalHeight = upperFace + middleFace + lowerFace;

    // 가로 거리
    const faceWidth = distance(leftZygoma, rightZygoma);  // 광대 너비
    const jawWidth = distance(leftGonion, rightGonion);   // 턱 너비

    // 비율 계산
    const upperRatio = upperFace / totalHeight;
    const middleRatio = middleFace / totalHeight;
    const lowerRatio = lowerFace / totalHeight;
    const cheekJawRatio = faceWidth / jawWidth;

    return {
        upperRatio: Math.round(upperRatio * 100),
        middleRatio: Math.round(middleRatio * 100),
        lowerRatio: Math.round(lowerRatio * 100),
        faceWidth: Math.round(faceWidth * 1000) / 10,
        jawWidth: Math.round(jawWidth * 1000) / 10,
        cheekJawRatio: Math.round(cheekJawRatio * 100) / 100,
        // 원본 비율 (계산용)
        raw: { upperRatio, middleRatio, lowerRatio, cheekJawRatio }
    };
}

// ========== 분석 해석 ==========
function interpretAnalysis(ratios) {
    const insights = [];
    const recommendations = [];
    const avoidances = [];

    const { raw } = ratios;

    // 1. 상안부 분석 (이마)
    if (raw.upperRatio > 0.36) {
        insights.push({
            type: 'wide_forehead',
            value: `${ratios.upperRatio}%`,
            description: t('styleMatch.insight.wideForehead') || `상안부가 평균(33%)보다 넓습니다 (${ratios.upperRatio}%)`,
            issue: t('styleMatch.issue.wideForehead') || '넓은 이마',
            solution: t('styleMatch.solution.wideForehead') || '이마를 자연스럽게 가리는 앞머리가 어울립니다'
        });
        recommendations.push({
            subCategory: ['EB', 'E', 'FH'],
            score: 30,
            reason: t('styleMatch.reason.bangsCover') || '앞머리로 이마 커버'
        });
        avoidances.push({
            subCategory: ['N'],
            score: -50,
            reason: t('styleMatch.reason.foreheadExposed') || '이마가 완전히 노출되어 더 넓어 보임'
        });
    } else if (raw.upperRatio < 0.30) {
        insights.push({
            type: 'narrow_forehead',
            value: `${ratios.upperRatio}%`,
            description: t('styleMatch.insight.narrowForehead') || `상안부가 평균보다 좁습니다 (${ratios.upperRatio}%)`,
            issue: t('styleMatch.issue.narrowForehead') || '좁은 이마',
            solution: t('styleMatch.solution.narrowForehead') || '이마를 드러내거나 볼륨있는 앞머리가 어울립니다'
        });
        recommendations.push({
            subCategory: ['N', 'FH'],
            score: 25,
            reason: t('styleMatch.reason.foreheadOpen') || '이마 노출로 균형감'
        });
    }

    // 2. 하안부 분석 (긴 얼굴)
    if (raw.lowerRatio > raw.middleRatio * 1.15) {
        insights.push({
            type: 'long_face',
            value: `${ratios.lowerRatio}%`,
            description: t('styleMatch.insight.longFace') || `하안부가 중안부보다 15% 이상 깁니다`,
            issue: t('styleMatch.issue.longFace') || '긴 얼굴형',
            solution: t('styleMatch.solution.longFace') || '가로 볼륨으로 세로 길이를 상쇄하는 스타일이 어울립니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['C LENGTH', 'D LENGTH', 'E LENGTH', 'F LENGTH'],
                score: 40,
                reason: t('styleMatch.reason.horizontalVolume') || '가로 볼륨으로 균형'
            });
            avoidances.push({
                mainCategory: ['A LENGTH', 'B LENGTH'],
                score: -20,
                reason: t('styleMatch.reason.verticalLonger') || '세로로 더 길어 보임'
            });
        } else {
            recommendations.push({
                mainCategory: ['SIDE PART', 'SIDE FRINGE'],
                score: 35,
                reason: t('styleMatch.reason.sideVolume') || '사이드 볼륨으로 균형'
            });
        }
    }

    // 3. 짧은 얼굴
    if (raw.lowerRatio < raw.middleRatio * 0.85) {
        insights.push({
            type: 'short_face',
            value: `${ratios.lowerRatio}%`,
            description: t('styleMatch.insight.shortFace') || `하안부가 중안부보다 짧습니다`,
            issue: t('styleMatch.issue.shortFace') || '짧은 얼굴형',
            solution: t('styleMatch.solution.shortFace') || '세로 길이를 연장하는 긴 기장이 어울립니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['A LENGTH', 'B LENGTH', 'C LENGTH'],
                score: 35,
                reason: t('styleMatch.reason.verticalExtend') || '세로 라인 연장'
            });
        } else {
            recommendations.push({
                mainCategory: ['FRINGE UP', 'PUSHED BACK', 'MOHICAN'],
                score: 30,
                reason: t('styleMatch.reason.topVolume') || '탑 볼륨으로 세로 연장'
            });
        }
    }

    // 4. 광대/턱 비율 분석
    if (ratios.cheekJawRatio < 1.15) {
        insights.push({
            type: 'square_jaw',
            value: `${ratios.cheekJawRatio}`,
            description: t('styleMatch.insight.squareJaw') || `광대와 턱 너비가 비슷합니다 (비율: ${ratios.cheekJawRatio})`,
            issue: t('styleMatch.issue.squareJaw') || '사각 턱선',
            solution: t('styleMatch.solution.squareJaw') || '부드러운 웨이브로 각진 인상을 완화합니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['A LENGTH', 'B LENGTH', 'C LENGTH', 'D LENGTH'],
                score: 30,
                reason: t('styleMatch.reason.softWave') || '부드러운 웨이브로 턱선 보완'
            });
            avoidances.push({
                mainCategory: ['F LENGTH', 'G LENGTH'],
                score: -40,
                reason: t('styleMatch.reason.jawExposed') || '턱선이 강조됨'
            });
        } else {
            recommendations.push({
                mainCategory: ['SIDE FRINGE', 'SIDE PART'],
                score: 25,
                reason: t('styleMatch.reason.sideSoftening') || '사이드 볼륨으로 턱선 완화'
            });
            avoidances.push({
                mainCategory: ['BUZZ', 'CROP'],
                score: -30,
                reason: t('styleMatch.reason.angularEmphasized') || '각진 인상 강조'
            });
        }
    } else if (ratios.cheekJawRatio > 1.35) {
        insights.push({
            type: 'oval_face',
            value: `${ratios.cheekJawRatio}`,
            description: t('styleMatch.insight.ovalFace') || `이상적인 계란형 얼굴입니다 (비율: ${ratios.cheekJawRatio})`,
            issue: null,
            solution: t('styleMatch.solution.ovalFace') || '대부분의 스타일이 잘 어울립니다'
        });
        // 계란형은 모든 스타일에 보너스
        recommendations.push({
            mainCategory: selectedGender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES,
            score: 10,
            reason: t('styleMatch.reason.idealShape') || '이상적인 얼굴형'
        });
    } else if (ratios.cheekJawRatio > 1.25) {
        insights.push({
            type: 'heart_face',
            value: `${ratios.cheekJawRatio}`,
            description: t('styleMatch.insight.heartFace') || `하트형/역삼각형 얼굴입니다 (비율: ${ratios.cheekJawRatio})`,
            issue: t('styleMatch.issue.heartFace') || '좁은 턱선',
            solution: t('styleMatch.solution.heartFace') || '턱 주변에 볼륨을 주는 스타일이 어울립니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['D LENGTH', 'E LENGTH', 'F LENGTH'],
                score: 35,
                reason: t('styleMatch.reason.chinVolume') || '턱 주변 볼륨으로 균형'
            });
        } else {
            recommendations.push({
                mainCategory: ['SIDE FRINGE', 'FRINGE UP'],
                score: 30,
                reason: t('styleMatch.reason.foreheadBalance') || '이마 볼륨 조절로 균형'
            });
        }
    }

    // 5. 얼굴형 타입 결정
    let faceType = determineFaceType(ratios);

    return {
        faceType,
        insights,
        recommendations,
        avoidances
    };
}

// 얼굴형 타입 결정
function determineFaceType(ratios) {
    const { cheekJawRatio, raw } = ratios;

    if (cheekJawRatio > 1.35) return { name: t('styleMatch.faceType.oval') || '계란형', code: 'oval' };
    if (cheekJawRatio < 1.15) return { name: t('styleMatch.faceType.square') || '사각형', code: 'square' };
    if (cheekJawRatio > 1.25) return { name: t('styleMatch.faceType.heart') || '하트형', code: 'heart' };
    if (raw.lowerRatio > raw.middleRatio * 1.1) return { name: t('styleMatch.faceType.long') || '긴 얼굴', code: 'long' };
    if (raw.lowerRatio < raw.middleRatio * 0.9) return { name: t('styleMatch.faceType.round') || '둥근형', code: 'round' };
    return { name: t('styleMatch.faceType.balanced') || '균형형', code: 'balanced' };
}

// ========== 결과 표시 ==========
function displayAnalysisResults(ratios, analysis) {
    // 섹션 표시
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('recommendationsSection').style.display = 'block';

    // 비율 표시
    document.getElementById('upperRatio').textContent = `${ratios.upperRatio}%`;
    document.getElementById('middleRatio').textContent = `${ratios.middleRatio}%`;
    document.getElementById('lowerRatio').textContent = `${ratios.lowerRatio}%`;

    // 바 애니메이션
    setTimeout(() => {
        document.getElementById('upperBar').style.width = `${ratios.upperRatio}%`;
        document.getElementById('middleBar').style.width = `${ratios.middleRatio}%`;
        document.getElementById('lowerBar').style.width = `${ratios.lowerRatio}%`;
    }, 100);

    // 상세 정보
    document.getElementById('faceWidthValue').textContent = `${ratios.faceWidth}`;
    document.getElementById('jawWidthValue').textContent = `${ratios.jawWidth}`;
    document.getElementById('cheekJawRatio').textContent = ratios.cheekJawRatio;

    // 얼굴형 배지
    document.getElementById('faceTypeBadge').textContent = analysis.faceType.name;

    // 분석 요약 생성
    generateSummaryText(analysis);
}

// 분석 요약 텍스트 생성
function generateSummaryText(analysis) {
    const summaryEl = document.getElementById('summaryText');
    let summaryParts = [];

    analysis.insights.forEach(insight => {
        if (insight.issue) {
            summaryParts.push(`${insight.description} ${insight.solution}`);
        } else {
            summaryParts.push(insight.description);
        }
    });

    if (summaryParts.length === 0) {
        summaryParts.push(t('styleMatch.summaryDefault') || '균형 잡힌 얼굴형으로 다양한 스타일이 어울립니다.');
    }

    summaryEl.textContent = summaryParts.join(' ');
}

// ========== 스타일 로드 (Netlify 함수 사용) ==========
async function loadStyles() {
    try {
        console.log('📥 스타일 로드 시작...');

        // Netlify 함수를 통해 스타일 로드 (Firestore 403 우회)
        const response = await fetch('/.netlify/functions/chatbot-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_styles_for_matching',
                payload: {}
            })
        });

        const data = await response.json();

        if (data.success && data.styles) {
            allStyles = data.styles;
            console.log(`✅ ${allStyles.length}개 스타일 로드 완료`);
        } else {
            console.error('스타일 로드 실패:', data.error);
        }
    } catch (error) {
        console.error('스타일 로드 실패:', error);
        // 폴백: 메인 앱의 스타일 사용 시도
        try {
            if (parent && parent.HAIRGATOR_STYLES) {
                allStyles = parent.HAIRGATOR_STYLES;
                console.log('✅ 메인 앱에서 스타일 로드');
            }
        } catch (e) {}
    }
}

// ========== 추천 생성 ==========
function generateRecommendations(analysis) {
    const container = document.getElementById('recommendationsContainer');
    container.innerHTML = '';

    const categories = selectedGender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES;

    console.log('🎨 추천 생성 시작:', selectedGender, '스타일 수:', allStyles.length);
    console.log('📂 카테고리:', categories);

    // 디버그: 스타일 샘플 출력
    if (allStyles.length > 0) {
        console.log('📋 샘플 스타일:', allStyles[0]);
        console.log('📋 gender 값들:', [...new Set(allStyles.map(s => s.gender))]);
        console.log('📋 mainCategory 값들:', [...new Set(allStyles.map(s => s.mainCategory))]);
    }

    // 스타일 데이터 확인 (대소문자 무시)
    const genderStyles = allStyles.filter(s =>
        s.gender && s.gender.toLowerCase() === selectedGender.toLowerCase()
    );
    console.log('👥 성별 필터링된 스타일:', genderStyles.length);

    // 카테고리별 데이터 수집 (점수순 정렬을 위해)
    const categoryResults = [];

    categories.forEach(category => {
        // 해당 카테고리 스타일 필터링 (대소문자 무시, type 조건 완화)
        const categoryStyles = allStyles.filter(s =>
            s.gender && s.gender.toLowerCase() === selectedGender.toLowerCase() &&
            s.mainCategory === category &&
            (s.type === 'cut' || !s.type)
        );

        console.log(`📁 ${category}: ${categoryStyles.length}개 스타일`);

        if (categoryStyles.length === 0) return;

        // 각 스타일에 점수 부여
        const scoredStyles = categoryStyles.map(style => {
            let score = 50; // 기본 점수
            let reasons = [];

            // 추천 조건 매칭
            analysis.recommendations.forEach(rec => {
                if (rec.mainCategory?.includes(style.mainCategory)) {
                    score += rec.score;
                    reasons.push({ type: 'positive', text: rec.reason, score: rec.score });
                }
                if (rec.subCategory?.includes(style.subCategory)) {
                    score += rec.score;
                    reasons.push({ type: 'positive', text: rec.reason, score: rec.score });
                }
            });

            // 회피 조건 매칭
            analysis.avoidances.forEach(avoid => {
                if (avoid.mainCategory?.includes(style.mainCategory)) {
                    score += avoid.score;
                    reasons.push({ type: 'negative', text: avoid.reason, score: avoid.score });
                }
                if (avoid.subCategory?.includes(style.subCategory)) {
                    score += avoid.score;
                    reasons.push({ type: 'negative', text: avoid.reason, score: avoid.score });
                }
            });

            return { ...style, score: Math.max(0, Math.min(100, score)), reasons };
        });

        // TOP 3 선정 (점수순)
        const top3 = scoredStyles
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // 카테고리 평균 점수 계산
        const avgScore = top3.length > 0
            ? Math.round(top3.reduce((sum, s) => sum + s.score, 0) / top3.length)
            : 0;

        categoryResults.push({
            category,
            avgScore,
            top3
        });
    });

    // ⭐ 카테고리를 평균 점수순으로 정렬 (높은 점수 먼저)
    categoryResults.sort((a, b) => b.avgScore - a.avgScore);

    console.log('📊 점수순 카테고리:', categoryResults.map(c => `${c.category}: ${c.avgScore}점`));

    // 정렬된 순서로 카드 생성
    categoryResults.forEach(({ category, top3 }) => {
        const categoryReason = generateCategoryReason(category, analysis, top3);
        const categoryCard = createCategoryCard(category, categoryReason, top3);
        container.appendChild(categoryCard);
    });
}

// 카테고리별 추천 이유 생성 (전문가 스타일)
function generateCategoryReason(category, analysis, topStyles) {
    const reasonParts = [];

    // 1. 얼굴 분석 기반 전문가 의견 생성
    const { insights, recommendations, avoidances, faceType } = analysis;

    // 이 카테고리가 추천되는 이유 찾기
    const matchedRecs = recommendations.filter(rec => rec.mainCategory?.includes(category));
    const matchedAvoids = avoidances.filter(avoid => avoid.mainCategory?.includes(category));

    // 추천 점수 계산
    const recScore = matchedRecs.reduce((sum, r) => sum + r.score, 0);
    const avoidScore = matchedAvoids.reduce((sum, a) => sum + a.score, 0);
    const totalScore = recScore + avoidScore;

    // 2. 얼굴형 기반 전문가 코멘트
    if (insights.length > 0) {
        const relevantInsights = insights.filter(ins => {
            // 이 카테고리와 관련된 인사이트 찾기
            return matchedRecs.some(rec => {
                if (ins.type === 'wide_forehead' && rec.subCategory) return true;
                if (ins.type === 'long_face' && rec.mainCategory) return true;
                if (ins.type === 'short_face' && rec.mainCategory) return true;
                if (ins.type === 'square_jaw' && rec.mainCategory) return true;
                if (ins.type === 'heart_face' && rec.mainCategory) return true;
                if (ins.type === 'oval_face') return true;
                return false;
            });
        });

        if (relevantInsights.length > 0) {
            const insight = relevantInsights[0];
            if (insight.issue) {
                reasonParts.push(`<strong>${insight.issue}</strong> 보완`);
            }
        }
    }

    // 3. 추천/비추천 이유 추가
    if (totalScore > 20) {
        matchedRecs.forEach(rec => {
            reasonParts.push(`${rec.reason} (+${rec.score}점)`);
        });
    } else if (totalScore < -10) {
        matchedAvoids.forEach(avoid => {
            reasonParts.push(`<span style="color: var(--accent-coral)">${avoid.reason}</span>`);
        });
    }

    // 4. 서브카테고리(앞머리) 기반 추가 설명
    if (topStyles.length > 0 && topStyles[0].subCategory) {
        const subCat = topStyles[0].subCategory;
        const subRecs = recommendations.filter(rec => rec.subCategory?.includes(subCat));
        subRecs.forEach(rec => {
            if (!reasonParts.includes(rec.reason)) {
                reasonParts.push(`${subCat} 앞머리: ${rec.reason}`);
            }
        });
    }

    // 5. 기본 설명 (아무 매칭이 없을 때)
    if (reasonParts.length === 0) {
        // 얼굴형에 따른 기본 전문가 코멘트
        if (faceType === 'oval') {
            reasonParts.push('균형 잡힌 얼굴형으로 다양한 스타일 소화 가능');
        } else if (faceType === 'long') {
            reasonParts.push('가로 볼륨으로 세로 비율 보정 권장');
        } else if (faceType === 'round') {
            reasonParts.push('세로 라인 강조로 얼굴 길이감 연출');
        } else if (faceType === 'square') {
            reasonParts.push('부드러운 라인으로 각진 인상 완화');
        } else if (faceType === 'heart') {
            reasonParts.push('하단 볼륨으로 좁은 턱선 보완');
        } else {
            reasonParts.push('얼굴형 분석 기반 추천');
        }
    }

    return reasonParts.join(' · ');
}

// 카테고리 카드 생성
function createCategoryCard(category, reason, styles) {
    const card = document.createElement('div');
    card.className = 'category-card';

    const avgScore = styles.length > 0
        ? Math.round(styles.reduce((sum, s) => sum + s.score, 0) / styles.length)
        : 0;

    card.innerHTML = `
        <div class="category-header">
            <span class="category-name">🎯 ${category}</span>
            <span class="category-badge">평균 ${avgScore}점</span>
        </div>
        <div class="category-reason">${reason}</div>
        <div class="style-cards">
            ${styles.map((style, idx) => `
                <div class="style-card" onclick="openStyleDetail('${style.styleId}')">
                    <img src="${style.resultImage}" alt="${style.name}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a24%22 width=%22100%22 height=%22100%22/><text fill=%22%23666%22 x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22>No Image</text></svg>'">
                    <div class="style-card-overlay">
                        <span class="style-rank">${idx + 1}</span>
                        <span class="style-score">${style.score}점</span>
                        <span class="style-name">${style.subCategory || ''}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="score-reasons">
            ${styles[0]?.reasons?.slice(0, 3).map(r => `
                <span class="reason-tag ${r.type}">
                    ${r.type === 'positive' ? '✓' : '⚠'} ${r.text}
                </span>
            `).join('') || ''}
        </div>
    `;

    return card;
}

// 스타일 상세 보기
window.openStyleDetail = function(styleId) {
    try {
        // 부모 창의 모달 열기
        if (parent && parent.openStyleModal) {
            const style = allStyles.find(s => s.styleId === styleId);
            if (style) {
                parent.openStyleModal(style);
            }
        }
    } catch (e) {
        console.log('스타일 상세 열기 실패:', e);
    }
};

// ========== 유틸리티 ==========
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

window.goBack = function() {
    // 카메라 정리
    stopCamera();

    try {
        if (parent && parent.hideStyleMatchView) {
            parent.hideStyleMatchView();
        } else {
            window.history.back();
        }
    } catch (e) {
        window.history.back();
    }
};

// 페이지 종료 시 카메라 정리
window.addEventListener('beforeunload', function() {
    stopCamera();
});

// 페이지 숨김 시 카메라 정리 (iOS Safari 등)
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isCameraMode) {
        stopCamera();
    }
});

// 새로 분석
window.resetAnalysis = function() {
    uploadedImage = null;
    selectedGender = null;
    analysisResults = null;

    document.getElementById('previewImage').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
    document.getElementById('uploadArea').classList.remove('has-image');
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('analyzeBtn').disabled = true;

    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('analysisSection').style.display = 'none';
    document.getElementById('recommendationsSection').style.display = 'none';
};
