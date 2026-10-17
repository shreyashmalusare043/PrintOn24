import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  CheckCircle2,
  Wallet,
  Coins,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lock,
  AlertCircle
} from 'lucide-react';
import { usePrintPerfect } from '../../contexts/PrintPerfectContext';
import type { PaymentMethod, PrintOrder } from '../../types/printperfect';
import { toast } from 'sonner';
import {
  createPayUPaymentViaEdge,
  verifyPayUPaymentViaEdge,
  recordCounterPaymentViaEdge,
  getShopPrinters,
  type ShopPrinterInfo
} from '../../services/api';
import { supabase } from '../../db/supabase';
import { PayUCheckoutModal, type PayUData } from './PayUCheckoutModal';

interface CheckoutViewProps {
  onBack: () => void;
  onOrderSuccess: (order: PrintOrder) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onBack,
  onOrderSuccess
}) => {
  const {
    selectedEnterprise,
    hasExplicitlySelectedEnterprise,
    currentDoc,
    uploadedDocs,
    getDocPrice,
    printConfig,
    priceCalc,
    activeMembership,
    createOrder,
    isDocConfigValid,
    user
  } = usePrintPerfect();

  // Dynamic Payment Methods from Super Admin Shop Settings
  const [isLoadingPaymentConfig, setIsLoadingPaymentConfig] = useState<boolean>(true);
  const [shopPaymentConfig, setShopPaymentConfig] = useState<string>('counter');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pay on Counter');

  const [shopPrintersList, setShopPrintersList] = useState<ShopPrinterInfo[]>([]);
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPaymentConfig(true);

    // 1. Fetch live per-shop payment settings from database prior to rendering options
    const fetchPaymentSettings = async () => {
      try {
        const { data } = await supabase
          .from('print_shops')
          .select('payment_method_config')
          .eq('id', selectedEnterprise.id)
          .maybeSingle();

        if (!isMounted) return;
        const cfg = data?.payment_method_config || selectedEnterprise.paymentMethodConfig || 'counter';
        setShopPaymentConfig(cfg);
        if (cfg === 'counter') {
          setPaymentMethod('Pay on Counter');
        } else if (cfg === 'razorpay' || cfg === 'payu' || cfg === 'online') {
          setPaymentMethod('PayU');
        } else {
          setPaymentMethod('PayU');
        }
      } catch {
        if (!isMounted) return;
        const fallback = selectedEnterprise.paymentMethodConfig || 'counter';
        setShopPaymentConfig(fallback);
        if (fallback === 'counter') {
          setPaymentMethod('Pay on Counter');
        } else {
          setPaymentMethod('PayU');
        }
      } finally {
        if (isMounted) {
          setIsLoadingPaymentConfig(false);
        }
      }
    };

    fetchPaymentSettings();

    // 2. Fetch printer hardware capabilities and validate
    getShopPrinters(selectedEnterprise.id).then(printers => {
      if (isMounted) {
        setShopPrintersList(printers);
        const allConfigs = uploadedDocs.length > 0
          ? uploadedDocs.map(d => d.printConfig || printConfig)
          : [printConfig];

        const needsColor = allConfigs.some(c => c.printType === 'Color');
        const needsDuplex = allConfigs.some(c => c.sides === 'Back to Back');
        const requestedSizes = allConfigs.map(c => c.pageSize || 'A4');

        if (printers.length > 0) {
          const hasColor = printers.some(p => p.is_color);
          const hasDuplex = printers.some(p => p.is_duplex);
          const hasMatchingSize = requestedSizes.every(size =>
            printers.some(p => p.paper_sizes.includes(size))
          );

          if (needsColor && !hasColor) {
            setCapabilityWarning('Shop printer hardware is B&W only. Color jobs will be handled by shopkeeper queue.');
          } else if (needsDuplex && !hasDuplex) {
            setCapabilityWarning('Shop printer requires manual duplexing for Back to Back sheets.');
          } else if (!hasMatchingSize) {
            setCapabilityWarning('Special paper size requested. Shopkeeper will load custom paper tray.');
          } else {
            setCapabilityWarning(null);
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedEnterprise.id, uploadedDocs, printConfig]);

  const allowsCounter = shopPaymentConfig === 'both' || shopPaymentConfig === 'counter';
  const allowsOnline = shopPaymentConfig === 'both' || shopPaymentConfig === 'razorpay' || shopPaymentConfig === 'payu';
  const [razorpayOption, setRazorpayOption] = useState<'UPI' | 'Card' | 'Netbanking' | 'Wallet'>('UPI');
  const [upiId, setUpiId] = useState('shreyash@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);

  // PayU Modal state
  const [payuModalData, setPayuModalData] = useState<PayUData | null>(null);
  const [isPayuModalOpen, setIsPayuModalOpen] = useState(false);

  const handleGoForPrint = async () => {
    if (!hasExplicitlySelectedEnterprise) {
      toast.error('Select/Connect Printing Shop First');
      onBack();
      return;
    }

    // Readiness gate: Block payment if any document has incomplete or invalid configuration
    const allDocs = uploadedDocs.length > 0 ? uploadedDocs : (currentDoc ? [currentDoc] : []);
    const invalidDocs = allDocs.filter(d => !isDocConfigValid(d).isValid);
    if (invalidDocs.length > 0) {
      const names = invalidDocs.map(d => `"${d.fileName}"`).join(', ');
      toast.error(
        `Please complete the print configuration for all uploaded documents before proceeding to payment. (Incomplete: ${names})`,
        { duration: 5000 }
      );
      onBack();
      return;
    }

    if (paymentMethod === 'PayU') {
      setIsProcessing(true);
      try {
        toast.info('Connecting to PayU Split Settlement Gateway...');
        const payuRes = await createPayUPaymentViaEdge({
          amount: priceCalc.grandTotal,
          productinfo: `${currentDoc?.fileName || 'Print Job'} - ${selectedEnterprise.name}`,
          firstname: user.name || 'Customer',
          email: user.email || 'customer@printon24.io',
          phone: user.phone || '9876543210',
          shop_id: selectedEnterprise.id,
          user_id: user.id
        });

        setIsProcessing(false);
        if (payuRes && payuRes.txnid) {
          setPayuModalData({
            key: payuRes.key || 'nD7EiA',
            txnid: payuRes.txnid,
            amount: String(priceCalc.grandTotal),
            productinfo: `${currentDoc?.fileName || 'Print Job'} - ${selectedEnterprise.name}`,
            firstname: user.name || 'Customer',
            email: user.email || 'customer@printon24.io',
            phone: user.phone || '9876543210',
            surl: payuRes.surl,
            furl: payuRes.furl,
            hash: payuRes.hash,
            payu_url: payuRes.payu_url,
            udf1: selectedEnterprise.id,
            udf2: user.id,
            udf3: payuRes.txnid,
            shop_name: selectedEnterprise.name
          });
          setIsPayuModalOpen(true);
        } else {
          toast.error('Unable to initialize PayU payment. Please check your connection and retry.');
        }
      } catch (err: any) {
        setIsProcessing(false);
        console.error('PayU initialization error:', err);
        toast.error('PayU Gateway connection error. Please try again or select Pay on Counter.');
      }
      return;
    }

    // Pay on Counter settlement
    setIsProcessing(true);
    const detail = 'Counter Settlement';
    try {
      const order = createOrder('Pay on Counter', detail);
      await recordCounterPaymentViaEdge({
        order_id: order.id,
        user_id: user.id,
        shop_id: selectedEnterprise.id,
        amount: priceCalc.grandTotal
      });
      setIsProcessing(false);
      toast.success('Order placed for Pay on Counter! Token generated.');
      onOrderSuccess(order);
    } catch (err) {
      const order = createOrder('Pay on Counter', detail);
      setIsProcessing(false);
      toast.success('Order placed for Pay on Counter! Token generated.');
      onOrderSuccess(order);
    }
  };

  const handlePayUSuccess = async (paymentInfo: { txnid: string; mihpayid: string; method: string }) => {
    setIsProcessing(true);
    toast.info('Verifying transaction on PayU backend...');
    try {
      const isVerified = await verifyPayUPaymentViaEdge({
        txnid: paymentInfo.txnid,
        amount: priceCalc.grandTotal,
        productinfo: `${currentDoc?.fileName || 'Print Job'} - ${selectedEnterprise.name}`,
        firstname: user.name || 'Customer',
        email: user.email || 'customer@printon24.io',
        status: 'success',
        payu_hash: payuModalData?.hash || '',
        payu_payment_id: paymentInfo.mihpayid,
        shop_id: selectedEnterprise.id,
        user_id: user.id
      });

      setIsProcessing(false);
      setIsPayuModalOpen(false);

      if (isVerified) {
        const order = createOrder('PayU', `${paymentInfo.method} • Txn: ${paymentInfo.txnid.slice(-8)}`);
        toast.success(`Payment verified via PayU! ₹${priceCalc.grandTotal.toFixed(2)} routed to ${selectedEnterprise.name}.`);
        onOrderSuccess(order);
      } else {
        toast.error('PayU payment verification failed. Payment was not confirmed.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setIsPayuModalOpen(false);
      toast.error('Payment verification failed on server: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePayUCancel = () => {
    setIsPayuModalOpen(false);
    toast.error('Payment cancelled. Your print order was not placed.');
  };

  return (
    <div className="space-y-4 pb-28 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 p-1 -ml-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold text-slate-800">
          Payout & Checkout
        </span>
      </div>
      {/* Target Print Enterprise Banner */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#FF1300] flex items-center justify-center font-black">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="text-xs font-bold text-slate-900">{selectedEnterprise.name}</h3>
              <CheckCircle2 className="w-3.5 h-3.5 fill-[#10B981] text-white" />
            </div>
            <p className="text-[10px] text-slate-400">{selectedEnterprise.address}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
          {selectedEnterprise.terminalCode}
        </span>
      </div>
      {/* VIP Priority Queue Badge for Active Members */}
      {activeMembership && (
        <div className="bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 p-2.5 rounded-2xl border border-amber-300 flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block font-heading">
                {activeMembership.tier} Active
              </span>
              <span className="text-[10px] text-amber-800 font-semibold">
                Your order is prioritized in {selectedEnterprise.name}'s VIP queue
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase font-mono">{"VIP"}</span>
        </div>
      )}
      {/* Order Item Summary Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider text-slate-400">
          Order Summary
        </h4>

        {uploadedDocs && uploadedDocs.length > 1 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uploadedDocs.map(doc => {
              const cfg = doc.printConfig || printConfig;
              const docPrice = getDocPrice(doc);
              return (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-[#FF1300] text-white flex items-center justify-center font-extrabold text-[10px] shrink-0">
                    {doc.fileType || 'PDF'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-slate-500">
                      {doc.totalPages} Pgs • {cfg.copies}x • {cfg.sides} • {cfg.printType} ({cfg.pageSize})
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-900 shrink-0">
                    ₹{docPrice.subtotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center font-extrabold text-xs">
              {currentDoc?.fileType || 'PDF'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{currentDoc?.fileName || 'Document'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {priceCalc.effectivePages} Pages • {printConfig.copies} {printConfig.copies > 1 ? 'Sets' : 'Set'} • {printConfig.sides} • {printConfig.printType} ({printConfig.pageSize})
              </p>
            </div>
          </div>
        )}

        {/* Summary Breakdown (No GST, Clean Total Pages, Total Copies, Final Total) */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-2 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Pages</span>
            <span className="text-sm font-black text-slate-900 font-heading">{priceCalc.effectivePages}</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Copies</span>
            <span className="text-sm font-black text-slate-900 font-heading">{printConfig.copies}</span>
          </div>
          <div className="bg-red-50 p-2 rounded-xl border border-red-100">
            <span className="text-[10px] text-[#FF1300] block font-semibold uppercase">Final Total</span>
            <span className="text-sm font-black text-[#FF1300] font-heading">₹{priceCalc.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {priceCalc.discount > 0 && (
          <div className="flex justify-between py-1 text-emerald-600 text-xs font-bold pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Member Savings ({activeMembership?.discountPercentage}% OFF):
            </span>
            <span>-₹{priceCalc.discount.toFixed(2)}</span>
          </div>
        )}
      </div>
      {/* 16. Payment Method Selection (Dynamically loaded from Super Admin shop settings) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-heading">
            Select Payment Method
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {allowsOnline && allowsCounter ? '2 Methods Available' : '1 Method Enabled by Shop'}
          </span>
        </div>

        {/* Printer hardware capability notice */}
        {capabilityWarning ? (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 text-[11px] text-amber-800 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{capabilityWarning}</span>
          </div>
        ) : null}

        {/* Neutral loading skeleton to eliminate payment option flicker */}
        {isLoadingPaymentConfig ? (
          <div key="loading-payment-methods" className="space-y-2 py-1">
            <div className="h-16 rounded-3xl bg-slate-100 border border-slate-200/80 animate-pulse flex items-center px-4 gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-200" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                <div className="h-2.5 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ) : (
          <div key="loaded-payment-methods" className="space-y-2.5">
            {/* Option 1: PayU Online Payment (Shown ONLY if allowed by shopkeeper settings) */}
            {allowsOnline && (
              <div
                onClick={() => setPaymentMethod('PayU')}
                className={`cursor-pointer rounded-3xl p-4 border transition-all ${
                  paymentMethod === 'PayU'
                    ? 'border-[#FF1300] bg-red-50/40 shadow-sm ring-1 ring-[#FF1300]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FF1300] text-white flex items-center justify-center font-bold shadow-sm shadow-red-500/20">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 font-heading">Online Payment (PayU)</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        <span>UPI, GPay, PhonePe, Cards & Netbanking</span>
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'PayU' ? 'border-[#FF1300] bg-[#FF1300]' : 'border-slate-300'
                  }`}>
                    {paymentMethod === 'PayU' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Sub options for PayU */}
                {paymentMethod === 'PayU' && (
                  <div className="mt-3 pt-3 border-t border-red-100 space-y-2">
                    <div className="flex items-center gap-2">
                      {(['UPI', 'Card', 'Netbanking', 'Wallet'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setRazorpayOption(opt);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            razorpayOption === opt
                              ? 'bg-[#FF1300] text-white shadow-xs font-heading'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {razorpayOption === 'UPI' && (
                      <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                          placeholder="Enter UPI ID (e.g. name@okhdfcbank)"
                          className="flex-1 bg-white border border-red-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#FF1300]"
                        />
                        <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                          PayU Verified ✓
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Option 2: Pay on Counter (Shown ONLY if allowed by shopkeeper settings) */}
            {allowsCounter && (
              <div
                onClick={() => setPaymentMethod('Pay on Counter')}
                className={`cursor-pointer rounded-3xl p-4 border transition-all ${
                  paymentMethod === 'Pay on Counter'
                    ? 'border-[#FF1300] bg-red-50/40 shadow-sm ring-1 ring-[#FF1300]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shadow-amber-500/20">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 font-heading">Pay on Counter</h4>
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold">
                          OFFLINE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        <span>Settle Cash at the physical counter on pickup</span>
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'Pay on Counter' ? 'border-[#FF1300] bg-[#FF1300]' : 'border-slate-300'
                  }`}>
                    {paymentMethod === 'Pay on Counter' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Security & Terminal Pairing Note */}
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-white text-[11px] text-slate-500 border border-red-100">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          End-to-end encrypted print stream. Your token expires automatically once printed.
        </span>
      </div>
      {/* 17. Go For Print Button */}
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleGoForPrint}
        className="w-full py-4 rounded-full bg-[#FF1300] hover:bg-[#E01100] disabled:opacity-75 active:scale-95 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-red-500/30 transition-all font-heading"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Sending to Print Shop Queue...</span>
          </div>
        ) : (
          <>
            <Printer className="w-5 h-5 stroke-[2.2]" />
            <span>Go For Print • ₹{priceCalc.grandTotal.toFixed(2)}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {/* PayU Payment Gateway Modal */}
      <PayUCheckoutModal
        isOpen={isPayuModalOpen}
        payuData={payuModalData}
        onSuccess={handlePayUSuccess}
        onCancel={handlePayUCancel}
      />
    </div>
  );
};
