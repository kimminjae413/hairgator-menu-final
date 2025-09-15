// ========== AKOOL Face Swap API 서비스 (백엔드 연동) ==========

class AkoolService {
    constructor() {
        // 백엔드를 통해서만 API 호출
        this.backendService = window.faceSwapBackend;
        this.isInitialized = false;
    }

    // 초기화 확인
    async init() {
        if (!this.backendService) {
            console.warn('Face Swap 백엔드 서비스가 없습니다');
            return false;
        }
        
        // 백엔드 연결 상태 확인
        const connectionInfo = this.backendService.getConnectionInfo();
        this.isInitialized = connectionInfo.isConnected;
        
        if (!this.isInitialized) {
            console.log('백엔드 서비스 연결 시도 중...');
            await this.backendService.testConnection();
            this.isInitialized = this.backendService.isConnected;
        }
        
        return this.isInitialized;
    }

    // Face Swap 실행 (백엔드를 통해)
async faceSwap(customerImageUrl, styleImageUrl) {
    // ========== GPT 리다이렉트 로직 추가 ==========
    console.log('🚫 AKOOL faceSwap 호출 차단 - GPT Image 1으로 리다이렉트');
    
    if (typeof showToast === 'function') {
        showToast('🆕 GPT Image 1으로 업그레이드되었습니다!', 'info');
    }
    
    return {
        success: false,
        error: 'AKOOL 시스템이 GPT Image 1으로 업그레이드되었습니다'
    };
    // ========== 기존 코드 차단 ==========
    
    try {  // ← 기존 코드는 실행되지 않음
            // 초기화 확인
            if (!await this.init()) {
                throw new Error('Face Swap 백엔드 서버에 연결할 수 없습니다');
            }

            console.log('🤖 백엔드를 통한 Face Swap 시작:', {
                customer: customerImageUrl?.slice(0, 50) + '...',
                style: styleImageUrl?.slice(0, 50) + '...'
            });

            // showToast 함수가 있으면 사용
            if (typeof showToast === 'function') {
                showToast('🔍 얼굴 분석 중...', 'info');
            }

            // 백엔드를 통해 Face Swap 실행
            const result = await this.backendService.processFaceSwap(customerImageUrl, styleImageUrl);

            if (result.success) {
                console.log('✅ Face Swap 완료:', result.imageUrl);
                
                if (typeof showToast === 'function') {
                    showToast('✅ AI 합성 완료!', 'success');
                }

                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    jobId: result.jobId || Date.now().toString()
                };
            } else {
                throw new Error(result.error || 'Face Swap 처리 실패');
            }

        } catch (error) {
            console.error('❌ Face Swap 오류:', error);
            
            if (typeof showToast === 'function') {
                let errorMessage = 'AI 처리 중 오류가 발생했습니다';
                
                if (error.message.includes('연결할 수 없습니다')) {
                    errorMessage = 'Face Swap 서버에 연결할 수 없습니다';
                } else if (error.message.includes('얼굴을 찾을 수 없습니다')) {
                    errorMessage = '사진에서 얼굴을 인식할 수 없습니다';
                }
                
                showToast(`❌ ${errorMessage}`, 'error');
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // 작업 상태 확인 (백엔드를 통해)
    async checkJobStatus(jobId) {
        try {
            if (!this.backendService || !this.backendService.isConnected) {
                return { success: false, error: '백엔드 연결 없음' };
            }

            return await this.backendService.checkJobStatus(jobId);
            
        } catch (error) {
            console.error('작업 상태 확인 오류:', error);
            return { success: false, error: error.message };
        }
    }

    // 크레딧 정보 확인 (더미 구현)
    async getCreditInfo() {
        try {
            // 실제로는 백엔드를 통해 확인해야 함
            return {
                success: true,
                credit: 10 // 임시 크레딧
            };
        } catch (error) {
            console.error('크레딧 정보 조회 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 연결 상태 확인
    isConnected() {
        return this.backendService && this.backendService.isConnected;
    }

    // 백엔드 정보 가져오기
    getBackendInfo() {
        if (this.backendService) {
            return this.backendService.getConnectionInfo();
        }
        return { isConnected: false, error: 'Backend service not available' };
    }
}

// 전역 AKOOL 서비스 인스턴스
window.akoolService = new AkoolService();

// 초기화 함수
document.addEventListener('DOMContentLoaded', async function() {
    // Face Swap 백엔드가 로드될 때까지 대기
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        if (window.faceSwapBackend) {
            console.log('🔗 AKOOL 서비스가 백엔드에 연결됨');
            break;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!window.faceSwapBackend) {
        console.warn('⚠️ Face Swap 백엔드를 찾을 수 없습니다');
    }
});

console.log('🔧 AKOOL 서비스 (백엔드 연동 버전) 로드 완료');

console.log('🔧 AKOOL 서비스 (백엔드 연동 버전) 로드 완료');

// ========== AKOOL 시스템 업그레이드 안내 ==========
console.log('🔄 AKOOL Service → GPT Image 1 업그레이드 완료');
window.AKOOL_SYSTEM_UPGRADED = true;
