// HAIRGATOR 헤어체험 모듈 - AI 없는 단순 이미지 교체 방식
// 남자 > SIDE FRINGE > Fore Head 카테고리의 첫번째, 세번째 스타일만 지원

document.addEventListener('DOMContentLoaded', function() {
    console.log('🦎 헤어체험 모듈 로드됨');
    
    // 헤어체험 지원 스타일 목록 (파일명 기준)
    const SUPPORTED_STYLES = {
        'AUTO_217': 'images/hair-results/AUTO_217_result.png',
        'AUTO_223': 'images/hair-results/AUTO_223_result.png'
    };
    
    let currentStyleCode = null;
    let uploadedImage = null;
    
    // 헤어체험 모달 HTML 동적 생성
    function createHairExperienceModal() {
        const modalHTML = `
            <div id="hairExperienceModal" class="hair-experience-modal">
                <div class="hair-experience-content">
                    <div class="hair-experience-header">
                        <button class="hair-experience-close" id="hairExperienceClose">×</button>
                        <h2 class="hair-experience-title">
                            <span>✂️</span>
                            헤어체험하기
                        </h2>
                        <p class="hair-experience-subtitle">
                            사진을 업로드하면 선택한 헤어스타일로 체험해볼 수 있습니다
                        </p>
                    </div>
                    
                    <div class="hair-experience-body">
                        <!-- 업로드 단계 -->
                        <div id="uploadStep" class="upload-step">
                            <div class="upload-area" id="uploadArea">
                                <div class="upload-placeholder">
                                    <span class="upload-icon">📸</span>
                                    <div class="upload-text">사진을 선택하거나 드래그하세요</div>
                                    <div class="upload-hint">JPG, PNG 파일만 지원됩니다</div>
                                </div>
                                <input type="file" id="uploadInput" class="upload-input" accept="image/*">
                            </div>
                            
                            <div id="uploadPreview" class="upload-preview">
                                <img id="previewImage" class="preview-image" alt="미리보기">
                                <div class="preview-text">업로드된 사진</div>
                                <button class="change-photo-btn" id="changePhotoBtn">사진 변경</button>
                            </div>
                            
                            <button class="experience-btn" id="startExperienceBtn" disabled>
                                <span>✨</span>
                                <span>헤어체험 시작하기</span>
                            </button>
                        </div>
                        
                        <!-- 로딩 단계 -->
                        <div id="loadingStep" class="experience-loading">
                            <div class="loading-spinner-hair"></div>
                            <div class="loading-text">헤어스타일 적용 중...</div>
                            <div class="loading-hint">잠시만 기다려주세요</div>
                        </div>
                        
                        <!-- 결과 단계 -->
                        <div id="resultStep" class="experience-result">
                            <img id="resultImage" class="result-image" alt="헤어체험 결과">
                            <div class="result-title">헤어체험 완료!</div>
                            <div class="result-subtitle">새로운 헤어스타일이 어떠신가요?</div>
                            <div class="result-actions">
                                <button class="result-btn secondary" id="tryAgainBtn">다시 시도</button>
                                <button class="result-btn primary" id="saveResultBtn">결과 저장</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // 모달 이벤트 리스너 설정
    function setupModalEventListeners() {
        const modal = document.getElementById('hairExperienceModal');
        const closeBtn = document.getElementById('hairExperienceClose');
        const uploadArea = document.getElementById('uploadArea');
        const uploadInput = document.getElementById('uploadInput');
        const changePhotoBtn = document.getElementById('changePhotoBtn');
        const startBtn = document.getElementById('startExperienceBtn');
        const tryAgainBtn = document.getElementById('tryAgainBtn');
        const saveResultBtn = document.getElementById('saveResultBtn');
        
        // 모달 닫기
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
        
        // 업로드 영역 클릭
        uploadArea.addEventListener('click', function() {
            uploadInput.click();
        });
        
        // 드래그 앤 드롭
        setupDragAndDrop(uploadArea);
        
        // 파일 선택
        uploadInput.addEventListener('change', handleFileSelect);
        changePhotoBtn.addEventListener('change', handleFileSelect);
        
        // 체험 시작
        startBtn.addEventListener('click', startHairExperience);
        
        // 다시 시도
        tryAgainBtn.addEventListener('click', resetToUpload);
        
        // 결과 저장
        saveResultBtn.addEventListener('click', saveResult);
    }
    
    // 드래그 앤 드롭 설정
    function setupDragAndDrop(uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        function highlight() {
            uploadArea.classList.add('dragover');
        }
        
        function unhighlight() {
            uploadArea.classList.remove('dragover');
        }
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                handleFile(files[0]);
            }
        }
    }
    
    // 파일 선택 처리
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    }
    
    // 파일 처리
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            alert('파일 크기는 10MB 이하로 업로드해주세요.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = e.target.result;
            showPreview(uploadedImage);
            enableStartButton();
        };
        reader.readAsDataURL(file);
    }
    
    // 미리보기 표시
    function showPreview(imageSrc) {
        const previewImage = document.getElementById('previewImage');
        const uploadPreview = document.getElementById('uploadPreview');
        
        previewImage.src = imageSrc;
        uploadPreview.classList.add('active');
    }
    
    // 체험 시작 버튼 활성화
    function enableStartButton() {
        const startBtn = document.getElementById('startExperienceBtn');
        startBtn.disabled = false;
    }
    
    // 헤어체험 시작
    function startHairExperience() {
        if (!uploadedImage || !currentStyleCode) {
            alert('사진을 업로드해주세요.');
            return;
        }
        
        // 단계 전환: 업로드 → 로딩
        showStep('loadingStep');
        
        // 2초 후 결과 표시 (실제 AI 처리 시뮬레이션)
        setTimeout(() => {
            showResult();
        }, 2000);
    }
    
    // 결과 표시
    function showResult() {
        const resultImage = document.getElementById('resultImage');
        const resultImageSrc = SUPPORTED_STYLES[currentStyleCode];
        
        if (resultImageSrc) {
            resultImage.src = resultImageSrc;
            showStep('resultStep');
        } else {
            alert('결과 이미지를 찾을 수 없습니다.');
            resetToUpload();
        }
    }
    
    // 단계 전환
    function showStep(stepId) {
        const steps = ['uploadStep', 'loadingStep', 'resultStep'];
        steps.forEach(id => {
            const step = document.getElementById(id);
            if (step) {
                step.classList.remove('active');
                step.style.display = id === stepId ? 'block' : 'none';
            }
        });
        
        if (stepId === 'loadingStep') {
            document.getElementById('loadingStep').classList.add('active');
        } else if (stepId === 'resultStep') {
            document.getElementById('resultStep').classList.add('active');
        }
    }
    
    // 업로드 단계로 리셋
    function resetToUpload() {
        uploadedImage = null;
        document.getElementById('uploadPreview').classList.remove('active');
        document.getElementById('startExperienceBtn').disabled = true;
        document.getElementById('uploadInput').value = '';
        showStep('uploadStep');
    }
    
    // 결과 저장
    function saveResult() {
        const resultImage = document.getElementById('resultImage');
        if (resultImage.src) {
            // 이미지 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = resultImage.src;
            link.download = `hairgator_${currentStyleCode}_result.png`;
            link.click();
        }
    }
    
    // 모달 열기
    function openModal(styleCode) {
        currentStyleCode = styleCode;
        const modal = document.getElementById('hairExperienceModal');
        
        if (!modal) {
            createHairExperienceModal();
            setupModalEventListeners();
        }
        
        // 초기 상태로 리셋
        resetToUpload();
        
        // 모달 표시
        document.getElementById('hairExperienceModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log(`헤어체험 모달 열림: ${styleCode}`);
    }
    
    // 모달 닫기
    function closeModal() {
        const modal = document.getElementById('hairExperienceModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            resetToUpload();
        }
    }
    
    // 스타일 모달에 헤어체험 버튼 추가
    function addHairExperienceButton() {
        // MutationObserver로 스타일 모달 감지
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('style-modal')) {
                            injectHairExperienceButton(node);
                        }
                    });
                }
                
                // 기존 모달이 활성화될 때도 처리
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('style-modal') && target.classList.contains('active')) {
                        injectHairExperienceButton(target);
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        // 이미 존재하는 스타일 모달 처리
        const existingModal = document.querySelector('.style-modal');
        if (existingModal) {
            injectHairExperienceButton(existingModal);
        }
    }
    
    // 스타일 모달에 헤어체험 버튼 주입
    function injectHairExperienceButton(modal) {
        // 이미 버튼이 있다면 스킵
        if (modal.querySelector('.hair-experience-btn')) {
            console.log('헤어체험 버튼이 이미 존재함');
            return;
        }
        
        // 개발중 텍스트 영역 찾기
        const devText = modal.querySelector('.style-modal-info');
        if (!devText) {
            console.log('style-modal-info 요소를 찾을 수 없음');
            return;
        }
        
        // 현재 표시된 스타일의 코드 가져오기
        const styleCode = modal.querySelector('.style-modal-code');
        const currentCode = styleCode ? styleCode.textContent.trim() : '';
        
        console.log('감지된 스타일 코드:', currentCode);
        console.log('지원 스타일 목록:', Object.keys(SUPPORTED_STYLES));
        
        // 지원하는 스타일인지 확인
        const isSupported = SUPPORTED_STYLES.hasOwnProperty(currentCode);
        
        console.log(`스타일 ${currentCode} 지원 여부:`, isSupported);
        
        // 헤어체험 버튼 생성
        const hairExperienceBtn = document.createElement('button');
        hairExperienceBtn.className = 'hair-experience-btn';
        hairExperienceBtn.innerHTML = `
            <span>✂️</span>
            <span>헤어체험하기</span>
        `;
        
        if (isSupported) {
            // 지원하는 스타일 - 활성화
            hairExperienceBtn.disabled = false;
            hairExperienceBtn.style.cssText = `
                background: linear-gradient(135deg, #E91E63, #C2185B) !important;
                color: white !important;
                opacity: 1 !important;
                cursor: pointer !important;
                pointer-events: auto !important;
            `;
            
            // onclick 방식으로 이벤트 연결
            hairExperienceBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('헤어체험 버튼 클릭됨:', currentCode);
                openModal(currentCode);
            };
            
            console.log(`✅ 헤어체험 버튼 활성화됨: ${currentCode}`);
        } else {
            // 지원하지 않는 스타일 - 비활성화
            hairExperienceBtn.disabled = true;
            hairExperienceBtn.innerHTML = `
                <span>⚠️</span>
                <span>개발중</span>
            `;
            hairExperienceBtn.style.cssText = `
                background: #666666 !important;
                color: #999999 !important;
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
            `;
            
            console.log(`❌ 헤어체험 버튼 비활성화됨: ${currentCode}`);
        }
        
        // 모달 액션 버튼 영역 찾기
        const modalActions = modal.querySelector('.style-modal-actions');
        if (modalActions) {
            // 헤어체험 버튼을 첫 번째로 추가
            modalActions.insertBefore(hairExperienceBtn, modalActions.firstChild);
            console.log('버튼이 modal actions에 추가됨');
        } else {
            // 액션 영역이 없다면 info 영역 끝에 추가
            devText.appendChild(hairExperienceBtn);
            console.log('버튼이 modal info에 추가됨');
        }
        
        console.log(`헤어체험 버튼 주입 완료: ${currentCode} (지원: ${isSupported})`);
    }
    
    // 초기화
    function init() {
        addHairExperienceButton();
        console.log('✅ 헤어체험 모듈 초기화 완료');
        console.log('지원하는 스타일:', Object.keys(SUPPORTED_STYLES));
    }
    
    // 디버깅용 전역 함수
    window.debugHairExperience = function() {
        console.log('=== 헤어체험 디버깅 정보 ===');
        console.log('지원 스타일:', SUPPORTED_STYLES);
        console.log('현재 스타일 코드:', currentStyleCode);
        console.log('업로드된 이미지:', !!uploadedImage);
        console.log('모달 존재:', !!document.getElementById('hairExperienceModal'));
    };
    
    // 테스트용 함수
    window.testHairExperience = function(styleCode = 'AUTO_217') {
        if (SUPPORTED_STYLES[styleCode]) {
            openModal(styleCode);
        } else {
            console.error('지원하지 않는 스타일 코드:', styleCode);
        }
    };
    
    // 초기화 실행
    init();
});

console.log('🦎 HAIRGATOR 헤어체험 모듈 로드됨 - AI 없는 단순 이미지 교체 방식');
