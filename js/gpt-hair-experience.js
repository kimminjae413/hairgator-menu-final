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

// ========== 태블릿 최적화 이벤트 처리 ==========
function setupGPTModalEvents() {
    const userPhotoInput = document.getElementById('userPhotoInput');
    const uploadArea = document.getElementById('uploadArea');
    
    // 파일 선택 이벤트
    if (userPhotoInput) {
        userPhotoInput.addEventListener('change', handlePhotoSelect);
    }
    
    // 태블릿 터치 최적화 - 드래그 앤 드롭 간소화
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        
        // 태블릿 터치 이벤트 추가
        uploadArea.addEventListener('touchstart', function(e) {
            e.currentTarget.classList.add('touch-active');
        });
        
        uploadArea.addEventListener('touchend', function(e) {
            e.currentTarget.classList.remove('touch-active');
        });
    }
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
async function startGPTProcessing() {
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
    
    try {
        // 옵션 수집
        const options = {
            colorMatch: document.getElementById('colorMatchOption')?.checked || false,
            enhanceQuality: document.getElementById('enhanceQualityOption')?.checked || false
        };
        
        // 처리 상태 업데이트
        updateProcessingText('이미지 분석 중...');
        
        // GPT 처리 실행
        const result = await processGPTHairStyleChange(
            window.HAIRGATOR_GPT.userPhoto,
            window.HAIRGATOR_GPT.currentStyle.imageUrl,
            window.HAIRGATOR_GPT.currentStyle.name,
            options
        );
        
        if (result.success) {
            updateProcessingText('결과 로드 중...');
            displayGPTResult(result);
            showToast('AI 헤어스타일 적용 완료!', 'success');
        } else {
            throw new Error(result.error || '처리 중 오류가 발생했습니다');
        }
        
    } catch (error) {
        console.error('GPT 처리 오류:', error);
        showToast('AI 처리 중 오류가 발생했습니다: ' + error.message, 'error');
        
        // 처리 상태 숨기기
        if (processingStatus) {
            processingStatus.style.display = 'none';
        }
        
        // 시작 가이드 다시 표시
        showStartGuide();
        
    } finally {
        window.HAIRGATOR_GPT.isProcessing = false;
        
        // 버튼 상태 복원
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🎨 AI 체험 시작';
            startBtn.classList.add('ready');
        }
    }
}

function updateProcessingText(text) {
    const processingText = document.getElementById('processingText');
    if (processingText) {
        processingText.textContent = text;
    }
}

// ========== 결과 표시 - 태블릿 최적화 ==========
function displayGPTResult(result) {
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
    
    if (originalResult) {
        originalResult.src = result.originalImage;
    }
    
    if (styledResult) {
        styledResult.src = result.styledImage;
    }
    
    // 결과 저장
    window.HAIRGATOR_GPT.lastResult = result;
}

// ========== 모달 닫기 - 상태 초기화 ==========
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
