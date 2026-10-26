import React, { useState } from 'react';
import {
  X,
  QrCode,
  Zap,
  Camera,
  CheckCircle2,
  Building2,
  ScanLine
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShop?: (shopId: string) => void;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
  onSelectShop
}) => {
  const { enterprises, verifyAndSelectShopByCode, selectEnterprise } = usePrintPerfect();
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [flashOn, setFlashOn] = useState(false);

  const handleSimulateScan = async (code: string) => {
    setIsScanning(false);
    const res = await verifyAndSelectShopByCode(code);
    if (res.success && res.shop) {
      if (onSelectShop) onSelectShop(res.shop.id);
      onClose();
      setIsScanning(true);
    } else {
      setIsScanning(true);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      toast.error('Please enter a shop terminal code.');
      return;
    }
    const res = await verifyAndSelectShopByCode(code);
    if (res.success && res.shop) {
      toast.success(`Paired with ${res.shop.name} (${res.shop.terminalCode})!`);
      if (onSelectShop) onSelectShop(res.shop.id);
      onClose();
      setManualCode('');
    } else {
      toast.error(res.message || 'Invalid shop code. Please enter a valid partner code.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden bg-slate-950 text-white border-slate-800 rounded-3xl">
        <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white text-left">
                Quick Terminal Scanner
              </DialogTitle>
              <p className="text-[10px] text-slate-400 text-left">
                Scan counter terminal QR to pair instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Viewfinder simulation */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          {/* Mock Camera View Background */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Flashlight toggle */}
          <button
            type="button"
            onClick={() => setFlashOn(!flashOn)}
            className={`absolute top-4 right-4 z-20 p-2 rounded-full backdrop-blur-md border ${
              flashOn
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-white/10 text-white border-white/20'
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Scanning Box Reticle */}
          <div className="relative w-64 h-64 border-2 border-dashed border-blue-400/70 rounded-3xl flex items-center justify-center overflow-hidden">
            {/* Animated Laser Scan Bar */}
            {isScanning && (
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent animate-bounce shadow-[0_0_15px_#0066FF]" />
            )}

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#0066FF] rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#0066FF] rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#0066FF] rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#0066FF] rounded-br-xl" />

            <div className="text-center p-4">
              <ScanLine className="w-10 h-10 text-blue-400 mx-auto animate-pulse opacity-80" />
              <p className="text-xs font-semibold text-slate-300 mt-2">
                Point at Print Shop Counter QR
              </p>
            </div>
          </div>
        </div>

        {/* Quick Pair Demonstration Chips */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Tap to Test Scan Terminal:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {enterprises.slice(0, 4).map(ent => (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => handleSimulateScan(ent.terminalCode)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors active:scale-95"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{ent.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{ent.terminalCode}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Terminal Code Input */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Enter shop code"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase font-mono font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 rounded-xl text-xs font-bold text-white shadow-sm"
            >
              Pair
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
