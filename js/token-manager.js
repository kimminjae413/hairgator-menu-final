// ========== 토큰 매니저 시스템 ==========

(function() {
    'use strict';
    
    // 🪙 토큰 매니저 클래스
    class TokenManager {
        constructor() {
            this.currentTokens = 'infinite';
            this.designerKey = null;
            this.firebaseListener = null;
            this.isInitialized = false;
            
            // 토큰 비용 설정
            this.costs = {
                CUSTOMER_REGISTER: 1,    // 고객 등록
                AKOOL_FACE_SWAP: 5,      // Akool 얼굴 바꾸기
                AKOOL_STYLE_TRY: 3,      // Akool 스타일 체험
                AKOOL_BACKGROUND: 2,     // Akool 배경 변경
                AKOOL_FILTER: 1,         // Akool 필터 적용
                STYLE_LIKE: 0,           // 좋아요 (무료)
                STYLE_VIEW: 0            // 조회 (무료)
            };
            
            console.log('🪙 TokenManager 생성됨');
        }
        
        // 초기화
        async init() {
            if (this.isInitialized) {
                console.log('🪙 TokenManager 이미 초기화됨');
                return;
            }
            
            console.log('🪙 TokenManager 초기화 시작');
            
            try {
                // 디자이너 키 생성
                this.generateDesignerKey();
                
                // UI 추가
                this.addTokenUI();
                
                // Firebase 연결 (어드민에서 설정한 토큰 실시간 동기화)
                await this.connectFirebase();
                
                // 이벤트 리스너 설정
                this.setupEventListeners();
                
                this.isInitialized = true;
                console.log('✅ TokenManager 초기화 완료');
                
            } catch (error) {
                console.error('❌ TokenManager 초기화 실패:', error);
                // 초기화 실패 시 로컬 모드로 폴백
                this.fallbackToLocalMode();
            }
        }
        
        // 디자이너 키 생성 (이름_전화번호뒷4자리)
        generateDesignerKey() {
            const designerName = localStorage.getItem('hairgator_designerName');
            const designerPhone = localStorage.getItem('hairgator_designerPhone');
            
            if (designerName && designerPhone) {
                const phoneNumbers = designerPhone.replace(/\D/g, '');
                const phoneLast4 = phoneNumbers.slice(-4);
                this.designerKey = `${designerName}_${phoneLast4}`;
                
                console.log('🔑 디자이너 키 생성:', this.designerKey);
            } else {
                console.warn('⚠️ 디자이너 정보가 없어 로컬 모드로 실행');
                this.designerKey = 'local_user';
            }
        }
        
        // Firebase 연결 (어드민에서 설정한 토큰 실시간 동기화)
        async connectFirebase() {
            if (!window.db || !this.designerKey || this.designerKey === 'local_user') {
                console.log('🔄 Firebase 미연결 또는 로컬 사용자 - 로컬 모드로 실행');
                return;
            }
            
            try {
                const docRef = window.db.collection('designers').doc(this.designerKey);
                
                // 실시간 리스너 설정
                this.firebaseListener = docRef.onSnapshot(
                    (doc) => {
                        if (doc.exists) {
                            const data = doc.data();
                            const firebaseTokens = data.tokens;
                            
                            // 무제한 토큰 처리
                            if (firebaseTokens === 999999) {
                                this.currentTokens = 'infinite';
                            } else {
                                this.currentTokens = firebaseTokens || 0;
                            }
                            
                            console.log('🔄 Firebase에서 토큰 동기화:', this.currentTokens);
                            this.updateDisplay();
                        } else {
                            // 문서가 없으면 기본값으로 생성
                            this.createDefaultDocument(docRef);
                        }
                    },
                    (error) => {
                        console.error('❌ Firebase 리스너 오류:', error);
                        this.fallbackToLocalMode();
                    }
                );
                
                console.log('✅ Firebase 실시간 동기화 연결됨');
                
            } catch (error) {
                console.error('❌ Firebase 연결 실패:', error);
                this.fallbackToLocalMode();
            }
        }
        
        // 기본 문서 생성
        async createDefaultDocument(docRef) {
            try {
                await docRef.set({
                    tokens: 999999,  // 기본 무제한
                    designerName: localStorage.getItem('hairgator_designerName') || 'Unknown',
                    designerPhone: localStorage.getItem('hairgator_designerPhone') || '',
                    createdAt: new Date(),
                    lastUsed: new Date()
                });
                
                console.log('✅ 기본 디자이너 문서 생성됨');
                
            } catch (error) {
                console.error('❌ 기본 문서 생성 실패:', error);
                this.fallbackToLocalMode();
            }
        }
        
        // 로컬 모드 폴백
        fallbackToLocalMode() {
            console.log('🔄 로컬 모드로 전환');
            
            // 로컬스토리지에서 토큰 로드
            const savedTokens = localStorage.getItem('hairgator_tokens');
            if (savedTokens) {
                try {
                    this.currentTokens = JSON.parse(savedTokens);
                } catch (e) {
                    this.currentTokens = 'infinite';
                }
            } else {
                this.currentTokens = 'infinite';
            }
            
            this.updateDisplay();
        }
        
        // 사이드바에 토큰 UI 추가
        addTokenUI() {
            const sidebar = document.querySelector('.sidebar-content');
            if (!sidebar) {
                console.warn('⚠️ 사이드바를 찾을 수 없음');
                return;
            }
            
            // 기존 토큰 UI 제거
            const existingTokenUI = document.getElementById('tokenSection');
            if (existingTokenUI) {
                existingTokenUI.remove();
            }
            
            // 토큰 섹션 생성
            const tokenSection = document.createElement('div');
            tokenSection.id = 'tokenSection';
            tokenSection.innerHTML = `
                <div class="token-status" id="tokenStatus">
                    <div class="token-header">
                        <span class="token-icon">🪙</span>
                        <span class="token-title">보유 토큰</span>
                    </div>
                    <div class="token-amount" id="tokenAmount">∞</div>
                    <div class="token-description">
                        💡 클릭하여 관리<br>
                        (유료 기능 이용 시 차감)
                    </div>
                </div>
            `;
            
            // 테마 토글 위에 삽입
            const themeToggle = sidebar.querySelector('.theme-toggle');
            if (themeToggle) {
                sidebar.insertBefore(tokenSection, themeToggle);
            } else {
                sidebar.insertBefore(tokenSection, sidebar.firstChild);
            }
            
            console.log('✅ 토큰 UI 추가됨');
        }
        
        // 토큰 에디터 모달 추가
        addTokenEditorModal() {
            // 기존 모달 제거
            const existingModal = document.getElementById('tokenEditorModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            const modal = document.createElement('div');
            modal.id = 'tokenEditorModal';
            modal.className = 'token-editor-modal';
            modal.innerHTML = `
                <div class="token-editor-content">
                    <h3 class="token-editor-title">
                        <span>🪙</span>
                        <span>토큰 관리</span>
                    </h3>
                    
                    <div class="token-input-group">
                        <label for="tokenInput">토큰 수량</label>
                        <input type="text" id="tokenInput" class="token-input" placeholder="숫자 입력 또는 ∞">
                    </div>
                    
                    <div class="token-preset-buttons">
                        <button class="token-preset-btn" data-value="100">100개</button>
                        <button class="token-preset-btn" data-value="500">500개</button>
                        <button class="token-preset-btn" data-value="1000">1,000개</button>
                        <button class="token-preset-btn" data-value="infinite">무제한</button>
                    </div>
                    
                    <div class="token-editor-buttons">
                        <button class="token-editor-btn token-save-btn" id="tokenSaveBtn">저장</button>
                        <button class="token-editor-btn token-cancel-btn" id="tokenCancelBtn">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            console.log('✅ 토큰 에디터 모달 추가됨');
        }
        
        // 이벤트 리스너 설정
        setupEventListeners() {
            // 토큰 상태창 클릭 이벤트
            const tokenStatus = document.getElementById('tokenStatus');
            if (tokenStatus) {
                tokenStatus.addEventListener('click', () => {
                    this.showTokenInfo();
                });
            }
            
            // 토큰 에디터 모달이 없으면 생성
            if (!document.getElementById('tokenEditorModal')) {
                this.addTokenEditorModal();
            }
            
            // 프리셋 버튼 이벤트
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('token-preset-btn')) {
                    const value = e.target.dataset.value;
                    const input = document.getElementById('tokenInput');
                    if (input) {
                        input.value = value === 'infinite' ? '∞' : value;
                    }
                }
                
                // 저장 버튼
                if (e.target.id === 'tokenSaveBtn') {
                    this.saveTokens();
                }
                
                // 취소 버튼
                if (e.target.id === 'tokenCancelBtn') {
                    this.closeTokenEditor();
                }
            });
            
            // 모달 외부 클릭 시 닫기
            document.addEventListener('click', (e) => {
                const modal = document.getElementById('tokenEditorModal');
                if (e.target === modal) {
                    this.closeTokenEditor();
                }
            });
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeTokenEditor();
                }
            });
            
            console.log('✅ 토큰 이벤트 리스너 설정됨');
        }
        
        // 토큰 정보 표시
        showTokenInfo() {
            const statusText = this.currentTokens === 'infinite' ? '무제한' : `${this.formatNumber(this.currentTokens)}개`;
            const connectionStatus = this.firebaseListener ? 'Firebase 연동됨' : '로컬 모드';
            
            alert(`💰 현재 토큰: ${statusText}\n🔗 연결 상태: ${connectionStatus}\n\n💡 토큰은 유료 기능 사용 시 차감됩니다.`);
        }
        
        // 토큰 에디터 열기
        openTokenEditor() {
            const modal = document.getElementById('tokenEditorModal');
            const input = document.getElementById('tokenInput');
            
            if (modal && input) {
                // 현재 토큰 값 설정
                if (this.currentTokens === 'infinite') {
                    input.value = '∞';
                } else {
                    input.value = this.currentTokens.toString();
                }
                
                modal.classList.add('active');
                input.focus();
            }
        }
        
        // 토큰 에디터 닫기
        closeTokenEditor() {
            const modal = document.getElementById('tokenEditorModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
        
        // 토큰 저장
        async saveTokens() {
            const input = document.getElementById('tokenInput');
            if (!input) return;
            
            let value = input.value.trim();
            let newTokens;
            
            if (value === '∞' || value.toLowerCase() === 'infinite') {
                newTokens = 'infinite';
            } else {
                const numValue = parseInt(value.replace(/[^0-9]/g, ''));
                if (isNaN(numValue) || numValue < 0) {
                    alert('올바른 숫자를 입력해주세요.');
                    return;
                }
                newTokens = numValue;
            }
            
            try {
                await this.setTokens(newTokens);
                this.closeTokenEditor();
                
                const savedMessage = newTokens === 'infinite' ? '무제한' : this.formatNumber(newTokens) + '개';
                console.log('💾 토큰 저장 완료:', savedMessage);
                
            } catch (error) {
                console.error('❌ 토큰 저장 실패:', error);
                alert('토큰 저장에 실패했습니다: ' + error.message);
            }
        }
        
        // 토큰 설정
        async setTokens(amount) {
            this.currentTokens = amount;
            
            // 로컬스토리지에 저장
            localStorage.setItem('hairgator_tokens', JSON.stringify(amount));
            
            // Firebase에 저장 (가능한 경우)
            if (window.db && this.designerKey && this.designerKey !== 'local_user') {
                try {
                    const firebaseAmount = amount === 'infinite' ? 999999 : amount;
                    await window.db.collection('designers').doc(this.designerKey).update({
                        tokens: firebaseAmount,
                        lastUpdated: new Date()
                    });
                    
                    console.log('🔄 Firebase에 토큰 저장됨:', firebaseAmount);
                    
                } catch (error) {
                    console.error('❌ Firebase 토큰 저장 실패:', error);
                    // Firebase 실패해도 로컬은 유지
                }
            }
            
            this.updateDisplay();
        }
        
        // 토큰 사용
        async useTokens(amount, description = '') {
            if (this.currentTokens === 'infinite') {
                console.log(`♾️ 무한 토큰으로 ${description} 기능 사용`);
                return true;
            }
            
            if (typeof this.currentTokens !== 'number' || this.currentTokens < amount) {
                console.log(`❌ 토큰 부족: 필요 ${amount}개, 보유 ${this.currentTokens}개`);
                this.showInsufficientTokensMessage(amount);
                return false;
            }
            
            const newAmount = this.currentTokens - amount;
            await this.setTokens(newAmount);
            
            // 사용 로그 기록
            this.logTokenUsage(-amount, description);
            
            console.log(`💸 토큰 ${amount}개 사용됨, 잔여: ${newAmount}개`);
            return true;
        }
        
        // 토큰 부족 메시지
        showInsufficientTokensMessage(requiredAmount) {
            const currentAmount = typeof this.currentTokens === 'number' ? this.currentTokens : 0;
            const needMore = requiredAmount - currentAmount;
            
            alert(`토큰이 부족합니다! 💸\n\n` +
                  `필요: ${requiredAmount}개\n` +
                  `보유: ${currentAmount}개\n` +
                  `부족: ${needMore}개\n\n` +
                  `사이드바에서 토큰을 추가해주세요.`);
        }
        
        // 토큰 보유량 체크
        hasEnoughTokens(amount) {
            if (this.currentTokens === 'infinite') return true;
            return typeof this.currentTokens === 'number' && this.currentTokens >= amount;
        }
        
        // 토큰 추가
        async addTokens(amount, description = '') {
            if (this.currentTokens === 'infinite') {
                console.log('♾️ 이미 무한 토큰');
                return;
            }
            
            const newAmount = (typeof this.currentTokens === 'number' ? this.currentTokens : 0) + amount;
            await this.setTokens(newAmount);
            
            // 추가 로그 기록
            this.logTokenUsage(amount, description);
            
            console.log(`💰 토큰 ${amount}개 추가됨, 총 ${newAmount}개`);
        }
        
        // 토큰 사용 로그 기록
        logTokenUsage(amount, description) {
            const log = {
                amount: amount,
                description: description,
                timestamp: new Date().toISOString(),
                balance: this.currentTokens
            };
            
            // 로컬 히스토리에 추가
            const history = JSON.parse(localStorage.getItem('hairgator_token_history') || '[]');
            history.unshift(log);
            
            // 최대 50개까지만 보관
            if (history.length > 50) {
                history.splice(50);
            }
            
            localStorage.setItem('hairgator_token_history', JSON.stringify(history));
            
            // Firebase에도 기록 (가능한 경우)
            if (window.db && this.designerKey && this.designerKey !== 'local_user') {
                window.db.collection('token_usage').add({
                    designerKey: this.designerKey,
                    amount: amount,
                    description: description,
                    timestamp: new Date(),
                    balance: this.currentTokens === 'infinite' ? 999999 : this.currentTokens
                }).catch(error => {
                    console.error('❌ 토큰 사용 로그 저장 실패:', error);
                });
            }
        }
        
        // 화면 업데이트
        updateDisplay() {
            const tokenAmountEl = document.getElementById('tokenAmount');
            const tokenStatusEl = document.getElementById('tokenStatus');
            
            if (tokenAmountEl && tokenStatusEl) {
                // 토큰 상태에 따른 스타일 업데이트
                tokenStatusEl.classList.remove('low', 'unlimited');
                
                if (this.currentTokens === 'infinite') {
                    tokenAmountEl.textContent = '∞';
                    tokenAmountEl.className = 'token-amount infinite';
                    tokenStatusEl.classList.add('unlimited');
                } else {
                    tokenAmountEl.textContent = this.formatNumber(this.currentTokens);
                    tokenAmountEl.className = 'token-amount';
                    
                    // 토큰이 10개 미만이면 부족 상태 표시
                    if (this.currentTokens < 10) {
                        tokenStatusEl.classList.add('low');
                    }
                }
            }
        }
        
        // 숫자 포맷팅
        formatNumber(num) {
            if (typeof num !== 'number') return '0';
            return num.toLocaleString('ko-KR');
        }
        
        // 토큰 비용 조회
        getCost(action) {
            return this.costs[action] || 0;
        }
        
        // 정리 (메모리 누수 방지)
        destroy() {
            if (this.firebaseListener) {
                this.firebaseListener();
                this.firebaseListener = null;
            }
            
            const tokenSection = document.getElementById('tokenSection');
            if (tokenSection) {
                tokenSection.remove();
            }
            
            const tokenModal = document.getElementById('tokenEditorModal');
            if (tokenModal) {
                tokenModal.remove();
            }
            
            console.log('🗑️ TokenManager 정리됨');
        }
    }
    
    // 전역 토큰 매니저 인스턴스
    window.TokenManager = new TokenManager();
    
    // 자동 초기화 (DOM 로드 후)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 로그인 완료 후 초기화되도록 지연
            setTimeout(() => {
                if (localStorage.getItem('hairgator_designerName')) {
                    window.TokenManager.init();
                }
            }, 1000);
        });
    } else {
        // 이미 로드된 경우 즉시 초기화
        setTimeout(() => {
            if (localStorage.getItem('hairgator_designerName')) {
                window.TokenManager.init();
            }
        }, 100);
    }
    
    // 전역 편의 함수들
    window.useTokens = (amount, description) => window.TokenManager.useTokens(amount, description);
    window.hasEnoughTokens = (amount) => window.TokenManager.hasEnoughTokens(amount);
    window.addTokens = (amount, description) => window.TokenManager.addTokens(amount, description);
    window.getTokenCost = (action) => window.TokenManager.getCost(action);
    
    console.log('🪙 TokenManager 모듈 로드 완료');
    
})();
