// ========================================
// HAIRGATOR 스타일 모달 GPT Image 1 교체
// js/menu.js에서 addAIButtonToModal 함수 교체
// ========================================

// 기존 AKOOL 버튼을 GPT Image 1 버튼으로 교체
function addAIButtonToModal(style) {
    const modalActions = document.querySelector('.style-modal-actions');
    if (!modalActions) return;
    
    // 기존 AI 버튼이 있으면 제거
    const existingAIBtn = modalActions.querySelector('.ai-experience-modal-btn');
    if (existingAIBtn) {
        existingAIBtn.remove();
    }
    
    // 새 GPT Image 1 AI 버튼 생성
    const gptAiButton = document.createElement('button');
    gptAiButton.className = 'modal-action-btn gpt-ai-experience-modal-btn';
    gptAiButton.innerHTML = `
        <span class="ai-icon">🎨</span>
        <span>GPT AI 체험하기</span>
        <span class="new-badge">NEW</span>
    `;
    
    gptAiButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎨 GPT Image 1 AI 체험하기 시작:', {
            id: style.id,
            name: style.name,
            imageUrl: style.imageUrl
        });
        
        // GPT Image 1 헤어스타일 체험 모달 열기
        openGPTHairStyleModal(style);
    };
    
    // 기존 버튼들 앞에 추가
    modalActions.insertBefore(gptAiButton, modalActions.firstChild);
    
    console.log('✅ GPT Image 1 AI 버튼 추가됨:', style.name);
}

// ========================================
// GPT Image 1 헤어스타일 체험 모달
// ========================================

