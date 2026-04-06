import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';
const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

const CAMPAIGN_STAFF: Record<string, string> = {
  ly888: 'ลัน', pp: 'แบงค์', tg999: 'ต้น', tk888: 'เก่ง', mm888: 'เม่า',
};

async function fetchDay(date: string) {
  try {
    const res = await fetch(`${VPS_BASE}?date=${date}`, { signal: AbortSignal.timeout(8000) });
    return await res.json();
  } catch {
    // fallback to cache
    try {
      const key = `tiger_links_${date}`;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      if (rows?.[0]?.value) return JSON.parse(rows[0].value);
    } catch {}
    return { items: [] };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const days = Math.min(Number(req.query.days) || 7, 30);

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - i * 86400000);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Fetch all days in parallel
  const results = await Promise.all(dates.map(d => fetchDay(d)));

  // Also fetch MKT ads data from Supabase for ROI
  const mktRows: any[] = [];
  try {
    const allDates = dates.map(d => {
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    });
    // Fetch all mkt_data for these dates
    const queryDates = allDates.map(d => `date.eq.${encodeURIComponent(d)}`).join(',');
    const mktRes = await fetch(
      `${SUPABASE_URL}/rest/v1/mkt_data?or=(${queryDates})&select=date,name,fb,google,tiktok`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const mktData = await mktRes.json();
    if (Array.isArray(mktData)) mktRows.push(...mktData);
  } catch {}

  const history = dates.map((date, idx) => {
    const data = results[idx];
    const items = data?.items || [];

    // Aggregate per staff
    const staffData: Record<string, any> = {};
    for (const item of items) {
      const staff = CAMPAIGN_STAFF[item.campaign_name];
      if (!staff) continue;
      if (!staffData[staff]) staffData[staff] = { register: 0, deposit_user: 0, deposit_amount: 0, ftd: 0, withdraw: 0 };
      staffData[staff].register += item.total_register || 0;
      staffData[staff].deposit_user += item.register_deposit_user || 0;
      staffData[staff].deposit_amount += Math.round(item.total_deposit || 0);
      staffData[staff].ftd += Math.round(item.deposit_first_time_amount || 0);
      staffData[staff].withdraw += Math.round(item.total_withdraw || 0);
    }

    // Total
    const total = { register: 0, deposit_user: 0, deposit_amount: 0, ftd: 0, withdraw: 0, ads: 0 };
    Object.values(staffData).forEach((s: any) => {
      total.register += s.register;
      total.deposit_user += s.deposit_user;
      total.deposit_amount += s.deposit_amount;
      total.ftd += s.ftd;
      total.withdraw += s.withdraw;
    });

    // ADS cost from mkt_data
    const [y, m, dd] = date.split('-');
    const thaiDate = `${dd}/${m}/${y}`;
    const dayMkt = mktRows.filter(r => r.date === thaiDate);
    dayMkt.forEach(r => {
      total.ads += (Number(r.fb) || 0) + (Number(r.google) || 0) + (Number(r.tiktok) || 0);
    });

    return { date, staff: staffData, total };
  });

  res.status(200).json({ history, dates });
}
