import { NextRequest, NextResponse } from "next/server";
import { getDb, DbUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { firebase_uid, product_pid } = await req.json();
    if (!firebase_uid || !product_pid) {
      return NextResponse.json(
        { error: "firebase_uid and product_pid are required" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 1. Find user by firebase_uid
    let userRows = (await sql`
      SELECT id FROM users WHERE firebase_uid = ${firebase_uid} LIMIT 1
    `) as DbUser[];

    let userId: number;
    if (userRows.length === 0) {
      const inserted = (await sql`
        INSERT INTO users (firebase_uid, created_at, last_login_at)
        VALUES (${firebase_uid}, NOW(), NOW())
        RETURNING id
      `) as DbUser[];
      userId = inserted[0].id;
    } else {
      userId = userRows[0].id;
    }

    // 2. Check if already in watchlist
    const existing = await sql`
      SELECT id FROM user_watchlists
      WHERE user_id = ${userId} AND product_pid = ${product_pid}
      LIMIT 1
    `;

    let isInWatchlist: boolean;
    if (existing.length > 0) {
      await sql`
        DELETE FROM user_watchlists
        WHERE id = ${existing[0].id}
      `;
      isInWatchlist = false;
    } else {
      await sql`
        INSERT INTO user_watchlists (user_id, product_pid, created_at)
        VALUES (${userId}, ${product_pid}, NOW())
      `;
      isInWatchlist = true;
    }

    // 3. Return updated full watchlist
    const currentList = (await sql`
      SELECT product_pid FROM user_watchlists
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `) as { product_pid: string }[];

    return NextResponse.json({
      status: "success",
      is_in_watchlist: isInWatchlist,
      watchlist: currentList.map((w) => w.product_pid),
    });
  } catch (error: any) {
    console.error("POST /api/auth/watchlist/toggle error:", error);
    return NextResponse.json(
      { error: error?.message || "Watchlist toggle failed" },
      { status: 500 }
    );
  }
}
