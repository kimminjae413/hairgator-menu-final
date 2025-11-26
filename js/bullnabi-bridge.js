// HAIRGATOR ↔ 불나비 네이티브 앱 연동 브릿지 - DynamicTokenService 통합 최종 버전
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
            const userToken = urlParams.get('token');
            
            if (userId) {
                console.log('🔍 URL에서 불나비 정보 발견:');
                console.log('- userId:', userId);
                console.log('- token:', userToken ? userToken.substring(0, 20) + '...' : 'null');
                
                this.performWebAutoLogin(userId, userToken);
            }
        },

        // 웹에서 직접 자동 로그인
        performWebAutoLogin(userId, userToken = null) {
            console.log('🚀 웹 자동 로그인 시작:');
            console.log('- userId:', userId);
            console.log('- userToken:', userToken ? '있음 (동적)' : '없음 (DynamicTokenService 사용)');
            
            // 네이티브 앱이 있으면 API 요청, 없으면 바로 로그인
            if (this.isInNativeApp()) {
                console.log('📱 네이티브 앱 환경 - API 요청');
                this.requestUserInfoFromNative(userId, userToken);
            } else {
                console.log('🌐 웹 브라우저 환경 - 직접 로그인');
                this.executeDirectLogin(userId, userToken);
            }
        },

        // 네이티브 앱 환경 체크
        isInNativeApp() {
            return !!(window.ReactNativeWebView || 
                     (window.parent !== window) ||
                     navigator.userAgent.includes('ReactNative'));
        },

        // ⭐ 웹에서 직접 로그인 실행 - DynamicTokenService 우선 사용
        async executeDirectLogin(userId, userToken = null) {
            console.log('🚀 실제 사용자 정보 조회 시작:');
            console.log('- userId:', userId);
            console.log('- userToken:', userToken ? '파라미터 토큰 있음' : '파라미터 토큰 없음');
            
            try {
                // ========== 1순위: DynamicTokenService 사용 (자동 갱신) ==========
                if (window.DynamicTokenService && !userToken) {
                    console.log('🔑 DynamicTokenService로 자동 로그인 시도...');
                    
                    try {
                        const userInfo = await DynamicTokenService.getUserCreditsWithDynamicToken(userId);
                        
                        if (userInfo) {
                            console.log('✅ DynamicTokenService로 사용자 정보 조회 성공');
                            
                            // DOM 로드 대기 후 로그인
                            if (document.readyState !== 'complete') {
                                window.addEventListener('load', () => {
                                    this.performLogin(userInfo);
                                });
                            } else {
                                setTimeout(() => {
                                    this.performLogin(userInfo);
                                }, 500);
                            }
                            return;
                        }
                    } catch (dynamicError) {
                        console.warn('⚠️ DynamicTokenService 실패, 기존 방식으로 폴백:', dynamicError.message);
                        // 폴백으로 계속 진행
                    }
                }

                // ========== 2순위: 기존 방식 (프록시 서버 직접 호출) ==========
                console.log('🔄 기존 프록시 서버 방식 사용');
                
                const response = await fetch('/.netlify/functions/bullnabi-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        userId: userId,
                        userToken: userToken
                    })
                });

                if (!response.ok) {
                    throw new Error(`프록시 서버 오류: ${response.status}`);
                }

                const result = await response.json();
                console.log('📋 프록시 서버 응답:', result);

                // 토큰 오류 처리
                if (!result.success && result.error === 'TOKEN_ERROR') {
                    console.error('🔑 토큰 오류 감지:', result.message);
                    
                    // 토큰 오류 알림
                    if (typeof showToast === 'function') {
                        showToast('토큰이 만료되었습니다. 다시 로그인해주세요.', 'error');
                    }
                    
                    // URL에서 토큰 파라미터 제거
                    const url = new URL(window.location);
                    url.searchParams.delete('token');
                    window.history.replaceState({}, '', url);
                    
                    throw new Error('토큰이 유효하지 않습니다');
                }

                if (result.success && result.userInfo) {
                    console.log('✅ 프록시 서버로 사용자 정보 조회 성공:', result.userInfo);
                    
                    // 토큰 소스 정보 로깅
                    if (result.debug) {
                        console.log('🔍 토큰 사용 정보:', result.debug.tokenSource);
                        console.log('🔍 동적 토큰 사용:', result.debug.usedDynamicToken);
                    }
                    
                    // DOM 로드 대기 후 로그인
                    if (document.readyState !== 'complete') {
                        window.addEventListener('load', () => {
                            this.performLogin(result.userInfo);
                        });
                    } else {
                        setTimeout(() => {
                            this.performLogin(result.userInfo);
                        }, 500);
                    }
                } else {
                    throw new Error('사용자 정보를 찾을 수 없습니다');
                }

            } catch (error) {
                console.error('❌ 사용자 정보 조회 실패:', error);
                
                // 토큰 오류가 아닌 경우에만 fallback 실행
                if (!error.message.includes('토큰')) {
                    console.log('🔄 테스트용 사용자 정보로 대체 로그인');
                    const fallbackUserInfo = {
                        id: userId,
                        name: '김민재 (테스트)',
                        email: 'kimmin@bullnabi.com',
                        remainCount: 25
                    };
                    
                    setTimeout(() => {
                        this.performLogin(fallbackUserInfo);
                    }, 500);
                }
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

        // 네이티브 앱에 사용자 정보 요청
        requestUserInfoFromNative(userId, userToken = null) {
            console.log('📱 네이티브 앱에 사용자 정보 요청:');
            console.log('- userId:', userId);  
            console.log('- userToken:', userToken ? '있음' : '없음');
            
            const requestData = {
                type: 'REQUEST_USER_INFO',
                userId: userId
            };
            
            // 토큰이 있으면 함께 전달
            if (userToken) {
                requestData.userToken = userToken;
            }
            
            // PostMessage로 네이티브 앱에 정보 요청
            if (window.parent !== window) {
                window.parent.postMessage(requestData, '*');
            }
            
            // ReactNative WebView 방식
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(requestData));
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
                            const credits = data.remainCount;
                            const displayCredits = Number.isInteger(credits) ? credits : credits.toFixed(1);
                            showToast(`크레딧이 업데이트되었습니다: ${displayCredits}`, 'info');
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
                
                // DynamicTokenService 캐시 클리어
                if (window.DynamicTokenService) {
                    DynamicTokenService.clearAllTokenCache();
                    console.log('🗑️ DynamicTokenService 캐시 클리어');
                }
                
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
            console.log('- DynamicTokenService:', !!window.DynamicTokenService ? '로드됨' : '미로드');
        },

        // ⭐ 수동 테스트용 함수들
        testAutoLogin(userId = '687ae7d51f31a788ab417e2d', userToken = null) {
            console.log('🧪 자동 로그인 테스트 시작:');
            console.log('- userId:', userId);
            console.log('- userToken:', userToken ? '사용' : '미사용');
            console.log('- DynamicTokenService:', !!window.DynamicTokenService ? '사용 가능' : '사용 불가');
            this.performWebAutoLogin(userId, userToken);
        },

        // ⭐ DynamicTokenService 테스트
        async testDynamicTokenService(userId = '687ae7d51f31a788ab417e2d') {
            if (!window.DynamicTokenService) {
                console.error('❌ DynamicTokenService가 로드되지 않았습니다');
                return;
            }

            console.log('🧪 DynamicTokenService 테스트 시작:');
            
            try {
                // 서비스 상태 확인
                const status = DynamicTokenService.getServiceStatus();
                console.log('📊 서비스 상태:', status);
                
                // 토큰 발급 테스트
                console.log('\n1️⃣ 토큰 발급 테스트...');
                const tokenResult = await DynamicTokenService.getUserToken(userId);
                console.log('토큰 발급 결과:', tokenResult);
                
                // 사용자 정보 조회 테스트
                console.log('\n2️⃣ 사용자 정보 조회 테스트...');
                const userInfo = await DynamicTokenService.getUserCreditsWithDynamicToken(userId);
                console.log('사용자 정보:', userInfo);
                
                // 캐시 확인
                console.log('\n3️⃣ 캐시 확인...');
                const cached = DynamicTokenService.getCachedToken(userId);
                console.log('캐시된 토큰:', cached ? cached.substring(0, 20) + '...' : null);
                
                console.log('\n✅ 모든 테스트 완료');
                
            } catch (error) {
                console.error('❌ 테스트 실패:', error);
            }
        },
        
        // 상태 조회
        getStatus() {
            return {
                isConnected: this.isConnected,
                lastHeartbeat: this.lastHeartbeat,
                isInNativeApp: this.isInNativeApp(),
                loginFunction: typeof window.loginWithBullnabi,
                dynamicTokenService: !!window.DynamicTokenService,
                dynamicTokenServiceStatus: window.DynamicTokenService ? 
                    DynamicTokenService.getServiceStatus() : null
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

    console.log('🌉 불나비 브릿지 모듈 로드 완료 - DynamicTokenService 통합');
    console.log('테스트: BullnabiBridge.testDynamicTokenService()');

})();
