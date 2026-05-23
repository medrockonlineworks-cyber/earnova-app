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
  History
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
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
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
  const [activeTab, setActiveTab] = useState<'RECHARGE' | 'WITHDRAW'>('RECHARGE');
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const totalBalance = balance.income + balance.personal + balance.workDeposit;
  
  useEffect(() => {
    if (isOpen && getUserDocId() !== 'guest') {
      setLoading(true);
      
      // Fetch Recharges
      const qr = query(
        collection(db, 'recharges'),
        where('userId', '==', getUserDocId()),
        orderBy('timestamp', 'desc')
      );
      const unsubRecharge = onSnapshot(qr, (snap) => {
        setRecharges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error loading recharges in FinancialRecordModal:", error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'recharges');
        } catch (e) {}
      });

      // Fetch Withdrawals
      const qw = query(
        collection(db, 'withdrawals'),
        where('userId', '==', getUserDocId()),
        orderBy('timestamp', 'desc')
      );
      const unsubWithdraw = onSnapshot(qw, (snap) => {
        setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => {
        console.error("Error loading withdrawals in FinancialRecordModal:", error);
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'withdrawals');
        } catch (e) {}
      });

      return () => {
        unsubRecharge();
        unsubWithdraw();
      };
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
            </div>

            {/* Tab Switcher */}
            <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
                <button 
                  onClick={() => {
                    setActiveTab('RECHARGE');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'RECHARGE' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400"
                  )}
                >
                  <ArrowUpRight size={14} />
                  Recharge
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('WITHDRAW');
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'WITHDRAW' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400"
                  )}
                >
                  <ArrowDownRight size={14} />
                  Withdraw
                </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Syincing Data...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeTab === 'RECHARGE' ? recharges : withdrawals).length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center px-10">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-gray-200 border border-gray-50 shadow-sm">
                        {activeTab === 'RECHARGE' ? <ReceiptText size={24} /> : <TrendingDown size={24} />}
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">No Activity Found</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">Transactions will appear here after processing.</p>
                      </div>
                    </div>
                  ) : (
                    (activeTab === 'RECHARGE' ? recharges : withdrawals).map((item) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-xl",
                              activeTab === 'RECHARGE' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {activeTab === 'RECHARGE' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                {activeTab === 'RECHARGE' ? 'Recharge' : 'Withdrawal'}
                              </p>
                              <p className="text-sm font-black text-gray-900 uppercase italic">ETB {item.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className={cn("px-3 py-1.5 rounded-full border text-[8px] font-black uppercase flex items-center gap-1.5", getStatusColor(item.status))}>
                            {getStatusIcon(item.status)}
                            {item.status}
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
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Reference</p>
                            <p className="text-[9px] font-bold text-gray-700 truncate ml-auto w-24">
                              {activeTab === 'RECHARGE' ? (item.transactionId || 'None') : (item.id.substring(0, 10))}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
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

