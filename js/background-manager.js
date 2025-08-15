// js/background-manager.js - 벚꽃 배경 추가된 태블릿 전용 배경 시스템
class BackgroundManager {
    constructor() {
        this.currentBackground = 'none';
        this.backgrounds = {
            none: { name: '기본', dark: '', light: '' },
            starry: { 
                name: '별빛', 
                dark: 'backgrounds/starry-night.css',
                light: 'backgrounds/aurora.css'
            },
            sakura: { 
                name: '벚꽃', 
                dark: 'backgrounds/sakura-dark.css',
                light: 'backgrounds/sakura-light.css'
            },
            ocean: { 
                name: '바다', 
                dark: 'backgrounds/ocean-dark.css',
                light: 'backgrounds/ocean-light.css'
            },
            particle: { 
                name: '파티클', 
                dark: 'backgrounds/particle-dark.css',
                light: 'backgrounds/particle-light.css'
            }
        };
        
        this.init();
    }
    
    init() {
        // 태블릿 이상에서만 실행
        if (this.isTabletOrDesktop()) {
            this.loadSavedBackground();
            this.createBackgroundSelector();
            this.setupEventListeners();
        }
    }
    
    // 디바이스 감지 - 768px 이상만 태블릿으로 간주
    isTabletOrDesktop() {
        return window.innerWidth >= 768;
    }
    
    // 모바일 감지
    isMobile() {
        return window.innerWidth < 768;
    }
    
    loadSavedBackground() {
        if (this.isMobile()) return;
        
        const saved = localStorage.getItem('hairgator_background') || 'none';
        this.setBackground(saved);
    }
    
    createBackgroundSelector() {
        if (this.isMobile()) return;
        
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) return;
        
        // 기존 배경 섹션이 있으면 제거
        const existingSection = sidebarContent.querySelector('.background-section');
        if (existingSection) {
            existingSection.remove();
        }
        
        const backgroundSection = document.createElement('div');
        backgroundSection.className = 'background-section';
        backgroundSection.innerHTML = `
            <div style="margin: 20px 0; padding: 20px 0; border-top: 1px solid #333; border-bottom: 1px solid #333;">
                <h4 style="color: #FF1493; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    🎨 배경 모드
                    <span style="font-size: 12px; color: #666; font-weight: normal;">(태블릿 전용)</span>
                </h4>
                <div id="backgroundOptions" style="display: grid; gap: 8px;">
                    ${Object.entries(this.backgrounds).map(([key, bg]) => `
                        <button class="background-option" data-bg="${key}" 
                                style="padding: 12px; background: #2a2a2a; color: white; 
                                       border: 1px solid #444; border-radius: 8px; cursor: pointer;
                                       transition: all 0.3s; text-align: left; display: flex;
                                       align-items: center; gap: 10px; position: relative;
                                       overflow: hidden;">
                            <span style="font-size: 18px; z-index: 2;">${this.getBackgroundIcon(key)}</span>
                            <span style="z-index: 2; font-weight: 500;">${bg.name}</span>
                            ${key === 'sakura' ? '<span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #ff69b4; z-index: 2;">NEW</span>' : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 얼굴분석 버튼 다음에 삽입
        const faceAnalysisSection = sidebarContent.querySelector('div[style*="border-top: 1px solid #333"]');
        if (faceAnalysisSection) {
            faceAnalysisSection.after(backgroundSection);
        } else {
            sidebarContent.appendChild(backgroundSection);
        }
        
        // 현재 선택된 배경 버튼 활성화
        this.updateActiveButton(this.currentBackground);
    }
    
    getBackgroundIcon(key) {
        const icons = {
            none: '🌑',
            starry: '✨',
            sakura: '🌸',
            ocean: '🌊',
            particle: '🎆'
        };
        return icons[key] || '🎨';
    }
    
