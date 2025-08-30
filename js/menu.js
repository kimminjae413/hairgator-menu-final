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
    window.currentMainTab = category;
    
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
    window.currentSubTab = subCategory;
    
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
            .where('gender', '==', window.currentGender)
            .where('mainCategory', '==', window.currentMainTab)
            .where('subCategory', '==', window.currentSubTab)
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
            
            // window.currentStyleData 설정
            window.currentStyleData = style;
            
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

// ========== 🎨 3가지 테마 시스템 ==========

// 현재 테마 상태 추적
let currentTheme = 'luxury'; // luxury, minimal, warm

// 3가지 테마 정의
const THEMES = {
    luxury: {
        name: '✨ 고급 헤어샵',
        icon: '✨',
        description: '다크블루그레이 + 골드 액센트',
        dataTheme: null // 기본 테마이므로 null
    },
    minimal: {
        name: '🎯 모던 미니멀', 
        icon: '🎯',
        description: '순수 화이트 + 검정',
        dataTheme: 'minimal'
    },
    warm: {
        name: '🤎 따뜻한 프로페셔널',
        icon: '🤎', 
        description: '브라운 + 베이지 톤',
        dataTheme: 'warm'
    }
};

// 테마 순환 전환 함수 (기존 toggleTheme 대체)
function switchTheme() {
    // 다음 테마로 순환
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = themeKeys[nextIndex];
    
    // 테마 적용
    applyTheme(nextTheme);
    
    // 현재 테마 업데이트
    currentTheme = nextTheme;
    
    // localStorage에 저장
    localStorage.setItem('hairgator_theme', nextTheme);
    
    // UI 업데이트
    updateThemeButton();
    
    // 퍼스널 컬러와 동기화
    syncThemeWithPersonalColor(nextTheme);
    
    // 토스트 메시지
    if (typeof showToast === 'function') {
        showToast(`${THEMES[nextTheme].name}로 변경되었습니다`, 'success');
    }
    
    console.log('테마 전환:', THEMES[nextTheme].name);
}

// 테마 적용 함수
function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;
    
    // body의 data-theme 속성 설정
    if (theme.dataTheme) {
        document.body.setAttribute('data-theme', theme.dataTheme);
    } else {
        document.body.removeAttribute('data-theme');
    }
    
    // 기존 light-theme 클래스 제거 (하위 호환성)
    document.body.classList.remove('light-theme');
    
    // 부드러운 전환을 위한 클래스 추가
    document.body.classList.add('theme-transitioning');
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 300);
}

// 테마 버튼 UI 업데이트
function updateThemeButton() {
    const themeButtonText = document.getElementById('themeButtonText');
    if (themeButtonText) {
        const theme = THEMES[currentTheme];
        themeButtonText.textContent = `${theme.icon} ${theme.name}`;
    }
}

// 테마 로드 함수 (기존 함수 업그레이드)
function loadTheme() {
    // localStorage에서 테마 불러오기
    const savedTheme = localStorage.getItem('hairgator_theme') || 'luxury';
    
    // 기존 light 테마 마이그레이션
    if (savedTheme === 'light') {
        currentTheme = 'minimal';
        localStorage.setItem('hairgator_theme', 'minimal');
    } else if (savedTheme === 'dark') {
        currentTheme = 'luxury';  
        localStorage.setItem('hairgator_theme', 'luxury');
    } else if (THEMES[savedTheme]) {
        currentTheme = savedTheme;
    } else {
        currentTheme = 'luxury';
    }
    
    // 테마 적용
    applyTheme(currentTheme);
    
    // 버튼 텍스트 업데이트
    updateThemeButton();
    
    console.log('테마 로드:', THEMES[currentTheme].name);
}

// 기존 toggleTheme 함수를 switchTheme로 리다이렉트 (하위 호환성)
function toggleTheme() {
    switchTheme();
}

// 퍼스널 컬러와 테마 동기화
function syncThemeWithPersonalColor(themeName) {
    try {
        // 퍼스널 컬러 iframe이 있는 경우 메시지 전송
        const personalColorFrame = document.getElementById('personalColorFrame');
        if (personalColorFrame && personalColorFrame.contentWindow) {
            const themeData = {
                type: 'THEME_CHANGE',
                theme: themeName,
                themeInfo: THEMES[themeName]
            };
            
            personalColorFrame.contentWindow.postMessage(themeData, '*');
            console.log('퍼스널 컬러에 테마 동기화:', themeName);
        }
    } catch (error) {
        console.log('퍼스널 컬러 테마 동기화 실패:', error.message);
    }
}

