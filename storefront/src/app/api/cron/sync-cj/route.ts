import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, DbOrder } from "@/lib/db";
import { fetchCjOrderTracking } from "@/lib/cjClient";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds execution limit on Vercel

function verifyCronSecret(req: NextRequest): boolean {
  const validSecrets = [process.env.CRON_SECRET, process.env.ADMIN_API_KEY].filter(Boolean) as string[];
  if (validSecrets.length === 0) return false;

  const authHeader = req.headers.get("authorization") || "";
  const customHeader = req.headers.get("x-cron-secret") || "";

  let candidate = "";
  if (authHeader.startsWith("Bearer ")) {
    candidate = authHeader.slice(7).trim();
  } else if (customHeader) {
    candidate = customHeader.trim();
  }

  if (!candidate) return false;

  const candidateBuf = Buffer.from(candidate);
  for (const secret of validSecrets) {
    const secretBuf = Buffer.from(secret);
    if (candidateBuf.length === secretBuf.length && crypto.timingSafeEqual(candidateBuf, secretBuf)) {
      return true;
    }
  }
  return false;
}

async function handleSync(req: NextRequest) {
  // 1. Authorization: Allow valid CRON_SECRET or verified Admin session/key
  const isCronAuthed = verifyCronSecret(req);
  if (!isCronAuthed) {
    const adminAuth = await verifyAdminAuth(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid or missing cron/admin authentication secret." },
        { status: 401 }
      );
    }
  }

  const sql = getDb();
  const startTime = new Date();
  const errors: Array<{ order_number: string; error: string }> = [];
  const updatedOrders: Array<{ internal_order_number: string; cj_order_id: string; tracking_number: string; carrier_name: string }> = [];

  try {
    // 2. Select eligible orders:
    // Either in SUPPLIER_PROCESSING / PAID, or missing tracking with a cj_order_id, within the last 30 days
    const eligibleOrders = (await sql`
      SELECT id, internal_order_number, cj_order_id, status, tracking_number, carrier_name
      FROM orders
      WHERE cj_order_id IS NOT NULL 
        AND status NOT IN ('CANCELLED', 'DELIVERED')
        AND (
          tracking_number IS NULL OR 
          status IN ('PAID', 'SUPPLIER_PROCESSING', 'PROCESSING')
        )
      ORDER BY updated_at ASC
      LIMIT 30;
    `) as DbOrder[];

    let processedCount = 0;
    let updatedCount = 0;

    for (const order of eligibleOrders) {
      processedCount++;
      const cjId = order.cj_order_id?.trim();
      if (!cjId) continue;

      try {
        const trackingInfo = await fetchCjOrderTracking(cjId);
        if (!trackingInfo || !trackingInfo.found) {
          continue;
        }

        const newTracking = trackingInfo.tracking_number?.trim() || null;
        const newCarrier = trackingInfo.carrier_name?.trim() || order.carrier_name || "USPS";
        const cjStatus = (trackingInfo.status || "").toUpperCase();

        let nextStatus = order.status;
        if (newTracking && nextStatus !== "DELIVERED") {
          nextStatus = "SHIPPED";
        }
        if (cjStatus.includes("DELIVER") || cjStatus.includes("COMPLETE")) {
          nextStatus = "DELIVERED";
        }

        // If tracking number was discovered or status transitioned
        if (
          (newTracking && newTracking !== order.tracking_number) ||
          (nextStatus !== order.status)
        ) {
          await sql`
            UPDATE orders
            SET 
              tracking_number = COALESCE(${newTracking}, tracking_number),
              carrier_name = ${newCarrier},
              status = ${nextStatus},
              fulfillment_status = ${nextStatus},
              updated_at = NOW()
            WHERE id = ${order.id};
          `;

          updatedCount++;
          updatedOrders.push({
            internal_order_number: order.internal_order_number,
            cj_order_id: cjId,
            tracking_number: newTracking || order.tracking_number || "N/A",
            carrier_name: newCarrier,
          });
        }
      } catch (orderErr: any) {
        errors.push({
          order_number: order.internal_order_number,
          error: orderErr?.message || "Tracking sync exception",
        });
      }
    }

    // 3. Persist audit log record in sync_audit_logs table
    try {
      await sql`
        INSERT INTO sync_audit_logs (
          sync_type,
          items_processed,
          items_updated,
          errors_json,
          timestamp
        ) VALUES (
          'CRON_CJ_TRACKING',
          ${processedCount},
          ${updatedCount},
          ${errors.length > 0 ? JSON.stringify(errors) : null},
          ${startTime}
        );
      `;
    } catch (auditErr) {
      console.error("[Cron Sync] Audit log persistence error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      timestamp: startTime.toISOString(),
      items_processed: processedCount,
      items_updated: updatedCount,
      updated_orders: updatedOrders,
      errors_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[Cron Sync] Fatal sync exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SYNC_ERROR",
        message: err?.message || "Fatal error during automated tracking sync.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}
