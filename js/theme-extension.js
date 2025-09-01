// 🎨 HAIRGATOR - 테마 확장 시스템 최종 완성본 (기존 코드와 통합)

(function() {
    'use strict';
    
    // 🔧 기존 코드와 호환되도록 전역 변수 설정
    const AVAILABLE_THEMES = ['dark', 'light', 'blue'];
    let currentThemeIndex = 0;
    
    // 페이지 로드 시 저장된 테마 복원
    function initThemes() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        currentThemeIndex = AVAILABLE_THEMES.indexOf(savedTheme);
        if (currentThemeIndex === -1) currentThemeIndex = 0;
        
        applyTheme(AVAILABLE_THEMES[currentThemeIndex]);
        updateThemeIcon();
        updateThemeOptions();
        setupMenuButton(); // 햄버거 버튼 설정 추가
        
        console.log('테마 시스템 초기화:', savedTheme);
    }
    
    // 테마 적용 함수
    function applyTheme(themeName) {
        // 기존 테마 클래스들 제거
        document.body.classList.remove('light-theme', 'blue-theme', 'purple-theme', 'green-theme');
        
        // 새 테마 적용
        if (themeName === 'light') {
            document.body.classList.add('light-theme');
        } else if (themeName !== 'dark') {
            document.body.classList.add(`${themeName}-theme`);
        }
        
        // 성별 클래스 유지 (중요!)
        maintainGenderClass();
        
        // 메타 테마 색상 업데이트
        updateMetaThemeColor(themeName);
        
        // 로컬 스토리지에 저장
        localStorage.setItem('hairgator_theme', themeName);
    }
    
    
    // 🔧 햄버거 버튼과 사이드바 제어 (핵심 기능!)
    function setupMenuButton() {
        const menuBtn = document.getElementById('menuToggle') || document.querySelector('.menu-btn');
        const sidebar = document.getElementById('sidebar');
        
        if (menuBtn) {
            // 기존 이벤트 리스너 제거 후 새로 추가
            const newMenuBtn = menuBtn.cloneNode(true);
            menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);
            
            newMenuBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (sidebar) {
                    const isOpen = sidebar.classList.contains('active');
                    if (isOpen) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }
                }
                console.log('햄버거 버튼 클릭됨');
            });
            
            console.log('햄버거 메뉴 버튼 설정 완료');
        }
        
        if (sidebar) {
            // 사이드바 외부 클릭 시 닫기
            document.addEventListener('click', function(e) {
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !e.target.closest('.menu-btn')) {
                    closeSidebar();
                }
            });
            
            // 닫기 버튼
            const closeBtn = sidebar.querySelector('.sidebar-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeSidebar);
            }
        }
    }

    function openSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('사이드바 열림');
        }
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
            console.log('사이드바 닫힘');
        }
    }
    
    // 테마 아이콘 업데이트
    function updateThemeIcon() {
        const themeIcons = document.querySelectorAll('.theme-icon');
        const icons = {
            'dark': '🌙',
            'light': '☀️', 
            'blue': '🌊'
        };
        
        const currentTheme = AVAILABLE_THEMES[currentThemeIndex];
        themeIcons.forEach(icon => {
            if (icon) icon.textContent = icons[currentTheme] || '🌙';
        });
    }
    
    // 메타 테마 컬러 업데이트
    function updateMetaThemeColor(themeName) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const colors = {
                'dark': '#000000',
                'light': '#ffffff',
                'blue': '#0d1421'
            };
            metaThemeColor.setAttribute('content', colors[themeName] || '#000000');
        }
    }
    
    // 사이드바 테마 옵션 업데이트
    function updateThemeOptions() {
        const themeOptions = document.querySelectorAll('.theme-option');
        const currentTheme = AVAILABLE_THEMES[currentThemeIndex];
        
        themeOptions.forEach(option => {
            const theme = option.dataset.theme;
            option.classList.toggle('active', theme === currentTheme);
        });
    }
    
    // 🔥 기존 toggleTheme 함수 확장 (순환 방식)
    window.toggleTheme = function() {
        currentThemeIndex = (currentThemeIndex + 1) % AVAILABLE_THEMES.length;
        const newTheme = AVAILABLE_THEMES[currentThemeIndex];
        
        applyTheme(newTheme);
        updateThemeIcon();
        updateThemeOptions();
        
        console.log('테마 변경:', newTheme);
        showThemeToast(newTheme);
    };
    
    // 특정 테마로 직접 변경 (사이드바 옵션용)
    window.setTheme = function(themeName) {
        const themeIndex = AVAILABLE_THEMES.indexOf(themeName);
        if (themeIndex === -1) return;
        
        currentThemeIndex = themeIndex;
        applyTheme(themeName);
        updateThemeIcon();
        updateThemeOptions();
        closeSidebar(); // 테마 변경 후 사이드바 자동 닫기
        
        console.log('테마 설정:', themeName);
        showThemeToast(themeName);
    };
    
    // 사이드바 열기/닫기 전역 함수
    window.openSidebar = openSidebar;
    window.closeSidebar = closeSidebar;
    
    // 테마 변경 토스트
    function showThemeToast(themeName) {
        const themeNames = {
            'dark': '다크 모드',
            'light': '라이트 모드', 
            'blue': '블루 모드'
        };
        
        const message = `${themeNames[themeName] || themeName}로 변경되었습니다`;
        
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        // 새 토스트 생성
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 애니메이션
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // 사이드바 테마 옵션 클릭 이벤트
    function setupThemeOptions() {
        document.addEventListener('click', function(e) {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const theme = themeOption.dataset.theme;
                if (AVAILABLE_THEMES.includes(theme)) {
                    setTheme(theme);
                }
            }
        });
    }
    
    // 현재 테마 정보 반환
    window.getCurrentTheme = function() {
        return AVAILABLE_THEMES[currentThemeIndex];
    };
    
    window.getAvailableThemes = function() {
        return [...AVAILABLE_THEMES];
    };
    
    // 초기화 함수
    function initialize() {
        initThemes();
        setupThemeOptions();
        console.log('테마 확장 시스템 로드 완료');
        console.log('사용법: toggleTheme(), setTheme("blue"), openSidebar(), closeSidebar()');
    }
    
    // DOM 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
