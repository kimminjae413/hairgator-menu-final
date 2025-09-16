// HAIRGATOR Dynamic Layout System - 정석적 CSS-first 접근법
// Version: 3.0 - DOM 조작 최소화, CSS 제어 우선

(function() {
    'use strict';
    
    console.log('HAIRGATOR Dynamic Layout System 3.0 초기화 - CSS-first 방식');
    
    // 디바이스 타입 감지
    const getDeviceType = () => {
        const width = window.innerWidth;
        
        if (width < 768) return 'mobile';
        if (width >= 768 && width <= 1024) return 'tablet';
        return 'desktop';
    };
    
    // Pull-to-refresh 차단 (태블릿용)
    const preventPullToRefresh = () => {
        if (getDeviceType() !== 'tablet') return;
        
        console.log('태블릿 Pull-to-refresh 차단 활성화');
        
        let lastY = 0;
        let preventPull = false;
        
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                lastY = e.touches[0].clientY;
                const scrollableElement = e.target.closest('.menu-items-container, .styles-grid');
                if (scrollableElement) {
                    preventPull = scrollableElement.scrollTop === 0;
                } else {
                    preventPull = window.scrollY === 0;
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', function(e) {
            if (!preventPull) return;
            
            if (e.touches.length === 1) {
                const currentY = e.touches[0].clientY;
                if (currentY > lastY && window.scrollY === 0) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchend', function() {
            preventPull = false;
        }, { passive: false });
    };
    
    // 태블릿 레이아웃 적용 (CSS 클래스만 제어)
    const applyTabletLayout = () => {
        if (getDeviceType() !== 'tablet') return;
        
        console.log('태블릿 레이아웃 CSS 클래스 적용');
        
        // 기존 복잡한 DOM 조작 대신 CSS 클래스만 추가
        document.body.classList.add('tablet-layout');
        
        // 모든 레이아웃은 CSS에서 처리
        console.log('태블릿 레이아웃 적용 완료');
    };
    
    // 일반 레이아웃 복원
    const restoreNormalLayout = () => {
        if (getDeviceType() === 'tablet') return;
        
        console.log('일반 레이아웃 복원');
        
        // 태블릿 클래스 제거
        document.body.classList.remove('tablet-layout');
        
        // 기존 DOM 조작 흔적 정리 (혹시 남아있다면)
        const fixedHeader = document.querySelector('.fixed-header-container');
        if (fixedHeader) {
            fixedHeader.remove();
        }
        
        // 원본 요소들 표시 보장
        const elements = [
            '.gender-container',
            '.category-tabs', 
            '.category-description',
            '.sub-tabs'
        ];
        
        elements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el && el.style.display === 'none') {
                el.style.display = '';
            }
        });
        
        console.log('일반 레이아웃 복원 완료');
    };
    
    // 레이아웃 업데이트 (메인 함수)
    const updateLayout = () => {
        const deviceType = getDeviceType();
        console.log(`디바이스 타입: ${deviceType}`);
        
        if (deviceType === 'tablet') {
            preventPullToRefresh();
            applyTabletLayout();
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
    };
    
    // 초기화
    const init = () => {
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
        applyTabletLayout,
        restoreNormalLayout
    };
    
    console.log('디버깅: window.HAIRGATOR_LAYOUT 사용 가능');
    
    // 초기화 실행
    init();
})();
