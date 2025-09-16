// ========== 헤어체험 기능 (기존 AI 체험 업그레이드) ==========

// 전역 변수 (기존 유지)
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// ========== 헤어체험 처리 함수 (기존 processAIFaceSwap 업그레이드) ==========
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
    processBtn.innerHTML = '<span class="ai-icon">✨</span><span>헤어체험 중...</span>';
    processBtn.classList.add('ai-processing');
    
    try {
        // 헤어체험 서비스 연결 확인
        if (!window.akoolService || !window.akoolService.isConnected()) {
            showToast('헤어체험 서비스 연결 중...', 'info');
            
            // 초기화 시도
            const initialized = await window.akoolService.init();
            if (!initialized) {
                throw new Error('헤어체험 서비스에 연결할 수 없습니다. 관리자에게 문의하세요.');
            }
        }
        
        console.log('헤어체험 처리 시작:', {
            styleName: currentAIStyleName,
            hasCustomerPhoto: !!uploadedCustomerPhoto,
            hasStyleImage: !!currentAIStyleImage
        });
        
        // 1. 고객 사진을 사용 가능한 URL로 변환
        showToast('이미지 분석 중...', 'info');
        const customerImageUrl = await prepareImageForProcessing(uploadedCustomerPhoto);
        
        // 2. 헤어체험 실행 (기존 faceSwap 함수 활용)
        showToast('AI 헤어체험 진행 중...', 'info');
        const result = await window.akoolService.faceSwap(customerImageUrl, currentAIStyleImage);
        
        if (result.success) {
            // 성공 시 결과 표시
            showAIResult(result.imageUrl);
            closePhotoUploadModal();
            showToast('✨ 헤어체험이 완료되었습니다!', 'success');
        } else {
            throw new Error(result.error || '헤어체험 처리 실패');
        }
        
    } catch (error) {
        console.error('헤어체험 오류:', error);
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

// 이미지 처리 함수 (기존 유지, 개선만)
async function prepareImageForProcessing(dataUrl) {
    try {
        // Data URL, File, Blob 등 다양한 형식 지원
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
            return dataUrl; // 이미 Data URL인 경우
        }
        
        if (dataUrl instanceof File || dataUrl instanceof Blob) {
            return dataUrl; // File/Blob 객체인 경우
        }
        
        // Firebase Storage URL 등 HTTP URL인 경우
        if (typeof dataUrl === 'string' && dataUrl.startsWith('http')) {
            return dataUrl;
        }
        
        throw new Error('지원하지 않는 이미지 형식입니다');
        
    } catch (error) {
        console.error('이미지 처리 오류:', error);
        throw new Error('이미지 업로드 중 오류가 발생했습니다');
    }
}

// AI 에러 처리 함수 (기존 개선)
function handleAIError(error) {
    let errorMessage = '헤어체험 중 오류가 발생했습니다';
    
    if (error.message.includes('연결할 수 없습니다')) {
        errorMessage = '헤어체험 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('얼굴을 찾을 수 없습니다') || error.message.includes('얼굴을 인식할 수 없습니다')) {
        errorMessage = '사진에서 얼굴을 인식할 수 없습니다. 정면을 향한 선명한 사진을 사용해주세요';
    } else if (error.message.includes('크레딧') || error.message.includes('할당량') || error.message.includes('quota')) {
        errorMessage = '일일 헤어체험 한도를 초과했습니다. 내일 다시 시도해주세요';
    } else if (error.message.includes('시간이 초과') || error.message.includes('timeout')) {
        errorMessage = '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('네트워크') || error.message.includes('Failed to fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요';
    } else if (error.message.includes('이미지 형식') || error.message.includes('이미지 업로드')) {
        errorMessage = '이미지 형식이 올바르지 않습니다. JPG 또는 PNG 파일을 사용해주세요';
    } else if (error.message.includes('403')) {
        errorMessage = 'API 접근 권한이 없습니다. 관리자에게 문의해주세요';
    } else if (error.message.includes('429')) {
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
    }
    
    showToast(errorMessage, 'error');
}

// 크레딧 체크 함수 (기존 유지)
async function checkAkoolCredit() {
    try {
        if (!window.akoolService) {
            console.warn('헤어체험 서비스가 초기화되지 않았습니다');
            return true; // 서비스 없어도 진행
        }
        
        const result = await window.akoolService.getCreditInfo();
        if (result.success) {
            console.log('헤어체험 크레딧:', result.credit);
            return result.credit > 0;
        }
        
        // 크레딧 확인 실패 시에도 진행
        return true;
        
    } catch (error) {
        console.warn('크레딧 확인 실패:', error);
        return true;
    }
}

// ========== 헤어체험 버튼 상태 모니터링 (기존 AI 버튼 상태 업데이트) ==========
function updateAIButtonState() {
    // 기존 AI 버튼과 새 헤어체험 버튼 모두 지원
    const buttons = document.querySelectorAll('.btn-ai-experience, .btn-hair-experience, .hair-experience-btn');
    const isConnected = window.akoolService && window.akoolService.isConnected();
    
    buttons.forEach(button => {
        if (isConnected) {
            button.disabled = false;
            button.title = '헤어체험하기';
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.title = '헤어체험 서비스 연결 중...';
            button.style.opacity = '0.6';
        }
    });
}

