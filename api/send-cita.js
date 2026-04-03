// api/send-cita.js
// Envía email de confirmación de cita via Resend
// Temporalmente siempre CC a lganem@gmail.com

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, fecha, hora, email, emailMiembro } = req.body || {};
  if (!nombre || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado' });

  // Formatear fecha legible
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const dias  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const [y,m,d] = fecha.split('-').map(Number);
  const fd = new Date(y, m-1, d);
  const fechaLegible = dias[fd.getDay()] + ' ' + d + ' de ' + meses[m-1] + ' de ' + y + ' a las ' + hora;

  const recipients = ['lganem@gmail.com'];
  if (emailMiembro && emailMiembro !== 'lganem@gmail.com') recipients.push(emailMiembro);

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
      <div style="background:#1D9E75;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">bePWR</h1>
        <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:13px;">Valoración confirmada</p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;">
        <p style="font-size:15px;color:#333;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size:15px;color:#333;">Tu cita de valoración ha sido agendada:</p>
        <div style="background:#EAF3DE;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#1D9E75;">${fechaLegible}</div>
        </div>
        <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e8e8e8;">
          <p style="font-weight:600;color:#333;margin:0 0 10px;">Recomendaciones:</p>
          <ul style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px;">
            <li>Ayuno de 2 a 4 horas (sin alimentos ni líquidos)</li>
            <li>Evita ejercicio intenso 12 horas antes</li>
            <li>Ve al baño antes de la medición</li>
            <li>Usa ropa ligera, sin accesorios metálicos</li>
          </ul>
        </div>
        <p style="font-size:12px;color:#999;margin-top:20px;text-align:center;">bePWR Functional Training · Querétaro</p>
      </div>
    </div>`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'bePWR <noreply@bepwr.com.mx>',
        to: recipients,
        subject: `Valoración agendada · ${nombre} · ${fechaLegible}`,
        html
      })
    });
    const result = await emailRes.json();
    if (!emailRes.ok) throw new Error(result.message || 'Error Resend');
    return res.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    console.error('send-cita error:', err);
    return res.status(500).json({ error: err.message });
  }
}