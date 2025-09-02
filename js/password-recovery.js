// ========== HAIRGATOR 패스워드 복구 시스템 (셀프 확인 버전) ==========
// js/password-recovery.js

(function() {
    'use strict';

    // 패스워드 복구 시스템 클래스 (셀프 확인 기능 추가)
    class PasswordRecoverySystem {
        constructor() {
            this.db = null; // Firebase 연결은 메인에서 전달받음
            this.maxLoginAttempts = 3;
            this.lockoutDuration = 15 * 60 * 1000; // 15분
            this.passwordHideTimeout = null; // 패스워드 자동 숨김 타이머
            this.init();
        }

        init() {
            // Firebase DB 연결 대기
            this.waitForFirebase();
            console.log('🔐 패스워드 복구 시스템 초기화 완료 (셀프 확인 기능 포함)');
        }

        waitForFirebase() {
            const checkFirebase = () => {
                // 전역 변수들 확인
                if (window.firebase && (window.db || window.firestore)) {
                    this.db = window.db || window.firestore || firebase.firestore();
                    console.log('✅ Firebase 연결 확인됨 - 패스워드 복구 시스템 활성화');
                    return;
                }
                
                // Firebase 인스턴스 직접 확인
                if (window.firebase && firebase.firestore) {
                    try {
                        this.db = firebase.firestore();
                        console.log('✅ Firebase 직접 연결 - 패스워드 복구 시스템 활성화');
                        return;
                    } catch (error) {
                        console.warn('Firebase 직접 연결 실패:', error);
                    }
                }
                
                // 재시도
                setTimeout(checkFirebase, 200);
            };
            
            // 즉시 실행 + 재시도
            checkFirebase();
        }

        // 🆕 셀프 패스워드 확인 - 본인 계정의 패스워드 직접 조회
        async getSelfPassword(name, phone) {
            try {
                if (!this.db) {
                    throw new Error('데이터베이스 연결이 필요합니다');
                }

                const formattedPhone = this.formatPhoneNumber(phone);
                
                const snapshot = await this.db.collection('designers')
                    .where('name', '==', name.trim())
                    .where('phone', '==', formattedPhone)
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    throw new Error('입력하신 정보와 일치하는 계정이 없습니다.\n디자이너명과 전화번호를 다시 확인해주세요.');
                }

                const userData = snapshot.docs[0].data();
                
                // 조회 기록 저장
                await this.logPasswordAccess(name, formattedPhone);
                
                return {
                    success: true,
                    password: userData.password,
                    userData: {
                        name: userData.name,
                        phone: userData.phone,
                        tokens: userData.tokens || 0,
                        lastLogin: userData.lastLogin || '기록 없음'
                    }
                };

            } catch (error) {
                console.error('패스워드 조회 중 오류:', error);
                throw error;
            }
        }

        // 패스워드 조회 기록 저장
        async logPasswordAccess(name, phone) {
            try {
                await this.db.collection('password_access_logs').add({
                    designerName: name,
                    designerPhone: phone,
                    accessedAt: new Date(),
                    deviceInfo: this.getDeviceInfo(),
                    ipAddress: await this.getClientIP(),
                    accessType: 'self_check'
                });
            } catch (error) {
                console.warn('접근 기록 저장 실패:', error);
            }
        }

        // 🆕 셀프 패스워드 확인 모달
        showSelfPasswordCheckModal() {
            this.closeAllModals();

            const modal = document.createElement('div');
            modal.className = 'self-password-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeSelfPasswordModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>내 패스워드 확인</h3>
                        <button class="modal-close" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeSelfPasswordModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="step-indicator">
                            <div class="step active" data-step="1">본인 확인</div>
                            <div class="step" data-step="2">패스워드 확인</div>
                            <div class="step" data-step="3">변경 요청</div>
                        </div>
                        
                        <!-- 1단계: 본인 확인 -->
                        <div id="selfStep1" class="recovery-step active">
                            <p class="step-description">본인 계정 정보를 입력하여 패스워드를 확인하세요.</p>
                            
                            <div class="security-notice">
                                <div class="notice-icon">🔐</div>
                                <div class="notice-text">
                                    <strong>보안 안내</strong><br>
                                    패스워드는 10초간만 표시되며 자동으로 숨겨집니다.
                                </div>
                            </div>
                            
                            <form id="selfPasswordCheckForm">
                                <div class="form-group">
                                    <label for="selfCheckName">디자이너명</label>
                                    <input type="text" id="selfCheckName" placeholder="등록하신 이름을 입력하세요" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="selfCheckPhone">전화번호</label>
                                    <input type="tel" id="selfCheckPhone" placeholder="010-0000-0000" maxlength="13" required>
                                </div>
                                
                                <button type="submit" class="btn-primary" id="selfCheckBtn">
                                    패스워드 확인
                                </button>
                            </form>
                        </div>
                        
                        <!-- 2단계: 패스워드 표시 -->
                        <div id="selfStep2" class="recovery-step">
                            <div class="password-result">
                                <div class="success-icon">✅</div>
                                <h4>패스워드를 확인했습니다</h4>
                                
                                <div class="password-display">
                                    <div class="password-label">현재 패스워드:</div>
                                    <div class="password-value" id="displayedPassword">****</div>
                                    <div class="password-timer">
                                        <div class="timer-bar" id="passwordTimer"></div>
                                        <div class="timer-text" id="timerText">10초 후 자동으로 숨겨집니다</div>
                                    </div>
                                </div>
                                
                                <div class="account-info" id="accountInfo">
                                    <h5>계정 정보</h5>
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="info-label">이름:</span>
                                            <span class="info-value" id="userName">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="info-label">전화번호:</span>
                                            <span class="info-value" id="userPhone">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="info-label">토큰:</span>
                                            <span class="info-value" id="userTokens">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="info-label">마지막 로그인:</span>
                                            <span class="info-value" id="lastLogin">-</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="modal-actions">
                                    <button class="btn-secondary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeSelfPasswordModal()">확인</button>
                                    <button class="btn-primary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.goToPasswordChangeRequest()">패스워드 변경 요청</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 3단계: 패스워드 변경 요청 -->
                        <div id="selfStep3" class="recovery-step">
                            <div class="change-request">
                                <div class="change-icon">🔄</div>
                                <h4>새 패스워드 요청</h4>
                                <p>새로운 패스워드로 변경을 원하시면 아래 정보를 입력하세요.</p>
                                
                                <form id="passwordChangeRequestForm">
                                    <div class="form-group">
                                        <label for="newPasswordRequest">원하는 새 패스워드</label>
                                        <input type="text" id="newPasswordRequest" placeholder="새로 사용할 패스워드 입력" maxlength="20" required>
                                        <small class="form-help">4-20자, 숫자와 영문 조합 권장</small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="changeReason">변경 사유 (선택)</label>
                                        <select id="changeReason">
                                            <option value="보안 강화">보안 강화</option>
                                            <option value="기억하기 쉬운 패스워드로">기억하기 쉬운 패스워드로</option>
                                            <option value="정기 변경">정기 변경</option>
                                            <option value="기타">기타</option>
                                        </select>
                                    </div>
                                    
                                    <div class="change-notice">
                                        <strong>⚠️ 주의사항:</strong><br>
                                        • 패스워드 변경은 관리자 승인 후 적용됩니다<br>
                                        • 승인까지 기존 패스워드를 계속 사용하세요<br>
                                        • 보통 1-2시간 내에 변경됩니다
                                    </div>
                                    
                                    <div class="modal-actions">
                                        <button type="button" class="btn-secondary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.goBackToStep2()">이전으로</button>
                                        <button type="submit" class="btn-primary" id="changeRequestBtn">변경 요청</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 전화번호 포맷팅
            const phoneInput = modal.querySelector('#selfCheckPhone');
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
            
            // 폼 제출 처리
            const form = modal.querySelector('#selfPasswordCheckForm');
            form.addEventListener('submit', (e) => this.handleSelfPasswordCheck(e));

            // 패스워드 변경 요청 폼 처리
            const changeForm = modal.querySelector('#passwordChangeRequestForm');
            changeForm.addEventListener('submit', (e) => this.handlePasswordChangeRequest(e));
        }

        // 셀프 패스워드 확인 처리
        async handleSelfPasswordCheck(e) {
            e.preventDefault();
            
            const name = document.getElementById('selfCheckName').value.trim();
            const phone = document.getElementById('selfCheckPhone').value.trim();
            const checkBtn = document.getElementById('selfCheckBtn');
            
            if (!name || !phone) {
                this.showToast('모든 정보를 입력해주세요', 'error');
                return;
            }
            
            checkBtn.disabled = true;
            checkBtn.textContent = '확인 중...';
            
            try {
                const result = await this.getSelfPassword(name, phone);
                
                // 계정 정보 표시
                document.getElementById('userName').textContent = result.userData.name;
                document.getElementById('userPhone').textContent = result.userData.phone;
                document.getElementById('userTokens').textContent = result.userData.tokens;
                document.getElementById('lastLogin').textContent = 
                    result.userData.lastLogin === '기록 없음' ? '기록 없음' : 
                    new Date(result.userData.lastLogin.seconds * 1000).toLocaleString('ko-KR');
                
                // 단계 전환
                this.goToStep(2);
                
                // 패스워드 표시 및 타이머 시작
                this.showPasswordWithTimer(result.password);
                
                this.showToast('패스워드를 확인했습니다', 'success');
                
            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                checkBtn.disabled = false;
                checkBtn.textContent = '패스워드 확인';
            }
        }

        // 패스워드를 10초간 표시하고 자동 숨김
        showPasswordWithTimer(password) {
            const passwordElement = document.getElementById('displayedPassword');
            const timerBar = document.getElementById('passwordTimer');
            const timerText = document.getElementById('timerText');
            
            // 패스워드 표시
            passwordElement.textContent = password;
            passwordElement.classList.add('visible');
            
            // 기존 타이머 클리어
            if (this.passwordHideTimeout) {
                clearTimeout(this.passwordHideTimeout);
            }
            
            // 타이머 바 애니메이션
            timerBar.style.width = '100%';
            timerBar.style.transition = 'width 10s linear';
            
            let countdown = 10;
            const countdownInterval = setInterval(() => {
                countdown--;
                timerText.textContent = countdown > 0 ? 
                    `${countdown}초 후 자동으로 숨겨집니다` : 
                    '패스워드가 숨겨졌습니다';
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
            
            // 10초 후 패스워드 숨김
            this.passwordHideTimeout = setTimeout(() => {
                passwordElement.textContent = '••••••••';
                passwordElement.classList.remove('visible');
                timerBar.style.width = '0%';
                timerText.textContent = '보안을 위해 패스워드가 숨겨졌습니다';
            }, 10000);
            
            // 타이머 바 시작
            setTimeout(() => {
                timerBar.style.width = '0%';
            }, 100);
        }

        // 패스워드 변경 요청 처리
        async handlePasswordChangeRequest(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPasswordRequest').value.trim();
            const reason = document.getElementById('changeReason').value;
            const changeBtn = document.getElementById('changeRequestBtn');
            
            // 현재 사용자 정보
            const userName = document.getElementById('userName').textContent;
            const userPhone = document.getElementById('userPhone').textContent;
            
            if (!newPassword) {
                this.showToast('새 패스워드를 입력해주세요', 'error');
                return;
            }

            if (newPassword.length < 4) {
                this.showToast('패스워드는 최소 4자 이상 입력해주세요', 'error');
                return;
            }
            
            changeBtn.disabled = true;
            changeBtn.textContent = '요청 중...';
            
            try {
                const changeRequest = {
                    designerName: userName,
                    designerPhone: userPhone,
                    currentPassword: '***', // 보안상 기록하지 않음
                    requestedPassword: newPassword,
                    reason: reason,
                    requestedAt: new Date(),
                    status: 'pending',
                    requestId: this.generateRequestId(),
                    requestType: 'password_change',
                    deviceInfo: this.getDeviceInfo(),
                    ipAddress: await this.getClientIP()
                };

                await this.db.collection('password_change_requests').add(changeRequest);
                
                this.showToast('패스워드 변경 요청이 완료되었습니다!\n관리자 승인 후 변경됩니다.', 'success');
                
                // 모달 닫기
                setTimeout(() => {
                    this.closeSelfPasswordModal();
                }, 2000);
                
            } catch (error) {
                console.error('패스워드 변경 요청 실패:', error);
                this.showToast('요청 처리 중 문제가 발생했습니다. 다시 시도해주세요.', 'error');
            } finally {
                changeBtn.disabled = false;
                changeBtn.textContent = '변경 요청';
            }
        }

        // 단계 전환 함수들
        goToStep(stepNumber) {
            // 모든 단계 비활성화
            document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            document.querySelectorAll('.recovery-step').forEach(step => step.classList.remove('active'));
            
            // 해당 단계 활성화
            document.querySelector(`[data-step="${stepNumber}"]`).classList.add('active');
            document.getElementById(`selfStep${stepNumber}`).classList.add('active');
        }

        goToPasswordChangeRequest() {
            this.goToStep(3);
        }

        goBackToStep2() {
            this.goToStep(2);
        }

        // 기존 함수들 (계정 존재 여부 확인, 패스워드 재설정 요청 등)
        async checkAccountExists(name, phone) {
            try {
                if (!this.db) {
                    throw new Error('데이터베이스 연결이 필요합니다');
                }

                const formattedPhone = this.formatPhoneNumber(phone);
                
                const snapshot = await this.db.collection('designers')
                    .where('name', '==', name.trim())
                    .where('phone', '==', formattedPhone)
                    .limit(1)
                    .get();

                return !snapshot.empty;
            } catch (error) {
                console.error('계정 확인 중 오류:', error);
                throw new Error('계정 확인 중 문제가 발생했습니다. 다시 시도해주세요.');
            }
        }

        async requestPasswordReset(name, phone, reason) {
            try {
                const accountExists = await this.checkAccountExists(name, phone);
                
                if (!accountExists) {
                    throw new Error('입력하신 정보와 일치하는 계정이 없습니다.\n디자이너명과 전화번호를 다시 확인해주세요.');
                }

                const resetRequest = {
                    designerName: name.trim(),
                    designerPhone: this.formatPhoneNumber(phone),
                    reason: reason || '패스워드 분실',
                    requestedAt: new Date(),
                    status: 'pending',
                    requestId: this.generateRequestId(),
                    deviceInfo: this.getDeviceInfo(),
                    ipAddress: await this.getClientIP()
                };

                await this.db.collection('password_reset_requests').add(resetRequest);

                return {
                    success: true,
                    requestId: resetRequest.requestId,
                    message: '패스워드 재설정 요청이 접수되었습니다.\n관리자 승인 후 연락드리겠습니다.'
                };

            } catch (error) {
                console.error('패스워드 재설정 요청 실패:', error);
                throw error;
            }
        }

        // 로그인 시도 횟수 관리 (기존 함수들)
        async checkLoginAttempts(name, phone) {
            try {
                const key = `${name}_${phone}`;
                const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
                const userAttempts = attempts[key];

                if (userAttempts && userAttempts.count >= this.maxLoginAttempts) {
                    const timeSinceLock = Date.now() - userAttempts.lockedAt;
                    
                    if (timeSinceLock < this.lockoutDuration) {
                        const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLock) / 1000 / 60);
                        throw new Error(`계정이 일시적으로 잠겼습니다.\n${remainingTime}분 후 다시 시도해주세요.`);
                    } else {
                        delete attempts[key];
                        localStorage.setItem('hairgator_login_attempts', JSON.stringify(attempts));
                    }
                }

                return true;
            } catch (error) {
                throw error;
            }
        }

        incrementLoginAttempts(name, phone) {
            const key = `${name}_${phone}`;
            const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
            
            if (!attempts[key]) {
                attempts[key] = { count: 1, firstAttempt: Date.now() };
            } else {
                attempts[key].count++;
                if (attempts[key].count >= this.maxLoginAttempts) {
                    attempts[key].lockedAt = Date.now();
                }
            }

            localStorage.setItem('hairgator_login_attempts', JSON.stringify(attempts));
            
            const remainingAttempts = this.maxLoginAttempts - attempts[key].count;
            if (remainingAttempts > 0) {
                return `로그인 실패.\n${remainingAttempts}번 더 틀리면 계정이 잠깁니다.`;
            } else {
                return '계정이 15분간 잠겼습니다.\n패스워드 찾기 기능을 이용해주세요.';
            }
        }

        clearLoginAttempts(name, phone) {
            const key = `${name}_${phone}`;
            const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
            delete attempts[key];
            localStorage.setItem('hairgator_login_attempts', JSON.stringify(attempts));
        }

        // 기존 모달 함수들 (패스워드 찾기, 계정 확인, 관리자 연락)
        showPasswordRecoveryModal() {
            this.closeAllModals();

            const modal = document.createElement('div');
            modal.className = 'password-recovery-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closePasswordRecoveryModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>패스워드 찾기 (관리자 승인)</h3>
                        <button class="modal-close" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closePasswordRecoveryModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="step-indicator">
                            <div class="step active" data-step="1">계정 확인</div>
                            <div class="step" data-step="2">요청 완료</div>
                        </div>
                        
                        <div id="step1" class="recovery-step active">
                            <p class="step-description">관리자 승인을 통한 패스워드 재설정을 요청합니다.</p>
                            
                            <form id="passwordResetForm">
                                <div class="form-group">
                                    <label for="recoveryName">디자이너명</label>
                                    <input type="text" id="recoveryName" placeholder="등록하신 이름을 입력하세요" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="recoveryPhone">전화번호</label>
                                    <input type="tel" id="recoveryPhone" placeholder="010-0000-0000" maxlength="13" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="resetReason">사유 (선택)</label>
                                    <select id="resetReason">
                                        <option value="패스워드 분실">패스워드 분실</option>
                                        <option value="패스워드 기억 안남">패스워드 기억 안남</option>
                                        <option value="계정 문제">계정 접근 문제</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                                
                                <button type="submit" class="btn-primary" id="requestResetBtn">
                                    관리자 승인 요청
                                </button>
                            </form>
                        </div>
                        
                        <div id="step2" class="recovery-step">
                            <div class="success-message">
                                <div class="success-icon">✅</div>
                                <h4>패스워드 재설정 요청 완료</h4>
                                <p id="requestResult"></p>
                                <div class="request-info">
                                    <p><strong>다음 단계:</strong></p>
                                    <ul>
                                        <li>관리자가 요청을 검토합니다</li>
                                        <li>신원 확인 후 새 패스워드를 안내드립니다</li>
                                        <li>보통 1-2시간 내에 연락드립니다</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="modal-actions">
                                <button class="btn-secondary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closePasswordRecoveryModal()">확인</button>
                                <button class="btn-primary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.showContactAdmin()">관리자 연락</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const phoneInput = modal.querySelector('#recoveryPhone');
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
            
            const form = modal.querySelector('#passwordResetForm');
            form.addEventListener('submit', (e) => this.handlePasswordResetRequest(e));
        }

        async handlePasswordResetRequest(e) {
            e.preventDefault();
            
            const name = document.getElementById('recoveryName').value.trim();
            const phone = document.getElementById('recoveryPhone').value.trim();
            const reason = document.getElementById('resetReason').value;
            const requestBtn = document.getElementById('requestResetBtn');
            
            if (!name || !phone) {
                this.showToast('모든 정보를 입력해주세요', 'error');
                return;
            }
            
            requestBtn.disabled = true;
            requestBtn.textContent = '요청 중...';
            
            try {
                const result = await this.requestPasswordReset(name, phone, reason);
                
                document.querySelector('[data-step="1"]').classList.remove('active');
                document.querySelector('[data-step="2"]').classList.add('active');
                document.getElementById('step1').classList.remove('active');
                document.getElementById('step2').classList.add('active');
                document.getElementById('requestResult').textContent = result.message;
                
                this.showToast('요청이 성공적으로 접수되었습니다', 'success');
                
            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                requestBtn.disabled = false;
                requestBtn.textContent = '관리자 승인 요청';
            }
        }

        // 계정 확인 모달 (기존)
        showAccountCheckModal() {
            this.closeAllModals();

            const modal = document.createElement('div');
            modal.className = 'account-check-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeAccountCheckModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>계정 확인</h3>
                        <button class="modal-close" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeAccountCheckModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <p class="modal-description">
                            입력하신 정보로 등록된 계정이 있는지 확인합니다.
                        </p>
                        
                        <form id="accountCheckForm">
                            <div class="form-group">
                                <label for="checkName">디자이너명</label>
                                <input type="text" id="checkName" placeholder="이름을 입력하세요" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="checkPhone">전화번호</label>
                                <input type="tel" id="checkPhone" placeholder="010-0000-0000" maxlength="13" required>
                            </div>
                            
                            <button type="submit" class="btn-primary" id="accountCheckBtn">
                                계정 확인
                            </button>
                        </form>
                        
                        <div id="accountCheckResult" class="check-result" style="display: none;"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const phoneInput = modal.querySelector('#checkPhone');
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
            
            const form = modal.querySelector('#accountCheckForm');
            form.addEventListener('submit', (e) => this.handleAccountCheck(e));
        }

        async handleAccountCheck(e) {
            e.preventDefault();
            
            const name = document.getElementById('checkName').value.trim();
            const phone = document.getElementById('checkPhone').value.trim();
            const checkBtn = document.getElementById('accountCheckBtn');
            const resultDiv = document.getElementById('accountCheckResult');
            
            if (!name || !phone) {
                this.showToast('모든 정보를 입력해주세요', 'error');
                return;
            }
            
            checkBtn.disabled = true;
            checkBtn.textContent = '확인 중...';
            resultDiv.style.display = 'none';
            
            try {
                const accountExists = await this.checkAccountExists(name, phone);
                
                resultDiv.style.display = 'block';
                
                if (accountExists) {
                    resultDiv.className = 'check-result success';
                    resultDiv.innerHTML = `
                        <div class="result-icon">✅</div>
                        <h4>계정이 확인되었습니다</h4>
                        <p>입력하신 정보로 등록된 계정이 존재합니다.</p>
                        <div class="result-actions">
                            <button class="btn-primary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeAccountCheckModal(); window.HAIRGATOR_PASSWORD_RECOVERY.showSelfPasswordCheckModal();">내 패스워드 확인</button>
                            <button class="btn-secondary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeAccountCheckModal(); window.HAIRGATOR_PASSWORD_RECOVERY.showPasswordRecoveryModal();">관리자 승인 요청</button>
                        </div>
                    `;
                } else {
                    resultDiv.className = 'check-result error';
                    resultDiv.innerHTML = `
                        <div class="result-icon">❌</div>
                        <h4>계정을 찾을 수 없습니다</h4>
                        <p>입력하신 정보로 등록된 계정이 없습니다.</p>
                        <div class="result-actions">
                            <button class="btn-primary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.showContactAdmin()">관리자 연락</button>
                        </div>
                    `;
                }
                
            } catch (error) {
                resultDiv.style.display = 'block';
                resultDiv.className = 'check-result error';
                resultDiv.innerHTML = `
                    <div class="result-icon">⚠️</div>
                    <h4>확인 중 오류가 발생했습니다</h4>
                    <p>${error.message}</p>
                `;
            } finally {
                checkBtn.disabled = false;
                checkBtn.textContent = '계정 확인';
            }
        }

        // 관리자 연락처 모달 (기존)
        showContactAdmin() {
            this.closeAllModals();

            const modal = document.createElement('div');
            modal.className = 'contact-admin-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeContactAdminModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>관리자 연락처</h3>
                        <button class="modal-close" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeContactAdminModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="contact-info">
                            <div class="contact-icon">📞</div>
                            <h4>HAIRGATOR 관리자</h4>
                            <p>계정 문제나 패스워드 재설정에 대해 문의해주세요.</p>
                            
                            <div class="contact-details">
                                <div class="contact-item">
                                    <span class="contact-label">📱 전화:</span>
                                    <span class="contact-value">02-6731-5000</span>
                                    <button class="contact-copy" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.copyToClipboard('02-6731-5000')">복사</button>
                                </div>
                                <div class="contact-item">
                                    <span class="contact-label">⏰ 운영시간:</span>
                                    <span class="contact-value">평일 09:30-18:30</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeContactAdminModal()">확인</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        // 모달 닫기 함수들
        closePasswordRecoveryModal() {
            const modal = document.querySelector('.password-recovery-modal');
            if (modal) modal.remove();
        }

        closeAccountCheckModal() {
            const modal = document.querySelector('.account-check-modal');
            if (modal) modal.remove();
        }

        closeContactAdminModal() {
            const modal = document.querySelector('.contact-admin-modal');
            if (modal) modal.remove();
        }

        closeSelfPasswordModal() {
            const modal = document.querySelector('.self-password-modal');
            if (modal) {
                // 타이머 클리어
                if (this.passwordHideTimeout) {
                    clearTimeout(this.passwordHideTimeout);
                    this.passwordHideTimeout = null;
                }
                modal.remove();
            }
        }

        closeAllModals() {
            this.closePasswordRecoveryModal();
            this.closeAccountCheckModal();
            this.closeContactAdminModal();
            this.closeSelfPasswordModal();
        }

        // 유틸리티 함수들 (기존)
        formatPhoneNumber(phone) {
            const numbers = phone.replace(/[^\d]/g, '');
            if (numbers.length === 11) {
                return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
            }
            return phone;
        }

        generateRequestId() {
            return 'PWR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        getDeviceInfo() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`,
                timestamp: new Date().toISOString()
            };
        }

        async getClientIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch {
                return 'unknown';
            }
        }

        copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showToast('클립보드에 복사되었습니다', 'success');
                }).catch(() => {
                    this.fallbackCopyToClipboard(text);
                });
            } else {
                this.fallbackCopyToClipboard(text);
            }
        }

        fallbackCopyToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('클립보드에 복사되었습니다', 'success');
            } catch (err) {
                this.showToast('복사에 실패했습니다', 'error');
            }
            
            document.body.removeChild(textArea);
        }

        showToast(message, type = 'info') {
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
                alert(message);
            }
        }
    }

    // CSS 스타일 자동 주입 (기존 + 셀프 확인 스타일 추가)
    function injectStyles() {
        if (document.getElementById('password-recovery-styles')) return;

        const style = document.createElement('style');
        style.id = 'password-recovery-styles';
        style.textContent = `
            /* 기존 패스워드 복구 모달 스타일 */
            .password-recovery-modal, .account-check-modal, .contact-admin-modal, .self-password-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Noto Sans KR', sans-serif;
            }

            .password-recovery-modal .modal-overlay,
            .account-check-modal .modal-overlay,
            .contact-admin-modal .modal-overlay,
            .self-password-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(3px);
            }

            .password-recovery-modal .modal-content,
            .account-check-modal .modal-content,
            .contact-admin-modal .modal-content,
            .self-password-modal .modal-content {
                position: relative;
                background: #111;
                border-radius: 15px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                border: 1px solid #333;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }

            /* 셀프 패스워드 확인 전용 스타일 */
            .security-notice {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid #FFC107;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0 20px 0;
            }

            .notice-icon {
                font-size: 24px;
                color: #FFC107;
            }

            .notice-text {
                color: #ccc;
                font-size: 14px;
                line-height: 1.4;
            }

            .notice-text strong {
                color: #FFC107;
            }

            .password-display {
                background: #222;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
                border: 2px solid #FF1493;
            }

            .password-label {
                color: #FF1493;
                font-weight: 600;
                margin-bottom: 10px;
                font-size: 14px;
            }

            .password-value {
                font-size: 24px;
                font-weight: bold;
                color: #ccc;
                font-family: 'Courier New', monospace;
                margin: 15px 0;
                padding: 10px;
                background: #333;
                border-radius: 6px;
                letter-spacing: 2px;
                transition: all 0.3s ease;
            }

            .password-value.visible {
                color: #00ff00;
                text-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            }

            .password-timer {
                margin-top: 15px;
            }

            .timer-bar {
                height: 4px;
                background: #FF1493;
                border-radius: 2px;
                transition: width 0.1s linear;
                margin-bottom: 8px;
            }

            .timer-text {
                color: #999;
                font-size: 12px;
                font-style: italic;
            }

            .account-info {
                background: #222;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }

            .account-info h5 {
                color: #FF1493;
                margin: 0 0 15px 0;
                font-size: 16px;
                text-align: center;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 8px;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #333;
            }

            .info-item:last-child {
                border-bottom: none;
            }

            .info-label {
                color: #999;
                font-size: 14px;
            }

            .info-value {
                color: #ccc;
                font-family: 'Courier New', monospace;
                font-size: 14px;
            }

            .change-request {
                text-align: center;
            }

            .change-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .form-help {
                color: #999;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }

            .change-notice {
                background: rgba(255, 193, 7, 0.1);
                border: 1px solid #FFC107;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
                font-size: 13px;
                color: #ccc;
                line-height: 1.5;
            }

            .change-notice strong {
                color: #FFC107;
            }

            /* 기존 스타일들... */
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #333;
            }

            .modal-header h3 {
                color: #FF1493;
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }

            .modal-close {
                background: none;
                border: none;
                color: #666;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                background: #333;
                color: #FF1493;
            }

            .step-indicator {
                display: flex;
                justify-content: center;
                gap: 15px;
                padding: 20px;
                border-bottom: 1px solid #333;
                flex-wrap: wrap;
            }

            .step {
                padding: 8px 12px;
                border-radius: 20px;
                background: #333;
                color: #666;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.3s ease;
                white-space: nowrap;
            }

            .step.active {
                background: #FF1493;
                color: white;
            }

            .recovery-step {
                display: none;
                padding: 20px;
            }

            .recovery-step.active {
                display: block;
            }

            .step-description, .modal-description {
                color: #ccc;
                margin-bottom: 20px;
                text-align: center;
                line-height: 1.5;
                font-size: 14px;
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                color: #FF1493;
                margin-bottom: 5px;
                font-weight: 500;
                font-size: 14px;
            }

            .form-group input, .form-group select {
                width: 100%;
                padding: 12px;
                background: #222;
                color: white;
                border: 1px solid #555;
                border-radius: 8px;
                font-size: 14px;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }

            .form-group input:focus, .form-group select:focus {
                outline: none;
                border-color: #FF1493;
                box-shadow: 0 0 0 3px rgba(255, 20, 147, 0.1);
            }

            .btn-primary, .btn-secondary {
                padding: 12px 24px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
                min-width: 100px;
            }

            .btn-primary {
                background: #FF1493;
                color: white;
            }

            .btn-primary:hover:not(:disabled) {
                background: #E91E63;
                transform: translateY(-2px);
            }

            .btn-primary:disabled {
                background: #666;
                cursor: not-allowed;
                transform: none;
            }

            .btn-secondary {
                background: #333;
                color: white;
            }

            .btn-secondary:hover {
                background: #555;
                transform: translateY(-2px);
            }

            .modal-actions {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            /* 반응형 디자인 */
            @media (max-width: 480px) {
                .password-recovery-modal .modal-content,
                .account-check-modal .modal-content,
                .contact-admin-modal .modal-content,
                .self-password-modal .modal-content {
                    width: 95%;
                    margin: 10px;
                }

                .step-indicator {
                    gap: 8px;
                    padding: 15px;
                }

                .step {
                    padding: 6px 10px;
                    font-size: 12px;
                }

                .password-value {
                    font-size: 20px;
                    letter-spacing: 1px;
                }

                .modal-actions {
                    flex-direction: column;
                }

                .info-grid {
                    grid-template-columns: 1fr;
                }

                .info-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 5px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 초기화 함수
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                window.HAIRGATOR_PASSWORD_RECOVERY = new PasswordRecoverySystem();
            });
        } else {
            injectStyles();
            window.HAIRGATOR_PASSWORD_RECOVERY = new PasswordRecoverySystem();
        }
    }

    // 시스템 시작
    init();

})();

console.log('🔐 HAIRGATOR 패스워드 복구 시스템 (셀프 확인 기능) 로드됨');
