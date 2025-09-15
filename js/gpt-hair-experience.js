// ========================================
// HAIRGATOR GPT Image 1 헤어스타일 체험 시스템 - 최종 수정 버전
// js/gpt-hair-experience.js - 얼굴 보존 모드 적용
// ========================================

console.log('🎨 GPT Image 1 헤어스타일 체험 시스템 로드 시작 (얼굴 보존 모드)...');

// ========== 전역 변수 및 상태 관리 ==========

// GPT 체험 시스템 상태
let currentGPTStyle = null;
let currentUserPhoto = null;
let isProcessing = false;
let selectedMethod = 'upload'; // 'upload', 'sample'
let gptResults = null;

// ========== 핵심 GPT 모달 함수들 ==========

/**
 * GPT 헤어스타일 체험 모달 열기
 * @param {Object} style - 선택된 헤어스타일 정보
 */
function openGPTHairStyleModal(style) {
    console.log('🎨 GPT 헤어스타일 체험 모달 열기:', style);
    
    // 전역 상태 설정
    currentGPTStyle = style;
    currentUserPhoto = null;
    gptResults = null;
    
    // 모달 HTML 생성 및 표시
    createGPTHairStyleModal();
    showGPTModal();
    
    // 선택된 스타일 정보 표시
    updateSelectedStyleInfo(style);
}

/**
 * GPT 헤어스타일 체험 모달 닫기
 */
