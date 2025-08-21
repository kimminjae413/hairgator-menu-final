// === 1. service-worker.js 수정 ===
// Service Worker for HAIRGATOR PWA - 업데이트 알림 시스템 포함
const CACHE_NAME = 'hairgator-v2.0.0'; // 🔥 버전 업데이트 시마다 변경
const DYNAMIC_CACHE = 'hairgator-dynamic-v2.0.0';

// 업데이트 감지를 위한 버전 정보
const APP_VERSION = '2.0.0';
const UPDATE_CHECK_INTERVAL = 30000; // 30초마다 체크

// 기본 캐시 파일들
const urlsToCache = [
  '/',
  '/manifest.json',
  '/petal.png'
];

// 🚫 절대 캐시하지 않을 URL 패턴들
const NO_CACHE_PATTERNS = [
  /firebasestorage\.googleapis\.com/,
  /\.firebasestorage\.app/,
  /googleapis\.com/,
  /\/admin\.html$/,
  /\/migration\.html$/,
  /firebase-config\.js$/
];

// Install Event
self.addEventListener('install', event => {
  console.log('🔧 Service Worker v' + APP_VERSION + ' 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 기본 캐시 생성');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ 캐시 설치 실패:', error);
      })
  );
  
  // 즉시 활성화 (새 버전 강제 적용)
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v' + APP_VERSION + ' 활성화 중...');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 정리
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 즉시 클라이언트 제어
      self.clients.claim()
    ])
  );
  
  // 🔥 모든 클라이언트에게 업데이트 알림 전송
  setTimeout(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: APP_VERSION,
          message: '새로운 업데이트가 있습니다!'
        });
      });
    });
  }, 1000);
});

// Fetch Event
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 캐시 제외 패턴 체크
  const shouldSkipCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
  
  if (shouldSkipCache) {
    console.log('🚫 캐시 제외 (네트워크 직접):', url.pathname);
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('💾 캐시에서 로드:', url.pathname);
          return response;
        }
        
        console.log('🌐 네트워크에서 로드:', url.pathname);
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              console.log('💾 동적 캐시 저장:', url.pathname);
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// 🔥 업데이트 체크 메시지 리스너
self.addEventListener('message', event => {
  if (event.data.type === 'CHECK_UPDATE') {
    // 버전 체크 응답
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: APP_VERSION,
      cacheNames: [CACHE_NAME, DYNAMIC_CACHE]
    });
  }
  
  if (event.data.type === 'FORCE_UPDATE') {
    console.log('🔄 강제 업데이트 요청 받음');
    
    // 모든 캐시 삭제
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      // 모든 클라이언트에게 새로고침 명령
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FORCE_RELOAD',
            version: APP_VERSION
          });
        });
      });
    });
  }
});

