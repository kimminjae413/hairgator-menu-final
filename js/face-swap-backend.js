// js/face-swap-backend.js
// Face Swap 백엔드 연결 관리 모듈 - 새로 생성할 파일

class FaceSwapBackend {
    constructor() {
        // 환경에 따른 백엔드 URL 설정
        this.baseURL = this.getBackendURL();
        this.webhookURL = `${this.baseURL}/api/webhook`;
        this.isConnected = false;
        this.connectionChecked = false;
        
        console.log('🔧 Face Swap 백엔드 초기화:', this.baseURL);
    }

    // 환경별 백엔드 URL 결정
  getBackendURL() {
    // 백엔드 서버가 없으므로 데모 모드
    return 'http://demo-mode';  // 존재하지 않는 URL로 설정
}

    // 백엔드 서버 연결 테스트
    async testConnection() {
        console.log('🔍 Face Swap 백엔드 연결 테스트 시작...', this.baseURL);
        
        try {
            // 타임아웃 설정 (5초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                this.isConnected = true;
                this.connectionChecked = true;
                
                console.log('✅ Face Swap 백엔드 연결 성공:', result);
                this.updateConnectionStatus(true);
                
                return { success: true, data: result };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            this.isConnected = false;
            this.connectionChecked = true;
            
            const errorMsg = error.name === 'AbortError' 
                ? '연결 시간 초과 (5초)' 
                : error.message;
            
            console.error('❌ Face Swap 백엔드 연결 실패:', errorMsg);
            this.updateConnectionStatus(false, errorMsg);
            
            return { success: false, error: errorMsg };
        }
    }

    // UI 연결 상태 업데이트
    updateConnectionStatus(connected, errorMsg = null) {
        const elements = {
            // 로딩 화면 상태
            backendStatus: document.getElementById('backendStatus'),
            // 헤더 AI 상태
            aiServerStatus: document.getElementById('aiServerStatus'),
            // 사이드바 연결 상태
            connectionStatus: document.getElementById('connectionStatus')
        };

        if (connected) {
            // 연결 성공 상태 업데이트
            if (elements.backendStatus) {
                elements.backendStatus.innerHTML = 
                    '<span style="color: #4CAF50;">✅ Face Swap 서버 연결됨</span>';
            }
            
            if (elements.aiServerStatus) {
                elements.aiServerStatus.innerHTML = `
                    <span class="status-dot online"></span>
                    <span class="status-text">AI 준비완료</span>
                `;
            }
            
            if (elements.connectionStatus) {
                elements.connectionStatus.innerHTML = `
                    <div class="status-indicator">
                        <span class="dot online"></span>
                        <span class="text">AI 서버 연결됨</span>
                    </div>
                `;
            }
            
        } else {
            // 연결 실패 상태 업데이트
            const errorText = errorMsg ? ` (${errorMsg})` : '';
            
            if (elements.backendStatus) {
                elements.backendStatus.innerHTML = 
                    `<span style="color: #FF6B6B;">❌ Face Swap 서버 연결 실패${errorText}</span>`;
            }
            
            if (elements.aiServerStatus) {
                elements.aiServerStatus.innerHTML = `
                    <span class="status-dot offline"></span>
                    <span class="status-text">AI 연결 실패</span>
                `;
            }
            
            if (elements.connectionStatus) {
                elements.connectionStatus.innerHTML = `
                    <div class="status-indicator">
                        <span class="dot offline"></span>
                        <span class="text">AI 서버 연결 실패</span>
                    </div>
                `;
            }
        }
    }

