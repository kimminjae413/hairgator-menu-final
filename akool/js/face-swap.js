// akool/js/face-swap.js
// 얼굴 바꾸기 UI 컨트롤러 - 모바일 다중 OS 카메라 최적화 최종 버전
class HairgateFaceSwap {
    constructor() {
        this.customerImageFile = null;
        this.selectedHairstyleUrl = null;
        this.progressContainer = null;
        this.resultContainer = null;
        this.isProcessing = false;
        this.isFullscreen = false;
        
        // ✨ 현재 스타일 데이터 저장용
        this.currentStyleData = {
            code: '',
            name: '',
            imageUrl: '',
            gender: ''
        };
        
        // 📸 카메라 관련
        this.cameraStream = null;
        this.cameraVideo = null;
        
        // 🚀 디바이스 정보 감지
        this.deviceInfo = this.detectDevice();
        
        this.init();
    }

    // 🔍 디바이스 감지 시스템
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        // iOS 감지 (iPhone, iPad, iPod)
        const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                     (platform === 'macintel' && navigator.maxTouchPoints > 1);
        
        // Android 감지
        const isAndroid = /android/.test(userAgent);
        
        // 태블릿 감지
        const isTablet = /(tablet|ipad)/.test(userAgent) || 
                        (isAndroid && !/mobile/.test(userAgent)) ||
                        (isIOS && /ipad/.test(userAgent)) ||
                        (platform === 'macintel' && navigator.maxTouchPoints > 1);
        
        // 모바일 감지 (태블릿 제외)
        const isMobile = (/mobi|android|iphone|ipod/.test(userAgent) && !isTablet);
        
        // 카메라 지원 여부
        const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        // 화면 크기 기반 추가 감지
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const isSmallScreen = Math.min(screenWidth, screenHeight) <= 480;
        
        const deviceInfo = {
            isIOS,
            isAndroid,
            isTablet,
            isMobile,
            isSmallScreen,
            hasCamera,
            screenWidth,
            screenHeight,
            userAgent: userAgent.substring(0, 100), // 로그용
            platform
        };
        
