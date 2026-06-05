import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, CheckCircle2, AlertCircle, ArrowDownLeft, Wallet } from 'lucide-react';
import { db, auth, getUserDocId } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import WebApp from '@twa-dev/sdk';

interface WithdrawalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export function WithdrawalHistoryModal({ isOpen, onClose, t }: WithdrawalHistoryModalProps) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const uid = getUserDocId();
    if (isOpen && uid !== 'guest') {
      setLoading(true);

      const fetchData = async () => {
        let localBackup: any[] = [];
        try {
          const stored = localStorage.getItem(`earnova_cache_withdrawals_${uid}`);
          if (stored) {
            localBackup = JSON.parse(stored);
          }
        } catch (e) {}

        try {
          const q = query(
            collection(db, 'withdrawals'),
            where('userId', '==', uid),
            limit(1000)
          );
          const snapshot = await getDocs(q);
          if (!active) return;
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as any));
          data.sort((a: any, b: any) => {
            const getMs = (val: any) => {
              if (!val) return 0;
              if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
              if (typeof val.toDate === 'function') return val.toDate().getTime();
              return new Date(val).getTime();
            };
            return getMs(b.timestamp) - getMs(a.timestamp);
          });
          setWithdrawals(data);

          try {
            localStorage.setItem(`earnova_cache_withdrawals_${uid}`, JSON.stringify(data));
          } catch (e) {}
        } catch (error) {
          console.warn("Firestore error fetching withdrawals (using local cache):", error);
          if (active && localBackup.length > 0) {
            setWithdrawals(localBackup);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      fetchData();

      return () => {
        active = false;
      };
    }
  }, [isOpen]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'failed': return <AlertCircle size={16} className="text-rose-500" />;
      default: return <Clock size={16} className="text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'failed': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-gray-50 w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 pt-8 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">Withdrawal History</h2>
                </div>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading history...</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 space-y-4 text-center px-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300">
                    <ArrowDownLeft size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No Withdrawals Yet</h3>
                    <p className="text-[10px] font-medium text-gray-400 leading-relaxed">Your withdrawal transactions will appear here once you initiate them.</p>
                  </div>
                </div>
              ) : (
                withdrawals.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          <Wallet size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Amount</p>
                          <p className="text-sm font-black text-gray-900 uppercase italic">ETB {item.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className={cn("px-3 py-1.5 rounded-full border text-[9px] font-black uppercase flex items-center gap-1.5", getStatusColor(item.status))}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</p>
                        <p className="text-[10px] font-bold text-gray-700">
                          {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Processing...'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Method</p>
                        <p className="text-[10px] font-bold text-gray-700">{item.method || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
               <button 
                onClick={onClose}
                className="w-full bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-rose-100 mb-2"
               >
                Exit View
               </button>
               <p className="text-[10px] font-black text-gray-400 uppercase text-center tracking-widest">
                Showing your last {withdrawals.length} transactions
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
