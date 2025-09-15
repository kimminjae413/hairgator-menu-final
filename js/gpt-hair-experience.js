// ==========================================
// HAIRGATOR GPT Image 1 헤어스타일 체험 시스템
// js/gpt-hair-experience.js - 완전한 버전
// ==========================================

console.log('🎨 GPT Image 1 헤어스타일 체험 시스템 로드 시작');

// GPT 시스템 전역 객체
window.HAIRGATOR_GPT = {
    isProcessing: false,
    currentStyle: null,
    userPhoto: null,
    apiEndpoint: '/.netlify/functions/openai-proxy'
};

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

// ========== GPT 모달 HTML 생성 ==========
function createGPTModalHTML(style) {
    return `
    <!-- GPT 헤어스타일 체험 모달 -->
    <div class="gpt-hair-style-modal" id="gptHairStyleModal">
        <div class="gpt-modal-container">
            <!-- 모달 헤더 -->
            <div class="gpt-modal-header">
                <h2>
                    <span class="header-icon">🎨</span>
                    GPT Image 1 헤어체험
                    <span class="gpt-badge">NEW</span>
                </h2>
                <button class="close-btn" onclick="closeGPTHairStyleModal()">×</button>
            </div>
            
            <!-- 모달 콘텐츠 -->
            <div class="gpt-modal-content">
                <!-- 선택된 스타일 정보 -->
                <div class="selected-style-info">
                    <h4>🎯 선택된 헤어스타일</h4>
                    <div class="style-preview">
                        <img src="${style.imageUrl}" alt="${style.name}" class="style-reference-image">
                        <div class="style-details">
                            <h3>${style.name}</h3>
                            <p class="style-code">${style.code}</p>
                            <p class="style-category">${style.mainCategory} > ${style.subCategory}</p>
                        </div>
                    </div>
                    <p class="style-description">
                        이 스타일을 AI가 분석하여 당신의 얼굴에 적용해드립니다.
                    </p>
                </div>
                
                <!-- 체험 방법 선택 -->
                <div class="experience-method-selection">
                    <h4>📸 체험 방법 선택</h4>
                    <div class="method-options">
                        <div class="method-option active" data-method="upload">
                            <div class="method-icon">📁</div>
                            <div class="method-title">사진 업로드</div>
                            <div class="method-description">갤러리에서 사진 선택</div>
                        </div>
                        <div class="method-option" data-method="camera">
                            <div class="method-icon">📷</div>
                            <div class="method-title">카메라 촬영</div>
                            <div class="method-description">실시간 촬영 (준비중)</div>
                        </div>
                    </div>
                </div>
                
                <!-- 사진 업로드 영역 -->
                <div class="photo-upload-section" id="photoUploadSection">
                    <h4>📷 사진 선택</h4>
                    <div class="upload-area" id="uploadArea">
                        <input type="file" id="userPhotoInput" accept="image/*" style="display: none;">
                        <div class="upload-placeholder">
                            <div class="upload-icon">📁</div>
                            <p>사진을 선택하거나 여기에 드래그하세요</p>
                            <button type="button" class="upload-btn" onclick="document.getElementById('userPhotoInput').click()">
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
                
                <!-- 옵션 설정 -->
                <div class="gpt-options-section">
                    <h4>⚙️ 고급 옵션</h4>
                    <div class="option-toggles">
                        <label class="option-toggle">
                            <input type="checkbox" id="colorMatchOption" checked>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">피부톤 맞춤 컬러</span>
                        </label>
                        <label class="option-toggle">
                            <input type="checkbox" id="enhanceQualityOption">
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">고품질 렌더링</span>
                        </label>
                    </div>
                </div>
                
                <!-- 처리 상태 -->
                <div class="processing-status" id="processingStatus" style="display: none;">
                    <div class="processing-animation">
                        <div class="processing-spinner"></div>
                        <p id="processingText">AI가 헤어스타일을 적용하고 있습니다...</p>
                    </div>
                </div>
                
                <!-- 결과 표시 -->
                <div class="result-section" id="resultSection" style="display: none;">
                    <h4>✨ 변환 결과</h4>
                    <div class="result-comparison">
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
                    <div class="result-actions">
                        <button type="button" class="result-btn secondary" onclick="downloadResult()">
                            💾 다운로드
                        </button>
                        <button type="button" class="result-btn primary" onclick="shareResult()">
                            📤 공유하기
                        </button>
                    </div>
                </div>
                
                <!-- 액션 버튼들 -->
                <div class="gpt-modal-actions">
                    <button type="button" class="gpt-action-btn secondary" onclick="closeGPTHairStyleModal()">
                        취소
                    </button>
                    <button type="button" class="gpt-action-btn primary" id="startProcessBtn" onclick="startGPTProcessing()" disabled>
                        🎨 AI 체험 시작
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

// ========== 모달 이벤트 설정 ==========
function setupGPTModalEvents() {
    const userPhotoInput = document.getElementById('userPhotoInput');
    const uploadArea = document.getElementById('uploadArea');
    const methodOptions = document.querySelectorAll('.method-option');
    
    // 파일 선택 이벤트
    if (userPhotoInput) {
        userPhotoInput.addEventListener('change', handlePhotoSelect);
    }
    
    // 드래그 앤 드롭
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);
    }
    
    // 체험 방법 선택
    methodOptions.forEach(option => {
        option.addEventListener('click', () => selectMethod(option.dataset.method));
    });
}

// ========== 파일 처리 함수들 ==========
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        displayPhotoPreview(file);
        enableStartButton();
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
    }
}

// ========== GPT 처리 시작 ==========
async function startGPTProcessing() {
    if (!window.HAIRGATOR_GPT.userPhoto || !window.HAIRGATOR_GPT.currentStyle) {
        showToast('사진과 스타일을 선택해주세요', 'error');
        return;
    }
    
    const startBtn = document.getElementById('startProcessBtn');
    const processingStatus = document.getElementById('processingStatus');
    
    // UI 상태 변경
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '처리 중...';
    }
    
    if (processingStatus) {
        processingStatus.style.display = 'block';
    }
    
    window.HAIRGATOR_GPT.isProcessing = true;
    
    try {
        // 옵션 수집
        const options = {
            colorMatch: document.getElementById('colorMatchOption')?.checked || false,
            enhanceQuality: document.getElementById('enhanceQualityOption')?.checked || false
        };
        
        // GPT 처리 실행
        const result = await processGPTHairStyleChange(
            window.HAIRGATOR_GPT.userPhoto,
            window.HAIRGATOR_GPT.currentStyle.imageUrl,
            window.HAIRGATOR_GPT.currentStyle.name,
            options
        );
        
        if (result.success) {
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
        
    } finally {
        window.HAIRGATOR_GPT.isProcessing = false;
        
        // 버튼 상태 복원
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🎨 AI 체험 시작';
        }
    }
}

// ========== 결과 표시 ==========
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

// ========== 유틸리티 함수들 ==========
function selectMethod(method) {
    const options = document.querySelectorAll('.method-option');
    options.forEach(opt => opt.classList.remove('active'));
    
    const selectedOption = document.querySelector(`[data-method="${method}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // 카메라 모드는 아직 구현되지 않음
    if (method === 'camera') {
        showToast('카메라 모드는 준비 중입니다', 'info');
    }
}

function downloadResult() {
    if (!window.HAIRGATOR_GPT.lastResult) {
        showToast('다운로드할 결과가 없습니다', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = window.HAIRGATOR_GPT.lastResult.styledImage;
    link.download = `hairgator_gpt_${Date.now()}.png`;
    link.click();
    
    showToast('이미지가 다운로드되었습니다', 'success');
}

function shareResult() {
    if (!window.HAIRGATOR_GPT.lastResult) {
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
        // 폴백: 클립보드에 복사
        navigator.clipboard.writeText(window.HAIRGATOR_GPT.lastResult.styledImage)
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

// ========== 파일 변환 유틸리티 ==========
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * GPT 헤어스타일 변경 처리 - GPT Image 1 전용 최적화
 */
async function processGPTHairStyleChange(userPhoto, styleImageUrl, styleName, options = {}) {
    console.log('🎨 GPT Image 1 헤어스타일 변경 시작 (얼굴 보존 모드)...');
    
    try {
        let userPhotoBase64;
        
        // 사용자 사진 처리 (파일 vs 샘플)
        if (userPhoto.type === 'sample') {
            // 샘플 모델인 경우
            userPhotoBase64 = userPhoto.url;
        } else {
            // 업로드된 파일인 경우
            userPhotoBase64 = await fileToBase64(userPhoto);
        }
        
        // GPT Image 1 Edit 모드 우선 시도
        console.log('🔗 GPT Image 1 Edit 모드 시도...');
        
        const editPrompt = buildGPTImage1EditPrompt(styleName, options);
        
        const editResponse = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'edit',
                image: userPhotoBase64,
                mask: await generateHairMask(),
                prompt: editPrompt,
                input_fidelity: 'high',  // 얼굴 보존 핵심 설정
                quality: options.enhanceQuality ? 'high' : 'medium',
                size: '1024x1024',
                n: 1
            })
        });
        
        console.log('📡 Edit 응답 상태:', editResponse.status);
        
        if (editResponse.ok) {
            const editResult = await editResponse.json();
            
            if (editResult.data && editResult.data[0]) {
                return {
                    success: true,
                    originalImage: userPhotoBase64,
                    styledImage: editResult.data[0].url,
                    styleName: styleName,
                    method: 'gpt-image-1-edit',
                    options: options
                };
            }
        }
        
        // Edit 모드 실패시 Generate 모드로 폴백
        console.log('⚠️ Edit 모드 실패, GPT Image 1 Generate 모드로 폴백...');
        
        const generatePrompt = buildGPTImage1GeneratePrompt(styleName, options);
        
        const generateResponse = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'generate',
                prompt: generatePrompt,
                quality: options.enhanceQuality ? 'high' : 'medium',
                size: '1024x1024',
                n: 1
            })
        });
        
        if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            throw new Error(`HTTP ${generateResponse.status}: ${errorText}`);
        }
        
        const generateResult = await generateResponse.json();
        
        if (generateResult.error) {
            throw new Error(generateResult.error.message || generateResult.error);
        }
        
        if (generateResult.data && generateResult.data[0]) {
            return {
                success: true,
                originalImage: userPhotoBase64,
                styledImage: generateResult.data[0].url,
                styleName: styleName,
                method: 'gpt-image-1-generate',
                options: options
            };
        } else {
            throw new Error('GPT Image 1 API에서 유효한 결과를 받지 못했습니다');
        }
        
    } catch (error) {
        console.error('GPT Image 1 헤어스타일 변경 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * GPT Image 1 Edit 모드용 프롬프트 (얼굴 보존 특화)
 */
function buildGPTImage1EditPrompt(styleName, options = {}) {
    let prompt = `Transform the hairstyle to "${styleName}" while preserving the person's face completely.
CRITICAL: Keep all facial features identical - eyes, nose, mouth, face shape, skin tone, glasses, expression.
Only change the hair style and color, everything else must remain exactly the same.`;
    
    if (options.colorMatch) {
        prompt += ' Choose hair color that complements the person\'s natural skin tone.';
    }
    
    prompt += ' Professional salon quality, realistic lighting, natural hair texture.';
    
    return prompt;
}

/**
 * GPT Image 1 Generate 모드용 고급 프롬프트
 */
function buildGPTImage1GeneratePrompt(styleName, options = {}) {
    let prompt = `Professional portrait photo of a person with "${styleName}" hairstyle.
High-quality salon photography with natural lighting.
Focus on realistic hair texture and professional styling.`;
    
    if (options.colorMatch) {
        prompt += ' Hair color that naturally complements skin tone.';
    }
    
    if (options.enhanceQuality) {
        prompt += ' Studio lighting, professional photography, crisp details, high resolution.';
    }
    
    prompt += ' Style: photorealistic, professional, clean, natural.';
    prompt += ' Avoid: artificial effects, cartoon-like features, distorted proportions.';
    
    return prompt;
}

/**
 * 헤어 영역 마스크 생성 (GPT Image 1 최적화)
 */
async function generateHairMask() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1024;
    canvas.height = 1024;
    
    // 투명한 배경
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 헤어 영역을 흰색으로 마스킹 (상단 35%)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.35);
    
    // 측면 헤어 영역 추가
    ctx.fillRect(0, canvas.height * 0.2, canvas.width * 0.25, canvas.height * 0.3);
    ctx.fillRect(canvas.width * 0.75, canvas.height * 0.2, canvas.width * 0.25, canvas.height * 0.3);
    
    // 부드러운 경계를 위한 그라데이션
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height * 0.45);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.15);
    
    return canvas.toDataURL('image/png');
}

// ========== 전역 함수 등록 ==========
window.openGPTHairStyleModal = openGPTHairStyleModal;
window.closeGPTHairStyleModal = closeGPTHairStyleModal;
window.startGPTProcessing = startGPTProcessing;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ GPT Image 1 헤어스타일 체험 시스템 로드 완료');
    
    // 전역 함수 확인
    if (typeof window.openGPTHairStyleModal === 'function') {
        console.log('✅ window.openGPTHairStyleModal 함수 등록 완료');
    } else {
        console.error('❌ window.openGPTHairStyleModal 함수 등록 실패');
    }
});
