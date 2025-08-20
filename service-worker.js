// Service Worker for HAIRGATOR PWA - 강력한 캐시 무효화 버전
// 사용자가 항상 최신 버전을 보도록 보장

const CACHE_NAME = 'hairgator-v1.4.1'; // 🔥 New 시스템 + 강력한 업데이트
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.4.1';

// 기본 캐시 파일들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/petal.png'
];

// 🚫 절대 캐시하지 않을 파일들 (항상 최신 버전)
const NO_CACHE_PATTERNS = [
  /\/admin\.html$/,
  /\/migration\.html$/,
  /\/js\/firebase-config\.js$/,
  /\?.*admin/,
  /\/admin\//,
  /firestore\.googleapis\.com/,
  /firebasestorage\.googleapis\.com/
];

// 🔄 실시간 업데이트 필요한 패턴들 (New 표시 시스템)
const REALTIME_PATTERNS = [
  /\/api\/hairstyles/,
  /\/api\/styles/,
  /createdAt/,
  /new-styles/
];

// 🚀 설치 - 즉시 활성화로 기존 문제 해결
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중... (강제 업데이트 버전)');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 캐시 생성:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🚀 즉시 활성화 (기존 버전 무시)');
        return self.skipWaiting(); // 🔥 즉시 활성화 - 기존 문제 해결!
      })
      .catch(error => {
        console.error('❌ 캐시 설치 실패:', error);
      })
  );
});

// 🔄 활성화 - 이전 캐시 완전 삭제 + 즉시 적용
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 - 이전 버전 완전 제거');
  
  event.waitUntil(
    Promise.all([
      // 🗑️ 모든 이전 캐시 삭제
      caches.keys().then(cacheNames => {
        console.log('🔍 기존 캐시들:', cacheNames);
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 🎯 모든 클라이언트 즉시 제어
      self.clients.claim().then(() => {
        console.log('✅ 모든 탭 새 버전 적용');
        
        // 🔄 모든 클라이언트에게 새로고침 명령
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'FORCE_RELOAD', // 🔥 강제 새로고침
              version: CACHE_NAME,
              message: '새 버전이 적용되었습니다!'
            });
          });
        });
      })
    ])
  );
});

// 📡 Fetch 이벤트 - 스마트 캐시 전략
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }
  
  const requestUrl = new URL(event.request.url);
  
  // 🚫 다른 도메인 요청 무시 (Firebase 제외)
  if (requestUrl.origin !== location.origin && !requestUrl.hostname.includes('firebase')) {
    return;
  }

  // 🔥 New 표시 시스템: 실시간 업데이트 필요
  const needsRealtime = REALTIME_PATTERNS.some(pattern => 
    pattern.test(requestUrl.href) || pattern.test(requestUrl.pathname)
  );

  if (needsRealtime) {
    console.log('⚡ 실시간 데이터:', requestUrl.pathname);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 성공 시 백그라운드 캐시 업데이트
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 실패 시 캐시에서 가져오기
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 🚫 Admin/개발 파일들 - 절대 캐시 안함
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname) || pattern.test(requestUrl.hostname)
  );
  
  if (shouldNotCache) {
    console.log('🚫 캐시 제외 (항상 최신):', requestUrl.pathname);
    event.respondWith(
      fetch(event.request.url + '?nocache=' + Date.now(), {
        cache: 'no-store', // 🔥 캐시 완전 무시
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .catch(() => {
        return new Response('파일 로드 실패', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }
  
  // 📦 일반 파일들 - Cache First with Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('📦 캐시에서 로드:', requestUrl.pathname);
          
          // 🔄 백그라운드에서 최신 버전 확인
          fetch(event.request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, fetchResponse);
              });
            }
          }).catch(() => {
            // 백그라운드 업데이트 실패는 무시
          });
          
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        console.log('🌐 네트워크에서 로드:', requestUrl.pathname);
        return fetch(event.request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // 캐시에 저장
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return fetchResponse;
        });
      })
      .catch(error => {
        console.error('🌐 네트워크 오류:', error);
        
        // 오프라인 시 기본 페이지
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

// 📨 메시지 처리
self.addEventListener('message', event => {
  // 🧹 캐시 완전 삭제
  if (event.data && event.data.type === 'CLEAR_ALL_CACHE') {
    console.log('🧹 모든 캐시 삭제 요청');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({success: true});
    });
  }
  
  // 🔄 New 표시 강제 업데이트
  if (event.data && event.data.type === 'REFRESH_NEW_BADGES') {
    console.log('🔄 New 표시 강제 업데이트');
    caches.open(DYNAMIC_CACHE).then(cache => {
      cache.keys().then(keys => {
        keys.forEach(key => {
          if (key.url.includes('firestore') || key.url.includes('hairstyles')) {
            cache.delete(key);
          }
        });
      });
    });
    event.ports[0].postMessage({success: true});
  }
});

// 🕒 주기적 캐시 검증 (30분마다)
setInterval(() => {
  console.log('🔍 캐시 상태 검증');
  caches.keys().then(cacheNames => {
    console.log('현재 캐시들:', cacheNames);
    
    // 오래된 캐시 정리
    cacheNames.forEach(cacheName => {
      if (!cacheName.includes('v1.4') && cacheName.startsWith('hairgator')) {
        console.log('🗑️ 오래된 캐시 삭제:', cacheName);
        caches.delete(cacheName);
      }
    });
  });
}, 30 * 60 * 1000);

console.log('🌸 HAIRGATOR Service Worker 로드 완료 (v1.4.1 - 강력한 업데이트 보장)');
