import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X, Check, Settings2 } from 'lucide-react';
import { saveUserConsent } from '../../services/api';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    // Check if user previously made a cookie consent decision
    try {
      const consent = localStorage.getItem('printon24_cookie_consent');
      if (!consent) {
        // Show banner immediately on website open
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('printon24_cookie_consent', JSON.stringify({
        status: 'accepted',
        essential: true,
        analytics: true,
        marketing: true,
        timestamp: new Date().toISOString()
      }));
      saveUserConsent('guest', 'cookie_consent_all', true).catch(() => {});
    } catch (e) {
      console.warn('LocalStorage consent save skipped:', e);
    }
    setIsVisible(false);
    setShowManageModal(false);
  };

  const handleRejectAll = () => {
    try {
      localStorage.setItem('printon24_cookie_consent', JSON.stringify({
        status: 'rejected',
        essential: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString()
      }));
      saveUserConsent('guest', 'cookie_consent_rejected', false).catch(() => {});
    } catch (e) {
      console.warn('LocalStorage consent save skipped:', e);
    }
    setIsVisible(false);
    setShowManageModal(false);
  };

  const handleSaveCustom = () => {
    try {
      localStorage.setItem('printon24_cookie_consent', JSON.stringify({
        status: 'custom',
        essential: true,
        analytics: analyticsEnabled,
        marketing: marketingEnabled,
        timestamp: new Date().toISOString()
      }));
      saveUserConsent('guest', 'cookie_consent_custom', true).catch(() => {});
    } catch (e) {
      console.warn('LocalStorage consent save skipped:', e);
    }
    setIsVisible(false);
    setShowManageModal(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Cookie Consent Banner placed right above the bottom navigation bar */}
      <aside
        aria-label="Cookie Consent"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-red-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 sm:p-5 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-[#FF1300]">
              <Cookie className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-900 font-heading">
                  Cookie & Privacy Consent
                </h4>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
                  aria-label="Close and reject non-essential cookies"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                printOn24 uses essential cookies for secure print jobs, order tracking, and a fast user experience. You can accept or manage your cookie preferences below.
              </p>
            </div>
          </div>

          {/* Action Buttons: Accept Cookies & Reject/Manage Cookies */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="w-full sm:flex-1 py-2 px-3.5 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all font-heading flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Accept Cookies</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManageModal(true)}
              className="w-full sm:flex-1 py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold border border-slate-200 transition-all font-heading flex items-center justify-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Reject / Manage</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Manage Cookies Preferences Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF1300]" />
                <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                  Manage Cookie Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select which cookie types you would like to enable:
            </p>

            <div className="space-y-3">
              {/* Essential Cookies */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 font-heading">Essential Cookies</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">Always Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Required for user login, 12-hour document lifecycle security, and order processing.
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 font-heading">Analytics Cookies</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Helps us measure system performance, response time, and app reliability.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={e => setAnalyticsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF1300] focus:ring-[#FF1300] cursor-pointer mt-0.5"
                />
              </div>

              {/* Marketing Cookies */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 font-heading">Marketing Cookies</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Used to display campus print discounts and promotional partnership offers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingEnabled}
                  onChange={e => setMarketingEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF1300] focus:ring-[#FF1300] cursor-pointer mt-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all font-heading"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 py-2 px-3 rounded-xl bg-[#FF1300] hover:bg-[#E01100] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all font-heading"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
