/**
 * 🌸 HAIRGATOR 벚꽃 배경 시스템
 * 태블릿/데스크톱 전용 (768px 이상)
 * 벚꽃 배경만 제공
 */

class BackgroundManager {
    constructor() {
        this.currentBackground = 'none';
        this.isTabletMode = window.innerWidth >= 768;
        
        if (this.isTabletMode) {
            this.init();
        }
        
        console.log('🌸 HAIRGATOR 벚꽃 배경 매니저 초기화 완료');
    }
    
    init() {
        this.createBackgroundSelector();
        this.loadSavedBackground();
        this.setupThemeChangeListener();
        this.setupTabClickFix();
        
        // 리사이즈 감지
        window.addEventListener('resize', this.debounce(() => {
            this.isTabletMode = window.innerWidth >= 768;
            if (!this.isTabletMode) {
                this.removeExistingBackground();
                this.removeBackgroundSelector();
            } else if (!document.querySelector('.background-section')) {
                this.createBackgroundSelector();
            }
        }, 300));
    }
    
    createBackgroundSelector() {
        if (!this.isTabletMode) return;
        
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.log('⚠️ 사이드바를 찾을 수 없습니다');
            return;
        }
        
        // 기존 배경 섹션 제거
        this.removeBackgroundSelector();
        
        const backgroundSection = document.createElement('div');
        backgroundSection.className = 'background-section';
        backgroundSection.style.cssText = `
            margin: 20px 0;
            padding: 20px 0;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
        `;
        
        backgroundSection.innerHTML = `
            <h3 style="color: #FF1493; margin-bottom: 15px; font-size: 16px;">
                🌸 벚꽃 배경 (태블릿 전용)
            </h3>
            <div class="background-options" style="display: flex; gap: 10px;">
                <button class="background-option" data-bg="none" style="
                    padding: 10px 15px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                    flex: 1;
                ">
                    🌑 기본
                </button>
                <button class="background-option" data-bg="sakura" style="
                    padding: 10px 15px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s;
                    flex: 1;
                ">
                    🌸 벚꽃
                </button>
            </div>
        `;
        
