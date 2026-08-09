import React from 'react';
import { Camera, Sliders, Images, RefreshCw } from 'lucide-react';
import { EventTheme } from '../types';

interface HeaderProps {
  currentTheme: EventTheme;
  onOpenControlPanel: () => void;
  onResetSession: () => void;
  galleryCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onOpenControlPanel,
  onResetSession,
  galleryCount,
}) => {
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
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {currentTheme.eventTitle || 'Acara Kamu'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Control Panel Button */}
          <button
            onClick={onOpenControlPanel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-white text-xs sm:text-sm font-bold transition-all border border-rose-500/40 hover:border-rose-500/60 shadow-md active:scale-95"
            title="Buka Control Panel Sistem (Tema, Media, Galeri, Kiosk)"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Control Panel</span>
            {galleryCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold bg-rose-500 text-white rounded-full">
                {galleryCount}
              </span>
            )}
          </button>

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

