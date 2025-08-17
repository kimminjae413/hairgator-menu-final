// Service Worker for HAIRGATOR PWA - 벚꽃 시스템 최적화 버전
const CACHE_NAME = 'hairgator-v1.1.0'; // 버전 업데이트
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.1.0';

// 기본 캐시할 파일들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/admin.html',
  '/migration.html'
];

// 캐시하지 않을 파일들 (벚꽃 CSS 등 동적 생성 파일)
const noCachePatterns = [
  /backgrounds\/.*\.css$/,  // 배경 CSS 파일들
  /\.js\.map$/,             // 소스맵 파일들
  /hot-update/,             // 핫 리로드 파일들
];

// 개발 모드 감지
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Install Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ All files cached successfully');
      })
      .catch(error => {
        console.error('❌ Cache install failed:', error);
      })
  );
  
  // 즉시 활성화 (개발 중 빠른 업데이트)
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 모든 클라이언트 즉시 제어
      self.clients.claim()
    ])
  );
  
  console.log('✅ Service Worker activated');
});

// Fetch Event - 벚꽃 시스템 최적화 버전
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 개발 모드에서는 캐시 비활성화 (벚꽃 개발 중)
  if (isDevelopment) {
    console.log('🛠️ Development mode: bypassing cache for', url.pathname);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // non-GET 요청은 캐시하지 않음
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 외부 요청은 캐시하지 않음
  if (url.origin !== location.origin) {
    return;
  }
  
  // 캐시하지 않을 파일 패턴 확인
  const shouldNotCache = noCachePatterns.some(pattern => pattern.test(url.pathname));
  
  if (shouldNotCache) {
    console.log('🚫 No cache for:', url.pathname);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Firebase 관련 요청은 캐시하지 않음
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 일반 파일들 캐시 처리
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾으면 반환
        if (response) {
          console.log('📦 Cache hit:', url.pathname);
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        console.log('🌐 Network fetch:', url.pathname);
        return fetch(event.request).then(fetchResponse => {
          // 유효하지 않은 응답은 캐시하지 않음
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // 응답 복사해서 캐시에 저장
          const responseToCache = fetchResponse.clone();
          
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              console.log('💾 Caching:', url.pathname);
              cache.put(event.request, responseToCache);
            })
            .catch(error => {
              console.warn('⚠️ Cache put failed:', error);
            });
          
          return fetchResponse;
        });
      })
      .catch(error => {
        console.error('❌ Fetch failed:', error);
        
        // 오프라인일 때 기본 페이지 반환
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// 메시지 이벤트 (벚꽃 캐시 클리어 등)
self.addEventListener('message', event => {
  console.log('📨 Message received:', event.data);
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🧹 Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ All caches cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 에러 핸들링
self.addEventListener('error', event => {
  console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});

console.log('🌸 HAIRGATOR Service Worker loaded - Sakura optimized!');

