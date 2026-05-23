import { useState, FormEvent, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { motion } from 'motion/react';
import { X, ArrowDownCircle, Wallet, CreditCard, Landmark, Check, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, getUserDocId } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface WithdrawModalProps {
  incomeBalance: number;
  personalBalance: number;
  onClose: () => void;
  onWithdraw: (amount: number, wallet: 'INCOME' | 'PERSONAL', details: any, keepOpen?: boolean) => void;
  t: any;
  currentLang?: 'EN' | 'AM' | 'OR' | 'SO';
}

export function WithdrawModal({ incomeBalance, personalBalance, onClose, onWithdraw, t, currentLang = 'EN' }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState<'INCOME' | 'PERSONAL'>('INCOME');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paymentPassword, setPaymentPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showPaymentPassword, setShowPaymentPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  
  // Sequential wizard steps: REGISTER -> CHOOSE_WALLET -> CHOOSE_ACCOUNT -> INPUT_PASSWORD -> SUCCESS
  const [step, setStep] = useState<'REGISTER' | 'CHOOSE_WALLET' | 'CHOOSE_ACCOUNT' | 'INPUT_PASSWORD' | 'SUCCESS'>('REGISTER');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing registered bank details
  useEffect(() => {
    // 1. Try immediate load from localStorage so there is zero delay/flashing
    const localDetails = localStorage.getItem('earnova_bank_details');
    if (localDetails) {
      try {
        const parsed = JSON.parse(localDetails);
        if (parsed.bankName && parsed.accountNumber) {
          setBankName(parsed.bankName);
          setAccountName(parsed.accountName || '');
          setAccountNumber(parsed.accountNumber);
          setPaymentPassword(parsed.paymentPassword || '');
          setStep('CHOOSE_WALLET');
        }
      } catch (e) {
        console.error("Error parsing local details:", e);
      }
    }

    // 2. Load and sync from Firestore database
    if (getUserDocId() !== 'guest') {
      const userRef = doc(db, 'users', getUserDocId());
      getDoc(userRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.bankDetails) {
            setBankName(data.bankDetails.bankName || '');
            setAccountName(data.bankDetails.accountName || '');
            setAccountNumber(data.bankDetails.accountNumber || '');
            setPaymentPassword(data.bankDetails.paymentPassword || '');
            
            // Sync/update localStorage
            localStorage.setItem('earnova_bank_details', JSON.stringify({
              bankName: data.bankDetails.bankName || '',
              accountName: data.bankDetails.accountName || '',
              accountNumber: data.bankDetails.accountNumber || '',
              paymentPassword: data.bankDetails.paymentPassword || ''
            }));

            setStep('CHOOSE_WALLET');
          }
        }
      });
    }
  }, []);

  const currentBalance = wallet === 'INCOME' ? incomeBalance : personalBalance;
  const fee = wallet === 'INCOME' ? 0.1 : 0;
  const withdrawAmount = parseFloat(amount) || 0;
  const feeAmount = withdrawAmount * fee;
  const finalAmount = withdrawAmount - feeAmount;

  // Handle step 1: registering details
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (paymentPassword.length !== 6) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'የክፍያ ይለፍ ቃል 6 አሃዝ መሆን አለበት' : 'Payment password must be 6 digits');
      return;
    }
    
    setIsSaving(true);
    WebApp.HapticFeedback.impactOccurred('medium');

    // Save locally immediately
    localStorage.setItem('earnova_bank_details', JSON.stringify({
      bankName,
      accountName,
      accountNumber,
      paymentPassword
    }));
    
    // Persist bank details inside firestore
    if (getUserDocId() !== 'guest') {
      try {
        await setDoc(doc(db, 'users', getUserDocId()), {
          bankDetails: {
            bankName,
            accountName,
            accountNumber,
            paymentPassword
          }
        }, { merge: true });
      } catch (err) {
        console.error("Firestore save error:", err);
      }
    }
    
    setIsSaving(false);
    // Proceed to Step 2: Choose Wallet
    setStep('CHOOSE_WALLET');
  };

  // Handle final submission in the payment verification stage
  const handleFinalConfirmSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'እባክዎ መጀመሪያ መጠን ይምረጡ' : 'Please select a withdrawal amount first');
      return;
    }
    if (withdrawAmount < 200) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'ዝቅተኛው የገንዘብ ማውጫ መጠን 200 ETB ነው' : 'Minimum withdrawal is 200 ETB');
      return;
    }
    if (withdrawAmount > currentBalance) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'ይቅርታ፣ በቂ ቀሪ ሂሳብ የለዎትም' : 'Insufficient balance');
      return;
    }
    if (verifyPassword.length !== 6) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'እባክዎ ባለ 6-አሃዝ የክፍያ የይለፍ ቃልዎን ያስገቡ' : 'Please enter your 6-digit payment password');
      return;
    }
    if (verifyPassword !== paymentPassword) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(currentLang === 'AM' ? 'የተሳሳተ የይለፍ ቃል ነው፣ እባክዎ እንደገና ይሞክሩ' : 'Incorrect payment password');
      setVerifyPassword('');
      return;
    }

    // Success! Trigger withdrawal action of App.tsx keeping the modal open
    WebApp.HapticFeedback.notificationOccurred('success');
    onWithdraw(withdrawAmount, wallet, { bankName, accountName, accountNumber }, true);
    setStep('SUCCESS');
  };

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
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Colorful Gradient Header */}
        <div className="bg-gradient-to-r from-rose-600 to-pink-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <ArrowDownCircle size={24} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight italic">
              {t('withdraw_header')}
            </h2>
          </div>
          <p className="text-rose-100 text-xs font-medium opacity-90 uppercase tracking-widest">
            {step === 'REGISTER' ? t('withdraw_reg_title') : 
             step === 'CHOOSE_WALLET' ? (currentLang === 'AM' ? 'የመነሻ ቦርሳዎን ይምረጡ' : 'Choose Wallet Type') :
             step === 'CHOOSE_ACCOUNT' ? (currentLang === 'AM' ? 'የተመዘገበ አካውንት ይምረጡ' : 'Confirm Your Account') :
             step === 'INPUT_PASSWORD' ? (currentLang === 'AM' ? 'መጠን እና የይለፍ ቃል ያስገቡ' : 'Verify and Withdraw') :
             t('withdraw_final_desc')}
          </p>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'REGISTER' ? (
            <form key="withdraw-step-reg" onSubmit={handleRegister} className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                  <Landmark size={18} />
                </div>
                <p className="text-[10px] font-black text-blue-900 uppercase leading-normal">
                  {t('withdraw_secure_msg')}
                </p>
              </div>

              <div className="space-y-4">
                {/* Bank Name Dropdown selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('withdraw_bank_name')}</label>
                  <div className="relative">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select 
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black text-gray-900 focus:border-rose-600 focus:outline-none transition-colors appearance-none"
                      required
                    >
                      <option value="">{t('withdraw_bank_name')}</option>
                      <option value="CBE">CBE (Commercial Bank of Ethiopia)</option>
                      <option value="Telebirr">Telebirr (ቴሌብር)</option>
                      <option value="Awash">Awash Bank (አዋሽ ባንክ)</option>
                      <option value="Dashen">Dashen Bank (ዳሽን ባንክ)</option>
                    </select>
                  </div>
                </div>

                {/* Account Holder Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('withdraw_acc_holder')}</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder={t('withdraw_acc_holder')}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black text-gray-900 focus:border-rose-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Account Number Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('withdraw_acc_number')}</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={t('withdraw_acc_number')}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black text-gray-900 focus:border-rose-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Secure Security Payment Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('withdraw_payment_pwd')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type={showPaymentPassword ? 'text' : 'password'}
                      maxLength={6}
                      value={paymentPassword}
                      onChange={(e) => setPaymentPassword(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit payment password"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-black text-gray-900 focus:border-rose-600 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentPassword(!showPaymentPassword);
                        WebApp.HapticFeedback.impactOccurred('light');
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPaymentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm uppercase active:scale-[0.98] transition-all"
                >
                  Exit
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : (currentLang === 'AM' ? 'አሁን ይመዝግቡ' : 'JOIN NOW')}
                </button>
              </div>
            </form>
          ) : step === 'CHOOSE_WALLET' ? (
            <div key="withdraw-step-wallet" className="p-6 space-y-6">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0">
                  <Wallet size={18} />
                </div>
                <p className="text-xs font-bold text-rose-900 leading-tight">
                  {currentLang === 'AM' ? 'እባክዎን ማውጣት የሚፈልጉበትን የቦርሳ አይነት ይምረጡ' : 'Step 1: Select the source wallet type to withdraw from.'}
                </p>
              </div>

              {/* Wallet selectors */}
              <div className="grid grid-cols-1 gap-4">
                {/* Income Wallet card */}
                <button
                  type="button"
                  onClick={() => {
                    setWallet('INCOME');
                    WebApp.HapticFeedback.impactOccurred('light');
                    setStep('CHOOSE_ACCOUNT');
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 text-left hover:border-rose-500 active:scale-[0.99] cursor-pointer",
                    wallet === 'INCOME' ? "border-rose-600 bg-rose-50/50 shadow-md" : "border-gray-100 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-400">{t('nav_income')} Wallet</p>
                      <p className="text-base font-black text-gray-900 mt-0.5">ETB {incomeBalance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md tracking-tight">10% Fee</span>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {wallet === 'INCOME' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                    </div>
                  </div>
                </button>

                {/* Personal Wallet card */}
                <button
                  type="button"
                  onClick={() => {
                    setWallet('PERSONAL');
                    WebApp.HapticFeedback.impactOccurred('light');
                    setStep('CHOOSE_ACCOUNT');
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 text-left hover:border-rose-500 active:scale-[0.99] cursor-pointer",
                    wallet === 'PERSONAL' ? "border-rose-600 bg-rose-50/50 shadow-md" : "border-gray-100 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-400">{t('balance_personal')} Wallet</p>
                      <p className="text-base font-black text-gray-900 mt-0.5">ETB {personalBalance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md tracking-tight">0% Fee (Free!)</span>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {wallet === 'PERSONAL' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm uppercase active:scale-[0.98] transition-all"
                >
                  Exit
                </button>
              </div>
            </div>
          ) : step === 'CHOOSE_ACCOUNT' ? (
            <div key="withdraw-step-account" className="p-6 space-y-6">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0">
                  <CreditCard size={18} />
                </div>
                <p className="text-xs font-bold text-rose-900 leading-tight">
                  {currentLang === 'AM' ? 'እባክዎን ማውጫ አካውንትዎን መርጠው ያረጋግጡ' : 'Step 2: Confirm and select your registered bank details.'}
                </p>
              </div>

              {/* Credit Card layout button */}
              <button
                type="button"
                onClick={() => {
                  WebApp.HapticFeedback.impactOccurred('medium');
                  setStep('INPUT_PASSWORD');
                }}
                className="w-full text-left bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 rounded-3xl relative overflow-hidden shadow-2xl active:scale-[0.98] transition-all group hover:shadow-indigo-100/50 cursor-pointer border border-white/10"
              >
                {/* Visual gradients inside registered card */}
                <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-pink-500/15 rounded-full blur-2xl group-hover:bg-pink-500/25 transition-all" />
                <div className="absolute -left-10 -top-10 w-44 h-44 bg-indigo-500/15 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all" />

                <div className="relative flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-indigo-300/40 uppercase">E-BANK ACCOUNT</span>
                    <h4 className="text-lg font-black text-white italic tracking-tight mt-1">
                      {bankName === 'CBE' ? 'Commercial Bank of Ethiopia' : bankName || 'Associated Bank'}
                    </h4>
                  </div>
                  <div className="p-2.5 bg-white/10 rounded-xl text-indigo-300 shrink-0">
                    <Landmark size={22} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* EMV Card Chip Decoration */}
                <div className="w-10 h-7 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-md relative overflow-hidden mb-6 opacity-80 shadow-md">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/10 -translate-y-1/2" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/10 -translate-x-1/2" />
                  <div className="absolute inset-1.5 border border-black/10 rounded-sm" />
                </div>

                <div className="relative space-y-4">
                  <div className="text-xl font-mono text-indigo-100 font-bold tracking-widest">
                    {accountNumber ? accountNumber.replace(/(.{4})/g, '$1 ') : '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[8px] font-bold text-indigo-200/40 uppercase tracking-wider block">Account Holder</span>
                      <span className="text-xs font-black text-white uppercase tracking-tight">{accountName || 'No Name'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-tight shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      TAP TO CHOOSE
                    </div>
                  </div>
                </div>
              </button>

              <div className="flex flex-col gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setStep('CHOOSE_WALLET')}
                  className="text-xs font-black text-rose-600 uppercase underline text-center italic cursor-pointer"
                >
                  {currentLang === 'AM' ? '← ወደ ኋላ ይመለሱ ቦርሳ ይምረጡ' : '← Go back and choose wallet'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('REGISTER')}
                  className="text-xs font-black text-slate-500 uppercase underline text-center italic cursor-pointer"
                >
                  ✏️ {currentLang === 'AM' ? 'የተመዘገበ አካውንት ዝርዝር ለመቀየር እዚህ ይጫኑ' : 'Change details / Register account'}
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm uppercase active:scale-[0.98] transition-all"
                >
                  Exit
                </button>
                <button 
                  type="button"
                  onClick={() => setStep('INPUT_PASSWORD')}
                  className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-[0.98] transition-all"
                >
                  {currentLang === 'AM' ? 'አረጋግጥ እና ቀጥል' : 'Confirm & Continue'}
                </button>
              </div>
            </div>
          ) : step === 'INPUT_PASSWORD' ? (
            <form key="withdraw-step-password" onSubmit={handleFinalConfirmSubmit} className="p-6 space-y-6">
              {/* Wallet Info Display */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  {currentLang === 'AM' ? 'የተመረጠ የመነሻ ቦርሳ' : 'Selected Wallet'}
                </label>
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-150 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-rose-600 shrink-0" size={18} />
                    <span className="text-sm font-black text-gray-950 italic">{wallet === 'INCOME' ? t('nav_income') : t('balance_personal')} Wallet</span>
                  </div>
                  <span className="text-lg font-black text-rose-600 italic">ETB {currentBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount - Selective list of buttons only */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {currentLang === 'AM' ? 'የገንዘብ ማውጫ መጠን ይምረጡ' : 'Select Withdrawal Amount'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[200, 400, 800, 1500, 4500, 6000, 10000, 50000, 100000, 300000, 500000, 1000000].map((val) => {
                      const isSelected = amount === val.toString();
                      return (
                        <button
                          key={`withdraw-amt-${val}`}
                          type="button"
                          onClick={() => {
                            setAmount(val.toString());
                            WebApp.HapticFeedback.selectionChanged();
                          }}
                          className={cn(
                            "py-3.5 px-1 rounded-2xl font-black text-[11px] uppercase tracking-tight italic transition-all border duration-200 active:scale-95 cursor-pointer text-center",
                            isSelected
                              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-100"
                              : "bg-gray-50 text-gray-800 hover:bg-gray-100/80 hover:border-gray-300 border-gray-200"
                          )}
                        >
                          {val.toLocaleString()} ETB
                        </button>
                      );
                    })}
                  </div>
                </div>

                {withdrawAmount > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100 shadow-inner animate-fade-in">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                      <span>Selected Amount</span>
                      <span className="font-black text-gray-900">ETB {withdrawAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                      <span className="text-gray-400">Merchant Fee ({wallet === 'INCOME' ? '10%' : '0%'})</span>
                      <span className="text-rose-600">- ETB {feeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-tight pt-1.5 border-t border-gray-200">
                      <span className="text-gray-900">Net Amount arriving</span>
                      <span className="text-emerald-600">ETB {finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security PIN code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  {currentLang === 'AM' ? 'ባለ 6 አሃዝ የክፍያ የይለፍ ቃል ያስገቡ' : 'Security Payment Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type={showVerifyPassword ? 'text' : 'password'}
                    maxLength={6}
                    value={verifyPassword}
                    onChange={(e) => setVerifyPassword(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-12 py-3.5 text-center text-xl font-black tracking-[0.2em] text-gray-900 focus:border-rose-600 focus:outline-none transition-colors shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerifyPassword(!showVerifyPassword);
                      WebApp.HapticFeedback.impactOccurred('light');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showVerifyPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[9px] text-center text-gray-400 font-bold uppercase italic mt-1.5">
                  {currentLang === 'AM' ? 'ክፍያውን ለማጠናቀቅ ቀደም ብለው የመዘገቡትን 6 አሃዝ የይለፍ ቃል ያስገቡ' : 'Verify with the 6-digit payment password you created'}
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setStep('CHOOSE_ACCOUNT')}
                  className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm uppercase active:scale-[0.98] transition-all"
                >
                  {t('recharge_back')}
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-rose-600 to-pink-700 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl shadow-rose-100 active:scale-[0.98] transition-all"
                >
                  {currentLang === 'AM' ? 'ክፍያውን አጠናቅቅ' : 'Verify & Withdraw'}
                </button>
              </div>
            </form>
          ) : (
            <div key="withdraw-step-success" className="py-12 flex flex-col items-center justify-center text-center space-y-6 px-6">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                <Check size={40} className="stroke-[3]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase">
                  {currentLang === 'AM' ? 'በተሳካ ሁኔታ ተጠናቋል' : 'Request Successful'}
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-8 leading-relaxed">
                  {currentLang === 'AM' 
                    ? `የ ${withdrawAmount.toFixed(2)} ETB ማውጫ ጥያቄ ከ ${wallet} ቦርሳ ወደ ${bankName} አካውንትዎ በተሳካ ሁኔታ ተጀምሯል።`
                    : `Withdrawal of ETB ${withdrawAmount.toFixed(2)} from ${wallet} wallet to your ${bankName} account has been initiated.`
                  }
                </p>
                {wallet === 'INCOME' && (
                  <p className="text-[10px] font-black text-emerald-600 uppercase">
                    Net Amount after 10% fee: ETB {finalAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-[0.98] transition-all"
              >
                {t('nav_profile')}
              </button>
            </div>
          )}

          {/* Guidelines / Tips Footer */}
          <div className="mx-6 mb-6 p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 space-y-3">
            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
              {t('withdraw_instruction_title')}
            </h3>
            <div className="space-y-1.5 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <p key={`withdraw-inst-${i}`} className="text-[9px] font-bold text-slate-500 leading-tight">
                  {t(`withdraw_instruction_${i}` as any)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
