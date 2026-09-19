import { EventTheme, UserAccount } from '../types';
import { DEFAULT_THEMES } from '../utils/themePresets';
import { SCREENSAVER_PRESETS, DEFAULT_SCREENSAVER_PHOTOS } from '../utils/screensaverPresets';
import { saveClientThemeToCloud, loadClientThemeFromCloud } from './subscriptionService';

/**
 * Key prefix for user-specific themes and brand media
 */
const USER_THEME_STORAGE_PREFIX = 'snapbooth_user_theme_';
const USER_SCREENSAVER_STORAGE_PREFIX = 'snapbooth_user_screensaver_';

/**
 * Compresses an image file (File) or base64 Data URL to a lightweight WebP/JPEG data URL.
 * Keeps file sizes around 50KB - 120KB instead of 3MB - 10MB, ensuring reliable
 * storage in both localStorage and Firestore documents (under 1MB limit).
 */
export async function compressImage(
  source: File | string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If string is already an http(s) URL, no need to compress
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      resolve(source);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const processImage = () => {
      let width = img.width;
      let height = img.height;

      if (!width || !height) {
        if (typeof source === 'string') resolve(source);
        else resolve('');
        return;
      }

      // Calculate scale ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (typeof source === 'string') resolve(source);
        else resolve('');
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format (use image/jpeg for photos, image/png if transparent source)
      const isPng = typeof source === 'string' && source.startsWith('data:image/png');
      const outputType = isPng ? 'image/png' : 'image/jpeg';
      const outputDataUrl = canvas.toDataURL(outputType, quality);
      resolve(outputDataUrl);
    };

    img.onload = processImage;
    img.onerror = () => {
      // Fallback to original source if processing fails
      if (typeof source === 'string') resolve(source);
      else reject(new Error('Gagal memproses gambar'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Gets user-specific localStorage key for themes & media
 */
export function getUserThemeKey(userId: string): string {
  return `${USER_THEME_STORAGE_PREFIX}${userId}`;
}

/**
 * Gets user-specific localStorage key for screensaver config & photos
 */
export function getUserScreensaverKey(userId: string): string {
  return `${USER_SCREENSAVER_STORAGE_PREFIX}${userId}`;
}

/**
 * Generates an initial personalized brand and screensaver theme for a specific user
 * based on their business name, display name, and plan/role.
 */
export function getUserDefaultTheme(user: UserAccount): EventTheme {
  const brandName = user.businessName || user.displayName || 'SNAPBOOTH STUDIO';
  const roleName = user.role === 'super_admin' ? 'Super Admin HQ' : 'Studio Mitra';

  // Pick preset based on client characteristics
  let presetId: 'school' | 'corporate' | 'graduation' | 'expo' | 'cafe_resto' | 'custom' = 'cafe_resto';
  const lowerNotes = `${user.notes || ''} ${user.displayName || ''} ${user.businessName || ''}`.toLowerCase();
  if (lowerNotes.includes('wedding') || lowerNotes.includes('nikah')) {
    presetId = 'graduation';
  } else if (lowerNotes.includes('sekolah') || lowerNotes.includes('sma') || lowerNotes.includes('kampus')) {
    presetId = 'school';
  } else if (lowerNotes.includes('corporate') || lowerNotes.includes('pt ') || lowerNotes.includes('tbk')) {
    presetId = 'corporate';
  } else if (lowerNotes.includes('expo') || lowerNotes.includes('event')) {
    presetId = 'expo';
  }

  const preset = SCREENSAVER_PRESETS.find((p) => p.id === presetId) || SCREENSAVER_PRESETS[0];

  const baseTheme = DEFAULT_THEMES[0];

  return {
    ...baseTheme,
    id: `theme_${user.id}`,
    name: brandName,
    eventTitle: brandName.toUpperCase(),
    eventSubtitle: `Photobooth Sesi Eksklusif • ${roleName}`,
    homeCtaText: 'SENTUH UNTUK MULAI FOTO',

    // Screensaver Specific Settings per user
    screensaverEnabled: true,
    screensaverIdleSeconds: 45,
    screensaverPreset: presetId,
    screensaverTitle: brandName.toUpperCase(),
    screensaverSubtitle: user.businessName ? `UNIT KIOS: ${user.displayName.toUpperCase()}` : preset.subtitle,
    screensaverTagline: user.notes ? user.notes : preset.tagline,
    screensaverBadgeText: user.role === 'super_admin' ? '⭐ OFFICIAL SNAPBOOTH STUDIO' : `📸 ${brandName.toUpperCase()}`,
    screensaverCtaText: '✨ SENTUH LAYAR UNTUK MULAI FOTOBOOTH',
    screensaverHighlights: [...preset.highlights],
    screensaverPhotos: [...preset.photos],
    screensaverSpeedSeconds: preset.speedSeconds || 6,
    screensaverOverlayDarkness: preset.overlayDarkness ?? 0.55,
  };
}

/**
 * Synchronously retrieves the local theme & media saved for this specific user.
 */
export function getUserLocalTheme(userId: string): EventTheme | null {
  try {
    const raw = localStorage.getItem(getUserThemeKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as EventTheme;
      }
    }
  } catch (err) {
    console.warn(`Error reading local theme for user ${userId}:`, err);
  }
  return null;
}

/**
 * Saves theme & media for a specific user into localStorage (instant & offline-ready).
 */
export function saveUserLocalTheme(userId: string, theme: EventTheme): void {
  try {
    const key = getUserThemeKey(userId);
    localStorage.setItem(key, JSON.stringify(theme));

    // Also store screensaver media snapshot for instant lookup
    const ssKey = getUserScreensaverKey(userId);
    const screensaverData = {
      photos: theme.screensaverPhotos || DEFAULT_SCREENSAVER_PHOTOS,
      title: theme.screensaverTitle,
      subtitle: theme.screensaverSubtitle,
      tagline: theme.screensaverTagline,
      badgeText: theme.screensaverBadgeText,
      preset: theme.screensaverPreset,
      enabled: theme.screensaverEnabled,
      idleSeconds: theme.screensaverIdleSeconds,
      speedSeconds: theme.screensaverSpeedSeconds,
      darkness: theme.screensaverOverlayDarkness,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(ssKey, JSON.stringify(screensaverData));
  } catch (err) {
    console.warn(`Could not save local theme for user ${userId}:`, err);
  }
}

/**
 * Asynchronously loads the full theme (Brand Media + Screensaver Media) for a logged-in user.
 * 1. Reads instant local storage for this user.
 * 2. Fetches Cloud Firestore in background to sync newest updates.
 * 3. Returns the most up-to-date theme bound to this user.
 */
export async function loadUserFullTheme(user: UserAccount): Promise<EventTheme> {
  // 1. Check local storage first
  const localTheme = getUserLocalTheme(user.id);

  // 2. Fetch from Cloud Firestore
  try {
    const cloudTheme = await loadClientThemeFromCloud(user.id);
    if (cloudTheme) {
      // Sync cloud theme to local storage
      saveUserLocalTheme(user.id, cloudTheme);
      return cloudTheme;
    }
  } catch (err) {
    console.warn('Cloud theme fetch error, using local/default:', err);
  }

  // 3. Fallback to local theme if available
  if (localTheme) {
    return localTheme;
  }

  // 4. Fallback to customTheme in user profile object
  if (user.customTheme) {
    saveUserLocalTheme(user.id, user.customTheme);
    return user.customTheme;
  }

  // 5. Generate tailored initial theme for this user and save it
  const defaultUserTheme = getUserDefaultTheme(user);
  saveUserLocalTheme(user.id, defaultUserTheme);
  // Also push initial theme to cloud
  saveClientThemeToCloud(user.id, defaultUserTheme).catch(() => {});
  return defaultUserTheme;
}

/**
 * Saves the user's theme (including brand media and screensaver media)
 * to both local storage (immediate) and Cloud Firestore (persistent cloud).
 */
export async function saveUserFullTheme(userId: string, theme: EventTheme): Promise<void> {
  // 1. Save locally first (instant visual update and offline resilience)
  saveUserLocalTheme(userId, theme);

  // 2. Sync to Cloud Firestore
  try {
    await saveClientThemeToCloud(userId, theme);
  } catch (err) {
    console.warn(`Error syncing user theme to cloud for ${userId}:`, err);
  }
}
