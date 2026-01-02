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
    forehead_top: 10,   // 이마 상단
    // 눈썹 분석용 랜드마크
    left_eye_top: 159,  // 좌 눈 상단 (눈썹-눈 거리 계산용)
    right_eye_top: 386  // 우 눈 상단
};

// ========== 눈썹 랜드마크 (5점 시스템) ==========
const EYEBROW_LANDMARKS = {
    left: {
        start: 70,      // 눈썹 시작점 (안쪽)
        prePeak: 63,    // 산 전
        peak: 105,      // 눈썹 산 (Peak) - 가장 높은 점
        postPeak: 66,   // 산 후
        end: 46         // 눈썹 꼬리 (바깥쪽)
    },
    right: {
        start: 300,     // 눈썹 시작점 (안쪽)
        prePeak: 293,   // 산 전
        peak: 334,      // 눈썹 산 (Peak)
        postPeak: 296,  // 산 후
        end: 276        // 눈썹 꼬리 (바깥쪽)
    }
};

// ========== 눈썹 분류 임계값 ==========
const EYEBROW_THRESHOLDS = {
    // 라인 분류 (Arch_Ratio)
    arch: {
        high: 0.15,     // 아치형 (Arched) - 원계
        low: 0.08       // 스트레이트형 (Straight) - 쿨계
        // 그 사이: 내추럴형 (Natural) - 뉴트럴계
    },
    // 꼬리 각도 (Tail_Angle)
    tailAngle: {
        steep: 25,      // 급격한 하강 (아치형)
        flat: 10        // 거의 수평 (스트레이트형)
    },
    // 텍스쳐 분류 (Density)
    density: {
        hard: 80,       // 진한 눈썹 (Hard)
        soft: 120       // 연한 눈썹 (Soft)
    },
    // 두께 비율 (Thickness_Ratio)
    thickness: {
        thick: 0.25,    // 두꺼운 눈썹
        thin: 0.15      // 얇은 눈썹
    },
    // 눈썹-눈 거리 보정 (Low Straight 예외 처리)
    browEyeDistance: {
        low: 0.8        // 이 비율 미만이면 쿨계 → 뉴트럴계로 보정
    }
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

// ========== 스타일별 고유 특징 (추천 사유 다변화용) ==========
const STYLE_FEATURES = {
    // 남자 스타일
    '댄디': { keywords: ['부드러운 곡선', '자연스러움', '호불호 없음'], mood: 'classic', benefit: '대부분의 얼굴형과 조화를 이룸' },
    '시스루': { keywords: ['가벼움', '시원함', '답답함 해소'], mood: 'light', benefit: '앞머리 숱을 비워 이마를 부분 노출' },
    '슬릭': { keywords: ['세련됨', '직선미', '도시적'], mood: 'chic', benefit: '깔끔하게 정돈된 라인으로 시크한 무드' },
    '투블럭': { keywords: ['시원함', '관리 편함', '깔끔함'], mood: 'clean', benefit: '옆라인을 짧게 정리해 청량감 연출' },
    '리젠트': { keywords: ['클래식', '댄디', '고급스러움'], mood: 'classic', benefit: '정통 신사 스타일로 격식있는 자리에 적합' },
    '애즈': { keywords: ['트렌디', '캐주얼', '자연스러움'], mood: 'casual', benefit: '힘 빠진 듯 자연스러운 흐름이 트렌디함' },
    '포마드': { keywords: ['광택', '정돈됨', '세련됨'], mood: 'chic', benefit: '광택 있는 스타일링으로 고급스러운 인상' },
    '쉐도우': { keywords: ['그라데이션', '부드러움', '자연스러움'], mood: 'natural', benefit: '경계선 없이 자연스럽게 연결' },
    '드롭': { keywords: ['자연스러움', '볼륨', '내추럴'], mood: 'natural', benefit: '앞머리가 자연스럽게 흘러내려 편안한 무드' },
    '스왈로': { keywords: ['볼륨', '세련됨', '에어리'], mood: 'volume', benefit: '정수리 볼륨으로 세련된 실루엣' },
    '크롭': { keywords: ['짧음', '깔끔', '시원함'], mood: 'minimal', benefit: '짧은 기장으로 관리 편하고 시원함' },
    '버즈': { keywords: ['미니멀', '남성적', '시원함'], mood: 'minimal', benefit: '극단적으로 짧아 청량하고 관리 제로' },
    '모히칸': { keywords: ['개성', '볼륨', '임팩트'], mood: 'bold', benefit: '중심 볼륨으로 강렬한 개성 표현' },
    '텍스쳐': { keywords: ['질감', '움직임', '역동적'], mood: 'dynamic', benefit: '레이어드 커팅으로 움직임이 살아있음' },
    '레이어': { keywords: ['가벼움', '볼륨', '움직임'], mood: 'dynamic', benefit: '층이 있어 자연스러운 볼륨과 움직임' },
    '웨이브': { keywords: ['부드러움', '볼륨', '로맨틱'], mood: 'soft', benefit: '곡선적인 흐름으로 부드러운 인상' },
    '컬': { keywords: ['볼륨', '볼륨감', '로맨틱'], mood: 'soft', benefit: '펌으로 만든 컬이 풍성한 볼륨 연출' },
    '언더컷': { keywords: ['대비', '시원함', '트렌디'], mood: 'contrast', benefit: '상하 기장 대비로 모던한 느낌' },
    '사이드': { keywords: ['가르마', '균형', '클래식'], mood: 'classic', benefit: '가르마 라인으로 얼굴 비율 보정' },
    '올백': { keywords: ['시원함', '자신감', '세련됨'], mood: 'bold', benefit: '이마를 전부 노출해 시원하고 자신감 있는 인상' },
    '가르마': { keywords: ['균형', '정돈됨', '클래식'], mood: 'classic', benefit: '가르마로 시선을 분산시켜 균형잡힌 비율' },

    // 여자 스타일 (기장 기반)
    '숏컷': { keywords: ['경쾌함', '시원함', '개성'], mood: 'dynamic', benefit: '짧은 기장으로 개성 있고 관리 편함' },
    '단발': { keywords: ['깔끔함', '세련됨', '모던'], mood: 'clean', benefit: '턱선 기장으로 세련되고 깔끔한 인상' },
    '미디엄': { keywords: ['균형', '다양성', '자연스러움'], mood: 'balanced', benefit: '다양한 스타일링이 가능한 만능 기장' },
    '롱헤어': { keywords: ['여성스러움', '우아함', '클래식'], mood: 'elegant', benefit: '길이감으로 우아하고 여성스러운 분위기' },
    '레이어드': { keywords: ['볼륨', '움직임', '가벼움'], mood: 'dynamic', benefit: '층으로 자연스러운 볼륨과 움직임' },
    '허쉬': { keywords: ['볼륨', '풍성함', '화려함'], mood: 'volume', benefit: '풍성한 볼륨으로 화려한 실루엣' },
    '샤기': { keywords: ['텍스쳐', '자유로움', '트렌디'], mood: 'casual', benefit: '거친 듯 자연스러운 질감이 트렌디' },
    '히메': { keywords: ['청순', '여성스러움', '러블리'], mood: 'cute', benefit: '동양적인 청순함과 귀여움 연출' },
    '뱅': { keywords: ['이마 커버', '동안', '귀여움'], mood: 'cute', benefit: '앞머리로 이마를 덮어 동안 효과' },
    '시스루뱅': { keywords: ['투명함', '가벼움', '시원함'], mood: 'light', benefit: '비침있는 앞머리로 답답함 없이 이마 커버' },
    '풀뱅': { keywords: ['볼륨', '이마 커버', '또렷함'], mood: 'bold', benefit: '두꺼운 앞머리로 이마를 완전히 덮어 눈이 강조됨' },
    'C컬': { keywords: ['볼륨', '자연스러움', '여성스러움'], mood: 'soft', benefit: 'C자 컬로 끝단에 자연스러운 볼륨' },
    'S컬': { keywords: ['볼륨', '웨이브', '풍성함'], mood: 'volume', benefit: 'S자 웨이브로 풍성하고 화려한 분위기' },
    '보브': { keywords: ['단정함', '세련됨', '클래식'], mood: 'classic', benefit: '단정하게 떨어지는 라인으로 깔끔한 인상' },
    '울프': { keywords: ['개성', '레이어', '트렌디'], mood: 'dynamic', benefit: '아래로 갈수록 길어지는 레이어가 개성적' },
    '태슬': { keywords: ['끝단 질감', '움직임', '에어리'], mood: 'dynamic', benefit: '끝단 커팅으로 가볍고 에어리한 느낌' }
};

// 얼굴 분석 결과별 연결 멘트 (스타일과 얼굴의 조합 설명)
const FACE_STYLE_COMBINATIONS = {
    // 긴 얼굴 + 스타일 조합
    'long_side_volume': '사이드 볼륨이 시선을 가로로 분산시켜 세로 비율 완화',
    'long_wave': '웨이브가 좌우로 시선을 분산시켜 얼굴 길이 착시 완화',
    'long_layer': '층이 있는 레이어가 가로 볼륨을 만들어 비율 보정',
    'long_curl': '컬의 볼륨이 얼굴 옆을 채워 길이감 분산',

    // 짧은 얼굴 + 스타일 조합
    'short_top_volume': '탑 볼륨으로 시선을 위로 끌어올려 갸름한 인상',
    'short_up': '올림머리로 세로 라인 강조, 얼굴이 길어 보이는 효과',

    // 사각턱 + 스타일 조합
    'square_soft': '부드러운 곡선이 각진 턱선을 감싸듯 커버',
    'square_layer': '레이어드 기장이 턱선을 자연스럽게 소프닝',
    'square_wave': '웨이브가 직선적인 턱라인에 곡선미를 더해줌',

    // 넓은 이마 + 스타일 조합
    'wide_forehead_bang': '앞머리가 넓은 이마를 자연스럽게 가려줌',
    'wide_forehead_seethrough': '비침있는 앞머리로 답답함 없이 이마 커버',

    // 좁은 이마 + 스타일 조합
    'narrow_forehead_no_bang': '이마 노출로 좁은 이마가 오히려 비율 좋게 보임',
    'narrow_forehead_volume': '이마 위 볼륨으로 상단부 시각적 확장',

    // 이미지 타입 + 스타일 조합
    'warm_slick': '또렷한 인상(웜계)에 슬릭한 라인이 시크함을 극대화',
    'warm_undercut': '웜계 특유의 시원함이 언더컷의 대비와 시너지',
    'cool_wave': '부드러운 인상(쿨계)에 웨이브가 로맨틱 무드 배가',
    'cool_curl': '쿨계의 집중된 인상에 컬이 포인트를 더해줌',
    'neutral_classic': '균형잡힌 인상(뉴트럴)에 클래식 스타일이 안정감'
};

// ========== 접근 제한 ==========
// 허용 요금제 (베이직 이상)
const ALLOWED_PLANS = ['basic', 'pro', 'business'];

// Firestore에서 사용자 요금제 확인
async function checkAccessFromFirestore(email) {
    if (!email) return { allowed: false, plan: null };

    try {
        const db = firebase.firestore();
        const emailDocId = email.replace(/[@.]/g, '_');
        const userDoc = await db.collection('users').doc(emailDocId).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const userPlan = userData.plan || 'free';
            const isAllowed = ALLOWED_PLANS.includes(userPlan);

            console.log(`📋 사용자 요금제: ${userPlan}, 접근 허용: ${isAllowed}`);
            return { allowed: isAllowed, plan: userPlan };
        }

        console.log('❌ Firestore에서 사용자 없음:', email);
        return { allowed: false, plan: null };
    } catch (e) {
        console.log('Firestore 오류:', e);
        return { allowed: false, plan: null };
    }
}

