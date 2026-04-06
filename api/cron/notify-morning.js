// api/cron/notify-morning.js — Lunes y Viernes 6am QRO (12:00 UTC)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId: process.env.FCM_PROJECT_ID,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }) });
}
const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
  const day = new Date().getDay();
  let title, body;
  if (day === 1) {
    title = '\uD83D\uDCAA \u00A1Nueva semana en bePWR!';
    body = 'Empieza con todo. Reserva tus clases de esta semana y mant\u00E9n el ritmo hacia tu meta.';
  } else if (day === 5) {
    title = '\uD83D\uDD25 \u00A1Cierra la semana fuerte!';
    body = 'Es viernes \u2014 el mejor d\u00EDa para sumar una sesi\u00F3n m\u00E1s. \u00A1Termina la semana en bePWR!';
  } else {
    return res.status(200).json({ skipped: true, day });
  }
  try {
    const snap = await db.collection('usuarios').get();
    const tokens = snap.docs
      .map(d => d.data())
      .filter(d => d.activo !== false && d.fcmToken && d.fcmToken.length > 10)
      .map(d => d.fcmToken);

    if (!tokens.length) return res.status(200).json({ ok: true, sent: 0, message: 'Sin tokens' });

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: { channelId: 'bepwr-default', sound: 'default' }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', badge: 1 } }
      },
      webpush: {
        notification: {
          title, body,
          icon: 'https://bepwr-app.vercel.app/icons/icon-192.png',
          badge: 'https://bepwr-app.vercel.app/icons/icon-192.png',
          requireInteraction: false,
        },
        fcmOptions: { link: 'https://bepwr-app.vercel.app' }
      }
    });

    // Log individual results for debugging
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn('FCM fail token', i, ':', r.error?.code, r.error?.message);
      }
    });

    return res.status(200).json({
      ok: true, day,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length
    });
  } catch (e) {
    console.error('notify-morning:', e.message);
    return res.status(500).json({ error: e.message });
  }
}