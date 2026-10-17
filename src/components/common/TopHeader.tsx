import React from 'react';
import {
  Menu,
  Bell,
  Globe,
  CheckCircle2,
  ChevronDown,
  Building2,
  Store,
  RotateCcw
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import type { Language } from '../../types/printperfect';

import { getShopInitials } from '../../utils/shopInitials';

interface TopHeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  onSelectEnterpriseModal?: () => void;
  onOpenProfile?: () => void;
  className?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenDrawer,
  onOpenNotifications,
  onSelectEnterpriseModal,
  className = ''
}) => {
  const {
    user,
    orders,
    selectedEnterprise,
    hasExplicitlySelectedEnterprise,
    enterprises,
    selectEnterprise,
    resetEnterpriseSelection,
    unreadNotifCount,
    setLanguage
  } = usePrintPerfect();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  // Filter shops per Requirement 5:
  // - Show only transacted shops from user order history
  // - QR-scanned / actively connected shop auto-connects and is included
  // - Hide global list for guests
  const isGuest = !user.isAuthenticated || user.isGuest;

  const transactedEnterpriseIds = new Set(
    (orders || [])
      .map(o => o.enterpriseId)
      .filter(Boolean)
  );
  const transactedEnterpriseNames = new Set(
    (orders || [])
      .map(o => o.enterpriseName)
      .filter(Boolean)
  );

  const displayedShops = enterprises.filter(ent => {
    // If currently selected / QR-scanned, keep visible
    if (hasExplicitlySelectedEnterprise && ent.id === selectedEnterprise.id) {
      return true;
    }
    // If guest, hide all non-connected global shops
    if (isGuest) {
      return false;
    }
    // For authenticated users, show ONLY shops they have transacted with
    return transactedEnterpriseIds.has(ent.id) || transactedEnterpriseNames.has(ent.name);
  });

  // Fallback shop image if none is set
  const shopImage = selectedEnterprise.logoUrl || '';

  return (
    <header className={`sticky top-0 z-30 w-full backdrop-blur-md pt-2.5 pb-2 px-4 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.04)] border-b border-slate-100 bg-white rounded-br-[50px] ${className}`}>
      {/* Top Utility Row */}
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Left: Hamburger + Brand (Only Logo & Name, no slogan) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-1.5 -ml-1 text-slate-800 hover:text-[#FF1300] active:scale-95 transition-transform rounded-xl hover:bg-red-50 focus:outline-none"
            aria-label="Open Menu Drawer"
          >
            <Menu className="w-6 h-6 stroke-[2.4]" />
          </button>

          {/* Official printOn24 Brand Logo - Image 1 */}
          <div className="flex items-center select-none py-0.5">
            <img
              src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png"
              alt="printOn24"
              className="h-8 md:h-9 w-auto object-contain max-w-[150px]"
              data-editor-config="%7B%22defaultSrc%22%3A%22https%3A%2F%2Fmiaoda-edit-image.s3cdn.medo.dev%2Fepyrkfdiozk1%2FIMG-ewtql3b6vf28.png%22%7D" />
          </div>
        </div>

        {/* Right Actions: Notification & Language shifted to right with clean alignment */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Icon with badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-700 hover:text-[#FF1300] active:scale-95 transition-transform rounded-full hover:bg-red-50"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF1300] text-[10px] font-bold text-white flex items-center justify-center border border-white shadow-sm">
                {unreadNotifCount}
              </span>
            )}
          </button>
          {/* Language Indicator - English Only */}

        </div>
      </div>
      {/* Context Sub-Bar: Enterprise Dropdown (Shows 'Select Enterprise' if none chosen yet, or selected shop) */}
      <div className="mt-2 pt-2 border-t border-red-100/70 flex items-center justify-between max-w-lg mx-auto text-xs">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 p-1 -ml-1 rounded-2xl hover:bg-white/80 transition-colors text-left group"
            >
              {hasExplicitlySelectedEnterprise ? (
                <>
                  {/* Shopkeeper circular profile image */}
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#FF1300] shadow-sm shrink-0 bg-white flex items-center justify-center">
                    {shopImage ? (
                      <img
                        src={shopImage}
                        alt={selectedEnterprise.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.dynamic-initials-fallback')) {
                            const span = document.createElement('span');
                            span.className = 'dynamic-initials-fallback text-xs font-black text-[#FF1300] font-heading';
                            span.innerText = getShopInitials(selectedEnterprise.name);
                            parent.appendChild(span);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xs font-black text-[#FF1300] font-heading">
                        {getShopInitials(selectedEnterprise.name)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 truncate text-[13px] group-hover:text-[#FF1300] font-heading">
                        {selectedEnterprise.name}
                      </span>
                      {selectedEnterprise.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 fill-[#10B981] text-white shrink-0" />
                      )}
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-[#FF1300]" />
                    </div>
                    <span className="text-[10px] text-slate-500 leading-none">
                      Connected • {selectedEnterprise.terminalCode}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-dashed border-[#FF1300] flex items-center justify-center shrink-0 text-[#FF1300]">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 truncate text-[13px] group-hover:text-[#FF1300] font-heading">
                        Select Enterprises
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-[#FF1300]" />
                    </div>
                    <span className="text-[10px] text-slate-500 leading-none">
                      Tap to choose your print shop
                    </span>
                  </div>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 bg-white rounded-2xl shadow-xl border border-red-100 p-1.5 z-40 max-h-80 overflow-y-auto">
            <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isGuest ? 'Connected Campus Shop' : 'Your Campus Print Shops'}
            </div>

            {displayedShops.length === 0 ? (
              <div className="p-3 text-center space-y-1">
                <Store className="w-5 h-5 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No Connected Shop</p>
                <p className="text-[11px] text-slate-400">
                  {isGuest
                    ? 'Scan counter QR code to connect with your campus print shop.'
                    : 'No past transacted shops yet. Scan shop QR code to connect.'}
                </p>
              </div>
            ) : (
              displayedShops.map(ent => {
                const entImg = ent.logoUrl || '';
                const isSelected = hasExplicitlySelectedEnterprise && ent.id === selectedEnterprise.id;
                return (
                  <DropdownMenuItem
                    key={ent.id}
                    onClick={() => selectEnterprise(ent.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer ${
                      isSelected ? 'bg-red-50 text-[#FF1300] font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center">
                        {entImg ? (
                          <img
                            src={entImg}
                            alt={ent.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.dynamic-initials-fallback')) {
                                const span = document.createElement('span');
                                span.className = 'dynamic-initials-fallback text-[10px] font-bold text-slate-700';
                                span.innerText = getShopInitials(ent.name);
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-700">
                            {getShopInitials(ent.name)}
                          </span>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 leading-none truncate">
                          {ent.name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {ent.terminalCode} • {ent.address}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#FF1300] bg-red-100/80 px-1.5 py-0.5 rounded-md shrink-0">
                        Active
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })
            )}

            {/* Reset Option if a shop is active */}
            {hasExplicitlySelectedEnterprise && (
              <DropdownMenuItem
                onClick={() => resetEnterpriseSelection()}
                className="flex items-center gap-2 p-2 rounded-xl cursor-pointer text-xs font-bold text-slate-600 hover:text-[#FF1300] hover:bg-red-50 border-t border-slate-100 mt-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FF1300]" />
                <span>Disconnect Shop</span>
              </DropdownMenuItem>
            )}

            {!isGuest && onSelectEnterpriseModal && (
              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onSelectEnterpriseModal}
                  className="w-full py-1.5 text-center text-xs font-bold text-[#FF1300] hover:bg-red-50 rounded-lg transition-colors font-heading"
                >
                  View All Partner Print Shops →
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
