/* ========================================
   HAIRGATOR - ULTRA MODERN MAIN APPLICATION
   ======================================== */

class HairgatorApp {
    constructor() {
        this.currentScreen = 'loading';
        this.currentGender = null;
        this.currentMainTab = null;
        this.currentSubTab = 'None';
        this.isAuthenticated = false;
        this.currentUser = null;
        this.stylesData = [];
        this.filteredStyles = [];
        this.categories = {
            male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
            female: ['A Length', 'B Length', 'C Length', 'D Length', 'E Length', 'F Length', 'G Length', 'H Length']
        };
        this.subCategories = ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'];
        
        this.init();
    }
    
    async init() {
        console.log('🚀 HAIRGATOR Ultra Modern App 시작...');
        
        // DOM이 준비될 때까지 대기
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // 로딩 화면 표시
        this.showLoadingScreen();
        
        // 초기화 작업들
        await this.initializeApp();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 로그인 상태 확인
        this.checkAuthStatus();
        
        console.log('✅ 앱 초기화 완료');
    }
    
    async showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingMessage = document.querySelector('.loading-message');
        const progressFill = document.querySelector('.progress-fill');
        
        const steps = [
            { message: 'Initializing Platform...', progress: 20 },
            { message: 'Loading UI Components...', progress: 40 },
            { message: 'Connecting to Firebase...', progress: 60 },
            { message: 'Preparing Themes...', progress: 80 },
            { message: 'Ready to Launch!', progress: 100 }
        ];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            if (loadingMessage) {
                loadingMessage.textContent = step.message;
            }
            
            if (progressFill) {
                progressFill.style.width = `${step.progress}%`;
            }
            
