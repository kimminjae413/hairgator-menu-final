// ============ HAIRGATOR Service Worker (v4.0-PWA-FIX) ============
// PWA와 웹브라우저 동일한 경험 보장

const CACHE_VERSION = '4.0.0';
const CACHE_NAME = `hairgator-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hairgator-dynamic-v${CACHE_VERSION}`;

// 🚨 중요 파일들은 절대 캐시하지 않음 (항상 최신 버전)
const NEVER_CACHE = [
  /\.html$/,           // HTML 파일들 (index.html 포함)
  /manifest\.json$/,   // PWA 설정
  /service-worker\.js$/, // Service Worker 자체
  /\/$/,               // 루트 경로
  /js\/main\.js$/,     // 메인 JavaScript
  /firebase-config\.js$/, // Firebase 설정
  /\.firebaseapp\.com/,
  /firebasestorage\./,
  /googleapis\.com/,
  /netlify\/functions/
];

// 📦 캐시해도 되는 정적 리소스만
const CACHE_SAFE = [
  /\.css$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /petal\.png$/,
  /\/icons\//
];

// 🔧 유틸리티 함수
function shouldNeverCache(url) {
  const urlString = url.toString();
  return NEVER_CACHE.some(pattern => pattern.test(urlString));
}

function shouldCache(url) {
  const urlString = url.toString();
  return CACHE_SAFE.some(pattern => pattern.test(urlString));
}

// 🚀 Install Event - 필수 파일만 최소 캐시
self.addEventListener('install', event => {
  console.log('🔧 Service Worker v' + CACHE_VERSION + ' 설치 중...');
  
  // 즉시 활성화 (오래된 SW 교체)
  self.skipWaiting();
});

// 🔄 Activate Event - 오래된 캐시 정리
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker v' + CACHE_VERSION + ' 활성화');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 삭제
      caches.keys().then(cacheNames => {
        const currentCaches = [CACHE_NAME, DYNAMIC_CACHE];
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('hairgator-') && 
                     !currentCaches.includes(cacheName);
            })
            .map(cacheName => {
              console.log('🗑️ 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // 모든 클라이언트에서 새 SW 활성화
      self.clients.claim()
    ])
  );
});

// 🌐 Fetch Event - 간단하고 예측 가능한 전략
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // GET 요청과 같은 도메인만 처리
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  
  // 🚨 절대 캐시하지 않을 파일들 (항상 네트워크)
  if (shouldNeverCache(url)) {
    console.log('🌐 네트워크 전용 (캐시 안함):', url.pathname);
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => {
        return new Response('네트워크 연결을 확인해주세요.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }
  
  // 📦 정적 리소스만 캐시 (이미지, CSS 등)
  if (shouldCache(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // 🌐 나머지는 네트워크 우선
  event.respondWith(networkFirst(request));
});

// 💾 캐시 우선 전략 (정적 리소스용)
async function cacheFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 캐시에서 먼저 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 사용:', url.pathname);
      return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크
    console.log('🌐 네트워크 요청:', url.pathname);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // 캐시에 저장
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('💾 캐시 저장:', url.pathname);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ 캐시 우선 전략 실패:', url.pathname, error);
    throw error;
  }
}

// 🌐 네트워크 우선 전략 (동적 콘텐츠용)
async function networkFirst(request) {
  const url = new URL(request.url);
  
  try {
    // 네트워크 우선 (타임아웃 짧게)
    console.log('🌐 네트워크 우선:', url.pathname);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2초 타임아웃
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return networkResponse;
    
  } catch (error) {
    console.warn('⚠️ 네트워크 실패, 캐시 시도:', url.pathname);
    
    // 네트워크 실패시 캐시 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('💾 캐시 폴백:', url.pathname);
      return cachedResponse;
    }
    
    console.error('❌ 네트워크와 캐시 모두 실패:', url.pathname);
    throw error;
  }
}

// 📨 메시지 처리 (간소화)
self.addEventListener('message', event => {
  const { type } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_ALL_CACHE':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'GET_VERSION':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: CACHE_VERSION
        });
      }
      break;
      
    default:
      console.log('📨 메시지:', type);
  }
});

// 🧹 모든 캐시 삭제
async function clearAllCaches() {
  console.log('🧹 모든 캐시 삭제');
  
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

console.log('🌸 HAIRGATOR Service Worker v' + CACHE_VERSION + ' 로드 완료');
console.log('📋 캐시 정책: HTML/JS는 항상 최신, 이미지/CSS만 캐시');
