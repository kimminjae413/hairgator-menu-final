// ==========================================
// HAIRGATOR GPT Image 1 헤어스타일 체험 시스템
// js/gpt-hair-experience.js - 파일 선택 확실 작동 버전
// ==========================================

console.log('GPT Image 1 헤어스타일 체험 시스템 로드 시작');

// GPT 시스템 전역 객체
window.HAIRGATOR_GPT = {
    isProcessing: false,
    currentStyle: null,
    userPhoto: null,
    currentMethod: 'upload', // 현재 선택된 방법
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
                <!-- 왼쪽 컬럼: 스타일 정보 + 체험 방법 선택 -->
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
                    
                    <!-- 체험 방법 선택 -->
                    <div class="experience-method-selection">
                        <h4>📸 체험 방법 선택</h4>
                        <div class="method-options">
                            <div class="method-option active" data-method="upload" id="uploadMethodBtn">
                                <div class="method-icon">📁</div>
                                <div class="method-title">사진 업로드</div>
                                <div class="method-description">갤러리에서 사진 선택</div>
                            </div>
                            <div class="method-option" data-method="camera" id="cameraMethodBtn">
                                <div class="method-icon">📷</div>
                                <div class="method-title">카메라 촬영</div>
                                <div class="method-description">새로 사진 촬영</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 사진 업로드 영역 -->
                    <div class="photo-upload-section compact" id="photoUploadSection">
                        <h4 id="uploadSectionTitle">📷 사진 선택</h4>
                        <div class="upload-area tablet-size" id="uploadArea">
                            <!-- 숨겨진 파일 입력들 -->
                            <input type="file" id="galleryInput" accept="image/*" style="display: none;">
                            <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;">
                            
                            <div class="upload-placeholder" id="uploadPlaceholder">
                                <div class="upload-icon" id="uploadIcon">📁</div>
                                <p id="uploadText">사진을 선택하거나 여기에 드래그하세요</p>
                                <button type="button" class="upload-btn tablet-btn" id="mainUploadBtn">
                                    사진 선택하기
                                </button>
                            </div>
                            
                            <div class="photo-preview" id="photoPreview" style="display: none;">
                                <img id="previewImage" alt="미리보기">
                                <button type="button" class="change-photo-btn" id="changePhotoBtn">
                                    다른 사진 선택
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 옵션 설정 -->
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
                                <div class="step">1️⃣ 체험 방법 선택</div>
                                <div class="step">2️⃣ 사진 업로드</div>
                                <div class="step">3️⃣ AI 체험 시작</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 하단 액션 버튼 -->
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
    console.log('GPT 헤어스타일 모달 열기:', style);
    
    // 기존 모달이 있으면 제거
    removeGPTModal();
    
    // 현재 스타일 저장
    window.HAIRGATOR_GPT.currentStyle = style;
    window.HAIRGATOR_GPT.currentMethod = 'upload'; // 기본값 초기화
    
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

// ========== 확실한 이벤트 처리 ==========
function setupGPTModalEvents() {
    console.log('GPT 모달 이벤트 설정 시작');
    
    // 파일 입력 요소들
    const galleryInput = document.getElementById('galleryInput');
    const cameraInput = document.getElementById('cameraInput');
    const mainUploadBtn = document.getElementById('mainUploadBtn');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const uploadMethodBtn = document.getElementById('uploadMethodBtn');
    const cameraMethodBtn = document.getElementById('cameraMethodBtn');
    
    // 1. 체험 방법 선택 이벤트
    if (uploadMethodBtn) {
        uploadMethodBtn.addEventListener('click', function() {
            selectMethod('upload');
        });
    }
    
    if (cameraMethodBtn) {
        cameraMethodBtn.addEventListener('click', function() {
            selectMethod('camera');
        });
    }
    
    // 2. 파일 선택 버튼 이벤트 (직접 연결)
    if (mainUploadBtn) {
        mainUploadBtn.addEventListener('click', function() {
            console.log('메인 업로드 버튼 클릭, 현재 모드:', window.HAIRGATOR_GPT.currentMethod);
            triggerFileInput();
        });
    }
    
    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', function() {
            console.log('사진 변경 버튼 클릭');
            triggerFileInput();
        });
    }
    
    // 3. 파일 선택 이벤트
    if (galleryInput) {
        galleryInput.addEventListener('change', function(e) {
            console.log('갤러리에서 파일 선택됨:', e.target.files[0]);
            handleFileSelection(e.target.files[0]);
        });
    }
    
    if (cameraInput) {
        cameraInput.addEventListener('change', function(e) {
            console.log('카메라로 사진 촬영됨:', e.target.files[0]);
            handleFileSelection(e.target.files[0]);
        });
    }
    
    // 4. 드래그 앤 드롭 (갤러리 모드에서만)
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            if (window.HAIRGATOR_GPT.currentMethod === 'upload') {
                e.preventDefault();
                e.currentTarget.classList.add('drag-over');
            }
        });
        
        uploadArea.addEventListener('drop', function(e) {
            if (window.HAIRGATOR_GPT.currentMethod === 'upload') {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type.startsWith('image/')) {
                    console.log('드래그 앤 드롭으로 파일 선택됨:', files[0]);
                    handleFileSelection(files[0]);
                }
            }
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.currentTarget.classList.remove('drag-over');
        });
    }
    
    console.log('GPT 모달 이벤트 설정 완료');
}

