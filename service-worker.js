// ============ HAIRGATOR Service Worker (v3.1-FINAL) ============
// 장기 사용자를 위한 완벽한 캐시 관리 시스템

const CACHE_VERSION = '3.1.0';
const CACHE_NAME = `hairgator-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hairgator-dynamic-v${CACHE_VERSION}`;
const STATIC_CACHE = `hairgator-static-v${CACHE_VERSION}`;

// 🎯 캐시 전략별 분류 (더 세밀한 제어)
const CACHE_STRATEGIES = {
  // 절대 캐시하지 않음 (항상 최신 버전)
  NETWORK_ONLY: [
    /\.firebaseapp\.com/,
    /firebasestorage\.googleapis\.com/,
    /\.firebasestorage\.app/,
    /googleapis\.com/,
    /gstatic\.com/,
    /akool-proxy/,
    /akool-token/,
    /admin\.html$/,
    /migration\.html$/,
    /service-worker\.js$/,
    /\.netlify\/functions\//,
    /firebase-config\.js$/
  ],
  
  // 캐시 우선, 실패시 네트워크 (정적 리소스)
  CACHE_FIRST: [
    /\.js$/,
    /\.css$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.svg$/,
    /\.ico$/,
    /\.webp$/,
    /\/icons\//,
    /petal\.png$/,
    /\.woff2?$/,
    /\.ttf$/,
    /\.eot$/
  ],
  
  // 네트워크 우선, 실패시 캐시 (동적 콘텐츠)
  NETWORK_FIRST: [
    /\.html$/,
    /\/$/, // 루트 경로
    /\/[^.]*$/, // 확장자 없는 경로
    /manifest\.json$/
  ]
};

// 🔧 유틸리티 함수들
function getStrategy(url) {
  const urlString = url.toString();
  
  // 우선순위: NETWORK_ONLY > CACHE_FIRST > NETWORK_FIRST
  if (CACHE_STRATEGIES.NETWORK_ONLY.some(pattern => pattern.test(urlString))) {
    return 'NETWORK_ONLY';
  }
  if (CACHE_STRATEGIES.CACHE_FIRST.some(pattern => pattern.test(urlString))) {
    return 'CACHE_FIRST';
  }
  if (CACHE_STRATEGIES.NETWORK_FIRST.some(pattern => pattern.test(urlString))) {
    return 'NETWORK_FIRST';
  }
  return 'NETWORK_FIRST'; // 안전한 기본값
}

function isValidResponse(response) {
  return response && 
         response.status >= 200 && 
         response.status < 300 && 
         (response.type === 'basic' || response.type === 'cors');
}

function getCacheForRequest(url) {
  // 정적 리소스는 STATIC_CACHE, 나머지는 DYNAMIC_CACHE
  const urlString = url.toString();
  if (CACHE_STRATEGIES.CACHE_FIRST.some(pattern => pattern.test(urlString))) {
    return STATIC_CACHE;
  }
  return DYNAMIC_CACHE;
}

async function addToCache(request, response) {
  try {
    const url = new URL(request.url);
    const cacheName = getCacheForRequest(url);
    const cache = await caches.open(cacheName);
    
    console.log(`💾 캐시 저장 [${cacheName}]:`, url.pathname);
    await cache.put(request, response);
  } catch (error) {
    console.warn('⚠️ 캐시 저장 실패:', error);
  }
}

// 🚀 Install Event - 핵심 파일들만 캐시
self.addEventListener('install', event => {
  console.log('🔧 Service Worker v' + CACHE_VERSION + ' 설치 중...');
  
  // 필수 파일들만 미리 캐시
  const essentialFiles = [
    '/',
    '/manifest.json'
  ];
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 기본 캐시 생성');
        return cache.addAll(essentialFiles);
      })
      .catch(error => {
        console.error('❌ 기본 캐시 생성 실패:', error);
        // 실패해도 설치는 계속 진행
      })
  );
  
  // 즉시 활성화 (기존 SW를 대체)
  self.skipWaiting();
});

