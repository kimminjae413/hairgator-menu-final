// ===============================================
// HAIRGATOR 메뉴 시스템 - nano_banana 통합 버전
// js/menu.js - nano_banana Image-to-Image 모델 사용
// ===============================================

// 🔧 수정: GPT AI 버튼을 nano_banana로 교체
function addAIButtonToModal(style) {
    const modalActions = document.querySelector('.style-modal-actions');
    if (!modalActions) return;
    
    // ✅ 핵심 수정: 스타일 모달에서만 기존 AI 버튼 제거 (nano_banana 모달 보호)
    const styleModal = document.getElementById('styleModal');
    
    // 현재 modalActions가 스타일 모달 내부에 있는지 확인
    const isInStyleModal = styleModal && styleModal.contains(modalActions);
    
    if (isInStyleModal) {
        // 스타일 모달 내부에서만 기존 AI 버튼 제거
        const existingAIBtns = modalActions.querySelectorAll('.ai-experience-modal-btn, .gpt-ai-experience-modal-btn, .nano-banana-ai-btn');
        existingAIBtns.forEach(btn => {
            console.log('✅ 기존 AI 버튼 제거 (스타일 모달만):', btn.className);
            btn.remove();
        });
    } else {
        // nano_banana 모달이나 다른 곳에서는 기존 버튼 제거하지 않음
        console.log('🛡️ nano_banana 모달 또는 외부 영역 - 기존 버튼 제거 건너뛰기');
        return; // nano_banana 모달에서는 버튼 추가도 하지 않음
    }
    
    // ✅ AI 헤어체험 버튼 생성 (스타일 모달에서만)
    const aiExperienceButton = document.createElement('button');
    aiExperienceButton.className = 'modal-action-btn ai-experience-modal-btn';
    aiExperienceButton.innerHTML = `
        <span class="ai-icon">🎨</span>
        <span>AI 헤어체험하기</span>
        <span class="new-badge">NEW</span>
    `;
    
    aiExperienceButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎨 AI 헤어체험 시작:', {
            id: style.id,
            name: style.name,
            imageUrl: style.imageUrl
        });
        
        // AI 헤어체험 모달 열기 (nano_banana 기반)
        console.log('헤어체험 함수 확인:', typeof window.openAIHairModal);

        if (typeof window.openAIHairModal === 'function') {
            window.openAIHairModal(style);
        } else {
            // 함수가 아직 로드되지 않았다면 잠시 대기
            console.log('⏳ AI 헤어체험 시스템 로딩 중...');
            
            // nano-banana-hair.js 동적 로드
            if (!document.querySelector('script[src*="nano-banana-hair.js"]')) {
                const script = document.createElement('script');
                script.src = '/js/nano-banana-hair.// ===============================================
// HAIRGATOR 메뉴 시스템 - AI 헤어체험 통합 완전 버전
// js/menu.js - 기존 스마트 필터링 + NEW 시스템 + AI 통합
// ===============================================

// 🔧 수정: AI 헤어체험 버튼을 기존 시스템에 완전 통합
function addAIButtonToModal(style) {
    const modalActions = document.querySelector('.style-modal-actions');
    if (!modalActions) return;
    
    // ✅ 핵심 수정: 스타일 모달에서만 기존 AI 버튼 제거 (AI 모달 보호)
    const styleModal = document.getElementById('styleModal');
    
    // 현재 modalActions가 스타일 모달 내부에 있는지 확인
    const isInStyleModal = styleModal && styleModal.contains(modalActions);
    
    if (isInStyleModal) {
        // 스타일 모달 내부에서만 기존 AI 버튼 제거
        const existingAIBtns = modalActions.querySelectorAll('.ai-experience-modal-btn, .gpt-ai-experience-modal-btn, .nano-banana-ai-btn');
        existingAIBtns.forEach(btn => {
            console.log('✅ 기존 AI 버튼 제거 (스타일 모달만):', btn.className);
            btn.remove();
        });
    } else {
        // AI 모달이나 다른 곳에서는 기존 버튼 제거하지 않음
        console.log('🛡️ AI 모달 또는 외부 영역 - 기존 버튼 제거 건너뛰기');
        return; // AI 모달에서는 버튼 추가도 하지 않음
    }
    
    // ✅ AI 헤어체험 버튼 생성 (스타일 모달에서만)
    const aiExperienceButton = document.createElement('button');
    aiExperienceButton.className = 'modal-action-btn ai-experience-modal-btn';
    aiExperienceButton.innerHTML = `
        <span class="ai-icon">🎨</span>
        <span>AI 헤어체험하기</span>
        <span class="new-badge">NEW</span>
    `;
    
    aiExperienceButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎨 AI 헤어체험 시작:', {
            id: style.id,
            name: style.name,
            imageUrl: style.imageUrl
        });
        
        // AI 헤어체험 모달 열기 (nano_banana 기반)
        console.log('헤어체험 함수 확인:', typeof window.openAIHairModal);

        if (typeof window.openAIHairModal === 'function') {
            window.openAIHairModal(style);
        } else {
            // 함수가 아직 로드되지 않았다면 잠시 대기
            console.log('⏳ AI 헤어체험 시스템 로딩 중...');
            
            // nano-banana-hair.js 동적 로드
            if (!document.querySelector('script[src*="nano-banana-hair.js"]')) {
                const script = document.createElement('script');
                script.src = '/js/nano-banana-hair.js';
                script.onload = function() {
                    if (typeof window.openAIHairModal === 'function') {
                        window.openAIHairModal(style);
                    } else {
                        console.error('AI 헤어체험 시스템 로드 실패');
                        showToast('AI 헤어체험 시스템을 불러올 수 없습니다', 'error');
                    }
                };
                script.onerror = function() {
                    console.error('nano-banana-hair.js 로드 실패');
                    showToast('AI 헤어체험 기능을 사용할 수 없습니다', 'error');
                };
                document.head.appendChild(script);
            } else {
                setTimeout(() => {
                    if (typeof window.openAIHairModal === 'function') {
                        window.openAIHairModal(style);
                    } else {
                        console.error('AI 헤어체험 시스템이 로드되지 않았습니다');
                        showToast('AI 헤어체험 시스템 로드 중... 잠시 후 다시 시도해주세요', 'info');
                    }
                }, 1000);
            }
        }
    };
    
    // 기존 버튼들 앞에 추가
    modalActions.insertBefore(aiExperienceButton, modalActions.firstChild);
    
    console.log('✅ AI 헤어체험 버튼 추가 완료 (스타일 모달)');
}

