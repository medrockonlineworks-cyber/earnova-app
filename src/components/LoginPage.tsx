import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Lock, 
  User, 
  Globe, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import WebApp from '@twa-dev/sdk';
import { Language } from '../translations';

interface LoginPageProps {
  currentLang: Language;
  setCurrentLang: (l: Language) => void;
  t: any;
  onLoginSuccess?: () => void;
}

export function LoginPage({ currentLang, setCurrentLang, t, onLoginSuccess }: LoginPageProps) {
  const [invitedBy, setInvitedBy] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ref') || '';
    } catch {
      return '';
    }
  });

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ref') ? 'REGISTER' : 'LOGIN';
    } catch {
      return 'LOGIN';
    }
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLangs, setShowLangs] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dirty state trackers for real-time validation feedback as they type
  const [isPhoneDirty, setIsPhoneDirty] = useState(false);
  const [isPasswordDirty, setIsPasswordDirty] = useState(false);
  const [isFullNameDirty, setIsFullNameDirty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getPhoneErrorString = (val: string) => {
    const clean = val.trim().replace(/\s+/g, '');
    if (!clean) {
      return currentLang === 'AM' ? 'ስልክ ቁጥር ያስፈልጋል' : 'Phone number is required';
    }
    if (!/^[0-9+]+$/.test(clean)) {
      return currentLang === 'AM' ? 'ትክክለኛ ቁጥሮች ብቻ ያስገቡ' : 'Only digits and + are allowed';
    }
    if (clean.length < 9) {
      return currentLang === 'AM' ? 'ስልክ ቁጥር ቢያንስ 9 ዲጂት መሆን አለበት' : 'Phone number must be at least 9 digits';
    }
    if (clean.length > 15) {
      return currentLang === 'AM' ? 'ስልክ ቁጥር በጣም ረጅም ነው' : 'Phone number is too long';
    }
    return null;
  };

  const getPasswordErrorString = (val: string) => {
    if (!val) {
      return currentLang === 'AM' ? 'የይለፍ ቃል ያስፈልጋል' : 'Password is required';
    }
    if (val.length < 4) {
      return currentLang === 'AM' ? 'የይለፍ ቃል ቢያንስ 4 ቁምፊዎች መሆን አለበት' : 'Password must be at least 4 characters';
    }
    return null;
  };

  const getFullNameErrorString = (val: string) => {
    if (!val.trim()) {
      return currentLang === 'AM' ? 'እባክዎ ሙሉ ስምዎን ያስገቡ' : 'Please enter your full name';
    }
    if (val.trim().length < 3) {
      return currentLang === 'AM' ? 'ሙሉ ስም ቢያንስ 3 ቁምፊዎች መሆን አለበት' : 'Full name must be at least 3 characters';
    }
    return null;
  };

  // Live computed validator outputs
  const phoneError = isPhoneDirty ? getPhoneErrorString(phone) : null;
  const passwordError = isPasswordDirty ? getPasswordErrorString(password) : null;
  const fullNameError = isFullNameDirty ? getFullNameErrorString(fullName) : null;

  const langs: { id: Language; label: string }[] = [
    { id: 'EN', label: 'English' },
    { id: 'AM', label: 'አማርኛ' },
    { id: 'OR', label: 'Afaan Oromoo' },
    { id: 'SO', label: 'Af-Soomaali' },
  ];

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setShowLangs(false);
    WebApp.HapticFeedback.selectionChanged();
  };

  const validateInputs = () => {
    // Explicitly set all to true to show real-time comments upon submission attempts
    setIsPhoneDirty(true);
    setIsPasswordDirty(true);
    setIsFullNameDirty(true);

    const phoneErr = getPhoneErrorString(phone);
    if (phoneErr) {
      setErrorMsg(phoneErr);
      return false;
    }
    const passwordErr = getPasswordErrorString(password);
    if (passwordErr) {
      setErrorMsg(passwordErr);
      return false;
    }
    if (activeTab === 'REGISTER') {
      const fullNameErr = getFullNameErrorString(fullName);
      if (fullNameErr) {
        setErrorMsg(fullNameErr);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validateInputs()) return;

    setIsLoading(true);
    WebApp.HapticFeedback.impactOccurred('medium');

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    try {
      // Always ensure we have an anonymous Firebase session for database rule compliance if allowed
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn("Silent anonymous sign in failed in LoginPage, continuing via phone profile lookup:", anonErr);
        }
      }

      if (activeTab === 'LOGIN') {
        const userRef = doc(db, 'users', cleanPhone);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error(currentLang === 'AM' ? 'ስልክ ቁጥሩ አልተመዘገበም' : 'Phone number is not registered. Please sign up.');
        }

        const userData = userSnap.data();
        if (userData.password !== password) {
          throw new Error(currentLang === 'AM' ? 'የተሳሳተ የይለፍ ቃል ያስገቡ' : 'Wrong password. Please try again.');
        }

        // Successfully authenticated! Store in localStorage
        localStorage.setItem('earnova_logged_in_phone', cleanPhone);
      } else {
        // REGISTER
        const userRef = doc(db, 'users', cleanPhone);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData && userData.password === password) {
            // Password matches existing registered account! Seamlessly log them in
            localStorage.setItem('earnova_logged_in_phone', cleanPhone);
          } else {
            throw new Error(currentLang === 'AM' 
              ? 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል፤ እባክዎ በትክክለኛው የይለፍ ቃል ለመግባት ይሞክሩ' 
              : 'Phone number is already registered. Please log in or use your correct password.');
          }
        } else {
          let cleanInvitedBy = invitedBy.trim();
          if (cleanInvitedBy.includes('-')) {
            cleanInvitedBy = cleanInvitedBy.split('-').pop() || cleanInvitedBy;
          }
          
          // Decode premium base36 invite code back to the original referrer phone number
          if (/^[A-Z0-9]+$/i.test(cleanInvitedBy) && !cleanInvitedBy.startsWith('guest_') && isNaN(Number(cleanInvitedBy))) {
            try {
              const decodedNum = parseInt(cleanInvitedBy, 36);
              if (!isNaN(decodedNum)) {
                cleanInvitedBy = '0' + decodedNum.toString();
              }
            } catch (err) {
              console.warn("Base36 decoding issue:", err);
            }
          } else if (!cleanInvitedBy.startsWith('guest_')) {
            cleanInvitedBy = cleanInvitedBy.replace(/\D/g, '');
          }

          // Write custom credentials & profile fields using cleanPhone as key to users
          await setDoc(userRef, {
            personal: 0.00, // Claimed via onboarding tour
            income: 0.00,
            workDeposit: 0.00,
            status: 'active',
            currentLevel: 'INTERN',
            phoneNumber: cleanPhone,
            fullName: fullName,
            password: password, // Save for secure offline-free lookup
            invitedBy: cleanInvitedBy,
            createdAt: new Date().toISOString()
          });

          // Store in localStorage as logged in
          localStorage.setItem('earnova_logged_in_phone', cleanPhone);
        }
      }

      WebApp.HapticFeedback.notificationOccurred('success');
      setIsSuccess(true);
      
      // Delay before proceeding to trigger success animation nicely
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGuestAccess = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    WebApp.HapticFeedback.impactOccurred('light');

    try {
      try {
        await signInAnonymously(auth);
      } catch (anonErr) {
        console.warn("Silent anonymous guest sign in failed, continuing locally:", anonErr);
      }
      
      // Store a custom guest login phone so the app can continue
      const guestPhone = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('earnova_logged_in_phone', guestPhone);
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setIsSuccess(true);
      
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to start guest session.');
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-6 relative overflow-x-hidden select-none">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />

      {/* Language Selector in Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-md">
            E
          </div>
          <span className="text-blue-600 font-black italic text-lg tracking-tighter">EARNOVA</span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowLangs(!showLangs)} 
            className="flex items-center gap-1 text-blue-600 font-black px-3 py-1.5 bg-white border border-blue-100 rounded-full text-xs shadow-sm active:scale-95 transition-transform"
          >
            <Globe size={14} />
            {langs.find(l => l.id === currentLang)?.label.split(' ')[0]}
          </button>
          
          <AnimatePresence>
            {showLangs && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLangs(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 min-w-[130px] z-20"
                >
                  {langs.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleLanguageChange(l.id)}
                      className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-black tracking-tight hover:bg-blue-50 text-gray-700 transition-colors"
                    >
                      {l.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div 
            key="auth-success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 animate-bounce">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tight italic">
                {currentLang === 'AM' ? 'እንኳን ደህና መጡ!' : 'Welcome Back!'}
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                {currentLang === 'AM' ? 'መለያዎ በተሳካ ሁኔታ ተገናኝቷል' : 'AUTHENTICATED SECURELY'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="auth-main-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="my-10 max-w-sm w-full mx-auto space-y-6 z-10"
          >
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black italic tracking-tighter text-blue-950 uppercase leading-none">
                {activeTab === 'LOGIN' 
                  ? (currentLang === 'AM' ? 'ወደ መለያዎ ይግቡ' : 'Access Your Vault') 
                  : (currentLang === 'AM' ? 'መለያ ይፍጠሩ' : 'Create Executive Vault')}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">
                {currentLang === 'AM' 
                  ? 'በኢትዮጵያ ቀዳሚው የቪዲዮ ማስታወቂያ ግምገማ ህብረተሰብ' 
                  : 'Ethiopia\'s Premier Media Yield & Feedback System'}
              </p>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-rose-700 leading-snug uppercase">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab switchers */}
            <div className="flex bg-white border border-blue-100/60 p-1.5 rounded-2xl shadow-sm">
              <button
                onClick={() => {
                  setActiveTab('LOGIN');
                  setErrorMsg(null);
                  WebApp.HapticFeedback.selectionChanged();
                }}
                className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'LOGIN' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50/30'
                }`}
              >
                {currentLang === 'AM' ? 'ግባ' : 'Sign In'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('REGISTER');
                  setErrorMsg(null);
                  WebApp.HapticFeedback.selectionChanged();
                }}
                className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'REGISTER' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50/30'
                }`}
              >
                {currentLang === 'AM' ? 'ተመዝገብ' : 'Register'}
              </button>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'REGISTER' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">{currentLang === 'AM' ? 'ሙሉ ስም' : 'Full Name'}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setIsFullNameDirty(true);
                        }}
                        onBlur={() => setIsFullNameDirty(true)}
                        placeholder={currentLang === 'AM' ? 'የእርስዎን ስም ያስገቡ' : 'Enter your name'}
                        className={`w-full bg-white border ${
                          fullNameError ? 'border-rose-500 focus:border-rose-500' : 'border-blue-50 focus:border-blue-500'
                        } focus:bg-white p-4 pl-12 rounded-2xl text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all`}
                      />
                      <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fullNameError ? 'text-rose-500' : 'text-gray-400'}`} />
                    </div>
                    {fullNameError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -4 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="text-[10px] font-bold text-rose-500 pl-1"
                      >
                        {fullNameError}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      {currentLang === 'AM' ? 'የግብዣ ኮድ / አስተዋዋቂ (ካለ)' : 'Invitation Code / Referrer (Optional)'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={invitedBy}
                        onChange={(e) => setInvitedBy(e.target.value)}
                        placeholder={currentLang === 'AM' ? 'የግብዣ ኮድ ያስገቡ' : 'Enter referral or inviter phone number'}
                        className="w-full bg-white border border-blue-50 focus:border-blue-500 focus:bg-white p-4 pl-12 rounded-2xl text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all"
                      />
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">{currentLang === 'AM' ? 'ስልክ ቁጥር' : 'Phone Number'}</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setIsPhoneDirty(true);
                    }}
                    onBlur={() => setIsPhoneDirty(true)}
                    placeholder="0912345678"
                    className={`w-full bg-white border ${
                      phoneError ? 'border-rose-500 focus:border-rose-500' : 'border-blue-50 focus:border-blue-500'
                    } focus:bg-white p-4 pl-12 rounded-2xl text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all text-left`}
                  />
                  <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${phoneError ? 'text-rose-500' : 'text-gray-400'}`} />
                </div>
                {phoneError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -4 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-[10px] font-bold text-rose-500 pl-1"
                  >
                    {phoneError}
                  </motion.p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">{currentLang === 'AM' ? 'የይለፍ ቃል' : 'Password'}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setIsPasswordDirty(true);
                    }}
                    onBlur={() => setIsPasswordDirty(true)}
                    placeholder="••••••••"
                    className={`w-full bg-white border ${
                      passwordError ? 'border-rose-500 focus:border-rose-500' : 'border-blue-50 focus:border-blue-500'
                    } focus:bg-white p-4 pl-12 pr-12 rounded-2xl text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all`}
                  />
                  <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${passwordError ? 'text-rose-500' : 'text-gray-400'}`} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(!showPassword);
                      WebApp.HapticFeedback.impactOccurred('light');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -4 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-[10px] font-bold text-rose-500 pl-1"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {activeTab === 'LOGIN' 
                        ? (currentLang === 'AM' ? 'ግባ' : 'Access Account') 
                        : (currentLang === 'AM' ? 'መለያ ፍጠር' : 'Launch Account')}
                    </span>
                    <ArrowRight size={14} className="stroke-[3]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer space alignment */}
            <div className="pt-2"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer copyright and security indicators */}
      <div className="text-center space-y-2 z-10 pt-4 border-t border-blue-50">
        <p className="text-[8px] font-black text-gray-400 tracking-wider uppercase">
          SECURE 256-BIT ENCRYPTION PORTAL
        </p>
        <p className="text-[8px] font-bold text-gray-400">
          © {new Date().getFullYear()} EARNOVA GLOBAL. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
