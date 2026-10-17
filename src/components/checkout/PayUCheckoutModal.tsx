import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { verifyPayUPaymentViaEdge } from '../../services/api';
import { toast } from 'sonner';

export interface PayUData {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl?: string;
  furl?: string;
  hash: string;
  payu_url?: string;
  udf1?: string; // shop_id
  udf2?: string; // user_id
  udf3?: string; // order_id
  shop_name?: string;
}

interface PayUCheckoutModalProps {
  isOpen: boolean;
  payuData: PayUData | null;
  onSuccess: (paymentInfo: { txnid: string; mihpayid: string; method: string }) => void;
  onCancel: () => void;
}

export const PayUCheckoutModal: React.FC<PayUCheckoutModalProps> = ({
  isOpen,
  payuData,
  onSuccess,
  onCancel
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingStatus, setVerifyingStatus] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentError(null);
      setIsRedirecting(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!payuData) return null;

  const targetPayUUrl = payuData.payu_url || 'https://test.payu.in/_payment';

  // Submit actual POST form to official PayU Hosted Gateway
  const handleProceedToPayUGateway = () => {
    setIsRedirecting(true);
    setPaymentError(null);

    try {
      // Create and submit standard HTML form to PayU Payment URL
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = targetPayUUrl;
      form.target = '_self'; // Redirect to PayU payment gateway

      const fields: Record<string, string> = {
        key: payuData.key,
        txnid: payuData.txnid,
        amount: payuData.amount,
        productinfo: payuData.productinfo,
        firstname: payuData.firstname,
        email: payuData.email,
        phone: payuData.phone,
        surl: payuData.surl || `${window.location.origin}/?payment_status=success`,
        furl: payuData.furl || `${window.location.origin}/?payment_status=failed`,
        hash: payuData.hash,
        udf1: payuData.udf1 || '',
        udf2: payuData.udf2 || '',
        udf3: payuData.udf3 || ''
      };

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      setIsRedirecting(false);
      setPaymentError(`Failed to connect to PayU Gateway: ${err.message}`);
    }
  };

  // Check server-side verification status
  const handleCheckBackendVerification = async () => {
    setIsVerifying(true);
    setVerifyingStatus('Querying backend server for verified payment status...');

    try {
      const isVerified = await verifyPayUPaymentViaEdge({
        txnid: payuData.txnid,
        amount: payuData.amount,
        productinfo: payuData.productinfo,
        firstname: payuData.firstname,
        email: payuData.email,
        status: 'success',
        payu_hash: payuData.hash,
        order_id: payuData.udf3,
        shop_id: payuData.udf1,
        user_id: payuData.udf2
      });

      setIsVerifying(false);

      if (isVerified) {
        toast.success('Payment successfully verified by server!');
        onSuccess({
          txnid: payuData.txnid,
          mihpayid: `mih_${Date.now()}`,
          method: 'PayU Online Gateway'
        });
      } else {
        setPaymentError('Payment has not yet been confirmed by PayU gateway. Please complete checkout or try again.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setPaymentError(err.message || 'Verification failed. Please retry.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg p-0 overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-2xl z-50">
        {/* Header with Official PayU Branding */}
        <div className="bg-gradient-to-r from-[#1c2438] via-[#0b1329] to-[#000] p-6 text-white relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-[#A4C639] font-heading">PayU</span>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest border-l border-slate-600 pl-2">
                Checkout Gateway
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>

          <DialogTitle className="text-lg font-black font-heading text-white">
            Pay ₹{Number(payuData.amount).toFixed(2)} to {payuData.shop_name || 'Print Partner'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 mt-1">
            Complete your payment via PayU official hosted checkout. 0% platform commission with 100% direct split settlement to shopkeeper.
          </DialogDescription>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">TXN ID: {payuData.txnid}</span>
            <span className="text-emerald-400 font-bold">Direct Split Settlement</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {paymentError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Transaction Notice</p>
                <p className="text-[11px] text-red-600 mt-0.5">{paymentError}</p>
              </div>
            </div>
          )}

          {/* Supported Gateway Payment Methods */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <p className="text-xs font-bold text-slate-800 font-heading">
              Official PayU Supported Payment Instruments:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>UPI (GPay, PhonePe, Paytm)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Credit & Debit Cards</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Net Banking (50+ Banks)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Wallets & PayLater</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Gateway Target: <code className="text-slate-600 font-mono">{targetPayUUrl}</code>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              disabled={isRedirecting || isVerifying}
              onClick={handleProceedToPayUGateway}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#A4C639] to-[#88a928] hover:from-[#95b62e] hover:to-[#799820] text-slate-950 font-black text-sm shadow-lg shadow-lime-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 font-heading"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Connecting to PayU Gateway...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Proceed to PayU Checkout • ₹{Number(payuData.amount).toFixed(2)}</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isVerifying || isRedirecting}
                onClick={handleCheckBackendVerification}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Verification</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="py-2 px-4 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            Verified SHA-512 Server Hash
          </span>
          <span>PrintOn24 Secure Payments</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
