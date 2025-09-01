// HAIRGATOR Main Application Logic - 테마 시스템 제거 버전
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
    const logoutBtn = document.getElementById('logoutBtn');
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const categoryTabs = document.getElementById('categoryTabs');
    const categoryDescription = document.getElementById('categoryDescription');
    const subcategoryTabs = document.getElementById('subcategoryTabs');
    const menuGrid = document.getElementById('menuGrid');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    
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
                    description: '사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다.'
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
                    description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 우아하고 드라마틱한 분위기를 냅니다.'
                },
                { 
                    id: 'b-length', 
                    name: 'B Length',
                    description: 'B 길이는 가슴 아래와 쇄골 아래 사이의 미디엄-롱으로, 부드럽고 실용적인 인상을 줍니다.'
                },
                { 
                    id: 'c-length', 
                    name: 'C Length',
                    description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 단정하고 세련된 오피스 무드를 냅니다.'
                },
                { 
                    id: 'd-length', 
                    name: 'D Length',
                    description: 'D 길이는 어깨에 정확히 닿는 길이로, 트렌디하고 깔끔한 느낌을 줍니다.'
                },
                { 
                    id: 'e-length', 
                    name: 'E Length',
                    description: 'E 길이는 어깨 바로 위의 단발로, 경쾌하고 모던한 인상을 만듭니다.'
                },
                { 
                    id: 'f-length', 
                    name: 'F Length',
                    description: 'F 길이는 턱선 바로 밑 보브 길이로, 시크하고 도회적인 분위기를 연출합니다.'
                },
                { 
                    id: 'g-length', 
                    name: 'G Length',
                    description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 또렷하고 미니멀한 무드를 줍니다.'
                },
                { 
                    id: 'h-length', 
                    name: 'H Length',
                    description: 'H 길이는 귀선~베리숏 구간의 숏헤어로, 활동적이고 개성 있는 스타일을 완성합니다.'
                }
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        }
    };

    // Initialize Application
    init();

    function init() {
        console.log('🦎 HAIRGATOR 초기화 시작...');
        
        // Firebase 연결 확인
        if (typeof firebase === 'undefined' || typeof db === 'undefined') {
            console.warn('Firebase 로딩 대기 중...');
            setTimeout(init, 100);
            return;
        }
        
        setupEventListeners();
        setupLoginForm();
        checkAuthStatus();
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        // 로딩 화면 숨기고 로그인 화면 표시
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            if (loginScreen) {
                loginScreen.classList.add('active');
                loginScreen.style.display = 'flex';
            }
        }, 500);
        
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

    // Login Form Setup
    function setupLoginForm() {
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const designerName = document.getElementById('designerName')?.value?.trim();
            const phoneNumber = document.getElementById('phoneNumber')?.value?.trim();
            const password = document.getElementById('password')?.value?.trim();
            
            if (!designerName || !phoneNumber || !password) {
                showToast('모든 정보를 입력해주세요');
                return;
            }
            
            if (password.length !== 4) {
                showToast('비밀번호는 4자리 숫자입니다');
                return;
            }
            
            console.log('로그인 시도:', { designerName, phoneNumber });
            
            try {
                showLoading(true);
                
                // Firebase 인증 로직 (간단 버전)
                const userQuery = await db.collection('designers')
                    .where('name', '==', designerName)
                    .where('phone', '==', phoneNumber)
                    .where('password', '==', password)
                    .limit(1)
                    .get();
                
                if (userQuery.empty) {
                    throw new Error('로그인 정보가 올바르지 않습니다');
                }
                
                const userDoc = userQuery.docs[0];
                const userData = userDoc.data();
                
                // 로그인 성공
                localStorage.setItem('hairgator_user', JSON.stringify({
                    id: userDoc.id,
                    name: userData.name,
                    phone: userData.phone
                }));
                
                showToast(`환영합니다, ${userData.name}님!`);
                
                // 화면 전환
                if (loginScreen) loginScreen.classList.remove('active');
                if (genderSelection) genderSelection.style.display = 'flex';
                if (backBtn) backBtn.style.display = 'flex';
                
                updateUserInfo(userData);
                
            } catch (error) {
                console.error('로그인 오류:', error);
                showToast(error.message);
            } finally {
                showLoading(false);
            }
        });
    }

    // Update User Info in Sidebar
    function updateUserInfo(userData) {
        const designerInfo = document.getElementById('designerInfo');
        const designerName = document.getElementById('designerName');
        
        if (designerInfo && userData) {
            designerInfo.style.display = 'block';
            if (designerName) {
                designerName.textContent = userData.name || 'Unknown';
            }
        }
    }

    // Navigation Functions
    function handleBack() {
        if (menuContainer && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            if (genderSelection) genderSelection.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'none';
            
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
        const userData = localStorage.getItem('hairgator_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                updateUserInfo(user);
                
                // 저장된 사용자가 있으면 로그인 건너뛰고 성별 선택으로
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) loadingScreen.style.display = 'none';
                    
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (genderSelection) genderSelection.style.display = 'flex';
                    if (backBtn) backBtn.style.display = 'flex';
                }, 500);
                
                console.log('✅ 저장된 사용자 정보 복원:', user.name);
            } catch (error) {
                console.error('사용자 정보 복원 실패:', error);
                localStorage.removeItem('hairgator_user');
            }
        }
    }

    async function handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('hairgator_user');
            
            // UI 초기화
            if (loginScreen) loginScreen.classList.add('active');
            if (genderSelection) genderSelection.style.display = 'none';
            if (menuContainer) menuContainer.classList.remove('active');
            if (backBtn) backBtn.style.display = 'none';
            
            const designerInfo = document.getElementById('designerInfo');
            if (designerInfo) designerInfo.style.display = 'none';
            
            showToast('로그아웃되었습니다');
            console.log('✅ 로그아웃 완료');
        }
    }

    // Gender Selection
    function selectGender(gender) {
        currentGender = gender;
        
        if (genderSelection) genderSelection.style.display = 'none';
        if (menuContainer) menuContainer.classList.add('active');
        
        if (backBtn) backBtn.style.display = 'flex';
        
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
                designer: JSON.parse(localStorage.getItem('hairgator_user') || '{}').name || 'Unknown',
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

    console.log('🚀 HAIRGATOR 메인 애플리케이션 준비 완료');
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
