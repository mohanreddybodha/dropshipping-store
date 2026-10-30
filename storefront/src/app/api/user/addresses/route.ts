import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface SavedAddressRecord {
  id: number;
  user_email: string;
  label: string;
  recipient_name: string;
  street_address: string;
  city: string;
  province: string;
  zip_code: string;
  phone?: string | null;
  is_default: boolean;
  created_at: string;
}

// GET: Fetch saved delivery addresses for an authenticated user
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ addresses: [] });
    }

    const sql = getDb();

    // 1. Fetch from user_saved_addresses table
    let addresses = (await sql`
      SELECT * FROM user_saved_addresses
      WHERE LOWER(user_email) = ${cleanEmail}
      ORDER BY is_default DESC, id ASC
    `) as SavedAddressRecord[];

    // 2. If table is empty for this user, auto-harvest past distinct addresses from their orders!
    if (addresses.length === 0) {
      const pastOrders = (await sql`
        SELECT DISTINCT ON (shipping_address, shipping_zip)
          shipping_name, shipping_address, shipping_city, 
          shipping_province, shipping_zip, customer_phone, created_at
        FROM orders
        WHERE LOWER(customer_email) = ${cleanEmail}
          AND shipping_address IS NOT NULL 
          AND shipping_address != ''
        ORDER BY shipping_address, shipping_zip, created_at DESC
        LIMIT 5
      `) as any[];

      const labels = ["Home", "Office", "Other"];
      for (let i = 0; i < pastOrders.length; i++) {
        const o = pastOrders[i];
        const label = labels[i] || `Address ${i + 1}`;
        await sql`
          INSERT INTO user_saved_addresses 
            (user_email, label, recipient_name, street_address, city, province, zip_code, phone, is_default)
          VALUES 
            (${cleanEmail}, ${label}, ${o.shipping_name || "Customer"}, ${o.shipping_address}, ${o.shipping_city || "City"}, ${o.shipping_province || "CA"}, ${o.shipping_zip || "90210"}, ${o.customer_phone || ""}, ${i === 0})
        `;
      }

      // Re-fetch harvested addresses
      addresses = (await sql`
        SELECT * FROM user_saved_addresses
        WHERE LOWER(user_email) = ${cleanEmail}
        ORDER BY is_default DESC, id ASC
      `) as SavedAddressRecord[];
    }

    return NextResponse.json({ addresses });
  } catch (error: any) {
    console.error("Error fetching user addresses:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch addresses" }, { status: 500 });
  }
}

// POST: Add or update a saved address
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, label, recipient_name, street_address, city, province, zip_code, phone, is_default } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !street_address || !city || !province || !zip_code) {
      return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
    }

    const sql = getDb();

    // If setting as default, unset other defaults
    if (is_default) {
      await sql`
        UPDATE user_saved_addresses
        SET is_default = FALSE
        WHERE LOWER(user_email) = ${cleanEmail}
      `;
    }

    const cleanLabel = (label || "Home").trim();
    const cleanRecipient = (recipient_name || "Valued Customer").trim();

    // If an existing ID was passed, update that address
    if (id) {
      const updated = (await sql`
        UPDATE user_saved_addresses
        SET 
          label = ${cleanLabel},
          recipient_name = ${cleanRecipient},
          street_address = ${street_address.trim()},
          city = ${city.trim()},
          province = ${province.trim()},
          zip_code = ${zip_code.trim()},
          phone = ${phone ? phone.trim() : null},
          is_default = ${!!is_default},
          updated_at = NOW()
        WHERE id = ${Number(id)} AND LOWER(user_email) = ${cleanEmail}
        RETURNING *
      `) as SavedAddressRecord[];

      if (updated.length > 0) {
        return NextResponse.json({ address: updated[0], success: true });
      }
    }

    const inserted = await sql`
      INSERT INTO user_saved_addresses 
        (user_email, label, recipient_name, street_address, city, province, zip_code, phone, is_default)
      VALUES 
        (${cleanEmail}, ${cleanLabel}, ${cleanRecipient}, ${street_address.trim()}, ${city.trim()}, ${province.trim()}, ${zip_code.trim()}, ${phone ? phone.trim() : null}, ${!!is_default})
      RETURNING *
    `;

    return NextResponse.json({ address: inserted[0], success: true });
  } catch (error: any) {
    console.error("Error saving address:", error);
    return NextResponse.json({ error: error.message || "Failed to save address" }, { status: 500 });
  }
}

// DELETE: Remove a saved address
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const email = req.nextUrl.searchParams.get("email");

    if (!id || !email) {
      return NextResponse.json({ error: "Missing id or email" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      DELETE FROM user_saved_addresses
      WHERE id = ${Number(id)} AND LOWER(user_email) = ${email.trim().toLowerCase()}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting address:", error);
    return NextResponse.json({ error: error.message || "Failed to delete address" }, { status: 500 });
  }
}
