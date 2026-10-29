import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper to authenticate with CJ API v2.0
async function getCjAccessToken(email: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, apiKey }),
    });
    const json = await res.json();
    if (json.code === 200 && json.data?.accessToken) {
      return json.data.accessToken;
    }
    return null;
  } catch (err) {
    console.error("CJ Auth token error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminKeyHeader = req.headers.get("x-admin-api-key");
    const expectedKey = process.env.ADMIN_API_KEY;
    const adminEmail = (req.headers.get("x-admin-email") || "").toLowerCase().trim();
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAuthorized =
      (expectedKey && adminKeyHeader === expectedKey) ||
      (adminEmails.length > 0 && adminEmails.includes(adminEmail)) ||
      (adminEmails.length === 0 && process.env.NODE_ENV !== "production");

    if (!isAuthorized) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Unauthorized admin access." }, { status: 403 });
    }

    const cjEmail = process.env.CJ_EMAIL;
    const cjApiKey = process.env.CJ_API_KEY;

    const sql = getDb();

    // Find all active orders awaiting tracking with CJ order numbers
    const activeOrders = (await sql`
      SELECT id, internal_order_number, cj_order_id, status, tracking_number
      FROM orders
      WHERE cj_order_id IS NOT NULL 
        AND cj_order_id != ''
        AND (status = 'SUPPLIER_PROCESSING' OR status = 'CONFIRMED' OR status = 'ORDER_PLACED')
      LIMIT 50
    `) as DbOrder[];

    if (activeOrders.length === 0) {
      return NextResponse.json({
        message: "No active orders pending CJ tracking sync.",
        checked: 0,
        synced: 0,
      });
    }

    if (!cjEmail || !cjApiKey) {
      return NextResponse.json({
        message: "CJ_EMAIL or CJ_API_KEY not configured in environment. Skipped remote CJ API queries.",
        checked: activeOrders.length,
        synced: 0,
        unfulfilled_orders: activeOrders.map((o) => ({
          order_number: o.internal_order_number,
          cj_order_id: o.cj_order_id,
        })),
      });
    }

    // Authenticate with CJ API
    const accessToken = await getCjAccessToken(cjEmail, cjApiKey);
    if (!accessToken) {
      return NextResponse.json(
        { error: "CJ_AUTH_FAILED", message: "Failed to authenticate with CJ Dropshipping API." },
        { status: 502 }
      );
    }

    const updatedOrders: { order_number: string; tracking_number: string; carrier: string }[] = [];

    // Query tracking for each order
    for (const order of activeOrders) {
      try {
        const queryUrl = `https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId=${encodeURIComponent(
          order.cj_order_id!
        )}`;

        const resp = await fetch(queryUrl, {
          headers: {
            "CJ-Access-Token": accessToken,
          },
        });

        if (!resp.ok) continue;
        const resJson = await resp.json();
        const data = resJson.data;

        if (!data) continue;

        // CJ provides trackingNumber directly or in logisticList
        const trackingNum =
          data.trackingNumber ||
          data.trackNumber ||
          (data.logisticList && data.logisticList[0]?.trackingNumber);
        const carrier =
          data.logisticName ||
          (data.logisticList && data.logisticList[0]?.logisticName) ||
          "USPS";

        if (trackingNum) {
          await sql`
            UPDATE orders
            SET 
              tracking_number = ${trackingNum},
              carrier_name = ${carrier},
              status = 'SHIPPED',
              updated_at = NOW()
            WHERE internal_order_number = ${order.internal_order_number}
          `;

          updatedOrders.push({
            order_number: order.internal_order_number,
            tracking_number: trackingNum,
            carrier,
          });
        }
      } catch (err) {
        console.error(`Failed to sync CJ tracking for order ${order.internal_order_number}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: activeOrders.length,
      synced: updatedOrders.length,
      updated_orders: updatedOrders,
    });
  } catch (error: any) {
    console.error("CJ sync error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to sync with CJ." },
      { status: 500 }
    );
  }
}
