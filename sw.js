/* Offline shell cache. The observation data itself is in this device's localStorage. */
const CACHE_NAME = 'drone-visibility-shell-v1-20261013';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('drone-visibility-shell-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((cached) =>
      cached || fetch(req).catch(() => new Response('App not cached. Open it once while online.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }))));
    return;
  }
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
