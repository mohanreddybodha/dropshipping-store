import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderNumber,
      shipping_name,
      shipping_address,
      shipping_city,
      shipping_province,
      shipping_zip,
      shipping_phone,
      customer_email,
    } = body;

    if (!orderNumber || !shipping_address || !shipping_city || !shipping_province || !shipping_zip) {
      return NextResponse.json(
        { error: "Missing required delivery address fields." },
        { status: 400 }
      );
    }

    // Validate US Zip (5 digits)
    const cleanZip = String(shipping_zip).trim();
    if (!/^\d{5}(-\d{4})?$/.test(cleanZip)) {
      return NextResponse.json(
        { error: "Invalid US ZIP code. Must be a 5-digit postal code." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 1. Fetch order to verify existence and check server-authoritative 30-minute grace period
    const rows = await sql`
      SELECT id, internal_order_number, status, created_at, customer_email
      FROM orders
      WHERE internal_order_number = ${orderNumber}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const order = rows[0];

    // Optional email ownership check if email provided
    if (customer_email && order.customer_email) {
      if (order.customer_email.toLowerCase() !== customer_email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Unauthorized: Email does not match order record." },
          { status: 403 }
        );
      }
    }

    // 2. Server-Side 30-Minute Grace Window Enforcement
    const orderCreatedAt = new Date(order.created_at).getTime();
    const elapsedMinutes = (Date.now() - orderCreatedAt) / (1000 * 60);

    if (elapsedMinutes > 30) {
      return NextResponse.json(
        {
          error:
            "The 30-minute grace window for address modification has expired. Your order is confirmed and queued for warehouse fulfillment.",
        },
        { status: 403 }
      );
    }

    // Disallow address changes once already in progress or shipped
    if (order.status !== "ORDER_PLACED" && order.status !== "PAYMENT_CAPTURED") {
      return NextResponse.json(
        {
          error: `Order cannot be modified in status "${order.status}". Address is locked.`,
        },
        { status: 400 }
      );
    }

    // 3. Atomic Database Update
    await sql`
      UPDATE orders SET
        shipping_name = ${shipping_name?.trim() || null},
        shipping_address = ${shipping_address.trim()},
        shipping_city = ${shipping_city.trim()},
        shipping_province = ${shipping_province.trim().toUpperCase()},
        shipping_zip = ${cleanZip},
        customer_phone = ${shipping_phone ? shipping_phone.trim() : null},
        updated_at = NOW()
      WHERE id = ${order.id}
    `;

    return NextResponse.json({
      success: true,
      message: "Delivery address updated successfully.",
      orderNumber: order.internal_order_number,
      shipping_address: shipping_address.trim(),
      shipping_city: shipping_city.trim(),
      shipping_province: shipping_province.trim().toUpperCase(),
      shipping_zip: cleanZip,
    });
  } catch (err: any) {
    console.error("[Orders Address Update] Error:", err);
    return NextResponse.json(
      { error: "Failed to update delivery address. Please try again." },
      { status: 500 }
    );
  }
}
