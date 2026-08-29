import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Crown,
  Phone,
  MessageCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  LogIn,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { UserAccount } from '../types';
import {
  SUBSCRIPTION_PLANS,
  OFFICIAL_PAYMENT_INFO,
  OFFICIAL_WHATSAPP_LINK,
  PRICING_PACKAGES,
  generateUniqueCode,
  formatRupiah,
} from '../services/subscriptionService';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('monthly_49k');
  const [expiredUniqueCode] = useState<number>(() => generateUniqueCode());
  const [copiedTotal, setCopiedTotal] = useState(false);

  if (!isOpen || !currentUser) return null;

  const planInfo = SUBSCRIPTION_PLANS[currentUser.subscriptionPlan] || SUBSCRIPTION_PLANS.starter;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(OFFICIAL_PAYMENT_INFO.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyTotal = (amount: number) => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedTotal(true);
    setTimeout(() => setCopiedTotal(false), 2500);
  };

  const handleWhatsAppContact = () => {
    window.open(OFFICIAL_WHATSAPP_LINK, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-center p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">
            Masa Langganan Telah Berakhir
          </h2>
          <p className="text-xs text-slate-400">
            Akses Dasboard Setting Photobooth terkunci untuk akun{' '}
            <strong className="text-amber-300 font-bold">{currentUser.businessName || currentUser.displayName}</strong>.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Paket Anda:</span>
            <span className="font-bold text-white">{planInfo.name}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Status Akun:</span>
            <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              🔴 Expired ({currentUser.subscriptionEndDate})
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Email Terdaftar:</span>
            <span className="font-mono text-slate-300">{currentUser.email}</span>
          </div>
        </div>

        {/* Official Bank Account Payment Information Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-950 to-amber-950/20 border-2 border-amber-500/40 text-left space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Rekening Tujuan Resmi Pembayaran</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              BCA Resmi
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bank Tujuan:</span>
              <span className="font-bold text-white tracking-wide">{OFFICIAL_PAYMENT_INFO.bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Nomor Rekening:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
                  {OFFICIAL_PAYMENT_INFO.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Salin Nomor Rekening"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Atas Nama (A/N):</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wide">
                {OFFICIAL_PAYMENT_INFO.accountHolder}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-amber-200/90 leading-relaxed italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            ⚠️ <strong>Perhatian:</strong> Hanya lakukan transfer ke <strong>{OFFICIAL_PAYMENT_INFO.fullLabel}</strong>. Kami tidak bertanggung jawab atas transaksi di luar rekening resmi ini.
          </p>
        </div>

        {/* Package Renewal Selection with Savings Badges & Unique Transaction Code */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Pilih Paket Perpanjangan:</span>
            <span className="text-[10px] text-amber-400 font-medium">Klik untuk lihat rincian transfer</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {PRICING_PACKAGES.map((pkg) => {
              const isSelected = selectedPlanId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPlanId(pkg.id)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between relative cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {pkg.discountBadge && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-sm border border-rose-400/40">
                      {pkg.discountBadge}
                    </span>
                  )}
                  {pkg.popular && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 shadow-sm border border-amber-300">
                      Populer
                    </span>
                  )}
                  <div>
                    <div className={`font-bold text-[11px] ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {pkg.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{pkg.durationLabel}</div>
                  </div>
                  <div className="mt-1 font-black text-white text-xs">{formatRupiah(pkg.price)}</div>
                </button>
              );
            })}
          </div>

          {/* Breakdown with Unique Code */}
          {(() => {
            const pkg = PRICING_PACKAGES.find((p) => p.id === selectedPlanId) || PRICING_PACKAGES[1];
            const total = pkg.price + expiredUniqueCode;

            return (
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Harga Paket:</span>
                  <span className="font-semibold text-slate-200">{formatRupiah(pkg.price)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Nomor Unik Transaksi:</span>
                  <span className="font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    +{expiredUniqueCode}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center bg-amber-500/10 -mx-1 px-2 py-1.5 rounded-lg border border-amber-500/30">
                  <div>
                    <div className="text-amber-300 font-bold text-xs">Total Pembayaran:</div>
                    <div className="text-[9px] text-slate-400">Transfer tepat 3 digit nomor unik di belakang</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-amber-300 text-sm tracking-wide">
                      {formatRupiah(total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTotal(total)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                        copiedTotal
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                      title="Salin Total Pembayaran"
                    >
                      {copiedTotal ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTotal ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleWhatsAppContact}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Konfirmasi & Chat via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Ganti Akun / Masuk Super Admin</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-400 font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
