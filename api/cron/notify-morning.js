// api/cron/notify-morning.js — Lunes y Viernes 6am (hora Querétaro = UTC-6 → 12:00 UTC)
export default async function handler(req, res) {
  // Vercel verifica el header Authorization con CRON_SECRET automáticamente
  const day = new Date().getDay(); // 0=Dom, 1=Lun, 5=Vie

  let title, body;
  if (day === 1) {
    title = '💪 ¡Nueva semana en bePWR!';
    body = 'Empieza con todo. Reserva tus 2-4 clases de esta semana y mantìn el ritmo hacia tu meta.';
  } else if (day === 5) {
    title = '🔥 ¡Cierra la semana fuerte!';
    body = 'Es viernes — el mejor día para sumar una sesión más. Reserva tu clase y termina la semana en bePWR.';
  } else {
    return res.status(200).json({ skipped: true, day });
  }

  try {
    const response = await fetch(`${process.env.VERCEL_URL ? 'https://'+process.env.VERCEL_URL : 'https://bepwr-app.vercel.app'}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: 'https://bepwr-app.vercel.app', target: 'all', secret: process.env.NOTIFY_SECRET })
    });
    const data = await response.json();
    return res.status(200).json({ ok: true, day, ...data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
