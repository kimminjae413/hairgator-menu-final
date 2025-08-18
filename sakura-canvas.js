// ========== sakura-canvas.js - 최종 완성 버전 ==========

(function() {
    'use strict';
    
    let sakuraCanvas = null;
    let sakuraActive = false;
    let animationId = null;
    let isInitialized = false;
    
    // 실제 petal.png 이미지로 벚꽃 생성
    function createCanvasSakura() {
        // 기존 캔버스 제거
        if (sakuraCanvas) {
            sakuraCanvas.remove();
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
        
        // 모든 배경 오버레이 제거 (네이비 배경 문제 해결)
        document.querySelectorAll('[style*="linear-gradient"][style*="fixed"]').forEach(el => {
            if (el.style.background && el.style.background.includes('rgba')) {
                el.remove();
            }
        });
        
        // 새 캔버스 생성
        const canvas = document.createElement('canvas');
        canvas.id = 'sakura-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: -1;
            opacity: 0.8;
        `;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const petals = [];
        
        // 실제 petal.png 이미지 로드
        const petalImg = new Image();
        petalImg.crossOrigin = 'anonymous';
        petalImg.src = './petal.png';
        
        petalImg.onload = () => {
            console.log('✅ petal.png 로드 성공!');
            
            // 꽃잎 40개 생성
            for (let i = 0; i < 40; i++) {
                petals.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height * -2,
                    size: 15 + Math.random() * 20,
                    speed: 0.3 + Math.random() * 0.5,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: 0.01 + Math.random() * 0.02,
                    opacity: 0.7 + Math.random() * 0.3,
                    sway: Math.random() * 1 - 0.5
                });
            }
            
            // 애니메이션 시작
            function animate() {
                if (!sakuraActive || !canvas.parentNode) return;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                petals.forEach(petal => {
                    ctx.save();
                    ctx.globalAlpha = petal.opacity;
                    ctx.translate(petal.x, petal.y);
                    ctx.rotate(petal.rotation);
                    
                    // 실제 petal 이미지 그리기
                    ctx.drawImage(petalImg, -petal.size/2, -petal.size/2, petal.size, petal.size);
                    
                    ctx.restore();
                    
                    // 자연스러운 떨어지는 움직임
                    petal.y += petal.speed;
                    petal.x += Math.sin(petal.y * 0.01) * petal.sway;
                    petal.rotation += petal.rotSpeed;
                    
                    // 화면 밖으로 나가면 다시 위에서
                    if (petal.y > canvas.height + 50) {
                        petal.y = -50;
                        petal.x = Math.random() * canvas.width;
                        petal.rotation = Math.random() * Math.PI * 2;
                    }
                });
                
                animationId = requestAnimationFrame(animate);
            }
            
            animate();
        };
        
        petalImg.onerror = () => {
            console.log('❌ petal.png 로드 실패 - 코드 꽃잎 사용');
            // petal 이미지 없으면 코드로 그린 꽃잎 사용
            createCodePetals(ctx, canvas, petals);
        };
        
        // 화면 크기 변경 대응
        const resizeHandler = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeHandler);
        
        sakuraCanvas = canvas;
        console.log('🌸 Canvas 벚꽃 시작!');
    }
    
    // petal 이미지 없을 때 대체 코드
    function createCodePetals(ctx, canvas, petals) {
        for (let i = 0; i < 40; i++) {
            petals.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * -2,
                size: 15 + Math.random() * 20,
                speed: 0.3 + Math.random() * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: 0.01,
                sway: Math.random() * 1 - 0.5
            });
        }
        
        function animateCode() {
            if (!sakuraActive || !canvas.parentNode) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            petals.forEach(petal => {
                ctx.save();
                ctx.translate(petal.x, petal.y);
                ctx.rotate(petal.rotation);
                
                // 코드로 그린 벚꽃 꽃잎
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, petal.size);
                gradient.addColorStop(0, '#ffb6c1');
                gradient.addColorStop(0.5, '#ff69b4');
                gradient.addColorStop(1, 'rgba(255, 182, 193, 0.3)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(0, -petal.size);
                ctx.bezierCurveTo(-petal.size*0.3, -petal.size*0.7, -petal.size*0.5, -petal.size*0.2, 0, 0);
                ctx.bezierCurveTo(petal.size*0.5, -petal.size*0.2, petal.size*0.3, -petal.size*0.7, 0, -petal.size);
                ctx.fill();
                
                ctx.restore();
                
                petal.y += petal.speed;
                petal.x += Math.sin(petal.y * 0.01) * petal.sway;
                petal.rotation += petal.rotSpeed;
                
                if (petal.y > canvas.height + 50) {
                    petal.y = -50;
                    petal.x = Math.random() * canvas.width;
                }
            });
            
            animationId = requestAnimationFrame(animateCode);
        }
        
        animateCode();
    }
    
    // 벚꽃 토글 함수
    function toggleSakura() {
        sakuraActive = !sakuraActive;
        
        const button = document.querySelector('#sakuraBtn, #onlySakuraBtn, #sakuraToggle');
        const status = document.querySelector('#sakuraStatus');
        
        if (sakuraActive) {
            // 벚꽃 활성화
            createCanvasSakura();
            
            // 순수 검정 배경 강제 설정 (네이비 배경 방지)
            document.body.style.cssText = `
                background: #000000 !important;
                background-color: #000000 !important;
                background-image: none !important;
            `;
            
            // 버튼 스타일 변경
            if (button) {
                button.style.background = '#FF1493';
                button.style.borderColor = '#FF1493';
            }
            if (status) {
                status.textContent = 'ON';
                status.style.color = 'white';
            }
            
            console.log('🌸 벚꽃 활성화');
        } else {
            // 벚꽃 비활성화
            if (sakuraCanvas) {
                sakuraCanvas.remove();
                sakuraCanvas = null;
            }
            
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            
            // 버튼 스타일 원래대로
            if (button) {
                button.style.background = '#2a2a2a';
                button.style.borderColor = '#444';
            }
            if (status) {
                status.textContent = 'OFF';
                status.style.color = '#999';
            }
            
            console.log('🌸 벚꽃 비활성화');
        }
    }
    
    // 사이드바에 벚꽃 버튼 추가
    function addSakuraButton() {
        const sidebar = document.querySelector('.sidebar-content');
        if (!sidebar) {
            setTimeout(addSakuraButton, 100);
            return;
        }
        
        // 기존 벚꽃 버튼들 모두 제거
        document.querySelectorAll('[id*="sakura"], .sakura-button').forEach(el => el.remove());
        
        // 사이드바 위치 강제 수정 (오른쪽으로)
        const sidebarEl = document.querySelector('.sidebar');
        if (sidebarEl) {
            sidebarEl.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                right: -280px !important;
                left: auto !important;
                width: 280px !important;
                height: 100vh !important;
                background: #111 !important;
                transition: right 0.3s ease !important;
                z-index: 1001 !important;
                box-shadow: -2px 0 10px rgba(0,0,0,0.5) !important;
            `;
        }
        
        // 새 벚꽃 버튼 생성
        const sakuraDiv = document.createElement('div');
        sakuraDiv.innerHTML = `
            <div style="margin: 20px 0; padding: 15px 0; border-top: 1px solid #333;">
                <h4 style="color: #FF1493; margin-bottom: 15px; font-size: 14px; text-align: center;">
                    🌸 벚꽃 배경 모드
                </h4>
                <button id="sakuraBtn" style="
                    width: 100%; padding: 12px; 
                    background: #2a2a2a; color: white; 
                    border: 1px solid #444; border-radius: 8px; 
                    cursor: pointer; font-size: 14px;
                    display: flex; align-items: center; justify-content: space-between;
                    transition: all 0.3s;
                ">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">🌸</span>
                        <span>벚꽃 배경</span>
                    </span>
                    <span id="sakuraStatus" style="font-size: 12px; color: #999;">OFF</span>
                </button>
            </div>
        `;
        
        // 얼굴분석 버튼 위에 삽입
        const faceButton = sidebar.querySelector('button[onclick*="hairgator-face"]');
        if (faceButton && faceButton.parentElement) {
            sidebar.insertBefore(sakuraDiv, faceButton.parentElement);
        } else {
            sidebar.insertBefore(sakuraDiv, sidebar.firstChild);
        }
        
        // 이벤트 연결
        const sakuraBtn = document.getElementById('sakuraBtn');
        if (sakuraBtn) {
            sakuraBtn.addEventListener('click', toggleSakura);
            
            // 호버 효과
            sakuraBtn.addEventListener('mouseenter', function() {
                if (!sakuraActive) {
                    this.style.background = '#3a3a3a';
                }
            });
            
            sakuraBtn.addEventListener('mouseleave', function() {
                if (!sakuraActive) {
                    this.style.background = '#2a2a2a';
                }
            });
        }
        
        console.log('✅ 벚꽃 버튼 생성 완료!');
    }
    
    // 초기화 함수
    function initSakuraSystem() {
        if (isInitialized) return;
        isInitialized = true;
        
        console.log('🌸 벚꽃 시스템 초기화 시작');
        
        // 사이드바 준비 대기 후 버튼 추가
        addSakuraButton();
        
        console.log('🌸 벚꽃 시스템 초기화 완료');
    }
    
    // 전역 함수로 등록
    window.createCanvasSakura = createCanvasSakura;
    window.toggleCanvasSakura = toggleSakura;
    window.initSakuraSystem = initSakuraSystem;
    
    // DOM 준비되면 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSakuraSystem);
    } else {
        setTimeout(initSakuraSystem, 100);
    }
    
    // 추가 백업 초기화
    window.addEventListener('load', () => {
        setTimeout(initSakuraSystem, 200);
    });
    
    console.log('🌸 벚꽃 시스템 로드 완료');
    
})();
