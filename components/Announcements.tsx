
import React, { useState } from 'react';
import { Announcement, Language } from '../types';

interface AnnouncementsProps {
  announcements: Announcement[];
  lang: Language;
  isAdmin: boolean;
  onAdd: (data: Omit<Announcement, 'id'>) => void;
  onDelete: (id: string) => void;
}

const Announcements: React.FC<AnnouncementsProps> = ({ announcements, lang, isAdmin, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newA, setNewA] = useState({ title: '', content: '', author: '', category: 'GENERAL', date: new Date().toISOString().split('T')[0] });

  const handleAdd = () => {
    if (!newA.title || !newA.content) return;
    onAdd(newA as any);
    setShowAdd(false);
    setNewA({ title: '', content: '', author: '', category: 'GENERAL', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {lang === Language.TH ? 'ประกาศและข่าวสาร' : 'News & Announcements'}
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-normal mt-2">{lang === Language.TH ? 'พอร์ทัลการสื่อสารภายใน' : 'Internal Communication Portal'}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {lang === Language.TH ? '+ สร้างประกาศ' : '+ Create Announcement'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold italic">{lang === Language.TH ? 'ยังไม่มีประกาศในขณะนี้' : 'No announcements at the moment'}</p>
          </div>
        ) : announcements.map(item => (
          <div key={item.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm group hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-blue-600/5 relative">
            <div className="p-1 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-normal ${item.category === 'POLICY' ? 'bg-red-50 text-red-600' :
                      item.category === 'EVENT' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                    }`}>
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">{item.date}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete Announcement"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-blue-600 transition-colors leading-tight">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed text-base whitespace-pre-wrap">{item.content}</p>

              <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-[12px] font-black text-white">
                    {(item.author || '?')[0]}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal">Authorized By</p>
                    <p className="text-[12px] font-bold text-slate-900">{item.author}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">
              {lang === Language.TH ? 'สร้างประกาศใหม่' : 'New Announcement'}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Category</label>
                <div className="flex gap-2">
                  {['GENERAL', 'POLICY', 'EVENT'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewA({ ...newA, category: cat })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${newA.category === cat ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Title</label>
                <input
                  value={newA.title}
                  onChange={e => setNewA({ ...newA, title: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Company Retreat 2025"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Content</label>
                <textarea
                  value={newA.content}
                  onChange={e => setNewA({ ...newA, content: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                  placeholder="Describe your announcement here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Author Name</label>
                  <input
                    value={newA.author}
                    onChange={e => setNewA({ ...newA, author: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                    placeholder="e.g. Admin / HR"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Effective Date</label>
                  <input
                    type="date"
                    value={newA.date}
                    onChange={e => setNewA({ ...newA, date: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                >
                  Post Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;

