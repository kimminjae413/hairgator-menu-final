/**
 * 🌸 HAIRGATOR 배경 관리자 시스템
 * 태블릿/데스크톱 전용 (768px 이상)
 * 아름다운 벚꽃 배경 포함
 */

class BackgroundManager {
    constructor() {
        this.currentBackground = 'none';
        this.isTabletMode = window.innerWidth >= 768;
        
        if (this.isTabletMode) {
            this.init();
        }
        
        console.log('🎨 HAIRGATOR Background Manager initialized');
    }
    
    init() {
        this.createBackgroundSelector();
        this.loadSavedBackground();
        this.setupThemeChangeListener();
        
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
                🎨 배경 모드 (태블릿 전용)
            </h3>
            <div class="background-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="background-option" data-bg="none" style="
                    padding: 10px 8px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                ">
                    🌑 기본
                </button>
                <button class="background-option" data-bg="starry" style="
                    padding: 10px 8px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                ">
                    ✨ 별빛
                </button>
                <button class="background-option" data-bg="sakura" style="
                    padding: 10px 8px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                ">
                    🌸 벚꽃
                </button>
                <button class="background-option" data-bg="ocean" style="
                    padding: 10px 8px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                ">
                    🌊 바다
                </button>
                <button class="background-option" data-bg="particle" style="
                    padding: 10px 8px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                ">
                    🎆 파티클
                </button>
            </div>
        `;
        
        // 사이드바 컨텐츠에 추가
        const sidebarContent = sidebar.querySelector('.sidebar-content');
        if (sidebarContent) {
            sidebarContent.appendChild(backgroundSection);
            this.setupBackgroundButtons();
            console.log('✅ 배경 선택 UI 생성 완료');
        }
    }
    
    setupBackgroundButtons() {
        document.querySelectorAll('.background-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const bgType = e.target.dataset.bg;
                this.changeBackground(bgType);
                console.log(`🎨 배경 선택: ${bgType}`);
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
        
        // 인라인 배경 생성 (CSS 파일 없이도 작동)
        this.createInlineBackground(type);
        this.updateActiveButton(type);
        localStorage.setItem('hairgator_background', type);
        
        console.log(`✅ 배경 적용 완료: ${type}`);
    }
    
    createInlineBackground(type) {
        const isLightTheme = document.body.classList.contains('light-theme');
        let backgroundCSS = '';
        
        if (type === 'sakura') {
            if (isLightTheme) {
                // 라이트 모드 - 따뜻한 봄날 벚꽃
                backgroundCSS = `
                    .hairgator-background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, 
                            #ffeef5 0%, 
                            #ffe0e8 25%, 
                            #ffd0dd 50%, 
                            #ffb3c6 75%, 
                            #ffa8cc 100%);
                        z-index: -1;
                        pointer-events: none;
                        overflow: hidden;
                    }
                    
                    .hairgator-background::before {
                        content: '';
                        position: absolute;
                        top: -10%;
                        left: -10%;
                        width: 120%;
                        height: 120%;
                        background: 
                            radial-gradient(6px 6px at 30px 40px, rgba(255, 182, 193, 0.8), transparent),
                            radial-gradient(4px 4px at 80px 20px, rgba(255, 192, 203, 0.6), transparent),
                            radial-gradient(8px 8px at 150px 90px, rgba(255, 160, 180, 0.7), transparent),
                            radial-gradient(3px 3px at 200px 130px, rgba(255, 182, 193, 0.5), transparent),
                            radial-gradient(5px 5px at 60px 180px, rgba(255, 192, 203, 0.8), transparent);
                        background-repeat: repeat;
                        background-size: 300px 200px;
                        animation: sakuraLightFall 15s linear infinite;
                    }
                    
                    .hairgator-background::after {
                        content: '';
                        position: absolute;
                        top: -10%;
                        left: -10%;
                        width: 120%;
                        height: 120%;
                        background: 
                            radial-gradient(4px 4px at 70px 60px, rgba(255, 105, 180, 0.6), transparent),
                            radial-gradient(7px 7px at 130px 40px, rgba(255, 160, 180, 0.4), transparent),
                            radial-gradient(2px 2px at 180px 100px, rgba(255, 182, 193, 0.7), transparent),
                            radial-gradient(9px 9px at 20px 140px, rgba(255, 192, 203, 0.5), transparent);
                        background-repeat: repeat;
                        background-size: 250px 180px;
                        animation: sakuraLightSwirl 12s linear infinite;
                    }
                    
                    @keyframes sakuraLightFall {
                        0% { 
                            transform: translateY(-30px) rotate(0deg); 
                            opacity: 0.9; 
                        }
                        50% { 
                            transform: translateY(50vh) rotate(180deg); 
                            opacity: 0.7; 
                        }
                        100% { 
                            transform: translateY(100vh) rotate(360deg); 
                            opacity: 0.3; 
                        }
                    }
                    
