// ========== AI 체험 기능 (백엔드 연동) - 실제 API 연결 버전 ==========

// 전역 변수
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// ========== AKOOL 서비스 초기화 ==========
if (!window.akoolService) {
    window.akoolService = {
        baseURL: null,
        isInitialized: false,
        
        async init() {
            console.log('🚀 AKOOL 서비스 초기화 시작...');
            
            // 저장된 URL 확인
            const savedUrl = localStorage.getItem('hairgator_backend_url');
            if (savedUrl && !savedUrl.includes('demo-mode') && !savedUrl.includes('your-ngrok-url')) {
                this.baseURL = savedUrl;
                console.log('💾 저장된 백엔드 URL 사용:', savedUrl);
            } else if (window.faceSwapBackend && window.faceSwapBackend.baseURL) {
                this.baseURL = window.faceSwapBackend.baseURL;
            }
            
            // 연결 테스트
            if (this.baseURL && !this.baseURL.includes('your-ngrok-url')) {
                const connected = await this.checkConnection();
                if (connected) {
                    this.isInitialized = true;
                    console.log('✅ AKOOL 서비스 초기화 성공');
                    return true;
                }
            }
            
            console.warn('⚠️ 백엔드 연결 실패 - 설정 필요');
            return false;
        },
        
        async checkConnection() {
            if (!this.baseURL || this.baseURL.includes('demo-mode') || this.baseURL.includes('your-ngrok-url')) {
                return false;
            }
            
            try {
                const response = await fetch(`${this.baseURL}/health`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                return response.ok;
            } catch (error) {
                console.error('연결 확인 실패:', error);
                return false;
            }
        },
        
        async faceSwap(customerImageUrl, styleImageUrl) {
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (!this.baseURL || this.baseURL.includes('demo-mode')) {
                throw new Error('백엔드 서버가 연결되지 않았습니다');
            }
            
            try {
                console.log('🔄 Face Swap API 호출...');
                
                const response = await fetch(`${this.baseURL}/api/face-swap`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_image_url: customerImageUrl,
                        style_image_url: styleImageUrl
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Face Swap 성공:', result);
                    return {
                        success: true,
                        imageUrl: result.result_image_url || result.imageUrl
                    };
                } else {
                    throw new Error(result.error || 'Face Swap 실패');
                }
                
            } catch (error) {
                console.error('❌ Face Swap 오류:', error);
                throw error;
            }
        },
        
        isConnected() {
            return this.isInitialized && this.baseURL && !this.baseURL.includes('demo');
        },
        
        async getCreditInfo() {
            // 크레딧 정보 조회 (선택사항)
            return { success: true, credit: 100 };
        }
    };
}

// ========== 백엔드 설정 함수 ==========
window.setupAkoolBackend = function(backendUrl) {
    if (!backendUrl) {
        console.error('❌ 백엔드 URL이 필요합니다');
        showBackendSetupGuide();
        return false;
    }
    
    // URL 정규화
    backendUrl = backendUrl.trim().replace(/\/$/, '');
    
    // AKOOL 서비스 업데이트
    window.akoolService.baseURL = backendUrl;
    window.akoolService.isInitialized = false;
    
    // Face Swap 백엔드 업데이트
    if (window.faceSwapBackend) {
        window.faceSwapBackend.baseURL = backendUrl;
        window.faceSwapBackend.webhookURL = `${backendUrl}/api/webhook`;
    }
    
    // 로컬 스토리지에 저장
    localStorage.setItem('hairgator_backend_url', backendUrl);
    
    console.log('✅ 백엔드 URL 설정:', backendUrl);
    
    // 연결 테스트
    window.akoolService.init();
    
    return true;
};

// ========== AI Face Swap 처리 함수 (수정) ==========
async function processAIFaceSwap() {
    if (!uploadedCustomerPhoto || !currentAIStyleImage) {
        showToast('사진을 먼저 선택해주세요', 'error');
        return;
    }
    
    const processBtn = document.getElementById('processBtn') || document.getElementById('aiProcessBtn');
    if (!processBtn) {
        console.error('처리 버튼을 찾을 수 없습니다');
        return;
    }
    
    const originalText = processBtn.innerHTML;
    
    // 버튼 비활성화 및 로딩 상태
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="ai-icon">⏳</span><span>AI 처리 중...</span>';
    processBtn.classList.add('ai-processing');
    
    try {
        // 백엔드 연결 상태 확인
        let isConnected = await window.akoolService.checkConnection();
        
        if (!isConnected) {
            // 저장된 URL로 재시도
            const savedUrl = localStorage.getItem('hairgator_backend_url');
            if (savedUrl && !savedUrl.includes('demo-mode') && !savedUrl.includes('your-ngrok-url')) {
                console.log('💾 저장된 백엔드 URL로 연결 시도:', savedUrl);
                window.akoolService.baseURL = savedUrl;
                isConnected = await window.akoolService.checkConnection();
                
                if (isConnected) {
                    window.akoolService.isInitialized = true;
                }
            }
        }
        
        if (isConnected) {
            // ===== 실제 API 처리 =====
            console.log('🚀 실제 AKOOL API 처리 시작');
            
            showProcessingSteps();
            
            // 1단계: 이미지 준비
            updateProcessingStep(1, '이미지 준비 중...');
            
            // 이미지 URL 준비 (Firebase Storage 업로드 또는 Base64 사용)
            let customerImageUrl = uploadedCustomerPhoto;
            let styleImageUrl = currentAIStyleImage;
            
            // Firebase Storage 업로드 (선택사항)
            if (uploadedCustomerPhoto.startsWith('data:image/') && typeof uploadToFirebaseStorage === 'function') {
                try {
                    showToast('이미지 업로드 중...', 'info');
                    customerImageUrl = await uploadToFirebaseStorage(uploadedCustomerPhoto);
                } catch (e) {
                    console.log('Firebase 업로드 실패, Base64 사용');
                }
            }
            
            // 2단계: Face Swap 실행
            updateProcessingStep(2, 'AI 얼굴 분석 중...');
            
            const result = await window.akoolService.faceSwap(customerImageUrl, styleImageUrl);
            
            if (result.success) {
                updateProcessingStep(3, '합성 완료!');
                
                // 실제 결과 표시
                await new Promise(resolve => setTimeout(resolve, 1000)); // 잠시 대기
                
                showAIResult(result.imageUrl, false); // false = 실제 결과
                closePhotoUploadModal();
                showToast('✨ AI 합성이 완료되었습니다!', 'success');
                
                // 결과 저장 (선택사항)
                if (typeof saveAIResultToFirebase === 'function') {
                    saveAIResultToFirebase(result.imageUrl);
                }
                
            } else {
                throw new Error(result.error || 'AI 처리 실패');
            }
            
        } else {
            // ===== 백엔드 연결 안내 =====
            console.warn('⚠️ 백엔드 미연결');
            hideProcessingSteps();
            showBackendSetupGuide();
        }
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        handleAIError(error);
        
    } finally {
        // 버튼 상태 복원
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = originalText;
            processBtn.classList.remove('ai-processing');
        }
        hideProcessingSteps();
    }
}

