// ========== HAIRGATOR 메뉴 시스템 - 스마트 필터링 & NEW 표시 완성 버전 ==========

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

// ========== 전역 변수 ==========
let currentMainTab = null;  // 현재 선택된 메인 카테고리 (객체)
let currentSubTab = null;   // 현재 선택된 서브 카테고리 (문자열)

// 스마트 필터링 & NEW 시스템 캐시
let availableSubcategories = new Map();
let newItemsCache = new Map();
let categoryNewCounts = new Map();
const newItemsTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일 전

// ========== 스마트 필터링 & NEW 표시 시스템 ==========

// 사용 가능한 서브카테고리 & NEW 아이템 확인
async function checkSubcategoriesAndNew(gender, categoryName) {
    const cacheKey = `${gender}-${categoryName}`;
    
    if (availableSubcategories.has(cacheKey)) {
        return availableSubcategories.get(cacheKey);
    }
    
    try {
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('mainCategory', '==', categoryName)
            .get();
        
        const availableSubs = new Set();
        const newCounts = {};
        let totalNewInCategory = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            availableSubs.add(data.subCategory);
            
            // 7일 이내 생성된 아이템인지 확인
            const createdAt = data.createdAt?.toDate?.() || new Date(0);
            if (createdAt.getTime() > newItemsTimestamp) {
                newCounts[data.subCategory] = (newCounts[data.subCategory] || 0) + 1;
                totalNewInCategory++;
            }
        });
        
        const result = {
            available: Array.from(availableSubs),
            newCounts: newCounts,
            totalNewCount: totalNewInCategory
        };
        
        // 캐시에 저장
        availableSubcategories.set(cacheKey, result);
        
        // 카테고리별 NEW 개수도 저장
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
    currentGender = gender;
    const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
    
    console.log(`🔄 ${gender} 메뉴 로드 시작 (${categories.length}개 카테고리)`);
    
    // body에 gender 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 캐시 초기화
    availableSubcategories.clear();
    categoryNewCounts.clear();
    
    // 대분류 탭 생성 (NEW 표시 포함)
    await createMainTabsWithSmart(categories, gender);
    
    // 카테고리 설명 영역 확인/생성
    ensureCategoryDescriptionArea();
    
    // 첫 번째 카테고리 자동 선택
    if (categories.length > 0) {
        await selectMainTab(categories[0], 0);
    }
    
    console.log(`✅ ${gender} 메뉴 로드 완료`);
}

// 대분류 탭 생성 (스마트 필터링 + NEW 표시)
async function createMainTabsWithSmart(categories, gender) {
    const mainTabsContainer = document.getElementById('categoryTabs');
    if (!mainTabsContainer) {
        console.error('❌ categoryTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    mainTabsContainer.innerHTML = '';
    
    // 모든 카테고리의 서브카테고리 정보를 병렬로 확인
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
        
        // 첫 번째 탭 기본 선택
        if (index === 0) {
            tab.classList.add('active');
            currentMainTab = category;
            console.log(`📌 기본 선택: ${category.name}`, category);
        }
        
        // NEW 표시 추가 (카테고리에 신규 아이템이 있으면)
        if (categoryInfo.totalNewCount > 0) {
            tab.appendChild(createNewIndicator());
        }
        
        mainTabsContainer.appendChild(tab);
        
        console.log(`📂 카테고리 생성: ${category.name} (신규: ${categoryInfo.totalNewCount}개)`);
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
        
        // 카테고리 탭 다음에 설명 영역 삽입
        const categoryTabs = document.querySelector('.category-tabs') || 
                            document.getElementById('categoryTabs')?.parentElement;
        if (categoryTabs) {
            const nextElement = categoryTabs.nextElementSibling;
            categoryTabs.parentNode.insertBefore(descriptionArea, nextElement);
            console.log('✅ 카테고리 설명 영역 생성됨');
        }
    }
}

// 대분류 탭 선택
async function selectMainTab(category, index) {
    currentMainTab = category;
    
    console.log(`📂 대분류 선택: ${category.name}`, category);
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });
    
    // 카테고리 설명 업데이트
    updateCategoryDescription(category);
    
    // 스마트 중분류 탭 표시
    await loadSmartSubTabs(category.name);
    
    // 스타일 로드
    loadStyles();
}

