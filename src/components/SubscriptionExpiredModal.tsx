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
import { SUBSCRIPTION_PLANS, OFFICIAL_PAYMENT_INFO, OFFICIAL_WHATSAPP_LINK } from '../services/subscriptionService';

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

  if (!isOpen || !currentUser) return null;

  const planInfo = SUBSCRIPTION_PLANS[currentUser.subscriptionPlan] || SUBSCRIPTION_PLANS.starter;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(OFFICIAL_PAYMENT_INFO.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
