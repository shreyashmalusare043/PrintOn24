import { Download } from 'lucide-react';
import React from 'react';
import { APP_DOWNLOAD_SUGGESTION_KEY, APP_DOWNLOAD_URL } from '../../lib/appLinks';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

interface AppDownloadSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadSuggestionModal: React.FC<AppDownloadSuggestionModalProps> = ({
  isOpen,
  onClose
}) => {
  const dismissSuggestion = () => {
    localStorage.setItem(APP_DOWNLOAD_SUGGESTION_KEY, 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm p-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-orange-50 px-6 pb-1 pt-2 text-center">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-red-100/70" />
          <DialogTitle className="sr-only">Download PrintOn24</DialogTitle>
          <img
            src={`${import.meta.env.BASE_URL}faviconprinton24.png`}
            alt="PrintOn24"
            className="relative mx-auto -mb-4 h-32 w-32 object-contain"
          />
          <DialogDescription className="relative mx-auto mt-1 max-w-xs text-sm leading-5 text-slate-600">
            Get the PrintOn24 app for a faster, easier printing experience.
          </DialogDescription>
        </div>

        <div className="space-y-1 px-6 pb-2 pt-1">
          <a
            href={APP_DOWNLOAD_URL}
            download="printon24.apk"
            onClick={dismissSuggestion}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF1300] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#e61100] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Download Now
          </a>
          <button
            type="button"
            onClick={dismissSuggestion}
            className="w-full border-0 py-0.5 text-xs font-medium text-slate-500 outline-none transition hover:text-slate-800 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          >
            I already have it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
