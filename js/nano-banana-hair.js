// ==========================================
// HAIRGATOR - nano_banana Image-to-Image 헤어스타일 변환
// js/nano-banana-hair.js - 시각적 특징 분석 기반 헤어 변환
// ==========================================

console.log('🎨 nano_banana 시각적 헤어스타일 분석 시스템 로드');

// nano_banana 시스템 전역 객체
window.HAIRGATOR_NANO_BANANA = {
    isProcessing: false,
    currentStyle: null,
    userPhoto: null,
    currentMethod: 'upload',
    analysisResults: null,
    apiEndpoint: '/.netlify/functions/nano-banana-proxy'
};

// ✅ 핵심: AI 헤어체험 모달 HTML
function createAIHairModalHTML(style) {
    return `
    <div class="ai-hair-modal" id="aiHairModal">
        <div class="ai-modal-container tablet-optimized">
            <div class="ai-modal-header">
                <h2>
                    <span class="header-icon">🎨</span>
                    AI 헤어체험
                    <span class="ai-badge">NEW</span>
                </h2>
                <button class="close-btn" onclick="closeAIHairModal()">×</button>
            </div>
            
            <div class="ai-modal-content tablet-layout">
                <div class="left-column">
                    <!-- 선택된 헤어스타일 정보 -->
                    <div class="style-analysis-info">
                        <h4>🎯 선택된 헤어스타일</h4>
                        <div class="style-preview-detailed">
                            <img src="${style.imageUrl}" alt="${style.name}" class="reference-style-image">
                            <div class="style-details">
                                <h3>${style.name}</h3>
                                <p class="style-code">${style.code}</p>
                                <p class="style-category">${style.mainCategory} > ${style.subCategory}</p>
                            </div>
                        </div>
                        
                        <!-- AI 분석 예상 결과 -->
                        <div class="ai-analysis-preview">
                            <h5>🤖 AI가 분석할 요소들:</h5>
                            <div class="analysis-tags">
                                <span class="analysis-tag">📏 헤어 길이</span>
                                <span class="analysis-tag">🎨 컬러 톤</span>
                                <span class="analysis-tag">〰️ 웨이브/컬</span>
                                <span class="analysis-tag">✂️ 레이어 컷</span>
                                <span class="analysis-tag">💫 스타일링</span>
                                <span class="analysis-tag">🔄 파팅 라인</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 사진 업로드 섹션 -->
                    <div class="photo-upload-section">
                        <h4>📸 내 사진 업로드</h4>
                        
                        <!-- 체험 방법 선택 -->
                        <div class="method-selection">
                            <button class="method-btn active" id="uploadMethodBtn" data-method="upload">
                                <span>📁</span> 갤러리에서 선택
                            </button>
                            <button class="method-btn" id="cameraMethodBtn" data-method="camera">
                                <span>📷</span> 카메라로 촬영
                            </button>
                        </div>
                        
                        <!-- 파일 입력 (숨김) -->
                        <input type="file" id="aiGalleryInput" accept="image/*" style="display: none;">
                        <input type="file" id="aiCameraInput" accept="image/*" capture="environment" style="display: none;">
                        
                        <!-- 업로드 영역 -->
                        <div class="upload-area" id="aiUploadArea">
                            <div class="upload-placeholder" id="aiUploadPlaceholder">
                                <div class="upload-icon">📁</div>
                                <p>AI가 분석할 내 사진을 선택해주세요</p>
                                <button type="button" class="upload-btn" id="aiMainUploadBtn">
                                    사진 선택하기
                                </button>
                            </div>
                            
                            <!-- 사진 미리보기 -->
                            <div class="photo-preview" id="aiPhotoPreview" style="display: none;">
                                <img id="aiPreviewImage" alt="미리보기">
                                <button type="button" class="change-photo-btn" id="aiChangePhotoBtn">
                                    다른 사진 선택
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 고급 옵션 -->
                    <div class="advanced-options">
                        <h4>⚙️ 변환 옵션</h4>
                        <div class="options-grid">
                            <label class="option-item">
                                <input type="checkbox" id="preserveFaceOption" checked>
                                <span>얼굴 특징 보존</span>
                            </label>
                            <label class="option-item">
                                <input type="checkbox" id="skinToneMatchOption" checked>
                                <span>피부톤 자동 매칭</span>
                            </label>
                            <label class="option-item">
                                <input type="checkbox" id="naturalBlendOption" checked>
                                <span>자연스러운 블렌딩</span>
                            </label>
                            <label class="option-item">
                                <input type="checkbox" id="enhanceQualityOption">
                                <span>고품질 향상</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="right-column">
                    <!-- 시작 섹션 -->
                    <div class="start-section" id="aiStartSection">
                        <h4>🚀 AI 헤어체험 시작</h4>
                        <div class="process-explanation">
                            <h5>처리 과정:</h5>
                            <div class="process-steps">
                                <div class="process-step">
                                    <span class="step-number">1</span>
                                    <span class="step-text">헤어스타일 특징 분석</span>
                                </div>
                                <div class="process-step">
                                    <span class="step-number">2</span>
                                    <span class="step-text">얼굴 특징 추출</span>
                                </div>
                                <div class="process-step">
                                    <span class="step-number">3</span>
                                    <span class="step-text">헤어스타일 적용</span>
                                </div>
                                <div class="process-step">
                                    <span class="step-number">4</span>
                                    <span class="step-text">자연스러운 결과 생성</span>
                                </div>
                            </div>
                        </div>
                        
                        <button class="start-btn ai-start-btn" id="aiStartBtn" onclick="startAIHairProcessing()">
                            <span class="btn-icon">🎨</span>
                            <span>AI 헤어체험 시작</span>
                        </button>
                        <p class="processing-info">예상 처리 시간: 45-90초</p>
                    </div>
                    
                    <!-- 진행 상황 섹션 -->
                    <div class="progress-section" id="aiProgressSection" style="display: none;">
                        <h4>🔄 AI 처리 중...</h4>
                        
                        <!-- 현재 단계 표시 -->
                        <div class="current-step-indicator">
                            <div class="step-indicator active" id="step1">
                                <span class="step-dot"></span>
                                <span class="step-label">헤어스타일 분석</span>
                            </div>
                            <div class="step-indicator" id="step2">
                                <span class="step-dot"></span>
                                <span class="step-label">얼굴 특징 추출</span>
                            </div>
                            <div class="step-indicator" id="step3">
                                <span class="step-dot"></span>
                                <span class="step-label">스타일 적용</span>
                            </div>
                            <div class="step-indicator" id="step4">
                                <span class="step-dot"></span>
                                <span class="step-label">결과 생성</span>
                            </div>
                        </div>
                        
                        <!-- 진행률 바 -->
                        <div class="progress-bar">
                            <div class="progress-fill" id="nanoProgressFill"></div>
                        </div>
                        <p class="progress-text" id="nanoProgressText">참고 헤어스타일 시각적 분석 중...</p>
                        
                        <!-- 실시간 분석 결과 -->
                        <div class="live-analysis" id="liveAnalysis" style="display: none;">
                            <h5>🔍 실시간 분석 결과:</h5>
                            <div class="analysis-results" id="analysisResults"></div>
                        </div>
                    </div>
                    
                    <!-- 결과 섹션 -->
                    <div class="result-section" id="nanoResultSection" style="display: none;">
                        <h4>✨ AI 변환 완료</h4>
                        
                        <!-- 분석 요약 -->
                        <div class="analysis-summary" id="analysisSummary">
                            <h5>🧠 AI 분석 요약:</h5>
                            <div class="detected-features" id="detectedFeatures"></div>
                        </div>
                        
                        <!-- 결과 비교 -->
                        <div class="result-comparison">
                            <div class="comparison-item">
                                <h6>원본</h6>
                                <img id="nanoOriginalResult" alt="원본 사진">
                            </div>
                            <div class="comparison-arrow">
                                <span>🔬</span>
                                <span>AI 분석</span>
                                <span>→</span>
                            </div>
                            <div class="comparison-item">
                                <h6>변환 후</h6>
                                <img id="nanoStyledResult" alt="변환 결과">
                            </div>
                        </div>
                        
                        <!-- 결과 액션 -->
                        <div class="result-actions">
                            <button class="result-btn download" onclick="downloadNanoResult()">
                                <span>💾</span> 고화질 다운로드
                            </button>
                            <button class="result-btn share" onclick="shareNanoResult()">
                                <span>🔗</span> 결과 공유
                            </button>
                            <button class="result-btn retry" onclick="retryNanoAnalysis()">
                                <span>🔄</span> 다른 옵션으로 재시도
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

// ✅ AI 헤어체험 모달 열기
function openAIHairModal(style) {
    if (!style) {
        console.error('❌ 스타일 정보가 필요합니다');
        return;
    }
    
    console.log('🎨 AI 헤어체험 모달 열기:', style.name);
    
    // 기존 모달 제거
    removeAIHairModal();
    
    // 스타일 정보 저장
    window.HAIRGATOR_NANO_BANANA.currentStyle = style;
    window.HAIRGATOR_NANO_BANANA.currentMethod = 'upload';
    
    // 모달 HTML 생성
    document.body.insertAdjacentHTML('beforeend', createAIHairModalHTML(style));
    
    // 이벤트 설정
    setupAIHairEvents();
    
    // 모달 표시
    const modal = document.getElementById('aiHairModal');
    if (modal) {
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        document.body.style.overflow = 'hidden';
    }
    
    console.log('✅ AI 헤어체험 모달 생성 완료');
}

// ✅ nano_banana 이벤트 설정
function setupNanoBananaEvents() {
    console.log('🔧 nano_banana 이벤트 설정 시작...');
    
    // DOM 요소 찾기
    const galleryInput = document.getElementById('nanoGalleryInput');
    const cameraInput = document.getElementById('nanoCameraInput');
    const mainUploadBtn = document.getElementById('nanoMainUploadBtn');
    const changePhotoBtn = document.getElementById('nanoChangePhotoBtn');
    const uploadMethodBtn = document.getElementById('uploadMethodBtn');
    const cameraMethodBtn = document.getElementById('cameraMethodBtn');
    
    // 체험 방법 선택
    if (uploadMethodBtn) {
        uploadMethodBtn.addEventListener('click', () => selectNanoMethod('upload'));
    }
    
    if (cameraMethodBtn) {
        cameraMethodBtn.addEventListener('click', () => selectNanoMethod('camera'));
    }
    
    // 메인 업로드 버튼
    if (mainUploadBtn && galleryInput && cameraInput) {
        mainUploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📁 nano_banana 파일 선택 버튼 클릭');
            
            if (window.HAIRGATOR_NANO_BANANA.currentMethod === 'camera') {
                cameraInput.click();
            } else {
                galleryInput.click();
            }
        });
    }
    
    // 사진 변경 버튼
    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.HAIRGATOR_NANO_BANANA.currentMethod === 'camera') {
                cameraInput.click();
            } else {
                galleryInput.click();
            }
        });
    }
    
    // 파일 선택 이벤트
    if (galleryInput) {
        galleryInput.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                handleNanoFileSelection(e.target.files[0]);
            }
        });
    }
    
    if (cameraInput) {
        cameraInput.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                handleNanoFileSelection(e.target.files[0]);
            }
        });
    }
    
    // 드래그 앤 드롭
    const uploadArea = document.getElementById('nanoUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                handleNanoFileSelection(files[0]);
            }
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.currentTarget.classList.remove('drag-over');
        });
    }
    
    console.log('✅ nano_banana 이벤트 설정 완료');
}

// ✅ 체험 방법 선택
function selectNanoMethod(method) {
    console.log('🔄 nano_banana 체험 방법 변경:', method);
    
    window.HAIRGATOR_NANO_BANANA.currentMethod = method;
    
    const uploadMethodBtn = document.getElementById('uploadMethodBtn');
    const cameraMethodBtn = document.getElementById('cameraMethodBtn');
    const mainUploadBtn = document.getElementById('nanoMainUploadBtn');
    const uploadIcon = document.querySelector('.upload-icon');
    
    // 버튼 상태 업데이트
    if (uploadMethodBtn && cameraMethodBtn) {
        uploadMethodBtn.classList.remove('active');
        cameraMethodBtn.classList.remove('active');
        
        if (method === 'upload') {
            uploadMethodBtn.classList.add('active');
        } else {
            cameraMethodBtn.classList.add('active');
        }
    }
    
    // UI 텍스트 변경
    if (method === 'camera') {
        if (uploadIcon) uploadIcon.textContent = '📷';
        if (mainUploadBtn) mainUploadBtn.textContent = '사진 촬영하기';
    } else {
        if (uploadIcon) uploadIcon.textContent = '📁';
        if (mainUploadBtn) mainUploadBtn.textContent = '사진 선택하기';
    }
}

// ✅ 파일 선택 처리
function handleNanoFileSelection(file) {
    if (!file) {
        console.error('❌ 파일이 선택되지 않음');
        return;
    }
    
    console.log('📁 nano_banana 파일 처리 시작:', file.name);
    
    // 파일 검증
    if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 선택할 수 있습니다.');
        return;
    }
    
    // 파일 저장
    window.HAIRGATOR_NANO_BANANA.userPhoto = file;
    
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('nanoPreviewImage');
        const uploadPlaceholder = document.getElementById('nanoUploadPlaceholder');
        const photoPreview = document.getElementById('nanoPhotoPreview');
        
        if (previewImage && photoPreview && uploadPlaceholder) {
            previewImage.src = e.target.result;
            uploadPlaceholder.style.display = 'none';
            photoPreview.style.display = 'block';
            
            console.log('✅ nano_banana 파일 미리보기 표시 완료');
        }
    };
    reader.readAsDataURL(file);
}

// ✅ nano_banana 처리 시작
async function startNanoBananaProcessing() {
    if (!window.HAIRGATOR_NANO_BANANA.userPhoto) {
        alert('먼저 내 사진을 선택해주세요.');
        return;
    }
    
    if (!window.HAIRGATOR_NANO_BANANA.currentStyle) {
        alert('헤어스타일 정보가 없습니다.');
        return;
    }
    
    console.log('🔬 nano_banana 시각적 분석 시작...');
    
    // UI 전환
    document.getElementById('nanoStartSection').style.display = 'none';
    document.getElementById('nanoProgressSection').style.display = 'block';
    
    window.HAIRGATOR_NANO_BANANA.isProcessing = true;
    
    try {
        // 1단계: 헤어스타일 시각적 분석 시뮬레이션
        await simulateVisualAnalysis();
        
        // 2단계: 실제 nano_banana API 호출
        const result = await callNanoBananaAPI();
        
        // 3단계: 결과 표시
        showNanoBananaResult(result);
        
    } catch (error) {
        console.error('❌ nano_banana 처리 실패:', error);
        alert('AI 처리 중 오류가 발생했습니다: ' + error.message);
        
        // 에러 시 UI 복구
        document.getElementById('nanoProgressSection').style.display = 'none';
        document.getElementById('nanoStartSection').style.display = 'block';
    } finally {
        window.HAIRGATOR_NANO_BANANA.isProcessing = false;
    }
}

// ✅ 시각적 분석 시뮬레이션
async function simulateVisualAnalysis() {
    const steps = [
        { id: 'step1', text: '참고 헤어스타일 시각적 분석 중...', analysis: '헤어 길이: 중간 / 컬러: 자연갈색 / 텍스처: 웨이브' },
        { id: 'step2', text: '내 사진에서 얼굴 특징 추출 중...', analysis: '얼굴형 인식 완료 / 피부톤 분석 완료' },
        { id: 'step3', text: '헤어스타일을 얼굴에 정밀 적용 중...', analysis: '헤어라인 매칭 / 자연스러운 블렌딩 적용' },
        { id: 'step4', text: '최종 결과 생성 중...', analysis: '고품질 렌더링 / 색상 보정 완료' }
    ];
    
    const progressFill = document.getElementById('nanoProgressFill');
    const progressText = document.getElementById('nanoProgressText');
    const liveAnalysis = document.getElementById('liveAnalysis');
    const analysisResults = document.getElementById('analysisResults');
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const progress = ((i + 1) / steps.length) * 100;
        
        // 진행률 업데이트
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = step.text;
        
        // 단계 인디케이터 업데이트
        const stepElement = document.getElementById(step.id);
        if (stepElement) {
            stepElement.classList.add('active');
            if (i > 0) {
                document.getElementById(steps[i-1].id).classList.add('completed');
            }
        }
        
        // 실시간 분석 결과 표시
        if (liveAnalysis && analysisResults) {
            liveAnalysis.style.display = 'block';
            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'analysis-item';
            analysisDiv.innerHTML = `<span class="analysis-step">${i + 1}단계:</span> ${step.analysis}`;
            analysisResults.appendChild(analysisDiv);
        }
        
        // 각 단계별 대기 시간
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    }
    
    console.log('시각적 분석 시뮬레이션 완료');
}

// nano_banana API 호출
async function callNanoBananaAPI() {
    const formData = new FormData();
    formData.append('userPhoto', window.HAIRGATOR_NANO_BANANA.userPhoto);
    formData.append('styleImageUrl', window.HAIRGATOR_NANO_BANANA.currentStyle.imageUrl);
    formData.append('preserveFace', document.getElementById('preserveFaceOption').checked);
    formData.append('skinToneMatch', document.getElementById('skinToneMatchOption').checked);
    formData.append('naturalBlend', document.getElementById('naturalBlendOption').checked);
    formData.append('enhanceQuality', document.getElementById('enhanceQualityOption').checked);
    
    const response = await fetch(window.HAIRGATOR_NANO_BANANA.apiEndpoint, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('API 호출 실패: ' + response.statusText);
    }
    
    return await response.json();
}

// 결과 표시
function showNanoBananaResult(result) {
    document.getElementById('nanoProgressSection').style.display = 'none';
    document.getElementById('nanoResultSection').style.display = 'block';
    
    if (result.originalImage) {
        document.getElementById('nanoOriginalResult').src = result.originalImage;
    }
    
    if (result.styledImage) {
        document.getElementById('nanoStyledResult').src = result.styledImage;
    }
    
    window.HAIRGATOR_NANO_BANANA.analysisResults = result;
    console.log('nano_banana 결과 표시 완료');
}

// 이벤트 설정 함수들
function setupAIHairEvents() {
    setupNanoBananaEvents();
}

// AI 헤어체험 모달 닫기
function closeAIHairModal() {
    const modal = document.getElementById('aiHairModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            removeAIHairModal();
        }, 300);
    }
    document.body.style.overflow = '';
}

// 모달 제거
function removeAIHairModal() {
    const existingModal = document.getElementById('aiHairModal');
    if (existingModal) {
        existingModal.remove();
    }
}

// 전역 함수 등록
window.openAIHairModal = openAIHairModal;
window.closeAIHairModal = closeAIHairModal;
window.startAIHairProcessing = startNanoBananaProcessing;

console.log('nano_banana 헤어 시스템 로드 완료');
