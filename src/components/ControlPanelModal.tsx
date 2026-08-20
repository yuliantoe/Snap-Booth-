import React, { useState, useRef } from 'react';
import {
  X,
  Sliders,
  Palette,
  Image as ImageIcon,
  Video,
  Images,
  Settings,
  Check,
  Upload,
  Trash2,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Type,
  Layout,
  MousePointer,
  Maximize,
  Crown,
  Zap,
  Columns,
  Monitor,
  Minus,
  Tablet,
  Smartphone,
  Clock,
  Timer,
  LogOut,
  User,
  Users,
} from 'lucide-react';
import { EventTheme, SavedPhotoStrip, UserAccount } from '../types';
import { DEFAULT_THEMES } from '../utils/themePresets';

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: EventTheme;
  onSaveTheme: (updatedTheme: EventTheme) => void;
  gallery: SavedPhotoStrip[];
  onDeleteFromGallery: (id: string) => void;
  onClearGallery: () => void;
  onResetSession: () => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onOpenAuthModal?: () => void;
}

const PRESET_VIDEOS = [
  {
    id: 'party_sparkles',
    name: 'Sparkles & Glitter',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-sparkles-and-glitter-in-the-dark-42880-large.mp4',
  },
  {
    id: 'neon_lights',
    name: 'Neon Party Lights',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-bright-neon-lights-in-a-party-43209-large.mp4',
  },
  {
    id: 'confetti_bokeh',
    name: 'Confetti & Bokeh',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-floating-41525-large.mp4',
  },
];

const PRESET_WELCOME_PHOTOS = [
  {
    id: 'party_celebration',
    name: '🎉 Party & Sparkles',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'wedding_romantic',
    name: '💍 Wedding Lights',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'neon_night',
    name: '⚡ Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'gala_gold',
    name: '✨ Gold Bokeh Gala',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cozy_cafe',
    name: '☕ Cafe & Bakery',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'studio_minimal',
    name: '🖼️ Dark Studio Texture',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
  },
];

const PRESET_LOGOS = [
  {
    id: 'snapbooth_badge',
    name: 'SnapBooth Studio Badge',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="%231E293B" stroke="%23F59E0B" stroke-width="8"/><rect x="50" y="70" width="100" height="70" fill="none" stroke="%23FFFFFF" stroke-width="8" rx="10"/><circle cx="100" cy="105" r="22" fill="%23F59E0B"/><circle cx="100" cy="55" r="10" fill="%23EF4444"/><text x="100" y="172" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">SNAPBOOTH</text></svg>`,
  },
  {
    id: 'royal_crest',
    name: 'Royal Wedding Crest',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M100 20 L130 60 L180 60 L140 95 L155 145 L100 115 L45 145 L60 95 L20 60 L70 60 Z" fill="%23D4AF37"/><circle cx="85" cy="140" r="22" fill="none" stroke="%23D4AF37" stroke-width="6"/><circle cx="115" cy="140" r="22" fill="none" stroke="%23D4AF37" stroke-width="6"/><text x="100" y="185" font-family="serif" font-size="18" font-weight="bold" fill="%233D312A" text-anchor="middle">WEDDING</text></svg>`,
  },
  {
    id: 'corporate_shield',
    name: 'Corporate Tech Shield',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><polygon points="100,20 170,60 170,140 100,180 30,140 30,60" fill="%230F172A" stroke="%2338BDF8" stroke-width="8"/><path d="M70 100 L95 125 L135 75" fill="none" stroke="%2338BDF8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><text x="100" y="165" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23F8FAFC" text-anchor="middle">TECH SUMMIT</text></svg>`,
  },
  {
    id: 'star_event',
    name: 'Star VIP Emblem',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="85" fill="%23000000" stroke="%23FBBF24" stroke-width="6" stroke-dasharray="8 6"/><polygon points="100,35 118,72 158,78 129,106 136,146 100,127 64,146 71,106 42,78 82,72" fill="%23FBBF24"/><text x="100" y="175" font-family="sans-serif" font-size="15" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">VIP GUEST</text></svg>`,
  },
];

