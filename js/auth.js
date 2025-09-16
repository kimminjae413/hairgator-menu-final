// ========== 인증 시스템 ==========

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 폼 처리
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('designerName').value;
            const phone = document.getElementById('phoneNumber').value;
            const password = document.getElementById('password').value;
            
            // 로그인 검증
            if (name && phone.length === 4 && password.length === 4) {
                // localStorage에 저장 (24시간 유지)
                localStorage.setItem('designerName', name);
                localStorage.setItem('designerPhone', phone);
                localStorage.setItem('designerPassword', password);
                localStorage.setItem('loginTime', new Date().getTime());
                
                // 화면 전환
                document.getElementById('loginScreen').classList.remove('active');
                document.getElementById('genderSelection').classList.add('active');
                
                // 디자이너 이름 표시
                if (document.getElementById('designerNameDisplay')) {
                    document.getElementById('designerNameDisplay').textContent = name;
                }
                
                console.log('로그인 성공:', name);
            } else {
                alert('모든 정보를 정확히 입력해주세요');
            }
        });
    }
    
    // 기존 불나비 세션이 있는지 확인
    const bullnabiUser = getBullnabiUser();
    if (bullnabiUser) {
        console.log('기존 불나비 세션 복원:', bullnabiUser.name);
        // 자동 로그인 처리는 하지 않고 정보만 복원
        // 사용자가 직접 성별 선택부터 시작하도록 함
    }
});

// 성별 선택
function selectGender(gender) {
    // body에 성별 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 성별 저장
    currentGender = gender;
    localStorage.setItem('selectedGender', gender);
    
    // 화면 전환
    document.getElementById('genderSelection').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
    
    // 메뉴 로드
    loadMenuForGender(gender);
}

// ========== 불나비 연동 기능 추가 (기존 auth.js 파일 맨 끝에 추가) ==========

/**
 * 불나비 네이티브 앱을 통한 자동 로그인
 * @param {Object} userInfo - 불나비에서 전달받은 사용자 정보
 * @param {string} userInfo.id - 사용자 ID
 * @param {string} userInfo.name - 사용자 이름
 * @param {string} userInfo.email - 이메일
 * @param {number} userInfo.remainCount - 잔여 크레딧
 */
function loginWithBullnabi(userInfo) {
    try {
        console.log('불나비 자동 로그인 시작:', userInfo);
        
        // 불나비 사용자 정보 저장
        localStorage.setItem('bullnabi_user', JSON.stringify(userInfo));
        localStorage.setItem('bullnabi_login_time', new Date().getTime());
        
        // HAIRGATOR 기존 로그인 정보도 저장 (호환성)
        localStorage.setItem('designerName', userInfo.name || '불나비 사용자');
        localStorage.setItem('designerPhone', '0000'); // 더미값
        localStorage.setItem('loginTime', new Date().getTime());
        
        // 로그인 화면 건너뛰고 성별 선택으로 이동
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('genderSelection').style.display = 'flex';
        
        // 디자이너 이름 표시
        if (document.getElementById('designerNameDisplay')) {
            document.getElementById('designerNameDisplay').textContent = userInfo.name || '불나비 사용자';
        }
        
        // 권한 시스템에 사용자 정보 전달
        if (window.permissionManager) {
            window.permissionManager.currentUser = {
                id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                isBullnabiUser: true,
                credits: userInfo.remainCount || 0,
                loginTime: new Date()
            };
            window.permissionManager.updatePermissions();
        }
        
        // 토큰 시스템에 사용자 정보 전달
        if (window.onTokenSystemLogin) {
            window.onTokenSystemLogin({
                id: userInfo.id,
                name: userInfo.name,
                credits: userInfo.remainCount || 0,
                isBullnabiUser: true
            });
        }
        
        // 기존 currentDesigner 호환성 유지
        currentDesigner = {
            id: userInfo.id,
            name: userInfo.name,
            phone: '0000',
            tokens: userInfo.remainCount || 0,
            isBullnabiUser: true
        };
        
        // 사용자 정보 UI 업데이트
        if (typeof updateUserInfo === 'function') {
            updateUserInfo();
        }
        
        console.log('불나비 자동 로그인 완료:', userInfo.name);
        
        // 성공 알림
        if (typeof showToast === 'function') {
            showToast(`${userInfo.name}님 환영합니다! (크레딧: ${userInfo.remainCount || 0}개)`, 'success');
        }
        
    } catch (error) {
        console.error('불나비 자동 로그인 실패:', error);
        // 실패 시 기존 로그인 화면으로 돌아가기
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('genderSelection').style.display = 'none';
        
        if (typeof showToast === 'function') {
            showToast('자동 로그인에 실패했습니다. 수동 로그인을 시도해주세요.', 'error');
        }
    }
}

/**
 * 불나비 사용자 정보 조회
 * @returns {Object|null} 저장된 불나비 사용자 정보
 */
function getBullnabiUser() {
    try {
        const userStr = localStorage.getItem('bullnabi_user');
        if (userStr) {
            const userInfo = JSON.parse(userStr);
            const loginTime = localStorage.getItem('bullnabi_login_time');
            
            // 24시간 세션 체크
            if (loginTime && (Date.now() - parseInt(loginTime)) < 24 * 60 * 60 * 1000) {
                return userInfo;
            } else {
                // 세션 만료 시 정리
                localStorage.removeItem('bullnabi_user');
                localStorage.removeItem('bullnabi_login_time');
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('불나비 사용자 정보 조회 실패:', error);
        return null;
    }
}

// 전역 함수로 노출 (브릿지에서 사용)
window.loginWithBullnabi = loginWithBullnabi;
window.getBullnabiUser = getBullnabiUser;
