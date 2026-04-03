// api/send-cita.js – maneja confirmacion, cancelacion y reporte de citas
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipo = 'confirmacion', nombre, fecha, hora, emailMiembro, citas } = req.body || {};
  console.log('SEND_CITA_BODY:', JSON.stringify({tipo,nombre,fecha,hora,emailMiembro}));
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado' });

  const FROM = 'bePWR <citas@bepwr.vip>';
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DIAS  = ['domingo','lunes','martes','mi\u00E9rcoles','jueves','viernes','s\u00E1bado'];
  function fechaLegible(f, h) {
    const [y,m,d] = f.split('-').map(Number);
    const fd = new Date(y, m-1, d);
    return DIAS[fd.getDay()] + ' ' + d + ' de ' + MESES[m-1] + ' de ' + y + (h ? ' a las ' + h : '');
  }

  try {
    let to, subject, html;

    if (tipo === 'reporte') {
      const lista = citas || [];
      to = ['lganem@gmail.com'];
      subject = 'Reporte de citas pr\u00F3ximas \u00B7 bePWR';
      html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#ffffff;padding:20px;border-radius:12px 12px 0 0;text-align:center;border-bottom:1px solid #e0e0e0">
          <h1 style="color:#1a1a1a;margin:0;font-size:22px">be<span style="color:#FF5C1A;font-weight:900">PWR</span></h1>
          <p style="color:#888;margin:4px 0 0;font-size:13px">Valoraciones pr\u00F3ximas</p>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0">
          <p style="font-size:15px;color:#333">Hola <strong>Staff</strong>,</p>
          ${lista.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr style="background:#eee"><th style="padding:8px;text-align:left">Fecha</th><th style="padding:8px;text-align:left">Hora</th><th style="padding:8px;text-align:left">Miembro</th></tr>
            ${lista.map(c=>`<tr style="border-bottom:1px solid #e0e0e0"><td style="padding:8px">${fechaLegible(c.fecha,'')}</td><td style="padding:8px">${c.hora}</td><td style="padding:8px">${c.nombre||'\u2014'}</td></tr>`).join('')}
          </table>` : '<p style="color:#666">No hay citas pr\u00F3ximas agendadas.</p>'}
          <p style="font-size:12px;color:#999;margin-top:20px;text-align:center">bePWR Functional Training \u00B7 Quer\u00E9taro, M\u00E9xico<br>\u00BFNo deseas recibir estos correos? <a href="mailto:citas@bepwr.vip?subject=Cancelar%20suscripci%C3%B3n" style="color:#999;text-decoration:underline">Haz clic aqu\u00ED</a></p>
        </div></div>`;
    } else {
      if (!nombre || !fecha || !hora) return res.status(400).json({ error: 'Faltan datos' });
      const fl = fechaLegible(fecha, hora);
      const cancel = tipo === 'cancelacion';
      to = ['lganem@gmail.com'];
      if (emailMiembro && emailMiembro !== 'lganem@gmail.com') to.push(emailMiembro);
      subject = cancel ? `Cita cancelada \u00B7 ${nombre} \u00B7 ${fl}` : `Valoraci\u00F3n agendada \u00B7 ${nombre} \u00B7 ${fl}`;
      html = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#ffffff;padding:20px;border-radius:12px 12px 0 0;text-align:center;border-bottom:1px solid ${cancel?'#f5c6c6':'#c8e6c9'}">
          <h1 style="color:#1a1a1a;margin:0;font-size:22px">be<span style="color:#FF5C1A;font-weight:900">PWR</span></h1>
          <p style="color:${cancel?'#e74c3c':'#1D9E75'};font-weight:600;margin:4px 0 0;font-size:13px">${cancel?'Cita cancelada':'Valoraci\u00F3n confirmada'}</p>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0">
          <p style="font-size:15px;color:#333">Hola <strong>${nombre}</strong>,</p>
          <p style="font-size:15px;color:#333">${cancel?'Tu cita de valoraci\u00F3n ha sido cancelada:':'Tu cita de valoraci\u00F3n ha sido agendada:'}</p>
          <div style="background:${cancel?'#FCEBEB':'#EAF3DE'};border-radius:10px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:20px;font-weight:700;color:${cancel?'#e74c3c':'#1D9E75'}">${fl}</div>
          </div>
          ${cancel ? '<p style="color:#666;font-size:13px">Puedes agendar una nueva cita desde la app cuando quieras.</p>'
          : `<div style="background:white;border-radius:10px;padding:16px;border:1px solid #e8e8e8">
              <p style="font-weight:600;color:#333;margin:0 0 10px">Recomendaciones:</p>
              <ul style="color:#555;font-size:13px;line-height:1.8;margin:0;padding-left:20px">
                <li>Ayuno de 2 a 4 horas (sin alimentos ni l\u00EDquidos)</li>
                <li>Evita ejercicio intenso 12 horas antes</li>
                <li>Ve al ba\u00F1o antes de la medici\u00F3n</li>
                <li>Usa ropa ligera, sin accesorios met\u00E1licos</li>
              </ul></div>`}
          <p style="font-size:12px;color:#999;margin-top:20px;text-align:center">bePWR Functional Training \u00B7 Quer\u00E9taro, M\u00E9xico<br>\u00BFNo deseas recibir estos correos? <a href="mailto:citas@bepwr.vip?subject=Cancelar%20suscripci%C3%B3n" style="color:#999;text-decoration:underline">Haz clic aqu\u00ED</a></p>
        </div></div>`;
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html })
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.message || 'Error Resend');
    return res.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    console.error('send-cita error:', err);
    return res.status(500).json({ error: err.message });
  }
}