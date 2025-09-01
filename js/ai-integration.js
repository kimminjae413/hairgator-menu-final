// ========== 완성된 모달 AI 버튼 통합 코드 ==========

// 전역 변수
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;
let aiModalElements = {};

// ========== AI 체험 기능 통합 ==========

// 기존 showStyleDetailOptimized 함수를 AI 기능과 함께 교체
function showStyleDetailWithAI(code, name, gender, imageSrc, docId) {
    const elements = initModalElements();
    if (!elements.modal) return;
    
    // 즉시 모달 표시
    elements.modal.classList.add('active');
    
    // 기본 정보 설정
    elements.modalCode.textContent = code || 'NO CODE';
    elements.modalName.textContent = name || '이름 없음';
    
    // 성별에 따른 버튼 스타일
    if (gender === 'female') {
        elements.btnRegister.classList.add('female');
    } else {
        elements.btnRegister.classList.remove('female');
    }
    
    // 좋아요 버튼 초기화
    elements.btnLike.classList.remove('active');
    const heart = elements.btnLike.querySelector('span:first-child');
    if (heart) heart.textContent = '♡';
    
    // 이미지 로딩
    if (imageSrc) {
        loadModalImage(imageSrc, elements.modalImage);
    } else {
        setNoImageState(elements.modalImage);
    }
    
    // AI 버튼 추가 또는 업데이트
    addAIButtonToModal(elements, imageSrc, name);
    
    // 기존 이벤트 설정
    setupModalEvents(elements, code, name, gender, docId);
    
    // 바디 스크롤 방지
    document.body.style.overflow = 'hidden';
}

// AI 버튼을 모달에 추가하는 함수
function addAIButtonToModal(elements, imageSrc, styleName) {
    // 기존 AI 버튼 제거
    const existingAIBtn = elements.modal.querySelector('.btn-ai-experience');
    if (existingAIBtn) {
        existingAIBtn.remove();
    }
    
    // modal-actions div 찾기
    let modalActions = elements.modal.querySelector('.modal-actions');
    if (!modalActions) {
        // modal-actions div가 없으면 생성
        modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        elements.modal.querySelector('.modal-info').appendChild(modalActions);
        
        // 기존 버튼들을 modal-actions로 이동
        if (elements.btnRegister) modalActions.appendChild(elements.btnRegister);
        if (elements.btnLike) modalActions.appendChild(elements.btnLike);
    }
    
    // AI 체험 버튼 생성
    const aiButton = document.createElement('button');
    aiButton.className = 'modal-btn btn-ai-experience';
    aiButton.id = 'btnAIExperience';
    aiButton.innerHTML = `
        <span class="ai-icon">🤖</span>
        <span>AI 체험하기</span>
    `;
    
    // AI 버튼을 맨 위에 추가
    modalActions.insertBefore(aiButton, modalActions.firstChild);
    
    // AI 버튼 이벤트 리스너
    aiButton.addEventListener('click', function() {
        if (imageSrc) {
            openAIExperience(imageSrc, styleName);
        } else {
            showToast('❌ 이미지가 없는 스타일은 AI 체험이 불가능합니다', 'error');
        }
    });
}

// ========== AI 체험 모달들 생성 ==========

