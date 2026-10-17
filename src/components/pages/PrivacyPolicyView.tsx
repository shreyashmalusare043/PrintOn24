import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { fetchPlatformPolicies, saveUserConsent } from '../../services/api';
import { toast } from 'sonner';

interface PrivacyPolicyViewProps {
  onBackToHome: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBackToHome }) => {
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem('printon24_privacy_accepted') === 'true';
  });
  const [policyData, setPolicyData] = useState<{
    title: string;
    content: string;
    version: string;
    published_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformPolicies().then((data) => {
      if (data) {
        setPolicyData(data);
      } else {
        setPolicyData({
          title: 'printOn24 Platform Privacy Policy & 12-Hour Document Lifecycle',
          content: 'Certified compliance with the India Digital Personal Data Protection (DPDP) Act 2023.',
          version: 'v2.6',
          published_at: new Date().toISOString()
        });
      }
      setLoading(false);
    });
  }, []);

  const handleToggleAccept = () => {
    const next = !accepted;
    setAccepted(next);
    localStorage.setItem('printon24_privacy_accepted', next ? 'true' : 'false');
    saveUserConsent('guest', 'privacy_policy', next).catch(() => {});
    if (next) {
      toast.success('Privacy Policy accepted successfully.');
    } else {
      toast.info('Privacy Policy acceptance cleared.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 pb-28 text-slate-900 select-text">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
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
            Platform Privacy Policy & Data Protection
          </h2>
        </div>

        {/* Preamble */}
        <p className="text-slate-600">
          printOn24 Technology Pvt. Ltd. (<strong className="text-slate-900">“printOn24”</strong>, <strong className="text-slate-900">“we”</strong>, <strong className="text-slate-900">“our”</strong> or <strong className="text-slate-900">“us”</strong>) respects your privacy and is dedicated to protecting your personal data and documents in compliance with the Digital Personal Data Protection (DPDP) Act, 2023.
        </p>

        <p className="text-slate-600">
          This Privacy Policy describes how we collect, store, handle, and securely purge documents uploaded through our web application, partner print shops, and automated kiosk terminals.
        </p>

        {/* Section 1 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            1. 12-HOUR AUTOMATED DOCUMENT PURGE LIFECYCLE
          </h3>
          <p className="text-slate-600">
            Customer documents uploaded for print spooling (assignments, lab reports, thesis, ID cards, certificates) are held in isolated encrypted cloud storage for a strictly enforced maximum operational lifecycle of <strong className="text-slate-900">12 hours</strong>.
          </p>
          <p className="text-slate-600">
            Once the order reaches <strong className="text-slate-900">12 hours from creation</strong> or is acknowledged as printed by the kiosk hardware, the underlying binary file is permanently shredded and deleted from storage disks. Metadata (Token #, Page count, Timestamp) is preserved solely for taxation, invoice archives, and audit requirements.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            2. INFORMATION WE COLLECT
          </h3>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">Contact Information:</strong> Full name, email address, phone number when placing orders or registering.</li>
            <li><strong className="text-slate-900">Print Parameters:</strong> File name, page range, color/grayscale preference, copies count, duplex orientation.</li>
            <li><strong className="text-slate-900">Transaction Identifiers:</strong> PayU transaction ID, order number, pickup token ID. We do not store credit/debit card numbers or UPI PINs.</li>
            <li><strong className="text-slate-900">Location Data:</strong> Selected campus print shop ID to ensure document routing to the correct physical tray.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            3. PAYU PAYMENT DATA ISOLATION
          </h3>
          <p className="text-slate-600">
            Online transactions on printOn24 are executed via RBI-regulated payment aggregators (PayU). Sensitive payment credentials are handled exclusively on certified PCI-DSS compliant bank gateways and never touch or reside on printOn24 application servers.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            4. ZERO STUDENT DATA MONETIZATION
          </h3>
          <p className="text-slate-600">
            We operate on a zero data-brokering principle. We do not sell, rent, license, or disclose student contact details or document contents to advertising syndicates, loan providers, or third parties without explicit consent.
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">
            5. SECURITY & ENCRYPTION MEASURES
          </h3>
          <p className="text-slate-600">
            All document uploads and communications are secured via Transport Layer Security (TLS 1.3) protocols. Cloud databases are protected with Postgres Row-Level Security (RLS) restricting customer order records strictly to their respective owners and designated print shop operators.
          </p>
        </div>

        {/* Final Acceptance Checkbox Section (matching terms.jpeg requirement) */}
        <div className="pt-6 mt-6 border-t-2 border-slate-200 space-y-4">
          <div
            onClick={handleToggleAccept}
            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              accepted
                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                : 'bg-slate-50 border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              type="checkbox"
              id="privacy_agree_checkbox"
              checked={accepted}
              onChange={handleToggleAccept}
              className="mt-0.5 w-4 h-4 text-[#FF1300] rounded border-slate-300 focus:ring-[#FF1300] cursor-pointer"
            />
            <label
              htmlFor="privacy_agree_checkbox"
              className="text-xs font-semibold text-slate-800 cursor-pointer"
            >
              I have read, understood, and accept the printOn24 Privacy Policy, including the 12-Hour Document Lifecycle and data security safeguards.
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {accepted ? '✓ Accepted on this device' : 'Please review and check the acceptance box above'}
            </span>
            <button
              type="button"
              onClick={handleToggleAccept}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                accepted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#FF1300] text-white hover:bg-red-700 shadow-md'
              }`}
            >
              {accepted ? 'Accepted' : 'Accept Policy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
