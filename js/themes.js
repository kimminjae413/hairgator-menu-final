/* ========================================
   HAIRGATOR - ULTRA MODERN THEME SYSTEM
   ======================================== */

class UltraThemeManager {
    constructor() {
        this.currentTheme = 'neon';
        this.themes = {
            neon: {
                name: '네온 다크',
                description: '사이버펑크 스타일의 미래형 다크 테마',
                icon: '⚡',
                preview: 'linear-gradient(45deg, #00f5ff, #ff0080)',
                category: 'dark'
            },
            luxury: {
                name: '럭셔리 골드',
                description: '고급스러운 프리미엄 다크 테마',
                icon: '👑',
                preview: 'linear-gradient(45deg, #d4af37, #1a1a1a)',
                category: 'dark'
            },
            minimal: {
                name: '미니멀 화이트',
                description: '깔끔한 현대적 라이트 테마',
                icon: '✨',
                preview: 'linear-gradient(45deg, #ffffff, #f8f9fa)',
                category: 'light'
            }
        };
        
        this.transitionDuration = 500;
        this.isTransitioning = false;
        this.observers = [];
        
        this.init();
    }
    
    init() {
        // 저장된 테마 로드 또는 기본값 설정
        this.currentTheme = this.getSavedTheme() || this.detectPreferredTheme();
        this.applyTheme(this.currentTheme, false);
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 테마 버튼들 초기화
        this.updateThemeButtons();
        
        // 시스템 다크모드 변경 감지
        this.watchSystemTheme();
        
        console.log('🎨 Ultra Theme Manager 초기화 완료:', this.currentTheme);
    }
    
    // 저장된 테마 가져오기
    getSavedTheme() {
        return localStorage.getItem('hairgator_theme');
    }
    
    // 사용자 시스템 선호도 감지
    detectPreferredTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        if (prefersHighContrast) {
            return 'minimal'; // 고대비 모드에서는 미니멀 테마
        }
        
