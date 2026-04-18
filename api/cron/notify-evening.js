// api/cron/notify-evening.js — Miércoles y Domingo 5pm QRO (23:00 UTC)
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
  if (day === 3) {
    title = '\uD83D\uDD25 \u00A1Sigue el ritmo!';
    body = 'Ya llevas media semana. Una sesi\u00F3n m\u00E1s esta noche te acerca a tu objetivo.';
  } else if (day === 0) {
    title = '\uD83D\uDCC5 \u00A1Prepara tu semana!';
    body = 'Reserva tus clases de la semana en bePWR antes de que se llenen los horarios.';
  } else {
    return res.status(200).json({ skipped: true, day });
  }
  try {
    const snap = await db.collection('usuarios').get();
    const usuarios = snap.docs
      .filter(d => d.data().activo !== false && d.data().fcmToken && d.data().fcmToken.length > 10)
      .map(d => ({ uid: d.id, token: d.data().fcmToken }));
    const tokens = usuarios.map(u => u.token);

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
          icon: 'https://bepwr-app.vercel.app/icons/logo-bepwr.png',
          badge: 'https://bepwr-app.vercel.app/icons/logo-bepwr.png',
        },
        fcmOptions: { link: 'https://bepwr-app.vercel.app' }
      }
    });


    const batch = db.batch();
    response.responses.forEach((r, i) => {
      if (r.success) {
        const ref = db.collection('usuarios').doc(usuarios[i].uid).collection('notificaciones').doc();
        batch.set(ref, { titulo: title, cuerpo: body, fecha: new Date(), leida: false, tipo: 'motivacion' });
      }
    });
    if (response.successCount > 0) await batch.commit();
    

    return res.status(200).json({
      ok: true, day,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length
    });
  } catch (e) {
    console.error('notify-evening:', e.message);
    return res.status(500).json({ error: e.message });
  }
}