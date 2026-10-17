/**
 * Razorpay Checkout SDK Loader and Integration Helper
 */

export interface RazorpayOrderOptions {
  orderId: string;
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  keyId: string,
  options: RazorpayOrderOptions,
  onSuccess: (response: RazorpaySuccessResponse) => void,
  onDismiss?: () => void
): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error('Failed to load Razorpay payment gateway SDK. Please check your network connection.');
  }

  const rzpOptions = {
    key: keyId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'printOn24 Cloud Printing',
    description: options.description || 'Print Order Payment',
    order_id: options.orderId,
    handler: (response: RazorpaySuccessResponse) => {
      onSuccess(response);
    },
    prefill: {
      name: options.prefill?.name || '',
      email: options.prefill?.email || '',
      contact: options.prefill?.contact || ''
    },
    notes: options.notes || {},
    theme: {
      color: options.theme?.color || '#FF1300'
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      }
    }
  };

  const rzp = new (window as any).Razorpay(rzpOptions);
  rzp.open();
}
