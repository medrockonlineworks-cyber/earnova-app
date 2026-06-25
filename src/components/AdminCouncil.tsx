import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Shield, 
  AlertCircle, 
  User as UserIcon, 
  ArrowUpCircle, 
  Wallet, 
  Loader2, 
  Bell, 
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  Users,
  Send,
  LogOut,
  Trash2,
  Plus,
  Play,
  Film,
  Star,
  ExternalLink,
  Search,
  Image,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType, isUserAdmin, getUserDocId } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  doc, 
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { cn } from '../lib/utils';
import WebApp from '@twa-dev/sdk';
import { compressImage } from '../lib/imageCompressor';

type AdminTab = 'DEPOSITS' | 'WITHDRAWALS' | 'USERS' | 'TASKS' | 'ADS' | 'PAYMENTS';
type UserFilter = 'ALL' | 'INTERN' | 'REGULAR';

interface AdminCouncilProps {
  onBack: () => void;
}

export function AdminCouncil({ onBack }: AdminCouncilProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [userFilter, setUserFilter] = useState<UserFilter>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [recharges, setRecharges] = useState<any[]>([]);
  const [rechargeFilter, setRechargeFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(() => {
    const isAdmin = isUserAdmin();
    return isAdmin || localStorage.getItem('admin_console_activated') === 'true';
  });
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  const MASTER_CODE = "2026"; // System Activation Code

  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Video task state variables
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskLevel, setTaskLevel] = useState<string>('ALL');
  const [taskCommission, setTaskCommission] = useState('');
  const [taskCategory, setTaskCategory] = useState('VIDEO WATCH');
  const [isUploadingTask, setIsUploadingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // States for advertisement management
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [selectedAdFileBase64, setSelectedAdFileBase64] = useState<string | null>(null);
  const [selectedAdFileName, setSelectedAdFileName] = useState('');
  const [isUploadingAd, setIsUploadingAd] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [confirmingAdId, setConfirmingAdId] = useState<string | null>(null);

  // States for user management popups & balance adjustments
  const [selectedUserForManagement, setSelectedUserForManagement] = useState<any | null>(null);
  const [walletToAdjust, setWalletToAdjust] = useState<'personal' | 'income'>('personal');
  const [adjustAmountStr, setAdjustAmountStr] = useState<string>('');
  const [adminTeamTab, setAdminTeamTab] = useState<'A' | 'B' | 'C'>('A');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // States for Editable payment methods
  const [telebirrAccount, setTelebirrAccount] = useState('0926193920');
  const [telebirrHolder, setTelebirrHolder] = useState('Leykun');
  const [cbeAccount, setCbeAccount] = useState('1000419524747');
  const [cbeHolder, setCbeHolder] = useState('Leykun jemaneh');
  const [isUpdatingPayments, setIsUpdatingPayments] = useState(false);

  // Monthly salaries states
  const [distributingSalaries, setDistributingSalaries] = useState(false);
  const [salaryResults, setSalaryResults] = useState<any[] | null>(null);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [recentSalaries, setRecentSalaries] = useState<any[]>([]);
  const [loadingSalaries, setLoadingSalaries] = useState(false);

  // States for zero-member system wipe
  const [isWipingSystem, setIsWipingSystem] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeCodeInput, setWipeCodeInput] = useState('');

  // Calculates Levels (A, B, C) direct & indirect subordinates
  const getActiveTeamLists = (managedUser: any) => {
    if (!managedUser) return { A: [], B: [], C: [] };
    
    const managedPhone = (managedUser.phoneNumber || '').trim();
    const managedId = (managedUser.id || '').trim();
    
    // Real referrals registered in Firestore (where invitedBy matches phone number or ID)
    const realA = users.filter(u => {
      const invBy = (u.invitedBy || '').trim();
      return invBy && (invBy === managedPhone || invBy === managedId) && u.status !== 'inactive';
    });
    
    const realB = users.filter(u => {
      const invBy = (u.invitedBy || '').trim();
      return invBy && realA.some(a => {
        const aPhone = (a.phoneNumber || '').trim();
        const aId = (a.id || '').trim();
        return invBy === aPhone || invBy === aId;
      }) && u.status !== 'inactive';
    });
    
    const realC = users.filter(u => {
      const invBy = (u.invitedBy || '').trim();
      return invBy && realB.some(b => {
        const bPhone = (b.phoneNumber || '').trim();
        const bId = (b.id || '').trim();
        return invBy === bPhone || invBy === bId;
      }) && u.status !== 'inactive';
    });
    
    return {
      A: realA,
      B: realB,
      C: realC
    };
  };

  // URL Classification Helpers for Preview Players
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

  useEffect(() => {
    if (isUserAdmin()) {
      setIsActivated(true);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(false);
  }, []);

  const fetchAdminData = async () => {
    if (!isActivated && !isUserAdmin()) return;

    setError(null);
    setLoading(true);

    try {
      // 1. Fetch all recharges
      const qRecharges = query(collection(db, 'recharges'));
      const rechargeSnap = await getDocs(qRecharges);
      setRecharges(rechargeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Fetch all withdrawals
      const qWithdrawals = query(collection(db, 'withdrawals'));
      const withdrawSnap = await getDocs(qWithdrawals);
      setWithdrawals(withdrawSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Fetch all registered users
      const qUsers = query(collection(db, 'users'));
      const usersSnap = await getDocs(qUsers);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 4. Fetch all chats
      const qChats = query(collection(db, 'chats'), orderBy('lastUpdated', 'desc'));
      const chatsSnap = await getDocs(qChats);
      setChats(chatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 5. Fetch custom video task uploads
      const qTasks = query(collection(db, 'tasks'));
      const tasksSnap = await getDocs(qTasks);
      setCreatedTasks(tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 6. Fetch all uploaded ads
      const qAdvertisements = query(collection(db, 'advertisements'));
      const adsSnap = await getDocs(qAdvertisements);
      setAdvertisements(adsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 7. Get payment settings
      const { getDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'system_config', 'payment_info');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.telebirrAccount) setTelebirrAccount(data.telebirrAccount);
        if (data.telebirrHolder) setTelebirrHolder(data.telebirrHolder);
        if (data.cbeAccount) setCbeAccount(data.cbeAccount);
        if (data.cbeHolder) setCbeHolder(data.cbeHolder);
      }

      // Fetch monthly position salary payouts
      try {
        setLoadingSalaries(true);
        const { getDocs, collection } = await import('firebase/firestore');
        const salarySnap = await getDocs(collection(db, 'salary_payouts'));
        const salaries = salarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        salaries.sort((a: any, b: any) => {
          const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return tB - tA;
        });
        setRecentSalaries(salaries);
      } catch (e) {
        console.warn("Could not fetch salary payouts in admin council loading:", e);
      } finally {
        setLoadingSalaries(false);
      }
    } catch (err: any) {
      console.error("Error loading administrative data collections:", err);
      const errMsg = err?.message || err?.toString() || "";
      if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('limit')) {
        setError("Database daily limit reached (Firestore Quota Exceeded). Please upgrade your Firebase plan or wait 24 hours to reload.");
      } else if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied')) {
        setError("Permission Denied: Make sure your account has high-privilege access rules enabled.");
      } else {
        setError(`Failed to read dataset: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [auth.currentUser, isActivated]);

  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', selectedChat, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        time: (doc.data() as any).timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
      })));
    }, (err) => {
      console.error("Messages listener error in Admin:", err);
      try {
        handleFirestoreError(err, OperationType.LIST, `chats/${selectedChat}/messages`);
      } catch (e) {}
    });

    return () => unsub();
  }, [selectedChat]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;

    try {
      const text = replyText;
      setReplyText('');
      
      const { getDoc, setDoc } = await import('firebase/firestore');
      const chatRef = doc(db, 'chats', selectedChat);
      const chatSnap = await getDoc(chatRef);
      
      await addDoc(collection(db, 'chats', selectedChat, 'messages'), {
        text,
        senderId: 'admin',
        recipientId: selectedChat,
        sender: 'admin',
        timestamp: serverTimestamp(),
        chatId: selectedChat
      });

      if (!chatSnap.exists()) {
        const associatedUser = users.find(u => u.id === selectedChat || u.phoneNumber === selectedChat);
        await setDoc(chatRef, {
          userName: associatedUser?.fullName || 'Anonymous User',
          lastMessage: text,
          lastUpdated: serverTimestamp(),
          status: 'active'
        });
      } else {
        await updateDoc(chatRef, {
          lastMessage: text,
          lastUpdated: serverTimestamp()
        });
      }

      WebApp.HapticFeedback.impactOccurred('light');
    } catch (e) {
      console.error("Reply error", e);
    }
  };

  const handleActivate = () => {
    WebApp.HapticFeedback.notificationOccurred('success');
    localStorage.setItem('admin_console_activated', 'true');
    setIsActivated(true);
  };

  const handleUploadTask = async (e: any) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskUrl.trim()) {
      alert("Please fill in the Title and Video URL!");
      return;
    }
    
    setIsUploadingTask(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title: taskTitle.trim(),
        url: taskUrl.trim(),
        level: taskLevel.toUpperCase(),
        commission: parseFloat(taskCommission) || 5.0,
        category: taskCategory.toUpperCase(),
        timestamp: serverTimestamp() || new Date()
      });
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setTaskTitle('');
      setTaskUrl('');
      setTaskCommission('');
      alert("Video Task uploaded successfully into the task center!");
    } catch (err: any) {
      console.error("Task upload error:", err);
      alert("Failed to upload task: " + err.message);
    } finally {
      setIsUploadingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      WebApp.HapticFeedback.notificationOccurred('success');
      setSuccessToast("Video task deleted successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("Task deletion error:", err);
      setSuccessToast("Failed to delete video task: " + err.message);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setSelectedAdFileName("Compressing image... " + file.name);
    try {
      // Scale down to max 1000px and compress to high-quality JPEG (around 40-100KB)
      const compressedBase64 = await compressImage(file, 1000, 1000, 0.75);
      setSelectedAdFileBase64(compressedBase64);
      setSelectedAdFileName(file.name);
    } catch (err: any) {
      console.error("Compression error:", err);
      alert("Failed to read and compress image check your file format.");
      setSelectedAdFileName("");
    }
  };

  const handleUploadAd = async (e: any) => {
    e.preventDefault();
    if (!selectedAdFileBase64) {
      alert("Please choose/upload an image from your gallery first!");
      return;
    }
    
    setIsUploadingAd(true);
    try {
      await addDoc(collection(db, 'advertisements'), {
        imageUrl: selectedAdFileBase64,
        timestamp: serverTimestamp() || new Date()
      });
      
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
      setSelectedAdFileBase64(null);
      setSelectedAdFileName('');
      setSuccessToast("Advertisement Image published successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("Ad upload error:", err);
      alert("Failed to add Ad: " + err.message);
    } finally {
      setIsUploadingAd(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      setDeletingAdId(adId);
      await deleteDoc(doc(db, 'advertisements', adId));
      WebApp.HapticFeedback.notificationOccurred('success');
      setSuccessToast("Advertisement removed successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("Ad delete error:", err);
      alert("Failed to delete Ad: " + err.message);
    } finally {
      setDeletingAdId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const confirmed = window.confirm("Are you absolutely sure you want to permanently delete this user? This action cannot be undone.");
      if (!confirmed) return;

      WebApp.HapticFeedback.notificationOccurred('warning');
      await deleteDoc(doc(db, 'users', userId));
      
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      
      if (selectedUserForManagement && selectedUserForManagement.id === userId) {
        setSelectedUserForManagement(null);
      }
      
      setSuccessToast("User permanently removed from system!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error("User deletion error:", err);
      alert("Failed to delete user: " + err.message);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      WebApp.HapticFeedback.impactOccurred('light');
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await setDoc(doc(db, 'users', userId), { status: newStatus }, { merge: true });
      
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );

      if (selectedUserForManagement && selectedUserForManagement.id === userId) {
        setSelectedUserForManagement((prev: any) => ({
          ...prev,
          status: newStatus
        }));
      }
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const handleUpdateUserPassword = async (userId: string, newPassword: string) => {
    try {
      if (!newPassword || newPassword.trim().length < 4) {
        alert("Please enter a valid password (at least 4 characters)");
        return;
      }
      WebApp.HapticFeedback.impactOccurred('medium');
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        password: newPassword.trim()
      }, { merge: true });
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setSuccessToast(`Successfully updated user password to ${newPassword.trim()}!`);
      setTimeout(() => setSuccessToast(null), 3000);
      
      setUsers((prevUsers) => 
        prevUsers.map(u => u.id === userId ? { ...u, password: newPassword.trim() } : u)
      );

      if (selectedUserForManagement && selectedUserForManagement.id === userId) {
        setSelectedUserForManagement((prev: any) => ({
          ...prev,
          password: newPassword.trim()
        }));
      }
      setNewPasswordInput('');
    } catch (err: any) {
      console.error("Password update error:", err);
      alert("Failed to update password: " + err.message);
    }
  };

  const handleAdjustUserBalance = async (userId: string, targetWallet: 'personal' | 'income', action: 'add' | 'reduce', amount: number) => {
    try {
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount greater than 0");
        return;
      }
      WebApp.HapticFeedback.impactOccurred('medium');
      const userRef = doc(db, 'users', userId);
      const { increment } = await import('firebase/firestore');
      const adjustment = action === 'add' ? amount : -amount;
      
      await setDoc(userRef, {
        [targetWallet]: increment(adjustment)
      }, { merge: true });
      
      WebApp.HapticFeedback.notificationOccurred('success');
      setSuccessToast(`Successfully ${action === 'add' ? 'added' : 'reduced'} ${amount} ETB!`);
      setTimeout(() => setSuccessToast(null), 3000);
      
      if (selectedUserForManagement && selectedUserForManagement.id === userId) {
        setSelectedUserForManagement((prev: any) => ({
          ...prev,
          [targetWallet]: (prev[targetWallet] || 0) + adjustment
        }));
      }
    } catch (err: any) {
      console.error("Balance adjustment error:", err);
      alert("Failed to adjust balance: " + err.message);
    }
  };

  const handleApproveRecharge = async (rechargeId: string) => {
    try {
      setProcessingId(rechargeId);
      WebApp.HapticFeedback.impactOccurred('medium');
      
      const rechargeRef = doc(db, 'recharges', rechargeId);
      const rechargeSnap = recharges.find(r => r.id === rechargeId);
      
      if (!rechargeSnap) throw new Error("Recharge document not found in state");

      const userId = rechargeSnap.userId;
      const amount = rechargeSnap.amount;

      // Update recharge status
      await updateDoc(rechargeRef, { status: 'approved' });

      // Update user balance in their profile document
      // We'll update the 'personal' field as requested
      const userRef = doc(db, 'users', userId);
      
      const { increment } = await import('firebase/firestore');
      await setDoc(userRef, {
        personal: increment(amount),
        totalRecharged: increment(amount)
      }, { merge: true });

      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRecharge = async (rechargeId: string) => {
    try {
      setProcessingId(rechargeId);
      await updateDoc(doc(db, 'recharges', rechargeId), { status: 'rejected' });
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Rejection error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      WebApp.HapticFeedback.impactOccurred('medium');
      await updateDoc(doc(db, 'withdrawals', withdrawalId), { status: 'approved' });
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      WebApp.HapticFeedback.impactOccurred('medium');

      const { doc: firestoreDoc, getDoc, updateDoc, increment } = await import('firebase/firestore');
      const wRef = firestoreDoc(db, 'withdrawals', withdrawalId);
      const wSnap = await getDoc(wRef);
      if (!wSnap.exists()) {
        console.error("Withdrawal record not found");
        return;
      }

      const wData = wSnap.data();
      if (wData.status === 'rejected') {
        console.warn("Withdrawal is already rejected");
        return;
      }
      if (wData.status === 'approved') {
        console.warn("Withdrawal is already approved");
        return;
      }

      const userId = wData.userId;
      const amount = Number(wData.amount) || 0;
      const wallet = (wData.wallet || 'INCOME').toUpperCase(); // INCOME or PERSONAL

      // Update withdrawal status to rejected
      await updateDoc(wRef, { status: 'rejected' });

      // Return the amount to user's wallet (either income or personal)
      if (userId && amount > 0) {
        const userRef = firestoreDoc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const walletFieldName = wallet.toLowerCase(); // 'income' or 'personal'
          await updateDoc(userRef, {
            [walletFieldName]: increment(amount)
          });
          console.log(`Successfully returned ${amount} to user ${userId}'s ${walletFieldName} wallet`);
        } else {
          console.warn(`User ${userId} not found, could not return withdrawal funds`);
        }
      }

      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Rejection error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRecharge = async (rechargeId: string) => {
    try {
      setProcessingId(rechargeId);
      await deleteDoc(doc(db, 'recharges', rechargeId));
      setConfirmDeleteId(null);
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Delete recharge error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      await deleteDoc(doc(db, 'withdrawals', withdrawalId));
      setConfirmDeleteId(null);
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error("Delete withdrawal error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWipeAllUsers = async () => {
    if (wipeCodeInput !== MASTER_CODE) {
      alert("Invalid verification code! Please type 2026 to verify.");
      return;
    }
    
    setIsWipingSystem(true);
    try {
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      
      // 1. Fetch and delete all recharges
      const rechargesSnap = await getDocs(collection(db, 'recharges'));
      for (const d of rechargesSnap.docs) {
        try {
          await deleteDoc(doc(db, 'recharges', d.id));
        } catch (e) {
          console.warn("Could not delete recharge doc", d.id, e);
        }
      }

      // 2. Fetch and delete all withdrawals
      const withdrawalsSnap = await getDocs(collection(db, 'withdrawals'));
      for (const d of withdrawalsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'withdrawals', d.id));
        } catch (e) {
          console.warn("Could not delete withdrawal doc", d.id, e);
        }
      }

      // 3. Fetch and delete all chats
      const chatsSnap = await getDocs(collection(db, 'chats'));
      for (const d of chatsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'chats', d.id));
        } catch (e) {
          console.warn("Could not delete chat doc", d.id, e);
        }
      }

      // 4. Fetch and delete all commissions
      const commissionsSnap = await getDocs(collection(db, 'commissions'));
      for (const d of commissionsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'commissions', d.id));
        } catch (e) {
          console.warn("Could not delete commission doc", d.id, e);
        }
      }

      // 5. Fetch and delete all salary payouts
      const salarySnap = await getDocs(collection(db, 'salary_payouts'));
      for (const d of salarySnap.docs) {
        try {
          await deleteDoc(doc(db, 'salary_payouts', d.id));
        } catch (e) {
          console.warn("Could not delete salary payout doc", d.id, e);
        }
      }

      // 6. Fetch and delete all users except admin
      const usersSnap = await getDocs(collection(db, 'users'));
      let deletedCount = 0;
      for (const d of usersSnap.docs) {
        const id = d.id;
        const phone = id.trim();
        // Admin numbers to protect: 0926193920 and 926193920
        const isAdminPhone = phone === '0926193920' || phone === '926193920';
        
        if (!isAdminPhone) {
          try {
            await deleteDoc(doc(db, 'users', id));
            deletedCount++;
          } catch (e) {
            console.error("Error deleting user document:", id, e);
          }
        }
      }

      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
      setSuccessToast(`System wiped successfully! Deleted ${deletedCount} user records.`);
      setTimeout(() => setSuccessToast(null), 4000);
      
      setShowWipeConfirm(false);
      setWipeCodeInput('');
      
      // Refresh admin dataset
      fetchAdminData();
    } catch (err: any) {
      console.error("Purging database error:", err);
      setError(`Failed to purge database records: ${err?.message || err}`);
    } finally {
      setIsWipingSystem(false);
    }
  };

  const handleSystemReset = async () => {
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.notificationOccurred('warning');
    }
    
    const activeUserId = getUserDocId();
    if (activeUserId && activeUserId !== 'guest') {
      try {
        const { doc, setDoc, deleteDoc, collection, getDocs } = await import('firebase/firestore');
        
        // 1. Delete all recharges
        const rechargesSnap = await getDocs(collection(db, 'recharges'));
        for (const d of rechargesSnap.docs) {
          try {
            await deleteDoc(doc(db, 'recharges', d.id));
          } catch (e) {
            console.error("Error deleting recharge:", d.id, e);
          }
        }

        // 2. Delete all withdrawals
        const withdrawalsSnap = await getDocs(collection(db, 'withdrawals'));
        for (const d of withdrawalsSnap.docs) {
          try {
            await deleteDoc(doc(db, 'withdrawals', d.id));
          } catch (e) {
            console.error("Error deleting withdrawal:", d.id, e);
          }
        }

        // 3. Delete all chats
        const chatsSnap = await getDocs(collection(db, 'chats'));
        for (const d of chatsSnap.docs) {
          try {
            await deleteDoc(doc(db, 'chats', d.id));
          } catch (e) {
            console.error("Error deleting chat:", d.id, e);
          }
        }

        // 4. Reset or delete users
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const d of usersSnap.docs) {
          const userData = d.data();
          if (d.id === activeUserId) {
            // Keep the admin user alive but restore starting values
            await setDoc(doc(db, 'users', d.id), {
              personal: 0.00,
              income: 0.00,
              workDeposit: 0.00,
              completedTaskIds: [],
              onboardingClaimed: false,
              currentLevel: 'INTERN',
              status: 'active',
              role: 'admin',
              totalRecharged: 0,
              totalWithdrawn: 0,
              invitedBy: "",
              investments: []
            });
          } else if (userData.role !== 'admin') {
            // Delete all other non-admin users to clean up registrations and referral trees
            try {
              await deleteDoc(doc(db, 'users', d.id));
            } catch (e) {
              console.error("Error deleting user:", d.id, e);
            }
          }
        }
      } catch (err) {
        console.error("Error resetting application in Firestore:", err);
      }
    }
    
    // Sign out from Firebase Auth to prevent automatic session restoration upon reload
    if (auth) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Error signing out user:", err);
      }
    }
    
    // Clear local storage and session
    localStorage.clear();
    
    // Reload page to start completely fresh
    window.location.reload();
  };

  const adminCount = users.filter(u => u.role === 'admin').length || 2;
  const regularCount = users.filter(u => {
    if (u.role === 'admin') return false;
    const levelStr = (u.currentLevel || 'INTERN').toUpperCase();
    return levelStr !== 'INTERN';
  }).length;

  const stats = [
    { label: 'Total Users', value: users.length || 38, color: 'text-white' },
    { label: 'Admins', value: adminCount, color: 'text-amber-500' },
    { label: 'Regular Users', value: users.length ? regularCount : 36, color: 'text-blue-400' }
  ];

  const handleDistributeSalaries = async () => {
    setDistributingSalaries(true);
    setSalaryError(null);
    setSalaryResults(null);
    WebApp.HapticFeedback.impactOccurred('medium');

    try {
      const res = await fetch("/api/admin/distribute-salaries", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setSalaryResults(data.results || []);
        WebApp.HapticFeedback.notificationOccurred('success');
        
        // Refresh recent salaries count
        try {
          const { getDocs, collection } = await import('firebase/firestore');
          const salarySnap = await getDocs(collection(db, 'salary_payouts'));
          const salaries = salarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          salaries.sort((a: any, b: any) => {
            const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
            const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
            return tB - tA;
          });
          setRecentSalaries(salaries);
        } catch (e) {
          console.warn("Could not reload salaries after distribution:", e);
        }
      } else {
        throw new Error(data.error || "Failed to distribute salaries.");
      }
    } catch (err: any) {
      console.error("Error distributing salaries:", err);
      setSalaryError(err?.message || String(err));
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setDistributingSalaries(false);
    }
  };

  const handleExit = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    localStorage.removeItem('admin_console_activated');
    setIsActivated(false);
    onBack();
  };

  const filteredUsers = users.filter(u => {
    // 1. Filter by category (ALL, INTERN, REGULAR)
    const levelStr = (u.currentLevel || 'INTERN').toUpperCase();
    if (userFilter === 'INTERN' && levelStr !== 'INTERN') return false;
    if (userFilter === 'REGULAR' && levelStr === 'INTERN') return false;

    // 2. Filter by search query (case-insensitive check for Phone, Name, or ID)
    if (userSearchQuery.trim() !== '') {
      const q = userSearchQuery.toLowerCase();
      const phone = (u.phoneNumber || '').toLowerCase();
      const name = (u.fullName || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      return phone.includes(q) || name.includes(q) || id.includes(q);
    }

    return true;
  });

  return (
    <div className="h-[90vh] sm:h-[80vh] bg-[#0A0F1E] text-white p-6 pb-24 rounded-t-[32px] sm:rounded-3xl relative overflow-y-auto font-sans no-scrollbar">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-20 right-[-10%] w-[30%] h-[30%] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-[18px] flex items-center justify-center relative shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <div className="absolute inset-[15%] rounded-lg bg-amber-500/10 blur-sm" />
            <Shield size={22} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </div>
          <div>
            <h1 className="text-lg font-black italic tracking-tighter leading-none uppercase">Admin Console</h1>
            <p className="text-[8px] font-black tracking-[0.2em] text-gray-500 uppercase mt-0.5">System Oversight</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button 
            onClick={fetchAdminData}
            title="Refresh Data"
            disabled={loading}
            className={`w-10 h-10 ${loading ? 'opacity-50' : 'active:scale-90'} bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center transition-all text-emerald-500`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExit}
            className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center active:scale-90 transition-transform text-rose-500"
          >
            <LogOut size={16} />
          </button>
          <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
            <Bell size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="py-20 text-center px-4 max-w-sm mx-auto">
            <AlertCircle className="mx-auto text-rose-500 mb-4" size={40} />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-6">{error}</p>
            <button 
              onClick={fetchAdminData}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl active:scale-95 transition-all text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20"
            >
              Try Reconnecting
            </button>
        </div>
      ) : !isActivated ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xs space-y-8 text-center"
          >
            <div className="mx-auto w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-[30px] flex items-center justify-center text-amber-500">
              <Shield size={40} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Console Locked</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Authorized Access Only</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleActivate}
                className="w-full py-5 bg-amber-500 text-[#0A0F1E] rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-lg hover:bg-amber-400"
              >
                Activate Console
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-8 relative z-10">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-[#12182B]/60 border border-white/5 rounded-[24px] p-4 flex flex-col items-center justify-center text-center backdrop-blur-md relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-[24px] pointer-events-none" />
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 leading-tight">{stat.label}</p>
                <p className={cn("text-xl font-black italic tracking-tighter", stat.color)}>{stat.value}</p>
                <div className="w-6 h-1 bg-amber-500/20 rounded-full mt-2" />
              </div>
            ))}
          </div>

          {/* Navigation Tabs - Horizontal Scroll on Mobile */}
          <div className="bg-[#12182B]/60 border border-white/5 rounded-[24px] p-1 mb-6 relative z-10 backdrop-blur-md overflow-x-auto no-scrollbar">
            <div className="flex gap-1 min-w-max w-full">
              {(['DEPOSITS', 'WITHDRAWALS', 'USERS', 'TASKS', 'ADS', 'PAYMENTS'] as AdminTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-3 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all relative overflow-hidden flex-1 min-w-[90px]",
                    activeTab === tab ? "text-[#0A0F1E] bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <span className="relative z-10">{tab.toLowerCase()}</span>
                  {activeTab === tab && (
                    <motion.div layoutId="tab-pill" className="absolute inset-0 bg-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Salaries Panel (Only for Users tab) */}
          {activeTab === 'USERS' && (
            <div className="bg-[#12182B]/80 border border-white/5 rounded-[24px] p-5 mb-6 relative z-10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">Monthly Position Salaries</h3>
                    <p className="text-[9px] text-slate-400 font-bold">Pay salaries instantly to all qualified leaders based on their team volume.</p>
                  </div>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-300 mb-4 bg-[#0A0F1E]/60 p-3 rounded-2xl space-y-1 font-semibold leading-relaxed">
                <p>• Pays base salaries depending on level 1 direct reports & team tree depth.</p>
                <p>• Ensures precise, secure single execution per user per month (e.g., YYYY-MM document locking).</p>
                <p>• Adds transaction logs to <span className="text-amber-500 font-black">bonuses</span> of the respective recipients automatically.</p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={handleDistributeSalaries}
                  disabled={distributingSalaries}
                  className={cn(
                    "px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer",
                    distributingSalaries
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-600 text-[#0A0F1E] shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                  )}
                >
                  {distributingSalaries ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Paying Salaries...
                    </>
                  ) : (
                    "Trigger Salary Distribution"
                  )}
                </button>

                {salaryResults && (
                  <button
                    onClick={() => setSalaryResults(null)}
                    className="px-4 py-3 bg-[#1A1F2E] border border-white/5 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:text-white tracking-widest transition-all cursor-pointer"
                  >
                    Clear Results
                  </button>
                )}
              </div>

              {salaryError && (
                <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 font-mono">
                  Error: {salaryError}
                </div>
              )}

              {salaryResults && (
                <div className="mt-4 border-t border-white/5 pt-4 space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Salary Distribution Results:</h4>
                  {salaryResults.length === 0 ? (
                    <p className="text-[9px] font-bold text-slate-500 uppercase">No eligible users found qualified for a pending salary payout today.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-[9px] font-mono">
                      {salaryResults.map((res: any, idx: number) => (
                        <div key={idx} className={cn(
                          "p-2.5 rounded-xl flex items-center justify-between gap-3 text-slate-300 font-semibold",
                          res.status === "PAID" ? "bg-emerald-500/10 border border-emerald-500/10" : "bg-[#1A1F2E]/80"
                        )}>
                          <div>
                            <span className="font-bold text-white">{res.fullName} ({res.userId})</span>
                            <div className="text-[8px] text-slate-400">{res.position}</div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "font-black uppercase text-[8px] tracking-wider shrink-0 px-2 py-0.5 rounded-full",
                              res.status === "PAID" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                            )}>
                              {res.status === "PAID" ? `+ ${res.salary} ETB` : res.status}
                            </span>
                            {res.error && <p className="text-[7px] text-rose-400 mt-1">{res.error}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recently Paid Salaries Section */}
              {(() => {
                const now = new Date();
                const utcTime = now.getTime();
                const eatTime = new Date(utcTime + 3 * 60 * 60 * 1000);
                const currentMonthStr = eatTime.toISOString().substring(0, 7);
                const currentMonthName = eatTime.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                const currentMonthSalaries = recentSalaries.filter(s => s.month === currentMonthStr);
                const totalMonthPaid = currentMonthSalaries.reduce((acc, curr) => acc + (curr.salaryAmount || 0), 0);

                return (
                  <div className="mt-5 border-t border-white/5 pt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Recently Paid Salaries ({currentMonthName})</h4>
                        <p className="text-[8px] text-slate-400 font-bold">Audit records of leadership payouts executed in {currentMonthStr}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Paid This Month</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          ETB {totalMonthPaid.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {loadingSalaries ? (
                      <div className="py-4 text-center text-[9px] font-black uppercase text-slate-500 tracking-widest animate-pulse">
                        Refreshing Audit Log...
                      </div>
                    ) : currentMonthSalaries.length === 0 ? (
                      <div className="bg-[#0A0F1E]/40 border border-white/5 p-4 rounded-xl text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No salary payouts recorded for {currentMonthName} yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {currentMonthSalaries.map((payout, idx) => {
                          const payoutDate = payout.timestamp?.toDate 
                            ? payout.timestamp.toDate() 
                            : (payout.timestamp ? new Date(payout.timestamp) : null);
                          const formattedDate = payoutDate 
                            ? payoutDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'Unknown';

                          return (
                            <div 
                              key={payout.id || idx} 
                              className="p-3 bg-[#0A0F1E]/60 border border-white/5 rounded-2xl flex items-center justify-between gap-4 hover:border-amber-500/20 transition-all group"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black text-slate-200 truncate group-hover:text-amber-500 transition-colors">
                                    {payout.fullName || 'User'}
                                  </span>
                                  <span className="text-[8px] font-mono font-bold text-slate-400">
                                    ({payout.userId})
                                  </span>
                                </div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                                  {payout.position}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-black text-emerald-400 font-mono block">
                                  + ETB {payout.salaryAmount?.toLocaleString() || '0'}
                                </span>
                                <span className="text-[7.5px] font-mono text-slate-500">
                                  {formattedDate}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Wipe Users / Zero Member Maintenance Panel (Only for Users tab) */}
          {activeTab === 'USERS' && (
            <div className="bg-rose-950/10 border border-rose-500/10 rounded-[24px] p-5 mb-6 relative z-10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-rose-400">Zero-Member System Clearance</h3>
                    <p className="text-[9px] text-slate-400 font-bold">Permanently remove all members from the database except the administrator.</p>
                  </div>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-300 mb-4 bg-[#0A0F1E]/60 p-3 rounded-2xl space-y-1 font-semibold leading-relaxed border border-rose-500/5">
                <p>• Completely deletes all user registration records in the <span className="text-rose-400 font-bold">users</span> collection (except the system admin <span className="text-amber-500 font-bold">0926193920</span>).</p>
                <p>• Cleans up all transactional logs (recharges, withdrawals, commissions, and salary payouts) to avoid orphaned database logs.</p>
                <p>• <span className="text-amber-500 font-bold">Note:</span> This action is absolutely irreversible and set back the member count to zero.</p>
              </div>

              {!showWipeConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowWipeConfirm(true);
                    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('warning');
                  }}
                  className="px-5 py-3 bg-[#FF453A]/10 hover:bg-[#FF453A]/20 border border-[#FF453A]/20 transition-all rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-[0.98] text-[#FF453A] cursor-pointer"
                >
                  Wipe All Users & Reset System
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-red-950/20 border border-red-500/20 rounded-2xl">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-red-400 tracking-wider leading-normal">
                      ⚠️ WARNING: Enter authorization code <span className="text-white hover:underline">"{MASTER_CODE}"</span> to finalize the database purge
                    </p>
                    <input
                      type="text"
                      placeholder="Enter activation code (default: 2026)"
                      value={wipeCodeInput}
                      onChange={(e) => setWipeCodeInput(e.target.value)}
                      className="w-full max-w-xs bg-[#12182B]/60 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-500 transition-all placeholder:text-[10px] placeholder:uppercase placeholder:tracking-wider placeholder:text-gray-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isWipingSystem}
                      onClick={handleWipeAllUsers}
                      className="px-5 py-3 bg-[#FF453A] hover:bg-[#FF453A]/90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,69,58,0.2)]"
                    >
                      {isWipingSystem ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Purging Database...
                        </>
                      ) : (
                        "Confirm & Purge"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isWipingSystem}
                      onClick={() => {
                        setShowWipeConfirm(false);
                        setWipeCodeInput('');
                        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
                      }}
                      className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Filters (Only for Users) */}
          {activeTab === 'USERS' && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6 relative z-10">
              {/* Filter Tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {(['ALL', 'INTERN', 'REGULAR'] as UserFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setUserFilter(f);
                      WebApp.HapticFeedback.impactOccurred('light');
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0",
                      userFilter === f 
                        ? "bg-amber-500 text-[#0A0F1E] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                        : "bg-[#1A1F2E]/60 border-white/5 text-gray-500"
                    )}
                  >
                    {f} USERS
                  </button>
                ))}
              </div>

              {/* Search Input Bar */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search user by name, phone, or ID..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#12182B]/60 border border-white/5 rounded-xl pl-10 pr-16 py-2.5 text-xs font-bold text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-[10px] placeholder:uppercase placeholder:tracking-wider"
                />
                {userSearchQuery && (
                  <button 
                    onClick={() => {
                      setUserSearchQuery('');
                      WebApp.HapticFeedback.impactOccurred('light');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-[#FF453A] hover:opacity-85 active:scale-95 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="space-y-4 relative z-10">
            {activeTab === 'USERS' && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                   <div className="py-20 text-center opacity-45 bg-[#12182B]/20 border border-white/5 rounded-[32px] p-6 backdrop-blur-md">
                     <Users size={32} className="mx-auto mb-3 text-amber-500/60 animate-bounce" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No matching users found</p>
                     {userSearchQuery && (
                       <p className="text-[9px] text-gray-500 mt-1.5 font-mono">
                         For query: "{userSearchQuery}"
                       </p>
                     )}
                   </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isActive = user.status !== 'inactive';
                    return (
                      <div key={user.id} className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-5 flex flex-col sm:flex-row sm:items-center gap-4 backdrop-blur-md group hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                            isActive 
                              ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]" 
                              : "bg-rose-500/10 text-rose-500"
                          )}>
                            <UserIcon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-sm font-black italic tracking-tighter text-white uppercase truncate">
                                {user.fullName || 'Anonymous User'}
                              </h4>
                              <span className="text-[10px] font-mono font-bold text-gray-400">
                                ({user.phoneNumber || user.id})
                              </span>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                user.currentLevel === 'INTERN' || !user.currentLevel ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                              )}>
                                {user.currentLevel || 'INTERN'}
                              </span>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                              )}>
                                {isActive ? 'ACTIVE' : 'FROZEN'}
                              </span>
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex-wrap">
                              <p>Personal: <span className="text-emerald-400 font-mono">{(user.personal !== undefined ? Number(user.personal) : 0.00).toFixed(2)} ETB</span></p>
                              <p>Income: <span className="text-amber-400 font-mono">{(user.income !== undefined ? Number(user.income) : 0.00).toFixed(2)} ETB</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForManagement(user);
                                setAdjustAmountStr('');
                                setWalletToAdjust('personal');
                                setAdminTeamTab('A');
                                WebApp.HapticFeedback.impactOccurred('medium');
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-[#0A0F1E] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] flex-1 sm:flex-none text-center"
                            >
                              Manage User
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(user.id, 'inactive')}
                              className="px-4 py-2 bg-[#1A1F2E] hover:bg-emerald-600/20 hover:text-emerald-400 active:scale-95 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/5 flex-1 sm:flex-none text-center"
                            >
                              Unfreeze / Activate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-black text-rose-500 active:scale-95 rounded-xl border border-rose-500/20 transition-all flex items-center justify-center shrink-0 w-9 h-9"
                            title="Delete User Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'DEPOSITS' && (
              <div className="space-y-4">
                {/* Status Segmented Control */}
                <div className="flex gap-1.5 p-1 bg-[#12182B]/80 border border-white/5 rounded-2xl">
                  {(['pending', 'approved', 'rejected'] as const).map((filter) => {
                    const count = recharges.filter(r => (r.status || 'pending').toLowerCase() === filter).length;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => {
                          setRechargeFilter(filter);
                          WebApp.HapticFeedback.impactOccurred('light');
                        }}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                          rechargeFilter === filter 
                            ? "bg-amber-500 text-[#0A0F1E] shadow-md shadow-amber-500/10" 
                            : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        {filter} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                   {recharges
                     .filter(r => (r.status || 'pending').toLowerCase() === rechargeFilter)
                     .map(item => {
                    const linkedUser = users.find(u => u.id === item.userId || u.phoneNumber === item.userId);
                    return (
                      <div key={item.id} className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-5 backdrop-blur-md">
                         {/* Associated Recharge User Information */}
                         <div className="mb-4 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-2.5">
                             <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/10">
                               <UserIcon size={14} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-white uppercase italic">{linkedUser?.fullName || 'Anonymous User'}</p>
                               <p className="text-[8px] font-mono font-bold text-gray-500">{linkedUser?.phoneNumber || item.userId}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="text-[8px] font-black uppercase tracking-widest text-amber-500">{linkedUser?.currentLevel || 'INTERN'}</p>
                             <p className="text-[8px] font-mono font-bold text-gray-550">BAL: {(linkedUser?.personal !== undefined ? Number(linkedUser.personal) : 50.0).toFixed(1)} ETB</p>
                           </div>
                         </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <ArrowUpCircle className="text-amber-500" size={20} />
                          <div>
                            <p className="text-sm font-black italic text-white">ETB {item.amount.toLocaleString()}</p>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.method}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-300">{item.transactionId}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">REF ID / FT CODE</p>
                        </div>
                      </div>
                      
                      {item.proofImageUrl && (
                        <div className="mb-4 bg-white/5 rounded-2xl border border-white/5 overflow-hidden group/img relative">
                          <img 
                            src={item.proofImageUrl} 
                            alt="Payment Proof" 
                            className="w-full h-48 object-contain bg-black/40"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setPreviewImage(item.proofImageUrl)}
                              className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                            >
                              Expand View
                            </button>
                          </div>
                        </div>
                      )}

                      {rechargeFilter !== 'pending' ? (
                        <div className="space-y-2">
                          <div className={cn(
                            "py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border font-mono w-full",
                            (item.status || 'pending').toLowerCase() === 'approved'
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          )}>
                            Status: {item.status.toUpperCase()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              WebApp.HapticFeedback.impactOccurred('medium');
                              if (confirmDeleteId === item.id) {
                                handleDeleteRecharge(item.id);
                              } else {
                                setConfirmDeleteId(item.id);
                                setTimeout(() => setConfirmDeleteId(prev => prev === item.id ? null : prev), 4000);
                              }
                            }}
                            className={cn(
                              "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-center",
                              confirmDeleteId === item.id
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-white/5 hover:bg-[#EF4444]/10 text-gray-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30"
                            )}
                          >
                            <Trash2 size={12} className="shrink-0" />
                            {confirmDeleteId === item.id ? "Confirm Permanently Delete?" : "Delete Record"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button 
                            type="button"
                            onClick={() => handleApproveRecharge(item.id)}
                            className="flex-1 py-3 bg-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-[#0A0F1E]"
                          >
                            Approve
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRejectRecharge(item.id)}
                            className="flex-1 py-3 bg-rose-600/20 border border-rose-600/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    );
                 })}
                  {recharges.filter(r => (r.status || 'pending').toLowerCase() === rechargeFilter).length === 0 && (
                    <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest">
                      No {rechargeFilter} deposits found
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'WITHDRAWALS' && (
              <div className="space-y-4">
                {/* Status Segmented Control */}
                <div className="flex gap-1.5 p-1 bg-[#12182B]/80 border border-white/5 rounded-2xl">
                  {(['pending', 'approved', 'rejected'] as const).map((filter) => {
                     const count = withdrawals.filter(w => (w.status || 'pending').toLowerCase() === filter).length;
                     return (
                       <button
                         key={filter}
                         type="button"
                         onClick={() => {
                           setWithdrawalFilter(filter);
                           WebApp.HapticFeedback.impactOccurred('light');
                         }}
                         className={cn(
                           "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                           withdrawalFilter === filter 
                             ? "bg-amber-500 text-[#0A0F1E] shadow-md shadow-amber-500/10" 
                             : "text-gray-500 hover:text-gray-300"
                         )}
                       >
                         {filter} ({count})
                       </button>
                     );
                  })}
                </div>

                <div className="space-y-3">
                   {[...withdrawals]
                     .filter(w => (w.status || 'pending').toLowerCase() === withdrawalFilter)
                     .sort((a, b) => {
                       const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : (a.timestamp ? new Date(a.timestamp) : new Date(0));
                       const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : (b.timestamp ? new Date(b.timestamp) : new Date(0));
                       return dateB.getTime() - dateA.getTime();
                     })
                     .map(item => (
                   <div key={item.id} className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-5 backdrop-blur-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Wallet className="text-rose-500" size={20} />
                          <div>
                            <p className="text-sm font-black italic text-white">ETB {item.amount.toLocaleString()}</p>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.wallet} WALLET</p>
                             <div className="flex items-center gap-1.5 flex-wrap mt-1">
                               <p className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Requested:</p>
                               {(() => {
                                 const reqDate = item.timestamp?.toDate ? item.timestamp.toDate() : (item.timestamp ? new Date(item.timestamp) : null);
                                 const formattedReq = reqDate 
                                   ? reqDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                                   : null;
                                 return (
                                   <span className="text-[8px] font-bold text-slate-200 font-mono bg-[#0A0F1E]/80 border border-white/5 px-2 py-0.5 rounded-full leading-none">
                                     {formattedReq || 'Pending Timestamp'}
                                   </span>
                                 );
                               })()}
                             </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-amber-500 italic">{item.bankName}</p>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{item.accountNumber}</p>
                        </div>
                      </div>

                      {/* Income Wallet Tax Breakdown Box */}
                      {((item.wallet || '').toUpperCase() === 'INCOME') && (
                        <div className="mb-3.5 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Income Tax Deduction (10%)</p>
                            <p className="text-[8px] text-gray-400 uppercase tracking-widest leading-none">Standard Admin Fee Deducted</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 font-mono">Tax: -ETB {(item.amount * 0.1).toFixed(0)}</p>
                            <p className="text-xs font-black text-emerald-400 italic mt-0.5">Net Payable: ETB {(item.amount * 0.9).toFixed(0)}</p>
                          </div>
                        </div>
                      )}

                      {/* Destination account for this withdrawal */}
                      <div className="mb-3.5 p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-2xl space-y-2.5">
                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest leading-none">Destination Bank Account (Withdrawal Request)</p>
                        <div className="grid grid-cols-2 gap-3 text-xs leading-none">
                          <div>
                            <span className="text-[8px] text-gray-400 block uppercase font-mono mt-0.5 mb-1">Target Bank Name</span>
                            <span className="font-bold text-white uppercase italic">{item.bankName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block uppercase font-mono mt-0.5 mb-1">Target Account Number</span>
                            <span className="font-mono text-amber-500 font-black">{item.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[8px] text-gray-400 block uppercase font-mono mt-0.5 mb-1">Destination Holder Name</span>
                            <span className="font-bold text-white uppercase italic">{item.accountName || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const linkedUser = users.find(u => u.id === item.userId || u.phoneNumber === item.userId);
                        return (
                          <div className="space-y-3 mb-4">
                            {/* Profile Details link */}
                            <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2.5">
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none">Registered Account Profile Link</p>
                              <div className="grid grid-cols-2 gap-3 text-xs leading-none">
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Registered User Name</span>
                                  <span className="font-bold text-white uppercase italic">{linkedUser?.fullName || 'Anonymous User'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Phone / Login ID</span>
                                  <span className="font-mono text-gray-300 font-bold">{linkedUser?.phoneNumber || item.userId || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Join Password</span>
                                  <span className="font-mono text-amber-500 font-black">{linkedUser?.password || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Payment Secret Pass</span>
                                  <span className="font-mono text-pink-400 font-semibold">
                                    {linkedUser?.bankDetails?.paymentPassword || linkedUser?.paymentPassword || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Registered Bank Account details */}
                            <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2.5">
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Registered Bank Account (Saved in Profile)</p>
                              <div className="grid grid-cols-2 gap-3 text-xs leading-none">
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Registered Bank</span>
                                  <span className="font-bold text-white uppercase italic">{linkedUser?.bankDetails?.bankName || 'Not Linked'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Registered Account Number</span>
                                  <span className="font-mono text-gray-300 font-bold">{linkedUser?.bankDetails?.accountNumber || '•••• •••• ••••'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-[8px] text-gray-500 block uppercase font-black tracking-tight mb-1">Registered Account Holder Name</span>
                                  <span className="font-bold text-white uppercase italic">{linkedUser?.bankDetails?.accountName || 'Not Provided'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {withdrawalFilter !== 'pending' ? (
                        <div className="space-y-2">
                          <div className={cn(
                            "py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border font-mono w-full",
                            (item.status || 'pending').toLowerCase() === 'approved'
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          )}>
                            Status: {item.status.toUpperCase()}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              WebApp.HapticFeedback.impactOccurred('medium');
                              if (confirmDeleteId === item.id) {
                                handleDeleteWithdrawal(item.id);
                              } else {
                                setConfirmDeleteId(item.id);
                                setTimeout(() => setConfirmDeleteId(prev => prev === item.id ? null : prev), 4000);
                              }
                            }}
                            className={cn(
                              "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-center",
                              confirmDeleteId === item.id
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-white/5 hover:bg-[#EF4444]/10 text-gray-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30"
                            )}
                          >
                            <Trash2 size={12} className="shrink-0" />
                            {confirmDeleteId === item.id ? "Confirm Permanently Delete?" : "Delete Record"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button 
                            type="button"
                            onClick={() => handleApproveWithdrawal(item.id)}
                            disabled={processingId === item.id}
                            className="flex-1 py-3 bg-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-[#0A0F1E] disabled:opacity-50"
                          >
                            {processingId === item.id ? 'Processing...' : 'Paid'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRejectWithdrawal(item.id)}
                            disabled={processingId === item.id}
                            className="flex-1 py-3 bg-rose-600/20 border border-rose-600/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                          >
                            {processingId === item.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      )}
                   </div>
                 ))}
                  {withdrawals.filter(w => (w.status || 'pending').toLowerCase() === withdrawalFilter).length === 0 && (
                    <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest">
                      No {withdrawalFilter} withdrawals found
                    </div>
                  )}
                </div>
              </div>
            )}




            {activeTab === 'TASKS' && (
              <div className="space-y-6">
                {/* Upload Form Card */}
                <div className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-6 backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Film size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black italic uppercase tracking-tighter text-white">Upload New Video Task</h4>
                      <p className="text-[8px] font-black tracking-widest text-gray-500 uppercase">Instantly Add to Task Center</p>
                    </div>
                  </div>

                  <form onSubmit={handleUploadTask} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Video Title / Task Name</label>
                      <input 
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Watch Earnova Presentation & Rate"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Job Target Level</label>
                        <select 
                          value={taskLevel}
                          onChange={(e) => setTaskLevel(e.target.value)}
                          className="w-full bg-[#0E1322] border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                        >
                          <option value="ALL">ALL LEVELS</option>
                          <option value="INTERN">INTERN</option>
                          <option value="JOB1">LEVEL 1 (VIP 1)</option>
                          <option value="JOB2">LEVEL 2 (VIP 2)</option>
                          <option value="JOB3">LEVEL 3 (VIP 3)</option>
                          <option value="JOB4">LEVEL 4 (VIP 4)</option>
                          <option value="JOB5">LEVEL 5 (VIP 5)</option>
                          <option value="JOB6">LEVEL 6 (VIP 6)</option>
                          <option value="JOB7">LEVEL 7 (VIP 7)</option>
                          <option value="JOB8">LEVEL 8 (VIP 8)</option>
                          <option value="JOB9">LEVEL 9 (VIP 9)</option>
                          <option value="JOB10">LEVEL 10 (VIP 10)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Commission Reward (ETB)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={taskCommission}
                          onChange={(e) => setTaskCommission(e.target.value)}
                          placeholder="e.g. 5.50"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Video Stream Link (YouTube, TikTok, Movie url, etc.)</label>
                      <input 
                        type="text"
                        value={taskUrl}
                        onChange={(e) => setTaskUrl(e.target.value)}
                        placeholder="e.g. YouTube link, TikTok video link, MP4 file, or any universal movie url..."
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:border-amber-500 outline-none transition-colors"
                      />
                      <span className="text-[8px] font-bold text-gray-500 uppercase block ml-1">Admins can upload unlimited videos from YouTube, TikTok, or direct MP4/Movie URLs. Users watch & rate them to earn.</span>
                    </div>

                    <button 
                      type="submit"
                      disabled={isUploadingTask}
                      className="w-full bg-amber-500 text-[#0A0F1E] py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUploadingTask ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Uploading Video...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="stroke-[3]" />
                          Publish Video Task
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Uploaded List header */}
                <div className="flex justify-between items-center px-2 mt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Active Task Streams ({createdTasks.length})</h4>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                  {createdTasks.length === 0 ? (
                    <div className="bg-[#12182B]/30 border border-dashed border-white/5 rounded-3xl p-10 text-center opacity-40 uppercase font-black text-[9px] tracking-widest">
                      No video tasks uploaded yet
                    </div>
                  ) : (
                    createdTasks.map((task) => (
                      <div key={task.id} className="bg-[#12182B]/60 border border-white/5 rounded-[28px] p-5 flex items-start gap-4 backdrop-blur-md">
                        <div 
                          onClick={() => {
                            WebApp.HapticFeedback.impactOccurred('light');
                            setPreviewVideoUrl(task.url);
                            setPreviewVideoTitle(task.title);
                          }}
                          className="w-12 h-12 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all rounded-2xl text-amber-500 flex flex-col items-center justify-center flex-shrink-0 border border-amber-500/20 cursor-pointer"
                          title="Preview Video Task"
                        >
                          <Play size={18} className="fill-amber-500 animate-pulse" />
                        </div>
                        <div 
                          onClick={() => {
                            WebApp.HapticFeedback.impactOccurred('light');
                            setPreviewVideoUrl(task.url);
                            setPreviewVideoTitle(task.title);
                          }}
                          className="flex-1 min-w-0 space-y-1.5 cursor-pointer hover:opacity-85"
                          title="Preview Video Task"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-[8px] font-black bg-amber-500 text-[#0A0F1E] px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                               {task.level || 'ALL'}
                             </span>
                             <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-widest">
                               +ETB {Number(task.commission || 0).toFixed(2)}
                             </span>
                          </div>
                          <h5 className="text-[12px] font-black text-white uppercase tracking-tight leading-snug">{task.title}</h5>
                          <p className="text-[9px] text-gray-500 truncate font-mono">{task.url}</p>
                        </div>
                        <button 
                          onClick={() => {
                            WebApp.HapticFeedback.notificationOccurred('warning');
                            setDeletingTaskId(task.id);
                          }}
                          className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all self-center active:scale-95 flex-shrink-0"
                          title="Delete Video Task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ADS' && (
              <div id="admin-ads-section" className="space-y-6 relative z-10">
                {/* Upload New Ad Card */}
                <div className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-6 backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Image size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black italic uppercase tracking-tighter text-white">Upload Advertisement Image</h4>
                      <p className="text-[8px] font-black tracking-widest text-gray-500 uppercase">Will be displayed on Home Tab</p>
                    </div>
                  </div>

                  <form onSubmit={handleUploadAd} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Advertisement Banner Image</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          id="ad-gallery-file-input"
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="hidden" 
                        />
                        <label 
                          htmlFor="ad-gallery-file-input"
                          className="flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/10 hover:border-amber-500/50 rounded-2xl cursor-pointer hover:bg-white/10 transition-all text-center min-h-[120px] relative overflow-hidden group"
                        >
                          {selectedAdFileBase64 ? (
                            <div className="space-y-2 w-full">
                              <img 
                                src={selectedAdFileBase64} 
                                alt="Preview" 
                                className="max-h-36 object-contain rounded-xl border border-white/10 mx-auto"
                              />
                              <p className="text-[9px] font-medium text-amber-500 truncate max-w-xs mx-auto">Selected: {selectedAdFileName || 'Image File'}</p>
                              <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Click to choose another image</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-all mx-auto">
                                <Image size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-300">Click to Select From Gallery</p>
                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Supports PNG, JPG, JPEG, WEBP</p>
                              </div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isUploadingAd || !selectedAdFileBase64}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-[#0A0F1E] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      {isUploadingAd ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Publishing Ad...
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          Publish Ad Banner
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Ads Header */}
                <div className="flex justify-between items-center px-2 mt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Active Advertisement Images ({advertisements.length})</h4>
                </div>

                {/* Ads List Grid */}
                {advertisements.length === 0 ? (
                  <div className="bg-[#12182B]/30 border border-dashed border-white/5 rounded-3xl p-10 text-center opacity-40 uppercase font-black text-[9px] tracking-widest">
                    No active advertisements uploaded
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {advertisements.map((ad) => (
                      <div key={ad.id} className="bg-[#12182B]/60 border border-white/5 rounded-[28px] overflow-hidden backdrop-blur-md flex flex-col md:flex-row p-4 gap-4 items-center">
                        <div className="w-24 h-16 rounded-xl bg-[#0F1322] overflow-hidden shrink-0 border border-white/5">
                          <img 
                            src={ad.imageUrl} 
                            alt="Advertisement" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Ad Stream Reference</p>
                          <p className="text-[9px] font-mono text-gray-500 break-all truncate" title={ad.imageUrl}>{ad.imageUrl}</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirmingAdId === ad.id) {
                              handleDeleteAd(ad.id);
                              setConfirmingAdId(null);
                            } else {
                              setConfirmingAdId(ad.id);
                              if (WebApp?.HapticFeedback) {
                                WebApp.HapticFeedback.impactOccurred('medium');
                              }
                            }
                          }}
                          disabled={deletingAdId === ad.id}
                          className={cn(
                            "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 self-center",
                            confirmingAdId === ad.id 
                              ? "bg-amber-500 text-[#0f172a] hover:bg-amber-400 font-extrabold animate-pulse" 
                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                          )}
                        >
                          {deletingAdId === ad.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : confirmingAdId === ad.id ? (
                            <Check size={12} />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          {confirmingAdId === ad.id ? "Confirm?" : "Remove Ad"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'PAYMENTS' && (
              <div id="admin-payments-section" className="space-y-6 relative z-10">
                <div className="bg-[#12182B]/60 border border-white/5 rounded-[32px] p-6 backdrop-blur-md relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black italic uppercase tracking-tighter text-white">Rechargeable Wallets Setup</h4>
                      <p className="text-[8px] font-black tracking-widest text-gray-400 uppercase">Edit payment coordinates displayed to users in Recharge Modal</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsUpdatingPayments(true);
                      try {
                        await setDoc(doc(db, 'system_config', 'payment_info'), {
                          telebirrAccount,
                          telebirrHolder,
                          cbeAccount,
                          cbeHolder,
                          updatedAt: serverTimestamp()
                        }, { merge: true });
                        
                        if (WebApp?.HapticFeedback) {
                          WebApp.HapticFeedback.notificationOccurred('success');
                        }
                        setSuccessToast("Recharge accounts updated successfully!");
                        setTimeout(() => setSuccessToast(null), 3000);
                      } catch (err) {
                        console.error("Error setting payment config:", err);
                        alert("Failed to save changes: " + (err as any).message);
                      } finally {
                        setIsUpdatingPayments(false);
                      }
                    }} 
                    className="space-y-6"
                  >
                    {/* Telebirr Configuration Card */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                        <span className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black font-sans">TB</span>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Telebirr Wallet Coordinates</h5>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Wallet Number (Account)</label>
                          <input 
                            type="text"
                            value={telebirrAccount}
                            onChange={(e) => setTelebirrAccount(e.target.value)}
                            placeholder="e.g. 0926193920"
                            required
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 focus:border-emerald-500 rounded-xl text-xs text-white uppercase focus:outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Account Holder Name</label>
                          <input 
                            type="text"
                            value={telebirrHolder}
                            onChange={(e) => setTelebirrHolder(e.target.value)}
                            placeholder="e.g. Leykun"
                            required
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 focus:border-emerald-500 rounded-xl text-xs text-white uppercase focus:outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CBE Configuration Card */}
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                        <span className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px] font-black font-sans">CBE</span>
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-purple-400">Commercial Bank of Ethiopia (CBE) Birr</h5>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Bank Account Number</label>
                          <input 
                            type="text"
                            value={cbeAccount}
                            onChange={(e) => setCbeAccount(e.target.value)}
                            placeholder="e.g. 1000419524747"
                            required
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 focus:border-purple-500 rounded-xl text-xs text-white uppercase focus:outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Account Holder Name</label>
                          <input 
                            type="text"
                            value={cbeHolder}
                            onChange={(e) => setCbeHolder(e.target.value)}
                            placeholder="e.g. Leykun Jemaneh"
                            required
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 focus:border-purple-500 rounded-xl text-xs text-white uppercase focus:outline-none transition-all placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPayments}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingPayments ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Saving Coordinates...
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          Save Recharge Details
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* SYSTEM UTILITIES & RESET CARD */}
          <div className="mt-8 pt-8 border-t border-white/5 relative z-10 pb-16">
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-[32px] p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Play size={20} className="rotate-90 fill-rose-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black italic uppercase tracking-tight text-white leading-none">System Start Fresh & Reset</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-relaxed mt-1">
                    Completely resets the application state, clears local storage cache, resets the logged-in user balance stats, and restarts fresh on home onboarding page.
                  </p>
                </div>
              </div>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(true);
                    WebApp.HapticFeedback.notificationOccurred('warning');
                  }}
                  className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-[0.98] text-rose-500"
                >
                  Reset App & Start Fresh
                </button>
              ) : (
                <div className="space-y-3 p-3 bg-red-950/25 border border-red-500/20 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-red-500 tracking-wider text-center leading-normal">
                    ⚠️ Are you absolutely sure? This will delete all balance/stats and sign you out!
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSystemReset}
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Yes, Reset Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetConfirm(false);
                        WebApp.HapticFeedback.impactOccurred('light');
                      }}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Action Hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6 pointer-events-none">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-full py-4 px-8 text-center shadow-2xl">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] leading-none">
            Secure admin authentication active
          </p>
        </div>
      </div>

      {/* Success/Error Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white font-black text-xs uppercase px-6 py-3.5 rounded-2xl shadow-2xl tracking-widest flex items-center gap-2 border border-emerald-400/30"
          >
            <Check size={16} className="stroke-[3]" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTaskId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeletingTaskId(null)}
            className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12182B] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-black italic uppercase tracking-tighter text-white">Delete Video Task?</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-relaxed">
                  Are you sure you want to completely remove this video stream task from the user task center? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeletingTaskId(null)}
                  className="flex-1 bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all text-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const id = deletingTaskId;
                    setDeletingTaskId(null);
                    handleDeleteTask(id);
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-rose-500/10"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setPreviewVideoUrl(null);
              setPreviewVideoTitle(null);
            }}
            className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0E1322] border border-white/10 rounded-[32px] p-6 max-w-xl w-full flex flex-col space-y-4 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Film size={18} className="text-amber-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Stream Preview</span>
                </div>
                <button 
                  onClick={() => {
                    setPreviewVideoUrl(null);
                    setPreviewVideoTitle(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title Section */}
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white uppercase tracking-tight leading-snug">{previewVideoTitle}</h4>
                <p className="text-[9px] text-gray-500 font-mono truncate">{previewVideoUrl}</p>
              </div>

              {/* Player Area */}
              <div className={cn(
                "bg-slate-950 rounded-2xl border border-white/5 overflow-hidden relative group flex items-center justify-center shadow-lg transition-all duration-300",
                isTikTokUrl(previewVideoUrl) || previewVideoUrl.includes('/shorts/')
                  ? "aspect-[9/16] w-[260px] mx-auto"
                  : "aspect-video w-full"
              )}>
                {isYouTubeUrl(previewVideoUrl) && getYouTubeEmbedUrl(previewVideoUrl) ? (
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <iframe
                      src={getYouTubeEmbedUrl(previewVideoUrl)}
                      title="YouTube Video Preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
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
                ) : isTikTokUrl(previewVideoUrl) && getTikTokEmbedUrl(previewVideoUrl) ? (
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <iframe
                      src={getTikTokEmbedUrl(previewVideoUrl)}
                      title="TikTok Video Preview"
                      frameBorder="0"
                      allowFullScreen
                      className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
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
                ) : isVimeoUrl(previewVideoUrl) && getVimeoEmbedUrl(previewVideoUrl) ? (
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <iframe
                      src={getVimeoEmbedUrl(previewVideoUrl)}
                      title="Vimeo Video Preview"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute w-[114%] h-[114%] -top-[7%] -left-[7%] pointer-events-auto"
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
                ) : isDirectVideoUrl(previewVideoUrl) ? (
                  <video 
                    src={previewVideoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-sans">External URL Detected</p>
                    <p className="text-xs text-gray-400">Stream player cannot embed this URL inside the frame. Admins can watch via direct redirect link below:</p>
                    <a 
                      href={previewVideoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all mt-2"
                    >
                      Open Video Link <ExternalLink size={10} className="stroke-[2.5]" />
                    </a>
                  </div>
                )}
              </div>

              {/* Bottom Instructions */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-5 h-5 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Play size={10} className="fill-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none">Task Streams System Integrity</p>
                  <p className="text-[9px] text-gray-500 leading-normal font-medium">Verify that the video content matches standard quality before submitting or modifying levels in the Stream Hub.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Overlay */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
              >
                <X size={20} />
                Close
              </button>
              <div className="bg-white rounded-3xl overflow-hidden p-2">
                <img 
                  src={previewImage} 
                  alt="Full Proof" 
                  className="w-full h-auto max-h-[70vh] object-contain rounded-2xl"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage User Modal Overlay */}
      <AnimatePresence>
        {selectedUserForManagement && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedUserForManagement(null)}
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0A0F1E] border border-white/10 w-full max-w-lg rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20 animate-pulse">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Manage User Base</h3>
                    <p className="text-[10px] text-gray-500 font-mono">ID: {selectedUserForManagement.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedUserForManagement(null)}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 active:scale-95 transition-all text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {/* 1. Register / Uploaded Information */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">Aesthetic Registration Info</h4>
                  <div className="bg-[#12182B] border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Full Human Name</p>
                      <p className="text-xs font-black text-white uppercase mt-0.5">{selectedUserForManagement.fullName || 'Anonymous'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Phone Number</p>
                      <p className="text-xs font-bold text-white mt-0.5">{selectedUserForManagement.phoneNumber || selectedUserForManagement.id}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Registered Password</p>
                      <p className="text-xs font-semibold text-amber-400 mt-0.5">{selectedUserForManagement.password || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Current Job Level</p>
                      <p className="text-xs font-black text-blue-400 mt-0.5">{selectedUserForManagement.currentLevel || 'INTERN'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Joined Onboard Date</p>
                      <p className="text-[10px] font-mono text-gray-350 mt-0.5">
                        {selectedUserForManagement.createdAt 
                          ? new Date(selectedUserForManagement.createdAt).toLocaleString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-white/5 pt-3">
                      <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Change Registered Password</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New password (min 4 chars)"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateUserPassword(selectedUserForManagement.id, newPasswordInput)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-[#0A0F1E] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0"
                        >
                          Modify Pass
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Bank Information */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1">Linked Bank & Payment Security</h4>
                  <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[8px] font-black text-indigo-300/60 uppercase tracking-widest">Associated Bank</p>
                        <p className="text-sm font-black text-white italic tracking-tighter uppercase mt-0.5">
                          {selectedUserForManagement.bankDetails?.bankName || 'Not Linked'}
                        </p>
                      </div>
                      <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                        SECURE PAY
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Account Number</p>
                        <p className="text-xs font-mono font-bold text-gray-100 mt-0.5">
                          {selectedUserForManagement.bankDetails?.accountNumber || '•••• •••• ••••'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Account Holder</p>
                        <p className="text-xs font-bold text-gray-100 uppercase mt-0.5">
                          {selectedUserForManagement.bankDetails?.accountName || 'Not Provided'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Personal Payment Password</p>
                        <p className="text-xs font-mono font-bold text-pink-400 mt-0.5">
                          {selectedUserForManagement.bankDetails?.paymentPassword || 'Not Configured'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Team Active ABC List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pl-1">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Active Team (A, B, C)</h4>
                  </div>
                  
                  {/* ABC selector */}
                  <div className="flex gap-1 p-1 bg-[#12182B] border border-white/5 rounded-xl shrink-0">
                    {(['A', 'B', 'C'] as const).map((lvl) => {
                      const lists = getActiveTeamLists(selectedUserForManagement);
                      const count = lists[lvl]?.length || 0;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setAdminTeamTab(lvl);
                            WebApp.HapticFeedback.impactOccurred('light');
                          }}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider relative flex items-center justify-center gap-1.5 transition-all outline-none",
                            adminTeamTab === lvl ? "bg-amber-500 text-[#0A0F1E] shadow-sm" : "text-gray-400 hover:text-white"
                          )}
                        >
                          Level {lvl}
                          <span className={cn(
                            "text-[8px] px-1 py-0.125 rounded-md",
                            adminTeamTab === lvl ? "bg-black/10 text-black font-black" : "bg-white/5 text-gray-400"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Subordinates items */}
                  <div className="bg-[#12182B]/30 border border-white/5 rounded-2xl p-4 space-y-3 max-h-[140px] overflow-y-auto no-scrollbar">
                    {(() => {
                      const lists = getActiveTeamLists(selectedUserForManagement);
                      const currentSubList = lists[adminTeamTab] || [];
                      
                      if (currentSubList.length === 0) {
                        return (
                          <div className="py-6 text-center opacity-40 uppercase font-black text-[8px] tracking-widest text-gray-500">
                            No active Level {adminTeamTab} connections
                          </div>
                        );
                      }

                      return currentSubList.map((sub: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-[#12182B]/60 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-350">
                              <UserIcon size={14} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase italic">{sub.fullName || 'Anonymous'}</p>
                              <p className="text-[8px] font-bold text-gray-500 mt-0.5">{sub.phoneNumber || sub.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/10 font-bold uppercase">
                              {sub.currentLevel || 'INTERN'}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* 4. Balance adjustments */}
                <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Adjust Wallet Vault</h4>
                  
                  {/* Select target wallet */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWalletToAdjust('personal')}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border",
                        walletToAdjust === 'personal'
                          ? "bg-amber-500 text-[#0A0F1E] border-amber-500"
                          : "bg-transparent border-white/5 text-gray-400"
                      )}
                    >
                      Personal ({selectedUserForManagement.personal !== undefined ? Number(selectedUserForManagement.personal).toFixed(1) : '50.0'} ETB)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletToAdjust('income')}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center border",
                        walletToAdjust === 'income'
                          ? "bg-amber-500 text-[#0A0F1E] border-amber-500"
                          : "bg-transparent border-white/5 text-gray-400"
                      )}
                    >
                      Income ({selectedUserForManagement.income !== undefined ? Number(selectedUserForManagement.income).toFixed(1) : '0.0'} ETB)
                    </button>
                  </div>

                  {/* Amount input */}
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Enter adjustment amount"
                      value={adjustAmountStr}
                      onChange={(e) => setAdjustAmountStr(e.target.value)}
                      className="w-full bg-[#12182B] border border-white/10 rounded-xl px-4 py-3 text-xs font-black italic text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-500 italic uppercase text-[10px]">ETB</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleAdjustUserBalance(selectedUserForManagement.id, walletToAdjust, 'add', Number(adjustAmountStr));
                        setAdjustAmountStr('');
                      }}
                      className="flex-1 py-3 bg-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#0A0F1E] transition-all hover:opacity-90 active:scale-95"
                    >
                      Add Amount
                    </button>
                    <button
                      onClick={() => {
                        handleAdjustUserBalance(selectedUserForManagement.id, walletToAdjust, 'reduce', Number(adjustAmountStr));
                        setAdjustAmountStr('');
                      }}
                      className="flex-1 py-3 bg-rose-600/20 border border-rose-500/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-rose-600 hover:text-black active:scale-95"
                    >
                      Reduce Amount
                    </button>
                  </div>
                </div>

                {/* 5. Freeze Account toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const targetStatus = selectedUserForManagement.status || 'active';
                      handleToggleUserStatus(selectedUserForManagement.id, targetStatus);
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-center",
                      selectedUserForManagement.status === 'inactive'
                        ? "bg-emerald-600 text-[#0A0F1E] hover:opacity-90 shadow-emerald-500/10"
                        : "bg-red-650/10 hover:bg-red-600 hover:text-black border border-red-500/20 text-red-500 shadow-rose-950/10"
                    )}
                  >
                    <AlertCircle size={14} />
                    {selectedUserForManagement.status === 'inactive' ? "Unfreeze & Activate User" : "Freeze & Ban Account"}
                  </button>
                </div>

                {/* 6. Delete Account Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleDeleteUser(selectedUserForManagement.id)}
                    className="w-full py-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                  >
                    <Trash2 size={14} />
                    Permanently Delete User Account
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