// 카테고리 설명 업데이트
function updateCategoryDescription(category) {
    const descriptionText = document.querySelector('.category-description-text');
    if (!descriptionText) {
        console.warn('⚠️ 카테고리 설명 영역을 찾을 수 없습니다');
        return;
    }
    
    if (category.description) {
        descriptionText.innerHTML = `
            <span class="category-name">${category.name}</span>
            ${category.description}
        `;
        descriptionText.classList.remove('empty');
        console.log(`📝 카테고리 설명 업데이트: ${category.name}`);
    } else {
        descriptionText.textContent = '카테고리 설명이 없습니다.';
        descriptionText.classList.add('empty');
    }
}

// 스마트 중분류 탭 로드 (필터링 + NEW 표시 + 비활성화)
async function loadSmartSubTabs(categoryName) {
    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('❌ subTabs 요소를 찾을 수 없습니다');
        return;
    }
    
    subTabsContainer.innerHTML = '';
    
    // 해당 카테고리의 서브카테고리 정보 가져오기
    const subInfo = await checkSubcategoriesAndNew(currentGender, categoryName);
    
    let firstAvailableIndex = -1;
    
    SUB_CATEGORIES.forEach((subCategory, index) => {
        const tab = document.createElement('button');
        tab.className = `sub-tab ${currentGender}`;
        tab.textContent = subCategory;
        
        // 사용 가능한 서브카테고리인지 확인
        const isAvailable = subInfo.available.includes(subCategory);
        
        if (!isAvailable) {
            // 스타일이 없는 서브카테고리 - 비활성화
            tab.classList.add('disabled');
            tab.style.opacity = '0.3';
            tab.style.cursor = 'not-allowed';
            tab.style.pointerEvents = 'none';
        } else {
            // 사용 가능한 서브카테고리
            tab.onclick = () => selectSubTab(subCategory, index);
            
            // 첫 번째 사용 가능한 서브카테고리를 활성화
            if (firstAvailableIndex === -1) {
                firstAvailableIndex = index;
                tab.classList.add('active');
                currentSubTab = subCategory;
            }
            
            // NEW 표시 추가
            const newCount = subInfo.newCounts[subCategory];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
            }
        }
        
        subTabsContainer.appendChild(tab);
    });
    
    console.log(`📋 스마트 중분류 탭 로드 완료 (사용가능: ${subInfo.available.length}/${SUB_CATEGORIES.length}개, 신규: ${Object.keys(subInfo.newCounts).length}개)`);
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    
    console.log(`📋 중분류 선택: ${subCategory}`);
    
    // 탭 활성화 상태 변경 (비활성화된 탭은 제외)
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        if (!tab.classList.contains('disabled')) {
            tab.classList.remove('active', 'male', 'female');
            if (i === index) {
                tab.classList.add('active', currentGender);
            }
        }
    });
    
    // 스타일 로드
    loadStyles();
}

// ========== 스타일 로드 및 카드 생성 ==========

// 스타일 로드 - Firebase Query 최종 안정화
async function loadStyles() {
    const stylesGrid = document.getElementById('stylesGrid');
    if (!stylesGrid) {
        console.error('❌ stylesGrid 요소를 찾을 수 없습니다');
        return;
    }
    
    // 필수 변수 체크
    if (!currentGender) {
        console.error('❌ currentGender가 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Gender not selected');
        return;
    }
    
    if (!currentMainTab) {
        console.error('❌ currentMainTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Category not selected');
        return;
    }
    
    if (!currentSubTab) {
        console.error('❌ currentSubTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Subcategory not selected');
        return;
    }
    
    // Firebase Query를 위한 안전한 카테고리명 추출
    const mainCategoryName = currentMainTab.name || currentMainTab;
    const subCategoryName = currentSubTab;
    
    console.log(`🔍 스타일 검색 시작:`, {
        gender: currentGender,
        mainCategory: mainCategoryName,
        subCategory: subCategoryName
    });
    
    // 로딩 상태 표시
    showLoadingState(stylesGrid);
    
    try {
        // Firebase 연결 확인
        if (typeof db === 'undefined') {
            throw new Error('Firebase가 초기화되지 않았습니다');
        }
        
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', mainCategoryName)
            .where('subCategory', '==', subCategoryName)
            .get();
        
        if (querySnapshot.empty) {
            console.log(`📭 스타일 없음: ${mainCategoryName} - ${subCategoryName}`);
            showEmptyState(stylesGrid);
            return;
        }
        
        // 스타일 카드 생성
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
        
        console.log(`✅ ${styleCount}개 스타일 로드 완료: ${mainCategoryName} - ${subCategoryName}`);
        
    } catch (error) {
        console.error('❌ 스타일 로드 오류:', error);
        showErrorState(stylesGrid, `로드 실패: ${error.message}`);
    }
}

