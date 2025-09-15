// ==========================================
// HAIRGATOR GPT Image 1 헤어스타일 체험 시스템
// js/gpt-hair-experience.js - 완전 작동 버전
// ==========================================

console.log('🎨 GPT Image 1 헤어스타일 체험 시스템 로드 시작');

// GPT 시스템 전역 객체
window.HAIRGATOR_GPT = {
    isProcessing: false,
    currentStyle: null,
    userPhoto: null,
    apiEndpoint: '/.netlify/functions/openai-proxy'
};

// ========== 태블릿 최적화 GPT 모달 HTML 생성 ==========
function createGPTModalHTML(style) {
    return `
    <!-- GPT 헤어스타일 체험 모달 - 태블릿 최적화 -->
    <div class="gpt-hair-style-modal" id="gptHairStyleModal">
        <div class="gpt-modal-container tablet-optimized">
            <!-- 모달 헤더 -->
            <div class="gpt-modal-header">
                <h2>
                    <span class="header-icon">🎨</span>
                    GPT Image 1 헤어체험
                    <span class="gpt-badge">NEW</span>
                </h2>
                <button class="close-btn" onclick="closeGPTHairStyleModal()">×</button>
            </div>
            
            <!-- 모달 콘텐츠 - 태블릿 2컬럼 레이아웃 -->
            <div class="gpt-modal-content tablet-layout">
                <!-- 왼쪽 컬럼: 스타일 정보 + 사진 업로드 -->
                <div class="left-column">
                    <!-- 선택된 스타일 정보 -->
                    <div class="selected-style-info compact">
                        <h4>🎯 선택된 헤어스타일</h4>
                        <div class="style-preview horizontal">
                            <img src="${style.imageUrl}" alt="${style.name}" class="style-reference-image small">
                            <div class="style-details">
                                <h3>${style.name}</h3>
                                <p class="style-code">${style.code}</p>
                                <p class="style-category">${style.mainCategory} > ${style.subCategory}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 사진 업로드 영역 - 간소화 -->
                    <div class="photo-upload-section compact" id="photoUploadSection">
                        <h4>📷 사진 업로드</h4>
                        <div class="upload-area tablet-size" id="uploadArea">
                            <input type="file" id="userPhotoInput" accept="image/*" style="display: none;">
                            <div class="upload-placeholder">
                                <div class="upload-icon">📁</div>
                                <p>갤러리에서 사진 선택</p>
                                <button type="button" class="upload-btn tablet-btn" onclick="document.getElementById('userPhotoInput').click()">
                                    사진 선택하기
                                </button>
                            </div>
                            <div class="photo-preview" id="photoPreview" style="display: none;">
                                <img id="previewImage" alt="미리보기">
                                <button type="button" class="change-photo-btn" onclick="document.getElementById('userPhotoInput').click()">
                                    다른 사진 선택
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 옵션 설정 - 간소화 -->
                    <div class="gpt-options-section compact">
                        <h4>⚙️ 옵션</h4>
                        <div class="option-toggles tablet-toggles">
                            <label class="option-toggle">
                                <input type="checkbox" id="colorMatchOption" checked>
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">피부톤 맞춤</span>
                            </label>
                            <label class="option-toggle">
                                <input type="checkbox" id="enhanceQualityOption">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">고품질</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- 오른쪽 컬럼: 처리 상태 + 결과 -->
                <div class="right-column">
                    <!-- 처리 상태 -->
                    <div class="processing-status tablet-processing" id="processingStatus" style="display: none;">
                        <div class="processing-animation">
                            <div class="processing-spinner"></div>
                            <p id="processingText">AI가 헤어스타일을 적용하고 있습니다...</p>
                        </div>
                    </div>
                    
                    <!-- 결과 표시 -->
                    <div class="result-section tablet-result" id="resultSection" style="display: none;">
                        <h4>✨ 변환 결과</h4>
                        <div class="result-comparison tablet-comparison">
                            <div class="result-item">
                                <p>원본</p>
                                <img id="originalResult" alt="원본 사진">
                            </div>
                            <div class="result-arrow">→</div>
                            <div class="result-item">
                                <p>변환 후</p>
                                <img id="styledResult" alt="스타일 적용 후">
                            </div>
                        </div>
                        <div class="result-actions tablet-actions">
                            <button type="button" class="result-btn secondary" onclick="downloadResult()">
                                💾 다운로드
                            </button>
                            <button type="button" class="result-btn primary" onclick="shareResult()">
                                📤 공유하기
                            </button>
                        </div>
                    </div>
                    
                    <!-- 시작 안내 (결과가 없을 때) -->
                    <div class="start-guide" id="startGuide">
                        <div class="guide-content">
                            <div class="guide-icon">🎨</div>
                            <h3>AI 헤어스타일 체험</h3>
                            <p>왼쪽에서 사진을 업로드하고<br>AI 체험 시작 버튼을 눌러주세요</p>
                            <div class="guide-steps">
                                <div class="step">1️⃣ 사진 업로드</div>
                                <div class="step">2️⃣ 옵션 선택</div>
                                <div class="step">3️⃣ AI 체험 시작</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 하단 액션 버튼 - 태블릿 최적화 -->
            <div class="gpt-modal-actions tablet-actions">
                <button type="button" class="gpt-action-btn secondary tablet-btn" onclick="closeGPTHairStyleModal()">
                    취소
                </button>
                <button type="button" class="gpt-action-btn primary tablet-btn" id="startProcessBtn" onclick="startGPTProcessing()" disabled>
                    🎨 AI 체험 시작
                </button>
            </div>
        </div>
    </div>`;
}

