import React, { useState, useEffect } from 'react';
import { LayoutType, EventTheme, PhotoSlot, FilterType, ImageAdjustments, StickerItem, SavedPhotoStrip, StepType } from './types';
import { DEFAULT_THEMES } from './utils/themePresets';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { StartScreen } from './components/StartScreen';
import { LayoutSelector } from './components/LayoutSelector';
import { CameraCapture } from './components/CameraCapture';
import { PrintAndShareModal } from './components/PrintAndShareModal';
import { ControlPanelModal } from './components/ControlPanelModal';

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

  // Control Panel Modal state
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(false);

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

  // Step navigation rules
  const canNavigateTo = (step: StepType) => {
    if (step === 'welcome') return true;
    if (step === 'capture') return true;
    if (step === 'theme_layout') return photos.filter(Boolean).length > 0;
    if (step === 'export') return photos.filter(Boolean).length > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Navbar Header */}
      <Header
        currentTheme={currentTheme}
        onOpenControlPanel={() => setIsControlPanelOpen(true)}
        onResetSession={handleResetSession}
        galleryCount={gallery.length}
      />

      {/* Step Progress Wizard Bar */}
      <StepIndicator
        currentStep={currentStep}
        onSelectStep={(step) => canNavigateTo(step) && setCurrentStep(step)}
        canNavigateTo={canNavigateTo}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentStep === 'welcome' && (
          <StartScreen
            currentTheme={currentTheme}
            onUpdateTheme={setCurrentTheme}
            onStartPhotobooth={() => setCurrentStep('capture')}
            onOpenThemeCustomizer={() => setIsControlPanelOpen(true)}
          />
        )}

        {currentStep === 'capture' && (
          <CameraCapture
            layout={selectedLayout}
            photos={photos}
            onPhotosChange={setPhotos}
            onContinueToLayout={() => setCurrentStep('theme_layout')}
          />
        )}

        {currentStep === 'theme_layout' && (
          <LayoutSelector
            selectedLayout={selectedLayout}
            onSelectLayout={setSelectedLayout}
            currentTheme={currentTheme}
            photos={photos}
            onOpenThemeCustomizer={() => setIsControlPanelOpen(true)}
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
          />
        )}
      </main>

      {/* Unified Control Panel System Modal */}
      <ControlPanelModal
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
        currentTheme={currentTheme}
        onSaveTheme={setCurrentTheme}
        gallery={gallery}
        onDeleteFromGallery={handleDeleteFromGallery}
        onClearGallery={handleClearGallery}
        onResetSession={handleResetSession}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>SnapBooth Studio • Photobooth Digital untuk Pesta, Pernikahan & Acara Spesial</p>
      </footer>
    </div>
  );
}

