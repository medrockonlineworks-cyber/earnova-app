import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle, Coins, CheckCircle2, Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db, getUserDocId } from '../lib/firebase';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalBalance: number;
  onReward: (amount: number, spinCost: number) => Promise<void>;
  t: any;
}

const SEGMENTS = [
  { value: 10, label: '10 ETB', color: 'bg-indigo-500 text-white' },
  { value: 50, label: '50 ETB', color: 'bg-amber-500 text-white' },
  { value: 5, label: '5 ETB', color: 'bg-rose-500 text-white' },
  { value: 100, label: '100 ETB', color: 'bg-emerald-500 text-white' },
  { value: 20, label: '20 ETB', color: 'bg-violet-500 text-white' },
  { value: 0, label: 'Try Again', color: 'bg-slate-500 text-white' },
  { value: 200, label: '200 ETB', color: 'bg-yellow-500 text-slate-900 font-extrabold' },
  { value: 15, label: '15 ETB', color: 'bg-teal-500 text-white' },
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-amber-500/30 text-white rounded-[32px] overflow-hidden p-8 shadow-[0_0_50px_rgba(245,158,11,0.3)] z-[100] text-center"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col items-center">
              {/* Icon / Sparkles container */}
              <div className="relative w-20 h-20 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                <Sparkles size={40} className="text-amber-400" />
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40 animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <h3 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300">
                {amount > 0 ? 'Splendid Win!' : 'Keep Rolling!'}
              </h3>
              
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2 max-w-[250px]">
                {amount > 0 
                  ? 'Your prize has been instantly credited to your active wallet.' 
                  : 'Better luck in the next spin! Practice makes perfect.'}
              </p>

              {amount > 0 ? (
                <div className="my-8 py-4 px-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Prize Claimed</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-white">{amount}</span>
                    <span className="text-sm font-black text-amber-400">ETB</span>
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
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-[#0A0F1E] font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all cursor-pointer"
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
  const [hasFreeSpin, setHasFreeSpin] = useState(true);
  const [extraSpins, setExtraSpins] = useState(0);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [showRewardClaimed, setShowRewardClaimed] = useState(false);

  // Redemption states
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Sync daily free spin from local storage
  useEffect(() => {
    if (isOpen) {
      const lastSpin = localStorage.getItem('earnova_last_spin_date');
      const today = new Date().toDateString();
      if (lastSpin === today) {
        setHasFreeSpin(false);
      } else {
        setHasFreeSpin(true);
      }
      // Reset won states when opening
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

    const isFree = hasFreeSpin || extraSpins > 0;
    const spinCost = isFree ? 0 : 20;

    // Validate personal balance if not free spin
    if (!isFree && personalBalance < 20) {
      setSpinError('Insufficient balance. Each spin costs 20 ETB. Please recharge.');
      return;
    }

    setIsSpinning(true);

    // Generate a random winning segment (0 to 7)
    const winningIndex = Math.floor(Math.random() * SEGMENTS.length);
    const segmentAngle = 360 / SEGMENTS.length;
    
    // Calculate new rotation angle:
    // Extra full spins (e.g. 5 full spins = 1800 degrees) plus angle of winning segment.
    // To land centered in segment, we target: 360 - (winningIndex * segmentAngle) - (segmentAngle / 2)
    const extraSpinsToPerform = 5 + Math.floor(Math.random() * 3); // 5 to 7 full spins
    const targetAngle = (extraSpinsToPerform * 360) + (360 - (winningIndex * segmentAngle) - (segmentAngle / 2));
    
    setRotation(targetAngle);

    // Wait for the rotation transition to complete (3.2 seconds)
    setTimeout(async () => {
      const winningSegment = SEGMENTS[winningIndex];
      const prizeAmount = winningSegment.value;

      try {
        await onReward(prizeAmount, spinCost);
        setWonAmount(prizeAmount);
        setShowRewardClaimed(true);

        if (hasFreeSpin) {
          localStorage.setItem('earnova_last_spin_date', new Date().toDateString());
          setHasFreeSpin(false);
        } else if (extraSpins > 0) {
          // Decrement extraSpins in Firestore
          const userId = getUserDocId();
          if (userId) {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              extraSpins: increment(-1)
            });
          }
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
        // Try looking up in the coupons collection
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

      // Check targetUser constraint
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

      // Check user claim limits (maxUsesPerUser)
      const maxUsesPerUser = codeData.maxUsesPerUser || 1;
      const claimedUsers = codeData.claimedUsers || [];
      const userClaimsCount = claimedUsers.filter((id: string) => id === userId).length;

      if (userClaimsCount >= maxUsesPerUser) {
        setRedeemError(`You have already claimed this promo code ${userClaimsCount} time(s) (limit is ${maxUsesPerUser}).`);
        setIsRedeeming(false);
        return;
      }

      // Check global usage limits
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

      // Update promo code/coupon claim stats
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

      // Update user's extraSpins and claimedCodes
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#121829] to-[#0A0E1A] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-500 animate-pulse" size={20} />
                <span className="text-sm font-black uppercase tracking-wider text-amber-500">Lucky Spin Wheel</span>
              </div>
              <button
                onClick={handleClose}
                disabled={isSpinning}
                className="p-1 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Wheel Section */}
            <div className="flex flex-col items-center justify-center py-6 relative">
              {/* Spinning Pointer */}
              <div className="absolute top-[20px] z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-500 drop-shadow-[0_4px_6px_rgba(245,158,11,0.5)]" />

              {/* Wheel Outer Border / Circle */}
              <div className="relative w-64 h-64 rounded-full bg-slate-900 border-[8px] border-amber-500/80 p-1 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-center overflow-hidden">
                <motion.div
                  animate={{ rotate: rotation }}
                  transition={
                    isSpinning
                      ? { duration: 3.2, ease: [0.1, 0.8, 0.1, 1] }
                      : { duration: 0 }
                  }
                  className="w-full h-full rounded-full relative"
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-[22.5deg]">
                    {SEGMENTS.map((seg, i) => {
                      const angle = 360 / SEGMENTS.length;
                      const startAngle = i * angle;
                      const endAngle = startAngle + angle;
                      
                      const rad = Math.PI / 180;
                      const x1 = 50 + 50 * Math.cos(startAngle * rad);
                      const y1 = 50 + 50 * Math.sin(startAngle * rad);
                      const x2 = 50 + 50 * Math.cos(endAngle * rad);
                      const y2 = 50 + 50 * Math.sin(endAngle * rad);

                      const isGold = seg.value === 200;
                      const fill = isGold ? '#f59e0b' : (i % 2 === 0 ? '#312e81' : '#4f46e5');

                      return (
                        <g key={`wheel-slice-${i}`}>
                          <path
                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                            fill={fill}
                            stroke="#1e293b"
                            strokeWidth="0.5"
                          />
                          <g transform={`rotate(${startAngle + angle/2} 50 50)`}>
                            <text
                              x="82"
                              y="52"
                              fill={isGold ? '#0f172a' : '#ffffff'}
                              fontSize="4"
                              fontWeight="900"
                              textAnchor="end"
                              transform="rotate(0 82 52)"
                              className="font-black uppercase tracking-tight"
                            >
                              {seg.label}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                </motion.div>

                {/* Center Hub Button */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="absolute z-30 w-16 h-16 rounded-full bg-slate-900 border-4 border-amber-400 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer group"
                >
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase leading-none group-hover:scale-105 transition-transform">SPIN</span>
                  <span className="text-[7px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">
                    {hasFreeSpin ? 'FREE' : extraSpins > 0 ? 'FREE' : '20 ETB'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error or Success Info */}
            <div className="space-y-4 text-center">
              {spinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-bounce">
                  <AlertCircle size={14} />
                  <span>{spinError}</span>
                </div>
              )}

              {/* Status Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                  <p className="text-sm font-black text-white">{personalBalance.toLocaleString()} ETB</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available Spins</p>
                  <p className="text-sm font-black text-amber-400 uppercase">
                    {hasFreeSpin ? 'Daily Free Spin' : extraSpins > 0 ? `${extraSpins} Extra Spin(s)` : '20 ETB / spin'}
                  </p>
                </div>
              </div>

              {/* Promo Code Redemption Form */}
              <form onSubmit={handleRedeemCode} className="border-t border-white/5 pt-4 mt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left mb-1.5 pl-1 flex items-center gap-1">
                  <Gift size={10} className="text-amber-500" /> Have a Wheel Promo Code?
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
                    className="flex-1 bg-white/[0.03] border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs uppercase font-mono tracking-wider text-white focus:outline-none placeholder:text-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={isRedeeming || isSpinning || !promoCode.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-[#0A0F1E] font-black rounded-xl text-[9px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
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
