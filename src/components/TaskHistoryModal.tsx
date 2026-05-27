import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { db, getUserDocId } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import WebApp from '@twa-dev/sdk';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export function TaskHistoryModal({ isOpen, onClose, t }: TaskHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (isOpen && getUserDocId() !== 'guest') {
      setLoading(true);
      const activeUserId = getUserDocId();
      
      const fetchData = async () => {
        let localBackup: any[] = [];
        try {
          const stored = localStorage.getItem(`earnova_stats_history_${activeUserId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              localBackup = parsed.map(item => ({
                id: item.id || Math.random().toString(),
                taskTitle: item.taskTitle || 'Video Spot Feedback',
                commission: item.commission || 0,
                timestamp: item.dateStr ? new Date(item.dateStr) : new Date()
              }));
            }
          }
        } catch (e) {}

        try {
          const q = query(
            collection(db, 'taskHistory'),
            where('userId', '==', activeUserId),
            orderBy('timestamp', 'desc'),
            limit(1000)
          );
          const snapshot = await getDocs(q);
          if (!active) return;
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistory(data);
        } catch (error) {
          console.warn("Firestore error fetching task history (using local backup):", error);
          if (active && localBackup.length > 0) {
            setHistory(history => localBackup);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
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
            className="relative bg-gray-50 h-[80vh] w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pt-8 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <History size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">Task History</h2>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                      <Sparkles size={8} /> Claimed Rewards Logs
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    WebApp.HapticFeedback.impactOccurred('light');
                    onClose();
                  }} 
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading task logs...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-200/50">
                    <Clock size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">No Task Records</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                      You haven't completed any video research tasks yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.4) }}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-950 uppercase tracking-tight truncate">
                          {item.taskTitle || 'Video Spot Feedback'}
                        </h4>
                        <p className="text-[8px] font-mono font-bold text-gray-400 mt-1 uppercase tracking-wider">
                          {formatDate(item.timestamp)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-150 flex items-center gap-1">
                          <CheckCircle2 size={12} className="stroke-[2.5]" />
                          +ETB {Number(item.commission || 0).toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Safe Area margin */}
            <div className="pb-6" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
