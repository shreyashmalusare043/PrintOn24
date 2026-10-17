// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || 'rzp_test_TieNJV8WPspbdd';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '19f3r1gh1QKPKyhqOxAmq1Ah';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    // Action 1: Create Razorpay Order
    if (action === 'create_order') {
      const { amount, currency = 'INR', receipt, notes = {} } = body;
      const amountInPaise = Math.round(Number(amount) * 100);

      const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes
        })
      });

      if (!rzpResponse.ok) {
        const errorData = await rzpResponse.json();
        return new Response(
          JSON.stringify({ error: 'Razorpay order creation failed', details: errorData }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orderData = await rzpResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          key_id: RAZORPAY_KEY_ID
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action 2: Verify Razorpay Payment Signature and Update Database
    if (action === 'verify_payment') {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        order_id,
        user_id,
        shop_id,
        amount
      } = body;

      const generatedSignature = await computeHmacSha256(
        RAZORPAY_KEY_SECRET,
        `${razorpay_order_id}|${razorpay_payment_id}`
      );

      const isSignatureValid = generatedSignature === razorpay_signature;

      if (!isSignatureValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid payment signature verification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record payment in database
      const paymentId = `pay_${Date.now()}`;
      await supabase.from('payments').insert({
        id: paymentId,
        order_id,
        user_id,
        shop_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: Number(amount),
        currency: 'INR',
        payment_method: 'razorpay_online',
        payment_status: 'paid'
      });

      // Update Order Status in database
      if (order_id) {
        await supabase
          .from('print_orders')
          .update({
            payment_status: 'paid',
            order_status: 'printing'
          })
          .eq('id', order_id);

        // Generate user notification
        await supabase.from('notifications').insert({
          id: `notif_${Date.now()}`,
          user_id,
          title: 'Payment Successful',
          message: `Your payment of ₹${amount} was received via Razorpay. Order #${order_id} is now queued for printing.`,
          type: 'success',
          order_id,
          is_read: false
        });
      }

      // Automatically recalculate / update 2-day settlement ledger for this shop
      if (shop_id) {
        const { data: existingSettlement } = await supabase
          .from('shop_settlements')
          .select('*')
          .eq('shop_id', shop_id)
          .eq('status', 'pending')
          .maybeSingle();

        const gross = Number(amount);
        const commission = Math.round(gross * 0.05 * 100) / 100; // 5% platform fee
        const net = Math.round((gross - commission) * 100) / 100;

        if (existingSettlement) {
          await supabase
            .from('shop_settlements')
            .update({
              total_orders: (existingSettlement.total_orders || 0) + 1,
              gross_amount: Number(existingSettlement.gross_amount || 0) + gross,
              platform_commission: Number(existingSettlement.platform_commission || 0) + commission,
              net_payable: Number(existingSettlement.net_payable || 0) + net
            })
            .eq('id', existingSettlement.id);
        } else {
          // Fetch shop name
          const { data: shop } = await supabase.from('print_shops').select('name').eq('id', shop_id).maybeSingle();
          await supabase.from('shop_settlements').insert({
            id: `stl_${Date.now()}`,
            shop_id,
            shop_name: shop?.name || 'Partner Print Shop',
            total_orders: 1,
            gross_amount: gross,
            platform_commission: commission,
            net_payable: net,
            settlement_cycle: '2-day cycle',
            status: 'pending'
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          payment_id: razorpay_payment_id,
          order_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action 3: Record Pay on Counter Order
    if (action === 'record_counter_payment') {
      const { order_id, user_id, shop_id, amount } = body;
      const paymentId = `pay_counter_${Date.now()}`;
      await supabase.from('payments').insert({
        id: paymentId,
        order_id,
        user_id,
        shop_id,
        amount: Number(amount),
        currency: 'INR',
        payment_method: 'pay_on_counter',
        payment_status: 'pending'
      });

      await supabase.from('notifications').insert({
        id: `notif_${Date.now()}`,
        user_id,
        title: 'Order Placed (Pay on Counter)',
        message: `Order #${order_id} created. Please pay ₹${amount} directly at the counter upon pickup.`,
        type: 'info',
        order_id,
        is_read: false
      });

      return new Response(
        JSON.stringify({ success: true, payment_id: paymentId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
