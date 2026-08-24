import React, { useState, useEffect, useRef } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, SavedPhotoStrip } from '../types';
import { generatePhotoStripCanvas } from '../utils/canvasRenderer';
import {
  Printer,
  Download,
  QrCode,
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle2,
  Sliders,
  Plus,
  Trash2,
  X,
  Radio,
  Copy,
  ChevronDown,
  Check,
  HardDrive,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { sounds } from '../utils/audio';

export interface ConnectedPrinterProfile {
  id: string;
  name: string;
  type: 'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single';
  paperDescription: string;
  connectionType: 'USB / Bluetooth' | 'Network / LAN' | 'Driver OS' | 'Direct ESC/POS';
  isCustom?: boolean;
}

const DEFAULT_CONNECTED_PRINTERS: ConnectedPrinterProfile[] = [
  {
    id: 'printer_thermal_80mm',
    name: 'Printer Kiosk Thermal 80mm (Auto-Cut)',
    type: 'thermal_80mm',
    paperDescription: '80 x Auto mm Roll (Struk / Stiker Termal)',
    connectionType: 'USB / Bluetooth',
  },
  {
    id: 'printer_epson_pos80',
    name: 'Epson TM-T82 / TM-T88 POS (80mm)',
    type: 'thermal_80mm',
    paperDescription: '80mm Continuous Receipt Roll',
    connectionType: 'Driver OS',
  },
  {
    id: 'printer_xprinter_80',
    name: 'Xprinter / Panda POS-80C Thermal',
    type: 'thermal_80mm',
    paperDescription: '80mm Roll Thermal Paper',
    connectionType: 'USB / Bluetooth',
  },
  {
    id: 'printer_thermal_58mm',
    name: 'Mini POS 58mm Portable Bluetooth',
    type: 'thermal_58mm',
    paperDescription: '58mm Mini Receipt Roll',
    connectionType: 'USB / Bluetooth',
  },
  {
    id: 'printer_dnp_dyesub',
    name: 'DNP DS-RX1HS / Citizen 4x6" Dye-Sub',
    type: 'dual_4x6',
    paperDescription: '4x6" Glossy Photo Strip (2-Cut)',
    connectionType: 'Driver OS',
  },
  {
    id: 'printer_inkjet_a4',
    name: 'Epson L8050 / Canon MegaTank Inkjet Photo',
    type: 'single',
    paperDescription: '4R / A4 Glossy Photo Paper',
    connectionType: 'Driver OS',
  },
  {
    id: 'printer_os_system',
    name: 'Sistem Default Printer (OS Direct Spooler)',
    type: 'thermal_80mm',
    paperDescription: 'Printer Utama Komputer / Tablet',
    connectionType: 'Driver OS',
  },
];

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
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [autoPrintNotice, setAutoPrintNotice] = useState<boolean>(false);
  const hasAutoPrintedRef = useRef<boolean>(false);

  // Connected Printers state & persistent storage
  const [printersList, setPrintersList] = useState<ConnectedPrinterProfile[]>(() => {
    try {
      const savedCustom = localStorage.getItem('snapbooth_custom_printers');
      if (savedCustom) {
        const customArr = JSON.parse(savedCustom);
        return [...DEFAULT_CONNECTED_PRINTERS, ...customArr];
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONNECTED_PRINTERS;
  });

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('snapbooth_selected_printer_id');
      if (saved) return saved;
    } catch {
      // ignore
    }
    // Default to matching theme.autoPrintMode if possible
    if (theme.autoPrintMode === 'thermal_58mm') return 'printer_thermal_58mm';
    if (theme.autoPrintMode === 'dual_4x6') return 'printer_dnp_dyesub';
    if (theme.autoPrintMode === 'single') return 'printer_inkjet_a4';
    return 'printer_thermal_80mm';
  });

  const [printCopies, setPrintCopies] = useState<number>(1);
  const [isPrinterSelectorOpen, setIsPrinterSelectorOpen] = useState<boolean>(false);
  const [quickPrintStatus, setQuickPrintStatus] = useState<'idle' | 'printing' | 'success'>('idle');
  const [quickPrintMessage, setQuickPrintMessage] = useState<string>('');

  // Form for adding custom printer
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [newPrinterName, setNewPrinterName] = useState<string>('');
  const [newPrinterType, setNewPrinterType] = useState<'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single'>('thermal_80mm');
  const [newPrinterConn, setNewPrinterConn] = useState<'USB / Bluetooth' | 'Network / LAN' | 'Driver OS'>('USB / Bluetooth');

  // Find active printer object
  const activePrinter = printersList.find((p) => p.id === selectedPrinterId) || printersList[0];

  // Save selected printer ID to localStorage
  const handleSelectPrinter = (printerId: string) => {
    setSelectedPrinterId(printerId);
    try {
      localStorage.setItem('snapbooth_selected_printer_id', printerId);
    } catch {
      // ignore
    }
    sounds.playPopSound();
  };

  // Add custom printer
  const handleAddCustomPrinter = () => {
    if (!newPrinterName.trim()) return;
    const newId = `custom_printer_${Date.now()}`;
    const newProfile: ConnectedPrinterProfile = {
      id: newId,
      name: newPrinterName.trim(),
      type: newPrinterType,
      paperDescription:
        newPrinterType === 'thermal_80mm'
          ? '80mm Roll Thermal Paper'
          : newPrinterType === 'thermal_58mm'
          ? '58mm Mini Receipt Roll'
          : newPrinterType === 'dual_4x6'
          ? '4x6" Dual Strip Photo Cut'
          : '4R / A4 Photo Glossy',
      connectionType: newPrinterConn,
      isCustom: true,
    };

    const updated = [...printersList, newProfile];
    setPrintersList(updated);
    setSelectedPrinterId(newId);

    try {
      const customOnly = updated.filter((p) => p.isCustom);
      localStorage.setItem('snapbooth_custom_printers', JSON.stringify(customOnly));
      localStorage.setItem('snapbooth_selected_printer_id', newId);
    } catch {
      // ignore
    }

    setNewPrinterName('');
    setShowAddCustom(false);
    sounds.playPopSound();
  };

  // Delete custom printer
  const handleDeleteCustomPrinter = (printerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = printersList.filter((p) => p.id !== printerId);
    setPrintersList(updated);
    if (selectedPrinterId === printerId) {
      setSelectedPrinterId(DEFAULT_CONNECTED_PRINTERS[0].id);
    }
    try {
      const customOnly = updated.filter((p) => p.isCustom);
      localStorage.setItem('snapbooth_custom_printers', JSON.stringify(customOnly));
    } catch {
      // ignore
    }
  };

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

  // Get data URL based on format
  const getDataForType = (type: 'thermal_80mm' | 'thermal_58mm' | 'dual_4x6' | 'single') => {
    switch (type) {
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

  const currentPrintData = getDataForType(activePrinter.type);

  // Execute Direct Print (No Confirmation Needed)
  const executeDirectPrint = (copiesCount: number = printCopies) => {
    const dataToPrint = currentPrintData;
    if (!dataToPrint) return;

    let pageCss = `@page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 0; width: 80mm; background: #ffffff; } img { width: 100%; height: auto; display: block; page-break-after: always; }`;

    if (activePrinter.type === 'thermal_58mm') {
      pageCss = `@page { size: 58mm auto; margin: 0; } body { margin: 0; padding: 0; width: 58mm; background: #ffffff; } img { width: 100%; height: auto; display: block; page-break-after: always; }`;
    } else if (activePrinter.type === 'dual_4x6') {
      pageCss = `@page { size: 4in 6in; margin: 0; } body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; } img { max-width: 100%; max-height: 100vh; object-fit: contain; page-break-after: always; }`;
    } else if (activePrinter.type === 'single') {
      pageCss = `@page { size: auto; margin: 0; } body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; } img { max-width: 100%; max-height: 100vh; object-fit: contain; page-break-after: always; }`;
    }

    // Build multiple image tags for copies
    const imagesHtml = Array.from({ length: copiesCount })
      .map((_, i) => `<img src="${dataToPrint}" alt="Photo Strip ${i + 1}" />`)
      .join('\n');

    // Create popup/direct window with instant print trigger
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser untuk menjalankan Cetak Cepat ke printer.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Cepat - ${activePrinter.name}</title>
          <style>
            ${pageCss}
            @media print {
              img { page-break-after: ${copiesCount > 1 ? 'always' : 'auto'}; }
            }
          </style>
        </head>
        <body>
          ${imagesHtml}
          <script>
            window.addEventListener('load', function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.close();
              }, 400);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handler for "⚡ Cetak Cepat" button (Instant Print without re-confirmation)
  const handleQuickPrint = () => {
    sounds.playPopSound();
    setQuickPrintStatus('printing');
    setQuickPrintMessage(`Mengirim ${printCopies}x cetakan langsung ke "${activePrinter.name}"...`);

    executeDirectPrint(printCopies);

    setTimeout(() => {
      setQuickPrintStatus('success');
      setQuickPrintMessage(`Berhasil dikirim ke printer "${activePrinter.name}" (${printCopies} salinan)`);
      setTimeout(() => {
        setQuickPrintStatus('idle');
      }, 3500);
    }, 1000);
  };

  // Auto-Print trigger when photo capture process finishes if autoPrintEnabled is active
  useEffect(() => {
    if (!isGenerating && highResDataUrl && theme.autoPrintEnabled && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      setAutoPrintNotice(true);
      const timer = setTimeout(() => {
        executeDirectPrint(1);
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Hasil Foto Siap Dicetak & Disimpan!
          </div>

          {theme.autoPrintEnabled && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40 animate-pulse">
              <Printer className="w-3.5 h-3.5 text-cyan-400" /> Auto-Print Kiosk Aktif
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Cetak & Simpan Foto
        </h2>

        {autoPrintNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl max-w-md mx-auto text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 animate-bounce">
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Memicu dialog cetak printer otomatis...</span>
          </div>
        )}

        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Tekan tombol <strong>Cetak Cepat</strong> untuk langsung mencetak struk/foto ke printer tanpa konfirmasi ulang, atau scan barcode untuk unduh ke ponsel.
        </p>
      </div>

      {/* Quick Print Notification Status Toast/Bar */}
      {quickPrintStatus !== 'idle' && (
        <div
          className={`max-w-xl mx-auto p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
            quickPrintStatus === 'printing'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {quickPrintStatus === 'printing' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{quickPrintMessage}</span>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-black/40 uppercase tracking-wider">
            {quickPrintStatus === 'printing' ? 'Memproses...' : 'Siap Cetak'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Strip Render Preview */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl relative">
            {isGenerating ? (
              <div className="w-64 h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                <span className="text-xs font-semibold">Mengolah Hasil Cetak High-Res...</span>
              </div>
            ) : (
              <img
                src={currentPrintData}
                alt="High Res Photo Strip"
                className="max-h-[500px] w-auto rounded shadow-lg object-contain"
              />
            )}
          </div>

          {/* Active Connected Printer & Paper Format Badge */}
          <div className="w-full space-y-2.5 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Printer Aktif
              </span>
              <button
                type="button"
                onClick={() => setIsPrinterSelectorOpen(true)}
                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Sliders className="w-3 h-3" /> Ganti Printer
              </button>
            </div>

            <div
              onClick={() => setIsPrinterSelectorOpen(true)}
              className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{activePrinter.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    🟢 Terhubung
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                  {activePrinter.paperDescription} ({activePrinter.connectionType})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions, Quick Print, QR Code Scan, and Social Sharing */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Quick Print Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-rose-950/30 space-y-4 relative overflow-hidden">
            {/* Ambient subtle glow background */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Fitur Cetak Cepat
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      ⚡ Instant Print
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mencetak langsung ke printer yang terhubung tanpa perlu konfirmasi ulang
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Controls: Copies & Connected Printer Shortcut */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Connected Printer Pill */}
              <button
                type="button"
                onClick={() => setIsPrinterSelectorOpen(true)}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-left flex items-center justify-between gap-2 transition-all cursor-pointer group"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Printer Terhubung:</span>
                  <span className="text-xs font-bold text-white truncate block group-hover:text-amber-300 transition-colors">
                    {activePrinter.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
              </button>

              {/* Number of Copies Selector */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Jumlah Cetak:</span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Copy className="w-3 h-3 text-amber-400" /> {printCopies} Salinan
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setPrintCopies(num);
                        sounds.playPopSound();
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        printCopies === num
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* THE MAIN HERO "CETAK CEPAT" BUTTON */}
            <button
              type="button"
              onClick={handleQuickPrint}
              disabled={isGenerating || quickPrintStatus === 'printing'}
              className="w-full relative group py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-400 hover:via-rose-400 hover:to-pink-500 text-white font-black text-base sm:text-lg shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer overflow-hidden"
            >
              <div className="p-1 rounded-full bg-white/20 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-2">
                  <span>⚡ Cetak Cepat</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 text-white">
                    {printCopies}x Lembar
                  </span>
                </div>
                <span className="text-xs font-medium text-white/80 block mt-0.5">
                  Langsung kirim ke {activePrinter.name}
                </span>
              </div>
            </button>

            {/* Secondary Option: Download & Standard Print */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => executeDirectPrint(1)}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Cetak Standar (1x)
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" /> Unduh File Foto (PNG)
              </button>
            </div>
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

          {/* Start New Session Button */}
          <div className="pt-2">
            <button
              onClick={onResetSession}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" /> Mulai Sesi Foto Baru
            </button>
          </div>
        </div>
      </div>

      {/* Connected Printer Selection & Manager Modal */}
      {isPrinterSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pilih Printer Terhubung</h3>
                  <p className="text-xs text-slate-400">Pilih printer aktif untuk fitur Cetak Cepat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPrinterSelectorOpen(false);
                  setShowAddCustom(false);
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Printers */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Daftar Printer Tersedia:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(!showAddCustom)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddCustom ? 'Tutup Form' : 'Tambah Printer Baru'}</span>
                  </button>
                </div>

                {/* Custom Printer Add Form */}
                {showAddCustom && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Tambah Profil Printer Kustom
                    </h4>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Nama Printer (contoh: Epson TM-T82 Kios 1, DNP Booth Utama):
                        </label>
                        <input
                          type="text"
                          value={newPrinterName}
                          onChange={(e) => setNewPrinterName(e.target.value)}
                          placeholder="Masukkan nama atau tipe printer..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Format / Ukuran Kertas:
                          </label>
                          <select
                            value={newPrinterType}
                            onChange={(e) => setNewPrinterType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="thermal_80mm">Thermal 80mm (Standar Struk)</option>
                            <option value="thermal_58mm">Thermal 58mm (Mini POS)</option>
                            <option value="dual_4x6">Dual Strip 4x6" (Dye-Sub)</option>
                            <option value="single">Single Strip / A4 Glossy</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            Jenis Sambungan:
                          </label>
                          <select
                            value={newPrinterConn}
                            onChange={(e) => setNewPrinterConn(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="USB / Bluetooth">USB / Bluetooth</option>
                            <option value="Driver OS">Driver OS (Spooler)</option>
                            <option value="Network / LAN">Network / LAN</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddCustom(false)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomPrinter}
                          disabled={!newPrinterName.trim()}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Simpan Printer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Printer List Cards */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {printersList.map((printer) => {
                    const isSelected = printer.id === selectedPrinterId;
                    return (
                      <div
                        key={printer.id}
                        onClick={() => handleSelectPrinter(printer.id)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2.5 rounded-xl border shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            <Printer className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">{printer.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  AKTIF
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                              {printer.paperDescription} • <span className="text-cyan-400 font-medium">{printer.connectionType}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {printer.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomPrinter(printer.id, e)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title="Hapus printer custom"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Information Note */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Printer yang Anda pilih akan disimpan dan digunakan secara otomatis setiap kali tombol <strong>⚡ Cetak Cepat</strong> ditekan.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Terpilih: <strong className="text-white">{activePrinter.name}</strong>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsPrinterSelectorOpen(false);
                  sounds.playPopSound();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Gunakan Printer Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
