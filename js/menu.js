// ========== HAIRGATOR 메뉴 시스템 - 최종 완성 버전 ==========

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
        name: 'A LENGTH',
        description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'
    },
    {
        id: 'b-length',
        name: 'B LENGTH',
        description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'
    },
    {
        id: 'c-length',
        name: 'C LENGTH',
        description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬·에어리펌과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'
    },
    {
        id: 'd-length',
        name: 'D LENGTH',
        description: 'D 길이는 어깨에 정확히 닿는 길이로, LOB·숄더 C컬·빌드펌이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'
    },
    {
        id: 'e-length',
        name: 'E LENGTH',
        description: 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'
    },
    {
        id: 'f-length',
        name: 'F LENGTH',
        description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스쳐 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'
    },
    {
        id: 'g-length',
        name: 'G LENGTH',
        description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 똘똘하고 미니멀한 무드를 줍니다.'
    },
    {
        id: 'h-length',
        name: 'H LENGTH',
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

// ========== 전역 변수 ==========
let currentGender = null;
let currentMainTab = null;
let currentSubTab = null;
let currentAIStyleImage = null;
let currentAIStyleName = null;
let uploadedCustomerPhoto = null;

// window 전역 객체 초기화
if (typeof window !== 'undefined') {
    window.currentGender = currentGender;
    window.currentMainTab = currentMainTab;
    window.currentSubTab = currentSubTab;
}

// 스마트 필터링 & NEW 시스템 캐시
let availableSubcategories = new Map();
let newItemsCache = new Map();
let categoryNewCounts = new Map();
const newItemsTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일 전

// ========== 스마트 필터링 & NEW 표시 시스템 ==========

// 사용 가능한 서브카테고리 & NEW 아이템 확인
async function checkSubcategoriesAndNew(gender, categoryName) {
    const dbCategoryName = categoryName.includes('LENGTH') 
        ? categoryName.replace('LENGTH', 'Length')
        : categoryName;
    
    const cacheKey = `${gender}-${dbCategoryName}`;
    
    if (availableSubcategories.has(cacheKey)) {
        return availableSubcategories.get(cacheKey);
    }
    
    try {
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('mainCategory', '==', dbCategoryName)
            .get();
        
        const availableSubs = new Set();
        const newCounts = {};
        let totalNewInCategory = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            availableSubs.add(data.subCategory);
            
            const createdAt = data.createdAt?.toDate?.() || new Date(0);
            if (createdAt.getTime() > sevenDaysAgo) {
                newCounts[data.subCategory] = (newCounts[data.subCategory] || 0) + 1;
                totalNewInCategory++;
            }
        });
        
        const result = {
            available: Array.from(availableSubs),
            newCounts: newCounts,
            totalNewCount: totalNewInCategory
        };
        
        availableSubcategories.set(cacheKey, result);
        
        if (totalNewInCategory > 0) {
            categoryNewCounts.set(categoryName, totalNewInCategory);
        }
        
        console.log(`✅ 서브카테고리 확인 완료: ${categoryName}`, result);
        return result;
        
    } catch (error) {
        console.error('서브카테고리 확인 오류:', error);
        return {
            available: SUB_CATEGORIES,
            newCounts: {},
            totalNewCount: 0
        };
    }
}

// NEW 표시 빨간 점 생성
function createNewIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'new-indicator';
    return indicator;
}

// ========== 메뉴 로드 및 탭 관리 ==========

