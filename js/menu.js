// ========== 메뉴 시스템 (AI 체험 기능 통합) ==========

// 남성 카테고리
const MALE_CATEGORIES = [
    'SIDE FRINGE',
    'SIDE PART',
    'FRINGE UP',
    'PUSHED BACK',
    'BUZZ',
    'CROP',
    'MOHICAN'
];

// 여성 카테고리
const FEMALE_CATEGORIES = [
    'A Length',
    'B Length',
    'C Length',
    'D Length',
    'E Length',
    'F Length',
    'G Length',
    'H Length'
];

// 중분류 (앞머리 길이)
const SUB_CATEGORIES = [
    'None',
    'Fore Head',
    'Eye Brow',
    'Eye',
    'Cheekbone'
];

// 성별에 따른 메뉴 로드
function loadMenuForGender(gender) {
    const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
    
    // 대분류 탭 생성
    const mainTabsContainer = document.getElementById('mainTabs');
    mainTabsContainer.innerHTML = '';
    
    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = 'main-tab';
        tab.textContent = category;
        tab.onclick = () => selectMainTab(category, index);
        
        if (index === 0) {
            tab.classList.add('active');
            selectMainTab(category, 0);
        }
        
        mainTabsContainer.appendChild(tab);
    });
}

// 대분류 탭 선택
function selectMainTab(category, index) {
    currentMainTab = category;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // 중분류 탭 표시
    loadSubTabs();
    
    // 스타일 로드
    loadStyles();
}

// 중분류 탭 로드
function loadSubTabs() {
    const subTabsContainer = document.getElementById('subTabs');
    subTabsContainer.innerHTML = '';
    
    SUB_CATEGORIES.forEach((subCategory, index) => {
        const tab = document.createElement('button');
        tab.className = 'sub-tab';
        tab.textContent = subCategory;
        tab.onclick = () => selectSubTab(subCategory, index);
        
        if (index === 0) {
            tab.classList.add('active');
        }
        
        subTabsContainer.appendChild(tab);
    });
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // 스타일 로드
    loadStyles();
}

