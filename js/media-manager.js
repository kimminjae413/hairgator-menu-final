// HAIRGATOR 미디어 관리자 - 다중 이미지 & 동영상 URL 지원
// 모듈화 원칙 준수, 용량 최적화 중심

class MediaManager {
    constructor() {
        this.maxImages = 5; // 최대 이미지 개수
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        
        this.selectedImages = []; // 선택된 이미지 파일들
        this.videoUrl = ''; // YouTube/Vimeo URL
        this.mainImageIndex = 0; // 대표 이미지 인덱스
        
        this.init();
    }

    init() {
        console.log('✅ MediaManager 초기화 완료');
    }

    // ========== 다중 이미지 처리 ==========
    
    // 이미지 파일들 추가
    addImages(files) {
        const fileArray = Array.from(files);
        const validFiles = [];
        
        for (const file of fileArray) {
            // 파일 개수 체크
            if (this.selectedImages.length + validFiles.length >= this.maxImages) {
                this.showToast(`최대 ${this.maxImages}장까지만 업로드 가능합니다`, 'warning');
                break;
            }
            
            // 파일 형식 체크
            if (!this.supportedImageTypes.includes(file.type)) {
                this.showToast(`${file.name}: 지원하지 않는 형식입니다 (JPG, PNG, WebP만 가능)`, 'error');
                continue;
            }
            
            // 파일 크기 체크
            if (file.size > this.maxFileSize) {
                this.showToast(`${file.name}: 파일 크기가 ${Math.round(this.maxFileSize / 1024 / 1024)}MB를 초과합니다`, 'error');
                continue;
            }
            
            validFiles.push(file);
        }
        
        // 유효한 파일들 추가
        this.selectedImages.push(...validFiles);
        this.updateImagePreview();
        
        console.log(`이미지 추가 완료: ${validFiles.length}개, 총 ${this.selectedImages.length}개`);
    }
    
    // 이미지 제거
    removeImage(index) {
        if (index >= 0 && index < this.selectedImages.length) {
            const removedFile = this.selectedImages.splice(index, 1)[0];
            
            // 대표 이미지 인덱스 조정
            if (this.mainImageIndex >= this.selectedImages.length) {
                this.mainImageIndex = Math.max(0, this.selectedImages.length - 1);
            }
            
            this.updateImagePreview();
            console.log(`이미지 제거: ${removedFile.name}`);
        }
    }
    
    // 대표 이미지 설정
    setMainImage(index) {
        if (index >= 0 && index < this.selectedImages.length) {
            this.mainImageIndex = index;
            this.updateImagePreview();
            console.log(`대표 이미지 설정: ${index}번째`);
        }
    }
    
