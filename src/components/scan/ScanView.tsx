import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode,
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building2,
  AlertCircle,
  Tag,
  Image as ImageIcon,
  Zap,
  ZapOff,
  SwitchCamera,
  Play,
  Square,
  Volume2,
  HelpCircle,
  X,
  Search,
  Star
} from 'lucide-react';
import jsQR from 'jsqr';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { getShopInitials } from '../../utils/shopInitials';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface ScanViewProps {
  onProceedToUpload: () => void;
}

export const ScanView: React.FC<ScanViewProps> = ({ onProceedToUpload }) => {
  const {
    enterprises,
    orders,
    selectedEnterprise,
    hasExplicitlySelectedEnterprise,
    verifyAndSelectShopByCode,
    selectEnterprise,
    t
  } = usePrintPerfect();

  const [manualCode, setManualCode] = useState('');
  const [isDetected, setIsDetected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [showHowToScanModal, setShowHowToScanModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);

  // Auto-suggestion & Shop Directory states
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = React.useMemo(() => {
    const query = manualCode.trim().toLowerCase();
    if (!query) return [];
    return enterprises.filter(ent =>
      ent.name.toLowerCase().includes(query) ||
      ent.terminalCode.toLowerCase().includes(query) ||
      ent.shortCode.toLowerCase().includes(query) ||
      (ent.address && ent.address.toLowerCase().includes(query)) ||
      (ent.city && ent.city.toLowerCase().includes(query))
    );
  }, [manualCode, enterprises]);

  const filteredDirectoryShops = React.useMemo(() => {
    const query = directorySearch.trim().toLowerCase();
    if (!query) return enterprises;
    return enterprises.filter(ent =>
      ent.name.toLowerCase().includes(query) ||
      ent.terminalCode.toLowerCase().includes(query) ||
      ent.shortCode.toLowerCase().includes(query) ||
      (ent.address && ent.address.toLowerCase().includes(query)) ||
      (ent.city && ent.city.toLowerCase().includes(query))
    );
  }, [directorySearch, enterprises]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredPair = useRef(false);

  // Play pleasant chime on successful scan (like UPI / Google Pay)
  const playScanChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15); // A6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay may be constrained
    }
  };

  // Stop camera stream cleanly
  const stopCameraStream = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Process decoded QR or Barcode value
  const handleDecodedValue = useCallback(
    async (decodedText: string) => {
      if (hasTriggeredPair.current) return;
      const clean = decodedText.trim();
      if (!clean) return;

      // Extract a shop code if encoded in a shop URL or prefixed QR value.
      let targetCode = clean;
      const urlMatch = clean.match(/(?:shopkeeper|shop|terminal|counter)\/([A-Za-z0-9_-]+)/i);
      if (urlMatch && urlMatch[1]) {
        targetCode = urlMatch[1];
      } else if (clean.includes(':')) {
        const parts = clean.split(':');
        targetCode = parts[parts.length - 1];
      }

      setLastScannedRaw(targetCode);
      setIsValidating(true);
      const res = await verifyAndSelectShopByCode(targetCode);
      setIsValidating(false);

      const shop = res.shop;
      if (res.success && shop) {
        hasTriggeredPair.current = true;
        playScanChime();
        stopCameraStream();
        setIsDetected(true);
        toast.success(`QR Scanned: Connected to ${shop.name} (${shop.terminalCode})!`);
        onProceedToUpload();
      } else {
        toast.error(
          res.message || `Scanned code "${targetCode}" is not a registered shop. Please try again.`
        );
        // Brief cooldown before next scan
        setTimeout(() => {
          hasTriggeredPair.current = false;
        }, 2200);
      }
    },
    [verifyAndSelectShopByCode, onProceedToUpload, stopCameraStream]
  );

  // Scan loop using requestAnimationFrame + jsQR
  const tickScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || hasTriggeredPair.current) {
      scanLoopRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // First attempt native BarcodeDetector if supported
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
            });
            barcodeDetector
              .detect(canvas)
              .then((barcodes: any[]) => {
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleDecodedValue(barcodes[0].rawValue);
                  return;
                }
              })
              .catch(() => {
                // fallback to jsQR below
              });
          } catch {
            // fallback
          }
        }

        // Secondary / Universal engine: jsQR
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            handleDecodedValue(code.data);
            return;
          }
        } catch {
          // ignore frame read error
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(tickScan);
  }, [handleDecodedValue]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    hasTriggeredPair.current = false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as any).getCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setTorchAvailable(true);
        }
      }

      setIsCameraActive(true);
      scanLoopRef.current = requestAnimationFrame(tickScan);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setCameraError(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or enter the code manually.'
          : 'Unable to start camera. Please enter code manually or upload QR from gallery.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCameraStream, tickScan]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
        toast.info(nextState ? 'Flashlight ON' : 'Flashlight OFF');
      } catch (err) {
        console.warn('Failed to toggle torch:', err);
      }
    }
  };

  // Switch camera front/back
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Upload from Gallery handler with real jsQR decoding
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info('Scanning QR code from uploaded image...');
    setIsValidating(true);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const qrResult = jsQR(imageData.data, imageData.width, imageData.height);

          URL.revokeObjectURL(objectUrl);
          setIsValidating(false);

          if (qrResult && qrResult.data) {
            handleDecodedValue(qrResult.data);
          } else {
            toast.error('No readable QR code found in selected image. Please try another photo.');
          }
        } else {
          URL.revokeObjectURL(objectUrl);
          setIsValidating(false);
          toast.error('Unable to parse image file.');
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setIsValidating(false);
        toast.error('Failed to load image file.');
      };

      img.src = objectUrl;
    } catch (err) {
      setIsValidating(false);
      toast.error('Error scanning gallery image.');
    }

    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  // Manual Pair Handler
  const handleManualPair = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const code = manualCode.trim();
    if (!code) {
      setErrorMessage('Please enter a shop scan / terminal code.');
      return;
    }

    setIsValidating(true);
    const res = await verifyAndSelectShopByCode(code);
    setIsValidating(false);

    if (res.success && res.shop) {
      playScanChime();
      stopCameraStream();
      setIsDetected(true);
      toast.success(`Paired with ${res.shop.name} (${res.shop.terminalCode})! Redirecting to Upload...`);
      setManualCode('');
      setTimeout(() => {
        onProceedToUpload();
      }, 500);
    } else {
      setErrorMessage(
        res.message || `Invalid shop code "${code}". Please enter a valid registered counter code.`
      );
      toast.error('Invalid Shop Unique Code');
    }
  };

  // Lifecycle
  useEffect(() => {
    startCamera();
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  return (
    <div className="space-y-4 pb-28 px-4 max-w-lg mx-auto">
      {/* Offscreen Canvas for Real-Time Frame Processing */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Hidden file input for gallery upload */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryUpload}
        className="hidden"
      />
      {/* 1. Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 font-heading">
            <QrCode className="w-5 h-5 text-[#FF1300]" />
            <span>Live Counter Scanner</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time camera QR scanner.
          </p>
        </div>
        {/* Live Status Pill */}

      </div>
      {/* 2. Interactive Real-Time Camera Viewfinder */}
      <div className="relative overflow-hidden rounded-3xl p-4 shadow-xl text-white border-solid border-[0.8px] border-[#ffffff] bg-[transparent00] bg-none">
        {/* Top Controls Overlay */}
        <div className="flex items-center justify-between mb-3 z-30 relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Camera className="w-4 h-4 text-[#FF1300]" />
            <span className="text-[#000000]">{"Aim at Shop Stand QR"}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Flash / Torch Toggle */}
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-full border transition-all ${
                  torchOn
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="Toggle Flashlight"
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Camera (Front/Back) */}
            <button
              type="button"
              onClick={switchCamera}
              className="p-2 rounded-full hover:bg-[#9B111E] text-white transition-all active:scale-95 shadow-sm cursor-pointer border-solid border-[0.8px] border-[#e6e6e6] bg-[#e01100] bg-none"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4 text-white" />
            </button>

            {/* Camera Pause / Restart */}
            <button
              type="button"
              onClick={() => {
                if (isCameraActive) {
                  stopCameraStream();
                  setIsCameraActive(false);
                } else {
                  startCamera();
                }
              }}
              className="p-2 rounded-full hover:bg-[#9B111E] text-white transition-all active:scale-95 shadow-sm cursor-pointer border-solid border-[#e6e6e6] border-[0.8px] bg-[#e01100] bg-none border-[#e6e6e6]"
              title={isCameraActive ? 'Pause Camera' : 'Start Camera'}
            >
              {isCameraActive ? <Square className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Viewfinder Arena with Live Video Feed */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 my-1">
            {/* 4 Distinct Corner Brackets */}
            <div className="absolute -top-2 -left-2 w-14 h-14 border-t-[6px] border-l-[6px] border-[#FF5B52] rounded-tl-[26px] z-20 pointer-events-none" />
            <div className="absolute -top-2 -right-2 w-14 h-14 border-t-[6px] border-r-[6px] border-[#FFA700] rounded-tr-[26px] z-20 pointer-events-none" />
            <div className="absolute -bottom-2 -left-2 w-14 h-14 border-b-[6px] border-l-[6px] border-[#3B82F6] rounded-bl-[26px] z-20 pointer-events-none" />
            <div className="absolute -bottom-2 -right-2 w-14 h-14 border-b-[6px] border-r-[6px] border-[#22C55E] rounded-br-[26px] z-20 pointer-events-none" />

            {/* Inner Viewport with Live Camera Feed */}
            <div className="w-full h-full rounded-[24px] bg-slate-900 relative overflow-hidden shadow-inner flex items-center justify-center">
              {/* Real-time HTML5 video */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? 'opacity-100' : 'opacity-20'
                }`}
              />

              {/* Scanning Active Overlay / Laser */}
              {isCameraActive && (
                <div className="absolute left-0 right-0 h-[3px] bg-[#FF1300] shadow-[0_0_12px_#FF1300,0_0_3px_#FFFFFF] animate-laser pointer-events-none z-10">
                  <div className="w-full h-[1px] bg-white opacity-80" />
                </div>
              )}

              {/* Camera Offline / Permission Prompt */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/80 z-10">
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-300 font-semibold">Camera is Paused</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 px-4 py-1.5 rounded-full bg-[#FF1300] text-white text-xs font-bold hover:bg-[#E01100] transition-colors"
                  >
                    Start Scanner
                  </button>
                </div>
              )}

              {/* Error overlay if camera blocked */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 z-20">
                  <AlertCircle className="w-7 h-7 text-amber-400 mb-1.5" />
                  <p className="text-[11px] text-slate-200 leading-tight mb-2">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white border border-slate-700 hover:bg-slate-700"
                  >
                    Retry Access
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Row: Choose From Gallery & How to Scan */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#9B111E] text-white hover:text-white text-xs font-bold shadow-md active:scale-95 transition-all border-[#9B111E] cursor-pointer bg-[#e01100] bg-none border-[0.8px] border-solid border-[#e6e6e6]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-white" />
              <span>Choose From Gallery</span>
            </button>

          </div>
        </div>
      </div>
      {/* 3. Manual Terminal Code Input & Live Search (Aligned 3 elements cleanly per Page 2) */}
      <div className="bg-white rounded-3xl p-4 border border-red-100 shadow-xs space-y-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5">
            <span>Enter Code Manually</span>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
          </h3>
          <p className="text-[11px] text-slate-500">
            Type the terminal code or shop name printed by your shop.
          </p>
        </div>

        <div className="max-w-md mx-auto w-full space-y-3">
          {/* Row 1: Search Shop button left-aligned per Requirement 5 */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => {
                setDirectorySearch('');
                setIsDirectoryOpen(true);
              }}
              className="h-9 px-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-[#FF1300] text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-[#FF1300]" />
              <span>Search Shop</span>
            </button>
          </div>

          {/* Row 2: Shop Code or Name input and Fetch & Connect button side by side */}
          <form onSubmit={handleManualPair} className="flex items-center gap-2 w-full">
            {/* Shop Code or Name Input */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={manualCode}
                onChange={e => {
                  setManualCode(e.target.value);
                  setErrorMessage('');
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Shop code or name"
                className="w-full h-10 bg-slate-50 border border-red-200/90 rounded-xl px-3 text-xs text-slate-900 font-mono font-bold tracking-wider placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/25 focus:border-[#FF1300] uppercase"
              />
            </div>

            {/* Fetch & Connect Button */}
            <button
              type="submit"
              disabled={isValidating}
              className="h-10 px-4 rounded-xl bg-[#FF1300] hover:bg-[#9B111E] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all shrink-0 font-heading flex items-center justify-center whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? 'Checking...' : 'Fetch & Connect'}
            </button>
          </form>

          {/* Expanded Search Result Card aligned with full search field */}
          {showSuggestions && manualCode.trim().length > 0 && searchSuggestions.length > 0 && (
            <div ref={suggestionsRef} className="w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-40 max-h-72 overflow-y-auto animate-in fade-in">
              <div className="p-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Shops ({searchSuggestions.length})</span>
                <span className="text-[#FF1300]">Tap to Connect</span>
              </div>
              {searchSuggestions.map(shop => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => {
                    setManualCode(shop.terminalCode);
                    setShowSuggestions(false);
                    handleDecodedValue(shop.terminalCode);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-red-50/70 border-b border-slate-100 last:border-b-0 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-[#FF1300] font-heading">
                        {shop.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#FF1300] font-mono text-[10px] font-black border border-red-200 shrink-0">
                        {shop.terminalCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{shop.address || shop.city}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{shop.rating || 5}</span>
                    </div>
                    <span className="text-xs font-bold text-white bg-[#FF1300] px-3 py-1.5 rounded-xl shadow-xs group-hover:bg-[#9B111E] transition-colors hidden sm:inline-block">
                      Connect
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}

        {/* Quick Clickable Partner Terminals - Only shown for existing users with print history */}
        {orders.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Quick Terminals:</span>
            {enterprises.filter(e => orders.some(o => o.enterpriseId === e.id)).slice(0, 3).map(ent => (
              <button
                key={ent.id}
                type="button"
                onClick={() => handleDecodedValue(ent.terminalCode)}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-red-50 hover:text-[#FF1300] text-[11px] font-mono font-bold text-slate-700 transition-colors"
              >
                {ent.terminalCode}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 4. Connected Partner Card */}
      {hasExplicitlySelectedEnterprise ? (
        <div className="bg-white rounded-3xl p-4 border border-red-100 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-red-100 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-heading">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Connected Printing Partner</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Verified Terminal
            </span>
          </div>

          {/* Shop Overview */}
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-red-100 ring-2 ring-[#FF1300] shadow-sm shrink-0 bg-white flex items-center justify-center">
              {selectedEnterprise.logoUrl ? (
                <img
                  src={selectedEnterprise.logoUrl}
                  alt={selectedEnterprise.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.dynamic-initials-fallback')) {
                      const div = document.createElement('div');
                      div.className = 'dynamic-initials-fallback w-full h-full flex items-center justify-center font-bold text-sm bg-[#FF1300] text-white';
                      div.innerText = getShopInitials(selectedEnterprise.name);
                      parent.appendChild(div);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-[#FF1300] text-white">
                  {getShopInitials(selectedEnterprise.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-slate-900 font-heading truncate">
                  {selectedEnterprise.name}
                </h4>

              </div>

              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedEnterprise.address}</span>
              </p>

              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedEnterprise.phone}</span>
              </p>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-semibold">TERMINAL ID</span>
              <span className="font-bold text-slate-800 font-mono">
                {selectedEnterprise.terminalCode}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-semibold">SERVICES</span>
              <span className="font-bold text-slate-800 truncate block">
                {selectedEnterprise.category}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-semibold">B&W RATE</span>
              <span className="font-bold text-[#FF1300]">
                {selectedEnterprise.pricing.isConfigured ? `₹${selectedEnterprise.pricing.blackAndWhite.toFixed(2)} / page` : '—'}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] font-semibold">COLOR RATE</span>
              <span className="font-bold text-[#FF1300]">
                {selectedEnterprise.pricing.isConfigured ? `₹${selectedEnterprise.pricing.colour.toFixed(2)} / page` : '—'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToUpload}
            className="w-full py-3.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 font-heading"
          >
            <span>Proceed to Upload with this Shop</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-50/80 rounded-3xl p-5 border border-dashed border-slate-200 text-center space-y-1.5">
          <p className="text-xs font-bold text-slate-700">No Print Counter Linked Yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Scan the QR stand at the shop or type the terminal code above to connect and configure your prints.
          </p>
        </div>
      )}
      {/* How to Scan Help Dialog */}
      <Dialog open={showHowToScanModal} onOpenChange={setShowHowToScanModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-3xl bg-white p-6 border border-slate-100 shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[#FF1300] flex items-center justify-center font-bold">
                <QrCode className="w-4 h-4" />
              </div>
              <DialogTitle className="text-sm font-bold text-slate-900 font-heading">
                How to Connect to a Print Shop
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setShowHowToScanModal(false)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs text-slate-600">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50/60 border border-red-100">
              <span className="w-6 h-6 rounded-full bg-[#FF1300] text-white flex items-center justify-center font-black text-xs shrink-0 font-heading">
                1
              </span>
              <div>
                <p className="font-bold text-slate-800">Locate Counter Stand QR</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Find the official printOn24 QR stand on the shop counter with the shop name & terminal code.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0 font-heading">
                2
              </span>
              <div>
                <p className="font-bold text-slate-800">Scan or Upload QR Image</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Point your camera steadily inside the frame, or tap &apos;Choose From Gallery&apos; if you took a photo of the QR.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 font-heading">
                3
              </span>
              <div>
                <p className="font-bold text-emerald-950">Automatic Connection & Rates</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">Your app instantly pairs with the shop, loading their live paper pricing, queue status, and discount tiers.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHowToScanModal(false)}
            className="w-full py-2.5 rounded-xl bg-[#FF1300] hover:bg-[#9B111E] text-white text-xs font-bold transition-all shadow-md font-heading"
          >
            Got It, Let&apos;s Scan!
          </button>
        </DialogContent>
      </Dialog>
      {/* Comprehensive Registered Shopkeepers Directory Table Modal */}
      <Dialog open={isDirectoryOpen} onOpenChange={setIsDirectoryOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl rounded-3xl bg-white p-5 md:p-6 border border-slate-100 shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold border border-red-100 shadow-2xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-sm font-bold text-slate-900 font-heading">
                  PrintOn24 Registered Shopkeepers Directory
                </DialogTitle>

              </div>
            </div>

          </DialogHeader>

          {/* Directory Search Filter */}
          <div className="py-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={directorySearch}
                onChange={e => setDirectorySearch(e.target.value)}
                placeholder="Search shopkeepers by name, code, or area..."
                className="w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/20 focus:border-[#FF1300]"
              />
              {directorySearch && (
                <button
                  type="button"
                  onClick={() => setDirectorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Directory Table */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            <div className="w-full max-w-full overflow-x-auto bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Terminal Code</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Shop Name</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Location / Address</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-center">Rating</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDirectoryShops.length > 0 ? (
                    filteredDirectoryShops.map(shop => {
                      const isCurrentlyConnected = selectedEnterprise?.id === shop.id && hasExplicitlySelectedEnterprise;
                      return (
                        <tr key={shop.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-[#FF1300]">
                            <span className="px-2 py-0.5 rounded-lg bg-red-50 border border-red-200/80 text-[11px]">
                              {shop.terminalCode}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900 font-heading">
                            <div className="flex items-center gap-1.5">
                              <span>{shop.name}</span>
                              {isCurrentlyConnected && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase">
                                  Connected
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{shop.address || shop.city}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-center font-bold text-amber-600">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 text-[11px]">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{shop.rating || 5}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setManualCode(shop.terminalCode);
                                setIsDirectoryOpen(false);
                                handleDecodedValue(shop.terminalCode);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#FF1300] hover:bg-[#9B111E] active:scale-95 text-white text-xs font-bold shadow-xs transition-all font-heading"
                            >
                              Connect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No shopkeepers found matching &quot;{directorySearch}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 shrink-0 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
