// HAIRGATOR 동적 레이아웃 조정 스크립트 - 강화 버전
// 모든 카테고리에서 고정 메뉴 확실히 작동하도록 개선

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 HAIRGATOR 강화된 동적 레이아웃 시스템 초기화');
    
    let adjustTimeout;
    
    // 고정 메뉴 높이 동적 계산 및 적용 - 강화 버전
    function adjustFixedMenuLayout() {
        const fixedMenuSection = document.querySelector('.fixed-menu-section');
        const stylesContainer = document.querySelector('.styles-container');
        
        if (!fixedMenuSection || !stylesContainer) {
            console.warn('고정 메뉴 요소를 찾을 수 없습니다');
            return;
        }
        
        // 강제로 레이아웃 재계산
        fixedMenuSection.style.display = 'none';
        fixedMenuSection.offsetHeight; // 강제 리플로우
        fixedMenuSection.style.display = '';
        
        // 실제 높이 측정 (여러 번 시도)
        let fixedMenuHeight = 0;
        for (let i = 0; i < 3; i++) {
            const newHeight = fixedMenuSection.offsetHeight;
            if (newHeight > fixedMenuHeight) {
                fixedMenuHeight = newHeight;
            }
        }
        
        // 최소 높이 보장
        if (fixedMenuHeight < 150) {
            fixedMenuHeight = 200; // 기본값 사용
        }
        
        // 스타일 컨테이너의 top 위치 강제 설정
        stylesContainer.style.position = 'absolute';
        stylesContainer.style.top = `${fixedMenuHeight}px`;
        stylesContainer.style.left = '0';
        stylesContainer.style.width = '100%';
        stylesContainer.style.bottom = '0';
        
        console.log(`📐 강화된 레이아웃 조정: 고정메뉴 ${fixedMenuHeight}px, 스크롤영역 top ${fixedMenuHeight}px`);
    }
    
    // 지연된 레이아웃 조정 (중복 호출 방지)
    function delayedAdjust(delay = 100) {
        clearTimeout(adjustTimeout);
        adjustTimeout = setTimeout(adjustFixedMenuLayout, delay);
    }
    
    // 탭 변경 감지 및 즉시 조정
    function handleTabChange() {
        console.log('🔄 탭 변경 감지 - 레이아웃 즉시 조정');
        
        // 즉시 조정 + 지연 조정 (이중 보장)
        adjustFixedMenuLayout();
        delayedAdjust(50);
        delayedAdjust(200);
        delayedAdjust(500);
    }
    
    // MutationObserver - 모든 변화 감지
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 클래스 변경 (메뉴 활성화)
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('active') || target.id === 'menuContainer') {
                    console.log('📱 메뉴 활성화 감지');
                    handleTabChange();
                }
            }
            
            // DOM 변경 (탭 추가/제거, 내용 변경)
            if (mutation.type === 'childList') {
                const hasImportantChanges = Array.from(mutation.addedNodes).some(node => {
                    return node.nodeType === 1 && (
                        node.classList?.contains('category-tab') ||
                        node.classList?.contains('category-description') ||
                        node.classList?.contains('sub-tabs')
                    );
                });
                
                if (hasImportantChanges) {
                    console.log('📝 메뉴 내용 변경 감지');
                    handleTabChange();
                }
            }
        });
    });
    
    // 관찰 대상 확대
    const observeTargets = [
        document.getElementById('menuContainer'),
        document.querySelector('.fixed-menu-section'),
        document.querySelector('.category-tabs'),
        document.querySelector('.category-description'),
        document.querySelector('.sub-tabs'),
        document.body
    ].filter(Boolean);
    
    observeTargets.forEach(target => {
        observer.observe(target, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class', 'style']
        });
    });
    
    // 창 크기 변경 시 조정
    window.addEventListener('resize', function() {
        console.log('📏 창 크기 변경 감지');
        delayedAdjust(250);
    });
    
    // 초기 레이아웃 조정 (여러 단계)
    setTimeout(() => adjustFixedMenuLayout(), 100);
    setTimeout(() => adjustFixedMenuLayout(), 500);
    setTimeout(() => adjustFixedMenuLayout(), 1000);
    
    // 전역 함수로 수동 조정 제공
    window.forceLayoutAdjust = function() {
        console.log('🔧 수동 레이아웃 조정 실행');
        handleTabChange();
    };
});

// 디버깅용 전역 함수 - 강화 버전
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
    
    // 각 하위 요소들의 높이도 측정
    const categoryTabs = document.querySelector('.category-tabs');
    const categoryDescription = document.querySelector('.category-description');
    const subTabs = document.querySelector('.sub-tabs');
    
    console.log('🔍 HAIRGATOR 상세 레이아웃 디버그 정보:');
    console.log('메뉴 컨테이너:', {
        위치: `${menuRect.top}x${menuRect.left}`,
        크기: `${menuRect.width}x${menuRect.height}`,
        활성화: menuContainer.classList.contains('active'),
        표시상태: window.getComputedStyle(menuContainer).display
    });
    console.log('고정 메뉴 전체:', {
        위치: `${fixedMenuRect.top}x${fixedMenuRect.left}`,
        크기: `${fixedMenuRect.width}x${fixedMenuRect.height}`,
        실제높이: fixedMenu.offsetHeight,
        스타일높이: fixedMenu.style.height
    });
    
    if (categoryTabs) {
        console.log('카테고리 탭:', { 높이: categoryTabs.offsetHeight });
    }
    if (categoryDescription) {
        console.log('카테고리 설명:', { 높이: categoryDescription.offsetHeight });
    }
    if (subTabs) {
        console.log('서브 탭:', { 높이: subTabs.offsetHeight });
    }
    
    console.log('스타일 컨테이너:', {
        위치: `${stylesRect.top}x${stylesRect.left}`,
        크기: `${stylesRect.width}x${stylesRect.height}`,
        CSS_top: stylesContainer.style.top,
        CSS_position: stylesContainer.style.position,
        스크롤가능: stylesContainer.scrollHeight > stylesContainer.clientHeight,
        스크롤위치: stylesContainer.scrollTop
    });
    
    // 태블릿 환경 검사
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    console.log('환경:', isTablet ? '태블릿' : '기타', `(${window.innerWidth}px)`);
    
    // 문제 진단
    const problems = [];
    if (stylesRect.top <= fixedMenuRect.bottom) {
        problems.push('스크롤 영역이 고정 메뉴와 겹침');
    }
    if (fixedMenuRect.height < 100) {
        problems.push('고정 메뉴 높이가 너무 작음');
    }
    if (stylesContainer.style.top === '' || stylesContainer.style.top === 'auto') {
        problems.push('스크롤 영역 top 위치가 설정되지 않음');
    }
    
    if (problems.length > 0) {
        console.warn('⚠️ 감지된 문제:', problems);
        console.log('💡 해결: window.forceLayoutAdjust() 실행 권장');
    } else {
        console.log('✅ 레이아웃 정상');
    }
};

console.log('✅ HAIRGATOR 강화된 동적 레이아웃 시스템 로드 완료');
console.log('💡 디버깅: window.debugLayoutInfo() | 수동조정: window.forceLayoutAdjust()');
