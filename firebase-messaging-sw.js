// firebase-messaging-sw.js
// Service Worker para Firebase Cloud Messaging en PWA

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCB_t4CtXh1G70t9gHuvQkckwdm4U5pv2k",
  authDomain: "bepwr-app.firebaseapp.com",
  projectId: "bepwr-app",
  storageBucket: "bepwr-app.firebasestorage.app",
  messagingSenderId: "756758426621",
  appId: "1:756758426621:web:82d199589ec839a809df94"
});

const messaging = firebase.messaging();

// Maneja mensajes cuando la app esta en segundo plano o cerrada
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  const url = payload.data?.url || '/';
  self.registration.showNotification(title || 'bePWR', {
    body: body || 'Tienes un mensaje nuevo',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url }
  });
});
