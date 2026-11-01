import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { saveUserConsent } from '../../services/api';
import { toast } from 'sonner';

interface PrivacyPolicyViewProps {
  onBackToHome: () => void;
}

interface PolicyGroup {
  heading: string;
  description?: string;
  items?: string[];
}

interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  orderedItems?: string[];
  groups?: PolicyGroup[];
  closingParagraphs?: string[];
}

const policySections: PolicySection[] = [
  {
    heading: '1. 12-HOUR AUTOMATED DOCUMENT PURGE LIFECYCLE',
    paragraphs: [
      'Customer documents uploaded for printing purposes, including assignments, lab reports, projects, thesis documents, ID cards, certificates, and other materials, are retained in access-controlled cloud storage for a maximum operational lifecycle of 12 hours.',
      'The 12-hour document retention policy applies to active operational document storage. Backup systems, temporary processing systems, and third-party infrastructure may have separate deletion cycles.',
    ],
    bullets: [
      'Uploaded documents are temporarily stored for order processing and printing.',
      'Documents are made available to the selected print shop for fulfilling the order.',
      'Once the order reaches 12 hours from its creation or is acknowledged as successfully printed, the underlying document file is scheduled for deletion.',
      'Documents may be deleted earlier when no longer required for printing operations.',
      'Order-related metadata may remain available for operational, accounting, taxation, customer support, and audit purposes. Metadata may include Order ID, Token Number, Page Count, Timestamp, Printing Configuration, and Transaction References.',
    ],
  },
  {
    heading: '2. INFORMATION WE COLLECT',
    paragraphs: ['printOn24 may collect the following categories of information to provide its services.'],
    groups: [
      {
        heading: 'A. Contact Information',
        items: ['Full name.', 'Email address.', 'Mobile number.', 'Contact details provided during registration or order placement.'],
      },
      {
        heading: 'B. Account Information',
        items: ['User account details.', 'Login and authentication information.', 'Profile information.', 'Membership and subscription status, where applicable.', 'Account preferences.'],
      },
      {
        heading: 'C. Printing Information',
        items: ['Uploaded file names.', 'Document formats.', 'Page count and page ranges.', 'Paper size and orientation.', 'Color or black-and-white preferences.', 'Single-side or double-side printing preferences.', 'Number of copies.', 'Other printing configurations.'],
      },
      {
        heading: 'D. Transaction Information',
        items: ['Order ID.', 'PayU transaction ID, where applicable.', 'Payment status.', 'Pickup token ID.', 'Transaction references.', 'Refund and payment reconciliation information.'],
        description: "printOn24 does not intentionally collect or store users' debit/credit card numbers, UPI PINs, or banking passwords.",
      },
      {
        heading: 'E. Shop and Location Information',
        items: ['Selected print shop ID.', 'Shop identification details.', 'Order routing information.', 'Location information voluntarily provided or required to complete a printing request.'],
      },
      {
        heading: 'F. Technical Information',
        items: ['IP address.', 'Browser type.', 'Device information.', 'Operating system.', 'Session information.', 'Technical logs and diagnostic information.'],
      },
    ],
  },
  {
    heading: '3. PAYMENT DATA PROTECTION & PAYU INTEGRATION',
    paragraphs: [
      'Online payments on printOn24 may be processed through third-party payment service providers, including PayU, depending on the payment methods enabled on the platform.',
      "Payment processing is handled through the payment provider's payment infrastructure.",
    ],
    bullets: [
      'Sensitive payment credentials are processed by the relevant payment provider.',
      "printOn24 does not intentionally store users' card numbers or UPI PINs.",
      'Transaction IDs and payment statuses may be stored for order verification.',
      'Payment information may be used for refunds, reconciliation, dispute resolution, and accounting purposes.',
      'Users are advised to review the privacy policies of the respective payment providers before completing transactions.',
    ],
  },
  {
    heading: '4. ZERO DATA MONETIZATION POLICY',
    paragraphs: [
      'HR-SAC TECH follows a zero data-brokering principle for printOn24.',
      "We do not sell, rent, trade, or commercially distribute users' personal information, student contact details, or uploaded document contents to:",
    ],
    bullets: [
      'Advertising syndicates.',
      'Loan providers.',
      'Unrelated marketing agencies.',
      'Unauthorized third parties.',
      'Data brokers.',
    ],
    closingParagraphs: ['Personal information is processed only for legitimate platform operations, service delivery, security, customer support, and other purposes permitted by applicable law.'],
  },
  {
    heading: '5. SECURITY & ENCRYPTION MEASURES',
    paragraphs: ['HR-SAC TECH implements appropriate technical and organizational measures to protect user information.'],
    bullets: [
      'Secure HTTPS communication and TLS encryption.',
      'Access-controlled cloud infrastructure.',
      'PostgreSQL Row-Level Security (RLS), where configured.',
      'Authentication and authorization mechanisms.',
      'Restricted access to customer documents.',
      'Secure database access policies.',
      'Monitoring of suspicious activities.',
      'Protection against unauthorized access, alteration, and disclosure.',
    ],
    closingParagraphs: ['We regularly review our security practices to improve the protection of customer information and platform infrastructure.'],
  },
  {
    heading: '6. DOCUMENT ACCESS & PRINT SHOP PRIVACY',
    paragraphs: [
      'When a customer selects a print shop, the relevant order and uploaded documents are made available to the designated shopkeeper for printing purposes.',
      'The selected shopkeeper may access only the information necessary to fulfil the printing request, subject to applicable access controls.',
      'Partner print shops are expected to:',
    ],
    bullets: [
      'Access documents only for legitimate order processing.',
      'Avoid unauthorized copying or distribution.',
      'Maintain the confidentiality of customer documents.',
      'Not use customer documents for personal or commercial purposes.',
      'Not share customer information with unauthorized individuals.',
      'Handle printed documents responsibly.',
    ],
    closingParagraphs: ['HR-SAC TECH does not authorize partner print shops to use customer documents for advertising, unrelated business activities, or unauthorized distribution.'],
  },
  {
    heading: '7. PURPOSE OF DATA PROCESSING',
    paragraphs: [
      'Information collected through printOn24 may be processed for the following purposes:',
      'We process personal data only for lawful purposes and in accordance with applicable legal requirements.',
    ],
    orderedItems: [
      'Creating and managing user accounts.',
      'Processing document uploads.',
      'Managing printing orders.',
      'Connecting users with selected print shops.',
      'Generating Order IDs and pickup tokens.',
      'Processing online payments and refunds.',
      'Maintaining order history and transaction records.',
      'Providing customer support.',
      'Preventing fraud and unauthorized activities.',
      'Improving platform performance and user experience.',
      'Maintaining platform security.',
      'Complying with applicable legal and regulatory requirements.',
    ],
  },
  {
    heading: '8. DATA RETENTION & DELETION POLICY',
    groups: [
      { heading: 'Uploaded Documents', description: 'Retained for a maximum operational period of 12 hours, subject to earlier deletion where applicable.' },
      { heading: 'Order Information', description: 'Order IDs, timestamps, page counts, printing configurations, and order statuses may be retained for operational and historical purposes.' },
      { heading: 'Payment Information', description: 'Transaction references and payment-related records may be retained for accounting, reconciliation, taxation, and legal compliance.' },
      { heading: 'Account Information', description: 'Retained while an account remains active or as required for legitimate operational and legal purposes.' },
      { heading: 'Technical Logs', description: 'Retained for a limited period depending on security and operational requirements.' },
    ],
    paragraphs: [
      'printOn24 follows a data-minimization approach.',
      'Different categories of information may have different retention periods.',
      'When personal data is no longer required, it will be erased or anonymized in accordance with applicable law, subject to legally permitted retention requirements.',
    ],
  },
  {
    heading: '9. THIRD-PARTY SERVICE PROVIDERS',
    paragraphs: [
      'To operate printOn24, HR-SAC TECH may use trusted third-party service providers, including:',
    ],
    bullets: [
      'Cloud hosting providers.',
      'Database infrastructure providers.',
      'Payment gateways.',
      'Authentication service providers.',
      'Email and notification services.',
      'Security and monitoring services.',
      'Technical infrastructure providers.',
    ],
    closingParagraphs: [
      'These providers may process limited information necessary to deliver their services.',
      'We take reasonable steps to ensure that such providers maintain appropriate security and data protection practices.',
    ],
  },
  {
    heading: '10. USER RIGHTS & DATA PROTECTION',
    paragraphs: ['Subject to applicable laws, users may have the following rights:'],
    bullets: [
      'Right to access information about personal data being processed.',
      'Right to request correction of inaccurate or incomplete personal information.',
      'Right to request erasure of personal data, where legally permissible.',
      'Right to withdraw consent where processing is based on consent.',
      'Right to raise privacy-related grievances.',
      'Right to nominate another individual in accordance with applicable provisions of the DPDP Act.',
    ],
    closingParagraphs: [
      'Users may submit privacy-related requests through the official contact details provided in this policy.',
      'Certain information may need to be retained to fulfil legal, taxation, accounting, or regulatory obligations.',
    ],
  },
  {
    heading: '11. COOKIES & SESSION MANAGEMENT',
    paragraphs: ['The printOn24 website and application may use cookies, session identifiers, and similar technologies to:'],
    bullets: [
      'Maintain login sessions.',
      'Remember user preferences.',
      'Improve website navigation.',
      'Maintain platform security.',
      'Understand technical performance.',
      'Improve user experience.',
    ],
    closingParagraphs: [
      'Users may manage cookie preferences through available browser settings or platform controls.',
      'Disabling certain cookies may affect some platform functionalities.',
    ],
  },
  {
    heading: '12. ACCOUNT SECURITY & USER RESPONSIBILITIES',
    paragraphs: ['Users are responsible for maintaining the confidentiality of their login credentials.', 'Users should:'],
    bullets: [
      'Never share passwords or OTPs.',
      'Avoid logging in through untrusted devices.',
      'Log out after using shared devices.',
      'Verify the selected print shop before submitting documents.',
      'Upload only documents they are authorized to share.',
      'Immediately report suspected unauthorized account access.',
    ],
    closingParagraphs: ["HR-SAC TECH will never intentionally request a user's UPI PIN, ATM PIN, or banking password."],
  },
  {
    heading: '13. DATA BREACH & SECURITY INCIDENT RESPONSE',
    paragraphs: [
      'In the event of a personal data breach or security incident, HR-SAC TECH will take appropriate steps to investigate, contain, and mitigate the incident.',
      'Where required under applicable law, affected individuals and relevant authorities will be notified in accordance with prescribed procedures and timelines.',
      'We will also take reasonable steps to prevent similar incidents in the future.',
    ],
  },
  {
    heading: "14. CHILDREN'S PRIVACY",
    paragraphs: [
      'printOn24 may be used by students and individuals of different age groups.',
      'Where personal data of children is processed, HR-SAC TECH will follow applicable requirements under the DPDP Act and relevant rules, including applicable parental or lawful guardian consent requirements.',
      "We do not knowingly permit unlawful processing of children's personal data.",
    ],
  },
  {
    heading: '15. INTERNATIONAL DATA PROCESSING',
    paragraphs: [
      'Certain third-party infrastructure or service providers may process or store information outside India.',
      'Where applicable, such processing will be conducted in accordance with Indian data protection requirements and restrictions imposed by relevant authorities.',
    ],
  },
  {
    heading: '16. ADVERTISING & PROMOTIONAL PRIVACY',
    paragraphs: ['printOn24 may display advertisements, promotional banners, partner offers, and business announcements within the platform.'],
    bullets: [
      'Advertisements may be managed by HR-SAC TECH or authorized advertising partners.',
      'Customer documents and document contents are not provided to advertisers for promotional purposes.',
      'Personal information will not be shared with advertisers for direct marketing without an appropriate legal basis and consent wherever required.',
      'Promotional communications will comply with applicable data protection requirements.',
    ],
  },
  {
    heading: '17. DATA SHARING & DISCLOSURE',
    paragraphs: ['HR-SAC TECH does not disclose personal information to unrelated third parties for commercial purposes.', 'Information may be shared only where reasonably necessary:'],
    bullets: [
      'With the selected print shop to fulfil a printing order.',
      'With payment providers to process transactions.',
      'With infrastructure providers to operate the platform.',
      'With authorized service providers for technical support.',
      'With government authorities or law enforcement agencies when legally required.',
      'To protect the rights, security, and legitimate interests of users and HR-SAC TECH.',
    ],
    closingParagraphs: ['Any such sharing will be subject to applicable legal requirements and appropriate safeguards.'],
  },
  {
    heading: '18. ACCOUNT DEACTIVATION & DATA ERASURE REQUESTS',
    paragraphs: [
      'Users may request account deactivation or deletion through the official support channel.',
      'Upon receiving a valid request, HR-SAC TECH will review and process it in accordance with applicable laws.',
      'Personal data that is no longer necessary will be erased, subject to applicable legal retention requirements.',
      'Certain transaction and accounting records may be retained where legally required.',
    ],
  },
  {
    heading: '19. GRIEVANCE REDRESSAL & PRIVACY CONTACT',
    paragraphs: ['For questions, complaints, or requests regarding this Privacy Policy, users may contact HR-SAC TECH through the following official communication details.'],
    groups: [
      { heading: 'Platform', description: 'printOn24' },
      { heading: 'Developed, Owned & Operated By', description: 'High Resolution Software and Coding (HR-SAC TECH)' },
      { heading: 'Official Email', description: 'info@hrsactech.in' },
      { heading: 'Office Address', description: '205, Office, Katrang, Khopoli – 410203, District Raigad, Maharashtra, India.' },
    ],
    bullets: [
      'Privacy-related complaints.',
      'Personal data correction requests.',
      'Data erasure requests.',
      'Unauthorized document access.',
      'Account security concerns.',
      'Data protection and processing queries.',
    ],
    closingParagraphs: ['HR-SAC TECH will take appropriate steps to address grievances within the timelines prescribed under applicable laws.'],
  },
  {
    heading: '20. POLICY UPDATES & MODIFICATIONS',
    paragraphs: [
      'HR-SAC TECH reserves the right to update or modify this Privacy Policy to reflect changes in platform functionality, technology, security practices, business operations, or applicable legal requirements.',
      'Updated versions will be published on the official printOn24 website along with the revised effective date.',
      'Users are encouraged to review this policy periodically.',
    ],
  },
  {
    heading: '21. GOVERNING LAW & JURISDICTION',
    paragraphs: [
      'This Privacy Policy shall be governed by and interpreted in accordance with the applicable laws of India, including the Digital Personal Data Protection Act, 2023, and applicable rules and regulations.',
      'Any disputes arising in connection with this Privacy Policy shall be subject to the jurisdiction of competent courts in India.',
    ],
  },
];

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBackToHome }) => {
  useEffect(() => {
    document.title = 'Privacy Policy | printOn24';
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    robots.content = 'noindex, follow, noarchive';
  }, []);
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem('printon24_privacy_accepted') === 'true';
  });

  const handleAcceptanceChange = (next: boolean) => {
    if (next === accepted) return;

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
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#FF1300] bg-slate-50 hover:bg-red-50 border border-slate-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <article className="bg-white pt-6 space-y-5 leading-relaxed text-xs text-slate-700">
        <header className="space-y-2">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">printOn24</h1>
          <h2 className="text-sm md:text-base font-bold text-slate-800">Platform Privacy Policy &amp; Data Protection</h2>
          <p className="text-slate-600">
            <strong className="text-slate-900">printOn24</strong> is a digital printing platform developed, owned, and operated by{' '}
            <strong className="text-slate-900">High Resolution Software and Coding (HR-SAC TECH)</strong> (“HR-SAC TECH”, “we”, “our” or “us”).
          </p>
          <p className="text-slate-600">
            HR-SAC TECH respects the privacy of its users and is committed to protecting personal information and uploaded documents in accordance with applicable data protection laws of India, including the Digital Personal Data Protection Act, 2023, and applicable rules and regulations.
          </p>
          <p className="text-slate-600">
            This Privacy Policy explains how printOn24 collects, processes, stores, uses, shares, protects, and deletes personal information and documents uploaded through its web application, partner print shops, and supported digital services.
          </p>
          <p className="text-slate-600">By accessing or using printOn24, users acknowledge that they have read and understood this Privacy Policy.</p>
        </header>

        {policySections.map((section) => (
          <section key={section.heading} className="space-y-2 pt-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">{section.heading}</h3>
            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className="text-slate-600">{paragraph}</p>
            ))}
            {section.groups?.map((group) => (
              <div key={group.heading} className="space-y-1">
                <h4 className="font-bold text-slate-900">{group.heading}</h4>
                {group.description && <p className="text-slate-600">{group.description}</p>}
                {group.items && (
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    {group.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                {section.bullets.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {section.orderedItems && (
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                {section.orderedItems.map((item) => <li key={item}>{item}</li>)}
              </ol>
            )}
            {section.closingParagraphs?.map((paragraph, index) => (
              <p key={index} className="text-slate-600">{paragraph}</p>
            ))}
          </section>
        ))}

        <section className="space-y-2 pt-2">
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">Platform information</h3>
          <p><strong className="text-slate-900">Platform:</strong> printOn24</p>
          <p><strong className="text-slate-900">Developed &amp; Operated By:</strong> High Resolution Software and Coding (HR-SAC TECH)</p>
          <p>
            <strong className="text-slate-900">Official Email:</strong>{' '}
            <a className="text-[#FF1300] underline" href="mailto:info@hrsactech.in">info@hrsactech.in</a>
          </p>
          <p><strong className="text-slate-900">Last Updated:</strong> 01 November 2026</p>
          <p>© High Resolution Software and Coding (HR-SAC TECH). All Rights Reserved.</p>
          <p className="italic">Your Documents. Your Privacy. Our Responsibility.</p>
        </section>

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
              id="privacy_agree_checkbox"
              checked={accepted}
              onChange={event => handleAcceptanceChange(event.target.checked)}
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
              onClick={() => handleAcceptanceChange(true)}
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
      </article>
    </div>
  );
};
