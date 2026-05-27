import { motion } from 'motion/react';
import { X, Users, TrendingUp, UserCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';
import { db, getUserDocId } from '../lib/firebase';

interface TeamModalProps {
  onClose: () => void;
  onInvite?: () => void;
  t: any;
}

interface TeamMember {
  name: string;
  date: string;
  reward: number;
  status: string;
}

export function TeamModal({ onClose, onInvite, t }: TeamModalProps) {
  const [activeTab, setActiveTab] = useState<'L1' | 'L2' | 'L3'>('L1');
  const [teamData, setTeamData] = useState<{
    level1: TeamMember[];
    level2: TeamMember[];
    level3: TeamMember[];
  }>({ level1: [], level2: [], level3: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchRealTeam() {
      try {
        const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
        const currentPhone = getUserDocId();
        if (!currentPhone) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Level 1: Fetch users invited by the current user (high limit for full history)
        const q1 = query(
          collection(db, 'users'), 
          where('invitedBy', '==', currentPhone),
          limit(1000)
        );
        const q1Snap = await getDocs(q1);
        const level1Users: any[] = [];
        q1Snap.forEach(snap => {
          const data = snap.data();
          if (data.status !== 'inactive') {
            level1Users.push({ id: snap.id, ...data });
          }
        });

        const level1Ids = level1Users.map(u => u.phoneNumber || u.id).filter(Boolean);

        // Helper to query users in chunks of 30 due to Firestore "in" limits
        const fetchInChunks = async (ids: string[]) => {
          const results: any[] = [];
          const chunkSize = 30;
          const promises = [];
          for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            if (chunk.length > 0) {
              const q = query(
                collection(db, 'users'),
                where('invitedBy', 'in', chunk),
                limit(1000)
              );
              promises.push(getDocs(q));
            }
          }
          const snaps = await Promise.all(promises);
          snaps.forEach(snapCol => {
            snapCol.forEach(snap => {
              const data = snap.data();
              if (data.status !== 'inactive') {
                results.push({ id: snap.id, ...data });
              }
            });
          });
          return results;
        };

        // Level 2: Fetch users invited by Level 1 users (load all history)
        let level2Users: any[] = [];
        if (level1Ids.length > 0) {
          level2Users = await fetchInChunks(level1Ids);
        }

        const level2Ids = level2Users.map(u => u.phoneNumber || u.id).filter(Boolean);

        // Level 3: Fetch users invited by Level 2 users (load all history)
        let level3Users: any[] = [];
        if (level2Ids.length > 0) {
          level3Users = await fetchInChunks(level2Ids);
        }

        const mapUserToMember = (u: any) => {
          let displayName = u.fullName || u.phoneNumber || u.id || 'Member';
          if (/^\d+$/.test(displayName) && displayName.length >= 8) {
            displayName = displayName.slice(0, 4) + '***' + displayName.slice(-3);
          }
          const rawDate = u.createdAt ? u.createdAt.split('T')[0] : 'Active';
          const lvl = (u.currentLevel || 'INTERN').toUpperCase();
          return {
            name: displayName,
            date: rawDate,
            reward: 0,
            status: lvl === 'INTERN' ? 'Intern' : 'Regular User',
            rawLevel: lvl
          };
        };

        if (isMounted) {
          setTeamData({
            level1: level1Users.map(mapUserToMember),
            level2: level2Users.map(mapUserToMember),
            level3: level3Users.map(mapUserToMember)
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching real team structure:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchRealTeam();
    return () => {
      isMounted = false;
    };
  }, []);

  const level1Registered = teamData.level1.length;
  const level1Regular = teamData.level1.filter(m => m.rawLevel !== 'INTERN').length;

  const level2Registered = teamData.level2.length;
  const level2Regular = teamData.level2.filter(m => m.rawLevel !== 'INTERN').length;

  const level3Registered = teamData.level3.length;
  const level3Regular = teamData.level3.filter(m => m.rawLevel !== 'INTERN').length;

  const stats = [
    { label: t('income_level1'), value: `${level1Registered}/${level1Regular}`, color: 'text-blue-600' },
    { label: t('income_level2'), value: `${level2Registered}/${level2Regular}`, color: 'text-indigo-600' },
    { label: t('income_level3'), value: `${level3Registered}/${level3Regular}`, color: 'text-rose-600' },
  ];

  const currentList = activeTab === 'L1' ? teamData.level1 : activeTab === 'L2' ? teamData.level2 : teamData.level3;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-gray-50 w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 space-y-6 pt-8 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">
              {t('income_team_size')}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat, i) => (
              <div key={i} className="bg-gray-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-gray-100">
                <span className={cn("text-xl font-black italic leading-none tracking-tight", stat.color)}>{stat.value}</span>
                <span className="text-[8px] font-black uppercase text-gray-400 mt-1 tracking-tighter leading-tight">{stat.label}</span>
                <span className="text-[6.5px] font-extrabold text-slate-350 text-gray-400/85 uppercase tracking-wider mt-0.5">Total / Regular</span>
              </div>
            ))}
          </div>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
            {(['L1', 'L2', 'L3'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  WebApp.HapticFeedback.impactOccurred('light');
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                )}
              >
                {tab === 'L1' ? t('income_level1') : tab === 'L2' ? t('income_level2') : t('income_level3')}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              onInvite?.();
              WebApp.HapticFeedback.impactOccurred('medium');
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
          >
            <TrendingUp size={18} />
            {t('btn_invite')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Constructing Team Network...</p>
            </div>
          ) : currentList.length > 0 ? (
            currentList.map((member, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i} 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <UserCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 leading-none">{member.name}</h4>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{member.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-[10px] font-black uppercase text-right leading-none",
                    member.status === 'Intern' ? 'text-amber-500' : 'text-blue-500'
                  )}>
                    {member.status}
                  </p>
                  <p className="text-[8px] font-black uppercase text-gray-400 mt-1 tracking-tighter leading-none text-right">
                    {member.rawLevel}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                <Users size={32} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No members found</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
