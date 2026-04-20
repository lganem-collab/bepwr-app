// api/slots-ocupados.js
// Returns occupied time slots for a specific date (no PII exposed)
// Requires Firebase ID token authentication
// GET /api/slots-ocupados?fecha=YYYY-MM-DD
// Header: Authorization: Bearer <idToken>
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    await getAuth().verifyIdToken(token);
  } catch (e) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  const fecha = req.query.fecha;
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'fecha requerida en formato YYYY-MM-DD' });
  }

  try {
    const db = getFirestore();
    const snap = await db.collection('citas')
      .where('fecha', '==', fecha)
      .where('estado', '==', 'confirmada')
      .get();
    const ocupadas = snap.docs.map(d => d.data().hora).filter(Boolean);
    return res.status(200).json({ ocupadas });
  } catch (e) {
    console.error('slots-ocupados:', e);
    return res.status(500).json({ error: e.message });
  }
}
