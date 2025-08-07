// ========== HAIRGATOR 최종 완성 버전 ========== 
// 🚀 모든 최적화와 버그 수정이 통합된 완전한 최종 버전
console.log('🚀 HAIRGATOR 최종 완성 버전 시작 - 모든 기능 통합');

// ========== 전역 변수 ========== 
let db = null;
let storage = null;
let firebaseConnected = false;
let hierarchyStructure = {};

let currentDesigner = null;
let currentDesignerName = null;
let currentGender = null;
let currentCategory = null;
let currentCustomer = null;
let selectedStyleCode = null;
let selectedStyleName = null;
let autoLoginEnabled = false;
let currentTheme = 'dark';

// 네비게이션 데이터는 Firebase에서 동적으로 로드
let navigationData = {};

// ========== 누락된 함수들 정의 (오류 방지) ==========
window.loadNavigationOnDate = function() {
    console.log('📅 loadNavigationOnDate 호출됨 (비활성화됨)');
};

window.navigationOnData = null;

window.showPromotionManagement = function() {
    console.log('🎯 프로모션 관리 기능은 현재 비활성화되었습니다');
    alert('프로모션 관리 기능은 현재 준비 중입니다');
};

// ========== Firebase 초기화 및 연결 강화 ==========
async function initializeFirebase() {
    try {
        console.log('🔥 Firebase 초기화 시작...');
        updateSyncStatus('connecting', '🔄 Firebase 연결 중...');
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase 앱 초기화 완료');
        } else {
            console.log('✅ Firebase 앱 이미 초기화됨');
        }

        db = firebase.firestore();
        storage = firebase.storage();

        // 오프라인 지원 활성화
        try {
            await db.enablePersistence({ synchronizeTabs: true });
            console.log('✅ Firebase 오프라인 지원 활성화');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.log('⚠️ 다중 탭에서 실행 중');
            } else if (err.code === 'unimplemented') {
                console.log('⚠️ 브라우저가 오프라인 지원하지 않음');
            }
        }

        // 연결 테스트
        await testFirebaseConnection();
        
        firebaseConnected = true;
        window.firebaseConnected = true;
        updateSyncStatus('connected', '✅ Firebase 연결 완료');
        
        console.log('✅ Firebase 초기화 완료');
        
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        firebaseConnected = false;
        updateSyncStatus('disconnected', '❌ Firebase 연결 실패');
        throw error;
    }
}

async function testFirebaseConnection() {
    try {
        const testDoc = db.collection('test').doc('connection');
        await testDoc.set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: true
        });
        
        await testDoc.delete();
        console.log('✅ Firebase 연결 테스트 성공');
        
    } catch (error) {
        console.error('❌ Firebase 연결 테스트 실패:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Firebase Security Rules에서 권한이 거부되었습니다');
        } else if (error.code === 'unavailable') {
            throw new Error('Firebase 서비스를 일시적으로 사용할 수 없습니다');
        }
        
        throw error;
    }
}

// ========== 계층구조 로드 (핵심 수정) ==========
async function loadHierarchyFromFirebase(gender) {
    console.log(`🔄 ${gender} 계층구조 로드 시작...`);
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        return;
    }

    try {
        const query = db.collection('category_hierarchy')
                       .where('gender', '==', gender);
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            console.log(`❌ ${gender} 데이터가 비어있습니다 - 어드민 초기화 필요`);
            showAdminRequiredMessage();
            return;
        }
        
        const hierarchyData = {};
        let docCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`📄 문서 ${docCount + 1}:`, data);
            
            const mainCat = data.mainCategory;
            const subCat = data.subCategory;
            
            if (!hierarchyData[mainCat]) {
                hierarchyData[mainCat] = [];
            }
            
            if (!hierarchyData[mainCat].includes(subCat)) {
                hierarchyData[mainCat].push(subCat);
            }
            
            docCount++;
        });
        
        console.log(`✅ ${gender} 계층구조 로드 완료:`, hierarchyData);
        console.log(`📊 총 ${docCount}개 문서, ${Object.keys(hierarchyData).length}개 대분류`);
        
        // 전역 변수에 저장
        hierarchyStructure[gender] = hierarchyData;
        navigationData[gender] = Object.keys(hierarchyData);
        
        // UI 업데이트
        renderMainCategoryTabs(Object.keys(hierarchyData));
        
        if (Object.keys(hierarchyData).length > 0) {
            const firstCategory = Object.keys(hierarchyData)[0];
            currentCategory = firstCategory;
            await loadStylesFromHierarchy(firstCategory);
        }
        
        updateSyncStatus('connected', `✅ ${gender} 데이터 로드 완료 (${docCount}개)`);
        
    } catch (error) {
        console.error(`❌ ${gender} 계층구조 로드 실패:`, error);
        
        if (error.code === 'failed-precondition') {
            showAdminRequiredMessage();
            updateSyncStatus('updating', '🔄 Firebase 인덱스 생성 중...');
        } else if (error.code === 'permission-denied') {
            showAdminRequiredMessage();
            updateSyncStatus('disconnected', '❌ 권한 오류');
        } else {
            showAdminRequiredMessage();
            updateSyncStatus('disconnected', '❌ 데이터 로드 실패');
        }
    }
}