// [REMOVED] getUserEmail - 초기화 로직에 직접 통합됨

function showAccessDenied(userPlan) {
    const planName = userPlan === 'free' ? '무료' : userPlan || '무료';
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a2e; color: #fff; font-family: 'Noto Sans KR', sans-serif; text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
            <h1 style="font-size: 22px; margin-bottom: 12px; font-weight: 600;">AI 스타일 매칭</h1>
            <p style="color: #888; font-size: 14px; margin-bottom: 8px;">베이직 플랜 이상에서 사용 가능합니다.</p>
            <p style="color: #666; font-size: 13px; margin-bottom: 24px;">현재 플랜: ${planName}</p>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 200px;">
                <button onclick="goToProductsPage()" style="padding: 14px 24px; background: linear-gradient(135deg, #E91E63, #C2185B); border: none; border-radius: 10px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;">요금제 보기</button>
                <button onclick="goBack()" style="padding: 12px 24px; background: transparent; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #999; font-size: 14px; cursor: pointer;">뒤로 가기</button>
            </div>
        </div>
    `;
}

// 요금제 페이지로 이동 (플러터 웹뷰 호환)
function goToProductsPage() {
    // 메인 페이지의 #products로 이동
    window.location.href = '/#products';
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 AI Style Match 초기화');

    // 1단계: localStorage에서 먼저 확인 (가장 빠름)
    let userEmail = null;
    let userPlan = null;

    try {
        const cached = localStorage.getItem('firebase_user');
        if (cached) {
            const user = JSON.parse(cached);
            if (user.email && user.plan) {
                userEmail = user.email;
                userPlan = user.plan;
                console.log('✅ localStorage에서 사용자 정보 발견:', userEmail, userPlan);
            }
        }
    } catch (e) {
        console.warn('localStorage 파싱 실패:', e);
    }

    // 2단계: localStorage에 없으면 Firebase Auth 대기
    if (!userEmail) {
        console.log('⏳ localStorage에 정보 없음, Firebase Auth 대기...');

        const firebaseUser = await new Promise((resolve) => {
            if (window.firebase && firebase.auth) {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    console.log('🔐 Firebase Auth 상태:', user ? user.email : '로그인 안됨');
                    resolve(user);
                });

                // 5초 타임아웃 (늘림)
                setTimeout(() => {
                    unsubscribe();
                    console.log('⏰ Firebase Auth 타임아웃');
                    resolve(null);
                }, 5000);
            } else {
                console.log('⚠️ Firebase SDK 없음');
                resolve(null);
            }
        });

        if (firebaseUser?.email) {
            userEmail = firebaseUser.email;
        }
    }

    // 3단계: 여전히 없으면 로그인 페이지로 리다이렉트
    if (!userEmail) {
        console.log('❌ 사용자 정보 없음 → 로그인 페이지로 이동');
        window.location.href = '/login.html';
        return;
    }

    console.log('📧 확인된 사용자 이메일:', userEmail);

    // 4단계: localStorage에서 플랜을 이미 가져왔으면 Firestore 조회 생략
    let allowed = false;
    let plan = userPlan;

    if (userPlan && ALLOWED_PLANS.includes(userPlan)) {
        allowed = true;
        console.log('✅ localStorage 플랜으로 접근 허용:', userPlan);
    } else {
        // Firestore에서 접근 권한 확인
        const result = await checkAccessFromFirestore(userEmail);
        allowed = result.allowed;
        plan = result.plan;
    }

    if (!allowed) {
        console.log('❌ AI 스타일 매칭 접근 제한: 허용되지 않은 사용자 (플랜:', plan, ')');
        showAccessDenied(plan);
        return;
    }

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

        // 카메라 모드 활성화 (detectFacesLoop 조건)
        isCameraMode = true;

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
    const video = document.getElementById('cameraVideo');
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
let scanLineY = 0; // 스캔 라인 애니메이션용

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
        leftEyeOuter: 33,
        rightEyeOuter: 263,
        leftEyeInner: 133,
        rightEyeInner: 362,
        leftEyebrowOuter: 70,
        rightEyebrowOuter: 300,
        leftEyebrowInner: 107,
        rightEyebrowInner: 336,
        upperLip: 13,
        lowerLip: 14,
        leftMouth: 61,
        rightMouth: 291,
        foreheadLeft: 71,
        foreheadRight: 301
    };

    // 0. 스캔 라인 애니메이션
    scanLineY = (scanLineY + 3) % h;
    const gradient = ctx.createLinearGradient(0, scanLineY - 20, 0, scanLineY + 20);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
    gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanLineY - 20, w, 40);

    // 1. 얼굴 윤곽선 (네온 효과)
    const faceOutline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];

    // 글로우 효과
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2;
    faceOutline.forEach((idx, i) => {
        const x = landmarks[idx].x * w;
        const y = landmarks[idx].y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. 측정선들 (라벨 포함)
    // 세로선: 이마 ~ 턱 (보라색)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.hairline, keyPoints.chin, w, h, '#a855f7', 'HEIGHT', 'left');

    // 광대 너비 (시안)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.leftZygoma, keyPoints.rightZygoma, w, h, '#22d3ee', 'CHEEKBONE', 'top');

    // 턱 너비 (노랑)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.leftGonion, keyPoints.rightGonion, w, h, '#fbbf24', 'JAW', 'bottom');

    // 눈썹 너비 (핑크)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.leftEyebrowOuter, keyPoints.rightEyebrowOuter, w, h, '#ec4899', 'EYEBROW', 'top');

    // 미간 거리 (그린)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.leftEyebrowInner, keyPoints.rightEyebrowInner, w, h, '#22c55e', 'GLABELLA', 'top');

    // 입술 너비 (오렌지)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.leftMouth, keyPoints.rightMouth, w, h, '#f97316', 'LIPS', 'bottom');

    // 이마 너비 (연보라)
    drawMeasurementLineWithLabel(ctx, landmarks, keyPoints.foreheadLeft, keyPoints.foreheadRight, w, h, '#c084fc', 'FOREHEAD', 'top');

    // 3. 주요 포인트 (펄스 애니메이션 효과)
    const pulseRadius = 4 + Math.sin(Date.now() / 200) * 2;
    const importantPoints = [
        { idx: keyPoints.hairline, color: '#a855f7' },
        { idx: keyPoints.chin, color: '#a855f7' },
        { idx: keyPoints.leftZygoma, color: '#22d3ee' },
        { idx: keyPoints.rightZygoma, color: '#22d3ee' },
        { idx: keyPoints.leftGonion, color: '#fbbf24' },
        { idx: keyPoints.rightGonion, color: '#fbbf24' },
        { idx: keyPoints.glabella, color: '#22c55e' },
        { idx: keyPoints.leftEyebrowOuter, color: '#ec4899' },
        { idx: keyPoints.rightEyebrowOuter, color: '#ec4899' }
    ];

    importantPoints.forEach(({ idx, color }) => {
        const x = landmarks[idx].x * w;
        const y = landmarks[idx].y * h;

        // 외곽 글로우
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba').replace('#', 'rgba(');
        // hex to rgba
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.fill();

        // 내부 점
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 중심점
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    });

    // 4. 코너 프레임 (스캔 UI 느낌)
    drawCornerFrame(ctx, w, h);

    // 5. 측정 값 표시
    updateMeasurementDisplay(landmarks, w, h);
}

function drawMeasurementLineWithLabel(ctx, landmarks, idx1, idx2, w, h, color, label, labelPos) {
    const x1 = landmarks[idx1].x * w;
    const y1 = landmarks[idx1].y * h;
    const x2 = landmarks[idx2].x * w;
    const y2 = landmarks[idx2].y * h;

    // 글로우 효과
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // 선
    ctx.beginPath();
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 끝점 마커
    [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    });

    // 라벨
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const distText = Math.round(dist);

    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    let labelX = midX;
    let labelY = midY;

    if (labelPos === 'top') labelY -= 12;
    else if (labelPos === 'bottom') labelY += 18;
    else if (labelPos === 'left') { labelX = x1 - 35; labelY = midY; }
    else if (labelPos === 'right') { labelX = x2 + 35; labelY = midY; }

    // 라벨 배경
    const textWidth = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX - textWidth/2, labelY - 8, textWidth, 14);

    // 라벨 텍스트
    ctx.fillStyle = color;
    ctx.fillText(label, labelX, labelY + 2);
}

function drawCornerFrame(ctx, w, h) {
    const cornerSize = 30;
    const margin = 15;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.lineWidth = 2;

    // 좌상단
    ctx.beginPath();
    ctx.moveTo(margin, margin + cornerSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + cornerSize, margin);
    ctx.stroke();

    // 우상단
    ctx.beginPath();
    ctx.moveTo(w - margin - cornerSize, margin);
    ctx.lineTo(w - margin, margin);
    ctx.lineTo(w - margin, margin + cornerSize);
    ctx.stroke();

    // 좌하단
    ctx.beginPath();
    ctx.moveTo(margin, h - margin - cornerSize);
    ctx.lineTo(margin, h - margin);
    ctx.lineTo(margin + cornerSize, h - margin);
    ctx.stroke();

    // 우하단
    ctx.beginPath();
    ctx.moveTo(w - margin - cornerSize, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.lineTo(w - margin, h - margin - cornerSize);
    ctx.stroke();
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
    const leftEyebrowOuter = landmarks[70];
    const rightEyebrowOuter = landmarks[300];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];

    const dist = (a, b) => Math.sqrt(Math.pow((a.x - b.x) * w, 2) + Math.pow((a.y - b.y) * h, 2));

    const totalHeight = dist(hairline, chin);
    const faceWidth = dist(leftZygoma, rightZygoma);
    const jawWidth = dist(leftGonion, rightGonion);
    const eyebrowWidth = dist(leftEyebrowOuter, rightEyebrowOuter);
    const lipWidth = dist(leftMouth, rightMouth);

    const faceRatio = (totalHeight / faceWidth).toFixed(2);
    const widthRatio = (faceWidth / jawWidth).toFixed(2);

    display.innerHTML = `
        <div class="measurement-grid">
            <div class="measurement-item">
                <span class="measurement-icon">📏</span>
                <span class="measurement-label">세로/가로</span>
                <span class="measurement-value">${faceRatio}</span>
            </div>
            <div class="measurement-item">
                <span class="measurement-icon">💎</span>
                <span class="measurement-label">광대/턱</span>
                <span class="measurement-value">${widthRatio}</span>
            </div>
            <div class="measurement-item">
                <span class="measurement-icon">👁️</span>
                <span class="measurement-label">눈썹폭</span>
                <span class="measurement-value">${Math.round(eyebrowWidth)}px</span>
            </div>
            <div class="measurement-item">
                <span class="measurement-icon">👄</span>
                <span class="measurement-label">입술폭</span>
                <span class="measurement-value">${Math.round(lipWidth)}px</span>
            </div>
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

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

    // 성별 선택 시 오버레이 fade-out 애니메이션
    const overlay1 = document.getElementById('genderRequiredOverlay');
    const overlay2 = document.getElementById('genderRequiredOverlayUpload');

    if (overlay1) {
        overlay1.style.transition = 'opacity 0.5s ease';
        overlay1.style.opacity = '0';
        setTimeout(() => {
            overlay1.style.display = 'none';
        }, 500);
    }
    if (overlay2) {
        overlay2.style.transition = 'opacity 0.5s ease';
        overlay2.style.opacity = '0';
        setTimeout(() => {
            overlay2.style.display = 'none';
        }, 500);
    }

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
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

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

    // 눈썹 분석 (라인 + 텍스쳐)
    let eyebrowAnalysis = null;
    try {
        // 이미지 데이터 획득 (카메라/업로드된 이미지에서)
        const canvas = document.getElementById('cameraCanvas') || document.getElementById('faceCanvas');
        let imageData = null;
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        eyebrowAnalysis = analyzeEyebrows(landmarks, imageData, canvas);
        console.log('👁️ 눈썹 분석:', eyebrowAnalysis);
    } catch (e) {
        console.warn('눈썹 분석 실패:', e);
    }

    // 분석 해석 (눈썹 데이터 포함)
    const analysis = interpretAnalysis(ratios, eyebrowAnalysis);
    console.log('💡 분석 결과:', analysis);

    // 결과 저장
    analysisResults = { ratios, analysis, eyebrowAnalysis };

    // UI 업데이트
    displayAnalysisResults(ratios, analysis, eyebrowAnalysis);

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

    // 눈 관련 랜드마크 (이미지 타입 분석용)
    const leftEyeInner = landmarks[133];   // 좌안 내측 (내안각)
    const rightEyeInner = landmarks[362];  // 우안 내측 (내안각)
    const leftEyeOuter = landmarks[33];    // 좌안 외측 (외안각)
    const rightEyeOuter = landmarks[263];  // 우안 외측 (외안각)

    // 수직 거리
    const upperFace = distance(hairline, glabella);  // 상안부
    const middleFace = distance(glabella, noseTip);  // 중안부
    const lowerFace = distance(noseTip, chin);       // 하안부
    const totalHeight = upperFace + middleFace + lowerFace;

    // 가로 거리
    const faceWidth = distance(leftZygoma, rightZygoma);  // 광대 너비
    const jawWidth = distance(leftGonion, rightGonion);   // 턱 너비

    // 눈 관련 거리 (이미지 타입 분석용)
    const eyeDistance = distance(leftEyeInner, rightEyeInner);  // 눈 사이 거리
    const leftEyeWidth = distance(leftEyeOuter, leftEyeInner);  // 좌안 너비
    const rightEyeWidth = distance(rightEyeOuter, rightEyeInner); // 우안 너비
    const avgEyeWidth = (leftEyeWidth + rightEyeWidth) / 2;     // 평균 눈 너비

    // 비율 계산
    const upperRatio = upperFace / totalHeight;
    const middleRatio = middleFace / totalHeight;
    const lowerRatio = lowerFace / totalHeight;
    const cheekJawRatio = faceWidth / jawWidth;

    // 눈 사이 거리 비율 (이미지 타입 결정용)
    // 이상적인 비율: 눈 사이 거리 = 눈 너비 (1:1)
    const eyeDistanceRatio = eyeDistance / avgEyeWidth;
    // 얼굴 너비 대비 눈 사이 거리 비율
    const eyeToFaceRatio = eyeDistance / faceWidth;

    return {
        upperRatio: Math.round(upperRatio * 100),
        middleRatio: Math.round(middleRatio * 100),
        lowerRatio: Math.round(lowerRatio * 100),
        faceWidth: Math.round(faceWidth * 1000) / 10,
        jawWidth: Math.round(jawWidth * 1000) / 10,
        cheekJawRatio: Math.round(cheekJawRatio * 100) / 100,
        // 눈 관련 비율 (이미지 타입용)
        eyeDistanceRatio: Math.round(eyeDistanceRatio * 100) / 100,
        eyeToFaceRatio: Math.round(eyeToFaceRatio * 100) / 100,
        // 원본 비율 (계산용)
        raw: { upperRatio, middleRatio, lowerRatio, cheekJawRatio, eyeDistanceRatio, eyeToFaceRatio }
    };
}

