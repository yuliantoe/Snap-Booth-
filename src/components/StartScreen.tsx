import React from 'react';
import { Camera, Sparkles, Heart, Zap, Crown, Flame, Lock, LogIn } from 'lucide-react';
import { EventTheme, UserAccount } from '../types';

interface StartScreenProps {
  currentTheme: EventTheme;
  currentUser?: UserAccount | null;
  onUpdateTheme?: (updatedTheme: EventTheme) => void;
  onStartPhotobooth: () => void;
  onOpenThemeCustomizer?: () => void;
  onOpenAuthModal?: () => void;
}

const DEFAULT_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-sparkles-and-glitter-in-the-dark-42880-large.mp4';
const DEFAULT_WELCOME_PHOTO = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1920&q=80';

export const StartScreen: React.FC<StartScreenProps> = ({
  currentTheme,
  currentUser,
  onStartPhotobooth,
  onOpenAuthModal,
}) => {
  const isLoggedIn = Boolean(currentUser);
  const mediaType = currentTheme.welcomeMediaType || 'photo';
  const videoUrl = currentTheme.welcomeVideoUrl || DEFAULT_VIDEO;
  const photoUrl = currentTheme.welcomePhotoUrl || currentTheme.customBgImageUrl || DEFAULT_WELCOME_PHOTO;
  const homeStyle = currentTheme.homeStyle || 'classic';
  const ctaText = !isLoggedIn
    ? 'LOGIN UNTUK MULAI FOTO'
    : currentTheme.homeCtaText || 'SENTUH UNTUK MULAI FOTO';
  const ctaColor = currentTheme.homeCtaColor || 'rose_amber';
  const bgBlur = currentTheme.homeBgBlur || 'light';

  // CTA button styling map
  const getCtaClass = () => {
    if (!isLoggedIn) {
      return 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 text-white shadow-rose-500/40 border-amber-400/50 hover:brightness-110';
    }
    switch (ctaColor) {
      case 'cyber_neon':
        return 'bg-gradient-to-r from-cyan-500 via-teal-400 to-fuchsia-500 text-slate-950 shadow-cyan-500/50 border-cyan-300/60';
      case 'royal_gold':
        return 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-slate-950 shadow-amber-500/50 border-amber-300/80';
      case 'emerald':
        return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white shadow-emerald-500/40 border-emerald-400/50';
      case 'slate_dark':
        return 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/60 border-slate-700';
      case 'rose_amber':
      default:
        return 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-rose-500/40 border-rose-400/40';
    }
  };

  // Video/Photo background blur level
  const getBlurClass = () => {
    if (bgBlur === 'heavy') return 'filter blur-[5px] opacity-40';
    if (bgBlur === 'none') return 'opacity-75';
    return 'filter blur-[2px] opacity-60';
  };

  return (
    <div className="fixed inset-0 z-40 w-full h-full min-h-screen overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background Media Layer */}
      {mediaType === 'video' ? (
        <div className="absolute inset-0 z-0">
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover scale-105 transition-all ${getBlurClass()}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={photoUrl}
            alt="Welcoming Fullscreen Background"
            className={`w-full h-full object-cover scale-105 transition-all ${getBlurClass()}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/35" />
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse mix-blend-screen" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000 mix-blend-screen" />
        </div>
      )}

      {/* Logged Out Notice Banner */}
      {!isLoggedIn && (
        <div className="relative z-20 mb-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Menu Foto Tidak Aktif • Silakan Login Terlebih Dahulu</span>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="ml-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Login Sekarang
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 1: LUXURY WEDDING */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'luxury_wedding' && (
        <div className="relative z-10 w-full max-w-2xl bg-stone-950/80 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 sm:p-12 text-center my-auto shadow-2xl space-y-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Crown className="w-8 h-8" />
          </div>

          {currentTheme.logoUrl && (
            <div className="max-w-xs mx-auto max-h-32 flex items-center justify-center">
              <img src={currentTheme.logoUrl} alt="Wedding Logo" className="max-h-28 object-contain filter drop-shadow-md" />
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-amber-400/90 font-serif font-bold">
              ✦ {currentTheme.eventDate || '08 AGUSTUS 2026'} ✦
            </p>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-amber-100 tracking-wide leading-tight">
              {currentTheme.eventTitle || 'Sarah & Alex Wedding'}
            </h1>
            <p className="text-sm font-serif italic text-amber-200/70 max-w-md mx-auto">
              "{currentTheme.eventSubtitle || 'The Beginning of Forever'}"
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onStartPhotobooth}
              className={`group relative inline-flex items-center gap-4 px-10 py-5 sm:py-6 rounded-full font-bold text-lg sm:text-xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${getCtaClass()}`}
            >
              {!isLoggedIn ? (
                <Lock className="w-6 h-6 text-amber-200" />
              ) : (
                <Heart className="w-6 h-6 fill-current text-rose-300 animate-bounce" />
              )}
              <span>{ctaText}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 2: NEON PARTY / CYBERPUNK */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'neon_party' && (
        <div className="relative z-10 w-full max-w-2xl bg-black/85 backdrop-blur-2xl border-2 border-cyan-500/60 rounded-3xl p-8 sm:p-12 text-center my-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{currentTheme.eventDate || '08•08•2026'}</span>
          </div>

          {currentTheme.logoUrl && (
            <div className="max-w-xs mx-auto max-h-32 flex items-center justify-center">
              <img src={currentTheme.logoUrl} alt="Neon Logo" className="max-h-28 object-contain filter drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
            </div>
          )}

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-teal-300 tracking-tight leading-none filter drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {currentTheme.eventTitle || 'NEON NIGHT 2026'}
            </h1>
            <p className="text-sm font-mono text-cyan-200/80 max-w-md mx-auto uppercase tracking-widest">
              {currentTheme.eventSubtitle || 'Jakarta Midnight Rave'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onStartPhotobooth}
              className={`group relative inline-flex items-center gap-4 px-10 py-5 sm:py-6 rounded-2xl font-black text-lg sm:text-xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${getCtaClass()}`}
            >
              {!isLoggedIn ? (
                <Lock className="w-7 h-7 text-amber-300" />
              ) : (
                <Flame className="w-7 h-7 text-amber-300 animate-pulse" />
              )}
              <span>{ctaText}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 3: BILLBOARD HERO BANNER */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'billboard' && (
        <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto grid grid-cols-1 md:grid-cols-2">
          {/* Left Brand Showcase */}
          <div className="p-8 sm:p-10 flex flex-col justify-center items-center bg-gradient-to-br from-rose-950/60 to-slate-950 border-b md:border-b-0 md:border-r border-slate-800 text-center space-y-4">
            {currentTheme.logoUrl ? (
              <img src={currentTheme.logoUrl} alt="Logo" className="max-h-36 object-contain filter drop-shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Camera className="w-10 h-10" />
              </div>
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              {currentTheme.eventDate || '08 AGUSTUS 2026'}
            </span>
          </div>

          {/* Right Details & CTA */}
          <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6 text-left">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                {currentTheme.eventTitle || 'SnapBooth Studio'}
              </h1>
              <p className="text-sm text-slate-300 font-medium">
                {currentTheme.eventSubtitle || 'Abadikan Momen Spesial Anda Sekarang'}
              </p>
            </div>

            <button
              onClick={onStartPhotobooth}
              className={`w-full py-5 rounded-2xl font-black text-lg sm:text-xl shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 cursor-pointer ${getCtaClass()}`}
            >
              {!isLoggedIn ? <Lock className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
              <span>{ctaText}</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 4: KIOSK VERTICAL */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'kiosk_vertical' && (
        <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-slate-900/95 border-2 border-slate-700 rounded-[2.5rem] p-8 text-center my-auto shadow-2xl space-y-8">
          <div className="w-full h-2 bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 rounded-full mb-2" />

          {currentTheme.logoUrl && (
            <div className="max-h-28 flex justify-center items-center">
              <img src={currentTheme.logoUrl} alt="Logo" className="max-h-24 object-contain" />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              {currentTheme.eventDate || '08 AGUSTUS 2026'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {currentTheme.eventTitle || 'Tech Summit 2026'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {currentTheme.eventSubtitle || 'Connecting Innovation'}
            </p>
          </div>

          <button
            onClick={onStartPhotobooth}
            className={`w-full py-6 rounded-2xl font-black text-lg sm:text-xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 cursor-pointer ${getCtaClass()}`}
          >
            {!isLoggedIn ? <Lock className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
            <span>{ctaText}</span>
          </button>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 5: ULTRA MINIMAL */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'minimal' && (
        <div className="relative z-10 w-full max-w-xl text-center my-auto space-y-10">
          {currentTheme.logoUrl && (
            <img src={currentTheme.logoUrl} alt="Logo" className="max-h-24 mx-auto object-contain filter grayscale hover:grayscale-0 transition-all" />
          )}

          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-400 tracking-widest uppercase">
              {currentTheme.eventDate || '2026.08.08'}
            </p>
            <h1 className="text-4xl sm:text-6xl font-light tracking-widest text-white uppercase">
              {currentTheme.eventTitle || 'SNAPBOOTH'}
            </h1>
            <p className="text-xs text-slate-400 tracking-wider">
              {currentTheme.eventSubtitle || 'Classic Studio Experience'}
            </p>
          </div>

          <div>
            <button
              onClick={onStartPhotobooth}
              className={`px-12 py-5 rounded-none border border-white text-white font-mono text-sm tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer ${getCtaClass()}`}
            >
              {ctaText}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* STYLE 6: CLASSIC DEFAULT */}
      {/* ---------------------------------------------------- */}
      {homeStyle === 'classic' && (
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center space-y-8 my-auto">
          {/* Brand Logo Presentation */}
          {currentTheme.logoUrl ? (
            <div className="relative p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl flex items-center justify-center max-w-xs sm:max-w-md h-40 sm:h-48 transition-all hover:border-rose-500/30">
              <img
                src={currentTheme.logoUrl}
                alt={currentTheme.eventTitle || 'Brand Logo'}
                className="max-w-full max-h-full object-contain filter drop-shadow-xl"
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/40 backdrop-blur-md flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/10">
              <Camera className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}

          {/* Event Title & Subtitle Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-bold tracking-wide shadow-xl backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{currentTheme.eventDate || '08 AGUSTUS 2026'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
              {currentTheme.eventTitle || 'SnapBooth Studio'}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium max-w-md mx-auto">
              {currentTheme.eventSubtitle || 'Abadikan Momen Spesial Anda Sekarang'}
            </p>
          </div>

          {/* Start Touch Button */}
          <div className="pt-2">
            <button
              onClick={onStartPhotobooth}
              className={`group relative inline-flex items-center gap-4 px-10 sm:px-14 py-6 sm:py-7 rounded-3xl font-black text-xl sm:text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border cursor-pointer ${getCtaClass()}`}
            >
              <span className="relative z-10 flex items-center gap-3">
                {!isLoggedIn ? (
                  <Lock className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300 text-amber-200" />
                ) : (
                  <Camera className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300 text-amber-200" />
                )}
                <span>{ctaText}</span>
              </span>
            </button>
          </div>

          {/* Subtle Footer Hint */}
          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-medium">
            <span>📸 Cetak Foto Strip</span>
            <span>•</span>
            <span>⚡ Download QR Code</span>
          </div>
        </div>
      )}
    </div>
  );
};
