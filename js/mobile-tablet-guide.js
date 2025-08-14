// ========== HAIRGATOR 모바일 태블릿 가이드 시스템 - 최종 완성 버전 ==========
console.log('📱 모바일 태블릿 가이드 시스템 초기화...');

class MobileTabletModeGuide {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.notificationDismissed = localStorage.getItem('hairgator_tablet_notification_dismissed') === 'true';
        
        this.init();
    }
    
    detectMobile() {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const maxDimension = Math.max(screenWidth, screenHeight);
        return maxDimension < 768; // 768px 미만은 모바일
    }
    
    detectTablet() {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const maxDimension = Math.max(screenWidth, screenHeight);
        return maxDimension >= 768; // 768px 이상은 태블릿
    }
    
    init() {
        console.log('📱 태블릿 모드 가이드 상태:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            notificationDismissed: this.notificationDismissed
        });
        
        // 햄버거 메뉴에 태블릿 모드 버튼 추가
        this.addTabletModeButton();
        
        // 모바일에서만 푸시 알림 표시
        if (this.isMobile && !this.notificationDismissed) {
            setTimeout(() => {
                this.showPushNotification();
            }, 3000); // 3초 후 표시
        }
    }
    
    addTabletModeButton() {
        // 햄버거 메뉴 찾기 (사이드바 내부)
        const addButtonToSidebar = () => {
            const sidebarContent = document.querySelector('.sidebar-content');
            if (sidebarContent && !document.querySelector('.tablet-mode-btn')) {
                const tabletModeButton = document.createElement('div');
                tabletModeButton.className = 'tablet-mode-btn';
                tabletModeButton.innerHTML = `
                    <button class="sidebar-btn tablet-mode-trigger" onclick="window.mobileTabletGuide.showTabletGuide()">
                        <div class="sidebar-btn-content">
                            <span class="sidebar-btn-icon">🖥️</span>
                            <span class="sidebar-btn-text">태블릿 모드</span>
                        </div>
                        <span class="sidebar-btn-badge">NEW</span>
                    </button>
                `;
                
                // 테마 토글 위에 추가
                const themeToggle = sidebarContent.querySelector('.theme-toggle-wrapper');
                if (themeToggle) {
                    sidebarContent.insertBefore(tabletModeButton, themeToggle);
                } else {
                    sidebarContent.appendChild(tabletModeButton);
                }
                
                this.addSidebarStyles();
            }
        };
        
        // DOM이 로드된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addButtonToSidebar);
        } else {
            addButtonToSidebar();
        }
        
        // 동적으로 생성되는 경우를 위해 주기적으로 체크
        const checkInterval = setInterval(() => {
            if (document.querySelector('.sidebar-content') && !document.querySelector('.tablet-mode-btn')) {
                addButtonToSidebar();
                clearInterval(checkInterval);
            }
        }, 1000);
        
        // 10초 후 체크 중단
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    addSidebarStyles() {
        if (document.getElementById('tablet-mode-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'tablet-mode-styles';
        styles.textContent = `
            .tablet-mode-btn {
                margin-bottom: 20px;
            }
            
            .sidebar-btn {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: 1px solid rgba(102, 126, 234, 0.3);
                border-radius: 10px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }
            
            .sidebar-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            }
            
            .sidebar-btn-content {
                display: flex;
                align-items: center;
                flex: 1;
            }
            
            .sidebar-btn-icon {
                font-size: 20px;
                margin-right: 12px;
            }
            
            .sidebar-btn-text {
                font-size: 16px;
                font-weight: 600;
            }
            
            .sidebar-btn-badge {
                background: #FF1493;
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 3px 8px;
                border-radius: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            /* 푸시 알림 스타일 */
            .tablet-mode-notification {
                position: fixed;
                top: 20px;
                left: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transform: translateY(-100px);
                opacity: 0;
                animation: slideDown 0.5s forwards;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                flex: 1;
            }
            
            .notification-icon {
                font-size: 24px;
                margin-right: 12px;
            }
            
            .notification-text {
                flex: 1;
            }
            
            .notification-title {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 2px;
            }
            
            .notification-desc {
                font-size: 12px;
                opacity: 0.9;
                line-height: 1.3;
            }
            
            .notification-buttons {
                display: flex;
                gap: 8px;
                margin-left: 12px;
            }
            
            .notification-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .notification-btn-primary {
                background: white;
                color: #667eea;
            }
            
            .notification-btn-primary:hover {
                background: #f0f0f0;
            }
            
            .notification-btn-secondary {
                background: transparent;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.5);
            }
            
            .notification-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(-100px);
                    opacity: 0;
                }
            }
            
            @media (max-width: 480px) {
                .tablet-mode-notification {
                    left: 10px;
                    right: 10px;
                    padding: 14px 16px;
                }
                
                .notification-text {
                    font-size: 11px;
                }
                
                .notification-title {
                    font-size: 13px;
                }
                
                .notification-desc {
                    font-size: 11px;
                }
                
                .notification-buttons {
                    flex-direction: column;
                    gap: 4px;
                }
                
                .notification-btn {
                    padding: 5px 10px;
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    showPushNotification() {
        // 이미 알림이 있으면 표시하지 않음
        if (document.querySelector('.tablet-mode-notification')) return;
        
        const notification = document.createElement('div');
        notification.className = 'tablet-mode-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🖥️</div>
                <div class="notification-text">
                    <div class="notification-title">태블릿에서 더 크고 예쁘게 보세요!</div>
                    <div class="notification-desc">태블릿에서 헤어스타일을 더 크고 선명하게 보실 수 있어요</div>
                </div>
            </div>
            <div class="notification-buttons">
                <button class="notification-btn notification-btn-primary" onclick="window.mobileTabletGuide.showTabletGuide()">
                    보기
                </button>
                <button class="notification-btn notification-btn-secondary" onclick="window.mobileTabletGuide.dismissNotification()">
                    다시 보지 않기
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 10초 후 자동 숨김
        setTimeout(() => {
            this.hideNotification();
        }, 10000);
    }
    
    dismissNotification() {
        localStorage.setItem('hairgator_tablet_notification_dismissed', 'true');
        this.notificationDismissed = true;
        this.hideNotification();
    }
    
    hideNotification() {
        const notification = document.querySelector('.tablet-mode-notification');
        if (notification) {
            notification.style.animation = 'slideUp 0.3s forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }
    
    showTabletGuide() {
        // 기존 알림 숨기기
        this.hideNotification();
        
        // 태블릿 가이드 모달 표시
        this.createTabletGuideModal();
    }
    
    createTabletGuideModal() {
        // 기존 모달 제거
        const existing = document.querySelector('.tablet-guide-overlay');
        if (existing) existing.remove();
        
        // 모달 CSS 추가
        this.addTabletGuideStyles();
        
        const modal = document.createElement('div');
        modal.className = 'tablet-guide-overlay';
        modal.innerHTML = `
            <div class="tablet-guide-modal">
                <div class="tablet-guide-header">
                    <span class="tablet-guide-icon">🖥️</span>
                    <h2 class="tablet-guide-title">태블릿 모드로 더 완벽하게!</h2>
                    <p class="tablet-guide-subtitle">태블릿에서 이 헤어스타일 메뉴를<br>📱크고 예쁘게📱 보실 수 있어요!</p>
                </div>
                
                <div class="tablet-guide-steps">
                    <div class="guide-step">
                        <div class="guide-step-number">1</div>
                        <div class="guide-step-content">
                            <div class="guide-step-title">태블릿에서 앱 찾기</div>
                            <div class="guide-step-desc">태블릿 화면에서 "HAIRGATOR" 앱을 찾아서 눌러주세요</div>
                        </div>
                        <div class="guide-step-icon">📱</div>
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-step-number">2</div>
                        <div class="guide-step-content">
                            <div class="guide-step-title">"헤어스타일 메뉴판" 누르기</div>
                            <div class="guide-step-desc">앱 안에서 크고 예쁜 "헤어스타일 메뉴판" 버튼을 눌러주세요</div>
                        </div>
                        <div class="guide-step-icon">💇‍♂️</div>
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-step-number">3</div>
                        <div class="guide-step-content">
                            <div class="guide-step-title">안내 따라하기</div>
                            <div class="guide-step-desc">화면에 나오는 친절한 안내를 차근차근 따라해주세요</div>
                        </div>
                        <div class="guide-step-icon">👆</div>
                    </div>
                    
                    <div class="guide-step">
                        <div class="guide-step-number">4</div>
                        <div class="guide-step-content">
                            <div class="guide-step-title">완성! 🎉</div>
                            <div class="guide-step-desc">이제 태블릿에서 크고 예쁘게 헤어스타일을 보실 수 있어요!</div>
                        </div>
                        <div class="guide-step-icon">✨</div>
                    </div>
                </div>
                
                <div class="tablet-guide-benefits">
                    <div class="benefits-title">🎯 태블릿에서 보면 이렇게 좋아요!</div>
                    <div class="benefits-grid">
                        <div class="benefit-item">
                            <div class="benefit-icon">🖥️</div>
                            <div class="benefit-text">큰 화면으로<br>헤어스타일이 더 잘 보여요</div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">✨</div>
                            <div class="benefit-text">화면이 깔끔하고<br>예뻐요</div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">⚡</div>
                            <div class="benefit-text">빠르고<br>부드러워요</div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">👀</div>
                            <div class="benefit-text">눈이 편하고<br>보기 쉬워요</div>
                        </div>
                    </div>
                </div>
                
                <div class="tablet-guide-buttons">
                    <button class="guide-btn guide-btn-primary" onclick="window.mobileTabletGuide.closeTabletGuide()">
                        알겠습니다! 😊
                    </button>
                </div>
                
                <div class="tablet-guide-footer">
                    💡 궁금한 점이 있으시면 언제든 우상단 메뉴를 눌러서<br>"🖥️ 태블릿 모드"를 다시 보실 수 있어요
                </div>
            </div>
        `;
        
        // 이벤트 리스너 추가
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTabletGuide();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    addTabletGuideStyles() {
        if (document.getElementById('tablet-guide-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'tablet-guide-styles';
        styles.textContent = `
            .tablet-guide-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                animation: fadeIn 0.5s forwards;
            }
            
            .tablet-guide-modal {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 40px 30px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                text-align: center;
                color: white;
                position: relative;
                transform: scale(0.8);
                animation: scaleIn 0.5s 0.2s forwards;
            }
            
            .tablet-guide-header {
                margin-bottom: 30px;
            }
            
            .tablet-guide-icon {
                font-size: 60px;
                margin-bottom: 15px;
                display: block;
            }
            
            .tablet-guide-title {
                font-size: 26px;
                font-weight: bold;
                margin-bottom: 12px;
                color: white;
            }
            
            .tablet-guide-subtitle {
                font-size: 17px;
                opacity: 0.9;
                line-height: 1.5;
            }
            
            .tablet-guide-steps {
                margin: 30px 0;
            }
            
            .guide-step {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                text-align: left;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .guide-step-number {
                background: white;
                color: #667eea;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                margin-right: 15px;
                flex-shrink: 0;
            }
            
            .guide-step-content {
                flex: 1;
            }
            
            .guide-step-title {
                font-size: 17px;
                font-weight: bold;
                margin-bottom: 6px;
                color: white;
            }
            
            .guide-step-desc {
                font-size: 15px;
                opacity: 0.85;
                line-height: 1.5;
            }
            
            .guide-step-icon {
                font-size: 24px;
                margin-left: 15px;
            }
            
            .tablet-guide-benefits {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                margin: 30px 0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .benefits-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #FFD700;
            }
            
            .benefits-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .benefit-item {
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
            }
            
            .benefit-icon {
                font-size: 28px;
                margin-bottom: 8px;
            }
            
            .benefit-text {
                font-size: 13px;
                line-height: 1.4;
                opacity: 0.9;
            }
            
            .tablet-guide-buttons {
                margin-top: 30px;
            }
            
            .guide-btn {
                padding: 16px 32px;
                border: none;
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .guide-btn-primary {
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
            }
            
            .guide-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
                background: linear-gradient(135deg, #45a049 0%, #4CAF50 100%);
            }
            
            .tablet-guide-footer {
                margin-top: 20px;
                font-size: 14px;
                opacity: 0.8;
                line-height: 1.5;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @media (max-width: 768px) {
                .tablet-guide-modal {
                    padding: 30px 20px;
                    margin: 10px;
                }
                
                .tablet-guide-title {
                    font-size: 22px;
                }
                
                .tablet-guide-subtitle {
                    font-size: 15px;
                }
                
                .guide-step {
                    padding: 15px;
                }
                
                .guide-step-title {
                    font-size: 15px;
                }
                
                .guide-step-desc {
                    font-size: 13px;
                }
                
                .benefits-grid {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }
                
                .benefit-text {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    closeTabletGuide() {
        const modal = document.querySelector('.tablet-guide-overlay');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
}

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.querySelector('.tablet-guide-overlay');
        if (modal && window.mobileTabletGuide) {
            window.mobileTabletGuide.closeTabletGuide();
        }
    }
});

// 모바일 태블릿 가이드 시스템 초기화
const mobileTabletGuide = new MobileTabletModeGuide();

// 전역 노출
window.mobileTabletGuide = mobileTabletGuide;

console.log('✅ 모바일 태블릿 모드 가이드 시스템 초기화 완료!');
