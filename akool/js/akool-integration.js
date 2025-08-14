// ========== AKOOL Face Swap HAIRGATOR 최종 완성 버전 (핑크 버튼 수정) ==========
// 🎯 핑크 AI 버튼 자동 생성 문제 완전 해결 + 모든 기능 작동

console.log('🎨 AKOOL Face Swap 최종 버전 로딩 중...');

// 전역 변수
window.akoolConfig = {
    clientId: 'kdwRwzqnGf4zfAFvWCjFKQ==',  // ✅ 올바른 Client ID
    clientSecret: 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g',
    token: null,
    userImageData: null
};

let currentStyleImage = null;
let currentStyleName = null;
let currentStyleCode = null;
let faceSwapInProgress = false;

// ========== DOMContentLoaded에서 자동 실행 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AKOOL 자동 활성화 시작...');
    
    // 기존 토큰 확인
    const existingToken = localStorage.getItem('akool_token');
    const tokenIssued = localStorage.getItem('akool_token_issued');
    const tokenAge = Date.now() - (tokenIssued || 0);
    
    if (existingToken && tokenAge < 3600000) { // 1시간 유효
        console.log('✅ 기존 토큰 사용');
        window.akoolConfig.token = existingToken;
    }
    
    // 자동으로 AKOOL 활성화
    setTimeout(async () => {
        try {
            await window.activateAkoolNow();
            console.log('✅ AKOOL 자동 활성화 완료!');
        } catch (error) {
            console.error('❌ AKOOL 자동 활성화 실패:', error);
        }
    }, 1000);

    // 기존 showStyleDetail 함수 래핑
    setupShowStyleDetailWrapper();
});

// ========== 기존 showStyleDetail 함수 래핑 ✅ ==========
function setupShowStyleDetailWrapper() {
    const originalShowStyleDetail = window.showStyleDetail || function() {};
    
    window.showStyleDetail = function(code, name, gender, imageSrc, docId) {
        originalShowStyleDetail.call(this, code, name, gender, imageSrc, docId);
        
        // ✅ 헤어스타일 정보 저장 - 이미지 URL 정확히 저장
        currentStyleImage = imageSrc;
        currentStyleName = name;
        currentStyleCode = code;
        
        console.log('🎯 스타일 모달 열림:', { 
            code, 
            name, 
            gender, 
            imageSrc: imageSrc.substring(0, 50) + '...' 
        });
        
        // AI 버튼이 자동으로 추가되도록 대기
        setTimeout(() => {
            if (!document.querySelector('#akoolAIBtn')) {
                window.addAIButtonToHairgator();
            }
        }, 100);
    };
}

// ========== 1. 즉시 활성화 함수 ==========
window.activateAkoolNow = async function() {
    console.log('🎨 AKOOL Face Swap 즉시 활성화!');
    
    // 토큰 발급 (Netlify Functions 사용)
    const token = await window.getAkoolTokenNow();
    if (token) {
        // UI 버튼 추가 시스템 활성화
        window.addAIButtonToHairgator();
        console.log('🎉 AKOOL 활성화 완료!');
        return true;
    } else {
        console.warn('⚠️ AKOOL 토큰 발급 실패, 시뮬레이션 모드로 동작');
        return false;
    }
};

// ========== 2. 토큰 발급 함수 (Netlify Functions) ==========
window.getAkoolTokenNow = async function() {
    try {
        console.log('🔑 AKOOL 토큰 발급 요청...');
        
        const response = await fetch('/.netlify/functions/akool-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('🔑 토큰 응답:', data.success ? '성공' : '실패');
        
        if (data.success && data.token) {
            window.akoolConfig.token = data.token;
            localStorage.setItem('akool_token', data.token);
            localStorage.setItem('akool_token_issued', Date.now().toString());
            console.log('✅ AKOOL 토큰 저장 완료');
            return data.token;
        } else {
            console.warn('⚠️ 토큰 발급 실패:', data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 토큰 요청 오류:', error);
        return null;
    }
};

// ========== 3. AI 버튼 자동 추가 시스템 ✅ ==========
window.addAIButtonToHairgator = function() {
    const detailContainer = document.querySelector('.style-detail-container');
    const existingBtn = document.querySelector('#akoolAIBtn');
    
    if (!detailContainer) {
        console.log('⏳ 스타일 모달이 아직 열리지 않음');
        return;
    }
    
    if (existingBtn) {
        console.log('✅ AI 버튼이 이미 존재함');
        return;
    }
    
    console.log('🎨 핑크 AI 버튼 추가 중...');
    
    // 핑크 AI 버튼 생성
    const aiButton = document.createElement('button');
    aiButton.id = 'akoolAIBtn';
    aiButton.innerHTML = `
        <span style="font-size: 18px;">🤖</span>
        <span style="margin-left: 8px; font-weight: 600;">AI로 체험하기</span>
    `;
    
    // 핑크 테마 스타일
    Object.assign(aiButton.style, {
        background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: '15px',
        boxShadow: '0 4px 15px rgba(255, 20, 147, 0.3)',
        transition: 'all 0.3s ease',
        fontFamily: 'inherit'
    });
    
    // 호버 효과
    aiButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(255, 20, 147, 0.4)';
    });
    
    aiButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(255, 20, 147, 0.3)';
    });
    
    // 클릭 이벤트
    aiButton.addEventListener('click', function() {
        console.log('🤖 AI 체험하기 버튼 클릭!');
        window.openAkoolModal();
    });
    
    // 버튼 추가
    detailContainer.appendChild(aiButton);
    console.log('✅ 핑크 AI 버튼 추가 완료!');
};

