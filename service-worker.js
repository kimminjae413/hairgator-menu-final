// ============ HAIRGATOR Service Worker (v3.0 - 안정적 캐시 관리) ============
// 장기 사용자를 위한 안정적인 캐시 관리 시스템

const CACHE_VERSION = '3.0.0';
const CACHE_NAME = `hairgator-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hairgator-dynamic-v${CACHE_VERSION}`;

// 🎯 캐시 전략별 분류
const CACHE_STRATEGIES = {
  // 절대 캐시하지 않음 (항상 최신 버전)
  NETWORK_ONLY: [
    /\.firebaseapp\.com/,
    /firebasestorage\.googleapis\.com/,
    /\.firebasestorage\.app/,
    /googleapis\.com/,
    /akool-proxy/,
    /akool-token/,
    /admin\.html$/,
    /migration\.html$/,
    /service-worker\.js$/
  ],
  
  // 캐시 우선, 실패시 네트워크 (JS, CSS, 이미지)
  CACHE_FIRST: [
    /\.js$/,
    /\.css$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.svg$/,
    /\.ico$/,
    /\/icons\//,
    /manifest\.json$/,
    /petal\.png$/
  ],
  
  // 네트워크 우선, 실패시 캐시 (HTML, API)
  NETWORK_FIRST: [
    /\.html$/,
    /\/$/, // 루트 경로
    /\/[^.]*$/ // 확장자 없는 경로
  ]
};

// 🔧 유틸리티 함수들
function getStrategy(url) {
  const urlString = url.toString();
  
  if (CACHE_STRATEGIES.NETWORK_ONLY.some(pattern => pattern.test(urlString))) {
    return 'NETWORK_ONLY';
  }
  if (CACHE_STRATEGIES.CACHE_FIRST.some(pattern => pattern.test(urlString))) {
    return 'CACHE_FIRST';
  }
  if (CACHE_STRATEGIES.NETWORK_FIRST.some(pattern => pattern.test(urlString))) {
    return 'NETWORK_FIRST';
  }
  return 'NETWORK_FIRST'; // 기본값
}

function isValidResponse(response) {
  return response && 
         response.status === 200 && 
         response.type === 'basic';
}

function addToCache(cacheName, request, response) {
  return caches.open(cacheName)
    .then(cache => {
      console.log('💾 캐시 저장:', new URL(request.url).pathname);
      return cache.put(request, response);
    })
    .catch(error => {
      console.warn('⚠️ 캐시 저장 실패:', error);
    });
}

// 🚀 Install Event - 기본 파일들만 캐시
self.addEventListener('install', event => {
  console.log('🔧 Service Worker v' + CACHE_VERSION + ' 설치 중...');
  
  const basicFiles = [
    '/',
    '/manifest.json'
  ];
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ 기본 캐시 생성');
        return cache.addAll(basicFiles);
      })
      .catch(error => {
        console.error('❌ 기본 캐시 생성 실패:', error);
        // 실패해도 설치는 계속 진행
      })
  );
  
  // 즉시 활성화 (기존 SW를 대체)
  self.skipWaiting();
});

// 🔄 Activate Event - 오래된 캐시 정리
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v' + CACHE_VERSION + ' 활성화 중...');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 삭제
      caches.keys().then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('hairgator-') && 
                   cacheName !== CACHE_NAME && 
                   cacheName !== DYNAMIC_CACHE;
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
  
  // 클라이언트들에게 업데이트 완료 알림 (새로고침 없이)
  setTimeout(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          version: CACHE_VERSION,
          message: '캐시가 업데이트되었습니다.'
        });
      });
    });
  }, 1000);
});

// 🌐 Fetch Event - 스마트 캐시 전략
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const strategy = getStrategy(url);
  
  // GET 요청만 캐시 처리
  if (request.method !== 'GET') {
    return;
  }
  
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
  }
});

