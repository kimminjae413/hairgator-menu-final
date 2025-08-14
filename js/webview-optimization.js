// ========== HAIRGATOR 웹뷰 최적화 시스템 ==========
console.log('📱 웹뷰 최적화 시스템 초기화...');

class WebViewOptimizer {
    constructor() {
        this.isWebView = this.detectWebView();
        this.isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.originalHeight = window.innerHeight;
        
        this.init();
    }
    
    detectWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // 일반적인 웹뷰 감지
        const webViewIndicators = [
            'wv',              // Android WebView
            'webview',         // 일반 웹뷰
            'omyapp',          // 오마이앱
            'kakaotalk',       // 카카오톡
            'naver',           // 네이버 앱
            'instagram',       // 인스타그램
            'fbav',            // 페이스북
            'line'             // 라인
        ];
        
        const isWebViewUA = webViewIndicators.some(indicator => 
            userAgent.includes(indicator)
        );
        
        // JavaScript API로 웹뷰 감지
        const isWebViewAPI = (
            window.ReactNativeWebView ||
            window.webkit?.messageHandlers ||
            window.Android ||
            window.flutter_inappwebview ||
            document.URL.indexOf('http://') === -1 && 
            document.URL.indexOf('https://') === -1
        );
        
        return isWebViewUA || isWebViewAPI || window.parent !== window;
    }
    
    init() {
        console.log('🔍 웹뷰 환경 감지:', {
            isWebView: this.isWebView,
            isIOS: this.isIOS,
            isAndroid: this.isAndroid,
            userAgent: navigator.userAgent
        });
        
        if (this.isWebView) {
            this.applyWebViewOptimizations();
        }
        
        if (this.isIOS) {
            this.applyIOSFixes();
        }
        
        if (this.isAndroid) {
            this.applyAndroidFixes();
        }
        
        this.setupGeneralOptimizations();
    }
    
    applyWebViewOptimizations() {
        console.log('🌐 웹뷰 최적화 적용');
        
        document.documentElement.classList.add('webview-mode');
        
        // 웹뷰 전용 CSS
        const webViewCSS = document.createElement('style');
        webViewCSS.textContent = `
            .webview-mode {
                /* 웹뷰에서 성능 최적화 */
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
            }
            
            .webview-mode body {
                /* 웹뷰 스크롤 최적화 */
                -webkit-overflow-scrolling: touch;
                overflow-scrolling: touch;
            }
            
            .webview-mode * {
                /* 웹뷰 터치 최적화 */
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
            }
        `;
        document.head.appendChild(webViewCSS);
        
        // 웹뷰 성능 최적화
        this.optimizeWebViewPerformance();
    }
    
    applyIOSFixes() {
        console.log('🍎 iOS 웹뷰 최적화 적용');
        
        // 1. iOS 뷰포트 높이 문제 해결
        this.fixIOSViewportHeight();
        
        // 2. iOS 바운스 스크롤 비활성화
        this.disableIOSBounce();
        
        // 3. iOS Safe Area 대응
        this.handleIOSSafeArea();
        
        // 4. iOS 키보드 대응
        this.handleIOSKeyboard();
    }
    
    applyAndroidFixes() {
        console.log('🤖 Android 웹뷰 최적화 적용');
        
        // 1. Android 키보드 문제 해결
        this.fixAndroidKeyboard();
        
        // 2. Android 성능 최적화
        this.optimizeAndroidPerformance();
        
        // 3. Android 뒤로가기 처리
        this.handleAndroidBackButton();
    }
    
    fixIOSViewportHeight() {
        // iOS 웹뷰에서 100vh 문제 해결
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
        
        // CSS에서 사용: height: calc(var(--vh, 1vh) * 100)
        const iosVHCSS = document.createElement('style');
        iosVHCSS.textContent = `
            .ios-vh-fix {
                height: calc(var(--vh, 1vh) * 100) !important;
                min-height: calc(var(--vh, 1vh) * 100) !important;
            }
        `;
        document.head.appendChild(iosVHCSS);
        
        document.body.classList.add('ios-vh-fix');
    }
    
    disableIOSBounce() {
        // iOS 바운스 스크롤 비활성화
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        
        // 추가 바운스 방지
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            const target = e.target.closest('.scrollable');
            if (!target && e.target !== document.body) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    handleIOSSafeArea() {
        // iOS Safe Area 대응
        const safeAreaCSS = document.createElement('style');
        safeAreaCSS.textContent = `
            .ios-safe-area {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }
            
            .ios-safe-area-top {
                padding-top: max(20px, env(safe-area-inset-top));
            }
            
            .ios-safe-area-bottom {
                padding-bottom: max(20px, env(safe-area-inset-bottom));
            }
        `;
        document.head.appendChild(safeAreaCSS);
    }
    
    handleIOSKeyboard() {
        // iOS 키보드 올라올 때 대응
        if (this.isIOS) {
            const originalViewHeight = window.visualViewport?.height || window.innerHeight;
            
            const handleKeyboard = () => {
                const currentHeight = window.visualViewport?.height || window.innerHeight;
                const heightDiff = originalViewHeight - currentHeight;
                
                if (heightDiff > 150) {
                    // 키보드 올라옴
                    document.body.classList.add('ios-keyboard-open');
                    document.body.style.height = `${currentHeight}px`;
                } else {
                    // 키보드 내려감
                    document.body.classList.remove('ios-keyboard-open');
                    document.body.style.height = '';
                }
            };
            
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleKeyboard);
            } else {
                window.addEventListener('resize', handleKeyboard);
            }
        }
    }
    
    fixAndroidKeyboard() {
        // Android 키보드 문제 해결
        let initialHeight = window.innerHeight;
        
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialHeight - currentHeight;
            
            if (heightDiff > 150) {
                // 키보드 올라옴
                document.body.classList.add('android-keyboard-open');
                document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
            } else {
                // 키보드 내려감
                document.body.classList.remove('android-keyboard-open');
                document.documentElement.style.removeProperty('--keyboard-height');
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Android 키보드 CSS
        const androidKeyboardCSS = document.createElement('style');
        androidKeyboardCSS.textContent = `
            .android-keyboard-open {
                height: calc(100vh - var(--keyboard-height, 0px)) !important;
            }
            
            .android-keyboard-open .container {
                height: calc(100vh - var(--keyboard-height, 0px)) !important;
                overflow-y: auto;
            }
        `;
        document.head.appendChild(androidKeyboardCSS);
    }
    
    optimizeAndroidPerformance() {
        // Android 웹뷰 성능 최적화
        
        // GPU 가속 강제 활성화
        document.body.style.transform = 'translateZ(0)';
        document.body.style.backfaceVisibility = 'hidden';
        
        // 스크롤 성능 최적화
        const smoothScrollCSS = document.createElement('style');
        smoothScrollCSS.textContent = `
            * {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
                -webkit-backface-visibility: hidden;
                backface-visibility: hidden;
            }
        `;
        document.head.appendChild(smoothScrollCSS);
    }
    
    handleAndroidBackButton() {
        // Android 뒤로가기 버튼 처리
        window.addEventListener('popstate', (event) => {
            // 오마이앱으로 뒤로가기 신호 전송
            if (window.sendToOmyApp) {
                window.sendToOmyApp('back_button_pressed');
            }
            
            // 또는 현재 페이지에서 처리
            if (window.location.pathname === '/') {
                // 메인 페이지에서 뒤로가기 시 앱 종료 요청
                if (window.sendToOmyApp) {
                    window.sendToOmyApp('close_app_request');
                }
            }
        });
    }
    
    optimizeWebViewPerformance() {
        // 웹뷰 공통 성능 최적화
        
        // 1. 이미지 로딩 최적화
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });
        
        // 2. 터치 이벤트 최적화
        document.addEventListener('touchstart', () => {}, { passive: true });
        document.addEventListener('touchmove', () => {}, { passive: true });
        
        // 3. 스크롤 성능 최적화
        const scrollElements = document.querySelectorAll('.scrollable, .menu-grid');
        scrollElements.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowScrolling = 'touch';
        });
    }
    
    setupGeneralOptimizations() {
        // 모든 웹뷰 환경 공통 최적화
        
        // 1. 더블탭 줌 방지
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 2. 선택 및 컨텍스트 메뉴 방지
        document.addEventListener('selectstart', (e) => e.preventDefault());
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 3. 웹뷰 상태 모니터링
        this.monitorWebViewState();
    }
    
    monitorWebViewState() {
        // 웹뷰 상태 모니터링 및 로깅
        const logWebViewState = () => {
            console.log('📊 웹뷰 상태:', {
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                devicePixelRatio: window.devicePixelRatio,
                orientation: screen.orientation?.angle || 'unknown',
                online: navigator.onLine,
                memory: performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 'unknown'
            });
        };
        
        // 초기 상태 로그
        logWebViewState();
        
        // 상태 변화 감지
        window.addEventListener('resize', logWebViewState);
        window.addEventListener('orientationchange', logWebViewState);
        window.addEventListener('online', logWebViewState);
        window.addEventListener('offline', logWebViewState);
    }
}

// 웹뷰 최적화 즉시 초기화
const webViewOptimizer = new WebViewOptimizer();

// 전역 노출 (디버깅용)
window.webViewOptimizer = webViewOptimizer;

console.log('✅ 웹뷰 최적화 시스템 초기화 완료!');
