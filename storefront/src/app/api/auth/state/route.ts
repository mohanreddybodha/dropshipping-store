import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder, DbUser, DbCartItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get("firebase_uid")?.trim() || "";
    const email = searchParams.get("email")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";

    if (!firebaseUid && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of firebase_uid, email, or phone is required" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 1. Find User
    let user: DbUser | null = null;
    const userRows = (await sql`
      SELECT * FROM users
      WHERE (firebase_uid = ${firebaseUid} AND ${Boolean(firebaseUid)})
         OR (LOWER(email) = ${email.toLowerCase()} AND ${Boolean(email)})
         OR (phone_number = ${phone} AND ${Boolean(phone)})
      LIMIT 1
    `) as DbUser[];

    if (userRows.length > 0) {
      user = userRows[0];
    }

    // 2. Query Cart, Watchlist, and Orders concurrently in parallel via Promise.all
    const lookupEmail = email || user?.email || "";
    const lookupPhone = phone || user?.phone_number || "";

    const [cartRows, watchRows, orderRows] = await Promise.all([
      user?.id
        ? (sql`SELECT * FROM user_carts WHERE user_id = ${user.id} ORDER BY updated_at DESC` as unknown as Promise<DbCartItem[]>)
        : Promise.resolve([] as DbCartItem[]),
      user?.id
        ? (sql`SELECT product_pid FROM user_watchlists WHERE user_id = ${user.id} ORDER BY created_at DESC` as unknown as Promise<{ product_pid: string }[]>)
        : Promise.resolve([] as { product_pid: string }[]),
      lookupEmail || lookupPhone
        ? lookupEmail && lookupPhone
          ? (sql`
              SELECT * FROM orders
              WHERE LOWER(customer_email) = ${lookupEmail.toLowerCase()}
                 OR customer_phone = ${lookupPhone}
              ORDER BY created_at DESC
              LIMIT 100
            ` as unknown as Promise<DbOrder[]>)
          : lookupEmail
          ? (sql`
              SELECT * FROM orders
              WHERE LOWER(customer_email) = ${lookupEmail.toLowerCase()}
              ORDER BY created_at DESC
              LIMIT 100
            ` as unknown as Promise<DbOrder[]>)
          : (sql`
              SELECT * FROM orders
              WHERE customer_phone = ${lookupPhone}
              ORDER BY created_at DESC
              LIMIT 100
            ` as unknown as Promise<DbOrder[]>)
        : Promise.resolve([] as DbOrder[]),
    ]);

    const cart = cartRows.map((c) => ({
      product_pid: c.product_pid,
      variant_vid: c.variant_vid,
      title: c.title,
      image_url: c.image_url,
      tier: c.tier,
      selected_size: c.selected_size,
      quantity: c.quantity,
      unit_price: c.unit_price,
    }));

    const watchlist = watchRows.map((w) => w.product_pid);

    const orders = orderRows.map((r) => {
        let items = [];
        try {
          items = typeof r.items_json === "string" ? JSON.parse(r.items_json) : r.items_json || [];
        } catch {
          items = [];
        }
        return {
          id: r.id,
          internal_order_number: r.internal_order_number,
          cj_order_id: r.cj_order_id,
          customer_email: r.customer_email,
          customer_phone: r.customer_phone,
          status: r.status,
          total_retail: r.total_retail,
          total_wholesale: r.total_wholesale,
          net_profit: r.net_profit,
          shipping_name: r.shipping_name,
          shipping_address: r.shipping_address,
          shipping_city: r.shipping_city,
          shipping_province: r.shipping_province,
          shipping_zip: r.shipping_zip,
          shipping_country: r.shipping_country || "US",
          carrier_name: r.carrier_name || "USPS",
          tracking_number: r.tracking_number,
          items,
          created_at: r.created_at,
        };
      });

    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            firebase_uid: user.firebase_uid,
            email: user.email,
            display_name: user.display_name,
            photo_url: user.photo_url,
            phone_number: user.phone_number,
          }
        : null,
      cart,
      watchlist,
      orders,
    });
  } catch (error: any) {
    console.error("GET /api/auth/state error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch user state" },
      { status: 500 }
    );
  }
}
