// HAIRGATOR Main Application Logic - 최종 완성 버전 (토큰 시스템 통합)
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentGender = null;
    let currentCategory = null;
    let currentSubcategory = 'None';
    let menuData = {};
    let currentUser = null; // 토큰 시스템과 연동

    // Elements
    const backBtn = document.getElementById('backBtn');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleBottom = document.getElementById('themeToggleBottom');
    const themeStatus = document.getElementById('themeStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const categoryTabs = document.getElementById('categoryTabs');
    const categoryDescription = document.getElementById('categoryDescription');
    const subcategoryTabs = document.getElementById('subcategoryTabs');
    const menuGrid = document.getElementById('menuGrid');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Login elements
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const mainMenu = document.getElementById('mainMenu');
    
    // Modal elements
    const styleModal = document.getElementById('styleModal');
    const modalClose = document.getElementById('modalClose');
    const modalImage = document.getElementById('modalImage');
    const modalCode = document.getElementById('modalCode');
    const modalName = document.getElementById('modalName');
    const btnRegister = document.getElementById('btnRegister');
    const btnLike = document.getElementById('btnLike');

    // HAIRGATOR 메뉴 데이터 구조
    const MENU_DATA = {
        male: {
            categories: [
                { 
                    id: 'side-fringe', 
                    name: 'SIDE FRINGE',
                    description: '사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다. 가르마를 기준으로 단순히 넘어가는 스타일을 넘어 개인의 특성과 트렌드에 맞춰 고급 테이퍼링을 표현하는 것이 매우 중요합니다.'
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
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        },
        female: {
            categories: [
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
                    description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스처 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'
                },
                { 
                    id: 'g-length', 
                    name: 'G Length',
                    description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 또렷하고 미니멀한 무드를 줍니다.'
                },
                { 
                    id: 'h-length', 
                    name: 'H Length',
                    description: 'H 길이는 귀선~베리숏 구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'
                }
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        }
    };

    // Initialize Application
    init();

    function init() {
        console.log('🦎 HAIRGATOR 초기화 시작...');
        setupEventListeners();
        setupLoginSystem();
        setupThemeButtons();
        loadTheme();
        checkLoginStatus();
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        console.log('✅ HAIRGATOR 초기화 완료');
    }

    // ========== 토큰 통합 로그인 시스템 ==========
    function setupLoginSystem() {
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('designerName').value.trim();
                const phone = document.getElementById('phoneNumber').value.trim();
                const password = document.getElementById('password').value.trim();
                
                console.log('로그인 시도:', { name, phoneLength: phone.length, passwordLength: password.length });
                
                // 입력값 검증
                if (!name) {
                    alert('디자이너 이름을 입력해주세요.');
                    return;
                }
                
                if (phone.length !== 4) {
                    alert('휴대폰 뒷자리 4자리를 정확히 입력해주세요.');
                    return;
                }
                
                if (password.length !== 4) {
                    alert('비밀번호 4자리를 정확히 입력해주세요.');
                    return;
                }
                
                try {
                    // Firebase에서 사용자 확인 (토큰 정보 포함)
                    const userQuery = await db.collection('designers')
                        .where('name', '==', name)
                        .where('phone', '==', phone)
                        .where('password', '==', password)
                        .get();
                    
                    if (userQuery.empty) {
                        alert('로그인 정보가 올바르지 않습니다');
                        return;
                    }
                    
                    const userData = userQuery.docs[0].data();
                    currentUser = {
                        id: userQuery.docs[0].id,
                        name: userData.name,
                        phone: userData.phone,
                        isAdmin: userData.isAdmin || false,
                        tokens: userData.tokens || 0,
                        loginTime: new Date()
                    };
                    
                    // 토큰 시스템에 사용자 설정 (전역 함수 사용)
                    if (window.setCurrentUser) {
                        window.setCurrentUser(currentUser);
                    }
                    
                    // localStorage에 로그인 정보 저장
                    localStorage.setItem('designerName', name);
                    localStorage.setItem('designerPhone', phone);
                    localStorage.setItem('designerPassword', password);
                    localStorage.setItem('loginTime', new Date().getTime());
                    localStorage.setItem('hairgator_user', JSON.stringify(currentUser));
                    
                    // 화면 전환
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (genderSelection) genderSelection.style.display = 'flex';
                    
                    // 디자이너 이름 및 토큰 표시
                    updateDesignerInfo(name);
                    updateTokenDisplay();
                    
                    console.log('✅ 로그인 성공:', name, `(${currentUser.tokens || 0} 토큰)`);
                    showToast(`환영합니다, ${name}님! (보유 토큰: ${currentUser.tokens || 0}개)`);
                    
                } catch (error) {
                    console.error('로그인 처리 오류:', error);
                    alert('로그인 처리 중 오류가 발생했습니다: ' + error.message);
                }
            });
        }
    }
    
    // 토큰 표시 업데이트
    function updateTokenDisplay() {
        const tokenDisplays = document.querySelectorAll('.token-display');
        tokenDisplays.forEach(tokenDisplay => {
            if (currentUser) {
                tokenDisplay.textContent = `${currentUser.tokens || 0} 토큰`;
                tokenDisplay.style.display = 'block';
                tokenDisplay.classList.add('visible');
            } else {
                tokenDisplay.style.display = 'none';
                tokenDisplay.classList.remove('visible');
            }
        });
    }
    
    // 로그인 상태 확인 (토큰 정보 포함)
    function checkLoginStatus() {
        const savedUser = localStorage.getItem('hairgator_user');
        const loginTime = localStorage.getItem('loginTime');
        
        if (savedUser && loginTime) {
            // 24시간 세션 체크
            const now = new Date().getTime();
            const timeDiff = now - parseInt(loginTime);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                // 저장된 사용자 정보 복원
                currentUser = JSON.parse(savedUser);
                
                // 토큰 시스템에 사용자 설정
                if (window.setCurrentUser) {
                    window.setCurrentUser(currentUser);
                }
                
                // 자동 로그인
                if (loginScreen) loginScreen.style.display = 'none';
                if (genderSelection) genderSelection.style.display = 'flex';
                updateDesignerInfo(currentUser.name);
                updateTokenDisplay();
                console.log('자동 로그인:', currentUser.name, `(${currentUser.tokens || 0} 토큰)`);
                return;
            } else {
                // 세션 만료
                clearLoginData();
                console.log('세션 만료 - 재로그인 필요');
            }
        }
        
        // 로그인 화면 표시
        if (loginScreen) loginScreen.style.display = 'flex';
    }
    
    // 로그인 데이터 초기화
    function clearLoginData() {
        localStorage.removeItem('designerName');
        localStorage.removeItem('designerPhone');
        localStorage.removeItem('designerPassword');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('hairgator_user');
        localStorage.removeItem('selectedGender');
        currentUser = null;
    }
    
    // 디자이너 정보 업데이트
    function updateDesignerInfo(name) {
        const designerDisplays = document.querySelectorAll('#designerNameDisplay, #designerNameDisplay2');
        designerDisplays.forEach(display => {
            if (display) {
                display.textContent = name;
            }
        });
    }

    // 성별 선택 (전역 함수로 등록) - 토큰 연동
    function selectGender(gender) {
        currentGender = gender;
        
        // body에 성별 클래스 추가
        document.body.classList.remove('gender-male', 'gender-female');
        document.body.classList.add(`gender-${gender}`);
        
        // 화면 전환
        if (genderSelection) genderSelection.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'block';
        if (menuContainer) menuContainer.classList.add('active');
        
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        
        if (themeToggleBottom) {
            themeToggleBottom.style.display = 'none';
        }
        
        // 성별 저장
        localStorage.setItem('selectedGender', gender);
        
        // 메뉴 로드
        loadMenuData(gender);
        
        console.log(`✅ 성별 선택 완료: ${gender}`);
    }

    // 전역 함수 등록
    window.selectGender = selectGender;

    // Event Listeners Setup
    function setupEventListeners() {
        // Back Button - 완전 수정
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleBack();
            });
        }

        // Menu Button
        if (menuBtn) {
            menuBtn.addEventListener('click', openSidebar);
        }

        // Sidebar Close
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // Theme Toggles
        if (themeToggle) {
            themeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
            });
        }

        if (themeToggleBottom) {
            themeToggleBottom.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
            });
        }

        // Logout Button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Gender Selection Buttons
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const gender = this.dataset.gender || this.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
                if (gender) {
                    console.log(`🎯 성별 선택: ${gender}`);
                    selectGender(gender);
                }
            });
        });

        // Modal Events
        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        if (styleModal) {
            styleModal.addEventListener('click', function(e) {
                if (e.target === styleModal) {
                    closeModal();
                }
            });
        }

        // Keyboard Events
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && styleModal && styleModal.classList.contains('active')) {
                closeModal();
            }
        });
        
        // Click Outside Sidebar
        document.addEventListener('click', function(e) {
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // Navigation Functions - 완전 수정된 뒤로가기
    function handleBack() {
        console.log('🔙 뒤로가기 버튼 클릭됨');
        
        if (menuContainer && menuContainer.classList.contains('active')) {
            // 메뉴에서 성별 선택으로 돌아가기
            menuContainer.classList.remove('active');
            
            if (mainMenu) {
                mainMenu.style.display = 'none';
            }
            
            if (genderSelection) {
                genderSelection.style.display = 'flex';
            }
            
            if (backBtn) {
                backBtn.style.display = 'none';
            }
            
            if (themeToggleBottom) {
                themeToggleBottom.style.display = 'flex';
            }
            
            // 전역 변수 초기화
            currentGender = null;
            currentCategory = null;
            
            console.log('✅ 성별 선택 화면으로 돌아감');
        } else {
            console.log('⚠️ 뒤로가기 조건이 맞지 않음');
        }
    }

    // Sidebar Functions
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('active');
            console.log('📋 사이드바 열림');
        }
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('active');
            console.log('📋 사이드바 닫힘');
        }
    }

    // Theme Functions - 완전 강화
    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            if (themeStatus) themeStatus.textContent = 'OFF';
        }
        console.log(`🎨 테마 로드: ${savedTheme}`);
    }

    function toggleTheme() {
        console.log('🎨 테마 토글 실행');
        
        const body = document.body;
        
        // 테마 변경
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        
        // 상태 텍스트 업데이트
        if (themeStatus) {
            themeStatus.textContent = isLight ? 'OFF' : 'ON';
        }
        
        // 로컬 저장소에 저장
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
        
        // 성공 메시지
        showToast(`🎨 ${isLight ? '라이트' : '다크'} 테마로 변경됨`);
        
        console.log(`✅ 테마 변경 완료: ${isLight ? 'light' : 'dark'}`);
        
        return isLight;
    }

    // 사이드바 테마 버튼 강화 설정
    function setupThemeButtons() {
        console.log('🎨 테마 버튼 설정 시작');
        
        // 사이드바 내부의 테마 관련 버튼들 찾기
        const themeSelectors = [
            '[onclick*="theme"]', 
            '.theme-option', 
            '#themeToggle', 
            '#themeToggleBottom',
            '[data-theme]',
            '.dark-mode-toggle'
        ];
        
        themeSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                console.log('🎨 테마 버튼 찾음:', btn.textContent || btn.id || btn.className);
                
                // 기존 onclick 제거
                btn.removeAttribute('onclick');
                
                // 새로운 클릭 이벤트 추가
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🎨 테마 버튼 클릭됨:', this.textContent || this.id);
                    
                    // 테마 토글 실행
                    const newTheme = toggleTheme();
                    
                    // 사이드바 닫기 (선택사항)
                    setTimeout(() => {
                        closeSidebar();
                    }, 300);
                });
            });
        });
        
        console.log('✅ 테마 버튼 설정 완료');
    }

    // Authentication Functions - 토큰 연동
    async function handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                // 토큰 시스템 정리
                if (window.setCurrentUser) {
                    window.setCurrentUser(null);
                }
                
                // 로컬 스토리지 초기화
                clearLoginData();
                
                // 페이지 새로고침
                location.reload();
            } catch (error) {
                console.error('❌ 로그아웃 오류:', error);
                showToast('로그아웃 실패: ' + error.message);
            }
        }
    }

    // Menu Data Loading with Error Handling
    function loadMenuData(gender) {
        showLoading(true);
        
        // 성별 데이터 존재 확인
        if (!MENU_DATA[gender]) {
            console.error(`❌ Gender data not found: ${gender}`);
            showToast(`❌ ${gender} 데이터를 찾을 수 없습니다.`);
            showLoading(false);
            return;
        }
        
        menuData = MENU_DATA[gender];
        
        // categories 배열 존재 확인
        if (!menuData.categories || !Array.isArray(menuData.categories)) {
            console.error(`❌ Categories not found for gender: ${gender}`);
            showToast(`❌ ${gender} 카테고리 데이터가 올바르지 않습니다.`);
            showLoading(false);
            return;
        }
        
        console.log(`✅ 메뉴 데이터 로드 완료 - ${gender}:`, {
            categories: menuData.categories.length,
            subcategories: menuData.subcategories.length
        });
        
        renderCategories(gender);
        
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0], gender);
        }
        
        setTimeout(() => showLoading(false), 300);
    }

    // Render Categories with Enhanced Error Handling
    function renderCategories(gender) {
        if (!categoryTabs) {
            console.error('❌ Category tabs container not found');
            return;
        }
        
        categoryTabs.innerHTML = '';
        
        // 여성인 경우 맨 앞에 물음표 도움말 버튼 추가
        if (gender === 'female') {
            const helpTab = document.createElement('button');
            helpTab.className = 'category-tab help-tab';
            helpTab.innerHTML = '?';
            helpTab.title = '길이 가이드 보기';
            helpTab.addEventListener('click', function() {
                window.open('https://drive.google.com/file/d/15OgT9k5jCC6TjcJSImuQXcznS_HtFBVf/view?usp=sharing', '_blank');
            });
            categoryTabs.appendChild(helpTab);
        }
        
        // Categories 안전 체크
        if (!menuData || !menuData.categories || !Array.isArray(menuData.categories)) {
            console.error('❌ MenuData categories is invalid:', menuData);
            showToast('❌ 카테고리 데이터를 로드할 수 없습니다.');
            return;
        }
        
        // 카테고리 탭 생성
        menuData.categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.textContent = category.name || 'Unknown';
            tab.dataset.categoryId = category.id || `category-${index}`;
            tab.title = category.description || category.name;
            
            if (index === 0) {
                tab.classList.add('active', gender);
            }
            
            tab.addEventListener('click', function() {
                selectCategory(category, gender);
            });
            
            categoryTabs.appendChild(tab);
        });
        
        console.log(`✅ ${menuData.categories.length}개 카테고리 렌더링 완료 - ${gender}`);
    }

    // Select Category
    function selectCategory(category, gender) {
        currentCategory = category;
        
        // 탭 활성화 상태 업데이트
        document.querySelectorAll('.category-tab').forEach(tab => {
            if (tab.classList.contains('help-tab')) return; // 물음표 버튼은 제외
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === category.id) {
                tab.classList.add('active', gender);
            }
        });
        
        // 카테고리 설명 업데이트
        if (categoryDescription) {
            categoryDescription.textContent = category.description || '';
        }
        
        renderSubcategories(gender);
        loadStyles(category.id, currentSubcategory, gender);
        
        console.log(`🎯 카테고리 선택: ${category.name} (${gender})`);
    }

    // Render Subcategories
    function renderSubcategories(gender) {
        if (!subcategoryTabs) return;
        
        subcategoryTabs.innerHTML = '';
        
        const subcategories = menuData.subcategories || [];
        
        subcategories.forEach((sub, index) => {
            const tab = document.createElement('button');
            tab.className = 'subcategory-tab';
            tab.textContent = sub;
            tab.dataset.subcategory = sub;
            
            if (index === 0) {
                tab.classList.add('active', gender);
                currentSubcategory = sub;
            }
            
            tab.addEventListener('click', function() {
                selectSubcategory(sub, gender);
            });
            
            subcategoryTabs.appendChild(tab);
        });
        
        console.log(`✅ ${subcategories.length}개 서브카테고리 렌더링 완료`);
    }

    // Select Subcategory
    function selectSubcategory(subcategory, gender) {
        currentSubcategory = subcategory;
        
        document.querySelectorAll('.subcategory-tab').forEach(tab => {
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.subcategory === subcategory) {
                tab.classList.add('active', gender);
            }
        });
        
        loadStyles(currentCategory.id, subcategory, gender);
        
        console.log(`🎯 서브카테고리 선택: ${subcategory}`);
    }

    // Load Styles from Firebase with Enhanced Error Handling
    async function loadStyles(categoryId, subcategory, gender) {
        if (!menuGrid) return;
        
        menuGrid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            // Firebase 초기화 확인
            if (typeof db === 'undefined') {
                console.error('❌ Firebase not initialized');
                menuGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                        <div>Firebase 연결 중...</div>
                    </div>
                `;
                return;
            }
            
            // 현재 카테고리 이름 찾기
            const categoryName = currentCategory?.name || 'Unknown';
            console.log('📱 스타일 로딩 중:', { gender, categoryName, subcategory });
            
            // Firebase에서 데이터 가져오기
            const query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', categoryName)
                .where('subCategory', '==', subcategory);
            
            const snapshot = await query.get();
            
            menuGrid.innerHTML = '';
            
            // 결과가 없는 경우
            if (snapshot.empty) {
                menuGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                        <div style="font-size: 16px; margin-bottom: 8px;">등록된 스타일이 없습니다</div>
                        <div style="font-size: 12px; color: #666;">
                            ${categoryName} - ${subcategory}
                        </div>
                    </div>
                `;
                console.log(`📭 스타일 없음: ${categoryName} - ${subcategory}`);
                return;
            }
            
            // 스타일 카드 생성
            let styleCount = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = `menu-item ${gender}`;
                
                // 이미지와 정보 표시
                item.innerHTML = `
                    <img src="${data.imageUrl || ''}" 
                         alt="${data.name || 'Style'}" 
                         class="menu-item-image"
                         onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); padding: 10px; text-align: center;">
                        <div style="font-size: 11px; color: #ccc;">${data.code || ''}</div>
                        <div style="font-size: 13px; color: white; margin-top: 3px; font-weight: 500;">${data.name || ''}</div>
                    </div>
                `;
                
                item.addEventListener('click', function() {
                    showStyleDetail(data.code, data.name, gender, data.imageUrl, doc.id);
                });
                
                menuGrid.appendChild(item);
                styleCount++;
            });
            
            console.log(`✅ ${styleCount}개 스타일 로드 완료: ${categoryName} - ${subcategory}`);
            
        } catch (error) {
            console.error('❌ 스타일 로드 오류:', error);
            menuGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff4444;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 16px; margin-bottom: 8px;">데이터 로드 실패</div>
                    <div style="font-size: 12px; color: #999;">${error.message}</div>
                </div>
            `;
        }
    }

    // Modal Functions
    function closeModal() {
        if (styleModal) {
            styleModal.classList.remove('active');
        }
    }

    // Show Style Detail Modal with Enhanced Features
    function showStyleDetail(code, name, gender, imageSrc, docId) {
        if (!styleModal) return;
        
        // 모달 이미지 설정
        if (modalImage) {
            modalImage.src = imageSrc || '';
            modalImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            };
        }
        
        // 모달 정보 설정
        if (modalCode) modalCode.textContent = code || '';
        if (modalName) modalName.textContent = name || '';
        
        // 성별에 따른 버튼 스타일 적용
        if (btnRegister) {
            btnRegister.classList.toggle('female', gender === 'female');
        }
        
        // 좋아요 상태 초기화
        if (btnLike) {
            btnLike.classList.remove('active');
            const heart = btnLike.querySelector('span:first-child');
            if (heart) heart.textContent = '♡';
        }
        
        // 모달 표시
        styleModal.classList.add('active');
        
        // 고객 등록 버튼 이벤트
        if (btnRegister) {
            btnRegister.onclick = async function() {
                await handleCustomerRegistration(code, name, docId, gender);
            };
        }
        
        // 좋아요 버튼 이벤트
        if (btnLike) {
            btnLike.onclick = async function() {
                await handleLikeToggle(this, docId);
            };
        }
        
        console.log(`🎭 모달 표시: ${code} - ${name}`);
    }

    // Customer Registration Handler with Token System
    async function handleCustomerRegistration(code, name, docId, gender) {
        // 토큰 시스템을 사용하여 고객 등록
        return await executeWithTokens('CUSTOMER_REGISTER', async () => {
            const customerName = prompt('고객 이름을 입력하세요:');
            if (!customerName) return;
            
            const customerPhone = prompt('전화번호를 입력하세요 (예: 010-1234-5678):');
            if (!customerPhone) return;
            
            try {
                await db.collection('customers').add({
                    name: customerName,
                    phone: customerPhone,
                    styleCode: code,
                    styleName: name,
                    styleId: docId,
                    gender: gender,
                    designer: currentUser?.name || 'Unknown',
                    designerId: currentUser?.id || null,
                    registeredAt: new Date(),
                    lastVisit: new Date()
                });
                
                showToast('✅ 고객 등록 완료! (1토큰 사용됨)');
                console.log(`✅ 고객 등록: ${customerName} - ${code}`);
                
                // 현재 토큰 잔액 업데이트 (executeWithTokens에서 자동 처리되지만 UI 업데이트용)
                if (currentUser) {
                    // Firebase에서 최신 토큰 정보 다시 불러오기
                    const userDoc = await db.collection('designers').doc(currentUser.id).get();
                    if (userDoc.exists) {
                        currentUser.tokens = userDoc.data().tokens || 0;
                        localStorage.setItem('hairgator_user', JSON.stringify(currentUser));
                        updateTokenDisplay();
                    }
                }
                
                closeModal();
                return true;
            } catch (error) {
                console.error('❌ 고객 등록 오류:', error);
                showToast('❌ 등록 실패: ' + error.message);
                throw error;
            }
        });
    }

    // Like Toggle Handler (무료 기능)
    async function handleLikeToggle(button, docId) {
        // 즐겨찾기는 무료 기능
        return await executeWithTokens('FAVORITES', async () => {
            button.classList.toggle('active');
            const heart = button.querySelector('span:first-child');
            
            if (heart) {
                const isLiked = button.classList.contains('active');
                heart.textContent = isLiked ? '♥' : '♡';
                
                // Firebase에 좋아요 업데이트
                if (docId && typeof firebase !== 'undefined') {
                    try {
                        const docRef = db.collection('hairstyles').doc(docId);
                        await docRef.update({
                            likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1),
                            likedBy: isLiked ? 
                                firebase.firestore.FieldValue.arrayUnion(currentUser?.id || 'anonymous') :
                                firebase.firestore.FieldValue.arrayRemove(currentUser?.id || 'anonymous')
                        });
                        console.log(`${isLiked ? '❤️' : '💔'} 좋아요 업데이트: ${docId}`);
                        return true;
                    } catch (error) {
                        console.error('❌ 좋아요 업데이트 오류:', error);
                        throw error;
                    }
                }
            }
        });
    }

    // ========== executeWithTokens 함수 통합 (토큰 시스템과 연동) ==========
    
    // 전역 executeWithTokens 함수가 없는 경우 기본 구현 제공
    if (!window.executeWithTokens) {
        console.log('🪙 토큰 시스템이 로드되지 않음. 기본 구현 사용.');
        
        // 기본 토큰 비용 (토큰 시스템과 동일)
        const BASIC_TOKEN_COSTS = {
            'MENU_VIEW': 0,
            'STYLE_DETAIL': 0,
            'BASIC_SEARCH': 0,
            'SHOP_INFO': 0,
            'PWA_INSTALL': 0,
            'CUSTOMER_REGISTER': 1,
            'RESERVATION_CREATE': 1,
            'BASIC_ANALYTICS': 2,
            'PROFILE_MANAGE': 1,
            'FAVORITES': 1,
            'ADVANCED_RECOMMEND': 3,
            'DATA_EXPORT': 3,
            'CUSTOM_REPORT': 4,
            'AI_FACE_ANALYSIS': 5,
            'BULK_OPERATIONS': 10,
            'ADVANCED_ANALYTICS': 8
        };
        
        // 기본 executeWithTokens 구현
        window.executeWithTokens = async function(featureKey, callback) {
            try {
                const cost = BASIC_TOKEN_COSTS[featureKey] || 0;
                
                console.log(`기능 실행 시도: ${featureKey}, 비용: ${cost}토큰`);
                
                // 무료 기능
                if (cost === 0) {
                    console.log(`무료 기능 실행: ${featureKey}`);
                    return await callback();
                }
                
                // 로그인 확인
                if (!currentUser) {
                    alert('로그인이 필요한 기능입니다.');
                    return null;
                }
                
                // 토큰 잔액 확인
                const currentTokens = currentUser.tokens || 0;
                if (currentTokens < cost) {
                    const proceed = confirm(
                        `토큰이 부족합니다.\n` +
                        `필요: ${cost}토큰, 보유: ${currentTokens}토큰\n\n` +
                        `관리자에게 토큰 충전을 요청하시겠습니까?`
                    );
                    
                    if (proceed) {
                        showToast('관리자에게 토큰 충전을 요청해주세요.');
                    }
                    return null;
                }
                
                // 토큰 차감 및 기능 실행
                try {
                    // Firebase에서 토큰 차감
                    await db.collection('designers').doc(currentUser.id).update({
                        tokens: firebase.firestore.FieldValue.increment(-cost),
                        tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                            featureKey: featureKey,
                            cost: cost,
                            timestamp: new Date(),
                            type: 'consume'
                        })
                    });
                    
                    // 로컬 사용자 정보 업데이트
                    currentUser.tokens = currentTokens - cost;
                    localStorage.setItem('hairgator_user', JSON.stringify(currentUser));
                    updateTokenDisplay();
                    
                    console.log(`토큰 소비: ${cost}개 (${featureKey}), 잔액: ${currentUser.tokens}`);
                    
                    // 기능 실행
                    return await callback();
                    
                } catch (tokenError) {
                    console.error('토큰 처리 실패:', tokenError);
                    alert('토큰 처리 중 오류가 발생했습니다: ' + tokenError.message);
                    return null;
                }
                
            } catch (error) {
                console.error(`기능 실행 실패 (${featureKey}):`, error);
                alert('기능 실행 중 오류가 발생했습니다: ' + error.message);
                return null;
            }
        };
        
        // setCurrentUser 함수도 제공
        window.setCurrentUser = function(user) {
            currentUser = user;
            updateTokenDisplay();
            console.log('사용자 설정:', user ? user.name : 'null');
        };
    }

    // Loading Functions
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', show);
        }
    }

    // Toast Message Function - 강화된 버전
    function showToast(message) {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 새 토스트 생성
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            animation: toastSlideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // 전역 함수로 등록 (HTML에서 onclick 사용 시)
    window.handleBack = handleBack;
    window.toggleTheme = toggleTheme;
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
    window.handleLogout = handleLogout;

    // Performance Monitoring
    console.log('🚀 HAIRGATOR 애플리케이션 준비 완료 (토큰 시스템 통합)');
});

// Window Load Event
window.addEventListener('load', function() {
    console.log('🦎 HAIRGATOR 앱 완전 로드 완료');
    
    // CSS 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        
        @keyframes toastSlideOut {
            from { transform: translateX(-50%) translateY(0); opacity: 1; }
            to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        }
        
        .menu-item {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .menu-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top: 4px solid #E91E63;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 토큰 표시 스타일 */
        .token-display {
            color: #FF1493;
            font-weight: bold;
            background: rgba(255, 20, 147, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 20, 147, 0.3);
            font-size: 12px;
            display: none;
        }
        
        .token-display.visible {
            display: inline-block;
        }
    `;
    document.head.appendChild(style);
});
