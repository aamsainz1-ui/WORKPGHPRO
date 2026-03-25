
import React, { useMemo } from 'react';
import { UserProfile, AttendanceRecord, LeaveRecord, AttendanceType, Language } from '../types';

interface ProfileProps {
  user: UserProfile;
  records: AttendanceRecord[];
  leaves: LeaveRecord[];
  lang: Language;
  onResetFaceID: () => void;
  onChangePIN?: (oldPin: string, newPin: string) => boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, records, leaves, lang, onResetFaceID, onChangePIN }) => {
  const [showChangePIN, setShowChangePIN] = React.useState(false);
  const [oldPin, setOldPin] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [pinError, setPinError] = React.useState('');
  const [pinSuccess, setPinSuccess] = React.useState(false);

  const handleChangePIN = () => {
    setPinError('');
    setPinSuccess(false);
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError(lang === Language.TH ? 'PIN ต้อง 4-6 หลัก' : 'PIN must be 4-6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(lang === Language.TH ? 'PIN ไม่ตรงกัน' : 'PINs do not match');
      return;
    }
    if (onChangePIN && onChangePIN(oldPin, newPin)) {
      setPinSuccess(true);
      setOldPin(''); setNewPin(''); setConfirmPin('');
      setTimeout(() => { setShowChangePIN(false); setPinSuccess(false); }, 1500);
    } else {
      setPinError(lang === Language.TH ? 'PIN เดิมไม่ถูกต้อง' : 'Current PIN is incorrect');
    }
  };
  const stats = useMemo(() => {
    const now = new Date();
    
    // คำนวณวันเริ่มต้นของสัปดาห์นี้ (วันจันทร์)
    const getMonday = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };
    const startOfWeek = getMonday(new Date(now));

    // จัดกลุ่มประวัติเป็นกะการทำงาน (Check-in คู่กับ Check-out)
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
    const shifts: { start: number, end: number }[] = [];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].type === AttendanceType.CHECK_IN && sorted[i + 1].type === AttendanceType.CHECK_OUT) {
        shifts.push({ start: sorted[i].timestamp, end: sorted[i + 1].timestamp });
      }
    }

    // คำนวณชั่วโมงรายสัปดาห์
    const weeklyMs = shifts
      .filter(s => s.start >= startOfWeek)
      .reduce((acc, s) => acc + (s.end - s.start), 0);

    // คำนวณชั่วโมงรายเดือน
    const monthlyMs = shifts
      .filter(s => {
        const d = new Date(s.start);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, s) => acc + (s.end - s.start), 0);

    const workedDays = new Set(records
      .filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .map(r => new Date(r.timestamp).toDateString())
    ).size;

    return {
      weeklyHours: (weeklyMs / 3600000).toFixed(1),
      monthlyHours: (monthlyMs / 3600000).toFixed(1),
      workedDays,
      approvedLeaves: leaves.filter(l => l.status === 'APPROVED').length
    };
  }, [records, leaves]);

  const handleResetFaceID = () => {
    const confirmMsg = lang === Language.TH 
      ? "คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ต Face ID? คุณจะต้องลงทะเบียนใบหน้าใหม่ในการเข้างานครั้งถัดไป" 
      : "Are you sure you want to reset your Face ID? You will need to re-register your face on your next clock-in.";
    
    if (window.confirm(confirmMsg)) {
      onResetFaceID();
    }
  };

  const t = {
    officialBadge: lang === Language.TH ? 'พนักงานระดับทางการ' : 'Official Employee',
    empId: lang === Language.TH ? 'รหัสพนักงาน' : 'Employee ID',
    joinDate: lang === Language.TH ? 'วันที่เริ่มงาน' : 'Join Date',
    weeklyHours: lang === Language.TH ? 'ชั่วโมงงานสัปดาห์นี้' : 'Hours This Week',
    monthlyHours: lang === Language.TH ? 'ชั่วโมงงานเดือนนี้' : 'Hours This Month',
    workedDays: lang === Language.TH ? 'วันที่มาทำงาน' : 'Worked Days',
    leaveCount: lang === Language.TH ? 'จำนวนวันลา' : 'Leave Count',
    leaveQuota: lang === Language.TH ? 'โควตาวันลาประจำปี' : 'Annual Leave Quota',
    securitySettings: lang === Language.TH ? 'ความปลอดภัยและการตั้งค่า' : 'Security & Settings',
    resetFaceID: lang === Language.TH ? 'รีเซ็ตข้อมูลใบหน้า (Face ID)' : 'Reset Face ID Registration',
    faceRegistered: lang === Language.TH ? 'ลงทะเบียนแล้ว' : 'Biometric Registered',
    faceNotRegistered: lang === Language.TH ? 'ยังไม่ได้ลงทะเบียน' : 'Not Registered'
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 sm:p-8 hidden sm:block">
           <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-normal border border-blue-100">
             {t.officialBadge}
           </span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
          <div className="relative">
            <img src={user.avatar} alt={user.name} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-slate-50 shadow-lg object-cover" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-green-500 border-4 border-white rounded-full"></div>
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{user.name}</h2>
            <p className="text-blue-600 font-bold tracking-wide uppercase text-[10px] sm:text-xs">{user.position} • {user.department}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 sm:mt-8 pt-6 border-t border-slate-100">
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-normal">{t.empId}</p>
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-700">{user.employeeId}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-normal">{t.joinDate}</p>
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-700">{user.joinDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label={t.weeklyHours} value={`${stats.weeklyHours} ชม.`} sub={lang === Language.TH ? "ผลสรุปรายสัปดาห์" : "Weekly summary"} color="text-indigo-600" />
        <StatCard label={t.monthlyHours} value={`${stats.monthlyHours} ชม.`} sub={lang === Language.TH ? "เวลารวมปฏิบัติงาน" : "Total worked"} color="text-blue-600" />
        <StatCard label={t.workedDays} value={`${stats.workedDays} วัน`} sub={lang === Language.TH ? "การเข้างานเดือนนี้" : "Worked this month"} color="text-slate-800" />
        <StatCard label={t.leaveCount} value={`${stats.approvedLeaves} ครั้ง`} sub={lang === Language.TH ? "อนุมัติเรียบร้อย" : "Approved leaves"} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 sm:mb-8 flex items-center">
             {t.leaveQuota}
          </h3>
          <div className="space-y-6">
            <LeaveQuota label={lang === Language.TH ? "ลาป่วย" : "Sick Leave"} used={15 - user.leaveBalances.sick} total={15} color="bg-red-500" lang={lang} />
            <LeaveQuota label={lang === Language.TH ? "ลาพักร้อน" : "Annual Leave"} used={10 - user.leaveBalances.annual} total={10} color="bg-blue-500" lang={lang} />
            <LeaveQuota label={lang === Language.TH ? "ลากิจ" : "Personal Leave"} used={5 - user.leaveBalances.personal} total={5} color="bg-emerald-500" lang={lang} />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 sm:mb-8">
            {t.securitySettings}
          </h3>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Biometric Auth</p>
                    <p className={`text-[10px] font-bold ${user.storedFace ? 'text-green-500' : 'text-slate-400'}`}>
                      {user.storedFace ? t.faceRegistered : t.faceNotRegistered}
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleResetFaceID}
                disabled={!user.storedFace}
                className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${
                  user.storedFace 
                    ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50 shadow-sm active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {t.resetFaceID}
              </button>
              
              <p className="mt-4 text-[9px] text-slate-400 leading-relaxed">
                {lang === Language.TH 
                  ? "การรีเซ็ตจะลบชุดข้อมูลใบหน้าเดิมออกเพื่อความปลอดภัยในกรณีที่มีการเปลี่ยนแปลงรูปลักษณ์ที่ส่งผลต่อการจดจำ" 
                  : "Resetting will clear previous biometric data for security or in case of significant appearance changes affecting recognition."}
              </p>

              {/* Change PIN Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setShowChangePIN(!showChangePIN)}
                  className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-normal bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                >
                  {lang === Language.TH ? 'เปลี่ยนรหัส PIN' : 'Change PIN'}
                </button>
                {showChangePIN && (
                  <div className="mt-4 space-y-3">
                    <input type="password" inputMode="numeric" maxLength={6} placeholder={lang === Language.TH ? 'PIN เดิม' : 'Current PIN'} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g,''))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" inputMode="numeric" maxLength={6} placeholder={lang === Language.TH ? 'PIN ใหม่' : 'New PIN'} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="password" inputMode="numeric" maxLength={6} placeholder={lang === Language.TH ? 'ยืนยัน PIN ใหม่' : 'Confirm New PIN'} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,''))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {pinError && <p className="text-xs text-red-500 font-semibold">{pinError}</p>}
                    {pinSuccess && <p className="text-xs text-green-500 font-semibold">{lang === Language.TH ? 'เปลี่ยน PIN สำเร็จ ✓' : 'PIN changed ✓'}</p>}
                    <button onClick={handleChangePIN} className="w-full py-3 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all">
                      {lang === Language.TH ? 'ยืนยัน' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string | number, sub: string, color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 group hover:border-blue-200 transition-colors">
    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-normal mb-1">{label}</p>
    <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 font-medium">{sub}</p>
  </div>
);

const LeaveQuota: React.FC<{ label: string, used: number, total: number, color: string, lang: Language }> = ({ label, used, total, color, lang }) => {
  const percentage = Math.min(100, (used / total) * 100);
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-between items-end">
        <p className="text-xs sm:text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400">{lang === Language.TH ? `ใช้ไป ${used} / ${total} วัน` : `Used ${used} / ${total} Days`}</p>
      </div>
      <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
      <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{lang === Language.TH ? 'รีเซ็ตทุก 12 เดือน' : 'Resets every 12 months'}</p>
    </div>
  );
};

export default Profile;

