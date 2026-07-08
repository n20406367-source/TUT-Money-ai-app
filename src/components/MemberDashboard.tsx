import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Shield, 
  Tag, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History as HistoryIcon, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Lock, 
  Play, 
  ExternalLink,
  Copy,
  X,
  Menu,
  Activity,
  FileText,
  Briefcase,
  Home,
  TrendingUp,
  Award,
  HelpCircle,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download,
  Check,
  Database,
  Cpu,
  Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  cn, 
  Button, 
  Card, 
  DigitalMemo, 
  getSubscriptionPricing, 
  SubscriptionBadge, 
  UserProfile,
  Transaction,
  SponsorshipCampaign,
  Modal
} from '../App';
import { db, auth } from '../firebase';
import tutLogo from '../assets/images/tut_logo_1783437312744.jpg';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  GoogleAuthProvider, 
  reauthenticateWithPopup 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';

// CopyButton component
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(`Payment info: ${text}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 cursor-pointer",
        copied
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-white/5 text-blue-400 border-white/10 hover:bg-white/10 hover:border-white/25"
      )}
      title="Copy to Clipboard"
    >
      <Copy className="w-3 h-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

// Circular Quick Operation Button
const QuickActionCircle = ({ icon: Icon, label, onClick, variant = 'blue' }: { icon: any, label: string, onClick: () => void, variant?: 'blue' | 'indigo' | 'rose' | 'amber' }) => {
  const variants = {
    blue: 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20',
    indigo: 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/20',
    rose: 'bg-rose-600/10 text-rose-400 border-rose-500/20 hover:bg-rose-600/20',
    amber: 'bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600/20'
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-95"
    >
      <div className={cn(
        "w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-105",
        variants[variant]
      )}>
        <Icon className="w-6 h-6 transition-transform group-hover:scale-110" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300/80 group-hover:text-white transition-colors text-center truncate w-20">{label}</span>
    </button>
  );
};

// Spending statistics area chart using Recharts
const SpendChart = ({ transactions, profile }: { transactions: Transaction[]; profile: UserProfile }) => {
  const confirmedTx = [...transactions]
    .filter(t => t.status === 'confirmed')
    .sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeA - timeB;
    });

  // Construct nice chronological points based entirely on actual user data
  let chartData: any[] = [];

  // Start with a Base Period
  chartData.push({
    name: 'Cycle Start',
    Savings: 0,
    Lending: 0
  });

  if (confirmedTx.length > 0) {
    let cumulativeSavings = 0;
    let cumulativeLending = 0;
    confirmedTx.forEach((tx, idx) => {
      if (tx.type === 'deposit' || tx.type === 'refund') {
        cumulativeSavings += tx.amount;
      } else if (tx.type === 'loan' || tx.type === 'pay_due') {
        cumulativeLending += tx.amount;
      } else if (tx.type === 'subscription') {
        cumulativeSavings = Math.max(0, cumulativeSavings - tx.amount);
      }
      
      const label = tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMM') : `Tx ${idx + 1}`;
      chartData.push({
        name: label,
        Savings: cumulativeSavings,
        Lending: cumulativeLending,
        amount: tx.amount,
        type: tx.type
      });
    });

    // Make sure we end precisely on the user's current live total savings/loans from profile
    if (cumulativeSavings !== profile.totalDeposit || cumulativeLending !== profile.totalLoan) {
      chartData.push({
        name: 'Live Balance',
        Savings: profile.totalDeposit,
        Lending: profile.totalLoan
      });
    }
  } else {
    // No confirmed transactions, plot the actual live profile numbers directly
    if (profile.totalDeposit > 0 || profile.totalLoan > 0) {
      chartData.push({
        name: 'Live Balance',
        Savings: profile.totalDeposit,
        Lending: profile.totalLoan
      });
    } else {
      chartData.push({
        name: 'Ledger Standby',
        Savings: 0,
        Lending: 0
      });
    }
  }

  return (
    <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl text-left space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Lending & Saving Analytics
          </h4>
          <p className="text-[9px] text-blue-400/50 uppercase tracking-widest mt-0.5">
            Active Verified Ledger Flow
          </p>
        </div>
        <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
          <Fingerprint className="w-3 h-3 text-emerald-400 animate-pulse" />
          LIVE SECURE SYNC
        </span>
      </div>

      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorLending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={8} 
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={8} 
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `৳${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 shadow-2xl space-y-1.5 backdrop-blur-md">
                      <p className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">{payload[0].payload.name}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Savings: ৳ {Number(payload[0].value).toLocaleString()}
                        </p>
                        <p className="text-xs font-bold text-blue-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Lending: ৳ {Number(payload[1]?.value || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="Savings" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorSavings)" 
            />
            <Area 
              type="monotone" 
              dataKey="Lending" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorLending)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 border border-emerald-500" />
            <span>Savings Flow (৳ {profile.totalDeposit.toLocaleString()})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/20 border border-blue-500" />
            <span>Lending Flow (৳ {profile.totalLoan.toLocaleString()})</span>
          </div>
        </div>
        <span className="text-emerald-400 font-bold uppercase tracking-widest text-[8px] animate-pulse">
          AUDITED STATUS: OK
        </span>
      </div>
    </div>
  );
};

// Custom QR Code simulated block for official documents
const CustomQRCode = ({ value }: { value: string }) => {
  return (
    <svg width="48" height="48" viewBox="0 0 16 16" className="text-slate-900 fill-current">
      <path d="M0 0h5v1H1v4H0zm11 0h5v5h-1V1h-4zm-11 11h1v4h4v1H0zm15 0v4h-4v1h5z" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="6" y="2" width="1" height="1" />
      <rect x="8" y="2" width="2" height="1" />
      <rect x="6" y="4" width="2" height="1" />
      <rect x="9" y="5" width="1" height="2" />
      <rect x="11" y="6" width="1" height="1" />
      <rect x="2" y="7" width="2" height="1" />
      <rect x="5" y="8" width="1" height="3" />
      <rect x="7" y="10" width="3" height="1" />
      <rect x="12" y="8" width="1" height="2" />
      <rect x="11" y="11" width="2" height="1" />
      <rect x="9" y="12" width="1" height="3" />
      <rect x="13" y="13" width="1" height="1" />
    </svg>
  );
};