// 📶 네트워크 전용 (캐시 안함)
async function networkOnly(request) {
  try {
    console.log('🌐 네트워크 전용:', new URL(request.url).pathname);
    return await fetch(request);
  } catch (error) {
    console.error('❌ 네트워크 요청 실패:', error);
    throw error;
  }
}

// 💾 캐시 우선 전략
async function cacheFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 캐시에서 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 히트:', url.pathname);
      return cachedResponse;
    }
    
    // 2. 네트워크에서 가져오기
    console.log('🌐 네트워크 요청:', url.pathname);
    const networkResponse = await fetch(request);
    
    if (isValidResponse(networkResponse)) {
      // 동적 캐시에 저장
      addToCache(DYNAMIC_CACHE, request, networkResponse.clone());
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

// 🌐 네트워크 우선 전략
async function networkFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 네트워크에서 먼저 시도
    console.log('🌐 네트워크 우선:', url.pathname);
    const networkResponse = await fetch(request);
    
    if (isValidResponse(networkResponse)) {
      // 성공시 캐시 업데이트
      addToCache(DYNAMIC_CACHE, request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('⚠️ 네트워크 실패, 캐시 시도:', url.pathname);
    
    // 2. 네트워크 실패시 캐시에서 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 폴백 사용:', url.pathname);
      return cachedResponse;
    }
    
    console.error('❌ 네트워크와 캐시 모두 실패:', url.pathname, error);
    throw error;
  }
}

// 📨 메시지 처리
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CHECK_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION_INFO',
        version: CACHE_VERSION,
        cacheName: CACHE_NAME
      });
      break;
      
    case 'CLEAR_ALL_CACHE':
      handleClearAllCache(event);
      break;
      
    case 'UPDATE_CACHE':
      handleUpdateCache(event);
      break;
      
    default:
      console.log('📨 알 수 없는 메시지:', type);
  }
});

// 🧹 모든 캐시 삭제
async function handleClearAllCache(event) {
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
        version: CACHE_VERSION
      });
    });
    
    console.log('✅ 모든 캐시 삭제 완료');
    
  } catch (error) {
    console.error('❌ 캐시 삭제 실패:', error);
  }
}

// 🔄 캐시 업데이트
async function handleUpdateCache(event) {
  console.log('🔄 캐시 업데이트 요청');
  
  try {
    // 중요한 파일들만 다시 캐시
    const importantFiles = ['/', '/manifest.json'];
    const cache = await caches.open(CACHE_NAME);
    
    for (const file of importantFiles) {
      try {
        const response = await fetch(file);
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
        version: CACHE_VERSION
      });
    });
    
  } catch (error) {
    console.error('❌ 캐시 업데이트 실패:', error);
  }
}

// 🔍 주기적 정리 (24시간마다)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup());
  }
});

async function performCacheCleanup() {
  console.log('🧹 주기적 캐시 정리 시작');
  
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
    
    const deletePromises = requests
      .filter(async request => {
        const response = await cache.match(request);
        const dateHeader = response?.headers.get('date');
        if (!dateHeader) return false;
        
        const cacheDate = new Date(dateHeader).getTime();
        return (now - cacheDate) > maxAge;
      })
      .map(request => cache.delete(request));
    
    await Promise.all(deletePromises);
    console.log('✅ 오래된 캐시 항목 정리 완료');
    
  } catch (error) {
    console.error('❌ 캐시 정리 실패:', error);
  }
}

console.log('🌸 HAIRGATOR Service Worker v' + CACHE_VERSION + ' 로드 완료');
console.log('📋 캐시 전략:', {
  NETWORK_ONLY: CACHE_STRATEGIES.NETWORK_ONLY.length + '개 패턴',
  CACHE_FIRST: CACHE_STRATEGIES.CACHE_FIRST.length + '개 패턴', 
  NETWORK_FIRST: CACHE_STRATEGIES.NETWORK_FIRST.length + '개 패턴'
});
