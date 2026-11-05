import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import seedData from "@/lib/seedCatalog.json";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

let cachedDbItems: Product[] | null = null;
let lastDbFetchTime = 0;
const DB_CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute high-speed memory cache

function mapDbRowToProduct(r: any): Product {
  const variants = (r.variants || []).map((v: any) => ({
    id: v.id,
    vid: String(v.vid || ""),
    sku: String(v.sku || ""),
    variant_name: v.variant_name || undefined,
    display_name: v.display_name || v.variant_name || "Standard Edition",
    title: v.display_name || v.variant_name || undefined,
    size: v.size || undefined,
    color: v.color || undefined,
    image_url: v.image_url || r.hero_image_url,
    wholesale_cost: Number(v.wholesale_cost || 0),
    shipping_cost: Number(v.shipping_cost || 0),
    retail_price_1x: Number(v.retail_price_1x || 0),
    bundle_2_price: Number(v.bundle_2_price || 0),
    bundle_3_price: Number(v.bundle_3_price || 0),
    us_warehouse_stock: Number(v.us_warehouse_stock || 100),
    carrier_name: v.carrier_name || "USPS",
    delivery_sla: v.delivery_sla || "3-5 Days",
    is_available: v.is_available !== false,
  }));

  const firstVariant = variants[0];

  return {
    id: r.id,
    pid: String(r.pid || ""),
    title: r.title,
    brand_title: r.brand_title || "Vastire Curated",
    slug: r.slug,
    category: r.category || "General",
    rating: Number(r.seo_meta_json?.rating || 4.7),
    review_count: Number(r.seo_meta_json?.review_count || 184),
    hero_image_url: r.hero_image_url,
    images: Array.isArray(r.images_json) && r.images_json.length > 0 ? r.images_json : [r.hero_image_url],
    pas_description_html: r.pas_description_html || "",
    features: Array.isArray(r.features_json) ? r.features_json : [],
    specs: r.specs_json || {},
    seo_meta: r.seo_meta_json || {},
    faq_schema: Array.isArray(r.faq_schema_json) ? r.faq_schema_json : [],
    is_active: r.is_active !== false,
    variants,
    wholesale_cost: firstVariant ? firstVariant.wholesale_cost : 0,
    retail_price_1x: firstVariant ? firstVariant.retail_price_1x : 0,
  } as Product;
}

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

    let items: Product[] = [];

    const now = Date.now();
    if (cachedDbItems && now - lastDbFetchTime < DB_CACHE_TTL_MS) {
      items = cachedDbItems;
    } else if (process.env.DATABASE_URL) {
      try {
        const sql = getDb();
        const dbPromise = sql`
          SELECT 
            p.id,
            p.pid,
            p.title,
            p.brand_title,
            p.slug,
            p.category,
            p.hero_image_url,
            p.images_json,
            p.pas_description_html,
            p.features_json,
            p.specs_json,
            p.seo_meta_json,
            p.faq_schema_json,
            p.is_active,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', v.id,
                  'vid', v.vid,
                  'sku', v.sku,
                  'variant_name', v.variant_name,
                  'display_name', COALESCE(v.display_name, v.variant_name, 'Standard Edition'),
                  'size', v.size,
                  'color', v.color,
                  'image_url', v.image_url,
                  'wholesale_cost', v.wholesale_cost,
                  'shipping_cost', v.shipping_cost,
                  'retail_price_1x', v.retail_price,
                  'bundle_2_price', v.bundle_2_price,
                  'bundle_3_price', v.bundle_3_price,
                  'us_warehouse_stock', v.us_warehouse_stock,
                  'carrier_name', v.carrier_name,
                  'delivery_sla', v.delivery_sla,
                  'is_available', v.is_available
                ) ORDER BY v.id ASC
              ) FILTER (WHERE v.id IS NOT NULL),
              '[]'
            ) AS variants
          FROM products p
          LEFT JOIN product_variants v ON v.product_id = p.id
          WHERE p.is_active = true
          GROUP BY p.id
          ORDER BY p.id ASC;
        `;
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Neon DB timeout")), 1200));
        const rows = await Promise.race([dbPromise, timeout]);

        if (Array.isArray(rows) && rows.length > 0) {
          items = rows.map(mapDbRowToProduct);
          cachedDbItems = items;
          lastDbFetchTime = now;
        }
      } catch (dbErr) {
        console.error("Database catalog query fallback:", dbErr);
        items = [];
      }
    }

    // Fallback to seed catalog if database unavailable or returned empty
    if (items.length === 0) {
      items = [...(seedData as unknown as Product[])];
    }

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
