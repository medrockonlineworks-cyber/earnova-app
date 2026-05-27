import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home as HomeIcon, 
  Wallet, 
  TrendingUp, 
  CheckSquare, 
  User, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Users, 
  Mail, 
  MessageCircle, 
  Globe, 
  Bell,
  Settings,
  HelpCircle,
  Download,
  LogOut,
  FileText,
  ScrollText,
  BookOpen,
  PieChart,
  Calendar,
  ChevronRight,
  Share2,
  Plus,
  Check,
  X,
  Phone,
  Lock,
  Clock,
  History,
  Shield,
  ShieldAlert,
  Star,
  Film,
  Play,
  Loader2,
  RefreshCw,
  Info,
  ExternalLink
} from 'lucide-react';
import { JOBS, INVESTMENTS, JobLevel, UP_LEVEL_RULES, TASK_RULES, POSITION_RULES } from './constants';
import { cn } from './lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WithdrawModal } from './components/WithdrawModal';
import { RechargeModal } from './components/RechargeModal';
import { SupportCenter } from './components/SupportCenter';
import { InviteModal } from './components/InviteModal';
import { TeamModal } from './components/TeamModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { WithdrawalHistoryModal } from './components/WithdrawalHistoryModal';
import { RechargeHistoryModal } from './components/RechargeHistoryModal';
import { TaskHistoryModal } from './components/TaskHistoryModal';
import { FinancialRecordModal } from './components/FinancialRecordModal';
import { PersonalInfoModal } from './components/PersonalInfoModal';
import { AboutUsModal } from './components/AboutUsModal';
import { SigningModal } from './components/SigningModal';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { LoginPage } from './components/LoginPage';
import { TRANSLATIONS, Language } from './translations';
import { auth, db, handleFirestoreError, OperationType, getUserDocId, isUserAdmin, logoutUser } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, collection, query } from 'firebase/firestore';

type Page = 'HOME' | 'FUND' | 'INCOME' | 'TASK' | 'PROFILE';

