// ========== HAIRGATOR 최적화된 메인 로직 ========== 
console.log('🚀 HAIRGATOR 최적화된 버전 시작 - 24시간 자동 로그인 + 테마 시스템');

// ========== 전역 변수 ========== 
let currentDesigner = null;
let currentDesignerName = null;
let currentGender = null;
let currentCategory = null;
let currentCustomer = null;
let selectedStyleCode = null;
let selectedStyleName = null;
let autoLoginEnabled = false;
let currentTheme = 'dark'; // 기본 다크 테마

// ========== 24시간 자동 로그인 시스템 ========== 
function checkAutoLogin() {
    console.log('🔍 자동 로그인 확인 중...');
    
    const autoLoginData = localStorage.getItem('hairgator_auto_login');
    
    if (autoLoginData) {
        try {
            const loginData = JSON.parse(autoLoginData);
            const currentTime = new Date().getTime();
            
            // 24시간 체크 (86400000ms = 24시간)
            if (currentTime - loginData.timestamp < 86400000) {
                console.log('✅ 자동 로그인 유효:', loginData.designer);
                
                currentDesigner = loginData.designer;
                currentDesignerName = loginData.name;
                autoLoginEnabled = true;
                
                // 디자이너 정보 표시
                updateDesignerDisplay();
                
                // 로그인 화면 숨기고 성별 선택 표시
                hideDesignerLogin();
                showGenderSelection();
                
                return true;
            } else {
                console.log('⏰ 자동 로그인 만료됨');
                localStorage.removeItem('hairgator_auto_login');
            }
        } catch (error) {
            console.error('자동 로그인 데이터 파싱 오류:', error);
            localStorage.removeItem('hairgator_auto_login');
        }
    }
    
    return false;
}

// 자동 로그인 설정 저장
function saveAutoLogin(designer, name) {
    const loginData = {
        designer: designer,
        name: name,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem('hairgator_auto_login', JSON.stringify(loginData));
    console.log('💾 자동 로그인 설정 저장됨');
}

// ========== 페이지 초기화 ========== 
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM 로드 완료, HAIRGATOR 초기화 시작');
    
    // 자동 로그인 확인 (Firebase 연결 전에)
    if (checkAutoLogin()) {
        return; // 자동 로그인 성공 시 더 이상 진행하지 않음
    }
    
    // 일반 로그인 화면 표시
    showDesignerLogin();
    
    // Firebase 연결 대기
    waitForFirebase();
    
    // 테마 시스템 초기화
    initializeThemeSystem();
    
    // 디바이스 감지 및 안내
    detectDeviceAndShowNotice();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    console.log('✅ HAIRGATOR 초기화 완료');
});

// Firebase 연결 대기
function waitForFirebase() {
    const checkFirebase = setInterval(() => {
        if (window.firebaseConnected) {
            console.log('🔥 Firebase 연결 확인됨');
            clearInterval(checkFirebase);
        }
    }, 100);
}

// ========== 테마 시스템 ========== 
function initializeThemeSystem() {
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    console.log('🎨 테마 적용:', theme);
    currentTheme = theme;
    
    // body에 테마 클래스 적용
    document.body.className = `theme-${theme}`;
    
    // PWA 테마 색상 동적 변경
    updatePWAThemeColor(theme);
    
    // 로고 색상 강제 적용 (테마별)
    updateLogoColors(theme);
    
    // 테마 저장
    localStorage.setItem('hairgator_theme', theme);
}

function updatePWAThemeColor(theme) {
    const themeColors = {
        'dark': '#000000',
        'gray': '#939597', 
        'light': '#E6DCD3'
    };
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = themeColors[theme];
    }
}

function updateLogoColors(theme) {
    const logoElements = document.querySelectorAll('.logo, .logo *');
    
    logoElements.forEach(element => {
        if (theme === 'dark') {
            element.style.color = '#ffffff';
        } else {
            element.style.color = '#000000';
        }
    });
}

