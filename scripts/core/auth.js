// scripts/core/auth.js - Firebase 연결 필수 인증 시스템

// 전역 변수
window.currentUser = null;

// Firebase 연결 상태 확인
function checkFirebaseConnection() {
    if (!window.db) {
        console.error('❌ Firebase가 초기화되지 않았습니다');
        throw new Error('시스템 연결에 실패했습니다.\n\n다음을 확인해주세요:\n1. 인터넷 연결 상태\n2. 브라우저 새로고침\n3. 잠시 후 다시 시도');
    }
    return true;
}

// 로그인/가입 통합 처리
async function loginOrRegister(name, phone, password) {
    try {
        console.log('🔐 로그인/가입 시도:', name, phone);
        
        // Firebase 연결 필수 확인
        checkFirebaseConnection();

        // 입력값 검증
        if (!validateInput(name, phone, password)) {
            return false;
        }

        // Firebase에서 사용자 확인
        const existingUser = await findUser(phone);
        
        if (existingUser) {
            // 기존 사용자 로그인
            return await handleExistingUser(existingUser, name, password);
        } else {
            // 신규 사용자 가입
            return await handleNewUser(name, phone, password);
        }

    } catch (error) {
        console.error('❌ 로그인/가입 실패:', error);
        
        // Firebase 관련 오류 메시지 개선
        if (error.code === 'permission-denied') {
            throw new Error('접근 권한이 없습니다.\n관리자에게 문의해주세요.');
        } else if (error.code === 'unavailable') {
            throw new Error('서버에 연결할 수 없습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.');
        } else if (error.message.includes('시스템 연결')) {
            // 이미 사용자 친화적 메시지
            throw error;
        } else {
            throw new Error('로그인 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
        }
    }
}

// 입력값 검증
function validateInput(name, phone, password) {
    if (!name || name.length < 2) {
        throw new Error('이름은 2글자 이상이어야 합니다.');
    }

    if (!phone || phone.length < 11) {
        throw new Error('올바른 전화번호를 입력해주세요.');
    }

    const phonePattern = /^010-\d{4}-\d{4}$/;
    if (!phonePattern.test(phone)) {
        throw new Error('전화번호는 010-1234-5678 형식이어야 합니다.');
    }

    if (!password || password.length !== 4) {
        throw new Error('비밀번호는 4자리 숫자여야 합니다.');
    }

    return true;
}

// Firebase에서 사용자 찾기
async function findUser(phone) {
    try {
        console.log('👤 사용자 조회:', phone);
        
        const querySnapshot = await window.db.collection('designers')
            .where('phone', '==', phone)
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            console.log('👤 신규 사용자:', phone);
            return null;
        }

        const doc = querySnapshot.docs[0];
        console.log('👤 기존 사용자 발견:', doc.data().name);
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('사용자 조회 오류:', error);
        throw error;
    }
}

// 기존 사용자 로그인 처리
async function handleExistingUser(user, inputName, inputPassword) {
    // 이름 확인
    if (user.name !== inputName) {
        throw new Error(`등록된 이름과 다릅니다.\n등록명: ${user.name}`);
    }

    // 비밀번호 확인
    if (user.password !== inputPassword) {
        throw new Error('비밀번호가 올바르지 않습니다.');
    }

    // 계정 활성화 상태 확인
    if (user.isActive === false) {
        throw new Error('비활성화된 계정입니다.\n관리자에게 문의해주세요.');
    }

    // 로그인 성공
    window.currentUser = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        level: user.level || 1,
        tokens: user.tokens || 100,
        loginTime: Date.now(),
        isNewUser: false
    };

    // 마지막 로그인 시간 업데이트
    await updateLastLogin(user.id);

    // 세션 저장
    saveUserSession();

    console.log('✅ 기존 사용자 로그인 성공:', user.name);
    showToast(`${user.name}님, 안녕하세요!\n다시 오신 것을 환영합니다! 🎉`, 'success', 3000);
    
    return true;
}

// 신규 사용자 가입 처리
async function handleNewUser(name, phone, password) {
    try {
        // 신규 사용자 등록 확인
        const confirmMessage = `${name}님, 처음 가입하시는군요!\n\nHAIRGATOR에 오신 것을 환영합니다! 🎉\n\n가입하시겠습니까?`;
        
        if (!confirm(confirmMessage)) {
            throw new Error('가입이 취소되었습니다.');
        }

        console.log('🆕 신규 사용자 생성:', name);

        // Firebase에 신규 사용자 생성
        const newUserData = {
            name: name,
            phone: phone,
            password: password, // 실제로는 해시화해야 함
            level: 1,
            tokens: 100, // 기본 토큰
            joinedAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
            totalLogins: 1
        };

        const docRef = await window.db.collection('designers').add(newUserData);
        
        console.log('✅ 신규 사용자 생성 완료:', docRef.id);

        // 로그인 상태 설정
        window.currentUser = {
            id: docRef.id,
            name: name,
            phone: phone,
            level: 1,
            tokens: 100,
            loginTime: Date.now(),
            isNewUser: true
        };

        // 세션 저장
        saveUserSession();

        showToast(`${name}님, HAIRGATOR 가입을 환영합니다! 🚀\n기본 토큰 100개가 지급되었습니다!`, 'success', 4000);
        
        return true;

    } catch (error) {
        console.error('신규 사용자 등록 실패:', error);
        throw error;
    }
}