function openGPTHairStyleModal(style) {
    // 기존 스타일 모달 닫기
    const currentModal = document.getElementById('styleModal');
    if (currentModal) {
        currentModal.classList.remove('active');
    }
    
    // GPT 체험 모달 생성
    const gptModal = document.createElement('div');
    gptModal.className = 'gpt-hair-style-modal';
    gptModal.innerHTML = `
        <div class="modal-overlay" onclick="closeGPTHairStyleModal()"></div>
        <div class="gpt-modal-container">
            <div class="gpt-modal-header">
                <h2>
                    <span class="header-icon">🎨</span>
                    GPT AI 헤어스타일 체험
                    <span class="gpt-badge">Image 1</span>
                </h2>
                <button class="close-btn" onclick="closeGPTHairStyleModal()">&times;</button>
            </div>

            <div class="gpt-modal-content">
                <!-- 선택된 스타일 정보 -->
                <div class="selected-style-info">
                    <div class="style-preview">
                        <img src="${style.imageUrl}" alt="${style.name}" class="style-reference-image">
                        <div class="style-details">
                            <h3>${style.name}</h3>
                            <p class="style-code">${style.code}</p>
                            <p class="style-category">${style.mainCategory} > ${style.subCategory || ''}</p>
                        </div>
                    </div>
                    <div class="style-description">
                        <p>이 헤어스타일을 당신의 얼굴에 적용해보세요!</p>
                    </div>
                </div>

                <!-- 체험 방법 선택 -->
                <div class="experience-method-selection">
                    <h4>📷 체험 방법 선택</h4>
                    <div class="method-options">
                        <div class="method-option active" data-method="upload">
                            <div class="method-icon">📁</div>
                            <h5>내 사진 업로드</h5>
                            <p>본인 사진에 이 헤어스타일을 적용합니다</p>
                            <div class="upload-area" onclick="document.getElementById('gptUserPhoto').click()">
                                <span class="upload-text">사진 선택</span>
                                <input type="file" id="gptUserPhoto" accept="image/*" hidden onchange="handleGPTPhotoUpload(event)">
                            </div>
                            <div class="photo-preview" id="gptPhotoPreview" style="display: none;"></div>
                        </div>
                        
                        <div class="method-option" data-method="generate">
                            <div class="method-icon">✨</div>
                            <h5>AI 샘플 생성</h5>
                            <p>가상 모델에 이 헤어스타일을 적용합니다</p>
                            <div class="sample-options">
                                <button class="sample-btn" onclick="generateGPTSample('${style.gender}', 'young')">
                                    젊은 ${style.gender === 'male' ? '남성' : '여성'}
                                </button>
                                <button class="sample-btn" onclick="generateGPTSample('${style.gender}', 'mature')">
                                    성숙한 ${style.gender === 'male' ? '남성' : '여성'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 처리 옵션 -->
                <div class="processing-options">
                    <h4>⚙️ 생성 옵션</h4>
                    <div class="option-group">
                        <label>
                            <input type="checkbox" id="maintainFaceFeatures" checked>
                            얼굴 특징 유지 (권장)
                        </label>
                        <label>
                            <input type="checkbox" id="highQuality" checked>
                            고화질 생성 (1024x1024)
                        </label>
                        <label>
                            <input type="checkbox" id="naturalLighting">
                            자연스러운 조명 조정
                        </label>
                    </div>
                </div>
            </div>

            <div class="gpt-modal-actions">
                <button class="btn-secondary" onclick="closeGPTHairStyleModal()">
                    취소
                </button>
                <button class="btn-primary" id="startGPTExperience" onclick="startGPTHairStyleExperience('${style.id}', '${style.name}', '${style.imageUrl}')" disabled>
                    <span class="btn-icon">🎨</span>
                    AI 헤어스타일 체험 시작
                </button>
            </div>

            <!-- 결과 섹션 -->
            <div class="gpt-results-section" id="gptResultsSection" style="display: none;">
                <h4>🌟 GPT 헤어스타일 체험 결과</h4>
                <div class="results-comparison">
                    <div class="result-item">
                        <h5>원본</h5>
                        <img id="originalImage" class="result-image">
                    </div>
                    <div class="result-item">
                        <h5>${style.name} 적용</h5>
                        <img id="styledImage" class="result-image">
                        <div class="result-actions">
                            <button class="save-result-btn" onclick="saveGPTResult()">
                                💾 결과 저장
                            </button>
                            <button class="retry-btn" onclick="retryGPTExperience()">
                                🔄 다시 시도
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="consultation-booking">
                    <p>이 스타일이 마음에 드시나요?</p>
                    <button class="book-consultation-btn" onclick="bookConsultationWithStyle('${style.id}')">
                        📅 이 스타일로 상담 예약하기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(gptModal);
    
    // 모달 애니메이션
    setTimeout(() => gptModal.classList.add('show'), 10);
    
    // 전역 변수에 현재 스타일 저장
    window.currentGPTStyle = style;
    
    console.log('✅ GPT 헤어스타일 체험 모달 열림:', style.name);
}

// ========================================
// GPT Image 1 API 호출 함수들
// ========================================

async function startGPTHairStyleExperience(styleId, styleName, styleImageUrl) {
    const startBtn = document.getElementById('startGPTExperience');
    const originalText = startBtn.innerHTML;
    
    // 버튼 로딩 상태
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="loading-spinner"></span> AI 처리 중...';
    
    try {
        const method = document.querySelector('.method-option.active').dataset.method;
        let result;
        
        if (method === 'upload') {
            // 사용자 사진 + 헤어스타일 변경
            const userPhoto = document.getElementById('gptUserPhoto').files[0];
            if (!userPhoto) {
                throw new Error('사진을 먼저 업로드해주세요.');
            }
            
            result = await processGPTHairStyleChange(userPhoto, styleImageUrl, styleName);
        } else {
            // AI 샘플 생성
            const ageType = document.querySelector('.sample-btn.active')?.dataset.age || 'young';
            result = await generateGPTSampleWithStyle(styleId, styleName, styleImageUrl, ageType);
        }
        
        // 결과 표시
        showGPTResults(result);
        
    } catch (error) {
        console.error('GPT 헤어스타일 체험 실패:', error);
        showGPTError(error.message);
    } finally {
        // 버튼 원상복구
        startBtn.disabled = false;
        startBtn.innerHTML = originalText;
    }
}

async function processGPTHairStyleChange(userPhoto, styleImageUrl, styleName) {
    console.log('🎨 GPT Image 1 헤어스타일 변경 시작...');
    
    // 1. 사용자 사진을 Base64로 변환
    const userPhotoBase64 = await fileToBase64(userPhoto);
    
    // 2. GPT Image 1 API 호출용 프롬프트 생성
    const prompt = buildHairStyleChangePrompt(styleName, styleImageUrl);
    
    // 3. GPT Image 1 API 호출
    const apiKey = await getOpenAIApiKey(); // 환경변수에서 가져오기
    
    const formData = new FormData();
    formData.append('image', userPhoto);
    formData.append('prompt', prompt);
    formData.append('model', 'gpt-image-1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'url');
    
    const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: formData
    });
    
    const result = await response.json();
    
    if (result.data && result.data[0]) {
        return {
            success: true,
            originalImage: userPhotoBase64,
            styledImage: result.data[0].url,
            styleName: styleName,
            method: 'edit'
        };
    } else {
        throw new Error('GPT Image 1 API 오류: ' + (result.error?.message || '알 수 없는 오류'));
    }
}

async function generateGPTSampleWithStyle(styleId, styleName, styleImageUrl, ageType) {
    console.log('✨ GPT Image 1 샘플 생성 시작...');
    
    const prompt = buildSampleGenerationPrompt(styleName, ageType, window.currentGender);
    
    const apiKey = await getOpenAIApiKey();
    
    const requestBody = {
        model: 'gpt-image-1',
        prompt: prompt,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
        response_format: 'url',
        n: 1
    };
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (result.data && result.data[0]) {
        return {
            success: true,
            originalImage: null, // 샘플이므로 원본 없음
            styledImage: result.data[0].url,
            styleName: styleName,
            method: 'generate'
        };
    } else {
        throw new Error('GPT Image 1 API 오류: ' + (result.error?.message || '알 수 없는 오류'));
    }
}

// ========================================
// 프롬프트 생성 함수들
// ========================================

function buildHairStyleChangePrompt(styleName, styleImageUrl) {
    return [
        `Change the hairstyle in this photo to match the ${styleName} hairstyle.`,
        'Keep the person\'s facial features, skin tone, and expression exactly the same.',
        'Only modify the hair shape, length, and styling.',
        'Create a natural and realistic hairstyle result.',
        'Maintain professional salon-quality appearance.',
        'Ensure the new hairstyle suits the person\'s face shape.',
        'Keep the original photo quality and lighting.'
    ].join(' ');
}

function buildSampleGenerationPrompt(styleName, ageType, gender) {
    const ageDesc = ageType === 'young' ? 'young' : 'mature';
    const genderDesc = gender === 'male' ? 'Korean man' : 'Korean woman';
    
    return [
        `Professional portrait of a ${ageDesc} ${genderDesc}`,
        `with a perfect ${styleName} hairstyle.`,
        'High-quality salon hairstyle, modern Korean beauty standards.',
        'Studio lighting, clean background.',
        'Natural hair texture, healthy and shiny appearance.',
        'Front-facing portrait, clear facial features.',
        '4K quality, photorealistic.'
    ].join(' ');
}

// ========================================
// 유틸리티 함수들
// ========================================

function closeGPTHairStyleModal() {
    const modal = document.querySelector('.gpt-hair-style-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
    
    // 기존 스타일 모달 다시 열기 (선택사항)
    const styleModal = document.getElementById('styleModal');
    if (styleModal) {
        styleModal.classList.add('active');
    }
}

function handleGPTPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('gptPhotoPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="업로드된 사진">`;
        preview.style.display = 'block';
        
        // 시작 버튼 활성화
        document.getElementById('startGPTExperience').disabled = false;
    };
    reader.readAsDataURL(file);
}

