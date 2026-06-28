import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle, Coins, CheckCircle2, Gift } from 'lucide-react';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db, getUserDocId } from '../lib/firebase';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalBalance: number;
  onReward: (amount: number, spinCost: number) => Promise<void>;
  t: any;
}

// Exactly matching the 18 segments and colors from the user's uploaded image
const SEGMENTS = [
  { value: 50, label: '50', color: '#F59E0B' }, // Yellow-orange
  { value: 100, label: '100', color: '#8B5CF6' }, // Purple
  { value: 150, label: '150', color: '#0EA5E9' }, // Sky Blue
  { value: 200, label: '200', color: '#84CC16' }, // Lime Green
  { value: 1000, label: '1000', color: '#10B981' }, // Green/Teal
  { value: 500, label: '500', color: '#A855F7' }, // Violet
  { value: 550, label: '550', color: '#1E293B' }, // Dark Slate
  { value: 600, label: '600', color: '#EF4444' }, // Bright Red
  { value: 650, label: '650', color: '#7C3AED' }, // Deep Purple
  { value: 700, label: '700', color: '#F97316' }, // Orange
  { value: 10, label: '10', color: '#06B6D4' }, // Cyan
  { value: 800, label: '800', color: '#3B82F6' }, // Royal Blue
  { value: 2000, label: '2000', color: '#22C55E' }, // Bright Green
  { value: 60, label: '60', color: '#14B8A6' }, // Teal
  { value: 995, label: '995', color: '#EC4899' }, // Pink
  { value: 500, label: '500', color: '#0F172A' }, // Deep Slate/Black
  { value: 10000, label: '10000', color: '#DC2626' }, // Crimson Red
  { value: 900, label: '900', color: '#D97706' }, // Amber/Gold
];

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

