
import React, { useState } from 'react';
import { OrganizationMember, Language, Team } from '../types';

interface TeamStatusCardProps {
  members: OrganizationMember[];
  teams: Team[];
  onViewAll: () => void;
  lang: Language;
}

const TeamStatusCard: React.FC<TeamStatusCardProps> = ({ members, teams, onViewAll, lang }) => {
  const [selectedTeam, setSelectedTeam] = useState<string | 'ALL'>('ALL');

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'No records';
    const date = new Date(timestamp);
    return date.toLocaleTimeString(lang === Language.TH ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getFilteredMembers = () => {
    if (selectedTeam === 'ALL') return members;
    return members.filter(m => m.teamId === selectedTeam);
  };

  const filteredMembers = getFilteredMembers();
  const activeCount = filteredMembers.filter(m => m.status === 'ACTIVE').length;

  const getTeamById = (teamId?: string) => teams.find(t => t.id === teamId);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      {/* Premium Header */}
      <div className="p-6 pb-4 border-b border-slate-50 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                {lang === Language.TH ? 'สถานะทีม' : 'Team Status'}
                {activeCount > 0 && (
                  <span className="ml-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                {activeCount} active now
              </p>
            </div>
          </div>

          <div className="flex -space-x-2.5">
            {filteredMembers.slice(0, 3).map(m => (
              <div key={m.id} className="relative">
                <img
                  src={m.avatar}
                  className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 shadow-sm"
                  title={m.name}
                />
                <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${m.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              </div>
            ))}
            {filteredMembers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[9px] text-white font-black shadow-sm">
                +{filteredMembers.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Team Filter */}
        {teams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTeam('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedTeam === 'ALL'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              {lang === Language.TH ? 'ทั้งหมด' : 'All'}
            </button>
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-1.5 ${selectedTeam === team.id
                    ? 'text-white shadow-lg'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                style={selectedTeam === team.id ? { backgroundColor: team.color } : {}}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedTeam === team.id ? 'white' : team.color }}
                />
                <span>{team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced List Body */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-2">
          {filteredMembers.slice(0, 5).map(member => {
            const memberTeam = getTeamById(member.teamId);
            return (
              <div
                key={member.id}
                className="group flex flex-col xs:flex-row xs:items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-300"
              >
                <div className="flex items-center space-x-4 mb-2 xs:mb-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                      <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all ${member.status === 'ACTIVE' ? 'bg-green-500' : member.status === 'ON_LEAVE' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}></div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {member.name}
                      </p>
                      {memberTeam && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: memberTeam.color }}
                          title={memberTeam.name}
                        />
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">
                        {member.department}
                      </span>
                      <span className="hidden sm:inline text-slate-200">•</span>
                      <span className="text-[9px] font-bold text-blue-500/80 truncate">
                        {member.position}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex xs:flex-col items-center xs:items-end justify-between xs:justify-center px-1 xs:px-0">
                  <p className="text-[10px] font-black text-slate-900 tracking-tight flex items-center xs:flex-row-reverse">
                    <span className="xs:ml-1.5 order-2 xs:order-1">{formatLastSeen(member.lastCheckIn)}</span>
                    <svg className="w-2.5 h-2.5 text-slate-300 mr-1.5 xs:mr-0 order-1 xs:order-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </p>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] mt-0.5">
                    Check-in
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Styled Footer */}
      <div className="p-5 mt-auto bg-slate-50/40 border-t border-slate-50">
        <button
          onClick={onViewAll}
          className="w-full group py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 hover:text-blue-600 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all uppercase tracking-[0.15em] flex items-center justify-center space-x-3"
        >
          <span>{lang === Language.TH ? 'ดูรายชื่อทั้งหมด' : 'View All Directory'}</span>
          <div className="p-1 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};

export default TeamStatusCard;