// 성별에 따른 메뉴 로드
async function loadMenuForGender(gender) {
    try {
        currentGender = gender;
        window.currentGender = gender;
        
        const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
        
        console.log(`🔄 ${gender} 메뉴 로드 시작 (${categories.length}개 카테고리)`);
        
        if (typeof db === 'undefined' || !db) {
            console.warn('Firebase 미연결 - 3초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 3000);
            return;
        }
        
        if (!document.getElementById('categoryTabs')) {
            console.warn('DOM 미준비 - 2초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 2000);
            return;
        }
        
        document.body.classList.remove('gender-male', 'gender-female');
        document.body.classList.add(`gender-${gender}`);
        
        availableSubcategories.clear();
        categoryNewCounts.clear();
        
        await createMainTabsWithSmart(categories, gender);
        ensureCategoryDescriptionArea();
        
        if (categories.length > 0) {
            await selectMainTab(categories[0], 0);
        }
        
        console.log(`✅ ${gender} 메뉴 로드 완료`);
        
    } catch (error) {
        console.error('메뉴 로드 오류:', error);
        setTimeout(() => loadMenuForGender(gender), 5000);
    }
}

// 대분류 탭 생성 (스마트 필터링 + NEW 표시)
async function createMainTabsWithSmart(categories, gender) {
    const mainTabsContainer = document.getElementById('categoryTabs');
    if (!mainTabsContainer) {
        console.error('❌ categoryTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    mainTabsContainer.innerHTML = '';
    
    const categoryPromises = categories.map(category => 
        checkSubcategoriesAndNew(gender, category.name)
    );
    const categoryInfos = await Promise.all(categoryPromises);
    
    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = `category-tab main-tab ${gender}`;
        tab.textContent = category.name;
        tab.onclick = () => selectMainTab(category, index);
        
        const categoryInfo = categoryInfos[index];
        
        if (index === 0) {
            tab.classList.add('active');
            currentMainTab = category;
            window.currentMainTab = category;
        }
        
        if (categoryInfo.totalNewCount > 0) {
            tab.appendChild(createNewIndicator());
        }
        
        mainTabsContainer.appendChild(tab);
    });
    
    console.log(`✅ ${categories.length}개 대분류 탭 생성 완료`);
}

// 카테고리 설명 영역 확인/생성
function ensureCategoryDescriptionArea() {
    let descriptionArea = document.getElementById('categoryDescription');
    if (!descriptionArea) {
        descriptionArea = document.createElement('div');
        descriptionArea.id = 'categoryDescription';
        descriptionArea.className = 'category-description';
        
        const descriptionText = document.createElement('div');
        descriptionText.className = 'category-description-text';
        descriptionArea.appendChild(descriptionText);
        
        const categoryTabs = document.querySelector('.category-tabs') || 
                            document.getElementById('categoryTabs')?.parentElement;
        if (categoryTabs) {
            const nextElement = categoryTabs.nextElementSibling;
            categoryTabs.parentNode.insertBefore(descriptionArea, nextElement);
        }
    }
}

// 대분류 탭 선택
async function selectMainTab(category, index) {
    currentMainTab = category;
    window.currentMainTab = category;
    
    console.log(`📂 대분류 선택: ${category.name}`);
    
    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });
    
    updateCategoryDescription(category);
    await loadSmartSubTabs(category.name);
    loadStyles();
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
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.remove('empty');
    } else {
        descriptionText.textContent = '카테고리 설명이 없습니다.';
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.add('empty');
    }
}

// 스마트 중분류 탭 로드
async function loadSmartSubTabs(categoryName) {
    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('❌ subTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    subTabsContainer.innerHTML = '';
    
    const subInfo = await checkSubcategoriesAndNew(currentGender, categoryName);
    let firstAvailableIndex = -1;
    
    SUB_CATEGORIES.forEach((subCategory, index) => {
        const tab = document.createElement('button');
        tab.className = `sub-tab ${currentGender}`;
        tab.textContent = subCategory;
        
        const isAvailable = subInfo.available.includes(subCategory);
        
        if (!isAvailable) {
            tab.classList.add('disabled');
            tab.style.opacity = '0.3';
            tab.style.cursor = 'not-allowed';
            tab.style.pointerEvents = 'none';
        } else {
            tab.onclick = () => selectSubTab(subCategory, index);
            
            if (firstAvailableIndex === -1) {
                firstAvailableIndex = index;
                tab.classList.add('active');
                currentSubTab = subCategory;
                window.currentSubTab = subCategory;
            }
            
            const newCount = subInfo.newCounts[subCategory];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
            }
        }
        
        subTabsContainer.appendChild(tab);
    });
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    window.currentSubTab = subCategory;
    
    console.log(`📋 중분류 선택: ${subCategory}`);
    
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        if (!tab.classList.contains('disabled')) {
            tab.classList.remove('active', 'male', 'female');
            if (i === index) {
                tab.classList.add('active', currentGender);
            }
        }
    });
    
    loadStyles();
}

// ========== 스타일 로드 및 카드 생성 ==========

// 스타일 로드
async function loadStyles() {
    if (!currentGender && window.currentGender) currentGender = window.currentGender;
    if (!currentMainTab && window.currentMainTab) currentMainTab = window.currentMainTab;
    if (!currentSubTab && window.currentSubTab) currentSubTab = window.currentSubTab;
    
    const stylesGrid = document.getElementById('stylesGrid');
    if (!stylesGrid) {
        console.error('❌ stylesGrid 요소를 찾을 수 없습니다');
        return;
    }
    
    if (!currentGender || !currentMainTab || !currentSubTab) {
        showErrorState(stylesGrid, '카테고리를 선택해주세요');
        return;
    }
    
    const mainCategoryName = currentMainTab.name || currentMainTab;
    const dbMainCategoryName = mainCategoryName.includes('LENGTH')
        ? mainCategoryName.replace('LENGTH', 'Length')
        : mainCategoryName;
    const subCategoryName = currentSubTab;
    
    console.log(`🔍 스타일 검색:`, {
        gender: currentGender,
        mainCategory: dbMainCategoryName,
        subCategory: subCategoryName
    });
    
    showLoadingState(stylesGrid);
    
    try {
        if (typeof db === 'undefined') {
            throw new Error('Firebase가 초기화되지 않았습니다');
        }
        
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', dbMainCategoryName)
            .where('subCategory', '==', subCategoryName)
            .get();
        
        if (querySnapshot.empty) {
            showEmptyState(stylesGrid);
            return;
        }
        
        stylesGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        let styleCount = 0;
        querySnapshot.forEach(doc => {
            const style = { ...doc.data(), id: doc.id };
            const card = createStyleCard(style);
            fragment.appendChild(card);
            styleCount++;
        });
        
        stylesGrid.appendChild(fragment);
        console.log(`✅ ${styleCount}개 스타일 로드 완료`);
        
    } catch (error) {
        console.error('❌ 스타일 로드 오류:', error);
        showErrorState(stylesGrid, `로드 실패: ${error.message}`);
    }
}

