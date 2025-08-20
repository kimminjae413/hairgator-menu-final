// ========== 인증 시스템 ==========
// 로그인 폼 처리
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('designerName').value;
    const phone = document.getElementById('phoneNumber').value;
    const password = document.getElementById('password').value;
    
    // 로그인 검증 (전화번호 길이 수정!)
    if (name && phone.length >= 12 && password.length === 4) { // 010-1234-5678 = 13자
        // localStorage에 저장 (hairgator_ 접두사 추가!)
        localStorage.setItem('hairgator_designerName', name);
        localStorage.setItem('hairgator_designerPhone', phone);
        localStorage.setItem('hairgator_designerPassword', password);
        localStorage.setItem('hairgator_loginTime', new Date().getTime());
        
        // 화면 전환 (올바른 클래스명 사용!)
        document.getElementById('loginScreen').classList.add('hidden'); // hidden 클래스 사용
        document.getElementById('genderSelection').style.display = 'flex'; // style 직접 변경
        
        // 디자이너 이름 표시
        if (document.getElementById('designerNameDisplay')) {
            document.getElementById('designerNameDisplay').textContent = name;
        }
        
        console.log('로그인 성공:', name);
    } else {
        alert('모든 정보를 정확히 입력해주세요\n전화번호: 010-1234-5678 형식\n비밀번호: 숫자 4자리');
    }
});

// 성별 선택
function selectGender(gender) {
    // body에 성별 클래스 추가
    document.body.classList.remove('gender-male', 'gender-female');
    document.body.classList.add(`gender-${gender}`);
    
    // 성별 저장
    currentGender = gender;
    localStorage.setItem('hairgator_selectedGender', gender); // 접두사 추가
    
    // 화면 전환 (올바른 요소명 사용!)
    document.getElementById('genderSelection').style.display = 'none';
    document.getElementById('menuContainer').classList.add('active'); // menuContainer 사용
    
    // 메뉴 로드 (함수명 확인 필요)
    if (typeof loadMenuData === 'function') {
        loadMenuData(gender); // 실제 함수명 사용
    }
}
