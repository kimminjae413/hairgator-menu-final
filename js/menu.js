// ========== HAIRGATOR 메뉴 시스템 - 최종 버전 (AKOOL 제거) ==========

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
window.currentGender = null;
window.currentMainTab = null;
window.currentSubTab = null;

// NEW 개수 저장 (카테고리별)
const categoryNewCounts = new Map();

// ========== 메뉴 로드 함수 ==========

// 성별에 따른 메뉴 로드
async function loadMenuForGender(gender) {
    console.log(`${gender === 'male' ? '남성' : '여성'} 메뉴 로드 시작`);
    
    currentGender = gender;
    window.currentGender = gender;
    
    const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
    const categoryTabsContainer = document.getElementById('categoryTabs');
    const subCategoryTabsContainer = document.getElementById('subCategoryTabs');
    const stylesContainer = document.getElementById('stylesContainer');
    
    if (!categoryTabsContainer || !subCategoryTabsContainer || !stylesContainer) {
        console.error('필수 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // 전체 데이터 로드
    await checkSubcategoriesAndNew(gender);
    
    // 카테고리 탭 생성
    categoryTabsContainer.innerHTML = categories.map((cat, index) => {
        const newCount = categoryNewCounts.get(cat.name) || 0;
        const newIndicator = newCount > 0 ? `<span class="new-indicator">NEW ${newCount}</span>` : '';
        
        return `
            <div class="category-tab main-tab ${index === 0 ? 'active' : ''}" 
                 data-category="${cat.name}"
                 onclick="selectMainTab('${cat.name}')">
                ${cat.name}
                ${newIndicator}
            </div>
        `;
    }).join('');
    
    // 첫 번째 카테고리 자동 선택
    selectMainTab(categories[0].name);
    
    console.log(`태블릿 호환 ${gender} 메뉴 로드 완료`);
}

// 메인 탭 선택
async function selectMainTab(categoryName) {
    console.log('메인 탭 선택:', categoryName);
    
    // 이전 활성 탭 제거
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 새 탭 활성화
    const selectedTab = document.querySelector(`.main-tab[data-category="${categoryName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // 현재 선택된 카테고리 저장
    const categories = currentGender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
    currentMainTab = categories.find(cat => cat.name === categoryName);
    window.currentMainTab = currentMainTab;
    
    // 카테고리 설명 업데이트
    updateCategoryDescription(currentMainTab);
    
    // 서브 카테고리 탭 로드
    await loadSubTabs(categoryName);
}

// 서브 카테고리 탭 로드
async function loadSubTabs(mainCategory) {
    const subCategoryTabsContainer = document.getElementById('subCategoryTabs');
    if (!subCategoryTabsContainer) return;
    
    // 해당 대분류의 서브카테고리 확인
    const querySnapshot = await db.collection('hairstyles')
        .where('gender', '==', currentGender)
        .where('mainCategory', '==', mainCategory)
        .get();
    
    const availableSubCategories = new Set();
    const newCountBySubCategory = new Map();
    
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const subCategory = data.subCategory || 'None';
        availableSubCategories.add(subCategory);
        
        // NEW 표시 확인 (7일 이내)
        if (data.createdAt) {
            const createdDate = data.createdAt.toDate();
            const now = new Date();
            const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= 7) {
                newCountBySubCategory.set(
                    subCategory, 
                    (newCountBySubCategory.get(subCategory) || 0) + 1
                );
            }
        }
    });
    
    // 서브 카테고리 탭 생성 (사용 가능한 것만)
    const subTabsHTML = SUB_CATEGORIES
        .filter(subCat => availableSubCategories.has(subCat))
        .map((subCat, index) => {
            const newCount = newCountBySubCategory.get(subCat) || 0;
            const newIndicator = newCount > 0 ? `<span class="new-indicator">NEW ${newCount}</span>` : '';
            
            return `
                <div class="category-tab sub-tab ${index === 0 ? 'active' : ''}" 
                     data-subcategory="${subCat}"
                     onclick="selectSubTab('${subCat}')">
                    ${subCat}
                    ${newIndicator}
                </div>
            `;
        }).join('');
    
    subCategoryTabsContainer.innerHTML = subTabsHTML;
    
    const availableCount = SUB_CATEGORIES.filter(sub => availableSubCategories.has(sub)).length;
    const newTotal = Array.from(newCountBySubCategory.values()).reduce((a, b) => a + b, 0);
    
    console.log(`스마트 중분류 탭 로드 완료 (사용가능: ${availableCount}/${SUB_CATEGORIES.length}개, 신규: ${newTotal}개)`);
    
    // 첫 번째 서브 카테고리 자동 선택
    const firstAvailableSubCat = SUB_CATEGORIES.find(sub => availableSubCategories.has(sub));
    if (firstAvailableSubCat) {
        selectSubTab(firstAvailableSubCat);
    }
}

// 서브 탭 선택
function selectSubTab(subCategory) {
    console.log('서브 탭 선택:', subCategory);
    
    // 이전 활성 탭 제거
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 새 탭 활성화
    const selectedTab = document.querySelector(`.sub-tab[data-subcategory="${subCategory}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // 현재 선택된 서브 카테고리 저장
    currentSubTab = subCategory;
    window.currentSubTab = subCategory;
    
    // 스타일 로드
    loadStyles(currentMainTab.name, subCategory);
}

// 스타일 로드
async function loadStyles(mainCategory, subCategory) {
    console.log('스타일 검색 시작:', {
        gender: currentGender,
        mainCategory: mainCategory,
        subCategory: subCategory
    });
    
    const stylesContainer = document.getElementById('stylesContainer');
    if (!stylesContainer) return;
    
    showLoadingState(stylesContainer);
    
    try {
        let query = db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', mainCategory);
        
        if (subCategory !== 'None') {
            query = query.where('subCategory', '==', subCategory);
        }
        
        const querySnapshot = await query.get();
        
        if (querySnapshot.empty) {
            showEmptyState(stylesContainer);
            return;
        }
        
        // 스타일 카드 생성
        const styles = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            styles.push({
                id: doc.id,
                ...data
            });
        });
        
        // 카드 렌더링
        stylesContainer.innerHTML = styles.map(style => createStyleCard(style)).join('');
        
        console.log(`${styles.length}개 스타일 로드 완료: ${mainCategory} - ${subCategory}`);
        
    } catch (error) {
        console.error('스타일 로드 실패:', error);
        showErrorState(stylesContainer, error.message);
    }
}

// 스타일 카드 생성
function createStyleCard(style) {
    const isNew = style.createdAt && isRecentlyAdded(style.createdAt.toDate());
    const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';
    
    // 미디어 데이터 확인
    const hasMedia = style.media && (style.media.images?.length > 0 || style.media.video);
    const imageCount = style.media?.images?.length || 1;
    const mediaIndicator = imageCount > 1 ? `<span class="media-count">📷 ${imageCount}</span>` : '';
    
    return `
        <div class="style-card" onclick="openStyleModal('${style.id}')">
            ${newBadge}
            ${mediaIndicator}
            <div class="style-image-container">
                <img src="${style.imageUrl}" alt="${style.name}" class="style-image">
            </div>
            <div class="style-info">
                <div class="style-code">${style.code}</div>
                <div class="style-name">${style.name}</div>
            </div>
        </div>
    `;
}

// 최근 추가 여부 확인 (7일 이내)
function isRecentlyAdded(createdDate) {
    const now = new Date();
    const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}

// 서브카테고리 및 NEW 개수 미리 확인
async function checkSubcategoriesAndNew(gender) {
    try {
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .get();
        
        const categoryData = new Map();
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const mainCat = data.mainCategory;
            
            if (!categoryData.has(mainCat)) {
                categoryData.set(mainCat, { newCount: 0 });
            }
            
            // NEW 카운트
            if (data.createdAt) {
                const createdDate = data.createdAt.toDate();
                if (isRecentlyAdded(createdDate)) {
                    const catData = categoryData.get(mainCat);
                    catData.newCount++;
                    categoryData.set(mainCat, catData);
                }
            }
        });
        
        // 전역 맵에 저장
        categoryData.forEach((data, mainCat) => {
            categoryNewCounts.set(mainCat, data.newCount);
        });
        
    } catch (error) {
        console.error('서브카테고리 확인 실패:', error);
    }
}

