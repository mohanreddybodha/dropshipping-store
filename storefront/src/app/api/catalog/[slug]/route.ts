import { NextRequest, NextResponse } from "next/server";
import { getAuthoritativeCatalog } from "@/lib/catalogServer";
import { matchesProductIdentifier } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const catalog = await getAuthoritativeCatalog(1200);
    const product = catalog.find((p) => matchesProductIdentifier(p, slug)) || null;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
