// HAIRGATOR 태블릿 터치 문제 완전 해결
// index.html의 menu.js 다음에 추가하세요

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 HAIRGATOR 태블릿 터치 핸들러 초기화');
    
    // 터치 디바이스 감지
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) || 
                         (navigator.msMaxTouchPoints > 0);
    
    // 태블릿 크기 감지 (768px ~ 1024px)
    const isTabletSize = () => {
        const width = window.innerWidth;
        return width >= 768 && width <= 1024;
    };
    
    if (isTouchDevice && isTabletSize()) {
        console.log('📱 태블릿 터치 환경 감지 - 최적화 적용');
        setupTabletTouchHandling();
    }
});

// 태블릿 전용 터치 핸들링 설정
function setupTabletTouchHandling() {
    // 기존 onclick 이벤트를 모두 제거하고 터치 이벤트로 교체
    const replaceTabClickHandlers = () => {
        const categoryTabs = document.querySelectorAll('.category-tab, .main-tab');
        
        categoryTabs.forEach((tab, index) => {
            // 기존 onclick 제거
            tab.onclick = null;
            tab.removeAttribute('onclick');
            
            // 터치 이벤트 추가
            let touchStartTime = 0;
            let touchStartPos = { x: 0, y: 0 };
            let isValidTouch = false;
            
            // 터치 시작
            tab.addEventListener('touchstart', function(e) {
                touchStartTime = Date.now();
                touchStartPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
                isValidTouch = true;
                
                // 시각적 피드백
                this.style.opacity = '0.7';
                this.style.transform = 'scale(0.98)';
                
                console.log(`👆 터치 시작: ${this.textContent}`);
            }, { passive: true });
            
            // 터치 이동 - 너무 멀리 이동하면 취소
            tab.addEventListener('touchmove', function(e) {
                const currentPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
                
                const distance = Math.sqrt(
                    Math.pow(currentPos.x - touchStartPos.x, 2) + 
                    Math.pow(currentPos.y - touchStartPos.y, 2)
                );
                
                if (distance > 20) { // 20px 이상 이동하면 취소
                    isValidTouch = false;
                    this.style.opacity = '';
                    this.style.transform = '';
                }
            }, { passive: true });
            
            // 터치 종료 - 실제 클릭 처리
            tab.addEventListener('touchend', function(e) {
                const touchDuration = Date.now() - touchStartTime;
                
                // 시각적 피드백 복원
                this.style.opacity = '';
                this.style.transform = '';
                
                // 유효한 터치인지 확인 (시간: 50ms~500ms, 거리: 20px 이내)
                if (isValidTouch && touchDuration >= 50 && touchDuration <= 500) {
                    e.preventDefault(); // 기본 동작 방지
                    e.stopPropagation();
                    
                    console.log(`✅ 유효한 터치: ${this.textContent} (${touchDuration}ms)`);
                    
                    // 실제 탭 선택 함수 호출
                    handleTabletTabSelection(this);
                }
                
                isValidTouch = false;
            }, { passive: false });
            
            // 클릭 이벤트는 막기 (중복 실행 방지)
            tab.addEventListener('click', function(e) {
                if (isTouchDevice && isTabletSize()) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚫 클릭 이벤트 차단 (터치로 처리됨)');
                }
            });
        });
    };
    
    // MutationObserver로 동적으로 생성되는 탭들도 처리
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('category-tab')) {
                            console.log('🔄 새로운 탭 감지 - 터치 핸들러 적용');
                            setTimeout(replaceTabClickHandlers, 100);
                        }
                    }
                });
            }
        });
    });
    
    // 카테고리 탭 컨테이너 관찰
    const tabContainer = document.querySelector('.category-tabs') || document.body;
    observer.observe(tabContainer, {
        childList: true,
        subtree: true
    });
    
    // 초기 실행
    replaceTabClickHandlers();
    
    // 창 크기 변경 시 재확인
    window.addEventListener('resize', function() {
        if (isTouchDevice && isTabletSize()) {
            setTimeout(replaceTabClickHandlers, 100);
        }
    });
}

// 태블릿에서 탭 선택 처리
function handleTabletTabSelection(tabElement) {
    const tabText = tabElement.textContent.trim();
    console.log(`🎯 태블릿 탭 선택 처리: ${tabText}`);
    
    // 현재 활성화된 탭들에서 active 클래스 제거
    document.querySelectorAll('.category-tab.active, .main-tab.active').forEach(t => {
        t.classList.remove('active');
    });
    
    // 선택된 탭에 active 클래스 추가
    tabElement.classList.add('active');
    
    // window.HAIRGATOR_MENU을 통해 기존 함수 호출
    if (window.HAIRGATOR_MENU && typeof window.HAIRGATOR_MENU.selectMainTab === 'function') {
        // 카테고리 정보를 찾아서 전달
        const categoryName = tabText;
        const categoryIndex = Array.from(tabElement.parentElement.children).indexOf(tabElement);
        
        // 카테고리 객체 생성 (간단한 버전)
        const category = {
            name: categoryName,
            id: categoryName.toLowerCase().replace(/\s+/g, '-')
        };
        
        console.log(`🚀 selectMainTab 호출: ${categoryName} (index: ${categoryIndex})`);
        window.HAIRGATOR_MENU.selectMainTab(category, categoryIndex);
    } else {
        console.error('❌ HAIRGATOR_MENU.selectMainTab 함수를 찾을 수 없습니다');
    }
    
    // 햅틱 피드백 (지원하는 디바이스에서)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// 디버깅용 전역 함수
window.debugTabletTouch = function() {
    const tabs = document.querySelectorAll('.category-tab, .main-tab');
    console.log(`발견된 탭 개수: ${tabs.length}`);
    
    tabs.forEach((tab, index) => {
        const rect = tab.getBoundingClientRect();
        console.log(`탭 ${index}: "${tab.textContent}" - 위치: ${rect.top}x${rect.left}, 크기: ${rect.width}x${rect.height}`);
    });
};

console.log('✅ 태블릿 터치 핸들러 로드 완료');
console.log('💡 디버깅: window.debugTabletTouch() 실행 가능');
