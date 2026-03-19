// api/notify.js — Envía push notifications via FCM HTTP v1
// Requiere variables de entorno en Vercel:
//   FCM_PROJECT_ID     → ID del proyecto Firebase (bepwr-app)
//   FCM_CLIENT_EMAIL   → service account email
//   FCM_PRIVATE_KEY    → service account private key (con \n reales)

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Inicializar Firebase Admin (singleton)
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

  const { title, body, url = '/', target = 'all', secret } = req.body || {};

  // Validar secret para llamadas externas (cron jobs)
  const validSecret = secret === process.env.NOTIFY_SECRET;
  // Llamadas desde admin.html pasan el idToken en Authorization header
  const authHeader = req.headers.authorization || '';
  const isAdminCall = authHeader.startsWith('Bearer ');

  if (!validSecret && !isAdminCall) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'title y body son requeridos' });
  }

  try {
    // Obtener tokens FCM de Firestore
    let tokens = [];

    if (target === 'all') {
      const snap = await db.collection('usuarios').where('activo', '==', true).get();
      tokens = snap.docs.map(d => d.data().fcmToken).filter(t => t && typeof t === 'string' && t.length > 10);
    } else if (target === 'objetivo' && req.body.objetivo) {
      // Filtrar por objetivo principal
      const snap = await db.collection('usuarios').where('activo', '==', true).get();
      tokens = snap.docs
        .filter(d => d.data().objetivo?.meta === req.body.objetivo)
        .map(d => d.data().fcmToken)
        .filter(t => t && typeof t === 'string' && t.length > 10);
    } else if (target === 'uid' && req.body.uid) {
      const doc = await db.collection('usuarios').doc(req.body.uid).get();
      const token = doc.data()?.fcmToken;
      if (token) tokens = [token];
    }

    if (tokens.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No hay tokens registrados' });
    }

    // Enviar en lotes de 500 (límite FCM)
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

    let totalSent = 0;
    let totalFailed = 0;
    const invalidTokens = [];

    for (const chunk of chunks) {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
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

      totalSent += response.successCount;
      totalFailed += response.failureCount;

      // Recolectar tokens inválidos para limpiar
      response.responses.forEach((r, idx) => {
        if (!r.success && (
          r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(chunk[idx]);
        }
      });
    }

    // Limpiar tokens inválidos de Firestore
    if (invalidTokens.length > 0) {
      const batch = db.batch();
      const staleSnap = await db.collection('usuarios')
        .where('fcmToken', 'in', invalidTokens.slice(0, 10))
        .get();
      staleSnap.docs.forEach(d => batch.update(d.ref, { fcmToken: null }));
      await batch.commit();
    }

    return res.status(200).json({ sent: totalSent, failed: totalFailed });
  } catch (e) {
    console.error('notify error:', e);
    return res.status(500).json({ error: e.message });
  }
}
