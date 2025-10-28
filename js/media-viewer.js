// HAIRGATOR 미디어 뷰어 - 갤러리 & 동영상 플레이어
// 상세보기 모달의 대표 이미지 + 서브 이미지 + 동영상 통합 뷰어

class MediaViewer {
    constructor() {
        this.currentImageIndex = 0;
        this.images = [];
        this.videoData = null;
        this.isVideoMode = false;
        
        this.init();
    }

    init() {
        this.bindKeyboardEvents();
        console.log('✅ MediaViewer 초기화 완료');
    }

    // ========== 미디어 데이터 로드 ==========
    
    // 헤어스타일 미디어 데이터 설정
    loadMedia(styleData) {
        // 기존 단일 이미지 호환성 유지
        if (styleData.imageUrl && !styleData.media) {
            this.images = [styleData.imageUrl];
            this.currentImageIndex = 0;
            this.videoData = null;
        } 
        // 새로운 다중 미디어 형식
        else if (styleData.media) {
            this.images = styleData.media.images || [];
            this.currentImageIndex = styleData.media.mainImageIndex || 0;
            this.videoData = styleData.media.video || null;
        } 
        // 미디어 데이터가 없는 경우
        else {
            this.images = [];
            this.currentImageIndex = 0;
            this.videoData = null;
        }
        
        this.isVideoMode = false;
        this.renderMediaViewer();
    }

    // ========== 뷰어 렌더링 ==========
    
    // 메인 미디어 뷰어 렌더링
    renderMediaViewer() {
        const container = document.getElementById('mediaViewerContainer');
        if (!container) {
            console.warn('mediaViewerContainer를 찾을 수 없습니다');
            return;
        }
        
        container.innerHTML = this.generateViewerHTML();
        this.bindViewerEvents();
    }
    
    // 뷰어 HTML 생성
    generateViewerHTML() {
        if (this.images.length === 0 && !this.videoData) {
            return '<div class="no-media">등록된 미디어가 없습니다</div>';
        }
        
        return `
            <div class="media-viewer">
                <div class="main-display">
                    ${this.generateMainDisplayHTML()}
                    ${this.images.length > 0 && this.videoData ? this.generateMediaToggleHTML() : ''}
                </div>
            </div>
        `;
    }
    
    // 메인 디스플레이 HTML 생성
    generateMainDisplayHTML() {
        if (this.isVideoMode && this.videoData) {
            return this.generateVideoPlayerHTML();
        } else if (this.images.length > 0) {
            return this.generateImageDisplayHTML();
        } else {
            return '<div class="no-display">표시할 미디어가 없습니다</div>';
        }
    }
    
    // 이미지 디스플레이 HTML
    generateImageDisplayHTML() {
        const currentImage = this.images[this.currentImageIndex];
        
        return `
            <div class="image-display">
                <img src="${currentImage}" 
                     alt="헤어스타일 이미지 ${this.currentImageIndex + 1}" 
                     class="main-image"
                     onclick="mediaViewer.openFullscreen('${currentImage}')">
                
                ${this.images.length > 1 ? `
                    <button class="nav-btn nav-prev" onclick="mediaViewer.previousImage()" title="이전 이미지">‹</button>
                    <button class="nav-btn nav-next" onclick="mediaViewer.nextImage()" title="다음 이미지">›</button>
                    
                    <div class="image-counter">
                        ${this.currentImageIndex + 1} / ${this.images.length}
                    </div>
                ` : ''}
                
                <button class="fullscreen-btn" onclick="mediaViewer.openFullscreen('${currentImage}')" title="전체화면">⛶</button>
            </div>
        `;
    }
    
    // 동영상 플레이어 HTML
    generateVideoPlayerHTML() {
        if (!this.videoData) return '';
        
        return `
            <div class="video-display">
                <div class="video-container">
                    <iframe src="${this.videoData.embedUrl}" 
                            frameborder="0" 
                            allowfullscreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            class="video-player">
                    </iframe>
                </div>
                
                <div class="video-meta">
                    <span class="video-platform">${this.videoData.type.toUpperCase()}</span>
                    <button class="external-link-btn" onclick="window.open('${this.videoData.url}', '_blank')" title="새 창에서 열기">↗</button>
                </div>
            </div>
        `;
    }
    
    // 미디어 전환 버튼 HTML
    generateMediaToggleHTML() {
        return `
            <div class="media-toggle">
                <button class="toggle-btn ${!this.isVideoMode ? 'active' : ''}" 
                        onclick="mediaViewer.switchToImages()" 
                        title="이미지 보기">
                    📷 이미지 (${this.images.length})
                </button>
                <button class="toggle-btn ${this.isVideoMode ? 'active' : ''}" 
                        onclick="mediaViewer.switchToVideo()" 
                        title="동영상 보기">
                    🎬 동영상
                </button>
            </div>
        `;
    }
    
