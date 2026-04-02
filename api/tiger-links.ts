import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const dateParam = req.query?.date ? `?date=${req.query.date}` : '';
    const upstream = await fetch(`${VPS_BASE}${dateParam}`, { signal: AbortSignal.timeout(10000) });
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(200).json({
      items: [],
      monthly_items: [],
      error: err?.message || 'VPS unreachable',
      fetched_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });
  }
}
