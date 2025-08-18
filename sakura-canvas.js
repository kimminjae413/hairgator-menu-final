// ========== Canvas 벚꽃 시스템 - 최종 완성 버전 ==========

// Canvas 벚꽃 생성 함수
function createCanvasSakura() {
    // 기존 캔버스 제거
    const existingCanvas = document.querySelector('#sakura-canvas');
    if (existingCanvas) existingCanvas.remove();
    
    // 새 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.id = 'sakura-canvas';
    canvas.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.8;
    `;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const TOTAL = 80; // 꽃잎 개수
    const petalArray = [];
    
    // 벚꽃 꽃잎 그리기 함수
    function drawPetal(ctx, x, y, w, h, opacity, flip) {
        ctx.globalAlpha = opacity;
        ctx.save();
        ctx.translate(x + w/2, y + h/2);
        ctx.rotate(flip);
        
        // 벚꽃 꽃잎 모양 그리기
        ctx.beginPath();
        ctx.fillStyle = Math.random() > 0.5 ? '#ff69b4' : '#ffb6c1';
        ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 흰색 벚꽃도 섞기
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // 벚꽃 꽃잎 클래스
    class Petal {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height * 2 - canvas.height;
            this.w = 8 + Math.random() * 12;
            this.h = 6 + Math.random() * 8;
            this.opacity = (this.w / 20) * 0.8;
            
            // 느린 속도로 설정
            this.xSpeed = 0.3 + Math.random() * 0.8;
            this.ySpeed = 0.2 + Math.random() * 0.4;
            
            this.flip = Math.random() * Math.PI * 2;
            this.flipSpeed = Math.random() * 0.01;
        }
        
        draw() {
            // 화면 밖으로 나가면 다시 위에서 시작
            if (this.y > canvas.height || this.x > canvas.width) {
                this.x = -this.w;
                this.y = Math.random() * canvas.height * 2 - canvas.height;
                this.xSpeed = 0.3 + Math.random() * 0.8;
                this.ySpeed = 0.2 + Math.random() * 0.4;
                this.flip = Math.random() * Math.PI * 2;
            }
            
            drawPetal(ctx, this.x, this.y, this.w, this.h, this.opacity, this.flip);
        }
        
        animate() {
            this.x += this.xSpeed;
            this.y += this.ySpeed;
            this.flip += this.flipSpeed;
            this.draw();
        }
    }
    
    // 꽃잎 생성
    for (let i = 0; i < TOTAL; i++) {
        petalArray.push(new Petal());
    }
    
    // 렌더링 함수
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        petalArray.forEach(petal => petal.animate());
        window.requestAnimationFrame(render);
    }
    
    // 화면 크기 변경 대응
    const resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeHandler);
    
    // 정리 함수
    canvas.destroy = () => {
        window.removeEventListener('resize', resizeHandler);
        canvas.remove();
    };
    
    render();
    console.log('🌸 Canvas 벚꽃 시작!');
    return canvas;
}

// 벚꽃 토글 함수
function toggleCanvasSakura() {
    const isActive = document.body.classList.contains('sakura-background');
    
    if (isActive) {
        // 벚꽃 활성화
        window.sakuraCanvas = createCanvasSakura();
        
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
        
        console.log('🌸 벚꽃 활성화');
    } else {
        // 벚꽃 비활성화
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

// 전역 함수로 등록
window.createCanvasSakura = createCanvasSakura;
window.toggleCanvasSakura = toggleCanvasSakura;
