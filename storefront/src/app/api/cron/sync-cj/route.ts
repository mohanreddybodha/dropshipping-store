import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { getDb, DbOrder } from "@/lib/db";
import {
  fetchCjOrderTracking,
  getCjAccessToken,
  queryVariantUsStockByVid,
} from "@/lib/cjClient";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { clearCatalogCache, getAuthoritativeCatalog } from "@/lib/catalogServer";
import { clearPricingCache } from "@/lib/pricing";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds execution limit on Vercel

const MIN_ACTIVE_US_STOCK = 16; // Strictly > 15 physical US warehouse units

const PROHIBITED_TITLE_REGEX =
  /\b(facial|blackhead|pore|cleansing strips?|skincare|cosmetic|beauty device|microcurrent|cream|serum|collagen|lotion|moisturizer|capsule|pill|supplement|vitamin|slimming|eyelash|acne|hair removal|gummy|gummies|keto|testosterone|perfume|parfum|shampoo|soap|deodorant|eyeshadow|lipstick|pet wipes|wet wipes|grooming wipes|rust remover spray|brake cleaner|cleaner spray|aerosol|shirt|t-shirt|tshirt|hoodie|shoes?|sneakers?|dress|pants|trousers|cargo pants|romper|jumpsuit|bra|underwear|clothing|jacket|coat|shorts|sweater|skirt|socks?|leggings|swimsuit|swimwear|boots?|sandals?|heels|blouse|jeans|denim|fleece|vest|robe|lingerie|scarf|tights|pantyhose|jewelry making|earrings?|necklaces?|bracelet|sansi|ouhoe|rayhong|yegbong|kegani|eelhoe|west&month|hoker|vevor|dowmoo|cifbuy)\b/i;

function verifyCronSecret(req: NextRequest): boolean {
  const validSecrets = [process.env.CRON_SECRET, process.env.ADMIN_API_KEY].filter(Boolean) as string[];
  if (validSecrets.length === 0) return false;

  const authHeader = req.headers.get("authorization") || "";
  const customHeader = req.headers.get("x-cron-secret") || "";

  let candidate = "";
  if (authHeader.startsWith("Bearer ")) {
    candidate = authHeader.slice(7).trim();
  } else if (customHeader) {
    candidate = customHeader.trim();
  }

  if (!candidate) return false;

  const candidateBuf = Buffer.from(candidate);
  for (const secret of validSecrets) {
    const secretBuf = Buffer.from(secret);
    if (candidateBuf.length === secretBuf.length && crypto.timingSafeEqual(candidateBuf, secretBuf)) {
      return true;
    }
  }
  return false;
}

