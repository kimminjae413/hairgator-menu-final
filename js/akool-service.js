// ========== HAIRGATOR x AKOOL 데모 버전 통합 서비스 ==========

class AkoolServiceUpgraded {
    constructor() {
        // Flask Backend URL 설정
        this.backendURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3008'
            : 'https://your-ngrok-url.ngrok-free.app'; // ngrok URL로 변경 필요
            
        // 기존 직접 API 방식도 유지 (백엔드 연결 실패시 폴백)
        this.baseURL = 'https://openapi.akool.com/api/open/v3';
        this.detectURL = 'https://sg3.akool.com/detect';
        this.clientId = 'kdwRwzqnGf4zfAFvWCjFKQ==';
        this.clientSecret = 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g';
        this.token = null;
        this.tokenExpiry = null;
        
        // WebSocket 관련
        this.socket = null;
        this.currentSessionId = null;
        this.useBackendMode = true; // 데모 버전 우선 사용
        
        this.initializeSystem();
    }
    
    // 시스템 초기화
    async initializeSystem() {
        // 백엔드 연결 테스트
        const backendAvailable = await this.testBackendConnection();
        
        if (backendAvailable && this.useBackendMode) {
            console.log('✅ 데모 버전 모드 활성화 - 백엔드 연결됨');
            this.initializeWebSocket();
        } else {
            console.log('⚠️ 기존 모드로 폴백 - 직접 API 호출');
            this.useBackendMode = false;
        }
    }
    
    // 백엔드 연결 테스트
    async testBackendConnection() {
        try {
            const response = await fetch(`${this.backendURL}/api/health`, {
                method: 'GET',
                timeout: 3000
            });
            return response.ok;
        } catch (error) {
            console.warn('❌ 백엔드 서버 연결 실패:', error);
            return false;
        }
    }
    