// AI 관련 모달들을 DOM에 추가
function createAIModals() {
    // 이미 존재하면 리턴
    if (document.getElementById('photoUploadModal')) return;
    
    // 사진 업로드 모달
    const photoUploadModal = `
        <div id="photoUploadModal" class="style-modal ai-modal">
            <div class="modal-content ai-modal-content">
                <button class="modal-close" onclick="closePhotoUploadModal()">×</button>
                
                <div class="ai-modal-body">
                    <h3 class="ai-modal-title">
                        🤖 AI 헤어스타일 체험
                    </h3>
                    
                    <p class="ai-modal-desc">
                        고객님의 사진을 업로드하면<br>
                        AI가 선택한 헤어스타일을 합성해드립니다
                    </p>
                    
                    <div class="photo-upload-area" id="photoUploadArea">
                        <input type="file" id="customerPhotoInput" accept="image/*" style="display: none;">
                        
                        <div class="upload-placeholder" onclick="document.getElementById('customerPhotoInput').click()">
                            <div class="upload-icon">📷</div>
                            <div class="upload-text">사진 선택하기</div>
                            <div class="upload-hint">JPG, PNG 파일만 가능 (최대 5MB)</div>
                        </div>
                        
                        <div class="photo-preview" id="photoPreview" style="display: none;">
                            <img id="previewImage" class="preview-img">
                            <div class="preview-actions">
                                <button class="modal-btn btn-ai-process" onclick="processAIFaceSwap()" id="processBtn">
                                    🎨 AI 합성 시작
                                </button>
                                <button class="modal-btn btn-secondary" onclick="resetPhotoUpload()">
                                    다시 선택
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ai-info-notice">
                        💡 <strong>안내:</strong> 업로드된 사진은 AI 처리 후 자동으로 삭제되며, 다른 용도로 사용되지 않습니다.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // AI 결과 모달
    const aiResultModal = `
        <div id="aiResultModal" class="style-modal ai-modal">
            <div class="modal-content ai-modal-content">
                <button class="modal-close" onclick="closeAIResultModal()">×</button>
                
                <div class="ai-modal-body">
                    <h3 class="ai-modal-title">
                        ✨ AI 헤어스타일 체험 결과
                    </h3>
                    
                    <div id="aiResultContainer" class="ai-result-container">
                        <!-- AI 결과 이미지가 여기에 표시됩니다 -->
                    </div>
                    
                    <div class="ai-result-actions">
                        <button class="modal-btn btn-ai-download" onclick="downloadAIResult()" id="downloadBtn">
                            💾 결과 저장
                        </button>
                        <button class="modal-btn btn-ai-share" onclick="shareAIResult()">
                            📱 공유하기
                        </button>
                    </div>
                    
                    <div class="ai-result-secondary">
                        <button class="modal-btn btn-secondary" onclick="tryAnotherPhoto()">
                            🔄 다른 사진으로 체험
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // DOM에 추가
    document.body.insertAdjacentHTML('beforeend', photoUploadModal);
    document.body.insertAdjacentHTML('beforeend', aiResultModal);
    
    // 파일 업로드 이벤트 리스너 추가
    const fileInput = document.getElementById('customerPhotoInput');
    if (fileInput) {
        fileInput.addEventListener('change', handlePhotoUpload);
    }
}

// ========== AI 체험 기능 함수들 ==========

// AI 체험 시작
function openAIExperience(styleImageUrl, styleName) {
    currentAIStyleImage = styleImageUrl;
    currentAIStyleName = styleName;
    
    // AI 모달들 생성 (한 번만)
    createAIModals();
    
    // 사진 업로드 모달 열기
    openPhotoUploadModal();
}

// 사진 업로드 모달 열기
function openPhotoUploadModal() {
    const modal = document.getElementById('photoUploadModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // 기존 업로드 상태 리셋
        resetPhotoUpload();
    }
}

// 사진 업로드 모달 닫기
function closePhotoUploadModal() {
    const modal = document.getElementById('photoUploadModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetPhotoUpload();
    }
}

// 사진 업로드 처리
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 검증
    if (file.size > 5 * 1024 * 1024) {
        showToast('❌ 파일 크기는 5MB 이하여야 합니다', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast('❌ 이미지 파일만 업로드 가능합니다', 'error');
        event.target.value = '';
        return;
    }
    
    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedCustomerPhoto = e.target.result;
        
        // UI 업데이트
        const previewImg = document.getElementById('previewImage');
        const placeholder = document.querySelector('.upload-placeholder');
        const preview = document.getElementById('photoPreview');
        
        if (previewImg && placeholder && preview) {
            previewImg.src = uploadedCustomerPhoto;
            placeholder.style.display = 'none';
            preview.style.display = 'block';
        }
        
        showToast('✅ 사진이 업로드되었습니다', 'success');
    };
    
    reader.onerror = function() {
        showToast('❌ 파일 읽기 실패', 'error');
        event.target.value = '';
    };
    
    reader.readAsDataURL(file);
}

// 사진 업로드 리셋
function resetPhotoUpload() {
    uploadedCustomerPhoto = null;
    
    const fileInput = document.getElementById('customerPhotoInput');
    const placeholder = document.querySelector('.upload-placeholder');
    const preview = document.getElementById('photoPreview');
    
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.style.display = 'block';
    if (preview) preview.style.display = 'none';
}

