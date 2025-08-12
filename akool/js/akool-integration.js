// akool/js/akool-integration.js
// HAIRGATOR에 AKOOL Face Swap 기능 통합 - 최종 수정 버전

document.addEventListener('DOMContentLoaded', function() {
  const akoolAPI = new AkoolAPI();
  let currentStyleImage = null;
  let currentStyleName = null;

  console.log('🎨 AKOOL Face Swap 통합 시작');

  // 스타일 모달이 열릴 때 AI 체험 버튼 추가
  const originalShowStyleDetail = window.showStyleDetail || function() {};
  
  window.showStyleDetail = function(code, name, gender, imageSrc, docId) {
    originalShowStyleDetail.call(this, code, name, gender, imageSrc, docId);
    
    currentStyleImage = imageSrc;
    currentStyleName = name;
    
    addAIExperienceButton();
  };

  // AI 체험 버튼 추가
  function addAIExperienceButton() {
    const modalActions = document.querySelector('.modal-actions');
    if (!modalActions) return;

    const existingButton = modalActions.querySelector('.btn-ai-experience');
    if (existingButton) {
      existingButton.remove();
    }

    const aiButton = document.createElement('button');
    aiButton.className = 'modal-btn btn-ai-experience';
    aiButton.innerHTML = '✨ AI 체험';
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
      openAIExperienceModal();
    });

    modalActions.appendChild(aiButton);
  }

  // AI 체험 모달 열기
  function openAIExperienceModal() {
    if (!currentStyleImage) {
      showAlert('헤어스타일 이미지를 불러올 수 없습니다', 'error');
      return;
    }

    const modal = createAIExperienceModal();
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  }

  // 알림 표시 함수
  function showAlert(message, type = 'info') {
    // 기존 알림 제거
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

    // 타입별 색상
    const colors = {
      'info': 'background: #667eea;',
      'success': 'background: #28a745;',
      'error': 'background: #dc3545;',
      'warning': 'background: #ffc107; color: #000;'
    };
    
    alert.style.cssText += colors[type] || colors.info;

    document.body.appendChild(alert);

    // 3초 후 자동 제거
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 3000);
  }

  // AI 체험 모달 생성
  function createAIExperienceModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-experience-modal';
    modal.innerHTML = `
      <div class="ai-modal-overlay"></div>
      <div class="ai-modal-content">
        <div class="ai-modal-header">
          <h3>✨ AI 헤어스타일 체험</h3>
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
            <div class="ai-progress-details" id="aiProgressDetails">AI가 이미지를 분석하고 있습니다...</div>
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
            ✨ AI 처리 시작
          </button>
        </div>
      </div>
    `;

    addAIModalStyles();
    setupAIModalEvents(modal);

    return modal;
  }

  // AI 모달 스타일 추가
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

  // AI 모달 이벤트 설정
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
    }

    // AI 처리 시작
    processBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

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
      }
    });

    // 다시 시도 버튼들
    retryBtn.addEventListener('click', resetToInitialState);
    errorRetryBtn.addEventListener('click', resetToInitialState);
  }

  console.log('✅ AKOOL Face Swap 통합 완료');
});
