// Service Worker for HAIRGATOR PWA
const CACHE_NAME = 'hairgator-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  '/js/firebase-config.js',
  '/js/auth.js',
  '/js/menu.js',
  '/js/main.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First, Cache Fallback
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Firebase and external URLs
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // Return offline page if available
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background Sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-menu-data') {
    event.waitUntil(syncMenuData());
  }
});

// Sync menu data when online
async function syncMenuData() {
  try {
    // Implement sync logic here
    console.log('Syncing menu data...');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push Notifications (if needed)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HAIRGATOR', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker loaded successfully');
