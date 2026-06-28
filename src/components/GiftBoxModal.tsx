import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface GiftBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReward: (amount: number, code: string) => Promise<void>;
  t: any;
}

const VALID_CODES: Record<string, number> = {
  'EARNLINK2026': 200,
  'GIFT100': 100,
  'LUCKY777': 150,
  'WELCOME50': 50,
};

export function GiftBoxModal({ isOpen, onClose, onReward, t }: GiftBoxModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReward, setSuccessReward] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Please enter a gift code');
      return;
    }

    // Check if code was already claimed in localStorage
    const claimedString = localStorage.getItem('earnova_claimed_gift_codes') || '[]';
    const claimedCodes = JSON.parse(claimedString) as string[];

    if (claimedCodes.includes(cleanCode)) {
      setError('This gift code has already been claimed!');
      return;
    }

    if (!(cleanCode in VALID_CODES)) {
      setError('Invalid gift code. Please double-check and try again.');
      return;
    }

    setIsSubmitting(true);
    const amount = VALID_CODES[cleanCode];

    try {
      await onReward(amount, cleanCode);
      
      // Save to claimed codes
      claimedCodes.push(cleanCode);
      localStorage.setItem('earnova_claimed_gift_codes', JSON.stringify(claimedCodes));
      
      setSuccessReward(amount);
      setCode('');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSuccessReward(null);
    setError(null);
    setCode('');
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
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 z-10"
          >
            {/* Header / Background Glow */}
            <div className="h-28 bg-gradient-to-br from-amber-500 to-rose-500 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-black to-black animate-pulse" />
              <div className="absolute top-3 right-3">
                <button
                  onClick={resetAndClose}
                  className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
                  className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md shadow-inner"
                >
                  <Gift size={26} className="stroke-[2.5]" />
                </motion.div>
              </div>
            </div>

            {/* Content body */}
            <div className="p-6">
              {!successReward ? (
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Redeem Gift Box</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Enter your invite promo or gift code below to claim instant reward
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">
                        Gift Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EARNLINK2026"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setError(null);
                        }}
                        disabled={isSubmitting}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-2xl py-3.5 px-4 text-center font-black text-slate-800 tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all uppercase placeholder:text-slate-300"
                        autoFocus
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-bold text-rose-600 text-center uppercase"
                      >
                        {error}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-md shadow-amber-500/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verifying Code...' : 'Redeem Now'}
                    </button>
                  </form>

                  {/* Hint promo codes */}
                  <div className="pt-2 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Available Codes for New Members:</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {Object.keys(VALID_CODES).map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setCode(c);
                            setError(null);
                          }}
                          className="px-2.5 py-1 bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 font-black text-[9px] rounded-lg tracking-wider transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 relative">
                      <CheckCircle2 size={36} className="stroke-[2.5]" />
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 bg-emerald-400 rounded-full -z-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase">Successfully Redeemed!</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Congratulations! Your gift box reward has been credited.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl inline-flex flex-col items-center min-w-[160px] relative overflow-hidden">
                    <div className="absolute top-1 right-1 text-emerald-500/20">
                      <Sparkles size={20} />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Credited Amount</span>
                    <span className="text-2xl font-black text-emerald-700">+{successReward} ETB</span>
                  </div>

                  <button
                    onClick={resetAndClose}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                  >
                    Close & Enjoy
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
