import React, { useState } from 'react';
import { Megaphone, Users, Target, Send, CheckCircle2 } from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { toast } from 'sonner';

interface RequestAdsViewProps {
  onBackToHome: () => void;
}

export const RequestAdsView: React.FC<RequestAdsViewProps> = ({ onBackToHome }) => {
  const { submitAdRequest, requireAuth } = usePrintPerfect();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [targetAudience, setTargetAudience] = useState('Engineering & Tech Students');
  const [placement, setPlacement] = useState<'Home Banner' | 'Print Receipt Sponsor' | 'Sidebar Carousel'>('Home Banner');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !phone) {
      toast.error('Please enter company and contact details.');
      return;
    }

    requireAuth(() => {
      submitAdRequest({
        businessName: companyName,
        contactPerson,
        email,
        phone,
        campaignGoal: `Placement: ${placement}, Audience: ${targetAudience}. Notes: ${notes}`,
        budgetRange: `${durationWeeks} Weeks Campaign`
      });

      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setNotes('');
    }, 'Sign In to Request Advertisement', 'Please log in to submit your advertising request. Your entered campaign details are saved.');
  };

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-20 select-none">
      <div className="rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 p-8 text-white relative overflow-hidden shadow-lg shadow-red-500/15">
        <div className="max-w-xl space-y-2 z-10 relative">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider font-heading">
            Campus Ad Network
          </span>
          <h1 className="text-2xl md:text-3xl font-black font-heading leading-tight">{"Reach 40,000+ Verified Peoples Every Single Day"}</h1>
          <p className="text-xs md:text-sm text-white/90 font-normal">{"Promote hackathons, tech certifications, Peoples discounts, and job openings right inside the print app and on physical paper receipt footers."}</p>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#FF1300]" />
          <span>Advertise with printOn24</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Company / Brand Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. EdTech Pro Academy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Person Name</label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="Rohan Kulkarni"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Work Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="partnerships@brand.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98234 XXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ad Placement Slot</label>
              <select
                value={placement}
                onChange={e => setPlacement(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="Home Banner">Home Dashboard Top Promo Carousel</option>
                <option value="Print Receipt Sponsor">Bottom Footer Sponsor on Printed Receipts</option>
                <option value="Sidebar Carousel">Left Navigation Sponsored Card</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Campaign Duration (Weeks)</label>
              <input
                type="number"
                min={1}
                max={12}
                value={durationWeeks}
                onChange={e => setDurationWeeks(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Campaign Objectives & Details</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tell us about your offer or promotion goals..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold flex items-center justify-center gap-2 shadow-sm font-heading"
          >
            <Send className="w-4 h-4" />
            <span>Submit Campaign Request</span>
          </button>
        </form>
      </div>
    </div>
  );
};