// ========== 4. AKOOL 모달 열기 ==========
window.openAkoolModal = function() {
    console.log('🎭 AKOOL 모달 열기');
    
    if (!currentStyleImage) {
        alert('헤어스타일이 선택되지 않았습니다.');
        return;
    }
    
    // 기존 모달 닫기
    const existingModal = document.getElementById('akoolModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // AKOOL 모달 HTML 생성
    const modalHTML = `
        <div id="akoolModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div style="
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            ">
                <!-- 닫기 버튼 -->
                <button onclick="window.closeAkoolModal()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">×</button>
                
                <!-- 헤더 -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="
                        background: linear-gradient(135deg, #FF1493, #FF69B4);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin: 0;
                        font-size: 24px;
                        font-weight: 700;
                    ">🤖 AI 헤어스타일 체험</h2>
                    <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">
                        선택한 스타일: <strong>${currentStyleName}</strong>
                    </p>
                </div>
                
                <!-- 업로드 섹션 -->
                <div id="uploadSection" style="
                    border: 2px dashed #FFB6C1;
                    border-radius: 15px;
                    padding: 30px;
                    text-align: center;
                    background: #FFFAFC;
                    margin-bottom: 20px;
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">📸</div>
                    <p style="margin: 0 0 15px 0; color: #333; font-weight: 600;">사진을 업로드하세요</p>
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                        정면을 보고 있는 선명한 얼굴 사진을 선택해주세요
                    </p>
                    <input type="file" id="userImageUpload" accept="image/*" style="display: none;" onchange="window.handleImageUpload(event)">
                    <button onclick="document.getElementById('userImageUpload').click()" style="
                        background: linear-gradient(135deg, #FF1493, #FF69B4);
                        color: white;
                        border: none;
                        border-radius: 20px;
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">📁 사진 선택</button>
                </div>
                
                <!-- 이미지 미리보기 -->
                <div id="imagePreview" style="display: none; text-align: center; margin-bottom: 20px;">
                    <img id="previewImage" style="
                        max-width: 100%;
                        max-height: 200px;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    ">
                    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">업로드된 사진</p>
                </div>
                
                <!-- 진행 상황 -->
                <div id="processingSection" style="display: none; text-align: center;">
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🎨</div>
                        <h3 style="margin: 0; color: #FF1493;">AI가 헤어스타일을 적용하고 있어요!</h3>
                    </div>
                    
                    <div style="
                        background: #f0f0f0;
                        border-radius: 10px;
                        height: 8px;
                        margin: 20px 0;
                        overflow: hidden;
                    ">
                        <div id="progressBar" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            height: 100%;
                            width: 0%;
                            transition: width 0.3s ease;
                            border-radius: 10px;
                        "></div>
                    </div>
                    
                    <div id="progressText" style="font-weight: 600; color: #333; margin-bottom: 5px;">처리 시작...</div>
                    <div id="progressDetails" style="font-size: 12px; color: #666;"></div>
                </div>
                
                <!-- 결과 섹션 -->
                <div id="resultSection" style="display: none; text-align: center;">
                    <h3 style="color: #FF1493; margin-bottom: 15px;">🎉 완성되었습니다!</h3>
                    <img id="resultImage" style="
                        max-width: 100%;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        margin-bottom: 15px;
                    ">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.downloadResult()" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            color: white;
                            border: none;
                            border-radius: 15px;
                            padding: 8px 16px;
                            font-size: 14px;
                            cursor: pointer;
                        ">💾 저장</button>
                        <button onclick="window.shareResult()" style="
                            background: linear-gradient(135deg, #32CD32, #00FF00);
                            color: white;
                            border: none;
                            border-radius: 15px;
                            padding: 8px 16px;
                            font-size: 14px;
                            cursor: pointer;
                        ">📤 공유</button>
                    </div>
                </div>
                
                <!-- 시작 버튼 -->
                <button id="startProcessBtn" onclick="window.startAkoolProcess('${currentStyleImage}')" disabled style="
                    background: #ccc;
                    color: white;
                    border: none;
                    border-radius: 25px;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: not-allowed;
                    width: 100%;
                    margin-top: 15px;
                    transition: all 0.3s ease;
                ">🚀 AI 체험 시작</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 애니메이션
    setTimeout(() => {
        document.getElementById('akoolModal').style.opacity = '1';
    }, 10);
};

// ========== 5. 이미지 업로드 처리 ==========
window.handleImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('파일이 선택되지 않음');
        return;
    }
    
    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // 미리보기 표시
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('previewImage').src = imageData;
        
        // 시작 버튼 활성화
        const startBtn = document.getElementById('startProcessBtn');
        startBtn.disabled = false;
        startBtn.style.background = 'linear-gradient(135deg, #FF1493, #FF69B4)';
        startBtn.style.cursor = 'pointer';
        
        // 전역 변수에 저장
        window.akoolConfig.userImageData = imageData;
        
        console.log('✅ 사용자 이미지 업로드 완료');
    };
    
    reader.readAsDataURL(file);
};

// ========== 6. AI 처리 시작 (Netlify Functions 사용) ==========
window.startAkoolProcess = async function(styleImageUrl) {
    console.log('🎨 AKOOL Face Swap 처리 시작...');
    console.log('🎯 헤어스타일 이미지 URL:', styleImageUrl.substring(0, 50) + '...');
    
    if (faceSwapInProgress) {
        alert('이미 처리 중입니다.');
        return;
    }
    
    faceSwapInProgress = true;
    
    // UI 전환
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    document.getElementById('startProcessBtn').style.display = 'none';
    
    try {
        const token = window.akoolConfig.token || localStorage.getItem('akool_token');
        
        if (!token) {
            throw new Error('AKOOL 토큰이 없습니다. 다시 로그인해주세요.');
        }
        
        console.log('✅ AKOOL 토큰 확보:', token.substring(0, 40) + '...');
        
        // 진행률 업데이트 함수
        function updateProgress(percent, message, details = '') {
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const progressDetails = document.getElementById('progressDetails');
            
            if (progressBar) progressBar.style.width = percent + '%';
            if (progressText) progressText.textContent = message;
            if (progressDetails) progressDetails.textContent = details;
            
            console.log(`📊 진행률: ${percent}% - ${message}`);
        }
        
        // ⭐ Netlify Functions를 통한 AKOOL API 워크플로우 시작 ⭐
        updateProgress(5, '토큰 검증 중...', 'AKOOL 인증 확인');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateProgress(15, '이미지 업로드 중...', 'Firebase Storage에 임시 업로드');
        
        // 사용자 이미지를 Firebase에 임시 업로드
        const userImageUrl = await uploadImageToFirebase(window.akoolConfig.userImageData, 'user');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateProgress(30, '헤어스타일 이미지 처리 중...', '헤어스타일 이미지 준비');
        
        // ✅ 헤어스타일 이미지도 Firebase에 업로드 (URL이 Firebase가 아닌 경우)
        let finalStyleImageUrl = styleImageUrl;
        if (!styleImageUrl.includes('firebasestorage.googleapis.com')) {
            finalStyleImageUrl = await uploadImageToFirebase(styleImageUrl, 'style');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateProgress(45, '사용자 얼굴 분석 중...', 'Netlify Functions Face Detection');
        
        // ⭐ 1단계: 사용자 얼굴 감지 (Netlify Functions 사용)
        const userDetectResponse = await fetch('/.netlify/functions/akool-faceswap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                step: 'detect_user',
                token: token,
                userImage: userImageUrl
            })
        });
        
        const userDetectResult = await userDetectResponse.json();
        console.log('👤 사용자 얼굴 감지 결과:', userDetectResult.success);
        
        if (!userDetectResult.success) {
            throw new Error(userDetectResult.message || '사용자 얼굴을 감지할 수 없습니다');
        }
        
        updateProgress(60, '헤어스타일 얼굴 분석 중...', 'Netlify Functions Style Detection');
        
        // ⭐ 2단계: 헤어스타일 얼굴 감지
        const styleDetectResponse = await fetch('/.netlify/functions/akool-faceswap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                step: 'detect_style',
                token: token,
                targetImage: finalStyleImageUrl
            })
        });
        
        const styleDetectResult = await styleDetectResponse.json();
        console.log('💇 헤어스타일 얼굴 감지 결과:', styleDetectResult.success);
        
        if (!styleDetectResult.success) {
            throw new Error(styleDetectResult.message || '헤어스타일 이미지에서 얼굴을 감지할 수 없습니다');
        }
        
        updateProgress(75, 'AI 헤어스타일 적용 중...', 'AKOOL Face Swap 실행');
        
        // ⭐ 3단계: Face Swap 실행
        const faceSwapResponse = await fetch('/.netlify/functions/akool-faceswap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                step: 'faceswap',
                token: token,
                userFaceData: userDetectResult.faceData,
                styleFaceData: styleDetectResult.faceData
            })
        });
        
        const faceSwapResult = await faceSwapResponse.json();
        console.log('🎭 Face Swap 시작 결과:', faceSwapResult.success);
        
        if (!faceSwapResult.success) {
            throw new Error(faceSwapResult.message || 'Face Swap 실행 실패');
        }
        
        updateProgress(85, '결과 생성 중...', 'AI 처리 완료 대기');
        
        // ⭐ 4단계: 결과 확인 (폴링)
        const jobId = faceSwapResult.jobId;
        let attempts = 0;
        const maxAttempts = 30; // 최대 5분 대기
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기
            attempts++;
            
            const statusResponse = await fetch('/.netlify/functions/akool-faceswap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'status',
                    token: token,
                    jobId: jobId
                })
            });
            
            const statusResult = await statusResponse.json();
            console.log(`📊 상태 확인 ${attempts}회:`, statusResult.status);
            
            if (statusResult.success) {
                updateProgress(statusResult.progress, statusResult.message);
                
                if (statusResult.isComplete) {
                    if (statusResult.status === 'completed' && statusResult.resultUrl) {
                        // 성공!
                        updateProgress(100, '완료!', '헤어스타일 적용 성공');
                        showResult(statusResult.resultUrl);
                        return;
                    } else {
                        throw new Error('AI 처리 중 오류가 발생했습니다');
                    }
                }
            } else {
                console.warn('상태 확인 실패:', statusResult.message);
            }
        }
        
        throw new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        
    } catch (error) {
        console.error('❌ AKOOL 처리 오류:', error);
        
        // 오류 발생 시 Canvas 시뮬레이션으로 폴백
        updateProgress(50, '시뮬레이션 모드로 전환 중...', error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
            const simulationResult = await createCanvasSimulation(window.akoolConfig.userImageData, currentStyleImage);
            showResult(simulationResult.url, true);
        } catch (simError) {
            alert('처리 중 오류가 발생했습니다: ' + error.message);
            window.closeAkoolModal();
        }
    } finally {
        faceSwapInProgress = false;
    }
};

// ========== 7. Firebase 이미지 업로드 함수 ==========
async function uploadImageToFirebase(imageData, type) {
    try {
        console.log(`📤 ${type} 이미지 Firebase 업로드 시작...`);
        
        let blob;
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
            // Base64인 경우 Blob으로 변환
            const response = await fetch(imageData);
            blob = await response.blob();
        } else if (typeof imageData === 'string') {
            // 외부 URL인 경우 fetch하여 Blob으로 변환
            const response = await fetch(imageData);
            blob = await response.blob();
        } else {
            blob = imageData;
        }
        
        const fileName = `akool_temp_${type}_${Date.now()}.jpg`;
        const storageRef = firebase.storage().ref(`temp/${fileName}`);
        
        const uploadTask = await storageRef.put(blob);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        console.log(`✅ ${type} 이미지 업로드 완료:`, downloadURL.substring(0, 50) + '...');
        return downloadURL;
        
    } catch (error) {
        console.error(`❌ ${type} 이미지 업로드 실패:`, error);
        throw error;
    }
}

// ========== 8. Canvas 시뮬레이션 ==========
async function createCanvasSimulation(userImageData, styleImageUrl) {
    return new Promise((resolve) => {
        console.log('🎨 Canvas 시뮬레이션 시작...');
        
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // 배경
        ctx.fillStyle = '#FFE4E1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (userImageData && userImageData.startsWith('data:')) {
            const userImg = new Image();
            userImg.onload = () => {
                // 사용자 이미지 그리기
                const userSize = Math.min(canvas.width, canvas.height) * 0.4;
                const userX = (canvas.width - userSize) / 2;
                const userY = (canvas.height - userSize) / 2;
                
                ctx.drawImage(userImg, userX, userY, userSize, userSize);
                
                // 헤어스타일 효과 시뮬레이션 (테두리)
                ctx.strokeStyle = '#FF1493';
                ctx.lineWidth = 8;
                ctx.setLineDash([20, 10]);
                ctx.strokeRect(userX - 20, userY - 20, userSize + 40, userSize + 40);
                
                // 워터마크
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
                
                ctx.fillStyle = '#FF1493';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('HAIRGATOR AI 시뮬레이션', canvas.width / 2, canvas.height - 60);
                
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.fillText('실제 AI 결과와 다를 수 있습니다', canvas.width / 2, canvas.height - 30);
                
                const resultDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                
                resolve({
                    url: resultDataUrl,
                    method: 'canvas'
                });
            };
            
            userImg.onerror = () => {
                // 이미지 로드 실패시 기본 시뮬레이션
                createBasicSimulation();
            };
            
            userImg.src = userImageData;
        } else {
            // 외부 URL인 경우 기본 시뮬레이션
            createBasicSimulation();
        }
        
        function createBasicSimulation() {
            // 기본 얼굴 모양 그리기
            ctx.fillStyle = '#FFE4B5';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2, 150, 200, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // 눈
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2 - 50, canvas.height / 2 - 50, 15, 10, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2 + 50, canvas.height / 2 - 50, 15, 10, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // 입
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 + 30, 30, 0, Math.PI);
            ctx.stroke();
            
            // 헤어스타일 효과
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2 - 120, 160, 80, 0, 0, Math.PI);
            ctx.fill();
            
            // 워터마크
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
            
            ctx.fillStyle = '#FF1493';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HAIRGATOR AI 시뮬레이션', canvas.width / 2, canvas.height - 60);
            
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('실제 AI 결과와 다를 수 있습니다', canvas.width / 2, canvas.height - 30);
            
            const resultDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            resolve({
                url: resultDataUrl,
                method: 'canvas_basic'
            });
        }
    });
}

// ========== 9. 결과 표시 ==========
function showResult(imageUrl, isSimulation = false) {
    console.log('🎉 결과 표시:', isSimulation ? '시뮬레이션' : 'AI 결과');
    
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultImage').src = imageUrl;
    
    // 전역 변수에 결과 저장
    window.akoolConfig.lastResult = imageUrl;
    
    if (isSimulation) {
        const resultSection = document.getElementById('resultSection');
        resultSection.querySelector('h3').innerHTML = '🎨 시뮬레이션 완성!';
        
        const notice = document.createElement('p');
        notice.style.cssText = 'color: #666; font-size: 12px; margin: 10px 0;';
        notice.textContent = '※ 이것은 시뮬레이션 결과입니다. 실제 AI 결과와 다를 수 있습니다.';
        resultSection.insertBefore(notice, resultSection.querySelector('div'));
    }
}

// ========== 10. 유틸리티 함수들 ==========
window.closeAkoolModal = function() {
    const modal = document.getElementById('akoolModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            faceSwapInProgress = false;
        }, 300);
    }
};

window.downloadResult = function() {
    if (window.akoolConfig.lastResult) {
        const link = document.createElement('a');
        link.download = `hairgator_ai_result_${Date.now()}.jpg`;
        link.href = window.akoolConfig.lastResult;
        link.click();
    }
};

window.shareResult = function() {
    if (navigator.share && window.akoolConfig.lastResult) {
        navigator.share({
            title: 'HAIRGATOR AI 헤어스타일 결과',
            text: 'HAIRGATOR AI로 만든 나의 새로운 헤어스타일!',
            url: window.location.href
        });
    } else {
        // 폴백: URL 복사
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('링크가 클립보드에 복사되었습니다!');
        });
    }
};

console.log('🎉 AKOOL Integration 최종 버전 로드 완료!');
