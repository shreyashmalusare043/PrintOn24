import React from 'react';
import {
  Home,
  UploadCloud,
  QrCode,
  BarChart3,
  User as UserIcon
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';

export type TabType = 'home' | 'upload' | 'scan' | 'report' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenQuickScan?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab
}) => {
  const { t } = usePrintPerfect();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1">
      <div className="max-w-lg mx-auto px-1 sm:px-3 flex items-center justify-between relative">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onChangeTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'home'
              ? 'text-[#FF1300] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Home className="w-5 h-5 stroke-[2]" />
            {activeTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF1300] rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-1 font-body">{t('home')}</span>
        </button>

        {/* 2. Upload */}
        <button
          type="button"
          onClick={() => onChangeTab('upload')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'upload'
              ? 'text-[#FF1300] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <UploadCloud className="w-5 h-5 stroke-[2]" />
            {activeTab === 'upload' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF1300] rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-1 font-body">{t('upload')}</span>
        </button>

        {/* 3. Center Floating In-Layout Scan Button */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-6">
          <button
            type="button"
            onClick={() => onChangeTab('scan')}
            className={`w-14 h-14 rounded-full bg-[#FF1300] text-white flex items-center justify-center shadow-lg shadow-red-500/40 ring-4 ring-white active:scale-95 transition-all hover:bg-[#E01100] hover:shadow-red-500/60 ${
              activeTab === 'scan' ? 'ring-[#FF1300]/30 scale-105' : ''
            }`}
            aria-label="Scan Shop Terminal"
          >
            <QrCode className="w-7 h-7 stroke-[2.2]" />
          </button>
          <span className={`text-[11px] font-bold mt-1 font-heading ${
            activeTab === 'scan' ? 'text-[#FF1300]' : 'text-slate-600'
          }`}>
            Scan
          </span>
        </div>

        {/* 4. Report */}
        <button
          type="button"
          onClick={() => onChangeTab('report')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'report'
              ? 'text-[#FF1300] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <BarChart3 className="w-5 h-5 stroke-[2]" />
            {activeTab === 'report' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF1300] rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-1 font-body">{t('report')}</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          onClick={() => onChangeTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'profile'
              ? 'text-[#FF1300] font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <UserIcon className="w-5 h-5 stroke-[2]" />
            {activeTab === 'profile' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF1300] rounded-full" />
            )}
          </div>
          <span className="text-[11px] mt-1 font-body">{t('profile')}</span>
        </button>
      </div>
    </nav>
  );
};
