// HAIRGATOR Main Application Logic - 최종 버전 (모든 에러 수정)
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentGender = null;
    let currentCategory = null;
    let currentSubcategory = 'None';
    let menuData = {};

    // 🎨 테마 레지스트리 - 먼저 선언 (호이스팅 문제 해결)
    const THEME_REGISTRY = {
        dark: {
            name: '다크 모드',
            icon: '🌙',
            className: '',
            category: 'basic'
        },
        light: {
            name: '라이트 모드',
            icon: '☀️',
            className: 'light-theme',
            category: 'basic'
        },
        blue: {
            name: '오션 블루',
            icon: '🌊',
            className: 'blue-theme',
            category: 'color'
        },
        purple: {
            name: '갤럭시 퍼플',
            icon: '🔮',
            className: 'purple-theme',
            category: 'color'
        },
        green: {
            name: '네이처 그린',
            icon: '🌲',
            className: 'green-theme',
            category: 'color'
        }
    };

    // 현재 활성화된 테마들
    let enabledThemes = ['dark', 'light', 'blue', 'purple', 'green'];
    let currentTheme = 'dark';

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
        initThemeSystem();
        checkAuthStatus();
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        console.log('✅ HAIRGATOR 초기화 완료');
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Back Button
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
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
                console.log(`🎯 성별 선택: ${this.dataset.gender}`);
                selectGender(this.dataset.gender);
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

        // 테마 옵션 클릭 이벤트
        document.addEventListener('click', function(e) {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption && themeOption.dataset.theme) {
                const themeName = themeOption.dataset.theme;
                setTheme(themeName);
            }
        });

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // ========== 테마 시스템 ==========
    
    // 테마 시스템 초기화
    function initThemeSystem() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        
        if (THEME_REGISTRY[savedTheme] && enabledThemes.includes(savedTheme)) {
            currentTheme = savedTheme;
        }
        
        applyTheme(currentTheme);
        updateAllThemeUI();
        
        console.log(`🎨 테마 시스템 초기화: ${THEME_REGISTRY[currentTheme].name}`);
    }

    // 테마 적용
    function applyTheme(themeName) {
        if (!THEME_REGISTRY[themeName]) {
            console.error(`테마 '${themeName}'를 찾을 수 없습니다`);
            return;
        }

        const theme = THEME_REGISTRY[themeName];
        const body = document.body;

        // 모든 테마 클래스 제거
        Object.values(THEME_REGISTRY).forEach(t => {
            if (t.className) body.classList.remove(t.className);
        });

        // 새 테마 클래스 추가
        if (theme.className) {
            body.classList.add(theme.className);
        }

        currentTheme = themeName;
        localStorage.setItem('hairgator_theme', themeName);

        console.log(`🎨 테마 적용: ${theme.name}`);
        showToast(`${theme.name}로 변경되었습니다`);
    }

    // 테마 토글
    function toggleTheme() {
        const availableThemes = enabledThemes.filter(key => THEME_REGISTRY[key]);
        const currentIndex = availableThemes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % availableThemes.length;
        const nextTheme = availableThemes[nextIndex];
        
        setTheme(nextTheme);
    }

    // 특정 테마로 설정
    function setTheme(themeName) {
        if (!THEME_REGISTRY[themeName]) {
            console.error(`테마 '${themeName}'가 존재하지 않습니다`);
            return;
        }

        if (!enabledThemes.includes(themeName)) {
            console.warn(`테마 '${themeName}'가 비활성화되어 있습니다`);
            return;
        }

        applyTheme(themeName);
        updateAllThemeUI();
        closeSidebar();
    }

    // 모든 테마 UI 업데이트
    function updateAllThemeUI() {
        updateThemeIcon();
        updateThemeStatus();
        updateSidebarThemeOptions();
    }

    // 테마 아이콘 업데이트
    function updateThemeIcon() {
        const theme = THEME_REGISTRY[currentTheme];
        const themeIcons = document.querySelectorAll('.theme-icon');
        
        themeIcons.forEach(icon => {
            if (icon) icon.textContent = theme.icon;
        });
    }

    // 테마 상태 업데이트
    function updateThemeStatus() {
        if (themeStatus) {
            themeStatus.textContent = currentTheme === 'dark' ? 'ON' : 'OFF';
        }

        if (themeToggleBottom) {
            const theme = THEME_REGISTRY[currentTheme];
            const iconSpan = themeToggleBottom.querySelector('span:first-child');
            const textSpan = themeToggleBottom.querySelector('span:nth-child(2)');
            
            if (iconSpan) iconSpan.textContent = theme.icon;
            if (textSpan) textSpan.textContent = theme.name;
        }
    }

    // 사이드바 테마 옵션 동적 생성
    function updateSidebarThemeOptions() {
        const container = document.querySelector('.theme-options');
        if (!container) return;

        container.innerHTML = '';

        enabledThemes.forEach(themeKey => {
            if (!THEME_REGISTRY[themeKey]) return;

            const theme = THEME_REGISTRY[themeKey];
            const option = document.createElement('button');
            option.className = `theme-option ${themeKey === currentTheme ? 'active' : ''}`;
            option.dataset.theme = themeKey;

            option.innerHTML = `
                <span class="theme-preview ${theme.className || 'dark'}"></span>
                <span>${theme.name}</span>
            `;

            container.appendChild(option);
        });
    }

    // 전역 함수로 노출
    window.setTheme = setTheme;
    window.getCurrentTheme = () => currentTheme;

    // Navigation Functions
    function handleBack() {
        if (menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            genderSelection.style.display = 'flex';
            backBtn.style.display = 'none';
            
            if (themeToggleBottom) {
                themeToggleBottom.style.display = 'flex';
            }
            
            currentGender = null;
            currentCategory = null;
            console.log('🔙 성별 선택 화면으로 이동');
        }
    }

    // Sidebar Functions
    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
    }

    // Authentication Functions
    function checkAuthStatus() {
        const designerInfo = document.getElementById('designerInfo');
        if (window.auth && window.auth.currentUser) {
            if (designerInfo) designerInfo.style.display = 'block';
            const designerNameEl = document.getElementById('designerName');
            if (designerNameEl) {
                designerNameEl.textContent = window.auth.currentUser.displayName || window.auth.currentUser.email;
            }
            console.log('✅ 사용자 인증 확인 완료');
        }
    }

    async function handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                if (window.authManager) {
                    await window.authManager.signOut();
                }
                location.reload();
            } catch (error) {
                console.error('❌ 로그아웃 오류:', error);
                showToast('로그아웃 실패: ' + error.message);
            }
        }
    }

    // Gender Selection
    function selectGender(gender) {
        currentGender = gender;
        
        genderSelection.style.display = 'none';
        menuContainer.classList.add('active');
        
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        
        if (themeToggleBottom) {
            themeToggleBottom.style.display = 'none';
        }
        
        loadMenuData(gender);
        localStorage.setItem('hairgator_gender', gender);
        
        console.log(`✅ 성별 선택 완료: ${gender}`);
    }

    // Menu Data Loading
    function loadMenuData(gender) {
        showLoading(true);
        
        if (!MENU_DATA[gender]) {
            console.error(`❌ Gender data not found: ${gender}`);
            showToast(`❌ ${gender} 데이터를 찾을 수 없습니다.`);
            showLoading(false);
            return;
        }
        
        menuData = MENU_DATA[gender];
        
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

    // Render Categories
    function renderCategories(gender) {
        if (!categoryTabs) {
            console.error('❌ Category tabs container not found');
            return;
        }
        
        categoryTabs.innerHTML = '';
        
        // 여성인 경우 도움말 버튼 추가
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
        
        if (!menuData || !menuData.categories || !Array.isArray(menuData.categories)) {
            console.error('❌ MenuData categories is invalid:', menuData);
            showToast('❌ 카테고리 데이터를 로드할 수 없습니다.');
            return;
        }
        
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
        
        document.querySelectorAll('.category-tab').forEach(tab => {
            if (tab.classList.contains('help-tab')) return;
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === category.id) {
                tab.classList.add('active', gender);
            }
        });
        
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

    // Load Styles from Firebase
    async function loadStyles(categoryId, subcategory, gender) {
        if (!menuGrid) return;
        
        menuGrid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
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
            
            const categoryName = currentCategory?.name || 'Unknown';
            console.log('📱 스타일 로딩 중:', { gender, categoryName, subcategory });
            
            const query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', categoryName)
                .where('subCategory', '==', subcategory);
            
            const snapshot = await query.get();
            
            menuGrid.innerHTML = '';
            
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
            
            let styleCount = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = `menu-item ${gender}`;
                
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

    function showStyleDetail(code, name, gender, imageSrc, docId) {
        if (!styleModal) return;
        
        if (modalImage) {
            modalImage.src = imageSrc || '';
            modalImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            };
        }
        
        if (modalCode) modalCode.textContent = code || '';
        if (modalName) modalName.textContent = name || '';
        
        if (btnRegister) {
            btnRegister.classList.toggle('female', gender === 'female');
        }
        
        if (btnLike) {
            btnLike.classList.remove('active');
            const heart = btnLike.querySelector('span:first-child');
            if (heart) heart.textContent = '♡';
        }
        
        styleModal.classList.add('active');
        
        if (btnRegister) {
            btnRegister.onclick = async function() {
                await handleCustomerRegistration(code, name, docId, gender);
            };
        }
        
        if (btnLike) {
            btnLike.onclick = async function() {
                await handleLikeToggle(this, docId);
            };
        }
        
        console.log(`🎭 모달 표시: ${code} - ${name}`);
    }

    // Customer Registration Handler
    async function handleCustomerRegistration(code, name, docId, gender) {
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
                designer: localStorage.getItem('designerName') || 'Unknown',
                registeredAt: new Date(),
                lastVisit: new Date()
            });
            
            showToast('✅ 고객 등록 완료!');
            console.log(`✅ 고객 등록: ${customerName} - ${code}`);
            closeModal();
        } catch (error) {
            console.error('❌ 고객 등록 오류:', error);
            showToast('❌ 등록 실패: ' + error.message);
        }
    }

    // Like Toggle Handler
    async function handleLikeToggle(button, docId) {
        button.classList.toggle('active');
        const heart = button.querySelector('span:first-child');
        
        if (heart) {
            const isLiked = button.classList.contains('active');
            heart.textContent = isLiked ? '♥' : '♡';
            
            if (docId && typeof firebase !== 'undefined') {
                try {
                    const docRef = db.collection('hairstyles').doc(docId);
                    await docRef.update({
                        likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
                    });
                    console.log(`${isLiked ? '❤️' : '💔'} 좋아요 업데이트: ${docId}`);
                } catch (error) {
                    console.error('❌ 좋아요 업데이트 오류:', error);
                }
            }
        }
    }

    // Loading Functions
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', show);
        }
    }

    // Toast Message Function
    function showToast(message) {
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: toastSlideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    console.log('🚀 HAIRGATOR 애플리케이션 준비 완료');
});

// Window Load Event
window.addEventListener('load', function() {
    console.log('🦎 HAIRGATOR 앱 완전 로드 완료');
    
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
    `;
    document.head.appendChild(style);
});
