// api/cron/notify-daily.js — Cumpleaños + aviso valoración (2 días antes)
// Corre diario a las 9am Querétaro (15:00 UTC)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();

async function sendPush(token, title, body) {
  if (!token) return;
  try {
    await messaging.send({ token, notification: { title, body }, webpush: { notification: { icon: '/icons/icon-192.png' } } });
  } catch (e) {
    console.warn('FCM error:', e.message);
  }
}

export default async function handler(req, res) {
  const today = new Date();
  // Adjust to Querétaro time (UTC-6)
  const mxNow = new Date(today.getTime() - 6 * 60 * 60 * 1000);
  const todayMonth = mxNow.getUTCMonth() + 1;
  const todayDay   = mxNow.getUTCDate();

  // Date 2 days from now (for valoración warning)
  const in2 = new Date(mxNow.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in2Str = in2.toISOString().substring(0, 10); // YYYY-MM-DD

  let bday = 0, val = 0;

  try {
    const snap = await db.collection('usuarios').get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.activo === false) continue;
      const token = data.fcmToken;
      const nombre = data.nombre ? data.nombre.split(' ')[0] : 'campeón';

      // ── CUMPLEAÑOS ──
      if (data.nacimiento) {
        const nac = data.nacimiento.toDate ? data.nacimiento.toDate() : new Date(data.nacimiento);
        if (nac.getMonth() + 1 === todayMonth && nac.getDate() === todayDay) {
          await sendPush(token,
            '🎂 ¡Feliz cumpleaños, ' + nombre + '!',
            'Todo el equipo de bePWR te desea un increíble año lleno de salud y metas cumplidas. 🎉'
          );
          bday++;
        }
      }

      // ── PRÓXIMA VALORACIÓN ──
      if (data.proximaValoracion) {
        const pv = data.proximaValoracion.toDate ? data.proximaValoracion.toDate() : new Date(data.proximaValoracion);
        const pvStr = pv.toISOString().substring(0, 10);
        if (pvStr === in2Str) {
          await sendPush(token,
            '📅 Tu valoración se acerca, ' + nombre,
            'En 2 días es tu fecha de valoración en bePWR. ¡Agenda tu cita para ver tu progreso!'
          );
          val++;
        }
      }
    }

    return res.status(200).json({ ok: true, bday, val });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
