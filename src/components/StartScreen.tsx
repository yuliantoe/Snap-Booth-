import React, { useState, useEffect } from 'react';
import {
  Camera,
  Heart,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  QrCode,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { EventTheme, UserAccount } from '../types';
import { DEFAULT_SLIDESHOW_PRODUCT_PHOTOS } from '../utils/productPresets';

interface StartScreenProps {
  currentTheme: EventTheme;
  currentUser?: UserAccount | null;
  onUpdateTheme?: (updatedTheme: EventTheme) => void;
  onStartPhotobooth: () => void;
  onOpenThemeCustomizer?: () => void;
  onOpenAuthModal?: () => void;
}

// Preset aesthetic photobooth snapshots for the modern receipt strip preview
const DEFAULT_RECEIPT_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
];

export const StartScreen: React.FC<StartScreenProps> = ({
  currentTheme,
  currentUser,
  onStartPhotobooth,
  onOpenAuthModal,
  onOpenThemeCustomizer,
}) => {
  const isLoggedIn = Boolean(currentUser);
  const homeStyle = currentTheme.homeStyle || 'classic';
  const ctaText = !isLoggedIn
    ? 'LOGIN UNTUK MULAI FOTO'
    : currentTheme.homeCtaText || 'SENTUH UNTUK MULAI FOTO';

  // Live real-time clock for authentic receipt timestamp
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date & time strings
  const formattedDate = currentTime
    .toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Receipt photos pool
  const previewPhotos =
    currentTheme.slideshowPhotos && currentTheme.slideshowPhotos.length >= 3
      ? currentTheme.slideshowPhotos.slice(0, 3)
      : DEFAULT_RECEIPT_PHOTOS;

  // Active photo cycling index for interactive strip
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhotoIdx((prev) => (prev + 1) % previewPhotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [previewPhotos.length]);

  return (
    <div className="relative min-h-[calc(100vh-110px)] w-full bg-[#f0f2f5] bg-[radial-gradient(#d4d7dc_1px,transparent_1px)] [background-size:24px_24px] flex flex-col items-center justify-center p-3 sm:p-6 md:p-10 selection:bg-orange-600 selection:text-white">
      
      {/* Top Floating Kiosk Status Bar */}
      <div className="w-full max-w-xl mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-xs border border-stone-200 text-xs text-stone-600 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono font-medium text-[11px] text-stone-700">
            KIOSK ONLINE • 80MM THERMAL PAPER
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-600" />
            {formattedTime} WIB
          </span>
        </div>
      </div>

      {/* Logged Out Notice Banner */}
      {!isLoggedIn && (
        <div className="w-full max-w-xl mb-4 sm:mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-stone-800 text-xs sm:text-sm shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-600 text-white shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Kiosk Photobooth Standby</p>
              <p className="text-stone-600 text-[11px]">Silakan login ke akun klien untuk memulai sesi foto</p>
            </div>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Login Kiosk
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* THE MODERN VIRAL PHOTOBOOTH RECEIPT SLIP                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative w-full max-w-[430px] sm:max-w-[460px] my-auto transition-all">
        
        {/* Paper Shadow Backing */}
        <div className="relative bg-white border border-stone-200/90 rounded-t-sm rounded-b-sm shadow-[0_22px_65px_-12px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.05)] overflow-hidden text-stone-900">
          
          {/* Top Zigzag Serrated Tear Edge */}
          <div className="w-full h-3.5 overflow-hidden leading-none select-none bg-stone-100">
            <svg
              className="w-full h-3.5 text-white fill-current"
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
            >
              <polygon points="0,12 4,0 8,12 12,0 16,12 20,0 24,12 28,0 32,12 36,0 40,12 44,0 48,12 52,0 56,12 60,0 64,12 68,0 72,12 76,0 80,12 84,0 88,12 92,0 96,12 100,0 104,12 108,0 112,12 116,0 120,12" />
            </svg>
          </div>

          {/* Receipt Body Container */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* 1. Header Section */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-stone-500 font-bold uppercase">
                <span>★</span>
                <span>★</span>
                <span>SNAPBOOTH RECEIPT STUDIO</span>
                <span>★</span>
                <span>★</span>
              </div>

              {/* Brand Logo if configured */}
              {currentTheme.logoUrl ? (
                <div className="max-h-20 flex justify-center items-center py-1">
                  <img
                    src={currentTheme.logoUrl}
                    alt="Logo Event"
                    className="max-h-16 object-contain filter grayscale contrast-125"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-orange-600 shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
              )}

              {/* Event / Studio Title */}
              <div className="space-y-0.5 pt-1">
                <h1 className="text-2xl sm:text-3xl font-mono font-black text-stone-900 tracking-tight leading-none uppercase">
                  {currentTheme.eventTitle || currentUser?.businessName || 'PHOTOBOOTH RECEIPT'}
                </h1>
                <p className="text-xs font-mono text-stone-500 uppercase tracking-wide">
                  {currentTheme.eventSubtitle || 'REAL-TIME MEMORY CAPSULE'}
                </p>
              </div>

              {/* Transaction Metadata Line */}
              <div className="pt-2 text-[11px] font-mono text-stone-500 flex flex-wrap items-center justify-between border-t border-b border-dashed border-stone-300 py-1.5 px-1">
                <span>DATE: {currentTheme.eventDate || formattedDate}</span>
                <span>TIME: {formattedTime}</span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 flex items-center justify-between px-1">
                <span>ORDER: #SB-{currentTime.getFullYear()}0909</span>
                <span>POS TERM #01</span>
              </div>
            </div>

            {/* 2. Embedded Photo Strip Showcase (Viral Korean/Tokyo Receipt Photobooth Style) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-500 tracking-wider">
                <span className="flex items-center gap-1 text-orange-700">
                  <Sparkles className="w-3 h-3 text-orange-600" />
                  PHOTO PREVIEW STRIP
                </span>
                <span className="text-stone-400">3-FRAME THERMAL LOOK</span>
              </div>

              <div className="p-2.5 bg-stone-100/90 border border-stone-300 rounded-lg space-y-2 shadow-inner">
                <div className="grid grid-cols-3 gap-2">
                  {previewPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative aspect-[3/4] rounded bg-stone-200 overflow-hidden border ${
                        idx === activePhotoIdx
                          ? 'border-orange-500 ring-2 ring-orange-500/30'
                          : 'border-stone-300'
                      } transition-all duration-300 group`}
                    >
                      <img
                        src={photoUrl}
                        alt={`Preview Frame ${idx + 1}`}
                        className="w-full h-full object-cover filter grayscale contrast-125 brightness-95 group-hover:scale-105 transition-transform"
                      />
                      {/* Thermal Paper Grain Filter Overlay */}
                      <div className="absolute inset-0 bg-stone-900/10 mix-blend-multiply pointer-events-none" />
                      {/* Frame Label */}
                      <span className="absolute bottom-1 right-1 font-mono text-[8px] font-bold px-1 py-0.2 rounded bg-black/60 text-white backdrop-blur-xs">
                        0{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 px-1 pt-0.5">
                  <span>FILTER: MONO THERMAL CONTRAST</span>
                  <span>AUTO-PRINT: READY</span>
                </div>
              </div>
            </div>

            {/* 3. Primary Shutter Touch Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onStartPhotobooth}
                className="group relative w-full py-4 sm:py-4.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-base sm:text-lg tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer border border-orange-500"
              >
                {!isLoggedIn ? (
                  <Lock className="w-5 h-5 text-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white/80 flex items-center justify-center bg-white/20 group-hover:scale-110 transition-transform">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                )}
                <span>{ctaText}</span>
              </button>

              <p className="text-[11px] font-mono text-stone-500 text-center">
                {!isLoggedIn
                  ? 'Kamera dinonaktifkan: Silakan masuk untuk mengaktifkan sesi booth'
                  : 'Sentuh tombol di atas untuk membuka kamera & mencetak struk foto'}
              </p>
            </div>

            {/* 4. Itemized Receipt Breakdown Table */}
            <div className="space-y-1 pt-1 font-mono text-[11px] text-stone-700 border-t border-dashed border-stone-300 pt-3">
              <div className="flex justify-between font-bold text-stone-900 pb-1 border-b border-stone-200 text-[10px]">
                <span>ITEM DESCRIPTION</span>
                <span>QTY</span>
                <span>STATUS</span>
              </div>
              <div className="flex justify-between text-stone-600 pt-1">
                <span>01. 4-CUT THERMAL STRIP</span>
                <span>1x</span>
                <span className="text-emerald-700 font-semibold">READY</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>02. HD DIGITAL QR SYNC</span>
                <span>1x</span>
                <span className="text-emerald-700 font-semibold">SYNCED</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>03. VINTAGE MOOD FILTER</span>
                <span>1x</span>
                <span className="text-orange-700 font-semibold">APPLIED</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>04. UNLIMITED GOOD MEMORIES</span>
                <span>∞</span>
                <span className="text-stone-900 font-bold">PRICELESS</span>
              </div>

              {/* Total Summary */}
              <div className="pt-2 mt-2 border-t border-stone-300 space-y-0.5">
                <div className="flex justify-between text-xs font-bold text-stone-900">
                  <span>TOTAL MEMORIES:</span>
                  <span className="text-orange-700">Rp 0 (GRATIS)</span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>PAYMENT METHOD:</span>
                  <span>SMILE & GOOD VIBES</span>
                </div>
              </div>
            </div>

            {/* 5. Barcode & QR Code Section */}
            <div className="pt-2 text-center space-y-2 border-t border-dashed border-stone-300">
              {/* Realistic SVG Barcode */}
              <div className="flex justify-center py-1">
                <svg
                  className="h-10 w-64 text-stone-900"
                  viewBox="0 0 200 40"
                  preserveAspectRatio="none"
                >
                  {/* Barcode lines simulation */}
                  <rect x="0" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="5" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="8" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="14" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="18" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="22" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="29" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="33" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="36" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="42" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="48" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="52" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="58" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="63" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="70" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="74" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="80" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="86" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="90" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="94" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="100" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="108" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="112" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="115" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="122" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="126" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="133" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="136" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="142" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="148" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="152" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="156" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="163" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="168" y="0" width="3" height="35" fill="currentColor" />
                  <rect x="174" y="0" width="1" height="35" fill="currentColor" />
                  <rect x="178" y="0" width="4" height="35" fill="currentColor" />
                  <rect x="184" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="188" y="0" width="5" height="35" fill="currentColor" />
                  <rect x="195" y="0" width="2" height="35" fill="currentColor" />
                  <rect x="198" y="0" width="2" height="35" fill="currentColor" />
                </svg>
              </div>
              <p className="font-mono text-[10px] text-stone-500 tracking-[0.25em]">
                * 9 8 B 9 0 8 D C - R E C *
              </p>

              {/* Thank You Note */}
              <div className="pt-2 text-stone-600 font-mono text-[10px] space-y-0.5">
                <p className="font-bold text-stone-800">
                  THANK YOU FOR VISITING & MAKING MEMORIES!
                </p>
                <p className="text-stone-500">
                  Simpan struk ini sebagai kapsul waktu kenangan indah Anda ♡
                </p>
                <p className="text-[9px] text-stone-400">
                  snapbooth.studio • @photobooth.receipt
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Zigzag Serrated Tear Edge */}
          <div className="w-full h-3.5 overflow-hidden leading-none select-none bg-stone-100 rotate-180">
            <svg
              className="w-full h-3.5 text-white fill-current"
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
            >
              <polygon points="0,12 4,0 8,12 12,0 16,12 20,0 24,12 28,0 32,12 36,0 40,12 44,0 48,12 52,0 56,12 60,0 64,12 68,0 72,12 76,0 80,12 84,0 88,12 92,0 96,12 100,0 104,12 108,0 112,12 116,0 120,12" />
            </svg>
          </div>

        </div>

      </div>

      {/* Bottom Subtle Studio Feature Pills */}
      <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-mono text-stone-500">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-2xs">
          <Printer className="w-3.5 h-3.5 text-orange-600" />
          Thermal Paper 80mm & 58mm
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-2xs">
          <QrCode className="w-3.5 h-3.5 text-orange-600" />
          Instant QR Code Download
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Offline & Cloud Synced
        </span>
      </div>

    </div>
  );
};
