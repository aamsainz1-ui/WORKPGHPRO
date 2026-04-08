import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';
const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

const SUPA_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

interface StaffSummary {
  name: string;
  register: number;
  deposit_member: number;
  month_deposit: number;
  total_withdraw: number;
  first_deposit: number;
  register_withdraw_amount: number;
}

const CAMPAIGN_STAFF_MAP: Record<string, string> = {
  'ly888': 'ลัน',
  'pp': 'แบงค์',
  'tg999': 'ต้น',
  'tk888': 'เก่ง',
  'mm888': 'เม่า',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // คำนวณเดือนก่อน
  const now = new Date();
  const m = now.getMonth(); // 0-indexed, so current month
  const y = now.getFullYear();
  const prevMonth = m === 0 ? 12 : m; // 1-indexed prev month
  const prevYear = m === 0 ? y - 1 : y;
  const cacheKey = `prev_month_${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // 1. เช็ค cache ก่อน
  try {
    const cacheResp = await fetch(
      `${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.${encodeURIComponent(cacheKey)}&select=value&limit=1`,
      { headers: SUPA_HEADERS, signal: AbortSignal.timeout(5000) }
    );
    const cacheRows = await cacheResp.json();
    if (Array.isArray(cacheRows) && cacheRows[0]?.value) {
      return res.status(200).json(JSON.parse(cacheRows[0].value));
    }
  } catch {}

  // 2. ไม่มี cache — ดึงรายวันจาก Tiger API แล้วรวมยอด
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  const map: Record<string, StaffSummary> = {};

  // ดึงทีละ 5 วันพร้อมกัน
  for (let startDay = 1; startDay <= lastDay; startDay += 5) {
    const batch = [];
    for (let d = startDay; d <= Math.min(startDay + 4, lastDay); d++) {
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      batch.push(
        fetch(`${VPS_BASE}?date=${dateStr}`, { signal: AbortSignal.timeout(15000) })
          .then(r => r.json())
          .catch(() => ({ items: [] }))
      );
    }
    const results = await Promise.all(batch);
    for (const data of results) {
      for (const item of (data.items || [])) {
        const staff = CAMPAIGN_STAFF_MAP[item.campaign_name];
        if (!staff) continue;
        if (!map[staff]) {
          map[staff] = { name: staff, register: 0, deposit_member: 0, month_deposit: 0, total_withdraw: 0, first_deposit: 0, register_withdraw_amount: 0 };
        }
        map[staff].register += item.total_register || 0;
        map[staff].deposit_member += item.register_deposit_user || 0;
        map[staff].month_deposit += Math.round(item.total_deposit || 0);
        map[staff].total_withdraw += Math.round(item.total_withdraw || 0);
        map[staff].first_deposit += Math.round(item.deposit_first_time_amount || 0);
        map[staff].register_withdraw_amount += Math.round(item.register_withdraw_amount || 0);
      }
    }
  }

  const result = {
    month: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
    staff: Object.values(map),
    fetched_at: new Date().toISOString(),
  };

  // 3. บันทึก cache
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.${encodeURIComponent(cacheKey)}`, {
      method: 'DELETE', headers: SUPA_HEADERS, signal: AbortSignal.timeout(5000),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/tiger_cache`, {
      method: 'POST',
      headers: SUPA_HEADERS,
      body: JSON.stringify({ key: cacheKey, value: JSON.stringify(result), updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}

  res.status(200).json(result);
}
