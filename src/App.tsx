import React, { useState, useEffect } from 'react';
import {
  LayoutType,
  EventTheme,
  PhotoSlot,
  FilterType,
  ImageAdjustments,
  StickerItem,
  SavedPhotoStrip,
  StepType,
  UserAccount,
} from './types';
import { DEFAULT_THEMES } from './utils/themePresets';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { StartScreen } from './components/StartScreen';
import { LayoutSelector } from './components/LayoutSelector';
import { CameraCapture } from './components/CameraCapture';
import { PrintAndShareModal } from './components/PrintAndShareModal';
import { ControlPanelModal } from './components/ControlPanelModal';
import { AuthModal } from './components/AuthModal';
import { SuperAdminModal } from './components/SuperAdminModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import {
  DEFAULT_USERS,
  subscribeToUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveClientThemeToCloud,
  loadClientThemeFromCloud,
  calculateRemainingDays,
} from './services/subscriptionService';

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepType>('welcome');
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('strip4');
  const [currentTheme, setCurrentTheme] = useState<EventTheme>(DEFAULT_THEMES[0]);
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [filter, setFilter] = useState<FilterType>('normal');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 1,
    contrast: 1,
    saturation: 1,
    sepia: 0,
    blur: 0,
  });
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [gallery, setGallery] = useState<SavedPhotoStrip[]>([]);

  // User Authentication & Subscription States
  const [usersList, setUsersList] = useState<UserAccount[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Modals state
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState<boolean>(false);

  // 1. Subscribe to Firestore Real-time Users List
  useEffect(() => {
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      if (updatedUsers && updatedUsers.length > 0) {
        setUsersList(updatedUsers);

        // If current user is logged in, sync their latest subscription info
        if (currentUser) {
          const fresh = updatedUsers.find((u) => u.id === currentUser.id);
          if (fresh) {
            setCurrentUser(fresh);
          }
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.id]);

  // 2. Initialize Current User from LocalStorage
  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem('snapbooth_active_user_id');
      if (savedUserId) {
        const found = usersList.find((u) => u.id === savedUserId);
        if (found) {
          setCurrentUser(found);
          return;
        }
      }
      // If no saved user in localStorage, user remains logged out (null)
      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // 3. Sync Client Custom Theme from Firestore Cloud when currentUser changes
  useEffect(() => {
    if (currentUser?.id) {
      loadClientThemeFromCloud(currentUser.id).then((cloudTheme) => {
        if (cloudTheme) {
          setCurrentTheme(cloudTheme);
        } else if (currentUser.customTheme) {
          setCurrentTheme(currentUser.customTheme);
        }
      });
    } else {
      // Default theme for logged out state
      setCurrentTheme(DEFAULT_THEMES[0]);
    }
  }, [currentUser?.id]);

  // Load saved session gallery from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('snapbooth_gallery_v1');
      if (stored) {
        setGallery(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save gallery to localStorage
  const handleSaveToGallery = (newStrip: SavedPhotoStrip) => {
    setGallery((prev) => {
      const exists = prev.some((item) => item.id === newStrip.id);
      if (exists) return prev;
      const updated = [newStrip, ...prev];
      try {
        localStorage.setItem('snapbooth_gallery_v1', JSON.stringify(updated));
      } catch {
        // storage quota fallback
      }
      return updated;
    });
  };

  const handleDeleteFromGallery = (id: string) => {
    const updated = gallery.filter((item) => item.id !== id);
    setGallery(updated);
    try {
      localStorage.setItem('snapbooth_gallery_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleClearGallery = () => {
    setGallery([]);
    try {
      localStorage.removeItem('snapbooth_gallery_v1');
    } catch {
      // ignore
    }
  };

  // Reset current session for new photos
  const handleResetSession = () => {
    setPhotos([]);
    setFilter('normal');
    setAdjustments({ brightness: 1, contrast: 1, saturation: 1, sepia: 0, blur: 0 });
    setStickers([]);
    setCurrentStep('welcome');
  };

  // Handle Control Panel Opening with Subscription Check
  const handleOpenControlPanel = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Super Admin always has access
    if (currentUser.role === 'super_admin') {
      setIsControlPanelOpen(true);
      return;
    }

    // Client: Check subscription status
    const remainingDays = calculateRemainingDays(currentUser.subscriptionEndDate);
    const isExpired = currentUser.subscriptionStatus === 'expired' || remainingDays < 0;

    if (isExpired || currentUser.subscriptionStatus === 'suspended' || currentUser.subscriptionStatus === 'pending_approval') {
      setIsExpiredModalOpen(true);
      return;
    }

    // Active client: open dashboard
    setIsControlPanelOpen(true);
  };

  // Save Theme Updates and Sync to Cloud Firestore
  const handleSaveTheme = async (updatedTheme: EventTheme) => {
    setCurrentTheme(updatedTheme);
    if (currentUser?.id) {
      await saveClientThemeToCloud(currentUser.id, updatedTheme);
    }
  };

  // Handle User Login / Switch
  const handleUserLogin = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('snapbooth_active_user_id', user.id);
    } catch {
      // ignore
    }
  };

  // Handle User Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('snapbooth_active_user_id');
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setPhotos([]);
    setCurrentStep('welcome');
    setIsControlPanelOpen(false);
    setIsSuperAdminOpen(false);
    setIsAuthModalOpen(true);
  };

  // Handle Super Admin Updates
  const handleUpdateUser = async (userId: string, updates: Partial<UserAccount>) => {
    const existing = usersList.find((u) => u.id === userId);
    if (!existing) return;

    const merged: UserAccount = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setUsersList((prev) => prev.map((u) => (u.id === userId ? merged : u)));
    await saveUserToFirestore(merged);

    if (currentUser?.id === userId) {
      setCurrentUser(merged);
    }
  };

  const handleCreateUser = async (newUserData: Omit<UserAccount, 'id' | 'createdAt'>): Promise<UserAccount> => {
    const newId = `client_${Date.now()}`;
    const newUser: UserAccount = {
      id: newId,
      ...newUserData,
      createdAt: new Date().toISOString(),
    };

    setUsersList((prev) => [newUser, ...prev]);
    await saveUserToFirestore(newUser);
    return newUser;
  };

  const handleDeleteUser = async (userId: string) => {
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    await deleteUserFromFirestore(userId);
    if (currentUser?.id === userId) {
      // Fallback to Super Admin or default client
      const fallback = usersList.find((u) => u.id !== userId) || DEFAULT_USERS[0];
      handleUserLogin(fallback);
    }
  };

  // Auto-return to welcome screen after configurable idle minutes of inactivity when not on welcome screen
  useEffect(() => {
    if (
      currentStep === 'welcome' ||
      isControlPanelOpen ||
      isSuperAdminOpen ||
      isAuthModalOpen ||
      isExpiredModalOpen
    ) {
      return;
    }

    const idleMinutes =
      currentTheme.idleTimeoutMinutes !== undefined
        ? currentTheme.idleTimeoutMinutes
        : currentTheme.idleTimeoutSeconds !== undefined
        ? currentTheme.idleTimeoutSeconds
        : 3;

    if (idleMinutes <= 0) {
      return; // 0 or negative means auto-reset is disabled
    }

    const IDLE_TIMEOUT_MS = idleMinutes * 60 * 1000; // Convert minutes to milliseconds
    let timer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        handleResetSession();
      }, IDLE_TIMEOUT_MS);
    };

    // Start initial timer
    resetIdleTimer();

    // Listen for user interaction events across the page
    const interactionEvents = [
      'mousemove',
      'mousedown',
      'touchstart',
      'touchmove',
      'keydown',
      'scroll',
      'click',
      'pointerdown',
    ];

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    return () => {
      if (timer) clearTimeout(timer);
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, resetIdleTimer);
      });
    };
  }, [
    currentStep,
    isControlPanelOpen,
    isSuperAdminOpen,
    isAuthModalOpen,
    isExpiredModalOpen,
    currentTheme.idleTimeoutMinutes,
    currentTheme.idleTimeoutSeconds,
  ]);

  // Step navigation rules: before login, photo steps (capture, layout, export) are inactive
  const canNavigateTo = (step: StepType) => {
    if (step === 'welcome') return true;
    if (!currentUser) return false; // Sebelum login menu foto tidak aktif
    if (step === 'capture') return true;
    if (step === 'theme_layout') return photos.filter(Boolean).length > 0;
    if (step === 'export') return photos.filter(Boolean).length > 0;
    return false;
  };

  // Handle Starting Photo Session with Login Check
  const handleStartPhotobooth = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Super Admin always has access
    if (currentUser.role === 'super_admin') {
      setCurrentStep('capture');
      return;
    }

    // Client: Check subscription status
    const remainingDays = calculateRemainingDays(currentUser.subscriptionEndDate);
    const isExpired = currentUser.subscriptionStatus === 'expired' || remainingDays < 0;

    if (isExpired || currentUser.subscriptionStatus === 'suspended' || currentUser.subscriptionStatus === 'pending_approval') {
      setIsExpiredModalOpen(true);
      return;
    }

    setCurrentStep('capture');
  };

  const handleToggleOrientation = () => {
    const current = currentTheme.tabletOrientation || 'auto';
    const nextOrientation: 'auto' | 'portrait' | 'landscape' =
      current === 'auto' ? 'portrait' : current === 'portrait' ? 'landscape' : 'auto';
    handleSaveTheme({ ...currentTheme, tabletOrientation: nextOrientation });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Navbar Header with Multi-Role Badges, User Dropdown, and Logout */}
      <Header
        currentTheme={currentTheme}
        currentUser={currentUser}
        onOpenControlPanel={handleOpenControlPanel}
        onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onResetSession={handleResetSession}
        galleryCount={gallery.length}
        onToggleOrientation={handleToggleOrientation}
      />

      {/* Step Progress Wizard Bar */}
      <StepIndicator
        currentStep={currentStep}
        currentUser={currentUser}
        onSelectStep={(step) => canNavigateTo(step) && setCurrentStep(step)}
        canNavigateTo={canNavigateTo}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentStep === 'welcome' && (
          <StartScreen
            currentTheme={currentTheme}
            currentUser={currentUser}
            onUpdateTheme={setCurrentTheme}
            onStartPhotobooth={handleStartPhotobooth}
            onOpenThemeCustomizer={handleOpenControlPanel}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentStep === 'capture' && (
          <CameraCapture
            layout={selectedLayout}
            photos={photos}
            onPhotosChange={setPhotos}
            onContinueToLayout={() => setCurrentStep('theme_layout')}
            tabletOrientation={currentTheme.tabletOrientation}
            autoPrintEnabled={currentTheme.autoPrintEnabled}
          />
        )}

        {currentStep === 'theme_layout' && (
          <LayoutSelector
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            currentTheme={currentTheme}
            photos={photos}
            onOpenThemeCustomizer={handleOpenControlPanel}
            onContinueToExport={() => setCurrentStep('export')}
          />
        )}

        {currentStep === 'export' && (
          <PrintAndShareModal
            layout={selectedLayout}
            theme={currentTheme}
            photos={photos}
            filter={filter}
            adjustments={adjustments}
            stickers={stickers}
            onSaveToGallery={handleSaveToGallery}
            onResetSession={handleResetSession}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Unified Client Control Panel System Modal */}
      <ControlPanelModal
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
        currentTheme={currentTheme}
        onSaveTheme={handleSaveTheme}
        gallery={gallery}
        onDeleteFromGallery={handleDeleteFromGallery}
        onClearGallery={handleClearGallery}
        onResetSession={handleResetSession}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Super Admin Management Portal Modal */}
      <SuperAdminModal
        isOpen={isSuperAdminOpen}
        onClose={() => setIsSuperAdminOpen(false)}
        usersList={usersList}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
        onImpersonateUser={handleUserLogin}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Auth & Subscription Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        usersList={usersList}
        onLogin={handleUserLogin}
        onRegisterClient={handleCreateUser}
        onLogout={handleLogout}
      />

      {/* Subscription Expired Alert Modal */}
      <SubscriptionExpiredModal
        isOpen={isExpiredModalOpen}
        onClose={() => setIsExpiredModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>snapBoth Receipt • Photobooth Digital Receipt untuk Cafe, Bisnis, Pesta, Pernikahan & Acara Spesial</p>
      </footer>
    </div>
  );
}
