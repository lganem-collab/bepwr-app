// api/citas.js
// Endpoint unificado para el sistema de citas de valoracion
//
// GET  /api/citas?fecha=YYYY-MM-DD  -> Devuelve { ocupadas: ["09:00","10:15",...] }
//                                      (solo horas, sin PII de otros miembros)
// POST /api/citas                   -> Crea cita atomicamente con transaction:
//                                      1) Valida que el slot no este ocupado
//                                      2) Cancela cita previa futura del miembro
//                                      3) Crea la nueva cita
//                                      4) Envia email de notificacion a admins
//   Body: { fecha: 'YYYY-MM-DD', hora: 'HH:MM', duracion: 15 }
//   Respuesta: { citaId, ok: true }
//
// Ambos metodos requieren: Header 'Authorization: Bearer <idToken>'
//
// Env vars: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, RESEND_API_KEY, ADMIN_EMAILS

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// ─────────────────────────────────────────────────────────
// Envia email a admins cuando un miembro agenda cita (inline, no llama a otro endpoint)
// ─────────────────────────────────────────────────────────
async function notificarAdminsEmail({ nombre, fecha, hora, duracion }) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!adminEmails.length) {
    console.warn('ADMIN_EMAILS no configurado - se salta email');
    return;
  }

  const [y, m, d] = fecha.split('-');
  const dias = ['Dom', 'Lun', 'Mar', 'Mi\u00E9', 'Jue', 'Vie', 'S\u00E1b'];
  const fObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const fechaLabel = `${dias[fObj.getDay()]} ${d}/${m}/${y}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nueva cita agendada</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'DM Sans',Arial,sans-serif;color:#ffffff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;padding:32px 16px">
    <tr><td>
      <div style="text-align:center;margin-bottom:28px">
        <span style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:4px;color:#FF5C1A">bePWR</span>
        <div style="font-size:11px;letter-spacing:3px;color:#666;margin-top:2px">PANEL ADMINISTRATIVO</div>
      </div>
      <div style="background:#1a1a1a;border-radius:16px;padding:28px;margin-bottom:20px">
        <div style="font-size:13px;color:#FF5C1A;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">&#x1F4C5; Nueva Cita Agendada</div>
        <div style="font-size:26px;font-weight:700;margin-bottom:20px">${nombre}</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#aaa;font-size:13px;width:40%">Fecha</td>
            <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:15px;font-weight:600">${fechaLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#aaa;font-size:13px">Hora</td>
            <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:15px;font-weight:600;font-family:monospace;color:#FF5C1A">${hora}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#aaa;font-size:13px">Duraci&#xF3;n</td>
            <td style="padding:10px 0;font-size:15px;font-weight:600">${duracion || 15} minutos</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://bepwr-app.vercel.app/admin.html" style="display:inline-block;padding:14px 32px;background:#FF5C1A;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:1px">
          Ver en panel admin
        </a>
      </div>
      <div style="text-align:center;font-size:11px;color:#444;letter-spacing:1px">bePWR &middot; Quer&#xE9;taro, M&#xE9;xico</div>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'bePWR Citas <citas@bepwr.vip>',
        to: adminEmails,
        subject: `\uD83D\uDCC5 Nueva cita \u2014 ${nombre} \u00B7 ${fechaLabel} ${hora}`,
        html
      })
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      console.error('Resend error:', data);
    }
  } catch (e) {
    console.error('notificarAdminsEmail error:', e.message);
  }
}

// ─────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: verificar ID token en todas las operaciones
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  let uid;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  const db = getFirestore();

  // ─────────────────────────────────────────────────────
  // GET: devuelve horas ocupadas de una fecha (sin PII)
  // ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const fecha = req.query.fecha;
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'fecha requerida en formato YYYY-MM-DD' });
    }
    try {
      const snap = await db.collection('citas')
        .where('fecha', '==', fecha)
        .where('estado', '==', 'confirmada')
        .get();
      const ocupadas = snap.docs.map(d => d.data().hora).filter(Boolean);
      return res.status(200).json({ ocupadas });
    } catch (e) {
      console.error('GET /citas:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ─────────────────────────────────────────────────────
  // POST: crear cita atomicamente
  // ─────────────────────────────────────────────────────
  const { fecha, hora, duracion } = req.body || {};
  if (!fecha || !hora || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return res.status(400).json({ error: 'fecha (YYYY-MM-DD) y hora (HH:MM) son requeridas' });
  }

  try {
    // Obtener nombre del miembro
    const userDoc = await db.collection('usuarios').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    const nombre = userDoc.data().nombre || 'Miembro';

    const hoy = new Date().toISOString().split('T')[0];
    const nuevaRef = db.collection('citas').doc();

    // Transaction atomica: valida slot + cancela cita previa + crea nueva
    await db.runTransaction(async (tx) => {
      // 1. Verificar que el slot no este ocupado
      const slotSnap = await tx.get(
        db.collection('citas')
          .where('fecha', '==', fecha)
          .where('hora', '==', hora)
          .where('estado', '==', 'confirmada')
      );
      if (!slotSnap.empty) {
        const err = new Error('SLOT_OCUPADO');
        err.code = 'SLOT_OCUPADO';
        throw err;
      }

      // 2. Cancelar cualquier cita activa futura del mismo miembro
      const prevSnap = await tx.get(
        db.collection('citas')
          .where('uid', '==', uid)
          .where('estado', '==', 'confirmada')
          .where('fecha', '>=', hoy)
      );
      prevSnap.docs.forEach(docRef => {
        tx.update(docRef.ref, {
          estado: 'cancelada',
          canceladaPor: 'sistema_reemplazo',
          canceladaEn: FieldValue.serverTimestamp()
        });
      });

      // 3. Crear la nueva cita
      tx.set(nuevaRef, {
        uid, nombre,
        fecha, hora,
        duracion: duracion || 15,
        estado: 'confirmada',
        recordatorioEnviado: false,
        creadaEn: FieldValue.serverTimestamp()
      });
    });

    const citaId = nuevaRef.id;

    // Notificar admins por email (inline, no bloquea respuesta)
    notificarAdminsEmail({ nombre, fecha, hora, duracion: duracion || 15 })
      .catch(e => console.warn('email admins:', e.message));

    return res.status(200).json({ citaId, ok: true });
  } catch (e) {
    console.error('POST /citas:', e);
    if (e.code === 'SLOT_OCUPADO' || e.message === 'SLOT_OCUPADO') {
      return res.status(409).json({ error: 'Este horario ya fue reservado. Elige otro.', code: 'SLOT_OCUPADO' });
    }
    return res.status(500).json({ error: e.message });
  }
}
