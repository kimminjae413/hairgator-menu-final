/* 🎨 HAIRGATOR - 기존 테마 토글에 추가 테마 확장 */

// 🔥 기존 toggleTheme 함수 확장 (기존 코드 유지하면서)
(function() {
    'use strict';
    
    // 사용 가능한 테마들
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
        
        console.log(`🎨 테마 시스템 초기화: ${savedTheme}`);
    }
    
    // 테마 적용 (기존 light-theme 클래스 유지하면서 확장)
    function applyTheme(themeName) {
        // 기존 테마 클래스들 제거
        document.body.classList.remove('light-theme', 'blue-theme', 'purple-theme', 'green-theme');
        
        // 새 테마 적용
        if (themeName === 'light') {
            document.body.classList.add('light-theme');
        } else if (themeName !== 'dark') {
            document.body.classList.add(`${themeName}-theme`);
        }
        
        // 메타 테마 색상 업데이트
        updateMetaThemeColor(themeName);
        
        // 로컬 스토리지에 저장
        localStorage.setItem('hairgator_theme', themeName);
    }
    
    // 테마 아이콘 업데이트
    function updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (!themeIcon) return;
        
        const icons = {
            'dark': '🌙',
            'light': '☀️', 
            'blue': '🌊'
        };
        
        const currentTheme = AVAILABLE_THEMES[currentThemeIndex];
        themeIcon.textContent = icons[currentTheme] || '🌙';
    }
    
    // 메타 테마 컬러 업데이트
    function updateMetaThemeColor(themeName) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) return;
        
        const colors = {
            'dark': '#000000',
            'light': '#ffffff',
            'blue': '#0d1421'
        };
        
        metaThemeColor.setAttribute('content', colors[themeName] || '#000000');
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
    
    // 🔥 기존 toggleTheme 함수를 확장 (순환 방식)
    window.toggleTheme = function() {
        currentThemeIndex = (currentThemeIndex + 1) % AVAILABLE_THEMES.length;
        const newTheme = AVAILABLE_THEMES[currentThemeIndex];
        
        applyTheme(newTheme);
        updateThemeIcon();
        updateThemeOptions();
        
        // 기존 themeStatus 업데이트 (호환성 유지)
        const themeStatus = document.getElementById('themeStatus');
        if (themeStatus) {
            themeStatus.textContent = newTheme === 'light' ? 'OFF' : 'ON';
        }
        
        console.log(`🎨 테마 변경: ${newTheme}`);
        
        // 토스트 메시지 표시
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
        
        // 기존 themeStatus 업데이트
        const themeStatus = document.getElementById('themeStatus');
        if (themeStatus) {
            themeStatus.textContent = themeName === 'light' ? 'OFF' : 'ON';
        }
        
        console.log(`🎨 테마 설정: ${themeName}`);
        showThemeToast(themeName);
    };
    
    // 테마 변경 토스트
    function showThemeToast(themeName) {
        const themeNames = {
            'dark': '다크 모드',
            'light': '라이트 모드', 
            'blue': '블루 모드'
        };
        
        // 기존 showToast 함수 사용 (있다면)
        if (typeof showToast === 'function') {
            showToast(`${themeNames[themeName] || themeName}로 변경되었습니다`, 'info');
        } else {
            // 간단한 토스트 구현
            const toast = document.getElementById('toast');
            if (toast) {
                toast.textContent = `${themeNames[themeName] || themeName}로 변경`;
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            }
        }
    }
    
    // 사이드바 테마 옵션 클릭 이벤트
    function setupThemeOptions() {
        document.addEventListener('click', function(e) {
            if (e.target.matches('.theme-option') || e.target.closest('.theme-option')) {
                const option = e.target.closest('.theme-option');
                const theme = option.dataset.theme;
                
                if (AVAILABLE_THEMES.includes(theme)) {
                    setTheme(theme);
                }
            }
        });
    }
    
    // 키보드 단축키 (Ctrl/Cmd + T)
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }
    
    // 시스템 테마 변경 감지 (optional)
    function setupSystemThemeDetection() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // 초기 설정이 없을 때만 시스템 테마 따라가기
            if (!localStorage.getItem('hairgator_theme')) {
                const systemTheme = mediaQuery.matches ? 'dark' : 'light';
                setTheme(systemTheme);
            }
            
            // 시스템 테마 변경 감지 (선택사항)
            mediaQuery.addEventListener('change', function(e) {
                // 자동 테마 설정이 활성화된 경우에만 반응
                const autoTheme = localStorage.getItem('hairgator_auto_theme');
                if (autoTheme === 'true') {
                    setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
    
    // 🔥 더 많은 테마 추가하는 방법 (확장용)
    window.addTheme = function(themeName, themeConfig) {
        if (!AVAILABLE_THEMES.includes(themeName)) {
            AVAILABLE_THEMES.push(themeName);
            console.log(`🎨 새 테마 추가: ${themeName}`);
            
            // 동적으로 CSS 생성 (optional)
            if (themeConfig) {
                createThemeCSS(themeName, themeConfig);
            }
        }
    };
    
    // 동적 CSS 생성 (향후 확장용)
    function createThemeCSS(themeName, config) {
        const style = document.createElement('style');
        style.id = `theme-${themeName}`;
        
        let css = `
            body.${themeName}-theme {
                background: ${config.background || '#000'};
                color: ${config.text || '#fff'};
            }
            body.${themeName}-theme .main-tab.active {
                background: ${config.accent || '#007bff'};
                border-color: ${config.accent || '#007bff'};
            }
        `;
        
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    // 현재 테마 정보 반환
    window.getCurrentTheme = function() {
        return AVAILABLE_THEMES[currentThemeIndex];
    };
    
    window.getAvailableThemes = function() {
        return [...AVAILABLE_THEMES];
    };
    
    // 초기화
    document.addEventListener('DOMContentLoaded', function() {
        initThemes();
        setupThemeOptions();
        setupKeyboardShortcuts();
        setupSystemThemeDetection();
        
        console.log('✅ 테마 확장 시스템 로드 완료');
        console.log('🎯 사용법: toggleTheme(), setTheme("blue"), getCurrentTheme()');
    });
    
    // 이미 DOM이 로드된 경우
    if (document.readyState !== 'loading') {
        initThemes();
        setupThemeOptions();
        setupKeyboardShortcuts();
        setupSystemThemeDetection();
    }

})();