// ========== 체험 방법 선택 ==========
function selectMethod(method) {
    console.log('체험 방법 변경:', method);
    
    window.HAIRGATOR_GPT.currentMethod = method;
    
    // UI 업데이트
    const uploadMethodBtn = document.getElementById('uploadMethodBtn');
    const cameraMethodBtn = document.getElementById('cameraMethodBtn');
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadText = document.getElementById('uploadText');
    const mainUploadBtn = document.getElementById('mainUploadBtn');
    const uploadSectionTitle = document.getElementById('uploadSectionTitle');
    
    // 버튼 활성화 상태 변경
    if (uploadMethodBtn && cameraMethodBtn) {
        uploadMethodBtn.classList.remove('active');
        cameraMethodBtn.classList.remove('active');
        
        if (method === 'upload') {
            uploadMethodBtn.classList.add('active');
        } else {
            cameraMethodBtn.classList.add('active');
        }
    }
    
    // UI 텍스트 및 아이콘 업데이트
    if (method === 'camera') {
        if (uploadIcon) uploadIcon.textContent = '📷';
        if (uploadText) uploadText.textContent = '카메라로 새 사진을 촬영하세요';
        if (mainUploadBtn) mainUploadBtn.textContent = '사진 촬영하기';
        if (uploadSectionTitle) uploadSectionTitle.textContent = '📷 사진 촬영';
    } else {
        if (uploadIcon) uploadIcon.textContent = '📁';
        if (uploadText) uploadText.textContent = '사진을 선택하거나 여기에 드래그하세요';
        if (mainUploadBtn) mainUploadBtn.textContent = '사진 선택하기';
        if (uploadSectionTitle) uploadSectionTitle.textContent = '📷 사진 선택';
    }
}

// ========== 파일 입력 트리거 ==========
function triggerFileInput() {
    const method = window.HAIRGATOR_GPT.currentMethod;
    console.log('파일 입력 트리거, 모드:', method);
    
    if (method === 'camera') {
        const cameraInput = document.getElementById('cameraInput');
        if (cameraInput) {
            cameraInput.click();
            console.log('카메라 입력 실행');
        } else {
            console.error('카메라 입력 요소를 찾을 수 없음');
        }
    } else {
        const galleryInput = document.getElementById('galleryInput');
        if (galleryInput) {
            galleryInput.click();
            console.log('갤러리 입력 실행');
        } else {
            console.error('갤러리 입력 요소를 찾을 수 없음');
        }
    }
}