        return prefersDark ? 'neon' : 'minimal';
    }
    
    // 테마 적용
    async applyTheme(themeName, animated = true) {
        if (this.isTransitioning || !this.themes[themeName]) {
            return false;
        }
        
        const previousTheme = this.currentTheme;
        
        if (animated) {
            this.isTransitioning = true;
            
            // 전환 애니메이션 시작
            document.body.classList.add('theme-transitioning');
            
            // 테마 전환 이펙트
            await this.playTransitionEffect(previousTheme, themeName);
        }
        
        // 테마 변경
        this.currentTheme = themeName;
        document.body.setAttribute('data-theme', themeName);
        
        // 테마 저장
        localStorage.setItem('hairgator_theme', themeName);
        
        // 메타 테마 컬러 업데이트
        this.updateMetaThemeColor();
        
        // 테마 버튼들 업데이트
        this.updateThemeButtons();
        
        // PWA 테마 색상 업데이트
        this.updatePWATheme();
        
        // 옵저버들에게 알림
        this.notifyObservers(themeName, previousTheme);
        
        if (animated) {
            // 전환 완료
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
                this.isTransitioning = false;
            }, this.transitionDuration);
        }
        
        console.log(`🎨 테마 변경: ${previousTheme} → ${themeName}`);
        return true;
    }
    
    // 테마 전환 이펙트
    async playTransitionEffect(fromTheme, toTheme) {
        return new Promise(resolve => {
            const effect = document.createElement('div');
            effect.className = 'theme-transition-effect';
            effect.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: ${this.themes[toTheme].preview};
                opacity: 0;
                z-index: 9998;
                pointer-events: none;
                border-radius: 0;
                transform: scale(0);
                transition: all ${this.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
            `;
            
            document.body.appendChild(effect);
            
            // 애니메이션 실행
            requestAnimationFrame(() => {
                effect.style.transform = 'scale(2)';
                effect.style.opacity = '0.8';
            });
            
            setTimeout(() => {
                effect.style.opacity = '0';
                effect.style.transform = 'scale(3)';
                
                setTimeout(() => {
                    effect.remove();
                    resolve();
                }, this.transitionDuration / 2);
            }, this.transitionDuration / 2);
        });
    }
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 테마 버튼들
        document.addEventListener('click', (e) => {
            const themeBtn = e.target.closest('[data-theme]');
            if (themeBtn && themeBtn.dataset.theme !== this.currentTheme) {
                const themeName = themeBtn.dataset.theme;
                if (this.themes[themeName]) {
                    this.applyTheme(themeName);
                    
                    // 햅틱 피드백 (지원하는 기기에서)
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }
        });
        
        // 키보드 단축키 (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.cycleTheme();
            }
        });
    }
    
    // 다음 테마로 순환
    cycleTheme() {
        const themeNames = Object.keys(this.themes);
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        const nextTheme = themeNames[nextIndex];
        
        this.applyTheme(nextTheme);
        
        // 토스트 알림
        this.showThemeToast(nextTheme);
    }
    
    // 테마 변경 토스트
    showThemeToast(themeName) {
        const theme = this.themes[themeName];
        const toast = document.createElement('div');
        toast.className = 'theme-toast';
        toast.innerHTML = `
            <div class="toast-icon">${theme.icon}</div>
            <div class="toast-content">
                <div class="toast-title">${theme.name}</div>
                <div class="toast-description">${theme.description}</div>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--accent-primary);
            border-radius: var(--border-radius-lg);
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: var(--shadow-xl), var(--glow-primary);
            backdrop-filter: var(--blur);
            z-index: 9999;
            transform: translateX(100%);
            transition: transform var(--transition);
            max-width: 320px;
            color: var(--text-primary);
        `;
        
        const iconStyle = `
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--accent-primary);
            border-radius: 50%;
        `;
        
        const titleStyle = `
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 0.2rem;
        `;
        
        const descStyle = `
            font-size: 0.8rem;
            color: var(--text-secondary);
            line-height: 1.3;
        `;
        
        toast.querySelector('.toast-icon').style.cssText = iconStyle;
        toast.querySelector('.toast-title').style.cssText = titleStyle;
        toast.querySelector('.toast-description').style.cssText = descStyle;
        
        document.body.appendChild(toast);
        
        // 애니메이션 실행
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        // 자동 제거
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // 테마 버튼들 업데이트
    updateThemeButtons() {
        document.querySelectorAll('[data-theme]').forEach(btn => {
            const themeName = btn.dataset.theme;
            const isActive = themeName === this.currentTheme;
            
            btn.classList.toggle('active', isActive);
            
            // 접근성 속성 업데이트
            btn.setAttribute('aria-pressed', isActive.toString());
            btn.setAttribute('aria-label', `${this.themes[themeName].name} 테마로 변경`);
        });
    }
    
    // 메타 테마 컬러 업데이트
    updateMetaThemeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        const colors = {
            neon: '#0f0f23',
            luxury: '#0a0a0a',
            minimal: '#ffffff'
        };
        
        if (meta) {
            meta.setAttribute('content', colors[this.currentTheme]);
        }
    }
    
    // PWA 테마 업데이트
    updatePWATheme() {
        // Apple 메타 태그들 업데이트
        const statusBarStyle = this.themes[this.currentTheme].category === 'dark' 
            ? 'black-translucent' 
            : 'default';
            
        const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (statusMeta) {
            statusMeta.setAttribute('content', statusBarStyle);
        }
    }
    
    // 시스템 테마 변경 감지
    watchSystemTheme() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        darkModeQuery.addEventListener('change', (e) => {
            // 사용자가 수동으로 테마를 변경하지 않은 경우에만 자동 변경
            if (!localStorage.getItem('hairgator_theme_manual')) {
                const newTheme = e.matches ? 'neon' : 'minimal';
                this.applyTheme(newTheme);
                console.log('🔄 시스템 테마 변경 감지:', newTheme);
            }
        });
    }
    
    // 수동 테마 변경 표시 (자동 시스템 테마 변경 방지)
    markAsManualChange() {
        localStorage.setItem('hairgator_theme_manual', 'true');
    }
    
    // 테마 정보 가져오기
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            info: this.themes[this.currentTheme]
        };
    }
    
    // 옵저버 패턴 구현
    subscribe(callback) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }
    
    notifyObservers(newTheme, oldTheme) {
        this.observers.forEach(callback => {
            try {
                callback(newTheme, oldTheme, this.themes[newTheme]);
            } catch (error) {
                console.error('테마 옵저버 에러:', error);
            }
        });
    }
    
    // 테마 미리보기 (실제 적용하지 않고 미리보기만)
    previewTheme(themeName, element = document.body) {
        if (!this.themes[themeName]) return false;
        
        const preview = element.cloneNode(true);
        preview.setAttribute('data-theme', themeName);
        preview.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9997;
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--transition);
        `;
        
        document.body.appendChild(preview);
        
        requestAnimationFrame(() => {
            preview.style.opacity = '0.8';
        });
        
        // 3초 후 자동 제거
        setTimeout(() => {
            preview.style.opacity = '0';
            setTimeout(() => preview.remove(), 300);
        }, 3000);
        
        return preview;
    }
    
    // 테마 내보내기/가져오기
    exportThemeSettings() {
        return {
            currentTheme: this.currentTheme,
            manual: localStorage.getItem('hairgator_theme_manual'),
            timestamp: Date.now()
        };
    }
    
    importThemeSettings(settings) {
        if (settings.currentTheme && this.themes[settings.currentTheme]) {
            this.applyTheme(settings.currentTheme, false);
            
            if (settings.manual) {
                localStorage.setItem('hairgator_theme_manual', settings.manual);
            }
            
            return true;
        }
        return false;
    }
    
    // 접근성 지원
    announceThemeChange(themeName) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = `테마가 ${this.themes[themeName].name}으로 변경되었습니다.`;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
    
    // 개발자 도구용 디버그 함수들
    debug() {
        return {
            currentTheme: this.currentTheme,
            isTransitioning: this.isTransitioning,
            themes: this.themes,
            observers: this.observers.length,
            savedTheme: this.getSavedTheme(),
            preferredTheme: this.detectPreferredTheme()
        };
    }
}

// 전역 테마 매니저 인스턴스
const ultraThemeManager = new UltraThemeManager();

// 전역 함수들
window.switchTheme = (themeName) => ultraThemeManager.applyTheme(themeName);
window.cycleTheme = () => ultraThemeManager.cycleTheme();
window.getCurrentTheme = () => ultraThemeManager.getCurrentTheme();
window.previewTheme = (themeName) => ultraThemeManager.previewTheme(themeName);

// 테마 변경 이벤트 리스너 (다른 스크립트에서 사용할 수 있도록)
window.onThemeChange = (callback) => ultraThemeManager.subscribe(callback);

// 개발자 콘솔에서 사용할 수 있도록
window.themeDebug = () => ultraThemeManager.debug();

// DOM 준비되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 테마 시스템 준비 완료');
    });
} else {
    console.log('🚀 테마 시스템 즉시 준비 완료');
}

// 성능 모니터링
console.log(`🎨 Ultra Theme Manager 로드 시간: ${performance.now().toFixed(2)}ms`);
