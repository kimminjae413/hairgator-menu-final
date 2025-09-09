// ========== HAIRGATOR AI 체험하기 기능 - 최종 활성화 버전 ==========
// menu.js의 openAIPhotoModal 함수를 완전히 대체하는 코드입니다.

// 전역 변수 설정
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// AI 사진 업로드 모달 열기 (완전 활성화)
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    console.log('🤖 AI 체험하기 시작:', {
        styleId: styleId,
        styleName: styleName,
        styleImageUrl: styleImageUrl,
        status: 'ACTIVE'
    });
    
    // 전역 변수 설정
    currentAIStyleImage = styleImageUrl;
    currentAIStyleName = styleName;
    uploadedCustomerPhoto = null;
    
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('aiPhotoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // AI 사진 업로드 모달 생성
    const modal = document.createElement('div');
    modal.id = 'aiPhotoModal';
    modal.className = 'ai-photo-modal';
    modal.innerHTML = `
        <div class="ai-modal-content">
            <div class="ai-modal-header">
                <button class="ai-modal-close" onclick="closePhotoUploadModal()">×</button>
                <h2 class="ai-modal-title">
                    <span class="ai-icon">🤖</span>
                    AI 헤어 체험하기
                </h2>
                <div class="ai-modal-subtitle">
                    선택하신 스타일: <strong>${styleName}</strong><br>
                    정면 사진을 업로드하면 AI가 헤어스타일을 합성해드립니다
                </div>
            </div>
            
            <div class="ai-modal-body">
                <!-- 스타일 미리보기 -->
                <div class="style-preview" style="margin-bottom: 20px; text-align: center;">
                    <img src="${styleImageUrl}" alt="${styleName}" 
                         style="max-width: 200px; height: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                </div>
                
                <!-- 사진 업로드 영역 -->
                <div class="ai-upload-area" id="uploadArea">
                    <input type="file" id="photoInput" accept="image/*" style="display: none;">
                    <div class="upload-placeholder">
                        <span class="upload-icon">📸</span>
                        <div class="upload-text">사진 선택하기</div>
                        <div class="upload-hint">클릭하거나 사진을 드래그하세요</div>
                    </div>
                    <img id="previewImage" style="display: none; width: 100%; height: auto; border-radius: 10px;">
                </div>
                
                <!-- 액션 버튼들 -->
                <div class="ai-modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="ai-secondary-btn" onclick="closePhotoUploadModal()">취소</button>
                    <button id="aiProcessBtn" class="ai-process-btn" disabled onclick="processAIFaceSwap()">
                        <span class="ai-icon">✨</span>
                        <span>AI 합성 시작</span>
                    </button>
                </div>
                
                <!-- 사용 팁 -->
                <div class="ai-info" style="margin-top: 20px; padding: 15px; background: var(--ai-bg-secondary); border-radius: 10px; font-size: 14px; color: var(--text-secondary);">
                    <div style="margin-bottom: 8px;">💡 최상의 결과를 위한 팁:</div>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>정면을 바라본 사진을 사용해주세요</li>
                        <li>얼굴이 선명하게 나온 사진이 좋습니다</li>
                        <li>머리가 잘 보이는 사진을 권장합니다</li>
                    </ul>
                </div>
                
                <!-- 서버 상태 표시 -->
                <div id="serverStatus" style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px; text-align: center; font-size: 12px;">
                    <span id="statusIcon">🔄</span>
                    <span id="statusText">AI 서버 연결 확인 중...</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
    
    // 이벤트 리스너 설정
    setTimeout(() => {
        setupPhotoUploadEvents();
        checkAIServerStatus();
    }, 100);
}

// 사진 업로드 이벤트 설정
function setupPhotoUploadEvents() {
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoInput');
    const previewImage = document.getElementById('previewImage');
    const processBtn = document.getElementById('aiProcessBtn');
    
    if (!uploadArea || !photoInput) return;
    
    // 클릭 이벤트
    uploadArea.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        photoInput.click();
    });
    
    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handlePhotoUpload(files[0]);
        }
    });
    
    // 파일 선택
    photoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePhotoUpload(e.target.files[0]);
        }
    });
}

// 사진 업로드 처리
function handlePhotoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다', 'error');
        return;
    }
    
    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
        showToast('파일 크기는 10MB 이하여야 합니다', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        const processBtn = document.getElementById('aiProcessBtn');
        
        if (previewImage && uploadPlaceholder) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            
            // 전역 변수에 저장
            uploadedCustomerPhoto = e.target.result;
            
            // 처리 버튼 활성화
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.classList.add('ready');
            }
            
            showToast('사진이 업로드되었습니다', 'success');
        }
    };
    
    reader.readAsDataURL(file);
}

// AI 서버 상태 확인
async function checkAIServerStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        // AKOOL 서비스 확인
        if (window.akoolService) {
            const isConnected = await window.akoolService.checkConnection();
            
            if (isConnected) {
                statusIcon.textContent = '✅';
                statusText.textContent = 'AI 서버 연결됨';
                statusText.style.color = 'green';
            } else {
                // 연결 시도
                const initialized = await window.akoolService.init();
                if (initialized) {
                    statusIcon.textContent = '✅';
                    statusText.textContent = 'AI 서버 연결 성공';
                    statusText.style.color = 'green';
                } else {
                    statusIcon.textContent = '⚠️';
                    statusText.textContent = '데모 모드 (실제 합성 불가)';
                    statusText.style.color = 'orange';
                }
            }
        } else if (window.faceSwapBackend) {
            // 백엔드 직접 연결 확인
            const status = await window.faceSwapBackend.checkConnection();
            if (status) {
                statusIcon.textContent = '✅';
                statusText.textContent = 'Face Swap 백엔드 연결됨';
                statusText.style.color = 'green';
            } else {
                statusIcon.textContent = '⚠️';
                statusText.textContent = '백엔드 연결 대기중...';
                statusText.style.color = 'orange';
            }
        } else {
            statusIcon.textContent = '🎭';
            statusText.textContent = '데모 모드로 실행중';
            statusText.style.color = '#666';
        }
    } catch (error) {
        console.warn('서버 상태 확인 실패:', error);
        statusIcon.textContent = '🎭';
        statusText.textContent = '데모 모드로 실행중';
        statusText.style.color = '#666';
    }
}

// AI Face Swap 처리
async function processAIFaceSwap() {
    if (!uploadedCustomerPhoto || !currentAIStyleImage) {
        showToast('사진을 먼저 선택해주세요', 'error');
        return;
    }
    
    const processBtn = document.getElementById('aiProcessBtn');
    if (!processBtn) return;
    
    const originalText = processBtn.innerHTML;
    
    // 버튼 비활성화 및 로딩 상태
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="ai-icon">⏳</span><span>AI 처리 중...</span>';
    processBtn.classList.add('processing');
    
    try {
        // 진행 단계 표시
        showProcessingSteps();
        
        // AKOOL 서비스가 있으면 실제 처리
        if (window.akoolService && window.akoolService.isConnected()) {
            console.log('🚀 실제 AI 처리 시작');
            
            // 이미지 준비
            updateProcessingStep(1, '이미지 준비 중...');
            const customerImageUrl = await prepareImageForProcessing(uploadedCustomerPhoto);
            
            // Face Swap 실행
            updateProcessingStep(2, 'AI 얼굴 분석 중...');
            const result = await window.akoolService.faceSwap(customerImageUrl, currentAIStyleImage);
            
            if (result.success) {
                updateProcessingStep(3, '합성 완료!');
                showAIResult(result.imageUrl);
                closePhotoUploadModal();
                showToast('AI 합성이 완료되었습니다!', 'success');
            } else {
                throw new Error(result.error || 'AI 처리 실패');
            }
            
        } else {
            // 데모 모드 - 시뮬레이션
            console.log('🎭 데모 모드로 실행');
            
            await simulateProcessing();
            
            // 데모 결과 표시
            const demoResult = createDemoResult();
            showAIResult(demoResult);
            closePhotoUploadModal();
            showToast('데모 모드: AI 합성 시뮬레이션 완료', 'info');
        }
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        handleAIError(error);
        
    } finally {
        // 버튼 상태 복원
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = originalText;
            processBtn.classList.remove('processing');
        }
        
        // 처리 단계 숨기기
        hideProcessingSteps();
    }
}

// 처리 단계 표시
function showProcessingSteps() {
    const modal = document.getElementById('aiPhotoModal');
    if (!modal) return;
    
    const stepsDiv = document.createElement('div');
    stepsDiv.id = 'processingSteps';
    stepsDiv.className = 'processing-steps';
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

// 처리 단계 업데이트
function updateProcessingStep(step, text) {
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        const textElement = stepElement.querySelector('.step-text');
        if (textElement) {
            textElement.textContent = text;
        }
        stepElement.classList.add('active');
    }
}

// 처리 단계 숨기기
function hideProcessingSteps() {
    const stepsDiv = document.getElementById('processingSteps');
    if (stepsDiv) {
        stepsDiv.remove();
    }
}

// 데모 모드 시뮬레이션
async function simulateProcessing() {
    const steps = [
        { step: 1, text: '이미지 업로드 중...', delay: 1000 },
        { step: 2, text: '얼굴 인식 중...', delay: 1500 },
        { step: 2, text: 'AI 분석 중...', delay: 1500 },
        { step: 3, text: '헤어스타일 합성 중...', delay: 2000 },
        { step: 3, text: '최종 처리 중...', delay: 1000 }
    ];
    
    for (const { step, text, delay } of steps) {
        updateProcessingStep(step, text);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// 데모 결과 생성
function createDemoResult() {
    // Canvas를 사용한 간단한 데모 이미지 생성
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    
    // 그라데이션 배경
    const gradient = ctx.createLinearGradient(0, 0, 400, 500);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 500);
    
    // 텍스트 추가
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AI 합성 결과', 200, 250);
    ctx.font = '16px Arial';
    ctx.fillText('(데모 모드)', 200, 280);
    
    return canvas.toDataURL();
}

// AI 결과 표시
function showAIResult(resultImageUrl) {
    // 기존 결과 모달 제거
    const existingModal = document.querySelector('.ai-result-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const resultModal = document.createElement('div');
    resultModal.className = 'ai-result-modal';
    resultModal.innerHTML = `
        <div class="ai-modal-content">
            <div class="ai-modal-header">
                <button class="ai-modal-close" onclick="closeAIResultModal()">×</button>
                <h2 class="ai-modal-title">
                    <span class="ai-icon">✨</span>
                    AI 합성 결과
                </h2>
                <div class="ai-modal-subtitle">
                    ${currentAIStyleName} 스타일이 적용되었습니다
                </div>
            </div>
            <div class="ai-modal-body">
                <div class="result-image-container" style="text-align: center; margin: 20px 0;">
                    <img src="${resultImageUrl}" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                </div>
                <div class="ai-modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="ai-process-btn" onclick="downloadAIResult('${resultImageUrl}')">
                        <span>💾</span> 이미지 저장
                    </button>
                    <button class="ai-secondary-btn" onclick="shareAIResult('${resultImageUrl}')">
                        <span>📤</span> 공유하기
                    </button>
                    <button class="ai-secondary-btn" onclick="closeAIResultModal()">
                        닫기
                    </button>
                </div>
                <div class="result-info" style="margin-top: 20px; padding: 15px; background: var(--ai-bg-secondary); border-radius: 10px; font-size: 14px;">
                    <p style="margin: 0;">✨ AI가 성공적으로 헤어스타일을 합성했습니다!</p>
                    <p style="margin: 5px 0 0 0; color: var(--text-secondary);">이미지를 저장하거나 공유할 수 있습니다.</p>
                </div>
            </div>
        </div>
    `;
    
    // 스타일 추가
    resultModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(resultModal);
    document.body.style.overflow = 'hidden';
    
    // 애니메이션
    setTimeout(() => {
        resultModal.style.opacity = '1';
    }, 10);
}

// 모달 닫기
function closePhotoUploadModal() {
    const modal = document.getElementById('aiPhotoModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
        
        // 전역 변수 초기화
        uploadedCustomerPhoto = null;
    }
}

// 결과 모달 닫기
function closeAIResultModal() {
    const modal = document.querySelector('.ai-result-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// AI 결과 다운로드
function downloadAIResult(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hairgator_ai_${currentAIStyleName}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('이미지가 저장되었습니다', 'success');
}

// AI 결과 공유
async function shareAIResult(imageUrl) {
    if (navigator.share) {
        try {
            // DataURL을 Blob으로 변환
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
            console.log('공유 취소 또는 실패:', error);
        }
    } else {
        // Web Share API를 지원하지 않는 경우
        showToast('이 브라우저에서는 공유 기능을 지원하지 않습니다', 'info');
    }
}

// 이미지 처리 함수
async function prepareImageForProcessing(dataUrl) {
    try {
        // 실제 구현에서는 Firebase Storage나 다른 클라우드 스토리지 사용
        if (dataUrl.startsWith('data:image/')) {
            return dataUrl;
        }
        throw new Error('유효하지 않은 이미지 형식입니다');
    } catch (error) {
        console.error('이미지 처리 오류:', error);
        throw new Error('이미지 업로드 중 오류가 발생했습니다');
    }
}

// AI 에러 처리
function handleAIError(error) {
    let errorMessage = 'AI 처리 중 오류가 발생했습니다';
    
    if (error.message.includes('연결')) {
        errorMessage = 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('얼굴')) {
        errorMessage = '사진에서 얼굴을 인식할 수 없습니다. 정면 사진을 사용해주세요';
    } else if (error.message.includes('크레딧')) {
        errorMessage = 'AI 체험 크레딧이 부족합니다';
    } else if (error.message.includes('시간')) {
        errorMessage = '처리 시간이 초과되었습니다. 다시 시도해주세요';
    } else if (error.message.includes('형식')) {
        errorMessage = '지원하지 않는 이미지 형식입니다';
    }
    
    showToast(errorMessage, 'error');
}

// ========== 전역 함수 등록 ==========
window.openAIPhotoModal = openAIPhotoModal;
window.closePhotoUploadModal = closePhotoUploadModal;
window.processAIFaceSwap = processAIFaceSwap;
window.closeAIResultModal = closeAIResultModal;
window.downloadAIResult = downloadAIResult;
window.shareAIResult = shareAIResult;

// menu.js의 기존 openAIPhotoModal 함수 오버라이드
if (window.HAIRGATOR_MENU) {
    window.HAIRGATOR_MENU.openAIPhotoModal = openAIPhotoModal;
}

console.log('✅ HAIRGATOR AI 체험 기능 최종 버전 로드 완료');
console.log('🤖 AI 기능 상태: 완전 활성화');
console.log('💡 사용법: 스타일 모달에서 "AI 체험하기" 버튼 클릭');
