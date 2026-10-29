import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest, clientEmail?: string | null): boolean {
  // 1. Direct API Key authentication via header
  const adminKeyHeader = req.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (expectedKey && adminKeyHeader && adminKeyHeader.trim() === expectedKey.trim()) {
    return true;
  }

  // 2. Email-based authentication for Google OAuth admin users
  const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const allowedEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const emailToCheck = (
    clientEmail ||
    req.headers.get("x-admin-email") ||
    req.nextUrl.searchParams.get("admin_email") ||
    ""
  )
    .trim()
    .toLowerCase();

  // If no ADMIN_EMAILS is configured yet, allow the user in dev/local mode if signed in, but log warning
  if (allowedEmails.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    // In production with no ADMIN_EMAILS configured, reject by default for security
    return false;
  }

  return allowedEmails.includes(emailToCheck);
}

// GET: Retrieve all orders for the Admin Command Center
export async function GET(req: NextRequest) {
  try {
    const adminEmail = req.headers.get("x-admin-email") || req.nextUrl.searchParams.get("admin_email");
    if (!isAuthorized(req, adminEmail)) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Unauthorized: Access restricted to authorized administrator Google accounts.",
        },
        { status: 403 }
      );
    }

    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT 200
    `) as DbOrder[];

    const now = Date.now();
    const GRACE_PERIOD_MS = 30 * 60 * 1000;

    const mapped = rows.map((r) => {
      let items = [];
      try {
        items = typeof r.items_json === "string" ? JSON.parse(r.items_json) : r.items_json || [];
      } catch {
        items = [];
      }

      const orderCreatedTime = new Date(r.created_at).getTime();
      const elapsedMs = now - orderCreatedTime;
      const remainingGraceMs = Math.max(0, GRACE_PERIOD_MS - elapsedMs);
      const isGraceActive = remainingGraceMs > 0 && (r.status === "ORDER_PLACED" || r.status === "PAYMENT_CAPTURED");

      return {
        id: r.id,
        internal_order_number: r.internal_order_number,
        cj_order_id: r.cj_order_id || null,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone || "",
        status: r.status,
        total_retail: Number(r.total_retail || 0),
        total_wholesale: Number(r.total_wholesale || 0),
        net_profit: Number(r.net_profit || 0),
        shipping_name: r.shipping_name || "",
        shipping_address: r.shipping_address || "",
        shipping_city: r.shipping_city || "",
        shipping_province: r.shipping_province || "",
        shipping_zip: r.shipping_zip || "",
        shipping_country: r.shipping_country || "US",
        carrier_name: r.carrier_name || "USPS",
        tracking_number: r.tracking_number || null,
        items,
        created_at: r.created_at,
        updated_at: r.updated_at,
        grace_period_remaining_seconds: Math.floor(remainingGraceMs / 1000),
        is_grace_active: isGraceActive,
      };
    });

    return NextResponse.json({
      orders: mapped,
      total: mapped.length,
    });
  } catch (error: any) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to retrieve admin orders." },
      { status: 500 }
    );
  }
}

// PATCH: Update order fulfillment status, CJ Order ID, and tracking
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { internal_order_number, cj_order_id, status, tracking_number, carrier_name } = body;

    const adminEmail = req.headers.get("x-admin-email") || body.admin_email;
    if (!isAuthorized(req, adminEmail)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Unauthorized access to admin fulfillment." },
        { status: 403 }
      );
    }

    if (!internal_order_number) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "internal_order_number is required." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Check if order exists
    const existing = (await sql`
      SELECT id, status FROM orders WHERE internal_order_number = ${internal_order_number} LIMIT 1
    `) as { id: number; status: string }[];

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    }

    const cleanCjOrderId = cj_order_id !== undefined ? (cj_order_id ? String(cj_order_id).trim() : null) : null;
    const cleanTracking = tracking_number !== undefined ? (tracking_number ? String(tracking_number).trim() : null) : null;
    const cleanCarrier = carrier_name ? String(carrier_name).trim() : "USPS";
    const cleanStatus = status ? String(status).trim() : undefined;

    if (cleanStatus) {
      await sql`
        UPDATE orders
        SET 
          status = ${cleanStatus},
          cj_order_id = COALESCE(${cleanCjOrderId}, cj_order_id),
          tracking_number = COALESCE(${cleanTracking}, tracking_number),
          carrier_name = COALESCE(${cleanCarrier}, carrier_name),
          updated_at = NOW()
        WHERE internal_order_number = ${internal_order_number}
      `;
    } else {
      await sql`
        UPDATE orders
        SET 
          cj_order_id = COALESCE(${cleanCjOrderId}, cj_order_id),
          tracking_number = COALESCE(${cleanTracking}, tracking_number),
          carrier_name = COALESCE(${cleanCarrier}, carrier_name),
          updated_at = NOW()
        WHERE internal_order_number = ${internal_order_number}
      `;
    }

    return NextResponse.json({
      success: true,
      message: `Order ${internal_order_number} updated successfully.`,
    });
  } catch (error: any) {
    console.error("Error updating admin order:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to update order fulfillment." },
      { status: 500 }
    );
  }
}
