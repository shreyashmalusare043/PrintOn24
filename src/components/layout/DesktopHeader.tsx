import { Capacitor } from '@capacitor/core';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  Crown,
  Download,
  Globe,
  Menu,
  Printer,
  RotateCcw,
  Search
} from 'lucide-react';
import React, { useState } from 'react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { APP_DOWNLOAD_URL } from '../../lib/appLinks';
import type { Language } from '../../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';

interface DesktopHeaderProps {
  onSearch?: (query: string) => void;
  onOpenNotifications: () => void;
  onOpenUpload?: () => void;
  onOpenProfile: () => void;
  onToggleSidebar?: () => void;
  onSelectEnterprise?: (enterpriseId: string) => void;
  onNavigate?: (view: any) => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  onSearch,
  onOpenNotifications,
  onOpenUpload,
  onOpenProfile,
  onToggleSidebar,
  onSelectEnterprise,
  onNavigate
}) => {
  const {
    user,
    enterprises,
    selectedEnterprise,
    hasExplicitlySelectedEnterprise,
    selectEnterprise,
    resetEnterpriseSelection,
    unreadNotifCount,
    setLanguage,
    t
  } = usePrintPerfect();

  const [searchVal, setSearchVal] = useState('');
  const isWeb = !Capacitor.isNativePlatform();
  // User Requirement: "switch partenr print shop cha dropdown ahe tithe fisrt alwasy bu defoult madhe konich select karu nko fakt Select Enterprises cha show kar"
  const [hasManuallySelectedShop, setHasManuallySelectedShop] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchVal);
    }
  };

  const handleSelectShop = (entId: string) => {
    selectEnterprise(entId);
    setHasManuallySelectedShop(true);
    if (onSelectEnterprise) {
      onSelectEnterprise(entId);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.05)] px-6 py-2.5 flex items-center justify-between gap-4 select-none">
      {/* Left: Hamburger + Search Input */}
      <div className="flex items-center gap-3.5 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-700 hover:text-[#FF1300] hover:bg-slate-50 rounded-xl transition-colors"
          aria-label="Toggle Navigation"
        >

        </button>

        {/* Global Search Bar (matching Image 1) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchVal}
              onChange={e => {
                setSearchVal(e.target.value);
                if (onSearch) onSearch(e.target.value);
              }}
              placeholder="Search for a print shop, document or service..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#FF1300] focus:ring-2 focus:ring-red-100 focus:outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 ml-[0px] mr-[0px]"
            />
          </div>
        </form>
      </div>
      {/* Right Actions: Partner Shop Dropdown + Notifications + Language + Start Business + User Profile Pill */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Partner Print Shop Selector Dropdown (Defaulting to "Select Enterprises" as requested) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-[#FF1300] hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs max-w-[200px]"
            >
              <Building2 className="w-3.5 h-3.5 text-[#FF1300] shrink-0" />
              <span className="truncate">
                {hasExplicitlySelectedEnterprise ? selectedEnterprise.name : 'Select Enterprises'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 max-h-80 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
              Switch Partner Print Shop
            </div>
            {enterprises.map(ent => {
              const isSelected = hasExplicitlySelectedEnterprise && selectedEnterprise.id === ent.id;
              return (
                <DropdownMenuItem
                  key={ent.id}
                  onClick={() => handleSelectShop(ent.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-red-50 text-[#FF1300] font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                      {ent.shortCode}
                    </span>
                    <div className="truncate">
                      <p className="truncate font-semibold">{ent.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{ent.address}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#FF1300] shrink-0" />}
                </DropdownMenuItem>
              );
            })}

            {/* Reset Option */}
            <DropdownMenuItem
              onClick={() => {
                resetEnterpriseSelection();
                setHasManuallySelectedShop(false);
              }}
              className="flex items-center gap-2 p-2 rounded-xl cursor-pointer text-xs font-bold text-slate-600 hover:text-[#FF1300] hover:bg-red-50 border-t border-slate-100 mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FF1300]" />
              <span>Reset</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Notifications Icon with Badge */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-700 hover:text-[#FF1300] rounded-full hover:bg-red-50 transition-colors"
          aria-label="View Notifications"
        >
          <Bell className="w-5 h-5 stroke-[2]" />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF1300] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-xs">
              {unreadNotifCount}
            </span>
          )}
        </button>
        {isWeb && (
          <a
            href={APP_DOWNLOAD_URL}
            download="printon24.apk"
            className="p-2 text-slate-700 hover:text-[#FF1300] rounded-full hover:bg-red-50 transition-colors"
            aria-label="Download App"
            title="Download App"
          >
            <Download className="w-5 h-5" />
          </a>
        )}
        {/* Language Indicator - English Only */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 rounded-full border border-slate-200 bg-white shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-slate-600" />
          <span>English</span>
        </div>
        {/* Start Business Prominent Red Button (Matching Image 1) */}

        {/* User Profile Pill or Sign In Button */}
        {!user.isAuthenticated ? (
          <button
            type="button"
            onClick={() => (onOpenProfile ? onOpenProfile() : null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 bg-red-50/50 hover:bg-red-50 text-xs font-bold text-[#FF1300] transition-colors"
          >
            <span>Sign In</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-slate-200 hover:border-red-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs text-left"
          >
            <img
              src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
              alt={user.name || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] font-semibold text-[#FF1300] flex items-center gap-0.5">
                <Crown className="w-2.5 h-2.5 fill-[#FF1300]" />
                <span>Verified User</span>
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
