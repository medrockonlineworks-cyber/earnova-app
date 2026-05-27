import { useState, ChangeEvent, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { motion } from 'motion/react';
import { X, ArrowUpCircle, Wallet, Check, Copy, Loader2 } from 'lucide-react';
import { JOBS } from '../constants';
import { cn } from '../lib/utils';
import { db, auth, getUserDocId } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { compressImage } from '../lib/imageCompressor';

interface RechargeModalProps {
  onClose: () => void;
  onRecharge: (amount: number) => void;
  initialAmount?: string;
  t: any;
}

export function RechargeModal({ onClose, onRecharge, initialAmount, t }: RechargeModalProps) {
  const [amount, setAmount] = useState(initialAmount || '');
  const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'CBE'>('TELEBIRR');
  const [step, setStep] = useState<'SELECT' | 'PAY' | 'SUCCESS'>('SELECT');
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic payment settings loaded from Firestore
  const [telebirrAccount, setTelebirrAccount] = useState('0926193920');
  const [telebirrHolder, setTelebirrHolder] = useState('Leykun');
  const [cbeAccount, setCbeAccount] = useState('1000419524747');
  const [cbeHolder, setCbeHolder] = useState('Leykun jemaneh');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'payment_info'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.telebirrAccount) setTelebirrAccount(data.telebirrAccount);
        if (data.telebirrHolder) setTelebirrHolder(data.telebirrHolder);
        if (data.cbeAccount) setCbeAccount(data.cbeAccount);
        if (data.cbeHolder) setCbeHolder(data.cbeHolder);
        sessionStorage.setItem('earnova_cached_payment_info', JSON.stringify(data));
      }
    }, (err) => {
      console.warn("Could not onSnapshot system_config/payment_info (used cache fallback):", err);
      const cachedInfo = sessionStorage.getItem('earnova_cached_payment_info');
      if (cachedInfo) {
        try {
          const data = JSON.parse(cachedInfo);
          if (data.telebirrAccount) setTelebirrAccount(data.telebirrAccount);
          if (data.telebirrHolder) setTelebirrHolder(data.telebirrHolder);
          if (data.cbeAccount) setCbeAccount(data.cbeAccount);
          if (data.cbeHolder) setCbeHolder(data.cbeHolder);
        } catch (e) {}
      }
    });

    return () => unsub();
  }, []);

  const handleNext = () => {
    const rechargeAmount = parseFloat(amount);
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert('Please enter a valid amount');
      return;
    }
    WebApp.HapticFeedback.impactOccurred('medium');
    setStep('PAY');
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 1000, 1000, 0.75);
        setScreenshot(compressedBase64);
      } catch (err) {
        console.error("Error compressing recipe screenshot, falling back:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshot(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleConfirm = async () => {
    if (!screenshot) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert('Please upload a payment screenshot');
      return;
    }
    if (paymentMethod === 'CBE' && !reference) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert('FT code is required for CBE transfers');
      return;
    }
    if (paymentMethod === 'TELEBIRR' && !reference) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert('Transaction number is required for Telebirr transfers');
      return;
    }

    if (getUserDocId() === 'guest') {
      alert('You must be signed in to submit a recharge');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'recharges'), {
        amount: parseFloat(amount),
        status: 'pending',
        timestamp: serverTimestamp(),
        userId: getUserDocId(),
        transactionId: reference,
        method: paymentMethod,
        // In a real app, you'd upload the image to storage first
        proofImageUrl: screenshot
      });

      WebApp.HapticFeedback.notificationOccurred('success');
      // We don't call onRecharge(parseFloat(amount)) anymore 
      // because it shouldn't update balance yet.
      setStep('SUCCESS');
    } catch (error) {
      console.error("Recharge submission error:", error);
      alert('Failed to submit recharge. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const methods = [
    { id: 'TELEBIRR', name: 'Telebirr', color: 'bg-emerald-500', icon: 'TB', account: telebirrAccount, holder: telebirrHolder },
    { id: 'CBE', name: 'CBE Birr', color: 'bg-purple-600', icon: 'CBE', account: cbeAccount, holder: cbeHolder },
  ];

  const currentMethod = methods.find(m => m.id === paymentMethod)!;

  useEffect(() => {
    if (step === 'SELECT' && amount) {
      WebApp.MainButton.setText(t('recharge_proceed'));
      WebApp.MainButton.show();
      const handler = () => handleNext();
      WebApp.MainButton.onClick(handler);
      return () => {
        WebApp.MainButton.hide();
        WebApp.MainButton.offClick(handler);
      };
    } else if (step === 'PAY') {
      WebApp.MainButton.setText(t('recharge_confirm'));
      WebApp.MainButton.show();
      const handler = () => handleConfirm();
      WebApp.MainButton.onClick(handler);
      return () => {
        WebApp.MainButton.hide();
        WebApp.MainButton.offClick(handler);
      };
    } else if (step === 'SUCCESS') {
      WebApp.MainButton.setText(t('nav_home'));
      WebApp.MainButton.show();
      const handler = () => onClose();
      WebApp.MainButton.onClick(handler);
      return () => {
        WebApp.MainButton.hide();
        WebApp.MainButton.offClick(handler);
      };
    } else {
      WebApp.MainButton.hide();
    }
  }, [step, amount, t, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <ArrowUpCircle size={24} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight italic">{t('recharge_header')}</h2>
          </div>
          <p className="text-blue-100 text-xs font-medium opacity-80 uppercase tracking-widest leading-none">
            {t('recharge_subtitle')}
          </p>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {step === 'SELECT' ? (
            <div key="recharge-step-select" className="space-y-6">
              {/* Instructions Section */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" />
                  {t('recharge_instruction_title')}
                </h3>
                <ul className="space-y-1">
                  <li className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{t('recharge_instruction_1')}</li>
                  <li className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{t('recharge_instruction_2')}</li>
                  <li className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{t('recharge_instruction_3')}</li>
                  <li className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{t('recharge_instruction_4')}</li>
                  <li className="text-[9px] font-bold text-slate-600 uppercase leading-tight">{t('recharge_instruction_5')}</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="text-center pb-2">
                  <p className="text-sm font-black text-blue-600 uppercase tracking-tight italic">
                    {t('recharge_choose_amt')}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('recharge_select_amt')} (ETB)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {JOBS.filter(j => j.deposit > 0).map((job) => (
                      <button 
                        key={`recharge-job-amt-grid-${job.deposit}`}
                        onClick={() => setAmount(job.deposit.toString())}
                        className={cn(
                          "py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all border-2",
                          amount === job.deposit.toString() 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                            : "bg-white text-gray-500 border-gray-100 hover:border-blue-200"
                        )}
                      >
                        {job.deposit >= 1000000 ? `${job.deposit/1000000}M` : job.deposit >= 1000 ? `${job.deposit/1000}K` : job.deposit}
                      </button>
                    ))}
                  </div>
                  <div className="relative mt-2">
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t('recharge_custom_amt')}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-lg font-black italic text-gray-900 focus:border-blue-600 focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 italic uppercase text-xs">ETB</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('recharge_pmmt_method')}</label>
                <div className="space-y-2">
                  {methods.map((method) => (
                    <button 
                      key={`recharge-method-sel-${method.id}`}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={cn(
                        "w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all group",
                        paymentMethod === method.id 
                          ? "border-blue-600 bg-blue-50/50" 
                          : "border-gray-100 bg-white hover:border-blue-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px]", method.color)}>
                          {method.icon}
                        </div>
                        <span className="font-black text-gray-900 uppercase text-xs tracking-tight">{method.name}</span>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        paymentMethod === method.id ? "bg-blue-600 border-blue-600" : "border-gray-200"
                      )}>
                        {paymentMethod === method.id && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-[0.98] transition-all"
              >
                {t('recharge_proceed')}
              </button>
            </div>
          ) : step === 'PAY' ? (
            <div key="recharge-step-pay" className="space-y-6 flex-1 overflow-y-auto">
              <div className="bg-blue-600 border border-blue-400 rounded-2xl p-5 text-center space-y-2 shadow-lg">
                <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em]">{t('recharge_transfer_exactly')}</p>
                <p className="text-3xl font-black italic text-white leading-none">ETB {amount}.00</p>
                <div className="pt-2">
                  <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/30">
                    {t('recharge_manual_verify')}
                  </span>
                </div>
              </div>

              {/* Step Info */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border-2 border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                      Step 1: Payment Details
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Admin Wallet ({currentMethod.name})</p>
                      <p className="text-sm font-black text-gray-900 mt-1">{currentMethod.account}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentMethod.account);
                        alert('Copied to clipboard');
                      }}
                      className="p-2 bg-white rounded-lg text-blue-600 shadow-sm active:scale-90 transition-transform border border-slate-100"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('withdraw_acc_holder')}</p>
                    <p className="text-sm font-black text-gray-900 mt-1 uppercase italic">{currentMethod.holder}</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                      Step 2: Upload & Submit
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('recharge_step1')}</label>
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 bg-gray-50/50 hover:bg-gray-100 transition-colors">
                        {screenshot ? (
                          <div className="relative w-full">
                            <img src={screenshot} alt="Payment Proof" className="w-full h-32 object-contain rounded-lg" />
                            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Change Photo</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                              <ArrowUpCircle size={24} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-900 uppercase">{t('recharge_choose_gallery')}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase">Max size: 5MB</p>
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      {paymentMethod === 'CBE' ? 'FT Code (Mandatory)' : paymentMethod === 'TELEBIRR' ? 'Transaction Number (Mandatory)' : 'Reference Number'}
                    </label>
                    <input 
                      type="text" 
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={paymentMethod === 'CBE' ? "Enter FT Code" : "Enter Reference Number"}
                      className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-xs font-black text-gray-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setStep('SELECT')}
                  className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-black text-sm uppercase active:scale-[0.98] transition-all"
                >
                  {t('recharge_back')}
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Submitting...
                    </>
                  ) : (
                    t('recharge_confirm')
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div key="recharge-step-success" className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Check size={40} className="stroke-[3]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase">{t('recharge_submitted_title')}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-8">
                  Your recharge request of ETB {amount} has been received and is under review.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-[0.98] transition-all"
              >
                {t('nav_home')}
              </button>
            </div>
          )}
          
          <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            {t('recharge_footer_hint')}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
