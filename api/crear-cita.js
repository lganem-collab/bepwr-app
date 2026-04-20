// api/crear-cita.js
// Server-side atomic cita creation with slot availability check and race condition prevention
// POST /api/crear-cita
// Body: { fecha: 'YYYY-MM-DD', hora: 'HH:MM', duracion: 15 }
// Header: Authorization: Bearer <idToken>
//
// En una transaction:
//  1. Valida que el slot (fecha+hora) no este ocupado
//  2. Cancela cualquier cita futura activa del mismo miembro (una cita por miembro)
//  3. Crea la nueva cita
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify auth
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

  const { fecha, hora, duracion } = req.body || {};
  if (!fecha || !hora || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return res.status(400).json({ error: 'fecha (YYYY-MM-DD) y hora (HH:MM) son requeridas' });
  }

  const db = getFirestore();

  try {
    // Get user name
    const userDoc = await db.collection('usuarios').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    const nombre = userDoc.data().nombre || 'Miembro';

    const hoy = new Date().toISOString().split('T')[0];

    // Atomic transaction: check slot + cancel previous + create new
    const nuevaRef = db.collection('citas').doc();
    await db.runTransaction(async (tx) => {
      // 1. Verificar que el slot no este ocupado
      const slotQuery = db.collection('citas')
        .where('fecha', '==', fecha)
        .where('hora', '==', hora)
        .where('estado', '==', 'confirmada');
      const slotSnap = await tx.get(slotQuery);
      if (!slotSnap.empty) {
        const err = new Error('SLOT_OCUPADO');
        err.code = 'SLOT_OCUPADO';
        throw err;
      }

      // 2. Cancelar cualquier cita activa futura del mismo miembro
      const prevQuery = db.collection('citas')
        .where('uid', '==', uid)
        .where('estado', '==', 'confirmada')
        .where('fecha', '>=', hoy);
      const prevSnap = await tx.get(prevQuery);
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

    // Notificar admins (fire and forget, no bloquear al usuario si esto falla)
    try {
      const host = req.headers.host;
      const proto = host && host.includes('localhost') ? 'http' : 'https';
      await fetch(`${proto}://${host}/api/notify-cita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, fecha, hora, duracion: duracion || 15, citaId })
      });
    } catch (e) { console.warn('notify-cita:', e.message); }

    return res.status(200).json({ citaId, ok: true });
  } catch (e) {
    console.error('crear-cita:', e);
    if (e.code === 'SLOT_OCUPADO' || e.message === 'SLOT_OCUPADO') {
      return res.status(409).json({ error: 'Este horario ya fue reservado. Elige otro.', code: 'SLOT_OCUPADO' });
    }
    return res.status(500).json({ error: e.message });
  }
}
