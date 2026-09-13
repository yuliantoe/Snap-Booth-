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
  Zap,
  Minimize2,
  Maximize2,
  Monitor,
  EyeOff,
  Tv,
} from 'lucide-react';
import { EventTheme, UserAccount } from '../types';
import { calculateRemainingDays, SUBSCRIPTION_PLANS, isDurationUnlimited } from '../services/subscriptionService';
import { useScreenOrientation } from '../utils/useScreenOrientation';

interface HeaderProps {
  currentTheme: EventTheme;
  currentUser: UserAccount | null;
  onOpenControlPanel: () => void;
  onOpenSuperAdmin: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onResetSession: () => void;
  onToggleOrientation?: () => void;
  isDashboardMinimized?: boolean;
  onToggleMinimizeDashboard?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenScreensaver?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  currentUser,
  onOpenControlPanel,
  onOpenSuperAdmin,
  onOpenAuthModal,
  onLogout,
  onResetSession,
  onToggleOrientation,
  isDashboardMinimized = false,
  onToggleMinimizeDashboard,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenScreensaver,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMinimizeMenuOpen, setIsMinimizeMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const minimizeMenuRef = useRef<HTMLDivElement | null>(null);

  const orientationState = useScreenOrientation(currentTheme.tabletOrientation || 'auto');
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
      if (minimizeMenuRef.current && !minimizeMenuRef.current.contains(event.target as Node)) {
        setIsMinimizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 text-stone-900 px-2.5 sm:px-4 py-2 sm:py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
            <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-stone-900 flex items-center gap-1.5 truncate">
                <span>SnapBooth</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                  RECEIPT
                </span>
              </h1>
              {/* Orientation Mode Pill Badge */}
              <button
                type="button"
                onClick={onToggleOrientation || onOpenControlPanel}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold tracking-wide uppercase bg-stone-100 text-stone-700 border border-stone-200 hover:border-orange-500/50 rounded-md cursor-pointer hover:bg-stone-200 transition-all shrink-0 select-none active:scale-95"
                title="Klik untuk ubah orientasi layar: Otomatis / Portrait / Landscape"
              >
                {currentTheme.tabletOrientation === 'landscape' ? (
                  <>
                    <Tablet className="w-3 h-3 rotate-90 text-orange-600" />
                    <span className="hidden xs:inline">Landscape</span>
                  </>
                ) : currentTheme.tabletOrientation === 'portrait' ? (
                  <>
                    <Smartphone className="w-3 h-3 text-orange-600" />
                    <span className="hidden xs:inline">Portrait</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-orange-600" />
                    <span>Auto ({orientationState.isLandscape ? 'L' : 'P'})</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-stone-500 truncate max-w-[120px] sm:max-w-xs font-mono">
              {currentUser?.role === 'super_admin' || !currentUser?.businessName || currentUser.businessName.includes('HQ Indonesia')
                ? (currentTheme.eventTitle || 'SnapBooth Receipt Event')
                : currentUser.businessName}
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer select-none ${
                  isSuperAdmin
                    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    : isExpired
                    ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                    : isExpiringSoon
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                    : isTrial
                    ? 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
                    : isUnl
                    ? 'bg-stone-100 border-stone-200 text-stone-800 hover:bg-stone-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title="Menu Akun dan Logout"
              >
                {isSuperAdmin ? (
                  <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : isExpired ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : isExpiringSoon ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="truncate max-w-[90px] sm:max-w-[120px] text-[11px] font-bold">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] font-mono text-stone-500 truncate max-w-[90px] sm:max-w-[120px]">
                    {isSuperAdmin
                      ? 'Super Admin'
                      : isExpired
                      ? 'Expired'
                      : isExpiringSoon
                      ? `Sisa ${remainingDays === 0 ? 'Hari ini' : `${remainingDays}h`}`
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
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-white border border-stone-200 shadow-xl py-2 z-50 text-stone-800">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-stone-200">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border shrink-0 ${
                          isSuperAdmin
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : isExpired
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : isExpiringSoon
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : isTrial
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : isUnl
                            ? 'bg-stone-100 border-stone-200 text-stone-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        {isSuperAdmin ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {currentUser.displayName}
                        </p>
                        <p className="text-xs text-stone-500 font-mono truncate">
                          @{currentUser.username || currentUser.email.split('@')[0]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              isSuperAdmin
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isExpired
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isExpiringSoon
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : isTrial
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : isUnl
                                ? 'bg-stone-100 text-stone-700 border-stone-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isSuperAdmin
                              ? 'Super Admin'
                              : isExpired
                              ? 'Langganan Berakhir'
                              : isExpiringSoon
                              ? `Sisa ${remainingDays === 0 ? 'Hari ini' : `${remainingDays} Hari`}`
                              : isTrial
                              ? `Trial (${remainingDays} Hari)`
                              : isUnl
                              ? 'Tanpa Batas (OFF)'
                              : `${currentPlan?.name || 'Pro'} (${remainingDays} Hari)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sisa masa aktif warning alert in dropdown */}
                    {isExpiringSoon && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-800 leading-tight">
                            Masa Aktif ({remainingDays === 0 ? 'Hari Ini' : `${remainingDays} Hari Lagi`})
                          </p>
                          <p className="text-[11px] text-stone-600 leading-snug">
                            Akun Anda akan berakhir pada {currentUser.subscriptionEndDate}. Silakan lakukan perpanjangan paket.
                          </p>
                          {onOpenAuthModal && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenAuthModal();
                              }}
                              className="mt-1 px-3 py-1 rounded bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition-colors"
                            >
                              Perpanjang Sekarang
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="p-1.5 space-y-0.5">
                    {/* Open Super Admin if role is super_admin */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenSuperAdmin();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors text-left"
                      >
                        <div className="p-1.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-amber-900">Portal Super Admin</div>
                          <div className="text-[10px] text-stone-500">Kelola database customer & paket</div>
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">Pengaturan Booth</div>
                        <div className="text-[10px] text-stone-500">Ubah tema, branding, & layout cetak</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-stone-200" />

                    {/* Logout Menu */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-rose-800">Logout / Keluar</div>
                        <div className="text-[10px] text-rose-600">Keluar dari akun {currentUser.displayName}</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-all shadow-sm border border-orange-500/40 active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Super Admin Manage Customer Button (Only shown if Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={onOpenSuperAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs sm:text-sm font-semibold transition-all border border-amber-200 active:scale-95 cursor-pointer"
              title="Portal Super Admin: Kelola Customer & Langganan"
            >
              <Users className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Kelola Klien</span>
            </button>
          )}

          {/* Main Control Panel Setting Button */}
          <button
            onClick={onOpenControlPanel}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Buka Dasboard Setting Booth"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
            <span>Dashboard</span>
          </button>

          {/* Menu Minimize Tampilan Dashboard Screen Utama */}
          <div className="relative" ref={minimizeMenuRef}>
            <button
              type="button"
              onClick={() => setIsMinimizeMenuOpen(!isMinimizeMenuOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 text-xs sm:text-sm font-medium transition-all border border-stone-200 active:scale-95 cursor-pointer shadow-xs"
              title="Menu Minimize Tampilan Dashboard Screen Utama"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
              <span className="hidden sm:inline">Minimize</span>
              <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isMinimizeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMinimizeMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-stone-200 shadow-xl py-2 z-50 text-stone-800 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-3.5 py-2 border-b border-stone-100">
                  <span className="font-mono text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Mode Layar & Dashboard
                  </span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Atur visibilitas dashboard pada screen utama
                  </p>
                </div>

                <div className="p-1.5 space-y-1">
                  {/* Minimize Dashboard Header */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMinimizeMenuOpen(false);
                      onToggleMinimizeDashboard?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 hover:bg-orange-50 hover:text-orange-900 transition-colors text-left cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <Minimize2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-900 group-hover:text-orange-950">
                        {isDashboardMinimized ? 'Tampilkan Dashboard Penuh' : 'Minimize Dashboard Header'}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {isDashboardMinimized
                          ? 'Buka kembali header navigasi'
                          : 'Sembunyikan panel atas agar screen utama luas'}
                      </div>
                    </div>
                  </button>

                  {/* Toggle Fullscreen / Kiosk Mode */}
                  {onToggleFullscreen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMinimizeMenuOpen(false);
                        onToggleFullscreen();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-100 transition-colors text-left cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-200 transition-colors">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-stone-900">
                          {isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Kiosk)'}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {isFullscreen ? 'Kembali ke ukuran jendela biasa' : 'Sembunyikan browser chrome'}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Open Screensaver Promosi */}
                  {onOpenScreensaver && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMinimizeMenuOpen(false);
                        onOpenScreensaver();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-700 hover:bg-orange-50 hover:text-orange-950 transition-colors text-left cursor-pointer group border-t border-stone-100 pt-2"
                    >
                      <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <Tv className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-stone-900 group-hover:text-orange-950 flex items-center gap-1.5">
                          <span>Screensaver Promosi</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-orange-200 text-orange-800">
                            SHOWCASE
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Tampilan full-screen sekolah & perusahaan
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Session Reset */}
          <button
            onClick={onResetSession}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-lg bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-medium transition-all border border-stone-200 active:scale-95 cursor-pointer shadow-sm"
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
