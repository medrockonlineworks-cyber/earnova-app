import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CreditCard, HelpCircle, CheckCircle2, User, Phone, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, getUserDocId } from '../lib/firebase';

interface ShareBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalBalance: number;
  currentUserPhone: string;
  onShareSuccess: (amount: number, fee: number) => void;
  t: any;
}

export function ShareBalanceModal({ isOpen, onClose, personalBalance, currentUserPhone, onShareSuccess, t }: ShareBalanceModalProps) {
  const [receiverPhone, setReceiverPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; fee: number; receiverName: string; receiverPhone: string } | null>(null);

  // Clear inputs on open/close
  useEffect(() => {
    if (isOpen) {
      setReceiverPhone('');
      setAmountStr('');
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  const amount = Number(amountStr) || 0;
  const fee = amount * 0.05;
  const totalDeducted = amount + fee;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = receiverPhone.trim();
    if (!cleanPhone) {
      setError('Please enter a receiver phone number.');
      return;
    }

    if (amount <= 0) {
      setError('Please enter a transfer amount greater than 0.');
      return;
    }

    if (totalDeducted > personalBalance) {
      setError(`Insufficient balance. You need ${totalDeducted.toFixed(2)} ETB (including 5% service fee) but you have ${personalBalance.toFixed(2)} ETB.`);
      return;
    }

    // Normalize phone numbers to check identity
    const normalizedSenderPhone = currentUserPhone.trim().replace(/\s+/g, '').replace(/^\+251/, '0');
    const normalizedReceiverPhone = cleanPhone.replace(/\s+/g, '').replace(/^\+251/, '0');

    if (normalizedSenderPhone === normalizedReceiverPhone) {
      setError('You cannot share balance with your own phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const senderDocId = getUserDocId();
      if (!senderDocId) {
        throw new Error('You must be logged in to perform this action.');
      }

      // 1. Query the receiver's user document in Firestore
      const usersRef = collection(db, 'users');
      // We look up both cleanPhone and a normalized variant (with '0' instead of '+251' or vice versa)
      const possibleReceiverPhones = [
        cleanPhone,
        normalizedReceiverPhone,
        normalizedReceiverPhone.replace(/^0/, '+251'),
        normalizedReceiverPhone.replace(/^0/, '251')
      ];

      const q = query(usersRef, where('phoneNumber', 'in', possibleReceiverPhones));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setError('Receiver not found. Please double check the phone number and make sure they are registered on EarnLink.');
        setIsSubmitting(false);
        return;
      }

      const receiverDoc = querySnap.docs[0];
      const receiverDocId = receiverDoc.id;
      const receiverData = receiverDoc.data();
      const receiverName = receiverData.fullName || 'EarnLink Member';
      const actualReceiverPhone = receiverData.phoneNumber || cleanPhone;

      // 2. Perform database updates
      const senderRef = doc(db, 'users', senderDocId);
      const receiverRef = doc(db, 'users', receiverDocId);

      // Deduct from sender's personal balance
      await updateDoc(senderRef, {
        personal: increment(-totalDeducted)
      });

      // Add to receiver's personal balance
      await updateDoc(receiverRef, {
        personal: increment(amount)
      });

      // 3. Add to bonuses collection for Sender (negative/outflow)
      await addDoc(collection(db, 'bonuses'), {
        userId: senderDocId,
        amount: -totalDeducted,
        type: 'share_sent',
        label: `Shared Balance with ${actualReceiverPhone} (5% fee)`,
        timestamp: serverTimestamp()
      });

      // 4. Add to bonuses collection for Receiver (positive/inflow)
      await addDoc(collection(db, 'bonuses'), {
        userId: receiverDocId,
        amount: amount,
        type: 'share_received',
        label: `Received Balance from ${currentUserPhone}`,
        timestamp: serverTimestamp()
      });

      // 5. Update local state
      onShareSuccess(amount, fee);
      setSuccessData({
        amount,
        fee,
        receiverName,
        receiverPhone: actualReceiverPhone
      });
    } catch (err: any) {
      console.error('Error sharing balance:', err);
      setError(err.message || 'An error occurred while sharing balance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/20 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/5">
                  <Send size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Share Balance</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Secure peer-to-peer transfer</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content wrapper with scroll if needed */}
            <div className="overflow-y-auto p-5 space-y-4">
              {successData ? (
                /* Success Screen */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 py-6"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">Transfer Completed</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-1">Successfully Shared</p>
                  </div>

                  <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-3.5 text-left">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Recipient Name</span>
                      <span className="text-xs font-black text-gray-800">{successData.receiverName}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Recipient Phone</span>
                      <span className="text-xs font-mono font-bold text-gray-800">{successData.receiverPhone}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sent Amount</span>
                      <span className="text-xs font-black text-blue-600">ETB {successData.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Service Fee (5%)</span>
                      <span className="text-xs font-bold text-gray-500">ETB {successData.fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Debited</span>
                      <span className="text-sm font-black text-rose-500">ETB {(successData.amount + successData.fee).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/10"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                /* Input Form */
                <form onSubmit={handleTransfer} className="space-y-4">
                  {/* Personal Balance Display */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-xl shadow-blue-500/15 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                    <p className="text-[8.5px] font-bold text-blue-100/80 uppercase tracking-widest">Your Available Balance</p>
                    <p className="text-2xl font-black italic tracking-tighter mt-1">ETB {personalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-150 rounded-2xl text-[10px] font-bold text-rose-600 uppercase tracking-tight"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Recipient Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receiver Phone Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="e.g. 0911223344"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-black text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                        disabled={isSubmitting}
                      />
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Amount to Share */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Transfer</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="0.00"
                        min="1"
                        step="any"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-12 py-3.5 text-xs font-black text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
                        disabled={isSubmitting}
                      />
                      <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-[10px]">ETB</span>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  {amount > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5"
                    >
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400 uppercase">Transfer Amount</span>
                        <span className="text-gray-700">ETB {amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400 uppercase flex items-center gap-1">
                          Service Fee (5%)
                          <HelpCircle size={10} className="stroke-[2.5]" title="A standard 5% service fee is charged for all transfers" />
                        </span>
                        <span className="text-gray-500">ETB {fee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-200/50 pt-2 flex justify-between text-xs font-black">
                        <span className="text-gray-900 uppercase">Total Deducted</span>
                        <span className={cn(totalDeducted > personalBalance ? "text-rose-500" : "text-indigo-600")}>
                          ETB {totalDeducted.toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || amount <= 0 || !receiverPhone}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Verifying & Transferring...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="stroke-[2.5]" />
                        Confirm & Share Balance
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
