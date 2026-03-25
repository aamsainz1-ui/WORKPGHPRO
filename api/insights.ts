import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = 'https://api.minimax.io/v1/chat/completions';
const MODEL = 'MiniMax-M2.7';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { records, lang } = req.body;

    const recentRecords = (records || []).slice(0, 15).map((r: any) => ({
      type: r.type,
      time: new Date(r.timestamp).toLocaleString(lang === 'TH' ? 'th-TH' : 'en-US'),
      mode: r.workMode,
      notes: r.notes
    }));

    const langText = lang === 'TH' ? 'THAI' : 'ENGLISH';

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Act as an Elite Executive HR Consultant.' },
          { role: 'user', content: `Logs: ${JSON.stringify(recentRecords)}. Professional insight in ${langText}. Max 20 words.` }
        ],
        max_tokens: 100
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || 'Excellence through consistency.';

    return res.status(200).json({ insight: text });
  } catch (error: any) {
    console.error('Insights API error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
