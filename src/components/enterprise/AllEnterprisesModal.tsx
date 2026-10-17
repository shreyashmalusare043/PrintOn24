import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  Star,
  MapPin,
  ChevronRight,
  Mic,
  MicOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import type { PrintEnterprise } from '../../types/printperfect';
import { toast } from 'sonner';

interface AllEnterprisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEnterprise: (enterpriseId: string) => void;
}

export const AllEnterprisesModal: React.FC<AllEnterprisesModalProps> = ({
  isOpen,
  onClose,
  onSelectEnterprise
}) => {
  const { enterprises, selectEnterprise, user } = usePrintPerfect();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-suggestion loop in search placeholder
  const shopNames = enterprises.map(e => e.name);
  const [loopIndex, setLoopIndex] = useState(0);

  useEffect(() => {
    const loopTimer = setInterval(() => {
      setLoopIndex(prev => (prev + 1) % shopNames.length);
    }, 2500);
    return () => clearInterval(loopTimer);
  }, [shopNames.length]);

  // Working Voice / Mic Search
  const toggleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Voice search simulation: speech recognition not supported in this browser environment.');
      setSearch('Campus');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = user.selectedLanguage === 'MR' ? 'mr-IN' : 'en-IN';
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening... Speak partner shop name');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setSearch(text);
        toast.success(`Voice captured: "${text}"`);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice search error. Please try typing.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      toast.error('Voice input unavailable');
    }
  };

  const categories = ['All', 'Digital Printing', 'Copier & Laser', 'Blueprint & Offset'];

  const filtered = enterprises.filter(e => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.address.toLowerCase().includes(search.toLowerCase()) ||
      e.terminalCode.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      categoryFilter === 'All' ||
      e.category.toLowerCase().includes(categoryFilter.toLowerCase().split(' ')[0]);
    return matchesSearch && matchesCat;
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      {/* Mobile-first responsive width & padding */}
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg p-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100 text-left shrink-0 pr-12">
          <DialogTitle className="text-sm font-bold text-slate-900 font-heading">
            All Partner Print Shops
          </DialogTitle>
          <p className="text-[11px] text-slate-500">
            Verified campus xerox & high-speed laser hubs
          </p>
        </DialogHeader>

        <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* Search Bar with Looping shop suggestions & working Mic */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#FF1300] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search "${shopNames[loopIndex] || 'Campus Fast Print'}"...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-11 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/25 focus:border-[#FF1300] focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={toggleVoiceSearch}
              className={`absolute right-2.5 p-1 rounded-full transition-all ${
                isListening
                  ? 'bg-[#FF1300] text-white animate-pulse'
                  : 'text-slate-400 hover:text-[#FF1300]'
              }`}
              title="Voice Search"
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Category Suggestion Tags */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap text-[11px] font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#FF1300] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Responsive List of Shops for Mobile and Desktop */}
          <div className="space-y-2 pr-0.5">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No printing shops found matching "{search}"
              </div>
            ) : (
              filtered.map(enterprise => {
                const photo =
                  enterprise.logoUrl ||
                  'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=256&q=80';
                return (
                  <button
                    key={enterprise.id}
                    type="button"
                    onClick={() => {
                      selectEnterprise(enterprise.id);
                      onSelectEnterprise(enterprise.id);
                      onClose();
                    }}
                    className="w-full bg-slate-50/80 hover:bg-red-50/40 p-3 rounded-2xl border border-slate-200/80 hover:border-[#FF1300]/50 transition-all text-left flex items-center justify-between group gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 shadow-xs shrink-0 bg-white">
                        <img
                          src={photo}
                          alt={enterprise.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#FF1300] truncate font-heading">
                            {enterprise.name}
                          </h4>
                          {enterprise.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-white shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{enterprise.address}</span>
                        </p>
                        {/* Wrapped and responsive info on mobile */}
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-semibold">
                          <span className="text-amber-500 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {enterprise.rating}
                          </span>
                          <span>•</span>
                          <span className="text-slate-700">B&W: ₹{enterprise.pricing.blackAndWhite}/pg</span>
                          <span>•</span>
                          <span className="text-slate-700">Color: ₹{enterprise.pricing.colour}/pg</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FF1300] shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
