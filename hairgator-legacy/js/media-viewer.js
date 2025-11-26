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
                <!-- 메인 디스플레이 영역 -->
                <div class="main-display">
                    ${this.generateMainDisplayHTML()}
                    
                    <!-- 미디어 전환 버튼 -->
                    ${this.images.length > 0 && this.videoData ? this.generateMediaToggleHTML() : ''}
                </div>
                
                <!-- 썸네일 갤러리 -->
                ${false ? this.generateThumbnailGalleryHTML() : ''}
                
                
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
                
                <!-- 이미지 네비게이션 -->
                ${this.images.length > 1 ? `
                    <button class="nav-btn nav-prev" onclick="mediaViewer.previousImage()" title="이전 이미지">‹</button>
                    <button class="nav-btn nav-next" onclick="mediaViewer.nextImage()" title="다음 이미지">›</button>
                    
                    <div class="image-counter">
                        ${this.currentImageIndex + 1} / ${this.images.length}
                    </div>
                ` : ''}
                
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
    
    // 썸네일 갤러리 HTML
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
    
    // 미디어 정보 HTML
    generateMediaInfoHTML() {
    // ⭐ 미디어 정보 표시 안 함
    return '';
}

    // ========== 이벤트 처리 ==========
    
    // 뷰어 이벤트 바인딩
    bindViewerEvents() {
        // 터치 이벤트 (모바일 스와이프)
        this.bindTouchEvents();
    }
    
    // 키보드 이벤트 바인딩
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // 모달이 열려있을 때만 작동
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
    
    // 터치 이벤트 바인딩 (모바일 스와이프)
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
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;
            
            // 수평 스와이프가 수직 스와이프보다 클 때만 처리
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.nextImage(); // 왼쪽 스와이프 = 다음 이미지
                } else {
                    this.previousImage(); // 오른쪽 스와이프 = 이전 이미지
                }
            }
            
            touchStartX = 0;
            touchStartY = 0;
        });
    }

    // ========== 이미지 네비게이션 ==========
    
    // 다음 이미지
    nextImage() {
        if (this.images.length <= 1) return;
        
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.updateImageDisplay();
    }
    
    // 이전 이미지
    previousImage() {
        if (this.images.length <= 1) return;
        
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.updateImageDisplay();
    }
    
    // 특정 이미지 선택
    selectImage(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentImageIndex = index;
            this.updateImageDisplay();
        }
    }
    
    // 이미지 디스플레이 업데이트 (전체 재렌더링 없이)
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
        
        // 썸네일 활성 상태 업데이트
        thumbnails.forEach((thumb, index) => {
            if (index === this.currentImageIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // ========== 미디어 모드 전환 ==========
    
    // 이미지 모드로 전환
    switchToImages() {
        if (this.images.length === 0) return;
        
        this.isVideoMode = false;
        this.renderMediaViewer();
    }
    
    // 동영상 모드로 전환
    switchToVideo() {
        if (!this.videoData) return;
        
        this.isVideoMode = true;
        this.renderMediaViewer();
    }

    // ========== 전체화면 ==========
    
    // 이미지 전체화면 열기
    openFullscreen(imageUrl) {
        const fullscreenModal = document.createElement('div');
        fullscreenModal.className = 'fullscreen-modal';
        fullscreenModal.innerHTML = `
            <div class="fullscreen-content">
                <img src="${imageUrl}" alt="전체화면 이미지" class="fullscreen-image">
                <button class="fullscreen-close" onclick="mediaViewer.closeFullscreen()">×</button>
                
                ${this.images.length > 1 ? `
                    <button class="fullscreen-nav fullscreen-prev" onclick="mediaViewer.fullscreenPrevious()">‹</button>
                    <button class="fullscreen-nav fullscreen-next" onclick="mediaViewer.fullscreenNext()">›</button>
                    <div class="fullscreen-counter">${this.currentImageIndex + 1} / ${this.images.length}</div>
                ` : ''}
            </div>
            <div class="fullscreen-overlay" onclick="mediaViewer.closeFullscreen()"></div>
        `;
        
        document.body.appendChild(fullscreenModal);
        document.body.style.overflow = 'hidden';
        
        // 애니메이션
        setTimeout(() => fullscreenModal.classList.add('active'), 10);
    }
    
    // 전체화면 닫기
    closeFullscreen() {
        const fullscreenModal = document.querySelector('.fullscreen-modal');
        if (fullscreenModal) {
            fullscreenModal.classList.remove('active');
            setTimeout(() => {
                fullscreenModal.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }
    
    // 전체화면 이전 이미지
    fullscreenPrevious() {
        this.previousImage();
        const fullscreenImage = document.querySelector('.fullscreen-image');
        const fullscreenCounter = document.querySelector('.fullscreen-counter');
        
        if (fullscreenImage) {
            fullscreenImage.src = this.images[this.currentImageIndex];
        }
        if (fullscreenCounter) {
            fullscreenCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        }
    }
    
    // 전체화면 다음 이미지
    fullscreenNext() {
        this.nextImage();
        const fullscreenImage = document.querySelector('.fullscreen-image');
        const fullscreenCounter = document.querySelector('.fullscreen-counter');
        
        if (fullscreenImage) {
            fullscreenImage.src = this.images[this.currentImageIndex];
        }
        if (fullscreenCounter) {
            fullscreenCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        }
    }

    // ========== 유틸리티 ==========
    
    // 현재 표시 중인 미디어 정보
    getCurrentMedia() {
        return {
            type: this.isVideoMode ? 'video' : 'image',
            imageIndex: this.currentImageIndex,
            imageUrl: this.images[this.currentImageIndex] || null,
            videoData: this.videoData,
            totalImages: this.images.length,
            hasVideo: !!this.videoData
        };
    }
    
    // 뷰어 상태 초기화
    reset() {
        this.currentImageIndex = 0;
        this.images = [];
        this.videoData = null;
        this.isVideoMode = false;
        
        // 전체화면 모달이 열려있으면 닫기
        this.closeFullscreen();
    }
    
    // 디버깅 정보
    getDebugInfo() {
        return {
            currentImageIndex: this.currentImageIndex,
            totalImages: this.images.length,
            hasVideo: !!this.videoData,
            isVideoMode: this.isVideoMode,
            videoType: this.videoData?.type || null
        };
    }
}

// ========== 기존 styleModal 연동 ==========

// 기존 openStyleModal 함수 확장
function enhanceStyleModal() {
    const originalOpenStyleModal = window.openStyleModal;
    
    if (originalOpenStyleModal) {
        window.openStyleModal = function(style) {
            // 기존 모달 열기 로직 실행
            originalOpenStyleModal(style);
            
            // MediaViewer에 데이터 로드
            if (window.mediaViewer && style) {
                setTimeout(() => {
                    window.mediaViewer.loadMedia(style);
                }, 100); // DOM 업데이트 대기
            }
        };
    }
}

// ========== 글로벌 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    // MediaViewer 인스턴스 생성
    window.mediaViewer = new MediaViewer();
    window.HAIRGATOR_MEDIA_VIEWER = window.mediaViewer; // 별칭 추가

    // 기존 모달 시스템과 연동
    enhanceStyleModal();

    console.log('✅ HAIRGATOR MediaViewer 로드 완료');
});

// ========== 글로벌 함수 노출 ==========
window.MediaViewer = MediaViewer;
window.enhanceStyleModal = enhanceStyleModal;
