import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const TIGER_API = '/api/tiger-links';

// Map campaign_name → staff name
const CAMPAIGN_STAFF_MAP: Record<string, string> = {
  'ly888':  'ลัน',
  'pp':     'แบงค์',
  'tg999':  'ต้น',
  'tk888':  'เก่ง',
  'mm888':  'เม่า',
};

// Map user.name (English) → STAFF name (Thai)
const USER_STAFF_MAP: Record<string, string> = {
  'Keng':   'เก่ง',
  'Bank ':  'แบงค์',
  'Bank':   'แบงค์',
  'B ':     'แบงค์',
  'Lanny':  'ลัน',
  'Mao':    'เม่า',
  'Ton':    'ต้น',
  'ต้น':    'ต้น',
};

interface TigerCampaign {
  source_name: string;
  medium_name: string;
  campaign_name: string;
  total_register: number;
  register_deposit_user: number;
  register_deposit_amount: number;
  total_deposit: number;
  total_withdraw: number;
  deposit_first_time_amount: number;
  register_first_time_deposit_amount: number;
  total_turn_winlose: number;
}

interface TigerData {
  items: TigerCampaign[];
  monthly_items: TigerCampaign[];
  fetched_at: string;
  date: string;
  error?: string;
}

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

const SUPA_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates',
};

const STAFF = ['เก่ง', 'แบงค์', 'ลัน', 'เม่า', 'ต้น'];
const TABS = ['TG', 'Huay', 'อื่นๆ'] as const;
type TabKey = typeof TABS[number];

const COLUMNS = [
  { key: 'fb', label: 'FB', editable: true },
  { key: 'google', label: 'Google', editable: true },
  { key: 'tiktok', label: 'TikTok', editable: true },
  { key: 'totalAds', label: 'รวม ADS', editable: false },
  { key: 'register', label: 'สมัคร', editable: false },
  { key: 'memberDeposit', label: 'สมาชิกฝาก', editable: false },
  { key: 'depositPct', label: '%ฝาก', editable: false },
  { key: 'firstDeposit', label: 'ฝากแรก', editable: false },
  { key: 'dailyDeposit', label: 'ฝากทั้งวัน', editable: false },
  { key: 'monthlyDeposit', label: 'ฝากทั้งเดือน', editable: false },
  { key: 'totalWithdraw', label: 'ยอดถอน', editable: false },
  { key: 'winLoss', label: 'W/L', editable: false },
  { key: 'avgPerUser', label: 'เฉลี่ย/ยูส', editable: false },
  { key: 'costPerRegister', label: 'ค่าหัว/สมัคร', editable: false },
  { key: 'costPerDeposit', label: 'ค่าหัว/ฝาก', editable: false },
];

interface RowData {
  fb: number;
  google: number;
  tiktok: number;
  totalAds: number;
  register: number;
  memberDeposit: number;
  depositPct: number;
  firstDeposit: number;
  dailyDeposit: number;
  monthlyDeposit: number;
  totalWithdraw: number;
  winLoss: number;
  avgPerUser: number;
  costPerRegister: number;
  costPerDeposit: number;
}

type MktData = Record<TabKey, Record<string, RowData>>;

interface MonthlySummaryRow {
  name: string;
  fb: number;
  google: number;
  tiktok: number;
  totalAds: number;
  register: number;
  deposit_member: number;
  first_deposit: number;
  daily_deposit: number;
  month_deposit: number;
  depositPct: number;
  total_withdraw: number;
  register_withdraw_amount: number;
}

const emptyRow = (): RowData => ({
  fb: 0, google: 0, tiktok: 0, totalAds: 0,
  register: 0, memberDeposit: 0, depositPct: 0,
  firstDeposit: 0, dailyDeposit: 0, monthlyDeposit: 0,
  totalWithdraw: 0, winLoss: 0,
  avgPerUser: 0, costPerRegister: 0, costPerDeposit: 0,
});

const initData = (): MktData => {
  const data: any = {};
  TABS.forEach(tab => {
    data[tab] = {};
    STAFF.forEach(s => { data[tab][s] = emptyRow(); });
  });
  return data as MktData;
};

const recalc = (row: RowData): RowData => {
  const totalAds = row.fb + row.google + row.tiktok;
  const depositPct = row.register > 0 ? Math.round((row.memberDeposit / row.register) * 10000) / 100 : 0;
  const winLoss = row.dailyDeposit - row.totalWithdraw;
  const avgPerUser = row.memberDeposit > 0 ? Math.round(row.firstDeposit / row.memberDeposit) : 0;
  const costPerRegister = row.register > 0 ? Math.round(totalAds / row.register) : 0;
  const costPerDeposit = row.memberDeposit > 0 ? Math.round(totalAds / row.memberDeposit) : 0;
  return { ...row, totalAds, depositPct, winLoss, avgPerUser, costPerRegister, costPerDeposit };
};

// วันที่ format DD/MM/YYYY
const toThaiDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const getMonthPrefix = (isoDate: string): string => {
  // returns "MM/YYYY" for LIKE filter
  const [y, m] = isoDate.split('-');
  return `${m}/${y}`;
};

const fmt = (n: number) => n.toLocaleString('th-TH');
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

interface WithdrawItem {
  name: string;
  withdraw: number;
  transferred: number;
  pending: number;
}

interface WithdrawData {
  date: string;
  data: WithdrawItem[];
}

// ============================================================
// Supabase helpers
// ============================================================

const supaFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...SUPA_HEADERS, ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const loadTodayData = async (thaiDate: string): Promise<MktData> => {
  const data = initData();
  try {
    const rows = await supaFetch(
      `/rest/v1/mkt_data?date=eq.${encodeURIComponent(thaiDate)}&select=*`
    );
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        const tab = row.tab as TabKey;
        if (!TABS.includes(tab)) return;
        const r: RowData = {
          fb: Number(row.fb) || 0,
          google: Number(row.google) || 0,
          tiktok: Number(row.tiktok) || 0,
          totalAds: 0,
          register: Number(row.register) || 0,
          memberDeposit: Number(row.deposit_member) || 0,
          depositPct: 0,
          firstDeposit: Number(row.first_deposit) || 0,
          dailyDeposit: Number(row.daily_deposit) || 0,
          monthlyDeposit: Number(row.month_deposit) || 0,
          avgPerUser: 0,
          costPerRegister: 0,
          costPerDeposit: 0,
        };
        data[tab][row.name] = recalc(r);
      });
    }
  } catch (e) {
    console.error('loadTodayData error:', e);
  }
  return data;
};

const upsertRow = async (thaiDate: string, tab: string, name: string, row: RowData) => {
  await supaFetch('/rest/v1/mkt_data', {
    method: 'POST',
    body: JSON.stringify({
      date: thaiDate,
      tab,
      name,
      fb: row.fb,
      google: row.google,
      tiktok: row.tiktok,
      register: row.register,
      deposit_member: row.memberDeposit,
      first_deposit: row.firstDeposit,
      daily_deposit: row.dailyDeposit,
      month_deposit: row.monthlyDeposit,
      updated_at: new Date().toISOString(),
    }),
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
  });
};

const loadMonthlySummary = async (monthPrefix: string): Promise<MonthlySummaryRow[]> => {
  // date format: DD/MM/YYYY — month prefix is MM/YYYY, use LIKE %MM/YYYY
  const rows = await supaFetch(
    `/rest/v1/mkt_data?date=like.*${encodeURIComponent(monthPrefix)}&select=name,fb,google,tiktok,register,deposit_member,first_deposit,daily_deposit,month_deposit`
  );
  if (!Array.isArray(rows)) return [];

  const map: Record<string, MonthlySummaryRow> = {};
  rows.forEach((row: any) => {
    const n = row.name;
    if (!map[n]) {
      map[n] = {
        name: n,
        fb: 0, google: 0, tiktok: 0, totalAds: 0,
        register: 0, deposit_member: 0, first_deposit: 0,
        daily_deposit: 0, month_deposit: 0, depositPct: 0,
      };
    }
    map[n].fb += Number(row.fb) || 0;
    map[n].google += Number(row.google) || 0;
    map[n].tiktok += Number(row.tiktok) || 0;
    map[n].register += Number(row.register) || 0;
    map[n].deposit_member += Number(row.deposit_member) || 0;
    map[n].first_deposit += Number(row.first_deposit) || 0;
    map[n].daily_deposit += Number(row.daily_deposit) || 0;
    // month_deposit — take max per day to avoid double-counting
    // but for simplicity we sum (user can adjust logic)
    map[n].month_deposit += Number(row.month_deposit) || 0;
  });

  return Object.values(map).map(r => ({
    ...r,
    totalAds: r.fb + r.google + r.tiktok,
    depositPct: r.register > 0 ? Math.round((r.deposit_member / r.register) * 10000) / 100 : 0,
  }));
};

// ============================================================

interface MktDashboardProps {
  defaultStaff?: string;
  isAdmin?: boolean;
  currentUserName?: string;
}

