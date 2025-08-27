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
