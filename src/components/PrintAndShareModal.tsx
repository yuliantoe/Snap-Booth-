import React, { useState, useEffect, useRef } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, SavedPhotoStrip } from '../types';
import { generatePhotoStripCanvas } from '../utils/canvasRenderer';
import { Printer, Download, Share2, QrCode, Copy, Check, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';

interface PrintAndShareModalProps {
  layout: LayoutType;
  theme: EventTheme;
  photos: PhotoSlot[];
  filter: FilterType;
  adjustments: ImageAdjustments;
  stickers: StickerItem[];
  onSaveToGallery: (strip: SavedPhotoStrip) => void;
  onResetSession: () => void;
}

export const PrintAndShareModal: React.FC<PrintAndShareModalProps> = ({
  layout,
  theme,
  photos,
  filter,
  adjustments,
  stickers,
  onSaveToGallery,
  onResetSession,
}) => {
  const [highResDataUrl, setHighResDataUrl] = useState<string>('');
  const [dualStripDataUrl, setDualStripDataUrl] = useState<string>('');
  const [thermal80DataUrl, setThermal80DataUrl] = useState<string>('');
  const [thermal58DataUrl, setThermal58DataUrl] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [printMode, setPrintMode] = useState<'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single'>('thermal_80mm');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Trigger celebration confetti & generate high-res canvas
  useEffect(() => {
    let isCancelled = false;

    // Launch party confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    async function generateExports() {
      setIsGenerating(true);
      try {
        const appUrl = window.location.href;

        // 1. Single High-Res Strip Canvas
        const singleCanvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: 1200,
        });

        const singleDataUrl = singleCanvas.toDataURL('image/png', 1.0);

        // 2. Thermal 80mm Canvas (800px)
        const thermal80Canvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: 800,
        });
        const t80DataUrl = thermal80Canvas.toDataURL('image/png', 1.0);

        // 3. Thermal 58mm Canvas (576px)
        const thermal58Canvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: 576,
        });
        const t58DataUrl = thermal58Canvas.toDataURL('image/png', 1.0);

        // 4. Dual Strip 4x6" Canvas (Two strips side by side)
        const dualCanvas = document.createElement('canvas');
        dualCanvas.width = 2400; // 4x6 ratio @ 400dpi
        dualCanvas.height = 3600;
        const ctx = dualCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, dualCanvas.width, dualCanvas.height);

          const singleImg = new Image();
          await new Promise((res) => {
            singleImg.onload = res;
            singleImg.src = singleDataUrl;
          });

          const stripWidth = 1100;
          const stripHeight = Math.round(stripWidth * (singleCanvas.height / singleCanvas.width));
          const topPadding = (dualCanvas.height - stripHeight) / 2;

          // Strip 1 Left
          ctx.drawImage(singleImg, 80, topPadding, stripWidth, stripHeight);
          // Strip 2 Right
          ctx.drawImage(singleImg, 1220, topPadding, stripWidth, stripHeight);

          // Center dotted cut line
          ctx.setLineDash([30, 20]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#CCCCCC';
          ctx.beginPath();
          ctx.moveTo(1200, 0);
          ctx.lineTo(1200, dualCanvas.height);
          ctx.stroke();
        }

        const dualDataUrl = dualCanvas.toDataURL('image/png', 1.0);

        // 5. QR Code for phone scan
        const qrUrl = await QRCode.toDataURL(appUrl, { width: 300, margin: 1 });

        if (!isCancelled) {
          setHighResDataUrl(singleDataUrl);
          setThermal80DataUrl(t80DataUrl);
          setThermal58DataUrl(t58DataUrl);
          setDualStripDataUrl(dualDataUrl);
          setQrCodeDataUrl(qrUrl);
          setIsGenerating(false);

          // Auto-save to gallery
          const savedStrip: SavedPhotoStrip = {
            id: `strip_${Date.now()}`,
            createdAt: Date.now(),
            dataUrl: singleDataUrl,
            themeName: theme.name,
            layout,
            eventTitle: theme.eventTitle,
          };
          onSaveToGallery(savedStrip);
        }
      } catch (err) {
        console.error('Error generating photo strip exports:', err);
        setIsGenerating(false);
      }
    }

    generateExports();

    return () => {
      isCancelled = true;
    };
  }, []);

  const getDataForCurrentMode = () => {
    switch (printMode) {
      case 'thermal_80mm':
        return thermal80DataUrl || highResDataUrl;
      case 'thermal_58mm':
        return thermal58DataUrl || highResDataUrl;
      case 'single':
        return highResDataUrl;
      case 'dual_4x6':
      default:
        return dualStripDataUrl || highResDataUrl;
    }
  };

  // Handle Download File
  const handleDownload = () => {
    const dataToDownload = getDataForCurrentMode();
    if (!dataToDownload) return;

    const link = document.createElement('a');
    const safeTitle = (theme.eventTitle || 'SnapBooth').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `SnapBooth_${safeTitle}_${printMode}_${Date.now()}.png`;
    link.href = dataToDownload;
    link.click();
  };

  // Instant Print triggering window.print
  const handlePrint = () => {
    const dataToPrint = getDataForCurrentMode();
    if (!dataToPrint) return;

    let pageCss = `@page { size: 4in 6in; margin: 0; } body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; } img { max-width: 100%; max-height: 100vh; object-fit: contain; }`;

    if (printMode === 'thermal_80mm') {
      pageCss = `@page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 0; width: 80mm; background: #ffffff; } img { width: 100%; height: auto; display: block; }`;
    } else if (printMode === 'thermal_58mm') {
      pageCss = `@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; width: 58mm; background: #ffffff; } img { width: 100%; height: auto; display: block; }`;
    } else if (printMode === 'single') {
      pageCss = `@page { size: auto; margin: 0; } body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; } img { max-width: 100%; max-height: 100vh; object-fit: contain; }`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser untuk mencetak foto.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Photo Strip - ${theme.eventTitle}</title>
          <style>${pageCss}</style>
        </head>
        <body>
          <img src="${dataToPrint}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Web Share API or WhatsApp Share
  const handleNativeShare = async () => {
    if (navigator.share && highResDataUrl) {
      try {
        const response = await fetch(highResDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `SnapBooth_${Date.now()}.png`, { type: 'image/png' });

        await navigator.share({
          title: theme.eventTitle,
          text: `Foto photobooth saya di ${theme.eventTitle}! 📸✨`,
          files: [file],
        });
      } catch (err) {
        // Fallback to clipboard
        handleCopyLink();
      }
    } else {
      handleWhatsAppShare();
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`Halo! Lihat hasil foto photobooth saya di ${theme.eventTitle}: ${window.location.href} 📸✨`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Hasil Foto Siap Dicetak & Bagikan!
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Cetak & Bagikan Ke Media Sosial
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Scan kode QR dengan kamera HP kamu untuk menyimpan foto langsung, atau cetak instan dengan printer stiker / struk kertas termal ukuran 80mm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Strip Render Preview */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl relative">
            {isGenerating ? (
              <div className="w-64 h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                <span className="text-xs font-semibold">Mengolah Hasil Cetak High-Res 80mm...</span>
              </div>
            ) : (
              <img
                src={getDataForCurrentMode()}
                alt="High Res Photo Strip"
                className="max-h-[500px] w-auto rounded shadow-lg object-contain"
              />
            )}
          </div>

          {/* Fixed Thermal 80mm Paper & Printer Setting Badge */}
          <div className="w-full space-y-2 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Format & Ukuran Kertas Cetak
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                ✓ 80mm Khusus
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Kertas Termal 80mm</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">80 x AUTO mm</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Standar Receipt Photobooth (Kertas Thermal Struk / Stiker Roll 80mm)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions, QR Code Scan, and Social Sharing */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Primary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Printer className="w-5 h-5" /> Cetak Instan Sesi Ini
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-amber-400" /> Unduh File Foto (PNG)
            </button>
          </div>

          {/* Scan Barcode Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Barcode Cetak Frame Foto</h3>
                <p className="text-xs text-slate-400">Pindai barcode ini langsung dari aplikasi pemindai HP Anda</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
              {/* Pure Barcode Graphic without white box */}
              <div className="flex flex-col items-center justify-center py-2 px-4">
                <div className="flex items-end gap-1 h-14 my-1">
                  {[3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 2, 3, 1, 2, 4, 1, 3].map((w, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xs ${idx % 2 === 0 ? 'bg-amber-400' : 'bg-transparent'}`}
                      style={{ width: `${w * 2.8}px`, height: '100%' }}
                    />
                  ))}
                </div>
                <span className="font-mono text-sm font-bold text-slate-300 tracking-widest mt-2">
                  * SNAPBOOTH-ID *
                </span>
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider mt-1">
                  SCAN BARCODE TO DOWNLOAD
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-900 w-full">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  ⚡ Otomatis Terhubung ke Foto
                </span>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Barcode polos ini secara elegan dicetak pada bagian bawah frame foto.
                </p>
              </div>
            </div>
          </div>

          {/* Social Media Sharing Trigger */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bagikan Langsung Ke Media Sosial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Native Mobile Share / Instagram Story */}
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" /> Instagram / Story
              </button>

              {/* WhatsApp Share */}
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Kirim WhatsApp
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active:scale-95 transition-all"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Tersalin!' : 'Salin Tautan'}
              </button>
            </div>
          </div>

          {/* Start New Session Button */}
          <div className="pt-2">
            <button
              onClick={onResetSession}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" /> Mulai Sesi Foto Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
