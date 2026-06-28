import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, FileText, PenTool } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface SigningModalProps {
  level: string;
  deposit: number;
  onClose: () => void;
  onSign: () => void;
  t: any;
}

export function SigningModal({ level, deposit, onClose, onSign, t }: SigningModalProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [complete, setComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.beginPath();
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSign = () => {
    WebApp.HapticFeedback.notificationOccurred('success');
    setIsSigning(true);
    setTimeout(() => {
      setComplete(true);
      setTimeout(() => {
        onSign();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden flex flex-col relative max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">{level} Contract</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Legal Activation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 p-2">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Terms of Employment</h4>
            <div className="text-[10px] font-bold text-gray-600 leading-relaxed max-h-32 overflow-y-auto pr-2 space-y-2">
              <p>By signing this digital contract, you agree to EARNLINK's operational guidelines for the {level} level.</p>
              <p>1. Performance: You will execute tasks with accuracy and efficiency.</p>
              <p>2. Security: Your account is non-transferable and must yield to system audits.</p>
              <p>3. Deposit: A work deposit of ETB {deposit.toLocaleString()} will be held in your work wallet to facilitate task matching.</p>
              <p>4. Dividends: Income is generated per task successfully validated.</p>
            </div>
          </div>

          {!complete ? (
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block text-center">Digitally Sign Below</label>
                  <div className="relative border-2 border-dashed border-gray-200 rounded-3xl h-48 bg-gray-50 overflow-hidden cursor-crosshair">
                    <canvas 
                        ref={canvasRef}
                        width={400}
                        height={200}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full touch-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <PenTool size={48} className="text-gray-400" />
                    </div>
                  </div>
               </div>

               <button 
                onClick={handleSign}
                disabled={isSigning}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-200 disabled:opacity-50"
               >
                {isSigning ? "Processing..." : "Sign Agreement & Unlock"}
               </button>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"
              >
                <CheckCircle size={48} />
              </motion.div>
              <div className="space-y-1">
                <h4 className="text-xl font-black italic tracking-tighter uppercase text-gray-900">CONTRACT SIGNED</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                  Your work deposit has been processed. {level} isActive.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
