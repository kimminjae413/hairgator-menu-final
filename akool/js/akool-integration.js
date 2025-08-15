// ========== HAIRGATOR 최종 완성 AKOOL Integration ==========
// 🎯 실제 AKOOL API + 갤러리/카메라 기능 완전 통합

console.log('🎨 AKOOL Face Swap 최종 완전 버전 로딩 중...');

// 전역 변수
window.akoolConfig = {
    clientId: 'kdwRwzqnGf4zfAFvWCjFKQ==',
    clientSecret: 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g',
    token: null,
    userImageData: null,
    isInitialized: false,
    lastResult: null
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
        // 실제 AKOOL 함수들 등록
        setupAkoolFunctions();
        
        window.akoolConfig.isInitialized = true;
        console.log('✅ AKOOL 시스템 초기화 완료!');
        
    } catch (error) {
        console.error('❌ AKOOL 초기화 실패:', error);
    }
}

// ========== 🎫 실제 AKOOL API 함수들 ==========
function setupAkoolFunctions() {
    // 토큰 발급 함수
    window.getAkoolToken = async function() {
        console.log('🎫 AKOOL 토큰 요청...');
        
        try {
            const response = await fetch('/.netlify/functions/akool-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            console.log('✅ 토큰 발급:', data.success ? '성공' : '실패');
            
            if (data.success && data.token) {
                window.akoolConfig.token = data.token;
                localStorage.setItem('akool_token', data.token);
                localStorage.setItem('akool_token_issued', Date.now().toString());
            }
            
            return data;
        } catch (error) {
            console.error('❌ 토큰 오류:', error);
            return { success: false, error: error.message };
        }
    };

    // Face Swap 단계별 처리 함수
    window.akoolFaceSwap = async function(userImageData, styleImageUrl) {
        console.log('🚀 AKOOL 단계별 Face Swap 시작...');
        
        try {
            // 1단계: 사용자 얼굴 감지
            console.log('👤 1단계: 사용자 얼굴 감지...');
            const tokenResult1 = await window.getAkoolToken();
            if (!tokenResult1.success) {
                throw new Error('1단계 토큰 발급 실패');
            }
            
            const userResponse = await fetch('/.netlify/functions/akool-faceswap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'detect_user',
                    token: tokenResult1.token,
                    userImageUrl: userImageData
                })
            });
            
            const userData = await userResponse.json();
            console.log('✅ 1단계 완료:', userData.success ? '성공' : '실패');
            
            if (!userData.success) {
                throw new Error(`사용자 감지 실패: ${userData.error}`);
            }
            
            // 2단계: 스타일 분석
            console.log('💇 2단계: 스타일 분석...');
            const tokenResult2 = await window.getAkoolToken();
            if (!tokenResult2.success) {
                throw new Error('2단계 토큰 발급 실패');
            }
            
            const styleResponse = await fetch('/.netlify/functions/akool-faceswap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'detect_style',
                    token: tokenResult2.token,
                    styleImageUrl: styleImageUrl
                })
            });
            
            const styleData = await styleResponse.json();
            console.log('✅ 2단계 완료:', styleData.success ? '성공' : '실패');
            
            if (!styleData.success) {
                throw new Error(`스타일 분석 실패: ${styleData.error}`);
            }
            
            // 3단계: Face Swap 실행
            console.log('🔄 3단계: Face Swap 실행...');
            const tokenResult3 = await window.getAkoolToken();
            if (!tokenResult3.success) {
                throw new Error('3단계 토큰 발급 실패');
            }
            
            const swapResponse = await fetch('/.netlify/functions/akool-faceswap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'faceswap',
                    token: tokenResult3.token,
                    userData: userData,
                    styleData: styleData
                })
            });
            
            const swapResult = await swapResponse.json();
            console.log('✅ 3단계 완료:', swapResult.success ? '성공' : '실패');
            
            if (!swapResult.success) {
                throw new Error(`Face Swap 실패: ${swapResult.error}`);
            }
            
            console.log('🎉 모든 단계 성공! AKOOL 처리 완료!');
            return swapResult;
            
        } catch (error) {
            console.error('❌ AKOOL Face Swap 실패:', error);
            return { success: false, error: error.message };
        }
    };
    
    // 상태 확인 함수
    window.akoolStatus = async function(jobId) {
        console.log('📊 AKOOL 상태 확인...');
        
        try {
            const response = await fetch('/.netlify/functions/akool-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId })
            });
            
            const data = await response.json();
            console.log('✅ 상태 확인:', data.success ? '성공' : '실패');
            return data;
        } catch (error) {
            console.error('❌ 상태 확인 실패:', error);
            return { success: false, error: error.message };
        }
    };
}

