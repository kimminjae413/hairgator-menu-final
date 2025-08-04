// HAIRGATOR PWA Service Worker
const CACHE_NAME = 'hairgator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/index-styles.css',
  '/css/admin-styles.css',
  '/js/firebase-config.js',
  '/js/index-firebase.js',
  '/js/index-customer.js',
  '/js/index-stats.js',
  '/js/index-main.js',
  '/js/admin-main.js'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 열림');
        return cache.addAll(urlsToCache);
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 페치 이벤트
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾으면 반환, 없으면 네트워크 요청
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});