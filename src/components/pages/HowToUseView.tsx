import { ArrowLeft, CheckCircle2, Download, Expand, FileImage, Share2, Smartphone, X } from 'lucide-react';
import React from 'react';

interface HowToUseViewProps {
  onBackToHome: () => void;
}

const downloadSteps = [
  'Tap Download Now on the PrintOn24 website.',
  'Open the downloaded printon24.apk file on your Android phone.',
  'If Android asks, allow your browser to install apps, then tap Install.',
  'Open PrintOn24 and scan the print shop QR code to get started.'
];

const sharingSteps = [
  'Open a document or image in WhatsApp, Gallery, or Files.',
  'Tap Share and choose PrintOn24 from the app list.',
  'Select a print shop if asked, then choose your print settings.',
  'Place your order and keep the receipt and pickup token.'
];

export const HowToUseView: React.FC<HowToUseViewProps> = ({ onBackToHome }) => {
  const [isFlowChatFullscreen, setIsFlowChatFullscreen] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-32 pt-2 md:px-6 md:pb-10">
      <button
        type="button"
        onClick={onBackToHome}
        className="inline-flex items-center gap-2 rounded-xl py-2 text-sm font-semibold text-slate-600 transition hover:text-[#FF1300]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF1300]">PrintOn24 Guide</p>
        <h1 className="text-2xl font-black text-slate-900 md:text-3xl">How To Use PrintOn24?</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Explore the complete printing workflow, from scanning a shop QR code to receiving your print receipt.
        </p>
      </header>

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_280px] md:items-center md:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileImage className="h-4 w-4 text-[#FF1300]" />
            Flow Chat
          </div>
          <p className="text-sm leading-6 text-slate-600">
            See each step of the PrintOn24 order process. Select the image to view it full screen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFlowChatFullscreen(true)}
          aria-label="View Flow Chat full screen"
          className="group relative mx-auto block w-full max-w-[280px] overflow-hidden rounded-2xl bg-slate-100 shadow-lg"
        >
          <img
            src={`${import.meta.env.BASE_URL}FlowChat.jpeg`}
            alt="PrintOn24 flow chart showing the six steps from scanning a shop QR code to receiving a print receipt"
            className="block h-auto max-h-[440px] w-full object-contain"
          />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white shadow transition group-hover:bg-[#FF1300]">
            <Expand className="h-3.5 w-3.5" />
            Full screen
          </span>
        </button>
      </section>

      {isFlowChatFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Flow Chat full screen"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          onClick={() => setIsFlowChatFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setIsFlowChatFullscreen(false)}
            aria-label="Close full screen Flow Chat"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={`${import.meta.env.BASE_URL}FlowChat.jpeg`}
            alt="PrintOn24 flow chart showing the six steps from scanning a shop QR code to receiving a print receipt"
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#FF1300]">
              <Download className="h-5 w-5" />
            </span>
            <h2 className="text-base font-extrabold text-slate-900">How To Download PrintOn24</h2>
          </div>
          <ol className="space-y-3">
            {downloadSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-5 text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-[#FF1300]">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Share2 className="h-5 w-5" />
            </span>
            <h2 className="text-base font-extrabold text-slate-900">Share files directly to print</h2>
          </div>
          <p className="mb-3 text-sm leading-5 text-slate-600">
            Send a document or image from WhatsApp, Gallery, or Files straight to PrintOn24.
          </p>
          <ol className="space-y-3">
            {sharingSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-5 text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-600">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <FileImage className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>Supported files: PDF, DOC, DOCX, JPG, PNG, and WEBP, up to 50 MB each.</span>
          </div>
        </section>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">Why use the PrintOn24 app?</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Share documents from your favourite apps without first saving and uploading them manually.
            Your files open in PrintOn24, ready to configure and print.
          </p>
        </div>
        <Smartphone className="hidden h-5 w-5 shrink-0 text-emerald-600 sm:block" />
      </div>
    </div>
  );
};
