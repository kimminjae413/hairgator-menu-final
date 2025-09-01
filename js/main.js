// HAIRGATOR Main Application Logic - Final Version
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

    // 🦎 HAIRGATOR 3-Tier 권한 시스템 메뉴 데이터 구조
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
        loadTheme();
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
            themeToggle.addEventListener('click', toggleTheme);
        }

        if (themeToggleBottom) {
            themeToggleBottom.addEventListener('click', toggleTheme);
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

        console.log('✅ 이벤트 리스너 설정 완료');
    }

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
        sidebar.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
    }

    // Theme Functions
    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            if (themeStatus) themeStatus.textContent = 'OFF';
        }
        console.log(`🎨 테마 로드: ${savedTheme}`);
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        if (themeStatus) {
            themeStatus.textContent = isLight ? 'OFF' : 'ON';
        }
        
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
        console.log(`🎨 테마 변경: ${isLight ? 'light' : 'dark'}`);
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
            
            // Firebase에 좋아요 업데이트
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
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // Auto Gender Selection (선택적)
    const savedGender = localStorage.getItem('hairgator_gender');
    if (savedGender && savedGender !== 'null' && !currentGender) {
        console.log(`🔄 이전 성별 선택 복원: ${savedGender}`);
        // 필요시 주석 해제: setTimeout(() => selectGender(savedGender), 100);
    }

    // Performance Monitoring
    console.log('🚀 HAIRGATOR 애플리케이션 준비 완료');
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
    `;
    document.head.appendChild(style);
});

// ========== 🎨 테마 시스템 확장 (main.js 맨 아래 추가) ==========
// 기존 toggleTheme 함수는 그대로 두고, 확장 기능만 추가

(function extendThemeSystem() {
    'use strict';
    
    // 🎨 테마 설정 (새 테마 추가하기 쉽게!)
    const THEME_CONFIG = {
        dark: { 
            name: '다크 모드', 
            icon: '🌙',
            className: '' // 기본값
        },
        light: { 
            name: '라이트 모드', 
            icon: '☀️',
            className: 'light-theme' 
        }
        // 나중에 쉽게 추가:
        // blue: { name: '블루 모드', icon: '🌊', className: 'blue-theme' },
        // green: { name: '그린 모드', icon: '🌱', className: 'green-theme' }
    };
    
    // 🔄 확장된 테마 토글 함수 (기존 함수 대체)
    window.toggleThemeExtended = function() {
        const themeKeys = Object.keys(THEME_CONFIG);
        const currentTheme = getCurrentTheme();
        const currentIndex = themeKeys.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themeKeys.length;
        const nextTheme = themeKeys[nextIndex];
        
        applyTheme(nextTheme);
        updateThemeUI(nextTheme);
        
        console.log(`🎨 테마 변경: ${THEME_CONFIG[nextTheme].name}`);
        showToast(`${THEME_CONFIG[nextTheme].name}로 변경되었습니다`);
    };
    
    // 🎯 특정 테마로 직접 변경
    window.setTheme = function(themeName) {
        if (THEME_CONFIG[themeName]) {
            applyTheme(themeName);
            updateThemeUI(themeName);
            
            // 사이드바 닫기
            if (typeof closeSidebar === 'function') {
                closeSidebar();
            }
            
            console.log(`🎨 테마 설정: ${THEME_CONFIG[themeName].name}`);
            showToast(`${THEME_CONFIG[themeName].name}로 변경되었습니다`);
        }
    };
    
    // 🎨 테마 적용 함수
    function applyTheme(themeName) {
        const theme = THEME_CONFIG[themeName];
        if (!theme) return;
        
        // 모든 테마 클래스 제거
        Object.values(THEME_CONFIG).forEach(t => {
            if (t.className) document.body.classList.remove(t.className);
        });
        
        // 새 테마 적용
        if (theme.className) {
            document.body.classList.add(theme.className);
        }
        
        // 상태 저장
        localStorage.setItem('hairgator_theme', themeName);
    }
    
    // 📱 UI 업데이트
    function updateThemeUI(themeName) {
        const theme = THEME_CONFIG[themeName];
        
        // 테마 아이콘 업데이트 (기존 로직 유지)
        const themeStatus = document.getElementById('themeStatus');
        if (themeStatus) {
            themeStatus.textContent = themeName === 'dark' ? 'ON' : 'OFF';
        }
        
        // 새로운: 아이콘 업데이트
        const themeIcons = document.querySelectorAll('.theme-icon');
        themeIcons.forEach(icon => {
            if (icon) icon.textContent = theme.icon;
        });
        
        // 사이드바 테마 옵션 업데이트
        updateSidebarThemeOptions(themeName);
    }
    
    // 🎛️ 사이드바 테마 옵션 업데이트
    function updateSidebarThemeOptions(currentTheme) {
        const themeOptions = document.querySelector('.theme-options');
        if (!themeOptions) return;
        
        // 동적으로 테마 옵션 생성
        themeOptions.innerHTML = '';
        
        Object.entries(THEME_CONFIG).forEach(([key, theme]) => {
            const option = document.createElement('button');
            option.className = `theme-option ${key === currentTheme ? 'active' : ''}`;
            option.dataset.theme = key;
            
            option.innerHTML = `
                <span class="theme-preview ${theme.className || 'dark'}"></span>
                <span>${theme.name}</span>
            `;
            
            option.addEventListener('click', () => setTheme(key));
            themeOptions.appendChild(option);
        });
    }
    
    // 🔍 현재 테마 감지
    function getCurrentTheme() {
        const hasLightClass = document.body.classList.contains('light-theme');
        return hasLightClass ? 'light' : 'dark';
    }
    
    // 📢 토스트 메시지 (기존 showToast 함수 활용)
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            console.log('📢 ' + message);
        }
    }
    
    // 🚀 초기화 (기존 테마 상태 복원)
    function initExtendedTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        updateThemeUI(savedTheme);
        
        console.log('✅ 확장 테마 시스템 초기화:', THEME_CONFIG[savedTheme]?.name);
    }
    
    // 🔄 기존 toggleTheme 함수를 확장된 버전으로 교체 (선택적)
    // window.toggleTheme = window.toggleThemeExtended;
    
    // 페이지 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtendedTheme);
    } else {
        initExtendedTheme();
    }
    
    console.log('🎨 테마 확장 시스템 로드 완료');
    console.log('사용법: setTheme("light"), toggleThemeExtended()');
    
})();

// ========== 🌟 새 테마 추가 가이드 ==========
/*
새 테마 추가하는 방법:

1. THEME_CONFIG에 테마 추가:
   blue: { name: '블루 모드', icon: '🌊', className: 'blue-theme' }

2. main.css에 CSS 추가:
   body.blue-theme {
       background: #0d1421;
       color: #e3f2fd;
   }
   // ... 나머지 스타일들

3. 끝! 자동으로 사이드바에 추가되고 토글 가능해짐
*/
