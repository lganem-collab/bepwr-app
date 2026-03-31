const CACHE = 'bepwr-v13';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sin cacheo - todo va directo a red
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') || url.includes('googleapis.com/identitytoolkit')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});

// Recibir push de FCM y mostrar notificación nativa
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  const n = data.notification || {};
  const title = n.title || data.title || 'bePWR';
  const body  = n.body  || data.body  || '';
  const icon  = n.icon  || '/icons/icon-192.png';
  const badge = '/icons/icon-192.png';
  const url   = (data.webpush && data.webpush.fcmOptions && data.webpush.fcmOptions.link)
                || data.url || 'https://bepwr-app.vercel.app';

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [200, 100, 200],
      tag: 'bepwr-notif',
      renotify: true
    })
  );
});

// Click en notificación -> abrir/enfocar la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'https://bepwr-app.vercel.app';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('bepwr-app.vercel.app') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Notificar a clientes abiertos para que actualicen el badge
self.addEventListener('push', e => {
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'PUSH_RECEIVED' }));
  });
});
