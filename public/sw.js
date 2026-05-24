// EARNOVA High-Performance Offline Service Worker
const CACHE_NAME = 'earnova-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json'
];

// Install Event - Pre-cache critical Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache bundles
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache first with network fallback for static, and network first for critical dynamic items
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Skip cross-origin chrome extensions, firestore real-time streams, etc.
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background (Stale While Revalidate pattern)
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {/* Ignore background sync failures */});
        
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        // Only cache valid standard successful GET requests
        if (networkResponse && networkResponse.status === 200 && req.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Safe offline fallback for page requests
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
