import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      internal_order_number,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_province,
      shipping_zip,
      shipping_country,
      total_retail,
      carrier_name,
      tracking_number,
      items,
      firebase_uid,
    } = body;

    const email = (customer_email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const orderNumber =
      internal_order_number || `ORD-STORE-${Date.now().toString().slice(-6)}`;
    const tracking = tracking_number || null;
    const carrier = carrier_name || "USPS";
    const total = Number(total_retail) || 0;
    const wholesale = +(total * 0.4).toFixed(2);
    const profit = +(total - wholesale).toFixed(2);

    const sql = getDb();

    // 1. Check if order number already exists (prevent duplicate creation on retries)
    const existing = await sql`
      SELECT id, internal_order_number, tracking_number FROM orders
      WHERE internal_order_number = ${orderNumber}
      LIMIT 1
    `;

    let orderId: number;
    if (existing.length > 0) {
      orderId = existing[0].id;
      // Update existing record
      await sql`
        UPDATE orders SET
          customer_email = ${email},
          customer_phone = ${customer_phone || null},
          shipping_name = ${customer_name || null},
          shipping_address = ${shipping_address || null},
          shipping_city = ${shipping_city || null},
          shipping_province = ${shipping_province || null},
          shipping_zip = ${shipping_zip || null},
          shipping_country = ${shipping_country || "US"},
          total_retail = ${total},
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
          total_retail, total_wholesale, net_profit, shipping_name,
          shipping_address, shipping_city, shipping_province, shipping_zip,
          shipping_country, carrier_name, tracking_number, items_json,
          created_at, updated_at
        ) VALUES (
          ${orderNumber}, ${email}, ${customer_phone || null}, 'ORDER_PLACED',
          ${total}, ${wholesale}, ${profit}, ${customer_name || null},
          ${shipping_address || null}, ${shipping_city || null}, ${shipping_province || null}, ${shipping_zip || null},
          ${shipping_country || "US"}, ${carrier}, ${tracking}, ${JSON.stringify(items || [])},
          NOW(), NOW()
        )
        RETURNING id
      `;
      orderId = inserted[0].id;
    }

    // 2. Upsert user record if firebase_uid or email is present
    try {
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
    } catch (userErr) {
      console.warn("User upsert non-critical warning:", userErr);
    }

    return NextResponse.json({
      status: "success",
      order_id: orderId,
      internal_order_number: orderNumber,
      tracking_number: tracking,
      total_retail: total,
    });
  } catch (error: any) {
    console.error("POST /api/orders/checkout error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
