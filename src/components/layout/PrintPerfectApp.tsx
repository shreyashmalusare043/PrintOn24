import { Capacitor } from '@capacitor/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PrintPerfectContext, PrintPerfectProvider, usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { APP_DOWNLOAD_SUGGESTION_KEY } from '../../lib/appLinks';
import { type AndroidPermissionName, AppPermissions } from '../../native/appPermissions';
import { type SharedFile, SharedFiles, type SharedFilesResult } from '../../native/sharedFiles';
import type { PrintOrder } from '../../types/printperfect';
import { AuthModal } from '../auth/AuthModal';
import { CheckoutView } from '../checkout/CheckoutView';
import { AppDownloadSuggestionModal } from '../common/AppDownloadSuggestionModal';
import { BottomNav, type TabType } from '../common/BottomNav';
import { CookieConsentBanner } from '../common/CookieConsentBanner';
import { NavigationDrawer } from '../common/NavigationDrawer';
import { NotificationsModal } from '../common/NotificationsModal';
import { StartBusinessModal } from '../common/StartBusinessModal';
import { TopHeader } from '../common/TopHeader';
import { DrawerContentModal } from '../drawer/DrawerContentModal';
import { AllEnterprisesModal } from '../enterprise/AllEnterprisesModal';
import { AndroidShareShopDialog } from '../enterprise/AndroidShareShopDialog';
import { SpecificEnterpriseView } from '../enterprise/SpecificEnterpriseView';
import { DesktopHomeView } from '../home/DesktopHomeView';
// Core Application Views
import { HomeView } from '../home/HomeView';
import { ShortViewReceiptModal } from '../home/ShortViewReceiptModal';
import { AboutUsView } from '../pages/AboutUsView';
import { CareersView } from '../pages/CareersView';
import { ContactUsView } from '../pages/ContactUsView';
import { FeedbackView } from '../pages/FeedbackView';
import { HowToUseView } from '../pages/HowToUseView';
import { PrivacyPolicyView } from '../pages/PrivacyPolicyView';
import { RequestAdsView } from '../pages/RequestAdsView';
import { SettingsPreferencesView } from '../pages/SettingsPreferencesView';
// Dedicated Left Menu Full Page Views
import { StartBusinessView } from '../pages/StartBusinessView';
import { TermsConditionsView } from '../pages/TermsConditionsView';
import { ProfileView } from '../profile/ProfileView';
import { MyReceiptsView } from '../receipt/MyReceiptsView';
import { ThermalReceiptView } from '../receipt/ThermalReceiptView';
import { ReportAnalyticsView } from '../report/ReportAnalyticsView';
import { ScanView } from '../scan/ScanView';
import { UploadConfigurationView } from '../upload/UploadConfigurationView';
import { DesktopHeader } from './DesktopHeader';
// Desktop Shell Components
import { DesktopSidebar } from './DesktopSidebar';

const handledShopUrls = new Set<string>();

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
  | 'contact_us'
  | 'how_to_use';