// AI Face Swap 처리
async function processAIFaceSwap() {
    if (!uploadedCustomerPhoto || !currentAIStyleImage) {
        showToast('❌ 사진을 먼저 선택해주세요', 'error');
        return;
    }
    
    const processBtn = document.getElementById('processBtn');
    const originalText = processBtn.textContent;
    
    // 버튼 비활성화
    processBtn.disabled = true;
    processBtn.textContent = '🎨 AI 처리 중...';
    processBtn.classList.add('ai-processing');
    
    try {
        // 크레딧 체크
        const hasCredit = await checkAkoolCredit();
        if (!hasCredit) {
            showToast('❌ AI 체험 크레딧이 부족합니다', 'error');
            return;
        }
        
        // 고객 사진을 클라우드에 업로드
        showToast('📤 이미지 업로드 중...', 'info');
        const customerImageUrl = await uploadImageToStorage(uploadedCustomerPhoto);
        
        // AKOOL Face Swap 실행
        showToast('🤖 AI 합성 시작...', 'info');
        const result = await window.akoolService.faceSwap(customerImageUrl, currentAIStyleImage);
        
        if (result.success) {
            // 성공 시 결과 표시
            showAIResult(result.imageUrl);
            closePhotoUploadModal();
        } else {
            throw new Error(result.error || 'AI 처리 실패');
        }
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        handleAIError(error);
        
    } finally {
        // 버튼 복원
        processBtn.disabled = false;
        processBtn.textContent = originalText;
        processBtn.classList.remove('ai-processing');
    }
}

