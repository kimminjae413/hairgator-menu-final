// ========== 인증 시스템 ==========

// 로그인 폼 처리
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

// 성별 선택 - ✅ 수정된 부분
function selectGender(gender) {
    console.log(`🚀 성별 선택: ${gender}`);
    
    // body에 성별 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 성별 저장
    currentGender = gender;
    localStorage.setItem('selectedGender', gender);
    
    // 화면 전환 - ✅ mainMenu → menuContainer로 수정
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    
    if (genderSelection) {
        genderSelection.classList.remove('active');
        genderSelection.style.display = 'none';
    }
    
    if (menuContainer) {
        menuContainer.classList.add('active');
        menuContainer.style.display = 'flex';
    }
    
    // 뒤로가기 버튼 표시
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.style.display = 'flex';
    }
    
    // ✅ 메뉴 로드 - window.loadMenuForGender 확인 후 호출
    if (typeof window.loadMenuForGender === 'function') {
        console.log('🔄 Firebase 메뉴 로드 시작...');
        window.loadMenuForGender(gender);
    } else if (typeof loadMenuForGender === 'function') {
        console.log('🔄 Firebase 메뉴 로드 시작...');
        loadMenuForGender(gender);
    } else {
        console.error('❌ loadMenuForGender 함수를 찾을 수 없습니다');
        // 3초 후 재시도
        setTimeout(() => {
            if (typeof window.loadMenuForGender === 'function') {
                window.loadMenuForGender(gender);
            }
        }, 3000);
    }
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
        console.log('🚀 불나비 자동 로그인 시작:', userInfo);
        
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
        
        console.log('✅ 불나비 자동 로그인 완료');
        
    } catch (error) {
        console.error('❌ 불나비 로그인 오류:', error);
        // 오류 시 일반 로그인 화면으로 이동
        document.getElementById('loginScreen').style.display = 'flex';
    }
}

/**
 * 앱에서 크레딧 차감 함수 호출
 * @param {number} amount - 차감할 크레딧 수
 * @returns {boolean} - 성공 여부
 */
function consumeCredits(amount) {
    try {
        if (typeof window.Android !== 'undefined' && window.Android.consumeCredits) {
            return window.Android.consumeCredits(amount);
        } else if (typeof window.webkit !== 'undefined' && 
                   window.webkit.messageHandlers && 
                   window.webkit.messageHandlers.consumeCredits) {
            window.webkit.messageHandlers.consumeCredits.postMessage({amount: amount});
            return true;
        } else {
            console.warn('네이티브 앱 연동이 불가능합니다. 크레딧 차감을 건너뜁니다.');
            return false;
        }
    } catch (error) {
        console.error('크레딧 차감 오류:', error);
        return false;
    }
}

// 전역 함수로 등록 (HTML에서 호출 가능하도록)
window.selectGender = selectGender;
window.loginWithBullnabi = loginWithBullnabi;
window.consumeCredits = consumeCredits;
