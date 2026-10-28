import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, zip_code } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanZip = (zip_code || "").trim();

    if (!cleanEmail || !cleanZip) {
      return NextResponse.json(
        { error: "Email and Zip Code are required for dual-factor verification" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM orders
      WHERE LOWER(customer_email) = ${cleanEmail}
        AND shipping_zip LIKE ${"%" + cleanZip + "%"}
      ORDER BY created_at DESC
      LIMIT 50
    `) as DbOrder[];

    const mapped = rows.map((r) => {
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
      items: mapped,
      total: mapped.length,
    });
  } catch (error: any) {
    console.error("POST /api/orders/lookup error:", error);
    return NextResponse.json(
      { error: error?.message || "Order lookup failed" },
      { status: 500 }
    );
  }
}
