// ========== HAIRGATOR 메뉴 시스템 최종 버전 (카테고리 설명 포함) ==========

// 글로벌 변수 (index.html에서 이미 선언된 것은 제외)
// let currentGender = null;  // 이미 index.html에 있음
// let currentMainTab = null; // 필요하면 추가
// let currentSubTab = null;  // 필요하면 추가

// 남성 카테고리 (설명 포함)
const MALE_CATEGORIES = [
    {
        id: 'side-fringe',
        name: 'SIDE FRINGE',
        description: '사이드 프린지는 옆으로 넘긴 앞머리 스타일로, 자연스럽고 부드러운 느낌을 줍니다.'
    },
    {
        id: 'side-part',
        name: 'SIDE PART',
        description: '사이드 파트는 정갈하고 단정한 스타일로 비즈니스맨들에게 인기가 많습니다.'
    },
    {
        id: 'fringe-up',
        name: 'FRINGE UP',
        description: '프린지 업은 앞머리를 올려 이마를 드러내는 시원한 스타일입니다.'
    },
    {
        id: 'pushed-back',
        name: 'PUSHED BACK',
        description: '푸시백은 머리를 뒤로 넘긴 댄디한 스타일입니다.'
    },
    {
        id: 'buzz',
        name: 'BUZZ',
        description: '버즈컷은 짧고 깔끔한 스타일로 관리가 편합니다.'
    },
    {
        id: 'crop',
        name: 'CROP',
        description: '크롭 스타일은 짧으면서도 스타일리시한 느낌을 줍니다.'
    },
    {
        id: 'mohican',
        name: 'MOHICAN',
        description: '모히칸 스타일은 개성 있고 강한 인상을 줍니다.'
    }
];

// 여성 카테고리 (설명 포함)
const FEMALE_CATEGORIES = [
    {
        id: 'a-length',
        name: 'A Length',
        description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'
    },
    {
        id: 'b-length',
        name: 'B Length',
        description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'
    },
    {
        id: 'c-length',
        name: 'C Length',
        description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬·에어리펌과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'
    },
    {
        id: 'd-length',
        name: 'D Length',
        description: 'D 길이는 어깨에 정확히 닿는 길이로, LOB·숄더 C컬·빌드펌이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'
    },
    {
        id: 'e-length',
        name: 'E Length',
        description: 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'
    },
    {
        id: 'f-length',
        name: 'F Length',
        description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스쳐 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'
    },
    {
        id: 'g-length',
        name: 'G Length',
        description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 똘똘하고 미니멀한 무드를 줍니다.'
    },
    {
        id: 'h-length',
        name: 'H Length',
        description: 'H 길이는 귀선~베리숏구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'
    }
];

// 중분류 (앞머리 길이)
const SUB_CATEGORIES = [
    'None',
    'Fore Head',
    'Eye Brow',
    'Eye',
    'Cheekbone'
];

// ========== 메뉴 로드 및 탭 관리 ==========

// 성별에 따른 메뉴 로드
function loadMenuForGender(gender) {
    currentGender = gender;
    const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
    
    // body에 gender 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 대분류 탭 생성 - ID 수정
    const mainTabsContainer = document.getElementById('categoryTabs'); // ✅ 올바른 ID
    if (!mainTabsContainer) {
        console.error('categoryTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    mainTabsContainer.innerHTML = '';
    
    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = `category-tab main-tab ${gender}`;
        tab.textContent = category.name;
        tab.onclick = () => selectMainTab(category, index);
        
        // 첫 번째 탭 기본 선택
        if (index === 0) {
            tab.classList.add('active');
            currentMainTab = category;
        }
        
        mainTabsContainer.appendChild(tab);
    });
    
    // 카테고리 설명 영역 생성 (없으면)
    let descriptionArea = document.getElementById('categoryDescription');
    if (!descriptionArea) {
        descriptionArea = document.createElement('div');
        descriptionArea.id = 'categoryDescription';
        descriptionArea.className = 'category-description';
        
        const descriptionText = document.createElement('div');
        descriptionText.className = 'category-description-text';
        descriptionArea.appendChild(descriptionText);
        
        // 카테고리 탭 다음에 설명 영역 삽입
        const categoryTabs = document.querySelector('.category-tabs');
        if (categoryTabs) {
            categoryTabs.parentNode.insertBefore(descriptionArea, categoryTabs.nextSibling);
        }
    }
    
    // 중분류 탭 로드
    loadSubTabs();
    
    // 첫 번째 카테고리 선택
    if (categories.length > 0) {
        selectMainTab(categories[0], 0);
    }
    
    console.log(`✅ ${gender} 메뉴 로드 완료`);
}

