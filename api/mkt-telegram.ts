import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';
const VPS_BASE = 'http://76.13.190.65:7890/api/links-performance';

const CAMPAIGN_STAFF: Record<string, string> = {
  ly888: 'ลัน', pp: 'แบงค์', tg999: 'ต้น', tk888: 'เก่ง', mm888: 'เม่า',
};

const fmt = (n: number) => (n ?? 0).toLocaleString('th-TH');

async function getTelegramConfig() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_settings?key=eq.telegram_config&select=value&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]?.value) return null;
  try { return JSON.parse(rows[0].value); } catch { return null; }
}

async function getTigerData() {
  try {
    const res = await fetch(VPS_BASE, { signal: AbortSignal.timeout(10000) });
    return await res.json();
  } catch {
    // fallback to cache
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tiger_cache?key=eq.tiger_links_latest&select=value&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await res.json();
    if (rows?.[0]?.value) {
      try { return JSON.parse(rows[0].value); } catch { /* bad cache */ }
    }
    return { items: [], monthly_items: [] };
  }
}

function buildMessage(data: any) {
  const bkk = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const dateStr = bkk.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const items = data.items || [];
  const monthly = data.monthly_items || [];

  // แสดงข้อมูลวันนี้เท่านั้น — คนที่ไม่มีข้อมูลวันนี้แสดง 0
  const todaySet = new Set(items.map((i: any) => i.campaign_name));
  const missingStaff = monthly
    .filter((i: any) => !todaySet.has(i.campaign_name) && CAMPAIGN_STAFF[i.campaign_name])
    .reduce((acc: Record<string, any>, i: any) => {
      if (!acc[i.campaign_name]) acc[i.campaign_name] = { ...i, total_register: 0, register_deposit_user: 0, deposit_first_time_amount: 0, total_deposit: 0, total_withdraw: 0, register_deposit_amount: 0 };
      return acc;
    }, {} as Record<string, any>);
  const allItems = [...items, ...Object.values(missingStaff)];

  let totalReg = 0, totalDep = 0, totalFTD = 0, totalWd = 0, totalDepUser = 0;

  const lines: string[] = [];
  for (const item of allItems) {
    const staff = CAMPAIGN_STAFF[item.campaign_name] || item.campaign_name;
    const reg = item.total_register || 0;
    const depUser = item.register_deposit_user || 0;
    const ftd = Math.round(item.deposit_first_time_amount || 0);
    const dep = Math.round(item.total_deposit || 0);
    const wd = Math.round(item.total_withdraw || 0);
    const pct = reg > 0 ? ((depUser / reg) * 100).toFixed(1) : '0.0';

    totalReg += reg;
    totalDepUser += depUser;
    totalFTD += ftd;
    totalDep += dep;
    totalWd += wd;

    const avgPerUser = depUser > 0 ? Math.round(dep / depUser) : 0;

    lines.push(
      `👤 *${staff}*` +
      `\n   สมัคร: ${fmt(reg)} | ฝาก: ${fmt(depUser)} (${pct}%)` +
      `\n   FTD: ${fmt(ftd)} | ฝากรวม: ${fmt(dep)} | ถอน: ${fmt(wd)}` +
      `\n   เฉลี่ย/คน: ${fmt(avgPerUser)} บาท`
    );
  }

  const totalPct = totalReg > 0 ? ((totalDepUser / totalReg) * 100).toFixed(1) : '0.0';
  const wl = totalDep - totalWd;

  let msg = `📊 *สรุป MKT Dashboard*\n📅 ${dateStr}\n\n`;
  msg += lines.join('\n\n');
  msg += `\n\n━━━━━━━━━━━━━━━\n`;
  msg += `*🏆 รวมทั้งหมด*\n`;
  msg += `สมัคร: *${fmt(totalReg)}* | ฝาก: *${fmt(totalDepUser)}* (${totalPct}%)\n`;
  msg += `FTD: *${fmt(totalFTD)}* | ฝากรวม: *${fmt(totalDep)}*\n`;
  msg += `ถอน: *${fmt(totalWd)}* | W/L: *${fmt(wl)}*`;

  return msg;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const config = await getTelegramConfig();
    if (!config?.bot_token || !config?.chat_id) {
      return res.status(400).json({ ok: false, error: 'กรุณาตั้งค่า Bot Token และ Chat ID ใน Admin Hub ก่อน' });
    }

    const tigerData = await getTigerData();
    const message = buildMessage(tigerData);

    const tgRes = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      return res.status(400).json({ ok: false, error: tgJson.description || 'Telegram API error' });
    }

    res.status(200).json({ ok: true, message: 'ส่งสำเร็จ' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
