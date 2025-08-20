// ========== HAIRGATOR 얼굴 바꾸기 메인 로직 (카메라 기능 포함) - 최종 수정 ==========

class HairgateFaceSwap {
    constructor() {
        this.currentStyleData = null;
        this.currentStyleImageUrl = null;
        this.customerImageFile = null;
        this.resultImageUrl = null;
        
        this.isProcessing = false;
        
        // UI 요소들
        this.modal = null;
        this.fileInput = null;
        this.previewImg = null;
        this.resultContainer = null;
        
        // 📸 카메라 관련
        this.camera = null;
        
        this.init();
    }

    // ========== 초기화 ==========
    init() {
        this.createAIButton();
        this.createFaceSwapModal();
        this.setupEventListeners();
        this.initCamera(); // 📸 카메라 초기화 추가
        
        console.log('🎨 HAIRGATOR Face Swap 시스템 초기화 완료');
    }

    // ========== 1. AI 헤어체험 버튼 추가 ==========
    createAIButton() {
        // 기존 모달 액션 영역에 버튼 추가
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const modalActions = document.querySelector('.modal-actions');
                    
                    if (modalActions && !document.getElementById('btnAIExperience')) {
                        const aiBtn = document.createElement('button');
                        aiBtn.id = 'btnAIExperience';
                        aiBtn.className = 'modal-btn btn-ai-experience';
                        aiBtn.innerHTML = `
                            <span style="margin-right: 8px;">✨</span>
                            <span>AI 헤어체험</span>
                        `;
                        
                        // 고객등록 버튼 옆에 추가
                        modalActions.insertBefore(aiBtn, modalActions.firstChild);
                        
                        // 이벤트 리스너 추가
                        aiBtn.addEventListener('click', () => {
                            this.openFaceSwapModal();
                        });

                        console.log('✅ AI 헤어체험 버튼 추가됨');
                    }
                }
            });
        });

        // DOM 변화 감지 시작
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ========== 2. 얼굴 바꾸기 모달 생성 ==========
    createFaceSwapModal() {
        const modalHTML = `
            <div id="faceSwapModal" class="akool-modal">
                <div class="akool-modal-content">
                    <div class="akool-modal-header">
                        <h3 class="akool-modal-title">✨ AI 헤어스타일 체험</h3>
                        <button class="akool-modal-close" id="faceSwapClose">×</button>
                    </div>
                    
                    <div class="akool-modal-body">
                        <!-- 선택된 헤어스타일 표시 -->
                        <div class="selected-style">
                            <h4>🎨 선택한 헤어스타일</h4>
                            <div class="style-preview">
                                <img id="selectedStyleImg" src="" alt="헤어스타일">
                                <div class="style-info">
                                    <div class="style-code" id="selectedStyleCode">CODE</div>
                                    <div class="style-name" id="selectedStyleName">스타일명</div>
                                </div>
                            </div>
                        </div>

                        <!-- 📸 고객 사진 업로드/촬영 -->
                        <div class="customer-upload">
                            <h4>📸 고객 사진 업로드</h4>
                            
                            <!-- 업로드 방법 선택 -->
                            <div class="upload-methods">
                                <label for="customerImageInput" class="upload-btn file-upload">
                                    <span class="upload-icon">📁</span>
                                    <span>갤러리에서 선택</span>
                                    <input type="file" id="customerImageInput" accept="image/*" style="display: none;">
                                </label>
                                
                                <button class="upload-btn camera-capture" id="cameraBtn">
                                    <span class="upload-icon">📸</span>
                                    <span>카메라로 촬영</span>
                                </button>
                            </div>
                            
                            <!-- 📷 카메라 프리뷰 영역 -->
                            <div id="cameraPreview" class="camera-preview" style="display: none;">
                                <video id="cameraVideo" autoplay playsinline></video>
                                <canvas id="captureCanvas" style="display: none;"></canvas>
                                <div class="camera-controls">
                                    <button id="captureBtn" class="capture-btn">📸 촬영하기</button>
                                    <button id="closeCameraBtn" class="close-camera-btn">❌ 닫기</button>
                                </div>
                                <div class="camera-hint">얼굴이 화면 중앙에 오도록 조정하세요</div>
                            </div>
                            
                            <!-- 업로드된 이미지 미리보기 -->
                            <div id="uploadPreview" class="upload-preview" style="display: none;">
                                <img id="customerPreview" class="customer-preview">
                                <div class="preview-info">
                                    <span id="fileName">촬영한 사진</span>
                                    <button id="removeImage" class="remove-btn">🗑️ 다시 선택</button>
                                </div>
                            </div>
                        </div>

                        <!-- 처리 중 상태 -->
                        <div class="processing-status" id="processingStatus" style="display: none;">
                            <div class="processing-spinner"></div>
                            <div class="processing-text" id="processingText">AI가 헤어스타일을 적용하고 있습니다...</div>
                            <div class="processing-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                                </div>
                                <div class="progress-text" id="progressText">0%</div>
                            </div>
                            <div class="processing-hint">약 30초~2분 정도 소요됩니다</div>
                        </div>

                        <!-- 결과 표시 -->
                        <div class="result-container" id="resultContainer" style="display: none;">
                            <h4>🎉 가상체험 결과</h4>
                            <div class="result-comparison">
                                <div class="before-after">
                                    <div class="comparison-item">
                                        <div class="comparison-label">원본</div>
                                        <img id="originalImg" class="comparison-img">
                                    </div>
                                    <div class="comparison-arrow">→</div>
                                    <div class="comparison-item">
                                        <div class="comparison-label">체험 결과</div>
                                        <img id="resultImg" class="comparison-img">
                                    </div>
                                </div>
                                <div class="result-actions">
                                    <button class="result-btn" id="downloadBtn">📥 결과 저장</button>
                                    <button class="result-btn" id="shareBtn">📤 공유하기</button>
                                    <button class="result-btn primary" id="registerWithResult">👤 이 결과로 고객등록</button>
                                </div>
                            </div>
                        </div>

                        <!-- 액션 버튼들 -->
                        <div class="akool-modal-actions">
                            <button class="akool-btn akool-btn-secondary" id="cancelFaceSwap">취소</button>
                            <button class="akool-btn akool-btn-primary" id="startFaceSwap" disabled>
                                ✨ AI 체험 시작
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 모달 요소들 저장
        this.modal = document.getElementById('faceSwapModal');
        this.fileInput = document.getElementById('customerImageInput');
        this.previewImg = document.getElementById('customerPreview');
        this.resultContainer = document.getElementById('resultContainer');

        // 📸 카메라 CSS 스타일 추가
        this.addCameraStyles();

        console.log('✅ 얼굴 바꾸기 모달 생성 완료');
    }

    // ========== 📸 카메라 CSS 스타일 추가 ==========
    addCameraStyles() {
        const cameraStyles = `
            <style>
            .akool-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 3000;
                padding: 20px;
            }

            .akool-modal.active {
                display: flex;
            }

            .akool-modal-content {
                background: #1a1a1a;
                border: 2px solid #FF1493;
                border-radius: 20px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }

            .akool-modal-header {
                padding: 20px 25px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .akool-modal-title {
                color: #FF1493;
                font-size: 20px;
                margin: 0;
            }

            .akool-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .akool-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .akool-modal-body {
                padding: 25px;
            }

            .selected-style {
                margin-bottom: 25px;
                padding: 15px;
                background: #000;
                border-radius: 10px;
            }

            .selected-style h4 {
                color: #FF1493;
                margin-bottom: 15px;
            }

            .style-preview {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            #selectedStyleImg {
                width: 80px;
                height: 100px;
                object-fit: cover;
                border-radius: 8px;
            }

            .style-info {
                flex: 1;
            }

            .style-code {
                font-size: 12px;
                color: #999;
            }

            .style-name {
                font-size: 16px;
                color: white;
                font-weight: bold;
                margin-top: 5px;
            }

            .customer-upload h4 {
                color: #FF1493;
                margin-bottom: 15px;
            }

            .upload-methods {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                justify-content: center;
            }

            .upload-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
                border: 2px dashed #FF1493;
                border-radius: 10px;
                background: rgba(255, 20, 147, 0.1);
                cursor: pointer;
                transition: all 0.3s;
                flex: 1;
                max-width: 150px;
                color: #FF1493;
                text-decoration: none;
            }

            .upload-btn:hover {
                background: rgba(255, 20, 147, 0.2);
                transform: translateY(-2px);
                border-color: #FF69B4;
            }

            .upload-icon {
                font-size: 30px;
                margin-bottom: 10px;
            }

            .upload-btn span:last-child {
                font-weight: bold;
                font-size: 14px;
                text-align: center;
            }

            .camera-preview {
                border: 2px solid #FF1493;
                border-radius: 15px;
                padding: 20px;
                background: #000;
                margin: 20px 0;
                text-align: center;
            }

            #cameraVideo {
                width: 100%;
                max-width: 400px;
                border-radius: 10px;
                display: block;
                margin: 0 auto;
                background: #222;
            }

            .camera-controls {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 15px;
            }

            .capture-btn, .close-camera-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 25px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            }

            .capture-btn {
                background: #FF1493;
                color: white;
            }

            .capture-btn:hover {
                background: #FF69B4;
                transform: scale(1.05);
            }

            .close-camera-btn {
                background: #666;
                color: white;
            }

            .close-camera-btn:hover {
                background: #888;
            }

            .camera-hint {
                color: #999;
                font-size: 12px;
                margin-top: 10px;
                text-align: center;
            }

            .upload-preview {
                text-align: center;
                margin: 20px 0;
                padding: 20px;
                border: 2px solid #FF1493;
                border-radius: 10px;
                background: rgba(255, 20, 147, 0.05);
            }

            .customer-preview {
                max-width: 200px;
                max-height: 200px;
                border-radius: 10px;
                object-fit: cover;
            }

            .preview-info {
                margin-top: 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            #fileName {
                color: #666;
                font-size: 14px;
            }

            .remove-btn {
                background: #ff4444;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            }

            .remove-btn:hover {
                background: #ff6666;
            }

            .processing-status {
                text-align: center;
                padding: 30px;
                background: #000;
                border-radius: 10px;
                margin: 20px 0;
            }

            .processing-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #333;
                border-top-color: #FF1493;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .processing-text {
                color: #FF1493;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
            }

            .processing-progress {
                margin: 15px 0;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: #333;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #FF1493, #FF69B4);
                transition: width 0.3s ease;
            }

            .progress-text {
                color: #999;
                font-size: 14px;
            }

            .processing-hint {
                color: #666;
                font-size: 12px;
                margin-top: 10px;
            }

            .result-container {
                margin-top: 25px;
                padding: 20px;
                background: #000;
                border-radius: 10px;
            }

            .result-container h4 {
                color: #FF1493;
                margin-bottom: 20px;
                text-align: center;
            }

            .before-after {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                margin-bottom: 20px;
            }

            .comparison-item {
                text-align: center;
                flex: 1;
            }

            .comparison-label {
                color: #999;
                font-size: 12px;
                margin-bottom: 8px;
            }

            .comparison-img {
                width: 120px;
                height: 160px;
                object-fit: cover;
                border-radius: 8px;
                border: 2px solid #333;
            }

            .comparison-arrow {
                color: #FF1493;
                font-size: 24px;
                font-weight: bold;
            }

            .result-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .result-btn {
                padding: 10px 15px;
                border: 1px solid #666;
                border-radius: 8px;
                background: #222;
                color: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s;
            }

            .result-btn:hover {
                background: #333;
            }

            .result-btn.primary {
                background: #FF1493;
                border-color: #FF1493;
            }

            .result-btn.primary:hover {
                background: #FF69B4;
            }

            .akool-modal-actions {
                padding: 20px 25px;
                border-top: 1px solid #333;
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            }

            .akool-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }

            .akool-btn-secondary {
                background: #666;
                color: white;
            }

            .akool-btn-secondary:hover {
                background: #777;
            }

            .akool-btn-primary {
                background: #FF1493;
                color: white;
            }

            .akool-btn-primary:hover:not(:disabled) {
                background: #FF69B4;
            }

            .akool-btn-primary:disabled {
                background: #444;
                color: #666;
                cursor: not-allowed;
            }

            @media (max-width: 768px) {
                .akool-modal-content {
                    margin: 10px;
                    max-height: calc(100vh - 20px);
                }
                
                .upload-methods {
                    flex-direction: column;
                }
                
                .upload-btn {
                    max-width: none;
                }
                
                .camera-controls {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .capture-btn, .close-camera-btn {
                    width: 100%;
                }

                .before-after {
                    flex-direction: column;
                    gap: 15px;
                }

                .comparison-arrow {
                    transform: rotate(90deg);
                }

                .result-actions {
                    flex-direction: column;
                }

                .akool-modal-actions {
                    flex-direction: column;
                }
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', cameraStyles);
    }

    // ========== 📸 카메라 기능 초기화 ==========
    initCamera() {
        this.camera = new CameraCapture();

        // 📸 카메라 버튼 이벤트 (이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'cameraBtn' || e.target.closest('#cameraBtn')) {
                this.camera.startCamera();
            }
        });

        // 📷 촬영 버튼 이벤트
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'captureBtn') {
                const photoFile = await this.camera.capturePhoto();
                if (photoFile) {
                    this.handleImageUpload(photoFile);
                    this.camera.stopCamera();
                }
            }
        });

        // ❌ 카메라 닫기 버튼 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.id === 'closeCameraBtn') {
                this.camera.stopCamera();
            }
        });

        // 🗑️ 이미지 제거 버튼 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.id === 'removeImage') {
                this.removeUploadedImage();
            }
        });
    }

    // ========== 3. 이벤트 리스너 설정 ==========
    setupEventListeners() {
        // 모달 닫기
        document.addEventListener('click', (e) => {
            if (e.target.id === 'faceSwapClose' || e.target.id === 'cancelFaceSwap') {
                this.closeFaceSwapModal();
            }
            
            if (e.target.id === 'faceSwapModal') {
                this.closeFaceSwapModal();
            }
        });

        // 파일 선택
        document.addEventListener('change', (e) => {
            if (e.target.id === 'customerImageInput') {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // AI 체험 시작
        document.addEventListener('click', (e) => {
            if (e.target.id === 'startFaceSwap') {
                this.performFaceSwap();
            }
        });

        // 결과 액션들
        document.addEventListener('click', (e) => {
            if (e.target.id === 'downloadBtn') {
                this.downloadResult();
            } else if (e.target.id === 'shareBtn') {
                this.shareResult();
            } else if (e.target.id === 'registerWithResult') {
                this.registerCustomerWithResult();
            }
        });
    }

    // ========== 4. 모달 열기 ==========
    openFaceSwapModal() {
        // 현재 선택된 스타일 정보 가져오기
        const modalImg = document.getElementById('modalImage');
        const modalCode = document.getElementById('modalCode');
        const modalName = document.getElementById('modalName');

        if (!modalImg || !modalImg.src) {
            alert('먼저 헤어스타일을 선택해주세요.');
            return;
        }

        // 스타일 데이터 저장
        this.currentStyleData = {
            imageUrl: modalImg.src,
            code: modalCode.textContent,
            name: modalName.textContent
        };

        // 모달에 스타일 정보 표시
        document.getElementById('selectedStyleImg').src = this.currentStyleData.imageUrl;
        document.getElementById('selectedStyleCode').textContent = this.currentStyleData.code;
        document.getElementById('selectedStyleName').textContent = this.currentStyleData.name;

        // 모달 표시
        this.modal.classList.add('active');
        
        // 초기화
        this.resetModal();

        console.log('🎨 얼굴 바꾸기 모달 열림:', this.currentStyleData);
    }

    // ========== 5. 모달 닫기 ==========
    closeFaceSwapModal() {
        // 카메라 정지
        if (this.camera) {
            this.camera.stopCamera();
        }
        
        this.modal.classList.remove('active');
        this.resetModal();
    }

    // ========== 6. 모달 상태 초기화 ==========
    resetModal() {
        this.customerImageFile = null;
        this.resultImageUrl = null;
        
        // UI 초기화
        document.getElementById('uploadPreview').style.display = 'none';
        this.resultContainer.style.display = 'none';
        document.getElementById('processingStatus').style.display = 'none';
        document.getElementById('startFaceSwap').disabled = true;
        
        // 파일 입력 초기화
        const fileInput = document.getElementById('customerImageInput');
        if (fileInput) fileInput.value = '';
    }

    // ========== 7. 이미지 업로드 처리 ==========
    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            alert('파일 크기는 10MB 이하로 해주세요.');
            return;
        }

        this.customerImageFile = file;

        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('customerPreview');
            previewImg.src = e.target.result;
            
            // 파일명 표시
            const fileName = document.getElementById('fileName');
            fileName.textContent = file.name.length > 20 ? 
                file.name.substring(0, 20) + '...' : file.name;
            
            // 미리보기 영역 표시
            document.getElementById('uploadPreview').style.display = 'block';
            
            // AI 체험 버튼 활성화
            document.getElementById('startFaceSwap').disabled = false;
        };
        reader.readAsDataURL(file);

        console.log('📸 고객 이미지 업로드됨:', file.name);
    }

    // ========== 📸 업로드된 이미지 제거 ==========
    removeUploadedImage() {
        this.customerImageFile = null;
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('startFaceSwap').disabled = true;
        
        // 파일 입력 초기화
        const fileInput = document.getElementById('customerImageInput');
        if (fileInput) fileInput.value = '';
        
        console.log('🗑️ 업로드된 이미지 제거됨');
    }

    // ========== 8. 얼굴 바꾸기 실행 (수정된 버전) ==========
    async performFaceSwap() {
        if (!this.customerImageFile || !this.currentStyleData) {
            alert('이미지를 먼저 업로드해주세요.');
            return;
        }

        if (this.isProcessing) {
            alert('이미 처리 중입니다.');
            return;
        }

        this.isProcessing = true;

        try {
            // 처리 중 UI 표시
            this.showProcessingStatus(true);
            document.getElementById('startFaceSwap').disabled = true;

            console.log('🎨 얼굴 바꾸기 시작');
            console.log('👤 고객 이미지 파일:', this.customerImageFile);
            console.log('💇 헤어스타일 이미지:', this.currentStyleData.imageUrl);

            // ✅ 새로운 API 함수 사용 (processFaceSwap)
            const result = await window.akoolAPI.processFaceSwap(
                this.customerImageFile, // File 객체 직접 전달
                this.currentStyleData.imageUrl,
                (progress, message) => {
                    // 프로그레스 콜백
                    this.updateProgress(progress, message);
                    console.log(`📊 진행률: ${progress}% - ${message}`);
                }
            );

            if (result.success) {
                // 성공: 결과 표시
                const originalUrl = URL.createObjectURL(this.customerImageFile);
                this.showResult(originalUrl, result.resultUrl);
                console.log('🎉 얼굴 바꾸기 성공!', result);
            } else {
                throw new Error(result.error || '얼굴 바꾸기에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 얼굴 바꾸기 실패:', error);
            alert(`얼굴 바꾸기 실패: ${error.message}`);
            this.showProcessingStatus(false);
            document.getElementById('startFaceSwap').disabled = false;
        } finally {
            this.isProcessing = false;
        }
    }

    // ========== 9. 프로그레스 업데이트 ==========
    updateProgress(progress, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const processingText = document.getElementById('processingText');

        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }

        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }

        if (processingText && message) {
            processingText.textContent = message;
        }
    }

    // ========== 10. 처리 중 상태 표시 ==========
    showProcessingStatus(show) {
        const processingStatus = document.getElementById('processingStatus');
        if (show) {
            processingStatus.style.display = 'block';
            this.resultContainer.style.display = 'none';
            // 프로그레스 초기화
            this.updateProgress(0, 'AI가 헤어스타일을 적용하고 있습니다...');
        } else {
            processingStatus.style.display = 'none';
        }
    }

    // ========== 11. 결과 표시 ==========
    showResult(originalUrl, resultUrl) {
        this.resultImageUrl = resultUrl;
        
        // 처리 중 숨기기
        this.showProcessingStatus(false);
        
        // 결과 이미지 설정
        document.getElementById('originalImg').src = originalUrl;
        document.getElementById('resultImg').src = resultUrl;
        
        // 결과 컨테이너 표시
        this.resultContainer.style.display = 'block';
        
        console.log('✅ 결과 표시 완료');
    }

    // ========== 12. 결과 다운로드 ==========
    downloadResult() {
        if (!this.resultImageUrl) return;

        const link = document.createElement('a');
        link.href = this.resultImageUrl;
        link.download = `hairgator_ai_result_${Date.now()}.jpg`;
        link.click();

        console.log('📥 결과 다운로드');
    }

    // ========== 13. 결과 공유 ==========
    async shareResult() {
        if (!this.resultImageUrl) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'HAIRGATOR AI 헤어스타일 체험',
                    text: `${this.currentStyleData.name} 스타일을 AI로 체험해봤어요!`,
                    url: this.resultImageUrl
                });
            } catch (error) {
                console.log('공유 취소됨');
            }
        } else {
            // 클립보드에 URL 복사
            navigator.clipboard.writeText(this.resultImageUrl);
            alert('결과 이미지 URL이 클립보드에 복사되었습니다!');
        }

        console.log('📤 결과 공유');
    }

    // ========== 14. 결과와 함께 고객 등록 ==========
    registerCustomerWithResult() {
        // 기존 고객 등록 로직 실행하되, 
        // 추가로 AI 결과 이미지도 포함
        const customerName = prompt('고객 이름을 입력하세요:');
        if (!customerName) return;

        const customerPhone = prompt('전화번호를 입력하세요:');
        if (!customerPhone) return;

        // Firebase에 저장할 데이터에 AI 결과 추가
        const customerData = {
            name: customerName,
            phone: customerPhone,
            styleCode: this.currentStyleData.code,
            styleName: this.currentStyleData.name,
            aiResultUrl: this.resultImageUrl, // AI 결과 이미지 추가
            hasAIResult: true,
            registeredAt: new Date()
        };

        // 기존 customers 컬렉션에 저장
        if (typeof db !== 'undefined') {
            db.collection('customers').add(customerData)
                .then(() => {
                    alert('AI 체험 결과와 함께 고객 등록이 완료되었습니다!');
                    this.closeFaceSwapModal();
                })
                .catch((error) => {
                    console.error('고객 등록 실패:', error);
                    alert('고객 등록에 실패했습니다.');
                });
        }

        console.log('👤 AI 결과와 함께 고객 등록');
    }
}