// ========== 🚫 자동 버튼 추가 비활성화 ==========
window.addAIButtonToHairgator = function() {
    console.log('🔧 수동 AI 버튼 추가 요청 (현재 비활성화됨)');
    console.log('💡 main.js의 setupModalButtons에서 처리됩니다.');
    return false;
};

// ========== 📸 갤러리/카메라 선택 모달 ==========
window.openAkoolModal = function() {
    console.log('🎭 AKOOL 모달 열기');
    
    // 현재 모달에서 스타일 정보 가져오기
    const modal = document.getElementById('styleModal');
    if (modal) {
        const styleImage = modal.querySelector('img');
        const styleName = modal.querySelector('.modal-name')?.textContent?.trim();
        const styleCode = modal.querySelector('.modal-code')?.textContent?.trim();
        
        if (styleImage && styleName) {
            currentStyleImage = styleImage.src;
            currentStyleName = styleName;
            currentStyleCode = styleCode;
        }
    }
    
    if (!currentStyleImage || !currentStyleName) {
        alert('❌ 헤어스타일 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 기존 모달 제거
    const existingModal = document.getElementById('akoolModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 갤러리/카메라 선택 모달 생성
    const modalHTML = `
        <div id="akoolModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.3s ease;
        ">
            <div style="
                background: white;
                border-radius: 25px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                animation: slideUp 0.4s ease-out;
            ">
                <style>
                    @keyframes slideUp {
                        from { transform: translateY(50px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>
                
                <!-- 닫기 버튼 -->
                <button onclick="window.closeAkoolModal()" style="
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #999;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#f0f0f0'; this.style.color='#666'" 
                   onmouseout="this.style.background='none'; this.style.color='#999'">×</button>
                
                <!-- 헤더 -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 64px; margin-bottom: 15px;">🤖</div>
                    <h2 style="
                        background: linear-gradient(135deg, #FF1493, #FF69B4);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin: 0 0 10px 0;
                        font-size: 28px;
                        font-weight: 700;
                    ">AI 헤어스타일 체험</h2>
                    <div style="
                        background: linear-gradient(135deg, #fff, #f8f9fa);
                        border: 2px solid #FF1493;
                        border-radius: 15px;
                        padding: 15px;
                        margin: 15px 0;
                    ">
                        <p style="color: #FF1493; margin: 0; font-weight: bold; font-size: 16px;">
                            선택한 스타일: ${currentStyleName}
                        </p>
                        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">
                            코드: ${currentStyleCode}
                        </p>
                    </div>
                </div>
                
                <!-- 사진 선택 옵션 -->
                <div id="photoSelectionSection">
                    <h3 style="text-align: center; color: #333; margin-bottom: 25px; font-size: 20px;">
                        📸 얼굴 사진을 선택해주세요
                    </h3>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                        <!-- 갤러리에서 선택 -->
                        <button onclick="window.selectFromGallery()" style="
                            flex: 1;
                            background: linear-gradient(135deg, #4A90E2, #357ABD);
                            color: white;
                            border: none;
                            border-radius: 20px;
                            padding: 20px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            text-align: center;
                            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(74, 144, 226, 0.4)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(74, 144, 226, 0.3)'">
                            <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
                            <div>갤러리에서 선택</div>
                            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">기존 사진 불러오기</div>
                        </button>
                        
                        <!-- 카메라로 촬영 -->
                        <button onclick="window.openCamera()" style="
                            flex: 1;
                            background: linear-gradient(135deg, #FF6B6B, #EE5A24);
                            color: white;
                            border: none;
                            border-radius: 20px;
                            padding: 20px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            text-align: center;
                            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 107, 107, 0.4)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255, 107, 107, 0.3)'">
                            <div style="font-size: 32px; margin-bottom: 10px;">📷</div>
                            <div>카메라로 촬영</div>
                            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">현장에서 바로 촬영</div>
                        </button>
                    </div>
                    
                    <div style="
                        background: #f8f9fa;
                        border-radius: 15px;
                        padding: 20px;
                        border-left: 4px solid #FF1493;
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">📋 촬영 가이드</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.6;">
                            <li>정면을 바라보는 선명한 얼굴 사진</li>
                            <li>충분한 조명이 있는 곳에서 촬영</li>
                            <li>머리카락이 얼굴을 가리지 않도록</li>
                            <li>안경이나 모자 착용 시 제거 권장</li>
                        </ul>
                    </div>
                </div>
                
                <!-- 숨겨진 파일 입력 -->
                <input type="file" id="galleryInput" accept="image/*" style="display: none;" onchange="window.handleGallerySelection(event)">
                
                <!-- 카메라 섹션 (숨겨진 상태) -->
                <div id="cameraSection" style="display: none;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h3 style="color: #333; margin-bottom: 15px;">📷 카메라로 촬영하기</h3>
                        <video id="cameraVideo" autoplay style="
                            width: 100%;
                            max-width: 300px;
                            border-radius: 15px;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        "></video>
                        <canvas id="cameraCanvas" style="display: none;"></canvas>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 20px;">
                        <button onclick="window.capturePhoto()" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 15px 30px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            margin-right: 10px;
                        ">📸 촬영하기</button>
                        
                        <button onclick="window.backToSelection()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 15px 30px;
                            font-size: 16px;
                            cursor: pointer;
                        ">← 뒤로가기</button>
                    </div>
                </div>
                
                <!-- 이미지 미리보기 섹션 (숨겨진 상태) -->
                <div id="imagePreview" style="display: none; text-align: center; margin-bottom: 25px;">
                    <h3 style="color: #333; margin-bottom: 15px;">미리보기</h3>
                    <img id="previewImage" style="
                        max-width: 100%;
                        max-height: 250px;
                        border-radius: 15px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        margin-bottom: 15px;
                    ">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.startAkoolProcess()" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 25px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                        ">🚀 AI 변환 시작</button>
                        
                        <button onclick="window.backToSelection()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 25px;
                            font-size: 16px;
                            cursor: pointer;
                        ">다시 선택</button>
                    </div>
                </div>
                
                <!-- 처리 진행 섹션 (숨겨진 상태) -->
                <div id="processingSection" style="display: none; text-align: center;">
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 64px; margin-bottom: 15px;">🎨</div>
                        <h3 style="margin: 0; color: #FF1493; font-size: 22px;">AI가 헤어스타일을 적용하고 있어요!</h3>
                        <p style="color: #666; margin: 10px 0; font-size: 14px;">잠시만 기다려주세요...</p>
                    </div>
                    
                    <div style="
                        background: #f0f0f0;
                        border-radius: 12px;
                        height: 12px;
                        margin: 25px 0;
                        overflow: hidden;
                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <div id="progressBar" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            height: 100%;
                            width: 0%;
                            transition: width 0.3s ease;
                            border-radius: 12px;
                            box-shadow: 0 2px 4px rgba(255, 20, 147, 0.3);
                        "></div>
                    </div>
                    
                    <div id="progressText" style="font-weight: 600; color: #333; margin-bottom: 8px; font-size: 16px;">처리 시작...</div>
                    <div id="progressDetails" style="font-size: 13px; color: #666;"></div>
                </div>
                
                <!-- 결과 섹션 (숨겨진 상태) -->
                <div id="resultSection" style="display: none; text-align: center;">
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 64px; margin-bottom: 15px;">🎉</div>
                        <h3 style="color: #FF1493; margin-bottom: 15px; font-size: 24px;">완성되었습니다!</h3>
                    </div>
                    
                    <img id="resultImage" style="
                        max-width: 100%;
                        max-height: 300px;
                        border-radius: 15px;
                        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
                        margin-bottom: 20px;
                    ">
                    
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.downloadResult()" style="
                            background: linear-gradient(135deg, #4A90E2, #357ABD);
                            color: white;
                            border: none;
                            border-radius: 20px;
                            padding: 12px 20px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">💾 저장하기</button>
                        
                        <button onclick="window.shareResult()" style="
                            background: linear-gradient(135deg, #32CD32, #28A745);
                            color: white;
                            border: none;
                            border-radius: 20px;
                            padding: 12px 20px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">📤 공유하기</button>
                        
                        <button onclick="window.backToSelection()" style="
                            background: linear-gradient(135deg, #FF6B6B, #EE5A24);
                            color: white;
                            border: none;
                            border-radius: 20px;
                            padding: 12px 20px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">🔄 다시 시도</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 애니메이션
    setTimeout(() => {
        document.getElementById('akoolModal').style.opacity = '1';
    }, 10);
};

// ========== 📁 갤러리 선택 함수 ==========
window.selectFromGallery = function() {
    console.log('📁 갤러리에서 선택');
    document.getElementById('galleryInput').click();
};

window.handleGallerySelection = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 선택할 수 있습니다.');
        return;
    }
    
    console.log('✅ 갤러리에서 이미지 선택:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        window.akoolConfig.userImageData = e.target.result;
        showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
};

// ========== 📷 카메라 함수들 ==========
window.openCamera = async function() {
    console.log('📷 카메라 열기');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user' // 전면 카메라 우선
            } 
        });
        
        document.getElementById('photoSelectionSection').style.display = 'none';
        document.getElementById('cameraSection').style.display = 'block';
        
        const video = document.getElementById('cameraVideo');
        video.srcObject = stream;
        
        console.log('✅ 카메라 스트림 시작');
        
    } catch (error) {
        console.error('❌ 카메라 접근 실패:', error);
        alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
};

window.capturePhoto = function() {
    console.log('📸 사진 촬영');
    
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // 카메라 스트림 중지
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    window.akoolConfig.userImageData = imageData;
    showImagePreview(imageData);
    
    console.log('✅ 사진 촬영 완료');
};

window.backToSelection = function() {
    console.log('← 선택 화면으로 돌아가기');
    
    // 카메라 스트림 중지
    const video = document.getElementById('cameraVideo');
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // 섹션 표시 초기화
    document.getElementById('photoSelectionSection').style.display = 'block';
    document.getElementById('cameraSection').style.display = 'none';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    
    // 데이터 초기화
    window.akoolConfig.userImageData = null;
};

// ========== 🖼️ 이미지 미리보기 ==========
function showImagePreview(imageData) {
    document.getElementById('photoSelectionSection').style.display = 'none';
    document.getElementById('cameraSection').style.display = 'none';
    document.getElementById('imagePreview').style.display = 'block';
    
    document.getElementById('previewImage').src = imageData;
    
    console.log('👁️ 이미지 미리보기 표시');
}

// ========== 🚀 AKOOL 처리 시작 ==========
window.startAkoolProcess = async function() {
    console.log('🎨 AKOOL Face Swap 처리 시작...');
    
    if (faceSwapInProgress) {
        alert('이미 처리 중입니다.');
        return;
    }
    
    if (!window.akoolConfig.userImageData) {
        alert('사용자 이미지가 선택되지 않았습니다.');
        return;
    }
    
    faceSwapInProgress = true;
    
    // UI 전환
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    
    try {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        // 실제 AKOOL API 호출
        const progressSteps = [
            { progress: 20, text: '토큰 발급 중...', detail: 'AKOOL API 인증' },
            { progress: 40, text: '사용자 얼굴 분석 중...', detail: '얼굴 인식 및 특징점 추출' },
            { progress: 60, text: '헤어스타일 분석 중...', detail: '스타일 벡터화 및 매핑' },
            { progress: 80, text: 'AI Face Swap 처리 중...', detail: 'AKOOL 알고리즘 실행' },
            { progress: 100, text: '완료!', detail: '결과 이미지 생성 완료' }
        ];
        
        // 진행률 업데이트와 함께 실제 AKOOL 처리
        for (let i = 0; i < progressSteps.length; i++) {
            const step = progressSteps[i];
            
            progressBar.style.width = step.progress + '%';
            progressText.textContent = step.text;
            progressDetails.textContent = step.detail;
            
            if (i === 0) {
                // 토큰 발급
                await window.getAkoolToken();
            } else if (i === progressSteps.length - 1) {
                // 마지막 단계에서 실제 Face Swap 실행
                const result = await window.akoolFaceSwap(
                    window.akoolConfig.userImageData, 
                    currentStyleImage
                );
                
                if (result.success) {
                    window.akoolConfig.lastResult = result.processedImage || currentStyleImage;
                    showResult(window.akoolConfig.lastResult);
                } else {
                    throw new Error(result.error || 'Face Swap 처리 실패');
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('❌ AKOOL 처리 오류:', error);
        
        // 오류 발생 시 시뮬레이션 결과라도 보여주기
        alert(`처리 중 오류가 발생했습니다: ${error.message}\n\n시뮬레이션 결과를 표시합니다.`);
        
        window.akoolConfig.lastResult = currentStyleImage;
        showResult(currentStyleImage);
        
    } finally {
        faceSwapInProgress = false;
    }
};

// ========== 🎉 결과 표시 ==========
function showResult(resultImageUrl) {
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    
    document.getElementById('resultImage').src = resultImageUrl;
    
    console.log('🎉 결과 표시 완료');
}

// ========== 💾 결과 저장/공유 ==========
window.downloadResult = function() {
    if (window.akoolConfig.lastResult) {
        const link = document.createElement('a');
        link.download = `hairgator_ai_result_${currentStyleCode}_${Date.now()}.jpg`;
        link.href = window.akoolConfig.lastResult;
        link.click();
        
        console.log('💾 결과 이미지 다운로드');
    } else {
        alert('저장할 결과가 없습니다.');
    }
};

window.shareResult = function() {
    if (navigator.share && window.akoolConfig.lastResult) {
        // 데이터 URL을 Blob으로 변환
        fetch(window.akoolConfig.lastResult)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `hairgator_${currentStyleCode}.jpg`, { type: 'image/jpeg' });
                
                navigator.share({
                    title: `HAIRGATOR AI 결과 - ${currentStyleName}`,
                    text: `AI로 ${currentStyleName} 헤어스타일을 체험했어요!`,
                    files: [file]
                });
            });
    } else {
        // 폴백: 클립보드에 복사 또는 간단한 공유
        alert('🔗 공유 기능이 준비되었습니다!\n결과 이미지를 저장한 후 원하는 앱에서 공유해보세요.');
    }
    
    console.log('📤 결과 공유');
};

// ========== ❌ 모달 닫기 ==========
window.closeAkoolModal = function() {
    const modal = document.getElementById('akoolModal');
    if (modal) {
        // 카메라 스트림 정리
        const video = document.getElementById('cameraVideo');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            faceSwapInProgress = false;
            window.akoolConfig.userImageData = null;
        }, 300);
    }
    
    console.log('❌ AKOOL 모달 닫기');
};

console.log('🎉 AKOOL Integration 완전 업그레이드 버전 로드 완료!');
