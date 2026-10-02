import { useState, useEffect, useCallback, useRef } from 'react';

export interface FullscreenState {
  isFullscreen: boolean;
  isNativeSupported: boolean;
  isSimulated: boolean;
  isIos: boolean;
  isStandalone: boolean;
  toggleFullscreen: () => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  showIosPrompt: boolean;
  dismissIosPrompt: () => void;
}

/**
 * Detect iOS device (iPhone, iPad, iPod, or iPadOS with desktop Safari UA)
 */
export const isIosDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );
};

/**
 * Detect if web app is running in Standalone (PWA / Added to Home Screen)
 */
export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

/**
 * Check if the browser natively supports any HTML5 Fullscreen API variant
 */
export const isNativeFullscreenAvailable = (): boolean => {
  if (typeof document === 'undefined') return false;
  const elem = document.documentElement as unknown as {
    requestFullscreen?: unknown;
    webkitRequestFullscreen?: unknown;
    webkitRequestFullScreen?: unknown;
    mozRequestFullScreen?: unknown;
    msRequestFullscreen?: unknown;
  };
  return Boolean(
    elem.requestFullscreen ||
    elem.webkitRequestFullscreen ||
    elem.webkitRequestFullScreen ||
    elem.mozRequestFullScreen ||
    elem.msRequestFullscreen
  );
};

/**
 * Get active native fullscreen element across all browser vendor prefixes
 */