// ========== 📸 카메라 캡처 클래스 ==========
class CameraCapture {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.isActive = false;
    }

    // 📸 카메라 시작
    async startCamera() {
        try {
            console.log('📸 카메라 시작...');
            
            // 카메라 권한 요청 및 스트림 가져오기
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // 전면 카메라 (셀카)
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            // 비디오 요소에 스트림 연결
            this.video = document.getElementById('cameraVideo');
            this.video.srcObject = this.stream;
            
            // 카메라 프리뷰 영역 표시
            document.getElementById('cameraPreview').style.display = 'block';
            
            this.isActive = true;
            console.log('✅ 카메라 시작 성공');

        } catch (error) {
            console.error('❌ 카메라 시작 실패:', error);
            
            let errorMessage = '카메라에 접근할 수 없습니다.';
            if (error.name === 'NotAllowedError') {
                errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '카메라가 발견되지 않았습니다.';
            }
            
            alert(errorMessage);
        }
    }

    // 📷 사진 촬영
    async capturePhoto() {
        if (!this.isActive || !this.video) return null;

        try {
            console.log('📷 사진 촬영 중...');

            // Canvas 요소 가져오기
            this.canvas = document.getElementById('captureCanvas');
            const ctx = this.canvas.getContext('2d');

            // 비디오 크기에 맞춰 캔버스 크기 설정
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // 비디오 프레임을 캔버스에 그리기
            ctx.drawImage(this.video, 0, 0);

            // Canvas를 Blob으로 변환
            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    if (blob) {
                        // Blob을 File 객체로 변환
                        const file = new File([blob], `camera_${Date.now()}.jpg`, {
                            type: 'image/jpeg'
                        });
                        
                        console.log('✅ 사진 촬영 성공:', file.name);
                        resolve(file);
                    } else {
                        console.error('❌ Blob 생성 실패');
                        resolve(null);
                    }
                }, 'image/jpeg', 0.8);
            });

        } catch (error) {
            console.error('❌ 사진 촬영 실패:', error);
            return null;
        }
    }

    // 📵 카메라 정지
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }

        document.getElementById('cameraPreview').style.display = 'none';
        this.isActive = false;
        
        console.log('📵 카메라 정지됨');
    }
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
    // akool-api.js가 로드된 후에 실행
    if (window.akoolAPI) {
        window.hairgateFaceSwap = new HairgateFaceSwap();
    } else {
        // API 모듈 로드 대기
        const checkAPI = setInterval(() => {
            if (window.akoolAPI) {
                clearInterval(checkAPI);
                window.hairgateFaceSwap = new HairgateFaceSwap();
            }
        }, 100);
        
        // 10초 후에도 로드되지 않으면 포기
        setTimeout(() => {
            if (!window.akoolAPI) {
                clearInterval(checkAPI);
                console.error('❌ AKOOL API 로드 실패 - 10초 타임아웃');
            }
        }, 10000);
    }
});

console.log('🎨 HAIRGATOR Face Swap 메인 로직 (카메라 포함) - 최종 수정 완료');
