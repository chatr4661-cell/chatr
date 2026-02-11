// Ultra-Aggressive Service Worker for 2G Networks

const CACHE_NAME = 'chatr-v2';
const RUNTIME_CACHE = 'chatr-runtime';
const IMAGE_CACHE = 'chatr-images';
const API_CACHE = 'chatr-api';

// Install - cache critical assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== IMAGE_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 2G-OPTIMIZED: Ultra-short timeout for API, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // API requests - 2s timeout, fallback to cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      Promise.race([
        fetch(request).then((response) => {
          if (request.method === 'GET' && response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((c) => c.put(request, cloned));
          }
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]).catch(() => caches.match(request).then((r) => r || new Response('{"error":"offline"}', {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })))
    );
    return;
  }

  // Images - cache first, lazy network update
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // JS/CSS/HTML - Stale-while-revalidate (instant from cache, update in bg)
  if (['script', 'style', 'document'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (request.method === 'GET' && response.ok) {
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else - cache first
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      return fetch(request).then((fetchResponse) => {
        if (request.method !== 'GET' || !fetchResponse.ok) return fetchResponse;
        const toCache = fetchResponse.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(request, toCache));
        return fetchResponse;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
