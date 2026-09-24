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
      `Selamat! Pendaftaran akun studio photobooth Anda (*${user.businessName}*) telah *DISETUJUI & DIAKTIFKAN* oleh Super Admin SnapBooth Receipt! 🎉\n\n` +
      `📋 *Detail Kredensial Login Anda:*\n` +
      `• Username: *${user.username || user.email}*\n` +
      `• Password: *${user.password || '123456'}*\n` +
      `• PIN Booth Kiosk: *${user.boothAccessPin || '1234'}*\n` +
      `• Paket: *${planLabel}*\n` +
      `• Masa Aktif s/d: *${isUnl ? 'Tanpa Batas (OFF)' : user.subscriptionEndDate}*\n\n` +
      `Silakan buka aplikasi dan login sekarang untuk mulai menggunakan booth Anda:\n${window.location.origin}\n\n` +
      `Terima kasih telah bergabung bersama SnapBooth Receipt Studio!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleDirectWhatsAppChat = (user: UserAccount) => {
    const rawPhone = user.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const message = encodeURIComponent(
      `Halo *${user.displayName || user.businessName}*, kami dari Super Admin SnapBooth Receipt ingin mengonfirmasi pendaftaran akun studio Anda untuk paket *${user.requestedPlanName || 'Langganan'}*.\n\n` +
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
      <div className="p-10 text-center rounded-3xl bg-white border border-stone-200 space-y-3 animate-in fade-in shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-stone-900">Tidak Ada Pendaftaran Menunggu Approval</h3>
        <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
          Semua pendaftaran akun baru telah diproses. Pendaftaran baru dari klien dengan paket berbayar akan muncul di halaman ini untuk diverifikasi dan disetujui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Informative Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-white text-amber-600 border border-amber-200 shrink-0 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-amber-900">
                Persetujuan Pendaftaran Klien Baru (Approval System)
              </h4>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase font-mono">
                {pendingUsers.length} Permintaan Menunggu
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed max-w-2xl">
              Berikut adalah daftar calon klien yang mendaftar secara mandiri untuk paket berbayar. Anda dapat memverifikasi pembayaran/data, menyesuaikan paket durasi, lalu klik <strong>Setujui & Aktifkan</strong>.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs shadow-xs">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-stone-500">Rekening Resmi:</span>
              <strong className="text-amber-800 font-mono font-bold">{OFFICIAL_PAYMENT_INFO.fullLabel}</strong>
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
              className="p-5 rounded-3xl bg-white border border-amber-300 shadow-xs transition-all space-y-4"
            >
              {/* Header Card: Studio Info & Registration Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900">
                        {user.businessName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Menunggu Persetujuan
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Pemilik: <strong className="text-stone-800 font-semibold">{user.displayName}</strong> • Mendaftar pada: <span className="font-mono text-stone-600">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Chat */}
                {user.phone && (
                  <button
                    type="button"
                    onClick={() => handleDirectWhatsAppChat(user)}
                    className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Chat WhatsApp Klien</span>
                  </button>
                )}
              </div>

              {/* Grid Data Kredensial & Paket yang Dipilih */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Username & Pass */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 font-bold block flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    Kredensial Login:
                  </span>
                  <div className="font-mono text-stone-900 font-bold">
                    @{user.username || user.email}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 font-mono text-stone-700 text-[11px]">
                    <Lock className="w-3 h-3 text-stone-500" />
                    <span>Pass: {showPassword ? (user.password || '123456') : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordMap((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}
                      className="text-stone-400 hover:text-stone-800 ml-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 font-bold block flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    Kontak Klien:
                  </span>
                  <div className="font-mono text-stone-800 truncate">{user.email}</div>
                  <div className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{user.phone || '-'}</span>
                  </div>
                </div>

                {/* PIN Booth */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-500 font-bold block flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                    PIN Akses Booth:
                  </span>
                  <div className="font-mono text-sky-700 font-bold text-sm">
                    {user.boothAccessPin || '1234'}
                  </div>
                  <span className="text-[10px] text-stone-400 block">Kiosk Passcode</span>
                </div>

                {/* Requested Plan & Unique Code */}
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] text-amber-700 font-bold block flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Paket & Mutasi Transfer:
                  </span>
                  <div className="font-bold text-stone-900 text-[11px] leading-tight">
                    {user.requestedPlanName || 'Langganan Photobooth'}
                  </div>
                  {user.totalAmountPayable ? (
                    <div className="text-[11px] font-mono font-bold text-amber-800 flex items-center gap-1">
                      <span>Tagihan: {formatRupiah(user.totalAmountPayable)}</span>
                      {user.uniqueCode && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] border border-amber-200">
                          (Kode: {user.uniqueCode})
                        </span>
                      )}
                    </div>
                  ) : user.uniqueCode ? (
                    <div className="text-[10px] font-mono text-amber-800 font-bold">
                      Kode Unik: {user.uniqueCode}
                    </div>
                  ) : null}
                  <span className="text-[10px] text-stone-400 block font-mono">
                    Tipe: {user.registrationType || 'Pendaftaran Mandiri'}
                  </span>
                </div>
              </div>

              {/* Approval Options & Actions Bar */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Duration Choice Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                  <label className="font-bold text-stone-700 whitespace-nowrap flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
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
                    className="px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
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
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Memproses...' : '✅ Setujui & Aktifkan'}</span>
                  </button>

                  {/* Send WA Notification Button */}
                  {user.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppNotification(user)}
                      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-emerald-800 border border-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Kirim notifikasi pesan aktivasi via WhatsApp ke nomor klien"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notif WA</span>
                    </button>
                  )}

                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={() => setRejectingUserId(isRejecting ? null : user.id)}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
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
                    className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 transition-colors cursor-pointer shadow-xs"
                    title="Hapus Permohonan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rejection Reason Form */}
              {isRejecting && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Konfirmasi Penolakan Pendaftaran:</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-stone-700 font-bold block">Alasan Penolakan:</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Masukkan alasan penolakan (misal: Bukti transfer belum valid)"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-stone-900 text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectingUserId(null)}
                      className="px-3 py-1.5 rounded-xl bg-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-300 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => executeRejection(user)}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
