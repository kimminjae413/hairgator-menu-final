// ========== 기존 모달 시스템과 향상된 등록 시스템 연동 (기존 모달 보존 버전) ==========

// 기존 showStyleDetail 함수를 보강하되 모달 구조는 그대로 유지
function enhanceModalSystem() {
    // 기존 showStyleDetail 함수를 백업
    if (window.originalShowStyleDetail) return;
    window.originalShowStyleDetail = window.showStyleDetail;
    
    // 기존 함수를 래핑해서 기능만 추가
    window.showStyleDetail = function(styleCode, styleName, gender, imageUrl, docId) {
        console.log('🎨 향상된 모달 시스템:', { styleCode, styleName, gender });
        
        // ✅ 기존 모달 시스템 그대로 실행
        window.originalShowStyleDetail(styleCode, styleName, gender, imageUrl, docId);
        
        // ✅ 기존 모달이 열린 후 추가 기능만 적용
        setTimeout(() => {
            enhanceExistingModal(docId, styleCode, styleName);
        }, 200);
    };
}

// 기존 모달에 향상된 기능만 추가
function enhanceExistingModal(docId, styleCode, styleName) {
    const modal = document.getElementById('styleModal');
    if (!modal || !modal.classList.contains('active')) {
        console.log('⚠️ 모달이 열려있지 않거나 찾을 수 없음');
        return;
    }
    
    const modalActions = document.getElementById('modalActions');
    if (!modalActions) {
        console.log('⚠️ modalActions 요소를 찾을 수 없음');
        return;
    }
    
    // 기존 버튼들 확인
    const btnRegister = document.getElementById('btnRegister');
    const btnLike = document.getElementById('btnLike');
    
    console.log('🔍 기존 버튼들:', {
        register: !!btnRegister,
        like: !!btnLike,
        actions: !!modalActions
    });
    
    // ✅ 상담 예약 기능을 고객등록 버튼에 추가
    if (btnRegister) {
        enhanceRegisterButton(btnRegister, docId, styleCode, styleName);
    }
    
    // ✅ 좋아요 버튼 기능 향상
    if (btnLike) {
        enhanceLikeButton(btnLike, docId);
    }
    
    console.log('✅ 기존 모달 기능 향상 완료');
}

// 고객등록 버튼 기능 향상
function enhanceRegisterButton(btnRegister, docId, styleCode, styleName) {
    // 기존 이벤트 리스너 제거
    const newBtn = btnRegister.cloneNode(true);
    btnRegister.parentNode.replaceChild(newBtn, btnRegister);
    
    // 새로운 클릭 이벤트 추가
    newBtn.onclick = function() {
        console.log('👤 향상된 고객등록 버튼 클릭');
        
        // 등록된 사용자인지 확인
        if (window.authSystem && window.authSystem.isUserLoggedIn()) {
            console.log('✅ 로그인된 사용자 - 상담 예약 진행');
            showConsultationModal(styleCode, styleName);
        } else {
            console.log('⚠️ 미로그인 사용자 - 등록 모달 표시');
            if (window.authSystem && window.authSystem.showLoginModal) {
                window.authSystem.showLoginModal();
            } else {
                // 폴백: 기존 고객등록 방식
                showBasicCustomerRegistration(styleCode, styleName, docId);
            }
        }
    };
    
    // 버튼 텍스트 업데이트
    newBtn.innerHTML = `
        <span>💬</span>
        <span>상담예약</span>
    `;
}

