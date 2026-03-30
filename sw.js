const CACHE = 'bepwr-v12';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pass ALL requests directly to network - no caching
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') || url.includes('googleapis.com/identitytoolkit')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});
