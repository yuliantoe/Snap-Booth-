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
} from 'lucide-react';
import { UserAccount } from '../types';

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

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDuration, setRegDuration] = useState<'trial_7' | 'trial_14' | 'month_1' | 'off'>('trial_7');
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regBusinessName) {
      setErrorMsg('Nama bisnis dan email wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const startDate = new Date().toISOString().split('T')[0];
      let endDate = '2099-12-31';
      let status: any = 'trial';
      let note = 'Pendaftaran akun baru';

      if (regDuration === 'off') {
        endDate = '2099-12-31';
        status = 'active';
        note = 'Pendaftaran mandiri (Durasi OFF / Unlimited)';
      } else if (regDuration === 'trial_7') {
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'trial';
        note = 'Pendaftaran mandiri (Trial 7 Hari)';
      } else if (regDuration === 'trial_14') {
        endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'trial';
        note = 'Pendaftaran mandiri (Trial 14 Hari)';
      } else if (regDuration === 'month_1') {
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'active';
        note = 'Pendaftaran mandiri (1 Bulan)';
      }

      const cleanUsername = (regUsername.trim() || regEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      const newAccount = await onRegisterClient({
        username: cleanUsername,
        password: regPassword.trim() || '123456',
        email: regEmail.trim(),
        displayName: regDisplayName.trim() || regBusinessName.trim(),
        businessName: regBusinessName.trim(),
        role: 'client',
        subscriptionStatus: status,
        subscriptionPlan: regDuration === 'off' ? 'lifetime' : 'pro_booth',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        phone: regPhone.trim() || '08123456789',
        boothAccessPin: regPin.trim() || '1234',
        notes: note,
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); }}
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
            onClick={() => { setTab('register'); setErrorMsg(''); }}
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
          {/* TAB 1: USERNAME / EMAIL / PIN LOGIN */}
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
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
          )}

          {/* TAB 2: REGISTER NEW CLIENT */}
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
                    <span>PIN Akses Kiosk (4 Digit):</span>
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
                <label className="text-xs font-bold text-slate-300">Pilihan Masa Aktif Awal:</label>
                <select
                  value={regDuration}
                  onChange={(e) => setRegDuration(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="trial_7">Trial 7 Hari (Gratis Uji Coba)</option>
                  <option value="trial_14">Trial 14 Hari (2 Minggu)</option>
                  <option value="month_1">Langganan 1 Bulan (30 Hari)</option>
                  <option value="off">OFF / Unlimited (Tanpa Batas Waktu)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Menyimpan...' : 'Daftarkan Akun'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
