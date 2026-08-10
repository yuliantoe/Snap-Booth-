import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, FlipHorizontal, Upload, Trash2, ArrowRight, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { PhotoSlot, LayoutType } from '../types';
import { sounds } from '../utils/audio';

interface CameraCaptureProps {
  layout: LayoutType;
  photos: PhotoSlot[];
  onPhotosChange: (updatedPhotos: PhotoSlot[]) => void;
  onContinueToLayout: () => void;
  tabletOrientation?: 'portrait' | 'landscape';
  autoPrintEnabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  photos,
  onPhotosChange,
  onContinueToLayout,
  tabletOrientation = 'portrait',
  autoPrintEnabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [countdownTimer, setCountdownTimer] = useState<number>(3); // 3, 5, 10
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [isBurstMode, setIsBurstMode] = useState<boolean>(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const requiredCount = 4;

// Helper function to generate vibrant sample pose photos when camera is unavailable or for instant demo
const createDemoPosePhoto = (poseIndex: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const poses = [
    { title: '✌️ Peace & Smile', bg: ['#FF7E5F', '#FEB47B'], emoji: '📸', subText: 'SnapBooth Pose #1' },
    { title: '😎 Cool Style', bg: ['#6A11CB', '#2575FC'], emoji: '✨', subText: 'SnapBooth Pose #2' },
    { title: '💖 Heart Finger', bg: ['#FF0844', '#FFB199'], emoji: '🎉', subText: 'SnapBooth Pose #3' },
    { title: '🥳 Party Mood!', bg: ['#00F2FE', '#4FACFE'], emoji: '👑', subText: 'SnapBooth Pose #4' },
  ];

  const p = poses[poseIndex % poses.length];

  // Draw gradient background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, p.bg[0]);
  grad.addColorStop(1, p.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft circle backdrop
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(640, 420, 260, 0, Math.PI * 2);
  ctx.fill();

  // Draw Avatar / Emoji
  ctx.font = '160px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.emoji, 640, 400);

  // Draw Title text
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 12;
  ctx.fillText(p.title, 640, 680);

  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowBlur = 4;
  ctx.fillText(p.subText, 640, 740);

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
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        console.warn('Camera level 1 constraint failed, trying fallback...', err1);
        
        // Tier 2: Flexible width/height
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 960 } },
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
          'Kamera tidak terdeteksi atau izin ditolak. Anda tetap dapat menggunakan Foto Demo otomatis atau mengunggah foto secara manual.'
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
  }, [selectedDeviceId]);

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

  // Handle Manual File Uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File, idx: number) => {
      const targetSlot = (activeSlotIndex + idx) % requiredCount;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const updated = [...photosRef.current];
          updated[targetSlot] = {
            id: `photo_file_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
            dataUrl: event.target.result as string,
            capturedAt: Date.now(),
          };
          photosRef.current = updated;
          onPhotosChange(updated);
        }
      };
      reader.readAsDataURL(file);
    });
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
    <div className={`mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-300 ${
      tabletOrientation === 'landscape' ? 'max-w-7xl' : 'max-w-5xl'
    }`}>
      <div className={`flex gap-6 ${
        tabletOrientation === 'landscape' ? 'flex-row items-start' : 'flex-col md:flex-row'
      }`}>
        {/* Left Column: Live Webcam Viewfinder */}
        <div className="flex-1 space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Flash Overlay Effect */}
            {flashEffect && <div className="absolute inset-0 bg-white z-30 animate-ping opacity-90" />}

            {/* Countdown Overlay */}
            {activeCountdown !== null && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <span className="text-8xl font-black tracking-tighter text-rose-400 animate-bounce">
                  {activeCountdown}
                </span>
                <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase mt-2">
                  Siap-siap Bergaya! 📸
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
              <div className="p-6 text-center space-y-4 max-w-md">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Kamera Fisik Tidak Aktif</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={handlePopulateDemoPhotos}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> Gunakan Foto Demo Studio
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-rose-400" /> Unggah Foto
                  </button>
                  <button
                    onClick={() => setSelectedDeviceId((prev) => (prev ? '' : 'retry'))}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white font-medium text-xs transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* Top Toolbar Controls over video */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-xs font-semibold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Foto #{activeSlotIndex + 1} dari {requiredCount}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Switch Device */}
                {devices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-slate-900/80 backdrop-blur-md text-xs text-slate-200 border border-slate-700/60 rounded-full px-2.5 py-1 focus:outline-none"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        Kamera {idx + 1}
                      </option>
                    ))}
                  </select>
                )}

                {/* Flip Camera Mirror */}
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`p-2 rounded-full backdrop-blur-md transition-all ${
                    isMirrored ? 'bg-rose-500/80 text-white' : 'bg-slate-900/80 text-slate-300'
                  }`}
                  title="Cermin Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Shutter & Timer Controls Toolbar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Timer Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Timer:</span>
              {[0, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdownTimer(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    countdownTimer === sec
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sec === 0 ? 'Langsung' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Shutter Trigger Buttons */}
            <div className="flex items-center gap-3">
              {/* Burst Mode Button */}
              <button
                onClick={handleStartBurstMode}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Ambil 4 Foto Otomatis
              </button>

              {/* Main Shutter Button */}
              <button
                onClick={() => handleStartCapture(activeSlotIndex)}
                disabled={isBurstMode || activeCountdown !== null}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Ambil Foto #{activeSlotIndex + 1}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Photo Slots & Upload Option */}
        <div className="w-full md:w-80 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Foto Terkumpul ({filledCount}/{requiredCount})
              </h3>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                <Upload className="w-3.5 h-3.5" /> Unggah Foto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Photo Slots List */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              {Array.from({ length: requiredCount }).map((_, slotIdx) => {
                const photo = photos[slotIdx];
                const isActive = activeSlotIndex === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    onClick={() => setActiveSlotIndex(slotIdx)}
                    className={`relative group rounded-xl border overflow-hidden transition-all cursor-pointer aspect-[4/3] flex items-center justify-center bg-slate-950 ${
                      isActive
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : photo
                        ? 'border-slate-800 hover:border-slate-700'
                        : 'border-dashed border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.dataUrl}
                          alt={`Slot ${slotIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCapture(slotIdx);
                            }}
                            className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
                            title="Foto Ulang"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(slotIdx);
                            }}
                            className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 text-xs font-semibold"
                            title="Hapus Foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 space-y-1">
                        <Camera className="w-6 h-6 text-slate-600 mx-auto" />
                        <span className="block text-xs font-medium text-slate-500">
                          Foto #{slotIdx + 1} Kosong
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
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isAllFilled
                ? 'bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 text-white shadow-rose-500/20 hover:opacity-95'
                : filledCount > 0
                ? 'bg-rose-600/80 text-white hover:bg-rose-600'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Lanjut ke Tata Letak & Tema <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
