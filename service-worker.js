// Service Worker 버전
const CACHE_NAME = 'hairgator-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/login.css',
    '/css/menu.css',
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/menu.js',
    '/js/main.js',
    '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch 이벤트
self.addEventListener('fetch', event => {
    // Firebase 요청은 캐시하지 않음
    if (event.request.url.includes('firebaseapp.com') || 
        event.request.url.includes('googleapis.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 캐시에 있으면 캐시 응답
                if (response) {
                    return response;
                }
                
                // 없으면 네트워크 요청
                return fetch(event.request).then(response => {
                    // 유효한 응답이 아니면 그대로 반환
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // 응답 복제
                    const responseToCache = response.clone();
                    
                    // 캐시에 저장
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // 오프라인일 때 기본 페이지 반환
                return caches.match('/index.html');
            })
    );
});

// 푸시 알림 (추후 구현)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : '새로운 알림이 있습니다',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification('HAIRGATOR', options)
    );
});

console.log('Service Worker loaded');