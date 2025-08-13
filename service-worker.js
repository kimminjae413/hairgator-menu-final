// 🚀 HAIRGATOR PWA Service Worker - AKOOL API 완전 호환 버전 (수정)
const CACHE_NAME = 'hairgator-v1.2.1';  // 버전 업데이트
const STATIC_CACHE = 'hairgator-static-v1.2.1';
const DYNAMIC_CACHE = 'hairgator-dynamic-v1.2.1';

// 🎯 캐시할 핵심 파일들
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/firebase-config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-152.png',
  // Firebase 스크립트들
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  // 구글 폰트
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap'
];

// 🔧 캐시 허용 도메인들 (Firebase, Google Fonts만)
const allowedCacheOrigins = [
  'https://www.gstatic.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// 🚫 절대 캐시하면 안되는 경로들 (AKOOL 관련)
const noCachePaths = [
  '/.netlify/functions/',  // Netlify Functions (AKOOL API 호출)
  '/api/',                 // API 요청들
  'openapi.akool.com',     // AKOOL API 직접 호출
];

// 🌐 AKOOL API 관련 도메인들 (통과시켜야 함)
const akoolDomains = [
  'openapi.akool.com',
  'sg3.akool.com'
];

// 📦 Service Worker 설치
self.addEventListener('install', event => {
  console.log('🚀 HAIRGATOR Service Worker (AKOOL 호환) 설치 중...');
  
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
        return Promise.resolve();
      })
  );
  
  self.skipWaiting();
});

// 🔄 Service Worker 활성화
self.addEventListener('activate', event => {
  console.log('🔄 HAIRGATOR Service Worker 활성화 중...');
  
  event.waitUntil(
    Promise.all([
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
      self.clients.claim()
    ])
  );
  
  console.log('✅ Service Worker 활성화 완료');
});

// 🌐 네트워크 요청 처리 (AKOOL 호환) - ✨ 단일 리스너로 통합
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // 📊 디버깅을 위한 요청 로깅
  if (isAkoolRelated(requestUrl)) {
    console.log('🤖 AKOOL 요청 감지:', {
      url: requestUrl.href,
      method: event.request.method,
      destination: event.request.destination
    });
  }
  
  if (isNetlifyFunction(requestUrl)) {
    console.log('⚡ Netlify Functions 요청:', {
      path: requestUrl.pathname,
      method: event.request.method
    });
  }
  
  // 🚨 중요: POST 요청은 Service Worker가 절대 개입하지 않음!
  if (event.request.method !== 'GET') {
    console.log('🚫 Non-GET 요청 통과:', event.request.method, requestUrl.href);
    return; // Service Worker 완전 우회
  }
  
  // 🎯 AKOOL API 관련 요청은 항상 통과! (캐시 안함)
  if (isAkoolRelated(requestUrl)) {
    console.log('🤖 AKOOL GET 요청 통과:', requestUrl.href);
    return; // 서비스워커 개입 없이 직접 통과
  }
  
  // 🚫 Netlify Functions GET 요청도 항상 통과! (캐시 안함)
  if (isNetlifyFunction(requestUrl)) {
    console.log('⚡ Netlify Functions GET 요청 통과:', requestUrl.pathname);
    return; // 서비스워커 개입 없이 직접 통과
  }
  
  // 🔍 외부 도메인 체크 (Firebase, Google Fonts만 허용)
  const isAllowedOrigin = allowedCacheOrigins.some(origin => 
    requestUrl.origin === origin
  );
  
  // 현재 도메인이 아니고 허용된 외부 도메인도 아니면 스킵
  if (requestUrl.origin !== location.origin && !isAllowedOrigin) {
    return;
  }

  // 🎯 일반 GET 요청만 캐시 전략 적용
  event.respondWith(handleRequest(event.request));
});

// 🤖 AKOOL 관련 요청인지 확인
function isAkoolRelated(requestUrl) {
  // AKOOL 도메인 체크
  if (akoolDomains.some(domain => requestUrl.hostname.includes(domain))) {
    return true;
  }
  
  // AKOOL 관련 경로 체크
  if (requestUrl.pathname.includes('akool') || 
      requestUrl.pathname.includes('faceswap')) {
    return true;
  }
  
  return false;
}

// ⚡ Netlify Functions 요청인지 확인
function isNetlifyFunction(requestUrl) {
  return requestUrl.pathname.startsWith('/.netlify/functions/');
}

// 🚫 캐시하면 안되는 요청인지 확인
function shouldNotCache(request) {
  const url = new URL(request.url);
  
  return noCachePaths.some(path => 
    url.pathname.includes(path) || url.hostname.includes(path)
  );
}

// 📋 요청 처리 함수 (GET 요청만)
async function handleRequest(request) {
  const requestUrl = new URL(request.url);
  
  // 🚫 캐시하면 안되는 요청은 직접 네트워크로
  if (shouldNotCache(request)) {
    console.log('🚫 캐시 제외 요청:', requestUrl.pathname);
    try {
      return await fetch(request);
    } catch (error) {
      console.error('네트워크 요청 실패:', error);
      return new Response('Network Error', { status: 503 });
    }
  }
  
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
    if (!networkResponse || networkResponse.status !== 200) {
      return networkResponse;
    }

    // 3️⃣ 동적 캐시에 저장 (이미지, CSS 등만)
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
    return handleOfflineFallback(request);
  }
}

// 🤔 동적 캐시 여부 판단 (AKOOL 관련 제외)
function shouldCacheDynamically(request) {
  const url = new URL(request.url);
  
  // AKOOL 관련은 절대 캐시 안함
  if (isAkoolRelated(url)) {
    return false;
  }
  
  // API 요청은 캐시하지 않음
  if (shouldNotCache(request)) {
    return false;
  }
  
  // 이미지나 스타일시트는 캐시
  if (request.destination === 'image' || 
      request.destination === 'style' ||
      request.destination === 'script') {
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
  
  // 이미지 요청인 경우 기본 이미지 반환
  if (request.destination === 'image') {
    const fallbackImage = await caches.match('/icons/icon-192.png');
    if (fallbackImage) {
      console.log('📴 오프라인: 기본 이미지 반환');
      return fallbackImage;
    }
  }
  
  // AKOOL 관련 요청 실패시 특별 처리
  if (isAkoolRelated(url)) {
    return new Response(
      JSON.stringify({
        error: 'AKOOL_OFFLINE',
        message: 'AI 체험 기능은 인터넷 연결이 필요합니다',
        code: 'NETWORK_ERROR'
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

// 📱 메시지 처리
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 강제 업데이트 실행');
    self.skipWaiting();
  }
});

console.log('🚀 HAIRGATOR Service Worker (AKOOL 완전 호환) 로드 완료');
