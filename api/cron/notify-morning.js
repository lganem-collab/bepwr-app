// api/cron/notify-morning.js — Lunes y Viernes 6am (UTC-6 → 12:00 UTC)
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

async function sendPush(token, title, body) {
  if (!token) return;
  try {
    await messaging.send({ token, notification: { title, body },
      webpush: { notification: { icon: 'https://bepwr-app.vercel.app/icons/icon-192.png' } } });
  } catch (e) { console.warn('FCM:', e.message); }
}

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
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.activo === false || !data.fcmToken) continue;
      await sendPush(data.fcmToken, title, body);
      count++;
    }
    return res.status(200).json({ ok: true, day, count });
  } catch (e) {
    console.error('notify-morning:', e);
    return res.status(500).json({ error: e.message });
  }
}