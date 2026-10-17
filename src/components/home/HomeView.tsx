import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronRight,
  FileText,
  Sparkles,
  ArrowRight,
  Mic,
  MicOff,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { getShopInitials } from '../../utils/shopInitials';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';
import type { PrintOrder } from '../../types/printperfect';
import { toast } from 'sonner';
import { fetchHomeBanners, fetchApprovedAppFeedbacks, type HomeBannerItem } from '../../services/api';
import { supabase } from '../../db/supabase';

interface HomeViewProps {
  onSelectEnterprise: (enterpriseId: string) => void;
  onOpenUpload: () => void;
  onViewReceipt: (order: PrintOrder) => void;
  onOpenSeeAllEnterprises: () => void;
  onOpenOffers: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectEnterprise,
  onOpenUpload,
  onViewReceipt,
  onOpenSeeAllEnterprises,
  onOpenOffers
}) => {
  const { user, enterprises, orders, selectEnterprise, selectedEnterprise, t } = usePrintPerfect();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 1. Dynamic Home Banners fetched from database (home_banners table)
  const [homeBanners, setHomeBanners] = useState<HomeBannerItem[]>([]);

  // Desktop Application Feedback 3-Card Carousel state
  const [appFeedbacks, setAppFeedbacks] = useState<any[]>([]);
  const [feedbackScrollIdx, setFeedbackScrollIdx] = useState(0);
  const [isFeedbackHovered, setIsFeedbackHovered] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchApprovedAppFeedbacks().then(data => {
      if (isMounted && data && data.length > 0) {
        setAppFeedbacks(data);
      }
    });
  }, []);

  // 2-3s auto-scroll for desktop feedback carousel with hover pause
  useEffect(() => {
    if (isFeedbackHovered || appFeedbacks.length <= 3) return;
    const interval = setInterval(() => {
      setFeedbackScrollIdx(prev => (prev + 1) % appFeedbacks.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isFeedbackHovered, appFeedbacks.length]);

  useEffect(() => {
    let isMounted = true;
    fetchHomeBanners().then(banners => {
      if (isMounted) {
        setHomeBanners(banners);
      }
    });

    // Realtime subscription for home_banners table changes
    const channel = supabase
      .channel('public:home_banners_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_banners' }, () => {
        fetchHomeBanners().then(banners => {
          if (isMounted) {
            setHomeBanners(banners);
          }
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fallback banner when no banners are loaded/configured in DB
  const defaultFallbackBanner: HomeBannerItem = {
    id: 'default-fallback-banner',
    title: 'High Speed Campus Printing Hubs',
    subtitle: 'printOn24 Network',
    description: 'Instant document upload, secure printing, and swift counter pickup across all verified campus stores.',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    button_text: 'Upload Documents →',
    destination_url: 'upload',
    display_order: 1,
    is_active: true
  };

  const displayBanners = homeBanners.length > 0 ? homeBanners : [defaultFallbackBanner];

  // Auto-scroll Carousel every 3.5 seconds
  useEffect(() => {
    const total = displayBanners.length;
    if (total <= 1) return;
    const timer = setInterval(() => {
      setActiveCarouselIndex(prev => (prev + 1) % total);
    }, 3500);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  const handleBannerCtaClick = (destinationUrl?: string) => {
    if (!destinationUrl) {
      onOpenOffers();
      return;
    }
    const url = destinationUrl.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (url === 'upload' || url === '/upload') {
      onOpenUpload();
    } else if (url === 'offers' || url === '/offers') {
      onOpenOffers();
    } else if (url === 'profile' || url === '/profile' || url === 'shops') {
      onOpenSeeAllEnterprises();
    } else {
      onOpenOffers();
    }
  };

  // 2. Dynamic looping shop suggestions for search placeholder
  const [suggestIndex, setSuggestIndex] = useState(0);
  const suggestedShopNames = enterprises.map(e => e.name);

  useEffect(() => {
    const loopTimer = setInterval(() => {
      setSuggestIndex(prev => (prev + 1) % suggestedShopNames.length);
    }, 2500);
    return () => clearInterval(loopTimer);
  }, [suggestedShopNames.length]);

  // 3. Web Speech Recognition for Voice / Mic Search
  const toggleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('Voice input simulation: SpeechRecognition API not supported on this browser. Try Chrome/Edge or type query.');
      setSearchQuery('Xerox');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = user.selectedLanguage === 'MR' ? 'mr-IN' : user.selectedLanguage === 'HI' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening... Speak print shop name now');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        toast.success(`Heard: "${transcript}"`);
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Voice search error:', err);
        setIsListening(false);
        toast.error('Could not capture voice. Please type or grant mic access.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      toast.error('Voice search failed to initialize');
    }
  };

  // Filtered recent enterprises: ONLY shops where user has completed/sent print orders
  // Prioritizes scanned / currently selected shop if connected
  const orderedShopIds = Array.from(new Set(orders.map(o => o.enterpriseId)));
  const orderedEnterprises = enterprises.filter(e => orderedShopIds.includes(e.id));
  const sortedRecent = [...orderedEnterprises].sort((a, b) => {
    if (selectedEnterprise?.id === a.id) return -1;
    if (selectedEnterprise?.id === b.id) return 1;
    return 0;
  });

  const recentEnterprises = sortedRecent.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-24 px-4 max-w-lg mx-auto">
      {/* 1. Greeting Banner */}
      <div className="flex items-center gap-3 pt-1">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[#FF1300]/30 shadow-sm bg-red-100 flex items-center justify-center">
            <img
              src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
              alt={user.name || 'User'}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5 leading-tight font-heading">
            <span>Hello, {user.name ? user.name : 'Guest'}</span>
            <span className="text-lg">👋</span>
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Find xerox & laser printing hubs around you.
          </p>
        </div>
      </div>
      {/* 2. Search Bar with looping shop name suggestion & working Mic */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#FF1300] absolute left-3.5 pointer-events-none stroke-[2.2]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search "${suggestedShopNames[suggestIndex] || 'Print Shop'}"...`}
            className="w-full bg-white border border-red-200/80 rounded-2xl pl-10 pr-11 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/30 focus:border-[#FF1300] shadow-sm transition-all"
          />
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleVoiceSearch}
            className={`absolute right-2.5 p-1.5 rounded-full transition-all ${
              isListening
                ? 'bg-[#FF1300] text-white animate-pulse shadow-md'
                : 'text-slate-400 hover:text-[#FF1300] hover:bg-red-50'
            }`}
            title="Voice Search"
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Clickable Quick Suggestion Chips - scrollbar hidden via CSS while keeping smooth scrolling */}
        {searchQuery === '' && (
          <div
            className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5 text-[11px] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <span className="text-slate-400 shrink-0 font-medium">Quick:</span>
            {enterprises.slice(0, 4).map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSearchQuery(e.name)}
                className="px-2.5 py-0.5 rounded-full bg-white border border-red-200/60 text-slate-700 hover:text-[#FF1300] hover:border-[#FF1300] shrink-0 transition-colors shadow-2xs font-medium"
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 3. Special Offer Carousel: Full covering website print service background image with overlaid text content */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg border border-slate-200 bg-slate-900 text-white">
        {/* Horizontal Sliding Wrapper */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activeCarouselIndex * 100}%)` }}
        >
          {displayBanners.map((item, idx) => (
            <div
              key={item.id || idx}
              className="w-full shrink-0 relative min-h-[190px] p-5 flex flex-col justify-end overflow-hidden"
            >
              {/* Full Covering Print Service Background Image - NOT clickable */}
              <img
                src={item.image_url}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              />
              {/* Dark Gradient Overlay for Maximum Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 z-10 pointer-events-none" />

              {/* Overlaid Text Content directly on top of image */}
              <div className="relative z-20 space-y-1.5 max-w-[85%]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF1300] text-[10px] font-bold tracking-wide uppercase text-white shadow-sm font-heading">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  Special Offer
                </span>

                <h3 className="text-xl font-black tracking-tight text-white leading-tight font-heading drop-shadow-sm">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-xs font-semibold text-red-200 leading-none drop-shadow-xs">
                    {item.subtitle}
                  </p>
                )}
                {item.description && (
                  <p className="text-[11px] text-slate-200 leading-tight pt-0.5 line-clamp-1 drop-shadow-xs">
                    {item.description}
                  </p>
                )}

                {/* ONLY CTA button is clickable */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleBannerCtaClick(item.destination_url)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/30 transition-all font-heading cursor-pointer"
                  >
                    <span>{item.button_text || 'View Offers →'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Pagination Dots */}
        {displayBanners.length > 1 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCarouselIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeCarouselIndex === idx
                    ? 'w-5 bg-[#FF1300]'
                    : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      {/* 4. Recent Enterprises (ONLY shops where user has completed/placed an order - hidden for brand new users) */}
      {recentEnterprises.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              {t('recentEnterprises')}
            </h3>
            <button
              type="button"
              onClick={onOpenSeeAllEnterprises}
              className="text-xs font-bold text-[#FF1300] hover:underline flex items-center gap-0.5 font-heading"
            >
              <span>{t('seeAll')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recentEnterprises.map(enterprise => {
              const avatar = enterprise.logoUrl || '';
              return (
                <button
                  key={enterprise.id}
                  type="button"
                  onClick={() => {
                    selectEnterprise(enterprise.id);
                    onSelectEnterprise(enterprise.id);
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 group active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-2 ring-slate-200 group-hover:ring-[#FF1300] shadow-sm transition-all bg-white flex items-center justify-center">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={enterprise.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.dynamic-initials-fallback')) {
                            const div = document.createElement('div');
                            div.className = 'dynamic-initials-fallback w-full h-full flex items-center justify-center font-bold text-xs';
                            div.style.backgroundColor = enterprise.badgeColor || '#FF1300';
                            div.style.color = enterprise.badgeTextColor || '#ffffff';
                            div.innerText = getShopInitials(enterprise.name);
                            parent.appendChild(div);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: enterprise.badgeColor || '#FF1300', color: enterprise.badgeTextColor || '#ffffff' }}
                      >
                        {getShopInitials(enterprise.name)}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight truncate w-full group-hover:text-[#FF1300]">
                    {enterprise.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* 5. Recent Print History (Dynamic from orders) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            {t('recentPrintHistory')}
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-white border border-dashed border-red-200">
            <FileText className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">{t('noOrdersYet')}</p>
            <button
              type="button"
              onClick={onOpenUpload}
              className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] text-white text-xs font-bold shadow-sm transition-all font-heading active:scale-95"
            >
              <span>{t('uploadDocument')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {(showAllOrders ? orders : orders.slice(0, 4)).map(order => {
              const ent = enterprises.find(e => e.id === order.enterpriseId);
              const shopName = ent?.name || order.enterpriseName || 'Print Shop';
              const isColour = order.config.printType === 'Colour' || order.config.printType === 'Color';
              const badgeBg = isColour ? 'bg-orange-50 text-orange-700 border-orange-200/60' : 'bg-slate-100 text-slate-700 border-slate-200';
              const totalAmount = order.grandTotal || 0;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl py-2.5 px-3 border border-red-100/70 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-red-200 shrink-0 bg-red-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#FF1300]" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-snug font-heading">
                        {shopName}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                        {order.document?.fileName || 'Document'} • {order.calculatedPages || 1} pages • {order.config.copies} {t('copies')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${badgeBg}`}>
                          {order.config.printType}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })
                            : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-xs font-black text-slate-900 font-heading">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(order)}
                      className="px-2.5 py-1 rounded-full bg-[#FF1300] hover:bg-[#E01100] text-white text-[10px] font-bold active:scale-95 transition-all shadow-xs"
                    >
                      {t('viewReceipt')}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* View More / View Less Toggle when more than 4 orders */}
            {orders.length > 4 && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllOrders(prev => !prev)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs font-heading"
                >
                  <span>{showAllOrders ? 'Show Less (Top 4)' : `View More (${orders.length - 4} More)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* 6. Desktop-Only 3-Card Auto-Scrolling Application Feedback Carousel */}
      {appFeedbacks.length > 0 && (
        <div className="hidden md:block space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF1300]" />
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Campus Community Feedback
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Verified Student Reviews • Auto-updating
            </span>
          </div>

          <div
            onMouseEnter={() => setIsFeedbackHovered(true)}
            onMouseLeave={() => setIsFeedbackHovered(false)}
            className="grid grid-cols-3 gap-3.5 transition-all duration-500"
          >
            {[0, 1, 2].map(offset => {
              const itemIdx = (feedbackScrollIdx + offset) % appFeedbacks.length;
              const fb = appFeedbacks[itemIdx];
              if (!fb) return null;
              return (
                <div
                  key={`${fb.id}-${offset}`}
                  className="bg-white rounded-2xl p-4 border border-red-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-red-300 min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-xs ${
                              i < (fb.rating || 5) ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        Verified
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic line-clamp-3">
                      "{fb.feedback_text}"
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate font-heading">
                        {fb.user_name || 'Campus Student'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {fb.college || 'College Campus'}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-red-50 text-[#FF1300] font-bold text-xs flex items-center justify-center font-heading shrink-0 border border-red-200">
                      {(fb.user_name || 'S').charAt(0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
