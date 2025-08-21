// Service Worker for HAIRGATOR PWA - 업데이트 알림 시스템 포함
const CACHE_NAME = 'hairgator-v2.0.0';
const DYNAMIC_CACHE = 'hairgator-dynamic-v2.0.0';

// 업데이트 감지를 위한 버전 정보
const APP_VERSION = '2.0.0';
const UPDATE_CHECK_INTERVAL = 30000;

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
  
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v' + APP_VERSION + ' 활성화 중...');
  
  event.waitUntil(
    Promise.all([
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
      self.clients.claim()
    ])
  );
  
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

// 업데이트 체크 메시지 리스너
self.addEventListener('message', event => {
  if (event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: APP_VERSION,
      cacheNames: [CACHE_NAME, DYNAMIC_CACHE]
    });
  }
  
  if (event.data.type === 'FORCE_UPDATE') {
    console.log('🔄 강제 업데이트 요청 받음');
    
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
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

console.log('🌸 HAIRGATOR Service Worker v' + APP_VERSION + ' 로드 완료');
