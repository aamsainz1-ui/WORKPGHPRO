
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceType, Language, UserProfile, UserRole, SystemSettings } from '../types';

interface HistoryProps {
  records: AttendanceRecord[];
  lang: Language;
  settings: SystemSettings;
  allRecordsMap?: Record<string, AttendanceRecord[]>;
  members?: UserProfile[];
  currentUserRole?: string;
  currentUser?: UserProfile;
}

const History: React.FC<HistoryProps> = ({ records, lang, settings, allRecordsMap, members, currentUserRole, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AttendanceType>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'CUSTOM'>('ALL');
  const [selectedUser, setSelectedUser] = useState<'ALL' | string>('ALL');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const isAdmin = currentUserRole === UserRole.ADMIN && allRecordsMap && members;

  const checkIfLate = (timestamp: number) => {
    if (!settings.workStartTimes || settings.workStartTimes.length === 0) return { isLate: false, delay: 0 };

    const date = new Date(timestamp);
    const checkTimeMinutes = date.getHours() * 60 + date.getMinutes();

    let minDelay = Infinity;

    settings.workStartTimes.forEach(shift => {
      // Backward compatibility: handle both string and WorkShift object
      const timeString = typeof shift === 'string' ? shift : shift.startTime;
      const [h, m] = timeString.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const delay = checkTimeMinutes - startMinutes;

      // We look for the "intended" shift which is the one with smallest absolute difference
      if (Math.abs(delay) < Math.abs(minDelay)) {
        minDelay = delay;
      }
    });

    return {
      isLate: minDelay > settings.lateThresholdMinute,
      delay: minDelay
    };
  };

  const calculateDuration = (checkInTime: number, checkOutTime: number) => {
    const durationMs = checkOutTime - checkInTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    // Calculate OT: find the shift and check if checkout exceeds shift end time
    let overtimeMinutes = 0;
    const checkInDate = new Date(checkInTime);
    const checkOutDate = new Date(checkOutTime);
    const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
    const checkOutMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();

    // Find the closest shift based on check-in time
    let closestShift = null;
    let minDiff = Infinity;

    settings.workStartTimes.forEach(shift => {
      const timeString = typeof shift === 'string' ? shift : shift.startTime;
      const [h, m] = timeString.split(':').map(Number);
      const shiftStartMinutes = h * 60 + m;
      const diff = Math.abs(checkInMinutes - shiftStartMinutes);

      if (diff < minDiff) {
        minDiff = diff;
        closestShift = shift;
      }
    });

    // Calculate OT if we have shift end time
    if (closestShift && typeof closestShift !== 'string' && closestShift.endTime) {
      const [endH, endM] = closestShift.endTime.split(':').map(Number);
      const shiftEndMinutes = endH * 60 + endM;

      if (checkOutMinutes > shiftEndMinutes) {
        overtimeMinutes = checkOutMinutes - shiftEndMinutes;
      }
    }

    return {
      hours,
      minutes,
      totalMinutes: Math.floor(durationMs / (1000 * 60)),
      overtimeMinutes
    };
  };

  const findMatchingCheckIn = (checkOutRecord: AttendanceRecord, allRecords: AttendanceRecord[]) => {
    // Sort records by timestamp (oldest first) to ensure correct pairing
    const sortedRecords = [...allRecords].sort((a, b) => a.timestamp - b.timestamp);

    // Find the previous check-in before this check-out
    const checkOutIndex = sortedRecords.findIndex(r => r.id === checkOutRecord.id);
    if (checkOutIndex === -1) return null;

    // Search backwards for the most recent check-in
    for (let i = checkOutIndex - 1; i >= 0; i--) {
      if (sortedRecords[i].type === AttendanceType.CHECK_IN) {
        return sortedRecords[i];
      }
    }
    return null;
  };

  const filteredRecords = useMemo(() => {
    let result: (AttendanceRecord & { employeeName?: string; userId?: string })[] = [];

    if (isAdmin) {
      if (selectedUser === 'ALL') {
        members!.forEach(m => {
          const userRecs = (allRecordsMap![m.id] || []).map(r => ({ ...r, employeeName: m.name, userId: m.id }));
          result = [...result, ...userRecs];
        });
      } else {
        const target = members!.find(m => m.id === selectedUser);
        if (target) {
          result = (allRecordsMap![target.id] || []).map(r => ({ ...r, employeeName: target.name, userId: target.id }));
        }
      }
    } else {
      // For non-admin users, add their own name and userId to records
      result = records.map(r => ({ ...r, employeeName: currentUser?.name, userId: currentUser?.id }));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.notes?.toLowerCase().includes(term)) ||
        (r.location?.address?.toLowerCase().includes(term))
      );
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(r => r.type === typeFilter);
    }

    // Time Range Filtering
    const now = new Date();
    if (timeRange === 'TODAY') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      result = result.filter(r => r.timestamp >= today);
    } else if (timeRange === 'WEEK') {
      const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
      result = result.filter(r => r.timestamp >= weekAgo);
    } else if (timeRange === 'CUSTOM') {
      const start = new Date(customRange.start + 'T00:00:00').getTime();
      const end = new Date(customRange.end + 'T23:59:59').getTime();
      result = result.filter(r => r.timestamp >= start && r.timestamp <= end);
    }

    result.sort((a, b) => sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return result;
  }, [records, searchTerm, typeFilter, sortOrder, timeRange, customRange, isAdmin, allRecordsMap, members, selectedUser, currentUser]);

  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = lang === Language.TH
      ? ["ชื่อพนักงาน", "ประเภท", "สถานะมาสาย", "ระยะเวลา", "OT", "วันที่", "เวลา", "สถานที่", "หมายเหตุ", "พิกัด", "เขตเวลา"]
      : ["Employee", "Type", "Late Status", "Duration", "OT", "Date", "Time", "Location", "Notes", "Coords", "Timezone"];

    const csvRows = filteredRecords.map(r => {
      const { isLate, delay } = r.type === AttendanceType.CHECK_IN ? checkIfLate(r.timestamp) : { isLate: false, delay: 0 };
      const lateStatus = isLate ? (lang === Language.TH ? `สาย (+${delay}น.)` : `LATE (+${delay}m)`) : (lang === Language.TH ? "ปกติ" : "Normal");

      // Calculate duration for check-out records
      let durationText = "-";
      let otText = "-";

      if (r.type === AttendanceType.CHECK_OUT) {
        const recordsToSearch = (r as any).userId ? (allRecordsMap?.[(r as any).userId] || []) : records;
        const checkInRecord = findMatchingCheckIn(r, recordsToSearch);

        if (checkInRecord) {
          const duration = calculateDuration(checkInRecord.timestamp, r.timestamp);
          durationText = `${duration.hours}h ${duration.minutes}m`;
          if (duration.overtimeMinutes > 0) {
            otText = `${duration.overtimeMinutes}m`;
          }
        }
      }

      return [
        (r as any).employeeName || currentUser?.name || "N/A",
        r.type === AttendanceType.CHECK_IN ? (lang === Language.TH ? "เข้างาน" : "Check-in") : (lang === Language.TH ? "ออกงาน" : "Check-out"),
        lateStatus,
        durationText,
        otText,
        new Date(r.timestamp).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US'),
        new Date(r.timestamp).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US'),
        r.location?.address || "N/A",
        r.notes || "",
        `${r.location?.latitude || ''}, ${r.location?.longitude || ''}`,
        r.timezone
      ];
    });
    const csvContent = "\ufeff" + [headers, ...csvRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GW_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{lang === Language.TH ? 'บันทึกไทม์ไลน์' : 'Activity Timeline'}</h2>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mt-2">{lang === Language.TH ? 'ประวัติการเข้าออกงานแบบเรียลไทม์' : 'Secure Operational Logging'}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center space-x-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{lang === Language.TH ? `ส่งออกข้อมูล (${filteredRecords.length})` : `Export Logs (${filteredRecords.length})`}</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder={lang === Language.TH ? 'ค้นหาสถานที่หรือบันทึก...' : 'Filter by location or notes...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 pl-14 text-sm font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 outline-none transition-all"
            />
            <svg className="w-5 h-5 text-slate-300 absolute left-6 top-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            {isAdmin && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1 md:flex-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
                title="Select Employee"
              >
                <option value="ALL">{lang === Language.TH ? 'พนักงานทุกคน' : 'All Employees'}</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 md:flex-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
              title="Filter by type"
            >
              <option value="ALL">{lang === Language.TH ? 'ทุกประเภท' : 'All Types'}</option>
              <option value={AttendanceType.CHECK_IN}>{lang === Language.TH ? 'เฉพาะเข้างาน' : 'Check-ins'}</option>
              <option value={AttendanceType.CHECK_OUT}>{lang === Language.TH ? 'เฉพาะออกงาน' : 'Check-outs'}</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="flex-1 md:flex-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
              title="Sort order"
            >
              <option value="desc">{lang === Language.TH ? 'ล่าสุด' : 'Newest First'}</option>
              <option value="asc">{lang === Language.TH ? 'เก่าสุด' : 'Oldest First'}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center pt-4 border-t border-slate-50">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'ALL', th: 'ทั้งหมด', en: 'All' },
              { id: 'TODAY', th: 'วันนี้', en: 'Today' },
              { id: 'WEEK', th: 'สัปดาห์นี้', en: 'This Week' },
              { id: 'CUSTOM', th: 'กำหนดเอง', en: 'Custom' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
              >
                {lang === Language.TH ? range.th : range.en}
              </button>
            ))}
          </div>

          {timeRange === 'CUSTOM' && (
            <div className="flex items-center space-x-2 w-full md:w-auto animate-in fade-in slide-in-from-left-2 duration-300">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
              />
              <span className="text-slate-300 font-bold">to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <th className="px-10 py-6">{lang === Language.TH ? 'ประเภท' : 'Activity'}</th>
                <th className="px-10 py-6">{lang === Language.TH ? 'เวลาปฏิบัติงาน' : 'Schedule'}</th>
                <th className="px-10 py-6">{lang === Language.TH ? 'ระยะเวลา' : 'Duration'}</th>
                <th className="px-10 py-6">{lang === Language.TH ? 'พิกัดและบันทึก' : 'Deployment Detail'}</th>
                <th className="px-10 py-6 text-right">{lang === Language.TH ? 'สถานะพิกัด' : 'GPS Verified'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-400 font-bold italic text-sm">{lang === Language.TH ? 'ไม่พบข้อมูลที่ระบุ' : 'No records found in this context'}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-10 rounded-full ${record.type === AttendanceType.CHECK_IN ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-slate-200'}`}></div>
                      <div>
                        {record.employeeName && (
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-0.5">{record.employeeName}</p>
                        )}
                        <p className={`text-sm font-black tracking-widest ${record.type === AttendanceType.CHECK_IN ? 'text-blue-600' : 'text-slate-400'}`}>
                          {record.type === AttendanceType.CHECK_IN ? 'INBOUND' : 'OUTBOUND'}
                        </p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{record.workMode || 'OFFICE'}</p>
                          {record.type === AttendanceType.CHECK_IN && (() => {
                            const { isLate, delay } = checkIfLate(record.timestamp);
                            console.log('🔍 Late Check:', {
                              timestamp: new Date(record.timestamp).toLocaleString(),
                              isLate,
                              delay,
                              lateThreshold: settings.lateThresholdMinute,
                              workStartTimes: settings.workStartTimes
                            });
                            return isLate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-red-50 text-red-600 uppercase tracking-widest">
                                {lang === Language.TH ? `สาย ${delay} นาที` : `Late ${delay}m`}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-xs font-black text-slate-900 mb-1">{new Date(record.timestamp).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.timestamp).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-10 py-8">
                    {record.type === AttendanceType.CHECK_OUT && (() => {
                      // Use the userId we attached to the record to get the correct user's records
                      const recordsToSearch = record.userId ? (allRecordsMap?.[record.userId] || []) : records;

                      const checkInRecord = findMatchingCheckIn(record, recordsToSearch);

                      if (checkInRecord) {
                        const duration = calculateDuration(checkInRecord.timestamp, record.timestamp);
                        return (
                          <div>
                            <p className="text-xs font-black text-blue-600 mb-1">
                              {duration.hours}h {duration.minutes}m
                            </p>
                            {duration.overtimeMinutes > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-50 text-amber-600 uppercase tracking-widest">
                                OT: {duration.overtimeMinutes}m
                              </span>
                            )}
                          </div>
                        );
                      }
                      return <p className="text-[10px] text-slate-300 italic">-</p>;
                    })()}
                    {record.type === AttendanceType.CHECK_IN && (
                      <p className="text-[10px] text-slate-300 italic">-</p>
                    )}
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-xs font-bold text-slate-600 mb-1 max-w-[300px] truncate">{record.location?.address || (lang === Language.TH ? 'ไม่ระบุ' : 'Not specified')}</p>
                    {record.notes && <p className="text-[10px] text-slate-400 italic max-w-[300px] truncate">{record.notes}</p>}
                  </td>
                  <td className="px-10 py-8 text-right">
                    {record.location?.latitude && record.location?.longitude ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[9px] font-black bg-green-50 text-green-600 uppercase tracking-widest">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {lang === Language.TH ? 'ยืนยันแล้ว' : 'Verified'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[9px] font-black bg-slate-50 text-slate-400 uppercase tracking-widest">
                        {lang === Language.TH ? 'ไม่ระบุ' : 'N/A'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-bold italic text-sm">{lang === Language.TH ? 'ไม่พบข้อมูลที่ระบุ' : 'No records found'}</p>
          </div>
        ) : filteredRecords.map((record) => (
          <div key={record.id} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-12 rounded-full ${record.type === AttendanceType.CHECK_IN ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-slate-200'}`}></div>
                <div>
                  {record.employeeName && (
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-0.5">{record.employeeName}</p>
                  )}
                  <p className={`text-base font-black tracking-wider ${record.type === AttendanceType.CHECK_IN ? 'text-blue-600' : 'text-slate-400'}`}>
                    {record.type === AttendanceType.CHECK_IN ? (lang === Language.TH ? 'เข้างาน' : 'CHECK IN') : (lang === Language.TH ? 'ออกงาน' : 'CHECK OUT')}
                  </p>
                </div>
              </div>
              {(record.location?.latitude && record.location?.longitude) && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[9px] font-black bg-green-50 text-green-600 uppercase tracking-widest">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  GPS
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-t border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{lang === Language.TH ? 'เวลา' : 'Time'}</span>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{new Date(record.timestamp).toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{lang === Language.TH ? 'โหมด' : 'Mode'}</span>
                <span className="text-sm font-bold text-slate-600">{record.workMode || 'OFFICE'}</span>
              </div>

              {record.type === AttendanceType.CHECK_IN && (() => {
                const { isLate, delay } = checkIfLate(record.timestamp);
                return isLate ? (
                  <div className="flex items-center justify-between py-2 border-t border-slate-50">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{lang === Language.TH ? 'สถานะ' : 'Status'}</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 uppercase tracking-wider">
                      {lang === Language.TH ? `สาย ${delay} นาที` : `Late ${delay}m`}
                    </span>
                  </div>
                ) : null;
              })()}

              {record.type === AttendanceType.CHECK_OUT && (() => {
                const recordsToSearch = record.userId ? (allRecordsMap?.[record.userId] || []) : records;
                const checkInRecord = findMatchingCheckIn(record, recordsToSearch);
                if (checkInRecord) {
                  const duration = calculateDuration(checkInRecord.timestamp, record.timestamp);
                  return (
                    <div className="flex items-center justify-between py-2 border-t border-slate-50">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{lang === Language.TH ? 'ระยะเวลา' : 'Duration'}</span>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600">
                          {duration.hours}h {duration.minutes}m
                        </p>
                        {duration.overtimeMinutes > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-amber-50 text-amber-600 uppercase tracking-widest mt-1">
                            OT: {duration.overtimeMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {record.location?.address && (
                <div className="flex flex-col py-2 border-t border-slate-50">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{lang === Language.TH ? 'สถานที่' : 'Location'}</span>
                  <p className="text-sm font-bold text-slate-600">{record.location.address}</p>
                </div>
              )}

              {record.notes && (
                <div className="flex flex-col py-2 border-t border-slate-50">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{lang === Language.TH ? 'หมายเหตุ' : 'Note'}</span>
                  <p className="text-sm text-slate-500 italic">{record.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;

