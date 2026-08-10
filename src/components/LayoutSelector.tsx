import React from 'react';
import { LayoutType, EventTheme, PhotoSlot } from '../types';
import { Sparkles, Check, ChevronRight } from 'lucide-react';

interface LayoutSelectorProps {
  selectedLayout: LayoutType;
  onSelectLayout: (layout: LayoutType) => void;
  currentTheme: EventTheme;
  photos?: PhotoSlot[];
  onOpenThemeCustomizer: () => void;
  onContinueToExport: () => void;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  selectedLayout,
  onSelectLayout,
  currentTheme,
  photos = [],
  onOpenThemeCustomizer,
  onContinueToExport,
}) => {
  const layouts: {
    id: LayoutType;
    title: string;
    description: string;
    slotsCount: number;
    badge?: string;
  }[] = [
    {
      id: 'strip4',
      title: 'Strip 4 Foto',
      description: 'Format klasik memanjang 4 foto bersusun vertikal.',
      slotsCount: 4,
      badge: 'Paling Populer',
    },
    {
      id: 'strip3',
      title: 'Strip 3 Foto',
      description: 'Format memanjang 3 foto dengan area header lebih besar.',
      slotsCount: 3,
    },
    {
      id: 'grid2x2',
      title: 'Grid Square 2x2',
      description: 'Format kotak 4 foto dalam susunan grid 2 kolom.',
      slotsCount: 4,
    },
    {
      id: 'polaroid',
      title: 'Polaroid Style',
      description: 'Format 1 foto Polaroid besar dengan area teks di bawah.',
      slotsCount: 1,
    },
    {
      id: 'photocard',
      title: 'Photocard Duo',
      description: 'Format kartu foto lanskap 2 foto bersusun ringkas.',
      slotsCount: 2,
    },
    {
      id: 'korean_receipt',
      title: 'Korean Receipt Photo (영수증)',
      description: 'Struk kasir ala Korea Life 4-Cuts dengan rincian struk & barcode termal.',
      slotsCount: 4,
      badge: 'Tren Viral Korea 🇰🇷',
    },
    {
      id: 'magazine',
      title: 'Cover Majalah Fashion & Editorial',
      description: 'Format cover majalah VOGUE / Editorial dengan judul besar, tanggal edisi, dan barcode.',
      slotsCount: 1,
      badge: 'Desain Editorial 📖',
    },
    {
      id: 'shopping_receipt',
      title: 'Struk Pembelian Kasir & Retail',
      description: 'Format struk belanja supermarket & kafe lengkap dengan rincian total belanja & barcode.',
      slotsCount: 4,
      badge: 'Struk Belanja 🛒',
    },
  ];

  const renderSlotImage = (idx: number, className: string) => {
    const photo = photos[idx];
    if (photo && photo.dataUrl) {
      return (
        <img
          src={photo.dataUrl}
          alt={`Preview ${idx + 1}`}
          className={`${className} object-cover overflow-hidden`}
        />
      );
    }
    return <div className={`${className} bg-slate-300`} />;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-800/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sesi Foto Berhasil ({photos.length} Foto)
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pilih Tata Letak & Tema Acara Anda
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Foto Anda telah berhasil ditangkap! Sekarang pilih format tata letak strip foto dan tema acara yang sesuai dengan momen spesial Anda.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-200">
              <span className="text-slate-400">Tema Aktif:</span>
              <span className="font-bold text-amber-300">{currentTheme.eventTitle}</span>
            </div>
            <button
              onClick={onOpenThemeCustomizer}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline underline-offset-4 transition-colors"
            >
              Ubah Tema & Judul Acara →
            </button>
          </div>
        </div>
      </div>

      {/* Layout Selection Cards */}
      <div>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          Pilih Format Tata Letak Foto
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((layout) => {
            const isSelected = selectedLayout === layout.id;

            return (
              <div
                key={layout.id}
                onClick={() => onSelectLayout(layout.id)}
                className={`group relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-rose-500 bg-slate-900 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {layout.badge && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm">
                    {layout.badge}
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white group-hover:text-rose-300 transition-colors">
                      {layout.title}
                    </h4>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-slate-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{layout.description}</p>

                  {/* Visual Strip Thumbnail Simulation with Real Photos */}
                  <div
                    className="p-3 rounded-xl border flex flex-col items-center justify-between gap-1.5 min-h-[140px] max-w-[160px] mx-auto shadow-inner overflow-hidden"
                    style={{
                      backgroundColor: currentTheme.frameColor || '#FFFFFF',
                      borderColor: currentTheme.accentColor || '#333333',
                    }}
                  >
                    <div className="w-full flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                      {layout.id === 'strip4' && (
                        <>
                          {renderSlotImage(0, 'w-full h-5 rounded')}
                          {renderSlotImage(1, 'w-full h-5 rounded')}
                          {renderSlotImage(2, 'w-full h-5 rounded')}
                          {renderSlotImage(3, 'w-full h-5 rounded')}
                        </>
                      )}
                      {layout.id === 'strip3' && (
                        <>
                          {renderSlotImage(0, 'w-full h-7 rounded')}
                          {renderSlotImage(1, 'w-full h-7 rounded')}
                          {renderSlotImage(2, 'w-full h-7 rounded')}
                        </>
                      )}
                      {layout.id === 'grid2x2' && (
                        <div className="grid grid-cols-2 gap-1 h-full">
                          {renderSlotImage(0, 'w-full h-10 rounded')}
                          {renderSlotImage(1, 'w-full h-10 rounded')}
                          {renderSlotImage(2, 'w-full h-10 rounded')}
                          {renderSlotImage(3, 'w-full h-10 rounded')}
                        </div>
                      )}
                      {layout.id === 'polaroid' && renderSlotImage(0, 'w-full h-20 rounded')}
                      {layout.id === 'photocard' && (
                        <>
                          {renderSlotImage(0, 'w-full h-10 rounded')}
                          {renderSlotImage(1, 'w-full h-10 rounded')}
                        </>
                      )}
                      {layout.id === 'korean_receipt' && (
                        <div className="flex flex-col gap-0.5 text-[7px] font-mono leading-tight py-1 bg-amber-50/50 p-1 rounded border border-dashed border-slate-300">
                          <div className="text-center font-bold text-slate-800 border-b border-dashed border-slate-300 pb-0.5">KR RECEIPT PHOTO</div>
                          {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                          <div className="text-[6px] text-center text-slate-700 pt-0.5 border-t border-dashed border-slate-300">TOTAL: ₩0 • THANK YOU</div>
                        </div>
                      )}
                      {layout.id === 'magazine' && (
                        <div className="flex flex-col gap-1 text-[7px] font-serif leading-tight p-1 bg-slate-950/80 text-amber-100 rounded border border-amber-500/30">
                          <div className="text-center font-black tracking-widest text-[9px] text-amber-300 border-b border-amber-500/30 pb-0.5">VOGUE</div>
                          {renderSlotImage(0, 'w-full h-16 rounded-sm')}
                          <div className="text-[6px] text-center text-slate-300 pt-0.5 font-sans">SPECIAL ISSUE • 2026</div>
                        </div>
                      )}
                      {layout.id === 'shopping_receipt' && (
                        <div className="flex flex-col gap-0.5 text-[7px] font-mono leading-tight py-1 bg-amber-50/60 p-1 rounded border border-dashed border-slate-400">
                          <div className="text-center font-bold text-slate-900 border-b border-dashed border-slate-400 pb-0.5">SUPERMARKET MART</div>
                          {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                          <div className="text-[6px] text-center text-slate-800 pt-0.5 border-t border-dashed border-slate-400">TOTAL: RP 0 (LUNAS)</div>
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <div className="w-12 h-1 bg-slate-400 rounded mx-auto" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>{layout.slotsCount} Foto Sesi</span>
                  <span className="font-semibold text-rose-400">Pilih Format</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onContinueToExport}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
        >
          Lanjut ke Cetak & Bagikan <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
