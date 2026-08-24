import React from 'react';
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
} from 'lucide-react';
import { UserAccount } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/subscriptionService';

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
  if (!isOpen || !currentUser) return null;

  const planInfo = SUBSCRIPTION_PLANS[currentUser.subscriptionPlan] || SUBSCRIPTION_PLANS.starter;

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      `Halo Super Admin snapBoth Receipt, saya ingin memperpanjang langganan photobooth untuk bisnis:\n\nNama Bisnis: ${currentUser.businessName || currentUser.displayName}\nEmail: ${currentUser.email}\nPaket: ${planInfo.name}\n\nMohon petunjuk pembayarannya. Terima kasih!`
    );
    window.open(`https://wa.me/6281288889999?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-center p-6 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white">
            Masa Langganan Telah Berakhir
          </h2>
          <p className="text-xs text-slate-400">
            Akses Dasboard Setting Photobooth terkunci untuk akun{' '}
            <strong className="text-amber-300 font-bold">{currentUser.businessName || currentUser.displayName}</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
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

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleWhatsAppContact}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Hubungi Super Admin via WhatsApp untuk Perpanjang</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Ganti Akun / Masuk Super Admin</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-400 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