// 대분류 탭 선택
function selectMainTab(category, index) {
    currentMainTab = category;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });
    
    // 카테고리 설명 업데이트
    updateCategoryDescription(category);
    
    // 중분류 탭 표시
    loadSubTabs();
    
    // 스타일 로드
    loadStyles();
    
    console.log(`📂 대분류 선택: ${category.name}`);
}

// 카테고리 설명 업데이트
function updateCategoryDescription(category) {
    const descriptionText = document.querySelector('.category-description-text');
    if (!descriptionText) return;
    
    if (category.description) {
        descriptionText.innerHTML = `
            <span class="category-name">${category.name}</span>
            ${category.description}
        `;
        descriptionText.classList.remove('empty');
    } else {
        descriptionText.textContent = '카테고리 설명이 없습니다.';
        descriptionText.classList.add('empty');
    }
}

// 중분류 탭 로드
function loadSubTabs() {
    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('subTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    subTabsContainer.innerHTML = '';
    
    SUB_CATEGORIES.forEach((subCategory, index) => {
        const tab = document.createElement('button');
        tab.className = `sub-tab ${currentGender}`;
        tab.textContent = subCategory;
        tab.onclick = () => selectSubTab(subCategory, index);
        
        // 첫 번째 서브탭 기본 선택
        if (index === 0) {
            tab.classList.add('active');
            currentSubTab = subCategory;
        }
        
        subTabsContainer.appendChild(tab);
    });
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });
    
    // 스타일 로드
    loadStyles();
    
    console.log(`📋 중분류 선택: ${subCategory}`);
}

// ========== 스타일 로드 및 카드 생성 ==========

// 스타일 로드
async function loadStyles() {
    const stylesGrid = document.getElementById('stylesGrid');
    if (!stylesGrid) {
        console.error('stylesGrid 요소를 찾을 수 없습니다');
        return;
    }
    
    // 로딩 상태 표시
    showLoadingState(stylesGrid);
    
    try {
        // Firebase에서 스타일 가져오기
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', currentMainTab.name)
            .where('subCategory', '==', currentSubTab)
            .get();
        
        if (querySnapshot.empty) {
            showEmptyState(stylesGrid);
            return;
        }
        
        // 스타일 카드 생성
        stylesGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        querySnapshot.forEach(doc => {
            const style = { ...doc.data(), id: doc.id };
            const card = createStyleCard(style);
            fragment.appendChild(card);
        });
        
        stylesGrid.appendChild(fragment);
        
        console.log(`✅ ${querySnapshot.size}개 스타일 로드 완료: ${currentMainTab.name} - ${currentSubTab}`);
        
    } catch (error) {
        console.error('스타일 로드 오류:', error);
        showErrorState(stylesGrid, error.message);
    }
}

// 스타일 카드 생성 (NEW 표시 및 AI 버튼 포함)
function createStyleCard(style) {
    const card = document.createElement('div');
    card.className = 'style-card';
    
    // NEW 표시 조건 확인 (7일 이내)
    const isNew = style.createdAt && 
                  (new Date() - style.createdAt.toDate()) < (7 * 24 * 60 * 60 * 1000);
    
    card.innerHTML = `
        <div class="style-image-wrapper">
            <img class="style-image" 
                 src="${style.imageUrl || ''}" 
                 alt="${style.name || 'Style'}" 
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            
            ${isNew ? '<div class="new-indicator"></div>' : ''}
            
            <!-- AI 체험하기 오버레이 -->
            <div class="ai-overlay">
                <button class="ai-experience-btn" onclick="startAIExperience(event, '${style.id}', '${style.name}', '${style.imageUrl}')">
                    <span class="ai-icon">🤖</span>
                    <span>AI 체험하기</span>
                </button>
            </div>
            
            <!-- 스타일 정보 -->
            <div class="style-info">
                <div class="style-code">${style.code || 'NO CODE'}</div>
                <div class="style-name">${style.name || '이름 없음'}</div>
            </div>
        </div>
    `;
    
    // 클릭 이벤트 추가 (AI 버튼 제외)
    card.addEventListener('click', function(e) {
        // AI 버튼 클릭인 경우 무시
        if (e.target.closest('.ai-experience-btn')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // 시각적 피드백
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // 햅틱 피드백 (모바일)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        console.log('스타일 클릭:', { 
            id: style.id,
            code: style.code || 'NO_CODE', 
            name: style.name || 'NO_NAME'
        });
        
        // 스타일 상세 모달 열기
        openStyleModal(style);
    });
    
    return card;
}

