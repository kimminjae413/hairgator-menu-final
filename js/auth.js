// ========== Firebase Auth 인증 시스템 ==========
// 2025-12-27: 불나비 → Firebase Auth 전환

// 인증 상태 변수
let currentUser = null;
let authInitialized = false;

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
                // 메인 페이지에서는 로그인 화면 표시
                showLoginScreen();
            }
        }
    });
}

/**
 * 사용자 로그인 처리
 */
async function handleUserLogin(user) {
    try {
        // Firestore에서 사용자 추가 정보 로드
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();

        let userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || '사용자',
            photoURL: user.photoURL,
            provider: user.providerData[0]?.providerId || 'unknown',
            tokenBalance: 200,
            plan: 'free'
        };

        if (userDoc.exists) {
            const firestoreData = userDoc.data();
            userData = { ...userData, ...firestoreData };
        } else {
            // 신규 사용자 - Firestore에 저장
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: userData.displayName,
                photoURL: user.photoURL,
                provider: userData.provider,
                tokenBalance: 200,
                plan: 'free',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('👤 신규 사용자 생성:', user.uid);
        }

        // 마지막 로그인 시간 업데이트
        await db.collection('users').doc(user.uid).update({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {}); // 실패해도 무시

        // localStorage에 사용자 정보 캐시 (오프라인 지원)
        localStorage.setItem('hairgator_user', JSON.stringify({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            provider: userData.provider,
            tokenBalance: userData.tokenBalance,
            plan: userData.plan,
            loginTime: Date.now()
        }));

        // window.currentDesigner 호환성 유지
        window.currentDesigner = {
            id: userData.uid,
            name: userData.displayName,
            email: userData.email,
            phone: '0000',
            tokens: 0, // 레거시
            tokenBalance: userData.tokenBalance,
            plan: userData.plan,
            isFirebaseUser: true
        };

        // UI 업데이트
        updateUIAfterLogin(userData);

        // 토큰 표시 업데이트
        if (window.FirebaseBridge) {
            window.FirebaseBridge.updateTokenDisplay(userData.tokenBalance, userData.plan);
        }

        // 사용자 설정 로드 (테마, 언어)
        if (typeof window.loadUserSettingsFromFirebase === 'function') {
            window.loadUserSettingsFromFirebase().then(settings => {
                if (settings) {
                    console.log('⚙️ 사용자 설정 복원 완료:', settings);
                }
            });
        }

        console.log('✅ 사용자 로그인 처리 완료:', userData.displayName, '토큰:', userData.tokenBalance);

    } catch (error) {
        console.error('❌ 사용자 로그인 처리 실패:', error);
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

    // localStorage 캐시 확인
    try {
        const cached = localStorage.getItem('hairgator_user');
        if (cached) {
            const userData = JSON.parse(cached);
            // 24시간 세션 체크
            if (userData.loginTime && (Date.now() - userData.loginTime) < 24 * 60 * 60 * 1000) {
                return userData;
            } else {
                localStorage.removeItem('hairgator_user');
            }
        }
    } catch (e) {
        console.warn('캐시 사용자 정보 파싱 실패:', e);
    }

    return null;
}

/**
 * 불나비 호환 - getBullnabiUser() 대체
 */
function getBullnabiUser() {
    const user = getFirebaseUser();
    if (!user) return null;

    // 불나비 형식으로 변환
    return {
        userId: user.uid,
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || '사용자',
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

        // localStorage 정리
        localStorage.removeItem('hairgator_user');
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

        // 환영 메시지
        if (typeof showToast === 'function') {
            showToast(`${userInfo.name}님 환영합니다!`, 'success');
        }

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
