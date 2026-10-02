import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, FlipHorizontal, Trash2, ArrowRight, Play, CheckCircle2, AlertCircle, SwitchCamera, Sparkles, Maximize2, Minimize2, Eye } from 'lucide-react';
import { PhotoSlot, LayoutType } from '../types';
import { sounds } from '../utils/audio';
import { useScreenOrientation } from '../utils/useScreenOrientation';

interface CameraCaptureProps {
  layout: LayoutType;
  photos: PhotoSlot[];
  onPhotosChange: (updatedPhotos: PhotoSlot[]) => void;
  onContinueToLayout: () => void;
  tabletOrientation?: 'auto' | 'portrait' | 'landscape';
  autoPrintEnabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  layout,
  photos,
  onPhotosChange,
  onContinueToLayout,
  tabletOrientation = 'auto',
  autoPrintEnabled = false,
}) => {
  const orientationState = useScreenOrientation(tabletOrientation);
  const isLandscape = orientationState.isLandscape;
  const isTablet = orientationState.deviceType === 'tablet' || (orientationState.width >= 600 && orientationState.width <= 1280) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && orientationState.width <= 1366);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [countdownTimer, setCountdownTimer] = useState<number>(3); // 3, 5, 10
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [isBurstMode, setIsBurstMode] = useState<boolean>(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [retakeFeedback, setRetakeFeedback] = useState<string | null>(null);
  const [isStreamPortrait, setIsStreamPortrait] = useState<boolean>(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState<boolean>(false);
  const [videoFit, setVideoFit] = useState<'cover' | 'contain'>('cover');

  const handleVideoMetadata = () => {
    const v = videoRef.current;
    if (v && v.videoWidth > 0 && v.videoHeight > 0) {
      setIsStreamPortrait(v.videoHeight > v.videoWidth);
    }
  };

  const getRequiredSlotCount = (l: LayoutType): number => {
    switch (l) {
      case 'polaroid':
      case 'magazine':
      case 'calendar_single':
      case 'tiktok_viral':
      case 'instagram_post':
      case 'instagram_story':
        return 1;
      case 'photocard':
        return 2;
      case 'strip3':
        return 3;
      default:
        return 4;
    }
  };

  const requiredCount = getRequiredSlotCount(layout);

// Helper function to generate clean studio sample pose photos when camera is unavailable or for instant demo
const createDemoPosePhoto = (poseIndex: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const studioTones = [
    { title: 'PORTRAIT STUDIO 01', bg: ['#282930', '#15161c'], subText: 'Natural Lighting • Pose 1' },
    { title: 'PORTRAIT STUDIO 02', bg: ['#2b2824', '#171613'], subText: 'Warm Minimalist • Pose 2' },
    { title: 'PORTRAIT STUDIO 03', bg: ['#21262d', '#111419'], subText: 'Cool Graphite • Pose 3' },
    { title: 'PORTRAIT STUDIO 04', bg: ['#262329', '#141217'], subText: 'Editorial Mono • Pose 4' },
  ];

  const p = studioTones[poseIndex % studioTones.length];

  // Draw subtle gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, p.bg[0]);
  grad.addColorStop(1, p.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Elegant subtle inner studio frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  // Soft circle backdrop
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(960, 630, 360, 0, Math.PI * 2);
  ctx.fill();

  // Draw minimalist camera icon watermark
  ctx.font = '120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText('📸', 960, 580);

  // Draw Title text
  ctx.font = 'bold 54px "Space Mono", monospace';
  ctx.fillStyle = '#f1f2f6';
  ctx.letterSpacing = '3px';
  ctx.fillText(p.title, 960, 930);

  ctx.font = '32px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText(p.subText, 960, 1010);

  return canvas.toDataURL('image/jpeg', 0.98);
};

// Initialize camera stream with progressive fallbacks
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isSubscribed = true;

    async function initCamera() {
      setCameraError(null);

      // Try enumerating available devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const deviceList = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = deviceList.filter((d) => d.kind === 'videoinput');
          if (isSubscribed) setDevices(videoDevices);
        } catch (e) {
          console.warn('Unable to enumerate media devices:', e);
        }
      }

      let mediaStream: MediaStream | null = null;

      // Tier 1: Try Full HD 1080p (ideal 1920x1080, min 1280x720)
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: selectedDeviceId, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
            : { facingMode: facingMode, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } },
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        console.warn('Camera level 1 constraint failed, trying fallback...', err1);
        
        // Tier 2: Flexible width/height 720p+
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: selectedDeviceId
              ? { deviceId: selectedDeviceId, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch (err2) {
          console.warn('Camera level 2 constraint failed, trying basic video...', err2);
          
          // Tier 3: Basic video stream
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (err3) {
            console.warn('All camera userMedia constraints failed:', err3);
          }
        }
      }

      if (mediaStream && isSubscribed) {
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraError(null);
      } else if (isSubscribed) {
        setCameraError(
          'Kamera tidak terdeteksi atau izin ditolak. Anda dapat menggunakan Foto Demo studio otomatis atau memeriksa izin kamera browser.'
        );
      }
    }

    initCamera();

    return () => {
      isSubscribed = false;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, facingMode]);

  const photosRef = useRef<PhotoSlot[]>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Initial slot selection: find first empty slot on mount or when requiredCount changes
  useEffect(() => {
    const firstEmpty = Array.from({ length: requiredCount }).findIndex((_, idx) => !photosRef.current[idx]);
    if (firstEmpty !== -1) {
      setActiveSlotIndex(firstEmpty);
    } else {
      setActiveSlotIndex(0);
    }
  }, [requiredCount]);

  // Single Shutter Snapshot logic with video or demo pose fallback
  const capturePhotoToSlot = (slotIdx: number) => {
    sounds.playShutterSound();
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const wasRetake = Boolean(photosRef.current[slotIdx]);

    let dataUrl = '';
    const video = videoRef.current;

    if (video && video.srcObject && video.readyState >= 2 && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      }
    }

    // Fallback to sample pose photo if stream is unavailable
    if (!dataUrl) {
      dataUrl = createDemoPosePhoto(slotIdx);
    }

    const newSlot: PhotoSlot = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
      capturedAt: Date.now(),
    };

    const updated = [...photosRef.current];
    updated[slotIdx] = newSlot;
    photosRef.current = updated;
    onPhotosChange(updated);

    if (wasRetake) {
      setRetakeFeedback(`Foto #${slotIdx + 1} berhasil diperbarui!`);
      setTimeout(() => setRetakeFeedback(null), 3000);
    }

    // Auto-advance logic:
    // If there is another empty slot, move to it.
    // If all slots are filled (e.g. retaking a photo in full session), keep active slot here for user verification.
    const nextEmpty = Array.from({ length: requiredCount }).findIndex((_, idx) => !updated[idx]);
    if (nextEmpty !== -1) {
      setActiveSlotIndex(nextEmpty);
    } else {
      setActiveSlotIndex(slotIdx);
    }
  };

  // Populate all slots with demo photos instantly
  const handlePopulateDemoPhotos = () => {
    sounds.playShutterSound();
    const demoPhotos: PhotoSlot[] = Array.from({ length: requiredCount }).map((_, idx) => ({
      id: `photo_demo_${Date.now()}_${idx}`,
      dataUrl: createDemoPosePhoto(idx),
      capturedAt: Date.now(),
    }));
    photosRef.current = demoPhotos;
    onPhotosChange(demoPhotos);
  };

  // Trigger capture with Countdown
  const handleStartCapture = (targetSlot: number) => {
    if (countdownTimer === 0) {
      capturePhotoToSlot(targetSlot);
      return;
    }

    let current = countdownTimer;
    setActiveCountdown(current);
    sounds.playCountdownBeep(false);

    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setActiveCountdown(current);
        sounds.playCountdownBeep(false);
      } else {
        clearInterval(interval);
        setActiveCountdown(null);
        sounds.playCountdownBeep(true);
        capturePhotoToSlot(targetSlot);
      }
    }, 1000);
  };

  // Start Burst Mode (Sequential automatic photos for all empty or all slots)
  const handleStartBurstMode = async () => {
    setIsBurstMode(true);

    for (let slotIdx = 0; slotIdx < requiredCount; slotIdx++) {
      setActiveSlotIndex(slotIdx);

      // Countdown per photo
      for (let c = countdownTimer > 0 ? countdownTimer : 3; c > 0; c--) {
        setActiveCountdown(c);
        sounds.playCountdownBeep(c === 1);
        await new Promise((res) => setTimeout(res, 1000));
      }

      setActiveCountdown(null);
      capturePhotoToSlot(slotIdx);
      await new Promise((res) => setTimeout(res, 800)); // pause between poses
    }

    setIsBurstMode(false);
  };

  const handleRemovePhoto = (slotIdx: number) => {
    const updated = [...photosRef.current];
    // Delete only the specific slot without shifting indices of other photos
    delete updated[slotIdx];
    const cleanArray: PhotoSlot[] = [];
    for (let i = 0; i < requiredCount; i++) {
      if (updated[i]) {
        cleanArray[i] = updated[i];
      }
    }
    photosRef.current = cleanArray;
    onPhotosChange(cleanArray);
    setActiveSlotIndex(slotIdx);
  };

  const handleResetAllPhotos = () => {
    photosRef.current = [];
    onPhotosChange([]);
    setActiveSlotIndex(0);
    setShowResetConfirm(false);
  };

  const filledCount = photos.filter(Boolean).length;
  const isAllFilled = filledCount >= requiredCount;
  const currentSlotPhoto = photos[activeSlotIndex];
  const isRetakingActiveSlot = Boolean(currentSlotPhoto);

  // Render Viewfinder element (reusable across normal and maximized modes)
  const renderViewfinder = (isMaxMode = false) => (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
      isMaxMode ? 'rounded-none' : 'rounded-xl sm:rounded-2xl'
    } bg-[#0a0b0e] border border-zinc-800 shadow-xl`}>
      {/* Viewfinder Reticle Corners */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-zinc-500/60 pointer-events-none z-10" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-zinc-500/60 pointer-events-none z-10" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-zinc-500/60 pointer-events-none z-10" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-zinc-500/60 pointer-events-none z-10" />

      {/* Flash Overlay Effect */}
      {flashEffect && <div className="absolute inset-0 bg-white z-30 animate-ping opacity-95 pointer-events-none" />}

      {/* Countdown Overlay */}
      {activeCountdown !== null && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <span className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono tracking-tighter text-orange-500 drop-shadow-lg">
            {activeCountdown}
          </span>
          <span className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-widest text-stone-200 mt-4 px-4 py-1.5 rounded-full bg-stone-900/90 border border-stone-700 shadow-md">
            BERSIAP FOTO #{activeSlotIndex + 1}
          </span>
        </div>
      )}

      {/* Video Stream */}
      {!cameraError ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoMetadata}
          onCanPlay={handleVideoMetadata}
          className={`w-full h-full transition-transform ${videoFit === 'cover' ? 'object-cover' : 'object-contain'} ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />
      ) : (
        <div className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4 max-w-md z-10">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-white">Kamera Fisik Tidak Aktif</p>
            <p className="text-xs text-stone-400 leading-relaxed font-mono">{cameraError}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={handlePopulateDemoPhotos}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-orange-500"
            >
              <Camera className="w-4 h-4" /> Gunakan Foto Demo Studio
            </button>
            <button
              onClick={() => setSelectedDeviceId((prev) => (prev ? '' : 'retry'))}
              className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium text-xs border border-stone-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Viewfinder Toolbar */}
      <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between z-20 pointer-events-auto gap-2">
        {/* Left: Slot Status Badge */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-medium text-stone-800 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isRetakingActiveSlot ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="font-bold">SLOT #{activeSlotIndex + 1} / {requiredCount}</span>
          {isRetakingActiveSlot ? (
            <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border border-orange-300 font-bold ml-0.5 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" /> FOTO ULANG
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 font-bold ml-0.5">
              SIAP
            </span>
          )}
        </div>

        {/* Right: Camera Tools (Device, Flip, Mirror, Fit, Maximize) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switch Device Dropdown */}
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-white/95 backdrop-blur-md text-xs text-stone-800 border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none max-w-[120px] sm:max-w-none truncate font-mono shadow-xs cursor-pointer"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Video Fit (Cover / Contain) */}
          <button
            type="button"
            onClick={() => setVideoFit((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
            className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-all border shadow-xs cursor-pointer text-xs font-mono flex items-center gap-1 ${
              videoFit === 'cover'
                ? 'bg-white/95 text-stone-700 hover:text-stone-900 border-stone-300'
                : 'bg-stone-900 text-white border-stone-700 font-bold'
            }`}
            title={videoFit === 'cover' ? 'Penuh Layar (Klik untuk mode Asli)' : 'Asli Kamera (Klik untuk Penuh Layar)'}
          >
            <Eye className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden md:inline">{videoFit === 'cover' ? 'Penuh' : 'Asli'}</span>
          </button>

          {/* Flip Camera Facing Mode */}
          <button
            type="button"
            onClick={() => {
              setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
              setIsMirrored((prev) => !prev);
            }}
            className="p-1.5 sm:p-2 rounded-lg backdrop-blur-md bg-white/95 text-stone-700 hover:text-stone-900 border border-stone-300 transition-all cursor-pointer shadow-xs"
            title={facingMode === 'user' ? 'Ganti ke Kamera Belakang' : 'Ganti ke Kamera Depan (Selfie)'}
          >
            <SwitchCamera className="w-4 h-4 text-orange-600" />
          </button>

          {/* Flip Camera Mirror */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-1.5 sm:p-2 rounded-lg backdrop-blur-md transition-all border shadow-xs cursor-pointer ${
              isMirrored ? 'bg-orange-600 text-white border-orange-500 font-bold' : 'bg-white/95 text-stone-700 border-stone-300'
            }`}
            title="Cermin Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Maximize Preview Toggle (Dedicated Full Preview Mode for Tablet / Kiosk) */}
          <button
            type="button"
            onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-md transition-all border shadow-xs cursor-pointer font-bold text-xs ${
              isPreviewMaximized
                ? 'bg-orange-600 text-white border-orange-500'
                : 'bg-white/95 hover:bg-stone-100 text-stone-800 border-stone-300'
            }`}
            title={isPreviewMaximized ? 'Kecilkan Tampilan Preview' : 'Perbesar Tampilan Preview (Mode Tablet Layar Penuh)'}
          >
            {isPreviewMaximized ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Kecilkan</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-orange-600" />
                <span className="hidden sm:inline">Perbesar Preview</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // 1. IMMERSIVE MAXIMIZED PREVIEW MODE (When user clicks "Perbesar Preview" or in Full Tablet Kiosk mode)
  if (isPreviewMaximized) {
    return (
      <div className="relative w-full h-full min-h-0 overflow-hidden flex flex-col justify-between p-1 sm:p-2 animate-in fade-in duration-200 select-none">
        {/* Fullscreen Video Viewfinder */}
        <div className="absolute inset-0 z-0">
          {renderViewfinder(true)}
        </div>

        {/* Floating Bottom Console Dock */}
        <div className="relative z-30 mt-auto flex flex-col gap-2 p-2 sm:p-3 max-w-4xl mx-auto w-full pointer-events-none">
          {/* Compact Photo Slot Thumbnails Bar */}
          <div className="pointer-events-auto bg-stone-950/85 backdrop-blur-md border border-white/15 rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xl">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
              {Array.from({ length: requiredCount }).map((_, slotIdx) => {
                const photo = photos[slotIdx];
                const isActive = activeSlotIndex === slotIdx;

                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => setActiveSlotIndex(slotIdx)}
                    className={`relative w-12 h-10 sm:w-16 sm:h-12 rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'border-orange-500 ring-2 ring-orange-500/50 scale-105'
                        : photo
                        ? 'border-white/40 hover:border-white/70 opacity-90'
                        : 'border-white/20 border-dashed opacity-60'
                    }`}
                  >
                    {photo?.dataUrl ? (
                      <img src={photo.dataUrl} alt={`Foto ${slotIdx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-stone-400" />
                      </div>
                    )}
                    <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/75 text-[9px] font-mono text-white font-bold leading-none py-0.5">
                      #{slotIdx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Next Button */}
            <button
              onClick={onContinueToLayout}
              disabled={filledCount === 0}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0 ${
                isAllFilled
                  ? 'bg-orange-600 hover:bg-orange-500 text-white border border-orange-400 active:scale-95'
                  : filledCount > 0
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600'
                  : 'bg-stone-900 text-stone-600 border border-stone-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <span>Lanjut</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floating Ergonomic Shutter Bar */}
          <div className="pointer-events-auto bg-stone-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl">
            {/* Timer Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[11px] font-mono font-medium text-stone-300 hidden xs:inline">TIMER:</span>
              {[0, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdownTimer(sec)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                    countdownTimer === sec
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200'
                  }`}
                >
                  {sec === 0 ? '0s' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Shutter Triggers */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartBurstMode}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-100 text-xs font-medium border border-white/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Ambil foto otomatis berurutan untuk semua slot"
              >
                <Play className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Auto 4x</span>
              </button>

              <button
                onClick={() => handleStartCapture(activeSlotIndex)}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-xl border border-orange-400 active:scale-95 transition-all cursor-pointer"
              >
                {isRetakingActiveSlot ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-orange-200" />
                    <span>Ulang Foto #{activeSlotIndex + 1}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto #{activeSlotIndex + 1}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. TABLET LANDSCAPE LAYOUT (Preview Takes Full Height, Controls Integrated into Right Panel)
  if (isLandscape) {
    return (
      <div className="w-full h-full min-h-0 flex flex-row items-stretch gap-2.5 sm:gap-3 p-1 sm:p-2 md:p-3 overflow-hidden animate-in fade-in duration-200 select-none">
        {/* Left Column: Live Webcam Viewfinder (EXPANDED TO FULL CONTAINER HEIGHT) */}
        <div className="flex-1 h-full min-h-0 relative flex items-center justify-center">
          {renderViewfinder(false)}
        </div>

        {/* Right Column: Integrated Booth Touch Console (Slots + Shutter Controls + Proceed) */}
        <div className="w-72 sm:w-80 lg:w-84 flex flex-col justify-between gap-2.5 h-full min-h-0 bg-white border border-stone-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-sm shrink-0 overflow-y-auto">
          {/* Top Section: Photo Slots Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
              <div>
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 font-mono">
                  SLOT FOTO ({filledCount}/{requiredCount})
                </h3>
                <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                  Klik slot untuk foto ulang
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {filledCount > 0 && !showResetConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[10px] font-mono text-stone-500 hover:text-rose-600 px-2 py-1 rounded bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                    title="Reset semua foto jika ingin mengulang dari awal"
                  >
                    Reset
                  </button>
                )}
                {showResetConfirm && (
                  <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300">
                    <span className="text-[10px] text-rose-700 font-mono">Yakin?</span>
                    <button
                      type="button"
                      onClick={handleResetAllPhotos}
                      className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-500 cursor-pointer"
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="text-[10px] text-stone-600 px-1 py-0.5 hover:text-stone-900 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
                {isAllFilled && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    LENGKAP
                  </span>
                )}
              </div>
            </div>

            {/* Photo Slots List */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {Array.from({ length: requiredCount }).map((_, slotIdx) => {
                const photo = photos[slotIdx];
                const isActive = activeSlotIndex === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    onClick={() => setActiveSlotIndex(slotIdx)}
                    className={`relative group rounded-lg border overflow-hidden transition-all cursor-pointer aspect-[4/3] flex items-center justify-center bg-stone-100 ${
                      isActive
                        ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-md'
                        : photo
                        ? 'border-stone-300 hover:border-stone-400'
                        : 'border-dashed border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    {/* Slot Number Badge */}
                    <div className="absolute top-1 left-1 z-10">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-xs ${
                        isActive
                          ? 'bg-orange-600 text-white border border-orange-500'
                          : photo
                          ? 'bg-white/90 text-stone-800 border border-stone-200'
                          : 'bg-stone-200/90 text-stone-600 border border-stone-300'
                      }`}>
                        #{slotIdx + 1}
                      </span>
                    </div>

                    {/* Active Tag */}
                    {isActive && (
                      <div className="absolute top-1 right-1 z-10">
                        <span className="bg-orange-600 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs border border-orange-400">
                          {photo ? 'ULANG' : 'SIAP'}
                        </span>
                      </div>
                    )}

                    {photo && photo.dataUrl && photo.dataUrl.trim() !== '' ? (
                      <>
                        <img
                          src={photo.dataUrl}
                          alt={`Slot ${slotIdx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Bottom Action Bar */}
                        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-1 pt-3 flex items-center justify-between gap-1 transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSlotIndex(slotIdx);
                              handleStartCapture(slotIdx);
                            }}
                            className="flex-1 py-1 px-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1 shadow cursor-pointer border border-orange-500 active:scale-95 transition-all truncate"
                            title={`Foto ulang slot #${slotIdx + 1}`}
                          >
                            <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                            <span>Ulang</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(slotIdx);
                            }}
                            className="p-1 rounded bg-stone-900 hover:bg-rose-900 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700 hover:border-rose-700 shrink-0"
                            title={`Hapus foto di slot #${slotIdx + 1}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-1.5 space-y-0.5">
                        <Camera className={`w-4 h-4 mx-auto ${isActive ? 'text-orange-500 animate-pulse' : 'text-stone-400'}`} />
                        <span className={`block text-[10px] font-mono truncate ${isActive ? 'text-orange-600 font-bold' : 'text-stone-400'}`}>
                          #{slotIdx + 1} {isActive ? 'Siap' : 'Kosong'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Section: Shutter & Capture Controls */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            {/* Timer Selection */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-mono font-medium text-stone-500">TIMER:</span>
              <div className="flex items-center gap-1">
                {[0, 3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setCountdownTimer(sec)}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                      countdownTimer === sec
                        ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900 border-stone-200'
                    }`}
                  >
                    {sec === 0 ? '0s' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Burst Button */}
            <button
              onClick={handleStartBurstMode}
              disabled={isBurstMode || activeCountdown !== null}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Ambil foto otomatis berurutan untuk semua slot"
            >
              <Play className="w-3.5 h-3.5 text-orange-600" />
              <span>Auto 4x Foto Bergantian</span>
            </button>

            {/* Primary Large Shutter Button */}
            <button
              onClick={() => handleStartCapture(activeSlotIndex)}
              disabled={isBurstMode || activeCountdown !== null}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-orange-500"
            >
              {isRetakingActiveSlot ? (
                <>
                  <RefreshCw className="w-4 h-4 text-orange-200" />
                  <span>Foto Ulang Foto #{activeSlotIndex + 1}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto #{activeSlotIndex + 1}</span>
                </>
              )}
            </button>

            {/* Retake feedback message */}
            {retakeFeedback && (
              <div className="text-[11px] font-mono text-emerald-700 flex items-center gap-1.5 pt-1 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{retakeFeedback}</span>
              </div>
            )}
          </div>

          {/* Bottom Section: Proceed Button */}
          <button
            onClick={onContinueToLayout}
            disabled={filledCount === 0}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow cursor-pointer ${
              isAllFilled
                ? 'bg-orange-600 hover:bg-orange-500 text-white active:scale-[0.98] border border-orange-500 shadow-sm'
                : filledCount > 0
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
            }`}
          >
            <span>Lanjut ke Tema & Cetak</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 3. TABLET PORTRAIT LAYOUT (Preview Dramatically Enlarged to 65% - 70% of Screen Height)
  return (
    <div className="w-full h-full min-h-0 flex flex-col justify-between gap-2 p-1.5 sm:p-2.5 md:p-3 overflow-hidden animate-in fade-in duration-200 select-none">
      {/* Top Section: Live Webcam Viewfinder (ENLARGED TO DOMINATE TABLET SCREEN) */}
      <div className="flex-1 min-h-[58dvh] sm:min-h-[64dvh] md:min-h-[68dvh] w-full relative flex items-center justify-center">
        {renderViewfinder(false)}
      </div>

      {/* Bottom Section: Sleek Touch Studio Console */}
      <div className="shrink-0 bg-white border border-stone-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-2 shadow-sm">
        {/* Row 1: Compact Horizontal Slot Strip */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 flex-1">
            {Array.from({ length: requiredCount }).map((_, slotIdx) => {
              const photo = photos[slotIdx];
              const isActive = activeSlotIndex === slotIdx;

              return (
                <div
                  key={slotIdx}
                  onClick={() => setActiveSlotIndex(slotIdx)}
                  className={`relative group h-12 w-16 sm:h-14 sm:w-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer flex items-center justify-center bg-stone-100 ${
                    isActive
                      ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-sm'
                      : photo
                      ? 'border-stone-300 hover:border-stone-400'
                      : 'border-dashed border-stone-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 px-1 rounded font-mono text-[9px] font-bold z-10 ${
                    isActive ? 'bg-orange-600 text-white' : 'bg-black/60 text-white'
                  }`}>
                    #{slotIdx + 1}
                  </span>

                  {photo?.dataUrl ? (
                    <>
                      <img src={photo.dataUrl} alt={`Foto ${slotIdx + 1}`} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCapture(slotIdx);
                            }}
                            className="p-1 rounded bg-orange-600 text-white text-[9px] font-bold flex items-center"
                            title="Foto ulang slot ini"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(slotIdx);
                            }}
                            className="p-1 rounded bg-stone-900 text-white text-[9px]"
                            title="Hapus slot ini"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Camera className={`w-3.5 h-3.5 ${isActive ? 'text-orange-500 animate-pulse' : 'text-stone-400'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset All Action */}
          {filledCount > 0 && !showResetConfirm && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-[10px] font-mono text-stone-500 hover:text-rose-600 px-2 py-1 rounded bg-stone-100 border border-stone-200 shrink-0 cursor-pointer"
            >
              Reset
            </button>
          )}
          {showResetConfirm && (
            <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300 shrink-0">
              <span className="text-[10px] text-rose-700 font-mono">Reset?</span>
              <button
                type="button"
                onClick={handleResetAllPhotos}
                className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded cursor-pointer"
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-[10px] text-stone-600 px-1 py-0.5 cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Ergonomic Touch Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {/* Timer & Burst Controls */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              {[0, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdownTimer(sec)}
                  className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                    countdownTimer === sec
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {sec === 0 ? '0s' : `${sec}s`}
                </button>
              ))}
            </div>

            <button
              onClick={handleStartBurstMode}
              disabled={isBurstMode || activeCountdown !== null}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Ambil foto otomatis berurutan 4x"
            >
              <Play className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Auto 4x</span>
            </button>
          </div>

          {/* Shutter Button & Proceed Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartCapture(activeSlotIndex)}
              disabled={isBurstMode || activeCountdown !== null}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer border border-orange-500"
            >
              {isRetakingActiveSlot ? (
                <>
                  <RefreshCw className="w-4 h-4 text-orange-200" />
                  <span>Ulang #{activeSlotIndex + 1}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Foto #{activeSlotIndex + 1}</span>
                </>
              )}
            </button>

            <button
              onClick={onContinueToLayout}
              disabled={filledCount === 0}
              className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow cursor-pointer ${
                isAllFilled
                  ? 'bg-orange-600 hover:bg-orange-500 text-white active:scale-95 border border-orange-500 shadow-sm'
                  : filledCount > 0
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                  : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed opacity-50'
              }`}
            >
              <span>Lanjut</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Retake feedback message */}
        {retakeFeedback && (
          <div className="text-[11px] font-mono text-emerald-700 flex items-center gap-1.5 pt-1 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{retakeFeedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
