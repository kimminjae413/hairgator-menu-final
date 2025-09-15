// personal-color/camera-to-hair-experience.js
// 미디어파이프 분석 완료 후 바로 헤어체험으로 연결 (완전 새 파일)

class CameraToHairExperience {
    constructor() {
        this.capturedPhoto = null;
        this.analysisResult = null;
        this.selectedColor = null;
        this.resultImageUrl = null;
        this.isReadyForHairExperience = false;
        
        console.log('🎨 카메라 → 헤어체험 연동 모듈 로드');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // MediaPipe 분석 완료 이벤트 리스너
        document.addEventListener('personalColorAnalysisComplete', (event) => {
            this.onAnalysisComplete(event.detail);
        });

        // 사진 촬영 완료 이벤트 리스너  
        document.addEventListener('photoCaptured', (event) => {
            this.onPhotoCaptured(event.detail);
        });

        console.log('📷 카메라 이벤트 리스너 설정 완료');
    }

    // 미디어파이프 분석 완료 후 호출
    onAnalysisComplete(analysisData) {
        console.log('🎨 퍼스널컬러 분석 완료:', analysisData);
        
        this.analysisResult = {
            personalColorType: analysisData.personalColorType, // 'spring', 'summer', 'autumn', 'winter'
            skinTone: analysisData.skinTone,
            confidence: analysisData.confidence,
            timestamp: Date.now()
        };

        // 헤어체험 버튼 표시
        this.showHairExperienceOption();
    }

    // 사진 촬영 완료 후 호출
    onPhotoCaptured(photoData) {
        console.log('📷 사진 촬영 완료');
        
        this.capturedPhoto = {
            imageUrl: photoData.imageUrl,
            blob: photoData.blob,
            file: photoData.file,
            timestamp: Date.now()
        };

        // 분석과 사진이 모두 준비되면 헤어체험 준비 완료
        if (this.analysisResult && this.capturedPhoto) {
            this.isReadyForHairExperience = true;
            this.updateHairExperienceButton();
        }
    }

    // 헤어체험 옵션 표시
    showHairExperienceOption() {
        const existingButton = document.getElementById('hairExperienceFromCamera');
        if (existingButton) {
            existingButton.remove();
        }

        // 분석 결과 영역에 헤어체험 버튼 추가
        const analysisContainer = document.querySelector('.analysis-results') || 
                                document.querySelector('.color-result') ||
                                document.getElementById('analysis-result') ||
                                document.body;

        if (analysisContainer) {
            const hairExperienceSection = document.createElement('div');
            hairExperienceSection.className = 'hair-experience-from-camera';
            hairExperienceSection.innerHTML = `
                <div class="camera-hair-experience-card">
                    <h3>🎨 AI 헤어컬러 체험</h3>
                    <p>방금 촬영한 사진으로 헤어컬러를 체험해보세요!</p>
                    <div class="personal-color-badge">
                        ${this.getPersonalColorDisplayName(this.analysisResult?.personalColorType)}
                    </div>
                    <button id="hairExperienceFromCamera" class="btn-hair-experience" ${!this.isReadyForHairExperience ? 'disabled' : ''}>
                        ${this.isReadyForHairExperience ? '✨ 헤어컬러 체험 시작' : '📷 사진 촬영을 완료해주세요'}
                    </button>
                </div>
            `;

            analysisContainer.appendChild(hairExperienceSection);

            // 버튼 이벤트 설정
            const button = document.getElementById('hairExperienceFromCamera');
            if (button) {
                button.addEventListener('click', () => this.startHairExperienceFromCamera());
            }
        }
    }

    // 헤어체험 버튼 상태 업데이트
    updateHairExperienceButton() {
        const button = document.getElementById('hairExperienceFromCamera');
        if (button && this.isReadyForHairExperience) {
            button.disabled = false;
            button.textContent = '✨ 헤어컬러 체험 시작';
            button.classList.add('ready');
        }
    }

    // 퍼스널컬러 타입 표시명 변환
    getPersonalColorDisplayName(type) {
        const names = {
            spring: '봄 웜톤',
            summer: '여름 쿨톤',
            autumn: '가을 웜톤', 
            winter: '겨울 쿨톤'
        };
        return names[type] || '퍼스널컬러';
    }

