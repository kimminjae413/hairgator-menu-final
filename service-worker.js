// Service Worker for HAIRGATOR PWA (Admin 캐시 제외 버전)
const CACHE_NAME = 'hairgator-v1.1.0'; // 버전 업데이트
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // admin.html은 의도적으로 제외
];

// 캐시하지 않을 파일들 (Admin 및 개발 파일)
const NO_CACHE_PATTERNS = [
  /\/admin\.html$/,           // admin.html
  /\/migration\.html$/,       // migration.html  
  /\/js\/firebase-config\.js$/, // firebase config
  /\?.*admin/,                // admin 관련 쿼리
  /\/admin\//                 // admin 폴더
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 캐시 열기 성공');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ 캐시 설치 실패:', error);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Admin 파일 캐시 제외
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== location.origin) {
    return;
  }
  
  // Admin 파일들은 캐시하지 않음 (항상 최신 버전)
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname)
  );
  
  if (shouldNotCache) {
    console.log('🚫 캐시 제외:', requestUrl.pathname);
    // Admin 파일은 항상 네트워크에서 가져오기
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 네트워크 실패 시에도 캐시 사용하지 않음
          return new Response('Admin 파일 로드 실패', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }
  
  // 일반 파일들은 기존 캐시 전략 사용
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시된 버전이 있으면 반환, 없으면 네트워크에서 가져오기
        if (response) {
          console.log('📦 캐시에서 로드:', requestUrl.pathname);
          return response;
        }
        
        console.log('🌐 네트워크에서 로드:', requestUrl.pathname);
        return fetch(event.request).then(fetchResponse => {
          // 유효한 응답인지 확인
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // 응답 복사 후 캐시에 저장
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
              console.log('💾 캐시에 저장:', requestUrl.pathname);
            });
          
          return fetchResponse;
        });
      })
      .catch(error => {
        console.error('🌐 네트워크 오류:', error);
        
        // 오프라인 시 기본 페이지 반환
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('오프라인', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// 메시지 리스너 (캐시 수동 삭제 등)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_ADMIN_CACHE') {
    console.log('🧹 Admin 캐시 수동 정리 요청');
    // Admin 관련 캐시만 삭제하는 로직 추가 가능
    event.ports[0].postMessage({success: true});
  }
});

console.log('🌸 HAIRGATOR Service Worker 로드 완료 (Admin 캐시 제외 버전)');