const MktDashboard: React.FC<MktDashboardProps> = ({ defaultStaff, isAdmin = true, currentUserName }) => {
  // resolve staff name จาก user.name (EN→TH)
  const resolvedStaff = !isAdmin
    ? (USER_STAFF_MAP[currentUserName?.trim() || ''] || defaultStaff || currentUserName || 'all')
    : 'all';
  const [data, setData] = useState<MktData>(initData);
  const [activeTab, setActiveTab] = useState<TabKey>('TG');
  const getBkkDate = () => {
    const bkk = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    return bkk.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getBkkDate);

  // Auto-update วันที่เมื่อเที่ยงคืน Bangkok
  useEffect(() => {
    const checkDate = setInterval(() => {
      const today = getBkkDate();
      setSelectedDate(prev => prev === today ? prev : today);
    }, 60000); // เช็คทุก 1 นาที
    return () => clearInterval(checkDate);
  }, []);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [staffFilter, setStaffFilter] = useState<string>(resolvedStaff);

  // sync staffFilter เมื่อ user เปลี่ยน (เช่นหลัง login)
  useEffect(() => {
    setStaffFilter(resolvedStaff);
  }, [isAdmin, currentUserName]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [tigerData, setTigerData] = useState<TigerData | null>(null);
  const [tigerLoading, setTigerLoading] = useState(false);
  const tigerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTiger = useCallback(async (dateOverride?: string) => {
    setTigerLoading(true);
    try {
      const dateParam = dateOverride ? `?date=${dateOverride}` : '';
      const res = await fetch(`${TIGER_API}${dateParam}`);
      const json: TigerData = await res.json();
      // ถ้า scrape ล้มเหลวแต่มี items เก่า ให้ใช้ข้อมูลเก่าต่อ ไม่ล้างตาราง
      if (json.error && (!json.items || json.items.length === 0)) {
        setTigerData(prev => prev ? { ...prev, error: json.error } : json);
        setTigerLoading(false);
        return;
      }
      setTigerData(json);

      // Auto-fill ตาราง TG tab จาก tiger data
      if (json.items && json.items.length > 0) {
        // สร้าง map ยอดฝากทั้งเดือนจาก monthly_items
        const monthlyMap: Record<string, number> = {};
        (json.monthly_items || []).forEach(item => {
          const staff = CAMPAIGN_STAFF_MAP[item.campaign_name];
          if (!staff) return;
          monthlyMap[staff] = (monthlyMap[staff] || 0) + Math.round(item.total_deposit);
        });

        // สร้าง map today items ด้วย campaign_name
        const todayMap: Record<string, TigerCampaign> = {};
        json.items.forEach(item => { todayMap[item.campaign_name] = item; });

        setData(prev => {
          const updated = { ...prev };
          const tabData = { ...updated['TG'] };

          // ใช้ monthly_items เป็นตัวหลัก — ครอบคลุมทุก campaign แม้วันนี้ไม่มี data
          const allCampaigns = new Set([
            ...json.items.map(i => i.campaign_name),
            ...(json.monthly_items || []).map(i => i.campaign_name),
          ]);

          allCampaigns.forEach(campaign => {
            const staff = CAMPAIGN_STAFF_MAP[campaign];
            if (!staff) return;
            const todayItem = todayMap[campaign];
            const merged = recalc({
              ...emptyRow(),
              register: todayItem ? todayItem.total_register : 0,
              memberDeposit: todayItem ? todayItem.register_deposit_user : 0,
              firstDeposit: todayItem ? Math.round(todayItem.deposit_first_time_amount) : 0,
              dailyDeposit: todayItem ? Math.round(todayItem.total_deposit) : 0,
              totalWithdraw: todayItem ? Math.round(todayItem.total_withdraw) : 0,
              monthlyDeposit: monthlyMap[staff] || 0,
            });
            tabData[staff] = merged;
          });

          updated['TG'] = tabData;
          return updated;
        });

        // Auto-fill monthly summary จาก Tiger monthly_items
        const monthlyRegMap: Record<string, number> = {};
        const monthlyDepMap: Record<string, number> = {};
        const monthlyMemMap: Record<string, number> = {};
        const monthlyWdMap: Record<string, number> = {};
        const monthlyWdAmtMap: Record<string, number> = {};
        (json.monthly_items || []).forEach(item => {
          const staff = CAMPAIGN_STAFF_MAP[item.campaign_name];
          if (!staff) return;
          monthlyRegMap[staff] = (monthlyRegMap[staff] || 0) + item.total_register;
          monthlyDepMap[staff] = (monthlyDepMap[staff] || 0) + Math.round(item.total_deposit);
          monthlyMemMap[staff] = (monthlyMemMap[staff] || 0) + item.register_deposit_user;
          monthlyWdMap[staff] = (monthlyWdMap[staff] || 0) + Math.round(item.total_withdraw || 0);
          monthlyWdAmtMap[staff] = (monthlyWdAmtMap[staff] || 0) + Math.round(item.register_withdraw_amount || 0);
        });

        setMonthlySummary(prev => {
          const map: Record<string, any> = {};
          // เก็บ rows ที่มีอยู่แล้ว (จาก Supabase)
          prev.forEach(r => { map[r.name] = { ...r }; });
          // merge Tiger monthly data
          STAFF.forEach(staff => {
            // แสดงทุก staff ที่มีข้อมูลใน tiger (dep หรือ reg อย่างใดอย่างหนึ่งก็พอ)
            const hasTigerData = staff in monthlyDepMap || staff in monthlyRegMap;
            if (!hasTigerData) return;
            if (!map[staff]) {
              map[staff] = {
                name: staff, fb: 0, google: 0, tiktok: 0, totalAds: 0,
                register: 0, deposit_member: 0, first_deposit: 0,
                daily_deposit: 0, month_deposit: 0, depositPct: 0,
              };
            }
            map[staff].register = monthlyRegMap[staff] || map[staff].register;
            map[staff].deposit_member = monthlyMemMap[staff] || map[staff].deposit_member;
            map[staff].month_deposit = monthlyDepMap[staff] || map[staff].month_deposit;
            map[staff].total_withdraw = monthlyWdMap[staff] || 0;
            map[staff].register_withdraw_amount = monthlyWdAmtMap[staff] || 0;
            map[staff].depositPct = map[staff].register > 0
              ? Math.round((map[staff].deposit_member / map[staff].register) * 10000) / 100
              : 0;
            map[staff].totalAds = (map[staff].fb || 0) + (map[staff].google || 0) + (map[staff].tiktok || 0);
          });
          return Object.values(map);
        });
      }
    } catch {
      // ignore
    } finally {
      setTigerLoading(false);
    }
  }, []);

  useEffect(() => {
    const bkk = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const today = bkk.toISOString().split('T')[0];
    fetchTiger(selectedDate !== today ? selectedDate : undefined);
    tigerTimer.current = setInterval(() => {
      const nowToday = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
      fetchTiger(selectedDate !== nowToday ? selectedDate : undefined);
    }, 30 * 1000); // refresh ทุก 30 วิ
    return () => { if (tigerTimer.current) clearInterval(tigerTimer.current); };
  }, [fetchTiger, selectedDate]);

  // Load today's data from Supabase on mount / date change
  useEffect(() => {
    const thaiDate = toThaiDate(selectedDate);
    setLoading(true);
    loadTodayData(thaiDate).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [selectedDate]);

  // Load monthly summary
  useEffect(() => {
    const monthPrefix = getMonthPrefix(selectedDate);
    setLoadingMonthly(true);
    loadMonthlySummary(monthPrefix).then(rows => {
      setMonthlySummary(rows);
      setLoadingMonthly(false);
    });
  }, [selectedDate]);

  // Fetch withdraw data from Supabase
  useEffect(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayStr = `${dd}/${mm}/${yyyy}`;
    fetch(`${SUPABASE_URL}/rest/v1/withdraw_log?date=eq.${todayStr}&select=name,amount,transferred,pending`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    })
      .then(r => r.json())
      .then((rows: any[]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setWithdrawData({ date: todayStr, data: rows.map(r => ({ name: r.name, withdraw: r.amount, transferred: r.transferred || 0, pending: r.pending || r.amount })) });
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  const handleChange = useCallback((staff: string, key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setData(prev => {
      const updated = { ...prev };
      const tabData = { ...updated[activeTab] };
      const row = { ...tabData[staff], [key]: num };
      tabData[staff] = recalc(row);
      updated[activeTab] = tabData;

      // Debounced upsert
      const timerKey = `${activeTab}:${staff}`;
      if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
      saveTimers.current[timerKey] = setTimeout(async () => {
        setSaving(timerKey);
        try {
          const thaiDate = toThaiDate(selectedDate);
          await upsertRow(thaiDate, activeTab, staff, tabData[staff]);
        } catch (e) {
          console.error('upsert error:', e);
        } finally {
          setSaving(null);
        }
      }, 800);

      return updated;
    });
  }, [activeTab, selectedDate]);

  const displayStaff = staffFilter === 'all' ? STAFF : STAFF.filter(s => s === staffFilter);

  const totals = displayStaff.reduce((acc, staff) => {
    const row = data[activeTab][staff];
    if (!row) return acc;
    COLUMNS.forEach(col => {
      if (['depositPct','winLoss','avgPerUser','costPerRegister','costPerDeposit'].includes(col.key)) return;
      (acc as any)[col.key] = ((acc as any)[col.key] || 0) + (row as any)[col.key];
    });
    return acc;
  }, emptyRow());

  const totalRecalced = recalc(totals);

  const displayMonthlySummary = staffFilter === 'all' ? monthlySummary : monthlySummary.filter(r => r.name === staffFilter);

  // === EXPORT EXCEL ===
  const exportMonthlyExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = displayMonthlySummary.map(r => ({
      'ชื่อ': r.name, 'FB': r.fb, 'Google': r.google, 'TikTok': r.tiktok,
      'รวม ADS': r.totalAds, 'สมัคร': r.register, 'สมาชิกฝาก': r.deposit_member,
      '%ฝาก': r.depositPct, 'ฝากแรก': r.first_deposit, 'ฝากทั้งวัน': r.daily_deposit,
      'ฝากทั้งเดือน': r.month_deposit, 'ยอดถอน': r.total_withdraw || 0,
      'ถอน R+D': r.register_withdraw_amount || 0,
    }));
    // Total row
    rows.push({
      'ชื่อ': 'รวม', 'FB': monthTotals.fb, 'Google': monthTotals.google, 'TikTok': monthTotals.tiktok,
      'รวม ADS': monthTotals.totalAds, 'สมัคร': monthTotals.register, 'สมาชิกฝาก': monthTotals.deposit_member,
      '%ฝาก': monthTotals.depositPct, 'ฝากแรก': monthTotals.first_deposit, 'ฝากทั้งวัน': monthTotals.daily_deposit,
      'ฝากทั้งเดือน': monthTotals.month_deposit, 'ยอดถอน': monthTotals.total_withdraw || 0,
      'ถอน R+D': monthTotals.register_withdraw_amount || 0,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(13).fill({ wch: 14 });
    const monthStr = selectedDate.slice(0, 7);
    XLSX.utils.book_append_sheet(wb, ws, `สรุปเดือน ${monthStr}`);
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `MKT_สรุปเดือน_${monthStr}.xlsx`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: รายวัน — ดึงจาก data state ตรงๆ (เหมือนกับที่แสดงบนตาราง)
    const dailyRows: any[] = [];
    const tabKey = activeTab;
    displayStaff.forEach(name => {
      const row = data[tabKey][name] || emptyRow();
      const r = recalc(row);
      dailyRows.push({
        'ชื่อ': name, 'FB': r.fb, 'Google': r.google, 'TikTok': r.tiktok,
        'รวม ADS': r.totalAds, 'สมัคร': r.register, 'สมาชิกฝาก': r.memberDeposit,
        '%ฝาก': r.depositPct, 'ฝากแรก': r.firstDeposit, 'ฝากทั้งวัน': r.dailyDeposit,
        'ฝากทั้งเดือน': r.monthlyDeposit, 'ยอดถอน': r.totalWithdraw,
        'W/L': r.winLoss, 'เฉลี่ย/ยูส': r.avgPerUser,
        'ค่าหัว/สมัคร': r.costPerRegister, 'ค่าหัว/ฝาก': r.costPerDeposit,
      });
    });
    // Total row
    dailyRows.push({
      'ชื่อ': 'รวม', 'FB': totalRecalced.fb, 'Google': totalRecalced.google, 'TikTok': totalRecalced.tiktok,
      'รวม ADS': totalRecalced.totalAds, 'สมัคร': totalRecalced.register, 'สมาชิกฝาก': totalRecalced.memberDeposit,
      '%ฝาก': totalRecalced.depositPct, 'ฝากแรก': totalRecalced.firstDeposit, 'ฝากทั้งวัน': totalRecalced.dailyDeposit,
      'ฝากทั้งเดือน': totalRecalced.monthlyDeposit, 'ยอดถอน': totalRecalced.totalWithdraw,
      'W/L': totalRecalced.winLoss, 'เฉลี่ย/ยูส': totalRecalced.avgPerUser,
      'ค่าหัว/สมัคร': totalRecalced.costPerRegister, 'ค่าหัว/ฝาก': totalRecalced.costPerDeposit,
    });
    const ws1 = XLSX.utils.json_to_sheet(dailyRows);
    ws1['!cols'] = Array(16).fill({ wch: 14 });
    XLSX.utils.book_append_sheet(wb, ws1, `รายวัน ${tabKey} ${selectedDate}`);

    // Sheet 2: สรุปเดือน
    if (displayMonthlySummary.length > 0) {
      const monthRows = displayMonthlySummary.map(r => ({
        'ชื่อ': r.name, 'FB': r.fb, 'Google': r.google, 'TikTok': r.tiktok,
        'รวม ADS': r.totalAds, 'สมัคร': r.register, 'สมาชิกฝาก': r.deposit_member,
        'ฝากแรก': r.first_deposit, 'ฝากทั้งวัน': r.daily_deposit, 'ฝากทั้งเดือน': r.month_deposit,
        '%ฝาก': r.depositPct,
      }));
      const ws2 = XLSX.utils.json_to_sheet(monthRows);
      ws2['!cols'] = Array(11).fill({ wch: 14 });
      XLSX.utils.book_append_sheet(wb, ws2, 'สรุปเดือน');
    }

    // Sheet 3+: ทุก tab ที่ไม่ใช่ activeTab
    TABS.filter(t => t !== tabKey).forEach(t => {
      const tData = data[t] || {};
      const tRows: any[] = [];
      displayStaff.forEach(name => {
        const row = tData[name] || emptyRow();
        const r = recalc(row);
        tRows.push({
          'ชื่อ': name, 'FB': r.fb, 'Google': r.google, 'TikTok': r.tiktok,
          'รวม ADS': r.totalAds, 'สมัคร': r.register, 'สมาชิกฝาก': r.memberDeposit,
          '%ฝาก': r.depositPct, 'ฝากแรก': r.firstDeposit, 'ฝากทั้งวัน': r.dailyDeposit,
          'ฝากทั้งเดือน': r.monthlyDeposit, 'ยอดถอน': r.totalWithdraw,
          'W/L': r.winLoss, 'เฉลี่ย/ยูส': r.avgPerUser,
          'ค่าหัว/สมัคร': r.costPerRegister, 'ค่าหัว/ฝาก': r.costPerDeposit,
        });
      });
      if (tRows.some(r => Object.values(r).some((v,i) => i > 0 && v !== 0))) {
        const ws = XLSX.utils.json_to_sheet(tRows);
        ws['!cols'] = Array(16).fill({ wch: 14 });
        XLSX.utils.book_append_sheet(wb, ws, `รายวัน ${t} ${selectedDate}`);
      }
    });

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `MKT_${selectedDate}.xlsx`);
  };

  // Monthly summary totals
  const monthTotals = displayMonthlySummary.reduce((acc, r) => ({
    fb: acc.fb + r.fb,
    google: acc.google + r.google,
    tiktok: acc.tiktok + r.tiktok,
    totalAds: acc.totalAds + r.totalAds,
    register: acc.register + r.register,
    deposit_member: acc.deposit_member + r.deposit_member,
    first_deposit: acc.first_deposit + r.first_deposit,
    daily_deposit: acc.daily_deposit + r.daily_deposit,
    month_deposit: acc.month_deposit + r.month_deposit,
    total_withdraw: acc.total_withdraw + (r.total_withdraw || 0),
    register_withdraw_amount: acc.register_withdraw_amount + (r.register_withdraw_amount || 0),
    depositPct: 0,
    name: 'รวม',
  }), { name: 'รวม', fb: 0, google: 0, tiktok: 0, totalAds: 0, register: 0, deposit_member: 0, first_deposit: 0, daily_deposit: 0, month_deposit: 0, depositPct: 0, total_withdraw: 0, register_withdraw_amount: 0 });
  monthTotals.depositPct = monthTotals.register > 0 ? Math.round((monthTotals.deposit_member / monthTotals.register) * 10000) / 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">MKT Dashboard</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-normal mt-1">ติดตามผลการตลาดรายวัน</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-xs font-bold text-emerald-500 animate-pulse">💾 กำลังบันทึก...</span>
          )}
          {loading && (
            <span className="text-xs font-bold text-blue-500 animate-pulse">⏳ กำลังโหลด...</span>
          )}
          {tigerData?.fetched_at && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
              🐯 {new Date(tigerData.fetched_at).toLocaleTimeString('th-TH')}
              {tigerLoading && <span className="ml-1 animate-pulse">⏳</span>}
            </span>
          )}
          {isAdmin && (
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">👥 ทั้งหมด</option>
              {STAFF.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            onClick={exportExcel}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-colors"
          >
            📄 ส่งออก Excel
          </button>
        </div>
      </div>

      {/* Withdraw Section */}
      {withdrawData && withdrawData.data.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-normal">💸 ยอดเบิก/โอนวันนี้</h3>
            <span className="text-[10px] font-bold text-slate-400">{withdrawData.date}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {withdrawData.data.map(item => (
              <div key={item.name} className="rounded-2xl border border-slate-100 bg-white/60 backdrop-blur-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">
                    {item.name[0]}
                  </div>
                  <span className="font-black text-slate-800 text-sm">{item.name}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">เบิก</span>
                    <span className="font-black text-slate-700">{fmt(item.withdraw)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">โอนแล้ว</span>
                    <span className="font-black text-emerald-600">{fmt(item.transferred)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">สถานะ</span>
                    {item.pending <= 0 ? (
                      <span className="font-black text-emerald-600 text-xs">✅ ครบ</span>
                    ) : (
                      <span className="font-black text-amber-500 text-xs">⏳ ค้าง {fmt(item.pending)} บาท</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-normal transition-all duration-300 ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105'
                : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-normal sticky left-0 bg-white/90 backdrop-blur-sm z-10 min-w-[80px]">
                  Staff
                </th>
                {COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right min-w-[90px]">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStaff.map((staff, idx) => {
                const row = data[activeTab][staff] || emptyRow();
                const isSaving = saving === `${activeTab}:${staff}`;
                return (
                  <tr key={staff} className={`border-b border-slate-50 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''} ${isSaving ? 'opacity-70' : ''}`}>
                    <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20">
                          {staff[0]}
                        </div>
                        {staff}
                        {isSaving && <span className="text-[9px] text-emerald-500 font-bold">💾</span>}
                        {tigerData && ([...(tigerData.items||[]), ...(tigerData.monthly_items||[])]).some(i => CAMPAIGN_STAFF_MAP[i.campaign_name] === staff) && (
                          <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-lg">🐯</span>
                        )}
                      </div>
                    </td>
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-3 py-3 text-right">
                        {col.editable ? (
                          <input
                            type="number"
                            value={(row as any)[col.key] || ''}
                            onChange={e => handleChange(staff, col.key, e.target.value)}
                            className="w-full text-right px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:border-slate-300"
                            placeholder="0"
                          />
                        ) : (
                          <span className={`font-black text-sm ${
                            col.key === 'totalAds' ? 'text-amber-600' :
                            col.key === 'depositPct' ? 'text-emerald-600' :
                            col.key === 'avgPerUser' ? 'text-blue-600' :
                            col.key === 'costPerRegister' ? 'text-purple-600' :
                            col.key === 'costPerDeposit' ? 'text-rose-600' :
                            col.key === 'totalWithdraw' ? 'text-rose-500' :
                            col.key === 'winLoss' ? ((row as any)[col.key] >= 0 ? 'text-emerald-600' : 'text-red-600') :
                            'text-slate-700'
                          }`}>
                            {col.key === 'depositPct'
                            ? fmtPct((row as any)[col.key])
                            : col.key === 'winLoss'
                              ? ((row as any)[col.key] < 0 ? `-${fmt(Math.abs((row as any)[col.key]))}` : fmt((row as any)[col.key]))
                              : fmt((row as any)[col.key])
                          }
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-slate-900/5 border-t-2 border-slate-200">
                <td className="px-4 py-4 font-black text-slate-900 sticky left-0 bg-slate-100/80 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black shadow-lg">
                      Σ
                    </div>
                    รวม
                  </div>
                </td>
                {COLUMNS.map(col => (
                  <td key={col.key} className="px-3 py-4 text-right">
                    <span className={`font-black text-sm ${
                      col.key === 'totalAds' ? 'text-amber-700' :
                      col.key === 'depositPct' ? 'text-emerald-700' :
                      'text-slate-900'
                    }`}>
                      {col.key === 'depositPct'
                    ? fmtPct(totalRecalced.depositPct)
                    : col.key === 'winLoss'
                      ? ((totalRecalced as any)[col.key] < 0 ? `-${fmt(Math.abs((totalRecalced as any)[col.key]))}` : fmt((totalRecalced as any)[col.key]))
                      : fmt((totalRecalced as any)[col.key])
                  }
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2">ค่าใช้จ่ายรวม</p>
          <p className="text-2xl font-black text-amber-600">{fmt(totalRecalced.totalAds)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2">สมัครทั้งหมด</p>
          <p className="text-2xl font-black text-blue-600">{fmt(totalRecalced.register)}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">ฝาก {fmt(totalRecalced.memberDeposit)} คน · {fmtPct(totalRecalced.depositPct)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2">ฝากทั้งวัน</p>
          <p className="text-2xl font-black text-purple-600">{fmt(totalRecalced.dailyDeposit)}</p>
          <p className="text-xs font-bold text-rose-400 mt-1">ถอน {fmt(totalRecalced.totalWithdraw)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2">W/L วันนี้</p>
          <p className={`text-2xl font-black ${totalRecalced.winLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalRecalced.winLoss < 0 ? `-${fmt(Math.abs(totalRecalced.winLoss))}` : fmt(totalRecalced.winLoss)}
          </p>
          <p className="text-xs font-bold text-slate-400 mt-1">ฝากเดือนนี้ {fmt(totalRecalced.monthlyDeposit)}</p>
        </div>
      </div>

      {/* ===== Tiger888 Links Performance ===== */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-normal">🐯 Links Performance — Tiger888</h3>
            {tigerData?.fetched_at && (
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">อัพเดทล่าสุด: {new Date(tigerData.fetched_at).toLocaleTimeString('th-TH')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tigerLoading && <span className="text-xs text-blue-400 font-bold animate-pulse">⏳ กำลังโหลด...</span>}
            <button
              onClick={fetchTiger}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-600 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {tigerData?.error && tigerData.error !== '' && (
          <div className="px-6 py-3 bg-amber-50 text-amber-600 text-xs font-bold">
            ⏳ กำลังอัพเดทข้อมูล — แสดงข้อมูลล่าสุดที่มีอยู่
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal sticky left-0 bg-white/90 z-10 min-w-[100px]">Source</th>
                <th className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal min-w-[100px]">Campaign</th>
                <th className="px-3 py-3 text-[10px] font-black text-blue-400 uppercase tracking-normal text-right">สมัคร</th>
                <th className="px-3 py-3 text-[10px] font-black text-emerald-400 uppercase tracking-normal text-right">ฝาก (คน)</th>
                <th className="px-3 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-normal text-right">%ฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-amber-400 uppercase tracking-normal text-right">FTD ยอด</th>
                <th className="px-3 py-3 text-[10px] font-black text-amber-500 uppercase tracking-normal text-right">FTD R+D</th>
                <th className="px-3 py-3 text-[10px] font-black text-purple-400 uppercase tracking-normal text-right">ยอดฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-rose-400 uppercase tracking-normal text-right">ยอดถอน</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">R+D Amount</th>
                <th className="px-3 py-3 text-[10px] font-black text-rose-300 uppercase tracking-normal text-right">ถอน คน</th>
                <th className="px-3 py-3 text-[10px] font-black text-rose-200 uppercase tracking-normal text-right">ถอน Amount</th>

              </tr>
            </thead>
            <tbody>
              {!tigerData || (tigerData.items.length === 0 && (tigerData.monthly_items||[]).length === 0) ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-400 text-sm font-bold">
                    {tigerLoading ? '⏳ กำลังดึงข้อมูล...' : 'ไม่มีข้อมูล — กด Refresh หรือรอ auto-update'}
                  </td>
                </tr>
              ) : (
                <>
                  {(() => {
                    // รวม today + monthly (เอา monthly เป็น fallback สำหรับ campaign ที่วันนี้ไม่มี)
                    const todayCampaigns = tigerData.items || [];
                    return (isAdmin
                      ? todayCampaigns
                      : todayCampaigns.filter(i => CAMPAIGN_STAFF_MAP[i.campaign_name] === staffFilter)
                    );
                  })().map((item, idx) => {
                    const depositPct = item.total_register > 0
                      ? Math.round((item.register_deposit_user / item.total_register) * 10000) / 100
                      : 0;
                    const sourceIcon = item.source_name === 'tiktok' ? '🎵' : item.source_name === 'facebook' ? '📘' : item.source_name === 'google' ? '🔍' : '📣';
                    return (
                      <tr key={idx} className={`border-b border-slate-50 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                          <span className="mr-1">{sourceIcon}</span>{item.source_name}
                          <span className="ml-1 text-[10px] text-slate-400 font-bold">/{item.medium_name}</span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-700">{item.campaign_name}</td>
                        <td className="px-3 py-3 text-right font-black text-blue-600">{fmt(item.total_register)}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-600">{fmt(item.register_deposit_user)}</td>
                        <td className="px-3 py-3 text-right font-black text-emerald-700">{fmtPct(depositPct)}</td>
                        <td className="px-3 py-3 text-right font-bold text-amber-600">{fmt(Math.round(item.deposit_first_time_amount))}</td>
                        <td className="px-3 py-3 text-right font-bold text-amber-500">{fmt(Math.round(item.register_first_time_deposit_amount))}</td>
                        <td className="px-3 py-3 text-right font-black text-purple-600">{fmt(Math.round(item.total_deposit))}</td>
                        <td className="px-3 py-3 text-right font-bold text-rose-500">{fmt(Math.round(item.total_withdraw))}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-600">{fmt(Math.round(item.register_deposit_amount))}</td>
                        <td className="px-3 py-3 text-right font-bold text-rose-300">{fmt(item.register_withdraw_user)}</td>
                        <td className="px-3 py-3 text-right font-bold text-rose-200">{fmt(Math.round(item.register_withdraw_amount))}</td>

                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {(() => {
                    const todayMap2: Record<string, TigerCampaign> = {};
                    tigerData.items.forEach(i => { todayMap2[i.campaign_name] = i; });
                    const allForTotal = [
                      ...tigerData.items,
                      ...(tigerData.monthly_items||[]).filter(i => !todayMap2[i.campaign_name]),
                    ];
                    const tot = (isAdmin || staffFilter === 'all'
                      ? allForTotal
                      : allForTotal.filter(i => CAMPAIGN_STAFF_MAP[i.campaign_name] === staffFilter)
                    ).reduce((a, i) => ({
                      total_register: a.total_register + i.total_register,
                      register_deposit_user: a.register_deposit_user + i.register_deposit_user,
                      deposit_first_time_amount: a.deposit_first_time_amount + i.deposit_first_time_amount,
                      register_first_time_deposit_amount: a.register_first_time_deposit_amount + i.register_first_time_deposit_amount,
                      total_deposit: a.total_deposit + i.total_deposit,
                      total_withdraw: a.total_withdraw + i.total_withdraw,
                      register_deposit_amount: a.register_deposit_amount + i.register_deposit_amount,
                      register_withdraw_user: a.register_withdraw_user + i.register_withdraw_user,
                      register_withdraw_amount: a.register_withdraw_amount + i.register_withdraw_amount,
                      total_turn_over: a.total_turn_over + i.total_turn_over,
                      total_turn_winlose: a.total_turn_winlose + i.total_turn_winlose,
                    }), { total_register: 0, register_deposit_user: 0, deposit_first_time_amount: 0, register_first_time_deposit_amount: 0, total_deposit: 0, total_withdraw: 0, register_deposit_amount: 0, register_withdraw_user: 0, register_withdraw_amount: 0, total_turn_over: 0, total_turn_winlose: 0 });
                    const totPct = tot.total_register > 0 ? Math.round((tot.register_deposit_user / tot.total_register) * 10000) / 100 : 0;
                    return (
                      <tr className="bg-slate-900/5 border-t-2 border-slate-200">
                        <td className="px-4 py-4 font-black text-slate-900 sticky left-0 bg-slate-100/80 z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black">Σ</div>
                            รวม
                          </div>
                        </td>
                        <td className="px-3 py-4 text-slate-400 font-bold text-xs">{allForTotal.length} campaigns</td>
                        <td className="px-3 py-4 text-right font-black text-blue-700">{fmt(tot.total_register)}</td>
                        <td className="px-3 py-4 text-right font-black text-emerald-700">{fmt(tot.register_deposit_user)}</td>
                        <td className="px-3 py-4 text-right font-black text-emerald-800">{fmtPct(totPct)}</td>
                        <td className="px-3 py-4 text-right font-black text-amber-700">{fmt(Math.round(tot.deposit_first_time_amount))}</td>
                        <td className="px-3 py-4 text-right font-black text-amber-600">{fmt(Math.round(tot.register_first_time_deposit_amount))}</td>
                        <td className="px-3 py-4 text-right font-black text-purple-700">{fmt(Math.round(tot.total_deposit))}</td>
                        <td className="px-3 py-4 text-right font-black text-rose-600">{fmt(Math.round(tot.total_withdraw))}</td>
                        <td className="px-3 py-4 text-right font-black text-slate-700">{fmt(Math.round(tot.register_deposit_amount))}</td>
                        <td className="px-3 py-4 text-right font-black text-rose-400">{fmt(tot.register_withdraw_user)}</td>
                        <td className="px-3 py-4 text-right font-black text-rose-300">{fmt(Math.round(tot.register_withdraw_amount))}</td>

                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Monthly Summary ===== */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-normal">📊 สรุปเดือนนี้</h3>
          <div className="flex items-center gap-3">
            {loadingMonthly && <span className="text-xs text-blue-400 font-bold animate-pulse">⏳ กำลังโหลด...</span>}
            <button
              onClick={exportMonthlyExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              📄 ส่งออก Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal sticky left-0 bg-white/90 z-10 min-w-[80px]">Staff</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">FB</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">Google</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">TikTok</th>
                <th className="px-3 py-3 text-[10px] font-black text-amber-500 uppercase tracking-normal text-right">รวม ADS</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">สมัคร</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">สมาชิกฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-normal text-right">%ฝาก</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">ฝากแรก</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">ฝากทั้งวัน</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-normal text-right">ฝากทั้งเดือน</th>
                <th className="px-3 py-3 text-[10px] font-black text-rose-400 uppercase tracking-normal text-right">ยอดถอน</th>
                <th className="px-3 py-3 text-[10px] font-black text-rose-300 uppercase tracking-normal text-right">ถอน R+D</th>
              </tr>
            </thead>
            <tbody>
              {displayMonthlySummary.length === 0 && !loadingMonthly ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-400 text-sm font-bold">ไม่มีข้อมูลในเดือนนี้</td>
                </tr>
              ) : (
                <>
                  {displayMonthlySummary.map((r, idx) => (
                    <tr key={r.name} className={`border-b border-slate-50 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-3 font-black text-slate-800 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
                            {r.name[0]}
                          </div>
                          {r.name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.fb)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.google)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.tiktok)}</td>
                      <td className="px-3 py-3 text-right font-black text-amber-600">{fmt(r.totalAds)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.register)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.deposit_member)}</td>
                      <td className="px-3 py-3 text-right font-black text-emerald-600">{fmtPct(r.depositPct)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.first_deposit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.daily_deposit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-700">{fmt(r.month_deposit)}</td>
                      <td className="px-3 py-3 text-right font-bold text-rose-500">{fmt(r.total_withdraw || 0)}</td>
                      <td className="px-3 py-3 text-right font-bold text-rose-400">{fmt(r.register_withdraw_amount || 0)}</td>
                    </tr>
                  ))}
                  {/* Monthly total row */}
                  {displayMonthlySummary.length > 0 && (
                    <tr className="bg-slate-900/5 border-t-2 border-slate-200">
                      <td className="px-4 py-4 font-black text-slate-900 sticky left-0 bg-slate-100/80 z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-black">Σ</div>
                          รวม
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.fb)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.google)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.tiktok)}</td>
                      <td className="px-3 py-4 text-right font-black text-amber-700">{fmt(monthTotals.totalAds)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.register)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.deposit_member)}</td>
                      <td className="px-3 py-4 text-right font-black text-emerald-700">{fmtPct(monthTotals.depositPct)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.first_deposit)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.daily_deposit)}</td>
                      <td className="px-3 py-4 text-right font-black text-slate-900">{fmt(monthTotals.month_deposit)}</td>
                      <td className="px-3 py-4 text-right font-black text-rose-600">{fmt(monthTotals.total_withdraw || 0)}</td>
                      <td className="px-3 py-4 text-right font-black text-rose-500">{fmt(monthTotals.register_withdraw_amount || 0)}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MktDashboard;
