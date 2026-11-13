import { NextRequest, NextResponse } from "next/server";
import { getDb, DbOrder } from "@/lib/db";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function maskStreet(address?: string | null): string {
  if (!address) return "";
  const parts = address.trim().split(" ");
  if (parts.length <= 1) return "***";
  return `*** ${parts.slice(1).join(" ")}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `(***) ***-${digits.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";

    // Fail-fast Zero-Trust Security: Parameterless global order dump requires verified admin authentication
    let isAdmin = false;
    if (!email && !phone) {
      const adminAuth = await verifyAdminAuth(req);
      if (!adminAuth.authorized) {
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message:
              "Query parameter 'email' or 'phone' is required. Global order history requires administrator authentication.",
          },
          { status: 401 }
        );
      }
      isAdmin = true;
    }

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
    } else if (isAdmin) {
      rows = (await sql`
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT 50
      `) as DbOrder[];
    }

    const mapped = rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems =
          typeof r.items_json === "string"
            ? JSON.parse(r.items_json)
            : r.items_json || [];
      } catch {
        parsedItems = [];
      }

      // Base order record safe for customer visibility with privacy masking on unauthenticated reads
      const baseRecord: Record<string, any> = {
        id: r.id,
        internal_order_number: r.internal_order_number,
        cj_order_id: r.cj_order_id,
        customer_email: r.customer_email,
        customer_phone: isAdmin ? r.customer_phone : maskPhone(r.customer_phone),
        status: r.status,
        total_retail: r.total_retail,
        shipping_name: r.shipping_name,
        shipping_address: isAdmin ? r.shipping_address : maskStreet(r.shipping_address),
        shipping_city: r.shipping_city,
        shipping_province: r.shipping_province,
        shipping_zip: r.shipping_zip,
        shipping_country: r.shipping_country || "US",
        carrier_name: r.carrier_name || "USPS",
        tracking_number: r.tracking_number,
        items: parsedItems,
        created_at: r.created_at,
      };

      // Only include proprietary financial wholesale cost and profit margins for verified admin sessions
      if (isAdmin) {
        baseRecord.total_wholesale = r.total_wholesale;
        baseRecord.net_profit = r.net_profit;
      }

      return baseRecord;
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
