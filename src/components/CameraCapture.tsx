import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, FlipHorizontal, Trash2, ArrowRight, Play, CheckCircle2, AlertCircle, SwitchCamera, Sparkles } from 'lucide-react';
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
  photos,
  onPhotosChange,
  onContinueToLayout,
  tabletOrientation = 'auto',
  autoPrintEnabled = false,
}) => {
  const orientationState = useScreenOrientation(tabletOrientation);
  const isLandscape = orientationState.isLandscape;

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

  const requiredCount = 4;

// Helper function to generate clean studio sample pose photos when camera is unavailable or for instant demo
const createDemoPosePhoto = (poseIndex: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

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
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  // Soft circle backdrop
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(640, 420, 240, 0, Math.PI * 2);
  ctx.fill();

  // Draw minimalist camera icon watermark
  ctx.font = '80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText('📸', 640, 390);

  // Draw Title text
  ctx.font = 'bold 36px "Space Mono", monospace';
  ctx.fillStyle = '#f1f2f6';
  ctx.letterSpacing = '2px';
  ctx.fillText(p.title, 640, 620);

  ctx.font = '22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText(p.subText, 640, 675);

  return canvas.toDataURL('image/jpeg', 0.92);
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

      // Tier 1: Try specific device or ideal facingMode
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: selectedDeviceId, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        console.warn('Camera level 1 constraint failed, trying fallback...', err1);
        
        // Tier 2: Flexible width/height
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
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

  // Find next empty slot
  useEffect(() => {
    const firstEmpty = Array.from({ length: requiredCount }).findIndex((_, idx) => !photos[idx]);
    if (firstEmpty !== -1) {
      setActiveSlotIndex(firstEmpty);
    } else {
      setActiveSlotIndex(requiredCount - 1);
    }
  }, [photos, requiredCount]);

  // Single Shutter Snapshot logic with video or demo pose fallback
  const capturePhotoToSlot = (slotIdx: number) => {
    sounds.playShutterSound();
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    let dataUrl = '';
    const video = videoRef.current;

    if (video && video.srcObject && video.readyState >= 2 && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
    updated.splice(slotIdx, 1);
    photosRef.current = updated;
    onPhotosChange(updated);
  };

  const filledCount = photos.filter(Boolean).length;
  const isAllFilled = filledCount >= requiredCount;

  return (
    <div className={`mx-auto p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full ${
      isLandscape ? 'max-w-7xl' : 'max-w-3xl md:max-w-4xl'
    }`}>
      <div className={`flex gap-4 sm:gap-6 ${
        isLandscape ? 'flex-row items-start' : 'flex-col'
      }`}>
        {/* Left Column: Live Webcam Viewfinder */}
        <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
          <div className="relative aspect-[4/3] rounded-2xl bg-[#0a0b0e] border border-zinc-800 overflow-hidden shadow-xl flex items-center justify-center">
            {/* Viewfinder Reticle Corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-zinc-500/60 pointer-events-none z-10" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-zinc-500/60 pointer-events-none z-10" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-zinc-500/60 pointer-events-none z-10" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-zinc-500/60 pointer-events-none z-10" />

            {/* Flash Overlay Effect */}
            {flashEffect && <div className="absolute inset-0 bg-white z-30 animate-ping opacity-95" />}

            {/* Countdown Overlay - Clean no bounce slop */}
            {activeCountdown !== null && (
              <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <span className="text-8xl sm:text-9xl font-black font-mono tracking-tighter text-orange-500">
                  {activeCountdown}
                </span>
                <span className="text-xs sm:text-sm font-mono uppercase tracking-widest text-stone-300 mt-3 px-3 py-1 rounded bg-stone-900 border border-stone-700">
                  BERSIAP FOTO
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
                className={`w-full h-full object-cover transition-transform ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              <div className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4 max-w-md">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-white">Kamera Fisik Tidak Aktif</p>
                  <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed font-mono">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handlePopulateDemoPhotos}
                    className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border border-orange-500"
                  >
                    <Camera className="w-3.5 h-3.5" /> Gunakan Foto Demo Studio
                  </button>
                  <button
                    onClick={() => setSelectedDeviceId((prev) => (prev ? '' : 'retry'))}
                    className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium text-xs border border-stone-800 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* Top Toolbar Controls over video */}
            <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between z-10 pointer-events-auto gap-2">
              <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-stone-700/80 text-[11px] sm:text-xs font-mono font-medium text-stone-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>SLOT #{activeSlotIndex + 1} / {requiredCount}</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Switch Device dropdown */}
                {devices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-stone-900/90 backdrop-blur-md text-[11px] sm:text-xs text-stone-200 border border-stone-700/80 rounded-md px-2 py-1 focus:outline-none max-w-[110px] sm:max-w-none truncate font-mono"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Flip Camera Facing Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                    setIsMirrored((prev) => !prev);
                  }}
                  className="p-1.5 sm:p-2 rounded-md backdrop-blur-md bg-stone-900/90 text-stone-300 hover:text-white border border-stone-700/80 transition-all cursor-pointer shadow-sm"
                  title={facingMode === 'user' ? 'Ganti ke Kamera Belakang' : 'Ganti ke Kamera Depan (Selfie)'}
                >
                  <SwitchCamera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                </button>

                {/* Flip Camera Mirror */}
                <button
                  type="button"
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`p-1.5 sm:p-2 rounded-md backdrop-blur-md transition-all border shadow-sm cursor-pointer ${
                    isMirrored ? 'bg-orange-600 text-white border-orange-500 font-bold' : 'bg-stone-900/90 text-stone-300 border-stone-700/80'
                  }`}
                  title="Cermin Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Shutter & Timer Controls Toolbar */}
          <div className="bg-[#131110] border border-stone-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            {/* Timer Options */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-mono font-medium text-stone-400">TIMER:</span>
              {[0, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdownTimer(sec)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer select-none border ${
                    countdownTimer === sec
                      ? 'bg-orange-600 text-white border-orange-500'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
                  }`}
                >
                  {sec === 0 ? '0s' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Shutter Trigger Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              {/* Burst Mode Button */}
              <button
                onClick={handleStartBurstMode}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden xs:inline">Auto 4x Bergantian</span>
                <span className="xs:hidden">Auto 4x</span>
              </button>

              {/* Main Shutter Button */}
              <button
                onClick={() => handleStartCapture(activeSlotIndex)}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-orange-500"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto #{activeSlotIndex + 1}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (or Bottom Column in Portrait): Photo Slots */}
        <div className={`w-full ${isLandscape ? 'md:w-80' : 'w-full'} space-y-3 sm:space-y-4 flex flex-col justify-between`}>
          <div className="bg-[#131110] border border-stone-800 rounded-xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-stone-200 flex items-center gap-2 font-mono">
                SLOT FOTO ({filledCount}/{requiredCount})
              </h3>
              {isAllFilled && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  LENGKAP
                </span>
              )}
            </div>

            {/* Photo Slots List */}
            <div className={`grid ${isLandscape ? 'grid-cols-2 md:grid-cols-1' : 'grid-cols-4'} gap-2 sm:gap-2.5`}>
              {Array.from({ length: requiredCount }).map((_, slotIdx) => {
                const photo = photos[slotIdx];
                const isActive = activeSlotIndex === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    onClick={() => setActiveSlotIndex(slotIdx)}
                    className={`relative group rounded-lg border overflow-hidden transition-all cursor-pointer aspect-[4/3] flex items-center justify-center bg-stone-950 ${
                      isActive
                        ? 'border-orange-500 ring-2 ring-orange-500/30'
                        : photo
                        ? 'border-stone-700 hover:border-stone-600'
                        : 'border-dashed border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.dataUrl}
                          alt={`Slot ${slotIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCapture(slotIdx);
                            }}
                            className="p-1.5 rounded bg-stone-800 text-white hover:bg-stone-700 text-xs"
                            title="Foto Ulang"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(slotIdx);
                            }}
                            className="p-1.5 rounded bg-rose-700 text-white hover:bg-rose-600 text-xs"
                            title="Hapus Foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2 space-y-0.5">
                        <Camera className="w-4 h-4 text-stone-600 mx-auto" />
                        <span className="block text-[10px] font-mono text-stone-500 truncate">
                          #{slotIdx + 1} Kosong
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proceed Button */}
          <button
            onClick={onContinueToLayout}
            disabled={filledCount === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow cursor-pointer ${
              isAllFilled
                ? 'bg-orange-600 hover:bg-orange-500 text-white active:scale-[0.98] border border-orange-500 shadow-sm'
                : filledCount > 0
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
            }`}
          >
            <span>Lanjut ke Tata Letak & Tema</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
