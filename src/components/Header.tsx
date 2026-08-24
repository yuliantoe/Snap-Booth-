import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Sliders,
  RefreshCw,
  Tablet,
  Smartphone,
  Crown,
  Users,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  AlertCircle,
  ChevronDown,
  UserCheck,
  KeyRound,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { EventTheme, UserAccount } from '../types';
import { calculateRemainingDays, SUBSCRIPTION_PLANS, isDurationUnlimited } from '../services/subscriptionService';

interface HeaderProps {
  currentTheme: EventTheme;
  currentUser: UserAccount | null;
  onOpenControlPanel: () => void;
  onOpenSuperAdmin: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onResetSession: () => void;
  galleryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  currentUser,
  onOpenControlPanel,
  onOpenSuperAdmin,
  onOpenAuthModal,
  onLogout,
  onResetSession,
  galleryCount,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const isLandscape = currentTheme.tabletOrientation === 'landscape';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isUnl = currentUser ? isDurationUnlimited(currentUser.subscriptionEndDate) : false;
  const remainingDays = currentUser ? calculateRemainingDays(currentUser.subscriptionEndDate) : 0;
  const isExpired = !isUnl && (currentUser?.subscriptionStatus === 'expired' || remainingDays < 0);
  const isTrial = currentUser?.subscriptionStatus === 'trial' && !isExpired;
  const isExpiringSoon = !isSuperAdmin && !isUnl && !isExpired && remainingDays < 3 && remainingDays >= 0;
  const currentPlan = currentUser?.subscriptionPlan ? SUBSCRIPTION_PLANS[currentUser.subscriptionPlan] : null;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-3 sm:px-4 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                snapBoth<span className="text-rose-400"> Receipt</span>
              </h1>
              <span
                onClick={onOpenControlPanel}
                className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full cursor-pointer hover:bg-cyan-500/30 transition-all"
                title="Orientasi Layar Tablet"
              >
                {isLandscape ? <Tablet className="w-3 h-3 rotate-90" /> : <Smartphone className="w-3 h-3" />}
                <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-xs">
              {currentUser?.businessName || currentTheme.eventTitle || 'snapBoth Receipt Event'}
            </p>
          </div>
        </div>

        {/* Action Controls & User Account Pill with Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Account Dropdown Menu */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                  isSuperAdmin
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                    : isExpired
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 ring-1 ring-rose-500/40'
                    : isExpiringSoon
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 ring-1 ring-amber-500/40 animate-pulse'
                    : isTrial
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : isUnl
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title="Menu Akun dan Logout"
              >
                {isSuperAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : isExpired ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : isExpiringSoon ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="truncate max-w-[90px] sm:max-w-[120px] text-[11px] font-bold">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] font-medium opacity-80 truncate max-w-[90px] sm:max-w-[120px]">
                    {isSuperAdmin
                      ? 'Super Admin'
                      : isExpired
                      ? 'Expired'
                      : isExpiringSoon
                      ? `⚠️ Sisa ${remainingDays === 0 ? 'Hari ini' : `${remainingDays}h`}`
                      : isTrial
                      ? `Trial (${remainingDays}h)`
                      : isUnl
                      ? 'Unlimited (OFF)'
                      : `Aktif (${remainingDays}h)`}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Modal/Popover */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 py-2.5 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="px-4 py-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${
                          isSuperAdmin
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : isExpired
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : isExpiringSoon
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : isTrial
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : isUnl
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {isSuperAdmin ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {currentUser.displayName}
                        </p>
                        <p className="text-xs text-slate-400 font-mono truncate">
                          @{currentUser.username || currentUser.email.split('@')[0]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isSuperAdmin
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : isExpired
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : isExpiringSoon
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                                : isTrial
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : isUnl
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {isSuperAdmin
                              ? '👑 Super Admin'
                              : isExpired
                              ? '🔴 Langganan Berakhir'
                              : isExpiringSoon
                              ? `⚠️ Sisa ${remainingDays === 0 ? 'Hari ini' : `${remainingDays} Hari`}`
                              : isTrial
                              ? `🟡 Masa Trial (${remainingDays} Hari)`
                              : isUnl
                              ? '♾️ Tanpa Batas (OFF)'
                              : `🟢 ${currentPlan?.name || 'Pro'} (${remainingDays} Hari)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sisa masa aktif warning alert in dropdown */}
                    {isExpiringSoon && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-300 leading-tight">
                            Peringatan: Sisa Masa Aktif ({remainingDays === 0 ? 'Hari Ini' : `${remainingDays} Hari Lagi`})
                          </p>
                          <p className="text-[11px] text-slate-300 leading-snug">
                            Akun Anda akan segera berakhir pada {currentUser.subscriptionEndDate}. Segera lakukan perpanjangan paket.
                          </p>
                          {onOpenAuthModal && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenAuthModal();
                              }}
                              className="mt-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black hover:bg-amber-400 transition-colors inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Perpanjang Sekarang</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="p-1.5 space-y-1">
                    {/* Open Super Admin if role is super_admin */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSuperAdmin();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-amber-300">Portal Super Admin</div>
                          <div className="text-[10px] text-amber-400/70">Kelola database customer & paket</div>
                        </div>
                      </button>
                    )}

                    {/* Open Control Panel Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenControlPanel();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white">Pengaturan Booth</div>
                        <div className="text-[10px] text-slate-400">Ubah tema, branding, & layout cetak</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-800" />

                    {/* Logout Menu */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-rose-400">Logout / Keluar</div>
                        <div className="text-[10px] text-rose-400/70">Keluar dari akun {currentUser.displayName}</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-extrabold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Super Admin Manage Customer Button (Only shown if Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={onOpenSuperAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              title="Portal Super Admin: Kelola Customer & Langganan"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Kelola Customer</span>
            </button>
          )}

          {/* Main Control Panel Setting Button */}
          <button
            onClick={onOpenControlPanel}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-white text-xs sm:text-sm font-bold transition-all border border-rose-500/40 hover:border-rose-500/60 shadow-md active:scale-95"
            title="Buka Dasboard Setting Booth"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span>Dasboard</span>
            {galleryCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-black bg-rose-500 text-white rounded-full">
                {galleryCount}
              </span>
            )}
          </button>

          {/* New Session Reset */}
          <button
            onClick={onResetSession}
            className="flex items-center gap-1 px-2.5 py-2 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700 active:scale-95"
            title="Mulai Sesi Foto Baru"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Foto Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};
