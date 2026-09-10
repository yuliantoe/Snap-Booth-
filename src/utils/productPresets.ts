export interface ProductPhotoPreset {
  id: string;
  name: string;
  category: 'photobooth' | 'cafe' | 'merchandise' | 'wedding' | 'dessert';
  url: string;
  description: string;
}

export const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'Semua Produk' },
  { id: 'photobooth', label: '📸 Cetak & Frame' },
  { id: 'cafe', label: '☕ Cafe & Minuman' },
  { id: 'merchandise', label: '🛍️ Merchandise' },
  { id: 'wedding', label: '💍 Wedding & Gift' },
  { id: 'dessert', label: '🍰 Bakery & Dessert' },
] as const;

export const PRESET_PRODUCT_PHOTOS: ProductPhotoPreset[] = [
  // Photobooth & Frame
  {
    id: 'prod_photostrip',
    name: 'Sample Strip 2x6 Glossy',
    category: 'photobooth',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1920&q=80',
    description: 'Hasil cetak strip foto photobooth kertas foto premium glossy',
  },
  {
    id: 'prod_acrylic_frame',
    name: 'Bingkai Akrilik Magnetik',
    category: 'photobooth',
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1920&q=80',
    description: 'Acrylic magnetic frame modern untuk display meja & hadiah',
  },
  {
    id: 'prod_polaroid_set',
    name: 'Koleksi Polaroid Mini Cetak',
    category: 'photobooth',
    url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1920&q=80',
    description: 'Paket cetak polaroid aesthetic dengan custom frame',
  },
  {
    id: 'prod_photobook',
    name: 'Hardcover Album Momen',
    category: 'photobooth',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1920&q=80',
    description: 'Album foto cetak eksklusif hardcover dengan kertas tebal',
  },

  // Cafe & Minuman
  {
    id: 'prod_specialty_latte',
    name: 'Specialty Latte Art',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1920&q=80',
    description: 'Espresso blend lembut dengan latte art swan premium',
  },
  {
    id: 'prod_artisan_croissant',
    name: 'Fresh Butter Croissant',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1920&q=80',
    description: 'Pastry renyah butter Prancis dipanggang fresh tiap pagi',
  },
  {
    id: 'prod_matcha_drink',
    name: 'Iced Uji Matcha Latte',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1920&q=80',
    description: 'Minuman matcha Kyoto asli dengan oat milk segar',
  },
  {
    id: 'prod_cold_brew',
    name: 'Artisan Cold Brew Bottle',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1920&q=80',
    description: 'Kopi seduh dingin 12 jam dalam botol kaca premium',
  },

  // Merchandise & Fashion
  {
    id: 'prod_totebag',
    name: 'Canvas Tote Bag Brand',
    category: 'merchandise',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1920&q=80',
    description: 'Tote bag kanvas tebal ramah lingkungan dengan sablon custom',
  },
  {
    id: 'prod_streetwear_tee',
    name: 'Streetwear Graphic Tee',
    category: 'merchandise',
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1920&q=80',
    description: 'Kaos katun combed 24s sablon plastisol halus',
  },
  {
    id: 'prod_enamel_pins',
    name: 'Custom Enamel Pin & Sticker',
    category: 'merchandise',
    url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=1920&q=80',
    description: 'Pin logam enamel berkilau dan stiker vinyl waterproof',
  },

  // Wedding & Gift
  {
    id: 'prod_wedding_gift',
    name: 'Luxury Wedding Favor Box',
    category: 'wedding',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1920&q=80',
    description: 'Kotak suvenir pernikahan elegan dengan pita satin emas',
  },
  {
    id: 'prod_scented_candle',
    name: 'Artisan Scented Candle',
    category: 'wedding',
    url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1920&q=80',
    description: 'Lilin aromaterapi soy wax wangi lavender & vanilla alami',
  },

  // Bakery & Dessert
  {
    id: 'prod_macarons_box',
    name: 'Parisian Macarons Gift',
    category: 'dessert',
    url: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=1920&q=80',
    description: 'Aneka rasa macaron Prancis lembut aneka warna pastel',
  },
  {
    id: 'prod_gelato_cone',
    name: 'Handmade Italian Gelato',
    category: 'dessert',
    url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1920&q=80',
    description: 'Es krim gelato lembut dengan waffle cone renyah',
  },
];

export const DEFAULT_SLIDESHOW_PRODUCT_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1920&q=80',
];
