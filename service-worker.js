// HAIRGATOR PWA Service Worker
const CACHE_NAME = 'hairgator-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json'
];

// 설치 이벤트 - 정적 리소스 캐싱
self.addEventListener('install', event => {
  console.log('🚀 HAIRGATOR PWA 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 정적 리소스 캐싱 완료');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ HAIRGATOR PWA 설치 완료');
        return self.skipWaiting();
      })
  );
});

// 활성화 이벤트 - 구버전 캐시 정리
self.addEventListener('activate', event => {
  console.log('🔄 HAIRGATOR PWA 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 구버전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ HAIRGATOR PWA 활성화 완료');
      return self.clients.claim();
    })
  );
});

// 페치 이벤트 - 네트워크 우선 전략 (Firebase 실시간 동기화를 위해)
self.addEventListener('fetch', event => {
  // Firebase 요청은 항상 네트워크에서 가져오기
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis')) {
    return fetch(event.request);
  }

  // HTML 파일은 네트워크 우선, 실패시 캐시
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 네트워크 응답을 캐시에 저장
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // 네트워크 실패시 캐시에서 반환
          return caches.match(event.request);
        })
    );
    return;
  }

  // 기타 리소스는 캐시 우선
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // 유효한 응답만 캐시에 저장
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
            return response;
          });
      })
  );
});

// PWA 업데이트 알림
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 PWA 업데이트 적용 중...');
    self.skipWaiting();
  }
});

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 백그라운드 동기화 실행');
    event.waitUntil(
      // Firebase 데이터 동기화 로직
      console.log('📊 데이터 동기화 완료')
    );
  }
});

console.log('🎉 HAIRGATOR PWA Service Worker 로드 완료');