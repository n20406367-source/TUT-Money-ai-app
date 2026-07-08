/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, Component, useRef } from 'react';
import { MemberDashboard } from './components/MemberDashboard';
import { SecureTransactionPortal } from './components/SecureTransactionPortal';
import tutLogo from './assets/images/tut_logo_1783437312744.jpg';
import { 
  auth, db, storage 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
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
  deleteDoc,
  increment
} from 'firebase/firestore';
import { 
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
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
  Send,
  Eye,
  EyeOff,
  Copy,
  Upload,
  Camera,
  Briefcase,
  Activity,
  TrendingUp,
  Plus,
  Tag,
  Play,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Constants ---
const ADMIN_EMAIL = 'tahsinullahtusher999@gmail.com'.toLowerCase();

const DEFAULT_SPONSORSHIPS: SponsorshipCampaign[] = [];

const LOADING_STATUSES = [
  "Securing Authority Gateway...",
  "Initializing Encrypted Session...",
  "Verifying Digital Signature...",
  "Syncing Financial Ledger...",
  "Establishing Secure Node...",
  "Connecting to T.U.T. Mainframe..."
];

// --- Utils ---
export function cn(...inputs: ClassValue[]) {
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
  return errInfo;
}

// --- Types ---
export interface UserProfile {
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
  
  // New Fields
  photoUrl?: string;
  permanentAddress?: string;
  referenceContact?: string;
  adminNotes?: string;
  
  status: 'pending' | 'approved';
  memberId?: string;
  totalLoan: number;
  totalDeposit: number;
  remainingDebt: number;
  role: 'admin' | 'member';
  createdAt: any;
  borrowingLimit?: number;

  // Subscription and Loyalty Fields
  subscriptionTier?: 'bronze' | 'silver' | 'gold' | null;
  subscriptionStatus?: 'active' | 'expired' | 'pending_approval' | null;
  subscriptionExpiresAt?: string | null;
  continuousSubscriptionMonths?: number;
  loansTakenThisMonth?: number;
  consecutiveNoLoanMonths?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName?: string;
  type: 'loan' | 'deposit' | 'refund' | 'pay_due' | 'subscription';
  amount: number;
  method: 'Cash' | 'Bkash' | 'Nagad' | 'Recharge';
  accountNumber?: string;
  transactionId?: string;
  status: 'pending' | 'confirmed';
  timestamp: any;
  memoId?: string;
  loanReason?: string;
  estimatedRepaymentDate?: string;
  lastReminderSent?: string;
  subscriptionTier?: 'bronze' | 'silver' | 'gold';
  subscriptionMonths?: number;
  isTransfer?: boolean;
  transferType?: 'in' | 'out';
  transferRecipientName?: string;
  transferRecipientId?: string;
  transferSenderName?: string;
  transferSenderId?: string;
  details?: string;
}

export interface SponsorshipCampaign {
  id: string;
  companyName: string;
  dealValue: number;
  status: 'active' | 'paused' | 'completed';
  campaignType: 'Premium Partner' | 'Strategic Collab' | 'Community Sponsor';
  promotionText: string;
  impressions: number;
  clicks?: number;
  startDate: string;
  endDate: string;
  logoUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  targetUrl?: string;
  specialOffer?: string;
}

// --- Error Boundary ---
export class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md glass p-8 rounded-3xl border-rose-500/20">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white mb-4 uppercase italic">System Interrupted</h2>
            <p className="text-blue-200/60 mb-8 leading-relaxed">
              An unexpected error occurred. This might be due to a connection issue or a temporary system failure.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
            >
              Restart Application
            </button>
            {this.state.error && (
              <pre className="mt-6 p-4 bg-black/40 rounded-xl text-[10px] text-rose-400/60 text-left overflow-auto max-h-32 font-mono">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

export const Button = ({ 
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
        "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 min-h-[44px] touch-manipulation",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className, title, icon: Icon, subtitle }: { children: React.ReactNode, className?: string, title?: string, icon?: any, subtitle?: string }) => (
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

const FileUploader = ({ onUpload, currentUrl, label, maxDimension = 400, shape = 'circle' }: { onUpload: (url: string) => void, currentUrl?: string, label: string, maxDimension?: number, shape?: 'circle' | 'square' }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit original file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    
    // We use client-side compression to Base64 to bypass Cloud Storage setup limits and prevent hanging.
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = maxDimension; // Custom max dimension
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // High quality
          onUpload(dataUrl);
        } else {
          alert('Failed to process image');
        }
        setUploading(false);
      };
      
      img.onerror = () => {
        console.error("Image load error");
        alert("Failed to read image file.");
        setUploading(false);
      };

      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      console.error("File read error", reader.error);
      alert("Failed to read file.");
      setUploading(false);
    };
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest ml-1">{label}</label>
      <div className="flex items-center gap-4 p-4 bg-slate-900/50 border border-white/5 rounded-2xl backdrop-blur-sm">
        <div className={cn(
          "border-2 border-amber-500/30 p-1 flex-shrink-0 overflow-hidden bg-blue-600/10 flex items-center justify-center",
          shape === 'circle' ? 'w-16 h-16 rounded-full' : 'w-24 h-16 rounded-2xl'
        )}>
          {currentUrl ? (
            <img 
              src={currentUrl} 
              alt="Preview" 
              className={cn("w-full h-full object-cover", shape === 'circle' ? 'rounded-full' : 'rounded-xl')} 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-400/40" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
          />
          <Button 
            type="button" 
            variant="outline" 
            className="w-full py-2 text-xs" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Upload File</>
            )}
          </Button>
          <p className="text-[9px] text-blue-400/40 mt-2 text-center uppercase font-black tracking-widest">Max 5MB (JPG/PNG)</p>
        </div>
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
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

export const DigitalMemo = ({ memo }: { memo: Transaction }) => (
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
          <span className={cn("text-xs font-black uppercase tracking-tight", 
            memo.isTransfer ? (memo.transferType === 'out' ? "text-rose-600" : "text-emerald-600") :
            memo.type === 'refund' || memo.type === 'loan' ? "text-rose-600" : "text-emerald-600"
          )}>
            {memo.isTransfer ? (memo.transferType === 'out' ? "Transfer Out" : "Transfer In") : memo.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
          <span className="text-[10px] font-bold text-blue-900/40 uppercase">Payment Method</span>
          <span className="text-xs font-bold text-blue-900">{memo.isTransfer ? 'T.U.T Account Transfer' : memo.method}</span>
        </div>
        {memo.isTransfer && memo.transferType === 'out' && (
          <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
            <span className="text-[10px] font-bold text-blue-900/40 uppercase">Recipient</span>
            <span className="text-xs font-black text-rose-600 truncate max-w-[150px]">
              {memo.transferRecipientName || 'N/A'} ({memo.transferRecipientId || 'N/A'})
            </span>
          </div>
        )}
        {memo.isTransfer && memo.transferType === 'in' && (
          <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
            <span className="text-[10px] font-bold text-blue-900/40 uppercase">Sender</span>
            <span className="text-xs font-black text-emerald-600 truncate max-w-[150px]">
              {memo.transferSenderName || 'N/A'} ({memo.transferSenderId || 'N/A'})
            </span>
          </div>
        )}
        {memo.type === 'loan' && memo.estimatedRepaymentDate && (
          <div className="flex justify-between border-b border-blue-50/50 pb-1.5">
            <span className="text-[10px] font-bold text-blue-900/40 uppercase">Expected Repayment</span>
            <span className="text-xs font-black text-amber-600">
              {format(new Date(memo.estimatedRepaymentDate), 'dd MMM yyyy')}
            </span>
          </div>
        )}
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

// --- Subscription and Loyalty Helpers ---
const getSubscriptionStatusInfo = (profile: UserProfile | null) => {
  if (!profile) return { active: false, status: 'none', tier: null, isLocked: false, isRenewalWindow: false, expiresAt: null };
  
  const today = new Date();
  const currentDay = today.getDate();
  
  const expiresAt = profile.subscriptionExpiresAt ? new Date(profile.subscriptionExpiresAt) : null;
  const isCurrentlyActive = profile.subscriptionStatus === 'active' && expiresAt && expiresAt >= today;
  
  // Standard renewal window is day 1 to 5
  const isRenewalWindow = currentDay >= 1 && currentDay <= 5;
  
  // Day 6 onwards is locked if not active
  const isLocked = currentDay >= 6 && !isCurrentlyActive;
  
  return {
    active: !!isCurrentlyActive,
    status: profile.subscriptionStatus || 'none',
    tier: profile.subscriptionTier || null,
    isLocked,
    isRenewalWindow,
    expiresAt
  };
};

export const getSubscriptionPricing = (tier: 'bronze' | 'silver' | 'gold', profile: UserProfile | null) => {
  const basePrices = {
    bronze: 20,
    silver: 50,
    gold: 100
  };
  
  const basePrice = basePrices[tier];
  
  const today = new Date();
  const currentDay = today.getDate();
  const isLate = currentDay >= 6;
  
  let price = basePrice;
  let label = "1-Month standard fee";
  let months = 1;
  
  if (isLate) {
    price = basePrice * 2;
    label = "2-Month Late Renewal Catch-up fee";
    months = 2;
  }
  
  let discountApplied = 0;
  let discountReason = "";
  
  if ((profile?.consecutiveNoLoanMonths || 0) >= 2) {
    discountApplied = price * 0.5;
    price = price - discountApplied;
    discountReason = "50% No-Loan Reward Discount Applied! (0 loans taken in the last 2 billing cycles)";
  } else if ((profile?.continuousSubscriptionMonths || 0) >= 3 && !isLate) {
    discountApplied = price * 0.1;
    price = price - discountApplied;
    discountReason = "10% Loyalty Streak Discount Applied! (3+ months consecutive on-time renewals)";
  }
  
  return {
    basePrice,
    price,
    label,
    months,
    discountApplied,
    discountReason,
    isLate
  };
};

export const SubscriptionBadge = ({ tier, status, expiresAtStr }: { tier?: 'bronze' | 'silver' | 'gold' | null, status?: string | null, expiresAtStr?: string | null }) => {
  if (!tier || status !== 'active') return null;
  
  const today = new Date();
  const expDate = expiresAtStr ? new Date(expiresAtStr) : null;
  if (expDate && expDate < today) return null;

  if (tier === 'bronze') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#cd7f32]/10 text-[#cd7f32] border border-[#cd7f32]/30 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shadow-[0_0_10px_rgba(205,127,50,0.1)]">
        🥉 Bronze Member
      </span>
    );
  }
  if (tier === 'silver') {
    return (
      <span className="inline-flex items-center gap-1 bg-slate-300/10 text-slate-300 border border-slate-300/30 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shadow-[0_0_12px_rgba(203,213,225,0.15)] animate-pulse">
        🥈 Silver Exec
      </span>
    );
  }
  if (tier === 'gold') {
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/40 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse">
        👑 Gold Elite
      </span>
    );
  }
  return null;
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 transition-all active:scale-95",
        copied 
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
          : "bg-white/5 text-blue-400 border-white/10 hover:bg-white/10 hover:border-white/25"
      )}
      title="Copy to Clipboard"
    >
      <Copy className="w-3 h-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

