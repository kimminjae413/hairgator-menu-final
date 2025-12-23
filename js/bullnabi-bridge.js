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
                    
                    // 토큰 업데이트 메시지 처리
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
            const self = this;

            const afterLogin = async () => {
                // 헤어게이터 토큰 잔액 조회 및 UI 업데이트
                const userId = userInfo.userId || userInfo.id;
                if (userId) {
                    try {
                        const tokenResult = await self.getTokenBalance(userId);
                        if (tokenResult.success) {
                            self.updateTokenDisplay(tokenResult.tokenBalance, tokenResult.plan);
                            // currentDesigner에도 저장
                            if (window.currentDesigner) {
                                window.currentDesigner.tokenBalance = tokenResult.tokenBalance;
                                window.currentDesigner.plan = tokenResult.plan;
                            }
                            console.log('💰 헤어게이터 토큰 로드 완료:', tokenResult.tokenBalance, '플랜:', tokenResult.plan);
                        }
                    } catch (e) {
                        console.warn('⚠️ 토큰 조회 실패:', e);
                    }
                }
            };

            if (typeof window.loginWithBullnabi === 'function') {
                console.log('🎯 자동 로그인 함수 호출');
                window.loginWithBullnabi(userInfo);
                this.isConnected = true;
                this.lastHeartbeat = Date.now();
                // 로그인 후 토큰 조회
                setTimeout(afterLogin, 500);
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
                        // 로그인 후 토큰 조회
                        setTimeout(afterLogin, 500);
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

        // 토큰 업데이트 처리
        handleCreditUpdate(data) {
            console.log('💳 토큰 업데이트:', data);
            
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
                            showToast(`토큰이 업데이트되었습니다: ${displayCredits}`, 'info');
                        }
                    }
                }
            } catch (error) {
                console.error('❌ 토큰 업데이트 실패:', error);
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

        // AI 기능 사용 시 토큰 차감 요청 (레거시 - 불나비 앱용)
        requestCreditDeduction(usageType, count) {
            this.sendToNative({
                type: 'DEDUCT_CREDIT',
                usageType: usageType, // 'image' or 'video'
                count: Math.abs(count), // 양수로 전송
                timestamp: Date.now()
            });
        },

        // ========== 헤어게이터 토큰 시스템 (Firebase user_tokens) ==========

        // 토큰 비용 상수
        TOKEN_COSTS: {
            lookbook: 200,
            hairTry: 350,
            chatbot: 10
        },

        // 토큰 잔액 조회 (클라이언트 측 Firebase 직접 사용)
        async getTokenBalance(userId) {
            try {
                if (!userId) {
                    const user = window.getBullnabiUser?.();
                    userId = user?.userId || user?.id;
                }

                if (!userId) {
                    console.error('❌ userId가 없습니다');
                    return { success: false, error: 'userId required' };
                }

                // 클라이언트 측 Firebase Firestore 직접 조회
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const doc = await db.collection('user_tokens').doc(userId).get();

                    if (doc.exists) {
                        const data = doc.data();
                        const balance = data.tokenBalance || 0;
                        console.log('💰 토큰 잔액 조회 (Firestore):', balance);
                        return { success: true, tokenBalance: balance, plan: data.plan || 'free' };
                    } else {
                        // 신규 사용자: 무료 200 토큰 지급
                        const FREE_INITIAL_TOKENS = 200;
                        console.log('🎁 신규 사용자 감지! 무료 토큰 지급:', FREE_INITIAL_TOKENS);

                        await db.collection('user_tokens').doc(userId).set({
                            tokenBalance: FREE_INITIAL_TOKENS,
                            plan: 'free',
                            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                        });

                        // 토큰 지급 로그 기록
                        await db.collection('token_logs').add({
                            userId: userId,
                            action: 'welcome_bonus',
                            tokensAdded: FREE_INITIAL_TOKENS,
                            previousBalance: 0,
                            newBalance: FREE_INITIAL_TOKENS,
                            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                            metadata: { reason: '신규 가입 무료 토큰' }
                        });

                        console.log('✅ 신규 사용자 토큰 지급 완료:', FREE_INITIAL_TOKENS);
                        return { success: true, tokenBalance: FREE_INITIAL_TOKENS, isNewUser: true, plan: 'free' };
                    }
                }

                // Firebase가 없으면 서버 API 폴백
                const response = await fetch('/.netlify/functions/token-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'getBalance',
                        userId: userId
                    })
                });

                const result = await response.json();
                console.log('💰 토큰 잔액 조회 (API):', result);
                return result;
            } catch (error) {
                console.error('❌ 토큰 잔액 조회 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 기능 사용 가능 여부 확인 (클라이언트 측 Firebase 직접 사용)
        async canUseFeature(userId, feature) {
            try {
                if (!userId) {
                    const user = window.getBullnabiUser?.();
                    userId = user?.userId || user?.id;
                }

                if (!userId) {
                    return { success: false, canUse: false, error: 'userId required' };
                }

                const cost = this.TOKEN_COSTS[feature];
                if (!cost) {
                    return { success: false, canUse: false, error: `Unknown feature: ${feature}` };
                }

                // 클라이언트 측 Firebase Firestore 직접 조회
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const doc = await db.collection('user_tokens').doc(userId).get();

                    let currentBalance = 0;
                    if (doc.exists) {
                        currentBalance = doc.data().tokenBalance || 0;
                    }

                    const canUse = currentBalance >= cost;
                    console.log(`🔍 ${feature} 사용 가능 여부 (Firestore):`, { canUse, currentBalance, requiredTokens: cost });
                    return {
                        success: true,
                        canUse: canUse,
                        currentBalance: currentBalance,
                        requiredTokens: cost,
                        shortfall: canUse ? 0 : cost - currentBalance
                    };
                }

                // Firebase가 없으면 서버 API 폴백
                const response = await fetch('/.netlify/functions/token-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'canUse',
                        userId: userId,
                        feature: feature
                    })
                });

                const result = await response.json();
                console.log(`🔍 ${feature} 사용 가능 여부 (API):`, result);
                return result;
            } catch (error) {
                console.error('❌ 기능 사용 가능 여부 확인 실패:', error);
                return { success: false, canUse: false, error: error.message };
            }
        },

        // 토큰 차감 (클라이언트 측 Firebase 직접 사용)
        async deductTokens(userId, feature, metadata = {}) {
            try {
                if (!userId) {
                    const user = window.getBullnabiUser?.();
                    userId = user?.userId || user?.id;
                }

                if (!userId) {
                    return { success: false, error: 'userId required' };
                }

                const cost = this.TOKEN_COSTS[feature];
                if (!cost) {
                    return { success: false, error: `Unknown feature: ${feature}` };
                }

                // 클라이언트 측 Firebase Firestore 직접 사용
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const docRef = db.collection('user_tokens').doc(userId);
                    const doc = await docRef.get();

                    let currentBalance = 0;
                    let currentPlan = 'free';
                    if (doc.exists) {
                        currentBalance = doc.data().tokenBalance || 0;
                        currentPlan = doc.data().plan || 'free';
                    }

                    if (currentBalance < cost) {
                        console.warn(`⚠️ 토큰 부족: 현재 ${currentBalance}, 필요 ${cost}`);
                        return { success: false, error: '토큰이 부족합니다', code: 'INSUFFICIENT_TOKENS' };
                    }

                    const newBalance = currentBalance - cost;

                    // 토큰 차감
                    await docRef.set({
                        tokenBalance: newBalance,
                        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // 사용 로그 저장
                    await db.collection('token_logs').add({
                        userId: userId,
                        action: feature,
                        tokensUsed: cost,
                        previousBalance: currentBalance,
                        newBalance: newBalance,
                        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                        metadata: metadata
                    });

                    console.log(`✅ 토큰 차감 완료 (Firestore): ${feature}, ${cost}토큰 사용, 잔액: ${newBalance}`);

                    // UI 업데이트
                    this.updateTokenDisplay(newBalance, currentPlan);

                    return {
                        success: true,
                        previousBalance: currentBalance,
                        deducted: cost,
                        newBalance: newBalance
                    };
                }

                // Firebase가 없으면 서버 API 폴백
                const response = await fetch('/.netlify/functions/token-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deduct',
                        userId: userId,
                        feature: feature,
                        metadata: metadata
                    })
                });

                const result = await response.json();

                if (result.success) {
                    console.log(`✅ 토큰 차감 완료 (API): ${feature}, ${result.deducted}토큰 사용, 잔액: ${result.newBalance}`);
                    // 현재 플랜 가져오기 (캐시된 값 사용)
                    const cachedPlan = window.currentDesigner?.plan ||
                        JSON.parse(localStorage.getItem('bullnabi_user') || '{}').plan || 'free';
                    this.updateTokenDisplay(result.newBalance, cachedPlan);
                } else {
                    console.warn(`⚠️ 토큰 차감 실패: ${result.error}`);
                }

                return result;
            } catch (error) {
                console.error('❌ 토큰 차감 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // ⭐ 동적 크레딧 차감 (토큰 사용량 기반)
        async deductTokensDynamic(userId, amount, feature, metadata = {}) {
            try {
                if (!userId) {
                    const user = window.getBullnabiUser?.();
                    userId = user?.userId || user?.id;
                }

                if (!userId) {
                    return { success: false, error: 'userId required' };
                }

                if (!amount || amount <= 0) {
                    return { success: false, error: 'Invalid amount' };
                }

                // 클라이언트 측 Firebase Firestore 직접 사용
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const docRef = db.collection('user_tokens').doc(userId);
                    const doc = await docRef.get();

                    let currentBalance = 0;
                    let currentPlan = 'free';
                    if (doc.exists) {
                        currentBalance = doc.data().tokenBalance || 0;
                        currentPlan = doc.data().plan || 'free';
                    }

                    if (currentBalance < amount) {
                        console.warn(`⚠️ 크레딧 부족: 현재 ${currentBalance}, 필요 ${amount}`);
                        return { success: false, error: '크레딧이 부족합니다', code: 'INSUFFICIENT_TOKENS' };
                    }

                    const newBalance = currentBalance - amount;

                    // 크레딧 차감
                    await docRef.set({
                        tokenBalance: newBalance,
                        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // 사용 로그 저장
                    await db.collection('token_logs').add({
                        userId: userId,
                        action: feature,
                        tokensUsed: amount,
                        previousBalance: currentBalance,
                        newBalance: newBalance,
                        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                        metadata: metadata
                    });

                    console.log(`✅ 동적 크레딧 차감 완료: ${feature}, ${amount}크레딧 사용, 잔액: ${newBalance}`);

                    // UI 업데이트
                    this.updateTokenDisplay(newBalance, currentPlan);

                    return {
                        success: true,
                        previousBalance: currentBalance,
                        deducted: amount,
                        newBalance: newBalance
                    };
                }

                return { success: false, error: 'Firebase not available' };
            } catch (error) {
                console.error('❌ 동적 크레딧 차감 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 관리자 ID 목록 (토큰 잔액 표시용)
        ADMIN_USER_IDS: [
            '691ceee09d868b5736d22007',
            '6536474789a3ad49553b46d7'
        ],

        // 플랜 이름 매핑 (내부 키 → 한국어 표시)
        PLAN_NAMES: {
            'free': '무료',
            'basic': '베이직',
            'standard': '프로',
            'business': '비즈니스'
        },

        // 현재 사용자가 관리자인지 체크
        isAdminUser() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlUserId = urlParams.get('userId');
                if (urlUserId && this.ADMIN_USER_IDS.includes(urlUserId)) return true;

                const bullnabiUser = JSON.parse(localStorage.getItem('bullnabi_user') || '{}');
                if (bullnabiUser.userId && this.ADMIN_USER_IDS.includes(bullnabiUser.userId)) return true;
                if (bullnabiUser._id && this.ADMIN_USER_IDS.includes(bullnabiUser._id)) return true;
                if (bullnabiUser.id && this.ADMIN_USER_IDS.includes(bullnabiUser.id)) return true;
            } catch (e) {}
            return false;
        },

        // 토큰 잔액 UI 업데이트 (관리자용)
        updateTokenDisplay(newBalance, plan) {
            // 관리자만 토큰 잔액 표시
            const isAdmin = this.isAdminUser();

            // 토큰 표시 요소 업데이트 (관리자 전용)
            const tokenElements = document.querySelectorAll('.token-balance, .credit-balance, [data-token-balance]');
            tokenElements.forEach(el => {
                if (isAdmin) {
                    el.textContent = newBalance.toLocaleString();
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });

            // sessionStatusDisplay 요소 업데이트 (index.html 사이드바)
            const sessionStatus = document.getElementById('sessionStatusDisplay');
            if (sessionStatus) {
                const planName = this.PLAN_NAMES[plan] || plan || '무료';
                if (isAdmin) {
                    // 관리자: 플랜 + 토큰 (괄호 형식)
                    sessionStatus.textContent = `${planName} 플랜 (토큰: ${newBalance.toLocaleString()})`;
                } else {
                    // 일반 유저: 플랜만 표시
                    sessionStatus.textContent = `현재 플랜: ${planName}`;
                }
            }

            // planBadge 요소 업데이트 (main.js 사이드바)
            const planBadge = document.getElementById('planBadge');
            const planIcon = document.getElementById('planIcon');
            const planTextEl = document.getElementById('planText');
            const tokenInfo = document.getElementById('tokenInfo');

            // 플랜별 스타일 설정
            const planStyles = {
                'free': { icon: '🎁', gradient: 'linear-gradient(135deg, #78909c, #546e7a)', color: '#fff' },
                'basic': { icon: '💎', gradient: 'linear-gradient(135deg, #4FC3F7, #0288D1)', color: '#fff' },
                'standard': { icon: '🚀', gradient: 'linear-gradient(135deg, #BA68C8, #7B1FA2)', color: '#fff' },
                'business': { icon: '👑', gradient: 'linear-gradient(135deg, #FFD54F, #FF8F00)', color: '#333' }
            };
            const style = planStyles[plan] || planStyles['free'];

            if (planBadge) {
                planBadge.style.background = style.gradient;
                planBadge.style.color = style.color;
                planBadge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            if (planIcon) planIcon.textContent = style.icon;
            if (planTextEl) planTextEl.textContent = planName;

            // 관리자만 토큰 정보 표시
            if (tokenInfo) {
                if (isAdmin) {
                    tokenInfo.style.display = 'block';
                    tokenInfo.innerHTML = `💰 토큰: <strong style="color: #4FC3F7;">${newBalance.toLocaleString()}</strong>`;
                } else {
                    tokenInfo.style.display = 'none';
                }
            }

            // currentDesigner 업데이트 (있는 경우)
            if (window.currentDesigner) {
                window.currentDesigner.tokenBalance = newBalance;
                window.currentDesigner.plan = plan;
            }

            // 불나비 사용자 정보에도 저장 (localStorage)
            const user = window.getBullnabiUser?.();
            if (user) {
                user.tokenBalance = newBalance;
                user.plan = plan;
                localStorage.setItem('bullnabi_user', JSON.stringify(user));
            }
        },

        // 토큰 부족 시 결제 안내 팝업
        showInsufficientTokensPopup(requiredTokens, currentBalance) {
            const shortfall = requiredTokens - currentBalance;

            if (typeof showToast === 'function') {
                showToast(`토큰이 부족합니다. (필요: ${requiredTokens}, 보유: ${currentBalance})`, 'error');
            }

            // 결제 페이지로 이동할지 확인
            const confirmPurchase = confirm(
                `토큰이 ${shortfall}개 부족합니다.\n\n` +
                `필요 토큰: ${requiredTokens}\n` +
                `보유 토큰: ${currentBalance}\n\n` +
                `토큰을 충전하시겠습니까?`
            );

            if (confirmPurchase) {
                // 결제 모달 열기
                if (typeof openPaymentModal === 'function') {
                    openPaymentModal();
                } else {
                    console.log('💳 결제 모달 함수 없음');
                }
            }

            return confirmPurchase;
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
