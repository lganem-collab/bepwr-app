// api/send-delete-code.js
// Simple endpoint - no Firebase Admin, just sends email via Resend
// Security: only accepts requests with the correct internal secret

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, email, secret } = req.body || {};

  // Validate
  if (!code || !email) return res.status(400).json({ error: 'code y email requeridos' });
  if (secret !== process.env.NOTIFY_SECRET) return res.status(401).json({ error: 'No autorizado' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'bePWR <bienvenida@bepwr.vip>',
        to: [email],
        subject: 'Código de confirmación — Borrar Bitácora bePWR',
        html: `
          <div style="background:#0a0a0a;padding:40px 24px;font-family:Arial,sans-serif;color:#f5f5f5;max-width:480px;margin:0 auto">
            <div style="text-align:center;margin-bottom:32px">
              <span style="font-size:32px;font-weight:900">
                <span style="color:#fff">be</span><span style="color:#FF5C1A">PWR</span>
              </span>
            </div>
            <div style="background:#181818;border:1px solid #2a2a2a;border-radius:16px;padding:28px;text-align:center">
              <div style="font-size:16px;font-weight:700;margin-bottom:8px">Confirmación de borrado</div>
              <div style="font-size:13px;color:#888;margin-bottom:24px">Ingresa este código en la app para borrar la bitácora:</div>
              <div style="background:#0a0a0a;border:2px solid #FF5C1A;border-radius:12px;padding:20px;margin-bottom:20px">
                <div style="font-size:40px;font-weight:700;color:#FF5C1A;font-family:monospace;letter-spacing:10px">${code}</div>
              </div>
              <div style="font-size:12px;color:#666">Si no solicitaste esto, ignora este mensaje.</div>
            </div>
          </div>
        `
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.message || data.name || 'Error Resend');
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('send-delete-code:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
