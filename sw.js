const CACHE_NAME = 'lyricsmith-cache-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/songs.js',
  '/editor/editor.html',
  '/hub/hub.html',
  '/hub/musedice.html',
  '/hub/sunopromptengine.html',
  '/manifest.webmanifest',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then(resp => {
        cache.put(request, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
