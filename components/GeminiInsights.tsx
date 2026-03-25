
import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Language } from '../types';
import { getWorkInsights } from '../services/gemini';

interface GeminiInsightsProps {
  records: AttendanceRecord[];
  lang: Language;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ records, lang }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchInsights = async () => {
      if (records.length === 0) return;
      setLoading(true);
      const text = await getWorkInsights(records, lang);
      setInsight(text);
      setLoading(false);
    };

    fetchInsights();
  }, [records.length, lang]);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] shadow-xl shadow-blue-500/20 text-white relative overflow-hidden group">
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h4 className="text-xs font-black uppercase tracking-normal text-indigo-100">
            {lang === Language.TH ? 'AI สรุปภาพรวมการทำงาน' : 'AI Work Insights'}
          </h4>
        </div>

        {loading ? (
          <div className="flex space-x-2 items-center py-2">
            <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-150"></div>
          </div>
        ) : (
          <p className="text-xl font-bold leading-relaxed italic text-white/90">
            "{insight || (lang === Language.TH ? "เริ่มลงเวลาระบบเพื่อรับคำแนะนำในการปรับสมดุลการทำงานของคุณ" : "Clock in to receive AI-powered work-life balance insights")}"
          </p>
        )}
      </div>
      
      {/* Decorative BG element */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
    </div>
  );
};

export default GeminiInsights;

