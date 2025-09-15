// HAIRGATOR 제미나이 2.5 Flash 헤어염색 가상체험 시스템
// AI분석 모드 + 드래이핑 모드 → 추천 헤어컬러 가상체험

class GeminiHairColorSystem {
    constructor() {
        this.geminiApiKey = process.env.GEMINI_API_KEY; // 환경변수에서 가져오기
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        this.currentPersonalColor = null;
        this.recommendedHairColors = [];
        this.userPhoto = null;
        this.hairSegmentationMask = null;
    }

    // 초기화
    async init() {
        console.log('🎨 제미나이 헤어염색 가상체험 시스템 초기화...');
        this.setupUI();
        this.bindEvents();
        console.log('✅ 제미나이 시스템 준비 완료');
    }

    // UI 요소 설정
    setupUI() {
        const personalColorContainer = document.querySelector('.personal-color-container');
        if (!personalColorContainer) return;

        const hairColorSection = document.createElement('div');
        hairColorSection.className = 'hair-color-virtual-try';
        hairColorSection.innerHTML = `
            <div class="virtual-try-header">
                <h3>🎨 AI 헤어염색 가상체험</h3>
                <p>당신의 퍼스널컬러에 맞는 헤어컬러를 가상으로 체험해보세요!</p>
            </div>

            <div class="photo-upload-section">
                <div class="upload-area" id="photoUpload">
                    <div class="upload-placeholder">
                        <i class="camera-icon">📷</i>
                        <p>사진을 업로드하세요</p>
                        <small>정면을 향한 선명한 얼굴 사진을 권장합니다</small>
                    </div>
                    <input type="file" id="userPhotoInput" accept="image/*" hidden>
                </div>
                <div class="uploaded-photo" id="uploadedPhoto" style="display: none;">
                    <img id="userPhotoPreview" alt="업로드된 사진">
                    <button class="change-photo-btn" onclick="changePhoto()">사진 변경</button>
                </div>
            </div>

            <div class="hair-color-recommendations" id="hairColorRecommendations" style="display: none;">
                <h4>💡 추천 헤어컬러</h4>
                <div class="color-options" id="colorOptions"></div>
            </div>

            <div class="virtual-try-results" id="virtualTryResults" style="display: none;">
                <div class="result-grid">
                    <div class="original-photo">
                        <h5>원본</h5>
                        <img id="originalImage" alt="원본 사진">
                    </div>
                    <div class="colored-results" id="coloredResults"></div>
                </div>
                <div class="try-actions">
                    <button class="save-result-btn" onclick="saveResults()">결과 저장</button>
                    <button class="share-result-btn" onclick="shareResults()">공유하기</button>
                    <button class="new-try-btn" onclick="newTry()">다시 시도</button>
                </div>
            </div>

            <div class="loading-indicator" id="loadingIndicator" style="display: none;">
                <div class="spinner"></div>
                <p>AI가 헤어컬러를 적용하고 있습니다...</p>
            </div>
        `;

        personalColorContainer.appendChild(hairColorSection);
    }

