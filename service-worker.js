// ✅ 자동 캐시 버전 관리 Service Worker
// 매번 배포할 때마다 자동으로 새 버전 생성!

// 🎯 방법 1: 타임스탬프 자동 생성 (가장 간단)
const CACHE_NAME = `hairgator-${Date.now()}`;
const DYNAMIC_CACHE = `hairgator-dynamic-${Date.now()}`;

// 🎯 방법 2: 빌드 시간 환경변수 사용 (더 정교함)
// const CACHE_NAME = `hairgator-${process.env.BUILD_TIME || Date.now()}`;

// 기본 캐시할 파일들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/admin.html',
  '/migration.html'
];

// 캐시하지 않을 파일들
const noCachePatterns = [
  /backgrounds\/.*\.css$/,  // 배경 CSS 파일들
  /\.js\.map$/,             // 소스맵 파일들
  /hot-update/,             // 핫 리로드 파일들
];

// 🔧 자동 업데이트 감지 및 알림
self.addEventListener('install', event => {
  console.log('🚀 새 Service Worker 설치 중...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 새 캐시 생성:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ 모든 파일 캐시 완료');
        // 즉시 활성화 (새 버전 바로 적용)
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ 캐시 설치 실패:', error);
      })
  );
});

// 🔄 이전 버전 캐시 자동 정리
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker 활성화 중...', CACHE_NAME);
  
  event.waitUntil(
    Promise.all([
      // 이전 캐시들 모두 삭제
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 모든 클라이언트에게 즉시 새 버전 적용
      self.clients.claim().then(() => {
        // 🎉 모든 탭에 새 버전 알림
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NEW_VERSION_AVAILABLE',
              version: CACHE_NAME
            });
          });
        });
      })
    ])
  );
  
  console.log('✅ Service Worker 활성화 완료!');
});

// 📡 메시지 처리 (클라이언트와 통신)
self.addEventListener('message', event => {
  console.log('📨 메시지 수신:', event.data);
  
  if (event.data && event.data.type === 'GET_VERSION') {
    // 현재 버전 정보 전송
    event.ports[0].postMessage({ 
      version: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🌐 Fetch 이벤트 (기존과 동일하지만 더 스마트하게)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
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
    console.log('🚫 캐시 제외:', url.pathname);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Firebase 관련 요청은 캐시하지 않음
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 일반 파일들 스마트 캐시 처리
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾으면 반환
        if (response) {
          console.log('📦 캐시 적중:', url.pathname);
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        console.log('🌐 네트워크 요청:', url.pathname);
        return fetch(event.request).then(fetchResponse => {
          // 유효하지 않은 응답은 캐시하지 않음
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          // 응답 복사해서 캐시에 저장
          const responseToCache = fetchResponse.clone();
          
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              console.log('💾 동적 캐시 저장:', url.pathname);
              cache.put(event.request, responseToCache);
            })
            .catch(error => {
              console.warn('⚠️ 캐시 저장 실패:', error);
            });
          
          return fetchResponse;
        });
      })
      .catch(error => {
        console.error('❌ Fetch 실패:', error);
        
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

console.log('🌸 HAIRGATOR Service Worker 로드 완료 - 자동 버전 관리!', CACHE_NAME);
