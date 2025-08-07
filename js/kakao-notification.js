// ========== HAIRGATOR 카카오톡 알림 시스템 (현재 완전 비활성화) ========== 
console.log('📱 카카오톡 알림 시스템 (현재 완전 비활성화 - 나중에 활성화 가능)');

// ========== 설정 ========== 
const KAKAO_NOTIFICATION_ENABLED = false; // 🔒 기능 완전 비활성화 (true로 변경하면 활성화)

// ========== 비활성화 상태 알림 ========== 
function showKakaoNotificationDisabled() {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = '📱 카카오톡 알림 기능은 현재 준비 중입니다';
        notice.className = 'device-notice show';
        setTimeout(() => {
            notice.classList.remove('show');
        }, 3000);
    } else {
        alert('📱 카카오톡 알림 기능은 현재 준비 중입니다');
    }
}

// ========== 메인 알림 발송 함수 (비활성화됨) ========== 
async function sendKakaoNotification(promotionId) {
    console.log('🚫 카카오톡 알림 발송 요청됨 (현재 비활성화):', promotionId);
    
    if (!KAKAO_NOTIFICATION_ENABLED) {
        showKakaoNotificationDisabled();
        return;
    }
    
    // 📝 실제 카카오톡 알림 코드는 여기에 있었지만 현재 비활성화됨
    // 나중에 KAKAO_NOTIFICATION_ENABLED를 true로 변경하면 아래 코드가 실행됩니다
    
    /*
    // === 원본 카카오톡 알림 로직 (비활성화됨) ===
    
    if (!firebaseConnected || !currentDesigner) {
        alert('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }

    try {
        console.log('📱 카카오톡 알림 발송 시작:', promotionId);
        
        const promotionDoc = await db.collection('promotions').doc(promotionId).get();
        
        if (!promotionDoc.exists) {
            alert('프로모션 정보를 찾을 수 없습니다');
            return;
        }
        
        const promotionData = promotionDoc.data();
        const targetCustomers = await getTargetCustomers(promotionData.targetCustomers);
        
        if (targetCustomers.length === 0) {
            alert('발송 대상 고객이 없습니다');
            return;
        }
        
        showNotificationConfirmModal(promotionData, targetCustomers);
        
    } catch (error) {
        console.error('❌ 알림 발송 준비 오류:', error);
        alert('알림 발송 준비 중 오류가 발생했습니다: ' + error.message);
    }
    */
}

// ========== 기타 알림 관련 함수들 (모두 비활성화됨) ========== 

// 대상 고객 조회
async function getTargetCustomers(targetType) {
    if (!KAKAO_NOTIFICATION_ENABLED) {
        console.log('🚫 대상 고객 조회 시도 (비활성화)');
        return [];
    }
    
    // 원본 로직 비활성화됨
    return [];
}

// 생일 알림 자동 발송
async function sendBirthdayNotifications() {
    if (!KAKAO_NOTIFICATION_ENABLED) {
        console.log('🚫 생일 알림 발송 시도 (비활성화)');
        return;
    }
    
    // 원본 로직 비활성화됨
}

// 팔로우업 알림 발송
async function sendFollowUpNotifications() {
    if (!KAKAO_NOTIFICATION_ENABLED) {
        console.log('🚫 팔로우업 알림 발송 시도 (비활성화)');
        return;
    }
    
    // 원본 로직 비활성화됨
}

// 알림 이력 보기
async function showNotificationHistory() {
    if (!KAKAO_NOTIFICATION_ENABLED) {
        showKakaoNotificationDisabled();
        return;
    }
    
    // 원본 로직 비활성화됨
}

// ========== 유틸리티 함수들 (기본 기능만 유지) ========== 

// 전화번호 포맷팅 (다른 모듈에서도 사용할 수 있도록 유지)
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('010')) {
        return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 4)}-${cleaned.substr(7, 4)}`;
    }
    
    return phoneNumber;
}

// 날짜 포맷팅 (다른 모듈에서도 사용할 수 있도록 유지)
function formatDate(dateValue) {
    if (!dateValue) return '날짜 없음';
    
    const date = new Date(dateValue);
    return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
    });
}

// 날짜/시간 포맷팅
function formatDateTime(dateValue) {
    if (!dateValue) return '날짜 없음';
    
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 대상 고객 텍스트 변환
function getTargetText(target) {
    const targetTexts = {
        all: '모든 고객',
        new: '신규 고객',
        returning: '재방문 고객',
        inactive: '장기 미방문 고객'
    };
    return targetTexts[target] || target;
}

// ========== 빈 모달 닫기 함수들 (에러 방지용) ========== 
function closeNotificationConfirm() {
    const modal = document.getElementById('notificationConfirmModal');
    if (modal) modal.remove();
}

function closeNotificationProgress() {
    const modal = document.getElementById('notificationProgressModal');
    if (modal) modal.remove();
}

function closeNotificationResult() {
    const modal = document.getElementById('notificationResultModal');
    if (modal) modal.remove();
}

function closeNotificationHistory() {
    const modal = document.getElementById('notificationHistoryModal');
    if (modal) modal.remove();
}

// ========== 활성화 가이드 함수 (개발자용) ========== 
function enableKakaoNotifications() {
    console.log(`
        🔧 카카오톡 알림 기능 활성화 방법:
        
        1. KAKAO_NOTIFICATION_ENABLED를 true로 변경
        2. 원본 코드 주석 해제
        3. 카카오 비즈니스 API 키 설정
        4. 알림톡 템플릿 등록
        
        현재 상태: ${KAKAO_NOTIFICATION_ENABLED ? '활성화됨' : '비활성화됨'}
        
        ⚠️ 주의: 카카오 비즈니스 계정 및 승인이 필요합니다
    `);
    
    if (!KAKAO_NOTIFICATION_ENABLED) {
        console.log(`
            📱 카카오톡 알림 기능 활성화를 위해 필요한 것들:
            
            1. 카카오 비즈니스 계정
            2. 알림톡 발송 권한
            3. 템플릿 승인
            4. API 키 발급
            
            자세한 내용: https://business.kakao.com/
        `);
    }
}

// ========== 전역 함수 등록 ========== 
window.sendKakaoNotification = sendKakaoNotification;
window.getTargetCustomers = getTargetCustomers;
window.sendBirthdayNotifications = sendBirthdayNotifications;
window.sendFollowUpNotifications = sendFollowUpNotifications;
window.showNotificationHistory = showNotificationHistory;
window.formatPhoneNumber = formatPhoneNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getTargetText = getTargetText;

// 모달 닫기 함수들
window.closeNotificationConfirm = closeNotificationConfirm;
window.closeNotificationProgress = closeNotificationProgress;
window.closeNotificationResult = closeNotificationResult;
window.closeNotificationHistory = closeNotificationHistory;

// 개발자용 함수
window.enableKakaoNotifications = enableKakaoNotifications;

// ========== 초기화 ========== 
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 카카오톡 알림 시스템 (비활성화 상태) 초기화 완료');
    
    // 개발 모드에서 활성화 가이드 표시
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🛠️ 개발 모드: window.enableKakaoNotifications() 로 활성화 가이드 확인');
    }
});

console.log(`
✅ 카카오톡 알림 시스템 로드 완료 (현재 완전 비활성화)

🔧 나중에 활성화하려면:
   1. KAKAO_NOTIFICATION_ENABLED = true 로 변경
   2. 주석 처리된 코드들을 해제
   3. 카카오 비즈니스 API 키 설정
   4. 알림톡 템플릿 등록 및 승인

💡 현재는 비활성화 안내 메시지만 표시됩니다
`);
