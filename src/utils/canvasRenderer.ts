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
  isTrial?: boolean;
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

// Helper to draw realistic simulated barcodes
function drawSimulatedBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = '#000000'
) {
  ctx.save();
  ctx.fillStyle = color;
  const barPattern = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 4, 1, 2, 1, 3, 2];
  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  const unitW = width / totalUnits;
  let curX = x;
  barPattern.forEach((units, idx) => {
    const w = units * unitW;
    if (idx % 2 === 0) {
      ctx.fillRect(curX, y, w, height);
    }
    curX += w;
  });
  ctx.restore();
}

// Helper to parse calendar date info (year, month, highlight day)
function parseCalendarDateInfo(eventDateStr?: string) {
  const monthNamesId = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const monthNamesEn = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  let year = 2026;
  let month = 7; // August (0-indexed)
  let day = 8;

  if (eventDateStr) {
    const s = eventDateStr.toUpperCase();

    // 1. Check for 4-digit year (e.g. 2025 - 2035)
    const yearMatch = s.match(/\b(20\d\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // 2. Check for month by name
    let foundMonth = false;
    for (let i = 0; i < 12; i++) {
      if (
        s.includes(monthNamesId[i]) ||
        s.includes(monthNamesEn[i]) ||
        s.includes(monthNamesId[i].substring(0, 3))
      ) {
        month = i;
        foundMonth = true;
        break;
      }
    }

    // 3. Numeric patterns like DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
    const numParts = s.match(/\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})\b/);
    if (numParts) {
      const p1 = parseInt(numParts[1], 10);
      const p2 = parseInt(numParts[2], 10);
      const p3 = parseInt(numParts[3], 10);
      if (p3 > 1000) {
        if (p2 <= 12 && p1 <= 31) {
          day = p1;
          if (!foundMonth) month = p2 - 1;
        }
      } else if (p1 > 1000) {
        if (!foundMonth && p2 <= 12) month = p2 - 1;
        if (p3 <= 31) day = p3;
      }
    } else {
      const dayMatch = s.match(/\b([1-9]|[12]\d|3[01])\b/);
      if (dayMatch) {
        day = parseInt(dayMatch[1], 10);
      }
    }
  }

  const monthName = monthNamesId[month];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  return {
    year,
    month,
    day,
    monthName,
    daysInMonth,
    firstDayOfWeek,
  };
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
  const topLogoHeight = theme.logoUrl ? Math.round(targetWidth * 0.24) : 0;

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
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
    const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
    const footerHeight = Math.round(canvasWidth * 0.52);
    canvasHeight = headerHeight + photoCount * photoHeight + (photoCount - 1) * gap + footerHeight;
  } else if (layout === 'magazine') {
    photoCount = 1;
    canvasWidth = targetWidth; // 1200
    padding = 70;
    photoWidth = canvasWidth - padding * 2; // 1060
    photoHeight = Math.round(photoWidth * 0.95); // 1007px
    const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.24) : 0;
    const magazineHeaderHeight = 360 + topLogoExtra;
    const magazineFooterHeight = 360;
    canvasHeight = padding + magazineHeaderHeight + photoHeight + magazineFooterHeight + padding;
  } else if (layout === 'newspaper') {
    photoCount = 4;
    canvasWidth = targetWidth; // 1200
    padding = Math.round(canvasWidth * 0.05); // 60px
    gap = Math.round(canvasWidth * 0.02); // 24px
    const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
    const mastheadTotal = 240 + topLogoExtra;
    const breakingBanner = 110;
    const mainPhotoW = canvasWidth - padding * 2;
    const mainPhotoH = Math.round(mainPhotoW * 0.52); // ~562px
    const mainCaption = 55;
    const secondaryBar = 55;
    const colW = Math.round((canvasWidth - padding * 2 - gap * 2) / 3);
    const colH = Math.round(colW * 0.72); // ~248px
    const colText = 125;
    const bottomFooter = 105;
    canvasHeight = padding * 2 + mastheadTotal + breakingBanner + mainPhotoH + mainCaption + secondaryBar + colH + colText + bottomFooter;
  } else if (layout === 'calendar') {
    photoCount = 4;
    canvasWidth = targetWidth; // 1200
    padding = Math.round(canvasWidth * 0.05); // 60px
    gap = Math.round(canvasWidth * 0.02); // 24px
    const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
    const headerTotal = 185 + topLogoExtra;
    const colW = Math.round((canvasWidth - padding * 2 - gap) / 2);
    const colH = Math.round(colW * 0.68); // ~360px
    const photosGridHeight = colH * 2 + gap; // ~744px
    const quoteHeight = 35;
    const daysBarHeight = 45;
    const calendarGridHeight = 320;
    const bottomFooter = 80;
    canvasHeight = padding * 2 + headerTotal + photosGridHeight + quoteHeight + daysBarHeight + calendarGridHeight + bottomFooter;
  } else if (layout === 'calendar_single') {
    photoCount = 1;
    canvasWidth = targetWidth; // 1200
    padding = Math.round(canvasWidth * 0.05); // 60px
    gap = 0;
    const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
    const headerTotal = 195 + topLogoExtra;
    const photoW = canvasWidth - padding * 2; // 1080px
    const photoH = Math.round(photoW * 0.72); // ~778px
    const captionH = 46;
    const quoteHeight = 46;
    const daysBarHeight = 40;
    const calendarGridHeight = 295;
    const memoBoxHeight = 115;
    const bottomFooter = 85;
    canvasHeight = padding * 2 + headerTotal + photoH + captionH + quoteHeight + daysBarHeight + calendarGridHeight + memoBoxHeight + bottomFooter;
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
    let slotW = photoWidth;
    let slotH = photoHeight;

    if (layout === 'strip4' || layout === 'strip3' || layout === 'photocard') {
      x = padding;
      y = startPhotoY + i * (photoHeight + gap);
    } else if (layout === 'korean_receipt' || layout === 'shopping_receipt') {
      x = padding;
      const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
      const headerHeight = Math.round(canvasWidth * 0.58) + topReceiptLogoExtra;
      y = headerHeight + i * (photoHeight + gap);
    } else if (layout === 'magazine') {
      x = padding;
      const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.24) : 0;
      const magazineHeaderHeight = 360 + topLogoExtra;
      y = padding + magazineHeaderHeight;
    } else if (layout === 'newspaper') {
      const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
      const mastheadEndY = padding + 240 + topLogoExtra + 110;
      if (i === 0) {
        slotW = canvasWidth - padding * 2;
        slotH = Math.round(slotW * 0.52);
        x = padding;
        y = mastheadEndY;
      } else {
        const colIdx = i - 1;
        const availableW = canvasWidth - padding * 2 - gap * 2;
        const colW = Math.round(availableW / 3);
        const colH = Math.round(colW * 0.72);
        const mainH = Math.round((canvasWidth - padding * 2) * 0.52);
        const colStartY = mastheadEndY + mainH + 55 + 55;
        slotW = colW;
        slotH = colH;
        x = padding + colIdx * (colW + gap);
        y = colStartY;
      }
    } else if (layout === 'calendar') {
      const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
      const calPhotoStartY = padding + 185 + topLogoExtra;
      const availableW = canvasWidth - padding * 2 - gap;
      const colW = Math.round(availableW / 2);
      const colH = Math.round(colW * 0.68);
      const col = i % 2;
      const row = Math.floor(i / 2);
      slotW = colW;
      slotH = colH;
      x = padding + col * (colW + gap);
      y = calPhotoStartY + row * (colH + gap);
    } else if (layout === 'calendar_single') {
      const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0;
      const calPhotoStartY = padding + 195 + topLogoExtra;
      slotW = canvasWidth - padding * 2;
      slotH = Math.round(slotW * 0.72);
      x = padding;
      y = calPhotoStartY;
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
    ctx.fillRect(x, y, slotW, slotH);

    if (slotPhoto && slotPhoto.dataUrl) {
      try {
        const img = await loadImage(slotPhoto.dataUrl);
        ctx.save();

        // Clip photo area
        ctx.beginPath();
        ctx.rect(x, y, slotW, slotH);
        ctx.clip();

        // Apply Photo Filters & Color Adjustments
        applyCanvasFilter(ctx, filter, adjustments);

        // Draw image cropped cleanly (object-fit cover)
        const imgRatio = img.width / img.height;
        const slotRatio = slotW / slotH;
        let drawW = slotW;
        let drawH = slotH;
        let drawX = x;
        let drawY = y;

        if (imgRatio > slotRatio) {
          drawW = slotH * imgRatio;
          drawX = x - (drawW - slotW) / 2;
        } else {
          drawH = slotW / imgRatio;
          drawY = y - (drawH - slotH) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Decorative borders on photo if requested by layout
        if (layout === 'newspaper') {
          ctx.save();
          ctx.strokeStyle = '#18181B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, slotW, slotH);
          ctx.restore();
        } else if (layout === 'calendar' || layout === 'calendar_single') {
          ctx.save();
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, slotW, slotH);
          ctx.restore();
        }
      } catch (err) {
        console.error('Failed drawing photo slot', err);
      }
    } else {
      // Empty slot placeholder indicator
      ctx.fillStyle = '#94A3B8';
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Foto ${i + 1}`, x + slotW / 2, y + slotH / 2);

      if (layout === 'newspaper') {
        ctx.save();
        ctx.strokeStyle = '#18181B';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, slotW, slotH);
        ctx.restore();
      }
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
        const maxLogoWidth = Math.round(canvasWidth * 0.65);
        const maxLogoHeight = Math.round(canvasWidth * 0.22);
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
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
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

    drawAutoFitText(ctx, isCfd ? 'Nikmati Udara Segar & Bebas Polusi 🏃🚲' : '감사합니다! 좋은 Hari 되세요 ✨', canvasWidth / 2, footerY, maxContentWidth, Math.round(canvasWidth * 0.026), monoFont, 'normal');
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
        const maxLogoWidth = Math.round(canvasWidth * 0.65);
        const maxLogoHeight = Math.round(canvasWidth * 0.22);
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
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
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
        const maxLogoWidth = Math.round(canvasWidth * 0.65);
        const maxLogoHeight = Math.round(canvasWidth * 0.22);
        let logoW = logoImg.width;
        let logoH = logoImg.height;

        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;

        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, padding, logoW, logoH);
        topY = padding + logoH + 30;
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
    drawAutoFitText(ctx, issueText, padding, bottomY + 75, maxContentWidth, 18, 'sans-serif', 'normal', 'left');
  } else if (layout === 'newspaper') {
    const textColor = theme.textColor || '#18181B';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;
    const serifFont = 'Georgia, "Times New Roman", Times, serif';
    const sansFont = '"Plus Jakarta Sans", system-ui, sans-serif';

    // 1. Newspaper Outer Margin Borders (Double hairline rule)
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padding - 12, padding - 12, canvasWidth - (padding - 12) * 2, canvasHeight - (padding - 12) * 2);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(padding - 8, padding - 8, canvasWidth - (padding - 8) * 2, canvasHeight - (padding - 8) * 2);
    ctx.restore();

    let curY = padding + 10;

    // 2. Top Logo if available
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.6);
        const maxLogoHeight = Math.round(canvasWidth * 0.18);
        let logoW = logoImg.width;
        let logoH = logoImg.height;
        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;
        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, curY, logoW, logoH);
        curY += logoH + 15;
      } catch (err) {
        console.warn('Unable to render theme logoUrl on newspaper header:', err);
      }
    }

    // 3. Top Ear Pieces Left & Right
    const earWidth = 240;
    const earHeight = 40;
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    // Left Ear Box
    ctx.strokeRect(padding, curY, earWidth, earHeight);
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('VOL. LXXVIII • NO. 2026', padding + earWidth / 2, curY + 16);
    ctx.font = `11px ${sansFont}`;
    ctx.fillText('★ EDISI KHUSUS HARI INI ★', padding + earWidth / 2, curY + 32);

    // Right Ear Box
    ctx.strokeRect(canvasWidth - padding - earWidth, curY, earWidth, earHeight);
    ctx.font = `bold 13px ${sansFont}`;
    ctx.fillText('HARGA: KENANGAN ABADI', canvasWidth - padding - earWidth / 2, curY + 16);
    ctx.font = `11px ${sansFont}`;
    ctx.fillText('CUACA: CERAH BERAWAN 28°C ☀️', canvasWidth - padding - earWidth / 2, curY + 32);
    ctx.restore();

    // 4. Masthead Big Title (Center)
    const mastheadTitle = (theme.eventTitle || 'THE DAILY CHRONICLE').toUpperCase();
    drawAutoFitText(ctx, mastheadTitle, canvasWidth / 2, curY + 36, maxContentWidth - (earWidth * 2 + 30), 64, serifFont, '900', 'center');
    curY += earHeight + 14;

    // Subtitle under Masthead
    const mastheadSub = (theme.eventSubtitle || 'KORAN INDEPENDEN TERPERCAYA • MEREKAM JEJAK MOMEN TERINDAH').toUpperCase();
    drawAutoFitText(ctx, mastheadSub, canvasWidth / 2, curY, maxContentWidth, 16, sansFont, '600', 'center');
    curY += 22;

    // Double Horizontal Rules (Thick 3.5px line + Thin 1px line)
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(padding, curY);
    ctx.lineTo(canvasWidth - padding, curY);
    ctx.stroke();
    curY += 6;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, curY);
    ctx.lineTo(canvasWidth - padding, curY);
    ctx.stroke();
    curY += 18;

    // Dateline Bar (Left, Center, Right)
    ctx.font = `bold 14px ${serifFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('JAKARTA, INDONESIA', padding, curY);
    ctx.textAlign = 'center';
    ctx.font = `bold 15px ${sansFont}`;
    ctx.fillText((theme.eventDate || 'MINGGU, 08 AGUSTUS 2026').toUpperCase(), canvasWidth / 2, curY);
    ctx.textAlign = 'right';
    ctx.font = `bold 14px ${serifFont}`;
    ctx.fillText('EDISI NASIONAL • NO. 01', canvasWidth - padding, curY);
    curY += 8;

    // Thin Rule under Dateline
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, curY);
    ctx.lineTo(canvasWidth - padding, curY);
    ctx.stroke();
    ctx.restore();
    curY += 25;

    // 5. Breaking News Headline Banner
    ctx.save();
    // Badge pill
    ctx.fillStyle = textColor;
    const badgeW = 260;
    const badgeH = 24;
    ctx.fillRect(padding, curY, badgeW, badgeH);
    ctx.fillStyle = theme.frameColor || '#FFFFFF';
    ctx.font = `bold 12px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('★ BERITA UTAMA / HEADLINE ★', padding + badgeW / 2, curY + 16);

    curY += 42;
    ctx.fillStyle = textColor;
    const headlineText = 'MOMEN SPESIAL HARI INI MENCURI PERHATIAN PUBLIK!';
    drawAutoFitText(ctx, headlineText, padding, curY, maxContentWidth, 38, serifFont, '900', 'left');
    curY += 28;

    const deckText = 'Detik-detik penuh kegembiraan dan tawa ceria terekam abadi di hadapan lensa kamera para jurnalis dalam momen istimewa.';
    drawAutoFitText(ctx, deckText, padding, curY, maxContentWidth, 18, serifFont, 'italic', 'left');
    ctx.restore();

    // Main photo is drawn in loop 3
    const mainPhotoW = canvasWidth - padding * 2;
    const mainPhotoH = Math.round(mainPhotoW * 0.52);
    const mainPhotoCaptionY = curY + 18 + mainPhotoH + 20;

    // Caption below Main Photo
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `italic 14px ${serifFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('■ FOTO PERS UTAMA: Potret kebahagiaan terekam di studio. Senyuman tulus para tamu menyemarakkan suasana perhelatan. (Foto: Biro Pers SnapBooth)', padding, mainPhotoCaptionY);
    ctx.restore();

    // Secondary Section Divider Line with Diamond
    const secDividerY = mainPhotoCaptionY + 28;
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, secDividerY);
    ctx.lineTo(canvasWidth / 2 - 25, secDividerY);
    ctx.moveTo(canvasWidth / 2 + 25, secDividerY);
    ctx.lineTo(canvasWidth - padding, secDividerY);
    ctx.stroke();

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.fillText('◆', canvasWidth / 2, secDividerY + 5);

    // Secondary Section Title
    const secTitleY = secDividerY + 28;
    ctx.font = `bold 16px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('■ SOROTAN & KABAR BERITA LAINNYA HARI INI', padding, secTitleY);
    ctx.restore();

    // 3 Column Photo Captions and Text
    const colW = Math.round((canvasWidth - padding * 2 - gap * 2) / 3);
    const colH = Math.round(colW * 0.72);
    const colPhotoStartY = secTitleY + 14;
    const colTextStartY = colPhotoStartY + colH + 22;

    const columnStories = [
      {
        tag: 'KOLOM 1 • KECERIAAN',
        text: 'Tawa lepas dan senyuman merekah tanpa henti sepanjang perhelatan istimewa ini berlangsung.',
      },
      {
        tag: 'KOLOM 2 • POSE TERBAIK',
        text: 'Gaya memukau mencerminkan kehangatan, keceriaan, dan kebersamaan sejati para sahabat.',
      },
      {
        tag: 'KOLOM 3 • KENANGAN ABADI',
        text: 'Potret ini dicetak sebagai arsip kenangan sejarah bahwa hari ini adalah momen luar biasa.',
      },
    ];

    ctx.save();
    for (let c = 0; c < 3; c++) {
      const colX = padding + c * (colW + gap);
      const colStory = columnStories[c];

      // Tag
      ctx.fillStyle = textColor;
      ctx.font = `bold 13px ${sansFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(colStory.tag, colX, colTextStartY);

      // Paragraph
      ctx.font = `13px ${serifFont}`;
      ctx.fillStyle = `${textColor}DF`;
      drawAutoFitText(ctx, colStory.text, colX, colTextStartY + 20, colW, 13, serifFont, 'normal', 'left');

      // Draw vertical column divider rule between columns
      if (c < 2) {
        const divX = colX + colW + gap / 2;
        ctx.strokeStyle = `${textColor}40`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(divX, colPhotoStartY - 5);
        ctx.lineTo(divX, colTextStartY + 60);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Newspaper Bottom Press Footer
    const footerY = canvasHeight - padding - 45;
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, footerY);
    ctx.lineTo(canvasWidth - padding, footerY);
    ctx.stroke();

    // Barcode on left
    drawSimulatedBarcode(ctx, padding, footerY + 14, 180, 28, textColor);

    // Text on center/right
    ctx.fillStyle = textColor;
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'right';
    ctx.fillText('THE DAILY CHRONICLE • DITERBITKAN OLEH REDAKSI PERS SNAPBOOTH', canvasWidth - padding, footerY + 22);
    ctx.font = `11px ${sansFont}`;
    ctx.fillText('Dicetak dengan teknologi kualitas tinggi • Arsip Kenangan Sejarah Abadi', canvasWidth - padding, footerY + 38);
    ctx.restore();
  } else if (layout === 'calendar') {
    const textColor = theme.textColor || '#1E293B';
    const accentColor = theme.accentColor || '#E11D48';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;
    const sansFont = '"Plus Jakarta Sans", system-ui, sans-serif';

    const calInfo = parseCalendarDateInfo(theme.eventDate);

    // 1. Top Spiral Binder Rings / Hanging Hole Accent
    ctx.save();
    const ringCount = 7;
    const ringSpacing = maxContentWidth / (ringCount - 1);
    for (let r = 0; r < ringCount; r++) {
      const ringX = padding + r * ringSpacing;
      const ringY = padding - 8;
      // Shadow / hole
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(ringX, ringY, 7, 0, Math.PI * 2);
      ctx.fill();
      // Metallic clip loop
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ringX, ringY, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    let curY = padding + 25;

    // 2. Top Logo if provided
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.55);
        const maxLogoHeight = Math.round(canvasWidth * 0.16);
        let logoW = logoImg.width;
        let logoH = logoImg.height;
        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;
        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, curY, logoW, logoH);
        curY += logoH + 15;
      } catch (err) {
        console.warn('Unable to render theme logoUrl on calendar header:', err);
      }
    }

    // 3. Calendar Month & Year Big Display
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.font = `900 62px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${calInfo.monthName} ${calInfo.year}`, canvasWidth / 2, curY + 45);

    curY += 75;

    // Event Title & Subtitle
    const calTitle = (theme.eventTitle || 'OUR SPECIAL MEMORIES 2026').toUpperCase();
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, calTitle, canvasWidth / 2, curY, maxContentWidth, 24, sansFont, 'bold', 'center');
    curY += 28;

    const calSub = theme.eventSubtitle || 'Kenangan Manis Sepanjang Tahun • Simpan Setiap Detik Bahagia 🗓️';
    ctx.fillStyle = `${textColor}B3`;
    drawAutoFitText(ctx, calSub, canvasWidth / 2, curY, maxContentWidth, 16, sansFont, 'normal', 'center');
    curY += 22;

    // Subtle Header Divider Line
    ctx.strokeStyle = `${textColor}26`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, curY);
    ctx.lineTo(canvasWidth - padding, curY);
    ctx.stroke();
    ctx.restore();

    // Photos (4 photos in 2x2 grid) are rendered in loop 3
    const calColW = Math.round((canvasWidth - padding * 2 - gap) / 2);
    const calColH = Math.round(calColW * 0.68);
    const calPhotosStartY = padding + 185 + (theme.logoUrl ? Math.round(canvasWidth * 0.20) : 0);
    const calPhotosEndY = calPhotosStartY + calColH * 2 + gap;

    // 4. Inspiring Quote Banner below photos
    let calGridSectionY = calPhotosEndY + 25;
    ctx.save();
    ctx.font = `italic 15px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `${textColor}CC`;
    ctx.fillText('“Setiap hari adalah berkah baru, nikmati setiap detik bersama orang tersayang.”', canvasWidth / 2, calGridSectionY);
    ctx.restore();

    calGridSectionY += 20;

    // 5. Days of Week Header Bar (MIN, SEN, SEL, RAB, KAM, JUM, SAB)
    const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    const dayColW = maxContentWidth / 7;
    const daysBarH = 34;

    ctx.save();
    ctx.fillStyle = `${textColor}0D`;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(padding, calGridSectionY, maxContentWidth, daysBarH, 8);
    } else {
      ctx.rect(padding, calGridSectionY, maxContentWidth, daysBarH);
    }
    ctx.fill();

    ctx.font = `bold 14px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = 0; d < 7; d++) {
      const dayX = padding + d * dayColW + dayColW / 2;
      ctx.fillStyle = d === 0 ? '#EF4444' : textColor;
      ctx.fillText(dayNames[d], dayX, calGridSectionY + daysBarH / 2);
    }
    ctx.restore();

    // 6. Monthly Days Grid
    const gridStartY = calGridSectionY + daysBarH + 12;
    const totalSlots = calInfo.firstDayOfWeek + calInfo.daysInMonth;
    const totalRows = Math.ceil(totalSlots / 7);
    const rowHeight = Math.min(52, Math.round(270 / totalRows));

    ctx.save();
    for (let dayNum = 1; dayNum <= calInfo.daysInMonth; dayNum++) {
      const slotIndex = calInfo.firstDayOfWeek + dayNum - 1;
      const col = slotIndex % 7;
      const row = Math.floor(slotIndex / 7);
      const cellCenterX = padding + col * dayColW + dayColW / 2;
      const cellCenterY = gridStartY + row * rowHeight + rowHeight / 2;

      const isHighlight = dayNum === calInfo.day;
      const isSunday = col === 0;

      if (isHighlight) {
        // Highlight Badge (Circle/Pill)
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(cellCenterX, cellCenterY - 4, 17, 0, Math.PI * 2);
        ctx.fill();

        // White Day Number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 16px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY - 4);

        // Mini Label under highlight badge
        ctx.fillStyle = accentColor;
        ctx.font = `bold 9px ${sansFont}`;
        ctx.fillText('★ SPESIAL', cellCenterX, cellCenterY + 17);
      } else {
        ctx.fillStyle = isSunday ? '#EF4444' : textColor;
        ctx.font = `bold 15px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY);
      }
    }
    ctx.restore();

    // 7. Calendar Bottom Footer
    const calFooterY = canvasHeight - padding - 35;
    ctx.save();
    ctx.strokeStyle = `${textColor}26`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, calFooterY);
    ctx.lineTo(canvasWidth - padding, calFooterY);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('🗓️ SNAPBOOTH MEMORIES CALENDAR', padding, calFooterY + 24);

    ctx.textAlign = 'center';
    ctx.font = `12px ${sansFont}`;
    ctx.fillStyle = `${textColor}A6`;
    ctx.fillText('Dicetak Khusus • Koleksi Foto Kalender Pribadi', canvasWidth / 2, calFooterY + 24);

    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${sansFont}`;
    ctx.fillStyle = accentColor;
    ctx.fillText(`TAHUN ${calInfo.year}`, canvasWidth - padding, calFooterY + 24);
    ctx.restore();
  } else if (layout === 'calendar_single') {
    const textColor = theme.textColor || '#1E293B';
    const accentColor = theme.accentColor || '#E11D48';
    ctx.fillStyle = textColor;
    const maxContentWidth = canvasWidth - padding * 2;
    const sansFont = '"Plus Jakarta Sans", system-ui, sans-serif';

    const calInfo = parseCalendarDateInfo(theme.eventDate);

    // 1. Top Spiral Binder Rings / Hanging Hole Accent
    ctx.save();
    const ringCount = 9;
    const ringSpacing = maxContentWidth / (ringCount - 1);
    for (let r = 0; r < ringCount; r++) {
      const ringX = padding + r * ringSpacing;
      const ringY = padding - 8;
      // Shadow / hole
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(ringX, ringY, 8, 0, Math.PI * 2);
      ctx.fill();
      // Metallic clip loop
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(ringX, ringY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    let curY = padding + 25;

    // 2. Top Logo if provided
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.55);
        const maxLogoHeight = Math.round(canvasWidth * 0.16);
        let logoW = logoImg.width;
        let logoH = logoImg.height;
        const scale = Math.min(maxLogoWidth / logoW, maxLogoHeight / logoH, 1);
        logoW *= scale;
        logoH *= scale;
        const logoX = canvasWidth / 2 - logoW / 2;
        ctx.drawImage(logoImg, logoX, curY, logoW, logoH);
        curY += logoH + 15;
      } catch (err) {
        console.warn('Unable to render theme logoUrl on calendar_single header:', err);
      }
    }

    // 3. Calendar Month & Year Big Display
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.font = `900 64px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${calInfo.monthName} ${calInfo.year}`, canvasWidth / 2, curY + 46);

    curY += 78;

    // Event Title & Subtitle
    const calTitle = (theme.eventTitle || 'OUR SPECIAL MEMORIES 2026').toUpperCase();
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, calTitle, canvasWidth / 2, curY, maxContentWidth, 25, sansFont, 'bold', 'center');
    curY += 28;

    const calSub = theme.eventSubtitle || 'Kenangan Manis Sepanjang Tahun • Simpan Setiap Detik Bahagia 🗓️';
    ctx.fillStyle = `${textColor}B3`;
    drawAutoFitText(ctx, calSub, canvasWidth / 2, curY, maxContentWidth, 16, sansFont, 'normal', 'center');
    curY += 22;

    // Subtle Header Divider Line
    ctx.strokeStyle = `${textColor}26`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, curY);
    ctx.lineTo(canvasWidth - padding, curY);
    ctx.stroke();
    ctx.restore();

    // The single photo is drawn at y = padding + 195 + topLogoExtra
    const photoW = canvasWidth - padding * 2;
    const photoH = Math.round(photoW * 0.72);
    const photoEndY = curY + 20 + photoH;

    // 4. Photo Caption & Date Tag under single photo
    let subPhotoY = photoEndY + 24;
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `italic 14px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('■ FOTO KENANGAN UTAMA • SNAPBOOTH EXCLUSIVE WALL EDITION', padding, subPhotoY);

    // Right date badge
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = accentColor;
    ctx.fillText(`★ EDISI ${calInfo.monthName} ${calInfo.year}`, canvasWidth - padding, subPhotoY);
    ctx.restore();

    subPhotoY += 22;

    // 5. Inspiring Quote Banner below photo
    let calGridSectionY = subPhotoY + 22;
    ctx.save();
    ctx.font = `italic 15px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `${textColor}CC`;
    ctx.fillText('“Setiap hari adalah berkah baru, nikmati dan simpan setiap detik manis bersama orang tersayang.”', canvasWidth / 2, calGridSectionY);
    ctx.restore();

    calGridSectionY += 24;

    // 6. Days of Week Header Bar (MIN, SEN, SEL, RAB, KAM, JUM, SAB)
    const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    const dayColW = maxContentWidth / 7;
    const daysBarH = 38;

    ctx.save();
    ctx.fillStyle = `${textColor}0D`;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(padding, calGridSectionY, maxContentWidth, daysBarH, 8);
    } else {
      ctx.rect(padding, calGridSectionY, maxContentWidth, daysBarH);
    }
    ctx.fill();

    ctx.font = `bold 15px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = 0; d < 7; d++) {
      const dayX = padding + d * dayColW + dayColW / 2;
      ctx.fillStyle = d === 0 ? '#EF4444' : textColor;
      ctx.fillText(dayNames[d], dayX, calGridSectionY + daysBarH / 2);
    }
    ctx.restore();

    // 7. Monthly Days Grid
    const gridStartY = calGridSectionY + daysBarH + 14;
    const totalSlots = calInfo.firstDayOfWeek + calInfo.daysInMonth;
    const totalRows = Math.ceil(totalSlots / 7);
    const rowHeight = Math.min(54, Math.round(280 / totalRows));

    ctx.save();
    for (let dayNum = 1; dayNum <= calInfo.daysInMonth; dayNum++) {
      const slotIndex = calInfo.firstDayOfWeek + dayNum - 1;
      const col = slotIndex % 7;
      const row = Math.floor(slotIndex / 7);
      const cellCenterX = padding + col * dayColW + dayColW / 2;
      const cellCenterY = gridStartY + row * rowHeight + rowHeight / 2;

      const isHighlight = dayNum === calInfo.day;
      const isSunday = col === 0;

      if (isHighlight) {
        // Highlight Badge (Circle/Pill)
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(cellCenterX, cellCenterY - 4, 18, 0, Math.PI * 2);
        ctx.fill();

        // White Day Number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 17px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY - 4);

        // Mini Label under highlight badge
        ctx.fillStyle = accentColor;
        ctx.font = `bold 9px ${sansFont}`;
        ctx.fillText('★ SPESIAL', cellCenterX, cellCenterY + 18);
      } else {
        ctx.fillStyle = isSunday ? '#EF4444' : textColor;
        ctx.font = `bold 16px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY);
      }
    }
    ctx.restore();

    // 8. Memo & Highlights Box (Wall Calendar Special Section)
    const memoBoxY = gridStartY + totalRows * rowHeight + 18;
    const memoBoxH = 95;
    ctx.save();
    ctx.fillStyle = `${textColor}08`;
    ctx.strokeStyle = `${textColor}20`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(padding, memoBoxY, maxContentWidth, memoBoxH, 10);
    } else {
      ctx.rect(padding, memoBoxY, maxContentWidth, memoBoxH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('📌 CATATAN & AGENDA BULAN INI (MEMO & HIGHLIGHTS):', padding + 16, memoBoxY + 24);

    ctx.font = `12px ${sansFont}`;
    ctx.fillStyle = `${textColor}CC`;
    const memoEvent = theme.eventTitle || 'Momen Bahagia & Kebersamaan';
    const memoDate = theme.eventDate || `${calInfo.day} ${calInfo.monthName} ${calInfo.year}`;
    ctx.fillText(`• ${memoEvent} — ${memoDate} (Acara Istimewa & Abadi)`, padding + 16, memoBoxY + 48);
    ctx.fillText('• Catatan: Abadikan setiap senyuman dan kehangatan bersama orang-orang tercinta di hari bahagia ini.', padding + 16, memoBoxY + 70);
    ctx.restore();

    // 9. Calendar Bottom Footer
    const calFooterY = canvasHeight - padding - 40;
    ctx.save();
    ctx.strokeStyle = `${textColor}26`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, calFooterY);
    ctx.lineTo(canvasWidth - padding, calFooterY);
    ctx.stroke();

    // Barcode on left
    drawSimulatedBarcode(ctx, padding, calFooterY + 12, 170, 26, textColor);

    ctx.fillStyle = textColor;
    ctx.font = `bold 13px ${sansFont}`;
    ctx.textAlign = 'right';
    ctx.fillText('🗓️ SNAPBOOTH EXCLUSIVE WALL CALENDAR • EDISI TAHUNAN', canvasWidth - padding, calFooterY + 22);

    ctx.textAlign = 'right';
    ctx.font = `11px ${sansFont}`;
    ctx.fillStyle = `${textColor}A6`;
    ctx.fillText(`Dicetak Khusus • Koleksi Foto Kalender Pribadi • TAHUN ${calInfo.year}`, canvasWidth - padding, calFooterY + 38);
    ctx.restore();
  } else {
    // Normal non-receipt layout rendering
    ctx.textAlign = 'center';

    // Render Brand Logo at the VERY TOP of the photostrip frame (above photo 1)
    if (theme.logoUrl) {
      try {
        const logoImg = await loadImage(theme.logoUrl);
        const maxLogoWidth = Math.round(canvasWidth * 0.65);
        const maxLogoHeight = Math.round(canvasWidth * 0.22);
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

    let headerY = canvasHeight - 240;
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
    ctx.fillText(theme.eventTitle || 'snapBoth Receipt', canvasWidth / 2, headerY);

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
  }

  ctx.restore();

  // Render Custom Frame Overlay PNG if uploaded (Hanya aktif untuk akun berbayar / bukan trial)
  if (theme.customFrameOverlayUrl && !options.isTrial) {
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

  // 6. Watermark & Badge Khusus Akun Masa Trial
  if (options.isTrial) {
    ctx.save();

    // Bottom Watermark Ribbon
    const bannerH = Math.max(48, Math.round(canvasWidth * 0.045));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, canvasHeight - bannerH, canvasWidth, bannerH);

    // Accent line above banner
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, canvasHeight - bannerH, canvasWidth, 3);

    ctx.fillStyle = '#FBBF24';
    ctx.font = `bold ${Math.round(bannerH * 0.42)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ SNAPBOTH RECEIPT • TRIAL VERSION (MASA UJI COBA)', canvasWidth / 2, canvasHeight - bannerH / 2 + 1);

    // Subtle diagonal background watermark in center
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `900 ${Math.round(canvasWidth * 0.055)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAPBOTH TRIAL MODE', 0, 0);
    ctx.restore();

    ctx.restore();
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
