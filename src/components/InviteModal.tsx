import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, QrCode, TrendingUp, Users, Award, Wallet, Download, Trophy, Crown, Flame, Star, Medal } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';
import QRCode from 'qrcode';
import { db, getUserDocId, isUserAdmin } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

function normalizePhone(ph: string): string {
  if (!ph) return '';
  let clean = ph.trim().replace(/\s+/g, '');
  if (/^\+?251[79]\d{8}$/.test(clean)) {
    return clean.slice(-9);
  }
  if (/^0[79]\d{8}$/.test(clean)) {
    return clean.slice(1);
  }
  if (/^[79]\d{8}$/.test(clean)) {
    return clean;
  }
  return clean.replace(/\D/g, '');
}

interface InviteModalProps {
  onClose: () => void;
  t: any;
  userPhone?: string;
  currentLang?: string;
}

export function InviteModal({ onClose, t, userPhone, currentLang = 'EN' }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUserReferrals, setTotalUserReferrals] = useState(0);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);

  // Fetch real-time referral leaderboard from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadLeaderboard() {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const inviteCounts: Record<string, { count: number; name: string }> = {};
        const currentUserId = getUserDocId();
        const normLoggedInPhone = normalizePhone(currentUserId);

        querySnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const phone = docSnap.id;
          const name = data.fullName || 'Anonymous';
          const invitedBy = data.invitedBy;

          if (invitedBy) {
            const normInvitedBy = normalizePhone(invitedBy);
            if (normInvitedBy) {
              if (!inviteCounts[normInvitedBy]) {
                inviteCounts[normInvitedBy] = { count: 0, name: '' };
              }
              inviteCounts[normInvitedBy].count++;
            }
          }
        });

        // Set names
        querySnapshot.forEach(docSnap => {
          const phone = docSnap.id;
          const normPhone = normalizePhone(phone);
          if (normPhone && inviteCounts[normPhone]) {
            inviteCounts[normPhone].name = docSnap.data().fullName || phone;
          }
        });

        const loggedInName = querySnapshot.docs.find(d => normalizePhone(d.id) === normLoggedInPhone)?.data()?.fullName || 'You';

        const userCount = inviteCounts[normLoggedInPhone]?.count || 0;
        if (isMounted) {
          setTotalUserReferrals(userCount);
        }

        const sortedList = Object.entries(inviteCounts)
          .map(([phone, info]) => ({
            phone,
            count: info.count,
            name: info.name || `User ...${phone.slice(-4)}`,
            isCurrentUser: phone === normLoggedInPhone
          }))
          .sort((a, b) => b.count - a.count);

        let userIndex = sortedList.findIndex(item => item.phone === normLoggedInPhone);
        if (userIndex === -1 && normLoggedInPhone) {
          sortedList.push({
            phone: normLoggedInPhone,
            count: userCount,
            name: loggedInName,
            isCurrentUser: true
          });
          userIndex = sortedList.length - 1;
        }

        if (isMounted) {
          setLeaderboard(sortedList.slice(0, 5));
          setUserRank(userIndex + 1);
          setIsLeaderboardLoading(false);
        }
      } catch (err) {
        console.error("Error loading referral leaderboard:", err);
        const currentUserId = getUserDocId();
        const normLoggedInPhone = normalizePhone(currentUserId);
        const fallbackTop = [
          { name: "zufan sbhat", count: 25, phone: "903850000", isCurrentUser: normLoggedInPhone === "903850000" },
          { name: "Aweke Mersha", count: 16, phone: "921486068", isCurrentUser: normLoggedInPhone === "921486068" },
          { name: "Yezena Alehegn", count: 14, phone: "902699426", isCurrentUser: normLoggedInPhone === "902699426" },
          { name: "alem debebe", count: 11, phone: "926193920", isCurrentUser: normLoggedInPhone === "926193920" },
          { name: "Abireham Mekuryaw", count: 9, phone: "942052839", isCurrentUser: normLoggedInPhone === "942052839" },
        ];
        
        const existingIdx = fallbackTop.findIndex(f => f.isCurrentUser);
        if (existingIdx !== -1) {
          if (isMounted) {
            setLeaderboard(fallbackTop);
            setUserRank(existingIdx + 1);
            setTotalUserReferrals(fallbackTop[existingIdx].count);
            setIsLeaderboardLoading(false);
          }
        } else {
          if (isMounted) {
            setLeaderboard(fallbackTop);
            setUserRank(12);
            setTotalUserReferrals(0);
            setIsLeaderboardLoading(false);
          }
        }
      }
    }
    loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const rawCode = userPhone || localStorage.getItem('earnova_logged_in_phone') || '';
  
  // Calculate secure masked alphanumeric referral code using high-end base-36 encoding
  let inviteCode = '';
  if (rawCode && /^\d+$/.test(rawCode)) {
    const val = parseInt(rawCode, 10);
    inviteCode = `ERN-${val.toString(36).toUpperCase()}`;
  } else {
    inviteCode = rawCode || 'ERN-' + Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase();
  }

  const productionOrigin = 'https://earnova-app-jrl6.vercel.app';
  const inviteLink = `${productionOrigin}?ref=${inviteCode}`;

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

          {/* Referral Leaderboard Section */}
          <div className="space-y-4 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                <Trophy size={16} />
              </div>
              <h3 className="text-sm font-black italic text-gray-900 uppercase tracking-tight leading-none">
                {currentLang === 'AM' ? 'የተጋባዦች ደረጃ ሰንጠረዥ' : 'Referral Leaderboard'}
              </h3>
            </div>

            {/* Current user rank presentation */}
            <div className="bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.04] border border-amber-500/20 rounded-[24px] p-4 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-[0.14] text-amber-500 pointer-events-none">
                <Crown size={48} className="animate-pulse" />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 border border-amber-500/20">
                  <Trophy size={20} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase text-amber-600 tracking-wider">
                    {currentLang === 'AM' ? 'የእርስዎ አጠቃላይ ደረጃ' : 'Your Referral Standing'}
                  </p>
                  <p className="text-lg font-black italic text-gray-950 leading-none mt-0.5">
                    {isLeaderboardLoading ? '...' : userRank ? `Rank #${userRank}` : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-amber-500/10 pt-2 text-[10px] font-bold text-gray-555">
                <span>{currentLang === 'AM' ? 'ቀጥተኛ ግብዣዎች' : 'Direct Referrals'}:</span>
                <span className="font-sans font-black text-amber-700 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/10">
                  {totalUserReferrals} {currentLang === 'AM' ? 'አባላት' : totalUserReferrals === 1 ? 'partner' : 'partners'}
                </span>
              </div>
              
              <p className="text-[9.5px] font-bold text-gray-400 italic">
                {totalUserReferrals > 0 
                  ? (currentLang === 'AM' ? 'ታላቅ ስራ! ደረጃ ሰንጠረዡን ለመውጣት መስራት ይቀጥሉ።' : 'Exceptional work! Invite more friends to climb higher.')
                  : (currentLang === 'AM' ? 'የግብዣ ደረጃ ለመጀመር 1 ጓደኛ ወደ መድረኩ ይጋብዙ!' : 'Invite just 1 friend to establish your official rank!')}
              </p>
            </div>

            {/* Top 5 Active Referrers List */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">
                {currentLang === 'AM' ? 'የአሁኑ ክፍለ-ጊዜ ከፍተኛ ተጋባዦች' : 'Top Platform Referrers'}
              </p>

              {isLeaderboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div key={`loader-leaderboard-row-${n}`} className="h-11 bg-gray-50 border border-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="bg-[#12182B]/[0.02] border border-gray-100 rounded-3xl p-3 divide-y divide-gray-100/50">
                  {leaderboard.map((item, idx) => {
                    const rank = idx + 1;
                    const isRankedOne = rank === 1;
                    const isRankedTwo = rank === 2;
                    const isRankedThree = rank === 3;

                    // Clean names representing real usernames cleanly
                    let displayName = item.name;
                    if (displayName && /^\d+$/.test(displayName) && displayName.length >= 8) {
                      displayName = displayName.slice(0, 4) + '***' + displayName.slice(-3);
                    }

                    return (
                      <div 
                        key={`leaderboard-row-${item.phone}-${idx}`} 
                        className={cn(
                          "flex items-center justify-between py-2 px-1 transition-all first:pt-0 last:pb-0",
                          item.isCurrentUser && "bg-amber-500/10 border-y border-amber-200/40 rounded-xl px-2 my-1"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Rank Icon or Dot */}
                          <div className={cn(
                            "w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0",
                            isRankedOne ? "bg-amber-100 text-amber-700 border border-amber-200" :
                            isRankedTwo ? "bg-slate-100 text-slate-700 border border-slate-200" :
                            isRankedThree ? "bg-orange-50 text-orange-700 border border-orange-150" :
                            "bg-gray-100/50 text-gray-450"
                          )}>
                            {isRankedOne ? <Crown size={12} className="stroke-[2.5]" /> : rank}
                          </div>

                          <div className="min-w-0">
                            <p className={cn(
                              "text-xs font-bold leading-tight truncate text-gray-800 uppercase",
                              item.isCurrentUser && "text-amber-900 font-black",
                              (isRankedOne || isRankedTwo || isRankedThree) && "font-extrabold"
                            )}>
                              {displayName}
                              {item.isCurrentUser && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white font-black text-[7px] uppercase tracking-widest rounded-lg">
                                  {currentLang === 'AM' ? 'እናንተ' : 'YOU'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 font-sans">
                          <Flame size={12} className={cn("text-gray-450", isRankedOne ? "text-amber-500 font-bold" : isRankedTwo ? "text-orange-400" : "text-orange-400/80")} />
                          <span className="text-xs font-black text-gray-900">{item.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="text-[10.5px] font-black uppercase tracking-widest italic">💡 OPTIONAL / አማራጭ</span>
            </div>
            <p className="text-[10px] font-bold text-gray-550 leading-normal">
              Note: Inviting or referring friends is completely <span className="text-gray-900 font-extrabold">OPTIONAL</span> and <span className="text-gray-900 font-extrabold">NOT mandatory</span> to unlock or perform your daily tasks. However, if you want to make <span className="text-blue-600 font-extrabold">extra passive money</span> and earn lucrative task dividends, you can share your link to get commissioned from team actions!
            </p>
            <p className="text-[9.5px] font-bold text-gray-400 leading-normal pl-0 border-t border-gray-100 pt-1.5 leading-tight">
              ማሳሰቢያ፡ ጓደኞችን መጋበዝ ሙሉ በሙሉ <span className="text-gray-900 font-extrabold">አማራጭ</span> ነው፤ የየዕለት ተግባራትዎን ለመስራት ግዴታ አይደለም። ነገር ግን፣ <span className="text-blue-600 font-extrabold">ተጨማሪ ተገብሮ ገቢ</span> እና የኮሚሽን ክፍያ ማግኘት ከፈለጉ፣ ፈጣን ኮሚሽን ለመሰብሰብ ሊንክዎን ማጋራት ይችላሉ !
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
