// Main Application Logic with Integrated Sakura Background System
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentGender = null;
    let currentCategory = null;
    let currentSubcategory = 'None';
    let menuData = {};

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

    // Menu Data Structure
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

    // 🌸 Sakura Background Manager (Integrated)
    class SakuraBackgroundManager {
        constructor() {
            this.currentBackground = 'none';
            this.isTabletMode = window.innerWidth >= 768;
            
            if (this.isTabletMode) {
                this.init();
            }
            
            console.log('🌸 벚꽃 배경 매니저 초기화 완료');
        }
        
        init() {
            this.createBackgroundSelector();
            this.loadSavedBackground();
            this.setupThemeChangeListener();
            
            // 리사이즈 감지
            window.addEventListener('resize', this.debounce(() => {
                this.isTabletMode = window.innerWidth >= 768;
                if (!this.isTabletMode) {
                    this.removeExistingBackground();
                    this.removeBackgroundSelector();
                } else if (!document.querySelector('.background-section')) {
                    this.createBackgroundSelector();
                }
            }, 300));
        }
        
        createBackgroundSelector() {
            if (!this.isTabletMode || !sidebar) return;
            
            // 기존 배경 섹션 제거
            this.removeBackgroundSelector();
            
            const backgroundSection = document.createElement('div');
            backgroundSection.className = 'background-section';
            backgroundSection.style.cssText = `
                margin: 20px 0;
                padding: 20px 0;
                border-top: 1px solid #333;
                border-bottom: 1px solid #333;
            `;
            
            backgroundSection.innerHTML = `
                <h3 style="color: #FF1493; margin-bottom: 15px; font-size: 16px;">
                    🌸 벚꽃 배경 (태블릿 전용)
                </h3>
                <div class="background-options" style="display: flex; gap: 10px;">
                    <button class="background-option" data-bg="none" style="
                        padding: 10px 15px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s;
                        flex: 1;
                    ">
                        🌑 기본
                    </button>
                    <button class="background-option" data-bg="sakura" style="
                        padding: 10px 15px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s;
                        flex: 1;
                    ">
                        🌸 벚꽃
                    </button>
                </div>
            `;
            
            // 사이드바 컨텐츠에 추가
            const sidebarContent = sidebar.querySelector('.sidebar-content');
            if (sidebarContent) {
                sidebarContent.appendChild(backgroundSection);
                this.setupBackgroundButtons();
                console.log('✅ 벚꽃 배경 UI 생성 완료');
            }
        }
        
        setupBackgroundButtons() {
            document.querySelectorAll('.background-option').forEach(button => {
                button.addEventListener('click', (e) => {
                    const bgType = e.target.dataset.bg;
                    this.changeBackground(bgType);
                    console.log(`🌸 배경 선택: ${bgType}`);
                });
                
                // 호버 효과
                button.addEventListener('mouseenter', (e) => {
                    if (e.target.dataset.bg !== this.currentBackground) {
                        e.target.style.background = '#3a3a3a';
                        e.target.style.transform = 'translateY(-1px)';
                    }
                });
                
                button.addEventListener('mouseleave', (e) => {
                    if (e.target.dataset.bg !== this.currentBackground) {
                        e.target.style.background = '#2a2a2a';
                        e.target.style.transform = 'translateY(0)';
                    }
                });
            });
        }
        
        changeBackground(type) {
            if (!this.isTabletMode) return;
            
            this.removeExistingBackground();
            this.currentBackground = type;
            
            if (type === 'none') {
                this.updateActiveButton('none');
                localStorage.setItem('hairgator_background', 'none');
                return;
            }
            
            if (type === 'sakura') {
                this.createSakuraBackground();
                this.applyTransparentUI();
            }
            
            this.updateActiveButton(type);
            localStorage.setItem('hairgator_background', type);
            
            console.log(`✅ 벚꽃 배경 적용: ${type}`);
        }
        
        createSakuraBackground() {
            const isLightTheme = document.body.classList.contains('light-theme');
            let backgroundCSS = '';
            
            if (isLightTheme) {
                // 라이트 모드 - 따뜻한 봄날 벚꽃
                backgroundCSS = `
                    .hairgator-sakura-background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, 
                            #fef7f7 0%, 
                            #fce4ec 25%, 
                            #f8bbd9 50%, 
                            #f48fb1 75%, 
                            #f06292 100%);
                        z-index: -1;
                        pointer-events: none;
                        overflow: hidden;
                    }
                    
                    .hairgator-sakura-background::before {
                        content: '';
                        position: absolute;
                        top: -10%;
                        left: -10%;
                        width: 120%;
                        height: 120%;
                        background: 
                            radial-gradient(4px 4px at 30px 40px, rgba(233, 30, 99, 0.6), transparent),
                            radial-gradient(6px 6px at 80px 20px, rgba(233, 30, 99, 0.4), transparent),
                            radial-gradient(3px 3px at 150px 90px, rgba(233, 30, 99, 0.5), transparent),
                            radial-gradient(5px 5px at 200px 130px, rgba(233, 30, 99, 0.3), transparent);
                        background-repeat: repeat;
                        background-size: 250px 180px;
                        animation: sakuraLightFall 12s linear infinite;
                    }
                    
                    @keyframes sakuraLightFall {
                        0% { transform: translateY(-20px) rotate(0deg); opacity: 0.8; }
                        50% { transform: translateY(50vh) rotate(180deg); opacity: 0.6; }
                        100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
                    }
                `;
            } else {
                // 다크 모드 - 신비로운 밤 벚꽃
                backgroundCSS = `
                    .hairgator-sakura-background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, 
                            #0c0c0c 0%, 
                            #1a1a2e 25%, 
                            #16213e 50%, 
                            #0f3460 75%, 
                            #0e4b5a 100%);
                        z-index: -1;
                        pointer-events: none;
                        overflow: hidden;
                    }
                    
                    .hairgator-sakura-background::before {
                        content: '';
                        position: absolute;
                        top: -10%;
                        left: -10%;
                        width: 120%;
                        height: 120%;
                        background: 
                            radial-gradient(5px 5px at 40px 50px, rgba(255, 107, 157, 0.9), transparent),
                            radial-gradient(3px 3px at 90px 30px, rgba(255, 143, 171, 0.7), transparent),
                            radial-gradient(7px 7px at 160px 80px, rgba(255, 168, 204, 0.8), transparent),
                            radial-gradient(4px 4px at 210px 120px, rgba(255, 107, 157, 0.6), transparent);
                        background-repeat: repeat;
                        background-size: 280px 180px;
                        animation: sakuraDarkFall 13s linear infinite;
                    }
                    
                    @keyframes sakuraDarkFall {
                        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                        30% { transform: translateY(30vh) rotate(120deg); opacity: 0.8; }
                        70% { transform: translateY(70vh) rotate(240deg); opacity: 0.6; }
                        100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
                    }
                `;
            }
            
            // CSS 적용
            const existingStyle = document.getElementById('hairgator-sakura-style');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const style = document.createElement('style');
            style.id = 'hairgator-sakura-style';
            style.textContent = backgroundCSS;
            document.head.appendChild(style);
            
            // 배경 요소 생성
            const bgElement = document.createElement('div');
            bgElement.className = 'hairgator-sakura-background';
            document.body.prepend(bgElement);
        }
        
        applyTransparentUI() {
            const isLightTheme = document.body.classList.contains('light-theme');
            
            if (isLightTheme) {
                this.applyLightModeTransparency();
                this.fixTabClickStyles();
            }
        }
        
        applyLightModeTransparency() {
            // 헤더 투명화
            const header = document.querySelector('.header');
            if (header) {
                header.style.cssText = `
                    background: rgba(255, 255, 255, 0.15) !important;
                    backdrop-filter: blur(20px) saturate(1.2) !important;
                    border-bottom: none !important;
                    box-shadow: none !important;
                `;
                
                // 헤더 텍스트 강화
                const logo = header.querySelector('.logo');
                if (logo) {
                    logo.style.cssText = `
                        color: #000 !important;
                        text-shadow: 0 2px 4px rgba(255,255,255,0.8) !important;
                        font-weight: 900 !important;
                    `;
                }
                
                const backBtn = header.querySelector('.back-btn');
                if (backBtn) {
                    backBtn.style.cssText = `
                        color: #000 !important;
                        text-shadow: 0 2px 4px rgba(255,255,255,0.8) !important;
                        font-weight: bold !important;
                    `;
                }
                
                const menuBtn = header.querySelector('.menu-btn');
                if (menuBtn) {
                    const spans = menuBtn.querySelectorAll('span');
                    spans.forEach(span => {
                        span.style.cssText = `
                            background: #000 !important;
                            box-shadow: 0 2px 4px rgba(255,255,255,0.8) !important;
                        `;
                    });
                }
            }
            
            // 카테고리 영역 투명화
            const categoryTabsWrapper = document.querySelector('.category-tabs-wrapper');
            if (categoryTabsWrapper) {
                categoryTabsWrapper.style.cssText = `
                    background: rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: blur(10px) !important;
                    border-bottom: none !important;
                `;
            }
            
            // 설명 영역 투명화
            if (categoryDescription) {
                categoryDescription.style.cssText = `
                    background: rgba(255, 255, 255, 0.1) !important;
                    color: #000 !important;
                    text-shadow: 0 1px 3px rgba(255,255,255,0.8) !important;
                    backdrop-filter: blur(8px) !important;
                    border-bottom: none !important;
                    font-weight: 600 !important;
                `;
            }
            
            // 서브카테고리 투명화
            const subcategoryWrapper = document.querySelector('.subcategory-wrapper');
            if (subcategoryWrapper) {
                subcategoryWrapper.style.cssText = `
                    background: rgba(255, 255, 255, 0.05) !important;
                    backdrop-filter: blur(5px) !important;
                    border-bottom: none !important;
                `;
            }
        }
        
        fixTabClickStyles() {
            // 대분류 탭 스타일 적용
            const categoryTabs = document.querySelectorAll('.category-tab:not(.help-tab)');
            categoryTabs.forEach(tab => {
                if (tab.classList.contains('active')) {
                    tab.style.cssText = `
                        background: rgba(74, 144, 226, 0.9) !important;
                        color: white !important;
                        border: 1px solid rgba(74, 144, 226, 1) !important;
                        text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
                        font-weight: bold !important;
                        box-shadow: 0 3px 12px rgba(74, 144, 226, 0.5) !important;
                        transform: translateY(-1px) !important;
                    `;
                } else {
                    tab.style.cssText = `
                        background: rgba(255, 255, 255, 0.2) !important;
                        color: #000 !important;
                        border: 1px solid rgba(255, 255, 255, 0.3) !important;
                        text-shadow: 0 1px 3px rgba(255,255,255,0.8) !important;
                        font-weight: bold !important;
                    `;
                }
            });
            
            // 중분류 탭 스타일 적용
            const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
            subcategoryTabs.forEach(tab => {
                if (tab.classList.contains('active')) {
                    tab.style.cssText = `
                        background: rgba(74, 144, 226, 0.9) !important;
                        color: white !important;
                        border: 1px solid rgba(74, 144, 226, 1) !important;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
                        font-weight: bold !important;
                        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.4) !important;
                        transform: translateY(-1px) !important;
                    `;
                } else {
                    tab.style.cssText = `
                        background: rgba(255, 255, 255, 0.2) !important;
                        color: #000 !important;
                        border: 1px solid rgba(255, 255, 255, 0.3) !important;
                        text-shadow: 0 1px 2px rgba(255,255,255,0.8) !important;
                        font-weight: bold !important;
                    `;
                }
            });
        }
        
        removeExistingBackground() {
            const existingStyle = document.getElementById('hairgator-sakura-style');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const existingBg = document.querySelector('.hairgator-sakura-background');
            if (existingBg) {
                existingBg.remove();
            }
        }
        
        removeBackgroundSelector() {
            const backgroundSection = document.querySelector('.background-section');
            if (backgroundSection) {
                backgroundSection.remove();
            }
        }
        
        loadSavedBackground() {
            const saved = localStorage.getItem('hairgator_background');
            if (saved && saved !== 'none') {
                this.changeBackground(saved);
            }
            this.updateActiveButton(saved || 'none');
        }
        
        setupThemeChangeListener() {
            const observer = new MutationObserver(() => {
                if (this.currentBackground === 'sakura') {
                    // 테마가 변경되면 벚꽃 배경을 다시 로드
                    this.createSakuraBackground();
                    this.applyTransparentUI();
                }
            });
            
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        
        updateActiveButton(activeKey) {
            if (!this.isTabletMode) return;
            
            document.querySelectorAll('.background-option').forEach(btn => {
                if (btn.dataset.bg === activeKey) {
                    btn.style.background = 'linear-gradient(45deg, #FF1493, #FF69B4)';
                    btn.style.borderColor = '#FF1493';
                    btn.style.boxShadow = '0 0 15px rgba(255, 20, 147, 0.3)';
                    btn.style.transform = 'translateY(-2px)';
                } else {
                    btn.style.background = '#2a2a2a';
                    btn.style.borderColor = '#444';
                    btn.style.boxShadow = 'none';
                    btn.style.transform = 'translateY(0)';
                }
            });
        }
        
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadTheme();
        checkAuthStatus();
        
        // 벚꽃 배경 매니저 초기화 (태블릿에서만)
        if (window.innerWidth >= 768) {
            window.sakuraManager = new SakuraBackgroundManager();
        }
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
    }

    // Event Listeners
    function setupEventListeners() {
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }

        if (menuBtn) {
            menuBtn.addEventListener('click', openSidebar);
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        if (themeToggleBottom) {
            themeToggleBottom.addEventListener('click', toggleTheme);
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectGender(this.dataset.gender);
            });
        });

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

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && styleModal && styleModal.classList.contains('active')) {
                closeModal();
            }
        });
        
        document.addEventListener('click', function(e) {
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        // 윈도우 리사이즈 감지 (벚꽃 배경용)
        window.addEventListener('resize', () => {
            const isTabletMode = window.innerWidth >= 768;
            
            if (isTabletMode && !window.sakuraManager) {
                window.sakuraManager = new SakuraBackgroundManager();
            } else if (!isTabletMode && window.sakuraManager) {
                window.sakuraManager.removeExistingBackground();
                window.sakuraManager.removeBackgroundSelector();
                window.sakuraManager = null;
            }
        });
    }

    // Navigation
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
        }
    }

    // Sidebar
    function openSidebar() {
        sidebar.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
    }

    // Theme
    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            if (themeStatus) {
                themeStatus.textContent = 'OFF';
            }
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        if (themeStatus) {
            themeStatus.textContent = isLight ? 'OFF' : 'ON';
        }
        
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
    }

    // Auth
    function checkAuthStatus() {
        const designerInfo = document.getElementById('designerInfo');
        if (window.auth && window.auth.currentUser) {
            if (designerInfo) {
                designerInfo.style.display = 'block';
            }
            const designerName = document.getElementById('designerName');
            if (designerName) {
                designerName.textContent = window.auth.currentUser.displayName || window.auth.currentUser.email;
            }
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
                console.error('Logout error:', error);
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
    }

    // Load Menu Data
    function loadMenuData(gender) {
        showLoading(true);
        
        menuData = MENU_DATA[gender];
        
        renderCategories(gender);
        
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0], gender);
        }
        
        setTimeout(() => showLoading(false), 300);
    }

    // Render Categories - 여성일 때 물음표 버튼 추가
    function renderCategories(gender) {
        if (!categoryTabs) return;
        
        categoryTabs.innerHTML = '';
        
        // 여성인 경우 맨 앞에 물음표 버튼 추가
        if (gender === 'female') {
            const helpTab = document.createElement('button');
            helpTab.className = 'category-tab help-tab';
            helpTab.innerHTML = '?';
            helpTab.addEventListener('click', function() {
                window.open('https://drive.google.com/file/d/15OgT9k5jCC6TjcJSImuQXcznS_HtFBVf/view?usp=sharing', '_blank');
            });
            categoryTabs.appendChild(helpTab);
        }
        
        menuData.categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.textContent = category.name;
            tab.dataset.categoryId = category.id;
            
            if (index === 0) {
                tab.classList.add('active', gender);
            }
            
            tab.addEventListener('click', function() {
                selectCategory(category, gender);
            });
            
            categoryTabs.appendChild(tab);
        });
    }

    // Select Category
    function selectCategory(category, gender) {
        currentCategory = category;
        
        document.querySelectorAll('.category-tab').forEach(tab => {
            if (tab.classList.contains('help-tab')) return; // 물음표 버튼은 제외
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === category.id) {
                tab.classList.add('active', gender);
            }
        });
        
        if (categoryDescription) {
            categoryDescription.textContent = category.description;
        }
        
        renderSubcategories(gender);
        
        loadStyles(category.id, currentSubcategory, gender);
        
        // 벚꽃 배경이 활성화된 라이트 모드에서 탭 스타일 재적용
        if (window.sakuraManager && window.sakuraManager.currentBackground === 'sakura') {
            setTimeout(() => {
                window.sakuraManager.fixTabClickStyles();
            }, 100);
        }
    }

    // Render Subcategories
    function renderSubcategories(gender) {
        if (!subcategoryTabs) return;
        
        subcategoryTabs.innerHTML = '';
        
        const subcategories = menuData.subcategories;
        
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
        
        // 벚꽃 배경이 활성화된 라이트 모드에서 탭 스타일 재적용
        if (window.sakuraManager && window.sakuraManager.currentBackground === 'sakura') {
            setTimeout(() => {
                window.sakuraManager.fixTabClickStyles();
            }, 100);
        }
    }

    // Load Styles from Firebase
    async function loadStyles(categoryId, subcategory, gender) {
        if (!menuGrid) return;
        
        menuGrid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        try {
            // Firebase 초기화 확인
            if (typeof db === 'undefined') {
                console.error('Firebase not initialized');
                menuGrid.innerHTML = '<div style="color: #999; text-align: center; padding: 40px;">Firebase 연결 중...</div>';
                return;
            }
            
            // 현재 카테고리 이름 찾기
            const categoryName = currentCategory.name;
            console.log('Loading styles:', { gender, categoryName, subcategory });
            
            // Firebase에서 데이터 가져오기
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
                        <div>등록된 스타일이 없습니다</div>
                        <div style="font-size: 12px; margin-top: 10px;">
                            ${categoryName} - ${subcategory}
                        </div>
                    </div>
                `;
                return;
            }
            
            // 스타일 카드 생성
            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = `menu-item ${gender}`;
                
                // 이미지만 표시 (하단 텍스트 제거)
                item.innerHTML = `
                    <img src="${data.imageUrl || ''}" 
                         alt="${data.name || 'Style'}" 
                         class="menu-item-image"
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;"
                         onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'">
                `;
                
                item.addEventListener('click', function() {
                    showStyleDetail(data.code, data.name, gender, data.imageUrl, doc.id);
                });
                
                menuGrid.appendChild(item);
            });
            
        } catch (error) {
            console.error('Load styles error:', error);
            menuGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff4444;">
                    <div>데이터 로드 실패</div>
                    <div style="font-size: 12px; margin-top: 10px;">${error.message}</div>
                </div>
            `;
        }
    }

    // Close Modal
    function closeModal() {
        if (styleModal) {
            styleModal.classList.remove('active');
        }
    }

    // Show Style Detail Modal
    function showStyleDetail(code, name, gender, imageSrc, docId) {
        if (!styleModal) return;
        
        if (modalImage) {
            modalImage.src = imageSrc || '';
            modalImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            };
        }
        
        if (modalCode) modalCode.textContent = code;
        if (modalName) modalName.textContent = name;
        
        if (btnRegister) {
            if (gender === 'female') {
                btnRegister.classList.add('female');
            } else {
                btnRegister.classList.remove('female');
            }
        }
        
        if (btnLike) {
            btnLike.classList.remove('active');
            const heart = btnLike.querySelector('span:first-child');
            if (heart) heart.textContent = '♡';
        }
        
        styleModal.classList.add('active');
        
        // 고객 등록 버튼
        if (btnRegister) {
            btnRegister.onclick = async function() {
                const customerName = prompt('고객 이름을 입력하세요:');
                if (!customerName) return;
                
                const customerPhone = prompt('전화번호를 입력하세요 (예: 010-1234-5678):');
                if (!customerPhone) return;
                
                // 전화번호 형식 검증
                const phoneRegex = /^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/;
                if (!phoneRegex.test(customerPhone.replace(/-/g, ''))) {
                    alert('올바른 전화번호 형식을 입력하세요 (예: 010-1234-5678)');
                    return;
                }
                
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
                    
                    alert('고객 등록 완료!');
                    closeModal();
                } catch (error) {
                    console.error('Customer registration error:', error);
                    alert('등록 실패: ' + error.message);
                }
            };
        }
        
        // 좋아요 버튼
        if (btnLike) {
            btnLike.onclick = async function() {
                this.classList.toggle('active');
                const heart = this.querySelector('span:first-child');
                if (heart) {
                    const isLiked = this.classList.contains('active');
                    heart.textContent = isLiked ? '♥' : '♡';
                    
                    // Firebase에 좋아요 업데이트
                    if (docId) {
                        try {
                            const docRef = db.collection('hairstyles').doc(docId);
                            await docRef.update({
                                likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
                            });
                        } catch (error) {
                            console.error('Like update error:', error);
                        }
                    }
                }
            };
        }
    }

    // Loading
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', show);
        }
    }

    const savedGender = localStorage.getItem('hairgator_gender');
    if (savedGender && !genderSelection.style.display) {
        // Auto-select if previously selected
        // setTimeout(() => selectGender(savedGender), 100);
    }
});

window.addEventListener('load', function() {
    console.log('🌸 HAIRGATOR App with Sakura Background Loaded');
});