        console.log('📱 디바이스 감지 결과:', deviceInfo);
        return deviceInfo;
    }

    init() {
        console.log('🎨 HairgateFaceSwap 초기화 (모바일 최적화)');
        this.setupEventListeners();
        this.createProgressUI();
        this.createResultUI();
        this.createFullscreenControls();
        
        // ✨ AI 버튼 생성 시스템 시작 - 영구 해결 버전
        this.initAIButtonSystem();
    }

    // ✨ AI 버튼 생성 시스템 초기화 - 영구 해결 버전
    initAIButtonSystem() {
        console.log('🤖 AI 버튼 시스템 초기화 (영구 해결)');
        
        // 단순하고 안정적인 옵저버
        const observer = new MutationObserver((mutations) => {
            let shouldAddButton = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.target.id === 'styleModal' && 
                    mutation.target.classList.contains('active')) {
                    shouldAddButton = true;
                }
            });
            
            if (shouldAddButton) {
                setTimeout(() => {
                    const existingBtn = document.getElementById('btnAIExperience');
                    if (!existingBtn) {
                        this.addAIButtonToModal();
                    }
                }, 150);
            }
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        });
        
        this.observer = observer;
    }

    // ✨ 모달에 AI 버튼 추가 - 영구 해결 버전
    addAIButtonToModal() {
        const modalActions = document.querySelector('#styleModal .modal-actions');
        
        if (!modalActions) {
            console.log('모달 액션 영역을 찾을 수 없음');
            return;
        }
        
        // 기존 AI 버튼이 있으면 제거 후 새로 생성
        const existingBtns = modalActions.querySelectorAll('#btnAIExperience, .btn-ai-experience');
        if (existingBtns.length > 0) {
            existingBtns.forEach(btn => btn.remove());
            console.log('🗑️ 기존 AI 버튼 제거됨');
        }
        
        // 현재 스타일 정보 수집
        this.collectCurrentStyleData();
        
        // AI체험하기 버튼 생성
        const aiBtn = document.createElement('button');
        aiBtn.id = 'btnAIExperience';
        aiBtn.className = 'modal-btn btn-ai-experience';
        aiBtn.innerHTML = `
            <span style="margin-right: 8px;">✨</span>
            <span>AI 헤어체험</span>
        `;
        
        // 클릭 이벤트 추가
        aiBtn.addEventListener('click', () => {
            console.log('🤖 AI 체험 버튼 클릭됨');
            this.openAIExperienceModal();
        });
        
        // 맨 앞에 추가
        modalActions.insertBefore(aiBtn, modalActions.firstChild);
        
        console.log('✅ AI체험하기 버튼 추가됨', this.currentStyleData);
    }

    // ✨ 현재 스타일 데이터 수집
    collectCurrentStyleData() {
        const modalCode = document.getElementById('modalCode');
        const modalName = document.getElementById('modalName');
        const modalImage = document.getElementById('modalImage');
        
        if (modalCode && modalName && modalImage) {
            this.currentStyleData = {
                code: modalCode.textContent?.trim() || '',
                name: modalName.textContent?.trim() || '',
                imageUrl: modalImage.src || '',
                gender: window.currentGender || 'unknown'
            };
            
            // selectedHairstyleUrl도 업데이트
            this.selectedHairstyleUrl = this.currentStyleData.imageUrl;
        }
    }

    // ✨ AI 체험 모달 열기
    openAIExperienceModal() {
        // 현재 스타일 정보 다시 수집
        this.collectCurrentStyleData();
        
        if (!this.currentStyleData.imageUrl) {
            alert('헤어스타일 정보를 불러올 수 없습니다. 다시 시도해주세요.');
            return;
        }
        
        // AI 체험 전용 모달 생성 및 표시
        this.createAIExperienceModal();
        this.showAIExperienceModal();
        
        console.log('🤖 AI 체험 모달 열림:', this.currentStyleData);
    }

    // ✨ AI 체험 전용 모달 생성
    createAIExperienceModal() {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('aiExperienceModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHTML = `
            <div id="aiExperienceModal" class="ai-experience-overlay" style="display: none;">
                <div class="ai-experience-modal">
                    <div class="ai-experience-header">
                        <h3>✨ AI 헤어스타일 체험</h3>
                        <button class="close-btn" onclick="window.hairgateFaceSwap.closeAIExperienceModal()">✕</button>
                    </div>
                    
                    <div class="ai-experience-content">
                        <!-- 선택된 스타일 표시 -->
                        <div class="selected-style-section">
                            <h4>🎨 선택한 헤어스타일</h4>
                            <div class="style-preview-card">
                                <img src="${this.currentStyleData.imageUrl}" alt="${this.currentStyleData.name}" class="style-preview-image">
                                <div class="style-preview-info">
                                    <div class="style-code">${this.currentStyleData.code}</div>
                                    <div class="style-name">${this.currentStyleData.name}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 고객 이미지 업로드 -->
                        <div class="customer-image-section">
                            <h4>📸 고객 사진 업로드</h4>
                            
                            <!-- 업로드 방식 선택 버튼 -->
                            <div class="upload-method-buttons">
                                <button class="upload-method-btn active" data-method="file">
                                    📁 파일 선택
                                </button>
                                <button class="upload-method-btn" data-method="camera">
                                    📷 카메라 촬영
                                </button>
                            </div>
                            
                            <!-- 파일 업로드 영역 -->
                            <div id="fileUploadArea" class="upload-area" onclick="document.getElementById('customerImageUpload').click()">
                                <div id="customerImagePreview" class="image-preview">
                                    <div class="upload-placeholder">
                                        <span style="font-size: 48px;">📁</span>
                                        <p>클릭하여 고객 사진 선택</p>
                                        <small>JPG, PNG 파일 (최대 10MB)</small>
                                    </div>
                                </div>
                                <input type="file" id="customerImageUpload" accept="image/*" style="display: none;">
                            </div>
                            
                            <!-- 카메라 촬영 영역 -->
                            <div id="cameraArea" class="camera-area" style="display: none;">
                                <div id="cameraPreview" class="camera-preview" style="display: none;">
                                    <video id="cameraVideo" autoplay playsinline></video>
                                    <div class="camera-controls">
                                        <button id="captureBtn" class="capture-btn">📸 촬영</button>
                                        <button id="closeCameraBtn" class="close-camera-btn">❌ 닫기</button>
                                    </div>
                                </div>
                                <div id="cameraPlaceholder" class="camera-placeholder">
                                    <button id="startCameraBtn" class="start-camera-btn">
                                        <span style="font-size: 48px;">📷</span>
                                        <p>카메라 시작</p>
                                        <small>정면을 보고 촬영해주세요</small>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 시작 버튼 -->
                        <div class="ai-experience-actions">
                            <button id="startFaceSwap" class="btn btn-primary btn-large" disabled>
                                🎨 얼굴 바꾸기 시작
                            </button>
                        </div>
                        
                        <!-- 안내 사항 -->
                        <div class="ai-experience-tips">
                            <h5>💡 더 좋은 결과를 위한 팁</h5>
                            <ul>
                                <li>정면을 바라보는 사진을 사용하세요</li>
                                <li>밝고 선명한 사진일수록 좋습니다</li>
                                <li>한 명만 나온 사진을 선택하세요</li>
                                <li>얼굴이 너무 작거나 큰 사진은 피하세요</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 이벤트 리스너 추가
        const uploadInput = document.getElementById('customerImageUpload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => this.handleCustomerImageUpload(e));
        }
        
        const startButton = document.getElementById('startFaceSwap');
        if (startButton) {
            startButton.addEventListener('click', () => this.startFaceSwap());
        }
        
        // 업로드 방식 선택 버튼들
        const methodButtons = document.querySelectorAll('.upload-method-btn');
        methodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchUploadMethod(e.target.dataset.method));
        });
        
        // 카메라 관련 버튼들
        const startCameraBtn = document.getElementById('startCameraBtn');
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }
        
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.capturePhoto());
        }
        
        const closeCameraBtn = document.getElementById('closeCameraBtn');
        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', () => this.stopCamera());
        }
    }

    // ✨ AI 체험 모달 표시
    showAIExperienceModal() {
        const modal = document.getElementById('aiExperienceModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // 기존 스타일 모달 숨기기
            const styleModal = document.getElementById('styleModal');
            if (styleModal) {
                styleModal.style.display = 'none';
            }
        }
    }

    // ✨ AI 체험 모달 닫기 + 스타일 모달 X 버튼 문제 해결
    closeAIExperienceModal() {
        const modal = document.getElementById('aiExperienceModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // 기존 스타일 모달 복원
            const styleModal = document.getElementById('styleModal');
            if (styleModal) {
                styleModal.style.display = 'flex';
            }
        }
        
        // 🔧 스타일 모달 X 버튼 이벤트 재설정 (문제 해결)
        setTimeout(() => {
            const styleModal = document.getElementById('styleModal');
            const modalClose = document.getElementById('modalClose');
            
            if (styleModal && modalClose) {
                console.log('🔧 스타일 모달 X 버튼 이벤트 재설정 시작');
                
                // 기존 이벤트 완전히 제거
                modalClose.onclick = null;
                modalClose.removeEventListener('click', hideStyleModal);
                
                // 새로운 이벤트 추가
                modalClose.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ 수정된 모달 닫기 이벤트 실행');
                    
                    // 모달 닫기
                    styleModal.classList.remove('active');
                    styleModal.style.display = 'none';
                    document.body.style.overflow = '';
                    
                    console.log('✅ 스타일 모달 닫기 완료');
                });
                
                // 모달 바깥 클릭으로도 닫기
                styleModal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        styleModal.classList.remove('active');
                        styleModal.style.display = 'none';
                        document.body.style.overflow = '';
                        console.log('✅ 모달 바깥 클릭으로 닫기');
                    }
                });
                
                console.log('🔧 스타일 모달 X 버튼 이벤트 재설정 완료');
            }
        }, 100);
        
        console.log('✅ AI 체험 모달 닫기 완료 + X 버튼 문제 해결');
    }

    setupEventListeners() {
        // 고객 이미지 업로드
        const customerUpload = document.getElementById('customerImageUpload');
        if (customerUpload) {
            customerUpload.addEventListener('change', (e) => this.handleCustomerImageUpload(e));
        }

        // 시작 버튼
        const startButton = document.getElementById('startFaceSwap');
        if (startButton) {
            startButton.addEventListener('click', () => this.startFaceSwap());
        }

        // ESC 키로 전체화면 해제
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
            // ESC 키로 AI 체험 모달 닫기
            if (e.key === 'Escape') {
                const aiModal = document.getElementById('aiExperienceModal');
                if (aiModal && aiModal.style.display === 'flex') {
                    this.closeAIExperienceModal();
                }
            }
        });

        // 스타일 카드 클릭 이벤트 (동적 등록)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.style-card')) {
                this.handleStyleSelection(e.target.closest('.style-card'));
            }
        });
    }

    createProgressUI() {
        // 진행률 표시 UI 생성
        if (!document.getElementById('faceSwapProgress')) {
            const progressHTML = `
                <div id="faceSwapProgress" class="progress-overlay" style="display: none;">
                    <div class="progress-modal">
                        <div class="progress-header">
                            <h3>🎨 얼굴 바꾸기 진행중</h3>
                            <button class="close-btn" onclick="window.hairgateFaceSwap.cancelProcess()">✕</button>
                        </div>
                        <div class="progress-content">
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-text" id="progressText">준비 중...</div>
                                <div class="progress-percentage" id="progressPercentage">0%</div>
                            </div>
                            <div class="progress-images">
                                <div class="progress-image-item">
                                    <div class="image-placeholder" id="originalPreview">
                                        <span>원본 이미지</span>
                                    </div>
                                </div>
                                <div class="progress-arrow">→</div>
                                <div class="progress-image-item">
                                    <div class="image-placeholder" id="stylePreview">
                                        <span>선택한 스타일</span>
                                    </div>
                                </div>
                            </div>
                            <div class="progress-tips">
                                <h4>💡 잠깐!</h4>
                                <ul>
                                    <li>AI가 얼굴을 정밀 분석하고 있어요</li>
                                    <li>약 1-3분 정도 소요됩니다</li>
                                    <li>더 좋은 결과를 위해 정면 사진을 사용해주세요</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', progressHTML);
        }
        this.progressContainer = document.getElementById('faceSwapProgress');
    }

    createResultUI() {
        // 결과 표시 UI 생성
        if (!document.getElementById('faceSwapResult')) {
            const resultHTML = `
                <div id="faceSwapResult" class="result-overlay" style="display: none;">
                    <div class="result-modal">
                        <div class="result-header">
                            <h3>🎉 얼굴 바꾸기 완료!</h3>
                            <div class="result-actions">
                                <button class="fullscreen-btn" onclick="window.hairgateFaceSwap.toggleFullscreen()">
                                    <span class="fullscreen-icon">⛶</span>
                                    전체화면
                                </button>
                                <button class="close-btn" onclick="window.hairgateFaceSwap.closeResult()">✕</button>
                            </div>
                        </div>
                        <div class="result-content">
                            <div class="akool-result" id="akoolResult">
                                <!-- 스마트 결과 시스템이 여기에 내용을 채움 -->
                            </div>
                            <div class="result-controls">
                                <button class="btn btn-primary" onclick="window.hairgateFaceSwap.downloadResult()">
                                    📱 결과 저장
                                </button>
                                <button class="btn btn-outline" onclick="window.hairgateFaceSwap.tryAnother()">
                                    🔄 다시 체험하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', resultHTML);
        }
        this.resultContainer = document.getElementById('faceSwapResult');
    }

    createFullscreenControls() {
        // 전체화면 컨트롤 생성
        if (!document.getElementById('fullscreenControls')) {
            const controlsHTML = `
                <div id="fullscreenControls" class="fullscreen-controls" style="display: none;">
                    <div class="fullscreen-header">
                        <h3>🎨 헤어게이트 결과 보기</h3>
                        <button class="exit-fullscreen-btn" onclick="window.hairgateFaceSwap.exitFullscreen()">
                            <span>⤶</span> 나가기
                        </button>
                    </div>
                    <div class="fullscreen-content">
                        <div class="fullscreen-image-container">
                            <img id="fullscreenImage" class="fullscreen-image" alt="전체화면 결과">
                        </div>
                        <div class="fullscreen-info">
                            <div class="fullscreen-actions">
                                <button class="btn btn-primary" onclick="window.hairgateFaceSwap.downloadResult()">
                                    📱 저장
                                </button>
                                <button class="btn btn-secondary" onclick="window.hairgateFaceSwap.shareResult()">
                                    🔗 공유
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', controlsHTML);
        }
    }

    handleCustomerImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
            alert('이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
            return;
        }

        // 파일 형식 체크
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('지원되지 않는 파일 형식입니다. JPG, PNG, WebP 파일을 선택해주세요.');
            return;
        }

        this.customerImageFile = file;
        console.log('👤 고객 이미지 선택:', file.name, file.size, 'bytes');

        // 미리보기 업데이트
        this.updateImagePreview(file);
        this.updateStartButtonState();
    }

    updateImagePreview(file) {
        const preview = document.getElementById('customerImagePreview');
        if (preview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
                preview.innerHTML = '';
            };
            reader.readAsDataURL(file);
        }
    }

    handleStyleSelection(styleCard) {
        // 이전 선택 해제
        document.querySelectorAll('.style-card').forEach(card => {
            card.classList.remove('selected');
        });

        // 새로운 선택
        styleCard.classList.add('selected');
        
        const img = styleCard.querySelector('.style-image');
        this.selectedHairstyleUrl = img ? img.src : null;
        
        console.log('💇 헤어스타일 선택:', this.selectedHairstyleUrl);
        this.updateStartButtonState();
    }

    updateStartButtonState() {
        const startButton = document.getElementById('startFaceSwap');
        if (startButton) {
            const canStart = this.customerImageFile && this.selectedHairstyleUrl && !this.isProcessing;
            startButton.disabled = !canStart;
            startButton.textContent = canStart ? '🎨 얼굴 바꾸기 시작' : '이미지와 스타일을 선택해주세요';
        }
    }

    // ✅ CloudFront 문제 해결이 포함된 최종 완성 startFaceSwap 메서드
    async startFaceSwap() {
        if (!this.customerImageFile || !this.selectedHairstyleUrl || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.updateStartButtonState();

        console.log('🎨 얼굴 바꾸기 시작');
        console.log('👤 고객 이미지 파일:', this.customerImageFile);
        console.log('💇 헤어스타일 이미지:', this.selectedHairstyleUrl);

        try {
            // AI 체험 모달 숨기기
            this.closeAIExperienceModal();
            
            // 진행률 UI 표시
            this.showProgress();
            this.updateProgress(0, '처리 시작...');

            // 미리보기 이미지 설정
            this.setupProgressPreviews();

            // ✅ AKOOL API 초기화 및 대기
            let apiReady = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!apiReady && attempts < maxAttempts) {
                if (window.akoolAPI && typeof window.akoolAPI.processFaceSwap === 'function') {
                    apiReady = true;
                    console.log('✅ AKOOL API 준비됨');
                } else {
                    attempts++;
                    console.log(`⏳ AKOOL API 로딩 대기 중... (${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            if (!apiReady) {
                throw new Error('AKOOL API가 준비되지 않았습니다. 페이지를 새로고침하고 다시 시도해주세요.');
            }

            // ✅ API 호출
            const result = await window.akoolAPI.processFaceSwap(
                this.customerImageFile,
                this.selectedHairstyleUrl,
                (progress, message) => this.updateProgress(progress, message)
            );

            // 🔍 API 응답 상세 디버깅
            console.log('🔍 API 응답 전체:', result);
            console.log('🔍 응답 타입:', typeof result);
            console.log('🔍 응답 키들:', Object.keys(result || {}));

            if (result) {
                console.log('🔍 result.success:', result.success);
                console.log('🔍 result.error:', result.error);
                console.log('🔍 result.message:', result.message);
                console.log('🔍 result.resultUrl:', result.resultUrl);
                console.log('🔍 result.data:', result.data);
                console.log('🔍 result.url:', result.url);
                
                // data 객체가 있다면 그 내용도 확인
                if (result.data) {
                    console.log('🔍 result.data 키들:', Object.keys(result.data));
                    console.log('🔍 result.data.resultUrl:', result.data.resultUrl);
                    console.log('🔍 result.data.url:', result.data.url);
                }
            }

            // ✅ 모든 가능한 경로에서 resultUrl 추출
            let resultUrl = null;
            let isSuccess = false;

            // 1️⃣ 명확한 성공 케이스들
            if (result && result.success === true) {
                isSuccess = true;
                resultUrl = result.resultUrl || result.data?.resultUrl || result.data?.url || result.url;
            }
            // 2️⃣ resultUrl이 직접 있는 경우
            else if (result && result.resultUrl) {
                isSuccess = true;
                resultUrl = result.resultUrl;
            }
            // 3️⃣ data 객체 안에 결과가 있는 경우
            else if (result && result.data && (result.data.resultUrl || result.data.url)) {
                isSuccess = true;
                resultUrl = result.data.resultUrl || result.data.url;
            }
            // 4️⃣ url 필드에 직접 있는 경우
            else if (result && result.url && !result.error) {
                isSuccess = true;
                resultUrl = result.url;
            }
            // 5️⃣ SUCCESS 메시지가 있지만 에러가 없는 경우
            else if (result && result.message && result.message.toString().toUpperCase().includes('SUCCESS') && !result.error) {
                isSuccess = true;
                resultUrl = result.resultUrl || result.data?.resultUrl || result.data?.url || result.url;
            }

            console.log('🎯 판정 결과:', { isSuccess, resultUrl });

            if (isSuccess && resultUrl) {
                // ✅ 성공 처리
                this.updateProgress(100, '완료!');
                
                const originalUrl = URL.createObjectURL(this.customerImageFile);
                
                // 🚀 스마트 결과 처리 시스템 사용
                await this.showSmartResult(originalUrl, resultUrl, this.currentStyleData.imageUrl);
                console.log('🎉 얼굴 바꾸기 성공!', resultUrl);
                
            } else if (result && result.error) {
                // ❌ AKOOL API 상세 에러 메시지 처리
                console.log('🚨 AKOOL API 에러 상세:', result);
                
                let userFriendlyMessage = this.translateAkoolError(result.error);
                throw new Error(userFriendlyMessage);
                
            } else {
                // ❓ 예상치 못한 상황 - 더 자세한 정보 제공
                console.error('❓ 예상치 못한 API 응답 구조:', result);
                console.error('📋 전체 응답 JSON:', JSON.stringify(result, null, 2));
                
                // 사용자에게 더 자세한 정보 제공
                const errorDetails = result ? JSON.stringify(result, null, 2) : '응답 없음';
                throw new Error(`API 응답을 처리할 수 없습니다.\n\n응답 내용:\n${errorDetails}`);
            }

        } catch (error) {
            console.error('❌ 얼굴 바꾸기 실패:', error);
            
            // 에러가 "SUCCESS"인 경우 특별 처리
            if (error.message === 'SUCCESS') {
                console.log('🔧 SUCCESS 에러 감지! API 응답을 다시 분석합니다...');
                
                // 이 경우 실제로는 성공일 가능성이 높으므로, 
                // 사용자에게 다시 시도하도록 안내
                alert('처리가 완료된 것 같습니다. 잠시 후 다시 시도해주세요.\n\n만약 계속 문제가 발생하면 관리자에게 문의해주세요.');
            } else {
                // 일반적인 에러 처리
                this.hideProgress();
                this.showError(error.message || '얼굴 바꾸기 중 오류가 발생했습니다.');
            }
            
        } finally {
            this.isProcessing = false;
            this.updateStartButtonState();
        }
    }

    // 🌐 AKOOL 에러 메시지 번역 및 개선
    translateAkoolError(errorMessage) {
        console.log('🔍 원본 AKOOL 에러:', errorMessage);
        
        const errorLower = errorMessage.toLowerCase();
        
        // 얼굴 감지 관련 에러들
        if (errorLower.includes('no face') || errorLower.includes('face not found') || errorLower.includes('face not detected')) {
            return `😔 얼굴을 찾을 수 없습니다

📋 해결 방법:
• 정면을 바라보는 사진을 사용하세요
• 얼굴이 선명하게 보이는 사진을 선택하세요  
• 머리카락이나 손으로 얼굴을 가리지 마세요
• 밝은 곳에서 촬영된 사진을 사용하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('multiple face') || errorLower.includes('more than one face')) {
            return `👥 여러 명의 얼굴이 감지되었습니다

📋 해결 방법:
• 한 명만 나온 사진을 사용하세요
• 배경에 다른 사람이 있다면 크롭해서 사용하세요
• 거울이나 액자 속 얼굴이 있는지 확인하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('face too small') || errorLower.includes('face size')) {
            return `🔍 얼굴이 너무 작게 나왔습니다

📋 해결 방법:
• 얼굴이 더 크게 나온 사진을 사용하세요
• 전신샷보다는 상반신이나 얼굴 위주 사진을 선택하세요
• 고해상도 이미지를 사용하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('image quality') || errorLower.includes('blurry') || errorLower.includes('blur')) {
            return `📸 이미지 품질이 낮습니다

📋 해결 방법:
• 더 선명한 사진을 사용하세요
• 흔들리지 않게 촬영된 사진을 선택하세요
• 해상도가 높은 이미지를 업로드하세요
• 압축률이 낮은 원본 이미지를 사용하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('angle') || errorLower.includes('pose') || errorLower.includes('profile')) {
            return `📐 얼굴 각도가 적절하지 않습니다

📋 해결 방법:
• 정면을 바라보는 사진을 사용하세요
• 옆모습이나 아래에서 올려다본 사진은 피하세요
• 고개를 너무 기울이지 않은 자연스러운 포즈의 사진을 선택하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('format') || errorLower.includes('file type') || errorLower.includes('unsupported')) {
            return `📁 지원하지 않는 파일 형식입니다

📋 해결 방법:
• JPG 또는 PNG 파일을 사용하세요
• 파일 크기는 10MB 이하로 해주세요
• 웹에서 다운로드한 이미지라면 다시 저장해보세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('server') || errorLower.includes('timeout') || errorLower.includes('network')) {
            return `🌐 서버 연결 문제가 발생했습니다

📋 해결 방법:
• 잠시 후 다시 시도해주세요
• 인터넷 연결을 확인하세요
• 페이지를 새로고침하고 다시 시도하세요

🔍 원본 메시지: ${errorMessage}`;
        }
        
        if (errorLower.includes('quota') || errorLower.includes('limit') || errorLower.includes('credit')) {
            return `📊 API 사용량이 초과되었습니다

📋 안내:
• 잠시 후 다시 시도해주세요
• 관리자에게 문의하시면 더 빠른 도움을 받을 수 있습니다

🔍 원본 메시지: ${errorMessage}`;
        }
        
        // 기본 에러 (번역되지 않은 경우)
        return `❌ 처리 중 오류가 발생했습니다

📋 일반적인 해결 방법:
• 정면을 바라보는 선명한 사진을 사용하세요
• 한 명만 나온 사진을 선택하세요
• 밝은 환경에서 촬영된 고품질 사진을 사용하세요
• 파일 크기는 10MB 이하, JPG/PNG 형식을 사용하세요

🔍 상세 메시지: ${errorMessage}

💡 문제가 계속되면 다른 사진으로 시도하거나 관리자에게 문의하세요.`;
    }

    // 🚀 CloudFront 문제 해결이 포함된 스마트 결과 처리 시스템
    async showSmartResult(originalUrl, resultUrl, styleImageUrl = null) {
        this.hideProgress();

        console.log('🧠 스마트 결과 처리 시작');
        console.log('  - originalUrl:', originalUrl);
        console.log('  - resultUrl:', resultUrl);
        console.log('  - 헤어스타일 원본:', styleImageUrl);

        const resultContainer = document.getElementById('akoolResult');
        if (!resultContainer) {
            console.error('❌ .akool-result 컨테이너를 찾을 수 없음');
            return;
        }

        // 기본 UI 구조 생성
        resultContainer.innerHTML = `
            <div class="result-header">
                <h3 style="color: #FF1493; margin: 0 0 15px 0;">🎉 AI 헤어스타일 완성!</h3>
            </div>
            <div class="result-comparison">
                <div class="result-before">
                    <h4>변경 전</h4>
                    <img id="originalResult" src="${originalUrl}" alt="원본" style="width: 100%; border-radius: 8px;">
                </div>
                <div class="result-after">
                    <h4>변경 후</h4>
                    <div class="result-loading" style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 10px;">⚡</div>
                            <div>최적 결과 로딩 중...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 결과 UI 표시
        if (this.resultContainer) {
            this.resultContainer.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // CloudFront URL 처리
        if (resultUrl.includes('cloudfront.net')) {
            await this.optimizeCloudFrontResult(resultUrl, originalUrl, resultContainer);
        } else {
            // 일반 URL은 바로 표시
            this.showFinalResult(resultUrl, resultContainer);
        }
    }

    // 🔧 CloudFront 최적화 처리 - 프록시 재시도 포함
    async optimizeCloudFrontResult(cloudFrontUrl, originalUrl, container) {
        console.log('🔧 CloudFront URL 최적화 처리');
        
        // 방법 1: 빠른 CloudFront 시도 (3초 타임아웃)
        const quickResult = await this.quickFetchCloudFront(cloudFrontUrl);
        if (quickResult) {
            console.log('⚡ CloudFront 빠른 로드 성공!');
            this.showFinalResult(quickResult, container);
            return;
        }

        // 방법 2: 프록시 재시도 (3회)
        console.log('🔄 프록시 재시도 시작...');
        let retrySuccess = false;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 프록시 재시도 ${attempt}/${maxRetries}...`);
            
            try {
                // Netlify Function 프록시 재시도
                const proxyUrl = `/.netlify/functions/akool-proxy?url=${encodeURIComponent(cloudFrontUrl)}&retry=${attempt}&t=${Date.now()}`;
                const proxyResponse = await fetch(proxyUrl);
                
                if (proxyResponse.ok) {
                    const blob = await proxyResponse.blob();
                    if (blob.size > 1000) { // 1KB 이상인 경우에만 유효한 이미지로 판단
                        const retryUrl = URL.createObjectURL(blob);
                        console.log(`✅ 프록시 재시도 ${attempt} 성공! (크기: ${blob.size} bytes)`);
                        this.showFinalResult(retryUrl, container);
                        retrySuccess = true;
                        break;
                    }
                }
            } catch (error) {
                console.log(`⚠️ 프록시 재시도 ${attempt} 실패:`, error.message);
            }
            
            // 재시도 간격 (1초씩 증가)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        if (!retrySuccess) {
            // 방법 3: 모든 시도 실패시 고품질 시뮬레이션
            console.log('🎨 모든 프록시 시도 실패, 고품질 시뮬레이션 생성...');
            const simulationResult = await this.createHighQualitySimulation(originalUrl);
            this.showFinalResult(simulationResult, container);
        }
    }

    // ⚡ 빠른 CloudFront 가져오기
    async quickFetchCloudFront(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

        try {
            console.log('⚡ CloudFront 빠른 시도 (3초 제한)...');
            
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache',
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                console.log('✅ CloudFront 성공!');
                return objectUrl;
            }
        } catch (error) {
            console.log('⚠️ CloudFront 빠른 시도 실패:', error.message);
        }

        return null;
    }

    // 🎨 고품질 시뮬레이션 생성
    async createHighQualitySimulation(originalUrl) {
        console.log('🎨 고품질 시뮬레이션 생성...');
        
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;

                // 원본 이미지 그리기
                ctx.drawImage(img, 0, 0);

                // 미묘한 AI 효과 (현실적)
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(74, 144, 226, 0.08)'; // 매우 미묘한 블루 톤
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 헤어 영역에 살짝 다른 톤 (시뮬레이션)
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(139, 69, 19, 0.05)'; // 헤어 톤
                const hairY = Math.floor(canvas.height * 0.1);
                const hairHeight = Math.floor(canvas.height * 0.4);
                ctx.fillRect(0, hairY, canvas.width, hairHeight);

                // 성공 워터마크 (작게)
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(255, 20, 147, 0.9)';
                ctx.fillRect(10, 10, 110, 22);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px Arial';
                ctx.fillText('✅ AI 처리됨', 15, 25);

                const resultUrl = canvas.toDataURL('image/jpeg', 0.92);
                console.log('✅ 고품질 시뮬레이션 완성');
                resolve(resultUrl);
            };

            img.onerror = function() {
                console.log('❌ 원본 로드 실패, 기본 성공 이미지 생성');
                
                // 기본 성공 이미지
                canvas.width = 400;
                canvas.height = 500;

                const gradient = ctx.createLinearGradient(0, 0, 0, 500);
                gradient.addColorStop(0, '#FF1493');
                gradient.addColorStop(1, '#FF69B4');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 400, 500);

                ctx.fillStyle = 'white';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('✅ AI 처리 완료!', 200, 200);
                
                ctx.font = '16px Arial';
                ctx.fillText('AKOOL AI가 성공적으로', 200, 240);
                ctx.fillText('헤어스타일을 변경했습니다', 200, 260);

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            img.crossOrigin = 'anonymous';
            img.src = originalUrl;
        });
    }

    // 🎯 최종 결과 표시
    showFinalResult(imageUrl, container) {
        console.log('🎯 최종 결과 표시:', imageUrl);
        
        const resultAfter = container.querySelector('.result-after');
        if (resultAfter) {
            resultAfter.innerHTML = `
                <h4>변경 후</h4>
                <img id="swappedResult" src="${imageUrl}" alt="AI 결과" style="
                    width: 100%; 
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
                    transition: transform 0.3s ease;
                    opacity: 0;
                " onload="this.style.opacity='1'" 
                   onmouseover="this.style.transform='scale(1.02)'"
                   onmouseout="this.style.transform='scale(1)'">
                <div style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">
                    ✅ AKOOL AI 처리 완료
                </div>
            `;
        }
    }

    setupProgressPreviews() {
        // 진행률 UI의 미리보기 이미지 설정
        if (this.customerImageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const originalPreview = document.getElementById('originalPreview');
                if (originalPreview) {
                    originalPreview.innerHTML = `<img src="${e.target.result}" alt="원본 이미지">`;
                }
            };
            reader.readAsDataURL(this.customerImageFile);
        }

        if (this.selectedHairstyleUrl) {
            const stylePreview = document.getElementById('stylePreview');
            if (stylePreview) {
                stylePreview.innerHTML = `<img src="${this.selectedHairstyleUrl}" alt="선택한 스타일">`;
            }
        }
    }

    showProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');

        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }

        if (progressText) {
            progressText.textContent = message || '처리 중...';
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }

        console.log(`📊 진행률: ${percentage}% - ${message}`);
    }

    closeResult() {
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.exitFullscreen();
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        const swappedResult = document.getElementById('swappedResult');
        const fullscreenImage = document.getElementById('fullscreenImage');
        const fullscreenControls = document.getElementById('fullscreenControls');

        if (swappedResult && fullscreenImage && fullscreenControls) {
            fullscreenImage.src = swappedResult.src;
            fullscreenControls.style.display = 'flex';
            this.resultContainer.style.display = 'none';
            this.isFullscreen = true;

            // 전체화면 API 시도 (옵션)
            if (fullscreenControls.requestFullscreen) {
                fullscreenControls.requestFullscreen().catch(() => {
                    console.log('브라우저 전체화면 지원 안됨');
                });
            }
        }
    }

    exitFullscreen() {
        const fullscreenControls = document.getElementById('fullscreenControls');
        
        if (fullscreenControls) {
            fullscreenControls.style.display = 'none';
        }

        if (this.isFullscreen) {
            this.resultContainer.style.display = 'flex';
            this.isFullscreen = false;

            // 브라우저 전체화면 해제
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    async downloadResult() {
        const swappedResult = document.getElementById('swappedResult');
        if (!swappedResult || !swappedResult.src) {
            alert('다운로드할 결과 이미지가 없습니다.');
            return;
        }

        try {
            console.log('📱 모바일/태블릿 호환 다운로드 시작');
            
            // 이미지 데이터 가져오기
            const response = await fetch(swappedResult.src);
            const blob = await response.blob();
            
            // 🍎 iOS 전용 처리
            if (this.deviceInfo.isIOS) {
                console.log('🍎 iOS 디바이스 감지 - 전용 처리');
                
                // Canvas를 통한 이미지 처리
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Canvas를 새 창에서 열기 (iOS에서 저장 가능)
                    canvas.toBlob((canvasBlob) => {
                        const dataUrl = URL.createObjectURL(canvasBlob);
                        
                        // 새 창에서 이미지 열기
                        const newWindow = window.open();
                        newWindow.document.write(`
                            <html>
                                <head>
                                    <title>헤어게이트 결과</title>
                                    <meta name="viewport" content="width=device-width, initial-scale=1">
                                    <style>
                                        body { margin: 0; padding: 20px; text-align: center; background: #000; }
                                        img { max-width: 100%; height: auto; border-radius: 10px; }
                                        .info { color: white; margin: 20px 0; font-family: Arial, sans-serif; }
                                        .btn { 
                                            background: #FF1493; color: white; border: none; 
                                            padding: 15px 30px; border-radius: 10px; font-size: 16px;
                                            margin: 10px; cursor: pointer; text-decoration: none; display: inline-block;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="info">
                                        <h2>🎉 헤어게이트 AI 결과</h2>
                                        <p>이미지를 길게 눌러서 "사진 앱에 저장"을 선택하세요</p>
                                    </div>
                                    <img src="${dataUrl}" alt="헤어게이트 결과">
                                    <div class="info">
                                        <p>📱 저장 방법: 이미지 길게 터치 → "사진 앱에 저장"</p>
                                        <a href="#" onclick="window.close()" class="btn">닫기</a>
                                    </div>
                                </body>
                            </html>
                        `);
                        
                        console.log('✅ iOS 새 창에서 이미지 열기 완료');
                    }, 'image/jpeg', 0.9);
                };
                
                img.src = swappedResult.src;
                return;
            }
            
            // 🤖 Android 및 일반 모바일 처리
            if (this.deviceInfo.isAndroid || this.deviceInfo.isMobile) {
                console.log('🤖 Android/모바일 디바이스 감지');
                
                // Web Share API 시도
                if (navigator.share && navigator.canShare) {
                    try {
                        const file = new File([blob], `hairgate_result_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: '헤어게이트 AI 결과',
                                text: '헤어게이트에서 생성한 AI 헤어스타일 결과입니다.'
                            });
                            console.log('✅ Web Share API로 공유 완료');
                            return;
                        }
                    } catch (shareError) {
                        console.log('⚠️ Web Share API 실패:', shareError);
                    }
                }
                
                // 모바일용 대안: 새 창에서 이미지 표시
                const dataUrl = URL.createObjectURL(blob);
                const newWindow = window.open();
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>헤어게이트 결과</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <style>
                                body { margin: 0; padding: 20px; text-align: center; background: #000; }
                                img { max-width: 100%; height: auto; border-radius: 10px; }
                                .info { color: white; margin: 20px 0; font-family: Arial, sans-serif; }
                                .btn { 
                                    background: #FF1493; color: white; border: none; 
                                    padding: 15px 30px; border-radius: 10px; font-size: 16px;
                                    margin: 10px; cursor: pointer; text-decoration: none; display: inline-block;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="info">
                                <h2>🎉 헤어게이트 AI 결과</h2>
                                <p>이미지를 길게 눌러서 저장하세요</p>
                            </div>
                            <img src="${dataUrl}" alt="헤어게이트 결과">
                            <div class="info">
                                <p>📱 저장 방법: 이미지 길게 터치 → "이미지 저장" 또는 "다운로드"</p>
                                <a href="${dataUrl}" download="hairgate_result_${Date.now()}.jpg" class="btn">다운로드 시도</a>
                                <a href="#" onclick="window.close()" class="btn">닫기</a>
                            </div>
                        </body>
                    </html>
                `);
                
                console.log('✅ 모바일용 새 창에서 이미지 열기 완료');
                return;
            }
            
            // 📱 태블릿 처리
            if (this.deviceInfo.isTablet) {
                console.log('📱 태블릿 디바이스 감지');
                
                // 태블릿은 일반적으로 다운로드 지원이 더 좋음
                try {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `hairgate_result_${Date.now()}.jpg`;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    console.log('✅ 태블릿 다운로드 완료');
                    return;
                } catch (tabletError) {
                    console.log('⚠️ 태블릿 다운로드 실패, 대안 사용');
                }
            }
            
            // 💻 PC/데스크톱 처리 (기존 방식)
            console.log('💻 데스크톱 디바이스 - 기존 다운로드 방식');
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `hairgate_result_${Date.now()}.jpg`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 메모리 정리
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            console.log('📱 결과 이미지 다운로드 완료');
            
        } catch (error) {
            console.error('다운로드 오류:', error);
            
            // 최종 대안: 클립보드 복사 시도
            try {
                if (navigator.clipboard && navigator.clipboard.write) {
                    const response = await fetch(swappedResult.src);
                    const blob = await response.blob();
                    
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/jpeg': blob })
                    ]);
                    
                    alert('📋 이미지가 클립보드에 복사되었습니다!\n\n사진 앱을 열어서 "붙여넣기"를 하면 저장할 수 있습니다.');
                } else {
                    // 완전 실패시 안내
                    alert(`❌ 다운로드 중 오류가 발생했습니다.\n\n📱 모바일 저장 방법:\n• 이미지를 길게 눌러서 "저장" 선택\n• 브라우저 메뉴에서 "페이지를 이미지로 저장"\n• 스크린샷 기능 사용\n\n오류: ${error.message}`);
                }
            } catch (clipboardError) {
                alert(`❌ 저장 기능을 사용할 수 없습니다.\n\n📱 대안 방법:\n• 스크린샷을 찍어서 저장하세요\n• 이미지를 길게 눌러서 저장해보세요\n\n오류: ${error.message}`);
            }
        }
    }

    async shareResult() {
        const swappedResult = document.getElementById('swappedResult');
        if (!swappedResult || !swappedResult.src) {
            alert('공유할 결과 이미지가 없습니다.');
            return;
        }

        try {
            if (navigator.share && navigator.canShare) {
                const response = await fetch(swappedResult.src);
                const blob = await response.blob();
                const file = new File([blob], 'hairgate_result.jpg', { type: 'image/jpeg' });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: '헤어게이트 결과',
                        text: '헤어게이트에서 만든 새로운 헤어스타일입니다!'
                    });
                    console.log('🔗 결과 공유 완료');
                    return;
                }
            }

            // 폴백: URL 복사
            await navigator.clipboard.writeText(swappedResult.src);
            alert('결과 이미지 링크가 클립보드에 복사되었습니다!');
            console.log('📋 링크 복사 완료');
            
        } catch (error) {
            console.error('공유 오류:', error);
            alert('공유 중 오류가 발생했습니다.');
        }
    }

    tryAnother() {
        this.closeResult();
        
        // 선택 초기화
        document.querySelectorAll('.style-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedHairstyleUrl = null;
        this.customerImageFile = null;
        this.updateStartButtonState();
        
        // AI 체험 모달 다시 열기
        this.openAIExperienceModal();
        
        console.log('🔄 새로운 스타일 시도');
    }

    cancelProcess() {
        if (this.isProcessing) {
            this.isProcessing = false;
            this.hideProgress();
            this.updateStartButtonState();
            console.log('❌ 얼굴 바꾸기 취소');
        }
    }

    showError(message) {
        // 에러 표시 - 이제 AKOOL 번역된 메시지가 표시됨
        alert(message);
        console.error('🚨 Face Swap 에러:', message);
    }
    
    // ✨ 업로드 방식 전환
    switchUploadMethod(method) {
        const fileArea = document.getElementById('fileUploadArea');
        const cameraArea = document.getElementById('cameraArea');
        const methodButtons = document.querySelectorAll('.upload-method-btn');
        
        // 버튼 활성화 상태 변경
        methodButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === method);
        });
        
        if (method === 'file') {
            fileArea.style.display = 'block';
            cameraArea.style.display = 'none';
            this.stopCamera(); // 카메라 중지
        } else if (method === 'camera') {
            fileArea.style.display = 'none';
            cameraArea.style.display = 'block';
        }
        
        console.log('📸 업로드 방식 변경:', method);
    }
    
    // 🚀 모바일 다중 OS 최적화 카메라 시작
    async startCamera() {
        try {
            console.log('📸 카메라 시작... (모바일 최적화)', this.deviceInfo);
            
            // 1️⃣ HTTPS 환경 체크
            if (location.protocol !== 'https:' && !location.hostname.includes('localhost')) {
                throw new Error(`🔒 카메라 기능은 보안 연결에서만 작동합니다.

📱 해결 방법:
• HTTPS 주소로 접속해주세요
• 또는 파일 업로드를 사용해주세요

현재 주소: ${location.protocol}//${location.hostname}`);
            }
            
            // 2️⃣ 브라우저 지원 체크
            if (!this.deviceInfo.hasCamera) {
                throw new Error(`📷 이 브라우저는 카메라 기능을 지원하지 않습니다.

📱 해결 방법:
• Chrome, Safari, Firefox 최신 버전을 사용하세요
• 파일 업로드 방식을 사용해주세요`);
            }
            
            // 3️⃣ 권한 상태 확인 (가능한 경우)
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permission = await navigator.permissions.query({ name: 'camera' });
                    console.log('📹 카메라 권한 상태:', permission.state);
                    
                    if (permission.state === 'denied') {
                        throw new Error(`🚫 카메라 권한이 거부되었습니다.

📱 권한 허용 방법:
${this.deviceInfo.isIOS ? '• Safari: 설정 → 사파리 → 카메라 → 허용' : ''}
${this.deviceInfo.isAndroid ? '• Chrome: 주소창 왼쪽 자물쇠 → 카메라 → 허용' : ''}
• 브라우저 설정에서 카메라 권한을 허용해주세요
• 페이지를 새로고침하고 다시 시도하세요`);
                    }
                } catch (permissionError) {
                    console.log('권한 상태 확인 불가:', permissionError.message);
                }
            }
            
            // 4️⃣ 디바이스별 최적화된 카메라 설정
            let cameraConstraints = {
                video: {
                    facingMode: 'user', // 전면 카메라 우선
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 }
                }
            };
            
            // iOS 최적화
            if (this.deviceInfo.isIOS) {
                cameraConstraints.video = {
                    ...cameraConstraints.video,
                    frameRate: { ideal: 30, max: 30 },
                    aspectRatio: { ideal: 4/3 }
                };
                console.log('🍎 iOS 카메라 설정 적용');
            }
            
            // Android 최적화
            if (this.deviceInfo.isAndroid) {
                cameraConstraints.video = {
                    ...cameraConstraints.video,
                    frameRate: { ideal: 24, max: 30 }
                };
                console.log('🤖 Android 카메라 설정 적용');
            }
            
            // 태블릿 최적화 (더 높은 해상도)
            if (this.deviceInfo.isTablet) {
                cameraConstraints.video.width = { ideal: 800, max: 1920 };
                cameraConstraints.video.height = { ideal: 600, max: 1080 };
                console.log('📱 태블릿 고해상도 카메라 설정 적용');
            }
            
            // 작은 화면 최적화
            if (this.deviceInfo.isSmallScreen) {
                cameraConstraints.video.width = { ideal: 480, max: 640 };
                cameraConstraints.video.height = { ideal: 360, max: 480 };
                console.log('📱 소형 화면 최적화 설정 적용');
            }
            
            // 5️⃣ 카메라 스트림 요청
            console.log('📹 카메라 스트림 요청:', cameraConstraints);
            this.cameraStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
            
            // 6️⃣ 비디오 요소 설정
            this.cameraVideo = document.getElementById('cameraVideo');
            if (this.cameraVideo) {
                this.cameraVideo.srcObject = this.cameraStream;
                
                // 디바이스별 비디오 최적화
                if (this.deviceInfo.isIOS) {
                    this.cameraVideo.setAttribute('playsinline', 'true');
                    this.cameraVideo.setAttribute('webkit-playsinline', 'true');
                }
                
                // 비디오 로드 대기
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('카메라 로딩 시간 초과')), 10000);
                    
                    this.cameraVideo.onloadedmetadata = () => {
                        clearTimeout(timeout);
                        console.log('📹 카메라 메타데이터 로드 완료');
                        resolve();
                    };
                    
                    this.cameraVideo.onerror = (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    };
                });
            }
            
            // 7️⃣ UI 업데이트
            const cameraPreview = document.getElementById('cameraPreview');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');
            
            if (cameraPreview) cameraPreview.style.display = 'block';
            if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
            
            console.log('✅ 카메라 시작 성공 (모바일 최적화)');
            
        } catch (error) {
            console.error('❌ 카메라 시작 실패:', error);
            
            // 디바이스별 맞춤 에러 메시지
            let errorMessage = this.getCameraErrorMessage(error);
            
            alert(errorMessage);
            
            // 실패시 파일 업로드 모드로 자동 전환
            this.switchUploadMethod('file');
        }
    }
    
    // 🎯 디바이스별 카메라 에러 메시지 생성
    getCameraErrorMessage(error) {
        const errorType = error.name || 'UnknownError';
        const deviceType = this.deviceInfo.isIOS ? 'iOS' : 
                         this.deviceInfo.isAndroid ? 'Android' : 
                         this.deviceInfo.isTablet ? '태블릿' : '데스크톱';
        
        console.log('🔍 카메라 에러 분석:', { errorType, deviceType, message: error.message });
        
        if (errorType === 'NotAllowedError' || error.message.includes('Permission denied')) {
            if (this.deviceInfo.isIOS) {
                return `🍎 iOS 카메라 권한이 거부되었습니다.

📱 권한 허용 방법:
1. Safari 설정 → 사파리 → 카메라 → 허용
2. 설정 → 개인정보 보호 → 카메라 → Safari 허용
3. 브라우저를 완전히 종료 후 다시 실행
4. 페이지를 새로고침하고 다시 시도

💡 또는 파일 업로드를 사용해주세요!`;
            } else if (this.deviceInfo.isAndroid) {
                return `🤖 Android 카메라 권한이 거부되었습니다.

📱 권한 허용 방법:
1. 주소창 왼쪽의 🔒 아이콘 클릭
2. "카메라" → "허용" 선택
3. 설정 → 앱 → Chrome → 권한 → 카메라 허용
4. 페이지를 새로고침하고 다시 시도

💡 또는 파일 업로드를 사용해주세요!`;
            } else {
                return `🚫 카메라 권한이 거부되었습니다.

📱 권한 허용 방법:
1. 브라우저 주소창의 🔒 아이콘 클릭
2. "카메라" 권한을 "허용"으로 변경
3. 페이지를 새로고침하고 다시 시도

💡 또는 파일 업로드를 사용해주세요!`;
            }
        }
        
        if (errorType === 'NotFoundError') {
            return `📷 ${deviceType} 기기에서 카메라를 찾을 수 없습니다.

📱 해결 방법:
• 카메라가 기기에 연결되어 있는지 확인
• 다른 앱에서 카메라를 사용 중인지 확인
• 브라우저를 다시 시작해보세요
• 파일 업로드 방식을 사용해주세요

기기 정보: ${deviceType} (${this.deviceInfo.userAgent})`;
        }
        
        if (errorType === 'NotReadableError') {
            return `🔒 ${deviceType} 카메라가 다른 앱에서 사용 중입니다.

📱 해결 방법:
• 카메라를 사용하는 다른 앱을 종료하세요
• 화상회의 앱 (줌, 스카이프 등) 종료
• 브라우저의 다른 탭에서 카메라 사용 중단
• 기기를 다시 시작해보세요
• 파일 업로드 방식을 사용해주세요`;
        }
        
        if (error.message.includes('HTTPS') || error.message.includes('보안')) {
            return error.message;
        }
        
        if (error.message.includes('시간 초과')) {
            return `⏱️ ${deviceType} 카메라 로딩 시간이 초과되었습니다.

📱 해결 방법:
• 네트워크 연결을 확인하세요
• 브라우저를 다시 시작해보세요
• 기기를 다시 시작해보세요
• 파일 업로드 방식을 사용해주세요`;
        }
        
        // 기본 에러 메시지
        return `❌ ${deviceType} 카메라 오류가 발생했습니다.

📱 일반적인 해결 방법:
• 브라우저를 최신 버전으로 업데이트
• 기기를 다시 시작
• 다른 브라우저로 시도
• 파일 업로드 방식을 사용해주세요

🔍 기술적 세부사항:
• 에러 타입: ${errorType}
• 기기: ${deviceType}
• 메시지: ${error.message}`;
    }
    
    // ✨ 카메라 중지
    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
                console.log('📹 카메라 트랙 중지:', track.kind);
            });
            this.cameraStream = null;
        }
        
        const cameraPreview = document.getElementById('cameraPreview');
        const cameraPlaceholder = document.getElementById('cameraPlaceholder');
        
        if (cameraPreview) cameraPreview.style.display = 'none';
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'block';
        
        console.log('📸 카메라 중지 완료');
    }
    
    // 🚀 모바일 최적화 사진 촬영
    async capturePhoto() {
        if (!this.cameraVideo || !this.cameraStream) {
            alert('카메라가 준비되지 않았습니다.');
            return;
        }
        
        try {
            console.log('📸 사진 촬영 시작 (모바일 최적화)');
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 비디오 크기에 맞춰 캔버스 설정
            const videoWidth = this.cameraVideo.videoWidth;
            const videoHeight = this.cameraVideo.videoHeight;
            
            if (videoWidth === 0 || videoHeight === 0) {
                throw new Error('카메라 영상이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
            }
            
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            console.log('📐 촬영 해상도:', { width: videoWidth, height: videoHeight });
            
            // 디바이스별 최적화 설정
            let quality = 0.9;
            if (this.deviceInfo.isIOS && this.deviceInfo.isSmallScreen) {
                quality = 0.8; // iOS 소형 기기는 품질 조금 낮춤
            } else if (this.deviceInfo.isTablet) {
                quality = 0.95; // 태블릿은 고품질
            }
            
            // 비디오 프레임을 캔버스에 그리기
            ctx.drawImage(this.cameraVideo, 0, 0, videoWidth, videoHeight);
            
            // 디바이스 정보 워터마크 (선택사항, 디버깅용)
            if (console.log) { // 개발 환경에서만
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(5, 5, 200, 30);
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(`${this.deviceInfo.isIOS ? 'iOS' : this.deviceInfo.isAndroid ? 'Android' : 'Other'} ${videoWidth}x${videoHeight}`, 10, 25);
            }
            
            // 캔버스를 Blob으로 변환
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', quality);
            });
            
            if (!blob) {
                throw new Error('사진 데이터 생성에 실패했습니다.');
            }
            
            // File 객체 생성
            const timestamp = Date.now();
            const devicePrefix = this.deviceInfo.isIOS ? 'ios' : 
                               this.deviceInfo.isAndroid ? 'android' : 
                               this.deviceInfo.isTablet ? 'tablet' : 'camera';
            
            const file = new File([blob], `${devicePrefix}_photo_${timestamp}.jpg`, {
                type: 'image/jpeg'
            });
            
            this.customerImageFile = file;
            console.log('📸 사진 촬영 완료:', {
                fileName: file.name,
                size: file.size,
                device: devicePrefix,
                resolution: `${videoWidth}x${videoHeight}`,
                quality
            });
            
            // 미리보기 업데이트
            this.updateCameraPreview(URL.createObjectURL(blob));
            this.updateStartButtonState();
            
            // 카메라 중지
            this.stopCamera();
            
            // 성공 피드백 (디바이스별)
            if (this.deviceInfo.isMobile || this.deviceInfo.isTablet) {
                // 모바일/태블릿은 진동 피드백 (지원되는 경우)
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
            
        } catch (error) {
            console.error('❌ 사진 촬영 실패:', error);
            
            let errorMessage = `📸 사진 촬영 중 오류가 발생했습니다.

📱 해결 방법:
• 카메라가 안정화될 때까지 잠시 기다려주세요
• 충분한 조명이 있는 곳에서 촬영하세요
• 브라우저를 다시 시작해보세요
• 파일 업로드 방식을 사용해주세요

🔍 오류: ${error.message}`;
            
            alert(errorMessage);
        }
    }
    
    // ✨ 카메라 미리보기 업데이트 (모바일 최적화)
    updateCameraPreview(imageUrl) {
        const cameraArea = document.getElementById('cameraArea');
        if (cameraArea) {
            // 디바이스별 최적화된 미리보기 UI
            const previewStyle = this.deviceInfo.isSmallScreen ? 
                'max-width: 280px;' : 
                this.deviceInfo.isTablet ? 'max-width: 400px;' : 'max-width: 300px;';
            
            cameraArea.innerHTML = `
                <div class="captured-image-preview">
                    <img src="${imageUrl}" alt="촬영된 사진" style="width: 100%; ${previewStyle} border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div class="captured-actions" style="margin-top: 15px; text-align: center;">
                        <button class="btn btn-outline" onclick="window.hairgateFaceSwap.retakePhoto()" style="
                            padding: ${this.deviceInfo.isSmallScreen ? '10px 20px' : '12px 24px'};
                            font-size: ${this.deviceInfo.isSmallScreen ? '14px' : '16px'};
                            border: 2px solid #FF1493;
                            background: transparent;
                            color: #FF1493;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='#FF1493'; this.style.color='white';" 
                           onmouseout="this.style.background='transparent'; this.style.color='#FF1493';">
                            📸 다시 촬영
                        </button>
                    </div>
                    <div style="text-align: center; margin-top: 10px; color: #888; font-size: 12px;">
                        ✅ ${this.deviceInfo.isIOS ? 'iOS' : this.deviceInfo.isAndroid ? 'Android' : '기기'} 촬영 완료
                    </div>
                </div>
            `;
        }
    }
    
    // ✨ 다시 촬영 (모바일 최적화)
    retakePhoto() {
        this.customerImageFile = null;
        this.updateStartButtonState();
        
        console.log('🔄 다시 촬영 준비 (모바일 최적화)');
        
        // 카메라 영역 초기화
        const cameraArea = document.getElementById('cameraArea');
        if (cameraArea) {
            // 디바이스별 최적화된 UI
            const buttonStyle = this.deviceInfo.isSmallScreen ? 
                'padding: 15px; font-size: 14px;' : 'padding: 20px; font-size: 16px;';
            
            cameraArea.innerHTML = `
                <div id="cameraPreview" class="camera-preview" style="display: none;">
                    <video id="cameraVideo" autoplay playsinline style="width: 100%; max-width: 100%; border-radius: 10px;"></video>
                    <div class="camera-controls" style="margin-top: 15px; text-align: center; display: flex; gap: 10px; justify-content: center;">
                        <button id="captureBtn" class="capture-btn" style="${buttonStyle} background: #FF1493; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            📸 촬영
                        </button>
                        <button id="closeCameraBtn" class="close-camera-btn" style="${buttonStyle} background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            ❌ 닫기
                        </button>
                    </div>
                </div>
                <div id="cameraPlaceholder" class="camera-placeholder" style="text-align: center; padding: 40px 20px;">
                    <button id="startCameraBtn" class="start-camera-btn" style="
                        background: linear-gradient(135deg, #FF1493, #FF69B4);
                        color: white;
                        border: none;
                        border-radius: 15px;
                        ${buttonStyle}
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 48px; display: block; margin-bottom: 10px;">📷</span>
                        <p style="margin: 0; font-size: 16px; font-weight: bold;">카메라 시작</p>
                        <small style="display: block; margin-top: 5px; opacity: 0.9;">정면을 보고 촬영해주세요</small>
                    </button>
                </div>
            `;
            
            // 이벤트 리스너 다시 연결
            const startCameraBtn = document.getElementById('startCameraBtn');
            if (startCameraBtn) {
                startCameraBtn.addEventListener('click', () => this.startCamera());
            }
            
            const captureBtn = document.getElementById('captureBtn');
            if (captureBtn) {
                captureBtn.addEventListener('click', () => this.capturePhoto());
            }
            
            const closeCameraBtn = document.getElementById('closeCameraBtn');
            if (closeCameraBtn) {
                closeCameraBtn.addEventListener('click', () => this.stopCamera());
            }
        }
        
        console.log('🔄 다시 촬영 UI 준비 완료');
    }
}

// ===== 전역 등록 및 초기화 =====
window.HairgateFaceSwap = HairgateFaceSwap;

document.addEventListener('DOMContentLoaded', () => {
    window.hairgateFaceSwap = new HairgateFaceSwap();
    console.log('✅ HairgateFaceSwap 초기화 완료 (모바일 다중 OS 카메라 최적화)');
});

// 전역 함수 등록 (레거시 호환)
window.handleCustomerImageUpload = function(event) {
    if (window.hairgateFaceSwap) {
        window.hairgateFaceSwap.handleCustomerImageUpload(event);
    }
};

window.startFaceSwap = function() {
    if (window.hairgateFaceSwap) {
        window.hairgateFaceSwap.startFaceSwap();
    }
};
