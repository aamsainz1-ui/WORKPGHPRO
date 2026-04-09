import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

const SUPA_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

interface CampaignItem {
  campaign_name: string;
  total_register: number;
  register_deposit_user: number;
  total_deposit: number;
  total_withdraw: number;
  deposit_first_time_amount: number;
  register_withdraw_amount: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const from = req.query.from as string;
  const to = req.query.to as string;

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'Missing or invalid from/to params (YYYY-MM-DD)' });
  }

  // Generate date list
  const dates: string[] = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }

  if (dates.length > 31) {
    return res.status(400).json({ error: 'Max 31 days range' });
  }

  // ดึงจาก tiger_cache (key = tiger_links_YYYY-MM-DD)
  const keys = dates.map(dt => `tiger_links_${dt}`);
  const map: Record<string, CampaignItem> = {};

  // Fetch cache entries — batch by OR filter
  try {
    const orFilter = keys.map(k => `key.eq.${k}`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/tiger_cache?or=(${encodeURIComponent(orFilter)})&select=key,value`;
    const resp = await fetch(url, {
      headers: SUPA_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    const rows = await resp.json();

    if (Array.isArray(rows)) {
      for (const row of rows) {
        try {
          const payload = JSON.parse(row.value);
          for (const item of (payload.items || [])) {
            const key = item.campaign_name;
            if (!key) continue;
            if (!map[key]) {
              map[key] = {
                campaign_name: key,
                total_register: 0,
                register_deposit_user: 0,
                total_deposit: 0,
                total_withdraw: 0,
                deposit_first_time_amount: 0,
                register_withdraw_amount: 0,
              };
            }
            map[key].total_register += item.total_register || 0;
            map[key].register_deposit_user += item.register_deposit_user || 0;
            map[key].total_deposit += item.total_deposit || 0;
            map[key].total_withdraw += item.total_withdraw || 0;
            map[key].deposit_first_time_amount += item.deposit_first_time_amount || 0;
            map[key].register_withdraw_amount += item.register_withdraw_amount || 0;
          }
        } catch { /* skip bad cache entry */ }
      }
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch cache' });
  }

  res.status(200).json({
    from,
    to,
    days: dates.length,
    items: Object.values(map),
    fetched_at: new Date().toISOString(),
  });
}
