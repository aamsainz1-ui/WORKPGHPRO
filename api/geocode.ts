import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = 'https://api.minimax.io/v1/chat/completions';
const MODEL = 'MiniMax-M2.7';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { lat, lng } = req.body;

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You translate coordinates into prestigious zone names. Reply with max 3 words only.' },
          { role: 'user', content: `Translate Lat: ${lat}, Lng: ${lng} into a prestigious zone name.` }
        ],
        max_tokens: 30
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || 'Innovation Hub';

    return res.status(200).json({ location: text });
  } catch (error: any) {
    console.error('Geocode API error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
