import React, { useState } from 'react';
import {
  X,
  Info,
  ShieldCheck,
  FileText,
  Settings,
  Briefcase,
  Megaphone,
  Mail,
  Send,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { toast } from 'sonner';

interface DrawerContentModalProps {
  sectionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DrawerContentModal: React.FC<DrawerContentModalProps> = ({
  sectionId,
  isOpen,
  onClose
}) => {
  const { submitFeedback, submitAdRequest, requireAuth } = usePrintPerfect();

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState<'Feedback' | 'Suggestion' | 'Bug Report'>('Feedback');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Ad request form state
  const [adBusinessName, setAdBusinessName] = useState('');
  const [adTargetCategory, setAdTargetCategory] = useState('College Students');
  const [adBudget, setAdBudget] = useState('₹5,000 / month');

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    requireAuth(() => {
      submitFeedback(feedbackCategory, `${feedbackCategory} Submission`, feedbackMessage, 5);
      setFeedbackMessage('');
      onClose();
    }, 'Sign In to Submit Feedback', 'Please log in to submit your feedback.');
  };

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adBusinessName.trim()) return;

    requireAuth(() => {
      submitAdRequest({
        businessName: adBusinessName,
        contactPerson: 'Manager',
        phone: '9876543210',
        email: 'ads@business.com',
        campaignGoal: adTargetCategory,
        budgetRange: adBudget
      });
      setAdBusinessName('');
      onClose();
    }, 'Sign In to Request Advertisement', 'Please log in to request advertising.');
  };

  const renderContent = () => {
    switch (sectionId) {
      case 'about':
        return (
          <div className="p-5 space-y-4 text-xs leading-relaxed text-slate-600">
            <div className="text-center pb-2">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#FF1300] flex items-center justify-center mx-auto mb-2 font-black text-xl">
                p
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Print · Scan · Grow</h3>
              <p className="text-slate-400 text-[11px]">printOn24 Network v2.4.0</p>
            </div>
            <p>
              printOn24 is India’s foremost campus & hyper-local digital printing ecosystem. We connect university students, researchers, coaching centers, and working professionals with 2,000+ local Xerox and industrial printing hubs.
            </p>
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs">Our Core Missions:</h4>
              <p>• Eliminate physical USB flash drives and pen-drive virus infections.</p>
              <p>• Zero waiting queues: upload securely from home or class, pick up immediately.</p>
              <p>• Transparent per-side rates and verified shop memberships.</p>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="p-5 space-y-3 text-xs leading-relaxed text-slate-600">
            <h3 className="font-bold text-slate-900 text-sm">Data & Document Protection Policy</h3>
            <p>
              Your academic records, project theses, government identification proofs, and personal documents are sacred.
            </p>
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-800">1. Automatic Ephemeral Shredding</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Uploaded files are kept in encrypted temporary storage and automatically deleted 3 hours after successful token collection.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-800">2. TLS 1.3 Bank-Grade Encryption</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Direct spool to hardware printer via secure terminal authentication. Zero shopkeeper snooping.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-800">3. Razorpay PCI-DSS Compliance</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  We never store card numbers, CVVs, or UPI PINs.
                </p>
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="p-5 space-y-3 text-xs leading-relaxed text-slate-600">
            <h3 className="font-bold text-slate-900 text-sm">Terms & Printing Conditions</h3>
            <p>1. Orders placed via Pay on Counter must be collected within 24 hours of printing.</p>
            <p>2. Razorpay transactions are covered under printOn24 Instant Refund in case of paper jam or machine malfunction confirmed by the partner shop.</p>
            <p>3. Users are strictly prohibited from submitting counterfeit currency reproductions or copyrighted commercial textbooks without institutional authorization.</p>
          </div>
        );

      case 'settings':
        return (
          <div className="p-5 space-y-4 text-xs text-slate-700">
            <h3 className="font-bold text-slate-900 text-sm">System Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-bold">Sound & Haptic Feedback</p>
                  <p className="text-[10px] text-slate-400">Vibrate on print queue completion</p>
                </div>
                <input type="checkbox" defaultChecked className="toggle-checkbox w-4 h-4 text-blue-600 rounded" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-bold">Order Receipt Auto-Download</p>
                  <p className="text-[10px] text-slate-400">Save PDF copy upon payment</p>
                </div>
                <input type="checkbox" defaultChecked className="toggle-checkbox w-4 h-4 text-blue-600 rounded" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-bold">Low Ink / Stock Warnings</p>
                  <p className="text-[10px] text-slate-400">Warn before submitting to busy machines</p>
                </div>
                <input type="checkbox" defaultChecked className="toggle-checkbox w-4 h-4 text-blue-600 rounded" />
              </div>
            </div>
          </div>
        );

      case 'careers':
        return (
          <div className="p-5 space-y-3 text-xs text-slate-600">
            <h3 className="font-bold text-slate-900 text-sm font-heading">Careers at printOn24</h3>
            <p>We are expanding to campus kiosks across Pune and Maharashtra. Active openings:</p>
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#FF1300] font-bold text-[10px] font-heading">MARKETING</span>
                <p className="font-bold text-slate-900 text-xs mt-1">Campus Brand Ambassador / Growth Lead</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pune Campuses • Part-time / Internship (0-1 Years)</p>
              </div>
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#FF1300] font-bold text-[10px] font-heading">OPERATIONS</span>
                <p className="font-bold text-slate-900 text-xs mt-1">Print Operations & QA Lead</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pune, Maharashtra • Full-time (1-3 Years)</p>
              </div>
              <div className="p-3 rounded-2xl border border-slate-200 bg-white">
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#FF1300] font-bold text-[10px] font-heading">ENGINEERING</span>
                <p className="font-bold text-slate-900 text-xs mt-1">Full Stack React & Node.js Developer</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pune / Hybrid • Full-time (1-3 Years)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              className="w-full py-2.5 rounded-full bg-[#FF1300] text-white font-bold text-xs shadow-md mt-2 font-heading active:scale-95 transition-transform"
            >
              View All Openings & Apply
            </button>
          </div>
        );

      case 'feedback-ads':
        return (
          <div className="p-5 space-y-4 text-xs">
            {/* Feedback Tab */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-[#0066FF]" />
                <span>Submit Feedback or Report Bug</span>
              </h3>
              <form onSubmit={handleFeedbackSubmit} className="space-y-2">
                <div className="flex gap-2">
                  {(['Feedback', 'Suggestion', 'Bug Report'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFeedbackCategory(cat)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                        feedbackCategory === cat
                          ? 'bg-[#0066FF] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={2}
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  placeholder="Tell us what you'd love to improve..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#0066FF] text-white font-bold text-xs"
                >
                  Send Feedback
                </button>
              </form>
            </div>

            {/* Ad Banner Request */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Advertise on Student Carousel</h3>
              <p className="text-slate-500 text-[11px]">
                Promote educational courses, hackathons, or PG accommodations to 10,000+ daily printing students.
              </p>
              <form onSubmit={handleAdSubmit} className="space-y-2">
                <input
                  type="text"
                  required
                  value={adBusinessName}
                  onChange={e => setAdBusinessName(e.target.value)}
                  placeholder="Your Brand / Institution Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Request Ad Placement
                </button>
              </form>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="p-5 space-y-4 text-xs text-slate-600">
            <h3 className="font-bold text-slate-900 text-sm">24/7 Helpline & Support</h3>
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-900">Toll-Free Phone</p>
                  <p className="text-[11px] text-slate-500 font-mono">1800-PRINTON24 (1800-774-6824)</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#FF1300]" />
                <div>
                  <p className="font-bold text-slate-900">Email Support</p>
                  <p className="text-[11px] text-slate-500">support@printon24.in</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-rose-600" />
                <div>
                  <p className="font-bold text-slate-900">HQ Office</p>
                  <p className="text-[11px] text-slate-500">Tech Park Campus, Shivaji Nagar, Pune, MH - 411005</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (sectionId) {
      case 'about': return 'About Us';
      case 'privacy': return 'Privacy Policy';
      case 'terms': return 'Terms & Conditions';
      case 'settings': return 'Settings & Preferences';
      case 'careers': return 'Career Options';
      case 'feedback-ads': return 'Feedback & Ad Requests';
      case 'contact': return 'Contact Us';
      default: return 'Information';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden bg-white rounded-3xl">
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-bold text-slate-900 text-left">
            {getTitle()}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