// 스타일 로드
async function loadStyles() {
    const stylesGrid = document.getElementById('stylesGrid');
    
    // 로딩 표시
    stylesGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <div class="empty-title">로딩중...</div>
        </div>
    `;
    
    try {
        // Firebase에서 스타일 가져오기
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', currentMainTab)
            .where('subCategory', '==', currentSubTab)
            .get();
        
        if (querySnapshot.empty) {
            stylesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">스타일 없음</div>
                    <div class="empty-message">해당 카테고리에 등록된 스타일이 없습니다</div>
                </div>
            `;
            return;
        }
        
        // 스타일 카드 생성
        stylesGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const style = doc.data();
            const card = createStyleCard(style);
            stylesGrid.appendChild(card);
        });
        
    } catch (error) {
        console.error('스타일 로드 오류:', error);
        stylesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title">오류 발생</div>
                <div class="empty-message">${error.message}</div>
            </div>
        `;
    }
}

// 스타일 카드 생성
function createStyleCard(style) {
    const card = document.createElement('div');
    card.className = 'style-card';
    card.onclick = () => openStyleModal(style);
    
    card.innerHTML = `
        <img class="style-image" src="${style.imageUrl || ''}" alt="${style.name}" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="style-info">
            <div class="style-code">${style.code || 'NO CODE'}</div>
            <div class="style-name">${style.name || '이름 없음'}</div>
        </div>
    `;
    
    return card;
}

// ========== 스타일 모달 시스템 (AI 체험 기능 통합) ==========

// 스타일 상세 모달 열기 (기존 + AI 버튼 추가)
function openStyleModal(style, docId = null) {
    const modal = document.getElementById('styleModal');
    const modalImage = document.getElementById('styleModalImage');
    const modalCode = document.getElementById('styleModalCode');
    const modalName = document.getElementById('styleModalName');
    const modalCategory = document.getElementById('styleModalCategory');
    const modalSubcategory = document.getElementById('styleModalSubcategory');
    const modalGender = document.getElementById('styleModalGender');
    
    // 모달 정보 설정
    modalImage.src = style.imageUrl || '';
    modalImage.onerror = function() {
        this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.style.display = 'block';
    };
    
    modalCode.textContent = style.code || 'NO CODE';
    modalName.textContent = style.name || '이름 없음';
    modalCategory.textContent = style.mainCategory || '-';
    modalSubcategory.textContent = style.subCategory || '-';
    modalGender.textContent = style.gender === 'male' ? '남성' : style.gender === 'female' ? '여성' : '미분류';
    
    // AI 체험하기 버튼 추가
    addAIExperienceButton(style);
    
    // 모달 표시
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 모달 닫기 이벤트 설정
    setupModalCloseEvents(modal);
}

// 모달 닫기 이벤트 설정
function setupModalCloseEvents(modal) {
    const closeBtn = document.getElementById('styleModalClose');
    if (closeBtn) {
        closeBtn.onclick = closeStyleModal;
    }
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeStyleModal();
        }
    };
}

// 스타일 모달 닫기
function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// AI 체험하기 버튼 추가 (토큰 시스템 연동)
function addAIExperienceButton(style) {
    // 기존 AI 버튼 제거
    const existingAIBtn = document.getElementById('btnAIExperience');
    if (existingAIBtn) {
        existingAIBtn.remove();
    }
    
    // 모달 정보 섹션 찾기
    const modalInfo = document.querySelector('.style-modal-info');
    if (!modalInfo) {
        console.warn('스타일 모달 정보 섹션을 찾을 수 없습니다');
        return;
    }
    
    // AI 체험하기 버튼 생성
    const aiButton = createAIButton(style);
    
    // 모달에 버튼 추가
    modalInfo.appendChild(aiButton);
    
    console.log('AI 체험하기 버튼 추가됨:', style.name);
}

// AI 버튼 요소 생성
function createAIButton(style) {
    const aiButton = document.createElement('button');
    aiButton.id = 'btnAIExperience';
    aiButton.className = 'modal-btn btn-ai-experience';
    
    // 버튼 스타일 설정
    aiButton.style.cssText = `
        background: linear-gradient(135deg, #FF1493, #FF69B4);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 20px auto 0;
        min-width: 200px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
    `;
    
    aiButton.innerHTML = `
        <span class="ai-icon" style="font-size: 20px;">🤖</span>
        <span>AI 체험하기</span>
    `;
    
    // 호버 효과 추가
    addButtonHoverEffects(aiButton);
    
    // 클릭 이벤트 - 토큰 시스템과 연동
    aiButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 햅틱 피드백
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // 토큰 시스템과 연동하여 AI 체험 시작
        startAIExperienceWithTokens(style);
    };
    
    return aiButton;
}

// 버튼 호버 효과 추가
function addButtonHoverEffects(button) {
    button.onmouseover = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(255, 20, 147, 0.4)';
    };
    
    button.onmouseout = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 15px rgba(255, 20, 147, 0.3)';
    };
}

// AI 체험 시작 (토큰 시스템과 연동)
async function startAIExperienceWithTokens(style) {
    try {
        // 토큰 시스템을 통한 권한 및 토큰 체크
        const result = await executeWithTokens('AI_FACE_ANALYSIS', async () => {
            console.log('AI 체험 권한 확인됨 - 5토큰 차감됨');
            
            // AI 체험 모달 열기 (기존 akool-service.js 함수 활용)
            openAIExperience(style.imageUrl, style.name);
            
            return true;
        });
        
        if (!result) {
            console.log('AI 체험 권한 없음 또는 토큰 부족');
        }
        
    } catch (error) {
        console.error('AI 체험 시작 오류:', error);
        showToast(`AI 체험 시작 실패: ${error.message}`, 'error');
    }
}

// 전역 변수 (기존 호환성)
let currentGender = 'male';
let currentMainTab = '';
let currentSubTab = '';

console.log('메뉴 시스템 로드 완료 - AI 체험 기능 통합됨');
