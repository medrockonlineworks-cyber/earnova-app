import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, QrCode } from 'lucide-react';
import { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';

interface InviteModalProps {
  onClose: () => void;
  t: any;
}

export function InviteModal({ onClose, t }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const inviteCode = 'E' + Math.floor(100000 + Math.random() * 900000);
  const inviteLink = `https://t.me/EarnovaJobsBot?start=${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    WebApp.HapticFeedback.notificationOccurred('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join EARNOVA',
        text: 'Join EARNOVA and start earning today!',
        url: inviteLink,
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

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
        className="relative bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">
              {t('btn_invite')}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-4">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                {t('official_partner')}
              </div>
              <div className="space-y-1">
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest leading-none">Invitation Code</p>
                <p className="text-4xl font-black tracking-tighter italic">{inviteCode}</p>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-2xl" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('btn_invite')} Link</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="flex-1 text-xs font-bold text-gray-600 truncate">{inviteLink}</p>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "p-2 rounded-xl transition-all active:scale-95",
                    copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
              >
                <Share2 size={16} />
                Share
              </button>
              <button 
                onClick={() => WebApp.HapticFeedback.impactOccurred('medium')}
                className="flex items-center justify-center gap-2 py-4 bg-blue-100 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
              >
                <QrCode size={16} />
                QR Code
              </button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
            <p className="text-[10px] font-bold text-blue-800 leading-tight">
              {t('income_bonus_desc').split('.')[0]}. Share your link and grow your team to earn more commissions!
            </p>
          </div>
        </div>
        
        <div className="h-6" />
      </motion.div>
    </div>
  );
}
