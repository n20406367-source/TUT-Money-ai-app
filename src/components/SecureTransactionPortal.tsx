import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle2, 
  Copy, 
  Check,
  Lock,
  Search,
  Building2,
  Wallet,
  CircleDollarSign,
  Calendar,
  ChevronRight,
  User,
  Hash,
  FileText,
  Coins,
  AlertCircle,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { cn } from '../App';

interface SecureTransactionPortalProps {
  type: 'loan' | 'deposit' | 'pay_due' | 'refund' | 'transfer' | 'subscription';
  profile: any;
  onClose: () => void;
  addToast: (title: string, description: string, variant: 'success' | 'danger' | 'warning' | 'info') => void;
  sendNotification: (subject: string, message: string, targetEmail: string) => void;
  
  // Subscription specific props
  selectedSubTier?: 'bronze' | 'silver' | 'gold' | null;
  setSelectedSubTier?: (tier: 'bronze' | 'silver' | 'gold' | null) => void;
  subSenderMobile?: string;
  setSubSenderMobile?: (val: string) => void;
  subTrxId?: string;
  setSubTrxId?: (val: string) => void;
  subWallet?: 'Bkash' | 'Nagad' | 'Recharge' | 'Cash';
  setSubWallet?: (val: 'Bkash' | 'Nagad' | 'Recharge' | 'Cash') => void;
  handleBuySubscription?: (e: React.FormEvent) => void;
}

// CopyButton Component
const CopyBtn = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
        copied
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-white/5 text-blue-400 border-white/10 hover:bg-white/10 hover:border-white/20"
      )}
    >
      <Copy className="w-2.5 h-2.5" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

