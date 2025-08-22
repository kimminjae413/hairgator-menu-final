// ========== 벚꽃 배경 시스템 (Canvas + petal.png) ==========
// 태블릿/데스크톱 전용, 모바일 제외

(function() {
    'use strict';
    
    // ========== 전역 변수 ==========
    let isInitialized = false;
    let sakuraActive = false;
    let sakuraCanvas = null;
    let animationId = null;
    let petals = [];
    let petalImage = null;
    
    // ========== 디바이스 체크 (모바일 제외) ==========
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
               && window.innerWidth < 768;
    }
    
    // ========== 초기화 ==========
    function initSakuraSystem() {
        if (isInitialized || isMobileDevice()) {
            return;
        }
        
        console.log('🌸 벚꽃 시스템 초기화 시작 (태블릿/데스크톱)');
        
        // petal.png 이미지 미리 로드
        loadPetalImage();
        
        // 사이드바 준비 대기
        waitForSidebar();
        
        isInitialized = true;
    }
    
    // ========== petal.png 이미지 로드 ==========
    function loadPetalImage() {
        petalImage = new Image();
        petalImage.crossOrigin = 'anonymous';
        petalImage.src = './petal.png';
        
        petalImage.onload = () => {
            console.log('✅ petal.png 로드 성공');
        };
        
        petalImage.onerror = () => {
            console.log('❌ petal.png 로드 실패 - 대체 이미지 사용');
            petalImage = null;
        };
    }
    
    // ========== 사이드바 대기 및 버튼 추가 ==========
    function waitForSidebar() {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkInterval = setInterval(() => {
            attempts++;
            const sidebarContent = document.querySelector('.sidebar-content');
            
            if (sidebarContent) {
                clearInterval(checkInterval);
                setTimeout(() => addSakuraButton(), 300);
                return;
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('⚠️ 사이드바 찾기 타임아웃');
            }
        }, 100);
    }
    
    // ========== 사이드바에 벚꽃 버튼 추가 ==========
    function addSakuraButton() {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent || document.getElementById('sakuraBgSection')) {
            return;
        }
        
        // 테마 토글 찾기
        const themeToggleWrapper = sidebarContent.querySelector('.theme-toggle-wrapper');
        if (!themeToggleWrapper) {
            console.log('⚠️ 테마 토글을 찾을 수 없어 사이드바 끝에 추가');
        }
        
        // 벚꽃 배경 섹션 생성
        const sakuraSection = document.createElement('div');
        sakuraSection.id = 'sakuraBgSection';
        sakuraSection.innerHTML = `
            <div style="margin: 20px 0; padding: 15px 0; border-top: 1px solid #333;">
                <h4 style="color: #999; margin-bottom: 12px; font-size: 13px; font-weight: 500;">
                    배경
                </h4>
                <button id="sakuraToggleBtn" style="
                    width: 100%; 
                    padding: 10px 12px; 
                    background: #222; 
                    color: #999; 
                    border: 1px solid #333; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: all 0.3s ease;
                ">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">🌸</span>
                        <span>벚꽃</span>
                    </span>
                    <span id="sakuraStatus" style="font-size: 11px; color: #666;">OFF</span>
                </button>
            </div>
        `;
        
        // 테마 토글 다음에 삽입, 없으면 끝에 추가
        if (themeToggleWrapper && themeToggleWrapper.nextSibling) {
            sidebarContent.insertBefore(sakuraSection, themeToggleWrapper.nextSibling);
        } else {
            sidebarContent.appendChild(sakuraSection);
        }
        
        // 이벤트 설정
        setupSakuraButton();
        
        console.log('✅ 벚꽃 버튼 추가 완료');
    }
    
    // ========== 버튼 이벤트 설정 ==========
    function setupSakuraButton() {
        const button = document.getElementById('sakuraToggleBtn');
        const status = document.getElementById('sakuraStatus');
        
        if (!button) return;
        
        // 클릭 이벤트
        button.addEventListener('click', toggleSakura);
        
        // 호버 효과
        button.addEventListener('mouseenter', function() {
            if (!sakuraActive) {
                this.style.background = '#2a2a2a';
                this.style.borderColor = '#444';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            if (!sakuraActive) {
                this.style.background = '#222';
                this.style.borderColor = '#333';
            }
        });
    }
    
    // ========== 벚꽃 토글 ==========
    function toggleSakura() {
        sakuraActive = !sakuraActive;
        
        const button = document.getElementById('sakuraToggleBtn');
        const status = document.getElementById('sakuraStatus');
        
        if (sakuraActive) {
            // 벚꽃 활성화
            createSakuraCanvas();
            
            // 버튼 스타일 변경 (핑크 톤)
            if (button) {
                button.style.background = '#FF1493';
                button.style.borderColor = '#FF1493';
                button.style.color = '#fff';
            }
            if (status) {
                status.textContent = 'ON';
                status.style.color = '#fff';
            }
            
            console.log('🌸 벚꽃 배경 활성화');
            
        } else {
            // 벚꽃 비활성화
            destroySakuraCanvas();
            
            // 버튼 스타일 원래대로
            if (button) {
                button.style.background = '#222';
                button.style.borderColor = '#333';
                button.style.color = '#999';
            }
            if (status) {
                status.textContent = 'OFF';
                status.style.color = '#666';
            }
            
            console.log('🌸 벚꽃 배경 비활성화');
        }
    }
    
    // ========== Canvas 벚꽃 생성 ==========
    function createSakuraCanvas() {
        // 기존 캔버스 제거
        destroySakuraCanvas();
        
        // 새 캔버스 생성
        const canvas = document.createElement('canvas');
        canvas.id = 'sakura-canvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
            opacity: 0.7;
        `;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        document.body.appendChild(canvas);
        sakuraCanvas = canvas;
        
        const ctx = canvas.getContext('2d');
        
        // 벚꽃잎 초기화 (적당한 개수)
        initPetals();
        
        // 애니메이션 시작
        animatePetals(ctx);
        
        // 리사이즈 이벤트
        window.addEventListener('resize', handleResize);
    }
    
    // ========== 벚꽃잎 초기화 ==========
    function initPetals() {
        petals = [];
        const petalCount = Math.floor(window.innerWidth / 40); // 화면 크기에 비례
        const maxPetals = 35; // 최대 개수 제한
        const finalCount = Math.min(petalCount, maxPetals);
        
        for (let i = 0; i < finalCount; i++) {
            petals.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight * -1.5, // 화면 위쪽에서 시작
                size: 12 + Math.random() * 18, // 크기 12~30px
                speed: 0.3 + Math.random() * 0.4, // 떨어지는 속도
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                swaySpeed: 0.02 + Math.random() * 0.02,
                swayAmount: 0.5 + Math.random() * 1,
                opacity: 0.6 + Math.random() * 0.4
            });
        }
        
        console.log(`🌸 벚꽃잎 ${finalCount}개 생성`);
    }
    
    // ========== 벚꽃잎 애니메이션 ==========
    function animatePetals(ctx) {
        if (!sakuraActive || !sakuraCanvas || !ctx) {
            return;
        }
        
        // 캔버스 클리어
        ctx.clearRect(0, 0, sakuraCanvas.width, sakuraCanvas.height);
        
        // 각 꽃잎 그리기 및 업데이트
        petals.forEach(petal => {
            ctx.save();
            
            // 투명도 설정
            ctx.globalAlpha = petal.opacity;
            
            // 꽃잎 위치로 이동 및 회전
            ctx.translate(petal.x, petal.y);
            ctx.rotate(petal.rotation);
            
            // 꽃잎 그리기
            if (petalImage && petalImage.complete) {
                // petal.png 이미지 사용
                ctx.drawImage(
                    petalImage, 
                    -petal.size / 2, 
                    -petal.size / 2, 
                    petal.size, 
                    petal.size
                );
            } else {
                // 대체 꽃잎 (코드로 그리기)
                drawCodePetal(ctx, petal.size);
            }
            
            ctx.restore();
            
            // 꽃잎 움직임 업데이트
            updatePetal(petal);
        });
        
        // 다음 프레임 요청
        animationId = requestAnimationFrame(() => animatePetals(ctx));
    }
    
    // ========== 꽃잎 움직임 업데이트 ==========
    function updatePetal(petal) {
        // 중력으로 아래로 떨어짐
        petal.y += petal.speed;
        
        // 좌우 흔들림 (바람 효과)
        petal.x += Math.sin(petal.y * petal.swaySpeed) * petal.swayAmount;
        
        // 회전
        petal.rotation += petal.rotationSpeed;
        
        // 화면 밖으로 나가면 다시 위에서 시작
        if (petal.y > window.innerHeight + 50) {
            petal.y = -50 - Math.random() * 100;
            petal.x = Math.random() * window.innerWidth;
            petal.rotation = Math.random() * Math.PI * 2;
        }
        
        // 좌우로 너무 벗어나면 조정
        if (petal.x < -50) {
            petal.x = window.innerWidth + 50;
        } else if (petal.x > window.innerWidth + 50) {
            petal.x = -50;
        }
    }
    
    // ========== 대체 꽃잎 그리기 (petal.png 실패 시) ==========
    function drawCodePetal(ctx, size) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
        gradient.addColorStop(0, '#ffb6c1');
        gradient.addColorStop(0.7, '#ff69b4');
        gradient.addColorStop(1, 'rgba(255, 182, 193, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // 꽃잎 모양 패스
        ctx.moveTo(0, -size/2);
        ctx.bezierCurveTo(-size/3, -size/3, -size/2, -size/6, 0, 0);
        ctx.bezierCurveTo(size/2, -size/6, size/3, -size/3, 0, -size/2);
        
        ctx.fill();
    }
    
    // ========== 벚꽃 Canvas 제거 ==========
    function destroySakuraCanvas() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        if (sakuraCanvas) {
            sakuraCanvas.remove();
            sakuraCanvas = null;
        }
        
        petals = [];
    }
    
    // ========== 화면 크기 변경 대응 ==========
    function handleResize() {
        if (sakuraCanvas) {
            sakuraCanvas.width = window.innerWidth;
            sakuraCanvas.height = window.innerHeight;
            
            // 꽃잎 개수 재조정
            initPetals();
        }
    }
    
    // ========== 초기화 실행 ==========
    
    // DOM 준비 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSakuraSystem);
    } else {
        setTimeout(initSakuraSystem, 100);
    }
    
    // 추가 백업 초기화
    window.addEventListener('load', () => {
        setTimeout(initSakuraSystem, 200);
    });
    
    console.log('🌸 벚꽃 시스템 스크립트 로드됨 (petal.png + Canvas)');
    
})();
