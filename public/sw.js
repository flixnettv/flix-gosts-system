const CACHE_NAME = 'flix-gosts-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetching content using Service Worker
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API requests to ensure real-time data
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((r) => {
      console.log('[Service Worker] Fetching resource: ' + event.request.url);
      return r || fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          console.log('[Service Worker] Caching new resource: ' + event.request.url);
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});

// Handle updates
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