const HOME_LAYOUT_STYLES = [
  {
    id: 'classic',
    name: 'Classic Glassmorphism',
    desc: 'Tampilan bersih dengan efek frosted glass & tombol gradient',
    icon: Layout,
  },
  {
    id: 'luxury_wedding',
    name: 'Luxury Wedding Elegance',
    desc: 'Tampilan mewah emas royal dengan serif font & floral crest',
    icon: Crown,
  },
  {
    id: 'neon_party',
    name: 'Cyberpunk Neon Party',
    desc: 'Efek neon bercahaya cyan-magenta untuk rave & club party',
    icon: Zap,
  },
  {
    id: 'billboard',
    name: 'Billboard Hero Banner',
    desc: 'Layout split banner dengan brand showcase berdampingan',
    icon: Columns,
  },
  {
    id: 'kiosk_vertical',
    name: 'Kiosk Display Digital',
    desc: 'Layout vertikal elegan ala mesin foto kiosk touchscreen',
    icon: Monitor,
  },
  {
    id: 'minimal',
    name: 'Ultra Minimal Monokrom',
    desc: 'Desain monokrom tipografi bersih ala galeri seni modern',
    icon: Minus,
  },
];

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSaveTheme,
  gallery,
  onDeleteFromGallery,
  onClearGallery,
  onResetSession,
  currentUser,
  onLogout,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'theme' | 'upload_custom' | 'media' | 'gallery' | 'system'>('home');
  const [themeForm, setThemeForm] = useState<EventTheme>({ ...currentTheme });
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>('all');
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const welcomePhotoFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const themeJsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const frameOverlayFileInputRef = useRef<HTMLInputElement | null>(null);
  const bgImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const customStickerFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSaveAndApply = () => {
    onSaveTheme(themeForm);
    onClose();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setThemeForm((prev) => ({
          ...prev,
          logoUrl: result,
          welcomeMediaType: 'photo',
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      setThemeForm((prev) => ({
        ...prev,
        welcomeVideoUrl: videoUrl,
        welcomeMediaType: 'video',
      }));
    }
  };

  const handleThemeJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported && typeof imported === 'object') {
            setThemeForm((prev) => ({
              ...prev,
              ...imported,
            }));
            alert('File Tema JSON berhasil diimpor!');
          }
        } catch {
          alert('Gagal membaca file JSON tema. Pastikan format file valid.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportThemeJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(themeForm, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `theme_${(themeForm.eventTitle || 'custom').replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFrameOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setThemeForm((prev) => ({
          ...prev,
          customFrameOverlayUrl: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setThemeForm((prev) => ({
          ...prev,
          customBgImageUrl: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setThemeForm((prev) => ({
          ...prev,
          customStickerUrls: [...(prev.customStickerUrls || []), result],
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadItem = (strip: SavedPhotoStrip) => {
    const link = document.createElement('a');
    link.download = `SnapBooth_${strip.eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${strip.createdAt}.png`;
    link.href = strip.dataUrl;
    link.click();
  };

  const handlePrintItem = (strip: SavedPhotoStrip) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Photo Strip</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            body { margin: 0; display: flex; items-center; justify-content: center; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${strip.dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Dasboard Sistem
                </h2>
                {currentUser && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    💎 {currentUser.businessName || currentUser.displayName}
                  </span>
                )}
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Cloud Synced
                </span>
              </div>
              <p className="text-xs text-slate-400">Atur Tema Home Custom, Desain Frame, Media Brand & Galeri Foto</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                title="Ganti User atau login akun lain"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ganti User</span>
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Logout dari akun ini"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Panel Tab Navigation - 6 Prominent Visible Tabs */}
        <div className="p-3 bg-slate-950 border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Tab 1: Home */}
            <button
              onClick={() => setActiveTab('home')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTab === 'home'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'home' ? 'bg-white/20 text-white' : 'bg-slate-800 text-rose-400'
                }`}>
                  TAB 1
                </span>
                <Layout className={`w-4 h-4 ${activeTab === 'home' ? 'text-amber-200' : 'text-rose-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">Tema Home</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'home' ? 'text-white/80' : 'text-slate-500'}`}>
                  Layout & Tombol
                </p>
              </div>
            </button>

            {/* Tab 2: Preset Frame */}
            <button
              onClick={() => setActiveTab('theme')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTab === 'theme'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'theme' ? 'bg-white/20 text-white' : 'bg-slate-800 text-pink-400'
                }`}>
                  TAB 2
                </span>
                <Palette className={`w-4 h-4 ${activeTab === 'theme' ? 'text-amber-200' : 'text-pink-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">Preset Frame</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'theme' ? 'text-white/80' : 'text-slate-500'}`}>
                  Warna & Teks Acara
                </p>
              </div>
            </button>

            {/* Tab 3: Upload Custom */}
            <button
              onClick={() => setActiveTab('upload_custom')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTab === 'upload_custom'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'upload_custom' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400'
                }`}>
                  TAB 3
                </span>
                <Upload className={`w-4 h-4 ${activeTab === 'upload_custom' ? 'text-cyan-200' : 'text-cyan-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">Upload Desain</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'upload_custom' ? 'text-white/80' : 'text-slate-500'}`}>
                  Overlay PNG & Stiker
                </p>
              </div>
            </button>

            {/* Tab 4: Media */}
            <button
              onClick={() => setActiveTab('media')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTab === 'media'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'media' ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-400'
                }`}>
                  TAB 4
                </span>
                <Video className={`w-4 h-4 ${activeTab === 'media' ? 'text-amber-200' : 'text-amber-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">Media Brand</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'media' ? 'text-white/80' : 'text-slate-500'}`}>
                  Logo, Foto & Video
                </p>
              </div>
            </button>

            {/* Tab 5: Galeri Foto */}
            <button
              onClick={() => setActiveTab('gallery')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'gallery' ? 'bg-white/20 text-white' : 'bg-slate-800 text-purple-400'
                }`}>
                  TAB 5
                </span>
                <div className="flex items-center gap-1">
                  {gallery.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-400 text-slate-950">
                      {gallery.length}
                    </span>
                  )}
                  <Images className={`w-4 h-4 ${activeTab === 'gallery' ? 'text-white' : 'text-purple-400'}`} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">5. Galeri Foto</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'gallery' ? 'text-white/80' : 'text-slate-500'}`}>
                  {gallery.length} Strip Tersimpan
                </p>
              </div>
            </button>

            {/* Tab 6: Sistem Kiosk */}
            <button
              onClick={() => setActiveTab('system')}
              type="button"
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden ${
                activeTab === 'system'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-1 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'system' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
                }`}>
                  TAB 6
                </span>
                <Settings className={`w-4 h-4 ${activeTab === 'system' ? 'text-amber-200' : 'text-emerald-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight truncate">6. Sistem Kiosk</p>
                <p className={`text-[10px] leading-tight truncate ${activeTab === 'system' ? 'text-white/80' : 'text-slate-500'}`}>
                  Auto-Reset & Print
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: TEMA TAMPILAN HOME CUSTOM */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Gaya Layout Menu Utama Home */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-amber-400" /> Pilih Gaya Layout Menu Utama (Home Screen)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HOME_LAYOUT_STYLES.map((style) => {
                    const Icon = style.icon;
                    const isSelected = (themeForm.homeStyle || 'classic') === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setThemeForm({ ...themeForm, homeStyle: style.id as EventTheme['homeStyle'] })}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                              <Icon className="w-4 h-4 text-rose-400" />
                              <span>{style.name}</span>
                            </div>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-rose-500 text-white">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{style.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Setting Teks Tombol CTA & Warna */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-cyan-400" /> Pengaturan Tombol Utama (CTA Start Button)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tulisan Teks pada Tombol</label>
                    <input
                      type="text"
                      value={themeForm.homeCtaText || 'SENTUH UNTUK MULAI FOTO'}
                      onChange={(e) => setThemeForm({ ...themeForm, homeCtaText: e.target.value })}
                      placeholder="Contoh: SENTUH UNTUK MULAI FOTO"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Skema Warna Tombol CTA</label>
                    <select
                      value={themeForm.homeCtaColor || 'rose_amber'}
                      onChange={(e) => setThemeForm({ ...themeForm, homeCtaColor: e.target.value as EventTheme['homeCtaColor'] })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="rose_amber">Rose & Amber Gradient (Hangat)</option>
                      <option value="cyber_neon">Cyber Neon Cyan (Party & Rave)</option>
                      <option value="royal_gold">Royal Gold (Wedding & Gala)</option>
                      <option value="emerald">Emerald Green (Fresh & Corporate)</option>
                      <option value="slate_dark">Slate Dark (Monokrom Minimalis)</option>
                    </select>
                  </div>
                </div>

                {/* Blur Effect Level */}
                <div className="pt-2 border-t border-slate-900">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Intensitas Blur Media Background Home</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, homeBgBlur: 'none' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        (themeForm.homeBgBlur || 'light') === 'none'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      Tanpa Blur
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, homeBgBlur: 'light' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        (themeForm.homeBgBlur || 'light') === 'light'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      Soft Blur
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, homeBgBlur: 'heavy' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        (themeForm.homeBgBlur || 'light') === 'heavy'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      Deep Blur
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu Orientasi Layar Tablet / Kiosk */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-cyan-400" /> Mode Orientasi Layar Tablet / Kiosk
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    {themeForm.tabletOrientation === 'landscape' ? '💻 Landscape (Miring)' : '📱 Portrait (Tegak)'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Atur tata letak antarmuka agar optimal untuk tablet/iPad atau monitor booth yang dipasang dalam posisi tegak (Portrait) atau miring (Landscape).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, tabletOrientation: 'portrait' })}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
                      (themeForm.tabletOrientation || 'portrait') === 'portrait'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-3 rounded-xl border ${
                      (themeForm.tabletOrientation || 'portrait') === 'portrait'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Tablet Portrait (Tegak)</span>
                        {(themeForm.tabletOrientation || 'portrait') === 'portrait' && (
                          <span className="p-1 rounded-full bg-cyan-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Optimasi untuk iPad/Tablet berdiri vertikal (Ratio 3:4 / 9:16). Layout kamera, tombol & preview tersusun vertikal memanjang.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, tabletOrientation: 'landscape' })}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
                      themeForm.tabletOrientation === 'landscape'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-3 rounded-xl border ${
                      themeForm.tabletOrientation === 'landscape'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      <Tablet className="w-6 h-6 rotate-90" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Tablet Landscape (Miring)</span>
                        {themeForm.tabletOrientation === 'landscape' && (
                          <span className="p-1 rounded-full bg-cyan-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Optimasi untuk Tablet mendatar / Monitor PC (Ratio 4:3 / 16:9). Kamera live di sebelah kiri, kontrol & slot foto di sebelah kanan secara berdampingan.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESET FRAME & TEKS ACARA */}
          {activeTab === 'upload_custom' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 1. Import / Export File Tema JSON */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> File Konfigurasi Tema (.JSON)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Import & Export
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload file konfigurasi tema (.json) hasil ekspor sebelumnya atau simpan racikan tema custom yang sedang kamu buat untuk digunakan kembali di acara berikutnya.
                </p>

                <div className="flex flex-wrap gap-3">
                  <input
                    type="file"
                    ref={themeJsonFileInputRef}
                    onChange={handleThemeJsonUpload}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => themeJsonFileInputRef.current?.click()}
                    className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-extrabold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload / Import File Tema (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportThemeJson}
                    className="py-3 px-5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Export Tema Saat Ini (.json)</span>
                  </button>
                </div>
              </div>

              {/* 2. Upload Bingkai / Frame Overlay PNG Transparan */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" /> Upload Bingkai / Frame Overlay (PNG Transparan)
                  </h3>
                  {themeForm.customFrameOverlayUrl && (
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, customFrameOverlayUrl: undefined })}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Frame Overlay
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload file grafis frame bermotif / overlay berformat PNG transparan. Gambar ini akan dilapisi tepat di atas seluruh hasil foto cetak Photostrip.
                </p>

                <input
                  type="file"
                  ref={frameOverlayFileInputRef}
                  onChange={handleFrameOverlayUpload}
                  accept="image/png,image/webp"
                  className="hidden"
                />

                {themeForm.customFrameOverlayUrl ? (
                  <div className="p-4 bg-slate-900 rounded-2xl border border-cyan-500/30 flex items-center gap-4">
                    <div className="w-20 h-28 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-1 relative shadow-md">
                      <img
                        src={themeForm.customFrameOverlayUrl}
                        alt="Custom Frame Overlay"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Bingkai Overlay Kustom Aktif</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          ✓ Siap Dipakai
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Bingkai overlay transparan sudah tersimpan dan akan melapisi hasil cetak foto secara presisi.
                      </p>
                      <button
                        type="button"
                        onClick={() => frameOverlayFileInputRef.current?.click()}
                        className="text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1 mt-2"
                      >
                        <RefreshCw className="w-3 h-3" /> Ganti Gambar Frame Overlay
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => frameOverlayFileInputRef.current?.click()}
                    className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-cyan-300 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="p-3 rounded-full bg-slate-800 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300 transition-all">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Klik Untuk Pilih Gambar Frame Overlay (.PNG)</span>
                    <span className="text-[10px] text-slate-400">Rekomendasi format PNG transparan high-resolution</span>
                  </button>
                )}
              </div>

              {/* 3. Upload Background / Wallpaper Kustom Layout */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" /> Upload Latar Belakang / Wallpaper (PNG / JPG)
                  </h3>
                  {themeForm.customBgImageUrl && (
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, customBgImageUrl: undefined })}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Latar Belakang
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload gambar latar belakang kustom (pattern, tekstur kayu, kain marbel, ilustrasi pesta) untuk kanvas hasil cetak foto.
                </p>

                <input
                  type="file"
                  ref={bgImageFileInputRef}
                  onChange={handleBgImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                {themeForm.customBgImageUrl ? (
                  <div className="p-4 bg-slate-900 rounded-2xl border border-emerald-500/30 flex items-center gap-4">
                    <div className="w-24 h-20 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-md">
                      <img
                        src={themeForm.customBgImageUrl}
                        alt="Custom Background"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-xs font-bold text-white block">Gambar Latar Belakang Kustom Aktif</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Latar belakang kustom ini akan menjadi alas dasar kanvas cetak photostrip kamu.
                      </p>
                      <button
                        type="button"
                        onClick={() => bgImageFileInputRef.current?.click()}
                        className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Ganti Gambar Latar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => bgImageFileInputRef.current?.click()}
                    className="w-full py-6 px-4 rounded-2xl border border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-3"
                  >
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Upload Gambar Latar Belakang / Pattern (.JPG / .PNG)</span>
                  </button>
                )}
              </div>

              {/* 4. Upload Stiker & Ornamen Desain Tambahan */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" /> Upload Stiker & Ornamen Grafis Tambahan
                  </h3>
                  <button
                    type="button"
                    onClick={() => customStickerFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-bold hover:bg-pink-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Tambah Stiker (PNG)
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Tambahkan koleksi elemen ornamen grafis kustom (seperti bunga, pita, mahkota, stamp pernikahan, logo sponsor).
                </p>

                <input
                  type="file"
                  ref={customStickerFileInputRef}
                  onChange={handleCustomStickerUpload}
                  accept="image/png,image/webp"
                  className="hidden"
                />

                {themeForm.customStickerUrls && themeForm.customStickerUrls.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {themeForm.customStickerUrls.map((stickerUrl, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center gap-2 relative group">
                        <img src={stickerUrl} alt={`Custom Sticker ${idx + 1}`} className="w-14 h-14 object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(themeForm.customStickerUrls || [])];
                            updated.splice(idx, 1);
                            setThemeForm({ ...themeForm, customStickerUrls: updated });
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          title="Hapus Stiker"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs space-y-1">
                    <p className="font-semibold text-slate-300">Belum ada stiker / ornamen tambahan diupload</p>
                    <p className="text-[11px] text-slate-500">Klik tombol "Tambah Stiker (PNG)" di atas untuk mengunggah aset grafis kustom kamu.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRESET FRAME & TEKS ACARA */}
          {activeTab === 'theme' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Preset Theme Selection */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Pilih Preset Tema Siap Pakai
                </h3>

                {/* Theme Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {[
                    { id: 'all', label: 'Semua Tema' },
                    { id: 'magazine', label: '📖 Majalah Cover' },
                    { id: 'receipt', label: '🛒 Struk Pembelian' },
                    { id: 'cafe', label: '☕ Cafe & Kopi' },
                    { id: 'restaurant', label: '🍷 Restaurant & Bistro' },
                    { id: 'wedding', label: '💍 Pernikahan' },
                    { id: 'birthday', label: '🎂 Ulang Tahun' },
                    { id: 'party', label: '🎉 Party & Rave' },
                    { id: 'retro', label: '📻 Retro & Y2K' },
                    { id: 'corporate', label: '🏢 Corporate' },
                    { id: 'minimal', label: '🖼️ Monokrom' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setThemeCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        themeCategoryFilter === cat.id
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DEFAULT_THEMES.filter(
                    (preset) => themeCategoryFilter === 'all' || preset.category === themeCategoryFilter
                  ).map((preset) => {
                    const isSelected = themeForm.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setThemeForm({ ...preset })}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-rose-500 text-white">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: preset.frameColor }} title="Warna Frame" />
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: preset.textColor }} title="Warna Teks" />
                          <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: preset.accentColor }} title="Warna Aksen" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Information Input */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Type className="w-4 h-4 text-rose-400" /> Informasi Teks Acara
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Judul Utama Acara</label>
                    <input
                      type="text"
                      value={themeForm.eventTitle}
                      onChange={(e) => setThemeForm({ ...themeForm, eventTitle: e.target.value })}
                      placeholder="Contoh: Sarah & Alex Wedding"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tanggal Acara</label>
                    <input
                      type="text"
                      value={themeForm.eventDate}
                      onChange={(e) => setThemeForm({ ...themeForm, eventDate: e.target.value })}
                      placeholder="Contoh: 08 AGUSTUS 2026"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Typography & Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-900">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Warna Bingkai Frame</label>
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <input
                        type="color"
                        value={themeForm.frameColor}
                        onChange={(e) => setThemeForm({ ...themeForm, frameColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-300 uppercase">{themeForm.frameColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Warna Tulisan Teks</label>
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <input
                        type="color"
                        value={themeForm.textColor}
                        onChange={(e) => setThemeForm({ ...themeForm, textColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-300 uppercase">{themeForm.textColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Gaya Font</label>
                    <select
                      value={themeForm.fontFamily}
                      onChange={(e) => setThemeForm({ ...themeForm, fontFamily: e.target.value as EventTheme['fontFamily'] })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="sans">Modern Sans-Serif</option>
                      <option value="serif">Elegant Serif (Klasik)</option>
                      <option value="display">Y2K Display / Retro</option>
                      <option value="handwriting">Handwriting / Script</option>
                      <option value="mono">Cyber Monospace</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA BRAND & VIDEO */}
          {activeTab === 'media' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-rose-400" /> Mode Tampilan Utama Menu Start
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, welcomeMediaType: 'photo' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      themeForm.welcomeMediaType !== 'video'
                        ? 'border-rose-500 bg-rose-500/10 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ImageIcon className="w-6 h-6 text-rose-400" />
                    <span className="text-sm">Foto Welcoming Background</span>
                    <span className="text-[10px] font-normal text-slate-400">Menampilkan Foto Fullscreen & Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, welcomeMediaType: 'video' })}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      themeForm.welcomeMediaType === 'video'
                        ? 'border-rose-500 bg-rose-500/10 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Video className="w-6 h-6 text-cyan-400" />
                    <span className="text-sm">Video Background Loop</span>
                    <span className="text-[10px] font-normal text-slate-400">Menampilkan Animasi Video Bergerak</span>
                  </button>
                </div>
              </div>

              {/* Welcoming Fullscreen Background Photo */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-rose-400" /> Upload / Pilih Foto Welcoming Fullscreen
                  </h3>
                  {themeForm.welcomePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, welcomePhotoUrl: undefined })}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Reset Foto Fullscreen
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Foto ini akan tampil penuh (fullscreen) pada halaman paling awal saat pengunjung mendekati booth foto.
                </p>

                <div className="space-y-3">
                  <input
                    type="file"
                    ref={welcomePhotoFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setThemeForm({
                            ...themeForm,
                            welcomePhotoUrl: event.target?.result as string,
                            welcomeMediaType: 'photo',
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => welcomePhotoFileInputRef.current?.click()}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/10 transition-all"
                    >
                      <Upload className="w-4 h-4" /> Upload Custom Background Fullscreen (.JPG/.PNG)
                    </button>
                  </div>

                  {/* Preset Welcoming Photos */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preset Wallpaper Welcoming High-Res:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PRESET_WELCOME_PHOTOS.map((bg) => {
                        const isSelected = themeForm.welcomePhotoUrl === bg.url;
                        return (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() =>
                              setThemeForm({
                                ...themeForm,
                                welcomePhotoUrl: bg.url,
                                welcomeMediaType: 'photo',
                              })
                            }
                            className={`p-2.5 rounded-2xl border text-left transition-all overflow-hidden flex flex-col gap-2 relative ${
                              isSelected
                                ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg shadow-rose-500/10'
                                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="w-full h-20 rounded-xl overflow-hidden relative bg-slate-950">
                              <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-200 truncate">{bg.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Brand Logo */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" /> Upload / Pilih Logo Brand
                  </h3>
                  {themeForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, logoUrl: undefined })}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Logo
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4 text-rose-400" /> Upload File Logo Baru (PNG/JPG)
                  </button>

                  {/* Preset Logos */}
                  <div className="flex-1 overflow-x-auto flex items-center gap-2 py-1">
                    {PRESET_LOGOS.map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => setThemeForm({ ...themeForm, logoUrl: logo.url, welcomeMediaType: 'photo' })}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500 transition-all flex-shrink-0"
                        title={logo.name}
                      >
                        <img src={logo.url} alt={logo.name} className="w-8 h-8 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Loop Selection */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" /> Video Loop Background
                </h3>

                <div className="space-y-3">
                  <input
                    type="file"
                    ref={videoFileInputRef}
                    onChange={handleVideoUpload}
                    accept="video/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" /> Upload Custom Video MP4
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRESET_VIDEOS.map((video) => {
                      const isSelected = themeForm.welcomeVideoUrl === video.url;
                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() =>
                            setThemeForm({
                              ...themeForm,
                              welcomeVideoUrl: video.url,
                              welcomeMediaType: 'video',
                            })
                          }
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span>{video.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GALERI FOTO */}
          {activeTab === 'gallery' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Images className="w-4 h-4 text-cyan-400" /> Koleksi Foto Strip Sesi Ini ({gallery.length})
                </h3>
                {gallery.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearGallery}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Bersihkan Semua Foto
                  </button>
                )}
              </div>

              {gallery.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <Images className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">Belum ada foto strip tersimpan.</p>
                  <p className="text-xs text-slate-500">
                    Foto strip yang kamu cetak atau bagikan akan tersimpan otomatis di galeri ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((strip) => (
                    <div
                      key={strip.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all"
                    >
                      <div className="bg-slate-900 p-2 rounded-xl flex justify-center items-center overflow-hidden max-h-[260px]">
                        <img
                          src={strip.dataUrl}
                          alt={strip.eventTitle}
                          className="max-h-[240px] w-auto object-contain rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate">{strip.eventTitle}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(strip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handlePrintItem(strip)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1"
                          title="Cetak"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak
                        </button>

                        <button
                          onClick={() => handleDownloadItem(strip)}
                          className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs flex items-center gap-1"
                          title="Unduh"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh
                        </button>

                        <button
                          onClick={() => onDeleteFromGallery(strip.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 text-xs"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SISTEM KIOSK */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Pengaturan Auto-Reset Idle (Inaktivitas Pengunjung) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400" /> Auto-Reset Idle (Inaktivitas Layar)
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    (themeForm.idleTimeoutSeconds ?? 3) > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {(themeForm.idleTimeoutSeconds ?? 3) > 0
                      ? `⏱️ Reset: ${themeForm.idleTimeoutSeconds ?? 3} Detik`
                      : '⏹️ Auto-Reset: NONAKTIF'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Jika layar photobooth tidak disentuh/dipakai oleh pengunjung selama durasi waktu yang dipilih (saat berada di luar Welcome Screen), sistem akan otomatis membersihkan sesi dan kembali ke Welcome Screen fullscreen.
                </p>

                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pilihan Cepat Waktu Idle (3 Detik s/d 10 Detik):</span>
                      </label>
                      <span className="text-xs font-extrabold text-amber-400">
                        {(themeForm.idleTimeoutSeconds ?? 3) > 0
                          ? `${themeForm.idleTimeoutSeconds ?? 3} Detik`
                          : 'Nonaktif (Manual)'}
                      </span>
                    </div>

                    {/* Grid tombol 3s sampai 10s */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((sec) => {
                        const isSelected = (themeForm.idleTimeoutSeconds ?? 3) === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setThemeForm({ ...themeForm, idleTimeoutSeconds: sec })}
                            className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-extrabold shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <span className="text-sm font-black">{sec}s</span>
                            <span className="text-[9px] opacity-75">{sec === 3 ? 'Default' : `${sec} dtk`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Range Slider for granular control */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Geser Slider Waktu:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {(themeForm.idleTimeoutSeconds ?? 3) > 0
                          ? `${themeForm.idleTimeoutSeconds ?? 3} Detik (Timer Inaktif)`
                          : 'Tidak ada timer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-500">3s</span>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        step="1"
                        value={(themeForm.idleTimeoutSeconds ?? 3) <= 0 ? 3 : (themeForm.idleTimeoutSeconds ?? 3)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setThemeForm({ ...themeForm, idleTimeoutSeconds: val });
                        }}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-[11px] font-bold text-slate-500">10s</span>
                    </div>
                  </div>

                  {/* Opsi Nonaktifkan Auto-Reset */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">Mode Tanpa Auto-Reset (Hanya Reset Manual):</span>
                    <button
                      type="button"
                      onClick={() =>
                        setThemeForm({
                          ...themeForm,
                          idleTimeoutSeconds: (themeForm.idleTimeoutSeconds ?? 3) === 0 ? 3 : 0,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        (themeForm.idleTimeoutSeconds ?? 3) === 0
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {(themeForm.idleTimeoutSeconds ?? 3) === 0 ? '✓ Auto-Reset Dinonaktifkan' : 'Nonaktifkan Auto-Reset'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pengaturan Auto-Print Printer Kiosk */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-400" /> Pengaturan Cetak Otomatis (Auto-Print)
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    themeForm.autoPrintEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {themeForm.autoPrintEnabled ? '🖨️ Auto-Print: AKTIF' : '⏹️ Auto-Print: NONAKTIF'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Ketika mode ini diaktifkan, sistem akan memicu perintah cetak secara otomatis begitu pengunjung selesai mengambil seluruh sesi foto tanpa perlu menekan tombol cetak manual.
                </p>

                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Status Cetak Otomatis (Auto-Print)</span>
                        {themeForm.autoPrintEnabled && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </p>
                      <p className="text-xs text-slate-400">
                        Otomatis buka dialog cetak printer saat foto selesai
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setThemeForm({ ...themeForm, autoPrintEnabled: !themeForm.autoPrintEnabled })}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                        themeForm.autoPrintEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          themeForm.autoPrintEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {themeForm.autoPrintEnabled && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-slate-300 block">
                        Format Kertas Auto-Print Default:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'thermal_80mm', label: 'Thermal 80mm', sub: 'Kios Kertas Struk' },
                          { id: 'thermal_58mm', label: 'Thermal 58mm', sub: 'Printer Kasir Mini' },
                          { id: 'dual_4x6', label: 'Dual Strip 4x6"', sub: 'Cetak Foto Lab 2-In-1' },
                          { id: 'single', label: 'Single Strip', sub: 'File PNG High-Res' },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setThemeForm({ ...themeForm, autoPrintMode: fmt.id as any })}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              (themeForm.autoPrintMode || 'thermal_80mm') === fmt.id
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold'
                                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <p className="text-xs font-bold">{fmt.label}</p>
                            <p className="text-[10px] text-slate-500">{fmt.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Orientasi Layar Tablet / Kiosk */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-cyan-400" /> Pengaturan Orientasi Layar Tablet / Kiosk
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    {themeForm.tabletOrientation === 'landscape' ? '💻 Landscape (Miring)' : '📱 Portrait (Tegak)'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih orientasi layar device tablet (iPad / Android Tablet) atau monitor kiosk yang Anda gunakan saat menjalankan Photobooth.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, tabletOrientation: 'portrait' })}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
                      (themeForm.tabletOrientation || 'portrait') === 'portrait'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-3 rounded-xl border ${
                      (themeForm.tabletOrientation || 'portrait') === 'portrait'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Tablet Portrait (Tegak)</span>
                        {(themeForm.tabletOrientation || 'portrait') === 'portrait' && (
                          <span className="p-1 rounded-full bg-cyan-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Layout Vertikal (Ratio 3:4 / 9:16). Sangat pas untuk standing kiosk tablet & penggunaan HP/Tablet tegak.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, tabletOrientation: 'landscape' })}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
                      themeForm.tabletOrientation === 'landscape'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-3 rounded-xl border ${
                      themeForm.tabletOrientation === 'landscape'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      <Tablet className="w-6 h-6 rotate-90" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Tablet Landscape (Miring)</span>
                        {themeForm.tabletOrientation === 'landscape' && (
                          <span className="p-1 rounded-full bg-cyan-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Layout Horisontal (Ratio 4:3 / 16:9). Sangat pas untuk Tablet meja horizontal atau layar Monitor PC.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* User Account & Session Management */}
              {currentUser && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" /> Status Akun & Sesi Login
                  </h3>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{currentUser.displayName}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {currentUser.role === 'super_admin' ? '👑 Super Admin' : '💎 Klien Aktif'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          @{currentUser.username || currentUser.email} • PIN: {currentUser.boothAccessPin || '1234'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenAuthModal && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAuthModal();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ganti User</span>
                        </button>
                      )}
                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLogout();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Logout</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-rose-400" /> Aksi & Reset Kiosk Photobooth
                </h3>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Reset Sesi Foto Baru</p>
                    <p className="text-xs text-slate-400">Mulai ulang seluruh sesi dari awal dan bersihkan slot foto aktif</p>
                  </div>
                  <button
                    onClick={() => {
                      onResetSession();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Mulai Foto Baru
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <p className="text-xs text-slate-400 hidden sm:block">SnapBooth Studio System v2.0</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Batal
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Simpan & Terapkan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