    // 이미지 미리보기 업데이트
    updateImagePreview() {
        const container = document.getElementById('imagePreviewContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.selectedImages.length === 0) {
            container.innerHTML = '<p class="no-images">선택된 이미지가 없습니다</p>';
            return;
        }
        
        this.selectedImages.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDiv = document.createElement('div');
                imageDiv.className = `image-preview-item ${index === this.mainImageIndex ? 'main' : ''}`;
                
                imageDiv.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <div class="image-controls">
                        <button class="set-main-btn ${index === this.mainImageIndex ? 'active' : ''}" 
                                onclick="mediaManager.setMainImage(${index})" 
                                title="${index === this.mainImageIndex ? '대표 이미지' : '대표로 설정'}">
                            ${index === this.mainImageIndex ? '★' : '☆'}
                        </button>
                        <button class="remove-btn" 
                                onclick="mediaManager.removeImage(${index})" 
                                title="제거">×</button>
                    </div>
                    <div class="image-index">${index + 1}</div>
                `;
                
                container.appendChild(imageDiv);
            };
            reader.readAsDataURL(file);
        });
    }

    // ========== 동영상 URL 처리 ==========
    
    // 동영상 URL 설정
    setVideoUrl(url) {
        const cleanUrl = url.trim();
        
        if (!cleanUrl) {
            this.videoUrl = '';
            this.updateVideoPreview();
            return true;
        }
        
        const validationResult = this.validateVideoUrl(cleanUrl);
        
        if (validationResult.valid) {
            this.videoUrl = validationResult.embedUrl;
            this.updateVideoPreview();
            this.showToast('동영상 URL이 설정되었습니다', 'success');
            return true;
        } else {
            this.showToast(validationResult.error, 'error');
            return false;
        }
    }
    
    // 동영상 URL 유효성 검사 및 임베드 URL 생성
    validateVideoUrl(url) {
        // YouTube URL 패턴
        const youtubePatterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];
        
        // Vimeo URL 패턴
        const vimeoPattern = /(?:vimeo\.com\/)([0-9]+)/;
        
        // Instagram Reels 패턴
        const instagramPattern = /(?:instagram\.com\/reel\/)([^&\n?#/]+)/;
        
        // YouTube 체크
        for (const pattern of youtubePatterns) {
            const match = url.match(pattern);
            if (match) {
                const videoId = match[1];
                return {
                    valid: true,
                    type: 'youtube',
                    videoId: videoId,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                };
            }
        }
        
        // Vimeo 체크
        const vimeoMatch = url.match(vimeoPattern);
        if (vimeoMatch) {
            const videoId = vimeoMatch[1];
            return {
                valid: true,
                type: 'vimeo',
                videoId: videoId,
                embedUrl: `https://player.vimeo.com/video/${videoId}`,
                thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`
            };
        }
        
        // Instagram 체크
        const instagramMatch = url.match(instagramPattern);
        if (instagramMatch) {
            return {
                valid: true,
                type: 'instagram',
                videoId: instagramMatch[1],
                embedUrl: `${url}embed/`,
                thumbnailUrl: null
            };
        }
        
        return {
            valid: false,
            error: 'YouTube, Vimeo, Instagram Reels URL만 지원됩니다'
        };
    }
    
    // 동영상 미리보기 업데이트
    updateVideoPreview() {
        const container = document.getElementById('videoPreviewContainer');
        if (!container) return;
        
        if (!this.videoUrl) {
            container.innerHTML = '<p class="no-video">설정된 동영상이 없습니다</p>';
            return;
        }
        
        const validation = this.validateVideoUrl(this.videoUrl);
        
        container.innerHTML = `
            <div class="video-preview-item">
                <div class="video-thumbnail">
                    ${validation.thumbnailUrl ? 
                        `<img src="${validation.thumbnailUrl}" alt="Video thumbnail" onerror="this.style.display='none'">` : 
                        '<div class="video-placeholder">📹</div>'
                    }
                    <div class="play-overlay">▶</div>
                </div>
                <div class="video-info">
                    <span class="video-type">${validation.type.toUpperCase()}</span>
                    <button class="remove-video-btn" onclick="mediaManager.setVideoUrl('')" title="동영상 제거">×</button>
                </div>
            </div>
        `;
    }

    // ========== Firebase Storage 업로드 ==========
    
    // 모든 이미지를 Firebase에 업로드
    async uploadImages() {
        if (this.selectedImages.length === 0) {
            return { urls: [], mainIndex: 0 };
        }
        
        const uploadPromises = this.selectedImages.map((file, index) => 
            this.uploadSingleImage(file, index)
        );
        
        try {
            const urls = await Promise.all(uploadPromises);
            console.log('모든 이미지 업로드 완료:', urls.length);
            
            return {
                urls: urls,
                mainIndex: this.mainImageIndex
            };
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            throw new Error('이미지 업로드 중 오류가 발생했습니다');
        }
    }
    
    // 단일 이미지 업로드
    async uploadSingleImage(file, index) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileName = `images/${timestamp}_${index}_${random}.${file.name.split('.').pop()}`;
        
        const storageRef = firebase.storage().ref().child(fileName);
        
        try {
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            console.log(`이미지 ${index + 1} 업로드 완료:`, downloadURL);
            return downloadURL;
        } catch (error) {
            console.error(`이미지 ${index + 1} 업로드 실패:`, error);
            throw error;
        }
    }

    // ========== 데이터 구조 생성 ==========
    
    // 저장용 미디어 데이터 생성
    getMediaData() {
        const validation = this.videoUrl ? this.validateVideoUrl(this.videoUrl) : null;
        
        return {
            images: [], // 업로드 후 URLs로 채워짐
            mainImageIndex: this.mainImageIndex,
            video: this.videoUrl ? {
                url: this.videoUrl,
                type: validation?.type || 'unknown',
                embedUrl: validation?.embedUrl || this.videoUrl,
                thumbnailUrl: validation?.thumbnailUrl || null
            } : null,
            totalImages: this.selectedImages.length,
            hasVideo: !!this.videoUrl
        };
    }
    
    // 기존 데이터로 초기화 (수정 모드용)
    loadExistingMedia(mediaData) {
        if (!mediaData) return;
        
        // 기존 이미지는 URL이므로 selectedImages에 직접 로드할 수 없음
        // 대신 미리보기만 표시
        this.displayExistingImages(mediaData.images || []);
        this.mainImageIndex = mediaData.mainImageIndex || 0;
        
        // 기존 동영상 URL 설정
        if (mediaData.video?.url) {
            this.videoUrl = mediaData.video.url;
            document.getElementById('videoUrl')?.value = this.videoUrl;
            this.updateVideoPreview();
        }
    }
    
    // 기존 이미지 표시 (수정 모드)
    displayExistingImages(imageUrls) {
        const container = document.getElementById('imagePreviewContainer');
        if (!container || !imageUrls.length) return;
        
        container.innerHTML = '';
        
        imageUrls.forEach((url, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = `image-preview-item existing ${index === this.mainImageIndex ? 'main' : ''}`;
            
            imageDiv.innerHTML = `
                <img src="${url}" alt="Existing ${index + 1}">
                <div class="image-controls">
                    <button class="set-main-btn ${index === this.mainImageIndex ? 'active' : ''}" 
                            onclick="mediaManager.setMainImageExisting(${index})" 
                            title="${index === this.mainImageIndex ? '대표 이미지' : '대표로 설정'}">
                        ${index === this.mainImageIndex ? '★' : '☆'}
                    </button>
                    <span class="existing-label">기존</span>
                </div>
                <div class="image-index">${index + 1}</div>
            `;
            
            container.appendChild(imageDiv);
        });
    }
    
    // 기존 이미지의 대표 이미지 변경
    setMainImageExisting(index) {
        this.mainImageIndex = index;
        
        // 기존 이미지들의 UI 업데이트
        const items = document.querySelectorAll('.image-preview-item.existing');
        items.forEach((item, i) => {
            const btn = item.querySelector('.set-main-btn');
            if (i === index) {
                item.classList.add('main');
                btn.classList.add('active');
                btn.innerHTML = '★';
                btn.title = '대표 이미지';
            } else {
                item.classList.remove('main');
                btn.classList.remove('active');
                btn.innerHTML = '☆';
                btn.title = '대표로 설정';
            }
        });
        
        console.log(`기존 이미지 대표 설정: ${index}번째`);
    }

    // ========== 유틸리티 ==========
    
    // 토스트 메시지 표시
    showToast(message, type = 'info') {
        // 기존 HAIRGATOR 토스트 시스템 활용
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // 모든 데이터 초기화
    reset() {
        this.selectedImages = [];
        this.videoUrl = '';
        this.mainImageIndex = 0;
        
        this.updateImagePreview();
        this.updateVideoPreview();
        
        // 입력 필드들 초기화
        const fileInput = document.getElementById('styleImages');
        const videoInput = document.getElementById('videoUrl');
        
        if (fileInput) fileInput.value = '';
        if (videoInput) videoInput.value = '';
        
        console.log('MediaManager 초기화 완료');
    }
    
    // 현재 상태 정보
    getStatus() {
        return {
            imageCount: this.selectedImages.length,
            mainImageIndex: this.mainImageIndex,
            hasVideo: !!this.videoUrl,
            videoType: this.videoUrl ? this.validateVideoUrl(this.videoUrl)?.type : null
        };
    }
}

// ========== 드래그 앤 드롭 설정 ==========
function setupMediaDragDrop() {
    const uploadArea = document.getElementById('imageUploadArea');
    if (!uploadArea) return;
    
    // 드래그 이벤트 처리
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 드래그 진입/이탈 시각 효과
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        });
    });
    
    // 파일 드롭 처리
    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0 && window.mediaManager) {
            window.mediaManager.addImages(files);
        }
    });
}

// ========== 글로벌 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    // MediaManager 인스턴스 생성
    window.mediaManager = new MediaManager();
    
    // 드래그 앤 드롭 설정
    setupMediaDragDrop();
    
    console.log('✅ HAIRGATOR MediaManager 로드 완료');
});

// ========== 글로벌 함수 노출 ==========
window.MediaManager = MediaManager;
window.setupMediaDragDrop = setupMediaDragDrop;
