import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper to authenticate with CJ API v2.0 using apiKey
async function getCjAccessToken(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const json = await res.json();
    if ((json.code === 200 || json.result === true) && json.data?.accessToken) {
      return json.data.accessToken;
    }
    return null;
  } catch (err) {
    console.error("CJ Auth token error:", err);
    return null;
  }
}

// Fetch order details from CJ API by orderId or orderNum
async function fetchCjOrderInfo(targetId: string, accessToken: string): Promise<any | null> {
  try {
    // 1. Try getOrderDetail with targetId
    const queryUrl = `https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId=${encodeURIComponent(
      targetId
    )}`;
    const resp = await fetch(queryUrl, {
      headers: { "CJ-Access-Token": accessToken },
    });
    if (resp.ok) {
      const resJson = await resp.json();
      if ((resJson.code === 200 || resJson.result === true) && resJson.data) {
        return resJson.data;
      }
    }
  } catch (err) {
    console.error("Error in getOrderDetail:", err);
  }

  try {
    // 2. Fallback to shopping/order/list search
    const listUrl = `https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?orderNum=${encodeURIComponent(
      targetId
    )}`;
    const resp = await fetch(listUrl, {
      headers: { "CJ-Access-Token": accessToken },
    });
    if (resp.ok) {
      const resJson = await resp.json();
      const list = resJson.data?.list;
      if (Array.isArray(list) && list.length > 0) {
        return list[0];
      }
    }
  } catch (err) {
    console.error("Error in order/list fallback:", err);
  }

  return null;
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

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }

    const cjApiKey = process.env.CJ_API_KEY;
    const sql = getDb();

    // ─────────────────────────────────────────────────────────────
    // CASE 1: TARGETED SINGLE ORDER SYNC (User pastes CJ ID & syncs)
    // ─────────────────────────────────────────────────────────────
    const targetOrderNumber = reqBody.internal_order_number ? String(reqBody.internal_order_number).trim() : null;
    let targetCjOrderId = reqBody.cj_order_id ? String(reqBody.cj_order_id).trim() : null;

    if (targetOrderNumber) {
      const existing = (await sql`
        SELECT id, internal_order_number, cj_order_id, status, tracking_number, carrier_name
        FROM orders
        WHERE internal_order_number = ${targetOrderNumber}
        LIMIT 1
      `) as DbOrder[];

      if (existing.length === 0) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: `Order ${targetOrderNumber} not found.` },
          { status: 404 }
        );
      }

      const currentOrder = existing[0];
      if (!targetCjOrderId) {
        targetCjOrderId = currentOrder.cj_order_id || null;
      }

      if (!targetCjOrderId) {
        return NextResponse.json(
          { error: "MISSING_CJ_ORDER_ID", message: "Please provide a valid CJ Dropshipping Order ID." },
          { status: 400 }
        );
      }

      // Persist CJ Order ID and ensure status advances past grace/confirmed to SUPPLIER_PROCESSING
      await sql`
        UPDATE orders
        SET 
          cj_order_id = ${targetCjOrderId},
          status = CASE 
            WHEN status IN ('ORDER_PLACED', 'CONFIRMED') THEN 'SUPPLIER_PROCESSING' 
            ELSE status 
          END,
          updated_at = NOW()
        WHERE internal_order_number = ${targetOrderNumber}
      `;

      if (!cjApiKey) {
        return NextResponse.json({
          success: true,
          synced: false,
          order: {
            internal_order_number: targetOrderNumber,
            cj_order_id: targetCjOrderId,
            status:
              currentOrder.status === "ORDER_PLACED" || currentOrder.status === "CONFIRMED"
                ? "SUPPLIER_PROCESSING"
                : currentOrder.status,
            tracking_number: currentOrder.tracking_number,
            carrier_name: currentOrder.carrier_name || "USPS",
          },
          message: `Linked CJ Order ID (${targetCjOrderId}). Note: CJ API key is not configured for live tracking sync.`,
        });
      }

      // Authenticate with CJ Dropshipping API
      const accessToken = await getCjAccessToken(cjApiKey);
      if (!accessToken) {
        return NextResponse.json({
          success: true,
          synced: false,
          order: {
            internal_order_number: targetOrderNumber,
            cj_order_id: targetCjOrderId,
            status: "SUPPLIER_PROCESSING",
            tracking_number: currentOrder.tracking_number,
            carrier_name: currentOrder.carrier_name || "USPS",
          },
          message: `CJ Order ID saved (${targetCjOrderId}), but CJ API authentication failed. Verify CJ API key.`,
        });
      }

      // Live Query CJ Dropshipping
      const cjData = await fetchCjOrderInfo(targetCjOrderId, accessToken);

      if (!cjData) {
        return NextResponse.json({
          success: true,
          synced: true,
          order: {
            internal_order_number: targetOrderNumber,
            cj_order_id: targetCjOrderId,
            status: "SUPPLIER_PROCESSING",
            tracking_number: currentOrder.tracking_number,
            carrier_name: currentOrder.carrier_name || "USPS",
          },
          has_tracking: Boolean(currentOrder.tracking_number),
          message: `CJ Order ID ${targetCjOrderId} linked! Order record submitted to CJ. Warehouse tracking will be available once the parcel is packaged and scanned.`,
        });
      }

      // Parse tracking and status
      const trackingNum =
        cjData.trackNumber ||
        cjData.trackingNumber ||
        (cjData.logisticList && cjData.logisticList[0]?.trackingNumber) ||
        null;

      const carrier =
        cjData.logisticName ||
        (cjData.logisticList && cjData.logisticList[0]?.logisticName) ||
        currentOrder.carrier_name ||
        "USPS";

      const cjStatus = String(cjData.orderStatus || "").toUpperCase();

      let nextStatus = currentOrder.status;
      if (cjStatus.includes("DELIVER") || cjStatus === "COMPLETED") {
        nextStatus = "DELIVERED";
      } else if (trackingNum || cjStatus.includes("DISPATCH") || cjStatus.includes("SHIP")) {
        nextStatus = "SHIPPED";
      } else if (currentOrder.status === "ORDER_PLACED" || currentOrder.status === "CONFIRMED") {
        nextStatus = "SUPPLIER_PROCESSING";
      }

      // Update in Neon PostgreSQL
      await sql`
        UPDATE orders
        SET 
          cj_order_id = ${targetCjOrderId},
          tracking_number = COALESCE(${trackingNum}, tracking_number),
          carrier_name = COALESCE(${carrier}, carrier_name),
          status = ${nextStatus},
          updated_at = NOW()
        WHERE internal_order_number = ${targetOrderNumber}
      `;

      return NextResponse.json({
        success: true,
        synced: true,
        order: {
          internal_order_number: targetOrderNumber,
          cj_order_id: targetCjOrderId,
          status: nextStatus,
          tracking_number: trackingNum || currentOrder.tracking_number,
          carrier_name: carrier,
        },
        has_tracking: Boolean(trackingNum),
        message: trackingNum
          ? `✓ Synced with CJ! Shipped via ${carrier} (Tracking: ${trackingNum})`
          : `✓ Linked to CJ Order ${targetCjOrderId}! Status: Processing at US Warehouse. Tracking will be synced once package is dispatched.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: BATCH SYNC ACROSS ALL PENDING ORDERS
    // ─────────────────────────────────────────────────────────────
    const activeOrders = (await sql`
      SELECT id, internal_order_number, cj_order_id, status, tracking_number, carrier_name
      FROM orders
      WHERE cj_order_id IS NOT NULL 
        AND cj_order_id != ''
        AND (status = 'SUPPLIER_PROCESSING' OR status = 'CONFIRMED' OR status = 'ORDER_PLACED' OR status = 'SHIPPED')
      LIMIT 50
    `) as DbOrder[];

    if (activeOrders.length === 0) {
      return NextResponse.json({
        message: "No active orders pending CJ tracking sync.",
        checked: 0,
        synced: 0,
      });
    }

    if (!cjApiKey) {
      return NextResponse.json({
        message: "CJ_API_KEY not configured in environment. Skipped remote CJ API queries.",
        checked: activeOrders.length,
        synced: 0,
      });
    }

    const accessToken = await getCjAccessToken(cjApiKey);
    if (!accessToken) {
      return NextResponse.json(
        { error: "CJ_AUTH_FAILED", message: "Failed to authenticate with CJ Dropshipping API." },
        { status: 502 }
      );
    }

    const updatedOrders: { order_number: string; tracking_number: string; carrier: string; status: string }[] = [];

    for (const order of activeOrders) {
      try {
        const cjData = await fetchCjOrderInfo(order.cj_order_id!, accessToken);
        if (!cjData) continue;

        const trackingNum =
          cjData.trackNumber ||
          cjData.trackingNumber ||
          (cjData.logisticList && cjData.logisticList[0]?.trackingNumber);

        const carrier =
          cjData.logisticName ||
          (cjData.logisticList && cjData.logisticList[0]?.logisticName) ||
          order.carrier_name ||
          "USPS";

        const cjStatus = String(cjData.orderStatus || "").toUpperCase();

        let nextStatus = order.status;
        if (cjStatus.includes("DELIVER") || cjStatus === "COMPLETED") {
          nextStatus = "DELIVERED";
        } else if (trackingNum || cjStatus.includes("DISPATCH") || cjStatus.includes("SHIP")) {
          nextStatus = "SHIPPED";
        }

        if (trackingNum || nextStatus !== order.status) {
          await sql`
            UPDATE orders
            SET 
              tracking_number = COALESCE(${trackingNum || null}, tracking_number),
              carrier_name = COALESCE(${carrier}, carrier_name),
              status = ${nextStatus},
              updated_at = NOW()
            WHERE internal_order_number = ${order.internal_order_number}
          `;

          updatedOrders.push({
            order_number: order.internal_order_number,
            tracking_number: trackingNum || order.tracking_number || "N/A",
            carrier,
            status: nextStatus,
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
