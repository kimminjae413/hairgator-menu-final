/* ========================================
   HAIRGATOR - 토큰 시스템 (Firebase 연동)
   ======================================== */

class TokenSystem {
    constructor() {
        this.tokenCosts = {};
        this.initialized = false;
    }
    
    // 토큰 시스템 초기화
    async init() {
        try {
            await this.loadTokenCosts();
            this.initialized = true;
            console.log('🪙 토큰 시스템 초기화 완료');
        } catch (error) {
            console.error('토큰 시스템 초기화 실패:', error);
        }
    }
    
    // Firebase에서 토큰 비용 로드
    async loadTokenCosts() {
        try {
            const doc = await db.collection('metadata').doc('token_costs').get();
            
            if (doc.exists) {
                this.tokenCosts = doc.data().costs || {};
            } else {
                // 기본값 설정
                this.tokenCosts = {
                    'AI_FACE_ANALYSIS': { cost: 5, name: 'AI 얼굴 분석' },
                    'CUSTOMER_REGISTER': { cost: 1, name: '고객 등록' },
                    'RESERVATION_CREATE': { cost: 1, name: '예약 생성' },
                    'BASIC_ANALYTICS': { cost: 2, name: '기본 분석' },
                    'ADVANCED_RECOMMEND': { cost: 3, name: '고급 추천' },
                    'DATA_EXPORT': { cost: 2, name: '데이터 내보내기' },
                    'BULK_OPERATIONS': { cost: 10, name: '대량 작업' }
                };
            }
            
            console.log('토큰 비용 로드 완료:', Object.keys(this.tokenCosts).length, '개 기능');
            
        } catch (error) {
            console.error('토큰 비용 로드 실패:', error);
            throw error;
        }
    }
    
    // 기능별 토큰 비용 조회
    getFeatureCost(featureKey) {
        const feature = this.tokenCosts[featureKey];
        return feature ? feature.cost : 0;
    }
    
    // 기능 정보 조회
    getFeatureInfo(featureKey) {
        return this.tokenCosts[featureKey] || null;
    }
    
