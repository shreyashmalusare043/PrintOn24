import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, HelpCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { submitContactMessage } from '../../services/api';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';

interface ContactUsViewProps {
  onBackToHome: () => void;
}

export const ContactUsView: React.FC<ContactUsViewProps> = ({ onBackToHome }) => {
  const { requireAuth } = usePrintPerfect();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in required fields');
      return;
    }

    requireAuth(async () => {
      setIsSubmitting(true);
      const success = await submitContactMessage({
        name,
        email,
        phone,
        subject: subject || 'Campus Support Inquiry',
        message
      });
      setIsSubmitting(false);

      if (success) {
        toast.success('Your message has been sent to our campus desk! We will reply within 2 hours.');
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      } else {
        toast.error('Failed to send message. Please try again or call our helpline.');
      }
    }, 'Sign In to Contact Support', 'Please log in to submit your support message. Your message text is preserved.');
  };
  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-20 select-none">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">{"Contact printOn24 Support"}</h1>
        <p className="text-xs text-slate-500 mt-1">
          We are available 7 days a week to support students and print shop partners
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <Phone className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Call Support</h3>
          <p className="text-slate-500">{"Helpline"}</p>
          <p className="font-bold text-slate-900 font-mono">{"+91 9284289782"}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <Mail className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Email Inquiries</h3>
          <p className="text-slate-500">{"Official Desk"}</p>
          <p className="font-bold text-slate-900">{"info@hrsactech.in"}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2 text-xs">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#FF1300] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Operating Hours</h3>
          <p className="text-slate-500">{"Open during hours"}</p>
          <p className="font-bold text-slate-900">{"8:00 AM – 5:30 PM (Mon-Fri)"}</p>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#FF1300]" />
          <span>Send Us a Direct Message</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Shreyash Malusare"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@student.college.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Print shop pairing or payment query"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Message *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe what you need help with..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-full bg-[#FF1300] hover:bg-[#E01100] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#FF1300]" />
          <span>{"Headquarters"}</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{"printOn24 HR-SAC office 205, Katrang, Khopoli, Maharashtra 410203"}</p>
      </div>
    </div>
  );
};
