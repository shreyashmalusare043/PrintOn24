import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Download, Printer } from 'lucide-react';
import { fetchPlatformTerms, saveUserConsent } from '../../services/api';
import { toast } from 'sonner';

interface TermsConditionsViewProps {
  onBackToHome: () => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ onBackToHome }) => {
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem('printon24_terms_accepted') === 'true';
  });
  const [termsData, setTermsData] = useState<{
    title: string;
    content: string;
    version: string;
    published_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformTerms().then((data) => {
      if (data) {
        setTermsData(data);
      } else {
        setTermsData({
          title: 'printOn24 Platform Master Terms & Conditions of Service',
          content: 'Standard tripartite agreement governing user interactions, verified print shops, and printOn24.',
          version: 'v2.6',
          published_at: new Date().toISOString()
        });
      }
      setLoading(false);
    });
  }, []);

  const handleAcceptanceChange = (next: boolean) => {
    if (next === accepted) return;

    setAccepted(next);
    localStorage.setItem('printon24_terms_accepted', next ? 'true' : 'false');
    saveUserConsent('guest', 'terms_conditions', next).catch(() => {});
    if (next) {
      toast.success('Terms & Conditions accepted successfully.');
    } else {
      toast.info('Terms & Conditions acceptance cleared.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 pb-28 text-slate-900 select-text">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-[0px]">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#FF1300] bg-slate-50 hover:bg-red-50 border border-slate-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />

        </button>

      </div>
      {/* Pocketly-style clean document reader layout (matching terms.jpeg) */}
      <div className="bg-white pt-6 space-y-5 leading-relaxed text-xs text-slate-700">
        {/* Document Header */}
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            printOn24
          </h1>
          <h2 className="text-sm md:text-base font-bold text-slate-800">
            Website Usage Terms and Conditions
          </h2>
        </div>

        {/* Preamble */}
        <p className="text-slate-600">
          These terms and conditions of use (<strong className="text-slate-900">“Terms”</strong>) along with the privacy policy (<strong className="text-slate-900">“Policy”</strong>) forms a legally binding agreement (<strong className="text-slate-900">“Agreement”</strong>) between you (hereinafter referred to as <strong className="text-slate-900">“you”</strong> or <strong className="text-slate-900">“your”</strong> or <strong className="text-slate-900">“user”</strong>) and printOn24 Technology Pvt. Ltd. (hereinafter referred to as <strong className="text-slate-900">“printOn24”</strong> or <strong className="text-slate-900">“our”</strong> or <strong className="text-slate-900">“we”</strong> or <strong className="text-slate-900">“us”</strong>).
        </p>

        <p className="text-slate-600">
          We recommend that you spend time reading these Terms and the policy before accessing our services on www.printon24.in (<strong className="text-slate-900">“Website”</strong>) or via on-campus print kiosks. Please reach out to us at support@printon24.in if you have any questions regarding the same. We will try our best to answer your queries.
        </p>

        <p className="text-slate-600">
          This Agreement is a computer-generated electronic record published in terms of Rule 3 of the Information Technology (Intermediaries Guidelines) Rules, 2011 read with Information Technology Act, 2000 and does not require any physical or digital signatures.
        </p>

        <p className="text-slate-600">
          printOn24 offers cloud printing, student print document routing, on-counter pickup and terminal integration pursuant to verified merchant agreements between us and verified partner print shops.
        </p>

        <p className="text-slate-500 text-[11px] uppercase tracking-wide">
          PLEASE READ THESE TERMS OF SERVICE CAREFULLY. BY ACCESSING THE PORTAL OR USING THE SERVICE OR ITS APPLICATION, AS WELL AS TO ALL INFORMATION, RECOMMENDATIONS AND/OR SERVICES PROVIDED TO YOU ON OR THROUGH THE WEBSITE, THE APPLICATION OR THROUGH THE CUSTOMER CARE (“CC”) SERVICES PROVIDED BY ANY ELECTRONIC OR TELEPHONIC FORM.
        </p>

        {/* Section: DEFINITIONS AND INTERPRETATION */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            DEFINITIONS AND INTERPRETATION
          </h3>
          <p className="text-slate-600">
            Capitalized terms, not defined elsewhere in this Agreement, shall mean as follows:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>
              <strong className="text-slate-900">“Print Shop Partner”</strong> means any verified campus stationery, photocopy vendor, or automated printer kiosk affiliated with printOn24.
            </li>
            <li>
              <strong className="text-slate-900">“Print Job”</strong> shall mean the transmission, spooling, rendering and hardcopy paper generation of digital documents configured by the user.
            </li>
            <li>
              <strong className="text-slate-900">“Person”</strong> shall mean any natural person, student, college faculty, company, proprietorship, trust or entity accessing the portal.
            </li>
          </ul>
        </div>

        {/* Section: USER APPROVAL */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            USER APPROVAL
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
            <li>By using printOn24's services and Website, you expressly agree and consent to be bound by this Agreement.</li>
            <li>You must be at least sixteen (16) years of age or above to accept this Agreement independently.</li>
            <li>You understand that if you do not agree with the terms of this Agreement, you must immediately discontinue the use of and cease to access the Website and any other services provided by us.</li>
            <li>This Agreement shall govern the relationship of each user with printOn24 and its affiliated print kiosk operators.</li>
          </ol>
        </div>

        {/* Section: PROVISION OF THE WEBSITE */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            PROVISION OF THE WEBSITE & PRINT TERMINALS
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
            <li>printOn24 allows its users to upload PDF and document formats for fulfillment according to print parameters configured (Color, B&W, Duplex, Copies, Paper Size).</li>
            <li>printOn24 reserves the right to reject any print job that violates campus policies, contains copyright infringement, or illegal examination materials.</li>
            <li>We may stop provision of the Website permanently or temporarily to users generally or modify features with prior notice.</li>
            <li>You agree that you are responsible for internet data charges incurred through use of the cloud upload platform.</li>
          </ol>
        </div>

        {/* Section: PRINTON24 SERVICES */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            PRINTON24 SERVICES & AUTOMATED DISPENSING
          </h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
            <li>printOn24 offers a technology platform connecting print seekers to local campus printing partners, real-time queue tokens, and digital thermal receipts.</li>
            <li>Partner print shops agree to fulfill orders using standard 75+ GSM copier paper for B&W prints and 100+ GSM laser paper for color prints.</li>
            <li>PayU Split Settlement: Online payments are processed via RBI-authorized payment aggregators (PayU). In case of printer hardware malfunction, refunds or re-spooling are processed automatically.</li>
            <li>Pay on Counter: Users who choose counter payment must present their digital token at the pickup desk prior to document release.</li>
          </ol>
        </div>

        {/* Section: USER INFORMATION, OFFERS AND DATA RETENTION */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            USER INFORMATION, PRIVACY AND 12-HOUR FILE RETENTION
          </h3>
          <p className="text-slate-600">
            printOn24 collects minimal necessary user data including name, email address, phone number, and campus location solely to deliver the requested print order. Customer files uploaded for printing are governed by our strict 12-Hour Document Lifecycle: once 12 hours elapse from upload or order fulfillment, original document binaries are permanently deleted from server disks.
          </p>
          <p className="text-slate-600">
            We strictly do NOT sell or monetize student information to unauthorized third-party marketing entities.
          </p>
        </div>

        {/* Section: USAGE CONDITIONS */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            USAGE CONDITIONS & PROHIBITED CONTENT
          </h3>
          <p className="text-slate-600">
            By using the Application or Website you agree that you shall use the Services for lawful educational and personal purposes only. You shall not submit or attempt to print counterfeit currency, leaked exam question papers, defamatory content, or malicious code designed to disrupt terminal hardware.
          </p>
        </div>

        {/* Final Acceptance Checkbox Section (matching terms.jpeg requirement) */}
        <div className="pt-6 mt-6 border-t-2 border-slate-200 space-y-4">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              accepted
                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                : 'bg-slate-50 border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              type="checkbox"
              id="terms_agree_checkbox"
              checked={accepted}
              onChange={event => handleAcceptanceChange(event.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#FF1300] rounded border-slate-300 focus:ring-[#FF1300] cursor-pointer"
            />
            <label
              htmlFor="terms_agree_checkbox"
              className="text-xs font-semibold text-slate-800 cursor-pointer"
            >
              I have read, understood, and accept the printOn24 Website Usage Terms and Conditions and agree to abide by all platform rules.
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {accepted ? '✓ Accepted on this device' : 'Please review and check the acceptance box above'}
            </span>
            <button
              type="button"
              onClick={() => handleAcceptanceChange(true)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                accepted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#FF1300] text-white hover:bg-red-700 shadow-md'
              }`}
            >
              {accepted ? 'Accepted' : 'Accept Terms'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
