import seedData from "@/lib/seedCatalog.json";
import { getDb } from "@/lib/db";
import { computeBundlePricing } from "@/lib/bundlePricing";
import { Product, Variant } from "@/lib/types";

export interface OrderItemInput {
  pid?: string;
  vid?: string;
  slug?: string;
  quantity?: number | string;
  tier?: number | string;
  size?: string;
  color?: string;
  // Client price fields are accepted in the interface for backwards compatibility ONLY
  // and MUST NEVER be trusted or used for authoritative pricing calculation.
  unit_price?: number;
  price?: number;
  total_price?: number;
}

export interface VerifiedOrderItem {
  title: string;
  product_title: string;
  pid: string;
  sku: string;
  vid: string;
  variant_title: string;
  variant_sku: string;
  slug: string;
  image_url: string;
  quantity: number;
  tier: "1x" | "2x" | "3x";
  price: number;
  unit_price: number;
  total_price: number;
  wholesale_cost: number;
  size?: string;
  color?: string;
  status: string;
}

export interface AuthoritativeCartResult {
  total: number;
  totalWholesale: number;
  itemCount: number;
  verifiedItems: VerifiedOrderItem[];
}

export class CatalogPricingError extends Error {
  status: number;
  code: string;
  constructor(message: string, code = "INVALID_ORDER_ITEMS", status = 400) {
    super(message);
    this.name = "CatalogPricingError";
    this.code = code;
    this.status = status;
  }
}

interface IndexedVariant {
  product: {
    pid: string;
    title: string;
    slug: string;
    hero_image_url: string;
    is_active: boolean;
  };
  variant: {
    vid: string;
    sku: string;
    variant_name: string;
    image_url: string;
    retail_price_1x: number;
    bundle_2_price: number;
    bundle_3_price: number;
    wholesale_cost: number;
    us_warehouse_stock: number;
    is_available: boolean;
  };
}

let dbIndexCache: {
  byVid: Map<string, IndexedVariant>;
  byPid: Map<string, IndexedVariant>;
  ts: number;
} | null = null;
const DB_INDEX_TTL_MS = 60_000;

export function clearPricingCache(): void {
  dbIndexCache = null;
}

async function getDbVariantIndex(): Promise<{
  byVid: Map<string, IndexedVariant>;
  byPid: Map<string, IndexedVariant>;
}> {
  const url = process.env.DATABASE_URL || "";
  if (!url || url.includes("mock") || url.includes("localhost")) {
    return { byVid: new Map(), byPid: new Map() };
  }

  const now = Date.now();
  if (dbIndexCache && now - dbIndexCache.ts < DB_INDEX_TTL_MS) {
    return { byVid: dbIndexCache.byVid, byPid: dbIndexCache.byPid };
  }

  const byVid = new Map<string, IndexedVariant>();
  const byPid = new Map<string, IndexedVariant>();

  try {
    const sql = getDb();
    const queryPromise = sql`
      SELECT
        p.pid,
        p.title,
        p.slug,
        p.hero_image_url,
        p.is_active,
        v.vid,
        v.sku,
        v.variant_name,
        v.display_name,
        v.image_url,
        v.retail_price AS retail_price_1x,
        v.bundle_2_price,
        v.bundle_3_price,
        v.wholesale_cost,
        v.us_warehouse_stock,
        v.is_available
      FROM product_variants v
      INNER JOIN products p ON v.product_id = p.id
      ORDER BY v.id ASC
    `;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB pricing lookup timeout")), 1500)
    );
    const rows = (await Promise.race([queryPromise, timeout])) as any[];

    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const entry: IndexedVariant = {
          product: {
            pid: String(r.pid || ""),
            title: String(r.title || "Vastire Item"),
            slug: String(r.slug || ""),
            hero_image_url: String(r.hero_image_url || ""),
            is_active: r.is_active !== false,
          },
          variant: {
            vid: String(r.vid || ""),
            sku: String(r.sku || ""),
            variant_name: String(r.display_name || r.variant_name || "Standard"),
            image_url: String(r.image_url || r.hero_image_url || ""),
            retail_price_1x: Number(r.retail_price_1x || 0),
            bundle_2_price: Number(r.bundle_2_price || 0),
            bundle_3_price: Number(r.bundle_3_price || 0),
            wholesale_cost: Number(r.wholesale_cost || 0),
            us_warehouse_stock: Number(r.us_warehouse_stock ?? 100),
            is_available: r.is_available !== false,
          },
        };
        if (entry.variant.vid) {
          byVid.set(entry.variant.vid, entry);
        }
        if (entry.product.pid && !byPid.has(entry.product.pid)) {
          byPid.set(entry.product.pid, entry);
        }
      }
      dbIndexCache = { byVid, byPid, ts: now };
    }
  } catch (err: any) {
    console.warn("[Pricing] DB catalog lookup fallback to seedCatalog:", err?.message || err);
  }

  return { byVid, byPid };
}

