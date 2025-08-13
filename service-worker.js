// 🚀 HAIRGATOR PWA Service Worker - 개선된 버전
const CACHE_NAME = 'hairgator-v1.1.0'; // 버전 업데이트
const STATIC_CACHE = 'hairgator-static-v1.1.0';
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.1.0';

// 🎯 캐시할 핵심 파일들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/firebase-config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-152.png',
  // Firebase 스크립트들 (오프라인 지원을 위해)
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  // 구글 폰트 (선택사항)
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap'
];

// 🔧 허용된 외부 도메인들
const allowedOrigins = [
  'https://www.gstatic.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// 📦 Service Worker 설치
self.addEventListener('install', event => {
  console.log('🚀 HAIRGATOR Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 정적 캐시 오픈');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ 모든 파일 캐시 완료');
      })
      .catch(error => {
        console.error('❌ 캐시 설치 실패:', error);
        // 일부 파일이 실패해도 계속 진행
        return Promise.resolve();
      })
  );
  
  // 즉시 새 버전 활성화
  self.skipWaiting();
});

// 🔄 Service Worker 활성화
self.addEventListener('activate', event => {
  console.log('🔄 HAIRGATOR Service Worker 활성화 중...');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 정리
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 클라이언트 즉시 제어
      self.clients.claim()
    ])
  );
  
  console.log('✅ Service Worker 활성화 완료');
});

// 🌐 네트워크 요청 처리
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  
  // 🔍 외부 도메인 체크
  const isAllowedOrigin = allowedOrigins.some(origin => 
    requestUrl.origin === origin
  );
  
  // 현재 도메인이 아니고 허용된 외부 도메인도 아니면 스킵
  if (requestUrl.origin !== location.origin && !isAllowedOrigin) {
    return;
  }

  // 🎯 캐시 전략 적용
  event.respondWith(handleRequest(event.request));
});

// 📋 요청 처리 함수
async function handleRequest(request) {
  const requestUrl = new URL(request.url);
  
  try {
    // 1️⃣ 정적 캐시에서 먼저 확인
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 캐시에서 반환:', requestUrl.pathname);
      return cachedResponse;
    }

    // 2️⃣ 네트워크에서 가져오기
    const networkResponse = await fetch(request);
    
    // 응답이 유효한지 확인
    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
      return networkResponse;
    }

    // 3️⃣ 동적 캐시에 저장 (정적 파일이 아닌 경우)
    if (shouldCacheDynamically(request)) {
      const responseToCache = networkResponse.clone();
      
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log('💾 동적 캐시에 저장:', requestUrl.pathname);
        })
        .catch(error => {
          console.warn('동적 캐시 저장 실패:', error);
        });
    }

    return networkResponse;

  } catch (error) {
    console.error('네트워크 요청 실패:', error);
    
    // 4️⃣ 오프라인 폴백
    return handleOfflineFallback(request);
  }
}

// 🤔 동적 캐시 여부 판단
function shouldCacheDynamically(request) {
  const url = new URL(request.url);
  
  // API 요청은 캐시하지 않음
  if (url.pathname.includes('/api/') || url.pathname.includes('/.netlify/')) {
    return false;
  }
  
  // 이미지나 스타일시트는 캐시
  if (request.destination === 'image' || request.destination === 'style') {
    return true;
  }
  
  return false;
}

// 📴 오프라인 폴백 처리
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // HTML 페이지 요청인 경우 index.html 반환
  if (request.destination === 'document') {
    const fallback = await caches.match('/index.html');
    if (fallback) {
      console.log('📴 오프라인: index.html 반환');
      return fallback;
    }
  }
  
  // 이미지 요청인 경우 기본 이미지 반환 (있다면)
  if (request.destination === 'image') {
    const fallbackImage = await caches.match('/icons/icon-192.png');
    if (fallbackImage) {
      console.log('📴 오프라인: 기본 이미지 반환');
      return fallbackImage;
    }
  }
  
  // 기본 오프라인 응답
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: '인터넷 연결을 확인해주세요'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// 📱 앱 업데이트 알림
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 강제 업데이트 실행');
    self.skipWaiting();
  }
});

// 🎉 설치 완료 알림
self.addEventListener('install', event => {
  // 메인 앱에 설치 완료 알림
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_INSTALLED',
        message: 'HAIRGATOR PWA 설치 완료!'
      });
    });
  });
});

console.log('🚀 HAIRGATOR Service Worker 로드 완료');
