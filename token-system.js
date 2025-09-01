// HAIRGATOR 토큰 시스템 (마스터 가이드 준수)
// 완전한 토큰제 시스템 구현

// 토큰 비용 설정 (Firebase에서 로드하거나 기본값 사용)
const TOKEN_COSTS = {
    // 무료 기능 (0토큰)
    'MENU_VIEW': 0,
    'STYLE_DETAIL': 0,
    'BASIC_SEARCH': 0,
    'SHOP_INFO': 0,
    'PWA_INSTALL': 0,
    
    // 저비용 기능 (1-2토큰)
    'CUSTOMER_REGISTER': 1,
    'RESERVATION_CREATE': 1,
    'BASIC_ANALYTICS': 2,
    'PROFILE_MANAGE': 1,
    'FAVORITES': 1,
    
    // 중비용 기능 (3-5토큰)
    'ADVANCED_RECOMMEND': 3,
    'DATA_EXPORT': 3,
    'CUSTOM_REPORT': 4,
    
    // 고비용 기능 (5토큰 이상)
    'AI_FACE_ANALYSIS': 5,
    'BULK_OPERATIONS': 10,
    'ADVANCED_ANALYTICS': 8
};

// 토큰 시스템 클래스
class TokenSystem {
    constructor() {
        this.currentUser = null;
        this.tokenCosts = { ...TOKEN_COSTS };
        this.init();
    }

    // 초기화
    async init() {
        await this.loadTokenCosts();
        await this.loadCurrentUser();
        console.log('✅ 토큰 시스템 초기화 완료');
    }

    // Firebase에서 토큰 비용 로드
    async loadTokenCosts() {
        try {
            const doc = await db.collection('metadata').doc('token_costs').get();
            if (doc.exists) {
                const firebaseCosts = doc.data().costs || {};
                // Firebase 설정과 기본값 병합
                this.tokenCosts = { ...TOKEN_COSTS, ...firebaseCosts };
                console.log('Firebase 토큰 비용 로드 완료');
            }
        } catch (error) {
            console.warn('Firebase 토큰 비용 로드 실패, 기본값 사용:', error);
            this.tokenCosts = { ...TOKEN_COSTS };
        }
    }

    // 현재 사용자 로드
    async loadCurrentUser() {
        try {
            const userStr = localStorage.getItem('hairgator_user');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
                console.log('현재 사용자 로드:', this.currentUser.name);
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
            this.currentUser = null;
        }
    }

    // 기능별 토큰 비용 조회
    getFeatureCost(featureKey) {
        const cost = this.tokenCosts[featureKey];
        if (typeof cost === 'object') {
            return cost.cost || 0;
        }
        return cost || 0;
    }

    // 토큰 잔액 확인
    async checkBalance() {
        if (!this.currentUser) return 0;
        
        try {
            const doc = await db.collection('designers').doc(this.currentUser.id).get();
            if (doc.exists) {
                const tokens = doc.data().tokens || 0;
                // 로컬 사용자 정보 업데이트
                this.currentUser.tokens = tokens;
                localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
                return tokens;
            }
        } catch (error) {
            console.error('토큰 잔액 확인 실패:', error);
        }
        return 0;
    }

    // 충분한 토큰이 있는지 확인
    async hasEnoughTokens(cost) {
        if (cost === 0) return true; // 무료 기능
        
        const balance = await this.checkBalance();
        return balance >= cost;
    }

    // 토큰 소비 (실제 차감)
    async consumeTokens(featureKey, cost) {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }

        if (cost === 0) {
            console.log(`무료 기능 사용: ${featureKey}`);
            return true; // 무료 기능은 토큰 차감 없음
        }