async function handleSync(req: NextRequest) {
  // 1. Authorization: Allow valid CRON_SECRET or verified Admin session/key
  const isCronAuthed = verifyCronSecret(req);
  if (!isCronAuthed) {
    const adminAuth = await verifyAdminAuth(req);
    if (!adminAuth.authorized) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid or missing cron/admin authentication secret." },
        { status: 401 }
      );
    }
  }

  const sql = getDb();
  const startTime = new Date();
  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") || "full").toLowerCase();
  const revalidateOnly = mode === "revalidate";

  const errors: Array<{ order_number: string; error: string }> = [];
  const updatedOrders: Array<{ internal_order_number: string; cj_order_id: string; tracking_number: string; carrier_name: string }> = [];

  try {
    let processedCount = 0;
    let updatedCount = 0;

    // 2. Order Tracking Sync (skip only in fast revalidate mode)
    if (!revalidateOnly) {
      const eligibleOrders = (await sql`
        SELECT id, internal_order_number, cj_order_id, status, tracking_number, carrier_name
        FROM orders
        WHERE cj_order_id IS NOT NULL 
          AND status NOT IN ('CANCELLED', 'DELIVERED')
          AND (
            tracking_number IS NULL OR 
            status IN ('PAID', 'SUPPLIER_PROCESSING', 'PROCESSING')
          )
        ORDER BY updated_at ASC
        LIMIT 20;
      `) as DbOrder[];

      for (const order of eligibleOrders) {
        processedCount++;
        const cjId = order.cj_order_id?.trim();
        if (!cjId) continue;

        try {
          const trackingInfo = await fetchCjOrderTracking(cjId);
          if (!trackingInfo || !trackingInfo.found) {
            continue;
          }

          const newTracking = trackingInfo.tracking_number?.trim() || null;
          const newCarrier = trackingInfo.carrier_name?.trim() || order.carrier_name || "USPS";
          const cjStatus = (trackingInfo.status || "").toUpperCase();

          let nextStatus = order.status;
          if (newTracking && nextStatus !== "DELIVERED") {
            nextStatus = "SHIPPED";
          }
          if (cjStatus.includes("DELIVER") || cjStatus.includes("COMPLETE")) {
            nextStatus = "DELIVERED";
          }

          if (
            (newTracking && newTracking !== order.tracking_number) ||
            (nextStatus !== order.status)
          ) {
            await sql`
              UPDATE orders
              SET 
                tracking_number = COALESCE(${newTracking}, tracking_number),
                carrier_name = ${newCarrier},
                status = ${nextStatus},
                fulfillment_status = ${nextStatus},
                updated_at = NOW()
              WHERE id = ${order.id};
            `;

            updatedCount++;
            updatedOrders.push({
              internal_order_number: order.internal_order_number,
              cj_order_id: cjId,
              tracking_number: newTracking || order.tracking_number || "N/A",
              carrier_name: newCarrier,
            });
          }
        } catch (orderErr: any) {
          errors.push({
            order_number: order.internal_order_number,
            error: orderErr?.message || "Tracking sync exception",
          });
        }
      }
    }

    // 3. Time-Budgeted Live CJ Inventory Sync (Stock > 15 Gate, Fail-Safe on Auth/Rate-Limit)
    let stockChecked = 0;
    let stockDeactivatedVariants = 0;
    let stockStatus = revalidateOnly ? "REVALIDATE_ONLY" : "SKIPPED";

    if (!revalidateOnly) {
      const cjToken = await getCjAccessToken();
      if (!cjToken) {
        stockStatus = "CJ_AUTH_UNAVAILABLE";
        errors.push({
          order_number: "CATALOG_STOCK_SYNC",
          error: "CJ API authentication failed or CJ_API_KEY invalid; skipped live inventory mutation safely.",
        });
      } else {
        stockStatus = "OK";
        try {
          await sql`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_synced_at TIMESTAMPTZ`;
        } catch {
          // Ignore if column already handled or insufficient DDL privilege
        }

        let variantBatch: any[] = [];
        try {
          variantBatch = (await sql`
            SELECT v.id, v.vid, v.product_id, v.us_warehouse_stock, v.is_available,
                   v.wholesale_cost, v.shipping_cost, v.retail_price
            FROM product_variants v
            INNER JOIN products p ON p.id = v.product_id
            WHERE p.is_active = TRUE
            ORDER BY v.stock_synced_at ASC NULLS FIRST, v.id ASC
            LIMIT 25;
          `) as any[];
        } catch {
          variantBatch = (await sql`
            SELECT v.id, v.vid, v.product_id, v.us_warehouse_stock, v.is_available,
                   v.wholesale_cost, v.shipping_cost, v.retail_price
            FROM product_variants v
            INNER JOIN products p ON p.id = v.product_id
            WHERE p.is_active = TRUE
            ORDER BY v.id ASC
            LIMIT 25;
          `) as any[];
        }

        const budgetDeadline = startTime.getTime() + 42_000;
        for (const vRow of variantBatch) {
          if (Date.now() > budgetDeadline) break;
          await new Promise((r) => setTimeout(r, 1150)); // 0.87 QPS throttle < 1 QPS limit

          const check = await queryVariantUsStockByVid(String(vRow.vid), cjToken);
          if (!check.ok) {
            if (check.code === 1600200 || check.code === 429) {
              errors.push({ order_number: `VID:${vRow.vid}`, error: check.message || "Rate limited" });
              break;
            }
            continue;
          }

          stockChecked++;
          const liveStock = check.usStock;
          const retail = Number(vRow.retail_price || 0);
          const cogs = Number(vRow.wholesale_cost || 0) + Number(vRow.shipping_cost || 0);
          const fee = 0.0349 * retail + 0.49;
          const rto = 0.08 * retail;
          const netProfit = retail - (cogs + fee + rto);
          const netMargin = retail > 0 ? (netProfit / retail) * 100 : 0;
          const nextAvail = liveStock >= MIN_ACTIVE_US_STOCK && netProfit >= 4.0 && netMargin >= 20.0;

          if (!nextAvail && vRow.is_available !== false) {
            stockDeactivatedVariants++;
          }

          try {
            await sql`
              UPDATE product_variants
              SET us_warehouse_stock = ${liveStock},
                  is_available = ${nextAvail},
                  stock_synced_at = NOW()
              WHERE id = ${vRow.id};
            `;
          } catch {
            await sql`
              UPDATE product_variants
              SET us_warehouse_stock = ${liveStock},
                  is_available = ${nextAvail}
              WHERE id = ${vRow.id};
            `;
          }
        }
      }
    }

    // 4. Deterministic DB Compliance Enforcement (No OOS / <=15 / Prohibited / <$4 Profit Shown)
    let ruleDeactivatedProducts = 0;
    let ruleDisabledVariants = 0;

    const dbProducts = (await sql`
      SELECT id, title, category, is_active, hero_image_url, specs_json, features_json
      FROM products
      WHERE is_active = TRUE;
    `) as any[];

    for (const p of dbProducts) {
      const titleStr = `${p.title || ""} ${p.category || ""}`;
      const prohibited = PROHIBITED_TITLE_REGEX.test(titleStr);
      const missingContent = !p.features_json || !p.hero_image_url;

      if (prohibited || missingContent) {
        await sql`UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = ${p.id}`;
        await sql`UPDATE product_variants SET is_available = FALSE WHERE product_id = ${p.id}`;
        ruleDeactivatedProducts++;
        continue;
      }

      if (!p.specs_json) {
        const defaultSpecs = {
          Origin: "Domestic US Warehouse",
          SLA: "Tracked Domestic 3-7 Days",
          Condition: "Brand New Factory Sealed",
          Warranty: "30-Day Consumer Guarantee",
        };
        await sql`UPDATE products SET specs_json = ${JSON.stringify(defaultSpecs)} WHERE id = ${p.id}`;
      }
    }

    // Ensure any variant with <=15 stock or failing strict net margin is disabled
    const disabledLow = (await sql`
      UPDATE product_variants
      SET is_available = FALSE
      WHERE is_available = TRUE
        AND (
          COALESCE(us_warehouse_stock, 0) < ${MIN_ACTIVE_US_STOCK}
          OR retail_price <= 0
          OR (retail_price - (wholesale_cost + shipping_cost + (0.0349 * retail_price + 0.49) + (0.08 * retail_price))) < 4.00
          OR ((retail_price - (wholesale_cost + shipping_cost + (0.0349 * retail_price + 0.49) + (0.08 * retail_price))) / retail_price) < 0.20
        )
      RETURNING id;
    `) as any[];
    ruleDisabledVariants = Array.isArray(disabledLow) ? disabledLow.length : 0;

    // Deactivate parent products with zero remaining available variants
    const deactivatedZeroStock = (await sql`
      UPDATE products p
      SET is_active = FALSE, updated_at = NOW()
      WHERE p.is_active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id
            AND v.is_available = TRUE
            AND COALESCE(v.us_warehouse_stock, 0) >= ${MIN_ACTIVE_US_STOCK}
        )
      RETURNING p.id;
    `) as any[];
    ruleDeactivatedProducts += Array.isArray(deactivatedZeroStock) ? deactivatedZeroStock.length : 0;

    // 5. Invalidate Server Caches & Revalidate Storefront, Sitemap, and Google Merchant XML Feed
    clearCatalogCache();
    clearPricingCache();
    try {
      revalidatePath("/");
      revalidatePath("/sitemap.xml");
      revalidatePath("/merchant-feed.xml");
      revalidatePath("/collections/[slug]", "page");
      revalidatePath("/products/[slug]", "page");
    } catch {
      // Safe fallback when invoked outside Next.js ISR runtime
    }

    // 6. Optional IndexNow Ping when URLs changed & INDEXNOW_KEY configured
    let indexNowStatus = "NOT_CONFIGURED";
    const indexNowKey = (process.env.INDEXNOW_KEY || "").trim();
    if (indexNowKey && (ruleDeactivatedProducts > 0 || stockDeactivatedVariants > 0 || revalidateOnly)) {
      try {
        const activeCatalog = await getAuthoritativeCatalog(2000);
        const urlList = [
          `${SITE_URL}/`,
          ...activeCatalog.slice(0, 150).map((item) => `${SITE_URL}/products/${item.slug}`),
        ];
        const inRes = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: "vastire.com",
            key: indexNowKey,
            keyLocation: `${SITE_URL}/${indexNowKey}.txt`,
            urlList,
          }),
          signal: AbortSignal.timeout(5000),
        });
        indexNowStatus = `HTTP_${inRes.status}`;
      } catch {
        indexNowStatus = "PING_FAILED";
      }
    }

    // 7. Persist audit log record in sync_audit_logs table
    try {
      await sql`
        INSERT INTO sync_audit_logs (
          sync_type,
          items_processed,
          items_updated,
          errors_json,
          timestamp
        ) VALUES (
          ${revalidateOnly ? "CRON_REVALIDATE" : "CRON_CJ_SYNC"},
          ${processedCount + stockChecked},
          ${updatedCount + stockDeactivatedVariants + ruleDeactivatedProducts + ruleDisabledVariants},
          ${errors.length > 0 ? JSON.stringify(errors) : null},
          ${startTime}
        );
      `;
    } catch (auditErr) {
      console.error("[Cron Sync] Audit log persistence error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      mode,
      timestamp: startTime.toISOString(),
      items_processed: processedCount,
      items_updated: updatedCount,
      updated_orders: updatedOrders,
      inventory_sync: {
        status: stockStatus,
        variants_checked: stockChecked,
        variants_disabled_low_stock: stockDeactivatedVariants,
        rule_disabled_variants: ruleDisabledVariants,
        rule_deactivated_products: ruleDeactivatedProducts,
        revalidated_feeds: ["/", "/sitemap.xml", "/merchant-feed.xml", "/collections/[slug]", "/products/[slug]"],
        indexnow: indexNowStatus,
      },
      errors_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[Cron Sync] Fatal sync exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SYNC_ERROR",
        message: err?.message || "Fatal error during automated tracking sync.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}
