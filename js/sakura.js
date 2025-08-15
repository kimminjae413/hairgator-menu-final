// ========== 벚꽃 배경 시스템 (개선된 안정 버전) ==========

(function() {
    'use strict';
    
    // 전역 네임스페이스 방지
    let isInitialized = false;
    let sakuraActive = false;
    
    // ========== 초기화 ==========
    function initSakura() {
        if (isInitialized) {
            console.log('🌸 벚꽃 시스템 이미 초기화됨');
            return;
        }
        
        // 태블릿에서만 실행
        if (window.innerWidth < 768) {
            console.log('🌸 태블릿 전용 (현재:', window.innerWidth, 'px)');
            return;
        }
        
        // 메인 앱 로드 대기
        waitForMainApp();
    }
    
    // 메인 앱 로드 대기 (충돌 방지)
    function waitForMainApp() {
        let attempts = 0;
        const maxAttempts = 50; // 5초 대기
        
        const checkInterval = setInterval(() => {
            attempts++;
            const sidebar = document.querySelector('.sidebar-content');
            
            // 사이드바가 준비되고 최소 1개 이상의 요소가 있을 때
            if (sidebar && sidebar.children.length > 0) {
                clearInterval(checkInterval);
                setTimeout(() => {
                    addSakuraButton();
                    isInitialized = true;
                    console.log('🌸 벚꽃 시스템 초기화 완료');
                }, 300); // 추가 안정성을 위한 딜레이
                return;
            }
            
            // 타임아웃
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('🌸 메인 앱 대기 타임아웃 - 강제 초기화');
                addSakuraButton();
                isInitialized = true;
            }
        }, 100);
    }
    
    // ========== 벚꽃 버튼 추가 ==========
    function addSakuraButton() {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) {
            console.log('❌ .sidebar-content 요소를 찾을 수 없습니다');
            return;
        }
        
        // 이미 버튼이 있는지 확인
        if (document.getElementById('sakuraToggle')) {
            console.log('⚠️ 벚꽃 버튼이 이미 존재합니다');
            return;
        }
        
        // 벚꽃 섹션 생성
        const sakuraSection = document.createElement('div');
        sakuraSection.id = 'sakuraSection';
        sakuraSection.innerHTML = `
            <div style="margin: 20px 0; padding: 15px 0; border-top: 1px solid #333;">
                <h4 style="color: #FF1493; margin-bottom: 15px; font-size: 14px; text-align: center;">
                    🌸 배경 모드 (태블릿 전용)
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
                    태블릿 화면에서만 작동합니다
                </p>
            </div>
        `;
        
        sidebarContent.appendChild(sakuraSection);
        setupButtonEvents();
        setupThemeWatcher();
        
        console.log('🌸 벚꽃 버튼 추가 완료!');
    }
    
    // ========== 버튼 이벤트 설정 ==========
    function setupButtonEvents() {
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
    }
    
    // ========== 벚꽃 토글 ==========
    function toggleSakura() {
        if (window.innerWidth < 768) {
            alert('벚꽃 배경은 태블릿 화면에서만 사용할 수 있습니다.');
            return;
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
            return;
        }
        
        // 다크 모드 CSS
        const darkCSS = document.createElement('link');
        darkCSS.id = 'sakura-dark-css';
        darkCSS.rel = 'stylesheet';
        darkCSS.href = 'backgrounds/sakura-dark.css';
        darkCSS.onload = () => console.log('✅ 다크 모드 벚꽃 CSS 로드됨');
        darkCSS.onerror = () => console.error('❌ 다크 모드 벚꽃 CSS 실패');
        document.head.appendChild(darkCSS);
        
        // 라이트 모드 CSS
        const lightCSS = document.createElement('link');
        lightCSS.id = 'sakura-light-css';
        lightCSS.rel = 'stylesheet';
        lightCSS.href = 'backgrounds/sakura-light.css';
        lightCSS.onload = () => console.log('✅ 라이트 모드 벚꽃 CSS 로드됨');
        lightCSS.onerror = () => console.error('❌ 라이트 모드 벚꽃 CSS 실패');
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
        // 라이트 모드일 때만 실행
        if (!document.body.classList.contains('light-theme')) {
            return;
        }
        
        // 중복 방지
        if (document.getElementById('sakura-light-container')) {
            return;
        }
        
        // 배경 컨테이너 생성
        const backgroundContainer = document.createElement('div');
        backgroundContainer.id = 'sakura-light-container';
        backgroundContainer.className = 'background-sakura-light';
        
        // 햇살 효과
        const sunlight = document.createElement('div');
        sunlight.className = 'sunlight';
        backgroundContainer.appendChild(sunlight);
        
        // 벚꽃 컨테이너
        const sakuraContainer = document.createElement('div');
        sakuraContainer.className = 'sakura-container-light';
        
        // 벚꽃 꽃잎들 생성
        for (let i = 1; i <= 10; i++) {
            const petal = document.createElement('div');
            petal.className = 'sakura-petal-light';
            sakuraContainer.appendChild(petal);
        }
        
        // 봄바람 효과
        const springBreeze = document.createElement('div');
        springBreeze.className = 'spring-breeze';
        
        // 꽃잎 흩날림 효과
        const petalWhirl = document.createElement('div');
        petalWhirl.className = 'petal-whirl';
        
        backgroundContainer.appendChild(sakuraContainer);
        backgroundContainer.appendChild(springBreeze);
        backgroundContainer.appendChild(petalWhirl);
        
        document.body.appendChild(backgroundContainer);
        
        console.log('🌸 라이트 모드 벚꽃 요소 추가 완료');
    }
    
    function removeLightModeElements() {
        const lightContainer = document.getElementById('sakura-light-container');
        if (lightContainer) {
            lightContainer.remove();
            console.log('🗑️ 라이트 모드 벚꽃 요소 제거 완료');
        }
    }
    
    // ========== 테마 변경 감지 ==========
    function setupThemeWatcher() {
        // MutationObserver로 body 클래스 변경 감지
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (sakuraActive) {
                        console.log('🎨 테마 변경 감지 - 벚꽃 요소 업데이트');
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
        
        console.log('👁️ 테마 변경 감지 시작');
    }
    
    // ========== 다양한 로드 타이밍에서 초기화 ==========
    
    // 1. DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌸 DOMContentLoaded 이벤트');
            setTimeout(initSakura, 100);
        });
    }
    
    // 2. DOM이 이미 로드된 경우 즉시 실행
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        console.log('🌸 DOM 이미 준비됨:', document.readyState);
        setTimeout(initSakura, 200);
    }
    
    // 3. window.load (최종 백업)
    window.addEventListener('load', function() {
        console.log('🌸 Window load 이벤트');
        setTimeout(initSakura, 300);
    });
    
    console.log('🌸 벚꽃 시스템 스크립트 로드 완료');
})();
