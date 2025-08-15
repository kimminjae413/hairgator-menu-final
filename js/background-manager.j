// HAIRGATOR 배경 관리자 - 태블릿 전용
class BackgroundManager {
    constructor() {
        this.isTabletMode = false;
        this.currentBackground = 'none';
        this.availableBackgrounds = [
            { id: 'none', name: '🌑 기본', darkCSS: null, lightCSS: null },
            { id: 'sakura', name: '🌸 벚꽃', darkCSS: 'sakura-dark.css', lightCSS: 'sakura-light.css' }
        ];
        
        this.init();
    }
    
    init() {
        this.checkScreenSize();
        this.setupResizeListener();
        this.loadSavedBackground();
        
        if (this.isTabletMode) {
            this.addBackgroundUI();
        }
        
        console.log('🎨 Background Manager initialized (Tablet only)');
    }
    
    // 화면 크기 확인
    checkScreenSize() {
        this.isTabletMode = window.innerWidth >= 768;
    }
    
    // 리사이즈 이벤트 리스너
    setupResizeListener() {
        window.addEventListener('resize', () => {
            const wasTabletMode = this.isTabletMode;
            this.checkScreenSize();
            
            if (wasTabletMode !== this.isTabletMode) {
                if (this.isTabletMode) {
                    this.addBackgroundUI();
                    this.loadSavedBackground();
                } else {
                    this.removeBackgroundUI();
                    this.removeActiveBackground();
                }
            }
        });
    }
    
    // 저장된 배경 로드
    loadSavedBackground() {
        if (!this.isTabletMode) return;
        
        const saved = localStorage.getItem('hairgator_background') || 'none';
        this.setBackground(saved);
    }
    
    // 사이드바에 배경 선택 UI 추가
    addBackgroundUI() {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent || document.getElementById('backgroundSection')) return;
        
        const backgroundSection = document.createElement('div');
        backgroundSection.id = 'backgroundSection';
        backgroundSection.innerHTML = `
            <div style="margin: 20px 0; padding: 20px 0; border-top: 1px solid #333; border-bottom: 1px solid #333;">
                <h4 style="color: #FF1493; margin-bottom: 15px; text-align: center;">
                    🎨 배경 모드 (태블릿 전용)
                </h4>
                <div id="backgroundOptions" style="display: flex; flex-direction: column; gap: 10px;">
                    ${this.availableBackgrounds.map(bg => `
                        <button 
                            onclick="window.backgroundManager.setBackground('${bg.id}')"
                            id="bg-${bg.id}"
                            style="
                                width: 100%; 
                                padding: 12px; 
                                background: #2a2a2a; 
                                color: white; 
                                border: 1px solid #444; 
                                border-radius: 8px; 
                                cursor: pointer; 
                                font-size: 14px; 
                                transition: all 0.3s;
                                text-align: center;
                            "
                            onmouseover="this.style.background='#3a3a3a'; this.style.borderColor='#666'"
                            onmouseout="this.style.background='#2a2a2a'; this.style.borderColor='#444'">
                            ${bg.name}
                        </button>
                    `).join('')}
                </div>
                <p style="color: #666; font-size: 11px; margin-top: 10px; text-align: center;">
                    모바일에서는 성능을 위해 비활성화됩니다
                </p>
            </div>
        `;
        
        sidebarContent.appendChild(backgroundSection);
        this.updateActiveButton();
    }
    
    // 배경 UI 제거
    removeBackgroundUI() {
        const section = document.getElementById('backgroundSection');
        if (section) {
            section.remove();
        }
    }
    
    // 배경 설정
    setBackground(backgroundId) {
        if (!this.isTabletMode) {
            console.log('🚫 Background disabled on mobile for performance');
            return;
        }
        
        const background = this.availableBackgrounds.find(bg => bg.id === backgroundId);
        if (!background) return;
        
        // 기존 배경 제거
        this.removeActiveBackground();
        
        // 새 배경 적용
        if (background.id !== 'none') {
            this.loadBackgroundCSS(background);
        }
        
        this.currentBackground = backgroundId;
        localStorage.setItem('hairgator_background', backgroundId);
        this.updateActiveButton();
        
        console.log(`🎨 Background set to: ${background.name}`);
    }
    
    // 배경 CSS 로드
    loadBackgroundCSS(background) {
        const isDarkTheme = !document.body.classList.contains('light-theme');
        const cssFile = isDarkTheme ? background.darkCSS : background.lightCSS;
        
        if (!cssFile) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `/backgrounds/${cssFile}`;
        link.id = 'background-css';
        link.onerror = () => {
            console.error(`Failed to load background CSS: ${cssFile}`);
            this.showBackgroundError();
        };
        
        document.head.appendChild(link);
        
        // 배경 컨테이너 추가
        setTimeout(() => {
            if (!document.querySelector('.background-container')) {
                const container = document.createElement('div');
                container.className = `background-container background-${background.id}-${isDarkTheme ? 'dark' : 'light'}`;
                document.body.prepend(container);
            }
        }, 100);
    }
    
    // 활성 배경 제거
    removeActiveBackground() {
        // CSS 링크 제거
        const existingCSS = document.getElementById('background-css');
        if (existingCSS) {
            existingCSS.remove();
        }
        
        // 배경 컨테이너 제거
        const container = document.querySelector('.background-container');
        if (container) {
            container.remove();
        }
    }
    
    // 활성 버튼 업데이트
    updateActiveButton() {
        this.availableBackgrounds.forEach(bg => {
            const button = document.getElementById(`bg-${bg.id}`);
            if (button) {
                if (bg.id === this.currentBackground) {
                    button.style.background = '#FF1493';
                    button.style.borderColor = '#FF1493';
                    button.style.color = 'white';
                } else {
                    button.style.background = '#2a2a2a';
                    button.style.borderColor = '#444';
                    button.style.color = 'white';
                }
            }
        });
    }
    
    // 배경 로드 에러 표시
    showBackgroundError() {
        if (typeof showToast === 'function') {
            showToast('배경 파일을 찾을 수 없습니다');
        } else {
            console.error('Background files not found');
        }
    }
    
    // 테마 변경 시 배경 업데이트
    onThemeChange() {
        if (this.currentBackground !== 'none' && this.isTabletMode) {
            this.setBackground(this.currentBackground);
        }
    }
}

// 전역 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    window.backgroundManager = new BackgroundManager();
});

// 테마 변경 감지
const originalToggle = themeManager?.toggle;
if (originalToggle) {
    themeManager.toggle = function() {
        originalToggle.call(this);
        window.backgroundManager?.onThemeChange();
    };
}
