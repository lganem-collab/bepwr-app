import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const DAILY_LIMIT = 3;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, maxTokens, uid } = req.body;

    // Check daily limit if uid provided
    if (uid) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const ref = db.collection('ai_usage').doc(`${uid}_${today}`);
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : { count: 0, lastMessage: '' };

      // If limit reached, return cached last message
      if (data.count >= DAILY_LIMIT && data.lastMessage) {
        return res.status(200).json({ message: data.lastMessage, cached: true });
      }

      // Generate new message
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

      const aiData = await response.json();
      const message = aiData?.content?.[0]?.text || '';

      // Save count + last message
      await ref.set({ count: (data.count || 0) + 1, lastMessage: message, uid, date: today }, { merge: true });

      return res.status(200).json({ message });
    }

    // No uid - just generate without limit
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