export function ResultModal({ isOpen, onClose, amount }: ResultModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#5C0620] to-[#120008] border-2 border-yellow-400/40 text-white rounded-[32px] overflow-hidden p-8 shadow-[0_0_50px_rgba(245,158,11,0.4)] z-[100] text-center"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-yellow-400/10 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col items-center">
              {/* Icon / Sparkles container */}
              <div className="relative w-20 h-20 bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                <Sparkles size={40} className="text-yellow-400" />
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/40 animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <h3 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200">
                {amount > 0 ? 'Splendid Win!' : 'Keep Rolling!'}
              </h3>
              
              <p className="text-[10px] text-pink-100/60 font-bold uppercase tracking-wider mt-2 max-w-[250px]">
                {amount > 0 
                  ? 'Your prize has been instantly credited to your active wallet.' 
                  : 'Better luck in the next spin! Practice makes perfect.'}
              </p>

              {amount > 0 ? (
                <div className="my-8 py-4 px-8 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
                  <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase">Prize Claimed</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-white">{amount}</span>
                    <span className="text-sm font-black text-yellow-400">ETB</span>
                  </div>
                </div>
              ) : (
                <div className="my-8 py-4 px-8 bg-slate-500/10 border border-slate-500/20 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Status</span>
                  <span className="text-xl font-black text-slate-300 mt-1 uppercase tracking-wider">0 ETB</span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all cursor-pointer animate-pulse"
              >
                Collect
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function LuckyWheelModal({ isOpen, onClose, personalBalance, onReward, t }: LuckyWheelModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [extraSpins, setExtraSpins] = useState(0);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [showRewardClaimed, setShowRewardClaimed] = useState(false);

  // Redemption states
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setWonAmount(null);
      setShowRewardClaimed(false);
      setSpinError(null);
      setRedeemSuccess(null);
      setRedeemError(null);
      setPromoCode('');
    }
  }, [isOpen]);

  // Sync extra spins count from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const userId = getUserDocId();
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExtraSpins(data.extraSpins || 0);
      }
    }, (err) => {
      console.warn("Could not listen to extraSpins:", err);
    });

    return () => unsub();
  }, [isOpen]);

  const handleSpin = async () => {
    if (isSpinning) return;
    setSpinError(null);
    setWonAmount(null);
    setShowRewardClaimed(false);

    if (extraSpins <= 0) {
      setSpinError('Please enter a valid Promo Code to get a Free Spin!');
      return;
    }

    setIsSpinning(true);
    const spinCost = 0; // Promotional spin cost is 0

    // Generate a random winning segment (0 to 17)
    const winningIndex = Math.floor(Math.random() * SEGMENTS.length);
    const segmentAngle = 360 / SEGMENTS.length; // 20 degrees
    const sliceCenterAngle = (winningIndex * segmentAngle) + (segmentAngle / 2);
    
    // We want the slice center to land precisely at 270 degrees (12 o'clock pointer position)
    // Formula: R = 270 - sliceCenterAngle
    let baseRotation = 270 - sliceCenterAngle;
    if (baseRotation < 0) baseRotation += 360;
    
    // Perform 6 to 8 full spins for realistic high-speed spin experience
    const extraSpinsToPerform = 6 + Math.floor(Math.random() * 3);
    const targetAngle = (extraSpinsToPerform * 360) + baseRotation;
    
    setRotation(targetAngle);

    // Wait for the rotation transition to complete (3.2 seconds)
    setTimeout(async () => {
      const winningSegment = SEGMENTS[winningIndex];
      const prizeAmount = winningSegment.value;

      try {
        await onReward(prizeAmount, spinCost);
        setWonAmount(prizeAmount);
        setShowRewardClaimed(true);

        // Decrement extraSpins in Firestore
        const userId = getUserDocId();
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            extraSpins: increment(-1)
          });
        }
      } catch (err) {
        setSpinError('Failed to claim reward. Please contact customer support.');
      } finally {
        setIsSpinning(false);
      }
    }, 3200);
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);
    const cleanCode = promoCode.trim().toUpperCase();

    if (!cleanCode) {
      setRedeemError('Please enter a promo code');
      return;
    }

    setIsRedeeming(true);
    try {
      let codeRef = doc(db, 'promo_codes', cleanCode);
      let codeSnap = await getDoc(codeRef);
      let isCoupon = false;

      if (!codeSnap.exists()) {
        const couponRef = doc(db, 'coupons', cleanCode);
        const couponSnap = await getDoc(couponRef);
        if (couponSnap.exists()) {
          codeRef = couponRef;
          codeSnap = couponSnap;
          isCoupon = true;
        } else {
          setRedeemError('Invalid promo code.');
          setIsRedeeming(false);
          return;
        }
      }

      const codeData = codeSnap.data();
      if (codeData.type !== 'lucky_wheel') {
        setRedeemError('This code is not valid for the Lucky Wheel.');
        setIsRedeeming(false);
        return;
      }

      const userId = getUserDocId();
      if (!userId) {
        setRedeemError('Please login to redeem codes.');
        setIsRedeeming(false);
        return;
      }

      if (codeData.targetUser) {
        const target = codeData.targetUser.trim().toLowerCase();
        let isEligible = userId.toLowerCase() === target;

        if (!isEligible && userId) {
          try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              const uPhone = (uData.phoneNumber || '').trim().toLowerCase();
              if (uPhone === target) {
                isEligible = true;
              }
            }
          } catch (err) {
            console.warn("Failed to check target user details in lucky wheel:", err);
          }
        }

        if (!isEligible) {
          setRedeemError('This promo code is restricted to a specific user.');
          setIsRedeeming(false);
          return;
        }
      }

      const maxUsesPerUser = codeData.maxUsesPerUser || 1;
      const claimedUsers = codeData.claimedUsers || [];
      const userClaimsCount = claimedUsers.filter((id: string) => id === userId).length;

      if (userClaimsCount >= maxUsesPerUser) {
        setRedeemError(`You have already claimed this promo code ${userClaimsCount} time(s) (limit is ${maxUsesPerUser}).`);
        setIsRedeeming(false);
        return;
      }

      if (isCoupon) {
        if (codeData.usageLimit !== undefined && codeData.usageLimit <= 0) {
          setRedeemError('This coupon has reached its redemption limit.');
          setIsRedeeming(false);
          return;
        }
      } else {
        if (codeData.maxUses && (codeData.claimedCount || 0) >= codeData.maxUses) {
          setRedeemError('This promo code has reached its maximum usage limit.');
          setIsRedeeming(false);
          return;
        }
      }

      const spinsGranted = codeData.amount || 1;

      if (isCoupon) {
        await updateDoc(codeRef, {
          usageLimit: increment(-1),
          claimedCount: increment(1),
          claimedUsers: arrayUnion(userId)
        });
      } else {
        await updateDoc(codeRef, {
          claimedCount: increment(1),
          claimedUsers: arrayUnion(userId)
        });
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        extraSpins: increment(spinsGranted),
        claimedCodes: arrayUnion(cleanCode)
      });

      setRedeemSuccess(`Successfully redeemed! +${spinsGranted} extra spin(s) granted.`);
      setPromoCode('');
    } catch (err: any) {
      console.error("Error redeeming lucky wheel code:", err);
      setRedeemError('An error occurred. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    if (isSpinning) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#5C0620] via-[#2D0315] to-[#120008] text-white rounded-[36px] overflow-hidden shadow-2xl border-2 border-yellow-400/30 z-10 p-6 max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            {/* Ambient gold decorative coins & light rays */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
              <motion.div 
                animate={{ y: [0, -12, 0], rotate: [0, 360, 720] }} 
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="absolute top-12 left-4 w-6 h-6 bg-amber-400 rounded-full border border-yellow-200 flex items-center justify-center shadow-lg text-yellow-900 font-black text-[10px]"
              >
                $
              </motion.div>
              <motion.div 
                animate={{ y: [0, 15, 0], rotate: [360, 0, -360] }} 
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                className="absolute top-32 right-6 w-8 h-8 bg-amber-500 rounded-full border-2 border-yellow-200 flex items-center justify-center shadow-lg text-yellow-950 font-black text-xs"
              >
                $
              </motion.div>
              <motion.div 
                animate={{ y: [0, -10, 0], rotate: [0, -180, -360] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute bottom-36 left-8 w-5 h-5 bg-yellow-400 rounded-full border border-yellow-100 flex items-center justify-center shadow-lg text-yellow-900 font-bold text-[8px]"
              >
                $
              </motion.div>
              <motion.div 
                animate={{ y: [0, 8, 0], rotate: [0, 360, 0] }} 
                transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                className="absolute bottom-28 right-10 w-7 h-7 bg-amber-600 rounded-full border border-yellow-300 flex items-center justify-center shadow-lg text-yellow-950 font-black text-[10px]"
              >
                $
              </motion.div>
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-yellow-500/20 relative z-10">
              <div className="flex items-center gap-2">
                <Coins className="text-yellow-400 animate-pulse" size={20} />
                <span className="text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200">Lucky Spin Wheel</span>
              </div>
              <button
                onClick={handleClose}
                disabled={isSpinning}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-pink-200 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </div>

            {/* Main Wheel Section */}
            <div className="flex flex-col items-center justify-center py-6 relative z-10">
              {/* Spinning Pointer / Pins */}
              <div className="absolute top-[16px] z-20 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg border border-yellow-200">
                  <div className="w-2 h-2 rounded-full bg-violet-700" />
                </div>
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-500 -mt-1 drop-shadow-[0_4px_6px_rgba(245,158,11,0.5)]" />
              </div>

              {/* Wheel Outer Gold Border Bezel */}
              <div className="relative w-72 h-72 rounded-full bg-slate-900 border-[10px] border-amber-400 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.4),inset_0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">
                <motion.div
                  animate={{ rotate: rotation }}
                  transition={
                    isSpinning
                      ? { duration: 3.2, ease: [0.15, 0.85, 0.15, 1.0] }
                      : { duration: 0 }
                  }
                  className="w-full h-full rounded-full relative"
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {SEGMENTS.map((seg, i) => {
                      const angle = 360 / SEGMENTS.length; // 20 degrees
                      const startAngle = i * angle;
                      const endAngle = startAngle + angle;
                      
                      const rad = Math.PI / 180;
                      const x1 = 50 + 50 * Math.cos(startAngle * rad);
                      const y1 = 50 + 50 * Math.sin(startAngle * rad);
                      const x2 = 50 + 50 * Math.cos(endAngle * rad);
                      const y2 = 50 + 50 * Math.sin(endAngle * rad);

                      return (
                        <g key={`wheel-slice-${i}`}>
                          {/* Segment Path */}
                          <path
                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                            fill={seg.color}
                            stroke="#FBBF24"
                            strokeWidth="0.5"
                          />
                          {/* Segment Text - Perfectly Aligned Radially to the center */}
                          <g transform={`rotate(${startAngle + angle/2} 50 50)`}>
                            <text
                              x="85"
                              y="51.5"
                              fill="#ffffff"
                              fontSize="3.2"
                              fontWeight="950"
                              textAnchor="end"
                              className="font-black text-white select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                            >
                              {seg.label}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Golden blinking light bulbs around outer bezel */}
                    {[...Array(18)].map((_, i) => {
                      const dotAngle = i * 20;
                      const rad = Math.PI / 180;
                      const x = 50 + 47.5 * Math.cos(dotAngle * rad);
                      const y = 50 + 47.5 * Math.sin(dotAngle * rad);
                      return (
                        <circle
                          key={`rim-dot-${i}`}
                          cx={x}
                          cy={y}
                          r="1.0"
                          fill="#FBBF24"
                          className="animate-pulse"
                          style={{ animationDelay: `${i * 0.12}s` }}
                        />
                      );
                    })}
                  </svg>
                </motion.div>

                {/* Center Glossy Gold Dome Hub SPIN Button */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="absolute z-30 w-16 h-16 rounded-full bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-600 border-[3px] border-yellow-200 flex flex-col items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer group"
                >
                  <span className="text-[11px] font-black tracking-wider text-slate-950 uppercase leading-none drop-shadow-sm">SPIN</span>
                  <span className="text-[7px] font-bold text-slate-900 mt-0.5 uppercase tracking-tighter drop-shadow-sm">
                    {extraSpins > 0 ? `${extraSpins} SPIN${extraSpins > 1 ? 'S' : ''}` : 'LOCKED'}
                  </span>
                </button>
              </div>

              {/* Bottom Golden Script Banner from Image */}
              <div className="relative mt-5 bg-gradient-to-r from-violet-800 via-purple-900 to-violet-800 border-2 border-yellow-400 px-8 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] flex items-center justify-center">
                <div className="absolute -inset-1 border border-yellow-400/30 rounded-full pointer-events-none" />
                <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 uppercase drop-shadow font-serif italic">
                  LUCKY WHEEL
                </span>
              </div>
            </div>

            {/* Error or Success Info */}
            <div className="space-y-4 text-center relative z-10">
              {spinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-bounce">
                  <AlertCircle size={14} />
                  <span>{spinError}</span>
                </div>
              )}

              {/* Status Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Available Balance</p>
                  <p className="text-sm font-black text-white">{personalBalance.toLocaleString()} ETB</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Available Spins</p>
                  <p className="text-xs font-black text-yellow-400 uppercase">
                    {extraSpins > 0 ? `${extraSpins} Spin(s)` : 'Locked (Use Code)'}
                  </p>
                </div>
              </div>

              {/* Promo Code Redemption Form */}
              <form onSubmit={handleRedeemCode} className="border-t border-white/5 pt-4 mt-2">
                <p className="text-[8.5px] font-black text-yellow-200 uppercase tracking-widest text-left mb-1.5 pl-1 flex items-center gap-1">
                  <Gift size={11} className="text-yellow-400" /> Have a Wheel Promo Code?
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setRedeemError(null);
                      setRedeemSuccess(null);
                    }}
                    placeholder="ENTER WHEEL CODE"
                    disabled={isRedeeming || isSpinning}
                    className="flex-1 bg-white/[0.03] border border-white/10 focus:border-yellow-500 rounded-xl px-3 py-2 text-xs uppercase font-mono tracking-wider text-white focus:outline-none placeholder:text-gray-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isRedeeming || isSpinning || !promoCode.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-xl text-[9px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  >
                    {isRedeeming ? '...' : 'Claim'}
                  </button>
                </div>

                {redeemError && (
                  <p className="text-[8px] text-rose-400 uppercase font-bold text-left mt-1.5 pl-1">{redeemError}</p>
                )}
                {redeemSuccess && (
                  <p className="text-[8px] text-emerald-400 uppercase font-bold text-left mt-1.5 pl-1">{redeemSuccess}</p>
                )}
              </form>

              {/* Award Showcase Result Modal */}
              <ResultModal
                isOpen={showRewardClaimed && wonAmount !== null}
                amount={wonAmount || 0}
                onClose={() => {
                  setShowRewardClaimed(false);
                  setWonAmount(null);
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
