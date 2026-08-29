import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Phone,
  Mail,
  User,
  Building2,
  KeyRound,
  ShieldCheck,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Zap,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  CreditCard,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { isDurationUnlimited, OFFICIAL_PAYMENT_INFO, formatRupiah } from '../../services/subscriptionService';

interface PendingApprovalsTabProps {
  pendingUsers: UserAccount[];
  onApprove: (user: UserAccount, customDuration?: string) => Promise<void>;
  onReject: (user: UserAccount, reason: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  superAdminAccount: UserAccount | null;
}

export const PendingApprovalsTab: React.FC<PendingApprovalsTabProps> = ({
  pendingUsers,
  onApprove,
  onReject,
  onDelete,
  superAdminAccount,
}) => {
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [selectedDurationMap, setSelectedDurationMap] = useState<Record<string, string>>({});
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Pembayaran langganan belum terverifikasi');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSendWhatsAppNotification = (user: UserAccount) => {
    const rawPhone = user.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const isUnl = isDurationUnlimited(user.subscriptionEndDate);
    const planLabel = user.requestedPlanName || user.subscriptionPlan || 'Langganan Photobooth';

    const message = encodeURIComponent(
      `Halo *${user.displayName || user.businessName}*! 👋\n\n` +
      `Selamat! Pendaftaran akun studio photobooth Anda (*${user.businessName}*) telah *DISETUJUI & DIAKTIFKAN* oleh Super Admin snapBoth Receipt! 🎉\n\n` +
      `📋 *Detail Kredensial Login Anda:*\n` +
      `• Username: *${user.username || user.email}*\n` +
      `• Password: *${user.password || '123456'}*\n` +
      `• PIN Booth Kiosk: *${user.boothAccessPin || '1234'}*\n` +
      `• Paket: *${planLabel}*\n` +
      `• Masa Aktif s/d: *${isUnl ? 'Tanpa Batas (OFF)' : user.subscriptionEndDate}*\n\n` +
      `Silakan buka aplikasi dan login sekarang untuk mulai menggunakan booth Anda:\n${window.location.origin}\n\n` +
      `Terima kasih telah bergabung bersama snapBoth Receipt Studio!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDirectWhatsAppChat = (user: UserAccount) => {
    const rawPhone = user.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const message = encodeURIComponent(
      `Halo *${user.displayName || user.businessName}*, kami dari Super Admin snapBoth Receipt ingin mengonfirmasi pendaftaran akun studio Anda untuk paket *${user.requestedPlanName || 'Langganan'}*.\n\n` +
      `Silakan pastikan pembayaran telah ditransfer ke Rekening Resmi:\n` +
      `*${OFFICIAL_PAYMENT_INFO.fullLabel}*\n\n` +
      `Kirimkan bukti transfer di sini agar akun Anda dapat segera diaktifkan. Terima kasih!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const executeApproval = async (user: UserAccount) => {
    setProcessingId(user.id);
    try {
      const chosenDuration = selectedDurationMap[user.id] || user.requestedDuration || 'monthly_50k';
      await onApprove(user, chosenDuration);
    } finally {
      setProcessingId(null);
    }
  };

  const executeRejection = async (user: UserAccount) => {
    setProcessingId(user.id);
    try {
      await onReject(user, rejectReason);
      setRejectingUserId(null);
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <div className="p-10 text-center rounded-3xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white">Tidak Ada Pendaftaran Menunggu Approval</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Semua pendaftaran akun baru telah diproses. Pendaftaran baru dari klien dengan paket berbayar akan muncul di halaman ini untuk diverifikasi dan disetujui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Informative Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 shadow-inner">
            <Clock className="w-5 h-5 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-amber-300">
                Persetujuan Pendaftaran Klien Baru (Approval System)
              </h4>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase font-mono animate-pulse">
                {pendingUsers.length} Permintaan Menunggu
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              Berikut adalah daftar calon klien yang mendaftar secara mandiri untuk paket berbayar. Anda dapat memverifikasi pembayaran/data, menyesuaikan paket durasi, lalu klik <strong>Setujui & Aktifkan</strong>.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Rekening Resmi:</span>
              <strong className="text-amber-300 font-mono font-bold">{OFFICIAL_PAYMENT_INFO.fullLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Pending User Cards */}
      <div className="space-y-4">
        {pendingUsers.map((user) => {
          const showPassword = !!showPasswordMap[user.id];
          const isRejecting = rejectingUserId === user.id;
          const isProcessing = processingId === user.id;
          const currentChosenDuration = selectedDurationMap[user.id] || user.requestedDuration || 'monthly_49k';

          return (
            <div
              key={user.id}
              className="p-5 rounded-3xl bg-slate-950 border-2 border-amber-500/30 hover:border-amber-500/50 shadow-xl transition-all space-y-4"
            >
              {/* Header Card: Studio Info & Registration Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-white">
                        {user.businessName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Menunggu Persetujuan
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pemilik: <strong className="text-slate-200 font-semibold">{user.displayName}</strong> • Mendaftar pada: <span className="font-mono text-slate-300">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Chat */}
                {user.phone && (
                  <button
                    type="button"
                    onClick={() => handleDirectWhatsAppChat(user)}
                    className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Chat WhatsApp Klien</span>
                  </button>
                )}
              </div>

              {/* Grid Data Kredensial & Paket yang Dipilih */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Username & Pass */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Kredensial Login:
                  </span>
                  <div className="font-mono text-white font-bold">
                    @{user.username || user.email}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 font-mono text-rose-300 text-[11px]">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Pass: {showPassword ? (user.password || '123456') : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordMap((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}
                      className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    Kontak Klien:
                  </span>
                  <div className="font-mono text-slate-200 truncate">{user.email}</div>
                  <div className="font-mono text-emerald-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{user.phone || '-'}</span>
                  </div>
                </div>

                {/* PIN Booth */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    PIN Akses Booth:
                  </span>
                  <div className="font-mono text-cyan-300 font-black text-sm">
                    {user.boothAccessPin || '1234'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Kiosk Passcode</span>
                </div>

                {/* Requested Plan & Unique Code */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-amber-400 font-bold block flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Paket & Mutasi Transfer:
                  </span>
                  <div className="font-bold text-white text-[11px] leading-tight">
                    {user.requestedPlanName || 'Langganan Photobooth'}
                  </div>
                  {user.totalAmountPayable ? (
                    <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                      <span>Tagihan: {formatRupiah(user.totalAmountPayable)}</span>
                      {user.uniqueCode && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-400 text-[10px]">
                          (Kode: {user.uniqueCode})
                        </span>
                      )}
                    </div>
                  ) : user.uniqueCode ? (
                    <div className="text-[10px] font-mono text-amber-400">
                      Kode Unik: {user.uniqueCode}
                    </div>
                  ) : null}
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Tipe: {user.registrationType || 'Pendaftaran Mandiri'}
                  </span>
                </div>
              </div>

              {/* Approval Options & Actions Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Duration Choice Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                  <label className="font-bold text-slate-300 whitespace-nowrap flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Durasi yang Disetujui:</span>
                  </label>
                  <select
                    value={currentChosenDuration}
                    onChange={(e) =>
                      setSelectedDurationMap((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="monthly_49k">🟢 Bulanan (30 Hari) — Rp 49.000 (Populer)</option>
                    <option value="weekly_25k">🟢 Mingguan (7 Hari) — Rp 25.000</option>
                    <option value="quarterly_135k">🔥 3 Bulan (90 Hari) — Rp 135.000 (Hemat 8%)</option>
                    <option value="yearly_480k">💎 Tahunan (365 Hari) — Rp 480.000 (Hemat 18%)</option>
                    <option value="off">♾️ OFF / Unlimited (Tanpa Batas)</option>
                    <option value="trial_3">🟡 Set sebagai Trial 3 Hari</option>
                    <option value="monthly_50k">🟢 [Legacy] Bulanan — Rp 50.000</option>
                    <option value="weekly_30k">🟢 [Legacy] Mingguan — Rp 30.000</option>
                    <option value="yearly_500k">💎 [Legacy] Tahunan — Rp 500.000</option>
                  </select>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Approve Button */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => executeApproval(user)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Memproses...' : '✅ Setujui & Aktifkan'}</span>
                  </button>

                  {/* Send WA Notification Button */}
                  {user.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppNotification(user)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Kirim notifikasi pesan aktivasi via WhatsApp ke nomor klien"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notif WA</span>
                    </button>
                  )}

                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={() => setRejectingUserId(isRejecting ? null : user.id)}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus permohonan pendaftaran ${user.businessName}?`)) {
                        onDelete(user.id);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                    title="Hapus Permohonan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rejection Reason Form */}
              {isRejecting && (
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Konfirmasi Penolakan Pendaftaran:</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-300 block">Alasan Penolakan:</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Masukkan alasan penolakan (misal: Bukti transfer belum valid)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectingUserId(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => executeRejection(user)}
                      className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Menolak...' : 'Konfirmasi Tolak Pendaftaran'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