        // 사이드바 컨텐츠에 추가
        const sidebarContent = sidebar.querySelector('.sidebar-content');
        if (sidebarContent) {
            sidebarContent.appendChild(backgroundSection);
            this.setupBackgroundButtons();
            console.log('✅ 벚꽃 배경 UI 생성 완료');
        }
    }
    
    setupBackgroundButtons() {
        document.querySelectorAll('.background-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const bgType = e.target.dataset.bg;
                this.changeBackground(bgType);
                console.log(`🌸 배경 선택: ${bgType}`);
            });
            
            // 호버 효과
            button.addEventListener('mouseenter', (e) => {
                if (e.target.dataset.bg !== this.currentBackground) {
                    e.target.style.background = '#3a3a3a';
                    e.target.style.transform = 'translateY(-1px)';
                }
            });
            
            button.addEventListener('mouseleave', (e) => {
                if (e.target.dataset.bg !== this.currentBackground) {
                    e.target.style.background = '#2a2a2a';
                    e.target.style.transform = 'translateY(0)';
                }
            });
        });
    }
    
    changeBackground(type) {
        if (!this.isTabletMode) return;
        
        this.removeExistingBackground();
        this.currentBackground = type;
        
        if (type === 'none') {
            this.updateActiveButton('none');
            localStorage.setItem('hairgator_background', 'none');
            return;
        }
        
        if (type === 'sakura') {
            this.createSakuraBackground();
        }
        
        this.updateActiveButton(type);
        localStorage.setItem('hairgator_background', type);
        
        console.log(`✅ 벚꽃 배경 적용: ${type}`);
    }
    
    createSakuraBackground() {
        const isLightTheme = document.body.classList.contains('light-theme');
        let backgroundCSS = '';
        
        if (isLightTheme) {
            // 라이트 모드 - 따뜻한 봄날 벚꽃
            backgroundCSS = `
                .hairgator-sakura-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, 
                        #fef7f7 0%, 
                        #fce4ec 25%, 
                        #f8bbd9 50%, 
                        #f48fb1 75%, 
                        #f06292 100%);
                    z-index: -1;
                    pointer-events: none;
                    overflow: hidden;
                }
                
                .hairgator-sakura-background::before {
                    content: '';
                    position: absolute;
                    top: -10%;
                    left: -10%;
                    width: 120%;
                    height: 120%;
                    background: 
                        radial-gradient(4px 4px at 30px 40px, rgba(233, 30, 99, 0.6), transparent),
                        radial-gradient(6px 6px at 80px 20px, rgba(233, 30, 99, 0.4), transparent),
                        radial-gradient(3px 3px at 150px 90px, rgba(233, 30, 99, 0.5), transparent),
                        radial-gradient(5px 5px at 200px 130px, rgba(233, 30, 99, 0.3), transparent);
                    background-repeat: repeat;
                    background-size: 250px 180px;
                    animation: sakuraLightFall 12s linear infinite;
                }
                
                @keyframes sakuraLightFall {
                    0% { transform: translateY(-20px) rotate(0deg); opacity: 0.8; }
                    50% { transform: translateY(50vh) rotate(180deg); opacity: 0.6; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
                }
            `;
        } else {
            // 다크 모드 - 신비로운 밤 벚꽃
            backgroundCSS = `
                .hairgator-sakura-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, 
                        #0c0c0c 0%, 
                        #1a1a2e 25%, 
                        #16213e 50%, 
                        #0f3460 75%, 
                        #0e4b5a 100%);
                    z-index: -1;
                    pointer-events: none;
                    overflow: hidden;
                }
                
                .hairgator-sakura-background::before {
                    content: '';
                    position: absolute;
                    top: -10%;
                    left: -10%;
                    width: 120%;
                    height: 120%;
                    background: 
                        radial-gradient(5px 5px at 40px 50px, rgba(255, 107, 157, 0.9), transparent),
                        radial-gradient(3px 3px at 90px 30px, rgba(255, 143, 171, 0.7), transparent),
                        radial-gradient(7px 7px at 160px 80px, rgba(255, 168, 204, 0.8), transparent),
                        radial-gradient(4px 4px at 210px 120px, rgba(255, 107, 157, 0.6), transparent);
                    background-repeat: repeat;
                    background-size: 280px 180px;
                    animation: sakuraDarkFall 13s linear infinite;
                }
                
                @keyframes sakuraDarkFall {
                    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                    30% { transform: translateY(30vh) rotate(120deg); opacity: 0.8; }
                    70% { transform: translateY(70vh) rotate(240deg); opacity: 0.6; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0.2; }
                }
            `;
        }
        
        // CSS 적용
        const existingStyle = document.getElementById('hairgator-sakura-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'hairgator-sakura-style';
        style.textContent = backgroundCSS;
        document.head.appendChild(style);
        
        // 배경 요소 생성
        const bgElement = document.createElement('div');
        bgElement.className = 'hairgator-sakura-background';
        document.body.prepend(bgElement);
    }
    
    setupTabClickFix() {
        // 라이트 모드에서 탭 클릭 스타일 수정
        const observer = new MutationObserver(() => {
            const isLightTheme = document.body.classList.contains('light-theme');
            if (isLightTheme) {
                this.applyLightModeTransparency();
                this.fixTabClickStyles();
            }
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // 초기 적용
        if (document.body.classList.contains('light-theme')) {
            setTimeout(() => {
                this.applyLightModeTransparency();
                this.fixTabClickStyles();
            }, 100);
        }
    }
    
    applyLightModeTransparency() {
        const isLightTheme = document.body.classList.contains('light-theme');
        if (!isLightTheme) return;
        
        // 헤더 투명화
        const header = document.querySelector('.header');
        if (header) {
            header.style.cssText = `
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(20px) saturate(1.2) !important;
                border-bottom: none !important;
                box-shadow: none !important;
            `;
        }
        
        // 카테고리 영역 투명화
        const categoryTabsWrapper = document.querySelector('.category-tabs-wrapper');
        if (categoryTabsWrapper) {
            categoryTabsWrapper.style.cssText = `
                background: rgba(255, 255, 255, 0.1) !important;
                backdrop-filter: blur(10px) !important;
                border-bottom: none !important;
            `;
        }
        
        // 설명 영역 투명화
        const categoryDescription = document.querySelector('.category-description');
        if (categoryDescription) {
            categoryDescription.style.cssText = `
                background: rgba(255, 255, 255, 0.1) !important;
                color: #000 !important;
                text-shadow: 0 1px 3px rgba(255,255,255,0.8) !important;
                backdrop-filter: blur(8px) !important;
                border-bottom: none !important;
                font-weight: 600 !important;
            `;
        }
        
        // 서브카테고리 투명화
        const subcategoryWrapper = document.querySelector('.subcategory-wrapper');
        if (subcategoryWrapper) {
            subcategoryWrapper.style.cssText = `
                background: rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(5px) !important;
                border-bottom: none !important;
            `;
        }
    }
    
    fixTabClickStyles() {
        // 대분류 탭 클릭 이벤트 수정
        const categoryTabs = document.querySelectorAll('.category-tab:not(.help-tab)');
        categoryTabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', () => {
                categoryTabs.forEach(otherTab => {
                    otherTab.classList.remove('active');
                    otherTab.style.cssText = `
                        background: rgba(255, 255, 255, 0.2) !important;
                        color: #000 !important;
                        border: 1px solid rgba(255, 255, 255, 0.3) !important;
                        text-shadow: 0 1px 3px rgba(255,255,255,0.8) !important;
                        font-weight: bold !important;
                    `;
                });
                
                newTab.classList.add('active');
                newTab.style.cssText = `
                    background: rgba(74, 144, 226, 0.9) !important;
                    color: white !important;
                    border: 1px solid rgba(74, 144, 226, 1) !important;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
                    font-weight: bold !important;
                    box-shadow: 0 3px 12px rgba(74, 144, 226, 0.5) !important;
                    transform: translateY(-1px) !important;
                `;
            });
        });
        
        // 중분류 탭도 동일하게
        const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
        subcategoryTabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', () => {
                subcategoryTabs.forEach(otherTab => {
                    otherTab.classList.remove('active');
                    otherTab.style.cssText = `
                        background: rgba(255, 255, 255, 0.2) !important;
                        color: #000 !important;
                        border: 1px solid rgba(255, 255, 255, 0.3) !important;
                        text-shadow: 0 1px 2px rgba(255,255,255,0.8) !important;
                        font-weight: bold !important;
                    `;
                });
                
                newTab.classList.add('active');
                newTab.style.cssText = `
                    background: rgba(74, 144, 226, 0.9) !important;
                    color: white !important;
                    border: 1px solid rgba(74, 144, 226, 1) !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
                    font-weight: bold !important;
                    box-shadow: 0 2px 8px rgba(74, 144, 226, 0.4) !important;
                    transform: translateY(-1px) !important;
                `;
            });
        });
    }
    
    removeExistingBackground() {
        const existingStyle = document.getElementById('hairgator-sakura-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const existingBg = document.querySelector('.hairgator-sakura-background');
        if (existingBg) {
            existingBg.remove();
        }
    }
    
    removeBackgroundSelector() {
        const backgroundSection = document.querySelector('.background-section');
        if (backgroundSection) {
            backgroundSection.remove();
        }
    }
    
    loadSavedBackground() {
        const saved = localStorage.getItem('hairgator_background');
        if (saved && saved !== 'none') {
            this.changeBackground(saved);
        }
        this.updateActiveButton(saved || 'none');
    }
    
    setupThemeChangeListener() {
        const observer = new MutationObserver(() => {
            if (this.currentBackground === 'sakura') {
                // 테마가 변경되면 벚꽃 배경을 다시 로드
                this.createSakuraBackground();
            }
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    updateActiveButton(activeKey) {
        if (!this.isTabletMode) return;
        
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

// 🚀 자동 초기화 (태블릿에서만)
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth >= 768) {
        window.backgroundManager = new BackgroundManager();
        console.log('🌸 HAIRGATOR 벚꽃 배경 매니저 준비 완료!');
    }
});

// 윈도우 리사이즈 감지
window.addEventListener('resize', () => {
    const isTabletMode = window.innerWidth >= 768;
    
    if (isTabletMode && !window.backgroundManager) {
        window.backgroundManager = new BackgroundManager();
    } else if (!isTabletMode && window.backgroundManager) {
        window.backgroundManager.removeExistingBackground();
        window.backgroundManager.removeBackgroundSelector();
        window.backgroundManager = null;
    }
});

console.log('🌸 HAIRGATOR 벚꽃 배경 시스템 로드 완료');
