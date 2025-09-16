// ========== HAIRGATOR 헤어체험 AI 서비스 ==========

class HairExperienceService {
    constructor() {
        // Gemini API 설정 (내부 구현 숨김)
        this.config = {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
            model: 'gemini-2.5-flash-image-preview',
            apiKey: null, // 런타임에 로드
            timeout: 60000, // 60초 타임아웃
            maxRetries: 2
        };
        
        this.isInitialized = false;
        this.processingQueue = new Map();
    }

    // ========== 초기화 ==========
    async init() {
        try {
            console.log('🦎 헤어체험 AI 서비스 초기화 중...');
            
            // API 키 로드 시도
            this.config.apiKey = await this.loadApiKey();
            
            if (!this.config.apiKey) {
                console.warn('⚠️ AI 서비스 API 키가 설정되지 않았습니다');
                return false;
            }
            
            // 연결 테스트
            const healthCheck = await this.testConnection();
            if (healthCheck.success) {
                this.isInitialized = true;
                console.log('✅ 헤어체험 AI 서비스 초기화 완료');
                return true;
            } else {
                console.error('❌ AI 서비스 연결 실패:', healthCheck.error);
                return false;
            }
            
        } catch (error) {
            console.error('헤어체험 서비스 초기화 오류:', error);
            return false;
        }
    }

    // ========== API 키 로드 ==========
    async loadApiKey() {
        try {
            // 방법 1: 네틀리파이 함수를 통한 환경변수 접근
            if (typeof fetch !== 'undefined') {
                try {
                    const response = await fetch('/.netlify/functions/get-api-key');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.apiKey) {
                            return data.apiKey;
                        }
                    }
                } catch (e) {
                    console.log('네틀리파이 함수 접근 실패, 다른 방법 시도');
                }
            }
            
            // 방법 2: 전역 변수 확인 (개발용)
            if (window.GEMINI_API_KEY) {
                return window.GEMINI_API_KEY;
            }
            
            // 방법 3: 하드코딩된 키 (테스트용 - 실제로는 사용하지 않음)
            if (process?.env?.GEMINI_API_KEY) {
                return process.env.GEMINI_API_KEY;
            }
            
