import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { createCjOrder, resolveItemVid, CjOrderProduct } from "@/lib/cjClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Unauthorized access to admin fulfillment retry." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { internal_order_number } = body;

    if (!internal_order_number || typeof internal_order_number !== "string") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "internal_order_number is required." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM orders
      WHERE internal_order_number = ${internal_order_number.trim()}
      LIMIT 1
    `) as DbOrder[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Order ${internal_order_number} not found.` },
        { status: 404 }
      );
    }

    const order = rows[0];

    // Check if order already has a valid CJ Order ID
    if (order.cj_order_id) {
      return NextResponse.json({
        success: true,
        message: `Order ${internal_order_number} already has active CJ Order ID: ${order.cj_order_id}.`,
        cj_order_id: order.cj_order_id,
        status: order.status,
      });
    }

    let parsedItems: any[] = [];
    try {
      parsedItems =
        typeof order.items_json === "string"
          ? JSON.parse(order.items_json)
          : order.items_json || [];
    } catch {
      parsedItems = [];
    }

    const cjProducts: CjOrderProduct[] = [];
    for (const it of parsedItems) {
      const vid = resolveItemVid(it);
      if (vid) {
        cjProducts.push({ vid, quantity: Number(it.quantity || 1) });
      }
    }

    if (cjProducts.length === 0) {
      const errorMsg = "Unable to resolve valid CJ variant ID (VID) for order items.";
      await sql`
        UPDATE orders SET
          fulfillment_status = 'FULFILLMENT_FAILED',
          fulfillment_error = ${errorMsg},
          dlq_retry_count = COALESCE(dlq_retry_count, 0) + 1,
          updated_at = NOW()
        WHERE id = ${order.id}
      `;
      return NextResponse.json(
        { error: "UNRESOLVABLE_ITEMS", message: errorMsg },
        { status: 422 }
      );
    }

    const cjResult = await createCjOrder({
      orderNumber: order.internal_order_number,
      shippingName: order.shipping_name || "Valued Customer",
      shippingAddress: order.shipping_address || "",
      shippingCity: order.shipping_city || "",
      shippingProvince: order.shipping_province || "CA",
      shippingZip: order.shipping_zip || "",
      shippingCountryCode: order.shipping_country || "US",
      shippingPhone: order.customer_phone || "2135550199",
      customerEmail: order.customer_email,
      products: cjProducts,
      logisticName: "USPS US to US",
      remark: "Vastire Headless Store Order (Manual Admin Retry)",
    });

    if (cjResult.success) {
      const cjOrderId = cjResult.cjOrderId || null;
      await sql`
        UPDATE orders SET
          cj_order_id = ${cjOrderId},
          status = 'SUPPLIER_PROCESSING',
          fulfillment_status = 'SUPPLIER_PROCESSING',
          fulfillment_error = NULL,
          updated_at = NOW()
        WHERE id = ${order.id}
      `;

      return NextResponse.json({
        success: true,
        message: `Fulfillment succeeded. Order pushed to CJ Dropshipping with ID: ${cjOrderId || "Confirmed"}.`,
        cj_order_id: cjOrderId,
        status: "SUPPLIER_PROCESSING",
      });
    } else {
      const retryCount = (Number(order.dlq_retry_count) || 0) + 1;
      await sql`
        UPDATE orders SET
          fulfillment_status = 'FULFILLMENT_FAILED',
          fulfillment_error = ${cjResult.message || "CJ retry failed"},
          dlq_retry_count = ${retryCount},
          updated_at = NOW()
        WHERE id = ${order.id}
      `;

      return NextResponse.json(
        {
          success: false,
          error: "FULFILLMENT_FAILED",
          message: cjResult.message || "Supplier dispatch failed.",
          dlq_retry_count: retryCount,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Error retrying order fulfillment:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Internal retry error." },
      { status: 500 }
    );
  }
}