    // 사용자 토큰 잔액 확인
    async checkBalance() {
        const user = authSystem.getCurrentUser();
        if (!user) {
            throw new Error('로그인이 필요합니다');
        }
        
        try {
            // Firebase에서 최신 토큰 정보 가져오기
            const userDoc = await db.collection('designers').doc(user.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentTokens = userData.tokens || 0;
                
                // 로컬 사용자 정보 업데이트
                authSystem.currentUser.tokens = currentTokens;
                authSystem.saveUserSession();
                
                return currentTokens;
            } else {
                throw new Error('사용자 정보를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error('토큰 잔액 확인 실패:', error);
            throw error;
        }
    }
    
    // 토큰 사용 가능 여부 확인
    async hasEnoughTokens(requiredTokens) {
        try {
            const currentBalance = await this.checkBalance();
            return currentBalance >= requiredTokens;
        } catch (error) {
            console.error('토큰 확인 오류:', error);
            return false;
        }
    }
    
    // 토큰 소모 (기능 실행)
    async consumeTokens(featureKey, customAmount = null) {
        const user = authSystem.getCurrentUser();
        if (!user) {
            throw new Error('로그인이 필요합니다');
        }
        
        const tokenCost = customAmount || this.getFeatureCost(featureKey);
        const featureInfo = this.getFeatureInfo(featureKey);
        const featureName = featureInfo ? featureInfo.name : featureKey;
        
        if (tokenCost <= 0) {
            console.log(`무료 기능 실행: ${featureName}`);
            return true;
        }
        
        try {
            // 잔액 확인
            const hasEnough = await this.hasEnoughTokens(tokenCost);
            if (!hasEnough) {
                this.showInsufficientTokensModal(tokenCost, featureName);
                return false;
            }
            
            // 토큰 차감
            await authSystem.consumeTokens(tokenCost, `${featureName} 기능 사용`);
            
            // 성공 알림
            if (typeof app !== 'undefined') {
                app.showToast(`${featureName} 사용 (${tokenCost}토큰 차감)`, 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('토큰 소모 실패:', error);
            if (typeof app !== 'undefined') {
                app.showToast(`토큰 사용 실패: ${error.message}`, 'error');
            }
            return false;
        }
    }
    
    // 토큰 부족 모달 표시
    showInsufficientTokensModal(requiredTokens, featureName) {
        const modal = document.createElement('div');
        modal.className = 'token-modal';
        modal.innerHTML = `
            <div class="token-modal-content">
                <div class="token-modal-header">
                    <h3>토큰이 부족합니다</h3>
                    <button class="token-modal-close" onclick="this.closest('.token-modal').remove()">×</button>
                </div>
                <div class="token-modal-body">
                    <div class="token-info">
                        <div class="token-icon">🪙</div>
                        <p><strong>${featureName}</strong> 기능을 사용하려면 <strong>${requiredTokens}토큰</strong>이 필요합니다.</p>
                        <p>현재 보유: <span id="currentTokens">-</span>토큰</p>
                    </div>
                    <div class="token-packages">
                        <h4>토큰 충전 패키지</h4>
                        <div class="package-list">
                            <div class="package-item">
                                <div class="package-tokens">100토큰</div>
                                <div class="package-price">10,000원</div>
                            </div>
                            <div class="package-item popular">
                                <div class="package-tokens">300토큰</div>
                                <div class="package-price">25,000원</div>
                                <div class="package-badge">인기</div>
                            </div>
                            <div class="package-item">
                                <div class="package-tokens">1000토큰</div>
                                <div class="package-price">80,000원</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="token-modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.token-modal').remove()">나중에</button>
                    <button class="btn btn-primary" onclick="tokenSystem.redirectToCharge()">충전하기</button>
                </div>
            </div>
        `;
        
        // 스타일 추가
        if (!document.getElementById('token-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'token-modal-styles';
            styles.textContent = `
                .token-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    backdrop-filter: blur(8px);
                }
                
                .token-modal-content {
                    background: var(--bg-card);
                    border: 2px solid var(--accent-primary);
                    border-radius: var(--border-radius-xl);
                    padding: 2rem;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: var(--shadow-xl);
                }
                
                .token-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .token-modal-header h3 {
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    margin: 0;
                }
                
                .token-modal-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 2rem;
                    cursor: pointer;
                    line-height: 1;
                }
                
                .token-info {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .token-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .token-info p {
                    color: var(--text-primary);
                    margin: 0.5rem 0;
                    line-height: 1.6;
                }
                
                .token-packages h4 {
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                    text-align: center;
                }
                
                .package-list {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }
                
                .package-item {
                    background: var(--bg-secondary);
                    border: 2px solid transparent;
                    border-radius: var(--border-radius);
                    padding: 1rem;
                    text-align: center;
                    transition: all var(--transition);
                    position: relative;
                }
                
                .package-item.popular {
                    border-color: var(--accent-primary);
                    box-shadow: var(--glow-primary);
                }
                
                .package-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: var(--accent-primary);
                    color: var(--text-inverse);
                    padding: 0.2rem 0.5rem;
                    border-radius: var(--border-radius-sm);
                    font-size: 0.7rem;
                    font-weight: bold;
                }
                
                .package-tokens {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }
                
                .package-price {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                
                .token-modal-footer {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                }
                
                .token-modal-footer .btn {
                    flex: 1;
                    padding: 0.8rem 1.5rem;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-weight: 600;
                    transition: all var(--transition);
                }
                
                .btn-secondary {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .btn-primary {
                    background: var(--accent-primary);
                    color: var(--text-inverse);
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                }
                
                @media (max-width: 768px) {
                    .package-list {
                        grid-template-columns: 1fr;
                    }
                    
                    .token-modal-content {
                        margin: 1rem;
                        padding: 1.5rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(modal);
        
        // 현재 토큰 수 표시
        this.checkBalance().then(tokens => {
            const currentTokensEl = modal.querySelector('#currentTokens');
            if (currentTokensEl) {
                currentTokensEl.textContent = tokens.toLocaleString();
            }
        });
        
        // ESC 키로 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    // 충전 페이지로 리다이렉트
    redirectToCharge() {
        // 실제 구현에서는 결제 페이지나 관리자 연락처로 이동
        alert('토큰 충전은 관리자에게 문의해주세요.\n연락처: admin@hairgator.com');
        
        // 모달 닫기
        const modal = document.querySelector('.token-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // 토큰 기록 조회
    async getTokenHistory() {
        const user = authSystem.getCurrentUser();
        if (!user) {
            throw new Error('로그인이 필요합니다');
        }
        
        try {
            const userDoc = await db.collection('designers').doc(user.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.tokenHistory || [];
            } else {
                return [];
            }
            
        } catch (error) {
            console.error('토큰 기록 조회 실패:', error);
            throw error;
        }
    }
    
    // 실행 래퍼 함수 (메인 API)
    async executeWithTokens(featureKey, callback) {
        if (!this.initialized) {
            await this.init();
        }
        
        const success = await this.consumeTokens(featureKey);
        
        if (success && typeof callback === 'function') {
            try {
                return await callback();
            } catch (error) {
                console.error(`${featureKey} 실행 오류:`, error);
                // 기능 실행 실패 시 토큰 환불 (옵션)
                // await this.refundTokens(featureKey);
                throw error;
            }
        }
        
        return success;
    }
    
    // 토큰 환불 (실행 실패 시)
    async refundTokens(featureKey, reason = '기능 실행 실패') {
        const tokenCost = this.getFeatureCost(featureKey);
        
        if (tokenCost > 0) {
            try {
                await authSystem.chargeTokens(tokenCost, `환불: ${reason}`);
                
                if (typeof app !== 'undefined') {
                    app.showToast(`토큰 환불: ${tokenCost}개`, 'info');
                }
                
            } catch (error) {
                console.error('토큰 환불 실패:', error);
            }
        }
    }
}

// 전역 토큰 시스템 인스턴스
const tokenSystem = new TokenSystem();

// 전역 함수들
window.tokenSystem = tokenSystem;
window.executeWithTokens = (featureKey, callback) => tokenSystem.executeWithTokens(featureKey, callback);
window.getFeatureCost = (featureKey) => tokenSystem.getFeatureCost(featureKey);
window.checkTokenBalance = () => tokenSystem.checkBalance();

console.log('🪙 토큰 시스템 로드 완료');