// 스타일 카드 생성
function createStyleCard(style) {
    const card = document.createElement('div');
    card.className = 'style-card';
    
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
            
            <div class="style-info">
                <div class="style-code">${style.code || 'NO CODE'}</div>
                <div class="style-name">${style.name || '이름 없음'}</div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        openStyleModal(style);
    });
    
    return card;
}

// ========== 스타일 상세 모달 ==========

// 스타일 상세 모달 열기
function openStyleModal(style) {
    const modal = document.getElementById('styleModal');
    if (!modal) {
        console.error('❌ styleModal 요소를 찾을 수 없습니다');
        return;
    }
    
    const modalImage = document.getElementById('styleModalImage');
    const modalCode = document.getElementById('styleModalCode');
    const modalName = document.getElementById('styleModalName');
    const modalCategory = document.getElementById('styleModalCategory');
    const modalSubcategory = document.getElementById('styleModalSubcategory');
    const modalGender = document.getElementById('styleModalGender');
    
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
    
    addAIButtonToModal(style);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 모달에 AI 체험하기 버튼 추가
function addAIButtonToModal(style) {
    const modalActions = document.querySelector('.style-modal-actions');
    if (!modalActions) return;
    
    const existingAIBtn = modalActions.querySelector('.ai-experience-modal-btn');
    if (existingAIBtn) {
        existingAIBtn.remove();
    }
    
    const aiButton = document.createElement('button');
    aiButton.className = 'modal-action-btn ai-experience-modal-btn';
    aiButton.innerHTML = `
        <span class="ai-icon">🤖</span>
        <span>AI 체험하기</span>
    `;
    
    aiButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        openAIPhotoModal(style.id, style.name || '스타일', style.imageUrl || '');
    };
    
    modalActions.insertBefore(aiButton, modalActions.firstChild);
}

// ========== AI 체험하기 기능 (활성화) ==========

// AI 사진 업로드 모달 열기
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    console.log('🤖 AI 체험하기 시작:', {
        styleId: styleId,
        styleName: styleName,
        styleImageUrl: styleImageUrl
    });
    
    currentAIStyleImage = styleImageUrl;
    currentAIStyleName = styleName;
    uploadedCustomerPhoto = null;
    
    const existingModal = document.getElementById('aiPhotoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
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
                <div class="ai-upload-area" id="uploadArea">
                    <input type="file" id="photoInput" accept="image/*" style="display: none;">
                    <div class="upload-placeholder">
                        <span class="upload-icon">📸</span>
                        <div class="upload-text">사진 선택하기</div>
                        <div class="upload-hint">클릭하거나 사진을 드래그하세요</div>
                    </div>
                    <img id="previewImage" style="display: none; width: 100%; height: auto; border-radius: 10px;">
                </div>
                
                <div class="ai-modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="ai-secondary-btn" onclick="closePhotoUploadModal()">취소</button>
                    <button id="aiProcessBtn" class="ai-process-btn" disabled onclick="processAIFaceSwap()">
                        <span class="ai-icon">✨</span>
                        <span>AI 합성 시작</span>
                    </button>
                </div>
                
                <div class="ai-info" style="margin-top: 20px; padding: 15px; background: var(--ai-bg-secondary); border-radius: 10px; font-size: 14px; color: var(--text-secondary);">
                    <div style="margin-bottom: 8px;">💡 최상의 결과를 위한 팁:</div>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>정면을 바라본 사진을 사용해주세요</li>
                        <li>얼굴이 선명하게 나온 사진이 좋습니다</li>
                        <li>머리가 잘 보이는 사진을 권장합니다</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setupPhotoUploadEvents();
    }, 10);
}

