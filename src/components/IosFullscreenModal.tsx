import React from 'react';
import { Share, PlusSquare, Smartphone, Check, X, Sparkles } from 'lucide-react';

interface IosFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosFullscreenModal: React.FC<IosFullscreenModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Tips Layar Penuh di iPad & iPhone
              </h3>
              <p className="text-[11px] text-white/80">
                Mode Kiosk 100% tanpa bar browser Safari
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
          <p className="text-stone-600 leading-relaxed">
            Mode Layar Penuh Kiosk saat ini <strong>sudah aktif</strong> di dalam layar Anda! 
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Untuk Menghilangkan Alamat URL Safari Sepenuhnya:</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed text-[11px]">
              Sistem operasi Apple iOS membatasi tombol layar penuh otomatis agar bar Safari tidak hilang. Gunakan trik resmi Apple di bawah ini:
            </p>
          </div>

          <div className="space-y-2.5 font-sans">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <span>Tekan tombol Bagikan</span>
                  <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                  <span className="text-stone-500 font-normal text-xs">(Share)</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Ikon kotak berpanah ke atas di bagian bawah layar iPhone atau sudut atas layar iPad Safari.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <span>Pilih &quot;Tambahkan ke Layar Utama&quot;</span>
                  <PlusSquare className="w-3.5 h-3.5 text-orange-600 inline" />
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Scroll ke bawah pada menu pop-up Safari dan klik opsi <em>Add to Home Screen</em>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-800">
                  Buka SnapBooth dari Layar Utama
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Aplikasi akan terbuka otomatis dalam mode Kiosk 100% Layar Penuh murni tanpa bar browser selamanya!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95 text-center"
          >
            Saya Mengerti, Lanjutkan Kiosk
          </button>
        </div>
      </div>
    </div>
  );
};
