// 🚀 HAIRGATOR PWA Service Worker - AKOOL 완전 호환 & 즉시 업데이트 버전
// ❗배포마다 버전 올리세요
const APP_VERSION   = 'v1.3.0';
const CACHE_STATIC  = `hairgator-static-${APP_VERSION}`;
const CACHE_DYNAMIC = `hairgator-dynamic-${APP_VERSION}`;

// 캐시할 필수 파일 (정적)
const STATIC_ASSETS = [
  '/',                // 라우팅 폴백
  '/index.html',
  '/manifest.json',
  '/js/firebase-config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-152.png',
  // Firebase (compat)
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap',
];

const ALLOWED_EXTERNAL_ORIGINS = [
  'https://www.gstatic.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

const AKOOL_HOSTS = ['openapi.akool.com', 'sg3.akool.com'];

// ============ Install ============
self.addEventListener('install', (event) => {
  console.log('[SW] install', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => {
        console.warn('[SW] static cache failed (ignored):', err);
      })
      .finally(() => self.skipWaiting())
  );
});

// ============ Activate ============
self.addEventListener('activate', (event) => {
  console.log('[SW] activate', APP_VERSION);
  event.waitUntil(
    (async () => {
      // 이전 캐시 전부 삭제
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
            console.log('[SW] delete old cache:', key);
            return caches.delete(key);
          }
        })
      );

      // 새 SW 즉시 제어
      await self.clients.claim();

      // 클라이언트에 버전/업데이트 알림 + (선택) 스토리지 정리 요청
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({
          type: 'APP_UPDATED',
          version: APP_VERSION,
          // 필요 시 프론트에서 아래 키들 정리하도록 사용
          suggestClearKeys: ['akool_token', 'akool_token_issued']
        });
      });
    })()
  );
});

// ============ Fetch ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) POST 등 비-GET 은 절대 개입하지 않음 (바이패스)
  if (request.method !== 'GET') return;

  // 2) AKOOL/Netlify Functions 요청은 모두 우회 (캐시 금지)
  if (isAkool(url) || isNetlifyFunction(url)) return;

  // 3) 문서(HTML) 요청은 네트워크 우선 + 캐시 폴백
  if (request.mode === 'navigate' || request.destination === 'document' || isHTML(url)) {
    event.respondWith(networkFirstForHTML(request));
    return;
  }

  // 4) 외부 허용 도메인(Font/Firebase)은 SWR
  if (url.origin !== location.origin) {
    if (ALLOWED_EXTERNAL_ORIGINS.includes(url.origin)) {
      event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    }
    // 그 외 외부는 건드리지 않음(바이패스)
    return;
  }

  // 5) 동일 출처의 정적 에셋(JS/CSS/이미지)은 SWR
  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  // 6) 나머지는 캐시 우선 시도 후 네트워크
  event.respondWith(cacheFirst(request, CACHE_DYNAMIC));
});

// ===== Helpers =====
function isAkool(url) {
  if (AKOOL_HOSTS.some((h) => url.hostname.includes(h))) return true;
  if (url.pathname.includes('/faceswap') || url.pathname.includes('/akool')) return true;
  return false;
}
function isNetlifyFunction(url) {
  return url.pathname.startsWith('/.netlify/functions/');
}
function isHTML(url) {
  return url.pathname.endsWith('.html') || url.pathname === '/';
}

// HTML은 항상 네트워크 우선
async function networkFirstForHTML(request) {
  try {
    // 캐시 방지 쿼리로 index 갱신 감도 ↑
    const req = addBustParam(request);
    const fresh = await fetch(req, { cache: 'no-store' });
    // 성공하면 최신 본문을 캐시에 저장(옵션)
    const cloned = fresh.clone();
    const cache = await caches.open(CACHE_STATIC);
    cache.put(request, cloned);
    return fresh;
  } catch (e) {
    // 오프라인이면 캐시 폴백
    const cached = await caches.match(request) || await caches.match('/index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale‑While‑Revalidate: 캐시 즉시 제공 + 백그라운드 갱신
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (isValidResponse(res)) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Network Error', { status: 503 });
}

// Cache‑First: 캐시 있으면 사용, 없으면 네트워크 후 저장
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (isValidResponse(res)) cache.put(request, res.clone());
    return res;
  } catch {
    return new Response('Network Error', { status: 503 });
  }
}

function isValidResponse(res) {
  return res && res.status === 200 && res.type !== 'opaque';
}

// index.html 네트워크 강제 갱신을 도와주는 bust param
function addBustParam(request) {
  try {
    const url = new URL(request.url);
    // HTML만 버스트 파라미터 추가
    if (isHTML(url)) {
      url.searchParams.set('__swv', APP_VERSION);
      return new Request(url.toString(), request);
    }
  } catch {}
  return request;
}

// 메시지: 프론트가 `SKIP_WAITING` 보낼 때 즉시 적용
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    console.log('[SW] skip waiting requested');
    self.skipWaiting();
  }
});

console.log('[SW] loaded', APP_VERSION);