// ========== AI 체험하기 기능 ==========

// AI 체험하기 시작
function startAIExperience(event, styleId, styleName, styleImageUrl) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('AI 체험하기 시작:', { styleId, styleName, styleImageUrl });
    
    // AI 사진 업로드 모달 열기
    openAIPhotoModal(styleId, styleName, styleImageUrl);
}

// AI 사진 업로드 모달 열기
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    // 모달이 없으면 생성
    let modal = document.getElementById('aiPhotoModal');
    if (!modal) {
        modal = createAIPhotoModal();
        document.body.appendChild(modal);
    }
    
    // 모달 내용 설정
    const modalTitle = modal.querySelector('.ai-modal-title');
    const modalSubtitle = modal.querySelector('.ai-modal-subtitle');
    
    if (modalTitle) {
        modalTitle.innerHTML = `<span class="ai-icon">🤖</span> AI 헤어스타일 체험`;
    }
    
    if (modalSubtitle) {
        modalSubtitle.textContent = `${styleName} 스타일로 변신해보세요!`;
    }
    
    // 현재 선택된 스타일 정보 저장
    modal.dataset.styleId = styleId;
    modal.dataset.styleName = styleName;
    modal.dataset.styleImageUrl = styleImageUrl;
    
    // 모달 표시
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// AI 사진 업로드 모달 HTML 생성
function createAIPhotoModal() {
    const modal = document.createElement('div');
    modal.id = 'aiPhotoModal';
    modal.className = 'ai-photo-modal';
    
    modal.innerHTML = `
        <div class="ai-modal-content">
            <button class="ai-modal-close" onclick="closeAIPhotoModal()">×</button>
            
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    <span class="ai-icon">🤖</span> AI 헤어스타일 체험
                </div>
                <div class="ai-modal-subtitle">
                    고객님의 사진을 업로드하면 AI가 선택한 헤어스타일을 합성해드립니다
                </div>
            </div>
            
            <div class="ai-modal-body">
                <div class="ai-upload-area" onclick="triggerFileInput()">
                    <input type="file" id="aiPhotoInput" accept="image/*" style="display: none;" onchange="handlePhotoUpload(this)">
                    <div class="upload-placeholder">
                        <div class="upload-icon">📷</div>
                        <div class="upload-text">사진 선택하기</div>
                        <div class="upload-hint">JPG, PNG 파일만 가능</div>
                    </div>
                </div>
                
                <div id="aiPhotoPreview" class="ai-photo-preview" style="display: none;">
                    <img id="previewImage" class="preview-image">
                    <div>
                        <button class="ai-process-btn" onclick="processAIFaceSwap()" id="aiProcessBtn">
                            <span class="ai-icon">🎨</span>
                            <span>AI 합성 시작</span>
                        </button>
                        <button class="ai-secondary-btn" onclick="resetPhotoUpload()" style="margin-left: 10px;">
                            다시 선택
                        </button>
                    </div>
                </div>
                
                <div class="ai-info" style="margin-top: 20px; padding: 15px; background: var(--ai-bg-secondary); border-radius: 10px; font-size: 12px; color: var(--text-secondary);">
                    💡 <strong>안내:</strong> 업로드된 사진은 AI 처리 후 자동으로 삭제되며, 다른 용도로 사용되지 않습니다.
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// 파일 입력 트리거
function triggerFileInput() {
    const fileInput = document.getElementById('aiPhotoInput');
    if (fileInput) {
        fileInput.click();
    }
}

// 사진 업로드 처리
function handlePhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다', 'error');
        return;
    }
    
    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('파일 크기는 10MB 이하로 제한됩니다', 'error');
        return;
    }
    
    // 파일 읽기
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewContainer = document.getElementById('aiPhotoPreview');
        const previewImage = document.getElementById('previewImage');
        const uploadArea = document.querySelector('.ai-upload-area');
        
        if (previewImage && previewContainer && uploadArea) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
        }
    };
    
    reader.readAsDataURL(file);
}

// 사진 업로드 재설정
function resetPhotoUpload() {
    const previewContainer = document.getElementById('aiPhotoPreview');
    const uploadArea = document.querySelector('.ai-upload-area');
    const fileInput = document.getElementById('aiPhotoInput');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileInput) fileInput.value = '';
}

// AI 얼굴 합성 처리
async function processAIFaceSwap() {
    const processBtn = document.getElementById('aiProcessBtn');
    const previewImage = document.getElementById('previewImage');
    const modal = document.getElementById('aiPhotoModal');
    
    if (!processBtn || !previewImage || !modal) {
        console.error('필요한 요소를 찾을 수 없습니다');
        return;
    }
    
    // 버튼 상태 변경
    const originalText = processBtn.innerHTML;
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="ai-icon">⏳</span><span>AI 처리 중...</span>';
    processBtn.classList.add('ai-processing');
    
    try {
        // 현재 선택된 스타일 정보 가져오기
        const styleId = modal.dataset.styleId;
        const styleName = modal.dataset.styleName;
        const styleImageUrl = modal.dataset.styleImageUrl;
        const customerImageUrl = previewImage.src;
        
        console.log('AI 처리 시작:', { styleId, styleName, customerImageUrl });
        
        // AKOOL 서비스 호출 (실제 구현 시 사용)
        // const result = await window.akoolService?.faceSwap(customerImageUrl, styleImageUrl);
        
        // 데모용 지연 시간
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 성공 시 결과 표시 (데모)
        showToast('AI 합성이 완료되었습니다!', 'success');
        showAIResult(customerImageUrl, styleName); // 데모용
        closeAIPhotoModal();
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast('AI 처리 중 오류가 발생했습니다', 'error');
        
    } finally {
        // 버튼 상태 복원
        processBtn.disabled = false;
        processBtn.innerHTML = originalText;
        processBtn.classList.remove('ai-processing');
    }
}

// AI 결과 표시 (데모)
function showAIResult(resultImageUrl, styleName) {
    // 결과 모달 생성 및 표시 (실제 구현 필요)
    console.log('AI 결과 표시:', { resultImageUrl, styleName });
    // 여기에 결과 모달 구현
}

// AI 모달 닫기
function closeAIPhotoModal() {
    const modal = document.getElementById('aiPhotoModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // 업로드 상태 초기화
        resetPhotoUpload();
    }
}

// ========== 스타일 상세 모달 ==========

// 스타일 상세 모달 열기
function openStyleModal(style) {
    let modal = document.getElementById('styleModal');
    if (!modal) {
        modal = createStyleModal();
        document.body.appendChild(modal);
    }
    
    // 모달 내용 설정
    const modalImage = modal.querySelector('.style-modal-image');
    const modalCode = modal.querySelector('.style-modal-code');
    const modalName = modal.querySelector('.style-modal-name');
    const modalCategory = modal.querySelector('#modalCategory');
    const modalSubcategory = modal.querySelector('#modalSubcategory');
    const modalGender = modal.querySelector('#modalGender');
    
    if (modalImage) {
        modalImage.src = style.imageUrl || '';
        modalImage.onerror = function() {
            this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        };
    }
    
    if (modalCode) modalCode.textContent = style.code || 'NO CODE';
    if (modalName) modalName.textContent = style.name || '이름 없음';
    if (modalCategory) modalCategory.textContent = style.mainCategory || '-';
    if (modalSubcategory) modalSubcategory.textContent = style.subCategory || '-';
    if (modalGender) {
        modalGender.textContent = style.gender === 'male' ? '남성' : 
                                 style.gender === 'female' ? '여성' : '-';
    }
    
    // 모달 표시
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 기본 스타일 모달 HTML 생성
function createStyleModal() {
    const modal = document.createElement('div');
    modal.id = 'styleModal';
    modal.className = 'style-modal';
    
    modal.innerHTML = `
        <div class="style-modal-content">
            <button class="style-modal-close" onclick="closeStyleModal()">×</button>
            
            <img class="style-modal-image" src="" alt="Style">
            
            <div class="style-modal-info">
                <div class="style-modal-code"></div>
                <div class="style-modal-name"></div>
                
                <div class="style-modal-details">
                    <div class="style-detail-row">
                        <div class="style-detail-label">카테고리</div>
                        <div class="style-detail-value" id="modalCategory">-</div>
                    </div>
                    <div class="style-detail-row">
                        <div class="style-detail-label">서브카테고리</div>
                        <div class="style-detail-value" id="modalSubcategory">-</div>
                    </div>
                    <div class="style-detail-row">
                        <div class="style-detail-label">성별</div>
                        <div class="style-detail-value" id="modalGender">-</div>
                    </div>
                </div>
                
                <div class="style-modal-actions">
                    <button class="modal-action-btn" onclick="favoriteStyle()">
                        ⭐ 즐겨찾기
                    </button>
                    <button class="modal-action-btn secondary" onclick="shareStyle()">
                        📤 공유하기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// 스타일 모달 닫기
function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========== 상태 표시 함수들 ==========

// 로딩 상태 표시
function showLoadingState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <div class="empty-title">로딩중...</div>
        </div>
    `;
}

// 빈 상태 표시
function showEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">스타일 없음</div>
            <div class="empty-message">해당 카테고리에 등록된 스타일이 없습니다</div>
        </div>
    `;
}