            return null;
            
        } catch (error) {
            console.error('API 키 로드 오류:', error);
            return null;
        }
    }

    // ========== 연결 테스트 ==========
    async testConnection() {
        try {
            const testResponse = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.config.apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "test" }]
                    }]
                }),
                signal: AbortSignal.timeout(10000) // 10초 테스트 타임아웃
            });

            if (testResponse.ok || testResponse.status === 400) {
                // 400도 연결은 성공 (잘못된 요청이지만 API는 응답)
                return { success: true };
            } else {
                const errorData = await testResponse.json().catch(() => ({}));
                return { 
                    success: false, 
                    error: errorData.error?.message || `연결 실패: ${testResponse.status}` 
                };
            }
            
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ========== 메인 헤어체험 처리 함수 ==========
    async processHairExperience(customerImageData, styleImageData, styleName = '') {
        try {
            if (!this.isInitialized) {
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('헤어체험 서비스에 연결할 수 없습니다');
                }
            }

            console.log('🎨 헤어체험 처리 시작:', {
                styleName: styleName,
                hasCustomerImage: !!customerImageData,
                hasStyleImage: !!styleImageData
            });

            // 이미지 데이터를 Base64로 변환
            const customerBase64 = await this.imageToBase64(customerImageData);
            const styleBase64 = await this.imageToBase64(styleImageData);

            // 헤어스타일 적용 프롬프트 생성
            const prompt = this.createHairTransferPrompt(styleName);

            // Gemini API 호출
            const result = await this.callGeminiAPI(prompt, customerBase64, styleBase64);

            if (result.success) {
                console.log('✅ 헤어체험 완료');
                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    jobId: Date.now().toString()
                };
            } else {
                throw new Error(result.error || '헤어체험 처리 실패');
            }

        } catch (error) {
            console.error('❌ 헤어체험 오류:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // ========== 헤어스타일 전송 프롬프트 생성 ==========
    createHairTransferPrompt(styleName) {
        let basePrompt = `첫 번째 이미지의 사람에게 두 번째 이미지의 헤어스타일을 정확히 적용해주세요. 
        
요구사항:
- 얼굴, 표정, 피부톤, 얼굴 형태는 첫 번째 이미지와 완전히 동일하게 유지
- 두 번째 이미지의 헤어스타일(모양, 길이, 색상, 질감)을 자연스럽게 적용
- 헤어라인과 얼굴의 연결 부분이 자연스럽게 보이도록 처리
- 조명과 그림자도 자연스럽게 조정
- 고화질, 사실적인 결과물 생성`;
        
        if (styleName && styleName.trim() !== '') {
            basePrompt += `\n\n적용할 헤어스타일: ${styleName}`;
        }
        
        return basePrompt;
    }

    // ========== Gemini API 호출 ==========
    async callGeminiAPI(prompt, customerBase64, styleBase64) {
        try {
            const requestBody = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: customerBase64
                            }
                        },
                        {
                            inline_data: {
                                mime_type: "image/jpeg", 
                                data: styleBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                }
            };

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.config.apiKey
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(this.config.timeout)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
            }

            const responseData = await response.json();
            
            // 생성된 이미지 추출
            const candidates = responseData.candidates;
            if (candidates && candidates.length > 0) {
                const parts = candidates[0].content.parts;
                
                for (const part of parts) {
                    if (part.inline_data && part.inline_data.data) {
                        // Base64 이미지 데이터를 Data URL로 변환
                        const mimeType = part.inline_data.mime_type || 'image/png';
                        const imageUrl = `data:${mimeType};base64,${part.inline_data.data}`;
                        return {
                            success: true,
                            imageUrl: imageUrl
                        };
                    }
                }
            }
            
            throw new Error('생성된 이미지를 찾을 수 없습니다');

        } catch (error) {
            console.error('API 호출 오류:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: '처리 시간이 초과되었습니다'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== 이미지를 Base64로 변환 ==========
    async imageToBase64(imageData) {
        try {
            if (typeof imageData === 'string') {
                // 이미 Data URL인 경우
                if (imageData.startsWith('data:image/')) {
                    return imageData.split(',')[1];
                }
                // 이미 Base64인 경우
                else if (imageData.match(/^[A-Za-z0-9+/=]+$/)) {
                    return imageData;
                }
                // URL인 경우 (Firebase Storage URL 등)
                else if (imageData.startsWith('http')) {
                    const response = await fetch(imageData);
                    const blob = await response.blob();
                    return await this.blobToBase64(blob);
                }
            }
            
            // File 객체나 Blob인 경우
            if (imageData instanceof File || imageData instanceof Blob) {
                return await this.blobToBase64(imageData);
            }
            
            throw new Error('지원하지 않는 이미지 형식입니다');
            
        } catch (error) {
            console.error('이미지 변환 오류:', error);
            throw new Error('이미지 처리 중 오류가 발생했습니다');
        }
    }

    // ========== Blob을 Base64로 변환 ==========
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ========== 에러 메시지 처리 ==========
    getErrorMessage(error) {
        let errorMessage = '헤어체험 중 오류가 발생했습니다';
        
        if (error.message.includes('연결할 수 없습니다')) {
            errorMessage = '헤어체험 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요';
        } else if (error.message.includes('API 키') || error.message.includes('인증')) {
            errorMessage = '서비스 인증 오류입니다. 관리자에게 문의해주세요';
        } else if (error.message.includes('시간') || error.message.includes('timeout')) {
            errorMessage = '처리 시간이 초과되었습니다. 다시 시도해주세요';
        } else if (error.message.includes('네트워크') || error.message.includes('Failed to fetch')) {
            errorMessage = '네트워크 연결을 확인해주세요';
        } else if (error.message.includes('이미지')) {
            errorMessage = '이미지 형식이 올바르지 않습니다. JPG 또는 PNG 파일을 사용해주세요';
        } else if (error.message.includes('할당량') || error.message.includes('quota')) {
            errorMessage = '일일 사용량을 초과했습니다. 내일 다시 시도해주세요';
        } else if (error.message.includes('403')) {
            errorMessage = 'API 접근 권한이 없습니다. 관리자에게 문의해주세요';
        } else if (error.message.includes('429')) {
            errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
        }
        
        return errorMessage;
    }

    // ========== 서비스 상태 확인 ==========
    isConnected() {
        return this.isInitialized && !!this.config.apiKey;
    }

    // ========== 서비스 정보 (디버깅용) ==========
    getServiceInfo() {
        return {
            isConnected: this.isConnected(),
            initialized: this.isInitialized,
            hasApiKey: !!this.config.apiKey,
            model: this.config.model
        };
    }

    // ========== 재시도 로직 ==========
    async retryOperation(operation, maxRetries = 2) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    const delay = Math.pow(2, i) * 1000; // 지수적 백오프
                    console.log(`재시도 ${i + 1}/${maxRetries} (${delay}ms 후)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
}

// ========== 전역 서비스 인스턴스 ==========
window.hairExperienceService = new HairExperienceService();

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🦎 HAIRGATOR 헤어체험 서비스 로드 완료');
    
    // 자동 초기화 (백그라운드에서)
    setTimeout(async () => {
        try {
            await window.hairExperienceService.init();
        } catch (error) {
            console.warn('헤어체험 서비스 백그라운드 초기화 실패:', error);
        }
    }, 2000);
});

// ========== 호환성 래퍼 (기존 akoolService 인터페이스 유지) ==========
window.akoolService = {
    async init() {
        return await window.hairExperienceService.init();
    },
    
    async faceSwap(customerImageUrl, styleImageUrl) {
        return await window.hairExperienceService.processHairExperience(
            customerImageUrl, 
            styleImageUrl
        );
    },
    
    isConnected() {
        return window.hairExperienceService.isConnected();
    },
    
    async getCreditInfo() {
        return {
            success: true,
            credit: 100
        };
    }
};

console.log('✨ HAIRGATOR 헤어체험 AI 서비스 준비 완료');
