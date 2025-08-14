// ========== HAIRGATOR 강제 캐시 업데이트 시스템 ==========
// 유저들이 항상 최신 버전을 보도록 보장하는 시스템

console.log('🔄 HAIRGATOR 캐시 업데이트 시스템 로딩...');

// ========== 1. 앱 버전 관리 시스템 ==========
class AppVersionManager {
    constructor() {
        this.currentVersion = '1.3.0'; // 🔥 업데이트할 때마다 버전 올리기!
        this.versionCheckInterval = 5 * 60 * 1000; // 5분마다 체크
        this.forceUpdateThreshold = 24 * 60 * 60 * 1000; // 24시간 후 강제 업데이트
        
        this.init();
    }
    
    async init() {
        console.log(`📱 앱 버전: ${this.currentVersion}`);
        
        // 즉시 버전 체크
        await this.checkForUpdates();
        
        // 주기적 버전 체크
        setInterval(() => {
            this.checkForUpdates();
        }, this.versionCheckInterval);
        
        // 페이지 가시성 변경시 체크 (앱으로 돌아올 때)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
        
        // Service Worker 업데이트 감지
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('🔄 Service Worker 업데이트됨');
                this.showUpdateNotification();
            });
        }
    }
    
    async checkForUpdates() {
        try {
            // 캐시 무시하고 버전 정보 가져오기
            const response = await fetch(`/version.json?t=${Date.now()}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            
            if (response.ok) {
                const versionInfo = await response.json();
                console.log('📊 서버 버전 체크:', versionInfo);
                
                if (this.isNewerVersion(versionInfo.version, this.currentVersion)) {
                    console.log('🆕 새 버전 발견!', versionInfo.version);
                    this.handleNewVersion(versionInfo);
                }
            }
        } catch (error) {
            console.warn('버전 체크 실패:', error);
        }
    }
    
    isNewerVersion(serverVersion, clientVersion) {
        const server = serverVersion.split('.').map(Number);
        const client = clientVersion.split('.').map(Number);
        
        for (let i = 0; i < Math.max(server.length, client.length); i++) {
            const s = server[i] || 0;
            const c = client[i] || 0;
            if (s > c) return true;
            if (s < c) return false;
        }
        return false;
    }
    
    handleNewVersion(versionInfo) {
        const lastUpdateCheck = localStorage.getItem('hairgator_last_update_check');
        const timeSinceLastCheck = Date.now() - (lastUpdateCheck || 0);
        
        // 강제 업데이트 조건
        if (versionInfo.forceUpdate || timeSinceLastCheck > this.forceUpdateThreshold) {
            this.forceUpdate(versionInfo);
        } else {
            this.showUpdateNotification(versionInfo);
        }
    }
    
    showUpdateNotification(versionInfo = null) {
        // 기존 알림 제거
        const existingNotification = document.querySelector('.update-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-icon">🚀</div>
                <div class="update-text">
                    <div class="update-title">새 버전 업데이트</div>
                    <div class="update-description">
                        ${versionInfo ? `v${versionInfo.version}` : '최신 기능과 개선사항'}이 준비되었습니다
                    </div>
                </div>
                <div class="update-actions">
                    <button class="update-btn update-now">지금 업데이트</button>
                    <button class="update-btn update-later">나중에</button>
                </div>
            </div>
        `;
        
        // 스타일
        notification.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #FF1493, #FF69B4);
            color: white;
            z-index: 10001;
            padding: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transform: translateY(-100%);
            transition: transform 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // 애니메이션
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // 이벤트 리스너
        notification.querySelector('.update-now').onclick = () => {
            this.forceUpdate(versionInfo);
        };
        
        notification.querySelector('.update-later').onclick = () => {
            notification.style.transform = 'translateY(-100%)';
            setTimeout(() => notification.remove(), 300);
            localStorage.setItem('hairgator_last_update_check', Date.now());
        };
        
        // 5초 후 자동 숨김 (강제 업데이트가 아닌 경우)
        if (!versionInfo?.forceUpdate) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.transform = 'translateY(-100%)';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        }
    }
    
    async forceUpdate(versionInfo = null) {
        console.log('🔄 강제 업데이트 시작...');
        
        this.showUpdateProgress();
        
        try {
            // 1. Service Worker 업데이트
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                    console.log('✅ Service Worker 제거 완료');
                }
            }
            
            // 2. 모든 캐시 삭제
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(name => {
                        console.log('🗑️ 캐시 삭제:', name);
                        return caches.delete(name);
                    })
                );
            }
            
            // 3. localStorage 정리 (버전 관련만)
            const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith('hairgator_cache_') || 
                key.startsWith('hairgator_version_')
            );
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // 4. 현재 버전 업데이트
            if (versionInfo) {
                this.currentVersion = versionInfo.version;
                localStorage.setItem('hairgator_app_version', versionInfo.version);
            }
            
            console.log('✅ 캐시 정리 완료');
            
            // 5. 페이지 새로고침
            setTimeout(() => {
                window.location.reload(true); // 하드 리로드
            }, 1000);
            
        } catch (error) {
            console.error('❌ 강제 업데이트 실패:', error);
            // 페이지 새로고침만이라도 실행
            window.location.reload(true);
        }
    }
    
    showUpdateProgress() {
        const progress = document.createElement('div');
        progress.className = 'update-progress';
        progress.innerHTML = `
            <div class="update-progress-content">
                <div class="update-progress-icon">
                    <div class="spinner"></div>
                </div>
                <div class="update-progress-text">
                    <div class="update-progress-title">업데이트 중...</div>
                    <div class="update-progress-desc">잠시만 기다려주세요</div>
                </div>
            </div>
        `;
        
        progress.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(progress);
    }
}

