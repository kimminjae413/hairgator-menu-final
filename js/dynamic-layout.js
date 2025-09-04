// HAIRGATOR 동적 레이아웃 조정 스크립트
// index.html에서 menu.js 다음에 추가하세요: <script src="js/dynamic-layout.js"></script>

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 HAIRGATOR 동적 레이아웃 시스템 초기화');
    
    // 고정 메뉴 높이 동적 계산 및 적용
    function adjustFixedMenuLayout() {
        const fixedMenuSection = document.querySelector('.fixed-menu-section');
        const stylesContainer = document.querySelector('.styles-container');
        
        if (!fixedMenuSection || !stylesContainer) {
            console.warn('고정 메뉴 요소를 찾을 수 없습니다');
            return;
        }
        
        // 고정 메뉴의 실제 높이 측정
        const fixedMenuHeight = fixedMenuSection.offsetHeight;
        
        // 스타일 컨테이너의 top 위치 조정
        stylesContainer.style.top = `${fixedMenuHeight}px`;
        
        console.log(`📐 레이아웃 조정: 고정메뉴 ${fixedMenuHeight}px, 스크롤영역 top ${fixedMenuHeight}px`);
    }
    
    // 메뉴가 활성화될 때마다 레이아웃 조정
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const menuContainer = mutation.target;
                if (menuContainer.classList.contains('active')) {
                    // 메뉴 활성화 시 레이아웃 조정 (약간의 지연 후)
                    setTimeout(adjustFixedMenuLayout, 100);
                }
            }
            
            // 메뉴 내용 변경 감지 (탭 변경 등)
            if (mutation.type === 'childList') {
                setTimeout(adjustFixedMenuLayout, 50);
            }
        });
    });
    
    // 메뉴 컨테이너 관찰 시작
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
        observer.observe(menuContainer, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }
    
    // 윈도우 리사이즈 시 레이아웃 조정
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(adjustFixedMenuLayout, 250);
    });
    
    // 초기 레이아웃 조정
    setTimeout(adjustFixedMenuLayout, 500);
});

// 디버깅용 전역 함수
window.debugLayoutInfo = function() {
    const fixedMenu = document.querySelector('.fixed-menu-section');
    const stylesContainer = document.querySelector('.styles-container');
    const menuContainer = document.querySelector('.menu-container');
    
    if (!fixedMenu || !stylesContainer || !menuContainer) {
        console.error('❌ 주요 레이아웃 요소를 찾을 수 없습니다');
        return;
    }
    
    const fixedMenuRect = fixedMenu.getBoundingClientRect();
    const stylesRect = stylesContainer.getBoundingClientRect();
    const menuRect = menuContainer.getBoundingClientRect();
    
    console.log('🔍 HAIRGATOR 레이아웃 디버그 정보:');
    console.log('메뉴 컨테이너:', {
        위치: `${menuRect.top}x${menuRect.left}`,
        크기: `${menuRect.width}x${menuRect.height}`,
        활성화: menuContainer.classList.contains('active')
    });
    console.log('고정 메뉴:', {
        위치: `${fixedMenuRect.top}x${fixedMenuRect.left}`,
        크기: `${fixedMenuRect.width}x${fixedMenuRect.height}`,
        높이: fixedMenu.offsetHeight
    });
    console.log('스타일 컨테이너:', {
        위치: `${stylesRect.top}x${stylesRect.left}`,
        크기: `${stylesRect.width}x${stylesRect.height}`,
        스타일_top: stylesContainer.style.top,
        스크롤가능: stylesContainer.scrollHeight > stylesContainer.clientHeight
    });
    
    // 태블릿 환경 검사
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    console.log('환경:', isTablet ? '태블릿' : '기타', `(${window.innerWidth}px)`);
};

console.log('✅ HAIRGATOR 동적 레이아웃 시스템 로드 완료');
console.log('💡 디버깅: window.debugLayoutInfo() 실행 가능');
