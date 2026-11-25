// @ts-ignore Deno resolves npm: specifiers at runtime; non-Deno TypeScript tooling may not.
import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PAYU_KEY = Deno.env.get("PAYU_KEY") || "";
const PAYU_SALT = Deno.env.get("PAYU_SALT") || "";
const PAYU_ENV = (
  Deno.env.get("PAYU_ENV") ||
  Deno.env.get("PAYU_ENVIRONMENT") ||
  "test"
).trim().toLowerCase();
const PAYU_APP_URL = Deno.env.get("PAYU_APP_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

// PayU Official Hosted Checkout URL
const PAYU_PAYMENT_URL = ["production", "prod", "live"].includes(PAYU_ENV)
  ? "https://secure.payu.in/_payment" 
  : "https://test.payu.in/_payment";

async function computeSha512(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  if (!PAYU_KEY || !PAYU_SALT) {
    return new Response(
      JSON.stringify({ error: "PayU credentials are not configured for this project." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // =========================================================================
  // PayU Gateway Callback Handler (surl / furl)
  // When user completes or cancels payment, PayU POSTs back form-encoded data
  // =========================================================================
  if (url.searchParams.get("callback")) {
    try {
      const formData = await req.formData();
      const status = formData.get("status") ? String(formData.get("status")) : "";
      const txnid = formData.get("txnid") ? String(formData.get("txnid")) : "";
      const amount = formData.get("amount") ? String(formData.get("amount")) : "0.00";
      const productinfo = formData.get("productinfo") ? String(formData.get("productinfo")) : "";
      const firstname = formData.get("firstname") ? String(formData.get("firstname")) : "";
      const email = formData.get("email") ? String(formData.get("email")) : "";
      const mihpayid = formData.get("mihpayid") ? String(formData.get("mihpayid")) : `mih_${Date.now()}`;
      const receivedHash = formData.get("hash") ? String(formData.get("hash")) : "";
      const key = formData.get("key") ? String(formData.get("key")) : PAYU_KEY;
      const udf1 = formData.get("udf1") ? String(formData.get("udf1")) : ""; // shop_id
      const udf2 = formData.get("udf2") ? String(formData.get("udf2")) : ""; // user_id
      const udf3 = formData.get("udf3") ? String(formData.get("udf3")) : ""; // order_id
      const udf4 = formData.get("udf4") ? String(formData.get("udf4")) : "";
      const udf5 = formData.get("udf5") ? String(formData.get("udf5")) : "";
      const additionalCharges = formData.get("additionalCharges") ? String(formData.get("additionalCharges")) : "";
      const errorMsg = formData.get("error_Message") ? String(formData.get("error_Message")) : "";

      // PayU Reverse Hash Verification Formula:
      // If additionalCharges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
      // Else: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
      let hashSequence = `${PAYU_SALT}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
      if (additionalCharges) {
        hashSequence = `${additionalCharges}|${hashSequence}`;
      }

      const calculatedReverseHash = await computeSha512(hashSequence);
      const isHashValid = calculatedReverseHash.toLowerCase() === receivedHash.toLowerCase();
      const { data: initiatedPayment, error: paymentLookupError } = await supabase
        .from("payments")
        .select("amount, order_id, shop_id")
        .eq("payu_txnid", txnid)
        .maybeSingle();
      if (paymentLookupError) throw paymentLookupError;

      const callbackAmount = Number(amount);
      const initiatedAmount = Number(initiatedPayment?.amount);
      const matchesInitiatedPayment = Boolean(
        initiatedPayment &&
        Number.isFinite(callbackAmount) &&
        Number.isFinite(initiatedAmount) &&
        callbackAmount.toFixed(2) === initiatedAmount.toFixed(2) &&
        key === PAYU_KEY &&
        (initiatedPayment.shop_id || "") === udf1 &&
        (initiatedPayment.order_id || "") === udf3
      );
      const isPaymentSuccess =
        status.toLowerCase() === "success" &&
        isHashValid &&
        matchesInitiatedPayment;

      console.log(`PayU Callback received: TXN=${txnid}, Status=${status}, HashValid=${isHashValid}`);

      // Update Database
      if (matchesInitiatedPayment) {
        const { error: paymentUpdateError } = await supabase
          .from("payments")
          .update({
          payu_mihpayid: mihpayid,
          payment_status: isPaymentSuccess ? "PAID" : "FAILED",
        })
        .eq("payu_txnid", txnid);
        if (paymentUpdateError) throw paymentUpdateError;

        if (udf3) {
          await supabase
            .from("print_orders")
            .update({
              payment_method: "PayU Online",
              payment_status: isPaymentSuccess ? "PAID" : "FAILED",
              order_status: isPaymentSuccess ? "Queued" : "Payment Failed",
              payu_txnid: txnid,
              payu_payment_id: mihpayid,
            })
            .eq("id", udf3);
        }
      }

      // If successful, record instant 0% commission split settlement to shopkeeper
      if (isPaymentSuccess && udf1) {
        const { data: shop } = await supabase
          .from("print_shops")
          .select("name, upi_id, bank_account_no")
          .eq("id", udf1)
          .single();

        await supabase.from("shop_settlements").insert({
          id: `stl_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
          shop_id: udf1,
          shop_name: shop?.name || "Partner Print Shop",
          total_orders: 1,
          gross_amount: Number(amount),
          platform_commission: 0, // 0% commission
          net_payable: Number(amount), // 100% to shopkeeper
          settlement_cycle: "Instant PayU Split Settlement",
          status: "COMPLETED",
          bank_account_no: shop?.upi_id || shop?.bank_account_no || "PayU Split Account",
          paid_at: new Date().toISOString(),
        });
      }

      // Redirect back to frontend
      const configuredAppUrl = PAYU_APP_URL ? new URL(PAYU_APP_URL) : new URL("https://epyrkfdiozk1.medo.dev");
      const callbackUrl = new URL(configuredAppUrl.origin);
      if (udf4 && isHashValid && matchesInitiatedPayment) {
        const requestedReturnUrl = new URL(udf4);
        const isAllowedReturnProtocol =
          requestedReturnUrl.protocol === "https:" ||
          (requestedReturnUrl.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(requestedReturnUrl.hostname));
        if (isAllowedReturnProtocol) {
          callbackUrl.href = requestedReturnUrl.href;
        }
      }

      callbackUrl.searchParams.set("payment_status", isPaymentSuccess ? "success" : "failed");
      callbackUrl.searchParams.set("txnid", txnid);
      callbackUrl.searchParams.set("order_id", udf3);
      if (isPaymentSuccess) {
        callbackUrl.searchParams.set("mihpayid", mihpayid);
      } else {
        callbackUrl.searchParams.set("error", errorMsg || "Payment cancelled or rejected by bank");
      }
      return Response.redirect(callbackUrl.toString(), 303);
    } catch (cbErr: any) {
      console.error("Callback processing error:", cbErr);
      return new Response("Payment Callback Error", { status: 500 });
    }
  }

  // =========================================================================
  // API JSON Request Handler
  // =========================================================================
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Create PayU Payment & Hash
    if (action === "create_payment") {
      const {
        amount,
        productinfo = "PrintOn24 Document Printing",
        firstname = "Customer",
        email = "customer@printon24.io",
        phone = "9823456789",
        shop_id = "",
        user_id = "",
        order_id = "",
        return_url = "",
        service_mode = "",
      } = body;

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return new Response(
          JSON.stringify({ error: "A positive payment amount is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (service_mode === "Self-Service") {
        if (!shop_id) {
          return new Response(
            JSON.stringify({ error: "A shop is required for APM checkout." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: apmShop, error: apmShopError } = await supabase
          .from("print_shops")
          .select("apm_enabled, payment_method_config")
          .eq("id", shop_id)
          .maybeSingle();

        if (apmShopError) throw apmShopError;
        const onlinePaymentAllowed = ["both", "razorpay", "payu", "online"].includes(
          String(apmShop?.payment_method_config || "").toLowerCase()
        );
        if (!apmShop || apmShop.apm_enabled !== true || !onlinePaymentAllowed) {
          return new Response(
            JSON.stringify({ error: "This shop does not allow PayU payment for APM service." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const formattedAmount = numericAmount.toFixed(2);
      const txnid = "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 90000 + 10000);
      let callbackReturnUrl = "";
      if (return_url) {
        const requestOrigin = req.headers.get("origin");
        let requestedReturnUrl: URL;
        try {
          requestedReturnUrl = new URL(String(return_url));
        } catch {
          return new Response(
            JSON.stringify({ error: "The PayU return URL is invalid." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const isAllowedReturnProtocol =
          requestedReturnUrl.protocol === "https:" ||
          (requestedReturnUrl.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(requestedReturnUrl.hostname));
        if (!requestOrigin || requestedReturnUrl.origin !== requestOrigin || !isAllowedReturnProtocol) {
          return new Response(
            JSON.stringify({ error: "The PayU return URL must match the checkout origin." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        requestedReturnUrl.search = "";
        requestedReturnUrl.hash = "";
        callbackReturnUrl = requestedReturnUrl.toString();
      }

      // Fetch shop details for 100% direct split routing
      let shopName = "Print Shop Partner";
      let routedAccount = "Shopkeeper Direct Account";
      if (shop_id) {
        const { data: shop } = await supabase
          .from("print_shops")
          .select("name, upi_id, bank_account_no")
          .eq("id", shop_id)
          .single();
        if (shop) {
          shopName = shop.name || shopName;
          routedAccount = shop.upi_id || shop.bank_account_no || routedAccount;
        }
      }

      // surl and furl point to our Edge Function callback handler
      const surl = `${SUPABASE_URL}/functions/v1/payu-checkout?callback=success`;
      const furl = `${SUPABASE_URL}/functions/v1/payu-checkout?callback=failure`;

      // PayU Standard Hash Formula:
      // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
      const hashString = `${PAYU_KEY}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${shop_id}|${user_id}|${order_id}|${callbackReturnUrl}|||||||${PAYU_SALT}`;
      const hash = await computeSha512(hashString);

      // Record initiated payment in database
      const { error: paymentInsertError } = await supabase.from("payments").insert({
        id: `pay_${txnid}`,
        order_id: order_id || null,
        user_id: user_id || null,
        shop_id: shop_id || null,
        payu_txnid: txnid,
        payu_hash: hash,
        amount: Number(formattedAmount),
        currency: "INR",
        payment_method: "PayU",
        payment_status: "INITIATED",
        split_settlement_info: {
          shop_id,
          shop_name: shopName,
          routed_account: routedAccount,
          settlement_type: "PayU Split Settlement (0% Commission)",
        },
      });
      if (paymentInsertError) throw paymentInsertError;

      return new Response(
        JSON.stringify({
          success: true,
          payu_url: PAYU_PAYMENT_URL,
          key: PAYU_KEY,
          txnid,
          amount: formattedAmount,
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          hash,
          udf1: shop_id,
          udf2: user_id,
          udf3: order_id,
          udf4: callbackReturnUrl,
          shop_name: shopName,
          routed_account: routedAccount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 2: Verify PayU Payment
    if (action === "verify_payment") {
      const {
        txnid,
        mihpayid,
        payu_payment_id,
        order_id,
        shop_id,
        amount,
        membership_id,
      } = body;
      const verifiedPaymentId = payu_payment_id || mihpayid || `mih_${Date.now()}`;

      // Check existing payment status in DB first
      const { data: existingPayment, error: paymentLookupError } = await supabase
        .from("payments")
        .select("*")
        .eq("payu_txnid", txnid)
        .maybeSingle();
      if (paymentLookupError) throw paymentLookupError;

      const requestedAmount = Number(amount);
      const paymentAmount = Number(existingPayment?.amount);
      const requestMatchesOrder = !order_id || order_id === existingPayment?.order_id;
      const isSuccessful =
        existingPayment?.payment_status === "PAID" &&
        Number.isFinite(requestedAmount) &&
        requestedAmount === paymentAmount &&
        (!shop_id || shop_id === existingPayment.shop_id) &&
        requestMatchesOrder;

      // Update print_orders if order_id is present
      const targetOrderId = existingPayment?.order_id;
      if (targetOrderId && requestMatchesOrder && isSuccessful) {
        await supabase
          .from("print_orders")
          .update({
            payment_method: "PayU Online",
            payment_status: isSuccessful ? "PAID" : "FAILED",
            order_status: isSuccessful ? "Queued" : "Payment Failed",
            payu_txnid: txnid,
            payu_payment_id: verifiedPaymentId,
          })
          .eq("id", targetOrderId);
      }

      // If membership purchase
      if (membership_id && isSuccessful) {
        await supabase
          .from("user_memberships")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", membership_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: isSuccessful,
          txnid,
          mihpayid: verifiedPaymentId,
          order_id: targetOrderId,
          status: isSuccessful ? "PAID" : "FAILED",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
