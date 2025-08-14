// ========== HAIRGATOR 향상된 등록/로그인 시스템 ==========
console.log('📱 향상된 등록/로그인 시스템 초기화...');

class HairGatorAuthSystem {
    constructor() {
        this.currentUser = this.loadUserData();
        this.isLoggedIn = !!this.currentUser;
        
        this.init();
    }
    
    init() {
        console.log('🔐 인증 시스템 상태:', {
            isLoggedIn: this.isLoggedIn,
            currentUser: this.currentUser?.name || 'None'
        });
        
        // 페이지 로드 시 자동 로그인 체크
        this.checkAutoLogin();
        
        // 핸드폰 번호 입력 필드 자동 포맷팅 설정
        this.setupPhoneFormatting();
        
        // 모달 이벤트 리스너 설정
        this.setupModalEvents();
    }
    
    loadUserData() {
        const userData = localStorage.getItem('hairgator_user_data');
        return userData ? JSON.parse(userData) : null;
    }
    
    saveUserData(userData) {
        localStorage.setItem('hairgator_user_data', JSON.stringify(userData));
        this.currentUser = userData;
        this.isLoggedIn = true;
    }
    
    clearUserData() {
        localStorage.removeItem('hairgator_user_data');
        this.currentUser = null;
        this.isLoggedIn = false;
    }
    
    checkAutoLogin() {
        if (this.isLoggedIn) {
            // 이미 로그인된 사용자 - 간편 입장 UI 표시
            this.showQuickLoginModal();
        }
    }
    
    showQuickLoginModal() {
        // 기존 모달이 있으면 제거
        const existingModal = document.querySelector('.auth-modal-overlay');
        if (existingModal) existingModal.remove();
        
        const modal = this.createQuickLoginModal();
        document.body.appendChild(modal);
    }
    
    createQuickLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal">
                <div class="auth-header">
                    <h2>🐊 HAIRGATOR</h2>
                    <p>안녕하세요, ${this.currentUser.name}님!</p>
                </div>
                
                <div class="user-info-card">
                    <div class="user-avatar">👤</div>
                    <div class="user-details">
                        <div class="user-name">${this.currentUser.name}</div>
                        <div class="user-phone">${this.formatPhoneNumber(this.currentUser.phone)}</div>
                        <div class="user-role">${this.currentUser.role === 'designer' ? '💇‍♂️ 디자이너' : '👤 고객'}</div>
                    </div>
                </div>
                
                <div class="auth-buttons">
                    <button class="auth-btn auth-btn-primary" onclick="window.authSystem.quickLogin()">
                        🚀 바로 입장하기
                    </button>
                    <button class="auth-btn auth-btn-secondary" onclick="window.authSystem.showFullRegistration()">
                        👤 다른 계정으로 로그인
                    </button>
                </div>
                
                <div class="auth-footer">
                    <button class="auth-link" onclick="window.authSystem.logout()">
                        로그아웃
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    showFullRegistration() {
        // 기존 모달 제거
        const existingModal = document.querySelector('.auth-modal-overlay');
        if (existingModal) existingModal.remove();
        
        const modal = this.createFullRegistrationModal();
        document.body.appendChild(modal);
    }
    
    createFullRegistrationModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal">
                <div class="auth-header">
                    <h2>🐊 HAIRGATOR 등록</h2>
                    <p>정보를 입력해주세요</p>
                </div>
                
                <form class="auth-form" onsubmit="window.authSystem.handleRegistration(event)">
                    <div class="form-group">
                        <label for="userName">이름</label>
                        <input type="text" id="userName" name="name" required 
                               placeholder="홍길동" class="form-input">
                    </div>
                    
                    <div class="form-group">
                        <label for="userPhone">휴대폰 번호</label>
                        <input type="tel" id="userPhone" name="phone" required 
                               placeholder="010-1234-5678" class="form-input phone-input"
                               maxlength="13">
                        <div class="input-helper">숫자만 입력하면 자동으로 하이픈이 추가됩니다</div>
                    </div>
                    
                    <div class="form-group">
                        <label>역할 선택</label>
                        <div class="role-buttons">
                            <label class="role-option">
                                <input type="radio" name="role" value="customer" checked>
                                <span class="role-card">
                                    <span class="role-icon">👤</span>
                                    <span class="role-title">고객</span>
                                    <span class="role-desc">헤어스타일을 확인하고 선택합니다</span>
                                </span>
                            </label>
                            
