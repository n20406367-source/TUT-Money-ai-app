/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  getDocFromServer,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Wallet, 
  History, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  Menu, 
  X, 
  MessageCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  Lock,
  Search,
  FileText,
  CreditCard,
  Trash2,
  Bell,
  BellOff,
  Settings,
  ExternalLink,
  AlertTriangle,
  History as HistoryIcon,
  User,
  Facebook,
  MessageSquare,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useRef } from 'react';

// --- Constants ---
const ADMIN_EMAIL = 'tahsinullahtusher999@gmail.com'.toLowerCase();

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
interface UserProfile {
  uid: string;
  email?: string;
  name: string;
  nid: string;
  address: string;
  occupation: string;
  phone: string;
  // Social Media
  facebook?: string;
  whatsapp?: string;
  telegram?: string;
  // Detailed Info
  fatherName?: string;
  motherName?: string;
  dob?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  
  status: 'pending' | 'approved';
  memberId?: string;
  totalLoan: number;
  totalDeposit: number;
  remainingDebt: number;
  role: 'admin' | 'member';
  createdAt: any;
}

interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  type: 'loan' | 'deposit' | 'refund' | 'pay_due';
  amount: number;
  method: 'Cash' | 'Bkash' | 'Nagad' | 'Recharge';
  accountNumber?: string;
  transactionId?: string;
  status: 'pending' | 'confirmed';
  timestamp: any;
  memoId?: string;
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 border border-blue-400/20',
    secondary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/20',
    outline: 'border border-blue-400/30 hover:bg-blue-400/10 text-blue-400 backdrop-blur-sm',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 border border-rose-400/20',
    ghost: 'hover:bg-blue-400/10 text-blue-400',
    glass: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md'
  };

  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title, icon: Icon, subtitle }: { children: React.ReactNode, className?: string, title?: string, icon?: any, subtitle?: string }) => (
  <div className={cn("glass rounded-2xl p-6 relative overflow-hidden group", className)}>
    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
    {title && (
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-blue-400/60 font-medium">{subtitle}</p>}
          </div>
        </div>
      </div>
    )}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest ml-1">{label}</label>}
    <input 
      className={cn(
        "w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-blue-900/40 backdrop-blur-sm",
        error && "border-rose-500 focus:ring-rose-500/40"
      )}
      {...props}
    />
    {error && <p className="text-xs text-rose-400 ml-1 font-bold">{error}</p>}
  </div>
);

const Badge = ({ children, variant = 'info' }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'info' | 'danger' }) => {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/10',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/10',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/10'
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", variants[variant])}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="glass-dark w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-white/10 flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 z-10">
            <h3 className="text-xl font-black tracking-tight text-white uppercase italic">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-blue-400" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const DigitalMemo = ({ memo }: { memo: Transaction }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-2xl border border-blue-100 min-h-[220px] flex flex-col justify-between group transition-all hover:shadow-blue-500/10">
    {/* Decorative Elements */}
    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />
    <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-50 rounded-tr-full -ml-4 -mb-4 opacity-50" />
    
    {/* Watermark */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] rotate-[-25deg] select-none">
      <span className="text-9xl font-black text-blue-900">T.U.T.</span>
    </div>
    
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] mb-1">Official Digital Memo</h4>
          <p className="text-sm font-mono font-bold text-blue-900 tracking-tighter">{memo.memoId}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20">
            Verified
          </div>
          <p className="text-[9px] font-bold text-blue-900/40 uppercase">Auth: 2026-TUT</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
          <span className="text-[10px] font-bold text-blue-900/40 uppercase">Issue Date</span>
          <span className="text-xs font-bold text-blue-900">
            {memo.timestamp?.toDate ? format(memo.timestamp.toDate(), 'dd MMM yyyy') : 'Processing...'}
          </span>
        </div>
        <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
          <span className="text-[10px] font-bold text-blue-900/40 uppercase">Service Type</span>
          <span className={cn("text-xs font-black uppercase tracking-tight", memo.type === 'refund' || memo.type === 'loan' ? "text-rose-600" : "text-emerald-600")}>
            {memo.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
          <span className="text-[10px] font-bold text-blue-900/40 uppercase">Payment Method</span>
          <span className="text-xs font-bold text-blue-900">{memo.method}</span>
        </div>
        <div className="flex justify-between pt-2">
          <span className="text-[10px] font-bold text-blue-900/40 uppercase">Total Amount</span>
          <div className="text-right">
            <span className="text-xl font-black text-blue-900 tracking-tighter">৳ {memo.amount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="relative z-10 mt-6 pt-4 border-t border-dashed border-blue-100 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-900/5 flex items-center justify-center">
          <Shield className="w-3 h-3 text-blue-600" />
        </div>
        <span className="text-[9px] font-black text-blue-900/30 uppercase tracking-widest">T.U.T. Authority</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] font-bold text-emerald-600 uppercase">Secured</span>
      </div>
    </div>
  </div>
);