// Circular progress indicator component for budgets/stats
const BudgetCircle = ({ percentage, label, amount, color = 'blue' }: { percentage: number, label: string, amount: string, color?: 'blue' | 'emerald' | 'amber' }) => {
  const strokeColorClass = {
    blue: 'stroke-blue-500',
    emerald: 'stroke-emerald-500',
    amber: 'stroke-amber-500'
  }[color];

  return (
    <div className="flex items-center gap-4 p-5 bg-slate-900/40 border border-white/5 rounded-3xl">
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="28" cy="28" r="24" className="stroke-slate-800 fill-none" strokeWidth="3" />
          <motion.circle 
            cx="28" cy="28" r="24" 
            className={cn("fill-none", strokeColorClass)} 
            strokeWidth="3" 
            strokeDasharray="150" 
            initial={{ strokeDashoffset: 150 }}
            animate={{ strokeDashoffset: 150 - (150 * percentage) / 100 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-mono font-black text-white">{percentage}%</span>
      </div>
      <div className="min-w-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">{label}</span>
        <h5 className="text-sm font-black text-white tracking-tight truncate mt-1">{amount}</h5>
      </div>
    </div>
  );
};

// Premium Virtual Luxury Card
const VirtualBankCard = ({ profile, mode, setMode }: { profile: UserProfile, mode: 'debit' | 'credit', setMode: (m: 'debit' | 'credit') => void }) => {
  const formatCardNumber = (memberId: string) => {
    const rawId = memberId.replace(/\D/g, ''); 
    const padded = (rawId + "8840127845689101").substring(0, 12);
    return `5432 1278 ${padded.substring(0, 4)} ${padded.substring(4, 8)}`;
  };

  return (
    <div className="space-y-5">
      {/* Selector Pill - Matches Image #2 Debit/Credit tab exactly */}
      <div className="flex justify-center">
        <div className="bg-slate-900/80 p-1.5 rounded-full border border-white/5 flex gap-1 shadow-inner relative">
          <button 
            type="button"
            onClick={() => setMode('debit')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer relative z-10",
              mode === 'debit' ? "text-white bg-blue-600 shadow-md shadow-blue-900/40" : "text-blue-400/60 hover:text-white"
            )}
          >
            Debit Card
          </button>
          <button 
            type="button"
            onClick={() => setMode('credit')}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer relative z-10",
              mode === 'credit' ? "text-white bg-indigo-600 shadow-md shadow-indigo-900/40" : "text-blue-400/60 hover:text-white"
            )}
          >
            Credit Card
          </button>
        </div>
      </div>

      {/* Luxury Animated Metallic Card Mockup */}
      <motion.div 
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "relative overflow-hidden rounded-[24px] p-6 text-white shadow-2xl transition-all duration-500 border border-white/10 group aspect-[1.586/1] w-full max-w-sm mx-auto flex flex-col justify-between",
          mode === 'debit' 
            ? "bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 shadow-blue-900/30" 
            : "bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 shadow-indigo-950/40"
        )}
      >
        {/* Holographic Mesh Glow & Vector Rings */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-44 h-44 bg-white/10 rounded-full blur-2xl group-hover:bg-white/15 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-44 h-44 bg-blue-400/10 rounded-full blur-2xl" />
        
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50 120 C 50 60, 150 180, 400 90" stroke="white" strokeWidth="2.5" fill="none" />
          <path d="M-50 150 C 70 80, 130 210, 400 120" stroke="white" strokeWidth="2" fill="none" />
        </svg>

        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Card Top Block */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-mono tracking-widest text-blue-200/70 uppercase font-black">
                T.U.T. PRIVATE RESERVE
              </p>
              <p className="text-[7px] font-mono tracking-[0.2em] text-amber-400 uppercase font-black mt-0.5">
                {mode === 'debit' ? "SAVINGS PLATINUM" : "SECURED CAPITAL"}
              </p>
            </div>
            
            {/* Wireless & Shield Emblem */}
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" strokeLinecap="round" />
                <path d="M16 4a19.3 19.3 0 0 1 3 8 19.3 19.3 0 0 1-3 8" strokeLinecap="round" />
                <path d="M8 8a9.3 9.3 0 0 1 1.5 4A9.3 9.3 0 0 1 8 16" strokeLinecap="round" />
              </svg>
              <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center border border-white/10 backdrop-blur-md">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* SIM Chip mockup */}
          <div className="self-start my-1">
            <div className="w-8 h-6 rounded-md bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 p-0.5 border border-amber-500/20 relative shadow-inner">
              <div className="absolute inset-x-2 inset-y-1.5 border-l border-r border-amber-600/30" />
              <div className="absolute inset-y-2 inset-x-1.5 border-t border-b border-amber-600/30" />
            </div>
          </div>

          {/* Core Balance Info */}
          <div className="text-left">
            <span className="text-[7.5px] font-black uppercase tracking-widest text-blue-200/50">
              {mode === 'debit' ? "Deposit & Savings" : "Outstanding Payable Debt"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-white/70">৳</span>
              <h2 className="text-2xl font-black tracking-tight font-mono leading-none">
                {mode === 'debit' ? profile.totalDeposit.toLocaleString() : profile.remainingDebt.toLocaleString()}
              </h2>
            </div>
            {mode === 'credit' && (
              <p className="text-[8px] font-black text-amber-400 uppercase tracking-wider mt-1">
                Limit: <span className="text-white">৳ {(profile.borrowingLimit ?? 100000).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Card Footer Block */}
          <div className="flex justify-between items-end mt-3 border-t border-white/5 pt-2.5">
            <div>
              <p className="text-[6.5px] font-black text-blue-200/40 uppercase tracking-widest leading-none mb-0.5">
                MEMBER ID
              </p>
              <p className="text-[10px] font-mono font-bold tracking-[0.1em] text-blue-100">
                {formatCardNumber(profile.memberId)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[6.5px] font-black text-blue-200/40 uppercase tracking-widest leading-none mb-0.5">
                CARDHOLDER
              </p>
              <p className="text-[9px] font-bold uppercase tracking-tight text-white truncate max-w-[120px]">
                {profile.name}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface MemberDashboardProps {
  profile: UserProfile;
  transactions: Transaction[];
  activeSponsorships: SponsorshipCampaign[];
  
  // State from App.tsx
  selectedSubTier: 'bronze' | 'silver' | 'gold';
  setSelectedSubTier: (tier: 'bronze' | 'silver' | 'gold') => void;
  subSenderMobile: string;
  setSubSenderMobile: (val: string) => void;
  subTrxId: string;
  setSubTrxId: (val: string) => void;
  subWallet: 'Bkash' | 'Nagad' | 'Recharge' | 'Cash';
  setSubWallet: (val: 'Bkash' | 'Nagad' | 'Recharge' | 'Cash') => void;
  showSubPaymentMode: boolean;
  setShowSubPaymentMode: (val: boolean) => void;
  
  // Callbacks
  handleBuySubscription: (e: React.FormEvent) => void;
  onRequestAction: (type: 'loan' | 'deposit' | 'refund' | 'pay_due' | 'transfer' | 'subscription') => void;
  setShowProfileModal: (show: boolean) => void;
  setShowAdminLogin: (show: boolean) => void;
  handleAdClick: (id: string) => void;
}

export function MemberDashboard({
  profile,
  transactions,
  activeSponsorships,
  selectedSubTier,
  setSelectedSubTier,
  subSenderMobile,
  setSubSenderMobile,
  subTrxId,
  setSubTrxId,
  subWallet,
  setSubWallet,
  showSubPaymentMode,
  setShowSubPaymentMode,
  handleBuySubscription,
  onRequestAction,
  setShowProfileModal,
  setShowAdminLogin,
  handleAdClick
}: MemberDashboardProps) {
  const [memberTab, setMemberTab] = useState<'dashboard' | 'memos' | 'subscription' | 'partners' | 'profile'>('dashboard');
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cardMode, setCardMode] = useState<'debit' | 'credit'>('debit');

  // Vaultspecific states
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'receipts' | 'loans' | 'deposits' | 'certificates' | 'subscriptions'>('all');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [showCert, setShowCert] = useState(false);

  // Transfer States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferIdentifier, setTransferIdentifier] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [showTransferPassword, setShowTransferPassword] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState<UserProfile | null>(null);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<any | null>(null);

  // New smart subscription checkout states
  const [subCheckoutMethod, setSubCheckoutMethod] = useState<'bkash' | 'nagad' | 'cash'>('bkash');

  const handleVerifyRecipient = async () => {
    if (!transferIdentifier.trim()) {
      setTransferError('Please enter a Member ID, Phone number, or Email.');
      return;
    }
    
    setVerifyLoading(true);
    setTransferError('');
    setVerifiedRecipient(null);

    try {
      const identifierClean = transferIdentifier.trim();
      const currentUserUid = auth.currentUser?.uid;

      if (!currentUserUid) {
        setTransferError('You must be logged in to transfer.');
        setVerifyLoading(false);
        return;
      }

      let foundUser: UserProfile | null = null;

      // 1. Check by Member ID (exact match)
      const qId = query(collection(db, 'users'), where('memberId', '==', identifierClean));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        foundUser = { uid: snapId.docs[0].id, ...snapId.docs[0].data() } as UserProfile;
      } else {
        // 2. Check by Phone
        const qPhone = query(collection(db, 'users'), where('phone', '==', identifierClean));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          foundUser = { uid: snapPhone.docs[0].id, ...snapPhone.docs[0].data() } as UserProfile;
        } else {
          // 3. Check by Email
          const qEmail = query(collection(db, 'users'), where('email', '==', identifierClean.toLowerCase()));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            foundUser = { uid: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as UserProfile;
          }
        }
      }

      if (!foundUser) {
        setTransferError('No T.U.T. account found with this identifier.');
      } else if (foundUser.uid === currentUserUid) {
        setTransferError('You cannot transfer money to your own account.');
      } else if (foundUser.status !== 'approved') {
        setTransferError('Recipient account is registered but not approved by the Authority.');
      } else {
        setVerifiedRecipient(foundUser);
      }
    } catch (err: any) {
      console.error('Error verifying recipient:', err);
      setTransferError('Failed to verify recipient. Try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const executeTransfer = async (amount: number) => {
    if (!verifiedRecipient || !auth.currentUser) return;
    const senderUid = auth.currentUser.uid;
    const recipientUid = verifiedRecipient.uid;

    // Update sender Total Deposit
    const senderRef = doc(db, 'users', senderUid);
    await updateDoc(senderRef, {
      totalDeposit: increment(-amount)
    });

    // Update recipient Total Deposit
    const recipientRef = doc(db, 'users', recipientUid);
    await updateDoc(recipientRef, {
      totalDeposit: increment(amount)
    });

    // Create official transaction records for both users
    const senderTxMemoId = `TUT-TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const recipientTxMemoId = `TUT-TX-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create outbound transfer transaction
    await addDoc(collection(db, 'transactions'), {
      userId: senderUid,
      userName: profile.name,
      type: 'refund', // internal type so the bookkeeping balances correctly (subtracts from deposit)
      isTransfer: true,
      transferType: 'out',
      transferRecipientName: verifiedRecipient.name,
      transferRecipientId: verifiedRecipient.memberId || 'Approved Member',
      amount: amount,
      method: 'Cash',
      status: 'confirmed',
      timestamp: serverTimestamp(),
      memoId: senderTxMemoId,
      accountNumber: verifiedRecipient.memberId || 'N/A'
    });

    // Create inbound transfer transaction
    await addDoc(collection(db, 'transactions'), {
      userId: recipientUid,
      userName: verifiedRecipient.name,
      type: 'deposit', // internal type so the bookkeeping balances correctly (adds to deposit)
      isTransfer: true,
      transferType: 'in',
      transferSenderName: profile.name,
      transferSenderId: profile.memberId || 'Approved Member',
      amount: amount,
      method: 'Cash',
      status: 'confirmed',
      timestamp: serverTimestamp(),
      memoId: recipientTxMemoId,
      accountNumber: profile.memberId || 'N/A'
    });

    // Record successful state
    setTransferSuccess({
      amount,
      recipientName: verifiedRecipient.name,
      recipientId: verifiedRecipient.memberId || 'Approved Member',
      memoId: senderTxMemoId,
      date: new Date()
    });
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecipient || !auth.currentUser) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }

    if (amount > profile.totalDeposit) {
      setTransferError(`Insufficient balance. Your current Total Deposit is ৳${profile.totalDeposit.toLocaleString()}`);
      return;
    }

    if (!transferPassword) {
      setTransferError('Please enter your account password to authorize this transfer.');
      return;
    }

    setTransferLoading(true);
    setTransferError('');

    try {
      const user = auth.currentUser;
      if (user && user.email) {
        let authPassword = transferPassword;
        // Check if admin credentials override is active
        if (user.email === 'tahsinullahtusher999@gmail.com' && transferPassword === '9900') {
          authPassword = '9900_TUT2026_ADMIN';
        }
        const credential = EmailAuthProvider.credential(user.email, authPassword);
        await reauthenticateWithCredential(user, credential);
      } else {
        throw new Error('No registered email found for authentication.');
      }

      // Success, perform transfer!
      await executeTransfer(amount);
    } catch (authErr: any) {
      console.error('Password verification failed:', authErr);
      let errorMsg = 'Incorrect account password. Please try again.';
      if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect password. Please enter the password you use to log into your T.U.T. account.';
      } else if (authErr.code === 'auth/user-mismatch') {
        errorMsg = 'Credential mismatch. Please use the password for this specific logged-in account.';
      } else if (authErr.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Your account has been temporarily locked. Please try again later.';
      } else if (authErr.message) {
        errorMsg = authErr.message;
      }
      setTransferError(errorMsg);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleGoogleVerify = async () => {
    if (!verifiedRecipient || !auth.currentUser) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Please enter a valid transfer amount.');
      return;
    }

    if (amount > profile.totalDeposit) {
      setTransferError(`Insufficient balance. Your current Total Deposit is ৳${profile.totalDeposit.toLocaleString()}`);
      return;
    }

    setTransferLoading(true);
    setTransferError('');

    try {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(auth.currentUser, provider);
      
      // If successful, execute the transfer
      await executeTransfer(amount);
    } catch (authErr: any) {
      console.error('Google reauthentication failed:', authErr);
      setTransferError('Google authentication failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCloseTransferModal = () => {
    setShowTransferModal(false);
    setTransferIdentifier('');
    setTransferAmount('');
    setTransferPassword('');
    setShowTransferPassword(false);
    setVerifiedRecipient(null);
    setTransferError('');
    setTransferSuccess(null);
  };

  return (
    <div className="space-y-4 pb-20 text-left max-w-md mx-auto px-2 sm:px-3 relative">
      
      {/* Top Welcome Card - Inspired by Image #1 (replaces the redundant sticky second header) */}
      <div className="p-4 bg-slate-900/30 border border-white/5 rounded-[22px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMemberTab('profile')}
            className="w-11 h-11 rounded-full border border-blue-500/20 overflow-hidden bg-blue-600/10 cursor-pointer hover:border-blue-500/40 transition-all active:scale-95 flex items-center justify-center relative flex-shrink-0"
          >
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5.5 h-5.5 text-blue-400" />
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
          </button>
          
          <div className="min-w-0">
            <p className="text-[7.5px] font-black text-blue-400/60 uppercase tracking-[0.18em] leading-none mb-1">WELCOME BACK</p>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate max-w-[130px]">{profile.name}</h3>
            <span className="inline-block mt-0.5 text-[7px] font-bold tracking-[0.15em] text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase border border-blue-500/20 leading-none">
              MEMBER SESSION
            </span>
          </div>
        </div>

        <div className="h-9 w-[1px] bg-white/5 mx-2" />

        {/* Real-time deposit display on Card matching Image #1 */}
        <div className="text-right flex-shrink-0">
          <p className="text-[7.5px] font-black text-blue-400/60 uppercase tracking-[0.18em] leading-none mb-1">PORTAL DEPOSIT</p>
          <div className="flex items-baseline gap-0.5 justify-end mt-0.5 font-mono">
            <span className="text-xs font-bold text-[#50e3c2]">৳</span>
            <span className="text-sm sm:text-base font-black text-white">{(profile.totalDeposit).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Tab Panel Views */}
      <div className="mt-1 min-h-[40vh]">
        
        {/* TAB 1: HOME (Dashboard, virtual card, toggles, recent activity) */}
        {memberTab === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            {/* Premium Luxury Credit Card / MasterCard styled Balance Card */}
            <div className="relative overflow-hidden rounded-[20px] p-5 sm:p-5.5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] group aspect-[1.586/1] w-full mx-auto flex flex-col justify-between">
              {/* Card glossy reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {/* Background abstract elements */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* CARD TOP ROW: Bank Name and Contactless/Logo */}
              <div className="relative z-10 flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5.5 h-5.5 rounded-md overflow-hidden bg-slate-900 border border-blue-500/20 flex-shrink-0">
                    <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black tracking-[0.15em] text-white leading-none uppercase">T.U.T.</p>
                    <p className="text-[6.5px] font-bold tracking-widest text-blue-400/80 uppercase leading-none mt-0.5">MONEY LENDING AUTHORITY</p>
                  </div>
                </div>
                
                {/* Contactless waves and Wallet icon */}
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-white/30 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2a10 10 0 0 1 10 10" />
                    <path d="M12 6a6 6 0 0 1 6 6" />
                    <path d="M12 10a2 2 0 0 1 2 2" />
                  </svg>
                  <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 text-white/80" />
                  </div>
                </div>
              </div>

              {/* CARD MIDDLE ROW: EMV Chip & Balances */}
              <div className="relative z-10 grid grid-cols-12 gap-2 items-center my-1">
                {/* EMV Gold Chip */}
                <div className="col-span-3">
                  <div className="w-8.5 h-6.5 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-500/30 p-0.5 relative overflow-hidden shadow-md flex-shrink-0">
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-900/30" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-900/30" />
                    <div className="absolute inset-1 rounded border border-amber-900/20" />
                  </div>
                </div>
                
                {/* Balances */}
                <div className="col-span-9 flex justify-around border-l border-white/10 pl-3">
                  <div>
                    <p className="text-white/40 text-[6px] font-black uppercase tracking-widest mb-0.5">CURRENT BALANCE</p>
                    <p className="text-base sm:text-xl font-black tracking-tight text-white flex items-center leading-none">
                      <span className="text-xs font-medium mr-0.5">৳</span>{profile.totalDeposit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[6px] font-black uppercase tracking-widest mb-0.5">REMAINING DEBT</p>
                    <p className="text-base sm:text-xl font-black tracking-tight text-rose-400 flex items-center leading-none">
                      <span className="text-xs font-medium mr-0.5">৳</span>{profile.remainingDebt.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD NUMBER ROW: Embossed Member ID */}
              <div className="relative z-10 my-1">
                <p className="text-white/30 text-[5.5px] font-black uppercase tracking-widest mb-0.5">MEMBER ACCOUNT NO.</p>
                <p className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] leading-none uppercase">
                  {profile.memberId ? profile.memberId.replace(/-/g, '  ') : 'TUT  MBR  2026  XXXX'}
                </p>
              </div>

              {/* CARD FOOTER ROW: Holder and Validity */}
              <div className="relative z-10 flex justify-between items-end border-t border-white/5 pt-1.5 mt-0.5">
                <div>
                  <p className="text-white/30 text-[5.5px] font-black uppercase tracking-widest leading-none mb-1">CARD HOLDER</p>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-white leading-none truncate max-w-[130px]">{profile.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-[5.5px] font-black uppercase tracking-widest leading-none mb-1">VALID THRU</p>
                  <p className="text-[9px] sm:text-[10px] font-mono text-blue-200 leading-none">
                    {profile.subscriptionExpiresAt ? format(new Date(profile.subscriptionExpiresAt), 'MM / yy') : '12 / 26'}
                  </p>
                </div>
                {/* Mastercard styled overlapping circles */}
                <div className="flex -space-x-1.5 items-center opacity-85 self-end pb-0.5">
                  <div className="w-4.5 h-4.5 rounded-full bg-blue-500/75 mix-blend-screen" />
                  <div className="w-4.5 h-4.5 rounded-full bg-indigo-500/75 mix-blend-screen" />
                </div>
              </div>
            </div>

            {/* Membership & Limits Card matching Image #1 */}
            <div 
              onClick={() => setMemberTab('subscription')}
              className="p-4 rounded-[22px] border border-blue-500/10 bg-slate-900/40 backdrop-blur-md hover:bg-slate-900/60 transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5 w-full">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Award className="w-5.5 h-5.5 transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.15em] mb-1">Membership & Limits</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      {profile.subscriptionStatus === 'active' ? (
                        profile.subscriptionTier === 'bronze' ? '🥉 BRONZE MEMBERSHIP' :
                        profile.subscriptionTier === 'silver' ? '🥈 SILVER EXECUTIVE' :
                        profile.subscriptionTier === 'gold' ? '👑 GOLD ELITE MEMBER' : 'STANDARD MEMBER'
                      ) : profile.subscriptionStatus === 'pending_approval' ? (
                        '⏳ VERIFICATION PENDING'
                      ) : (
                        '⚠️ NO ACTIVE SUBSCRIPTION'
                      )}
                    </span>
                    {profile.subscriptionStatus === 'active' && (
                      <span className="text-[7px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 leading-none">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-white/5 text-left">
                    <div>
                      <p className="text-[7.5px] text-slate-500 uppercase tracking-wider font-bold leading-none">Borrow Limit</p>
                      <p className="text-[11px] font-black text-blue-300 mt-0.5 font-mono">
                        {profile.subscriptionStatus === 'active' ? (
                          profile.subscriptionTier === 'bronze' ? '৳500 / month' :
                          profile.subscriptionTier === 'silver' ? '৳1,500 / month' :
                          profile.subscriptionTier === 'gold' ? '৳2,500 / month' : '৳0 / month'
                        ) : '৳0 / month'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7.5px] text-slate-500 uppercase tracking-wider font-bold leading-none">Next Renewal</p>
                      <p className="text-[11px] font-black text-blue-300 mt-0.5 font-mono">
                        {profile.subscriptionStatus === 'active' && profile.subscriptionExpiresAt ? (
                          format(new Date(profile.subscriptionExpiresAt), 'dd MMM')
                        ) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors ml-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Quick Actions Bento Grid - Replaced with requested setup */}
            <div className="space-y-2">
              <h4 className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">QUICK ACTIONS</h4>
              <div className="p-3 rounded-[22px] border border-white/5 bg-slate-900/20 backdrop-blur-md grid grid-cols-5 gap-1.5">
                
                {/* BORROW LOAN */}
                <button 
                  onClick={() => onRequestAction('loan')}
                  className="flex flex-col items-center justify-between p-2 rounded-xl border border-blue-500/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-blue-500/30 transition-all active:scale-95 group cursor-pointer text-center aspect-[0.9]"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_8px_rgba(37,99,235,0.08)]">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">Borrow Loan</span>
                </button>

                {/* PAY DUE */}
                <button 
                  onClick={() => onRequestAction('pay_due')}
                  className="flex flex-col items-center justify-between p-2 rounded-xl border border-rose-500/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-rose-500/30 transition-all active:scale-95 group cursor-pointer text-center aspect-[0.9]"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_8px_rgba(244,63,94,0.08)]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">Pay Due</span>
                </button>

                {/* DEPOSIT */}
                <button 
                  onClick={() => onRequestAction('deposit')}
                  className="flex flex-col items-center justify-between p-2 rounded-xl border border-emerald-500/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-emerald-500/30 transition-all active:scale-95 group cursor-pointer text-center aspect-[0.9]"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_8px_rgba(16,185,129,0.08)]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">Deposit</span>
                </button>

                {/* REFUND DEPOSIT */}
                <button 
                  onClick={() => onRequestAction('refund')}
                  className="flex flex-col items-center justify-between p-2 rounded-xl border border-amber-500/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-amber-500/30 transition-all active:scale-95 group cursor-pointer text-center aspect-[0.9]"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_8px_rgba(245,158,11,0.08)]">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">Refund Deposit</span>
                </button>

                {/* TRANSFER */}
                <button 
                  onClick={() => onRequestAction('transfer')}
                  className="flex flex-col items-center justify-between p-2 rounded-xl border border-purple-500/10 bg-slate-950/40 hover:bg-slate-900/60 hover:border-purple-500/30 transition-all active:scale-95 group cursor-pointer text-center aspect-[0.9]"
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_8px_rgba(168,85,247,0.08)]">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight leading-tight">Transfer</span>
                </button>

              </div>
            </div>

            {/* Live Support Banner matching Image #1 */}
            <a 
              href="https://wa.me/8801713710607" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3.5 rounded-[20px] border border-emerald-500/10 bg-slate-900/30 backdrop-blur-md hover:bg-slate-900/50 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <MessageSquare className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">LIVE SUPPORT</p>
                  <h5 className="text-[11px] font-bold text-white tracking-tight">Need help? Contact Admin</h5>
                </div>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Awaiting Pending Verification Queue */}
            {transactions.filter(t => t.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[8.5px] font-black text-amber-500/80 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Awaiting Verification
                </h4>
                <div className="space-y-2">
                  {transactions.filter(t => t.status === 'pending').map(tx => (
                    <div key={tx.id} className="bg-slate-900/30 border border-amber-500/15 rounded-xl p-3 flex justify-between items-center group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", 
                          tx.type === 'loan' ? "bg-rose-500/10 text-rose-400" : 
                          tx.type === 'refund' ? "bg-amber-500/10 text-amber-400" : 
                          tx.type === 'subscription' ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {tx.type === 'loan' ? <ArrowUpRight className="w-4 h-4" /> : 
                           tx.type === 'refund' ? <ArrowUpRight className="w-4 h-4" /> :
                           tx.type === 'subscription' ? <span className="text-xs">👑</span> :
                           <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black capitalize tracking-tight">{tx.type}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                            {tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMM, HH:mm') : 'Just now'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-amber-400 tracking-tight font-mono">৳ {tx.amount.toLocaleString()}</p>
                        <span className="text-[7.5px] font-black text-amber-400/80 uppercase tracking-widest mt-0.5 block">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Micro-feed of Recent Receipts replaced with Latest Transactions system */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Latest Transactions</h4>
                <button onClick={() => setMemberTab('memos')} className="text-[8.5px] font-black text-blue-400 uppercase tracking-wider hover:underline cursor-pointer">See Vault →</button>
              </div>
              
              <div className="bg-slate-950/40 rounded-3xl border border-white/5 p-4.5 space-y-4">
                {transactions.filter(t => t.status === 'confirmed').slice(0, 5).map((tx, idx, arr) => {
                  let sign = '+';
                  let colorClass = 'text-emerald-400';
                  let title = '';
                  let subtitle = '';
                  let initial = '';
                  let bgGradient = 'from-emerald-500 to-emerald-400';

                  switch (tx.type) {
                    case 'deposit':
                      sign = '+';
                      colorClass = 'text-emerald-400';
                      title = 'Portal Deposit';
                      subtitle = `Deposited via ${tx.method}`;
                      initial = 'D';
                      bgGradient = 'from-emerald-600 to-teal-500';
                      break;
                    case 'loan':
                      sign = '+';
                      colorClass = 'text-blue-400';
                      title = 'Loan Disbursed';
                      subtitle = tx.loanReason ? `Reason: ${tx.loanReason}` : `Via ${tx.method} Transfer`;
                      initial = 'L';
                      bgGradient = 'from-blue-600 to-indigo-500';
                      break;
                    case 'refund':
                      sign = '+';
                      colorClass = 'text-emerald-400';
                      title = 'Authority Refund';
                      subtitle = `Received on ${tx.method}`;
                      initial = 'R';
                      bgGradient = 'from-teal-500 to-emerald-400';
                      break;
                    case 'pay_due':
                      sign = '-';
                      colorClass = 'text-rose-400';
                      title = 'Due Payment';
                      subtitle = `Paid via ${tx.method}`;
                      initial = 'P';
                      bgGradient = 'from-rose-500 to-red-600';
                      break;
                    case 'subscription':
                      sign = '-';
                      colorClass = 'text-amber-400';
                      title = `${tx.subscriptionMonths ? tx.subscriptionMonths + '-Month' : 'Premium'} Sub`;
                      subtitle = `Loyalty Plan Activation`;
                      initial = 'S';
                      bgGradient = 'from-amber-500 to-yellow-600';
                      break;
                    default:
                      title = 'Transaction';
                      subtitle = `Method: ${tx.method}`;
                      initial = 'T';
                      bgGradient = 'from-slate-500 to-slate-700';
                  }

                  if (tx.isTransfer) {
                    initial = 'T';
                    bgGradient = 'from-cyan-500 to-blue-500';
                    if (tx.transferType === 'out') {
                      sign = '-';
                      colorClass = 'text-rose-400';
                      title = `Transfer to ${tx.transferRecipientName || 'User'}`;
                      subtitle = `A/C: ${tx.transferRecipientId || 'N/A'}`;
                    } else {
                      sign = '+';
                      colorClass = 'text-emerald-400';
                      title = `Transfer from ${tx.transferSenderName || 'User'}`;
                      subtitle = `A/C: ${tx.transferSenderId || 'N/A'}`;
                    }
                  }

                  const txTime = tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMM, HH:mm') : 'Just now';

                  return (
                    <div key={tx.id} className="flex flex-col">
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Left icon box with custom gradient */}
                          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg flex-shrink-0 bg-gradient-to-tr", bgGradient)}>
                            {initial}
                          </div>
                          
                          {/* Center info */}
                          <div className="min-w-0">
                            <h5 className="text-[12.5px] font-black text-white tracking-tight truncate">
                              {title}
                            </h5>
                            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                              {subtitle} <span className="mx-1 text-slate-600">•</span> {txTime}
                            </p>
                          </div>
                        </div>

                        {/* Right side amount */}
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-sm font-black font-mono tracking-tight", colorClass)}>
                            {sign} ৳{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {idx < arr.length - 1 && (
                        <div className="border-b border-white/[0.04] my-2.5" />
                      )}
                    </div>
                  );
                })}

                {transactions.filter(t => t.status === 'confirmed').length === 0 && (
                  <div className="py-8 text-center bg-slate-900/15 border border-dashed border-white/5 rounded-3xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No verified transaction history yet</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: VAULT (Analytics, stats, budget tracking progress, receipts list) */}
        {memberTab === 'memos' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. Vault Overview Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 rounded-3xl border border-white/5 p-6 md:p-8 shadow-2xl">
              {/* Abstract Security Design Accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3 max-w-md">
                  <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-400">
                    <Shield className="w-3 h-3 text-blue-400 animate-pulse" />
                    T.U.T. QUANTUM SECURE LEDGER
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                    Financial Vault
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Welcome to your authenticated financial gateway. Access certified bank-grade receipts, membership credentials, disbursal records, and real-time ledger audits.
                  </p>
                  
                  {/* Verification & status indicators */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ID: {profile.status === 'approved' ? 'VERIFIED' : 'PENDING'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase">
                      <Fingerprint className="w-3 h-3 text-blue-400" />
                      AES-256 ACTIVE
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/5 text-slate-400 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-wider uppercase">
                      <Database className="w-3 h-3 text-slate-400" />
                      LEDGER NODE: #041
                    </span>
                  </div>
                </div>

                {/* Big interactive secure metal badge */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative w-28 h-28 rounded-3xl bg-slate-900 border-2 border-white/10 flex flex-col items-center justify-center shadow-2xl overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <Lock className="w-10 h-10 text-blue-400 mb-1.5 transition-transform duration-500 group-hover:rotate-12" />
                    <span className="text-[7.5px] font-black text-slate-400 tracking-widest uppercase">SYS LOCK</span>
                    <span className="text-[7px] font-mono text-emerald-400 font-bold mt-0.5">ONLINE</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* 2. Financial Overview & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dynamic Recharts area chart of confirmed entries */}
              <div className="lg:col-span-2">
                <SpendChart transactions={transactions} profile={profile} />
              </div>

              {/* Progress circles widgets */}
              <div className="space-y-4">
                <div className="p-1 px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Thresholds</h4>
                </div>
                <BudgetCircle 
                  percentage={profile.totalDeposit > 0 ? Math.min(100, Math.round((profile.totalDeposit / 25000) * 100)) : 0} 
                  label="Savings Goal Progress" 
                  amount={`৳ ${(profile.totalDeposit).toLocaleString()}`} 
                  color="emerald"
                />
                <BudgetCircle 
                  percentage={profile.remainingDebt > 0 ? Math.min(100, Math.round((profile.remainingDebt / (profile.borrowingLimit || 100000)) * 100)) : 0} 
                  label="Used Lending Capacity" 
                  amount={`৳ ${(profile.remainingDebt).toLocaleString()}`} 
                  color="amber"
                />
              </div>

            </div>

            {/* 3. Financial Health Bento Stats */}
            <div className="space-y-3">
              <div className="p-1 px-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Health</h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="glass p-5 rounded-3xl border-emerald-500/10 flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-300">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest block mb-1">Total Savings</span>
                    <h4 className="text-lg font-black text-white">৳ {profile.totalDeposit.toLocaleString()}</h4>
                  </div>
                  <p className="text-[9.5px] text-slate-400/60 mt-4 leading-normal">Lifetime reserves deposited</p>
                </div>

                <div className="glass p-5 rounded-3xl border-blue-500/10 flex flex-col justify-between hover:border-blue-500/20 transition-all duration-300">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest block mb-1">Total Lent</span>
                    <h4 className="text-lg font-black text-white">৳ {profile.totalLoan.toLocaleString()}</h4>
                  </div>
                  <p className="text-[9.5px] text-slate-400/60 mt-4 leading-normal">Borrowed funds dispatched</p>
                </div>

                <div className="glass p-5 rounded-3xl border-rose-500/10 flex flex-col justify-between hover:border-rose-500/20 transition-all duration-300">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-rose-400/60 uppercase tracking-widest block mb-1">Remaining Debt</span>
                    <h4 className="text-lg font-black text-white">৳ {profile.remainingDebt.toLocaleString()}</h4>
                  </div>
                  <p className="text-[9.5px] text-slate-400/60 mt-4 leading-normal">Active outstanding dues</p>
                </div>

                <div className="glass p-5 rounded-3xl border-amber-500/10 flex flex-col justify-between hover:border-amber-500/20 transition-all duration-300">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest block mb-1">Verified Status</span>
                    <h4 className="text-lg font-black text-white uppercase italic">{profile.status === 'approved' ? 'Verified' : 'Pending'}</h4>
                  </div>
                  <p className="text-[9.5px] text-slate-400/60 mt-4 leading-normal">T.U.T. official registry</p>
                </div>

              </div>
            </div>

            {/* 4. Official Document Center & 5. Search & Filters */}
            <div className="space-y-5 bg-slate-950/20 p-5 rounded-3xl border border-white/5">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Official Document Center
                </h3>

                {/* Elegant Compact Search Box */}
                <div className="relative min-w-[200px] md:min-w-[280px]">
                  <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search documents by ID, method..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl py-2 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Filter Chips row */}
              <div className="flex flex-wrap gap-1.5 border-b border-white/[0.04] pb-4">
                {(['all', 'receipts', 'loans', 'deposits', 'certificates', 'subscriptions'] as const).map((tab) => {
                  const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                  const isActive = docFilter === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setDocFilter(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                        isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30" : "bg-slate-900/80 text-slate-400 hover:text-white border border-white/5"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Document Paper List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Verified Membership Certificate injected as a permanent certificate doc */}
                {(docFilter === 'all' || docFilter === 'certificates') && 
                 profile.status === 'approved' && 
                 profile.name.toLowerCase().includes(docSearch.toLowerCase()) && (
                  <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => {
                      setSelectedDoc({
                        id: 'CERT-MEMB-2026',
                        type: 'certificate',
                        amount: 0,
                        method: 'Cash',
                        status: 'confirmed',
                        memoId: `CERT-${profile.memberId}`
                      });
                    }}
                    className="group relative overflow-hidden bg-slate-900/50 border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-5 text-left flex justify-between items-start gap-4 cursor-pointer shadow-lg transition-all"
                  >
                    {/* Left gold decorative stripe */}
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-amber-600 to-yellow-400" />
                    
                    <div className="space-y-2 min-w-0 pl-1.5">
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase">
                        👑 Certificate
                      </div>
                      <h4 className="text-xs font-black text-white tracking-tight truncate">
                        Membership Certificate
                      </h4>
                      <p className="text-[9px] font-mono text-slate-400">
                        ID: CERT-{profile.memberId || 'N/A'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold">
                        Issued on registry active status
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-black uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow tracking-wider">
                        SECURED
                      </span>
                      <span className="text-[8.5px] font-mono text-amber-400/80 font-black mt-2">
                        T.U.T. OFFICIAL
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Transaction receipts documents */}
                {transactions
                  .filter(t => t.status === 'confirmed')
                  .filter(t => {
                    // Filter based on search query
                    const queryClean = docSearch.toLowerCase();
                    const matchId = t.id.toLowerCase().includes(queryClean);
                    const matchMemo = t.memoId?.toLowerCase().includes(queryClean) || false;
                    const matchMethod = t.method.toLowerCase().includes(queryClean);
                    const matchType = t.type.toLowerCase().includes(queryClean);
                    
                    const matchesSearch = docSearch === '' || matchId || matchMemo || matchMethod || matchType;

                    // Filter based on filter tab
                    if (!matchesSearch) return false;
                    if (docFilter === 'all') return true;
                    if (docFilter === 'loans' && t.type === 'loan') return true;
                    if (docFilter === 'deposits' && t.type === 'deposit') return true;
                    if (docFilter === 'subscriptions' && t.type === 'subscription') return true;
                    if (docFilter === 'receipts' && (t.type === 'refund' || t.type === 'pay_due')) return true;
                    return false;
                  })
                  .map(tx => {
                    let docLabel = 'Receipt';
                    let stripeColor = 'from-blue-600 to-indigo-500';
                    let labelColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                    let title = 'Financial Record';

                    switch (tx.type) {
                      case 'deposit':
                        docLabel = 'Deposit Confirmation';
                        stripeColor = 'from-emerald-600 to-teal-500';
                        labelColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                        title = 'Deposit Statement';
                        break;
                      case 'loan':
                        docLabel = 'Loan Agreement';
                        stripeColor = 'from-blue-600 to-indigo-500';
                        labelColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                        title = 'Official Loan Record';
                        break;
                      case 'refund':
                        docLabel = 'Settlement Voucher';
                        stripeColor = 'from-teal-500 to-emerald-400';
                        labelColor = 'bg-teal-500/10 border-teal-500/20 text-teal-400';
                        title = 'Refund Settlement Receipt';
                        break;
                      case 'pay_due':
                        docLabel = 'Payment Receipt';
                        stripeColor = 'from-rose-500 to-red-600';
                        labelColor = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                        title = 'Due Repayment Voucher';
                        break;
                      case 'subscription':
                        docLabel = 'Subscription Record';
                        stripeColor = 'from-amber-500 to-yellow-600';
                        labelColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                        title = 'Membership Subscription';
                        break;
                    }

                    if (tx.isTransfer) {
                      docLabel = 'Internal Transfer';
                      stripeColor = 'from-cyan-500 to-blue-500';
                      labelColor = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
                      title = tx.transferType === 'out' ? 'Funds Dispatched' : 'Funds Received';
                    }

                    const txDate = tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMM yyyy') : 'Recently';

                    return (
                      <motion.div
                        key={tx.id}
                        whileHover={{ y: -3 }}
                        onClick={() => setSelectedDoc(tx)}
                        className="group relative overflow-hidden bg-slate-900/50 border border-white/5 hover:border-white/10 rounded-3xl p-5 text-left flex justify-between items-start gap-4 cursor-pointer shadow-lg transition-all"
                      >
                        {/* Decorative hologram stripe */}
                        <div className={cn("absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b", stripeColor)} />

                        <div className="space-y-2 min-w-0 pl-1.5">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase border", labelColor)}>
                            {docLabel}
                          </span>
                          <h4 className="text-xs font-black text-white tracking-tight truncate">
                            {title}
                          </h4>
                          <p className="text-[9px] font-mono text-slate-400">
                            DOC-{tx.memoId || tx.id.substring(0, 10).toUpperCase()}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold">
                            Issued: {txDate} via {tx.isTransfer ? 'Internal transfer' : tx.method}
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[8px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded tracking-wider">
                            VERIFIED
                          </span>
                          <span className="text-sm font-mono font-black text-white mt-2">
                            ৳{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                {/* If empty */}
                {transactions.filter(t => t.status === 'confirmed').length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-900/10 rounded-3xl border border-dashed border-white/5">
                    <FileText className="w-8 h-8 text-slate-500/30 mx-auto mb-2" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">No verified receipts or documents available</p>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Recent Activity Timeline (Banking Layout) */}
            <div className="p-5 rounded-3xl bg-slate-950/20 border border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Recent Activity Timeline
              </h4>
              
              <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-white/[0.04]">
                {transactions
                  .filter(t => t.status === 'confirmed')
                  .slice(0, 4)
                  .map((tx) => {
                    let activityTitle = '';
                    let dotColor = 'bg-blue-500 border-blue-400/30';
                    let amountStr = `৳ ${tx.amount.toLocaleString()}`;
                    let amountColor = 'text-white';

                    switch (tx.type) {
                      case 'deposit':
                        activityTitle = `Portal deposit credited to savings via ${tx.method}`;
                        dotColor = 'bg-emerald-500 border-emerald-400/30';
                        amountColor = 'text-emerald-400';
                        break;
                      case 'loan':
                        activityTitle = `Capital disbursal approved via ${tx.method}`;
                        dotColor = 'bg-blue-500 border-blue-400/30';
                        amountColor = 'text-blue-400';
                        break;
                      case 'refund':
                        activityTitle = `Ledger settlement refund credited`;
                        dotColor = 'bg-emerald-500 border-emerald-400/30';
                        amountColor = 'text-emerald-400';
                        break;
                      case 'pay_due':
                        activityTitle = `Due repayment completed via ${tx.method}`;
                        dotColor = 'bg-rose-500 border-rose-400/30';
                        amountColor = 'text-rose-400';
                        break;
                      case 'subscription':
                        activityTitle = `Loyalty plan active subscription validated`;
                        dotColor = 'bg-amber-500 border-amber-400/30';
                        amountColor = 'text-amber-400';
                        break;
                    }

                    if (tx.isTransfer) {
                      activityTitle = tx.transferType === 'out' 
                        ? `Dispatched transfer to ${tx.transferRecipientName || 'User'}` 
                        : `Received transfer from ${tx.transferSenderName || 'User'}`;
                      dotColor = tx.transferType === 'out' ? 'bg-rose-500 border-rose-400/30' : 'bg-emerald-500 border-emerald-400/30';
                      amountColor = tx.transferType === 'out' ? 'text-rose-400' : 'text-emerald-400';
                    }

                    const txTimeStr = tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'dd MMMM yyyy, HH:mm') : 'Just now';

                    return (
                      <div key={tx.id} className="relative flex justify-between items-start gap-4">
                        {/* Bullet Node */}
                        <div className={cn("absolute -left-[22px] w-3 h-3 rounded-full border-2 bg-slate-950 z-10", dotColor)} />

                        <div className="space-y-1 text-left">
                          <p className="text-xs font-bold text-white tracking-tight leading-snug">
                            {activityTitle}
                          </p>
                          <p className="text-[10px] text-slate-400/80 font-bold">
                            {txTimeStr} <span className="mx-1 text-slate-700">•</span> Ref: {tx.id.substring(0, 8).toUpperCase()}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={cn("text-xs font-mono font-black", amountColor)}>
                            {tx.type === 'deposit' || tx.type === 'refund' || (tx.isTransfer && tx.transferType === 'in') ? '+' : '-'} {amountStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {transactions.filter(t => t.status === 'confirmed').length === 0 && (
                  <div className="py-2 text-left">
                    <p className="text-[10px] text-slate-500 font-bold">Waiting for transaction ledger to sync...</p>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Security Indicators Footer Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/15 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center gap-2 px-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider truncate">AES-256 Encryption</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider truncate">Cloud Ledger Backups</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider truncate">Identities Verified</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider truncate">Digitally Signed Docs</span>
              </div>
            </div>

            {/* Premium Interactive Document Viewer Overlay */}
            <AnimatePresence>
              {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8"
                  >
                    {/* Floating Close Button */}
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-20"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Header of Document */}
                    <div className="relative border-b border-white/5 pb-6 mb-6 text-center">
                      <div className="flex justify-center mb-3">
                        <div className="logo-shield w-12 h-12 overflow-hidden rounded-2xl border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/20 bg-slate-950">
                          <img src={tutLogo} alt="T.U.T. Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                      <h3 className="text-base font-black tracking-widest text-white uppercase">T.U.T Money Lending Authority</h3>
                      <p className="text-[9px] font-black tracking-[0.25em] text-blue-400 uppercase mt-1">Quantum Verified Secure Ledger</p>
                      <div className="absolute top-0 left-0 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
                        OFFICIAL FINANCIAL STATEMENT
                      </div>
                    </div>

                    {/* Paper Container (Simulating official white certificate / document) */}
                    <div className="relative bg-white text-slate-950 rounded-2xl p-6 shadow-xl border border-blue-100 overflow-hidden min-h-[380px]">
                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-25deg] select-none z-0 text-center">
                        <span className="text-3xl font-black text-blue-900 tracking-widest leading-none">
                          T.U.T. MONEY LENDING AUTHORITY
                        </span>
                      </div>

                      {/* Secure Chip and Signature Overlay */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded shadow">
                          Verified
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-blue-900 text-white px-2 py-0.5 rounded shadow">
                          AES-256
                        </span>
                      </div>

                      <div className="relative z-10 space-y-6">
                        {selectedDoc.type === 'certificate' ? (
                          /* MEMBERSHIP CERTIFICATE VIEW */
                          <div className="text-center space-y-5 py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500 text-amber-600 font-bold mb-1">
                              👑
                            </div>
                            <div>
                              <h4 className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">Official Document</h4>
                              <p className="text-lg font-black tracking-tight text-blue-950">CERTIFICATE OF MEMBERSHIP</p>
                            </div>
                            
                            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                              This certifies that <strong className="text-blue-950 font-black">{profile.name}</strong> is registered as a fully authenticated member of the <span className="font-bold">T.U.T Money Lending Authority</span> under ID <strong className="font-mono">{profile.memberId || 'Pending'}</strong>.
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-left border-y border-blue-50 py-4 font-sans text-xs">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Registry Date</span>
                                <span className="font-bold text-slate-800">
                                  {profile.createdAt?.toDate ? format(profile.createdAt.toDate(), 'dd MMMM yyyy') : 'Recently Registered'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Security Status</span>
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verified Node
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* STANDARD TRANSACTION DOCUMENT STATEMENT */
                          <div className="space-y-4">
                            <div className="border-b border-blue-50 pb-3">
                              <h4 className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-1">
                                {selectedDoc.type === 'deposit' ? 'OFFICIAL DEPOSIT CONFIRMATION' :
                                 selectedDoc.type === 'loan' ? 'OFFICIAL LOAN AGREEMENT' :
                                 selectedDoc.type === 'refund' ? 'REFUND SETTLEMENT VOUCHER' :
                                 selectedDoc.type === 'pay_due' ? 'DUE PAYMENT RECEIPT' :
                                 'MEMBERSHIP SUBSCRIPTION RECORD'}
                              </h4>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-mono font-bold text-blue-950 tracking-tighter">
                                  DOC-{selectedDoc.memoId || selectedDoc.id.substring(0, 10).toUpperCase()}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">
                                  Ref: TUT-2026-LN
                                </span>
                              </div>
                            </div>

                            {/* Main details list */}
                            <div className="space-y-3 font-sans text-xs">
                              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[9px]">Account Holder</span>
                                <span className="font-bold text-slate-800">{profile.name}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[9px]">Member ID</span>
                                <span className="font-mono font-bold text-slate-800">{profile.memberId || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[9px]">Issue Date</span>
                                <span className="font-bold text-slate-800">
                                  {selectedDoc.timestamp?.toDate ? format(selectedDoc.timestamp.toDate(), 'dd MMMM yyyy, HH:mm') : 'Confirmed'}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[9px]">Payment Method</span>
                                <span className="font-bold text-slate-800">
                                  {selectedDoc.isTransfer ? 'T.U.T Internal Transfer' : selectedDoc.method}
                                </span>
                              </div>
                              {selectedDoc.isTransfer && selectedDoc.transferType === 'out' && (
                                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                  <span className="font-bold text-slate-400 uppercase text-[9px]">Recipient</span>
                                  <span className="font-bold text-rose-600 truncate max-w-[150px]">
                                    {selectedDoc.transferRecipientName || 'User'} ({selectedDoc.transferRecipientId || 'N/A'})
                                  </span>
                                </div>
                              )}
                              {selectedDoc.isTransfer && selectedDoc.transferType === 'in' && (
                                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                  <span className="font-bold text-slate-400 uppercase text-[9px]">Sender</span>
                                  <span className="font-bold text-emerald-600 truncate max-w-[150px]">
                                    {selectedDoc.transferSenderName || 'User'} ({selectedDoc.transferSenderId || 'N/A'})
                                  </span>
                                </div>
                              )}
                              {selectedDoc.type === 'loan' && selectedDoc.estimatedRepaymentDate && (
                                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                  <span className="font-bold text-slate-400 uppercase text-[9px]">Estimated Repayment Date</span>
                                  <span className="font-bold text-amber-600">
                                    {format(new Date(selectedDoc.estimatedRepaymentDate), 'dd MMMM yyyy')}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 pb-1">
                                <span className="font-bold text-slate-400 uppercase text-[10px]">Total Certified Amount</span>
                                <span className="text-2xl font-black text-blue-950 tracking-tighter">
                                  ৳ {selectedDoc.amount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Document Footer: QR Code, Stamp and Signatures */}
                        <div className="pt-4 border-t border-dashed border-blue-100 flex justify-between items-end gap-4">
                          {/* Simulated QR Code using our vector component */}
                          <div className="p-2 bg-slate-950 rounded-xl border border-blue-50">
                            <CustomQRCode value={`TUT-VERIFY-${selectedDoc.id}`} />
                          </div>

                          {/* Signature Block */}
                          <div className="text-right space-y-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">Chairman Signature</span>
                            <div className="font-serif text-xs text-blue-900 tracking-wide font-medium italic select-none">
                              Tahsin Ullah Tusher
                            </div>
                            <div className="w-24 h-0.5 bg-blue-900/10 mx-auto ml-auto" />
                            <span className="text-[7px] font-black text-blue-900/30 uppercase tracking-widest block">T.U.T Authority Chairman</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action button section */}
                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => {
                          // Copy digital hash / signature
                          navigator.clipboard.writeText(`TUT-${selectedDoc.id}-${selectedDoc.amount}`);
                          alert("Digital hash signature copied to clipboard for ledgers verification!");
                        }}
                        className="flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Copy className="w-4 h-4" /> Copy Hash
                      </button>
                      <button 
                        onClick={() => {
                          window.print();
                        }}
                        className="flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/40"
                      >
                        <Download className="w-4 h-4" /> Statement
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* TAB 3: PREMIUM SUBSCRIPTION (Active Plan, streaks, selector & manual verification form) */}
        {memberTab === 'subscription' && (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Visual Stepper at the Top */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto mb-2 p-1.5 bg-slate-950/40 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 px-3 py-2 rounded-xl text-center sm:text-left justify-center ${!showSubPaymentMode ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${!showSubPaymentMode ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800'}`}>1</span>
                <div>
                  <p className="text-[9px] font-black tracking-wider uppercase leading-none">Select Tier</p>
                  <p className="text-[7.5px] font-medium hidden sm:block mt-0.5 opacity-80">Choose your credit limits</p>
                </div>
              </div>

              <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 px-3 py-2 rounded-xl text-center sm:text-left justify-center ${showSubPaymentMode && profile.subscriptionStatus !== 'pending_approval' ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${showSubPaymentMode && profile.subscriptionStatus !== 'pending_approval' ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800'}`}>2</span>
                <div>
                  <p className="text-[9px] font-black tracking-wider uppercase leading-none">Checkout Portal</p>
                  <p className="text-[7.5px] font-medium hidden sm:block mt-0.5 opacity-80">Instant Bank Verification</p>
                </div>
              </div>

              <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 px-3 py-2 rounded-xl text-center sm:text-left justify-center ${profile.subscriptionStatus === 'pending_approval' || profile.subscriptionStatus === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${profile.subscriptionStatus === 'pending_approval' || profile.subscriptionStatus === 'active' ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-800'}`}>3</span>
                <div>
                  <p className="text-[9px] font-black tracking-wider uppercase leading-none">Activation</p>
                  <p className="text-[7.5px] font-medium hidden sm:block mt-0.5 opacity-80">Limits Active & Vaulted</p>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border border-blue-500/10 bg-slate-950/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2.5 text-white">
                    <span className="text-xl">👑</span>
                    T.U.T. Subscription & Loyalty Hub
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Configure borrowing limits, loyalty discount streaks, and premium badges</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-500/20 px-3 py-1.5 rounded-2xl text-[9px] font-black tracking-wider uppercase text-blue-400 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live cycle status
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT SIDEBAR: Active subscription status + loyalty info */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Current Active Plan Card */}
                  <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Plan Details</h4>
                      <Shield className="w-4 h-4 text-blue-500/50" />
                    </div>
                    
                    {profile.subscriptionStatus === 'active' ? (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs font-bold text-blue-100">Tier Badge</span>
                          <SubscriptionBadge tier={profile.subscriptionTier} status={profile.subscriptionStatus} expiresAtStr={profile.subscriptionExpiresAt} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Expires At</p>
                            <p className="text-xs font-mono font-black text-emerald-400">
                              {profile.subscriptionExpiresAt ? format(new Date(profile.subscriptionExpiresAt), 'dd MMM yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Status</p>
                            <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                          </div>
                        </div>
                      </div>
                    ) : profile.subscriptionStatus === 'pending_approval' ? (
                      <div className="space-y-3 text-center py-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                          <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Verification Pending</p>
                          <p className="text-[10px] text-slate-400/80 max-w-[240px] mx-auto mt-1 leading-normal">
                            Our clearing desk is currently auditing your gateway logs. Your credit limit is queued for near-instant dispatch.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-center py-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                          <Lock className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-400 uppercase tracking-wider">No Active Subscription</p>
                          <p className="text-[10px] text-slate-400/80 max-w-[240px] mx-auto mt-1 leading-normal">
                            Activate a premium tier below to establish borrowing limits. Late cycle renewals require instant forward verification.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Loyalty progress trackers */}
                  <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">Loyalty & Reward Tracking</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">
                          🔥
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-100">Renewal Streak</span>
                            <span className="text-xs font-mono font-black text-amber-400">{(profile.continuousSubscriptionMonths || 0)} Mo</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 leading-normal">Renew on Days 1-5 for 3 consecutive months to secure a permanent <strong className="text-amber-400">+৳500</strong> bonus limit and 10% on-time discount!</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
                          🎁
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-100">No-Loan cycles</span>
                            <span className="text-xs font-mono font-black text-emerald-400">{(profile.consecutiveNoLoanMonths || 0)} Mo</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 leading-normal">Take 0 loans for 2 consecutive active months to earn a <strong className="text-emerald-400">50% discount</strong> on your next subscription billing!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT AREA: Subscription payment selection */}
                <div className="lg:col-span-7">
                  {(() => {
                    const pricing = getSubscriptionPricing(selectedSubTier, profile);
                    return !showSubPaymentMode ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest">Select A Membership Tier</h4>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Scroll left/right to view</span>
                      </div>
                      
                      {/* Gorgeous Tier Selectors Styled like Premium Banking Credit Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Bronze Card */}
                        <button 
                          type="button"
                          onClick={() => setSelectedSubTier('bronze')}
                          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[175px] cursor-pointer group ${selectedSubTier === 'bronze' ? 'border-[#cd7f32] bg-gradient-to-br from-[#cd7f32]/20 via-slate-900 to-slate-950 shadow-[0_0_20px_rgba(205,127,50,0.2)] scale-[1.02]' : 'border-white/5 bg-slate-900/60 hover:border-white/20'}`}
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="text-xs">🥉</span>
                            <span className={`w-2 h-2 rounded-full ${selectedSubTier === 'bronze' ? 'bg-[#cd7f32] animate-pulse' : 'bg-transparent'}`} />
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-[#cd7f32] tracking-wider uppercase">T.U.T. BRONZE</p>
                            <h5 className="text-xs font-black text-white uppercase tracking-tight mt-1">Bronze Member</h5>
                            <ul className="space-y-1.5 mt-3 text-[8.5px] text-slate-400 leading-normal">
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Limit: <strong>৳500 / Month</strong></li>
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Standard money dispatch</li>
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> 30-Day interest period</li>
                            </ul>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
                            <span className="text-[7.5px] text-slate-500 uppercase font-bold">Monthly Fee</span>
                            <p className="text-sm font-black text-white">৳20 <span className="text-[9px] font-normal text-slate-400">/Mo</span></p>
                          </div>
                        </button>

                        {/* Silver Card */}
                        <button 
                          type="button"
                          onClick={() => setSelectedSubTier('silver')}
                          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[175px] cursor-pointer group ${selectedSubTier === 'silver' ? 'border-slate-300 bg-gradient-to-br from-slate-300/20 via-slate-900 to-slate-950 shadow-[0_0_20px_rgba(203,213,225,0.25)] scale-[1.02]' : 'border-white/5 bg-slate-900/60 hover:border-white/20'}`}
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="text-xs">🥈</span>
                            <span className={`w-2 h-2 rounded-full ${selectedSubTier === 'silver' ? 'bg-slate-300 animate-pulse' : 'bg-transparent'}`} />
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-slate-300 tracking-wider uppercase">T.U.T. EXECUTIVE</p>
                            <h5 className="text-xs font-black text-white uppercase tracking-tight mt-1">Silver Exec</h5>
                            <ul className="space-y-1.5 mt-3 text-[8.5px] text-slate-400 leading-normal">
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Limit: <strong>৳1,500 / Month</strong></li>
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Expanded dispatch priority</li>
                              <li className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Chairman signature certificate</li>
                            </ul>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
                            <span className="text-[7.5px] text-slate-500 uppercase font-bold">Monthly Fee</span>
                            <p className="text-sm font-black text-white">৳50 <span className="text-[9px] font-normal text-slate-400">/Mo</span></p>
                          </div>
                        </button>

                        {/* Gold Card */}
                        <button 
                          type="button"
                          onClick={() => setSelectedSubTier('gold')}
                          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[175px] cursor-pointer group ${selectedSubTier === 'gold' ? 'border-yellow-400 bg-gradient-to-br from-yellow-400/20 via-slate-900 to-slate-950 shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-[1.02]' : 'border-white/5 bg-slate-900/60 hover:border-white/20'}`}
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="text-xs">👑</span>
                            <span className={`w-2 h-2 rounded-full ${selectedSubTier === 'gold' ? 'bg-yellow-400 animate-pulse' : 'bg-transparent'}`} />
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-yellow-400 tracking-wider uppercase">T.U.T. VIP ELITE</p>
                            <h5 className="text-xs font-black text-white uppercase tracking-tight mt-1">Gold Elite</h5>
                            <ul className="space-y-1.5 mt-3 text-[8.5px] text-slate-400 leading-normal">
                              <li className="flex items-center gap-1"><span className="text-yellow-400">✓</span> Limit: <strong>৳2,500 / Month</strong></li>
                              <li className="flex items-center gap-1"><span className="text-yellow-400">✓</span> Automated priority dispatch</li>
                              <li className="flex items-center gap-1"><span className="text-yellow-400">✓</span> VIP status & direct ledger audit</li>
                            </ul>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
                            <span className="text-[7.5px] text-slate-500 uppercase font-bold">Monthly Fee</span>
                            <p className="text-sm font-black text-yellow-400 font-extrabold">৳100 <span className="text-[9px] font-normal text-slate-400">/Mo</span></p>
                          </div>
                        </button>
                      </div>

                      {/* Pricing calculation details */}
                      {(() => {
                        const pricing = getSubscriptionPricing(selectedSubTier, profile);
                        return (
                          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-blue-100">Subscription Term</span>
                              <span className="font-black text-white uppercase tracking-wider">{pricing.label}</span>
                            </div>
                            
                            {pricing.isLate && (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-300 leading-relaxed flex items-start gap-2">
                                <span className="text-sm">⚠️</span>
                                <div>
                                  <strong>Late Renewal Catch-up Triggered (Day 6 onwards):</strong> Standard renewals are Day 1 to 5. To re-enable access you must pay for both this month and next month upfront.
                                </div>
                              </div>
                            )}

                            {pricing.discountApplied > 0 && (
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-300 leading-relaxed flex items-start gap-2">
                                <span className="text-sm">🎉</span>
                                <div>{pricing.discountReason}</div>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-3.5 border-t border-white/5">
                              <div>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Total Payable Amount</span>
                                <span className="text-[8px] text-slate-500 uppercase font-medium">Billed dynamically via Secure Gateway</span>
                              </div>
                              <span className="text-2xl font-black text-white tracking-tighter font-mono">৳ {pricing.price.toLocaleString()}</span>
                            </div>

                            <button 
                              type="button"
                              onClick={() => {
                                onRequestAction('subscription');
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3.5 rounded-xl tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                              Proceed to Secure Payment Gateway
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Header containing choice to go back */}
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">T.U.T. OFFICIAL PAYMENT Verification</h4>
                          <p className="text-[9px] text-slate-500 mt-0.5 uppercase">SUBMIT YOUR MANUAL PEER-TO-PEER PAYMENT MANIFEST</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setShowSubPaymentMode(false)}
                          className="text-xs text-blue-400 hover:text-white transition-colors cursor-pointer font-black uppercase tracking-wider bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 hover:border-white/15"
                        >
                          ← Change Tier
                        </button>
                      </div>

                      {/* Payment Method Gateway Tabs */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-2xl border border-white/5">
                        <button 
                          type="button"
                          onClick={() => {
                            setSubCheckoutMethod('bkash');
                            setSubWallet('Bkash');
                            setSubTrxId('');
                          }}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${subCheckoutMethod === 'bkash' ? 'bg-[#E2136E]/10 border-[#E2136E]/40 text-[#E2136E] shadow-lg shadow-[#E2136E]/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                          <img 
                            src="https://download.logo.wine/logo/BKash/BKash-Logo.wine.png" 
                            alt="bKash" 
                            className="w-10 h-6 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <span className="leading-none mt-0.5 font-bold">bKash Personal</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setSubCheckoutMethod('nagad');
                            setSubWallet('Nagad');
                            setSubTrxId('');
                          }}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${subCheckoutMethod === 'nagad' ? 'bg-[#F15A22]/10 border-[#F15A22]/40 text-[#F15A22] shadow-lg shadow-[#F15A22]/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Nagad_Logo.svg" 
                            alt="Nagad" 
                            className="w-10 h-6 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <span className="leading-none mt-0.5 font-bold">Nagad Personal</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setSubCheckoutMethod('cash');
                            setSubWallet('Cash');
                            setSubTrxId('');
                          }}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${subCheckoutMethod === 'cash' ? 'bg-emerald-600/10 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                        >
                          <div className="w-10 h-6 flex items-center justify-center text-lg leading-none">💵</div>
                          <span className="leading-none mt-0.5 font-bold">Desk Cash</span>
                        </button>
                      </div>

                      {/* PAYMENT WINDOW WINDOW */}
                      <div className="p-5 bg-slate-900 rounded-2xl border border-white/5 relative overflow-hidden min-h-[300px] flex flex-col justify-between">
                        
                        {/* UNIFIED MANUAL PEER-TO-PEER PAYMENT WINDOW */}
                        {['bkash', 'nagad', 'cash'].includes(subCheckoutMethod) && (
                          <div className="space-y-4 flex-1 flex flex-col justify-between">
                            
                            {/* Dynamic instruction header based on selected wallet */}
                            {subCheckoutMethod === 'bkash' && (
                              <div className="space-y-3">
                                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <img 
                                      src="https://download.logo.wine/logo/BKash/BKash-Logo.wine.png" 
                                      alt="bKash" 
                                      className="h-5 object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[10px] font-black uppercase text-pink-500 tracking-wider">Send Money (Personal)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                    Please send <strong className="text-white">৳{pricing.price.toLocaleString()}</strong> using bKash <strong className="text-pink-400">"Send Money"</strong> option to our official Personal Account number below:
                                  </p>
                                  <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-white/5">
                                    <div>
                                      <p className="text-[8px] font-black text-pink-400 uppercase tracking-widest font-mono">bKash Personal Number</p>
                                      <p className="text-sm font-mono font-black text-white mt-0.5 select-all">01713710607</p>
                                    </div>
                                    <CopyButton text="01713710607" />
                                  </div>
                                  <ul className="list-disc list-inside mt-3 text-[9px] text-slate-400 space-y-1 font-sans leading-normal">
                                    <li>Keep the Transaction ID safely from the confirmation SMS/App.</li>
                                    <li>Input the Transaction ID and your sender number below to submit.</li>
                                  </ul>
                                </div>
                              </div>
                            )}

                            {subCheckoutMethod === 'nagad' && (
                              <div className="space-y-3">
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <img 
                                      src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Nagad_Logo.svg" 
                                      alt="Nagad" 
                                      className="h-5 object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider font-sans">Send Money (Personal)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                    Please send <strong className="text-white">৳{pricing.price.toLocaleString()}</strong> using Nagad <strong className="text-orange-400">"Send Money"</strong> option to our official Personal Account number below:
                                  </p>
                                  <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-white/5">
                                    <div>
                                      <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest font-mono">Nagad Personal Number</p>
                                      <p className="text-sm font-mono font-black text-white mt-0.5 select-all">01921801100</p>
                                    </div>
                                    <CopyButton text="01921801100" />
                                  </div>
                                  <ul className="list-disc list-inside mt-3 text-[9px] text-slate-400 space-y-1 font-sans leading-normal">
                                    <li>Keep the Transaction ID safely from the confirmation SMS/App.</li>
                                    <li>Input the Transaction ID and your sender number below to submit.</li>
                                  </ul>
                                </div>
                              </div>
                            )}

                            {subCheckoutMethod === 'cash' && (
                              <div className="space-y-3">
                                <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2 text-emerald-400 text-sm font-black font-sans uppercase">
                                    <span>💵</span>
                                    <span>Direct Desk Cash Verification</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                                    Please deposit <strong className="text-white">৳{pricing.price.toLocaleString()}</strong> directly with our designated branch teller or cashier desk. If paying via cash deposit machine or an agent send-out, please use their transaction slip.
                                  </p>
                                  <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-white/5">
                                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest font-mono">Payment Counter Desk Code</p>
                                    <p className="text-xs font-sans font-bold text-slate-300 mt-1">
                                      T.U.T. Head Office Counter #4. Reference: <strong className="text-white">{profile.name}</strong>.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Core Transaction Slip Fields */}
                            <form onSubmit={handleBuySubscription} className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                                    {subCheckoutMethod === 'cash' ? 'Cash Receipt / Ref Code' : 'Sender Mobile Number'}
                                  </label>
                                  <input 
                                    required
                                    type="text"
                                    placeholder={subCheckoutMethod === 'cash' ? 'e.g. CS-91JD72' : '01XXXXXXXXX'}
                                    value={subSenderMobile}
                                    onChange={(e) => setSubSenderMobile(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-white p-3 focus:border-blue-500 focus:outline-none font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                                    Transaction ID (TrxID)
                                  </label>
                                  <input 
                                    required
                                    type="text"
                                    placeholder="e.g. TRX82K18S2"
                                    value={subTrxId}
                                    onChange={(e) => setSubTrxId(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-white p-3 focus:border-blue-500 focus:outline-none font-mono"
                                  />
                                </div>
                              </div>

                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Billing amount</span>
                                <div className="text-right">
                                  <p className="text-sm font-black text-white font-mono">৳{pricing.price.toLocaleString()}</p>
                                  <p className="text-[8px] text-slate-500 font-bold uppercase">{selectedSubTier} Tier Renewal</p>
                                </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                <button 
                                  type="button"
                                  onClick={() => setShowSubPaymentMode(false)}
                                  className="w-1/3 border border-white/10 hover:border-white/20 text-white font-bold text-xs py-3 rounded-xl uppercase transition-all"
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="submit"
                                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
                                >
                                  Submit Verification Slip
                                </button>
                              </div>
                            </form>

                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PARTNERS & BRANDS (Sponsor deals, video ads) */}
        {memberTab === 'partners' && (
          <div className="space-y-8 animate-fade-in text-left">
            {activeSponsorships.filter(s => s.status === 'active').length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Strategic Brand Collaborations</h3>
                    <p className="text-xs text-slate-400 font-medium">Exclusive promo codes, partner coupons, and support portals.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeSponsorships.filter(s => s.status === 'active').map((s) => (
                    <div 
                      key={s.id} 
                      className="glass p-6 rounded-3xl border-indigo-500/10 bg-indigo-950/10 hover:bg-indigo-950/20 relative overflow-hidden group transition-all duration-300 flex flex-col gap-3.5"
                    >
                      {/* Background glowing orb */}
                      <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all duration-700" />
                      
                      {/* Brand Header */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2.5">
                          {s.logoUrl ? (
                            <img 
                              src={s.logoUrl} 
                              alt={`${s.companyName} logo`} 
                              className="w-8 h-8 object-contain rounded-xl bg-slate-900 p-1 border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 font-black text-indigo-300 flex items-center justify-center text-xs">
                              {s.companyName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-black text-white tracking-tight leading-none mb-1">
                              {s.companyName}
                            </h4>
                            <span className="text-[7.5px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 leading-none inline-block">
                              {s.campaignType}
                            </span>
                          </div>
                        </div>
                        
                        <span className="text-[8px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          Verified Partner
                        </span>
                      </div>

                      {/* Promotion Description */}
                      <p className="text-[11px] text-blue-100/80 leading-relaxed italic">
                        "{s.promotionText}"
                      </p>

                      {/* Campaign Poster Image */}
                      {s.imageUrl && (
                        <div className="relative overflow-hidden rounded-2xl border border-white/5 w-full bg-slate-950 flex justify-center items-center">
                          <img 
                            src={s.imageUrl} 
                            alt={`${s.companyName} Campaign Poster`} 
                            className="w-full h-auto max-h-[220px] object-contain group-hover:scale-102 transition-all duration-500 block"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Coupon Copy box */}
                      {s.specialOffer && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-dashed border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left relative overflow-hidden group">
                          <div className="flex-1 min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 leading-none block">
                              Exclusive Partner Coupon
                            </span>
                            <p className="text-[11px] font-mono font-black text-amber-100 mt-1 truncate">
                              {s.specialOffer}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              handleAdClick(s.id);
                              try {
                                await navigator.clipboard.writeText(s.specialOffer || "");
                                setCopiedCouponId(s.id);
                                setTimeout(() => setCopiedCouponId(null), 3000);
                              } catch (err) {
                                alert(`Coupon Code is: ${s.specialOffer}`);
                              }
                            }}
                            className={cn(
                              "text-[8.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer flex items-center gap-1 shrink-0",
                              copiedCouponId === s.id 
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold" 
                                : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400/30 font-extrabold shadow-md active:scale-95"
                            )}
                          >
                            {copiedCouponId === s.id ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Video clip triggers */}
                      {s.videoUrl && (
                        <div className="text-left mt-1">
                          <a 
                            href={s.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={() => handleAdClick(s.id)}
                            className="inline-flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest text-[#50e3c2] hover:underline"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            Watch Promotional Video
                          </a>
                        </div>
                      )}

                      {/* Target Portal trigger */}
                      {s.targetUrl && (
                        <div className="pt-2 border-t border-white/5 mt-1">
                          <a 
                            href={s.targetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={() => handleAdClick(s.id)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1 transition-all shadow-md active:scale-[0.98]"
                          >
                            <span>Visit Partner Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-slate-900/15 border border-dashed border-indigo-500/10 rounded-3xl max-w-xl mx-auto">
                <Tag className="w-12 h-12 text-indigo-400/10 mx-auto mb-4" />
                <p className="text-indigo-400/40 font-bold uppercase tracking-widest text-xs">No active strategic partner collaborations</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE & SECURITY (NID details, address, admin portal gateway) */}
        {memberTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fade-in">
            {/* Main personal block */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Member Profile" icon={Shield} subtitle="Verified Identity Signature">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/40 p-0.5 flex-shrink-0 overflow-hidden bg-blue-600/20 flex items-center justify-center">
                      {profile.photoUrl ? (
                        <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-2xl font-black text-blue-400">{profile.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-black tracking-tight">{profile.name}</p>
                        <SubscriptionBadge tier={profile.subscriptionTier} status={profile.subscriptionStatus} expiresAtStr={profile.subscriptionExpiresAt} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile.occupation}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 font-sans text-xs">
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member ID</span>
                      <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">{profile.memberId}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NID Passport</span>
                      <span className="text-xs font-bold text-blue-100">{profile.nid}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Line</span>
                      <span className="text-xs font-bold text-blue-100">{profile.phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Residence</span>
                      <span className="text-xs font-bold text-blue-100 truncate max-w-[150px]" title={profile.address}>{profile.address}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                    <Button variant="glass" className="flex-1 py-4 text-xs uppercase tracking-[0.2em] font-black" onClick={() => setShowProfileModal(true)}>
                      <User className="w-3.5 h-3.5" />
                      Edit Profile Info
                    </Button>
                    <Button variant="outline" className="flex-1 py-4 text-xs uppercase tracking-[0.2em] font-black" onClick={() => setShowAdminLogin(true)}>
                      <Lock className="w-3.5 h-3.5" />
                      Admin Security Portal
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Side instructions block */}
            <div className="space-y-6">
              <div className="glass p-6 rounded-3xl border-blue-500/10">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Security Guarantee
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Your private ledger identity is sealed using digital cryptography keys. All loan distributions and reserves are backed by strategic institutional partnerships. Never share your credential profiles.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-blue-950/10 border border-blue-500/10 text-center">
                <HelpCircle className="w-8 h-8 text-blue-400/40 mx-auto mb-2" />
                <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Need Direct Support?</h5>
                <p className="text-[9px] text-slate-400 mt-1">Our authority officers are active 24/7. Reach support inside the nearest physical reserve.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Premium Floating Bottom Navigation Dock - Mimics Image #1 layout completely */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-white/5 py-2.5 px-4 flex justify-around md:max-w-md md:mx-auto md:rounded-t-3xl md:border-x shadow-[0_-10px_35px_rgba(0,0,0,0.8)]">
        {[
          { id: 'dashboard', label: 'Home', icon: Home },
          { id: 'memos', label: 'Vault', icon: FileText, badge: transactions.filter(t => t.status === 'pending').length },
          { id: 'subscription', label: 'Premium', icon: Award },
          { id: 'partners', label: 'Deals', icon: Briefcase },
          { id: 'profile', label: 'Profile', icon: User }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = memberTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setMemberTab(item.id as any)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-1 px-3 transition-all duration-300 relative cursor-pointer text-center min-w-[60px]",
                isSelected ? "text-blue-400" : "text-slate-400 hover:text-white"
              )}
            >
              {isSelected && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute bottom-0 inset-x-3.5 h-[2.5px] bg-blue-500 rounded-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative flex items-center justify-center">
                <Icon className={cn("w-4.5 h-4.5 transition-transform", isSelected ? "text-blue-400 scale-105" : "text-current")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white font-mono text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Real-Life Bank Style Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={handleCloseTransferModal} title="T.U.T. Funds Transfer">
        {transferSuccess ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transfer Successful</p>
              <h4 className="text-2xl font-black font-mono text-white">৳ {transferSuccess.amount.toLocaleString()}</h4>
              <p className="text-xs text-slate-400">Instantly transferred to verified account</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5 text-left text-xs font-sans">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-500 font-bold">Recipient Account</span>
                <span className="text-white font-black truncate">{transferSuccess.recipientName}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-500 font-bold">Recipient Member ID</span>
                <span className="text-amber-400 font-mono font-bold">{transferSuccess.recipientId}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-500 font-bold">Transaction Reference</span>
                <span className="text-blue-400 font-mono font-bold">{transferSuccess.memoId}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-bold">Settlement Date</span>
                <span className="text-white font-medium">{format(transferSuccess.date, 'dd MMM yyyy, HH:mm')}</span>
              </div>
            </div>

            <Button 
              onClick={handleCloseTransferModal} 
              variant="glass" 
              className="w-full py-3.5 uppercase text-xs tracking-wider font-black"
            >
              Done & Dismiss
            </Button>
          </div>
        ) : (
          <form onSubmit={handleTransferSubmit} className="space-y-5 text-left font-sans">
            {transferError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Recipient Lookup */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Recipient Identifier</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    disabled={verifiedRecipient !== null || verifyLoading}
                    value={transferIdentifier}
                    onChange={(e) => setTransferIdentifier(e.target.value)}
                    placeholder="Enter Member ID, Phone or Email"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
                  />
                  {verifiedRecipient && (
                    <span className="absolute right-3 top-3.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
                {verifiedRecipient ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setVerifiedRecipient(null);
                      setTransferIdentifier('');
                      setTransferError('');
                    }}
                    variant="outline"
                    className="px-4 text-xs h-auto"
                  >
                    Clear
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={verifyLoading}
                    onClick={handleVerifyRecipient}
                    variant="glass"
                    className="px-4 text-xs h-auto uppercase font-black"
                  >
                    {verifyLoading ? 'Checking...' : 'Verify'}
                  </Button>
                )}
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                Lookup any verified T.U.T. account securely by Member ID (e.g. <code>TUT-MBR-8833</code>), phone number, or login email address.
              </p>
            </div>

            {verifiedRecipient && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between"
              >
                <div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 block leading-none mb-1">
                    Verified Recipient Account
                  </span>
                  <h5 className="text-xs font-black text-white">{verifiedRecipient.name}</h5>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono font-bold text-amber-400">{verifiedRecipient.memberId || 'APPROVED'}</span>
                </div>
              </motion.div>
            )}

            {/* Transfer Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Transfer Amount (BDT)</label>
                <button
                  type="button"
                  onClick={() => setTransferAmount(profile.totalDeposit.toString())}
                  className="text-[9px] font-black text-blue-400 hover:underline uppercase tracking-wider cursor-pointer"
                >
                  Send Max (৳{profile.totalDeposit.toLocaleString()})
                </button>
              </div>
              <input
                type="number"
                disabled={!verifiedRecipient || transferLoading}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
              />
            </div>

            {/* Account Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Password</label>
              <div className="relative">
                <input
                  type={showTransferPassword ? "text" : "password"}
                  disabled={!verifiedRecipient || transferLoading}
                  value={transferPassword}
                  onChange={(e) => setTransferPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={!verifiedRecipient || transferLoading}
                  onClick={() => setShowTransferPassword(!showTransferPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showTransferPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[8px] text-slate-500 uppercase tracking-wide">
                Verify authority. Enter your current account login password to authorize this transfer.
              </p>
            </div>

            {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && (
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Google Quick Verification</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  You logged in via Google. Authorize this transfer instantly by re-verifying your active Google session.
                </p>
                <Button
                  type="button"
                  disabled={!verifiedRecipient || transferLoading || !transferAmount}
                  onClick={handleGoogleVerify}
                  variant="glass"
                  className="w-full py-2.5 uppercase text-[10px] tracking-wider font-black text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
                >
                  {transferLoading ? 'Authorizing...' : 'Verify with Google'}
                </Button>
              </div>
            )}

            {/* Confirm Actions */}
            <div className="pt-4 border-t border-white/5 flex gap-3">
              <Button
                type="button"
                onClick={handleCloseTransferModal}
                variant="outline"
                className="flex-1 py-3.5 uppercase text-xs tracking-wider font-black"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!verifiedRecipient || transferLoading || !transferAmount || !transferPassword}
                variant="glass"
                className="flex-1 py-3.5 uppercase text-xs tracking-wider font-black text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 disabled:opacity-40"
              >
                {transferLoading ? 'Processing...' : 'Send Transfer'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
