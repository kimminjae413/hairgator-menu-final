// 🎨 HAIRGATOR - 테마 확장 시스템 (main.js와 안전하게 연동)

(function() {
    'use strict';
    
    // 🔧 확장 가능한 테마 레지스트리
    const THEME_REGISTRY = {
        // 기본 테마들
        dark: {
            name: '다크 모드',
            icon: '🌙',
            className: '',  // 기본값이므로 클래스 없음
            category: 'basic'
        },
        light: {
            name: '라이트 모드',
            icon: '☀️',
            className: 'light-theme',
            category: 'basic'
        },
        
        // 컬러 테마들
        blue: {
            name: '블루 모드',
            icon: '🌊',
            className: 'blue-theme',
            category: 'color'
        },
        purple: {
            name: '퍼플 모드',
            icon: '🔮',
            className: 'purple-theme',
            category: 'color'
        },
        green: {
            name: '그린 모드',
            icon: '🌿',
            className: 'green-theme',
            category: 'color'
        },
        
        // 시즌 테마들 (나중에 추가 예정)
        autumn: {
            name: '가을 테마',
            icon: '🍂',
            className: 'autumn-theme',
            category: 'seasonal',
            season: [9, 10, 11] // 9월, 10월, 11월
        },
        winter: {
            name: '겨울 테마',
            icon: '❄️',
            className: 'winter-theme',
            category: 'seasonal',
            season: [12, 1, 2] // 12월, 1월, 2월
        }
    };
    
    // 현재 활성화된 테마들 (관리자가 조절 가능)
    let enabledThemes = ['dark', 'light', 'blue', 'purple', 'green'];
    
    // 현재 테마 상태
    let currentTheme = 'dark';
    
    // 🎯 초기화 함수
    function initThemeExtension() {
        // 저장된 테마 복원
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (enabledThemes.includes(savedTheme)) {
            currentTheme = savedTheme;
        }
        
        applyTheme(currentTheme);
        createThemeSelector();
        updateThemeButtons();
        
        console.log('🎨 테마 확장 시스템 초기화 완료');
        console.log('현재 테마:', currentTheme);
        console.log('활성 테마들:', enabledThemes);
    }
    
    // 🎨 테마 적용 함수
    function applyTheme(themeName) {
        const theme = THEME_REGISTRY[themeName];
        if (!theme) {
            console.error('알 수 없는 테마:', themeName);
            return;
        }
        
        // 모든 테마 클래스 제거
        Object.values(THEME_REGISTRY).forEach(t => {
            if (t.className) {
                document.body.classList.remove(t.className);
            }
        });
        
        // 새 테마 클래스 추가
        if (theme.className) {
            document.body.classList.add(theme.className);
        }
        
        // 성별 클래스 보존 (매우 중요!)
        preserveGenderClass();
        
        // 메타 테마 컬러 업데이트
        updateMetaThemeColor(themeName);
        
        // 로컬 스토리지 저장
        localStorage.setItem('hairgator_theme', themeName);
        currentTheme = themeName;
        
        console.log('테마 적용:', theme.name);
    }
    
    // 🔄 성별 클래스 보존 (핵심!)
    function preserveGenderClass() {
        const savedGender = localStorage.getItem('selectedGender');
        if (savedGender) {
            document.body.classList.remove('gender-male', 'gender-female');
            document.body.classList.add(`gender-${savedGender}`);
        }
    }
    
    // 📱 메타 테마 컬러 업데이트
    function updateMetaThemeColor(themeName) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const colors = {
                'dark': '#000000',
                'light': '#ffffff',
                'blue': '#0d1421',
                'purple': '#1a0d1a',
                'green': '#0d1410',
                'autumn': '#2d1810',
                'winter': '#0d1a2d'
            };
            metaThemeColor.setAttribute('content', colors[themeName] || '#000000');
        }
    }
    
    // 🎛️ 사이드바에 테마 선택기 생성
    function createThemeSelector() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        // 기존 테마 섹션 제거
        const existingThemeSection = sidebar.querySelector('.theme-section');
        if (existingThemeSection) {
            existingThemeSection.remove();
        }
        
        // 새 테마 섹션 생성
        const themeSection = document.createElement('div');
        themeSection.className = 'theme-section';
        themeSection.innerHTML = `
            <h5>🎨 테마 선택</h5>
            <div class="theme-options"></div>
        `;
        
        // 사이드바에 추가 (사용자 정보 다음에)
        const userInfo = sidebar.querySelector('.user-info');
        if (userInfo) {
            userInfo.insertAdjacentElement('afterend', themeSection);
        } else {
            sidebar.appendChild(themeSection);
        }
        
        // 테마 옵션들 생성
        const themeOptions = themeSection.querySelector('.theme-options');
        enabledThemes.forEach(themeKey => {
            const theme = THEME_REGISTRY[themeKey];
            if (!theme) return;
            
            // 시즌 테마 체크
            if (theme.season && !isSeasonActive(theme.season)) {
                return; // 시즌이 아니면 표시 안함
            }
            
            const option = document.createElement('div');
            option.className = `theme-option ${themeKey === currentTheme ? 'active' : ''}`;
            option.dataset.theme = themeKey;
            option.innerHTML = `
                <div class="theme-preview ${themeKey}">
                    <span class="theme-icon">${theme.icon}</span>
                </div>
                <span class="theme-name">${theme.name}</span>
            `;
            
            // 클릭 이벤트
            option.addEventListener('click', () => {
                setTheme(themeKey);
            });
            
            themeOptions.appendChild(option);
        });
    }
    
    // 📅 시즌 활성화 체크
    function isSeasonActive(seasonMonths) {
        const currentMonth = new Date().getMonth() + 1; // 0-11을 1-12로 변환
        return seasonMonths.includes(currentMonth);
    }
    
    // 🔘 기존 테마 버튼들 업데이트
    function updateThemeButtons() {
        const theme = THEME_REGISTRY[currentTheme];
        
        // 테마 아이콘 업데이트
        const themeIcons = document.querySelectorAll('.theme-icon-display');
        themeIcons.forEach(icon => {
            if (icon) icon.textContent = theme.icon;
        });
        
        // 테마 상태 업데이트 (다크모드 ON/OFF)
        const themeStatus = document.getElementById('themeStatus');
        if (themeStatus) {
            themeStatus.textContent = currentTheme === 'dark' ? 'ON' : 'OFF';
        }
        
        // 사이드바 테마 옵션 업데이트
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            const theme = option.dataset.theme;
            option.classList.toggle('active', theme === currentTheme);
        });
    }
    
    // 🎯 전역 함수들 (main.js와 연동)
    window.setTheme = function(themeName) {
        if (!enabledThemes.includes(themeName)) {
            console.error('비활성화된 테마:', themeName);
            return;
        }
        
        applyTheme(themeName);
        updateThemeButtons();
        
        // 사이드바 닫기
        const closeSidebar = window.closeSidebar;
        if (closeSidebar) closeSidebar();
        
        // 토스트 표시
        showThemeToast(themeName);
    };
    
    // main.js의 toggleTheme 함수 확장
    const originalToggleTheme = window.toggleTheme;
    window.toggleTheme = function() {
        const currentIndex = enabledThemes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % enabledThemes.length;
        const nextTheme = enabledThemes[nextIndex];
        
        setTheme(nextTheme);
    };
    
    // 🍞 테마 변경 토스트
    function showThemeToast(themeName) {
        const theme = THEME_REGISTRY[themeName];
        const message = `${theme.icon} ${theme.name}로 변경되었습니다`;
        
        // 기존 토스트 제거
        const existingToast = document.querySelector('.theme-toast');
        if (existingToast) existingToast.remove();
        
        // 새 토스트 생성
        const toast = document.createElement('div');
        toast.className = 'theme-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 애니메이션
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // 🛠️ 관리자 기능들
    window.addNewTheme = function(themeKey, themeConfig) {
        THEME_REGISTRY[themeKey] = themeConfig;
        enabledThemes.push(themeKey);
        createThemeSelector();
        console.log('새 테마 추가:', themeConfig.name);
    };
    
    window.toggleThemeAvailability = function(themeKey, enabled) {
        if (enabled && !enabledThemes.includes(themeKey)) {
            enabledThemes.push(themeKey);
        } else if (!enabled) {
            enabledThemes = enabledThemes.filter(t => t !== themeKey);
        }
        createThemeSelector();
        console.log(`테마 ${enabled ? '활성화' : '비활성화'}:`, themeKey);
    };
    
    window.getThemeInfo = function(themeName) {
        return THEME_REGISTRY[themeName] || null;
    };
    
    window.getCurrentTheme = function() {
        return currentTheme;
    };
    
    window.getAllThemes = function() {
        return { ...THEME_REGISTRY };
    };
    
    // 🚀 초기화 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeExtension);
    } else {
        initThemeExtension();
    }
    
    console.log('🎨 HAIRGATOR 테마 확장 시스템 로드 완료');
    console.log('사용법: setTheme("blue"), toggleTheme(), addNewTheme()');
    
})();
