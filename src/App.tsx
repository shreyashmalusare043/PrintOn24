import React from 'react';
import { PrintPerfectProvider } from './contexts/PrintPerfectContext';
import { PrintPerfectApp } from './components/layout/PrintPerfectApp';
import { ChromePdfPreviewView } from './components/preview/ChromePdfPreviewView';
import { Toaster } from './components/ui/sonner';
import { PublicVendorPage } from './pages/PublicVendorPage';
import { PublicPrintReportsPage } from './pages/PublicPrintReportsPage';
import { PublicAboutPage } from './pages/PublicAboutPage';
import { PublicCareersPage } from './pages/PublicCareersPage';
import { PublicCareerRolePage } from './pages/PublicCareerRolePage';
import { PublicAdvertisePage } from './pages/PublicAdvertisePage';
import { PublicContactPage } from './pages/PublicContactPage';
import { PublicFeedbackPage } from './pages/PublicFeedbackPage';
import { PublicProfileMembershipPage } from './pages/PublicProfileMembershipPage';
import { PublicHowToUsePage } from './pages/PublicHowToUsePage';
import { PublicPrivacyPolicyPage } from './pages/PublicPrivacyPolicyPage';
import { PublicTermsPage } from './pages/PublicTermsPage';
import { PublicSettingsGuidePage } from './pages/PublicSettingsGuidePage';

const App: React.FC = () => {
  const vendorPath = window.location.pathname.match(/^\/shops\/([^/]+)\/([^/]+)\/?$/i);
  // Check if current route is /preview or query param view=preview
  const isPreviewRoute =
    window.location.pathname.startsWith('/preview') ||
    window.location.search.includes('view=preview');

  if (isPreviewRoute) {
    return (
      <PrintPerfectProvider>
        <ChromePdfPreviewView />
        <Toaster position="top-center" />
      </PrintPerfectProvider>
    );
  }

  if (vendorPath) {
    return <PublicVendorPage slug={vendorPath[2]} />;
  }

  if (window.location.pathname === '/features/print-reports') {
    return <PublicPrintReportsPage />;
  }
  if (/^\/features\/profile-and-membership\/?$/i.test(window.location.pathname)) {
    return <PublicProfileMembershipPage />;
  }
  if (/^\/how-it-works\/?$/i.test(window.location.pathname) || /^\/how-to-use\/?$/i.test(window.location.pathname)) {
    return <PublicHowToUsePage />;
  }
  if (/^\/privacy-policy\/?$/i.test(window.location.pathname) || /^\/privacy(?:\.html)?\/?$/i.test(window.location.pathname)) {
    return <PublicPrivacyPolicyPage redirectFromLegacy={!/^\/privacy-policy\/?$/i.test(window.location.pathname)} />;
  }
  if (/^\/terms-and-conditions\/?$/i.test(window.location.pathname) || /^\/(?:terms|tos)\/?$/i.test(window.location.pathname)) {
    return <PublicTermsPage redirectFromLegacy={!/^\/terms-and-conditions\/?$/i.test(window.location.pathname)} />;
  }
  if (/^\/help\/settings-and-preferences\/?$/i.test(window.location.pathname)) {
    return <PublicSettingsGuidePage />;
  }

  if (/^\/about\/?$/i.test(window.location.pathname)) {
    return <PublicAboutPage />;
  }

  const careerRolePath = window.location.pathname.match(/^\/careers\/([^/]+)\/?$/i);
  if (careerRolePath) return <PublicCareerRolePage slug={careerRolePath[1]} />;
  if (/^\/careers\/?$/i.test(window.location.pathname)) return <PublicCareersPage />;
  if (/^\/advertise\/?$/i.test(window.location.pathname)) return <PublicAdvertisePage />;
  if (/^\/contact\/?$/i.test(window.location.pathname)) return <PublicContactPage />;
  if (/^\/feedback\/?$/i.test(window.location.pathname)) return <PublicFeedbackPage />;

  return (
    <PrintPerfectProvider>
      <PrintPerfectApp />
      <Toaster position="top-center" />
    </PrintPerfectProvider>
  );
};

export default App;