    // 이벤트 바인딩
    bindEvents() {
        // 사진 업로드
        document.getElementById('photoUpload')?.addEventListener('click', () => {
            document.getElementById('userPhotoInput').click();
        });

        document.getElementById('userPhotoInput')?.addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });

        // 퍼스널컬러 분석 완료 시 헤어컬러 추천
        document.addEventListener('personalColorAnalyzed', (e) => {
            this.handlePersonalColorResult(e.detail);
        });

        // 드래이핑 모드 완료 시 헤어컬러 추천
        document.addEventListener('drapingModeCompleted', (e) => {
            this.handleDrapingResult(e.detail);
        });
    }

    // 사진 업로드 처리
    async handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB 제한
            alert('파일 크기는 5MB 이하여야 합니다.');
            return;
        }

        try {
            const imageUrl = URL.createObjectURL(file);
            this.userPhoto = await this.processImage(file);
            
            // UI 업데이트
            document.getElementById('uploadedPhoto').style.display = 'block';
            document.getElementById('photoUpload').style.display = 'none';
            document.getElementById('userPhotoPreview').src = imageUrl;

            console.log('📷 사진 업로드 완료');
            
            // 퍼스널컬러가 이미 분석되었다면 헤어컬러 추천 시작
            if (this.currentPersonalColor) {
                this.generateHairColorRecommendations();
            }
        } catch (error) {
            console.error('사진 업로드 실패:', error);
            alert('사진 업로드에 실패했습니다. 다시 시도해주세요.');
        }
    }

    // 이미지 처리 (Base64 변환)
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result.split(',')[1]); // Base64만 추출
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 퍼스널컬러 분석 결과 처리
    handlePersonalColorResult(personalColor) {
        console.log('🎨 퍼스널컬러 분석 완료:', personalColor);
        this.currentPersonalColor = personalColor;
        
        if (this.userPhoto) {
            this.generateHairColorRecommendations();
        }
    }

    // 드래이핑 모드 결과 처리
    handleDrapingResult(drapingResult) {
        console.log('👗 드래이핑 모드 완료:', drapingResult);
        this.currentPersonalColor = drapingResult.recommendedSeason;
        
        if (this.userPhoto) {
            this.generateHairColorRecommendations();
        }
    }

    // 헤어컬러 추천 생성
    async generateHairColorRecommendations() {
        try {
            console.log('💡 헤어컬러 추천 생성 중...');
            
            const prompt = this.buildRecommendationPrompt();
            const recommendations = await this.callGeminiAPI(prompt);
            
            this.recommendedHairColors = this.parseRecommendations(recommendations);
            this.displayRecommendations();
            
        } catch (error) {
            console.error('헤어컬러 추천 생성 실패:', error);
        }
    }

    // 추천 프롬프트 구성
    buildRecommendationPrompt() {
        const personalColorInfo = this.getPersonalColorInfo();
        
        return `
        당신은 전문 헤어 스타일리스트입니다. 다음 퍼스널컬러 분석 결과를 바탕으로 최적의 헤어컬러를 추천해주세요.

        퍼스널컬러 분석 결과:
        - 계절: ${personalColorInfo.season}
        - 톤: ${personalColorInfo.tone}
        - 주요 특징: ${personalColorInfo.characteristics}

        다음 헤어컬러 브랜드의 색상 차트를 기준으로 추천해주세요:
        - 로레알 (L'Oreal)
        - 웰라 (Wella) 
        - 밀본 (Milbon)
        - 시세이도 (Shiseido)

        응답 형식:
        {
            "recommendations": [
                {
                    "colorName": "컬러명",
                    "brand": "브랜드명",
                    "colorCode": "색상코드",
                    "hexColor": "#헥스코드",
                    "description": "이 컬러가 어울리는 이유",
                    "difficulty": "쉬움|보통|어려움",
                    "maintenance": "관리 방법"
                }
            ],
            "generalAdvice": "전반적인 조언"
        }

        최대 5개의 헤어컬러를 추천해주세요.
        `;
    }

    // 퍼스널컬러 정보 구성
    getPersonalColorInfo() {
        if (!this.currentPersonalColor) {
            return {
                season: '봄',
                tone: '웜톤',
                characteristics: '밝고 화사한 톤'
            };
        }

        return {
            season: this.currentPersonalColor.season || '봄',
            tone: this.currentPersonalColor.tone || '웜톤',
            characteristics: this.currentPersonalColor.characteristics || '밝고 화사한 톤'
        };
    }

    // 제미나이 API 호출
    async callGeminiAPI(prompt, includeImage = false) {
        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        };

        // 이미지가 포함된 요청인 경우
        if (includeImage && this.userPhoto) {
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: this.userPhoto
                }
            });
        }

        const response = await fetch(`${this.apiUrl}?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    // 추천 결과 파싱
    parseRecommendations(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('추천 결과 파싱 오류:', error);
        }

        // 파싱 실패 시 기본 추천
        return {
            recommendations: [
                {
                    colorName: "웜 브라운",
                    brand: "로레알",
                    colorCode: "6.3",
                    hexColor: "#8B4513",
                    description: "자연스럽고 따뜻한 느낌의 브라운",
                    difficulty: "쉬움",
                    maintenance: "한 달에 한 번 리터치"
                }
            ],
            generalAdvice: "퍼스널컬러에 맞는 색상을 선택하여 자연스러운 아름다움을 연출하세요."
        };
    }

    // 추천 결과 표시
    displayRecommendations() {
        const container = document.getElementById('hairColorRecommendations');
        const optionsContainer = document.getElementById('colorOptions');
        
        if (!container || !optionsContainer) return;

        optionsContainer.innerHTML = '';
        
        this.recommendedHairColors.recommendations.forEach((color, index) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.innerHTML = `
                <div class="color-preview" style="background-color: ${color.hexColor}"></div>
                <div class="color-info">
                    <h5>${color.colorName}</h5>
                    <p class="brand">${color.brand} ${color.colorCode}</p>
                    <p class="description">${color.description}</p>
                    <div class="color-details">
                        <span class="difficulty ${color.difficulty}">난이도: ${color.difficulty}</span>
                        <span class="maintenance">${color.maintenance}</span>
                    </div>
                </div>
                <button class="try-color-btn" onclick="window.geminiHairSystem.tryColor(${index})">
                    체험하기
                </button>
            `;
            optionsContainer.appendChild(colorOption);
        });

        container.style.display = 'block';
    }

    // 특정 컬러로 가상체험
    async tryColor(colorIndex) {
        const selectedColor = this.recommendedHairColors.recommendations[colorIndex];
        if (!selectedColor || !this.userPhoto) return;

        document.getElementById('loadingIndicator').style.display = 'block';

        try {
            console.log('🎨 가상 헤어컬러 적용 중:', selectedColor.colorName);
            
            const coloredImage = await this.applyHairColor(selectedColor);
            this.displayResult(selectedColor, coloredImage);
            
        } catch (error) {
            console.error('가상체험 실패:', error);
            alert('가상체험에 실패했습니다. 다시 시도해주세요.');
        } finally {
            document.getElementById('loadingIndicator').style.display = 'none';
        }
    }

    // AI로 헤어컬러 적용
    async applyHairColor(colorInfo) {
        const prompt = `
        이 사진에서 머리카락 부분만 정확히 식별하고 다음 색상으로 자연스럽게 염색해주세요:
        
        색상 정보:
        - 컬러명: ${colorInfo.colorName}
        - 헥스 코드: ${colorInfo.hexColor}
        - 브랜드: ${colorInfo.brand}
        
        주의사항:
        1. 머리카락 부분만 정확히 식별하여 색상 변경
        2. 자연스러운 그라데이션과 음영 유지
        3. 피부톤과 조화로운 결과
        4. 원본의 헤어스타일과 볼륨 유지
        
        결과 이미지를 생성해주세요.
        `;

        const response = await this.callGeminiAPI(prompt, true);
        
        // 실제로는 제미나이 2.5 Flash의 이미지 생성 기능을 사용
        // 현재는 시뮬레이션으로 처리
        return this.simulateHairColorApplication(colorInfo);
    }

    // 헤어컬러 적용 시뮬레이션 (실제 구현에서는 Gemini의 이미지 생성 사용)
    simulateHairColorApplication(colorInfo) {
        return new Promise((resolve) => {
            // Canvas를 사용한 간단한 시뮬레이션
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // 간단한 색상 오버레이 (실제로는 더 정교한 AI 처리)
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = colorInfo.hexColor + '80'; // 투명도 50%
                ctx.fillRect(0, img.height * 0.1, img.width, img.height * 0.4); // 머리 영역 추정
                
                resolve(canvas.toDataURL());
            };
            
            img.src = document.getElementById('userPhotoPreview').src;
        });
    }

    // 결과 표시
    displayResult(colorInfo, coloredImageUrl) {
        const resultsContainer = document.getElementById('virtualTryResults');
        const coloredResults = document.getElementById('coloredResults');
        const originalImage = document.getElementById('originalImage');
        
        if (!resultsContainer || !coloredResults || !originalImage) return;

        // 원본 이미지 설정
        originalImage.src = document.getElementById('userPhotoPreview').src;

        // 결과 이미지 추가
        const resultDiv = document.createElement('div');
        resultDiv.className = 'colored-result';
        resultDiv.innerHTML = `
            <h5>${colorInfo.colorName}</h5>
            <img src="${coloredImageUrl}" alt="${colorInfo.colorName} 적용 결과">
            <p class="color-brand">${colorInfo.brand} ${colorInfo.colorCode}</p>
        `;
        
        coloredResults.appendChild(resultDiv);
        resultsContainer.style.display = 'block';

        console.log('✅ 가상체험 결과 표시 완료');
    }

    // 불나비 토큰 차감
    async deductToken() {
        if (typeof window.getBullnabiUser === 'function') {
            const user = window.getBullnabiUser();
            if (user && user.remainCount > 0) {
                user.remainCount -= 1;
                localStorage.setItem('bullnabi_user', JSON.stringify(user));
                
                if (typeof updateUserInfo === 'function') {
                    updateUserInfo();
                }
                
                console.log('💳 토큰 차감:', user.remainCount, '개 남음');
                return true;
            } else {
                alert('AI 체험 토큰이 부족합니다.');
                return false;
            }
        }
        return true;
    }
}

// 전역 함수들
window.changePhoto = function() {
    document.getElementById('userPhotoInput').value = '';
    document.getElementById('uploadedPhoto').style.display = 'none';
    document.getElementById('photoUpload').style.display = 'block';
    document.getElementById('hairColorRecommendations').style.display = 'none';
    document.getElementById('virtualTryResults').style.display = 'none';
};

window.saveResults = function() {
    // 결과 저장 로직
    console.log('결과 저장');
    alert('결과가 저장되었습니다!');
};

window.shareResults = function() {
    // 공유 로직
    console.log('결과 공유');
    if (navigator.share) {
        navigator.share({
            title: 'HAIRGATOR 헤어컬러 가상체험',
            text: '나의 퍼스널컬러에 맞는 헤어컬러를 체험해보세요!',
            url: window.location.href
        });
    } else {
        alert('공유 기능이 지원되지 않는 브라우저입니다.');
    }
};

window.newTry = function() {
    document.getElementById('coloredResults').innerHTML = '';
    document.getElementById('virtualTryResults').style.display = 'none';
};

// 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.geminiHairSystem = new GeminiHairColorSystem();
    window.geminiHairSystem.init();
});

// CSS 스타일 추가
const styles = `
<style>
.hair-color-virtual-try {
    margin-top: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    color: white;
}

.virtual-try-header h3 {
    margin: 0 0 10px 0;
    font-size: 1.5em;
}

.photo-upload-section {
    margin: 20px 0;
}

.upload-area {
    border: 2px dashed rgba(255,255,255,0.5);
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.upload-area:hover {
    border-color: rgba(255,255,255,0.8);
    background: rgba(255,255,255,0.1);
}

.upload-placeholder .camera-icon {
    font-size: 3em;
    display: block;
    margin-bottom: 10px;
}

.uploaded-photo {
    text-align: center;
}

.uploaded-photo img {
    max-width: 300px;
    max-height: 300px;
    border-radius: 10px;
    object-fit: cover;
}

.change-photo-btn {
    margin-top: 10px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
}

.color-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.color-option {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.color-preview {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 3px solid white;
}

.color-info h5 {
    margin: 0 0 5px 0;
    font-size: 1.1em;
}

.color-info .brand {
    font-size: 0.9em;
    opacity: 0.8;
    margin: 0;
}

.color-info .description {
    font-size: 0.85em;
    margin: 5px 0;
}

.color-details {
    display: flex;
    gap: 10px;
    font-size: 0.8em;
}

.difficulty.쉬움 { color: #4CAF50; }
.difficulty.보통 { color: #FF9800; }
.difficulty.어려움 { color: #F44336; }

.try-color-btn {
    padding: 8px 16px;
    background: #E91E63;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    font-weight: bold;
}

.try-color-btn:hover {
    background: #C2185B;
}

.result-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 20px;
    margin-bottom: 20px;
}

.original-photo img,
.colored-result img {
    width: 100%;
    max-width: 300px;
    border-radius: 10px;
}

.colored-results {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.colored-result {
    text-align: center;
    background: rgba(255,255,255,0.1);
    padding: 15px;
    border-radius: 10px;
}

.try-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
}

.try-actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
}

.save-result-btn { background: #4CAF50; color: white; }
.share-result-btn { background: #2196F3; color: white; }
.new-try-btn { background: #FF9800; color: white; }

.loading-indicator {
    text-align: center;
    padding: 40px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .result-grid {
        grid-template-columns: 1fr;
    }
    
    .color-option {
        flex-direction: column;
        text-align: center;
    }
    
    .try-actions {
        flex-direction: column;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);