// 퍼스널 컬러로부터 테마 변경 메시지 수신
window.addEventListener('message', function(event) {
    try {
        if (event.data.type === 'THEME_SYNC_REQUEST') {
            // 퍼스널 컬러에서 현재 테마 정보 요청
            const themeData = {
                type: 'THEME_SYNC_RESPONSE',
                theme: currentTheme,
                themeInfo: THEMES[currentTheme]
            };
            event.source.postMessage(themeData, event.origin);
        } else if (event.data.type === 'THEME_CHANGE_FROM_PC') {
            // 퍼스널 컬러에서 테마 변경 요청
            const requestedTheme = event.data.theme;
            if (THEMES[requestedTheme] && requestedTheme !== currentTheme) {
                applyTheme(requestedTheme);
                currentTheme = requestedTheme;
                localStorage.setItem('hairgator_theme', requestedTheme);
                updateThemeButton();
                
                console.log('퍼스널 컬러로부터 테마 변경:', THEMES[requestedTheme].name);
            }
        }
    } catch (error) {
        console.log('테마 동기화 메시지 처리 오류:', error.message);
    }
});

// ========== 퍼스널 컬러 시스템 (전체화면 iframe 모달) ==========

// 퍼스널 컬러 연결 함수 (전체화면 iframe 모달)
function openPersonalColor() {
    // 로그인 상태 체크
    if (!checkLoginStatus()) {
        showToast('로그인이 필요한 기능입니다', 'warning');
        return;
    }

    // 퍼스널 컬러 모달 생성 및 열기
    createPersonalColorModal();
    
    // 햅틱 피드백 (모바일)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    // 토스트 메시지
    if (typeof showToast === 'function') {
        showToast('퍼스널 컬러를 로드하는 중입니다', 'success');
    }
    
    console.log('퍼스널 컬러 전체화면 iframe 모달 열기');
}