// 테마 전환 (햄버거 메뉴에서 호출)
function changeTheme() {
    const themes = ['dark', 'gray', 'light'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    applyTheme(nextTheme);
    
    // 부드러운 전환 효과
    document.body.style.transition = 'all 0.3s ease';
    
    console.log(`🎨 테마 변경: ${currentTheme} → ${nextTheme}`);
}

// ========== 디자이너 로그인 ========== 
function showDesignerLogin() {
    document.getElementById('designerLogin').style.display = 'flex';
    document.getElementById('genderSelection').style.display = 'none';
    document.querySelector('.main-container').classList.remove('active');
}

function hideDesignerLogin() {
    document.getElementById('designerLogin').style.display = 'none';
}

// 디자이너 로그인 처리
async function handleDesignerLogin() {
    const designerInput = document.getElementById('designerName');
    const passwordInput = document.getElementById('designerPassword');
    const autoLoginCheckbox = document.getElementById('autoLoginEnabled');
    
    if (!designerInput || !passwordInput) {
        alert('입력 필드를 찾을 수 없습니다');
        return;
    }
    
    const designer = designerInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!designer || !password) {
        alert('디자이너 이름과 비밀번호를 모두 입력해주세요');
        return;
    }
    
    try {
        console.log('🔐 디자이너 로그인 시도:', designer);
        
        // 간단한 로그인 검증 (실제 서비스에서는 더 강화된 인증 필요)
        currentDesigner = designer.toLowerCase().replace(/\s+/g, '');
        currentDesignerName = designer;
        
        // 24시간 자동 로그인 설정
        if (autoLoginCheckbox && autoLoginCheckbox.checked) {
            autoLoginEnabled = true;
            saveAutoLogin(currentDesigner, currentDesignerName);
        }
        
        console.log('✅ 로그인 성공:', currentDesignerName);
        
        // 디자이너 정보 표시 업데이트
        updateDesignerDisplay();
        
        // 성별 선택 화면으로 전환
        hideDesignerLogin();
        showGenderSelection();
        
        // 폼 초기화
        designerInput.value = '';
        passwordInput.value = '';
        
    } catch (error) {
        console.error('로그인 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다');
    }
}

// 디자이너 정보 표시 업데이트
function updateDesignerDisplay() {
    // 햄버거 메뉴의 디자이너 정보 업데이트
    const designerNameElements = document.querySelectorAll('.designer-name');
    designerNameElements.forEach(element => {
        if (element) {
            element.textContent = currentDesignerName || '디자이너';
        }
    });
}

// ========== 성별 선택 ========== 
function showGenderSelection() {
    document.getElementById('genderSelection').style.display = 'flex';
    document.querySelector('.main-container').classList.remove('active');
    
    // 성별 선택 안내 표시
    showDeviceOptimizationNotice('👥 고객의 성별을 선택해주세요');
}

function selectGender(gender) {
    currentGender = gender;
    console.log('👤 성별 선택됨:', gender);
    
    // 성별 선택 화면 숨기기
    document.getElementById('genderSelection').style.display = 'none';
    
    // 메인 컨테이너 표시
    const mainContainer = document.querySelector('.main-container');
    mainContainer.classList.add('active');
    mainContainer.classList.remove('male', 'female');
    mainContainer.classList.add(gender);
    
    // 성별별 색상 동적 적용
    applyGenderTheme(gender);
    
    // 네비게이션과 헤어스타일 로드
    loadNavigationTabs();
    
    // 첫 번째 카테고리 활성화
    if (navigationData && navigationData[gender] && navigationData[gender].length > 0) {
        switchTab(navigationData[gender][0]);
    }
}

// 성별별 색상 테마 적용
function applyGenderTheme(gender) {
    const root = document.documentElement;
    
    if (gender === 'male') {
        // 남성 테마 - 파란 계열
        root.style.setProperty('--active-color', 'var(--male-primary)');
        root.style.setProperty('--active-gradient', 'var(--male-gradient)');
    } else {
        // 여성 테마 - 핑크 계열  
        root.style.setProperty('--active-color', 'var(--female-primary)');
        root.style.setProperty('--active-gradient', 'var(--female-gradient)');
    }
    
    // 활성 탭 색상 동적 적용
    updateActiveTabColors(gender);
    
    console.log('🎨 성별 테마 적용됨:', gender);
}

// 활성 탭 색상 업데이트
function updateActiveTabColors(gender) {
    const activeTabs = document.querySelectorAll('.nav-tab.active, .length-tab.active');
    
    activeTabs.forEach(tab => {
        if (gender === 'male') {
            tab.style.borderBottomColor = 'var(--male-primary)';
            tab.style.color = 'var(--male-primary)';
        } else {
            tab.style.borderBottomColor = 'var(--female-primary)';
            tab.style.color = 'var(--female-primary)';
        }
    });
}

