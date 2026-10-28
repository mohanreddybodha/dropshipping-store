import { NextRequest, NextResponse } from "next/server";
import seedData from "@/lib/seedCatalog.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.toLowerCase();
    const search = searchParams.get("search")?.toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    let items = [...(seedData as any[])];

    if (category && category !== "all" && category !== "all products") {
      items = items.filter((p) => (p.category || "").toLowerCase() === category);
    }

    if (search) {
      items = items.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(search) ||
          (p.category || "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      items: items.slice(0, limit),
      total: items.length,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ items: seedData, total: seedData.length }, { status: 200 });
  }
}
