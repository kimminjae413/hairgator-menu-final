// ========== 인증 시스템 ==========

// 페이지 로드 시 저장된 로그인 정보 불러오기
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 저장된 로그인 정보 확인 중...');
    
    // 저장된 정보 불러오기
    const savedName = localStorage.getItem('hairgator_designerName');
    const savedPhone = localStorage.getItem('hairgator_designerPhone');
    
    if (savedName && savedPhone) {
        const nameInput = document.getElementById('designerName');
        const phoneInput = document.getElementById('phoneNumber');
        const rememberInfo = document.getElementById('rememberInfo');
        
        if (nameInput && phoneInput) {
            nameInput.value = savedName;
            phoneInput.value = savedPhone;
            
            // 안내 메시지 표시
            if (rememberInfo) {
                rememberInfo.style.display = 'block';
                rememberInfo.innerHTML = '<span style="color: #4CAF50;">💾 저장된 정보로 간편 로그인 가능</span>';
            }
            
            console.log('✅ 저장된 로그인 정보 자동 복원:', savedName);
        }
    } else {
        console.log('ℹ️ 저장된 로그인 정보 없음');
    }
});

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
