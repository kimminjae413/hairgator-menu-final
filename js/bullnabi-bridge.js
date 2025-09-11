// HAIRGATOR ↔ 불나비 네이티브 앱 연동 브릿지 (웹 자동 로그인 버전)
// js/bullnabi-bridge.js

(function() {
    'use strict';

    console.log('🌉 불나비 브릿지 초기화 중...');

    // 불나비 연동 상태 관리
    const BullnabiBridge = {
        isConnected: false,
        lastHeartbeat: null,
        
        // 초기화
        init() {
            this.setupMessageListener();
            this.setupURLParamCheck();
            this.logConnectionInfo();
            console.log('✅ 불나비 브릿지 준비 완료');
        },

        // PostMessage 리스너 설정
        setupMessageListener() {
            window.addEventListener('message', (event) => {
                try {
                    console.log('📨 네이티브 앱 메시지 수신:', event.data);
                    
                    // 불나비 로그인 메시지 처리
                    if (event.data && event.data.type === 'BULLNABI_LOGIN') {
                        this.handleBullnabiLogin(event.data);
                    }
                    
                    // 크레딧 업데이트 메시지 처리
                    else if (event.data && event.data.type === 'BULLNABI_CREDIT_UPDATE') {
                        this.handleCreditUpdate(event.data);
                    }
                    
                    // 로그아웃 메시지 처리
                    else if (event.data && event.data.type === 'BULLNABI_LOGOUT') {
                        this.handleBullnabiLogout();
                    }
                    
                } catch (error) {
                    console.error('❌ 메시지 처리 실패:', error);
                }
            });
        },

        // URL 파라미터로 불나비 정보 확인 및 자동 로그인
        setupURLParamCheck() {
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            
            if (userId) {
                console.log('🔍 URL에서 불나비 사용자 ID 발견:', userId);
                
                // 웹에서는 바로 자동 로그인 처리 (네이티브 앱에서는 API 호출 후 PostMessage로 결과 전달)
                this.performWebAutoLogin(userId);
            }
        },

        // 웹에서 직접 자동 로그인 (CORS 때문에 가상 데이터 사용)
        performWebAutoLogin(userId) {
            console.log('🚀 웹 자동 로그인 시작:', userId);
            
            // 네이티브 앱이 있으면 API 요청, 없으면 바로 로그인
            if (this.isInNativeApp()) {
                console.log('📱 네이티브 앱 환경 - API 요청');
                this.requestUserInfoFromNative(userId);
            } else {
                console.log('🌐 웹 브라우저 환경 - 직접 로그인');
                this.executeDirectLogin(userId);
            }
        },

        // 네이티브 앱 환경 체크
        isInNativeApp() {
            return !!(window.ReactNativeWebView || 
                     (window.parent !== window) ||
                     navigator.userAgent.includes('ReactNative'));
        },

        // 웹에서 직접 로그인 실행
        executeDirectLogin(userId) {
            // 가상 사용자 정보 생성 (실제로는 네이티브 앱에서 API 호출 후 전달받을 데이터)
            const userInfo = {
                id: userId,
                name: '불나비 사용자',
                email: 'user@bullnabi.com',
                remainCount: 10
            };
            
            console.log('✨ 직접 로그인 실행:', userInfo);
            
            // DOM이 완전히 로드될 때까지 대기
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    this.performLogin(userInfo);
                });
            } else {
                // 약간의 딜레이를 두고 실행 (다른 스크립트 로딩 대기)
                setTimeout(() => {
                    this.performLogin(userInfo);
                }, 500);
            }
        },

        // 실제 로그인 처리
        performLogin(userInfo) {
            if (typeof window.loginWithBullnabi === 'function') {
                console.log('🎯 자동 로그인 함수 호출');
                window.loginWithBullnabi(userInfo);
                this.isConnected = true;
                this.lastHeartbeat = Date.now();
            } else {
                console.warn('⏳ loginWithBullnabi 함수 대기 중...');
                
                // 최대 5초까지 재시도
                let attempts = 0;
                const maxAttempts = 10;
                
                const retryLogin = () => {
                    attempts++;
                    
                    if (typeof window.loginWithBullnabi === 'function') {
                        console.log('🎯 자동 로그인 함수 호출 (재시도)');
                        window.loginWithBullnabi(userInfo);
                        this.isConnected = true;
                        this.lastHeartbeat = Date.now();
                    } else if (attempts < maxAttempts) {
                        setTimeout(retryLogin, 500);
                    } else {
                        console.error('❌ loginWithBullnabi 함수를 찾을 수 없습니다 (최대 재시도 초과)');
                    }
                };
                
                setTimeout(retryLogin, 500);
            }
        },

        // 네이티브 앱에 사용자 정보 요청 (CORS 우회)
        requestUserInfoFromNative(userId) {
            console.log('📱 네이티브 앱에 사용자 정보 요청:', userId);
            
            // PostMessage로 네이티브 앱에 정보 요청
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'REQUEST_USER_INFO',
                    userId: userId
                }, '*');
            }
            
            // ReactNative WebView 방식
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'REQUEST_USER_INFO',
                    userId: userId
                }));
            }
            
            console.log('📤 네이티브 앱에 사용자 정보 요청 완료');
        },

        // 불나비 로그인 처리 (PostMessage 수신)
        handleBullnabiLogin(data) {
            console.log('📥 불나비 로그인 처리 시작:', data);
            
            if (!data.userInfo) {
                console.error('❌ 사용자 정보가 없습니다');
                return;
            }

            this.performLogin(data.userInfo);
        },

        // 크레딧 업데이트 처리
        handleCreditUpdate(data) {
            console.log('💳 크레딧 업데이트:', data);
            
            try {
                // 불나비 사용자 정보 업데이트
                if (typeof window.getBullnabiUser === 'function') {
                    const bullnabiUser = window.getBullnabiUser();
                    if (bullnabiUser) {
                        bullnabiUser.remainCount = data.remainCount;
                        localStorage.setItem('bullnabi_user', JSON.stringify(bullnabiUser));
                        
                        // currentDesigner 업데이트
                        if (window.currentDesigner) {
                            window.currentDesigner.tokens = data.remainCount;
                        }
                        
                        // UI 업데이트
                        if (typeof updateUserInfo === 'function') {
                            updateUserInfo();
                        }
                        
                        // 토스트 알림
                        if (typeof showToast === 'function') {
                            showToast(`크레딧이 업데이트되었습니다: ${data.remainCount}개`, 'info');
                        }
                    }
                }
            } catch (error) {
                console.error('❌ 크레딧 업데이트 실패:', error);
            }
        },

        // 불나비 로그아웃 처리
        handleBullnabiLogout() {
            console.log('👋 불나비 로그아웃 처리');
            
            try {
                // 불나비 세션 정리
                localStorage.removeItem('bullnabi_user');
                localStorage.removeItem('bullnabi_login_time');
                
                // HAIRGATOR 로그아웃 처리
                if (typeof logout === 'function') {
                    logout();
                }
                
                this.isConnected = false;
                this.lastHeartbeat = null;
                
                if (typeof showToast === 'function') {
                    showToast('로그아웃되었습니다', 'info');
                }
                
            } catch (error) {
                console.error('❌ 로그아웃 처리 실패:', error);
            }
        },

        // 네이티브 앱에 메시지 전송
        sendToNative(message) {
            try {
                if (window.parent !== window) {
                    window.parent.postMessage(message, '*');
                }
                
                // ReactNative WebView 방식도 지원
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                }
                
                console.log('📤 네이티브 앱에 메시지 전송:', message);
            } catch (error) {
                console.error('❌ 네이티브 앱 메시지 전송 실패:', error);
            }
        },

        // AI 기능 사용 시 크레딧 차감 요청
        requestCreditDeduction(usageType, count) {
            this.sendToNative({
                type: 'DEDUCT_CREDIT',
                usageType: usageType, // 'image' or 'video'
                count: Math.abs(count), // 양수로 전송
                timestamp: Date.now()
            });
        },

        // 연결 상태 확인
        checkConnection() {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - (this.lastHeartbeat || 0);
            
            // 5분 이상 응답이 없으면 연결 끊어진 것으로 판단
            if (timeSinceLastHeartbeat > 5 * 60 * 1000) {
                this.isConnected = false;
            }
            
            return this.isConnected;
        },

        // 연결 정보 로깅
        logConnectionInfo() {
            console.log('🔗 불나비 브릿지 연결 정보:');
            console.log('- 현재 URL:', window.location.href);
            console.log('- User Agent:', navigator.userAgent);
            console.log('- Referrer:', document.referrer);
            console.log('- Parent Window:', window.parent !== window ? '있음' : '없음');
            console.log('- ReactNative WebView:', !!window.ReactNativeWebView);
        },

        // 수동 테스트용 함수들
        testAutoLogin(userId = '687ae7d51f31a788ab417e2d') {
            console.log('🧪 자동 로그인 테스트 시작:', userId);
            this.performWebAutoLogin(userId);
        },
        
        getStatus() {
            return {
                isConnected: this.isConnected,
                lastHeartbeat: this.lastHeartbeat,
                isInNativeApp: this.isInNativeApp(),
                loginFunction: typeof window.loginWithBullnabi
            };
        }
    };

    // 페이지 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BullnabiBridge.init();
        });
    } else {
        BullnabiBridge.init();
    }

    // 전역 접근을 위해 노출
    window.BullnabiBridge = BullnabiBridge;

    // 주기적 연결 상태 확인 (30초마다)
    setInterval(() => {
        BullnabiBridge.checkConnection();
    }, 30000);

    console.log('🌉 불나비 브릿지 모듈 로드 완료');

})();
