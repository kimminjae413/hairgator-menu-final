// ========== Firebase Auth 인증 시스템 ==========
// 2025-12-27: 불나비 → Firebase Auth 전환
// 2025-12-27: 이메일 기반 사용자 통합 (다중 로그인 방식 지원)

// 인증 상태 변수
let currentUser = null;
let authInitialized = false;

/**
 * 이메일을 Firestore 문서 ID로 변환
 * @param {string} email - 이메일 주소
 * @returns {string} - 문서 ID (예: 708eric_hanmail_net)
 */
function sanitizeEmailForDocId(email) {
    if (!email) return null;
    return email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
}

/**
 * Provider ID에서 provider 이름 추출
 * @param {string} providerId - Firebase provider ID
 * @returns {string} - provider 이름 (google, kakao, email)
 */
function getProviderName(providerId) {
    if (providerId?.includes('google')) return 'google';
    if (providerId?.includes('kakao')) return 'kakao';
    if (providerId?.includes('password')) return 'email';
    return providerId || 'unknown';
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    initFirebaseAuth();

    // 성별 선택 화면 번역 적용
    setTimeout(() => {
        const maleLabelElements = document.querySelectorAll('.gender-btn.male .gender-label');
        const femaleLabelElements = document.querySelectorAll('.gender-btn.female .gender-label');

        maleLabelElements.forEach(el => {
            if (el) el.textContent = t('gender.male');
        });

        femaleLabelElements.forEach(el => {
            if (el) el.textContent = t('gender.female');
        });

        console.log('✅ 성별 선택 화면 번역 적용 완료');
    }, 500);

    console.log('✅ Firebase Auth 인증 시스템 초기화 완료');
});

/**
 * Firebase Auth 초기화 및 상태 감지
 */
function initFirebaseAuth() {
    // Firebase Auth가 로드될 때까지 대기
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.log('⏳ Firebase Auth 로드 대기 중...');
        setTimeout(initFirebaseAuth, 100);
        return;
    }

    const auth = firebase.auth();

    // 인증 상태 변경 감지
    auth.onAuthStateChanged(async (user) => {
        authInitialized = true;

        if (user) {
            // 로그인 상태
            console.log('🔐 Firebase Auth 로그인:', user.email || user.uid);
            currentUser = user;

            await handleUserLogin(user);
        } else {
            // 로그아웃 상태
            console.log('🔓 Firebase Auth 로그아웃 상태');
            currentUser = null;

            // 로그인 페이지로 리다이렉트 (login.html이 아닌 경우에만)
            const currentPage = window.location.pathname;
            if (!currentPage.includes('login.html') && !currentPage.includes('admin.html')) {
                // login.html로 리다이렉트
                console.log('🔄 로그인 페이지로 리다이렉트...');
                window.location.href = '/login.html';
            }
        }
    });
}

/**
 * 사용자 로그인 처리 (이메일 기반 통합)
 * - 동일 이메일이면 어떤 로그인 방식이든 같은 사용자로 인식
 * - linkedProviders에 각 로그인 방식별 UID 저장
 */
