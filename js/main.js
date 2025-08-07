// Main Application Logic
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
                    id: 'long', 
                    name: 'LONG',
                    description: '롱 헤어는 여성스러움과 우아함을 동시에 표현할 수 있는 대표적인 스타일입니다. 다양한 연출이 가능하며 개인의 취향에 따라 웨이브나 스트레이트 등으로 변화를 줄 수 있습니다.'
                },
                { 
                    id: 'semi-long', 
                    name: 'SEMI LONG',
                    description: '세미 롱은 관리하기 편하면서도 여성스러움을 유지할 수 있습니다.'
                },
                { 
                    id: 'medium', 
                    name: 'MEDIUM',
                    description: '미디엄 길이는 가장 실용적이고 다양한 스타일링이 가능합니다.'
                },
                { 
                    id: 'bob', 
                    name: 'BOB',
                    description: '보브 스타일은 단정하고 세련된 느낌을 줍니다.'
                },
                { 
                    id: 'short', 
                    name: 'SHORT',
                    description: '숏 헤어는 시원하고 개성 있는 스타일입니다.'
                }
            ],
            subcategories: ['A Length', 'B Length', 'C Length', 'D Length', 'E Length', 'F Length', 'G Length', 'H Length']
        }
    };

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadTheme();
        checkAuthStatus();
        
        // Initially hide back button
        if (backBtn) {
            backBtn.style.display = 'none';
        }
    }

    // Event Listeners
    function setupEventListeners() {
        // Back button
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }

        // Menu button
        if (menuBtn) {
            menuBtn.addEventListener('click', openSidebar);
        }

        // Sidebar close
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // Bottom theme toggle
        if (themeToggleBottom) {
            themeToggleBottom.addEventListener('click', toggleTheme);
        }

        // Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Gender buttons
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectGender(this.dataset.gender);
            });
        });

        // Modal event listeners
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

        // ESC key to close modal
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
    }

    // Navigation
    function handleBack() {
        if (menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            genderSelection.style.display = 'flex';
            backBtn.style.display = 'none';
            
            // Show theme toggle button again
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
            themeStatus.textContent = 'OFF';
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        // Update sidebar theme status if exists
        if (themeStatus) {
            themeStatus.textContent = isLight ? 'OFF' : 'ON';
        }
        
        // Save theme preference
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
    }

    // Auth
    function checkAuthStatus() {
        // Check if user is logged in
        const designerInfo = document.getElementById('designerInfo');
        if (window.auth && window.auth.currentUser) {
            designerInfo.style.display = 'block';
            document.getElementById('designerName').textContent = 
                window.auth.currentUser.displayName || window.auth.currentUser.email;
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
        
        // Update UI
        genderSelection.style.display = 'none';
        menuContainer.classList.add('active');
        
        // Show back button
        if (backBtn) {
            backBtn.style.display = 'flex';
        }
        
        // Hide theme toggle button when menu is shown
        if (themeToggleBottom) {
            themeToggleBottom.style.display = 'none';
        }
        
        // Load menu
        loadMenuData(gender);
        
        // Save selection
        localStorage.setItem('hairgator_gender', gender);
    }

    // Load Menu Data
    function loadMenuData(gender) {
        showLoading(true);
        
        menuData = MENU_DATA[gender];
        
        // Render categories
        renderCategories(gender);
        
        // Select first category
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0], gender);
        }
        
        setTimeout(() => showLoading(false), 300);
    }

    // Render Categories
    function renderCategories(gender) {
        categoryTabs.innerHTML = '';
        
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
        currentCategory = category.id;
        
        // Update tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === category.id) {
                tab.classList.add('active', gender);
            }
        });
        
        // Update description
        categoryDescription.textContent = category.description;
        
        // Render subcategories
        renderSubcategories(gender);
        
        // Load styles
        loadStyles(category.id, currentSubcategory, gender);
    }

    // Render Subcategories
    function renderSubcategories(gender) {
        subcategoryTabs.innerHTML = '';
        
        // For female, show A-H Length buttons
        // For male, show None, Fore Head, Eye Brow, etc
        const subcategories = menuData.subcategories;
        
        subcategories.forEach((sub, index) => {
            const tab = document.createElement('button');
            tab.className = 'subcategory-tab';
            tab.textContent = sub;
            tab.dataset.subcategory = sub;
            
            if (index === 0 || (gender === 'female' && sub === 'A Length')) {
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
        
        // Update tabs
        document.querySelectorAll('.subcategory-tab').forEach(tab => {
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.subcategory === subcategory) {
                tab.classList.add('active', gender);
            }
        });
        
        // Load styles
        loadStyles(currentCategory, subcategory, gender);
    }

    // Load Styles (Sample Data)
    function loadStyles(categoryId, subcategory, gender) {
        menuGrid.innerHTML = '';
        
        // Generate sample styles
        const styleCount = gender === 'male' ? 6 : 8;
        const styleNames = {
            male: ['사이드프린지캠퍼', '사이드파트노탈리안', '사이드파트노밀리안', '댄디컷', '리젠트펌', '애즈펌'],
            female: ['레이어드컷', '보브컷', '웨이브펌', '매직스트레이트', 'C컬펌', 'S컬펌', '히피펌', '글램펌']
        };
        
        for (let i = 0; i < styleCount; i++) {
            const item = document.createElement('div');
            item.className = `menu-item ${gender}`;
            
            const code = gender === 'male' 
                ? `M${categoryId.substring(0, 1).toUpperCase()}0${i + 1}`
                : `FAL${i + 1}00${i + 1}`;
            
            // 이미지만 표시
            item.innerHTML = `
                <img src="https://via.placeholder.com/300x400/1a1a1a/666?text=Style+${i+1}" 
                     alt="Style" class="menu-item-image">
            `;
            
            item.addEventListener('click', function() {
                showStyleDetail(code, styleNames[gender][i], gender, `https://via.placeholder.com/300x400/1a1a1a/666?text=Style+${i+1}`);
            });
            
            menuGrid.appendChild(item);
        }
    }

    // Close Modal
    function closeModal() {
        if (styleModal) {
            styleModal.classList.remove('active');
        }
    }

    // Show Style Detail Modal - 개선된 버전
    function showStyleDetail(code, name, gender, imageSrc) {
        if (!styleModal) return;
        
        // Set modal content
        modalImage.src = imageSrc;
        modalCode.textContent = code;
        modalName.textContent = name;
        
        // Set button color based on gender
        if (gender === 'female') {
            btnRegister.classList.add('female');
        } else {
            btnRegister.classList.remove('female');
        }
        
        // Reset like button
        btnLike.classList.remove('active');
        const heart = btnLike.querySelector('span:first-child');
        if (heart) heart.textContent = '♡';
        
        // Show modal
        styleModal.classList.add('active');
        
        // Handle register button
        btnRegister.onclick = function() {
            alert(`고객 등록: ${code} - ${name}`);
            closeModal();
        };
        
        // Handle like button
        btnLike.onclick = function() {
            this.classList.toggle('active');
            const heart = this.querySelector('span:first-child');
            if (heart) {
                heart.textContent = this.classList.contains('active') ? '♥' : '♡';
            }
        };
    }

    // Loading
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', show);
        }
    }

    // Check saved gender
    const savedGender = localStorage.getItem('hairgator_gender');
    if (savedGender && !genderSelection.style.display) {
        // Auto-select if previously selected
        // Uncomment to enable auto-selection
        // setTimeout(() => selectGender(savedGender), 100);
    }
});

// Initialize
window.addEventListener('load', function() {
    console.log('HAIRGATOR App Loaded');
});
