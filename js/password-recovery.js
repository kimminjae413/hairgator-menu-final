// ========== HAIRGATOR 패스워드 복구 시스템 ==========
// js/password-recovery.js

(function() {
    'use strict';

    // 패스워드 복구 시스템 클래스
    class PasswordRecoverySystem {
        constructor() {
            this.db = null; // Firebase 연결은 메인에서 전달받음
            this.maxLoginAttempts = 3;
            this.lockoutDuration = 15 * 60 * 1000; // 15분
            this.init();
        }

        init() {
            // Firebase DB 연결 대기
            this.waitForFirebase();
            console.log('🔐 패스워드 복구 시스템 초기화 완료');
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

        // 계정 존재 여부 확인
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

        // 패스워드 재설정 요청
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

        // 로그인 시도 횟수 관리
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
                        // 잠금 시간 만료 - 초기화
                        delete attempts[key];
                        localStorage.setItem('hairgator_login_attempts', JSON.stringify(attempts));
                    }
                }

                return true;
            } catch (error) {
                throw error;
            }
        }

        // 로그인 실패 시 시도 횟수 증가
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

        // 성공적인 로그인 시 시도 횟수 초기화
        clearLoginAttempts(name, phone) {
            const key = `${name}_${phone}`;
            const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
            delete attempts[key];
            localStorage.setItem('hairgator_login_attempts', JSON.stringify(attempts));
        }

        // 계정 잠금 상태 확인
        isAccountLocked(name, phone) {
            const key = `${name}_${phone}`;
            const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
            const userAttempts = attempts[key];

            if (userAttempts && userAttempts.count >= this.maxLoginAttempts && userAttempts.lockedAt) {
                const timeSinceLock = Date.now() - userAttempts.lockedAt;
                return timeSinceLock < this.lockoutDuration;
            }

            return false;
        }

        // 남은 잠금 시간
        getRemainingLockTime(name, phone) {
            const key = `${name}_${phone}`;
            const attempts = JSON.parse(localStorage.getItem('hairgator_login_attempts') || '{}');
            const userAttempts = attempts[key];

            if (userAttempts && userAttempts.lockedAt) {
                const timeSinceLock = Date.now() - userAttempts.lockedAt;
                return Math.max(0, this.lockoutDuration - timeSinceLock);
            }

            return 0;
        }

        // 패스워드 찾기 모달 표시
        showPasswordRecoveryModal() {
            // 기존 모달 제거
            this.closeAllModals();

            const modal = document.createElement('div');
            modal.className = 'password-recovery-modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closePasswordRecoveryModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>패스워드 찾기</h3>
                        <button class="modal-close" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closePasswordRecoveryModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="step-indicator">
                            <div class="step active" data-step="1">계정 확인</div>
                            <div class="step" data-step="2">요청 완료</div>
                        </div>
                        
                        <div id="step1" class="recovery-step active">
                            <p class="step-description">계정 정보를 입력하여 패스워드 재설정을 요청합니다.</p>
                            
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
                                    재설정 요청하기
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
                                <p class="sub-info">급하신 경우 관리자에게 직접 연락해주세요.</p>
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
            
            // 전화번호 포맷팅
            const phoneInput = modal.querySelector('#recoveryPhone');
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
            
            // 폼 제출 처리
            const form = modal.querySelector('#passwordResetForm');
            form.addEventListener('submit', (e) => this.handlePasswordResetRequest(e));
        }

        // 계정 확인 모달
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
            
            // 전화번호 포맷팅
            const phoneInput = modal.querySelector('#checkPhone');
            phoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
            
            // 폼 제출 처리
            const form = modal.querySelector('#accountCheckForm');
            form.addEventListener('submit', (e) => this.handleAccountCheck(e));
        }

        // 관리자 연락처 모달
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
                            
                            <div class="request-info">
                                <h5>문의 시 준비사항:</h5>
                                <ul>
                                    <li>디자이너명 (실명)</li>
                                    <li>등록된 전화번호</li>
                                    <li>신분 확인 가능한 정보</li>
                                    <li>패스워드 재설정 요청 이유</li>
                                </ul>
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

        // 패스워드 재설정 요청 처리
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
                
                // UI 업데이트
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
                requestBtn.textContent = '재설정 요청하기';
            }
        }

        // 계정 확인 처리
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
                        <p>패스워드를 잊으셨다면 "패스워드 찾기"를 이용해주세요.</p>
                        <div class="result-actions">
                            <button class="btn-primary" onclick="window.HAIRGATOR_PASSWORD_RECOVERY.closeAccountCheckModal(); window.HAIRGATOR_PASSWORD_RECOVERY.showPasswordRecoveryModal();">패스워드 찾기</button>
                        </div>
                    `;
                } else {
                    resultDiv.className = 'check-result error';
                    resultDiv.innerHTML = `
                        <div class="result-icon">❌</div>
                        <h4>계정을 찾을 수 없습니다</h4>
                        <p>입력하신 정보로 등록된 계정이 없습니다.</p>
                        <p>디자이너명과 전화번호를 다시 확인하거나<br>관리자에게 계정 생성을 요청해주세요.</p>
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

        // 모달 닫기 함수들
        closePasswordRecoveryModal() {
            const modal = document.querySelector('.password-recovery-modal');
            if (modal) {
                modal.remove();
            }
        }

        closeAccountCheckModal() {
            const modal = document.querySelector('.account-check-modal');
            if (modal) {
                modal.remove();
            }
        }

        closeContactAdminModal() {
            const modal = document.querySelector('.contact-admin-modal');
            if (modal) {
                modal.remove();
            }
        }

        closeAllModals() {
            this.closePasswordRecoveryModal();
            this.closeAccountCheckModal();
            this.closeContactAdminModal();
        }

        // 유틸리티 함수들
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
            // 메인 페이지의 toast 함수 사용
            if (window.showToast) {
                window.showToast(message, type);
            } else {
                // 대체 토스트
                console.log(`${type.toUpperCase()}: ${message}`);
                alert(message);
            }
        }
    }

    // CSS 스타일 자동 주입
    function injectStyles() {
        if (document.getElementById('password-recovery-styles')) return;

        const style = document.createElement('style');
        style.id = 'password-recovery-styles';
        style.textContent = `
            /* 패스워드 복구 모달 스타일 */
            .password-recovery-modal, .account-check-modal, .contact-admin-modal {
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
            .contact-admin-modal .modal-overlay {
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
            .contact-admin-modal .modal-content {
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
                gap: 20px;
                padding: 20px;
                border-bottom: 1px solid #333;
            }

            .step {
                padding: 8px 16px;
                border-radius: 20px;
                background: #333;
                color: #666;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s ease;
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
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group label {
                display: block;
                color: #FF1493;
                margin-bottom: 5px;
                font-weight: 500;
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
                font-size: 16px;
                font-weight: 500;
                transition: all 0.3s ease;
                min-width: 120px;
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

            .success-message {
                text-align: center;
            }

            .success-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .success-message h4 {
                color: #FF1493;
                margin: 15px 0;
                font-size: 18px;
            }

            .success-message p {
                color: #ccc;
                margin: 10px 0;
                line-height: 1.5;
            }

            .request-info {
                background: #222;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }

            .request-info h5 {
                color: #FF1493;
                margin: 0 0 10px 0;
                font-size: 14px;
            }

            .request-info ul {
                margin: 0;
                padding-left: 20px;
                color: #ccc;
            }

            .request-info li {
                margin: 5px 0;
                font-size: 13px;
            }

            .sub-info {
                font-size: 13px;
                color: #999 !important;
                margin-top: 15px;
            }

            .modal-actions {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 10px;
            }

            .check-result {
                text-align: center;
                padding: 20px;
                border-radius: 10px;
                margin-top: 20px;
            }

            .check-result.success {
                background: rgba(76, 175, 80, 0.1);
                border: 1px solid #4CAF50;
            }

            .check-result.error {
                background: rgba(244, 67, 54, 0.1);
                border: 1px solid #f44336;
            }

            .result-icon {
                font-size: 36px;
                margin-bottom: 15px;
            }

            .check-result h4 {
                color: #FF1493;
                margin: 15px 0;
                font-size: 16px;
            }

            .check-result p {
                color: #ccc;
                margin: 8px 0;
                line-height: 1.5;
                font-size: 14px;
            }

            .result-actions {
                margin-top: 15px;
            }

            .contact-info {
                text-align: center;
                padding: 20px;
            }

            .contact-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .contact-info h4 {
                color: #FF1493;
                margin-bottom: 15px;
                font-size: 18px;
            }

            .contact-details {
                background: #222;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
            }

            .contact-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 12px 0;
                padding: 8px 0;
                border-bottom: 1px solid #333;
            }

            .contact-item:last-child {
                border-bottom: none;
            }

            .contact-label {
                color: #FF1493;
                font-weight: 500;
                min-width: 80px;
            }

            .contact-value {
                color: #ccc;
                flex: 1;
                margin: 0 15px;
                font-family: monospace;
            }

            .contact-copy {
                background: #333;
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s ease;
            }

            .contact-copy:hover {
                background: #555;
            }

            /* 반응형 디자인 */
            @media (max-width: 480px) {
                .password-recovery-modal .modal-content,
                .account-check-modal .modal-content,
                .contact-admin-modal .modal-content {
                    width: 95%;
                    margin: 10px;
                }

                .step-indicator {
                    gap: 10px;
                    padding: 15px;
                }

                .step {
                    padding: 6px 12px;
                    font-size: 12px;
                }

                .modal-actions {
                    flex-direction: column;
                }

                .contact-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }

                .contact-value {
                    margin: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 초기화 함수
    function init() {
        // DOM 로드 완료 대기
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

// 콘솔 확인용
console.log('🔐 HAIRGATOR 패스워드 복구 시스템 로드됨');
