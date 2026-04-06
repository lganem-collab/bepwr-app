// api/cron/notify-coaches.js — Lunes a Viernes 5:30am
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
  if (day === 0 || day === 6) return res.status(200).json({ skipped: true, reason: 'weekend' });

  const title = '\uD83C\uDFCB\uFE0F Tu mensaje del d\u00EDa en bePWR';
  const body = 'Hay un nuevo consejo de coaching esperando. \u00C1brelo antes de tu primera clase. \uD83D\uDCAA';

  try {
    const snap = await db.collection('staff').where('activo', '==', true).get();
    const tokens = snap.docs.map(d => d.data().fcmToken).filter(t => t && t.length > 10);
    if (!tokens.length) return res.status(200).json({ sent: 0, message: 'Sin tokens de coaches' });
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
        fcmOptions: { link: 'https://bepwr-app.vercel.app/admin.html' },
        notification: { title, body, icon: 'https://bepwr-app.vercel.app/icons/icon-192.png' }
      }
    });
    return res.status(200).json({ ok: true, sent: response.successCount, failed: response.failureCount });
  } catch (e) {
    console.error('notify-coaches:', e);
    return res.status(500).json({ error: e.message });
  }
}