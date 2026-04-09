import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';
const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

type TigerPayload = {
  items?: any[];
  monthly_items?: any[];
  error?: string;
  fetched_at?: string;
  updated_at?: string;
  date?: string;
  total?: number;
};

async function loadCachedPayload(date?: string): Promise<TigerPayload | null> {
  const key = date ? `tiger_links_${date}` : 'tiger_links_latest';
  const url = `${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.${encodeURIComponent(key)}&select=value&limit=1`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  if (!Array.isArray(rows) || !rows[0]?.value) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return null;
  }
}

async function saveCachePayload(date: string | undefined, payload: TigerPayload) {
  const key = date ? `tiger_links_${date}` : 'tiger_links_latest';
  const body = JSON.stringify({ key, value: JSON.stringify(payload), updated_at: new Date().toISOString() });
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/tiger_cache`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* cache save is best-effort */ }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const date = typeof req.query?.date === 'string' ? req.query.date : undefined;

  // VPS คืนแค่วันปัจจุบัน — ถ้าเลือกวันอื่นให้ดึงจาก cache อย่างเดียว
  const bkkNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const today = bkkNow.toISOString().split('T')[0];
  const isPastDate = date && date !== today;

  if (isPastDate) {
    const cached = await loadCachedPayload(date);
    if (cached) {
      return res.status(200).json({ ...cached, date });
    }
    return res.status(200).json({ items: [], monthly_items: [], date, error: 'No cached data for this date' });
  }

  try {
    const upstream = await fetch(`${VPS_BASE}`, { signal: AbortSignal.timeout(10000) });
    const data: TigerPayload = await upstream.json();
    const cached = await loadCachedPayload(date);

    const merged: TigerPayload = {
      ...cached,
      ...data,
      items: Array.isArray(data.items) && data.items.length > 0 ? data.items : cached?.items || [],
      monthly_items:
        Array.isArray(data.monthly_items) && data.monthly_items.length > 0
          ? data.monthly_items
          : cached?.monthly_items || [],
      total: Array.isArray(data.items) ? data.items.length : cached?.total || 0,
      fetched_at: data.fetched_at || cached?.fetched_at || new Date().toISOString(),
      updated_at: data.updated_at || cached?.updated_at || new Date().toISOString(),
      date: data.date || cached?.date || today,
    };

    // Save cache ทุกครั้งที่ VPS ตอบสำเร็จ — เก็บทั้ง latest + วันที่
    if (Array.isArray(data.items) && data.items.length > 0) {
      saveCachePayload(undefined, merged); // tiger_links_latest
      saveCachePayload(today, merged);     // tiger_links_YYYY-MM-DD
    }

    res.status(200).json(merged);
  } catch (err: any) {
    const cached = await loadCachedPayload(date);
    if (cached) {
      return res.status(200).json({
        ...cached,
        error: err?.message || 'VPS unreachable',
      });
    }

    res.status(200).json({
      items: [],
      monthly_items: [],
      error: err?.message || 'VPS unreachable',
      fetched_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });
  }
}
