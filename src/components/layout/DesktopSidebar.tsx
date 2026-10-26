import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  Crown,
  FileText,
  Home,
  Info,
  Megaphone,
  MessageSquare,
  Phone,
  Printer,
  Receipt,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';

export type DesktopNavView =
  | 'home'
  | 'upload'
  | 'my_prints'
  | 'my_receipts'
  | 'memberships'
  | 'reports'
  | 'notifications'
  | 'about_us'
  | 'privacy_policy'
  | 'terms_conditions'
  | 'settings'
  | 'careers'
  | 'feedback'
  | 'request_ads'
  | 'contact_us';

interface DesktopSidebarProps {
  currentView?: DesktopNavView | string;
  activeNav?: string;
  onNavigate: (view: any) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentView = 'home',
  activeNav,
  onNavigate
}) => {
  const { user, unreadNotifCount, t } = usePrintPerfect();

  const effectiveView = activeNav || currentView;

  const mainNavItems: Array<{
    id: string;
    label: string;
    icon: any;
    hasChevron: boolean;
    badge?: number;
  }> = [
    { id: 'home', label: t('home'), icon: Home, hasChevron: false },
    { id: 'upload', label: t('upload'), icon: Printer, hasChevron: true },
    { id: 'receipts', label: t('viewReceipt'), icon: Receipt, hasChevron: true },
    { id: 'memberships', label: 'Memberships', icon: Crown, hasChevron: true },
    { id: 'reports', label: t('report'), icon: BarChart3, hasChevron: true },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      hasChevron: false,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined
    }
  ];

  const secondaryNavItems = [
    { id: 'about_us', label: 'About Us', icon: Info },
    { id: 'privacy_policy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'terms_conditions', label: 'Terms & Conditions', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ] as const;

  const tertiaryNavItems = [
    { id: 'careers', label: 'Careers', icon: Briefcase },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'request_ads', label: 'Request for Ads', icon: Megaphone },
    { id: 'contact_us', label: 'Contact Us', icon: Phone }
  ] as const;

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 z-40 select-none overflow-y-auto overflow-x-hidden">
      {/* Brand & Profile Section at top of Left Navigation (Requirement 8) */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        {/* Official Original PrintOn24 Logo Asset (Desktop Only) */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center justify-start cursor-pointer hover:opacity-90 transition-opacity py-1 px-1"
        >
          <img
            src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png"
            alt="PrintOn24"
            className="h-8 w-auto object-contain"
          />
        </div>

        {!user.isAuthenticated || user.isGuest ? null : (
          /* Logged-in user: Show the user's profile image and details */
          <div
            onClick={() => onNavigate('profile')}
            className="p-3 bg-gradient-to-r from-red-50/90 via-rose-50/70 to-amber-50/50 rounded-2xl border border-red-100 flex items-center gap-3 cursor-pointer hover:border-red-200 transition-all shadow-2xs group"
          >
            <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-red-200 shadow-xs shrink-0 overflow-hidden">
              <img
                src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
                alt={user.name || 'User'}
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h4 className="text-xs font-bold text-slate-900 truncate font-heading group-hover:text-[#FF1300] transition-colors">
                {user.name} {user.surname || ''}
              </h4>
              <p className="text-[10px] text-slate-500 truncate">
                {user.phone || user.email || 'Verified User'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FF1300] transition-colors shrink-0" />
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-3 space-y-4 text-xs font-semibold">
        {/* Main Section */}
        <div className="space-y-1">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = effectiveView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id as DesktopNavView)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-[#FF1300] text-white shadow-sm shadow-red-500/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white text-[#FF1300]' : 'bg-[#FF1300] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.hasChevron && (
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider 1 */}
        <div className="border-t border-slate-100 my-2" />

        {/* Secondary Section (Company & Policies) */}
        <div className="space-y-1">
          {secondaryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = effectiveView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id as DesktopNavView)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#FF1300] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF1300]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider 2 */}
        <div className="border-t border-slate-100 my-2" />

        {/* Tertiary Section (Careers, Feedback, Ads, Contact) */}
        <div className="space-y-1">
          {tertiaryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = effectiveView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id as DesktopNavView)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#FF1300] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF1300]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Promo Card - Start Your Printing Business matching Image 1 */}
      <div className="p-3 mt-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-50 via-rose-50/60 to-red-100/50 p-4 border border-red-100 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-red-600 font-heading leading-tight">
                Start Your<br />Printing Business
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Join printOn24 as a shop owner.
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-red-100 flex items-center justify-center shrink-0 text-2xl">
              🏪
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.assign('https://partner.printon24.in/enquiry')}
            className="mt-3 w-full py-1.5 px-3 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-transform font-heading"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
