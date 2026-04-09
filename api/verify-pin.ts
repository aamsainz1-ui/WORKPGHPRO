import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, pin } = req.body || {};
  if (!userId || !pin) return res.status(400).json({ error: 'Missing userId or pin' });

  try {
    // ดึง pin จาก Supabase โดยตรง — ไม่ส่งให้ client
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=pin`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const storedPin = rows[0].pin;
    if (!storedPin) return res.status(400).json({ error: 'No PIN set' });

    // เช็ค: hash input แล้วเทียบกับ stored (ถ้า stored เป็น hash)
    // หรือเทียบ plaintext ตรงๆ (กรณี stored ยังไม่ได้ hash)
    const pinHash = await sha256(pin + 'gw_salt_2026');
    const valid = storedPin === pinHash || storedPin === pin;

    if (valid) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
