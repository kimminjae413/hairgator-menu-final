// ========== HAIRGATOR 얼굴 바꾸기 메인 로직 (SUCCESS 에러 수정 완료) ==========

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
        this.initCamera();
        
        console.log('🎨 HAIRGATOR Face Swap 시스템 초기화 완료');
    }

    // ========== 1. AI 헤어체험 버튼 추가 ==========
    createAIButton() {
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
                        
                        modalActions.insertBefore(aiBtn, modalActions.firstChild);
                        
                        aiBtn.addEventListener('click', () => {
                            this.openFaceSwapModal();
                        });

                        console.log('✅ AI 헤어체험 버튼 추가됨');
                    }
                }
            });
        });

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

                        <div class="customer-upload">
                            <h4>📸 고객 사진 업로드</h4>
                            
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
                            
                            <div id="cameraPreview" class="camera-preview" style="display: none;">
                                <video id="cameraVideo" autoplay playsinline></video>
                                <canvas id="captureCanvas" style="display: none;"></canvas>
                                <div class="camera-controls">
                                    <button id="captureBtn" class="capture-btn">📸 촬영하기</button>
                                    <button id="closeCameraBtn" class="close-camera-btn">❌ 닫기</button>
                                </div>
                                <div class="camera-hint">얼굴이 화면 중앙에 오도록 조정하세요</div>
                            </div>
                            
                            <div id="uploadPreview" class="upload-preview" style="display: none;">
                                <img id="customerPreview" class="customer-preview">
                                <div class="preview-info">
                                    <span id="fileName">촬영한 사진</span>
                                    <button id="removeImage" class="remove-btn">🗑️ 다시 선택</button>
                                </div>
                            </div>
                        </div>

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
        
        this.modal = document.getElementById('faceSwapModal');
        this.fileInput = document.getElementById('customerImageInput');
        this.previewImg = document.getElementById('customerPreview');
        this.resultContainer = document.getElementById('resultContainer');

        this.addModalStyles();

        console.log('✅ 얼굴 바꾸기 모달 생성 완료');
    }

    // ========== CSS 스타일 추가 ==========
    addModalStyles() {
        if (document.getElementById('akool-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'akool-modal-styles';
        styles.textContent = `
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

            .btn-ai-experience {
                background: linear-gradient(135deg, #FF1493, #FF69B4);
                border: none;
            }

            .btn-ai-experience:hover {
                background: linear-gradient(135deg, #FF69B4, #FF1493);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 20, 147, 0.4);
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
        `;
        
        document.head.appendChild(styles);
    }

    // ========== 📸 카메라 기능 초기화 ==========
    initCamera() {
        this.camera = new CameraCapture();

        document.addEventListener('click', (e) => {
            if (e.target.id === 'cameraBtn' || e.target.closest('#cameraBtn')) {
                this.camera.startCamera();
            }
        });

        document.addEventListener('click', async (e) => {
            if (e.target.id === 'captureBtn') {
                const photoFile = await this.camera.capturePhoto();
                if (photoFile) {
                    this.handleImageUpload(photoFile);
                    this.camera.stopCamera();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'closeCameraBtn') {
                this.camera.stopCamera();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'removeImage') {
                this.removeUploadedImage();
            }
        });
    }

    // ========== 3. 이벤트 리스너 설정 ==========
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'faceSwapClose' || e.target.id === 'cancelFaceSwap') {
                this.closeFaceSwapModal();
            }
            
            if (e.target.id === 'faceSwapModal') {
                this.closeFaceSwapModal();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.id === 'customerImageInput') {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'startFaceSwap') {
                this.performFaceSwap();
            }
        });

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
        const modalImg = document.getElementById('modalImage');
        const modalCode = document.getElementById('modalCode');
        const modalName = document.getElementById('modalName');

        if (!modalImg || !modalImg.src) {
            alert('먼저 헤어스타일을 선택해주세요.');
            return;
        }

        this.currentStyleData = {
            imageUrl: modalImg.src,
            code: modalCode.textContent,
            name: modalName.textContent
        };

        document.getElementById('selectedStyleImg').src = this.currentStyleData.imageUrl;
        document.getElementById('selectedStyleCode').textContent = this.currentStyleData.code;
        document.getElementById('selectedStyleName').textContent = this.currentStyleData.name;

        this.modal.classList.add('active');
        this.resetModal();

        console.log('🎨 얼굴 바꾸기 모달 열림:', this.currentStyleData);
    }

    // ========== 5. 모달 닫기 ==========
    closeFaceSwapModal() {
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
        
        document.getElementById('uploadPreview').style.display = 'none';
        this.resultContainer.style.display = 'none';
        document.getElementById('processingStatus').style.display = 'none';
        document.getElementById('startFaceSwap').disabled = true;
        
        const fileInput = document.getElementById('customerImageInput');
        if (fileInput) fileInput.value = '';
    }

    // ========== 7. 이미지 업로드 처리 ==========
    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB 이하로 해주세요.');
            return;
        }

        this.customerImageFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('customerPreview');
            previewImg.src = e.target.result;
            
            const fileName = document.getElementById('fileName');
            fileName.textContent = file.name.length > 20 ? 
                file.name.substring(0, 20) + '...' : file.name;
            
            document.getElementById('uploadPreview').style.display = 'block';
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
        
        const fileInput = document.getElementById('customerImageInput');
        if (fileInput) fileInput.value = '';
        
        console.log('🗑️ 업로드된 이미지 제거됨');
    }

    // ========== 8. 🔧 SUCCESS 에러 수정된 얼굴 바꾸기 실행 ==========
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
            this.showProcessingStatus(true);
            document.getElementById('startFaceSwap').disabled = true;

            console.log('🎨 얼굴 바꾸기 시작');
            console.log('👤 고객 이미지 파일:', this.customerImageFile);
            console.log('💇 헤어스타일 이미지:', this.currentStyleData.imageUrl);

            // ✅ SUCCESS 에러 수정: 올바른 성공/실패 처리
            const result = await window.akoolAPI.processFaceSwap(
                this.customerImageFile,
                this.currentStyleData.imageUrl,
                (progress, message) => {
                    this.updateProgress(progress, message);
                    console.log(`📊 진행률: ${progress}% - ${message}`);
                }
            );

            console.log('🔍 API 응답 전체:', result);

            // 🔧 SUCCESS 에러 수정: 응답 구조에 따른 올바른 처리
            if (result && (result.success === true || result.resultUrl)) {
                // ✅ 성공 케이스 처리
                const resultUrl = result.resultUrl || result.data?.resultUrl || result.url;
                
                if (resultUrl) {
                    const originalUrl = URL.createObjectURL(this.customerImageFile);
                    this.showResult(originalUrl, resultUrl);
                    console.log('🎉 얼굴 바꾸기 성공!', resultUrl);
                } else {
                    throw new Error('결과 이미지 URL을 받지 못했습니다.');
                }
                
            } else if (result && result.error) {
                // ❌ 명확한 에러 케이스
                throw new Error(result.error);
                
            } else if (result && result.message === 'SUCCESS') {
                // 🔧 "SUCCESS" 메시지를 성공으로 처리 (에러가 아님!)
                const resultUrl = result.data?.resultUrl || result.resultUrl || result.url;
                
                if (resultUrl) {
                    const originalUrl = URL.createObjectURL(this.customerImageFile);
                    this.showResult(originalUrl, resultUrl);
                    console.log('🎉 SUCCESS 메시지로 성공 확인!', resultUrl);
                } else {
                    console.warn('⚠️ SUCCESS 응답이지만 결과 URL 없음:', result);
                    throw new Error('SUCCESS 응답이지만 결과 이미지를 찾을 수 없습니다.');
                }
                
            } else {
                // ❓ 예상치 못한 응답 구조
                console.error('❓ 예상치 못한 API 응답:', result);
                throw new Error('API 응답 형식이 예상과 다릅니다.');
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
            this.updateProgress(0, 'AI가 헤어스타일을 적용하고 있습니다...');
        } else {
            processingStatus.style.display = 'none';
        }
    }

    // ========== 11. 결과 표시 ==========
    showResult(originalUrl, resultUrl) {
        this.resultImageUrl = resultUrl;
        
        this.showProcessingStatus(false);
        
        document.getElementById('originalImg').src = originalUrl;
        document.getElementById('resultImg').src = resultUrl;
        
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
            navigator.clipboard.writeText(this.resultImageUrl);
            alert('결과 이미지 URL이 클립보드에 복사되었습니다!');
        }

        console.log('📤 결과 공유');
    }

    // ========== 14. 결과와 함께 고객 등록 ==========
    registerCustomerWithResult() {
        const customerName = prompt('고객 이름을 입력하세요:');
        if (!customerName) return;

        const customerPhone = prompt('전화번호를 입력하세요:');
        if (!customerPhone) return;

        const customerData = {
            name: customerName,
            phone: customerPhone,
            styleCode: this.currentStyleData.code,
            styleName: this.currentStyleData.name,
            aiResultUrl: this.resultImageUrl,
            hasAIResult: true,
            registeredAt: new Date()
        };

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

    async startCamera() {
        try {
            console.log('📸 카메라 시작...');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            this.video = document.getElementById('cameraVideo');
            this.video.srcObject = this.stream;
            
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

    async capturePhoto() {
        if (!this.isActive || !this.video) return null;

        try {
            console.log('📷 사진 촬영 중...');

            this.canvas = document.getElementById('captureCanvas');
            const ctx = this.canvas.getContext('2d');

            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            ctx.drawImage(this.video, 0, 0);

            return new Promise((resolve) => {
                this.canvas.toBlob((blob) => {
                    if (blob) {
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
    if (window.akoolAPI) {
        window.hairgateFaceSwap = new HairgateFaceSwap();
    } else {
        const checkAPI = setInterval(() => {
            if (window.akoolAPI) {
                clearInterval(checkAPI);
                window.hairgateFaceSwap = new HairgateFaceSwap();
            }
        }, 100);
        
        setTimeout(() => {
            if (!window.akoolAPI) {
                clearInterval(checkAPI);
                console.error('❌ AKOOL API 로드 실패 - 10초 타임아웃');
            }
        }, 10000);
    }
});

console.log('🎨 HAIRGATOR Face Swap (SUCCESS 에러 수정 완료) - 최종 버전');
