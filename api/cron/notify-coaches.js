export default async function handler(req, res) {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return res.status(200).json({ skipped: true, reason: 'weekend' });
  const title = '🏋️ Tu mensaje del día en bePWR';
  const body = 'Hay un nuevo consejo de coaching esperando. Ábrelo antes de tu primera clase. 💪';
  try {
    const base = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://bepwr-app.vercel.app';
    const r = await fetch(base + '/api/notify-coaches-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, url: base + '/admin.html', secret: process.env.NOTIFY_SECRET }) });
    return res.status(200).json({ ok: true, ...(await r.json()) });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}