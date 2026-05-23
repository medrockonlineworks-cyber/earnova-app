import { motion, AnimatePresence } from 'motion/react';
import { X, Users, TrendingUp, ChevronRight, UserCircle2 } from 'lucide-react';
import { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';

interface TeamModalProps {
  onClose: () => void;
  onInvite?: () => void;
  t: any;
}

const MOCK_TEAM = {
  level1: [
    { name: 'Abdurahman K.', date: '2026-05-10', reward: 480 },
    { name: 'Selamawit T.', date: '2026-05-12', reward: 480 },
    { name: 'Kalkidan B.', date: '2026-05-15', reward: 0 },
  ],
  level2: [
    { name: 'Dawit M.', date: '2026-05-14', reward: 160 },
    { name: 'Hirut S.', date: '2026-05-16', reward: 0 },
  ],
  level3: [
    { name: 'Yoseph A.', date: '2026-05-17', reward: 80 },
  ]
};

export function TeamModal({ onClose, onInvite, t }: TeamModalProps) {
  const [activeTab, setActiveTab] = useState<'L1' | 'L2' | 'L3'>('L1');

  const stats = [
    { label: t('income_level1'), value: '3', color: 'text-blue-600' },
    { label: t('income_level2'), value: '2', color: 'text-indigo-600' },
    { label: t('income_level3'), value: '1', color: 'text-rose-600' },
  ];

  const currentList = activeTab === 'L1' ? MOCK_TEAM.level1 : activeTab === 'L2' ? MOCK_TEAM.level2 : MOCK_TEAM.level3;

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
                <span className={cn("text-xl font-black italic leading-none", stat.color)}>{stat.value}</span>
                <span className="text-[8px] font-black uppercase text-gray-400 mt-1 tracking-tighter leading-tight">{stat.label}</span>
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
          {currentList.length > 0 ? (
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
                  <p className="text-[10px] font-black text-emerald-500">
                    {member.reward > 0 ? `+ETB ${member.reward}` : 'Active'}
                  </p>
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Reward</p>
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
