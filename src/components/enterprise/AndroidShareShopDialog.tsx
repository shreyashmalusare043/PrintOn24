import { ChevronDown, MapPin, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';

interface AndroidShareShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectShop: (shopId: string) => void;
}

export const AndroidShareShopDialog: React.FC<AndroidShareShopDialogProps> = ({
  open,
  onOpenChange,
  onSelectShop
}) => {
  const { enterprises } = usePrintPerfect();
  const [search, setSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredShops = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return enterprises.filter(shop =>
      !query ||
      shop.name.toLocaleLowerCase().includes(query) ||
      shop.terminalCode.toLocaleLowerCase().includes(query) ||
      shop.shortCode.toLocaleLowerCase().includes(query)
    );
  }, [enterprises, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 sm:max-h-[calc(100vh-2rem)]">
        <DialogHeader className="min-w-0 border-b border-slate-100 p-5 pr-12 text-left">
          <DialogTitle className="text-lg font-extrabold text-slate-900">
            Select PrintHub
          </DialogTitle>
          <DialogDescription className="break-words text-sm text-slate-600">
            Connect to a print shop to upload your shared document.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 min-w-0 space-y-3 overflow-y-auto p-4">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={event => {
                  setSearch(event.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Search by shop name or code"
                aria-label="Search print shops by name or code"
                className="h-11 min-w-0 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#FF1300] focus:ring-2 focus:ring-[#FF1300]/20"
              />
            </label>
            <button
              type="button"
              aria-label={isDropdownOpen ? 'Close print shop list' : 'Open print shop list'}
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen(value => !value)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="max-h-[35dvh] min-w-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredShops.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-600">
                  No PrintHub found. Check the shop name or code.
                </p>
              ) : (
                filteredShops.map(shop => (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => onSelectShop(shop.id)}
                    className="flex min-w-0 w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-red-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {shop.name}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </span>
                    </span>
                    <span className="max-w-[40%] shrink rounded-md bg-slate-100 px-2 py-1 text-right text-xs font-semibold text-slate-700 [overflow-wrap:anywhere]">
                      {shop.terminalCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};