// 주기적으로 버튼 상태 업데이트 (기존 유지)
setInterval(() => {
    updateAIButtonState();
}, 3000);

// ========== 헤어체험 결과 표시 (새 기능 추가) ==========
function showAIResult(imageUrl) {
    try {
        // 기존 결과 모달이 있다면 제거
        const existingModal = document.querySelector('.hair-result-modal, .ai-result-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 헤어체험 결과 모달 생성
        const modal = document.createElement('div');
        modal.className = 'hair-result-modal';
        modal.innerHTML = `
            <div class="hair-result-content">
                <div class="hair-result-header">
                    <h3>✨ 헤어체험 결과</h3>
                    <button class="close-result-btn" onclick="closeAIResult()">×</button>
                </div>
                <div class="hair-result-image-container">
                    <img src="${imageUrl}" alt="헤어체험 결과" class="hair-result-image">
                </div>
                <div class="hair-result-actions">
                    <button class="result-action-btn download-btn" onclick="downloadHairResult('${imageUrl}')">
                        📥 다운로드
                    </button>
                    <button class="result-action-btn share-btn" onclick="shareHairResult()">
                        📤 공유하기
                    </button>
                    <button class="result-action-btn retry-btn" onclick="retryHairExperience()">
                        🔄 다시 체험하기
                    </button>
                </div>
            </div>
            <div class="hair-result-overlay" onclick="closeAIResult()"></div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // 모달 표시 애니메이션
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        console.log('헤어체험 결과 모달 표시 완료');
        
    } catch (error) {
        console.error('결과 표시 오류:', error);
        // 폴백: 새 탭에서 이미지 열기
        window.open(imageUrl, '_blank');
    }
}

// ========== 결과 모달 관련 함수들 ==========
function closeAIResult() {
    const modal = document.querySelector('.hair-result-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

function downloadHairResult(imageUrl) {
    try {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `HAIRGATOR_헤어체험_${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('이미지가 다운로드되었습니다', 'success');
    } catch (error) {
        console.error('다운로드 오류:', error);
        showToast('다운로드 중 오류가 발생했습니다', 'error');
    }
}

async function shareHairResult() {
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'HAIRGATOR 헤어체험 결과',
                text: 'HAIRGATOR에서 헤어체험한 결과를 확인해보세요!',
                url: window.location.origin
            });
        } else {
            await navigator.clipboard.writeText(window.location.origin);
            showToast('링크가 클립보드에 복사되었습니다', 'success');
        }
    } catch (error) {
        console.error('공유 오류:', error);
        showToast('공유 중 오류가 발생했습니다', 'error');
    }
}

function retryHairExperience() {
    closeAIResult();
    // 기존 업로드 모달 다시 열기
    if (typeof openAIPhotoModal === 'function') {
        openAIPhotoModal(
            currentAIStyleImage, 
            currentAIStyleName || '헤어스타일', 
            currentAIStyleImage
        );
    }
}

// ========== 초기화 및 이벤트 리스너 (기존 유지) ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('헤어체험 Integration 모듈 로드 완료');
    
    // 초기 버튼 상태 업데이트
    setTimeout(() => {
        updateAIButtonState();
    }, 2000);
    
    // 백엔드 연결 상태 모니터링 (기존 유지)
    if (window.faceSwapBackend) {
        const originalUpdateStatus = window.faceSwapBackend.updateConnectionStatus;
        window.faceSwapBackend.updateConnectionStatus = function(connected, errorMsg) {
            originalUpdateStatus.call(this, connected, errorMsg);
            setTimeout(updateAIButtonState, 100);
        };
    }
    
    // 헤어체험 결과 모달 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        /* 헤어체험 결과 모달 스타일 */
        .hair-result-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .hair-result-modal.active {
            opacity: 1;
            visibility: visible;
        }
        
        .hair-result-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
        }
        
        .hair-result-content {
            position: relative;
            background: var(--primary-dark);
            border-radius: 15px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
        }
        
        .hair-result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .hair-result-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 18px;
        }
        
        .close-result-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hair-result-image-container {
            padding: 20px;
            text-align: center;
        }
        
        .hair-result-image {
            max-width: 100%;
            max-height: 60vh;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .hair-result-actions {
            display: flex;
            gap: 10px;
            padding: 15px 20px;
            border-top: 1px solid var(--border-color);
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .result-action-btn {
            background: linear-gradient(135deg, var(--female-color), #c2185b);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s ease;
        }
        
        .result-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
        }
        
        /* 모바일 반응형 */
        @media (max-width: 767px) {
            .hair-result-content {
                max-width: 95vw;
                margin: 10px;
            }
            
            .hair-result-actions {
                flex-direction: column;
            }
            
            .result-action-btn {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
});

// ========== 전역 함수 노출 (기존 유지, 추가) ==========
window.processAIFaceSwap = processAIFaceSwap;
window.handleAIError = handleAIError;
window.checkAkoolCredit = checkAkoolCredit;
window.prepareImageForProcessing = prepareImageForProcessing;
window.showAIResult = showAIResult;
window.closeAIResult = closeAIResult;
window.downloadHairResult = downloadHairResult;
window.shareHairResult = shareHairResult;
window.retryHairExperience = retryHairExperience;

console.log('✨ HAIRGATOR 헤어체험 Integration 로드 완료');
