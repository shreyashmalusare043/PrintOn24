import React, { useState } from 'react';
import { MessageSquare, Star, Send, CheckCircle2 } from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import type { UserFeedback } from '../../types/printperfect';

interface FeedbackViewProps {
  onBackToHome: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ onBackToHome }) => {
  const { submitFeedback, feedbackList, requireAuth } = usePrintPerfect();

  const [category, setCategory] = useState<UserFeedback['category']>('Feedback');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [rating, setRating] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) return;

    requireAuth(() => {
      submitFeedback(category, subject, details, rating);
      setSubject('');
      setDetails('');
    }, 'Sign In to Submit Feedback', 'Please log in to submit student feedback. Your message is saved.');
  };

  return (
    <div className="w-full max-w-full px-2 md:px-6 space-y-6 pb-20 select-none">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">{"Feedback & Suggestions"}</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tell us how we can make your printing experience smoother and faster
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Feedback Form */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Feedback Category</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Feedback', 'Suggestion', 'Bug Report'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      category === cat
                        ? 'bg-[#FF1300] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Spiral binding option at partner shop"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Details & Description *</label>
              <textarea
                required
                rows={4}
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Explain what happened or what feature you'd love to see on printOn24..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#FF1300] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white font-bold flex items-center justify-center gap-2 shadow-sm font-heading"
            >
              <Send className="w-4 h-4" />
              <span>Submit Feedback</span>
            </button>
          </form>
        </div>

        {/* Previous Submissions List */}
        <div className="md:col-span-5 space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 font-heading">
              Your Recorded Feedback ({feedbackList.length})
            </h3>
            {feedbackList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No past feedback yet. Your submissions will be logged here.
              </p>
            ) : (
              <div className="space-y-2">
                {feedbackList.map(fb => (
                  <div key={fb.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{fb.subject}</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                        {fb.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{fb.details}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">{fb.submittedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