// ========== 눈썹 라인 분석 ==========
function analyzeEyebrowLine(landmarks) {
    const distance = (p1, p2) => {
        const dx = (p1.x - p2.x);
        const dy = (p1.y - p2.y);
        return Math.sqrt(dx * dx + dy * dy);
    };

    // 왼쪽/오른쪽 눈썹 분석 후 평균
    const analyzeOneSide = (side) => {
        const brow = EYEBROW_LANDMARKS[side];
        const start = landmarks[brow.start];
        const peak = landmarks[brow.peak];
        const end = landmarks[brow.end];

        if (!start || !peak || !end) return null;

        // 1. Arch_Ratio (아치 높이 비율)
        // 시작점-꼬리 직선에서 산까지의 거리 / 눈썹 너비
        const browWidth = distance(start, end);

        // 시작점-꼬리 직선의 중간점 y좌표
        const baseLineY = (start.y + end.y) / 2;
        // 산이 직선보다 위에 있으면 음수 (y는 위가 작으므로)
        const archHeight = baseLineY - peak.y;
        const archRatio = archHeight / browWidth;

        // 2. Tail_Angle (꼬리 각도)
        // 산에서 꼬리로 가는 각도 (수평 기준)
        const dx = end.x - peak.x;
        const dy = end.y - peak.y;
        const tailAngle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);

        // 3. 눈썹-눈 거리 (Low Straight 예외 처리용)
        const eyeTop = side === 'left' ? landmarks[LANDMARKS.left_eye_top] : landmarks[LANDMARKS.right_eye_top];
        const browToEyeDistance = eyeTop ? distance(peak, eyeTop) : null;

        return { archRatio, tailAngle, browWidth, browToEyeDistance };
    };

    const leftResult = analyzeOneSide('left');
    const rightResult = analyzeOneSide('right');

    if (!leftResult || !rightResult) {
        return null;
    }

    // 좌우 평균
    const avgArchRatio = (leftResult.archRatio + rightResult.archRatio) / 2;
    const avgTailAngle = (leftResult.tailAngle + rightResult.tailAngle) / 2;
    const avgBrowToEyeDistance = (leftResult.browToEyeDistance + rightResult.browToEyeDistance) / 2;
    const avgBrowWidth = (leftResult.browWidth + rightResult.browWidth) / 2;

    // 눈썹-눈 거리 비율 (눈썹 너비 대비)
    const browEyeRatio = avgBrowToEyeDistance / avgBrowWidth;

    return {
        archRatio: Math.round(avgArchRatio * 1000) / 1000,
        tailAngle: Math.round(avgTailAngle * 10) / 10,
        browEyeRatio: Math.round(browEyeRatio * 100) / 100,
        raw: { avgArchRatio, avgTailAngle, browEyeRatio }
    };
}

// ========== 눈썹 라인 분류 ==========
function classifyEyebrowLine(eyebrowData) {
    if (!eyebrowData) {
        return { lineType: 'unknown', lineTypeKo: '알 수 없음', imageType: 'neutral' };
    }

    const { raw } = eyebrowData;
    const { avgArchRatio, avgTailAngle, browEyeRatio } = raw;
    const thresholds = EYEBROW_THRESHOLDS;

    let lineType = 'natural';
    let lineTypeKo = '내추럴형';
    let imageType = 'neutral';  // 뉴트럴계

    // 아치형 (Arched) - 원계
    if (avgArchRatio > thresholds.arch.high && avgTailAngle > thresholds.tailAngle.steep) {
        lineType = 'arched';
        lineTypeKo = '아치형';
        imageType = 'warm';
    }
    // 스트레이트형 (Straight) - 쿨계
    else if (avgArchRatio < thresholds.arch.low && avgTailAngle < thresholds.tailAngle.flat) {
        lineType = 'straight';
        lineTypeKo = '스트레이트형';
        imageType = 'cool';

        // 예외 처리: Low Straight (눈썹-눈 거리가 좁으면 뉴트럴로 보정)
        if (browEyeRatio < thresholds.browEyeDistance.low) {
            imageType = 'neutral';
            lineTypeKo = '스트레이트형 (로우)';
        }
    }
    // 내추럴형 (Natural) - 뉴트럴계
    else {
        lineType = 'natural';
        lineTypeKo = '내추럴형';
        imageType = 'neutral';
    }

    return { lineType, lineTypeKo, imageType };
}

// ========== 눈썹 텍스쳐 분석 (Density, Thickness) ==========
function analyzeEyebrowTexture(landmarks, imageData, canvas) {
    // 이미지 데이터가 없으면 기본값 반환
    if (!imageData || !canvas) {
        return {
            density: 100,
            thicknessRatio: 0.20,
            textureType: 'medium',
            textureTypeKo: '미디엄'
        };
    }

    const distance = (p1, p2) => {
        const dx = (p1.x - p2.x);
        const dy = (p1.y - p2.y);
        return Math.sqrt(dx * dx + dy * dy);
    };

    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = canvas.width;
        const height = canvas.height;

        // 눈썹 영역의 픽셀 분석
        const analyzeRegion = (side) => {
            const brow = EYEBROW_LANDMARKS[side];
            const start = landmarks[brow.start];
            const peak = landmarks[brow.peak];
            const end = landmarks[brow.end];
            const prePeak = landmarks[brow.prePeak];
            const postPeak = landmarks[brow.postPeak];

            if (!start || !peak || !end) return null;

            // 눈썹 영역 경계 (픽셀 좌표로 변환)
            const points = [start, prePeak, peak, postPeak, end].filter(p => p);
            const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x * width)) - 5));
            const maxX = Math.min(width, Math.ceil(Math.max(...points.map(p => p.x * width)) + 5));
            const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y * height)) - 10));
            const maxY = Math.min(height, Math.ceil(Math.max(...points.map(p => p.y * height)) + 10));

            // 해당 영역의 이미지 데이터 가져오기
            const regionWidth = maxX - minX;
            const regionHeight = maxY - minY;

            if (regionWidth <= 0 || regionHeight <= 0) return null;

            const regionData = ctx.getImageData(minX, minY, regionWidth, regionHeight);
            const data = regionData.data;

            // 평균 명도 계산 (Grayscale)
            let totalBrightness = 0;
            let pixelCount = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                pixelCount++;
            }

            const avgDensity = pixelCount > 0 ? totalBrightness / pixelCount : 128;

            // 눈썹 두께 추정 (산 지점에서의 세로 범위)
            const thickness = regionHeight;

            // 눈 세로 길이 (두께 비율 계산용)
            const eyeTop = side === 'left' ? landmarks[159] : landmarks[386];
            const eyeBottom = side === 'left' ? landmarks[145] : landmarks[374];
            const eyeHeight = eyeTop && eyeBottom ? distance(eyeTop, eyeBottom) * height : thickness * 4;

            const thicknessRatio = thickness / eyeHeight;

            return { density: avgDensity, thicknessRatio };
        };

        const leftResult = analyzeRegion('left');
        const rightResult = analyzeRegion('right');

        if (!leftResult || !rightResult) {
            return {
                density: 100,
                thicknessRatio: 0.20,
                textureType: 'medium',
                textureTypeKo: '미디엄'
            };
        }

        const avgDensity = (leftResult.density + rightResult.density) / 2;
        const avgThicknessRatio = (leftResult.thicknessRatio + rightResult.thicknessRatio) / 2;

        // 텍스쳐 분류
        const thresholds = EYEBROW_THRESHOLDS;
        let textureType = 'medium';
        let textureTypeKo = '미디엄';

        // 낮은 명도(진한 색) + 두꺼움 = Hard
        if (avgDensity < thresholds.density.hard && avgThicknessRatio > thresholds.thickness.thick) {
            textureType = 'hard';
            textureTypeKo = '하드';
        }
        // 높은 명도(연한 색) + 얇음 = Soft
        else if (avgDensity > thresholds.density.soft && avgThicknessRatio < thresholds.thickness.thin) {
            textureType = 'soft';
            textureTypeKo = '소프트';
        }

        return {
            density: Math.round(avgDensity),
            thicknessRatio: Math.round(avgThicknessRatio * 100) / 100,
            textureType,
            textureTypeKo
        };
    } catch (e) {
        console.warn('눈썹 텍스쳐 분석 오류:', e);
        return {
            density: 100,
            thicknessRatio: 0.20,
            textureType: 'medium',
            textureTypeKo: '미디엄'
        };
    }
}

