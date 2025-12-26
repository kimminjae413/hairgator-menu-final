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
    const uploadTab = document.querySelector('.mode-tab[data-mode="upload"]');
    const cameraTab = document.querySelector('.mode-tab[data-mode="camera"]');
    if (cameraTab) cameraTab.classList.add('active');
    if (uploadTab) uploadTab.classList.remove('active');

    const cameraArea = document.getElementById('cameraArea');
    if (cameraArea) cameraArea.style.display = 'block';
    if (uploadArea) uploadArea.style.display = 'none';

    // 카메라 자동 시작
    startCamera();
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
    console.log('🛑 stopCamera 호출됨');

    // 1. 카메라 스트림 종료
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 트랙 종료:', track.kind);
        });
        cameraStream = null;
    }

    // 2. 비디오 요소 정리
    const video = document.getElementById('cameraPreview');
    if (video) {
        video.srcObject = null;
        video.pause();
    }

    // 3. FaceMesh 정리
    if (cameraFaceMesh) {
        cameraFaceMesh.close();
        cameraFaceMesh = null;
    }

    // 4. 상태 초기화
    isCameraMode = false;
    isFaceDetected = false;
    lastFaceResults = null;
    clearLandmarkCanvas();

    console.log('🛑 카메라 완전 종료됨');
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

    // 2. 하안부 분석 (긴 얼굴) - 하안부가 40% 이상이면 긴 얼굴로 판단
    const isLongFace = raw.lowerRatio > 0.40 || raw.lowerRatio > raw.middleRatio * 1.15;
    const isShortFace = raw.lowerRatio < 0.28 || raw.lowerRatio < raw.middleRatio * 0.85;

    if (isLongFace) {
        insights.push({
            type: 'long_face',
            value: `${ratios.lowerRatio}%`,
            description: `하안부가 평균(33%)보다 깁니다 (${ratios.lowerRatio}%)`,
            issue: '긴 하관/긴 얼굴형',
            solution: '가로 볼륨으로 세로 길이를 상쇄하는 스타일이 어울립니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['C LENGTH', 'D LENGTH', 'E LENGTH', 'F LENGTH'],
                score: 40,
                reason: '가로 볼륨으로 세로 비율 보정'
            });
            avoidances.push({
                mainCategory: ['A LENGTH', 'B LENGTH'],
                score: -20,
                reason: '긴 기장이 얼굴을 더 길어 보이게 함'
            });
        } else {
            // 긴 얼굴 남자: 사이드 볼륨 추천
            recommendations.push({
                mainCategory: ['SIDE PART', 'SIDE FRINGE'],
                score: 50,
                reason: '사이드 볼륨으로 얼굴 길이 분산'
            });
            // ⚠️ 긴 얼굴에 탑 볼륨 스타일은 감점!
            avoidances.push({
                mainCategory: ['FRINGE UP', 'PUSHED BACK', 'MOHICAN'],
                score: -30,
                reason: '탑 볼륨이 얼굴을 더 길어 보이게 함 (주의)'
            });
        }
    }

    // 3. 짧은 얼굴 - 하안부가 28% 이하
    if (isShortFace) {
        insights.push({
            type: 'short_face',
            value: `${ratios.lowerRatio}%`,
            description: `하안부가 평균(33%)보다 짧습니다 (${ratios.lowerRatio}%)`,
            issue: '짧은 얼굴형',
            solution: '세로 길이를 연장하는 스타일이 어울립니다'
        });
        if (selectedGender === 'female') {
            recommendations.push({
                mainCategory: ['A LENGTH', 'B LENGTH', 'C LENGTH'],
                score: 35,
                reason: '긴 기장으로 세로 라인 연장'
            });
        } else {
            // ✅ 짧은 얼굴에만 탑 볼륨 추천!
            recommendations.push({
                mainCategory: ['FRINGE UP', 'PUSHED BACK', 'MOHICAN'],
                score: 30,
                reason: '탑 볼륨으로 시선을 위로 끌어올려 얼굴이 갸름해 보임'
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

// ========== 디자이너 처방 ==========
let selectedPrescription = null;

// 처방 선택
window.selectPrescription = function(treatment) {
    selectedPrescription = treatment;

    // 버튼 활성화 상태 업데이트
    document.querySelectorAll('.prescription-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.treatment === treatment);
    });
};

// AI 추천 처방 계산
function getAIPrescription(ratios) {
    const { lowerRatio, cheekJawRatio, upperRatio } = ratios.raw;

    // 긴 얼굴 → 살리기 (볼륨)
    if (lowerRatio > 0.40) {
        return { treatment: 'volume', reason: '긴 얼굴 → 옆볼륨으로 길이 분산' };
    }
    // 둥근/짧은 얼굴 → 누르기 (슬림)
    if (lowerRatio < 0.30 || cheekJawRatio > 1.4) {
        return { treatment: 'down', reason: '둥근 얼굴 → 옆 눌러서 길어 보이게' };
    }
    // 사각턱/광대 → 가리기
    if (cheekJawRatio < 1.15) {
        return { treatment: 'cover', reason: '사각 턱선 → 옆머리로 자연스럽게 커버' };
    }
    // 기본값
    return { treatment: 'volume', reason: '균형잡힌 얼굴형' };
}

// 처방 확인 → 스타일 추천
window.confirmPrescription = function() {
    if (!selectedPrescription) {
        alert('처방을 선택해주세요');
        return;
    }

    // 처방 섹션 숨기고 추천 섹션 표시
    document.getElementById('prescriptionSection').style.display = 'none';
    document.getElementById('recommendationsSection').style.display = 'block';

    // 현재 처방 태그 표시
    const prescriptionNames = {
        'down': '⬇️ 누르기 (Slim)',
        'volume': '⬆️ 살리기 (Volume)',
        'cover': '🙈 가리기 (Cover)'
    };
    document.getElementById('currentPrescription').style.display = 'flex';
    document.getElementById('prescriptionTag').textContent = `처방: ${prescriptionNames[selectedPrescription]}`;

    // 처방 기반 스타일 추천 재정렬
    renderRecommendationsWithPrescription(selectedPrescription);
};

// 처방 변경
window.changePrescription = function() {
    document.getElementById('recommendationsSection').style.display = 'none';
    document.getElementById('currentPrescription').style.display = 'none';
    document.getElementById('prescriptionSection').style.display = 'block';
};

// ========== 처방 기반 추천 재정렬 ==========
function renderRecommendationsWithPrescription(prescription) {
    if (!analysisResults) {
        console.error('분석 결과가 없습니다');
        return;
    }

    const { analysis } = analysisResults;
    const container = document.getElementById('recommendationsContainer');
    container.innerHTML = '';

    const categories = selectedGender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES;

    console.log('🎯 처방 기반 추천 생성:', prescription);

    // 처방별 점수 수정자 정의
    // subCategory 전체 이름 사용: 'None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'
    const prescriptionModifiers = {
        'down': {
            // 누르기: 슬릭/다운 스타일 부스트, 볼륨 스타일 감점
            subCategoryBoost: ['None', 'Fore Head'],  // 노앞머리, 이마 앞머리는 슬릭에 적합
            subCategoryPenalty: ['Cheekbone'],         // 광대뼈 앞머리는 볼륨감 있어서 감점
            styleKeywords: ['슬릭', 'slick', '다운', 'down', '투블럭', '밀착', '눌러', '납작'],
            avoidKeywords: ['볼륨', 'volume', '뿌리', 'C컬', '웨이브', '부피'],
            boostScore: 25,
            penaltyScore: -15
        },
        'volume': {
            // 살리기: 볼륨/웨이브 스타일 부스트, 슬릭 스타일 감점
            subCategoryBoost: ['Cheekbone', 'Eye'],   // 광대뼈, 눈앞머리는 볼륨감에 적합
            subCategoryPenalty: ['None'],              // 노앞머리는 볼륨 없어서 감점
            styleKeywords: ['볼륨', 'volume', '뿌리', 'C컬', '웨이브', 'wave', '레이어', '텍스처'],
            avoidKeywords: ['슬릭', 'slick', '다운', 'down', '밀착', '납작'],
            boostScore: 25,
            penaltyScore: -15
        },
        'cover': {
            // 가리기: 사이드뱅/레이어드 부스트, 노앞머리 큰 감점
            subCategoryBoost: ['Eye Brow', 'Eye', 'Cheekbone'],  // 눈썹, 눈, 광대 앞머리로 커버
            subCategoryPenalty: ['None'],                         // 노앞머리는 가리기에 부적합
            styleKeywords: ['사이드뱅', 'side', '레이어', 'layer', '앞머리', '커버', '가리'],
            avoidKeywords: [],
            boostScore: 30,
            penaltyScore: -25
        }
    };

    const modifier = prescriptionModifiers[prescription] || prescriptionModifiers['volume'];

    // 카테고리별 데이터 수집
    const categoryResults = [];

    categories.forEach(category => {
        const categoryStyles = allStyles.filter(s =>
            s.gender && s.gender.toLowerCase() === selectedGender.toLowerCase() &&
            s.mainCategory === category &&
            (s.type === 'cut' || !s.type)
        );

        if (categoryStyles.length === 0) return;

        // 각 스타일에 점수 부여 (기존 분석 + 처방 수정자)
        const scoredStyles = categoryStyles.map(style => {
            let score = 50; // 기본 점수
            let reasons = [];

            // 1. 기존 분석 기반 점수 (recommendations, avoidances)
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

            // 2. 처방 기반 점수 수정
            const styleName = (style.styleName || '').toLowerCase();
            const textRecipe = (style.textRecipe || '').toLowerCase();
            const searchText = `${styleName} ${textRecipe}`;

            // subCategory 부스트/감점
            if (modifier.subCategoryBoost.includes(style.subCategory)) {
                score += modifier.boostScore;
                reasons.push({
                    type: 'positive',
                    text: `${prescription === 'down' ? '누르기' : prescription === 'volume' ? '살리기' : '가리기'} 처방에 적합`,
                    score: modifier.boostScore
                });
            }
            if (modifier.subCategoryPenalty.includes(style.subCategory)) {
                score += modifier.penaltyScore;
                reasons.push({
                    type: 'negative',
                    text: `${prescription === 'down' ? '누르기' : prescription === 'volume' ? '살리기' : '가리기'} 처방에 부적합`,
                    score: modifier.penaltyScore
                });
            }

            // 키워드 기반 부스트/감점
            const hasBoostKeyword = modifier.styleKeywords.some(kw => searchText.includes(kw.toLowerCase()));
            const hasPenaltyKeyword = modifier.avoidKeywords.some(kw => searchText.includes(kw.toLowerCase()));

            if (hasBoostKeyword) {
                score += 15;
                reasons.push({ type: 'positive', text: '처방 키워드 매칭', score: 15 });
            }
            if (hasPenaltyKeyword) {
                score -= 10;
                reasons.push({ type: 'negative', text: '처방 회피 키워드', score: -10 });
            }

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

    // 카테고리를 평균 점수순으로 정렬 (높은 점수 먼저)
    categoryResults.sort((a, b) => b.avgScore - a.avgScore);

    console.log('📊 처방 적용 후 점수순:', categoryResults.map(c => `${c.category}: ${c.avgScore}점`));

    // 정렬된 순서로 카드 생성
    categoryResults.forEach(({ category, top3 }) => {
        const categoryReason = generateCategoryReasonWithPrescription(category, analysis, top3, prescription);
        const categoryCard = createCategoryCard(category, categoryReason, top3);
        container.appendChild(categoryCard);
    });
}

// 처방 기반 카테고리 추천 이유 생성
function generateCategoryReasonWithPrescription(category, analysis, topStyles, prescription) {
    const prescriptionDesc = {
        'down': '옆 볼륨을 눌러 슬림하게',
        'volume': '옆 볼륨을 살려 얼굴 비율 보정',
        'cover': '옆머리로 자연스럽게 커버'
    };

    const baseReason = generateCategoryReason(category, analysis, topStyles);
    const prescriptionNote = prescriptionDesc[prescription] || '';

    return `<strong>✂️ ${prescriptionNote}</strong><br>${baseReason}`;
}

// ========== 결과 표시 ==========
function displayAnalysisResults(ratios, analysis) {
    // 카메라 종료 (결과 화면에서는 카메라 불필요)
    stopCamera();

    // 섹션 표시 (추천은 처방 확인 후 표시)
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('prescriptionSection').style.display = 'block';
    document.getElementById('recommendationsSection').style.display = 'none';

    // AI 추천 처방 계산 및 프리셀렉트
    const aiPrescription = getAIPrescription(ratios);
    selectedPrescription = aiPrescription.treatment;
    document.getElementById('prescriptionHint').textContent = `AI 추천: ${aiPrescription.reason}`;

    // 추천 버튼 프리셀렉트
    document.querySelectorAll('.prescription-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.treatment === aiPrescription.treatment);
    });

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

// 스타일별 개별 추천 이유 생성 (조건부 로직)
function generateStyleReason(style, analysis, ratios) {
    const reasons = [];

    if (!ratios || !ratios.raw) {
        return '얼굴형 분석 기반 추천';
    }

    const { upperRatio, lowerRatio, cheekJawRatio } = ratios.raw;
    const isLongFace = lowerRatio > 0.40;
    const isShortFace = lowerRatio < 0.28;
    const isSquareJaw = cheekJawRatio < 1.15;
    const isOvalFace = cheekJawRatio > 1.35;
    const isWideForehead = upperRatio > 0.36;
    const isNarrowForehead = upperRatio < 0.25;

    const styleName = (style.name || '').toLowerCase();
    const mainCat = style.mainCategory || '';
    const subCat = style.subCategory || '';

    // 탑 볼륨 스타일 (FRINGE UP, PUSHED BACK, MOHICAN)
    const isTopVolumeStyle = ['FRINGE UP', 'PUSHED BACK', 'MOHICAN'].includes(mainCat);

    // 사이드 볼륨 스타일
    const isSideVolumeStyle = ['SIDE PART', 'SIDE FRINGE'].includes(mainCat);

    // 짧은 머리 스타일 (턱선 노출)
    const isShortStyle = ['BUZZ', 'CROP'].includes(mainCat);

    // 슬릭/타이트 스타일 (볼륨 없음)
    const isSlickStyle = styleName.includes('슬릭') || styleName.includes('slick');

    // 드롭컷: 앞머리를 내려뜨리는 스타일 (실제로는 탑볼륨 아님)
    const isDropStyle = styleName.includes('드롭') || styleName.includes('drop');

    // ===== 조건부 멘트 생성 =====

    // 1. 탑 볼륨 + 얼굴 길이 조합 (드롭컷은 탑볼륨 카테고리여도 실제론 내려뜨리는 스타일)
    if (isTopVolumeStyle && !isDropStyle) {
        if (isLongFace) {
            reasons.push(`⚠️ 하안부 ${ratios.lowerRatio}% (긴 편) → 탑 볼륨이 얼굴을 더 길어 보이게 할 수 있음`);
        } else if (isShortFace) {
            reasons.push(`✓ 하안부 ${ratios.lowerRatio}% (짧은 편) → 탑 볼륨이 시선을 위로 끌어올려 얼굴이 갸름해 보임`);
        } else {
            reasons.push(`탑 볼륨으로 세련된 인상 연출`);
        }
    }

    // 1-2. 드롭컷: 앞머리를 자연스럽게 내려뜨리는 스타일 (탑볼륨 카테고리지만 다르게 처리)
    if (isDropStyle) {
        if (isLongFace) {
            reasons.push(`✓ 드롭 스타일: 앞머리가 자연스럽게 내려와 세로 길이 분산`);
        } else if (isWideForehead) {
            reasons.push(`✓ 드롭 스타일: 내려뜨린 앞머리로 넓은 이마 자연스럽게 커버`);
        } else {
            reasons.push(`드롭 스타일: 자연스러운 흐름으로 부드러운 인상`);
        }
    }

    // 2. 사이드 볼륨 + 얼굴 길이 조합
    if (isSideVolumeStyle) {
        if (isLongFace) {
            reasons.push(`✓ 하안부 ${ratios.lowerRatio}% → 사이드 볼륨이 시선을 가로로 분산시켜 얼굴 길이 완화`);
        } else if (isShortFace) {
            reasons.push(`하안부 ${ratios.lowerRatio}% (짧은 편) → 사이드 볼륨이 얼굴을 더 짧아 보이게 할 수 있음`);
        }
        // 슬릭 스타일은 사이드 볼륨 설명 제외
        if (isSlickStyle) {
            reasons.length = 0; // 기존 이유 제거
            reasons.push(`깔끔한 라인 정리로 단정한 인상`);
        }
    }

    // 3. 짧은 머리 + 턱선 조합
    if (isShortStyle) {
        if (isSquareJaw) {
            reasons.push(`⚠️ 광대/턱 비율 ${ratios.cheekJawRatio} → 짧은 기장이 각진 턱선을 그대로 노출`);
        } else if (isOvalFace) {
            reasons.push(`✓ 계란형(${ratios.cheekJawRatio}) → 어떤 기장이든 잘 어울림`);
        } else {
            reasons.push(`깔끔하고 시원한 인상`);
        }
    }

    // 4. 이마 관련
    if (isWideForehead) {
        if (subCat === 'EB' || subCat === 'Eye Brow') {
            reasons.push(`상안부 ${ratios.upperRatio}% → 눈썹 기장 앞머리로 넓은 이마 자연스럽게 커버`);
        } else if (subCat === 'E' || subCat === 'Eye') {
            reasons.push(`상안부 ${ratios.upperRatio}% → 눈 기장 앞머리로 이마 완전 커버`);
        } else if (subCat === 'N' || subCat === 'None' || !subCat) {
            if (isTopVolumeStyle || mainCat === 'PUSHED BACK') {
                reasons.push(`⚠️ 상안부 ${ratios.upperRatio}% (넓은 편) → 앞머리 없이 이마가 완전 노출됨`);
            }
        }
    } else if (isNarrowForehead) {
        if (subCat === 'N' || subCat === 'None' || !subCat) {
            reasons.push(`✓ 상안부 ${ratios.upperRatio}% (좁은 편) → 이마 노출로 균형감 있는 비율`);
        }
    }

    // 5. 사각턱 + 기장 조합 (슬릭 스타일 제외)
    if (isSquareJaw && !isShortStyle && !isSlickStyle) {
        if (mainCat.includes('LENGTH') || isSideVolumeStyle) {
            reasons.push(`광대/턱 비율 ${ratios.cheekJawRatio} → 기장감/볼륨으로 각진 턱선 소프닝`);
        }
    }

    // 슬릭 스타일 + 사각턱: 볼륨 대신 다른 설명
    if (isSlickStyle && isSquareJaw) {
        reasons.push(`슬릭한 라인으로 시크한 분위기 연출`);
    }

    // 6. 계란형은 대부분 OK
    if (isOvalFace && reasons.length === 0) {
        reasons.push(`✓ 이상적인 계란형(${ratios.cheekJawRatio}) → 다양한 스타일 소화 가능`);
    }

    // 7. 스타일 reasons 배열에서 추가 (중복 제외)
    if (style.reasons && style.reasons.length > 0 && reasons.length < 2) {
        style.reasons.forEach(r => {
            if (r.type === 'positive' && !reasons.some(existing => existing.includes(r.text))) {
                reasons.push(`✓ ${r.text}`);
            } else if (r.type === 'negative' && !reasons.some(existing => existing.includes(r.text))) {
                reasons.push(`⚠️ ${r.text}`);
            }
        });
    }

    // 8. 기본 이유
    if (reasons.length === 0) {
        reasons.push('균형 잡힌 얼굴형에 적합한 스타일');
    }

    return reasons.slice(0, 2).join(' / ');
}

// 카테고리 카드 생성
function createCategoryCard(category, reason, styles, ratios) {
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
            ${styles.map((style, idx) => {
                const styleReason = generateStyleReason(style, analysisResults?.analysis, analysisResults?.ratios);
                return `
                <div class="style-card" onclick="openStyleDetail('${style.styleId}')">
                    <div class="style-card-rank">${idx + 1}</div>
                    <div class="style-card-name">${style.name || 'ChrisKiLAB'}</div>
                    <img src="${style.resultImage}" alt="${style.name}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a24%22 width=%22100%22 height=%22100%22/><text fill=%22%23666%22 x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22>No Image</text></svg>'">
                    <div class="style-card-info">
                        <span class="style-score">${style.score}점</span>
                    </div>
                    <div class="style-card-reason">${styleReason}</div>
                </div>
            `}).join('')}
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
                // openStyleModal은 id 필드를 사용하므로 매핑
                const styleWithId = {
                    ...style,
                    id: style.styleId || styleId
                };
                console.log('📂 스타일 모달 열기:', styleWithId.name, styleWithId.id);
                parent.openStyleModal(styleWithId);
            } else {
                console.warn('⚠️ 스타일을 찾을 수 없음:', styleId);
            }
        } else {
            console.warn('⚠️ parent.openStyleModal 없음');
        }
    } catch (e) {
        console.error('스타일 상세 열기 실패:', e);
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

// ========== 카메라 종료 이벤트 (강화) ==========

// 페이지 종료 시
window.addEventListener('beforeunload', function(e) {
    console.log('📤 beforeunload 이벤트');
    stopCamera();
});

// bfcache 대응 - 페이지 숨김 시
window.addEventListener('pagehide', function(e) {
    console.log('📤 pagehide 이벤트, persisted:', e.persisted);
    stopCamera();
});

// 페이지 완전 언로드
window.addEventListener('unload', function() {
    console.log('📤 unload 이벤트');
    stopCamera();
});

// bfcache에서 복원될 때 - 카메라 상태 확인
window.addEventListener('pageshow', function(e) {
    console.log('📥 pageshow 이벤트, persisted:', e.persisted);
    if (e.persisted) {
        // bfcache에서 복원됨 - 카메라 종료 확인
        stopCamera();
    }
});

// 탭 전환/백그라운드 시 (iOS Safari 등)
document.addEventListener('visibilitychange', function() {
    console.log('👁 visibilitychange:', document.hidden ? 'hidden' : 'visible');
    if (document.hidden) {
        stopCamera();
    }
});

// 히스토리 변경 시 (뒤로가기 제스처)
window.addEventListener('popstate', function() {
    console.log('⬅️ popstate 이벤트');
    stopCamera();
});

// 페이지 로드 시 이전 카메라 상태만 정리 (새 카메라 시작 안함)
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수만 초기화 (getUserMedia 호출 안함 - 호출하면 카메라 시작됨)
    cameraStream = null;
    isCameraMode = false;
    isFaceDetected = false;
    lastFaceResults = null;
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
