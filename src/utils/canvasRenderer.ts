import { EventTheme, FilterType, ImageAdjustments, LayoutType, PhotoSlot, StickerItem } from '../types';
import QRCode from 'qrcode';

export type ThermalDitherAlgorithm = 'atkinson' | 'floyd_steinberg' | 'sketch' | 'ordered_bayer';

export interface RenderOptions {
  photos: PhotoSlot[];
  layout: LayoutType;
  theme: EventTheme;
  filter: FilterType;
  adjustments: ImageAdjustments;
  stickers: StickerItem[];
  includeQrCode?: boolean;
  qrUrl?: string;
  targetWidth?: number; // default 1080 for standard ultra-fast & sharp print quality
  isTrial?: boolean;
  clarityLevel?: number; // 0 = standard, 0.35 = balanced unsharp mask, 0.6 = extra sharp
  printBrightness?: number; // default 1.0, e.g. 1.08 for paper brightness compensation
  printContrast?: number; // default 1.0, e.g. 1.10 for micro-contrast
  thermalDither?: boolean; // Error diffusion dithering for thermal receipt printers
  thermalDitherMode?: ThermalDitherAlgorithm; // 'atkinson' (default, razor-sharp on thermal), 'floyd_steinberg', 'sketch', 'ordered_bayer'
  thermalDensity?: number; // default 1.0 (0.85 = terang, 1.0 = optimal, 1.25 = pekat)
  overrideTextColor?: string; // Optional direct text color override (e.g. '#000000' for jet black)
}

// Helper to determine if a hex color is perceptually dark
export function isColorDark(hex?: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// 1. Fast 3x3 Unsharp Mask Sharpening & Tone Tuning for Print Clarity
function applyToneAndClarity(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  clarityAmount: number,
  brightness: number,
  contrast: number
) {
  // A. Tone Adjustments (Calibrated Brightness & Contrast for paper absorption)
  if (brightness !== 1.0 || contrast !== 1.0) {
    const bOffset = (brightness - 1.0) * 128;
    const cFactor = contrast;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r = (r - 128) * cFactor + 128 + bOffset;
      g = (g - 128) * cFactor + 128 + bOffset;
      b = (b - 128) * cFactor + 128 + bOffset;

      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }

  // B. Fast 3x3 Unsharp Mask Convolution for razor-sharp facial details & contours
  if (clarityAmount > 0) {
    const copy = new Uint8ClampedArray(data);
    const weight = clarityAmount;
    const center = 1 + 4 * weight;
    const neg = -weight;

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const rowPrev = (y - 1) * width;
      const rowNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = (row + x) * 4;
        const top = (rowPrev + x) * 4;
        const bot = (rowNext + x) * 4;
        const left = (row + x - 1) * 4;
        const right = (row + x + 1) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            copy[idx + c] * center +
            (copy[top + c] + copy[bot + c] + copy[left + c] + copy[right + c]) * neg;
          data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
      }
    }
  }
}

// 2. Atkinson Error Diffusion Dithering (Gold standard for thermal receipt printers)
// Diffuses only 75% (6/8) of error across 6 neighboring pixels:
// (x+1, y), (x+2, y), (x-1, y+1), (x, y+1), (x+1, y+1), (x, y+2)
// This preserves pure white highlights (radiant skin), prevents dark blotches/smearing, and yields needle-sharp contours.
export function applyAtkinsonDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  density: number = 1.0,
  clarityAmount: number = 0.45
) {
  // Stage 1: High-Frequency Unsharp Mask for razor-sharp facial details (eyes, lips, smile, hair, jawline)
  if (clarityAmount > 0) {
    const copy = new Uint8ClampedArray(data);
    const weight = clarityAmount * 1.25;
    const center = 1 + 4 * weight;
    const neg = -weight;

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const rowPrev = (y - 1) * width;
      const rowNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = (row + x) * 4;
        const top = (rowPrev + x) * 4;
        const bot = (rowNext + x) * 4;
        const left = (row + x - 1) * 4;
        const right = (row + x + 1) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            copy[idx + c] * center +
            (copy[top + c] + copy[bot + c] + copy[left + c] + copy[right + c]) * neg;
          data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
      }
    }
  }

  // Stage 2: Perceptual Luminance with Deep Black Receipt Calibration ("Hitam Pekat")
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // ITU-R BT.601 perceptual luminance
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const norm = Math.max(0, Math.min(1, lum / 255));

    // Deep black receipt curve:
    // Authentic POS receipt print ("cetak struk biasa hasil hitam pekat") requires
    // solid deep black in hair, pupils, clothing, and shadow contours without unwanted white noise,
    // while keeping skin tones clear, bright, and radiant.
    let curved: number;
    if (density >= 1.15) {
      if (norm < 0.38) {
        // Deep shadow compression into pure solid black dots
        curved = Math.pow(norm / 0.38, 1.35) * (0.22 / density);
      } else {
        const t = (norm - 0.38) / 0.62;
        curved = (0.22 / density) + Math.pow(t, 0.95) * (1 - (0.22 / density));
      }
    } else {
      curved = Math.pow(norm, 0.88);
    }

    lum = curved * 255;
    // S-curve contrast boost calibrated for thermal receipt paper
    lum = (lum - 128) * (1.32 * Math.min(density, 1.6)) + 128;
    gray[j] = Math.max(0, Math.min(255, lum));
  }

  // Stage 3: Atkinson 6-neighbor Error Diffusion with Receipt Solid Black Cutoff
  const threshold = density >= 1.35 ? 134 : density >= 1.15 ? 128 : 124;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal > threshold ? 255 : 0;
      gray[idx] = newVal;

      // 1/8 to 6 neighbors (6/8 = 75% diffused, 25% discarded as noise gate)
      const err = (oldVal - newVal) * 0.125;

      if (x + 1 < width) gray[idx + 1] += err;
      if (x + 2 < width) gray[idx + 2] += err;
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[(y + 1) * width + (x - 1)] += err;
        gray[(y + 1) * width + x] += err;
        if (x + 1 < width) gray[(y + 1) * width + (x + 1)] += err;
      }
      if (y + 2 < height) {
        gray[(y + 2) * width + x] += err;
      }
    }
  }

  // Stage 4: Write back 1-bit crisp binary output (0 = Deep Black #000000, 255 = Clean White #FFFFFF)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const val = gray[j] > 128 ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
}

// 3. Floyd-Steinberg Error Diffusion Dithering (HD Smooth Halftone with Deep Black)
export function applyFloydSteinbergDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  density: number = 1.0,
  clarityAmount: number = 0.40
) {
  if (clarityAmount > 0) {
    const copy = new Uint8ClampedArray(data);
    const weight = clarityAmount;
    const center = 1 + 4 * weight;
    const neg = -weight;

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const rowPrev = (y - 1) * width;
      const rowNext = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const idx = (row + x) * 4;
        const top = (rowPrev + x) * 4;
        const bot = (rowNext + x) * 4;
        const left = (row + x - 1) * 4;
        const right = (row + x + 1) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            copy[idx + c] * center +
            (copy[top + c] + copy[bot + c] + copy[left + c] + copy[right + c]) * neg;
          data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
      }
    }
  }

  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const norm = Math.max(0, Math.min(1, lum / 255));
    let curved: number;
    if (density >= 1.15) {
      if (norm < 0.38) {
        curved = Math.pow(norm / 0.38, 1.35) * (0.22 / density);
      } else {
        const t = (norm - 0.38) / 0.62;
        curved = (0.22 / density) + Math.pow(t, 0.95) * (1 - (0.22 / density));
      }
    } else {
      curved = Math.pow(norm, 0.88);
    }
    lum = curved * 255;
    lum = (lum - 128) * (1.28 * Math.min(density, 1.6)) + 128;
    gray[j] = Math.max(0, Math.min(255, lum));
  }

  const threshold = density >= 1.35 ? 134 : density >= 1.15 ? 128 : 124;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal > threshold ? 255 : 0;
      gray[idx] = newVal;
      const err = oldVal - newVal;

      if (x + 1 < width) {
        gray[idx + 1] += err * (7 / 16);
      }
      if (y + 1 < height) {
        if (x - 1 >= 0) {
          gray[(y + 1) * width + (x - 1)] += err * (3 / 16);
        }
        gray[(y + 1) * width + x] += err * (5 / 16);
        if (x + 1 < width) {
          gray[(y + 1) * width + (x + 1)] += err * (1 / 16);
        }
      }
    }
  }

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const val = gray[j] > 128 ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
}

// 4. High-Contrast Sketch / Manga Ink Line Art for Thermal Printers
export function applyHighContrastSketch(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  density: number = 1.0
) {
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const threshold = density >= 1.2 ? 145 : (128 / density);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let isEdge = false;
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const gx =
          -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
          -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
          -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];
        const gy =
          -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
          gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];
        if (Math.hypot(gx, gy) > (density >= 1.2 ? 48 : 65)) isEdge = true;
      }

      let val = 255;
      if (isEdge || gray[idx] < threshold * (density >= 1.2 ? 0.85 : 0.65)) {
        val = 0;
      } else if (gray[idx] < threshold * 1.05) {
        val = (x + y) % 2 === 0 ? 0 : 255;
      }

      const pIdx = idx * 4;
      data[pIdx] = val;
      data[pIdx + 1] = val;
      data[pIdx + 2] = val;
      data[pIdx + 3] = 255;
    }
  }
}

