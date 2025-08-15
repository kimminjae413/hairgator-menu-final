// ========== 벚꽃 배경 시스템 ========== 

document.addEventListener('DOMContentLoaded', function() {
    // 태블릿에서만 실행
    if (window.innerWidth >= 768) {
        addSakuraButton();
    }
});

// 벚꽃 버튼 추가
function addSakuraButton() {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) return;
    
    // 벚꽃 섹션 생성
    const sakuraSection = document.createElement('div');
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
    
    // 클릭 이벤트
    const button = document.getElementById('sakuraToggle');
    button.addEventListener('click', toggleSakura);
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

// 벚꽃 토글
function toggleSakura() {
    if (window.innerWidth < 768) {
        alert('벚꽃 배경은 태블릿 화면에서만 사용할 수 있습니다.');
        return;
    }
    
    const isActive = document.body.classList.toggle('sakura-background');
    const button = document.getElementById('sakuraToggle');
    
    if (isActive) {
        button.style.background = '#FF1493';
        button.style.borderColor = '#FF1493';
        button.classList.add('active');
        
        // 벚꽃 CSS 파일들 로드
        loadSakuraCSS();
        
        // 라이트 모드 전용 요소들 추가
        addLightModeElements();
        
        console.log('🌸 벚꽃 배경 활성화');
    } else {
        button.style.background = '#2a2a2a';
        button.style.borderColor = '#444';
        button.classList.remove('active');
        
        // CSS 파일들 제거
        removeSakuraCSS();
        
        // 라이트 모드 요소들 제거
        removeLightModeElements();
        
        console.log('🌸 벚꽃 배경 비활성화');
    }
}

// 벚꽃 CSS 파일들 로드
function loadSakuraCSS() {
    // 이미 로드되었는지 확인
    if (document.querySelector('#sakura-dark-css')) {
        return;
    }
    
    // 다크 모드 CSS (body.sakura-background 기반)
    const darkCSS = document.createElement('link');
    darkCSS.id = 'sakura-dark-css';
    darkCSS.rel = 'stylesheet';
    darkCSS.href = 'backgrounds/sakura-dark.css';
    document.head.appendChild(darkCSS);
    
    // 라이트 모드 CSS (별도 클래스 기반)
    const lightCSS = document.createElement('link');
    lightCSS.id = 'sakura-light-css';
    lightCSS.rel = 'stylesheet';
    lightCSS.href = 'backgrounds/sakura-light.css';
    document.head.appendChild(lightCSS);
    
    console.log('🌸 벚꽃 CSS 로드 완료');
}

// 라이트 모드 전용 요소들 추가
function addLightModeElements() {
    // 라이트 모드일 때만 실행
    if (!document.body.classList.contains('light-theme')) {
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
    
    // 벚꽃 꽃잎들 생성 (10개)
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

// 라이트 모드 요소들 제거
function removeLightModeElements() {
    const lightContainer = document.getElementById('sakura-light-container');
    if (lightContainer) {
        lightContainer.remove();
        console.log('🌸 라이트 모드 벚꽃 요소 제거 완료');
    }
}

// 벚꽃 CSS 파일들 제거
function removeSakuraCSS() {
    const darkCSS = document.querySelector('#sakura-dark-css');
    const lightCSS = document.querySelector('#sakura-light-css');
    
    if (darkCSS) darkCSS.remove();
    if (lightCSS) lightCSS.remove();
    
    console.log('🌸 벚꽃 CSS 제거 완료');
}

// 테마 변경 감지 (기존 테마 토글에 연결)
function handleThemeChange() {
    // 벚꽃 배경이 활성화된 상태에서 테마가 변경되면
    if (document.body.classList.contains('sakura-background')) {
        // 라이트 모드 요소들 업데이트
        removeLightModeElements();
        setTimeout(() => {
            addLightModeElements();
        }, 100);
    }
}

// 기존 테마 토글 버튼에 이벤트 추가
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleBottom = document.getElementById('themeToggleBottom');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', handleThemeChange);
    }
    
    if (themeToggleBottom) {
        themeToggleBottom.addEventListener('click', handleThemeChange);
    }
});