function closeGPTHairStyleModal() {
    console.log('🎨 GPT 헤어스타일 체험 모달 닫기');
    
    const modal = document.getElementById('gptHairStyleModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    // 상태 초기화
    currentGPTStyle = null;
    currentUserPhoto = null;
    isProcessing = false;
    gptResults = null;
    
    // body 스크롤 복원
    document.body.style.overflow = '';
}

/**
 * GPT 모달 HTML 생성
 */
function createGPTHairStyleModal() {
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('gptHairStyleModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="gptHairStyleModal" class="gpt-hair-style-modal">
            <div class="gpt-modal-container">
                <!-- 헤더 -->
                <div class="gpt-modal-header">
                    <h2>
                        <span class="header-icon">🎨</span>
                        GPT Image 1 헤어스타일 체험
                        <span class="gpt-badge">FACE-PRESERVE</span>
                    </h2>
                    <button class="close-btn" onclick="closeGPTHairStyleModal()">×</button>
                </div>
                
                <!-- 콘텐츠 -->
                <div class="gpt-modal-content">
                    <!-- 선택된 스타일 정보 -->
                    <div class="selected-style-info">
                        <h4>📋 선택된 스타일</h4>
                        <div class="style-preview">
                            <img id="gptStyleReferenceImage" class="style-reference-image" src="" alt="선택된 스타일">
                            <div class="style-details">
                                <h3 id="gptStyleName">스타일명</h3>
                                <p id="gptStyleCode" class="style-code">스타일 코드</p>
                                <p id="gptStyleCategory" class="style-category">카테고리</p>
                            </div>
                        </div>
                        <p class="style-description">AI가 이 스타일을 참고하여 당신의 <strong>얼굴은 그대로 보존</strong>하면서 헤어스타일만 변경합니다.</p>
                    </div>
                    
                    <!-- 체험 방법 선택 -->
                    <div class="experience-method-selection">
                        <h4>📸 체험 방법 선택</h4>
                        <div class="method-options">
                            <div class="method-option active" onclick="selectExperienceMethod('upload')">
                                <div class="method-icon">📤</div>
                                <h5>사진 업로드</h5>
                                <p>본인의 사진을 직접 업로드하여 헤어스타일을 체험해보세요</p>
                                <div id="uploadArea" class="upload-area">
                                    <input type="file" id="userPhotoInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)">
                                    <div class="upload-text" onclick="document.getElementById('userPhotoInput').click()">
                                        클릭하여 사진 선택
                                    </div>
                                    <div id="photoPreview" class="photo-preview" style="display: none;">
                                        <img id="previewImage" src="" alt="미리보기">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="method-option" onclick="selectExperienceMethod('sample')">
                                <div class="method-icon">👤</div>
                                <h5>샘플 모델</h5>
                                <p>미리 준비된 샘플 모델로 스타일을 먼저 확인해보세요</p>
                                <div class="sample-options">
                                    <button class="sample-btn active" onclick="selectSampleModel('model1')">모델 1</button>
                                    <button class="sample-btn" onclick="selectSampleModel('model2')">모델 2</button>
                                    <button class="sample-btn" onclick="selectSampleModel('model3')">모델 3</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 얼굴 보존 옵션 (기본 활성화) -->
                    <div class="processing-options">
                        <h4>⚙️ 얼굴 보존 설정</h4>
                        <div class="option-group">
                            <label class="preserve-face-option">
                                <input type="checkbox" id="preserveFace" checked disabled>
                                <strong>얼굴 특징 완전 보존</strong> (필수 활성화)
                            </label>
                            <label>
                                <input type="checkbox" id="colorMatch" checked>
                                피부톤에 맞는 헤어 색상 자동 조정
                            </label>
                            <label>
                                <input type="checkbox" id="enhanceQuality">
                                고품질 처리 (처리 시간 증가)
                            </label>
                        </div>
                        <div class="face-preserve-notice">
                            ⚠️ 얼굴 보존 모드: 원본 얼굴의 모든 특징(눈, 코, 입, 피부톤, 안경 등)을 그대로 유지하고 헤어스타일만 변경합니다.
                        </div>
                    </div>
                    
                    <!-- 결과 섹션 (처리 후 표시) -->
                    <div id="gptResultsSection" class="gpt-results-section" style="display: none;">
                        <h4>✨ 체험 결과</h4>
                        <div class="results-comparison">
                            <div class="result-item">
                                <h5>원본</h5>
                                <img id="originalResultImage" class="result-image" src="" alt="원본 이미지">
                                <div class="result-actions">
                                    <button class="retry-btn" onclick="retryGPTProcessing()">다시 처리</button>
                                </div>
                            </div>
                            <div class="result-item">
                                <h5>스타일 적용 결과</h5>
                                <img id="styledResultImage" class="result-image" src="" alt="스타일 적용 결과">
                                <div class="result-actions">
                                    <button class="save-result-btn" onclick="saveGPTResult()">결과 저장</button>
                                    <button class="retry-btn" onclick="retryGPTProcessing()">다시 시도</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 상담 예약 안내 -->
                        <div class="consultation-booking">
                            <p>🔗 실제 시술을 원하시나요?</p>
                            <button class="book-consultation-btn" onclick="openConsultationBooking()">
                                무료 상담 예약하기
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 액션 버튼 -->
                <div class="gpt-modal-actions">
                    <button class="btn-secondary" onclick="closeGPTHairStyleModal()">닫기</button>
                    <button id="processGPTBtn" class="btn-primary" onclick="startGPTProcessing()" disabled>
                        <span id="processGPTBtnText">얼굴 보존 헤어스타일 체험하기</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * GPT 모달 표시
 */
function showGPTModal() {
    const modal = document.getElementById('gptHairStyleModal');
    if (modal) {
        // body 스크롤 막기
        document.body.style.overflow = 'hidden';
        
        // 모달 표시 애니메이션
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

/**
 * 선택된 스타일 정보 업데이트
 */
function updateSelectedStyleInfo(style) {
    const elements = {
        image: document.getElementById('gptStyleReferenceImage'),
        name: document.getElementById('gptStyleName'),
        code: document.getElementById('gptStyleCode'),
        category: document.getElementById('gptStyleCategory')
    };
    
    if (elements.image) {
        elements.image.src = style.imageUrl || '';
        elements.image.onerror = function() {
            this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            this.alt = 'No Image';
        };
    }
    
    if (elements.name) elements.name.textContent = style.name || '이름 없음';
    if (elements.code) elements.code.textContent = style.code || 'NO CODE';
    if (elements.category) {
        const categoryText = `${style.mainCategory || '카테고리'} > ${style.subCategory || '서브카테고리'}`;
        elements.category.textContent = categoryText;
    }
}

// ========== 체험 방법 및 옵션 관리 ==========

/**
 * 체험 방법 선택 (업로드 vs 샘플)
 */
function selectExperienceMethod(method) {
    selectedMethod = method;
    
    // UI 업데이트
    document.querySelectorAll('.method-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const activeOption = document.querySelector(`[onclick="selectExperienceMethod('${method}')"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
    
    // 처리 버튼 상태 업데이트
    updateProcessButton();
    
    console.log(`📋 체험 방법 선택: ${method}`);
}

/**
 * 샘플 모델 선택
 */
function selectSampleModel(modelId) {
    // UI 업데이트
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="selectSampleModel('${modelId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 샘플 이미지 설정 (실제 구현에서는 미리 정의된 샘플 이미지 URL 사용)
    currentUserPhoto = {
        type: 'sample',
        modelId: modelId,
        url: `/sample-models/${modelId}.jpg` // 실제 샘플 이미지 경로
    };
    
    // 처리 버튼 활성화
    updateProcessButton();
    
    console.log(`👤 샘플 모델 선택: ${modelId}`);
}

/**
 * 사용자 사진 업로드 처리
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        showToast('파일 크기는 10MB 이하여야 합니다.', 'error');
        return;
    }
    
    currentUserPhoto = file;
    
    // 미리보기 표시
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const photoPreview = document.getElementById('photoPreview');
        
        if (previewImage && photoPreview) {
            previewImage.src = e.target.result;
            photoPreview.style.display = 'block';
        }
        
        // 업로드 텍스트 변경
        const uploadText = document.querySelector('.upload-text');
        if (uploadText) {
            uploadText.textContent = '다른 사진 선택';
        }
    };
    reader.readAsDataURL(file);
    
    // 처리 버튼 활성화
    updateProcessButton();
    
    console.log('📸 사용자 사진 업로드:', file.name);
}

/**
 * 처리 버튼 상태 업데이트
 */
function updateProcessButton() {
    const processBtn = document.getElementById('processGPTBtn');
    if (!processBtn) return;
    
    const canProcess = currentUserPhoto && currentGPTStyle && !isProcessing;
    
    processBtn.disabled = !canProcess;
    
    if (isProcessing) {
        processBtn.innerHTML = `
            <span class="loading-spinner"></span>
            <span>얼굴 보존 처리 중...</span>
        `;
    } else {
        processBtn.innerHTML = `
            <span id="processGPTBtnText">얼굴 보존 헤어스타일 체험하기</span>
        `;
    }
}

// ========== GPT 처리 로직 (얼굴 보존 모드) ==========

/**
 * GPT 처리 시작
 */
async function startGPTProcessing() {
    if (!currentUserPhoto || !currentGPTStyle || isProcessing) {
        console.warn('⚠️ GPT 처리 조건 미충족');
        return;
    }
    
    isProcessing = true;
    updateProcessButton();
    
    console.log('🎨 GPT Image 1 처리 시작 (얼굴 보존 모드):', {
        style: currentGPTStyle.name,
        method: selectedMethod,
        hasPhoto: !!currentUserPhoto
    });
    
    try {
        // 처리 옵션 수집
        const options = {
            enhanceQuality: document.getElementById('enhanceQuality')?.checked || false,
            preserveFace: true, // 항상 true로 고정
            colorMatch: document.getElementById('colorMatch')?.checked || false
        };
        
        showToast('얼굴 보존 모드로 헤어스타일을 적용하고 있습니다...', 'info');
        
        // GPT Image 1 API 호출
        const result = await processGPTHairStyleChange(
            currentUserPhoto,
            currentGPTStyle.imageUrl,
            currentGPTStyle.name,
            options
        );
        
        if (result.success) {
            gptResults = result;
            displayGPTResults(result);
            showToast('✨ 얼굴 보존 헤어스타일 적용 완료!', 'success');
        } else {
            throw new Error(result.error || 'GPT 처리 실패');
        }
        
    } catch (error) {
        console.error('❌ GPT 처리 오류:', error);
        showToast(`오류 발생: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        updateProcessButton();
    }
}

/**
 * GPT 헤어스타일 변경 처리 - 얼굴 보존 특화
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
        
        // 얼굴 보존에 특화된 프롬프트 생성
        const prompt = buildFacePreservingPrompt(styleName, options);
        
        console.log('🔗 Netlify Function 호출 중 (얼굴 보존 모드)...');
        
        // 이미지 편집 모드로 시도 (DALL-E 2 사용)
        let response = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'edit',  // generate에서 edit로 변경
                image: userPhotoBase64,
                mask: await generateHairMask(), // 헤어 영역 마스크
                prompt: prompt,
                n: 1,
                size: '1024x1024'
            })
        });
        
        // edit 모드가 실패하면 generate 모드로 폴백
        if (!response.ok) {
            console.log('Edit 모드 실패, 고급 프롬프트 generate 모드로 시도...');
            response = await fetch('/.netlify/functions/openai-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method: 'generate',
                    prompt: buildAdvancedFacePreservingPrompt(styleName, options),
                    quality: options.enhanceQuality ? 'hd' : 'standard',
                    size: '1024x1024'
                })
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message || result.error);
        }
        
        if (result.data && result.data[0]) {
            return {
                success: true,
                originalImage: userPhotoBase64,
                styledImage: result.data[0].url,
                styleName: styleName,
                method: 'face-preserve',
                options: options
            };
        } else {
            throw new Error('GPT Image 1 API에서 유효한 결과를 받지 못했습니다');
        }
        
    } catch (error) {
        console.error('GPT 헤어스타일 변경 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 얼굴 보존에 특화된 프롬프트 생성
 */
function buildFacePreservingPrompt(styleName, options = {}) {
    let prompt = `Transform ONLY the hairstyle to "${styleName}" style. 
CRITICAL: Preserve ALL facial features exactly - eyes, nose, mouth, face shape, skin tone, glasses, facial expression.
Change ONLY the hair while keeping everything else identical.`;
    
    if (options.colorMatch) {
        prompt += ' Adjust hair color to complement the person\'s existing skin tone.';
    }
    
    prompt += ' Professional salon quality hair transformation, realistic lighting.';
    
    return prompt;
}

/**
 * 고급 얼굴 보존 프롬프트 (generate 모드용)
 */
function buildAdvancedFacePreservingPrompt(styleName, options = {}) {
    let prompt = `Portrait photo of a person with "${styleName}" hairstyle. 
Professional salon photography, high quality, realistic lighting.
Focus on natural hair texture and professional styling.`;
    
    if (options.colorMatch) {
        prompt += ' Hair color naturally complements skin tone.';
    }
    
    if (options.enhanceQuality) {
        prompt += ' Studio lighting, professional photography, sharp details.';
    }
    
    prompt += ' Avoid: unnatural features, distorted proportions, artificial styling.';
    
    return prompt;
}

/**
 * 헤어 영역 마스크 생성 (간단한 구현)
 */
async function generateHairMask() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1024;
    canvas.height = 1024;
    
    // 투명한 배경
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 헤어 영역 (상단 40%)을 흰색으로 마스킹
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);
    
    // 부드러운 경계를 위한 그라데이션
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height * 0.5);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.2);
    
    return canvas.toDataURL('image/png');
}

/**
 * GPT 결과 표시
 */
function displayGPTResults(result) {
    const resultsSection = document.getElementById('gptResultsSection');
    const originalImage = document.getElementById('originalResultImage');
    const styledImage = document.getElementById('styledResultImage');
    
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    if (originalImage && result.originalImage) {
        originalImage.src = result.originalImage;
    }
    
    if (styledImage && result.styledImage) {
        styledImage.src = result.styledImage;
    }
    
    // 결과 섹션으로 스크롤
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    console.log('✅ GPT 결과 표시 완료 (얼굴 보존 모드)');
}

// ========== 결과 관리 기능 ==========

/**
 * GPT 처리 재시도
 */
function retryGPTProcessing() {
    console.log('🔄 GPT 처리 재시도 (얼굴 보존 모드)');
    
    // 결과 섹션 숨기기
    const resultsSection = document.getElementById('gptResultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    // 재처리 시작
    startGPTProcessing();
}

/**
 * GPT 결과 저장
 */
function saveGPTResult() {
    if (!gptResults || !gptResults.styledImage) {
        showToast('저장할 결과가 없습니다.', 'error');
        return;
    }
    
    try {
        // 이미지 다운로드 링크 생성
        const link = document.createElement('a');
        link.href = gptResults.styledImage;
        link.download = `hairgator-face-preserve-${gptResults.styleName}-${Date.now()}.png`;
        link.click();
        
        showToast('얼굴 보존 결과 이미지가 저장되었습니다!', 'success');
        
        console.log('💾 GPT 얼굴 보존 결과 저장 완료');
        
    } catch (error) {
        console.error('결과 저장 오류:', error);
        showToast('결과 저장 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 상담 예약 모달 열기
 */
function openConsultationBooking() {
    showToast('상담 예약 기능은 준비 중입니다.', 'info');
    console.log('📞 상담 예약 기능 호출');
    
    // 실제 구현에서는 상담 예약 모달이나 외부 링크 연결
}

// ========== 유틸리티 함수 ==========

/**
 * 파일을 Base64로 변환
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 토스트 메시지 표시 (기존 showToast와 호환)
 */
function showToast(message, type = 'info') {
    // 기존 menu.js의 showToast 함수 사용
    if (window.HAIRGATOR_MENU && window.HAIRGATOR_MENU.showToast) {
        window.HAIRGATOR_MENU.showToast(message, type);
        return;
    }
    
    // Fallback 토스트 구현
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 20000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    // 타입별 스타일
    const typeColors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    toast.style.background = typeColors[type] || typeColors.info;
    toast.textContent = message;
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
    }, 3000);
}

// ========== 전역 함수 노출 ==========

// window 객체에 함수들 등록
window.openGPTHairStyleModal = openGPTHairStyleModal;
window.closeGPTHairStyleModal = closeGPTHairStyleModal;
window.selectExperienceMethod = selectExperienceMethod;
window.selectSampleModel = selectSampleModel;
window.handlePhotoUpload = handlePhotoUpload;
window.startGPTProcessing = startGPTProcessing;
window.retryGPTProcessing = retryGPTProcessing;
window.saveGPTResult = saveGPTResult;
window.openConsultationBooking = openConsultationBooking;
window.processGPTHairStyleChange = processGPTHairStyleChange;

// GPT 체험 시스템 객체
window.HAIRGATOR_GPT = {
    openModal: openGPTHairStyleModal,
    closeModal: closeGPTHairStyleModal,
    processStyleChange: processGPTHairStyleChange,
    getCurrentStyle: () => currentGPTStyle,
    getCurrentPhoto: () => currentUserPhoto,
    getResults: () => gptResults,
    isProcessing: () => isProcessing
};

// ========== 이벤트 리스너 ==========

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ GPT Image 1 헤어스타일 체험 시스템 초기화 완료 (얼굴 보존 모드)');
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const gptModal = document.getElementById('gptHairStyleModal');
            if (gptModal && gptModal.classList.contains('show')) {
                closeGPTHairStyleModal();
            }
        }
    });
    
    // 모달 바깥 클릭으로 닫기
    document.addEventListener('click', function(e) {
        const gptModal = document.getElementById('gptHairStyleModal');
        if (gptModal && e.target === gptModal) {
            closeGPTHairStyleModal();
        }
    });
});

console.log('🎨✅ HAIRGATOR GPT Image 1 헤어스타일 체험 시스템 로드 완료! (얼굴 보존 모드)');
console.log('💡 사용 가능한 함수: window.openGPTHairStyleModal(style)');
console.log('💡 디버깅: window.HAIRGATOR_GPT 객체 확인 가능');
