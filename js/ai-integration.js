// ========== 헤어체험 기능 (Gemini AI 최종 버전) ==========

// 전역 변수
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// ========== 헤어체험 처리 함수 (Gemini 버전) ==========
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
        // Gemini 헤어체험 서비스 연결 확인
        if (!window.hairExperienceService || !window.hairExperienceService.isConnected()) {
            showToast('헤어체험 서비스 연결 중...', 'info');
            
            // 초기화 시도
            const initialized = await window.hairExperienceService.init();
            if (!initialized) {
                throw new Error('헤어체험 서비스에 연결할 수 없습니다. 관리자에게 문의하세요.');
            }
        }
        
        console.log('Gemini 헤어체험 처리 시작:', {
            styleName: currentAIStyleName,
            hasCustomerPhoto: !!uploadedCustomerPhoto,
            hasStyleImage: !!currentAIStyleImage
        });
        
        // 1. 이미지 분석 단계
        showToast('이미지 분석 중...', 'info');
        
        // 2. Gemini AI 헤어체험 실행
        showToast('AI 헤어체험 진행 중...', 'info');
        const result = await window.hairExperienceService.processHairExperience(
            uploadedCustomerPhoto,
            currentAIStyleImage,
            currentAIStyleName || '선택한 헤어스타일'
        );
        
        if (result.success) {
            // 성공 시 결과 표시
            showAIResult(result.imageUrl);
            closePhotoUploadModal();
            showToast('헤어체험이 완료되었습니다!', 'success');
        } else {
            throw new Error(result.error || '헤어체험 처리 실패');
        }
        
    } catch (error) {
        console.error('Gemini 헤어체험 오류:', error);
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

// ========== AI 에러 처리 함수 (Gemini 최적화) ==========
function handleAIError(error) {
    let errorMessage = '헤어체험 중 오류가 발생했습니다';
    
    if (error.message.includes('연결할 수 없습니다')) {
        errorMessage = '헤어체험 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('API 키') || error.message.includes('인증')) {
        errorMessage = '서비스 인증 오류입니다. 관리자에게 문의해주세요';
    } else if (error.message.includes('시간이 초과') || error.message.includes('timeout')) {
        errorMessage = '처리 시간이 초과되었습니다. 다시 시도해주세요';
    } else if (error.message.includes('할당량') || error.message.includes('quota')) {
        errorMessage = '일일 사용량을 초과했습니다. 내일 다시 시도해주세요';
    } else if (error.message.includes('네트워크') || error.message.includes('Failed to fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요';
    } else if (error.message.includes('이미지')) {
        errorMessage = '이미지 형식이 올바르지 않습니다. JPG 또는 PNG 파일을 사용해주세요';
    } else if (error.message.includes('403')) {
        errorMessage = 'API 접근 권한이 없습니다. 관리자에게 문의해주세요';
    } else if (error.message.includes('429')) {
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
    }
    
    showToast(errorMessage, 'error');
}

// ========== 헤어체험 버튼 상태 모니터링 (Gemini 버전) ==========
function updateAIButtonState() {
    const buttons = document.querySelectorAll('.btn-ai-experience, .btn-hair-experience, .hair-experience-btn, .ai-experience-modal-btn');
    const isConnected = window.hairExperienceService && window.hairExperienceService.isConnected();
    
    buttons.forEach(button => {
        if (isConnected) {
            button.disabled = false;
            button.title = '헤어체험하기';
            button.style.opacity = '1';
        } else {
            button.disabled = false; // 사용자가 클릭할 수 있도록 허용 (연결은 클릭 시 시도)
            button.title = '헤어체험하기 (연결 중)';
            button.style.opacity = '1';
        }
    });
}

// 주기적으로 버튼 상태 업데이트
setInterval(() => {
    updateAIButtonState();
}, 5000);

// ========== 헤어체험 결과 표시 ==========
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

// ========== 크레딧/할당량 체크 함수 (Gemini 버전) ==========
async function checkGeminiQuota() {
    try {
        if (!window.hairExperienceService) {
            console.warn('헤어체험 서비스가 초기화되지 않았습니다');
            return true; // 서비스 없어도 진행
        }
        
        // Gemini API는 별도의 크레딧 시스템이 없으므로 항상 true 반환
        // 실제 할당량은 API 호출 시 확인됨
        return true;
        
    } catch (error) {
        console.warn('할당량 확인 실패:', error);
        return true;
    }
}

// ========== 초기화 및 이벤트 리스너 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('HAIRGATOR 헤어체험 Integration (Gemini) 로드 완료');
    
    // 초기 버튼 상태 업데이트
    setTimeout(() => {
        updateAIButtonState();
    }, 2000);
    
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
            z-index: -1;
        }
        
        .hair-result-content {
            position: relative;
            background: var(--primary-dark, #111111);
            border-radius: 15px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color, #333333);
        }
        
        body.light-theme .hair-result-content {
            background: var(--primary-light, #ffffff);
            color: var(--text-primary, #000000);
        }
        
        .hair-result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color, #333333);
        }
        
        .hair-result-header h3 {
            margin: 0;
            color: var(--text-primary, #ffffff);
            font-size: 18px;
        }
        
        .close-result-btn {
            background: none;
            border: none;
            color: var(--text-secondary, #999999);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .close-result-btn:hover {
            background: var(--ai-bg-primary, rgba(233, 30, 99, 0.1));
            color: var(--female-color, #E91E63);
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
            border-top: 1px solid var(--border-color, #333333);
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .result-action-btn {
            background: linear-gradient(135deg, var(--female-color, #E91E63), #c2185b);
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

// ========== 전역 함수 노출 ==========
window.processAIFaceSwap = processAIFaceSwap;
window.handleAIError = handleAIError;
window.updateAIButtonState = updateAIButtonState;
window.showAIResult = showAIResult;
window.closeAIResult = closeAIResult;
window.downloadHairResult = downloadHairResult;
window.shareHairResult = shareHairResult;
window.retryHairExperience = retryHairExperience;
window.checkGeminiQuota = checkGeminiQuota;

console.log('✨ HAIRGATOR 헤어체험 Integration (Gemini AI) 준비 완료');
