import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserAccount, SubscriptionPlanInfo, SubscriptionPlanId, EventTheme } from '../types';

export const OFFICIAL_PAYMENT_INFO = {
  bankName: 'Bank Central Asia (BCA)',
  bankShortName: 'BCA',
  accountNumber: '5820191546',
  accountHolder: 'Yulianto',
  fullLabel: 'Bank Central Asia (BCA) 5820191546 a/n Yulianto',
  notice: 'Hanya transfer ke Rekening Tujuan Resmi Bank Central Asia (BCA) 5820191546 a/n Yulianto. Kami tidak pernah menggunakan nomor rekening bank lain.',
};

export const OFFICIAL_WHATSAPP_PHONE = '085159746119';
export const OFFICIAL_WHATSAPP_LINK = 'https://wa.me/085159746119?text=Halo%20saya%20SnapBoth%20%0ATerimakasih%20telah%20menghubungi%20Layanan%20Kami%20%0Aada%20yang%20bisa%20kami%20bantu%20terimaksih%20';

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanInfo> = {
  starter: {
    id: 'starter',
    name: 'Starter Kiosk',
    pricePerMonth: 149000,
    badge: 'Standard',
    description: 'Cocok untuk booth kafe atau event personal mingguan',
    features: [
      'Akses Dasboard Setting Kiosk',
      'Preset Frame & Template Teks',
      'Auto-Reset Idle (3s - 10s)',
      'Simpan & Cetak Galeri Foto',
      'Support Cetak Thermal & Foto Strip',
    ],
    maxEvents: 5,
    hasCustomBranding: true,
    hasVideoWelcoming: false,
    hasCustomOverlays: false,
  },
  pro_booth: {
    id: 'pro_booth',
    name: 'Pro Vendor Booth',
    pricePerMonth: 299000,
    badge: 'Paling Populer',
    description: 'Paling diminati vendor photobooth pernikahan & event organizer',
    features: [
      'Semua fitur Starter Kiosk',
      'Upload Custom Overlay Frame PNG',
      'Upload Video Welcoming Background',
      'Upload Custom Brand Logo & Wallpaper High-Res',
      'Koleksi Stiker & Filter Y2K Lengkap',
      'Dukungan Multi-Layout & QR Sharing',
    ],
    maxEvents: 50,
    hasCustomBranding: true,
    hasVideoWelcoming: true,
    hasCustomOverlays: true,
  },
  enterprise_vip: {
    id: 'enterprise_vip',
    name: 'Enterprise VIP Studio',
    pricePerMonth: 599000,
    badge: 'Unlimited VIP',
    description: 'Untuk vendor photobooth skala besar, mall, dan multi-kiosk',
    features: [
      'Semua fitur Pro Vendor Booth',
      'Multi-Device Kiosk Synchronization',
      'Prioritas Cloud Backup & Unlimited Events',
      'Custom Domain & White-label Brand',
      'Dedicated Support VIP 24/7',
    ],
    maxEvents: 9999,
    hasCustomBranding: true,
    hasVideoWelcoming: true,
    hasCustomOverlays: true,
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime License',
    pricePerMonth: 2499000,
    badge: 'Sekali Bayar',
    description: 'Akses penuh selamanya tanpa biaya bulanan berulang',
    features: [
      'Akses Seumur Hidup (Lifetime)',
      'Semua Fitur Enterprise VIP',
      'Gratis Update Semua Versi Baru',
      'Tanpa Batas Waktu Expired',
    ],
    maxEvents: 99999,
    hasCustomBranding: true,
    hasVideoWelcoming: true,
    hasCustomOverlays: true,
  },
};

