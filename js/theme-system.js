// js/theme-system.js
// HAIRGATOR 테마 시스템 - 독립 JavaScript 모듈

class HairGatorThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.storageKey = 'hairgator_theme';
        this.validThemes = ['dark', 'luxury', 'minimal', 'warm'];
        this.isInitialized = false;
        
        // 테마별 설정
        this.themeConfig = {
            dark: {
                name: '다크',
                metaColor: '#000000',
                icon: '🌙'
            },
            luxury: {
                name: '럭셔리',
                metaColor: '#2c3e50',
                icon: '👑'
            },
            minimal: {
                name: '미니멀',
                metaColor: '#ffffff',
                icon: '⚪'
            },
            warm: {
                name: '따뜻한',
                metaColor: '#f4e4c1',
                icon: '🏠'
            }
        };
    }
    
    /**
     * 테마 시스템 초기화
     */
    init() {
        if (this.isInitialized) {
            console.warn('테마 시스템이 이미 초기화되었습니다.');
            return this;
        }
        
        // 저장된 테마 로드
        this.loadSavedTheme();
        
        // 테마 적용
        this.applyTheme(this.currentTheme);
        
        // 테마 버튼 이벤트 리스너 등록 (DOM이 로드된 후)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupThemeButtons();
            });
        } else {
            this.setupThemeButtons();
        }
        
        this.isInitialized = true;
        console.log(`🎨 HAIRGATOR 테마 시스템 초기화 완료: ${this.currentTheme}`);
        
        return this;
    }
    
    /**
     * 저장된 테마 로드
     */
    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme && this.isValidTheme(savedTheme)) {
                this.currentTheme = savedTheme;
                console.log(`💾 저장된 테마 로드: ${savedTheme}`);
            } else {
                console.log('🎨 기본 테마 사용: dark');
            }
        } catch (error) {
            console.warn('테마 로드 실패, 기본 테마 사용:', error);
            this.currentTheme = 'dark';
        }
    }
    
    /**
     * 유효한 테마인지 확인
     * @param {string} theme 
     * @returns {boolean}
     */
    isValidTheme(theme) {
        return this.validThemes.includes(theme);
    }
    
    /**
     * 테마 적용
     * @param {string} themeName 
     */
    applyTheme(themeName) {
        if (!this.isValidTheme(themeName)) {
            console.warn(`Invalid theme: ${themeName}, fallback to dark`);
            themeName = 'dark';
        }
        
        // body에 data-theme 속성 설정
        document.body.setAttribute('data-theme', themeName);
        
        // 현재 테마 업데이트
        this.currentTheme = themeName;
        
        // localStorage에 저장
        this.saveTheme(themeName);
        
        // 테마 버튼 활성화 상태 업데이트
        this.updateThemeButtons();
        
        // PWA 테마 컬러 업데이트
        this.updateMetaThemeColor(themeName);
        
        console.log(`🎨 테마 적용 완료: ${themeName}`);
        
        // 테마 변경 이벤트 발생
        this.dispatchThemeEvent(themeName);
    }
    
    /**
     * 테마를 localStorage에 저장
     * @param {string} themeName 
     */
    saveTheme(themeName) {
        try {
            localStorage.setItem(this.storageKey, themeName);
        } catch (error) {
            console.warn('테마 저장 실패:', error);
        }
    }
    
    /**
     * 테마 버튼 이벤트 리스너 설정
     */
    setupThemeButtons() {
        const themeButtons = document.querySelectorAll('.theme-btn');
        
        if (themeButtons.length === 0) {
            console.warn('테마 버튼을 찾을 수 없습니다. DOM 로드 후 다시 시도됩니다.');
            // DOM이 아직 완전히 로드되지 않았을 수 있으므로 잠시 후 재시도
            setTimeout(() => this.setupThemeButtons(), 1000);
            return;
        }
        
        themeButtons.forEach(button => {
            // 기존 이벤트 리스너 제거 (중복 방지)
            button.removeEventListener('click', this.handleThemeButtonClick);
            
            // 새로운 이벤트 리스너 추가
            button.addEventListener('click', (e) => this.handleThemeButtonClick(e));
        });
        
        console.log(`✅ ${themeButtons.length}개 테마 버튼 이벤트 설정 완료`);
    }
    
    /**
     * 테마 버튼 클릭 핸들러
     * @param {Event} e 
     */
    handleThemeButtonClick = (e) => {
        const button = e.currentTarget;
        const theme = button.getAttribute('data-theme');
        
        if (!theme || !this.isValidTheme(theme)) {
            console.error(`Invalid theme button: ${theme}`);
            return;
        }
        
        // 이미 현재 테마라면 무시
        if (theme === this.currentTheme) {
            return;
        }
        
        // 버튼 애니메이션
        this.animateButton(button);
        
        // 테마 변경
        this.changeTheme(theme);
        
        // 햅틱 피드백 (모바일)
        this.triggerHapticFeedback();
    }
    
    /**
     * 버튼 애니메이션
     * @param {HTMLElement} button 
     */
    animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    /**
     * 햅틱 피드백 트리거
     */
    triggerHapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    /**
     * 테마 버튼 상태 업데이트
     */
    updateThemeButtons() {
        const themeButtons = document.querySelectorAll('.theme-btn');
        
        themeButtons.forEach(button => {
            const theme = button.getAttribute('data-theme');
            
            if (theme === this.currentTheme) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * PWA 메타 테마 컬러 업데이트
     * @param {string} themeName 
     */
    updateMetaThemeColor(themeName) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const color = this.themeConfig[themeName]?.metaColor || this.themeConfig.dark.metaColor;
        
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        }
    }
    
    /**
     * 테마 변경 (전환 애니메이션 포함)
     * @param {string} themeName 
     */
    changeTheme(themeName) {
        if (themeName === this.currentTheme) {
            return;
        }
        
        // 테마 전환 애니메이션
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        
        setTimeout(() => {
            this.applyTheme(themeName);
            
            // 토스트 메시지 표시 (전역 showToast 함수가 있다면)
            if (typeof showToast === 'function') {
                const themeName_ko = this.themeConfig[themeName]?.name || themeName;
                showToast(`${themeName_ko} 테마가 적용되었습니다`, 'success');
            }
            
            // 전환 애니메이션 제거
            setTimeout(() => {
                document.body.style.transition = '';
            }, 300);
        }, 50);
    }
    
    /**
     * 테마 변경 이벤트 발생
     * @param {string} themeName 
     */
    dispatchThemeEvent(themeName) {
        const event = new CustomEvent('themeChanged', {
            detail: { 
                theme: themeName,
                config: this.themeConfig[themeName],
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 현재 테마 반환
     * @returns {string}
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * 테마 설정 정보 반환
     * @param {string} themeName 
     * @returns {object}
     */
    getThemeConfig(themeName = this.currentTheme) {
        return this.themeConfig[themeName] || this.themeConfig.dark;
    }
    
    /**
     * 모든 사용 가능한 테마 목록 반환
     * @returns {array}
     */
    getAvailableThemes() {
        return this.validThemes.map(theme => ({
            key: theme,
            ...this.themeConfig[theme]
        }));
    }
    
    /**
     * 테마 시스템 상태 확인
     * @returns {object}
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentTheme: this.currentTheme,
            availableThemes: this.validThemes.length,
            buttonsConnected: document.querySelectorAll('.theme-btn').length,
            storageAvailable: typeof Storage !== 'undefined'
        };
    }
    
    /**
     * 테마 미리 로드 (성능 최적화)
     */
    preloadThemes() {
        // CSS 변수들이 이미 정의되어 있으므로 별도 로드 불필요
        console.log('🎨 모든 테마가 CSS 변수로 미리 로드되어 있습니다');
    }
    
    /**
     * 디버그 모드 토글
     */
    toggleDebugMode() {
        const debugMode = localStorage.getItem('hairgator_theme_debug') === 'true';
        const newMode = !debugMode;
        
        localStorage.setItem('hairgator_theme_debug', newMode.toString());
        
        if (newMode) {
            console.log('🐛 테마 시스템 디버그 모드 활성화');
            console.table(this.getStatus());
        } else {
            console.log('🐛 테마 시스템 디버그 모드 비활성화');
        }
        
        return newMode;
    }
    
    /**
     * 테마 시스템 리셋
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        this.currentTheme = 'dark';
        this.applyTheme('dark');
        console.log('🔄 테마 시스템 리셋 완료');
    }
}

// 전역 테마 매니저 인스턴스 생성 및 자동 초기화
const themeManager = new HairGatorThemeManager().init();

// 전역 함수로 노출 (선택적)
window.HairGatorTheme = {
    manager: themeManager,
    changeTheme: (theme) => themeManager.changeTheme(theme),
    getCurrentTheme: () => themeManager.getCurrentTheme(),
    getStatus: () => themeManager.getStatus(),
    reset: () => themeManager.reset(),
    debug: () => themeManager.toggleDebugMode()
};

// 콘솔에서 사용할 수 있는 단축 명령어
console.log(`
🎨 HAIRGATOR 테마 시스템 로드 완료
   
📋 사용 가능한 명령어:
   HairGatorTheme.changeTheme('luxury')  - 테마 변경
   HairGatorTheme.getCurrentTheme()      - 현재 테마 확인
   HairGatorTheme.getStatus()            - 시스템 상태 확인
   HairGatorTheme.debug()                - 디버그 모드 토글
   HairGatorTheme.reset()                - 시스템 리셋
`);

export default themeManager;