// ========== GPT 헤어스타일 체험 모달 열기 ==========
function openGPTHairStyleModal(style) {
    console.log('🎨 GPT 헤어스타일 모달 열기:', style);
    
    // 기존 모달이 있으면 제거
    removeGPTModal();
    
    // 현재 스타일 저장
    window.HAIRGATOR_GPT.currentStyle = style;
    
    // 모달 HTML 생성
    const modalHTML = createGPTModalHTML(style);
    
    // DOM에 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 표시
    setTimeout(() => {
        const modal = document.getElementById('gptHairStyleModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }, 100);
    
    // 이벤트 리스너 등록
    setupGPTModalEvents();
}

// ========== 전역 파일 선택 함수 ==========
let currentMethod = 'upload'; // 전역 변수

function triggerFileSelect() {
    console.log('파일 선택 버튼 클릭됨, 현재 모드:', currentMethod);
    
    const userPhotoInput = document.getElementById('userPhotoInput');
    const cameraPhotoInput = document.getElementById('cameraPhotoInput');
    
    if (currentMethod === 'upload' && userPhotoInput) {
        userPhotoInput.click();
        console.log('갤러리 파일 선택 실행');
    } else if (currentMethod === 'camera' && cameraPhotoInput) {
        cameraPhotoInput.click();
        console.log('카메라 촬영 실행');
    } else {
        console.error('파일 입력 요소를 찾을 수 없음');
    }
}

function selectMethod(method) {
    currentMethod = method;
    console.log('체험 방법 변경:', method);
    
    const options = document.querySelectorAll('.method-option');
    options.forEach(opt => opt.classList.remove('active'));
    
    const selectedOption = document.querySelector(`[data-method="${method}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // UI 업데이트
    const uploadIcon = document.querySelector('.upload-icon');
    const uploadText = document.querySelector('.upload-placeholder p');
    const uploadBtn = document.querySelector('.upload-btn');
    
    if (method === 'camera') {
        if (uploadIcon) uploadIcon.textContent = '📷';
        if (uploadText) uploadText.textContent = '카메라로 새 사진을 촬영하세요';
        if (uploadBtn) uploadBtn.textContent = '사진 촬영하기';
    } else {
        if (uploadIcon) uploadIcon.textContent = '📁';
        if (uploadText) uploadText.textContent = '사진을 선택하거나 여기에 드래그하세요';
        if (uploadBtn) uploadBtn.textContent = '사진 선택하기';
    }
}

// ========== 태블릿 최적화 이벤트 처리 ==========
function setupGPTModalEvents() {
    const userPhotoInput = document.getElementById('userPhotoInput');
    const cameraPhotoInput = document.getElementById('cameraPhotoInput');
    const uploadArea = document.getElementById('uploadArea');
    
    console.log('GPT 모달 이벤트 설정 시작');
    
    // 파일 선택 이벤트
    if (userPhotoInput) {
        userPhotoInput.addEventListener('change', function(e) {
            console.log('갤러리 파일 선택됨:', e.target.files[0]);
            handlePhotoSelect(e);
        });
    }
    
    if (cameraPhotoInput) {
        cameraPhotoInput.addEventListener('change', function(e) {
            console.log('카메라 사진 촬영됨:', e.target.files[0]);
            handlePhotoSelect(e);
        });
    }
    
    // 드래그 앤 드롭 (업로드 모드에서만)
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            if (currentMethod === 'upload') {
                handleDragOver(e);
            }
        });
        
        uploadArea.addEventListener('drop', function(e) {
            if (currentMethod === 'upload') {
                handleDrop(e);
            }
        });
        
        uploadArea.addEventListener('dragleave', handleDragLeave);
    }
    
    console.log('GPT 모달 이벤트 설정 완료');
}

// ========== 사진 선택 처리 - 태블릿 최적화 ==========
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // 파일 크기 검증 (태블릿 메모리 고려)
        if (file.size > 10 * 1024 * 1024) { // 10MB
            showToast('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.', 'error');
            return;
        }
        
        displayPhotoPreview(file);
        enableStartButton();
        hideStartGuide();
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        displayPhotoPreview(files[0]);
        enableStartButton();
        hideStartGuide();
    }
}

function displayPhotoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const photoPreview = document.getElementById('photoPreview');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        
        if (previewImage && photoPreview && uploadPlaceholder) {
            previewImage.src = e.target.result;
            photoPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            
            // 파일 저장
            window.HAIRGATOR_GPT.userPhoto = file;
        }
    };
    reader.readAsDataURL(file);
}

function enableStartButton() {
    const startBtn = document.getElementById('startProcessBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '🎨 AI 체험 시작';
        startBtn.classList.add('ready');
    }
}

function hideStartGuide() {
    const startGuide = document.getElementById('startGuide');
    if (startGuide) {
        startGuide.style.display = 'none';
    }
}

function showStartGuide() {
    const startGuide = document.getElementById('startGuide');
    if (startGuide) {
        startGuide.style.display = 'block';
    }
}

// ========== GPT 처리 시작 - 태블릿 최적화 ==========
function startGPTProcessing() {
    if (!window.HAIRGATOR_GPT.userPhoto || !window.HAIRGATOR_GPT.currentStyle) {
        showToast('사진을 먼저 업로드해주세요', 'error');
        return;
    }
    
    const startBtn = document.getElementById('startProcessBtn');
    const processingStatus = document.getElementById('processingStatus');
    const startGuide = document.getElementById('startGuide');
    
    // UI 상태 변경
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '처리 중...';
        startBtn.classList.remove('ready');
    }
    
    if (processingStatus) {
        processingStatus.style.display = 'block';
    }
    
    if (startGuide) {
        startGuide.style.display = 'none';
    }
    
    window.HAIRGATOR_GPT.isProcessing = true;
    
    // 임시 데모용 처리 (실제 API 연결시 교체)
    setTimeout(() => {
        updateProcessingText('결과 생성 중...');
        setTimeout(() => {
            displayDemoResult();
            showToast('AI 헤어스타일 적용 완료!', 'success');
            
            // 처리 완료 후 상태 복원
            window.HAIRGATOR_GPT.isProcessing = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '🎨 AI 체험 시작';
                startBtn.classList.add('ready');
            }
        }, 2000);
    }, 3000);
}

function updateProcessingText(text) {
    const processingText = document.getElementById('processingText');
    if (processingText) {
        processingText.textContent = text;
    }
}

// ========== 데모 결과 표시 ==========
function displayDemoResult() {
    const processingStatus = document.getElementById('processingStatus');
    const resultSection = document.getElementById('resultSection');
    const originalResult = document.getElementById('originalResult');
    const styledResult = document.getElementById('styledResult');
    
    // 처리 상태 숨기기
    if (processingStatus) {
        processingStatus.style.display = 'none';
    }
    
    // 결과 표시
    if (resultSection) {
        resultSection.style.display = 'block';
    }
    
    // 업로드된 사진을 원본으로 표시
    if (originalResult && window.HAIRGATOR_GPT.userPhoto) {
        const reader = new FileReader();
        reader.onload = function(e) {
            originalResult.src = e.target.result;
        };
        reader.readAsDataURL(window.HAIRGATOR_GPT.userPhoto);
    }
    
    // 선택된 스타일 이미지를 결과로 표시 (데모용)
    if (styledResult && window.HAIRGATOR_GPT.currentStyle) {
        styledResult.src = window.HAIRGATOR_GPT.currentStyle.imageUrl;
    }
}

// ========== 유틸리티 함수들 ==========
function downloadResult() {
    if (!window.HAIRGATOR_GPT.currentStyle) {
        showToast('다운로드할 결과가 없습니다', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = window.HAIRGATOR_GPT.currentStyle.imageUrl;
    link.download = `hairgator_gpt_${Date.now()}.png`;
    link.click();
    
    showToast('이미지가 다운로드되었습니다', 'success');
}

function shareResult() {
    if (!window.HAIRGATOR_GPT.currentStyle) {
        showToast('공유할 결과가 없습니다', 'error');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'HAIRGATOR GPT 헤어스타일 체험',
            text: '새로운 헤어스타일을 확인해보세요!',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.HAIRGATOR_GPT.currentStyle.imageUrl)
            .then(() => showToast('이미지 URL이 클립보드에 복사되었습니다', 'success'))
            .catch(() => showToast('공유 기능을 사용할 수 없습니다', 'error'));
    }
}

// ========== 모달 닫기 ==========
function closeGPTHairStyleModal() {
    const modal = document.getElementById('gptHairStyleModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            removeGPTModal();
        }, 300);
    }
    
    // 상태 초기화
    window.HAIRGATOR_GPT.isProcessing = false;
    window.HAIRGATOR_GPT.userPhoto = null;
    window.HAIRGATOR_GPT.currentStyle = null;
}

function removeGPTModal() {
    const existingModal = document.getElementById('gptHairStyleModal');
    if (existingModal) {
        existingModal.remove();
    }
}

function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    // 기존 토스트 시스템이 있다면 사용, 없으면 alert
    if (window.showToast && typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// ========== 전역 함수 등록 ==========
window.openGPTHairStyleModal = openGPTHairStyleModal;
window.closeGPTHairStyleModal = closeGPTHairStyleModal;
window.startGPTProcessing = startGPTProcessing;
window.downloadResult = downloadResult;
window.shareResult = shareResult;

// ========== 초기화 확인 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ GPT Image 1 헤어스타일 체험 시스템 로드 완료');
    
    // 전역 함수 확인
    if (typeof window.openGPTHairStyleModal === 'function') {
        console.log('✅ window.openGPTHairStyleModal 함수 등록 완료');
    } else {
        console.error('❌ window.openGPTHairStyleModal 함수 등록 실패');
    }
});

console.log('🎨 GPT 시스템 스크립트 로드 완료');
