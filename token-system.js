// HAIRGATOR Token System - Firebase 기반 토큰 관리
// Admin에서 설정한 토큰 비용을 실시간으로 가져와서 사용

class TokenSystem {
    constructor() {
        this.tokenCosts = new Map();
        this.isInitialized = false;
        this.currentUser = null;
        
        // 기본 토큰 비용 (Firebase 연결 실패 시 백업)
        this.defaultCosts = {
            'AI_FACE_ANALYSIS': 5,
            'CUSTOMER_REGISTER': 1,
            'RESERVATION_CREATE': 1,
            'BASIC_ANALYTICS': 2,
            'ADVANCED_RECOMMEND': 3,
            'DATA_EXPORT': 2,
            'BULK_OPERATIONS': 10
        };
        
        this.init();
    }
    
    // 토큰 시스템 초기화
    async init() {
        try {
            await this.loadTokenCosts();
            this.setupRealTimeUpdates();
            this.isInitialized = true;
            console.log('Token System 초기화 완료');
        } catch (error) {
            console.error('Token System 초기화 실패:', error);
            // 기본값 사용
            Object.keys(this.defaultCosts).forEach(key => {
                this.tokenCosts.set(key, this.defaultCosts[key]);
            });
            this.isInitialized = true;
        }
    }
    
    // Firebase에서 토큰 비용 로드
    async loadTokenCosts() {
        if (typeof db === 'undefined') {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const doc = await db.collection('metadata').doc('token_costs').get();
            
            if (doc.exists) {
                const data = doc.data();
                const costs = data.costs || {};
                
                // Firebase 데이터를 Map에 저장
                Object.keys(costs).forEach(featureKey => {
                    const cost = costs[featureKey].cost || 0;
                    this.tokenCosts.set(featureKey, cost);
                });
                
                console.log('Firebase에서 토큰 비용 로드 완료:', this.tokenCosts.size, '개 기능');
            } else {
                // 문서가 없으면 기본값 사용
                console.log('토큰 비용 문서 없음, 기본값 사용');
                Object.keys(this.defaultCosts).forEach(key => {
                    this.tokenCosts.set(key, this.defaultCosts[key]);
                });
            }
            
        } catch (error) {
            console.error('토큰 비용 로드 실패:', error);
            throw error;
        }
    }
    
    // 실시간 토큰 비용 업데이트 리스너
    setupRealTimeUpdates() {
        if (typeof db === 'undefined') {
            console.warn('Firebase 없음, 실시간 업데이트 비활성화');
            return;
        }
        
        try {
            // Firestore 실시간 리스너 설정
            db.collection('metadata').doc('token_costs')
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        const costs = data.costs || {};
                        
                        // 토큰 비용 맵 업데이트
                        this.tokenCosts.clear();
                        Object.keys(costs).forEach(featureKey => {
                            const cost = costs[featureKey].cost || 0;
                            this.tokenCosts.set(featureKey, cost);
                        });
                        
                        console.log('실시간 토큰 비용 업데이트:', this.tokenCosts.size, '개 기능');
                    }
                }, (error) => {
                    console.error('실시간 업데이트 오류:', error);
                });
                
        } catch (error) {
            console.error('실시간 리스너 설정 실패:', error);
        }
    }
    
    // 특정 기능의 토큰 비용 조회
    getTokenCost(featureKey) {
        if (!this.isInitialized) {
            console.warn('Token System이 아직 초기화되지 않음');
            return this.defaultCosts[featureKey] || 1;
        }
        
        const cost = this.tokenCosts.get(featureKey);
        if (cost === undefined) {
            console.warn(`토큰 비용을 찾을 수 없음: ${featureKey}, 기본값 1 사용`);
            return 1;
        }
        
        return cost;
    }
    
    // 현재 사용자 설정
    setCurrentUser(user) {
        this.currentUser = user;
    }
    
    // 사용자 토큰 잔액 확인
    checkBalance() {
        if (!this.currentUser) {
            return 0;
        }
        return this.currentUser.tokens || 0;
    }
    
    // 토큰 차감
    async deductTokens(amount, reason, featureKey) {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }
        
        const currentBalance = this.checkBalance();
        if (currentBalance < amount) {
            throw new Error(`토큰이 부족합니다 (필요: ${amount}, 보유: ${currentBalance})`);
        }
        
        try {
            // Firebase에서 토큰 차감
            if (typeof db !== 'undefined') {
                const userDoc = db.collection('designers').doc(this.currentUser.id);
                await userDoc.update({
                    tokens: firebase.firestore.FieldValue.increment(-amount),
                    tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                        amount: -amount,
                        reason: reason,
                        featureKey: featureKey,
                        timestamp: new Date(),
                        remainingTokens: currentBalance - amount
                    })
                });
            }
            
            // 로컬 사용자 정보 업데이트
            this.currentUser.tokens = currentBalance - amount;
            
            // localStorage 업데이트 (있다면)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
            }
            
            console.log(`토큰 차감 완료: ${amount}개 (${reason}) - 잔액: ${this.currentUser.tokens}`);
            return true;
            
        } catch (error) {
            console.error('토큰 차감 실패:', error);
            throw new Error(`토큰 차감 실패: ${error.message}`);
        }
    }
    
    // 토큰 복구 (기능 실행 실패 시)
    async refundTokens(amount, reason, originalFeatureKey) {
        if (!this.currentUser) {
            console.error('토큰 복구 실패: 사용자 정보 없음');
            return false;
        }
        
        try {
            // Firebase에서 토큰 복구
            if (typeof db !== 'undefined') {
                const userDoc = db.collection('designers').doc(this.currentUser.id);
                await userDoc.update({
                    tokens: firebase.firestore.FieldValue.increment(amount),
                    tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                        amount: amount,
                        reason: `REFUND: ${reason}`,
                        featureKey: originalFeatureKey,
                        timestamp: new Date(),
                        type: 'refund',
                        remainingTokens: this.checkBalance() + amount
                    })
                });
            }
            
            // 로컬 사용자 정보 업데이트
            this.currentUser.tokens = (this.currentUser.tokens || 0) + amount;
            
            // localStorage 업데이트 (있다면)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
            }
            
            console.log(`토큰 복구 완료: ${amount}개 (${reason}) - 잔액: ${this.currentUser.tokens}`);
            return true;
            
        } catch (error) {
            console.error('토큰 복구 실패:', error);
            return false;
        }
    }
    
    // 토큰 사용 기록 조회
    async getTokenHistory(limit = 10) {
        if (!this.currentUser || typeof db === 'undefined') {
            return [];
        }
        
        try {
            const doc = await db.collection('designers').doc(this.currentUser.id).get();
            if (doc.exists) {
                const data = doc.data();
                const history = data.tokenHistory || [];
                
                // 최신순으로 정렬하여 반환
                return history
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
            }
            return [];
            
        } catch (error) {
            console.error('토큰 사용 기록 조회 실패:', error);
            return [];
        }
    }
}

