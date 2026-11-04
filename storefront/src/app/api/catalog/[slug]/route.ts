import { NextRequest, NextResponse } from "next/server";
import seedData from "@/lib/seedCatalog.json";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decoded = decodeURIComponent(slug || "").trim().toLowerCase();
    const normalizedHyphenSlug = decoded.replace(/\s+/g, "-");

    const catalog = seedData as unknown as Product[];
    const product = catalog.find((p) => {
      const pSlug = (p.slug || "").toLowerCase();
      return (
        pSlug === decoded ||
        pSlug === normalizedHyphenSlug ||
        pSlug.replace(/-/g, " ") === decoded ||
        decoded.replace(/-/g, " ") === pSlug.replace(/-/g, " ") ||
        String(p.id) === decoded
      );
    });

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
