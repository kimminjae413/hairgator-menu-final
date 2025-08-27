// ========== HAIRGATOR x AKOOL Firebase Storage URL 최종 버전 ==========

class AkoolFirebaseService {
    constructor() {
        // AKOOL Direct API 설정
        this.baseURL = 'https://openapi.akool.com/api/open/v3';
        this.detectURL = 'https://sg3.akool.com/detect';
        this.clientId = 'kdwRwzqnGf4zfAFvWCjFKQ==';
        this.clientSecret = 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g';
        this.token = null;
        this.tokenExpiry = null;
        
        // Firebase Storage 설정
        this.storage = window.storage || firebase.storage();
        
        console.log('Firebase AKOOL 서비스 초기화 완료');
    }
    
    // ========== Firebase Storage 이미지 업로드 ==========
    
    async uploadImageToFirebase(file, folder = 'temp') {
        try {
            const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
            const storageRef = this.storage.ref(fileName);
            
            // 파일 업로드
            const snapshot = await storageRef.put(file);
            
            // 다운로드 URL 획득
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('Firebase Storage 업로드 성공:', downloadURL);
            
            // 임시 파일이므로 24시간 후 자동 삭제 설정
            this.scheduleImageDeletion(fileName, 24 * 60 * 60 * 1000); // 24시간
            
            return {
                success: true,
                url: downloadURL,
                fileName: fileName
            };
            
        } catch (error) {
            console.error('Firebase Storage 업로드 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Base64를 Blob으로 변환
    base64ToBlob(base64Data, contentType = 'image/jpeg') {
        const byteCharacters = atob(base64Data.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: contentType });
    }
    
    // 이미지 자동 삭제 스케줄링
    scheduleImageDeletion(fileName, delayMs) {
        setTimeout(async () => {
            try {
                await this.storage.ref(fileName).delete();
                console.log('임시 이미지 자동 삭제됨:', fileName);
            } catch (error) {
                console.warn('이미지 삭제 실패 (이미 삭제됨):', fileName);
            }
        }, delayMs);
    }
    
    // ========== AKOOL 토큰 관리 ==========
    
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
                console.log('AKOOL 토큰 발급 성공');
                return this.token;
            } else {
                throw new Error(`토큰 발급 실패: ${data.msg || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('AKOOL 토큰 발급 오류:', error);
            throw error;
        }
    }

    // ========== 얼굴 탐지 ==========
    
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
                console.log('얼굴 탐지 성공');
                console.log('전체 응답:', JSON.stringify(data, null, 2));
                
                // landmarks 배열에서 첫 4개 좌표를 콜론으로 구분한 문자열로 변환
                let landmarksStr = '';
                if (data.landmarks && data.landmarks[0] && Array.isArray(data.landmarks[0])) {
                    const coords = data.landmarks[0].slice(0, 4); // 첫 4개 좌표만
                    landmarksStr = coords.map(coord => `${coord[0]},${coord[1]}`).join(':');
                    console.log('변환된 landmarks:', landmarksStr);
                } else if (data.landmarks_str && data.landmarks_str[0]) {
                    landmarksStr = data.landmarks_str[0];
                    console.log('landmarks_str 사용:', landmarksStr);
                }
                
                return {
                    success: true,
                    landmarks: landmarksStr,
                    region: data.region[0]
                };
            } else {
                throw new Error(`얼굴 탐지 실패: ${data.error_msg}`);
            }
        } catch (error) {
            console.error('얼굴 탐지 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== Face Swap 메인 함수 ==========
    
    async faceSwap(customerImageFile, styleImageUrl) {
        try {
            showToast('이미지 업로드 중...', 'info');
            
            // 1. 고객 이미지를 Firebase Storage에 업로드
            let customerBlob;
            if (typeof customerImageFile === 'string' && customerImageFile.startsWith('data:')) {
                // Base64 데이터인 경우
                customerBlob = this.base64ToBlob(customerImageFile);
            } else {
                // File 객체인 경우
                customerBlob = customerImageFile;
            }
            
            const uploadResult = await this.uploadImageToFirebase(customerBlob, 'customer-temp');
            if (!uploadResult.success) {
                throw new Error('이미지 업로드 실패');
            }
            
            const customerImageUrl = uploadResult.url;
            
            showToast('얼굴 분석 중...', 'info');
            
            // 2. 고객 얼굴 탐지
            const customerFace = await this.detectFace(customerImageUrl, true);
            if (!customerFace.success) {
                throw new Error('고객 사진에서 얼굴을 찾을 수 없습니다');
            }

            showToast('헤어스타일 분석 중...', 'info');
            
            // 3. 스타일 이미지 얼굴 탐지
            const styleFace = await this.detectFace(styleImageUrl, true);
            if (!styleFace.success) {
                throw new Error('헤어스타일 이미지에서 얼굴을 찾을 수 없습니다');
            }

            showToast('AI 합성 처리 중...', 'info');
            
            // 4. Face Swap 실행 - 여러 형식으로 시도
            const token = await this.getToken();
            
            // AKOOL API는 opts를 문자열로 요구함
            let customerOpts = String(customerFace.landmarks);
            let styleOpts = String(styleFace.landmarks);
            
            console.log('Face Swap 요청 데이터:', {
                customerImageUrl,
                styleImageUrl,
                customerOptsType: typeof customerOpts,
                styleOptsType: typeof styleOpts
            });
            
            const response = await fetch(`${this.baseURL}/faceswap/highquality/specifyimage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceImage: [{
                        path: customerImageUrl,
                        opts: customerOpts
                    }],
                    targetImage: [{
                        path: styleImageUrl,
                        opts: styleOpts
                    }],
                    face_enhance: 1, // 얼굴 향상 활성화
                    modifyImage: styleImageUrl,
                    webhookUrl: "" // 폴링 방식 사용
                })
            });

            const data = await response.json();
            console.log('Face Swap API 응답:', data);
            
            if (data.code === 1000) {
                console.log('Face Swap 요청 성공:', data.data);
                return await this.waitForResult(data.data._id, data.data.job_id);
            } else {
                throw new Error(`Face Swap 실패: ${data.msg || data.message || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('Face Swap 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== 결과 대기 (폴링 방식) ==========
    
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
            console.error('결과 확인 오류:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ========== 크레딧 정보 확인 ==========
    
    async getCreditInfo() {
        try {
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
        } catch (error) {
            console.error('크레딧 정보 조회 오류:', error);
            return { success: false, error: error.message };
        }
    }
}

// 전역 AKOOL 서비스 인스턴스
window.akoolService = new AkoolFirebaseService();

// ========== Face Swap UI 컴포넌트 ==========

// AI 결과 표시 모달 HTML
function createAIResultModal() {
    return `
        <div id="aiResultModal" class="style-modal">
            <div class="modal-content" style="max-width: 500px;">
                <button class="modal-close" onclick="closeAIResultModal()">×</button>
                
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #FF1493; margin-bottom: 20px; font-size: 24px;">
                        AI 헤어스타일 체험 결과
                    </h3>
                    
                    <div id="aiResultContainer">
                        <!-- AI 결과 이미지가 여기에 표시됩니다 -->
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button class="modal-btn btn-register" onclick="downloadAIResult()">
                            결과 저장
                        </button>
                        <button class="modal-btn" onclick="shareAIResult()" style="background: #4267B2; margin-left: 10px;">
                            공유하기
                        </button>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <button class="modal-btn" onclick="tryAnotherPhoto()" style="background: #666;">
                            다른 사진으로 체험
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========== Face Swap 기능 함수들 ==========

// AI 체험 시작
function startAIExperience() {
    if (typeof window.currentDesigner === 'undefined' || !window.currentDesigner) {
        showToast('로그인이 필요합니다', 'error');
        return;
    }

    if (window.currentDesigner.tokens < 5) {
        showToast('토큰이 부족합니다. 충전 후 이용해주세요.', 'error');
        return;
    }

    if (typeof window.currentStyleData === 'undefined' || !window.currentStyleData) {
        showToast('스타일 정보를 불러올 수 없습니다', 'error');
        return;
    }

    // AI 체험 모달이 없다면 생성
    if (!document.getElementById('aiResultModal')) {
        document.body.insertAdjacentHTML('beforeend', createAIResultModal());
    }

    // AI 체험 모달 열기 (index.html의 기존 함수 사용)
    const aiExperienceModal = document.getElementById('aiExperienceModal');
    if (aiExperienceModal) {
        aiExperienceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // 스타일 이미지 미리 설정
        const stylePhoto = document.getElementById('stylePhoto');
        if (stylePhoto) {
            stylePhoto.src = window.currentStyleData.imageUrl || '';
        }
    }
    
    console.log('AI 체험 시작:', window.currentStyleData.name);
}

// AI 처리 함수 (index.html의 processAI 함수와 연동)
async function processAI() {
    if (typeof window.currentDesigner === 'undefined' || !window.currentDesigner || window.currentDesigner.tokens < 5) {
        showToast('토큰이 부족합니다', 'error');
        return;
    }

    const aiFileInput = document.getElementById('aiFileInput');
    if (!aiFileInput || !aiFileInput.files[0]) {
        showToast('사진을 먼저 업로드해주세요', 'error');
        return;
    }

    if (!window.currentStyleData || !window.currentStyleData.imageUrl) {
        showToast('스타일 정보가 없습니다', 'error');
        return;
    }

    const processAIBtn = document.getElementById('processAIBtn');
    const aiProcessing = document.getElementById('aiProcessing');
    
    try {
        // UI 상태 변경
        if (processAIBtn) processAIBtn.disabled = true;
        if (aiProcessing) aiProcessing.style.display = 'block';
        
        // 토큰 차감 및 Face Swap 처리
        const result = await executeWithTokens('AI_FACE_ANALYSIS', async () => {
            const userImageFile = aiFileInput.files[0];
            const styleImageUrl = window.currentStyleData.imageUrl;
            
            console.log('AKOOL Face Swap 시작:', {
                styleName: window.currentStyleData.name,
                styleUrl: styleImageUrl
            });

            return await window.akoolService.faceSwap(userImageFile, styleImageUrl);
        });

        if (result && result.success) {
            showToast('AI 처리가 완료되었습니다!', 'success');
            showAIResult(result.imageUrl);
            
            // 토큰 잔액 업데이트
            updateUserInfo();
            
            // AI 체험 모달 닫기
            closeAIExperience();
        } else {
            throw new Error(result ? result.error : 'Face Swap 처리 실패');
        }

    } catch (error) {
        console.error('AI 처리 오류:', error);
        showToast(`AI 처리 실패: ${error.message}`, 'error');
        
    } finally {
        // UI 복구
        if (aiProcessing) aiProcessing.style.display = 'none';
        if (processAIBtn) processAIBtn.disabled = false;
    }
}

// AI 결과 표시
function showAIResult(resultImageUrl) {
    const aiResultModal = document.getElementById('aiResultModal');
    const aiResultContainer = document.getElementById('aiResultContainer');
    
    if (!aiResultModal || !aiResultContainer) {
        console.error('AI 결과 모달을 찾을 수 없습니다');
        return;
    }
    
    aiResultContainer.innerHTML = `
        <div style="position: relative;">
            <img src="${resultImageUrl}" alt="AI 헤어스타일 체험 결과" 
                 style="width: 100%; max-width: 400px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"
                 class="ai-result-image">
            <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,20,147,0.9); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600;">
                AI Generated
            </div>
        </div>
        <div style="margin-top: 15px; color: #666; font-size: 14px;">
            <strong style="color: #FF1493;">${window.currentStyleData.name}</strong> 스타일로 변신한 모습입니다!
        </div>
    `;
    
    aiResultModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log('AI 결과 표시 완료');
}

// AI 결과 모달 닫기
function closeAIResultModal() {
    const aiResultModal = document.getElementById('aiResultModal');
    if (aiResultModal) {
        aiResultModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 결과 다운로드
function downloadAIResult() {
    const img = document.querySelector('.ai-result-image');
    if (!img) {
        showToast('다운로드할 이미지가 없습니다', 'error');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.download = `hairgator_ai_${window.currentStyleData.name}_${Date.now()}.jpg`;
        link.href = img.src;
        link.click();
        showToast('이미지가 저장되었습니다!', 'success');
    } catch (error) {
        console.error('다운로드 오류:', error);
        showToast('다운로드 실패', 'error');
    }
}

// 결과 공유
function shareAIResult() {
    const img = document.querySelector('.ai-result-image');
    if (!img) {
        showToast('공유할 이미지가 없습니다', 'error');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'HAIRGATOR AI 헤어스타일 체험',
            text: `${window.currentStyleData.name} 스타일로 변신해봤어요!`,
            url: window.location.href
        }).then(() => {
            showToast('공유 완료!', 'success');
        }).catch((error) => {
            console.error('공유 오류:', error);
            copyImageLink(img.src);
        });
    } else {
        copyImageLink(img.src);
    }
}

// 이미지 링크 복사
function copyImageLink(imageUrl) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(imageUrl).then(() => {
            showToast('이미지 링크가 복사되었습니다!', 'success');
        }).catch(() => {
            showToast('링크 복사 실패', 'error');
        });
    } else {
        showToast('공유 기능을 지원하지 않는 브라우저입니다', 'error');
    }
}

// 다른 사진으로 체험
function tryAnotherPhoto() {
    closeAIResultModal();
    
    // AI 체험 모달 다시 열기
    const aiExperienceModal = document.getElementById('aiExperienceModal');
    if (aiExperienceModal) {
        aiExperienceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// AI 체험 모달 닫기 (index.html 함수와 연동)
function closeAIExperience() {
    const aiExperienceModal = document.getElementById('aiExperienceModal');
    if (aiExperienceModal) {
        aiExperienceModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // 파일 입력 초기화
        const aiFileInput = document.getElementById('aiFileInput');
        if (aiFileInput) aiFileInput.value = '';
        
        const aiPreviewArea = document.getElementById('aiPreviewArea');
        if (aiPreviewArea) aiPreviewArea.style.display = 'none';
        
        const processAIBtn = document.getElementById('processAIBtn');
        if (processAIBtn) processAIBtn.disabled = true;
    }
}

console.log('Firebase Storage AKOOL 서비스 로드 완료');