// 5. Classic 8x8 Bayer Ordered Dithering (Retro Dot Matrix with Deep Black)
export function applyOrderedBayerDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  density: number = 1.0
) {
  const bayer8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const norm = Math.max(0, Math.min(1, lum / 255));
      let curved: number;
      if (density >= 1.15) {
        if (norm < 0.38) {
          curved = Math.pow(norm / 0.38, 1.35) * (0.22 / density);
        } else {
          const t = (norm - 0.38) / 0.62;
          curved = (0.22 / density) + Math.pow(t, 0.95) * (1 - (0.22 / density));
        }
      } else {
        curved = Math.pow(norm, 0.88);
      }
      lum = curved * 255;
      lum = (lum - 128) * (1.25 * Math.min(density, 1.6)) + 128;

      const threshold = (bayer8[y % 8][x % 8] / 64) * 255;
      const val = lum > threshold ? 255 : 0;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
}

// 6. Enhance photo bitmap before drawing to canvas (for standard color prints)
function enhancePhotoForPrint(
  sourceImg: HTMLImageElement,
  clarityAmount: number = 0.35,
  brightness: number = 1.0,
  contrast: number = 1.0
): CanvasImageSource {
  if (clarityAmount <= 0 && brightness === 1.0 && contrast === 1.0) {
    return sourceImg;
  }

  const w = sourceImg.naturalWidth || sourceImg.width || 1280;
  const h = sourceImg.naturalHeight || sourceImg.height || 960;
  if (w <= 0 || h <= 0) return sourceImg;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return sourceImg;

  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = 'high';
  offCtx.drawImage(sourceImg, 0, 0, w, h);

  try {
    const imgData = offCtx.getImageData(0, 0, w, h);
    applyToneAndClarity(imgData.data, w, h, clarityAmount, brightness, contrast);
    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
  } catch (err) {
    console.warn('enhancePhotoForPrint fallback to raw image:', err);
    return sourceImg;
  }
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
  while (ctx.measureText(text).width > maxWidth && fontSize > 12) {
    fontSize -= 0.5;
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

// Helper to draw rounded rectangle paths safely
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Helper to draw clean vector heart icon
function drawHeartVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  fill: boolean = true
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 30;
  ctx.beginPath();
  ctx.moveTo(0, 4 * s);
  ctx.bezierCurveTo(0, -6 * s, -15 * s, -14 * s, -15 * s, 0);
  ctx.bezierCurveTo(-15 * s, 10 * s, 0, 18 * s, 0, 22 * s);
  ctx.bezierCurveTo(0, 18 * s, 15 * s, 10 * s, 15 * s, 0);
  ctx.bezierCurveTo(15 * s, -14 * s, 0, -6 * s, 0, 4 * s);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * s;
    ctx.stroke();
  }
  ctx.restore();
}

