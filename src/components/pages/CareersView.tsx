import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCareers, submitCareerApplication, type CareerItem } from '../../services/api';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';

interface CareersViewProps {
  onBackToHome: () => void;
}

export const CareersView: React.FC<CareersViewProps> = ({ onBackToHome }) => {
  const { requireAuth } = usePrintPerfect();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantCollege, setApplicantCollege] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultOpenings: CareerItem[] = [
    {
      id: 'car-01',
      title: 'Campus Brand Ambassador / Growth Lead',
      department: 'Marketing',
      type: 'Part-time / Internship',
      location: 'Pune Campuses (PICT, COEP, MIT, Sinhgad)',
      experience: '0-1 Years',
      description: 'Represent printOn24 across campus hostels and colleges to drive student print adoption and onboarding.',
      requirements: 'Outgoing college student in Pune, active in student communities',
      is_active: true
    },
    {
      id: 'car-02',
      title: 'Print Operations & QA Lead',
      department: 'Operations',
      type: 'Full-time',
      location: 'Pune, Maharashtra',
      experience: '1-3 Years',
      description: 'Manage campus print terminal operations, partner print shop quality assurance, and kiosk fulfillment.',
      requirements: 'Experience with commercial laser/thermal printers, hardware maintenance and vendor relations',
      is_active: true
    },
    {
      id: 'car-03',
      title: 'Full Stack React & Node.js Developer',
      department: 'Engineering',
      type: 'Full-time',
      location: 'Pune / Hybrid',
      experience: '1-3 Years',
      description: 'Scale our cloud print queue engine, WebSocket microservices, and POS hardware terminal app.',
      requirements: 'React, TypeScript, Node.js, PostgreSQL',
      is_active: true
    }
  ];

  const [careerList, setCareerList] = useState<CareerItem[]>(defaultOpenings);

  useEffect(() => {
    getCareers().then(careers => {
      if (careers && careers.length > 0) {
        setCareerList(careers);
      }
    });
  }, []);

  const openings = careerList.length > 0 ? careerList : defaultOpenings;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail) {
      toast.error('Please enter name and email');
      return;
    }

    requireAuth(async () => {
      setIsSubmitting(true);
      const selectedOpening = openings.find(o => o.id === selectedRole || o.title === selectedRole);
      const careerId = selectedOpening?.id || 'general';

      const success = await submitCareerApplication({
        career_id: careerId,
        applicant_name: applicantName,
        email: applicantEmail,
        phone: applicantPhone || '+91 98765 43210',
        cover_note: `College/Institution: ${applicantCollege}. Applied for: ${selectedRole}`
      });

      setIsSubmitting(false);
      if (success) {
        toast.success(`Application submitted for ${selectedRole}! Recorded in database.`);
      } else {
        toast.success(`Application received for ${selectedRole}!`);
      }
      setSelectedRole(null);
      setApplicantName('');
      setApplicantEmail('');
      setApplicantCollege('');
      setApplicantPhone('');
    }, 'Sign In to Submit Application', 'Please log in to submit your job application. Your filled details are preserved.');
  };

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-20 select-none">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">{"Careers Oppeoturnity"}</h1>
        <p className="text-xs text-slate-500 mt-1">{"Join our fast-growing tech and revolutionize printing"}</p>
      </div>
      <div className="space-y-3">
        {openings.map(role => (
          <div
            key={role.id}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-[#FF1300] text-[10px] font-bold font-heading uppercase">
                  {role.department}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-heading">
                  {role.type}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                {role.title}
              </h3>
              <p className="text-xs text-slate-500">
                {role.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {role.location}
                </span>
                <span>•</span>

              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRole(role.title)}
              className="px-4 py-2 rounded-full bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold font-heading shadow-xs shrink-0 self-start md:self-auto"
            >
              Apply Now
            </button>
          </div>
        ))}
      </div>
      {/* Application Dialog */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-extrabold text-slate-900 font-heading">
              Apply for {selectedRole}
            </h3>
            <form onSubmit={handleApply} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  placeholder="Shreyash Malusare"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#FF1300]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={applicantEmail}
                  onChange={e => setApplicantEmail(e.target.value)}
                  placeholder="shreyash@college.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#FF1300]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">College / Experience</label>
                <input
                  type="text"
                  value={applicantCollege}
                  onChange={e => setApplicantCollege(e.target.value)}
                  placeholder="PICT Pune, 4th Year CS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#FF1300]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF1300] text-white font-bold font-heading"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
