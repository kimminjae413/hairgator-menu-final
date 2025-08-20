// Service Worker for HAIRGATOR PWA - Firebase Storage CORS 문제 해결 버전
const CACHE_NAME = 'hairgator-v1.5.1'; // 🔥 CORS 문제 해결 버전
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.5.1';

// 기본 캐시 파일들 (Firebase Storage 제외)
const urlsToCache = [
  '/',
  '/manifest.json',
  '/petal.png'
];

// 🚫 절대 캐시하지 않을 URL 패턴들
const NO_CACHE_PATTERNS = [
  /firebasestorage\.googleapis\.com/, // Firebase Storage 완전 제외
  /\.firebasestorage\.app/,          // Firebase Storage 도메인
  /googleapis\.com/,                  // Google APIs 전체
  /\/admin\.html$/,                   // Admin 페이지
  /\/migration\.html$/,               // Migration 페이지
  /firebase-config\.js$/              // Firebase Config
];

// 🔧 Firebase Storage 전용 패턴
const FIREBASE_STORAGE_PATTERNS = [
  /firebasestorage\.googleapis\.com/,
  /\.firebasestorage\.app/,
  /storage\.googleapis\.com/
];

// Install Event
self.addEventListener('install', event => {
  console.log('🔧 Service Worker v1.5.1 설치 중... (CORS 문제 해결)');
  
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
  
  // 즉시 활성화
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v1.5.1 활성화 중...');
  
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
  
  // 모든 클라이언트에게 새 버전 알림
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NEW_VERSION_AVAILABLE',
        version: 'v1.5.1 - CORS Fix'
      });
    });
  });
});

// Fetch Event - Firebase Storage CORS 문제 해결
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // GET 요청이 아니면 처리하지 않음
  if (request.method !== 'GET') {
    return;
  }
  
  // 🔥 Firebase Storage 요청은 완전히 무시 (Service Worker 개입 안함)
  const isFirebaseStorage = FIREBASE_STORAGE_PATTERNS.some(pattern => 
    pattern.test(url.href)
  );
  
  if (isFirebaseStorage) {
    console.log('🔥 Firebase Storage 직접 요청 (SW 무시):', url.pathname);
    // Service Worker가 전혀 개입하지 않음 - 브라우저가 직접 처리
    return;
  }
  
  // 캐시 금지 패턴 체크
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(url.href)
  );
  
  if (shouldNotCache) {
    console.log('🚫 캐시 제외 (네트워크 직접):', url.pathname);
    
    event.respondWith(
      fetch(request, {
        cache: 'no-cache' // 브라우저 캐시도 사용하지 않음
      }).catch(() => {
        return new Response('서비스 사용 불가', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }
  
  // 🔄 일반 파일들 - 네트워크 우선 전략
  event.respondWith(
    // 1. 먼저 네트워크에서 시도
    fetch(request, {
      cache: 'no-cache'
    }).then(response => {
      // 성공하면 캐시에 저장 후 반환
      if (response.ok && response.type === 'basic') {
        const responseClone = response.clone();
        
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, responseClone);
          console.log('💾 동적 캐시 저장:', url.pathname);
        });
      }
      
      console.log('🌐 네트워크에서 로드:', url.pathname);
      return response;
      
    }).catch(() => {
      // 2. 네트워크 실패 시 캐시에서 시도
      console.log('📦 캐시에서 시도:', url.pathname);
      
      return caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          console.log('📦 캐시에서 로드:', url.pathname);
          return cachedResponse;
        }
        
        // 3. 둘 다 실패 시 오프라인 응답
        console.log('❌ 오프라인 응답:', url.pathname);
        
        if (request.destination === 'document') {
          return caches.match('/').then(indexResponse => {
            return indexResponse || new Response('오프라인', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        }
        
        return new Response('리소스 사용 불가', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// 🔄 클라이언트 메시지 처리
self.addEventListener('message', event => {
  console.log('📨 메시지 수신:', event.data);
  
  if (event.data.type === 'CLEAR_OLD_CACHE') {
    // 오래된 캐시 정리
    caches.keys().then(cacheNames => {
      const oldCaches = cacheNames.filter(name => 
        name !== CACHE_NAME && name !== DYNAMIC_CACHE
      );
      
      return Promise.all(oldCaches.map(name => caches.delete(name)));
    }).then(() => {
      console.log('🧹 오래된 캐시 정리 완료');
    });
  }
  
  if (event.data.type === 'FORCE_RELOAD') {
    // 강제 새로고침 요청
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FORCE_RELOAD',
          version: 'v1.5.1'
        });
      });
    });
  }
});

// 🎯 주기적 업데이트 체크 (백그라운드)
self.addEventListener('sync', event => {
  if (event.tag === 'background-update') {
    console.log('🔄 백그라운드 업데이트 실행');
    
    event.waitUntil(
      self.registration.update()
    );
  }
});

console.log('🌸 HAIRGATOR Service Worker v1.5.1 로드 완료 (Firebase Storage CORS 문제 해결)');