function showGPTResults(result) {
    const resultsSection = document.getElementById('gptResultsSection');
    const originalImage = document.getElementById('originalImage');
    const styledImage = document.getElementById('styledImage');
    
    if (result.originalImage) {
        originalImage.src = result.originalImage;
        originalImage.style.display = 'block';
    } else {
        originalImage.parentElement.style.display = 'none'; // 샘플 생성 시 원본 숨김
    }
    
    styledImage.src = result.styledImage;
    resultsSection.style.display = 'block';
    
    // 결과 섹션으로 스크롤
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function showGPTError(errorMessage) {
    // HAIRGATOR 기존 토스트 시스템 활용
    if (window.showToast) {
        window.showToast(`GPT 체험 오류: ${errorMessage}`, 'error');
    } else {
        alert(`GPT 체험 오류: ${errorMessage}`);
    }
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function getOpenAIApiKey() {
    // 환경변수나 Firebase Functions에서 안전하게 가져오기
    // 실제 구현에서는 서버 사이드에서 처리하는 것이 보안상 안전
    return process.env.OPENAI_API_KEY || 'your-openai-api-key-here';
}

// ========================================
// AKOOL 시스템 비활성화
// ========================================

// 기존 AKOOL 관련 함수들 무력화
if (window.openAIPhotoModal) {
    const originalAkoolFunction = window.openAIPhotoModal;
    window.openAIPhotoModal = function(...args) {
        console.log('🚫 AKOOL 함수 호출 차단됨. GPT Image 1으로 리다이렉트.');
        // GPT 모달로 리다이렉트하거나 아무것도 하지 않음
        showGPTUpgradeMessage();
    };
}

function showGPTUpgradeMessage() {
    if (window.showToast) {
        window.showToast('🆕 새로운 GPT Image 1 AI 체험으로 업그레이드되었습니다!', 'info');
    }
}

console.log('✅ HAIRGATOR GPT Image 1 모달 교체 시스템 로드 완료');
console.log('🚫 AKOOL 시스템 비활성화됨');
console.log('🎨 GPT Image 1 헤어스타일 체험 준비 완료');
