import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { usePrintPerfect, PrintPerfectContext, PrintPerfectProvider } from '../../contexts/PrintPerfectContext';
import { TopHeader } from '../common/TopHeader';
import { BottomNav, type TabType } from '../common/BottomNav';
import { NavigationDrawer } from '../common/NavigationDrawer';
import { NotificationsModal } from '../common/NotificationsModal';
import { StartBusinessModal } from '../common/StartBusinessModal';
import { DrawerContentModal } from '../drawer/DrawerContentModal';
import { AllEnterprisesModal } from '../enterprise/AllEnterprisesModal';
import { ShortViewReceiptModal } from '../home/ShortViewReceiptModal';
import { AuthModal } from '../auth/AuthModal';

// Desktop Shell Components
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopHeader } from './DesktopHeader';
import { DesktopHomeView } from '../home/DesktopHomeView';

// Core Application Views
import { HomeView } from '../home/HomeView';
import { SpecificEnterpriseView } from '../enterprise/SpecificEnterpriseView';
import { UploadConfigurationView } from '../upload/UploadConfigurationView';
import { ScanView } from '../scan/ScanView';
import { CheckoutView } from '../checkout/CheckoutView';
import { ThermalReceiptView } from '../receipt/ThermalReceiptView';
import { ReportAnalyticsView } from '../report/ReportAnalyticsView';
import { ProfileView } from '../profile/ProfileView';
import { MyReceiptsView } from '../receipt/MyReceiptsView';

// Dedicated Left Menu Full Page Views
import { StartBusinessView } from '../pages/StartBusinessView';
import { AboutUsView } from '../pages/AboutUsView';
import { PrivacyPolicyView } from '../pages/PrivacyPolicyView';
import { TermsConditionsView } from '../pages/TermsConditionsView';
import { SettingsPreferencesView } from '../pages/SettingsPreferencesView';
import { CareersView } from '../pages/CareersView';
import { FeedbackView } from '../pages/FeedbackView';
import { RequestAdsView } from '../pages/RequestAdsView';
import { ContactUsView } from '../pages/ContactUsView';
import { CookieConsentBanner } from '../common/CookieConsentBanner';

import type { PrintOrder } from '../../types/printperfect';

type ActiveView =
  | 'home'
  | 'specific_enterprise'
  | 'upload'
  | 'scan'
  | 'checkout'
  | 'thermal_receipt'
  | 'report'
  | 'profile'
  | 'my_receipts'
  | 'start_business'
  | 'about_us'
  | 'privacy_policy'
  | 'terms_conditions'
  | 'settings'
  | 'careers'
  | 'feedback'
  | 'request_ads'
  | 'contact_us';

