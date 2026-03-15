// api/notify-coaches-push.js — Envía push solo a coaches/admins activos

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body, url = '/admin.html', secret } = req.body || {};

  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'title y body requeridos' });
  }

  try {
    // Obtener fcmToken de todos los staff activos
    const snap = await db.collection('staff')
      .where('activo', '==', true)
      .get();

    const tokens = snap.docs
      .map(d => d.data().fcmToken)
      .filter(t => t && typeof t === 'string' && t.length > 10);

    if (tokens.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No hay tokens de coaches registrados' });
    }

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: {
        fcmOptions: { link: url },
        notification: {
          title,
          body,
          icon: 'https://bepwr-app.vercel.app/icons/icon-192.png',
          badge: 'https://bepwr-app.vercel.app/icons/icon-192.png',
        },
        data: { url }
      }
    });

    // Limpiar tokens inválidos
    const invalidTokens = [];
    response.responses.forEach((r, idx) => {
      if (!r.success && (
        r.error?.code === 'messaging/invalid-registration-token' ||
        r.error?.code === 'messaging/registration-token-not-registered'
      )) invalidTokens.push(tokens[idx]);
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      const stale = await db.collection('staff').where('fcmToken', 'in', invalidTokens.slice(0, 10)).get();
      stale.docs.forEach(d => batch.update(d.ref, { fcmToken: null }));
      await batch.commit();
    }

    return res.status(200).json({ sent: response.successCount, failed: response.failureCount });
  } catch (e) {
    console.error('notify-coaches-push error:', e);
    return res.status(500).json({ error: e.message });
  }
}