// Seed initial demo clients if Firestore collection is empty
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'admin_master_1',
    username: 'admin',
    password: 'admin123',
    email: 'admin@snapbooth.id',
    displayName: 'Super Admin Master',
    businessName: 'snapBoth Receipt HQ Indonesia',
    role: 'super_admin',
    subscriptionStatus: 'active',
    subscriptionPlan: 'lifetime',
    subscriptionStartDate: '2025-01-01',
    subscriptionEndDate: '2099-12-31',
    phone: '085159746119',
    boothAccessPin: '9988',
    notes: 'Super Administrator Utama Platform',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client_luna_pro',
    username: 'lunabooth',
    password: 'luna123',
    email: 'luna.booth@gmail.com',
    displayName: 'Luna Photobooth Studio',
    businessName: 'Luna Creative Jakarta',
    role: 'client',
    subscriptionStatus: 'active',
    subscriptionPlan: 'pro_booth',
    subscriptionStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subscriptionEndDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 25 days remaining
    phone: '081399887766',
    boothAccessPin: '1234',
    notes: 'Vendor photobooth aktif di Jakarta Selatan',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client_wedding_vip',
    username: 'goldenwedding',
    password: 'wedding123',
    email: 'golden.wedding@organizer.com',
    displayName: 'Golden Moment Wedding',
    businessName: 'Golden Moment EO Surabaya',
    role: 'client',
    subscriptionStatus: 'active',
    subscriptionPlan: 'enterprise_vip',
    subscriptionStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subscriptionEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days remaining
    phone: '082155443322',
    boothAccessPin: '5678',
    notes: 'Langganan VIP 3 Bulan untuk Wedding Season',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client_expired_cafe',
    username: 'kopisenja',
    password: 'senja123',
    email: 'senja.cafe@kopi.id',
    displayName: 'Kopi Senja Photobox',
    businessName: 'Kafe Kopi Senja Bandung',
    role: 'client',
    subscriptionStatus: 'expired',
    subscriptionPlan: 'starter',
    subscriptionStartDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subscriptionEndDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expired 5 days ago
    phone: '087811223344',
    boothAccessPin: '4321',
    notes: 'Perlu konfirmasi perpanjangan via WhatsApp',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client_pending_reg_1',
    username: 'velvetbooth',
    password: 'velvet123',
    email: 'hello@velvetbooth.id',
    displayName: 'Velvet Memory Studio',
    businessName: 'Velvet Photobooth Bali',
    role: 'client',
    subscriptionStatus: 'pending_approval',
    approvalStatus: 'pending',
    registrationType: 'paid_registration',
    requestedDuration: 'monthly_50k',
    requestedPlanName: 'Langganan Bulanan (Rp 50.000 / 30 Hari)',
    subscriptionPlan: 'pro_booth',
    subscriptionStartDate: new Date().toISOString().split('T')[0],
    subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    phone: '081987654321',
    boothAccessPin: '8899',
    notes: 'Pendaftaran mandiri paket Bulanan Rp 50.000 - Menunggu verifikasi pembayaran & approval Super Admin',
    createdAt: new Date().toISOString(),
  },
];

// Helper: Check if duration is OFF / Unlimited
export const isDurationUnlimited = (endDateStr?: string): boolean => {
  if (!endDateStr) return true;
  return endDateStr === '2099-12-31' || endDateStr === 'unlimited' || endDateStr.startsWith('2099-');
};

// Helper: Calculate remaining days
export const calculateRemainingDays = (endDateStr: string): number => {
  if (!endDateStr) return 99999;
  if (isDurationUnlimited(endDateStr)) return 99999;
  const target = new Date(endDateStr).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Firestore User Services
export const initializeFirebaseUsers = async (): Promise<UserAccount[]> => {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
      // Seed default accounts into Firestore
      for (const user of DEFAULT_USERS) {
        await setDoc(doc(db, 'users', user.id), user);
      }
      return DEFAULT_USERS;
    }

    const users: UserAccount[] = [];
    snapshot.forEach((d) => {
      users.push({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) });
    });
    return users;
  } catch (err) {
    console.warn('Firebase connection fallback to local defaults:', err);
    return DEFAULT_USERS;
  }
};

export const subscribeToUsers = (onUpdate: (users: UserAccount[]) => void) => {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol);
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const users: UserAccount[] = [];
          snapshot.forEach((d) => {
            users.push({ id: d.id, ...(d.data() as Omit<UserAccount, 'id'>) });
          });
          onUpdate(users);
        } else {
          // Initialize if empty
          initializeFirebaseUsers().then(onUpdate);
        }
      },
      (err) => {
        console.warn('Firestore snapshot error, using cached users:', err);
      }
    );
  } catch (e) {
    console.warn('Firestore subscription failed, falling back:', e);
    return () => {};
  }
};

export const saveUserToFirestore = async (user: UserAccount): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
  }
};

// Client Custom Theme Cloud Sync
export const saveClientThemeToCloud = async (clientId: string, theme: EventTheme): Promise<void> => {
  try {
    const configRef = doc(db, 'client_configs', clientId);
    await setDoc(configRef, {
      clientId,
      themeSettings: theme,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also sync in user profile
    const userRef = doc(db, 'users', clientId);
    await updateDoc(userRef, {
      customTheme: theme,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not save theme to cloud, saved locally:', err);
  }
};

export const loadClientThemeFromCloud = async (clientId: string): Promise<EventTheme | null> => {
  try {
    const configRef = doc(db, 'client_configs', clientId);
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data().themeSettings as EventTheme;
    }
  } catch (err) {
    console.warn('Error loading theme from cloud:', err);
  }
  return null;
};
