import React from 'react';
import {
  X,
  Printer,
  Receipt,
  Crown,
  BarChart3,
  Bell,
  Info,
  ShieldCheck,
  FileText,
  Settings,
  Briefcase,
  MessageSquare,
  Megaphone,
  Phone,
  ChevronRight,
  Store,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Sheet, SheetContent } from '../ui/sheet';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { user, unreadNotifCount } = usePrintPerfect();

  const mainItems = [
    { id: 'upload', label: 'My Prints', icon: Printer, desc: 'Upload, config & print documents' },
    { id: 'receipts', label: 'My Receipts', icon: Receipt, desc: 'Invoices & download records' },
    { id: 'memberships', label: 'Memberships', icon: Crown, desc: 'Active student discounts' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, desc: 'Spending stats & trends' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      desc: 'Order updates & alerts',
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined
    }
  ];

  const secondaryItems = [
    { id: 'about_us', label: 'About Us', icon: Info, desc: 'Vision, mission & background' },
    { id: 'privacy_policy', label: 'Privacy Policy', icon: ShieldCheck, desc: 'Data protection & security' },
    { id: 'terms_conditions', label: 'Terms & Conditions', icon: FileText, desc: 'Usage guidelines & terms' },
    { id: 'settings', label: 'Settings & Preferences', icon: Settings, desc: 'Theme, alerts, print presets' },
    { id: 'careers', label: 'Careers', icon: Briefcase, desc: 'Job openings & partnerships' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, desc: 'User experience & reviews' },
    { id: 'request_ads', label: 'Request for Ads', icon: Megaphone, desc: 'Partner promotions & billboards' },
    { id: 'contact_us', label: 'Contact Us', icon: Phone, desc: 'Support helpline & office' }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-sm p-0 bg-white border-r border-red-100 flex flex-col z-50 overflow-hidden"
      >
        {/* Drawer Header: Profile Block at top of left nav (Requirement 3) */}
        <div className="bg-gradient-to-br from-[#E01100] to-[#FF1300] p-5 text-white flex flex-col relative shadow-md">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!user.isAuthenticated || user.isGuest ? (
            /* Guest User Left Navbar Logo:
               Increased logo height by ~2.5-3px (from h-9/36px to h-[39px])
               with tagline "Scan, Upload and Print." directly below it per Requirement 5 */
            <div className="flex flex-col items-start justify-center py-2 select-none">
              <img
                src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png"
                alt="PrintOn24"
                className="h-[39px] w-auto object-contain brightness-0 invert drop-shadow-sm"
              />
              <p className="text-[11px] font-medium text-white/95 mt-1 tracking-wide">
                Scan, Upload and Print.
              </p>
            </div>
          ) : (
            /* Logged-in User: Show user's verified profile image and details */
            <div className="flex items-center gap-3 mt-2">
              <div className="w-13 h-13 rounded-2xl bg-white p-0.5 shadow-md shrink-0 overflow-hidden">
                <img
                  src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
                  alt={user.name || 'User'}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-extrabold text-base leading-tight truncate font-heading">
                  {user.name} {user.surname || ''}
                </h3>
                <p className="text-xs text-red-100/90 truncate mt-0.5">
                  {user.email}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold w-max backdrop-blur-sm">
                  <span>Verified User</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Powered by HR-SAC Card (Point 5) */}
        <div className="p-4 bg-sky-50/70 border-b border-sky-100">
          <a
            href="https://hrsactech.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#EBF5FB] hover:bg-[#E1EFF9] border border-sky-200/80 text-slate-800 shadow-xs active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-sky-200/60 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <img
                  src="https://miaoda-conversation-file.s3cdn.medo.dev/user-awm3lxjnyu4g/app-epyrkfdiozk1/20261013/HR-SAC.png"
                  alt="High Resolution Software and Coding"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left min-w-0">
                <p className="font-extrabold text-xs text-sky-900 font-heading">
                  Powered by
                </p>
                <p className="text-[11px] font-semibold text-slate-700 leading-tight">
                  High resolution software and coding
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-sky-600 shrink-0" />
          </a>
        </div>

        {/* Drawer Menu Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
          {/* Main App Navigation */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Main Navigation
            </span>
            {mainItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate(item.id);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50/60 active:bg-red-100/60 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#FF1300] flex items-center justify-center shrink-0 group-hover:bg-[#FF1300] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-heading">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#FF1300] text-white">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF1300] transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100" />

          {/* Company & Support Navigation */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Company & Policies
            </span>
            {secondaryItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate(item.id);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:text-[#FF1300]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-heading">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