    // WebSocket 연결 초기화 (데모 버전)
    initializeWebSocket() {
        try {
            // Socket.IO 클라이언트 동적 로드
            if (typeof io === 'undefined') {
                this.loadSocketIOClient();
                return;
            }
            
            this.socket = io(this.backendURL, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });
            
            this.setupSocketListeners();
            
        } catch (error) {
            console.error('❌ WebSocket 초기화 오류:', error);
            this.useBackendMode = false;
        }
    }
    
    // Socket.IO 클라이언트 동적 로드
    loadSocketIOClient() {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => {
            console.log('✅ Socket.IO 클라이언트 로드됨');
            this.initializeWebSocket();
        };
        script.onerror = () => {
            console.error('❌ Socket.IO 클라이언트 로드 실패');
            this.useBackendMode = false;
        };
        document.head.appendChild(script);
    }
    
    // 소켓 이벤트 리스너 설정
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Flask 서버에 연결됨');
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Flask 서버 연결 해제됨');
            showToast('서버 연결이 끊어졌습니다', 'warning');
        });
        
        this.socket.on('face_swap_start', (data) => {
            this.updateProgress(data.message, 10);
        });
        
        this.socket.on('face_swap_progress', (data) => {
            const progress = data.progress || this.getProgressByStatus(data.status);
            this.updateProgress(data.message, progress);
        });
        
        this.socket.on('face_swap_complete', (data) => {
            this.handleSwapComplete(data);
        });
        
        this.socket.on('face_swap_error', (data) => {
            this.handleSwapError(data.error);
        });
    }
    
    // 상태별 진행률 계산
    getProgressByStatus(status) {
        const progressMap = {
            'detecting_faces': 20,
            'detecting_customer_face': 30,
            'detecting_style_face': 50,
            'processing': 70,
            'waiting': 90
        };
        return progressMap[status] || 0;
    }
    
    // 진행상황 업데이트
    updateProgress(message, progress) {
        showToast(message, 'info');
        
        // 진행바가 있다면 업데이트
        const progressBar = document.getElementById('aiProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const progressText = document.getElementById('aiProgressText');
        if (progressText) {
            progressText.textContent = message;
        }
    }
    
    // Face Swap 완료 처리
    handleSwapComplete(data) {
        console.log('✅ Face Swap 완료:', data);
        showToast('AI 합성 완료!', 'success');
        showAIResult(data.result_url);
    }
    
    // Face Swap 오류 처리
    handleSwapError(error) {
        console.error('❌ Face Swap 오류:', error);
        showToast(`AI 처리 실패: ${error}`, 'error');
        
        // 처리 버튼 복구
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.textContent = 'AI 합성 시작';
        }
    }
    
    // ========== 토큰 관리 (기존 호환) ==========
    
    async getToken() {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        try {
            const response = await fetch(`${this.baseURL}/getToken`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: this.clientId,
                    clientSecret: this.clientSecret
                })
            });

            const data = await response.json();
            
            if (data.code === 1000) {
                this.token = data.token;
                this.tokenExpiry = Date.now() + (11 * 30 * 24 * 60 * 60 * 1000);
                console.log('✅ AKOOL 토큰 발급 성공');
                return this.token;
            } else {
                throw new Error(`토큰 발급 실패: ${data.msg || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('❌ AKOOL 토큰 발급 오류:', error);
            throw error;
        }
    }

    // ========== Face Swap 메인 함수 ==========
    
    async faceSwap(customerImageUrl, styleImageUrl) {
        // 토큰 시스템과 연동
        return await executeWithTokens('AI_FACE_ANALYSIS', async () => {
            
            if (this.useBackendMode && this.socket) {
                return await this.faceSwapBackend(customerImageUrl, styleImageUrl);
            } else {
                return await this.faceSwapDirect(customerImageUrl, styleImageUrl);
            }
        });
    }
    
    // 데모 버전: 백엔드를 통한 Face Swap
    async faceSwapBackend(customerImageUrl, styleImageUrl) {
        try {
            this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 세션 참여
            if (this.socket) {
                this.socket.emit('join_session', { session_id: this.currentSessionId });
            }
            
            // 백엔드에 Face Swap 요청
            const response = await fetch(`${this.backendURL}/api/face-swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_image_url: customerImageUrl,
                    style_image_url: styleImageUrl,
                    session_id: this.currentSessionId,
                    webhook_url: `${this.backendURL}/api/webhook`
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('🚀 백엔드 Face Swap 시작됨');
                // WebSocket을 통해 결과 대기 (Promise는 소켓 이벤트에서 resolve)
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('처리 시간이 초과되었습니다'));
                    }, 180000); // 3분 타임아웃
                    
                    // 완료 이벤트 대기
                    this.socket.once('face_swap_complete', (result) => {
                        clearTimeout(timeout);
                        resolve({
                            success: true,
                            imageUrl: result.result_url,
                            jobId: result.job_id
                        });
                    });
                    
                    // 오류 이벤트 대기
                    this.socket.once('face_swap_error', (error) => {
                        clearTimeout(timeout);
                        reject(new Error(error.error || '알 수 없는 오류'));
                    });
                });
            } else {
                throw new Error(data.error || '백엔드 요청 실패');
            }
            
        } catch (error) {
            console.error('❌ 백엔드 Face Swap 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 기존 버전: 직접 API 호출
    async faceSwapDirect(customerImageUrl, styleImageUrl) {
        try {
            showToast('얼굴 분석 중...', 'info');
            
            // 1. 고객 얼굴 탐지
            const customerFace = await this.detectFace(customerImageUrl, true);
            if (!customerFace.success) {
                throw new Error('고객 사진에서 얼굴을 찾을 수 없습니다');
            }

            showToast('헤어스타일 분석 중...', 'info');
            
            // 2. 스타일 이미지 얼굴 탐지
            const styleFace = await this.detectFace(styleImageUrl, true);
            if (!styleFace.success) {
                throw new Error('헤어스타일 이미지에서 얼굴을 찾을 수 없습니다');
            }

            showToast('AI 합성 처리 중...', 'info');
            
            // 3. Face Swap 실행
            const token = await this.getToken();
            
            const response = await fetch(`${this.baseURL}/faceswap/highquality/specifyimage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceImage: [{
                        path: customerImageUrl,
                        opts: customerFace.landmarks
                    }],
                    targetImage: [{
                        path: styleImageUrl,
                        opts: styleFace.landmarks
                    }],
                    face_enhance: 1, // 얼굴 향상 활성화 (데모 버전 핵심!)
                    modifyImage: styleImageUrl,
                    webhookUrl: "" // 직접 모드에서는 폴링 방식 사용
                })
            });

            const data = await response.json();
            
            if (data.code === 1000) {
                console.log('✅ Face Swap 요청 성공:', data.data);
                return await this.waitForResult(data.data._id, data.data.job_id);
            } else {
                throw new Error(`Face Swap 실패: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ Face Swap 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 얼굴 탐지 (기존 호환)
    async detectFace(imageUrl, isSingleFace = true) {
        try {
            const token = await this.getToken();
            
            const response = await fetch(this.detectURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    single_face: isSingleFace,
                    image_url: imageUrl
                })
            });

            const data = await response.json();
            
            if (data.error_code === 0) {
                return {
                    success: true,
                    landmarks: data.landmarks_str[0],
                    region: data.region[0]
                };
            } else {
                throw new Error(`얼굴 탐지 실패: ${data.error_msg}`);
            }
        } catch (error) {
            console.error('❌ 얼굴 탐지 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 결과 대기 (기존 폴링 방식)
    async waitForResult(resultId, jobId, maxAttempts = 30) {
        try {
            const token = await this.getToken();
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                showToast(`AI 처리 중... (${attempt}/${maxAttempts})`, 'info');
                
                const response = await fetch(`${this.baseURL}/faceswap/result/listbyids?_ids=${resultId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();
                
                if (data.code === 1000 && data.data.result.length > 0) {
                    const result = data.data.result[0];
                    
                    switch (result.faceswap_status) {
                        case 1:
                            showToast('대기열에서 처리 중...', 'info');
                            break;
                        case 2:
                            showToast('AI가 열심히 작업 중...', 'info');
                            break;
                        case 3:
                            showToast('AI 합성 완료!', 'success');
                            return {
                                success: true,
                                imageUrl: result.url,
                                jobId: jobId
                            };
                        case 4:
                            throw new Error('AI 처리 중 오류가 발생했습니다');
                        default:
                            showToast('처리 상태 확인 중...', 'info');
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
            
            throw new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } catch (error) {
            console.error('❌ 결과 확인 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 크레딧 정보 확인
    async getCreditInfo() {
        try {
            if (this.useBackendMode) {
                const response = await fetch(`${this.backendURL}/api/credit-info`);
                const data = await response.json();
                return data;
            } else {
                const token = await this.getToken();
                const response = await fetch(`${this.baseURL}/faceswap/quota/info`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                if (data.code === 1000) {
                    return { success: true, credit: data.data.credit };
                } else {
                    throw new Error('크레딧 정보 조회 실패');
                }
            }
        } catch (error) {
            console.error('❌ 크레딧 정보 조회 오류:', error);
            return { success: false, error: error.message };
        }
    }
}

// 전역 AKOOL 서비스 인스턴스 (기존 호환성 유지)
window.akoolService = new AkoolServiceUpgraded();

// ========== UI 컴포넌트 (기존 + 진행바 추가) ==========

// AI 체험하기 버튼 HTML (기존과 동일)
function createAIExperienceButton() {
    return `
        <button class="modal-btn btn-ai-experience" id="btnAIExperience">
            <span class="ai-icon">🤖</span>
            <span>AI 체험하기</span>
        </button>
    `;
}

// 고객 사진 업로드 모달 HTML (진행바 추가)
function createPhotoUploadModal() {
    return `
        <div id="photoUploadModal" class="style-modal">
            <div class="modal-content" style="max-width: 400px;">
                <button class="modal-close" onclick="closePhotoUploadModal()">×</button>
                
                <div style="padding: 30px; text-align: center;">
                    <h3 style="color: #FF1493; margin-bottom: 20px; font-size: 24px;">
                        🤖 AI 헤어스타일 체험
                    </h3>
                    
                    <p style="color: #999; margin-bottom: 25px; line-height: 1.5;">
                        고객님의 사진을 업로드하면<br>
                        AI가 선택한 헤어스타일을 합성해드립니다
                    </p>
                    
                    <!-- 진행바 (데모 버전 전용) -->
                    <div id="aiProgressContainer" style="display: none; margin-bottom: 20px;">
                        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                            <div id="aiProgressBar" style="height: 8px; background: linear-gradient(90deg, #FF1493, #FF69B4); width: 0%; transition: width 0.5s ease;"></div>
                        </div>
                        <div id="aiProgressText" style="margin-top: 10px; color: #FF1493; font-size: 14px;"></div>
                    </div>
                    
                    <div class="photo-upload-area" id="photoUploadArea">
                        <input type="file" id="customerPhotoInput" accept="image/*" style="display: none;">
                        <div class="upload-placeholder" onclick="document.getElementById('customerPhotoInput').click()">
                            <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.7;">📷</div>
                            <div style="font-size: 16px; color: #FF1493; font-weight: 600;">사진 선택하기</div>
                            <div style="font-size: 12px; color: #666; margin-top: 8px;">JPG, PNG 파일만 가능</div>
                        </div>
                        
                        <div class="photo-preview" id="photoPreview" style="display: none;">
                            <img id="previewImage" style="width: 100%; max-width: 200px; border-radius: 10px; margin-bottom: 15px;">
                            <div>
                                <button class="modal-btn btn-register" onclick="processAIFaceSwap()" id="processBtn">
                                    🎨 AI 합성 시작
                                </button>
                                <button class="modal-btn" onclick="resetPhotoUpload()" style="background: #666; margin-left: 10px;">
                                    다시 선택
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255,20,147,0.1); border-radius: 10px; font-size: 12px; color: #FF69B4;">
                        💡 <strong>안내:</strong> 업로드된 사진은 AI 처리 후 자동으로 삭제되며, 다른 용도로 사용되지 않습니다.
                    </div>
                </div>
            </div>
        </div>
    `;
}

// AI 결과 표시 모달 HTML (기존과 동일)
function createAIResultModal() {
    return `
        <div id="aiResultModal" class="style-modal">
            <div class="modal-content" style="max-width: 500px;">
                <button class="modal-close" onclick="closeAIResultModal()">×</button>
                
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #FF1493; margin-bottom: 20px; font-size: 24px;">
                        ✨ AI 헤어스타일 체험 결과
                    </h3>
                    
                    <div id="aiResultContainer">
                        <!-- AI 결과 이미지가 여기에 표시됩니다 -->
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button class="modal-btn btn-register" onclick="downloadAIResult()" id="downloadBtn">
                            💾 결과 저장
                        </button>
                        <button class="modal-btn" onclick="shareAIResult()" style="background: #4267B2; margin-left: 10px;">
                            📱 공유하기
                        </button>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <button class="modal-btn" onclick="closeAIResultModal(); openPhotoUploadModal();" style="background: #666;">
                            🔄 다른 사진으로 체험
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========== Face Swap 기능 함수들 (기존 호환) ==========

let currentStyleImage = null;
let currentStyleName = null;
let uploadedCustomerPhoto = null;

// AI 체험하기 버튼 클릭
function openAIExperience(styleImageUrl, styleName) {
    currentStyleImage = styleImageUrl;
    currentStyleName = styleName;
    
    if (!document.getElementById('photoUploadModal')) {
        document.body.insertAdjacentHTML('beforeend', createPhotoUploadModal());
        document.body.insertAdjacentHTML('beforeend', createAIResultModal());
        document.getElementById('customerPhotoInput').addEventListener('change', handlePhotoUpload);
    }
    
    openPhotoUploadModal();
}

function openPhotoUploadModal() {
    document.getElementById('photoUploadModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePhotoUploadModal() {
    document.getElementById('photoUploadModal').classList.remove('active');
    document.body.style.overflow = '';
    resetPhotoUpload();
    
    // 진행바 숨김
    const progressContainer = document.getElementById('aiProgressContainer');
    if (progressContainer) progressContainer.style.display = 'none';
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('파일 크기는 5MB 이하여야 합니다', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedCustomerPhoto = e.target.result;
        document.getElementById('previewImage').src = uploadedCustomerPhoto;
        document.querySelector('.upload-placeholder').style.display = 'none';
        document.getElementById('photoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function resetPhotoUpload() {
    uploadedCustomerPhoto = null;
    document.getElementById('customerPhotoInput').value = '';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('photoPreview').style.display = 'none';
}

// AI Face Swap 처리 (토큰 시스템 통합)
async function processAIFaceSwap() {
    if (!uploadedCustomerPhoto || !currentStyleImage) {
        showToast('사진을 먼저 선택해주세요', 'error');
        return;
    }
    
    const processBtn = document.getElementById('processBtn');
    const progressContainer = document.getElementById('aiProgressContainer');
    
    processBtn.disabled = true;
    processBtn.textContent = 'AI 처리 중...';
    
    // 데모 버전에서는 진행바 표시
    if (window.akoolService.useBackendMode) {
        progressContainer.style.display = 'block';
    }
    
    try {
        const customerImageUrl = await uploadImageToStorage(uploadedCustomerPhoto);
        const result = await window.akoolService.faceSwap(customerImageUrl, currentStyleImage);
        
        if (result.success) {
            showAIResult(result.imageUrl);
        } else {
            showToast(`AI 처리 실패: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast('AI 처리 중 오류가 발생했습니다', 'error');
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = '🎨 AI 합성 시작';
        progressContainer.style.display = 'none';
    }
}

// 임시 이미지 업로드 (실제로는 Firebase Storage 등 사용)
async function uploadImageToStorage(dataUrl) {
    // TODO: 실제 구현에서는 Firebase Storage나 다른 클라우드 스토리지 사용
    return dataUrl;
}

// AI 결과 표시
function showAIResult(resultImageUrl) {
    closePhotoUploadModal();
    
    const resultContainer = document.getElementById('aiResultContainer');
    resultContainer.innerHTML = `
        <div style="position: relative;">
            <img src="${resultImageUrl}" alt="AI 헤어스타일 체험 결과" 
                 style="width: 100%; max-width: 400px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,20,147,0.9); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                ✨ AI Generated
            </div>
        </div>
        <div style="margin-top: 15px; color: #666; font-size: 14px;">
            <strong style="color: #FF1493;">${currentStyleName}</strong> 스타일로 변신한 모습입니다!
        </div>
    `;
    
    document.getElementById('aiResultModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAIResultModal() {
    document.getElementById('aiResultModal').classList.remove('active');
    document.body.style.overflow = '';
}

function downloadAIResult() {
    const img = document.querySelector('#aiResultContainer img');
    if (img) {
        const link = document.createElement('a');
        link.download = `hairgator_ai_style_${Date.now()}.jpg`;
        link.href = img.src;
        link.click();
        showToast('이미지가 저장되었습니다!', 'success');
    }
}

function shareAIResult() {
    const img = document.querySelector('#aiResultContainer img');
    if (img && navigator.share) {
        navigator.share({
            title: 'HAIRGATOR AI 헤어스타일 체험',
            text: `${currentStyleName} 스타일로 변신해봤어요!`,
            url: img.src
        }).then(() => {
            showToast('공유 완료!', 'success');
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(img.src).then(() => {
            showToast('이미지 링크가 복사되었습니다!', 'success');
        });
    }
}

console.log('✅ HAIRGATOR x AKOOL 데모 버전 통합 완료');
