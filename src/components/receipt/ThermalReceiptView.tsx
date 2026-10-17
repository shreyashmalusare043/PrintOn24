import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Copy,
  CheckCircle2,
  Download,
  Share2,
  Scissors,
  ArrowLeft,
  Clock,
  Sparkles,
  ExternalLink,
  Building2,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import type { PrintOrder } from '../../types/printperfect';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { printerAudio } from '../../utils/printerAudio';
import { toast } from 'sonner';

interface ThermalReceiptViewProps {
  order: PrintOrder;
  onBackToHome: () => void;
  onNewPrint: () => void;
}

export const ThermalReceiptView: React.FC<ThermalReceiptViewProps> = ({
  order,
  onBackToHome,
  onNewPrint
}) => {
  const { user, retrieveDocumentForPrint } = usePrintPerfect();
  const [isPrinting, setIsPrinting] = useState(true);
  const [isTorn, setIsTorn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRetrievingPrint, setIsRetrievingPrint] = useState(false);
  const [printAnimationKey, setPrintAnimationKey] = useState(1);

  // Exact online payment verification logic per requirements:
  // "Pay on Counter" -> NO "PAID" stamp (shows "PAY ON COUNTER • PENDING PAYMENT")
  // "Online + successful payment" -> "PAID" stamp
  const isOnlinePaid =
    order.paymentMethod !== 'Pay on Counter' &&
    order.paymentStatus === 'PAID';

  // Trigger procedural printing sound and extrusion timeline on mount or reprint
  useEffect(() => {
    setIsPrinting(true);
    if (!isMuted) {
      printerAudio.startPrintingSound();
    }

    const timer = setTimeout(() => {
      setIsPrinting(false);
      printerAudio.stopPrintingSound();
      if (!isMuted && isOnlinePaid) {
        printerAudio.playStampSound();
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      printerAudio.stopPrintingSound();
    };
  }, [printAnimationKey, isMuted, isOnlinePaid]);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    printerAudio.setMuted(nextMuted);
    toast.info(nextMuted ? 'Printer sound muted' : 'Printer sound enabled');
  };

  const handleGoForPrintSpool = async () => {
    setIsRetrievingPrint(true);
    toast.loading('Checking 12-hour retention & retrieving original customer document...');
    const result = await retrieveDocumentForPrint(order.id, order.document?.id);
    toast.dismiss();
    setIsRetrievingPrint(false);

    if (!result.success) {
      toast.error(result.error || 'Original customer document could not be retrieved.');
      return;
    }

    if (result.url) {
      window.open(result.url, '_blank');
      toast.success(`Original document '${result.docName || order.document.fileName}' retrieved! Sent to printer spool.`);
    }
  };

  const handleReprint = () => {
    setIsTorn(false);
    setPrintAnimationKey(prev => prev + 1);
    toast.info('Re-dispensing thermal receipt from machine...');
  };

  const handleDownloadPdf = () => {
    // Generate clean printable receipt
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popups blocked. Please allow popups to download receipt PDF.');
      return;
    }
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>printOn24 Receipt - Token #${order.tokenNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; max-width: 400px; margin: auto; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
            .logo { height: 36px; margin-bottom: 8px; }
            .token { font-size: 24px; font-weight: 900; color: #FF1300; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
            .bold { font-weight: bold; }
            .footer { border-top: 2px dashed #cbd5e1; padding-top: 16px; margin-top: 16px; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png" class="logo" alt="printOn24" />
            <h3 style="margin:4px 0;">${order.enterpriseName}</h3>
            <p style="margin:2px 0; font-size: 12px; color: #64748b;">${order.enterpriseAddress}</p>
            <div class="token">TOKEN #${order.tokenNumber}</div>
            <div style="font-size: 11px; color: #64748b;">Invoice ID: ${order.invoiceId} • Date: ${order.createdAt}</div>
          </div>
          <div class="row"><span class="bold">Customer:</span><span>${(order.customerName || user.name || 'Guest Customer')}</span></div>
          <div class="row"><span class="bold">Document:</span><span>${order.document?.fileName || 'Print Document'}</span></div>
          <div class="row"><span class="bold">Configuration:</span><span>${order.config.printType} • ${order.config.sides} • ${order.config.pageSize}</span></div>
          <div class="row"><span class="bold">Total Pages:</span><span>${order.calculatedPages} pages</span></div>
          <div class="row"><span class="bold">Total Copies:</span><span>${order.config.copies}</span></div>
          <div class="row"><span class="bold">Payment Method:</span><span>${order.paymentMethod} (${order.paymentStatus})</span></div>
          <div class="row" style="font-size: 16px; font-weight: 900; color: #FF1300; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <span>Grand Total:</span><span>₹${order.grandTotal.toFixed(2)}</span>
          </div>
          <div class="footer">
            <p>Thank you for printing with printOn24!</p>
            <p>Please present this digital receipt or Token at the shop counter.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    toast.success('Receipt prepared for PDF Download / Print!');
  };

  const handleCopyReceiptInfo = () => {
    const clientName = (order.customerName || user.name || 'Customer').trim();
    const receiptText = `PrintOn24 Official Receipt
Shop: ${order.enterpriseName} (${order.enterpriseAddress})
Token: #${order.tokenNumber}
Client: ${clientName}
Order: ${order.orderNumber}
Invoice: ${order.invoiceId}
Document: ${order.document?.fileName || 'Document'}
Pages: ${order.calculatedPages} | Copies: ${order.config.copies}
Print Type: ${order.config.printType} • ${order.config.sides}
Amount: ₹${order.grandTotal.toFixed(2)}
Payment: ${order.paymentMethod} (${order.paymentStatus})
Date: ${order.createdAt}`;
    navigator.clipboard.writeText(receiptText);
    toast.success('Receipt information copied to clipboard!');
  };

  const handleShareReceipt = async () => {
    const clientName = (order.customerName || user.name || 'Customer').trim();
    const shareText = `*printOn24 Receipt - Token #${order.tokenNumber}*\nShop: ${order.enterpriseName}\nClient: ${clientName}\nDocument: ${order.document?.fileName || 'Print Document'}\nPages: ${order.calculatedPages} | Copies: ${order.config.copies}\nTotal: ₹${order.grandTotal.toFixed(2)}\nInvoice: ${order.invoiceId}\nPresent this digital token at the shop counter.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `printOn24 Receipt - Token #${order.tokenNumber}`,
          text: shareText,
          url: window.location.href
        });
        toast.success('Receipt shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyReceiptInfo();
        }
      }
    } else {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        toast.success('Share details copied to clipboard! Paste in WhatsApp or chat.');
      } else {
        handleCopyReceiptInfo();
      }
    }
  };

  // Status progression calculation: simplified directly from Queued to Completed
  const isCompleted = order.status === 'Completed';

  return (
    <div className="space-y-4 pb-28 px-4 max-w-lg mx-auto">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1 -ml-1 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? 'Unmute printer sound' : 'Mute printer sound'}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#FF1300]" />}
          </button>

          <span className="text-xs font-bold text-slate-800">
            Token: <span className="font-mono text-blue-600 font-extrabold">{order.tokenNumber}</span>
          </span>
        </div>
      </div>

      {/* Realistic Black Thermal Printer Dispenser Chassis */}
      <div className="relative pt-2">
        {/* Hardware Dispenser Mouth Casing (Black Printer) */}
        <div className="w-full h-16 bg-gradient-to-b from-slate-950 via-slate-900 to-black rounded-2xl shadow-2xl border-t border-slate-700 p-2.5 flex flex-col items-center justify-between relative z-10">
          {/* Top brand badge & status LED on printer machine */}
          <div className="flex items-center justify-between w-full px-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF1300] shadow-[0_0_8px_#FF1300]" />
              <span className="text-[10px] font-mono tracking-widest text-slate-300 font-bold uppercase">
                PRINTON24 THERMAL POS-80
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPrinting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span
                className={`text-[9px] font-mono font-bold ${
                  isPrinting ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isPrinting ? 'PRINTING...' : 'ONLINE / READY'}
              </span>
            </div>
          </div>

          {/* Paper Slit Mouth Slot with realistic depth */}
          <div className="w-11/12 h-3 bg-black rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,1)] border border-slate-800 relative flex items-center justify-center overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 rounded-full opacity-60" />
          </div>
        </div>

        {/* Paper Overflow Masking Container - Ensures paper physically emerges from the printer slit */}
        <div className="relative z-10 overflow-hidden pt-1 -mt-2">
          {/* Emerging Paper Receipt with Smooth Extrusion Animation */}
          <div
            key={printAnimationKey}
            className={`animate-printer-feed transition-transform duration-500 mx-auto max-w-sm ${
              isTorn ? 'rotate-1 scale-[0.98] translate-y-3 shadow-2xl' : ''
            }`}
          >
            {/* The Thermal Paper Container */}
            <div className="bg-[#FAFBFD] border-x border-slate-200 shadow-xl px-5 pt-6 pb-6 relative text-slate-800 font-sans">
              {/* Top Shop Branding & Logo */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
                    {order.enterpriseName}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-mono mt-0.5">
                    DIGITAL SERVICES RECEIPT
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono truncate max-w-[200px]">
                    {order.enterpriseAddress}
                  </p>
                </div>

                {/* Official printOn24 brand logo replacing generic 'P' avatar */}
                <div className="h-8 flex items-center justify-center shrink-0">
                  <img
                    src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png"
                    alt="printOn24"
                    className="h-7 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Client & Dynamic PAID / Pending Stamp Row */}
              <div className="flex items-center justify-between pt-3 relative">
                <div className="space-y-0.5 font-mono">
                  <p className="text-[10px] uppercase font-bold text-slate-700">
                    CLIENT: {((order.customerName || user.name || 'GUEST CUSTOMER')).toUpperCase()}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    PAYMENT: {order.paymentMethod.toUpperCase()}
                  </p>
                </div>

                {/* CONDITIONAL STAMP LOGIC:
                    - Pay on Counter: NO "PAID" stamp! Shows "PAY AT COUNTER • PENDING PAYMENT"
                    - Online Payment + Verified: Displays red stamped "PAID" mark with date
                */}
                {isOnlinePaid ? (
                  <div className="animate-rubber-stamp rotate-[-10deg] px-2.5 py-1 rounded border-2 border-dashed border-[#EF4444] text-[#EF4444] text-center bg-rose-50/70 shadow-sm select-none">
                    <span className="block text-xs font-black tracking-widest leading-none font-mono">
                      PAID
                    </span>
                    <span className="block text-[8px] font-bold font-mono mt-0.5 leading-none">
                      {order.createdAt.split('•')[0].trim()}
                    </span>
                  </div>
                ) : (
                  <div className="rotate-[-6deg] px-2 py-1 rounded border-2 border-dashed border-amber-500 text-amber-600 text-center bg-amber-50/80 shadow-xs select-none">
                    <span className="block text-[10px] font-black tracking-wider leading-none font-mono">
                      PAY ON COUNTER
                    </span>
                    <span className="block text-[8px] font-bold font-mono mt-0.5 leading-none">
                      PENDING PAYMENT
                    </span>
                  </div>
                )}
              </div>

              {/* Prominent Amount */}
              <div className="pt-3 pb-1 border-b border-slate-200/80">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                  ₹{order.grandTotal.toFixed(2)}
                </h2>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono mt-0.5">
                  {order.createdAt} | {isOnlinePaid ? 'INVOICE PAID' : 'PENDING COUNTER PAYMENT'}
                </p>
              </div>

              {/* Line items */}
              <div className="py-3 space-y-1.5 text-[11px] font-mono border-b border-slate-200/80">
                {order.documents && order.documents.length > 1 ? (
                  order.documents.map((doc, idx) => {
                    const cfg = doc.printConfig || order.config;
                    return (
                      <div key={doc.id || idx} className="flex justify-between items-start gap-2">
                        <span className="truncate text-slate-700">
                          {cfg.copies}X {doc.fileName} ({cfg.sides} • {cfg.printType})
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {doc.totalPages} pgs
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between items-start gap-2">
                    <span className="truncate text-slate-700">
                      {order.config.copies}X {order.document.fileName} ({order.config.sides})
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">
                      ₹{order.subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>1X High-Speed Laser Processing</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>1X Digital Token & Queue Archive</span>
                  <span>₹0.00</span>
                </div>
              </div>

              {/* Subtotals & Taxes */}
              <div className="py-2.5 space-y-1 text-[11px] font-mono border-b border-slate-200/80">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount (Promo)</span>
                    <span>-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Gratuity (Tip)</span>
                  <span>+₹0.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%)</span>
                  <span>₹{order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>GRAND TOTAL</span>
                  <span>₹{order.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center pt-3 pb-2">
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 font-mono">
                  THANK YOU FOR PARTNERING WITH PRINTON24!
                </p>
              </div>

              {/* Barcode Graphic & TXN Token */}
              <div className="pt-1 flex flex-col items-center justify-center">
                <div className="h-10 w-52 flex items-center justify-center gap-[2px] bg-white px-2 py-1 rounded">
                  {[2, 1, 3, 1, 4, 2, 1, 3, 2, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 1, 2].map((w, i) => (
                    <span
                      key={i}
                      className="h-full bg-slate-900 inline-block"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono font-bold tracking-widest text-slate-600 mt-1">
                  TXN-{order.barcode}
                </p>
              </div>

              {/* Perforated Jagged Sawtooth Tear Edge at Bottom */}
              <div className="absolute -bottom-2.5 left-0 right-0 h-3 overflow-hidden flex">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-white rotate-45 -mt-1.5 shrink-0 border-r border-b border-slate-200"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Action Buttons (Re-Print | Download | Copy | Share in responsive grid) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1 w-full">
        <button
          type="button"
          onClick={handleReprint}
          className="min-h-10 py-2 px-1 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-[#FF1300] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-red-200/60 shadow-xs font-heading text-center"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Re-Print</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="min-h-10 py-2 px-1 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-200 shadow-xs font-heading text-center"
        >
          <Download className="w-3.5 h-3.5 text-[#FF1300] shrink-0" />
          <span className="truncate">Download</span>
        </button>

        <button
          type="button"
          onClick={handleCopyReceiptInfo}
          className="min-h-10 py-2 px-1 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-200 shadow-xs font-heading text-center"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">Copy</span>
        </button>

        <button
          type="button"
          onClick={handleShareReceipt}
          className="min-h-10 py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-200 shadow-xs font-heading text-center"
          title="Share receipt via WhatsApp, chat or apps"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Share</span>
        </button>
      </div>

      {/* Real-Time Order Print Status Tracker */}
      <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-heading">
            Live Print Queue Status
          </h4>
          <span
            className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-[#FF1300] animate-pulse'
            }`}
          >
            {isCompleted ? 'Completed' : 'Queued'}
          </span>
        </div>

        {/* 2-step progress: Queued -> Completed directly by shopkeeper */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex flex-col items-center text-center">
            <div className="w-full h-2 rounded-full mb-1.5 bg-[#FF1300]" />
            <span className="text-[10px] font-extrabold text-slate-800">
              1. Order Queued
            </span>
            <span className="text-[9px] text-slate-400">Received at terminal</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div
              className={`w-full h-2 rounded-full mb-1.5 transition-all ${
                isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
            <span
              className={`text-[10px] font-extrabold ${
                isCompleted ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              2. Completed
            </span>
            <span className="text-[9px] text-slate-400">
              {isCompleted ? 'Printed & Ready' : 'Direct on Shopkeeper Print'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {isCompleted
              ? 'Print job completed! Collect physical copy from counter.'
              : `Show Token #${order.tokenNumber} to shopkeeper to execute print directly.`}
          </span>
        </div>

        {/* GO FOR PRINT Button with 12-hour secure storage retrieval */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isRetrievingPrint}
            onClick={handleGoForPrintSpool}
            className="w-full py-3 px-4 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all font-heading"
          >
            <Printer className="w-4 h-4" />
            <span>{isRetrievingPrint ? 'Retrieving 12-Hour Document...' : 'Go for Print (Terminal Spool)'}</span>
          </button>
        </div>
      </div>

      {/* Another print button */}
      <button
        type="button"
        onClick={onNewPrint}
        className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all font-heading"
      >
        Print Another Document
      </button>
    </div>
  );
};