// ========== 백엔드 설정 가이드 ==========
function showBackendSetupGuide() {
    // 기존 가이드 제거
    const existingModal = document.querySelector('.backend-setup-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'backend-setup-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div class="setup-content" style="background: white; border-radius: 15px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <h2 style="color: #E91E63; margin-bottom: 20px;">🔧 AI 백엔드 설정 필요</h2>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">빠른 설정</h3>
                <ol style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 10px;">
                        <strong>백엔드 서버 실행:</strong><br>
                        <code style="background: #333; color: #0f0; padding: 5px 10px; border-radius: 5px; display: inline-block; margin-top: 5px;">
                            cd HAIRGATOR-backend && python app.py
                        </code>
                    </li>
                    <li style="margin-bottom: 10px;">
                        <strong>ngrok으로 외부 접근 허용:</strong><br>
                        <code style="background: #333; color: #0f0; padding: 5px 10px; border-radius: 5px; display: inline-block; margin-top: 5px;">
                            ngrok http 3008
                        </code>
                    </li>
                    <li style="margin-bottom: 10px;">
                        <strong>ngrok URL 입력:</strong><br>
                        <input type="text" id="backendUrlInput" placeholder="https://your-backend.ngrok-free.app" 
                               style="width: 100%; padding: 10px; border: 2px solid #E91E63; border-radius: 5px; margin-top: 5px;">
                    </li>
                </ol>
                
                <button onclick="connectBackend()" style="background: #E91E63; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin-top: 15px; width: 100%; font-size: 16px; font-weight: bold;">
                    연결하기
                </button>
            </div>
            
            <div style="background: #fff3e0; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="color: #ff6f00; margin-bottom: 10px;">💡 또는 콘솔에서 직접 설정</h4>
                <code style="background: #333; color: #0f0; padding: 10px; border-radius: 5px; display: block; font-size: 12px;">
                    setupAkoolBackend("https://your-backend.ngrok-free.app")
                </code>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="color: #1976d2; margin-bottom: 10px;">🎭 데모 모드로 계속</h4>
                <p style="margin: 0 0 10px 0; color: #666;">백엔드 없이 시뮬레이션으로 진행합니다</p>
                <button onclick="continueDemoMode()" style="background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer;">
                    데모 모드 사용
                </button>
            </div>
            
            <button onclick="this.closest('.backend-setup-modal').remove()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; width: 100%;">
                닫기
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 백엔드 연결
window.connectBackend = async function() {
    const urlInput = document.getElementById('backendUrlInput');
    if (!urlInput || !urlInput.value) {
        showToast('URL을 입력해주세요', 'error');
        return;
    }
    
    const url = urlInput.value.trim();
    
    showToast('연결 중...', 'info');
    
    await setupAkoolBackend(url);
    
    const connected = await window.akoolService.checkConnection();
    if (connected) {
        showToast('✅ 백엔드 연결 성공!', 'success');
        document.querySelector('.backend-setup-modal')?.remove();
        
        // AI 처리 재시작
        processAIFaceSwap();
    } else {
        showToast('❌ 연결 실패 - URL을 확인해주세요', 'error');
    }
};

// 데모 모드 계속
window.continueDemoMode = function() {
    document.querySelector('.backend-setup-modal')?.remove();
    
    showProcessingSteps();
    
    // 데모 처리 시뮬레이션
    setTimeout(() => {
        updateProcessingStep(1, '이미지 준비 중...');
    }, 500);
    
    setTimeout(() => {
        updateProcessingStep(2, 'AI 분석 중...');
    }, 1500);
    
    setTimeout(() => {
        updateProcessingStep(3, '합성 완료!');
    }, 2500);
    
    setTimeout(() => {
        hideProcessingSteps();
        showAIResult('demo', true);
        closePhotoUploadModal();
        showToast('데모 모드: AI 합성 시뮬레이션 완료', 'info');
    }, 3500);
};

// ========== 처리 단계 표시 ==========
function showProcessingSteps() {
    const modal = document.getElementById('aiPhotoModal');
    if (!modal) return;
    
    const existingSteps = document.getElementById('processingSteps');
    if (existingSteps) existingSteps.remove();
    
    const stepsDiv = document.createElement('div');
    stepsDiv.id = 'processingSteps';
    stepsDiv.innerHTML = `
        <div class="step" id="step1">
            <span class="step-icon">📷</span>
            <span class="step-text">이미지 준비 중...</span>
        </div>
        <div class="step" id="step2">
            <span class="step-icon">🤖</span>
            <span class="step-text">AI 분석 중...</span>
        </div>
        <div class="step" id="step3">
            <span class="step-icon">✨</span>
            <span class="step-text">합성 중...</span>
        </div>
    `;
    
    stepsDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 300px;
    `;
    
    modal.appendChild(stepsDiv);
}

function updateProcessingStep(step, text) {
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        const textElement = stepElement.querySelector('.step-text');
        if (textElement) {
            textElement.textContent = text;
        }
        stepElement.classList.add('active');
        stepElement.style.color = '#E91E63';
    }
}

function hideProcessingSteps() {
    const stepsDiv = document.getElementById('processingSteps');
    if (stepsDiv) {
        stepsDiv.remove();
    }
}

// ========== AI 결과 표시 ==========
window.showAIResult = function(resultImageUrl, isDemo = false) {
    const resultModal = document.createElement('div');
    resultModal.className = 'ai-result-modal';
    resultModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    if (isDemo || resultImageUrl === 'demo') {
        // 데모 결과
        resultModal.innerHTML = `
            <div class="ai-modal-content" style="background: white; border-radius: 15px; padding: 30px; max-width: 500px;">
                <h2 style="color: #E91E63; text-align: center; margin-bottom: 20px;">
                    ✨ AI 합성 결과 (데모)
                </h2>
                <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
                    <h3>${currentAIStyleName || '스타일'}</h3>
                    <p>데모 모드 - 시뮬레이션 완료</p>
                    <p style="font-size: 14px; margin-top: 10px; opacity: 0.9;">실제 합성을 위해서는 백엔드 연결이 필요합니다</p>
                </div>
                <button onclick="this.closest('.ai-result-modal').remove(); document.body.style.overflow='';" 
                        style="background: #666; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; width: 100%; margin-top: 20px;">
                    닫기
                </button>
            </div>
        `;
    } else {
        // 실제 결과
        resultModal.innerHTML = `
            <div class="ai-modal-content" style="background: white; border-radius: 15px; padding: 30px; max-width: 600px;">
                <h2 style="color: #E91E63; text-align: center; margin-bottom: 20px;">
                    ✨ AI 합성 완료!
                </h2>
                <div style="text-align: center;">
                    <img src="${resultImageUrl}" style="max-width: 100%; max-height: 400px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                    <div style="margin-top: 20px;">
                        <h3 style="color: #333;">${currentAIStyleName || '스타일'} 적용 완료</h3>
                        <p style="color: #666;">AI가 성공적으로 헤어스타일을 합성했습니다!</p>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="downloadAIResult('${resultImageUrl}')" 
                            style="flex: 1; background: #E91E63; color: white; border: none; padding: 12px; border-radius: 25px; cursor: pointer;">
                        💾 저장
                    </button>
                    <button onclick="shareAIResult('${resultImageUrl}')" 
                            style="flex: 1; background: #4A90E2; color: white; border: none; padding: 12px; border-radius: 25px; cursor: pointer;">
                        📤 공유
                    </button>
                </div>
                <button onclick="this.closest('.ai-result-modal').remove(); document.body.style.overflow='';" 
                        style="background: #666; color: white; border: none; padding: 10px; border-radius: 20px; cursor: pointer; width: 100%; margin-top: 10px;">
                    닫기
                </button>
            </div>
        `;
    }
    
    document.body.appendChild(resultModal);
    document.body.style.overflow = 'hidden';
};

// 결과 저장/공유
window.downloadAIResult = function(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hairgator_${currentAIStyleName}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('이미지가 저장되었습니다', 'success');
};

window.shareAIResult = async function(imageUrl) {
    if (navigator.share) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'hairgator_ai_result.jpg', { type: 'image/jpeg' });
            
            await navigator.share({
                title: 'HAIRGATOR AI 헤어스타일',
                text: `AI로 합성한 ${currentAIStyleName} 헤어스타일입니다!`,
                files: [file]
            });
            
            showToast('공유되었습니다', 'success');
        } catch (error) {
            console.log('공유 실패:', error);
        }
    } else {
        // 클립보드에 URL 복사
        navigator.clipboard.writeText(imageUrl);
        showToast('이미지 URL이 복사되었습니다', 'info');
    }
};

// ========== 기존 함수들 유지 ==========

// 이미지 처리 함수
async function prepareImageForProcessing(dataUrl) {
    try {
        if (dataUrl.startsWith('data:image/')) {
            return dataUrl;
        }
        throw new Error('유효하지 않은 이미지 형식입니다');
    } catch (error) {
        console.error('이미지 처리 오류:', error);
        throw new Error('이미지 업로드 중 오류가 발생했습니다');
    }
}

// AI 에러 처리 함수
function handleAIError(error) {
    let errorMessage = 'AI 처리 중 오류가 발생했습니다';
    
    if (error.message.includes('백엔드')) {
        showBackendSetupGuide();
        return;
    } else if (error.message.includes('얼굴')) {
        errorMessage = '사진에서 얼굴을 인식할 수 없습니다. 정면 사진을 사용해주세요';
    } else if (error.message.includes('크레딧')) {
        errorMessage = 'AI 체험 크레딧이 부족합니다';
    } else if (error.message.includes('시간')) {
        errorMessage = '처리 시간이 초과되었습니다. 다시 시도해주세요';
    } else if (error.message.includes('네트워크')) {
        errorMessage = '네트워크 연결을 확인해주세요';
    }
    
    showToast(errorMessage, 'error');
}

// 크레딧 체크 함수
async function checkAkoolCredit() {
    try {
        if (!window.akoolService) {
            console.warn('AKOOL 서비스가 초기화되지 않았습니다');
            return true;
        }
        
        const result = await window.akoolService.getCreditInfo();
        if (result.success) {
            console.log('AKOOL 크레딧:', result.credit);
            return result.credit > 0;
        }
        
        return true;
        
    } catch (error) {
        console.warn('크레딧 확인 실패:', error);
        return true;
    }
}

// AI 버튼 상태 업데이트
function updateAIButtonState() {
    const aiButtons = document.querySelectorAll('.btn-ai-experience, .ai-experience-modal-btn');
    const isConnected = window.akoolService && window.akoolService.isConnected();
    
    aiButtons.forEach(button => {
        // 버튼은 항상 활성화 (클릭 시 연결 안내 표시)
        button.disabled = false;
        button.title = isConnected ? 'AI 체험하기 (연결됨)' : 'AI 체험하기';
        button.style.opacity = '1';
    });
}

// ========== 초기화 ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AI Integration 모듈 시작');
    
    // AKOOL 서비스 초기화
    setTimeout(async () => {
        await window.akoolService.init();
        updateAIButtonState();
        
        // 연결 상태 표시
        const isConnected = window.akoolService.isConnected();
        console.log('📡 백엔드 연결 상태:', isConnected ? '✅ 연결됨' : '❌ 미연결');
        
        if (!isConnected) {
            console.log('💡 백엔드 연결: setupAkoolBackend("https://your-backend.ngrok-free.app")');
        }
    }, 2000);
    
    // 주기적 상태 업데이트
    setInterval(updateAIButtonState, 5000);
});

// 전역 함수 노출
window.processAIFaceSwap = processAIFaceSwap;
window.handleAIError = handleAIError;
window.checkAkoolCredit = checkAkoolCredit;
window.prepareImageForProcessing = prepareImageForProcessing;
window.setupAkoolBackend = setupAkoolBackend;

console.log('✅ AI Integration (실제 API 연결) 로드 완료');
console.log('🔧 사용법: setupAkoolBackend("https://your-backend.ngrok-free.app")');
