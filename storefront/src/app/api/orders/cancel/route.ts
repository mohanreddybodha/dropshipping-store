import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyAdminApiKey } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, customer_email, reason, itemIndex, itemVid } = body;

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

    // 2. Strict Zero-Trust Authorization: Prevent BOLA / IDOR cancellations
    const isAdmin = verifyAdminApiKey(req);
    const orderCustomerEmail = (order.customer_email || "").trim().toLowerCase();
    const providedCustomerEmail = (customer_email || "").trim().toLowerCase();

    if (!isAdmin) {
      if (!providedCustomerEmail) {
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message: "Customer email is required to authorize order cancellation.",
          },
          { status: 401 }
        );
      }
      if (orderCustomerEmail && providedCustomerEmail !== orderCustomerEmail) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "Unauthorized: Customer email does not match order record.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Status validation: reject if already cancelled or already in fulfillment
    const currentStatus = (order.status || "").toUpperCase();
    if (currentStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "This order has already been completely cancelled." },
        { status: 400 }
      );
    }

    if (
      currentStatus !== "ORDER_PLACED" &&
      currentStatus !== "PAYMENT_CAPTURED" &&
      currentStatus !== "PENDING" &&
      currentStatus !== "PARTIALLY_CANCELLED"
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

    // 5. Parse items and determine Line-Item vs Whole-Order refund
    let items: any[] = [];
    if (typeof order.items_json === "string") {
      try {
        items = JSON.parse(order.items_json);
      } catch {
        items = [];
      }
    } else if (Array.isArray(order.items_json)) {
      items = order.items_json;
    }

    const isItemSpecific =
      typeof itemIndex === "number" &&
      itemIndex >= 0 &&
      itemIndex < items.length;

    let targetItem: any = null;
    let refundAmount = 0;

    if (isItemSpecific) {
      targetItem = items[itemIndex];
      // Double check VID alignment if provided
      if (itemVid && targetItem.vid && targetItem.vid !== itemVid) {
        const found = items.find((it: any) => it.vid === itemVid);
        if (found) targetItem = found;
      }

      if ((targetItem.status || "").toUpperCase() === "CANCELLED") {
        return NextResponse.json(
          { error: "This specific product has already been cancelled and refunded." },
          { status: 400 }
        );
      }

      const itPrice = Number(targetItem.price || targetItem.unit_price || 0);
      const itQty = Number(targetItem.quantity || 1);
      refundAmount = +(Number(targetItem.total_price) || (itPrice * itQty)).toFixed(2);
    } else {
      const activeItems = items.filter(
        (it: any) => (it.status || "").toUpperCase() !== "CANCELLED"
      );
      if (items.length > 0 && activeItems.length === 0) {
        return NextResponse.json(
          { error: "All products in this order have already been cancelled." },
          { status: 400 }
        );
      }

      refundAmount = activeItems.reduce((sum: number, it: any) => {
        const itPrice = Number(it.price || it.unit_price || 0);
        const itQty = Number(it.quantity || 1);
        return sum + (Number(it.total_price) || (itPrice * itQty));
      }, 0);

      if (refundAmount <= 0) {
        refundAmount = Number(order.total_retail || 0);
      }
      refundAmount = +refundAmount.toFixed(2);
    }

    // 6. PayPal API Automated Refund (Full or Partial for the specific item)
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

        // Step C: Trigger Automated Refund via PayPal Payments API
        const idempotencyKey = isItemSpecific
          ? `refund-${order.internal_order_number}-item-${itemIndex}-${Date.now()}`
          : `refund-${order.internal_order_number}-full-${Date.now()}`;

        const note = isItemSpecific
          ? `Partial refund for item "${targetItem.title || targetItem.product_title || "Item"}" in order ${order.internal_order_number}. Reason: ${reason || "Customer item cancellation during grace window."}`
          : `Full refund for cancelled order ${order.internal_order_number}. Reason: ${reason || "Customer cancellation during grace window."}`;

        const refundRes = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": idempotencyKey,
          },
          body: JSON.stringify({
            amount: {
              value: refundAmount.toFixed(2),
              currency_code: "USD",
            },
            note_to_payer: note,
          }),
        });

        if (!refundRes.ok) {
          const errBody = await refundRes.json().catch(() => ({}));
          const issue = errBody.details?.[0]?.issue || errBody.message || "";
          if (!issue.includes("CAPTURE_ALREADY_REFUNDED") && !issue.includes("ALREADY_REFUNDED")) {
            console.error("[PayPal Refund] Gateway rejected refund:", refundRes.status, errBody);
            return NextResponse.json(
              {
                error: "Payment provider failed to process the refund. Please contact customer support.",
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

    // 7. Update order status and items_json atomically in Database
    if (isItemSpecific) {
      targetItem.status = "CANCELLED";
      targetItem.cancelled_at = new Date().toISOString();
      targetItem.refund_amount = refundAmount;
      targetItem.cancel_reason = reason || "Customer item cancellation";

      const allCancelled = items.every(
        (it: any) => (it.status || "").toUpperCase() === "CANCELLED"
      );
      const newOrderStatus = allCancelled ? "CANCELLED" : "PARTIALLY_CANCELLED";

      await sql`
        UPDATE orders SET
          status = ${newOrderStatus},
          items_json = ${JSON.stringify(items)},
          updated_at = NOW()
        WHERE id = ${order.id}
      `;

      return NextResponse.json({
        success: true,
        message: `Item cancelled successfully. A refund of $${refundAmount.toFixed(
          2
        )} USD has been credited to your PayPal account.`,
        orderNumber: order.internal_order_number,
        itemIndex: itemIndex,
        refundAmount: refundAmount,
        orderStatus: newOrderStatus,
        itemStatus: "CANCELLED",
      });
    } else {
      items.forEach((it: any) => {
        it.status = "CANCELLED";
        it.cancelled_at = new Date().toISOString();
        it.refund_amount = it.total_price || it.price || 0;
      });

      await sql`
        UPDATE orders SET
          status = 'CANCELLED',
          items_json = ${JSON.stringify(items)},
          updated_at = NOW()
        WHERE id = ${order.id}
      `;

      return NextResponse.json({
        success: true,
        message: `Order cancelled successfully. A refund of $${refundAmount.toFixed(
          2
        )} USD has been credited to your PayPal account.`,
        orderNumber: order.internal_order_number,
        refundAmount: refundAmount,
        orderStatus: "CANCELLED",
      });
    }
  } catch (err: any) {
    console.error("[Order Cancel] Server exception:", err);
    return NextResponse.json(
      { error: "Failed to process order cancellation. Please try again." },
      { status: 500 }
    );
  }
}
