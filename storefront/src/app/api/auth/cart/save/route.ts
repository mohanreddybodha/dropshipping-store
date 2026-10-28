import { NextRequest, NextResponse } from "next/server";
import { getDb, DbUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { firebase_uid, items } = await req.json();
    if (!firebase_uid) {
      return NextResponse.json({ error: "firebase_uid is required" }, { status: 400 });
    }

    const sql = getDb();

    // 1. Find user by firebase_uid
    let userRows = (await sql`
      SELECT id FROM users WHERE firebase_uid = ${firebase_uid} LIMIT 1
    `) as DbUser[];

    let userId: number;
    if (userRows.length === 0) {
      // Auto-provision user record
      const inserted = (await sql`
        INSERT INTO users (firebase_uid, created_at, last_login_at)
        VALUES (${firebase_uid}, NOW(), NOW())
        RETURNING id
      `) as DbUser[];
      userId = inserted[0].id;
    } else {
      userId = userRows[0].id;
    }

    // 2. Clear existing cart items for this user
    await sql`DELETE FROM user_carts WHERE user_id = ${userId}`;

    // 3. Insert fresh cart items
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const vid = item.variant_vid || item.variant?.vid || "";
        const pid = item.product_pid || item.product?.pid || "";
        const title = item.title || item.product?.title || "Product";
        const img = item.image_url || item.product?.hero_image_url || null;
        const tier = item.tier === 2 || item.tier === "2x" ? 2 : item.tier === 3 || item.tier === "3x" ? 3 : 1;
        const size = item.selected_size || item.selectedSize || null;
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price || item.unitPrice || item.variant?.retail_price_1x || 0);

        await sql`
          INSERT INTO user_carts (
            user_id, product_pid, variant_vid, title, image_url, tier, selected_size, quantity, unit_price, updated_at
          ) VALUES (
            ${userId}, ${pid}, ${vid}, ${title}, ${img}, ${tier}, ${size}, ${qty}, ${price}, NOW()
          )
        `;
      }
    }

    return NextResponse.json({ status: "success", count: items?.length || 0 });
  } catch (error: any) {
    console.error("POST /api/auth/cart/save error:", error);
    return NextResponse.json(
      { error: error?.message || "Cart save failed" },
      { status: 500 }
    );
  }
}
