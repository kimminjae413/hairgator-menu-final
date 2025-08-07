// ========== 로딩 관리 ==========
function showLoading(message = '로딩 중...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('p').textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 HAIRGATOR Starting...');
    
    // 테마 적용
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // 가로 모드 체크
    checkOrientation();
    
    // Firebase 연결 상태 체크
    checkFirebaseConnection();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('✅ HAIRGATOR Ready!');
});

// ========== 화면 방향 체크 ==========
function checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (window.innerWidth < 768 && !isLandscape) {
        // 모바일 세로 모드일 때 안내
        if (!document.getElementById('orientationNotice')) {
            const notice = document.createElement('div');
            notice.id = 'orientationNotice';
            notice.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-color);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                animation: slideUp 0.3s ease;
            `;
            notice.textContent = '📱 가로 모드로 전환하면 더 편하게 사용할 수 있습니다';
            document.body.appendChild(notice);
            
            setTimeout(() => {
                notice.remove();
            }, 5000);
        }
    }
}

// ========== Firebase 연결 체크 ==========
async function checkFirebaseConnection() {
    try {
        // 연결 테스트
        await db.collection('test').doc('connection').set({
            timestamp: new Date(),
            test: true
        });
        
        await db.collection('test').doc('connection').delete();
        
        console.log('✅ Firebase connected');
        
    } catch (error) {
        console.error('Firebase connection error:', error);
        
        // 오프라인 모드 안내
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff9800;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
        `;
        notice.textContent = '⚠️ 오프라인 모드로 작동 중입니다';
        document.body.appendChild(notice);
        
        setTimeout(() => {
            notice.remove();
        }, 3000);
    }
}

// ========== 이벤트 리스너 설정 ==========
function setupEventListeners() {
    // 화면 방향 변경 감지
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    
    // 모달 외부 클릭 시 닫기
    document.getElementById('styleModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeStyleModal();
        }
    });
    
    // 키보드 단축키
    document.addEventListener('keydown', function(e) {
        // ESC 키로 모달 닫기
        if (e.key === 'Escape') {
            closeStyleModal();
            toggleMenu(); // 메뉴가 열려있으면 닫기
        }
    });
    
    // 스와이프 제스처 (메뉴 열기)
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeDistance = touchStartX - touchEndX;
        
        // 왼쪽으로 스와이프 (메뉴 열기)
        if (swipeDistance > 50 && touchStartX > window.innerWidth - 50) {
            const menu = document.getElementById('slideMenu');
            const overlay = document.getElementById('menuOverlay');
            
            if (!menu.classList.contains('active')) {
                menu.classList.add('active');
                overlay.classList.add('active');
            }
        }
        
        // 오른쪽으로 스와이프 (메뉴 닫기)
        if (swipeDistance < -50) {
            const menu = document.getElementById('slideMenu');
            const overlay = document.getElementById('menuOverlay');
            
            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
                overlay.classList.remove('active');
            }
        }
    }
}

// ========== 유틸리티 함수 ==========
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ========== 디버그 함수 ==========
window.debugInfo = function() {
    console.log('=== HAIRGATOR Debug Info ===');
    console.log('Designer:', currentDesigner, currentDesignerName);
    console.log('Gender:', currentGender);
    console.log('Category:', currentCategory);
    console.log('Subcategory:', currentSubcategory);
    console.log('Theme:', currentTheme);
    console.log('Screen:', window.innerWidth, 'x', window.innerHeight);
    console.log('Orientation:', window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait');
    console.log('===========================');
};

// ========== 애니메이션 CSS 추가 ==========
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Main.js loaded');