// 전역 토큰 시스템 인스턴스
const tokenSystem = new TokenSystem();

// 메인 기능: executeWithTokens
// 이 함수가 HTML에서 호출하는 핵심 함수
window.executeWithTokens = async function(featureKey, callback) {
    try {
        // 토큰 시스템 초기화 대기
        if (!tokenSystem.isInitialized) {
            console.log('토큰 시스템 초기화 대기 중...');
            await new Promise(resolve => {
                const checkInit = () => {
                    if (tokenSystem.isInitialized) {
                        resolve();
                    } else {
                        setTimeout(checkInit, 100);
                    }
                };
                checkInit();
            });
        }
        
        // 현재 사용자 정보 설정 (currentDesigner 사용)
        if (typeof currentDesigner !== 'undefined' && currentDesigner) {
            tokenSystem.setCurrentUser(currentDesigner);
        } else {
            throw new Error('로그인이 필요합니다');
        }
        
        // 필요한 토큰 수량 확인
        const requiredTokens = tokenSystem.getTokenCost(featureKey);
        console.log(`${featureKey} 기능 실행: ${requiredTokens}토큰 필요`);
        
        // 잔액 확인
        const currentBalance = tokenSystem.checkBalance();
        if (currentBalance < requiredTokens) {
            throw new Error(`토큰이 부족합니다 (필요: ${requiredTokens}, 보유: ${currentBalance})`);
        }
        
        // 토큰 차감
        await tokenSystem.deductTokens(
            requiredTokens, 
            `${featureKey} 기능 사용`,
            featureKey
        );
        
        console.log(`토큰 차감 완료: ${requiredTokens}개, 잔액: ${tokenSystem.checkBalance()}`);
        
        // 실제 기능 실행
        let result;
        let executionSuccess = false;
        
        try {
            result = await callback();
            executionSuccess = true;
            console.log(`${featureKey} 기능 실행 성공`);
            
        } catch (executionError) {
            console.error(`${featureKey} 기능 실행 실패:`, executionError);
            
            // 실행 실패 시 토큰 복구 여부 결정
            const shouldRefund = decideRefund(executionError, featureKey);
            
            if (shouldRefund) {
                console.log('기능 실행 실패로 인한 토큰 복구 시도...');
                await tokenSystem.refundTokens(
                    requiredTokens,
                    `기능 실행 실패: ${executionError.message}`,
                    featureKey
                );
            }
            
            throw executionError;
        }
        
        // UI 업데이트 (토큰 잔액 표시)
        updateTokenDisplay();
        
        return result;
        
    } catch (error) {
        console.error(`executeWithTokens 오류 (${featureKey}):`, error);
        throw error;
    }
};

