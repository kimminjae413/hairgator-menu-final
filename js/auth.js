// ========== 인증 관련 전역 변수 ==========
let currentDesigner = null;
let currentDesignerName = null;

// ========== 자동 로그인 체크 ==========
function checkAutoLogin() {
    const autoLoginData = localStorage.getItem('hairgator_autologin');
    
    if (autoLoginData) {
        try {
            const data = JSON.parse(autoLoginData);
            const now = new Date().getTime();
            
            // 24시간 체크 (86400000ms = 24시간)
            if (now - data.timestamp < 86400000) {
                currentDesigner = data.designerId;
                currentDesignerName = data.designerName;
                
                // 화면 전환
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('genderScreen').style.display = 'flex';
                
                // 디자이너 이름 업데이트
                updateDesignerDisplay();
                
                console.log('✅ Auto login successful:', currentDesignerName);
                return true;
            }
        } catch (e) {
            console.error('Auto login error:', e);
        }
        
        // 만료된 자동 로그인 삭제
        localStorage.removeItem('hairgator_autologin');
    }
    
    return false;
}

// ========== 로그인 처리 ==========
async function handleLogin() {
    const nameInput = document.getElementById('designerName');
    const phoneInput = document.getElementById('designerPhone');
    const pinInput = document.getElementById('designerPin');
    const autoLoginCheck = document.getElementById('autoLogin');
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const pin = pinInput.value.trim();
    
    // 유효성 검사
    if (!name) {
        alert('이름을 입력해주세요');
        nameInput.focus();
        return;
    }
    
    if (phone.length !== 4 || !/^\d{4}$/.test(phone)) {
        alert('휴대폰 끝 4자리를 정확히 입력해주세요');
        phoneInput.focus();
        return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        alert('비밀번호 4자리를 입력해주세요');
        pinInput.focus();
        return;
    }
    
    // 로딩 표시
    showLoading('로그인 중...');
    
    try {
        // 디자이너 ID 생성
        const designerId = `${name}_${phone}`;
        
        // Firebase에서 디자이너 확인
        const designerDoc = await db.collection('designers').doc(designerId).get();
        
        if (designerDoc.exists) {
            // 기존 디자이너
            const data = designerDoc.data();
            
            if (data.pin !== pin) {
                hideLoading();
                alert('비밀번호가 일치하지 않습니다');
                pinInput.focus();
                return;
            }
            
            console.log('✅ Existing designer login:', name);
        } else {
            // 신규 디자이너 등록
            await db.collection('designers').doc(designerId).set({
                name: name,
                phone: phone,
                pin: pin,
                createdAt: new Date(),
                lastLogin: new Date()
            });
            
            console.log('✅ New designer registered:', name);
        }
        
        // 로그인 성공
        currentDesigner = designerId;
        currentDesignerName = name;
        
        // 자동 로그인 설정
        if (autoLoginCheck.checked) {
            const loginData = {
                designerId: designerId,
                designerName: name,
                timestamp: new Date().getTime()
            };
            localStorage.setItem('hairgator_autologin', JSON.stringify(loginData));
        }
        
        // 마지막 로그인 시간 업데이트
        await db.collection('designers').doc(designerId).update({
            lastLogin: new Date()
        });
        
        // 화면 전환
        hideLoading();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('genderScreen').style.display = 'flex';
        
        // 디자이너 이름 업데이트
        updateDesignerDisplay();
        
        // 입력 필드 초기화
        nameInput.value = '';
        phoneInput.value = '';
        pinInput.value = '';
        autoLoginCheck.checked = false;
        
    } catch (error) {
        console.error('Login error:', error);
        hideLoading();
        alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// ========== 디자이너 정보 표시 업데이트 ==========
function updateDesignerDisplay() {
    if (currentDesignerName) {
        document.getElementById('headerDesigner').textContent = currentDesignerName;
        document.getElementById('menuDesigner').textContent = currentDesignerName;
    }
}

// ========== 로그아웃 ==========
function logout() {
    if (!confirm('정말 로그아웃하시겠습니까?')) {
        return;
    }
    
    // 자동 로그인 삭제
    localStorage.removeItem('hairgator_autologin');
    
    // 전역 변수 초기화
    currentDesigner = null;
    currentDesignerName = null;
    currentGender = null;
    currentCategory = null;
    currentSubcategory = null;
    
    // 페이지 새로고침
    location.reload();
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    // 자동 로그인 체크
    if (!checkAutoLogin()) {
        // 로그인 화면 표시
        document.getElementById('loginScreen').style.display = 'flex';
    }
    
    // 엔터키 처리
    const inputs = document.querySelectorAll('#loginScreen input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    });
});