// Helper to draw speech / comment bubble vector
function drawCommentVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -2 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-6 * s, 6 * s);
  ctx.lineTo(-12 * s, 14 * s);
  ctx.lineTo(-1 * s, 9 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#000000';
  for (let d = -1; d <= 1; d++) {
    ctx.beginPath();
    ctx.arc(d * 5 * s, -2 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Helper to draw bookmark ribbon vector
function drawBookmarkVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10 * s, -14 * s);
  ctx.lineTo(10 * s, -14 * s);
  ctx.lineTo(10 * s, 14 * s);
  ctx.lineTo(0, 6 * s);
  ctx.lineTo(-10 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw paper airplane / share vector
function drawShareVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14 * s, -14 * s);
  ctx.lineTo(-14 * s, -2 * s);
  ctx.lineTo(-3 * s, 3 * s);
  ctx.lineTo(14 * s, -14 * s);
  ctx.lineTo(-2 * s, 14 * s);
  ctx.lineTo(-3 * s, 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw signature Instagram story gradient ring
function drawInstagramGradientRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  lineWidth: number
) {
  ctx.save();
  const grad = ctx.createLinearGradient(cx - radius, cy + radius, cx + radius, cy - radius);
  grad.addColorStop(0, '#feda75');
  grad.addColorStop(0.25, '#fa7e1e');
  grad.addColorStop(0.5, '#d62976');
  grad.addColorStop(0.75, '#962fbf');
  grad.addColorStop(1, '#4f5bd5');
  ctx.strokeStyle = grad;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw cyan/blue verified checkmark badge
function drawVerifiedBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  bgColor: string = '#20D5EC'
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = radius * 0.35;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.45, cy);
  ctx.lineTo(cx - radius * 0.1, cy + radius * 0.38);
  ctx.lineTo(cx + radius * 0.45, cy - radius * 0.35);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw double music note vector
function drawMusicNoteVector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-5 * s, 6 * s, 4 * s, 3 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(6 * s, 3 * s, 4 * s, 3 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(-2 * s, -8 * s, 2 * s, 14 * s);
  ctx.fillRect(9 * s, -11 * s, 2 * s, 14 * s);
  ctx.beginPath();
  ctx.moveTo(-2 * s, -8 * s);
  ctx.lineTo(11 * s, -11 * s);
  ctx.lineTo(11 * s, -7 * s);
  ctx.lineTo(-2 * s, -4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw crisp, professional logo or monogram avatar with clean high-contrast presentation
async function drawCrispLogoAvatar(
  ctx: CanvasRenderingContext2D,
  logoUrl: string | undefined,
  fallbackInitial: string,
  cx: number,
  cy: number,
  radius: number,
  bgColor: string = '#FFFFFF'
) {
  ctx.save();
  // Outer circle with soft drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Inner clip
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
  ctx.clip();

  if (logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      const innerW = (radius - 2) * 2;
      const innerH = (radius - 2) * 2;
      const scale = Math.min(innerW / logoImg.width, innerH / logoImg.height);
      const drawW = logoImg.width * scale;
      const drawH = logoImg.height * scale;
      const drawX = cx - drawW / 2;
      const drawY = cy - drawH / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
    } catch {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(radius * 0.9)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackInitial.toUpperCase(), cx, cy);
    }
  } else {
    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, '#6366F1');
    grad.addColorStop(0.5, '#EC4899');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(radius * 0.9)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackInitial.toUpperCase(), cx, cy);
  }
  ctx.restore();

  // Fine edge hairline
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw TikTok chromatic aberration ring (signature 3D cyan/red ring)
function drawTikTokGlitchRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  // Cyan layer
  ctx.strokeStyle = '#25F4EE';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 1, radius + 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // Red layer
  ctx.strokeStyle = '#FE2C55';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 1, radius + 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // White base ring
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
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
    targetWidth = 1080,
    clarityLevel = 0,
    printBrightness = 1.0,
    printContrast = 1.0,
    thermalDither = false,
    thermalDitherMode = 'atkinson',
    thermalDensity = 1.0,
    overrideTextColor,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Calculate Canvas Dimensions based on standard 1200 base width
  const baseWidth = 1200;
  const topLogoHeight = theme.logoUrl ? Math.round(baseWidth * 0.24) : 0;

  let canvasWidth = baseWidth;
  let canvasHeight = 3600; // default strip height
  let photoWidth = 1000;
  let photoHeight = 750; // 4:3 ratio
  let padding = 80;
  let gap = 40;
  let photoCount = 4;

  if (layout === 'strip4') {
    photoCount = 4;
    canvasWidth = baseWidth; // 1200
    padding = 70;
    gap = 35;
    photoWidth = canvasWidth - padding * 2; // 1060
    photoHeight = Math.round(photoWidth * 0.75); // 795
    const headerHeight = 450;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + (photoCount - 1) * gap + headerHeight;
  } else if (layout === 'korean_receipt' || layout === 'shopping_receipt') {
    photoCount = 4;
    canvasWidth = baseWidth; // 1200
    padding = Math.round(canvasWidth * 0.06); // 72px
    gap = Math.round(canvasWidth * 0.035); // 42px
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.7); // 4:3 receipt photo ratio
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
    const headerHeight = Math.round(canvasWidth * 0.62) + topReceiptLogoExtra;
    const footerHeight = Math.round(canvasWidth * 0.58);
    canvasHeight = headerHeight + photoCount * photoHeight + (photoCount - 1) * gap + footerHeight;
  } else if (layout === 'magazine') {
    photoCount = 1;
    canvasWidth = baseWidth; // 1200
    padding = 70;
    photoWidth = canvasWidth - padding * 2; // 1060
    photoHeight = Math.round(photoWidth * 0.95); // 1007px
    const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.24) : 0;
    const magazineHeaderHeight = 360 + topLogoExtra;
    const magazineFooterHeight = 360;
    canvasHeight = padding + magazineHeaderHeight + photoHeight + magazineFooterHeight + padding;
  } else if (layout === 'calendar') {
    photoCount = 4;
    canvasWidth = baseWidth; // 1200
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
    canvasWidth = baseWidth; // 1200
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
    canvasWidth = baseWidth;
    padding = 80;
    gap = 40;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.75);
    const headerHeight = 500;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + (photoCount - 1) * gap + headerHeight;
  } else if (layout === 'grid2x2') {
    photoCount = 4;
    canvasWidth = baseWidth;
    padding = 70;
    gap = 35;
    photoWidth = Math.round((canvasWidth - padding * 2 - gap) / 2);
    photoHeight = Math.round(photoWidth * 0.85);
    const headerHeight = 400;
    canvasHeight = padding * 2 + topLogoHeight + photoHeight * 2 + gap + headerHeight;
  } else if (layout === 'polaroid') {
    photoCount = 1;
    canvasWidth = baseWidth;
    padding = 90;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = photoWidth; // square
    const polaroidBottomMargin = 450;
    canvasHeight = padding + topLogoHeight + photoHeight + polaroidBottomMargin;
  } else if (layout === 'photocard') {
    photoCount = 2;
    canvasWidth = baseWidth;
    padding = 80;
    gap = 40;
    photoWidth = canvasWidth - padding * 2;
    photoHeight = Math.round(photoWidth * 0.7);
    const headerHeight = 450;
    canvasHeight = padding * 2 + topLogoHeight + photoCount * photoHeight + gap + headerHeight;
  } else if (layout === 'instagram_story') {
    photoCount = 1;
    canvasWidth = baseWidth; // 1200
    canvasHeight = Math.round(canvasWidth * (16 / 9)); // 2133px (9:16 vertical story)
    padding = 44;
    gap = 0;
  } else if (layout === 'tiktok_viral') {
    photoCount = 1;
    canvasWidth = baseWidth; // 1200
    canvasHeight = Math.round(canvasWidth * (16 / 9)); // 2133px (9:16 vertical reels/tiktok)
    padding = 40;
    gap = 0;
  } else if (layout === 'instagram_post') {
    photoCount = 1;
    canvasWidth = baseWidth; // 1200
    canvasHeight = Math.round(canvasWidth * (5 / 4)); // 1500px (4:5 portrait post)
    padding = 44;
    gap = 0;
  }

  // Scale canvas resolution to targetWidth (e.g. 1800 or 2400 for 300+ DPI print)
  const scale = targetWidth / baseWidth;
  canvas.width = Math.round(canvasWidth * scale);
  canvas.height = Math.round(canvasHeight * scale);

  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background Frame Color & Custom Background Image
  // For thermal receipt printing, always pure clean white (#FFFFFF) background to prevent muddy paper graying
  const actualFrameColor = thermalDither
    ? '#FFFFFF'
    : (theme.frameColor && (layout === 'tiktok_viral' || layout === 'instagram_story' || (theme.frameColor !== '#171513' && theme.frameColor !== '#121215' && theme.frameColor !== '#0a0a0d'))
      ? theme.frameColor
      : (layout === 'tiktok_viral' ? '#0B0B0E' : (layout === 'instagram_story' ? '#12131A' : '#FFFFFF')));
  ctx.fillStyle = actualFrameColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Determine Effective Text Color: Solid Jet Black (#000000) for thermal receipt & high contrast print
  const isFrameDark = isColorDark(actualFrameColor);
  let effectiveTextColor = thermalDither
    ? '#000000'
    : (overrideTextColor || (isFrameDark ? '#FFFFFF' : '#000000'));
  if (!thermalDither && overrideTextColor) {
    effectiveTextColor = overrideTextColor;
  } else if (!thermalDither && !isFrameDark) {
    effectiveTextColor = '#000000';
  }

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
        color: { dark: effectiveTextColor, light: '#FFFFFF00' },
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
      const headerHeight = Math.round(canvasWidth * 0.62) + topReceiptLogoExtra;
      y = headerHeight + i * (photoHeight + gap);
    } else if (layout === 'magazine') {
      x = padding;
      const topLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.24) : 0;
      const magazineHeaderHeight = 360 + topLogoExtra;
      y = padding + magazineHeaderHeight;
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
    } else if (layout === 'instagram_story') {
      const topStoryBar = 175;
      const bottomStoryBar = 170;
      slotW = canvasWidth - padding * 2;
      slotH = canvasHeight - topStoryBar - bottomStoryBar;
      x = padding;
      y = topStoryBar;
    } else if (layout === 'tiktok_viral') {
      const ttTopH = 125;
      const ttBottomH = 310;
      slotW = canvasWidth - padding * 2;
      slotH = canvasHeight - ttTopH - ttBottomH;
      x = padding;
      y = ttTopH;
    } else if (layout === 'instagram_post') {
      const postHeaderH = 140;
      slotW = canvasWidth - padding * 2;
      slotH = 840;
      x = padding;
      y = postHeaderH;
    }

    // Photo slot background box / placeholder
    ctx.fillStyle = '#E2E8F0';
    if (layout === 'instagram_story') {
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 24);
      ctx.fill();
    } else if (layout === 'tiktok_viral') {
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 26);
      ctx.fill();
    } else if (layout === 'instagram_post') {
      drawRoundedRectPath(ctx, x, y, slotW, slotH, 14);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, slotW, slotH);
    }

    if (slotPhoto && slotPhoto.dataUrl) {
      try {
        const rawImg = await loadImage(slotPhoto.dataUrl);

        ctx.save();

        // Clip photo area
        if (layout === 'instagram_story') {
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 24);
        } else if (layout === 'tiktok_viral') {
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 26);
        } else if (layout === 'instagram_post') {
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 14);
        } else {
          ctx.beginPath();
          ctx.rect(x, y, slotW, slotH);
        }
        ctx.clip();

        if (thermalDither) {
          // --- DEDICATED 1-BIT THERMAL PIPELINE AT EXACT TARGET CANVAS RESOLUTION ---
          // Determine exact physical pixel dimensions on the output canvas
          const targetSlotW = Math.max(1, Math.round(slotW * scale));
          const targetSlotH = Math.max(1, Math.round(slotH * scale));

          const slotCanvas = document.createElement('canvas');
          slotCanvas.width = targetSlotW;
          slotCanvas.height = targetSlotH;
          const slotCtx = slotCanvas.getContext('2d', { willReadFrequently: true });

          if (slotCtx) {
            slotCtx.imageSmoothingEnabled = true;
            slotCtx.imageSmoothingQuality = 'high';

            // 1. Apply photo filters & adjustments onto offscreen context
            applyCanvasFilter(slotCtx, filter, adjustments);

            // 2. Draw raw image cropped (object-fit cover) cleanly to target resolution
            const imgW = rawImg.naturalWidth || rawImg.width || 1280;
            const imgH = rawImg.naturalHeight || rawImg.height || 960;
            const imgRatio = imgW / imgH;
            const sRatio = targetSlotW / targetSlotH;
            let dw = targetSlotW;
            let dh = targetSlotH;
            let dx = 0;
            let dy = 0;

            if (imgRatio > sRatio) {
              dw = targetSlotH * imgRatio;
              dx = (targetSlotW - dw) / 2;
            } else {
              dh = targetSlotW / imgRatio;
              dy = (targetSlotH - dh) / 2;
            }

            slotCtx.drawImage(rawImg, dx, dy, dw, dh);

            // 3. Extract exact pixel buffer and execute 1-bit thermal dithering
            const imgData = slotCtx.getImageData(0, 0, targetSlotW, targetSlotH);
            if (thermalDitherMode === 'sketch') {
              applyHighContrastSketch(imgData.data, targetSlotW, targetSlotH, thermalDensity);
            } else if (thermalDitherMode === 'floyd_steinberg') {
              applyFloydSteinbergDither(imgData.data, targetSlotW, targetSlotH, thermalDensity, clarityLevel);
            } else if (thermalDitherMode === 'ordered_bayer') {
              applyOrderedBayerDither(imgData.data, targetSlotW, targetSlotH, thermalDensity);
            } else {
              // Default Atkinson: Gold standard for razor-sharp receipt prints with clean whites & dark contours
              applyAtkinsonDither(imgData.data, targetSlotW, targetSlotH, thermalDensity, clarityLevel);
            }

            slotCtx.putImageData(imgData, 0, 0);

            // 4. Render 1-bit dithered slot directly onto canvas with smoothing disabled to preserve needle-sharp dots!
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(slotCanvas, x, y, slotW, slotH);
            ctx.imageSmoothingEnabled = true;
          }
        } else {
          // --- STANDARD COLOR PIPELINE (Dye-Sub Lab & Inkjet Photo Printers) ---
          const renderSource = enhancePhotoForPrint(
            rawImg,
            clarityLevel,
            printBrightness,
            printContrast
          );

          // Apply Photo Filters & Color Adjustments
          applyCanvasFilter(ctx, filter, adjustments);

          // Draw image cropped cleanly (object-fit cover)
          const sourceW =
            (renderSource as HTMLCanvasElement).width ||
            (renderSource as HTMLImageElement).naturalWidth ||
            (renderSource as HTMLImageElement).width ||
            1280;
          const sourceH =
            (renderSource as HTMLCanvasElement).height ||
            (renderSource as HTMLImageElement).naturalHeight ||
            (renderSource as HTMLImageElement).height ||
            960;
          const imgRatio = sourceW / sourceH;
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

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(renderSource, drawX, drawY, drawW, drawH);
        }

        ctx.restore();

        // Decorative borders on photo if requested by layout
        if (layout === 'calendar' || layout === 'calendar_single') {
          ctx.save();
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, slotW, slotH);
          ctx.restore();
        } else if (layout === 'instagram_story') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 2;
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 24);
          ctx.stroke();
          ctx.restore();
        } else if (layout === 'tiktok_viral') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 2;
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 26);
          ctx.stroke();
          ctx.restore();
        } else if (layout === 'instagram_post') {
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.lineWidth = 1.5;
          drawRoundedRectPath(ctx, x, y, slotW, slotH, 14);
          ctx.stroke();
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
    }
  }

  // 4. Render Event Header & Footer Typography
  ctx.save();
  ctx.fillStyle = effectiveTextColor;

  if (layout === 'korean_receipt') {
    // Top and Bottom Serrated / Paper Tear Edges
    drawSerratedPaperEdge(ctx, canvasWidth, 0, true, thermalDither);
    drawSerratedPaperEdge(ctx, canvasWidth, canvasHeight, false, thermalDither);

    const isCfd =
      theme.id === 'car_free_day_receipt' ||
      (theme.eventTitle && (theme.eventTitle.toUpperCase().includes('CFD') || theme.eventTitle.toUpperCase().includes('CAR FREE DAY')));

    const monoFont = '"Space Mono", "Consolas", "SF Mono", "Menlo", "Courier New", monospace';
    const textColor = effectiveTextColor;
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
        curY += logoH + Math.round(canvasWidth * 0.035);
      } catch (err) {
        console.warn('Unable to render theme logoUrl on receipt header:', err);
      }
    }

    const badgeFontSize = Math.max(16, Math.round(canvasWidth * 0.042));
    drawAutoFitText(ctx, isCfd ? '★ CAR FREE DAY / RECEIPT PHOTO ★' : '★ LIFE 4-CUTS / 영수증 ★', canvasWidth / 2, curY, maxContentWidth, badgeFontSize, monoFont, 'bold');
    curY += Math.max(22, Math.round(canvasWidth * 0.05));

    const titleText = (theme.eventTitle || (isCfd ? 'JAKARTA CAR FREE DAY' : 'KR RECEIPT PHOTOBOOTH')).toUpperCase();
    const titleFontSize = Math.max(20, Math.round(canvasWidth * 0.046));
    drawAutoFitText(ctx, titleText, canvasWidth / 2, curY, maxContentWidth, titleFontSize, monoFont, 'bold');
    curY += Math.max(20, Math.round(canvasWidth * 0.042));

    if (theme.eventSubtitle) {
      const subFontSize = Math.max(14, Math.round(canvasWidth * 0.032));
      drawAutoFitText(ctx, theme.eventSubtitle.toUpperCase(), canvasWidth / 2, curY, maxContentWidth, subFontSize, monoFont, 'bold');
      curY += Math.max(18, Math.round(canvasWidth * 0.038));
    }

    // Receipt Dashed Separator
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);
    curY += Math.max(18, Math.round(canvasWidth * 0.04));

    // Order Info Table Left/Right
    const bodyFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.textAlign = 'left';
    ctx.font = `bold ${bodyFontSize}px ${monoFont}`;
    ctx.fillText(`DATE : ${theme.eventDate || (isCfd ? 'MINGGU, 08 AGUSTUS 2026' : '2026.08.08')}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, rightX, curY);
    curY += Math.max(20, Math.round(canvasWidth * 0.04));

    ctx.textAlign = 'left';
    ctx.fillText(`ORDER: #${isCfd ? 'CFD' : 'KR'}-88${Math.floor(Math.random() * 8999 + 1000)}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText('REG: #01 [PAID]', rightX, curY);
    curY += Math.max(22, Math.round(canvasWidth * 0.044));

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);
    curY += Math.max(20, Math.round(canvasWidth * 0.042));

    ctx.textAlign = 'left';
    const colHeaderFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.font = `bold ${colHeaderFontSize}px ${monoFont}`;
    ctx.fillText('QTY  ITEM DESCRIPTION                    PRICE', leftX, curY);
    curY += Math.max(20, Math.round(canvasWidth * 0.04));
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);

    // Render Bottom Receipt Footer (Below the 4 photos)
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
    const headerHeight = Math.round(canvasWidth * 0.62) + topReceiptLogoExtra;
    const photoCountLocal = 4;
    const gapLocal = Math.round(canvasWidth * 0.035);
    const photoHeightLocal = Math.round((canvasWidth - padding * 2) * 0.7);
    let footerY = headerHeight + photoCountLocal * photoHeightLocal + (photoCountLocal - 1) * gapLocal + Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    const footerBodyFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.font = `bold ${footerBodyFontSize}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('SUBTOTAL', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0' : '₩0', rightX, footerY);
    footerY += Math.max(18, Math.round(canvasWidth * 0.038));

    ctx.textAlign = 'left';
    ctx.fillText(isCfd ? 'PPN (0%)' : 'VAT (0%)', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0' : '₩0', rightX, footerY);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(22, Math.round(canvasWidth * 0.044));

    const totalFontSize = Math.max(18, Math.round(canvasWidth * 0.044));
    ctx.font = `bold ${totalFontSize}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(isCfd ? 'TOTAL BAYAR' : 'TOTAL AMOUNT', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(isCfd ? 'RP 0 (GRATIS)' : '₩0 (FREE)', rightX, footerY);
    footerY += Math.max(24, Math.round(canvasWidth * 0.048));

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(22, Math.round(canvasWidth * 0.044));

    const thankYouFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    drawAutoFitText(ctx, isCfd ? '★ TERIMA KASIH • NIKMATI CFD SEHAT ★' : '★ THANK YOU FOR MAKING MEMORIES ★', canvasWidth / 2, footerY, maxContentWidth, thankYouFontSize, monoFont, 'bold');
    footerY += Math.max(20, Math.round(canvasWidth * 0.04));

    const noteFontSize = Math.max(13, Math.round(canvasWidth * 0.03));
    drawAutoFitText(ctx, isCfd ? 'Nikmati Udara Segar & Bebas Polusi 🏃🚲' : '감사합니다! 좋은 Hari 되세요 ✨', canvasWidth / 2, footerY, maxContentWidth, noteFontSize, monoFont, 'bold');
  } else if (layout === 'shopping_receipt') {
    // Top and Bottom Serrated / Paper Tear Edges
    drawSerratedPaperEdge(ctx, canvasWidth, 0, true, thermalDither);
    drawSerratedPaperEdge(ctx, canvasWidth, canvasHeight, false, thermalDither);

    const monoFont = '"Space Mono", "Consolas", "SF Mono", "Menlo", "Courier New", monospace';
    const textColor = effectiveTextColor;
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
        curY += logoH + Math.round(canvasWidth * 0.035);
      } catch (err) {
        console.warn('Unable to render theme logoUrl on receipt header:', err);
      }
    }

    const badgeFontSize = Math.max(16, Math.round(canvasWidth * 0.042));
    drawAutoFitText(ctx, '★ STRUK PEMBELIAN & KASIR ★', canvasWidth / 2, curY, maxContentWidth, badgeFontSize, monoFont, 'bold');
    curY += Math.max(22, Math.round(canvasWidth * 0.05));

    const titleText = (theme.eventTitle || 'HAPPY MART SUPERMARKET').toUpperCase();
    const titleFontSize = Math.max(20, Math.round(canvasWidth * 0.046));
    drawAutoFitText(ctx, titleText, canvasWidth / 2, curY, maxContentWidth, titleFontSize, monoFont, 'bold');
    curY += Math.max(20, Math.round(canvasWidth * 0.042));

    if (theme.eventSubtitle) {
      const subFontSize = Math.max(14, Math.round(canvasWidth * 0.032));
      drawAutoFitText(ctx, theme.eventSubtitle.toUpperCase(), canvasWidth / 2, curY, maxContentWidth, subFontSize, monoFont, 'bold');
      curY += Math.max(18, Math.round(canvasWidth * 0.038));
    }

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);
    curY += Math.max(18, Math.round(canvasWidth * 0.04));

    const bodyFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.textAlign = 'left';
    ctx.font = `bold ${bodyFontSize}px ${monoFont}`;
    ctx.fillText(`TGL: ${theme.eventDate || '08 AGUSTUS 2026'}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText(`JAM: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, rightX, curY);
    curY += Math.max(20, Math.round(canvasWidth * 0.04));

    ctx.textAlign = 'left';
    ctx.fillText(`INV: #MART-2026-${Math.floor(Math.random() * 8999 + 1000)}`, leftX, curY);
    ctx.textAlign = 'right';
    ctx.fillText('KASIR: #01 [LUNAS]', rightX, curY);
    curY += Math.max(22, Math.round(canvasWidth * 0.044));

    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);
    curY += Math.max(20, Math.round(canvasWidth * 0.042));

    ctx.textAlign = 'left';
    const colHeaderFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.font = `bold ${colHeaderFontSize}px ${monoFont}`;
    ctx.fillText('QTY  NAMA ITEM                          HARGA', leftX, curY);
    curY += Math.max(20, Math.round(canvasWidth * 0.04));
    drawReceiptDashedLine(ctx, leftX, rightX, curY, textColor, [12, 6], 3);

    // Render Bottom Receipt Footer (Below the 4 photos)
    const topReceiptLogoExtra = theme.logoUrl ? Math.round(canvasWidth * 0.26) : 0;
    const headerHeight = Math.round(canvasWidth * 0.62) + topReceiptLogoExtra;
    const photoCountLocal = 4;
    const gapLocal = Math.round(canvasWidth * 0.035);
    const photoHeightLocal = Math.round((canvasWidth - padding * 2) * 0.7);
    let footerY = headerHeight + photoCountLocal * photoHeightLocal + (photoCountLocal - 1) * gapLocal + Math.round(canvasWidth * 0.04);

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    const footerBodyFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    ctx.font = `bold ${footerBodyFontSize}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('1x  SESI FOTO PHOTOBOOTH', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.max(18, Math.round(canvasWidth * 0.038));

    ctx.textAlign = 'left';
    ctx.fillText('1x  CETAK FOTO HIGH-RES', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    ctx.font = `bold ${footerBodyFontSize}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('SUBTOTAL', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0', rightX, footerY);
    footerY += Math.max(18, Math.round(canvasWidth * 0.038));

    ctx.textAlign = 'left';
    ctx.fillText('DISKON MEMORY (100%)', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('-RP 0', rightX, footerY);
    footerY += Math.max(20, Math.round(canvasWidth * 0.042));

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(22, Math.round(canvasWidth * 0.044));

    const totalFontSize = Math.max(18, Math.round(canvasWidth * 0.044));
    ctx.font = `bold ${totalFontSize}px ${monoFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL BAYAR', leftX, footerY);
    ctx.textAlign = 'right';
    ctx.fillText('RP 0 (GRATIS)', rightX, footerY);
    footerY += Math.max(24, Math.round(canvasWidth * 0.048));

    drawReceiptDashedLine(ctx, leftX, rightX, footerY, textColor, [12, 6], 3);
    footerY += Math.max(22, Math.round(canvasWidth * 0.044));

    const thankYouFontSize = Math.max(15, Math.round(canvasWidth * 0.034));
    drawAutoFitText(ctx, '★ TERIMA KASIH ATAS KUNJUNGAN ANDA ★', canvasWidth / 2, footerY, maxContentWidth, thankYouFontSize, monoFont, 'bold');
    footerY += Math.max(20, Math.round(canvasWidth * 0.04));

    const noteFontSize = Math.max(13, Math.round(canvasWidth * 0.03));
    drawAutoFitText(ctx, 'Simpan Struk Ini Sebagai Kenangan Manis ✨', canvasWidth / 2, footerY, maxContentWidth, noteFontSize, monoFont, 'bold');
  } else if (layout === 'magazine') {
    const textColor = effectiveTextColor;
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
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, magSub, canvasWidth / 2, topY + 115, maxContentWidth, 26, titleFont, '600', 'center');

    if (theme.showDateBadge && theme.eventDate) {
      ctx.fillStyle = textColor;
      drawAutoFitText(ctx, theme.eventDate.toUpperCase(), canvasWidth / 2, topY + 150, maxContentWidth, 20, 'sans-serif', 'bold', 'center');
    }

    // Top Divider Line
    ctx.strokeStyle = textColor;
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
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, subText, padding, bottomY + 42, maxContentWidth * 0.65, 22, 'sans-serif', 'normal', 'left');

    const issueText = (theme.eventSubtitle || 'SPRING / SUMMER SPECIAL EDITORIAL • SNAPBOOTH').toUpperCase();
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, issueText, padding, bottomY + 75, maxContentWidth, 18, 'sans-serif', 'normal', 'left');
  } else if (layout === 'calendar') {
    const textColor = effectiveTextColor;
    const accentColor = theme.accentColor || effectiveTextColor;
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
    ctx.fillStyle = textColor;
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
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, calSub, canvasWidth / 2, curY, maxContentWidth, 16, sansFont, 'normal', 'center');
    curY += 22;

    // Subtle Header Divider Line
    ctx.strokeStyle = textColor;
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
    ctx.fillStyle = textColor;
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
      ctx.fillStyle = textColor;
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

      if (isHighlight) {
        // Highlight Badge (Circle/Pill)
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.arc(cellCenterX, cellCenterY - 4, 17, 0, Math.PI * 2);
        ctx.fill();

        // White Day Number inside black badge
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 16px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY - 4);

        // Mini Label under highlight badge
        ctx.fillStyle = textColor;
        ctx.font = `bold 9px ${sansFont}`;
        ctx.fillText('★ SPESIAL', cellCenterX, cellCenterY + 17);
      } else {
        ctx.fillStyle = textColor;
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
    ctx.strokeStyle = textColor;
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
    ctx.fillStyle = textColor;
    ctx.fillText('Dicetak Khusus • Koleksi Foto Kalender Pribadi', canvasWidth / 2, calFooterY + 24);

    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${sansFont}`;
    ctx.fillStyle = textColor;
    ctx.fillText(`TAHUN ${calInfo.year}`, canvasWidth - padding, calFooterY + 24);
    ctx.restore();
  } else if (layout === 'calendar_single') {
    const textColor = effectiveTextColor;
    const accentColor = theme.accentColor || effectiveTextColor;
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
    ctx.fillStyle = textColor;
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
    ctx.fillStyle = textColor;
    drawAutoFitText(ctx, calSub, canvasWidth / 2, curY, maxContentWidth, 16, sansFont, 'normal', 'center');
    curY += 22;

    // Subtle Header Divider Line
    ctx.strokeStyle = textColor;
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
    ctx.fillStyle = textColor;
    ctx.fillText(`★ EDISI ${calInfo.monthName} ${calInfo.year}`, canvasWidth - padding, subPhotoY);
    ctx.restore();

    subPhotoY += 22;

    // 5. Inspiring Quote Banner below photo
    let calGridSectionY = subPhotoY + 22;
    ctx.save();
    ctx.font = `italic 15px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
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
      ctx.fillStyle = textColor;
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

      if (isHighlight) {
        // Highlight Badge (Circle/Pill)
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.arc(cellCenterX, cellCenterY - 4, 18, 0, Math.PI * 2);
        ctx.fill();

        // White Day Number inside black badge
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 17px ${sansFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(dayNum), cellCenterX, cellCenterY - 4);

        // Mini Label under highlight badge
        ctx.fillStyle = textColor;
        ctx.font = `bold 9px ${sansFont}`;
        ctx.fillText('★ SPESIAL', cellCenterX, cellCenterY + 18);
      } else {
        ctx.fillStyle = textColor;
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
    ctx.fillStyle = textColor;
    const memoEvent = theme.eventTitle || 'Momen Bahagia & Kebersamaan';
    const memoDate = theme.eventDate || `${calInfo.day} ${calInfo.monthName} ${calInfo.year}`;
    ctx.fillText(`• ${memoEvent} — ${memoDate} (Acara Istimewa & Abadi)`, padding + 16, memoBoxY + 48);
    ctx.fillText('• Catatan: Abadikan setiap senyuman dan kehangatan bersama orang-orang tercinta di hari bahagia ini.', padding + 16, memoBoxY + 70);
    ctx.restore();

    // 9. Calendar Bottom Footer
    const calFooterY = canvasHeight - padding - 40;
    ctx.save();
    ctx.strokeStyle = textColor;
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
    ctx.fillStyle = textColor;
    ctx.fillText(`Dicetak Khusus • Koleksi Foto Kalender Pribadi • TAHUN ${calInfo.year}`, canvasWidth - padding, calFooterY + 38);
    ctx.restore();
  } else if (layout === 'instagram_story') {
    ctx.save();
    const sansFont = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    const isDarkBg = isColorDark(actualFrameColor);
    const textColor = isDarkBg ? '#FFFFFF' : '#0F172A';
    const subtextColor = isDarkBg ? '#94A3B8' : '#64748B';

    // 1. Top Story Segmented Progress Bar (3 segments, middle active)
    const barY = 22;
    const barH = 6;
    const barTotalW = canvasWidth - padding * 2;
    const segGap = 8;
    const segW = (barTotalW - segGap * 2) / 3;

    // Segment 1 (Completed)
    ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#1E293B';
    drawRoundedRectPath(ctx, padding, barY, segW, barH, 3);
    ctx.fill();

    // Segment 2 (In progress - 65% filled)
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.35)' : 'rgba(30, 41, 59, 0.25)';
    drawRoundedRectPath(ctx, padding + segW + segGap, barY, segW, barH, 3);
    ctx.fill();
    ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#1E293B';
    drawRoundedRectPath(ctx, padding + segW + segGap, barY, segW * 0.65, barH, 3);
    ctx.fill();

    // Segment 3 (Upcoming)
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.35)' : 'rgba(30, 41, 59, 0.25)';
    drawRoundedRectPath(ctx, padding + (segW + segGap) * 2, barY, segW, barH, 3);
    ctx.fill();

    // 2. Story Header (Extra-Large crisp Logo Avatar with IG Story Ring, Username, Time, Audio)
    const headerY = 36;
    const avatarR = 66; // 132px diameter - prominent, crystal clear logo
    const avatarCx = padding + avatarR + 6;
    const avatarCy = headerY + avatarR;

    // Signature colorful story ring
    drawInstagramGradientRing(ctx, avatarCx, avatarCy, avatarR + 8, 5.5);

    // High-resolution Logo Avatar
    await drawCrispLogoAvatar(ctx, theme.logoUrl, (theme.eventTitle || 'S').charAt(0), avatarCx, avatarCy, avatarR, '#FFFFFF');

    // Username & Verified badge
    const unameX = avatarCx + avatarR + 24;
    const rawUname = (theme.eventTitle || 'snapbooth.studio').toLowerCase().replace(/\s+/g, '.');
    const uname = rawUname.length > 20 ? rawUname.substring(0, 20) : rawUname;

    ctx.fillStyle = textColor;
    ctx.font = `bold 54px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(uname, unameX, avatarCy - 6);

    const unameMeasure = ctx.measureText(uname).width;
    drawVerifiedBadge(ctx, unameX + unameMeasure + 20, avatarCy - 20, 20, '#3897F0');

    // Time elapsed badge
    ctx.fillStyle = subtextColor;
    ctx.font = `bold 36px ${sansFont}`;
    ctx.fillText('• 12m', unameX + unameMeasure + 54, avatarCy - 6);

    // Audio / Subtitle row below username
    ctx.fillStyle = subtextColor;
    ctx.font = `bold 34px ${sansFont}`;
    drawMusicNoteVector(ctx, unameX + 14, avatarCy + 36, 28, subtextColor);
    const audioText = `♫ ${theme.eventSubtitle || theme.eventTitle || 'Original Audio'} • SnapBooth Official`;
    const maxAudioW = canvasWidth - padding - unameX - 190;
    drawAutoFitText(ctx, audioText, unameX + 42, avatarCy + 42, maxAudioW, 34, sansFont, '600', 'left');

    // Close 'X' and '···' on top right
    ctx.fillStyle = textColor;
    ctx.font = `bold 54px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('···', canvasWidth - padding - 85, avatarCy + 10);
    ctx.font = `bold 46px ${sansFont}`;
    ctx.fillText('✕', canvasWidth - padding - 22, avatarCy + 10);

    // 3. Floating Aesthetic Story Stickers
    // Sticker 1: Location Sticker Pill (Top-Left on photo)
    const locY = 205;
    const locText = theme.eventSubtitle || 'Jakarta, Indonesia';
    ctx.font = `bold 36px ${sansFont}`;
    const locW = ctx.measureText(locText).width + 96;
    const locH = 74;
    const locX = padding + 16;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRectPath(ctx, locX, locY, locW, locH, 37);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📍', locX + 22, locY + 48);
    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 36px ${sansFont}`;
    ctx.fillText(locText, locX + 66, locY + 48);
    ctx.restore();

    // Sticker 2: Date Pill (Top-Right on photo)
    const dateText = theme.eventDate || 'HARI INI';
    ctx.font = `bold 34px ${sansFont}`;
    const dateW = ctx.measureText(dateText).width + 88;
    const dateH = 74;
    const dateX = canvasWidth - padding - dateW - 16;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRectPath(ctx, dateX, locY, dateW, dateH, 37);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = `bold 34px ${sansFont}`;
    ctx.fillText(`🗓️ ${dateText}`, dateX + dateW / 2, locY + 48);
    ctx.restore();

    // Sticker 3: Official Brand Filter Tag on photo (if logoUrl exists)
    if (theme.logoUrl) {
      const brandY = canvasHeight - 280;
      const brandH = 80;
      const brandTitle = theme.eventTitle || 'SnapBooth';
      ctx.font = `bold 36px ${sansFont}`;
      const brandW = Math.min(ctx.measureText(brandTitle).width + 130, 560);
      const brandX = padding + 16;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      drawRoundedRectPath(ctx, brandX, brandY, brandW, brandH, 40);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      try {
        const thumbImg = await loadImage(theme.logoUrl);
        const tSize = 60;
        const tScale = Math.min(tSize / thumbImg.width, tSize / thumbImg.height);
        const tW = thumbImg.width * tScale;
        const tH = thumbImg.height * tScale;
        ctx.drawImage(thumbImg, brandX + 16 + (tSize - tW) / 2, brandY + (brandH - tH) / 2, tW, tH);
      } catch {
        ctx.fillStyle = '#F59E0B';
        ctx.font = '34px sans-serif';
        ctx.fillText('✨', brandX + 18, brandY + 50);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 36px ${sansFont}`;
      ctx.textAlign = 'left';
      drawAutoFitText(ctx, brandTitle, brandX + 86, brandY + 50, brandW - 105, 36, sansFont, 'bold', 'left');
      ctx.restore();
    }

    // 4. Bottom Reply Bar & Reactions
    const bottomBarY = canvasHeight - 144;
    const inputW = canvasWidth - padding * 2 - 220;
    const inputH = 90;
    const inputX = padding;

    // Input Pill with Camera Icon
    ctx.save();
    ctx.fillStyle = isDarkBg ? 'rgba(30, 41, 59, 0.94)' : '#F8FAFC';
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.3)' : '#CBD5E1';
    ctx.lineWidth = 2.5;
    drawRoundedRectPath(ctx, inputX, bottomBarY, inputW, inputH, 45);
    ctx.fill();
    ctx.stroke();

    // Camera icon
    ctx.fillStyle = subtextColor;
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📷', inputX + 28, bottomBarY + 56);

    // Placeholder text
    ctx.fillStyle = subtextColor;
    ctx.font = `bold 36px ${sansFont}`;
    ctx.fillText('Kirim pesan...', inputX + 84, bottomBarY + 56);

    // Share Paper Plane
    const shareCx = canvasWidth - padding - 145;
    const shareCy = bottomBarY + inputH / 2;
    drawShareVector(ctx, shareCx, shareCy, 48, textColor);

    // Heart Reaction
    const heartCx = canvasWidth - padding - 52;
    const heartCy = bottomBarY + inputH / 2;
    drawHeartVector(ctx, heartCx, heartCy, 52, '#EF4444', true);

    // Floating reaction bubble
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.font = '44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥', heartCx, bottomBarY - 22);
    ctx.restore();

    // Optional QR code sticker pill on bottom left if enabled
    if (qrImage) {
      const qrPillW = 200;
      const qrPillH = 72;
      const qrPillX = padding + (theme.logoUrl ? 540 : 16);
      const qrPillY = canvasHeight - 275;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRectPath(ctx, qrPillX, qrPillY, qrPillW, qrPillH, 36);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.drawImage(qrImage, qrPillX + 12, qrPillY + 9, 54, 54);
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold 20px ${sansFont}`;
      ctx.textAlign = 'left';
      ctx.fillText('SCAN FOTO', qrPillX + 74, qrPillY + 44);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  } else if (layout === 'tiktok_viral') {
    ctx.save();
    const sansFont = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

    // 1. Soft Gradient Scrims for 100% crystal-clear readability
    const scrimH = 560;
    const scrimGrad = ctx.createLinearGradient(0, canvasHeight - scrimH, 0, canvasHeight);
    scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrimGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.45)');
    scrimGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
    scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, canvasHeight - scrimH, canvasWidth, scrimH);

    const topScrimGrad = ctx.createLinearGradient(0, 0, 0, 160);
    topScrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    topScrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topScrimGrad;
    ctx.fillRect(0, 0, canvasWidth, 160);

    // 2. Top TikTok Navigation (LIVE, Following | For You, Search)
    const topBarY = 44;
    // LIVE TV Badge Pill
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRectPath(ctx, padding, topBarY, 96, 46, 23);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glowing red LIVE dot
    ctx.fillStyle = '#FE2C55';
    ctx.beginPath();
    ctx.arc(padding + 26, topBarY + 23, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 24px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE', padding + 42, topBarY + 23);
    ctx.restore();

    // Center Tabs: Mengikuti | Untuk Anda
    const centerTabsX = canvasWidth / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'right';
    ctx.font = `bold 38px ${sansFont}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('Mengikuti', centerTabsX - 25, topBarY + 32);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('|', centerTabsX, topBarY + 32);

    ctx.textAlign = 'left';
    ctx.font = `900 48px ${sansFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Untuk Anda', centerTabsX + 25, topBarY + 32);

    // Active red underline pill under "Untuk Anda"
    ctx.fillStyle = '#FE2C55';
    drawRoundedRectPath(ctx, centerTabsX + 34, topBarY + 50, 180, 7, 3.5);
    ctx.fill();
    ctx.restore();

    // Search Icon on right
    const searchX = canvasWidth - padding - 24;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(searchX - 12, topBarY + 22, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(searchX, topBarY + 34);
    ctx.lineTo(searchX + 13, topBarY + 47);
    ctx.stroke();
    ctx.restore();

    // 3. Right Floating Action Column
    const actionX = canvasWidth - padding - 54;

    // Creator Avatar with 3D Chromatic Glitch Ring & Follow '+' Badge (Enlarged 140px)
    const avY = 440;
    const avR = 70; // 140px diameter - extra prominent and bold!
    drawTikTokGlitchRing(ctx, actionX, avY, avR);
    await drawCrispLogoAvatar(ctx, theme.logoUrl, (theme.eventTitle || 'T').charAt(0), actionX, avY, avR, '#FFFFFF');

    // Follow '+' badge overlapping bottom of avatar
    ctx.save();
    ctx.fillStyle = '#FE2C55';
    ctx.beginPath();
    ctx.arc(actionX, avY + avR + 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 30px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', actionX, avY + avR + 2);
    ctx.restore();

    // Action 1: Like Heart (Bright Red with Soft Glow)
    const likeY = 600;
    ctx.save();
    ctx.shadowColor = 'rgba(254, 44, 85, 0.6)';
    ctx.shadowBlur = 16;
    drawHeartVector(ctx, actionX, likeY, 62, '#FE2C55', true);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 38px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('842.5K', actionX, likeY + 58);
    ctx.restore();

    // Action 2: Comment Bubble
    const commentY = 755;
    drawCommentVector(ctx, actionX, commentY, 58, '#FFFFFF');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 38px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('14.8K', actionX, commentY + 56);
    ctx.restore();

    // Action 3: Bookmark Ribbon (Golden Yellow)
    const bookmarkY = 905;
    drawBookmarkVector(ctx, actionX, bookmarkY, 56, '#FACD3D');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 38px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('98.2K', actionX, bookmarkY + 56);
    ctx.restore();

    // Action 4: Share Arrow
    const shareY = 1055;
    drawShareVector(ctx, actionX, shareY, 56, '#FFFFFF');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 38px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('35.4K', actionX, shareY + 56);
    ctx.restore();

    // Action 5: Realistic Rotating Vinyl Record Disc
    const vinylY = 1220;
    const vinylR = 48;
    ctx.save();
    ctx.fillStyle = '#111114';
    ctx.beginPath();
    ctx.arc(actionX, vinylY, vinylR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Grooves
    ctx.beginPath();
    ctx.arc(actionX, vinylY, vinylR * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(actionX, vinylY, vinylR * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Center vinyl label
    ctx.fillStyle = '#FE2C55';
    ctx.beginPath();
    ctx.arc(actionX, vinylY, vinylR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#25F4EE';
    ctx.beginPath();
    ctx.arc(actionX, vinylY, vinylR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Drifting musical notes
    drawMusicNoteVector(ctx, actionX - 34, vinylY - 58, 28, '#FFFFFF');
    drawMusicNoteVector(ctx, actionX - 64, vinylY - 104, 24, '#FFFFFF');
    ctx.restore();

    // 4. Bottom Left Overlay (Creator Handle, Caption, Hashtags, Audio Ticker)
    const captionX = padding + 18;
    let captionY = canvasHeight - 290;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;

    // Brand Sponsor Tag if logoUrl provided
    if (theme.logoUrl) {
      const spH = 50;
      const spW = 360;
      const spY = captionY - 72;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      drawRoundedRectPath(ctx, captionX, spY, spW, spH, 25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FACD3D';
      ctx.font = `bold 22px ${sansFont}`;
      ctx.textAlign = 'left';
      ctx.fillText('⚡ PARTNER RESMI', captionX + 20, spY + 34);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 24px ${sansFont}`;
      drawAutoFitText(ctx, `• ${theme.eventTitle || 'SnapBooth'}`, captionX + 210, spY + 34, 140, 24, sansFont, 'bold', 'left');
      ctx.restore();
    }

    // Username & Verified checkmark & Creator Pill
    const ttUsername = `@${theme.eventTitle ? theme.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '') : 'snapbooth.studio'}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 56px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ttUsername, captionX, captionY);
    const ttUnameW = ctx.measureText(ttUsername).width;
    drawVerifiedBadge(ctx, captionX + ttUnameW + 22, captionY - 18, 22, '#20D5EC');

    // Creator badge pill
    const badgeX = captionX + ttUnameW + 54;
    ctx.fillStyle = '#FE2C55';
    drawRoundedRectPath(ctx, badgeX, captionY - 40, 116, 40, 9);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 22px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('Kreator', badgeX + 58, captionY - 12);

    // Event title / caption
    captionY += 60;
    ctx.textAlign = 'left';
    ctx.font = `bold 44px ${sansFont}`;
    ctx.fillStyle = '#FFFFFF';
    const ttTitle = theme.eventTitle || 'SnapBooth Photo Moments';
    const ttSub = theme.eventSubtitle ? ` — ${theme.eventSubtitle}` : '';
    const fullCaption = `${ttTitle}${ttSub} ✨📸🔥`;
    drawAutoFitText(ctx, fullCaption, captionX, captionY, canvasWidth - padding * 2 - 200, 44, sansFont, 'bold', 'left');

    // Hashtags
    captionY += 52;
    ctx.font = `bold 36px ${sansFont}`;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('#fyp #viral #photobooth #trend2026 #aesthetic #foryou', captionX, captionY);

    // Sound Ticker Pill (Modern Frosted Marquee Pill)
    captionY += 46;
    const tickerH = 72;
    const tickerW = Math.min(canvasWidth - padding * 2 - 190, 620);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(ctx, captionX, captionY, tickerW, tickerH, 36);
    ctx.fill();
    ctx.stroke();

    // Sound Icon & Text
    drawMusicNoteVector(ctx, captionX + 32, captionY + tickerH / 2, 28, '#FFFFFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 32px ${sansFont}`;
    const soundText = `♫ Suara Asli - ${theme.eventTitle || 'SnapBooth Hits'} (Audio Resmi)`;
    drawAutoFitText(ctx, soundText, captionX + 60, captionY + 46, tickerW - 85, 32, sansFont, 'bold', 'left');
    ctx.restore();

    // Optional QR code badge on right bottom if enabled
    if (qrImage) {
      const qrSize = 106;
      const qrX = canvasWidth - padding - qrSize - 10;
      const qrY = canvasHeight - 150;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 12;
      drawRoundedRectPath(ctx, qrX, qrY, qrSize, qrSize, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.drawImage(qrImage, qrX + 7, qrY + 7, qrSize - 14, qrSize - 14);
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold 16px ${sansFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('SCAN HD', qrX + qrSize / 2, qrY + qrSize + 20);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  } else if (layout === 'instagram_post') {
    ctx.save();
    const sansFont = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    const isDarkBg = isColorDark(actualFrameColor);
    const textColor = isDarkBg ? '#FFFFFF' : '#0F172A';
    const subtextColor = isDarkBg ? '#94A3B8' : '#64748B';

    // 1. Top Post Header (Extra-Large Avatar, Gradient Story Ring, Username, Location, Menu)
    const headerY = 14;
    const avatarR = 64; // 128px diameter - large, crisp and bold
    const avatarCx = padding + avatarR + 4;
    const avatarCy = headerY + avatarR;

    // Instagram colorful story ring with crisp gap
    drawInstagramGradientRing(ctx, avatarCx, avatarCy, avatarR + 7, 5.0);

    // High-resolution Logo Avatar
    await drawCrispLogoAvatar(ctx, theme.logoUrl, (theme.eventTitle || 'S').charAt(0), avatarCx, avatarCy, avatarR, '#FFFFFF');

    // Username, Verified Badge, and Location Subtitle
    const postUnameX = avatarCx + avatarR + 24;
    const rawPostUname = (theme.eventTitle || 'snapbooth.studio').toLowerCase().replace(/\s+/g, '.');
    const displayUname = rawPostUname.length > 22 ? rawPostUname.substring(0, 22) : rawPostUname;

    ctx.fillStyle = textColor;
    ctx.font = `bold 50px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayUname, postUnameX, avatarCy - 6);

    const postUnameW = ctx.measureText(displayUname).width;
    drawVerifiedBadge(ctx, postUnameX + postUnameW + 20, avatarCy - 20, 20, '#3897F0');

    // Location & Event Subtitle
    ctx.fillStyle = subtextColor;
    ctx.font = `bold 34px ${sansFont}`;
    const locPost = theme.eventSubtitle || 'Jakarta, Indonesia';
    ctx.fillText(`📍 ${locPost}`, postUnameX, avatarCy + 32);

    // Right Action: Follow Button Pill + Options '···'
    const rightActionsX = canvasWidth - padding;
    ctx.save();
    // '···' options
    ctx.fillStyle = textColor;
    ctx.font = `bold 48px ${sansFont}`;
    ctx.textAlign = 'right';
    ctx.fillText('···', rightActionsX, avatarCy + 8);

    // 'Ikuti' follow pill
    const followW = 124;
    const followH = 52;
    const followX = rightActionsX - 82 - followW;
    const followY = avatarCy - 26;
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.18)' : '#EFF6FF';
    drawRoundedRectPath(ctx, followX, followY, followW, followH, 12);
    ctx.fill();
    ctx.fillStyle = '#2563EB';
    ctx.font = `bold 28px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('Ikuti', followX + followW / 2, followY + 36);
    ctx.restore();

    // 2. Photo Overlay Badges (Carousel 1/3 pill & Person tag icon)
    // Top-right carousel pill
    const carW = 84;
    const carH = 44;
    const carX = canvasWidth - padding - carW - 16;
    const carY = 140 + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    drawRoundedRectPath(ctx, carX, carY, carW, carH, 22);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 24px ${sansFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('1/3', carX + carW / 2, carY + 30);
    ctx.restore();

    // Bottom-left person tag icon on photo
    const tagY = 140 + 840 - 58;
    const tagX = padding + 18;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.arc(tagX + 22, tagY + 22, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👤', tagX + 22, tagY + 30);
    ctx.restore();

    // If Brand Logo is available, display an official watermark pill in photo corner
    if (theme.logoUrl) {
      const wmH = 48;
      const wmTitle = theme.eventTitle || 'SnapBooth';
      ctx.font = `bold 22px ${sansFont}`;
      const wmW = Math.min(ctx.measureText(wmTitle).width + 80, 320);
      const wmX = canvasWidth - padding - wmW - 16;
      const wmY = 140 + 840 - 60;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      drawRoundedRectPath(ctx, wmX, wmY, wmW, wmH, 24);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 22px ${sansFont}`;
      ctx.textAlign = 'center';
      ctx.fillText(`✨ ${wmTitle}`, wmX + wmW / 2, wmY + 32);
      ctx.restore();
    }

    // 3. Action Bar below Photo (Heart, Comment, Share, Carousel Dots, Bookmark)
    const actionY = 1024;
    // Filled Red Heart
    drawHeartVector(ctx, padding + 26, actionY, 48, '#ED4956', true);
    // Speech Bubble
    drawCommentVector(ctx, padding + 100, actionY, 46, textColor);
    // Paper Plane Share
    drawShareVector(ctx, padding + 174, actionY, 44, textColor);

    // Carousel dots in center
    const dotsCx = canvasWidth / 2;
    ctx.save();
    ctx.fillStyle = '#3897F0'; // Active dot
    ctx.beginPath();
    ctx.arc(dotsCx - 18, actionY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.arc(dotsCx, actionY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dotsCx + 18, actionY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bookmark on right
    drawBookmarkVector(ctx, canvasWidth - padding - 26, actionY, 46, textColor);

    // 4. Likes Counter Typography
    let textRowY = actionY + 54;
    ctx.fillStyle = textColor;
    ctx.font = `bold 42px ${sansFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('Disukai oleh kawan.kenangan dan 14.820 lainnya', padding, textRowY);

    // 5. Caption Typography (Much Clearer & Larger)
    textRowY += 52;
    ctx.font = `bold 40px ${sansFont}`;
    ctx.fillText(displayUname, padding, textRowY);
    const uLen = ctx.measureText(displayUname).width;

    ctx.font = `36px ${sansFont}`;
    ctx.fillStyle = textColor;
    const postCaption = `  ${theme.eventTitle || 'SnapBooth'} — ${theme.eventSubtitle || 'Momen manis yang terekam abadi selamanya.'} ✨📸`;
    const maxCaptionW = canvasWidth - padding * 2 - uLen - (qrImage ? 160 : 0);
    drawAutoFitText(ctx, postCaption, padding + uLen, textRowY, maxCaptionW, 36, sansFont, 'normal', 'left');

    // 6. Hashtags
    textRowY += 46;
    ctx.font = `bold 32px ${sansFont}`;
    ctx.fillStyle = '#2563EB';
    ctx.fillText('#photobooth #memories #estetik #instadaily #feedgoals #photooftheday', padding, textRowY);

    // 7. View Comments Link
    textRowY += 44;
    ctx.font = `bold 32px ${sansFont}`;
    ctx.fillStyle = subtextColor;
    ctx.fillText('Lihat semua 184 komentar', padding, textRowY);

    // 8. Date & Translation
    textRowY += 40;
    ctx.font = `bold 28px ${sansFont}`;
    ctx.fillStyle = subtextColor;
    const datePost = (theme.eventDate || '3 JAM YANG LALU').toUpperCase();
    ctx.fillText(`${datePost} • LIHAT TERJEMAHAN`, padding, textRowY);

    // Optional QR code stamp on bottom right if enabled
    if (qrImage) {
      const qrSize = 105;
      const qrX = canvasWidth - padding - qrSize;
      const qrY = textRowY - 70;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRectPath(ctx, qrX, qrY, qrSize, qrSize, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.drawImage(qrImage, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16);
      ctx.fillStyle = textColor;
      ctx.font = `bold 16px ${sansFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('SCAN FOTO', qrX + qrSize / 2, qrY + qrSize + 20);
      ctx.restore();
    }

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

    // Event Title (Solid pure black by default)
    ctx.fillStyle = effectiveTextColor;
    ctx.font = `bold 56px ${titleFontFamilyName}`;
    ctx.fillText(theme.eventTitle || 'SnapBooth Receipt', canvasWidth / 2, headerY);

    // Subtitle (Solid pure black by default)
    if (theme.eventSubtitle) {
      ctx.font = `32px ${dateFontFamilyName}`;
      ctx.fillStyle = effectiveTextColor;
      ctx.fillText(theme.eventSubtitle, canvasWidth / 2, headerY + 65);
    }

    // Date Badge or Event Date (Solid pure black by default)
    if (theme.showDateBadge && theme.eventDate) {
      ctx.font = `bold 28px ${dateFontFamilyName}`;
      ctx.fillStyle = effectiveTextColor;
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
    const bannerH = Math.max(48, Math.round(canvasWidth * 0.045));
    if (thermalDither) {
      // Crisp 1-bit thermal trial banner
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, canvasHeight - bannerH, canvasWidth, bannerH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(4, canvasHeight - bannerH + 2, canvasWidth - 8, bannerH - 4);
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(bannerH * 0.42)}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ SNAPBOOTH RECEIPT • TRIAL MODE (UJI COBA) ★', canvasWidth / 2, canvasHeight - bannerH / 2 + 1);
    } else {
      // Bottom Watermark Ribbon
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, canvasHeight - bannerH, canvasWidth, bannerH);

      // Accent line above banner
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, canvasHeight - bannerH, canvasWidth, 3);

      ctx.fillStyle = '#FBBF24';
      ctx.font = `bold ${Math.round(bannerH * 0.42)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ SNAPBOOTH RECEIPT • TRIAL VERSION (MASA UJI COBA)', canvasWidth / 2, canvasHeight - bannerH / 2 + 1);

      // Subtle diagonal background watermark in center
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.font = `900 ${Math.round(canvasWidth * 0.055)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SNAPBOOTH TRIAL MODE', 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // 7. Thermal 1-Bit Binary Monochromatic Optimization for Receipt Printing
  // When thermalDither is enabled, process entire canvas into 100% pure black (#000000)
  // and pure white (#FFFFFF). This strips all driver-induced halftoning and anti-aliasing
  // blur from text, barcodes, QR codes, borders, and serrated edges, delivering the exact
  // deep solid black ("hitam pekat") look of an authentic POS/kiosk receipt print.
  if (thermalDither) {
    const fullImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = fullImgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const val = lum < 210 ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
      d[i + 3] = 255;
    }
    ctx.putImageData(fullImgData, 0, 0);
  }

  return canvas;
}

// Helper to draw serrated/zigzag receipt paper edges
function drawSerratedPaperEdge(ctx: CanvasRenderingContext2D, width: number, y: number, isTop: boolean, isThermal: boolean = false) {
  ctx.save();
  const toothWidth = Math.max(16, Math.round(width / 36));
  const toothHeight = 16;

  if (isThermal) {
    // In thermal mode, use pure white background with a crisp black dashed cut-guide line to avoid faint gray speckled dots
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, isTop ? toothHeight : y - toothHeight);
    ctx.lineTo(width, isTop ? toothHeight : y - toothHeight);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#EAE6DF';
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
