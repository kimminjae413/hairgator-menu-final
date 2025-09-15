// personal-color/gemini-integration.js
// HAIRGATOR용 Gemini API 헤어컬러 서비스 (완전 새 파일)

class HAIRGATORGeminiIntegration {
    constructor() {
        this.apiKey = null;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        
        // 기존 614개 데이터에서 퍼스널컬러별 추천 컬러 추출
        this.personalColorMapping = this.extractPersonalColorMapping();
        
        console.log('🎨 HAIRGATOR Gemini 통합 모듈 로드 완료');
        console.log('📊 614개 헤어컬러 데이터 분석 완료');
    }

    // 기존 614개 데이터에서 퍼스널컬러별 매핑 추출
    extractPersonalColorMapping() {
        if (typeof HAIR_COLOR_614_DATA === 'undefined') {
            console.warn('⚠️ 614개 헤어컬러 데이터를 찾을 수 없습니다');
            return this.getFallbackMapping();
        }

        const mapping = {
            spring: [],
            summer: [],
            autumn: [],
            winter: []
        };

        // 614개 데이터에서 계절별로 분류
        HAIR_COLOR_614_DATA.forEach(color => {
            const season = color.season?.toLowerCase();
            if (mapping[season]) {
                mapping[season].push({
                    name: color.name,
                    hex: color.hex,
                    brand: color.brand,
                    code: color.code,
                    subType: color.sub_type
                });
            }
        });

        // 각 계절별로 최대 8개까지만 선택 (다양성 확보)
        Object.keys(mapping).forEach(season => {
            if (mapping[season].length > 8) {
                mapping[season] = this.selectDiverseColors(mapping[season], 8);
            }
        });

        return mapping;
    }

    // 다양한 컬러 선택 (밝기와 톤 기준)
    selectDiverseColors(colors, count) {
        // 서브타입별로 그룹화
        const grouped = {};
        colors.forEach(color => {
            const subType = color.subType || 'Other';
            if (!grouped[subType]) grouped[subType] = [];
            grouped[subType].push(color);
        });

        // 각 그룹에서 균등하게 선택
        const selected = [];
        const subTypes = Object.keys(grouped);
        const perGroup = Math.ceil(count / subTypes.length);

        subTypes.forEach(subType => {
            const group = grouped[subType];
            const take = Math.min(perGroup, group.length);
            selected.push(...group.slice(0, take));
        });

        return selected.slice(0, count);
    }

    // 폴백 매핑 (614개 데이터 없을 때)
    getFallbackMapping() {
        return {
            spring: [
                { name: 'Golden Blonde', hex: '#F0C383', brand: 'L\'Oreal', code: '9.3' },
                { name: 'Honey Brown', hex: '#B8860B', brand: 'L\'Oreal', code: '7.3' },
                { name: 'Warm Auburn', hex: '#A0522D', brand: 'L\'Oreal', code: '6.43' },
                { name: 'Caramel Brown', hex: '#C2691E', brand: 'L\'Oreal', code: '7.43' }
            ],
            summer: [
                { name: 'Ash Brown', hex: '#9B8770', brand: 'L\'Oreal', code: '6.1' },
                { name: 'Cool Blonde', hex: '#E6E6FA', brand: 'L\'Oreal', code: '9.1' },
                { name: 'Rose Brown', hex: '#BC8F8F', brand: 'L\'Oreal', code: '6.12' },
                { name: 'Soft Black', hex: '#2F2F2F', brand: 'L\'Oreal', code: '4.0' }
            ],
            autumn: [
                { name: 'Deep Auburn', hex: '#8B4513', brand: 'L\'Oreal', code: '5.64' },
                { name: 'Chocolate Brown', hex: '#5B3A29', brand: 'L\'Oreal', code: '4.3' },
                { name: 'Rich Burgundy', hex: '#6D2633', brand: 'L\'Oreal', code: '5.66' },
                { name: 'Copper Red', hex: '#B87333', brand: 'L\'Oreal', code: '7.44' }
            ],
            winter: [
                { name: 'Jet Black', hex: '#0A0A0A', brand: 'L\'Oreal', code: '1.0' },
                { name: 'Blue Black', hex: '#1C1C2E', brand: 'L\'Oreal', code: '2.1' },
                { name: 'Platinum Blonde', hex: '#E2DACC', brand: 'L\'Oreal', code: '10.1' },
                { name: 'Cool Burgundy', hex: '#4A0E2B', brand: 'L\'Oreal', code: '4.62' }
            ]
        };
    }

