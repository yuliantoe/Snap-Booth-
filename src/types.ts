export type LayoutType = 'strip4' | 'strip3' | 'grid2x2' | 'polaroid' | 'photocard' | 'korean_receipt';

export type FilterType = 
  | 'normal' 
  | 'vintage' 
  | 'bw' 
  | 'retro_y2k' 
  | 'soft_pastel' 
  | 'cyber_neon' 
  | 'sepia' 
  | 'golden_hour' 
  | 'cool_breeze' 
  | 'dramatic_noir';

export interface ImageAdjustments {
  brightness: number; // 0.5 to 1.5 (default 1)
  contrast: number;   // 0.5 to 1.5 (default 1)
  saturation: number; // 0 to 2 (default 1)
  sepia: number;      // 0 to 1 (default 0)
  blur: number;       // 0 to 10 (default 0)
}

export interface StickerItem {
  id: string;
  emojiOrUrl: string;
  isCustomUrl?: boolean;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number; // 0.5 to 3
  rotation: number; // -180 to 180 degrees
}

export interface EventTheme {
  id: string;
  name: string;
  category: 'wedding' | 'birthday' | 'party' | 'retro' | 'corporate' | 'minimal';
  frameColor: string; // hex
  textColor: string; // hex
  backgroundColor: string; // hex or CSS gradient
  bgPattern: 'solid' | 'dots' | 'grid' | 'hearts' | 'stars' | 'stripes' | 'sparkles';
  accentColor: string; // hex
  fontFamily: 'serif' | 'sans' | 'mono' | 'handwriting' | 'display';
  dateFontFamily?: 'serif' | 'sans' | 'mono' | 'handwriting' | 'display';
  eventTitle: string;
  topBrandText?: string;
  eventSubtitle: string;
  eventDate: string;
  showDateBadge: boolean;
  borderStyle: 'none' | 'thin' | 'double' | 'dashed' | 'ornate';
  logoUrl?: string;
  welcomeMediaType?: 'photo' | 'video';
  welcomeVideoUrl?: string;
  homeStyle?: 'classic' | 'minimal' | 'billboard' | 'kiosk_vertical' | 'neon_party' | 'luxury_wedding';
  homeCtaText?: string;
  homeCtaColor?: 'rose_amber' | 'cyber_neon' | 'royal_gold' | 'emerald' | 'slate_dark';
  homeBgBlur?: 'none' | 'light' | 'heavy';
  tabletOrientation?: 'portrait' | 'landscape';
  customFrameOverlayUrl?: string;
  customBgImageUrl?: string;
  customStickerUrls?: string[];
}

export interface PhotoSlot {
  id: string;
  dataUrl: string; // base64
  capturedAt: number;
}

export interface SavedPhotoStrip {
  id: string;
  createdAt: number;
  dataUrl: string;
  themeName: string;
  layout: LayoutType;
  eventTitle: string;
}

export type StepType = 'welcome' | 'theme_layout' | 'capture' | 'export';