// 사진 업로드 이벤트 설정
function setupPhotoUploadEvents() {
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoInput');
    
    if (!uploadArea || !photoInput) return;
    
    uploadArea.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        photoInput.click();
    });
    
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
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');
        const processBtn = document.getElementById('aiProcessBtn');
        
        if (previewImage && uploadPlaceholder) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            
            uploadedCustomerPhoto = e.target.result;
            
            if (processBtn) {
                processBtn.disabled = false;
            }
            
            showToast('사진이 업로드되었습니다', 'success');
        }
    };
    
    reader.readAsDataURL(file);
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
    
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="ai-icon">⏳</span><span>AI 처리 중...</span>';
    
    try {
        // 데모 모드 처리 (3초 대기)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        showAIResult('demo');
        closePhotoUploadModal();
        showToast('AI 합성이 완료되었습니다!', 'success');
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast('AI 처리 중 오류가 발생했습니다', 'error');
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = originalText;
    }
}

// AI 결과 표시
function showAIResult(resultImageUrl) {
    const resultModal = document.createElement('div');
    resultModal.className = 'ai-result-modal';
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
    `;
    
    resultModal.innerHTML = `
        <div class="ai-modal-content">
            <div class="ai-modal-header">
                <button class="ai-modal-close" onclick="this.closest('.ai-result-modal').remove(); document.body.style.overflow='';">×</button>
                <h2 class="ai-modal-title">
                    <span class="ai-icon">✨</span>
                    AI 합성 결과
                </h2>
            </div>
            <div class="ai-modal-body" style="text-align: center;">
                <div style="padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
                    <h3>${currentAIStyleName}</h3>
                    <p>AI 합성 완료 (데모)</p>
                </div>
                <button class="ai-secondary-btn" onclick="this.closest('.ai-result-modal').remove(); document.body.style.overflow='';" style="margin-top: 20px;">
                    닫기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(resultModal);
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
        
        uploadedCustomerPhoto = null;
    }
}

function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========== 상태 표시 함수들 ==========

function showLoadingState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <div class="empty-title">로딩중...</div>
        </div>
    `;
}

function showEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">스타일 없음</div>
            <div class="empty-message">해당 카테고리에 등록된 스타일이 없습니다</div>
        </div>
    `;
}

function showErrorState(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">오류 발생</div>
            <div class="empty-message">${message}</div>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: var(--female-color); color: white; border: none; border-radius: 5px; cursor: pointer;">새로고침</button>
        </div>
    `;
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== 이벤트 리스너 ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 HAIRGATOR 메뉴 시스템 최종 버전 로드 완료');
    
    document.addEventListener('click', function(e) {
        const styleModal = document.getElementById('styleModal');
        if (styleModal && e.target === styleModal) {
            closeStyleModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeStyleModal();
            closePhotoUploadModal();
        }
    });
});

// ========== 전역 함수 노출 ==========

window.HAIRGATOR_MENU = {
    loadMenuForGender,
    selectMainTab,
    selectSubTab,
    loadStyles,
    createStyleCard,
    openStyleModal,
    closeStyleModal,
    openAIPhotoModal,
    closePhotoUploadModal,
    processAIFaceSwap,
    updateCategoryDescription,
    showToast,
    checkSubcategoriesAndNew,
    getCurrentGender: () => currentGender,
    getCurrentMainTab: () => currentMainTab,
    getCurrentSubTab: () => currentSubTab
};

window.selectGender = function(gender) {
    console.log(`성별 선택: ${gender}`);
    
    currentGender = gender;
    window.currentGender = gender;
    
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const backBtn = document.getElementById('backBtn');
    
    if (genderSelection) genderSelection.style.display = 'none';
    if (menuContainer) menuContainer.classList.add('active');
    if (backBtn) backBtn.style.display = 'flex';
    
    loadMenuForGender(gender);
};

window.loadMenuForGender = loadMenuForGender;
window.openAIPhotoModal = openAIPhotoModal;
window.closePhotoUploadModal = closePhotoUploadModal;
window.processAIFaceSwap = processAIFaceSwap;
window.showToast = showToast;
window.closeStyleModal = closeStyleModal;

window.debugHAIRGATOR = function() {
    console.log('🔍 HAIRGATOR 디버그 정보');
    console.log('전역 변수:', {
        currentGender,
        currentMainTab: currentMainTab?.name,
        currentSubTab,
        AI스타일: currentAIStyleName
    });
    console.log('DOM 요소:', {
        categoryTabs: !!document.getElementById('categoryTabs'),
        subTabs: !!document.getElementById('subTabs'),
        stylesGrid: !!document.getElementById('stylesGrid'),
        styleModal: !!document.getElementById('styleModal')
    });
};

console.log('✅ HAIRGATOR 메뉴 시스템 초기화 완료');
console.log('🤖 AI 체험하기 기능 활성화됨');
console.log('💡 디버깅: window.debugHAIRGATOR() 실행');