// 카테고리 설명 업데이트
function updateCategoryDescription(category) {
    const descContainer = document.getElementById('categoryDescription');
    if (descContainer && category) {
        descContainer.textContent = category.description || '';
        console.log('카테고리 설명 업데이트:', category.name);
    }
}

// ========== 모달 관련 함수 ==========

// 스타일 모달 열기
async function openStyleModal(styleId) {
    try {
        const doc = await db.collection('hairstyles').doc(styleId).get();
        
        if (!doc.exists) {
            console.error('스타일을 찾을 수 없습니다');
            return;
        }
        
        const style = { id: doc.id, ...doc.data() };
        showStyleDetail(style);
        
    } catch (error) {
        console.error('스타일 로드 실패:', error);
        showToast('스타일을 불러올 수 없습니다', 'error');
    }
}

// 스타일 상세 표시
function showStyleDetail(style) {
    const modal = document.getElementById('styleModal');
    if (!modal) return;
    
    // 미디어 뷰어가 있으면 사용
    if (window.mediaViewer) {
        window.mediaViewer.loadMedia(style);
    }
    
    // 스타일 코드 표시
    const codeElement = document.getElementById('styleModalCode');
    if (codeElement) {
        codeElement.textContent = style.code || 'N/A';
    }
    
    // 스타일 이름 표시
    const nameElement = document.getElementById('styleModalName');
    if (nameElement) {
        nameElement.textContent = style.name || '';
    }
    
    // 상세 정보 표시
    const detailsContainer = document.querySelector('.style-modal-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="style-detail-row">
                <span class="style-detail-label">카테고리</span>
                <span class="style-detail-value">${style.mainCategory || '-'}</span>
            </div>
            <div class="style-detail-row">
                <span class="style-detail-label">서브카테고리</span>
                <span class="style-detail-value">${style.subCategory || 'None'}</span>
            </div>
            <div class="style-detail-row">
                <span class="style-detail-label">성별</span>
                <span class="style-detail-value">${style.gender === 'male' ? '남성' : 
                                                 style.gender === 'female' ? '여성' : '-'}</span>
            </div>
        `;
    }
    
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
    console.log('HAIRGATOR 메뉴 시스템 로드 완료');
    
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
    
    // 성별 선택 화면 숨기기
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const backBtn = document.getElementById('backBtn');
    
    if (genderSelection) genderSelection.style.display = 'none';
    if (menuContainer) menuContainer.classList.add('active');
    if (backBtn) backBtn.style.display = 'flex';
    
    // 스마트 메뉴 시스템 로드
    loadMenuForGender(gender);
};

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

console.log('HAIRGATOR 메뉴 시스템 초기화 완료');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');
