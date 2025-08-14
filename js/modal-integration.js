// ========== 기존 모달 시스템과 향상된 등록 시스템 연동 ==========

// 기존 showStyleDetail 함수를 수정하여 새로운 등록 시스템 사용
function updateShowStyleDetail() {
    // 기존 showStyleDetail 함수를 백업
    if (window.originalShowStyleDetail) return;
    window.originalShowStyleDetail = window.showStyleDetail;
    
    // 새로운 showStyleDetail 함수
    window.showStyleDetail = function(styleCode, styleName, gender, imageUrl, docId) {
        console.log('🎨 스타일 상세 표시:', { styleCode, styleName, gender });
        
        // 모달 생성
        const modalHTML = `
            <div class="modal-overlay active" id="styleModal">
                <div class="modal-content">
                    <div class="modal-close" onclick="closeModal()">&times;</div>
                    
                    <div class="modal-image-section">
                        <img src="${imageUrl}" alt="${styleName}" class="modal-image">
                        
                        <!-- AKOOL AI 체험 버튼 (조건부 표시) -->
                        <div class="modal-ai-section" id="modalAISection" style="display: none;">
                            <button class="btn-ai-experience" onclick="window.startAkoolFaceSwap('${imageUrl}', '${docId}')">
                                <span class="ai-icon">🤖</span>
                                <span class="ai-text">AI 체험해보기</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="modal-info-section">
                        <div class="modal-title">${styleName || '헤어스타일'}</div>
                        <div class="modal-code">Style Code: ${styleCode || 'N/A'}</div>
                        <div class="modal-gender ${gender}">${gender === 'male' ? '남성' : '여성'} 스타일</div>
                        
                        <div class="modal-actions">
                            <button class="btn-like" id="btnLike">
                                <span>♡</span>
                                <span>좋아요</span>
                            </button>
                            
                            <button class="btn-consult" id="btnConsult">
                                <span>💬</span>
                                <span>상담 예약</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('styleModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // AKOOL 버튼 표시 여부 확인
        if (window.akoolConfig && window.akoolConfig.isActive) {
            const aiSection = document.getElementById('modalAISection');
            if (aiSection) {
                aiSection.style.display = 'block';
            }
        }
        
        // 이벤트 리스너 설정
        setupModalEventListeners(docId);
    };
}

// 모달 이벤트 리스너 설정 (향상된 등록 시스템 연동)
function setupModalEventListeners(docId) {
    const btnConsult = document.getElementById('btnConsult');
    const btnLike = document.getElementById('btnLike');
    
    // 상담 예약 버튼
    if (btnConsult) {
        btnConsult.onclick = function() {
            // 등록된 사용자인지 확인
            if (!window.authSystem.isUserLoggedIn()) {
                // 미등록 사용자 - 등록 모달 표시
                window.authSystem.showLoginModal();
                return;
            }
            
            // 등록된 사용자 - 상담 예약 진행
            showConsultationModal();
        };
    }
    
    // 좋아요 버튼
    if (btnLike) {
        btnLike.onclick = async function() {
            this.classList.toggle('active');
            const heart = this.querySelector('span:first-child');
            if (heart) {
                const isLiked = this.classList.contains('active');
                heart.textContent = isLiked ? '♥' : '♡';
                
                // Firebase 업데이트 (등록 여부와 관계없이 허용)
                if (docId && typeof db !== 'undefined') {
                    try {
                        const docRef = db.collection('hairstyles').doc(docId);
                        await docRef.update({
                            likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
                        });
                        
                        // 등록된 사용자의 경우 좋아요 기록 저장
                        if (window.authSystem.isUserLoggedIn()) {
                            const user = window.authSystem.getCurrentUser();
                            await db.collection('user_likes').add({
                                userId: user.phone, // 휴대폰 번호를 ID로 사용
                                styleId: docId,
                                liked: isLiked,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    } catch (error) {
                        console.error('Like update error:', error);
                    }
                }
            }
        };
    }
}

// 상담 예약 모달 표시
function showConsultationModal() {
    const user = window.authSystem.getCurrentUser();
    
    const consultModal = document.createElement('div');
    consultModal.className = 'auth-modal-overlay';
    consultModal.innerHTML = `
        <div class="auth-modal">
            <div class="auth-header">
                <h2>💬 상담 예약</h2>
                <p>헤어스타일 상담을 예약하시겠습니까?</p>
            </div>
            
            <div class="user-info-card">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                    <div class="user-name">${user.name}</div>
                    <div class="user-phone">${window.authSystem.formatPhoneNumber(user.phone)}</div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="consultMessage">상담 내용 (선택사항)</label>
                <textarea id="consultMessage" class="form-input" rows="3" 
                          placeholder="원하는 헤어스타일이나 궁금한 점을 적어주세요"></textarea>
            </div>
            
            <div class="auth-buttons">
                <button class="auth-btn auth-btn-primary" onclick="submitConsultation()">
                    📞 상담 예약하기
                </button>
                <button class="auth-btn auth-btn-secondary" onclick="closeConsultationModal()">
                    취소
                </button>
            </div>
        </div>
    `;
    
    // 배경 클릭 시 닫기
    consultModal.addEventListener('click', (e) => {
        if (e.target === consultModal) {
            closeConsultationModal();
        }
    });
    
    document.body.appendChild(consultModal);
    
    // 전역 함수로 노출
    window.submitConsultation = async function() {
        const message = document.getElementById('consultMessage').value;
        
        try {
            // Firebase에 상담 예약 저장
            if (typeof db !== 'undefined') {
                await db.collection('consultations').add({
                    userName: user.name,
                    userPhone: user.phone,
                    userRole: user.role,
                    message: message,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // 성공 메시지
            showConsultationSuccess();
            closeConsultationModal();
            
        } catch (error) {
            console.error('Consultation booking error:', error);
            alert('예약 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };
    
    window.closeConsultationModal = function() {
        consultModal.remove();
        delete window.submitConsultation;
        delete window.closeConsultationModal;
    };
}

function showConsultationSuccess() {
    const message = document.createElement('div');
    message.className = 'success-message';
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

// 기존 closeModal 함수도 업데이트
function updateCloseModal() {
    if (window.originalCloseModal) return;
    window.originalCloseModal = window.closeModal;
    
    window.closeModal = function() {
        const modal = document.getElementById('styleModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };
}

// 향상된 등록 시스템이 로드된 후 연동
function initializeModalIntegration() {
    if (window.authSystem) {
        updateShowStyleDetail();
        updateCloseModal();
        console.log('✅ 모달 시스템과 향상된 등록 시스템 연동 완료');
    } else {
        // authSystem이 아직 로드되지 않은 경우 대기
        setTimeout(initializeModalIntegration, 100);
    }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModalIntegration);
} else {
    initializeModalIntegration();
}

// 추가 CSS 스타일
const modalIntegrationCSS = document.createElement('style');
modalIntegrationCSS.textContent = `
    /* 기존 모달과 새 등록 시스템 연동을 위한 추가 스타일 */
    .modal-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
    }
    
    .btn-consult {
        flex: 1;
        padding: 12px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .btn-consult:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .btn-like {
        flex: 1;
        padding: 12px 20px;
        background: #f8f9fa;
        color: #5a6c7d;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .btn-like:hover {
        background: #e9ecef;
        border-color: #dee2e6;
    }
    
    .btn-like.active {
        background: linear-gradient(135deg, #e91e63 0%, #f06292 100%);
        color: white;
        border-color: #e91e63;
    }
    
    .btn-like.active:hover {
        background: linear-gradient(135deg, #c2185b 0%, #e91e63 100%);
    }
    
    /* 상담 모달 전용 스타일 */
    textarea.form-input {
        resize: vertical;
        min-height: 80px;
        font-family: inherit;
    }
    
    /* 모바일 최적화 */
    @media (max-width: 768px) {
        .modal-actions {
            flex-direction: column;
        }
        
        .btn-consult, .btn-like {
            width: 100%;
        }
    }
`;

document.head.appendChild(modalIntegrationCSS);
