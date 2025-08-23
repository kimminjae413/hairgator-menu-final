// scripts/core/auth.js - 간단한 로그인 시스템

// 전역 변수
window.currentUser = null;

// 간단한 사용자 데이터베이스 (나중에 Firebase로 대체 가능)
const USERS_DB = [
    { name: '김디자이너', phone: '010-1234-5678', password: '1234', level: 2 },
    { name: '이디자이너', phone: '010-5678-9012', password: '5678', level: 1 },
    { name: '박디자이너', phone: '010-9999-8888', password: '9999', level: 1 },
    // 테스트용 사용자들 - 실제로는 Firebase에서 관리
];

// 로그인 처리
async function login(name, phone, password) {
    try {
        console.log('로그인 시도:', name, phone);
        
        // 입력값 검증
        if (!name || !phone || !password) {
            throw new Error('모든 필드를 입력해주세요.');
        }

        if (name.length < 2) {
            throw new Error('이름은 2글자 이상이어야 합니다.');
        }

        if (phone.length < 11 || phone.length > 13) {
            throw new Error('올바른 전화번호를 입력해주세요.');
        }

        // 전화번호 형식 검증
        const phonePattern = /^010-\d{4}-\d{4}$/;
        if (!phonePattern.test(phone)) {
            throw new Error('전화번호는 010-1234-5678 형식이어야 합니다.');
        }

        if (password.length !== 4) {
            throw new Error('비밀번호는 4자리여야 합니다.');
        }

        // 사용자 찾기 (간단한 방식)
        const user = USERS_DB.find(u => 
            u.name === name && 
            u.phone === phone && 
            u.password === password
        );

        if (!user) {
            throw new Error('로그인 정보가 올바르지 않습니다.');
        }

        // 로그인 성공
        window.currentUser = {
            name: user.name,
            phone: user.phone,
            level: user.level,
            loginTime: new Date().getTime()
        };

        // 세션 저장
        localStorage.setItem('hairgator_user', JSON.stringify(window.currentUser));
        
        console.log('✅ 로그인 성공:', window.currentUser);
        return true;

    } catch (error) {
        console.error('❌ 로그인 실패:', error.message);
        throw error;
    }
}

// 로그아웃 처리
function logout() {
    window.currentUser = null;
    localStorage.removeItem('hairgator_user');
    localStorage.removeItem('hairgator_gender');
    
    console.log('✅ 로그아웃 완료');
    
    // 로그인 화면으로 이동
    showScreen('loginScreen');
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
    // 모든 화면 숨김
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    // 선택한 화면 표시
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

// 로그인 폼 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ 인증 시스템 초기화 완료');
    
    // 기존 세션 확인
    if (checkExistingSession()) {
        // 세션이 있으면 성별 선택으로 이동
        showScreen('genderSelection');
        updateWelcomeMessage();
    }
    
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
    const loginBtn = document.getElementById('loginBtn');
    
    try {
        // 로딩 상태 표시
        setLoginLoading(true);
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value.trim();
        
        // 로그인 시도
        await login(name, phone, password);
        
        // 성공: 성별 선택 화면으로
        showScreen('genderSelection');
        updateWelcomeMessage();
        
        showToast('로그인되었습니다!', 'success');
        
    } catch (error) {
        // 실패: 에러 메시지 표시
        showToast(error.message, 'error');
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
    }
}

// 성별 선택 처리
function selectGender(gender) {
    if (!window.currentUser) {
        showToast('로그인이 필요합니다.', 'error');
        showScreen('loginScreen');
        return;
    }
    
    // 성별 저장
    localStorage.setItem('hairgator_gender', gender);
    
    // body 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 메뉴 화면으로 전환
    showScreen('menuContainer');
    
    console.log('✅ 성별 선택:', gender);
    showToast(`${gender === 'male' ? '남성' : '여성'} 메뉴로 이동합니다.`, 'success');
}

// 뒤로가기 처리
function goBack() {
    showScreen('genderSelection');
}

// 전화번호 자동 포맷팅
function formatPhoneNumber(e) {
    const input = e.target;
    let value = input.value.replace(/\D/g, ''); // 숫자만 추출
    
    // 010으로 시작하지 않으면 010 자동 추가
    if (value.length > 0 && !value.startsWith('010')) {
        if (value.startsWith('10')) {
            value = '0' + value;
        } else if (!value.startsWith('0')) {
            value = '010' + value;
        }
    }
    
    // 포맷팅: 010-1234-5678
    if (value.length >= 11) {
        value = value.substring(0, 11); // 최대 11자리
        value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (value.length >= 7) {
        value = value.replace(/(\d{3})(\d{4})(\d*)/, '$1-$2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d*)/, '$1-$2');
    }
    
    input.value = value;
}

// 전역 함수로 등록
window.login = login;
window.logout = logout;
window.hasPermission = hasPermission;
window.selectGender = selectGender;
window.goBack = goBack;
window.showToast = showToast;

console.log('✅ Auth 시스템 로드 완료');