// 오류 상태 표시
function showErrorState(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">오류 발생</div>
            <div class="empty-message">${message}</div>
        </div>
    `;
}

// ========== 유틸리티 함수들 ==========

// 토스트 메시지 표시
function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 애니메이션으로 표시
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 3초 후 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 즐겨찾기 기능
function favoriteStyle() {
    showToast('즐겨찾기에 추가되었습니다', 'success');
    // 실제 즐겨찾기 로직 구현 필요
}

// 공유 기능
function shareStyle() {
    if (navigator.share) {
        navigator.share({
            title: 'HAIRGATOR 스타일',
            text: '이 헤어스타일 어떠세요?',
            url: window.location.href
        }).then(() => {
            showToast('공유되었습니다', 'success');
        }).catch(() => {
            copyToClipboard(window.location.href);
        });
    } else {
        copyToClipboard(window.location.href);
    }
}

// 클립보드 복사
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('링크가 복사되었습니다', 'success');
        }).catch(() => {
            showToast('복사에 실패했습니다', 'error');
        });
    } else {
        showToast('복사 기능을 지원하지 않는 브라우저입니다', 'error');
    }
}

// ========== 이벤트 리스너 ==========

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 HAIRGATOR 메뉴 시스템 로드 완료');
    
    // 모달 바깥 클릭 시 닫기
    document.addEventListener('click', function(e) {
        // 스타일 모달
        const styleModal = document.getElementById('styleModal');
        if (styleModal && e.target === styleModal) {
            closeStyleModal();
        }
        
        // AI 모달
        const aiModal = document.getElementById('aiPhotoModal');
        if (aiModal && e.target === aiModal) {
            closeAIPhotoModal();
        }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeStyleModal();
            closeAIPhotoModal();
        }
    });
});

// ========== 전역 함수 노출 ==========
// 다른 파일에서 사용할 수 있도록 전역 스코프에 노출
window.HAIRGATOR_MENU = {
    loadMenuForGender,
    selectMainTab,
    selectSubTab,
    loadStyles,
    createStyleCard,
    openStyleModal,
    closeStyleModal,
    startAIExperience,
    openAIPhotoModal,
    closeAIPhotoModal,
    updateCategoryDescription,
    showToast
};

console.log('✅ HAIRGATOR 메뉴 시스템 초기화 완료');


