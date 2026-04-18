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

async function sendPush(token, title, body, uid = null) {
  if (!token) return;
  try {
    await messaging.send({ token, notification: { title, body }, android: { priority: 'high', notification: { channelId: 'bepwr-default', sound: 'default' } }, apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default', badge: 1 } } }, webpush: { notification: { icon: '/icons/logo-bepwr.png' } } });
    if (uid) {
      const ref = db.collection('usuarios').doc(uid).collection('notificaciones').doc();
      await ref.set({ titulo: title, cuerpo: body, fecha: new Date(), leida: false, tipo: 'aviso' });
    }
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
            'Todo el equipo de bePWR te desea un increíble año lleno de salud y metas cumplidas. 🎉',
            doc.id
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
            'En 2 días es tu fecha de valoración en bePWR. ¡Agenda tu cita para ver tu progreso!',
            doc.id
          );
          val++;
        }
      }
    }


    // ── RECORDATORIO DE CITA 24H ──
    let citas24h = 0;
    const manana = new Date(mxNow.getTime() + 24 * 60 * 60 * 1000);
    const mananaStr = manana.toISOString().substring(0, 10);
    const MESES24 = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const DIAS24  = ['domingo','lunes','martes','mi\u00E9rcoles','jueves','viernes','s\u00E1bado'];
    try {
      const citasSnap = await db.collection('citas')
        .where('fecha', '==', mananaStr)
        .where('estado', '==', 'confirmada')
        .get();
      for (const citaDoc of citasSnap.docs) {
        const cita = citaDoc.data();
        if (cita.recordatorioEnviado) continue; // ya se envió
        const uid = cita.uid;
        let mNombre = cita.nombre || 'Miembro';
        let mEmail = '';
        let mToken = '';
        try {
          const mDoc = await db.collection('usuarios').doc(uid).get();
          if (mDoc.exists) {
            const md = mDoc.data();
            mNombre = (md.nombre && md.nombre.trim()) ? md.nombre : mNombre;
            mEmail  = md.email || '';
            mToken  = md.fcmToken || '';
          }
        } catch(e) {}
        const primer = mNombre.split(' ')[0];
        const [cy,cm,cd] = cita.fecha.split('-').map(Number);
        const fd = new Date(cy, cm-1, cd);
        const fechaLabel = DIAS24[fd.getDay()] + ' ' + cd + ' de ' + MESES24[cm-1] + ' a las ' + cita.hora;
        // Push notification
        await sendPush(mToken,
          '\u23F0 Tu valoraci\u00F3n es ma\u00F1ana, ' + primer + '!',
          fechaLabel + ' \u00B7 Recuerda: ayuno 2-4h, ropa ligera. \u00A1Te esperamos!',
          uid
        );
        // Email recordatorio
        if (mEmail && process.env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'bePWR <citas@bepwr.vip>',
              to: [mEmail],
              subject: '\u23F0 Recordatorio: Tu valoraci\u00F3n es ma\u00F1ana \u00B7 bePWR',
              html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                <div style="background:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center;border-bottom:1px solid #e0e0e0">
                  <h1 style="color:#1a1a1a;margin:0;font-size:22px">be<span style="color:#FF5C1A;font-weight:900">PWR</span></h1>
                  <p style="color:#FF5C1A;font-weight:600;margin:4px 0 0;font-size:13px">Recordatorio de valoraci\u00F3n</p>
                </div>
                <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0">
                  <p style="font-size:15px;color:#333">Hola <strong>${mNombre}</strong>,</p>
                  <p style="font-size:15px;color:#333">Ma\u00F1ana tienes tu valoraci\u00F3n en bePWR:</p>
                  <div style="background:#EAF3DE;border-radius:10px;padding:16px;margin:16px 0;text-align:center">
                    <div style="font-size:20px;font-weight:700;color:#1D9E75">${fechaLabel}</div>
                  </div>
                  <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e8e8e8">
                    <p style="font-weight:600;color:#333;margin:0 0 10px">Recuerda para ma\u00F1ana:</p>
                    <ul style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px">
                      <li>Ayuno de 2 a 4 horas (sin alimentos ni l\u00EDquidos)</li>
                      <li>Evita ejercicio intenso 12 horas antes</li>
                      <li>Ve al ba\u00F1o antes de la medici\u00F3n</li>
                      <li>Usa ropa ligera, sin accesorios met\u00E1licos</li>
                    </ul>
                  </div>
                  <p style="font-size:12px;color:#999;margin-top:20px;text-align:center">bePWR Functional Training \u00B7 Quer\u00E9taro</p>
                </div></div>`
            })
          }).catch(e => console.warn('email recordatorio:', e.message));
        }
        // Marcar como enviado
        await citaDoc.ref.update({ recordatorioEnviado: true });
        citas24h++;
      }
    } catch(e){ console.error('citas24h err:', e.message); }


    // ── ALERTA DE USO RESEND ──
    // Revisa el uso mensual y avisa a lganem@gmail.com si supera 80% (2,400) o 95% (2,850)
    try {
      const resendUsage = await fetch('https://api.resend.com/emails?limit=1', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      });
      // Resend no tiene endpoint de usage en plan free, usamos contador propio en Firestore
      const usageDoc = await db.collection('config').doc('resendUsage').get();
      const usage = usageDoc.exists ? usageDoc.data() : {};
      const mes = new Date().toISOString().slice(0,7); // YYYY-MM
      const count = (usage.mes === mes) ? (usage.count || 0) : 0;
      const LIMITE = 3000;
      const pct = Math.round(count / LIMITE * 100);
      // Alerta al 80% y 95%
      const umbral = count >= 2850 ? 95 : count >= 2400 ? 80 : 0;
      if (umbral && usage.ultimaAlerta !== umbral + '-' + mes) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'bePWR <citas@bepwr.vip>',
            to: ['lganem@gmail.com'],
            subject: `⚠️ bePWR: ${pct}% del límite de Resend usado (${count}/${LIMITE})`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#fff9eb;border-radius:12px;border:2px solid #f59e0b">
              <h2 style="color:#b45309;margin:0 0 12px">\u26a0\ufe0f Alerta de uso de emails</h2>
              <p style="color:#333;font-size:15px">Has usado <strong>${count} de ${LIMITE} emails</strong> este mes en Resend (<strong>${pct}%</strong>).</p>
              ${umbral >= 95
                ? '<p style="color:#dc2626;font-weight:600">\u26a0\ufe0f Est\u00e1s muy cerca del l\u00edmite. Considera activar el plan de pago en resend.com para no interrumpir el env\u00edo.</p>'
                : '<p style="color:#b45309">El l\u00edmite gratuito es 3,000 emails/mes. Si lo superas, los emails dejar\u00e1n de enviarse.</p>'}
              <a href="https://resend.com/settings/usage" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#FF5C1A;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Ver uso en Resend</a>
              <p style="font-size:12px;color:#999;margin-top:20px">bePWR Functional Training \u00b7 Quer\u00e9taro</p>
            </div>`
          })
        });
        // Marcar alerta enviada para no duplicar
        await db.collection('config').doc('resendUsage').set({ mes, count, ultimaAlerta: umbral + '-' + mes }, { merge: true });
      }
    } catch(e) { console.warn('resend usage check:', e.message); }


    return res.status(200).json({ ok: true, bday, val, citas24h });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
