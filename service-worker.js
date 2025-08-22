// HAIRGATOR Service Worker - 캐시 버전 관리 강화
const CACHE_VERSION = 'v2.1.0'; // 버전 업그레이드
const STATIC_CACHE = `hairgator-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hairgator-dynamic-${CACHE_VERSION}`;

// 정적 리소스 (강제 캐시)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/firebase-config.js',
  '/js/main.js',
  '/js/error-handler.js',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 즉시 업데이트가 필요한 파일들 (항상 네트워크 우선)
const NETWORK_FIRST_PATTERNS = [
  /\/js\/main\.js$/,
  /\/js\/firebase-config\.js$/,
  /\/css\/main\.css$/,
  /\/index\.html$/
];

// 캐시하지 않을 파일들
const NO_CACHE_PATTERNS = [
  /\/admin\.html$/,
  /\/migration\.html$/,
  /\/pages\//,
  /\?.*admin/,
  /\/admin\//
];

// 동적 캐시 제한
const DYNAMIC_CACHE_LIMIT = 50;

// Install - 정적 리소스 미리 캐시
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('✅ 정적 리소스 캐시 중...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('❌ 정적 캐시 실패:', error);
      })
  );
});

// Activate - 이전 캐시 정리
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - 개선된 캐시 전략
self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  
  // GET 요청만 처리
  if (request.method !== 'GET') return;
  
  // 동일 오리진만 처리
  if (requestUrl.origin !== location.origin) return;
  
  // Admin 파일은 캐시하지 않음
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname)
  );
  
  if (shouldNotCache) {
    console.log('🚫 캐시 제외:', requestUrl.pathname);
    event.respondWith(
      fetch(request).catch(() => 
        new Response('Admin 파일 로드 실패', {
          status: 503,
          statusText: 'Service Unavailable'
        })
      )
    );
    return;
  }
  
  // 🆕 중요 파일들은 네트워크 우선 (최신 버전 보장)
  const shouldNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname)
  );
  
  if (shouldNetworkFirst) {
    console.log('🌐 네트워크 우선:', requestUrl.pathname);
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
                console.log('💾 네트워크 우선 파일 캐시 업데이트:', requestUrl.pathname);
              });
          }
          return response;
        })
        .catch(() => {
          console.log('📦 네트워크 실패, 캐시 사용:', requestUrl.pathname);
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || new Response('파일 로드 실패', { status: 503 });
            });
        })
    );
    return;
  }
  
  // 나머지 정적 리소스 (Cache First)
  if (STATIC_ASSETS.includes(requestUrl.pathname) || requestUrl.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('📦 정적 캐시에서 로드:', requestUrl.pathname);
            return response;
          }
          
          console.log('🌐 정적 리소스 네트워크 로드:', requestUrl.pathname);
          return fetch(request)
            .then(fetchResponse => {
              if (fetchResponse && fetchResponse.status === 200) {
                const responseToCache = fetchResponse.clone();
                caches.open(STATIC_CACHE)
                  .then(cache => cache.put(request, responseToCache));
              }
              return fetchResponse;
            });
        })
        .catch(() => {
          if (requestUrl.pathname === '/' || requestUrl.pathname.endsWith('.html')) {
            return caches.match('/index.html');
          }
          return new Response('오프라인', { status: 503 });
        })
    );
    return;
  }
  
  // 동적 리소스 처리 (Network First + Cache Fallback)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
              limitCacheSize(DYNAMIC_CACHE, 50);
            });
          
          console.log('🌐 동적 리소스 네트워크 + 캐시:', requestUrl.pathname);
        }
        return response;
      })
      .catch(() => {
        console.log('📦 동적 캐시에서 로드:', requestUrl.pathname);
        return caches.match(request)
          .then(response => {
            return response || new Response('오프라인', { 
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// 캐시 크기 제한 함수
async function limitCacheSize(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > limit) {
    const keysToDelete = keys.slice(0, keys.length - limit);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`🧹 동적 캐시 정리: ${keysToDelete.length}개 항목 삭제`);
  }
}

// 백그라운드 동기화 (PWA 고급 기능)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 백그라운드 동기화 실행');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // 오프라인 중 저장된 데이터 동기화 로직
  try {
    // 실제 구현 시 IndexedDB에서 미동기화 데이터 가져와서 처리
    console.log('✅ 백그라운드 동기화 완료');
  } catch (error) {
    console.error('❌ 백그라운드 동기화 실패:', error);
  }
}

// 푸시 알림 (PWA 고급 기능)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('📱 푸시 알림 수신:', data);
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'HAIRGATOR', {
        body: data.body || '새로운 스타일이 추가되었습니다!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'hairgator-notification',
        requireInteraction: false,
        actions: [
          {
            action: 'view',
            title: '보기',
            icon: '/icons/icon-72.png'
          }
        ]
      })
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🌸 HAIRGATOR Service Worker 최적화 버전 로드 완료');
