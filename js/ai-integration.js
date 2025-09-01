// ========== AI 체험 기능 (백엔드 연동) ==========

// 전역 변수
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// ========== AI Face Swap 처리 함수 수정 ==========

// AI Face Swap 처리 (백엔드 연동)
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
        if (!window.akoolService.isConnected()) {
            showToast('Face Swap 서버에 연결 중...', 'info');
            
            // 초기화 시도
            const initialized = await window.akoolService.init();
            if (!initialized) {
                throw new Error('Face Swap 서버에 연결할 수 없습니다. 관리자에게 문의하세요.');
            }
        }
        
        console.log('AI 처리 시작:', {
            styleName: currentAIStyleName,
            hasCustomerPhoto: !!uploadedCustomerPhoto,
            hasStyleImage: !!currentAIStyleImage
        });
        
        // 1. 고객 사진을 사용 가능한 URL로 변환
        showToast('이미지 준비 중...', 'info');
        const customerImageUrl = await prepareImageForProcessing(uploadedCustomerPhoto);
        
        // 2. AKOOL Face Swap 실행 (백엔드를 통해)
        showToast('AI 합성 시작...', 'info');
        const result = await window.akoolService.faceSwap(customerImageUrl, currentAIStyleImage);
        
        if (result.success) {
            // 성공 시 결과 표시
            showAIResult(result.imageUrl);
            closePhotoUploadModal();
            showToast('AI 합성이 완료되었습니다!', 'success');
        } else {
            throw new Error(result.error || 'AI 처리 실패');
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
    }
}

// 이미지 처리 함수 수정
async function prepareImageForProcessing(dataUrl) {
    try {
        // 실제 구현에서는 Firebase Storage나 다른 클라우드 스토리지 사용
        // 현재는 데모용으로 데이터 URL을 그대로 반환
        
        // Base64 데이터 URL을 Blob으로 변환 후 다시 처리할 수도 있음
        if (dataUrl.startsWith('data:image/')) {
            // 실제 서비스에서는 여기서 클라우드에 업로드
            return dataUrl;
        }
        
        throw new Error('유효하지 않은 이미지 형식입니다');
        
    } catch (error) {
        console.error('이미지 처리 오류:', error);
        throw new Error('이미지 업로드 중 오류가 발생했습니다');
    }
}

// AI 에러 처리 함수 개선
function handleAIError(error) {
    let errorMessage = 'AI 처리 중 오류가 발생했습니다';
    
    if (error.message.includes('연결할 수 없습니다')) {
        errorMessage = 'Face Swap 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('얼굴을 찾을 수 없습니다') || error.message.includes('얼굴을 인식할 수 없습니다')) {
        errorMessage = '사진에서 얼굴을 인식할 수 없습니다. 정면을 향한 선명한 사진을 사용해주세요';
    } else if (error.message.includes('크레딧')) {
        errorMessage = 'AI 체험 크레딧이 부족합니다. 관리자에게 문의해주세요';
    } else if (error.message.includes('시간이 초과')) {
        errorMessage = '처리 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('네트워크') || error.message.includes('Failed to fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요';
    } else if (error.message.includes('이미지 형식') || error.message.includes('이미지 업로드')) {
        errorMessage = '이미지 형식이 올바르지 않습니다. JPG 또는 PNG 파일을 사용해주세요';
    }
    
    showToast(errorMessage, 'error');
}

// 크레딧 체크 함수 수정
async function checkAkoolCredit() {
    try {
        if (!window.akoolService) {
            console.warn('AKOOL 서비스가 초기화되지 않았습니다');
            return true; // 서비스 없어도 진행
        }
        
        const result = await window.akoolService.getCreditInfo();
        if (result.success) {
            console.log('AKOOL 크레딧:', result.credit);
            return result.credit > 0;
        }
        
        // 크레딧 확인 실패 시에도 진행 (개발 중이므로)
        return true;
        
    } catch (error) {
        console.warn('크레딧 확인 실패:', error);
        return true;
    }
}

// ========== 백엔드 연결 상태 모니터링 ==========

// AI 버튼 상태 업데이트
function updateAIButtonState() {
    const aiButtons = document.querySelectorAll('.btn-ai-experience');
    const isConnected = window.akoolService && window.akoolService.isConnected();
    
    aiButtons.forEach(button => {
        if (isConnected) {
            button.disabled = false;
            button.title = 'AI 체험하기';
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.title = 'AI 서버 연결 중...';
            button.style.opacity = '0.6';
        }
    });
}

// 주기적으로 AI 버튼 상태 업데이트
setInterval(() => {
    updateAIButtonState();
}, 3000);

// ========== 초기화 및 이벤트 리스너 ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Integration 모듈 로드 완료');
    
    // 초기 AI 버튼 상태 업데이트
    setTimeout(() => {
        updateAIButtonState();
    }, 2000);
    
    // 백엔드 연결 상태 모니터링
    if (window.faceSwapBackend) {
        // 백엔드 연결 상태가 변경될 때마다 AI 버튼 상태 업데이트
        const originalUpdateStatus = window.faceSwapBackend.updateConnectionStatus;
        window.faceSwapBackend.updateConnectionStatus = function(connected, errorMsg) {
            originalUpdateStatus.call(this, connected, errorMsg);
            setTimeout(updateAIButtonState, 100);
        };
    }
});

// 전역 함수 노출
window.processAIFaceSwap = processAIFaceSwap;
window.handleAIError = handleAIError;
window.checkAkoolCredit = checkAkoolCredit;
window.prepareImageForProcessing = prepareImageForProcessing;

console.log('AI Integration (백엔드 연동) 로드 완료');
