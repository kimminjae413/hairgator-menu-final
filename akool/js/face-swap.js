// ========== HAIRGATOR 얼굴 바꾸기 메인 로직 ==========

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
        
        this.init();
    }

    // ========== 초기화 ==========
    init() {
        this.createAIButton();
        this.createFaceSwapModal();
        this.setupEventListeners();
        
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

                        <!-- 고객 사진 업로드 -->
                        <div class="customer-upload">
                            <h4>📸 고객 사진 업로드</h4>
                            <div class="upload-area" id="customerUploadArea">
                                <input type="file" id="customerImageInput" accept="image/*" style="display: none;">
                                <div class="upload-prompt">
                                    <div class="upload-icon">📷</div>
                                    <div class="upload-text">
                                        <div>사진을 선택하거나 여기에 드래그하세요</div>
                                        <div class="upload-hint">얼굴이 선명한 정면 사진을 권장합니다</div>
                                    </div>
                                </div>
                                <img id="customerPreview" class="customer-preview" style="display: none;">
                            </div>
                        </div>

                        <!-- 처리 중 상태 -->
                        <div class="processing-status" id="processingStatus" style="display: none;">
                            <div class="processing-spinner"></div>
                            <div class="processing-text">AI가 헤어스타일을 적용하고 있습니다...</div>
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

        console.log('✅ 얼굴 바꾸기 모달 생성 완료');
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

        // 파일 업로드 영역 클릭
        document.addEventListener('click', (e) => {
            if (e.target.closest('#customerUploadArea')) {
                document.getElementById('customerImageInput').click();
            }
        });

        // 파일 선택
        document.addEventListener('change', (e) => {
            if (e.target.id === 'customerImageInput') {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // 드래그 앤 드롭
        document.addEventListener('dragover', (e) => {
            if (e.target.closest('#customerUploadArea')) {
                e.preventDefault();
                e.target.closest('#customerUploadArea').classList.add('dragover');
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.closest('#customerUploadArea')) {
                e.target.closest('#customerUploadArea').classList.remove('dragover');
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.closest('#customerUploadArea')) {
                e.preventDefault();
                e.target.closest('#customerUploadArea').classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageUpload(files[0]);
                }
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
        this.modal.classList.remove('active');
        this.resetModal();
    }

    // ========== 6. 모달 상태 초기화 ==========
    resetModal() {
        this.customerImageFile = null;
        this.resultImageUrl = null;
        
        // UI 초기화
        this.previewImg.style.display = 'none';
        this.resultContainer.style.display = 'none';
        document.getElementById('processingStatus').style.display = 'none';
        document.getElementById('startFaceSwap').disabled = true;
        
        // 업로드 영역 초기화
        const uploadArea = document.getElementById('customerUploadArea');
        uploadArea.classList.remove('has-image');
        
        const uploadPrompt = uploadArea.querySelector('.upload-prompt');
        if (uploadPrompt) uploadPrompt.style.display = 'block';
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
            this.previewImg.src = e.target.result;
            this.previewImg.style.display = 'block';
            
            // 업로드 영역 스타일 변경
            const uploadArea = document.getElementById('customerUploadArea');
            uploadArea.classList.add('has-image');
            uploadArea.querySelector('.upload-prompt').style.display = 'none';
            
            // AI 체험 버튼 활성화
            document.getElementById('startFaceSwap').disabled = false;
        };
        reader.readAsDataURL(file);

        console.log('📸 고객 이미지 업로드됨:', file.name);
    }

    // ========== 8. 얼굴 바꾸기 실행 ==========
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

            // 고객 이미지를 임시 URL로 변환 (실제로는 서버 업로드 필요)
            const customerImageUrl = await this.uploadCustomerImage(this.customerImageFile);

            // AKOOL API 호출
            const result = await window.akoolAPI.swapFace(
                customerImageUrl,
                this.currentStyleData.imageUrl,
                {
                    enhance: true // 얼굴 향상 기능 사용
                }
            );

            if (result.success) {
                // 성공: 결과 표시
                this.showResult(customerImageUrl, result.resultUrl);
                console.log('🎉 얼굴 바꾸기 성공!', result);
            } else {
                throw new Error(result.error);
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

    // ========== 9. 고객 이미지 업로드 (임시) ==========
    async uploadCustomerImage(file) {
        // 실제로는 서버에 업로드해야 하지만, 
        // 임시로 ObjectURL 사용 (CORS 문제 있을 수 있음)
        return URL.createObjectURL(file);
    }

    // ========== 10. 처리 중 상태 표시 ==========
    showProcessingStatus(show) {
        const processingStatus = document.getElementById('processingStatus');
        if (show) {
            processingStatus.style.display = 'block';
            this.resultContainer.style.display = 'none';
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
        link.download = `hairgate_ai_result_${Date.now()}.jpg`;
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
    }
});

console.log('🎨 HAIRGATOR Face Swap 메인 로직 로드 완료');