export const getNativeFullscreenElement = (): Element | null => {
  if (typeof document === 'undefined') return null;
  const doc = document as unknown as {
    fullscreenElement?: Element | null;
    webkitFullscreenElement?: Element | null;
    webkitCurrentFullScreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.webkitCurrentFullScreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
};

/**
 * Request native fullscreen with vendor prefixes
 */
export const requestNativeFullscreen = async (element: HTMLElement = document.documentElement): Promise<boolean> => {
  const elem = element as unknown as {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void> | void;
    webkitRequestFullScreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (typeof elem.requestFullscreen === 'function') {
      await elem.requestFullscreen();
      return true;
    }
    if (typeof elem.webkitRequestFullscreen === 'function') {
      await elem.webkitRequestFullscreen();
      return true;
    }
    if (typeof elem.webkitRequestFullScreen === 'function') {
      await elem.webkitRequestFullScreen();
      return true;
    }
    if (typeof elem.mozRequestFullScreen === 'function') {
      await elem.mozRequestFullScreen();
      return true;
    }
    if (typeof elem.msRequestFullscreen === 'function') {
      await elem.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[Fullscreen] Native request error, falling back to simulated:', err);
    return false;
  }
  return false;
};

/**
 * Exit native fullscreen with vendor prefixes
 */
export const exitNativeFullscreen = async (): Promise<boolean> => {
  const doc = document as unknown as {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitCancelFullScreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
      return true;
    }
    if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
      return true;
    }
    if (typeof doc.webkitCancelFullScreen === 'function') {
      await doc.webkitCancelFullScreen();
      return true;
    }
    if (typeof doc.mozCancelFullScreen === 'function') {
      await doc.mozCancelFullScreen();
      return true;
    }
    if (typeof doc.msExitFullscreen === 'function') {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[Fullscreen] Native exit error:', err);
    return false;
  }
  return false;
};

/**
 * Global Screen WakeLock holder to prevent tablet/phone screens from sleeping in kiosk mode
 */
let globalWakeLock: { release: () => Promise<void> } | null = null;

const requestScreenWakeLock = async () => {
  try {
    if ('wakeLock' in navigator && !globalWakeLock) {
      const lock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
      globalWakeLock = lock;
    }
  } catch {
    // Ignore permissions/wake lock failure
  }
};

const releaseScreenWakeLock = async () => {
  try {
    if (globalWakeLock) {
      await globalWakeLock.release();
      globalWakeLock = null;
    }
  } catch {
    // Ignore
  }
};

const IOS_PROMPT_STORAGE_KEY = 'snapbooth_ios_fullscreen_tip_dismissed';

/**
 * useFullscreen hook
 * Provides rock-solid fullscreen support across:
 * - Desktop browsers (Chrome, Edge, Safari, Firefox)
 * - Android tablets and phones
 * - Apple iPads and iPhones (including WebKit simulated kiosk mode & iOS Add-to-Home-Screen prompt)
 */
export function useFullscreen(): FullscreenState {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return Boolean(getNativeFullscreenElement());
  });
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [showIosPrompt, setShowIosPrompt] = useState<boolean>(false);

  const isNativeSupported = isNativeFullscreenAvailable();
  const isIos = isIosDevice();
  const isStandalone = isStandaloneMode();

  const isSimulatedRef = useRef<boolean>(isSimulated);
  isSimulatedRef.current = isSimulated;

  // Sync native fullscreen changes
  useEffect(() => {
    const handleNativeChange = () => {
      const active = Boolean(getNativeFullscreenElement());
      if (active) {
        setIsFullscreen(true);
        setIsSimulated(false);
        document.body.classList.add('snapbooth-fullscreen-mode');
        requestScreenWakeLock();
      } else {
        // If native fullscreen was exited, and we are not in simulated mode, exit fullscreen state
        if (!isSimulatedRef.current) {
          setIsFullscreen(false);
          document.body.classList.remove('snapbooth-fullscreen-mode');
          releaseScreenWakeLock();
        }
      }
    };

    const vendorEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];

    vendorEvents.forEach((evt) => document.addEventListener(evt, handleNativeChange));

    return () => {
      vendorEvents.forEach((evt) => document.removeEventListener(evt, handleNativeChange));
    };
  }, []);

  // Listen for Escape key on simulated fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSimulatedRef.current) {
        exitFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dismissIosPrompt = useCallback(() => {
    setShowIosPrompt(false);
    try {
      localStorage.setItem(IOS_PROMPT_STORAGE_KEY, 'true');
    } catch {
      // Ignore
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    // 1. Try native fullscreen if available
    let nativeSuccess = false;
    if (isNativeSupported) {
      nativeSuccess = await requestNativeFullscreen(document.documentElement);
    }

    if (nativeSuccess && getNativeFullscreenElement()) {
      setIsFullscreen(true);
      setIsSimulated(false);
      document.body.classList.add('snapbooth-fullscreen-mode');
      requestScreenWakeLock();
      return;
    }

    // 2. Fallback to Simulated Fullscreen (Kiosk Mode)
    // Especially on iPhone and certain iPad/Android WebViews where native requestFullscreen is blocked or unavailable
    setIsFullscreen(true);
    setIsSimulated(true);
    document.body.classList.add('snapbooth-fullscreen-mode');

    // Attempt to hide mobile address bar by scrolling
    try {
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 100);
    } catch {
      // Ignore
    }

    requestScreenWakeLock();

    // Check if we should show iOS Home Screen tip
    if (isIos && !isStandalone) {
      try {
        const dismissed = localStorage.getItem(IOS_PROMPT_STORAGE_KEY);
        if (!dismissed) {
          setShowIosPrompt(true);
        }
      } catch {
        setShowIosPrompt(true);
      }
    }
  }, [isNativeSupported, isIos, isStandalone]);

  const exitFullscreen = useCallback(async () => {
    // Exit native if active
    if (getNativeFullscreenElement()) {
      await exitNativeFullscreen();
    }

    setIsFullscreen(false);
    setIsSimulated(false);
    document.body.classList.remove('snapbooth-fullscreen-mode');
    releaseScreenWakeLock();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen || isSimulated || getNativeFullscreenElement()) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, isSimulated, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isNativeSupported,
    isSimulated,
    isIos,
    isStandalone,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    showIosPrompt,
    dismissIosPrompt,
  };
}
