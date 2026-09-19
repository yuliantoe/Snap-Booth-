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
      description: 'Struk kasir ala Korea Life 4-Cuts dengan rincian struk & font termal vintage.',
      slotsCount: 4,
      badge: 'Tren Viral Korea 🇰🇷',
    },
    {
      id: 'magazine',
      title: 'Cover Majalah Fashion & Editorial',
      description: 'Format cover majalah VOGUE / Editorial dengan judul besar dan tanggal edisi.',
      slotsCount: 1,
      badge: 'Desain Editorial 📖',
    },
    {
      id: 'calendar',
      title: 'Kalender & Tanggalan Kenangan (Wall Calendar 4 Foto)',
      description: 'Format tanggalan bulanan lengkap dengan grid 4 foto kenangan, nama bulan, dan penanda tanggal acara.',
      slotsCount: 4,
      badge: 'Tanggalan 4 Foto 🗓️',
    },
    {
      id: 'calendar_single',
      title: 'Kalender & Tanggalan 1 Foto (Single Wall Calendar)',
      description: 'Format kalender dinding 1 foto besar fokus utama, lengkap dengan grid hari bulanan & penanda tanggal acara.',
      slotsCount: 1,
      badge: 'Tanggalan 1 Foto 🗓️',
    },
    {
      id: 'shopping_receipt',
      title: 'Struk Pembelian Kasir & Retail',
      description: 'Format struk belanja supermarket & kafe lengkap dengan rincian total belanja.',
      slotsCount: 4,
      badge: 'Struk Belanja 🛒',
    },
    {
      id: 'instagram_story',
      title: 'Instagram Story (9:16)',
      description: 'Format vertikal IG Story 1 foto dengan progress bar, profile header, audio pill, dan reply bar.',
      slotsCount: 1,
      badge: 'Instagram Story 📸',
    },
    {
      id: 'tiktok_viral',
      title: 'TikTok Viral Reels (9:16)',
      description: 'Format vertikal TikTok 1 foto dengan For You tabs, action column Like/Komentar, dan piringan vinyl.',
      slotsCount: 1,
      badge: 'TikTok FYP 🎵',
    },
    {
      id: 'instagram_post',
      title: 'Instagram Feed Post (4:5)',
      description: 'Format feed post 4:5 elegan 1 foto berbingkai dengan post header, like/comment icon, dan caption.',
      slotsCount: 1,
      badge: 'Instagram Feed 📱',
    },
  ];

  const renderSlotImage = (idx: number, className: string) => {
    const photo = photos[idx];
    if (photo && photo.dataUrl && photo.dataUrl.trim() !== '') {
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
    <div className="h-full max-h-full w-full max-w-5xl mx-auto p-2 sm:p-4 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Scrollable Layout Selection Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 sm:space-y-4">
        {/* Welcome Banner (Compact) */}
        <div className="relative rounded-xl bg-[#131110] border border-stone-800 p-3.5 sm:p-5 text-stone-100 shadow-sm">
          <div className="max-w-2xl space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-orange-400" /> Sesi Selesai • {photos.length} Foto Siap
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-stone-100">
              Pilih Format Cetak & Tata Letak
            </h2>
            <p className="text-stone-400 text-xs leading-relaxed">
              Foto Anda telah siap. Tentukan format strip atau lembar cetak kenangan yang ingin dicetak dan dibagikan.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-xs text-stone-300 font-mono">
                <span className="text-stone-500 text-[10px]">TEMA:</span>
                <span className="font-bold text-orange-400 text-xs">{currentTheme.eventTitle}</span>
              </div>
              <button
                onClick={onOpenThemeCustomizer}
                className="text-xs font-mono font-medium text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors"
              >
                Ubah Tema →
              </button>
            </div>
          </div>
        </div>

        {/* Layout Selection Cards */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 font-bold mb-2.5 flex items-center gap-2">
            FORMAT TATA LETAK STRIP ({layouts.length} OPSI)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {layouts.map((layout) => {
            const isSelected = selectedLayout === layout.id;

            return (
              <div
                key={layout.id}
                onClick={() => onSelectLayout(layout.id)}
                className={`group relative p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-orange-500 bg-[#171513] ring-1 ring-orange-500/30 shadow-sm'
                    : 'border-stone-800 bg-[#121110] hover:border-stone-700 hover:bg-[#161413]'
                }`}
              >
                {layout.badge && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-600 text-white border border-orange-500 shadow-sm">
                    {layout.badge}
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-100 group-hover:text-orange-400 transition-colors text-sm sm:text-base">
                      {layout.title}
                    </h4>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'border-stone-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>

                  <p className="text-xs text-stone-400 leading-relaxed">{layout.description}</p>

                  {/* Visual Strip Thumbnail Simulation with Real Photos */}
                  <div
                    className="p-3 rounded-lg border flex flex-col items-center justify-between gap-1.5 min-h-[140px] max-w-[160px] mx-auto shadow-sm overflow-hidden bg-white border-slate-200"
                  >
                    <div className="w-full flex-1 flex flex-col justify-center gap-1 overflow-hidden">
                      {layout.id === 'strip4' && (
                        <>
                          {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                        </>
                      )}
                      {layout.id === 'strip3' && (
                        <>
                          {renderSlotImage(0, 'w-full h-7 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-7 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-7 rounded-xs')}
                        </>
                      )}
                      {layout.id === 'grid2x2' && (
                        <div className="grid grid-cols-2 gap-1 h-full">
                          {renderSlotImage(0, 'w-full h-10 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-10 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-10 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-10 rounded-xs')}
                        </div>
                      )}
                      {layout.id === 'polaroid' && renderSlotImage(0, 'w-full h-20 rounded-xs')}
                      {layout.id === 'photocard' && (
                        <>
                          {renderSlotImage(0, 'w-full h-10 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-10 rounded-xs')}
                        </>
                      )}
                      {layout.id === 'korean_receipt' && (
                        <div className="flex flex-col gap-0.5 text-[7px] font-mono leading-tight py-1 bg-white p-1 rounded-xs border border-dashed border-slate-300">
                          <div className="text-center font-bold text-slate-800 border-b border-dashed border-slate-300 pb-0.5">KR RECEIPT PHOTO</div>
                          {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                          <div className="text-[6px] text-center text-slate-700 pt-0.5 border-t border-dashed border-slate-300">TOTAL: ₩0 • THANK YOU</div>
                        </div>
                      )}
                      {layout.id === 'magazine' && (
                        <div className="flex flex-col gap-1 text-[7px] font-serif leading-tight p-1 bg-white text-slate-900 rounded-xs border border-slate-300 shadow-sm">
                          <div className="text-center font-black tracking-widest text-[9px] text-rose-700 border-b border-slate-200 pb-0.5">VOGUE</div>
                          {renderSlotImage(0, 'w-full h-16 rounded-xs border border-slate-200')}
                          <div className="text-[6px] text-center text-slate-500 pt-0.5 font-sans">SPECIAL ISSUE • 2026</div>
                        </div>
                      )}
                      {layout.id === 'calendar' && (
                        <div className="flex flex-col gap-0.5 text-[6px] font-sans leading-tight p-1 bg-white text-slate-900 rounded-xs border border-slate-300 shadow-sm">
                          <div className="flex justify-center gap-1.5 pb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                          </div>
                          <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-0.5">
                            <span className="font-black text-[7px] text-rose-600">AGUSTUS 2026</span>
                            <span className="text-[5px] text-slate-500 font-medium">MEMORIES</span>
                          </div>
                          <div className="grid grid-cols-2 gap-0.5 my-0.5">
                            {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                            {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                            {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                            {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-[4.5px] text-center font-mono text-slate-600 bg-slate-50 p-0.5 rounded-xs">
                            <span className="text-red-500 font-bold">M</span><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span>
                            <span className="text-slate-300">.</span><span className="text-slate-300">.</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                            <span>6</span><span>7</span><span className="bg-rose-500 text-white rounded-full font-bold">8</span><span>9</span><span>10</span><span>11</span><span>12</span>
                          </div>
                        </div>
                      )}
                      {layout.id === 'calendar_single' && (
                        <div className="flex flex-col gap-0.5 text-[6px] font-sans leading-tight p-1 bg-white text-slate-900 rounded-xs border border-slate-300 shadow-sm">
                          <div className="flex justify-center gap-1.5 pb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400" />
                          </div>
                          <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-0.5">
                            <span className="font-black text-[7px] text-rose-600">AGUSTUS 2026</span>
                            <span className="text-[5px] text-slate-500 font-medium">1 FOTO UTAMA</span>
                          </div>
                          <div className="my-0.5">
                            {renderSlotImage(0, 'w-full h-11 rounded-xs border border-slate-200 shadow-xs')}
                          </div>
                          <div className="text-[4.5px] text-center font-serif italic text-slate-500 pb-0.5">
                            “Save the date & our sweetest memories”
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-[4.5px] text-center font-mono text-slate-600 bg-slate-50 p-0.5 rounded-xs">
                            <span className="text-red-500 font-bold">M</span><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span>
                            <span className="text-slate-300">.</span><span className="text-slate-300">.</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                            <span>6</span><span>7</span><span className="bg-rose-500 text-white rounded-full font-bold">8</span><span>9</span><span>10</span><span>11</span><span>12</span>
                          </div>
                        </div>
                      )}
                      {layout.id === 'shopping_receipt' && (
                        <div className="flex flex-col gap-0.5 text-[7px] font-mono leading-tight py-1 bg-white p-1 rounded-xs border border-dashed border-slate-400">
                          <div className="text-center font-bold text-slate-900 border-b border-dashed border-slate-400 pb-0.5">SUPERMARKET MART</div>
                          {renderSlotImage(0, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(1, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(2, 'w-full h-5 rounded-xs')}
                          {renderSlotImage(3, 'w-full h-5 rounded-xs')}
                          <div className="text-[6px] text-center text-slate-800 pt-0.5 border-t border-dashed border-slate-400">TOTAL: RP 0 (LUNAS)</div>
                        </div>
                      )}
                      {layout.id === 'instagram_story' && (
                        <div className="flex flex-col gap-1 text-[6.5px] font-sans leading-tight p-1.5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white rounded-xs border border-slate-700 shadow-md w-full">
                          <div className="pb-0.5">
                            <div className="h-0.5 w-full bg-white/90 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between pb-0.5">
                            <div className="flex items-center gap-1">
                              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[1px] flex items-center justify-center">
                                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-[5px] font-black text-white">S</div>
                              </div>
                              <div>
                                <div className="flex items-center gap-0.5">
                                  <span className="font-bold text-[6.5px] text-white tracking-tight">snapbooth</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 text-[4px] flex items-center justify-center text-white">✓</span>
                                  <span className="text-[5px] text-slate-400">12m</span>
                                </div>
                                <div className="text-[4.5px] text-slate-300 font-medium">♫ Audio Resmi</div>
                              </div>
                            </div>
                            <span className="text-[6px] text-slate-300 font-bold">✕</span>
                          </div>
                          <div className="my-0.5 relative rounded-xs overflow-hidden border border-white/10">
                            {renderSlotImage(0, 'w-full h-20 rounded-xs')}
                            <div className="absolute top-1 left-1 px-1 py-0.5 rounded-full bg-white/90 text-slate-900 font-bold text-[4.5px] shadow-xs">
                              📍 Jakarta
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[5px] pt-0.5">
                            <div className="px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 text-[5px] flex-1 mr-1">
                              Kirim pesan...
                            </div>
                            <span className="text-red-500 font-bold text-[7px]">❤️</span>
                          </div>
                        </div>
                      )}
                      {layout.id === 'tiktok_viral' && (
                        <div className="flex flex-col gap-1 text-[6.5px] font-sans leading-tight p-1.5 bg-gradient-to-b from-black via-zinc-900 to-black text-white rounded-xs border border-zinc-700 shadow-md w-full">
                          <div className="flex items-center justify-between pb-0.5 text-[5px] border-b border-white/10">
                            <span className="text-rose-500 font-bold text-[5px]">● LIVE</span>
                            <span className="font-extrabold text-white text-[6px]">Untuk Anda</span>
                            <span className="text-white/80">🔍</span>
                          </div>
                          <div className="my-0.5 relative rounded-xs overflow-hidden border border-white/10">
                            {renderSlotImage(0, 'w-full h-20 rounded-xs')}
                            <div className="absolute bottom-1 left-1 right-6 text-[4.5px] text-white leading-tight bg-black/40 backdrop-blur-xs p-0.5 rounded-xs">
                              <div className="font-bold text-amber-300">@snapbooth ✨</div>
                              <div className="text-white/90 truncate">Trend Foto Viral Reels 2026</div>
                            </div>
                            <div className="absolute right-1 bottom-1 flex flex-col items-center gap-1 text-[5px]">
                              <span className="text-rose-500 font-bold">❤️</span>
                              <span className="text-white">💬</span>
                              <span className="text-amber-400">★</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[5px] pt-0.5 text-slate-300">
                            <span className="text-[5px] truncate font-mono">♫ Suara Asli Viral</span>
                            <span className="text-white">💿</span>
                          </div>
                        </div>
                      )}
                      {layout.id === 'instagram_post' && (
                        <div className="flex flex-col gap-1 text-[6.5px] font-sans leading-tight p-1.5 bg-white text-slate-900 rounded-xs border border-slate-300 shadow-sm w-full">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                            <div className="flex items-center gap-1">
                              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1px] flex items-center justify-center">
                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[5px] font-bold text-slate-800">S</div>
                              </div>
                              <div>
                                <div className="flex items-center gap-0.5">
                                  <span className="font-bold text-[6.5px] text-slate-900">snapbooth</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 text-[4px] flex items-center justify-center text-white">✓</span>
                                </div>
                                <div className="text-[4.5px] text-slate-400">Kenangan Spesial</div>
                              </div>
                            </div>
                            <span className="text-slate-400 font-bold">···</span>
                          </div>
                          <div className="my-0.5">
                            {renderSlotImage(0, 'w-full h-16 rounded-xs border border-slate-200')}
                          </div>
                          <div className="flex items-center justify-between text-[6px] pt-0.5 border-t border-slate-100">
                            <div className="flex gap-1.5 text-[6px]">
                              <span className="text-rose-600 font-bold">❤️</span>
                              <span>💬</span>
                              <span>✈️</span>
                            </div>
                            <span className="text-slate-700 font-bold">🔖</span>
                          </div>
                          <div className="text-[5px] text-slate-700 font-medium">
                            <span className="font-bold text-slate-900">snapbooth</span> Best moments ✨
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <div className="w-12 h-1 bg-slate-300 rounded-xs mx-auto" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-mono text-stone-400">
                  <span>{layout.slotsCount} SLOT FOTO</span>
                  <span className="font-bold text-orange-400">PILIH FORMAT</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* Continue Button Centered (Always visible at bottom) */}
      <div className="shrink-0 flex flex-col items-center justify-center pt-2 sm:pt-3 pb-1">
        <button
          onClick={onContinueToExport}
          className="flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer w-full max-w-sm border border-orange-500"
        >
          <span>Lanjut ke Cetak & Bagikan</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
