// ========== HAIRGATOR 메뉴 시스템 - 헤어체험 연동 최종 버전 ==========

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

// 사용 가능한 서브카테고리 & NEW 아이템 확인 (인덱스 불필요 버전)
async function checkSubcategoriesAndNew(gender, categoryName) {
    // Firebase 조회용 이름 변환
    const dbCategoryName = categoryName.includes('LENGTH') 
        ? categoryName.replace('LENGTH', 'Length')
        : categoryName;
    
    const cacheKey = `${gender}-${dbCategoryName}`;
    
    if (availableSubcategories.has(cacheKey)) {
        return availableSubcategories.get(cacheKey);
    }
    
    try {
        // 복합 인덱스 없이 작동하도록 수정
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
            
            // 클라이언트에서 7일 이내 확인 (Firebase 쿼리 대신)
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
        
        // 캐시에 저장
        availableSubcategories.set(cacheKey, result);
        
        // 카테고리별 NEW 개수도 저장
        if (totalNewInCategory > 0) {
            categoryNewCounts.set(categoryName, totalNewInCategory);
        }
        
        console.log(`서브카테고리 확인 완료: ${categoryName}`, result);
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
        // 전역 변수 설정 (window와 동기화)
        currentGender = gender;
        window.currentGender = gender;
        
        const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
        
        console.log(`태블릿 호환 ${gender} 메뉴 로드 시작 (${categories.length}개 카테고리)`);
        
        // Firebase 연결 확인
        if (typeof db === 'undefined' || !db) {
            console.warn('Firebase 미연결 - 3초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 3000);
            return;
        }
        
        // DOM 준비 확인
        if (!document.getElementById('categoryTabs')) {
            console.warn('DOM 미준비 - 2초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 2000);
            return;
        }
        
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
        
        console.log(`태블릿 호환 ${gender} 메뉴 로드 완료`);
        
    } catch (error) {
        console.error('태블릿 메뉴 로드 오류:', error);
        // 오류 발생시 5초 후 재시도
        setTimeout(() => loadMenuForGender(gender), 5000);
    }
}

// 대분류 탭 생성 (스마트 필터링 + NEW 표시)
async function createMainTabsWithSmart(categories, gender) {
    const mainTabsContainer = document.getElementById('categoryTabs');
    if (!mainTabsContainer) {
        console.error('categoryTabs 요소를 찾을 수 없습니다');
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
            window.currentMainTab = category; // window 동기화
            console.log(`기본 선택: ${category.name}`, category);
        }
        
        // NEW 표시 추가 (카테고리에 신규 아이템이 있으면)
        if (categoryInfo.totalNewCount > 0) {
            tab.appendChild(createNewIndicator());
            console.log(`NEW 표시 추가: ${category.name} (${categoryInfo.totalNewCount}개)`);
        }
        
        mainTabsContainer.appendChild(tab);
        
        console.log(`카테고리 생성: ${category.name} (신규: ${categoryInfo.totalNewCount}개)`);
    });
    
    console.log(`${categories.length}개 대분류 탭 생성 완료`);
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
            console.log('카테고리 설명 영역 생성됨');
        }
    }
}

// 대분류 탭 선택
async function selectMainTab(category, index) {
    currentMainTab = category;
    window.currentMainTab = category; // window 전역 변수 동기화
    
    console.log(`대분류 선택: ${category.name}`, category);
    
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
        console.warn('카테고리 설명 영역을 찾을 수 없습니다');
        return;
    }
    
    if (category.description) {
        descriptionText.innerHTML = `
            <span class="category-name">${category.name}</span>
            ${category.description}
        `;
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.remove('empty');
        console.log(`카테고리 설명 업데이트: ${category.name}`);
    } else {
        descriptionText.textContent = '카테고리 설명이 없습니다.';
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.add('empty');
    }
}

