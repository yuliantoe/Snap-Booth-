import React, { useState, useEffect, useRef } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, UserAccount } from '../types';
import { generatePhotoStripCanvas, ThermalDitherAlgorithm } from '../utils/canvasRenderer';
import { isDurationUnlimited, calculateRemainingDays } from '../services/subscriptionService';
import {
  Printer,
  Download,
  QrCode,
  RefreshCw,
  Zap,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Radio,
  Copy,
  ChevronDown,
  Check,
  Info,
  Home,
  Camera,
  ExternalLink,
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
    // Default to matching theme.autoPrintMode if possible, otherwise standard POS thermal 80mm
    if (theme.autoPrintMode === 'thermal_58mm') return 'printer_thermal_58mm';
    if (theme.autoPrintMode === 'dual_4x6') return 'printer_dnp_dyesub';
    if (theme.autoPrintMode === 'single') return 'printer_thermal_80mm';
    if (theme.autoPrintMode === 'thermal_80mm') return 'printer_thermal_80mm';
    return 'printer_thermal_80mm';
  });

  const [printCopies, setPrintCopies] = useState<number>(1);
  const [isPrinterSelectorOpen, setIsPrinterSelectorOpen] = useState<boolean>(false);
  const [quickPrintStatus, setQuickPrintStatus] = useState<'idle' | 'printing' | 'success'>('idle');
  const [quickPrintMessage, setQuickPrintMessage] = useState<string>('');
  const [blockedBlobUrl, setBlockedBlobUrl] = useState<string | null>(null);

  // Normal Standard Receipt Print Configuration (100% natural, standard receipt output)
  const clarityLevel = 0; // 0 = standard natural, no unsharp mask exaggeration
  const printBrightness = 1.0; // 1.0 = standard 100% normal brightness
  const printContrast = 1.0; // 1.0 = standard 100% normal contrast
  const thermalDither = true; // Standard 1-bit raster dithering for receipt paper
  const thermalDitherMode: ThermalDitherAlgorithm = 'atkinson'; // Cleanest natural receipt dots
  const thermalDensity = 1.0; // Standard 1.0x normal receipt density
  const thermalResMode = 'native_dot' as const; // 1:1 hardware dot resolution
  const photoTextColor = 'black' as const; // Standard solid black receipt text

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
  <title>Cetak Foto - ${printerName}</title>
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
      ${printerName} &bull; ${paperLabel} &bull; ${copiesCount}x Lembar
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

  // Execute Direct Print directly to connected printer
  const executeDirectPrint = (copiesCount: number = printCopies) => {
    const dataToPrint = currentPrintData || highResDataUrl || thermal80DataUrl || thermal58DataUrl || dualStripDataUrl;
    if (!dataToPrint) {
      setQuickPrintStatus('printing');
      setQuickPrintMessage('Sedang menyiapkan gambar strip beresolusi tinggi...');
      const checkTimer = setInterval(() => {
        const readyData = getDataForType(activePrinter.type) || highResDataUrl;
        if (readyData) {
          clearInterval(checkTimer);
          executeDirectPrint(copiesCount);
        }
      }, 200);
      setTimeout(() => clearInterval(checkTimer), 4000);
      return;
    }

    const htmlContent = buildPrintHtml(dataToPrint, activePrinter.type, copiesCount, activePrinter.name);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    setBlockedBlobUrl(blobUrl);

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
      setQuickPrintMessage(`Perintah cetak (${copiesCount}x lembar) disiapkan untuk "${activePrinter.name}"!`);
      setTimeout(() => {
        setQuickPrintStatus('idle');
      }, 4000);
    } else {
      setQuickPrintStatus('success');
      setQuickPrintMessage(`Jendela cetak printer (${copiesCount}x lembar) terbuka untuk "${activePrinter.name}"!`);
      try {
        printWin.focus();
      } catch {}
      setTimeout(() => {
        setQuickPrintStatus('idle');
      }, 4000);
    }
  };

  // Direct in-page browser print trigger
  const handleSystemPrint = () => {
    sounds.playPopSound();
    try {
      window.print();
    } catch (err) {
      console.warn('Direct window.print error, opening print window:', err);
      executeDirectPrint(1);
    }
  };

  // Handler for "⚡ Cetak Cepat" button (Instant Print directly to connected printer)
  const handleQuickPrint = () => {
    sounds.playPopSound();
    setQuickPrintStatus('printing');
    setQuickPrintMessage(`Mengirim ${printCopies}x cetakan langsung ke printer "${activePrinter.name}"...`);

    executeDirectPrint(printCopies);
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
    <div className="h-full max-h-full w-full max-w-5xl mx-auto p-2 sm:p-4 overflow-y-auto space-y-4 animate-in fade-in duration-200">
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
                className="max-h-[500px] w-auto rounded shadow-md object-contain transition-all"
                style={{
                  imageRendering:
                    (activePrinter.type === 'thermal_80mm' || activePrinter.type === 'thermal_58mm') && thermalDither
                      ? 'pixelated'
                      : 'auto',
                }}
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
                    Mencetak langsung ke printer yang terhubung ({activePrinter.name})
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

            {/* THE MAIN HERO "PRINT LANGSUNG KE PRINTER" BUTTON */}
            <button
              type="button"
              onClick={handleQuickPrint}
              disabled={isGenerating || quickPrintStatus === 'printing'}
              className="w-full relative group py-4 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-base shadow-lg hover:shadow-orange-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3.5 cursor-pointer border border-orange-500"
            >
              <Printer className="w-6 h-6 text-white shrink-0 animate-pulse" />
              <div className="text-left leading-tight flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-wide">PRINT LANGSUNG KE PRINTER</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-white border border-white/20">
                    {printCopies}x Lembar
                  </span>
                </div>
                <span className="text-xs font-normal text-orange-100 block mt-0.5">
                  Kirim perintah cetak langsung ke printer {activePrinter.name}
                </span>
              </div>
            </button>

            {/* Secondary Options: Multi-Channel Print & Download */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => executeDirectPrint(1)}
                disabled={isGenerating || quickPrintStatus === 'printing'}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                title="Cetak 1 Lembar langsung"
              >
                <Printer className="w-4 h-4 text-orange-400" />
                <span className="text-[11px]">Print 1x</span>
              </button>

              {blockedBlobUrl ? (
                <a
                  href={blockedBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                  title="Buka tampilan cetak di tab baru"
                >
                  <ExternalLink className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px]">Tab Cetak</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => executeDirectPrint(printCopies)}
                  disabled={isGenerating || quickPrintStatus === 'printing'}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                  title="Buka tampilan cetak di tab baru"
                >
                  <ExternalLink className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px]">Tab Cetak</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSystemPrint}
                disabled={isGenerating}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                title="Dialog cetak bawaan browser (Ctrl+P)"
              >
                <Printer className="w-4 h-4 text-stone-400" />
                <span className="text-[11px]">Dialog OS</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-mono font-bold text-xs border border-stone-800 transition-all cursor-pointer"
                title="Simpan file foto ke komputer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span className="text-[11px]">Unduh PNG</span>
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

      {/* Hidden container dedicated for native Ctrl+P / browser print isolation */}
      <div id="snapbooth-print-area" className="hidden">
        {Array.from({ length: printCopies }).map((_, i) => (
          <div
            key={i}
            style={{
              pageBreakAfter: i < printCopies - 1 ? 'always' : 'auto',
              breakAfter: i < printCopies - 1 ? 'page' : 'auto',
              width: activePrinter.type === 'thermal_58mm' ? '48mm' : activePrinter.type === 'dual_4x6' ? '4in' : '72mm',
              margin: '0 auto',
              padding: '0',
            }}
          >
            <img
              src={currentPrintData || highResDataUrl}
              alt={`Printout Lembar ${i + 1}`}
              style={{
                width: '100%',
                display: 'block',
                margin: '0 auto',
                imageRendering: 'crisp-edges',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