    // 카메라에서 헤어체험 시작
    async startHairExperienceFromCamera() {
        if (!this.isReadyForHairExperience) {
            alert('사진 촬영과 분석을 먼저 완료해주세요.');
            return;
        }

        try {
            // Gemini API 키 확인
            if (!window.hairgatorGemini || !window.hairgatorGemini.apiKey) {
                const apiKey = prompt('Gemini API 키를 입력해주세요:');
                if (apiKey && apiKey.trim()) {
                    window.setGeminiKey(apiKey.trim());
                } else {
                    return;
                }
            }

            // 헤어체험 모달 열기 (촬영한 사진으로)
            this.openHairExperienceModal();

        } catch (error) {
            console.error('헤어체험 시작 실패:', error);
            alert('헤어체험을 시작할 수 없습니다.');
        }
    }

    // 헤어체험 모달 열기 (카메라 사진 사용)
    openHairExperienceModal() {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('cameraHairExperienceModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 새 모달 생성
        const modal = document.createElement('div');
        modal.id = 'cameraHairExperienceModal';
        modal.className = 'camera-hair-modal';
        modal.innerHTML = this.generateModalHTML();

        document.body.appendChild(modal);

        // 모달 표시
        setTimeout(() => {
            modal.style.display = 'flex';
            this.initializeModal();
        }, 100);
    }

    // 모달 HTML 생성
    generateModalHTML() {
        const personalColorName = this.getPersonalColorDisplayName(this.analysisResult.personalColorType);
        
        return `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎨 AI 헤어컬러 체험</h3>
                    <button class="modal-close" onclick="cameraToHair.closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <!-- 진행 단계 -->
                    <div class="progress-steps">
                        <div class="step completed">📷 사진촬영</div>
                        <div class="step completed">🎨 분석완료</div>
                        <div class="step active">💇‍♀️ 헤어체험</div>
                    </div>

                    <!-- 분석 정보 표시 -->
                    <div class="analysis-info">
                        <div class="personal-color-result">
                            <span class="color-badge">${personalColorName}</span>
                            <p>당신의 퍼스널컬러에 맞는 헤어컬러를 추천해드릴게요!</p>
                        </div>
                    </div>

                    <!-- 촬영한 사진 미리보기 -->
                    <div class="captured-photo-preview">
                        <h4>📷 촬영한 사진</h4>
                        <img id="capturedPhotoPreview" src="${this.capturedPhoto.imageUrl}" alt="촬영한 사진">
                    </div>

                    <!-- 추천 헤어컬러 선택 -->
                    <div class="recommended-colors-section">
                        <h4>💎 ${personalColorName} 추천 헤어컬러</h4>
                        <div class="camera-colors-grid" id="cameraColorsGrid">
                            <!-- JavaScript로 동적 생성 -->
                        </div>
                    </div>

                    <!-- 결과 표시 영역 -->
                    <div id="hairResultSection" class="hair-result-section" style="display: none;">
                        <h4>✨ 헤어컬러 체험 결과</h4>
                        <div class="result-comparison">
                            <div class="result-item">
                                <h5>원본</h5>
                                <img id="originalPhotoResult" alt="원본">
                            </div>
                            <div class="result-item">
                                <h5>헤어컬러 적용</h5>
                                <img id="hairColorResult" alt="결과">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button id="selectColorBtn" class="btn-modal-secondary" disabled>컬러를 선택해주세요</button>
                    <button id="tryHairColorBtn" class="btn-modal-primary" onclick="cameraToHair.processHairColor()" disabled>
                        🎨 AI 헤어컬러 적용
                    </button>
                    <button id="saveResultBtn" class="btn-modal-primary" onclick="cameraToHair.saveResult()" style="display: none;">
                        💾 결과 저장
                    </button>
                </div>
            </div>

            <!-- 로딩 오버레이 -->
            <div id="cameraHairLoading" class="camera-hair-loading" style="display: none;">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">AI가 헤어컬러를 적용하고 있어요...</div>
                </div>
            </div>
        `;
    }

    // 모달 초기화
    initializeModal() {
        // 추천 컬러 그리드 렌더링
        this.renderRecommendedColors();
        
        // 선택된 컬러 추적
        this.selectedColor = null;
    }

    // 추천 컬러 렌더링
    renderRecommendedColors() {
        if (!window.hairgatorGemini) {
            console.warn('Gemini 통합 모듈이 로드되지 않았습니다');
            return;
        }

        const colors = window.hairgatorGemini.getRecommendedColors(this.analysisResult.personalColorType);
        const grid = document.getElementById('cameraColorsGrid');

        if (grid && colors.length > 0) {
            grid.innerHTML = colors.map((color, index) => `
                <div class="camera-color-option" data-color-index="${index}" data-color='${JSON.stringify(color)}'>
                    <div class="color-circle" style="background-color: ${color.hex}"></div>
                    <h5>${color.name}</h5>
                    <p class="color-brand">${color.brand} ${color.code || ''}</p>
                </div>
            `).join('');

            // 컬러 선택 이벤트
            grid.addEventListener('click', (e) => {
                const option = e.target.closest('.camera-color-option');
                if (option) {
                    this.selectColor(option);
                }
            });
        }
    }

    // 컬러 선택 처리
    selectColor(option) {
        // 이전 선택 해제
        document.querySelectorAll('.camera-color-option').forEach(opt => 
            opt.classList.remove('selected'));

        // 새 선택
        option.classList.add('selected');
        this.selectedColor = JSON.parse(option.dataset.color);

        // 버튼 상태 업데이트
        const selectBtn = document.getElementById('selectColorBtn');
        const tryBtn = document.getElementById('tryHairColorBtn');

        if (selectBtn && tryBtn) {
            selectBtn.textContent = `${this.selectedColor.name} 선택됨`;
            selectBtn.disabled = false;
            tryBtn.disabled = false;
        }
    }

    // AI 헤어컬러 처리
    async processHairColor() {
        if (!this.selectedColor) {
            alert('헤어컬러를 먼저 선택해주세요.');
            return;
        }

        this.showLoading();

        try {
            console.log('🎨 AI 헤어컬러 처리 시작:', this.selectedColor.name);

            // 촬영한 사진을 File 객체로 변환
            const imageFile = await this.blobToFile(this.capturedPhoto.blob, 'captured-photo.jpg');

            // Gemini API로 헤어컬러 적용
            const resultImageUrl = await window.hairgatorGemini.tryHairColor(
                imageFile,
                this.selectedColor,
                this.analysisResult.personalColorType
            );

            // 결과 표시
            this.showHairResult(resultImageUrl);

        } catch (error) {
            console.error('AI 헤어컬러 처리 실패:', error);
            alert(`처리 실패: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // Blob을 File 객체로 변환
    async blobToFile(blob, fileName) {
        return new File([blob], fileName, { type: blob.type });
    }

    // 헤어컬러 결과 표시
    showHairResult(resultImageUrl) {
        // 원본 이미지 설정
        const originalImg = document.getElementById('originalPhotoResult');
        if (originalImg) {
            originalImg.src = this.capturedPhoto.imageUrl;
        }

        // 결과 이미지 설정
        const resultImg = document.getElementById('hairColorResult');
        if (resultImg) {
            resultImg.src = resultImageUrl;
        }

        // 결과 섹션 표시
        const resultSection = document.getElementById('hairResultSection');
        if (resultSection) {
            resultSection.style.display = 'block';
            
            // 결과 섹션으로 스크롤
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }

        // 버튼 상태 변경
        const tryBtn = document.getElementById('tryHairColorBtn');
        const saveBtn = document.getElementById('saveResultBtn');

        if (tryBtn) tryBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'inline-block';

        // 결과 저장
        this.resultImageUrl = resultImageUrl;
    }

    // 로딩 표시
    showLoading() {
        const loading = document.getElementById('cameraHairLoading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    // 로딩 숨김
    hideLoading() {
        const loading = document.getElementById('cameraHairLoading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // 결과 저장
    saveResult() {
        if (!this.resultImageUrl) {
            alert('저장할 결과가 없습니다.');
            return;
        }

        try {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `hairgator_${this.selectedColor.name}_${timestamp}.jpg`;
            link.href = this.resultImageUrl;
            link.click();

            alert('결과가 저장되었습니다!');
        } catch (error) {
            console.error('저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
    }

    // 모달 닫기
    closeModal() {
        const modal = document.getElementById('cameraHairExperienceModal');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    // 상태 초기화
    reset() {
        this.capturedPhoto = null;
        this.analysisResult = null;
        this.selectedColor = null;
        this.resultImageUrl = null;
        this.isReadyForHairExperience = false;

        // UI 정리
        const existingButton = document.getElementById('hairExperienceFromCamera');
        if (existingButton) {
            existingButton.remove();
        }

        console.log('🔄 카메라 → 헤어체험 상태 초기화');
    }
}

// 전역 인스턴스 생성
window.cameraToHair = new CameraToHairExperience();

// 기존 앱과 통합을 위한 함수들
window.triggerPersonalColorAnalysisComplete = function(analysisData) {
    const event = new CustomEvent('personalColorAnalysisComplete', {
        detail: analysisData
    });
    document.dispatchEvent(event);
};

window.triggerPhotoCaptured = function(photoData) {
    const event = new CustomEvent('photoCaptured', {
        detail: photoData
    });
    document.dispatchEvent(event);
};

console.log('📷🎨 미디어파이프 → 헤어체험 연동 완료');
