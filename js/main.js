// HAIRGATOR Main Application - menu.js 연동 최종 버전
document.addEventListener('DOMContentLoaded', function() {
    console.log('🦎 HAIRGATOR 메인 앱 시작...');
    
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
    
    // Initialize
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

        // Gender Selection은 index.html의 onclick이 처리
        // 중복 이벤트 리스너 제거로 문제 해결

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
            if (backBtn) backBtn.style.display = 'none';
            
            if (themeToggleBottom) {
                themeToggleBottom.style.display = 'flex';
            }
            
            // menu.js의 전역 변수 리셋
            if (window.currentGender) window.currentGender = null;
            if (window.currentMainTab) window.currentMainTab = null;
            if (window.currentSubTab) window.currentSubTab = null;
            
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

    // 퍼스널컬러 사이드바 메뉴 설정
    const personalColorBtn = document.getElementById('personalColorBtn');
    if (personalColorBtn) {
        personalColorBtn.addEventListener('click', function() {
            console.log('🎨 퍼스널컬러 진단 클릭');
            closeSidebar();
            
            // 퍼스널컬러 모달 열기
            const modal = document.getElementById('personalColorModal');
            if (modal) {
                modal.classList.add('active');
                
                // iframe 로드
                const iframe = document.getElementById('personalColorFrame');
                if (iframe && !iframe.src) {
                    iframe.src = 'https://mypersonalcolor.com/';
                }
            }
        });
    }
    
    // 퍼스널컬러 모달 닫기 버튼
    const personalColorClose = document.getElementById('personalColorClose');
    if (personalColorClose) {
        personalColorClose.addEventListener('click', function() {
            const modal = document.getElementById('personalColorModal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    }

    // menu.js 로드 확인
    setTimeout(() => {
        if (typeof window.HAIRGATOR_MENU === 'undefined') {
            console.error('❌ menu.js가 로드되지 않았습니다');
            showToast('⚠️ 메뉴 시스템 로드 실패. 페이지를 새로고침해주세요.');
        } else {
            console.log('✅ menu.js 연동 확인');
        }
    }, 1000);

    // 전역 함수 노출 (필요한 경우)
    window.showToast = showToast;

    // Performance Monitoring
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
