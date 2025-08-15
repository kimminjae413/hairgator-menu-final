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
    } else {
        button.style.background = '#2a2a2a';
        button.style.borderColor = '#444';
        button.classList.remove('active');
    }
}
