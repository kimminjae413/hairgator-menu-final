// js/face-swap-backend.js - Face Swap 백엔드 연결 관리
// 새로 생성할 파일

class FaceSwapBackend {
    constructor() {
        this.baseURL = this.getBackendURL();
        this.webhookURL = `${this.baseURL}/api/webhook`;
        this.isConnected = false;
        this.connectionChecked = false;
    }

    // 환경에 따른 백엔드 URL 결정
    getBackendURL() {
        // 로컬 개발환경
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://your-ngrok-url.ngrok-free.app'; // ngrok URL로 변경 필요
        }
        // 배포 환경
        return 'https://your-production-server.com'; // 실제 서버 URL로 변경 필요
    }

    // 백엔드 연결 테스트
    async testConnection() {
        console.log('🔍 Face Swap 백엔드 연결 테스트 시작...');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.isConnected = true;
                this.connectionChecked = true;
                console.log('✅ Face Swap 백엔드 연결 성공');
                this.updateConnectionStatus(true);
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            this.isConnected = false;
            this.connectionChecked = true;
            console.error('❌ Face Swap 백엔드 연결 실패:', error.message);
            this.updateConnectionStatus(false);
            return false;
        }
    }

    // 연결 상태 UI 업데이트
    updateConnectionStatus(connected) {
        // 로딩 화면
        const backendStatus = document.getElementById('backendStatus');
        if (backendStatus) {
            backendStatus.innerHTML = connected 
                ? '<span style="color: #4CAF50;">✅ Face Swap 서버 연결됨</span>'
                : '<span style="color: #FF6B6B;">❌ Face Swap 서버 연결 실패</span>';
        }

        // 헤더 상태
        const aiServerStatus = document.getElementById('aiServerStatus');
        if (aiServerStatus) {
            aiServerStatus.innerHTML = connected 
                ? '<span class="status-dot online"></span><span class="status-text">AI 준비완료</span>'
                : '<span class="status-dot offline"></span><span class="status-text">AI 연결 실패</span>';
        }

        // 사이드바 상태
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.innerHTML = connected 
                ? '<div class="status-indicator"><span class="dot online"></span><span class="text">AI 서버 연결됨</span></div>'
                : '<div class="status-indicator"><span class="dot offline"></span><span class="text">AI 서버 연결 실패</span></div>';
        }
    }

    // Face Swap 처리 요청
    async processFaceSwap(customerImageUrl, styleImageUrl) {
        if (!this.isConnected) {
            const connected = await this.testConnection();
            if (!connected) {
                throw new Error('백엔드 서버에 연결할 수 없습니다');
            }
        }

        try {
            console.log('🤖 Face Swap 처리 시작:', { customerImageUrl, styleImageUrl });
            
            const response = await fetch(`${this.baseURL}/api/face-swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_image_url: customerImageUrl,
                    style_image_url: styleImageUrl
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('✅ Face Swap 처리 성공:', result);
                return {
                    success: true,
                    imageUrl: result.result_image_url,
                    jobId: result.job_id
                };
            } else {
                throw new Error(result.error || 'Face Swap 처리 실패');
            }
            
        } catch (error) {
            console.error('❌ Face Swap 처리 오류:', error);
            throw error;
        }
    }

    // 처리 상태 확인
    async checkJobStatus(jobId) {
        try {
            const response = await fetch(`${this.baseURL}/api/status/${jobId}`);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('상태 확인 오류:', error);
            throw error;
        }
    }

    // URL 업데이트 (설정에서 사용)
    updateURL(newURL) {
        this.baseURL = newURL;
        this.webhookURL = `${newURL}/api/webhook`;
        this.isConnected = false;
        this.connectionChecked = false;
        console.log('🔄 백엔드 URL 업데이트:', newURL);
    }
}

// 전역 인스턴스 생성
window.faceSwapBackend = new FaceSwapBackend();

// 페이지 로드시 연결 테스트
document.addEventListener('DOMContentLoaded', function() {
    // Firebase 초기화 대기 후 백엔드 연결 테스트
    setTimeout(async () => {
        console.log('🚀 Face Swap 백엔드 초기화 시작...');
        await window.faceSwapBackend.testConnection();
    }, 3000);
});

console.log('🔧 Face Swap 백엔드 모듈 로드 완료');
