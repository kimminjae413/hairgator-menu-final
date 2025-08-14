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
                    id: 'a-length', 
                    name: 'A Length',
                    description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'
                },
                { 
                    id: 'b-length', 
                    name: 'B Length',
                    description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디언-롱으로, 레이어드 미디언롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'
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
                    description: 'H 길이는 귀선~베리숏구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'
                }
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        }
    };

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadTheme();
        checkAuthStatus();
        
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
            themeStatus.textContent = 'OFF';
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
        
        // ✅ 첫 번째 카테고리 자동 선택 및 스타일 로딩
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0], gender);
        }
        
        setTimeout(() => showLoading(false), 300);
    }

    // Render Categories - 여성일 때 물음표 버튼 추가
    function renderCategories(gender) {
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
        
        categoryDescription.textContent = category.description;
        renderSubcategories(gender);
        
        // ✅ 스타일 로딩 함수 호출
        loadStyles(category.name, currentSubcategory, gender);
    }

    // Render Subcategories
    function renderSubcategories(gender) {
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
        
        // ✅ 서브카테고리 변경시에도 스타일 새로 로딩
        if (currentCategory) {
            loadStyles(currentCategory.name, subcategory, gender);
        }
    }

    // ✅ 핵심: Firebase에서 스타일 로딩하는 함수 추가
    async function loadStyles(mainCategory, subCategory, gender) {
        if (!db) {
            console.error('❌ Firebase가 초기화되지 않음');
            return;
        }

        console.log('📊 스타일 로딩:', { mainCategory, subCategory, gender });
        
        try {
            showLoading(true);
            
            // Firebase에서 조건에 맞는 스타일 조회
            const query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', mainCategory)
                .where('subCategory', '==', subCategory);
            
            const snapshot = await query.get();
            
            console.log(`🎯 ${mainCategory} > ${subCategory} 스타일 수:`, snapshot.size);
            
            const styles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                styles.push({
                    id: doc.id,
                    code: data.code || doc.id,
                    name: data.name,
                    imageUrl: data.imageUrl,
                    ...data
                });
            });
            
            // 그리드에 스타일 표시
            displayStyles(styles, gender);
            
        } catch (error) {
            console.error('❌ 스타일 로딩 오류:', error);
            
            // 오류시 빈 상태 표시
            menuGrid.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📭</div>
                    <div style="font-size: 18px; margin-bottom: 10px;">스타일을 불러올 수 없습니다</div>
                    <div style="font-size: 14px;">Firebase 연결을 확인해주세요</div>
                </div>
            `;
        } finally {
            showLoading(false);
        }
    }

    // ✅ 🔧 수정된 스타일 표시 함수 - 실제로 작동하는 버전 + NEW 뱃지
    function displayStyles(styles, gender) {
        console.log('🎨 displayStyles 함수 실행:', styles.length + '개');
        
        if (!menuGrid) {
            console.error('❌ menuGrid 요소가 없음');
            return;
        }

        // 🆕 NEW 뱃지 애니메이션 CSS 추가
        addNewBadgeCSS();

        if (styles.length === 0) {
            menuGrid.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                ">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📋</div>
                    <div style="font-size: 18px; margin-bottom: 10px;">등록된 스타일이 없습니다</div>
                    <div style="font-size: 14px;">관리자에서 스타일을 추가해주세요</div>
                </div>
            `;
            return;
        }

        // 그리드 스타일 설정
        menuGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 15px;
            padding: 20px;
            overflow-y: auto;
        `;

        // 기존 내용 삭제
        menuGrid.innerHTML = '';

        // 각 스타일 카드 생성
        styles.forEach(style => {
            const card = document.createElement('div');
            card.className = 'menu-item visible';
            card.style.cssText = `
                cursor: pointer;
                border-radius: 12px;
                overflow: hidden;
                background: #1a1a1a;
                border: 1px solid #333;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
            `;
            
            // 🆕 NEW 뱃지 판단 로직
            const isNewStyle = checkIfNewStyle(style);
            
            // 호버 효과
            card.onmouseenter = () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 8px 25px rgba(255, 20, 147, 0.15)';
                card.style.borderColor = '#FF1493';
            };
            card.onmouseleave = () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
                card.style.borderColor = '#333';
            };
            
            // 이미지만 표시 (텍스트 없음)
            if (style.imageUrl) {
                card.innerHTML = `
                    <img src="${style.imageUrl}" 
                         style="width: 100%; height: 250px; object-fit: cover; display: block;"
                         alt="${style.name}"
                         onload="console.log('✅ 이미지 로딩:', '${style.name}');"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; width: 100%; height: 250px; background: linear-gradient(135deg, ${gender === 'male' ? '#4A90E2, #667eea' : '#E91E63, #FF69B4'}); align-items: center; justify-content: center; color: white; font-weight: bold; text-align: center;">
                        ${style.name}<br><small style="opacity: 0.7;">이미지 로딩 실패</small>
                    </div>
                    ${isNewStyle ? `
                        <!-- NEW 뱃지 -->
                        <div style="
                            position: absolute;
                            top: 8px;
                            right: 8px;
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            color: white;
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 10px;
                            font-weight: bold;
                            text-transform: uppercase;
                            box-shadow: 0 2px 8px rgba(255, 20, 147, 0.4);
                            z-index: 10;
                            animation: newBadgePulse 2s infinite;
                        ">NEW</div>
                        <!-- 빨간 점 -->
                        <div style="
                            position: absolute;
                            top: 5px;
                            left: 8px;
                            width: 8px;
                            height: 8px;
                            background: #FF0000;
                            border-radius: 50%;
                            box-shadow: 0 0 10px rgba(255, 0, 0, 0.6);
                            z-index: 10;
                            animation: redDotBlink 1.5s infinite;
                        "></div>
                    ` : ''}
                `;
            } else {
                card.innerHTML = `
                    <div style="width: 100%; height: 250px; background: linear-gradient(135deg, ${gender === 'male' ? '#4A90E2, #667eea' : '#E91E63, #FF69B4'}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; text-align: center; position: relative;">
                        ${style.name}<br><small style="opacity: 0.7;">이미지 없음</small>
                        ${isNewStyle ? `
                            <!-- NEW 뱃지 (이미지 없는 경우) -->
                            <div style="
                                position: absolute;
                                top: 8px;
                                right: 8px;
                                background: rgba(255, 255, 255, 0.9);
                                color: #FF1493;
                                padding: 4px 8px;
                                border-radius: 12px;
                                font-size: 10px;
                                font-weight: bold;
                                text-transform: uppercase;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                            ">NEW</div>
                            <!-- 빨간 점 (이미지 없는 경우) -->
                            <div style="
                                position: absolute;
                                top: 5px;
                                left: 8px;
                                width: 8px;
                                height: 8px;
                                background: #FF0000;
                                border-radius: 50%;
                                box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
                            "></div>
                        ` : ''}
                    </div>
                `;
            }
            
            // 클릭 이벤트
            card.onclick = () => {
                console.log('🖱️ 스타일 클릭:', style.name);
                showStyleDetail(style.code, style.name, gender, style.imageUrl, style.id);
            };
            
            menuGrid.appendChild(card);
        });
        
        console.log(`✅ ${styles.length}개 스타일 카드 생성 완료!`);
    }

    // 🆕 NEW 스타일 판단 함수
    function checkIfNewStyle(style) {
        if (!style.createdAt) {
            // createdAt이 없으면 최근 추가된 것으로 간주 (기본값)
            return true;
        }
        
        // Firebase Timestamp를 Date로 변환
        let createdDate;
        if (style.createdAt && style.createdAt.toDate) {
            createdDate = style.createdAt.toDate();
        } else if (style.createdAt && style.createdAt.seconds) {
            createdDate = new Date(style.createdAt.seconds * 1000);
        } else {
            // 다른 형태의 날짜면 최근으로 간주
            return true;
        }
        
        // 현재 시간과 비교하여 7일 이내면 NEW
        const now = new Date();
        const diffTime = now - createdDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        return diffDays <= 7; // 7일 이내면 NEW
    }

    // 🆕 NEW 뱃지 애니메이션 CSS 추가
    function addNewBadgeCSS() {
        // 이미 추가되었으면 건너뛰기
        if (document.getElementById('new-badge-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'new-badge-styles';
        style.textContent = `
            @keyframes newBadgePulse {
                0%, 100% { 
                    transform: scale(1); 
                    opacity: 1; 
                }
                50% { 
                    transform: scale(1.1); 
                    opacity: 0.8; 
                }
            }
            
            @keyframes redDotBlink {
                0%, 100% { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.3; 
                    transform: scale(1.2); 
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Modal Functions
    function showStyleDetail(code, name, gender, imageSrc, docId) {
        console.log('🎨 스타일 모달 열기:', { code, name, gender, imageSrc, docId });
        
        if (!styleModal || !modalImage || !modalCode || !modalName) {
            console.error('❌ 모달 요소들이 없음');
            return;
        }

        modalImage.src = imageSrc;
        modalCode.textContent = code;
        modalName.textContent = name;
        
        styleModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log('✅ 모달 열기 완료');
        
        // 버튼 이벤트 설정
        setupModalButtons(docId, code, name);
    }

    function closeModal() {
        if (styleModal) {
            styleModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function setupModalButtons(docId, styleCode, styleName) {
        // 고객등록 버튼
        if (btnRegister) {
            btnRegister.onclick = async function() {
                const customerName = prompt('고객 성함을 입력해주세요:');
                if (!customerName) return;
                
                const customerPhone = prompt('연락처를 입력해주세요:');
                if (!customerPhone) return;
                
                try {
                    await db.collection('customers').add({
                        name: customerName,
                        phone: customerPhone,
                        styleCode: styleCode,
                        styleName: styleName,
                        registeredAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    alert('고객 등록이 완료되었습니다!');
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

    // 전역 함수로 내보내기 (다른 스크립트에서 사용할 수 있도록)
    window.showStyleDetail = showStyleDetail;
    window.selectGender = selectGender;
    window.currentGender = currentGender;

    // Auto-select saved gender (optional)
    const savedGender = localStorage.getItem('hairgator_gender');
    if (savedGender && genderSelection && genderSelection.style.display !== 'none') {
        // setTimeout(() => selectGender(savedGender), 100);
    }
});

window.addEventListener('load', function() {
    console.log('✅ HAIRGATOR App Loaded');
});