// ========== 2. 개선된 Service Worker 관리 ==========
class ServiceWorkerManager {
    constructor() {
        this.init();
    }
    
    async init() {
        if (!('serviceWorker' in navigator)) {
            console.log('⚠️ Service Worker 미지원 브라우저');
            return;
        }
        
        try {
            // Service Worker 등록
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/',
                updateViaCache: 'none' // 캐시 무시하고 항상 최신 버전 체크
            });
            
            console.log('✅ Service Worker 등록 성공');
            
            // 업데이트 체크
            registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker 업데이트 발견');
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('✅ 새 Service Worker 설치 완료');
                        this.showServiceWorkerUpdateNotification();
                    }
                });
            });
            
            // 1시간마다 업데이트 체크
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);
            
        } catch (error) {
            console.error('❌ Service Worker 등록 실패:', error);
        }
    }
    
    showServiceWorkerUpdateNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">🔄 업데이트 완료</div>
                <div style="font-size: 14px; margin-bottom: 10px;">새로운 기능이 적용되었습니다</div>
                <button onclick="window.location.reload()" style="
                    background: white;
                    color: #4CAF50;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">새로고침</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
}

// ========== 3. 캐시 무효화 시스템 ==========
class CacheInvalidator {
    constructor() {
        this.criticalResources = [
            '/index.html',
            '/js/main.js',
            '/js/firebase-config.js',
            '/css/style.css',
            '/akool/js/akool-integration.js'
        ];
    }
    
    async invalidateCache() {
        console.log('🔄 캐시 무효화 시작...');
        
        try {
            // HTTP 캐시 무효화 (강제 새로고침)
            await this.invalidateHttpCache();
            
            // Service Worker 캐시 무효화
            await this.invalidateServiceWorkerCache();
            
            // 브라우저 저장소 정리
            this.cleanupBrowserStorage();
            
            console.log('✅ 캐시 무효화 완료');
            
        } catch (error) {
            console.error('❌ 캐시 무효화 실패:', error);
        }
    }
    
    async invalidateHttpCache() {
        // 중요한 리소스들을 캐시 무시하고 다시 로드
        const promises = this.criticalResources.map(async (resource) => {
            try {
                const response = await fetch(`${resource}?v=${Date.now()}`, {
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ ${resource} 새로고침 완료`);
                }
            } catch (error) {
                console.warn(`⚠️ ${resource} 새로고침 실패:`, error);
            }
        });
        
        await Promise.all(promises);
    }
    
    async invalidateServiceWorkerCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            
            // 오래된 캐시만 삭제 (현재 버전 제외)
            const currentCacheName = `hairgator-v${window.appVersionManager?.currentVersion || '1.3.0'}`;
            
            const deletePromises = cacheNames
                .filter(name => name !== currentCacheName && name.startsWith('hairgator-'))
                .map(name => {
                    console.log(`🗑️ 오래된 캐시 삭제: ${name}`);
                    return caches.delete(name);
                });
            
            await Promise.all(deletePromises);
        }
    }
    
    cleanupBrowserStorage() {
        // 오래된 캐시 키 정리
        const keysToRemove = Object.keys(localStorage).filter(key => 
            key.startsWith('hairgator_cache_') && 
            !key.includes(window.appVersionManager?.currentVersion || '1.3.0')
        );
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ 오래된 로컬 캐시 삭제: ${key}`);
        });
    }
}

// ========== 4. 초기화 및 CSS ==========
function initCacheUpdateSystem() {
    // CSS 추가
    const styles = document.createElement('style');
    styles.textContent = `
        .update-notification {
            font-family: 'Noto Sans KR', sans-serif;
        }
        
        .update-content {
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .update-icon {
            font-size: 24px;
            animation: bounce 2s infinite;
        }
        
        .update-text {
            flex: 1;
        }
        
        .update-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .update-description {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .update-actions {
            display: flex;
            gap: 10px;
        }
        
        .update-btn {
            padding: 8px 16px;
            border: 2px solid white;
            background: transparent;
            color: white;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
        }
        
        .update-now {
            background: white;
            color: #FF1493;
        }
        
        .update-now:hover {
            background: #f0f0f0;
        }
        
        .update-later:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .update-progress-content {
            text-align: center;
        }
        
        .update-progress-icon {
            margin-bottom: 20px;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #333;
            border-top: 4px solid #FF1493;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        .update-progress-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .update-progress-desc {
            font-size: 16px;
            opacity: 0.8;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .update-content {
                flex-direction: column;
                text-align: center;
                gap: 10px;
            }
            
            .update-actions {
                justify-content: center;
            }
        }
    `;
    
    document.head.appendChild(styles);
    
    // 시스템 초기화
    window.appVersionManager = new AppVersionManager();
    window.serviceWorkerManager = new ServiceWorkerManager();
    window.cacheInvalidator = new CacheInvalidator();
    
    // 개발자 도구용 함수들
    window.forceUpdate = () => window.appVersionManager.forceUpdate();
    window.clearAllCaches = () => window.cacheInvalidator.invalidateCache();
    
    console.log('✅ 캐시 업데이트 시스템 초기화 완료');
}

// ========== 5. 자동 초기화 ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCacheUpdateSystem);
} else {
    initCacheUpdateSystem();
}

console.log(`
🔄 HAIRGATOR 캐시 업데이트 시스템!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 주요 기능:
✅ 자동 버전 체크 (5분마다)
✅ 강제 업데이트 시스템
✅ Service Worker 관리
✅ 캐시 무효화
✅ 사용자 친화적 업데이트 알림
✅ 개발자 도구 함수

🎯 사용법:
- 업데이트 시 currentVersion 변경
- version.json 파일 서버에 배치
- 강제 업데이트: forceUpdate() 호출

🚀 유저들이 항상 최신 버전을 보게 됩니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