// 스타일 카드 생성 (NEW 표시만, AI 버튼 제거)
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
            
            <!-- 스타일 정보 -->
            <div class="style-info">
                <div class="style-code">${style.code || 'NO CODE'}</div>
                <div class="style-name">${style.name || '이름 없음'}</div>
            </div>
        </div>
    `;
    
    // 클릭 이벤트 - 스타일 상세 모달 열기
    card.addEventListener('click', function(e) {
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

// ========== 스타일 상세 모달 (AI 버튼 포함) ==========

// 스타일 상세 모달 열기 (AI 버튼 추가)
function openStyleModal(style) {
    const modal = document.getElementById('styleModal');
    if (!modal) {
        console.error('❌ styleModal 요소를 찾을 수 없습니다');
        return;
    }
    
    // 모달 내용 설정
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
    
    // AI 체험하기 버튼 추가/업데이트
    addAIButtonToModal(style);
    
    // 모달 표시
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log('스타일 모달 열림:', { 
        code: style.code, 
        name: style.name,
        category: style.mainCategory,
        subcategory: style.subCategory 
    });
}

// 모달에 AI 체험하기 버튼 추가
function addAIButtonToModal(style) {
    const modalActions = document.querySelector('.style-modal-actions');
    if (!modalActions) return;
    
    // 기존 AI 버튼이 있으면 제거
    const existingAIBtn = modalActions.querySelector('.ai-experience-modal-btn');
    if (existingAIBtn) {
        existingAIBtn.remove();
    }
    
    // 새 AI 버튼 생성
    const aiButton = document.createElement('button');
    aiButton.className = 'modal-action-btn ai-experience-modal-btn';
    aiButton.innerHTML = `
        <span class="ai-icon">🤖</span>
        <span>AI 체험하기</span>
    `;
    
    aiButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🤖 모달에서 AI 체험하기 시작:', {
            id: style.id,
            name: style.name,
            imageUrl: style.imageUrl
        });
        
        // AI 사진 업로드 모달 열기
        openAIPhotoModal(style.id, style.name || '스타일', style.imageUrl || '');
    };
    
    // 기존 버튼들 앞에 추가
    modalActions.insertBefore(aiButton, modalActions.firstChild);
}

// ========== AI 체험하기 기능 ==========

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
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: var(--female-color); color: white; border: none; border-radius: 5px; cursor: pointer;">새로고침</button>
        </div>
    `;
}

// ========== 유틸리티 함수들 ==========

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
    
    try {
        // 현재 선택된 스타일 정보 가져오기
        const styleId = modal.dataset.styleId;
        const styleName = modal.dataset.styleName;
        const styleImageUrl = modal.dataset.styleImageUrl;
        const customerImageUrl = previewImage.src;
        
        console.log('AI 처리 시작:', { styleId, styleName, customerImageUrl });
        
        // 데모용 지연 시간
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 성공 시 결과 표시
        showToast('AI 합성이 완료되었습니다!', 'success');
        closeAIPhotoModal();
        
    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast('AI 처리 중 오류가 발생했습니다', 'error');
        
    } finally {
        // 버튼 상태 복원
        processBtn.disabled = false;
        processBtn.innerHTML = originalText;
    }
}

// 모달 닫기 함수들
function closeAIPhotoModal() {
    const modal = document.getElementById('aiPhotoModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        resetPhotoUpload();
    }
}

function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 토스트 메시지 표시
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

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 HAIRGATOR 메뉴 시스템 로드 완료 - 스마트 필터링 완성');
    
    // 모달 바깥 클릭 시 닫기
    document.addEventListener('click', function(e) {
        const styleModal = document.getElementById('styleModal');
        if (styleModal && e.target === styleModal) {
            closeStyleModal();
        }
        
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
window.HAIRGATOR_MENU = {
    loadMenuForGender,
    selectMainTab,
    selectSubTab,
    loadStyles,
    createStyleCard,
    openStyleModal,
    closeStyleModal,
    openAIPhotoModal,
    closeAIPhotoModal,
    updateCategoryDescription,
    showToast,
    checkSubcategoriesAndNew
};

console.log('✅ HAIRGATOR 메뉴 시스템 초기화 완료 - 스마트 필터링 & 모달 AI 버튼');