        try {
            // Firebase에서 토큰 차감
            const userDoc = db.collection('designers').doc(this.currentUser.id);
            const userSnapshot = await userDoc.get();
            const currentTokens = userSnapshot.data()?.tokens || 0;

            if (currentTokens < cost) {
                throw new Error('토큰이 부족합니다');
            }

            await userDoc.update({
                tokens: firebase.firestore.FieldValue.increment(-cost),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    featureKey: featureKey,
                    amount: -cost,
                    timestamp: new Date(),
                    type: 'consumed'
                })
            });

            // 로컬 사용자 정보 업데이트
            this.currentUser.tokens = currentTokens - cost;
            localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));

            console.log(`토큰 소비: ${cost}개 (${featureKey})`);
            this.updateTokenDisplay();
            return true;

        } catch (error) {
            console.error('토큰 소비 실패:', error);
            throw error;
        }
    }

    // 토큰 충전
    async chargeTokens(amount, reason = '관리자 충전') {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }

        try {
            const userDoc = db.collection('designers').doc(this.currentUser.id);
            await userDoc.update({
                tokens: firebase.firestore.FieldValue.increment(amount),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    amount: amount,
                    reason: reason,
                    timestamp: new Date(),
                    type: 'charged'
                })
            });

            // 로컬 사용자 정보 업데이트
            this.currentUser.tokens = (this.currentUser.tokens || 0) + amount;
            localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));

            console.log(`토큰 충전: ${amount}개 (${reason})`);
            this.updateTokenDisplay();
            return true;

        } catch (error) {
            console.error('토큰 충전 실패:', error);
            throw error;
        }
    }

    // UI에 토큰 잔액 표시 업데이트
    updateTokenDisplay() {
        const tokenElements = document.querySelectorAll('.token-balance');
        tokenElements.forEach(el => {
            el.textContent = this.currentUser?.tokens || 0;
        });

        // 토큰 상태에 따른 UI 업데이트
        const balance = this.currentUser?.tokens || 0;
        if (balance < 10) {
            this.showLowTokenWarning();
        }
    }

    // 토큰 부족 경고
    showLowTokenWarning() {
        const warning = document.createElement('div');
        warning.className = 'token-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span>토큰이 부족합니다 (잔액: ${this.currentUser?.tokens || 0}개)</span>
                <button onclick="tokenSystem.showChargeModal()" class="charge-btn">충전하기</button>
            </div>
        `;
        
        // 기존 경고가 있으면 제거
        const existingWarning = document.querySelector('.token-warning');
        if (existingWarning) existingWarning.remove();
        
        document.body.appendChild(warning);
        
        // 5초 후 자동 제거
        setTimeout(() => warning.remove(), 5000);
    }

    // 토큰 충전 모달 표시
    showChargeModal() {
        const modal = document.createElement('div');
        modal.className = 'token-charge-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <h3>토큰 충전</h3>
                <p>현재 잔액: <span class="token-balance">${this.currentUser?.tokens || 0}</span>개</p>
                
                <div class="charge-options">
                    <div class="charge-option" onclick="tokenSystem.selectChargeOption(100, 10000)">
                        <div class="tokens">100토큰</div>
                        <div class="price">10,000원</div>
                    </div>
                    <div class="charge-option recommended" onclick="tokenSystem.selectChargeOption(300, 25000)">
                        <div class="tokens">300토큰</div>
                        <div class="price">25,000원</div>
                        <div class="discount">17% 할인</div>
                    </div>
                    <div class="charge-option" onclick="tokenSystem.selectChargeOption(1000, 80000)">
                        <div class="tokens">1000토큰</div>
                        <div class="price">80,000원</div>
                        <div class="discount">20% 할인</div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button onclick="this.closest('.token-charge-modal').remove()" class="btn-cancel">취소</button>
                    <button onclick="tokenSystem.showPaymentMethods()" class="btn-payment">결제하기</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // 충전 옵션 선택
    selectChargeOption(tokens, price) {
        // 기존 선택 해제
        document.querySelectorAll('.charge-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // 새 선택 표시
        event.currentTarget.classList.add('selected');
        
        // 선택된 옵션 저장
        this.selectedCharge = { tokens, price };
    }

    // 결제 방법 표시
    showPaymentMethods() {
        if (!this.selectedCharge) {
            alert('충전할 토큰 개수를 선택해주세요');
            return;
        }

        alert(`${this.selectedCharge.tokens}토큰 (${this.selectedCharge.price.toLocaleString()}원) 결제 기능은 추후 구현됩니다.\n현재는 관리자에게 문의해주세요.`);
        
        // 모달 닫기
        document.querySelector('.token-charge-modal')?.remove();
    }

    // 토큰 사용 내역 조회
    async getTokenHistory(limit = 20) {
        if (!this.currentUser) return [];

        try {
            const doc = await db.collection('designers').doc(this.currentUser.id).get();
            if (doc.exists) {
                const history = doc.data().tokenHistory || [];
                return history
                    .sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate())
                    .slice(0, limit);
            }
        } catch (error) {
            console.error('토큰 내역 조회 실패:', error);
        }
        return [];
    }

    // 관리자용: 사용자에게 토큰 지급
    async adminChargeTokens(userId, amount, reason) {
        if (!this.currentUser?.isAdmin) {
            throw new Error('관리자 권한이 필요합니다');
        }

        try {
            await db.collection('designers').doc(userId).update({
                tokens: firebase.firestore.FieldValue.increment(amount),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    amount: amount,
                    reason: reason,
                    timestamp: new Date(),
                    type: 'admin_charge',
                    adminId: this.currentUser.id
                })
            });

            console.log(`관리자 토큰 지급: ${amount}개 to ${userId}`);
            return true;

        } catch (error) {
            console.error('관리자 토큰 지급 실패:', error);
            throw error;
        }
    }
}

// 전역 토큰 시스템 인스턴스
const tokenSystem = new TokenSystem();

// ========== 핵심 함수: executeWithTokens ==========
// 모든 기능이 이 함수를 통해 토큰 체크 및 소비
window.executeWithTokens = async function(featureKey, callback) {
    try {
        // 1. 토큰 비용 확인
        const cost = tokenSystem.getFeatureCost(featureKey);
        console.log(`${featureKey} 기능 실행 시도 (비용: ${cost}토큰)`);
        
        // 2. 무료 기능이면 바로 실행
        if (cost === 0) {
            console.log('무료 기능 실행');
            return await callback();
        }
        
        // 3. 로그인 체크 (유료 기능)
        if (!tokenSystem.currentUser) {
            alert('로그인이 필요한 기능입니다');
            // 로그인 페이지로 리다이렉트 또는 로그인 모달 표시
            showLoginModal();
            return null;
        }
        
        // 4. 토큰 잔액 확인
        if (await tokenSystem.hasEnoughTokens(cost)) {
            // 5. 토큰 소비 후 기능 실행
            await tokenSystem.consumeTokens(featureKey, cost);
            const result = await callback();
            
            console.log(`${featureKey} 기능 실행 완료 (${cost}토큰 소비)`);
            return result;
        } else {
            // 6. 토큰 부족 시 충전 모달 표시
            console.log('토큰 부족');
            tokenSystem.showChargeModal();
            throw new Error(`토큰이 부족합니다 (필요: ${cost}개, 보유: ${await tokenSystem.checkBalance()}개)`);
        }
        
    } catch (error) {
        console.error(`${featureKey} 실행 실패:`, error);
        showToast(error.message, 'error');
        throw error;
    }
};

// ========== 유틸리티 함수들 ==========

// 토스트 메시지 표시
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 로그인 모달 표시
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <h3>로그인 필요</h3>
            <p>이 기능을 사용하려면 로그인이 필요합니다.</p>
            <div class="modal-actions">
                <button onclick="this.closest('.login-modal').remove()" class="btn-cancel">취소</button>
                <button onclick="redirectToLogin()" class="btn-login">로그인하기</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 로그인 페이지 이동
function redirectToLogin() {
    // 현재 페이지 URL을 저장하여 로그인 후 돌아올 수 있도록
    localStorage.setItem('hairgator_return_url', window.location.href);
    window.location.href = 'admin.html#login';
}

// ========== 사용 예시 함수들 ==========

// 예시 1: 고객 등록 (1토큰)
async function registerCustomer(customerData) {
    return await executeWithTokens('CUSTOMER_REGISTER', async () => {
        // 실제 고객 등록 로직
        const docRef = await db.collection('customers').add({
            ...customerData,
            createdAt: new Date(),
            designerId: tokenSystem.currentUser.id
        });
        
        showToast('고객이 등록되었습니다', 'success');
        return docRef.id;
    });
}

// 예시 2: AI 얼굴 분석 (5토큰)
async function analyzeFace(imageFile) {
    return await executeWithTokens('AI_FACE_ANALYSIS', async () => {
        // 실제 AI 분석 로직
        const analysisResult = await performAIAnalysis(imageFile);
        
        showToast('AI 분석이 완료되었습니다', 'success');
        return analysisResult;
    });
}

// 예시 3: 무료 기능 - 메뉴 보기 (0토큰)
async function viewMenu() {
    return await executeWithTokens('MENU_VIEW', async () => {
        // 메뉴 데이터 로드
        const menuData = await loadMenuFromFirebase();
        return menuData;
    });
}

// ========== 초기화 및 이벤트 설정 ==========

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 토큰 시스템 초기화
        await tokenSystem.init();
        
        // 토큰 잔액 표시 업데이트
        tokenSystem.updateTokenDisplay();
        
        console.log('✅ HAIRGATOR 토큰 시스템 로드 완료');
        
    } catch (error) {
        console.error('토큰 시스템 초기화 실패:', error);
    }
});

// 로그인 성공 후 토큰 시스템 업데이트
window.onTokenSystemLogin = function(userData) {
    tokenSystem.currentUser = userData;
    tokenSystem.updateTokenDisplay();
    console.log('토큰 시스템 사용자 업데이트:', userData.name);
};

// ========== CSS 스타일 추가 ==========
const tokenSystemStyles = `
<style>
/* 토큰 경고 스타일 */
.token-warning {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 15px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
}

.warning-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.charge-btn {
    background: white;
    color: #ff6b6b;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s;
}

.charge-btn:hover {
    transform: scale(1.05);
}

/* 토큰 충전 모달 */
.token-charge-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
}

.modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    padding: 30px;
    border-radius: 15px;
    border: 2px solid var(--female-color);
    max-width: 500px;
    width: 90%;
    animation: slideUp 0.3s ease;
}

.modal-content h3 {
    color: var(--female-color);
    margin-bottom: 20px;
    text-align: center;
}

.charge-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
    margin: 20px 0;
}

.charge-option {
    background: #2a2a2a;
    border: 2px solid #444;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.charge-option:hover {
    border-color: var(--female-color);
    transform: translateY(-2px);
}

.charge-option.recommended {
    border-color: var(--male-color);
    background: linear-gradient(135deg, #2a2a2a, #333);
}

.charge-option.recommended::after {
    content: "추천";
    position: absolute;
    top: -8px;
    right: 10px;
    background: var(--male-color);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: bold;
}

.charge-option.selected {
    border-color: var(--female-color);
    background: linear-gradient(135deg, #2a2a2a, var(--female-color-alpha));
}

.charge-option .tokens {
    font-size: 18px;
    font-weight: bold;
    color: var(--female-color);
    margin-bottom: 5px;
}

.charge-option .price {
    font-size: 16px;
    color: white;
    margin-bottom: 5px;
}

.charge-option .discount {
    font-size: 12px;
    color: var(--male-color);
    font-weight: bold;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
}

.btn-cancel, .btn-payment, .btn-login {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
}

.btn-cancel {
    background: #666;
    color: white;
}

.btn-payment, .btn-login {
    background: var(--female-color);
    color: white;
}

.btn-cancel:hover, .btn-payment:hover, .btn-login:hover {
    transform: translateY(-2px);
    filter: brightness(110%);
}

/* 토스트 메시지 */
.toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: #333;
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 9999;
    opacity: 0;
    transition: all 0.3s ease;
}

.toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.toast-success {
    background: linear-gradient(135deg, #00b894, #00a085);
}

.toast-error {
    background: linear-gradient(135deg, #e17055, #d63031);
}

.toast-info {
    background: linear-gradient(135deg, #74b9ff, #0984e3);
}

/* 애니메이션 */
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translate(-50%, -30%) scale(0.9); opacity: 0; }
    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

/* 토큰 잔액 표시 */
.token-balance {
    color: var(--female-color);
    font-weight: bold;
}
</style>
`;

// 스타일 추가
document.head.insertAdjacentHTML('beforeend', tokenSystemStyles);

console.log('🎯 HAIRGATOR 토큰 시스템 완전 로드 완료');