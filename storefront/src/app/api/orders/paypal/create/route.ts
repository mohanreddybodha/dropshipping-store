import { NextRequest, NextResponse } from "next/server";
import seedData from "@/lib/seedCatalog.json";
import { Product, Variant } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CreateOrderItemInput {
  pid?: string;
  vid?: string;
  quantity?: number;
  tier?: number;
}

/**
 * Calculates authoritative server-side cart pricing.
 * Prevents client price tampering by deriving totals strictly from catalog assets.
 */
function calculateAuthoritativeTotal(items: CreateOrderItemInput[]): {
  total: number;
  itemCount: number;
} {
  const catalog = seedData as unknown as Product[];
  let total = 0;
  let count = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    const tier = Number(item.tier) || 1;

    // Match product and variant
    const product = catalog.find(
      (p) =>
        (item.pid && p.pid === item.pid) ||
        p.variants.some((v) => item.vid && v.vid === item.vid)
    );

    if (!product) continue;

    const variant =
      product.variants.find((v) => item.vid && v.vid === item.vid) ||
      product.variants[0];

    if (!variant) continue;

    let unitPrice = Number(variant.retail_price_1x) || 24.99;
    if (tier === 2 && variant.bundle_2_price) {
      unitPrice = +(Number(variant.bundle_2_price) / 2).toFixed(2);
    } else if (tier === 3 && variant.bundle_3_price) {
      unitPrice = +(Number(variant.bundle_3_price) / 3).toFixed(2);
    }

    total += unitPrice * qty;
    count += qty;
  }

  return { total: +total.toFixed(2), itemCount: count };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items = [], currency = "USD", internal_order_number } = body;

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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart items are required to create payment order." },
        { status: 400 }
      );
    }

    // 1. Authoritative Server-Side Price Calculation (Tamper-Proof)
    const { total: authoritativeTotal, itemCount } = calculateAuthoritativeTotal(items);

    if (authoritativeTotal <= 0 || itemCount === 0) {
      return NextResponse.json(
        { error: "Invalid product variants or zero order total." },
        { status: 400 }
      );
    }

    const baseUrl =
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // 2. Obtain OAuth Token server-side
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

    // 3. Create Order server-side with zero-trust validation & idempotency
    const orderNum = internal_order_number || `ORD-PP-${Date.now().toString().slice(-6)}`;

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
            description: `Vastire Order ${orderNum} (${itemCount} item${itemCount > 1 ? "s" : ""})`,
            amount: {
              currency_code: currency.toUpperCase(),
              value: authoritativeTotal.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "Vastire",
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
      authoritative_amount: authoritativeTotal,
    });
  } catch (err: any) {
    console.error("[PayPal Create] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to process payment order at this time." },
      { status: 500 }
    );
  }
}
