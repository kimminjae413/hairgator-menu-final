// 스마트 캐시 관리자 - 사용자 경험 최적화
class SmartCacheManager {
  constructor() {
    this.currentVersion = '2.1.0';
    this.lastCheckTime = localStorage.getItem('lastCacheCheck');
    this.errorCount = 0;
    this.maxErrors = 3; // 3번 오류 발생 시 업데이트 권장
    
    this.init();
  }

  async init() {
    // 1. 앱 시작 시 버전 체크
    await this.checkVersionMismatch();
    
    // 2. 오류 패턴 모니터링
    this.monitorErrors();
    
    // 3. 주기적 건강성 체크 (하루 1회)
    this.scheduleHealthCheck();
  }

  // 🔍 버전 불일치 감지
  async checkVersionMismatch() {
    try {
      const storedVersion = localStorage.getItem('app_version');
      
      if (storedVersion !== this.currentVersion) {
        console.log('🔄 새 버전 감지:', this.currentVersion);
        
        // 자동 캐시 정리 (백그라운드)
        await this.cleanOldCache();
        
        // 버전 업데이트
        localStorage.setItem('app_version', this.currentVersion);
        
        // 사용자에게 부드럽게 알림
        this.showUpdateNotice('새로운 기능이 추가되었습니다!');
      }
    } catch (error) {
      console.warn('버전 체크 실패:', error);
    }
  }

  // 🚨 오류 패턴 모니터링
  monitorErrors() {
    // Firebase 연결 실패 감지
    window.addEventListener('firebaseError', () => {
      this.errorCount++;
      this.checkIfUpdateNeeded();
    });

    // DOM 오류 감지
    const originalError = window.addEventListener;
    window.addEventListener('error', (event) => {
      if (this.isCacheRelatedError(event)) {
        this.errorCount++;
        this.checkIfUpdateNeeded();
      }
    });

    // 스타일 로드 실패 감지
    this.monitorStylesheetErrors();
  }

  // 💡 캐시 관련 오류인지 판단
  isCacheRelatedError(event) {
    const errorPatterns = [
      /Failed to fetch/i,
      /Loading chunk/i,
      /Cannot read.*of undefined/i,
      /is not a function/i
    ];
    
    return errorPatterns.some(pattern => 
      pattern.test(event.message || '')
    );
  }

  // 📊 업데이트 필요성 판단
  checkIfUpdateNeeded() {
    if (this.errorCount >= this.maxErrors) {
      console.log('🔧 캐시 문제로 인한 오류 다발, 업데이트 권장');
      this.showUpdateButton();
      this.errorCount = 0; // 리셋
    }
  }

  // 🧹 스마트 캐시 정리
  async cleanOldCache() {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          !name.includes(this.currentVersion)
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        return true;
      } catch (error) {
        console.warn('캐시 정리 실패:', error);
        return false;
      }
    }
  }

  // 📅 정기 건강성 체크
  scheduleHealthCheck() {
    const now = Date.now();
    const lastCheck = parseInt(this.lastCheckTime) || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - lastCheck > oneDay) {
      setTimeout(() => {
        this.performHealthCheck();
        localStorage.setItem('lastCacheCheck', now.toString());
      }, 5000); // 5초 후 실행 (앱 로드 완료 후)
    }
  }

  // 🏥 건강성 체크 수행
  async performHealthCheck() {
    console.log('🏥 앱 건강성 체크 시작');
    
    // 1. 핵심 파일 로드 테스트
    const criticalFiles = [
      '/js/main.js',
      '/css/main.css',
      '/js/firebase-config.js'
    ];
    
    let failedFiles = 0;
    
    for (const file of criticalFiles) {
      try {
        const response = await fetch(file + '?v=' + this.currentVersion);
        if (!response.ok) failedFiles++;
      } catch {
        failedFiles++;
      }
    }
    
    // 2. 파일 로드 실패가 많으면 업데이트 권장
    if (failedFiles > 1) {
      this.showUpdateButton();
    }
  }

  // 📢 업데이트 알림 표시 (부드럽게)
  showUpdateNotice(message) {
    // 기존 error-handler의 showUserMessage 활용
    if (window.errorHandler) {
      window.errorHandler.showUserMessage(message, 'info');
    }
  }

  // 🔄 업데이트 버튼 표시
  showUpdateButton() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // 이미 버튼이 있으면 중복 생성 방지
    if (document.getElementById('cacheUpdateBtn')) return;
    
    const updateNotice = document.createElement('div');
    updateNotice.id = 'cacheUpdateBtn';
    updateNotice.className = 'cache-update-notice';
    updateNotice.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 20px;">⚡</span>
        <div>
          <div style="font-weight: bold; font-size: 14px;">앱 개선 업데이트</div>
          <div style="font-size: 12px; opacity: 0.9;">더 나은 환경으로 업데이트하세요</div>
        </div>
      </div>
      <button onclick="smartCacheManager.performUpdate()" style="
        width: 100%; padding: 10px; background: rgba(255,255,255,0.2); 
        color: white; border: none; border-radius: 8px; cursor: pointer;
        font-size: 14px; font-weight: bold; transition: all 0.3s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
         onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        지금 업데이트
      </button>
    `;
    
    // 사이드바 콘텐츠 맨 위에 추가
    const sidebarContent = sidebar.querySelector('.sidebar-content');
    if (sidebarContent) {
      sidebarContent.insertBefore(updateNotice, sidebarContent.firstChild);
      
      // 5분 후 자동 숨김 (사용자가 무시하는 경우)
      setTimeout(() => {
        if (updateNotice.parentNode) {
          updateNotice.remove();
        }
      }, 300000);
    }
  }

  // 🚀 업데이트 실행
  async performUpdate() {
    const updateBtn = document.getElementById('cacheUpdateBtn');
    if (updateBtn) {
      updateBtn.innerHTML = `
        <div style="text-align: center; padding: 15px;">
          <div style="margin-bottom: 10px;">⏳ 업데이트 중...</div>
          <div style="font-size: 12px;">잠시만 기다려주세요</div>
        </div>
      `;
    }
    
    try {
      // 1. 모든 캐시 정리
      await this.cleanOldCache();
      
      // 2. Service Worker 업데이트
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(reg => reg.update())
        );
      }
      
      // 3. 부드럽게 새로고침
      setTimeout(() => {
        location.reload(true);
      }, 1000);
      
    } catch (error) {
      console.error('업데이트 실패:', error);
      
      if (updateBtn) {
        updateBtn.innerHTML = `
          <div style="text-align: center; padding: 15px;">
            <div style="margin-bottom: 10px;">⚠️ 업데이트 실패</div>
            <div style="font-size: 12px;">페이지를 새로고침해주세요</div>
          </div>
        `;
      }
    }
  }

  // 📊 스타일시트 로드 오류 감지
  monitorStylesheetErrors() {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      link.addEventListener('error', () => {
        console.warn('스타일시트 로드 실패:', link.href);
        this.errorCount++;
        this.checkIfUpdateNeeded();
      });
    });
  }
}

// 전역 인스턴스 생성
window.smartCacheManager = new SmartCacheManager();

console.log('🧠 스마트 캐시 관리자 활성화됨');
