import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sliders,
  CreditCard,
  Printer,
  ShieldCheck,
  Zap,
  Target,
  Eye,
  Users,
  Store,
  ChevronRight
} from 'lucide-react';
import { fetchCMSContent } from '../../services/api';

interface AboutUsViewProps {
  onBackToHome: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  onBackToHome
}) => {
  const [cmsItems, setCmsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCMSContent('about_us').then((res) => {
      if (Array.isArray(res)) {
        setCmsItems(res);
      }
      setLoading(false);
    });
  }, []);

  const mainItem = cmsItems.find(i => i.id === 'about_us_main') || cmsItems[0];

  const badgeText = mainItem?.badge_text || '✦ DISCOVER OUR STORY & MISSION';
  const heroTitle = mainItem?.title || 'Revolutionizing Daily Printing Through Intelligent Technology';
  const heroSubtitle = mainItem?.subtitle || 'printOn24 bridges the gap between everyday document creators and neighborhood reprography centers, transforming physical print shops into high-speed digital service hubs.';

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-24 select-none">
      {/* Top Navigation */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs transition-colors font-heading"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{"Back"}</span>
        </button>
      </div>
      {/* Hero Section */}
      <div className="rounded-3xl from-red-600 via-[#FF1300] to-rose-500 p-7 md:p-10 text-white relative overflow-hidden shadow-lg shadow-red-500/15 bg-inherit bg-cover bg-center bg-no-repeat bg-[url(https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-esiq8l6djjsw.png)]">
        <div className="max-w-2xl space-y-3 z-10 relative">
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider font-heading inline-block border border-white/20">
            {badgeText}
          </span>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black font-heading leading-tight">
            {heroTitle}
          </h1>
          <p className="text-xs md:text-sm text-white/95 leading-relaxed font-normal">
            {heroSubtitle}
          </p>
        </div>
      </div>
      {/* Section 1: WHAT IS PRINTON24? */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-5">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-[#FF1300] uppercase tracking-wider font-heading">
            Overview
          </span>
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading">
            WHAT IS PRINTON24?
          </h2>
          <h3 className="text-xs md:text-sm font-bold text-slate-600 font-heading">
            The Complete Digital Document Printing Ecosystem
          </h3>
        </div>

        <div className="space-y-3 text-xs md:text-sm text-slate-600 leading-relaxed">
          <p>
            printOn24 was conceived to eliminate the age-old frustrations of physical document printing — long queues, broken file formatting, WhatsApp chaos, USB virus risks, and awkward cash handling.
          </p>
          <p>
            Our platform provides a smooth end-to-end workflow: customers scan a unique shop QR code from any smartphone or laptop, upload documents in any format (PDF, DOCX, XLSX, PPTX, JPG), customize print parameters (color mode, duplex, paper sizes, page ranges), make swift online or counter payments, and collect crisp physical prints within seconds.
          </p>
          <p>
            For printing businesses, printOn24 acts as an intelligent digital dispatcher. Incoming orders are instantly spooled to connected counter PCs and routed to the exact matching physical printer (B&W or Color, Single-Side or Duplex) without requiring the shopkeeper to manually open heavy desktop applications.
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 font-heading">QR-Based Instant Discovery</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every partner store is assigned a tamper-proof dynamic QR code. Customers simply point their camera and begin uploading immediately.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 font-heading">Precision Print Engine</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Segment-level range control, orientation locking, paper thickness selection, and zero-reprint guarantees ensure print accuracy.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 font-heading">Flexible Dual Payments</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Integrated Razorpay UPI / Card payments alongside traditional pay-at-counter cash modes give customers and shops ultimate flexibility.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#FF1300] flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 font-heading">Silent Hardware Dispatch</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Direct hardware communication via local workstation agents automatically assigns jobs to available printers without popup dialogs.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Section 2: PURPOSE & DIRECTION */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-[#FF1300] uppercase tracking-wider font-heading">
            Purpose & Direction
          </span>
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading">
            OUR MISSION & OUR VISION
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50/60 to-rose-50/30 border border-red-100 space-y-3.5">
            <div className="flex items-center gap-2 text-[#FF1300]">
              <Target className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-heading uppercase tracking-wider">OUR MISSION</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#FF1300] font-bold mt-0.5">•</span>
                <span>To democratize and streamline document printing by eliminating manual queues, file incompatibility, and tedious communication bottlenecks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF1300] font-bold mt-0.5">•</span>
                <span>To empower local xerox and print shops with enterprise-grade cloud automation, direct hardware spooling, and transparent digital accounting.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF1300] font-bold mt-0.5">•</span>
                <span>To provide students, professionals, and citizens with instantaneous access to dependable, high-quality printing within their own neighborhoods.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF1300] font-bold mt-0.5">•</span>
                <span>To continuously innovate environmentally conscious, paper-optimized workflows that reduce print waste and foster community business growth.</span>
              </li>
            </ul>
          </div>

          {/* Vision Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border border-blue-100 space-y-3.5">
            <div className="flex items-center gap-2 text-blue-600">
              <Eye className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-heading uppercase tracking-wider">OUR VISION</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>To build the country's most reliable, secure, and accessible interconnected digital printing infrastructure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>To turn every printing terminal into an automated, zero-latency cloud node capable of processing any document format in milliseconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>To nurture the digital transformation of independent reprographic entrepreneurs so they can scale alongside India's digital economy.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span>To establish printOn24 as the undisputed benchmark for contactless, privacy-assured document handling across educational campuses, tech hubs, and commercial centers.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Section 3: LEADERSHIP & ARCHITECTURE (Team & Credits) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-[#FF1300] uppercase tracking-wider font-heading">
            Leadership & Architecture
          </span>
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading">
            Team & Credits
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            The passionate engineers and growth strategists behind the printOn24 printing network.
          </p>
        </div>

        {/* Technology Partner: Powered by High Resolution Software and Coding */}
        <a
          href="https://hrsactech.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="block p-5 rounded-3xl transition-transform active:scale-[0.99] border hover:shadow-md"
          style={{
            backgroundColor: '#EBF5FB',
            borderColor: '#B9DDFB'
          }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <img
              src="https://miaoda-conversation-file.s3cdn.medo.dev/user-awm3lxjnyu4g/app-epyrkfdiozk1/20261013/HR-SAC.png"
              alt="High Resolution Software and Coding Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-white p-1 border border-blue-100 shadow-2xs shrink-0"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0070BA] font-heading">
                  TECHNOLOGY PARTNER • POWERED BY
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#0070BA] shrink-0" />
              </div>
              <h3 className="text-sm md:text-base font-black text-slate-900 font-heading">
                High Resolution Software and Coding
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Leading enterprise software architecture, cloud telemetry, resilient infrastructure, and secure print protocols.
              </p>
              <p className="text-[11px] font-bold text-slate-500 tracking-wider">
                PUNE • MAHARASHTRA
              </p>
            </div>
          </div>
        </a>

        {/* Core Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Engineering & Core */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF1300] font-heading">
              ENGINEERING & CORE
            </span>
            <h4 className="text-xs font-bold text-slate-800 font-heading">Development by</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF1300]" />
                <span><strong className="text-slate-900">Shreyash Malusare</strong> — Full Stack & Systems Architect</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF1300]" />
                <span><strong className="text-slate-900">Hitesh Lokare</strong> — Full Stack & Print Driver Integration</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF1300]" />
                <span><strong className="text-slate-900">Rahul Mete</strong> — Cloud Services & Database Architect</span>
              </li>
            </ul>
          </div>

          {/* Growth & Analytics */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0070BA] font-heading">
              GROWTH & ANALYTICS
            </span>
            <h4 className="text-xs font-bold text-slate-800 font-heading">Marketing & Data Analysis</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0070BA]" />
                <span><strong className="text-slate-900">Dattatray Bejgamar</strong> — Head of Growth & Strategic Partnerships</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0070BA]" />
                <span><strong className="text-slate-900">Shravan Patil</strong> — Data Analytics & Merchant Operations</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Section 4: BENEFITS AT A GLANCE */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-[#FF1300] uppercase tracking-wider font-heading">
            Value Creation
          </span>
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-heading">
            BENEFITS AT A GLANCE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Benefits */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-heading font-bold text-xs uppercase tracking-wider">
              <Users className="w-4 h-4 text-[#FF1300]" />
              <span>Customer Benefits</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF1300] shrink-0 mt-0.5" />
                <span><strong>Zero Queue Waiting:</strong> Send print jobs before leaving home or classroom.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF1300] shrink-0 mt-0.5" />
                <span><strong>Privacy First:</strong> No need to hand over unlocked smartphones or share files on public chat apps.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF1300] shrink-0 mt-0.5" />
                <span><strong>Live Transparency:</strong> Instant pricing calculations and dynamic page range verification.</span>
              </li>
            </ul>
          </div>

          {/* Shopkeeper Benefits */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-heading font-bold text-xs uppercase tracking-wider">
              <Store className="w-4 h-4 text-[#0070BA]" />
              <span>Shopkeeper Benefits</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0070BA] shrink-0 mt-0.5" />
                <span><strong>Double Daily Throughput:</strong> Automate file opening, driver settings, and paper size mapping.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0070BA] shrink-0 mt-0.5" />
                <span><strong>Zero Re-print Loss:</strong> Page-level tracking prevents accidental duplicate printing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0070BA] shrink-0 mt-0.5" />
                <span><strong>Multi-PC Multi-Printer Clustering:</strong> Balance load across all counter printers automatically.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
