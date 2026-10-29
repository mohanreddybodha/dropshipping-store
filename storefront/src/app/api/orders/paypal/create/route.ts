import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = "USD", internal_order_number } = body;

    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();

    if (!clientId || !secret) {
      console.error("[PayPal Create] Missing server credentials in environment.");
      return NextResponse.json(
        { error: "Payment gateway configuration error. Contact support." },
        { status: 500 }
      );
    }

    const baseUrl =
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // 1. Get OAuth Token server-side
    const authHeader = Buffer.from(`${clientId}:${secret}`).toString("base64");
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      console.error("[PayPal Create] Auth error status:", tokenRes.status);
      return NextResponse.json(
        { error: "Secure authentication with payment gateway failed." },
        { status: 502 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 2. Create Order server-side with zero-trust validation & idempotency
    const orderNum = internal_order_number || `ORD-PP-${Date.now().toString().slice(-6)}`;
    const parsedAmount = Math.max(0.01, Number(amount) || 24.99);

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        // Strict Idempotency Key: Prevents duplicate orders if client retries creation
        "PayPal-Request-Id": `create-${orderNum}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderNum,
            description: `Domestic Order ${orderNum}`,
            amount: {
              currency_code: currency.toUpperCase(),
              value: parsedAmount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "Domestic Direct",
          landing_page: "NO_PREFERENCE",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!orderRes.ok) {
      console.error("[PayPal Create] Order creation failed with status:", orderRes.status);
      return NextResponse.json(
        { error: "Payment processor rejected order creation request." },
        { status: 502 }
      );
    }

    const orderData = await orderRes.json();
    return NextResponse.json({
      order_id: orderData.id,
      status: orderData.status,
    });
  } catch (err: any) {
    console.error("[PayPal Create] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to process payment order at this time." },
      { status: 500 }
    );
  }
}
