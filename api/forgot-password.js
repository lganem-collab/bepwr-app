// api/forgot-password.js
// Genera contraseña temporal, la actualiza en Firebase Auth, marca primerIngreso:true
// y manda email reusando /api/send-welcome
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

function genTempPassword() {
  // Cumple: 8 chars, mayús, minús, número, símbolo
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums  = '23456789';
  const syms  = '!@#$';
  const pick = s => s[Math.floor(Math.random()*s.length)];
  let pwd = pick(upper)+pick(lower)+pick(nums)+pick(syms);
  const all = upper+lower+nums+syms;
  for (let i=0; i<5; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random()-0.5).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email requerido' });

  try {
    const auth = getAuth();
    const db = getFirestore();

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      return res.status(200).json({ sent: true });
    }

    const userSnap = await db.collection('usuarios').doc(userRecord.uid).get();
    if (!userSnap.exists) {
      return res.status(200).json({ sent: true });
    }
    const userData = userSnap.data();
    const nombre = userData.nombre || userData.alias || 'Miembro';

    const tempPassword = genTempPassword();

    await auth.updateUser(userRecord.uid, { password: tempPassword });
    await db.collection('usuarios').doc(userRecord.uid).update({ primerIngreso: true });

    const host = req.headers.host || 'bepwr-app.vercel.app';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const r = await fetch(`${proto}://${host}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, password: tempPassword })
    });

    if (!r.ok) {
      const err = await r.json();
      return res.status(500).json({ error: err.error || 'Error enviando email' });
    }

    return res.status(200).json({ sent: true });

  } catch (e) {
    console.error('forgot-password error:', e);
    return res.status(500).json({ error: e.message });
  }
}
