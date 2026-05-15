/**
 * Service Worker for TruckParts Pro PWA
 * Minimal implementation for PWA installability requirements
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `truckparts-pro-${CACHE_VERSION}`;

// List of critical files to cache on install
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

/**
 * Install Event: Cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    }).catch((error) => {
      console.error('[Service Worker] Cache installation failed:', error);
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

/**
 * Activate Event: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

/**
 * Fetch Event: Network-first strategy with fallback to cache
 * This satisfies Chrome's PWA installability requirements
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type !== 'error') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return a fallback response if needed
          console.warn('[Service Worker] Offline - no cached response for:', event.request.url);
          return new Response('Offline - No cached response available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

/**
 * Message Event: Handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