// ========== 눈썹 종합 분석 ==========
function analyzeEyebrows(landmarks, imageData, canvas) {
    // 라인 분석
    const lineData = analyzeEyebrowLine(landmarks);

    // lineData가 null이면 기본값 사용
    if (!lineData) {
        console.warn('눈썹 라인 분석 실패 - 기본값 사용');
        return {
            line: {
                archRatio: 0.1,
                tailAngle: 15,
                browEyeRatio: 1.0,
                lineType: 'natural',
                lineTypeKo: '내추럴형',
                imageType: 'neutral'
            },
            texture: {
                density: 100,
                thicknessRatio: 0.20,
                textureType: 'medium',
                textureTypeKo: '미디엄'
            },
            combined: {
                imageType: 'neutral',
                imageTypeKo: '뉴트럴',
                textureType: 'medium'
            }
        };
    }

    const lineClassification = classifyEyebrowLine(lineData);

    // 텍스쳐 분석
    const textureData = analyzeEyebrowTexture(landmarks, imageData, canvas);

    // 종합 이미지 타입 결정
    // 라인 타입 + 텍스쳐 타입 조합
    let combinedImageType = lineClassification.imageType;
    let combinedImageTypeKo = '';

    // 예: 아치형 + 소프트 = 웜/소프트
    // 예: 스트레이트 + 하드 = 쿨/하드
    if (lineClassification.imageType === 'warm') {
        combinedImageTypeKo = textureData.textureType === 'soft' ? '웜계 · 소프트' :
                              textureData.textureType === 'hard' ? '웜계 · 하드' : '웜계';
    } else if (lineClassification.imageType === 'cool') {
        combinedImageTypeKo = textureData.textureType === 'soft' ? '쿨계 · 소프트' :
                              textureData.textureType === 'hard' ? '쿨계 · 하드' : '쿨계';
    } else {
        combinedImageTypeKo = textureData.textureType === 'soft' ? '뉴트럴 · 소프트' :
                              textureData.textureType === 'hard' ? '뉴트럴 · 하드' : '뉴트럴';
    }

    return {
        line: {
            ...lineData,
            ...lineClassification
        },
        texture: textureData,
        combined: {
            imageType: combinedImageType,
            imageTypeKo: combinedImageTypeKo,
            textureType: textureData.textureType
        }
    };
}

// ========== 눈썹 기반 헤어 추천 전략 ==========
function getEyebrowRecommendations(eyebrowAnalysis, gender) {
    const recommendations = [];
    const avoidances = [];

    if (!eyebrowAnalysis || !eyebrowAnalysis.line) {
        return { recommendations, avoidances };
    }

    const { line, texture, combined } = eyebrowAnalysis;
    const isMale = gender === 'male';

    // 1. 라인 타입별 추천
    if (line.lineType === 'arched') {
        // 아치형 (원계) - 강한 산을 부드럽게 가리는 스타일
        if (isMale) {
            recommendations.push({
                categories: ['SIDE FRINGE'],
                subCategories: ['EB', 'E'],
                score: 25,
                reason: '아치형 눈썹의 곡선미를 살리면서 자연스럽게 보완'
            });
        } else {
            recommendations.push({
                subCategories: ['EB', 'E'],
                score: 20,
                reason: '눈썹 산을 살짝 가려 인상을 부드럽게'
            });
        }
    } else if (line.lineType === 'straight') {
        // 스트레이트형 (쿨계) - 이마 노출로 직선미 강조
        if (isMale) {
            recommendations.push({
                categories: ['FRINGE UP', 'PUSHED BACK'],
                subCategories: ['N', 'FH'],
                score: 30,
                reason: '직선형 눈썹을 드러내 쿨하고 남성적인 인상 강조'
            });
            avoidances.push({
                categories: ['SIDE FRINGE'],
                subCategories: ['E', 'CB'],
                score: -15,
                reason: '눈썹을 가리면 직선미가 사라짐'
            });
        } else {
            recommendations.push({
                subCategories: ['N', 'FH'],
                score: 20,
                reason: '직선 눈썹을 살려 시크한 무드 연출'
            });
        }
    }
    // 내추럴형은 특별한 제약 없음

    // 2. 텍스쳐 타입별 추천
    if (texture.textureType === 'hard') {
        // 하드 (진하고 두꺼움) - 드러내서 카리스마 강조
        if (isMale) {
            recommendations.push({
                categories: ['PUSHED BACK', 'FRINGE UP'],
                score: 20,
                reason: '진한 눈썹을 드러내 카리스마 있는 인상'
            });
        }
    } else if (texture.textureType === 'soft') {
        // 소프트 (연하고 얇음) - 자연스럽게 보완
        if (isMale) {
            recommendations.push({
                categories: ['SIDE FRINGE', 'SIDE PART'],
                subCategories: ['EB', 'FH'],
                score: 15,
                reason: '연한 눈썹을 보완하는 자연스러운 스타일'
            });
        } else {
            recommendations.push({
                subCategories: ['EB', 'FH'],
                score: 15,
                reason: '앞머리로 부드러운 인상 연출'
            });
        }
    }

    return { recommendations, avoidances };
}