// ========== 파일 선택 처리 ==========
function handleFileSelection(file) {
    if (!file) {
        console.error('파일이 선택되지 않음');
        return;
    }
    
    console.log('파일 처리 시작:', file.name, file.size, 'bytes');
    
    // 파일 크기 검증
    if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
        return;
    }
    
    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 선택할 수 있습니다.');
        return;
    }
    
    // GPT 시스템에 파일 저장
    window.HAIRGATOR_GPT.userPhoto = file;
    
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const photoPreview = document.getElementById('photoPreview');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const startBtn = document.getElementById('startProcessBtn');
        const startGuide = document.getElementById('startGuide');
        
        // 미리보기 이미지 설정
        if (previewImage) {
            previewImage.src = e.target.result;
        }
        
        // UI 상태 변경
        if (photoPreview) photoPreview.style.display = 'block';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        if (startGuide) startGuide.style.display = 'none';
        
        // AI 시작 버튼 활성화
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🎨 AI 체험 시작';
            startBtn.classList.add('ready');
        }
        
        console.log('파일 처리 완료 - 미리보기 표시됨');
    };
    
    reader.onerror = function() {
        console.error('파일 읽기 오류');
        alert('파일을 읽을 수 없습니다. 다른 파일을 선택해주세요.');
    };
    
    reader.readAsDataURL(file);
}

// ========== GPT 처리 시작 ==========
function startGPTProcessing() {
    if (!window.HAIRGATOR_GPT.userPhoto || !window.HAIRGATOR_GPT.currentStyle) {
        alert('사진을 먼저 업로드해주세요');
        return;
    }
    
    console.log('GPT 처리 시작');
    
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
    
    // 데모 처리 (3초 후 결과 표시)
    setTimeout(() => {
        displayGPTResult();
        
        // 상태 복원
        window.HAIRGATOR_GPT.isProcessing = false;
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🎨 AI 체험 시작';
            startBtn.classList.add('ready');
        }
    }, 3000);
}

// ========== 결과 표시 ==========
function displayGPTResult() {
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
    
    // 원본 이미지 (업로드된 사진)
    if (originalResult && window.HAIRGATOR_GPT.userPhoto) {
        const reader = new FileReader();
        reader.onload = function(e) {
            originalResult.src = e.target.result;
        };
        reader.readAsDataURL(window.HAIRGATOR_GPT.userPhoto);
    }
    
    // 변환 후 이미지 (임시로 헤어스타일 이미지 표시)
    if (styledResult && window.HAIRGATOR_GPT.currentStyle) {
        styledResult.src = window.HAIRGATOR_GPT.currentStyle.imageUrl;
    }
    
    console.log('GPT 결과 표시 완료');
}

// ========== 유틸리티 함수들 ==========
function downloadResult() {
    if (!window.HAIRGATOR_GPT.currentStyle) {
        alert('다운로드할 결과가 없습니다');
        return;
    }
    
    const link = document.createElement('a');
    link.href = window.HAIRGATOR_GPT.currentStyle.imageUrl;
    link.download = `hairgator_gpt_${Date.now()}.png`;
    link.click();
    
    console.log('이미지 다운로드 실행');
}

function shareResult() {
    if (!window.HAIRGATOR_GPT.currentStyle) {
        alert('공유할 결과가 없습니다');
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
            .then(() => alert('이미지 URL이 클립보드에 복사되었습니다'))
            .catch(() => alert('공유 기능을 사용할 수 없습니다'));
    }
}

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
    window.HAIRGATOR_GPT.currentMethod = 'upload';
}

function removeGPTModal() {
    const existingModal = document.getElementById('gptHairStyleModal');
    if (existingModal) {
        existingModal.remove();
    }
}

// ========== 전역 함수 등록 ==========
window.openGPTHairStyleModal = openGPTHairStyleModal;
window.closeGPTHairStyleModal = closeGPTHairStyleModal;
window.startGPTProcessing = startGPTProcessing;
window.downloadResult = downloadResult;
window.shareResult = shareResult;
window.selectMethod = selectMethod;
window.triggerFileInput = triggerFileInput;

// ========== 초기화 확인 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('GPT Image 1 헤어스타일 체험 시스템 로드 완료');
    
    if (typeof window.openGPTHairStyleModal === 'function') {
        console.log('window.openGPTHairStyleModal 함수 등록 완료');
    } else {
        console.error('window.openGPTHairStyleModal 함수 등록 실패');
    }
});

console.log('GPT 시스템 스크립트 로드 완료');
