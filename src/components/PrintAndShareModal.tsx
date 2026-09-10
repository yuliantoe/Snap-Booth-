import React, { useState, useEffect, useRef } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, UserAccount } from '../types';
import { generatePhotoStripCanvas } from '../utils/canvasRenderer';
import { isDurationUnlimited, calculateRemainingDays } from '../services/subscriptionService';
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
  Home,
  Camera,
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
          isTrial,
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
          isTrial,
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
          isTrial,
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 text-[11px] font-mono uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-orange-400" /> Pratinjau Foto Strip
          </div>

          {theme.autoPrintEnabled && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-stone-900 border border-orange-500/40 text-orange-300 text-[11px] font-mono font-medium">
              <Printer className="w-3 h-3 text-orange-400" /> Auto-Print Aktif
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
          Pratinjau & Cetak Hasil Foto
        </h2>

        {autoPrintNotice && (
          <div className="p-2.5 bg-stone-900 border border-orange-500/40 rounded-lg max-w-md mx-auto text-orange-300 text-xs font-mono flex items-center justify-center gap-2">
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Memicu dialog cetak printer...</span>
          </div>
        )}

        <p className="text-stone-400 text-xs sm:text-sm max-w-lg mx-auto">
          Hasil foto telah diproses. Tekan <strong>Cetak Cepat</strong> untuk langsung mencetak atau unduh file resolusi tinggi.
        </p>
      </div>

      {/* Quick Print Notification Status Toast/Bar */}
      {quickPrintStatus !== 'idle' && (
        <div
          className={`max-w-xl mx-auto p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            quickPrintStatus === 'printing'
              ? 'bg-stone-900 text-orange-300 border-orange-500/40'
              : 'bg-stone-900 text-emerald-300 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {quickPrintStatus === 'printing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{quickPrintMessage}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-800 border border-stone-700 uppercase tracking-wider">
            {quickPrintStatus === 'printing' ? 'Memproses' : 'Siap'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Strip Render Preview */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="bg-[#100f0e] p-4 rounded-2xl border border-stone-800 shadow-xl relative">
            {isGenerating ? (
              <div className="w-64 h-96 flex flex-col items-center justify-center space-y-3 text-stone-400">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-xs font-semibold">Mengolah Hasil Cetak High-Res...</span>
              </div>
            ) : (
              <img
                src={currentPrintData}
                alt="High Res Photo Strip"
                className="max-h-[500px] w-auto rounded shadow-md object-contain"
              />
            )}
          </div>

          {/* Trial Notice Badge on Result */}
          {isTrial && (
            <div className="w-full p-3 rounded-lg bg-stone-900 border border-orange-500/30 flex items-center gap-2.5 text-orange-300 text-xs">
              <Info className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[11px]">Mode Akun Trial 3 Hari Aktif</p>
                <p className="text-[10px] text-stone-400 leading-relaxed">Hasil foto memuat watermark uji coba. Hubungi admin untuk lisensi tanpa watermark.</p>
              </div>
            </div>
          )}

          {/* Active Connected Printer & Paper Format Badge */}
          <div className="w-full space-y-2.5 bg-[#131110] border border-stone-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-orange-400" /> PRINTER AKTIF
              </span>
              <button
                type="button"
                onClick={() => setIsPrinterSelectorOpen(true)}
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Sliders className="w-3 h-3 text-orange-400" /> Ganti Printer
              </button>
            </div>

            <div
              onClick={() => setIsPrinterSelectorOpen(true)}
              className="bg-[#181615] p-3 rounded-lg border border-stone-800 hover:border-stone-700 transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="p-2 rounded-md bg-stone-900 text-orange-400 border border-stone-800">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-stone-100 truncate">{activePrinter.name}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 shrink-0">
                    ONLINE
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-mono leading-tight mt-0.5 truncate">
                  {activePrinter.paperDescription} ({activePrinter.connectionType})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions, Quick Print, QR Code Scan, and Social Sharing */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Quick Print Card */}
          <div className="bg-[#131110] border border-stone-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-orange-600 text-white shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    Fitur Cetak Cepat
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-stone-900 text-orange-400 border border-stone-800">
                      Instant Print
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Mencetak langsung ke printer yang terhubung tanpa perlu dialog konfirmasi
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
                className="p-3 rounded-lg bg-[#181615] border border-stone-800 hover:border-stone-700 text-left flex items-center justify-between gap-2 transition-all cursor-pointer group"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Printer Terhubung:</span>
                  <span className="text-xs font-bold text-stone-200 truncate block group-hover:text-orange-400 transition-colors">
                    {activePrinter.name}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-stone-500 group-hover:text-stone-300 shrink-0" />
              </button>

              {/* Number of Copies Selector */}
              <div className="p-3 rounded-lg bg-[#181615] border border-stone-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Jumlah Cetak:</span>
                  <span className="text-xs font-bold text-stone-200 flex items-center gap-1 font-mono">
                    <Copy className="w-3 h-3 text-orange-400" /> {printCopies}x Lembar
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
                      className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
                        printCopies === num
                          ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                          : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
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
              className="w-full relative group py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer border border-orange-500"
            >
              <Zap className="w-5 h-5 text-white fill-white" />
              <div className="text-left leading-tight">
                <div className="flex items-center gap-2">
                  <span>Cetak Cepat</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30 text-white">
                    {printCopies}x Lembar
                  </span>
                </div>
                <span className="text-xs font-normal text-orange-100 block mt-0.5">
                  Langsung kirim spooling ke {activePrinter.name}
                </span>
              </div>
            </button>

            {/* Secondary Option: Download & Standard Print */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-stone-800">
              <button
                type="button"
                onClick={() => executeDirectPrint(1)}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-orange-400" /> Cetak Standar (1x)
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" /> Unduh File Foto (PNG)
              </button>
            </div>
          </div>

          {/* Start New Session & Back to Home Action Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onResetSession}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 font-bold text-xs sm:text-sm border border-stone-800 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-stone-400" />
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

      {/* Connected Printer Selection & Manager Modal */}
      {isPrinterSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#131110] border border-stone-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-[#171514]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-stone-900 text-orange-400 border border-stone-800">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100">Pilih Printer Terhubung</h3>
                  <p className="text-xs text-stone-400">Pilih printer aktif untuk cetak langsung</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPrinterSelectorOpen(false);
                  setShowAddCustom(false);
                }}
                className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Printers */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider font-mono">
                    Daftar Printer Tersedia:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(!showAddCustom)}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddCustom ? 'Tutup Form' : 'Tambah Printer Baru'}</span>
                  </button>
                </div>

                {/* Custom Printer Add Form */}
                {showAddCustom && (
                  <div className="p-4 rounded-xl bg-[#171514] border border-orange-500/40 space-y-3 animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Tambah Profil Printer Kustom
                    </h4>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-bold text-stone-400 block mb-1">
                          Nama Printer (contoh: Epson TM-T82 Kios 1, DNP Booth Utama):
                        </label>
                        <input
                          type="text"
                          value={newPrinterName}
                          onChange={(e) => setNewPrinterName(e.target.value)}
                          placeholder="Masukkan nama atau tipe printer..."
                          className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-stone-400 block mb-1">
                            Format / Ukuran Kertas:
                          </label>
                          <select
                            value={newPrinterType}
                            onChange={(e) => setNewPrinterType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-orange-500"
                          >
                            <option value="thermal_80mm">Thermal 80mm (Standar Struk)</option>
                            <option value="thermal_58mm">Thermal 58mm (Mini POS)</option>
                            <option value="dual_4x6">Dual Strip 4x6" (Dye-Sub)</option>
                            <option value="single">Single Strip / A4 Glossy</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-stone-400 block mb-1">
                            Jenis Sambungan:
                          </label>
                          <select
                            value={newPrinterConn}
                            onChange={(e) => setNewPrinterConn(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-orange-500"
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
                          className="px-3 py-1.5 rounded-lg bg-stone-900 text-stone-300 text-xs font-bold hover:bg-stone-800 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomPrinter}
                          disabled={!newPrinterName.trim()}
                          className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-orange-500"
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
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-orange-950/30 border-orange-500/60 ring-1 ring-orange-500/40 shadow-sm'
                            : 'bg-[#181615] border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2.5 rounded-lg border shrink-0 ${
                              isSelected
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-stone-900 text-stone-400 border-stone-800'
                            }`}
                          >
                            <Printer className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">{printer.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                                  AKTIF
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400 leading-tight mt-0.5 truncate font-mono">
                              {printer.paperDescription} • <span className="text-orange-400 font-medium">{printer.connectionType}</span>
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
                                ? 'bg-orange-600 border-orange-500 text-white font-bold'
                                : 'border-stone-700 bg-stone-900'
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
              <div className="p-3.5 rounded-xl bg-[#171514] border border-stone-800 flex items-start gap-2.5 text-xs text-stone-400">
                <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  Printer yang Anda pilih akan disimpan dan digunakan secara otomatis setiap kali tombol <strong>Cetak Cepat</strong> ditekan.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-800 bg-[#171514] flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400 font-mono">
                Terpilih: <strong className="text-stone-100">{activePrinter.name}</strong>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsPrinterSelectorOpen(false);
                  sounds.playPopSound();
                }}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border border-orange-500"
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