const BalanceCard = ({ profile }: { profile: UserProfile }) => (
  <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-2xl shadow-blue-900/40 group">
    {/* Decorative background elements */}
    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
    
    <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
      <div className="flex justify-between items-start">
        <div className="space-y-6">
          <div>
            <p className="text-blue-100/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Current Balance</p>
            <h2 className="text-5xl font-black tracking-tighter">৳ {profile.totalDeposit.toLocaleString()}</h2>
          </div>
          <div>
            <p className="text-rose-200/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Remaining Debt</p>
            <h2 className="text-3xl font-black tracking-tighter text-rose-200">৳ {profile.remainingDebt.toLocaleString()}</h2>
          </div>
        </div>
        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
          <Wallet className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="mt-12 flex justify-between items-end">
        <div>
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">Member ID</p>
          <p className="text-lg font-mono font-bold tracking-widest text-blue-50">{profile.memberId}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">Account Holder</p>
          <p className="text-sm font-bold uppercase tracking-tight">{profile.name}</p>
        </div>
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = 'blue' }: { icon: any, label: string, onClick: () => void, variant?: 'blue' | 'indigo' | 'rose' | 'amber' }) => {
  const variants = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 gap-3 group",
        variants[variant]
      )}
    >
      <div className="p-3 rounded-xl bg-current/10 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('tut_admin_logged_in') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('tut_admin_logged_in', isAdminLoggedIn.toString());
  }, [isAdminLoggedIn]);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Edit Member State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editLoan, setEditLoan] = useState('');
  const [editDeposit, setEditDeposit] = useState('');
  const [editDebt, setEditDebt] = useState('');
  
  // Delete Member State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Toast State
  const [toasts, setToasts] = useState<{id: string, title: string, body: string, type: 'info' | 'success' | 'warning'}[]>([]);

  const addToast = (title: string, body: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isIframe, setIsIframe] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<{id: string, title: string, body: string, timestamp: number}[]>(() => {
    const saved = localStorage.getItem('tut_notification_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationSettingsMode, setNotificationSettingsMode] = useState(false);
  const [gmailNotificationsEnabled, setGmailNotificationsEnabled] = useState(() => {
    return localStorage.getItem('tut_gmail_notifications') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('tut_gmail_notifications', gmailNotificationsEnabled.toString());
  }, [gmailNotificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('tut_notification_history', JSON.stringify(notificationHistory));
  }, [notificationHistory]);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    
    // Register Service Worker for mobile notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered:', reg);
          setSwRegistration(reg);
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }, []);

  const lastUserCount = useRef<number | null>(null);
  const lastTxCount = useRef<number | null>(null);
  const lastProfileStatus = useRef<string | null>(null);
  const lastTxStatuses = useRef<Record<string, string>>({});

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert("Notifications are not supported in this browser.");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied' && isIframe) {
        alert("Notification permission was denied. This often happens in preview windows. Please open the app in a new tab using the button in the top right of AI Studio to enable notifications.");
      } else if (permission === 'granted') {
        sendNotification('Notifications Enabled!', 'You will now receive real-time updates from T.U.T.', user?.email || undefined);
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      if (isIframe) {
        alert("Could not request notification permission in this preview window. Please open the app in a new tab to enable notifications.");
      }
    }
  };

  const [showGmailHelp, setShowGmailHelp] = useState(false);
  const [lastGmailError, setLastGmailError] = useState<string | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setSystemConfig(data.config);
    } catch (e) {
      console.error("Failed to fetch system config:", e);
    }
  };

  useEffect(() => {
    if (notificationSettingsMode) {
      fetchSystemConfig();
    }
  }, [notificationSettingsMode]);

  const sendEmail = async (to: string, subject: string, body: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: body,
          html: `<div style="font-family: sans-serif; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-top: 0;">T.U.T. Notification</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.5;">${body}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #999;">This is an automated message from the T.U.T. Private Lending Authority system.</p>
            </div>
          </div>`
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      setLastGmailError(null);
    } catch (error: any) {
      console.error("[Email Error] Full details:", error);
      setLastGmailError(error.message);
      if (error.message.includes('Gmail Login Failed')) {
        addToast('Gmail Error', 'Authentication failed. Please check your App Password.', 'warning');
      }
      throw error; // Re-throw so the test button can catch it
    }
  };

  const sendNotification = async (title: string, body: string, targetEmail?: string) => {
    // Save to history
    const newNotif = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      body,
      timestamp: Date.now()
    };
    setNotificationHistory(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50

    // Always show in-app toast for 100% reliability
    addToast(title, body, 'info');

    // Send Gmail notification
    if (targetEmail) {
      const normalizedTarget = targetEmail.toLowerCase();
      const isToAdmin = normalizedTarget === ADMIN_EMAIL;
      
      console.log(`[Notification] Target: ${normalizedTarget}, isToAdmin: ${isToAdmin}, gmailEnabled: ${gmailNotificationsEnabled}`);
      
      if (isToAdmin || gmailNotificationsEnabled) {
        console.log(`[Notification] Triggering email to ${normalizedTarget}`);
        sendEmail(normalizedTarget, title, body).catch(e => {
          console.error("[Email Error] Automatic notification failed:", e);
        });
      } else {
        console.log(`[Notification] Email skipped (Not admin and user notifications disabled)`);
      }
    }

    if (notificationPermission === 'granted') {
      const options: NotificationOptions = {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995515.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1995/1995515.png',
        tag: 'tut-notification'
      };

      // Vibration for mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Try Service Worker first (required for Android/Chrome)
      if (swRegistration) {
        swRegistration.showNotification(title, options).catch(e => {
          console.error("Service Worker notification failed:", e);
          // Fallback to constructor
          try {
            new Notification(title, options);
          } catch (err) {
            console.error("Constructor notification also failed:", err);
          }
        });
      } else {
        // Fallback to constructor if SW not ready
        try {
          const n = new Notification(title, options);
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch (e) {
          console.error("Failed to send notification via constructor:", e);
        }
      }
    }
  };

  const testNotification = () => {
    if (notificationPermission !== 'granted' && !gmailNotificationsEnabled) {
      requestNotificationPermission();
    } else {
      sendNotification('System Test Successful!', 'Your device is now connected to the T.U.T. Alert System. You will receive real-time updates.', user?.email || undefined);
      addToast('Test Successful', 'A notification has been sent to your device history and system.', 'success');
    }
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  const toggleNotificationPermission = () => {
    if (notificationPermission === 'granted') {
      // We can't programmatically revoke permission, but we can simulate "off" in app logic
      // However, the user asked for a toggle. We'll use a local 'notificationsEnabled' flag if they want to mute.
      // For now, we'll just show the request dialog if not granted.
      requestNotificationPermission();
    } else {
      requestNotificationPermission();
    }
  };
  
  // Form State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'loan' | 'deposit' | 'refund' | 'pay_due'>('loan');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestMethod, setRequestMethod] = useState<'Cash' | 'Bkash' | 'Nagad' | 'Recharge'>('Cash');
  const [requestAccount, setRequestAccount] = useState('');
  const [requestTrxId, setRequestTrxId] = useState('');

  // Handle URL Parameters for External Linking
  useEffect(() => {
    if (!isAuthReady || !user || !profile || profile.status !== 'approved') return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'loan') {
      setRequestType('loan');
      setShowRequestModal(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'deposit') {
      setRequestType('deposit');
      setShowRequestModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAuthReady, user, profile]);

  // Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    occupation: '',
    address: '',
    facebook: '',
    whatsapp: '',
    telegram: '',
    fatherName: '',
    motherName: '',
    dob: '',
    bloodGroup: '',
    emergencyContact: '',
    nomineeName: '',
    nomineeRelation: ''
  });

  // Registration State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    nid: '',
    address: '',
    occupation: '',
    phone: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name,
        email: profile.email || '',
        phone: profile.phone,
        occupation: profile.occupation,
        address: profile.address,
        facebook: profile.facebook || '',
        whatsapp: profile.whatsapp || '',
        telegram: profile.telegram || '',
        fatherName: profile.fatherName || '',
        motherName: profile.motherName || '',
        dob: profile.dob || '',
        bloodGroup: profile.bloodGroup || '',
        emergencyContact: profile.emergencyContact || '',
        nomineeName: profile.nomineeName || '',
        nomineeRelation: profile.nomineeRelation || ''
      });
    }
  }, [profile]);

  const [externalAction, setExternalAction] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        occupation: profileData.occupation,
        address: profileData.address,
        facebook: profileData.facebook,
        whatsapp: profileData.whatsapp,
        telegram: profileData.telegram,
        fatherName: profileData.fatherName,
        motherName: profileData.motherName,
        dob: profileData.dob,
        bloodGroup: profileData.bloodGroup,
        emergencyContact: profileData.emergencyContact,
        nomineeName: profileData.nomineeName,
        nomineeRelation: profileData.nomineeRelation
      });
      addToast('Profile Updated', 'Your profile details have been updated successfully.', 'success');
      setShowProfileModal(false);
    } catch (error) {
      console.error("Update profile error:", error);
      addToast('Update Failed', 'Failed to update profile details.', 'warning');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action) {
      setExternalAction(action);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u?.email, u?.uid);
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        setProfile(null);
        setIsAdminLoggedIn(false); // Reset admin state on logout
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const path = `users/${user.uid}`;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        
        // Notify user if status changed to approved
        if (lastProfileStatus.current === 'pending' && data.status === 'approved') {
          sendNotification('Account Approved!', 'Your T.U.T. membership has been approved. You can now access all services.', user.email || undefined);
        }
        lastProfileStatus.current = data.status;
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (err) => {
      // Only set error if user is still logged in
      if (auth.currentUser) {
        setGlobalError(`Profile Error: ${err.message}`);
        handleFirestoreError(err, OperationType.GET, path);
      }
      setLoading(false);
    });

    return unsub;
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!profile || profile.status !== 'approved' || !user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      
      // Notify user if a transaction status changed to confirmed
      txs.forEach(tx => {
        const prevStatus = lastTxStatuses.current[tx.id];
        if (prevStatus === 'pending' && tx.status === 'confirmed') {
          sendNotification('Transaction Confirmed!', `Your ${tx.type} request of ৳${tx.amount.toLocaleString()} has been confirmed.`, user.email || undefined);
        }
        lastTxStatuses.current[tx.id] = tx.status;
      });
      
      setTransactions(txs);
    }, (err) => {
      if (auth.currentUser) {
        setGlobalError(`Transaction Error: ${err.message}`);
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      }
    });

    return unsub;
  }, [profile, user]);

  // Admin Data Listeners
  useEffect(() => {
    if (!isAdminLoggedIn || !user) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      console.log("Admin Users Snapshot received:", snap.size, "docs");
      const users = snap.docs.map(d => d.data() as UserProfile);
      const pendingCount = users.filter(u => u.status === 'pending').length;
      
      // Notify admin if new pending user arrives
      if (lastUserCount.current !== null && pendingCount > lastUserCount.current) {
        sendNotification('New Membership Request', `There are ${pendingCount} pending registrations awaiting review.`, ADMIN_EMAIL);
      }
      lastUserCount.current = pendingCount;
      
      setAllUsers(users);
    }, (err) => {
      if (auth.currentUser) {
        setGlobalError(`Admin Users Error: ${err.message}`);
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    });

    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      console.log("Admin Transactions Snapshot received:", snap.size, "docs");
      const txs = snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data } as Transaction;
      });
      
      const pendingCount = txs.filter(t => t.status === 'pending').length;
      // Notify admin if new pending transaction arrives
      if (lastTxCount.current !== null && pendingCount > lastTxCount.current) {
        sendNotification('New Transaction Request', `There are ${pendingCount} pending transactions awaiting confirmation.`, ADMIN_EMAIL);
      }
      lastTxCount.current = pendingCount;

      // Sort by timestamp desc in memory
      txs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setAllTransactions(txs);
    }, (err) => {
      if (auth.currentUser) {
        console.error("Admin Transactions Error:", err);
        setGlobalError(`Admin Transactions Error: ${err.message}`);
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      }
    });

    return () => {
      unsubUsers();
      unsubTx();
    };
  }, [isAdminLoggedIn, user]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updatedData = {
        totalLoan: Number(editLoan),
        totalDeposit: Number(editDeposit),
        remainingDebt: Number(editDebt),
        facebook: editingUser.facebook || '',
        whatsapp: editingUser.whatsapp || '',
        telegram: editingUser.telegram || '',
        fatherName: editingUser.fatherName || '',
        motherName: editingUser.motherName || '',
        dob: editingUser.dob || '',
        bloodGroup: editingUser.bloodGroup || '',
        emergencyContact: editingUser.emergencyContact || '',
        nomineeName: editingUser.nomineeName || '',
        nomineeRelation: editingUser.nomineeRelation || ''
      };

      await updateDoc(doc(db, 'users', editingUser.uid), updatedData);
      
      if (editingUser.email) {
        await sendNotification('Account Updated', 'Your account balances have been updated by the T.U.T. Authority. Please check your dashboard.', editingUser.email);
      }

      setShowEditUserModal(false);
      setEditingUser(null);
      alert("Member data updated successfully!");
    } catch (error) {
      console.error("Update user error:", error);
      alert("Failed to update member data: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEditLoan(u.totalLoan.toString());
    setEditDeposit(u.totalDeposit.toString());
    setEditDebt(u.remainingDebt.toString());
    setShowEditUserModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setShowDeleteModal(false);
      setUserToDelete(null);
      alert("Member account deleted successfully!");
    } catch (error) {
      console.error("Delete user error:", error);
      alert("Failed to delete member: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setGlobalError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Use popup for better compatibility in iframe environments
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setGlobalError("The login popup was closed before completion. Please try again and keep the popup window open until finished.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This happens if the user clicks login multiple times quickly
        console.log("Popup request cancelled due to a newer request.");
      } else if (error.code === 'auth/popup-blocked') {
        setGlobalError("The login popup was blocked by your browser. Please allow popups for this site and try again.");
      } else {
        setGlobalError(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (regData.phone.length !== 11 || !regData.phone.startsWith('0')) {
      alert("Phone number must be 11 digits starting with 0");
      return;
    }

    try {
      const isBootstrapAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
      const newProfile: any = {
        uid: user.uid,
        email: regData.email.toLowerCase() || user.email?.toLowerCase(),
        name: regData.name,
        nid: regData.nid,
        address: regData.address,
        occupation: regData.occupation,
        phone: regData.phone,
        status: isBootstrapAdmin ? 'approved' : 'pending',
        totalLoan: 0,
        totalDeposit: 0,
        remainingDebt: 0,
        role: isBootstrapAdmin ? 'admin' : 'member',
        createdAt: serverTimestamp()
      };
      
      if (isBootstrapAdmin) {
        newProfile.memberId = `TUT-ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      console.log("Attempting to register profile:", newProfile);
      await setDoc(doc(db, 'users', user.uid), newProfile);
      console.log("Registration successful");
      await sendNotification('New Membership Request', `${regData.name} has applied for membership.`, ADMIN_EMAIL);
    } catch (error) {
      console.error("Registration error details:", error);
      setGlobalError(`Registration Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAdminError('Please login with your Google account first.');
      return;
    }
    if (adminPassword === 'TUT2026' && adminPin === '9900') {
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setAdminError('');
      setAdminPassword('');
      setAdminPin('');
    } else {
      setAdminError('Access Denied: Invalid Password or PIN');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const payload: any = {
        userId: user.uid,
        userName: profile.name,
        type: requestType,
        amount,
        method: requestMethod,
        status: 'pending',
        timestamp: serverTimestamp()
      };

      if (requestType === 'loan' || requestType === 'refund') {
        payload.accountNumber = requestAccount;
      } else {
        payload.transactionId = requestTrxId;
      }

      console.log("Submitting transaction payload:", payload);
      const docRef = await addDoc(collection(db, 'transactions'), payload);
      console.log("Transaction created with ID:", docRef.id);
      await sendNotification('New Transaction Request', `${profile.name} submitted a ${requestType} request for ৳${amount.toLocaleString()}.`, ADMIN_EMAIL);
      setShowRequestModal(false);
      setRequestAmount('');
      setRequestAccount('');
      setRequestTrxId('');
      setRequestMethod('Cash');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const rejectTransaction = async (tx: Transaction) => {
    try {
      await deleteDoc(doc(db, 'transactions', tx.id));
      
      // Notify user
      const userSnap = await getDoc(doc(db, 'users', tx.userId));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.email) {
          await sendNotification('Transaction Rejected', `Your ${tx.type} request of ৳${tx.amount.toLocaleString()} has been rejected by the T.U.T. Authority.`, userData.email);
        }
      }
      addToast('Transaction Rejected', 'The request has been removed and the user notified.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${tx.id}`);
    }
  };

  const rejectMember = async (targetUid: string) => {
    try {
      const userSnap = await getDoc(doc(db, 'users', targetUid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.email) {
          await sendNotification('Membership Rejected', 'Your T.U.T. membership application has been rejected by the Authority.', userData.email);
        }
      }
      await deleteDoc(doc(db, 'users', targetUid));
      addToast('Member Rejected', 'The application has been removed and the user notified.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  const approveMember = async (targetUid: string) => {
    try {
      const memberId = `TUT-MBR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await updateDoc(doc(db, 'users', targetUid), {
        status: 'approved',
        memberId: memberId
      });

      // Send immediate notification to user
      const userSnap = await getDoc(doc(db, 'users', targetUid));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.email) {
          await sendNotification('Account Approved!', 'Your T.U.T. membership has been approved. You can now access all services.', userData.email);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const confirmTransaction = async (tx: Transaction) => {
    try {
      const memoId = `TUT-MEMO-${Math.floor(100000 + Math.random() * 900000)}`;
      const userRef = doc(db, 'users', tx.userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as UserProfile;

      let updates: any = {};
      if (tx.type === 'loan') {
        updates.totalLoan = (userData.totalLoan || 0) + tx.amount;
        updates.remainingDebt = (userData.remainingDebt || 0) + tx.amount;
      } else if (tx.type === 'deposit') {
        updates.totalDeposit = (userData.totalDeposit || 0) + tx.amount;
      } else if (tx.type === 'refund') {
        updates.totalDeposit = Math.max(0, (userData.totalDeposit || 0) - tx.amount);
      } else if (tx.type === 'pay_due') {
        updates.remainingDebt = Math.max(0, (userData.remainingDebt || 0) - tx.amount);
      }

      await updateDoc(userRef, updates);
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'confirmed',
        memoId: memoId
      });

      // Send immediate notification to user
      if (userData.email) {
        await sendNotification('Transaction Confirmed!', `Your ${tx.type} request of ৳${tx.amount.toLocaleString()} has been confirmed.`, userData.email);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-400 font-medium animate-pulse">Securing Connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-50 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-blue-400/10 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white leading-none">T.U.T.</h1>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Private Lending Authority</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-blue-100">{user.displayName}</p>
                  <p className="text-[10px] text-blue-400/60">{user.email}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowNotificationCenter(true);
                    setNotificationSettingsMode(false);
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-all relative",
                    notificationPermission === 'granted' ? "text-emerald-400 hover:bg-emerald-400/10" : "text-amber-400 hover:bg-amber-400/10"
                  )}
                  title="Notification Center"
                >
                  {notificationPermission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  {notificationHistory.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </button>
                <Button variant="outline" onClick={() => signOut(auth)} className="px-3 py-2">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {isLoggingIn ? 'Connecting...' : 'Member Login'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {user && notificationPermission !== 'granted' && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl shadow-xl shadow-amber-900/20"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellOff className="w-8 h-8 text-amber-500" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black text-white mb-1">Action Required: Enable System Alerts</h3>
                <p className="text-blue-200/70 leading-relaxed">
                  To ensure 100% reliability, you must connect your device to our notification system. 
                  {isIframe ? (
                    <span className="block mt-2 text-amber-400 font-bold">
                      ⚠️ Browser Security: You are in a preview window. You MUST open the app in a new tab to see the permission popup.
                    </span>
                  ) : (
                    " This allows the app to alert you instantly about loan approvals and deposit confirmations."
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                {isIframe ? (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-blue-900/40"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    1. Open in New Tab
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-amber-900/40"
                    onClick={requestNotificationPermission}
                  >
                    Connect Device Now
                  </Button>
                )}
                <p className="text-[10px] text-center text-blue-400/40 uppercase font-black tracking-widest">Secure Connection Required</p>
              </div>
            </div>
          </motion.div>
        )}
        {globalError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-4 text-red-400">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-red-500/10 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl"
            >
              {externalAction === 'loan' && (
                <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-bold animate-bounce">
                  <Wallet className="w-4 h-4" />
                  Direct Loan Request Portal Active
                </div>
              )}
              <h2 className="text-5xl font-black mb-6 leading-tight">
                Premium Financial <span className="text-blue-500">Security</span> & Private Lending
              </h2>
              <p className="text-blue-200/60 text-lg mb-10">
                Exclusive access to private lending, secure deposits, and verified financial memos. 
                Join the authority today.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button onClick={handleLogin} className="px-8 py-4 text-lg" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {isLoggingIn ? 'Opening Secure Portal...' : 'Get Started Now'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (!user) {
                      handleLogin();
                    } else {
                      setShowAdminLogin(true);
                    }
                  }} 
                  className="px-8 py-4 text-lg"
                >
                  Admin Access
                </Button>
              </div>
            </motion.div>
          </div>
        ) : !profile ? (
          <div className="max-w-xl mx-auto">
            {externalAction === 'loan' && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-400" />
                <p className="text-sm text-blue-200/80 font-medium">
                  Complete your registration to proceed with your <span className="text-blue-400 font-bold">Loan Request</span>.
                </p>
              </div>
            )}
            <Card title="Membership Registration" icon={UserPlus}>
              <form onSubmit={handleRegister} className="space-y-4">
                <Input 
                  label="Full Name (As per NID)" 
                  required 
                  value={regData.name}
                  onChange={e => setRegData({...regData, name: e.target.value})}
                  placeholder="e.g. Tahsin Ullah"
                />
                <Input 
                  label="Contact Email" 
                  type="email"
                  required 
                  value={regData.email}
                  onChange={e => setRegData({...regData, email: e.target.value})}
                  placeholder="your@email.com"
                />
                <Input 
                  label="NID Number" 
                  required 
                  value={regData.nid}
                  onChange={e => setRegData({...regData, nid: e.target.value})}
                  placeholder="10 or 17 digit NID"
                />
                <Input 
                  label="Full Address" 
                  required 
                  value={regData.address}
                  onChange={e => setRegData({...regData, address: e.target.value})}
                  placeholder="Current residential address"
                />
                <Input 
                  label="Occupation" 
                  required 
                  value={regData.occupation}
                  onChange={e => setRegData({...regData, occupation: e.target.value})}
                  placeholder="Your current profession"
                />
                <Input 
                  label="Phone Number (11 Digits)" 
                  type="text"
                  required 
                  value={regData.phone}
                  onChange={e => setRegData({...regData, phone: e.target.value})}
                  placeholder="017XXXXXXXX"
                />
                <Button type="submit" className="w-full py-3 mt-4">
                  Submit Membership Request
                </Button>
              </form>
            </Card>
          </div>
        ) : profile.status === 'pending' ? (
          <div className="max-w-xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Application Pending</h2>
            <p className="text-blue-200/60 mb-8">
              Your membership request is currently under review by the T.U.T. Authority. 
              You will be notified once your account is activated.
            </p>
            <Button variant="outline" onClick={() => setShowAdminLogin(true)}>
              Check Admin Status
            </Button>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {/* Advanced Dashboard Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <BalanceCard profile={profile} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <QuickAction 
                  icon={ArrowUpRight} 
                  label="Loan" 
                  variant="rose"
                  onClick={() => { setRequestType('loan'); setShowRequestModal(true); }} 
                />
                <QuickAction 
                  icon={ArrowDownLeft} 
                  label="Deposit" 
                  variant="blue"
                  onClick={() => { setRequestType('deposit'); setShowRequestModal(true); }} 
                />
                <QuickAction 
                  icon={HistoryIcon} 
                  label="Refund" 
                  variant="amber"
                  onClick={() => { setRequestType('refund'); setShowRequestModal(true); }} 
                />
                <QuickAction 
                  icon={CreditCard} 
                  label="Pay Due" 
                  variant="indigo"
                  onClick={() => { setRequestType('pay_due'); setShowRequestModal(true); }} 
                />
              </div>
            </div>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass p-6 rounded-3xl border-emerald-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">Status</span>
                </div>
                <h4 className="text-xl font-black text-white uppercase italic">Verified</h4>
                <p className="text-xs text-blue-400/60 mt-1 font-medium">Account Active</p>
              </div>

              <div className="glass p-6 rounded-3xl border-blue-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">Total Deposit</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tighter">৳ {profile.totalDeposit.toLocaleString()}</h4>
                <p className="text-xs text-blue-400/60 mt-1 font-medium">Lifetime Savings</p>
              </div>

              <div className="glass p-6 rounded-3xl border-rose-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-xl">
                    <ArrowUpRight className="w-5 h-5 text-rose-400" />
                  </div>
                  <span className="text-[10px] font-black text-rose-400/60 uppercase tracking-widest">Total Loan</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tighter">৳ {profile.totalLoan.toLocaleString()}</h4>
                <p className="text-xs text-blue-400/60 mt-1 font-medium">Borrowed Funds</p>
              </div>

              <div className="glass p-6 rounded-3xl border-amber-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest">Remaining Debt</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tighter">৳ {profile.remainingDebt.toLocaleString()}</h4>
                <p className="text-xs text-blue-400/60 mt-1 font-medium">Payable Amount</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <History className="w-6 h-6 text-blue-500" />
                    </div>
                    Transaction History
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {transactions.filter(t => t.status === 'confirmed').length > 0 ? (
                    transactions.filter(t => t.status === 'confirmed').map(tx => (
                      <motion.div 
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <DigitalMemo memo={tx} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-blue-400/20">
                      <History className="w-12 h-12 text-blue-400/20 mx-auto mb-4" />
                      <p className="text-blue-400/40 font-bold uppercase tracking-widest text-xs">No confirmed transactions yet</p>
                    </div>
                  )}
                </div>

                {transactions.filter(t => t.status === 'pending').length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-400/40 uppercase tracking-[0.2em] ml-2">Pending Requests</h4>
                    <div className="space-y-3">
                      {transactions.filter(t => t.status === 'pending').map(tx => (
                        <div key={tx.id} className="glass-dark border-amber-500/20 rounded-2xl p-5 flex justify-between items-center group hover:border-amber-500/40 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", 
                              tx.type === 'loan' ? "bg-rose-500/10 text-rose-400" : 
                              tx.type === 'refund' ? "bg-amber-500/10 text-amber-400" : 
                              "bg-emerald-500/10 text-emerald-400"
                            )}>
                              {tx.type === 'loan' ? <ArrowUpRight className="w-5 h-5" /> : 
                               tx.type === 'refund' ? <ArrowUpRight className="w-5 h-5" /> :
                               <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-black capitalize tracking-tight">{tx.type} Request</p>
                              <p className="text-[10px] font-bold text-blue-400/40 uppercase tracking-widest">{tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMM, HH:mm') : 'Just now'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-amber-400 tracking-tighter">৳ {tx.amount.toLocaleString()}</p>
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Awaiting Approval</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card title="Member Profile" icon={Shield} subtitle="Verified Identity">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-black">
                        {profile.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight">{profile.name}</p>
                        <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">{profile.occupation}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400/40 uppercase tracking-widest">Member ID</span>
                        <span className="text-xs font-mono font-bold text-amber-400 tracking-widest">{profile.memberId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400/40 uppercase tracking-widest">NID Number</span>
                        <span className="text-xs font-bold text-blue-100">{profile.nid}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400/40 uppercase tracking-widest">Phone</span>
                        <span className="text-xs font-bold text-blue-100">{profile.phone}</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex flex-col gap-3">
                      <Button variant="glass" className="w-full py-4 text-xs uppercase tracking-[0.2em] font-black" onClick={() => setShowProfileModal(true)}>
                        <User className="w-3 h-3" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" className="w-full py-4 text-xs uppercase tracking-[0.2em] font-black" onClick={() => setShowAdminLogin(true)}>
                        <Lock className="w-3 h-3" />
                        Admin Access
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="glass p-6 rounded-3xl border-blue-500/10">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Security Notice
                  </h4>
                  <p className="text-[10px] text-blue-400/60 leading-relaxed font-medium">
                    Your account is protected by T.U.T. Private Lending Authority. All transactions are digitally signed and verified. Never share your member ID or personal details with anyone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdminLoggedIn && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto"
          >
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 border border-white/10">
                    <Shield className="text-white w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter text-gradient">ADMIN PORTAL</h2>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">T.U.T. Private Authority</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right mr-4">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">System Status</p>
                    <p className="text-xs font-mono text-emerald-400">Users: {allUsers.length} | Tx: {allTransactions.length}</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowNotificationCenter(true)} className="relative">
                    <Bell className="w-5 h-5" />
                    {notificationHistory.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    )}
                  </Button>
                  <Button variant="danger" onClick={() => setIsAdminLoggedIn(false)}>
                    <X className="w-5 h-5" />
                    Close Admin
                  </Button>
                </div>
              </div>

              {notificationPermission !== 'granted' && (
                <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BellOff className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-white">Admin Notifications Disabled</p>
                      <p className="text-xs text-amber-500/70">You will not receive real-time alerts for new membership or transaction requests.</p>
                    </div>
                  </div>
                  <Button onClick={requestNotificationPermission} className="bg-amber-500 hover:bg-amber-600 text-xs py-1 h-auto">
                    Enable Notifications
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Pending Members */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-3 border-b border-white/5 pb-6 uppercase tracking-tight italic">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <UserPlus className="w-6 h-6 text-blue-400" />
                    </div>
                    Pending Registrations
                  </h3>
                  <div className="space-y-4">
                    {allUsers.filter(u => u.status === 'pending').length > 0 ? (
                      allUsers.filter(u => u.status === 'pending').map(u => (
                        <Card key={u.uid} className="border-amber-500/20">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-bold">{u.name}</h4>
                              <p className="text-xs text-blue-400/60">{u.phone} | {u.occupation}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => rejectMember(u.uid)}>Reject</Button>
                              <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => approveMember(u.uid)}>Approve</Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-4 border-t border-white/5">
                            <div>
                              <p className="text-blue-400/40 uppercase font-black tracking-widest mb-1">NID Number</p>
                              <p className="font-mono text-blue-100">{u.nid}</p>
                            </div>
                            <div>
                              <p className="text-blue-400/40 uppercase font-black tracking-widest mb-1">Address</p>
                              <p className="truncate text-blue-100">{u.address}</p>
                            </div>
                            {(u.facebook || u.whatsapp || u.telegram) && (
                              <div className="col-span-2 mt-2">
                                <p className="text-blue-400/40 uppercase font-black tracking-widest mb-2">Social Links</p>
                                <div className="flex flex-wrap gap-3">
                                  {u.facebook && (
                                    <a href={u.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded-lg">
                                      <Facebook className="w-3 h-3" />
                                      <span className="text-[10px] font-bold">Facebook</span>
                                    </a>
                                  )}
                                  {u.whatsapp && (
                                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                      <MessageSquare className="w-3 h-3" />
                                      <span className="text-[10px] font-bold">{u.whatsapp}</span>
                                    </div>
                                  )}
                                  {u.telegram && (
                                    <div className="flex items-center gap-1.5 text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg">
                                      <Send className="w-3 h-3" />
                                      <span className="text-[10px] font-bold">{u.telegram}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <p className="text-blue-400/40 text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-blue-400/10">
                        No pending registrations.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pending Transactions */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-3 border-b border-white/5 pb-6 uppercase tracking-tight italic">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <CreditCard className="w-6 h-6 text-amber-400" />
                    </div>
                    Transaction Requests
                  </h3>
                  <div className="space-y-4">
                    {allTransactions.filter(t => t.status === 'pending').length > 0 ? (
                      allTransactions.filter(t => t.status === 'pending').map(tx => (
                        <Card key={tx.id} className="border-blue-500/20">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className={cn("p-3 rounded-xl", 
                                tx.type === 'loan' ? "bg-red-500/20" : 
                                tx.type === 'refund' ? "bg-amber-500/20" : 
                                tx.type === 'pay_due' ? "bg-blue-500/20" :
                                "bg-emerald-500/20"
                              )}>
                                {tx.type === 'loan' ? <ArrowUpRight className="w-6 h-6 text-red-400" /> : 
                                 tx.type === 'refund' ? <ArrowUpRight className="w-6 h-6 text-amber-400" /> :
                                 tx.type === 'pay_due' ? <ArrowDownLeft className="w-6 h-6 text-blue-400" /> :
                                 <ArrowDownLeft className="w-6 h-6 text-emerald-400" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg">{tx.userName}</h4>
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs text-blue-400/60 uppercase font-black tracking-[0.2em]">{tx.type.replace('_', ' ')} Request</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                      {tx.method}
                                    </span>
                                    {tx.accountNumber && (
                                      <span className="text-[10px] font-mono text-blue-100 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                        Acc: <span className="text-amber-400 font-bold">{tx.accountNumber}</span>
                                      </span>
                                    )}
                                    {tx.transactionId && (
                                      <span className="text-[10px] font-mono text-blue-100 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                        TrxID: <span className="text-emerald-400 font-bold">{tx.transactionId}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex flex-col gap-2">
                              <p className="text-xl font-black text-white mb-1">৳ {tx.amount.toLocaleString()}</p>
                              <div className="flex gap-2">
                                <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => rejectTransaction(tx)}>Reject</Button>
                                <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => confirmTransaction(tx)}>Confirm</Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <p className="text-blue-400/40 text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-blue-400/10">
                        No pending transactions.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* All Members List */}
              <div className="mt-20 space-y-8">
                <h3 className="text-2xl font-black flex items-center gap-3 border-b border-white/5 pb-6 uppercase tracking-tight italic">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Search className="w-6 h-6 text-blue-400" />
                  </div>
                  All Members Directory
                </h3>
                <div className="glass rounded-3xl overflow-hidden border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Member ID</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Name</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Phone</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Total Loan</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Total Deposit</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em]">Debt</th>
                          <th className="py-5 px-6 text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers.filter(u => u.status === 'approved').length > 0 ? (
                          allUsers.filter(u => u.status === 'approved').map(u => (
                            <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                              <td className="py-5 px-6 font-mono text-amber-400 text-sm font-bold tracking-widest">{u.memberId}</td>
                              <td className="py-5 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                                    {u.name.charAt(0)}
                                  </div>
                                  <span className="font-black tracking-tight">{u.name}</span>
                                </div>
                              </td>
                              <td className="py-5 px-6 text-sm text-blue-200/60 font-medium">{u.phone}</td>
                              <td className="py-5 px-6 text-sm text-rose-400 font-bold tracking-tighter">৳ {u.totalLoan.toLocaleString()}</td>
                              <td className="py-5 px-6 text-sm text-emerald-400 font-bold tracking-tighter">৳ {u.totalDeposit.toLocaleString()}</td>
                              <td className="py-5 px-6 text-sm font-black text-white tracking-tighter">৳ {u.remainingDebt.toLocaleString()}</td>
                              <td className="py-5 px-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="glass" className="px-3 py-1.5 text-[10px] uppercase font-black tracking-widest" onClick={() => openEditModal(u)}>
                                    Edit
                                  </Button>
                                  <Button variant="danger" className="px-3 py-1.5 text-[10px] uppercase font-black" onClick={() => {
                                    setUserToDelete(u);
                                    setShowDeleteModal(true);
                                  }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-20 text-center text-blue-400/40 italic font-medium uppercase tracking-widest text-[10px]">
                              No approved members found in the directory
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        title="Edit Profile Details"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Basic Information</h4>
            <Input 
              label="Full Name" 
              required 
              value={profileData.name}
              onChange={e => setProfileData({...profileData, name: e.target.value})}
            />
            <Input 
              label="Contact Email" 
              type="email"
              required 
              value={profileData.email}
              onChange={e => setProfileData({...profileData, email: e.target.value})}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Phone Number" 
                required 
                value={profileData.phone}
                onChange={e => setProfileData({...profileData, phone: e.target.value})}
              />
              <Input 
                label="Occupation" 
                required 
                value={profileData.occupation}
                onChange={e => setProfileData({...profileData, occupation: e.target.value})}
              />
            </div>
            <Input 
              label="Full Address" 
              required 
              value={profileData.address}
              onChange={e => setProfileData({...profileData, address: e.target.value})}
            />
          </div>

          {/* Personal Details */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Personal Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Father's Name" 
                value={profileData.fatherName}
                onChange={e => setProfileData({...profileData, fatherName: e.target.value})}
              />
              <Input 
                label="Mother's Name" 
                value={profileData.motherName}
                onChange={e => setProfileData({...profileData, motherName: e.target.value})}
              />
              <Input 
                label="Date of Birth" 
                type="date"
                value={profileData.dob}
                onChange={e => setProfileData({...profileData, dob: e.target.value})}
              />
              <Input 
                label="Blood Group" 
                value={profileData.bloodGroup}
                onChange={e => setProfileData({...profileData, bloodGroup: e.target.value})}
                placeholder="e.g. A+"
              />
            </div>
            <Input 
              label="Emergency Contact" 
              value={profileData.emergencyContact}
              onChange={e => setProfileData({...profileData, emergencyContact: e.target.value})}
              placeholder="Name & Phone"
            />
          </div>

          {/* Nominee Information */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Nominee Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Nominee Name" 
                value={profileData.nomineeName}
                onChange={e => setProfileData({...profileData, nomineeName: e.target.value})}
              />
              <Input 
                label="Relation with Nominee" 
                value={profileData.nomineeRelation}
                onChange={e => setProfileData({...profileData, nomineeRelation: e.target.value})}
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Social Media</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Facebook Profile Link" 
                value={profileData.facebook}
                onChange={e => setProfileData({...profileData, facebook: e.target.value})}
              />
              <Input 
                label="WhatsApp Number" 
                value={profileData.whatsapp}
                onChange={e => setProfileData({...profileData, whatsapp: e.target.value})}
              />
              <Input 
                label="Telegram Username" 
                value={profileData.telegram}
                onChange={e => setProfileData({...profileData, telegram: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-slate-950/80 backdrop-blur-md py-4 border-t border-white/5">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowProfileModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Update Profile
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400 font-bold">Warning: This action is permanent!</p>
            <p className="text-xs text-red-400/60 mt-1">Are you sure you want to delete the account for <span className="font-bold text-red-400">{userToDelete?.name}</span>?</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteUser}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showEditUserModal} 
        onClose={() => setShowEditUserModal(false)} 
        title={`Edit Member: ${editingUser?.name}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Input 
            label="Total Loan (৳)" 
            type="number" 
            required 
            value={editLoan}
            onChange={e => setEditLoan(e.target.value)}
          />
          <Input 
            label="Total Deposit (৳)" 
            type="number" 
            required 
            value={editDeposit}
            onChange={e => setEditDeposit(e.target.value)}
          />
          <Input 
            label="Remaining Debt (৳)" 
            type="number" 
            required 
            value={editDebt}
            onChange={e => setEditDebt(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Facebook Link" 
              value={editingUser?.facebook || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, facebook: e.target.value} : null)}
            />
            <Input 
              label="WhatsApp" 
              value={editingUser?.whatsapp || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, whatsapp: e.target.value} : null)}
            />
            <Input 
              label="Telegram" 
              value={editingUser?.telegram || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, telegram: e.target.value} : null)}
            />
            <Input 
              label="Father's Name" 
              value={editingUser?.fatherName || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, fatherName: e.target.value} : null)}
            />
            <Input 
              label="Mother's Name" 
              value={editingUser?.motherName || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, motherName: e.target.value} : null)}
            />
            <Input 
              label="Date of Birth" 
              type="date"
              value={editingUser?.dob || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, dob: e.target.value} : null)}
            />
            <Input 
              label="Blood Group" 
              value={editingUser?.bloodGroup || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, bloodGroup: e.target.value} : null)}
            />
            <Input 
              label="Emergency Contact" 
              value={editingUser?.emergencyContact || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, emergencyContact: e.target.value} : null)}
            />
            <Input 
              label="Nominee Name" 
              value={editingUser?.nomineeName || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, nomineeName: e.target.value} : null)}
            />
            <Input 
              label="Nominee Relation" 
              value={editingUser?.nomineeRelation || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, nomineeRelation: e.target.value} : null)}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showAdminLogin} 
        onClose={() => setShowAdminLogin(false)} 
        title="Admin Authentication"
      >
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <Input 
            label="Admin Password" 
            type="password" 
            required 
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            placeholder="Enter password"
          />
          <Input 
            label="Security PIN" 
            type="password" 
            maxLength={4}
            required 
            value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            placeholder="4-digit PIN"
          />
          {adminError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {adminError}
            </div>
          )}
          <Button type="submit" className="w-full py-3">
            Verify & Enter Dashboard
          </Button>
        </form>
      </Modal>

      <Modal 
        isOpen={showRequestModal} 
        onClose={() => setShowRequestModal(false)} 
        title={`Request New ${requestType === 'loan' ? 'Loan' : requestType === 'deposit' ? 'Deposit' : requestType === 'refund' ? 'Refund' : 'Due Payment'}`}
      >
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Current Balance</p>
            <p className="text-2xl font-black">৳ {profile?.totalDeposit.toLocaleString()}</p>
          </div>
          
          <Input 
            label="Amount (BDT)" 
            type="number" 
            required 
            value={requestAmount}
            onChange={e => setRequestAmount(e.target.value)}
            placeholder="Enter amount in BDT"
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/70 ml-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['Cash', 'Bkash', 'Nagad', 'Recharge'].map((m) => {
                const isDisabled = (requestType === 'deposit' || requestType === 'pay_due') && m === 'Recharge';
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setRequestMethod(m as any)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-bold transition-all",
                      requestMethod === m 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : "bg-slate-950 border-blue-400/20 text-blue-400 hover:bg-blue-400/5",
                      isDisabled && "opacity-20 grayscale pointer-events-none"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {(requestType === 'deposit' || requestType === 'pay_due') && (requestMethod === 'Bkash' || requestMethod === 'Nagad') && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Payment Instructions</p>
              </div>
              <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black", 
                    requestMethod === 'Bkash' ? "bg-[#D12053] text-white" : "bg-[#F6921E] text-white"
                  )}>
                    {requestMethod === 'Bkash' ? 'b' : 'n'}
                  </div>
                  <span className="text-xs font-bold text-white">{requestMethod} Personal</span>
                </div>
                <span className="text-sm font-mono font-black text-amber-400 tracking-wider">
                  {requestMethod === 'Bkash' ? '01713710607' : '01921801100'}
                </span>
              </div>
              <p className="text-[9px] text-amber-500/60 font-medium leading-tight">
                Please complete the "Send Money" transaction to this personal account first, then provide the Transaction ID (TrxID) below for verification.
              </p>
            </div>
          )}

          {(requestType === 'loan' || requestType === 'refund') && (
            <Input 
              label="Account Number (to receive money)" 
              required 
              value={requestAccount}
              onChange={e => setRequestAccount(e.target.value)}
              placeholder="Enter your account number"
            />
          )}

          {(requestType === 'deposit' || requestType === 'pay_due') && requestMethod !== 'Cash' && (
            <Input 
              label="Transaction ID (TrxID)" 
              required 
              value={requestTrxId}
              onChange={e => setRequestTrxId(e.target.value)}
              placeholder="Enter the transaction ID"
            />
          )}

          {requestType === 'refund' && (
            <p className="text-xs text-amber-400 font-medium bg-amber-400/10 p-2 rounded border border-amber-400/20">
              Note: Refund requests will be subtracted from your Total Deposit after admin verification.
            </p>
          )}

          <p className="text-[10px] text-blue-400/60 leading-relaxed">
            By submitting this request, you agree to the T.U.T. Private Lending Authority terms. 
            All requests are subject to manual verification by the admin.
          </p>
          <Button type="submit" className="w-full py-3">
            Submit {requestType.replace('_', ' ')} Request
          </Button>
        </form>
      </Modal>

      {/* Gmail Help Modal */}
      <Modal
        isOpen={showGmailHelp}
        onClose={() => setShowGmailHelp(false)}
        title="Gmail Setup Troubleshooting"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Authentication Failed (535 Error)
            </h4>
            <p className="text-xs text-red-200/70 leading-relaxed">
              Google rejected your login. This almost always means the <b>App Password</b> is incorrect or not set up properly.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Step 1: Verify 2-Step Verification</h5>
              <p className="text-xs text-blue-100/70">
                You <b>must</b> have 2-Step Verification enabled on your Google Account to use App Passwords.
              </p>
              <a 
                href="https://myaccount.google.com/signinoptions/two-step-verification" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                Open 2-Step Settings <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Step 2: Generate a New App Password</h5>
              <p className="text-xs text-blue-100/70">
                Go to the App Passwords page, select "Other" and name it "TUT App". Copy the <b>16-character code</b> (e.g., <code>abcd efgh ijkl mnop</code>).
              </p>
              <a 
                href="https://myaccount.google.com/apppasswords" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                Open App Passwords Page <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Step 3: Update AI Studio Secrets</h5>
              <p className="text-xs text-blue-100/70">
                1. Click the <b>Gear Icon (Settings)</b> in the top right of AI Studio.<br />
                2. Select <b>Secrets</b>.<br />
                3. Update <code>GMAIL_APP_PASSWORD</code> with the 16-character code (<b>remove all spaces</b>).<br />
                4. Ensure <code>GMAIL_USER</code> is your full email address.
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setShowGmailHelp(false)}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            I've Updated My Secrets
          </Button>
        </div>
      </Modal>

      {/* Notification Center Modal */}
      <Modal 
        isOpen={showNotificationCenter} 
        onClose={() => setShowNotificationCenter(false)}
        title={notificationSettingsMode ? "Notification Settings" : "Notification Center"}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-blue-400/10 pb-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setNotificationSettingsMode(false)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  !notificationSettingsMode ? "bg-blue-600 text-white" : "text-blue-400 hover:bg-blue-400/10"
                )}
              >
                History
              </button>
              <button 
                onClick={() => setNotificationSettingsMode(true)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  notificationSettingsMode ? "bg-blue-600 text-white" : "text-blue-400 hover:bg-blue-400/10"
                )}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
            {!notificationSettingsMode && notificationHistory.length > 0 && (
              <button 
                onClick={clearNotificationHistory}
                className="text-xs text-red-400 hover:text-red-300 font-bold"
              >
                Clear All
              </button>
            )}
          </div>

          {notificationSettingsMode ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-slate-900/50 border border-blue-400/10 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">System Notifications</p>
                    <p className="text-xs text-blue-200/60">Receive alerts on your device</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                      notificationPermission === 'granted' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {notificationPermission}
                    </span>
                    <Button 
                      onClick={requestNotificationPermission}
                      className={cn(
                        "text-xs py-1 h-auto",
                        notificationPermission === 'granted' ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-blue-600"
                      )}
                    >
                      {notificationPermission === 'granted' ? 'Reset' : 'Turn On'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-blue-400/5">
                  <div>
                    <p className="font-bold text-white">Outgoing Email Alerts</p>
                    <p className="text-xs text-blue-200/60">Send Gmail updates to members</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                      gmailNotificationsEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"
                    )}>
                      {gmailNotificationsEnabled ? 'Active' : 'Off'}
                    </span>
                    <Button 
                      onClick={() => setGmailNotificationsEnabled(!gmailNotificationsEnabled)}
                      className={cn(
                        "text-xs py-1 h-auto",
                        gmailNotificationsEnabled ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-blue-600"
                      )}
                    >
                      {gmailNotificationsEnabled ? 'Turn Off' : 'Turn On'}
                    </Button>
                  </div>
                </div>

                {gmailNotificationsEnabled && (
                  <div className="p-4 bg-blue-500/5 border border-blue-400/10 rounded-xl space-y-3 animate-in zoom-in-95">
                    <p className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Gmail Setup Guide
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">1</span>
                        <p className="text-[11px] text-blue-200/70">Go to <b>Google Account &gt; Security</b></p>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">2</span>
                        <p className="text-[11px] text-blue-200/70">Enable <b>2-Step Verification</b></p>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">3</span>
                        <p className="text-[11px] text-blue-200/70">Search for <b>"App Passwords"</b></p>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">4</span>
                        <p className="text-[11px] text-blue-200/70">Create one and copy the <b>16-character code</b></p>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">5</span>
                        <p className="text-[11px] text-blue-200/70">Add it to <b>AI Studio Secrets</b> as <code>GMAIL_APP_PASSWORD</code></p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-blue-400/5 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-blue-400 uppercase mb-3">System Status</p>
                    {systemConfig ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-900/50 border border-blue-400/5 rounded-lg">
                          <p className="text-[10px] text-blue-400/60 uppercase font-bold">GMAIL_USER</p>
                          <p className={cn("text-xs font-mono", systemConfig.gmailUserSet ? "text-emerald-400" : "text-red-400")}>
                            {systemConfig.gmailUserSet ? "CONFIGURED" : "MISSING"}
                          </p>
                        </div>
                        <div className="p-2 bg-slate-900/50 border border-blue-400/5 rounded-lg">
                          <p className="text-[10px] text-blue-400/60 uppercase font-bold">APP_PASSWORD</p>
                          <p className={cn("text-xs font-mono", systemConfig.gmailAppPasswordSet ? "text-emerald-400" : "text-red-400")}>
                            {systemConfig.gmailAppPasswordSet ? `${systemConfig.gmailAppPasswordLength} chars` : "MISSING"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-10 bg-slate-900/50 animate-pulse rounded-lg" />
                    )}
                  </div>

                  <p className="text-xs font-bold text-blue-400 uppercase mb-3">Diagnostic Tools</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={testNotification}
                      className="w-full flex items-center justify-between p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-400/10 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-100">Check Eligibility (Test)</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-blue-400/40 group-hover:text-blue-400 transition-colors" />
                    </button>
                    
                    {isIframe && (
                      <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full flex items-center justify-between p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <ExternalLink className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-100">Open in New Tab (Fix Problems)</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                      </button>
                    )}

                    <button 
                      onClick={async () => {
                        if (!user?.email) return;
                        try {
                          await sendEmail(user.email, 'T.U.T. Gmail Test', 'This is a test email from your T.U.T. Private Lending Authority system. If you received this, your Gmail notification system is working perfectly!');
                          addToast('Email Sent', 'Check your Gmail inbox for the test message.', 'success');
                        } catch (e: any) {
                          // Error is already handled in sendEmail, but we can show the help modal here
                          setShowGmailHelp(true);
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-emerald-500/5 hover:bg-emerald-400/10 border border-emerald-400/10 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-100">Test Gmail Connection</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400/40 group-hover:text-emerald-400 transition-colors" />
                    </button>

                    {lastGmailError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                        <p className="text-[11px] font-bold text-red-400 uppercase flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" />
                          Connection Error
                        </p>
                        <p className="text-[10px] text-red-200/70 leading-relaxed">
                          {lastGmailError}
                        </p>
                        <button 
                          onClick={() => setShowGmailHelp(true)}
                          className="text-[10px] font-bold text-blue-400 hover:underline"
                        >
                          View Troubleshooting Guide &rarr;
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/health');
                          const data = await res.json();
                          if (data.status === 'ok') {
                            addToast('Server Online', 'Backend system is responding correctly.', 'success');
                          } else {
                            throw new Error('Invalid response');
                          }
                        } catch (e) {
                          addToast('Server Error', 'Backend system is not responding. Try reloading.', 'warning');
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-slate-500/5 hover:bg-slate-500/10 border border-slate-400/10 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <HistoryIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-100">Check Server Health</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400/40 group-hover:text-slate-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/5 border border-blue-400/10 rounded-xl">
                <p className="text-xs text-blue-200/60 leading-relaxed">
                  <span className="font-bold text-blue-400">Note:</span> Browser security often blocks notifications inside iframes. If you are not receiving alerts, use the "Open in New Tab" option above to establish a secure connection.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
              {notificationHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-blue-500/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BellOff className="w-8 h-8 text-blue-400/20" />
                  </div>
                  <p className="text-blue-200/40 font-medium">No notification history</p>
                </div>
              ) : (
                notificationHistory.map(notif => (
                  <div key={notif.id} className="p-4 bg-slate-900/50 border border-blue-400/10 rounded-xl hover:border-blue-400/30 transition-all group">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                      <span className="text-[10px] font-mono text-blue-400/40">
                        {format(notif.timestamp, 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/60 leading-relaxed">{notif.body}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Toasts Container */}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={cn(
                "pointer-events-auto w-80 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex gap-4 items-start",
                toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20" : 
                toast.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" : 
                "bg-blue-500/10 border-blue-500/20"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                toast.type === 'success' ? "bg-emerald-500/20 text-emerald-400" : 
                toast.type === 'warning' ? "bg-amber-500/20 text-amber-400" : 
                "bg-blue-500/20 text-blue-400"
              )}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{toast.title}</p>
                <p className="text-xs text-blue-200/60 leading-relaxed mt-1">{toast.body}</p>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-blue-200/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/8801713710607" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-900/40 hover:scale-110 active:scale-95 transition-all"
      >
        <MessageCircle className="w-8 h-8" />
      </a>
    </div>
  );
}
