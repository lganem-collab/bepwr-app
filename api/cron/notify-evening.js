// api/cron/notify-evening.js — Miércoles y Domingo 7pm (hora Querétaro = UTC-6 → 01:00 UTC siguiente día)
export default async function handler(req, res) {
  const day = new Date().getDay();

  let title, body;
  if (day === 3) {
    title = '🌆 ¡Tarde perfecta para entrenar';
    body = 'Mitad de semana — ¼ya tienes tus sesiones programadas? Reserva tu clase de hoy o mañana en bePWR.';
  } else if (day === 0) {
    title = '📅 Planea tu semana desde hoy';
    body = 'Mañana empieza una nueva semana. Reserva ya tus 2-4 sesiones y llega a tus metas.';
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
