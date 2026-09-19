import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Heart,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Calendar,
  Sliders,
  Tv,
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
  isDashboardMinimized?: boolean;
  onToggleMinimizeDashboard?: () => void;
  onOpenScreensaver?: () => void;
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
  isDashboardMinimized = false,
  onToggleMinimizeDashboard,
  onOpenScreensaver,
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
  const rawPreview =
    currentTheme.slideshowPhotos && currentTheme.slideshowPhotos.length >= 3
      ? currentTheme.slideshowPhotos.slice(0, 3)
      : DEFAULT_RECEIPT_PHOTOS;
  const previewPhotos = rawPreview
    .filter((p) => Boolean(p && typeof p === 'string' && p.trim() !== ''))
    .concat(DEFAULT_RECEIPT_PHOTOS)
    .slice(0, 3);

  // Active photo cycling index for interactive strip
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhotoIdx((prev) => (prev + 1) % previewPhotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [previewPhotos.length]);

  // Auto-fit screen calculation for HP, Tablet, and Web without scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const computeScale = () => {
      if (!containerRef.current || !receiptRef.current) return;
      const cHeight = containerRef.current.clientHeight;
      const cWidth = containerRef.current.clientWidth;
      const rHeight = receiptRef.current.offsetHeight || 620;
      const rWidth = receiptRef.current.offsetWidth || 390;

      // Safe bounds (leaving room around borders)
      const availH = cHeight - 16;
      const availW = cWidth - 16;

      if (availH <= 0 || availW <= 0) return;

      const scaleH = availH / rHeight;
      const scaleW = availW / rWidth;
      const fitScale = Math.min(scaleH, scaleW, 1.05);

      // Clamp between 0.50 (very small phones) and 1.15 (large monitors)
      setScale(Math.max(0.50, Math.min(fitScale, 1.15)));
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', computeScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computeScale);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#f0f2f5] bg-[radial-gradient(#d4d7dc_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center p-1 sm:p-2 selection:bg-orange-600 selection:text-white select-none"
    >
      {/* Logged Out Notice Badge on Top (Compact & unobtrusive) */}
      {!isLoggedIn && (
        <div className="absolute top-2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/90 border border-orange-300 text-stone-800 text-[11px] shadow-xs backdrop-blur-xs font-mono">
          <Lock className="w-3 h-3 text-orange-600 shrink-0" />
          <span className="font-semibold text-stone-900">Kiosk Standby</span>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="ml-1 px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* THE MODERN VIRAL PHOTOBOOTH RECEIPT SLIP (AUTO-SCALED FIT)         */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={receiptRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
        className="relative w-[370px] sm:w-[400px] shrink-0 text-stone-900 select-none transition-transform"
      >
        {/* Paper Shadow Backing */}
        <div className="relative bg-white border border-stone-200/90 rounded-t-sm rounded-b-sm shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden text-stone-900">
          
          {/* Top Zigzag Serrated Tear Edge */}
          <div className="w-full h-3 overflow-hidden leading-none select-none bg-stone-100">
            <svg
              className="w-full h-3 text-white fill-current"
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
            >
              <polygon points="0,12 4,0 8,12 12,0 16,12 20,0 24,12 28,0 32,12 36,0 40,12 44,0 48,12 52,0 56,12 60,0 64,12 68,0 72,12 76,0 80,12 84,0 88,12 92,0 96,12 100,0 104,12 108,0 112,12 116,0 120,12" />
            </svg>
          </div>

          {/* Receipt Body Container */}
          <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
            
            {/* 1. Header Section */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-stone-500 font-bold uppercase">
                <span>★</span>
                <span>★</span>
                <span>SNAPBOOTH RECEIPT STUDIO</span>
                <span>★</span>
                <span>★</span>
              </div>

              {/* Brand Logo if configured */}
              {currentTheme.logoUrl && currentTheme.logoUrl.trim() !== '' ? (
                <div className="max-h-12 flex justify-center items-center py-0.5">
                  <img
                    src={currentTheme.logoUrl}
                    alt="Logo Event"
                    className="max-h-10 object-contain filter grayscale contrast-125"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 mx-auto rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-orange-600 shadow-2xs">
                  <Camera className="w-4 h-4" />
                </div>
              )}

              {/* Event / Studio Title */}
              <div className="space-y-0 pt-0.5">
                <h1 className="text-xl sm:text-2xl font-mono font-black text-stone-900 tracking-tight leading-none uppercase truncate">
                  {currentTheme.eventTitle || currentUser?.businessName || 'PHOTOBOOTH RECEIPT'}
                </h1>
                <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wide truncate">
                  {currentTheme.eventSubtitle || 'REAL-TIME MEMORY CAPSULE'}
                </p>
              </div>

              {/* Transaction Metadata Line */}
              <div className="pt-1 text-[10px] font-mono text-stone-500 flex items-center justify-between border-t border-b border-dashed border-stone-300 py-1 px-1">
                <span>DATE: {currentTheme.eventDate || formattedDate}</span>
                <span>TIME: {formattedTime}</span>
              </div>
              <div className="text-[9px] font-mono text-stone-400 flex items-center justify-between px-1">
                <span>ORDER: #SB-{currentTime.getFullYear()}09</span>
                <span>POS TERM #01</span>
              </div>
            </div>

            {/* 2. Embedded Photo Strip Showcase */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono font-bold text-stone-500 tracking-wider">
                <span className="flex items-center gap-1 text-orange-700">
                  <Sparkles className="w-2.5 h-2.5 text-orange-600" />
                  PHOTO PREVIEW STRIP
                </span>
                <span className="text-stone-400">3-FRAME THERMAL</span>
              </div>

              <div className="p-2 bg-stone-100/90 border border-stone-300 rounded-lg space-y-1.5 shadow-inner">
                <div className="grid grid-cols-3 gap-1.5">
                  {previewPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative aspect-[3/3.6] rounded bg-stone-200 overflow-hidden border ${
                        idx === activePhotoIdx
                          ? 'border-orange-500 ring-1 ring-orange-500/40'
                          : 'border-stone-300'
                      } transition-all duration-300 group`}
                    >
                      {photoUrl && photoUrl.trim() !== '' ? (
                        <img
                          src={photoUrl}
                          alt={`Preview Frame ${idx + 1}`}
                          className="w-full h-full object-cover filter grayscale contrast-125 brightness-95 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-300" />
                      )}
                      <div className="absolute inset-0 bg-stone-900/10 mix-blend-multiply pointer-events-none" />
                      <span className="absolute bottom-0.5 right-0.5 font-mono text-[7px] font-bold px-1 py-0.2 rounded bg-black/60 text-white backdrop-blur-xs">
                        0{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-stone-500 px-1">
                  <span>FILTER: MONO THERMAL</span>
                  <span className="text-emerald-700 font-bold">AUTO-PRINT: READY</span>
                </div>
              </div>
            </div>

            {/* 3. Primary Shutter Touch Button (Sleek & Proportional) */}
            <div className="space-y-1 pt-0.5">
              <button
                type="button"
                onClick={onStartPhotobooth}
                className="group relative w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-orange-500"
              >
                {!isLoggedIn ? (
                  <Lock className="w-3.5 h-3.5 text-white" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-white/80 flex items-center justify-center bg-white/20 group-hover:scale-105 transition-transform">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
                <span>{ctaText}</span>
              </button>

              <p className="text-[9px] font-mono text-stone-500 text-center">
                {!isLoggedIn
                  ? 'Kamera dinonaktifkan: Silakan masuk untuk mengaktifkan sesi booth'
                  : 'Sentuh tombol di atas untuk membuka kamera & cetak struk foto'}
              </p>

              {onOpenScreensaver && (
                <button
                  type="button"
                  onClick={onOpenScreensaver}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-300 text-stone-700 hover:text-orange-950 font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group"
                >
                  <Tv className="w-3 h-3 text-orange-600 group-hover:scale-105 transition-transform" />
                  <span>MEDIA PROMOSI KIOSK (SCREENSAVER)</span>
                </button>
              )}
            </div>

            {/* 4. Itemized Receipt Breakdown Table */}
            <div className="space-y-0.5 font-mono text-[10px] text-stone-700 border-t border-dashed border-stone-300 pt-2">
              <div className="flex justify-between font-bold text-stone-900 pb-0.5 border-b border-stone-200 text-[9px]">
                <span>ITEM DESCRIPTION</span>
                <span>QTY</span>
                <span>STATUS</span>
              </div>
              <div className="flex justify-between text-stone-600 pt-0.5">
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
                <span>03. UNLIMITED GOOD MEMORIES</span>
                <span>∞</span>
                <span className="text-stone-900 font-bold">PRICELESS</span>
              </div>

              {/* Total Summary */}
              <div className="pt-1 mt-1 border-t border-stone-300 space-y-0">
                <div className="flex justify-between text-[11px] font-bold text-stone-900">
                  <span>TOTAL MEMORIES:</span>
                  <span className="text-orange-700">Rp 0 (GRATIS)</span>
                </div>
                <div className="flex justify-between text-[9px] text-stone-500">
                  <span>PAYMENT METHOD:</span>
                  <span>SMILE & GOOD VIBES</span>
                </div>
              </div>
            </div>

            {/* 5. Barcode Section */}
            <div className="pt-1.5 text-center space-y-1 border-t border-dashed border-stone-300">
              {/* Realistic SVG Barcode */}
              <div className="flex justify-center py-0.5">
                <svg
                  className="h-7 w-56 text-stone-900"
                  viewBox="0 0 200 35"
                  preserveAspectRatio="none"
                >
                  <rect x="0" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="5" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="8" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="14" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="18" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="22" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="29" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="33" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="36" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="42" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="48" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="52" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="58" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="63" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="70" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="74" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="80" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="86" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="90" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="94" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="100" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="108" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="112" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="115" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="122" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="126" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="133" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="136" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="142" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="148" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="152" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="156" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="163" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="168" y="0" width="3" height="30" fill="currentColor" />
                  <rect x="174" y="0" width="1" height="30" fill="currentColor" />
                  <rect x="178" y="0" width="4" height="30" fill="currentColor" />
                  <rect x="184" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="188" y="0" width="5" height="30" fill="currentColor" />
                  <rect x="195" y="0" width="2" height="30" fill="currentColor" />
                  <rect x="198" y="0" width="2" height="30" fill="currentColor" />
                </svg>
              </div>
              <p className="font-mono text-[9px] text-stone-500 tracking-[0.2em]">
                * 9 8 B 9 0 8 D C - R E C *
              </p>

              {/* Thank You Note */}
              <div className="pt-1 text-stone-600 font-mono text-[9px] space-y-0.5">
                <p className="font-bold text-stone-800">
                  THANK YOU FOR VISITING & MAKING MEMORIES!
                </p>
                <p className="text-stone-500">
                  Simpan struk ini sebagai kapsul waktu kenangan indah Anda ♡
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Zigzag Serrated Tear Edge */}
          <div className="w-full h-3 overflow-hidden leading-none select-none bg-stone-100 rotate-180">
            <svg
              className="w-full h-3 text-white fill-current"
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
            >
              <polygon points="0,12 4,0 8,12 12,0 16,12 20,0 24,12 28,0 32,12 36,0 40,12 44,0 48,12 52,0 56,12 60,0 64,12 68,0 72,12 76,0 80,12 84,0 88,12 92,0 96,12 100,0 104,12 108,0 112,12 116,0 120,12" />
            </svg>
          </div>

        </div>

      </div>

    </div>
  );
};
