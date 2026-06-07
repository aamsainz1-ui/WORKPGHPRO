import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';
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
  total_turnover: number;
  total_winloss: number;
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

  const map: Record<string, CampaignItem> = {};
  const cachedDates = new Set<string>();

  // Fetch tab assignments from mkt_data สำหรับ date range นี้
  const tabMap: Record<string, string> = {}; // campaign_name => tab
  try {
    const dateLikePatterns = dates.map(d => {
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    });
    const orFilter = dateLikePatterns.map(p => `date.like.*${encodeURIComponent(p)}`).join(',');
    const mktRes = await fetch(
      `${SUPABASE_URL}/rest/v1/mkt_data?or=(${orFilter})&select=name,tab`,
      { headers: SUPA_HEADERS, signal: AbortSignal.timeout(10000) }
    );
    const mktRows = await mktRes.json();
    if (Array.isArray(mktRows)) {
      mktRows.forEach(row => {
        const name = row.name?.toLowerCase?.() || '';
        const tab = row.tab || 'TG';
        const campKey = Object.entries({
          'ly888': 'ลัน', 'pp': 'แบงค์', 'tg999': 'ต้น',
          'tk888': 'เก่ง', 'mm888': 'เม่า'
        }).find(([k, v]) => v === name)?.[0];
        if (campKey) tabMap[campKey] = tab;
      });
    }
  } catch { /* use default TG */ }

  // ลองดึงจาก tiger_cache ก่อน
  try {
    const keys = dates.map(dt => `tiger_links_${dt}`);
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
          const dateFromKey = row.key.replace('tiger_links_', '');
          cachedDates.add(dateFromKey);
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
                total_turnover: 0,
                total_winloss: 0,
              };
            }
            map[key].total_register += item.total_register || 0;
            map[key].register_deposit_user += item.register_deposit_user || 0;
            map[key].total_deposit += item.total_deposit || 0;
            map[key].total_withdraw += item.total_withdraw || 0;
            map[key].deposit_first_time_amount += item.deposit_first_time_amount || 0;
            map[key].register_withdraw_amount += item.register_withdraw_amount || 0;
            map[key].total_turnover += item.total_turnover || item.total_turn_over || 0;
            map[key].total_winloss += item.total_winloss || item.total_turn_winlose || 0;
          }
        } catch { /* skip bad cache entry */ }
      }
    }
  } catch { /* fallback to VPS for all */ }

  // Fallback: ดึงจาก VPS API สำหรับวันที่ไม่มี cache
  const missingDates = dates.filter(d => !cachedDates.has(d));
  if (missingDates.length > 0) {
    try {
      const vpsResults = await Promise.all(
        missingDates.map(date =>
          fetch(`${VPS_BASE}?date=${date}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.json())
            .catch(() => ({ items: [] }))
        )
      );

      for (const payload of vpsResults) {
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
              total_turnover: 0,
              total_winloss: 0,
            };
          }
          map[key].total_register += item.total_register || 0;
          map[key].register_deposit_user += item.register_deposit_user || 0;
          map[key].total_deposit += item.total_deposit || 0;
          map[key].total_withdraw += item.total_withdraw || 0;
          map[key].deposit_first_time_amount += item.deposit_first_time_amount || 0;
          map[key].register_withdraw_amount += item.register_withdraw_amount || 0;
          map[key].total_turnover += item.total_turnover || item.total_turn_over || 0;
          map[key].total_winloss += item.total_winloss || item.total_turn_winlose || 0;
        }
      }
    } catch { /* VPS also failed, return what we have */ }
  }

  // Add tab info to response
  const itemsWithTab = Object.values(map).map(item => ({
    ...item,
    tab: tabMap[item.campaign_name] || 'TG',
  }));

  res.status(200).json({
    from,
    to,
    days: dates.length,
    items: itemsWithTab,
    fetched_at: new Date().toISOString(),
  });
}
