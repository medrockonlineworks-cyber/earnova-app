import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WebApp from '@twa-dev/sdk';
import { 
  X, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  MessageCircle
} from 'lucide-react';

interface SupportCenterProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export function SupportCenter({ isOpen, onClose, t }: SupportCenterProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const faqs = [
    { q: t('support_faq_q1'), a: t('support_faq_a1') },
    { q: t('support_faq_q2'), a: t('support_faq_a2') },
    { q: t('support_faq_q3'), a: t('support_faq_a3') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight italic leading-none">{t('support_center')}</h2>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">24/7 Official Support</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div 
                    key={`support-faq-item-list-${idx}`} 
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <button 
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
                    >
                      <span className="text-xs font-black text-gray-900 uppercase pr-4 leading-relaxed italic">{faq.q}</span>
                      {expandedFaq === idx ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} className="text-gray-300" />}
                    </button>
                    <AnimatePresence>
                      {expandedFaq === idx && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 overflow-hidden"
                        >
                          <div className="pt-2 border-t border-gray-50">
                            <p className="text-[11px] font-bold text-gray-500 leading-relaxed italic uppercase">{faq.a}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* External Support Links */}
                <div className="pt-4 space-y-3">
                  <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">{t('support_contact_us')}</h3>
                  <button 
                    onClick={() => {
                      WebApp.HapticFeedback.impactOccurred('medium');
                      window.open('https://t.me/EARNOVA_OFFICIALS', '_blank');
                    }}
                    className="w-full p-4 bg-white rounded-2xl border border-blue-100 flex items-center gap-4 active:scale-95 transition-all group text-left"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase italic leading-none">{t('support_telegram')}</p>
                      <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">@EARNOVA_OFFICIALS</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
