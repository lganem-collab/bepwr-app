// api/send-delete-code.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);
const MASTER_UID = '1zZIfBnLGqRiPKVRVfHxlt2O3Di2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    if (decoded.uid !== MASTER_UID) return res.status(403).json({ error: 'Solo el master puede borrar la bitacora' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Codigo requerido' });

    const user = await getAuth().getUser(MASTER_UID);
    const email = user.email;

    const { error } = await resend.emails.send({
      from: 'bePWR <bienvenida@bepwr.vip>',
      to: email,
      subject: 'Codigo de confirmacion - Borrar Bitacora bePWR',
      html: `
        <div style="background:#0a0a0a;padding:40px 24px;font-family:Arial,sans-serif;color:#f5f5f5;max-width:480px;margin:0 auto">
          <div style="text-align:center;margin-bottom:32px">
            <span style="font-size:32px;font-weight:900">
              <span style="color:#ffffff">be</span><span style="color:#FF5C1A">PWR</span>
            </span>
          </div>
          <div style="background:#181818;border:1px solid #2a2a2a;border-radius:16px;padding:28px;text-align:center">
            <div style="font-size:16px;font-weight:700;margin-bottom:8px">Confirmacion de borrado</div>
            <div style="font-size:13px;color:#888;margin-bottom:24px">Ingresa este codigo en la app para borrar la bitacora:</div>
            <div style="background:#0a0a0a;border:2px solid #FF5C1A;border-radius:12px;padding:20px;margin-bottom:20px">
              <div style="font-size:40px;font-weight:700;color:#FF5C1A;font-family:monospace;letter-spacing:10px">${code}</div>
            </div>
            <div style="font-size:12px;color:#666">Si no solicitaste esto, ignora este mensaje.</div>
          </div>
        </div>
      `
    });

    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('send-delete-code error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
