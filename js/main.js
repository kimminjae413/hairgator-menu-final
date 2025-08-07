// Main Application Logic
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentGender = null;
    let currentCategory = null;
    let currentSubcategory = 'None';
    let menuData = {};

    // Elements
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const themeToggle = document.getElementById('themeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const categoryTabs = document.getElementById('categoryTabs');
    const subcategoryTabs = document.getElementById('subcategoryTabs');
    const menuGrid = document.getElementById('menuGrid');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Initialize theme
    initializeTheme();

    // Event Listeners
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Gender selection buttons
    const genderButtons = document.querySelectorAll('.gender-btn');
    genderButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const gender = this.dataset.gender;
            selectGender(gender);
        });
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                closeSidebar();
            }
        }
    });

    // Prevent sidebar close when clicking inside
    if (sidebar) {
        sidebar.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Toggle Sidebar
    function toggleSidebar() {
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        sidebar.classList.add('active');
        menuToggle.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
    }

    // Theme Management
    function initializeTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
    }

    // Handle Logout
    async function handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                if (window.authManager) {
                    await window.authManager.signOut();
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    }

    // Gender Selection
    function selectGender(gender) {
        currentGender = gender;
        
        // Hide gender selection
        genderSelection.style.display = 'none';
        
        // Show menu container
        menuContainer.classList.add('active');
        
        // Load menu data
        loadMenuData(gender);
        
        // Save selection
        localStorage.setItem('hairgator_gender', gender);
    }

    // Load Menu Data
    function loadMenuData(gender) {
        showLoading(true);
        
        // Sample menu data structure
        const sampleData = {
            male: {
                categories: [
                    { id: 'side-fringe', name: 'SIDE FRINGE', description: '사이드프린지 스타일' },
                    { id: 'side-part', name: 'SIDE PART', description: '사이드파트 스타일' },
                    { id: 'dandy', name: 'DANDY', description: '댄디 스타일' },
                    { id: 'pomade', name: 'POMADE', description: '포마드 스타일' },
                    { id: 'regent', name: 'REGENT', description: '리젠트 스타일' },
                    { id: 'natural', name: 'NATURAL', description: '내추럴 스타일' },
                    { id: 'special', name: 'SPECIAL', description: '스페셜 스타일' }
                ],
                subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'],
                styles: generateSampleStyles('male', 7)
            },
            female: {
                categories: [
                    { id: 'a-length', name: 'A Length', description: '턱선 길이' },
                    { id: 'b-length', name: 'B Length', description: '어깨 위 길이' },
                    { id: 'c-length', name: 'C Length', description: '어깨선 길이' },
                    { id: 'd-length', name: 'D Length', description: '어깨 아래 길이' },
                    { id: 'e-length', name: 'E Length', description: '가슴선 길이' },
                    { id: 'f-length', name: 'F Length', description: '가슴 아래 길이' },
                    { id: 'g-length', name: 'G Length', description: '허리선 길이' },
                    { id: 'h-length', name: 'H Length', description: '허리 아래 길이' }
                ],
                subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'],
                styles: generateSampleStyles('female', 8)
            }
        };

        menuData = sampleData[gender];
        
        // Render categories
        renderCategories(gender);
        
        // Select first category
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0].id, gender);
        }
        
        showLoading(false);
    }

    // Generate sample styles
    function generateSampleStyles(gender, categoryCount) {
        const styles = {};
        const styleNames = {
            male: ['슬릭 펌', '시스루 펌', '볼륨 매직', '댄디 컷', '애즈 펌', '쉐도우 펌', '다운 펌'],
            female: ['레이어드 컷', '보브 컷', '웨이브 펌', '매직 스트레이트', 'C컬 펌', 'S컬 펌', '디지털 펌']
        };
        
        for (let i = 0; i < categoryCount; i++) {
            const categoryId = gender === 'male' 
                ? ['side-fringe', 'side-part', 'dandy', 'pomade', 'regent', 'natural', 'special'][i]
                : ['a-length', 'b-length', 'c-length', 'd-length', 'e-length', 'f-length', 'g-length', 'h-length'][i];
            
            styles[categoryId] = {};
            
            ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'].forEach(sub => {
                styles[categoryId][sub] = [];
                for (let j = 0; j < 5; j++) {
                    styles[categoryId][sub].push({
                        id: `${categoryId}-${sub}-${j}`,
                        name: styleNames[gender][j % styleNames[gender].length],
                        price: `₩${(50000 + j * 10000).toLocaleString()}`,
                        image: `https://via.placeholder.com/300x300/333/fff?text=${styleNames[gender][j % styleNames[gender].length]}`
                    });
                }
            });
        }
        
        return styles;
    }

    // Render Categories
    function renderCategories(gender) {
        categoryTabs.innerHTML = '';
        
        menuData.categories.forEach(category => {
            const tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.textContent = category.name;
            tab.dataset.categoryId = category.id;
            
            tab.addEventListener('click', function() {
                selectCategory(category.id, gender);
            });
            
            categoryTabs.appendChild(tab);
        });
    }

    // Select Category
    function selectCategory(categoryId, gender) {
        currentCategory = categoryId;
        
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === categoryId) {
                tab.classList.add('active', gender);
            }
        });
        
        // Render subcategories
        renderSubcategories(gender);
        
        // Load styles for selected category and subcategory
        loadStyles(categoryId, currentSubcategory, gender);
    }

    // Render Subcategories
    function renderSubcategories(gender) {
        subcategoryTabs.innerHTML = '';
        
        menuData.subcategories.forEach(sub => {
            const tab = document.createElement('button');
            tab.className = 'subcategory-tab';
            tab.textContent = sub;
            tab.dataset.subcategory = sub;
            
            if (sub === currentSubcategory) {
                tab.classList.add('active', gender);
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
        
        // Update active tab
        document.querySelectorAll('.subcategory-tab').forEach(tab => {
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.subcategory === subcategory) {
                tab.classList.add('active', gender);
            }
        });
        
        // Load styles for selected category and subcategory
        loadStyles(currentCategory, subcategory, gender);
    }

    // Load Styles
    function loadStyles(categoryId, subcategory, gender) {
        menuGrid.innerHTML = '';
        
        const styles = menuData.styles[categoryId]?.[subcategory] || [];
        
        if (styles.length === 0) {
            menuGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">스타일이 없습니다.</div>';
            return;
        }
        
        styles.forEach(style => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = `
                <img src="${style.image}" alt="${style.name}" class="menu-item-image" onerror="this.src='https://via.placeholder.com/300x300/333/fff?text=No+Image'">
                <div class="menu-item-info">
                    <div class="menu-item-name">${style.name}</div>
                    <div class="menu-item-price">${style.price}</div>
                </div>
            `;
            
            item.addEventListener('click', function() {
                showStyleDetail(style);
            });
            
            menuGrid.appendChild(item);
        });
    }

    // Show Style Detail
    function showStyleDetail(style) {
        alert(`${style.name}\n가격: ${style.price}\n\n상세 정보 페이지는 준비 중입니다.`);
    }

    // Show/Hide Loading
    function showLoading(show) {
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', show);
        }
    }

    // Check for saved gender selection
    const savedGender = localStorage.getItem('hairgator_gender');
    if (savedGender && (savedGender === 'male' || savedGender === 'female')) {
        // Auto-select saved gender after a short delay
        setTimeout(() => {
            selectGender(savedGender);
        }, 100);
    }

    // Handle back button
    window.addEventListener('popstate', function(e) {
        if (menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            genderSelection.style.display = 'block';
            currentGender = null;
            currentCategory = null;
            currentSubcategory = 'None';
        }
    });
});

// Initialize on load
window.addEventListener('load', function() {
    console.log('HAIRGATOR App Loaded Successfully');
});
