// api/chat.js — AI message generation with 3/day limit per user (no Firebase Admin)
const DAILY_LIMIT = 3;
const PROJECT_ID = 'bepwr-app';

async function getUsage(uid, today) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/ai_usage/${uid}_${today}`;
    const r = await fetch(url);
    if (!r.ok) return { count: 0, lastMessage: '' };
    const doc = await r.json();
    return {
      count: parseInt(doc.fields?.count?.integerValue || 0),
      lastMessage: doc.fields?.lastMessage?.stringValue || ''
    };
  } catch(e) { return { count: 0, lastMessage: '' }; }
}

async function setUsage(uid, today, count, lastMessage, idToken) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/ai_usage/${uid}_${today}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          count: { integerValue: count },
          lastMessage: { stringValue: lastMessage },
          uid: { stringValue: uid },
          date: { stringValue: today }
        }
      })
    });
  } catch(e) { /* non-critical */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, maxTokens, uid, idToken } = req.body;

    // Check daily limit
    if (uid) {
      const today = new Date().toISOString().slice(0, 10);
      const usage = await getUsage(uid, today);

      if (usage.count >= DAILY_LIMIT && usage.lastMessage) {
        // Return cached last message — don't call AI
        return res.status(200).json({ message: usage.lastMessage });
      }

      // Generate new AI message
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens || 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const message = data?.content?.[0]?.text || '';

      // Save usage (non-blocking)
      if (idToken) setUsage(uid, today, (usage.count || 0) + 1, message, idToken);

      return res.status(200).json({ message });
    }

    // No uid — generate without limit (admin/staff use)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return res.status(200).json({ message: data?.content?.[0]?.text || '' });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
