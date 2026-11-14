import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getPayPalCredentials,
  getPayPalAccessToken,
  PayPalConfigError,
} from "@/lib/paypal";

export const dynamic = "force-dynamic";

const ALLOWED_PAYPAL_CERT_HOSTS = new Set([
  "api.paypal.com",
  "api-m.paypal.com",
  "api.sandbox.paypal.com",
  "api-m.sandbox.paypal.com",
]);

function isValidPayPalCertUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && ALLOWED_PAYPAL_CERT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Cryptographically verified PayPal Webhook receiver.
 * Handles out-of-band refunds, chargebacks, payment reversals, and disputes
 * using PayPal's official /v1/notifications/verify-webhook-signature API.
 */
export async function POST(req: NextRequest) {
  try {
    const webhookId = (process.env.PAYPAL_WEBHOOK_ID || "").trim();
    if (!webhookId) {
      console.error("[PayPal Webhook] PAYPAL_WEBHOOK_ID is not configured.");
      return NextResponse.json(
        { error: "Webhook verification is not configured on server." },
        { status: 503 }
      );
    }

    const authAlgo = req.headers.get("paypal-auth-algo") || "";
    const certUrl = req.headers.get("paypal-cert-url") || "";
    const transmissionId = req.headers.get("paypal-transmission-id") || "";
    const transmissionSig = req.headers.get("paypal-transmission-sig") || "";
    const transmissionTime = req.headers.get("paypal-transmission-time") || "";

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return NextResponse.json(
        { error: "Missing required PayPal cryptographic signature headers." },
        { status: 401 }
      );
    }

    if (!isValidPayPalCertUrl(certUrl)) {
      console.error("[PayPal Webhook] Rejected untrusted PAYPAL-CERT-URL:", certUrl);
      return NextResponse.json(
        { error: "Untrusted certificate authority URL." },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    let eventBody: any;
    try {
      eventBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON webhook body." }, { status: 400 });
    }

    const creds = getPayPalCredentials({ requireSecret: true });
    const accessToken = await getPayPalAccessToken(creds);

    const verifyRes = await fetch(
      `${creds.baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: eventBody,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!verifyRes.ok) {
      console.error("[PayPal Webhook] Verification API HTTP error:", verifyRes.status);
      return NextResponse.json(
        { error: "Failed to verify webhook signature with PayPal." },
        { status: 502 }
      );
    }

    const verifyJson = await verifyRes.json();
    if (verifyJson?.verification_status !== "SUCCESS") {
      console.error(
        "[PayPal Webhook] Signature verification FAILED:",
        verifyJson?.verification_status
      );
      return NextResponse.json(
        { error: "Invalid PayPal webhook signature." },
        { status: 401 }
      );
    }

    const eventType = String(eventBody?.event_type || "").toUpperCase();
    const resource = eventBody?.resource || {};

    // PayPal webhook resource.id is the CAPTURE ID for PAYMENT.CAPTURE.* events.
    // The PayPal ORDER ID (which we store in stripe_payment_intent_id) is in supplementary_data.
    // For disputes, the order_id is in disputed_transactions[0].seller_transaction_id.
    // We match orders by the PayPal ORDER ID (stripe_payment_intent_id column).
    const paypalOrderId: string =
      resource?.supplementary_data?.related_ids?.order_id ||
      resource?.id || // fallback: some events put order_id directly in resource.id
      "";
    const disputeOrderId: string =
      resource?.disputed_transactions?.[0]?.seller_transaction_id || "";

    const sql = getDb();

    // PAYMENT.CAPTURE.REFUNDED — match by PayPal order ID stored in stripe_payment_intent_id
    if (paypalOrderId && eventType === "PAYMENT.CAPTURE.REFUNDED") {
      await sql`
        UPDATE orders SET
          status = CASE WHEN status = 'CANCELLED' THEN 'CANCELLED' ELSE 'REFUNDED' END,
          updated_at = NOW()
        WHERE stripe_payment_intent_id = ${paypalOrderId}
      `;
      console.info(`[PayPal Webhook] Marked order REFUNDED (PayPal order: ${paypalOrderId})`);
    } else if (paypalOrderId && (
      eventType === "PAYMENT.CAPTURE.REVERSED" ||
      eventType === "PAYMENT.CAPTURE.DENIED"
    )) {
      await sql`
        UPDATE orders SET
          status = 'DISPUTED',
          fulfillment_status = 'PAYMENT_DISPUTED',
          fulfillment_error = ${`PayPal webhook event: ${eventType}`},
          updated_at = NOW()
        WHERE stripe_payment_intent_id = ${paypalOrderId}
      `;
      console.info(`[PayPal Webhook] Marked order DISPUTED (event: ${eventType}, PayPal order: ${paypalOrderId})`);
    } else if (disputeOrderId && eventType === "CUSTOMER.DISPUTE.CREATED") {
      // Dispute events reference the original seller transaction ID, not the order ID
      await sql`
        UPDATE orders SET
          status = 'DISPUTED',
          fulfillment_status = 'PAYMENT_DISPUTED',
          fulfillment_error = ${'PayPal dispute opened: CUSTOMER.DISPUTE.CREATED'},
          updated_at = NOW()
        WHERE stripe_payment_intent_id = ${disputeOrderId}
           OR internal_order_number = ${disputeOrderId}
      `;
      console.info(`[PayPal Webhook] Marked order DISPUTED (dispute transaction: ${disputeOrderId})`);
    }

    console.info(`[PayPal Webhook] Processed verified event ${eventType} (${transmissionId})`);
    return NextResponse.json({ received: true, event_type: eventType });
  } catch (err: any) {
    if (err instanceof PayPalConfigError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[PayPal Webhook] Unexpected error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
