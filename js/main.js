// ========== HAIRGATOR 메인 시스템 ==========
let db = null;
let storage = null;
let currentGender = null;
let currentMainTab = null;
let currentSubTab = 'None';

// DOM 로드 완료시 실행
window.addEventListener('DOMContentLoaded', async () => {
    console.log('HAIRGATOR Starting...');
    
    // Firebase 초기화
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    db = firebase.firestore();
    storage = firebase.storage();
    
    // 오프라인 지원
    try {
        await db.enablePersistence({ synchronizeTabs: true });
        console.log('Firebase 오프라인 지원 활성화');
    } catch (err) {
        console.log('오프라인 지원 오류:', err.code);
    }
    
    console.log('Firebase connected');
    console.log('HAIRGATOR Ready!');
    
    // 자동 로그인 체크
    checkAutoLogin();
});

// 자동 로그인 체크
function checkAutoLogin() {
    const savedDesigner = localStorage.getItem('designerName');
    const savedPhone = localStorage.getItem('designerPhone');
    const savedPassword = localStorage.getItem('designerPassword');
    const loginTime = localStorage.getItem('loginTime');
    
    if (savedDesigner && savedPhone && savedPassword && loginTime) {
        const now = new Date().getTime();
        const timeDiff = now - parseInt(loginTime);
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // 24시간 이내면 자동 로그인
        if (hoursDiff < 24) {
            console.log('자동 로그인 실행');
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('genderSelection').classList.add('active');
            
            // 디자이너 이름 표시
            if (document.getElementById('designerNameDisplay')) {
                document.getElementById('designerNameDisplay').textContent = savedDesigner;
            }
        } else {
            // 24시간 지나면 로그인 정보 삭제
            localStorage.removeItem('designerName');
            localStorage.removeItem('designerPhone');
            localStorage.removeItem('designerPassword');
            localStorage.removeItem('loginTime');
            console.log('로그인 만료 - 다시 로그인 필요');
        }
    }
}

// 테마 전환
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// 저장된 테마 적용
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.add(`${savedTheme}-theme`);
});

// 뒤로 가기
function goBack() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('genderSelection').classList.add('active');
}

// 사이드 메뉴 열기
function openSideMenu() {
    document.getElementById('sideMenu').classList.add('active');
}

// 사이드 메뉴 닫기
function closeSideMenu() {
    document.getElementById('sideMenu').classList.remove('active');
}

// 로그아웃
function logout() {
    localStorage.clear();
    location.reload();
}

// 고객 관리 표시
function showCustomerForm() {
    closeSideMenu();
    alert('고객 관리 기능 준비중');
}

// 통계 표시
function showStats() {
    closeSideMenu();
    alert('통계 기능 준비중');
}

// 스타일 모달 열기
function openStyleModal(style) {
    document.getElementById('modalImage').src = style.imageUrl || '';
    document.getElementById('modalTitle').textContent = style.name || '';
    document.getElementById('modalCode').textContent = style.code || '';
    document.getElementById('modalDescription').textContent = style.description || '';
    document.getElementById('styleModal').classList.add('active');
}

// 스타일 모달 닫기
function closeStyleModal() {
    document.getElementById('styleModal').classList.remove('active');
}
