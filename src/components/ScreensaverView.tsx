import React, { useState, useEffect } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  LogIn,
  Home,
  Sparkles,
} from 'lucide-react';
import { EventTheme, UserAccount } from '../types';
import { SCREENSAVER_PRESETS, DEFAULT_SCREENSAVER_PHOTOS } from '../utils/screensaverPresets';

interface ScreensaverViewProps {
  currentTheme: EventTheme;
  currentUser?: UserAccount | null;
  onStartPhotobooth: () => void;
  onOpenLogin?: () => void;
  onClose: () => void;
}

export const ScreensaverView: React.FC<ScreensaverViewProps> = ({
  currentTheme,
  currentUser,
  onStartPhotobooth,
  onOpenLogin,
  onClose,
}) => {
  // Determine preset fallback - default to cafe_resto
  const presetType = currentTheme.screensaverPreset || 'cafe_resto';
  const defaultPreset =
    SCREENSAVER_PRESETS.find((p) => p.id === presetType) ||
    SCREENSAVER_PRESETS.find((p) => p.id === 'cafe_resto') ||
    SCREENSAVER_PRESETS[0];

  // Resolve active photos list
  const rawPhotos =
    currentTheme.screensaverPhotos && currentTheme.screensaverPhotos.length > 0
      ? currentTheme.screensaverPhotos
      : defaultPreset.photos || DEFAULT_SCREENSAVER_PHOTOS;
  const photos = (rawPhotos || []).filter((p) => Boolean(p && typeof p === 'string' && p.trim() !== ''));

  // Resolve texts & brand DNA
  const title = currentTheme.screensaverTitle || defaultPreset.title;
  const subtitle = currentTheme.screensaverSubtitle || defaultPreset.subtitle;
  const tagline = currentTheme.screensaverTagline || defaultPreset.tagline;
  const badgeText = currentTheme.screensaverBadgeText || defaultPreset.badgeText;
  const ctaText = currentTheme.screensaverCtaText || defaultPreset.ctaText;
  const highlights =
    currentTheme.screensaverHighlights && currentTheme.screensaverHighlights.length > 0
      ? currentTheme.screensaverHighlights
      : defaultPreset.highlights;
  const speedSeconds = currentTheme.screensaverSpeedSeconds || defaultPreset.speedSeconds || 6;
  const darkness = currentTheme.screensaverOverlayDarkness ?? defaultPreset.overlayDarkness ?? 0.55;
  const brandLogo = currentTheme.screensaverLogoUrl || currentTheme.logoUrl;

  // Active slide index
  const [currentIdx, setCurrentIdx] = useState(0);

  // Auto slide interval
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % photos.length);
    }, speedSeconds * 1000);

    return () => clearInterval(interval);
  }, [photos.length, speedSeconds]);

  // Handle keyboard (Space / Enter = Start/Login, Escape = Close, ArrowLeft/Right = navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (currentUser) {
          onStartPhotobooth();
        } else if (onOpenLogin) {
          onOpenLogin();
        } else {
          onStartPhotobooth();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentIdx((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIdx((prev) => (prev - 1 + photos.length) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, onStartPhotobooth, onOpenLogin, onClose, photos.length]);

  return (
    <div
      className="fixed inset-0 z-50 select-none bg-black text-white flex flex-col justify-between overflow-hidden animate-in fade-in duration-300 cursor-pointer"
      onClick={(e) => {
        // Klik di area layar langsung: Jika sudah login langsung ke menu foto, jika belum login ke menu login
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        if (currentUser) {
          onStartPhotobooth();
        } else if (onOpenLogin) {
          onOpenLogin();
        } else {
          onStartPhotobooth();
        }
      }}
    >
      {/* 1. Fullscreen Background Photo Slideshow with Smooth Cross-fade */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {photos.map((url, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={`${url}-${idx}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
              } transition-transform duration-[8000ms]`}
              style={{
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          );
        })}

        {/* Dynamic Dark Gradient Overlays for High Legibility */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${darkness})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%] pointer-events-none" />
      </div>

      {/* Center Promotional Body (Institusi, Judul, Tagline, & Highlight Poin) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 text-center max-w-5xl mx-auto my-auto pt-8 sm:pt-12 pb-6 pointer-events-auto">
        {/* Brand Logo if available */}
        {brandLogo && (
          <div className="mb-4 sm:mb-6 flex items-center justify-center">
            <img
              src={brandLogo}
              alt="Brand Logo"
              className="h-16 sm:h-20 md:h-24 max-w-[260px] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/15 shadow-xl"
            />
          </div>
        )}

        {/* Badge Text (e.g. '⭐ OFFICIAL SNAPBOOTH STUDIO' or custom preset badge) */}
        {badgeText && (
          <div className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 border border-white/25 text-white/95 text-[11px] sm:text-xs font-mono uppercase tracking-widest backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{badgeText}</span>
          </div>
        )}

        {/* Main Institution Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] uppercase font-display leading-tight max-w-4xl">
          {title}
        </h1>

        {/* Event / Subtitle Banner */}
        <div className="mt-3 sm:mt-4 inline-block px-4 py-1.5 rounded-full bg-orange-600/90 text-white font-bold text-xs sm:text-sm md:text-base tracking-wide border border-orange-400/60 shadow-xl backdrop-blur-md uppercase">
          {subtitle}
        </div>

        {/* Tagline / Inspirational Motto */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-lg md:text-xl text-stone-200 font-medium max-w-3xl leading-relaxed drop-shadow-md">
          "{tagline}"
        </p>

        {/* Highlight Points Checklist Pills */}
        {highlights && highlights.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-3xl">
            {highlights.map((point, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-white/20 text-xs sm:text-sm text-stone-100 backdrop-blur-md shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. Bottom Menu: Prominent Pulsing START PHOTOBOOTH Button & Slide Controls */}
      <footer className="relative z-10 w-full px-4 sm:px-8 pb-6 sm:pb-10 pt-2 flex flex-col items-center gap-4 pointer-events-auto">
        {/* Compact Interactive Start Button */}
        <div className="relative group">
          {/* Animated Glow Rings behind button */}
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 opacity-60 blur-sm group-hover:opacity-90 animate-pulse transition duration-1000 group-hover:duration-200" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (currentUser) {
                onStartPhotobooth();
              } else if (onOpenLogin) {
                onOpenLogin();
              } else {
                onStartPhotobooth();
              }
            }}
            className="relative px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-mono font-bold text-xs sm:text-sm md:text-base tracking-wider shadow-lg transition-all transform active:scale-95 flex items-center gap-2.5 sm:gap-3 border border-orange-400/60 cursor-pointer"
          >
            <div className="p-1.5 rounded-full bg-white/20 text-white shadow-inner flex items-center justify-center">
              {currentUser ? (
                <Home className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />
              ) : (
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              )}
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="leading-tight drop-shadow">
                {currentUser ? '🏠 MASUK KE MENU HOME' : '🔐 MASUK / LOGIN KE SISTEM PHOTOBOOTH'}
              </span>
              <span className="text-[9px] sm:text-[10px] font-sans font-normal text-white/85 tracking-normal">
                {currentUser
                  ? 'Sentuh untuk membuka menu utama tampilan home photobooth'
                  : 'Klik atau sentuh layar untuk membuka halaman login akun & PIN'}
              </span>
            </div>
          </button>
        </div>

        {/* Slide Indicators & Navigation Controls */}
        {photos.length > 1 && (
          <div className="flex items-center gap-3 mt-1 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx((prev) => (prev - 1 + photos.length) % photos.length);
              }}
              className="p-1 rounded-full hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {photos.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(dotIdx);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    dotIdx === currentIdx
                      ? 'w-6 bg-orange-500'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Foto ${dotIdx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx((prev) => (prev + 1) % photos.length);
              }}
              className="p-1 rounded-full hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Foto Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-stone-300 font-mono text-center drop-shadow">
          {currentUser
            ? '💡 Sentuh di mana saja pada layar atau tekan tombol untuk menuju tampilan home'
            : '💡 Sentuh di mana saja pada layar atau tekan tombol untuk masuk ke tampilan login'}
        </p>
      </footer>
    </div>
  );
};
