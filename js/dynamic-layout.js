// HAIRGATOR Dynamic Layout System - 태블릿 A+B 영역 고정 완전 해결
// Version: 2.0 - Pull-to-refresh 차단 & 영역 고정

(function() {
    'use strict';
    
    console.log('📱 HAIRGATOR Dynamic Layout System 2.0 초기화');
    
    // 디바이스 타입 감지
    const getDeviceType = () => {
        const width = window.innerWidth;
        
        if (width < 768) return 'mobile';
        if (width >= 768 && width <= 1024) return 'tablet';
        return 'desktop';
    };
    
    // Pull-to-refresh 완전 차단 (태블릿용)
    const preventPullToRefresh = () => {
        if (getDeviceType() !== 'tablet') return;
        
        console.log('🚫 태블릿 Pull-to-refresh 차단 활성화');
        
        let lastY = 0;
        let preventPull = false;
        
        // touchstart 이벤트
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                lastY = e.touches[0].clientY;
                
                // 스크롤 가능한 영역 체크
                const scrollableElement = e.target.closest('.menu-items-container, .styles-grid');
                if (scrollableElement) {
                    preventPull = scrollableElement.scrollTop === 0;
                } else {
                    preventPull = window.scrollY === 0;
                }
            }
        }, { passive: false });
        
        // touchmove 이벤트
        document.addEventListener('touchmove', function(e) {
            if (!preventPull) return;
            
            if (e.touches.length === 1) {
                const currentY = e.touches[0].clientY;
                
                // 아래로 당기는 동작 감지 및 차단
                if (currentY > lastY && window.scrollY === 0) {
                    e.preventDefault();
                    console.log('⛔ Pull-to-refresh 차단됨');
                }
            }
        }, { passive: false });
        
        // touchend 이벤트
        document.addEventListener('touchend', function() {
            preventPull = false;
        }, { passive: false });
        
        // CSS overscroll-behavior 추가
        const style = document.createElement('style');
        style.textContent = `
            html, body {
                overscroll-behavior-y: contain !important;
                overscroll-behavior: none !important;
                -webkit-overflow-scrolling: touch;
            }
            
            /* 태블릿에서 바운스 효과 제거 */
            @media (min-width: 768px) and (max-width: 1024px) {
                * {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                }
            }
        `;
        document.head.appendChild(style);
    };
    
    // A+B 영역 고정 설정
    const setupFixedLayout = () => {
        if (getDeviceType() !== 'tablet') return;
        
        console.log('📌 태블릿 A+B 영역 고정 설정');
        
        // 동적 CSS 스타일 추가
        const style = document.createElement('style');
        style.id = 'tablet-fixed-layout';
        style.textContent = `
            /* 태블릿 전용 고정 레이아웃 */
            @media (min-width: 768px) and (max-width: 1024px) {
                body {
                    overflow: hidden;
                    height: 100vh;
                    position: fixed;
                    width: 100%;
                }
                
                .menu-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                    position: relative;
                }
                
                /* A영역: 성별선택 + 대분류 탭 (고정) */
                .gender-container,
                .category-tabs {
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    background: var(--background, #000);
                    flex-shrink: 0;
                }
                
                /* B영역: 설명 + 중분류 (고정) */
                .category-description,
                .sub-tabs {
                    position: sticky;
                    top: auto;
                    z-index: 999;
                    background: var(--background, #000);
                    flex-shrink: 0;
                }
                
                /* 고정 영역 컨테이너 */
                .fixed-header-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background: var(--background, #000);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                }
                
                /* C영역: 이미지 그리드 (스크롤 가능) */
                .menu-items-container {
    position: absolute;
    top: 280px;  /* A+B 영역 높이 */
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto !important;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding: 10px;
    padding-bottom: 50px;
}
                
                /* 스크롤바 스타일링 */
                .menu-items-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .menu-items-container::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .menu-items-container::-webkit-scrollbar-thumb {
                    background: var(--accent-color, #E91E63);
                    border-radius: 4px;
                }
                
                /* 스타일 그리드 */
                .styles-grid {
                    padding: 20px;
                    display: grid;
                    gap: 15px;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                }
                
                /* 터치 스크롤 최적화 */
                .menu-items-container * {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
            }
        `;
        
        // 기존 스타일이 있으면 제거
        const existingStyle = document.getElementById('tablet-fixed-layout');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // 새 스타일 추가
        document.head.appendChild(style);
        
        // DOM 구조 재구성
        reorganizeTabletLayout();
    };
    
    // DOM 구조 재구성 (태블릿용)
    const reorganizeTabletLayout = () => {
        if (getDeviceType() !== 'tablet') return;
        
        const menuContainer = document.querySelector('.menu-container');
        if (!menuContainer) return;
        
        // 고정될 요소들 찾기
        const genderContainer = document.querySelector('.gender-container');
        const categoryTabs = document.querySelector('.category-tabs');
        const categoryDescription = document.querySelector('.category-description');
        const subTabs = document.querySelector('.sub-tabs');
        const menuItemsContainer = document.querySelector('.menu-items-container');
        
        if (!genderContainer || !categoryTabs || !menuItemsContainer) {
            console.warn('⚠️ 필요한 요소를 찾을 수 없습니다');
            return;
        }
        
        // 고정 헤더 컨테이너가 없으면 생성
        let fixedHeader = document.querySelector('.fixed-header-container');
        if (!fixedHeader) {
            fixedHeader = document.createElement('div');
            fixedHeader.className = 'fixed-header-container';
            menuContainer.insertBefore(fixedHeader, menuContainer.firstChild);
        }
        
        // A+B 영역을 고정 헤더로 이동
        fixedHeader.innerHTML = '';
        
        // A영역 추가
        if (genderContainer) fixedHeader.appendChild(genderContainer.cloneNode(true));
        if (categoryTabs) fixedHeader.appendChild(categoryTabs.cloneNode(true));
        
        // B영역 추가
        if (categoryDescription) fixedHeader.appendChild(categoryDescription.cloneNode(true));
        if (subTabs) fixedHeader.appendChild(subTabs.cloneNode(true));
        
        // 원본 요소들 숨기기
        [genderContainer, categoryTabs, categoryDescription, subTabs].forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // C영역 위치 조정
        const fixedHeight = fixedHeader.offsetHeight;
        menuItemsContainer.style.marginTop = fixedHeight + 'px';
        menuItemsContainer.style.height = `calc(100vh - ${fixedHeight}px)`;
        
        console.log('✅ 태블릿 레이아웃 재구성 완료');
    };
    
    // 레이아웃 복원 (비태블릿용)
    const restoreNormalLayout = () => {
        if (getDeviceType() === 'tablet') return;
        
        // 태블릿 스타일 제거
        const tabletStyle = document.getElementById('tablet-fixed-layout');
        if (tabletStyle) tabletStyle.remove();
        
        // 고정 헤더 제거
        const fixedHeader = document.querySelector('.fixed-header-container');
        if (fixedHeader) fixedHeader.remove();
        
        // 원본 요소들 표시
        const elements = [
            '.gender-container',
            '.category-tabs',
            '.category-description',
            '.sub-tabs'
        ];
        
        elements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = '';
        });
        
        // C영역 마진 초기화
        const menuItemsContainer = document.querySelector('.menu-items-container');
        if (menuItemsContainer) {
            menuItemsContainer.style.marginTop = '';
            menuItemsContainer.style.height = '';
        }
        
        console.log('✅ 일반 레이아웃 복원 완료');
    };
    
    // 레이아웃 업데이트
    const updateLayout = () => {
        const deviceType = getDeviceType();
        console.log(`📱 디바이스 타입: ${deviceType}`);
        
        if (deviceType === 'tablet') {
            preventPullToRefresh();
            setupFixedLayout();
        } else {
            restoreNormalLayout();
        }
    };
    
    // 디바운스 함수
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    // 이벤트 리스너 설정
    const setupEventListeners = () => {
        // 리사이즈 이벤트 (디바운스 적용)
        window.addEventListener('resize', debounce(updateLayout, 250));
        
        // 오리엔테이션 변경
        window.addEventListener('orientationchange', () => {
            setTimeout(updateLayout, 100);
        });
        
        // 카테고리 변경 감지
        document.addEventListener('categoryChanged', () => {
            if (getDeviceType() === 'tablet') {
                setTimeout(reorganizeTabletLayout, 100);
            }
        });
    };
    
    // 초기화
    const init = () => {
        // DOM이 준비되면 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                updateLayout();
                setupEventListeners();
            });
        } else {
            updateLayout();
            setupEventListeners();
        }
    };
    
    // 전역 노출 (디버깅용)
    window.HAIRGATOR_LAYOUT = {
        updateLayout,
        getDeviceType,
        reorganizeTabletLayout,
        restoreNormalLayout
    };
    
    console.log('💡 디버깅: window.HAIRGATOR_LAYOUT 사용 가능');
    
    // 초기화 실행
    init();
})();
