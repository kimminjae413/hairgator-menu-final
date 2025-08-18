// ========== 벚꽃 배경 시스템 (Canvas 버전) - 최종 완성 ==========

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
        
        console.log('🌸 벚꽃 시스템 초기화 시작');
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
                    Canvas 기반 자연스러운 벚꽃
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
            if (!sakuraActive) {
                this.style.background = '#3a3a3a';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            if (!sakuraActive) {
                this.style.background = '#2a2a2a';
            }
        });
        
        console.log('✅ 벚꽃 이벤트 설정 완료');
    }
    
    // ========== 벚꽃 토글 ==========
    function toggleSakura() {
        sakuraActive = !sakuraActive;
        document.body.classList.toggle('sakura-background', sakuraActive);
        
        const button = document.getElementById('sakuraToggle');
        if (!button) return;
        
        if (sakuraActive) {
            button.style.background = '#FF1493';
            button.style.borderColor = '#FF1493';
            
            // Canvas 벚꽃 시작
            if (window.createCanvasSakura) {
                window.sakuraCanvas = window.createCanvasSakura();
                
                // 배경 그라데이션 적용
                if (!document.querySelector('#sakura-bg-style')) {
                    const bgCSS = document.createElement('style');
                    bgCSS.id = 'sakura-bg-style';
                    bgCSS.innerHTML = `
                        body.sakura-background {
                            background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #0e4b99 100%) !important;
                        }
                    `;
                    document.head.appendChild(bgCSS);
                }
            }
            
            console.log('🌸 벚꽃 활성화');
        } else {
            button.style.background = '#2a2a2a';
            button.style.borderColor = '#444';
            
            // Canvas 벚꽃 제거
            const canvas = document.querySelector('#sakura-canvas');
            if (canvas && canvas.destroy) {
                canvas.destroy();
            } else if (canvas) {
                canvas.remove();
            }
            
            const bgStyle = document.querySelector('#sakura-bg-style');
            if (bgStyle) bgStyle.remove();
            
            console.log('🌸 벚꽃 비활성화');
        }
    }
    
    // ========== 초기화 실행 ==========
    
    // 즉시 실행
    if (document.readyState !== 'loading') {
        setTimeout(initSakura, 100);
    }
    
    // DOMContentLoaded 이벤트
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initSakura, 200);
    });
    
    // window.load 이벤트 (최종 백업)
    window.addEventListener('load', function() {
        setTimeout(initSakura, 300);
    });
    
    console.log('🌸 벚꽃 시스템 스크립트 로드됨 (Canvas 버전)');
    
})();