    // 썸네일 갤러리 HTML (호출 안 됨)
    generateThumbnailGalleryHTML() {
        const thumbnails = this.images.map((image, index) => `
            <div class="thumbnail-item ${index === this.currentImageIndex ? 'active' : ''}" 
                 onclick="mediaViewer.selectImage(${index})">
                <img src="${image}" alt="썸네일 ${index + 1}">
                <div class="thumbnail-overlay">
                    ${index === 0 ? '<span class="main-badge">대표</span>' : ''}
                </div>
            </div>
        `).join('');
        
        return `
            <div class="thumbnail-gallery">
                <div class="thumbnail-container">
                    ${thumbnails}
                </div>
            </div>
        `;
    }
    
    // 미디어 정보 HTML (호출 안 됨)
    generateMediaInfoHTML() {
        const imageInfo = this.images.length > 0 ? `이미지 ${this.images.length}장` : '';
        const videoInfo = this.videoData ? `동영상 (${this.videoData.type.toUpperCase()})` : '';
        
        const parts = [imageInfo, videoInfo].filter(Boolean);
        
        return parts.length > 0 ? `<span class="media-summary">${parts.join(' • ')}</span>` : '';
    }

    // ========== 이벤트 처리 ==========
    
    // 뷰어 이벤트 바인딩
    bindViewerEvents() {
        this.bindTouchEvents();
    }
    
    // 키보드 이벤트 바인딩
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('styleModal');
            if (!modal || !modal.classList.contains('active')) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextImage();
                    break;
                case 'Escape':
                    this.closeFullscreen();
                    break;
            }
        });
    }
    
    // 터치 이벤트 바인딩
    bindTouchEvents() {
        const mainDisplay = document.querySelector('.main-display');
        if (!mainDisplay) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        
        mainDisplay.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        mainDisplay.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.previousImage();
                } else {
                    this.nextImage();
                }
            }
            
            touchStartX = 0;
            touchStartY = 0;
        });
    }

    // ========== 이미지 네비게이션 ==========
    
    previousImage() {
        if (this.images.length <= 1) return;
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.updateImageDisplay();
    }
    
    nextImage() {
        if (this.images.length <= 1) return;
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.updateImageDisplay();
    }
    
    selectImage(index) {
        if (index < 0 || index >= this.images.length) return;
        this.currentImageIndex = index;
        this.updateImageDisplay();
    }
    
    updateImageDisplay() {
        const imageElement = document.querySelector('.main-image');
        const counterElement = document.querySelector('.image-counter');
        const thumbnails = document.querySelectorAll('.thumbnail-item');
        
        if (imageElement) {
            const currentImage = this.images[this.currentImageIndex];
            imageElement.src = currentImage;
            imageElement.onclick = () => this.openFullscreen(currentImage);
        }
        
        if (counterElement) {
            counterElement.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        }
        
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentImageIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // ========== 미디어 모드 전환 ==========
    
    switchToImages() {
        if (this.images.length === 0) return;
        this.isVideoMode = false;
        this.renderMediaViewer();
    }
    
    switchToVideo() {
        if (!this.videoData) return;
        this.isVideoMode = true;
        this.renderMediaViewer();
    }

    // ========== 전체화면 ==========
    
    openFullscreen(imageUrl) {
        const fullscreenModal = document.createElement('div');
        fullscreenModal.className = 'fullscreen-modal';
        fullscreenModal.innerHTML = `
            <div class="fullscreen-content">
                <img src="${imageUrl}" alt="전체화면 이미지" class="fullscreen-image">
                <button class="fullscreen-close" onclick="mediaViewer.closeFullscreen()">×</button>
                
                ${this.images.length > 1 ? `
                    <button class="fullscreen-prev" onclick="mediaViewer.fullscreenPrevImage()">‹</button>
                    <button class="fullscreen-next" onclick="mediaViewer.fullscreenNextImage()">›</button>
                    <div class="fullscreen-counter">${this.currentImageIndex + 1} / ${this.images.length}</div>
                ` : ''}
            </div>
        `;
        
        fullscreenModal.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) {
                this.closeFullscreen();
            }
        });
        
        document.body.appendChild(fullscreenModal);
        document.body.style.overflow = 'hidden';
        
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    fullscreenPrevImage() {
        this.previousImage();
        this.updateFullscreenDisplay();
    }
    
    fullscreenNextImage() {
        this.nextImage();
        this.updateFullscreenDisplay();
    }
    
    updateFullscreenDisplay() {
        const fullscreenImage = document.querySelector('.fullscreen-image');
        const fullscreenCounter = document.querySelector('.fullscreen-counter');
        
        if (fullscreenImage) {
            fullscreenImage.src = this.images[this.currentImageIndex];
        }
        
        if (fullscreenCounter) {
            fullscreenCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        }
    }
    
    closeFullscreen() {
        const modal = document.querySelector('.fullscreen-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
}

// 전역 인스턴스 생성
const mediaViewer = new MediaViewer();
window.mediaViewer = mediaViewer;

console.log('✅ MediaViewer 스크립트 로드 완료');