const PrintPerfectAppContent: React.FC = () => {
  const {
    activeReceiptOrder,
    setActiveReceiptOrder,
    selectEnterprise,
    selectedEnterprise,
    verifyAndSelectShopByCode,
    unreadNotifCount,
    orders,
    isAuthModalOpen,
    closeAuthModal,
    authModalTitle,
    authModalSubtitle
  } = usePrintPerfect();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentView, setCurrentView] = useState<ActiveView>('home');
  const [isAppDownloadSuggestionOpen, setIsAppDownloadSuggestionOpen] = useState(false);
  const isWeb = !Capacitor.isNativePlatform();

  // Modals state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStartBusinessOpen, setIsStartBusinessOpen] = useState(false);
  const [isAllEnterprisesOpen, setIsAllEnterprisesOpen] = useState(false);
  const [isAndroidShareShopOpen, setIsAndroidShareShopOpen] = useState(false);
  const [androidSharedFiles, setAndroidSharedFiles] = useState<File[] | null>(null);
  const [selectedDrawerSection, setSelectedDrawerSection] = useState<string | null>(null);
  const [shortReceiptOrder, setShortReceiptOrder] = useState<PrintOrder | null>(null);
  const handledSharePayloads = React.useRef(new Set<string>());

  const openAppDownloadSuggestion = useCallback(() => {
    if (isWeb && localStorage.getItem(APP_DOWNLOAD_SUGGESTION_KEY) !== 'true') {
      setIsAppDownloadSuggestionOpen(true);
    }
  }, [isWeb]);

  const scheduleAppDownloadSuggestion = useCallback(() => {
    window.setTimeout(openAppDownloadSuggestion, 6000);
  }, [openAppDownloadSuggestion]);

  useEffect(() => {
    if (!isWeb || localStorage.getItem(APP_DOWNLOAD_SUGGESTION_KEY) === 'true') return;

    const params = new URLSearchParams(window.location.search);
    const isShopLanding =
      /^\/(?:shopkeeper|shop|terminal|counter)\/[^/]+\/?$/i.test(window.location.pathname) ||
      ['shop', 'shopId', 'terminal', 'qr'].some(param => params.has(param)) ||
      params.get('payment_status') === 'success';
    if (isShopLanding) return;

    const timeout = window.setTimeout(openAppDownloadSuggestion, 800);
    return () => window.clearTimeout(timeout);
  }, [isWeb, openAppDownloadSuggestion]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    const requestFreshInstallPermissions = async () => {
      try {
        const statuses = await AppPermissions.getPermissionStatuses();
        const permissions: AndroidPermissionName[] = ['camera', 'location', 'notifications'];
        for (const permission of permissions) {
          if (statuses[permission] === 'prompt') {
            await AppPermissions.requestPermission({ permission });
          }
        }
      } catch (error) {
        console.error('Could not request Android app permissions:', error);
        toast.error('Could not request app permissions. You can manage them in Android Settings.');
      }
    };

    void requestFreshInstallPermissions();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let isMounted = true;
    let listener: { remove: () => Promise<void> } | undefined;

    const receiveSharedFiles = async (payload: SharedFilesResult) => {
      const payloadKey = payload.files.map(file => file.uri).join('|');
      if (payloadKey && handledSharePayloads.current.has(payloadKey)) return;
      if (payloadKey) handledSharePayloads.current.add(payloadKey);

      const cachedUris = payload.files.map(file => file.uri);
      try {
        const files = await Promise.all(payload.files.map(async (sharedFile: SharedFile) => {
          const extension = sharedFile.name.split('.').pop()?.toLowerCase();
          if (!extension || !['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
            throw new Error(`"${sharedFile.name}" is not a supported file. Share a PDF, DOC, DOCX, JPG, PNG, or WEBP.`);
          }
          if (sharedFile.size > 50 * 1024 * 1024) {
            throw new Error(`"${sharedFile.name}" is larger than the 50 MB upload limit.`);
          }

          const response = await fetch(Capacitor.convertFileSrc(sharedFile.uri));
          if (!response.ok) {
            throw new Error(`Could not open the shared file "${sharedFile.name}".`);
          }
          const blob = await response.blob();
          if (blob.size > 50 * 1024 * 1024) {
            throw new Error(`"${sharedFile.name}" is larger than the 50 MB upload limit.`);
          }
          return new File([blob], sharedFile.name, {
            type: sharedFile.mimeType || blob.type || 'application/octet-stream'
          });
        }));

        if (!isMounted) return;
        if (payload.errors.length > 0) {
          toast.error(payload.errors.join(' '));
        }
        if (files.length > 0) {
          setAndroidSharedFiles(files);
          setIsAndroidShareShopOpen(true);
        } else if (payload.errors.length === 0) {
          toast.error('No supported PDF, DOC, DOCX, JPG, PNG, or WEBP files were shared.');
        }
      } catch (error) {
        console.error('Could not read Android shared files:', error);
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'Could not read the shared file.');
        }
      } finally {
        try {
          await SharedFiles.clearPendingShare();
          if (cachedUris.length > 0) {
            await SharedFiles.releaseFiles({ uris: cachedUris });
          }
        } catch (error) {
          console.warn('Could not clean up Android shared-file cache:', error);
        }
      }
    };

    const initializeShareListener = async () => {
      try {
        listener = await SharedFiles.addListener('sharedFiles', payload => {
          void receiveSharedFiles(payload);
        });
        const pendingShare = await SharedFiles.getPendingFiles();
        if (isMounted && (pendingShare.files.length > 0 || pendingShare.errors.length > 0)) {
          await receiveSharedFiles(pendingShare);
        }
      } catch (error) {
        console.error('Could not initialize Android share handling:', error);
        if (isMounted) {
          toast.error('Could not open the shared file. Please try sharing it again.');
        }
      }
    };

    void initializeShareListener();
    return () => {
      isMounted = false;
      if (listener) void listener.remove();
    };
  }, []);

  const handleAndroidShareShopSelect = (shopId: string) => {
    selectEnterprise(shopId);
    setActiveTab('upload');
    setCurrentView('upload');
    setIsAndroidShareShopOpen(false);
  };

  const cancelAndroidShare = () => {
    setIsAndroidShareShopOpen(false);
    setAndroidSharedFiles(null);
  };

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
      scheduleAppDownloadSuggestion();
    } else if (payStatus === 'failed') {
      toast.error(`PayU Payment Failed or Cancelled: ${errorMsg ? decodeURIComponent(errorMsg) : 'Transaction declined'}`);
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentView('checkout');
    }

    const shopLinkMatch = window.location.pathname.match(/^\/(?:shopkeeper|shop|terminal|counter)\/([^/]+)\/?$/i);
    const shopParam = params.get('shop') || params.get('shopId') || params.get('terminal') || params.get('qr');
    const shopCodeFromPath = shopLinkMatch?.[1];
    const shopCode = shopCodeFromPath || shopParam;
    if (!shopCode) return;

    const shopUrl = `${window.location.pathname}${window.location.search}`;
    if (handledShopUrls.has(shopUrl)) return;
    handledShopUrls.add(shopUrl);

    let decodedShopCode: string;
    try {
      decodedShopCode = decodeURIComponent(shopCode);
    } catch {
      toast.error('This shop link contains an invalid code.');
      return;
    }

    void verifyAndSelectShopByCode(decodedShopCode).then(result => {
      if (!result.success || !result.shop) {
        toast.error(result.message || 'This shop code was not found.');
        return;
      }

      setActiveTab('upload');
      setCurrentView('upload');
      toast.dismiss();
      toast.success(`Connected to ${result.shop.name} via ${shopCodeFromPath ? 'shop link' : 'QR scan'}!`);
      window.history.replaceState({}, '', '/');
    }).catch(error => {
      console.error('Unable to connect shop from URL:', error);
      toast.error('Unable to verify this shop right now. Please try again.');
    });
  }, [orders, verifyAndSelectShopByCode, scheduleAppDownloadSuggestion]);


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
      case 'how_to_use':
        setCurrentView('how_to_use');
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
    <div className={`min-h-screen bg-white text-slate-900 flex font-sans select-none antialiased ${Capacitor.isNativePlatform() ? 'native-app-shell' : ''}`}>
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
              sharedFiles={androidSharedFiles}
              onSharedFilesHandled={() => setAndroidSharedFiles(null)}
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
                scheduleAppDownloadSuggestion();
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

          {currentView === 'how_to_use' && (
            <HowToUseView onBackToHome={() => setCurrentView('home')} />
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
      <AppDownloadSuggestionModal
        isOpen={isAppDownloadSuggestionOpen}
        onClose={() => setIsAppDownloadSuggestionOpen(false)}
      />
      <AllEnterprisesModal
        isOpen={isAllEnterprisesOpen}
        onClose={() => setIsAllEnterprisesOpen(false)}
        onSelectEnterprise={handleSelectEnterprise}
      />
      <AndroidShareShopDialog
        open={isAndroidShareShopOpen}
        onOpenChange={open => {
          if (!open) cancelAndroidShare();
          else setIsAndroidShareShopOpen(true);
        }}
        onSelectShop={handleAndroidShareShopSelect}
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
