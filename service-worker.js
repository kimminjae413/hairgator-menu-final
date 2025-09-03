// HAIRGATOR PWA Service Worker - Production Version
const CACHE_NAME = 'hairgator-v3.3.1';
const CACHE_VERSION = '20241201'; // 날짜 기반 버전

// 캐시할 핵심 파일들
const CORE_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/menu.js',
  '/js/password-recovery.js',
  '/js/face-swap-backend.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 런타임 캐시 (사용 중 캐시)
const RUNTIME_CACHE = [
  '/js/', // JS 파일들
  '/css/', // CSS 파일들
  '/icons/' // 아이콘들
];

// 캐시하지 않을 파일들
const NO_CACHE_PATTERNS = [
  /\/admin\.html$/,
  /\/migration\.html$/,
  /\/js\/firebase-config\.js$/,
  /\?.*admin/,
  /\/admin\//,
  /\/test\//,
  /\/debug\//
];

// 설치 이벤트
self.addEventListener('install', event => {
  console.log('[SW] Installing HAIRGATOR Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 핵심 파일 캐시 중...');
        return cache.addAll(CORE_CACHE);
      })
      .then(() => {
        console.log('[SW] 캐시 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch(error => {
        console.error('[SW] 설치 실패:', error);
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 클라이언트 제어권 획득
      self.clients.claim()
    ])
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }
  
  const requestUrl = new URL(event.request.url);
  
  // 같은 도메인만 처리
  if (requestUrl.origin !== location.origin) {
    return;
  }
  
  // Admin 파일들은 캐시 제외 (항상 최신 버전)
  const shouldSkipCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname + requestUrl.search)
  );
  
  if (shouldSkipCache) {
    console.log('[SW] 캐시 제외:', requestUrl.pathname);
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('관리자 파일을 로드할 수 없습니다.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }
  
  // 캐시 우선 전략
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[SW] 캐시에서 제공:', requestUrl.pathname);
          
          // 백그라운드에서 최신 버전 확인 (stale-while-revalidate)
          fetch(event.request)
            .then(fetchResponse => {
              if (fetchResponse && fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
              }
            })
            .catch(() => {}); // 백그라운드 업데이트 실패는 무시
          
          return cachedResponse;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        console.log('[SW] 네트워크에서 로드:', requestUrl.pathname);
        return fetch(event.request)
          .then(fetchResponse => {
            // 유효한 응답이 아니면 그대로 반환
            if (!fetchResponse || 
                fetchResponse.status !== 200 || 
                fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // 런타임 캐시 대상인지 확인
            const shouldCache = RUNTIME_CACHE.some(pattern => 
              requestUrl.pathname.startsWith(pattern)
            ) || CORE_CACHE.includes(requestUrl.pathname);
            
            if (shouldCache) {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  console.log('[SW] 런타임 캐시 저장:', requestUrl.pathname);
                });
            }
            
            return fetchResponse;
          })
          .catch(error => {
            console.error('[SW] 네트워크 오류:', error);
            
            // 오프라인 시 대체 응답
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // 기본 오프라인 응답
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// 메시지 처리 (캐시 관리)
self.addEventListener('message', event => {
  const { data } = event;
  
  switch (data.type) {
    case 'CLEAR_CACHE':
      console.log('[SW] 캐시 수동 정리 요청');
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('[SW] 캐시 정리 완료');
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          console.error('[SW] 캐시 정리 실패:', error);
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    case 'GET_CACHE_SIZE':
      caches.open(CACHE_NAME)
        .then(cache => cache.keys())
        .then(keys => {
          event.ports[0].postMessage({ 
            success: true, 
            count: keys.length,
            version: CACHE_VERSION
          });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    case 'UPDATE_CACHE':
      console.log('[SW] 캐시 업데이트 요청');
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(CORE_CACHE))
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    default:
      console.log('[SW] 알 수 없는 메시지:', data.type);
      event.ports[0].postMessage({ success: false, error: 'Unknown message type' });
  }
});

// 에러 처리
self.addEventListener('error', event => {
  console.error('[SW] Service Worker 오류:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});

console.log('🦎 HAIRGATOR Service Worker v' + CACHE_VERSION + ' 로드 완료');

// 주기적인 캐시 정리 (24시간마다)
const CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

setInterval(() => {
  console.log('[SW] 주기적 캐시 정리 실행');
  
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      if (cacheName !== CACHE_NAME) {
        caches.delete(cacheName);
        console.log('[SW] 오래된 캐시 삭제:', cacheName);
      }
    });
  });
}, CACHE_CLEANUP_INTERVAL);









































