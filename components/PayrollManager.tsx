
import React, { useState, useMemo } from 'react';
import { PayrollRecord, CompensationSettings, OrganizationMember, Language } from '../types';

interface PayrollManagerProps {
    members: OrganizationMember[];
    payroll: PayrollRecord[];
    compensation: CompensationSettings[];
    onUpdateCompensation: (data: CompensationSettings) => void;
    onProcessPayroll: (data: Omit<PayrollRecord, 'id'>) => void;
    lang: Language;
}

const PayrollManager: React.FC<PayrollManagerProps> = ({ members, payroll, compensation, onUpdateCompensation, onProcessPayroll, lang }) => {
    const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
    const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'HISTORY'>('MANAGEMENT');

    const selectedMember = useMemo(() => members.find(m => m.id === selectedMemberId), [members, selectedMemberId]);
    const memberCompensation = useMemo(() =>
        compensation.find(c => c.employeeId === selectedMemberId) || { id: '', employeeId: selectedMemberId, baseSalary: 0, commissionRate: 0, allowances: 0 }
        , [compensation, selectedMemberId]);

    const memberHistory = useMemo(() =>
        payroll.filter(p => p.employeeId === selectedMemberId).sort((a, b) => b.month.localeCompare(a.month))
        , [payroll, selectedMemberId]);

    const [editComp, setEditComp] = useState<CompensationSettings>(memberCompensation);

    React.useEffect(() => {
        setEditComp(memberCompensation);
    }, [memberCompensation]);

    const handleSaveComp = () => {
        onUpdateCompensation(editComp);
    };

    const [processData, setProcessData] = useState({
        month: new Date().toISOString().slice(0, 7),
        bonus: 0,
        deductions: 0,
        notes: ''
    });

    const totalPayable = useMemo(() => {
        return editComp.baseSalary + editComp.allowances + processData.bonus - processData.deductions;
    }, [editComp, processData]);

    const handleProcess = () => {
        onProcessPayroll({
            employeeId: selectedMemberId,
            month: processData.month,
            baseSalary: editComp.baseSalary,
            commission: 0, // In real world this would calculate based on sales
            bonus: processData.bonus,
            deductions: processData.deductions,
            netPayable: totalPayable,
            status: 'PLEDGED',
            notes: processData.notes
        });
        setActiveTab('HISTORY');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {lang === Language.TH ? 'ระบบบริหารเงินเดือนและค่าตอบแทน' : 'Payroll & Compensation'}
                    </h2>
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mt-2">
                        Enterprise Grade Financial Operations
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('MANAGEMENT')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        {lang === Language.TH ? 'จัดการเงินเดือน' : 'Management'}
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        {lang === Language.TH ? 'ประวัติการเงิน' : 'History'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar Member List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-4 px-2">Select Employee</p>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {members.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => setSelectedMemberId(member.id)}
                                    className={`w-full flex items-center space-x-4 p-4 rounded-3xl transition-all ${selectedMemberId === member.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    <img src={member.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                    <div className="text-left overflow-hidden">
                                        <p className="text-xs font-black truncate">{member.name}</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-normal truncate ${selectedMemberId === member.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                            {member.position}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-8 flex flex-col space-y-8">
                    {activeTab === 'MANAGEMENT' ? (
                        <>
                            {/* Compensation Settings Card */}
                            <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {lang === Language.TH ? 'กำหนดอัตราเงินเดือน' : 'Compensation Profile'}
                                    </h3>
                                    <button
                                        onClick={handleSaveComp}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-normal hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                                    >
                                        {lang === Language.TH ? 'บันทึกโครงสร้าง' : 'Update Structure'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal block">Base Monthly Salary (฿)</label>
                                        <input
                                            type="number"
                                            value={editComp.baseSalary}
                                            onChange={e => setEditComp({ ...editComp, baseSalary: parseInt(e.target.value) || 0 })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal block">Fixed Allowances (฿)</label>
                                        <input
                                            type="number"
                                            value={editComp.allowances}
                                            onChange={e => setEditComp({ ...editComp, allowances: parseInt(e.target.value) || 0 })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal block">Commission Rate (%)</label>
                                        <input
                                            type="number"
                                            value={editComp.commissionRate}
                                            onChange={e => setEditComp({ ...editComp, commissionRate: parseInt(e.target.value) || 0 })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                                        />
                                    </div>
                                    <div className="bg-emerald-50 rounded-2xl p-6 flex flex-col justify-center border border-emerald-100">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-normal mb-1">Standard Monthly Payout</p>
                                        <p className="text-3xl font-black text-emerald-700">฿{(editComp.baseSalary + editComp.allowances).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Processing Card */}
                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-900/40">
                                <h3 className="text-2xl font-black tracking-tight mb-8">
                                    {lang === Language.TH ? 'ประมวลผลจ่ายเงินเดือน' : 'Process Monthly Payroll'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal block">Processing Month</label>
                                        <input
                                            type="month"
                                            value={processData.month}
                                            onChange={e => setProcessData({ ...processData, month: e.target.value })}
                                            className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 font-black text-white focus:outline-none focus:ring-1 ring-white/30"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal block">Extra Bonus (฿)</label>
                                        <input
                                            type="number"
                                            value={processData.bonus}
                                            onChange={e => setProcessData({ ...processData, bonus: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 font-black text-white focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-normal block">Deductions (฿)</label>
                                        <input
                                            type="number"
                                            value={processData.deductions}
                                            onChange={e => setProcessData({ ...processData, deductions: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 font-black text-white focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-white/10">
                                    <div className="text-center md:text-left">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-1">Net Payable Amount</p>
                                        <p className="text-5xl font-black text-emerald-400 tracking-tighter">฿{totalPayable.toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={handleProcess}
                                        className="w-full md:w-auto px-12 py-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[2rem] font-black uppercase tracking-normal text-xs transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-3"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{lang === Language.TH ? 'ยืนยันการทำรายการ' : 'Confirm Payroll'}</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* History Tab */
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
                            <div className="p-10 border-b border-slate-50">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment History</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mt-1">Audit Log for {selectedMember?.name}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-normal">
                                            <th className="px-10 py-5">Month</th>
                                            <th className="px-10 py-5">Net Pay</th>
                                            <th className="px-10 py-5">Status</th>
                                            <th className="px-10 py-5">Items</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {memberHistory.map(rec => (
                                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-10 py-6 font-black text-slate-900 text-sm italic">{rec.month}</td>
                                                <td className="px-10 py-6 font-black text-slate-900 text-sm">฿{rec.netPayable.toLocaleString()}</td>
                                                <td className="px-10 py-6">
                                                    <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-normal ${rec.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {rec.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-[9px] font-bold text-slate-400">
                                                    B: {rec.baseSalary} | Bn: {rec.bonus} | D: {rec.deductions}
                                                </td>
                                            </tr>
                                        ))}
                                        {memberHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-10 py-20 text-center text-slate-300 italic font-bold">No payment records found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayrollManager;

