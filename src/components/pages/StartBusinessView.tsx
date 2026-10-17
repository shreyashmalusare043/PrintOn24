import React, { useState } from 'react';
import {
  Store,
  Building2,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Clock,
  Printer,
  FileCheck,
  Sparkles,
  ArrowRight,
  Send,
  MapPin,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { toast } from 'sonner';

interface StartBusinessViewProps {
  onBackToHome: () => void;
}

export const StartBusinessView: React.FC<StartBusinessViewProps> = ({ onBackToHome }) => {
  const { partnerRegistrations, submitPartnerRegistration } = usePrintPerfect();

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [pincode, setPincode] = useState('');
  const [operatingHours, setOperatingHours] = useState('8:00 AM - 9:00 PM');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'High-Speed Laser B&W',
    'Color Production Printer'
  ]);
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Document Printing',
    'Spiral Binding'
  ]);

  const equipmentOptions = [
    'High-Speed Laser B&W (Canon/HP)',
    'Color Production Printer (Konica/Xerox)',
    'Spiral & Wire-O Binding Machine',
    'Thermal Roll Laminator',
    'Heavy-Duty Paper Cutter (A3/A4)',
    'Photo Studio Dye-Sublimation Printer'
  ];

  const serviceOptions = [
    'Document Printing',
    'Colour Xerox',
    'Spiral Binding',
    'Hardcover Golden Project Binding',
    'Marksheet Thermal Lamination',
    'High-Res Photo Printing',
    'Architectural CAD Plotting (A0/A1)'
  ];

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const toggleService = (srv: string) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !address.trim()) {
      toast.error('Please fill in all mandatory shop & contact details.');
      return;
    }

    submitPartnerRegistration({
      shopName,
      ownerName,
      email: email || 'shopowner@partner.copygo.com',
      phone,
      address,
      city,
      pincode: pincode || '411037',
      operatingHours,
      equipment: selectedEquipment,
      servicesOffered: selectedServices
    });

    // Reset form
    setShopName('');
    setOwnerName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setPincode('');
  };

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6 max-w-5xl mx-auto select-none">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-500 via-[#FF1300] to-rose-600 p-6 md:p-10 text-white relative overflow-hidden shadow-lg shadow-red-500/20">
        <div className="max-w-2xl space-y-3 z-10 relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold font-heading uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            printOn24 Partner Network
          </span>
          <h1 className="text-2xl md:text-4xl font-black font-heading leading-tight tracking-tight">
            Transform Your Print Shop with printOn24 Smart Cloud
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed font-normal">
            Eliminate long student lines, accept pre-paid cloud prints directly to your printer, and boost your daily revenue with guaranteed campus demand.
          </p>
        </div>
      </div>

      {/* Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 font-heading">
            3x Daily Print Volume
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Receive automated orders from thousands of students without manual WhatsApp file transfers or pendrives.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 font-heading">
            Zero Customer Waiting
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Students submit, configure, and pay before arriving. You just print and hand over the ready envelope.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 font-heading">
            Instant UPI Settlements
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Daily automated bank deposits straight to your account with zero platform deduction for the first 3 months.
          </p>
        </div>
      </div>

      {/* Onboarding Form & Recent Submissions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Full Shopkeeper Registration Form */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
              <Store className="w-5 h-5 text-[#FF1300]" />
              <span>Partner Shop Registration Form</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Complete your print business information to receive your official printOn24 Counter Standee & Terminal ID.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. Omkar Xerox & Digital Printing"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] focus:ring-1 focus:ring-red-100 outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Shop Owner / Manager Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] focus:ring-1 focus:ring-red-100 outline-none text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Primary Mobile Number (for OTP & Orders) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98230 XXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] focus:ring-1 focus:ring-red-100 outline-none font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@omkarxerox.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] focus:ring-1 focus:ring-red-100 outline-none text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Full Physical Address *
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Shop No. 4, College Main Road, Opposite Hostel Gate No. 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] focus:ring-1 focus:ring-red-100 outline-none text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Pune"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  placeholder="411037"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={e => setOperatingHours(e.target.value)}
                  placeholder="8:00 AM - 9:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
                />
              </div>
            </div>

            {/* Equipment Checklist */}
            <div className="pt-2">
              <label className="font-bold text-slate-800 block mb-1.5 font-heading">
                Equipment Available in Shop
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {equipmentOptions.map(eq => {
                  const checked = selectedEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquipment(eq)}
                      className={`p-2.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                        checked
                          ? 'border-red-200 bg-red-50/60 text-[#FF1300] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] truncate">{eq}</span>
                      {checked && <CheckCircle2 className="w-4 h-4 text-[#FF1300] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Services Checklist */}
            <div className="pt-2">
              <label className="font-bold text-slate-800 block mb-1.5 font-heading">
                Services You Want to Offer on printOn24
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serviceOptions.map(srv => {
                  const checked = selectedServices.includes(srv);
                  return (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => toggleService(srv)}
                      className={`p-2.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                        checked
                          ? 'border-red-200 bg-red-50/60 text-[#FF1300] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] truncate">{srv}</span>
                      {checked && <CheckCircle2 className="w-4 h-4 text-[#FF1300] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold flex items-center gap-2 shadow-md shadow-red-500/25 transition-transform font-heading"
              >
                <Send className="w-4 h-4" />
                <span>Submit Application to Database</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Cols: Live Submissions & Partner Support */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#FF1300]" />
              <span>Registered Applications ({partnerRegistrations.length})</span>
            </h3>

            {partnerRegistrations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No applications submitted in this session yet. Submit the form to link your shop!
              </p>
            ) : (
              <div className="space-y-2.5">
                {partnerRegistrations.map(reg => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 truncate font-heading">
                        {reg.shopName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {reg.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">{reg.id}</p>
                    <p className="text-[10px] text-slate-400">Owner: {reg.ownerName} • {reg.phone}</p>
                    <p className="text-[10px] text-slate-400">Applied: {reg.submittedAt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Partner Help Desk Card */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 font-heading">
              Need immediate onboarding help?
            </h4>
            <p className="text-slate-500 text-[11px]">
              Our campus merchant representative will visit your shop with hardware setup.
            </p>
            <div className="pt-1 text-[#FF1300] font-bold font-mono">
              📞 +91 98220 99881 (Partner Desk)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