// AI 결과 표시
function showAIResult(resultImageUrl) {
    const resultContainer = document.getElementById('aiResultContainer');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="ai-result-image-wrapper">
            <img src="${resultImageUrl}" alt="AI 헤어스타일 체험 결과" class="ai-result-image">
            <div class="ai-badge">✨ AI Generated</div>
        </div>
        <div class="ai-result-info">
            <strong>${currentAIStyleName}</strong> 스타일로 변신한 모습입니다!
        </div>
    `;
    
    // 결과 모달 열기
    const modal = document.getElementById('aiResultModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// AI 결과 모달 닫기
function closeAIResultModal() {
    const modal = document.getElementById('aiResultModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 결과 다운로드
function downloadAIResult() {
    const img = document.querySelector('.ai-result-image');
    if (!img) {
        showToast('❌ 다운로드할 이미지가 없습니다', 'error');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.download = `hairgator_ai_${currentAIStyleName}_${Date.now()}.jpg`;
        link.href = img.src;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('💾 이미지가 저장되었습니다!', 'success');
    } catch (error) {
        console.error('다운로드 오류:', error);
        showToast('❌ 다운로드 실패', 'error');
    }
}

// 결과 공유
function shareAIResult() {
    const img = document.querySelector('.ai-result-image');
    if (!img) {
        showToast('❌ 공유할 이미지가 없습니다', 'error');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'HAIRGATOR AI 헤어스타일 체험',
            text: `${currentAIStyleName} 스타일로 변신해봤어요!`,
            url: window.location.href
        }).then(() => {
            showToast('📱 공유 완료!', 'success');
        }).catch((error) => {
            console.error('공유 오류:', error);
            copyImageLink(img.src);
        });
    } else {
        copyImageLink(img.src);
    }
}

// 이미지 링크 복사
function copyImageLink(imageUrl) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(imageUrl).then(() => {
            showToast('📋 이미지 링크가 복사되었습니다!', 'success');
        }).catch(() => {
            showToast('❌ 링크 복사 실패', 'error');
        });
    } else {
        showToast('❌ 공유 기능을 지원하지 않는 브라우저입니다', 'error');
    }
}

// 다른 사진으로 체험
function tryAnotherPhoto() {
    closeAIResultModal();
    openPhotoUploadModal();
}

// ========== 유틸리티 함수들 ==========

// 크레딧 체크
async function checkAkoolCredit() {
    try {
        if (!window.akoolService) {
            console.warn('AKOOL 서비스가 초기화되지 않았습니다');
            return true; // 서비스 없어도 진행
        }
        
        const result = await window.akoolService.getCreditInfo();
        if (result.success) {
            console.log('💰 AKOOL 크레딧:', result.credit);
            return result.credit > 0;
        }
        return true; // 크레딧 확인 실패 시에도 진행
    } catch (error) {
        console.warn('크레딧 확인 실패:', error);
        return true;
    }
}

// 이미지 업로드 (실제로는 클라우드 스토리지 사용)
async function uploadImageToStorage(dataUrl) {
    // 실제 구현에서는 Firebase Storage, Cloudinary 등 사용
    // 현재는 데모용으로 데이터 URL 반환
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(dataUrl);
        }, 1000); // 1초 가짜 업로드 시간
    });
}

// AI 에러 처리
function handleAIError(error) {
    let errorMessage = 'AI 처리 중 오류가 발생했습니다';
    
    if (error.message.includes('얼굴을 찾을 수 없습니다')) {
        errorMessage = '사진에서 얼굴을 인식할 수 없습니다. 정면을 향한 선명한 사진을 사용해주세요';
    } else if (error.message.includes('크레딧')) {
        errorMessage = 'AI 체험 크레딧이 부족합니다. 관리자에게 문의해주세요';
    } else if (error.message.includes('처리 시간')) {
        errorMessage = '처리 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요';
    } else if (error.message.includes('네트워크')) {
        errorMessage = '네트워크 연결을 확인해주세요';
    }
    
    showToast(`❌ ${errorMessage}`, 'error');
}

// ========== 초기화 및 통합 ==========

// 기존 함수들을 AI 기능이 있는 버전으로 교체
function integrateAIFeature() {
    // AI 모달 스타일 추가
    addAIModalStyles();
    
    // 기존 함수 교체
    if (typeof window.showStyleDetailOptimized !== 'undefined') {
        window.showStyleDetailOptimized = showStyleDetailWithAI;
    }
    
    if (typeof window.showStyleDetail !== 'undefined') {
        window.showStyleDetail = showStyleDetailWithAI;
    }
    
    console.log('✅ AI 체험 기능이 성공적으로 통합되었습니다');
}

// AI 모달 스타일 추가
function addAIModalStyles() {
    if (document.getElementById('ai-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ai-modal-styles';
    style.textContent = `
        /* AI 체험 버튼 스타일 */
        .btn-ai-experience {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            margin-bottom: 10px;
            width: 100%;
        }
        
        .btn-ai-experience:hover {
            background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .btn-ai-experience:active {
            transform: translateY(0);
        }
        
        .ai-icon {
            font-size: 16px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        /* AI 모달 스타일 */
        .ai-modal-content {
            max-width: 450px;
        }
        
        .ai-modal-body {
            padding: 30px;
            text-align: center;
        }
        
        .ai-modal-title {
            color: #FF1493;
            margin-bottom: 15px;
            font-size: 22px;
            font-weight: 700;
        }
        
        .ai-modal-desc {
            color: #999;
            margin-bottom: 25px;
            line-height: 1.5;
            font-size: 14px;
        }
        
        /* 업로드 영역 */
        .photo-upload-area {
            border: 2px dashed #FF1493;
            border-radius: 15px;
            padding: 25px;
            margin: 20px 0;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .photo-upload-area:hover {
            border-color: #FF69B4;
            background: rgba(255, 20, 147, 0.05);
        }
        
        .upload-placeholder {
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .upload-icon {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.7;
        }
        
        .upload-text {
            font-size: 16px;
            color: #FF1493;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .upload-hint {
            font-size: 12px;
            color: #666;
        }
        
        .photo-preview {
            text-align: center;
        }
        
        .preview-img {
            width: 100%;
            max-width: 200px;
            border-radius: 10px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .preview-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .btn-ai-process {
            background: #FF1493;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-ai-process:hover {
            background: #FF69B4;
            transform: translateY(-1px);
        }
        
        .btn-ai-process:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-secondary {
            background: #666;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-secondary:hover {
            background: #777;
        }
        
        .ai-info-notice {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255,20,147,0.1);
            border-radius: 10px;
            font-size: 12px;
            color: #FF69B4;
            line-height: 1.4;
        }
        
        /* AI 결과 스타일 */
        .ai-result-container {
            margin: 20px 0;
        }
        
        .ai-result-image-wrapper {
            position: relative;
            display: inline-block;
        }
        
        .ai-result-image {
            width: 100%;
            max-width: 350px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .ai-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255,20,147,0.9);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .ai-result-info {
            margin-top: 15px;
            color: #666;
            font-size: 14px;
        }
        
        .ai-result-info strong {
            color: #FF1493;
        }
        
        .ai-result-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        
        .btn-ai-download {
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-ai-download:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .btn-ai-share {
            background: #4267B2;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-ai-share:hover {
            background: #365899;
            transform: translateY(-1px);
        }
        
        .ai-result-secondary {
            margin-top: 15px;
        }
        
        /* 로딩 애니메이션 */
        .ai-processing {
            animation: processing 1.5s ease-in-out infinite;
        }
        
        @keyframes processing {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* 모달 액션 레이아웃 조정 */
        .modal-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        }
        
        .modal-actions .btn-ai-experience {
            order: -1;
        }
        
        .modal-actions .btn-register,
        .modal-actions .btn-like {
            flex: 1;
        }
        
        /* 반응형 */
        @media (max-width: 480px) {
            .ai-modal-body {
                padding: 20px;
            }
            
            .ai-modal-title {
                font-size: 20px;
            }
            
            .preview-actions {
                flex-direction: column;
            }
            
            .ai-result-actions {
                flex-direction: column;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 페이지 로드 시 자동 통합
function initAIIntegration() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', integrateAIFeature);
    } else {
        integrateAIFeature();
    }
}

// 즉시 초기화
initAIIntegration();