// 🔄 Activate Event - 스마트 캐시 정리
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v' + CACHE_VERSION + ' 활성화 중...');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시만 선별 삭제
      caches.keys().then(cacheNames => {
        const currentCaches = [CACHE_NAME, DYNAMIC_CACHE, STATIC_CACHE];
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('hairgator-') && 
                   !currentCaches.includes(cacheName);
          })
          .map(cacheName => {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      }),
      
      // 모든 클라이언트에서 새 SW 활성화
      self.clients.claim()
    ])
  );
  
  // 클라이언트들에게 업데이트 완료 알림 (부드럽게)
  setTimeout(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          version: CACHE_VERSION,
          message: '새 버전으로 업데이트되었습니다.'
        });
      });
    });
  }, 1500);
});

// 🌐 Fetch Event - 똑똑한 캐시 전략
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // GET 요청과 같은 도메인만 처리
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  
  const strategy = getStrategy(url);
  
  switch (strategy) {
    case 'NETWORK_ONLY':
      event.respondWith(networkOnly(request));
      break;
      
    case 'CACHE_FIRST':
      event.respondWith(cacheFirst(request));
      break;
      
    case 'NETWORK_FIRST':
      event.respondWith(networkFirst(request));
      break;
      
    default:
      event.respondWith(networkFirst(request));
  }
});

