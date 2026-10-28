import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";

    const sql = getDb();
    let rows: DbOrder[] = [];

    if (email && phone) {
      rows = (await sql`
        SELECT * FROM orders
        WHERE LOWER(customer_email) = ${email.toLowerCase()}
           OR customer_phone = ${phone}
        ORDER BY created_at DESC
        LIMIT 100
      `) as DbOrder[];
    } else if (email) {
      rows = (await sql`
        SELECT * FROM orders
        WHERE LOWER(customer_email) = ${email.toLowerCase()}
        ORDER BY created_at DESC
        LIMIT 100
      `) as DbOrder[];
    } else if (phone) {
      rows = (await sql`
        SELECT * FROM orders
        WHERE customer_phone = ${phone}
        ORDER BY created_at DESC
        LIMIT 100
      `) as DbOrder[];
    } else {
      // Return recent orders (admin or fallback)
      rows = (await sql`
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT 50
      `) as DbOrder[];
    }

    const mapped = rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = typeof r.items_json === "string" ? JSON.parse(r.items_json) : r.items_json || [];
      } catch {
        parsedItems = [];
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
        items: parsedItems,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({
      items: mapped,
      total: mapped.length,
    });
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch orders", items: [], total: 0 },
      { status: 500 }
    );
  }
}
