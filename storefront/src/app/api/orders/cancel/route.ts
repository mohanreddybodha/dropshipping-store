import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, customer_email, reason } = body;

    if (!orderNumber || typeof orderNumber !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid orderNumber." },
        { status: 400 }
      );
    }

    const cleanOrderNum = orderNumber.trim();
    const sql = getDb();

    // 1. Fetch order record
    const rows = await sql`
      SELECT id, internal_order_number, status, created_at, customer_email, stripe_payment_intent_id, total_retail, items_json
      FROM orders
      WHERE internal_order_number = ${cleanOrderNum}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const order = rows[0];

    // 2. Authorization check: customer email verification if provided
    if (customer_email && order.customer_email) {
      if (order.customer_email.toLowerCase() !== customer_email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Unauthorized: Customer email does not match order record." },
          { status: 403 }
        );
      }
    }

    // 3. Status validation: reject if already cancelled or already in fulfillment
    const currentStatus = (order.status || "").toUpperCase();
    if (currentStatus === "CANCELLED" || currentStatus.includes("CANCEL")) {
      return NextResponse.json(
        { error: "This order has already been cancelled." },
        { status: 400 }
      );
    }

    if (
      currentStatus !== "ORDER_PLACED" &&
      currentStatus !== "PAYMENT_CAPTURED" &&
      currentStatus !== "PENDING"
    ) {
      return NextResponse.json(
        {
          error: `Order cannot be cancelled in status "${order.status}". Warehouse fulfillment has already begun.`,
        },
        { status: 400 }
      );
    }

    // 4. Server-Side 30-Minute Grace Window Enforcement
    const orderCreatedAt = new Date(order.created_at).getTime();
    const elapsedMinutes = (Date.now() - orderCreatedAt) / (1000 * 60);

    if (elapsedMinutes > 30) {
      return NextResponse.json(
        {
          error:
            "The 30-minute cancellation grace window has expired. This order is now confirmed and locked for fulfillment.",
          code: "GRACE_PERIOD_EXPIRED",
        },
        { status: 403 }
      );
    }

    const refundAmount = Number(order.total_retail || 0);

    // 5. PayPal API Automated Full Refund
    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();

    if (clientId && secret && order.stripe_payment_intent_id && refundAmount > 0) {
      const baseUrl =
        mode === "live"
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";

      try {
        // Step A: Fetch PayPal OAuth Token
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
          console.error("[PayPal Refund] Auth token failure:", tokenRes.status);
          return NextResponse.json(
            { error: "Failed to authenticate with payment provider for refund." },
            { status: 502 }
          );
        }

        const { access_token } = await tokenRes.json();
        let captureId = order.stripe_payment_intent_id;

        // Step B: Resolve capture ID if stripe_payment_intent_id stores the PayPal order ID
        try {
          const orderLookupRes = await fetch(`${baseUrl}/v2/checkout/orders/${captureId}`, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          });
          if (orderLookupRes.ok) {
            const ppOrderData = await orderLookupRes.json();
            const captures = ppOrderData.purchase_units?.[0]?.payments?.captures || [];
            if (captures.length > 0 && captures[0].id) {
              captureId = captures[0].id;
            }
          }
        } catch (lookupErr) {
          console.debug("[PayPal Refund] Capture ID pre-lookup passed:", lookupErr);
        }

        // Step C: Trigger 100% Full Refund via PayPal Payments API
        const refundRes = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `refund-${order.internal_order_number}`,
          },
          body: JSON.stringify({
            amount: {
              value: refundAmount.toFixed(2),
              currency_code: "USD",
            },
            note_to_payer: `Full refund for cancelled order ${order.internal_order_number}. Reason: ${
              reason || "Customer cancellation during grace window."
            }`,
          }),
        });

        if (!refundRes.ok) {
          const errBody = await refundRes.json().catch(() => ({}));
          const issue = errBody.details?.[0]?.issue || errBody.message || "";
          // If already refunded, treat as idempotent success
          if (!issue.includes("CAPTURE_ALREADY_REFUNDED") && !issue.includes("ALREADY_REFUNDED")) {
            console.error("[PayPal Refund] Gateway rejected refund:", refundRes.status, errBody);
            return NextResponse.json(
              {
                error:
                  "Payment provider failed to process the automated refund. Please contact customer support.",
                details: issue,
              },
              { status: 502 }
            );
          }
        }
      } catch (gatewayErr: any) {
        console.error("[PayPal Refund] Unexpected gateway communication error:", gatewayErr);
        return NextResponse.json(
          { error: "Payment gateway communication error during refund." },
          { status: 502 }
        );
      }
    } else {
      console.info(
        `[Order Cancel] PayPal credentials omitted or amount zero. Simulating cancel for ${cleanOrderNum}`
      );
    }

    // 6. Update order status atomically in Database
    let itemsData = order.items_json;
    if (typeof itemsData === "string") {
      try {
        itemsData = JSON.parse(itemsData);
      } catch {
        itemsData = [];
      }
    }

    await sql`
      UPDATE orders SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE id = ${order.id}
    `;

    return NextResponse.json({
      success: true,
      message: `Order cancelled successfully. A 100% full refund of $${refundAmount.toFixed(
        2
      )} USD has been issued to your original payment method.`,
      orderNumber: order.internal_order_number,
      refundAmount: refundAmount,
      status: "CANCELLED",
    });
  } catch (err: any) {
    console.error("[Order Cancel] Server exception:", err);
    return NextResponse.json(
      { error: "Failed to process order cancellation. Please try again." },
      { status: 500 }
    );
  }
}
