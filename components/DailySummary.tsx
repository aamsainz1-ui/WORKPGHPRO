
import React, { useState, useMemo } from 'react';
import { DailySummaryRecord, Language, UserProfile } from '../types';

interface DailySummaryProps {
    records: DailySummaryRecord[];
    members: UserProfile[];
    onAdd: (record: Omit<DailySummaryRecord, 'id'>) => void;
    onDelete: (id: string) => void;
    lang: Language;
}

const DailySummary: React.FC<DailySummaryProps> = ({ records, members, onAdd, onDelete, lang }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [filterEmployee, setFilterEmployee] = useState<'ALL' | string>('ALL');
    const [showExport, setShowExport] = useState(false);
    const [exportPeriod, setExportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
    const [exportEmployee, setExportEmployee] = useState<'ALL' | string>('ALL');
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({
        employeeId: members[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        fb: 0, google: 0, tiktok: 0, registrations: 0, depositors: 0,
        firstDeposit: 0, fullDayDeposit: 0, fullMonthDeposit: 0
    });

    const filteredRecords = useMemo(() => {
        if (filterEmployee === 'ALL') return records;
        return records.filter(r => r.employeeId === filterEmployee);
    }, [records, filterEmployee]);

    const totals = filteredRecords.reduce((acc, r) => ({
        fb: acc.fb + r.fb,
        google: acc.google + r.google,
        tiktok: acc.tiktok + r.tiktok,
        registrations: acc.registrations + r.registrations,
        depositors: acc.depositors + r.depositors,
        firstDeposit: acc.firstDeposit + r.firstDeposit,
        fullDayDeposit: acc.fullDayDeposit + r.fullDayDeposit,
        fullMonthDeposit: acc.fullMonthDeposit + r.fullMonthDeposit
    }), { fb: 0, google: 0, tiktok: 0, registrations: 0, depositors: 0, firstDeposit: 0, fullDayDeposit: 0, fullMonthDeposit: 0 });

    const formatCurrency = (val: number) => `฿${val.toLocaleString()}`;

    const getEmployeeName = (id: string) => members.find(m => m.id === id)?.name || (lang === Language.TH ? 'ไม่ระบุ' : 'Unknown');

    const exportToCSV = () => {
        // Calculate date range based on period selection
        let startDate = new Date();
        let endDate = new Date();

        if (exportPeriod === 'daily') {
            startDate = new Date();
            endDate = new Date();
        } else if (exportPeriod === 'weekly') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (exportPeriod === 'monthly') {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (exportPeriod === 'custom') {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        }

        // Filter records by date range and employee
        const exportRecords = records.filter(r => {
            const recordDate = new Date(r.date);
            const inDateRange = recordDate >= startDate && recordDate <= endDate;
            const matchesEmployee = exportEmployee === 'ALL' || r.employeeId === exportEmployee;
            return inDateRange && matchesEmployee;
        });

        if (exportRecords.length === 0) {
            alert(lang === Language.TH ? 'ไม่มีข้อมูลในช่วงเวลาที่เลือก' : 'No data in selected period');
            return;
        }

        // CSV Headers
        const headers = lang === Language.TH
            ? ["พนักงาน", "วันที่", "FB", "Google", "TikTok", "รวม Ads", "สมัคร", "สมาชิกฝาก", "%ฝาก", "ฝากแรก", "ฝากทั้งวัน", "ฝากทั้งเดือน", "เฉลี่ย/ยูส"]
            : ["Employee", "Date", "FB", "Google", "TikTok", "Total Ads", "Registrations", "Depositors", "Deposit %", "First Deposit", "Full Day", "Full Month", "Avg/User"];

        // CSV Rows
        const csvRows = exportRecords.map(r => {
            const totalAds = r.fb + r.google + r.tiktok;
            const depositRate = r.registrations > 0 ? (r.depositors / r.registrations) * 100 : 0;
            const avgPerUser = r.depositors > 0 ? r.firstDeposit / r.depositors : 0;

            return [
                getEmployeeName(r.employeeId),
                new Date(r.date).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US'),
                r.fb,
                r.google,
                r.tiktok,
                totalAds,
                r.registrations,
                r.depositors,
                Math.round(depositRate * 10) / 10 + '%',
                r.firstDeposit,
                r.fullDayDeposit,
                r.fullMonthDeposit,
                Math.round(avgPerUser * 100) / 100
            ];
        });

        // Calculate totals
        const totals = exportRecords.reduce((acc, r) => ({
            fb: acc.fb + r.fb,
            google: acc.google + r.google,
            tiktok: acc.tiktok + r.tiktok,
            registrations: acc.registrations + r.registrations,
            depositors: acc.depositors + r.depositors,
            firstDeposit: acc.firstDeposit + r.firstDeposit,
            fullDayDeposit: acc.fullDayDeposit + r.fullDayDeposit,
            fullMonthDeposit: acc.fullMonthDeposit + r.fullMonthDeposit
        }), { fb: 0, google: 0, tiktok: 0, registrations: 0, depositors: 0, firstDeposit: 0, fullDayDeposit: 0, fullMonthDeposit: 0 });

        const totalRow = [
            lang === Language.TH ? 'รวมทั้งหมด' : 'TOTAL',
            '',
            totals.fb,
            totals.google,
            totals.tiktok,
            totals.fb + totals.google + totals.tiktok,
            totals.registrations,
            totals.depositors,
            (totals.registrations > 0 ? (totals.depositors / totals.registrations) * 100 : 0).toFixed(1) + '%',
            totals.firstDeposit,
            totals.fullDayDeposit,
            totals.fullMonthDeposit,
            (totals.depositors > 0 ? totals.firstDeposit / totals.depositors : 0).toFixed(2)
        ];

        // Create CSV content
        const csvContent = "\ufeff" + [headers, ...csvRows, totalRow].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `DailySummary_${exportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExport(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{lang === Language.TH ? 'ตารางสรุปรายวัน' : 'Daily Summary Dashboard'}</h2>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-normal mt-1">Operational Performance Hub</p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        className="bg-white border border-slate-200 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-normal text-slate-600 outline-none shadow-sm"
                        title="Filter by Employee"
                    >
                        <option value="ALL">{lang === Language.TH ? 'พนักงานทุกคน' : 'All Employees'}</option>
                        {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-black transition-all shadow-xl"
                    >
                        {lang === Language.TH ? '+ เพิ่มข้อมูล' : '+ Add Entry'}
                    </button>
                    <button
                        onClick={() => setShowExport(true)}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-emerald-700 transition-all shadow-xl flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{lang === Language.TH ? 'ส่งออกข้อมูล' : 'Export Data'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-[#0f172a] rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1400px] border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-normal">
                                <th className="px-6 py-5 border-b border-white/5">พนักงาน (Staff)</th>
                                <th className="px-6 py-5 border-b border-white/5">วันที่ (Date)</th>
                                <th className="px-6 py-5 border-b border-white/5">FB</th>
                                <th className="px-6 py-5 border-b border-white/5">Google</th>
                                <th className="px-6 py-5 border-b border-white/5">TikTok</th>
                                <th className="px-6 py-5 border-b border-white/5 text-purple-400">รวม Ads</th>
                                <th className="px-6 py-5 border-b border-white/5 text-green-400">สมัคร</th>
                                <th className="px-6 py-5 border-b border-white/5 text-green-400">สมาชิกฝาก</th>
                                <th className="px-6 py-5 border-b border-white/5">%ฝาก</th>
                                <th className="px-6 py-5 border-b border-white/5">ฝากแรก</th>
                                <th className="px-6 py-5 border-b border-white/5">ฝากทั้งวัน</th>
                                <th className="px-6 py-5 border-b border-white/5">ฝากทั้งเดือน</th>
                                <th className="px-6 py-5 border-b border-white/5 text-amber-400">เฉลี่ย/ยูส</th>
                                <th className="px-6 py-5 border-b border-white/5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredRecords.map((r) => {
                                const totalAds = r.fb + r.google + r.tiktok;
                                const depositRate = r.registrations > 0 ? (r.depositors / r.registrations) * 100 : 0;
                                const avgPerUser = r.depositors > 0 ? r.firstDeposit / r.depositors : 0;

                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-6">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{getEmployeeName(r.employeeId)}</p>
                                        </td>
                                        <td className="px-6 py-6 text-[11px] font-bold text-slate-300 tabular-nums">
                                            {new Date(r.date).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.fb)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.google)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.tiktok)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-purple-400 tabular-nums">{formatCurrency(totalAds)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-green-400 tabular-nums">{r.registrations} 人</td>
                                        <td className="px-6 py-6 text-xs font-black text-green-400 tabular-nums">{r.depositors} 人</td>
                                        <td className="px-6 py-6 text-xs font-black text-amber-500 tabular-nums">{depositRate.toFixed(1)}%</td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.firstDeposit)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.fullDayDeposit)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-pink-500 tabular-nums">{formatCurrency(r.fullMonthDeposit)}</td>
                                        <td className="px-6 py-6 text-xs font-black text-amber-400 tabular-nums">{formatCurrency(avgPerUser)}</td>
                                        <td className="px-6 py-6 text-center">
                                            <button
                                                onClick={() => onDelete(r.id)}
                                                className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                                title="Delete Record"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Footer Totals */}
                            <tr className="bg-purple-900/40 border-t-2 border-purple-500/50">
                                <td colSpan={2} className="px-6 py-6 text-[10px] font-black text-white uppercase tracking-normal">{lang === Language.TH ? 'รวมทั้งหมด' : 'Grand Totals'}</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.fb)}</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.google)}</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.tiktok)}</td>
                                <td className="px-6 py-6 text-xs font-black text-purple-200 tabular-nums">{formatCurrency(totals.fb + totals.google + totals.tiktok)}</td>
                                <td className="px-6 py-6 text-xs font-black text-green-200 tabular-nums">{totals.registrations}</td>
                                <td className="px-6 py-6 text-xs font-black text-green-200 tabular-nums">{totals.depositors}</td>
                                <td className="px-6 py-6 text-xs font-black text-amber-200 tabular-nums">{(totals.registrations > 0 ? (totals.depositors / totals.registrations) * 100 : 0).toFixed(1)}%</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.firstDeposit)}</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.fullDayDeposit)}</td>
                                <td className="px-6 py-6 text-xs font-black text-white tabular-nums">{formatCurrency(totals.fullMonthDeposit)}</td>
                                <td className="px-6 py-6 text-xs font-black text-amber-200 tabular-nums">{formatCurrency(totals.depositors > 0 ? totals.firstDeposit / totals.depositors : 0)}</td>
                                <td className="px-6 py-6"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{lang === Language.TH ? 'เพิ่มบันทึกรายวัน' : 'Add Daily Log'}</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Responsible Employee</label>
                                <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900" title="Employee">
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Date</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900" title="Date" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">FB Ads</label>
                                <input type="number" value={form.fb} onChange={e => setForm({ ...form, fb: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="FB" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Google Ads</label>
                                <input type="number" value={form.google} onChange={e => setForm({ ...form, google: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Google" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">TikTok Ads</label>
                                <input type="number" value={form.tiktok} onChange={e => setForm({ ...form, tiktok: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="TikTok" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Registrations</label>
                                <input type="number" value={form.registrations} onChange={e => setForm({ ...form, registrations: parseInt(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Registrations" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Depositors (People)</label>
                                <input type="number" value={form.depositors} onChange={e => setForm({ ...form, depositors: parseInt(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Depositors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">First Deposit Amount</label>
                                <input type="number" value={form.firstDeposit} onChange={e => setForm({ ...form, firstDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="First Deposit" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Full Day Deposit</label>
                                <input type="number" value={form.fullDayDeposit} onChange={e => setForm({ ...form, fullDayDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Full Day" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Full Month Deposit</label>
                                <input type="number" value={form.fullMonthDeposit} onChange={e => setForm({ ...form, fullMonthDeposit: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" title="Full Month" />
                            </div>

                        </div>
                        <div className="flex space-x-4 mt-8">
                            <button onClick={() => setShowAdd(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-normal">Cancel</button>
                            <button
                                onClick={() => {
                                    onAdd(form);
                                    setShowAdd(false);
                                }}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal shadow-lg"
                            >
                                Save Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showExport && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">
                            {lang === Language.TH ? 'ส่งออกข้อมูลสรุปรายวัน' : 'Export Daily Summary'}
                        </h3>
                        <div className="space-y-6">
                            {/* Period Selection */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">
                                    {lang === Language.TH ? 'ช่วงเวลา' : 'Period'}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setExportPeriod('daily')}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${exportPeriod === 'daily'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {lang === Language.TH ? 'วันนี้' : 'Today'}
                                    </button>
                                    <button
                                        onClick={() => setExportPeriod('weekly')}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${exportPeriod === 'weekly'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {lang === Language.TH ? '7 วันล่าสุด' : 'Last 7 Days'}
                                    </button>
                                    <button
                                        onClick={() => setExportPeriod('monthly')}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${exportPeriod === 'monthly'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {lang === Language.TH ? '30 วันล่าสุด' : 'Last 30 Days'}
                                    </button>
                                    <button
                                        onClick={() => setExportPeriod('custom')}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${exportPeriod === 'custom'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {lang === Language.TH ? 'กำหนดเอง' : 'Custom Range'}
                                    </button>
                                </div>
                            </div>

                            {/* Custom Date Range */}
                            {exportPeriod === 'custom' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal mb-2 block">
                                            {lang === Language.TH ? 'วันเริ่มต้น' : 'Start Date'}
                                        </label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm"
                                            title="Start Date"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal mb-2 block">
                                            {lang === Language.TH ? 'วันสิ้นสุด' : 'End Date'}
                                        </label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-sm"
                                            title="End Date"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Employee Selection */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">
                                    {lang === Language.TH ? 'พนักงาน' : 'Employee'}
                                </label>
                                <select
                                    value={exportEmployee}
                                    onChange={(e) => setExportEmployee(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900"
                                    title="Select Employee"
                                >
                                    <option value="ALL">{lang === Language.TH ? 'พนักงานทุกคน' : 'All Employees'}</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={() => setShowExport(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-slate-200 transition-all"
                                >
                                    {lang === Language.TH ? 'ยกเลิก' : 'Cancel'}
                                </button>
                                <button
                                    onClick={exportToCSV}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-emerald-700 transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>{lang === Language.TH ? 'ส่งออก CSV' : 'Export CSV'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailySummary;

