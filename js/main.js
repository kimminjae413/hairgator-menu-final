// HAIRGATOR Main Application - 최종 버전 (goBack 함수 추가)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🦎 HAIRGATOR 메인 앱 시작...');
    
    // Elements
    const backBtn = document.getElementById('backBtn');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    
    // Initialize
    init();

    function init() {
        console.log('🦎 HAIRGATOR 초기화 시작...');
        setupEventListeners();
        loadTheme();
        checkAuthStatus();
        setupSidebar();
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        console.log('✅ HAIRGATOR 초기화 완료');
    }

    // 사이드바 메뉴 구조 복원
    function setupSidebar() {
        if (sidebar) {
            const content = sidebar.querySelector('.sidebar-content');
            if (content) {
                content.innerHTML = `
                    <!-- 로그인 정보 -->
                    <div class="login-info" style="padding: 20px; border-bottom: 1px solid rgba(128,128,128,0.2);">
                        <div class="login-status" id="loginStatus" style="color: #4A90E2; font-size: 14px; margin-bottom: 10px;">
                            로그인: 확인중...
                        </div>
                        <div style="color: var(--text-secondary, #aaa); font-size: 12px;">
                            크레딧: <span id="creditDisplay" style="color: #4A90E2; font-weight: bold;">-</span>
                        </div>
                    </div>

                    <!-- 메뉴 목록 -->
                    <nav class="sidebar-menu" style="padding: 10px 0;">
                        
                        <!-- 테마 전환 -->
                        <div class="menu-item" id="themeToggleMenu" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span id="themeIcon" style="font-size: 20px;">🌙</span>
                                <span id="themeText" style="color: var(--text-primary, #333); font-size: 14px;">다크 모드</span>
                            </div>
                        </div>

                        <!-- 퍼스널 컬러 진단 -->
                        <div class="menu-item" id="personalColorBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🎨</span>
                                <span style="color: var(--text-primary, #333); font-size: 14px;">퍼스널 컬러 진단</span>
                            </div>
                        </div>

                        <!-- 로그아웃 -->
                        <div class="menu-item" id="logoutBtn" style="padding: 15px 20px; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🚪</span>
                                <span style="color: #ff4444; font-size: 14px;">로그아웃</span>
                            </div>
                        </div>

                    </nav>
                `;
                
                // 호버 효과 CSS 추가
                const style = document.createElement('style');
                style.textContent = `
                    .menu-item:hover {
                        background: rgba(128, 128, 128, 0.1) !important;
                        transition: background 0.3s ease;
                    }
                    
                    .sidebar-menu {
                        max-height: calc(100vh - 200px);
                        overflow-y: auto;
                    }
                    
                    /* 라이트 모드에서 사이드바 배경 */
                    body.light-theme .sidebar {
                        background: #f5f5f5;
                    }
                    
                    body.light-theme .sidebar-header {
                        background: #f5f5f5;
                        border-bottom: 1px solid rgba(0,0,0,0.1);
                    }
                    
                    body.light-theme .sidebar-header h3,
                    body.light-theme .sidebar-close {
                        color: #333;
                    }
                `;
                document.head.appendChild(style);
                
                console.log('✅ 사이드바 메뉴 복원 완료');
                
                // 로그인 정보 업데이트
                updateLoginInfo();
            }
        }
    }

    // 로그인 정보 업데이트
    function updateLoginInfo() {
        const loginStatus = document.getElementById('loginStatus');
        const creditDisplay = document.getElementById('creditDisplay');
        
        // 불나비 사용자 확인
        const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
        if (bullnabiUser) {
            if (loginStatus) loginStatus.textContent = `로그인: ${bullnabiUser.name}`;
            if (creditDisplay) creditDisplay.textContent = bullnabiUser.remainCount || 0;
        } else {
            // 일반 로그인 확인
            const designerName = localStorage.getItem('designerName');
            if (designerName) {
                if (loginStatus) loginStatus.textContent = `로그인: ${designerName}`;
                if (creditDisplay) creditDisplay.textContent = '∞';
            } else {
                if (loginStatus) loginStatus.textContent = '로그인: 게스트';
                if (creditDisplay) creditDisplay.textContent = '0';
            }
        }
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

        // 사이드바 메뉴 이벤트 (동적 생성 후 연결)
        setTimeout(() => {
            const themeToggleMenu = document.getElementById('themeToggleMenu');
            const personalColorBtn = document.getElementById('personalColorBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            
            if (themeToggleMenu) {
                themeToggleMenu.addEventListener('click', toggleTheme);
            }
            
            if (personalColorBtn) {
                personalColorBtn.addEventListener('click', function() {
                    console.log('🎨 퍼스널 컬러 진단 클릭');
                    window.location.href = '/personal-color/';
                });
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        }, 500);

        // Keyboard Events
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // 스타일 모달 닫기 (menu.js에 위임)
                if (typeof window.HAIRGATOR_MENU?.closeStyleModal === 'function') {
                    window.HAIRGATOR_MENU.closeStyleModal();
                }
                // 사이드바 닫기
                if (sidebar && sidebar.classList.contains('active')) {
                    closeSidebar();
                }
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
        if (menuContainer && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            if (genderSelection) genderSelection.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'flex'; // ← 버튼 유지!
            
            // menu.js의 전역 변수 리셋
            if (window.currentGender) window.currentGender = null;
            if (window.currentMainTab) window.currentMainTab = null;
            if (window.currentSubTab) window.currentSubTab = null;
            
            console.log('🔙 메뉴 → 성별 선택');
        }
    }

    // Sidebar Functions
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('active');
            updateLoginInfo(); // 열 때마다 정보 업데이트
        }
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
    }

    // Theme Functions
    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        const isLight = savedTheme === 'light';
        
        if (isLight) {
            document.body.classList.add('light-theme');
        }
        
        // 테마 아이콘 업데이트
        setTimeout(() => {
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            
            if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
            if (themeText) themeText.textContent = isLight ? '라이트 모드' : '다크 모드';
        }, 100);
        
        console.log(`🎨 테마 로드: ${savedTheme}`);
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        // 사이드바 테마 토글 업데이트
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        
        if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
        if (themeText) themeText.textContent = isLight ? '라이트 모드' : '다크 모드';
        
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
        console.log(`🎨 테마 변경: ${isLight ? 'light' : 'dark'}`);
        
        closeSidebar(); // 테마 변경 후 사이드바 닫기
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
                // 로그인 정보 삭제
                localStorage.removeItem('bullnabi_user');
                localStorage.removeItem('bullnabi_login_time');
                localStorage.removeItem('designerName');
                localStorage.removeItem('designerPhone');
                localStorage.removeItem('designerPassword');
                localStorage.removeItem('loginTime');
                sessionStorage.clear();
                
                console.log('✅ 로그아웃 완료');
                location.reload();
            } catch (error) {
                console.error('❌ 로그아웃 오류:', error);
                showToast('로그아웃 실패: ' + error.message);
            }
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

    // ⭐⭐⭐ 전역 goBack 함수 (index.html 호환) ⭐⭐⭐
    window.goBack = function() {
        console.log('🔙 goBack() 호출');
        
        if (menuContainer && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            if (genderSelection) genderSelection.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'flex'; // ← 핵심!
            
            // menu.js의 전역 변수 리셋
            if (window.currentGender) window.currentGender = null;
            if (window.currentMainTab) window.currentMainTab = null;
            if (window.currentSubTab) window.currentSubTab = null;
            
            console.log('🔙 메뉴 → 성별 선택');
        } 
        else if (genderSelection && genderSelection.style.display === 'flex') {
            genderSelection.style.display = 'none';
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen) loginScreen.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'none';
            
            console.log('🔙 성별 선택 → 로그인');
        }
    };

    // menu.js 로드 확인
    setTimeout(() => {
        if (typeof window.HAIRGATOR_MENU === 'undefined') {
            console.error('❌ menu.js가 로드되지 않았습니다');
            showToast('⚠️ 메뉴 시스템 로드 실패. 페이지를 새로고침해주세요.');
        } else {
            console.log('✅ menu.js 연동 확인');
        }
        
        if (typeof window.goBack === 'undefined') {
            console.error('❌ goBack() 함수가 없습니다');
        } else {
            console.log('✅ goBack() 함수 확인');
        }
    }, 1000);

    // 전역 함수 노출
    window.showToast = showToast;

    console.log('🚀 HAIRGATOR 메인 애플리케이션 준비 완료');
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
        
        .toast-message {
            white-space: pre-line;
        }
    `;
    document.head.appendChild(style);
});
