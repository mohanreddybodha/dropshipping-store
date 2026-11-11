import { NextRequest, NextResponse } from "next/server";
import seedData from "@/lib/seedCatalog.json";
import { Product } from "@/lib/types";
import { getAuthoritativeCatalog } from "@/lib/catalogServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.toLowerCase()?.trim();
    const search = searchParams.get("search")?.toLowerCase()?.trim();
    const minPrice = searchParams.get("min_price") ? parseFloat(searchParams.get("min_price")!) : null;
    const maxPrice = searchParams.get("max_price") ? parseFloat(searchParams.get("max_price")!) : null;
    const sort = searchParams.get("sort")?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "200", 10));
    const paginate = searchParams.get("paginate") === "true";

    let items: Product[] = await getAuthoritativeCatalog(1200);

    // 1. Filter Category
    if (category && category !== "all" && category !== "all products") {
      items = items.filter(
        (p) =>
          (p.category || "").toLowerCase().includes(category) ||
          (p.seo_meta?.category || "").toLowerCase().includes(category)
      );
    }

    // 2. Filter Search
    if (search) {
      items = items.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(search) ||
          (p.category || "").toLowerCase().includes(search) ||
          p.features?.some((f) => (f.title || "").toLowerCase().includes(search) || (f.desc || "").toLowerCase().includes(search))
      );
    }

    // 3. Filter Price
    if (minPrice !== null && !isNaN(minPrice)) {
      items = items.filter((p) => (p.variants?.[0]?.retail_price_1x || 0) >= minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      items = items.filter((p) => (p.variants?.[0]?.retail_price_1x || 0) <= maxPrice);
    }

    // 4. Sorting
    if (sort === "price_asc") {
      items.sort((a, b) => (a.variants?.[0]?.retail_price_1x || 0) - (b.variants?.[0]?.retail_price_1x || 0));
    } else if (sort === "price_desc") {
      items.sort((a, b) => (b.variants?.[0]?.retail_price_1x || 0) - (a.variants?.[0]?.retail_price_1x || 0));
    } else if (sort === "rating") {
      items.sort((a, b) => (b.rating || 4.7) - (a.rating || 4.7));
    }

    const totalCount = items.length;

    if (paginate) {
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginatedItems = items.slice((page - 1) * limit, page * limit);
      const categories_summary: Record<string, number> = {};
      for (const p of items) {
        const cat = p.category || "General";
        categories_summary[cat] = (categories_summary[cat] || 0) + 1;
      }

      return NextResponse.json(
        {
          items: paginatedItems,
          total_count: totalCount,
          total_pages: totalPages,
          current_page: page,
          categories_summary,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    return NextResponse.json(
      {
        items: items.slice(0, limit),
        total: totalCount,
        limit,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { items: seedData, total: seedData.length },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }
}
