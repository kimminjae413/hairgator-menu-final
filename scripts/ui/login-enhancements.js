// scripts/ui/login-enhancements.js
// 로그인 화면 향상된 기능들

class LoginEnhancements {
    constructor() {
        this.isLoading = false;
        this.currentStep = 'loading'; // loading -> login -> gender -> menu
        this.welcomeMessages = [
            "오늘도 멋진 스타일을 만들어보세요!",
            "고객님께 완벽한 헤어스타일을 제안하세요!",
            "새로운 하루, 새로운 스타일링을 시작하세요!",
            "창의적인 헤어 디자인의 시간입니다!",
            "최고의 헤어 아티스트가 되어보세요!"
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.handleInitialLoad();
        this.setupInputEnhancements();
        this.setupKeyboardShortcuts();
    }

    // ========== 초기 로딩 처리 ==========
    async handleInitialLoad() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loginScreen = document.getElementById('loginScreen');

        try {
            // 시스템 초기화 시뮬레이션
            await this.simulateSystemInit();
            
            // 페이드 아웃 효과
            loadingScreen.classList.add('fade-out');
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loginScreen.classList.add('active');
                this.currentStep = 'login';
                
                // 첫 번째 입력 필드에 포커스
                const firstInput = document.getElementById('designerName');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 300);
                }
            }, 800);

        } catch (error) {
            console.error('시스템 초기화 오류:', error);
            this.showError('시스템 초기화에 실패했습니다. 페이지를 새로고침하세요.');
        }
    }

    async simulateSystemInit() {
        const steps = [
            { text: '시스템 준비 중...', delay: 500 },
            { text: 'Firebase 연결 중...', delay: 300 },
            { text: '인증 시스템 로드 중...', delay: 400 },
            { text: '준비 완료!', delay: 200 }
        ];

        const loadingText = document.querySelector('.loading-text');
        
        for (const step of steps) {
            if (loadingText) {
                loadingText.textContent = step.text;
            }
            await new Promise(resolve => setTimeout(resolve, step.delay));
        }
    }

    // ========== 이벤트 리스너 설정 ==========
    setupEventListeners() {
        // 로그인 폼
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // 성별 버튼들
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleGenderSelection(e));
        });

        // 도움말 기능
        this.setupHelpFunctions();

        // 입력 필드 실시간 검증
        this.setupInputValidation();
    }

    // ========== 입력 필드 향상 ==========
    setupInputEnhancements() {
        const inputs = document.querySelectorAll('.form-group input');
        
        inputs.forEach(input => {
            // 포커스 효과
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });

            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });

            // 자동 대문자 변환 (이름 필드)
            if (input.id === 'designerName') {
                input.addEventListener('input', (e) => {
                    // 첫 글자만 대문자로
                    e.target.value = e.target.value.charAt(0).toUpperCase() + 
                                   e.target.value.slice(1).toLowerCase();
                });
            }

            // 숫자만 입력 허용 (전화번호, 비밀번호)
            if (input.type === 'tel' || input.id === 'password') {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }
        });
    }

    // ========== 실시간 입력 검증 ==========
    setupInputValidation() {
        const nameInput = document.getElementById('designerName');
        const phoneInput = document.getElementById('phoneNumber');
        const passwordInput = document.getElementById('password');

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                this.validateField(nameInput, 'name');
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                this.validateField(phoneInput, 'phone');
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.validateField(passwordInput, 'password');
            });
        }
    }

    validateField(input, type) {
        const value = input.value.trim();
        let isValid = false;
        let message = '';

        switch (type) {
            case 'name':
                isValid = value.length >= 2 && value.length <= 20;
                message = isValid ? '' : '이름은 2-20자 사이여야 합니다';
                break;
            case 'phone':
                isValid = /^\d{4}$/.test(value);
                message = isValid ? '' : '4자리 숫자를 입력하세요';
                break;
            case 'password':
                isValid = /^\d{4}$/.test(value);
                message = isValid ? '' : '4자리 숫자를 입력하세요';
                break;
        }

        this.showFieldValidation(input, isValid, message);
        return isValid;
    }

    showFieldValidation(input, isValid, message) {
        const formGroup = input.parentElement;
        
        // 기존 메시지 제거
        const existingMessage = formGroup.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!isValid && message) {
            const messageElement = document.createElement('div');
            messageElement.className = 'validation-message';
            messageElement.textContent = message;
            messageElement.style.cssText = `
                color: #ff4444;
                font-size: 0.8rem;
                margin-top: 5px;
                animation: fadeInUp 0.3s ease;
            `;
            formGroup.appendChild(messageElement);
        }

        // 입력 필드 스타일 변경
        if (input.value.trim()) {
            input.style.borderColor = isValid ? '#4CAF50' : '#ff4444';
        } else {
            input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    }

    // ========== 키보드 단축키 ==========
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Enter 키로 다음 입력 필드로 이동
            if (e.key === 'Enter' && this.currentStep === 'login') {
                e.preventDefault();
                this.handleEnterKey(e.target);
            }

            // ESC 키로 취소
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    handleEnterKey(currentInput) {
        const inputs = ['designerName', 'phoneNumber', 'password'];
        const currentIndex = inputs.indexOf(currentInput.id);
        
        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            const nextInput = document.getElementById(inputs[currentIndex + 1]);
            if (nextInput) {
                nextInput.focus();
            }
        } else if (currentIndex === inputs.length - 1) {
            // 마지막 입력 필드에서 Enter 시 로그인 시도
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    }

    handleEscapeKey() {
        // 현재 포커스된 입력 필드에서 포커스 제거
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            activeElement.blur();
        }
    }

    // ========== 로그인 처리 ==========
    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isLoading) return;
        this.isLoading = true;

        const nameInput = document.getElementById('designerName');
        const phoneInput = document.getElementById('phoneNumber');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');

        try {
            // 입력값 검증
            const isNameValid = this.validateField(nameInput, 'name');
            const isPhoneValid = this.validateField(phoneInput, 'phone');
            const isPasswordValid = this.validateField(passwordInput, 'password');

            if (!isNameValid || !isPhoneValid || !isPasswordValid) {
                throw new Error('입력값을 확인해주세요.');
            }

            // 로딩 UI 표시
            this.setLoginLoading(true);

            // 인증 처리
            const result = await window.authManager.login(
                nameInput.value.trim(),
                phoneInput.value.trim(),
                passwordInput.value.trim()
            );

            if (result) {
                // 성공: 성별 선택 화면으로 전환
                await this.transitionToGenderSelection(nameInput.value.trim());
            }

        } catch (error) {
            console.error('로그인 오류:', error);
            this.showError(error.message || '로그인에 실패했습니다.');
            this.shakeLoginForm();
        } finally {
            this.setLoginLoading(false);
            this.isLoading = false;
        }
    }

    // ========== 성별 선택 화면 전환 ==========
    async transitionToGenderSelection(userName) {
        const loginScreen = document.getElementById('loginScreen');
        const genderScreen = document.getElementById('genderSelection');
        
        // 환영 메시지 설정
        const welcomeElement = document.querySelector('.welcome-user');
        if (welcomeElement) {
            const randomMessage = this.welcomeMessages[
                Math.floor(Math.random() * this.welcomeMessages.length)
            ];
            welcomeElement.innerHTML = `
                <strong>${userName}</strong> 디자이너님 환영합니다!<br>
                <small>${randomMessage}</small>
            `;
        }

        // 화면 전환 애니메이션
        loginScreen.style.transform = 'translateX(-100%)';
        loginScreen.style.opacity = '0';
        
        setTimeout(() => {
            loginScreen.classList.remove('active');
            loginScreen.style.transform = '';
            loginScreen.style.opacity = '';
            
            genderScreen.classList.add('active');
            this.currentStep = 'gender';
        }, 600);
    }

    // ========== 성별 선택 처리 ==========
    handleGenderSelection(event) {
        const genderBtn = event.currentTarget;
        const gender = genderBtn.dataset.gender;
        
        // 버튼 애니메이션
        genderBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            genderBtn.style.transform = '';
        }, 150);

        // 선택 표시
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        genderBtn.classList.add('selected');

        // 잠시 후 메뉴로 이동
        setTimeout(() => {
            if (window.selectGender) {
                window.selectGender(gender);
                this.currentStep = 'menu';
            }
        }, 500);
    }

    // ========== UI 헬퍼 메서드들 ==========
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

    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error', 5000);
        } else {
            alert(message);
        }
    }

    shakeLoginForm() {
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                loginContainer.style.animation = '';
            }, 500);
        }
    }

    // ========== 도움말 기능 ==========
    setupHelpFunctions() {
        // 전역 함수로 등록
        window.showLoginHelp = () => {
            const helpMessage = `
                📱 HAIRGATOR 로그인 도움말

                ✅ 디자이너명: 실제 이름을 입력하세요
                ✅ 전화번호: 본인 번호의 뒤 4자리
                ✅ 비밀번호: 등록시 설정한 4자리 숫자

                🔐 계정이 없으신가요?
                관리자에게 계정 생성을 요청하세요.

                ⚠️ 로그인에 실패한다면?
                1. 입력 정보를 다시 확인해주세요
                2. 계정 활성화 상태를 확인하세요
                3. 관리자에게 문의하세요
            `;
            
            if (window.showToast) {
                window.showToast(helpMessage, 'info', 8000);
            } else {
                alert(helpMessage);
            }
        };

        window.contactAdmin = () => {
            const contactMessage = `
                📞 관리자 연락처

                계정 문의, 기술 지원이 필요하시면
                관리자에게 연락해주세요.

                💬 문의 내용:
                • 신규 계정 생성
                • 비밀번호 초기화  
                • 권한 변경 요청
                • 시스템 오류 신고
            `;
            
            if (window.showToast) {
                window.showToast(contactMessage, 'info', 6000);
            } else {
                alert(contactMessage);
            }
        };
    }

    // ========== 접근성 개선 ==========
    improveAccessibility() {
        // 고대비 모드 감지
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }

        // 애니메이션 감소 모드 감지
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }

        // 화면 읽기 프로그램 지원
        this.setupScreenReaderSupport();
    }

    setupScreenReaderSupport() {
        // 로그인 상태 알림
        const announceElement = document.createElement('div');
        announceElement.setAttribute('aria-live', 'polite');
        announceElement.setAttribute('aria-atomic', 'true');
        announceElement.className = 'sr-only';
        announceElement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announceElement);

        this.announceElement = announceElement;
    }

    announce(message) {
        if (this.announceElement) {
            this.announceElement.textContent = message;
        }
    }
}

// shake 애니메이션 CSS 추가
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = shakeKeyframes;
document.head.appendChild(styleSheet);

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    window.loginEnhancements = new LoginEnhancements();
});

console.log('✅ 로그인 향상 기능 로드 완료');
