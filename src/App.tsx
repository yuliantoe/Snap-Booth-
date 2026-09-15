import React, { useState, useEffect } from 'react';
import { Maximize2, Sliders, RefreshCw, Tv } from 'lucide-react';
import {
  LayoutType,
  EventTheme,
  PhotoSlot,
  FilterType,
  ImageAdjustments,
  StickerItem,
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
import { ScreensaverView } from './components/ScreensaverView';
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

  // User Authentication & Subscription States
  const [usersList, setUsersList] = useState<UserAccount[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Modals state
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState<boolean>(false);
  const [isScreensaverOpen, setIsScreensaverOpen] = useState<boolean>(true);

  // Dashboard view minimize state for clean photobooth kiosk screen
  const [isDashboardMinimized, setIsDashboardMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  // Clean up legacy gallery storage
  useEffect(() => {
    try {
      localStorage.removeItem('snapbooth_gallery_v1');
    } catch {
      // ignore
    }
  }, []);

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
    setIsAuthModalOpen(false);
    setIsScreensaverOpen(true);
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

  // Auto-launch fullscreen promotional screensaver when kiosk is idle on welcome screen
  useEffect(() => {
    if (
      currentStep !== 'welcome' ||
      isScreensaverOpen ||
      isControlPanelOpen ||
      isSuperAdminOpen ||
      isAuthModalOpen ||
      isExpiredModalOpen
    ) {
      return;
    }

    if (currentTheme.screensaverEnabled === false) {
      return;
    }

    const idleSeconds =
      currentTheme.screensaverIdleSeconds !== undefined
        ? currentTheme.screensaverIdleSeconds
        : 45;

    if (idleSeconds <= 0) {
      return; // 0 means manual only
    }

    const SCREENSAVER_TIMEOUT_MS = idleSeconds * 1000;
    let timer: NodeJS.Timeout;

    const resetScreensaverTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsScreensaverOpen(true);
      }, SCREENSAVER_TIMEOUT_MS);
    };

    resetScreensaverTimer();

    const interactionEvents = [
      'mousemove',
      'mousedown',
      'touchstart',
      'touchmove',
      'keydown',
      'scroll',
      'click',
    ];

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, resetScreensaverTimer, { passive: true });
    });

    return () => {
      if (timer) clearTimeout(timer);
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, resetScreensaverTimer);
      });
    };
  }, [
    currentStep,
    isScreensaverOpen,
    isControlPanelOpen,
    isSuperAdminOpen,
    isAuthModalOpen,
    isExpiredModalOpen,
    currentTheme.screensaverEnabled,
    currentTheme.screensaverIdleSeconds,
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
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#f0f2f5] text-stone-900 flex flex-col font-sans selection:bg-orange-600 selection:text-white antialiased select-none">
      {/* Navbar Header with Multi-Role Badges, User Dropdown, and Logout */}
      {!isDashboardMinimized ? (
        <div className="shrink-0 z-40 bg-white/95 backdrop-blur-md">
          <Header
            currentTheme={currentTheme}
            currentUser={currentUser}
            onOpenControlPanel={handleOpenControlPanel}
            onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onResetSession={handleResetSession}
            onToggleOrientation={handleToggleOrientation}
            isDashboardMinimized={isDashboardMinimized}
            onToggleMinimizeDashboard={() => setIsDashboardMinimized(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenScreensaver={() => setIsScreensaverOpen(true)}
          />

          {/* Step Progress Wizard Bar */}
          <StepIndicator
            currentStep={currentStep}
            currentUser={currentUser}
            onSelectStep={(step) => canNavigateTo(step) && setCurrentStep(step)}
            canNavigateTo={canNavigateTo}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        </div>
      ) : (
        /* Sleek Floating Minimized Dashboard Dock on Main Screen */
        <header className="sticky top-2 z-50 flex justify-center px-3 pointer-events-none shrink-0">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:py-2 rounded-full bg-stone-900/90 text-white border border-stone-700/90 shadow-xl backdrop-blur-md text-xs font-mono animate-in slide-in-from-top-2 duration-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-[10px] sm:text-[11px] text-stone-100">DASHBOARD MINIMIZED</span>
              <span className="text-stone-500 text-[10px] hidden sm:inline">•</span>
              <span className="text-stone-300 text-[10px] truncate max-w-[140px] hidden sm:inline font-sans">
                {currentTheme.eventTitle || 'SnapBooth Event'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-stone-700/80 pl-2 ml-1">
              <button
                type="button"
                onClick={() => setIsDashboardMinimized(false)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer shadow-sm active:scale-95"
                title="Buka kembali tampilan dashboard utama"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden xs:inline">Buka</span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScreensaverOpen(true)}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-orange-400 hover:text-white transition-all cursor-pointer"
                title="Buka Media Promosi (Screensaver Fullscreen)"
              >
                <Tv className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleOpenControlPanel}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
                title="Buka Pengaturan Booth"
              >
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
                title="Mulai Sesi Foto Baru"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-300" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area - 100% Screen Height, Zero External Scroll */}
      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
        {currentStep === 'welcome' && (
          <StartScreen
            currentTheme={currentTheme}
            currentUser={currentUser}
            onUpdateTheme={setCurrentTheme}
            onStartPhotobooth={handleStartPhotobooth}
            onOpenThemeCustomizer={handleOpenControlPanel}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isDashboardMinimized={isDashboardMinimized}
            onToggleMinimizeDashboard={() => setIsDashboardMinimized(!isDashboardMinimized)}
            onOpenScreensaver={() => setIsScreensaverOpen(true)}
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
        onResetSession={handleResetSession}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenScreensaver={() => setIsScreensaverOpen(true)}
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

      {/* Fullscreen Promotional Screensaver for Schools, Cafes & Companies */}
      {isScreensaverOpen && (
        <ScreensaverView
          currentTheme={currentTheme}
          currentUser={currentUser}
          onStartPhotobooth={() => {
            setIsScreensaverOpen(false);
            if (!currentUser) {
              setIsAuthModalOpen(true);
            } else {
              handleStartPhotobooth();
            }
          }}
          onOpenLogin={() => {
            setIsScreensaverOpen(false);
            setIsAuthModalOpen(true);
          }}
          onClose={() => {
            setIsScreensaverOpen(false);
            if (!currentUser) {
              setIsAuthModalOpen(true);
            }
          }}
        />
      )}

      {/* Footer - Slim & hidden when minimized or on mobile to preserve full screen height without scroll */}
      {!isDashboardMinimized && (
        <footer className="border-t border-stone-200/70 bg-[#e8eaed] py-1 px-3 text-center text-[10px] text-stone-400 font-mono shrink-0 hidden md:block select-none">
          <p>SnapBooth Receipt • Photobooth Digital Kiosk System</p>
        </footer>
      )}
    </div>
  );
}
