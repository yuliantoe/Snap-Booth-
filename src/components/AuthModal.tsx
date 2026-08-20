import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Crown,
  KeyRound,
  Mail,
  User,
  Building2,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  UserPlus,
  ArrowRight,
  Clock,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserAccount, SubscriptionPlanId } from '../types';
import { SUBSCRIPTION_PLANS, DEFAULT_USERS, calculateRemainingDays } from '../services/subscriptionService';

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
  const [tab, setTab] = useState<'quick_switch' | 'login' | 'register'>('quick_switch');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPlan, setRegPlan] = useState<SubscriptionPlanId>('pro_booth');
  const [regPin, setRegPin] = useState('1234');
  const [showRegPassword, setShowRegPassword] = useState(false);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

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

    onLogin(found);
    onClose();
  };

  const handleQuickSelect = (user: UserAccount) => {
    onLogin(user);
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
      const durationDays = regPlan === 'lifetime' ? 36500 : 30;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const cleanUsername = (regUsername.trim() || regEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      const newAccount = await onRegisterClient({
        username: cleanUsername,
        password: regPassword.trim() || '123456',
        email: regEmail.trim(),
        displayName: regDisplayName.trim() || regBusinessName.trim(),
        businessName: regBusinessName.trim(),
        role: 'client',
        subscriptionStatus: 'active',
        subscriptionPlan: regPlan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        phone: regPhone.trim() || '08123456789',
        boothAccessPin: regPin.trim() || '1234',
        notes: `Pendaftaran mandiri paket ${SUBSCRIPTION_PLANS[regPlan].name}`,
      });

      onLogin(newAccount);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan akun baru.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                Masuk sebagai Klien Berlangganan atau Super Admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setTab('quick_switch'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'quick_switch'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilih Akun Demo</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Username / Pass</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Baru</span>
          </button>
        </div>

        {/* Active User Status & Quick Logout */}
        {currentUser && (
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
          {/* TAB 1: QUICK SWITCH WITH CREDENTIALS DISPLAY */}
          {tab === 'quick_switch' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-slate-400 mb-1">
                Pilih salah satu akun demo untuk menguji akses login & dasboard dengan username/password masing-masing:
              </p>

              <div className="space-y-2.5">
                {usersList.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const isSuperAdmin = user.role === 'super_admin';
                  const remainingDays = calculateRemainingDays(user.subscriptionEndDate);
                  const isExpired = user.subscriptionStatus === 'expired' || remainingDays < 0;

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleQuickSelect(user)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isCurrent
                          ? 'border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30 shadow-md'
                          : isSuperAdmin
                          ? 'border-amber-500/30 bg-slate-950 hover:border-amber-500/60 hover:bg-slate-900'
                          : isExpired
                          ? 'border-rose-900/50 bg-rose-950/20 hover:border-rose-700/60'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border shrink-0 ${
                            isSuperAdmin
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : isExpired
                              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {isSuperAdmin ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {user.displayName}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md font-extrabold">
                                Aktif Sekarang
                              </span>
                            )}
                          </div>

                          {/* Credentials Tag Pill */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono text-amber-300 font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                              User: @{user.username || user.email.split('@')[0]}
                            </span>
                            <span className="text-[11px] font-mono text-rose-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                              Pass: {user.password || '123456'}
                            </span>
                            <span className="text-[11px] font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                              PIN: {user.boothAccessPin || '1234'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                isSuperAdmin
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : isExpired
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {isSuperAdmin
                                ? '👑 Super Admin'
                                : isExpired
                                ? '🔴 Langganan Expired'
                                : `🟢 Aktif (${remainingDays} Hari)`}
                            </span>
                            <span className="text-[10px] text-slate-500">{user.email}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <span>Pilih</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: USERNAME / EMAIL / PIN LOGIN */}
          {tab === 'login' && (
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
                  placeholder="Contoh: admin / lunabooth / luna.booth@gmail.com / 1234"
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Default akun demo: <code className="text-amber-400 font-mono">admin / admin123</code> atau <code className="text-amber-400 font-mono">lunabooth / luna123</code>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER NEW CLIENT */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-150">
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
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PIN Akses Kiosk:</span>
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Pilih Paket Langganan:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[]).map((planKey) => {
                    const plan = SUBSCRIPTION_PLANS[planKey];
                    const isSelected = regPlan === planKey;
                    return (
                      <button
                        key={planKey}
                        type="button"
                        onClick={() => setRegPlan(planKey)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500/40 shadow-md'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{plan.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <p className="text-[11px] font-extrabold text-amber-400 mt-1">
                          Rp {plan.pricePerMonth.toLocaleString('id-ID')} / bln
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Menyimpan...' : 'Daftarkan & Mulai Langganan'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
