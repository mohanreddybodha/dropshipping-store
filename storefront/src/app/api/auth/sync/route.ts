import { NextRequest, NextResponse } from "next/server";
import { getDb, DbUser, DbCartItem, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firebase_uid,
      email,
      phone_number,
      display_name,
      photo_url,
      guest_cart,
      guest_watchlist,
    } = body;

    if (!firebase_uid) {
      return NextResponse.json(
        { error: "firebase_uid is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone_number ? phone_number.trim() : null;

    const sql = getDb();

    // 1. Find or create User
    const existing = (await sql`
      SELECT * FROM users
      WHERE firebase_uid = ${firebase_uid}
         OR (email = ${cleanEmail || ""} AND ${Boolean(cleanEmail)})
      LIMIT 1
    `) as DbUser[];

    let user: DbUser;
    if (existing.length > 0) {
      user = existing[0];
      const updated = (await sql`
        UPDATE users SET
          firebase_uid = ${firebase_uid},
          email = COALESCE(${cleanEmail}, email),
          display_name = COALESCE(${display_name || null}, display_name),
          photo_url = COALESCE(${photo_url || null}, photo_url),
          phone_number = COALESCE(${cleanPhone}, phone_number),
          last_login_at = NOW()
        WHERE id = ${user.id}
        RETURNING *
      `) as DbUser[];
      user = updated[0];
    } else {
      const inserted = (await sql`
        INSERT INTO users (
          firebase_uid, email, display_name, photo_url, phone_number, created_at, last_login_at
        ) VALUES (
          ${firebase_uid}, ${cleanEmail}, ${display_name || null}, ${photo_url || null}, ${cleanPhone}, NOW(), NOW()
        )
        RETURNING *
      `) as DbUser[];
      user = inserted[0];
    }

    // 2. Merge guest cart into user_carts if provided
    if (Array.isArray(guest_cart) && guest_cart.length > 0) {
      for (const item of guest_cart) {
        if (!item.variant_vid && !item.product_pid) continue;
        const vid = item.variant_vid || "";
        const pid = item.product_pid || "";
        const title = item.title || "Product";
        const img = item.image_url || null;
        const tier = item.tier === 2 || item.tier === "2x" ? 2 : item.tier === 3 || item.tier === "3x" ? 3 : 1;
        const size = item.selected_size || null;
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;

        // Check if item already in db cart
        const existingCart = await sql`
          SELECT id FROM user_carts
          WHERE user_id = ${user.id} AND variant_vid = ${vid}
          LIMIT 1
        `;

        if (existingCart.length === 0) {
          await sql`
            INSERT INTO user_carts (
              user_id, product_pid, variant_vid, title, image_url, tier, selected_size, quantity, unit_price, updated_at
            ) VALUES (
              ${user.id}, ${pid}, ${vid}, ${title}, ${img}, ${tier}, ${size}, ${qty}, ${price}, NOW()
            )
          `;
        }
      }
    }

    // 3. Merge guest watchlist into user_watchlists if provided
    if (Array.isArray(guest_watchlist) && guest_watchlist.length > 0) {
      for (const pid of guest_watchlist) {
        if (!pid) continue;
        const existingWatch = await sql`
          SELECT id FROM user_watchlists
          WHERE user_id = ${user.id} AND product_pid = ${pid}
          LIMIT 1
        `;
        if (existingWatch.length === 0) {
          await sql`
            INSERT INTO user_watchlists (user_id, product_pid, created_at)
            VALUES (${user.id}, ${pid}, NOW())
          `;
        }
      }
    }

    // 4. Fetch consolidated cart, watchlist, and orders
    const cartRows = (await sql`
      SELECT * FROM user_carts WHERE user_id = ${user.id} ORDER BY updated_at DESC
    `) as DbCartItem[];

    const watchRows = (await sql`
      SELECT product_pid FROM user_watchlists WHERE user_id = ${user.id} ORDER BY created_at DESC
    `) as { product_pid: string }[];

    const orderRows = (await sql`
      SELECT * FROM orders
      WHERE (LOWER(customer_email) = ${cleanEmail || ""} AND ${Boolean(cleanEmail)})
         OR (customer_phone = ${cleanPhone || ""} AND ${Boolean(cleanPhone)})
      ORDER BY created_at DESC
      LIMIT 100
    `) as DbOrder[];

    const mappedOrders = orderRows.map((r) => {
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
      status: "success",
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        email: user.email,
        display_name: user.display_name,
        photo_url: user.photo_url,
        phone_number: user.phone_number,
      },
      cart: cartRows.map((c) => ({
        product_pid: c.product_pid,
        variant_vid: c.variant_vid,
        title: c.title,
        image_url: c.image_url,
        tier: c.tier,
        selected_size: c.selected_size,
        quantity: c.quantity,
        unit_price: c.unit_price,
      })),
      watchlist: watchRows.map((w) => w.product_pid),
      orders: mappedOrders,
    });
  } catch (error: any) {
    console.error("POST /api/auth/sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Auth sync failed" },
      { status: 500 }
    );
  }
}
