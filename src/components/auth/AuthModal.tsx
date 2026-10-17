import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { toast } from 'sonner';
import { validatePasswordRules } from '../../lib/authSecurity';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title = 'Sign In to Continue',
  subtitle = 'Please log in or register to access your account and saved prints.',
  onSuccess
}) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = usePrintPerfect();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const res = await loginWithEmail(email.trim(), password);
    setLoading(false);

    if (res.success) {
      toast.success('Successfully logged in!');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast.error('All fields are mandatory. Please fill in Full Name, Email, Mobile No., and Password.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      toast.error('Mobile number must be a valid 10-digit number (digits only, e.g. 9823456789).');
      return;
    }

    const val = validatePasswordRules(password);
    if (!val.isValid) {
      toast.error(val.error || 'Password does not meet security requirements.');
      return;
    }

    if (!agreeTerms) {
      toast.error('Please agree to the printOn24 Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    const res = await registerWithEmail(name.trim(), email.trim(), password, trimmedPhone);
    setLoading(false);

    if (res.success) {
      toast.success('Account created successfully!');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.success) {
      toast.success('Signed in with Google!');
      onClose();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || 'Google sign-in could not be completed.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
        {/* Top Header with Brand Logo */}
        <div className="bg-gradient-to-r from-[#D00812] to-[#FF1300] p-6 text-white text-center relative">
          <div className="flex justify-center mb-2.5">
            <img
              src="https://miaoda-edit-image.s3cdn.medo.dev/epyrkfdiozk1/IMG-ewtql3b6vf28.png"
              alt="printOn24"
              className="h-9 w-auto object-contain brightness-0 invert drop-shadow-sm"
            />
          </div>
          <DialogTitle className="text-lg font-black font-heading tracking-tight text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/90 mt-1 max-w-sm mx-auto">
            {subtitle}
          </DialogDescription>
        </div>

        {/* Tab Buttons (Sign In | Create Account | Guest) */}
        <div className="p-6 pt-4 space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign In Option */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-xs font-bold text-slate-700 shadow-xs transition-all"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-medium text-slate-400">or with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-[0.99] text-white font-bold shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rahul Patil"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile No. *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="98234 56789"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Create Password</label>
                  <span className="text-[10px] text-slate-400 font-medium">Symbols: @ or # only</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="e.g. Student@2024"
                    className="w-full pl-9 pr-10 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF1300] bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Criteria Checklist / Suggestions */}
                {password.length > 0 && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                    <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
                      Password Requirements:
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                      <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        {password.length >= 8 ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[a-zA-Z]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        {/[a-zA-Z]/.test(password) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Letters (a-z, A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        {/[0-9]/.test(password) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Numbers (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${/[@#]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        {/[@#]/.test(password) ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-0.5" />}
                        <span>Symbol (@ or #)</span>
                      </div>
                    </div>
                    {/(.)\1{3,}/.test(password) && (
                      <p className="text-[10px] text-amber-600 font-medium pt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Avoid repeated characters like "000000"
                      </p>
                    )}
                    {/(0123|1234|2345|3456|4567|5678|6789|7890|9876|8765)/.test(password) && (
                      <p className="text-[10px] text-amber-600 font-medium pt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Avoid sequential digits like "12345678"
                      </p>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#FF1300] focus:ring-[#FF1300]"
                />
                <span className="text-[11px] text-slate-500">
                  I agree to the <span className="text-[#FF1300] font-semibold">printOn24 Terms</span> and Privacy Policy.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#FF1300] hover:bg-[#E01100] active:scale-[0.99] text-white font-bold shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-1">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Basic printing & scanning never require login</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
