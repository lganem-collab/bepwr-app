const CACHE = 'bepwr-v9';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') {
    e.respondWith(fetch(req));
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req));
    return;
  }

  // Never serve cached version for magic link requests (has ?e= param)
  if (url.searchParams.has('e') || url.searchParams.has('p')) {
    e.respondWith(fetch(req));
    return;
  }

  const cached = ASSETS.some(a => url.pathname === a);
  if (cached) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
