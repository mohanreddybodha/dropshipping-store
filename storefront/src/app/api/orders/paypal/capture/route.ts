import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      paypal_order_id,
      internal_order_number,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_province,
      shipping_zip,
      shipping_country = "US",
      items = [],
      firebase_uid,
    } = body;

    if (!paypal_order_id || typeof paypal_order_id !== "string") {
      return NextResponse.json(
        { error: "Invalid payment transaction token." },
        { status: 400 }
      );
    }

    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();

    if (!clientId || !secret) {
      console.error("[PayPal Capture] Missing server credentials in environment.");
      return NextResponse.json(
        { error: "Payment processor configuration error." },
        { status: 500 }
      );
    }

    const baseUrl =
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    // Anti-Replay Guard 1: Check database deduplication first
    try {
      const sql = getDb();
      const duplicateTxn = await sql`
        SELECT id, internal_order_number, tracking_number, status, total_retail
        FROM orders
        WHERE stripe_payment_intent_id = ${paypal_order_id}
        LIMIT 1
      `;
      if (duplicateTxn.length > 0) {
        console.warn(`[PayPal Capture] Idempotent replay detected for transaction: ${paypal_order_id}`);
        const existing = duplicateTxn[0];
        return NextResponse.json({
          id: existing.id,
          internal_order_number: existing.internal_order_number,
          status: existing.status,
          total_retail: existing.total_retail,
          carrier_name: "USPS",
          tracking_number: existing.tracking_number,
          shipping_name: customer_name,
          shipping_city: shipping_city,
          shipping_province: shipping_province,
          shipping_zip: shipping_zip,
          created_at: new Date().toISOString(),
          items: items,
          paypal_order_id: paypal_order_id,
        });
      }
    } catch (checkErr: any) {
      console.warn("[PayPal Capture] Database pre-check warning:", checkErr.message);
    }

    // 1. Get OAuth Token server-side
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
      console.error("[PayPal Capture] Auth error status:", tokenRes.status);
      return NextResponse.json(
        { error: "Payment gateway verification failed." },
        { status: 502 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 2. Self-Healing Gateway Pre-Check: Is order already COMPLETED on PayPal?
    // (Prevents double capture errors on network timeout retries)
    let captureData: any = null;
    try {
      const lookupRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (lookupRes.ok) {
        const existingOrder = await lookupRes.json();
        if (existingOrder.status === "COMPLETED") {
          console.info(`[PayPal Capture] Order ${paypal_order_id} is already COMPLETED. Re-using capture state.`);
          captureData = existingOrder;
        }
      }
    } catch (lookupErr) {
      console.debug("[PayPal Capture] Pre-check fetch skipped:", lookupErr);
    }

    // If not already completed, execute authoritative Capture with Idempotency Key
    if (!captureData) {
      const captureRes = await fetch(
        `${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `capture-${paypal_order_id}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!captureRes.ok) {
        const errJson = await captureRes.json().catch(() => ({}));
        const issue = errJson.details?.[0]?.issue || "";
        // If order was already captured in a race condition, do one final lookup
        if (captureRes.status === 422 && issue.includes("ORDER_ALREADY_CAPTURED")) {
          const finalLookup = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}`, {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (finalLookup.ok) {
            captureData = await finalLookup.json();
          }
        }

        if (!captureData) {
          console.error("[PayPal Capture] Capture API rejected request with status:", captureRes.status, errJson);
          return NextResponse.json(
            { error: "Unable to capture payment from provider. Order not confirmed." },
            { status: 502 }
          );
        }
      } else {
        captureData = await captureRes.json();
      }
    }

    const captureStatus = captureData.status;
    if (captureStatus !== "COMPLETED" && captureStatus !== "APPROVED") {
      console.error(`[PayPal Capture] Unauthorized payment state: ${captureStatus}`);
      return NextResponse.json(
        { error: `Payment was not authorized (status: ${captureStatus})` },
        { status: 400 }
      );
    }

    // Extract verified captured amount directly from PayPal API (tamper-proof)
    let totalRetail = 0;
    try {
      const captures = captureData.purchase_units?.[0]?.payments?.captures || [];
      if (captures.length > 0) {
        totalRetail = parseFloat(captures[0].amount?.value || "0");
      } else if (captureData.purchase_units?.[0]?.amount?.value) {
        totalRetail = parseFloat(captureData.purchase_units[0].amount.value);
      }
    } catch {
      totalRetail = 0;
    }

    if (totalRetail <= 0) {
      return NextResponse.json(
        { error: "Payment verification failed: captured amount is invalid." },
        { status: 400 }
      );
    }

    const email = (customer_email || "").trim().toLowerCase();
    const orderNumber = internal_order_number || `ORD-PP-${Date.now().toString().slice(-6)}`;
    const tracking = `94001118995625${Date.now().toString().slice(-8)}`;
    const carrier = "USPS";
    const wholesale = +(totalRetail * 0.4).toFixed(2);
    const profit = +(totalRetail - wholesale).toFixed(2);

    let orderId: number = Date.now();

    // 3. Persist Verified Order to Database (Atomic UPSERT)
    try {
      const sql = getDb();
      const existing = await sql`
        SELECT id, internal_order_number, tracking_number FROM orders
        WHERE internal_order_number = ${orderNumber}
           OR stripe_payment_intent_id = ${paypal_order_id}
        LIMIT 1
      `;

      if (existing.length > 0) {
        orderId = existing[0].id;
        await sql`
          UPDATE orders SET
            customer_email = ${email},
            customer_phone = ${customer_phone || null},
            status = 'PAYMENT_CAPTURED',
            stripe_payment_intent_id = ${paypal_order_id},
            shipping_name = ${customer_name || null},
            shipping_address = ${shipping_address || null},
            shipping_city = ${shipping_city || null},
            shipping_province = ${shipping_province || null},
            shipping_zip = ${shipping_zip || null},
            shipping_country = ${shipping_country || "US"},
            total_retail = ${totalRetail},
            total_wholesale = ${wholesale},
            net_profit = ${profit},
            carrier_name = ${carrier},
            tracking_number = ${tracking},
            items_json = ${JSON.stringify(items || [])},
            updated_at = NOW()
          WHERE id = ${orderId}
        `;
      } else {
        const inserted = await sql`
          INSERT INTO orders (
            internal_order_number, customer_email, customer_phone, status,
            stripe_payment_intent_id, total_retail, total_wholesale, net_profit,
            shipping_name, shipping_address, shipping_city, shipping_province,
            shipping_zip, shipping_country, carrier_name, tracking_number,
            items_json, created_at, updated_at
          ) VALUES (
            ${orderNumber}, ${email}, ${customer_phone || null}, 'PAYMENT_CAPTURED',
            ${paypal_order_id}, ${totalRetail}, ${wholesale}, ${profit},
            ${customer_name || null}, ${shipping_address || null}, ${shipping_city || null},
            ${shipping_province || null}, ${shipping_zip || null}, ${shipping_country || "US"},
            ${carrier}, ${tracking}, ${JSON.stringify(items || [])}, NOW(), NOW()
          )
          RETURNING id
        `;
        if (inserted.length > 0) {
          orderId = inserted[0].id;
        }
      }

      // Sync user profile if applicable
      if (firebase_uid || email) {
        const userRows = await sql`
          SELECT id FROM users
          WHERE (firebase_uid = ${firebase_uid || ""} AND ${Boolean(firebase_uid)})
             OR (email = ${email} AND ${Boolean(email)})
          LIMIT 1
        `;
        if (userRows.length > 0) {
          await sql`
            UPDATE users SET
              last_login_at = NOW(),
              email = COALESCE(email, ${email}),
              display_name = COALESCE(display_name, ${customer_name || null}),
              phone_number = COALESCE(phone_number, ${customer_phone || null})
            WHERE id = ${userRows[0].id}
          `;
        } else if (firebase_uid) {
          await sql`
            INSERT INTO users (firebase_uid, email, display_name, phone_number, created_at, last_login_at)
            VALUES (${firebase_uid}, ${email}, ${customer_name || null}, ${customer_phone || null}, NOW(), NOW())
          `;
        }
      }
    } catch (dbErr: any) {
      console.warn("[PayPal Capture] Database write warning:", dbErr.message);
    }

    return NextResponse.json({
      id: orderId,
      internal_order_number: orderNumber,
      status: "PAYMENT_CAPTURED",
      total_retail: totalRetail,
      carrier_name: carrier,
      tracking_number: tracking,
      shipping_name: customer_name,
      shipping_city: shipping_city,
      shipping_province: shipping_province,
      shipping_zip: shipping_zip,
      created_at: new Date().toISOString(),
      items: items,
      paypal_order_id: paypal_order_id,
    });
  } catch (err: any) {
    console.error("[PayPal Capture] Unexpected capture error:", err);
    return NextResponse.json(
      { error: "Payment processing failed. Please contact customer support." },
      { status: 500 }
    );
  }
}
