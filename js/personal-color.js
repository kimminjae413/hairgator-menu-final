// ========== HAIRGATOR 퍼스널컬러 모듈 ==========
// 파일: js/personal-color.js

/**
 * 퍼스널컬러 모달 열기 - personal-color 폴더 연동
 */
function openPersonalColorModal() {
    console.log('🎨 퍼스널컬러 진단 시스템 열기');
    
    const modal = document.getElementById('personalColorModal');
    const iframe = document.getElementById('personalColorFrame');
    
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // personal-color 폴더의 index.html 로드
        if (iframe) {
            iframe.src = 'personal-color/index.html';
        }
        
        document.body.style.overflow = 'hidden';
        
        // 햅틱 피드백
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        console.log('✅ 퍼스널컬러 모달 활성화됨');
    }
}

/**
 * 퍼스널컬러 모달 닫기
 */
function closePersonalColorModal() {
    console.log('🔄 퍼스널컬러 진단 시스템 닫기');
    
    const modal = document.getElementById('personalColorModal');
    
    if (modal) {
        modal.classList.remove('active');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
        
        console.log('✅ 퍼스널컬러 모달 비활성화됨');
    }
}

/**
 * 테마 동기화 (HAIRGATOR 메인 테마와 연동)
 */
function syncThemeToPersonalColor() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const iframe = document.getElementById('personalColorFrame');
    
    if (iframe && iframe.contentWindow) {
        try {
            // iframe 내부 테마 동기화 메시지 전송
            iframe.contentWindow.postMessage({
                type: 'THEME_UPDATE',
                theme: currentTheme
            }, '*');
            
            console.log(`🎨 퍼스널컬러 테마 동기화: ${currentTheme}`);
        } catch (error) {
            console.log('⚠️ 테마 동기화 실패 (크로스 오리진):', error.message);
        }
    }
}

/**
 * ESC 키 이벤트 처리
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('personalColorModal');
        if (modal && modal.classList.contains('active')) {
            closePersonalColorModal();
        }
    }
});

/**
 * iframe 로드 완료 시 테마 동기화
 */
document.addEventListener('DOMContentLoaded', function() {
    const iframe = document.getElementById('personalColorFrame');
    if (iframe) {
        iframe.addEventListener('load', function() {
            setTimeout(syncThemeToPersonalColor, 500);
        });
    }
});

// 전역 스코프에 함수 등록 (HAIRGATOR 호환성)
window.openPersonalColorModal = openPersonalColorModal;
window.closePersonalColorModal = closePersonalColorModal;
window.syncThemeToPersonalColor = syncThemeToPersonalColor;

console.log('🎨 HAIRGATOR 퍼스널컬러 모듈 로드 완료');
