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
    }
    
    // 성별 버튼 이벤트 리스너 추가
    const maleBtn = document.querySelector('.gender-btn.male');
    const femaleBtn = document.querySelector('.gender-btn.female');
    
    if (maleBtn) {
        maleBtn.addEventListener('click', () => selectGender('male'));
    }
    
    if (femaleBtn) {
        femaleBtn.addEventListener('click', () => selectGender('female'));
    }
});

// ========== 전역 함수 ==========

// 성별 선택
function selectGender(gender) {
    console.log('🎯 성별 선택:', gender);
    
    // body에 성별 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);

    // 성별 저장
    window.currentGender = gender;
    localStorage.setItem('selectedGender', gender);

    // 성별 선택 화면 완전히 숨기기 (cssText로 강제 적용)
    const genderSelection = document.getElementById('genderSelection');
    if (genderSelection) {
        genderSelection.style.cssText = 'display: none !important; opacity: 0; visibility: hidden; position: absolute; z-index: -1;';
        genderSelection.classList.remove('active');
    }

    // 메뉴 컨테이너 완전히 보이기 (cssText로 강제 적용)
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
        menuContainer.style.cssText = 'display: block !important; opacity: 1; visibility: visible; position: relative; z-index: 1;';
        menuContainer.classList.add('active');
    }

    // 메뉴 로드
    if (typeof loadMenuForGender === 'function') {
        loadMenuForGender(gender);
        
        // 메뉴 로드 후 중복 탭 제거 (500ms 대기)
        setTimeout(() => {
            removeDuplicateTabs();
        }, 500);
    } else {
        console.error('❌ loadMenuForGender 함수를 찾을 수 없습니다');
    }
}

// 대분류 탭 중복 제거
function removeDuplicateTabs() {
    const categoryTabs = document.getElementById('categoryTabs');
    if (!categoryTabs) return;
    
    const allTabs = Array.from(categoryTabs.children);
    const totalTabs = allTabs.length;
    
    // 탭이 중복된 경우에만 제거
    if (totalTabs > 7) {
        console.log('🔧 중복 탭 제거 시작, 총:', totalTabs);
        
        // 절반만 남기고 나머지 제거
        const half = Math.floor(totalTabs / 2);
        for (let i = half; i < totalTabs; i++) {
            if (allTabs[i]) {
                allTabs[i].remove();
            }
        }
        
        console.log('✅ 중복 제거 완료, 남은 탭:', categoryTabs.children.length);
    }
}

// ========== 불나비 연동 기능 ==========

/**
 * 불나비 네이티브 앱을 통한 자동 로그인
 */
function loginWithBullnabi(userInfo) {
    try {
        console.log('불나비 자동 로그인 시작:', userInfo);
        
        // 불나비 사용자 정보 저장
        localStorage.setItem('bullnabi_user', JSON.stringify(userInfo));
        localStorage.setItem('bullnabi_login_time', new Date().getTime());
        
        // HAIRGATOR 기존 로그인 정보도 저장
        localStorage.setItem('designerName', userInfo.name || '불나비 사용자');
        localStorage.setItem('designerPhone', '0000');
        localStorage.setItem('loginTime', new Date().getTime());
        
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
        
        // 권한 시스템
        if (window.permissionManager) {
            window.permissionManager.currentUser = {
                id: userInfo.userId || userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                isBullnabiUser: true,
                credits: userInfo.remainCount || 0,
                loginTime: new Date()
            };
            window.permissionManager.updatePermissions();
        }
        
        // 토큰 시스템
        if (window.onTokenSystemLogin) {
            window.onTokenSystemLogin({
                id: userInfo.userId || userInfo.id,
                name: userInfo.name,
                credits: userInfo.remainCount || 0,
                isBullnabiUser: true
            });
        }
        
        // currentDesigner 호환성
        window.currentDesigner = {
            id: userInfo.userId || userInfo.id,
            name: userInfo.name,
            phone: userInfo.phone || '0000',
            tokens: userInfo.remainCount || 0,
            isBullnabiUser: true
        };
        
        // UI 업데이트
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
 * 불나비 사용자 정보 조회
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

// 전역 함수 노출
window.loginWithBullnabi = loginWithBullnabi;
window.getBullnabiUser = getBullnabiUser;
window.selectGender = selectGender;

// menu.js의 selectGender를 강제로 덮어쓰기
window.selectGender = selectGender;
console.log('✅ auth.js selectGender로 덮어쓰기 완료');

