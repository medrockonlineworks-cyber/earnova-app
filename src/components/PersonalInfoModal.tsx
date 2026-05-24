import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Phone, Calendar, ShieldCheck, Globe, CreditCard, LogOut } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone: string;
  fullName: string;
  email: string;
}

export function PersonalInfoModal({ isOpen, onClose, userPhone, fullName, email }: PersonalInfoModalProps) {
  if (!isOpen) return null;

  const activePhone = userPhone || '';
  let formattedPhone = activePhone || 'Not Set';
  if (activePhone && !activePhone.startsWith('+') && !activePhone.startsWith('guest_')) {
    const clean = activePhone.trim().replace(/\s+/g, '');
    if (clean.startsWith('09') && clean.length === 10) {
      formattedPhone = `+251 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    } else if (clean.startsWith('9') && clean.length === 9) {
      formattedPhone = `+251 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    } else {
      formattedPhone = `+251 ${clean}`;
    }
  }

  const infoItems = [
    { label: 'Full Name', value: fullName || 'Member', icon: User },
    { label: 'Email Address', value: email && email.includes('@') ? email : 'Not Set', icon: Mail },
    { label: 'Phone Number', value: formattedPhone, icon: Phone },
    { label: 'Bank Account', value: 'CBE •••• 5678', icon: CreditCard },
    { label: 'Join Date', value: 'May 24, 2026', icon: Calendar },
    { label: 'Account Status', value: 'Verified', icon: ShieldCheck, color: 'text-emerald-500' },
    { label: 'Region', value: 'Ethiopia', icon: Globe },
  ];

  const handleExit = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
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
          className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <h3 className="text-lg font-black italic tracking-tighter uppercase leading-none text-gray-900">Personal Information</h3>
            <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl text-gray-400 active:scale-90 transition-transform">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
            {infoItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                  <p className={cn("text-xs font-black italic", item.color || "text-gray-900")}>{item.value}</p>
                </div>
              </div>
            ))}

            <button 
              onClick={handleExit}
              className="w-full mt-6 bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-rose-100 mb-8"
            >
              <LogOut size={16} />
              Exit View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