// ========== 스타일 로드 (핵심 수정) ==========
async function loadStylesFromHierarchy(mainCategory) {
    console.log(`=== 🎨 헤어스타일 로드: ${currentGender}, ${mainCategory} ===`);
    
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading-spinner">🔄 로딩 중...</div>';
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        showEmptyState('Firebase 연결이 필요합니다');
        return;
    }

    try {
        const subCategories = hierarchyStructure[currentGender]?.[mainCategory] || [];
        console.log(`📂 중분류 목록: ${subCategories.join(', ')}`);
        
        if (subCategories.length === 0) {
            console.log('⚠️ 중분류가 없음');
            showEmptyState('중분류가 설정되지 않았습니다');
            return;
        }

        // 중분류별로 스타일 로드
        const allStyles = {};
        
        for (const subCategory of subCategories) {
            console.log(`🔍 ${subCategory} 스타일 조회 중...`);
            
            const stylesQuery = db.collection('hairstyles')
                .where('gender', '==', currentGender)
                .where('mainCategory', '==', mainCategory)
                .where('subCategory', '==', subCategory)
                .orderBy('createdAt', 'desc')
                .limit(50);

            const stylesSnapshot = await stylesQuery.get();
            
            if (!stylesSnapshot.empty) {
                const styles = [];
                stylesSnapshot.forEach(doc => {
                    styles.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                allStyles[subCategory] = styles;
                console.log(`✅ ${subCategory}: ${styles.length}개 스타일 로드됨`);
            } else {
                console.log(`⚠️ ${subCategory}: 스타일 없음`);
                allStyles[subCategory] = [];
            }
        }

        // UI 렌더링
        renderCategoryContent(mainCategory, subCategories, allStyles);
        
        const totalStyles = Object.values(allStyles).reduce((sum, styles) => sum + styles.length, 0);
        updateSyncStatus('connected', `✅ ${mainCategory} 로드 완료 (${totalStyles}개)`);
        
    } catch (error) {
        console.error('❌ 스타일 로드 실패:', error);
        showEmptyState(`스타일 로드 실패: ${error.message}`);
        updateSyncStatus('disconnected', '❌ 스타일 로드 실패');
    }
}

// ========== UI 렌더링 ==========
function renderMainCategoryTabs(mainCategories) {
    const navTabs = document.getElementById('navTabs');
    if (!navTabs) return;
    
    navTabs.innerHTML = '';
    
    if (!mainCategories || mainCategories.length === 0) {
        navTabs.innerHTML = '<div style="color: #666; padding: 20px;">카테고리를 불러올 수 없습니다.</div>';
        return;
    }
    
    // 성별별 카테고리 순서
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    
    const orderedCategories = categoryOrder[currentGender] || mainCategories;
    
    orderedCategories.forEach((mainCategory, index) => {
        if (mainCategories.includes(mainCategory)) {
            const tab = document.createElement('div');
            tab.className = index === 0 ? 'nav-tab active' : 'nav-tab';
            tab.dataset.category = mainCategory;
            tab.textContent = mainCategory;
            tab.onclick = () => switchCategory(mainCategory);
            navTabs.appendChild(tab);
        }
    });
}

function renderCategoryContent(mainCategory, subCategories, allStyles) {
    const content = document.getElementById('content');
    
    let html = `
        <div class="category-description">
            ${getCategoryDescription(mainCategory)}
        </div>
        <div class="length-tabs">
    `;
    
    // 길이 탭 생성
    subCategories.forEach((subCategory, index) => {
        const styleCount = allStyles[subCategory]?.length || 0;
        html += `
            <div class="length-tab ${index === 0 ? 'active' : ''}" 
                 data-length="${subCategory}"
                 onclick="switchLengthTab('${subCategory}', '${mainCategory}')">
                ${subCategory} (${styleCount})
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="hairstyles-container" id="stylesContainer">
    `;
    
    // 첫 번째 서브카테고리의 스타일 표시
    const firstSubCategory = subCategories[0];
    const firstStyles = allStyles[firstSubCategory] || [];
    
    html += renderStyleGrid(firstStyles);
    html += '</div>';
    
    content.innerHTML = html;
    
    // 전역 변수에 저장 (탭 전환 시 사용)
    window.currentAllStyles = allStyles;
}

function renderStyleGrid(styles) {
    if (!styles || styles.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">✂️</div>
                <div class="empty-state-title">등록된 스타일이 없습니다</div>
                <div class="empty-state-message">새로운 헤어스타일이 곧 추가될 예정입니다</div>
            </div>
        `;
    }
    
    return `
        <div class="hairstyle-grid">
            ${styles.map(style => `
                <div class="hairstyle-card" onclick="openStyleModal('${style.code}', '${style.name}', '${style.imageUrl}')">
                    <img src="${style.imageUrl}" 
                         alt="${style.name}" 
                         class="hairstyle-image"
                         onerror="this.src='images/no-image.png'">
                    <div class="hairstyle-info">
                        <div class="hairstyle-code">${style.code}</div>
                        <div class="hairstyle-name">${style.name}</div>
                        <div class="hairstyle-views">👀 ${style.views || 0}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ========== 탭 전환 ==========
function switchCategory(categoryId) {
    if (categoryId === currentCategory) return;
    
    console.log(`🔄 카테고리 전환: ${categoryId}`);
    
    // 탭 활성화
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === categoryId) {
            tab.classList.add('active');
        }
    });
    
    currentCategory = categoryId;
    loadStylesFromHierarchy(categoryId);
}

function switchLengthTab(subCategory, mainCategory) {
    console.log(`🔄 길이 탭 전환: ${subCategory}`);
    
    // 탭 활성화
    document.querySelectorAll('.length-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.length === subCategory) {
            tab.classList.add('active');
        }
    });
    
    // 해당 길이의 스타일 표시
    const container = document.getElementById('stylesContainer');
    const styles = window.currentAllStyles?.[subCategory] || [];
    container.innerHTML = renderStyleGrid(styles);
}

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
                
                updateDesignerDisplay();
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 DOM 로드 완료, HAIRGATOR 최종 버전 초기화 시작');
    
    try {
        // Firebase 초기화 먼저
        await initializeFirebase();
        
        // 자동 로그인 확인
        if (checkAutoLogin()) {
            return; // 자동 로그인 성공 시 더 이상 진행하지 않음
        }
        
        // 일반 로그인 화면 표시
        showDesignerLogin();
        
        // 테마 시스템 초기화
        initializeThemeSystem();
        
        // 디바이스 감지 및 안내
        detectDeviceAndShowNotice();
        
        // 이벤트 리스너 등록
        setupEventListeners();
        
        console.log('✅ HAIRGATOR 최종 버전 초기화 완료');
        
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        updateSyncStatus('disconnected', '❌ 초기화 실패');
    }
});

// ========== 디자이너 로그인 ==========
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
        
        currentDesigner = designer.toLowerCase().replace(/\s+/g, '');
        currentDesignerName = designer;
        
        // 24시간 자동 로그인 설정
        if (autoLoginCheckbox && autoLoginCheckbox.checked) {
            autoLoginEnabled = true;
            saveAutoLogin(currentDesigner, currentDesignerName);
        }
        
        console.log('✅ 로그인 성공:', currentDesignerName);
        
        updateDesignerDisplay();
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

// ========== 성별 선택 ========== 
function selectGender(gender) {
    currentGender = gender;
    console.log('👤 성별 선택됨:', gender);
    
    // 선택된 성별 저장
    localStorage.setItem('selectedGender', gender);
    
    // UI 업데이트
    document.getElementById('genderSelection').style.display = 'none';
    
    const mainContainer = document.querySelector('.main-container');
    mainContainer.classList.add('active');
    mainContainer.classList.remove('male', 'female');
    mainContainer.classList.add(gender);
    
    // 성별별 색상 테마 적용
    applyGenderTheme(gender);
    
    // 해당 성별의 계층구조 로드
    loadHierarchyFromFirebase(gender);
}

// ========== 테마 시스템 ==========
function initializeThemeSystem() {
    const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    console.log('🎨 테마 적용:', theme);
    currentTheme = theme;
    
    document.body.className = `theme-${theme}`;
    
    const themeColors = {
        'dark': '#000000',
        'gray': '#939597', 
        'light': '#E6DCD3'
    };
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = themeColors[theme];
    }
    
    localStorage.setItem('hairgator_theme', theme);
}

function changeTheme() {
    const themes = ['dark', 'gray', 'light'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    applyTheme(nextTheme);
    
    document.body.style.transition = 'all 0.3s ease';
    
    console.log(`🎨 테마 변경: ${currentTheme} → ${nextTheme}`);
}

// ========== 성별별 색상 테마 ==========
function applyGenderTheme(gender) {
    const root = document.documentElement;
    
    if (gender === 'male') {
        root.style.setProperty('--active-color', 'var(--male-primary)');
        root.style.setProperty('--active-gradient', 'var(--male-gradient)');
    } else {
        root.style.setProperty('--active-color', 'var(--female-primary)');
        root.style.setProperty('--active-gradient', 'var(--female-gradient)');
    }
    
    console.log('🎨 성별 테마 적용됨:', gender);
}

// ========== 스타일 모달 ==========
function openStyleModal(code, name, imageUrl) {
    selectedStyleCode = code;
    selectedStyleName = name;
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCode = document.getElementById('modalCode');
    const modalName = document.getElementById('modalName');
    
    if (modal && modalImage && modalCode && modalName) {
        modalImage.src = imageUrl;
        modalCode.textContent = code;
        modalName.textContent = name;
        modal.style.display = 'block';
        
        console.log('📸 스타일 모달 열림:', code, name);
        
        // 조회수 증가
        if (firebaseConnected) {
            incrementStyleViews(code);
        }
    }
}

function closeStyleModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
    selectedStyleCode = null;
    selectedStyleName = null;
}

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
                lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📈 조회수 증가: ${styleCode} (${currentViews + 1})`);
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

// ========== 뒤로가기 ==========
function goBack() {
    if (document.querySelector('.main-container').classList.contains('active')) {
        document.querySelector('.main-container').classList.remove('active');
        showGenderSelection();
    } else if (document.getElementById('genderSelection').style.display === 'flex') {
        showDesignerLogin();
        currentDesigner = null;
        currentDesignerName = null;
        
        if (autoLoginEnabled) {
            localStorage.removeItem('hairgator_auto_login');
            autoLoginEnabled = false;
        }
    }
}

// ========== 유틸리티 함수 ==========
function showDesignerLogin() {
    document.getElementById('designerLogin').style.display = 'flex';
    document.getElementById('genderSelection').style.display = 'none';
    document.querySelector('.main-container').classList.remove('active');
}

function hideDesignerLogin() {
    document.getElementById('designerLogin').style.display = 'none';
}

function showGenderSelection() {
    document.getElementById('genderSelection').style.display = 'flex';
    document.querySelector('.main-container').classList.remove('active');
    showDeviceOptimizationNotice('👥 고객의 성별을 선택해주세요');
}

function updateDesignerDisplay() {
    const designerNameElements = document.querySelectorAll('.designer-name');
    designerNameElements.forEach(element => {
        if (element) {
            element.textContent = currentDesignerName || '디자이너';
        }
    });
}

function showEmptyState(message) {
    const content = document.getElementById('content');
    if (content) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-title">데이터를 불러올 수 없습니다</div>
                <div class="empty-state-message">${message}</div>
            </div>
        `;
    }
}

function showAdminRequiredMessage() {
    const content = document.getElementById('content');
    const navTabs = document.getElementById('navTabs');
    
    if (navTabs) {
        navTabs.innerHTML = `
            <div style="color: #FF69B4; padding: 15px; text-align: center; width: 100%;">
                🔧 어드민 초기화 필요
            </div>
        `;
    }
    
    if (content) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <div class="empty-state-title">어드민에서 데이터를 초기화해주세요</div>
                <div class="empty-state-message">
                    <strong>해결 방법:</strong><br><br>
                    1. <a href="/admin.html" target="_blank" style="color: #FF1493;">어드민 페이지</a>로 이동<br>
                    2. "🚀 정리된 데이터로 초기화" 버튼 클릭<br>
                    3. 이 페이지 새로고침<br><br>
                </div>
            </div>
        `;
    }
}

function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = message;
        syncStatus.className = 'sync-status ' + status;

        if (status === 'connected') {
            setTimeout(() => {
                syncStatus.style.opacity = '0';
            }, 3000);
        } else {
            syncStatus.style.opacity = '1';
        }
    }
    
    console.log(`🔄 동기화 상태: ${status} - ${message}`);
}

function getCategoryDescription(category) {
    const descriptions = {
        'MOHICAN': '모히칸은 옆머리를 짧게 하고 윗머리를 높이 세운, 개성 있는 스타일입니다.',
        'BUZZ': '버즈컷은 전체적으로 짧고 깔끔한 스타일이며, 간편하게 관리할 수 있습니다.',
        'SIDE PART': '사이드 파트는 클래식한 느낌으로 다양한 이미지를 연출할 수 있습니다.',
        'SIDE FRINGE': '사이드 프린지는 한쪽으로 넘긴 앞머리가 특징인 스타일입니다.',
        'FRINGE UP': '프린지 업은 앞머리를 위로 올린 깔끔한 스타일입니다.',
        'PUSHED BACK': '푸시드 백은 머리 전체를 뒤로 넘긴 세련된 스타일입니다.',
        'CROP': '크롭은 짧고 텍스처가 있는 모던한 스타일입니다.',
        'BOB': '밥 스타일은 어깨 위 길이로 모던하고 깔끔한 느낌을 연출합니다.',
        'SHORT': '숏 스타일은 관리가 편리하고 세련된 느낌을 줍니다.',
        'MEDIUM': '미디움 스타일은 다양한 연출이 가능한 인기 있는 길이입니다.',
        'LONG': '롱 스타일은 여성스럽고 우아한 느낌을 연출합니다.',
        'SEMI LONG': '세미롱은 롱과 미디움의 중간 길이로 균형감이 좋습니다.'
    };
    
    return descriptions[category] || '다양한 헤어스타일을 확인해보세요.';
}

// ========== 기기 최적화 ==========
function detectDeviceAndShowNotice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
        console.log('📱 iOS 기기 감지됨');
        document.body.classList.add('ios-device');
        hideAddressBar();
    }
    
    if (/android/.test(userAgent)) {
        console.log('🤖 Android 기기 감지됨');
        document.body.classList.add('android-device');
    }
    
    preventPullToRefresh();
    
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

function showInstallPrompt() {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = '📱 홈 화면에 추가하여 앱처럼 사용하세요!';
        notice.className = 'device-notice show';
        
        setTimeout(() => {
            notice.classList.remove('show');
        }, 10000);
    }
}

function showDeviceOptimizationNotice(customMessage = null) {
    const notice = document.getElementById('deviceNotice');
    if (!notice) return;
    
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

function hideAddressBar() {
    setTimeout(function() {
        window.scrollTo(0, 1);
    }, 0);
}

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
    
    // 모달 이벤트
    const modal = document.getElementById('imageModal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = closeStyleModal;
        }
        
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeStyleModal();
            }
        };
    }
    
    // 햄버거 메뉴 이벤트
    const overlay = document.getElementById('hamburgerOverlay');
    if (overlay) {
        overlay.onclick = closeHamburgerMenu;
    }
    
    // ESC 키 이벤트
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

// ========== 전역 함수 등록 ==========
window.handleDesignerLogin = handleDesignerLogin;
window.selectGender = selectGender;
window.switchCategory = switchCategory;
window.switchLengthTab = switchLengthTab;
window.openStyleModal = openStyleModal;
window.closeStyleModal = closeStyleModal;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.closeHamburgerMenu = closeHamburgerMenu;
window.changeTheme = changeTheme;
window.goBack = goBack;

// 디버그 함수들
window.forceInitializeDataStructure = () => {
    if (currentGender) {
        loadHierarchyFromFirebase(currentGender);
    } else {
        console.log('성별을 먼저 선택해주세요');
    }
};

console.log('🎯 HAIRGATOR 최종 완성 버전 로드 완료 - 모든 기능 통합 완료!');
