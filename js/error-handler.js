// HAIRGATOR 에러 처리 및 로깅 시스템
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.setupGlobalErrorHandling();
  }

  // 글로벌 에러 핸들링 설정
  setupGlobalErrorHandling() {
    // JavaScript 런타임 에러
    window.addEventListener('error', (event) => {
      this.logError('RUNTIME_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Promise rejection 에러
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('PROMISE_REJECTION', {
        reason: event.reason,
        stack: event.reason?.stack
      });
      event.preventDefault(); // 콘솔 에러 방지
    });

    // 네트워크 에러
    window.addEventListener('offline', () => {
      this.showUserMessage('네트워크 연결이 끊어졌습니다. 오프라인 모드로 전환됩니다.', 'warning');
    });

    window.addEventListener('online', () => {
      this.showUserMessage('네트워크 연결이 복구되었습니다.', 'success');
    });
  }

  // 에러 로깅
  logError(type, details) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorLog.push(errorEntry);
    
    // 로그 크기 제한
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // 개발 모드에서만 콘솔 출력
    if (this.isDevelopment()) {
      console.error(`[${type}]`, details);
    }

    // 심각한 에러의 경우 사용자에게 알림
    if (this.isCriticalError(type)) {
      this.showUserMessage('문제가 발생했습니다. 페이지를 새로고침해주세요.', 'error');
    }
  }

  // Firebase 관련 에러 처리
  handleFirebaseError(error, context = '') {
    let userMessage = '데이터 로드 중 문제가 발생했습니다.';
    
    switch (error.code) {
      case 'permission-denied':
        userMessage = '데이터 접근 권한이 없습니다.';
        break;
      case 'unavailable':
        userMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
        break;
      case 'failed-precondition':
        userMessage = '데이터베이스 설정에 문제가 있습니다.';
        break;
      case 'not-found':
        userMessage = '요청한 데이터를 찾을 수 없습니다.';
        break;
    }

    this.logError('FIREBASE_ERROR', {
      code: error.code,
      message: error.message,
      context
    });

    return userMessage;
  }

  // 네트워크 에러 처리
  handleNetworkError(error, context = '') {
    this.logError('NETWORK_ERROR', {
      message: error.message,
      context
    });

    if (!navigator.onLine) {
      return '인터넷 연결을 확인해주세요.';
    }

    return '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  // 사용자 메시지 표시
  showUserMessage(message, type = 'info') {
    // 기존 토스트가 있으면 제거
    const existingToast = document.querySelector('.error-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `error-toast error-toast-${type}`;
    toast.textContent = message;
    
    // 스타일 적용
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: this.getToastColor(type),
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease'
    });

    document.body.appendChild(toast);

    // 애니메이션
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // 자동 제거
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
  }

  // 토스트 색상 가져오기
  getToastColor(type) {
    switch (type) {
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'success': return '#28a745';
      default: return '#17a2b8';
    }
  }

  // 심각한 에러 판단
  isCriticalError(type) {
    return ['RUNTIME_ERROR', 'FIREBASE_ERROR'].includes(type);
  }

  // 개발 모드 확인
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  }

  // 에러 로그 내보내기 (디버깅용)
  exportErrorLog() {
    if (this.isDevelopment()) {
      console.table(this.errorLog);
      
      const dataStr = JSON.stringify(this.errorLog, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hairgator-errors-${new Date().getTime()}.json`;
      link.click();
    }
  }

  // 에러 로그 지우기
  clearErrorLog() {
    this.errorLog = [];
    console.log('에러 로그가 지워졌습니다.');
  }
}

// 전역 에러 핸들러 인스턴스 생성
window.errorHandler = new ErrorHandler();

// 개발자 도구에서 사용할 수 있는 헬퍼 함수들
if (window.errorHandler.isDevelopment()) {
  window.debugHairgator = {
    exportErrors: () => window.errorHandler.exportErrorLog(),
    clearErrors: () => window.errorHandler.clearErrorLog(),
    showTestError: () => window.errorHandler.showUserMessage('테스트 에러 메시지', 'error'),
    showTestSuccess: () => window.errorHandler.showUserMessage('테스트 성공 메시지', 'success')
  };
  
  console.log('%c🐛 HAIRGATOR Debug Mode', 'background: #FF1493; color: white; padding: 4px 8px; border-radius: 4px;');
  console.log('사용 가능한 디버그 명령어:');
  console.log('- debugHairgator.exportErrors() : 에러 로그 내보내기');
  console.log('- debugHairgator.clearErrors() : 에러 로그 지우기'); 
  console.log('- debugHairgator.showTestError() : 테스트 에러 표시');
  console.log('- debugHairgator.showTestSuccess() : 테스트 성공 표시');
}
