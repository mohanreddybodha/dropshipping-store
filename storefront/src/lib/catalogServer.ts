import { getDb } from "./db";
import seedData from "./seedCatalog.json";
import { Product } from "./types";

let cachedDbItems: Product[] | null = null;
let lastDbFetchTime = 0;
const DB_CACHE_TTL_MS = 5 * 60 * 1000;

export function mapDbRowToProduct(r: any): Product {
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
    us_warehouse_stock: Number(v.us_warehouse_stock ?? 100),
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
    images:
      Array.isArray(r.images_json) && r.images_json.length > 0
        ? r.images_json
        : [r.hero_image_url],
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

/**
 * Loads the live active product catalog from Neon PostgreSQL with in-memory TTL
 * caching and seamless `seedCatalog.json` fallback when DB is unavailable.
 */
export async function getAuthoritativeCatalog(timeoutMs = 1500): Promise<Product[]> {
  const now = Date.now();
  if (cachedDbItems && now - lastDbFetchTime < DB_CACHE_TTL_MS) {
    return cachedDbItems;
  }

  if (process.env.DATABASE_URL) {
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
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Neon DB timeout")), timeoutMs)
      );
      const rows = await Promise.race([dbPromise, timeout]);

      if (Array.isArray(rows) && rows.length > 0) {
        const items = rows.map(mapDbRowToProduct);
        cachedDbItems = items;
        lastDbFetchTime = now;
        return items;
      }
    } catch {
      // Fall back to seed catalog below
    }
  }

  return [...(seedData as unknown as Product[])].filter((p) => p.is_active !== false);
}