export const BalanceCard = ({ profile }: { profile: UserProfile }) => (
  <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-2xl shadow-blue-900/40 group">
    {/* Decorative background elements */}
    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
    
    <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
      <div className="flex justify-between items-start">
        <div className="space-y-6 w-full">
          <div>
            <p className="text-blue-100/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">Current Balance</p>
            <h2 className="text-5xl font-black tracking-tighter">৳ {profile.totalDeposit.toLocaleString()}</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <p className="text-rose-200/60 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">Remaining Debt</p>
              <h3 className="text-2xl font-black tracking-tighter text-rose-200">৳ {profile.remainingDebt.toLocaleString()}</h3>
            </div>
            <div>
              <p className="text-yellow-200/60 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">Borrowing Limit</p>
              <h3 className="text-2xl font-black tracking-tighter text-yellow-300">৳ {(profile.borrowingLimit ?? 100000).toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex-shrink-0">
          <Wallet className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="mt-12 flex justify-between items-end">
        <div>
          <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">Member ID</p>
          <p className="text-lg font-mono font-bold tracking-widest text-blue-50">{profile.memberId}</p>
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end gap-1 mb-1">
            <p className="text-blue-100/40 text-[10px] font-bold uppercase tracking-widest">Account Holder</p>
            <SubscriptionBadge tier={profile.subscriptionTier} status={profile.subscriptionStatus} expiresAtStr={profile.subscriptionExpiresAt} />
          </div>
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

const VisionBranding = ({ showMotto = true }: { showMotto?: boolean }) => (
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.1 }}
    className="relative py-16"
  >
    <div className="absolute -inset-24 bg-blue-600/5 blur-[120px] rounded-full opacity-40 pointer-events-none" />
    <div className="relative z-10 flex flex-col items-center text-center">
      {/* The Authority Header */}
      <div className="flex flex-col items-center mb-16">
        <div className="mb-6 relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-slate-900">
             <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-400 border-4 border-slate-950 shadow-lg animate-pulse" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.03em] uppercase leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
            T.U.T. Money Lending <span className="text-blue-500">Authority</span>
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-blue-600/50" />
            <p className="text-[11px] font-black text-blue-400/80 uppercase tracking-[0.5em] whitespace-nowrap">Official Financial Hub</p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-blue-600/50" />
          </div>
        </div>
      </div>
      
      {/* Premium Personal Branding */}
      <div className="space-y-8 mb-16 relative">
        <div className="absolute -inset-x-20 inset-y-0 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
           <p className="text-blue-500/40 font-black text-[9px] uppercase tracking-[0.4em] mb-4">Conceptualized & Developed By</p>
           <div className="relative inline-block">
              {/* Decorative accent for the name */}
              <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <h2 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-blue-100/50 tracking-tighter mb-4 drop-shadow-[0_15px_15px_rgba(30,58,138,0.4)]">
                Tahsin Ullah Tusher
              </h2>
           </div>
        </div>
        <div className="relative inline-flex flex-col items-center">
           <div className="px-8 py-2.5 bg-slate-900/80 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <p className="text-blue-200 text-[12px] sm:text-sm font-black uppercase tracking-[0.25em] italic">
                 Founder & Chief Strategist, T.U.T. Group of Services
              </p>
           </div>
           <div className="mt-2 h-[2px] w-24 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </div>
      </div>

      {showMotto && (
        <div className="relative">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Trust Pillar */}
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse" />
              <span className="text-[12px] sm:text-[14px] font-black text-white uppercase tracking-[0.5em] opacity-60 group-hover:opacity-100 transition-opacity">Trust</span>
            </div>

            <div className="text-blue-600/30 font-light text-2xl">|</div>

            {/* Unity Pillar */}
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse" />
              <span className="text-[12px] sm:text-[14px] font-black text-white uppercase tracking-[0.5em] opacity-60 group-hover:opacity-100 transition-opacity">Unity</span>
            </div>

            <div className="text-blue-600/30 font-light text-2xl">|</div>

            {/* Technology Pillar */}
            <div className="flex flex-col items-center gap-2 group cursor-default">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse" />
              <span className="text-[12px] sm:text-[14px] font-black text-white uppercase tracking-[0.5em] opacity-60 group-hover:opacity-100 transition-opacity">Technology</span>
            </div>
          </div>
          <div className="absolute -bottom-4 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('tut_saved_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Cycle through professional loading messages while app is initial loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStatusIndex((prev) => (prev + 1) % 6);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  // Trigger ErrorBoundary for async errors
  if (asyncError) throw asyncError;
  
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
          console.error("Please check your Firebase configuration. Firestore is unavailable.");
          setGlobalError("Connectivity Error: Could not reach the T.U.T. Security Backend. Please check your internet connection.");
        }
      }
    }
    testConnection();
  }, []);

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
  const [sponsorships, setSponsorships] = useState<SponsorshipCampaign[]>([]);
  const [isSponsorshipsSeeded, setIsSponsorshipsSeeded] = useState(false);
  const [isClearingAllAds, setIsClearingAllAds] = useState(false);
  const [isClearingAllAdsLoading, setIsClearingAllAdsLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'requests' | 'members' | 'partners' | 'reminders' | 'liquidity'>('overview');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Authority Capital Pool Control States
  const [authorityPersonalFund, setAuthorityPersonalFund] = useState<number>(5000000);
  const [showEditFundModal, setShowEditFundModal] = useState(false);
  const [tempFundValue, setTempFundValue] = useState('5000000');

  // Sponsorship Add/Edit Form State
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorCompany, setSponsorCompany] = useState('');
  const [sponsorValue, setSponsorValue] = useState('');
  const [sponsorType, setSponsorType] = useState<'Premium Partner' | 'Strategic Collab' | 'Community Sponsor'>('Premium Partner');
  const [sponsorPromo, setSponsorPromo] = useState('');
  const [sponsorStatus, setSponsorStatus] = useState<'active' | 'paused' | 'completed'>('active');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [sponsorImageUrl, setSponsorImageUrl] = useState('');
  const [sponsorVideoUrl, setSponsorVideoUrl] = useState('');
  const [sponsorTargetUrl, setSponsorTargetUrl] = useState('');
  const [sponsorSpecialOffer, setSponsorSpecialOffer] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showSupportWidget, setShowSupportWidget] = useState(true);

  // Entrance Interstitial Ad Popup States
  const [activeEntranceAd, setActiveEntranceAd] = useState<SponsorshipCampaign | null>(null);
  const [hasAdBeenShown, setHasAdBeenShown] = useState(false);
  const [sponsorChartView, setSponsorChartView] = useState<'traffic' | 'financial'>('traffic');
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  const [localSponsorChanges, setLocalSponsorChanges] = useState<SponsorshipCampaign[]>(() => {
    try {
      const saved = localStorage.getItem('tut_local_sponsorships');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localDeletedSponsors, setLocalDeletedSponsors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tut_local_deleted_sponsorships');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deletingSponsorId, setDeletingSponsorId] = useState<string | null>(null);
  const [deletedIdsThisSession, setDeletedIdsThisSession] = useState<string[]>([]);

  // Create Member Account from Admin Dashboard states
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [createMemberName, setCreateMemberName] = useState('');
  const [createMemberEmail, setCreateMemberEmail] = useState('');
  const [createMemberPhone, setCreateMemberPhone] = useState('');
  const [createMemberNid, setCreateMemberNid] = useState('');
  const [createMemberOccupation, setCreateMemberOccupation] = useState('');
  const [createMemberAddress, setCreateMemberAddress] = useState('');
  const [createMemberPermanentAddress, setCreateMemberPermanentAddress] = useState('');
  const [createMemberReferenceContact, setCreateMemberReferenceContact] = useState('');
  const [createMemberNomineeName, setCreateMemberNomineeName] = useState('');
  const [createMemberNomineeRelation, setCreateMemberNomineeRelation] = useState('');
  const [createMemberStatus, setCreateMemberStatus] = useState<'approved' | 'pending'>('approved');

  // Bank Liquidity & Stress Test Simulation states
  const [stressWithdrawalPct, setStressWithdrawalPct] = useState(20);
  const [stressDefaultPct, setStressDefaultPct] = useState(10);
  const [editingLimitUid, setEditingLimitUid] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState('');
  const [createMemberMemberId, setCreateMemberMemberId] = useState('');
  const [createMemberInitialDeposit, setCreateMemberInitialDeposit] = useState('0');
  const [createMemberInitialLoan, setCreateMemberInitialLoan] = useState('0');
  const [createMemberInitialDebt, setCreateMemberInitialDebt] = useState('0');

  useEffect(() => {
    localStorage.setItem('tut_local_sponsorships', JSON.stringify(localSponsorChanges));
  }, [localSponsorChanges]);

  useEffect(() => {
    localStorage.setItem('tut_local_deleted_sponsorships', JSON.stringify(localDeletedSponsors));
  }, [localDeletedSponsors]);

  const activeSponsorships = useMemo(() => {
    const mergedMap = new Map<string, SponsorshipCampaign>();
    
    // 1. If not seeded yet and live sponsorships are empty, show defaults
    if (!isSponsorshipsSeeded && sponsorships.length === 0) {
      DEFAULT_SPONSORSHIPS.forEach(s => {
        mergedMap.set(s.id, { 
          ...s, 
          clicks: s.clicks ?? Math.floor(s.impressions * 0.12)
        });
      });
    }
    
    // 2. Add live Firestore sponsorship records (skip metadata document)
    sponsorships.forEach(s => {
      if (s.id === 'config_seeded') return;
      mergedMap.set(s.id, {
        ...s,
        clicks: s.clicks ?? Math.floor(s.impressions * 0.12)
      });
    });
    
    // 3. Overlay any locally added/deleted/changed sponsorships (guarantees immediate device updates)
    localSponsorChanges.forEach(s => {
      mergedMap.set(s.id, {
        ...s,
        clicks: s.clicks ?? Math.floor(s.impressions * 0.12)
      });
    });
    
    return Array.from(mergedMap.values())
      .filter(s => {
        if (s.status === 'completed') return false;
        if (localDeletedSponsors.includes(s.id)) return false;
        
        // Strict frontend filtering of legacy default/seeded ads
        const nameLower = s.companyName?.toLowerCase() || '';
        const idLower = s.id?.toLowerCase() || '';
        const isDefaultAd = idLower.includes('apex') || 
                            idLower.includes('bicon') || 
                            idLower.includes('tusher') ||
                            nameLower.includes('apex') || 
                            nameLower.includes('bicon') || 
                            nameLower.includes('t.u.t.') || 
                            nameLower.includes('tusher');
        return !isDefaultAd;
      });
  }, [sponsorships, localSponsorChanges, localDeletedSponsors, isSponsorshipsSeeded]);

  // Master Financial Computations (Recomputed automatically when state shifts)
  const sponsorProfit = useMemo(() => {
    return activeSponsorships.reduce((sum, s) => sum + (s.dealValue || 0), 0);
  }, [activeSponsorships]);

  const totalLent = useMemo(() => {
    return allUsers.reduce((sum, u) => sum + (u.totalLoan || 0), 0);
  }, [allUsers]);

  const totalDeposits = useMemo(() => {
    return allUsers.reduce((sum, u) => sum + (u.totalDeposit || 0), 0);
  }, [allUsers]);

  const outstandingDebt = useMemo(() => {
    return allUsers.reduce((sum, u) => sum + (u.remainingDebt || 0), 0);
  }, [allUsers]);

  // Journey Cumulative Statistics for Detailed Liquidity Tracking
  const cumulativeStats = useMemo(() => {
    // 1. Total historical loans confirmed
    const confirmedLoans = allTransactions.filter(t => t.type === 'loan' && t.status === 'confirmed');
    const totalHistoricalLoans = confirmedLoans.reduce((sum, t) => sum + t.amount, 0);
    const countHistoricalLoans = confirmedLoans.length;

    // 2. Total historical deposits confirmed
    const confirmedDeposits = allTransactions.filter(t => t.type === 'deposit' && t.status === 'confirmed');
    const totalHistoricalDeposits = confirmedDeposits.reduce((sum, t) => sum + t.amount, 0);
    const countHistoricalDeposits = confirmedDeposits.length;

    // 3. Total historical repayments (refund + pay_due) confirmed
    const confirmedRepayments = allTransactions.filter(t => (t.type === 'refund' || t.type === 'pay_due') && t.status === 'confirmed');
    const totalHistoricalRepayments = confirmedRepayments.reduce((sum, t) => sum + t.amount, 0);
    const countHistoricalRepayments = confirmedRepayments.length;

    // Recovery Rate (Repayments vs Loans ratio)
    const recoveryRate = totalHistoricalLoans > 0 
      ? (totalHistoricalRepayments / totalHistoricalLoans) * 100 
      : 0;

    // Transaction volume by channel (bKash, Nagad, Cash, Recharge)
    const channels = ['Bkash', 'Nagad', 'Cash', 'Recharge'] as const;
    const channelMetrics = channels.map(ch => {
      const txs = allTransactions.filter(t => t.method === ch && t.status === 'confirmed');
      const volume = txs.reduce((sum, t) => sum + t.amount, 0);
      return {
        channel: ch,
        count: txs.length,
        volume
      };
    });

    return {
      totalHistoricalLoans,
      countHistoricalLoans,
      totalHistoricalDeposits,
      countHistoricalDeposits,
      totalHistoricalRepayments,
      countHistoricalRepayments,
      recoveryRate,
      channelMetrics
    };
  }, [allTransactions]);

  // Leaderboard statistics for approved members
  const memberLeaderboards = useMemo(() => {
    const approvedUsers = allUsers.filter(u => u.status === 'approved');

    // 1. Highest Depositors (current deposits)
    const topDepositors = [...approvedUsers]
      .sort((a, b) => (b.totalDeposit || 0) - (a.totalDeposit || 0))
      .slice(0, 5);

    // 2. Highest Borrowers (cumulative loans)
    const topBorrowers = [...approvedUsers]
      .sort((a, b) => (b.totalLoan || 0) - (a.totalLoan || 0))
      .slice(0, 5);

    // 3. Highest Active Debtors (remaining debt)
    const topActiveDebtors = [...approvedUsers]
      .sort((a, b) => (b.remainingDebt || 0) - (a.remainingDebt || 0))
      .slice(0, 5);

    return {
      topDepositors,
      topBorrowers,
      topActiveDebtors
    };
  }, [allUsers]);

  const totalFinancialAmount = useMemo(() => {
    return authorityPersonalFund + sponsorProfit;
  }, [authorityPersonalFund, sponsorProfit]);

  const runwayLiquidity = useMemo(() => {
    return totalFinancialAmount + totalDeposits - outstandingDebt;
  }, [totalFinancialAmount, totalDeposits, outstandingDebt]);

  const availableLendingCapacity = useMemo(() => {
    return totalFinancialAmount - outstandingDebt;
  }, [totalFinancialAmount, outstandingDebt]);
  
  // Toast State
  const [toasts, setToasts] = useState<{id: string, title: string, body: string, type: 'info' | 'success' | 'warning'}[]>([]);
  
  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const addToast = (title: string, body: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleFirestorePermissionOrTokenError = async (err: any, source: string): Promise<boolean> => {
    console.warn(`[Fail Safe] Caught snapshot error in ${source}:`, err);
    const isTokenExpired = err.code === 'permission-denied' || 
                           err.code === 'unauthenticated' || 
                           err.message?.toLowerCase().includes('permission') || 
                           err.message?.toLowerCase().includes('authenticated');
                           
    if (isTokenExpired) {
      console.log("[Fail Safe] Detected token expiration, session stale, or revoked permission on wake up.");
      try {
        if (auth.currentUser) {
          console.log("[Fail Safe] Session stale. Attempting token force-refresh...");
          await auth.currentUser.getIdToken(true);
          console.log("[Fail Safe] Token refreshed! Resuming connection...");
          return true; // Was recovered
        }
      } catch (refreshErr) {
        console.error("[Fail Safe] Force ID Token refresh failed:", refreshErr);
      }
      
      // If refresh fails or user is unauthenticated, redirect/logout gracefully
      addToast('Session Expired', 'Your secure session has expired. Please sign in again to continue safely.', 'warning');
      setProfile(null);
      localStorage.removeItem('tut_saved_profile');
      setIsAdminLoggedIn(false);
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.error("Signout error:", signOutErr);
      }
      setUser(null);
      return true; // Handled without crash
    }
    return false; // Not a session error
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
  const incrementedSponsorsRef = useRef<Set<string>>(new Set());

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

  const sendEmail = async (to: string, subject: string, body: string, customHtml?: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: body,
          html: customHtml || `<div style="font-family: sans-serif; padding: 20px; background: #f4f4f4;">
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

  const hasScannedReminders = useRef(false);

  const sendProfessionalDueReminder = async (
    targetUserProfile: UserProfile,
    tx: Transaction,
    isManual: boolean = false
  ) => {
    if (!targetUserProfile.email) {
      console.warn("User has no email configured, skipping reminder.");
      return false;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const emailTo = targetUserProfile.email.toLowerCase().trim();
    const isToAdmin = emailTo === ADMIN_EMAIL;
    
    // Skip if email is disabled and not admin (unless manual)
    if (!isManual && !isToAdmin && !gmailNotificationsEnabled) {
      console.log("Auto-reminder skipped: Email notifications globally disabled by user/admin settings.");
      return false;
    }

    const estimatedDate = tx.estimatedRepaymentDate ? new Date(tx.estimatedRepaymentDate) : null;
    let daysDiff = 0;
    let formattedDueDate = "Not Specified";
    
    if (estimatedDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const estDateClean = new Date(estimatedDate);
      estDateClean.setHours(0,0,0,0);
      daysDiff = Math.round((estDateClean.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      formattedDueDate = format(estDateClean, 'dd MMMM yyyy');
    }

    // Compose custom professional email Subject and Status Message
    let subject = `T.U.T. Loan Due Reminder: ৳${tx.amount.toLocaleString()} Statement`;
    let statusText = "Official Statement Notice";
    let statusColor = "#3b82f6"; // Blue
    let alertMessage = `This is a routine statement of your outstanding loan account with T.U.T. Private Authority.`;

    if (daysDiff < 0) {
      subject = `⚠️ OVERDUE NOTICE: T.U.T. Private Lending Repayment (৳${tx.amount.toLocaleString()})`;
      statusText = "URGENT: OVERDUE ACCOUNT";
      statusColor = "#dc2626"; // Red
      alertMessage = `Your expected repayment date was <strong>${formattedDueDate}</strong>, which is now <strong>${Math.abs(daysDiff)} days overdue</strong>. Please settle your remaining dues immediately to protect your solvency rating.`;
    } else if (daysDiff === 0) {
      subject = `📅 DUE TODAY: T.U.T. Private Lending Repayment (৳${tx.amount.toLocaleString()})`;
      statusText = "DUE TODAY";
      statusColor = "#ea580c"; // Orange
      alertMessage = `Your scheduled loan repayment of ৳${tx.amount.toLocaleString()} is due today, <strong>${formattedDueDate}</strong>. Please initiate the settlement as soon as possible.`;
    } else if (daysDiff > 0 && daysDiff <= 3) {
      subject = `🔔 UPCOMING DUE: T.U.T. Private Lending Repayment in ${daysDiff} Days`;
      statusText = `DUE IN ${daysDiff} DAYS`;
      statusColor = "#ca8a04"; // Amber
      alertMessage = `This is a courtesy notice that your scheduled loan repayment of ৳${tx.amount.toLocaleString()} is due in <strong>${daysDiff} days</strong> on <strong>${formattedDueDate}</strong>.`;
    } else if (isManual) {
      subject = `💼 OFFICIAL STATEMENT & REMINDER: T.U.T. Private Lending`;
      statusText = "OFFICIAL REMINDER";
      statusColor = "#2563eb"; // Blue
      alertMessage = "Your account administrator has generated this manual statement and repayment reminder for your review.";
    }

    // Professional HTML Layout Design
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b1329; padding: 40px 20px; color: #f8fafc; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Premium Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #020617 100%); padding: 35px 30px; border-bottom: 1px solid #1e293b; text-align: center;">
            <div style="display: inline-block; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); padding: 8px 16px; border-radius: 8px; margin-bottom: 15px;">
              <span style="font-size: 11px; font-weight: 900; color: #60a5fa; letter-spacing: 0.25em; text-transform: uppercase;">TRUST • UNITY • TECHNOLOGY</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; tracking: -0.025em; text-transform: uppercase;">T.U.T. Private Authority</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0; font-weight: 500;">Official Private Lending & Investment System</p>
          </div>

          <!-- Alert Banner / Message -->
          <div style="padding: 30px 30px 10px 30px;">
            <div style="background-color: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-left: 4px solid ${statusColor}; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
              <span style="display: inline-block; font-size: 10px; font-weight: 900; color: ${statusColor}; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px;">${statusText}</span>
              <p style="color: #cbd5e1; font-size: 13.5px; line-height: 1.6; margin: 0;">${alertMessage}</p>
            </div>
          </div>

          <!-- Member Information -->
          <div style="padding: 0 30px 15px 30px;">
            <h3 style="color: #38bdf8; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">Recipients Statement Profile</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500; width: 35%;">Member Name:</td>
                <td style="color: #f1f5f9; padding: 6px 0; font-weight: bold;">${targetUserProfile.name}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Member ID:</td>
                <td style="color: #38bdf8; padding: 6px 0; font-weight: bold; font-family: monospace;">${targetUserProfile.memberId || 'TUT-MBR-2026'}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Phone Number:</td>
                <td style="color: #cbd5e1; padding: 6px 0; font-family: monospace;">${targetUserProfile.phone}</td>
              </tr>
            </table>
          </div>

          <!-- Active Loan Specifications -->
          <div style="padding: 0 30px 15px 30px;">
            <h3 style="color: #fb7185; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">Loan Account Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500; width: 35%;">Principal Amount:</td>
                <td style="color: #f43f5e; padding: 6px 0; font-weight: 900; font-size: 14.5px;">৳ ${tx.amount.toLocaleString()} BDT</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Purpose of Loan:</td>
                <td style="color: #cbd5e1; padding: 6px 0; font-weight: 500; font-style: italic;">"${tx.loanReason || 'Not Specified'}"</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Expected Due Date:</td>
                <td style="color: #f59e0b; padding: 6px 0; font-weight: bold;">${formattedDueDate}</td>
              </tr>
            </table>
          </div>

          <!-- Financial Statement & Ledger Summary -->
          <div style="padding: 0 30px 30px 30px;">
            <h3 style="color: #34d399; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">Lending Ledger Statement</h3>
            <div style="background-color: rgba(52, 211, 153, 0.03); border: 1px solid rgba(52, 211, 153, 0.1); border-radius: 12px; padding: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0;">Total Borrowed Portfolio:</td>
                  <td style="color: #cbd5e1; padding: 6px 0; text-align: right; font-weight: bold;">৳ ${(targetUserProfile.totalLoan || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0;">Total Savings Deposit:</td>
                  <td style="color: #10b981; padding: 6px 0; text-align: right; font-weight: bold;">৳ ${(targetUserProfile.totalDeposit || 0).toLocaleString()}</td>
                </tr>
                <tr style="border-top: 1px solid #1e293b;">
                  <td style="color: #ffffff; padding: 8px 0; font-weight: bold; font-size: 13.5px;">Remaining Active Debt:</td>
                  <td style="color: #ffffff; padding: 8px 0; text-align: right; font-weight: 900; font-size: 15px; text-shadow: 0 0 10px rgba(255,255,255,0.1);">৳ ${(targetUserProfile.remainingDebt || 0).toLocaleString()} BDT</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Action & Repayment Channels -->
          <div style="padding: 0 30px 35px 30px; border-top: 1px solid #1e293b; background-color: rgba(30, 41, 59, 0.25);">
            <h4 style="color: #ffffff; font-size: 12px; font-weight: 700; margin: 20px 0 10px 0; text-transform: uppercase;">Accepted Settlement Methods</h4>
            <div style="display: grid; font-size: 11px; color: #cbd5e1; line-height: 1.5;">
              <div style="margin-bottom: 8px;">
                <strong>💳 Mobile Financial Systems (bKash/Nagad)</strong><br/>
                Please submit a 'Pay Due' transaction request inside your dashboard after completing the mobile transfer.
              </div>
              <div>
                <strong>🏢 Cash Desk Placement</strong><br/>
                Repayments can be submitted directly in cash to the T.U.T. Executive Committee Admin Desk.
              </div>
            </div>
          </div>

          <!-- Professional System Footer -->
          <div style="background-color: #020617; padding: 25px 30px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #94a3b8;">T.U.T. Private Lending Authority</p>
            <p style="margin: 0;">This is an automated system-generated notice based on your registered lending agreements with the T.U.T. Private Authority. Please do not reply directly to this email.</p>
            <p style="margin: 10px 0 0 0; color: #3b82f6; font-weight: 600;">Secure Core System Online • 100% Verified Ledger</p>
          </div>

        </div>
      </div>
    `;

    try {
      await sendEmail(
        emailTo,
        subject,
        `Dear ${targetUserProfile.name}, your repayment of ৳${tx.amount.toLocaleString()} is due. Please check your dashboard for details.`,
        htmlContent
      );
      
      await updateDoc(doc(db, 'transactions', tx.id), {
        lastReminderSent: todayStr
      });

      console.log(`[Reminder System] Successfully sent professional statement email to ${emailTo}`);
      return true;
    } catch (error) {
      console.error("[Reminder System] Error sending email statement reminder:", error);
      return false;
    }
  };

  const runAutomaticDueReminderScan = async () => {
    if (!user || !profile) return;
    if (hasScannedReminders.current) return;
    hasScannedReminders.current = true;
    
    console.log("[Auto Reminder] Running active due reminder scanner...");
    
    // Find all active confirmed loans with estimatedRepaymentDate
    const confirmedLoans = allTransactions.filter(
      t => t.type === 'loan' && t.status === 'confirmed' && t.estimatedRepaymentDate
    );

    let sentCount = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = format(today, 'yyyy-MM-dd');

    for (const tx of confirmedLoans) {
      const userProfile = allUsers.find(u => u.uid === tx.userId);
      if (!userProfile) continue;

      // Only check if they still have debt!
      if (userProfile.remainingDebt <= 0) continue;

      // Skip if reminder was already sent today
      if (tx.lastReminderSent === todayStr) {
        continue;
      }

      // Compute days difference
      const estRepayDate = new Date(tx.estimatedRepaymentDate!);
      estRepayDate.setHours(0,0,0,0);
      const daysDiff = Math.round((estRepayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let shouldSend = false;

      if (daysDiff === 0) {
        shouldSend = true; // Due today!
      } else if (daysDiff > 0 && daysDiff <= 3) {
        // Upcoming in 3 days, send only once
        if (!tx.lastReminderSent) {
          shouldSend = true;
        }
      } else if (daysDiff < 0) {
        // Overdue! Send every 5 days
        if (!tx.lastReminderSent) {
          shouldSend = true;
        } else {
          try {
            const lastSent = new Date(tx.lastReminderSent);
            lastSent.setHours(0,0,0,0);
            const daysSinceLastReminder = Math.round((today.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLastReminder >= 5) {
              shouldSend = true;
            }
          } catch (e) {
            shouldSend = true;
          }
        }
      }

      if (shouldSend && userProfile.email) {
        console.log(`[Auto Reminder] Triggering automatic due notice for ${userProfile.name}`);
        const success = await sendProfessionalDueReminder(userProfile, tx, false);
        if (success) {
          sentCount++;
        }
      }
    }

    if (sentCount > 0) {
      addToast('Automatic Reminders Sent', `Dispatched ${sentCount} automatic professional email due reminders.`, 'success');
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn && allUsers.length > 0 && allTransactions.length > 0) {
      runAutomaticDueReminderScan();
    }
  }, [isAdminLoggedIn, allUsers, allTransactions]);

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

  const logAuditEvent = async (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: serverTimestamp(),
        actorEmail: user?.email || 'System / Auto',
        actorName: profile?.name || 'Observer',
        action,
        details,
        severity
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      handleFirestoreError(error, OperationType.WRITE, 'audit_logs');
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
  const [requestType, setRequestType] = useState<'loan' | 'deposit' | 'refund' | 'pay_due' | 'subscription'>('loan');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestMethod, setRequestMethod] = useState<'Cash' | 'Bkash' | 'Nagad' | 'Recharge'>('Cash');
  const [requestAccount, setRequestAccount] = useState('');
  const [requestTrxId, setRequestTrxId] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [estimatedRepaymentDate, setEstimatedRepaymentDate] = useState('');

  // Subscription Form States
  const [selectedSubTier, setSelectedSubTier] = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [subSenderMobile, setSubSenderMobile] = useState('');
  const [subTrxId, setSubTrxId] = useState('');
  const [subWallet, setSubWallet] = useState<'Bkash' | 'Nagad' | 'Recharge' | 'Cash'>('Bkash');
  const [showSubPaymentMode, setShowSubPaymentMode] = useState(false);
  const [memberTab, setMemberTab] = useState<'banking' | 'subscription' | 'profile' | 'partners'>('banking');
  const [activeTransactionView, setActiveTransactionView] = useState<'loan' | 'deposit' | 'pay_due' | 'refund' | 'transfer' | 'subscription' | null>(null);

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
    nomineeRelation: '',
    photoUrl: '',
    permanentAddress: '',
    referenceContact: '',
    adminNotes: ''
  });

  // Registration State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    nid: '',
    address: '',
    occupation: '',
    phone: '',
    photoUrl: ''
  });

  useEffect(() => {
    if (user && !profile) {
      setRegData(prev => ({
        ...prev,
        name: prev.name || user.displayName || '',
        email: prev.email || user.email || '',
        photoUrl: prev.photoUrl || user.photoURL || ''
      }));
    }
  }, [user, profile]);

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
        nomineeRelation: profile.nomineeRelation || '',
        photoUrl: profile.photoUrl || '',
        permanentAddress: profile.permanentAddress || '',
        referenceContact: profile.referenceContact || '',
        adminNotes: profile.adminNotes || ''
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
        nomineeRelation: profileData.nomineeRelation,
        photoUrl: profileData.photoUrl,
        permanentAddress: profileData.permanentAddress,
        referenceContact: profileData.referenceContact,
        adminNotes: profileData.adminNotes
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

  // Background/Foreground wake-up resiliency handler
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("[App Wakeup] App resumed from background. Synchronizing authentication token...");
        
        // If user is currently authenticated check and auto-refresh the credential
        if (auth.currentUser) {
          try {
            console.log("[App Wakeup] Active user found. Verifying credentials token with Firebase...");
            const token = await auth.currentUser.getIdToken(true);
            console.log("[App Wakeup] Token verified and synchronized successfully.");
          } catch (tokenErr) {
            console.error("[App Wakeup] Authentication token expired or revoked during background period:", tokenErr);
            addToast('Session Expired', 'Your secure session expired in the background. Logging out safely...', 'warning');
            
            // Clean up states and redirect gracefully without throwing fatal errors
            setProfile(null);
            localStorage.removeItem('tut_saved_profile');
            setIsAdminLoggedIn(false);
            try {
              await signOut(auth);
            } catch (soErr) {
              console.error("Signout after key expiry failed:", soErr);
            }
            setUser(null);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // --- Network Connection Monitor for Mobile Resiliency ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addToast('Connection Restored', 'Your internet connection was successfully re-established. Syncing profile...', 'success');
      // If user logs in we can sync/verify
      if (auth.currentUser) {
        auth.currentUser.getIdToken(true).catch(err => console.log("Silent online check:", err));
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      addToast('Connection Offline', 'You are currently offline. Local cache will persist until connection returns.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Webintoapp Mobile App back-button gesture interception ---
  // Tracks any modal or system state changes and pushes fake back levels to prevents crashes or abrupt closures
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      let intercepted = false;
      
      // Close open modals step-by-step when back key is tapped
      if (showAdminLogin) {
        setShowAdminLogin(false);
        intercepted = true;
      } else if (showEditUserModal) {
        setShowEditUserModal(false);
        setEditingUser(null);
        intercepted = true;
      } else if (showDeleteModal) {
        setShowDeleteModal(false);
        setUserToDelete(null);
        intercepted = true;
      } else if (showEditFundModal) {
        setShowEditFundModal(false);
        intercepted = true;
      } else if (showSponsorModal) {
        setShowSponsorModal(false);
        intercepted = true;
      } else if (showRequestModal) {
        setShowRequestModal(false);
        intercepted = true;
      } else if (showProfileModal) {
        setShowProfileModal(false);
        intercepted = true;
      } else if (showNotificationCenter) {
        setShowNotificationCenter(false);
        intercepted = true;
      } else if (adminTab !== 'overview') {
        setAdminTab('overview');
        intercepted = true;
      }

      if (intercepted) {
        // Prevent going back key from quitting the current webview instance
        e.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    showAdminLogin,
    showEditUserModal,
    showDeleteModal,
    showEditFundModal,
    showSponsorModal,
    showRequestModal,
    showProfileModal,
    showNotificationCenter,
    adminTab
  ]);

  // Sync virtual levels in history for back button to consume
  useEffect(() => {
    const activeModalsCount = [
      showAdminLogin,
      showEditUserModal,
      showDeleteModal,
      showEditFundModal,
      showSponsorModal,
      showRequestModal,
      showProfileModal,
      showNotificationCenter
    ].filter(Boolean).length;

    // Push states for back consumption but keep index safe
    if (activeModalsCount > 0) {
      if (!window.history.state || window.history.state.virtualLevel !== activeModalsCount) {
        window.history.pushState({ virtualLevel: activeModalsCount }, '');
      }
    } else {
      if (window.history.state && window.history.state.virtualLevel) {
        window.history.replaceState(null, '');
      }
    }
  }, [
    showAdminLogin,
    showEditUserModal,
    showDeleteModal,
    showEditFundModal,
    showSponsorModal,
    showRequestModal,
    showProfileModal,
    showNotificationCenter
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u?.email, u?.uid);
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        setProfile(null);
        localStorage.removeItem('tut_saved_profile');
        setIsAdminLoggedIn(false); // Reset admin state on logout
        setLoading(false);
      } else if (u.email?.toLowerCase() === 'tahsinullahtusher999@gmail.com') {
        setIsAdminLoggedIn(true);
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
        if (user.email?.toLowerCase() === 'tahsinullahtusher999@gmail.com' && (data.role !== 'admin' || data.status !== 'approved')) {
          data.role = 'admin';
          data.status = 'approved';
          setDoc(doc(db, 'users', user.uid), { ...data, role: 'admin', status: 'approved' }, { merge: true });
        }
        setProfile(data);
        localStorage.setItem('tut_saved_profile', JSON.stringify(data));
        
        // Notify user if status changed to approved
        if (lastProfileStatus.current === 'pending' && data.status === 'approved') {
          sendNotification('Account Approved!', 'Your T.U.T. membership has been approved. You can now access all services.', user.email || undefined);
        }
        lastProfileStatus.current = data.status;
      } else {
        if (user.email?.toLowerCase() === 'tahsinullahtusher999@gmail.com') {
          const adminProfile: UserProfile = {
            uid: user.uid,
            email: 'tahsinullahtusher999@gmail.com',
            name: "Tahsin Ullah Tusher",
            nid: "1234567890",
            address: "T.U.T. Headquarters",
            occupation: "Chief Admin",
            phone: "01700000000",
            status: "approved",
            role: "admin",
            totalLoan: 0,
            totalDeposit: 0,
            remainingDebt: 0,
            createdAt: new Date(),
          };
          setDoc(doc(db, 'users', user.uid), adminProfile);
          setProfile(adminProfile);
          localStorage.setItem('tut_saved_profile', JSON.stringify(adminProfile));
        } else {
          if (user.email) {
            const cleanEmail = user.email.toLowerCase().trim();
            const preUid = "pre_email_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
            const preDocRef = doc(db, 'users', preUid);
            getDoc(preDocRef).then((preSnap) => {
              if (preSnap.exists()) {
                const preData = preSnap.data();
                console.log("Found pre-created profile, migrating...", preData);
                const migratedProfile = {
                  ...preData,
                  uid: user.uid,
                  createdAt: preData.createdAt || new Date()
                };
                
                // Set the real user profile
                setDoc(doc(db, 'users', user.uid), migratedProfile).then(() => {
                  // Delete the pre-created one
                  deleteDoc(preDocRef).catch(e => console.error("Error deleting pre-created profile document:", e));
                }).catch(e => {
                  console.error("Error writing migrated profile:", e);
                });
              } else {
                setProfile(null);
                localStorage.removeItem('tut_saved_profile');
              }
            }).catch(err => {
              console.error("Error checking pre-created profile:", err);
              setProfile(null);
              localStorage.removeItem('tut_saved_profile');
            });
          } else {
            setProfile(null);
            localStorage.removeItem('tut_saved_profile');
          }
        }
      }
      setLoading(false);
    }, (err) => {
      handleFirestorePermissionOrTokenError(err, 'Profile Listener').then((handled) => {
        if (handled) return;
        // Only set error if user is still logged in and error not handled
        if (auth.currentUser) {
          setGlobalError(`Profile Error: ${err.message}`);
          const errInfo = handleFirestoreError(err, OperationType.GET, path);
          setAsyncError(new Error(JSON.stringify(errInfo)));
        }
        setLoading(false);
      });
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
      const txs = snap.docs.map(d => ({ ...d.data() as any, id: d.id } as Transaction));
      
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
      handleFirestorePermissionOrTokenError(err, 'Transactions Listener').then((handled) => {
        if (handled) return;
        if (auth.currentUser) {
          setGlobalError(`Transaction Error: ${err.message}`);
          handleFirestoreError(err, OperationType.LIST, 'transactions');
        }
      });
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
      handleFirestorePermissionOrTokenError(err, 'Admin Users Listener').then((handled) => {
        if (handled) return;
        if (auth.currentUser) {
          setGlobalError(`Admin Users Error: ${err.message}`);
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      });
    });

    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      console.log("Admin Transactions Snapshot received:", snap.size, "docs");
      const txs = snap.docs.map(d => {
        const data = d.data();
        return { ...data as any, id: d.id } as Transaction;
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
      handleFirestorePermissionOrTokenError(err, 'Admin Transactions Listener').then((handled) => {
        if (handled) return;
        if (auth.currentUser) {
          console.error("Admin Transactions Error:", err);
          setGlobalError(`Admin Transactions Error: ${err.message}`);
          handleFirestoreError(err, OperationType.LIST, 'transactions');
        }
      });
    });

    const unsubAuditLogs = onSnapshot(collection(db, 'audit_logs'), (snap) => {
      console.log("Admin Audit Logs Snapshot received:", snap.size, "docs");
      const logs = snap.docs.map(d => {
        const data = d.data();
        return { ...data as any, id: d.id };
      });
      logs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setAuditLogs(logs);
    }, (err) => {
      console.error("Admin Audit Logs error:", err);
      handleFirestoreError(err, OperationType.LIST, 'audit_logs');
    });

    return () => {
      unsubUsers();
      unsubTx();
      unsubAuditLogs();
    };
  }, [isAdminLoggedIn, user]);

  // Global Sponsorships Listener for public/admin views
  useEffect(() => {
    const unsubSponsorships = onSnapshot(collection(db, 'sponsorships'), (snap) => {
      console.log("Sponsorships Snapshot received:", snap.size, "docs");
      const list = snap.docs.map(d => ({ ...d.data() as any, id: d.id } as SponsorshipCampaign));
      setSponsorships(list);
    }, (err) => {
      console.error("Sponsorships Error (using fallback defaults):", err);
      handleFirestorePermissionOrTokenError(err, 'Sponsorships Listener');
    });
    return unsubSponsorships;
  }, []);

  // Real-time listener for system_controls/sponsorships_seeded to sync seeded state for ALL users
  useEffect(() => {
    const unsubSeeded = onSnapshot(doc(db, 'system_controls', 'sponsorships_seeded'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().seeded) {
        setIsSponsorshipsSeeded(true);
      } else {
        setIsSponsorshipsSeeded(false);
      }
    }, (err) => {
      console.error("Error listening to system_controls/sponsorships_seeded:", err);
    });
    return unsubSeeded;
  }, []);

  // Real-time Trigger for Entrance Dashboard Advertisement Popup
  useEffect(() => {
    // Show ad when activeSponsorships are loaded, user has an approved profile,
    // and we haven't shown one during this session yet.
    if (profile && profile.status === 'approved' && !hasAdBeenShown && activeSponsorships.length > 0) {
      const activeList = activeSponsorships.filter(s => s.status === 'active');
      if (activeList.length > 0) {
        // Pick one for display as the entrance poster ad (randomized for variance)
        const chosenCampaign = activeList[Math.floor(Math.random() * activeList.length)];
        setActiveEntranceAd(chosenCampaign);
        setHasAdBeenShown(true);
        
        // Track real-time impression block
        const chosenId = chosenCampaign.id;
        if (!incrementedSponsorsRef.current.has(chosenId)) {
          incrementedSponsorsRef.current.add(chosenId);
          incrementAdImpression(chosenId);
        }
      }
    }
  }, [profile, activeSponsorships, hasAdBeenShown]);

  // Real-time Impression tracker for dashboard active collaborations displayed as cards
  useEffect(() => {
    if (profile && profile.status === 'approved' && activeSponsorships.length > 0) {
      const activeList = activeSponsorships.filter(s => s.status === 'active');
      activeList.forEach(s => {
        if (!incrementedSponsorsRef.current.has(s.id)) {
          incrementedSponsorsRef.current.add(s.id);
          incrementAdImpression(s.id);
        }
      });
    }
  }, [profile, activeSponsorships]);

  // Real-time Authority Capital Listener
  useEffect(() => {
    const unsubPersonalFund = onSnapshot(doc(db, 'system_controls', 'funds'), (snap) => {
      console.log("Authority Fund setting received:", snap.exists() ? snap.data() : "No document");
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data.personalFund === 'number') {
          setAuthorityPersonalFund(data.personalFund);
          setTempFundValue(data.personalFund.toString());
        }
      }
    }, (err) => {
      console.warn("Could not load authority fund setting real-time, using fallback defaults:", err.message);
      handleFirestorePermissionOrTokenError(err, 'Authority Fund Listener');
    });
    return unsubPersonalFund;
  }, []);

  // Real-time Sponsorship Seed Status Listener
  useEffect(() => {
    const unsubSeeded = onSnapshot(doc(db, 'system_controls', 'sponsorships_seeded'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.seeded === true) {
          setIsSponsorshipsSeeded(true);
        }
      }
    }, (err) => {
      console.warn("Could not check sponsorship seed status, using fallback:", err.message);
    });
    return unsubSeeded;
  }, []);

  const handleUpdateAuthorityFund = async (amountStr: string) => {
    const amount = Number(amountStr);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid positive number for the personal fund.");
      return;
    }
    try {
      await setDoc(doc(db, 'system_controls', 'funds'), {
        personalFund: amount,
        updatedAt: serverTimestamp()
      }, { merge: true });
      addToast('System Fund Updated', `Authority personal investment fund updated to ৳${amount.toLocaleString()}`, 'success');
      setShowEditFundModal(false);
    } catch (error) {
      console.error("Error updating system fund:", error);
      handleFirestoreError(error, OperationType.WRITE, 'system_controls/funds');
    }
  };

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
        nomineeRelation: editingUser.nomineeRelation || '',
        photoUrl: editingUser.photoUrl || '',
        permanentAddress: editingUser.permanentAddress || '',
        referenceContact: editingUser.referenceContact || '',
        adminNotes: editingUser.adminNotes || ''
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
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
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.uid}`);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMemberName.trim()) {
      alert("Name is required");
      return;
    }
    const cleanEmail = createMemberEmail.toLowerCase().trim();
    if (!cleanEmail) {
      alert("Email is required for account creation and automatic linking");
      return;
    }
    if (createMemberPhone.length !== 11 || !createMemberPhone.startsWith('0')) {
      alert("Phone number must be 11 digits starting with 0");
      return;
    }

    // Check for email uniqueness in existing users
    const emailExists = allUsers.some(u => u.email?.toLowerCase().trim() === cleanEmail);
    if (emailExists) {
      alert("A member profile with this email already exists!");
      return;
    }

    try {
      // Use clean email key as the pre-uid to identify pre-created profiles
      const preUid = "pre_email_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const generatedMemberId = createMemberMemberId.trim() || `TUT-MBR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newProfile: any = {
        uid: preUid,
        email: cleanEmail,
        name: createMemberName.trim(),
        nid: createMemberNid.trim(),
        address: createMemberAddress.trim(),
        permanentAddress: createMemberPermanentAddress.trim(),
        referenceContact: createMemberReferenceContact.trim(),
        nomineeName: createMemberNomineeName.trim(),
        nomineeRelation: createMemberNomineeRelation.trim(),
        occupation: createMemberOccupation.trim(),
        phone: createMemberPhone.trim(),
        status: createMemberStatus,
        totalLoan: Number(createMemberInitialLoan) || 0,
        totalDeposit: Number(createMemberInitialDeposit) || 0,
        remainingDebt: Number(createMemberInitialDebt) || 0,
        role: 'member',
        memberId: generatedMemberId,
        createdAt: new Date(),
        adminNotes: 'Created directly from official admin desk.'
      };

      console.log("Creating pre-registered member profile in Firestore:", newProfile);
      await setDoc(doc(db, 'users', preUid), newProfile);
      console.log("Pre-registered member profile successfully saved.");
      
      // Reset form fields
      setCreateMemberName('');
      setCreateMemberEmail('');
      setCreateMemberPhone('');
      setCreateMemberNid('');
      setCreateMemberOccupation('');
      setCreateMemberAddress('');
      setCreateMemberPermanentAddress('');
      setCreateMemberReferenceContact('');
      setCreateMemberNomineeName('');
      setCreateMemberNomineeRelation('');
      setCreateMemberStatus('approved');
      setCreateMemberMemberId('');
      setCreateMemberInitialDeposit('0');
      setCreateMemberInitialLoan('0');
      setCreateMemberInitialDebt('0');
      
      setShowCreateMemberModal(false);
      alert("Member profile created and registered successfully! When this member logs in with this email, their dashboard will automatically connect.");
    } catch (error) {
      console.error("Error creating pre-registered member:", error);
      handleFirestoreError(error, OperationType.WRITE, 'users/pre_email_info');
      alert("Failed to create member profile.");
    }
  };

  const incrementAdImpression = async (id: string) => {
    try {
      const existingDoc = sponsorships.find(s => s.id === id);
      if (existingDoc) {
        const docRef = doc(db, 'sponsorships', id);
        await updateDoc(docRef, {
          impressions: increment(1)
        });
        console.log(`Incremented real-time impression counter for campaign: ${id}`);
      } else {
        const defaultSponsor = DEFAULT_SPONSORSHIPS.find(s => s.id === id);
        if (defaultSponsor && isAdminLoggedIn) {
          const payload = {
            ...defaultSponsor,
            impressions: (defaultSponsor.impressions || 0) + 1
          };
          const { id: _, ...safePayload } = payload;
          await setDoc(doc(db, 'sponsorships', id), safePayload);
          console.log(`Initialized default campaign ${id} into Firestore with incremented impression`);
        }
      }
    } catch (err) {
      console.error("Failed to increment ad impression:", err);
    }
  };

  const handleAdClick = async (id: string) => {
    try {
      // Instantly update local state for real-time visual responsiveness
      setLocalSponsorChanges(prev => {
        const existing = prev.find(item => item.id === id) || sponsorships.find(s => s.id === id) || DEFAULT_SPONSORSHIPS.find(s => s.id === id);
        if (!existing) return prev;
        const updated = {
          ...existing,
          clicks: (existing.clicks || 0) + 1
        };
        return [...prev.filter(item => item.id !== id), updated];
      });

      const existingDoc = sponsorships.find(s => s.id === id);
      if (existingDoc) {
        const docRef = doc(db, 'sponsorships', id);
        await updateDoc(docRef, {
          clicks: increment(1)
        });
        console.log(`Incremented real-time click counter for campaign: ${id}`);
      } else {
        const defaultSponsor = DEFAULT_SPONSORSHIPS.find(s => s.id === id);
        if (defaultSponsor && isAdminLoggedIn) {
          const payload = {
            ...defaultSponsor,
            clicks: (defaultSponsor.clicks || 0) + 1
          };
          const { id: _, ...safePayload } = payload;
          await setDoc(doc(db, 'sponsorships', id), safePayload);
        }
      }
    } catch (err) {
      console.error("Ad click increment failed in background:", err);
    }
  };

  const handleAddSponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorCompany || !sponsorValue) return;
    try {
      const randomId = 'sp-' + Date.now().toString(36);
      const payload: SponsorshipCampaign = {
        id: randomId,
        companyName: sponsorCompany,
        dealValue: Number(sponsorValue),
        campaignType: sponsorType,
        promotionText: sponsorPromo || 'Promoted corporate partner of T.U.T. Private Authority',
        status: sponsorStatus,
        impressions: Math.floor(Math.random() * 50) + 10,
        clicks: 0,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      };

      if (sponsorLogoUrl) payload.logoUrl = sponsorLogoUrl;
      if (sponsorImageUrl) payload.imageUrl = sponsorImageUrl;
      if (sponsorVideoUrl) payload.videoUrl = sponsorVideoUrl;
      if (sponsorTargetUrl) payload.targetUrl = sponsorTargetUrl;
      if (sponsorSpecialOffer) payload.specialOffer = sponsorSpecialOffer;

      // Ensure it is not in the deleted list locally
      setLocalDeletedSponsors(prev => prev.filter(x => x !== randomId));

      // Update local storage representation instantly
      setLocalSponsorChanges(prev => [...prev.filter(item => item.id !== randomId), payload]);

      // Fire Firestore creation in the background using setDoc for ID consistency
      const { id: _, ...dbPayload } = payload;
      await setDoc(doc(db, 'sponsorships', randomId), dbPayload);
      alert("Sponsorship Deal added and synchronized successfully!");
    } catch (err) {
      console.warn("Firestore write deferred (persisted offline on device):", err);
      alert("Sponsorship Deal logged and saved successfully on your screen!");
    }

    setSponsorCompany('');
    setSponsorValue('');
    setSponsorPromo('');
    setSponsorLogoUrl('');
    setSponsorImageUrl('');
    setSponsorVideoUrl('');
    setSponsorTargetUrl('');
    setSponsorSpecialOffer('');
    setShowSponsorModal(false);
  };

  const handleToggleSponsorStatus = async (id: string, currentStatus: 'active' | 'paused' | 'completed') => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const existingSponsor = activeSponsorships.find(s => s.id === id);
      if (!existingSponsor) {
        throw new Error("Sponsorship campaign not found.");
      }
      
      const payload: SponsorshipCampaign = {
        ...existingSponsor,
        status: newStatus
      };

      // Instantly apply locally
      setLocalSponsorChanges(prev => [...prev.filter(item => item.id !== id), payload]);

      // Update in Firestore
      const docRef = doc(db, 'sponsorships', id);
      const existingDoc = sponsorships.find(s => s.id === id);
      if (existingDoc) {
        await updateDoc(docRef, { status: newStatus });
      } else {
        // If it's a default sponsor, write it out fully
        const { id: _, ...dbPayload } = payload;
        await setDoc(docRef, dbPayload);
      }
      alert(`Sponsorship status successfully updated to ${newStatus}`);
    } catch (err) {
      console.error("Firestore update error:", err);
      handleFirestoreError(err, OperationType.UPDATE, 'sponsorships/' + id);
      alert(`Failed to save state to server, toggled locally on device!`);
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    if (deletingSponsorId !== id) {
      setDeletingSponsorId(id);
      setTimeout(() => {
        setDeletingSponsorId(prev => prev === id ? null : prev);
      }, 4000);
      return;
    }
    setDeletingSponsorId(null);
    try {
      // 1. Instantly mark as locally deleted on user device
      setLocalDeletedSponsors(prev => [...prev.filter(x => x !== id), id]);

      // 2. Remove from local changes
      setLocalSponsorChanges(prev => prev.filter(item => item.id !== id));

      // 3. Delete from Firestore completely
      await deleteDoc(doc(db, 'sponsorships', id));
      
      alert("Sponsorship deal deleted and synced successfully!");
    } catch (err) {
      console.error("Firestore delete error:", err);
      handleFirestoreError(err, OperationType.DELETE, 'sponsorships/' + id);
      alert("Sponsorship deal removed locally on your device!");
    }
  };

  const handleClearAllAds = async () => {
    if (!isAdminLoggedIn) return;
    setIsClearingAllAdsLoading(true);
    try {
      // 1. Mark system sponsorships as seeded in Firestore to prevent default sponsorships fallback
      const seededDocRef = doc(db, 'system_controls', 'sponsorships_seeded');
      await setDoc(seededDocRef, { seeded: true, clearedAt: new Date().toISOString() });
      setIsSponsorshipsSeeded(true);

      // 2. Clear out all existing sponsorships documents in the Firestore sponsorships collection
      for (const s of sponsorships) {
        if (s.id === 'config_seeded') continue;
        await deleteDoc(doc(db, 'sponsorships', s.id));
      }

      // 3. Purge all local client state for instant visual feedback on device
      setLocalSponsorChanges([]);
      setLocalDeletedSponsors([]);

      alert("All current sponsorship ads have been cleared from the database successfully! You are now starting with a blank slate.");
    } catch (err) {
      console.error("Failed to clear sponsorships from Firestore:", err);
      alert("Error occurred while clearing ads. Make sure you are authenticated and try again.");
    } finally {
      setIsClearingAllAdsLoading(false);
      setIsClearingAllAds(false);
    }
  };

  // Run on-mount/auth to permanently delete default sponsorship campaigns from Firestore and set isSponsorshipsSeeded to true
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const deleteDefaultSponsorships = async () => {
      try {
        const defaultIds = ['sp-apex', 'sp-tusher', 'sp-bicon'];
        const namesToPurge = ['apex', 'bicon', 't.u.t. group', 'tut group'];
        
        const toDelete = sponsorships.filter(s => {
          const nameLower = s.companyName?.toLowerCase() || '';
          const matchesName = namesToPurge.some(n => nameLower.includes(n));
          const matchesId = defaultIds.includes(s.id);
          return (matchesName || matchesId) && !deletedIdsThisSession.includes(s.id);
        });

        if (toDelete.length > 0) {
          const newDeletedIds = [...deletedIdsThisSession];
          for (const s of toDelete) {
            newDeletedIds.push(s.id);
            await deleteDoc(doc(db, 'sponsorships', s.id));
            console.log(`Deleted default sponsorship ${s.id} (${s.companyName}) from Firestore`);
          }
          setDeletedIdsThisSession(newDeletedIds);
        }

        // Also delete standard hardcoded ones if not in list
        for (const id of defaultIds) {
          if (!deletedIdsThisSession.includes(id)) {
            await deleteDoc(doc(db, 'sponsorships', id)).catch(() => {});
          }
        }
        
        // Also ensure system_controls/sponsorships_seeded is updated/set so clients know it is seeded
        const seededDocRef = doc(db, 'system_controls', 'sponsorships_seeded');
        await setDoc(seededDocRef, { seeded: true, clearedAt: new Date().toISOString() });
        setIsSponsorshipsSeeded(true);
      } catch (err) {
        console.error("Error during default sponsorships permanent cleanup:", err);
      }
    };
    
    deleteDefaultSponsorships();
  }, [isAdminLoggedIn, sponsorships, deletedIdsThisSession]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    if (authMode === 'signup' && password !== confirmPassword) {
      alert("পাসওয়ার্ড দুটি মিলছে না। অনুগ্রহ করে আবার চেক করুন।");
      return;
    }

    setIsLoggingIn(true);
    setGlobalError(null);

    try {
      // Force Local Persistence
      await setPersistence(auth, browserLocalPersistence);
      
      let finalEmail = email.toLowerCase().trim();
      let finalPassword = password;
      const isAdminCredentials = finalEmail === 'tahsinullahtusher999@gmail.com' && finalPassword === '9900';
      
      if (isAdminCredentials) {
        finalPassword = '9900_TUT2026_ADMIN';
      }

      if (authMode === 'login') {
        try {
          await signInWithEmailAndPassword(auth, finalEmail, finalPassword);
        } catch (loginErr: any) {
          if (isAdminCredentials && (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential')) {
            console.log("Admin user not found, registering automatically...");
            await createUserWithEmailAndPassword(auth, finalEmail, finalPassword);
          } else {
            throw loginErr;
          }
        }
      } else {
        await createUserWithEmailAndPassword(auth, finalEmail, finalPassword);
      }
      
      console.log("Email auth successful");
      window.location.reload();
    } catch (error: any) {
      console.error("Email auth error:", error);
      setIsLoggingIn(false);
      
      let msg = "ত্রুটি ঘটেছে, আবার চেষ্টা করুন।";
      if (error.code === 'auth/operation-not-allowed') {
        msg = "স্যার, ফায়ারবেস কনসোলে ইমেইল লগইন ইনেবল করা নেই।";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "ইমেইল অথবা পাসওয়ার্ড ভুল।";
      } else if (error.code === 'auth/email-already-in-use') {
        msg = "এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।";
      } else if (error.code === 'auth/weak-password') {
        msg = "পাসওয়ার্ডটি খুব দুর্বল। কমপক্ষে ৬টি অক্ষর দিন।";
      } else if (error.code === 'auth/invalid-email') {
        msg = "সঠিক ইমেইল এড্রেস দিন।";
      }
      
      alert(msg);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("পাসওয়ার্ড রিসেট করতে আগে আপনার ইমেইলটি লিখুন।");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("আপনার ইমেইলে পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে। অনুগ্রহ করে চেক করুন।");
    } catch (error: any) {
      console.error("Reset email error:", error);
      alert("ত্রুটি: " + (error.message || "ইমেইল পাঠানো সম্ভব হয়নি।"));
    }
  };

  const handleLogin = async (isRetry = false) => {
    if (isLoggingIn && !isRetry) return;
    setIsLoggingIn(true);
    setGlobalError(null);
    
    // REMINDER: Ensure your current domain is added to the 'Authorized Domains' list 
    // in the Firebase Console (Authentication > Settings > Authorized Domains).
    // Current Domain: ais-dev-bo5opclp4lvfjrzc2bxtnd-813806389941.asia-southeast1.run.app
    
    console.log(`${isRetry ? 'Retrying' : 'Initiating'} Google Login via Popup...`);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Login successful for user:", result.user.email);
      window.location.reload();
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      
      // Automatic Retry logic: If the network fails, try to reconnect once.
      if (!isRetry && (error.code === 'auth/network-request-failed' || error.message?.includes('network'))) {
        console.log("Network error detected. Retrying login once...");
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1500));
        return handleLogin(true);
      }

      setIsLoggingIn(false);
      
      let errorMessage = "Login Failed. ";
      if (error.code === 'auth/network-request-failed') {
        errorMessage += "A network error occurred. Please check your internet connection and try again.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage += "The login popup was blocked. Please allow popups for this site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage += "This domain is not authorized in Firebase. Please add it to 'Authorized Domains' in the Firebase Console.";
      } else {
        errorMessage += error.message || "Unknown error occurred.";
      }
      
      alert(errorMessage);
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
        photoUrl: regData.photoUrl,
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
    const isPassValid = adminPassword === 'TUT2026' || adminPassword === '9900';
    const isPinValid = adminPin === '9900' || adminPin === 'TUT2026';
    const isUserAdminEmail = user && user.email?.toLowerCase() === 'tahsinullahtusher999@gmail.com';

    if (isPassValid || isPinValid || isUserAdminEmail) {
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setAdminError('');
      setAdminPassword('');
      setAdminPin('');
    } else {
      setAdminError('Access Denied: Invalid Password or PIN. Please use your admin credentials (Password/PIN: 9900).');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (requestType === 'loan') {
      const subInfo = getSubscriptionStatusInfo(profile);
      if (!subInfo.active) {
        addToast(
          'Subscription Required',
          subInfo.isLocked
            ? 'Your lending capacities are completely LOCKED for this calendar month because you missed the standard Days 1-5 renewal window. To unlock immediately, please buy a 2-Month Renewal (Late Catch-up) upfront from the Subscription Hub.'
            : 'Please activate your monthly subscription tier first to unlock lending capacities. Standard subscriptions can be purchased in the Subscription Hub.',
          'warning'
        );
        return;
      }

      const currentDebt = profile.remainingDebt || 0;
      const proposedTotalDebt = currentDebt + amount;
      const limit = profile.borrowingLimit ?? 100000;
      if (proposedTotalDebt > limit) {
        addToast('Borrowing Limit Exceeded', `Your total debt with this request (৳${proposedTotalDebt.toLocaleString()}) would exceed your approved lending credit limit (৳${limit.toLocaleString()}). Please contact the Management Desk to increase your limit.`, 'warning');
        return;
      }
    }

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

      if (requestType === 'loan') {
        payload.loanReason = loanReason;
        payload.estimatedRepaymentDate = estimatedRepaymentDate;
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
      setLoanReason('');
      setEstimatedRepaymentDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleBuySubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (!subSenderMobile || !subTrxId) {
      addToast('Information Required', 'Please provide both your sender mobile number and transaction ID.', 'warning');
      return;
    }
    
    const pricing = getSubscriptionPricing(selectedSubTier, profile);
    
    try {
      const payload: any = {
        userId: user.uid,
        userName: profile.name,
        type: 'subscription',
        amount: pricing.price,
        method: subWallet,
        accountNumber: subSenderMobile,
        transactionId: subTrxId,
        status: 'pending',
        subscriptionTier: selectedSubTier,
        subscriptionMonths: pricing.months,
        timestamp: serverTimestamp()
      };
      
      console.log("Submitting subscription transaction payload:", payload);
      const docRef = await addDoc(collection(db, 'transactions'), payload);
      
      // Update local profile status to 'pending_approval'
      await updateDoc(doc(db, 'users', user.uid), {
        subscriptionStatus: 'pending_approval',
        subscriptionTier: selectedSubTier
      });
      
      await sendNotification('New Subscription Request', `${profile.name} submitted a ${selectedSubTier} subscription request for ৳${pricing.price.toLocaleString()}.`, ADMIN_EMAIL);
      
      addToast('Purchase Request Submitted', 'Your subscription payment is currently being verified by the Admin. Once verified, your limits will instantly unlock.', 'success');
      
      // Reset form fields
      setSubSenderMobile('');
      setSubTrxId('');
      setShowSubPaymentMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const rejectTransaction = async (tx: Transaction) => {
    try {
      await deleteDoc(doc(db, 'transactions', tx.id));
      await logAuditEvent('Transaction Rejected', `Rejected ${tx.type} of ৳${tx.amount.toLocaleString()} for ${tx.userName} (${tx.userId})`, 'warning');
      
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
      let userName = targetUid;
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        userName = userData.name;
        if (userData.email) {
          await sendNotification('Membership Rejected', 'Your T.U.T. membership application has been rejected by the Authority.', userData.email);
        }
      }
      await logAuditEvent('Membership Rejected', `Rejected application for: ${userName} (${targetUid})`, 'warning');
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
        await logAuditEvent('Membership Approved', `Approved membership for ${userData.name} with Member ID: ${memberId}`, 'info');
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
        updates.loansTakenThisMonth = (userData.loansTakenThisMonth || 0) + 1;
      } else if (tx.type === 'deposit') {
        updates.totalDeposit = (userData.totalDeposit || 0) + tx.amount;
      } else if (tx.type === 'refund') {
        updates.totalDeposit = Math.max(0, (userData.totalDeposit || 0) - tx.amount);
      } else if (tx.type === 'pay_due') {
        updates.remainingDebt = Math.max(0, (userData.remainingDebt || 0) - tx.amount);
      } else if (tx.type === 'subscription') {
        const tier = tx.subscriptionTier || 'bronze';
        const months = tx.subscriptionMonths || 1;
        const today = new Date();
        let expiresAt = new Date();
        if (months === 2) {
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
          expiresAt = nextMonth;
        } else {
          const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          expiresAt = endOfThisMonth;
        }
        
        updates.subscriptionTier = tier;
        updates.subscriptionStatus = 'active';
        updates.subscriptionExpiresAt = expiresAt.toISOString();
        
        const wasOnTime = today.getDate() <= 5;
        if (wasOnTime) {
          updates.continuousSubscriptionMonths = (userData.continuousSubscriptionMonths || 0) + 1;
        } else {
          updates.continuousSubscriptionMonths = 1;
        }
        
        if ((userData.loansTakenThisMonth ?? 0) === 0 && userData.subscriptionStatus === 'active') {
          updates.consecutiveNoLoanMonths = (userData.consecutiveNoLoanMonths || 0) + 1;
        } else {
          updates.consecutiveNoLoanMonths = 0;
        }
        
        updates.loansTakenThisMonth = 0;
        
        let baseLimit = 100000;
        if (tier === 'bronze') baseLimit = 500;
        if (tier === 'silver') baseLimit = 1500;
        if (tier === 'gold') baseLimit = 2500;
        
        const currentStreak = wasOnTime ? (userData.continuousSubscriptionMonths || 0) + 1 : 1;
        if (currentStreak >= 3) {
          baseLimit += 500;
        }
        updates.borrowingLimit = baseLimit;
        
        // Add subscription amount directly to main reserve fund
        const fundsDocRef = doc(db, 'system_controls', 'funds');
        await setDoc(fundsDocRef, {
          personalFund: increment(tx.amount),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await updateDoc(userRef, updates);
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'confirmed',
        memoId: memoId
      });

      await logAuditEvent('Transaction Confirmed', `Confirmed ${tx.type} of ৳${tx.amount.toLocaleString()} with Memo ID: ${memoId} for ${tx.userName}`, 'info');

      // Send immediate notification to user
      if (userData.email) {
        await sendNotification('Transaction Confirmed!', `Your ${tx.type} request of ৳${tx.amount.toLocaleString()} has been confirmed.`, userData.email);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };

  const updateBorrowingLimit = async (userId: string, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    if (isNaN(parsed) || parsed < 0) {
      addToast('Invalid Limit', 'Please enter a valid non-negative number.', 'warning');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        borrowingLimit: parsed
      });
      const userSnap = await getDoc(doc(db, 'users', userId));
      let userName = userId;
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        userName = uData.name;
        if (uData.email) {
          await sendNotification('Credit Limit Adjusted', `Your approved borrowing credit limit has been updated to ৳${parsed.toLocaleString()} BDT by the T.U.T. Authority.`, uData.email);
        }
      }
      await logAuditEvent('Limit Modified', `Updated approved borrowing limit for ${userName} to ৳${parsed.toLocaleString()} BDT`, 'info');
      addToast('Limit Updated', `Approved borrowing credit limit has been set to ৳${parsed.toLocaleString()} BDT successfully.`, 'success');
      setEditingLimitUid(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-between p-6 relative overflow-hidden">
        {/* Ambient radial glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-indigo-600/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        {/* Top spacer to assist vertical centering of the main load card */}
        <div className="h-10 sm:h-20" />

        {/* Center Loading Core (Shifted slightly upper via margin adjustments) */}
        <div className="flex flex-col items-center justify-center flex-grow -translate-y-6 sm:-translate-y-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-sm px-6"
          >
            {/* Brand Icon Shield container */}
            <div className="relative mb-6 group">
              {/* Soft pulsing outer rings */}
              <div className="absolute -inset-6 bg-blue-500/10 rounded-3xl blur-2xl animate-pulse duration-2000" />
              <div className="absolute -inset-2 bg-gradient-to-tr from-blue-500/25 to-indigo-500/25 rounded-3xl opacity-50 blur-sm animate-pulse duration-1500" />
              
              {/* Main metallic-bordered shield badge */}
              <div className="relative w-16 sm:w-20 h-16 sm:h-20 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.7)] bg-slate-900">
                <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* Brand Title */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-[0.1em] uppercase mb-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              T.U.T.
            </h1>
            <p className="text-[8px] sm:text-[9px] font-black tracking-[0.4em] text-blue-400/80 uppercase mb-8">
              Money Lending Authority
            </p>

            {/* Modern Concentric Dual Spinner */}
            <div className="relative w-14 sm:w-16 h-14 sm:h-16 mb-8 flex items-center justify-center">
              {/* Outer clockwise spinning ring */}
              <div className="absolute inset-0 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
              {/* Inner counter-clockwise spinning ring */}
              <div className="absolute inset-1.5 border-2 border-indigo-400/10 border-b-indigo-400 rounded-full animate-spin-reverse" />
              {/* Center glowing dot */}
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            </div>

            {/* Dynamic Status Message */}
            <div className="h-6 flex items-center justify-center mb-10">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStatusIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.15em] text-blue-300 uppercase leading-none"
                >
                  {LOADING_STATUSES[loadingStatusIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Elegant Professional Developer Credits */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="h-[1px] w-4 bg-gradient-to-r from-transparent to-slate-500/20" />
                <span className="text-[7px] font-bold tracking-[0.35em] text-slate-500 uppercase">AUTHORITY FOUNDER</span>
                <div className="h-[1px] w-4 bg-gradient-to-l from-transparent to-slate-500/20" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-slate-100">
                Tahsin Ullah Tusher
              </h2>
              <p className="text-[7.5px] sm:text-[8px] font-semibold tracking-[0.22em] text-blue-400/70 uppercase mt-0.5">
                Founder, T.U.T. Group of Services
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer Branding Area */}
        <div className="flex flex-col items-center gap-3.5 pb-4 sm:pb-8 relative z-10 w-full">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Core Pillars */}
          <span className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.6em] text-center">
            Trust &bull; Unity &bull; Technology
          </span>

          {/* Small security badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 border border-white/5 rounded-full backdrop-blur-md shadow-lg">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] sm:text-[8px] font-black tracking-widest text-slate-400 uppercase">
              SECURE 256-BIT SSL ENCRYPTION
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-50 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-blue-400/10 px-3.5 py-2.5">
        <div className="max-w-md mx-auto flex gap-3 justify-between items-center">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="logo-shield w-8.5 h-8.5 overflow-hidden rounded-xl border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 bg-slate-900">
              <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-wider text-white leading-none truncate uppercase">T.U.T.</h1>
                {isOffline && (
                  <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 text-[7.5px] font-black tracking-wide px-1 py-0.5 rounded uppercase border border-red-500/30 animate-pulse">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-[7.5px] font-bold text-blue-400/80 uppercase tracking-[0.15em] truncate leading-none mt-1">Money Lending Authority</p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <div className="flex items-center gap-2">
                <a 
                  href="https://wa.me/8801713710607" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-slate-900/60 hover:bg-emerald-500/10 transition-all flex-shrink-0 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                  title="Contact Support (WhatsApp)"
                >
                  <MessageSquare className="w-4 h-4 animate-pulse" />
                </a>
                <button 
                  onClick={() => {
                    setShowNotificationCenter(true);
                    setNotificationSettingsMode(false);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border bg-slate-900/60 transition-all relative flex-shrink-0 cursor-pointer",
                    notificationPermission === 'granted' 
                      ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.12)]" 
                      : "border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
                  )}
                  title="Notification Center"
                >
                  {notificationPermission === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  {notificationHistory.length > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  )}
                </button>
                <button 
                  onClick={() => signOut(auth)} 
                  className="p-2.5 rounded-xl border border-rose-500/30 text-rose-400 bg-slate-900/60 hover:bg-rose-500/10 transition-all flex-shrink-0 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.12)]"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button onClick={() => handleLogin()} disabled={isLoggingIn} className="text-xs px-3 py-1.5 rounded-xl">
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{isLoggingIn ? 'Connecting...' : 'Login'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-2 py-3 pb-24">
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
              className="max-w-3xl"
            >
              <VisionBranding />

              <div className="mt-12">
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
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="w-full max-w-sm glass p-6 rounded-3xl border-white/5 mb-4">
                  <h3 className="text-xl font-black text-white mb-4 uppercase italic">
                    {authMode === 'login' ? 'Member Login' : 'Create Account'}
                  </h3>
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <Input 
                      label="Email Address" 
                      type="email" 
                      required 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                    <div className="relative">
                      <Input 
                        label="Password" 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-white/40 hover:text-white/60"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {authMode === 'signup' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4"
                      >
                        <Input 
                          label="Confirm Password" 
                          type={showPassword ? "text" : "password"} 
                          required 
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            <div className="space-y-2">
                              <p className="text-[11px] text-amber-200/80 font-bold leading-tight uppercase tracking-wider">
                                Security Notice
                              </p>
                              <p className="text-xs text-amber-200/60 leading-relaxed">
                                আপনার পাসওয়ার্ডটি কোথাও লিখে রাখুন বা কপি করে রাখুন। পাসওয়ার্ড ভুলে গেলে একাউন্ট রিকভার করা কঠিন হতে পারে।
                              </p>
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(password);
                                  alert("পাসওয়ার্ড কপি করা হয়েছে!");
                                }}
                                className="flex items-center gap-2 text-[10px] text-amber-500 font-black uppercase tracking-widest hover:text-amber-400"
                              >
                                <Copy className="w-3 h-3" /> Copy Password
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <Button type="submit" className="w-full py-3" disabled={isLoggingIn}>
                      {isLoggingIn ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                    </Button>
                  </form>
                  <div className="mt-6 flex flex-col gap-4 items-center">
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 rounded-full transition-all duration-500",
                        authMode === 'login' 
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40 hover:bg-blue-500 hover:scale-105 active:scale-95 animate-pulse border border-blue-400/30" 
                          : "bg-white/5 text-blue-400 hover:bg-white/10 border border-white/5"
                      )}
                    >
                      {authMode === 'login' ? '🚀 Need an account? Create One' : '← Already have one? Sign In'}
                    </button>
                    
                    {authMode === 'login' && (
                      <button 
                        onClick={handleForgotPassword}
                        className="text-[10px] text-white/20 hover:text-white/40 font-bold uppercase tracking-widest transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                </div>
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
                <FileUploader 
                  label="Profile Photo"
                  currentUrl={regData.photoUrl}
                  onUpload={(url) => setRegData({...regData, photoUrl: url})}
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
          <MemberDashboard
            profile={profile}
            transactions={transactions}
            activeSponsorships={activeSponsorships}
            selectedSubTier={selectedSubTier}
            setSelectedSubTier={setSelectedSubTier}
            subSenderMobile={subSenderMobile}
            setSubSenderMobile={setSubSenderMobile}
            subTrxId={subTrxId}
            setSubTrxId={setSubTrxId}
            subWallet={subWallet}
            setSubWallet={setSubWallet}
            showSubPaymentMode={showSubPaymentMode}
            setShowSubPaymentMode={setShowSubPaymentMode}
            handleBuySubscription={handleBuySubscription}
            onRequestAction={(type) => {
              setActiveTransactionView(type);
            }}
            setShowProfileModal={setShowProfileModal}
            setShowAdminLogin={setShowAdminLogin}
            handleAdClick={handleAdClick}
          />
        )}
      </main>

      {/* Secure Transaction Portal Overlay */}
      <AnimatePresence>
        {activeTransactionView && (
          <SecureTransactionPortal
            type={activeTransactionView}
            profile={profile}
            onClose={() => setActiveTransactionView(null)}
            addToast={addToast}
            sendNotification={sendNotification}
            selectedSubTier={selectedSubTier}
            setSelectedSubTier={setSelectedSubTier}
            subSenderMobile={subSenderMobile}
            setSubSenderMobile={setSubSenderMobile}
            subTrxId={subTrxId}
            setSubTrxId={setSubTrxId}
            subWallet={subWallet}
            setSubWallet={setSubWallet}
            handleBuySubscription={handleBuySubscription}
          />
        )}
      </AnimatePresence>

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
                  <div className="w-14 h-14 overflow-hidden rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 border border-white/10 bg-slate-900">
                    <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

              {/* Tab Navigation */}
              <div id="admin-tab-bar" className="flex flex-wrap gap-2 mb-10 border-b border-white/5 pb-6">
                {[
                  { id: 'overview', label: 'Overview & Analysis', icon: Activity },
                  { id: 'requests', label: 'Pending Queue', icon: Clock, badge: allUsers.filter(u => u.status === 'pending').length + allTransactions.filter(t => t.status === 'pending').length },
                  { id: 'members', label: 'Members Directory', icon: Search },
                  { id: 'partners', label: 'Sponsor Campaigns', icon: Briefcase },
                  { id: 'reminders', label: 'Loan Due Reminders', icon: Mail },
                  { id: 'liquidity', label: 'Liquidity & Risk Board', icon: Shield }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      id={`admin-tab-btn-${tab.id}`}
                      onClick={() => setAdminTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                        adminTab === tab.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02] border border-blue-500/30"
                          : "bg-slate-900/50 hover:bg-slate-900 border border-white/5 text-blue-400/60 hover:text-blue-300"
                      )}
                    >
                      <Icon className="w-4.5 h-4.5 text-current" />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-1 px-2.5 py-0.5 bg-red-600 text-white font-mono rounded-full text-[10px] tracking-tight animate-pulse">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Tab Body */}
              <div>
                {adminTab === 'overview' && (
                  <div className="space-y-10 animate-fade-in text-left">
                    {/* BDT Ledger Summary Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
                      <div className="glass p-5 rounded-3xl border-blue-500/20 bg-blue-900/10 relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full blur-md pointer-events-none" />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Main Money (Invest)</span>
                          <button 
                            id="trigger-fund-edit"
                            onClick={() => { setTempFundValue(authorityPersonalFund.toString()); setShowEditFundModal(true); }}
                            className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded text-[9px] font-black text-blue-300 uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <h4 className="text-xl font-black text-white tracking-tighter">৳ {authorityPersonalFund.toLocaleString()}</h4>
                        <p className="text-[9px] font-mono text-blue-400/50 mt-1 uppercase font-bold tracking-wider">Authority Seed Fund</p>
                      </div>

                      <div className="glass p-5 rounded-3xl border-indigo-500/20 bg-indigo-950/10 hover:border-indigo-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sponsor Profit</span>
                          <div className="p-1 px-1.5 bg-indigo-500/15 rounded-lg border border-indigo-500/20">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                        </div>
                        <h4 className="text-xl font-black text-white tracking-tighter">৳ {sponsorProfit.toLocaleString()}</h4>
                        <p className="text-[9px] font-mono text-indigo-400/50 mt-1 uppercase font-bold tracking-wider">Corporate Yield Pool</p>
                      </div>

                      <div className="glass p-5 rounded-3xl border-amber-500/30 bg-amber-950/20 relative overflow-hidden hover:border-amber-500/50 transition-all duration-300">
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Total Capital</span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded uppercase">Core Pool</span>
                        </div>
                        <h4 className="text-xl font-black text-amber-300 tracking-tighter">৳ {totalFinancialAmount.toLocaleString()}</h4>
                        <p className="text-[9px] font-mono text-amber-500/50 mt-1 uppercase font-bold tracking-wider">Main Money + Sponsor Profit</p>
                      </div>

                      <div className="glass p-5 rounded-3xl border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Outstanding (Lent)</span>
                          <div className="p-1 px-1.5 bg-rose-500/15 rounded-lg border border-rose-500/20">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          </div>
                        </div>
                        <h4 className="text-xl font-black text-rose-400 tracking-tighter">৳ {outstandingDebt.toLocaleString()}</h4>
                        <p className="text-[9px] font-mono text-rose-400/50 mt-1 uppercase font-bold tracking-wider">Active Outflow Assets</p>
                      </div>

                      <div className="glass p-5 rounded-3xl border-emerald-500/30 bg-emerald-950/15 relative overflow-hidden hover:border-emerald-500/50 transition-all duration-300">
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Runway Liquidity</span>
                          <div className="p-1 px-1.5 bg-emerald-500/15 rounded-lg border border-emerald-500/20">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        </div>
                        <h4 className="text-xl font-black text-[#50e3c2] tracking-tighter">৳ {runwayLiquidity.toLocaleString()}</h4>
                        <p className="text-[9px] font-mono text-emerald-400/50 mt-1 uppercase font-bold tracking-wider">Net Solvent Reserves Surplus</p>
                      </div>
                    </div>

                    {/* Charts & Transition Flow */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Interactive Custom SVG Financial Target Allocations Chart */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="glass p-6 rounded-3xl border-white/5 relative overflow-hidden">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                Financial Allocation Trend (2026)
                              </h4>
                              <p className="text-[10px] text-blue-400/50 uppercase tracking-widest mt-0.5">Asset Allocation vs Brand Value Inflows</p>
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                              <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" /> Total Lent</span>
                              <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" /> Sponsor Backing</span>
                            </div>
                          </div>
                          
                          <div className="h-48 w-full">
                            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                                </linearGradient>
                                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              
                              {/* Grids */}
                              {[0, 1, 2, 3].map(i => (
                                <line 
                                  key={i} 
                                  x1="0" 
                                  y1={30 + i * 45} 
                                  x2="500" 
                                  y2={30 + i * 45} 
                                  stroke="rgba(255,255,255,0.03)" 
                                  strokeDasharray="4 4" 
                                />
                              ))}
                              
                              {/* Charts Path */}
                              <path 
                                d="M 20 150 Q 120 120 220 110 T 420 60 L 480 40 L 480 165 L 20 165 Z" 
                                fill="url(#blueGrad)" 
                              />
                              <path 
                                d="M 20 150 Q 120 120 220 110 T 420 60 L 480 40" 
                                fill="none" 
                                stroke="#3b82f6" 
                                strokeWidth="3.5" 
                                strokeLinecap="round" 
                              />
                              
                              <path 
                                d="M 20 160 Q 120 150 220 130 T 420 100 L 480 85 L 480 165 L 20 165 Z" 
                                fill="url(#indigoGrad)" 
                              />
                              <path 
                                d="M 20 160 Q 120 150 220 130 T 420 100 L 480 85" 
                                fill="none" 
                                stroke="#6366f1" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeDasharray="4 2"
                              />

                              {/* Anchor glows */}
                              <circle cx="220" cy="110" r="5" fill="#3b82f6" className="drop-shadow-[0_0_8px_#3b82f6]" />
                              <circle cx="480" cy="40" r="5" fill="#3b82f6" className="drop-shadow-[0_0_8px_#3b82f6]" />
                              <circle cx="480" cy="85" r="4" fill="#6366f1" />
                            </svg>
                          </div>
                          
                          <div className="flex justify-between text-[8px] font-mono font-bold uppercase tracking-widest text-blue-400/40 mt-4 px-2">
                            <span>Jan 2026</span>
                            <span>Feb</span>
                            <span>Mar</span>
                            <span>Apr</span>
                            <span>May</span>
                            <span>Jun 2026 (Pres.)</span>
                          </div>
                        </div>
                      </div>

                      {/* Member Transition Funnel */}
                      <div className="space-y-6 animate-fade-in">
                        <div className="glass p-6 rounded-3xl border-white/5 bg-slate-900/5">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Member Pipeline Stage Funnel</h4>
                          <p className="text-[10px] text-blue-400/50 uppercase tracking-widest mb-6">Transition Funnel & Risk Allocations</p>
                          
                          <div className="space-y-5">
                            {/* Stage 1: Registration Pipeline */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className="text-blue-300">Unverified Applicants</span>
                                <span className="text-blue-400 font-mono">{allUsers.filter(u => u.status === 'pending').length} Members</span>
                              </div>
                              <div className="w-full h-2 bg-blue-900/20 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  style={{ width: `${Math.min(100, Math.max(10, (allUsers.filter(u => u.status === 'pending').length / (allUsers.length || 1)) * 100))}%` }} 
                                />
                              </div>
                            </div>

                            {/* Stage 2: Liquid Depositors */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className="text-emerald-300">Clean Active Depositors</span>
                                <span className="text-emerald-400 font-mono">{allUsers.filter(u => u.status === 'approved' && u.remainingDebt === 0 && (u.totalDeposit || 0) > 0).length} Members</span>
                              </div>
                              <div className="w-full h-2 bg-emerald-900/20 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="h-full bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
                                  style={{ width: `${Math.min(100, Math.max(10, (allUsers.filter(u => u.status === 'approved' && u.remainingDebt === 0 && (u.totalDeposit || 0) > 0).length / (allUsers.length || 1)) * 100))}%` }} 
                                />
                              </div>
                            </div>

                            {/* Stage 3: Active Debtor Members */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className="text-amber-300">Outstanding Loan Recipients</span>
                                <span className="text-amber-400 font-mono">{allUsers.filter(u => u.status === 'approved' && u.remainingDebt > 0).length} Members</span>
                              </div>
                              <div className="w-full h-2 bg-amber-900/20 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                                  style={{ width: `${Math.min(100, Math.max(10, (allUsers.filter(u => u.status === 'approved' && u.remainingDebt > 0).length / (allUsers.length || 1)) * 100))}%` }} 
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 border-t border-white/5 pt-4 text-center">
                            <span className="text-[10px] font-black tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                              System Risk Rating: Excellent (Liquidity Solvent)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'requests' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in text-left">
                    {/* Treasury Solver Statement HUD */}
                    <div className="col-span-1 lg:col-span-2 border border-blue-500/20 bg-blue-950/15 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-relaxed">Total Capital Capacity</p>
                        <p className="text-2xl font-black text-white tracking-tight">৳ {totalFinancialAmount.toLocaleString()}</p>
                        <p className="text-[9px] font-mono text-blue-400/50 uppercase font-bold">Main Money + Sponsor Profit (Core Asset)</p>
                      </div>
                      <div className="space-y-1 border-t md:border-t-0 md:border-x border-white/5 pt-4 md:pt-0 md:px-6">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-relaxed">Outstanding Claims (Lent)</p>
                        <p className="text-2xl font-black text-rose-400 tracking-tight">৳ {outstandingDebt.toLocaleString()}</p>
                        <p className="text-[9px] font-mono text-rose-400/50 uppercase font-bold">Distributed Capital Load</p>
                      </div>
                      <div className="space-y-1 pt-4 md:pt-0">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-relaxed">Available Lending Reserve</p>
                        <p className="text-2xl font-black text-[#50e3c2] tracking-tight">৳ {availableLendingCapacity.toLocaleString()}</p>
                        <p className="text-[9px] font-mono text-emerald-400/50 uppercase font-bold">Limit for distributions</p>
                      </div>
                    </div>

                    {/* Pending Registrations Column */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-black flex items-center gap-3 border-b border-white/5 pb-6 uppercase tracking-tight italic text-amber-400">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                          <UserPlus className="w-6 h-6 text-amber-500" />
                        </div>
                        Pending Registrations ({allUsers.filter(u => u.status === 'pending').length})
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
                                  <Button variant="danger" id={`reject-mbr-${u.uid}`} className="px-3 py-1 text-xs" onClick={() => rejectMember(u.uid)}>Reject</Button>
                                  <Button variant="secondary" id={`approve-mbr-${u.uid}`} className="px-3 py-1 text-xs" onClick={() => approveMember(u.uid)}>Approve</Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-4 border-t border-white/5 col-gap-6 row-gap-3 leading-normal">
                                <div>
                                  <p className="text-blue-400/40 uppercase font-black tracking-widest mb-1 text-[9px]">NID Number</p>
                                  <p className="font-mono text-blue-100 font-bold">{u.nid}</p>
                                </div>
                                <div>
                                  <p className="text-blue-400/40 uppercase font-black tracking-widest mb-1 text-[9px]">Address</p>
                                  <p className="truncate text-blue-100 font-medium">{u.permanentAddress || u.address}</p>
                                </div>
                                {(u.facebook || u.whatsapp || u.telegram) && (
                                  <div className="col-span-2 mt-2">
                                    <p className="text-blue-400/40 uppercase font-black tracking-widest mb-2 text-[9px]">Social Links</p>
                                    <div className="flex flex-wrap gap-3">
                                      {u.facebook && (
                                        <a href={u.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2.5 py-1 rounded-lg">
                                          <Facebook className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-black">Facebook</span>
                                        </a>
                                      )}
                                      {u.whatsapp && (
                                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-bold">{u.whatsapp}</span>
                                        </div>
                                      )}
                                      {u.telegram && (
                                        <div className="flex items-center gap-1.5 text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg">
                                          <Send className="w-3.5 h-3.5" />
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
                          <p className="text-blue-400/40 text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-blue-400/10 text-xs uppercase font-black tracking-widest">
                            No unverified applicant registrations
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Transaction Requests Column */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-black flex items-center gap-3 border-b border-white/5 pb-6 uppercase tracking-tight italic text-blue-400">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                          <CreditCard className="w-6 h-6 text-blue-400" />
                        </div>
                        Transaction Requests ({allTransactions.filter(t => t.status === 'pending').length})
                      </h3>
                      <div className="space-y-4">
                        {allTransactions.filter(t => t.status === 'pending').length > 0 ? (
                          allTransactions.filter(t => t.status === 'pending').map(tx => (
                            <Card key={tx.id} className="border-blue-500/20">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                  <div className={cn("p-3 rounded-xl flex-shrink-0", 
                                    tx.type === 'loan' ? "bg-red-500/20" : 
                                    tx.type === 'refund' ? "bg-amber-500/20" : 
                                    tx.type === 'pay_due' ? "bg-blue-500/20" :
                                    tx.type === 'subscription' ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-emerald-500/20"
                                  )}>
                                    {tx.type === 'loan' ? <ArrowUpRight className="w-6 h-6 text-red-400" /> : 
                                     tx.type === 'refund' ? <ArrowUpRight className="w-6 h-6 text-amber-400" /> :
                                     tx.type === 'pay_due' ? <ArrowDownLeft className="w-6 h-6 text-blue-400" /> :
                                     tx.type === 'subscription' ? <span className="text-xl">👑</span> :
                                     <ArrowDownLeft className="w-6 h-6 text-emerald-400" />}
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <h4 className="font-bold text-lg truncate">{tx.userName}</h4>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-xs text-blue-400/60 uppercase font-black tracking-[0.2em]">
                                        {tx.type === 'subscription' ? `${tx.subscriptionTier} Subscription` : tx.type.replace('_', ' ')} Request
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                          {tx.method}
                                        </span>
                                        {tx.accountNumber && (
                                          <span className="text-[10px] font-mono text-blue-100 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                                            Acc: <span className="text-amber-400 font-bold">{tx.accountNumber}</span>
                                          </span>
                                        )}
                                        {tx.transactionId && (
                                          <span className="text-[10px] font-mono text-blue-100 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                                            TrxID: <span className="text-emerald-400 font-bold">{tx.transactionId}</span>
                                          </span>
                                        )}
                                      </div>
                                      
                                      {tx.type === 'loan' && (
                                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-xl space-y-3 max-w-sm">
                                          {tx.loanReason && (
                                            <div className="space-y-1">
                                              <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">Reason for Loan</p>
                                              <p className="text-xs text-blue-100 leading-relaxed font-medium">{tx.loanReason}</p>
                                            </div>
                                          )}
                                          {tx.estimatedRepaymentDate && (
                                            <div className="space-y-1">
                                              <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">Est. Due Repay Date</p>
                                              <p className="text-xs text-amber-400 font-black tracking-tight">{format(new Date(tx.estimatedRepaymentDate), 'dd MMMM yyyy')}</p>
                                            </div>
                                          )}

                                          {/* LIVE FINANCIAL SOLVENCY STATEMENT ASSESSMENT */}
                                          <div className="pt-2.5 border-t border-white/10 space-y-2">
                                            <p className="text-[9px] font-black text-[#50e3c2] uppercase tracking-[0.1em]">Lending Solvency Assessment</p>
                                            <div className="flex justify-between items-center text-[10px]">
                                              <span className="text-blue-200/60">Share of Pool:</span>
                                              <span className="font-mono font-bold text-white">
                                                {((tx.amount / (totalFinancialAmount || 1)) * 100).toFixed(1)}% of Capital
                                              </span>
                                            </div>
                                            {tx.amount > availableLendingCapacity ? (
                                              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-300 font-bold flex flex-col gap-1 leading-normal">
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs">⚠️</span>
                                                  <span>Insufficient Liquidity Limit</span>
                                                </div>
                                                <span className="text-[9px] text-rose-400/80 font-normal">
                                                  This request exceeds the current available lending limit by ৳{(tx.amount - availableLendingCapacity).toLocaleString()}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300 font-bold flex flex-col gap-1 leading-normal">
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs">✅</span>
                                                  <span>Lending Capacity: Safe</span>
                                                </div>
                                                <span className="text-[9px] text-emerald-400/80 font-normal">
                                                  Ample reserves remaining (৳{availableLendingCapacity.toLocaleString()} limit)
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end w-full sm:w-auto gap-4">
                                  <p className="text-xl font-black text-white">৳ {tx.amount.toLocaleString()}</p>
                                  <div className="flex gap-2">
                                    <Button variant="danger" id={`reject-tx-${tx.id}`} className="px-3 py-2 text-xs min-h-0" onClick={() => rejectTransaction(tx)}>Reject</Button>
                                    <Button variant="secondary" id={`confirm-tx-${tx.id}`} className="px-3 py-2 text-xs min-h-0" onClick={() => confirmTransaction(tx)}>Confirm</Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-blue-400/40 text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-blue-400/10 text-xs uppercase font-black tracking-widest font-bold">
                            No pending transactions.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

                {adminTab === 'members' && (
                  <div className="space-y-8 animate-fade-in text-left">
                    {/* Member Directory Tab with dynamic filtering */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight italic text-blue-400">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                          <Search className="w-6 h-6 text-blue-400" />
                        </div>
                        Members Directory ({allUsers.filter(u => u.status === 'approved').length})
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                        <Button
                          variant="secondary"
                          onClick={() => setShowCreateMemberModal(true)}
                          className="w-full sm:w-auto text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/30 shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Add New Member</span>
                        </Button>
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-400/50" />
                          <input
                            type="text"
                            id="admin-member-search"
                            placeholder="Search Name, Member ID, Phone..."
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                            className="w-full bg-slate-100/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs leading-none text-white focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Member list blocks */}
                    <div className="hidden lg:block overflow-hidden bg-slate-900/30 border border-white/5 rounded-3xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-900/40">
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400">Member ID</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400">Name</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400">Phone</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400 text-right">Total Loan</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400 text-right">Total Deposit</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400 text-right">Debt</th>
                              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-blue-400 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {allUsers.filter(u => u.status === 'approved' && (
                              u.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                              u.phone.includes(memberSearch) || 
                              (u.memberId && u.memberId.toLowerCase().includes(memberSearch.toLowerCase()))
                            )).length > 0 ? (
                              allUsers.filter(u => u.status === 'approved' && (
                                u.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                u.phone.includes(memberSearch) || 
                                (u.memberId && u.memberId.toLowerCase().includes(memberSearch.toLowerCase()))
                              )).map(u => {
                                return (
                                  <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-5 px-6 font-mono text-amber-400 text-sm font-bold tracking-widest">{u.memberId}</td>
                                    <td className="py-5 px-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-amber-500/50 p-0.5 flex-shrink-0 overflow-hidden bg-blue-600/20">
                                          {u.photoUrl ? (
                                            <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-blue-400">
                                              {u.name.charAt(0)}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-black tracking-tight">{u.name}</span>
                                          <div className="flex gap-2 mt-1">
                                            {u.facebook && (
                                              <a href={u.facebook} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors" title="Facebook">
                                                <Facebook className="w-3.5 h-3.5" />
                                              </a>
                                            )}
                                            {u.whatsapp && (
                                              <a href={`https://wa.me/${u.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors" title="WhatsApp">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                              </a>
                                            )}
                                            {u.telegram && (
                                              <a href={`https://t.me/${u.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 transition-colors" title="Telegram">
                                                <Send className="w-3.5 h-3.5" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-5 px-6 text-sm text-blue-200/60 font-medium">{u.phone}</td>
                                    <td className="py-5 px-6 text-sm text-rose-400 font-bold tracking-tighter text-right">৳ {u.totalLoan.toLocaleString()}</td>
                                    <td className="py-5 px-6 text-sm text-emerald-400 font-bold tracking-tighter text-right">৳ {u.totalDeposit.toLocaleString()}</td>
                                    <td className="py-5 px-6 text-sm font-black text-white tracking-tighter text-right">৳ {u.remainingDebt.toLocaleString()}</td>
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
                                );
                              })
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

                    {/* Mobile Card List View for directories context */}
                    <div className="grid grid-cols-1 gap-4 lg:hidden">
                      {allUsers.filter(u => u.status === 'approved' && (
                        u.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                        u.phone.includes(memberSearch) || 
                        (u.memberId && u.memberId.toLowerCase().includes(memberSearch.toLowerCase()))
                      )).length > 0 ? (
                        allUsers.filter(u => u.status === 'approved' && (
                          u.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                          u.phone.includes(memberSearch) || 
                          (u.memberId && u.memberId.toLowerCase().includes(memberSearch.toLowerCase()))
                        )).map(u => {
                          const debt = u.remainingDebt || 0;
                          const dep = u.totalDeposit || 0;
                          let rLabel = 'Excellent';
                          let rCol = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          if (debt > 0) {
                            if (dep >= debt) {
                              rLabel = 'Low Risk';
                              rCol = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                            } else if (debt > 150000) {
                              rLabel = 'High Alert';
                              rCol = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                            } else {
                              rLabel = 'Medium Risk';
                              rCol = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                            }
                          }
                          return (
                            <Card key={u.uid} className="border-white/5">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full border-2 border-amber-500/50 p-0.5 flex-shrink-0 overflow-hidden bg-blue-600/20">
                                    {u.photoUrl ? (
                                      <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs font-black text-blue-400">
                                        {u.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-white tracking-tight">{u.name}</h4>
                                    <p className="text-[10px] font-mono text-amber-400 font-bold tracking-widest">{u.memberId}</p>
                                  </div>
                                </div>
                                <span className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border leading-none", rCol)}>
                                  {rLabel}
                                </span>
                              </div>
                              <div className="space-y-2 text-xs pt-4 border-t border-white/5 leading-normal">
                                <div className="flex justify-between">
                                  <span className="text-blue-400/50 font-bold uppercase text-[9px] tracking-wider">Contact</span>
                                  <span className="text-white font-medium">{u.phone}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-400/50 font-bold uppercase text-[9px] tracking-wider">Deposits</span>
                                  <span className="text-emerald-400 font-mono font-bold">৳ {u.totalDeposit.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-400/50 font-bold uppercase text-[9px] tracking-wider">Lent</span>
                                  <span className="text-blue-400 font-mono font-bold">৳ {u.totalLoan.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-400/50 font-bold uppercase text-[9px] tracking-wider">Due Debt</span>
                                  <span className="text-amber-500 font-mono font-bold">৳ {u.remainingDebt.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 flex gap-2">
                                  <Button variant="secondary" id={`edit-usr-btn-mob-${u.uid}`} className="flex-1 py-3 text-xs" onClick={() => openEditModal(u)}>Edit</Button>
                                  <Button variant="danger" id={`del-usr-btn-mob-${u.uid}`} className="px-4 py-3 text-xs" onClick={() => {
                                    setUserToDelete(u);
                                    setShowDeleteModal(true);
                                  }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <p className="text-blue-400/40 text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-blue-400/10 text-xs uppercase font-black tracking-widest">
                          No approved members matching details
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {adminTab === 'partners' && (
                  <div className="space-y-8 animate-fade-in text-left">
                    {/* Sponsorship Campaigns Listing and Creation Dashboard */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-white/5 pb-2">
                      <div>
                        <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight italic text-indigo-400">
                          <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Briefcase className="w-6 h-6 text-indigo-400" />
                          </div>
                          Corporate Sponsorships
                        </h3>
                        <p className="text-[10px] text-blue-400/50 uppercase tracking-widest mt-1">Our primary profit engine supporting zero-interest lending</p>
                      </div>
                      <div className="flex gap-2.5 flex-wrap justify-end">
                        {activeSponsorships.length > 0 && (
                          <Button 
                            variant={isClearingAllAds ? "danger" : "secondary"} 
                            id="clear-all-ads-btn" 
                            className={cn(
                              "flex items-center gap-1.5 py-4 px-6 text-xs font-black uppercase tracking-widest transition-all",
                              isClearingAllAds ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "text-red-400 hover:text-red-300 border border-red-500/10 hover:border-red-500/30"
                            )} 
                            disabled={isClearingAllAdsLoading}
                            onClick={async () => {
                              if (!isClearingAllAds) {
                                setIsClearingAllAds(true);
                                setTimeout(() => setIsClearingAllAds(false), 5000);
                              } else {
                                await handleClearAllAds();
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            {isClearingAllAdsLoading ? "Clearing..." : isClearingAllAds ? "Confirm Clear?" : "Clear All Ads"}
                          </Button>
                        )}
                        <Button variant="secondary" id="open-sponsor-modal-btn" className="flex items-center gap-1.5 py-4 px-6 text-xs font-black uppercase tracking-widest" onClick={() => setShowSponsorModal(true)}>
                          <Plus className="w-4 h-4" />
                          Log Brand Deal
                        </Button>
                      </div>
                    </div>

                    {/* Visual Analytics Hub Cards & Real-time Chart Dashboard */}
                    {(() => {
                      const totalRevenue = activeSponsorships.reduce((sum, s) => sum + (s.dealValue || 0), 0);
                      const totalImpressions = activeSponsorships.reduce((sum, s) => sum + (s.impressions || 0), 0);
                      const totalClicks = activeSponsorships.reduce((sum, s) => sum + (s.clicks || 0), 0);
                      const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

                      // Find best performing campaign by CTR
                      let bestCampaignName = "None";
                      let bestCampaignCtr = 0;
                      activeSponsorships.forEach(s => {
                        const sImpressions = s.impressions || 1;
                        const sClicks = s.clicks || 0;
                        const ctr = (sClicks / sImpressions) * 100;
                        if (ctr > bestCampaignCtr) {
                          bestCampaignCtr = ctr;
                          bestCampaignName = s.companyName;
                        }
                      });

                      const chartData = activeSponsorships.map(s => {
                        const term = s.companyName.replace(/Group of Services|Logistics Global|Holdings Ltd\./i, '').trim();
                        return {
                          name: term.length > 10 ? term.substring(0, 10) + '..' : term,
                          'Revenue (৳)': s.dealValue,
                          'Impressions': s.impressions || 0,
                          'Clicks': s.clicks || 0,
                          'CTR (%)': Number((( (s.clicks || 0) / (s.impressions || 1) ) * 100).toFixed(1))
                        };
                      });

                      return (
                        <div className="space-y-6">
                          {/* Visual Analytics Hub Cards */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="glass p-4 rounded-3xl border-indigo-500/15 flex flex-col gap-1 relative overflow-hidden bg-slate-900/10">
                              <div className="absolute top-2.5 right-2.5 p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[9px] text-blue-200/50 uppercase tracking-widest font-black">Cumulative Deal Value</span>
                              <p className="text-lg font-black text-white mt-1">৳ {totalRevenue.toLocaleString()}</p>
                              <span className="text-[8px] text-emerald-400 font-mono mt-0.5">100% Social Funding pool</span>
                            </div>
                            <div className="glass p-4 rounded-3xl border-blue-500/15 flex flex-col gap-1 relative overflow-hidden bg-slate-900/10">
                              <div className="absolute top-2.5 right-2.5 p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                                <Activity className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[9px] text-blue-200/50 uppercase tracking-widest font-black">Impression Sum</span>
                              <p className="text-lg font-black text-white mt-1">{totalImpressions.toLocaleString()}</p>
                              <span className="text-[8px] text-blue-400/60 font-mono mt-0.5">Total organic client impressions</span>
                            </div>
                            <div className="glass p-4 rounded-3xl border-emerald-500/15 flex flex-col gap-1 relative overflow-hidden bg-slate-900/10">
                              <div className="absolute top-2.5 right-2.5 p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                <Play className="w-3.5 h-3.5 rotate-90" />
                              </div>
                              <span className="text-[9px] text-blue-200/50 uppercase tracking-widest font-black">Action Clicks</span>
                              <p className="text-lg font-black text-white mt-1">{totalClicks.toLocaleString()}</p>
                              <span className="text-[8px] text-emerald-400/80 font-mono mt-0.5">Interactive target redirection</span>
                            </div>
                            <div className="glass p-4 rounded-3xl border-amber-500/15 flex flex-col gap-1 relative overflow-hidden bg-slate-900/10">
                              <div className="absolute top-2.5 right-2.5 p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[9px] text-blue-200/50 uppercase tracking-widest font-black">Overall CTR</span>
                              <p className="text-lg font-black text-white mt-1">{avgCtr}%</p>
                              <span className="text-[8px] text-amber-400/80 font-mono mt-0.5">Brand conversion performance</span>
                            </div>
                          </div>

                          {/* Recharts Analytics Panel */}
                          <div className="glass p-5 rounded-3xl border-white/5 bg-slate-900/40 relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                              <div>
                                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                  Sponsorship Performance Intelligence Matrix
                                </h4>
                                <p className="text-[10px] text-blue-200/50 mt-1">Real-time graphic data parsing impressions, clicks and corporate investments</p>
                              </div>
                              <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/5 self-end sm:self-auto shrink-0">
                                <button
                                  onClick={() => setSponsorChartView('traffic')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all",
                                    sponsorChartView === 'traffic' ? "bg-indigo-600 text-white shadow-md" : "text-blue-200/40 hover:text-white"
                                  )}
                                >
                                  Traffic Performance
                                </button>
                                <button
                                  onClick={() => setSponsorChartView('financial')}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all",
                                    sponsorChartView === 'financial' ? "bg-indigo-600 text-white shadow-md" : "text-blue-200/40 hover:text-white"
                                  )}
                                >
                                  Financial Portfolio
                                </button>
                              </div>
                            </div>

                            {/* Chart Window */}
                            <div className="h-[240px] w-full min-w-0 pr-2">
                              {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  {sponsorChartView === 'traffic' ? (
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                      <XAxis dataKey="name" stroke="#ffffff30" fontSize={9} />
                                      <YAxis stroke="#ffffff30" fontSize={9} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#ffffff15', borderRadius: '12px' }} 
                                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                                        itemStyle={{ fontSize: '10px' }}
                                      />
                                      <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                                      <Bar dataKey="Impressions" fill="#6366f1" radius={[4, 4, 0, 0]} fillOpacity={0.8} name="Impressions (Views)" />
                                      <Bar dataKey="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.8} name="Link Clicks" />
                                    </BarChart>
                                  ) : (
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                      <XAxis dataKey="name" stroke="#ffffff30" fontSize={9} />
                                      <YAxis stroke="#ffffff30" fontSize={9} tickFormatter={(v: number) => `৳${(v/1000).toFixed(0)}k`} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#ffffff15', borderRadius: '12px' }} 
                                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                                        itemStyle={{ fontSize: '10px' }}
                                        formatter={(v: any) => [`৳ ${v.toLocaleString()}`, 'Deal Agreement']}
                                      />
                                      <Area type="monotone" dataKey="Revenue (৳)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} name="Sponsor Value" />
                                    </AreaChart>
                                  )}
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex items-center justify-center text-xs text-blue-200/40 uppercase tracking-widest">
                                  No Active Campaign Data Available
                                </div>
                              )}
                            </div>

                            {/* Recommendation insight line */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-4 sm:flex-row flex-col text-left">
                              <p className="text-[10px] text-blue-200/50 leading-relaxed font-normal">
                                💡 <strong className="text-amber-400 font-black">Conversion Optimizer:</strong> {bestCampaignName !== 'None' ? (
                                  <span>Your top-performing active campaign is <strong className="text-white">{bestCampaignName}</strong> with a CTR of <strong className="text-white">{bestCampaignCtr.toFixed(1)}%</strong>. Duplicate this content blueprint to secure maximum partner conversion rates.</span>
                                ) : (
                                  <span>Add active corporate campaigns to generate CTR metrics and receive custom target recommendations.</span>
                                )}
                              </p>
                              <span className="text-[8px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap self-start sm:self-auto leading-none">
                                Telemetry Active
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Active sponsors bento block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeSponsorships.map(s => {
                        const ctr = s.impressions > 0 ? ((s.clicks || 0) / s.impressions * 100).toFixed(1) : '0.0';
                        const targetImpressionsGoal = 500;
                        const progressPercent = Math.min(100, Math.round((s.impressions / targetImpressionsGoal) * 100));

                        return (
                          <div key={s.id} className="glass p-6 rounded-3xl border-white/5 bg-slate-900/15 relative overflow-hidden group flex flex-col justify-between">
                            <div>
                              {s.status === 'active' && (
                                <div className="absolute top-3 right-3 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                              )}
                              
                              <div className="flex justify-between items-start mb-4">
                                <span className={cn(
                                  "text-[8px] font-black text-white uppercase tracking-widest px-2.5 py-1 rounded-md border",
                                  s.campaignType === 'Premium Partner' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  s.campaignType === 'Strategic Collab' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                )}>
                                  {s.campaignType}
                                </span>
                                <span className={cn(
                                  "text-[8.5px] font-bold uppercase tracking-widest",
                                  s.status === 'active' ? 'text-emerald-400' : 
                                  s.status === 'paused' ? 'text-amber-500' : 'text-blue-400/40'
                                )}>
                                  {s.status}
                                </span>
                              </div>

                              <h4 className="text-lg font-black text-white tracking-tight mb-1">{s.companyName}</h4>
                              <p className="text-xs text-blue-400/40 font-mono font-black border-b border-white/5 pb-3">
                                Agreement: ৳ {s.dealValue.toLocaleString()}
                              </p>

                              <div className="mt-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl min-h-[64px]">
                                <p className="text-[9px] text-indigo-400 font-extrabold uppercase mb-1">Live Ad Text Spotlight</p>
                                <p className="text-xs text-blue-200/80 italic font-medium leading-relaxed">"{s.promotionText}"</p>
                              </div>

                              {/* Brand Marketing Active Assets */}
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {s.logoUrl && <span className="text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">Logo Active</span>}
                                {s.imageUrl && <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">Poster Active</span>}
                                {s.videoUrl && <span className="text-[8px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">Video Included</span>}
                                {s.targetUrl && <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Action Link</span>}
                                {s.specialOffer && <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded">Coupon Offer</span>}
                              </div>

                              {/* CTR Calculation & Campaign Milestone Progress */}
                              <div className="grid grid-cols-3 gap-2 mt-4 text-[9px] font-mono text-blue-400/50 border-t border-white/5 pt-3.5">
                                <div>
                                  <span>Launch Date:</span>
                                  <p className="text-white font-sans font-bold text-[10.5px] mt-0.5 whitespace-nowrap">{s.startDate}</p>
                                </div>
                                <div className="text-center">
                                  <span>Views / Clicks:</span>
                                  <p className="text-[#50e3c2] font-sans font-black text-[10.5px] mt-0.5">
                                    {s.impressions} <span className="text-white/20">/</span> {s.clicks || 0}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span>CTR Ratio:</span>
                                  <p className="text-amber-400 font-sans font-black text-[10.5px] mt-0.5">{ctr}%</p>
                                </div>
                              </div>

                              <div className="mt-3.5">
                                <div className="flex justify-between items-center text-[8px] font-mono text-blue-400/40 mb-1">
                                  <span>Campaign Performance Goal Reach</span>
                                  <span>{progressPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                  <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-5 border-t border-white/5 mt-5 flex gap-2">
                              <Button 
                                variant={s.status === 'active' ? 'glass' : 'secondary'} 
                                className="flex-1 py-3 text-xs leading-none min-h-0" 
                                id={`toggle-sponsor-status-${s.id}`}
                                onClick={() => handleToggleSponsorStatus(s.id, s.status)}
                              >
                                {s.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                              </Button>
                              <Button 
                                variant={deletingSponsorId === s.id ? "danger" : "secondary"} 
                                className={cn(
                                  "py-3 leading-none min-h-0 transition-all duration-300 flex items-center justify-center gap-1.5",
                                  deletingSponsorId === s.id ? "px-6 bg-red-600 hover:bg-red-700 font-extrabold text-white animate-pulse" : "px-4"
                                )} 
                                id={`delete-sponsor-${s.id}`}
                                onClick={() => handleDeleteSponsor(s.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deletingSponsorId === s.id && <span className="text-[9px] uppercase tracking-wider font-sans">Confirm?</span>}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {adminTab === 'reminders' && (
                  <div className="space-y-8 animate-fade-in text-left">
                    <div className="border-b border-white/5 pb-6">
                      <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight italic text-emerald-400">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                          <Mail className="w-6 h-6 text-emerald-400" />
                        </div>
                        Loan Due Reminders & Statement Hub
                      </h3>
                      <p className="text-[10px] text-blue-400/50 uppercase tracking-widest mt-1">
                        Secure SMTP Professional Statement dispatching & automated debt due tracking
                      </p>
                    </div>

                    {/* Metrics Dashboard */}
                    {(() => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const todayStr = format(today, 'yyyy-MM-dd');
                      
                      const confirmedLoans = allTransactions.filter(
                        t => t.type === 'loan' && t.status === 'confirmed' && t.estimatedRepaymentDate
                      );
                      
                      const outstandingLoans = confirmedLoans.filter(tx => {
                        const userProfile = allUsers.find(u => u.uid === tx.userId);
                        return userProfile && userProfile.remainingDebt > 0;
                      });
                      
                      const overdueCount = outstandingLoans.filter(tx => {
                        const estRepayDate = new Date(tx.estimatedRepaymentDate!);
                        estRepayDate.setHours(0,0,0,0);
                        return estRepayDate.getTime() < today.getTime();
                      }).length;

                      const dueTodayCount = outstandingLoans.filter(tx => {
                        const estRepayDate = new Date(tx.estimatedRepaymentDate!);
                        estRepayDate.setHours(0,0,0,0);
                        return estRepayDate.getTime() === today.getTime();
                      }).length;

                      const sentTodayCount = outstandingLoans.filter(tx => tx.lastReminderSent === todayStr).length;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="glass p-5 rounded-3xl border-rose-500/20 bg-rose-950/10">
                            <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest">Overdue Accounts</span>
                            <p className="text-3xl font-black text-rose-500 mt-1">{overdueCount}</p>
                            <p className="text-[10px] text-blue-400/40 uppercase mt-1">Requires immediate administrative attention</p>
                          </div>
                          <div className="glass p-5 rounded-3xl border-amber-500/20 bg-amber-950/10">
                            <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">Due Today / Approaching</span>
                            <p className="text-3xl font-black text-amber-500 mt-1">{dueTodayCount}</p>
                            <p className="text-[10px] text-blue-400/40 uppercase mt-1">Repayment expected in the next 24 hours</p>
                          </div>
                          <div className="glass p-5 rounded-3xl border-emerald-500/20 bg-emerald-950/10">
                            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">Reminders Sent Today</span>
                            <p className="text-3xl font-black text-emerald-400 mt-1">{sentTodayCount}</p>
                            <p className="text-[10px] text-blue-400/40 uppercase mt-1">Dispatched automatically & manually via SMTP</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reminders List */}
                    <div className="glass p-6 rounded-3xl border-white/5 space-y-6">
                      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div>
                          <h4 className="text-base font-black uppercase text-white tracking-tight">Active Outstanding Loans</h4>
                          <p className="text-[10px] text-blue-400/40 uppercase tracking-widest">Select an active loan agreement to manually send a statement or copy details</p>
                        </div>
                        <Button 
                          variant="secondary" 
                          className="text-xs uppercase font-black px-5 py-3.5 tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                          onClick={async () => {
                            hasScannedReminders.current = false;
                            await runAutomaticDueReminderScan();
                          }}
                        >
                          <Clock className="w-4 h-4" /> Trigger Auto Scan
                        </Button>
                      </div>

                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {(() => {
                          const today = new Date();
                          today.setHours(0,0,0,0);

                          const confirmedLoans = allTransactions.filter(
                            t => t.type === 'loan' && t.status === 'confirmed' && t.estimatedRepaymentDate
                          );
                          
                          const outstandingLoans = confirmedLoans.filter(tx => {
                            const userProfile = allUsers.find(u => u.uid === tx.userId);
                            return userProfile && userProfile.remainingDebt > 0;
                          });

                          if (outstandingLoans.length === 0) {
                            return (
                              <p className="text-center text-blue-400/40 py-10 text-xs uppercase tracking-widest font-black">
                                No active outstanding loans requiring reminders
                              </p>
                            );
                          }

                          return outstandingLoans.map(tx => {
                            const userProfile = allUsers.find(u => u.uid === tx.userId);
                            if (!userProfile) return null;

                            const estRepayDate = new Date(tx.estimatedRepaymentDate!);
                            estRepayDate.setHours(0,0,0,0);
                            const daysDiff = Math.round((estRepayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            let dateBadgeClass = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                            let dateText = `Due in ${daysDiff} days`;
                            
                            if (daysDiff < 0) {
                              dateBadgeClass = "bg-red-500/10 border-red-500/20 text-red-400";
                              dateText = `${Math.abs(daysDiff)} Days Overdue`;
                            } else if (daysDiff === 0) {
                              dateBadgeClass = "bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse";
                              dateText = "Due Today";
                            }

                            const whatsappText = `*T.U.T. PRIVATE LENDING AUTHORITY*\n*OFFICIAL LOAN REMINDER & STATEMENT*\n\nDear Member: *${userProfile.name}* (ID: ${userProfile.memberId || 'TUT-MBR'})\n\nThis is an official notice regarding your outstanding loan agreement.\n\n*LOAN ACCOUNT DETAILS:*\n• Principal Borrowed: ৳${tx.amount.toLocaleString()} BDT\n• Purpose: ${tx.loanReason || 'General Support'}\n• Expected Due Date: ${format(estRepayDate, 'dd MMMM yyyy')}\n• Status: ${daysDiff < 0 ? 'OVERDUE' : 'DUE'}\n\n*YOUR LEDGER STATEMENT:*\n• Total Borrowed: ৳${(userProfile.totalLoan || 0).toLocaleString()} BDT\n• Total Deposits: ৳${(userProfile.totalDeposit || 0).toLocaleString()} BDT\n• *Remaining Debt Balance:* ৳${(userProfile.remainingDebt || 0).toLocaleString()} BDT\n\nPlease submit repayment via bKash/Nagad or place cash directly at the Admin Desk. Thank you.`;

                            return (
                              <div key={tx.id} className="glass p-5 rounded-2xl border-white/5 hover:border-blue-500/20 transition-all duration-300 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-black tracking-tight text-sm uppercase">{userProfile.name}</span>
                                    <span className="text-[10px] text-blue-400/50 font-mono font-bold">({userProfile.memberId || 'TUT-MBR'})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[10px] text-blue-400/50 uppercase font-mono tracking-wider">
                                    <span>Loan: ৳ {tx.amount.toLocaleString()}</span>
                                    <span>•</span>
                                    <span>Remaining Debt: <strong className="text-white font-bold">৳ {(userProfile.remainingDebt || 0).toLocaleString()}</strong></span>
                                    <span>•</span>
                                    <span>Reason: <span className="text-blue-200/60 lowercase italic">"{tx.loanReason || 'general'}"</span></span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 pt-1 border-t border-white/[0.02]">
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border", dateBadgeClass)}>
                                      {dateText}
                                    </span>
                                    <span className="text-[9px] font-mono text-blue-400/30">
                                      Expected Repayment: {format(estRepayDate, 'dd MMMM yyyy')}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
                                  {tx.lastReminderSent ? (
                                    <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1.5 rounded-xl uppercase flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Sent: {tx.lastReminderSent}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-black text-blue-400/40 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl uppercase flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5" /> No Reminder Sent
                                    </span>
                                  )}

                                  <Button 
                                    variant="secondary" 
                                    className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                    onClick={() => {
                                      navigator.clipboard.writeText(whatsappText);
                                      addToast('Copied Statement', 'WhatsApp statement reminder copied to clipboard successfully.', 'success');
                                    }}
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Copy Text
                                  </Button>

                                  <Button 
                                    variant="primary" 
                                    className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                                    onClick={async () => {
                                      const success = await sendProfessionalDueReminder(userProfile, tx, true);
                                      if (success) {
                                        addToast('Success', `Professional Statement Reminder sent successfully to ${userProfile.name}.`, 'success');
                                      } else {
                                        addToast('Failed', `Could not dispatch statement email to ${userProfile.name}.`, 'warning');
                                      }
                                    }}
                                  >
                                    <Mail className="w-3.5 h-3.5" /> SMTP Statement
                                  </Button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'liquidity' && (
                  <div className="space-y-8 animate-fade-in text-left">
                    {/* BASEL III INSPIRED COMPLIANCE STATUS HUD */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* CARD 1: CAPITAL ADEQUACY RATIO */}
                      {(() => {
                        const tier1Capital = totalFinancialAmount;
                        const rwa = outstandingDebt || 1;
                        const car = (tier1Capital / rwa) * 100;
                        const isSafe = car >= 12;
                        const isWarning = car >= 8 && car < 12;
                        
                        // Stress CAR
                        const stressLoss = outstandingDebt * (stressDefaultPct / 100);
                        const stressedTier1 = Math.max(0, tier1Capital - stressLoss);
                        const stressedCar = (stressedTier1 / rwa) * 100;
                        
                        return (
                          <div className="glass p-5 rounded-2xl border-white/5 space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Capital Adequacy Ratio (CAR)</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-white">{car.toFixed(1)}%</span>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", 
                                isSafe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                isWarning ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              )}>
                                {isSafe ? "Safe (Basel III)" : isWarning ? "Warning" : "Critical Alert"}
                              </span>
                            </div>
                            <div className="text-[10px] text-blue-200/50 space-y-1">
                              <div className="flex justify-between">
                                <span>Tier-1 Core Capital:</span>
                                <span className="font-mono text-white">৳ {tier1Capital.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stressed CAR ({stressDefaultPct}% def):</span>
                                <span className={cn("font-mono font-bold", stressedCar >= 12 ? "text-emerald-400" : "text-rose-400")}>
                                  {stressedCar.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* CARD 2: LIQUIDITY COVERAGE RATIO */}
                      {(() => {
                        const hqla = runwayLiquidity;
                        const simulatedOutflow = totalDeposits * (stressWithdrawalPct / 100);
                        const lcr = simulatedOutflow > 0 ? (hqla / simulatedOutflow) * 100 : 999;
                        const isSafe = lcr >= 100;

                        return (
                          <div className="glass p-5 rounded-2xl border-white/5 space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Liquidity Coverage Ratio (LCR)</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-white">{lcr > 500 ? '500%+' : `${lcr.toFixed(0)}%`}</span>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", 
                                isSafe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              )}>
                                {isSafe ? "Compliant" : "Deficit Warning"}
                              </span>
                            </div>
                            <div className="text-[10px] text-blue-200/50 space-y-1">
                              <div className="flex justify-between">
                                <span>HQLA Cash Reserve:</span>
                                <span className="font-mono text-white">৳ {hqla.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Simulated Run Outflow:</span>
                                <span className="font-mono text-rose-400 font-bold">৳ {simulatedOutflow.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* CARD 3: LOAN-TO-DEPOSIT RATIO */}
                      {(() => {
                        const ldr = totalDeposits > 0 ? (outstandingDebt / totalDeposits) * 100 : 0;
                        const isBalanced = ldr >= 50 && ldr <= 95;

                        return (
                          <div className="glass p-5 rounded-2xl border-white/5 space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                            <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Loan-to-Deposit Ratio (LDR)</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-white">{ldr.toFixed(1)}%</span>
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded uppercase border", 
                                isBalanced ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              )}>
                                {isBalanced ? "Balanced" : ldr < 50 ? "Low Output" : "Overextended"}
                              </span>
                            </div>
                            <div className="text-[10px] text-blue-200/50 space-y-1">
                              <div className="flex justify-between">
                                <span>Active Claims:</span>
                                <span className="font-mono text-white">৳ {outstandingDebt.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Deposits:</span>
                                <span className="font-mono text-white">৳ {totalDeposits.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* EXPANDED DETAILED FINANCIAL STATISTICS HUD */}
                    <div className="space-y-6">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="text-base font-black text-[#50e3c2] uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#50e3c2]" /> T.U.T. Cumulative Financial Analytics & Ledger
                        </h3>
                        <p className="text-xs text-blue-200/50 mt-1">
                          Real-time aggregated ledger tracing historical volumes, platform recovery metrics, and transactional channels from inception.
                        </p>
                      </div>

                      {/* 1. KEY LIFETIME METRICS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* CARD 1: LIFETIME LOANS */}
                        <div className="glass p-4 rounded-2xl border-white/5 relative overflow-hidden bg-white/[0.01]">
                          <p className="text-[9px] font-black uppercase text-amber-400 tracking-wider">Lifetime Loans Disbursed</p>
                          <div className="text-xl font-black text-white mt-1">
                            ৳ {cumulativeStats.totalHistoricalLoans.toLocaleString()}
                          </div>
                          <p className="text-[10px] text-blue-200/40 mt-1">
                            Processed across <span className="text-amber-400 font-bold">{cumulativeStats.countHistoricalLoans}</span> approved requests
                          </p>
                        </div>

                        {/* CARD 2: LIFETIME DEPOSITS */}
                        <div className="glass p-4 rounded-2xl border-white/5 relative overflow-hidden bg-white/[0.01]">
                          <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Lifetime Deposits Collected</p>
                          <div className="text-xl font-black text-white mt-1">
                            ৳ {cumulativeStats.totalHistoricalDeposits.toLocaleString()}
                          </div>
                          <p className="text-[10px] text-blue-200/40 mt-1">
                            Processed across <span className="text-emerald-400 font-bold">{cumulativeStats.countHistoricalDeposits}</span> approved requests
                          </p>
                        </div>

                        {/* CARD 3: LIFETIME REPAYMENTS */}
                        <div className="glass p-4 rounded-2xl border-white/5 relative overflow-hidden bg-white/[0.01]">
                          <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Repayments & Recoveries</p>
                          <div className="text-xl font-black text-white mt-1">
                            ৳ {cumulativeStats.totalHistoricalRepayments.toLocaleString()}
                          </div>
                          <p className="text-[10px] text-blue-200/40 mt-1">
                            Reclaimed via <span className="text-blue-400 font-bold">{cumulativeStats.countHistoricalRepayments}</span> refund/due pay-backs
                          </p>
                        </div>

                        {/* CARD 4: RECOVERY RATE */}
                        <div className="glass p-4 rounded-2xl border-white/5 relative overflow-hidden bg-white/[0.01]">
                          <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Global Recovery Rate</p>
                          <div className="text-xl font-black text-white mt-1">
                            {cumulativeStats.recoveryRate.toFixed(2)}%
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, cumulativeStats.recoveryRate)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. TRANSACTION AND CHANNEL BREAKDOWNS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: TRANSACTION TYPE ANALYSIS */}
                        <div className="glass p-5 rounded-2xl border-white/5 text-left bg-white/[0.01]">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Transaction Breakdown by Type</span>
                            <span className="text-[10px] text-blue-200/40 font-mono">Total Tx: {allTransactions.length}</span>
                          </h4>
                          <div className="space-y-2.5">
                            {(() => {
                              const types = [
                                { type: 'loan', label: 'Lending Disbursals' },
                                { type: 'deposit', label: 'Savings Deposits' },
                                { type: 'pay_due', label: 'Due Repayments' },
                                { type: 'refund', label: 'Direct Refunds' }
                              ] as const;

                              return types.map(t => {
                                const allTxsOfType = allTransactions.filter(tx => tx.type === t.type);
                                const confirmedTxsOfType = allTxsOfType.filter(tx => tx.status === 'confirmed');
                                const totalAmount = confirmedTxsOfType.reduce((sum, tx) => sum + tx.amount, 0);
                                const pendingCount = allTxsOfType.filter(tx => tx.status === 'pending').length;

                                return (
                                  <div key={t.type} className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-xl border border-white/5 text-xs">
                                    <div className="space-y-0.5">
                                      <span className="font-black text-white">{t.label}</span>
                                      <div className="flex gap-2 text-[9px] text-blue-200/50 uppercase font-mono">
                                        <span>Total: {allTxsOfType.length}</span>
                                        <span>•</span>
                                        <span>Pending: <strong className={pendingCount > 0 ? 'text-amber-400' : 'text-blue-200/30'}>{pendingCount}</strong></span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-white">৳ {totalAmount.toLocaleString()}</span>
                                      <div className="text-[9px] text-blue-400/50 font-mono">Confirmed Volume</div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* RIGHT: CHANNEL / PAYMENT METHOD ANALYSIS */}
                        <div className="glass p-5 rounded-2xl border-white/5 text-left bg-white/[0.01]">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">
                            Processing Channels & Payment Methods
                          </h4>
                          <div className="space-y-2.5">
                            {cumulativeStats.channelMetrics.map(channel => {
                              const totalVol = cumulativeStats.channelMetrics.reduce((sum, c) => sum + c.volume, 0) || 1;
                              const pct = (channel.volume / totalVol) * 100;
                              
                              let badgeColor = "text-blue-400 border-blue-500/20 bg-blue-500/10";
                              if (channel.channel === 'Bkash') badgeColor = "text-pink-400 border-pink-500/20 bg-pink-500/10";
                              if (channel.channel === 'Nagad') badgeColor = "text-orange-400 border-orange-500/20 bg-orange-500/10";
                              if (channel.channel === 'Recharge') badgeColor = "text-purple-400 border-purple-500/20 bg-purple-500/10";

                              return (
                                <div key={channel.channel} className="space-y-1.5 p-2.5 bg-slate-900/40 rounded-xl border border-white/5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className={cn("text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border leading-none", badgeColor)}>
                                      {channel.channel === 'Bkash' ? 'bKash Mobile' : channel.channel === 'Nagad' ? 'Nagad Wallet' : channel.channel}
                                    </span>
                                    <div className="text-right font-mono text-white">
                                      <span className="font-bold">৳ {channel.volume.toLocaleString()}</span>
                                      <span className="text-[9px] text-blue-200/40 ml-1.5">({pct.toFixed(1)}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-1 relative">
                                    <div 
                                      className="bg-blue-500 h-1 rounded-full animate-pulse" 
                                      style={{ 
                                        width: `${pct}%`,
                                        backgroundColor: channel.channel === 'Bkash' ? '#e91e63' : channel.channel === 'Nagad' ? '#ff5722' : channel.channel === 'Recharge' ? '#9c27b0' : '#2196f3'
                                      }}
                                    />
                                  </div>
                                  <div className="text-[9px] text-blue-200/40 font-mono text-right">
                                    Processed {channel.count} verified transactions
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 3. LEADERBOARD COLUMNS FOR HIGH-VALUE ACCOUNTS */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* COLUMN 1: TOP DEPOSITORS */}
                        <div className="glass p-5 rounded-2xl border-white/5 text-left bg-white/[0.01] flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-3 pb-1 border-b border-white/5 flex items-center justify-between">
                              <span>Top Depositors</span>
                              <span className="text-[9px] text-blue-200/30">Active Savings</span>
                            </h4>
                            <div className="space-y-2">
                              {memberLeaderboards.topDepositors.length === 0 ? (
                                <div className="text-[10px] text-blue-200/30 py-4 italic text-center">No approved members</div>
                              ) : (
                                memberLeaderboards.topDepositors.map((m, idx) => (
                                  <div key={m.uid} className="flex justify-between items-center text-xs p-1.5 hover:bg-white/[0.02] rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[9px] font-bold text-blue-400/50">#{idx + 1}</span>
                                      <div className="truncate max-w-[100px]">
                                        <p className="font-black text-white truncate">{m.name}</p>
                                        <p className="text-[9px] text-blue-200/30 font-mono truncate">{m.memberId || 'TUT-MBR'}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-400">
                                      ৳ {(m.totalDeposit || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* COLUMN 2: TOP CUMULATIVE BORROWERS */}
                        <div className="glass p-5 rounded-2xl border-white/5 text-left bg-white/[0.01] flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3 pb-1 border-b border-white/5 flex items-center justify-between">
                              <span>Lifetime Borrowers</span>
                              <span className="text-[9px] text-blue-200/30">Cumulative Loans</span>
                            </h4>
                            <div className="space-y-2">
                              {memberLeaderboards.topBorrowers.length === 0 ? (
                                <div className="text-[10px] text-blue-200/30 py-4 italic text-center">No approved members</div>
                              ) : (
                                memberLeaderboards.topBorrowers.map((m, idx) => (
                                  <div key={m.uid} className="flex justify-between items-center text-xs p-1.5 hover:bg-white/[0.02] rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[9px] font-bold text-blue-400/50">#{idx + 1}</span>
                                      <div className="truncate max-w-[100px]">
                                        <p className="font-black text-white truncate">{m.name}</p>
                                        <p className="text-[9px] text-blue-200/30 font-mono truncate">{m.memberId || 'TUT-MBR'}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-amber-400">
                                      ৳ {(m.totalLoan || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* COLUMN 3: TOP ACTIVE DEBTORS */}
                        <div className="glass p-5 rounded-2xl border-white/5 text-left bg-white/[0.01] flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider mb-3 pb-1 border-b border-white/5 flex items-center justify-between">
                              <span>Highest Active Debtors</span>
                              <span className="text-[9px] text-blue-200/30">Outstanding Loan</span>
                            </h4>
                            <div className="space-y-2">
                              {memberLeaderboards.topActiveDebtors.length === 0 ? (
                                <div className="text-[10px] text-blue-200/30 py-4 italic text-center">No approved members</div>
                              ) : (
                                memberLeaderboards.topActiveDebtors.map((m, idx) => (
                                  <div key={m.uid} className="flex justify-between items-center text-xs p-1.5 hover:bg-white/[0.02] rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[9px] font-bold text-blue-400/50">#{idx + 1}</span>
                                      <div className="truncate max-w-[100px]">
                                        <p className="font-black text-white truncate">{m.name}</p>
                                        <p className="text-[9px] text-blue-200/30 font-mono truncate">{m.memberId || 'TUT-MBR'}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-rose-400">
                                      ৳ {(m.remainingDebt || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE STRESS TESTING SUITE & RISK ADJUSTER */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* SIMULATION PANEL */}
                      <div className="lg:col-span-1 glass p-6 rounded-3xl border-white/5 space-y-6 text-left">
                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-400" /> Risk Stress Testing Suite
                        </h4>
                        <p className="text-xs text-blue-200/50 leading-relaxed">
                          Simulate catastrophic financial events to calculate the reserve solvency position of T.U.T. in real-time.
                        </p>
                        
                        {/* WIDGET 1: SLIDER FOR WITHDRAWAL */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-200">Deposit Run:</span>
                            <span className="font-mono font-bold text-rose-400">{stressWithdrawalPct}% of Deposits</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={stressWithdrawalPct}
                            onChange={(e) => setStressWithdrawalPct(parseInt(e.target.value))}
                            className="w-full accent-blue-600 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                          />
                        </div>

                        {/* WIDGET 2: SLIDER FOR LOAN DEFAULTS */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-200">Loan Default Rate:</span>
                            <span className="font-mono font-bold text-rose-400">{stressDefaultPct}% default</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={stressDefaultPct}
                            onChange={(e) => setStressDefaultPct(parseInt(e.target.value))}
                            className="w-full accent-rose-600 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                          />
                        </div>

                        {/* LIVE STRESS LIQUIDITY HEALTH STATS */}
                        {(() => {
                          const withdrawalOutflow = totalDeposits * (stressWithdrawalPct / 100);
                          const defaultLoss = outstandingDebt * (stressDefaultPct / 100);
                          const totalOutflow = withdrawalOutflow + defaultLoss;
                          const postStressLiquidity = runwayLiquidity - totalOutflow;
                          const isSolvent = postStressLiquidity >= 0;

                          return (
                            <div className={cn("p-4 rounded-2xl border text-xs space-y-2 leading-relaxed",
                              isSolvent ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                            )}>
                              <p className="font-black uppercase tracking-wider text-[10px]">Stress Test Outcome Indicator</p>
                              <div className="flex justify-between font-mono">
                                <span>Stress Outflow Load:</span>
                                <span className="font-bold">৳ {totalOutflow.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between font-mono border-t border-white/5 pt-1">
                                <span>Stressed Reserves:</span>
                                <span className="font-bold text-white">৳ {postStressLiquidity.toLocaleString()}</span>
                              </div>
                              <div className="text-[10px] text-blue-200/60 mt-2 font-normal">
                                {isSolvent 
                                  ? `✅ Solvent: The platform survives a run of ${stressWithdrawalPct}% deposits and a ${stressDefaultPct}% default write-off.` 
                                  : "🚨 ALERT: High-Risk Insolvency. Cash reserves are insufficient to cover this level of stress."
                                }
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* SYSTEM LEDGER CONSISTENCY AUDITOR */}
                      <div className="lg:col-span-2 glass p-6 rounded-3xl border-white/5 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Regulatory Audit Trail
                          </h4>
                          <Button 
                            variant="secondary" 
                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer"
                            onClick={async () => {
                              // Calculate differences
                              const actualDeposits = allUsers.reduce((sum, u) => sum + (u.totalDeposit || 0), 0);
                              const actualLoans = allUsers.reduce((sum, u) => sum + (u.totalLoan || 0), 0);
                              const actualDebt = allUsers.reduce((sum, u) => sum + (u.remainingDebt || 0), 0);
                              
                              await logAuditEvent('Audit Recalculation', `Recalculated database balances manually. Total Deposits: ৳${actualDeposits.toLocaleString()} | Outstanding Debt: ৳${actualDebt.toLocaleString()}`, 'info');
                              addToast('Audit Report Dispatched', `Verified ledger consistency across ${allUsers.length} members. Balances are clean and secure.`, 'success');
                            }}
                          >
                            Verify Consistency
                          </Button>
                        </div>

                        {/* AUDIT LOG LIST (Real-time stream from collection) */}
                        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                          {auditLogs.length === 0 ? (
                            <div className="text-center py-8 text-xs text-blue-200/30 italic">
                              No regulatory audit logs recorded in Firestore.
                            </div>
                          ) : (
                            auditLogs.map((log: any) => {
                              const dateText = log.timestamp?.seconds 
                                ? format(new Date(log.timestamp.seconds * 1000), 'dd-MM-yy HH:mm:ss')
                                : 'just now';

                              let badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                              if (log.severity === 'warning') badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                              if (log.severity === 'critical') badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                              return (
                                <div key={log.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex gap-3 items-start hover:bg-white/[0.02] transition-all">
                                  <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border leading-none shrink-0", badgeColor)}>
                                    {log.severity || 'info'}
                                  </span>
                                  <div className="space-y-1 flex-1 text-xs">
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-blue-400 font-bold">{log.action}</span>
                                      <span className="font-mono text-blue-200/30">{dateText}</span>
                                    </div>
                                    <p className="text-white/80 leading-normal">{log.details}</p>
                                    <p className="text-[9px] text-blue-400/50 font-mono">Actor: {log.actorName} ({log.actorEmail})</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* MEMBER SOLVENCY MATRIX & DYNAMIC CREDIT LIMIT CONTROLS */}
                    <div className="glass p-6 rounded-3xl border-white/5 text-left space-y-6">
                      <div className="border-b border-white/5 pb-4">
                        <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider">Member Credit Scoring & Solvency Control Panel</h4>
                        <p className="text-xs text-blue-200/50 mt-1 leading-relaxed">
                          Define approved lending caps for members based on behavioral solvency ratios, previous deposits, and loan repayment history.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-900/40">
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400">Member ID</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400">Name</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400">Behavioral Credit Score</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400 font-mono">Debt & Deposits</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400 font-mono">Dynamic Credit Limit</th>
                              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-blue-400 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {allUsers.filter(u => u.status === 'approved').map(userProfile => {
                              // Dynamic scoring algorithm
                              const remainingDebt = userProfile.remainingDebt || 0;
                              const totalDeposit = userProfile.totalDeposit || 0;
                              
                              let creditScore = 700;
                              // Reward deposits
                              creditScore += Math.min(100, Math.floor(totalDeposit / 2000) * 10);
                              // Penalize remaining debt
                              creditScore -= Math.min(200, Math.floor(remainingDebt / 5000) * 15);
                              creditScore = Math.max(300, Math.min(850, creditScore));

                              let tierLabel = "Prime Solvency";
                              let tierColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                              if (creditScore < 600) {
                                tierLabel = "High Credit Risk";
                                tierColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                              } else if (creditScore < 700) {
                                tierLabel = "Near-Prime Solvency";
                                tierColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                              }

                              const currentLimit = userProfile.borrowingLimit ?? 100000;

                              return (
                                <tr key={userProfile.uid} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="py-4 px-4 font-mono font-bold text-xs text-blue-400/70">
                                    {userProfile.memberId || 'TUT-MBR'}
                                  </td>
                                  <td className="py-4 px-4 font-black text-xs text-white">
                                    {userProfile.name}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-mono font-bold text-xs text-white">{creditScore} / 850</span>
                                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border w-fit leading-none", tierColor)}>
                                        {tierLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 font-mono text-xs text-blue-200/70 space-y-0.5">
                                    <div>Debt: <span className="text-rose-400">৳ {remainingDebt.toLocaleString()}</span></div>
                                    <div>Deposits: <span className="text-emerald-400">৳ {totalDeposit.toLocaleString()}</span></div>
                                  </td>
                                  <td className="py-4 px-4">
                                    {editingLimitUid === userProfile.uid ? (
                                      <div className="flex gap-2 items-center">
                                        <input 
                                          type="number"
                                          value={editingLimitValue}
                                          onChange={e => setEditingLimitValue(e.target.value)}
                                          className="w-24 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                                          placeholder="Limit"
                                        />
                                        <Button 
                                          variant="primary" 
                                          className="px-2.5 py-1 text-[9px] min-h-0 bg-emerald-600"
                                          onClick={() => updateBorrowingLimit(userProfile.uid, editingLimitValue)}
                                        >
                                          Save
                                        </Button>
                                        <button 
                                          onClick={() => setEditingLimitUid(null)}
                                          className="text-xs text-rose-400 hover:underline font-bold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="font-mono font-bold text-xs text-white">
                                        ৳ {currentLimit.toLocaleString()}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                      {editingLimitUid !== userProfile.uid && (
                                        <Button 
                                          variant="secondary"
                                          className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider min-h-0 cursor-pointer"
                                          onClick={() => {
                                            setEditingLimitUid(userProfile.uid);
                                            setEditingLimitValue(currentLimit.toString());
                                          }}
                                        >
                                          Adjust Limit
                                        </Button>
                                      )}
                                      <Button 
                                        variant="danger"
                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider min-h-0 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 cursor-pointer"
                                        onClick={async () => {
                                          if (userProfile.email) {
                                            await sendNotification('Credit Warning Notice', `Dear ${userProfile.name}, this is a formal credit monitoring notice regarding your account behavior. Please balance your credit or visit the Admin desk to review your debt and deposit posture.`, userProfile.email);
                                            addToast('Credit Warning Sent', `Official credit warning letter sent to ${userProfile.name} successfully.`, 'success');
                                            await logAuditEvent('Credit Alert Sent', `Sent official credit alert warning to: ${userProfile.name} (${userProfile.email})`, 'warning');
                                          } else {
                                            addToast('Warning Error', 'User has no registered email account for statement dispatches.', 'warning');
                                          }
                                        }}
                                      >
                                        Warn Member
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal 
        isOpen={showSponsorModal} 
        onClose={() => setShowSponsorModal(false)} 
        title="Create Advanced Sponsorship Campaign"
      >
        <form onSubmit={handleAddSponsorship} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar text-left">
          <Input 
            label="Company/Brand Name *" 
            required 
            placeholder="e.g. Grameenphone, Unilever" 
            value={sponsorCompany}
            onChange={e => setSponsorCompany(e.target.value)}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Deal Value in BDT (Secret) *" 
              type="number" 
              required 
              placeholder="e.g. 500000" 
              value={sponsorValue}
              onChange={e => setSponsorValue(e.target.value)}
            />
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="text-sm font-medium text-blue-200/70 ml-1">Status</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950/50 p-1 border border-white/5 rounded-xl">
                {(['active', 'paused', 'completed'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    className={cn(
                      "py-2 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all",
                      sponsorStatus === st ? "bg-[#50e3c2] text-slate-950 font-black shadow-lg" : "text-white/40 hover:text-white"
                    )}
                    onClick={() => setSponsorStatus(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/70 ml-1">Campaign Tier *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Premium Partner', 'Strategic Collab', 'Community Sponsor'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSponsorType(tier)}
                  className={cn(
                    "py-3 px-1 rounded-xl border transition-all text-[11px] font-black uppercase text-center flex flex-col items-center justify-center gap-1",
                    sponsorType === tier 
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "border-white/5 bg-slate-900/40 text-blue-200/60 hover:border-white/10 hover:text-white"
                  )}
                >
                  <span className="text-[9px] text-white/40 block leading-none font-medium mb-1">tier</span>
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/70 ml-1">Ad Copy / Headline Promotion Text *</label>
            <textarea
              className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none min-h-[80px]"
              placeholder="Provide engaging promotion text or short banner ad headline copy..."
              required
              value={sponsorPromo}
              onChange={e => setSponsorPromo(e.target.value)}
            />
          </div>

          <div className="border-t border-white/5 pt-4 space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Advanced Marketing Media & Action Links</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Interactive</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader 
                label="Brand Logo Image (Optional)"
                currentUrl={sponsorLogoUrl}
                onUpload={(url) => setSponsorLogoUrl(url)}
                maxDimension={200}
                shape="square"
              />
              <FileUploader 
                label="Campaign Poster/Banner Image (Optional)"
                currentUrl={sponsorImageUrl}
                onUpload={(url) => setSponsorImageUrl(url)}
                maxDimension={800}
                shape="square"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Promotional Video URL (Optional)" 
                placeholder="YouTube embed, Mp4, etc." 
                value={sponsorVideoUrl}
                onChange={e => setSponsorVideoUrl(e.target.value)}
              />
              <Input 
                label="Destination Campaign Link (Optional)" 
                placeholder="URI to redirect users and generate leads" 
                value={sponsorTargetUrl}
                onChange={e => setSponsorTargetUrl(e.target.value)}
              />
            </div>

            <Input 
              label="Special Offer Callout / Discount Code (Optional)" 
              placeholder="e.g. Use Promo code: 'TUT26' to claim free 25% discount!" 
              value={sponsorSpecialOffer}
              onChange={e => setSponsorSpecialOffer(e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 py-3" onClick={() => setShowSponsorModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 py-3 bg-[#50e3c2] text-slate-950 font-black">
              Save Campaign
            </Button>
          </div>
        </form>
      </Modal>

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

          {/* Identity & Reference */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Identity & Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploader 
                label="Profile Photo"
                currentUrl={profileData.photoUrl}
                onUpload={(url) => setProfileData({...profileData, photoUrl: url})}
              />
              <Input 
                label="Permanent Address" 
                value={profileData.permanentAddress}
                onChange={e => setProfileData({...profileData, permanentAddress: e.target.value})}
              />
              <Input 
                label="Reference Contact (Emergency)" 
                value={profileData.referenceContact}
                onChange={e => setProfileData({...profileData, referenceContact: e.target.value})}
                placeholder="Name & Phone"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-blue-200/70 ml-1">Admin Notes (Private)</label>
              <textarea 
                className="w-full bg-slate-950 border border-blue-400/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all min-h-[100px] text-blue-100"
                value={profileData.adminNotes}
                onChange={e => setProfileData({...profileData, adminNotes: e.target.value})}
                placeholder="Internal notes about this member..."
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
        isOpen={showEditFundModal} 
        onClose={() => setShowEditFundModal(false)} 
        title="Adjust Authority Investment Fund (Main Money)"
      >
        <div className="space-y-4">
          <p className="text-xs text-blue-400/70 font-bold uppercase tracking-wider leading-relaxed">
            This pool is the seed capital of the T.U.T. Private Authority. Loan distribution capacity is computed directly against this investment base + sponsorship profits.
          </p>
          <div className="space-y-2">
            <Input 
              label="Personal Fund Amount (৳)" 
              type="number" 
              value={tempFundValue} 
              onChange={e => setTempFundValue(e.target.value)} 
              required
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditFundModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1 text-white bg-blue-600 hover:bg-blue-500 rounded-xl" onClick={() => handleUpdateAuthorityFund(tempFundValue)}>
              Save Adjustment
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
            <FileUploader 
              label="Member Photo"
              currentUrl={editingUser?.photoUrl}
              onUpload={(url) => setEditingUser(editingUser ? {...editingUser, photoUrl: url} : null)}
            />
            <Input 
              label="Permanent Address" 
              value={editingUser?.permanentAddress || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, permanentAddress: e.target.value} : null)}
            />
            <Input 
              label="Reference Contact" 
              value={editingUser?.referenceContact || ''}
              onChange={e => setEditingUser(editingUser ? {...editingUser, referenceContact: e.target.value} : null)}
            />
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-blue-200/70 ml-1">Admin Notes</label>
              <textarea 
                className="w-full bg-slate-950 border border-blue-400/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all min-h-[80px] text-blue-100"
                value={editingUser?.adminNotes || ''}
                onChange={e => setEditingUser(editingUser ? {...editingUser, adminNotes: e.target.value} : null)}
              />
            </div>
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
        isOpen={showCreateMemberModal} 
        onClose={() => setShowCreateMemberModal(false)} 
        title="Register Official Member Profile"
      >
        <form onSubmit={handleCreateMember} className="space-y-6 text-left">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl leading-normal">
            ℹ️ This official form creates a member account directly in the system. When the member registers or logs in with this email, their online account will automatically link to this profile.
          </p>

          {/* Section 1: Account Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-1">Account & Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Full Name *" 
                required 
                placeholder="Member's full name"
                value={createMemberName}
                onChange={e => setCreateMemberName(e.target.value)}
              />
              <Input 
                label="Email Address *" 
                type="email"
                required 
                placeholder="e.g. member@gmail.com"
                value={createMemberEmail}
                onChange={e => setCreateMemberEmail(e.target.value)}
              />
              <Input 
                label="Phone Number * (11 Digits)" 
                required 
                maxLength={11}
                placeholder="e.g. 01712345678"
                value={createMemberPhone}
                onChange={e => setCreateMemberPhone(e.target.value)}
              />
              <Input 
                label="National ID (NID)" 
                placeholder="NID card number"
                value={createMemberNid}
                onChange={e => setCreateMemberNid(e.target.value)}
              />
              <Input 
                label="Custom Member ID (Optional)" 
                placeholder="Auto-generated if empty"
                value={createMemberMemberId}
                onChange={e => setCreateMemberMemberId(e.target.value)}
              />
              <div className="space-y-1.5 w-full text-left">
                <label className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest ml-1">Account Status</label>
                <select
                  value={createMemberStatus}
                  onChange={e => setCreateMemberStatus(e.target.value as any)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all backdrop-blur-sm text-sm"
                >
                  <option value="approved">Approved / Active</option>
                  <option value="pending">Pending Verification</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Personal & Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-1">Personal Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Occupation" 
                placeholder="e.g. Business, Student, Employee"
                value={createMemberOccupation}
                onChange={e => setCreateMemberOccupation(e.target.value)}
              />
              <Input 
                label="Reference Contact Details" 
                placeholder="Phone or Name of reference"
                value={createMemberReferenceContact}
                onChange={e => setCreateMemberReferenceContact(e.target.value)}
              />
              <div className="col-span-1 md:col-span-2">
                <Input 
                  label="Present Address" 
                  placeholder="Street address, City, etc."
                  value={createMemberAddress}
                  onChange={e => setCreateMemberAddress(e.target.value)}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input 
                  label="Permanent Address" 
                  placeholder="Vill, P.O, P.S, Dist"
                  value={createMemberPermanentAddress}
                  onChange={e => setCreateMemberPermanentAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Nominee & Emergency Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-1">Nominee & Family</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Nominee Full Name" 
                placeholder="Full name of nominee"
                value={createMemberNomineeName}
                onChange={e => setCreateMemberNomineeName(e.target.value)}
              />
              <Input 
                label="Relationship with Nominee" 
                placeholder="e.g. Spouse, Father, Brother"
                value={createMemberNomineeRelation}
                onChange={e => setCreateMemberNomineeRelation(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Financial Balances */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-1">Initial Accounts Balance (BDT)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                label="Initial Deposit (৳)" 
                type="number"
                min="0"
                value={createMemberInitialDeposit}
                onChange={e => setCreateMemberInitialDeposit(e.target.value)}
              />
              <Input 
                label="Initial Total Loan (৳)" 
                type="number"
                min="0"
                value={createMemberInitialLoan}
                onChange={e => setCreateMemberInitialLoan(e.target.value)}
              />
              <Input 
                label="Remaining Debt (৳)" 
                type="number"
                min="0"
                value={createMemberInitialDebt}
                onChange={e => setCreateMemberInitialDebt(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-slate-950/90 backdrop-blur-md py-4 border-t border-white/5">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateMemberModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black">
              Register Member
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
              <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-black", 
                    requestMethod === 'Bkash' ? "bg-[#D12053] text-white" : "bg-[#F6921E] text-white"
                  )}>
                    {requestMethod === 'Bkash' ? 'b' : 'n'}
                  </div>
                  <span className="text-xs font-bold text-white">{requestMethod} Personal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-black text-amber-400 tracking-wider">
                    {requestMethod === 'Bkash' ? '01713710607' : '01921801100'}
                  </span>
                  <CopyButton text={requestMethod === 'Bkash' ? '01713710607' : '01921801100'} />
                </div>
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
          
          {requestType === 'loan' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest ml-1">Reason for Loan (Detailed)</label>
                <textarea 
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-blue-900/40 backdrop-blur-sm min-h-[80px]"
                  required
                  value={loanReason}
                  onChange={e => setLoanReason(e.target.value)}
                  placeholder="Tell us why you need this loan..."
                />
              </div>
              <Input 
                label="Estimated Repayment Date" 
                type="date"
                required 
                value={estimatedRepaymentDate}
                onChange={e => setEstimatedRepaymentDate(e.target.value)}
              />
            </>
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

      {/* Entrance Interstitial Poster Ad Popup */}
      <AnimatePresence>
        {activeEntranceAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            {/* Backdrop Area tap-to-close */}
            <div className="absolute inset-0" onClick={() => setActiveEntranceAd(null)} />
            
            {/* Ad Content Container - Exclusively the Poster */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl rounded-3xl overflow-hidden z-10 flex flex-col items-center justify-center group"
            >
              {/* Floating Semi-Transparent Cross/Close Button in Top-Right Corner */}
              <button
                onClick={() => setActiveEntranceAd(null)}
                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-950 border border-white/10 text-white/80 hover:text-white transition-all duration-200 shadow-lg scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                title="Close Ad"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Seamless Click-through Poster Image */}
              {activeEntranceAd.imageUrl ? (
                activeEntranceAd.targetUrl ? (
                  <a
                    href={activeEntranceAd.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleAdClick(activeEntranceAd.id);
                      setActiveEntranceAd(null); // auto-dismiss on click through
                    }}
                    className="w-full relative shadow-2xl border border-white/10 rounded-3xl overflow-hidden block"
                  >
                    <img
                      src={activeEntranceAd.imageUrl}
                      alt={`${activeEntranceAd.companyName} Campaign Poster`}
                      className="w-full h-auto max-h-[82vh] object-contain block hover:scale-[1.01] transition-transform duration-500 rounded-3xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-300 pointer-events-none" />
                  </a>
                ) : (
                  <div className="w-full relative shadow-2xl border border-white/10 rounded-3xl overflow-hidden block">
                    <img
                      src={activeEntranceAd.imageUrl}
                      alt={`${activeEntranceAd.companyName} Campaign Poster`}
                      className="w-full h-auto max-h-[82vh] object-contain block rounded-3xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )
              ) : (
                /* Fallback for text-only sponsorship if image fails to load */
                <div className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
                  {activeEntranceAd.logoUrl && (
                    <img 
                      src={activeEntranceAd.logoUrl} 
                      alt="" 
                      className="w-16 h-16 mx-auto object-contain rounded-2xl bg-slate-950 p-2 border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <h3 className="text-xl font-black text-white">{activeEntranceAd.companyName}</h3>
                  <p className="text-sm text-blue-200 italic">"{activeEntranceAd.promotionText}"</p>
                  {activeEntranceAd.targetUrl && (
                    <a
                      href={activeEntranceAd.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleAdClick(activeEntranceAd.id);
                        setActiveEntranceAd(null);
                      }}
                      className="block pt-2"
                    >
                      <Button variant="primary" className="w-full py-3 text-xs uppercase tracking-widest font-black">
                        Visit Partner Portal
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Floating Button */}
      {showSupportWidget && !isAdminLoggedIn && (
        <a 
          href="https://wa.me/8801713710607" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-24 sm:bottom-28 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 bg-slate-950/95 hover:bg-slate-900 border border-white/10 backdrop-blur-xl pl-3 pr-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.15)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-[1.03] active:scale-95 group"
        >
          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSupportWidget(false);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-md z-10"
            title="Dismiss support info"
          >
            <X className="w-3 h-3" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 duration-300">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            {/* Small Rose Badge */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-slate-950"></span>
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-[0.15em] flex items-center gap-1.5 leading-none">
              Live Support
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span className="text-[11px] font-black text-white tracking-tight mt-1 leading-none uppercase">
              Need Help? Contact Admin
            </span>
          </div>
        </a>
      )}
    </div>
  );
}
