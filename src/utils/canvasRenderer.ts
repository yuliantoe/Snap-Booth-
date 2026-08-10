import { EventTheme, FilterType, ImageAdjustments, LayoutType, PhotoSlot, StickerItem } from '../types';
import QRCode from 'qrcode';

interface RenderOptions {
  photos: PhotoSlot[];
  layout: LayoutType;
  theme: EventTheme;
  filter: FilterType;
  adjustments: ImageAdjustments;
  stickers: StickerItem[];
  includeQrCode?: boolean;
  qrUrl?: string;
  targetWidth?: number; // default 1200
}

// Helper to draw text with automatic font-size downscaling so it fits within maxWidth
function drawAutoFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startFontSize: number,
  fontFamily: string,
  fontWeight: string = 'bold',
  textAlign: CanvasTextAlign = 'center'
): number {
  let fontSize = startFontSize;
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
    fontSize -= 1.5;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  }
  ctx.textAlign = textAlign;
  ctx.fillText(text, x, y);
  ctx.restore();
  return fontSize;
}

// Helper to draw a clean edge-to-edge dashed vector line for receipt layout
function drawReceiptDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
  pattern: number[] = [10, 6],
  lineWidth: number = 2
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(pattern);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export async function generatePhotoStripCanvas(options: RenderOptions): Promise<HTMLCanvasElement> {
  const {
    photos,
    layout,
    theme,
    filter,
    adjustments,
    stickers,
    includeQrCode = true,
    qrUrl,
    targetWidth = 1200,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Calculate Canvas Dimensions based on layout
  const topLogoHeight = theme.logoUrl ? 180 : 0;

  let canvasWidth = targetWidth;
  let canvasHeight = 3600; // default strip height
  let photoWidth = 1000;
  let photoHeight = 750; // 4:3 ratio
  let padding = 80;
  let gap = 40;
  let photoCount = 4;

  if (layout === 'strip4') {
    photoCount = 4;
    canvasWidth = targetWidth; // 1200
    padding = 70;
    gap = 35;
    photoWidth = canvasWidth - padding * 2; // 1060
    photoHeight = Math.round(photoWidth * 0.75); // 795
    const headerHeight = 450;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + (photoCount - 1) * gap + headerHeight;
  } else if (layout === 'korean_receipt' || layout === 'shopping_receipt') {
    photoCount = 4;
    canvasWidth = targetWidth; // e.g. 1200
    padding = Math.round(canvasWidth * 0.06); // 72px
    gap = Math.round(canvasWidth * 0.035); // 42px
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.7); // 4:3 receipt photo ratio
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.18) : 0;
    const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
    const footerHeight = Math.round(canvasWidth * 0.52);
    canvasHeight = headerHeight + photoCount * photoHeight + (photoCount - 1) * gap + footerHeight;
  } else if (layout === 'magazine') {
    photoCount = 1;
    canvasWidth = targetWidth; // 1200
    padding = 70;
    photoWidth = canvasWidth - padding * 2; // 1060
    photoHeight = Math.round(photoWidth * 0.95); // 1007px
    const topLogoExtra = theme.logoUrl ? 120 : 0;
    const magazineHeaderHeight = 360 + topLogoExtra;
    const magazineFooterHeight = 360;
    canvasHeight = padding + magazineHeaderHeight + photoHeight + magazineFooterHeight + padding;
  } else if (layout === 'strip3') {
    photoCount = 3;
    canvasWidth = targetWidth;
    padding = 80;
    gap = 40;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.75);
    const headerHeight = 500;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + (photoCount - 1) * gap + headerHeight;
  } else if (layout === 'grid2x2') {
    photoCount = 4;
    canvasWidth = targetWidth;
    padding = 70;
    gap = 35;
    photoWidth = Math.round((canvasWidth - padding * 2 - gap) / 2);
    photoHeight = Math.round(photoWidth * 0.85);
    const headerHeight = 400;
    canvasHeight = padding * 2 + topLogoHeight + photoHeight * 2 + gap + headerHeight;
  } else if (layout === 'polaroid') {
    photoCount = 1;
    canvasWidth = targetWidth;
    padding = 90;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = photoWidth; // square
    const polaroidBottomMargin = 450;
    canvasHeight = padding + topLogoHeight + photoHeight + polaroidBottomMargin;
  } else if (layout === 'photocard') {
    photoCount = 2;
    canvasWidth = targetWidth;
    padding = 80;
    gap = 40;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.7);
    const headerHeight = 450;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + gap + headerHeight;
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 1. Draw Background Frame Color & Custom Background Image
  ctx.fillStyle = theme.frameColor || '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (theme.customBgImageUrl) {
    try {
      const bgImg = await loadImage(theme.customBgImageUrl);
      ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
    } catch (err) {
      console.warn('Could not load customBgImageUrl:', err);
    }
  }

  // Background pattern and frame border lines removed per user request

  // 2. Prepare QR Code image if enabled
  let qrImage: HTMLImageElement | null = null;
  if (includeQrCode && qrUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        margin: 1,
        color: { dark: theme.textColor || '#000000', light: '#FFFFFF00' },
      });
      qrImage = await loadImage(qrDataUrl);
    } catch {
      // QR generation failed silently
    }
  }

  // 3. Render Photos into Layout Slots
  const startPhotoY = padding + topLogoHeight;

  for (let i = 0; i < photoCount; i++) {
    const slotPhoto = photos[i];
    let x = padding;
    let y = startPhotoY;

    if (layout === 'strip4' || layout === 'strip3' || layout === 'photocard') {
      x = padding;
      y = startPhotoY + i * (photoHeight + gap);
    } else if (layout === 'korean_receipt' || layout === 'shopping_receipt') {
      x = padding;
      const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.18) : 0;
      const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
      y = headerHeight + i * (photoHeight + gap);
    } else if (layout === 'magazine') {
      x = padding;
      const topLogoExtra = theme.logoUrl ? 120 : 0;
      const magazineHeaderHeight = 360 + topLogoExtra;
      y = padding + magazineHeaderHeight;
    } else if (layout === 'grid2x2') {
      const col = i % 2;
      const row = Math.floor(i / 2);
      x = padding + col * (photoWidth + gap);
      y = startPhotoY + row * (photoHeight + gap);
    } else if (layout === 'polaroid') {
      x = padding;
      y = startPhotoY;
    }

    // Photo slot background box / placeholder
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(x, y, photoWidth, photoHeight);

    if (slotPhoto && slotPhoto.dataUrl) {
      try {
        const img = await loadImage(slotPhoto.dataUrl);
        ctx.save();

        // Clip photo area
        ctx.beginPath();
        ctx.rect(x, y, photoWidth, photoHeight);
        ctx.clip();

        // Apply Photo Filters & Color Adjustments
        applyCanvasFilter(ctx, filter, adjustments);

        // Draw image cropped cleanly (object-fit cover)
        const imgRatio = img.width / img.height;
        const slotRatio = photoWidth / photoHeight;
        let drawW = photoWidth;
        let drawH = photoHeight;
        let drawX = x;
        let drawY = y;

        if (imgRatio > slotRatio) {
          drawW = photoHeight * imgRatio;
          drawX = x - (drawW - photoWidth) / 2;
        } else {
          drawH = photoWidth / imgRatio;
          drawY = y - (drawH - photoHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (err) {
        console.error('Failed drawing photo slot', err);
      }
    } else {
      // Empty slot placeholder indicator
      ctx.fillStyle = '#94A3B8';
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Foto ${i + 1}`, x + photoWidth / 2, y + photoHeight / 2);
    }
  }

  // 4. Render Event Header & Footer Typography
  ctx.save();
  ctx.fillStyle = theme.textColor || '#111111';

  if (layout === 'korean_receipt') {
    // Top and Bottom Serrated / Paper Tear Edges
    drawSerratedPaperEdge(ctx, canvasWidth, 0, true);
    drawSerratedPaperEdge(ctx, canvasWidth, canvasHeight, false);

    const isCfd =
      theme.id === 'car_free_day_receipt' ||
      (theme.eventTitle && (theme.eventTitle.toUpperCase().includes('CFD') || theme.eventTitle.toUpperCase().includes('CAR FREE DAY')));

    const monoFont = '"Courier New", Courier, monospace';
    const textColor = theme.textColor || '#1A1A1A';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;
    const leftX = padding;
    const rightX = canvasWidth - padding;

    // Render Top Receipt Header
    let curY = Math.round(canvasWidth * 0.08);

    // Render Brand Logo at the very top of receipt header if present
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.45);
        const maxLogoHeight = Math.round(canvasWidth * 0.15);
        let logoW = logoImg.width;
        let logoH = logoImg.height;

        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;

        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, curY, logoW, logoH);
        curY += logoH + Math.round(canvasWidth * 0.03);
      } catch (err) {
        console.warn('Unable to render theme logoUrl on receipt header:', err);
      }
    }

    drawAutoFitText(ctx, isCfd ? '★ CAR FREE DAY / RECEIPT PHOTO ★' : '★ LIFE 4-CUTS / 영수증 ★', canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.042), monoFont, 'bold');
    curY += Math.round(canvasWidth * 0.048);

    const titleText = (theme.eventTitle || (isCfd ? 'JAKARTA CAR FREE DAY' : 'KR RECEIPT PHOTOBOOTH')).toUpperCase();
    drawAutoFitText(ctx, titleText, canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.04), monoFont, 'bold');
    curY += Math.round(canvasWidth * 0.038);

    if (theme.eventSubtitle) {
      drawAutoFitText(ctx, theme.eventSubtitle.toUpperCase(), canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.026), monoFont, 'normal');
      curY += Math.round(canvasWidth * 0.035);
    }

    // Receipt Dashed Separator
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor);
    curY += Math.round(canvasWidth * 0.035);

    // Order Info Table Left/Right
    ctx.textAlign = 'left';
    ctx.font = `${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.fillText(`DATE : ${theme.eventDate || (isCfd ? 'MINGGU, 08 AGUSTUS 2026' : '2026.08.08')}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, rightX, curY);
    curY += Math.round(canvasWidth * 0.032);

    ctx.textAlign = 'left';
    ctx.fillText(`ORDER: #${isCfd ? 'CFD' : 'KR'}-88${Math.floor(Math.random() * 8999 + 1000)}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText('REG: #01 [PAID]', rightX, curY);
    curY += Math.round(canvasWidth * 0.035);

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor);
    curY += Math.round(canvasWidth * 0.035);

    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.fillText('QTY  ITEM DESCRIPTION                    PRICE', leftX, curY);
    curY += Math.round(canvasWidth * 0.032);
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor);

    // Render Bottom Receipt Footer (Below the 4 photos)
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.18) : 0;
    const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
    const photoCountLocal = 4;
    const gapLocal = Math.round(canvasWidth * 0.035);
    const photoHeightLocal = Math.round((canvasWidth - padding * 2) * 0.7);
    let footerY = headerHeight + photoCountLocal * photoHeightLocal + (photoCountLocal - 1) * gapLocal + Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.032);

    ctx.font = `${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('SUBTOTAL', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0' : '₩0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.03);

    ctx.textAlign = 'left';
    ctx.fillText(isCfd ? 'PPN (0%)' : 'VAT (0%)', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0' : '₩0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.032);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.035);

    ctx.font = `bold ${Math.round(canvasWidth * 0.032)}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(isCfd ? 'TOTAL BAYAR' : 'TOTAL AMOUNT', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0 (GRATIS)' : '₩0 (FREE)', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.038);

    drawAutoFitText(ctx, isCfd ? '★ TERIMA KASIH • NIKMATI CFD SEHAT ★' : '★ THANK YOU FOR MAKING MEMORIES ★', canvasWidth / 2, footerY, maxContentWidth, Math.round(canvasWidth * 0.028), monoFont, 'bold');
    footerY += Math.round(canvasWidth * 0.035);

    drawAutoFitText(ctx, isCfd ? 'Nikmati Udara Segar & Bebas Polusi 🏃🚲' : '감사합니다! 좋은 하루 되세요 ✨', canvasWidth / 2, footerY, maxContentWidth, Math.round(canvasWidth * 0.026), monoFont, 'normal');
    footerY += Math.round(canvasWidth * 0.04);

    // Thermal Barcode at Bottom of Korean Receipt
    const barcodeW = Math.round(canvasWidth * 0.55);
    const barcodeH = Math.round(canvasWidth * 0.08);
    const barcodeX = canvasWidth / 2 - barcodeW / 2;
    const barcodeY = footerY;

    ctx.fillStyle = textColor;
    const barPattern = [3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 2, 3, 1, 2, 4, 1, 3];
    const totalUnits = barPattern.reduce((a, b) => a + b, 0);
    const unitW = barcodeW / totalUnits;

    let currX = barcodeX;
    for (let i = 0; i < barPattern.length; i++) {
      const w = barPattern[i] * unitW;
      if (i % 2 === 0) {
        ctx.fillRect(currX, barcodeY, Math.max(w * 0.85, 2), barcodeH);
      }
      currX += w;
    }

    drawAutoFitText(ctx, isCfd ? '* JAKARTA-CAR-FREE-DAY-RECEIPT *' : '* KR-RECEIPT-PHOTO-FOUR-CUTS *', canvasWidth / 2, barcodeY + barcodeH + Math.round(canvasWidth * 0.03), maxContentWidth, Math.round(canvasWidth * 0.024), monoFont, 'bold');
  } else if (layout === 'shopping_receipt') {
    // Top and Bottom Serrated / Paper Tear Edges
    drawSerratedPaperEdge(ctx, canvasWidth, 0, true);
    drawSerratedPaperEdge(ctx, canvasWidth, canvasHeight, false);

    const monoFont = '"Courier New", Courier, monospace';
    const textColor = theme.textColor || '#111827';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;
    const leftX = padding;
    const rightX = canvasWidth - padding;

    // Render Top Receipt Header
    let curY = Math.round(canvasWidth * 0.08);

    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.45);
        const maxLogoHeight = Math.round(canvasWidth * 0.15);
        let logoW = logoImg.width;
        let logoH = logoImg.height;

        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;

        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, curY, logoW, logoH);
        curY += logoH + Math.round(canvasWidth * 0.03);
      } catch (err) {
        console.warn('Unable to render theme logoUrl on receipt header:', err);
      }
    }

    drawAutoFitText(ctx, '★ STRUK PEMBELIAN & KASIR ★', canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.04), monoFont, 'bold');
    curY += Math.round(canvasWidth * 0.048);

    const titleText = (theme.eventTitle || 'HAPPY MART SUPERMARKET').toUpperCase();
    drawAutoFitText(ctx, titleText, canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.042), monoFont, 'bold');
    curY += Math.round(canvasWidth * 0.038);

    if (theme.eventSubtitle) {
      drawAutoFitText(ctx, theme.eventSubtitle.toUpperCase(), canvasWidth / 2, curY, maxContentWidth, Math.round(canvasWidth * 0.025), monoFont, 'normal');
      curY += Math.round(canvasWidth * 0.035);
    }

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);
    curY += Math.round(canvasWidth * 0.035);

    ctx.textAlign = 'left';
    ctx.font = `${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.fillText(`TGL: ${theme.eventDate || '08 AGUSTUS 2026'}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`JAM: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, rightX, curY);
    curY += Math.round(canvasWidth * 0.032);

    ctx.textAlign = 'left';
    ctx.fillText(`INV: #MART-2026-${Math.floor(Math.random() * 8999 + 1000)}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText('KASIR: #01 [LUNAS]', rightX, curY);
    curY += Math.round(canvasWidth * 0.035);

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor);
    curY += Math.round(canvasWidth * 0.035);

    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.fillText('QTY  NAMA ITEM                          HARGA', leftX, curY);
    curY += Math.round(canvasWidth * 0.032);
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor);

    // Render Bottom Receipt Footer (Below the 4 photos)
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.18) : 0;
    const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
    const photoCountLocal = 4;
    const gapLocal = Math.round(canvasWidth * 0.035);
    const photoHeightLocal = Math.round((canvasWidth - padding * 2) * 0.7);
    let footerY = headerHeight + photoCountLocal * photoHeightLocal + (photoCountLocal - 1) * gapLocal + Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.032);

    ctx.font = `${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('1x  SESI FOTO PHOTOBOOTH', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.03);

    ctx.textAlign = 'left';
    ctx.fillText('1x  CETAK FOTO HIGH-RES', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.032);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.035);

    ctx.font = `${Math.round(canvasWidth * 0.026)}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('SUBTOTAL', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.03);

    ctx.textAlign = 'left';
    ctx.fillText('DISKON MEMORY (100%)', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('-RP 0', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.032);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.round(canvasWidth * 0.035);

    ctx.font = `bold ${Math.round(canvasWidth * 0.032)}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL BAYAR', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0 (GRATIS)', rightX, footerY);
    footerY += Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor);
    footerY += Math.round(canvasWidth * 0.038);

    drawAutoFitText(ctx, '★ TERIMA KASIH ATAS KUNJUNGAN ANDA ★', canvasWidth / 2, footerY, maxContentWidth, Math.round(canvasWidth * 0.028), monoFont, 'bold');
    footerY += Math.round(canvasWidth * 0.035);

    drawAutoFitText(ctx, 'Simpan Struk Ini Sebagai Kenangan Manis ✨', canvasWidth / 2, footerY, maxContentWidth, Math.round(canvasWidth * 0.026), monoFont, 'normal');
    footerY += Math.round(canvasWidth * 0.04);

    // Thermal Barcode at Bottom
    const barcodeW = Math.round(canvasWidth * 0.55);
    const barcodeH = Math.round(canvasWidth * 0.08);
    const barcodeX = canvasWidth / 2 - barcodeW / 2;
    const barcodeY = footerY;

    ctx.fillStyle = textColor;
    const barPattern = [3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 2, 3, 1, 2, 4, 1, 3];
    const totalUnits = barPattern.reduce((a, b) => a + b, 0);
    const unitW = barcodeW / totalUnits;

    let currX = barcodeX;
    for (let i = 0; i < barPattern.length; i++) {
      const w = barPattern[i] * unitW;
      if (i % 2 === 0) {
        ctx.fillRect(currX, barcodeY, Math.max(w * 0.85, 2), barcodeH);
      }
      currX += w;
    }

    drawAutoFitText(ctx, '* RETAIL-SHOPPING-RECEIPT-PHOTO *', canvasWidth / 2, barcodeY + barcodeH + Math.round(canvasWidth * 0.03), maxContentWidth, Math.round(canvasWidth * 0.024), monoFont, 'bold');
  } else if (layout === 'magazine') {
    const textColor = theme.textColor || '#FAF8F5';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;

    const getFontFamilyName = (family?: EventTheme['fontFamily']) => {
      switch (family) {
        case 'serif':
          return 'Georgia, "Times New Roman", serif';
        case 'mono':
          return '"Courier New", Courier, monospace';
        case 'handwriting':
          return '"Brush Script MT", "Caveat", cursive';
        case 'display':
          return 'Impact, "Arial Black", sans-serif';
        case 'sans':
        default:
          return '"Plus Jakarta Sans", system-ui, sans-serif';
      }
    };

    const titleFont = getFontFamilyName(theme.fontFamily);

    // Top Header Masthead
    let topY = padding + 60;

    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = 360;
        const maxLogoHeight = 110;
        let logoW = logoImg.width;
        let logoH = logoImg.height;

        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;

        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, padding, logoW, logoH);
        topY = padding + logoH + 40;
      } catch (err) {
        console.warn('Unable to render theme logoUrl on magazine header:', err);
      }
    }

    // Masthead Big Title (Auto-fit so long names fit seamlessly)
    const magTitle = (theme.eventTitle || 'VOGUE EDITORIAL').toUpperCase();
    drawAutoFitText(ctx, magTitle, canvasWidth / 2, topY + 60, maxContentWidth, 90, titleFont, '900', 'center');

    // Subtitle & Category
    const magSub = (theme.eventSubtitle || 'SPECIAL COVER STORY • LIMITED EDITION').toUpperCase();
    ctx.fillStyle = theme.accentColor || textColor;
    drawAutoFitText(ctx, magSub, canvasWidth / 2, topY + 115, maxContentWidth, 26, titleFont, '600', 'center');

    if (theme.showDateBadge && theme.eventDate) {
      ctx.fillStyle = textColor;
      drawAutoFitText(ctx, theme.eventDate.toUpperCase(), canvasWidth / 2, topY + 150, maxContentWidth, 20, 'sans-serif', 'bold', 'center');
    }

    // Top Divider Line
    ctx.strokeStyle = theme.accentColor || textColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding, topY + 175);
    ctx.lineTo(canvasWidth - padding, topY + 175);
    ctx.stroke();

    // Magazine Bottom Headlines (Below Photo)
    const topLogoExtra = theme.logoUrl ? 120 : 0;
    const magazineHeaderHeight = 360 + topLogoExtra;
    const photoH = Math.round((canvasWidth - padding * 2) * 0.95);
    const bottomY = padding + magazineHeaderHeight + photoH + 50;

    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, '★ EXCLUSIVE COVER STORY', padding, bottomY, maxContentWidth * 0.65, 32, titleFont, 'bold', 'left');

    const subText = (theme.eventTitle || 'THE ART OF CREATING UNFORGETTABLE MEMORIES').toUpperCase();
    ctx.fillStyle = theme.accentColor || '#E2E8F0';
    drawAutoFitText(ctx, subText, padding, bottomY + 42, maxContentWidth * 0.65, 22, 'sans-serif', 'normal', 'left');

    const issueText = (theme.eventSubtitle || 'SPRING / SUMMER SPECIAL EDITORIAL • SNAPBOOTH').toUpperCase();
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, issueText, padding, bottomY + 75, maxContentWidth * 0.65, 18, 'sans-serif', 'normal', 'left');

    // Bottom Right Barcode & ISSN Code
    const barcodeW = 260;
    const barcodeH = 48;
    const barcodeX = canvasWidth - padding - barcodeW;
    const barcodeY = bottomY;

    ctx.fillStyle = textColor;
    const barPattern = [3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 2, 3, 1, 2, 4, 1, 3];
    const totalUnits = barPattern.reduce((a, b) => a + b, 0);
    const unitW = barcodeW / totalUnits;

    let currX = barcodeX;
    for (let i = 0; i < barPattern.length; i++) {
      const w = barPattern[i] * unitW;
      if (i % 2 === 0) {
        ctx.fillRect(currX, barcodeY, Math.max(w * 0.85, 2), barcodeH);
      }
      currX += w;
    }

    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('* VOGUE-MAGAZINE-COVER *', canvasWidth - padding, barcodeY + barcodeH + 18);
  } else {
    // Normal non-receipt layout rendering
    ctx.textAlign = 'center';

    // Render Brand Logo at the VERY TOP of the photostrip frame (above photo 1)
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = 420; // Enlarged top logo max width
        const maxLogoHeight = 150; // Enlarged top logo max height
        let logoW = logoImg.width;
        let logoH = logoImg.height;

        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;

        const logoX = canvasWidth / 2 - logoW / 2;
        const logoY = padding + (topLogoHeight - logoH) / 2;

        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
      } catch (err) {
        console.warn('Unable to render theme logoUrl at top:', err);
      }
    }

    let headerY = canvasHeight - 400;
    if (layout === 'polaroid') {
      headerY = padding + topLogoHeight + photoHeight + 80;
    }

  // Helper function to resolve Font Family name
  const getFontFamilyName = (family?: EventTheme['fontFamily']) => {
    switch (family) {
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'mono':
        return '"Courier New", Courier, monospace';
      case 'handwriting':
        return '"Brush Script MT", "Caveat", cursive';
      case 'display':
        return 'Impact, "Arial Black", sans-serif';
      case 'sans':
      default:
        return '"Plus Jakarta Sans", system-ui, sans-serif';
    }
  };

  const titleFontFamilyName = getFontFamilyName(theme.fontFamily);
  const dateFontFamilyName = getFontFamilyName(theme.dateFontFamily || theme.fontFamily);

  // Event Title
  ctx.font = `bold 56px ${titleFontFamilyName}`;
  ctx.fillText(theme.eventTitle || 'SnapBooth Studio', canvasWidth / 2, headerY);

  // Subtitle
  if (theme.eventSubtitle) {
    ctx.font = `32px ${dateFontFamilyName}`;
    ctx.fillStyle = theme.textColor ? `${theme.textColor}CC` : '#444444';
    ctx.fillText(theme.eventSubtitle, canvasWidth / 2, headerY + 65);
  }

  // Date Badge or Event Date
  if (theme.showDateBadge && theme.eventDate) {
    ctx.font = `bold 28px ${dateFontFamilyName}`;
    ctx.fillStyle = theme.accentColor || theme.textColor || '#000000';
    ctx.fillText(theme.eventDate, canvasWidth / 2, headerY + 125);
  }

  // Draw Centered Standalone Barcode (No QR Code, No White Background Box)
  ctx.save();

  const barcodeW = 340;
  const barcodeH = 50;
  const barcodeX = canvasWidth / 2 - barcodeW / 2;
  const barcodeY = canvasHeight - padding - barcodeH - 45;

  ctx.fillStyle = theme.textColor || '#111111';

  const barPattern = [3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 3, 2, 3, 1, 2, 4, 1, 3];
  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  const unitW = barcodeW / totalUnits;

  let currX = barcodeX;
  for (let i = 0; i < barPattern.length; i++) {
    const w = barPattern[i] * unitW;
    if (i % 2 === 0) {
      ctx.fillRect(currX, barcodeY, Math.max(w * 0.85, 2), barcodeH);
    }
    currX += w;
  }

  // Barcode Serial Text underneath lines
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('* SNAPBOOTH-ID *', canvasWidth / 2, barcodeY + barcodeH + 20);

  // Footer Tagline
  ctx.font = '900 12px sans-serif';
  ctx.fillText('SCAN BARCODE TO DOWNLOAD', canvasWidth / 2, barcodeY + barcodeH + 38);

  ctx.restore();
  }

  ctx.restore();

  // Render Custom Frame Overlay PNG if uploaded
  if (theme.customFrameOverlayUrl) {
    try {
      const overlayImg = await loadImage(theme.customFrameOverlayUrl);
      ctx.drawImage(overlayImg, 0, 0, canvasWidth, canvasHeight);
    } catch (err) {
      console.warn('Could not load customFrameOverlayUrl:', err);
    }
  }

  // 5. Render Draggable Stickers & Emojis
  if (stickers && stickers.length > 0) {
    for (const sticker of stickers) {
      ctx.save();
      const stX = (sticker.x / 100) * canvasWidth;
      const stY = (sticker.y / 100) * canvasHeight;

      ctx.translate(stX, stY);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      ctx.scale(sticker.scale, sticker.scale);

      if (sticker.isCustomUrl) {
        try {
          const stImg = await loadImage(sticker.emojiOrUrl);
          ctx.drawImage(stImg, -40, -40, 80, 80);
        } catch {
          // ignore
        }
      } else {
        ctx.font = '80px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker.emojiOrUrl, 0, 0);
      }

      ctx.restore();
    }
  }

  return canvas;
}

// Helper to draw serrated/zigzag receipt paper edges
function drawSerratedPaperEdge(ctx: CanvasRenderingContext2D, width: number, y: number, isTop: boolean) {
  ctx.save();
  ctx.fillStyle = '#EAE6DF';
  const toothWidth = Math.max(16, Math.round(width / 36));
  const toothHeight = 16;
  ctx.beginPath();
  if (isTop) {
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += toothWidth) {
      ctx.lineTo(x + toothWidth / 2, y + toothHeight);
      ctx.lineTo(x + toothWidth, y);
    }
    ctx.lineTo(width, 0);
    ctx.lineTo(0, 0);
  } else {
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += toothWidth) {
      ctx.lineTo(x + toothWidth / 2, y - toothHeight);
      ctx.lineTo(x + toothWidth, y);
    }
    ctx.lineTo(width, y + 40);
    ctx.lineTo(0, y + 40);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw background textures
function drawPattern(ctx: CanvasRenderingContext2D, theme: EventTheme, width: number, height: number) {
  const patternType = theme.bgPattern || 'solid';
  if (patternType === 'solid') return;

  ctx.save();
  ctx.fillStyle = theme.accentColor || '#00000015';

  if (patternType === 'dots') {
    const dotSpacing = 60;
    const dotRadius = 4;
    for (let x = 30; x < width; x += dotSpacing) {
      for (let y = 30; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (patternType === 'grid') {
    ctx.strokeStyle = theme.accentColor ? `${theme.accentColor}33` : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    const gridStep = 80;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (patternType === 'hearts' || patternType === 'stars' || patternType === 'sparkles') {
    const symbol = patternType === 'hearts' ? '♥' : patternType === 'stars' ? '★' : '✨';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = theme.accentColor ? `${theme.accentColor}44` : 'rgba(0,0,0,0.1)';
    const step = 140;
    for (let x = 40; x < width; x += step) {
      for (let y = 40; y < height; y += step) {
        const offsetX = (y % (step * 2)) === 0 ? 0 : step / 2;
        ctx.fillText(symbol, x + offsetX, y);
      }
    }
  }

  ctx.restore();
}

// Helper to draw frame borders
function drawFrameBorder(ctx: CanvasRenderingContext2D, theme: EventTheme, width: number, height: number, inset: number) {
  if (theme.borderStyle === 'none') return;

  ctx.save();
  ctx.strokeStyle = theme.accentColor || theme.textColor || '#333333';

  if (theme.borderStyle === 'thin') {
    ctx.lineWidth = 4;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  } else if (theme.borderStyle === 'double') {
    ctx.lineWidth = 3;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.strokeRect(inset + 12, inset + 12, width - (inset + 12) * 2, height - (inset + 12) * 2);
  } else if (theme.borderStyle === 'dashed') {
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 15]);
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  } else if (theme.borderStyle === 'ornate') {
    ctx.lineWidth = 3;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    // Draw corner ornaments
    const cornerSize = 40;
    const corners = [
      [inset, inset],
      [width - inset, inset],
      [inset, height - inset],
      [width - inset, height - inset],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, cornerSize, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Apply canvas filters
function applyCanvasFilter(ctx: CanvasRenderingContext2D, filter: FilterType, adjustments: ImageAdjustments) {
  let filterStr = '';

  // Filter preset defaults
  switch (filter) {
    case 'vintage':
      filterStr += 'sepia(0.35) contrast(1.1) brightness(1.05) saturate(0.85) ';
      break;
    case 'bw':
      filterStr += 'grayscale(1) contrast(1.3) brightness(1.05) ';
      break;
    case 'retro_y2k':
      filterStr += 'saturate(1.6) contrast(1.25) hue-rotate(-10deg) ';
      break;
    case 'soft_pastel':
      filterStr += 'brightness(1.15) saturate(0.85) contrast(0.95) ';
      break;
    case 'cyber_neon':
      filterStr += 'contrast(1.4) saturate(1.8) hue-rotate(180deg) ';
      break;
    case 'sepia':
      filterStr += 'sepia(0.8) contrast(1.05) ';
      break;
    case 'golden_hour':
      filterStr += 'sepia(0.2) saturate(1.4) brightness(1.1) ';
      break;
    case 'cool_breeze':
      filterStr += 'hue-rotate(20deg) saturate(1.1) brightness(1.05) ';
      break;
    case 'dramatic_noir':
      filterStr += 'grayscale(1) contrast(1.8) brightness(0.9) ';
      break;
    case 'normal':
    default:
      break;
  }

  // Add custom manual slider adjustments
  if (adjustments.brightness !== 1) filterStr += `brightness(${adjustments.brightness}) `;
  if (adjustments.contrast !== 1) filterStr += `contrast(${adjustments.contrast}) `;
  if (adjustments.saturation !== 1) filterStr += `saturate(${adjustments.saturation}) `;
  if (adjustments.sepia > 0) filterStr += `sepia(${adjustments.sepia}) `;
  if (adjustments.blur > 0) filterStr += `blur(${adjustments.blur}px) `;

  ctx.filter = filterStr.trim() || 'none';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
