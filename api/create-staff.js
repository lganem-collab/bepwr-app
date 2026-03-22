// api/create-staff.js — Creates staff Firebase Auth user + Firestore doc + sends welcome email
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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, rol, secret } = req.body || {};

  if (secret !== process.env.NOTIFY_SECRET) return res.status(401).json({ error: 'No autorizado' });
  if (!nombre || !email || !rol) return res.status(400).json({ error: 'nombre, email y rol son requeridos' });

  try {
    // Generate simple password: FirstName + 4 digits
    const firstName = nombre.split(' ')[0];
    const pw = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() + Math.floor(1000 + Math.random() * 9000);

    // Create Firebase Auth user (server-side — does NOT log out current admin)
    const userRecord = await getAuth().createUser({ email, password: pw, displayName: nombre });
    const uid = userRecord.uid;

    // Save to Firestore staff collection
    const db = getFirestore();
    await db.collection('staff').doc(uid).set({
      nombre, email, rol, activo: true,
      creadoEn: new Date().toISOString()
    });

    // Send welcome email via Resend
    const magicUrl = `https://bepwr-app.vercel.app/admin.html?e=${encodeURIComponent(email)}&p=${encodeURIComponent(pw)}`;
    const primerNombre = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'bePWR <bienvenida@bepwr.vip>',
        to: [email],
        subject: `Bienvenido al equipo bePWR, ${primerNombre} 🔥`,
        html: `
          <div style="background:#0a0a0a;padding:40px 24px;font-family:Arial,sans-serif;color:#f5f5f5;max-width:560px;margin:0 auto">
            <div style="text-align:center;margin-bottom:32px">
              <span style="font-size:36px;font-weight:900">
                <span style="color:#fff">be</span><span style="color:#FF5C1A">PWR</span>
              </span>
            </div>
            <div style="background:#181818;border:1px solid #2a2a2a;border-radius:20px;padding:32px">
              <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">👋 Bienvenido, ${primerNombre}</h1>
              <p style="color:#888;font-size:13px;font-family:monospace;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">Tu acceso al panel staff está listo</p>
              <div style="background:#0a0a0a;border:1px solid #FF5C1A;border-radius:12px;padding:20px;margin-bottom:24px">
                <div style="margin-bottom:12px">
                  <span style="font-size:10px;color:#888;font-family:monospace;letter-spacing:2px;text-transform:uppercase">Email</span>
                  <div style="font-size:15px;color:#fff;margin-top:4px">${email}</div>
                </div>
                <div>
                  <span style="font-size:10px;color:#888;font-family:monospace;letter-spacing:2px;text-transform:uppercase">Contraseña temporal</span>
                  <div style="font-size:20px;color:#FF5C1A;font-family:monospace;letter-spacing:3px;margin-top:4px">${pw}</div>
                </div>
              </div>
              <p style="font-size:13px;color:#888;margin:0 0 24px">⚠️ Por seguridad, cambia tu contraseña al ingresar por primera vez.</p>
              <div style="text-align:center">
                <a href="${magicUrl}" style="display:inline-block;background:#FF5C1A;color:#fff;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:15px;font-weight:700">
                  Entrar al panel →
                </a>
              </div>
            </div>
            <p style="text-align:center;color:#444;font-size:11px;font-family:monospace;margin-top:24px">
              bePWR Studio · Querétaro, México
            </p>
          </div>
        `
      })
    });

    return res.status(200).json({ ok: true, uid });
  } catch(e) {
    const msg = e.code === 'auth/email-already-exists' ? 'Este email ya tiene una cuenta' : e.message;
    return res.status(500).json({ error: msg });
  }
}