// 마지막 로그인 시간 업데이트
async function updateLastLogin(userId) {
    try {
        await window.db.collection('designers').doc(userId).update({
            lastLogin: new Date(),
            totalLogins: window.firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.warn('로그인 시간 업데이트 실패:', error);
        // 로그인 자체는 성공했으므로 에러 throw 하지 않음
    }
}

// 사용자 세션 저장
function saveUserSession() {
    try {
        const sessionData = {
            id: window.currentUser.id,
            name: window.currentUser.name,
            phone: window.currentUser.phone,
            level: window.currentUser.level,
            tokens: window.currentUser.tokens,
            loginTime: window.currentUser.loginTime,
            isNewUser: window.currentUser.isNewUser
        };

        localStorage.setItem('hairgator_user', JSON.stringify(sessionData));
        console.log('✅ 세션 저장 완료');
    } catch (error) {
        console.error('세션 저장 실패:', error);
    }
}

// 기존 세션 확인
function checkExistingSession() {
    try {
        const savedUser = localStorage.getItem('hairgator_user');
        if (!savedUser) return false;

        const userData = JSON.parse(savedUser);
        
        // 세션 만료 확인 (24시간)
        const sessionAge = Date.now() - userData.loginTime;
        if (sessionAge > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('hairgator_user');
            return false;
        }

        // 세션 복원
        window.currentUser = userData;
        console.log('✅ 기존 세션 복원:', window.currentUser.name);
        
        return true;

    } catch (error) {
        console.warn('세션 복원 실패:', error);
        localStorage.removeItem('hairgator_user');
        return false;
    }
}

// 로그아웃 처리
function logout() {
    window.currentUser = null;
    localStorage.removeItem('hairgator_user');
    localStorage.removeItem('hairgator_gender');
    
    console.log('✅ 로그아웃 완료');
    showToast('로그아웃되었습니다.', 'info');
    
    // 로그인 화면으로 이동
    showScreen('loginScreen');
}

// 권한 확인
function hasPermission(feature) {
    if (!window.currentUser) return false;
    
    // Level 2 사용자는 모든 권한
    if (window.currentUser.level >= 2) return true;
    
    // Level 1은 기본 권한만
    const basicFeatures = ['dashboard', 'favorites', 'history'];
    return basicFeatures.includes(feature);
}

// 화면 전환 유틸리티
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// 토스트 메시지 표시
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 전화번호 자동 포맷팅
function formatPhoneNumber(e) {
    const input = e.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 0 && !value.startsWith('010')) {
        if (value.startsWith('10')) {
            value = '0' + value;
        } else if (!value.startsWith('0')) {
            value = '010' + value;
        }
    }
    
    if (value.length >= 11) {
        value = value.substring(0, 11);
        value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (value.length >= 7) {
        value = value.replace(/(\d{3})(\d{4})(\d*)/, '$1-$2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d*)/, '$1-$2');
    }
    
    input.value = value;
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ 인증 시스템 초기화 완료');
    
    // Firebase 연결 대기 (최대 5초)
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.db) {
            // Firebase 연결 성공
            clearInterval(checkInterval);
            console.log('🔥 Firebase 연결 확인됨');
            
            // 기존 세션 확인
            if (checkExistingSession()) {
                showScreen('genderSelection');
                updateWelcomeMessage();
            }
        } else if (attempts >= 10) {
            // 5초 후에도 연결 실패
            clearInterval(checkInterval);
            console.error('❌ Firebase 연결 타임아웃');
            showToast('시스템 연결에 실패했습니다.\n페이지를 새로고침해주세요.', 'error', 10000);
        }
    }, 500);
    
    // 로그인 폼 처리
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // 전화번호 자동 포맷팅
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneNumber);
    }
    
    // 로그아웃 버튼 처리
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('로그아웃 하시겠습니까?')) {
                logout();
            }
        });
    }
});

// 로그인 폼 제출 처리
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('designerName');
    const phoneInput = document.getElementById('phoneNumber');
    const passwordInput = document.getElementById('password');
    
    try {
        setLoginLoading(true);
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value.trim();
        
        // 로그인/가입 시도
        await loginOrRegister(name, phone, password);
        
        // 성공: 성별 선택 화면으로
        showScreen('genderSelection');
        updateWelcomeMessage();
        
    } catch (error) {
        showToast(error.message, 'error', 5000);
    } finally {
        setLoginLoading(false);
    }
}

// 로그인 로딩 상태
function setLoginLoading(isLoading) {
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoading = loginBtn.querySelector('.btn-loading');
    
    if (isLoading) {
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
    } else {
        loginBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
    }
}

// 환영 메시지 업데이트
function updateWelcomeMessage() {
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName && window.currentUser) {
        welcomeName.textContent = window.currentUser.name;
        
        // 신규 사용자면 특별 메시지
        if (window.currentUser.isNewUser) {
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.textContent = 'HAIRGATOR에 오신 것을 환영합니다! 🎉';
            }
        }
    }
}

// 성별 선택 처리
function selectGender(gender) {
    if (!window.currentUser) {
        showToast('로그인이 필요합니다.', 'error');
        showScreen('loginScreen');
        return;
    }
    
    localStorage.setItem('hairgator_gender', gender);
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    showScreen('menuContainer');
    
    console.log('✅ 성별 선택:', gender);
    showToast(`${gender === 'male' ? '남성' : '여성'} 메뉴로 이동합니다.`, 'success');
}

// 뒤로가기 처리
function goBack() {
    showScreen('genderSelection');
}

// 전역 함수 등록 (기존 코드 호환성)
window.login = loginOrRegister;
window.loginOrRegister = loginOrRegister;
window.logout = logout;
window.hasPermission = hasPermission;
window.selectGender = selectGender;
window.goBack = goBack;
window.showToast = showToast;

console.log('✅ Firebase 필수 연동 Auth 시스템 로드 완료');