async function handleUserLogin(user) {
    try {
        const db = firebase.firestore();
        const email = user.email;
        const providerName = getProviderName(user.providerData[0]?.providerId);

        // 이메일이 없으면 UID 기반 폴백 (카카오 이메일 미제공 등)
        if (!email) {
            console.warn('⚠️ 이메일 없음, UID 기반 폴백:', user.uid);
            await handleUserLoginByUid(user);
            return;
        }

        // 이메일 기반 문서 ID
        const emailDocId = sanitizeEmailForDocId(email);
        console.log('🔍 auth.js: 이메일 기반 조회 -', emailDocId);

        const userDoc = await db.collection('users').doc(emailDocId).get();

        let userData = {
            email: email,
            displayName: user.displayName || email.split('@')[0] || '사용자',
            photoURL: user.photoURL,
            primaryProvider: providerName,
            tokenBalance: 200,
            plan: 'free'
        };

        if (userDoc.exists) {
            // 기존 사용자 - 데이터 병합 및 provider 연결
            const firestoreData = userDoc.data();
            console.log('🔍 auth.js: 기존 사용자 발견 =', {
                email: firestoreData.email,
                displayName: firestoreData.displayName,
                tokenBalance: firestoreData.tokenBalance,
                plan: firestoreData.plan,
                linkedProviders: Object.keys(firestoreData.linkedProviders || {})
            });

            userData = { ...userData, ...firestoreData };

            // displayName이 비어있으면 name 또는 nickname 사용
            if (!userData.displayName || userData.displayName.trim() === '') {
                userData.displayName = firestoreData.name || firestoreData.nickname || email.split('@')[0] || '사용자';
            }

            // linkedProviders 업데이트 (새 provider 추가)
            const linkedProviders = firestoreData.linkedProviders || {};
            if (!linkedProviders[providerName]) {
                linkedProviders[providerName] = {
                    uid: user.uid,
                    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                console.log(`🔗 새 로그인 방식 연결: ${providerName}`);
            }

            // Firestore 업데이트
            await db.collection('users').doc(emailDocId).update({
                linkedProviders: linkedProviders,
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastProvider: providerName
            });

        } else {
            // 신규 사용자 - 이메일 기반으로 생성
            const linkedProviders = {
                [providerName]: {
                    uid: user.uid,
                    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };

            await db.collection('users').doc(emailDocId).set({
                email: email,
                displayName: userData.displayName,
                photoURL: user.photoURL,
                primaryProvider: providerName,
                linkedProviders: linkedProviders,
                tokenBalance: 200,
                plan: 'free',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('👤 신규 사용자 생성 (이메일 기반):', emailDocId);
        }

        // planExpiresAt 처리
        let planExpiresAt = null;
        if (userData.planExpiresAt) {
            planExpiresAt = userData.planExpiresAt.toDate
                ? userData.planExpiresAt.toDate().toISOString()
                : userData.planExpiresAt;
        }

        // window.currentDesigner 설정 (전역 사용자 정보)
        window.currentDesigner = {
            id: emailDocId,
            name: userData.displayName,
            email: userData.email,
            phone: userData.phone || '0000',
            photoURL: userData.photoURL || '',
            tokenBalance: userData.tokenBalance,
            plan: userData.plan,
            planExpiresAt: planExpiresAt,
            savedCard: userData.savedCard || null,
            provider: providerName,
            isFirebaseUser: true
        };

        // localStorage에 사용자 정보 캐시 (firebase_user로 통합)
        localStorage.setItem('firebase_user', JSON.stringify(window.currentDesigner));

        // 플랜 만료 체크 (자동 다운그레이드)
        if (window.FirebaseBridge && typeof window.FirebaseBridge.checkPlanExpiration === 'function') {
            const expirationResult = await window.FirebaseBridge.checkPlanExpiration(emailDocId);
            if (expirationResult && expirationResult.expired) {
                // 만료되면 currentDesigner 업데이트
                window.currentDesigner.plan = 'free';
                window.currentDesigner.tokenBalance = 0;
                localStorage.setItem('firebase_user', JSON.stringify(window.currentDesigner));
            }
        }

        // UI 업데이트
        updateUIAfterLogin(userData);

        // 토큰 표시 업데이트
        if (window.FirebaseBridge) {
            window.FirebaseBridge.updateTokenDisplay(userData.tokenBalance, userData.plan);
        }

        // 현재 페이지가 products면 플랜 표시 업데이트
        if (window.location.hash === '#products' && typeof window.updateProductsPagePlan === 'function') {
            window.updateProductsPagePlan();
        }
        // 현재 페이지가 mypage면 마이페이지 정보 업데이트
        if (window.location.hash === '#mypage' && typeof window.updateMypageInfo === 'function') {
            window.updateMypageInfo();
        }

        // 사용자 설정 로드 (테마, 언어)
        if (typeof window.loadUserSettingsFromFirebase === 'function') {
            window.loadUserSettingsFromFirebase().then(settings => {
                if (settings) {
                    console.log('⚙️ 사용자 설정 복원 완료:', settings);
                }
            });
        }

        console.log('✅ 사용자 로그인 처리 완료:', userData.displayName, '토큰:', userData.tokenBalance, 'via', providerName);

    } catch (error) {
        console.error('❌ 사용자 로그인 처리 실패:', error);
    }
}

/**
 * 이메일 없는 경우 UID 기반 폴백 로그인 처리
 * 핵심: Firebase Token claims 또는 UID 문서에서 email을 찾아 이메일 기반 문서 조회
 */
async function handleUserLoginByUid(user) {
    try {
        const db = firebase.firestore();
        const providerName = getProviderName(user.providerData[0]?.providerId);

        let userEmail = null;
        let emailDocId = null;
        let userData = {
            uid: user.uid,
            displayName: user.displayName || '사용자',
            photoURL: user.photoURL,
            provider: providerName,
            tokenBalance: 200,
            plan: 'free'
        };

        // 1. Firebase Token claims에서 이메일 찾기 (카카오 Custom Token)
        try {
            const tokenResult = await user.getIdTokenResult();
            if (tokenResult.claims.email) {
                userEmail = tokenResult.claims.email;
                console.log('🔍 Token claims에서 이메일 찾음:', userEmail);
            }
        } catch (e) {
            console.log('⚠️ Token claims 조회 실패:', e.message);
        }

        // 2. claims에 이메일 없으면 UID 문서 조회 (폴백)
        if (!userEmail) {
            const uidDoc = await db.collection('users').doc(user.uid).get();
            if (uidDoc.exists) {
                const uidData = uidDoc.data();
                userEmail = uidData.email;
                console.log('🔍 UID 문서에서 이메일 찾음:', userEmail);
            }
        }

        // 3. 이메일이 있으면 이메일 기반 문서 조회 (진짜 데이터!)
        if (userEmail) {
            emailDocId = sanitizeEmailForDocId(userEmail);
            const emailDoc = await db.collection('users').doc(emailDocId).get();

            if (emailDoc.exists) {
                const emailData = emailDoc.data();
                userData = { ...userData, ...emailData };
                console.log('✅ 이메일 기반 문서에서 데이터 로드:', {
                    docId: emailDocId,
                    plan: emailData.plan,
                    tokenBalance: emailData.tokenBalance
                });

                // displayName 보정
                if (!userData.displayName || userData.displayName.trim() === '') {
                    userData.displayName = emailData.name || emailData.nickname || userEmail.split('@')[0] || '사용자';
                }

                // 마지막 로그인 업데이트
                await db.collection('users').doc(emailDocId).update({
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastProvider: providerName
                }).catch(() => {});
            }
        } else {
            // 이메일 없는 경우 UID 문서 데이터 사용
            if (uidDoc.exists) {
                const uidData = uidDoc.data();
                userData = { ...userData, ...uidData };

                if (!userData.displayName || userData.displayName.trim() === '') {
                    userData.displayName = uidData.name || uidData.nickname || '사용자';
                }
            } else {
                // 신규 사용자 - UID 문서 생성
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    displayName: userData.displayName,
                    photoURL: user.photoURL,
                    provider: providerName,
                    tokenBalance: 200,
                    plan: 'free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('👤 신규 사용자 생성 (UID 기반):', user.uid);
            }
        }

        // planExpiresAt 처리
        let planExpiresAt = null;
        if (userData.planExpiresAt) {
            planExpiresAt = userData.planExpiresAt.toDate
                ? userData.planExpiresAt.toDate().toISOString()
                : userData.planExpiresAt;
        }

        // window.currentDesigner (이메일 기반 ID 우선!)
        const finalDocId = emailDocId || user.uid;
        window.currentDesigner = {
            id: finalDocId,
            name: userData.displayName,
            email: userEmail || '',
            phone: userData.phone || '0000',
            photoURL: userData.photoURL || '',
            tokenBalance: userData.tokenBalance,
            plan: userData.plan,
            planExpiresAt: planExpiresAt,
            savedCard: userData.savedCard || null,
            provider: providerName,
            isFirebaseUser: true
        };

        // localStorage에 저장 (firebase_user로 통합)
        localStorage.setItem('firebase_user', JSON.stringify(window.currentDesigner));

        // 플랜 만료 체크 (자동 다운그레이드)
        if (window.FirebaseBridge && typeof window.FirebaseBridge.checkPlanExpiration === 'function') {
            const expirationResult = await window.FirebaseBridge.checkPlanExpiration(finalDocId);
            if (expirationResult && expirationResult.expired) {
                window.currentDesigner.plan = 'free';
                window.currentDesigner.tokenBalance = 0;
                localStorage.setItem('firebase_user', JSON.stringify(window.currentDesigner));
            }
        }

        updateUIAfterLogin(userData);

        if (window.FirebaseBridge) {
            window.FirebaseBridge.updateTokenDisplay(userData.tokenBalance, userData.plan);
        }

        // 현재 페이지가 products면 플랜 표시 업데이트
        if (window.location.hash === '#products' && typeof window.updateProductsPagePlan === 'function') {
            window.updateProductsPagePlan();
        }
        // 현재 페이지가 mypage면 마이페이지 정보 업데이트
        if (window.location.hash === '#mypage' && typeof window.updateMypageInfo === 'function') {
            window.updateMypageInfo();
        }

        console.log('✅ 사용자 로그인 처리 완료:', userData.displayName, '플랜:', userData.plan, 'docId:', finalDocId);

    } catch (error) {
        console.error('❌ UID 기반 로그인 처리 실패:', error);
    }
}

/**
 * 로그인 후 UI 업데이트
 */
function updateUIAfterLogin(userData) {
    // 로그인 화면 숨기기
    const loginScreen = document.getElementById('loginScreen');
    const genderSelection = document.getElementById('genderSelection');

    if (loginScreen) {
        loginScreen.style.display = 'none';
        loginScreen.style.visibility = 'hidden';
        loginScreen.style.opacity = '0';
        loginScreen.classList.remove('active');
    }

    if (genderSelection) {
        genderSelection.style.display = 'flex';
        genderSelection.style.visibility = 'visible';
        genderSelection.style.opacity = '1';
        genderSelection.classList.add('active');
    }

    // 디자이너 이름 표시
    const designerNameDisplay = document.getElementById('designerNameDisplay');
    if (designerNameDisplay) {
        designerNameDisplay.textContent = userData.displayName;
    }

    // 사이드바 로그인 정보 업데이트
    if (typeof window.updateLoginInfo === 'function') {
        window.updateLoginInfo();
    }

    // 기타 UI 업데이트
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }

    // 마이페이지 정보 업데이트 (해시가 #mypage인 경우)
    if (window.location.hash === '#mypage' && typeof window.updateMypageInfo === 'function') {
        console.log('📋 로그인 완료 후 마이페이지 정보 업데이트');
        window.updateMypageInfo();
    }

    // 환영 메시지
    if (typeof showToast === 'function') {
        showToast(`${userData.displayName}님 환영합니다!`, 'success');
    }
}

/**
 * 로그인 화면 표시
 */
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const genderSelection = document.getElementById('genderSelection');

    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.style.visibility = 'visible';
        loginScreen.style.opacity = '1';
        loginScreen.classList.add('active');
    }

    if (genderSelection) {
        genderSelection.style.display = 'none';
        genderSelection.classList.remove('active');
    }
}

/**
 * 현재 Firebase 사용자 정보 조회
 */
function getFirebaseUser() {
    // Firebase Auth에서 직접 조회
    if (firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser;
    }

    // localStorage 캐시 확인 (firebase_user로 통합됨)
    try {
        const cached = localStorage.getItem('firebase_user');
        if (cached) {
            const userData = JSON.parse(cached);
            return userData;
        }
    } catch (e) {
        console.warn('캐시 사용자 정보 파싱 실패:', e);
    }

    return null;
}

/**
 * 불나비 호환 - getBullnabiUser() 대체
 * 이메일 기반 사용자 ID 반환
 */
function getBullnabiUser() {
    const user = getFirebaseUser();
    if (!user) return null;

    // window.currentDesigner에서 이름 우선 사용 (Firestore 데이터)
    const name = window.currentDesigner?.name
        || window.currentDesigner?.displayName
        || user.displayName
        || user.email?.split('@')[0]
        || '사용자';

    // 이메일 기반 사용자 ID (window.currentDesigner.id가 이미 이메일 기반)
    const emailDocId = window.currentDesigner?.id || sanitizeEmailForDocId(user.email) || user.uid;

    // 불나비 형식으로 변환
    return {
        userId: emailDocId,  // 이메일 기반 문서 ID
        id: emailDocId,      // 이메일 기반 문서 ID
        name: name,
        email: user.email,
        remainCount: 0,
        tokenBalance: window.currentDesigner?.tokenBalance || 0,
        plan: window.currentDesigner?.plan || 'free'
    };
}

/**
 * 로그아웃
 */
async function logout() {
    try {
        await firebase.auth().signOut();

        // localStorage 정리 (firebase_user로 통합됨)
        localStorage.removeItem('firebase_user');
        localStorage.removeItem('hairgator_profile_image');
        localStorage.removeItem('hairgator_brand_name');
        localStorage.removeItem('hairgator_brand_font');
        localStorage.removeItem('hairgator_brand_color_light');
        localStorage.removeItem('hairgator_brand_color_dark');

        // 전역 변수 초기화
        currentUser = null;
        window.currentDesigner = null;

        console.log('🔓 로그아웃 완료');

        // 로그인 페이지로 이동
        window.location.href = '/login.html';

    } catch (error) {
        console.error('❌ 로그아웃 실패:', error);
        if (typeof showToast === 'function') {
            showToast('로그아웃에 실패했습니다.', 'error');
        }
    }
}

/**
 * 불나비 앱을 통한 자동 로그인
 * 불나비 WebView에서 호출됨 - 기존 방식 유지
 */
async function loginWithBullnabi(userInfo) {
    try {
        console.log('불나비 자동 로그인 시작:', userInfo);

        // 사용자 변경 감지: 이전 사용자와 다르면 캐시 초기화
        const previousUser = localStorage.getItem('bullnabi_user');
        if (previousUser) {
            try {
                const prevUserInfo = JSON.parse(previousUser);
                const prevUserId = prevUserInfo.userId || prevUserInfo.id;
                const currentUserId = userInfo.userId || userInfo.id;

                if (prevUserId && currentUserId && prevUserId !== currentUserId) {
                    console.log('👤 사용자 변경 감지:', prevUserId, '→', currentUserId);
                    localStorage.removeItem('hairgator_profile_image');
                    localStorage.removeItem('hairgator_brand_name');
                    localStorage.removeItem('hairgator_brand_font');
                    localStorage.removeItem('hairgator_brand_color_light');
                    localStorage.removeItem('hairgator_brand_color_dark');
                }
            } catch (e) {
                console.warn('이전 사용자 정보 파싱 실패:', e);
            }
        }

        // 불나비 사용자 정보 저장
        localStorage.setItem('bullnabi_user', JSON.stringify(userInfo));
        localStorage.setItem('bullnabi_login_time', new Date().getTime());

        // HAIRGATOR 기존 로그인 정보도 저장
        localStorage.setItem('designerName', userInfo.name || '불나비 사용자');
        localStorage.setItem('designerPhone', '0000');
        localStorage.setItem('loginTime', new Date().getTime());

        const userId = userInfo.userId || userInfo.id;

        // Firebase Firestore에서 토큰 잔액 조회/생성
        let tokenBalance = 200;
        let userPlan = 'free';

        if (window.db && userId) {
            try {
                const userRef = window.db.collection('users').doc(userId);
                const userDoc = await userRef.get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    tokenBalance = userData.tokenBalance ?? 200;
                    userPlan = userData.plan || 'free';

                    // 마지막 로그인 시간 업데이트
                    await userRef.update({
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                        displayName: userInfo.name || userData.displayName,
                        email: userInfo.email || userData.email
                    });
                } else {
                    // 신규 사용자 - Firestore에 생성
                    await userRef.set({
                        uid: userId,
                        email: userInfo.email || '',
                        displayName: userInfo.name || '불나비 사용자',
                        provider: 'bullnabi',
                        tokenBalance: 200,
                        plan: 'free',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('👤 신규 불나비 사용자 생성:', userId);
                }
            } catch (firestoreError) {
                console.warn('⚠️ Firestore 사용자 조회 실패:', firestoreError);
            }
        }

        // 화면 전환
        const loginScreen = document.getElementById('loginScreen');
        const genderSelection = document.getElementById('genderSelection');

        if (loginScreen) {
            loginScreen.style.display = 'none';
            loginScreen.style.visibility = 'hidden';
            loginScreen.style.opacity = '0';
            loginScreen.classList.remove('active');
        }

        if (genderSelection) {
            genderSelection.style.display = 'flex';
            genderSelection.style.visibility = 'visible';
            genderSelection.style.opacity = '1';
            genderSelection.classList.add('active');
        }

        // 디자이너 이름 표시
        const designerNameDisplay = document.getElementById('designerNameDisplay');
        if (designerNameDisplay) {
            designerNameDisplay.textContent = userInfo.name || '불나비 사용자';
        }

        // window.currentDesigner 호환성
        window.currentDesigner = {
            id: userId,
            name: userInfo.name,
            email: userInfo.email,
            phone: userInfo.phone || '0000',
            tokens: 0, // 레거시 (불나비 remainCount)
            tokenBalance: tokenBalance,
            plan: userPlan,
            isBullnabiUser: true
        };

        // localStorage에도 토큰 정보 저장
        const storedUser = JSON.parse(localStorage.getItem('bullnabi_user') || '{}');
        storedUser.tokenBalance = tokenBalance;
        storedUser.plan = userPlan;
        localStorage.setItem('bullnabi_user', JSON.stringify(storedUser));

        // UI 업데이트
        if (typeof window.updateLoginInfo === 'function') {
            window.updateLoginInfo();
        }

        // 토큰 표시 업데이트
        if (window.FirebaseBridge) {
            window.FirebaseBridge.updateTokenDisplay(tokenBalance, userPlan);
        }

        // 사용자 설정 로드 (테마, 언어)
        if (typeof window.loadUserSettingsFromFirebase === 'function') {
            window.loadUserSettingsFromFirebase().then(settings => {
                if (settings) {
                    console.log('⚙️ 사용자 설정 복원 완료:', settings);
                }
            });
        }

        console.log('✅ 불나비 자동 로그인 완료:', userInfo.name, '토큰:', tokenBalance);

        // 환영 메시지는 updateUIAfterLogin()에서 처리 (중복 방지)

    } catch (error) {
        console.error('불나비 자동 로그인 실패:', error);

        const loginScreen = document.getElementById('loginScreen');
        const genderSelection = document.getElementById('genderSelection');

        if (loginScreen) {
            loginScreen.style.display = 'flex';
            loginScreen.classList.add('active');
        }

        if (genderSelection) {
            genderSelection.style.display = 'none';
            genderSelection.classList.remove('active');
        }

        if (typeof showToast === 'function') {
            showToast('자동 로그인에 실패했습니다.', 'error');
        }
    }
}

/**
 * 사용자 ID 조회 (여러 페이지에서 사용)
 */
function getCurrentUserId() {
    if (window.currentDesigner?.id) {
        return window.currentDesigner.id;
    }

    const user = getFirebaseUser();
    return user?.uid || null;
}

/**
 * 인증 여부 확인
 */
function isAuthenticated() {
    return !!getFirebaseUser();
}

/**
 * 인증 초기화 완료 여부
 */
function isAuthInitialized() {
    return authInitialized;
}

// 전역 함수 노출
window.loginWithBullnabi = loginWithBullnabi; // 호환성
window.getBullnabiUser = getBullnabiUser; // 호환성
window.getFirebaseUser = getFirebaseUser;
window.getCurrentUserId = getCurrentUserId;
window.isAuthenticated = isAuthenticated;
window.isAuthInitialized = isAuthInitialized;
window.logout = logout;

console.log('🔐 HAIRGATOR Firebase Auth 시스템 로드 완료');