// ✅ 기존 AKOOL 시스템 비활성화 (AI 헤어체험으로 리다이렉트)
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    console.log('🚫 기존 AKOOL 시스템 호출 차단됨 - AI 헤어체험으로 리다이렉트');
    showToast('🆕 새로운 AI 헤어체험으로 업그레이드되었습니다!', 'info');
    
    // AI 헤어체험 시스템이 로드되어 있다면 리다이렉트
    if (window.openAIHairModal) {
        const style = { id: styleId, name: styleName, imageUrl: styleImageUrl };
        window.openAIHairModal(style);
    }
}

// ========== 기존 시스템 그대로 유지 ==========

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
    // ✅ 추가: Firebase 조회용 이름 변환
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
            .where('mainCategory', '==', dbCategoryName)  // ✅ categoryName을 dbCategoryName으로 변경
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
        // 전역 변수 설정 (window와 동기화)
        currentGender = gender;
        window.currentGender = gender;
        
        const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
        
        console.log(`🔄 태블릿 호환 ${gender} 메뉴 로드 시작 (${categories.length}개 카테고리)`);
        
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
        
        console.log(`✅ 태블릿 호환 ${gender} 메뉴 로드 완료`);
        
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
            window.currentMainTab = category; // window 동기화
            console.log(`📌 기본 선택: ${category.name}`, category);
        }
        
        // NEW 표시 추가 (카테고리에 신규 아이템이 있으면)
        if (categoryInfo.totalNewCount > 0) {
            tab.appendChild(createNewIndicator());
            console.log(`🔴 NEW 표시 추가: ${category.name} (${categoryInfo.totalNewCount}개)`);
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
    window.currentMainTab = category; // window 전역 변수 동기화
    
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
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.remove('empty');
        console.log(`📝 카테고리 설명 업데이트: ${category.name}`);
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
                window.currentSubTab = subCategory; // window 동기화
            }
            
            // NEW 표시 추가
            const newCount = subInfo.newCounts[subCategory];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
                console.log(`🔴 중분류 NEW 표시: ${subCategory} (${newCount}개)`);
            }
        }
        
        subTabsContainer.appendChild(tab);
    });
    
    console.log(`📋 스마트 중분류 탭 로드 완료 (사용가능: ${subInfo.available.length}/${SUB_CATEGORIES.length}개, 신규: ${Object.keys(subInfo.newCounts).length}개)`);
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    window.currentSubTab = subCategory; // window 전역 변수 동기화
    
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
    // window에서 전역 변수 가져오기
    if (!currentGender && window.currentGender) currentGender = window.currentGender;
    if (!currentMainTab && window.currentMainTab) currentMainTab = window.currentMainTab;
    if (!currentSubTab && window.currentSubTab) currentSubTab = window.currentSubTab;
    
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
    // ✅ 추가: Firebase 조회용 이름 변환
    const dbMainCategoryName = mainCategoryName.includes('LENGTH')
        ? mainCategoryName.replace('LENGTH', 'Length')
        : mainCategoryName;
    const subCategoryName = currentSubTab;
    
    console.log(`🔍 스타일 검색 시작:`, {
        gender: currentGender,
        mainCategory: dbMainCategoryName,  // ✅ 변경
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
            .where('mainCategory', '==', dbMainCategoryName)  // ✅ mainCategoryName을 dbMainCategoryName으로 변경
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
            name: style.name || 'NO_NAME',
            isNew: isNew
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
    console.log('🚀 HAIRGATOR 메뉴 시스템 로드 완료 - AI 헤어체험 통합 완전 버전');
    
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
    closeAIPhotoModal: function() { /* AI 모달 닫기 함수 */ },
    updateCategoryDescription,
    showToast,
    checkSubcategoriesAndNew,
    // 전역 변수 getter 추가
    getCurrentGender: () => currentGender,
    getCurrentMainTab: () => currentMainTab,
    getCurrentSubTab: () => currentSubTab
};

// ✅ 여기에 추가하세요! (4줄 추가)
window.loadMenuForGender = loadMenuForGender;
window.selectMainTab = selectMainTab;
window.selectSubTab = selectSubTab;
window.loadStyles = loadStyles;

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
    console.log(`🔍 발견된 탭: ${tabs.length}개`);
    
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

console.log('✅ HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - AI 헤어체험 통합 버전');
console.log('💡 디버깅: window.debugHAIRGATOR() 실행 가능');

