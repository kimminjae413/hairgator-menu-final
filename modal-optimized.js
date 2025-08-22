// ========== 최적화된 모달 시스템 ==========

// 모달 관련 요소들 캐싱
let modalElements = null;
let modalImageCache = new Map();

// 모달 요소 초기화 (한 번만 실행)
function initModalElements() {
    if (modalElements) return modalElements;
    
    modalElements = {
        modal: document.getElementById('styleModal'),
        modalImage: document.getElementById('modalImage'),
        modalCode: document.getElementById('modalCode'),
        modalName: document.getElementById('modalName'),
        btnRegister: document.getElementById('btnRegister'),
        btnLike: document.getElementById('btnLike'),
        modalClose: document.getElementById('modalClose')
    };
    
    return modalElements;
}

// 최적화된 스타일 상세 모달 표시
function showStyleDetailOptimized(code, name, gender, imageSrc, docId) {
    const elements = initModalElements();
    if (!elements.modal) return;
    
    // 즉시 모달 표시 (이미지 로딩과 별개)
    elements.modal.classList.add('active');
    
    // 기본 정보 즉시 설정
    elements.modalCode.textContent = code || 'NO CODE';
    elements.modalName.textContent = name || '이름 없음';
    
    // 성별에 따른 버튼 스타일
    if (gender === 'female') {
        elements.btnRegister.classList.add('female');
    } else {
        elements.btnRegister.classList.remove('female');
    }
    
    // 좋아요 버튼 초기화
    elements.btnLike.classList.remove('active');
    const heart = elements.btnLike.querySelector('span:first-child');
    if (heart) heart.textContent = '♡';
    
    // 이미지 최적화 로딩
    if (imageSrc) {
        loadModalImage(imageSrc, elements.modalImage);
    } else {
        setNoImageState(elements.modalImage);
    }
    
    // 이벤트 리스너 최적화 설정
    setupModalEvents(elements, code, name, gender, docId);
    
    // 바디 스크롤 방지
    document.body.style.overflow = 'hidden';
}

// 최적화된 이미지 로딩
function loadModalImage(imageSrc, modalImage) {
    // 캐시된 이미지 확인
    if (modalImageCache.has(imageSrc)) {
        const cachedImg = modalImageCache.get(imageSrc);
        modalImage.src = cachedImg.src;
        modalImage.style.display = 'block';
        return;
    }
    
    // 로딩 상태 표시
    modalImage.style.display = 'none';
    modalImage.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // 새 이미지 로딩
    const img = new Image();
    img.onload = function() {
        modalImageCache.set(imageSrc, img);
        modalImage.src = imageSrc;
        modalImage.style.display = 'block';
        modalImage.parentElement.style.background = '';
    };
    
    img.onerror = function() {
        setNoImageState(modalImage);
    };
    
    img.src = imageSrc;
}

// 이미지 없음 상태 설정
function setNoImageState(modalImage) {
    modalImage.style.display = 'none';
    modalImage.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    modalImage.parentElement.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); font-size: 18px;">
            이미지 없음
        </div>
    `;
}

// 최적화된 모달 이벤트 설정
function setupModalEvents(elements, code, name, gender, docId) {
    // 기존 이벤트 리스너 제거 (메모리 누수 방지)
    const newBtnRegister = elements.btnRegister.cloneNode(true);
    const newBtnLike = elements.btnLike.cloneNode(true);
    
    elements.btnRegister.parentNode.replaceChild(newBtnRegister, elements.btnRegister);
    elements.btnLike.parentNode.replaceChild(newBtnLike, elements.btnLike);
    
    // 고객 등록 버튼 - 최적화된 이벤트
    newBtnRegister.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 버튼 비활성화 (중복 클릭 방지)
        this.disabled = true;
        this.textContent = '등록 중...';
        
        try {
            await handleCustomerRegistration(code, name, gender, docId);
        } finally {
            this.disabled = false;
            this.textContent = '고객등록';
        }
    }, { once: false });
    
    // 좋아요 버튼 - 최적화된 이벤트
    newBtnLike.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 즉시 UI 업데이트 (반응성 향상)
        this.classList.toggle('active');
        const heart = this.querySelector('span:first-child');
        if (heart) {
            const isLiked = this.classList.contains('active');
            heart.textContent = isLiked ? '♥' : '♡';
        }
        
        // 백그라운드에서 Firebase 업데이트
        if (docId) {
            updateLikeInBackground(docId, this.classList.contains('active'));
        }
    }, { once: false });
    
    // 모달 요소 업데이트
    elements.btnRegister = newBtnRegister;
    elements.btnLike = newBtnLike;
}

// 백그라운드 좋아요 업데이트
async function updateLikeInBackground(docId, isLiked) {
    try {
        const docRef = db.collection('hairstyles').doc(docId);
        await docRef.update({
            likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
        });
    } catch (error) {
        console.error('좋아요 업데이트 오류:', error);
        // 오류 시 UI 롤백하지 않음 (사용자 경험 우선)
    }
}

// 최적화된 고객 등록
async function handleCustomerRegistration(code, name, gender, docId) {
    const customerName = prompt('고객 이름을 입력하세요:');
    if (!customerName) return;
    
    const customerPhone = prompt('전화번호를 입력하세요:');
    if (!customerPhone) return;
    
    try {
        await db.collection('customers').add({
            name: customerName,
            phone: customerPhone,
            styleCode: code,
            styleName: name,
            styleId: docId,
            gender: gender,
            designer: localStorage.getItem('designerName') || 'Unknown',
            registeredAt: new Date(),
            lastVisit: new Date()
        });
        
        // 성공 피드백
        showToast('✅ 고객 등록 완료!', 'success');
        closeModalOptimized();
        
    } catch (error) {
        console.error('고객 등록 오류:', error);
        showToast('❌ 등록 실패: ' + error.message, 'error');
    }
}

// 최적화된 모달 닫기
function closeModalOptimized() {
    const elements = initModalElements();
    if (!elements.modal) return;
    
    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // 메모리 정리
    setTimeout(() => {
        if (elements.modalImage) {
            elements.modalImage.src = '';
        }
    }, 300);
}

// 토스트 알림 시스템
function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#FF1493'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 전역 함수로 등록
window.showStyleDetailOptimized = showStyleDetailOptimized;
window.closeModalOptimized = closeModalOptimized;

// 기존 함수들 대체
if (typeof window.showStyleDetail !== 'undefined') {
    window.showStyleDetail = showStyleDetailOptimized;
}

if (typeof window.closeModal !== 'undefined') {
    window.closeModal = closeModalOptimized;
}
