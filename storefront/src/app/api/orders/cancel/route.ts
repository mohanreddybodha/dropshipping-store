import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyAdminApiKey } from "@/lib/adminAuth";
import {
  getPayPalCredentials,
  getPayPalAccessToken,
  refundPayPalCapture,
  PayPalConfigError,
  PayPalGatewayError,
} from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

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
      SELECT id, internal_order_number, cj_order_id, status, created_at, customer_email, stripe_payment_intent_id, total_retail, items_json
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
      if (!orderCustomerEmail || providedCustomerEmail !== orderCustomerEmail) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "Unauthorized: Customer email does not match order record.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Status & Supplier Dispatch Validation
    const currentStatus = (order.status || "").toUpperCase();
    if (currentStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "This order has already been completely cancelled." },
        { status: 400 }
      );
    }

    if (
      order.cj_order_id ||
      (currentStatus !== "ORDER_PLACED" &&
        currentStatus !== "PAYMENT_CAPTURED" &&
        currentStatus !== "PENDING" &&
        currentStatus !== "PARTIALLY_CANCELLED")
    ) {
      return NextResponse.json(
        {
          error: `Order cannot be cancelled automatically in status "${order.status}". Express fulfillment has already been dispatched to the warehouse — please contact support.`,
        },
        { status: 400 }
      );
    }

    // 4. Server-Side 30-Minute Grace Window Enforcement (Fail-closed on invalid timestamps)
    const orderCreatedAt = new Date(order.created_at).getTime();
    const elapsedMinutes = (Date.now() - orderCreatedAt) / (1000 * 60);

    if (!Number.isFinite(orderCreatedAt) || elapsedMinutes > 30) {
      return NextResponse.json(
        {
          error:
            "The 30-minute cancellation grace window has expired. This order is now confirmed and locked for fulfillment.",
          code: "GRACE_PERIOD_EXPIRED",
        },
        { status: 403 }
      );
    }

    // 5. Parse items & compute cumulative-capped Line-Item or Whole-Order refund
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

    const totalOrderPaid = Math.max(0, Number(order.total_retail || 0));
    const alreadyRefunded = items.reduce((sum: number, it: any) => {
      if ((it?.status || "").toUpperCase() === "CANCELLED") {
        const prev = Number(it.refund_amount || it.total_price || 0);
        return sum + (Number.isFinite(prev) ? prev : 0);
      }
      return sum;
    }, 0);
    const maxRemainingRefundable = Math.max(
      0,
      +(totalOrderPaid - alreadyRefunded).toFixed(2)
    );

    const isItemSpecific =
      typeof itemIndex === "number" &&
      Number.isInteger(itemIndex) &&
      itemIndex >= 0 &&
      itemIndex < items.length;

    let resolvedIndex = -1;
    let targetItem: any = null;
    let refundAmount = 0;

    if (isItemSpecific) {
      resolvedIndex = itemIndex;
      targetItem = items[resolvedIndex];

      // If itemVid was passed and disagrees with itemIndex, locate the matching active VID cleanly
      if (itemVid && targetItem?.vid && targetItem.vid !== itemVid) {
        const vidIdx = items.findIndex(
          (it: any) => it?.vid === itemVid && (it?.status || "").toUpperCase() !== "CANCELLED"
        );
        if (vidIdx === -1) {
          return NextResponse.json(
            { error: "Requested item could not be matched or is already cancelled." },
            { status: 400 }
          );
        }
        resolvedIndex = vidIdx;
        targetItem = items[resolvedIndex];
      }

      if ((targetItem?.status || "").toUpperCase() === "CANCELLED") {
        return NextResponse.json(
          { error: "This specific product has already been cancelled and refunded." },
          { status: 400 }
        );
      }

      const itPrice = Number(targetItem.price || targetItem.unit_price || 0);
      const itQty = Math.max(1, Number(targetItem.quantity || 1));
      const rawLineTotal = +(Number(targetItem.total_price) || itPrice * itQty).toFixed(2);
      refundAmount = +Math.min(rawLineTotal, maxRemainingRefundable).toFixed(2);
    } else {
      const activeItems = items.filter(
        (it: any) => (it?.status || "").toUpperCase() !== "CANCELLED"
      );
      if (items.length > 0 && activeItems.length === 0) {
        return NextResponse.json(
          { error: "All products in this order have already been cancelled." },
          { status: 400 }
        );
      }

      const sumActive = activeItems.reduce((sum: number, it: any) => {
        const itPrice = Number(it.price || it.unit_price || 0);
        const itQty = Math.max(1, Number(it.quantity || 1));
        return sum + (Number(it.total_price) || itPrice * itQty);
      }, 0);

      refundAmount =
        sumActive > 0
          ? +Math.min(sumActive, maxRemainingRefundable).toFixed(2)
          : maxRemainingRefundable;
    }

    if (order.stripe_payment_intent_id && refundAmount <= 0) {
      return NextResponse.json(
        { error: "No refundable balance remains on this order." },
        { status: 400 }
      );
    }

    // 6. Authoritative PayPal Refund Execution (Fail-closed when order has a PayPal txn ID)
    if (order.stripe_payment_intent_id && refundAmount > 0) {
      const creds = getPayPalCredentials({ requireSecret: true });
      const accessToken = await getPayPalAccessToken(creds);

      // Step A: Authoritatively resolve the PayPal Capture ID from the PayPal Order ID
      let captureId = "";
      const orderLookupRes = await fetch(
        `${creds.baseUrl}/v2/checkout/orders/${encodeURIComponent(
          order.stripe_payment_intent_id
        )}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (!orderLookupRes.ok) {
        console.error(
          "[PayPal Refund] Could not resolve PayPal order details:",
          orderLookupRes.status
        );
        return NextResponse.json(
          { error: "Unable to verify payment capture details for refund." },
          { status: 502 }
        );
      }

      const ppOrderData = await orderLookupRes.json();
      const captures = ppOrderData.purchase_units?.[0]?.payments?.captures || [];
      captureId = String(captures?.[0]?.id || "");

      if (!captureId) {
        return NextResponse.json(
          { error: "No completed PayPal capture found to refund." },
          { status: 400 }
        );
      }

      // Step B: Deterministic Idempotency Key (never Date.now()) prevents concurrent double refunds
      const idempotencyKey = isItemSpecific
        ? `refund-${order.internal_order_number}-item-${resolvedIndex}`
        : `refund-${order.internal_order_number}-rem-${Math.round(refundAmount * 100)}`;

      const note = isItemSpecific
        ? `Partial refund for item "${
            targetItem.title || targetItem.product_title || "Item"
          }" in order ${order.internal_order_number}. Reason: ${
            reason || "Customer item cancellation during grace window."
          }`
        : `Full refund for cancelled order ${order.internal_order_number}. Reason: ${
            reason || "Customer cancellation during grace window."
          }`;

      const refundResult = await refundPayPalCapture({
        creds,
        accessToken,
        captureId,
        amount: refundAmount,
        reason: note.slice(0, 255),
        idempotencyKey,
      });

      if (!refundResult.ok) {
        console.error(
          "[PayPal Refund] Gateway rejected refund:",
          refundResult.status,
          refundResult.error
        );
        return NextResponse.json(
          {
            error: "Payment provider failed to process the refund. Please contact customer support.",
            details: refundResult.error,
          },
          { status: 502 }
        );
      }
    }

    // 7. Update order status and items_json atomically in Database
    if (isItemSpecific) {
      targetItem.status = "CANCELLED";
      targetItem.cancelled_at = new Date().toISOString();
      targetItem.refund_amount = refundAmount;
      targetItem.cancel_reason = reason || "Customer item cancellation";

      const allCancelled = items.every(
        (it: any) => (it?.status || "").toUpperCase() === "CANCELLED"
      );
      const newOrderStatus = allCancelled ? "CANCELLED" : "PARTIALLY_CANCELLED";

      await sql`
        UPDATE orders SET
          status = ${newOrderStatus},
          items_json = ${JSON.stringify(items)},
          updated_at = NOW()
        WHERE id = ${order.id}
          AND status != 'CANCELLED'
      `;

      return NextResponse.json({
        success: true,
        message: `Item cancelled successfully. A refund of $${refundAmount.toFixed(
          2
        )} USD has been credited to your PayPal account.`,
        orderNumber: order.internal_order_number,
        itemIndex: resolvedIndex,
        refundAmount: refundAmount,
        orderStatus: newOrderStatus,
        itemStatus: "CANCELLED",
      });
    } else {
      let remaining = refundAmount;
      items.forEach((it: any) => {
        if ((it?.status || "").toUpperCase() !== "CANCELLED") {
          const itemLine = Number(it.total_price || it.price || 0);
          const alloc = Math.min(remaining, itemLine);
          remaining = +(remaining - alloc).toFixed(2);
          it.status = "CANCELLED";
          it.cancelled_at = new Date().toISOString();
          it.refund_amount = alloc;
        }
      });

      await sql`
        UPDATE orders SET
          status = 'CANCELLED',
          items_json = ${JSON.stringify(items)},
          updated_at = NOW()
        WHERE id = ${order.id}
          AND status != 'CANCELLED'
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
    if (err instanceof PayPalConfigError || err instanceof PayPalGatewayError) {
      console.error(`[Order Cancel] ${err.name}:`, err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[Order Cancel] Server exception:", err);
    return NextResponse.json(
      { error: "Failed to process order cancellation. Please try again." },
      { status: 500 }
    );
  }
}