    // Face Swap 처리 요청
    async processFaceSwap(customerImageUrl, styleImageUrl) {
        console.log('🤖 Face Swap 처리 시작:', { customerImageUrl, styleImageUrl });
        
        // 연결 상태 확인
        if (!this.isConnected) {
            console.log('🔄 백엔드 연결 재시도...');
            const connectionResult = await this.testConnection();
            if (!connectionResult.success) {
                throw new Error(`백엔드 서버 연결 실패: ${connectionResult.error}`);
            }
        }

        try {
            const requestPayload = {
                customer_image_url: customerImageUrl,
                style_image_url: styleImageUrl,
                timestamp: Date.now()
            };

            console.log('📤 Face Swap 요청 전송:', requestPayload);

            const response = await fetch(`${this.baseURL}/api/face-swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            const result = await response.json();
            console.log('📥 Face Swap 응답:', result);
            
            if (response.ok && result.success) {
                console.log('✅ Face Swap 처리 성공:', result.result_image_url);
                
                return {
                    success: true,
                    imageUrl: result.result_image_url,
                    jobId: result.job_id || Date.now().toString(),
                    processingTime: result.processing_time
                };
                
            } else {
                throw new Error(result.error || result.message || 'Face Swap 처리 실패');
            }
            
        } catch (error) {
            console.error('❌ Face Swap 처리 오류:', error);
            
            // 네트워크 오류인 경우 연결 상태 업데이트
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.isConnected = false;
                this.updateConnectionStatus(false, '네트워크 오류');
            }
            
            throw error;
        }
    }

    // 작업 상태 확인
    async checkJobStatus(jobId) {
        if (!jobId) return { success: false, error: 'Job ID가 없습니다' };
        
        try {
            const response = await fetch(`${this.baseURL}/api/status/${jobId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                return {
                    success: true,
                    status: result.status,
                    progress: result.progress,
                    imageUrl: result.result_url
                };
            } else {
                throw new Error(result.error || '상태 확인 실패');
            }
            
        } catch (error) {
            console.error('상태 확인 오류:', error);
            return { success: false, error: error.message };
        }
    }

    // 백엔드 URL 수동 업데이트 (설정에서 사용)
    updateBackendURL(newURL) {
        if (!newURL || !newURL.trim()) {
            console.error('유효하지 않은 URL입니다');
            return false;
        }
        
        // URL 정규화
        const cleanURL = newURL.trim().replace(/\/$/, ''); // 끝의 / 제거
        
        this.baseURL = cleanURL;
        this.webhookURL = `${cleanURL}/api/webhook`;
        this.isConnected = false;
        this.connectionChecked = false;
        
        console.log('🔄 백엔드 URL 업데이트:', cleanURL);
        
        // 로컬 스토리지에 저장
        try {
            localStorage.setItem('hairgator_backend_url', cleanURL);
        } catch (error) {
            console.warn('URL 저장 실패:', error);
        }
        
        return true;
    }

    // 저장된 URL 로드
    loadSavedURL() {
        try {
            const savedURL = localStorage.getItem('hairgator_backend_url');
            if (savedURL) {
                this.updateBackendURL(savedURL);
                console.log('💾 저장된 백엔드 URL 로드:', savedURL);
                return true;
            }
        } catch (error) {
            console.warn('저장된 URL 로드 실패:', error);
        }
        return false;
    }

    // 연결 상태 정보 반환
    getConnectionInfo() {
        return {
            baseURL: this.baseURL,
            isConnected: this.isConnected,
            connectionChecked: this.connectionChecked,
            webhookURL: this.webhookURL
        };
    }
}

// 전역 인스턴스 생성
window.faceSwapBackend = new FaceSwapBackend();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Face Swap 백엔드 모듈 초기화 시작...');
    
    // 저장된 URL 로드
    window.faceSwapBackend.loadSavedURL();
    
    // Firebase 초기화 대기 후 연결 테스트 (3초 후)
    setTimeout(async () => {
        console.log('🔍 Face Swap 백엔드 연결 테스트 실행...');
        await window.faceSwapBackend.testConnection();
    }, 3000);
    
    // 주기적 연결 상태 체크 (30초마다)
    setInterval(async () => {
        if (window.faceSwapBackend.isConnected) {
            // 간단한 핑 테스트
            try {
                await window.faceSwapBackend.testConnection();
            } catch (error) {
                console.warn('주기적 연결 체크 실패:', error.message);
            }
        }
    }, 30000);
});

// 전역 함수 노출 (디버깅용)
window.faceSwapDebug = {
    testConnection: () => window.faceSwapBackend.testConnection(),
    getInfo: () => window.faceSwapBackend.getConnectionInfo(),
    updateURL: (url) => window.faceSwapBackend.updateBackendURL(url)
};

console.log('🔧 Face Swap 백엔드 모듈 로드 완료');

// CSS 스타일 추가 (연결 상태 표시용)
const faceSwapStyles = `
<style id="face-swap-styles">
/* AI 서버 상태 표시 */
.ai-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 20px;
    font-size: 12px;
    border: 1px solid #333;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

.status-dot.online {
    background: #4CAF50;
    box-shadow: 0 0 8px #4CAF50;
    animation: pulse 2s infinite;
}

.status-dot.offline {
    background: #FF6B6B;
}

.status-text {
    color: #fff;
    font-weight: 500;
}

/* 사이드바 연결 상태 */
.status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    margin-top: 10px;
}

.status-indicator .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.status-indicator .dot.online {
    background: #4CAF50;
    box-shadow: 0 0 6px #4CAF50;
}

.status-indicator .dot.offline {
    background: #FF6B6B;
}

.status-indicator .text {
    color: #fff;
    font-size: 14px;
}

/* 펄스 애니메이션 */
@keyframes pulse {
    0% { box-shadow: 0 0 8px #4CAF50; }
    50% { box-shadow: 0 0 16px #4CAF50, 0 0 24px #4CAF50; }
    100% { box-shadow: 0 0 8px #4CAF50; }
}

/* 백엔드 상태 (로딩 화면용) */
.backend-status {
    margin-top: 10px;
    font-size: 14px;
    text-align: center;
}
</style>
`;

// 스타일 주입
document.head.insertAdjacentHTML('beforeend', faceSwapStyles);
