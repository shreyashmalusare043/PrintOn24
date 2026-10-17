import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  Printer,
  ShieldAlert
} from 'lucide-react';

export interface UniformAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'confirm' | 'print' | 'security';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

/**
 * Uniformly styled modal system for PrintOn24 across all views.
 * Replaces system popups/alerts with brand-consistent, accessible dialogs.
 */
export const UniformAlertModal: React.FC<UniformAlertModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false
}) => {
  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Completed'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Notice'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Alert'
        };
      case 'confirm':
        return {
          icon: HelpCircle,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Confirmation'
        };
      case 'print':
        return {
          icon: Printer,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Print Job'
        };
      case 'security':
        return {
          icon: ShieldAlert,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Security'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
          badgeText: 'Information'
        };
    }
  };

  const { icon: IconComponent, iconBg, badgeText } = getIconAndColors();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl z-50">
        <div className="p-6 text-center space-y-4">
          {/* Context Icon */}
          <div className="flex justify-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${iconBg}`}>
              <IconComponent className="w-7 h-7" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-1">
              {badgeText}
            </div>
            <DialogTitle className="text-base font-extrabold text-slate-900 font-heading">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {description}
              </DialogDescription>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-center gap-2.5">
            {showCancel && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all font-heading"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
