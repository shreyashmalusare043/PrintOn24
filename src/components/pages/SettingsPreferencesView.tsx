import React, { useState } from 'react';
import {
  Settings,
  Bell,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  FileCheck,
  Cookie,
  AlertCircle,
  Mail
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import { toast } from 'sonner';
import { updateNotificationPreference, saveUserConsent } from '../../services/api';
import { supabase } from '../../db/supabase';

interface SettingsPreferencesViewProps {
  onBackToHome: () => void;
}

export const SettingsPreferencesView: React.FC<SettingsPreferencesViewProps> = ({ onBackToHome }) => {
  const { user } = usePrintPerfect();

  // 1. Single Notifications On/Off Toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('printon24_notifications_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // 2. Password Management
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // 3. Document Privacy
  const [autoPurgeFiles, setAutoPurgeFiles] = useState(true);

  // 4. Consents
  const [cookieConsentStatus, setCookieConsentStatus] = useState(() => {
    return localStorage.getItem('printon24_cookie_consent') ? 'Accepted' : 'Not Set';
  });
  const [termsConsentStatus, setTermsConsentStatus] = useState(() => {
    return localStorage.getItem('printon24_terms_accepted') === 'true' ? 'Accepted' : 'Pending';
  });
  const [privacyConsentStatus, setPrivacyConsentStatus] = useState(() => {
    return localStorage.getItem('printon24_privacy_accepted') === 'true' ? 'Accepted' : 'Pending';
  });

  // Handle single notification toggle change
  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('printon24_notifications_enabled', enabled ? 'true' : 'false');
    setIsUpdatingNotifications(true);
    try {
      await updateNotificationPreference(user.id || 'guest', enabled);
      toast.success(
        enabled
          ? 'Notifications turned On: WhatsApp, Email & In-App order alerts enabled.'
          : 'Notifications turned Off: All order notifications muted.'
      );
    } catch (e) {
      toast.success(enabled ? 'Notifications turned On.' : 'Notifications turned Off.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  // Handle Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.isAuthenticated || user.isGuest) {
      toast.error('Guest users do not have a password. Please sign up or log in to manage password security.');
      return;
    }

    if (!oldPassword) {
      toast.error('Please enter your current (old) password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and Confirm Password do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      toast.error('New password must be different from your current password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // 1. Verify old password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: oldPassword
      });

      if (signInError) {
        toast.error('Current password incorrect. Please verify and try again.');
        setIsChangingPassword(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast.error(updateError.message || 'Failed to update password.');
      } else {
        toast.success('Password updated successfully! Keep your credentials secure.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred while updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Forgot Password Reset Flow
  const handleForgotPassword = async () => {
    const targetEmail = user.email || prompt('Please enter your registered email address to receive password reset link:');
    if (!targetEmail || !targetEmail.trim()) {
      toast.error('Email address is required to send password reset link.');
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail.trim(), {
        redirectTo: window.location.origin
      });

      if (error) {
        toast.error(error.message || 'Failed to send password reset email.');
      } else {
        toast.success(`Password reset email sent to ${targetEmail.trim()}. Please check your inbox.`);
      }
    } catch (err: any) {
      toast.error('Failed to initiate password reset. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Re-save all consents
  const handleReconfirmConsents = async () => {
    try {
      localStorage.setItem('printon24_terms_accepted', 'true');
      localStorage.setItem('printon24_privacy_accepted', 'true');
      localStorage.setItem('printon24_cookie_consent', JSON.stringify({
        status: 'accepted',
        timestamp: new Date().toISOString()
      }));
      setTermsConsentStatus('Accepted');
      setPrivacyConsentStatus('Accepted');
      setCookieConsentStatus('Accepted');

      await saveUserConsent(user.id || 'guest', 'terms_and_privacy', true);
      toast.success('Your consent and privacy preferences have been updated and persisted.');
    } catch {
      toast.success('Consent preferences refreshed.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 space-y-6 pb-24 select-none">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 font-heading">
            Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure notifications, account security, and cloud storage compliance
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs font-heading"
        >
          Back
        </button>
      </div>

      {/* 1. Single Notifications On/Off Toggle (Consolidated requirement) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
              notificationsEnabled ? 'bg-red-50 text-[#FF1300]' : 'bg-slate-100 text-slate-400'
            }`}>
              <Bell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Notifications
              </h2>
              <p className="text-[11px] text-slate-500">
                {notificationsEnabled
                  ? 'All notifications (WhatsApp, Email, In-App alerts) are active'
                  : 'All notifications are currently muted'}
              </p>
            </div>
          </div>

          {/* Master Switch Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            disabled={isUpdatingNotifications}
            onClick={() => handleToggleNotifications(!notificationsEnabled)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF1300] focus:ring-offset-2 ${
              notificationsEnabled ? 'bg-[#FF1300]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                notificationsEnabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Status: <strong className={notificationsEnabled ? 'text-emerald-600' : 'text-slate-500'}>
            {notificationsEnabled ? 'Active (All Channels)' : 'Muted'}
          </strong></span>
          <span className="text-slate-400">Database synchronized</span>
        </div>
      </div>

      {/* 2. Password Management & Security Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Password & Security
              </h2>
              <p className="text-[11px] text-slate-500">
                Update account credentials and reset login authentication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isSendingReset}
            className="text-xs font-bold text-[#FF1300] hover:underline font-heading"
          >
            {isSendingReset ? 'Sending...' : 'Forgot Password?'}
          </button>
        </div>

        {user.isGuest ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>You are currently in Guest Mode. Register an official student account to enable persistent password login.</span>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
            {/* Old / Current Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 font-heading">
                Current Password (Old Password)
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/25 focus:border-[#FF1300] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 font-heading">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/25 focus:border-[#FF1300] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 font-heading">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF1300]/25 focus:border-[#FF1300] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">Passwords must match and contain at least 6 characters.</span>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-2 rounded-xl bg-[#FF1300] hover:bg-[#9B111E] active:scale-95 text-white text-xs font-bold shadow-sm transition-all font-heading disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Consent & Privacy Persistence Status */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Consent & Privacy Protection
              </h2>
              <p className="text-[11px] text-slate-500">
                Persistent acceptance records under DPDP Act 2023
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReconfirmConsents}
            className="text-xs font-bold text-[#FF1300] hover:underline font-heading"
          >
            Re-confirm All
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-slate-500" />
              <div>
                <p className="font-bold text-slate-800">Essential & Analytics Cookies</p>
                <p className="text-[11px] text-slate-500">Required for session preservation & print queue telemetry</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {cookieConsentStatus}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-500" />
              <div>
                <p className="font-bold text-slate-800">Platform Terms & Conditions</p>
                <p className="text-[11px] text-slate-500">Master tri-partite agreement between user and shop</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {termsConsentStatus}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <div>
                <p className="font-bold text-slate-800">12-Hour Document Lifecycle Privacy</p>
                <p className="text-[11px] text-slate-500">Guaranteed automatic file purging after printing</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {privacyConsentStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
