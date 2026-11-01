import React, { useState, useEffect } from 'react';
import {
  Search,
  Crown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  BookOpen,
  MoreHorizontal,
  Sparkles,
  Megaphone,
  Printer,
  CheckCircle2,
  Clock,
  MoreVertical,
  Building2
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import type { PrintOrder } from '../../types/printperfect';
import { DEFAULT_GUEST_PROFILE_PHOTO } from '../../types/printperfect';
import { fetchHomeBanners, fetchPublicPrintShops, shopSlug, type HomeBannerItem, type PublicPrintShop } from '../../services/api';
import { supabase } from '../../db/supabase';
import PageMeta from '../common/PageMeta';

interface DesktopHomeViewProps {
  onSelectEnterprise: (enterpriseId: string) => void;
  onOpenUpload: () => void;
  onViewReceipt: (order: PrintOrder) => void;
  onOpenSeeAllEnterprises: () => void;
  onOpenMemberships?: () => void;
}

export const DesktopHomeView: React.FC<DesktopHomeViewProps> = ({
  onSelectEnterprise,
  onOpenUpload,
  onViewReceipt,
  onOpenSeeAllEnterprises,
  onOpenMemberships
}) => {
  const {
    user,
    enterprises,
    selectedEnterprise,
    activeMembership,
    orders,
    isMembershipActive,
    t
  } = usePrintPerfect();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [homeBanners, setHomeBanners] = useState<HomeBannerItem[]>([]);
  const [publicVendors, setPublicVendors] = useState<PublicPrintShop[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchHomeBanners().then(banners => {
      if (isMounted && banners.length > 0) setHomeBanners(banners);
    });

    const channel = supabase
      .channel('public:desktop_home_banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'home_banners' }, () => {
        fetchHomeBanners().then(banners => {
          if (isMounted && banners.length > 0) setHomeBanners(banners);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchPublicPrintShops()
      .then(shops => mounted && setPublicVendors(shops))
      .catch(error => console.error('Unable to load public print shops:', error));
    return () => { mounted = false; };
  }, []);

  // 1. Dynamic Carousel Slides from database
  const fallbackSlides = [
    {
      title: 'Flat 50% OFF',
      subtitle: 'on All Printing Services',
      desc: 'Quality Prints | Fast Service | Best Prices',
      tag: 'Special Offer',
      image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=500&q=80',
      destination_url: 'offers',
      button_text: 'View Offers'
    },
    {
      title: 'Free Spiral Binding',
      subtitle: 'on Reports above 50 Pages',
      desc: 'Valid at registered printOn24 partner shops',
      tag: 'Campus Deal',
      image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=500&q=80',
      destination_url: 'upload',
      button_text: 'Order Now'
    },
    {
      title: 'Color Laser Prints',
      subtitle: 'Starting at ₹3.50 per side',
      desc: 'Smudge-proof crisp laser toner prints',
      tag: 'High Quality',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=500&q=80',
      destination_url: 'upload',
      button_text: 'Print Now'
    }
  ];

  const slides = homeBanners.length > 0
    ? homeBanners.map(b => ({
        title: b.title,
        subtitle: b.subtitle || b.description || 'Exclusive Campus Offer',
        desc: b.description || 'Fast, reliable laser & xerox printing',
        tag: 'Special Offer',
        image: b.image_url,
        destination_url: b.destination_url || 'offers',
        button_text: b.button_text || 'View Offers'
      }))
    : fallbackSlides;

  // 2. Recent Enterprises: ONLY shops where user has completed/placed an order
  // Prioritizes scanned / currently selected shop if connected
  const orderedShopIds = Array.from(new Set(orders.map(o => o.enterpriseId)));
  const orderedEnterprises = enterprises.filter(e => orderedShopIds.includes(e.id));
  const recentEnterprises = [...orderedEnterprises].sort((a, b) => {
    if (selectedEnterprise?.id === a.id) return -1;
    if (selectedEnterprise?.id === b.id) return 1;
    return 0;
  });

  const handlePrevSlide = () => {
    setActiveSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handleCtaClick = (destinationUrl?: string) => {
    if (!destinationUrl) {
      onOpenUpload();
      return;
    }
    const url = destinationUrl.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (url === 'upload' || url === '/upload') {
      onOpenUpload();
    } else if (url === 'profile' || url === '/profile' || url === 'shops') {
      onOpenSeeAllEnterprises();
    } else {
      onOpenUpload();
    }
  };

  const currentSlide = slides[activeSlide] || slides[0];
  const eligibleVendorList = publicVendors.slice(0, 6);

  const homeFaqs = [
    ['What is printOn24?', 'printOn24 is an online printing platform. You upload a document, choose a nearby partner print shop, set your print options and collect the printout using a pickup token.'],
    ['How do I print a document online with printOn24?', 'Find your print shop, upload your file, choose paper size, colour, sides, copies and page range, place the order, then show your token at the shop to collect the printout.'],
    ['Do I need to scan a QR code?', 'No. You can open a shop link or search the shop by name. Scanning the shop QR code or entering the shop code also works and selects the same shop.'],
    ['Which file types can I print?', 'PDF, Word, Excel, PowerPoint and image files. You can add more than one file to an order.'],
    ['How do I pay?', 'You pay using the methods enabled by the print shop you choose, for example Pay on Counter when you collect your prints. Available methods are shown at checkout.'],
    ['How much does printing cost?', 'The price depends on the shop rates, paper size, colour or black and white, and the number of pages and copies. A live estimated total is shown before you send the order.'],
    ['Can I print only some pages?', 'Yes. Choose All Pages, Selected Pages or a Custom Range. You can also fit 1, 2 or 4 pages on one sheet.'],
    ['Can I print on both sides of the paper?', 'Yes. Choose Single Side or Back to Back in the print settings.'],
    ['Is my document safe on printOn24?', 'Uploaded documents are kept in encrypted cloud storage and are automatically deleted within 12 hours, as described in the Privacy Policy.'],
    ['How do I know when my print is ready?', 'You get a notification when the shop completes the print and the order status changes from Queued to Completed. Show your token at the counter to collect.'],
    ['Can I get a receipt for my order?', 'Yes. Each order has a digital receipt with a barcode and token. You can download, copy, share or re-print it.'],
    ['Can I find print shops near me?', 'Yes. printOn24 shows active partner shops near you with address, timings, services and rates, and you can connect to a shop with one tap.'],
    ['Can my print shop join printOn24?', 'Yes. Print and xerox shops can register as partners to receive online orders and get a shop code, QR code and shop page.'],
    ['How can I contact printOn24 support?', 'Call +91 9284289782 or email info@hrsactech.in. Support is available 7 days a week.']
  ];

  const homeSeoSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://printon24.in/#org',
        name: 'printOn24',
        legalName: 'printOn24 Technology Pvt. Ltd.',
        url: 'https://printon24.in/',
        logo: 'https://printon24.in/icons/printon24-512.png',
        email: 'info@hrsactech.in',
        telephone: '+91-9284289782',
        description: 'printOn24 is an Indian online printing platform that connects customers with partner print and xerox shops. Users upload documents, choose print settings and collect printouts with a pickup token.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Pune',
          addressRegion: 'Maharashtra',
          addressCountry: 'IN'
        },
        areaServed: {
          '@type': 'City',
          name: 'Pune'
        },
        knowsAbout: ['online printing', 'document printing', 'student printing', 'colour printing', 'black and white printing', 'nearby print shops']
      },
      {
        '@type': 'WebSite',
        '@id': 'https://printon24.in/#website',
        url: 'https://printon24.in/',
        name: 'printOn24',
        inLanguage: 'en-IN',
        publisher: { '@id': 'https://printon24.in/#org' }
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://printon24.in/#application',
        name: 'printOn24',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        publisher: { '@id': 'https://printon24.in/#org' }
      },
      {
        '@type': 'HowTo',
        name: 'How to print a document online with printOn24',
        step: ['Find or scan your print shop', 'Upload your documents', 'Choose print settings', 'Check the price and place the order', 'Collect your printout with a token'].map(name => ({ '@type': 'HowToStep', name }))
      },
      {
        '@type': 'FAQPage',
        mainEntity: homeFaqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }))
      }
    ]
  };

  return (
    <>
      <PageMeta
        title="printOn24 - Online Printing at Nearby Print Shops in Pune"
        description="Upload your document, choose a nearby partner print shop, set colour, copies and page range, and collect your printout with a token. No queues."
        robots="index, follow, max-image-preview:large, max-snippet:-1"
        canonical="https://printon24.in/"
        ogTitle="printOn24 - Print Online. Collect at a Nearby Print Shop."
        ogDescription="Upload, configure and send your print order to a verified print shop near you. Collect with a token."
        ogUrl="https://printon24.in/"
        ogImage="https://printon24.in/icons/printon24-512.png"
        ogImageAlt="printOn24 online printing at nearby print shops"
        ogType="website"
        ogSiteName="printOn24"
        twitterTitle="printOn24 - Print Online. Collect at a Nearby Print Shop."
        twitterDescription="Upload, configure and send your print order to a verified print shop near you."
        twitterImage="https://printon24.in/icons/printon24-512.png"
        twitterCard="summary_large_image"
        jsonLd={homeSeoSchema}
      />
      <div className="space-y-6 pb-16 px-4 md:px-8 w-full select-none font-sans">
      {/* ======================================================== */}
      {/* 1. Top Row: Greeting Banner + Premium Member Card (Image 1) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Left: Hello Shreyash Banner with Printer & Slogan */}
        <div className="col-span-12 lg:col-span-8 from-[#FFF1F1] via-[#FFF6F6] to-[#FFEFEF] rounded-3xl border border-red-100 p-6 flex flex-col justify-between relative overflow-hidden shadow-xs min-h-[175px] bg-inherit bg-cover bg-center bg-no-repeat bg-[url(https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-esi8spkb74zk.png)]">
          {/* Subtle curved background blur accents */}
          <div className="absolute right-36 -bottom-10 w-64 h-64 bg-red-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 z-10">
            {/* Avatar + Greeting */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 ring-4 ring-red-100/70 bg-white">
                <img
                  src={user.avatarUrl || DEFAULT_GUEST_PROFILE_PHOTO}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 font-heading flex items-center gap-2 leading-tight">
                  <span>Hello, {user.name ? user.name : 'Guest'}</span>
                </h2>
                <p className="text-xs mt-0.5 font-medium text-[#002d5c]">
                  What would you like to print today?
                </p>
              </div>
            </div>

            {/* Right Side Printer & Calligraphy Slogan matching Image 1 */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2">

              </div>
              <div className="text-right">

              </div>
            </div>
          </div>

          {/* Banner Search Input Bar matching Image 1 */}
          <div className="mt-4 relative z-10 w-full max-w-xl">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for a print shop, document or service..."
                className="w-full pl-11 pr-4 py-2.5 text-xs rounded-full border border-slate-200 bg-white shadow-xs focus:outline-none focus:border-[#FF1300] focus:ring-2 focus:ring-red-100 font-medium text-slate-800 placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right: Premium Member Card matching Image 1 */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full ${isMembershipActive ? 'bg-[#FF1300]' : 'bg-slate-200'} text-white flex items-center justify-center shadow-md shrink-0`}>
                <Crown className={`w-5 h-5 stroke-[2.2] ${isMembershipActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                  {isMembershipActive ? 'VIP Pass Active' : 'Store Membership'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isMembershipActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full font-heading ${
                    isMembershipActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                  }`}>
                    {isMembershipActive ? 'Active' : 'Not Enrolled'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
              {isMembershipActive ? (
                <>Valid till <strong className="text-slate-700 font-semibold">{activeMembership?.validUntil || 'Active'}</strong></>
              ) : selectedEnterprise?.membershipEnabled ? (
                <>Starts at <strong className="text-[#FF1300] font-semibold">₹{selectedEnterprise?.membershipPrice ?? 99}/mo</strong> at {selectedEnterprise?.name}</>
              ) : (
                <span className="text-slate-400">Membership currently inactive for this store</span>
              )}
            </p>
          </div>

          {selectedEnterprise?.membershipEnabled || isMembershipActive ? (
            <button
              type="button"
              onClick={onOpenMemberships}
              className="mt-3 w-full py-2 px-3 rounded-full border border-red-200 hover:border-[#FF1300] bg-white hover:bg-red-50 text-[#FF1300] text-xs font-bold flex items-center justify-center gap-1.5 transition-all font-heading shadow-2xs active:scale-95"
            >
              <span>{isMembershipActive ? 'View My Membership' : `Get Membership • ₹${selectedEnterprise?.membershipPrice ?? 99}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="mt-3 py-2 px-3 text-center text-[11px] text-slate-400 font-medium">
              Standard rates apply
            </div>
          )}
        </div>
      </div>
      {/* ======================================================== */}
      {/* 2. Second Row: Flat 50% OFF Banner + Exclusive Member Benefits */}
      {/* ======================================================== */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Left: Flat 50% OFF Promo Card */}
        <div className="col-span-12 lg:col-span-8 from-[#D90429] via-[#EF233C] to-[#E63946] rounded-3xl p-6 text-white relative overflow-hidden shadow-md shadow-red-500/15 flex flex-col justify-between min-h-[220px] bg-inherit bg-cover bg-center bg-no-repeat bg-[url(https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-esi8kdnm2sqo.png)]">
          {/* Carousel Arrows */}
          <button
            type="button"
            onClick={handlePrevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-95 z-20 hover:bg-slate-50"
            aria-label="Previous Offer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-95 z-20 hover:bg-slate-50"
            aria-label="Next Offer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center z-10 px-5">
            {/* Promo Text */}
            <div className="md:col-span-6 space-y-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold tracking-wider uppercase text-white font-heading">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {currentSlide.tag}
              </span>
              <h2 className="text-2xl md:text-3xl font-black font-heading leading-tight text-white tracking-tight">
                {currentSlide.title}
              </h2>
              <p className="text-sm font-bold text-white/95">
                {currentSlide.subtitle}
              </p>
              <p className="text-xs text-white/80">
                {currentSlide.desc}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleCtaClick(currentSlide.destination_url)}
                  className="px-4 py-2 rounded-full bg-white text-[#D90429] hover:bg-red-50 text-xs font-black shadow-sm transition-transform active:scale-95 inline-flex items-center gap-1.5 font-heading cursor-pointer"
                >
                  <span>{currentSlide.button_text || 'View Offers'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Center Printer Image */}
            <div className="hidden md:flex md:col-span-3 items-center justify-center">

            </div>

            {/* Right Service Links matching Image 1 */}
            <div className="hidden md:flex md:col-span-3 flex-col gap-2 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">

              </div>
              <div className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">

              </div>

              <div className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">

              </div>
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3 z-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right: Exclusive Member Benefits Card */}
        <div className="col-span-12 lg:col-span-4 from-[#B80610] via-[#D00812] to-[#E50914] rounded-3xl p-6 text-white flex flex-col justify-between shadow-md shadow-red-500/15 relative overflow-hidden bg-inherit bg-cover bg-center bg-no-repeat bg-[url(https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-esi8b66f5kw0.png)]">
          <div className="space-y-3 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner">
              <Megaphone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-black font-heading leading-tight">
                Exclusive<br />Member Benefits
              </h3>
              <p className="text-xs text-white/85 mt-2">
                Save more with your membership
              </p>
            </div>
          </div>

          <div className="pt-4 z-10">
            <button
              type="button"
              onClick={onOpenMemberships}
              className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-red-50 active:scale-95 text-[#D90429] text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform font-heading"
            >
              <span>View Benefits</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {/* ======================================================== */}
      {/* 3. Third Row: Recent Enterprises (Only shown if user has prior transactions) */}
      {/* ======================================================== */}
      {recentEnterprises.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 font-heading">
              {t('recentEnterprises')}
            </h3>
            <button
              type="button"
              onClick={onOpenSeeAllEnterprises}
              className="text-xs font-bold text-[#FF1300] hover:underline flex items-center gap-1 font-heading"
            >
              <span>{t('seeAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 items-center justify-items-center pt-1">
            {recentEnterprises.map(ent => (
              <button
                key={ent.id}
                type="button"
                onClick={() => onSelectEnterprise(ent.id)}
                className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1 w-full"
              >
                <div className="w-14 h-14 rounded-full border-2 border-slate-200 group-hover:border-[#FF1300] bg-white flex items-center justify-center shadow-xs transition-all overflow-hidden">
                  <img
                    src={ent.logoUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=256&q=80'}
                    alt={ent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-[#FF1300] text-center max-w-[90px] truncate leading-tight">
                  {ent.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. Fourth Row: Recent Print History (Dynamic from Orders) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 font-heading">
            {t('recentPrintHistory')}
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">{t('noOrdersYet')}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF1300] hover:bg-[#E01100] text-white text-xs font-bold shadow-sm transition-all active:scale-95 font-heading"
              >
                <span>{t('uploadDocument')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(showAllOrders ? orders : orders.slice(0, 4)).map(order => {
              const ent = enterprises.find(e => e.id === order.enterpriseId);
              const shopName = ent?.name || 'Partner Print Shop';
              const isColour = order.config.printType === 'Colour';
              const statusColor =
                order.status === 'Ready for Pickup'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : order.status === 'Printing'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              return (
                <div
                  key={order.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-red-200 flex items-center justify-center shrink-0 shadow-sm bg-red-50">
                      <FileText className="w-5 h-5 text-[#FF1300]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 font-heading truncate">
                        {shopName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Recent'}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[160px] font-medium text-slate-600">
                          {order.document?.fileName || 'Document'}
                        </span>
                        <span>•</span>
                        <span>{order.calculatedPages || 1} {t('pageSize')}</span>
                        <span>•</span>
                        <span>{order.config.copies} {t('copies')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isColour ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {order.config.printType}
                    </span>

                    <span className="text-xs md:text-sm font-black text-emerald-600 font-heading">
                      ₹{(order.grandTotal || 0).toFixed(2)}
                    </span>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${statusColor}`}>
                      {order.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => onViewReceipt(order)}
                      className="px-3 py-1.5 rounded-full border border-red-200 hover:border-[#FF1300] bg-white hover:bg-red-50 text-[#FF1300] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs font-heading active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF1300]" />
                      <span>{t('viewReceipt')}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* View More / View Less Toggle when more than 4 orders */}
            {orders.length > 4 && (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllOrders(prev => !prev)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs font-heading"
                >
                  <span>{showAllOrders ? 'Show Less (Top 4)' : `View More (${orders.length - 4} More)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop-only SEO / AEO / GEO section. Mobile remains unchanged. */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div className="sr-only">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF1300]">printOn24 online printing in Pune</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 font-heading">Print Online. Collect at a Nearby Print Shop.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            printOn24 is an online printing platform that lets you upload PDFs, Word files, Excel sheets,
            PowerPoint decks and images, set paper size, colour, copies, page range and double-side options,
            and send the job to a verified shop nearby. You receive a pickup token and digital receipt, then collect
            the printout without waiting in a queue.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold"><a className="rounded-full bg-[#FF1300] px-4 py-2 text-white" href="/upload">Upload and Print Now</a><a className="rounded-full border border-red-200 px-4 py-2 text-[#FF1300]" href="/shops">Find a Print Shop</a></div>
        </div>

        <section id="what-is-printon24" className="sr-only">
          <h2 className="text-2xl font-black text-slate-900 font-heading">What is printOn24?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">printOn24 is an online printing platform that connects customers with partner printing and xerox shops. Upload a file from your phone or laptop, set paper size, colour, sides, copies and page range, and send the order directly to the shop you choose. The shop prints it and you collect it with a token.</p>
        </section>

        <section id="how-it-works" className="sr-only">
          <h2 className="text-2xl font-black text-slate-900 font-heading">How printOn24 Works</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">{['Find or scan your print shop', 'Upload your documents', 'Choose your print settings', 'Check the price and place the order', 'Collect your printout with a token'].map((step, index) => <li key={step} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Step {index + 1}</strong><span className="mt-2 block">{step}.</span></li>)}</ol>
        </section>

        <section id="features" className="sr-only">
          <h2 className="text-2xl font-black text-slate-900 font-heading">Features of printOn24</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-slate-700">{['Complete print configuration for A4, A3 and A2', 'PDF, Word, Excel, PowerPoint and image files', 'Colour, black and white, single side or back to back', 'Selected pages, custom range and 1, 2 or 4 pages per sheet', 'Live price estimate, pickup token and digital receipt', 'Nearby partner shops within 1 km or 5 km'].map(feature => <div key={feature} className="rounded-2xl border border-slate-200 p-4">{feature}</div>)}</div>
        </section>

        <div className="grid gap-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-2xl font-black text-slate-900 font-heading">Frequently asked questions</h2>
            <div className="grid gap-4 text-sm text-slate-700">
              {homeFaqs.map(([question, answer]) => (
                <details key={question} className="group rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 marker:content-none">
                    <span>{question}</span>
                    <span className="text-lg leading-none text-[#FF1300] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 border-t border-slate-100 pt-3 leading-6 text-slate-700">{answer}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="sr-only">
            <h3 className="text-lg font-black text-slate-900 font-heading">Partner print shops in Pune</h3>
            {eligibleVendorList.length === 0 ? (
              <p className="text-sm text-slate-500">Active partner shops will appear here when verified vendor data is available.</p>
            ) : (
              <div className="grid gap-3">
                {eligibleVendorList.map(ent => (
                  <div key={ent.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 p-2 shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(ent.qrCodeData || `https://printon24.in/upload?shop=${ent.shopCode}`)}`}
                        alt={`${ent.name} QR code`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-sm font-black text-slate-900 font-heading">{ent.name}</h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Verified</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{ent.address}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                        <span>Code: {ent.shopCode}</span>
                        <span>•</span>
                        <span>{ent.services.slice(0, 2).join(' · ')}</span>
                      </div>
                    </div>
                    <a href={`/shops/${ent.city.toLowerCase()}/${shopSlug(ent.name)}`} className="shrink-0 rounded-full border border-red-200 px-3 py-2 text-[11px] font-bold text-[#FF1300]">View shop</a>
                    <a href={`/upload?shop=${encodeURIComponent(ent.shopCode)}`} className="shrink-0 rounded-full bg-[#FF1300] px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#E01100]">Order now</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="sr-only">Uploaded documents are stored in encrypted cloud storage and automatically deleted within 12 hours. Payment methods depend on the selected shop. <a href="/privacy-policy">Read the Privacy Policy</a>.</p>
      </div>
    </div>
    </>
  );
};