            await new Promise(resolve => setTimeout(resolve, 400));
        }
        
        // 로딩 완료 후 로그인 화면으로 전환
        setTimeout(() => {
            this.switchScreen('login');
        }, 500);
    }
    
    async initializeApp() {
        try {
            // Firebase 연결 확인
            if (typeof db !== 'undefined') {
                await this.testFirebaseConnection();
            }
            
            // PWA 서비스워커 등록
            await this.registerServiceWorker();
            
            // 아이콘 초기화
            this.initializeIcons();
            
            // 앱 설정 로드
            this.loadAppSettings();
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
        }
    }
    
    async testFirebaseConnection() {
        try {
            await db.collection('hairstyles').limit(1).get();
            console.log('✅ Firebase 연결 성공');
        } catch (error) {
            console.warn('⚠️ Firebase 연결 실패:', error);
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker 등록 성공:', registration);
            } catch (error) {
                console.warn('⚠️ Service Worker 등록 실패:', error);
            }
        }
    }
    
    initializeIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            console.log('✅ Lucide 아이콘 초기화 완료');
        }
    }
    
    loadAppSettings() {
        // 앱 설정 로드 (나중에 확장 가능)
        const savedSettings = localStorage.getItem('hairgator_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('📱 저장된 설정 로드:', settings);
        }
    }
    
    setupEventListeners() {
        // 로그인 폼
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        // 사이드바 토글
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => this.closeSidebar());
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
        }
        
        // 전역 검색
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', this.handleGlobalSearch.bind(this));
            globalSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
        
        // 검색 버튼
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = globalSearch?.value || '';
                this.performSearch(query);
            });
        }
        
        // 정렬 옵션
        const sortOptions = document.getElementById('sortOptions');
        if (sortOptions) {
            sortOptions.addEventListener('change', this.handleSortChange.bind(this));
        }
        
        // 뷰 변경 버튼들
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.changeView(view);
            });
        });
        
        // 키보드 단축키
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // 뒤로가기 버튼 처리
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => this.showConnectionStatus(true));
        window.addEventListener('offline', () => this.showConnectionStatus(false));
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const name = document.getElementById('designerName')?.value;
        const phone = document.getElementById('phoneNumber')?.value;
        const password = document.getElementById('password')?.value;
        
        // 입력값 검증
        if (!name || phone.length !== 4 || password.length !== 4) {
            this.showToast('모든 정보를 정확히 입력해주세요', 'error');
            return;
        }
        
        try {
            // 로그인 처리 (Firebase 또는 로컬 인증)
            const user = await this.authenticateUser(name, phone, password);
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                
                // 사용자 정보 저장 (24시간)
                const userData = {
                    name,
                    phone,
                    password,
                    loginTime: Date.now()
                };
                localStorage.setItem('hairgator_user', JSON.stringify(userData));
                
                // 성별 선택 화면으로 이동
                this.switchScreen('gender');
                this.showToast(`환영합니다, ${name}님!`, 'success');
                
                // 사용자명 표시 업데이트
                this.updateUserDisplay(name);
                
            } else {
                this.showToast('로그인 정보가 올바르지 않습니다', 'error');
            }
            
        } catch (error) {
            console.error('로그인 오류:', error);
            this.showToast('로그인 중 오류가 발생했습니다', 'error');
        }
    }
    
    async authenticateUser(name, phone, password) {
        // 실제 구현에서는 Firebase Auth 또는 API 호출
        // 현재는 간단한 로컬 인증으로 구현
        
        try {
            // Firebase에서 사용자 정보 확인 (옵션)
            if (typeof db !== 'undefined') {
                const userQuery = await db.collection('designers')
                    .where('name', '==', name)
                    .where('phone', '==', phone)
                    .limit(1)
                    .get();
                
                if (!userQuery.empty) {
                    const userData = userQuery.docs[0].data();
                    return { id: userQuery.docs[0].id, ...userData };
                }
            }
            
            // 로컬 인증 (개발용)
            return {
                id: `user_${Date.now()}`,
                name,
                phone,
                loginTime: Date.now(),
                isLocal: true
            };
            
        } catch (error) {
            console.error('인증 오류:', error);
            throw error;
        }
    }
    
    updateUserDisplay(name) {
        const displayElement = document.getElementById('designerNameDisplay');
        if (displayElement) {
            displayElement.textContent = name;
        }
    }
    
    checkAuthStatus() {
        const savedUser = localStorage.getItem('hairgator_user');
        
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                const now = Date.now();
                const loginTime = userData.loginTime || 0;
                const twentyFourHours = 24 * 60 * 60 * 1000;
                
                // 24시간 이내인지 확인
                if (now - loginTime < twentyFourHours) {
                    this.currentUser = userData;
                    this.isAuthenticated = true;
                    this.updateUserDisplay(userData.name);
                    
                    // 메인 메뉴로 바로 이동 (성별이 저장되어 있으면)
                    const savedGender = localStorage.getItem('selectedGender');
                    if (savedGender) {
                        this.currentGender = savedGender;
                        document.body.classList.add(`gender-${savedGender}`);
                        this.switchScreen('main');
                        this.loadMenuForGender(savedGender);
                    } else {
                        this.switchScreen('gender');
                    }
                    
                    console.log('✅ 자동 로그인 성공:', userData.name);
                    return;
                }
            } catch (error) {
                console.error('저장된 사용자 정보 파싱 오류:', error);
            }
        }
        
        // 유효하지 않으면 로그인 화면으로
        this.logout(false);
    }
    
    switchScreen(screenName) {
        // 현재 활성 화면 비활성화
        document.querySelectorAll('.screen.active').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 새 화면 활성화
        const newScreen = document.getElementById(screenName + 'Screen') || 
                          document.getElementById(screenName === 'main' ? 'mainMenu' : screenName + 'Selection');
        
        if (newScreen) {
            newScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // 브라우저 히스토리 관리
            const state = { screen: screenName };
            history.pushState(state, '', `#${screenName}`);
            
            console.log('📱 화면 전환:', screenName);
        }
    }
    
    selectGender(gender) {
        this.currentGender = gender;
        localStorage.setItem('selectedGender', gender);
        
        // body에 성별 클래스 추가
        document.body.classList.remove('gender-male', 'gender-female');
        document.body.classList.add(`gender-${gender}`);
        
        // 메인 메뉴 화면으로 전환
        this.switchScreen('main');
        
        // 해당 성별의 메뉴 로드
        this.loadMenuForGender(gender);
        
        this.showToast(`${gender === 'male' ? '남성' : '여성'} 스타일 모드로 전환되었습니다`, 'info');
    }
    
    loadMenuForGender(gender) {
        const categories = this.categories[gender];
        const mainTabsContainer = document.getElementById('mainTabs');
        
        if (!mainTabsContainer || !categories) return;
        
        // 기존 탭들 제거
        mainTabsContainer.innerHTML = '';
        
        // 새 탭들 생성
        categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = 'main-tab';
            tab.textContent = category;
            tab.addEventListener('click', () => this.selectMainTab(category, index));
            
            // 첫 번째 탭 활성화
            if (index === 0) {
                tab.classList.add('active');
                this.selectMainTab(category, 0);
            }
            
            mainTabsContainer.appendChild(tab);
        });
        
        // 카테고리 개수 업데이트
        const categoryIndicator = document.querySelector('.active-count');
        if (categoryIndicator) {
            categoryIndicator.textContent = `${categories.length}개 카테고리`;
        }
    }
    
    selectMainTab(category, index) {
        this.currentMainTab = category;
        
        // 탭 활성화 상태 변경
        document.querySelectorAll('.main-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        
        // 서브 카테고리 탭 로드
        this.loadSubTabs();
        
        // 스타일 로드
        this.loadStyles();
    }
    
    loadSubTabs() {
        const subTabsContainer = document.getElementById('subTabs');
        if (!subTabsContainer) return;
        
        // 기존 서브탭들 제거
        subTabsContainer.innerHTML = '';
        
        // 서브 카테고리 탭들 생성
        this.subCategories.forEach((subCategory, index) => {
            const tab = document.createElement('button');
            tab.className = 'sub-tab';
            tab.textContent = subCategory;
            tab.addEventListener('click', () => this.selectSubTab(subCategory, index));
            
            // 첫 번째 서브탭 활성화
            if (index === 0) {
                tab.classList.add('active');
                this.selectSubTab(subCategory, 0);
            }
            
            // 스타일이 없는 서브카테고리는 비활성화 (나중에 실제 데이터로 확인)
            // 현재는 모든 탭 활성화
            
            subTabsContainer.appendChild(tab);
        });
    }
    
    selectSubTab(subCategory, index) {
        this.currentSubTab = subCategory;
        
        // 서브탭 활성화 상태 변경
        document.querySelectorAll('.sub-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        
        // 스타일 다시 로드
        this.loadStyles();
    }
    
    async loadStyles() {
        try {
            const stylesGrid = document.getElementById('stylesGrid');
            if (!stylesGrid) return;
            
            // 로딩 상태 표시
        stylesGrid.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>스타일 로딩 중...</p>
            </div>
        `;
        
        try {
            // Firebase에서 해당 카테고리 스타일들 가져오기
            const query = db.collection('hairstyles')
                .where('gender', '==', this.currentGender)
                .where('mainCategory', '==', this.currentMainTab)
                .where('subCategory', '==', this.currentSubTab);
            
            const snapshot = await query.get();
            
            this.stylesData = [];
            snapshot.forEach(doc => {
                this.stylesData.push({ id: doc.id, ...doc.data() });
            });
            
            this.filteredStyles = [...this.stylesData];
            this.renderStylesGrid();
            
        } catch (error) {
            console.error('스타일 로딩 오류:', error);
            stylesGrid.innerHTML = `
                <div class="error-container">
                    <p>스타일을 불러오는데 실패했습니다.</p>
                    <button class="btn" onclick="app.loadStyles()">다시 시도</button>
                </div>
            `;
        }
        }
    }
    
    renderStylesGrid() {
        const stylesGrid = document.getElementById('stylesGrid');
        if (!stylesGrid || this.filteredStyles.length === 0) {
            stylesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎨</div>
                    <h3>스타일이 없습니다</h3>
                    <p>이 카테고리에는 아직 등록된 스타일이 없어요</p>
                </div>
            `;
            return;
        }
        
        const gridHTML = this.filteredStyles.map(style => `
            <div class="style-card" onclick="app.viewStyleDetail('${style.id}')">
                <div class="style-image">
                    ${style.imageUrl ? 
                        `<img src="${style.imageUrl}" alt="${style.name}" loading="lazy">` : 
                        `<div class="no-image-placeholder">
                            <i data-lucide="image"></i>
                        </div>`
                    }
                </div>
                <div class="style-overlay">
                    <div class="style-info">
                        <div class="style-name">${style.name}</div>
                        <div class="style-category">${style.code || 'NO CODE'}</div>
                    </div>
                </div>
                ${this.isNewStyle(style.createdAt) ? '<div class="style-new-badge"></div>' : ''}
            </div>
        `).join('');
        
        stylesGrid.innerHTML = gridHTML;
        
        // 아이콘 재초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    isNewStyle(createdAt) {
        if (!createdAt) return false;
        const now = new Date();
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 7; // 7일 이내면 NEW 표시
    }
    
    viewStyleDetail(styleId) {
        const style = this.filteredStyles.find(s => s.id === styleId);
        if (!style) return;
        
        // 스타일 상세보기 모달이나 페이지 표시
        console.log('스타일 상세보기:', style);
        // TODO: 상세보기 모달 구현
    }
    
    performSearch(query) {
        if (!query.trim()) {
            this.filteredStyles = [...this.stylesData];
        } else {
            this.filteredStyles = this.stylesData.filter(style => 
                style.name.toLowerCase().includes(query.toLowerCase()) ||
                (style.code && style.code.toLowerCase().includes(query.toLowerCase()))
            );
        }
        
        this.renderStylesGrid();
        this.showToast(`검색 결과: ${this.filteredStyles.length}개`, 'info');
    }
    
    handleGlobalSearch(e) {
        const query = e.target.value;
        if (query.length === 0 || query.length >= 2) {
            this.performSearch(query);
        }
    }
    
    handleSortChange(e) {
        const sortBy = e.target.value;
        
        this.filteredStyles.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'popular':
                    return (b.likes || 0) - (a.likes || 0);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
        
        this.renderStylesGrid();
    }
    
    changeView(viewType) {
        const stylesGrid = document.getElementById('stylesGrid');
        const viewBtns = document.querySelectorAll('.view-btn');
        
        // 버튼 활성화 상태 변경
        viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewType);
        });
        
        // 그리드 클래스 변경
        if (viewType === 'list') {
            stylesGrid.classList.add('list-view');
        } else {
            stylesGrid.classList.remove('list-view');
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.add('open');
        overlay.classList.add('active');
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
    
    handleKeyboardShortcuts(e) {
        // ESC 키로 사이드바 닫기
        if (e.key === 'Escape') {
            this.closeSidebar();
        }
        
        // Ctrl/Cmd + K로 검색 포커스
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }
    
    handlePopState(e) {
        if (e.state && e.state.screen) {
            this.switchScreen(e.state.screen);
        }
    }
    
    showConnectionStatus(isOnline) {
        const status = isOnline ? 'online' : 'offline';
        const message = isOnline ? '연결됨' : '오프라인 모드';
        const type = isOnline ? 'success' : 'warning';
        
        this.showToast(`네트워크 ${message}`, type);
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            border-left: 4px solid var(--accent-primary);
            box-shadow: var(--shadow-lg);
            backdrop-filter: var(--blur);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;
        
        if (type === 'success') {
            toast.style.borderLeftColor = 'var(--success)';
        } else if (type === 'error') {
            toast.style.borderLeftColor = 'var(--error)';
        } else if (type === 'warning') {
            toast.style.borderLeftColor = 'var(--warning)';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    logout(showMessage = true) {
        // 로컬 저장소 정리
        localStorage.removeItem('hairgator_user');
        localStorage.removeItem('selectedGender');
        
        // 상태 초기화
        this.currentUser = null;
        this.isAuthenticated = false;
        this.currentGender = null;
        
        // body 클래스 정리
        document.body.classList.remove('gender-male', 'gender-female');
        
        // 로그인 화면으로 이동
        this.switchScreen('login');
        
        if (showMessage) {
            this.showToast('로그아웃되었습니다', 'info');
        }
        
        console.log('로그아웃 완료');
    }
}

// 전역 인스턴스 생성
const app = new HairgatorApp();

// 전역 함수들 (HTML에서 호출용)
window.selectGender = (gender) => app.selectGender(gender);
window.app = app;

// 스타일 시트 추가 (토스트용)
const additionalStyles = `
<style>
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.loading-container,
.error-container,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);
    grid-column: 1 / -1;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--bg-tertiary);
    border-top: 3px solid var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.no-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: var(--text-muted);
}

.no-image-placeholder i {
    width: 48px;
    height: 48px;
}

.styles-grid.list-view {
    grid-template-columns: 1fr;
}

.styles-grid.list-view .style-card {
    display: flex;
    flex-direction: row;
    height: 120px;
}

.styles-grid.list-view .style-image {
    width: 120px;
    flex-shrink: 0;
}

.styles-grid.list-view .style-overlay {
    position: relative;
    flex: 1;
    background: transparent;
    opacity: 1;
    padding: 1rem;
    display: flex;
    align-items: center;
}

.styles-grid.list-view .style-info {
    color: var(--text-primary);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);

console.log('🚀 HAIRGATOR Ultra Modern App 로드 완료');