// 📶 네트워크 전용 (캐시 완전 제외)
async function networkOnly(request) {
  try {
    const url = new URL(request.url);
    console.log('🌐 네트워크 전용:', url.pathname);
    
    const response = await fetch(request, {
      cache: 'no-store' // 브라우저 캐시도 제외
    });
    
    return response;
  } catch (error) {
    console.error('❌ 네트워크 전용 요청 실패:', error);
    
    // 네트워크 오류 시 기본 오프라인 페이지나 오류 응답 반환
    return new Response('네트워크 연결을 확인해주세요.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 💾 캐시 우선 전략 (정적 리소스용)
async function cacheFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 캐시에서 먼저 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 히트:', url.pathname);
      
      // 백그라운드에서 캐시 갱신 (stale-while-revalidate)
      fetch(request).then(networkResponse => {
        if (isValidResponse(networkResponse)) {
          addToCache(request, networkResponse.clone());
        }
      }).catch(() => {
        // 백그라운드 갱신 실패는 무시
      });
      
      return cachedResponse;
    }
    
    // 2. 캐시에 없으면 네트워크에서 가져오기
    console.log('🌐 네트워크 요청:', url.pathname);
    const networkResponse = await fetch(request);
    
    if (isValidResponse(networkResponse)) {
      // 캐시에 저장
      addToCache(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ 캐시 우선 전략 실패:', url.pathname, error);
    
    // 마지막 시도: 캐시에서 다시 확인
    const fallbackResponse = await caches.match(request);
    if (fallbackResponse) {
      console.log('🆘 캐시 폴백 사용:', url.pathname);
      return fallbackResponse;
    }
    
    throw error;
  }
}

// 🌐 네트워크 우선 전략 (동적 콘텐츠용)
async function networkFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 네트워크에서 먼저 시도 (타임아웃 적용)
    console.log('🌐 네트워크 우선:', url.pathname);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (isValidResponse(networkResponse)) {
      // 성공시 캐시 업데이트
      addToCache(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('⚠️ 네트워크 실패 또는 타임아웃, 캐시 시도:', url.pathname);
    
    // 2. 네트워크 실패/타임아웃시 캐시에서 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 폴백 사용:', url.pathname);
      return cachedResponse;
    }
    
    console.error('❌ 네트워크와 캐시 모두 실패:', url.pathname, error);
    
    // HTML 요청의 경우 기본 오프라인 페이지 반환
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html><head><title>오프라인</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>🌐 인터넷 연결 없음</h1>
          <p>네트워크 연결을 확인하고 다시 시도해주세요.</p>
          <button onclick="location.reload()">다시 시도</button>
        </body></html>
      `, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    throw error;
  }
}

// 📨 메시지 처리 시스템
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      // 즉시 활성화
      self.skipWaiting();
      break;
      
    case 'CHECK_VERSION':
      // 버전 정보 응답
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: CACHE_VERSION,
          caches: {
            main: CACHE_NAME,
            dynamic: DYNAMIC_CACHE,
            static: STATIC_CACHE
          }
        });
      }
      break;
      
    case 'CLEAR_ALL_CACHE':
      event.waitUntil(handleClearAllCache());
      break;
      
    case 'UPDATE_CACHE':
      event.waitUntil(handleUpdateCache());
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(handleGetCacheSize(event));
      break;
      
    default:
      console.log('📨 알 수 없는 메시지:', type);
  }
});

// 🧹 모든 캐시 삭제
async function handleClearAllCache() {
  console.log('🧹 모든 캐시 삭제 요청');
  
  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
      .filter(name => name.startsWith('hairgator-'))
      .map(name => caches.delete(name));
    
    await Promise.all(deletePromises);
    
    // 클라이언트에게 완료 알림
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_CLEARED',
        version: CACHE_VERSION,
        message: '모든 캐시가 정리되었습니다.'
      });
    });
    
    console.log('✅ 모든 캐시 삭제 완료');
    
  } catch (error) {
    console.error('❌ 캐시 삭제 실패:', error);
  }
}

// 🔄 캐시 업데이트
async function handleUpdateCache() {
  console.log('🔄 캐시 업데이트 요청');
  
  try {
    // 핵심 파일들만 강제 업데이트
    const importantFiles = ['/', '/manifest.json', '/js/main.js'];
    const cache = await caches.open(CACHE_NAME);
    
    for (const file of importantFiles) {
      try {
        const response = await fetch(file, { cache: 'no-cache' });
        if (isValidResponse(response)) {
          await cache.put(file, response);
          console.log('🔄 캐시 업데이트:', file);
        }
      } catch (error) {
        console.warn('⚠️ 파일 업데이트 실패:', file, error);
      }
    }
    
    // 클라이언트에게 완료 알림
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        version: CACHE_VERSION,
        message: '캐시가 최신 버전으로 업데이트되었습니다.'
      });
    });
    
  } catch (error) {
    console.error('❌ 캐시 업데이트 실패:', error);
  }
}

// 📊 캐시 크기 조회
async function handleGetCacheSize(event) {
  try {
    const cacheNames = await caches.keys();
    const sizes = {};
    
    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('hairgator-')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        sizes[cacheName] = requests.length;
      }
    }
    
    // 클라이언트에게 응답
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_SIZE_INFO',
        version: CACHE_VERSION,
        sizes: sizes
      });
    });
    
  } catch (error) {
    console.error('❌ 캐시 크기 조회 실패:', error);
  }
}

// 🔍 주기적 캐시 정리 (Background Sync)
self.addEventListener('sync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup());
  }
});

async function performCacheCleanup() {
  console.log('🧹 주기적 캐시 정리 시작');
  
  try {
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const requests = await dynamicCache.keys();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
    
    let cleanedCount = 0;
    
    for (const request of requests) {
      try {
        const response = await dynamicCache.match(request);
        const dateHeader = response?.headers.get('date');
        
        if (dateHeader) {
          const cacheDate = new Date(dateHeader).getTime();
          if ((now - cacheDate) > maxAge) {
            await dynamicCache.delete(request);
            cleanedCount++;
          }
        }
      } catch (error) {
        // 개별 항목 정리 실패는 무시
      }
    }
    
    console.log(`✅ 캐시 정리 완료: ${cleanedCount}개 항목 삭제`);
    
  } catch (error) {
    console.error('❌ 주기적 캐시 정리 실패:', error);
  }
}

// 📈 성능 모니터링 및 디버그 정보
console.log('🌸 HAIRGATOR Service Worker v' + CACHE_VERSION + ' 로드 완료');
console.log('📋 캐시 전략 설정:', {
  'NETWORK_ONLY': CACHE_STRATEGIES.NETWORK_ONLY.length + '개 패턴',
  'CACHE_FIRST': CACHE_STRATEGIES.CACHE_FIRST.length + '개 패턴', 
  'NETWORK_FIRST': CACHE_STRATEGIES.NETWORK_FIRST.length + '개 패턴'
});
console.log('🗂️ 캐시 구조:', {
  'Main Cache': CACHE_NAME,
  'Dynamic Cache': DYNAMIC_CACHE,
  'Static Cache': STATIC_CACHE
});
