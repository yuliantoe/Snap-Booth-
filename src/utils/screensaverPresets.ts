export interface ScreensaverPreset {
  id: 'school' | 'corporate' | 'graduation' | 'expo' | 'cafe_resto' | 'custom';
  name: string;
  categoryLabel: string;
  icon: string;
  title: string;
  subtitle: string;
  tagline: string;
  badgeText: string;
  ctaText: string;
  highlights: string[];
  photos: string[];
  speedSeconds: number;
  overlayDarkness: number;
}

export const SCREENSAVER_PRESETS: ScreensaverPreset[] = [
  {
    id: 'school',
    name: 'Promosi Sekolah & Kampus (PPDB & Open House)',
    categoryLabel: 'Sekolah & Pendidikan',
    icon: '🏫',
    title: 'SMA NEGERI UNGGULAN INDONESIA',
    subtitle: 'PENERIMAAN PESERTA DIDIK BARU (PPDB) 2026',
    tagline: 'Membentuk Generasi Cerdas Berkarakter, Berdaya Saing Global, & Berprestasi Juara',
    badgeText: '🏫 MEDIA PROMOSI SEKOLAH RESMI',
    ctaText: '✨ SENTUH LAYAR UNTUK MULAI FOTOBOOTH',
    highlights: [
      'Akreditasi A Unggul',
      'Lab Sains & Komputer Modern',
      'Program Beasiswa Prestasi',
      'Ekstrakurikuler Lengkap & Berprestasi',
    ],
    photos: [
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1920&q=85',
    ],
    speedSeconds: 6,
    overlayDarkness: 0.55,
  },
  {
    id: 'corporate',
    name: 'Perusahaan & Korporat (Company Gathering & Expo)',
    categoryLabel: 'Perusahaan & Korporat',
    icon: '🏢',
    title: 'PT GLOBAL NUSANTARA TBK',
    subtitle: 'ANNUAL CORPORATE SUMMIT & GALA DINNER 2026',
    tagline: 'Empowering People, Inspiring Innovation, Shaping The Future Together',
    badgeText: '🏢 CORPORATE MEDIA SHOWCASE',
    ctaText: '🚀 TOUCH TO START PHOTO SESSION',
    highlights: [
      'Inovasi Digital Berkelanjutan',
      'Solusi Enterprise Terpercaya',
      'Kolaborasi Tim Multinasional',
      '100% Client Satisfaction',
    ],
    photos: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=85',
    ],
    speedSeconds: 6,
    overlayDarkness: 0.6,
  },
  {
    id: 'graduation',
    name: 'Wisuda & Akademik (Graduation Ceremony)',
    categoryLabel: 'Universitas & Wisuda',
    icon: '🎓',
    title: 'UNIVERSITAS INDONESIA RAYA',
    subtitle: 'UPACARA WISUDA & PELEPASAN SARJANA TAHUN 2026',
    tagline: 'Selamat & Sukses Kepada Seluruh Wisudawan! Teruslah Mengabdi Untuk Negeri',
    badgeText: '🎓 ACADEMIC COMMENCEMENT',
    ctaText: '🎓 AMBIL FOTO KENANGAN WISUDA',
    highlights: [
      'Momen Kelulusan Bersejarah',
      'Cetak Kenangan Bersama Keluarga',
      'Struk Foto Kertas Thermal',
      'Digital QR Code Sync',
    ],
    photos: [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1920&q=85',
    ],
    speedSeconds: 6,
    overlayDarkness: 0.55,
  },
  {
    id: 'expo',
    name: 'Pameran, Expo & Sponsor (Brand Activation)',
    categoryLabel: 'Brand & Exhibition',
    icon: '⭐',
    title: 'TECH & CAREER EXPO 2026',
    subtitle: 'OFFICIAL SPONSOR & INTERACTIVE EXPERIENCE',
    tagline: 'Kunjungi Booth Kami, Dapatkan Merchandise Eksklusif & Abadikan Pengalaman Seru!',
    badgeText: '⭐ SPONSOR SHOWCASE',
    ctaText: '📸 SENTUH LAYAR & CETAK STRUK FOTO',
    highlights: [
      'Booth Interaktif Seru',
      'Souvenir & Merchandise Eksklusif',
      'Cetak Foto Struk Thermal Instan',
      'Kamera & Efek Realtime',
    ],
    photos: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=85',
    ],
    speedSeconds: 6,
    overlayDarkness: 0.55,
  },
  {
    id: 'cafe_resto',
    name: 'Cafe, Resto & Rumah Makan (Kuliner & Coffee Shop)',
    categoryLabel: 'Cafe, Resto & Kuliner',
    icon: '☕',
    title: 'AROMA NUSANTARA COFFEE & RESTO',
    subtitle: 'CITA RASA AUTENTIK & RUANG KUMPUL HANGAT',
    tagline: 'Nikmati Sajian Kopi Istimewa, Kuliner Nusantara Lezat, dan Abadikan Momen Hangat Bersama Teman & Keluarga',
    badgeText: '',
    ctaText: '📸 SENTUH LAYAR & AMBIL STRUK FOTO',
    highlights: [
      'Menu Autentik & Racikan Barista',
      'Suasana Cozy & Aesthetic Vibes',
      'Free WiFi Cepat & Colokan Nyaman',
      'Cetak Struk Foto Kenangan Instan',
    ],
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=85',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1920&q=85',
    ],
    speedSeconds: 6,
    overlayDarkness: 0.55,
  },
];

export const DEFAULT_SCREENSAVER_PHOTOS = SCREENSAVER_PRESETS[0].photos;
