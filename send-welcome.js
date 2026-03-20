// api/send-welcome.js
// Sends welcome email to new bePWR members via Resend
// Required env vars: RESEND_API_KEY (set in Vercel)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, nombre, password } = req.body || {};

  if (!email || !nombre || !password) {
    return res.status(400).json({ error: 'email, nombre y password son requeridos' });
  }

  const primerNombre = nombre.split(' ')[0];

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a bePWR</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'DM Sans',Arial,sans-serif;color:#f5f5f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px">
    <tr>
      <td>
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px">
          <span style="font-size:36px;font-weight:900;letter-spacing:-1px">
            <span style="color:#ffffff">be</span><span style="color:#FF5C1A">PWR</span><sup style="font-size:16px;color:#FF5C1A">&#xAE;</sup>
          </span>
        </div>

        <!-- Greeting -->
        <div style="background:#181818;border:1px solid #2a2a2a;border-radius:20px;padding:32px">
          <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">
            &#x1F44B; Bienvenido, ${primerNombre}
          </h1>
          <p style="color:#888;font-size:13px;font-family:'Space Mono',monospace;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px">
            Tu acceso a bePWR est&#xE1; listo
          </p>

          <p style="font-size:15px;line-height:1.6;color:#ccc;margin:0 0 24px">
            Ya tienes acceso a tu perfil en bePWR. Aqu&#xED; est&#xE1;n tus credenciales de acceso inicial:
          </p>

          <!-- Credentials box -->
          <div style="background:#0a0a0a;border:1px solid #FF5C1A;border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="margin-bottom:12px">
              <span style="font-size:10px;color:#888;font-family:'Space Mono',monospace;letter-spacing:2px;text-transform:uppercase">Email</span>
              <div style="font-size:15px;color:#fff;margin-top:4px">${email}</div>
            </div>
            <div>
              <span style="font-size:10px;color:#888;font-family:'Space Mono',monospace;letter-spacing:2px;text-transform:uppercase">Contrase&#xF1;a temporal</span>
              <div style="font-size:20px;color:#FF5C1A;font-family:'Space Mono',monospace;letter-spacing:3px;margin-top:4px">${password}</div>
            </div>
          </div>

          <p style="font-size:13px;color:#888;margin:0 0 24px;line-height:1.6">
            &#x26A0;&#xFE0F; Por seguridad, te pediremos que cambies tu contrase&#xF1;a al ingresar por primera vez.
          </p>

          <!-- CTA -->
          <div style="text-align:center">
            <a href="https://bepwr-app.vercel.app"
               style="display:inline-block;background:#FF5C1A;color:white;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:15px;font-weight:700">
              Entrar a bePWR &#x2192;
            </a>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align:center;color:#444;font-size:11px;font-family:'Space Mono',monospace;margin-top:24px;letter-spacing:1px">
          bePWR Studio &bull; Quer&#xE9;taro, M&#xE9;xico &bull; bepwr.com
        </p>
      </td>
    </tr>
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
        from: 'bePWR <bienvenida@bepwr.vip>',
        to: [email],
        subject: `Bienvenido a bePWR, ${primerNombre} \u{1F525}`,
        html
      })
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('Resend error:', data);
      return res.status(r.status).json({ error: data.message || 'Error al enviar email' });
    }

    return res.status(200).json({ sent: true, id: data.id });

  } catch (e) {
    console.error('send-welcome error:', e);
    return res.status(500).json({ error: e.message });
  }
}
