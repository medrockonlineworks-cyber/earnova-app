import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, QrCode, TrendingUp, Users, Award, Wallet, Download } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';
import QRCode from 'qrcode';

interface InviteModalProps {
  onClose: () => void;
  t: any;
  userPhone?: string;
}

export function InviteModal({ onClose, t, userPhone }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const rawCode = userPhone || localStorage.getItem('earnova_logged_in_phone') || '';
  
  // Calculate secure masked alphanumeric referral code using high-end base-36 encoding
  let inviteCode = '';
  if (rawCode && /^\d+$/.test(rawCode)) {
    const val = parseInt(rawCode, 10);
    inviteCode = `ERN-${val.toString(36).toUpperCase()}`;
  } else {
    inviteCode = rawCode || 'ERN-' + Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase();
  }

  const inviteLink = `${window.location.origin}?ref=${inviteCode}`;

  // Dynamically compile the high-fidelity QR Code URL when inviteLink updates
  useEffect(() => {
    QRCode.toDataURL(inviteLink, {
      width: 500,
      margin: 2,
      color: {
        dark: '#2563EB', // Beautiful royal blue matching the interactive dashboard primary accent
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Error compiling premium QR code:', err));
  }, [inviteLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.notificationOccurred('success');
    }
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
        className="relative bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-y-auto max-h-[90vh] sm:max-h-[85vh] shadow-2xl no-scrollbar z-10"
      >
        <div className="p-6 space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">
              {t('btn_invite')}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Code Showcase Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-4">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
                {t('official_partner')}
              </div>
              <div className="space-y-1">
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest leading-none">Your Invitation ID</p>
                <p className="text-4xl font-black tracking-tighter italic">{inviteCode}</p>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-2xl" />
          </div>

          {/* Invitation Copy and Share Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('btn_invite')} Link</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="flex-1 text-xs font-bold text-gray-600 truncate">{inviteLink}</p>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "p-2 rounded-xl transition-all active:scale-95 cursor-pointer",
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
                className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform cursor-pointer"
              >
                <Share2 size={16} />
                Share
              </button>
              <button 
                onClick={() => {
                  if (WebApp?.HapticFeedback) {
                    WebApp.HapticFeedback.impactOccurred('medium');
                  }
                  setShowQrModal(true);
                }}
                className="flex items-center justify-center gap-2 py-4 bg-blue-100 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform cursor-pointer"
              >
                <QrCode size={16} />
                QR Code
              </button>
            </div>
          </div>


          {/* Detailed Commission Breakdown */}
          <div className="space-y-4 border-t border-gray-100 pt-5">
            <h4 className="text-[10px] font-blue-900 font-black uppercase tracking-[0.15em] text-gray-500 leading-none">Core Commission Program</h4>
            
            <div className="space-y-3.5">
              {/* Type 1: Direct First Recharge Bonus */}
              <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 rounded-2xl p-4 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-500/20 text-amber-600 rounded-lg">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-gray-900 tracking-tight">Direct Recharge Rewards</h5>
                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">First Deposit Bonus (12% - 4% - 2%)</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                  Earn high-tier payouts when team subordinates register and upgrade their JOB deposit package for the first time:
                </p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white/60 p-2 rounded-xl border border-amber-500/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Level 1 (Direct)</p>
                    <p className="text-sm font-black text-amber-600">12%</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl border border-amber-500/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Level 2</p>
                    <p className="text-sm font-black text-gray-500">4%</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl border border-amber-500/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Level 3</p>
                    <p className="text-sm font-black text-gray-500">2%</p>
                  </div>
                </div>
                <p className="text-[8.5px] text-gray-400 italic mt-2">
                  Example: If your Level 1 friend unlocks JOB3 (30,000 ETB), you instantly receive <span className="text-amber-600 font-bold">3,600 ETB</span> cash reward!
                </p>
              </div>

              {/* Type 2: Passive Daily Task Commission */}
              <div className="bg-blue-600/5 hover:bg-blue-600/10 border border-blue-600/15 rounded-2xl p-4 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-600/20 text-blue-600 rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-gray-900 tracking-tight">Daily Task Dividends</h5>
                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Passive Team Stream (5% - 3% - 1%)</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                  Receive a daily percentage of the total task execution profits earned by your entire subordinate team network:
                </p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white/60 p-2 rounded-xl border border-blue-600/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">L1 (Direct)</p>
                    <p className="text-sm font-black text-blue-600">5%</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl border border-blue-600/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">L2 Subordinate</p>
                    <p className="text-sm font-black text-gray-500">3%</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl border border-blue-600/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">L3 Subordinate</p>
                    <p className="text-sm font-black text-gray-500">1%</p>
                  </div>
                </div>
                <p className="text-[8.5px] text-gray-400 italic mt-2">
                  Example: If 10 L1 partners earn 1,035 ETB daily on JOB3 tasks, you get a passive <span className="text-blue-650 font-bold">517.5 ETB</span> every day automatically!
                </p>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
            <p className="text-[10px] font-bold text-blue-800 leading-tight">
              Share your link and build a strong Level 1-2-3 team network. Watch your dividends multiply as your team performs tasks daily!
            </p>
          </div>
        </div>
        
        <div className="h-6" />
      </motion.div>

      {/* Dynamic QR Code Modal Overlay */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl p-6 text-center space-y-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Secure Referral QR</span>
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black italic text-gray-900 leading-none uppercase tracking-tight">SCAN & JOIN EARNOVA</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Direct level 1 affiliate connection code</p>
              </div>

              {/* QR Image Wrapper */}
              <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 w-fit mx-auto shadow-sm relative overflow-hidden group">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Referral QR Code"
                    className="w-48 h-48 mx-auto object-contain bg-white rounded-2xl shadow-inner select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Generating Code...
                  </div>
                )}
              </div>

              {/* Code Info Banner */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">Invitation ID</p>
                <p className="text-xl font-black text-gray-900 tracking-tighter italic">{inviteCode}</p>
                <p className="text-[8.5px] text-gray-400 font-bold leading-relaxed truncate max-w-[260px] mx-auto mt-1">{inviteLink}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {qrCodeDataUrl && (
                  <a 
                    href={qrCodeDataUrl}
                    download={`earnova-invite-qr-${inviteCode}.png`}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-[#0f172a] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Download size={12} /> Save QR Image
                  </a>
                )}
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Back To Invite Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
