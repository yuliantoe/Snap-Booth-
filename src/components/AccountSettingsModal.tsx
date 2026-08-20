import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  KeyRound,
  ShieldCheck,
  Crown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Sparkles,
  RefreshCw,
  Save,
  Check,
} from 'lucide-react';
import { UserAccount } from '../types';
import { calculateRemainingDays, SUBSCRIPTION_PLANS } from '../services/subscriptionService';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  usersList: UserAccount[];
  onUpdateUser: (userId: string, updates: Partial<UserAccount>) => Promise<void>;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  usersList,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'pin'>('profile');
  
  // Profile Fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PIN Field
  const [boothPin, setBoothPin] = useState('1234');

  // Status & Feedback
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || currentUser.email.split('@')[0]);
      setDisplayName(currentUser.displayName || '');
      setBusinessName(currentUser.businessName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setBoothPin(currentUser.boothAccessPin || '1234');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMsg(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';
  const remainingDays = calculateRemainingDays(currentUser.subscriptionEndDate);

  // Generate strong random password
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  // Handle Save Profile & Username
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setStatusMsg({ type: 'error', text: 'Username tidak boleh kosong.' });
      return;
    }

    if (cleanUsername.length < 3) {
      setStatusMsg({ type: 'error', text: 'Username minimal harus 3 karakter.' });
      return;
    }

    // Check if username is already taken by another user
    const isTaken = usersList.some(
      (u) => u.id !== currentUser.id && (u.username || '').toLowerCase() === cleanUsername
    );

    if (isTaken) {
      setStatusMsg({
        type: 'error',
        text: `Username "@${cleanUsername}" sudah digunakan oleh akun lain. Silakan pilih username berbeda.`,
      });
      return;
    }

    if (!email.trim()) {
      setStatusMsg({ type: 'error', text: 'Email tidak boleh kosong.' });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateUser(currentUser.id, {
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        businessName: businessName.trim() || displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      setStatusMsg({
        type: 'success',
        text: 'Username dan data profil berhasil disimpan dan disinkronkan ke Cloud!',
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal menyimpan perubahan profil.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save New Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!newPassword) {
      setStatusMsg({ type: 'error', text: 'Silakan masukkan password baru.' });
      return;
    }

    if (newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'Password baru minimal harus 4 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({
        type: 'error',
        text: 'Konfirmasi password baru tidak cocok. Periksa kembali.',
      });
      return;
    }

    // If current user already had a password, check it (if provided)
    if (currentUser.password && currentPassword && currentUser.password !== currentPassword) {
      setStatusMsg({
        type: 'error',
        text: 'Password saat ini yang Anda masukkan salah.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateUser(currentUser.id, {
        password: newPassword,
      });

      setStatusMsg({
        type: 'success',
        text: 'Password akun berhasil diubah dan diperbarui di Cloud!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal memperbarui password.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save Booth PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanPin = boothPin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setStatusMsg({ type: 'error', text: 'PIN akses booth minimal 4 digit angka.' });
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateUser(currentUser.id, {
        boothAccessPin: cleanPin,
      });

      setStatusMsg({
        type: 'success',
        text: `PIN akses booth Kiosk berhasil diubah menjadi: ${cleanPin}`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal mengubah PIN.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border shadow-inner ${
                isSuperAdmin
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
              }`}
            >
              {isSuperAdmin ? <Crown className="w-5 h-5 sm:w-6 sm:h-6" /> : <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Pengaturan Akun & Keamanan
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    isSuperAdmin
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isSuperAdmin ? 'Super Admin' : currentUser.subscriptionPlan}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ubah username, password, email, dan PIN akses Kiosk
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
            onClick={() => {
              setActiveTab('profile');
              setStatusMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Profil & Username</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setStatusMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'password'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Ganti Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setStatusMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pin'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>PIN Akses Kiosk</span>
          </button>
        </div>

        {/* Feedback Alert Message */}
        {statusMsg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="flex-1">{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PROFIL & USERNAME */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shadow">
                    {(username || currentUser.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {currentUser.displayName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ID Akun: <span className="font-mono text-slate-300">{currentUser.id}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Status Langganan</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {isSuperAdmin ? 'Lifetime Admin' : `Aktif (${remainingDays} Hari)`}
                  </span>
                </div>
              </div>

              {/* Username Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Username Login
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Digunakan untuk login cepat ke sistem
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="contoh: lunabooth / admin"
                    className="w-full bg-slate-950 border border-slate-700 pl-8 pr-4 py-2.5 rounded-xl text-white text-sm font-medium focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hanya huruf kecil, angka, garis bawah (_), atau titik.
                </p>
              </div>

              {/* Display Name & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Pemilik / PIC
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Nama Bisnis / Brand
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nama brand photobooth"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Resmi
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@bisnis.com"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Perubahan Username & Profil</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: GANTI PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300 mb-0.5">Keamanan Akun</p>
                  <p>
                    Gunakan kombinasi password yang kuat untuk menjaga pengaturan booth, preset frame, dan galeri foto klien Anda.
                  </p>
                </div>
              </div>

              {/* Current Password (if user has one) */}
              {currentUser.password && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Password Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                      className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm pr-10 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password & Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Password Baru
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Password Acak</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm pr-10 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-sm pr-10 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && confirmPassword && (
                  <p
                    className={`text-[11px] mt-1 flex items-center gap-1 font-medium ${
                      newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Password cocok
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" /> Password belum cocok
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Perbarui Password Akun</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PIN AKSES KIOSK */}
          {activeTab === 'pin' && (
            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs text-cyan-200/90 leading-relaxed flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-cyan-300 mb-0.5">PIN Kunci Kiosk Booth</p>
                  <p>
                    PIN angka ini digunakan kru operator di lokasi event untuk membuka Dasboard Pengaturan tanpa perlu mengetik password lengkap.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>PIN Akses Booth (4-6 Digit Angka)</span>
                  <span className="text-[10px] text-slate-400">Default: 1234</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={boothPin}
                  onChange={(e) => setBoothPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-slate-700 px-4 py-3 rounded-xl text-white text-center text-xl tracking-[0.3em] font-mono font-bold focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Hanya angka (contoh: 1234, 9988, 5678)
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Simpan PIN Kiosk Booth</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
