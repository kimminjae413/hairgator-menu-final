// scripts/core/auth.js
// 인증 시스템 - 정리 및 보안 강화 버전

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.loginAttempts = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15분
    }

    // 초기화
    async initialize() {
        try {
            // 기존 세션 확인
            await this.checkExistingSession();
            this.setupEventListeners();
            this.isInitialized = true;
            
            console.log('✅ 인증 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ 인증 시스템 초기화 실패:', error);
            throw error;
        }
    }

    // 기존 세션 확인
    async checkExistingSession() {
        try {
            const savedData = localStorage.getItem('hairgator_session');
            if (!savedData) return false;

            const sessionData = JSON.parse(savedData);
            
            // 세션 만료 확인 (24시간)
            const sessionAge = Date.now() - sessionData.loginTime;
            if (sessionAge > 24 * 60 * 60 * 1000) {
                this.clearSession();
                return false;
            }

            // 데이터 검증
            if (this.validateSessionData(sessionData)) {
                this.currentUser = {
                    name: sessionData.name,
                    phone: sessionData.phone,
                    loginTime: sessionData.loginTime,
                    permissions: sessionData.permissions || []
                };
                
                console.log('✅ 기존 세션 복원:', this.currentUser.name);
                this.updateUI();
                return true;
            }
        } catch (error) {
            console.warn('세션 복원 실패:', error);
            this.clearSession();
        }
        return false;
    }

    // 세션 데이터 검증
    validateSessionData(data) {
        return data && 
               data.name && 
               data.phone && 
               data.loginTime &&
               window.SecurityUtils.validateInput(data.name, 'name') &&
               window.SecurityUtils.validateInput(data.phone, 'phone');
    }

    // 로그인 처리
    async login(name, phone, password) {
        try {
            // 계정 잠금 확인
            if (this.isAccountLocked()) {
                throw new Error('계정이 일시적으로 잠겼습니다. 15분 후 다시 시도하세요.');
            }

            // 입력값 검증
            if (!this.validateLoginInput(name, phone, password)) {
                this.loginAttempts++;
                throw new Error('입력값이 올바르지 않습니다.');
            }

            // Firebase에서 사용자 확인
            const user = await this.authenticateUser(name, phone, password);
            
            if (user) {
                // 성공: 세션 생성
                this.currentUser = {
                    name: user.name,
                    phone: user.phone,
                    loginTime: Date.now(),
                    permissions: user.permissions || [],
                    level: user.level || 1  // 기본 레벨 1
                };

                this.saveSession();
                this.resetLoginAttempts();
                this.updateUI();
                
                console.log('✅ 로그인 성공:', this.currentUser.name);
                return true;
            } else {
                // 실패: 시도 횟수 증가
                this.loginAttempts++;
                throw new Error('로그인 정보가 올바르지 않습니다.');
            }

        } catch (error) {
            console.error('로그인 오류:', error);
            
            // 에러 로깅
            if (window.ErrorHandler) {
                await window.ErrorHandler.logError(error, 'login', null);
            }
            
            throw error;
        }
    }

    // 입력값 검증
    validateLoginInput(name, phone, password) {
        return window.SecurityUtils.validateInput(name, 'name') &&
               window.SecurityUtils.validateInput(phone, 'phone') &&
               password && password.length === 4;
    }

    // Firebase 사용자 인증
    async authenticateUser(name, phone, password) {
        try {
            // Firestore에서 사용자 조회
            const userQuery = await window.db.collection(window.COLLECTIONS.USERS)
                .where('phone', '==', phone)
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (userQuery.empty) {
                return null;
            }

            const userData = userQuery.docs[0].data();
            
            // 이름과 비밀번호 확인 (실제로는 해시된 비밀번호 사용 권장)
            if (userData.name === name && userData.password === password) {
                // 마지막 로그인 시간 업데이트
                await userQuery.docs[0].ref.update({
                    lastLogin: new Date(),
                    loginCount: (userData.loginCount || 0) + 1
                });

                return {
                    name: userData.name,
                    phone: userData.phone,
                    permissions: userData.permissions || [],
                    level: userData.level || 1
                };
            }

            return null;
        } catch (error) {
            console.error('Firebase 인증 오류:', error);
            throw new Error('서버 연결에 실패했습니다. 잠시 후 다시 시도하세요.');
        }
    }

    // 계정 잠금 확인
    isAccountLocked() {
        if (this.loginAttempts < this.maxAttempts) return false;
        
        const lockoutData = localStorage.getItem('hairgator_lockout');
        if (!lockoutData) return false;

        const lockoutTime = parseInt(lockoutData);
        const timeSinceLockout = Date.now() - lockoutTime;
        
        if (timeSinceLockout < this.lockoutTime) {
            return true;
        } else {
            // 잠금 시간이 지났으므로 해제
            this.resetLoginAttempts();
            return false;
        }
    }

    // 로그인 시도 횟수 초기화
    resetLoginAttempts() {
        this.loginAttempts = 0;
        localStorage.removeItem('hairgator_lockout');
    }

    // 로그아웃
    async logout() {
        try {
            this.clearSession();
            this.currentUser = null;
            this.updateUI();
            
            console.log('✅ 로그아웃 완료');
            
            // 로그인 화면으로 리다이렉트
            window.location.reload();
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    }

    // 세션 저장
    saveSession() {
        try {
            const sessionData = {
                name: this.currentUser.name,
                phone: this.currentUser.phone,
                loginTime: this.currentUser.loginTime,
                permissions: this.currentUser.permissions,
                level: this.currentUser.level
            };

            localStorage.setItem('hairgator_session', JSON.stringify(sessionData));
        } catch (error) {
            console.error('세션 저장 실패:', error);
        }
    }

    // 세션 삭제
    clearSession() {
        localStorage.removeItem('hairgator_session');
        localStorage.removeItem('hairgator_gender');
    }

    // UI 업데이트
    updateUI() {
        const designerInfo = document.getElementById('designerInfo');
        const designerNameDisplay = document.getElementById('designerNameDisplay');
        const adminSection = document.getElementById('adminSection');

        if (this.currentUser) {
            // 로그인된 상태
            if (designerInfo) designerInfo.style.display = 'block';
            if (designerNameDisplay) designerNameDisplay.textContent = this.currentUser.name;
            
            // 관리자 링크 표시 (개발 모드에서만)
            if (adminSection && window.location.hostname === 'localhost') {
                adminSection.style.display = 'block';
            }
        } else {
            // 로그아웃된 상태
            if (designerInfo) designerInfo.style.display = 'none';
            if (adminSection) adminSection.style.display = 'none';
        }
    }

    // 권한 확인
    hasPermission(feature) {
        if (!this.currentUser) return false;
        
        // 기본 레벨 확인
        if (this.currentUser.level >= 2) return true;
        
        // 개별 권한 확인
        return this.currentUser.permissions.includes(feature);
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLoginSubmit();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('로그아웃 하시겠습니까?')) {
                    await this.logout();
                }
            });
        }
    }

    // 로그인 폼 제출 처리
    async handleLoginSubmit() {
        const nameInput = document.getElementById('designerName');
        const phoneInput = document.getElementById('phoneNumber');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');

        try {
            // 로딩 상태 표시
            this.setLoginLoading(true);

            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value.trim();

            await this.login(name, phone, password);

            // 성공: 성별 선택 화면으로 이동
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('genderSelection').classList.add('active');

        } catch (error) {
            // 실패: 에러 메시지 표시
            this.showError(error.message);
            
            // 계정 잠금 시 추가 처리
            if (this.loginAttempts >= this.maxAttempts) {
                localStorage.setItem('hairgator_lockout', Date.now().toString());
            }
        } finally {
            this.setLoginLoading(false);
        }
    }

    // 로그인 로딩 상태
    setLoginLoading(isLoading) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoading = loginBtn.querySelector('.btn-loading');

        if (isLoading) {
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            loginBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    }

    // 에러 메시지 표시
    showError(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = 'toast show error';
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 5000);
        } else {
            alert(message);
        }
    }

    // Getter: 현재 사용자
    getCurrentUser() {
        return this.currentUser;
    }

    // Getter: 로그인 상태
    isLoggedIn() {
        return !!this.currentUser;
    }
}

// 전역 인스턴스 생성
const authManager = new AuthManager();

// 전역 접근을 위한 등록
window.authManager = authManager;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await authManager.initialize();
    } catch (error) {
        console.error('인증 시스템 초기화 실패:', error);
    }
});

console.log('✅ Auth 시스템 로드 완료');