// 스마트 중분류 탭 로드 (필터링 + NEW 표시 + 비활성화)
async function loadSmartSubTabs(categoryName) {
    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('subTabs 요소를 찾을 수 없습니다');
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
                window.currentSubTab = subCategory; // window 동기화
            }
            
            // NEW 표시 추가
            const newCount = subInfo.newCounts[subCategory];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
                console.log(`중분류 NEW 표시: ${subCategory} (${newCount}개)`);
            }
        }
        
        subTabsContainer.appendChild(tab);
    });
    
    console.log(`스마트 중분류 탭 로드 완료 (사용가능: ${subInfo.available.length}/${SUB_CATEGORIES.length}개, 신규: ${Object.keys(subInfo.newCounts).length}개)`);
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    window.currentSubTab = subCategory; // window 전역 변수 동기화
    
    console.log(`중분류 선택: ${subCategory}`);
    
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
    // window에서 전역 변수 가져오기
    if (!currentGender && window.currentGender) currentGender = window.currentGender;
    if (!currentMainTab && window.currentMainTab) currentMainTab = window.currentMainTab;
    if (!currentSubTab && window.currentSubTab) currentSubTab = window.currentSubTab;
    
    const stylesGrid = document.getElementById('stylesGrid');
    if (!stylesGrid) {
        console.error('stylesGrid 요소를 찾을 수 없습니다');
        return;
    }
    
    // 필수 변수 체크
    if (!currentGender) {
        console.error('currentGender가 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Gender not selected');
        return;
    }
    
    if (!currentMainTab) {
        console.error('currentMainTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Category not selected');
        return;
    }
    
    if (!currentSubTab) {
        console.error('currentSubTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Subcategory not selected');
        return;
    }
    
    // Firebase Query를 위한 안전한 카테고리명 추출
    const mainCategoryName = currentMainTab.name || currentMainTab;
    // Firebase 조회용 이름 변환
    const dbMainCategoryName = mainCategoryName.includes('LENGTH')
        ? mainCategoryName.replace('LENGTH', 'Length')
        : mainCategoryName;
    const subCategoryName = currentSubTab;
    
    console.log(`스타일 검색 시작:`, {
        gender: currentGender,
        mainCategory: dbMainCategoryName,
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
            .where('mainCategory', '==', dbMainCategoryName)
            .where('subCategory', '==', subCategoryName)
            .get();
        
        if (querySnapshot.empty) {
            console.log(`스타일 없음: ${mainCategoryName} - ${subCategoryName}`);
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
        
        console.log(`${styleCount}개 스타일 로드 완료: ${mainCategoryName} - ${subCategoryName}`);
        
    } catch (error) {
        console.error('스타일 로드 오류:', error);
        showErrorState(stylesGrid, `로드 실패: ${error.message}`);
    }
}

// 스타일 카드 생성 (NEW 표시 포함)
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
            name: style.name || 'NO_NAME',
            isNew: isNew
        });
        
        // 스타일 상세 모달 열기
        openStyleModal(style);
    });
    
    return card;
}

// ========== 스타일 상세 모달 (헤어체험 버튼 포함) ==========

