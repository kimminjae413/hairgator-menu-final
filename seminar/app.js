// HAIRGATOR 세미나 등록 페이지 JavaScript

// 전역 변수
let currentSeminar = null;
let registrationId = null;

// 포트원 설정
const PORTONE_STORE_ID = 'store-69fa8bc3-f410-433a-a8f2-f5d922f94dcb';
const PORTONE_CHANNEL_KEY = 'channel-key-da1e7007-39b9-4afa-8c40-0f158d323af1';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    loadSeminarInfo();
    setupFormListeners();
});

// 세미나 정보 로드
async function loadSeminarInfo() {
    try {
        // URL 파라미터에서 세미나 ID 가져오기 (있으면)
        const urlParams = new URLSearchParams(window.location.search);
        const seminarId = urlParams.get('id');

        const response = await fetch('/.netlify/functions/seminar-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getSeminarInfo',
                seminarId: seminarId || undefined
            })
        });

        const result = await response.json();

        document.getElementById('loadingState').style.display = 'none';

        if (result.error) {
            throw new Error(result.error);
        }

        // 세미나 목록인 경우 첫 번째 세미나 선택
        if (result.seminars) {
            if (result.seminars.length === 0) {
                document.getElementById('noSeminarState').style.display = 'block';
                return;
            }
            currentSeminar = result.seminars[0];
        } else if (result.seminar) {
            currentSeminar = result.seminar;
        } else {
            document.getElementById('noSeminarState').style.display = 'block';
            return;
        }

        renderSeminarInfo();
        document.getElementById('mainContent').style.display = 'block';

    } catch (error) {
        console.error('세미나 정보 로드 오류:', error);
        document.getElementById('loadingState').innerHTML = `
            <p style="color: var(--danger);">세미나 정보를 불러올 수 없습니다.<br>${error.message}</p>
        `;
    }
}

// 세미나 정보 렌더링
function renderSeminarInfo() {
    if (!currentSeminar) return;

    const date = currentSeminar.date ? new Date(currentSeminar.date) : null;
    const dateStr = date ? date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    }) : '-';
    const dateTimeStr = dateStr + (currentSeminar.time ? ` ${currentSeminar.time}` : '');

    // Hero 섹션 (동적 데이터)
    const seminarTitle = document.getElementById('seminarTitle');
    if (seminarTitle) seminarTitle.textContent = currentSeminar.title || '-';

    // 상세설명
    const seminarDescription = document.getElementById('seminarDescription');
    if (seminarDescription) {
        seminarDescription.textContent = currentSeminar.description || '';
        seminarDescription.style.display = currentSeminar.description ? 'block' : 'none';
    }

    const seminarDate = document.getElementById('seminarDate');
    if (seminarDate) seminarDate.textContent = dateStr;

    const seminarTime = document.getElementById('seminarTime');
    if (seminarTime) seminarTime.textContent = currentSeminar.time || '-';

    const seminarLocation = document.getElementById('seminarLocation');
    if (seminarLocation) seminarLocation.textContent = currentSeminar.location || '-';

    // 정원 노트 업데이트
    const capacityNote = document.getElementById('seminarCapacityNote');
    if (capacityNote) capacityNote.textContent = `정원 ${currentSeminar.capacity || 30}명`;

    // Info 섹션 (새 HTML 구조)
    const infoDate = document.getElementById('infoDate');
    if (infoDate) infoDate.textContent = dateTimeStr;

    const infoLocation = document.getElementById('infoLocation');
    if (infoLocation) infoLocation.textContent = currentSeminar.locationDetail || currentSeminar.location || '-';

    const infoPrice = document.getElementById('infoPrice');
    if (infoPrice) infoPrice.textContent = `${(currentSeminar.price || 0).toLocaleString()}원`;

    const currentCount = document.getElementById('currentCount');
    if (currentCount) currentCount.textContent = currentSeminar.currentCount || 0;

    const totalCapacity = document.getElementById('totalCapacity');
    if (totalCapacity) totalCapacity.textContent = currentSeminar.capacity || 0;

    // 가격 요약
    const summaryPrice = document.getElementById('summaryPrice');
    if (summaryPrice) summaryPrice.textContent = `${(currentSeminar.price || 0).toLocaleString()}원`;

    const summaryTotal = document.getElementById('summaryTotal');
    if (summaryTotal) summaryTotal.textContent = `${(currentSeminar.price || 0).toLocaleString()}원`;

    // 정원 마감 체크
    if (currentSeminar.isFull || (currentSeminar.currentCount || 0) >= currentSeminar.capacity) {
        const soldOutMessage = document.getElementById('soldOutMessage');
        if (soldOutMessage) soldOutMessage.style.display = 'block';

        const registrationForm = document.getElementById('registrationForm');
        if (registrationForm) registrationForm.style.display = 'none';
    }
}

