// api/send-report.js
// Genera y envia reporte diario de citas por email via Resend
// Env vars: RESEND_API_KEY, ADMIN_EMAILS (emails separados por coma)
// Body: { trigger: 'manual'|'cron', citas: [{nombre,fecha,hora,duracion}] }
// Cron: llamado desde GitHub Actions con Authorization: Bearer CRON_SECRET

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verificar auth para llamadas de cron
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  const { trigger = 'manual', citas = [] } = req.body || {};

  // Si viene de cron, validar el secret
  if (trigger === 'cron') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!adminEmails.length) {
    return res.status(500).json({ error: 'ADMIN_EMAILS no configurado en Vercel' });
  }

  // Formatear fecha de hoy para el titulo
  const hoy = new Date();
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaHoy = `${hoy.getDate()} de ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
  const dias = ['Dom','Lun','Mar','Mi\u00E9','Jue','Vie','S\u00E1b'];

  // Construir filas de la tabla
  const filas = citas.length
    ? citas.map(c => {
        const [y, m, d] = (c.fecha || '').split('-');
        let fechaLabel = c.fecha || '';
        try {
          const fObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          fechaLabel = `${dias[fObj.getDay()]} ${d}/${m}/${y}`;
        } catch(e) {}
        return `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #222;font-size:14px">${fechaLabel}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #222;font-size:14px;font-family:monospace;color:#FF5C1A">${c.hora || ''}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #222;font-size:14px">${c.nombre || '&#x2014;'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #222;font-size:13px;color:#888">${c.duracion || 15} min</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:24px;text-align:center;color:#666;font-size:14px">No hay citas pr\u00F3ximas agendadas.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reporte de Citas bePWR</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'DM Sans',Arial,sans-serif;color:#ffffff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 16px">
    <tr><td>
      <div style="text-align:center;margin-bottom:28px">
        <span style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:4px;color:#FF5C1A">bePWR</span>
        <div style="font-size:11px;letter-spacing:3px;color:#666;margin-top:2px">REPORTE DE CITAS</div>
      </div>

      <div style="background:#1a1a1a;border-radius:16px;padding:24px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <div style="font-size:13px;color:#FF5C1A;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">&#x1F4CB; Pr\u00F3ximas Valoraciones</div>
            <div style="font-size:12px;color:#666">Generado el ${fechaHoy}</div>
          </div>
          <div style="background:#FF5C1A;color:#fff;border-radius:10px;padding:6px 14px;font-size:22px;font-weight:700;font-family:monospace">${citas.length}</div>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;background:#111">
          <thead>
            <tr style="background:#0f0f0f">
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#666;letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Fecha</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#666;letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Hora</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#666;letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Miembro</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;color:#666;letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Dur.</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px">
        <a href="https://bepwr-app.vercel.app/admin.html" style="display:inline-block;padding:14px 32px;background:#FF5C1A;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:1px">
          Abrir panel admin
        </a>
      </div>

      <div style="text-align:center;font-size:11px;color:#444;letter-spacing:1px">
        bePWR &middot; Quer\u00E9taro, M\u00E9xico &middot; Este reporte se genera autom\u00E1ticamente
      </div>
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
        subject: `\uD83D\uDCCB Reporte de citas bePWR \u2014 ${citas.length} pr\u00F3xima${citas.length !== 1 ? 's' : ''}`,
        html
      })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Resend error:', data);
      return res.status(r.status).json({ error: data.message || 'Error Resend' });
    }
    return res.status(200).json({ sent: true, id: data.id, total: citas.length });
  } catch (e) {
    console.error('send-report error:', e);
    return res.status(500).json({ error: e.message });
  }
}
