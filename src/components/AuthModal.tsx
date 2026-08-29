import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  KeyRound,
  Mail,
  User,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  Clock,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { UserAccount } from '../types';
import {
  OFFICIAL_PAYMENT_INFO,
  OFFICIAL_WHATSAPP_LINK,
  generateUniqueCode,
  formatRupiah,
} from '../services/subscriptionService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  usersList: UserAccount[];
  onLogin: (user: UserAccount) => void;
  onRegisterClient: (newClient: Omit<UserAccount, 'id' | 'createdAt'>) => Promise<UserAccount>;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  usersList,
  onLogin,
  onRegisterClient,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // States for Approval & Pending Flow
  const [pendingRegisteredUser, setPendingRegisteredUser] = useState<UserAccount | null>(null);
  const [loginPendingUser, setLoginPendingUser] = useState<UserAccount | null>(null);

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDuration, setRegDuration] = useState<
    | 'trial_3'
    | 'weekly_25k'
    | 'monthly_49k'
    | 'quarterly_135k'
    | 'yearly_480k'
    | 'weekly_30k'
    | 'monthly_50k'
    | 'yearly_500k'
    | 'off'
  >('monthly_49k');
  const [regUniqueCode] = useState<number>(() => generateUniqueCode());
  const [regPin, setRegPin] = useState('1234');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [copiedBca, setCopiedBca] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  if (!isOpen) return null;

  // Package pricing details helper
  const getPackagePricing = (durationKey: string) => {
    if (durationKey === 'weekly_25k' || durationKey === 'weekly_30k') {
      return { name: 'Langganan Mingguan', days: 7, basePrice: 25000, label: 'Mingguan (7 Hari)' };
    }
    if (durationKey === 'monthly_49k' || durationKey === 'monthly_50k') {
      return { name: 'Langganan Bulanan', days: 30, basePrice: 49000, label: 'Bulanan (30 Hari)' };
    }
    if (durationKey === 'quarterly_135k' || durationKey === 'month_3') {
      return {
        name: 'Langganan 3 Bulan',
        days: 90,
        basePrice: 135000,
        discountBadge: 'Hemat 8%',
        label: '3 Bulan (90 Hari)',
      };
    }
    if (durationKey === 'yearly_480k' || durationKey === 'yearly_500k' || durationKey === 'year_1') {
      return {
        name: 'Langganan Tahunan',
        days: 365,
        basePrice: 480000,
        discountBadge: 'Hemat 18%',
        label: 'Tahunan (365 Hari)',
      };
    }
    return null;
  };

  // Super Admin WhatsApp contact info
  const superAdmin = usersList.find((u) => u.role === 'super_admin');
  const adminPhone = superAdmin?.phone || '081288889999';
  const cleanAdminPhone = adminPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');

  const handleCopyBca = () => {
    navigator.clipboard.writeText(OFFICIAL_PAYMENT_INFO.accountNumber);
    setCopiedBca(true);
    setTimeout(() => setCopiedBca(false), 2500);
  };

  const handleCopyAmount = (amount: number) => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  const renderBcaPaymentInfo = (
    customTitle?: string,
    amountDetails?: { basePrice?: number; uniqueCode?: number; total?: number; planName?: string }
  ) => (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-950 to-amber-950/20 border border-amber-500/40 text-left space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
          <CreditCard className="w-4 h-4 text-amber-400" />
          <span>{customTitle || 'Rekening Tujuan Resmi Pembayaran:'}</span>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
          BCA Resmi
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Bank Tujuan:</span>
          <span className="font-semibold text-white">{OFFICIAL_PAYMENT_INFO.bankName}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Nomor Rekening:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
              {OFFICIAL_PAYMENT_INFO.accountNumber}
            </span>
            <button
              type="button"
              onClick={handleCopyBca}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                copiedBca
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Salin Nomor Rekening BCA"
            >
              {copiedBca ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBca ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Atas Nama (A/N):</span>
          <span className="font-bold text-emerald-400 uppercase tracking-wide">
            {OFFICIAL_PAYMENT_INFO.accountHolder}
          </span>
        </div>

        {/* Unique Transaction Code & Total Payable Amount */}
        {amountDetails && amountDetails.total && amountDetails.total > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            {amountDetails.basePrice && (
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span className="text-slate-400">Harga Paket ({amountDetails.planName || 'Langganan'}):</span>
                <span className="font-medium text-slate-300">{formatRupiah(amountDetails.basePrice)}</span>
              </div>
            )}
            {amountDetails.uniqueCode && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span>Nomor Unik Transaksi:</span>
                  <span className="text-[9px] text-amber-400/80">(Otomatis Sistem)</span>
                </span>
                <span className="font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  +{amountDetails.uniqueCode}
                </span>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center bg-amber-500/10 -mx-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30">
              <div>
                <div className="text-amber-300 font-black text-xs">Total Pembayaran:</div>
                <div className="text-[9px] text-slate-400">Transfer tepat hingga 3 digit terakhir</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-300 text-sm sm:text-base tracking-wide">
                  {formatRupiah(amountDetails.total)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyAmount(amountDetails.total!)}
                  className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                    copiedAmount
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                  title="Salin Total Pembayaran"
                >
                  {copiedAmount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAmount ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-amber-200/90 leading-relaxed italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
        ⚠️ <strong>Penting:</strong> Mohon transfer tepat hingga 3 digit nomor unik di belakang ke <strong>{OFFICIAL_PAYMENT_INFO.fullLabel}</strong> agar proses verifikasi transaksi berlangsung otomatis & instan!
      </p>
    </div>
  );

  const handleWhatsAppNotifyAdmin = () => {
    window.open(OFFICIAL_WHATSAPP_LINK, '_blank');
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoginPendingUser(null);

    const query = loginIdentifier.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Silakan masukkan Username, Email, atau PIN akses booth Anda.');
      return;
    }

    // Match by username, email, PIN, or ID
    const found = usersList.find((u) => {
      const matchUsername = (u.username || '').toLowerCase() === query;
      const matchEmail = u.email.toLowerCase() === query;
      const matchPin = (u.boothAccessPin || '') === query;
      const matchId = u.id === query;
      return matchUsername || matchEmail || matchPin || matchId;
    });

    if (!found) {
      setErrorMsg('Akun tidak ditemukan. Periksa kembali Username, Email, atau PIN Anda.');
      return;
    }

    // If account has password and user entered password or it's required
    if (found.password && loginPassword) {
      if (found.password !== loginPassword) {
        setErrorMsg('Password yang Anda masukkan salah. Silakan coba lagi.');
        return;
      }
    }

    // Check Approval Status & Subscription Status
    if (found.role === 'client') {
      if (found.approvalStatus === 'rejected') {
        setErrorMsg(`Pendaftaran akun ini ditolak oleh Super Admin. Alasan: ${found.rejectionReason || 'Silakan hubungi Super Admin'}.`);
        return;
      }

      if (found.subscriptionStatus === 'pending_approval' || found.approvalStatus === 'pending') {
        setLoginPendingUser(found);
        return;
      }
    }

    onLogin(found);
    onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regBusinessName) {
      setErrorMsg('Nama bisnis dan email wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const isTrial = regDuration === 'trial_3';
      const startDate = new Date().toISOString().split('T')[0];
      let endDate = '2099-12-31';
      let planTitle = 'Trial 3 Hari - Gratis';
      let basePrice = 0;
      let note = 'Pendaftaran mandiri akun baru';

      if (regDuration === 'off') {
        endDate = '2099-12-31';
        planTitle = 'OFF / Unlimited — Tanpa Batas Masa Berlaku';
        note = 'Pendaftaran mandiri (Durasi OFF / Unlimited) - Menunggu Approval Super Admin';
      } else if (regDuration === 'trial_3') {
        endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        planTitle = 'Trial 3 Hari — Gratis Masa Uji Coba';
        note = 'Pendaftaran mandiri (Trial 3 Hari - Otomatis Aktif)';
      } else if (regDuration === 'weekly_25k' || regDuration === 'weekly_30k') {
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        planTitle = 'Langganan Mingguan — Rp 25.000 / 7 Hari';
        basePrice = 25000;
      } else if (regDuration === 'monthly_49k' || regDuration === 'monthly_50k') {
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        planTitle = 'Langganan Bulanan — Rp 49.000 / 30 Hari';
        basePrice = 49000;
      } else if (regDuration === 'quarterly_135k') {
        endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        planTitle = 'Langganan 3 Bulan — Rp 135.000 / 90 Hari (Hemat 8%)';
        basePrice = 135000;
      } else if (regDuration === 'yearly_480k' || regDuration === 'yearly_500k') {
        endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        planTitle = 'Langganan Tahunan — Rp 480.000 / 365 Hari (Hemat 18%)';
        basePrice = 480000;
      }

      const assignedUniqueCode = basePrice > 0 ? regUniqueCode : undefined;
      const assignedTotalPayable = basePrice > 0 ? basePrice + regUniqueCode : undefined;

      if (!isTrial && regDuration !== 'off') {
        note = `Pendaftaran mandiri (${planTitle} - Tagihan: ${formatRupiah(assignedTotalPayable || basePrice)}, Kode Unik: ${assignedUniqueCode}) - Menunggu Approval Super Admin`;
      }

      const cleanUsername = (regUsername.trim() || regEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      const newAccount = await onRegisterClient({
        username: cleanUsername,
        password: regPassword.trim() || '123456',
        email: regEmail.trim(),
        displayName: regDisplayName.trim() || regBusinessName.trim(),
        businessName: regBusinessName.trim(),
        role: 'client',
        subscriptionStatus: isTrial ? 'trial' : 'pending_approval',
        approvalStatus: isTrial ? 'approved' : 'pending',
        registrationType: isTrial ? 'trial' : 'paid_registration',
        requestedDuration: regDuration,
        requestedPlanName: planTitle,
        uniqueCode: assignedUniqueCode,
        totalAmountPayable: assignedTotalPayable,
        subscriptionPlan: regDuration === 'off' ? 'lifetime' : 'pro_booth',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        phone: regPhone.trim() || '08123456789',
        boothAccessPin: regPin.trim() || '1234',
        notes: note,
      });

      if (isTrial) {
        // Trial users get instant activation without requiring Super Admin approval
        onLogin(newAccount);
        onClose();
      } else {
        // Paid registrations require Super Admin approval
        setPendingRegisteredUser(newAccount);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan akun baru.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Akses Autentikasi & Akun
              </h2>
              <p className="text-xs text-slate-400">
                Masuk ke akun studio photobooth Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Hidden when showing pending registration success) */}
        {!pendingRegisteredUser && (
          <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(''); setLoginPendingUser(null); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Login Akun</span>
            </button>

            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(''); setLoginPendingUser(null); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>
        )}

        {/* Active User Status & Quick Logout */}
        {currentUser && !pendingRegisteredUser && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Sedang Login:</span>
                  <span className="text-xs font-bold text-white truncate">{currentUser.displayName}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono truncate">@{currentUser.username || currentUser.email}</span>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title="Logout dari akun ini"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* SPECIAL VIEW: REGISTRATION SUCCESS - WAITING SUPER ADMIN APPROVAL */}
          {pendingRegisteredUser ? (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse text-amber-400" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Menunggu Persetujuan Super Admin
                </span>
                <h3 className="text-lg font-black text-white pt-2">
                  Pendaftaran Berhasil Dicatat!
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  Karena Anda memilih paket berbayar, akun Anda saat ini sedang menunggu proses approval dan verifikasi dari Super Admin.
                </p>
              </div>

              {/* Detail Ringkasan Akun */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Nama Studio / Bisnis:</span>
                  <span className="font-bold text-white">{pendingRegisteredUser.businessName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Pemilik:</span>
                  <span className="font-semibold text-slate-200">{pendingRegisteredUser.displayName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Username:</span>
                  <span className="font-mono text-amber-300">@{pendingRegisteredUser.username}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Email:</span>
                  <span className="font-mono text-slate-300">{pendingRegisteredUser.email}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Paket yang Diajukan:</span>
                  <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {pendingRegisteredUser.requestedPlanName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>PIN Booth Kiosk:</span>
                  <span className="font-mono font-bold text-cyan-300">{pendingRegisteredUser.boothAccessPin}</span>
                </div>
              </div>

              {/* Official BCA Payment Transfer Info */}
              {(() => {
                const pkg = pendingRegisteredUser.requestedDuration ? getPackagePricing(pendingRegisteredUser.requestedDuration) : null;
                const basePrice = pkg?.basePrice || 49000;
                const uniqueCode = pendingRegisteredUser.uniqueCode || 342;
                const total = pendingRegisteredUser.totalAmountPayable || (basePrice + uniqueCode);
                return renderBcaPaymentInfo("Rekening Tujuan Resmi Transfer Pembayaran:", {
                  basePrice,
                  uniqueCode,
                  total,
                  planName: pendingRegisteredUser.requestedPlanName || 'Langganan Photobooth',
                });
              })()}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppNotifyAdmin}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi & Chat via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingRegisteredUser(null);
                    setTab('login');
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Selesai & Ke Halaman Login</span>
                </button>
              </div>
            </div>
          ) : loginPendingUser ? (
            /* SPECIAL VIEW: LOGIN ATTEMPT FOR PENDING APPROVAL USER */
            <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse text-amber-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Akun Menunggu Persetujuan Super Admin
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  Akun <strong className="text-amber-300 font-bold">{loginPendingUser.businessName || loginPendingUser.displayName}</strong> belum di-approve oleh Super Admin. Setelah di-approve, Anda dapat langsung login.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Status:</span>
                  <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    ⏳ Menunggu Approval
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Username:</span>
                  <span className="font-mono text-white">@{loginPendingUser.username}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Paket Diajukan:</span>
                  <span className="font-bold text-slate-200">{loginPendingUser.requestedPlanName || 'Langganan Photobooth'}</span>
                </div>
              </div>

              {/* Official BCA Payment Transfer Info */}
              {(() => {
                const pkg = loginPendingUser.requestedDuration ? getPackagePricing(loginPendingUser.requestedDuration) : null;
                const basePrice = pkg?.basePrice || 49000;
                const uniqueCode = loginPendingUser.uniqueCode || 342;
                const total = loginPendingUser.totalAmountPayable || (basePrice + uniqueCode);
                return renderBcaPaymentInfo("Rekening Tujuan Resmi Pembayaran:", {
                  basePrice,
                  uniqueCode,
                  total,
                  planName: loginPendingUser.requestedPlanName || 'Langganan Photobooth',
                });
              })()}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppNotifyAdmin}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi & Chat via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginPendingUser(null)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Kembali ke Login</span>
                </button>
              </div>
            </div>
          ) : tab === 'login' ? (
            /* TAB 1: USERNAME / EMAIL / PIN LOGIN */
            <form onSubmit={handleManualLogin} className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Username, Email, atau PIN Booth:</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Masukkan Username, Email, atau PIN Booth"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Password Akun:</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm pr-10 focus:outline-none focus:border-rose-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </button>
            </form>
          ) : (
            /* TAB 2: REGISTER NEW CLIENT */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Sistem Pendaftaran & Approval:</strong>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Paket <strong>Trial 3 Hari</strong> akan aktif secara otomatis. Untuk paket berbayar (Mingguan, Bulanan, Tahunan, OFF), pendaftaran akan diproses dan di-approve terlebih dahulu oleh Super Admin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Nama Bisnis / Studio:</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regBusinessName}
                    onChange={(e) => {
                      setRegBusinessName(e.target.value);
                      if (!regUsername) {
                        setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="Contoh: Aurora Photobooth"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Username Login:</span>
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="contoh: aurorastudio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Password:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password login akun"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs pr-9 font-mono focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PIN Akses Kiosk (4-6 Digit):</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1234"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Email Klien:</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="vendor@photobooth.id"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No. WhatsApp:</span>
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Pilihan Paket / Masa Aktif:</span>
                  <span className="text-[11px] text-amber-400 font-bold">
                    {regDuration === 'trial_3' ? '⚡ Langsung Aktif' : '⏳ Butuh Approval Super Admin'}
                  </span>
                </label>
                <select
                  value={regDuration}
                  onChange={(e) => setRegDuration(e.target.value as any)}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="monthly_49k">🟢 Langganan Bulanan — Rp 49.000 / 30 Hari (Paling Populer)</option>
                  <option value="weekly_25k">🟢 Langganan Mingguan — Rp 25.000 / 7 Hari</option>
                  <option value="quarterly_135k">🔥 Langganan 3 Bulan — Rp 135.000 / 90 Hari (Hemat 8%)</option>
                  <option value="yearly_480k">💎 Langganan Tahunan — Rp 480.000 / 365 Hari (Hemat 18%)</option>
                  <option value="off">♾️ OFF / Unlimited — Tanpa Batas Masa Berlaku</option>
                  <option value="trial_3">🟡 Trial 3 Hari — Gratis Masa Uji Coba (Otomatis Aktif)</option>
                </select>
              </div>

              {/* Show Official BCA Payment Info for Paid Package Registration with Unique Transaction Code */}
              {regDuration !== 'trial_3' && regDuration !== 'off' && (() => {
                const pkg = getPackagePricing(regDuration);
                const basePrice = pkg?.basePrice || 49000;
                return renderBcaPaymentInfo('Rekening Tujuan Resmi Pembayaran:', {
                  basePrice,
                  uniqueCode: regUniqueCode,
                  total: basePrice + regUniqueCode,
                  planName: pkg?.name || 'Langganan',
                });
              })()}
              {regDuration === 'off' && renderBcaPaymentInfo('Rekening Tujuan Resmi Pembayaran:')}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Menyimpan...' : regDuration === 'trial_3' ? 'Daftar & Langsung Aktifkan Trial' : 'Daftarkan Akun & Ajukan Approval'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

