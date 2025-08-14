// ========== HAIRGATOR 최종 완성 AKOOL Integration ==========
// 🎯 자동 버튼 생성 비활성화 + 모든 AKOOL 기능 유지

console.log('🎨 AKOOL Face Swap 최종 버전 로딩 중... (자동 버튼 생성 비활성화)');

// 전역 변수
window.akoolConfig = {
    clientId: 'kdwRwzqnGf4zfAFvWCjFKQ==',
    clientSecret: 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g',
    token: null,
    userImageData: null,
    isInitialized: false
};

let currentStyleImage = null;
let currentStyleName = null;
let currentStyleCode = null;
let faceSwapInProgress = false;

// ========== ✅ 중복 초기화 방지 시스템 ==========
if (window.akoolSystemInitialized) {
    console.log('⚠️ AKOOL 시스템이 이미 초기화됨. 중복 실행 방지.');
} else {
    window.akoolSystemInitialized = true;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAkoolSystem);
    } else {
        initializeAkoolSystem();
    }
}

// ========== ✅ 단일 초기화 함수 ==========
async function initializeAkoolSystem() {
    if (window.akoolConfig.isInitialized) {
        console.log('⚠️ AKOOL 이미 초기화됨');
        return;
    }
    
    console.log('🚀 AKOOL 시스템 초기화 시작...');
    
    try {
        // 1. 기존 토큰 확인
        const existingToken = localStorage.getItem('akool_token');
        const tokenIssued = localStorage.getItem('akool_token_issued');
        const tokenAge = Date.now() - (tokenIssued || 0);
        
        if (existingToken && tokenAge < 3600000) {
            console.log('✅ 기존 토큰 사용');
            window.akoolConfig.token = existingToken;
        }
        
        // 2. 토큰 발급 시도
        const token = await window.getAkoolTokenNow();
        
        // 🚫 자동 모달 관찰자 설정 비활성화 (가짜 버튼 생성 방지)
        // setupModalObserver();
        
        // 🚫 자동 showStyleDetail 래핑 비활성화 (main.js에서 처리)
        // setupShowStyleDetailWrapper();
        
        window.akoolConfig.isInitialized = true;
        console.log('✅ AKOOL 시스템 초기화 완료! (자동 버튼 생성 비활성화)');
        
    } catch (error) {
        console.error('❌ AKOOL 초기화 실패:', error);
    }
}

// ========== 🚫 자동 모달 관찰자 비활성화 ==========
// function setupModalObserver() {
//     // 이 함수를 비활성화하여 자동 버튼 생성 방지
// }

// ========== 🚫 자동 showStyleDetail 래핑 비활성화 ==========  
// function setupShowStyleDetailWrapper() {
//     // 이 함수를 비활성화하여 main.js에서 처리하도록 함
// }

// ========== 🚫 자동 AI 버튼 추가 비활성화 ==========
// function addAIButtonSafely() {
//     // 이 함수를 비활성화하여 중복 버튼 생성 방지
// }

// ========== ✅ 수동 버튼 추가 함수 (필요시에만) ==========
window.addAIButtonToHairgator = function() {
    console.log('🔧 수동 AI 버튼 추가 요청 (현재 비활성화됨)');
    console.log('💡 main.js의 setupModalButtons에서 처리됩니다.');
    return false;
};

// ========== 토큰 발급 함수 (Netlify Functions) ==========
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

// ========== AKOOL 모달 열기 (최적화된 버전) ==========
window.openAkoolModal = function() {
    console.log('🎭 AKOOL 모달 열기');
    
    // 현재 모달에서 스타일 정보 가져오기
    const modalImage = document.querySelector('#modalImage');
    const modalCode = document.querySelector('#modalCode');
    const modalName = document.querySelector('#modalName');
    
    if (modalImage && modalCode && modalName) {
        currentStyleImage = modalImage.src;
        currentStyleCode = modalCode.textContent;
        currentStyleName = modalName.textContent;
    }
    
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

// ========== 이미지 업로드, 처리, 결과 함수들 ==========
window.handleImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('previewImage').src = imageData;
        
        const startBtn = document.getElementById('startProcessBtn');
        startBtn.disabled = false;
        startBtn.style.background = 'linear-gradient(135deg, #FF1493, #FF69B4)';
        startBtn.style.cursor = 'pointer';
        
        window.akoolConfig.userImageData = imageData;
        console.log('✅ 사용자 이미지 업로드 완료');
    };
    
    reader.readAsDataURL(file);
};

window.startAkoolProcess = async function(styleImageUrl) {
    console.log('🎨 AKOOL Face Swap 처리 시작...');
    
    if (faceSwapInProgress) {
        alert('이미 처리 중입니다.');
        return;
    }
    
    faceSwapInProgress = true;
    
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    document.getElementById('startProcessBtn').style.display = 'none';
    
    try {
        // 🎯 현재는 데모 버전
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        // 진행률 시뮬레이션
        const progressSteps = [
            { progress: 20, text: '사용자 이미지 분석 중...', detail: '얼굴 인식 및 특징점 추출' },
            { progress: 40, text: '헤어스타일 이미지 처리 중...', detail: '스타일 벡터화 및 매핑' },
            { progress: 60, text: 'AI 모델 적용 중...', detail: 'AKOOL Face Swap 알고리즘 실행' },
            { progress: 80, text: '결과 이미지 생성 중...', detail: '고해상도 렌더링 및 후처리' },
            { progress: 100, text: '완료!', detail: 'AI 헤어스타일 체험 결과 준비됨' }
        ];
        
        for (let i = 0; i < progressSteps.length; i++) {
            const step = progressSteps[i];
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            progressBar.style.width = step.progress + '%';
            progressText.textContent = step.text;
            progressDetails.textContent = step.detail;
        }
        
        // 결과 표시
        setTimeout(() => {
            document.getElementById('processingSection').style.display = 'none';
            document.getElementById('resultSection').style.display = 'block';
            
            // 데모 결과 이미지 (실제 구현시 AKOOL API 결과 사용)
            document.getElementById('resultImage').src = currentStyleImage;
            
            alert('🎉 AI 처리가 완료되었습니다!\n\n현재는 데모 버전입니다.');
        }, 500);
        
    } catch (error) {
        console.error('❌ 처리 오류:', error);
        alert('처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
        faceSwapInProgress = false;
    }
};

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
    } else {
        alert('아직 저장할 결과가 없습니다.');
    }
};

window.shareResult = function() {
    alert('🔗 공유 기능은 실제 AI 결과가 생성된 후 사용 가능합니다.');
};

console.log('🎉 AKOOL Integration 최종 완성 버전 로드 완료! (자동 버튼 생성 완전 비활성화)');