    setupEventListeners() {
        if (this.isMobile()) return;
        
        // 배경 옵션 클릭 이벤트
        document.addEventListener('click', (e) => {
            if (this.isMobile()) return;
            
            if (e.target.classList.contains('background-option') || 
                e.target.closest('.background-option')) {
                const button = e.target.classList.contains('background-option') 
                    ? e.target 
                    : e.target.closest('.background-option');
                const bgKey = button.dataset.bg;
                this.setBackground(bgKey);
            }
        });
        
        // 테마 변경 시 배경 업데이트
        const observer = new MutationObserver(() => {
            if (!this.isMobile()) {
                this.updateBackgroundForTheme();
            }
        });
        observer.observe(document.body, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
        
        // 윈도우 리사이즈 이벤트
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 300));
    }
    
    handleResize() {
        if (this.isMobile()) {
            this.removeExistingBackground();
            this.removeBackgroundSelector();
        } else {
            this.createBackgroundSelector();
            this.updateBackgroundForTheme();
        }
    }
    
    removeBackgroundSelector() {
        const backgroundSection = document.querySelector('.background-section');
        if (backgroundSection) {
            backgroundSection.remove();
        }
    }
    
    setBackground(backgroundKey) {
        if (this.isMobile()) return;
        
        this.currentBackground = backgroundKey;
        localStorage.setItem('hairgator_background', backgroundKey);
        this.updateBackgroundForTheme();
        this.updateActiveButton(backgroundKey);
    }
    
    updateBackgroundForTheme() {
        if (this.isMobile()) return;
        
        // 기존 배경 제거
        this.removeExistingBackground();
        
        if (this.currentBackground === 'none') return;
        
        const isLightTheme = document.body.classList.contains('light-theme');
        const bgConfig = this.backgrounds[this.currentBackground];
        
        if (bgConfig) {
            const cssFile = isLightTheme ? bgConfig.light : bgConfig.dark;
            if (cssFile) {
                this.loadBackgroundCSS(cssFile);
                this.createBackgroundElements();
            }
        }
    }
    
    removeExistingBackground() {
        // CSS 제거
        const existingLink = document.querySelector('link[data-background-css]');
        if (existingLink) {
            existingLink.remove();
        }
        
        // 배경 요소 제거
        const existingBg = document.querySelector('[class*="background-"]');
        if (existingBg) {
            existingBg.remove();
        }
    }
    
    loadBackgroundCSS(cssFile) {
        if (this.isMobile()) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssFile;
        link.setAttribute('data-background-css', 'true');
        document.head.appendChild(link);
    }
    
    createBackgroundElements() {
        if (this.isMobile()) return;
        
        const isLightTheme = document.body.classList.contains('light-theme');
        let backgroundHTML = '';
        
        switch (this.currentBackground) {
            case 'starry':
                if (isLightTheme) {
                    backgroundHTML = `
                        <div class="background-aurora">
                            <div class="aurora-layer"></div>
                            <div class="aurora-layer"></div>
                            <div class="aurora-layer"></div>
                            <div class="floating-particles">
                                <div class="particle"></div>
                                <div class="particle"></div>
                                <div class="particle"></div>
                                <div class="particle"></div>
                                <div class="particle"></div>
                            </div>
                        </div>
                    `;
                } else {
                    backgroundHTML = `
                        <div class="background-starry-night">
                            <div class="stars">
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="star"></div>
                                <div class="shooting-star"></div>
                                <div class="shooting-star"></div>
                            </div>
                        </div>
                    `;
                }
                break;
                
            case 'sakura':
                if (isLightTheme) {
                    // 따뜻한 봄날 벚꽃
                    backgroundHTML = `
                        <div class="background-sakura-light">
                            <div class="sunlight"></div>
                            <div class="spring-breeze"></div>
                            <div class="petal-whirl"></div>
                            <div class="sakura-container-light">
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                                <div class="sakura-petal-light"></div>
                            </div>
                        </div>
                    `;
                } else {
                    // 밤하늘 벚꽃
                    backgroundHTML = `
                        <div class="background-sakura-dark">
                            <div class="moonlight"></div>
                            <div class="wind-effect"></div>
                            <div class="sakura-container">
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                                <div class="sakura-petal"></div>
                            </div>
                        </div>
                    `;
                }
                break;
                
            case 'ocean':
                if (isLightTheme) {
                    backgroundHTML = `
                        <div class="background-ocean-light">
                            <div class="light-wave"></div>
                            <div class="light-wave"></div>
                            <div class="light-wave"></div>
                            <div class="sparkle"></div>
                            <div class="sparkle"></div>
                            <div class="sparkle"></div>
                            <div class="sparkle"></div>
                        </div>
                    `;
                } else {
                    backgroundHTML = `
                        <div class="background-ocean-dark">
                            <div class="wave"></div>
                            <div class="wave"></div>
                            <div class="wave"></div>
                            <div class="bubble"></div>
                            <div class="bubble"></div>
                            <div class="bubble"></div>
                            <div class="bubble"></div>
                        </div>
                    `;
                }
                break;
                
            case 'particle':
                if (isLightTheme) {
                    backgroundHTML = `
                        <div class="background-particle-light">
                            <div class="light-particle-field">
                                <div class="light-energy-particle"></div>
                                <div class="light-energy-particle"></div>
                                <div class="light-energy-particle"></div>
                                <div class="light-energy-particle"></div>
                                <div class="light-energy-particle"></div>
                                <div class="soft-glow"></div>
                                <div class="soft-glow"></div>
                            </div>
                        </div>
                    `;
                } else {
                    backgroundHTML = `
                        <div class="background-particle-dark">
                            <div class="particle-field">
                                <div class="energy-particle"></div>
                                <div class="energy-particle"></div>
                                <div class="energy-particle"></div>
                                <div class="energy-particle"></div>
                                <div class="energy-particle"></div>
                                <div class="glow-orb"></div>
                                <div class="glow-orb"></div>
                            </div>
                        </div>
                    `;
                }
                break;
        }
        
        if (backgroundHTML) {
            document.body.insertAdjacentHTML('afterbegin', backgroundHTML);
        }
    }
    
    updateActiveButton(activeKey) {
        if (this.isMobile()) return;
        
        document.querySelectorAll('.background-option').forEach(btn => {
            if (btn.dataset.bg === activeKey) {
                btn.style.background = 'linear-gradient(45deg, #FF1493, #FF69B4)';
                btn.style.borderColor = '#FF1493';
                btn.style.boxShadow = '0 0 15px rgba(255, 20, 147, 0.3)';
                btn.style.transform = 'translateY(-2px)';
            } else {
                btn.style.background = '#2a2a2a';
                btn.style.borderColor = '#444';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'translateY(0)';
            }
        });
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 전역 변수로 등록 (태블릿에서만)
if (window.innerWidth >= 768) {
    window.backgroundManager = new BackgroundManager();
}

// 윈도우 리사이즈 시 BackgroundManager 생성/제거
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && !window.backgroundManager) {
        window.backgroundManager = new BackgroundManager();
    } else if (window.innerWidth < 768 && window.backgroundManager) {
        window.backgroundManager.removeExistingBackground();
        window.backgroundManager.removeBackgroundSelector();
        window.backgroundManager = null;
    }
});

/* CSS 추가 - 모바일에서 배경 효과 완전 차단 */
const mobileBlockCSS = `
    @media (max-width: 767px) {
        [class*="background-"] {
            display: none !important;
        }
        
        .background-section {
            display: none !important;
        }
    }
`;

// 스타일 태그로 CSS 추가
const styleTag = document.createElement('style');
styleTag.textContent = mobileBlockCSS;
document.head.appendChild(styleTag);
