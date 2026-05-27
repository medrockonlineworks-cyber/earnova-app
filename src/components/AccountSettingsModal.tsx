import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, Phone, ChevronRight, CheckCircle2, Shield, Eye, EyeOff, User, Image } from 'lucide-react';
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { cn } from '../lib/utils';
import { AdminCouncil } from './AdminCouncil';
import { auth, isUserAdmin, db, getUserDocId } from '../lib/firebase';

interface AccountSettingsModalProps {
  onClose: () => void;
  t: any;
  initialView?: SettingView;
}

type SettingView = 'MENU' | 'PASSWORD' | 'EMAIL' | 'PHONE' | 'ADMIN' | 'NAME' | 'AVATAR';

export function AccountSettingsModal({ onClose, t, initialView }: AccountSettingsModalProps) {
  const [view, setView] = useState<SettingView>(initialView || 'MENU');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmittingName, setIsSubmittingName] = useState(false);

  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState('bugatti');
  const [avatarError, setAvatarError] = useState('');
  const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);

  useEffect(() => {
    async function loadCurrentName() {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const userDocRef = doc(db, 'users', getUserDocId());
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.fullName) {
            setNewName(data.fullName);
          }
          if (data && data.avatarSeed) {
            setSelectedAvatarSeed(data.avatarSeed);
          }
        }
      } catch (err) {
        console.warn('Error loading name:', err);
      }
    }
    loadCurrentName();
  }, []);

  const handleUpdate = () => {
    WebApp.HapticFeedback.notificationOccurred('success');
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setView('MENU');
    }, 2000);
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setNameError('Name cannot be empty!');
      return;
    }
    setIsSubmittingName(true);
    setNameError('');
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', getUserDocId());
      await updateDoc(userDocRef, {
        fullName: newName.trim()
      });
      handleUpdate();
    } catch (err: any) {
      setNameError(err.message || 'Error occurred while updating name.');
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handleUpdateAvatar = async () => {
    setIsSubmittingAvatar(true);
    setAvatarError('');
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', getUserDocId());
      const presets: { [key: string]: string } = {
        bugatti: 'https://images.unsplash.com/photo-1600706432505-1a8db0dd1d20?auto=format&fit=crop&w=150&h=150&q=80',
        lamborghini: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=150&h=150&q=80',
        rollsroyce: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?auto=format&fit=crop&w=150&h=150&q=80',
        ferrari: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=150&h=150&q=80',
        gwagon: 'https://images.unsplash.com/photo-1520050206274-a1ae446fa3ca?auto=format&fit=crop&w=150&h=150&q=80',
        privatejet1: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=150&h=150&q=80',
        privatejet2: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=150&h=150&q=80',
        privatejet3: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=150&h=150&q=80',
      };
      const url = presets[selectedAvatarSeed] || presets.bugatti;
      await updateDoc(userDocRef, {
        avatarSeed: selectedAvatarSeed,
        avatarUrl: url
      });
      handleUpdate();
    } catch (err: any) {
      setAvatarError(err.message || 'Error occurred while updating avatar.');
    } finally {
      setIsSubmittingAvatar(false);
    }
  };

  const renderContent = () => {
    if (isSuccess) {
      return (
        <div className="py-12 flex flex-col items-center justify-center space-y-4 p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"
          >
            <CheckCircle2 size={32} />
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-black text-gray-900 uppercase italic">Updated Successfully</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your security settings have been saved</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'PASSWORD':
        return (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
              <div className="relative">
                <input 
                  type={showCurrentPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:bg-white transition-all text-xs outline-none" 
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCurrentPassword(!showCurrentPassword);
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:bg-white transition-all text-xs outline-none" 
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPassword(!showNewPassword);
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={handleUpdate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">
              Update Password
            </button>
          </div>
        );
      case 'EMAIL':
        return (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Email</label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs font-bold text-gray-400">user@example.com</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Email Address</label>
              <input type="email" placeholder="example@gmail.com" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:bg-white transition-all text-xs outline-none" />
            </div>
            <button onClick={handleUpdate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">
              Update Email
            </button>
          </div>
        );
      case 'PHONE':
        return (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Phone</label>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs font-bold text-gray-400">+251 92 619 3920</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Phone Number</label>
              <input type="tel" placeholder="+251 ..." className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:bg-white transition-all text-xs outline-none" />
            </div>
            <button onClick={handleUpdate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">
              Update Phone
            </button>
          </div>
        );
       case 'NAME':
        return (
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name / ሙሉ ስም</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="Enter new full name / ሙሉ ስም ያስገቡ" 
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:bg-white transition-all text-xs outline-none" 
              />
            </div>
            {nameError && (
              <p className="text-[10px] font-bold text-red-500 ml-1">{nameError}</p>
            )}
            <button 
              onClick={handleUpdateName} 
              disabled={isSubmittingName}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmittingName ? 'Updating...' : 'Update Name'}
            </button>
          </div>
        );
      case 'AVATAR':
        const avatarPresets = [
          { seed: 'bugatti', label: 'Bugatti', url: 'https://images.unsplash.com/photo-1600706432505-1a8db0dd1d20?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'lamborghini', label: 'Lambo', url: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'rollsroyce', label: 'Rolls-P', url: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'ferrari', label: 'Ferrari', url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'gwagon', label: 'G-Wagon', url: 'https://images.unsplash.com/photo-1520050206274-a1ae446fa3ca?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'privatejet1', label: 'Gulfstream', url: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'privatejet2', label: 'Falcon Jet', url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=150&h=150&q=80' },
          { seed: 'privatejet3', label: 'Boeing BBJ', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=150&h=150&q=80' }
        ];
        return (
          <div className="space-y-4 p-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 text-center">Select Your Luxury Vehicle Avatar</h3>
            <div className="grid grid-cols-4 gap-4 max-h-[220px] overflow-y-auto p-1">
              {avatarPresets.map((p) => {
                const url = p.url;
                const isSelected = selectedAvatarSeed === p.seed;
                return (
                  <button
                    key={p.seed}
                    onClick={() => {
                      setSelectedAvatarSeed(p.seed);
                      WebApp.HapticFeedback.impactOccurred('light');
                    }}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-2xl border transition-all active:scale-95 bg-white relative",
                      isSelected ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20" : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm mb-1.5">
                      <img src={url} alt={p.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-tight text-center leading-none h-4 flex items-center justify-center">{p.label}</span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded-full ring-2 ring-white">
                        <CheckCircle2 size={10} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {avatarError && (
              <p className="text-[10px] font-bold text-red-500 ml-1">{avatarError}</p>
            )}

            <button 
              onClick={handleUpdateAvatar} 
              disabled={isSubmittingAvatar}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              {isSubmittingAvatar ? 'Setting...' : 'Select Avatar'}
            </button>
          </div>
        );
      case 'ADMIN':
        return <AdminCouncil onBack={() => setView('MENU')} />;
      default:
        return (
          <div className="p-6">
            <div className="space-y-3">
              {[
                { id: 'NAME', label: 'Change Name / ስም መቀየር', desc: 'Update display name / ስምዎን ያዘምኑ', icon: User, color: 'text-amber-500', bg: 'bg-amber-100/50' },
                { id: 'AVATAR', label: 'Change Avatar / አቫታር መቀየር', desc: 'Choose a premium profile picture / የመገለጫ ምስል ይምረጡ', icon: Image, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { id: 'PASSWORD', label: 'Password Settings', desc: 'Secure your login', icon: Lock, color: 'text-blue-500', bg: 'bg-blue-50' },
                { id: 'EMAIL', label: 'Email Address', desc: 'Manage your primary email', icon: Mail, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { id: 'PHONE', label: 'Phone Number', desc: 'Registered mobile number', icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { 
                  id: 'ADMIN', 
                  label: 'Admin Council', 
                  desc: 'System management hub', 
                  icon: Shield, 
                  color: 'text-rose-500', 
                  bg: 'bg-rose-50',
                  hidden: !isUserAdmin()
                },
              ].filter(i => !i.hidden).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id as SettingView);
                    WebApp.HapticFeedback.impactOccurred('light');
                  }}
                  className="w-full p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                      <item.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900 uppercase italic leading-none">{item.label}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "relative w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]",
          view === 'ADMIN' ? 'bg-[#0A0F1E]' : 'bg-gray-50'
        )}
      >
        {view !== 'ADMIN' && (
          <div className="p-6 space-y-6 pt-8 bg-white flex-shrink-0 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view !== 'MENU' && !isSuccess && (
                  <button onClick={() => setView('MENU')} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90">
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                )}
                <h2 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">
                  {isSuccess ? 'Success' : view === 'MENU' ? 'Account' : view === 'NAME' ? 'Change Name' : view}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-shrink flex-grow min-h-0">
          {renderContent()}
          {view !== 'ADMIN' && <div className="h-6" />}
        </div>
      </motion.div>
    </div>
  );
}
