// api/notify-cita.js
// Notifica a los admins por email cuando un miembro agenda una cita
// Env vars requeridas: RESEND_API_KEY, ADMIN_EMAILS (emails separados por coma)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, fecha, hora, duracion, citaId } = req.body || {};
  if (!nombre || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan datos: nombre, fecha, hora son requeridos' });
  }

  // Formatear fecha legible
  const [y, m, d] = fecha.split('-');
  const dias = ['Dom', 'Lun', 'Mar', 'Mi\u00E9', 'Jue', 'Vie', 'S\u00E1b'];
  const fObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const fechaLabel = `${dias[fObj.getDay()]} ${d}/${m}/${y}`;

  // Destinatarios desde env var ADMIN_EMAILS
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!adminEmails.length) {
    console.error('ADMIN_EMAILS no configurado');
    return res.status(500).json({ error: 'ADMIN_EMAILS no configurado en Vercel' });
  }

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
    const data = await r.json();
    if (!r.ok) {
      console.error('Resend error:', data);
      return res.status(r.status).json({ error: data.message || 'Error Resend' });
    }
    return res.status(200).json({ sent: true, id: data.id });
  } catch (e) {
    console.error('notify-cita error:', e);
    return res.status(500).json({ error: e.message });
  }
}
