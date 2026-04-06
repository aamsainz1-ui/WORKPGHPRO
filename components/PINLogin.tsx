
import React, { useState } from 'react';
import { UserProfile, Language } from '../types';

const hashPIN = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'gw_salt_2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

interface PINLoginProps {
    users: UserProfile[];
    onLogin: (user: UserProfile) => void;
    lang: Language;
}

const PINLogin: React.FC<PINLoginProps> = ({ users, onLogin, lang }) => {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handlePINClick = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError(false);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleLogin = async () => {
        if (!selectedUser) return;
        const hashed = await hashPIN(pin);
        // Support both hashed and legacy plaintext PIN
        if (selectedUser.pinHash ? hashed === selectedUser.pinHash : selectedUser.pin === pin) {
            onLogin(selectedUser);
        } else {
            setError(true);
            setPin('');
        }
    };

    const t = {
        title: lang === Language.TH ? 'เลือกบัญชีเพื่อเริ่มต้น' : 'Select Account',
        enterPin: lang === Language.TH ? `กรอกรหัส PIN สำหรับ ${selectedUser?.name}` : `Enter PIN for ${selectedUser?.name}`,
        error: lang === Language.TH ? 'รหัส PIN ไม่ถูกต้อง' : 'Incorrect PIN',
        back: lang === Language.TH ? 'ย้อนกลับ' : 'Back',
        login: lang === Language.TH ? 'เข้าสู่ระบบ' : 'Login'
    };

    if (!selectedUser) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(at_0%_0%,_hsla(220,100%,95%,1)_0,_transparent_50%),_radial-gradient(at_50%_0%,_hsla(210,100%,96%,1)_0,_transparent_50%),_radial-gradient(at_100%_0%,_hsla(200,100%,95%,1)_0,_transparent_50%)]">
                <div className="w-full max-w-2xl space-y-12">
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">GlobalWork <span className="text-blue-600">Pro</span></h1>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-normal">{t.title}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 hover:scale-105 active:scale-95 transition-all text-center group"
                            >
                                <div className="w-20 h-20 mx-auto mb-6 rounded-[2rem] overflow-hidden border-4 border-white shadow-lg group-hover:border-blue-100 transition-colors">
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-base font-black text-slate-900 line-clamp-1">{user.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-normal mt-1">{user.position}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md space-y-10">
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 mx-auto rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                        <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">{selectedUser.name}</h2>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-normal mt-2">{t.enterPin}</p>
                    </div>
                </div>

                <div className="flex justify-center space-x-4">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i
                                ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : error ? 'border-red-500' : 'border-white/20'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-center text-red-400 text-[10px] font-black uppercase tracking-normal animate-bounce">
                        {t.error}
                    </p>
                )}

                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handlePINClick(num.toString())}
                            className="h-20 bg-white/5 hover:bg-white/10 rounded-[1.5rem] text-2xl font-black transition-all active:scale-90"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="h-20 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-normal transition-all"
                    >
                        {t.back}
                    </button>
                    <button
                        onClick={() => handlePINClick('0')}
                        className="h-20 bg-white/5 hover:bg-white/10 rounded-[1.5rem] text-2xl font-black transition-all"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="h-20 bg-white/5 hover:bg-white/10 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90"
                        title="Backspace"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
                        </svg>
                    </button>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={pin.length < 4}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-normal transition-all ${pin.length < 4
                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-600/20 animate-in fade-in slide-in-from-bottom-2'
                        }`}
                >
                    {t.login}
                </button>
            </div>
        </div>
    );
};

export default PINLogin;