                    @keyframes sakuraLightSwirl {
                        0% { 
                            transform: translateY(-20px) translateX(0) rotate(0deg); 
                            opacity: 0.8; 
                        }
                        25% { 
                            transform: translateY(25vh) translateX(20px) rotate(90deg); 
                            opacity: 0.6; 
                        }
                        75% { 
                            transform: translateY(75vh) translateX(-15px) rotate(270deg); 
                            opacity: 0.4; 
                        }
                        100% { 
                            transform: translateY(100vh) translateX(10px) rotate(360deg); 
                            opacity: 0.1; 
                        }
                    }
                `;
            } else {
                // 다크 모드 - 신비로운 밤 벚꽃
                backgroundCSS = `
                    .hairgator-background {
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
                    
                    .hairgator-background::before {
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
                            radial-gradient(4px 4px at 210px 120px, rgba(255, 107, 157, 0.6), transparent),
                            radial-gradient(6px 6px at 50px 170px, rgba(255, 143, 171, 0.9), transparent);
                        background-repeat: repeat;
                        background-size: 280px 180px;
                        animation: sakuraDarkFall 13s linear infinite;
                    }
                    
                    .hairgator-background::after {
                        content: '';
                        position: absolute;
                        top: -10%;
                        left: -10%;
                        width: 120%;
                        height: 120%;
                        background: 
                            radial-gradient(3px 3px at 80px 70px, rgba(255, 182, 193, 0.6), transparent),
                            radial-gradient(8px 8px at 140px 50px, rgba(255, 107, 157, 0.5), transparent),
                            radial-gradient(2px 2px at 190px 110px, rgba(255, 168, 204, 0.8), transparent),
                            radial-gradient(5px 5px at 30px 150px, rgba(255, 143, 171, 0.7), transparent);
                        background-repeat: repeat;
                        background-size: 220px 160px;
                        animation: sakuraDarkDrift 10s linear infinite;
                    }
                    
                    @keyframes sakuraDarkFall {
                        0% { 
                            transform: translateY(-20px) rotate(0deg); 
                            opacity: 1; 
                        }
                        30% { 
                            transform: translateY(30vh) rotate(120deg); 
                            opacity: 0.8; 
                        }
                        70% { 
                            transform: translateY(70vh) rotate(240deg); 
                            opacity: 0.6; 
                        }
                        100% { 
                            transform: translateY(100vh) rotate(360deg); 
                            opacity: 0.2; 
                        }
                    }
                    
                    @keyframes sakuraDarkDrift {
                        0% { 
                            transform: translateY(-15px) translateX(0) rotate(0deg); 
                            opacity: 0.9; 
                        }
                        40% { 
                            transform: translateY(40vh) translateX(30px) rotate(144deg); 
                            opacity: 0.7; 
                        }
                        80% { 
                            transform: translateY(80vh) translateX(-20px) rotate(288deg); 
                            opacity: 0.5; 
                        }
                        100% { 
                            transform: translateY(100vh) translateX(15px) rotate(360deg); 
                            opacity: 0.1; 
                        }
                    }
                `;
            }
        } else if (type === 'starry') {
            // 별빛 배경
            backgroundCSS = `
                .hairgator-background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: ${isLightTheme ? 
                        'linear-gradient(135deg, #e6f3ff 0%, #b3d9ff 50%, #80bfff 100%)' : 
                        'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)'};
                    z-index: -1;
                    pointer-events: none;
                }
                
                .hairgator-background::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: 
                        radial-gradient(2px 2px at 20px 30px, ${isLightTheme ? '#ffeb3b' : '#fff'}, transparent),
                        radial-gradient(1px 1px at 40px 70px, ${isLightTheme ? '#ff9800' : '#ffffcc'}, transparent),
                        radial-gradient(3px 3px at 90px 40px, ${isLightTheme ? '#ffc107' : '#fff'}, transparent);
                    background-repeat: repeat;
                    background-size: 200px 100px;
                    animation: ${isLightTheme ? 'starLight' : 'starTwinkle'} 3s linear infinite;
                }
                
                @keyframes starTwinkle {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                
                @keyframes starLight {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 0.4; }
                }
            `;
        }
        
        // CSS 적용
        const existingStyle = document.getElementById('hairgator-background-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = 'hairgator-background-style';
        style.textContent = backgroundCSS;
        document.head.appendChild(style);
        
        // 배경 요소 생성
        const bgElement = document.createElement('div');
        bgElement.className = 'hairgator-background';
        document.body.prepend(bgElement);
    }
    
    removeExistingBackground() {
        // 배경 스타일 제거
        const existingStyle = document.getElementById('hairgator-background-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // 배경 요소 제거
        const existingBg = document.querySelector('.hairgator-background');
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
            if (this.currentBackground !== 'none') {
                // 테마가 변경되면 현재 배경을 다시 로드
                this.changeBackground(this.currentBackground);
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

// 🚀 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth >= 768) {
        window.backgroundManager = new BackgroundManager();
        console.log('🌸 HAIRGATOR Background Manager ready!');
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

console.log('📁 HAIRGATOR Background Manager 스크립트 로드 완료');