// ========== 네비게이션 및 헤어스타일 로딩 ========== 
function loadNavigationTabs() {
    if (!navigationData || !currentGender) {
        console.error('네비게이션 데이터가 없거나 성별이 선택되지 않음');
        return;
    }

    const tabsContainer = document.querySelector('.nav-tabs');
    if (!tabsContainer) {
        console.error('네비게이션 탭 컨테이너를 찾을 수 없음');
        return;
    }

    const genderTabs = navigationData[currentGender] || [];
    
    tabsContainer.innerHTML = '';
    
    genderTabs.forEach((category, index) => {
        const tab = document.createElement('div');
        tab.className = `nav-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = category;
        tab.onclick = () => switchTab(category);
        tabsContainer.appendChild(tab);
    });

    console.log(`📋 ${currentGender} 네비게이션 탭 로드됨:`, genderTabs);
}

// 탭 전환
function switchTab(category) {
    if (category === currentCategory) return;
    
    currentCategory = category;
    console.log('📂 카테고리 전환:', category);

    // 탭 활성화 표시
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        if (tab.textContent === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 카테고리 섹션 표시/숨김
    const sections = document.querySelectorAll('.category-section');
    sections.forEach(section => {
        if (section.id === `category-${category}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // 해당 카테고리의 헤어스타일 로드
    loadCategoryHairstyles(category);
}

// 카테고리별 헤어스타일 로드
async function loadCategoryHairstyles(category) {
    if (!window.firebaseConnected) {
        console.log('Firebase 연결 대기 중...');
        setTimeout(() => loadCategoryHairstyles(category), 1000);
        return;
    }

    try {
        console.log(`🎨 ${category} 스타일 로드 중...`);
        
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('category', '==', category)
            .orderBy('createdAt', 'desc')
            .get();

        const styles = [];
        snapshot.forEach(doc => {
            styles.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ ${category} 스타일 ${styles.length}개 로드됨`);
        
        // 헤어스타일 렌더링
        renderHairstyles(category, styles);
        
    } catch (error) {
        console.error('헤어스타일 로드 오류:', error);
        showErrorMessage('헤어스타일을 불러올 수 없습니다');
    }
}

// 헤어스타일 렌더링
function renderHairstyles(category, styles) {
    let sectionElement = document.getElementById(`category-${category}`);
    
    if (!sectionElement) {
        // 카테고리 섹션이 없으면 생성
        sectionElement = createCategorySection(category);
    }
    
    const lengthTabs = sectionElement.querySelector('.length-tabs');
    const hairstyleContainer = sectionElement.querySelector('.hairstyles-container');
    
    if (!hairstyleContainer) {
        console.error(`카테고리 ${category}의 헤어스타일 컨테이너를 찾을 수 없음`);
        return;
    }
    
    // 길이별로 스타일 그룹화
    const stylesByLength = groupStylesByLength(styles);
    
    // 길이 탭 생성
    if (lengthTabs) {
        renderLengthTabs(lengthTabs, stylesByLength, category);
    }
    
    // 첫 번째 길이의 스타일 표시
    const firstLength = Object.keys(stylesByLength)[0];
    if (firstLength) {
        renderStyleGrid(hairstyleContainer, stylesByLength[firstLength]);
    }
}

// 카테고리 섹션 생성
function createCategorySection(category) {
    const contentArea = document.querySelector('.content');
    
    const sectionElement = document.createElement('div');
    sectionElement.className = 'category-section';
    sectionElement.id = `category-${category}`;
    
    sectionElement.innerHTML = `
        <div class="category-description">
            ${getCategoryDescription(category)}
        </div>
        <div class="length-tabs"></div>
        <div class="hairstyles-container"></div>
    `;
    
    contentArea.appendChild(sectionElement);
    
    return sectionElement;
}

// 길이별 스타일 그룹화
function groupStylesByLength(styles) {
    const grouped = {};
    
    styles.forEach(style => {
        const length = style.length || 'None';
        if (!grouped[length]) {
            grouped[length] = [];
        }
        grouped[length].push(style);
    });
    
    return grouped;
}

// 길이 탭 렌더링
function renderLengthTabs(container, stylesByLength, category) {
    container.innerHTML = '';
    
    const lengths = Object.keys(stylesByLength);
    
    lengths.forEach((length, index) => {
        const tab = document.createElement('div');
        tab.className = `length-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = length === 'None' ? '전체' : length;
        tab.onclick = () => switchLengthTab(tab, category, stylesByLength[length]);
        
        container.appendChild(tab);
    });
}

// 길이 탭 전환
function switchLengthTab(selectedTab, category, styles) {
    // 탭 활성화
    const tabs = selectedTab.parentElement.querySelectorAll('.length-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    selectedTab.classList.add('active');
    
    // 해당 길이의 스타일 표시
    const container = document.querySelector(`#category-${category} .hairstyles-container`);
    renderStyleGrid(container, styles);
}

// 스타일 그리드 렌더링
function renderStyleGrid(container, styles) {
    if (!styles || styles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✂️</div>
                <div class="empty-state-title">등록된 스타일이 없습니다</div>
                <div class="empty-state-message">새로운 헤어스타일이 곧 추가될 예정입니다</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="hairstyle-grid">
            ${styles.map(style => createStyleCard(style)).join('')}
        </div>
    `;
}

// 스타일 카드 생성
function createStyleCard(style) {
    return `
        <div class="hairstyle-card" onclick="openStyleModal('${style.code}', '${style.name}', '${style.imageUrl}')">
            <img src="${style.imageUrl}" 
                 alt="${style.name}" 
                 class="hairstyle-image"
                 onerror="this.src='images/no-image.png'">
            <div class="hairstyle-info">
                <div class="hairstyle-code">${style.code}</div>
                <div class="hairstyle-name">${style.name}</div>
            </div>
        </div>
    `;
}

// ========== 스타일 모달 ========== 
function openStyleModal(code, name, imageUrl) {
    selectedStyleCode = code;
    selectedStyleName = name;
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCode = document.getElementById('modalCode');
    const modalName = document.getElementById('modalName');
    
    modalImage.src = imageUrl;
    modalCode.textContent = code;
    modalName.textContent = name;
    
    modal.style.display = 'block';
    
    console.log('📸 스타일 모달 열림:', code, name);
    
    // 스타일 조회수 증가
    if (window.firebaseConnected) {
        incrementStyleViews(code);
    }
}

// 모달 닫기
function closeStyleModal() {
    document.getElementById('imageModal').style.display = 'none';
    selectedStyleCode = null;
    selectedStyleName = null;
}

// 스타일 조회수 증가
async function incrementStyleViews(styleCode) {
    try {
        const styleSnapshot = await db.collection('hairstyles')
            .where('code', '==', styleCode)
            .limit(1)
            .get();
            
        if (!styleSnapshot.empty) {
            const styleDoc = styleSnapshot.docs[0];
            const currentViews = styleDoc.data().views || 0;
            
            await styleDoc.ref.update({
                views: currentViews + 1,
                lastViewedAt: new Date()
            });
        }
    } catch (error) {
        console.error('조회수 업데이트 오류:', error);
    }
}

// ========== 햄버거 메뉴 ========== 
function toggleHamburgerMenu() {
    const overlay = document.getElementById('hamburgerOverlay');
    const menu = document.getElementById('hamburgerMenu');
    
    if (!overlay || !menu) {
        console.error('햄버거 메뉴 요소를 찾을 수 없음');
        return;
    }
    
    if (overlay.style.display === 'block') {
        closeHamburgerMenu();
    } else {
        overlay.style.display = 'block';
        
        // 애니메이션을 위한 지연
        requestAnimationFrame(() => {
            menu.style.transform = 'translateX(0)';
        });
    }
}

function closeHamburgerMenu() {
    const overlay = document.getElementById('hamburgerOverlay');
    const menu = document.getElementById('hamburgerMenu');
    
    if (menu) {
        menu.style.transform = 'translateX(100%)';
    }
    
    setTimeout(() => {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }, 300);
}

// ========== 뒤로가기 기능 ========== 
function goBack() {
    if (document.querySelector('.main-container').classList.contains('active')) {
        // 메인 화면에서 성별 선택으로
        document.querySelector('.main-container').classList.remove('active');
        showGenderSelection();
    } else if (document.getElementById('genderSelection').style.display === 'flex') {
        // 성별 선택에서 로그인으로  
        showDesignerLogin();
        currentDesigner = null;
        currentDesignerName = null;
        
        // 자동 로그인 해제
        if (autoLoginEnabled) {
            localStorage.removeItem('hairgator_auto_login');
            autoLoginEnabled = false;
        }
    }
}

// ========== 이벤트 리스너 설정 ========== 
function setupEventListeners() {
    // 로그인 폼 이벤트
    const loginForm = document.getElementById('designerLogin');
    if (loginForm) {
        const form = loginForm.querySelector('form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleDesignerLogin();
            });
        }
    }
    
    // 모달 클로즈 이벤트
    const modal = document.getElementById('imageModal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = closeStyleModal;
        }
        
        // 모달 배경 클릭 시 닫기
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeStyleModal();
            }
        };
    }
    
    // 햄버거 메뉴 오버레이 클릭 이벤트
    const overlay = document.getElementById('hamburgerOverlay');
    if (overlay) {
        overlay.onclick = closeHamburgerMenu;
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (modal && modal.style.display === 'block') {
                closeStyleModal();
            }
            if (overlay && overlay.style.display === 'block') {
                closeHamburgerMenu();
            }
        }
    });
}

// ========== 기기 최적화 ========== 
function detectDeviceAndShowNotice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // iOS 감지
    if (/iphone|ipad|ipod/.test(userAgent)) {
        console.log('📱 iOS 기기 감지됨');
        document.body.classList.add('ios-device');
        hideAddressBar();
    }
    
    // Android 감지
    if (/android/.test(userAgent)) {
        console.log('🤖 Android 기기 감지됨');
        document.body.classList.add('android-device');
    }
    
    // 스와이프 새로고침 방지
    preventPullToRefresh();
    
    // PWA 모드 확인
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        console.log('📱 PWA 모드로 실행 중');
        showDeviceOptimizationNotice('📱 PWA 모드로 실행 중입니다');
    } else {
        console.log('🌐 브라우저 모드로 실행 중');
        setTimeout(() => {
            showInstallPrompt();
        }, 3000);
    }
}

// PWA 설치 안내 표시
function showInstallPrompt() {
    const notice = document.getElementById('deviceNotice');
    notice.innerHTML = '📱 홈 화면에 추가하여 앱처럼 사용하세요!';
    notice.className = 'device-notice show';
    
    setTimeout(() => {
        notice.classList.remove('show');
    }, 10000);
}

// 기기별 최적화 안내 표시
function showDeviceOptimizationNotice(customMessage = null) {
    const notice = document.getElementById('deviceNotice');
    
    if (customMessage) {
        notice.innerHTML = customMessage;
        notice.className = 'device-notice show';
        setTimeout(() => {
            notice.classList.remove('show');
        }, 5000);
        return;
    }
    
    notice.innerHTML = '📱 모든 기기에서 가로 스와이프로 스타일을 확인하세요';
    notice.className = 'device-notice show';
    
    setTimeout(() => {
        notice.classList.remove('show');
    }, 5000);
}

// iOS Safari 주소창 숨기기
function hideAddressBar() {
    setTimeout(function() {
        window.scrollTo(0, 1);
    }, 0);
}

// 스와이프 새로고침 완전 방지 강화
function preventPullToRefresh() {
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    let startY = 0;
    let startX = 0;
    
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].pageY;
        startX = e.touches[0].pageX;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        const y = e.touches[0].pageY;
        const x = e.touches[0].pageX;
        const deltaY = y - startY;
        const deltaX = x - startX;
        
        if (window.scrollY === 0 && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
            e.preventDefault();
            console.log('🚫 스와이프 새로고침 방지됨');
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', function(e) {
        if (window.scrollY === 0 && e.touches[0].pageY > startY) {
            e.preventDefault();
        }
    }, { passive: false });
}

// ========== 유틸리티 함수 ========== 
function getCategoryDescription(category) {
    const descriptions = {
        // 남성 카테고리
        'MOHICAN': '모히칸은 옆머리를 짧게 하고 윗머리에 여백을 높이 세운, 독과 정선한 개성이 낮지만 스타일이 뛰어난 커트입니다.',
        'BUZZ': '버즈컷은 전체적으로 짧고 깔끔한 스타일이며, 다단절 시술로 간편하게 관리할 수 있습니다.',
        'SIDE PART': '사이드 파트는 클래식한 복장에 따라 원하는 이미지를 자유롭게 표현할 수 있습니다.',
        // 여성 카테고리  
        'BOB': '밥 스타일은 어깨 위 길이로 모던하고 깔끔한 느낌을 연출합니다.',
        'LAYERED': '레이어드 스타일은 층을 두어 풍성함과 볼륨감을 더해줍니다.',
        // 공통
        '전체': '다양한 헤어스타일을 한눈에 확인하실 수 있습니다.'
    };
    
    return descriptions[category] || '다양한 헤어스타일을 확인해보세요.';
}

function showErrorMessage(message) {
    const notice = document.getElementById('deviceNotice');
    notice.innerHTML = `❌ ${message}`;
    notice.className = 'device-notice show';
    notice.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
    
    setTimeout(() => {
        notice.classList.remove('show');
        notice.style.backgroundColor = '';
    }, 5000);
}

// ========== 전역 함수 등록 ========== 
window.handleDesignerLogin = handleDesignerLogin;
window.selectGender = selectGender;
window.switchTab = switchTab;
window.openStyleModal = openStyleModal;
window.closeStyleModal = closeStyleModal;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.closeHamburgerMenu = closeHamburgerMenu;
window.changeTheme = changeTheme;
window.goBack = goBack;

console.log('🎯 HAIRGATOR 최적화된 메인 스크립트 로드 완료');
