import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder, DbUser, DbCartItem } from "@/lib/db";

export const dynamic = "force-dynamic";

function maskStreet(address?: string): string {
  if (!address) return "";
  const parts = address.trim().split(" ");
  if (parts.length <= 1) return "***";
  return `*** ${parts.slice(1).join(" ")}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `(***) ***-${digits.slice(-4)}`;
}

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
        ? (sql`
            SELECT
              uc.*,
              pv.retail_price AS live_retail_price,
              pv.bundle_2_price AS live_bundle_2_price,
              pv.bundle_3_price AS live_bundle_3_price,
              pv.us_warehouse_stock AS live_stock,
              pv.wholesale_cost AS live_wholesale_cost,
              pv.shipping_cost AS live_shipping_cost,
              pv.variant_name AS live_variant_name,
              pv.display_name AS live_display_name,
              pv.size AS live_size,
              pv.color AS live_color,
              pv.sku AS live_sku,
              pv.image_url AS live_variant_image,
              p.slug AS live_slug,
              p.title AS live_title,
              p.category AS live_category,
              p.hero_image_url AS live_hero_image
            FROM user_carts uc
            LEFT JOIN product_variants pv ON pv.vid = uc.variant_vid
            LEFT JOIN products p ON p.id = pv.product_id
            WHERE uc.user_id = ${user.id}
            ORDER BY uc.updated_at DESC
          ` as unknown as Promise<Array<DbCartItem & Record<string, any>>>)
        : Promise.resolve([] as Array<DbCartItem & Record<string, any>>),
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
      title: c.live_title || c.title,
      image_url: c.live_variant_image || c.image_url || c.live_hero_image,
      slug: c.live_slug || null,
      category: c.live_category || "General",
      tier: c.tier,
      selected_size: c.selected_size,
      quantity: c.quantity,
      unit_price: c.unit_price,
      retail_price_1x: c.live_retail_price != null ? Number(c.live_retail_price) : null,
      bundle_2_price: c.live_bundle_2_price != null ? Number(c.live_bundle_2_price) : null,
      bundle_3_price: c.live_bundle_3_price != null ? Number(c.live_bundle_3_price) : null,
      us_warehouse_stock: c.live_stock != null ? Number(c.live_stock) : null,
      wholesale_cost: c.live_wholesale_cost != null ? Number(c.live_wholesale_cost) : null,
      shipping_cost: c.live_shipping_cost != null ? Number(c.live_shipping_cost) : null,
      variant_name: c.live_variant_name || null,
      display_name: c.live_display_name || null,
      sku: c.live_sku || null,
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
          customer_phone: maskPhone(r.customer_phone),
          status: r.status,
          total_retail: r.total_retail,
          shipping_name: r.shipping_name,
          shipping_address: maskStreet(r.shipping_address),
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