// === 2. index.html에 추가할 업데이트 알림 시스템 ===
/*
<script>
// 🚨 업데이트 알림 시스템 - 메인 브랜치 전용
class UpdateNotificationSystem {
    constructor() {
        this.currentVersion = '2.0.0'; // 현재 앱 버전
        this.updateCheckInterval = null;
        this.notificationShown = false;
        
        // 🎯 네트리파이 환경 감지
        this.isProduction = this.detectProductionEnvironment();
        
        this.init();
    }
    
    // 🔍 프로덕션 환경 감지 (메인 브랜치 배포만)
    detectProductionEnvironment() {
        const hostname = window.location.hostname;
        const isNetlifyProd = hostname === 'lovely-lebkuchen-4017ca.netlify.app';
        const isCustomDomain = !hostname.includes('netlify.app') && !hostname.includes('localhost');
        
        // 네트리파이 환경 변수 체크 (가능한 경우)
        const netlifyContext = window.netlifyIdentity?.currentUser()?.app_metadata?.netlify_context || 'production';
        const isMainBranch = netlifyContext === 'production';
        
        const isProduction = isNetlifyProd || isCustomDomain || isMainBranch;
        
        console.log('🌍 환경 감지:', {
            hostname,
            isNetlifyProd,
            isCustomDomain,
            netlifyContext,
            isMainBranch,
            isProduction: isProduction
        });
        
        return isProduction;
    }
    
    init() {
        console.log('🔄 업데이트 알림 시스템 초기화');
        
        // 🎯 프로덕션 환경이 아니면 비활성화
        if (!this.isProduction) {
            console.log('🚫 개발/데브 브랜치 환경 - 업데이트 알림 비활성화');
            this.showDevModeIndicator();
            return;
        }
        
        console.log('✅ 프로덕션 환경 - 업데이트 알림 활성화');
        this.setupServiceWorkerListeners();
        this.createNotificationHTML();
        this.startUpdateCheck();
    }
    
    // 🔧 개발 모드 표시기 (선택사항)
    showDevModeIndicator() {
        // 개발 환경임을 알리는 작은 표시기 (콘솔에만 표시)
        console.log('🔧 현재 개발/브랜치 환경입니다. 메인 브랜치에서만 업데이트 알림이 작동합니다.');
        
        // (선택사항) 개발자용 시각적 표시기
        if (window.location.hostname.includes('localhost') || 
            window.location.hostname.includes('--')) {
            
            const devIndicator = document.createElement('div');
            devIndicator.style.cssText = `
                position: fixed; 
                bottom: 10px; 
                left: 10px; 
                background: #666; 
                color: white; 
                padding: 5px 10px; 
                border-radius: 5px; 
                font-size: 10px; 
                z-index: 9999;
                opacity: 0.7;
            `;
            devIndicator.textContent = '🔧 DEV';
            document.body.appendChild(devIndicator);
            
            // 5초 후 자동 제거
            setTimeout(() => devIndicator.remove(), 5000);
        }
    }
    
    // Service Worker 메시지 리스너 설정
    setupServiceWorkerListeners() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('📨 Service Worker 메시지:', event.data);
                
                if (event.data.type === 'UPDATE_AVAILABLE') {
                    this.showUpdateNotification(event.data);
                }
                
                if (event.data.type === 'FORCE_RELOAD') {
                    console.log('🔄 강제 새로고침 실행');
                    this.forceReload();
                }
            });
        }
    }
    
    // 업데이트 알림 HTML 생성
    createNotificationHTML() {
        const notificationHTML = `
            <div id="updateNotification" class="update-notification" style="display: none;">
                <div class="update-content">
                    <div class="update-icon">🚀</div>
                    <div class="update-text">
                        <div class="update-title">새로운 업데이트 발견!</div>
                        <div class="update-message">향상된 기능과 성능을 경험하세요</div>
                    </div>
                    <button id="updateBtn" class="update-btn">
                        ✨ 업데이트
                    </button>
                    <button id="dismissBtn" class="dismiss-btn">
                        ✕
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', notificationHTML);
        
        // 이벤트 리스너 추가
        const updateBtn = document.getElementById('updateBtn');
        const dismissBtn = document.getElementById('dismissBtn');
        
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.handleUpdate());
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.hideNotification());
        }
    }
    
    // 업데이트 알림 표시
    showUpdateNotification(data) {
        // 🎯 프로덕션 환경 체크
        if (!this.isProduction) {
            console.log('🚫 개발 환경에서는 업데이트 알림 표시 안함');
            return;
        }
        
        if (this.notificationShown) return;
        
        console.log('🚨 프로덕션 업데이트 알림 표시:', data);
        
        const notification = document.getElementById('updateNotification');
        const message = document.querySelector('.update-message');
        
        if (notification && message) {
            // 메시지 업데이트
            if (data.message) {
                message.textContent = data.message + ' (메인 브랜치)';
            }
            
            // 애니메이션과 함께 표시
            notification.style.display = 'flex';
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            this.notificationShown = true;
            
            // 10초 후 자동 숨김 (선택사항)
            setTimeout(() => {
                if (this.notificationShown) {
                    this.addPulseEffect();
                }
            }, 10000);
        }
    }
    
    // 업데이트 처리
    async handleUpdate() {
        console.log('🔄 업데이트 처리 시작');
        
        const updateBtn = document.getElementById('updateBtn');
        if (updateBtn) {
            updateBtn.innerHTML = '⏳ 업데이트 중...';
            updateBtn.disabled = true;
        }
        
        try {
            // Service Worker에게 강제 업데이트 요청
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'FORCE_UPDATE'
                });
            }
            
            // 2초 후 강제 새로고침 (Service Worker 응답 대기)
            setTimeout(() => {
                this.forceReload();
            }, 2000);
            
        } catch (error) {
            console.error('❌ 업데이트 실패:', error);
            
            if (updateBtn) {
                updateBtn.innerHTML = '❌ 실패 - 다시 시도';
                updateBtn.disabled = false;
            }
        }
    }
    
    // 강제 새로고침
    forceReload() {
        console.log('🔄 강제 새로고침 실행');
        
        // 로딩 오버레이 표시
        this.showReloadingOverlay();
        
        // 캐시 무시하고 강제 새로고침
        setTimeout(() => {
            window.location.reload(true);
        }, 500);
    }
    
    // 새로고침 오버레이 표시
    showReloadingOverlay() {
        const overlayHTML = `
            <div id="reloadingOverlay" class="reloading-overlay">
                <div class="reloading-content">
                    <div class="loading-spinner"></div>
                    <h3>🚀 업데이트 적용 중...</h3>
                    <p>잠시만 기다려주세요</p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', overlayHTML);
    }
    
    // 알림 숨기기
    hideNotification() {
        const notification = document.getElementById('updateNotification');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
                this.notificationShown = false;
            }, 300);
        }
    }
    
    // 펄스 효과 추가 (주의 끌기)
    addPulseEffect() {
        const notification = document.getElementById('updateNotification');
        if (notification && this.notificationShown) {
            notification.classList.add('pulse');
            
            setTimeout(() => {
                notification.classList.remove('pulse');
            }, 2000);
        }
    }
    
    // 주기적 업데이트 체크
    startUpdateCheck() {
        // 🎯 프로덕션 환경에서만 작동
        if (!this.isProduction) {
            console.log('🚫 개발 환경에서는 업데이트 체크 비활성화');
            return;
        }
        
        console.log('✅ 프로덕션 업데이트 체크 시작');
        
        // 5분마다 업데이트 체크
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates();
        }, 5 * 60 * 1000);
        
        // 페이지 포커스 시에도 체크
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
        
        // 네트리파이 특화: 브라우저 온라인 상태 변경 시에도 체크
        window.addEventListener('online', () => {
            console.log('🌐 온라인 상태 복구 - 업데이트 체크');
            setTimeout(() => this.checkForUpdates(), 2000);
        });
    }
    
    // 업데이트 체크
    async checkForUpdates() {
        if (this.notificationShown || !this.isProduction) return;
        
        try {
            console.log('🔍 프로덕션 업데이트 체크 실행...');
            
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Service Worker에게 버전 확인 요청
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'VERSION_INFO') {
                        console.log('📊 버전 정보:', event.data);
                        
                        // 버전이 다르면 업데이트 알림
                        if (event.data.version !== this.currentVersion) {
                            this.showUpdateNotification({
                                version: event.data.version,
                                message: '메인 브랜치 새 버전이 배포되었습니다!'
                            });
                        }
                    }
                };
                
                navigator.serviceWorker.controller.postMessage({
                    type: 'CHECK_UPDATE'
                }, [messageChannel.port2]);
            }
            
            // 🎯 추가: 네트리파이 빌드 ID 체크 (더 정확한 감지)
            await this.checkNetlifyBuildId();
            
        } catch (error) {
            console.log('⚠️ 프로덕션 업데이트 체크 실패:', error);
        }
    }
    
    // 🚀 네트리파이 빌드 ID 체크 (더 정확한 감지)
    async checkNetlifyBuildId() {
        try {
            // 네트리파이는 각 빌드마다 고유한 빌드 ID를 생성
            // 현재 빌드 정보를 메타 태그나 헤더에서 확인
            const buildIdMeta = document.querySelector('meta[name="netlify-build-id"]');
            const currentBuildId = buildIdMeta?.content || this.currentVersion;
            
            // 원격에서 최신 빌드 정보 확인 (캐시 우회)
            const response = await fetch(`/?t=${Date.now()}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            const html = await response.text();
            const remoteBuildMatch = html.match(/name="netlify-build-id"[^>]*content="([^"]+)"/);
            const remoteBuildId = remoteBuildMatch ? remoteBuildMatch[1] : null;
            
            console.log('🏗️ 빌드 ID 비교:', {
                current: currentBuildId,
                remote: remoteBuildId,
                isDifferent: remoteBuildId && remoteBuildId !== currentBuildId
            });
            
            if (remoteBuildId && remoteBuildId !== currentBuildId) {
                console.log('🎉 새로운 메인 브랜치 빌드 감지!');
                this.showUpdateNotification({
                    version: remoteBuildId,
                    message: '새로운 프로덕션 빌드가 배포되었습니다!'
                });
            }
            
        } catch (error) {
            console.log('⚠️ 네트리파이 빌드 ID 체크 실패:', error);
        }
    }
}

// CSS 스타일 추가
const updateStyles = `
<style>
.update-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: linear-gradient(135deg, #ff1744, #ff5722);
    color: white;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(255, 23, 68, 0.4);
    z-index: 10000;
    max-width: 90vw;
    width: 400px;
    opacity: 0;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.update-notification.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

.update-notification.pulse {
    animation: updatePulse 2s ease-in-out;
}

@keyframes updatePulse {
    0%, 100% { 
        transform: translateX(-50%) translateY(0) scale(1); 
        box-shadow: 0 10px 30px rgba(255, 23, 68, 0.4);
    }
    50% { 
        transform: translateX(-50%) translateY(0) scale(1.05); 
        box-shadow: 0 15px 40px rgba(255, 23, 68, 0.6);
    }
}

.update-content {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 15px;
}

.update-icon {
    font-size: 32px;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
}

.update-text {
    flex: 1;
}

.update-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
}

.update-message {
    font-size: 13px;
    opacity: 0.9;
}

.update-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.5);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: all 0.3s ease;
    margin-right: 10px;
}

.update-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.8);
    transform: translateY(-2px);
}

.update-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.dismiss-btn {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    opacity: 0.7;
}

.dismiss-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    opacity: 1;
}

.reloading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15000;
}

.reloading-content {
    text-align: center;
    color: white;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: #FF1493;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.reloading-content h3 {
    margin: 0 0 10px 0;
    font-size: 24px;
}

.reloading-content p {
    margin: 0;
    opacity: 0.8;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
    .update-notification {
        width: 95vw;
        top: 10px;
    }
    
    .update-content {
        padding: 15px;
        gap: 10px;
    }
    
    .update-icon {
        font-size: 28px;
    }
    
    .update-title {
        font-size: 14px;
    }
    
    .update-message {
        font-size: 12px;
    }
    
    .update-btn {
        padding: 8px 16px;
        font-size: 12px;
    }
}
</style>
`;

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', () => {
    // CSS 스타일 추가
    document.head.insertAdjacentHTML('beforeend', updateStyles);
    
    // 업데이트 알림 시스템 초기화
    window.updateNotificationSystem = new UpdateNotificationSystem();
    
    console.log('✅ 업데이트 알림 시스템 준비 완료');
});

// Service Worker 등록 및 업데이트 감지 - 프로덕션 전용
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 🎯 프로덕션 환경 체크
        const hostname = window.location.hostname;
        const isProduction = hostname === 'lovely-lebkuchen-4017ca.netlify.app' || 
                           (!hostname.includes('netlify.app') && !hostname.includes('localhost'));
        
        if (!isProduction) {
            console.log('🚫 개발/데브 환경 - Service Worker 업데이트 감지 비활성화');
            return;
        }
        
        console.log('✅ 프로덕션 환경 - Service Worker 등록');
        
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ 프로덕션 Service Worker 등록 성공');
                
                // 업데이트 감지
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 새 프로덕션 Service Worker 버전 발견!');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                console.log('🎉 새 프로덕션 버전 사용 가능!');
                                // 알림 시스템이 자동으로 처리
                            }
                        }
                    });
                });
                
                // 10초마다 업데이트 체크 (프로덕션에서는 더 자주)
                setInterval(() => {
                    registration.update();
                }, 10000);
                
                // 페이지 포커스 시마다 업데이트 체크
                window.addEventListener('focus', () => {
                    registration.update();
                });
                
                // 🚀 네트리파이 특화: 웹소켓 연결로 실시간 배포 감지
                // (선택사항 - 더 즉각적인 반응을 원하는 경우)
                if ('BroadcastChannel' in window) {
                    const deployChannel = new BroadcastChannel('netlify-deploy');
                    deployChannel.addEventListener('message', (event) => {
                        if (event.data.type === 'deploy-complete') {
                            console.log('🚀 네트리파이 배포 완료 신호 수신');
                            registration.update();
                        }
                    });
                }
                
            })
            .catch(err => {
                console.log('❌ 프로덕션 SW registration failed:', err);
            });
    });
} else {
    console.log('🚫 Service Worker 미지원 브라우저');
}
</script>
*/