                            <label class="role-option">
                                <input type="radio" name="role" value="designer">
                                <span class="role-card">
                                    <span class="role-icon">💇‍♂️</span>
                                    <span class="role-title">디자이너</span>
                                    <span class="role-desc">헤어스타일을 추천하고 상담합니다</span>
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="auth-buttons">
                        <button type="submit" class="auth-btn auth-btn-primary">
                            ✨ 등록 완료
                        </button>
                    </div>
                </form>
                
                <div class="auth-footer">
                    <p>이미 등록하셨나요? 
                        <button class="auth-link" onclick="window.authSystem.showQuickLoginModal()">
                            간편 로그인
                        </button>
                    </p>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    setupPhoneFormatting() {
        // 동적으로 생성되는 input에 대응하기 위해 document에 이벤트 위임
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('phone-input')) {
                this.formatPhoneInput(e.target);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('phone-input')) {
                // 숫자, 백스페이스, 삭제, 탭, ESC, 엔터만 허용
                if (![8, 9, 27, 13, 46].includes(e.keyCode) && 
                    (e.keyCode < 48 || e.keyCode > 57) && 
                    (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            }
        });
    }
    
    formatPhoneInput(input) {
        // 숫자만 추출
        let value = input.value.replace(/\D/g, '');
        
        // 11자리 초과 시 자름
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        // 포맷팅 적용
        let formatted = '';
        if (value.length > 0) {
            if (value.length <= 3) {
                formatted = value;
            } else if (value.length <= 7) {
                formatted = value.slice(0, 3) + '-' + value.slice(3);
            } else {
                formatted = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
            }
        }
        
        input.value = formatted;
        
        // 유효성 검사
        this.validatePhoneNumber(input, value);
    }
    
    validatePhoneNumber(input, rawValue) {
        const isValid = /^010\d{8}$/.test(rawValue);
        
        if (rawValue.length === 11) {
            if (isValid) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('valid');
                input.classList.add('invalid');
            }
        } else {
            input.classList.remove('valid', 'invalid');
        }
    }
    
    formatPhoneNumber(phone) {
        // 저장된 번호를 표시용으로 포맷팅
        const numbers = phone.replace(/\D/g, '');
        if (numbers.length === 11) {
            return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7);
        }
        return phone;
    }
    
    setupModalEvents() {
        // 배경 클릭 시 모달 닫기 방지 (등록은 필수)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-modal-overlay')) {
                // 등록 모달은 닫지 않음 (필수 정보)
                return;
            }
        });
        
        // ESC 키로 닫기 방지
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.querySelector('.auth-modal-overlay')) {
                // 등록은 필수이므로 ESC로 닫기 방지
                e.preventDefault();
            }
        });
    }
    
    async handleRegistration(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            name: formData.get('name').trim(),
            phone: formData.get('phone').replace(/\D/g, ''), // 숫자만 저장
            role: formData.get('role'),
            registeredAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
        };
        
        // 유효성 검사
        if (!this.validateRegistrationData(userData)) {
            return;
        }
        
        try {
            // 로딩 상태 표시
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '등록 중...';
            submitBtn.disabled = true;
            
            // Firebase에 저장
            await this.saveToFirebase(userData);
            
            // 로컬에 저장
            this.saveUserData(userData);
            
            // 성공 메시지
            this.showSuccessMessage();
            
            // 모달 닫기
            setTimeout(() => {
                this.closeAuthModal();
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
            
            // 버튼 복원
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    validateRegistrationData(userData) {
        // 이름 검증
        if (!userData.name || userData.name.length < 2) {
            alert('이름을 2글자 이상 입력해주세요.');
            return false;
        }
        
        // 휴대폰 번호 검증
        if (!/^010\d{8}$/.test(userData.phone)) {
            alert('올바른 휴대폰 번호를 입력해주세요. (010으로 시작하는 11자리)');
            return false;
        }
        
        return true;
    }
    
    async saveToFirebase(userData) {
        if (typeof db !== 'undefined') {
            await db.collection('users').add({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ 사용자 정보 Firebase 저장 완료');
        }
    }
    
    quickLogin() {
        // 마지막 로그인 시간 업데이트
        this.currentUser.lastLoginAt = new Date().toISOString();
        this.saveUserData(this.currentUser);
        
        // 모달 닫기
        this.closeAuthModal();
        
        // 환영 메시지
        this.showWelcomeMessage();
    }
    
    logout() {
        if (confirm('정말 로그아웃 하시겠습니까?')) {
            this.clearUserData();
            
            // 모달 닫기
            this.closeAuthModal();
            
            // 새로운 등록 모달 표시
            setTimeout(() => {
                this.showFullRegistration();
            }, 500);
        }
    }
    
    closeAuthModal() {
        const modal = document.querySelector('.auth-modal-overlay');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }
    
    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.innerHTML = `
            <div class="success-content">
                <span class="success-icon">🎉</span>
                <span class="success-text">등록이 완료되었습니다!</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
    
    showWelcomeMessage() {
        const message = document.createElement('div');
        message.className = 'welcome-message';
        message.innerHTML = `
            <div class="welcome-content">
                <span class="welcome-icon">👋</span>
                <span class="welcome-text">환영합니다, ${this.currentUser.name}님!</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
    
    // 외부에서 호출할 수 있는 메서드들
    showLoginModal() {
        if (this.isLoggedIn) {
            this.showQuickLoginModal();
        } else {
            this.showFullRegistration();
        }
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isUserLoggedIn() {
        return this.isLoggedIn;
    }
}

// CSS 스타일 추가
const authStyles = document.createElement('style');
authStyles.textContent = `
    .auth-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s forwards;
    }
    
    .auth-modal {
        background: white;
        border-radius: 20px;
        padding: 30px;
        max-width: 450px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        animation: slideUp 0.3s forwards;
    }
    
    .auth-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .auth-header h2 {
        color: #2c3e50;
        font-size: 24px;
        margin-bottom: 8px;
    }
    
    .auth-header p {
        color: #5a6c7d;
        margin: 0;
    }
    
    .user-info-card {
        background: #f8f9fa;
        border-radius: 15px;
        padding: 20px;
        margin-bottom: 25px;
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .user-avatar {
        font-size: 40px;
        background: white;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .user-details {
        flex: 1;
    }
    
    .user-name {
        font-size: 18px;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 4px;
    }
    
    .user-phone {
        color: #5a6c7d;
        font-size: 14px;
        margin-bottom: 4px;
    }
    
    .user-role {
        font-size: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        display: inline-block;
    }
    
    .auth-form {
        margin-bottom: 20px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #2c3e50;
        font-weight: 600;
        font-size: 14px;
    }
    
    .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 16px;
        transition: all 0.3s;
        box-sizing: border-box;
    }
    
    .form-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .form-input.valid {
        border-color: #28a745;
        background: #f8fff9;
    }
    
    .form-input.invalid {
        border-color: #dc3545;
        background: #fff8f8;
    }
    
    .input-helper {
        font-size: 12px;
        color: #5a6c7d;
        margin-top: 4px;
    }
    
    .role-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    
    .role-option {
        cursor: pointer;
    }
    
    .role-option input[type="radio"] {
        display: none;
    }
    
    .role-card {
        display: block;
        padding: 15px;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        text-align: center;
        transition: all 0.3s;
        background: white;
    }
    
    .role-option input[type="radio"]:checked + .role-card {
        border-color: #667eea;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .role-icon {
        display: block;
        font-size: 24px;
        margin-bottom: 8px;
    }
    
    .role-title {
        display: block;
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 14px;
    }
    
    .role-desc {
        display: block;
        font-size: 11px;
        opacity: 0.8;
        line-height: 1.3;
    }
    
    .auth-buttons {
        margin: 25px 0;
    }
    
    .auth-btn {
        width: 100%;
        padding: 14px 20px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        margin-bottom: 10px;
    }
    
    .auth-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .auth-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    .auth-btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .auth-btn-secondary {
        background: #f8f9fa;
        color: #5a6c7d;
        border: 2px solid #e9ecef;
    }
    
    .auth-btn-secondary:hover {
        background: #e9ecef;
        border-color: #dee2e6;
    }
    
    .auth-footer {
        text-align: center;
        margin-top: 20px;
    }
    
    .auth-footer p {
        color: #5a6c7d;
        font-size: 14px;
        margin: 0;
    }
    
    .auth-link {
        background: none;
        border: none;
        color: #667eea;
        text-decoration: underline;
        cursor: pointer;
        font-size: 14px;
    }
    
    .auth-link:hover {
        color: #764ba2;
    }
    
    .success-message, .welcome-message {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        z-index: 10001;
        animation: slideInRight 0.3s forwards;
    }
    
    .success-content, .welcome-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .success-icon, .welcome-icon {
        font-size: 20px;
    }
    
    .success-text, .welcome-text {
        font-weight: 600;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @media (max-width: 768px) {
        .auth-modal {
            padding: 20px;
            margin: 10px;
        }
        
        .role-buttons {
            grid-template-columns: 1fr;
        }
        
        .success-message, .welcome-message {
            top: 10px;
            right: 10px;
            left: 10px;
        }
    }
`;

document.head.appendChild(authStyles);

// 인증 시스템 초기화
const authSystem = new HairGatorAuthSystem();

// 전역 노출
window.authSystem = authSystem;

console.log('✅ 향상된 등록/로그인 시스템 초기화 완료!');
