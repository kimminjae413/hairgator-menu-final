// ========== 벚꽃 배경 시스템 (최종 완성 버전) ==========

(function() {
    'use strict';
    
    let isInitialized = false;
    let sakuraActive = false;
    
    // ========== 초기화 ==========
    function initSakura() {
        if (isInitialized) {
            console.log('🌸 벚꽃 시스템 이미 초기화됨');
            return;
        }
        
        console.log('🌸 벚꽃 시스템 초기화 시작 (화면:', window.innerWidth, 'px)');
        
        // 사이드바 준비 대기
        waitForSidebar();
    }
    
    // ========== 사이드바 대기 ==========
    function waitForSidebar() {
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkInterval = setInterval(() => {
            attempts++;
            const sidebar = document.querySelector('.sidebar-content');
            
            if (sidebar) {
                clearInterval(checkInterval);
                setTimeout(() => {
                    addSakuraButton();
                    isInitialized = true;
                    console.log('🌸 벚꽃 시스템 초기화 완료');
                }, 200);
                return;
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('🌸 사이드바 대기 타임아웃');
            }
        }, 100);
    }
    
    // ========== 벚꽃 버튼 추가 ==========
    function addSakuraButton() {
        const sidebar = document.querySelector('.sidebar-content');
        if (!sidebar) {
            console.log('❌ 사이드바를 찾을 수 없습니다');
            return;
        }
        
        if (document.getElementById('sakuraToggle')) {
            console.log('⚠️ 벚꽃 버튼이 이미 존재합니다');
            return;
        }
        
        // 벚꽃 섹션 생성
        const sakuraSection = document.createElement('div');
        sakuraSection.id = 'sakuraSection';
        
        // 화면 크기에 따른 표시 텍스트
        const isTablet = window.innerWidth >= 768;
        const statusText = isTablet ? '태블릿 전용' : `현재: ${window.innerWidth}px (테스트용)`;
        
        sakuraSection.innerHTML = `
            <div style="margin: 20px 0; padding: 15px 0; border-top: 1px solid #333;">
                <h4 style="color: #FF1493; margin-bottom: 15px; font-size: 14px; text-align: center;">
                    🌸 벚꽃 배경 모드
                </h4>
                <button id="sakuraToggle" style="
                    width: 100%; 
                    padding: 12px; 
                    background: #2a2a2a; 
                    color: white; 
                    border: 1px solid #444; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s;
                ">
                    <span style="font-size: 16px;">🌸</span>
                    <span>벚꽃 배경</span>
                </button>
                <p style="color: #666; font-size: 11px; margin-top: 8px; text-align: center;">
                    ${statusText}
                </p>
            </div>
        `;
        
        sidebar.appendChild(sakuraSection);
        setupEvents();
        
        console.log('✅ 벚꽃 버튼 생성 완료!');
    }
    
    // ========== 이벤트 설정 ==========
    function setupEvents() {
        const button = document.getElementById('sakuraToggle');
        if (!button) return;
        
        // 클릭 이벤트
        button.addEventListener('click', toggleSakura);
        
        // 호버 이벤트
        button.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.background = '#3a3a3a';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.background = '#2a2a2a';
            }
        });
        
        // 테마 변경 감지
        setupThemeWatcher();
    }
    
    // ========== 벚꽃 토글 ==========
    function toggleSakura() {
        // 작은 화면에서는 경고
        if (window.innerWidth < 768) {
            if (!confirm('화면이 작아 벚꽃 효과가 제한될 수 있습니다. 계속하시겠습니까?')) {
                return;
            }
        }
        
        sakuraActive = !sakuraActive;
        document.body.classList.toggle('sakura-background', sakuraActive);
        
        const button = document.getElementById('sakuraToggle');
        if (!button) return;
        
        if (sakuraActive) {
            button.style.background = '#FF1493';
            button.style.borderColor = '#FF1493';
            button.classList.add('active');
            
            loadSakuraCSS();
            addLightModeElements();
            
            console.log('🌸 벚꽃 배경 활성화');
        } else {
            button.style.background = '#2a2a2a';
            button.style.borderColor = '#444';
            button.classList.remove('active');
            
            removeSakuraCSS();
            removeLightModeElements();
            
            console.log('🌸 벚꽃 배경 비활성화');
        }
    }
    
    // ========== CSS 관리 ==========
    function loadSakuraCSS() {
        // 중복 로드 방지
        if (document.querySelector('#sakura-dark-css')) {
            console.log('🌸 CSS 이미 로드됨');
            return;
        }
        
        // 다크 모드 CSS (메인)
        const darkCSS = document.createElement('link');
        darkCSS.id = 'sakura-dark-css';
        darkCSS.rel = 'stylesheet';
        darkCSS.href = 'backgrounds/sakura-dark.css';
        darkCSS.onload = () => console.log('✅ 벚꽃 CSS 로드 성공');
        darkCSS.onerror = () => console.warn('⚠️ 벚꽃 CSS 로드 실패 (파일 없음?)');
        document.head.appendChild(darkCSS);
        
        // 라이트 모드 CSS (보조)
        const lightCSS = document.createElement('link');
        lightCSS.id = 'sakura-light-css';
        lightCSS.rel = 'stylesheet';
        lightCSS.href = 'backgrounds/sakura-light.css';
        document.head.appendChild(lightCSS);
    }
    
    function removeSakuraCSS() {
        const darkCSS = document.querySelector('#sakura-dark-css');
        const lightCSS = document.querySelector('#sakura-light-css');
        
        if (darkCSS) darkCSS.remove();
        if (lightCSS) lightCSS.remove();
        
        console.log('🗑️ 벚꽃 CSS 제거 완료');
    }
    
    // ========== 라이트 모드 요소 관리 ==========
    function addLightModeElements() {
        if (!document.body.classList.contains('light-theme')) {
            return;
        }
        
        if (document.getElementById('sakura-light-container')) {
            return;
        }
        
        const container = document.createElement('div');
        container.id = 'sakura-light-container';
        container.className = 'background-sakura-light';
        
        // 햇살 효과
        const sunlight = document.createElement('div');
        sunlight.className = 'sunlight';
        container.appendChild(sunlight);
        
        // 벚꽃 컨테이너
        const sakuraContainer = document.createElement('div');
        sakuraContainer.className = 'sakura-container-light';
        
        // 벚꽃 꽃잎들
        for (let i = 1; i <= 8; i++) {
            const petal = document.createElement('div');
            petal.className = 'sakura-petal-light';
            sakuraContainer.appendChild(petal);
        }
        
        container.appendChild(sakuraContainer);
        document.body.appendChild(container);
        
        console.log('🌸 라이트 모드 벚꽃 요소 추가');
    }
    
    function removeLightModeElements() {
        const container = document.getElementById('sakura-light-container');
        if (container) {
            container.remove();
            console.log('🗑️ 라이트 모드 벚꽃 요소 제거');
        }
    }
    
    // ========== 테마 변경 감지 ==========
    function setupThemeWatcher() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (sakuraActive) {
                        console.log('🎨 테마 변경 감지');
                        removeLightModeElements();
                        setTimeout(addLightModeElements, 100);
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // ========== 초기화 실행 ==========
    
    // 즉시 실행 (DOM 준비됨)
    if (document.readyState !== 'loading') {
        console.log('🌸 DOM 이미 준비됨');
        setTimeout(initSakura, 100);
    }
    
    // DOMContentLoaded 이벤트
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🌸 DOMContentLoaded');
        setTimeout(initSakura, 200);
    });
    
    // window.load 이벤트 (최종 백업)
    window.addEventListener('load', function() {
        console.log('🌸 Window load');
        setTimeout(initSakura, 300);
    });
    
    console.log('🌸 벚꽃 시스템 스크립트 로드됨');
    
})();