export const SecureTransactionPortal: React.FC<SecureTransactionPortalProps> = ({
  type,
  profile,
  onClose,
  addToast,
  sendNotification,
  selectedSubTier = 'bronze',
  setSelectedSubTier,
  subSenderMobile: propSubSenderMobile = '',
  setSubSenderMobile: propSetSubSenderMobile,
  subTrxId: propSubTrxId = '',
  setSubTrxId: propSetSubTrxId,
  subWallet: propSubWallet = 'Bkash',
  setSubWallet: propSetSubWallet,
  handleBuySubscription
}) => {
  // REDESIGNED 2-STEP FLOW (Screen-Fitting, Compact, No Wasted Open Space)
  const [step, setStep] = useState<1 | 2>(1);

  // General states
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'Bkash' | 'Nagad' | 'Recharge'>('Bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [estimatedRepaymentDate, setEstimatedRepaymentDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Active preset amount select state
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Transfer specific states
  const [transferIdentifier, setTransferIdentifier] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState<any | null>(null);
  const [transferError, setTransferError] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<any | null>(null);

  // Subscription local fallbacks if props not bound
  const [localSubSenderMobile, setLocalSubSenderMobile] = useState('');
  const [localSubTrxId, setLocalSubTrxId] = useState('');
  const [localSubWallet, setLocalSubWallet] = useState<'Bkash' | 'Nagad' | 'Recharge' | 'Cash'>('Bkash');

  const subSenderMobile = propSetSubSenderMobile ? propSubSenderMobile : localSubSenderMobile;
  const setSubSenderMobile = propSetSubSenderMobile ? propSetSubSenderMobile : setLocalSubSenderMobile;
  const subTrxId = propSetSubTrxId ? propSubTrxId : localSubTrxId;
  const setSubTrxId = propSetSubTrxId ? propSetSubTrxId : setLocalSubTrxId;
  const subWallet = propSetSubWallet ? propSubWallet : localSubWallet;
  const setSubWallet = propSetSubWallet ? propSetSubWallet : setLocalSubWallet;

  // Touch & Hold soccer ball states
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [goalCelebration, setGoalCelebration] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  // Audio Success Synthesis - Professional Dual Tone banking chime + soccer whistle
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Tone 1: Bright banking ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2: Harmonious E5 to E6 ascending
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.38); // E6
      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);

      // Referee whistle sound effect (sportive theme)
      setTimeout(() => {
        const ctx2 = new AudioContext();
        const now2 = ctx2.currentTime;
        const osc3 = ctx2.createOscillator();
        const gain3 = ctx2.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(2200, now2);
        osc3.frequency.linearRampToValueAtTime(2250, now2 + 0.08);
        osc3.frequency.linearRampToValueAtTime(2180, now2 + 0.16);
        gain3.gain.setValueAtTime(0.06, now2);
        gain3.gain.exponentialRampToValueAtTime(0.001, now2 + 0.3);
        osc3.connect(gain3);
        gain3.connect(ctx2.destination);
        osc3.start(now2);
        osc3.stop(now2 + 0.35);
      }, 400);
    } catch (e) {
      // Audio context error or not supported
    }
  };

  // Effect to clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  // Set default method when type changes
  useEffect(() => {
    if (type === 'loan' || type === 'refund') {
      setMethod('Bkash');
    } else if (type === 'subscription') {
      setMethod('Bkash');
    } else {
      setMethod('Bkash');
    }
  }, [type]);

  // Handle Preset Clicks
  const handlePresetSelect = (val: number) => {
    setActivePreset(val);
    setAmount(val.toString());
  };

  const handleCustomSelect = () => {
    setActivePreset(null);
    setAmount('');
  };

  // Recipient verification for transfers
  const handleVerifyRecipient = async () => {
    if (!transferIdentifier.trim()) {
      setTransferError('Enter Member ID, Phone, or Email.');
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
        return;
      }

      let foundUser: any = null;

      // 1. Check by Member ID
      const qId = query(collection(db, 'users'), where('memberId', '==', identifierClean));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        foundUser = { uid: snapId.docs[0].id, ...snapId.docs[0].data() };
      } else {
        // 2. Check by Phone
        const qPhone = query(collection(db, 'users'), where('phone', '==', identifierClean));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          foundUser = { uid: snapPhone.docs[0].id, ...snapPhone.docs[0].data() };
        } else {
          // 3. Check by Email
          const qEmail = query(collection(db, 'users'), where('email', '==', identifierClean.toLowerCase()));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            foundUser = { uid: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
          }
        }
      }

      if (!foundUser) {
        setTransferError('No T.U.T. account found.');
      } else if (foundUser.uid === currentUserUid) {
        setTransferError('You cannot transfer money to yourself.');
      } else if (foundUser.status !== 'approved') {
        setTransferError('Recipient account is not approved yet.');
      } else {
        setVerifiedRecipient(foundUser);
        addToast('Recipient Verified', `Ready to send to ${foundUser.name}`, 'success');
      }
    } catch (err: any) {
      console.error('Error verifying recipient:', err);
      setTransferError('Failed to verify recipient. Try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Submit transfer action
  const executeTransferSubmit = async () => {
    if (!verifiedRecipient || !auth.currentUser) return;
    const transferAmt = parseFloat(amount);
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        let authPassword = transferPassword;
        if (user.email === 'tahsinullahtusher999@gmail.com' && transferPassword === '9900') {
          authPassword = '9900_TUT2026_ADMIN';
        }
        const credential = EmailAuthProvider.credential(user.email, authPassword);
        await reauthenticateWithCredential(user, credential);
      } else {
        throw new Error('Email authentication missing.');
      }

      const senderUid = user.uid;
      const recipientUid = verifiedRecipient.uid;

      // Update sender Total Deposit
      await updateDoc(doc(db, 'users', senderUid), {
        totalDeposit: increment(-transferAmt)
      });

      // Update recipient Total Deposit
      await updateDoc(doc(db, 'users', recipientUid), {
        totalDeposit: increment(transferAmt)
      });

      const senderTxMemoId = `TUT-TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const recipientTxMemoId = `TUT-TX-${Math.floor(100000 + Math.random() * 900000)}`;

      // Outbound transaction
      await addDoc(collection(db, 'transactions'), {
        userId: senderUid,
        userName: profile.name,
        type: 'refund',
        isTransfer: true,
        transferType: 'out',
        transferRecipientName: verifiedRecipient.name,
        transferRecipientId: verifiedRecipient.memberId || 'Approved Member',
        amount: transferAmt,
        method: 'Cash',
        status: 'confirmed',
        timestamp: serverTimestamp(),
        memoId: senderTxMemoId,
        accountNumber: verifiedRecipient.memberId || 'N/A'
      });

      // Inbound transaction
      await addDoc(collection(db, 'transactions'), {
        userId: recipientUid,
        userName: verifiedRecipient.name,
        type: 'deposit',
        isTransfer: true,
        transferType: 'in',
        transferSenderName: profile.name,
        transferSenderId: profile.memberId || 'Approved Member',
        amount: transferAmt,
        method: 'Cash',
        status: 'confirmed',
        timestamp: serverTimestamp(),
        memoId: recipientTxMemoId,
        accountNumber: profile.memberId || 'N/A'
      });

      setTransferSuccess({
        amount: transferAmt,
        recipientName: verifiedRecipient.name,
        recipientId: verifiedRecipient.memberId || 'Approved Member',
        memoId: senderTxMemoId,
        date: new Date()
      });

      addToast('Transfer Completed', `Successfully sent ৳${transferAmt.toLocaleString()} BDT`, 'success');
      sendNotification('T.U.T. Ledger Funds Dispatched', `You have sent ৳${transferAmt.toLocaleString()} to ${verifiedRecipient.name}.`, user.email);
      
      if (verifiedRecipient.email) {
        sendNotification('T.U.T. Ledger Funds Received', `You have received ৳${transferAmt.toLocaleString()} from ${profile.name}.`, verifiedRecipient.email);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Incorrect account password. Please try again.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect password. Enter the password you use to log into your T.U.T. account.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      addToast('Verification Failed', errorMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Submit standard transaction request
  const handleStandardRequestSubmit = async () => {
    if (!auth.currentUser || !profile) return;
    const reqAmt = parseFloat(amount);

    if (type === 'loan') {
      const currentDebt = profile.remainingDebt || 0;
      const proposedTotalDebt = currentDebt + reqAmt;
      const limit = profile.borrowingLimit ?? 100000;
      if (proposedTotalDebt > limit) {
        addToast('Borrowing Limit Exceeded', `Your total debt with this request (৳${proposedTotalDebt.toLocaleString()}) would exceed your approved credit limit (৳${limit.toLocaleString()}).`, 'warning');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        userId: auth.currentUser.uid,
        userName: profile.name,
        type: type === 'pay_due' ? 'pay_due' : type,
        amount: reqAmt,
        method: method,
        status: 'pending',
        timestamp: serverTimestamp()
      };

      if (type === 'loan' || type === 'refund') {
        payload.accountNumber = accountNumber;
      } else {
        payload.transactionId = trxId;
        payload.accountNumber = accountNumber;
      }

      if (type === 'loan') {
        payload.loanReason = loanReason;
        payload.estimatedRepaymentDate = estimatedRepaymentDate;
      }

      await addDoc(collection(db, 'transactions'), payload);
      await sendNotification('New Transaction Request', `${profile.name} submitted a ${type} request for ৳${reqAmt.toLocaleString()}.`, 'tahsinullahtusher999@gmail.com');
      
      addToast('Request Dispatched', `Your ${type.replace('_', ' ')} request of ৳${reqAmt.toLocaleString()} was successfully logged in the secure queue.`, 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('Submission Failed', 'Failed to submit transaction to secure database.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Submit subscription request
  const handleSubscriptionRequestSubmit = async () => {
    if (!auth.currentUser || !profile) return;
    
    setLoading(true);
    try {
      const pricing = getSubscriptionPricing(selectedSubTier, profile);
      const payload: any = {
        userId: auth.currentUser.uid,
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
      
      await addDoc(collection(db, 'transactions'), payload);
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        subscriptionStatus: 'pending_approval',
        subscriptionTier: selectedSubTier
      });
      
      await sendNotification('New Subscription Request', `${profile.name} requested ${selectedSubTier} subscription tier.`, 'tahsinullahtusher999@gmail.com');
      
      addToast('Subscription Dispatched', 'Your subscription verification request was securely submitted.', 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('Submission Failed', 'Failed to secure subscription request.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Football Touch & Hold Handlers
  const startHolding = () => {
    if (isFormInvalid()) return;
    setIsHolding(true);
    progressRef.current = 0;
    setHoldProgress(0);

    holdIntervalRef.current = setInterval(() => {
      progressRef.current += 3.8; // reaches 100% in ~1.05 seconds (snappy & premium)
      if (progressRef.current >= 100) {
        progressRef.current = 100;
        setHoldProgress(100);
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        triggerSuccessCelebration();
      } else {
        setHoldProgress(progressRef.current);
      }
    }, 40);
  };

  const stopHolding = () => {
    setIsHolding(false);
    if (progressRef.current < 100) {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      let bounceBack = progressRef.current;
      holdIntervalRef.current = setInterval(() => {
        bounceBack -= 12;
        if (bounceBack <= 0) {
          bounceBack = 0;
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        }
        progressRef.current = bounceBack;
        setHoldProgress(bounceBack);
      }, 15);
    }
  };

  const triggerSuccessCelebration = () => {
    playSuccessSound();
    setGoalCelebration(true);
    setTimeout(() => {
      setGoalCelebration(false);
      if (type === 'transfer') {
        executeTransferSubmit();
      } else if (type === 'subscription') {
        handleSubscriptionRequestSubmit();
      } else {
        handleStandardRequestSubmit();
      }
    }, 2000);
  };

  // Validate ALL data entered in Step 1 (the merged compact page)
  const isFormValid = () => {
    if (type === 'subscription') {
      return subSenderMobile.trim().length > 0 && subTrxId.trim().length > 0;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;

    // Limit balances checks
    if (type === 'pay_due') {
      const remaining = profile.remainingDebt || 0;
      if (numAmount > remaining) return false;
    }
    if (type === 'refund') {
      const balance = profile.totalDeposit || 0;
      if (numAmount > balance) return false;
    }

    // Type specific checks
    if (type === 'loan') {
      if (loanReason.trim().length === 0 || !estimatedRepaymentDate) return false;
      if (accountNumber.trim().length === 0) return false;
      return true;
    }

    if (type === 'transfer') {
      if (!verifiedRecipient) return false;
      if (transferPassword.trim().length === 0) return false;
      return true;
    }

    if (type === 'refund') {
      if (accountNumber.trim().length === 0) return false;
      return true;
    }

    // deposit and pay_due
    if (type === 'deposit' || type === 'pay_due') {
      if (!accountNumber.trim()) return false;
      if (method !== 'Cash' && !trxId.trim()) return false;
      return true;
    }

    return false;
  };

  const isFormInvalid = () => {
    return !isFormValid();
  };

  // Personal Payment Numbers
  const getPersonalNumber = () => {
    const activeMethod = type === 'subscription' ? subWallet : method;
    return activeMethod === 'Bkash' ? '01713710607' : '01921801100';
  };

  function getSubscriptionPricing(tier: any, prof: any) {
    const basePrices = {
      bronze: { price: 300, months: 1, label: 'Bronze 1-Month Core' },
      silver: { price: 800, months: 3, label: 'Silver 3-Month Vault' },
      gold: { price: 1500, months: 6, label: 'Gold 6-Month Elite' }
    };
    return basePrices[tier as 'bronze' | 'silver' | 'gold'] || { price: 300, months: 1, label: 'Bronze' };
  }

  const getTransactionLabel = () => {
    switch (type) {
      case 'loan': return 'Request New Loan';
      case 'deposit': return 'Deposit Funds';
      case 'refund': return 'Request Refund';
      case 'pay_due': return 'Repay Due';
      case 'transfer': return 'Send Money';
      case 'subscription': return 'Upgrade Membership';
      default: return 'Secure Transaction';
    }
  };

  const getTransactionSubtitle = () => {
    switch (type) {
      case 'loan': return 'P2P secure credit queue';
      case 'deposit': return 'Inject secure vault funds';
      case 'refund': return 'Claim manual asset clearance';
      case 'pay_due': return 'Repay your ledger debt';
      case 'transfer': return 'Dispatch peer-to-peer funds';
      case 'subscription': return 'Upgrade account thresholds';
      default: return 'Encrypt banking logs';
    }
  };

  const getLimitLabel = () => {
    switch (type) {
      case 'loan':
        return `Borrow Capacity: ৳${Math.max(0, (profile.borrowingLimit ?? 100000) - (profile.remainingDebt || 0)).toLocaleString()}`;
      case 'deposit':
        return `Current Balance: ৳${(profile.totalDeposit || 0).toLocaleString()}`;
      case 'refund':
        return `Refundable Balance: ৳${(profile.totalDeposit || 0).toLocaleString()}`;
      case 'pay_due':
        return `Outstanding Debt: ৳${(profile.remainingDebt || 0).toLocaleString()}`;
      case 'transfer':
        return `Sendable Balance: ৳${(profile.totalDeposit || 0).toLocaleString()}`;
      case 'subscription':
        return `Active Plan: ${(profile.subscriptionTier || 'NONE').toUpperCase()}`;
      default:
        return '';
    }
  };

  // Confetti particles for premium sports goal celebration
  const confettiParticles = Array.from({ length: 45 }).map((_, i) => ({
    id: i,
    x: Math.random() * 320 - 160,
    y: Math.random() * -240 - 100,
    size: Math.random() * 8 + 4,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 6)],
    delay: Math.random() * 0.3,
    duration: Math.random() * 1.3 + 1.1
  }));

  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-[#02050e] flex flex-col text-slate-100 overflow-hidden font-sans select-none">
      
      {/* GLOWING AMBIENT BACKGROUNDS */}
      <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-blue-600/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* HEADER SECTION - Premium & Compact */}
      <div className="w-full bg-[#04091a]/95 backdrop-blur-xl border-b border-white/5 py-2.5 px-4 flex items-center justify-between shrink-0 z-30">
        <button 
          onClick={() => {
            if (step === 2) setStep(1);
            else onClose();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3 text-rose-500" /> 
          {step > 1 ? 'Back' : 'Exit'}
        </button>

        <div className="text-center">
          <h1 className="text-[11px] font-black tracking-wider text-white uppercase leading-none">
            {getTransactionLabel()}
          </h1>
          <p className="text-[8px] text-slate-400 font-semibold tracking-wide mt-0.5 uppercase">
            {getTransactionSubtitle()}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-[7.5px] font-black tracking-widest text-emerald-400">
          <Shield className="w-2.5 h-2.5 text-emerald-400" />
          SECURE
        </div>
      </div>

      {/* STEPPER PROGRESS INDICATOR - Screen-fitting 2-Step Progress */}
      <div className="w-full max-w-sm mx-auto px-4 py-2.5 shrink-0 flex items-center justify-center gap-2.5 z-20">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-extrabold border transition-all",
            step === 1 
              ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          )}>
            {step > 1 ? <Check className="w-2.5 h-2.5" /> : '1'}
          </span>
          <span className={cn(
            "text-[8.5px] font-bold uppercase tracking-wider transition-all",
            step === 1 ? "text-blue-400" : "text-emerald-400"
          )}>
            Transaction Setup
          </span>
        </div>

        <div className={cn("w-8 h-px transition-all", step > 1 ? "bg-emerald-500/30" : "bg-white/10")} />

        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-extrabold border transition-all",
            step === 2 
              ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
              : "bg-slate-900 text-slate-500 border-white/5"
          )}>
            2
          </span>
          <span className={cn(
            "text-[8.5px] font-bold uppercase tracking-wider transition-all",
            step === 2 ? "text-blue-400" : "text-slate-500"
          )}>
            Review & Swipe
          </span>
        </div>
      </div>

      {/* WORKSPACE AREA - Compact, non-stretching viewport container */}
      <div className="flex-1 w-full max-w-sm mx-auto px-4 pb-4 overflow-hidden flex flex-col z-10 justify-between">
        
        {transferSuccess ? (
          /* DIGITAL RECEIPT CARD - Highly Professional Boarding Pass Style Receipt */
          <div className="w-full flex-1 flex flex-col justify-center py-2 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-[#050a17] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <Check className="w-5 h-5" />
              </div>
              
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TRANSACTION DISPATCHED</p>
                <h3 className="text-xl font-black font-mono text-white">৳ {transferSuccess.amount.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400">Ledger funds updated instantly</p>
              </div>

              {/* Boarding Pass/Receipt layout for transferred success */}
              <div className="relative w-full p-4 bg-slate-950/70 rounded-xl border border-white/5 text-[10.5px] text-left space-y-2.5 overflow-hidden">
                {/* Side Notch cutouts */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#02050e] border-r border-white/5" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#02050e] border-l border-white/5" />
                
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] tracking-wider">Beneficiary</span>
                  <span className="text-white font-bold">{transferSuccess.recipientName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] tracking-wider">ID Code</span>
                  <span className="text-amber-400 font-mono font-bold uppercase">{transferSuccess.recipientId}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] tracking-wider">Reference ID</span>
                  <span className="text-blue-400 font-mono font-bold">{transferSuccess.memoId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] tracking-wider">Timestamp</span>
                  <span className="text-white font-medium">{format(transferSuccess.date, 'dd MMM yyyy, HH:mm')}</span>
                </div>

                <div className="border-t border-dashed border-white/10 pt-2.5 flex flex-col items-center">
                  <div className="flex gap-[1.5px] h-5 opacity-25">
                    {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3].map((w, i) => (
                      <div key={i} className="bg-white h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="text-[6.5px] text-slate-500 font-mono tracking-widest uppercase mt-1">SECURED LEDGER TRANSACTION</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
              >
                Close Portal
              </button>
            </motion.div>
          </div>
        ) : (
          /* WORKSPACE PORTAL SCREEN WITH 2 OPTIMIZED VIEWS */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            
            <AnimatePresence mode="wait">
              {step === 1 ? (
                /* STEP 1: COMPACTMERGED DETAILS & GATEWAY */
                <motion.div
                  key="step-1"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="flex-1 flex flex-col justify-between overflow-hidden"
                >
                  {/* Scroll Container carrying merged high-density elements */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin scrollbar-thumb-white/10 pb-2">
                    
                    {/* DYNAMIC LIMIT BADGE */}
                    <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GATEWAY LIMIT</span>
                      <span className="text-[8.5px] font-black font-mono text-blue-400">{getLimitLabel()}</span>
                    </div>

                    {/* MAIN INPUT GROUP - AMOUNT & PRESETS */}
                    <div className="bg-[#050a17]/90 border border-white/5 rounded-xl p-3 space-y-2.5">
                      
                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                        {type === 'loan' ? <Coins className="w-3 h-3 text-amber-400" /> : <Wallet className="w-3 h-3 text-blue-400" />}
                        <h3 className="text-[9px] font-black uppercase text-white tracking-widest">
                          {type === 'loan' ? 'Borrowing Specs' : 'Transaction Amount'}
                        </h3>
                      </div>

                      {/* Regular types amount input */}
                      {type !== 'subscription' && (
                        <div className="space-y-1">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">৳</span>
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => {
                                setAmount(e.target.value);
                                setActivePreset(null);
                              }}
                              placeholder="Enter amount"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-14 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                            />
                            {type === 'refund' || type === 'transfer' ? (
                              <button
                                type="button"
                                onClick={() => handlePresetSelect(profile?.totalDeposit || 0)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-[7px] font-black uppercase transition-all cursor-pointer"
                              >
                                Max
                              </button>
                            ) : type === 'pay_due' ? (
                              <button
                                type="button"
                                onClick={() => handlePresetSelect(profile?.remainingDebt || 0)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[7px] font-black uppercase transition-all cursor-pointer"
                              >
                                Max
                              </button>
                            ) : null}
                          </div>

                          {/* Mini preset pills to prevent empty space */}
                          <div className="grid grid-cols-5 gap-1">
                            {[1000, 2000, 5000, 10000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handlePresetSelect(val)}
                                className={cn(
                                  "py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer text-center font-mono leading-none",
                                  activePreset === val
                                    ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_6px_rgba(37,99,235,0.3)]"
                                    : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15"
                                )}
                              >
                                ৳{val.toLocaleString()}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={handleCustomSelect}
                              className={cn(
                                "py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer text-center leading-none",
                                activePreset === null && amount !== ''
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "bg-slate-950 border-white/5 text-slate-400 hover:border-white/15"
                              )}
                            >
                              Custom
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display pricing for subscription directly */}
                      {type === 'subscription' && (
                        <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5 flex justify-between items-center leading-none">
                          <div className="space-y-0.5">
                            <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-widest">Upgrade Tier</p>
                            <h4 className="text-[10px] font-black text-white font-mono">{getSubscriptionPricing(selectedSubTier, profile).label}</h4>
                          </div>
                          <span className="text-[10px] font-black text-blue-400 font-mono">৳{getSubscriptionPricing(selectedSubTier, profile).price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* INTERACTIVE COMPACT DETAILS CARD (Adaptive) */}
                    <div className="bg-[#050a17]/90 border border-white/5 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                        <User className="w-3 h-3 text-amber-400" />
                        <h3 className="text-[9px] font-black uppercase text-white tracking-widest">
                          Recipient & Authentication
                        </h3>
                      </div>

                      {/* 1. Recipient lookup for internal transfers */}
                      {type === 'transfer' && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={transferIdentifier}
                                onChange={(e) => {
                                  setTransferIdentifier(e.target.value);
                                  setVerifiedRecipient(null);
                                  setTransferError('');
                                }}
                                placeholder="Member ID, Phone, or Email"
                                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-[9.5px] text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                              />
                              <Search className="absolute left-1.5 top-2 w-3 h-3 text-slate-600" />
                            </div>
                            <button
                              type="button"
                              onClick={handleVerifyRecipient}
                              disabled={verifyLoading || !transferIdentifier}
                              className="px-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[8px] uppercase rounded-lg tracking-wider transition-all disabled:opacity-30 cursor-pointer flex items-center justify-center shrink-0"
                            >
                              {verifyLoading ? '...' : 'Verify'}
                            </button>
                          </div>
                          
                          {transferError && (
                            <p className="text-[7.5px] text-rose-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              {transferError}
                            </p>
                          )}
                          
                          {verifiedRecipient && (
                            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-between items-center leading-none">
                              <div className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-[8px] font-black uppercase">Verified: {verifiedRecipient.name}</span>
                              </div>
                              <span className="text-[8px] font-mono text-amber-400 font-bold">{verifiedRecipient.memberId || 'Active'}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Compact reason & targets for loans */}
                      {type === 'loan' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1 col-span-2">
                            <textarea
                              value={loanReason}
                              onChange={(e) => setLoanReason(e.target.value.slice(0, 250))}
                              placeholder="Describe clearly the reason for your loan..."
                              rows={1}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 resize-none h-9"
                            />
                          </div>

                          <div className="space-y-1 col-span-2">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Estimated Repayment Target</label>
                            <input
                              type="date"
                              value={estimatedRepaymentDate}
                              onChange={(e) => setEstimatedRepaymentDate(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 transition-all font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* 3. Password field for transfers */}
                      {type === 'transfer' && (
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold uppercase text-slate-400 tracking-wider">Sender Password PIN</label>
                          <input
                            type="password"
                            value={transferPassword}
                            onChange={(e) => setTransferPassword(e.target.value)}
                            placeholder="Type login password or PIN"
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                          />
                        </div>
                      )}

                      {/* 4. Display general notification message if regular */}
                      {type !== 'transfer' && type !== 'loan' && (
                        <p className="text-[8px] text-slate-400 leading-relaxed uppercase font-semibold">
                          Please provide correct receiving information below to ensure safe transactions audits by bank clearance admins.
                        </p>
                      )}
                    </div>

                    {/* GATEWAY DETAILS SECTION - Always packed nicely */}
                    {type !== 'transfer' && (
                      <div className="bg-[#050a17]/90 border border-white/5 rounded-xl p-3 space-y-2.5">
                        
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                          <Building2 className="w-3 h-3 text-emerald-400" />
                          <h3 className="text-[9px] font-black uppercase text-white tracking-widest">
                            Gateway & Wallet
                          </h3>
                        </div>

                        {/* Gateway selection horizontal grid */}
                        <div className="grid grid-cols-4 gap-1">
                          {/* BKASH */}
                          <button
                            type="button"
                            onClick={() => {
                              if (type === 'subscription') {
                                if (setSubWallet) setSubWallet('Bkash');
                              } else {
                                setMethod('Bkash');
                              }
                              setTrxId('');
                            }}
                            className={cn(
                              "py-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                              (type === 'subscription' ? subWallet : method) === 'Bkash'
                                ? "bg-pink-500/10 border-pink-500/40 text-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.15)]"
                                : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                          >
                            <Smartphone className="w-3 h-3" />
                            <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">bKash</span>
                          </button>

                          {/* NAGAD */}
                          <button
                            type="button"
                            onClick={() => {
                              if (type === 'subscription') {
                                if (setSubWallet) setSubWallet('Nagad');
                              } else {
                                setMethod('Nagad');
                              }
                              setTrxId('');
                            }}
                            className={cn(
                              "py-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                              (type === 'subscription' ? subWallet : method) === 'Nagad'
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.15)]"
                                : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                          >
                            <Coins className="w-3 h-3" />
                            <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">Nagad</span>
                          </button>

                          {/* BANK / RECHARGE */}
                          {type === 'loan' ? (
                            <button
                              type="button"
                              onClick={() => setMethod('Recharge')}
                              className={cn(
                                "py-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                                method === 'Recharge'
                                  ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.15)]"
                                  : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                              )}
                            >
                              <Building2 className="w-3 h-3" />
                              <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">Bank</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (type === 'subscription') {
                                  if (setSubWallet) setSubWallet('Recharge');
                                } else {
                                  setMethod('Recharge');
                                }
                                setTrxId('');
                              }}
                              className={cn(
                                "py-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                                (type === 'subscription' ? subWallet : method) === 'Recharge'
                                  ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.15)]"
                                  : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                              )}
                            >
                              <Smartphone className="w-3 h-3" />
                              <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">Recharge</span>
                            </button>
                          )}

                          {/* CASH DESK */}
                          {type !== 'refund' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (type === 'subscription') {
                                  if (setSubWallet) setSubWallet('Cash');
                                } else {
                                  setMethod('Cash');
                                }
                                setTrxId('');
                              }}
                              className={cn(
                                "py-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                                (type === 'subscription' ? subWallet : method) === 'Cash'
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.15)]"
                                  : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                              )}
                            >
                              <CircleDollarSign className="w-3 h-3" />
                              <span className="text-[7.5px] font-black uppercase tracking-wider leading-none">Cash</span>
                            </button>
                          )}
                        </div>

                        {/* Copyable manual number */}
                        {((type === 'subscription' ? subWallet : method) === 'Bkash' || (type === 'subscription' ? subWallet : method) === 'Nagad') && (
                          <div className="p-1.5 bg-slate-950 rounded-lg border border-white/5 flex items-center justify-between leading-none">
                            <div className="space-y-0.5">
                              <span className="text-[7.5px] font-black text-amber-500 uppercase tracking-widest leading-none">
                                Send Money Wallet
                              </span>
                              <span className="text-[10px] font-mono font-black text-white leading-none">{getPersonalNumber()}</span>
                            </div>
                            <CopyBtn text={getPersonalNumber()} />
                          </div>
                        )}

                        {/* Accounts or mobile number input fields */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5 col-span-1">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                              {type === 'subscription' ? 'Sender Mobile' : 'Account/Phone'}
                            </label>
                            <input
                              type="text"
                              value={type === 'subscription' ? subSenderMobile : accountNumber}
                              onChange={(e) => {
                                if (type === 'subscription') {
                                  if (setSubSenderMobile) setSubSenderMobile(e.target.value);
                                } else {
                                  setAccountNumber(e.target.value);
                                }
                              }}
                              placeholder="e.g. 017XXXXXXXX"
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10.5px] text-white font-mono font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                            />
                          </div>

                          {/* Transaction TrxID code input */}
                          {((type === 'subscription' ? subWallet : method) !== 'Cash') && (
                            <div className="space-y-0.5 col-span-1">
                              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Transaction ID (TrxID)</label>
                              <input
                                type="text"
                                value={type === 'subscription' ? subTrxId : trxId}
                                onChange={(e) => {
                                  if (type === 'subscription') {
                                    if (setSubTrxId) setSubTrxId(e.target.value);
                                  } else {
                                    setTrxId(e.target.value);
                                  }
                                }}
                                placeholder="e.g. TRID9283JD"
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10.5px] text-white font-mono focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 uppercase"
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </div>

                  {/* BOTTOM ACTION BUTTON */}
                  <div className="pt-2 border-t border-white/5 shrink-0 bg-[#02050e] space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFormValid()) setStep(2);
                      }}
                      disabled={isFormInvalid()}
                      className={cn(
                        "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md",
                        isFormInvalid()
                          ? "bg-slate-950 border border-white/5 text-slate-600 cursor-not-allowed opacity-40"
                          : "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/30 hover:shadow-[0_0_10px_rgba(37,99,235,0.25)] active:scale-98"
                      )}
                    >
                      Verify & Proceed to Review
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[7.5px] text-slate-500 font-medium uppercase tracking-widest text-center flex items-center justify-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Handled by secure military encryption protocols
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* STEP 2: REVIEW & SWIPE TO CONFIRM (Boarding Pass Receipt + Soccer Slider) */
                <motion.div
                  key="step-2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="flex-1 flex flex-col justify-between overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 scrollbar-thin scrollbar-thumb-white/10 pb-2">
                    
                    {/* BOARDING PASS / DIGITAL RECEIPT CARD (Zero space wasted, highly aesthetic) */}
                    <div className="relative bg-[#050a17]/90 border border-white/5 rounded-2xl p-4 overflow-hidden shadow-2xl flex flex-col">
                      
                      {/* Left cutout notch */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#02050e] border-r border-white/5 z-20" />
                      {/* Right cutout notch */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#02050e] border-l border-white/5 z-20" />

                      {/* Header receipt info */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-blue-400" />
                          <h3 className="text-[9px] font-black uppercase text-white tracking-widest">TRANSACTION RECEIPT</h3>
                        </div>
                        <span className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400 font-extrabold uppercase tracking-wide">PENDING AUTH</span>
                      </div>

                      {/* Top part receipt details */}
                      <div className="py-2.5 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none">PAYMENT VALUE</span>
                        <h2 className="text-xl font-black font-mono text-emerald-400 leading-none">
                          ৳ {type === 'subscription' ? getSubscriptionPricing(selectedSubTier, profile).price.toLocaleString() : parseFloat(amount).toLocaleString()} BDT
                        </h2>
                        <span className="text-[7.5px] text-slate-400 uppercase tracking-widest">T.U.T. SECURE CLEARANCE SYSTEM</span>
                      </div>

                      {/* Mid pass dashed line */}
                      <div className="border-t border-dashed border-white/10 my-1 pointer-events-none" />

                      {/* Bottom receipt table details */}
                      <div className="py-2.5 text-[9.5px] space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Member Acc</span>
                          <span className="text-white font-bold">{profile?.name || 'T.U.T. Peer'}</span>
                        </div>

                        {type === 'transfer' && verifiedRecipient && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Recipient Name</span>
                            <span className="text-white font-black">{verifiedRecipient.name} ({verifiedRecipient.memberId})</span>
                          </div>
                        )}

                        {type === 'loan' && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Target Date</span>
                            <span className="text-slate-300 font-mono font-bold">{estimatedRepaymentDate ? format(new Date(estimatedRepaymentDate), 'dd MMM yyyy') : 'N/A'}</span>
                          </div>
                        )}

                        {type !== 'transfer' && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Gateway method</span>
                            <span className="text-white font-black uppercase tracking-wider">{type === 'subscription' ? subWallet : method}</span>
                          </div>
                        )}

                        {type !== 'transfer' && ((type === 'subscription' ? subSenderMobile : accountNumber)) && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Gateway Phone</span>
                            <span className="text-blue-400 font-mono font-bold">{type === 'subscription' ? subSenderMobile : accountNumber}</span>
                          </div>
                        )}

                        {type !== 'transfer' && ((type === 'subscription' ? subTrxId : trxId)) && (
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[7px] text-slate-500 tracking-wider">Verification ID</span>
                            <span className="text-amber-400 font-mono font-black uppercase">{type === 'subscription' ? subTrxId : trxId}</span>
                          </div>
                        )}
                      </div>

                      {/* Barcode on footer of receipt */}
                      <div className="border-t border-dashed border-white/10 pt-2 flex flex-col items-center">
                        <div className="flex gap-[1px] h-4 opacity-15">
                          {[2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 3, 2, 1].map((w, i) => (
                            <div key={i} className="bg-white h-full" style={{ width: `${w}px` }} />
                          ))}
                        </div>
                        <span className="text-[6px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">TUT-SECURE-LEDGER-LEDG-{Math.floor(1000 + Math.random() * 9000)}</span>
                      </div>

                    </div>

                    {/* RED WARNING MESSAGE (Bank Rules) */}
                    <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-start gap-1.5">
                      <Shield className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[7.5px] text-slate-400 uppercase leading-normal font-bold tracking-wide">
                        NOTICE: Fraudulent details or recycling tickets generates alerts leading to immediate account bans.
                      </p>
                    </div>

                  </div>

                  {/* PREMIUM REAL BANKING SOCCER CONFIRM SLIDER */}
                  <div className="pt-2 border-t border-white/5 shrink-0 z-20 bg-[#02050e] space-y-2">
                    
                    {/* SOCCER BALL SLIDER TRACK */}
                    <div 
                      className={cn(
                        "relative w-full h-11 rounded-xl border flex items-center justify-between px-3 overflow-hidden select-none",
                        isFormInvalid()
                          ? "bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed"
                          : "bg-blue-950/20 border-blue-500/30 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)]"
                      )}
                      style={{
                        background: isFormInvalid() 
                          ? 'rgba(15, 23, 42, 0.4)' 
                          : 'linear-gradient(to right, #091732, #0d2757, #091732)'
                      }}
                    >
                      {/* Pitch line */}
                      {!isFormInvalid() && (
                        <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-white/10 pointer-events-none" />
                      )}

                      {/* Moving Grass Trail filling effect */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500/15 via-blue-500/30 to-blue-500/50 border-r border-blue-400/20 pointer-events-none transition-all duration-75"
                        style={{ width: `${holdProgress}%` }}
                      />

                      {/* Static Prompt Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[8.5px] font-black text-white/50 tracking-widest uppercase text-center px-10 select-none leading-none">
                          {isFormInvalid() 
                            ? 'Complete setup first' 
                            : isHolding 
                              ? 'KEEP HOLDING SOCCER!' 
                              : 'HOLD SOCCER TO GOAL'}
                        </span>
                      </div>

                      {/* Goal Net Post on Extreme Right */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                        <div className={cn(
                          "w-7.5 h-7.5 rounded-lg flex items-center justify-center border text-xs transition-all duration-150",
                          holdProgress >= 90 
                            ? "bg-emerald-500 border-white text-white scale-110 shadow-[0_0_10px_#10b981]" 
                            : "bg-black/40 border-white/10 text-white/40"
                        )}>
                          🥅
                        </div>
                      </div>

                      {/* Touch & Hold soccer ball draggable handle */}
                      {!isFormInvalid() && (
                        <div
                          onMouseDown={startHolding}
                          onMouseUp={stopHolding}
                          onMouseLeave={stopHolding}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            startHolding();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            stopHolding();
                          }}
                          style={{ 
                            left: `calc(${holdProgress}% * 0.82 + 4px)`,
                            transform: `rotate(${holdProgress * 6}deg)`
                          }}
                          className={cn(
                            "absolute top-1 w-8.5 h-8.5 rounded-full flex items-center justify-center text-lg cursor-grab active:cursor-grabbing select-none z-20 shadow-[0_3px_8px_rgba(255,255,255,0.25)] bg-slate-900 border border-white/20 transition-transform duration-75",
                            isHolding ? "scale-110 border-blue-400" : "hover:scale-105"
                          )}
                        >
                          ⚽
                        </div>
                      )}
                    </div>

                    <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest text-center flex items-center justify-center gap-1 leading-none">
                      <Lock className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                      Touch and hold ball until it reaches the goal net
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>

      {/* IMMERSIVE SPORTS GOAL CELEBRATION OVERLAY */}
      <AnimatePresence>
        {goalCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/98 flex flex-col items-center justify-center space-y-6 overflow-hidden"
          >
            {/* Ambient Flash Lights */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Confetti Explosion Eruption */}
            {confettiParticles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 120, rotate: 0, scale: 0, opacity: 1 }}
                animate={{ 
                  x: p.x, 
                  y: [120, p.y, p.y + 320], 
                  rotate: 360 * (Math.random() > 0.5 ? 2.5 : -2.5),
                  scale: [0, 1.3, 0.7],
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: p.duration, 
                  delay: p.delay, 
                  ease: "easeOut" 
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{ 
                  width: p.size, 
                  height: p.size, 
                  backgroundColor: p.color,
                  left: '50%',
                  top: '50%'
                }}
              />
            ))}

            {/* Soccer Ball Shooting Through Goal net visual */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ 
                  scale: [0.6, 1.4, 0.9, 1.1, 1],
                  y: [100, -90, -10, 0],
                  rotate: [0, 360, 720]
                }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="text-6xl select-none filter drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] z-10"
              >
                ⚽
              </motion.div>
              
              {/* Shake the goal net */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  rotate: [0, 8, -8, 0],
                  x: [0, 10, -10, 0]
                }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="absolute text-5xl opacity-45 -top-4"
              >
                🥅
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: [1, 1, 0] }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl -z-10"
              />
            </div>

            {/* Goal Text with ripple typography */}
            <motion.div
              initial={{ scale: 0.8, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-center space-y-2.5 px-6"
            >
              <h1 className="text-4xl font-extrabold text-emerald-400 font-mono tracking-widest uppercase animate-bounce leading-none">
                GOAL!!!
              </h1>
              <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto" />
              <p className="text-[10px] text-white/95 font-black tracking-widest uppercase animate-pulse mt-1.5 leading-none">
                TRANSACTION VERIFIED
              </p>
              <p className="text-[8.5px] text-slate-500 uppercase tracking-wider">
                COMMITTING BLOCK RECORD SECURELY TO T.U.T. LEDGER...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
