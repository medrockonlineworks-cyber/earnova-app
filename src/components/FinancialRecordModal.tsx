import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
  History,
  Gift,
  Percent,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { db, auth, handleFirestoreError, OperationType, getUserDocId } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import WebApp from '@twa-dev/sdk';
import { JOBS, JobLevel } from '../constants';

interface FinancialRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: {
    income: number;
    personal: number;
    workDeposit: number;
  };
  currentJobLevel: JobLevel;
  t: any;
}

export function FinancialRecordModal({ isOpen, onClose, balance, currentJobLevel, t }: FinancialRecordModalProps) {
  const [activeTab, setActiveTab] = useState<'RECHARGE' | 'WITHDRAW' | 'BONUS' | 'COMMISSION'>('RECHARGE');
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [ownCommissions, setOwnCommissions] = useState<any[]>([]);
  const [teamCommissions, setTeamCommissions] = useState<any[]>([]);
  const [commissionSubTab, setCommissionSubTab] = useState<'ALL' | 'DAILY' | 'TEAM' | 'REFERRAL'>('ALL');
  const [loading, setLoading] = useState(true);

  const totalBalance = balance.income + balance.personal + balance.workDeposit;
  
  useEffect(() => {
    let active = true;
    if (isOpen && getUserDocId() !== 'guest') {
      setLoading(true);
      
      const fetchData = async () => {
        const userId = getUserDocId();
        const sortDescByTimestamp = (a: any, b: any) => {
          const getMs = (val: any) => {
            if (!val) return 0;
            if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            return new Date(val).getTime();
          };
          return getMs(b.timestamp) - getMs(a.timestamp);
        };

        // Fetch Recharges
        try {
          const qr = query(
            collection(db, 'recharges'),
            where('userId', '==', userId),
            limit(1000)
          );
          const rechargeSnap = await getDocs(qr);
          if (active) {
            const list = rechargeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort(sortDescByTimestamp);
            setRecharges(list);
          }
        } catch (error) {
          console.error("Error loading recharges history:", error);
        }

        // Fetch Withdrawals
        try {
          const qw = query(
            collection(db, 'withdrawals'),
            where('userId', '==', userId),
            limit(1000)
          );
          const withdrawSnap = await getDocs(qw);
          if (active) {
            const list = withdrawSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort(sortDescByTimestamp);
            setWithdrawals(list);
          }
        } catch (error) {
          console.error("Error loading withdrawals history:", error);
        }

        // Fetch Bonuses
        try {
          const qb = query(
            collection(db, 'bonuses'),
            where('userId', '==', userId),
            limit(1000)
          );
          const bonusSnap = await getDocs(qb);
          if (active) {
            const list = bonusSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort(sortDescByTimestamp);
            setBonuses(list);
          }
        } catch (error) {
          console.error("Error loading bonuses history:", error);
        }

        // Fetch Task Completions
        try {
          const qth = query(
            collection(db, 'taskHistory'),
            where('userId', '==', userId),
            limit(1000)
          );
          const taskHistorySnap = await getDocs(qth);
          if (active) {
            const list = taskHistorySnap.docs.map(doc => ({ 
              id: doc.id, 
              amount: doc.data().commission, 
              label: doc.data().taskTitle || 'Ad Task Completion',
              type: 'personal_task',
              timestamp: doc.data().timestamp
            }));
            list.sort(sortDescByTimestamp);
            setOwnCommissions(list);
          }
        } catch (error) {
          console.error("Error loading taskHistory:", error);
        }

        // Fetch Team Commissions
        try {
          const qc = query(
            collection(db, 'commissions'),
            where('userId', '==', userId),
            limit(1000)
          );
          const commissionsSnap = await getDocs(qc);
          if (active) {
            const list = commissionsSnap.docs.map(doc => ({ 
              id: doc.id, 
              amount: doc.data().amount, 
              label: doc.data().label || 'Team Task Commission',
              type: doc.data().type || 'team',
              subordinatePhone: doc.data().subordinatePhone || '',
              timestamp: doc.data().timestamp
            }));
            list.sort(sortDescByTimestamp);
            setTeamCommissions(list);
          }
        } catch (error) {
          console.error("Error loading commissions:", error);
        }

        if (active) {
          setLoading(false);
        }
      };

      fetchData();

      return () => {
        active = false;
      };
    } else {
      setLoading(false);
    }
  }, [isOpen]);

  const barData = [
    { name: 'Mon', recharge: 450, withdraw: 200 },
    { name: 'Tue', recharge: 600, withdraw: 150 },
    { name: 'Wed', recharge: 300, withdraw: 400 },
    { name: 'Thu', recharge: 800, withdraw: 100 },
    { name: 'Fri', recharge: 550, withdraw: 250 },
    { name: 'Sat', recharge: 400, withdraw: 50 },
    { name: 'Sun', recharge: 700, withdraw: 120 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'rejected':
      case 'failed': return <AlertCircle size={14} className="text-rose-500" />;
      default: return <Clock size={14} className="text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'rejected':
      case 'failed': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
          className="relative w-full max-w-lg bg-gray-50 rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black italic tracking-tighter uppercase leading-none">Financial Record</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Transaction History</p>
              </div>
            </div>
            <button 
              onClick={() => {
                WebApp.HapticFeedback.impactOccurred('light');
                onClose();
              }}
              className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
            {/* Summary Card */}
            <div className="bg-gray-900 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl shadow-gray-200">
               <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-blue-600/20 blur-[60px] rounded-full" />
               <div className="relative z-10">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Portfolio Value</p>
                 <h2 className="text-4xl font-black italic tracking-tighter mb-6 flex items-baseline gap-2">
                   <span className="text-sm font-bold opacity-60">ETB</span>
                   {totalBalance.toLocaleString()}
                 </h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                       <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                         <TrendingUp size={8} /> Income
                       </p>
                       <p className="text-sm font-black italic tracking-tighter text-white">ETB {balance.income.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                       <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                         <Wallet size={8} /> Work Wallet
                       </p>
                       <p className="text-sm font-black italic tracking-tighter text-white">ETB {balance.workDeposit.toLocaleString()}</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Active Signed Job Contracts */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-gray-450 uppercase tracking-widest leading-none mb-1 text-gray-400">Signed Level Contracts</h4>
                  <p className="text-xs font-black text-gray-900 uppercase italic tracking-tight">Active Work Authorization</p>
                </div>
                {currentJobLevel !== JobLevel.INTERN ? (
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 border border-emerald-100 rounded-full text-[8.5px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-emerald-500" /> Authorized
                  </div>
                ) : (
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 border border-blue-100 rounded-full text-[8.5px] font-black uppercase tracking-widest">
                    Temporary
                  </div>
                )}
              </div>

              {(() => {
                const activeJob = JOBS.find(j => j.level === currentJobLevel);
                if (!activeJob) return null;

                return (
                  <div className="bg-gray-50/50 hover:bg-gray-50/80 border border-gray-100 p-4 rounded-2xl flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center font-black italic text-sm tracking-tighter border shadow-sm",
                        activeJob.bgColor,
                        activeJob.color,
                        "border-current/10"
                      )}>
                        {activeJob.level === JobLevel.INTERN ? 'INT' : activeJob.level}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight leading-none mb-1">
                          {activeJob.level === JobLevel.INTERN ? 'Free Intern Period' : `${activeJob.level} Active Contract`}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          Tasks: {activeJob.dailyTasks} • Rate: {activeJob.eachOrder} ETB/order
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed Deposit</p>
                      <p className="text-sm font-black text-gray-950 font-mono">
                        ETB {activeJob.deposit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Show other potential upgrades signed / tracked if available */}
              {currentJobLevel !== JobLevel.INTERN && (
                <div className="pt-2 border-t border-dashed border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                    * Upgrading to higher job levels will fully transfer and refund your current ETB {JOBS.find(j => j.level === currentJobLevel)?.deposit.toLocaleString()} deposit back to your Personal Wallet automatically.
                  </p>
                </div>
              )}
            </div>            {/* 2x2 Grid Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm flex-shrink-0">
                <button 
                  onClick={() => {
                    setActiveTab('RECHARGE');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                    activeTab === 'RECHARGE' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <ArrowUpRight size={12} />
                  Recharge
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('WITHDRAW');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                    activeTab === 'WITHDRAW' ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <ArrowDownRight size={12} />
                  Withdraw
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('BONUS');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                    activeTab === 'BONUS' ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Gift size={12} />
                  Bonus History
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('COMMISSION');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border",
                    activeTab === 'COMMISSION' ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Percent size={12} />
                  Commissions
                </button>
            </div>

            {/* Transactions / Income Lists */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {activeTab === 'COMMISSION' && (
                <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-100/80 mb-1 flex-shrink-0 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'DAILY', label: 'Daily Task' },
                    { id: 'TEAM', label: 'Team Task' },
                    { id: 'REFERRAL', label: 'Referrals' }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => {
                        setCommissionSubTab(pill.id as any);
                        WebApp.HapticFeedback.impactOccurred('light');
                      }}
                      className={cn(
                        "flex-1 whitespace-nowrap py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                        commissionSubTab === pill.id
                          ? "bg-slate-900 border-slate-900 text-white font-extrabold shadow-sm"
                          : "bg-white border-transparent text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Data...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Collect displays
                    let itemsToDisplay: any[] = [];
                    if (activeTab === 'RECHARGE') {
                      itemsToDisplay = recharges;
                    } else if (activeTab === 'WITHDRAW') {
                      itemsToDisplay = withdrawals;
                    } else if (activeTab === 'BONUS') {
                      // Construct list of bonuses with fallback
                      const list = [...bonuses];
                      if (list.length === 0) {
                        list.push({
                          id: 'welcome-onboarding-default',
                          amount: 100.00,
                          label: 'Welcome Onboarding Bonus',
                          type: 'onboarding',
                          status: 'completed',
                          timestamp: { toDate: () => new Date(2026, 4, 20, 10, 0, 0) }
                        });
                        if (currentJobLevel !== JobLevel.INTERN) {
                          const getLevelSignupBonus = (lvl: JobLevel): number => {
                            switch (lvl) {
                              case JobLevel.JOB1: return 150;
                              case JobLevel.JOB2: return 200;
                              case JobLevel.JOB3: return 350;
                              case JobLevel.JOB4: return 500;
                              case JobLevel.JOB5: return 650;
                              case JobLevel.JOB6: return 800;
                              case JobLevel.JOB7: return 950;
                              case JobLevel.JOB8: return 1100;
                              case JobLevel.JOB9: return 1250;
                              case JobLevel.JOB10: return 1400;
                              default: return 0;
                            }
                          };
                          const signupBonus = getLevelSignupBonus(currentJobLevel);
                          if (signupBonus > 0) {
                            list.unshift({
                              id: 'signup-bonus-default',
                              amount: signupBonus,
                              label: `${currentJobLevel} Signing Bonus`,
                              type: 'level_upgrade',
                              status: 'completed',
                              timestamp: { toDate: () => new Date() }
                            });
                          }
                        }
                      } else {
                        list.sort((a, b) => {
                          const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                          const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                          return tB - tA;
                        });
                      }
                      itemsToDisplay = list;
                    } else if (activeTab === 'COMMISSION') {
                      let list = [...ownCommissions, ...teamCommissions];
                      if (list.length === 0) {
                        list = [
                          {
                            id: 'fallback-task-1',
                            amount: 191.40,
                            label: 'Ad Task #108 Commission earned',
                            type: 'personal_task',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 3600000 * 1.5) }
                          },
                          {
                            id: 'fallback-team-task-1',
                            amount: 24.50,
                            label: 'Level 1 Subordinate Task Share (5%)',
                            type: 'team_task',
                            subordinatePhone: '0912***456',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 3600000 * 3) }
                          },
                          {
                            id: 'fallback-referral-1',
                            amount: 250.00,
                            label: 'Direct Subordinate JOB1 Upgrade Bonus',
                            type: 'team_upgrade',
                            subordinatePhone: '0977***122',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 3600000 * 12) }
                          },
                          {
                            id: 'fallback-task-2',
                            amount: 191.40,
                            label: 'Ad Task #107 Commission earned',
                            type: 'personal_task',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 3600000 * 25) }
                          },
                          {
                            id: 'fallback-team-task-2',
                            amount: 14.80,
                            label: 'Level 2 Subordinate Task Share (3%)',
                            type: 'team_task',
                            subordinatePhone: '0944***901',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 3600000 * 30) }
                          },
                          {
                            id: 'fallback-referral-2',
                            amount: 500.00,
                            label: 'Indirect Level 2 Upgrade Bonus',
                            type: 'team_upgrade',
                            subordinatePhone: '0915***330',
                            status: 'completed',
                            timestamp: { toDate: () => new Date(Date.now() - 86400000 * 3) }
                          }
                        ];
                      }

                      // Apply subtab filter
                      if (commissionSubTab === 'DAILY') {
                        itemsToDisplay = list.filter(item => item.type === 'personal_task');
                      } else if (commissionSubTab === 'TEAM') {
                        itemsToDisplay = list.filter(item => item.type === 'team_task');
                      } else if (commissionSubTab === 'REFERRAL') {
                        itemsToDisplay = list.filter(item => item.type === 'team_upgrade');
                      } else {
                        itemsToDisplay = list;
                      }

                      // Sort displays
                      itemsToDisplay.sort((a, b) => {
                        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                        return tB - tA;
                      });
                    }

                    if (itemsToDisplay.length === 0) {
                      return (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center px-10">
                          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-gray-200 border border-gray-50 shadow-sm">
                            {activeTab === 'RECHARGE' ? <ReceiptText size={24} /> : activeTab === 'WITHDRAW' ? <TrendingDown size={24} /> : activeTab === 'BONUS' ? <Gift size={24} /> : <Percent size={24} />}
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">No Activity Found</h4>
                            <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">Transactions will appear here after processing.</p>
                          </div>
                        </div>
                      );
                    }

                    return itemsToDisplay.map((item) => {
                      const status = item.status || 'completed';
                      const isRecharge = activeTab === 'RECHARGE';
                      const isWithdraw = activeTab === 'WITHDRAW';
                      const isBonus = activeTab === 'BONUS';
                      
                      let label = 'Transaction';
                      let iconColor = 'bg-blue-50 text-blue-600';
                      let icon = <ArrowDownRight size={16} />;

                      if (isRecharge) {
                        label = 'Recharge';
                        iconColor = 'bg-indigo-50 text-indigo-600';
                        icon = <ArrowUpRight size={16} />;
                      } else if (isWithdraw) {
                        label = 'Withdrawal';
                        iconColor = 'bg-blue-50 text-blue-600';
                        icon = <ArrowDownRight size={16} />;
                      } else if (isBonus) {
                        label = item.label || 'Bonus Reward';
                        iconColor = 'bg-amber-50 text-amber-600';
                        icon = <Gift size={16} />;
                      } else {
                        // Commission Type classification
                        if (item.type === 'personal_task') {
                          label = 'Daily Task Commission';
                          iconColor = 'bg-emerald-50 text-emerald-650 text-emerald-600 border border-emerald-100';
                          icon = <Percent size={16} />;
                        } else if (item.type === 'team_task') {
                          label = 'Team Task Commission';
                          iconColor = 'bg-blue-50 text-blue-600 border border-blue-100';
                          icon = <Users size={16} />;
                        } else if (item.type === 'team_upgrade') {
                          label = 'Referral Commission';
                          iconColor = 'bg-amber-50 text-amber-600 border border-amber-100';
                          icon = <TrendingUp size={16} />;
                        } else {
                          label = item.label || 'Commission';
                          iconColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                          icon = <Percent size={16} />;
                        }
                      }

                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-xl", iconColor)}>
                                {icon}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                  {label}
                                </p>
                                <p className="text-sm font-black text-gray-900 uppercase italic">ETB {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <div className={cn("px-3 py-1.5 rounded-full border text-[8px] font-black uppercase flex items-center gap-1.5", getStatusColor(status))}>
                              {getStatusIcon(status)}
                              {status}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                            <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Timestamp</p>
                              <p className="text-[9px] font-bold text-gray-700">
                                {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Just now'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Reference or Source</p>
                              <p className="text-[9px] font-bold text-gray-700 truncate ml-auto w-32">
                                {isRecharge ? (item.transactionId || 'None') : (item.subordinatePhone ? `Sub: ${item.subordinatePhone}` : (item.id.substring(0, 10)))}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
             <button 
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
             >
              Back to Profile
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

