// akool/js/face-swap.js
// 얼굴 바꾸기 UI 컨트롤러 - SUCCESS 에러 수정 버전
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
        
        this.init();
    }

    init() {
        console.log('🎨 HairgateFaceSwap 초기화');
        this.setupEventListeners();
        this.createProgressUI();
        this.createResultUI();
        this.createFullscreenControls();
        
        // ✨ AI 버튼 생성 시스템 시작
        this.initAIButtonSystem();
    }

    // ✨ AI 버튼 생성 시스템 초기화
    initAIButtonSystem() {
        console.log('🤖 AI 버튼 시스템 초기화');
        
        // 모달 변화 감지를 위한 MutationObserver
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 스타일 모달이 활성화될 때
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'class' && 
                    mutation.target.id === 'styleModal') {
                    
                    if (mutation.target.classList.contains('active')) {
                        setTimeout(() => this.addAIButtonToModal(), 100);
                    }
                }
                
                // 새로운 모달 액션 영역이 추가될 때
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const modalActions = node.querySelector?.('.modal-actions') || 
                                                (node.classList?.contains('modal-actions') ? node : null);
                            if (modalActions && !document.getElementById('btnAIExperience')) {
                                setTimeout(() => this.addAIButtonToModal(), 50);
                            }
                        }
                    });
                }
            });
        });

        // 전체 document 감시
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // 기존 모달에도 즉시 시도
        setTimeout(() => this.addAIButtonToModal(), 500);
    }

    // ✨ 모달에 AI 버튼 추가
    addAIButtonToModal() {
        const modalActions = document.querySelector('#styleModal .modal-actions');
        
        if (!modalActions) {
            console.log('모달 액션 영역을 찾을 수 없음');
            return;
        }
        
        // 이미 AI 버튼이 있는지 확인
        if (document.getElementById('btnAIExperience')) {
            console.log('AI 버튼이 이미 존재함');
            return;
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
        
        // 맨 앞에 추가
        modalActions.insertBefore(aiBtn, modalActions.firstChild);
        
        // 클릭 이벤트 추가
        aiBtn.addEventListener('click', () => {
            this.openAIExperienceModal();
        });
        
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

    // ✨ AI 체험 모달 닫기
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
                            <div class="result-comparison">
                                <div class="result-image-container">
                                    <div class="result-image-item">
                                        <h4>변경 전</h4>
                                        <img id="originalResult" class="result-image" alt="원본 이미지">
                                    </div>
                                    <div class="result-image-item">
                                        <h4>변경 후</h4>
                                        <img id="swappedResult" class="result-image" alt="결과 이미지">
                                    </div>
                                </div>
                            </div>
                            <div class="result-controls">
                                <button class="btn btn-primary" onclick="window.hairgateFaceSwap.downloadResult()">
                                    📱 결과 저장
                                </button>
                                <button class="btn btn-secondary" onclick="window.hairgateFaceSwap.shareResult()">
                                    🔗 공유하기
                                </button>
                                <button class="btn btn-outline" onclick="window.hairgateFaceSwap.tryAnother()">
                                    🔄 다른 스타일 시도
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

            // ✅ 수정된 API 호출 - SUCCESS 에러 해결
            const result = await window.akoolAPI.processFaceSwap(
                this.customerImageFile,
                this.selectedHairstyleUrl,
                (progress, message) => this.updateProgress(progress, message)
            );

            console.log('🔍 API 응답 전체:', JSON.stringify(result || {}, null, 2));
            
            // ✅ 강화된 성공 판정 로직
            let resultUrl = null;
            let isSuccess = false;

            // 1️⃣ 명확한 성공 케이스
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
            else if (result && result.data && (result.data.resultUrl || result.data.url || result.data.image || result.data.output)) {
                isSuccess = true;
                resultUrl = result.data.resultUrl || result.data.url || result.data.image || result.data.output;
            }
            // 4️⃣ SUCCESS 메시지가 있지만 에러가 아닌 경우 (핵심 수정!)
            else if (result && result.message && 
                     (result.message.toString().toUpperCase().includes('SUCCESS') || 
                      result.message.toString().includes('완료') ||
                      result.message.toString().includes('성공')) && 
                     !result.error) {
                isSuccess = true;
                resultUrl = result.resultUrl || result.data?.resultUrl || result.data?.url || 
                           result.url || result.data?.image || result.data?.output;
            }
            // 5️⃣ 에러가 명시되지 않고 어떤 URL이라도 있는 경우
            else if (result && !result.error && 
                     (result.url || (result.data && Object.values(result.data).some(v => 
                         typeof v === 'string' && (v.includes('http') || v.includes('blob')))))) {
                isSuccess = true;
                resultUrl = result.url || result.resultUrl || 
                           result.data?.url || result.data?.resultUrl || 
                           result.data?.image || result.data?.output ||
                           (result.data && Object.values(result.data).find(v => 
                               typeof v === 'string' && (v.includes('http') || v.includes('blob'))));
            }
            // 6️⃣ 특별한 경우: error가 "SUCCESS"인 경우 (API 버그 대응)
            else if (result && result.error === 'SUCCESS') {
                console.log('🔧 SUCCESS 에러 감지! 성공으로 처리합니다.');
                isSuccess = true;
                resultUrl = result.resultUrl || result.data?.resultUrl || result.data?.url || 
                           result.url || result.data?.image || result.data?.output;
                
                // resultUrl이 없는 경우 재시도 안내
                if (!resultUrl) {
                    throw new Error('처리가 완료되었지만 결과 이미지를 받을 수 없습니다. 잠시 후 다시 시도해주세요.');
                }
            }

            console.log('🎯 판정 결과:', { isSuccess, resultUrl });

            if (isSuccess && resultUrl) {
                // ✅ 성공 처리
                const originalUrl = URL.createObjectURL(this.customerImageFile);
                this.showResult(originalUrl, resultUrl);
                console.log('🎉 얼굴 바꾸기 성공!', resultUrl);
                
            } else if (result && result.error && result.error !== 'SUCCESS') {
                // ❌ 명확한 에러 (SUCCESS는 제외)
                throw new Error(result.error);
                
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

    showResult(originalUrl, resultUrl) {
        this.hideProgress();

        // 결과 이미지 설정
        const originalResult = document.getElementById('originalResult');
        const swappedResult = document.getElementById('swappedResult');

        if (originalResult) {
            originalResult.src = originalUrl;
        }

        if (swappedResult) {
            swappedResult.src = resultUrl;
            swappedResult.setAttribute('data-result-url', resultUrl);
        }

        // 결과 UI 표시
        if (this.resultContainer) {
            this.resultContainer.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        console.log('🎉 결과 표시 완료');
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
            const response = await fetch(swappedResult.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `hairgate_result_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            console.log('📱 결과 이미지 다운로드 완료');
            
        } catch (error) {
            console.error('다운로드 오류:', error);
            alert('다운로드 중 오류가 발생했습니다.');
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
        // 에러 표시
        alert(`❌ 오류 발생\n\n${message}\n\n• 정면 사진을 사용해주세요\n• 밝은 환경에서 촬영된 사진을 사용해주세요\n• 한 명만 나온 사진을 사용해주세요`);
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
    
    // ✨ 카메라 시작
    async startCamera() {
        try {
            console.log('📸 카메라 시작...');
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // 전면 카메라
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            
            this.cameraVideo = document.getElementById('cameraVideo');
            if (this.cameraVideo) {
                this.cameraVideo.srcObject = this.cameraStream;
            }
            
            const cameraPreview = document.getElementById('cameraPreview');
            const cameraPlaceholder = document.getElementById('cameraPlaceholder');
            
            if (cameraPreview) cameraPreview.style.display = 'block';
            if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
            
            console.log('✅ 카메라 시작 성공');
            
        } catch (error) {
            console.error('❌ 카메라 시작 실패:', error);
            
            let errorMessage = '카메라에 접근할 수 없습니다.';
            if (error.name === 'NotAllowedError') {
                errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '카메라가 발견되지 않았습니다.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '카메라가 다른 앱에서 사용 중입니다.';
            }
            
            alert(errorMessage);
        }
    }
    
    // ✨ 카메라 중지
    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        const cameraPreview = document.getElementById('cameraPreview');
        const cameraPlaceholder = document.getElementById('cameraPlaceholder');
        
        if (cameraPreview) cameraPreview.style.display = 'none';
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'block';
        
        console.log('📸 카메라 중지');
    }
    
    // ✨ 사진 촬영
    async capturePhoto() {
        if (!this.cameraVideo || !this.cameraStream) {
            alert('카메라가 준비되지 않았습니다.');
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.cameraVideo.videoWidth;
            canvas.height = this.cameraVideo.videoHeight;
            
            // 비디오 프레임을 캔버스에 그리기
            ctx.drawImage(this.cameraVideo, 0, 0);
            
            // 캔버스를 Blob으로 변환
            canvas.toBlob((blob) => {
                if (blob) {
                    // File 객체 생성
                    const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
                        type: 'image/jpeg'
                    });
                    
                    this.customerImageFile = file;
                    console.log('📸 사진 촬영 완료:', file.name);
                    
                    // 미리보기 업데이트
                    this.updateCameraPreview(URL.createObjectURL(blob));
                    this.updateStartButtonState();
                    
                    // 카메라 중지
                    this.stopCamera();
                }
            }, 'image/jpeg', 0.9);
            
        } catch (error) {
            console.error('❌ 사진 촬영 실패:', error);
            alert('사진 촬영 중 오류가 발생했습니다.');
        }
    }
    
    // ✨ 카메라 미리보기 업데이트
    updateCameraPreview(imageUrl) {
        const cameraArea = document.getElementById('cameraArea');
        if (cameraArea) {
            cameraArea.innerHTML = `
                <div class="captured-image-preview">
                    <img src="${imageUrl}" alt="촬영된 사진" style="width: 100%; max-width: 300px; border-radius: 10px;">
                    <div class="captured-actions">
                        <button class="btn btn-outline" onclick="window.hairgateFaceSwap.retakePhoto()">
                            📸 다시 촬영
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // ✨ 다시 촬영
    retakePhoto() {
        this.customerImageFile = null;
        this.updateStartButtonState();
        
        // 카메라 영역 초기화
        const cameraArea = document.getElementById('cameraArea');
        if (cameraArea) {
            cameraArea.innerHTML = `
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
        
        console.log('🔄 다시 촬영 준비');
    }
}

// ===== 전역 등록 및 초기화 =====
window.HairgateFaceSwap = HairgateFaceSwap;

document.addEventListener('DOMContentLoaded', () => {
    window.hairgateFaceSwap = new HairgateFaceSwap();
    console.log('✅ HairgateFaceSwap 초기화 완료');
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
