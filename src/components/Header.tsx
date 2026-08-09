import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sliders, RefreshCw, Tablet, Smartphone, Crown, User, ChevronDown } from 'lucide-react';
import { EventTheme } from '../types';

interface HeaderProps {
  currentTheme: EventTheme;
  onOpenControlPanel: (role?: 'admin' | 'user') => void;
  onResetSession: () => void;
  galleryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onOpenControlPanel,
  onResetSession,
  galleryCount,
}) => {
  const isLandscape = currentTheme.tabletOrientation === 'landscape';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-md shadow-rose-500/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SnapBooth<span className="text-rose-400">Studio</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                Photobooth Digital
              </span>
              <span
                onClick={() => onOpenControlPanel('admin')}
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full cursor-pointer hover:bg-cyan-500/30 transition-all"
                title="Klik untuk mengubah orientasi tablet di Dasboard"
              >
                {isLandscape ? <Tablet className="w-3 h-3 rotate-90" /> : <Smartphone className="w-3 h-3" />}
                <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {currentTheme.eventTitle || 'Acara Kamu'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Control Panel Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-white text-xs sm:text-sm font-bold transition-all border border-rose-500/40 hover:border-rose-500/60 shadow-md active:scale-95"
              title="Pilih Menu Akses Dasboard (Admin / User)"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Dasboard</span>
              {galleryCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-rose-500 text-white rounded-full">
                  {galleryCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-amber-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu for Admin vs User Mode */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Akses Dasboard
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenControlPanel('admin');
                  }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300">Dasboard Admin</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">Akses Penuh</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Pengaturan tema, upload custom, video brand, & sistem kiosk.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenControlPanel('user');
                  }}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800 transition-all text-left group mt-1"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">Dasboard User</span>
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-bold">Tamu</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Galeri foto, unduh cetakan, & pilih tema preset favorit.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* New Session Reset */}
          <button
            onClick={onResetSession}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-700 hover:border-slate-600 active:scale-95"
            title="Mulai Sesi Foto Baru"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Foto Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};

