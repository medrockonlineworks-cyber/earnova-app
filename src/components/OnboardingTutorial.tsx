import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  HelpCircle, 
  Film, 
  Star, 
  Play, 
  TrendingUp, 
  Wallet, 
  Users, 
  User, 
  Award, 
  Sparkles, 
  Calculator, 
  CheckCircle2, 
  Flame,
  MousePointerClick
} from 'lucide-react';
import { JOBS } from '../constants';
import { cn } from '../lib/utils';
import WebApp from '@twa-dev/sdk';

interface OnboardingTutorialProps {
  currentLang: string;
  onClose: () => void;
  onPageChange: (page: string) => void;
  activePage: string;
  onClaimBonus?: () => void;
}

export function OnboardingTutorial({ currentLang, onClose, onPageChange, activePage, onClaimBonus }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);

  // Earning potential calculator states
  const [selectedJobId, setSelectedJobId] = useState('1'); // Defaults to JOB 1
  const [teamCountA, setTeamCountA] = useState(5);
  const [teamCountB, setTeamCountB] = useState(15);
  const [teamCountC, setTeamCountC] = useState(45);

  const selectedJob = JOBS.find(j => j.id === selectedJobId) || JOBS[1];

  // Calculations
  const directDailyTaskIncome = selectedJob.dailyTasks * selectedJob.eachOrder;
  
  // Assume team members are at the same level as selected to simulate realistic team earnings
  const teamMemberDailyIncome = selectedJob.dailyTasks * selectedJob.eachOrder;
  const teamADailyShare = teamCountA * teamMemberDailyIncome * 0.05; // 5%
  const teamBDailyShare = teamCountB * teamMemberDailyIncome * 0.03; // 3%
  const teamCDailyShare = teamCountC * teamMemberDailyIncome * 0.01; // 1%
  const totalTeamDailyShare = teamADailyShare + teamBDailyShare + teamCDailyShare;

  const totalDailyIncome = directDailyTaskIncome + totalTeamDailyShare;
  const totalMonthlyIncome = totalDailyIncome * 30;
  const totalYearlyIncome = totalDailyIncome * 365;

  const isAmharic = currentLang === 'AM';

  // Multi-language text maps with blue / white styled icons
  const stepsData = [
    {
      title: isAmharic ? "እንኳን ወደ Earnova በደህና መጡ!" : "Welcome to Earnova!",
      subtitle: isAmharic ? "በኢትዮጵያ ቀዳሚው ትርፋማ የቪዲዮ ማስታወቂያ ግምገማ ህብረተሰብ" : "Ethiopia's #1 High-Yield Attention & Media Feedback Ecosystem",
      icon: <Award size={48} className="text-blue-600 animate-pulse fill-blue-500/10" />
    },
    {
      title: isAmharic ? "የትርፍ ማስላኪያ (ክፍል 1)" : "Interactive Earnings Simulator (Step 1)",
      subtitle: isAmharic ? "የደረጃዎን እና የቡድንዎን ትርፍ አቅም አስቀድመው ያቅዱ" : "Visualize Your Personal & Generational Referral Wealth",
      icon: <Calculator size={36} className="text-blue-600" />
    },
    {
      title: isAmharic ? "የስራ ቦታዎችን ማወቅ (ክፍል 2)" : "Visual Workspace Tour (Step 2)",
      subtitle: isAmharic ? "ዋናውን የስራ ገጽ ያስሱ" : "Discover the Main Dashboard & VIP Growth Plans",
      icon: <CheckCircle2 size={36} className="text-blue-600" />,
      targetPage: 'HOME',
      highlightId: 'nav-HOME',
      desc: isAmharic 
        ? "በዋናው ገጽ ላይ የኮንትራት ስምምነቶችን በመፈረም፣ የስራ ደረጃዎን ማሳደግ እና ዕለታዊ ስራዎችን መመልከት ይችላሉ።" 
        : "The Home Panel is where you sign employment covenants, upgrade your job levels, and view premium sponsorship channels."
    },
    {
      title: isAmharic ? "ዕለታዊ የቪዲዮ ማስታወቂያዎች (ክፍል 3)" : "Sponsored Video Streams (Step 3)",
      subtitle: isAmharic ? "ቪዲዮዎችን ይመልከቱ፣ ደረጃ ይስጡ እና ይከፈሉ" : "Watch Promos, Rate Media & Claim Standard ETB",
      icon: <Film size={36} className="text-blue-600" />,
      targetPage: 'TASK',
      highlightId: 'nav-TASK',
      desc: isAmharic 
        ? "ማስታወቂያዎችን በመመልከት እና የኮከብ ግብረመልስ በመስጠት በየቀኑ ፈጣን የስራ ኮሚሽን ክፍያ ያግኙ።" 
        : "This is your active task engine. Select open video streams from YouTube, TikTok, or movie trailers, rate with stars, and instantly claim ETB payouts."
    },
    {
      title: isAmharic ? "የትርፍ ፈንድ ኢንቨስትመንት (ክፍል 4)" : "Compound Wealth Funds (Step 4)",
      subtitle: isAmharic ? "የቁጠባ ሂሳብዎን በከፍተኛ ወለድ ያሳድጉ" : "Earn Passive Compound Dividends Safely",
      icon: <Wallet size={36} className="text-blue-600" />,
      targetPage: 'FUND',
      highlightId: 'nav-FUND',
      desc: isAmharic 
        ? "የበለጸገውን የEarnova ፈንድ በመጠቀም ያጠራቀሙትን ገንዘብ አስተማማኝ በሆኑ ዕለታዊ ወለዶች ማሳደግ ይቻላል።" 
        : "Put your accumulated earnings to work! Purchase high-yield secure fund packages structured with Tier-1 banks, generating stable daily dividends."
    },
    {
      title: isAmharic ? "ባለ 3-ደረጃ የቡድን አባልነት (ክፍል 5)" : "Generational 3-Tier Network (Step 5)",
      subtitle: isAmharic ? "ጓደኞችዎን ይጋብዙ እና ከፍተኛ ማበረታቻ ያግኙ" : "Unlock Multi-Level Lifetime Royalties",
      icon: <Users size={36} className="text-blue-600" />,
      targetPage: 'INCOME',
      highlightId: 'nav-INCOME',
      desc: isAmharic 
        ? "የጋበዟቸው ጓደኞች ስራ ሲሰሩ በየቀኑ ኮሚሽን ወደ ሂሳብዎ ይገባል። ደረጃ ኤ 5% ፣ ደረጃ ቢ 3% ፣ ደረጃ ሲ 1% ትርፍ ያገኛሉ።" 
        : "Build your corporate agency! Earn passive commissions from your team's daily tasks: 5% from Level A, 3% from Level B, and 1% from Level C."
    },
    {
      title: isAmharic ? "የግል ደህንነቱ የተጠበቀ ካዝና (ክፍል 6)" : "Secure Operations Center (Step 6)",
      subtitle: isAmharic ? "ሂሳብዎን ያስተዳድሩ እና በቀላሉ ገንዘብ ያውጡ" : "Monitor Balance, Audit Records & Withdraw Cash",
      icon: <User size={36} className="text-blue-600" />,
      targetPage: 'PROFILE',
      highlightId: 'nav-PROFILE',
      desc: isAmharic 
        ? "ገንዘብዎን ማስተዳደር፣ የታሪክ መዝገቦችን መመለከት እና ያገኙትን ትርፍ ወደ ባንክዎ በቀጥታ ማስተላለፍ ይችላሉ።" 
        : "Your profile center protects your identity. Bind your bank accounts, audit instant cash logs, and request priority earnings withdrawals."
    },
    {
      title: isAmharic ? "የEarnova ስራን ለመጀመር ዝግጁ ነዎት!" : "Congratulations! You're Ready!",
      subtitle: isAmharic ? "ቀዳሚውን የማስታወቂያ ግብረመልስ ስራ ይጀምሩ" : "Activate Your Financial Journey Today",
      icon: <Sparkles size={48} className="text-blue-500 animate-bounce" />
    }
  ];

  const currentStepData = stepsData[step];

  // Navigate app screen on step change
  useEffect(() => {
    if (currentStepData.targetPage) {
      onPageChange(currentStepData.targetPage);
    }
  }, [step]);

  const handleNext = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    if (step < stepsData.length - 1) {
      setStep(prev => prev + 1);
    } else {
      localStorage.setItem('earnova_onboarding_completed', 'true');
      if (onClaimBonus) onClaimBonus();
      onClose();
      WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handlePrev = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const handleSkipTour = () => {
    WebApp.HapticFeedback.notificationOccurred('warning');
    localStorage.setItem('earnova_onboarding_completed', 'true');
    if (onClaimBonus) onClaimBonus();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white border border-blue-100 rounded-[36px] w-full max-w-lg p-6 relative overflow-hidden flex flex-col justify-between max-h-[92vh] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative glowing gradient elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.03] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/[0.03] rounded-full blur-3xl animate-pulse" />

          {/* Close & Skip Area */}
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 font-mono text-[9px] font-black text-blue-600">
              <Sparkles size={11} className="animate-spin text-blue-500" />
              <span>ONBOARDING: {step + 1}/{stepsData.length}</span>
            </div>
            
            <button 
              onClick={handleSkipTour} 
              className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600 transition-colors tracking-widest bg-gray-50 border border-transparent hover:border-blue-100 rounded-full px-3 py-1 scale-95"
            >
              {isAmharic ? "ዘልለው ይለፉ" : "Skip Tour"}
            </button>
          </div>

          {/* Main Context Card */}
          <div className="my-6 space-y-5 flex-1 overflow-y-auto no-scrollbar relative z-10 py-1">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                {currentStepData.icon}
              </div>
              <div>
                <h3 className="text-base font-black italic text-blue-950 uppercase tracking-tight">{currentStepData.title}</h3>
                <p className="text-[10px] font-black tracking-widest text-blue-900/40 uppercase mt-0.5">{currentStepData.subtitle}</p>
              </div>
            </div>

            {/* Step 0: Welcome Frame */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50/20 border border-blue-100/45 rounded-2xl p-4.5 space-y-3">
                  <p className="text-xs font-medium text-gray-600 leading-relaxed">
                    {isAmharic 
                      ? "ወደ Earnova በደህና መጡ! ይህ መድረክ የቪዲዮ ስፖንሰርሺፕ ማስታወቂያዎችን በመመልከት፣ በመገምገም እና በማረጋገጥ በየቀኑ ትክክለኛ የኢትዮጵያ ብር (ETB) ለመሰብሰብ ያስችልዎታል።"
                      : "Earnova Media Hub links top brands and content creators with your feedback. Watch video ad reels, share standard ratings, and secure instant commissions directly credited into your personal balance."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-100/40">
                    <div className="bg-white border border-blue-100/50 p-3 rounded-xl text-center shadow-sm">
                      <p className="text-[8px] font-black text-blue-900/40 uppercase tracking-widest leading-none">Min Daily Yield</p>
                      <p className="text-sm font-black text-blue-600 mt-1">ETB 110.00</p>
                    </div>
                    <div className="bg-white border border-blue-100/50 p-3 rounded-xl text-center shadow-sm">
                      <p className="text-[8px] font-black text-blue-900/40 uppercase tracking-widest leading-none">Network Royalties</p>
                      <p className="text-sm font-black text-emerald-600 mt-1">Up to 50%</p>
                    </div>
                  </div>
                </div>

                <div className="text-center p-3.5 border border-dashed border-blue-200/50 rounded-2xl flex items-center gap-2.5 bg-blue-50/30">
                  <Flame size={18} className="text-blue-650 animate-pulse text-blue-600 flex-shrink-0" />
                  <p className="text-[9px] font-bold text-gray-500 text-left leading-normal uppercase">
                    {isAmharic
                      ? "ቀጣዩን ደረጃ በመጫን ትክክለኛውን የገቢ አቅም ማስላኪያ ማሽን ይሞክሩ!"
                      : "Click \"Next Step\" below to unlock our live interactive income calculator tool!"}
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Active Interactive Calculator */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50/10 border border-blue-100 rounded-3xl p-4.5 space-y-4 relative">
                  <div>
                    <span className="text-[8px] font-black bg-blue-650 bg-blue-650 text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase font-mono tracking-widest">Interactive Calculator</span>
                    <h4 className="text-[12px] font-black text-blue-950 uppercase tracking-tight mt-1">Simulate Your Daily Earnings Matrix</h4>
                  </div>

                  {/* VIP Job Level Selector Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase">
                      <span>Select VIP Employment Level</span>
                      <span className="text-blue-600 font-mono">Job {selectedJob.level} (Deposit: {selectedJob.deposit} ETB)</span>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                      {JOBS.slice(1, 7).map((job) => (
                        <button
                          key={`calc-job-tab-${job.id}`}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            WebApp.HapticFeedback.selectionChanged();
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex-shrink-0 transition-all shadow-sm",
                            selectedJobId === job.id
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-500 border-gray-250 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                          )}
                        >
                          L{job.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Team Sliders Grid */}
                  <div className="space-y-3.5 pt-1">
                    {/* Slider A */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-gray-500 uppercase">
                        <span>Level A Referral Partners (5%)</span>
                        <span className="text-blue-950 font-mono font-black">{teamCountA} Subordinates</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="50"
                        value={teamCountA}
                        onChange={(e) => {
                          setTeamCountA(parseInt(e.target.value));
                          WebApp.HapticFeedback.selectionChanged();
                        }}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    {/* Slider B */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-gray-500 uppercase">
                        <span>Level B Partners (3%)</span>
                        <span className="text-blue-950 font-mono font-black">{teamCountB} Subordinates</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="150"
                        value={teamCountB}
                        onChange={(e) => {
                          setTeamCountB(parseInt(e.target.value));
                          WebApp.HapticFeedback.selectionChanged();
                        }}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    {/* Slider C */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9.5px] font-black text-gray-500 uppercase">
                        <span>Level C Partners (1%)</span>
                        <span className="text-blue-950 font-mono font-black">{teamCountC} Subordinates</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="300"
                        value={teamCountC}
                        onChange={(e) => {
                          setTeamCountC(parseInt(e.target.value));
                          WebApp.HapticFeedback.selectionChanged();
                        }}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* Simulation output metrics block */}
                  <div className="bg-white border border-blue-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Direct Daily Tasks ({selectedJob.dailyTasks})</span>
                      <span className="text-xs font-mono font-black text-blue-950">ETB {directDailyTaskIncome.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Team Daily Commissions Royalty</span>
                      <span className="text-xs font-mono font-black text-emerald-600">+ETB {totalTeamDailyShare.toFixed(2)}</span>
                    </div>

                    {/* Highlighted Net Monthly Potentials */}
                    <div className="border-t border-blue-50 pt-2.5 mt-1 grid grid-cols-2 gap-35 grid-cols-2 gap-2">
                      <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-left">
                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">Est. Monthly Profit</p>
                        <p className="text-sm font-black text-blue-700 mt-1">ETB {totalMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-left">
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Est. Annual Profit</p>
                        <p className="text-sm font-black text-emerald-700 mt-1">ETB {totalYearlyIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guided tours containing description details (Steps 2 - 6) */}
            {step >= 2 && step <= 6 && (
              <div className="space-y-4">
                <div className="bg-white border border-blue-100 rounded-3xl p-5 space-y-4 relative shadow-sm">
                  {/* Spotlight design icon indicator to represent clicking */}
                  <div className="flex justify-center py-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                        <MousePointerClick size={24} />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-gray-500 leading-relaxed text-center leading-relaxed">
                    {currentStepData.desc}
                  </p>

                  <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-4 text-center">
                    <p className="text-[8px] font-black text-blue-900/40 uppercase tracking-widest leading-none mb-1.5">Interactive Tour Behavior</p>
                    <p className="text-[9.5px] font-bold text-blue-600 uppercase">
                      {isAmharic 
                        ? "በጀርባ ያለው ገጽ በራስ-ሰር ተቀይሯል! ድርጊቱን በገጹ ላይ ይመልከቱ።" 
                        : `We have automatically switched the active page to ${currentStepData.targetPage} to show context!`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Final Congrats page (Step 7) */}
            {step === 7 && (
              <div className="space-y-4 text-center">
                <div className="bg-blue-50/10 border border-blue-100 rounded-3xl p-6 space-y-4 relative overflow-hidden shadow-sm">
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-500/5 rounded-full blur-xl animate-pulse" />
                  
                  <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto">
                    <Award size={32} className="stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-blue-950 uppercase tracking-tight">Earnova Qualified Executive</h4>
                    <p className="text-[9px] font-mono font-bold text-blue-900/40 uppercase tracking-widest">Tutorial Completed successfully</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl py-3 px-4 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Tutorial Bonus Ready</p>
                      <p className="text-[10px] text-gray-400 italic font-bold">Claim and unlock access</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600 font-mono">+ETB 100.00 Claimable</span>
                  </div>

                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    {isAmharic
                      ? "አሁን ሁሉንም የEarnova ሚስጥራት በሚገባ ተረድተዋል! ዕለታዊ የቪዲዮ ስራዎችን በመጀመር ዛሬውኑ ገቢ መሰብሰብ ይጀምሩ። መልካም የስራ ጊዜ!"
                      : "Welcome on board! You have configured your stream awareness and are fully verified to begin executing high-commission video tasks. Claim your bonus to launch your Earnova Career!"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Navigation Controls */}
          <div className="border-t border-blue-50 pt-5 relative z-10 flex gap-3 items-center">
            {step > 0 && (
              <button 
                onClick={handlePrev}
                className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all active:scale-95 flex items-center justify-center border border-gray-100 shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <button 
              onClick={handleNext}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-1.5"
            >
              <span>{step === stepsData.length - 1 ? (isAmharic ? "ሂድ ስራ ጀምር!" : "Unlock & Begin Tasking") : (isAmharic ? "ቀጣይ እርምጃ" : "Next Step")}</span>
              <ChevronRight size={14} className="stroke-[3]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
