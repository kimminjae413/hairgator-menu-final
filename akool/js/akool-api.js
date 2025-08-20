// ========== AKOOL API 통신 모듈 ==========
// 환경변수에서 API 정보 가져오기 (네트리파이)

class AkoolAPI {
    constructor() {
        // 네트리파이 환경변수에서 가져오기
        this.apiKey = process.env.AKOOL_API_KEY || 'kdwRwzqnGf4zfAFvWCjFKQ==';
        this.secret = process.env.AKOOL_SECRET || 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g';
        
        this.baseURL = 'https://openapi.akool.com/api/open/v3';
        this.detectURL = 'https://sg3.akool.com/detect';
        
        this.isProcessing = false;
    }

    // ========== 1. 얼굴 감지 API ==========
    async detectFace(imageUrl, isSingleFace = true) {
        try {
            console.log('🔍 얼굴 감지 시작:', imageUrl);
            
            const response = await fetch(this.detectURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    single_face: isSingleFace,
                    image_url: imageUrl
                })
            });

            const result = await response.json();
            
            if (result.error_code !== 0) {
                throw new Error(`얼굴 감지 실패: ${result.error_msg}`);
            }

            console.log('✅ 얼굴 감지 성공:', result);
            
            return {
                success: true,
                landmarks: result.landmarks,
                landmarks_str: result.landmarks_str,
                region: result.region,
                detectedFaces: result.landmarks.length
            };

        } catch (error) {
            console.error('❌ 얼굴 감지 오류:', error);
            return {
                success: false,
                error: error.message,
                detectedFaces: 0
            };
        }
    }

    // ========== 2. 이미지 얼굴 바꾸기 API ==========
    async swapFace(customerImageUrl, hairstyleImageUrl, options = {}) {
        if (this.isProcessing) {
            throw new Error('이미 처리 중입니다. 잠시 후 다시 시도해주세요.');
        }

        this.isProcessing = true;

        try {
            console.log('🎨 얼굴 바꾸기 시작');
            console.log('👤 고객 이미지:', customerImageUrl);
            console.log('💇 헤어스타일 이미지:', hairstyleImageUrl);

            // 1단계: 고객 얼굴 감지
            const customerFace = await this.detectFace(customerImageUrl, true);
            if (!customerFace.success || customerFace.detectedFaces === 0) {
                throw new Error('고객 사진에서 얼굴을 감지할 수 없습니다. 정면 얼굴이 선명한 사진을 사용해주세요.');
            }

            // 2단계: 헤어스타일 이미지 얼굴 감지
            const styleFace = await this.detectFace(hairstyleImageUrl, true);
            if (!styleFace.success || styleFace.detectedFaces === 0) {
                throw new Error('헤어스타일 이미지에서 얼굴을 감지할 수 없습니다.');
            }

            // 3단계: Face Swap API 호출
            const swapResponse = await fetch(`${this.baseURL}/faceswap/highquality/specifyimage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetImage: [{
                        path: hairstyleImageUrl,
                        opts: styleFace.landmarks_str[0]
                    }],
                    sourceImage: [{
                        path: customerImageUrl,
                        opts: customerFace.landmarks_str[0]
                    }],
                    face_enhance: options.enhance ? 1 : 0,
                    modifyImage: hairstyleImageUrl,
                    webhookUrl: options.webhookUrl || ""
                })
            });

            const swapResult = await swapResponse.json();

            if (swapResult.code !== 1000) {
                throw new Error(`얼굴 바꾸기 실패: ${swapResult.msg}`);
            }

            console.log('✅ 얼굴 바꾸기 요청 성공:', swapResult);

            // 4단계: 결과 폴링 (처리 완료까지 기다리기)
            const finalResult = await this.waitForResult(swapResult.data._id);

            return {
                success: true,
                resultUrl: finalResult.url,
                jobId: swapResult.data.job_id,
                _id: swapResult.data._id,
                message: '헤어스타일 가상체험이 완성되었습니다!'
            };

        } catch (error) {
            console.error('❌ 얼굴 바꾸기 오류:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // ========== 3. 결과 상태 확인 및 대기 ==========
    async waitForResult(_id, maxRetries = 20, retryInterval = 10000) {
        console.log('⏳ 결과 처리 대기 중...', _id);

        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await this.getResultById(_id);
                
                if (result.success) {
                    const status = result.data.faceswap_status;
                    
                    switch (status) {
                        case 3: // Success
                            console.log('🎉 처리 완료!');
                            return {
                                success: true,
                                url: result.data.url,
                                status: 'completed'
                            };
                        
                        case 4: // Failed
                            throw new Error('얼굴 바꾸기 처리가 실패했습니다.');
                        
                        case 1: // In Queue
                            console.log('📋 대기열에 있습니다...');
                            break;
                        
                        case 2: // Processing
                            console.log('⚙️ 처리 중입니다...');
                            break;
                    }
                }

                // 10초 대기
                await new Promise(resolve => setTimeout(resolve, retryInterval));

            } catch (error) {
                console.error('결과 확인 오류:', error);
            }
        }

        throw new Error('처리 시간이 너무 오래 걸립니다. 나중에 다시 시도해주세요.');
    }

    // ========== 4. 결과 조회 ==========
    async getResultById(_id) {
        try {
            const response = await fetch(`${this.baseURL}/faceswap/result/listbyids?_ids=${_id}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            const result = await response.json();

            if (result.code !== 1000 || !result.data.result.length) {
                return { success: false };
            }

            return {
                success: true,
                data: result.data.result[0]
            };

        } catch (error) {
            console.error('결과 조회 오류:', error);
            return { success: false };
        }
    }

    // ========== 5. 크레딧 정보 조회 ==========
    async getCreditInfo() {
        try {
            const response = await fetch(`${this.baseURL}/faceswap/quota/info`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            const result = await response.json();

            if (result.code !== 1000) {
                throw new Error('크레딧 정보를 가져올 수 없습니다.');
            }

            return {
                success: true,
                credit: result.data.credit
            };

        } catch (error) {
            console.error('크레딧 조회 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== 6. 이미지 업로드 헬퍼 ==========
    async uploadImageToCloudinary(file) {
        // Cloudinary 또는 다른 이미지 호스팅 서비스 사용
        // 임시로 FileReader로 base64 변환 (실제로는 서버에 업로드해야 함)
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // 실제로는 서버로 업로드하고 URL을 받아야 함
                // 여기서는 임시로 base64 데이터 URL 반환
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ========== 7. 오류 처리 헬퍼 ==========
    handleError(error, context = '') {
        const errorMessages = {
            1003: '입력 매개변수가 잘못되었습니다.',
            1005: '요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요.',
            1006: '크레딧이 부족합니다.',
            1007: '얼굴이 너무 많습니다 (최대 8명).',
            1101: 'API 키가 유효하지 않거나 만료되었습니다.',
            1102: '인증 정보가 누락되었습니다.',
            1200: '계정이 차단되었습니다.'
        };

        const message = errorMessages[error.code] || error.message || '알 수 없는 오류가 발생했습니다.';
        
        console.error(`❌ ${context} 오류:`, message);
        return message;
    }
}

// 전역 인스턴스 생성
window.akoolAPI = new AkoolAPI();

console.log('🚀 AKOOL API 모듈 로드 완료');
