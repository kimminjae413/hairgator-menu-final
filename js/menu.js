// ========== 메뉴 시스템 ==========

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

// 스타일 모달 열기 - AI 체험 후 닫기 문제 해결
function openStyleModal(style) {
    console.log('🔍 스타일 모달 열기:', style);
    
    // AI 체험 모달이 열려있다면 먼저 닫기
    const aiModal = document.getElementById('aiExperienceModal');
    if (aiModal) {
        aiModal.style.display = 'none';
    }
    
    // 기존 스타일 모달 표시 로직
    if (typeof showStyleModal === 'function') {
        showStyleModal(style.code, style.name, style.gender, style.imageUrl, style.id);
    }
    
    // 모달 닫기 이벤트 재설정 (중복 방지)
    setTimeout(() => {
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            // 기존 이벤트 제거 후 새로 설정
            modalClose.onclick = null;
            modalClose.removeEventListener('click', hideStyleModal);
            
            modalClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ 새로운 모달 닫기 이벤트 실행');
                hideStyleModal();
            });
        }
    }, 100);
}

