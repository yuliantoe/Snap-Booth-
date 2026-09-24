import React, { useState, useEffect, useRef } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, UserAccount } from '../types';
import { generatePhotoStripCanvas, ThermalDitherAlgorithm } from '../utils/canvasRenderer';
import { isDurationUnlimited, calculateRemainingDays } from '../services/subscriptionService';
import {
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  Info,
  Home,
  Camera,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { sounds } from '../utils/audio';

interface PrintAndShareModalProps {
  layout: LayoutType;
  theme: EventTheme;
  photos: PhotoSlot[];
  filter: FilterType;
  adjustments: ImageAdjustments;
  stickers: StickerItem[];
  onResetSession: () => void;
  currentUser?: UserAccount | null;
}

export const PrintAndShareModal: React.FC<PrintAndShareModalProps> = ({
  layout,
  theme,
  photos,
  filter,
  adjustments,
  stickers,
  onResetSession,
  currentUser,
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isUnl = currentUser ? isDurationUnlimited(currentUser.subscriptionEndDate) : false;
  const isExpired = !isUnl && (currentUser?.subscriptionStatus === 'expired' || calculateRemainingDays(currentUser?.subscriptionEndDate || '') < 0);
  const isTrial = !isSuperAdmin && currentUser?.subscriptionStatus === 'trial' && !isExpired;

  const [highResDataUrl, setHighResDataUrl] = useState<string>('');
  const [dualStripDataUrl, setDualStripDataUrl] = useState<string>('');
  const [thermal80DataUrl, setThermal80DataUrl] = useState<string>('');
  const [thermal58DataUrl, setThermal58DataUrl] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [autoPrintNotice, setAutoPrintNotice] = useState<boolean>(false);
  const hasAutoPrintedRef = useRef<boolean>(false);

  const [quickPrintStatus, setQuickPrintStatus] = useState<'idle' | 'printing' | 'success'>('idle');
  const [quickPrintMessage, setQuickPrintMessage] = useState<string>('');

  // Determine printer paper format from kiosk theme settings
  const printerType: 'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single' =
    theme.autoPrintMode === 'thermal_58mm'
      ? 'thermal_58mm'
      : theme.autoPrintMode === 'dual_4x6'
      ? 'dual_4x6'
      : theme.autoPrintMode === 'single'
      ? 'single'
      : 'thermal_80mm';

  const activePrinter = {
    name: 'Printer',
    type: printerType,
  };

  // Normal Standard Receipt Print Configuration (100% natural, standard receipt output)
  const clarityLevel = 0; // 0 = standard natural, no unsharp mask exaggeration
  const printBrightness = 1.0; // 1.0 = standard 100% normal brightness
  const printContrast = 1.0; // 1.0 = standard 100% normal contrast
  const thermalDither = true; // Standard 1-bit raster dithering for receipt paper
  const thermalDitherMode: ThermalDitherAlgorithm = 'atkinson'; // Cleanest natural receipt dots
  const thermalDensity = 1.0; // Standard 1.0x normal receipt density
  const thermalResMode = 'native_dot' as const; // 1:1 hardware dot resolution
  const photoTextColor = 'black' as const; // Standard solid black receipt text

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
        const effectiveOverrideTextColor =
          photoTextColor === 'black'
            ? '#000000'
            : photoTextColor === 'white'
            ? '#FFFFFF'
            : theme.textColor || '#000000';

        // 1. Single Strip Canvas (Standard 1080px for lightning-fast generation & perfect print output)
        const singleCanvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: 1080,
          isTrial,
          clarityLevel,
          printBrightness,
          printContrast,
          thermalDither: false,
          overrideTextColor: effectiveOverrideTextColor,
        });
        const singleDataUrl = singleCanvas.toDataURL('image/png', 0.95);

        // 2. Thermal 80mm Canvas (576px native hardware dots @ 203 DPI or 800px HD)
        const thermal80Width = thermalResMode === 'native_dot' ? 576 : 800;
        const thermal80Canvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: thermal80Width,
          isTrial,
          clarityLevel,
          printBrightness,
          printContrast,
          thermalDither,
          thermalDitherMode,
          thermalDensity,
          overrideTextColor: effectiveOverrideTextColor,
        });
        const t80DataUrl = thermal80Canvas.toDataURL('image/png', 1.0);

        // 3. Thermal 58mm Canvas (384px native hardware dots @ 203 DPI or 580px HD)
        const thermal58Width = thermalResMode === 'native_dot' ? 384 : 580;
        const thermal58Canvas = await generatePhotoStripCanvas({
          photos,
          layout,
          theme,
          filter,
          adjustments,
          stickers,
          includeQrCode: true,
          qrUrl: appUrl,
          targetWidth: thermal58Width,
          isTrial,
          clarityLevel,
          printBrightness,
          printContrast,
          thermalDither,
          thermalDitherMode,
          thermalDensity,
          overrideTextColor: effectiveOverrideTextColor,
        });
        const t58DataUrl = thermal58Canvas.toDataURL('image/png', 1.0);

        // 4. Dual Strip 4x6" Canvas (Two strips side by side @ standard 1200x1800)
        const dualCanvas = document.createElement('canvas');
        dualCanvas.width = 1200; // Standard 4x6 ratio (1200x1800) for instant rendering
        dualCanvas.height = 1800;
        const ctx = dualCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, dualCanvas.width, dualCanvas.height);

          const singleImg = new Image();
          await new Promise((res) => {
            singleImg.onload = res;
            singleImg.src = singleDataUrl;
          });

          const stripWidth = 550;
          const stripHeight = Math.round(stripWidth * (singleCanvas.height / singleCanvas.width));
          const topPadding = (dualCanvas.height - stripHeight) / 2;

          // Strip 1 Left
          ctx.drawImage(singleImg, 40, topPadding, stripWidth, stripHeight);
          // Strip 2 Right
          ctx.drawImage(singleImg, 610, topPadding, stripWidth, stripHeight);

          // Center dotted cut line
          ctx.setLineDash([15, 10]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#CCCCCC';
          ctx.beginPath();
          ctx.moveTo(600, 0);
          ctx.lineTo(600, dualCanvas.height);
          ctx.stroke();
        }

        const dualDataUrl = dualCanvas.toDataURL('image/png', 0.95);

        // 5. QR Code for phone scan
        const qrUrl = await QRCode.toDataURL(appUrl, { width: 300, margin: 1 });

        if (!isCancelled) {
          setHighResDataUrl(singleDataUrl);
          setThermal80DataUrl(t80DataUrl);
          setThermal58DataUrl(t58DataUrl);
          setDualStripDataUrl(dualDataUrl);
          setQrCodeDataUrl(qrUrl);
          setIsGenerating(false);
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

  // Get data URL based on format
  const getDataForType = (type: 'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single') => {
    switch (type) {
      case 'thermal_80mm':
        return thermal80DataUrl || highResDataUrl;
      case 'thermal_58mm':
        return thermal58DataUrl || highResDataUrl;
      case 'single':
        return thermalDither ? (thermal80DataUrl || highResDataUrl) : highResDataUrl;
      case 'dual_4x6':
      default:
        return dualStripDataUrl || highResDataUrl;
    }
  };

  const currentPrintData = getDataForType(activePrinter.type);

  // Helper to build standardized, cross-platform Print Document HTML
  const buildPrintHtml = (
    dataToPrint: string,
    printerType: 'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single',
    copiesCount: number,
    printerName: string
  ) => {
    let pageCss = '';
    let paperLabel = 'Thermal 80mm';

    if (printerType === 'thermal_58mm') {
      paperLabel = 'Thermal 58mm';
      pageCss = `
        @page { size: 58mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-strip {
          width: 48mm;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
        }
        .print-strip:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .print-strip img {
          width: 48mm;
          max-width: 48mm;
          height: auto;
          display: block;
          margin: 0 auto;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
        }
      `;
    } else if (printerType === 'dual_4x6') {
      paperLabel = 'Dual Strip 4x6"';
      pageCss = `
        @page { size: 4in 6in; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 4in !important;
          height: 6in !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-strip {
          width: 4in;
          height: 6in;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-after: always;
          break-after: page;
        }
        .print-strip:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .print-strip img {
          width: 4in;
          height: 6in;
          object-fit: contain;
          display: block;
          image-rendering: -webkit-optimize-contrast !important;
        }
      `;
    } else if (printerType === 'single') {
      paperLabel = 'Single Strip';
      pageCss = `
        @page { size: auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-strip {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-after: always;
          break-after: page;
        }
        .print-strip:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .print-strip img {
          max-width: 100%;
          max-height: 100vh;
          object-fit: contain;
          display: block;
          margin: auto;
          image-rendering: -webkit-optimize-contrast !important;
        }
      `;
    } else {
      // Thermal 80mm
      paperLabel = 'Thermal 80mm';
      pageCss = `
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-strip {
          width: 72mm;
          margin: 0 auto;
          page-break-after: always;
          break-after: page;
        }
        .print-strip:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .print-strip img {
          width: 72mm;
          max-width: 72mm;
          height: auto;
          display: block;
          margin: 0 auto;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
        }
      `;
    }

    const imagesHtml = Array.from({ length: copiesCount })
      .map(
        (_, i) => `
        <div class="print-strip">
          <img src="${dataToPrint}" alt="Photo Strip Lembar ${i + 1}" />
        </div>`
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Foto</title>
  <style>
    ${pageCss}

    @media screen {
      body {
        background-color: #171514;
        color: #f5f5f4;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        padding: 24px 16px 64px;
        margin: 0;
        box-sizing: border-box;
      }
      .screen-toolbar {
        position: sticky;
        top: 12px;
        z-index: 9999;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: #24201e;
        border: 1px solid #443e3c;
        padding: 12px 20px;
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.6);
        margin-bottom: 24px;
        max-width: 95%;
      }
      .btn-print {
        background: #ea580c;
        color: #ffffff;
        font-weight: bold;
        font-size: 15px;
        padding: 10px 24px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(234,88,12,0.45);
        transition: all 0.2s ease;
      }
      .btn-print:hover {
        background: #f97316;
        transform: translateY(-1px);
      }
      .btn-close {
        background: #383330;
        color: #d6d3d1;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 16px;
        border: 1px solid #57514e;
        border-radius: 10px;
        cursor: pointer;
      }
      .btn-close:hover {
        background: #443e3c;
        color: #ffffff;
      }
      .toolbar-info {
        font-size: 12px;
        color: #a8a29e;
        font-family: monospace;
      }
      .print-container {
        background: #ffffff;
        padding: 16px;
        border-radius: 10px;
        box-shadow: 0 10px 35px rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
    }

    @media print {
      .screen-toolbar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-container {
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-toolbar">
    <button class="btn-print" onclick="window.focus(); window.print();">
      🖨️ CETAK SEKARANG (PRINT)
    </button>
    <div class="toolbar-info">
      ${paperLabel}
    </div>
    <button class="btn-close" onclick="window.close()">
      ✕ Tutup
    </button>
  </div>

  <div class="print-container">
    ${imagesHtml}
  </div>

  <script>
    window.addEventListener('load', function() {
      var imgs = Array.from(document.images);
      var promises = imgs.map(function(img) {
        return img.decode ? img.decode().catch(function(){}) : Promise.resolve();
      });
      Promise.all(promises).then(function() {
        setTimeout(function() {
          window.focus();
          try {
            window.print();
          } catch(e) {
            console.warn('Auto print trigger error:', e);
          }
        }, 300);
      });
    });
  </script>
</body>
</html>`;
  };

  // Execute Direct Print directly to printer
  const executeDirectPrint = () => {
    const dataToPrint = currentPrintData || highResDataUrl || thermal80DataUrl || thermal58DataUrl || dualStripDataUrl;
    if (!dataToPrint) {
      setQuickPrintStatus('printing');
      setQuickPrintMessage('Sedang menyiapkan gambar strip beresolusi tinggi...');
      const checkTimer = setInterval(() => {
        const readyData = getDataForType(activePrinter.type) || highResDataUrl;
        if (readyData) {
          clearInterval(checkTimer);
          executeDirectPrint();
        }
      }, 200);
      setTimeout(() => clearInterval(checkTimer), 4000);
      return;
    }

    const htmlContent = buildPrintHtml(dataToPrint, activePrinter.type, 1, 'Printer');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // If running in an iframe (e.g. AI Studio preview), sandboxed iframes block window.print() completely with error:
    // "The document is in a sandboxed iframe that lacks the 'allow-modals' permission."
    let printWin: Window | null = null;
    try {
      printWin = window.open(blobUrl, '_blank');
    } catch (err) {
      console.warn('Direct window.open blocked:', err);
    }

    if (!printWin || printWin.closed || typeof printWin.closed === 'undefined') {
      setQuickPrintStatus('success');
      setQuickPrintMessage('Perintah cetak foto berhasil disiapkan!');
      setTimeout(() => {
        setQuickPrintStatus('idle');
      }, 4000);
    } else {
      setQuickPrintStatus('success');
      setQuickPrintMessage('Jendela cetak printer berhasil dibuka!');
      try {
        printWin.focus();
      } catch {}
      setTimeout(() => {
        setQuickPrintStatus('idle');
      }, 4000);
    }
  };

  // Handler for Cetak Foto button directly to printer
  const handlePrintPhoto = () => {
    sounds.playPopSound();
    setQuickPrintStatus('printing');
    setQuickPrintMessage('Mengirim perintah cetak langsung ke printer...');

    executeDirectPrint();
  };

  // Auto-Print trigger when photo capture process finishes if autoPrintEnabled is active
  useEffect(() => {
    if (!isGenerating && highResDataUrl && theme.autoPrintEnabled && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      setAutoPrintNotice(true);
      const timer = setTimeout(() => {
        executeDirectPrint();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, highResDataUrl, theme.autoPrintEnabled]);

  // Handle Download File
  const handleDownload = () => {
    const dataToDownload = currentPrintData;
    if (!dataToDownload) return;

    const link = document.createElement('a');
    const safeTitle = (theme.eventTitle || 'SnapBooth').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `SnapBooth_${safeTitle}_${activePrinter.type}_${Date.now()}.png`;
    link.href = dataToDownload;
    link.click();
  };

  return (
    <div className="h-full max-h-full w-full max-w-5xl mx-auto p-2 sm:p-4 overflow-y-auto space-y-4 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700 text-[11px] font-mono uppercase tracking-wider shadow-xs">
            <Camera className="w-3.5 h-3.5 text-orange-500" /> Pratinjau Foto Strip
          </div>

          {theme.autoPrintEnabled && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-orange-50 border border-orange-300 text-orange-700 text-[11px] font-mono font-medium shadow-xs">
              <Printer className="w-3 h-3 text-orange-600" /> Auto-Print Aktif
            </div>
          )}
        </div>

        {autoPrintNotice && (
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg max-w-md mx-auto text-orange-800 text-xs font-mono flex items-center justify-center gap-2 shadow-xs">
            <Printer className="w-3.5 h-3.5 text-orange-600" />
            <span>Memicu dialog cetak printer...</span>
          </div>
        )}
      </div>

      {/* Quick Print Notification Status Toast/Bar */}
      {quickPrintStatus !== 'idle' && (
        <div
          className={`max-w-xl mx-auto p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium shadow-xs ${
            quickPrintStatus === 'printing'
              ? 'bg-orange-50 text-orange-800 border-orange-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {quickPrintStatus === 'printing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span>{quickPrintMessage}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-stone-200 uppercase tracking-wider text-stone-700">
            {quickPrintStatus === 'printing' ? 'Memproses' : 'Siap'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left: Strip Render Preview */}
        <div className="md:col-span-5 flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-stone-200 shadow-md relative w-full flex items-center justify-center">
            {isGenerating ? (
              <div className="w-56 sm:w-64 h-80 sm:h-96 flex flex-col items-center justify-center space-y-3 text-stone-500">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-xs font-semibold">Mengolah Hasil Cetak High-Res...</span>
              </div>
            ) : currentPrintData ? (
              <img
                src={currentPrintData}
                alt="High Res Photo Strip"
                className="max-h-[42dvh] sm:max-h-[50dvh] md:max-h-[65dvh] w-auto rounded shadow-sm object-contain transition-all border border-stone-100"
                style={{
                  imageRendering:
                    (activePrinter.type === 'thermal_80mm' || activePrinter.type === 'thermal_58mm') && thermalDither
                      ? 'pixelated'
                      : 'auto',
                }}
              />
            ) : (
              <div className="w-56 sm:w-64 h-80 sm:h-96 flex flex-col items-center justify-center space-y-3 text-stone-400">
                <span className="text-xs">Menyiapkan pratinjau cetak...</span>
              </div>
            )}
          </div>

          {/* Trial Notice Badge on Result */}
          {isTrial && (
            <div className="w-full p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-center gap-2.5 text-orange-800 text-xs shadow-xs">
              <Info className="w-4 h-4 text-orange-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[11px]">Mode Akun Trial 3 Hari Aktif</p>
                <p className="text-[10px] text-stone-600 leading-relaxed">Hasil foto memuat watermark uji coba. Hubungi admin untuk lisensi tanpa watermark.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions, Print, and Navigation */}
        <div className="md:col-span-7 space-y-4 sm:space-y-6">
          {/* Print Photo Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-orange-600 text-white shadow-sm">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    Cetak Foto
                  </h3>
                  <p className="text-xs text-stone-500">
                    Kirim perintah cetak langsung ke printer
                  </p>
                </div>
              </div>
            </div>

            {/* THE MAIN "CETAK FOTO" BUTTON */}
            <button
              type="button"
              onClick={handlePrintPhoto}
              disabled={isGenerating || quickPrintStatus === 'printing'}
              className="w-full relative group py-3.5 sm:py-4 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-md hover:shadow-orange-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3.5 cursor-pointer border border-orange-500"
            >
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
              <div className="text-left leading-tight flex-1">
                <span className="text-base sm:text-lg font-bold tracking-wide">CETAK FOTO</span>
                <span className="text-xs font-normal text-orange-100 block mt-0.5">
                  Kirim perintah cetak langsung ke printer
                </span>
              </div>
            </button>

            {/* Download Option */}
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-mono font-bold text-xs sm:text-sm border border-stone-200 transition-all cursor-pointer shadow-xs"
                title="Simpan file foto ke perangkat"
              >
                <Download className="w-4 h-4 text-orange-600" />
                <span className="text-xs sm:text-sm">Unduh File Foto (PNG)</span>
              </button>
            </div>
          </div>

          {/* Start New Session & Back to Home Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onResetSession}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs sm:text-sm border border-stone-200 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <Home className="w-4 h-4 text-stone-500" />
              <span>Selesai & Ke Halaman Utama</span>
            </button>

            <button
              onClick={onResetSession}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm border border-orange-500 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Mulai Sesi Foto Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden container dedicated for native Ctrl+P / browser print isolation */}
      <div id="snapbooth-print-area" className="hidden">
        {Boolean(currentPrintData || highResDataUrl) && (
          <div
            style={{
              width: activePrinter.type === 'thermal_58mm' ? '48mm' : activePrinter.type === 'dual_4x6' ? '4in' : '72mm',
              margin: '0 auto',
              padding: '0',
            }}
          >
            <img
              src={currentPrintData || highResDataUrl}
              alt="Printout Lembar"
              style={{
                width: '100%',
                display: 'block',
                margin: '0 auto',
                imageRendering: 'crisp-edges',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
