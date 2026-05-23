import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WebApp from '@twa-dev/sdk';
import { 
  X, 
  HelpCircle, 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  Send, 
  User, 
  Bot,
  MessageCircle,
  Phone,
  Layout,
  Globe,
  Lock,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, getUserDocId } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

interface SupportCenterProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.warn('SupportCenter Firestore Error (handled gracefully): ', JSON.stringify(errInfo));
  return errInfo;
}

export function SupportCenter({ isOpen, onClose, t }: SupportCenterProps) {
  const [activeTab, setActiveTab] = useState<'FAQ' | 'CHAT'>('FAQ');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<string>(() => {
    const activeId = getUserDocId();
    if (activeId && activeId !== 'guest') return activeId;
    let saved = localStorage.getItem('earnova_chat_user_id');
    if (!saved) {
      saved = 'guest_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString().slice(-6);
      localStorage.setItem('earnova_chat_user_id', saved);
    }
    return saved;
  });

  useEffect(() => {
    const activeId = getUserDocId();
    if (activeId && activeId !== 'guest') {
      setChatId(activeId);
    }
  }, [auth.currentUser]);

  useEffect(() => {
    if (activeTab === 'CHAT' && chatId) {
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          time: doc.data().timestamp?.toDate 
            ? doc.data().timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        if (msgs.length === 0) {
          setChatHistory([{ 
            id: 'welcome', 
            text: t('support_chat_welcome'), 
            sender: 'admin', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }]);
        } else {
          setChatHistory(msgs);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
      });

      return () => unsubscribe();
    }
  }, [activeTab, chatId, t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const faqs = [
    { q: t('support_faq_q1'), a: t('support_faq_a1') },
    { q: t('support_faq_q2'), a: t('support_faq_a2') },
    { q: t('support_faq_q3'), a: t('support_faq_a3') },
  ];

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;
    
    setIsLoading(true);
    const userMessage = message;
    setMessage('');

    try {
      // Ensure chat room exists
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          userId: chatId,
          userName: WebApp.initDataUnsafe?.user?.first_name || 'User',
          lastMessage: userMessage,
          lastUpdated: serverTimestamp(),
          status: 'active'
        });
      } else {
        await updateDoc(chatRef, {
          lastMessage: userMessage,
          lastUpdated: serverTimestamp()
        });
      }

      // Add message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: userMessage,
        senderId: chatId,
        recipientId: 'admin',
        sender: 'user',
        timestamp: serverTimestamp(),
        chatId: chatId
      });

      WebApp.HapticFeedback.impactOccurred('light');

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight italic leading-none">{t('support_center')}</h2>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">24/7 Official Support</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/10 rounded-2xl p-1 backdrop-blur-md">
                <button 
                  onClick={() => setActiveTab('FAQ')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'FAQ' ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:text-white"
                  )}
                >
                  <Layout size={14} />
                  {t('support_faq')}
                </button>
                <button 
                  onClick={() => setActiveTab('CHAT')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'CHAT' ? "bg-white text-blue-600 shadow-sm" : "text-white/80 hover:text-white"
                  )}
                >
                  <MessageSquare size={14} />
                  ADMIN CHAT
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              {activeTab === 'FAQ' ? (
                <div className="space-y-4">
                  {faqs.map((faq, idx) => (
                    <div 
                      key={`support-faq-item-list-${idx}`} 
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <button 
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                        className="w-full p-4 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-black text-gray-900 uppercase pr-4 leading-relaxed italic">{faq.q}</span>
                        {expandedFaq === idx ? <ChevronDown size={16} className="text-blue-600" /> : <ChevronRight size={16} className="text-gray-300" />}
                      </button>
                      <AnimatePresence>
                        {expandedFaq === idx && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 overflow-hidden"
                          >
                            <div className="pt-2 border-t border-gray-50">
                              <p className="text-[11px] font-bold text-gray-500 leading-relaxed italic uppercase">{faq.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* External Support Links */}
                  <div className="pt-4 space-y-3">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">{t('support_contact_us')}</h3>
                    <button 
                      onClick={() => {
                        WebApp.HapticFeedback.impactOccurred('medium');
                        window.open('https://t.me/EARNOVA_OFFICIAL', '_blank');
                      }}
                      className="w-full p-4 bg-white rounded-2xl border border-blue-100 flex items-center gap-4 active:scale-95 transition-all group text-left"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <MessageCircle size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-900 uppercase italic leading-none">{t('support_telegram')}</p>
                        <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">@EARNOVA_OFFICIAL</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400" />
                    </button>
                    <button 
                      onClick={() => {
                        WebApp.HapticFeedback.impactOccurred('medium');
                        window.open('https://wa.me/251911223344', '_blank'); // Placeholder WhatsApp
                      }}
                      className="w-full p-4 bg-white rounded-2xl border border-emerald-100 flex items-center gap-4 active:scale-95 transition-all group text-left"
                    >
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Phone size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-900 uppercase italic leading-none">{t('support_whatsapp')}</p>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase mt-1">Fast Response</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, idx) => (
                      <div key={`support-chat-msg-${msg.id}-${idx}`} className={cn(
                        "flex gap-3",
                        msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          msg.sender === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {msg.sender === 'user' ? <User size={16} /> : <Shield size={16} />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl p-3",
                          msg.sender === 'user' 
                            ? "bg-indigo-600 text-white rounded-tr-none" 
                            : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200"
                        )}>
                          <p className="text-[11px] font-bold leading-relaxed">{msg.text}</p>
                          <p className={cn(
                            "text-[8px] mt-1 font-black uppercase opacity-50",
                            msg.sender === 'user' ? "text-white text-right" : "text-gray-400"
                          )}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 focus:border-blue-600 focus:outline-none transition-colors"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={isLoading}
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
