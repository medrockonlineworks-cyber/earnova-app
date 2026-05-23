import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Shield, Target, Users } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutUsModal({ isOpen, onClose }: AboutUsModalProps) {
  if (!isOpen) return null;

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
          className="relative w-full max-w-lg bg-gray-50 rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl h-[80vh] sm:h-auto"
        >
          <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Info size={20} />
              </div>
              <h3 className="text-lg font-black italic tracking-tighter uppercase leading-none">About EARNOVA</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto h-[calc(80vh-80px)] no-scrollbar pb-12">
            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm text-center">
               <div className="w-16 h-16 bg-blue-600 text-white rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
                 <Shield size={32} />
               </div>
               <h4 className="text-xl font-black italic tracking-tighter mb-2">EARNOVA GLOBAL</h4>
               <p className="text-xs font-medium text-gray-500 leading-relaxed">
                 Founded on May 23, 2026, EARNOVA is a premier digital task ecosystem providing sustainable income opportunities through micro-work and fintech innovative solutions.
               </p>
            </div>

            <div className="space-y-4">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">The EARNOVA Ecosystem</h5>
               <div className="grid grid-cols-1 gap-3">
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                   <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                     <Target size={16} />
                   </div>
                   <div>
                     <h6 className="text-[11px] font-black italic uppercase tracking-tight mb-1">Micro-Task Efficiency</h6>
                     <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Our proprietary algorithm matches high-value digital assets with users across 10 specialized JOB levels, ensuring optimal performance and efficiency-based rewards.</p>
                   </div>
                 </div>

                 <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                   <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                     <Users size={16} />
                   </div>
                   <div>
                     <h6 className="text-[11px] font-black italic uppercase tracking-tight mb-1">Referral Architecture</h6>
                     <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Earn through our tiered A-B-C commission model: Receive up to 12% on Level 1 direct referrals, 4% on Level 2, and 2% on Level 3 for every account upgrade.</p>
                   </div>
                 </div>

                 <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-3">
                   <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                     <Target size={16} />
                   </div>
                   <div>
                     <h6 className="text-[11px] font-black italic uppercase tracking-tight mb-1">Team Productivity</h6>
                     <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Beyond recruitment, EARNOVA rewards leadership. Earn daily task dividends of 5%, 3%, and 1% based on your three-level team's daily activity.</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compliance & Global Presence</h5>
               <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                 EARNOVA GLOBAL LTD operates under International Digital Trade Fair standards. We are committed to financial inclusion across East Africa, leveraging blockchain-encrypted verification systems to ensure that every task and withdrawal is processed with unmatched security.
               </p>
               <div className="p-4 bg-gray-100 rounded-2xl">
                 <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2 text-center">Corporate Registry</p>
                 <div className="grid grid-cols-2 gap-4 text-[9px] font-black italic">
                   <div className="text-center">
                     <p className="text-gray-400 uppercase text-[8px] mb-1">Reg. Number</p>
                     <p className="text-gray-900">ET-2026-91823-EN</p>
                   </div>
                   <div className="text-center">
                     <p className="text-gray-400 uppercase text-[8px] mb-1">Jurisdiction</p>
                     <p className="text-gray-900">Addis Ababa, Ethiopia</p>
                   </div>
                 </div>
               </div>
               <p className="text-[9px] text-gray-400 text-center font-medium">
                 © 2026 EARNOVA GLOBAL LTD. All rights reserved.
               </p>

               <button 
                onClick={onClose}
                className="w-full bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-rose-100"
              >
                Exit View
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