// 좋아요 버튼 기능 향상
function enhanceLikeButton(btnLike, docId) {
    // 기존 이벤트 리스너는 유지하고 추가 기능만 적용
    const originalOnclick = btnLike.onclick;
    
    btnLike.onclick = async function() {
        console.log('❤️ 향상된 좋아요 버튼 클릭');
        
        // 기존 기능 실행
        if (originalOnclick) {
            originalOnclick.call(this);
        } else {
            // 기본 좋아요 기능
            this.classList.toggle('active');
            const heart = this.querySelector('span:first-child');
            if (heart) {
                const isLiked = this.classList.contains('active');
                heart.textContent = isLiked ? '♥' : '♡';
            }
        }
        
        // 추가 기능: 등록된 사용자의 경우 좋아요 기록 저장
        if (window.authSystem && window.authSystem.isUserLoggedIn() && docId) {
            try {
                const user = window.authSystem.getCurrentUser();
                const isLiked = this.classList.contains('active');
                
                if (typeof db !== 'undefined') {
                    await db.collection('user_likes').add({
                        userId: user.phone,
                        styleId: docId,
                        liked: isLiked,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ 사용자 좋아요 기록 저장 완료');
                }
            } catch (error) {
                console.error('❌ 좋아요 기록 저장 실패:', error);
            }
        }
    };
}

// 상담 예약 모달 표시
function showConsultationModal(styleCode, styleName) {
    if (!window.authSystem || !window.authSystem.getCurrentUser()) {
        console.error('❌ 사용자 정보가 없습니다');
        return;
    }
    
    const user = window.authSystem.getCurrentUser();
    
    const consultModal = document.createElement('div');
    consultModal.className = 'consultation-modal-overlay';
    consultModal.innerHTML = `
        <div class="consultation-modal">
            <div class="consultation-header">
                <h2>💬 상담 예약</h2>
                <button class="consultation-close" onclick="closeConsultationModal()">&times;</button>
            </div>
            
            <div class="consultation-content">
                <div class="style-info">
                    <h3>선택한 스타일</h3>
                    <p><strong>${styleName}</strong> (${styleCode})</p>
                </div>
                
                <div class="user-info">
                    <h3>예약자 정보</h3>
                    <p><strong>이름:</strong> ${user.name}</p>
                    <p><strong>연락처:</strong> ${window.authSystem.formatPhoneNumber(user.phone)}</p>
                </div>
                
                <div class="consultation-form">
                    <label for="consultMessage">상담 내용 (선택사항)</label>
                    <textarea id="consultMessage" rows="4" 
                              placeholder="원하는 헤어스타일이나 궁금한 점을 적어주세요"></textarea>
                </div>
                
                <div class="consultation-buttons">
                    <button class="consultation-btn consultation-btn-primary" onclick="submitConsultation('${styleCode}', '${styleName}')">
                        📞 상담 예약하기
                    </button>
                    <button class="consultation-btn consultation-btn-secondary" onclick="closeConsultationModal()">
                        취소
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 배경 클릭 시 닫기
    consultModal.onclick = function(e) {
        if (e.target === consultModal) {
            closeConsultationModal();
        }
    };
    
    document.body.appendChild(consultModal);
    
    // 전역 함수로 노출
    window.submitConsultation = async function(styleCode, styleName) {
        const message = document.getElementById('consultMessage').value;
        
        try {
            if (typeof db !== 'undefined') {
                await db.collection('consultations').add({
                    userName: user.name,
                    userPhone: user.phone,
                    userRole: user.role || 'customer',
                    styleCode: styleCode,
                    styleName: styleName,
                    message: message,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showConsultationSuccess();
                closeConsultationModal();
                console.log('✅ 상담 예약 완료');
            }
        } catch (error) {
            console.error('❌ 상담 예약 실패:', error);
            alert('예약 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };
    
    window.closeConsultationModal = function() {
        const modal = document.querySelector('.consultation-modal-overlay');
        if (modal) {
            modal.remove();
        }
        delete window.submitConsultation;
        delete window.closeConsultationModal;
    };
}

// 기본 고객등록 (폴백)
function showBasicCustomerRegistration(styleCode, styleName, docId) {
    const customerName = prompt('고객 이름을 입력하세요:');
    if (!customerName) return;
    
    const customerPhone = prompt('전화번호를 입력하세요:');
    if (!customerPhone) return;
    
    try {
        if (typeof db !== 'undefined') {
            db.collection('customers').add({
                name: customerName,
                phone: customerPhone,
                styleCode: styleCode,
                styleName: styleName,
                styleId: docId,
                registeredAt: new Date(),
                lastVisit: new Date()
            });
            
            alert('고객 등록 완료!');
            
            // 모달 닫기
            const modal = document.getElementById('styleModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    } catch (error) {
        console.error('❌ 고객 등록 실패:', error);
        alert('등록 실패: ' + error.message);
    }
}

// 성공 메시지 표시
function showConsultationSuccess() {
    const message = document.createElement('div');
    message.className = 'consultation-success';
    message.innerHTML = `
        <div class="success-content">
            <span class="success-icon">📞</span>
            <span class="success-text">상담 예약이 완료되었습니다!</span>
        </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// 향상된 등록 시스템이 로드된 후 연동
function initializeModalEnhancement() {
    console.log('🔧 모달 시스템 향상 초기화 중...');
    
    // 기존 showStyleDetail 함수가 있는지 확인
    if (typeof window.showStyleDetail === 'function') {
        enhanceModalSystem();
        console.log('✅ 모달 시스템 향상 완료');
    } else {
        console.log('⚠️ showStyleDetail 함수를 찾을 수 없음, 재시도...');
        setTimeout(initializeModalEnhancement, 500);
    }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModalEnhancement);
} else {
    initializeModalEnhancement();
}

// 스타일 추가
const enhancedModalCSS = document.createElement('style');
enhancedModalCSS.textContent = `
    /* 상담 예약 모달 스타일 */
    .consultation-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    }
    
    .consultation-modal {
        background: #fff;
        border-radius: 15px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .consultation-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .consultation-header h2 {
        margin: 0;
        color: #333;
        font-size: 20px;
    }
    
    .consultation-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .consultation-content {
        padding: 20px;
    }
    
    .style-info, .user-info {
        margin-bottom: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
    }
    
    .style-info h3, .user-info h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 16px;
    }
    
    .style-info p, .user-info p {
        margin: 5px 0;
        color: #666;
    }
    
    .consultation-form {
        margin-bottom: 20px;
    }
    
    .consultation-form label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
    }
    
    .consultation-form textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
    }
    
    .consultation-form textarea:focus {
        outline: none;
        border-color: #667eea;
    }
    
    .consultation-buttons {
        display: flex;
        gap: 10px;
    }
    
    .consultation-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .consultation-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .consultation-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .consultation-btn-secondary {
        background: #f8f9fa;
        color: #5a6c7d;
        border: 2px solid #e9ecef;
    }
    
    .consultation-btn-secondary:hover {
        background: #e9ecef;
    }
    
    /* 성공 메시지 */
    .consultation-success {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
        z-index: 11000;
        animation: slideIn 0.3s ease;
    }
    
    .success-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .success-icon {
        font-size: 20px;
    }
    
    .success-text {
        font-weight: 600;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    /* 모바일 최적화 */
    @media (max-width: 768px) {
        .consultation-modal {
            margin: 10px;
        }
        
        .consultation-buttons {
            flex-direction: column;
        }
        
        .consultation-btn {
            width: 100%;
        }
    }
    
    /* 다크 테마 지원 */
    body.dark-theme .consultation-modal {
        background: #1a1a1a;
        color: #fff;
    }
    
    body.dark-theme .consultation-header {
        border-bottom-color: #333;
    }
    
    body.dark-theme .consultation-header h2 {
        color: #fff;
    }
    
    body.dark-theme .style-info,
    body.dark-theme .user-info {
        background: #2a2a2a;
    }
    
    body.dark-theme .style-info h3,
    body.dark-theme .user-info h3 {
        color: #fff;
    }
    
    body.dark-theme .style-info p,
    body.dark-theme .user-info p {
        color: #ccc;
    }
    
    body.dark-theme .consultation-form label {
        color: #fff;
    }
    
    body.dark-theme .consultation-form textarea {
        background: #2a2a2a;
        border-color: #444;
        color: #fff;
    }
    
    body.dark-theme .consultation-btn-secondary {
        background: #2a2a2a;
        color: #ccc;
        border-color: #444;
    }
`;

document.head.appendChild(enhancedModalCSS);

console.log('✅ 향상된 모달 연동 시스템 로드 완료 (기존 모달 보존)');