const PrintPerfectAppContent: React.FC = () => {
  const {
    activeReceiptOrder,
    setActiveReceiptOrder,
    enterprises,
    selectEnterprise,
    selectedEnterprise,
    unreadNotifCount,
    orders,
    isAuthModalOpen,
    closeAuthModal,
    authModalTitle,
    authModalSubtitle
  } = usePrintPerfect();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentView, setCurrentView] = useState<ActiveView>('home');

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStartBusinessOpen, setIsStartBusinessOpen] = useState(false);
  const [isAllEnterprisesOpen, setIsAllEnterprisesOpen] = useState(false);
  const [selectedDrawerSection, setSelectedDrawerSection] = useState<string | null>(null);
  const [shortReceiptOrder, setShortReceiptOrder] = useState<PrintOrder | null>(null);

  // Scroll to top automatically whenever route, view, or tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTop = 0;
  }, [currentView, activeTab]);

  // Check for PayU Gateway return parameters (?payment_status=success/failed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payStatus = params.get('payment_status');
    const txnid = params.get('txnid');
    const orderId = params.get('order_id');
    const errorMsg = params.get('error');

    if (payStatus === 'success') {
      toast.success(`Payment verified via PayU! Txn: ${txnid ? txnid.slice(-8) : 'Confirmed'}`);
      window.history.replaceState({}, '', window.location.pathname);
      const matched = orders.find(o => o.id === orderId || (txnid && o.paymentOptionDetail?.includes(txnid)));
      if (matched) {
        setActiveReceiptOrder(matched);
      }
      setCurrentView('thermal_receipt');
    } else if (payStatus === 'failed') {
      toast.error(`PayU Payment Failed or Cancelled: ${errorMsg ? decodeURIComponent(errorMsg) : 'Transaction declined'}`);
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentView('checkout');
    }

    // Auto-connect shop via counter QR scan parameters (?shop=..., ?shopId=..., ?terminal=..., ?qr=...)
    const shopParam = params.get('shop') || params.get('shopId') || params.get('terminal') || params.get('qr');
    if (shopParam && enterprises.length > 0) {
      const found = enterprises.find(
        e => e.id === shopParam || e.terminalCode.toLowerCase() === shopParam.toLowerCase()
      );
      if (found) {
        selectEnterprise(found.id);
        toast.success(`Connected to ${found.name} via QR scan!`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [orders, enterprises]);


  // BottomNav tab change (Mobile)
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentView(tab as ActiveView);
  };

  // Select enterprise from anywhere
  const handleSelectEnterprise = (enterpriseId: string) => {
    selectEnterprise(enterpriseId);
    setCurrentView('specific_enterprise');
  };

  // View short receipt popup
  const handleViewShortReceipt = (order: PrintOrder) => {
    setShortReceiptOrder(order);
  };

  // Open full thermal receipt
  const handleOpenFullThermalReceipt = (order: PrintOrder) => {
    setActiveReceiptOrder(order);
    setCurrentView('thermal_receipt');
  };

  // Handle direct navigation from Desktop Sidebar or Mobile Drawer
  const handleNavigatePage = (section: string) => {
    setSelectedDrawerSection(null);
    setIsDrawerOpen(false);

    switch (section) {
      case 'home':
        setCurrentView('home');
        setActiveTab('home');
        break;
      case 'upload':
      case 'my_prints':
        setCurrentView('upload');
        setActiveTab('upload');
        break;
      case 'receipts':
      case 'my_receipts':
        setCurrentView('my_receipts');
        break;
      case 'memberships':
        setCurrentView('profile');
        setActiveTab('profile');
        break;
      case 'reports':
      case 'report':
        setCurrentView('report');
        setActiveTab('report');
        break;
      case 'notifications':
        setIsNotificationsOpen(true);
        break;
      case 'start_business':
      case 'business':
        setCurrentView('start_business');
        break;
      case 'about':
      case 'about_us':
        setCurrentView('about_us');
        break;
      case 'privacy':
      case 'privacy_policy':
        setCurrentView('privacy_policy');
        break;
      case 'terms':
      case 'terms_conditions':
        setCurrentView('terms_conditions');
        break;
      case 'settings':
      case 'settings_preferences':
        setCurrentView('settings');
        break;
      case 'careers':
        setCurrentView('careers');
        break;
      case 'feedback':
      case 'feedback-ads':
      case 'feedback_ads':
        setCurrentView('feedback');
        break;
      case 'ads':
      case 'request_ads':
      case 'request-ads':
        setCurrentView('request_ads');
        break;
      case 'contact':
      case 'contact_us':
        setCurrentView('contact_us');
        break;
      default:
        setCurrentView('home');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex font-sans select-none antialiased">
      {/* ========================================================= */}
      {/* DESKTOP VIEWPORT (≥ 768px): Left Sidebar + Main Content Column */}
      {/* ========================================================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-100 bg-white sticky top-0 h-screen z-40">
        <DesktopSidebar
          activeNav={
            currentView === 'upload'
              ? 'upload'
              : currentView === 'my_receipts'
              ? 'receipts'
              : currentView === 'report'
              ? 'reports'
              : currentView === 'profile'
              ? 'memberships'
              : currentView
          }
          currentView={currentView}
          onNavigate={handleNavigatePage}
        />
      </aside>
      {/* Main Dynamic Viewport Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-white">
        {/* Desktop Top Header (Hidden on Mobile) */}
        <div className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
          <DesktopHeader
            onOpenUpload={() => {
              setCurrentView('upload');
              setActiveTab('upload');
            }}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenProfile={() => {
              setCurrentView('profile');
              setActiveTab('profile');
            }}
            onSelectEnterprise={handleSelectEnterprise}
            onNavigate={(view) => {
              setCurrentView(view);
              if (['home', 'upload', 'receipts', 'profile'].includes(view)) {
                setActiveTab(view as any);
              }
            }}
          />
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-slate-100 border-[0px] border-solid border-[#ffffff]">
          <TopHeader
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onSelectEnterpriseModal={() => setIsAllEnterprisesOpen(true)}
            className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-solid border-[#ffffff] border-[0px] border-[transparent]" />
        </div>

        {/* Dynamic Page Views */}
        <main className="flex-1 w-full pt-3 md:pt-6">
          {/* 1. Home View */}
          {currentView === 'home' && (
            <>
              {/* Desktop Home Dashboard matching Image 1 */}
              <div className="hidden md:block">
                <DesktopHomeView
                  onSelectEnterprise={handleSelectEnterprise}
                  onOpenUpload={() => {
                    setActiveTab('upload');
                    setCurrentView('upload');
                  }}
                  onViewReceipt={handleViewShortReceipt}
                  onOpenSeeAllEnterprises={() => setIsAllEnterprisesOpen(true)}
                  onOpenMemberships={() => {
                    setActiveTab('profile');
                    setCurrentView('profile');
                  }}
                />
              </div>

              {/* Mobile Home Dashboard (Kept intact for Mobile) */}
              <div className="md:hidden">
                <HomeView
                  onSelectEnterprise={handleSelectEnterprise}
                  onOpenUpload={() => {
                    setActiveTab('upload');
                    setCurrentView('upload');
                  }}
                  onViewReceipt={handleViewShortReceipt}
                  onOpenSeeAllEnterprises={() => setIsAllEnterprisesOpen(true)}
                  onOpenOffers={() => setIsAllEnterprisesOpen(true)}
                />
              </div>
            </>
          )}

          {/* 2. Specific Enterprise View */}
          {currentView === 'specific_enterprise' && (
            <SpecificEnterpriseView
              onBack={() => {
                setCurrentView('home');
                setActiveTab('home');
              }}
              onOpenUpload={() => {
                setActiveTab('upload');
                setCurrentView('upload');
              }}
              onViewReceipt={handleViewShortReceipt}
            />
          )}

          {/* 3. Upload & Configure View */}
          {currentView === 'upload' && (
            <UploadConfigurationView
              onProceedToCheckout={() => setCurrentView('checkout')}
              onBackToHome={() => {
                setActiveTab('home');
                setCurrentView('home');
              }}
            />
          )}

          {/* 4. Scanner View (Desktop Code Entry / Mobile Camera) */}
          {currentView === 'scan' && (
            <ScanView
              onProceedToUpload={() => {
                setActiveTab('upload');
                setCurrentView('upload');
              }}
            />
          )}

          {/* 5. Checkout View */}
          {currentView === 'checkout' && (
            <CheckoutView
              onBack={() => setCurrentView('upload')}
              onOrderSuccess={order => {
                setActiveReceiptOrder(order);
                setCurrentView('thermal_receipt');
              }}
            />
          )}

          {/* 6. Thermal Tax Receipt View */}
          {currentView === 'thermal_receipt' && activeReceiptOrder && (
            <ThermalReceiptView
              order={activeReceiptOrder}
              onBackToHome={() => {
                setActiveTab('home');
                setCurrentView('home');
              }}
              onNewPrint={() => {
                setActiveTab('upload');
                setCurrentView('upload');
              }}
            />
          )}

          {/* 7. Report & Analytics View */}
          {currentView === 'report' && (
            <ReportAnalyticsView
              onViewReceipt={handleViewShortReceipt}
              onBackToHome={() => {
                setActiveTab('home');
                setCurrentView('home');
              }}
              onOpenMyReceipts={() => handleNavigatePage('my_receipts')}
            />
          )}

          {/* 8. My Receipts Dedicated View */}
          {currentView === 'my_receipts' && (
            <MyReceiptsView
              onViewReceipt={handleOpenFullThermalReceipt}
              onOpenUpload={() => {
                setActiveTab('upload');
                setCurrentView('upload');
              }}
            />
          )}

          {/* 8. Profile View */}
          {currentView === 'profile' && (
            <ProfileView
              onOpenSettings={() => setCurrentView('settings')}
              onConnectShop={handleSelectEnterprise}
            />
          )}

          {/* 9. Dedicated Full Pages for Left Menu */}
          {currentView === 'about_us' && (
            <AboutUsView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'privacy_policy' && (
            <PrivacyPolicyView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'terms_conditions' && (
            <TermsConditionsView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'settings' && (
            <SettingsPreferencesView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'careers' && (
            <CareersView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'feedback' && (
            <FeedbackView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'request_ads' && (
            <RequestAdsView onBackToHome={() => setCurrentView('home')} />
          )}

          {currentView === 'contact_us' && (
            <ContactUsView onBackToHome={() => setCurrentView('home')} />
          )}
        </main>

        {/* Global Bottom Navigation (Mobile Only) */}
        <div className="md:hidden">
          <BottomNav
            activeTab={activeTab}
            onChangeTab={handleTabChange}
          />
        </div>
      </div>
      {/* Global Modals & Overlays */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={handleNavigatePage}
      />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <AllEnterprisesModal
        isOpen={isAllEnterprisesOpen}
        onClose={() => setIsAllEnterprisesOpen(false)}
        onSelectEnterprise={handleSelectEnterprise}
      />
      <ShortViewReceiptModal
        order={shortReceiptOrder}
        isOpen={!!shortReceiptOrder}
        onClose={() => setShortReceiptOrder(null)}
        onOpenFullThermalReceipt={(order: PrintOrder) => {
          setShortReceiptOrder(null);
          handleOpenFullThermalReceipt(order);
        }}
      />
      {/* Cookie Consent Banner placed right above the bottom navigation bar */}
      <CookieConsentBanner />
      {/* Global Authentication Modal for Protected Actions */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        title={authModalTitle}
        subtitle={authModalSubtitle}
      />
    </div>
  );
};

export const PrintPerfectApp: React.FC = () => {
  const context = useContext(PrintPerfectContext);
  if (!context) {
    return (
      <PrintPerfectProvider>
        <PrintPerfectAppContent />
      </PrintPerfectProvider>
    );
  }
  return <PrintPerfectAppContent />;
};