    // API 키 설정
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('hairgator_gemini_api_key', apiKey);
        console.log('✅ Gemini API 키 설정 완료');
    }

    // 저장된 API 키 로드
    loadApiKey() {
        const saved = localStorage.getItem('hairgator_gemini_api_key');
        if (saved) {
            this.apiKey = saved;
            return true;
        }
        return false;
    }

    // 퍼스널컬러별 추천 헤어컬러 가져오기
    getRecommendedColors(personalColorType) {
        return this.personalColorMapping[personalColorType] || [];
    }

    // 파일을 Base64로 변환
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Gemini API로 헤어컬러 체험
    async tryHairColor(imageFile, colorData, personalColorType) {
        if (!this.apiKey) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }

        try {
            console.log(`🎨 헤어컬러 체험 시작: ${colorData.name} (${colorData.brand} ${colorData.code})`);
            
            const base64Image = await this.fileToBase64(imageFile);
            const prompt = this.generateDetailedPrompt(colorData, personalColorType);
            
            const requestData = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: imageFile.type,
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                    response_mime_type: "image/jpeg"
                }
            };

            const result = await this.callGeminiAPI(requestData);
            return this.extractImageFromResponse(result);

        } catch (error) {
            console.error('❌ 헤어컬러 체험 실패:', error);
            throw new Error(`헤어컬러 체험 실패: ${error.message}`);
        }
    }

    // 상세한 프롬프트 생성 (브랜드 정보 포함)
    generateDetailedPrompt(colorData, personalColorType) {
        const seasonInstructions = {
            spring: "Use warm, bright undertones with golden highlights. The color should be vibrant and luminous.",
            summer: "Use cool, soft undertones with ashy tones. The color should be muted and elegant.",
            autumn: "Use warm, deep undertones with rich, earthy tones. The color should be sophisticated and natural.",
            winter: "Use cool, intense undertones with clear, bold tones. The color should be dramatic and striking."
        };

        let prompt = `Change the hair color in this portrait photo to "${colorData.name}"`;
        
        if (colorData.brand && colorData.code) {
            prompt += ` (Professional hair color: ${colorData.brand} ${colorData.code})`;
        }
        
        prompt += ` with hex color ${colorData.hex}.`;

        if (seasonInstructions[personalColorType]) {
            prompt += ` ${seasonInstructions[personalColorType]}`;
        }

        prompt += ` Keep the original hair texture, style, and length exactly the same. Only change the hair color. The result should be photorealistic and natural-looking. Maintain proper lighting and shadows on the hair. Do not change the person's face, skin, or any other features.`;

        return prompt;
    }

    // Gemini API 호출
    async callGeminiAPI(requestData) {
        const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
    }

    // 응답에서 이미지 추출
    extractImageFromResponse(result) {
        if (result && result.candidates && result.candidates[0]) {
            const candidate = result.candidates[0];
            
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inline_data && part.inline_data.data) {
                        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
                    }
                }
            }
            
            // 텍스트 응답 (거부 등)
            if (candidate.content && candidate.content.parts && candidate.content.parts[0].text) {
                throw new Error(`AI 처리 거부: ${candidate.content.parts[0].text}`);
            }
        }
        
        throw new Error('AI에서 이미지를 생성하지 못했습니다.');
    }

    // 연결 테스트
    async testConnection() {
        if (!this.apiKey) {
            console.warn('⚠️ API 키가 설정되지 않았습니다');
            return false;
        }

        try {
            const testData = {
                contents: [{
                    parts: [{
                        text: "Hello, this is a connection test."
                    }]
                }]
            };

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                console.log('✅ Gemini API 연결 성공');
                return true;
            } else {
                console.error('❌ Gemini API 연결 실패:', response.status);
                return false;
            }

        } catch (error) {
            console.error('❌ Gemini API 연결 테스트 실패:', error);
            return false;
        }
    }
}

// 전역 인스턴스 생성
window.hairgatorGemini = new HAIRGATORGeminiIntegration();

// 초기화 시 API 키 로드 시도
window.hairgatorGemini.loadApiKey();

// 편의 함수들
window.setGeminiKey = (apiKey) => window.hairgatorGemini.setApiKey(apiKey);
window.getPersonalColorRecommendations = (type) => window.hairgatorGemini.getRecommendedColors(type);
window.testGeminiAPI = () => window.hairgatorGemini.testConnection();

console.log('🎨 HAIRGATOR 614개 헤어컬러 + Gemini 통합 완료');
