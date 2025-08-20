// Service Worker for HAIRGATOR PWA - 즉시 업데이트 보장 버전
// 네틀리파이 배포 시 사용자가 바로 새 버전을 볼 수 있도록 최적화

const CACHE_NAME = 'hairgator-v1.5.0'; // 🚀 즉시 업데이트 버전
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.5.0';

// 기본 캐시 파일들 (최소한으로 제한)
const urlsToCache = [
  '/',
  '/manifest.json'
  // index.html은 캐시하지 않음 (항상 최신 버전)
];

// 🚫 절대 캐시하지 않을 파일들 (즉시 업데이트 위해)
const NO_CACHE_PATTERNS = [
  /\/index\.html$/,           // 메인 HTML (항상 최신)
  /\/admin\.html$/,           // 어드민 페이지
  /\/migration\.html$/,       // 마이그레이션 페이지
  /\/js\/firebase-config\.js$/, // Firebase 설정
  /\?.*admin/,                // Admin 쿼리
  /\/admin\//,                // Admin 폴더
  /firestore\.googleapis\.com/, // Firebase API
  /firebasestorage\.googleapis\.com/,
  /\/service-worker\.js$/     // Service Worker 자체
];

// 🔄 실시간 업데이트 패턴들
const REALTIME_PATTERNS = [
  /\/api\/hairstyles/,
  /\/api\/styles/,
  /createdAt/,
  /new-styles/,
  /\.js$/,                    // 모든 JavaScript 파일
  /\.css$/                    // 모든 CSS 파일
];

// 🚀 설치 - 기존 버전 즉시 대체
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중... (즉시 업데이트 버전)');
  
  event.waitUntil(
    Promise.all([
      // 기본 캐시 설정
      caches.open(CACHE_NAME).then(cache => {
        console.log('✅ 새 캐시 생성:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      }),
      
      // 🔥 즉시 활성화 (기존 SW 건너뛰기)
      self.skipWaiting()
    ])
    .then(() => {
      console.log('🚀 새 Service Worker 즉시 활성화');
    })
    .catch(error => {
      console.error('❌ Service Worker 설치 실패:', error);
    })
  );
});

// 🔄 활성화 - 이전 캐시 완전 삭제 + 모든 클라이언트 즉시 적용
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 - 즉시 업데이트 적용');
  
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
      
      // 🎯 모든 클라이언트 즉시 제어 시작
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ 모든 탭에 새 버전 적용 시작');
      
      // 🔄 모든 클라이언트에게 강제 새로고침 명령
      return self.clients.matchAll().then(clients => {
        console.log('📱 활성 클라이언트 수:', clients.length);
        
        clients.forEach(client => {
          console.log('📨 클라이언트에게 새로고침 명령:', client.url);
          client.postMessage({
            type: 'FORCE_RELOAD',
            version: CACHE_NAME,
            message: '새 버전이 적용되었습니다!',
            timestamp: Date.now()
          });
        });
      });
    })
  );
});

// 📡 Fetch 이벤트 - 즉시 업데이트 우선 전략
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

  // 🔥 캐시하지 않을 파일들 - 항상 네트워크에서 최신 버전
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => 
    pattern.test(requestUrl.pathname) || pattern.test(requestUrl.hostname)
  );
  
  if (shouldNotCache) {
    console.log('🔄 항상 최신 버전:', requestUrl.pathname);
    event.respondWith(
      fetch(event.request.url + '?v=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      .catch(() => {
        console.log('❌ 네트워크 오류, 오프라인 응답:', requestUrl.pathname);
        return new Response('네트워크 연결을 확인해주세요', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }
  
  // ⚡ 실시간 업데이트 필요한 파일들 - 네트워크 우선
  const needsRealtime = REALTIME_PATTERNS.some(pattern => 
    pattern.test(requestUrl.href) || pattern.test(requestUrl.pathname)
  );

  if (needsRealtime) {
    console.log('⚡ 실시간 업데이트:', requestUrl.pathname);
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
          console.log('⚡ 네트워크 실패, 캐시 사용:', requestUrl.pathname);
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 📦 일반 파일들 - 네트워크 우선, 캐시 백업
  event.respondWith(
    fetch(event.request)
      .then(response => {
        console.log('🌐 네트워크에서 로드:', requestUrl.pathname);
        
        // 성공 시 캐시에 저장
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        console.log('📦 네트워크 실패, 캐시에서 로드:', requestUrl.pathname);
        
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // 문서 요청이면 메인 페이지로
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          
          return new Response('오프라인', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// 📨 메시지 처리
self.addEventListener('message', event => {
  console.log('📨 Service Worker 메시지 수신:', event.data);
  
  // 🧹 오래된 캐시 삭제
  if (event.data && event.data.type === 'CLEAR_OLD_CACHE') {
    console.log('🧹 오래된 캐시 삭제 시작');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes('v1.5') && cacheName.startsWith('hairgator')) {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({success: true});
      }
    });
  }
  
  // 🔄 강제 업데이트
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('🔄 강제 업데이트 요청');
    
    // 모든 캐시 삭제
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }).then(() => {
      // 모든 클라이언트에게 새로고침 명령
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FORCE_RELOAD',
          message: '강제 업데이트 완료!'
        });
      });
    });
  }
});

// 🕒 정기적 업데이트 체크 (1분마다)
setInterval(() => {
  console.log('🔍 정기 업데이트 체크');
  
  // 자체 업데이트 체크
  self.registration.update().then(() => {
    console.log('✅ Service Worker 업데이트 체크 완료');
  }).catch(error => {
    console.log('❌ 업데이트 체크 실패:', error);
  });
  
}, 60 * 1000); // 1분마다

console.log('🌸 HAIRGATOR Service Worker v1.5.0 로드 완료 (즉시 업데이트 보장)');