// 토큰 복구 여부 결정 로직
function decideRefund(error, featureKey) {
    const errorMessage = error.message.toLowerCase();
    
    // 시스템 오류 - 토큰 복구
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('server') ||
        errorMessage.includes('firebase') ||
        errorMessage.includes('connection')) {
        return true;
    }
    
    // API 오류 - 토큰 복구
    if (errorMessage.includes('api') || 
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota')) {
        return true;
    }
    
    // 사용자 오류 - 토큰 복구 안 함
    if (errorMessage.includes('invalid') || 
        errorMessage.includes('format') ||
        errorMessage.includes('required') ||
        errorMessage.includes('permission')) {
        return false;
    }
    
    // 기본값: 복구 (안전한 방향)
    return true;
}

// UI 토큰 잔액 업데이트
function updateTokenDisplay() {
    const tokenElements = document.querySelectorAll('#currentTokens, .token-balance, .current-tokens');
    const currentBalance = tokenSystem.checkBalance();
    
    tokenElements.forEach(element => {
        if (element) {
            element.textContent = currentBalance;
        }
    });
    
    // 사용자 정보도 업데이트
    if (typeof updateUserInfo === 'function') {
        updateUserInfo();
    }
}

// 편의 함수들
window.getTokenCost = function(featureKey) {
    return tokenSystem.getTokenCost(featureKey);
};

window.getTokenBalance = function() {
    return tokenSystem.checkBalance();
};

window.getTokenHistory = async function(limit) {
    return await tokenSystem.getTokenHistory(limit);
};

// 토큰 부족 시 충전 모달 표시 (옵션)
function showTokenChargeModal(requiredTokens, currentBalance) {
    const modal = document.createElement('div');
    modal.className = 'token-charge-modal';
    modal.innerHTML = `
        <div class="token-charge-content">
            <h3>토큰이 부족합니다</h3>
            <p>필요한 토큰: <strong>${requiredTokens}개</strong></p>
            <p>보유 토큰: <strong>${currentBalance}개</strong></p>
            <p>부족한 토큰: <strong>${requiredTokens - currentBalance}개</strong></p>
            <br>
            <p>관리자에게 토큰 충전을 요청하세요.</p>
            <div class="token-charge-actions">
                <button onclick="this.closest('.token-charge-modal').remove()">확인</button>
            </div>
        </div>
    `;
    
    // 스타일 추가
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 10000;
    `;
    
    const content = modal.querySelector('.token-charge-content');
    content.style.cssText = `
        background: #111; color: white; padding: 30px; border-radius: 15px;
        text-align: center; max-width: 400px; border: 2px solid #ff1493;
    `;
    
    const button = modal.querySelector('button');
    button.style.cssText = `
        background: #ff1493; color: white; border: none; padding: 10px 20px;
        border-radius: 8px; cursor: pointer; margin-top: 15px;
    `;
    
    document.body.appendChild(modal);
}

// CSS 스타일 추가
const tokenSystemStyles = `
<style>
.token-charge-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.token-charge-content {
    background: #111;
    color: white;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    max-width: 400px;
    border: 2px solid #ff1493;
    animation: slideUp 0.3s ease;
}

.token-charge-actions button {
    background: #ff1493;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 20px;
    font-size: 16px;
    transition: all 0.3s ease;
}

.token-charge-actions button:hover {
    background: #d81b60;
    transform: translateY(-2px);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>
`;

// 스타일을 head에 추가
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', tokenSystemStyles);
}

// 페이지 로드 시 currentDesigner가 있으면 자동으로 설정
document.addEventListener('DOMContentLoaded', function() {
    // currentDesigner가 정의되어 있으면 토큰 시스템에 설정
    if (typeof currentDesigner !== 'undefined' && currentDesigner) {
        tokenSystem.setCurrentUser(currentDesigner);
        updateTokenDisplay();
    }
});

// currentDesigner 변경 감지 (로그인/로그아웃 시)
let lastDesigner = null;
setInterval(() => {
    if (typeof currentDesigner !== 'undefined') {
        if (currentDesigner !== lastDesigner) {
            tokenSystem.setCurrentUser(currentDesigner);
            updateTokenDisplay();
            lastDesigner = currentDesigner;
        }
    }
}, 1000);

console.log('HAIRGATOR Token System 로드 완료');
