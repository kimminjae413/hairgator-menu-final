// ========================================
// HAIRGATOR 퍼스널컬러 모듈 - 최종 완성 버전
// 파일: js/personal-color.js
// ========================================

console.log('🎨 HAIRGATOR 퍼스널컬러 모듈 초기화...');

/**
 * 퍼스널컬러 모달 열기
 */
function openPersonalColorModal() {
    console.log('🎨 퍼스널컬러 진단 시스템 열기');
    
    const modal = document.getElementById('personalColorModal');
    const iframe = document.getElementById('personalColorFrame');
    
    if (!modal) {
        console.error('❌ personalColorModal 요소를 찾을 수 없습니다');
        return;
    }

    // 모달 표시
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 애니메이션을 위한 짧은 지연
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    // iframe 소스 설정 (아직 설정되지 않은 경우에만)
    if (iframe && (!iframe.src || iframe.src === 'about:blank')) {
        iframe.src = 'personal-color/index.html';
    }
    
    // 햅틱 피드백 (지원하는 기기에서만)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    console.log('✅ 퍼스널컬러 모달 열림');
}

/**
 * 퍼스널컬러 모달 닫기
 */
function closePersonalColorModal() {
    console.log('🔄 퍼스널컬러 진단 시스템 닫기');
    
    const modal = document.getElementById('personalColorModal');
    
    if (!modal) {
        console.error('❌ personalColorModal 요소를 찾을 수 없습니다');
        return;
    }

    // 애니메이션 시작
    modal.classList.remove('active');
    
    // 애니메이션 완료 후 숨김
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
    
    console.log('✅ 퍼스널컬러 모달 닫힘');
}

/**
 * 테마 동기화 함수
 */
function syncThemeToPersonalColor() {
    const iframe = document.getElementById('personalColorFrame');
    
    if (!iframe || !iframe.contentWindow) {
        return;
    }

    // HAIRGATOR 현재 테마 감지
    const isLightTheme = document.body.classList.contains('light-theme');
    const currentTheme = isLightTheme ? 'light' : 'dark';
    
    try {
        // iframe에 테마 정보 전송
        iframe.contentWindow.postMessage({
            type: 'HAIRGATOR_THEME_SYNC',
            theme: currentTheme,
            colors: {
                primary: '#E91E63',
                background: isLightTheme ? '#ffffff' : '#121212',
                textPrimary: isLightTheme ? '#333333' : '#ffffff'
            }
        }, '*');
        
        console.log(`🎨 퍼스널컬러 테마 동기화: ${currentTheme}`);
    } catch (error) {
        console.log('⚠️ 테마 동기화 실패 (정상적인 보안 제한)');
    }
}

/**
 * iframe 메시지 수신 처리
 */
function handlePersonalColorMessages(event) {
    // 보안: origin 검사 (같은 도메인만 허용)
    if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
    }

    const data = event.data;
    
    if (data.type === 'PERSONAL_COLOR_RESULT') {
        console.log('🎨 퍼스널컬러 진단 결과 수신:', data.result);
        
        // 결과를 로컬 스토리지에 저장
        if (data.result) {
            localStorage.setItem('hairgator-personal-color-result', JSON.stringify({
                result: data.result,
                timestamp: Date.now()
            }));
        }
        
        // 토스트 메시지 표시 (HAIRGATOR의 showToast 함수 사용)
        if (typeof showToast === 'function' && data.result) {
            const season = data.result.season || '알 수 없음';
            const type = data.result.type || '';
            showToast(`🎨 진단 완료!\n당신의 퍼스널컬러: ${season} ${type}`, 'success');
        }
    }
}

/**
 * 초기화 함수
 */
function initPersonalColorModule() {
    console.log('🎨 퍼스널컬러 모듈 초기화 시작');

    // iframe 로드 완료 시 테마 동기화
    const iframe = document.getElementById('personalColorFrame');
    if (iframe) {
        iframe.addEventListener('load', function() {
            // 로드 완료 후 약간의 지연을 두고 테마 동기화
            setTimeout(syncThemeToPersonalColor, 800);
        });
    }

    // 메시지 리스너 등록
    window.addEventListener('message', handlePersonalColorMessages);
    
    // 테마 변경 감지 (MutationObserver 사용)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' && 
                mutation.target === document.body) {
                // 테마가 변경되었으므로 퍼스널컬러에도 반영
                setTimeout(syncThemeToPersonalColor, 100);
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });

    console.log('✅ 퍼스널컬러 모듈 초기화 완료');
}

/**
 * ESC 키 이벤트 처리
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('personalColorModal');
        if (modal && modal.classList.contains('active')) {
            closePersonalColorModal();
            event.preventDefault();
            event.stopPropagation();
        }
    }
}

// 이벤트 리스너 등록
document.addEventListener('keydown', handleEscapeKey);

// DOM이 로드된 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalColorModule);
} else {
    // 이미 로드된 경우 즉시 초기화
    initPersonalColorModule();
}

// 전역 함수로 등록 (HAIRGATOR 호환성)
window.openPersonalColorModal = openPersonalColorModal;
window.closePersonalColorModal = closePersonalColorModal;
window.syncThemeToPersonalColor = syncThemeToPersonalColor;

// 퍼스널컬러 모듈 객체 등록
window.HAIRGATOR_PERSONAL_COLOR = {
    openModal: openPersonalColorModal,
    closeModal: closePersonalColorModal,
    syncTheme: syncThemeToPersonalColor,
    version: '1.0.0'
};

console.log('🎨 HAIRGATOR 퍼스널컬러 모듈 로드 완료');
