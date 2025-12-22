// ========== 인증 시스템 ==========

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    /* ========== 로그인 폼 처리 (백업용 - 불나비 자동 로그인 사용으로 비활성화) ==========
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
    ========== 로그인 폼 처리 종료 ========== */

    // 기존 불나비 세션이 있는지 확인
    const bullnabiUser = getBullnabiUser();
    if (bullnabiUser) {
        console.log('기존 불나비 세션 복원:', bullnabiUser.name);
    }

    // ⚠️ 성별 버튼 이벤트 리스너 제거 (중복 호출 방지)
    // index.html의 onclick="selectGender()" 만 사용

    // ⭐ 성별 선택 화면 번역 적용
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

    console.log('✅ 인증 시스템 초기화 완료 (불나비 자동 로그인 전용)');
});

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
            tokens: userInfo.remainCount || 0, // 레거시: 불나비 회수
            tokenBalance: 0, // 신규: 헤어게이터 토큰
            isBullnabiUser: true
        };

        // UI 업데이트
        if (typeof updateUserInfo === 'function') {
            updateUserInfo();
        }

        // ⭐ 사이드바 로그인 정보 업데이트
        if (typeof window.updateLoginInfo === 'function') {
            window.updateLoginInfo();
        }

        console.log('불나비 자동 로그인 완료:', userInfo.name);

        // ⭐ Firebase에서 사용자 설정 (테마, 언어) 로드
        if (typeof window.loadUserSettingsFromFirebase === 'function') {
            window.loadUserSettingsFromFirebase().then(settings => {
                if (settings) {
                    console.log('⚙️ 사용자 설정 복원 완료:', settings);
                }
            });
        }

        // ⭐ 헤어게이터 토큰 잔액 조회 (Firebase user_tokens)
        try {
            const userId = userInfo.userId || userInfo.id;
            if (userId) {
                const tokenResponse = await fetch('/.netlify/functions/token-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'getBalance',
                        userId: userId
                    })
                });
                const tokenResult = await tokenResponse.json();
                if (tokenResult.success) {
                    window.currentDesigner.tokenBalance = tokenResult.tokenBalance;
                    userInfo.tokenBalance = tokenResult.tokenBalance;

                    // localStorage에도 저장
                    const storedUser = JSON.parse(localStorage.getItem('bullnabi_user') || '{}');
                    storedUser.tokenBalance = tokenResult.tokenBalance;
                    localStorage.setItem('bullnabi_user', JSON.stringify(storedUser));

                    console.log('💰 헤어게이터 토큰 잔액:', tokenResult.tokenBalance);
                }
            }
        } catch (tokenError) {
            console.warn('⚠️ 토큰 잔액 조회 실패:', tokenError);
        }

        // 성공 알림 (헤어게이터 토큰 표시)
        if (typeof showToast === 'function') {
            const tokenBalance = window.currentDesigner.tokenBalance || 0;
            showToast(`${userInfo.name}님 환영합니다! (토큰: ${tokenBalance.toLocaleString()})`, 'success');
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

console.log('🔐 HAIRGATOR 인증 시스템 로드 완료');
