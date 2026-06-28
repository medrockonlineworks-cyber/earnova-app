import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle, Coins, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

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

export function LuckyWheelModal({ isOpen, onClose, personalBalance, onReward, t }: LuckyWheelModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasFreeSpin, setHasFreeSpin] = useState(true);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [showRewardClaimed, setShowRewardClaimed] = useState(false);

  // Check if user has already used their daily free spin
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
      setWonAmount(null);
      setShowRewardClaimed(false);
      setSpinError(null);
    }
  }, [isOpen]);

  const handleSpin = async () => {
    if (isSpinning) return;
    setSpinError(null);
    setWonAmount(null);
    setShowRewardClaimed(false);

    const spinCost = hasFreeSpin ? 0 : 20;

    // Validate personal balance if not free spin
    if (!hasFreeSpin && personalBalance < 20) {
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
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full spins
    const targetAngle = (extraSpins * 360) + (360 - (winningIndex * segmentAngle) - (segmentAngle / 2));
    
    setRotation(targetAngle);

    // Wait for the rotation transition to complete (3 seconds)
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
        }
      } catch (err) {
        setSpinError('Failed to claim reward. Please contact customer support.');
      } finally {
        setIsSpinning(false);
      }
    }, 3200);
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
            className="relative w-full max-w-sm bg-gradient-to-b from-[#121829] to-[#0A0E1A] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 p-6"
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
                {/* SVG Wheel segments */}
                <div
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 3.2s cubic-bezier(0.1, 0.8, 0.1, 1)' : 'none',
                  }}
                  className="w-full h-full rounded-full relative"
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-[22.5deg]">
                    {SEGMENTS.map((seg, i) => {
                      const angle = 360 / SEGMENTS.length;
                      const startAngle = i * angle;
                      const endAngle = startAngle + angle;
                      
                      // Convert polar coordinates to Cartesian
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
                          {/* Label positioned radially */}
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
                </div>

                {/* Center Hub Button */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="absolute z-30 w-16 h-16 rounded-full bg-slate-900 border-4 border-amber-400 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer group"
                >
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase leading-none group-hover:scale-105 transition-transform">SPIN</span>
                  <span className="text-[7px] font-black text-slate-400 mt-0.5 uppercase tracking-tighter">
                    {hasFreeSpin ? 'FREE' : '20 ETB'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error or Success Info */}
            <div className="space-y-4 text-center">
              {spinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
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
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Spins Left Today</p>
                  <p className="text-sm font-black text-amber-400 uppercase">
                    {hasFreeSpin ? '1 Free Spin' : '20 ETB/spin'}
                  </p>
                </div>
              </div>

              {/* Award Showcase */}
              <AnimatePresence>
                {showRewardClaimed && wonAmount !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Congratulations!</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {wonAmount > 0 ? `You won an extra +${wonAmount} ETB!` : "Better luck next time!"}
                    </p>
                    {wonAmount > 0 && (
                      <p className="text-xl font-black text-emerald-400">+{wonAmount} ETB</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
