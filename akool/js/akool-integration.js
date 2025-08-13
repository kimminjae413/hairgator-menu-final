// akool/js/akool-integration.js
// AKOOL 완전 통합 최종 버전 - 올바른 API 워크플로우 + 완전한 UI Integration

document.addEventListener('DOMContentLoaded', function() {
  let currentStyleImage = null;
  let currentStyleName = null;
  let faceSwapInProgress = false;

  console.log('🚀 AKOOL Face Swap 완전 통합 최종 버전 시작');

  // ==========================================
  // 1. AKOOL API 클래스 (올바른 워크플로우 적용) ✅
  // ==========================================
  
  class AkoolAPI {
    constructor() {
      this.token = null;
      this.tokenExpiration = null;
      this.baseURL = '/.netlify/functions';
      this.akoolBaseUrl = 'https://openapi.akool.com/api/open/v3';
      this.detectUrl = 'https://sg3.akool.com/detect';
    }

    // ⭐ 1. 토큰 발급 ✅
    async getToken() {
      // 토큰이 유효한지 확인 (만료 1분 전에 갱신)
      if (this.token && this.tokenExpiration && Date.now() < this.tokenExpiration - 60000) {
        return { success: true, token: this.token };
      }

      try {
        console.log('🔑 AKOOL 토큰 발급 중...');

        const response = await fetch(`${this.baseURL}/akool-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success && data.token) {
          this.token = data.token;
          this.tokenExpiration = Date.now() + (24 * 60 * 60 * 1000);
          console.log('✅ 토큰 발급 성공');
          return { success: true, token: this.token };
        } else {
          throw new Error(data.error || '토큰 발급 실패');
        }
      } catch (error) {
        console.error('❌ 토큰 발급 오류:', error);
        throw error;
      }
    }

    // ⭐ 2. 이미지 임시 업로드 (새로 추가) ✅
    async uploadTempImage(imageData, filename = null) {
      try {
        if (!filename) {
          filename = `temp/faceswap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        }

        // Base64를 Blob으로 변환
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Firebase Storage에 업로드
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(filename);
        
        console.log('📤 Firebase에 이미지 업로드:', filename);
        const snapshot = await fileRef.put(blob);
        
        // 공개 URL 반환
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log('✅ 업로드 완료:', downloadURL);
        
        return downloadURL;
      } catch (error) {
        console.error('❌ 업로드 실패:', error);
        throw new Error('이미지 업로드 실패: ' + error.message);
      }
    }

    // ⭐ 3. 얼굴 감지 API (새로 추가) ✅
    async detectFace(imageUrl, type = 'user') {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }

        console.log(`🔍 ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 중...`);

        // AKOOL detect API 직접 호출
        const response = await fetch(this.detectUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            single_face: true,
            image_url: imageUrl
          })
        });

        const data = await response.json();
        console.log('Face detection response:', data);

        if (data.code === 1000 && data.data && data.data.length > 0) {
          const faceData = data.data[0];
          console.log(`✅ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 성공`);
          
          return { 
            success: true, 
            cropUrl: faceData.crop_image_url,
            landmarks: faceData.landmarks_str,
            boundingBox: faceData.bounding_box
          };
        } else {
          console.error(`❌ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 실패:`, data);
          return { 
            success: false, 
            error: data.msg || '얼굴을 감지할 수 없습니다',
            message: '사진에서 명확한 얼굴을 찾을 수 없습니다. 정면을 보고 있는 선명한 사진을 사용해주세요.'
          };
        }

      } catch (error) {
        console.error('❌ 얼굴 감지 네트워크 오류:', error);
        return { success: false, error: '네트워크 오류가 발생했습니다' };
      }
    }

    // ⭐ 4. Face Swap API (파라미터 순서 수정) ✅
    async createFaceSwap(userFaceData, styleFaceData) {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }

        console.log('🔄 Face Swap 요청 생성 중...');

        // ⭐ 파라미터 순서 수정: sourceImage = 사용자 얼굴, targetImage = 헤어스타일
        const payload = {
          sourceImage: [{ // 바꿀 대상 (사용자 얼굴)
            path: userFaceData.cropUrl,
            opts: userFaceData.landmarks
          }],
          targetImage: [{ // 원본 이미지 (헤어스타일)
            path: styleFaceData.cropUrl,
            opts: styleFaceData.landmarks
          }],
          face_enhance: 1
        };

        console.log('⭐ 올바른 Face swap payload:', JSON.stringify(payload, null, 2));

        // AKOOL Face Swap API 직접 호출
        const response = await fetch(`${this.akoolBaseUrl}/faceswap/highquality/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Face swap creation response:', data);

        if (data.code === 1000 && data._id) {
          console.log('✅ Face Swap 작업 생성 성공');
          return {
            success: true,
            taskId: data._id,
            message: 'Face swap 작업이 생성되었습니다'
          };
        } else {
          console.error('❌ Face Swap 작업 생성 실패:', data);
          return { 
            success: false, 
            error: data.msg || 'Face Swap 작업 생성에 실패했습니다',
            code: data.code
          };
        }

      } catch (error) {
        console.error('❌ Face Swap 생성 네트워크 오류:', error);
        return { success: false, error: '네트워크 오류가 발생했습니다' };
      }
    }

    // ⭐ 5. 상태 확인 API ✅
    async checkFaceSwapStatus(taskId) {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }

        const response = await fetch(`${this.akoolBaseUrl}/faceswap/highquality/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('Status check response:', data);

        if (response.ok) {
          return {
            success: true,
            status: data.status,
            progress: data.progress || 0,
            resultUrl: data.result_url,
            isComplete: data.status === 'completed' || data.status === 'failed',
            message: data.message || this.getStatusMessage(data.status)
          };
        } else {
          return { 
            success: false, 
            error: data.msg || '상태 확인에 실패했습니다' 
          };
        }

      } catch (error) {
        console.error('❌ 상태 확인 네트워크 오류:', error);
        return { success: false, error: '네트워크 오류가 발생했습니다' };
      }
    }

    getStatusMessage(status) {
      const statusMessages = {
        'pending': '대기 중...',
        'processing': '처리 중...',
        'completed': '완료됨',
        'failed': '실패함'
      };
      return statusMessages[status] || status;
    }

    // 결과 대기 - 폴링 방식
    async waitForResult(taskId, progressCallback, maxWaitTime = 180000) {
      const startTime = Date.now();
      const pollInterval = 3000;
      let lastProgress = 60;

      return new Promise((resolve) => {
        const checkResult = async () => {
          const elapsed = Date.now() - startTime;

          if (elapsed > maxWaitTime) {
            console.log('⏰ 처리 시간 초과');
            resolve({ 
              success: false, 
              error: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' 
            });
            return;
          }

          const status = await this.checkFaceSwapStatus(taskId);

          if (!status.success) {
            resolve(status);
            return;
          }

          // 진행률 업데이트
          if (progressCallback) {
            const currentProgress = Math.max(lastProgress, status.progress || 60);
            lastProgress = currentProgress;
            progressCallback(currentProgress, status.message);
          }

          console.log(`📊 처리 상태: ${status.message} (${status.progress}%)`);

          if (status.isComplete) {
            if (status.status === 'completed' && status.resultUrl) {
              console.log('🎉 Face Swap 완료!');
              resolve({
                success: true,
                resultUrl: status.resultUrl,
                message: '✨ 헤어스타일 적용이 완료되었습니다!'
              });
            } else {
              console.log('💥 Face Swap 실패');
              resolve({
                success: false,
                error: '처리 중 오류가 발생했습니다',
                message: status.message || '이미지 처리에 실패했습니다'
              });
            }
          } else {
            // 계속 상태 확인
            setTimeout(checkResult, pollInterval);
          }
        };

        checkResult();
      });
    }

    // ⭐ 완전한 올바른 워크플로우 ✅
    async processFaceSwap(userFile, styleImageUrl, progressCallback) {
      try {
        console.log('🤖 올바른 AKOOL Face Swap 워크플로우 시작');
        
        // ⭐ 1. 토큰 발급 ✅
        progressCallback(5, 'AKOOL 인증 중...');
        const token = await this.getToken();

        // ⭐ 2. 이미지 임시 업로드 ✅
        progressCallback(10, '이미지 업로드 중...');
        const userImageBase64 = await this.fileToBase64(userFile);
        const userImageUrl = await this.uploadTempImage(userImageBase64, `temp/user_${Date.now()}.jpg`);
        
        // 헤어스타일 이미지도 Firebase로 업로드
        let styleImageUrlFinal = styleImageUrl;
        if (!styleImageUrl.includes('firebasestorage.googleapis.com')) {
          progressCallback(15, '헤어스타일 이미지 업로드 중...');
          
          const styleResponse = await fetch(styleImageUrl);
          const styleBlob = await styleResponse.blob();
          const styleCanvas = document.createElement('canvas');
          const styleCtx = styleCanvas.getContext('2d');
          const styleImg = new Image();
          
          await new Promise((resolve) => {
            styleImg.onload = () => {
              styleCanvas.width = styleImg.width;
              styleCanvas.height = styleImg.height;
              styleCtx.drawImage(styleImg, 0, 0);
              resolve();
            };
            styleImg.src = URL.createObjectURL(styleBlob);
          });
          
          const styleBase64 = styleCanvas.toDataURL('image/jpeg', 0.9);
          styleImageUrlFinal = await this.uploadTempImage(styleBase64, `temp/style_${Date.now()}.jpg`);
        }

        // ⭐ 3. 얼굴 감지 API ✅
        progressCallback(25, '사용자 얼굴 분석 중...');
        const userDetectResult = await this.detectFace(userImageUrl, 'user');
        if (!userDetectResult.success) {
          throw new Error('사용자 얼굴 감지 실패: ' + userDetectResult.message);
        }

        progressCallback(40, '헤어스타일 분석 중...');
        const hairstyleDetectResult = await this.detectFace(styleImageUrlFinal, 'hairstyle');
        if (!hairstyleDetectResult.success) {
          throw new Error('헤어스타일 얼굴 감지 실패: ' + hairstyleDetectResult.message);
        }

        // ⭐ 4. Face Swap API ✅
        progressCallback(55, 'AI 처리 요청 중...');
        const faceswapResult = await this.createFaceSwap(userDetectResult, hairstyleDetectResult);

        if (!faceswapResult.success) {
          throw new Error('Face swap 요청 실패: ' + faceswapResult.error);
        }

        // ⭐ 5. 상태 확인 API ✅
        progressCallback(60, '처리 대기 중...');
        const finalResult = await this.waitForResult(faceswapResult.taskId, progressCallback);

        if (finalResult.success) {
          progressCallback(100, '완료!');
          return {
            success: true,
            resultUrl: finalResult.resultUrl,
            message: '🎉 헤어스타일이 성공적으로 적용되었습니다!',
            method: 'akool'
          };
        } else {
          throw new Error('Face swap 처리 실패: ' + finalResult.error);
        }

      } catch (error) {
        console.error('❌ AKOOL Face Swap 오류:', error);
        
        // 실패시 Canvas 시뮬레이션으로 폴백
        console.log('📝 Canvas 시뮬레이션으로 폴백...');
        if (window.advancedCanvasSimulation) {
          const userImageData = userFile instanceof File ? 
            await this.fileToBase64(userFile) : userFile;
          return await window.advancedCanvasSimulation(userImageData, styleImageUrl);
        }
        
        return {
          success: false,
          error: error.message,
          message: error.message
        };
      }
    }

    // 파일을 Base64로 변환
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // 지연 함수
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // AKOOL API 인스턴스 생성
  const akoolAPI = new AkoolAPI();

  // ==========================================
  // 2. 기존 showStyleDetail 함수 래핑 ✅
  // ==========================================
  
  const originalShowStyleDetail = window.showStyleDetail || function() {};
  
  window.showStyleDetail = function(code, name, gender, imageSrc, docId) {
    originalShowStyleDetail.call(this, code, name, gender, imageSrc, docId);
    
    currentStyleImage = imageSrc;
    currentStyleName = name;
    
    addAIExperienceButton();
  };

  // ==========================================
  // 3. AI 체험 버튼 추가 ✅
  // ==========================================
  
  function addAIExperienceButton() {
    const modalActions = document.querySelector('.modal-actions');
    if (!modalActions) return;

    const existingButton = modalActions.querySelector('.btn-ai-experience');
    if (existingButton) {
      existingButton.remove();
    }

    const aiButton = document.createElement('button');
    aiButton.className = 'modal-btn btn-ai-experience';
    aiButton.innerHTML = '🤖 AI 체험';
    aiButton.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      margin-left: 10px;
      position: relative;
      overflow: hidden;
      flex: 1;
      min-width: 120px;
    `;

    aiButton.addEventListener('click', function() {
      if (faceSwapInProgress) {
        showAlert('⏳ 이미 처리 중입니다. 잠시만 기다려주세요.', 'warning');
        return;
      }
      
      console.log('🚀 올바른 AKOOL AI 워크플로우 시작!');
      openAIExperienceModal();
    });

    modalActions.appendChild(aiButton);
    console.log('✅ AI 체험 버튼 추가 완료 (올바른 워크플로우)');
  }

  // ==========================================
  // 4. AI 체험 모달 열기 ✅
  // ==========================================
  
  function openAIExperienceModal() {
    if (!currentStyleImage) {
      showAlert('헤어스타일 이미지를 불러올 수 없습니다', 'error');
      return;
    }

    console.log('🎨 올바른 AKOOL AI 모달 열기:', {
      styleName: currentStyleName,
      styleImage: currentStyleImage
    });

    const modal = createAIExperienceModal();
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  // ==========================================
  // 5. 알림 표시 함수 ✅
  // ==========================================
  
  function showAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.ai-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `ai-alert ai-alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 10px;
      color: white;
      font-weight: 600;
      z-index: 4000;
      min-width: 300px;
      text-align: center;
      animation: slideInRight 0.3s ease;
    `;

    const colors = {
      'info': 'background: #667eea;',
      'success': 'background: #28a745;',
      'error': 'background: #dc3545;',
      'warning': 'background: #ffc107; color: #000;'
    };
    
    alert.style.cssText += colors[type] || colors.info;
    document.body.appendChild(alert);

    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 3000);
  }

  // ==========================================
  // 6. AI 체험 모달 생성 ✅
  // ==========================================
  
  function createAIExperienceModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-experience-modal';
    modal.innerHTML = `
      <div class="ai-modal-overlay"></div>
      <div class="ai-modal-content">
        <div class="ai-modal-header">
          <h3>🤖 AI 헤어스타일 체험 (올바른 워크플로우)</h3>
          <button class="ai-modal-close">×</button>
        </div>
        
        <div class="ai-modal-body">
          <div class="ai-upload-section">
            <div class="ai-upload-area" id="aiUploadArea">
              <input type="file" id="aiFileInput" accept="image/*" style="display: none;">
              <div class="ai-upload-content">
                <div class="ai-upload-icon">📷</div>
                <div class="ai-upload-text">
                  <div class="ai-upload-title">얼굴 사진을 선택하세요</div>
                  <div class="ai-upload-desc">JPG, PNG 파일 (최대 10MB)</div>
                  <div class="ai-upload-tips">💡 정면을 향한 선명한 얼굴 사진이 좋습니다</div>
                </div>
              </div>
            </div>
            
            <div class="ai-preview-section" id="aiPreviewSection" style="display: none;">
              <div class="ai-preview-item">
                <h4>선택한 사진</h4>
                <img id="aiPreviewUser" src="" alt="사용자 사진">
              </div>
              <div class="ai-preview-arrow">→</div>
              <div class="ai-preview-item">
                <h4>적용할 스타일</h4>
                <img id="aiPreviewStyle" src="${currentStyleImage}" alt="${currentStyleName}">
                <p>${currentStyleName}</p>
              </div>
            </div>
          </div>
          
          <div class="ai-progress-section" id="aiProgressSection" style="display: none;">
            <div class="ai-progress-bar">
              <div class="ai-progress-fill" id="aiProgressFill"></div>
            </div>
            <div class="ai-progress-text" id="aiProgressText">처리 중...</div>
            <div class="ai-progress-details" id="aiProgressDetails">올바른 AKOOL 워크플로우로 처리 중...</div>
          </div>
          
          <div class="ai-result-section" id="aiResultSection" style="display: none;">
            <div class="ai-result-image">
              <img id="aiResultImage" src="" alt="결과 이미지">
            </div>
            <div class="ai-result-message" id="aiResultMessage">
              🎉 헤어스타일이 성공적으로 적용되었습니다!
            </div>
            <div class="ai-result-actions">
              <button class="btn ai-download-btn" id="aiDownloadBtn">💾 다운로드</button>
              <button class="btn ai-retry-btn" id="aiRetryBtn">🔄 다시 시도</button>
            </div>
          </div>
          
          <div class="ai-error-section" id="aiErrorSection" style="display: none;">
            <div class="ai-error-icon">⚠️</div>
            <div class="ai-error-title" id="aiErrorTitle">처리 실패</div>
            <div class="ai-error-message" id="aiErrorMessage">오류가 발생했습니다</div>
            <button class="btn ai-retry-btn" id="aiErrorRetryBtn">🔄 다시 시도</button>
          </div>
        </div>
        
        <div class="ai-modal-footer">
          <button class="btn ai-process-btn" id="aiProcessBtn" disabled>
            🚀 올바른 워크플로우로 AI 처리
          </button>
        </div>
      </div>
    `;

    addAIModalStyles();
    setupAIModalEvents(modal);
    return modal;
  }

  // ==========================================
  // 7. AI 모달 스타일 추가 ✅
  // ==========================================
  
  function addAIModalStyles() {
    if (document.getElementById('ai-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ai-modal-styles';
    styles.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .ai-experience-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 3000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      
      .ai-experience-modal.active {
        opacity: 1;
        visibility: visible;
      }
      
      .ai-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
      }
      
      .ai-modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 2px solid #667eea;
        border-radius: 20px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .ai-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 25px;
        border-bottom: 1px solid #333;
      }
      
      .ai-modal-header h3 {
        color: #667eea;
        font-size: 20px;
        margin: 0;
      }
      
      .ai-modal-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s;
      }
      
      .ai-modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .ai-modal-body {
        padding: 25px;
      }
      
      .ai-upload-area {
        border: 2px dashed #667eea;
        border-radius: 15px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        background: rgba(102, 126, 234, 0.05);
      }
      
      .ai-upload-area:hover {
        border-color: #764ba2;
        background: rgba(102, 126, 234, 0.1);
        transform: translateY(-2px);
      }
      
      .ai-upload-area.dragover {
        border-color: #764ba2;
        background: rgba(102, 126, 234, 0.15);
        transform: scale(1.02);
      }
      
      .ai-upload-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .ai-upload-title {
        font-size: 18px;
        color: #fff;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .ai-upload-desc {
        font-size: 14px;
        color: #999;
        margin-bottom: 8px;
      }
      
      .ai-upload-tips {
        font-size: 12px;
        color: #667eea;
        margin-top: 10px;
      }
      
      .ai-preview-section {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: center;
        margin-top: 20px;
        padding: 20px;
        background: #0a0a0a;
        border-radius: 15px;
      }
      
      .ai-preview-item {
        text-align: center;
      }
      
      .ai-preview-item h4 {
        color: #667eea;
        margin-bottom: 10px;
        font-size: 14px;
      }
      
      .ai-preview-item img {
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 10px;
        border: 2px solid #333;
      }
      
      .ai-preview-item p {
        color: #999;
        font-size: 12px;
        margin-top: 5px;
      }
      
      .ai-preview-arrow {
        font-size: 24px;
        color: #667eea;
        font-weight: bold;
      }
      
      .ai-progress-section {
        text-align: center;
        padding: 30px 20px;
      }
      
      .ai-progress-bar {
        width: 100%;
        height: 8px;
        background: #333;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 15px;
      }
      
      .ai-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 10px;
        transition: width 0.5s ease;
        width: 0%;
      }
      
      .ai-progress-text {
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .ai-progress-details {
        color: #999;
        font-size: 14px;
      }
      
      .ai-result-section {
        text-align: center;
        padding: 20px;
      }
      
      .ai-result-image {
        margin-bottom: 20px;
      }
      
      .ai-result-image img {
        max-width: 100%;
        height: auto;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      
      .ai-result-message {
        color: #28a745;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
      }
      
      .ai-result-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      
      .ai-error-section {
        text-align: center;
        padding: 30px 20px;
      }
      
      .ai-error-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .ai-error-title {
        color: #dc3545;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      
      .ai-error-message {
        color: #999;
        font-size: 14px;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .ai-modal-footer {
        padding: 20px 25px;
        border-top: 1px solid #333;
        text-align: center;
      }
      
      .ai-process-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 200px;
      }
      
      .ai-process-btn:enabled:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
      }
      
      .ai-process-btn:disabled {
        background: #333;
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .ai-download-btn, .ai-retry-btn {
        background: #333;
        color: white;
        border: 1px solid #555;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .ai-download-btn:hover, .ai-retry-btn:hover {
        background: #555;
        transform: translateY(-2px);
      }

      /* 라이트 테마 지원 */
      body.light-theme .ai-modal-content {
        background: #fff;
        border-color: #667eea;
        color: #000;
      }
      
      body.light-theme .ai-modal-header {
        border-bottom-color: #eee;
      }
      
      body.light-theme .ai-modal-close {
        color: #000;
      }
      
      body.light-theme .ai-upload-title,
      body.light-theme .ai-progress-text {
        color: #000;
      }
      
      body.light-theme .ai-preview-section {
        background: #f5f5f5;
      }
      
      body.light-theme .ai-preview-item img {
        border-color: #ddd;
      }
      
      body.light-theme .ai-modal-footer {
        border-top-color: #eee;
      }

      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .ai-modal-content {
          width: 95%;
          margin: 20px;
        }
        
        .ai-preview-section {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .ai-preview-arrow {
          transform: rotate(90deg);
        }
        
        .ai-preview-item img {
          width: 100px;
          height: 100px;
        }
        
        .ai-upload-area {
          padding: 30px 20px;
        }
        
        .ai-upload-icon {
          font-size: 36px;
        }
        
        .ai-upload-title {
          font-size: 16px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // ==========================================
  // 8. AI 모달 이벤트 설정 ✅
  // ==========================================
  
  function setupAIModalEvents(modal) {
    const overlay = modal.querySelector('.ai-modal-overlay');
    const closeBtn = modal.querySelector('.ai-modal-close');
    const uploadArea = modal.querySelector('#aiUploadArea');
    const fileInput = modal.querySelector('#aiFileInput');
    const processBtn = modal.querySelector('#aiProcessBtn');
    const downloadBtn = modal.querySelector('#aiDownloadBtn');
    const retryBtn = modal.querySelector('#aiRetryBtn');
    const errorRetryBtn = modal.querySelector('#aiErrorRetryBtn');

    let selectedFile = null;

    // 모달 닫기
    function closeModal() {
      faceSwapInProgress = false;
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentElement) {
          document.body.removeChild(modal);
        }
      }, 300);
    }

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // 파일 업로드 영역 클릭
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    // 파일 선택
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // 파일 처리
    function handleFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        showAlert('이미지 파일만 선택할 수 있습니다', 'error');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showAlert('파일 크기는 10MB 이하여야 합니다', 'error');
        return;
      }

      selectedFile = file;
      showPreview(file);
      processBtn.disabled = false;
    }

    // 미리보기 표시
    function showPreview(file) {
      const uploadSection = modal.querySelector('.ai-upload-section');
      const previewSection = modal.querySelector('#aiPreviewSection');
      const userPreview = modal.querySelector('#aiPreviewUser');

      const reader = new FileReader();
      reader.onload = (e) => {
        userPreview.src = e.target.result;
        uploadSection.style.display = 'none';
        previewSection.style.display = 'grid';
      };
      reader.readAsDataURL(file);
    }

    // 초기 상태로 리셋
    function resetToInitialState() {
      modal.querySelector('.ai-modal-body').style.display = 'block';
      modal.querySelector('.ai-modal-footer').style.display = 'block';
      modal.querySelector('#aiProgressSection').style.display = 'none';
      modal.querySelector('#aiResultSection').style.display = 'none';
      modal.querySelector('#aiErrorSection').style.display = 'none';
      modal.querySelector('#aiPreviewSection').style.display = 'none';
      modal.querySelector('.ai-upload-section').style.display = 'block';
      selectedFile = null;
      processBtn.disabled = true;
      fileInput.value = '';
      faceSwapInProgress = false;
    }

    // ⭐ 올바른 워크플로우로 AI 처리 시작 ✅
    processBtn.addEventListener('click', async () => {
      if (!selectedFile || faceSwapInProgress) return;

      faceSwapInProgress = true;
      console.log('🚀 올바른 AKOOL 워크플로우로 AI 처리 시작!');

      const progressSection = modal.querySelector('#aiProgressSection');
      const progressFill = modal.querySelector('#aiProgressFill');
      const progressText = modal.querySelector('#aiProgressText');
      const progressDetails = modal.querySelector('#aiProgressDetails');
      const resultSection = modal.querySelector('#aiResultSection');
      const errorSection = modal.querySelector('#aiErrorSection');
      
      // 진행 상태로 전환
      modal.querySelector('.ai-modal-body').style.display = 'none';
      modal.querySelector('.ai-modal-footer').style.display = 'none';
      progressSection.style.display = 'block';

      try {
        const result = await akoolAPI.processFaceSwap(
          selectedFile,
          currentStyleImage,
          (progress, message) => {
            progressFill.style.width = progress + '%';
            progressText.textContent = `${progress}% 완료`;
            progressDetails.textContent = message;
            console.log(`📊 올바른 워크플로우 진행률: ${progress}% - ${message}`);
          }
        );

        if (result.success) {
          // 성공 상태로 전환
          const resultImage = modal.querySelector('#aiResultImage');
          const resultMessage = modal.querySelector('#aiResultMessage');
          
          resultImage.src = result.resultUrl;
          resultMessage.textContent = result.message || '🎉 헤어스타일이 성공적으로 적용되었습니다!';
          
          progressSection.style.display = 'none';
          resultSection.style.display = 'block';

          console.log('🎉 올바른 AKOOL 워크플로우 처리 성공!', result.resultUrl);

          // 다운로드 버튼 이벤트
          downloadBtn.onclick = () => {
            try {
              const a = document.createElement('a');
              a.href = result.resultUrl;
              a.download = `hairgator_ai_${currentStyleName}_${Date.now()}.jpg`;
              a.click();
              showAlert('이미지 다운로드를 시작합니다', 'success');
            } catch (error) {
              console.error('다운로드 오류:', error);
              showAlert('다운로드 중 오류가 발생했습니다', 'error');
            }
          };

        } else {
          // 오류 상태로 전환
          const errorTitle = modal.querySelector('#aiErrorTitle');
          const errorMessage = modal.querySelector('#aiErrorMessage');
          
          errorTitle.textContent = '처리 실패';
          errorMessage.textContent = result.message || result.error || '알 수 없는 오류가 발생했습니다';
          
          progressSection.style.display = 'none';
          errorSection.style.display = 'block';

          console.error('❌ 올바른 AKOOL 워크플로우 처리 실패:', result);
        }

      } catch (error) {
        console.error('❌ AI 처리 예외 오류:', error);
        
        // 오류 상태로 전환
        const errorTitle = modal.querySelector('#aiErrorTitle');
        const errorMessage = modal.querySelector('#aiErrorMessage');
        
        errorTitle.textContent = '시스템 오류';
        errorMessage.textContent = '네트워크 연결을 확인하고 다시 시도해주세요';
        
        progressSection.style.display = 'none';
        errorSection.style.display = 'block';
      } finally {
        faceSwapInProgress = false;
      }
    });

    // 다시 시도 버튼들
    retryBtn.addEventListener('click', resetToInitialState);
    errorRetryBtn.addEventListener('click', resetToInitialState);

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function handleEscape(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    });
  }

  // ==========================================
  // 9. 전역 함수 생성 ✅
  // ==========================================
  
  // 전역 AKOOL API 인스턴스
  window.akoolAPI = akoolAPI;

  // 기존 performFaceSwap 함수와의 호환성 래퍼
  window.performFaceSwap = async function(userImageData, styleImageData, progressCallback) {
    try {
      let userFile = userImageData;
      
      // Base64 문자열인 경우 File 객체로 변환
      if (typeof userImageData === 'string' && userImageData.startsWith('data:image/')) {
        const response = await fetch(userImageData);
        const blob = await response.blob();
        userFile = new File([blob], 'user_image.jpg', { type: 'image/jpeg' });
      }
      
      return await akoolAPI.processFaceSwap(userFile, styleImageData, progressCallback);
    } catch (error) {
      console.error('Face swap wrapper error:', error);
      
      // 폴백: Canvas 시뮬레이션
      if (window.advancedCanvasSimulation) {
        return await window.advancedCanvasSimulation(userImageData, styleImageData);
      }
      
      return {
        success: false,
        error: 'Face swap failed',
        message: error.message
      };
    }
  };

  console.log('✅ AKOOL 완전 통합 최종 버전 완료');
  console.log('🎯 올바른 워크플로우: 토큰 → 업로드 → 감지 → Face Swap → 상태확인');
});

// ==========================================
// 10. Canvas 시뮬레이션 폴백 함수 ✅
// ==========================================

// Canvas 시뮬레이션 함수 (기존 코드 보존)
if (!window.advancedCanvasSimulation) {
  window.advancedCanvasSimulation = async function(userImageData, styleImageData) {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 800;
        canvas.height = 1000;
        
        const userImg = new Image();
        const styleImg = new Image();
        let loadedImages = 0;
        
        function checkAllLoaded() {
          loadedImages++;
          if (loadedImages === 2) {
            // Canvas 합성 로직
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 스타일 이미지를 배경으로
            const styleRatio = Math.min(canvas.width / styleImg.width, canvas.height / styleImg.height);
            const styleW = styleImg.width * styleRatio;
            const styleH = styleImg.height * styleRatio;
            const styleX = (canvas.width - styleW) / 2;
            const styleY = (canvas.height - styleH) / 2;
            
            ctx.drawImage(styleImg, styleX, styleY, styleW, styleH);
            
            // 사용자 얼굴을 오버레이로 (반투명)
            ctx.globalAlpha = 0.7;
            const userSize = Math.min(canvas.width, canvas.height) * 0.3;
            const userX = canvas.width * 0.1;
            const userY = canvas.height * 0.1;
            
            ctx.drawImage(userImg, userX, userY, userSize, userSize);
            ctx.globalAlpha = 1.0;
            
            // 텍스트 오버레이
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HAIRGATOR AI 시뮬레이션', canvas.width / 2, canvas.height - 50);
            ctx.fillText('실제 결과와 다를 수 있습니다', canvas.width / 2, canvas.height - 30);
            
            const resultDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            resolve({
              success: true,
              resultUrl: resultDataUrl,
              method: 'canvas',
              message: '시뮬레이션이 완료되었습니다'
            });
          }
        }
        
        userImg.onload = checkAllLoaded;
        userImg.onerror = () => {
          resolve({
            success: false,
            error: 'User image processing failed',
            method: 'canvas'
          });
        };
        
        styleImg.onload = checkAllLoaded;
        styleImg.onerror = () => {
          resolve({
            success: false,
            error: 'Style image processing failed',
            method: 'canvas'
          });
        };
        
        // 이미지 로드 시작
        if (typeof userImageData === 'string') {
          userImg.src = userImageData;
        } else if (userImageData instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            userImg.src = e.target.result;
          };
          reader.readAsDataURL(userImageData);
        }
        
        styleImg.src = styleImageData;
        
      } catch (error) {
        console.error('Canvas simulation error:', error);
        resolve({
          success: false,
          error: 'Canvas simulation failed',
          method: 'canvas'
        });
      }
    });
  };
}