// 스타일 상세 모달 열기 (헤어체험 버튼 추가)
function openStyleModal(style) {
    const modal = document.getElementById('styleModal');
    if (!modal) {
        console.error('styleModal 요소를 찾을 수 없습니다');
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
    
    // 헤어체험하기 버튼 추가/업데이트
    // addAIButtonToModal(style);  // ⭐ 헤어체험 버튼 제거
    
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


// ========== 헤어체험 기능 ==========

// 헤어체험 사진 업로드 모달 열기
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    console.log('헤어체험하기 클릭:', {
        styleId: styleId,
        styleName: styleName,
        status: 'ACTIVE'
    });
    
    // 현재 선택된 스타일 정보 저장 (기존 변수명 유지)
    window.currentAIStyleImage = styleImageUrl;
    window.currentAIStyleName = styleName;
    
    // 기존 업로드 모달이 있으면 제거
    const existingModal = document.querySelector('.hair-upload-modal, .photo-upload-modal, .ai-photo-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 헤어체험 업로드 모달 생성
    const modal = document.createElement('div');
    modal.className = 'hair-upload-modal';
    modal.innerHTML = `
        <div class="hair-upload-content">
            <div class="hair-upload-header">
                <h3>✨ 헤어체험하기</h3>
                <p>선택한 스타일: <strong>${styleName}</strong></p>
                <button class="close-upload-btn" onclick="closePhotoUploadModal()">×</button>
            </div>
            
            <div class="hair-upload-body">
                <div class="style-preview">
                    <img src="${styleImageUrl}" alt="${styleName}" class="style-preview-image">
                    <p>적용할 스타일</p>
                </div>
                
                <div class="upload-arrow">→</div>
                
                <div class="customer-photo-section">
                    <!-- 2개 버튼 옵션 (태블릿 최적화) -->
                    <div class="photo-options">
                        <button class="photo-option-btn upload-btn" onclick="selectPhotoFromGallery()">
                            <span class="option-icon">📁</span>
                            <span>갤러리에서 선택</span>
                        </button>
                        <button class="photo-option-btn camera-btn" onclick="takePhotoWithCamera()">
                            <span class="option-icon">📷</span>
                            <span>카메라로 촬영</span>
                        </button>
                    </div>
                    
                    <!-- 숨겨진 input들 -->
                    <input type="file" id="customerPhotoUpload" accept="image/*" style="display: none;">
                    <input type="file" id="customerPhotoCamera" accept="image/*" capture="environment" style="display: none;">
                    
                    <!-- 미리보기 영역 -->
                    <div class="customer-preview" id="customerPreview" style="display: none;">
                        <img id="customerPreviewImage" alt="고객 사진">
                        <button class="change-photo-btn" onclick="changeCustomerPhoto()">사진 변경</button>
                    </div>
                </div>
            </div>
            
            <div class="hair-upload-actions">
                <button class="upload-action-btn cancel-btn" onclick="closePhotoUploadModal()">
                    취소
                </button>
                <button class="upload-action-btn process-btn" id="processBtn" disabled onclick="processAIFaceSwap()">
                    <span class="ai-icon">✨</span>
                    <span>헤어체험 시작</span>
                </button>
            </div>
        </div>
        <div class="hair-upload-overlay" onclick="closePhotoUploadModal()"></div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // 파일 업로드 이벤트 설정
    setupHairUploadEvents();
    
    // 헤어체험 모달 스타일 추가
    addHairUploadModalStyles();
    
    console.log('헤어체험 업로드 모달 표시 완료');
}

// 헤어체험 업로드 이벤트 설정 (수정된 버전)
function setupHairUploadEvents() {
    // 실제 존재하는 input 요소들 가져오기
    const galleryInput = document.getElementById('customerPhotoUpload');
    const cameraInput = document.getElementById('customerPhotoCamera');
    
    console.log('이벤트 설정:', { 
        gallery: !!galleryInput, 
        camera: !!cameraInput 
    });
    
    // 갤러리 input 이벤트
    if (galleryInput) {
        galleryInput.addEventListener('change', (e) => {
            console.log('갤러리에서 파일 선택:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleCustomerPhotoUpload(e.target.files[0]);
            }
        });
    }
    
    // 카메라 input 이벤트
    if (cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            console.log('카메라로 사진 촬영:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleCustomerPhotoUpload(e.target.files[0]);
            }
        });
    }
    
    // 드래그 앤 드롭 (customer-photo-section에 적용)
    const photoSection = document.querySelector('.customer-photo-section');
    if (photoSection) {
        photoSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoSection.classList.add('dragover');
        });
        
        photoSection.addEventListener('dragleave', () => {
            photoSection.classList.remove('dragover');
        });
        
        photoSection.addEventListener('drop', (e) => {
            e.preventDefault();
            photoSection.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleCustomerPhotoUpload(files[0]);
            }
        });
    }
}

// 갤러리에서 사진 선택
function selectPhotoFromGallery() {
    console.log('갤러리 버튼 클릭');
    const fileInput = document.getElementById('customerPhotoUpload');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('customerPhotoUpload 요소를 찾을 수 없음');
    }
}

// 카메라로 사진 촬영
function takePhotoWithCamera() {
    console.log('카메라 버튼 클릭');
    const cameraInput = document.getElementById('customerPhotoCamera');
    if (cameraInput) {
        cameraInput.click();
    } else {
        console.error('customerPhotoCamera 요소를 찾을 수 없음');
    }
}

// 고객 사진 업로드 처리
function handleCustomerPhotoUpload(file) {
    // 파일 형식 검증
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다', 'error');
        return;
    }
    
    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
        showToast('파일 크기는 10MB 이하로 제한됩니다', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        // 전역 변수에 저장 (기존 변수명 유지)
        window.uploadedCustomerPhoto = imageUrl;
        
        // 미리보기 표시
        showCustomerPhotoPreview(imageUrl);
        
        // 처리 버튼 활성화
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.disabled = false;
        }
        
        console.log('고객 사진 업로드 완료');
    };
    
    reader.onerror = function() {
        showToast('이미지 읽기 중 오류가 발생했습니다', 'error');
    };
    
    reader.readAsDataURL(file);
}

// 고객 사진 미리보기 표시
function showCustomerPhotoPreview(imageUrl) {
    // 버튼 영역 숨기기
    const photoOptions = document.querySelector('.photo-options');
    const previewArea = document.getElementById('customerPreview');
    const previewImage = document.getElementById('customerPreviewImage');
    
    if (photoOptions && previewArea && previewImage) {
        photoOptions.style.display = 'none';
        previewArea.style.display = 'block';
        previewImage.src = imageUrl;
    }
}

// 고객 사진 변경
function changeCustomerPhoto() {
    const photoOptions = document.querySelector('.photo-options');
    const previewArea = document.getElementById('customerPreview');
    const processBtn = document.getElementById('processBtn');
    
    if (photoOptions && previewArea) {
        photoOptions.style.display = 'flex';
        previewArea.style.display = 'none';
    }
    
    if (processBtn) {
        processBtn.disabled = true;
    }
    
    window.uploadedCustomerPhoto = null;
}

// 헤어체험 모달 닫기
function closePhotoUploadModal() {
    const modal = document.querySelector('.hair-upload-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// 헤어체험 업로드 모달 스타일 추가
function addHairUploadModalStyles() {
    // 이미 스타일이 추가되었는지 확인
    if (document.getElementById('hair-upload-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'hair-upload-modal-styles';
    style.textContent = `
        /* 헤어체험 업로드 모달 스타일 */
        .hair-upload-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .hair-upload-modal.active {
            opacity: 1;
            visibility: visible;
        }
        
        .hair-upload-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: -1;
        }
        
        .hair-upload-content {
            position: relative;
            background: var(--primary-dark);
            border-radius: 15px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
            min-width: 500px;
        }
        
        .hair-upload-header {
            display: flex;
            flex-direction: column;
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            position: relative;
        }
        
        .hair-upload-header h3 {
            margin: 0 0 10px 0;
            color: var(--text-primary);
            font-size: 18px;
        }
        
        .hair-upload-header p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        .close-upload-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hair-upload-body {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 20px;
        }
        
        .style-preview {
            text-align: center;
            flex-shrink: 0;
        }
        
        .style-preview-image {
            width: 120px;
            height: 160px;
            object-fit: cover;
            border-radius: 10px;
            border: 2px solid var(--border-color);
        }
        
        .style-preview p {
            margin: 10px 0 0 0;
            color: var(--text-secondary);
            font-size: 12px;
        }
        
        .upload-arrow {
            font-size: 24px;
            color: var(--text-secondary);
            flex-shrink: 0;
        }
        
        .customer-photo-section {
            flex: 1;
        }

        /* 태블릿 최적화 사진 선택 버튼 */
        .photo-options {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }

        .photo-option-btn {
            flex: 1;
            padding: 20px;
            border: 2px solid var(--border-color);
            background: transparent;
            border-radius: 15px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            color: var(--text-primary);
            font-size: 14px;
            font-weight: 500;
            min-height: 100px;
        }

        .photo-option-btn:hover {
            border-color: var(--female-color);
            background: rgba(233, 30, 99, 0.05);
            transform: translateY(-2px);
        }

        .photo-option-btn .option-icon {
            font-size: 28px;
        }

        /* 드래그오버 상태 스타일 */
        .customer-photo-section.dragover {
            border: 2px dashed var(--female-color);
            background: rgba(233, 30, 99, 0.05);
            border-radius: 10px;
            padding: 10px;
            transition: all 0.3s ease;
        }

        .customer-photo-section.dragover .photo-options {
            transform: scale(1.02);
        }
        
        .customer-preview {
            text-align: center;
        }
        
        .customer-preview img {
            width: 150px;
            height: 200px;
            object-fit: cover;
            border-radius: 10px;
            border: 2px solid var(--border-color);
            margin-bottom: 15px;
        }
        
        .change-photo-btn {
            background: var(--text-secondary);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 15px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .change-photo-btn:hover {
            background: var(--female-color);
        }
        
        .hair-upload-actions {
            display: flex;
            gap: 10px;
            padding: 20px;
            border-top: 1px solid var(--border-color);
            justify-content: flex-end;
        }
        
        .upload-action-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .cancel-btn {
            background: var(--text-secondary);
            color: white;
        }
        
        .cancel-btn:hover {
            background: #666;
        }
        
        .process-btn {
            background: linear-gradient(135deg, var(--female-color), #c2185b);
            color: white;
        }
        
        .process-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
        }
        
        .process-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* 모바일 반응형 */
        @media (max-width: 767px) {
            .hair-upload-content {
                max-width: 95vw;
                margin: 10px;
                min-width: auto;
            }
            
            .hair-upload-body {
                flex-direction: column;
                gap: 15px;
            }
            
            .upload-arrow {
                transform: rotate(90deg);
            }
            
            .hair-upload-actions {
                flex-direction: column;
            }
            
            .upload-action-btn {
                width: 100%;
                justify-content: center;
            }
            
            .photo-options {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
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

// 모달 닫기 함수들
function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========== 이벤트 리스너 ==========

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('HAIRGATOR 메뉴 시스템 로드 완료 - 헤어체험 연동 최종 버전');
    
    // 모달 바깥 클릭 시 닫기
    document.addEventListener('click', function(e) {
        const styleModal = document.getElementById('styleModal');
        if (styleModal && e.target === styleModal) {
            closeStyleModal();
        }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeStyleModal();
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
    openAIPhotoModal: openAIPhotoModal,
    closeAIPhotoModal: closePhotoUploadModal,
    updateCategoryDescription,
    showToast,
    checkSubcategoriesAndNew,
    // 전역 변수 getter 추가
    getCurrentGender: () => currentGender,
    getCurrentMainTab: () => currentMainTab,
    getCurrentSubTab: () => currentSubTab
};

// HTML에서 직접 호출되는 전역 함수 추가
window.selectGender = function(gender) {
    console.log(`성별 선택: ${gender}`);
    
    // 현재 성별 전역 변수 설정
    currentGender = gender;
    window.currentGender = gender;
    
    // 성별 선택 화면 완전히 숨기기
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const backBtn = document.getElementById('backBtn');
    
    if (genderSelection) {
        genderSelection.style.display = 'none';
        genderSelection.classList.remove('active');
        genderSelection.style.zIndex = '-1';
        genderSelection.style.visibility = 'hidden';
    }
    
    if (menuContainer) {
        menuContainer.style.display = 'block';
        menuContainer.classList.add('active');
        menuContainer.style.zIndex = '1000';
        menuContainer.style.visibility = 'visible';
    }
    
    if (backBtn) {
        backBtn.style.display = 'flex';
    }
    
    // 스마트 메뉴 시스템 로드
    loadMenuForGender(gender);
};

// 헤어체험 관련 전역 함수 노출
window.changeCustomerPhoto = changeCustomerPhoto;
window.closePhotoUploadModal = closePhotoUploadModal;
window.selectPhotoFromGallery = selectPhotoFromGallery;
window.takePhotoWithCamera = takePhotoWithCamera;

// 디버깅용 전역 함수
window.debugHAIRGATOR = function() {
    const tabs = document.querySelectorAll('.category-tab, .main-tab');
    console.log(`발견된 탭: ${tabs.length}개`);
    
    tabs.forEach((tab, index) => {
        const rect = tab.getBoundingClientRect();
        const events = [];
        const hasNewIndicator = !!tab.querySelector('.new-indicator');
        
        if (tab.onclick) events.push('onclick');
        if (tab.addEventListener) {
            events.push('addEventListener');
        }
        
        console.log(`탭 ${index}: "${tab.textContent}"
        - 크기: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}
        - 위치: ${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}
        - 이벤트: ${events.join(', ')}
        - NEW 표시: ${hasNewIndicator ? '🔴' : '⚪'}
        - 클래스: ${tab.className}`);
    });
    
    console.log('전역 변수 상태:', {
        currentGender,
        currentMainTab: currentMainTab?.name,
        currentSubTab,
        windowGender: window.currentGender,
        windowMainTab: window.currentMainTab?.name,
        windowSubTab: window.currentSubTab,
        categoryNewCounts: Object.fromEntries(categoryNewCounts)
    });
};

console.log('HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - 헤어체험 연동 최종 버전');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');

// ========== 뒤로가기 함수 (menu.js 끝부분에 추가) ==========

/**
 * 뒤로가기 버튼 핸들러
 * 메뉴 화면에서 성별 선택 화면으로 돌아가기
 */
window.goBack = function() {
    console.log('🔙 뒤로가기 버튼 클릭');
    
    // 메뉴 컨테이너 숨기기
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
        menuContainer.style.display = 'none';
        menuContainer.classList.remove('active');
        console.log('✅ 메뉴 컨테이너 숨김');
    }
    
    // 성별 선택 화면 다시 표시
    const genderSelection = document.getElementById('genderSelection');
    if (genderSelection) {
        genderSelection.classList.remove('active');
        genderSelection.style.display = 'flex';
        genderSelection.style.position = 'relative';
        genderSelection.style.zIndex = '1';
        genderSelection.style.opacity = '1';
        genderSelection.style.visibility = 'visible';
        console.log('✅ 성별 선택 화면 표시');
    }
    
    // 뒤로가기 버튼 숨기기
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.style.display = 'none';
        console.log('✅ 뒤로가기 버튼 숨김');
    }
    
    // 성별 초기화
    currentGender = null;
    window.currentGender = null;
    console.log('✅ 성별 초기화 완료');
};

// ========== 기존 console.log 유지 ==========
console.log('HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - 헤어체험 연동 최종 버전');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');
console.log('🔙 뒤로가기: window.goBack() 함수 등록 완료');
