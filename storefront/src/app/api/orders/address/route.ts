import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyAdminApiKey } from "@/lib/adminAuth";
import {
  US_STATE_ZIP_PREFIXES,
  validateUsStreetAddress,
  validateUsCity,
  validateUsZip,
  validateUsPhone,
} from "@/lib/usAddressValidation";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

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

    const cleanProvince = String(shipping_province).trim().toUpperCase();
    if (!US_STATE_ZIP_PREFIXES[cleanProvince] || cleanProvince === "AK" || cleanProvince === "HI") {
      return NextResponse.json(
        { error: "Delivery state must be within the 48 Contiguous United States." },
        { status: 400 }
      );
    }

    const streetVal = validateUsStreetAddress(String(shipping_address));
    if (!streetVal.isValid) {
      return NextResponse.json(
        { error: streetVal.error || "Invalid US street address." },
        { status: 400 }
      );
    }

    const cityVal = validateUsCity(String(shipping_city));
    if (!cityVal.isValid) {
      return NextResponse.json(
        { error: cityVal.error || "Invalid US city." },
        { status: 400 }
      );
    }

    const zipVal = validateUsZip(String(shipping_zip), cleanProvince);
    if (!zipVal.isValid || !zipVal.formatted) {
      return NextResponse.json(
        { error: zipVal.error || "Invalid US ZIP code matching the selected state." },
        { status: 400 }
      );
    }
    const cleanZip = zipVal.formatted;

    let cleanPhone: string | null = null;
    if (shipping_phone && String(shipping_phone).trim()) {
      const phoneVal = validateUsPhone(String(shipping_phone));
      if (!phoneVal.isValid || !phoneVal.formatted) {
        return NextResponse.json(
          { error: phoneVal.error || "Invalid 10-digit US phone number." },
          { status: 400 }
        );
      }
      cleanPhone = phoneVal.formatted;
    }

    // Fail-fast Zero-Trust Authorization check: Prevent BOLA / IDOR address hijacking
    const isAdmin = verifyAdminApiKey(req);
    const providedCustomerEmail = (customer_email || "").trim().toLowerCase();

    if (!isAdmin && !providedCustomerEmail) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Customer email is required to authorize delivery address modification.",
        },
        { status: 401 }
      );
    }

    const sql = getDb();

    // 1. Fetch order to verify existence and check server-authoritative 30-minute grace period
    const rows = await sql`
      SELECT id, internal_order_number, cj_order_id, status, created_at, customer_email
      FROM orders
      WHERE internal_order_number = ${String(orderNumber).trim()}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const order = rows[0];
    const orderCustomerEmail = (order.customer_email || "").trim().toLowerCase();

    if (!isAdmin) {
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

    // 2. Server-Side 30-Minute Grace Window Enforcement (fail-closed on NaN)
    const orderCreatedAt = new Date(order.created_at).getTime();
    const elapsedMinutes = (Date.now() - orderCreatedAt) / (1000 * 60);

    if (!Number.isFinite(orderCreatedAt) || elapsedMinutes > 30) {
      return NextResponse.json(
        {
          error:
            "The 30-minute grace window for address modification has expired. Your order is confirmed and queued for warehouse fulfillment.",
        },
        { status: 403 }
      );
    }

    // Disallow address changes once dispatched to CJ or already in progress/shipped
    if (order.cj_order_id || (order.status !== "ORDER_PLACED" && order.status !== "PAYMENT_CAPTURED")) {
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
        shipping_address = ${String(shipping_address).trim()},
        shipping_city = ${String(shipping_city).trim()},
        shipping_province = ${cleanProvince},
        shipping_zip = ${cleanZip},
        customer_phone = COALESCE(${cleanPhone}, customer_phone),
        updated_at = NOW()
      WHERE id = ${order.id}
    `;

    return NextResponse.json({
      success: true,
      message: "Delivery address updated successfully.",
      orderNumber: order.internal_order_number,
      shipping_address: String(shipping_address).trim(),
      shipping_city: String(shipping_city).trim(),
      shipping_province: cleanProvince,
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
