
import React, { useState, useMemo } from 'react';
import { ContentPlan, ContentPlatform, Language } from '../types';

interface ContentCalendarProps {
    plans: ContentPlan[];
    onAdd: (plan: Omit<ContentPlan, 'id'>) => void;
    onDelete: (id: string) => void;
    lang: Language;
}

const ContentCalendar: React.FC<ContentCalendarProps> = ({ plans, onAdd, onDelete, lang }) => {
    const [activePlatform, setActivePlatform] = useState<ContentPlatform | 'ALL'>('ALL');
    const [showAdd, setShowAdd] = useState(false);
    const [newPlan, setNewPlan] = useState({
        title: '',
        description: '',
        platform: ContentPlatform.FACEBOOK,
        scheduledDate: new Date().toISOString().split('T')[0],
        status: 'DRAFT' as const,
        author: ''
    });

    const filteredPlans = useMemo(() => {
        let list = [...plans].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
        if (activePlatform !== 'ALL') {
            list = list.filter(p => p.platform === activePlatform);
        }
        return list;
    }, [plans, activePlatform]);

    const platformColors = {
        [ContentPlatform.FACEBOOK]: 'bg-blue-600',
        [ContentPlatform.TIKTOK]: 'bg-black',
        [ContentPlatform.INSTAGRAM]: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
    };

    const handleAdd = () => {
        if (!newPlan.title || !newPlan.author) return;
        onAdd(newPlan);
        setShowAdd(false);
        setNewPlan({
            title: '',
            description: '',
            platform: ContentPlatform.FACEBOOK,
            scheduledDate: new Date().toISOString().split('T')[0],
            status: 'DRAFT',
            author: ''
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {lang === Language.TH ? 'ปฏิทินวางแผนคอนเทนต์' : 'Content Marketing Calendar'}
                    </h2>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-normal mt-2">
                        Multi-Platform Strategic Planning Hub
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-normal hover:bg-slate-800 transition-all shadow-2xl active:scale-95 flex items-center space-x-3"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{lang === Language.TH ? 'เพิ่มแผนงาน' : 'New Content Plan'}</span>
                </button>
            </div>

            {/* Platform Filter */}
            <div className="flex flex-wrap gap-3">
                {(['ALL', ...Object.values(ContentPlatform)] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setActivePlatform(p)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-normal transition-all ${activePlatform === p
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105'
                                : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'
                            }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Calendar Grid / List View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.length === 0 ? (
                    <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="font-bold italic">{lang === Language.TH ? 'ยังไม่มีแผนงานในขณะนี้' : 'No strategic plans for selected platform'}</p>
                    </div>
                ) : filteredPlans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group overflow-hidden flex flex-col">
                        <div className={`h-2 ${platformColors[plan.platform]}`}></div>
                        <div className="p-8 flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-normal text-white ${platformColors[plan.platform]}`}>
                                    {plan.platform}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                    {new Date(plan.scheduledDate).toLocaleDateString(lang === Language.TH ? 'th-TH' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{plan.title}</h3>
                            <p className="text-slate-500 text-sm line-clamp-3 mb-6 font-medium">{plan.description}</p>

                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                                <div className="flex items-center space-x-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        {(plan.author || '?')[0]}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-normal">{plan.author}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => onDelete(plan.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        title="Delete Plan"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">
                            {lang === Language.TH ? 'สร้างแผนคอนเทนต์ใหม่' : 'New Strategic Content Plan'}
                        </h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Platform</label>
                                    <div className="flex gap-2">
                                        {Object.values(ContentPlatform).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setNewPlan({ ...newPlan, platform: p })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-normal transition-all ${newPlan.platform === p ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Title</label>
                                    <input
                                        value={newPlan.title}
                                        onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Content Title"
                                        title="Title"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Description</label>
                                    <textarea
                                        value={newPlan.description}
                                        onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                        placeholder="Brief description or caption ideas..."
                                        title="Description"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Author</label>
                                    <input
                                        value={newPlan.author}
                                        onChange={e => setNewPlan({ ...newPlan, author: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                                        placeholder="Planner Name"
                                        title="Author"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-normal mb-2 block">Schedule Date</label>
                                    <input
                                        type="date"
                                        value={newPlan.scheduledDate}
                                        onChange={e => setNewPlan({ ...newPlan, scheduledDate: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none"
                                        title="Scheduled Date"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4 pt-6">
                                <button
                                    onClick={() => setShowAdd(false)}
                                    className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-normal"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal shadow-xl shadow-indigo-600/20"
                                >
                                    Post Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentCalendar;