function getSeedVariantIndex(): {
  byVid: Map<string, IndexedVariant>;
  byPid: Map<string, IndexedVariant>;
} {
  const byVid = new Map<string, IndexedVariant>();
  const byPid = new Map<string, IndexedVariant>();
  const catalog = seedData as unknown as Product[];

  for (const p of catalog) {
    const pid = String(p.pid || "");
    const variants: Variant[] = Array.isArray(p.variants) ? p.variants : [];
    for (const v of variants) {
      const vid = String(v.vid || "");
      const entry: IndexedVariant = {
        product: {
          pid,
          title: String(p.title || "Vastire Item"),
          slug: String(p.slug || ""),
          hero_image_url: String(p.hero_image_url || p.images?.[0] || ""),
          is_active: p.is_active !== false,
        },
        variant: {
          vid,
          sku: String(v.sku || ""),
          variant_name: String(v.display_name || v.variant_name || "Standard"),
          image_url: String(v.image_url || p.hero_image_url || p.images?.[0] || ""),
          retail_price_1x: Number(v.retail_price_1x || 0),
          bundle_2_price: Number(v.bundle_2_price || 0),
          bundle_3_price: Number(v.bundle_3_price || 0),
          wholesale_cost: Number(v.wholesale_cost || 0),
          us_warehouse_stock: Number(v.us_warehouse_stock ?? 100),
          is_available: v.is_available !== false,
        },
      };
      if (vid && !byVid.has(vid)) {
        byVid.set(vid, entry);
      }
      if (pid && !byPid.has(pid)) {
        byPid.set(pid, entry);
      }
    }
  }

  return { byVid, byPid };
}

let seedIndexMemo: ReturnType<typeof getSeedVariantIndex> | null = null;

function parseStrictTier(rawTier: unknown): 1 | 2 | 3 {
  if (rawTier === undefined || rawTier === null || rawTier === "") return 1;
  const s = String(rawTier).trim().toLowerCase();
  if (s === "1" || s === "1x") return 1;
  if (s === "2" || s === "2x") return 2;
  if (s === "3" || s === "3x") return 3;
  throw new CatalogPricingError(`Invalid bundle tier "${String(rawTier)}".`);
}

function parseStrictQuantity(rawQty: unknown): number {
  const num = typeof rawQty === "number" ? rawQty : Number(rawQty);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1 || num > 99) {
    throw new CatalogPricingError(
      `Invalid item quantity "${String(rawQty)}". Quantity must be a whole integer between 1 and 99.`
    );
  }
  return num;
}

/**
 * Authoritatively resolves every cart line item from server catalog records (DB + seedCatalog)
 * and calculates exact USD totals without EVER trusting client price fields.
 */
