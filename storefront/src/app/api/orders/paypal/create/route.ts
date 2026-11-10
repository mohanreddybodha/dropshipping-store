import { NextRequest, NextResponse } from "next/server";
import {
  getPayPalCredentials,
  getPayPalAccessToken,
  sanitizeOrderNumber,
  signPayPalOrderCommitment,
  PayPalConfigError,
  PayPalGatewayError,
} from "@/lib/paypal";
import { resolveAuthoritativeCart, CatalogPricingError } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { items = [], internal_order_number } = body as {
      items?: any[];
      internal_order_number?: string;
    };

    // 1. Authoritative Server-Side Catalog & Price Resolution (100% Tamper-Proof)
    const cart = await resolveAuthoritativeCart(items);
    if (cart.total <= 0 || cart.itemCount === 0) {
      return NextResponse.json(
        { error: "Invalid product variants or zero order total." },
        { status: 400 }
      );
    }

    // 2. Load Server Credentials & Obtain PayPal OAuth Bearer Token
    const creds = getPayPalCredentials({ requireSecret: true });
    const accessToken = await getPayPalAccessToken(creds);

    // 3. Cryptographically Commit Cart Contents + Authoritative Total inside custom_id
    const orderNum = sanitizeOrderNumber(internal_order_number);
    const { customId, cartHashPrefix } = signPayPalOrderCommitment(
      {
        total: cart.total,
        currency: "USD",
        items: cart.verifiedItems.map((it) => ({
          vid: it.vid,
          quantity: it.quantity,
        })),
      },
      creds.secret
    );

    const orderRes = await fetch(`${creds.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        // Idempotency key scopes to both order reference and cart commitment hash so
        // modifying cart items on a retry safely creates a fresh order instead of serving a stale total.
        "PayPal-Request-Id": `create-${orderNum}-${cartHashPrefix}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderNum,
            custom_id: customId,
            description: `Vastire Order ${orderNum} (${cart.itemCount} item${
              cart.itemCount > 1 ? "s" : ""
            })`,
            amount: {
              currency_code: "USD",
              value: cart.total.toFixed(2),
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
      signal: AbortSignal.timeout(12_000),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.json().catch(() => ({}));
      console.error(
        "[PayPal Create] Order creation rejected:",
        orderRes.status,
        errBody?.name || errBody?.message || ""
      );
      return NextResponse.json(
        { error: "Payment processor rejected order creation request." },
        { status: 502 }
      );
    }

    const orderData = await orderRes.json();
    return NextResponse.json({
      order_id: orderData.id,
      status: orderData.status,
      authoritative_amount: cart.total,
    });
  } catch (err: any) {
    if (err instanceof CatalogPricingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    if (err instanceof PayPalConfigError || err instanceof PayPalGatewayError) {
      console.error(`[PayPal Create] ${err.name}:`, err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[PayPal Create] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to process payment order at this time." },
      { status: 500 }
    );
  }
}
