import { useState, useEffect } from 'react';

export type OrientationSetting = 'auto' | 'portrait' | 'landscape';

export interface ScreenOrientationState {
  setting: OrientationSetting;
  effectiveOrientation: 'portrait' | 'landscape';
  isLandscape: boolean;
  isPortrait: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
}

export function useScreenOrientation(setting: OrientationSetting | string = 'auto'): ScreenOrientationState {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const { width, height } = dimensions;
  const isPhysicalLandscape = width > height;

  // Normalized setting
  const normalizedSetting: OrientationSetting =
    setting === 'landscape' ? 'landscape' : setting === 'portrait' ? 'portrait' : 'auto';

  // Determine effective orientation based on setting
  let effectiveOrientation: 'portrait' | 'landscape' = 'portrait';
  if (normalizedSetting === 'landscape') {
    effectiveOrientation = 'landscape';
  } else if (normalizedSetting === 'portrait') {
    effectiveOrientation = 'portrait';
  } else {
    // 'auto' mode: follow physical screen aspect ratio
    effectiveOrientation = isPhysicalLandscape ? 'landscape' : 'portrait';
  }

  // Device detection
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  const minDimension = Math.min(width, height);
  if (minDimension < 640) {
    deviceType = 'mobile';
  } else if (minDimension <= 1024) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  return {
    setting: normalizedSetting,
    effectiveOrientation,
    isLandscape: effectiveOrientation === 'landscape',
    isPortrait: effectiveOrientation === 'portrait',
    deviceType,
    width,
    height,
  };
}
