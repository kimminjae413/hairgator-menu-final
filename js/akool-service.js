// ========== AKOOL Face Swap API 서비스 ==========

class AkoolService {
    constructor() {
        this.baseURL = 'https://openapi.akool.com/api/open/v3';
        this.detectURL = 'https://sg3.akool.com/detect';
        this.clientId = 'kdwRwzqnGf4zfAFvWCjFKQ==';
        this.clientSecret = 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g';
        this.token = null;
        this.tokenExpiry = null;
    }

    // 토큰 발급 및 캐싱
    async getToken() {
        // 토큰이 유효하면 재사용
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        try {
            const response = await fetch(`${this.baseURL}/getToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    clientSecret: this.clientSecret
                })
            });

            const data = await response.json();
            
            if (data.code === 1000) {
                this.token = data.token;
                // 토큰을 1년간 유효하다고 가정하고 11개월로 설정
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

    // 얼굴 탐지 API
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
                console.log('✅ 얼굴 탐지 성공:', data.landmarks_str);
                return {
                    success: true,
                    landmarks: data.landmarks_str[0], // 첫 번째 얼굴의 landmarks
                    region: data.region[0] // 얼굴 영역
                };
            } else {
                throw new Error(`얼굴 탐지 실패: ${data.error_msg}`);
            }
        } catch (error) {
            console.error('❌ 얼굴 탐지 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Face Swap API (이미지)
    async faceSwap(customerImageUrl, styleImageUrl) {
        try {
            showToast('🔍 얼굴 분석 중...', 'info');
            
            // 1. 고객 얼굴 탐지
            const customerFace = await this.detectFace(customerImageUrl, true);
            if (!customerFace.success) {
                throw new Error('고객 사진에서 얼굴을 찾을 수 없습니다');
            }

            showToast('🎨 헤어스타일 분석 중...', 'info');
            
            // 2. 스타일 이미지 얼굴 탐지
            const styleFace = await this.detectFace(styleImageUrl, true);
            if (!styleFace.success) {
                throw new Error('헤어스타일 이미지에서 얼굴을 찾을 수 없습니다');
            }

            showToast('🔄 AI 합성 처리 중...', 'info');
            
            // 3. Face Swap 실행
            const token = await this.getToken();
            
            const response = await fetch(`${this.baseURL}/faceswap/highquality/specifyimage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceImage: [{ // 고객 얼굴 (바꿀 얼굴)
                        path: customerImageUrl,
                        opts: customerFace.landmarks
                    }],
                    targetImage: [{ // 스타일 이미지의 얼굴 (기준이 되는 얼굴)
                        path: styleImageUrl,
                        opts: styleFace.landmarks
                    }],
                    face_enhance: 1, // 얼굴 향상 활성화
                    modifyImage: styleImageUrl, // 수정할 기본 이미지
                    webhookUrl: "" // 콜백 URL (선택사항)
                })
            });

            const data = await response.json();
            
            if (data.code === 1000) {
                console.log('✅ Face Swap 요청 성공:', data.data);
                
                // 결과 확인 (최대 3분 대기)
                return await this.waitForResult(data.data._id, data.data.job_id);
            } else {
                throw new Error(`Face Swap 실패: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ Face Swap 오류:', error);
            showToast(`❌ AI 합성 실패: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 결과 대기 및 확인
    async waitForResult(resultId, jobId, maxAttempts = 30) {
        try {
            const token = await this.getToken();
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                showToast(`🔄 AI 처리 중... (${attempt}/${maxAttempts})`, 'info');
                
                const response = await fetch(`${this.baseURL}/faceswap/result/listbyids?_ids=${resultId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();
                
                if (data.code === 1000 && data.data.result.length > 0) {
                    const result = data.data.result[0];
                    
                    switch (result.faceswap_status) {
                        case 1: // In Queue
                            showToast('⏳ 대기열에서 처리 중...', 'info');
                            break;
                        case 2: // Processing
                            showToast('🎨 AI가 열심히 작업 중...', 'info');
                            break;
                        case 3: // Success
                            showToast('✅ AI 합성 완료!', 'success');
                            return {
                                success: true,
                                imageUrl: result.url,
                                jobId: jobId
                            };
                        case 4: // Failed
                            throw new Error('AI 처리 중 오류가 발생했습니다');
                        default:
                            showToast('🔄 처리 상태 확인 중...', 'info');
                    }
                }
                
                // 6초 대기 후 재시도
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
            
            throw new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } catch (error) {
            console.error('❌ 결과 확인 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 크레딧 정보 확인
    async getCreditInfo() {
        try {
            const token = await this.getToken();
            
            const response = await fetch(`${this.baseURL}/faceswap/quota/info`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            if (data.code === 1000) {
                return {
                    success: true,
                    credit: data.data.credit
                };
            } else {
                throw new Error('크레딧 정보 조회 실패');
            }
        } catch (error) {
            console.error('❌ 크레딧 정보 조회 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 전역 AKOOL 서비스 인스턴스
window.akoolService = new AkoolService();

// ========== Face Swap UI 컴포넌트 ==========

// AI 체험하기 버튼 HTML
function createAIExperienceButton() {
    return `
        <button class="modal-btn btn-ai-experience" id="btnAIExperience">
            <span class="ai-icon">🤖</span>
            <span>AI 체험하기</span>
        </button>
    `;
}

// 고객 사진 업로드 모달 HTML
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

// AI 결과 표시 모달 HTML
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

// ========== Face Swap 기능 함수들 ==========

let currentStyleImage = null;
let currentStyleName = null;
let uploadedCustomerPhoto = null;

// AI 체험하기 버튼 클릭
function openAIExperience(styleImageUrl, styleName) {
    currentStyleImage = styleImageUrl;
    currentStyleName = styleName;
    
    // 모달 HTML이 없으면 생성
    if (!document.getElementById('photoUploadModal')) {
        document.body.insertAdjacentHTML('beforeend', createPhotoUploadModal());
        document.body.insertAdjacentHTML('beforeend', createAIResultModal());
        
        // 파일 업로드 이벤트 리스너
        document.getElementById('customerPhotoInput').addEventListener('change', handlePhotoUpload);
    }
    
    openPhotoUploadModal();
}

// 사진 업로드 모달 열기
function openPhotoUploadModal() {
    document.getElementById('photoUploadModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 사진 업로드 모달 닫기
function closePhotoUploadModal() {
    document.getElementById('photoUploadModal').classList.remove('active');
    document.body.style.overflow = '';
    resetPhotoUpload();
}

// 사진 업로드 처리
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        showToast('❌ 파일 크기는 5MB 이하여야 합니다', 'error');
        return;
    }
    
    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
        showToast('❌ 이미지 파일만 업로드 가능합니다', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedCustomerPhoto = e.target.result;
        
        // 미리보기 표시
        document.getElementById('previewImage').src = uploadedCustomerPhoto;
        document.querySelector('.upload-placeholder').style.display = 'none';
        document.getElementById('photoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 사진 업로드 리셋
function resetPhotoUpload() {
    uploadedCustomerPhoto = null;
    document.getElementById('customerPhotoInput').value = '';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('photoPreview').style.display = 'none';
}

// AI Face Swap 처리
async function processAIFaceSwap() {
    if (!uploadedCustomerPhoto || !currentStyleImage) {
        showToast('❌ 사진을 먼저 선택해주세요', 'error');
        return;
    }
    
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;
    processBtn.textContent = '🎨 AI 처리 중...';
    
    try {
        // 고객 사진을 서버에 업로드 (실제 구현에서는 Firebase Storage 등 사용)
        const customerImageUrl = await uploadImageToStorage(uploadedCustomerPhoto);
        
        // AKOOL Face Swap 실행
        const result = await window.akoolService.faceSwap(customerImageUrl, currentStyleImage);
        
        if (result.success) {
            // 결과 표시
            showAIResult(result.imageUrl);
        } else {
            showToast(`❌ AI 처리 실패: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast('❌ AI 처리 중 오류가 발생했습니다', 'error');
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = '🎨 AI 합성 시작';
    }
}

// 임시 이미지 업로드 함수 (실제로는 Firebase Storage 등을 사용해야 함)
async function uploadImageToStorage(dataUrl) {
    // 실제 구현에서는 Firebase Storage나 다른 클라우드 스토리지 사용
    // 현재는 데모용으로 데이터 URL 반환
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

// AI 결과 모달 닫기
function closeAIResultModal() {
    document.getElementById('aiResultModal').classList.remove('active');
    document.body.style.overflow = '';
}

// 결과 다운로드
function downloadAIResult() {
    const img = document.querySelector('#aiResultContainer img');
    if (img) {
        const link = document.createElement('a');
        link.download = `hairgator_ai_style_${Date.now()}.jpg`;
        link.href = img.src;
        link.click();
        
        showToast('💾 이미지가 저장되었습니다!', 'success');
    }
}

// 결과 공유
function shareAIResult() {
    const img = document.querySelector('#aiResultContainer img');
    if (img && navigator.share) {
        navigator.share({
            title: 'HAIRGATOR AI 헤어스타일 체험',
            text: `${currentStyleName} 스타일로 변신해봤어요!`,
            url: img.src
        }).then(() => {
            showToast('📱 공유 완료!', 'success');
        }).catch(console.error);
    } else {
        // Web Share API 미지원 시 클립보드 복사
        navigator.clipboard.writeText(img.src).then(() => {
            showToast('📋 이미지 링크가 복사되었습니다!', 'success');
        });
    }
}
