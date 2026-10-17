import React, { useState } from 'react';
import {
  X,
  Store,
  Printer,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

interface StartBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StartBusinessModal: React.FC<StartBusinessModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, updateUser } = usePrintPerfect();
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('Pune');
  const [printersCount, setPrintersCount] = useState('2');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error('Please enter your shop or business name');
      return;
    }
    updateUser({ businessOnboarded: true });
    setSubmitted(true);
    toast.success('Application received! Welcome to printOn24 Business.');
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden bg-white rounded-3xl">
        <DialogHeader className="p-4 bg-gradient-to-r from-[#0052CC] to-[#0066FF] text-white flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-extrabold text-white text-left">
                Printer Business Panel Onboarding
              </DialogTitle>
              <p className="text-[10px] text-blue-100 text-left">
                Convert student footfall into instant digital print revenue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Application Submitted!
            </h3>
            <p className="text-xs text-slate-500">
              Our partner deployment agent will set up your printOn24 terminal QR code within 24 hours.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Value props */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
                <Printer className="w-5 h-5 text-[#0066FF] mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-800">Auto Queue</p>
                <p className="text-[9px] text-slate-500">No pendrive hassle</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-800">Instant UPI</p>
                <p className="text-[9px] text-slate-500">Zero counter delays</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-100">
                <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-800">3x Orders</p>
                <p className="text-[9px] text-slate-500">Nearby discovery</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. Balaji Xerox & Laser Prints"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Area
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Available Machines
                  </label>
                  <select
                    value={printersCount}
                    onChange={e => setPrintersCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="1">1 Printer</option>
                    <option value="2">2-4 Printers</option>
                    <option value="5+">5+ Industrial Printers</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all mt-2"
              >
                Register as Print Shop Partner
              </button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
