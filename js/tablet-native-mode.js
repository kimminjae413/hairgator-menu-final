// ========== HAIRGATOR 태블릿 네이티브앱 모드 ==========
console.log('🖥️ 태블릿 네이티브앱 모드 초기화...');

class TabletNativeMode {
    constructor() {
        this.isTablet = this.detectTablet();
        this.isFromOmyApp = this.detectOmyAppSource();
        
        this.init();
    }
    
    detectTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const maxDimension = Math.max(screenWidth, screenHeight);
        
        return (
            maxDimension >= 768 &&
            (userAgent.includes('ipad') || 
             userAgent.includes('tablet') ||
             maxDimension >= 1024)
        );
    }
    
    detectOmyAppSource() {
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer.toLowerCase();
        
        return (
            urlParams.get('source') === 'omyapp' ||
            urlParams.get('utm_source') === 'omyapp' ||
            referrer.includes('omyapp') ||
            window.parent !== window
        );
    }
    
    init() {
        console.log('📱 디바이스 정보:', {
            isTablet: this.isTablet,
            isFromOmyApp: this.isFromOmyApp,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            isPWA: window.matchMedia('(display-mode: fullscreen)').matches
        });
        
        // 항상 적용되는 기본 최적화
        this.applyBasicOptimizations();
        
        if (this.isTablet) {
            this.enableTabletMode();
        }
        
        if (this.isFromOmyApp) {
            this.enableOmyAppMode();
        }
    }
    
    applyBasicOptimizations() {
        // 1. 풀스크린 강제 요청
        this.requestFullscreen();
        
        // 2. 주소창 숨기기
        this.hideAddressBar();
        
        // 3. 확대/축소 방지
        this.preventZoom();
        
        // 4. 네이티브앱 스타일 적용
        this.applyNativeStyles();
    }
    
    enableTabletMode() {
        console.log('🖥️ 태블릿 모드 활성화');
        
        document.documentElement.classList.add('tablet-mode');
        
        // 가로 방향 권장 (강제 불가능한 경우 대비)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape-primary').catch(() => {
                console.log('화면 회전 잠금 불가 (정상)');
            });
        }
    }
    
    enableOmyAppMode() {
        console.log('📱 오마이앱 연동 모드 활성화');
        
        document.documentElement.classList.add('omyapp-mode');
        
        // 오마이앱 통신 설정
        this.setupOmyAppCommunication();
        
        // 뒤로가기 버튼 처리
        window.addEventListener('popstate', () => {
            this.sendToOmyApp('back_button_pressed');
        });
    }
    
    requestFullscreen() {
        // 사용자 상호작용 후 풀스크린 요청
        const tryFullscreen = () => {
            const elem = document.documentElement;
            
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        };
        
        // 첫 번째 터치/클릭 시 풀스크린 요청
        document.addEventListener('touchstart', tryFullscreen, { once: true });
        document.addEventListener('click', tryFullscreen, { once: true });
    }
    
    hideAddressBar() {
        // 모바일 브라우저 주소창 숨기기 기법들
        const hideBar = () => {
            setTimeout(() => {
                window.scrollTo(0, 1);
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 50);
            }, 100);
        };
        
        window.addEventListener('load', hideBar);
        window.addEventListener('orientationchange', hideBar);
        window.addEventListener('resize', hideBar);
        
        // iOS Safari 전용
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            setTimeout(hideBar, 500);
        }
    }
    
    preventZoom() {
        // 핀치 줌 방지
        document.addEventListener('touchstart', (event) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // 더블탭 줌 방지
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 키보드 줌 방지
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && (event.key === '+' || event.key === '-' || event.key === '0')) {
                event.preventDefault();
            }
        });
    }
    
    applyNativeStyles() {
        const nativeCSS = document.createElement('style');
        nativeCSS.id = 'native-app-styles';
        nativeCSS.textContent = `
            /* 기본 네이티브앱 스타일 */
            html, body {
                overflow: hidden !important;
                position: fixed !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* 컨텍스트 메뉴, 선택, 드래그 비활성화 */
            * {
                -webkit-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            /* 태블릿 모드 전용 */
            .tablet-mode {
                width: 100vw !important;
                height: 100vh !important;
            }
            
            .tablet-mode body {
                width: 100vw !important;
                height: 100vh !important;
                overflow: hidden !important;
            }
            
            /* 오마이앱 모드 전용 */
            .omyapp-mode {
                background: #000 !important;
            }
            
            .omyapp-mode body {
                background: #000 !important;
            }
            
            /* PWA 풀스크린 모드 감지 */
            @media (display-mode: fullscreen) {
                html, body {
                    width: 100vw !important;
                    height: 100vh !important;
                    overflow: hidden !important;
                }
            }
        `;
        document.head.appendChild(nativeCSS);
        
        // 이벤트 비활성화
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('dragstart', (e) => e.preventDefault());
        document.addEventListener('selectstart', (e) => e.preventDefault());
    }
    
    setupOmyAppCommunication() {
        // 오마이앱으로 메시지 전송 함수
        window.sendToOmyApp = (action, data = {}) => {
            const message = {
                type: 'HAIRGATOR_MESSAGE',
                action: action,
                data: data,
                timestamp: Date.now()
            };
            
            // PostMessage (iframe)
            if (window.parent !== window) {
                window.parent.postMessage(message, '*');
            }
            
            // Android WebView
            if (window.Android && window.Android.receiveMessage) {
                window.Android.receiveMessage(JSON.stringify(message));
            }
            
            // iOS WebView
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.omyapp) {
                window.webkit.messageHandlers.omyapp.postMessage(message);
            }
            
            console.log('📤 오마이앱으로 메시지 전송:', message);
        };
        
        // 오마이앱에서 메시지 수신
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'OMYAPP_MESSAGE') {
                console.log('📥 오마이앱으로부터 메시지:', event.data);
                this.handleOmyAppMessage(event.data);
            }
        });
        
        // 로드 완료 알림
        window.addEventListener('load', () => {
            this.sendToOmyApp('hairgator_loaded', {
                url: window.location.href,
                mode: 'fullscreen_ready'
            });
        });
    }
    
    handleOmyAppMessage(message) {
        switch (message.action) {
            case 'force_fullscreen':
                this.requestFullscreen();
                break;
            case 'hide_ui':
                document.body.classList.add('hide-all-ui');
                break;
            case 'show_ui':
                document.body.classList.remove('hide-all-ui');
                break;
        }
    }
    
    sendToOmyApp(action, data = {}) {
        if (window.sendToOmyApp) {
            window.sendToOmyApp(action, data);
        }
    }
}

// 즉시 초기화
const tabletNativeMode = new TabletNativeMode();

// 전역 노출 (디버깅용)
window.tabletNativeMode = tabletNativeMode;

console.log('✅ 태블릿 네이티브앱 모드 초기화 완료!');