// 퍼스널 컬러 모달 생성 (전체화면 버전)
function createPersonalColorModal() {
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('personalColorModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 HTML 생성 (전체화면)
    const modal = document.createElement('div');
    modal.id = 'personalColorModal';
    modal.className = 'personal-color-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--bg-primary);
        display: block;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease, background-color 0.3s ease;
    `;
    
   modal.innerHTML = `
        <div class="personal-color-content" style="
            position: relative;
            width: 100vw;
            height: 100vh;
            background: var(--bg-primary);
            overflow: hidden;
            transition: background-color 0.3s ease;
        ">
            <button class="personal-color-close" onclick="closePersonalColorModal()" style="
                position: fixed;
                top: 15px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #FF6B6B;
                color: white;
                font-size: 28px;
                cursor: pointer;
                z-index: 10000;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            " onmouseover="this.style.background='rgba(255,107,107,0.2)'" onmouseout="this.style.background='rgba(0,0,0,0.7)'">×</button>
            
            <!-- iframe에 카메라 권한 허용 속성 추가 -->
            <iframe id="personalColorFrame" 
                    src="personal-color/index.html"
                    style="width: 100%; height: 100%; border: none; background: var(--bg-primary);"
                    allow="camera *; microphone *; fullscreen *; geolocation *; autoplay *; encrypted-media *"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-presentation"
                    loading="lazy">
                <p>퍼스널 컬러 진단을 로드할 수 없습니다.</p>
            </iframe>
            
            <div class="personal-color-loading" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: var(--text-primary);
                z-index: 5;
                transition: color 0.3s ease;
            ">
                <div class="loading-spinner" style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid var(--border-color);
                    border-top: 4px solid #FF6B6B;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 30px;
                "></div>
                <div style="font-size: 20px; font-weight: 600;">퍼스널 컬러를 로드하는 중...</div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-top: 10px;">잠시만 기다려주세요</div>
            </div>
            
            <div id="personalColorContainer" style="
                width: 100%;
                height: 100%;
                overflow-y: auto;
                display: none;
            ">
                <!-- HTML 직접 로드 영역 -->
            </div>
        </div>
    `;
    
    // CSS 애니메이션 추가
    if (!document.getElementById('personal-color-animations')) {
        const style = document.createElement('style');
        style.id = 'personal-color-animations';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .personal-color-modal.active {
                opacity: 1 !important;
            }
            .personal-color-close {
                background: rgba(0, 0, 0, 0.7) !important;
            }
            [data-theme="minimal"] .personal-color-close {
                background: rgba(255, 255, 255, 0.9) !important;
                color: #000000 !important;
            }
            [data-theme="warm"] .personal-color-close {
                background: rgba(62, 39, 35, 0.9) !important;
                color: #f4e4c1 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // body에 모달 추가
    document.body.appendChild(modal);
    
    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
        modal.style.opacity = '1';
        
        // 현재 테마를 퍼스널 컬러에 전달
        setTimeout(() => syncThemeWithPersonalColor(currentTheme), 1000);
    }, 10);
    
    // body 스크롤 방지
    document.body.style.overflow = 'hidden';
    
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', handlePersonalColorEscape);
    
    console.log('퍼스널 컬러 전체화면 모달 생성 완료');
}

// 퍼스널 컬러 모달 닫기
function closePersonalColorModal() {
    const modal = document.getElementById('personalColorModal');
    if (modal) {
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
            
            // ESC 이벤트 제거
            document.removeEventListener('keydown', handlePersonalColorEscape);
        }, 300);
    }
    
    console.log('퍼스널 컬러 전체화면 모달 닫기');
}

// ESC 키 처리
function handlePersonalColorEscape(e) {
    if (e.key === 'Escape') {
        closePersonalColorModal();
    }
}

// ========== 로그인 상태 체크 및 사이드바 관리 ==========

// 로그인 상태 체크 함수 (강화된 버전)
function checkLoginStatus() {
    // 1. window.currentDesigner 체크
    if (window.currentDesigner && window.currentDesigner.id) {
        return true;
    }
    
    // 2. localStorage에서 로그인 정보 체크
    const designerName = localStorage.getItem('designerName');
    const designerPhone = localStorage.getItem('designerPhone');
    const loginTime = localStorage.getItem('loginTime');
    
    if (designerName && designerPhone && loginTime) {
        // 24시간 유효성 체크
        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const isValid = (now - loginTimestamp) < (24 * 60 * 60 * 1000);
        
        if (isValid) {
            return true;
        }
    }
    
    // 3. 기타 인증 상태 체크
    if (window.auth && window.auth.currentUser) {
        return true;
    }
    
    return false;
}

// 사이드바에 테마 버튼과 PERSONAL COLOR 버튼 동적 추가 (수정된 로그인 체크)
function addSidebarButtons() {
    // 로그인 상태 확인
    if (!checkLoginStatus()) {
        console.log('로그인 상태가 아님 - 버튼 추가 안함');
        removeSidebarButtons(); // 로그아웃 상태면 버튼 제거
        return;
    }

    // 사이드바 찾기
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.warn('사이드바를 찾을 수 없습니다');
        return;
    }

    // 기존 버튼들이 이미 있는지 확인
    if (document.getElementById('themeToggleBtn') && document.getElementById('personalColorBtn')) {
        console.log('사이드바 버튼이 이미 존재함');
        return;
    }

    // 테마 버튼 HTML 생성 (3가지 테마 시스템)
    const themeSection = document.createElement('div');
    themeSection.id = 'themeSectionContainer';
    themeSection.className = 'theme-simple';
    themeSection.style.marginBottom = '20px';
    themeSection.innerHTML = `
        <button id="themeToggleBtn" onclick="switchTheme()" 
                style="width: 100%; background: var(--accent-primary); color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
            <span id="themeButtonText">✨ 고급 헤어샵</span>
        </button>
    `;

    // 퍼스널 컬러 버튼 HTML 생성 (테마 대응)
    const personalColorSection = document.createElement('div');
    personalColorSection.id = 'personalColorSectionContainer';
    personalColorSection.className = 'personal-color-section';
    personalColorSection.style.marginBottom = '20px';
    personalColorSection.innerHTML = `
        <button id="personalColorBtn" onclick="openPersonalColorModal()" 
                style="width: 100%; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);">
            🎨 퍼스널 컬러
        </button>
    `;

    // 사이드바 맨 앞에 버튼들 추가
    sidebarContent.insertBefore(personalColorSection, sidebarContent.firstChild);
    sidebarContent.insertBefore(themeSection, sidebarContent.firstChild);

    // 호버 효과 추가
    addSidebarButtonHoverEffects();
    
    // 현재 테마에 맞게 버튼 텍스트 업데이트
    updateThemeButton();

    console.log('사이드바 버튼들 추가 완료 (로그인 상태)');
}

// 사이드바 버튼 제거 함수
function removeSidebarButtons() {
    const themeSection = document.getElementById('themeSectionContainer');
    const personalColorSection = document.getElementById('personalColorSectionContainer');
    
    if (themeSection) themeSection.remove();
    if (personalColorSection) personalColorSection.remove();
    
    console.log('사이드바 버튼들 제거됨 (로그아웃 상태)');
}

// 사이드바 버튼 호버 효과 (테마 대응)
function addSidebarButtonHoverEffects() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const personalColorBtn = document.getElementById('personalColorBtn');

    if (themeBtn) {
        themeBtn.addEventListener('mouseenter', () => {
            themeBtn.style.filter = 'brightness(110%)';
            themeBtn.style.transform = 'translateY(-1px)';
        });
        themeBtn.addEventListener('mouseleave', () => {
            themeBtn.style.filter = 'brightness(100%)';
            themeBtn.style.transform = 'translateY(0)';
        });
    }

    if (personalColorBtn) {
        personalColorBtn.addEventListener('mouseenter', () => {
            personalColorBtn.style.background = 'linear-gradient(135deg, #FF5252 0%, #FF7043 100%)';
            personalColorBtn.style.transform = 'translateY(-1px)';
            personalColorBtn.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
        });
        personalColorBtn.addEventListener('mouseleave', () => {
            personalColorBtn.style.background = 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)';
            personalColorBtn.style.transform = 'translateY(0)';
            personalColorBtn.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
        });
    }
}

// 로그인 후 버튼 업데이트
function updateSidebarButtons() {
    // 로그인 상태 체크 후 버튼 추가/제거
    setTimeout(() => {
        if (checkLoginStatus()) {
            addSidebarButtons();
        } else {
            removeSidebarButtons();
        }
    }, 100);
}

// ========== 테마별 동적 스타일 추가 ==========
function addThemeStyles() {
    // 이미 테마 스타일이 있는지 확인
    if (document.getElementById('theme-styles')) {
        return;
    }

    const themeCSS = `
        /* 테마 전환 애니메이션 */
        body.theme-transitioning * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
        }
        
        /* 테마별 퍼스널 컬러 모달 스타일 */
        [data-theme="minimal"] .personal-color-content {
            background: #ffffff !important;
        }
        
        [data-theme="warm"] .personal-color-content {
            background: #f4e4c1 !important;
        }
        
        /* 테마별 로딩 스피너 */
        [data-theme="minimal"] .loading-spinner {
            border-color: #dee2e6;
            border-top-color: #000000;
        }
        
        [data-theme="warm"] .loading-spinner {
            border-color: #d7ccc8;
            border-top-color: #6d4c41;
        }
    `;

    const style = document.createElement('style');
    style.id = 'theme-styles';
    style.textContent = themeCSS;
    document.head.appendChild(style);

    console.log('테마 스타일 추가 완료');
}

// ========== 초기화 및 이벤트 리스너 ==========

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 테마 스타일 추가
    addThemeStyles();
    
    // 테마 로드
    setTimeout(loadTheme, 100);
    
    // 로그인 상태 체크하여 사이드바 버튼 추가
    const checkLoginAndAddButtons = () => {
        if (checkLoginStatus()) {
            addSidebarButtons();
        } else {
            removeSidebarButtons();
        }
    };
    
    // 주기적으로 로그인 상태 확인 (3초마다, 최대 10회)
    let checkCount = 0;
    const loginCheckInterval = setInterval(() => {
        checkCount++;
        
        if (checkLoginStatus()) {
            addSidebarButtons();
            clearInterval(loginCheckInterval);
        } else {
            removeSidebarButtons(); // 로그아웃 상태면 버튼 제거
            if (checkCount >= 10) {
                clearInterval(loginCheckInterval);
            }
        }
    }, 3000);
    
    // 즉시 체크도 수행
    setTimeout(checkLoginAndAddButtons, 1000);
});

// 로그인 상태 변경 감지를 위한 이벤트 리스너
window.addEventListener('storage', function(e) {
    if (e.key === 'designerName' || e.key === 'designerPhone' || e.key === 'loginTime') {
        updateSidebarButtons();
    }
});

// 전역 함수로 등록
window.switchTheme = switchTheme;
window.toggleTheme = toggleTheme; // 하위 호환성
window.loadTheme = loadTheme;
window.openPersonalColor = openPersonalColor;
window.closePersonalColorModal = closePersonalColorModal;
window.updateSidebarButtons = updateSidebarButtons;
window.checkLoginStatus = checkLoginStatus;

console.log('메뉴 시스템 + 3가지 테마 시스템 + 퍼스널 컬러 (전체화면 iframe 모달) 로드 완료 - 최종 버전');