export async function resolveAuthoritativeCart(
  items: OrderItemInput[]
): Promise<AuthoritativeCartResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CatalogPricingError("Cart items are required.", "EMPTY_CART", 400);
  }
  if (items.length > 25) {
    throw new CatalogPricingError(
      "Order exceeds maximum allowed distinct line items (25).",
      "TOO_MANY_ITEMS",
      400
    );
  }

  if (!seedIndexMemo) {
    seedIndexMemo = getSeedVariantIndex();
  }
  const dbIndex = await getDbVariantIndex();

  let totalSum = 0;
  let totalWholesale = 0;
  let itemCount = 0;
  const verifiedItems: VerifiedOrderItem[] = [];

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") {
      throw new CatalogPricingError("Malformed cart line item.");
    }

    const qty = parseStrictQuantity(rawItem.quantity ?? 1);
    // Validate tier input strictly so malformed/spoofed tier strings still fail closed (HTTP 400)
    parseStrictTier(rawItem.tier);
    const rawVid = typeof rawItem.vid === "string" ? rawItem.vid.trim() : "";
    const rawPid = typeof rawItem.pid === "string" ? rawItem.pid.trim() : "";

    let matched: IndexedVariant | undefined;

    if (rawVid) {
      // Exact VID match in authoritative DB first, then fallback seed catalog ONLY if DB doesn't know this VID
      matched = dbIndex.byVid.get(rawVid) ?? seedIndexMemo.byVid.get(rawVid);
    } else if (rawPid) {
      matched = dbIndex.byPid.get(rawPid) ?? seedIndexMemo.byPid.get(rawPid);
    }

    if (!matched) {
      throw new CatalogPricingError(
        `Product variant could not be verified in catalog (${rawVid || rawPid || "missing ID"}).`,
        "UNKNOWN_VARIANT",
        400
      );
    }

    if (!matched.product.is_active || !matched.variant.is_available || matched.variant.us_warehouse_stock <= 15) {
      throw new CatalogPricingError(
        `"${matched.product.title}" is currently unavailable for purchase.`,
        "UNAVAILABLE_VARIANT",
        400
      );
    }

    const price1x = Number(matched.variant.retail_price_1x);
    if (!Number.isFinite(price1x) || price1x <= 0) {
      throw new CatalogPricingError(
        `Invalid server pricing for variant ${matched.variant.vid}.`,
        "INVALID_CATALOG_PRICE",
        500
      );
    }

    // Quantity governs bundle pricing monotonically:
    // qty === 1 -> 1x full retail (zero discount, even if tier="3x" is tampered)
    // qty === 2 -> 2x Value Bundle (12% off)
    // qty >= 3  -> 3x Pro Bundle (18% off)
    const computed = computeBundlePricing(matched.variant, qty);
    const effectiveTier = computed.tier;
    const unitPrice = computed.unitPrice;
    const lineTotal = computed.totalPrice;

    const unitWholesale =
      matched.variant.wholesale_cost > 0
        ? +Number(matched.variant.wholesale_cost).toFixed(2)
        : +(unitPrice * 0.4).toFixed(2);

    totalSum += lineTotal;
    totalWholesale += +(unitWholesale * qty).toFixed(2);
    itemCount += qty;

    verifiedItems.push({
      title: matched.product.title,
      product_title: matched.product.title,
      pid: matched.product.pid,
      sku: matched.variant.sku,
      vid: matched.variant.vid,
      variant_title:
        matched.variant.variant_name ||
        (typeof rawItem.size === "string" && rawItem.size) ||
        "Standard",
      variant_sku: matched.variant.sku,
      slug: matched.product.slug,
      image_url: matched.variant.image_url || matched.product.hero_image_url,
      quantity: qty,
      tier: effectiveTier,
      price: unitPrice,
      unit_price: unitPrice,
      total_price: lineTotal,
      wholesale_cost: unitWholesale,
      size: typeof rawItem.size === "string" && rawItem.size ? rawItem.size.slice(0, 60) : undefined,
      color: typeof rawItem.color === "string" && rawItem.color ? rawItem.color.slice(0, 60) : undefined,
      status: "ORDER_PLACED",
    });
  }

  return {
    total: +totalSum.toFixed(2),
    totalWholesale: +totalWholesale.toFixed(2),
    itemCount,
    verifiedItems,
  };
}
