// HAIRGATOR Firebase 인증 및 사용자 관리 브릿지
// js/firebase-bridge.js
// 기존 bullnabi-bridge.js를 대체
// 2025-12-27: 이메일 기반 사용자 통합

(function() {
    'use strict';

    console.log('🔥 Firebase 브릿지 초기화 중...');

    /**
     * 이메일을 Firestore 문서 ID로 변환
     */
    function sanitizeEmailForDocId(email) {
        if (!email) return null;
        return email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
    }

    const FirebaseBridge = {
        currentUser: null,
        isInitialized: false,

        // 토큰 비용 상수
        TOKEN_COSTS: {
            lookbook: 200,
            hairTry: 350,
            chatbot: 10
        },

        // 관리자 ID 목록 (이메일 기반: email.replace(/@/g, '_').replace(/\./g, '_'))
        ADMIN_USER_IDS: ['708eric_hanmail_net'],

        // 초기화
        init() {
            this.setupAuthListener();
            console.log('✅ Firebase 브릿지 준비 완료');
        },

        // Firebase Auth 상태 리스너 설정
        setupAuthListener() {
            if (!window.auth) {
                console.warn('⚠️ Firebase Auth가 아직 로드되지 않았습니다. 재시도...');
                setTimeout(() => this.setupAuthListener(), 500);
                return;
            }

            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('👤 사용자 로그인 감지:', user.uid);
                    this.currentUser = user;
                    this.isInitialized = true;

                    // Firestore에서 추가 사용자 정보 로드
                    await this.loadUserData(user.uid);

                    // UI 업데이트
                    this.updateUIAfterLogin();
                } else {
                    console.log('👤 사용자 로그아웃 상태');
                    this.currentUser = null;
                    this.isInitialized = true;

                    // 로그인 페이지가 아니면 리다이렉트
                    if (!window.location.pathname.includes('login.html')) {
                        // 로그인 필요한 페이지에서만 리다이렉트
                        // window.location.href = '/login.html';
                    }
                }
            });
        },

        // Firestore에서 사용자 데이터 로드 (이메일 기반 우선)
        async loadUserData(uid) {
            try {
                const firebaseUser = auth.currentUser;
                const email = firebaseUser?.email;

                // 이메일 기반 문서 ID 우선 시도
                const emailDocId = sanitizeEmailForDocId(email);
                let userDoc = null;
                let docId = null;

                // 1차: 이메일 기반 조회
                if (emailDocId) {
                    userDoc = await db.collection('users').doc(emailDocId).get();
                    if (userDoc.exists) {
                        docId = emailDocId;
                        console.log('📧 이메일 기반 사용자 문서 발견:', emailDocId);
                    }
                }

                // 2차: 이메일 기반에 없으면 UID로 폴백
                if (!userDoc?.exists) {
                    userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        docId = uid;
                        console.log('🔑 UID 기반 사용자 문서 발견:', uid);
                    }
                }

                if (userDoc?.exists) {
                    const userData = userDoc.data();

                    // displayName이 비어있으면 name 또는 nickname 사용
                    const displayName = userData.displayName?.trim()
                        || userData.name
                        || userData.nickname
                        || '사용자';

                    // 전역 변수에 저장 (id는 이메일 기반 docId 사용)
                    window.currentDesigner = {
                        id: docId,  // 이메일 기반 문서 ID
                        name: displayName,
                        email: userData.email || email || '',
                        photoURL: userData.photoURL || '',
                        tokenBalance: userData.tokenBalance || 0,
                        plan: userData.plan || 'free',
                        provider: userData.provider || userData.primaryProvider || 'email',
                        isFirebaseUser: true
                    };

                    // localStorage에도 저장 (호환성)
                    localStorage.setItem('firebase_user', JSON.stringify(window.currentDesigner));

                    console.log('📊 사용자 데이터 로드 완료:', {
                        docId: docId,
                        name: displayName,
                        tokenBalance: userData.tokenBalance,
                        plan: userData.plan
                    });

                    return userData;
                } else {
                    console.warn('⚠️ 사용자 문서가 없습니다:', emailDocId || uid);
                    return null;
                }
            } catch (error) {
                console.error('❌ 사용자 데이터 로드 실패:', error);
                return null;
            }
        },

        // 로그인 후 UI 업데이트
        updateUIAfterLogin() {
            const user = window.currentDesigner;
            if (!user) return;

            // 로그인 화면 숨기고 메인 화면 표시
            const loginScreen = document.getElementById('loginScreen');
            const genderSelection = document.getElementById('genderSelection');

            if (loginScreen) {
                loginScreen.style.display = 'none';
                loginScreen.classList.remove('active');
            }

            if (genderSelection) {
                genderSelection.style.display = 'flex';
                genderSelection.classList.add('active');
            }

            // 사용자 이름 표시
            const designerNameDisplay = document.getElementById('designerNameDisplay');
            if (designerNameDisplay) {
                designerNameDisplay.textContent = user.name;
            }

            // 토큰/플랜 표시 업데이트
            this.updateTokenDisplay(user.tokenBalance, user.plan);

            // 프로필 이미지 업데이트
            if (user.photoURL && typeof window.applyProfileImage === 'function') {
                window.applyProfileImage(user.photoURL);
            }

            // 사이드바 로그인 정보 업데이트
            if (typeof window.updateLoginInfo === 'function') {
                window.updateLoginInfo();
            }

            // 토스트 알림
            if (typeof showToast === 'function') {
                showToast(`${user.name}님 환영합니다!`, 'success');
            }
        },

        // ========== 토큰 관리 함수들 ==========

        // 사용자 문서 ID 가져오기 (Firebase Auth 이메일 기반 - 항상 서버에서!)
        async getUserDocId() {
            // Firebase Auth에서 현재 사용자 이메일 가져오기 (가장 신뢰할 수 있는 소스)
            const firebaseUser = typeof auth !== 'undefined' ? auth.currentUser : null;
            if (firebaseUser?.email) {
                const docId = firebaseUser.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
                console.log('🔑 getUserDocId: Firebase Auth email =', docId);
                return docId;
            }
            // Firebase Auth 미초기화 시 window.currentDesigner 폴백 (로그인 직후)
            if (window.currentDesigner?.email) {
                const docId = window.currentDesigner.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
                console.log('🔑 getUserDocId: currentDesigner.email =', docId);
                return docId;
            }
            console.warn('⚠️ getUserDocId: Firebase Auth 또는 currentDesigner 이메일 없음');
            return null;
        },

        // 토큰 잔액 조회
        async getTokenBalance(docId) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                console.log('🔍 getTokenBalance 조회 시작, docId:', docId);

                if (!docId) {
                    console.error('❌ 사용자 문서 ID가 없습니다');
                    return { success: false, error: 'User doc ID required', tokenBalance: 0 };
                }

                const userDoc = await db.collection('users').doc(docId).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log('✅ getTokenBalance 결과:', {
                        docId: docId,
                        tokenBalance: userData.tokenBalance,
                        plan: userData.plan
                    });
                    return {
                        success: true,
                        tokenBalance: userData.tokenBalance || 0,
                        plan: userData.plan || 'free'
                    };
                }

                console.warn('⚠️ getTokenBalance: 문서 없음, docId:', docId);
                return { success: false, error: 'User not found', tokenBalance: 0 };
            } catch (error) {
                console.error('❌ 토큰 잔액 조회 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 플랜 조회 (이메일 기반 문서 ID 사용)
        async getPlan(docId) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, error: 'docId required', plan: 'free' };
                }

                const userDoc = await db.collection('users').doc(docId).get();

                if (userDoc.exists) {
                    return {
                        success: true,
                        plan: userDoc.data().plan || 'free'
                    };
                }

                return { success: false, plan: 'free', error: 'User not found' };
            } catch (error) {
                console.error('❌ 플랜 조회 실패:', error);
                return { success: false, plan: 'free', error: error.message };
            }
        },

        // 기능 사용 가능 여부 확인 (이메일 기반 문서 ID 사용)
        async canUseFeature(docId, feature) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, canUse: false, error: 'docId required' };
                }

                const cost = this.TOKEN_COSTS[feature];
                if (!cost) {
                    return { success: false, canUse: false, error: `Unknown feature: ${feature}` };
                }

                const result = await this.getTokenBalance(docId);
                const currentBalance = result.success ? result.tokenBalance : 0;
                const canUse = currentBalance >= cost;

                return {
                    success: true,
                    canUse: canUse,
                    currentBalance: currentBalance,
                    requiredTokens: cost,
                    shortfall: canUse ? 0 : cost - currentBalance
                };
            } catch (error) {
                console.error('❌ 기능 사용 가능 여부 확인 실패:', error);
                return { success: false, canUse: false, error: error.message };
            }
        },

        // 토큰 차감 (이메일 기반 문서 ID 사용)
        async deductTokens(docId, feature, metadata = {}) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, error: 'docId required' };
                }

                const cost = this.TOKEN_COSTS[feature];
                if (!cost) {
                    return { success: false, error: `Unknown feature: ${feature}` };
                }

                // 현재 잔액 확인
                const currentResult = await this.getTokenBalance(docId);
                if (!currentResult.success) {
                    return currentResult;
                }

                const currentBalance = currentResult.tokenBalance;
                if (currentBalance < cost) {
                    return {
                        success: false,
                        error: '토큰이 부족합니다',
                        currentBalance: currentBalance,
                        required: cost
                    };
                }

                const newBalance = currentBalance - cost;

                // Firestore 업데이트
                await db.collection('users').doc(docId).update({
                    tokenBalance: newBalance,
                    lastUsedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 사용 로그 저장
                await db.collection('credit_logs').add({
                    userId: docId,
                    action: feature,
                    creditsUsed: cost,
                    previousBalance: currentBalance,
                    newBalance: newBalance,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    metadata: metadata
                });

                console.log(`✅ 토큰 차감 완료: ${feature}, ${cost}토큰 사용, 잔액: ${newBalance}`);

                // UI 업데이트
                const plan = currentResult.plan || 'free';
                this.updateTokenDisplay(newBalance, plan);

                // 전역 변수 업데이트
                if (window.currentDesigner) {
                    window.currentDesigner.tokenBalance = newBalance;
                }

                return {
                    success: true,
                    previousBalance: currentBalance,
                    deducted: cost,
                    newBalance: newBalance
                };
            } catch (error) {
                console.error('❌ 토큰 차감 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 동적 토큰 차감 (가변 금액, 이메일 기반 문서 ID 사용)
        async deductTokensDynamic(docId, amount, feature, metadata = {}) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, error: 'docId required' };
                }

                if (!amount || amount <= 0) {
                    return { success: false, error: 'Invalid amount' };
                }

                // 현재 잔액 확인
                const currentResult = await this.getTokenBalance(docId);
                if (!currentResult.success) {
                    return currentResult;
                }

                const currentBalance = currentResult.tokenBalance;
                if (currentBalance < amount) {
                    return {
                        success: false,
                        error: '토큰이 부족합니다',
                        currentBalance: currentBalance,
                        required: amount
                    };
                }

                const newBalance = currentBalance - amount;

                // Firestore 업데이트
                await db.collection('users').doc(docId).update({
                    tokenBalance: newBalance,
                    lastUsedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 사용 로그 저장
                await db.collection('credit_logs').add({
                    userId: docId,
                    action: feature,
                    creditsUsed: amount,
                    previousBalance: currentBalance,
                    newBalance: newBalance,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    metadata: metadata
                });

                console.log(`✅ 동적 토큰 차감 완료: ${feature}, ${amount}토큰 사용, 잔액: ${newBalance}`);

                // UI 업데이트
                const plan = currentResult.plan || 'free';
                this.updateTokenDisplay(newBalance, plan);

                // 전역 변수 업데이트
                if (window.currentDesigner) {
                    window.currentDesigner.tokenBalance = newBalance;
                }

                return {
                    success: true,
                    previousBalance: currentBalance,
                    deducted: amount,
                    newBalance: newBalance
                };
            } catch (error) {
                console.error('❌ 동적 토큰 차감 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 토큰 충전 (결제 후, 이메일 기반 문서 ID 사용)
        async chargeTokens(docId, amount, paymentId) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, error: 'docId required' };
                }

                // 현재 잔액 확인
                const currentResult = await this.getTokenBalance(docId);
                const currentBalance = currentResult.success ? currentResult.tokenBalance : 0;
                const newBalance = currentBalance + amount;

                // Firestore 업데이트
                await db.collection('users').doc(docId).update({
                    tokenBalance: newBalance,
                    lastChargedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 충전 로그 저장
                await db.collection('credit_logs').add({
                    userId: docId,
                    action: 'charge',
                    creditsUsed: -amount, // 음수로 저장 (충전)
                    previousBalance: currentBalance,
                    newBalance: newBalance,
                    paymentId: paymentId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ 토큰 충전 완료: ${amount}토큰, 잔액: ${newBalance}`);

                // UI 업데이트
                const plan = currentResult.plan || 'free';
                this.updateTokenDisplay(newBalance, plan);

                return {
                    success: true,
                    previousBalance: currentBalance,
                    charged: amount,
                    newBalance: newBalance
                };
            } catch (error) {
                console.error('❌ 토큰 충전 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // 플랜 업그레이드 (이메일 기반 문서 ID 사용)
        async upgradePlan(docId, newPlan, tokenAmount) {
            try {
                if (!docId) {
                    docId = await this.getUserDocId();
                }

                if (!docId) {
                    return { success: false, error: 'docId required' };
                }

                const validPlans = ['free', 'basic', 'pro', 'business'];
                if (!validPlans.includes(newPlan)) {
                    return { success: false, error: `Invalid plan: ${newPlan}` };
                }

                // 현재 정보 확인
                const currentResult = await this.getTokenBalance(docId);
                const currentBalance = currentResult.success ? currentResult.tokenBalance : 0;
                const currentPlan = currentResult.plan || 'free';
                const newBalance = currentBalance + tokenAmount;

                // Firestore 업데이트
                await db.collection('users').doc(docId).update({
                    plan: newPlan,
                    tokenBalance: newBalance,
                    planUpgradedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ 플랜 업그레이드: ${currentPlan} → ${newPlan}, 토큰: ${newBalance}`);

                // UI 업데이트
                this.updateTokenDisplay(newBalance, newPlan);

                // 전역 변수 업데이트
                if (window.currentDesigner) {
                    window.currentDesigner.plan = newPlan;
                    window.currentDesigner.tokenBalance = newBalance;
                }

                return {
                    success: true,
                    previousPlan: currentPlan,
                    newPlan: newPlan,
                    newBalance: newBalance
                };
            } catch (error) {
                console.error('❌ 플랜 업그레이드 실패:', error);
                return { success: false, error: error.message };
            }
        },

        // ========== UI 업데이트 함수들 ==========

        // 플랜 이름 가져오기
        getPlanName(planKey) {
            if (typeof t === 'function') {
                const i18nKeys = {
                    'free': 'payment.freePlan',
                    'basic': 'payment.basicPlan',
                    'pro': 'payment.proPlan',
                    'business': 'payment.businessPlan'
                };
                return t(i18nKeys[planKey]) || planKey || 'Free';
            }
            const fallback = { 'free': '무료', 'basic': '베이직', 'pro': '프로', 'business': '비즈니스' };
            return fallback[planKey] || planKey || '무료';
        },

        // 관리자 여부 확인 (이메일 기반 ID로 비교)
        isAdminUser() {
            // 1차: currentDesigner.id 사용 (이메일 기반)
            if (window.currentDesigner?.id) {
                return this.ADMIN_USER_IDS.includes(window.currentDesigner.id);
            }
            // 2차: 현재 사용자 이메일로 ID 생성
            const email = this.currentUser?.email || (typeof auth !== 'undefined' ? auth.currentUser?.email : null);
            if (email) {
                const emailDocId = email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
                return this.ADMIN_USER_IDS.includes(emailDocId);
            }
            return false;
        },

        // 토큰 표시 UI 업데이트
        updateTokenDisplay(newBalance, plan) {
            const isAdmin = this.isAdminUser();

            // sessionStatusDisplay 업데이트
            const sessionStatus = document.getElementById('sessionStatusDisplay');
            if (sessionStatus) {
                const planName = this.getPlanName(plan);
                if (isAdmin) {
                    sessionStatus.textContent = `${planName} (${newBalance.toLocaleString()})`;
                } else {
                    sessionStatus.textContent = `현재 플랜: ${planName}`;
                }
            }

            // planBadge 업데이트
            const planBadge = document.getElementById('planBadge');
            const planIcon = document.getElementById('planIcon');
            const planTextEl = document.getElementById('planText');
            const tokenInfo = document.getElementById('tokenInfo');

            const planStyles = {
                'free': { icon: '🎁', gradient: 'linear-gradient(135deg, #78909c, #546e7a)', color: '#fff' },
                'basic': { icon: '💎', gradient: 'linear-gradient(135deg, #4FC3F7, #0288D1)', color: '#fff' },
                'pro': { icon: '🚀', gradient: 'linear-gradient(135deg, #BA68C8, #7B1FA2)', color: '#fff' },
                'business': { icon: '👑', gradient: 'linear-gradient(135deg, #FFD54F, #FF8F00)', color: '#333' }
            };
            const style = planStyles[plan] || planStyles['free'];

            if (planBadge) {
                planBadge.style.background = style.gradient;
                planBadge.style.color = style.color;
            }
            if (planIcon) planIcon.textContent = style.icon;
            if (planTextEl) planTextEl.textContent = this.getPlanName(plan);

            if (tokenInfo) {
                if (isAdmin) {
                    tokenInfo.style.display = 'block';
                    tokenInfo.innerHTML = `💰 토큰: <strong>${newBalance.toLocaleString()}</strong>`;
                } else {
                    tokenInfo.style.display = 'none';
                }
            }

            // 전역 변수 업데이트
            if (window.currentDesigner) {
                window.currentDesigner.tokenBalance = newBalance;
                window.currentDesigner.plan = plan;
            }
        },

        // 토큰 부족 팝업
        showInsufficientTokensPopup(requiredTokens, currentBalance) {
            const shortfall = requiredTokens - currentBalance;

            if (typeof showToast === 'function') {
                showToast(`토큰이 부족합니다. (필요: ${requiredTokens}, 보유: ${currentBalance})`, 'error');
            }

            const confirmPurchase = confirm(
                `토큰이 ${shortfall}개 부족합니다.\n\n` +
                `필요 토큰: ${requiredTokens}\n` +
                `보유 토큰: ${currentBalance}\n\n` +
                `토큰을 충전하시겠습니까?`
            );

            if (confirmPurchase && typeof openPaymentModal === 'function') {
                openPaymentModal();
            }

            return confirmPurchase;
        },

        // ========== 로그아웃 ==========

        async logout() {
            try {
                await auth.signOut();

                // 로컬 데이터 정리
                localStorage.removeItem('firebase_user');
                window.currentDesigner = null;
                this.currentUser = null;

                console.log('👋 로그아웃 완료');

                if (typeof showToast === 'function') {
                    showToast('로그아웃되었습니다', 'info');
                }

                // 로그인 페이지로 이동
                window.location.href = '/login.html';
            } catch (error) {
                console.error('❌ 로그아웃 실패:', error);
            }
        },

        // ========== 유틸리티 ==========

        // 현재 사용자 정보 가져오기
        getCurrentUser() {
            return this.currentUser;
        },

        // 로그인 상태 확인
        isLoggedIn() {
            return !!this.currentUser;
        },

        // 상태 조회
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isLoggedIn: this.isLoggedIn(),
                currentUser: this.currentUser ? {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    displayName: this.currentUser.displayName
                } : null
            };
        }
    };

    // 페이지 로드 완료 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FirebaseBridge.init();
        });
    } else {
        FirebaseBridge.init();
    }

    // 전역 접근을 위해 노출
    window.FirebaseBridge = FirebaseBridge;

    // 호환성을 위해 BullnabiBridge 별칭도 제공
    window.BullnabiBridge = FirebaseBridge;

    console.log('🔥 Firebase 브릿지 모듈 로드 완료');

})();