// 폼 리스너 설정
function setupFormListeners() {
    const form = document.getElementById('registrationForm');
    form.addEventListener('submit', handleSubmit);

    // 전화번호 자동 포맷팅
    const phoneInput = document.getElementById('regPhone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 3 && value.length <= 7) {
            value = value.slice(0, 3) + '-' + value.slice(3);
        } else if (value.length > 7) {
            value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
        }
        e.target.value = value;
    });
}

// 폼 제출 핸들러
async function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const store = document.getElementById('regStore').value.trim();
    const position = document.getElementById('regPosition').value;
    const experience = document.getElementById('regExperience').value.trim();

    // 유효성 검사
    if (!name) {
        showMessage('이름을 입력해주세요.', 'error');
        return;
    }

    if (!phone || !isValidPhone(phone)) {
        showMessage('올바른 연락처를 입력해주세요.', 'error');
        return;
    }

    // 버튼 비활성화
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';

    try {
        await handleCardPayment({ name, phone, email, store, position, experience });
    } catch (error) {
        showMessage('오류가 발생했습니다: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '결제하고 참가 신청하기';
    }
}

// 카드 결제 처리
async function handleCardPayment(formData) {
    // 1. 등록 생성
    const registerResponse = await fetch('/.netlify/functions/seminar-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'register',
            seminarId: currentSeminar.id,
            ...formData
        })
    });

    const registerResult = await registerResponse.json();

    if (registerResult.error) {
        throw new Error(registerResult.error);
    }

    registrationId = registerResult.registrationId;
    const paymentId = `SEMINAR_${currentSeminar.id}_${Date.now()}`;

    // 2. 포트원 결제 요청
    const paymentResponse = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId: paymentId,
        orderName: `세미나 참가비 - ${currentSeminar.title}`,
        totalAmount: currentSeminar.price,
        currency: 'KRW',
        payMethod: 'CARD',
        customer: {
            fullName: formData.name,
            phoneNumber: formData.phone.replace(/-/g, ''),
            email: formData.email || undefined
        },
        redirectUrl: window.location.href + '?verify=true&regId=' + registrationId
    });

    // 3. 결제 결과 처리
    if (paymentResponse.code) {
        // 결제 실패 또는 취소
        throw new Error(paymentResponse.message || '결제가 취소되었습니다.');
    }

    // 4. 결제 검증
    await verifyPayment(registrationId, paymentResponse.paymentId);
}

// 결제 검증
async function verifyPayment(regId, paymentId) {
    const verifyResponse = await fetch('/.netlify/functions/seminar-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'verifyPayment',
            registrationId: regId,
            paymentId: paymentId
        })
    });

    const verifyResult = await verifyResponse.json();

    if (verifyResult.error) {
        throw new Error(verifyResult.error);
    }

    // 성공!
    showMessage('🎉 참가 신청이 완료되었습니다! 세미나 당일 뵙겠습니다.', 'success');
    document.getElementById('registrationForm').style.display = 'none';

    // 세미나 정보 업데이트 (인원 수)
    if (currentSeminar) {
        currentSeminar.currentCount = (currentSeminar.currentCount || 0) + 1;
        const currentCountEl = document.getElementById('currentCount');
        if (currentCountEl) currentCountEl.textContent = currentSeminar.currentCount;
    }
}

// 메시지 표시
function showMessage(message, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = message;
    el.className = 'status-message ' + type;
}

// 전화번호 유효성 검사
function isValidPhone(phone) {
    const cleaned = phone.replace(/-/g, '');
    return /^01[0-9]{8,9}$/.test(cleaned);
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 페이지 로드 시 결제 검증 확인 (리다이렉트 후)
(function checkPaymentVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const verify = urlParams.get('verify');
    const regId = urlParams.get('regId');
    const paymentId = urlParams.get('paymentId');

    if (verify === 'true' && regId && paymentId) {
        // URL에서 파라미터 제거
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // 결제 검증 실행
        setTimeout(() => {
            verifyPayment(regId, paymentId).catch(error => {
                showMessage('결제 검증 실패: ' + error.message, 'error');
            });
        }, 500);
    }
})();
