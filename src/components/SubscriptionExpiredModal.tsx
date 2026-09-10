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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#131110] border border-stone-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden text-center p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-12 rounded-xl bg-stone-900 border border-orange-500/40 text-orange-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-stone-100">
            Masa Lisensi Telah Berakhir
          </h2>
          <p className="text-xs text-stone-400">
            Akses dashboard konfigurasi dikunci untuk akun{' '}
            <strong className="text-orange-400 font-semibold">{currentUser.businessName || currentUser.displayName}</strong>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#181615] border border-stone-800 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-stone-400">
            <span>Paket Anda:</span>
            <span className="font-bold text-stone-100">{planInfo.name}</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Status Akun:</span>
            <span className="font-mono font-bold text-rose-400 bg-stone-900 px-2 py-0.5 rounded border border-rose-800/40">
              EXPIRED ({currentUser.subscriptionEndDate})
            </span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Email:</span>
            <span className="font-mono text-stone-300">{currentUser.email}</span>
          </div>
        </div>

        {/* Official Bank Account Payment Information Card */}
        <div className="p-4 rounded-xl bg-[#181615] border border-stone-800 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-200 font-mono font-bold text-xs">
              <CreditCard className="w-4 h-4 text-orange-400" />
              <span>Rekening Pembayaran Resmi</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-700">
              BCA Official
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#110f0e] border border-stone-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-mono">Bank:</span>
              <span className="font-mono font-bold text-stone-100 tracking-wide">{OFFICIAL_PAYMENT_INFO.bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-mono">Rekening:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-orange-400 text-sm tracking-wider">
                  {OFFICIAL_PAYMENT_INFO.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    copied
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                  }`}
                  title="Salin Nomor Rekening"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-mono">Atas Nama:</span>
              <span className="font-mono font-bold text-stone-100 uppercase tracking-wide">
                {OFFICIAL_PAYMENT_INFO.accountHolder}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed bg-stone-900/80 p-2 rounded-lg border border-stone-800">
            <strong>Perhatian:</strong> Hanya lakukan transfer ke <strong>{OFFICIAL_PAYMENT_INFO.fullLabel}</strong>.
          </p>
        </div>

        {/* Package Renewal Selection with Savings Badges & Unique Transaction Code */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-300">Pilih Paket Perpanjangan:</span>
            <span className="text-[10px] text-stone-500 font-mono">3 digit unik otomatis</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {PRICING_PACKAGES.map((pkg) => {
              const isSelected = selectedPlanId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPlanId(pkg.id)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between relative cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-stone-900 border-orange-500 text-orange-400 ring-1 ring-orange-500/50'
                      : 'bg-[#181615] border-stone-800 hover:border-stone-700 text-stone-300'
                  }`}
                >
                  {pkg.discountBadge && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-600 text-white shadow-sm border border-orange-500">
                      {pkg.discountBadge}
                    </span>
                  )}
                  {pkg.popular && !pkg.discountBadge && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-stone-800 text-stone-300 shadow-sm border border-stone-700">
                      Populer
                    </span>
                  )}
                  <div>
                    <div className={`font-bold text-[11px] ${isSelected ? 'text-orange-400' : 'text-stone-200'}`}>
                      {pkg.name}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">{pkg.durationLabel}</div>
                  </div>
                  <div className="mt-1 font-mono font-bold text-stone-100 text-xs">{formatRupiah(pkg.price)}</div>
                </button>
              );
            })}
          </div>

          {/* Breakdown with Unique Code */}
          {(() => {
            const pkg = PRICING_PACKAGES.find((p) => p.id === selectedPlanId) || PRICING_PACKAGES[1];
            const total = pkg.price + expiredUniqueCode;

            return (
              <div className="p-3 rounded-lg bg-[#181615] border border-stone-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-stone-400 text-[11px]">
                  <span>Harga Paket:</span>
                  <span className="font-mono font-medium text-stone-200">{formatRupiah(pkg.price)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-400">Nomor Unik Transaksi:</span>
                  <span className="font-mono font-bold text-orange-400 bg-stone-900 px-1.5 py-0.5 rounded border border-orange-500/30">
                    +{expiredUniqueCode}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-stone-800 flex justify-between items-center bg-stone-900/60 -mx-1 px-2 py-1.5 rounded border border-stone-800">
                  <div>
                    <div className="text-stone-200 font-bold text-xs">Total Transfer:</div>
                    <div className="text-[9px] text-stone-500 font-mono">Tepat beserta 3 digit nomor unik</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-orange-400 text-sm tracking-wide">
                      {formatRupiah(total)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTotal(total)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        copiedTotal
                          ? 'bg-orange-600 text-white'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
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
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Konfirmasi Perpanjangan via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 font-mono font-medium text-xs border border-stone-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-orange-400" />
            <span>Ganti Akun / Masuk Super Admin</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-400 font-mono cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