// ========== 분석 해석 ==========
function interpretAnalysis(ratios, eyebrowAnalysis = null) {
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

    // 2. 하안부 분석 (긴 얼굴) - 하안부가 36% 이상이면 긴 얼굴로 판단
    const isLongFace = raw.lowerRatio > 0.36 || raw.lowerRatio > raw.middleRatio * 1.12;
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

    // 6. 이미지 타입 결정 (웜계/뉴트럴/쿨계)
    let imageType = determineImageType(ratios);

    // 7. 눈썹 분석 통합
    let eyebrowType = null;
    if (eyebrowAnalysis && eyebrowAnalysis.line) {
        // 눈썹 인사이트 추가
        const { line, texture, combined } = eyebrowAnalysis;

        // 눈썹 라인 타입별 인사이트
        if (line.lineType === 'arched') {
            insights.push({
                type: 'eyebrow_arched',
                value: `아치비: ${(line.archRatio * 100).toFixed(1)}%`,
                description: t('styleMatch.insight.eyebrowArched') || `아치형 눈썹 (곡선미 강조, 원계)`,
                issue: t('styleMatch.issue.eyebrowArched') || '강한 눈썹 산',
                solution: t('styleMatch.solution.eyebrowArched') || '앞머리로 눈썹 산을 살짝 가려 부드럽게'
            });
        } else if (line.lineType === 'straight') {
            insights.push({
                type: 'eyebrow_straight',
                value: `테일각: ${line.tailAngle.toFixed(1)}°`,
                description: t('styleMatch.insight.eyebrowStraight') || `직선형 눈썹 (시크하고 쿨한 인상)`,
                issue: null,
                solution: t('styleMatch.solution.eyebrowStraight') || '이마를 드러내 직선미 강조'
            });
        }

        // 눈썹 텍스쳐별 인사이트
        if (texture.textureType === 'hard') {
            insights.push({
                type: 'eyebrow_hard',
                value: `밀도: ${texture.density.toFixed(0)}`,
                description: t('styleMatch.insight.eyebrowHard') || `진한 눈썹 (카리스마 있는 인상)`,
                issue: null,
                solution: t('styleMatch.solution.eyebrowHard') || '눈썹을 드러내 강렬한 인상 연출'
            });
        } else if (texture.textureType === 'soft') {
            insights.push({
                type: 'eyebrow_soft',
                value: `밀도: ${texture.density.toFixed(0)}`,
                description: t('styleMatch.insight.eyebrowSoft') || `연한 눈썹 (부드러운 인상)`,
                issue: t('styleMatch.issue.eyebrowSoft') || '옅은 눈썹',
                solution: t('styleMatch.solution.eyebrowSoft') || '앞머리로 자연스럽게 보완'
            });
        }

        // 눈썹 기반 추천 가져오기
        const eyebrowRecs = getEyebrowRecommendations(eyebrowAnalysis, selectedGender);

        // 추천에 추가
        eyebrowRecs.recommendations.forEach(rec => {
            recommendations.push(rec);
        });

        // 회피에 추가
        eyebrowRecs.avoidances.forEach(avoid => {
            avoidances.push(avoid);
        });

        // 눈썹 타입 저장
        eyebrowType = {
            lineType: line.lineType,
            lineTypeKo: line.lineTypeKo,
            textureType: texture.textureType,
            textureTypeKo: texture.textureTypeKo,
            combined: combined,
            archRatio: line.archRatio,
            tailAngle: line.tailAngle,
            density: texture.density,
            thicknessRatio: texture.thicknessRatio
        };
    }

    return {
        faceType,
        imageType,
        eyebrowType,
        insights,
        recommendations,
        avoidances,
        ratios  // 점수 계산에 필요
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

// ========== 이미지 타입 결정 (웜계/뉴트럴/쿨계) ==========
// 눈 사이 거리 비율 + 얼굴형을 기반으로 이미지 무드 결정
function determineImageType(ratios) {
    const { raw, cheekJawRatio } = ratios;
    const { eyeDistanceRatio, eyeToFaceRatio } = raw;

    // 이미지 타입 결정 로직
    // eyeDistanceRatio: 눈 사이 거리 / 눈 너비 (이상적 = 1.0)
    // - 1.1 이상: 눈이 멀리 떨어짐 → 웜계 (또렷함, 시원함)
    // - 0.9 이하: 눈이 가까움 → 쿨계 (부드러움, 집중감)
    // - 0.9 ~ 1.1: 균형 → 뉴트럴

    let type = 'neutral';
    let subType = 'balanced'; // hard or soft

    // 1차: 눈 사이 거리로 기본 타입 결정
    if (eyeDistanceRatio >= 1.1) {
        type = 'warm';  // 웜계: 눈이 멀리 → 또렷하고 시원한 인상
    } else if (eyeDistanceRatio <= 0.9) {
        type = 'cool';  // 쿨계: 눈이 가까움 → 집중된 부드러운 인상
    } else {
        type = 'neutral';
    }

    // 2차: 얼굴형으로 하드/소프트 결정
    // 사각형 턱(cheekJawRatio < 1.15) → 하드
    // 부드러운 턱(cheekJawRatio > 1.25) → 소프트
    if (cheekJawRatio < 1.15) {
        subType = 'hard';
    } else if (cheekJawRatio > 1.25) {
        subType = 'soft';
    } else {
        subType = 'balanced';
    }

    // 이미지 타입 이름 및 설명
    const typeNames = {
        'warm': {
            ko: '웜계 (Warm)',
            desc: '또렷하고 시원한 인상, 직선적 라인이 어울림',
            icon: '🔆'
        },
        'neutral': {
            ko: '뉴트럴계 (Neutral)',
            desc: '균형 잡힌 인상, 다양한 스타일 소화 가능',
            icon: '⚖️'
        },
        'cool': {
            ko: '쿨계 (Cool)',
            desc: '부드럽고 집중된 인상, 곡선 라인이 어울림',
            icon: '❄️'
        }
    };

    const subTypeNames = {
        'hard': { ko: '하드', desc: '선명한 대비, 직선적 스타일 추천' },
        'soft': { ko: '소프트', desc: '부드러운 그라데이션, 웨이브 추천' },
        'balanced': { ko: '밸런스', desc: '다양한 질감 소화 가능' }
    };

    return {
        type,           // 'warm', 'neutral', 'cool'
        subType,        // 'hard', 'soft', 'balanced'
        code: `${type}-${subType}`,
        name: typeNames[type].ko,
        subTypeName: subTypeNames[subType].ko,
        icon: typeNames[type].icon,
        description: typeNames[type].desc,
        subDescription: subTypeNames[subType].desc,
        // 스타일 매칭용 키워드
        styleKeywords: getImageTypeStyleKeywords(type, subType),
        // 원본 비율 (디버그용)
        eyeDistanceRatio: ratios.eyeDistanceRatio,
        eyeToFaceRatio: ratios.eyeToFaceRatio
    };
}

// 이미지 타입별 추천 스타일 키워드
function getImageTypeStyleKeywords(type, subType) {
    const keywords = {
        boost: [],    // 가점 키워드
        penalty: []   // 감점 키워드
    };

    // 타입별 스타일 무드
    if (type === 'warm') {
        // 웜계: 또렷함, 직선적
        keywords.boost = ['슬릭', 'slick', '시크', 'chic', '레이저', '투블럭', '언더컷', '샤기', '직선'];
        keywords.penalty = ['소프트', 'soft', '몽환', '흐릿'];
    } else if (type === 'cool') {
        // 쿨계: 부드러움, 곡선적
        keywords.boost = ['웨이브', 'wave', '컬', 'curl', '소프트', 'soft', 'C컬', 'S컬', '레이어', '볼륨'];
        keywords.penalty = ['샤프', 'sharp', '레이저', '직선'];
    } else {
        // 뉴트럴: 균형
        keywords.boost = ['내추럴', 'natural', '클래식', 'classic'];
        keywords.penalty = [];
    }

    // 하드/소프트 서브타입
    if (subType === 'hard') {
        keywords.boost.push('선명', '대비', '컨트라스트', '앞머리', '또렷');
        keywords.penalty.push('몽환', '흐릿', '그라데이션');
    } else if (subType === 'soft') {
        keywords.boost.push('그라데이션', '흐름', '자연스러운', '부드러운');
        keywords.penalty.push('선명', '각진');
    }

    return keywords;
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
    if (lowerRatio > 0.36) {
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
        const categoryLower = category.toLowerCase();
        const categoryStyles = allStyles.filter(s =>
            s.gender && s.gender.toLowerCase() === selectedGender.toLowerCase() &&
            s.mainCategory && s.mainCategory.toLowerCase() === categoryLower &&
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
function displayAnalysisResults(ratios, analysis, eyebrowAnalysis = null) {
    // 카메라 종료 (결과 화면에서는 카메라 불필요)
    stopCamera();

    // 섹션 표시 (처방 단계 제거 - 바로 추천 표시)
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

    // 이미지 타입 배지 (웜계/뉴트럴/쿨계)
    const imageTypeBadge = document.getElementById('imageTypeBadge');
    if (imageTypeBadge && analysis.imageType) {
        imageTypeBadge.innerHTML = `${analysis.imageType.icon} ${analysis.imageType.name} · ${analysis.imageType.subTypeName}`;
        imageTypeBadge.title = `${analysis.imageType.description}\n${analysis.imageType.subDescription}`;
        // 타입별 색상 적용
        imageTypeBadge.className = 'image-type-badge ' + analysis.imageType.type;
    }

    // 눈 사이 거리 비율 표시
    const eyeDistanceEl = document.getElementById('eyeDistanceRatio');
    if (eyeDistanceEl) {
        eyeDistanceEl.textContent = ratios.eyeDistanceRatio;
    }

    // 눈썹 분석 결과 표시
    displayEyebrowAnalysis(analysis.eyebrowType);

    // 분석 요약 생성
    generateSummaryText(analysis);
}

// 눈썹 분석 결과 UI 표시
function displayEyebrowAnalysis(eyebrowType) {
    const eyebrowCard = document.getElementById('eyebrowTypeCard');
    if (!eyebrowCard) return;

    if (!eyebrowType) {
        eyebrowCard.style.display = 'none';
        return;
    }

    eyebrowCard.style.display = 'block';

    // 눈썹 타입 배지
    const eyebrowBadge = document.getElementById('eyebrowTypeBadge');
    if (eyebrowBadge) {
        // 라인 타입에 따른 아이콘
        const lineIcons = {
            'arched': '⌢',   // 아치형
            'natural': '―',  // 내추럴
            'straight': '―'  // 스트레이트
        };
        const icon = lineIcons[eyebrowType.lineType] || '―';
        eyebrowBadge.innerHTML = `${icon} ${eyebrowType.combined.imageTypeKo}`;
        // 타입별 색상
        eyebrowBadge.className = 'eyebrow-type-badge ' + eyebrowType.combined.imageType;
    }

    // 아치 비율
    const archRatioEl = document.getElementById('eyebrowArchRatio');
    if (archRatioEl) {
        archRatioEl.textContent = `${(eyebrowType.archRatio * 100).toFixed(1)}% (${eyebrowType.lineTypeKo})`;
    }

    // 테일 각도
    const tailAngleEl = document.getElementById('eyebrowTailAngle');
    if (tailAngleEl) {
        tailAngleEl.textContent = `${eyebrowType.tailAngle.toFixed(1)}°`;
    }

    // 밀도
    const densityEl = document.getElementById('eyebrowDensity');
    if (densityEl) {
        densityEl.textContent = `${eyebrowType.density.toFixed(0)} (${eyebrowType.textureTypeKo})`;
    }

    // 두께 비율
    const thicknessEl = document.getElementById('eyebrowThickness');
    if (thicknessEl) {
        thicknessEl.textContent = `${(eyebrowType.thicknessRatio * 100).toFixed(1)}%`;
    }
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

// ========== 추천 생성 (리팩토링됨) ==========
function generateRecommendations(analysis) {
    const container = document.getElementById('recommendationsContainer');
    container.innerHTML = '';

    const categories = selectedGender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES;

    console.log('🎨 추천 생성 시작:', selectedGender, '스타일 수:', allStyles.length);

    // 1. 점수 계산 함수 호출 (별도 함수로 분리)
    const scoredAllStyles = calculateHairstyleScores(analysis, allStyles);

    // 카테고리별 데이터 수집
    const categoryResults = [];

    categories.forEach(category => {
        // 해당 카테고리 스타일 필터링
        const categoryLower = category.toLowerCase();
        const categoryStyles = scoredAllStyles.filter(s =>
            s.gender && s.gender.toLowerCase() === selectedGender.toLowerCase() &&
            s.mainCategory && s.mainCategory.toLowerCase() === categoryLower &&
            (s.type === 'cut' || !s.type)
        );

        console.log(`📁 ${category}: ${categoryStyles.length}개 스타일`);

        if (categoryStyles.length === 0) return;

        // TOP 3 선정 (점수순)
        const top3 = categoryStyles
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // 카테고리 평균 점수 계산
        const avgScore = top3.length > 0
            ? Math.round(top3.reduce((sum, s) => sum + s.score, 0) / top3.length)
            : 0;

        // 디버그: TOP 3 점수 출력
        console.log(`  📊 ${category} TOP3:`, top3.map(s => `${s.name}(${s.score}점)`).join(', '));

        categoryResults.push({
            category,
            avgScore,
            top3
        });
    });

    // 카테고리를 평균 점수순으로 정렬 (높은 점수 먼저)
    categoryResults.sort((a, b) => b.avgScore - a.avgScore);

    console.log('📊 점수순 카테고리:', categoryResults.map(c => `${c.category}: ${c.avgScore}점`));

    // 정렬된 순서로 카드 생성
    categoryResults.forEach(({ category, top3 }) => {
        const categoryReason = generateCategoryReason(category, analysis, top3);
        const categoryCard = createCategoryCard(category, categoryReason, top3);
        container.appendChild(categoryCard);
    });
}

// ========== 스타일 점수 계산 로직 (신규 추가) ==========
function calculateHairstyleScores(analysis, styles) {
    const { ratios } = analysis;
    if (!ratios || !ratios.raw) {
        return styles.map(s => ({ ...s, score: 50, reason: '기본 추천' }));
    }

    const { lowerRatio, middleRatio, cheekJawRatio, upperRatio } = ratios.raw;

    // 얼굴형 판단 (통일된 기준)
    const isLongFace = lowerRatio > 0.36 || lowerRatio > middleRatio * 1.12;
    const isShortFace = lowerRatio < 0.28;
    const isSquareJaw = cheekJawRatio < 1.15;
    const isWideForehead = upperRatio > 0.36;

    console.log('🔍 얼굴형 분석:', { isLongFace, isShortFace, isSquareJaw, isWideForehead });

    return styles.map(style => {
        let score = 50; // 기본 점수
        let categoryBonus = 0;
        let styleBonus = 0;

        // 카테고리 대문자 변환
        const cat = (style.mainCategory || '').toUpperCase();
        const subCat = (style.subCategory || '').toUpperCase();
        const name = (style.name || '').toLowerCase();

        // 1. 카테고리(기장)별 점수 - 여자
        if (selectedGender === 'female') {
            if (isLongFace) {
                // 긴 얼굴: 긴 머리 감점, 중단발~세미롱 가산점
                if (['A LENGTH', 'B LENGTH'].includes(cat)) {
                    categoryBonus -= 20;
                } else if (['C LENGTH', 'D LENGTH', 'E LENGTH', 'F LENGTH'].includes(cat)) {
                    categoryBonus += 40; // 기획서대로 +40점
                }
            } else if (isShortFace) {
                // 짧은 얼굴: 긴 머리 추천
                if (['A LENGTH', 'B LENGTH', 'C LENGTH'].includes(cat)) {
                    categoryBonus += 35;
                }
            }
        } else {
            // 남자 카테고리별 점수
            if (isLongFace) {
                if (['SIDE PART', 'SIDE FRINGE'].includes(cat)) {
                    categoryBonus += 50; // 사이드 볼륨 강력 추천
                } else if (['FRINGE UP', 'PUSHED BACK', 'MOHICAN'].includes(cat)) {
                    categoryBonus -= 30; // 탑 볼륨 감점
                }
            } else if (isShortFace) {
                if (['FRINGE UP', 'PUSHED BACK', 'MOHICAN'].includes(cat)) {
                    categoryBonus += 40; // 탑 볼륨 추천
                }
            }
        }

        // 앞머리(subCategory)별 점수
        if (isWideForehead) {
            if (['EB', 'EYE BROW', 'E', 'EYE', 'FH', 'FORE HEAD'].includes(subCat)) {
                categoryBonus += 30; // 앞머리로 이마 커버
            } else if (['N', 'NONE', ''].includes(subCat)) {
                categoryBonus -= 20; // 이마 노출 감점
            }
        }

        // 2. 스타일 태그/특성별 점수
        if (isLongFace) {
            // 웨이브, 컬, 볼륨 선호
            if (name.includes('웨이브') || name.includes('wave') || name.includes('컬') || name.includes('curl') || name.includes('펌')) {
                styleBonus += 10;
            }
            if (name.includes('볼륨') || name.includes('volume') || name.includes('레이어')) {
                styleBonus += 10;
            }
            // 생머리, 슬릭 기피
            if (name.includes('매직') || name.includes('스트레이트') || name.includes('straight')) {
                styleBonus -= 10;
            }
        }

        if (isSquareJaw) {
            // 부드러운 스타일 선호
            if (name.includes('웨이브') || name.includes('레이어') || name.includes('소프트')) {
                styleBonus += 15;
            }
        }

        // 3. 이미지 타입 매칭 (analysis에서 가져옴)
        if (analysis.imageType && analysis.imageType.styleKeywords) {
            const searchText = name + ' ' + (style.textRecipe || '').toLowerCase();
            const { boost, penalty } = analysis.imageType.styleKeywords;

            if (boost.some(kw => searchText.includes(kw.toLowerCase()))) {
                styleBonus += 15;
            }
            if (penalty.some(kw => searchText.includes(kw.toLowerCase()))) {
                styleBonus -= 10;
            }
        }

        // 4. AI 분석 데이터 매칭 (Gemini Vision 분석 결과 활용)
        let aiBonus = 0;
        if (style.aiAnalysis) {
            const ai = style.aiAnalysis;
            const userImageType = analysis.imageType?.type; // 'warm', 'neutral', 'cool'
            const userTexture = analysis.imageType?.subType; // 'hard', 'soft', 'balanced'
            const userFaceType = analysis.faceType?.code; // 'oval', 'round', 'square', 'heart', 'long', 'diamond'
            const userEyebrowType = analysis.eyebrowType?.lineType; // 'arched', 'straight'

            // 4-1. 이미지 타입 매칭 (웜/뉴트럴/쿨)
            if (userImageType && ai.recommendedImageTypes && ai.recommendedImageTypes.includes(userImageType)) {
                aiBonus += 15;
            }
            if (userImageType && ai.imageType === userImageType) {
                aiBonus += 10; // 스타일 자체가 같은 이미지 타입이면 추가 보너스
            }

            // 4-2. 얼굴형 매칭
            if (userFaceType) {
                if (ai.recommendedFaceTypes && ai.recommendedFaceTypes.includes(userFaceType)) {
                    aiBonus += 20;
                }
                if (ai.avoidFaceTypes && ai.avoidFaceTypes.includes(userFaceType)) {
                    aiBonus -= 25;
                }
            }

            // 4-3. 텍스쳐 매칭 (하드/소프트)
            if (userTexture && ai.texture) {
                if (userTexture === ai.texture) {
                    aiBonus += 10;
                } else if (userTexture === 'hard' && ai.texture === 'soft') {
                    aiBonus -= 5; // 미스매치 시 약간 감점
                } else if (userTexture === 'soft' && ai.texture === 'hard') {
                    aiBonus -= 5;
                }
            }

            // 4-4. 눈썹 라인 매칭
            if (userEyebrowType && ai.lineCharacter) {
                if (userEyebrowType === 'arched' && ai.lineCharacter.archBrowMatch) {
                    aiBonus += 10;
                }
                if (userEyebrowType === 'straight' && ai.lineCharacter.straightBrowMatch) {
                    aiBonus += 10;
                }
            }

            // 4-5. 커버 영역 매칭 (이마 넓으면 forehead 커버 스타일 가산)
            if (isWideForehead && ai.coverArea && ai.coverArea.includes('forehead')) {
                aiBonus += 10;
            }

            // 4-6. 실루엣/볼륨 매칭
            if (ai.silhouette) {
                if (isLongFace && ai.silhouette === 'curved') {
                    aiBonus += 10; // 긴 얼굴에 곡선 실루엣
                }
                if (isShortFace && ai.silhouette === 'straight') {
                    aiBonus += 10; // 짧은 얼굴에 직선 실루엣
                }
            }
            if (ai.volumePosition) {
                if (isLongFace && ai.volumePosition === 'side') {
                    aiBonus += 10; // 긴 얼굴에 사이드 볼륨
                }
                if (isShortFace && ai.volumePosition === 'top') {
                    aiBonus += 10; // 짧은 얼굴에 탑 볼륨
                }
            }
        }

        // 최종 점수 합산 (0~100 범위)
        score += categoryBonus + styleBonus + aiBonus;
        score = Math.min(100, Math.max(0, score));

        // AI 분석 활용 여부 로깅 (디버그용)
        if (aiBonus !== 0) {
            console.log(`🤖 ${style.styleId}: aiBonus=${aiBonus} (total=${score})`);
        }

        // 추천 사유 생성 (AI 분석 정보 포함)
        const reason = generateSimpleStyleReason(style, score, { isLongFace, isShortFace, isSquareJaw, isWideForehead }, ratios, aiBonus);

        return {
            ...style,
            score: score,
            reason: reason,
            aiBonus: aiBonus // 디버그용
        };
    });
}

// ========== 간소화된 스타일 추천 사유 생성 ==========
function generateSimpleStyleReason(style, score, faceFlags, ratios, aiBonus = 0) {
    const { isLongFace, isShortFace, isSquareJaw, isWideForehead } = faceFlags;
    const name = (style.name || '').toLowerCase();
    const subCat = (style.subCategory || '').toUpperCase();
    const ai = style.aiAnalysis;

    // 스타일 특성 파악
    const hasWave = name.includes('웨이브') || name.includes('wave') || name.includes('컬') || name.includes('curl');
    const hasVolume = name.includes('볼륨') || name.includes('volume') || name.includes('레이어');
    const hasBang = ['EB', 'EYE BROW', 'E', 'EYE', 'FH', 'FORE HEAD'].includes(subCat);

    let parts = [];

    // AI 분석 기반 스타일 특성 (aiAnalysis가 있을 때)
    const aiHasWave = ai?.styleFeatures?.hasWave || ai?.styleFeatures?.hasCurl;
    const aiHasBangs = ai?.styleFeatures?.hasBangs;
    const aiSilhouette = ai?.silhouette;
    const aiVolumePos = ai?.volumePosition;

    // === 고득점 (80점 이상) ===
    if (score >= 80) {
        // AI 분석으로 고득점일 때 더 정확한 사유 제공
        if (aiBonus >= 20 && ai) {
            if (ai.imageType) {
                const imageTypeKo = { warm: '웜계', neutral: '뉴트럴', cool: '쿨계' }[ai.imageType] || ai.imageType;
                parts.push(`✓ ${imageTypeKo} 스타일이 이미지 타입과 조화`);
            }
        } else if (isLongFace) {
            if (hasWave || aiHasWave) {
                parts.push('✓ 웨이브가 시선을 가로로 분산시켜 긴 얼굴형을 완벽하게 보완');
            } else if (hasVolume || aiVolumePos === 'side') {
                parts.push('✓ 풍성한 볼륨이 얼굴의 가로 비율을 채워 밸런스 최적화');
            } else {
                parts.push('✓ 얼굴형의 단점을 커버하고 장점을 극대화하는 베스트 스타일');
            }
        } else if (isShortFace) {
            parts.push('✓ 세로 라인을 연장해 갸름한 인상 연출');
        } else if (isSquareJaw && (hasWave || aiSilhouette === 'curved')) {
            parts.push('✓ 부드러운 질감이 각진 턱선을 자연스럽게 소프닝');
        } else if (isWideForehead && (hasBang || aiHasBangs)) {
            parts.push('✓ 앞머리가 넓은 이마를 커버하여 이상적인 비율 완성');
        } else {
            parts.push('✓ 얼굴형과 아주 이상적인 조화를 이루는 스타일');
        }
    }
    // === 중립/평범 (41 ~ 79점) ===
    else if (score > 40) {
        if (hasWave) {
            parts.push('곡선감으로 부드러운 인상 연출');
        } else if (hasVolume) {
            parts.push('볼륨감으로 자연스러운 분위기');
        } else {
            parts.push('깔끔하고 단정한 무드 연출');
        }

        // 개선 조언
        if (isLongFace && score < 70) {
            parts.push('옆볼륨을 더 살리면 비율이 좋아짐');
        } else if (isSquareJaw) {
            parts.push('레이어드 추가 시 소프닝 효과 UP');
        } else {
            parts.push('무난하게 소화 가능한 스타일');
        }
    }
    // === 저득점 (40점 이하) ===
    else {
        if (isLongFace) {
            parts.push('⚠️ 세로 라인이 강조되어 얼굴이 더 길어 보일 수 있음');
            parts.push('뿌리 볼륨이나 웨이브 추가를 추천');
        } else if (isShortFace) {
            parts.push('⚠️ 가로 라인이 강조되어 얼굴이 더 짧아 보일 수 있음');
        } else if (isWideForehead && !hasBang) {
            parts.push('⚠️ 넓은 이마가 노출되어 밸런스 주의 필요');
        } else {
            parts.push('⚠️ 얼굴형의 단점이 부각될 수 있어 스타일링 주의 필요');
        }
    }

    return [...new Set(parts)].slice(0, 2).join(' / ');
}

// 카테고리별 추천 이유 생성 (개선됨 - 얼굴형 직접 판단)
function generateCategoryReason(category, analysis, topStyles) {
    const { ratios } = analysis;

    // 얼굴형 직접 판단
    if (!ratios || !ratios.raw) {
        return '얼굴형 분석 기반 추천';
    }

    const { lowerRatio, middleRatio } = ratios.raw;
    const isLongFace = lowerRatio > 0.36 || lowerRatio > middleRatio * 1.12;
    const isShortFace = lowerRatio < 0.28;

    // 카테고리별 동적 멘트 생성
    if (selectedGender === 'female') {
        if (['C LENGTH', 'D LENGTH', 'E LENGTH', 'F LENGTH'].includes(category)) {
            if (isLongFace) return '긴 얼굴형을 보완하는 <strong>가장 이상적인 기장</strong>입니다. (+40점)';
            return '누구에게나 잘 어울리는 <strong>황금 비율 기장</strong>입니다.';
        }
        if (['A LENGTH', 'B LENGTH'].includes(category)) {
            if (isLongFace) return '얼굴이 길어 보일 수 있어 <strong>볼륨이나 웨이브</strong>가 필수입니다. (-20점)';
            if (isShortFace) return '세로 라인을 강조해 얼굴을 <strong>갸름하게</strong> 보이게 합니다. (+35점)';
            return '긴 기장으로 우아한 분위기 연출';
        }
        if (['G LENGTH', 'H LENGTH'].includes(category)) {
            return '짧은 기장으로 산뜻하고 활동적인 이미지';
        }
    } else {
        // 남성
        if (['SIDE FRINGE', 'SIDE PART'].includes(category)) {
            if (isLongFace) return '가로 볼륨으로 <strong>얼굴 길이를 효과적으로 보정</strong>합니다. (+50점)';
            return '자연스러운 사이드 라인이 특징';
        }
        if (['FRINGE UP', 'PUSHED BACK', 'MOHICAN'].includes(category)) {
            if (isLongFace) return '탑 볼륨이 얼굴을 <strong>더 길어 보이게</strong> 할 수 있습니다. (-30점)';
            if (isShortFace) return '이마를 드러내 <strong>시원하고 갸름한 인상</strong>을 줍니다. (+40점)';
            return '시원하게 올린 스타일로 깔끔한 인상';
        }
        if (['BUZZ', 'CROP'].includes(category)) {
            return '짧고 깔끔한 스타일로 관리가 편함';
        }
    }

    // 기본 멘트 (상위 스타일 기반)
    if (topStyles && topStyles.length > 0) {
        const bestStyle = topStyles[0];
        return `<strong>${bestStyle.name}</strong> 등 ${category} 스타일이 고객님께 적합합니다.`;
    }

    return '얼굴형 분석 기반 추천 카테고리';
}

// 기존 로직 (레거시 - 참고용 주석)
function generateCategoryReasonLegacy(category, analysis, topStyles) {
    const reasonParts = [];
    const { insights, recommendations, avoidances, faceType } = analysis;
    const matchedRecs = recommendations.filter(rec => rec.mainCategory?.includes(category));
    const matchedAvoids = avoidances.filter(avoid => avoid.mainCategory?.includes(category));
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

// ========== 스타일 고유 특징 찾기 ==========
function findStyleFeature(styleName) {
    const name = (styleName || '').toLowerCase();

    // STYLE_FEATURES 키워드 매칭
    for (const [keyword, feature] of Object.entries(STYLE_FEATURES)) {
        if (name.includes(keyword.toLowerCase())) {
            return { keyword, ...feature };
        }
    }

    // 영어 키워드 추가 매칭
    const englishMap = {
        'dandy': '댄디', 'see-through': '시스루', 'seethrough': '시스루',
        'slick': '슬릭', 'two-block': '투블럭', 'twoblock': '투블럭',
        'regent': '리젠트', 'ash': '애즈', 'pomade': '포마드',
        'shadow': '쉐도우', 'drop': '드롭', 'swallow': '스왈로',
        'crop': '크롭', 'buzz': '버즈', 'mohican': '모히칸',
        'texture': '텍스쳐', 'layer': '레이어', 'wave': '웨이브',
        'curl': '컬', 'undercut': '언더컷', 'side': '사이드',
        'all-back': '올백', 'allback': '올백', 'comma': '가르마',
        'short': '숏컷', 'bob': '보브', 'medium': '미디엄',
        'long': '롱헤어', 'hush': '허쉬', 'shaggy': '샤기',
        'hime': '히메', 'bang': '뱅', 'wolf': '울프', 'tassel': '태슬'
    };

    for (const [eng, kor] of Object.entries(englishMap)) {
        if (name.includes(eng) && STYLE_FEATURES[kor]) {
            return { keyword: kor, ...STYLE_FEATURES[kor] };
        }
    }

    return null;
}

// ========== 얼굴+스타일 조합 멘트 찾기 ==========
function findCombinationReason(faceCondition, styleFeature, imageType) {
    const styleMood = styleFeature?.mood || '';
    const styleName = styleFeature?.keyword || '';

    // 이미지 타입 + 스타일 무드 조합
    if (imageType) {
        const type = imageType.type;
        if (type === 'warm' && ['chic', 'contrast', 'minimal', 'bold'].includes(styleMood)) {
            return FACE_STYLE_COMBINATIONS['warm_slick'] || `웜계의 또렷함이 ${styleName} 스타일과 시너지`;
        }
        if (type === 'cool' && ['soft', 'volume', 'elegant'].includes(styleMood)) {
            return FACE_STYLE_COMBINATIONS['cool_wave'] || `쿨계의 부드러움이 ${styleName} 스타일과 조화`;
        }
        if (type === 'neutral' && ['classic', 'balanced'].includes(styleMood)) {
            return FACE_STYLE_COMBINATIONS['neutral_classic'] || `뉴트럴한 인상에 클래식 스타일이 안정감`;
        }
    }

    // 얼굴형 + 스타일 조합
    if (faceCondition === 'long' && ['soft', 'volume', 'dynamic'].includes(styleMood)) {
        return FACE_STYLE_COMBINATIONS['long_wave'];
    }
    if (faceCondition === 'short' && ['bold', 'volume'].includes(styleMood)) {
        return FACE_STYLE_COMBINATIONS['short_top_volume'];
    }
    if (faceCondition === 'square' && ['soft', 'dynamic', 'elegant'].includes(styleMood)) {
        return FACE_STYLE_COMBINATIONS['square_soft'];
    }

    return null;
}

// 스타일별 개별 추천 이유 생성 (얼굴분석 + 스타일 고유 특징 결합)
// ⭐ score 파라미터 추가: 점수에 따라 톤 분리
function generateStyleReason(style, analysis, ratios, score = 50) {
    const parts = [];

    if (!ratios || !ratios.raw) {
        return '얼굴형 분석 기반 추천';
    }

    const { upperRatio, middleRatio, lowerRatio, cheekJawRatio, eyeDistanceRatio } = ratios.raw;
    const isLongFace = lowerRatio > 0.36 || lowerRatio > middleRatio * 1.12;
    const isShortFace = lowerRatio < 0.28;
    const isSquareJaw = cheekJawRatio < 1.15;
    const isOvalFace = cheekJawRatio > 1.35;
    const isWideForehead = upperRatio > 0.36;
    const isNarrowForehead = upperRatio < 0.25;
    const isWideEyes = eyeDistanceRatio > 1.1;

    const styleName = style.name || '';
    const mainCat = style.mainCategory || '';
    const subCat = style.subCategory || '';

    // 스타일 고유 특징 찾기
    const styleFeature = findStyleFeature(styleName);
    const imageType = analysis?.imageType;

    // 스타일 분류
    const isTopVolumeStyle = ['FRINGE UP', 'PUSHED BACK', 'MOHICAN'].includes(mainCat);
    const isSideVolumeStyle = ['SIDE PART', 'SIDE FRINGE'].includes(mainCat);
    const isShortStyle = ['BUZZ', 'CROP'].includes(mainCat);

    // ============================================
    // ⚠️ 저점수 (40점 이하): 경고/비추천 모드
    // ============================================
    if (score <= 40) {
        // 무조건 경고 멘트 우선
        if (isLongFace) {
            if (isTopVolumeStyle) {
                parts.push(`⚠️ 탑 볼륨이 긴 하안부(${ratios.lowerRatio}%)를 더욱 강조해 밸런스가 무너집니다`);
            } else if (isShortStyle) {
                parts.push(`⚠️ 짧은 기장이 긴 얼굴(${ratios.lowerRatio}%)을 커버해주지 못합니다`);
            }
        }
        if (isSquareJaw) {
            if (isShortStyle) {
                parts.push(`⚠️ 짧은 기장이 각진 턱선(${ratios.cheekJawRatio})을 그대로 노출합니다`);
            } else if (isTopVolumeStyle) {
                parts.push(`⚠️ 볼륨이 위로 올라가면서 각진 라인이 더 강조됩니다`);
            }
        }
        if (isWideForehead && (['N', 'None'].includes(subCat) || !subCat)) {
            if (isTopVolumeStyle || mainCat === 'PUSHED BACK') {
                parts.push(`⚠️ 넓은 이마(${ratios.upperRatio}%)가 완전 노출되어 밸런스가 무너집니다`);
            }
        }
        if (isShortFace && isSideVolumeStyle) {
            parts.push(`⚠️ 사이드 볼륨이 짧은 얼굴(${ratios.lowerRatio}%)을 더 짧아 보이게 합니다`);
        }

        // 기본 경고 (조건에 안 걸렸을 때)
        if (parts.length === 0) {
            if (isShortStyle) {
                parts.push(`⚠️ 짧은 기장은 얼굴 단점이 그대로 드러날 수 있음`);
            } else if (isTopVolumeStyle) {
                parts.push(`⚠️ 탑 볼륨은 얼굴 길이를 강조할 수 있음`);
            } else {
                parts.push(`⚠️ 얼굴형 커버에 적합하지 않음`);
            }
        }

        // 2순위: 대안 제시
        if (parts.length < 2) {
            parts.push(`다른 카테고리 스타일을 추천드립니다`);
        }

        // 중복 제거 후 반환
        const uniqueParts = [...new Set(parts)];
        return uniqueParts.slice(0, 2).join(' / ');
    }

    // ============================================
    // 😐 중립 점수 (41~60점): 중립/보통 모드
    // ============================================
    if (score <= 60) {
        // 스타일 키워드 추출
        const styleNameLower = styleName.toLowerCase();
        const hasWave = styleNameLower.includes('웨이브') || styleNameLower.includes('wave') || styleNameLower.includes('컬');
        const hasVolume = styleNameLower.includes('볼륨') || styleNameLower.includes('레이어');

        // 스타일 특징 언급 (부정적이지 않게)
        if (styleFeature) {
            parts.push(`${styleFeature.benefit}`);
        } else if (hasWave) {
            parts.push(`곡선감으로 부드러운 인상 연출`);
        } else if (hasVolume) {
            parts.push(`볼륨감으로 자연스러운 분위기`);
        } else {
            parts.push(`깔끔하고 단정한 무드 연출`);
        }

        // 개선 조언 (부정 대신 구체적 조언)
        if (isLongFace) {
            if (hasWave || hasVolume) {
                parts.push(`옆볼륨을 조금 더 살리면 비율이 더 좋아짐`);
            } else {
                parts.push(`웨이브나 볼륨 추가 시 길이 보정 효과 UP`);
            }
        } else if (isSquareJaw) {
            parts.push(`턱 주변 레이어드 추가 시 소프닝 효과 UP`);
        } else if (isWideForehead && isTopVolumeStyle) {
            parts.push(`앞머리 길이 조절로 밸런스 조정 가능`);
        } else {
            parts.push(`무난하게 소화 가능한 스타일`);
        }

        // 중복 제거 후 반환
        const uniqueParts = [...new Set(parts)];
        return uniqueParts.slice(0, 2).join(' / ');
    }

    // ============================================
    // ✓ 고점수 (80점 이상): 강력 추천 모드
    // ============================================
    if (score >= 80) {
        // 스타일 태그/키워드 추출
        const styleNameLower = styleName.toLowerCase();
        const hasWave = styleNameLower.includes('웨이브') || styleNameLower.includes('wave') || styleNameLower.includes('컬') || styleNameLower.includes('curl');
        const hasVolume = styleNameLower.includes('볼륨') || styleNameLower.includes('volume') || styleNameLower.includes('레이어') || styleNameLower.includes('layer');
        const hasSleek = styleNameLower.includes('생머리') || styleNameLower.includes('sleek') || styleNameLower.includes('스트레이트') || styleNameLower.includes('straight');
        const hasBang = ['EB', 'E', 'Eye Brow', 'Eye', 'FH', 'Fore Head'].includes(subCat);

        // Part A: 얼굴형 + 스타일 특성 강력 매칭
        if (isLongFace) {
            if (hasWave) {
                parts.push(`✓ 웨이브가 시선을 가로로 분산시켜 긴 얼굴형을 완벽하게 보완`);
            } else if (hasVolume) {
                parts.push(`✓ 풍성한 볼륨이 얼굴의 가로 비율을 채워주어 밸런스 최적화`);
            } else if (isSideVolumeStyle) {
                parts.push(`✓ 사이드 볼륨이 긴 하안부(${ratios.lowerRatio}%)를 완벽히 커버`);
            }
        } else if (isSquareJaw) {
            if (hasWave || (styleFeature && ['soft', 'dynamic'].includes(styleFeature.mood))) {
                parts.push(`✓ 부드러운 질감이 각진 턱선을 자연스럽게 소프닝`);
            }
        } else if (isShortFace && isTopVolumeStyle) {
            parts.push(`✓ 탑 볼륨이 짧은 얼굴(${ratios.lowerRatio}%)을 갸름하게 연출`);
        } else if (isWideEyes && isSideVolumeStyle) {
            parts.push(`✓ 가르마 라인이 넓은 미간을 중앙으로 모아줌`);
        } else if (isWideForehead && hasBang) {
            parts.push(`✓ 앞머리가 넓은 이마를 커버하여 이상적인 비율 완성`);
        }

        // Part B: 스타일 고유 장점 (fallback)
        if (parts.length === 0 && styleFeature) {
            parts.push(`✨ ${styleFeature.benefit}`);
        }

        // Part C: 이미지 타입 매칭
        if (imageType && parts.length < 2) {
            const type = imageType.type;
            if (type === 'warm' && styleFeature && ['chic', 'contrast', 'minimal', 'bold'].includes(styleFeature.mood)) {
                parts.push(`💡 ${imageType.name}의 또렷함이 시크한 무드와 완벽 시너지`);
            } else if (type === 'cool' && (hasWave || (styleFeature && ['soft', 'volume', 'elegant'].includes(styleFeature.mood)))) {
                parts.push(`💡 ${imageType.name}의 부드러움이 로맨틱 무드를 배가`);
            }
        }

        // 기본 베스트 매칭 멘트
        if (parts.length === 0) {
            parts.push(`✓ 얼굴형의 단점을 커버하고 장점을 극대화하는 베스트 스타일`);
        }

        // 중복 제거 후 반환
        const uniqueParts = [...new Set(parts)];
        return uniqueParts.slice(0, 2).join(' / ');
    }

    // ============================================
    // 양호 점수 (61~79점): 일반 추천 모드
    // ============================================

    // 얼굴 조건 판별
    let faceCondition = null;
    if (isLongFace) faceCondition = 'long';
    else if (isShortFace) faceCondition = 'short';
    else if (isSquareJaw) faceCondition = 'square';
    else if (isOvalFace) faceCondition = 'oval';

    // Part A: 스타일 고유 장점 (50%)
    if (styleFeature) {
        parts.push(`✨ ${styleFeature.benefit}`);
    }

    // Part B: 얼굴 분석 기반 조언 (50%)
    const combinationReason = findCombinationReason(faceCondition, styleFeature, imageType);
    if (combinationReason && parts.length < 2) {
        parts.push(`✓ ${combinationReason}`);
    }

    // 이미지 타입 매칭 보너스
    if (imageType && styleFeature && parts.length < 2) {
        const type = imageType.type;
        const subType = imageType.subType;

        if (type === 'warm' && styleFeature.mood === 'chic') {
            parts.push(`💡 ${imageType.name}의 또렷함이 시크한 무드와 시너지`);
        } else if (type === 'cool' && styleFeature.mood === 'soft') {
            parts.push(`💡 ${imageType.name}의 부드러움이 로맨틱 무드 배가`);
        } else if (subType === 'hard' && ['minimal', 'contrast', 'bold'].includes(styleFeature.mood)) {
            parts.push(`💡 하드한 인상에 선명한 라인이 잘 어울림`);
        } else if (subType === 'soft' && ['soft', 'elegant', 'volume'].includes(styleFeature.mood)) {
            parts.push(`💡 소프트한 인상에 부드러운 질감이 조화`);
        }
    }

    // 눈 사이 거리 (가르마/사이드 스타일에 특히 관련)
    if (isWideEyes && isSideVolumeStyle && parts.length < 2) {
        parts.push(`✓ 넓은 미간(${ratios.eyeDistanceRatio})을 가르마 라인이 중앙으로 모아줌`);
    }

    // 얼굴 길이 관련
    if (parts.length < 2) {
        if (isLongFace && isSideVolumeStyle) {
            parts.push(`✓ 하안부 ${ratios.lowerRatio}% → 사이드 볼륨으로 세로 비율 분산`);
        } else if (isLongFace && isTopVolumeStyle) {
            parts.push(`⚠️ 하안부 ${ratios.lowerRatio}% → 탑 볼륨이 길이 강조 가능`);
        } else if (isShortFace && isTopVolumeStyle) {
            parts.push(`✓ 하안부 ${ratios.lowerRatio}% → 탑 볼륨으로 갸름한 인상`);
        }
    }

    // 사각턱 + 소프트닝
    if (isSquareJaw && styleFeature && ['soft', 'dynamic', 'volume'].includes(styleFeature.mood) && parts.length < 2) {
        parts.push(`✓ 광대/턱 ${ratios.cheekJawRatio} → 부드러운 질감이 각진 라인 소프닝`);
    }

    // 이마 관련
    if (isWideForehead && parts.length < 2) {
        if (['EB', 'Eye Brow', 'E', 'Eye'].includes(subCat)) {
            parts.push(`✓ 상안부 ${ratios.upperRatio}% → 앞머리로 넓은 이마 커버`);
        } else if (['N', 'None'].includes(subCat) || !subCat) {
            if (isTopVolumeStyle) {
                parts.push(`⚠️ 상안부 ${ratios.upperRatio}% → 이마 노출 주의`);
            }
        }
    }

    // 스타일 reasons 배열에서 이미지 타입 관련 추가
    if (style.reasons && style.reasons.length > 0 && parts.length < 2) {
        const imageTypeReason = style.reasons.find(r => r.text && r.text.includes('무드'));
        if (imageTypeReason) {
            parts.push(imageTypeReason.type === 'positive' ? `✓ ${imageTypeReason.text}` : `⚠️ ${imageTypeReason.text}`);
        }
    }

    // 기본값 (아무것도 없을 때)
    if (parts.length === 0) {
        if (isOvalFace) {
            parts.push(`✓ 이상적인 비율로 다양한 스타일 소화 가능`);
        } else if (styleFeature) {
            parts.push(`✨ ${styleFeature.keywords[0]}이(가) 특징인 스타일`);
        } else {
            parts.push(`균형 잡힌 얼굴형에 적합`);
        }
    }

    // 중복 제거 후 반환
    const uniqueParts = [...new Set(parts)];
    return uniqueParts.slice(0, 2).join(' / ');
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
                const styleReason = generateStyleReason(style, analysisResults?.analysis, analysisResults?.ratios, style.score);
                const escapedReason = styleReason.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/<[^>]*>/g, '');
                return `
                <div class="style-card" onclick="openStyleDetail('${style.styleId}', '${escapedReason}')">
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

// 현재 선택된 스타일 (모달에서 사용)
let currentModalStyle = null;

// 스타일 상세 보기 (모달로 표시)
window.openStyleDetail = function(styleId, reason = '') {
    const style = allStyles.find(s => s.styleId === styleId);
    if (!style) {
        console.warn('⚠️ 스타일을 찾을 수 없음:', styleId);
        return;
    }

    console.log('📂 스타일 상세 모달:', style.name, styleId);
    currentModalStyle = style;

    // 모달 내용 설정
    const modal = document.getElementById('styleDetailModal');
    const imgEl = document.getElementById('styleModalImage');
    const titleEl = document.getElementById('styleModalTitle');
    const categoryEl = document.getElementById('styleModalCategory');
    const reasonEl = document.getElementById('styleModalReason');

    // 이미지 설정
    imgEl.src = style.resultImage || style.thumbnail || '';
    imgEl.onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="12">No Image</text></svg>';
    };

    // 텍스트 설정
    titleEl.textContent = style.name || styleId;
    categoryEl.textContent = `${style.mainCategory || ''} ${style.subCategory ? '· ' + style.subCategory : ''}`;
    reasonEl.textContent = reason || style.description || '';

    // 모달 표시
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
};

// 모달 닫기
window.closeStyleModal = function() {
    const modal = document.getElementById('styleDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentModalStyle = null;
};

// 룩북으로 이동
window.goToLookbook = function() {
    if (!currentModalStyle) return;

    // 스타일 정보를 먼저 저장 (closeStyleModal이 null로 만들기 전에)
    const styleId = currentModalStyle.styleId;
    const gender = currentModalStyle.gender || selectedGender;

    closeStyleModal();
    stopCamera();

    // 메인 페이지 룩북으로 이동
    const params = new URLSearchParams({
        action: 'lookbook',
        styleId: styleId,
        gender: gender
    });
    window.location.href = `/?${params.toString()}`;
};

// 헤어 체험으로 이동
window.goToHairTry = function() {
    if (!currentModalStyle) return;

    // 스타일 정보를 먼저 저장
    const styleId = currentModalStyle.styleId;
    const gender = currentModalStyle.gender || selectedGender;

    closeStyleModal();
    stopCamera();

    // 메인 페이지 헤어 체험으로 이동
    const params = new URLSearchParams({
        action: 'hairtry',
        styleId: styleId,
        gender: gender
    });
    window.location.href = `/?${params.toString()}`;
};

// 레시피 보기
window.goToRecipe = function() {
    if (!currentModalStyle) return;

    // 스타일 정보를 먼저 저장
    const styleId = currentModalStyle.styleId;
    const gender = currentModalStyle.gender || selectedGender;

    closeStyleModal();
    stopCamera();

    // 메인 페이지 레시피로 이동
    const params = new URLSearchParams({
        action: 'recipe',
        styleId: styleId,
        gender: gender
    });
    window.location.href = `/?${params.toString()}`;
};

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('styleDetailModal');
        if (modal && modal.style.display === 'flex') {
            closeStyleModal();
        }
    }
});

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
// Force rebuild 2025년 12월 27일 토 오전 12:51:39