const jobLevelToNum = (lvl: string): number => {
  if (lvl === JobLevel.INTERN || !lvl) return 0;
  const match = lvl.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const getUpgradeCommission = (subLevel: string, invLevel: string, depth: number): number => {
  const subIdx = jobLevelToNum(subLevel);
  const invIdx = jobLevelToNum(invLevel);
  const minIdx = Math.min(subIdx, invIdx);
  if (minIdx <= 0) return 0;
  
  const rule = UP_LEVEL_RULES[minIdx - 1];
  if (!rule) return 0;
  
  if (depth === 1) return Number(rule.level1) || 0;
  if (depth === 2) return Number(rule.level2) || 0;
  if (depth === 3) return Number(rule.level3) || 0;
  return 0;
};

// Helper to award upgrade commission recursively up to 3 levels (A, B, C)
async function fetchAndAwardUpgradeCommission(subordinateId: string, upgradeLevel: string) {
  try {
    const { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    
    // Level 1 Inviter (A)
    const subRef = doc(db, 'users', subordinateId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) return;
    const subData = subSnap.data();
    const inviterA_Id = (subData?.invitedBy || '').trim();
    if (!inviterA_Id) return;

    // Load A
    const aRef = doc(db, 'users', inviterA_Id);
    const aSnap = await getDoc(aRef);
    if (!aSnap.exists()) return;
    const aData = aSnap.data();
    const aLevel = aData?.currentLevel || 'Intern';
    const commA = getUpgradeCommission(upgradeLevel, aLevel, 1);
    if (commA > 0) {
      await updateDoc(aRef, {
        income: increment(commA),
        recommended: increment(commA)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterA_Id,
        amount: commA,
        type: 'team_upgrade',
        label: `Subordinate Level Upgrade Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }

    // Level 2 Inviter (B)
    const inviterB_Id = (aData?.invitedBy || '').trim();
    if (!inviterB_Id) return;
    const bRef = doc(db, 'users', inviterB_Id);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) return;
    const bData = bSnap.data();
    const bLevel = bData?.currentLevel || 'Intern';
    const commB = getUpgradeCommission(upgradeLevel, bLevel, 2);
    if (commB > 0) {
      await updateDoc(bRef, {
        income: increment(commB),
        recommended: increment(commB)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterB_Id,
        amount: commB,
        type: 'team_upgrade',
        label: `Indirect Subordinate Level Upgrade Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }

    // Level 3 Inviter (C)
    const inviterC_Id = (bData?.invitedBy || '').trim();
    if (!inviterC_Id) return;
    const cRef = doc(db, 'users', inviterC_Id);
    const cSnap = await getDoc(cRef);
    if (!cSnap.exists()) return;
    const cData = cSnap.data();
    const cLevel = cData?.currentLevel || 'Intern';
    const commC = getUpgradeCommission(upgradeLevel, cLevel, 3);
    if (commC > 0) {
      await updateDoc(cRef, {
        income: increment(commC),
        recommended: increment(commC)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterC_Id,
        amount: commC,
        type: 'team_upgrade',
        label: `Indirect Subordinate Level Upgrade Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Error awarding upgrade commission to upline:", err);
  }
}

// Helper to award daily task commission recursively up to 3 levels (A, B, C)
async function fetchAndAwardTaskCommission(subordinateId: string, subordinateLevel: string, taskSingleCommission: number) {
  try {
    const { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    
    // Level 1 Inviter (A)
    const subRef = doc(db, 'users', subordinateId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) return;
    const subData = subSnap.data();
    const inviterA_Id = (subData?.invitedBy || '').trim();
    if (!inviterA_Id) return;

    // Load A
    const aRef = doc(db, 'users', inviterA_Id);
    const aSnap = await getDoc(aRef);
    if (!aSnap.exists()) return;
    const aData = aSnap.data();
    const aLevel = aData?.currentLevel || 'Intern';
    // Must be at same or higher level than subordinate to earn task commission
    if (jobLevelToNum(aLevel) >= jobLevelToNum(subordinateLevel)) {
      const commA = taskSingleCommission * 0.05;
      await updateDoc(aRef, {
        income: increment(commA),
        teamTasks: increment(commA)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterA_Id,
        amount: commA,
        type: 'team_task',
        label: `Subordinate Task Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }

    // Level 2 Inviter (B)
    const inviterB_Id = (aData?.invitedBy || '').trim();
    if (!inviterB_Id) return;
    const bRef = doc(db, 'users', inviterB_Id);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) return;
    const bData = bSnap.data();
    const bLevel = bData?.currentLevel || 'Intern';
    if (jobLevelToNum(bLevel) >= jobLevelToNum(subordinateLevel)) {
      const commB = taskSingleCommission * 0.03;
      await updateDoc(bRef, {
        income: increment(commB),
        teamTasks: increment(commB)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterB_Id,
        amount: commB,
        type: 'team_task',
        label: `Indirect Subordinate Task Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }

    // Level 3 Inviter (C)
    const inviterC_Id = (bData?.invitedBy || '').trim();
    if (!inviterC_Id) return;
    const cRef = doc(db, 'users', inviterC_Id);
    const cSnap = await getDoc(cRef);
    if (!cSnap.exists()) return;
    const cData = cSnap.data();
    const cLevel = cData?.currentLevel || 'Intern';
    if (jobLevelToNum(cLevel) >= jobLevelToNum(subordinateLevel)) {
      const commC = taskSingleCommission * 0.01;
      await updateDoc(cRef, {
        income: increment(commC),
        teamTasks: increment(commC)
      });
      await addDoc(collection(db, 'commissions'), {
        userId: inviterC_Id,
        amount: commC,
        type: 'team_task',
        label: `Indirect Subordinate Task Commission`,
        subordinatePhone: subData?.phoneNumber || 'Subordinate',
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Error awarding task commissions to upline:", err);
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>('HOME');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentJobLevel, setCurrentJobLevel] = useState<JobLevel>(JobLevel.INTERN);
  const [balance, setBalance] = useState({ income: 0.00, personal: 0.00, workDeposit: 0.00, recommended: 0.00, teamTasks: 0.00 });
  const [userStatus, setUserStatus] = useState<string>('active');
  const [userProfile, setUserProfile] = useState<{ phoneNumber?: string; fullName?: string; email?: string; avatarUrl?: string; avatarSeed?: string; createdAt?: string } | null>(null);
  const [showSupportOnSuspended, setShowSupportOnSuspended] = useState(false);
  const [signedContracts, setSignedContracts] = useState<string[]>(() => {
    const saved = localStorage.getItem('earnova_signed_contracts');
    return saved ? JSON.parse(saved) : [];
  });
  const [investments, setInvestments] = useState<any[]>(() => {
    const saved = localStorage.getItem('user_investments');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Custom states for high-fidelity downloadable (PWA) installation
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      console.log('beforeinstallprompt event stashed successfully');
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('user_investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem('earnova_signed_contracts', JSON.stringify(signedContracts));
  }, [signedContracts]);

  // Live reload detection mechanism to sync update immediately for all users
  useEffect(() => {
    let initialVersion: string | null = null;
    let isChecking = false;

    const checkVersion = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          if (data && data.version) {
            if (!initialVersion) {
              initialVersion = data.version;
            } else if (initialVersion !== data.version) {
              console.log("Earnova App update detected! Automatically reloading to the latest build...", initialVersion, "->", data.version);
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.warn("Version check failed:", err);
      } finally {
        isChecking = false;
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 8000); // Poll every 8 seconds
    window.addEventListener('focus', checkVersion);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWithdrawHistoryModal, setShowWithdrawHistoryModal] = useState(false);
  const [showRechargeHistoryModal, setShowRechargeHistoryModal] = useState(false);
  const [showTaskHistoryModal, setShowTaskHistoryModal] = useState(false);
  const [showFinancialRecordModal, setShowFinancialRecordModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showAboutUsModal, setShowAboutUsModal] = useState(false);
  const [showSigningModal, setShowSigningModal] = useState<{ level: JobLevel, deposit: number } | null>(null);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState<{ isOpen: boolean, initialView?: 'PASSWORD' | 'EMAIL' | 'PHONE' }>({ isOpen: false });
  const [prefillAmount, setPrefillAmount] = useState<string | undefined>(undefined);
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthSetupNotice, setShowAuthSetupNotice] = useState(false);
  const [tasksClaimedToday, setTasksClaimedToday] = useState<number>(() => {
    const activeUserId = localStorage.getItem('earnova_logged_in_phone') || '';
    if (!activeUserId) return 0;
    const localProfilesStr = localStorage.getItem('earnova_local_profiles');
    if (localProfilesStr) {
      try {
        const localProfiles = JSON.parse(localProfilesStr);
        const data = localProfiles[activeUserId];
        const today = new Date().toDateString();
        if (data && data.lastTaskClaimDate === today) {
          return data.tasksClaimedToday || 0;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem(`tasksCompletedCount_${activeUserId}`);
    const date = localStorage.getItem(`taskCompletionDate_${activeUserId}`);
    const today = new Date().toDateString();
    if (date === today) {
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });

  useEffect(() => {
    const activeUserId = localStorage.getItem('earnova_logged_in_phone') || '';
    if (activeUserId) {
      localStorage.setItem(`tasksCompletedCount_${activeUserId}`, tasksClaimedToday.toString());
      localStorage.setItem(`taskCompletionDate_${activeUserId}`, new Date().toDateString());
      
      try {
        const localProfilesStr = localStorage.getItem('earnova_local_profiles');
        const localProfiles = localProfilesStr ? JSON.parse(localProfilesStr) : {};
        if (localProfiles[activeUserId]) {
          localProfiles[activeUserId].tasksClaimedToday = tasksClaimedToday;
          localProfiles[activeUserId].lastTaskClaimDate = new Date().toDateString();
          localStorage.setItem('earnova_local_profiles', JSON.stringify(localProfiles));
        }
      } catch (e) {}
    }
  }, [tasksClaimedToday]);

  // Advertising Popups State & Effects
  const [ads, setAds] = useState<any[]>([]);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [activeAd, setActiveAd] = useState<any>(null);
  const [adCountdown, setAdCountdown] = useState(10);

  // Pull-to-refresh Mechanism States & Event Handlers
  const [refreshKey, setRefreshKey] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullHeight, setPullHeight] = useState(0);
  const [startY, setStartY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    // Only allow pulling if we are at the very top of our scroll container
    if (scrollContainerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      // Soft elastic scaling
      const dampedHeight = Math.min(100, Math.pow(diff, 0.8) * 1.8);
      setPullHeight(dampedHeight);
      
      // Stop Telegram or mobile browser elastic bouncing
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!pulling || refreshing) return;
    setPulling(false);
    if (pullHeight > 55) {
      triggerPullRefresh();
    } else {
      setPullHeight(0);
    }
  };

  // Support click-and-drag for desktop testing & flexibility
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    if (scrollContainerRef.current.scrollTop === 0) {
      setStartY(e.clientY);
      setPulling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!pulling || refreshing) return;
    const diff = e.clientY - startY;
    if (diff > 0) {
      const dampedHeight = Math.min(100, Math.pow(diff, 0.8) * 1.8);
      setPullHeight(dampedHeight);
    }
  };

  const handleMouseUp = () => {
    if (!pulling || refreshing) return;
    setPulling(false);
    if (pullHeight > 55) {
      triggerPullRefresh();
    } else {
      setPullHeight(0);
    }
  };

  const triggerPullRefresh = async () => {
    setRefreshing(true);
    setPullHeight(60);

    try {
      // 1. Clear session cache and local caches to enforce fetching fresh data from Firestore
      sessionStorage.removeItem('earnova_cached_ads');
      sessionStorage.removeItem('earnova_cached_payment_info');
      
      globalTasksCache = null;
      globalTasksLastFetchedAt = 0;
      globalHistoryCache = null;
      globalHistoryLastFetchedAt = 0;
      globalHistoryCachedUid = '';
      globalHistoryCachedClaimedCount = -1;

      const activeUserId = getUserDocId();
      if (activeUserId) {
        delete globalCompletedTaskIdsCache[activeUserId];
        delete globalCompletedLastFetchedAt[activeUserId];
        localStorage.removeItem(`earnova_historical_claimed_${activeUserId}`);
        localStorage.removeItem(`earnova_stats_history_${activeUserId}`);
        localStorage.removeItem(`earnova_cache_withdrawals_${activeUserId}`);
        localStorage.removeItem(`earnova_cache_recharges_${activeUserId}`);
      }

      // 2. Increment reload key to force clean, unmounted mount of pages and lists
      setRefreshKey(prev => prev + 1);

      // 3. Clear existing ads and trigger direct fetch to simulate visual progress
      const { collection, getDocs } = await import('firebase/firestore');
      const listSnap = await getDocs(collection(db, 'advertisements'));
      const list: any[] = [];
      listSnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAds(list);
      sessionStorage.setItem('earnova_cached_ads', JSON.stringify(list));

      // 4. Trigger premium Telegram feedback vibration
      try {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (hapticErr) {}

      showNotification('App refreshed successfully!', 'success');
    } catch (err) {
      console.warn("Pull-to-refresh reload error:", err);
      showNotification('Refresh connection active', 'info');
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        setPullHeight(0);
      }, 700);
    }
  };

  // Synchronize advertisements list from Firestore (real-time snapshot listener)
  useEffect(() => {
    const q = query(collection(db, 'advertisements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAds(list);
      sessionStorage.setItem('earnova_cached_ads', JSON.stringify(list));
    }, (err) => {
      console.warn("Advertisements realtime onSnapshot error (using cache fallback):", err);
      const cached = sessionStorage.getItem('earnova_cached_ads');
      if (cached) {
        try {
          setAds(JSON.parse(cached));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, []);

  const playNextAd = () => {
    if (!activeAd || ads.length === 0) {
      setShowAdPopup(false);
      setActiveAd(null);
      return;
    }
    const currentIndex = ads.findIndex(a => a.id === activeAd.id);
    const nextIndex = currentIndex + 1;
    if (nextIndex < ads.length) {
      setActiveAd(ads[nextIndex]);
      setAdCountdown(10);
    } else {
      setShowAdPopup(false);
      setActiveAd(null);
    }
  };

  const triggerAd = (loadedAds?: any[]) => {
    const activeAds = loadedAds || ads;
    if (activeAds && activeAds.length > 0) {
      if (showAdPopup) return; // Already showing, don't overlap
      setActiveAd(activeAds[0]);
      setAdCountdown(10);
      setShowAdPopup(true);
    }
  };

  // 10-second automatic fadeout countdown timer
  useEffect(() => {
    let timer: any;
    if (showAdPopup && adCountdown > 0) {
      timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (showAdPopup && adCountdown === 0) {
      playNextAd();
    }
    return () => clearTimeout(timer);
  }, [showAdPopup, adCountdown, activeAd, ads]);

  // Trigger ad check when entering HOME tab
  useEffect(() => {
    if (activePage === 'HOME' && ads.length > 0 && !showAdPopup && !activeAd) {
      triggerAd(ads);
    }
  }, [ads, activePage]);

  useEffect(() => {
    // Handle deep links / start params on mount
    const startParam = WebApp.initDataUnsafe?.start_param;
    const activePhone = localStorage.getItem('earnova_logged_in_phone');

    if (activePhone) {
      console.log('Found local phone login session, launching immediately:', activePhone);
      setCurrentUser({ uid: activePhone, isAnonymous: true, isLocalPhoneUser: true });
      setIsLoadingAuth(false);
    } else {
      console.log('No local phone login session found.');
    }

    // Auth initialization (ran purely as a secondary background layer)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsLoadingAuth(false);
      
      const currentActivePhone = localStorage.getItem('earnova_logged_in_phone');
      if (currentActivePhone) {
        // If they already have a local phone session, we do not override it
        setCurrentUser({ uid: currentActivePhone, isAnonymous: true, isLocalPhoneUser: true });
        return;
      }

      if (!user) {
        console.log('No Firebase user session, attempting silent anonymous connection token...');
        signInAnonymously(auth).catch((authErr) => {
          console.warn("Silent anonymous sign in failed in App.tsx (restricted by configuration):", authErr.message);
        });
        return;
      }

      console.log('Firebase session is active:', user.uid);
      setCurrentUser(user);
    });

    if (startParam) {
      const p = startParam.toUpperCase();
      if (p === 'RECHARGE') setShowRechargeModal(true);
      else if (p === 'WITHDRAW') setShowWithdrawModal(true);
      else if (p === 'SUPPORT') setShowSupportModal(true);
      else if (['HOME', 'FUND', 'INCOME', 'TASK', 'PROFILE'].includes(p)) {
        setActivePage(p as Page);
      }
    }

    const onboardingDone = localStorage.getItem('earnova_onboarding_completed');
    if (!onboardingDone) {
      setShowOnboarding(true);
    }

    return () => {
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    const userDocId = getUserDocId();

    if (userDocId) {
      // 1. Instantly bootstrap from local state to bypass Firestore reads/quotas & provide lightning-fast loading
      let localData: any = null;
      try {
        const localProfilesStr = localStorage.getItem('earnova_local_profiles');
        const localProfiles = localProfilesStr ? JSON.parse(localProfilesStr) : {};
        localData = localProfiles[userDocId];
        if (localData) {
          setUserProfile({
            phoneNumber: localData.phoneNumber || userDocId,
            fullName: localData.fullName || '',
            email: localData.email || '',
            avatarUrl: localData.avatarUrl || '',
            avatarSeed: localData.avatarSeed || '',
            createdAt: localData.createdAt || ''
          });
          setBalance({
            personal: localData.personal || 0,
            income: localData.income || 0,
            workDeposit: localData.workDeposit || 0,
            recommended: localData.recommended || 0,
            teamTasks: localData.teamTasks || 0
          });
          if (localData.currentLevel) {
            setCurrentJobLevel(localData.currentLevel as JobLevel);
          }
          if (localData.status) {
            setUserStatus(localData.status);
          }
          if (localData.signedContracts) {
            setSignedContracts(localData.signedContracts);
          }
          const todayString = new Date().toDateString();
          if (localData.lastTaskClaimDate === todayString) {
            setTasksClaimedToday(localData.tasksClaimedToday || 0);
          } else {
            setTasksClaimedToday(0);
          }
        }
      } catch (e) {
        console.warn("Error loading cached user profile:", e);
      }

      const userRef = doc(db, 'users', userDocId);
      getDoc(userRef).then((snap) => {
        if (!snap.exists()) {
          setDoc(userRef, {
            personal: 0.00, // Onboarding welcome bonus claimed via tutorial screen
            income: 0.00,
            workDeposit: 0.00,
            status: 'active',
            currentLevel: JobLevel.INTERN,
            phoneNumber: userDocId
          }, { merge: true });
        }
      }).catch((docErr) => {
        console.warn("User document default init issue (ignored):", docErr);
      });

      unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Cache latest state in localStorage
          try {
            const profilesStr = localStorage.getItem('earnova_local_profiles');
            const profiles = profilesStr ? JSON.parse(profilesStr) : {};
            profiles[userDocId] = {
              ...(profiles[userDocId] || {}),
              ...data,
              phoneNumber: data.phoneNumber || userDocId
            };
            localStorage.setItem('earnova_local_profiles', JSON.stringify(profiles));
          } catch (e) {
            console.warn("Error caching user profile states:", e);
          }

          setUserProfile({
            phoneNumber: data.phoneNumber || userDocId,
            fullName: data.fullName || '',
            email: data.email || '',
            avatarUrl: data.avatarUrl || '',
            avatarSeed: data.avatarSeed || '',
            createdAt: data.createdAt || ''
          });
          if (data.personal !== undefined || data.income !== undefined || data.workDeposit !== undefined) {
            setBalance({
              personal: data.personal || 0,
              income: data.income || 0,
              workDeposit: data.workDeposit || 0,
              recommended: data.recommended || 0,
              teamTasks: data.teamTasks || 0
            });
          }
          if (data.currentLevel) {
            setCurrentJobLevel(data.currentLevel as JobLevel);
          }
          if (data.investments) {
            setInvestments(data.investments);
          }
          if (data.status) {
            setUserStatus(data.status);
          }
          if (data.signedContracts) {
            setSignedContracts(data.signedContracts);
          } else {
            setSignedContracts([]);
          }
          const todayString = new Date().toDateString();
          if (data.lastTaskClaimDate === todayString) {
            setTasksClaimedToday(data.tasksClaimedToday || 0);
          } else {
            setTasksClaimedToday(0);
          }
        } else {
          setUserProfile({
            phoneNumber: userDocId,
            fullName: '',
            email: ''
          });
        }
      }, (err) => {
        console.warn("User state snapshot hook warning (handled):", err);
      });
    } else {
      setUserProfile(null);
      setBalance({ income: 0.00, personal: 0.00, workDeposit: 0.00 });
      setCurrentJobLevel(JobLevel.INTERN);
      setSignedContracts([]);
      setUserStatus('active');
    }

    return () => {
      if (unsubUser) {
        unsubUser();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    // Initialize WebApp
    WebApp.ready();
    WebApp.expand();
    
    // Set colors statically to preserve Earnova Brand theme and ignore dynamic Telegram themes
    try {
      WebApp.setHeaderColor('#ffffff');
      WebApp.setBackgroundColor('#f9fafb');
    } catch (err) {
      console.error("Error setting Telegram webapp header colors:", err);
    }
    
    // Handle back button visibility & logic
    const isAnyModalOpen = showWithdrawModal || showRechargeModal || showSupportModal;
    
    const handleBack = () => {
      if (showWithdrawModal) setShowWithdrawModal(false);
      else if (showRechargeModal) {
        setShowRechargeModal(false);
        setPrefillAmount(undefined);
      }
      else if (showSupportModal) setShowSupportModal(false);
      else setActivePage('HOME');
    };

    if (activePage === 'HOME' && !isAnyModalOpen) {
      WebApp.BackButton.hide();
    } else {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(handleBack);
      return () => {
        WebApp.BackButton.offClick(handleBack);
      };
    }
  }, [activePage, showWithdrawModal, showRechargeModal, showSupportModal]);

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[currentLang][key] || TRANSLATIONS['EN'][key] || key;

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    if (type === 'success') WebApp.HapticFeedback.notificationOccurred('success');
    if (type === 'error') WebApp.HapticFeedback.notificationOccurred('error');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (action: string) => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (action === 'Tutorial' || action === 'Take Onboarding Tour' || action === 'Onboarding tour' || action === 'Onboarding Tour') {
      setShowOnboarding(true);
      return;
    }
    if (action === 'RECHARGE') {
      setPrefillAmount(undefined);
      setShowRechargeModal(true);
      return;
    }
    if (action === 'WITHDRAW') {
      setShowWithdrawModal(true);
      return;
    }
    if (action === 'TEAM') {
      setShowTeamModal(true);
      return;
    }
    if (action === 'INVITATION' || action === 'INVITE' || action === 'Share EARNOVA') {
      setShowInviteModal(true);
      return;
    }
    if (action === 'Withdrawal History' || action === 'Financial record' || action === 'Financial Record' || action === t('financial_record')) {
      setShowFinancialRecordModal(true);
      return;
    }
    if (action === 'Personal information') {
      setShowPersonalInfoModal(true);
      return;
    }
    if (action === 'About us') {
      setShowAboutUsModal(true);
      return;
    }
    if (action === 'Recharge History' || action === 'Daily statement') {
      setShowRechargeHistoryModal(true);
      return;
    }
    if (action === 'Profile') {
      setActivePage('PROFILE');
      return;
    }
    if (action === 'SUPPORT_CENTER' || action === 'TELEGRAM' || action === 'Support' || action === 'About us' || action === 'Help' || action === t('support_center') || action === 'Support Messages') {
      setShowSupportModal(true);
      return;
    }
    if (action === 'Settings' || action === 'Account Settings') {
      setShowAccountSettingsModal({ isOpen: true });
      return;
    }
    if (action === 'Change Password') {
      setShowAccountSettingsModal({ isOpen: true, initialView: 'PASSWORD' });
      return;
    }
    if (action === 'Update Email') {
      setShowAccountSettingsModal({ isOpen: true, initialView: 'EMAIL' });
      return;
    }
    if (action === 'Update Phone') {
      setShowAccountSettingsModal({ isOpen: true, initialView: 'PHONE' });
      return;
    }
    if (action === 'Logout') {
      logoutUser();
      localStorage.removeItem('earnova_logged_in_phone');
      localStorage.removeItem('admin_console_activated');
      localStorage.removeItem('earnova_signed_contracts');
      setSignedContracts([]);
      auth.signOut();
      setCurrentUser(null);
      setUserStatus('active');
      setBalance({ income: 0.00, personal: 0.00, workDeposit: 0.00, recommended: 0.00, teamTasks: 0.00 });
      setCurrentJobLevel(JobLevel.INTERN);
      setActivePage('HOME' as Page);
      WebApp.HapticFeedback.notificationOccurred('success');
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return;
    }
    showNotification(`Action: ${action} processed successfully!`);
  };

  const handleWithdraw = async (amount: number, wallet: 'INCOME' | 'PERSONAL', details: any, keepOpen?: boolean) => {
    if (currentJobLevel === JobLevel.INTERN || currentJobLevel.toUpperCase() === 'INTERN') {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert("you are not allowed to withdrew Please contact the customer service");
      return;
    }

    // 1. Local storage safeguard check
    const todayString = new Date().toDateString();
    const localLastWithdraw = localStorage.getItem('earnova_last_withdraw_date');
    if (localLastWithdraw === todayString) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert("daily withdrew finished Please contact customer service");
      return;
    }

    // 2. Real-time Firestore database verification check
    if (getUserDocId()) {
      try {
        const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        
        const q = query(
          collection(db, 'withdrawals'), 
          where('userId', '==', getUserDocId()),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        const localToday = new Date();
        const localTodayStr = `${localToday.getFullYear()}-${localToday.getMonth() + 1}-${localToday.getDate()}`;
        
        let hasWithdrawnToday = false;
        querySnapshot.forEach((docSnap) => {
          const wData = docSnap.data();
          if (wData.timestamp) {
            const wDate = wData.timestamp.toDate ? wData.timestamp.toDate() : new Date(wData.timestamp);
            if (wDate) {
              const wDateStr = `${wDate.getFullYear()}-${wDate.getMonth() + 1}-${wDate.getDate()}`;
              if (wDateStr === localTodayStr) {
                hasWithdrawnToday = true;
              }
            }
          }
        });

        if (hasWithdrawnToday) {
          localStorage.setItem('earnova_last_withdraw_date', todayString);
          WebApp.HapticFeedback.notificationOccurred('error');
          alert("daily withdrew finished Please contact customer service");
          return;
        }
      } catch (error) {
        console.error("Error checking daily withdrawal limit:", error);
      }
    }

    WebApp.HapticFeedback.notificationOccurred('success');
    
    // Save to Firestore if user is logged in
    if (getUserDocId()) {
      try {
        const { collection, addDoc, serverTimestamp, updateDoc, doc, increment } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        await addDoc(collection(db, 'withdrawals'), {
          amount,
          status: 'pending',
          timestamp: serverTimestamp(),
          userId: getUserDocId(),
          method: details.bankName || 'Unknown',
          wallet: wallet
        });

        // Deduct from Firestore User Document to keep database synchronized
        await updateDoc(doc(db, 'users', getUserDocId()), {
          [wallet.toLowerCase()]: increment(-amount)
        });

        // Record locally to prevent fast re-submissions
        localStorage.setItem('earnova_last_withdraw_date', todayString);
      } catch (error) {
        console.error("Error saving withdrawal:", error);
      }
    } else {
      localStorage.setItem('earnova_last_withdraw_date', todayString);
    }

    if (wallet === 'INCOME') {
      setBalance(prev => ({ ...prev, income: prev.income - amount }));
    } else {
      setBalance(prev => ({ ...prev, personal: prev.personal - amount }));
    }
    if (!keepOpen) {
      setShowWithdrawModal(false);
    }
    showNotification(`Withdrawal of ETB ${amount} from ${wallet} initiated!`, 'success');
  };

  const handleClaimOnboardingBonus = async () => {
    const isClaimedLocal = localStorage.getItem('earnova_onboarding_bonus_claimed');
    if (isClaimedLocal === 'true') {
      console.log('Onboarding tutorial bonus already claimed locally');
      return;
    }

    try {
      const { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', getUserDocId());
      const snap = await getDoc(userRef);
      
      let alreadyClaimed = false;
      if (snap.exists()) {
        const data = snap.data();
        if (data.onboardingClaimed) {
          alreadyClaimed = true;
        }
      }

      if (alreadyClaimed) {
        localStorage.setItem('earnova_onboarding_bonus_claimed', 'true');
        console.log('Onboarding tutorial bonus already claimed in Firestore');
        return;
      }

      // Add to local state
      setBalance(prev => ({ ...prev, personal: prev.personal + 100.00 }));

      // Add to Firestore
      await updateDoc(userRef, {
        personal: increment(100.00),
        onboardingClaimed: true
      });

      await addDoc(collection(db, 'bonuses'), {
        userId: getUserDocId(),
        amount: 100.00,
        type: 'onboarding',
        label: 'Welcome Onboarding Bonus',
        timestamp: serverTimestamp()
      });

      localStorage.setItem('earnova_onboarding_bonus_claimed', 'true');
      showNotification(
        currentLang === 'AM' 
          ? 'እንኳን ደስ አላችሁ! የ 100 ETB የጉብኝት ማጠናቀቂያ ቦነስ በግል ቦርሳዎ ውስጥ በስኬት ተቀምጧል።' 
          : 'Congratulations! Onboarding tutorial bonus of 100 ETB has been added to your Personal Wallet!', 
        'success'
      );
    } catch (err) {
      console.error("Error claiming onboarding tutorial bonus:", err);
      setBalance(prev => ({ ...prev, personal: prev.personal + 100.00 }));
      localStorage.setItem('earnova_onboarding_bonus_claimed', 'true');
    }
  };

  const handleRecharge = (amount: number) => {
    WebApp.HapticFeedback.notificationOccurred('success');
    // Balance update is now handled via admin approval later
    setShowRechargeModal(false);
    showNotification(`Recharge request of ETB ${amount} submitted for approval!`, 'success');
  };

  const handleJoinJob = (level: JobLevel, deposit: number) => {
    WebApp.HapticFeedback.impactOccurred('medium');
    
    // Prevent downgrades and joining current level
    const currentIdx = JOBS.findIndex(j => j.level === currentJobLevel);
    const targetIdx = JOBS.findIndex(j => j.level === level);

    if (targetIdx < currentIdx) {
      showNotification("You cannot downgrade your job level. Access is restricted to active or upgrade levels.", "error");
      return;
    }
    if (targetIdx === currentIdx) {
      if (!signedContracts.includes(level)) {
        setShowSigningModal({ level, deposit });
        return;
      }
      showNotification("This is already your active job level.", "info");
      return;
    }

    if (balance.personal < deposit) {
      showNotification(`Insufficient balance. Redirecting to recharge ${level}...`, 'info');
      setPrefillAmount(deposit.toString());
      setShowRechargeModal(true);
      return;
    }
    
    // Show signing modal instead of direct activation
    setShowSigningModal({ level, deposit });
  };

  const handleFinalSign = async () => {
    if (!showSigningModal) return;
    const { level, deposit } = showSigningModal;

    const getLevelSignupBonus = (lvl: JobLevel): number => {
      switch (lvl) {
        case JobLevel.JOB1: return 250;
        case JobLevel.JOB2: return 500;
        case JobLevel.JOB3: return 1000;
        case JobLevel.JOB4: return 1500;
        case JobLevel.JOB5: return 2000;
        case JobLevel.JOB6: return 2500;
        case JobLevel.JOB7: return 3000;
        case JobLevel.JOB8: return 3500;
        case JobLevel.JOB9: return 4000;
        case JobLevel.JOB10: return 4500;
        default: return 0;
      }
    };

    const levelBonus = getLevelSignupBonus(level);

    try {
      // Find the previous level's deposit to refund
      const prevJob = JOBS.find(j => j.level === currentJobLevel);
      const prevDeposit = prevJob ? prevJob.deposit : 0;

      // Deduct new deposit, refund previous deposit, and add signup bonus to income
      setBalance(prev => ({
        ...prev,
        personal: Math.max(0, prev.personal - deposit + prevDeposit),
        income: prev.income + levelBonus,
        workDeposit: Math.max(0, prev.workDeposit + deposit - prevDeposit)
      }));
      setCurrentJobLevel(level);

      // Add to signed contracts tracking
      setSignedContracts(prev => {
        if (prev.includes(level)) return prev;
        return [...prev, level];
      });

      // Update Firestore if logged in
      if (getUserDocId()) {
        const { updateDoc, doc, increment, arrayUnion, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', getUserDocId()), {
          personal: increment(-deposit + prevDeposit),
          income: increment(levelBonus),
          workDeposit: increment(deposit - prevDeposit),
          currentLevel: level,
          signedContracts: arrayUnion(level)
        });

        if (levelBonus > 0) {
          await addDoc(collection(db, 'bonuses'), {
            userId: getUserDocId(),
            amount: levelBonus,
            type: 'level_upgrade',
            label: `${level} Signing Bonus`,
            timestamp: serverTimestamp()
          });
        }
        
        // Award level upgrade commission to inviters (A, B, C)
        fetchAndAwardUpgradeCommission(getUserDocId(), level);
      }

      setShowSigningModal(null);
      if (levelBonus > 0) {
        showNotification(
          currentLang === 'AM'
            ? `በስኬት ተንቀሳቅሷል ${level}! የ ${levelBonus} ETB የደረጃ ጉርሻ በደስታ በገቢ ቦርሳዎ ውስጥ አግኝተዋል። የቀድሞ የተቀማጭ ገንዘብ ETB ${prevDeposit} ወደ የግል ቦርሳ ተመላሽ ተደርጓል።`
            : `Successfully activated ${level}! You received an instant signing bonus of ETB ${levelBonus} (added to your Income Wallet)! Previous deposit of ETB ${prevDeposit} returned to Personal Wallet.`,
          'success'
        );
      } else {
        showNotification(`Successfully activated ${level}! Previous deposit of ETB ${prevDeposit} returned to Personal Wallet.`, 'success');
      }
    } catch (e) {
      console.error("Signing error:", e);
      showNotification("Error completing activation", "error");
    }
  };

  const handleInvest = async (name: string, mAmount: number, wallet: 'PERSONAL' | 'INCOME' = 'PERSONAL') => {
    WebApp.HapticFeedback.impactOccurred('medium');
    const walletKey = wallet === 'PERSONAL' ? 'personal' : 'income';
    const currentBalance = balance[walletKey] || 0;
    if (currentBalance < mAmount) {
      showNotification(`Insufficient balance in ${wallet === 'PERSONAL' ? 'personal' : 'income'} wallet to invest!`, 'error');
      return;
    }

    try {
      const selectedFund = INVESTMENTS.find(inv => inv.name === name);
      const term = selectedFund?.term || 7;
      const dailyProfit = selectedFund?.dailyProfit || 1.5;

      const newInvest = {
        id: Math.random().toString(36).substring(7).toUpperCase(),
        name: name,
        amount: mAmount,
        dailyProfit: dailyProfit,
        term: term,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        fundedBy: wallet
      };

      const updatedInvestments = [...investments, newInvest];

      // Update Local state
      setInvestments(updatedInvestments);
      setBalance(prev => ({
        ...prev,
        [walletKey]: Math.max(0, (prev[walletKey] || 0) - mAmount)
      }));

      // Update Firestore
      if (getUserDocId()) {
        const { updateDoc, doc, increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', getUserDocId()), {
          [walletKey]: increment(-mAmount),
          investments: updatedInvestments
        });
      }

      showNotification(`Successfully invested ETB ${mAmount.toLocaleString()} in ${name} using ${wallet === 'PERSONAL' ? 'Personal' : 'Income'} wallet!`, 'success');
    } catch (e) {
      console.error(e);
      showNotification("Error completing investment", "error");
    }
  };

  const handleTaskAction = async (title: string, commission: number, taskId?: string) => {
    WebApp.HapticFeedback.notificationOccurred('success');
    showNotification(`${t('mission_claimed_msg')}! +ETB ${commission}`, 'success');
    const nextClaimedToday = tasksClaimedToday + 1;
    setBalance(prev => ({ ...prev, income: prev.income + commission }));
    setTasksClaimedToday(nextClaimedToday);

    const activeUserId = getUserDocId();
    if (activeUserId) {
      try {
        const { updateDoc, arrayUnion, increment, addDoc, serverTimestamp } = await import('firebase/firestore');
        const userRef = doc(db, 'users', activeUserId);
        
        const todayString = new Date().toDateString();
        const updatePayload: any = {
          income: increment(commission),
          lastTaskClaimDate: todayString,
          tasksClaimedToday: nextClaimedToday
        };
        
        if (taskId) {
          updatePayload.completedTaskIds = arrayUnion(taskId);
        }
        
        await updateDoc(userRef, updatePayload);

        // Record details in taskHistory collection
        await addDoc(collection(db, 'taskHistory'), {
          userId: activeUserId,
          taskTitle: title,
          commission: commission,
          timestamp: serverTimestamp()
        });

        // Award daily task commission to upline (A, B, C)
        fetchAndAwardTaskCommission(activeUserId, currentJobLevel, commission);
        
        // Also save to global local storage as a fallback
        if (taskId) {
          const localHistKey = `earnova_historical_claimed_${activeUserId}`;
          let savedHist: string[] = [];
          try {
            const savedHistStr = localStorage.getItem(localHistKey);
            if (savedHistStr) savedHist = JSON.parse(savedHistStr);
          } catch {}
          if (!savedHist.includes(taskId)) {
            localStorage.setItem(localHistKey, JSON.stringify([...savedHist, taskId]));
          }
        }
      } catch (err) {
        console.error("Error storing task progress to Firestore:", err);
      }
    }
  };

  const handleNavClick = (page: Page) => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (page === 'TASK') {
      const isSigned = signedContracts.includes(currentJobLevel);
      if (!isSigned) {
        showNotification(
          currentLang === 'AM'
            ? 'ተግባራትን ለመክፈት መጀመሪያ በዋናው ገጽ ላይ ያለውን የሥራ ስምምነት መፈረም አለብዎት!'
            : 'You must sign the employment agreement for your level on the Home screen to unlock daily tasks!',
          'info'
        );
        setActivePage('HOME');
        return;
      }
    }
    setActivePage(page);
    if (page === 'HOME') {
      triggerAd();
    }
  };

  const handleInstallApp = async () => {
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred('medium');
    }
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User choice outcome: ${outcome}`);
        setDeferredInstallPrompt(null);
      } catch (err) {
        console.warn('Error during native install prompt:', err);
        setShowInstallGuideModal(true);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'HOME':
        return <HomePage currentJobLevel={currentJobLevel} onJoinJob={handleJoinJob} handleAction={handleAction} t={t} signedContracts={signedContracts} currentLang={currentLang} />;
      case 'FUND':
        return <FundPage balance={balance} investments={investments} onInvest={handleInvest} handleAction={handleAction} t={t} />;
      case 'INCOME':
        return <IncomePage t={t} currentLang={currentLang} />;
      case 'TASK':
        return <TaskPage currentLevel={currentJobLevel} onTaskAction={handleTaskAction} tasksClaimedToday={tasksClaimedToday} currentUser={auth.currentUser} t={t} currentLang={currentLang} onShowHistory={() => setShowTaskHistoryModal(true)} />;
      case 'PROFILE':
        return (
          <ProfilePage 
            balance={balance} 
            currentJobLevel={currentJobLevel} 
            handleAction={handleAction} 
            t={t} 
            userPhone={userProfile?.phoneNumber || localStorage.getItem('earnova_logged_in_phone') || ''}
            fullName={userProfile?.fullName || 'Member'}
            onInstallApp={handleInstallApp}
            tasksClaimedToday={tasksClaimedToday}
            avatarSeed={userProfile?.avatarSeed || ''}
            createdAt={userProfile?.createdAt || ''}
            avatarUrl={userProfile?.avatarUrl || ''}
          />
        );
      default:
        return <HomePage currentJobLevel={currentJobLevel} onJoinJob={handleJoinJob} handleAction={handleAction} t={t} signedContracts={signedContracts} currentLang={currentLang} />;
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 select-none">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">CONNECTING TO SECURE VAULT...</p>
      </div>
    );
  }

  const isLocalStorageLoggedIn = !!localStorage.getItem('earnova_logged_in_phone');

  if (!currentUser || !isLocalStorageLoggedIn) {
    return (
      <LoginPage 
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
        onLoginSuccess={() => {
          // Trigger forced state refresh so the main screens are displayed immediately using local storage identity
          const activePhone = localStorage.getItem('earnova_logged_in_phone');
          setCurrentUser({ uid: activePhone, isAnonymous: true, isLocalPhoneUser: true });
        }}
      />
    );
  }

  if (userStatus === 'inactive') {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-screen bg-neutral-950 text-white select-none">
        {showSupportOnSuspended ? (
          <div className="fixed inset-0 z-50 bg-[#0A0F1E] text-white">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-500">Live Compliance Help</span>
                <button 
                  onClick={() => setShowSupportOnSuspended(false)}
                  className="p-2 hover:bg-white/5 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SupportCenter isOpen={showSupportOnSuspended} onClose={() => setShowSupportOnSuspended(false)} t={t} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-sm">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500 mb-6 animate-pulse">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white mb-2">Account Restricted</h2>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-4">COMPLIANCE REVIEW UNDERWAY</p>
            <p className="text-xs text-neutral-400 leading-relaxed mb-8">
              {currentLang === 'AM' 
                ? 'ይህ አካውንት በህግና ደንብ መጣስ ምክንያት ለጊዜው ታግዷል። እባክዎን ማብራሪያ ለማግኘት የደንበኞች አገልግሎትን ያነጋግሩ።' 
                : 'Your EarNova account has been temporarily locked or suspended due to a compliance verification review. Please contact support immediately to help restore access.'}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  setShowSupportOnSuspended(true);
                  WebApp.HapticFeedback.impactOccurred('medium');
                }}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all text-center font-bold"
              >
                Contact Support
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  auth.signOut();
                  setCurrentUser(null);
                  localStorage.removeItem('earnova_logged_in_phone');
                  localStorage.removeItem('earnova_signed_contracts');
                  setSignedContracts([]);
                  setUserStatus('active');
                  WebApp.HapticFeedback.impactOccurred('light');
                }}
                className="w-full py-4 bg-white/5 border border-white/10 text-neutral-400 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all text-center"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f9fafb] text-[#111827] font-sans overflow-hidden">
      <Header onAction={handleAction} currentLang={currentLang} setCurrentLang={setCurrentLang} t={t} />
      
      {/* Global Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            key="global-notification"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-20 left-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              notification.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400" : 
              notification.type === 'error' ? "bg-rose-500/90 text-white border-rose-400" :
              "bg-blue-600/90 text-white border-blue-400"
            )}
          >
            {notification.type === 'success' ? <CheckSquare size={20} /> : notification.type === 'error' ? <Bell size={20} /> : <MessageCircle size={20} />}
            <p className="text-xs font-black uppercase tracking-tight">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 overflow-y-auto relative select-none"
      >
        {/* Pull-to-refresh Visual Indicator */}
        <div 
          style={{ height: `${pullHeight}px` }} 
          className="overflow-hidden flex items-center justify-center bg-gray-50/80 border-b border-gray-200/30 transition-all duration-75 text-blue-600"
        >
          <div className="flex items-center gap-2">
            {refreshing ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            ) : (
              <RefreshCw 
                className="w-4 h-4 text-blue-600 transition-transform duration-75" 
                style={{ transform: `rotate(${pullHeight * 5}deg)` }}
              />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {refreshing ? 'Syncing App Data...' : pullHeight > 55 ? 'Release to Refresh' : 'Pull down to refresh'}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`page-container-${activePage}-${refreshKey}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav activePage={activePage} setActivePage={handleNavClick} t={t} />

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div key="withdraw-modal-wrapper" className="contents">
            <WithdrawModal 
              incomeBalance={balance.income}
              personalBalance={balance.personal} 
              onClose={() => setShowWithdrawModal(false)} 
              onWithdraw={handleWithdraw} 
              t={t}
              currentLang={currentLang}
              currentJobLevel={currentJobLevel}
              onContactSupport={() => {
                setShowWithdrawModal(false);
                setShowSupportModal(true);
              }}
            />
          </motion.div>
        )}
        {showRechargeModal && (
          <motion.div key="recharge-modal-wrapper" className="contents">
            <RechargeModal 
              onClose={() => {
                setShowRechargeModal(false);
                setPrefillAmount(undefined);
              }} 
              onRecharge={handleRecharge} 
              initialAmount={prefillAmount}
              t={t}
            />
          </motion.div>
        )}
        {showSupportModal && (
          <motion.div key="support-modal-wrapper" className="contents">
            <SupportCenter 
              isOpen={showSupportModal} 
              onClose={() => setShowSupportModal(false)}
              t={t}
            />
          </motion.div>
        )}
        {showTeamModal && (
          <motion.div key="team-modal-wrapper" className="contents">
            <TeamModal 
              onClose={() => setShowTeamModal(false)}
              onInvite={() => setShowInviteModal(true)}
              t={t}
            />
          </motion.div>
        )}
        {showInviteModal && (
          <motion.div key="invite-modal-wrapper" className="contents">
            <InviteModal 
              onClose={() => setShowInviteModal(false)}
              t={t}
              userPhone={currentUser?.uid}
            />
          </motion.div>
        )}
        {showAccountSettingsModal.isOpen && (
          <motion.div key="account-settings-modal-wrapper" className="contents">
            <AccountSettingsModal 
              onClose={() => setShowAccountSettingsModal({ isOpen: false })}
              t={t}
              initialView={showAccountSettingsModal.initialView}
            />
          </motion.div>
        )}
        {showWithdrawHistoryModal && (
          <motion.div key="withdraw-history-modal-wrapper" className="contents">
            <WithdrawalHistoryModal 
              isOpen={showWithdrawHistoryModal}
              onClose={() => setShowWithdrawHistoryModal(false)}
              t={t}
            />
          </motion.div>
        )}
        {showRechargeHistoryModal && (
          <motion.div key="recharge-history-modal-wrapper" className="contents">
            <RechargeHistoryModal 
              isOpen={showRechargeHistoryModal}
              onClose={() => setShowRechargeHistoryModal(false)}
              t={t}
            />
          </motion.div>
        )}
        {showTaskHistoryModal && (
          <motion.div key="task-history-modal-wrapper" className="contents">
            <TaskHistoryModal 
              isOpen={showTaskHistoryModal}
              onClose={() => setShowTaskHistoryModal(false)}
              t={t}
            />
          </motion.div>
        )}
        {showFinancialRecordModal && (
          <motion.div key="financial-record-modal-wrapper" className="contents">
            <FinancialRecordModal 
              isOpen={showFinancialRecordModal}
              onClose={() => setShowFinancialRecordModal(false)}
              balance={balance}
              currentJobLevel={currentJobLevel}
              t={t}
            />
          </motion.div>
        )}
        {showPersonalInfoModal && (
          <motion.div key="personal-info-modal-wrapper" className="contents">
            <PersonalInfoModal 
              isOpen={showPersonalInfoModal}
              onClose={() => setShowPersonalInfoModal(false)}
              userPhone={userProfile?.phoneNumber || localStorage.getItem('earnova_logged_in_phone') || ''}
              fullName={userProfile?.fullName || 'Member'}
              email={userProfile?.email || 'member@earnova.com'}
            />
          </motion.div>
        )}
        {showAboutUsModal && (
          <motion.div key="about-us-modal-wrapper" className="contents">
            <AboutUsModal 
              isOpen={showAboutUsModal}
              onClose={() => setShowAboutUsModal(false)}
            />
          </motion.div>
        )}
        {showSigningModal && (
          <motion.div key="signing-modal-wrapper" className="contents">
            <SigningModal 
              level={showSigningModal.level}
              deposit={showSigningModal.deposit}
              onClose={() => setShowSigningModal(null)}
              onSign={handleFinalSign}
              t={t}
            />
          </motion.div>
        )}
        
        {/* EARNOVA High-Fidelity Installer Guidance Overlay */}
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-[100005] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-[#0E1322] border border-blue-500/20 rounded-[32px] p-6 overflow-hidden text-center space-y-5 shadow-2xl"
            >
              {/* Accent header design */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-indigo-600" />
              
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">Secure Web App</span>
                <button 
                  onClick={() => setShowInstallGuideModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
                  <span className="text-2xl font-black text-white italic">E</span>
                </div>
                <h3 className="text-lg font-black italic text-white uppercase tracking-tight pt-1 leading-none">DOWNLOAD EARNOVA APP</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Install to your device for instant launch and premium access</p>
              </div>

              {/* Responsive custom instruction bento layout */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-4">
                {/* Safari iOS Instructions Tab */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-500 text-[#090D1A] rounded-full flex items-center justify-center text-[10px] font-black font-sans shadow">1</span>
                    <p className="text-[10px] font-black text-gray-200 uppercase tracking-wider">Apple / iOS (Safari Browser)</p>
                  </div>
                  <div className="pl-7 space-y-1 text-[9.5px] text-gray-400 font-bold leading-normal">
                    <p className="flex items-start gap-1">
                      <span className="text-amber-400">●</span> 
                      <span>Tap the <span className="text-amber-405 font-black text-white">Share button</span> (square with upward arrow) in Safari bottom navigation.</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-amber-400">●</span> 
                      <span>Scroll the sharing options list and select <span className="text-amber-405 font-black text-white">"Add to Home Screen"</span>.</span>
                    </p>
                  </div>
                </div>

                {/* Android / Chrome Instructions Tab */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black font-sans shadow">2</span>
                    <p className="text-[10px] font-black text-gray-200 uppercase tracking-wider">Android / Chrome Browser</p>
                  </div>
                  <div className="pl-7 space-y-1 text-[9.5px] text-gray-400 font-bold leading-normal">
                    <p className="flex items-start gap-1">
                      <span className="text-blue-400">●</span> 
                      <span>Tap the menu <span className="text-white font-black">(three vertical dots)</span> in Chrome's top right header.</span>
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-blue-400">●</span> 
                      <span>Tap <span className="text-white font-black">"Add to Home Screen"</span> or <span className="text-white font-black">"Install App"</span> and confirm.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button 
                  onClick={() => setShowInstallGuideModal(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Confirm & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showOnboarding && (
          <OnboardingTutorial 
            currentLang={currentLang}
            onClose={() => setShowOnboarding(false)}
            onPageChange={(p) => setActivePage(p as Page)}
            activePage={activePage}
            onClaimBonus={handleClaimOnboardingBonus}
          />
        )}

        {showAdPopup && activeAd && (
          <motion.div 
            key="ad-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-gradient-to-tr from-[#050814]/98 via-[#0A0F24]/96 to-[#050814]/98 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="relative w-full max-w-[330px] bg-[#0E1322] border border-amber-500/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col mx-auto"
            >
              {/* Decorative Brand Top Bar Accent */}
              <div className="h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-indigo-600 w-full" />

              {/* Close Countdown Header */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button 
                  onClick={() => {
                    playNextAd();
                    if (WebApp?.HapticFeedback) {
                      WebApp.HapticFeedback.impactOccurred('light');
                    }
                  }}
                  className="bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/25 flex items-center gap-1.5 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-gray-300">Skip</span>
                  <span className="bg-gradient-to-r from-amber-500 to-amber-400 text-[#0A0F1E] text-[9.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black shadow-inner">
                    {adCountdown}s
                  </span>
                </button>
              </div>

              {/* Banner Area */}
              <div className="relative aspect-[3/4] w-full bg-gradient-to-b from-[#0F1322] to-[#070A13] flex items-center justify-center overflow-hidden p-3">
                <div className="absolute inset-0 bg-radial-gradient from-blue-600/10 to-transparent opacity-50 pointer-events-none" />
                <img 
                  src={activeAd.imageUrl} 
                  alt="Advertisement Banner" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain select-none pointer-events-none rounded-2xl border border-white/5 shadow-inner"
                />
                
                {/* Subtle base gradient */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0E1322] to-transparent pointer-events-none" />
              </div>

              {/* Action and Close controls */}
              <div className="p-5 bg-gradient-to-b from-[#0E1322] to-[#0A0F1E] space-y-4 text-center">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] leading-none">Official Sponsor</span>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight italic">Ecosystem Partner Promotion</h4>
                </div>

                <div className="pt-1">
                  <button 
                    onClick={() => {
                      playNextAd();
                      if (WebApp?.HapticFeedback) {
                        WebApp.HapticFeedback.impactOccurred('light');
                      }
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-[20px] text-[9.5px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Header({ onAction, currentLang, setCurrentLang, t }: { onAction: (a: string) => void, currentLang: Language, setCurrentLang: (l: Language) => void, t: any }) {
  const [showLangs, setShowLangs] = useState(false);
  const langs: { id: Language; label: string }[] = [
    { id: 'EN', label: 'English' },
    { id: 'AM', label: 'አማርኛ' },
    { id: 'OR', label: 'Afaan Oromoo' },
    { id: 'SO', label: 'Af-Soomaali' },
  ];

  return (
    <header className="flex-shrink-0 z-[60] bg-white px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          E
        </div>
        <span className="text-blue-600 font-black italic text-2xl tracking-tighter">EARNOVA</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <button 
          onClick={() => onAction('Tutorial')} 
          className="p-2 bg-amber-50 rounded-full text-amber-500 hover:bg-amber-100 active:scale-90 transition-transform border border-amber-100 flex items-center justify-center relative group"
          title="Onboarding Tour"
        >
          <HelpCircle size={20} className="stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
        </button>
        <button onClick={() => onAction('Profile')} className="p-2 bg-blue-50 rounded-full text-blue-600 active:scale-90 transition-transform">
          <User size={20} />
        </button>
        <button 
          onClick={() => setShowLangs(!showLangs)} 
          className="flex items-center gap-1 text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full text-sm active:scale-95 transition-transform"
        >
          <Globe size={16} />
          {langs.find(l => l.id === currentLang)?.label.split(' ')[0]}
        </button>

        <AnimatePresence>
          {showLangs && (
            <motion.div key="lang-selector-group">
              <motion.div 
                key="lang-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLangs(false)}
                className="fixed inset-0 z-[-1]" 
              />
              <motion.div 
                key="lang-dropdown"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[140px] z-[70]"
              >
                {langs.map((l) => (
                  <button
                    key={`lang-item-${l.id}`}
                    onClick={() => {
                      setCurrentLang(l.id);
                      setShowLangs(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-colors",
                      currentLang === l.id ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-gray-700"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function BottomNav({ activePage, setActivePage, t }: { activePage: Page, setActivePage: (p: Page) => void, t: any }) {
  const navItems: { id: Page; label: string; icon: typeof HomeIcon }[] = [
    { id: 'HOME', label: t('nav_home'), icon: HomeIcon },
    { id: 'FUND', label: t('nav_fund'), icon: Wallet },
    { id: 'INCOME', label: t('nav_income'), icon: TrendingUp },
    { id: 'TASK', label: t('nav_mission'), icon: CheckSquare },
    { id: 'PROFILE', label: t('nav_profile'), icon: User },
  ];

  return (
    <nav className="flex-shrink-0 bg-white border-t border-gray-100 flex items-center justify-around pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] px-1 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={`nav-${item.id}`}
            id={`nav-${item.id}`}
            onClick={() => setActivePage(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-16 transition-colors duration-200",
              isActive ? "text-blue-600" : "text-gray-400"
            )}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function BannerCarousel({ t }: { t: any }) {
  const slogans = [
    { 
      text: t('home_slogan1'), 
      image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1000&auto=format&fit=crop"
    },
    { 
      text: t('home_slogan2'), 
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
    },
    { 
      text: t('home_slogan3'), 
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000&auto=format&fit=crop"
    },
    { 
      text: t('home_slogan4'), 
      image: "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=1000&auto=format&fit=crop"
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slogans.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slogans.length]);

  return (
    <div className="relative h-48 rounded-3xl overflow-hidden mt-2 shadow-2xl shadow-blue-100/50 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={`banner-slide-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {/* Background Image with slow zoom */}
          <motion.div 
            initial={{ scale: 1.15 }}
            animate={{ scale: 1.05 }}
            transition={{ duration: 6, ease: "linear" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slogans[currentIndex].image})` }}
          />
          
          {/* Unified Premium Dark Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Animated Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                x: [0, 50, -20],
                y: [0, -30, 40],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[80px]"
            />
            <motion.div
              animate={{
                x: [0, -40, 30],
                y: [0, 50, -20],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -bottom-20 -left-10 w-56 h-56 bg-indigo-500/10 rounded-full blur-[100px]"
            />
          </div>

          <div className="relative z-10 h-full p-8 flex flex-col justify-end pb-10">
            <motion.div 
              key={`banner-text-content-${currentIndex}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="h-[1px] w-4 bg-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{t('official_partner')}</span>
              </div>
              <h1 className="text-xl font-black text-white leading-tight uppercase tracking-tight">
                {slogans[currentIndex].text.split(' – ')[0]}
              </h1>
              <p className="text-white/80 text-sm font-medium italic tracking-wide">
                {slogans[currentIndex].text.split(' – ')[1]}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Premium Indicators */}
      <div className="absolute bottom-6 right-8 flex gap-2 z-20">
        {slogans.map((_, i) => (
          <div 
            key={`slogan-dot-${i}`} 
            className={cn(
              "h-[2px] transition-all duration-700 rounded-full",
              i === currentIndex ? "w-8 bg-blue-500" : "w-2 bg-white/20"
            )} 
          />
        ))}
      </div>
    </div>
  );
}

function HomePage({ currentJobLevel, onJoinJob, handleAction, t, signedContracts = [], currentLang }: { currentJobLevel: JobLevel, onJoinJob: (l: JobLevel, d: number) => void, handleAction: (a: string) => void, t: any, signedContracts?: string[], currentLang: string }) {
  return (
    <div className="px-4 space-y-6 pt-4 pb-8">
      <BannerCarousel t={t} />

      {/* Alert */}
      <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-3 border border-blue-100 cursor-pointer" onClick={() => handleAction('Announcement')}>
        <div className="text-blue-600">
          <Bell size={20} />
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <p className="text-blue-900 text-xs font-medium animate-marquee">
            {t('alert_msg')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 px-1">
        {[
          { label: 'RECHARGE', icon: ArrowUpCircle, color: 'bg-blue-500', tKey: 'btn_recharge' },
          { label: 'WITHDRAW', icon: ArrowDownCircle, color: 'bg-indigo-500', tKey: 'btn_withdraw' },
          { label: 'TEAM', icon: Users, color: 'bg-emerald-500', tKey: 'income_team_size' },
          { label: 'TELEGRAM', icon: MessageCircle, color: 'bg-sky-500', tKey: 'support_center' },
        ].map((action, idx) => (
          <button key={`quick-action-${action.label}-${idx}`} onClick={() => handleAction(action.label)} className="flex flex-col items-center gap-1.5 group">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transform transition-transform group-active:scale-95", action.color)}>
              <action.icon size={20} />
            </div>
            <span className="text-[9px] font-black text-gray-700 tracking-tight text-center leading-none uppercase">{action.tKey ? t(action.tKey as any) : action.label}</span>
          </button>
        ))}
      </div>

      {/* Job Levels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 uppercase">{t('profile_level')}</h2>
          <button onClick={() => handleAction('View All Jobs')} className="text-blue-600 font-bold text-xs">{t('nav_income')}</button>
        </div>
        
        <div className="space-y-3">
          {JOBS.map((job) => {
            const jobIndex = JOBS.findIndex(j => j.level === job.level);
            const currentIndex = JOBS.findIndex(j => j.level === currentJobLevel);
            const isPrevious = jobIndex < currentIndex;

            return (
              <div 
                key={`home-job-${job.id}`} 
                className={cn(
                  "rounded-2xl p-3 relative overflow-hidden shadow-sm border border-black/5 transition-all duration-300", 
                  isPrevious 
                    ? "bg-gray-100/80 border-gray-200 opacity-60 saturate-[0.1]" 
                    : job.bgColor
                )}
              >
                <div className="relative z-10 flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className={cn(
                      "text-2xl font-black italic uppercase tracking-tighter leading-none animate-pulse-subtle", 
                      isPrevious ? "text-gray-400" : job.color
                    )}>
                      {job.level}
                    </h3>
                    <div className="space-y-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                      <p>{t('balance_work')}: <span className={isPrevious ? "text-gray-400 font-medium" : "text-gray-900"}>ETB {job.deposit}</span></p>
                      <p>{t('daily_tasks')}: <span className={isPrevious ? "text-gray-400 font-medium" : "text-gray-900"}>{job.dailyTasks}</span></p>
                      <p>{t('each_order')}: <span className={isPrevious ? "text-gray-400 font-medium" : "text-gray-900"}>ETB {job.eachOrder}</span></p>
                    </div>
                    {isPrevious ? (
                      <button 
                        disabled 
                        className="mt-1 bg-gray-200 text-gray-400 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider cursor-not-allowed border border-gray-300/50"
                      >
                        {t('btn_inaccessible_unused')}
                      </button>
                    ) : (signedContracts.includes(job.level)) ? (
                      <button 
                        onClick={() => handleAction(`View Job ${job.level}`)} 
                        className="mt-1 bg-emerald-500 text-white px-6 py-2 rounded-xl font-black text-xs active:scale-95 transition-transform shadow-lg shadow-emerald-100 animate-pulse-subtle"
                      >
                        {t('btn_signed')}
                      </button>
                    ) : (
                      <button 
                        onClick={() => onJoinJob(job.level, job.deposit)} 
                        className={cn(
                          "mt-1 px-6 py-2 rounded-xl font-black text-xs active:scale-95 transition-transform text-white",
                          job.level === JobLevel.INTERN 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-orange-100 ml-1" 
                            : job.deposit > 0 
                              ? "bg-gray-900" 
                              : "bg-blue-600"
                        )}
                      >
                        {job.level === JobLevel.INTERN 
                          ? (currentLang === 'AM' ? 'የሙከራ ደረጃ ቀላቀል ✍️' : 'Join Intern Level ✍️') 
                          : t('btn_claim')}
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="w-14 h-14 bg-black/5 rounded-2xl rotate-45 flex items-center justify-center transform translate-x-4 -translate-y-4">
                      <span className="text-3xl font-black -rotate-45 text-black/10 tracking-tighter">
                        {job.id}
                      </span>
                    </div>
                    {!isPrevious && (
                      <div className="absolute -bottom-1 right-2 w-3 h-3 bg-emerald-400 rotate-45 border-2 border-white shadow-sm" />
                    )}
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="pb-8" />
    </div>
  );
}

function FundPage({ balance, investments = [], onInvest, handleAction, t }: { balance: { personal: number, income: number, workDeposit: number, recommended?: number, teamTasks?: number }, investments: any[], onInvest: (n: string, m: number, w: 'PERSONAL' | 'INCOME') => void, handleAction: (a: string) => void, t: any }) {
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<any | null>(null);
  const [investAmount, setInvestAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<'PERSONAL' | 'INCOME'>('PERSONAL');

  const selectedAmt = parseFloat(investAmount) || 0;
  const currentWalletBalance = selectedWallet === 'PERSONAL' ? balance.personal : (balance.income || 0);
  const isSufficient = showConfirmModal ? currentWalletBalance >= selectedAmt : false;
  const isMinMet = showConfirmModal ? selectedAmt >= showConfirmModal.minDeposit : false;
  const dailyIncome = showConfirmModal ? selectedAmt * (showConfirmModal.dailyProfit / 100) : 0;
  const cycleIncome = showConfirmModal ? dailyIncome * showConfirmModal.term : 0;
  const totalPayout = selectedAmt + cycleIncome;

  const totalActiveFundBalance = investments
    .filter(inv => inv.status !== 'closed')
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

  const userClosedRecords = investments.filter(inv => inv.status === 'closed');
  const allClosedRecords = userClosedRecords;

  const handleOpenInvest = (inv: any) => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setShowConfirmModal(inv);
    setInvestAmount(inv.minDeposit.toString());
    setSelectedWallet('PERSONAL');
  };

  const handleConfirmInvestment = (e: any) => {
    e.preventDefault();
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < showConfirmModal.minDeposit) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(`Minimum deposit is ETB ${showConfirmModal.minDeposit}`);
      return;
    }
    const currentBalanceVal = selectedWallet === 'PERSONAL' ? balance.personal : (balance.income || 0);
    if (currentBalanceVal < amount) {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(`Insufficient balance in ${selectedWallet === 'PERSONAL' ? 'Personal' : 'Income'} Wallet.`);
      return;
    }

    onInvest(showConfirmModal.name, amount, selectedWallet);
    setShowConfirmModal(null);
  };

  return (
    <div className="px-4 space-y-4 pt-4 pb-8 select-none">
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-2xl font-black italic text-blue-600 tracking-tighter uppercase">{t('fund_title')}</h1>
        <button 
          onClick={() => {
            WebApp.HapticFeedback.impactOccurred('medium');
            setShowClosedModal(true);
          }} 
          className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
          title="Investment Record History"
        >
          <BookOpen size={18} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">{t('financial_record')}</span>
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">{t('balance_total')} (ETB)</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight italic">
              ETB {totalActiveFundBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[9px] text-blue-200/80 font-bold uppercase tracking-wider">
            Active Investment Capital
          </p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('fund_active_investments')}</h2>
          <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
            {t('real_time')}
          </span>
        </div>

        {/* Dynamic Display of User's Real Active Investments */}
        {investments.filter(inv => inv.status !== 'closed').length === 0 ? (
          <div className="bg-white/50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fund_no_investments')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {investments.filter(inv => inv.status !== 'closed').map((inv) => {
              const expectedIncome = inv.amount * (inv.dailyProfit / 100) * inv.term;
              return (
                <div key={inv.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                        ACTIVE ID: {inv.id}
                      </span>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight mt-1">{inv.name}</h4>
                    </div>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                      +{inv.dailyProfit}% DAILY
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Invested</p>
                      <p className="text-xs font-black text-slate-800">ETB {Number(inv.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Term</p>
                      <p className="text-xs font-black text-slate-800">{inv.term} Days</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Est. Return</p>
                      <p className="text-xs font-black text-emerald-600">+ETB {expectedIncome.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50/50 rounded-bl-3xl flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Wealth Fund Title Selector */}
        <div className="pt-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('fund_title')} products</h2>
        </div>

        {/* Available Investments */}
        <div className="space-y-3">
          {INVESTMENTS.map((inv) => (
            <div key={`fund-inv-${inv.id}`} className={cn("rounded-2xl p-4 text-white shadow-xl relative overflow-hidden", inv.color)}>
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter leading-tight">
                    {t('nav_fund')} {inv.id}
                  </h3>
                  <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit leading-none">
                    {inv.term} {t('investment_term')}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-blue-100 tracking-widest">{t('investment_min')}</p>
                    <p className="text-lg font-black italic leading-none">ETB {inv.minDeposit}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenInvest(inv)} 
                    className="bg-white text-gray-900 px-6 py-2.5 rounded-xl font-black text-xs uppercase active:scale-95 transition-all shadow-md hover:bg-slate-50"
                  >
                    {t('btn_invest')}
                  </button>
                </div>
                
                <div className="text-right space-y-0.5">
                  <p className="text-2xl font-black italic text-emerald-400">+{inv.dailyProfit}%</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-100 leading-none">{t('investment_profit')}</p>
                </div>
              </div>
              
              <div className="absolute top-1/2 right-0 w-24 h-32 bg-white/5 rounded-2xl -translate-y-1/2 translate-x-1/2 border border-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="pb-8" />

      {/* CLOSED FUND RECORDS MODAL */}
      <AnimatePresence>
        {showClosedModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs focus:outline-none" onClick={() => setShowClosedModal(false)}>
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-950 p-6 text-white relative">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Closed Records</h3>
                    <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mt-0.5">Mature & Settled Portfolios</p>
                  </div>
                  <button onClick={() => setShowClosedModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh] bg-slate-50/50">
                {allClosedRecords.map((rec) => {
                  const dailyReward = rec.amount * (rec.dailyProfit / 100);
                  const totalProfit = dailyReward * rec.term;
                  const maturityPayout = rec.amount + totalProfit;

                  return (
                    <div key={rec.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      {/* CLOSED STAMP */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 border-4 border-double border-red-500/85 text-red-500/85 font-black text-xs px-3.5 py-1.5 rounded uppercase tracking-widest -rotate-[15deg] bg-white/95 shadow-md select-none pointer-events-none z-20">
                        CLOSED
                      </div>

                      <div className="space-y-1.5 opacity-60">
                        <div className="flex justify-between">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID: {rec.id}</span>
                          <span className="text-[9px] font-black text-slate-400">{rec.closedDate}</span>
                        </div>
                        <h4 className="text-base font-black text-slate-800">{rec.name}</h4>
                        
                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 border-t border-slate-100 pt-2 text-[11px] font-bold text-slate-500">
                          <div>
                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Invested Capital</span>
                            <span className="text-slate-700 font-extrabold">ETB {rec.amount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Maturity Return</span>
                            <span className="text-emerald-600 font-extrabold">ETB {maturityPayout.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Daily Interest</span>
                            <span className="text-slate-700 font-extrabold">+{rec.dailyProfit}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Term Cycle</span>
                            <span className="text-slate-700 font-extrabold">{rec.term} Days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
                <button 
                  onClick={() => setShowClosedModal(false)}
                  className="w-full bg-slate-900 text-white font-black uppercase text-xs py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVESTMENT CONFIRM & CUSTOM INPUT MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs" onClick={() => setShowConfirmModal(null)}>
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative flex-shrink-0 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Setup Investment</h3>
                    <p className="text-[9px] font-black tracking-widest uppercase text-blue-200 mt-0.5">{showConfirmModal.name}</p>
                  </div>
                  <button onClick={() => setShowConfirmModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[52vh]">
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Funding Wallet</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Personal Wallet Option */}
                    <button
                      type="button"
                      onClick={() => {
                        WebApp.HapticFeedback.impactOccurred('light');
                        setSelectedWallet('PERSONAL');
                      }}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-[72px]",
                        selectedWallet === 'PERSONAL'
                          ? "bg-blue-500/5 border-blue-600 shadow-sm"
                          : "bg-white border-slate-100 opacity-70 hover:opacity-100 hover:border-slate-200"
                      )}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Personal</span>
                      <span className="text-sm font-black text-slate-800 leading-tight">ETB {balance.personal.toLocaleString()}</span>
                      {selectedWallet === 'PERSONAL' && (
                        <div className="absolute right-2.5 top-2.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      )}
                    </button>

                    {/* Income Wallet Option */}
                    <button
                      type="button"
                      onClick={() => {
                        WebApp.HapticFeedback.impactOccurred('light');
                        setSelectedWallet('INCOME');
                      }}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between h-[72px]",
                        selectedWallet === 'INCOME'
                          ? "bg-emerald-500/5 border-emerald-500 shadow-sm"
                          : "bg-white border-slate-100 opacity-70 hover:opacity-100 hover:border-slate-200"
                      )}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Income</span>
                      <span className="text-sm font-black text-slate-800 leading-tight">ETB {(balance.income || 0).toLocaleString()}</span>
                      {selectedWallet === 'INCOME' && (
                        <div className="absolute right-2.5 top-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Investment Amount (ETB)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      placeholder={`Min: ${showConfirmModal.minDeposit}`}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-base font-black text-slate-900 focus:border-blue-600 focus:outline-none transition-colors"
                      min={showConfirmModal.minDeposit}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">ETB</span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 block uppercase ml-1">
                    Minimum required: ETB {showConfirmModal.minDeposit.toLocaleString()}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-[11px] font-bold text-slate-500">
                  <div className="flex justify-between">
                    <span className="uppercase text-[8px] font-black text-gray-400 tracking-wider">Daily Interest</span>
                    <span className="text-slate-800 font-extrabold">+{showConfirmModal.dailyProfit}% ({t('real_time')})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[8px] font-black text-gray-400 tracking-wider">Term Cycle</span>
                    <span className="text-slate-800 font-extrabold">{showConfirmModal.term} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[8px] font-black text-gray-400 tracking-wider">Est. Daily Income</span>
                    <span className="text-emerald-600 font-extrabold">ETB {dailyIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[8px] font-black text-gray-400 tracking-wider">Total Est. Profit</span>
                    <span className="text-emerald-600 font-extrabold">ETB {cycleIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-xs">
                    <span className="uppercase text-[8.5px] font-black text-slate-600 tracking-wider">Payout on Maturity</span>
                    <span className="text-indigo-600">ETB {totalPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex gap-2.5 flex-shrink-0 pb-12 sm:pb-6">
                <button 
                  type="button" 
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-3.5 rounded-2xl font-black text-xs uppercase active:scale-[0.98] transition-all"
                >
                  Exit
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmInvestment}
                  disabled={!isSufficient || !isMinMet}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isSufficient ? "Insufficient Balance" : !isMinMet ? "Check Minimum Amount" : "Join & Invest"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IncomePage({ t, currentLang }: { t: any, currentLang: Language }) {
  const renderJobDesc = (job: any) => {
    if (job.level === JobLevel.INTERN) {
      return t('income_intern_desc');
    }
    return t('income_job_desc')
      .replace('{deposit}', job.deposit.toLocaleString())
      .replace('{tasks}', job.dailyTasks.toString())
      .replace('{each}', job.eachOrder.toString())
      .replace('{daily}', (job.dailyTasks * job.eachOrder).toLocaleString())
      .replace('{monthly}', (job.dailyTasks * job.eachOrder * 30).toLocaleString())
      .replace('{yearly}', (job.dailyTasks * job.eachOrder * 360).toLocaleString())
      .replace('{level}', job.level);
  };

  return (
    <div className="pb-12 p-4 space-y-8 bg-white min-h-full">
      {/* Header */}
      <div className="text-center space-y-2 px-4">
        <h1 className="text-5xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">{t('nav_income')}</h1>
        <p className="text-sm font-black text-blue-600 tracking-[0.2em] uppercase">{t('income_subtitle')}</p>
      </div>

      <div className="px-3 space-y-10">
        {/* Table of Level Income Rules */}
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl py-2 px-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('income_title')}</h2>
          </div>
          
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-center border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-400 text-white text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                  <th className="p-2 border border-slate-300">{t('profile_level')}</th>
                  <th className="p-2 border border-slate-300">{t('balance_work')}</th>
                  <th className="p-2 border border-slate-300">{t('daily_tasks')}</th>
                  <th className="p-2 border border-slate-300">{t('each_order')}</th>
                  <th className="p-2 border border-slate-300">{t('income_daily')}</th>
                  <th className="p-2 border border-slate-300">{t('income_30day')}</th>
                  <th className="p-2 border border-slate-300">{t('income_360day')}</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-black text-slate-700">
                {JOBS.map((job) => {
                  const daily = job.dailyTasks * job.eachOrder;
                  return (
                    <tr key={`income-job-row-${job.id}`} className="even:bg-slate-50 whitespace-nowrap">
                      <td className="p-2 border border-slate-200 uppercase">{job.level === JobLevel.INTERN ? t('job_intern') : job.level}</td>
                      <td className="p-2 border border-slate-200">{job.deposit.toLocaleString()}</td>
                      <td className="p-2 border border-slate-200">{job.dailyTasks}</td>
                      <td className="p-2 border border-slate-200">{job.eachOrder}</td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-900">{daily.toLocaleString()}</td>
                      <td className="p-2 border border-slate-200">{job.level === JobLevel.INTERN ? '-' : (daily * 30).toLocaleString()}</td>
                      <td className="p-2 border border-slate-200">{job.level === JobLevel.INTERN ? '-' : (daily * 360).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Level Descriptions */}
        <div className="space-y-4">
          {JOBS.map((job) => (
            <div key={`income-job-desc-${job.id}`} className="p-4 rounded-2xl border-2 border-blue-100 bg-white space-y-3 shadow-sm">
              <h3 className="text-lg font-black text-blue-600 uppercase text-center italic">{job.level === JobLevel.INTERN ? t('job_intern') : job.level}</h3>
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed text-center px-4">
                {renderJobDesc(job)}
              </p>
            </div>
          ))}
        </div>

        {/* Upgrade Level Rules */}
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl py-2 px-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('income_up_rules')}</h2>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-center border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-400 text-white text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                  <th className="p-2 border border-slate-300">{t('income_up_level')}</th>
                  <th className="p-2 border border-slate-300">{t('income_team_commission')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level1')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level2')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level3')}</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-black text-slate-700">
                {UP_LEVEL_RULES.map((rule) => (
                  <tr key={`up-level-rule-${rule.level}`} className="even:bg-slate-50 whitespace-nowrap">
                    <td className="p-2 border border-slate-200">{rule.level}</td>
                    <td className="p-2 border border-slate-200">{rule.ratio}</td>
                    <td className="p-2 border border-slate-200">{rule.level1.toLocaleString()}</td>
                    <td className="p-2 border border-slate-200">{rule.level2.toLocaleString()}</td>
                    <td className="p-2 border border-slate-200">{rule.level3.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upgrade Bonus Explanations */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white space-y-3 shadow-sm text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {t('income_bonus_desc')}
            </p>
          </div>
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white space-y-3 shadow-sm text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {t('income_bonus_desc2')}
            </p>
          </div>
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white space-y-3 shadow-sm text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {t('income_bonus_tips')}
            </p>
          </div>
        </div>

        {/* Table of Task Rules */}
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl py-2 px-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('income_task_rules')}</h2>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-center border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-400 text-white text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                  <th className="p-2 border border-slate-300">{t('profile_level')}</th>
                  <th className="p-2 border border-slate-300">{t('income_team_commission')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level1')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level2')}</th>
                  <th className="p-2 border border-slate-300">{t('income_level3')}</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-black text-slate-700">
                {TASK_RULES.map((rule) => (
                  <tr key={`task-rule-${rule.level}`} className="even:bg-slate-50 whitespace-nowrap">
                    <td className="p-2 border border-slate-200">{rule.level}</td>
                    <td className="p-2 border border-slate-200">{rule.ratio}</td>
                    <td className="p-2 border border-slate-200">{rule.level1.toLocaleString()}</td>
                    <td className="p-2 border border-slate-200">{rule.level2.toLocaleString()}</td>
                    <td className="p-2 border border-slate-200">{rule.level3.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Task Commission Explanations */}
        <div className="space-y-4">
          {[
            t('income_commission_a'),
            t('income_commission_b'),
            t('income_commission_c'),
            t('income_commission_note')
          ].map((text, idx) => (
            <div key={`task-comm-note-${idx}`} className="p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm text-center">
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Table of Position Rules */}
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl py-2 px-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('income_pos_rules')}</h2>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-center border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-400 text-white text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                  <th className="p-2 border border-slate-300 text-left">{t('income_pos_title')}</th>
                  <th className="p-2 border border-slate-300">{t('income_team_size')}</th>
                  <th className="p-2 border border-slate-300">{t('income_monthly_salary')}</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-black text-slate-700 whitespace-nowrap">
                {POSITION_RULES.map((rule) => {
                  const posKey = rule.position === 'Internship Assistant' ? 'pos_intern_assistant' :
                               rule.position === 'Official Assistant' ? 'pos_official_assistant' :
                               rule.position === 'Formal Supervisor' ? 'pos_formal_supervisor' :
                               rule.position === 'Marketing Manager' ? 'pos_marketing_manager' :
                               rule.position === 'Regional Manager' ? 'pos_regional_manager' :
                               rule.position === 'Marketing Director' ? 'pos_marketing_director' :
                               rule.position === 'Company Partner' ? 'pos_company_partner' : null;

                  const sizeKey = rule.teamSize === '15 direct reports' ? 'team_15_direct' :
                                rule.teamSize === '25 direct reports' ? 'team_25_direct' :
                                rule.teamSize === '25-150-person team' ? 'team_150_team' :
                                rule.teamSize === '25-500-person team' ? 'team_500_team' :
                                rule.teamSize === '25-1500-person team' ? 'team_1500_team' :
                                rule.teamSize === '25-3500-person team' ? 'team_3500_team' :
                                rule.teamSize === '25-7000-person team' ? 'team_7000_team' : null;

                  return (
                    <tr key={`pos-rule-row-${rule.position}`} className="even:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-left">{posKey ? t(posKey as any) : rule.position}</td>
                      <td className="p-2 border border-slate-200">{sizeKey ? t(sizeKey as any) : rule.teamSize}</td>
                      <td className="p-2 border border-slate-200 font-black text-slate-900">{rule.monthlySalary.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Position Descriptions */}
        <div className="space-y-4">
          {POSITION_RULES.map((rule) => {
            const posKey = rule.position === 'Internship Assistant' ? 'pos_intern_assistant' :
                         rule.position === 'Official Assistant' ? 'pos_official_assistant' :
                         rule.position === 'Formal Supervisor' ? 'pos_formal_supervisor' :
                         rule.position === 'Marketing Manager' ? 'pos_marketing_manager' :
                         rule.position === 'Regional Manager' ? 'pos_regional_manager' :
                         rule.position === 'Marketing Director' ? 'pos_marketing_director' :
                         rule.position === 'Company Partner' ? 'pos_company_partner' : null;
            const posName = posKey ? t(posKey as any) : rule.position;

            let desc = "";
            if (rule.position === 'Formal Supervisor') desc = t('income_pos_supervisor_desc');
            else if (rule.position === 'Marketing Manager') desc = t('income_pos_manager_desc');
            else if (rule.position === 'Regional Manager') desc = t('income_pos_regional_desc');
            else if (rule.position === 'Marketing Director') desc = t('income_pos_director_desc');
            else if (rule.position === 'Company Partner') desc = t('income_pos_partner_desc');
            else desc = t('income_pos_simple_desc').replace('{count}', rule.teamSize.split(' ')[0]);

            return (
              <div key={`pos-desc-card-${rule.position}`} className="p-4 rounded-2xl border-2 border-blue-100 bg-white space-y-3 shadow-sm text-center">
                <h3 className="text-lg font-black text-blue-600 uppercase italic">{posName}</h3>
                <p className="text-[11px] font-bold text-slate-700 italic">
                  {posName}, {desc}, {t('income_monthly_salary').toLowerCase()} {t('balance_work')} {rule.monthlySalary.toLocaleString()} ETB
                </p>
              </div>
            );
          })}
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {t('income_career_desc')}
            </p>
          </div>
        </div>

        {/* Fund Rules Explanation */}
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl py-2 px-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('income_fund_rules_title')}</h2>
          </div>

          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm text-center">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {t('income_fund_desc')}
            </p>
          </div>
          
          <div className="p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner shrink-0">
              <span className="text-3xl font-black text-blue-600">F1</span>
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('nav_fund')} 1</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="overflow-hidden">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{t('income_fund_cycle')}</p>
                  <p className="text-[10px] font-black text-slate-800">7{t('income_daily').replace(/[\s\S]*/, currentLang === 'EN' ? 'Day' : currentLang === 'AM' ? 'ቀን' : currentLang === 'OR' ? 'Guyyaa' : 'Maalmood')}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{t('investment_profit')}</p>
                  <p className="text-[10px] font-black text-slate-800">1.5%</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[8px] font-bold text-slate-400 uppercase whitespace-nowrap">{t('investment_min').substring(0, 8)}...</p>
                  <p className="text-[10px] font-black text-slate-800">1000</p>
                </div>
              </div>
            </div>
          </div>

          {[
            t('income_exclusive_benefits'),
            t('income_purchase_instructions'),
            t('income_fund_reminder'),
            t('income_return_example'),
          ].map((text, idx) => (
            <div key={`fund-info-note-${idx}`} className="p-4 rounded-2xl border-2 border-blue-100 bg-white shadow-sm text-center">
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          ))}
        </div>

        {/* Closing Welcome */}
        <div className="space-y-6 pt-4">
          <div className="p-6 rounded-3xl border-2 border-blue-100 bg-white shadow-lg space-y-4 text-center">
            <p className="text-lg font-black text-blue-600 leading-relaxed italic">
              {t('income_closing_welcome')}
            </p>
          </div>
          
          <div className="rounded-3xl overflow-hidden h-32 shadow-xl border border-gray-100">
            <img 
              src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&h=400&fit=crop" 
              alt="Welcome Gift" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
      <div className="pb-16" />
    </div>
  );
}

const DEFAULT_FALLBACK_VIDEO_TASKS = [
  {
    id: 'earnova-def-ad-01',
    title: 'Earnova Smart Investment Portfolio Allocation Strategy',
    url: 'https://www.youtube.com/watch?v=gT_PccP-Fq0',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-02',
    title: 'Understanding Compound Interest and Daily Accumulation',
    url: 'https://www.youtube.com/watch?v=pyG4f7627vU',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-03',
    title: 'Asset Allocation and Passive Income Guide',
    url: 'https://www.youtube.com/watch?v=SfPH7X7Vv1s',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-04',
    title: 'Global Financial Management & Mutual Funds Tutorial',
    url: 'https://www.youtube.com/watch?v=zR6zN6e4z_k',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-05',
    title: 'Building Long Term Wealth via High-Yield Streams',
    url: 'https://www.youtube.com/watch?v=Vz_91gM9eMo',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-06',
    title: 'Effective Money Saving and Smart Budgeting Mechanics',
    url: 'https://www.youtube.com/watch?v=pAnJitE72g4',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-07',
    title: 'Introduction to Blockchain & Decentralized Smart Ledgers',
    url: 'https://www.youtube.com/watch?v=yubzJw0uiE4',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  },
  {
    id: 'earnova-def-ad-08',
    title: 'The Blueprint for Personal Finance and Retirement Planning',
    url: 'https://www.youtube.com/watch?v=9vjN2gNsc6U',
    category: 'VIDEO WATCH',
    commission: 5.0,
    dbSource: true
  }
];

// Memory caches to eliminate repetitive Firestore reads during Mini-App navigation and tab switches
let globalTasksCache: any[] | null = null;
let globalTasksLastFetchedAt = 0;
const globalCompletedTaskIdsCache: Record<string, string[]> = {};
const globalCompletedLastFetchedAt: Record<string, number> = {};

function TaskPage({ currentLevel, onTaskAction, tasksClaimedToday, currentUser, t, currentLang = 'EN', onShowHistory }: { currentLevel: JobLevel, onTaskAction: (t: string, c: number, taskId?: string) => void, tasksClaimedToday: number, currentUser: any, t: any, currentLang?: string, onShowHistory: () => void }) {
  const job = JOBS.find(j => j.level === currentLevel) || JOBS[0];
  const taskCount = job.dailyTasks;
  const commission = job.eachOrder;
  const [timeLeft, setTimeLeft] = useState('');
  const [dbCompletedIds, setDbCompletedIds] = useState<string[]>([]);
  
  // Realtime Firestore tasks list
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  
  // Assigned tasks for today state
  const [assignedMissions, setAssignedMissions] = useState<any[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationProgress, setAllocationProgress] = useState(0);
  const [allocationStep, setAllocationStep] = useState('');

  // Rating Modal state
  const [activeWatchTask, setActiveWatchTask] = useState<any | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showCongrats, setShowCongrats] = useState<string | null>(null);
  const [watchTimer, setWatchTimer] = useState<number>(10);

  // 10 Second Video Countdown Timer
  useEffect(() => {
    if (activeWatchTask) {
      setWatchTimer(10);
      const interval = setInterval(() => {
        setWatchTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeWatchTask]);

  // Claimed task states (local memory)
  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const userId = getUserDocId();
  const assignStatusKey = `earnova_assigned_status_${userId}_${getTodayKey()}`;
  const assignContentKey = `earnova_assigned_content_${userId}_${getTodayKey()}`;
  const localClaimedKey = `earnova_claimed_tasks_${userId}_${getTodayKey()}`;

  const [claimedList, setClaimedList] = useState<string[]>(() => {
    const saved = localStorage.getItem(localClaimedKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Load database tasks from Firestore tasks collection (real-time snapshot listener)
  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      globalTasksCache = tasks;
      globalTasksLastFetchedAt = Date.now();
      setDbTasks(tasks);
    }, (err) => {
      console.warn("Realtime tasks snapshot listener failed (using cache):", err);
      if (globalTasksCache) {
        setDbTasks(globalTasksCache);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync historical claims from user profile in Firestore (real-time snapshot listener)
  useEffect(() => {
    const activeUserId = getUserDocId();
    if (!activeUserId) return;

    const userRef = doc(db, 'users', activeUserId);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.completedTaskIds) {
          setDbCompletedIds(data.completedTaskIds);
          globalCompletedTaskIdsCache[activeUserId] = data.completedTaskIds;
          globalCompletedLastFetchedAt[activeUserId] = Date.now();
          localStorage.setItem(`earnova_historical_claimed_${activeUserId}`, JSON.stringify(data.completedTaskIds));
        }
      }
    }, (err) => {
      console.warn("Realtime claims snapshot listener failed (using cache):", err);
      try {
        const savedClaims = localStorage.getItem(`earnova_historical_claimed_${activeUserId}`);
        if (savedClaims) {
          setDbCompletedIds(JSON.parse(savedClaims));
        }
      } catch (e) {}
    });

    return () => unsubscribe();
  }, []);

  // Fetch or set existing allocated tasks from localStorage and clear old fallbacks if present
  useEffect(() => {
    const savedContent = localStorage.getItem(assignContentKey);
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        const hasFallbacks = parsed.some((t: any) => 
          !t.dbSource || 
          (t.id && String(t.id).includes('fallback')) || 
          (t.title && (
            t.title.includes('Review E-Wallet Tech') || 
            t.title.includes('Watch Commercial Spot') || 
            t.title.includes('Verify User Flow') || 
            t.title.includes('Evaluate Video Spot') || 
            t.title.includes('Review Video Content') || 
            t.title.includes('Watch Ad Promotion') || 
            t.title.includes('Rate Media Commercial')
          ))
        );
        if (hasFallbacks) {
          localStorage.removeItem(assignContentKey);
          localStorage.removeItem(assignStatusKey);
          setAssignedMissions([]);
        } else {
          setAssignedMissions(parsed);
        }
      } catch (e) {
        setAssignedMissions([]);
      }
    }
  }, [assignContentKey, assignStatusKey]);

  // Sync timers
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Normalize comparison to match task levels securely (e.g. LEVEL 1 -> JOB1, INTERN -> INTERN)
  const normalizeLevel = (lvlStr: string) => {
    if (!lvlStr) return 'ALL';
    const clean = lvlStr.trim().toUpperCase();
    if (clean === 'ALL') return 'ALL';
    if (clean === 'INTERN' || clean === 'INTERNSHIP' || clean === 'INTERN USERS') return 'INTERN';
    
    // Convert "LEVEL 1" or "LEVEL1" -> "JOB1"
    const lvlMatch = clean.match(/LEVEL\s*(\d+)/);
    if (lvlMatch) {
      return `JOB${lvlMatch[1]}`;
    }
    // Convert "JOB 1" -> "JOB1"
    const jobMatch = clean.match(/JOB\s*(\d+)/);
    if (jobMatch) {
      return `JOB${jobMatch[1]}`;
    }
    return clean;
  };

  const isLocked = tasksClaimedToday >= taskCount;

  // Let's create an allocator handler
  const handleAllocateTasks = () => {
    let matchedDbTasks = dbTasks.filter(item => {
      const lv = item.level ? item.level.toUpperCase() : 'ALL';
      // If user is on INTERN level, make ALL uploaded tasks available to them!
      if (normalizeLevel(currentLevel) === 'INTERN') {
        return true;
      }
      return normalizeLevel(lv) === 'ALL' || normalizeLevel(lv) === normalizeLevel(currentLevel);
    });

    // Fallback: if no tasks are matched for our level but there are ANY tasks uploaded, use them to prevent blockages!
    if (matchedDbTasks.length === 0 && dbTasks.length > 0) {
      matchedDbTasks = dbTasks;
    }

    // Ultimate fallback: if absolutely no tasks are present in the system, load premium pre-allocated tasks so users are never blocked
    if (matchedDbTasks.length === 0) {
      matchedDbTasks = DEFAULT_FALLBACK_VIDEO_TASKS;
    }

    setIsAllocating(true);
    setAllocationProgress(0);
    setAllocationStep('Connecting to secure streaming gateways...');
    WebApp.HapticFeedback.impactOccurred('medium');

    const steps = [
      { progress: 15, text: 'Resolving active sponsors with level credentials...' },
      { progress: 40, text: 'Synchronizing ad buffers and stream packages...' },
      { progress: 70, text: `Synthesizing daily payload matches for Job Level ${currentLevel}...` },
      { progress: 95, text: 'Confirming high-commission stream validation...' },
      { progress: 100, text: 'Allocation Sequence Complete!' }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        const stepStatus = steps[currentStepIdx];
        setAllocationProgress(stepStatus.progress);
        setAllocationStep(stepStatus.text);
        currentStepIdx++;
        WebApp.HapticFeedback.impactOccurred('light');
      } else {
        clearInterval(interval);
        
        // Suppositions & Generative Fallbacks
        const results: any[] = [];
        
        // 1. Unseen matching tasks first (prioritizing new content)
        // Combine real-time dbCompletedIds with localStorage historical fallback
        const localHistKey = `earnova_historical_claimed_${userId}`;
        let localHist: string[] = [];
        if (localHistKey) {
          try {
            const savedStr = localStorage.getItem(localHistKey);
            if (savedStr) localHist = JSON.parse(savedStr);
          } catch {}
        }
        const allCompletedIds = Array.from(new Set([...dbCompletedIds, ...localHist]));

        const unseen = matchedDbTasks.filter(t => !allCompletedIds.includes(t.id));
        unseen.forEach((t) => {
          if (results.length < taskCount) {
            results.push({
              id: t.id || Math.random().toString(),
              baseTaskId: t.id,
              title: t.title,
              url: t.url,
              commission: t.commission || commission,
              category: t.category || 'VIDEO WATCH',
              dbSource: true
            });
          }
        });

        // 2. If we need more to meet the daily taskCount quota, cyclically pull from all available level tasks starting from the oldest (index 0)
        // This satisfies: "if there is no unseen video repeat the first day video and continued like this"
        let cycleIndex = 0;
        let loopSafety = 0;
        const maxSafety = taskCount * 10;
        while (results.length < taskCount && matchedDbTasks.length > 0 && loopSafety < maxSafety) {
          loopSafety++;
          const t = matchedDbTasks[cycleIndex % matchedDbTasks.length];
          // Try to avoid adding duplicate tasks in the same daily allocation slot if we have enough available
          const alreadyAdded = results.some(r => r.baseTaskId === t.id);
          if (!alreadyAdded || results.length >= matchedDbTasks.length || loopSafety > matchedDbTasks.length) {
            results.push({
              id: `${t.id}-slot-${results.length}`,
              baseTaskId: t.id,
              title: t.title,
              url: t.url,
              commission: t.commission || commission,
              category: t.category || 'VIDEO WATCH',
              dbSource: true
            });
          }
          cycleIndex++;
        }

        // Save allocated tasks
        localStorage.setItem(assignStatusKey, 'true');
        localStorage.setItem(assignContentKey, JSON.stringify(results));
        setAssignedMissions(results);
        setIsAllocating(false);
        WebApp.HapticFeedback.notificationOccurred('success');
      }
    }, 600);
  };

  const handleClaimReward = (task: any) => {
    if (selectedRating === 0 || !selectedTag) {
      alert("Please choose a rating and select a feedback tag!");
      return;
    }

    if (claimedList.includes(task.id)) return;
    if (isLocked) return;

    // Add to claimed lists
    const updated = [...claimedList, task.id];
    setClaimedList(updated);
    localStorage.setItem(localClaimedKey, JSON.stringify(updated));

    setActiveWatchTask(null);
    setShowCongrats(task.title);
    onTaskAction(task.title, task.commission, task.baseTaskId || task.id);

    // Reset modals
    setSelectedRating(0);
    setSelectedTag('');

    setTimeout(() => {
      setShowCongrats(null);
    }, 2000);
  };

  function isYouTubeUrl(url: string) {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  function getYouTubeEmbedUrl(url: string) {
    if (!url) return '';
    let id = '';
    try {
      if (url.includes('youtube.com/embed/')) {
        const cleanUrl = url.split('?')[0];
        return `${cleanUrl}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&cc_lang_pref=en`;
      }
      if (url.includes('youtu.be/')) {
        id = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/watch')) {
        id = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtube.com/shorts/')) {
        id = url.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
      }
      if (id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&cc_lang_pref=en`;
      }
    } catch (err) {
      console.error("Url parsing error", err);
    }
    return '';
  }

  function isTikTokUrl(url: string) {
    if (!url) return false;
    return url.includes('tiktok.com');
  }

  function getTikTokEmbedUrl(url: string) {
    if (!url) return '';
    try {
      const videoMatch = url.match(/\/video\/(\d+)/);
      if (videoMatch && videoMatch[1]) {
        return `https://www.tiktok.com/embed/v2/${videoMatch[1]}`;
      }
      if (url.includes('tiktok.com/embed/')) {
        return url;
      }
    } catch (err) {
      console.error("TikTok URL parsing error", err);
    }
    return '';
  }

  function isDirectVideoUrl(url: string) {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || 
           cleanUrl.endsWith('.webm') || 
           cleanUrl.endsWith('.ogg') || 
           cleanUrl.endsWith('.mov') ||
           url.includes('.mp4?') ||
           url.includes('.webm?') ||
           url.includes('.ogg?') ||
           url.includes('.mov?');
  }

  function isVimeoUrl(url: string) {
    if (!url) return false;
    return url.includes('vimeo.com');
  }

  function getVimeoEmbedUrl(url: string) {
    if (!url) return '';
    try {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    } catch (err) {}
    return '';
  }

  // If daily limit already reached
  if (isLocked) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-2"
        >
          <Lock size={48} className="stroke-[2.5]" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black italic text-gray-900 uppercase tracking-tighter">{t('daily_limit_reached')}</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
            {t('daily_limit_desc').replace('{count}', taskCount.toString())}
          </p>
        </div>

        <div className="bg-[#0A0F1E] border border-white/10 px-6 py-4 rounded-3xl w-full max-w-xs text-center">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">{t('status_locked')}</p>
          <p className="text-sm font-black text-white">{t('come_back_tomorrow')}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/10">
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('reset_at')}</span>
          </div>
          <div className="flex gap-2">
            {timeLeft.split(':').map((unit, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black italic tracking-tighter w-12 h-12">
                  {unit}
                </div>
                {i < 2 && <span className="font-black text-gray-300">:</span>}
              </div>
            ))}
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Time remaining until reset</p>
        </div>

        <button
          onClick={() => {
            onShowHistory();
            WebApp.HapticFeedback.impactOccurred('light');
          }}
          className="mt-4 px-5 py-3.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-2xl uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-blue-500/15"
        >
          <History size={14} className="stroke-[2.5]" />
          View Task History
        </button>
      </div>
    );
  }

  // Onboarding screens: If daily task channels are not yet assigned/allocated for today
  if (assignedMissions.length === 0) {
    return (
      <div className="px-5 py-8 max-w-md mx-auto min-h-[75vh] flex flex-col justify-center">
        {isAllocating ? (
          <div className="text-center space-y-6">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-600 rounded-full"
              />
              <Film className="text-blue-600 animate-pulse" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tighter text-gray-900">Configuring Streams</h3>
              <p className="text-[10px] font-mono font-bold text-gray-400 tracking-wider h-8 max-w-xs mx-auto">{allocationStep}</p>
            </div>
            {/* Progress line */}
            <div className="max-w-[180px] mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-blue-600 h-full"
                animate={{ width: `${allocationProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[36px] p-6 text-center space-y-6 border border-blue-100/80 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <Film size={28} className="fill-blue-600" />
            </div>

            <div className="space-y-1">
              <span className="text-[8.5px] font-black tracking-[0.2em] bg-blue-600 text-white px-3 py-1 rounded-full uppercase">
                VIP LEVEL ALLOCATION
              </span>
              <h2 className="text-xl font-black italic text-blue-950 uppercase tracking-tight pt-2">Task Streams Pending</h2>
              <p className="text-[10px] font-black text-blue-900/40 max-w-[280px] mx-auto leading-relaxed">
                Unlock and assign high-payout video task reels matching your daily level limits. Rate real-time media to credit standard income.
              </p>
            </div>

            {/* Profile Statistics Grid */}
            <div className="grid grid-cols-2 gap-3 bg-blue-50/45 rounded-3xl p-4 text-left border border-blue-100/50">
              <div>
                <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest">Active Level</p>
                <p className="text-sm font-black italic text-blue-600 uppercase tracking-tight">Job Tier {currentLevel}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest">Available streams</p>
                <p className="text-sm font-black text-blue-950">{taskCount} Videos</p>
              </div>
              <div className="mt-1">
                <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest">Commission / Video</p>
                <p className="text-sm font-black text-emerald-600">ETB {commission.toFixed(2)}</p>
              </div>
              <div className="mt-1">
                <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest">Total daily potential</p>
                <p className="text-sm font-black text-emerald-600">ETB {(commission * taskCount).toFixed(2)}</p>
              </div>
            </div>

            <button 
              onClick={handleAllocateTasks}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/15"
            >
              Get Today's {taskCount} Tasks
            </button>

            <button 
              onClick={() => {
                onShowHistory();
                WebApp.HapticFeedback.impactOccurred('light');
              }}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all mt-2.5 flex items-center justify-center gap-2"
            >
              <History size={12} className="stroke-[2.5]" />
              View Task History
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 relative pb-8 pt-4">
      {/* Success Animation congrats */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-blue-600/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-[#0D1222] border border-white/10 rounded-3xl p-8 text-center shadow-2xl space-y-4 max-w-xs w-full"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/30">
                <Check size={32} className="stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('mission_success')}</h3>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">
                  Task Approved & Verified
                </p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/10 py-3 rounded-2xl">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none">Standard Balance Updated</p>
                <p className="text-lg font-black text-emerald-400 mt-1">+ETB {commission.toFixed(2)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mt-3">
        <h1 className="text-xl font-black italic text-[#0A0F1E] tracking-tighter uppercase">{t('mission_title')}</h1>
        <p className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest mt-1 leading-none">{t('mission_subtitle')}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white border border-blue-100 rounded-3xl p-4.5 text-left relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/[0.02] rounded-full blur-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 relative z-10">
          <div>
            <h2 className="text-xs font-black text-blue-950 uppercase tracking-tight">Active Task Queue</h2>
            <p className="text-[8.5px] font-black text-blue-900/40 uppercase tracking-widest mt-0.5">Watch videos to earn instant payouts</p>
          </div>
          <div className="flex items-center gap-2 bg-transparent">
            <button
              onClick={() => {
                localStorage.removeItem(assignContentKey);
                localStorage.removeItem(assignStatusKey);
                setAssignedMissions([]);
                WebApp.HapticFeedback.impactOccurred('medium');
              }}
              className="px-3 py-1.5 text-[8.5px] font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-md shadow-slate-900/10 border border-white/5"
              title="Reload task list to fetch newly uploaded videos"
            >
              <RefreshCw size={10} className="stroke-[2.5]" />
              Sync Stream Feed
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowHistory();
                WebApp.HapticFeedback.impactOccurred('light');
              }}
              className="px-3 py-1.5 text-[8.5px] font-black bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-md shadow-blue-500/5 shrink-0"
              title="View your claimed tasks history"
            >
              <History size={10} className="stroke-[2.5]" />
              History
            </button>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full uppercase tracking-wider shrink-0">{tasksClaimedToday}/{taskCount} Done</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-blue-50/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (tasksClaimedToday / taskCount) * 100)}%` }}
            className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.25)]"
          />
        </div>
      </div>

      {/* Task Streams List */}
      <div className="grid grid-cols-1 gap-3.5">
        {assignedMissions.map((m) => ({ ...m, commission: commission })).map((mission, idx) => {
          const isClaimed = claimedList.includes(mission.id);
          return (
            <div key={`assigned-mission-row-${mission.id}`} className={cn(
              "bg-white rounded-3xl p-4.5 border transition-all flex items-center justify-between shadow-sm",
              isClaimed 
                ? "opacity-60 border-blue-50/50 bg-[#F9FBFC]" 
                : "border-blue-100 hover:border-blue-400 group active:scale-[0.99] cursor-pointer"
            )}
            onClick={() => {
              if (!isClaimed) {
                setActiveWatchTask(mission);
                setSelectedRating(0);
                setSelectedTag('');
              }
            }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border flex-shrink-0 transition-all",
                  isClaimed 
                    ? "bg-gray-100 text-gray-400 border-gray-200" 
                    : "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white"
                )}>
                  {isClaimed ? <Check size={20} /> : (idx + 1)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[12px] font-black text-blue-950 uppercase tracking-tight truncate leading-tight group-hover:text-blue-600 transition-colors">{mission.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[7.5px] font-black bg-blue-50 border border-blue-100/30 text-blue-500 px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">
                      {mission.category}
                    </span>
                    <span className="text-[8.5px] font-black text-emerald-600 uppercase tracking-wider">
                      +ETB {Number(mission.commission).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isClaimed) {
                    setActiveWatchTask(mission);
                    setSelectedRating(0);
                    setSelectedTag('');
                  }
                }}
                disabled={isClaimed}
                className={cn(
                  "px-4.5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex-shrink-0 leading-none",
                  isClaimed 
                    ? "bg-gray-150 text-gray-500" 
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10 active:scale-95 text-xs"
                )}
              >
                {isClaimed ? t('btn_claimed') : "WATCH"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Video Worktask Player and Rating Sheet Modal */}
      <AnimatePresence>
        {activeWatchTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-lg rounded-t-[36px] sm:rounded-[36px] border-t sm:border border-blue-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-blue-100/60 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-blue-950 uppercase">SPONSOR AD STREAM STREAMING</span>
                </div>
                <button
                  onClick={() => setActiveWatchTask(null)}
                  className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
                {/* Title */}
                <div>
                  <span className="text-[8px] font-black bg-blue-600 text-white px-2.5 py-1 rounded-md uppercase tracking-widest">{activeWatchTask.category}</span>
                  <h3 className="text-base font-black text-blue-950 uppercase tracking-tight mt-1">{activeWatchTask.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-emerald-600">Commission: +ETB {Number(activeWatchTask.commission).toFixed(2)}</span>
                  </div>
                </div>

                {/* Video Player Box */}
                <div className={cn(
                  "bg-slate-950 rounded-2xl border border-blue-100/50 overflow-hidden relative group flex items-center justify-center shadow-lg transition-all duration-300",
                  isTikTokUrl(activeWatchTask.url) || activeWatchTask.url.includes('/shorts/')
                    ? "aspect-[9/16] w-[260px] md:w-[280px] mx-auto shadow-rose-500/5"
                    : "aspect-video w-full shadow-blue-500/5"
                )}>
                  {isYouTubeUrl(activeWatchTask.url) && getYouTubeEmbedUrl(activeWatchTask.url) ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      <iframe 
                        src={getYouTubeEmbedUrl(activeWatchTask.url)} 
                        title={activeWatchTask.title}
                        className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      />
                      {/* Top Overlay blocking YouTube links and title clickout */}
                      <div className="absolute top-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Bottom Overlay blocking controls, progress bar, logo, settings */}
                      <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Left Overlay blocking any other sidebar info */}
                      <div className="absolute top-[28%] bottom-[28%] left-0 w-[15%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Right Overlay blocking watermark and logos */}
                      <div className="absolute top-[28%] bottom-[28%] right-0 w-[15%] bg-transparent z-10 pointer-events-auto cursor-default" />
                    </div>
                  ) : isTikTokUrl(activeWatchTask.url) && getTikTokEmbedUrl(activeWatchTask.url) ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      <iframe 
                        src={getTikTokEmbedUrl(activeWatchTask.url)} 
                        title={activeWatchTask.title}
                        className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                      />
                      {/* Top Overlay blocking TikTok profile header and links */}
                      <div className="absolute top-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Bottom Overlay blocking TikTok watermark and footer links */}
                      <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Left Overlay blocking any other sidebar info */}
                      <div className="absolute top-[28%] bottom-[28%] left-0 w-[18%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Right Overlay blocking TikTok interaction sidebar (likes, profile icon, comments, share) */}
                      <div className="absolute top-[28%] bottom-[28%] right-0 w-[24%] bg-transparent z-10 pointer-events-auto cursor-default" />
                    </div>
                  ) : isVimeoUrl(activeWatchTask.url) && getVimeoEmbedUrl(activeWatchTask.url) ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      <iframe 
                        src={getVimeoEmbedUrl(activeWatchTask.url)} 
                        title={activeWatchTask.title}
                        className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowFullScreen
                      />
                      {/* Top Overlay blocking Vimeo share, title, follow, and avatar links */}
                      <div className="absolute top-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Bottom Overlay blocking Vimeo dashboard, logo, settings */}
                      <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Left Overlay */}
                      <div className="absolute top-[28%] bottom-[28%] left-0 w-[18%] bg-transparent z-10 pointer-events-auto cursor-default" />
                      {/* Right Overlay blocking logo and watermark */}
                      <div className="absolute top-[28%] bottom-[28%] right-0 w-[18%] bg-transparent z-10 pointer-events-auto cursor-default" />
                    </div>
                  ) : isDirectVideoUrl(activeWatchTask.url) ? (
                    <video 
                      src={activeWatchTask.url}
                      controls
                      playsInline
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 bg-gradient-to-b from-blue-50/50 to-blue-100/50">
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200/50 animate-pulse">
                        <Play size={32} className="fill-blue-600 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-blue-955 uppercase tracking-tight">Stream Ready</p>
                        <p className="text-[9px] font-black text-blue-900/40 max-w-[240px] leading-relaxed mx-auto font-mono">Watch the stream fully below to verify and unlock your ETB earnings.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 10 Seconds Playback Timer Progress Track */}
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-gray-400">Stream Security Timer</span>
                    {watchTimer > 0 ? (
                      <span className="text-amber-500 animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
                        Watching Required: {watchTimer}s
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        ✓ Stream Target Verified
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <motion.div 
                      className="bg-gradient-to-r from-amber-500 to-blue-500 h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((10 - watchTimer) / 10) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Rating Stream form */}
                <div className="bg-blue-50/30 border border-blue-100 rounded-3xl p-5 space-y-4 shadow-inner">
                  <div className="text-center space-y-1.5">
                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.15em] leading-none">Rate This Promotion Stream (Required)</p>
                    <p className="text-[9.5px] font-black text-blue-900/40 uppercase tracking-widest">Please submit your rating to claim earnings</p>
                  </div>

                  {/* Rating Stars Selection */}
                  <div className="flex justify-center gap-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform active:scale-75 p-1"
                      >
                        <Star 
                          size={28} 
                          className={cn(
                            "transition-all stroke-[2.5]",
                            star <= (hoverRating || selectedRating) 
                              ? "text-blue-600 fill-blue-600 filter drop-shadow-[0_0_10px_rgba(0,98,255,0.35)] scale-110" 
                              : "text-gray-300"
                          )} 
                        />
                      </button>
                    ))}
                  </div>

                  {/* Feedback Tags Selector */}
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest text-center">Select Feedback Tag (Required)</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "👍 High Quality",
                        "🔥 Genuine Content",
                        "📈 Highly Advised",
                        "💡 Informative",
                        "💎 High Payout"
                      ].map((tag) => {
                        const isChosen = selectedTag === tag;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(tag)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all border",
                              isChosen 
                                ? "bg-blue-600 text-white border-blue-600" 
                                : "bg-white text-blue-900 border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 shadow-sm"
                            )}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Claim Action Button */}
              <div className="p-5 border-t border-blue-100 bg-blue-50/50 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleClaimReward(activeWatchTask)}
                  disabled={watchTimer > 0 || selectedRating === 0 || !selectedTag}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {watchTimer > 0 
                    ? `WATCH THE STREAM FULLY TO CLAIM (${watchTimer}S)`
                    : `Confirm Feed & Claim +ETB ${Number(activeWatchTask.commission).toFixed(2)}`
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-8" />
    </div>
  );
}

// Memory caches to eliminate repetitive Firestore reads for user stats task history
let globalHistoryCache: any[] | null = null;
let globalHistoryLastFetchedAt = 0;
let globalHistoryCachedUid = '';
let globalHistoryCachedClaimedCount = -1;

function ProfilePage({ 
  balance, 
  currentJobLevel, 
  handleAction, 
  t,
  userPhone,
  fullName,
  onInstallApp,
  tasksClaimedToday,
  avatarSeed,
  createdAt,
  avatarUrl
}: { 
  balance: { income: number, personal: number, workDeposit: number, recommended: number, teamTasks: number }, 
  currentJobLevel: JobLevel, 
  handleAction: (a: string) => void, 
  t: any,
  userPhone: string,
  fullName: string,
  onInstallApp: () => void,
  tasksClaimedToday: number,
  avatarSeed?: string,
  createdAt?: string,
  avatarUrl?: string
}) {
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [bonusItems, setBonusItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const getLuxuryAvatar = () => {
    if (avatarUrl && avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    const presets: { [key: string]: string } = {
      bugatti: 'https://images.unsplash.com/photo-1600706432505-1a8db0dd1d20?auto=format&fit=crop&w=150&h=150&q=80',
      lamborghini: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=150&h=150&q=80',
      rollsroyce: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?auto=format&fit=crop&w=150&h=150&q=80',
      ferrari: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=150&h=150&q=80',
      gwagon: 'https://images.unsplash.com/photo-1520050206274-a1ae446fa3ca?auto=format&fit=crop&w=150&h=150&q=80',
      privatejet1: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=150&h=150&q=80',
      privatejet2: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=150&h=150&q=80',
      privatejet3: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=150&h=150&q=80',
      Felix: 'https://images.unsplash.com/photo-1600706432505-1a8db0dd1d20?auto=format&fit=crop&w=150&h=150&q=80',
      Zoey: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=150&h=150&q=80',
      Aneka: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?auto=format&fit=crop&w=150&h=150&q=80',
      Jack: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=150&h=150&q=80',
      Oliver: 'https://images.unsplash.com/photo-1520050206274-a1ae446fa3ca?auto=format&fit=crop&w=150&h=150&q=80',
      Lily: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=150&h=150&q=80',
      Milo: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=150&h=150&q=80',
      Cleo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=150&h=150&q=80',
    };
    if (avatarSeed && presets[avatarSeed]) {
      return presets[avatarSeed];
    }
    return presets.bugatti;
  };

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      const { getUserDocId } = await import('./lib/firebase');
      const uid = getUserDocId();
      if (!uid) {
        setLoadingHistory(false);
        return;
      }

      // Try reading previous local copy immediately to prevent blank renders or quota error crash
      let localBackup: any[] = [];
      try {
        const stored = localStorage.getItem(`earnova_stats_history_${uid}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localBackup = parsed.map(item => ({
              ...item,
              date: item.dateStr ? new Date(item.dateStr) : null
            }));
          }
        }
      } catch (e) {
        console.warn("localStorage history read error:", e);
      }

      // Check if same user state is already in memory cache and fresh (under 5 mins) to abort query
      if (
        globalHistoryCache && 
        globalHistoryCachedUid === uid && 
        globalHistoryCachedClaimedCount === tasksClaimedToday &&
        (Date.now() - globalHistoryLastFetchedAt < 300000)
      ) {
        if (active) {
          setHistoryItems(globalHistoryCache);
          setLoadingHistory(false);
        }
        return;
      }

      try {
        const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');

        const q = query(
          collection(db, 'taskHistory'),
          where('userId', '==', uid),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
        const snapshot = await getDocs(q);
        if (!active) return;

        const items: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          let dateObj: Date | null = null;
          if (data.timestamp) {
            dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          }
          items.push({
            id: d.id,
            commission: Number(data.commission) || 0,
            date: dateObj
          });
        });

        // Query all bonuses starting since day one
        const qb = query(
          collection(db, 'bonuses'),
          where('userId', '==', uid),
          orderBy('timestamp', 'desc'),
          limit(1000)
        );
        const bonusSnapshot = await getDocs(qb);
        if (!active) return;

        const bItems: any[] = [];
        bonusSnapshot.forEach((d) => {
          const data = d.data();
          let dateObj: Date | null = null;
          if (data.timestamp) {
            dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          }
          bItems.push({
            id: d.id,
            amount: Number(data.amount) || 0,
            date: dateObj
          });
        });

        setBonusItems(bItems);

        // Update memory cache
        globalHistoryCache = items;
        globalHistoryLastFetchedAt = Date.now();
        globalHistoryCachedUid = uid;
        globalHistoryCachedClaimedCount = tasksClaimedToday;

        // Backup to localStorage
        try {
          const serialized = items.map(it => ({
            id: it.id,
            commission: it.commission,
            dateStr: it.date ? it.date.toISOString() : null
          }));
          localStorage.setItem(`earnova_stats_history_${uid}`, JSON.stringify(serialized));
          
          const serializedBonuses = bItems.map(it => ({
            id: it.id,
            amount: it.amount,
            dateStr: it.date ? it.date.toISOString() : null
          }));
          localStorage.setItem(`earnova_stats_bonuses_${uid}`, JSON.stringify(serializedBonuses));
        } catch (e) {
          console.warn("localStorage history write error:", e);
        }

        if (active) {
          setHistoryItems(items);
        }
      } catch (err) {
        console.error("Error fetching task history for stats (capped fallback used):", err);
        if (active && localBackup.length > 0) {
          setHistoryItems(localBackup);
        }
        try {
          const storedB = localStorage.getItem(`earnova_stats_bonuses_${uid}`);
          if (storedB && active) {
            const parsed = JSON.parse(storedB);
            if (Array.isArray(parsed)) {
              setBonusItems(parsed.map(b => ({
                id: b.id,
                amount: b.amount,
                date: b.dateStr ? new Date(b.dateStr) : null
              })));
            }
          }
        } catch (e) {}
      } finally {
        if (active) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      active = false;
    };
  }, [tasksClaimedToday]);

  const matchedJob = JOBS.find(j => j.level === currentJobLevel) || JOBS[0];

  // Precise date calculations based on local time
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

  // Calendar week starting Monday
  const dayOfWeek = now.getDay();
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Calendar month starting 1st
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  let dbTodaySum = 0;
  let dbYesterdaySum = 0;
  let dbWeekSum = 0;
  let dbMonthSum = 0;

  historyItems.forEach((item) => {
    if (item.date) {
      const time = item.date.getTime();
      if (time >= todayStart.getTime() && time <= todayEnd.getTime()) {
        dbTodaySum += item.commission;
      }
      if (time >= yesterdayStart.getTime() && time <= yesterdayEnd.getTime()) {
        dbYesterdaySum += item.commission;
      }
      if (time >= weekStart.getTime()) {
        dbWeekSum += item.commission;
      }
      if (time >= monthStart.getTime()) {
        dbMonthSum += item.commission;
      }
    }
  });

  const todayTaskIncomeValue = tasksClaimedToday * matchedJob.eachOrder;
  const todayOverallIncome = Math.max(dbTodaySum, todayTaskIncomeValue);
  const yesterdayOverallIncome = dbYesterdaySum;
  const weeklyOverallIncome = Math.max(dbWeekSum, todayOverallIncome);
  const monthlyOverallIncome = Math.max(dbMonthSum, weeklyOverallIncome);

  const totalOverallIncome = balance.income + (balance.recommended || 0) + (balance.teamTasks || 0);

  const registrationDateStr = createdAt ? new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'May 24, 2026';

  const endContractDateStr = createdAt ? new Date(new Date(createdAt).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'May 24, 2027';

  let totalCommissionsEarned = 0;
  historyItems.forEach((item) => {
    totalCommissionsEarned += item.commission;
  });

  let totalBonusesEarned = 0;
  bonusItems.forEach((b) => {
    totalBonusesEarned += b.amount;
  });

  const lifetimeGeneratedSum = totalCommissionsEarned + totalBonusesEarned + (balance.recommended || 0) + (balance.teamTasks || 0);

  const sections = [
    { label: t('financial_record'), icon: ScrollText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('support_center'), icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'About us', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Onboarding Tour', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  let formattedPhone = userPhone || '';
  if (formattedPhone && !formattedPhone.startsWith('+') && !formattedPhone.startsWith('guest_')) {
    const clean = formattedPhone.trim().replace(/\s+/g, '');
    if (clean.startsWith('09') && clean.length === 10) {
      formattedPhone = `+251 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    } else if (clean.startsWith('9') && clean.length === 9) {
      formattedPhone = `+251 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    } else {
      formattedPhone = `+251 ${clean}`;
    }
  }

  return (
    <div className="pb-12 space-y-6 pt-4 px-4 overflow-x-hidden">
      {/* User Header */}
      <div className="px-4 flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-200 border-2 border-white shadow-lg">
              <img src={getLuxuryAvatar()} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <CheckSquare size={8} className="text-white" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1 truncate max-w-[180px]">{fullName || 'Member'}</h2>
            <p className="text-[10px] font-black font-mono text-gray-500 tracking-tight leading-none mb-1">{formattedPhone || 'No Phone'}</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                <CheckSquare size={8} />
                Status: Active
              </div>
              <div className="flex items-center gap-1 bg-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                <Shield size={8} />
                {currentJobLevel}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-1.5">
            <button onClick={() => handleAction('Settings')} className="p-1.5 bg-gray-100 text-gray-400 rounded-lg active:scale-90 transition-transform">
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="px-4">
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center space-y-1 cursor-pointer active:bg-blue-100 transition-colors" onClick={() => handleAction('Income Wallet')}>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{t('nav_income')}</p>
              <p className="text-lg font-black text-blue-600">ETB {balance.income.toFixed(2)}</p>
            </div>
            <div className="flex-1 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center space-y-1 cursor-pointer active:bg-indigo-100 transition-colors" onClick={() => handleAction('Personal Wallet')}>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{t('balance_personal')}</p>
              <p className="text-lg font-black text-indigo-600">ETB {balance.personal.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleAction('RECHARGE')}
              className="flex items-center justify-center gap-2 bg-gray-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform group"
            >
              <ArrowDownCircle size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
              {t('btn_recharge')}
            </button>
            <div className="relative">
              <button 
                onClick={() => handleAction('WITHDRAW')}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-100 text-gray-900 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-transform group"
              >
                <ArrowUpCircle size={18} className="text-rose-500 group-hover:scale-110 transition-transform" />
                {t('btn_withdraw')}
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFeeTooltip(!showFeeTooltip);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center border border-white shadow-md transition-all active:scale-90"
                title="Service Fee Info"
              >
                <Info size={10} className="stroke-[3]" />
              </button>

              {showFeeTooltip && (
                <div className="absolute bottom-full right-0 mb-3 w-56 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl z-50 text-[10px] uppercase font-black tracking-wider leading-relaxed border border-white/10 animate-fade-in">
                  <div className="relative">
                    <p className="text-amber-400 mb-1 flex items-center gap-1">
                      <ShieldAlert size={12} className="shrink-0 animate-pulse text-amber-400" />
                      10% Withdrawal Fee
                    </p>
                    <p className="text-gray-300 font-medium normal-case tracking-normal leading-normal">
                      A 10% service fee is deducted on Income Wallet withdrawals. Personal Wallet has 0% fee.
                    </p>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFeeTooltip(false);
                      }}
                      className="mt-2 text-rose-400 hover:text-rose-300 underline block text-[9px] font-bold text-left italic"
                    >
                      Got it, thanks
                    </button>
                    {/* Tooltip caret style pointer */}
                    <div className="absolute top-[calc(100%+14px)] right-3 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45" style={{ marginTop: '-20px' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PWA High-Fidelity App Installer Banner */}
      <div className="px-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0E1322] to-[#0B0F19] rounded-3xl p-5 border border-blue-500/20 shadow-xl space-y-4">
          {/* Subtle glowing radial background element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-amber-505 bg-amber-500/15 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest leading-none">PWA Installer</span>
              <h3 className="text-sm font-black text-white uppercase tracking-tight italic pt-1">EARNOVA native app</h3>
              <p className="text-[9.5px] text-gray-405 font-bold leading-relaxed max-w-[200px]">Install EARNOVA directly to your mobile home screen with fast 1-tap ecosystem access.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Download size={18} className="animate-pulse" />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onInstallApp}
            className="w-full relative z-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
          >
            Download App <Download size={12} />
          </button>
        </div>
      </div>

      <div className="px-4 text-center">
        <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">
          Registered on: {registrationDateStr}
        </p>
        <p className="text-[8px] font-black italic text-gray-400 uppercase tracking-widest leading-none">
          Cycle: {registrationDateStr} ~ {endContractDateStr}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-2">
        {[
          { label: t('balance_income'), value: todayOverallIncome.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: "Yesterday", value: yesterdayOverallIncome.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: "This month", value: monthlyOverallIncome.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: "This week", value: weeklyOverallIncome.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: t('balance_total'), value: totalOverallIncome.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: "Recommended", value: balance.recommended.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: "Team tasks", value: balance.teamTasks.toFixed(2), color: "text-blue-600 font-semibold" },
          { label: t('balance_work'), value: balance.workDeposit.toLocaleString(), color: "text-blue-600 font-semibold" },
        ].map((stat, idx) => (
          <div 
            key={`profile-stat-${stat.label}-${idx}`} 
            className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-center space-y-1 border border-gray-100 shadow-sm cursor-pointer active:brightness-95 transition-all"
            onClick={() => handleAction(stat.label)}
          >
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight leading-none h-4 flex items-center">{stat.label}</p>
            <p className={cn("text-md font-black", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Account Settings Section */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-5 shadow-xl border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                <Settings size={18} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Account Security</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Password', icon: Lock, action: 'Change Password' },
              { label: 'Email', icon: Mail, action: 'Update Email' },
              { label: 'Phone', icon: Phone, action: 'Update Phone' },
            ].map((item, i) => (
              <button 
                key={i}
                onClick={() => handleAction(item.action)}
                className="flex flex-col items-center justify-center py-3 px-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 active:scale-95 transition-all text-center group"
              >
                <item.icon size={16} className="text-blue-400 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-[9px] font-black text-blue-100 uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 grid grid-cols-4 gap-y-3 gap-x-2">
        {sections.map((section, idx) => (
          <button key={`profile-menu-${section.label}-${idx}`} onClick={() => handleAction(section.label)} className="flex flex-col items-center gap-1.5 group">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-sm transform transition-transform group-active:scale-90", section.bg, section.color)}>
              <section.icon size={18} />
            </div>
            <span className="text-[8px] font-black text-gray-600 tracking-tight text-center leading-tight uppercase px-1">
              {section.label}
            </span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="px-4">
        <button onClick={() => handleAction('Logout')} className="w-full bg-white border border-gray-100 text-gray-400 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm active:bg-gray-50 transition-colors uppercase tracking-widest">
          Log out
        </button>
      </div>
      <div className="pb-8" />
    </div>
  );
}
