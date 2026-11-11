/**
 * CJ Dropshipping API v2.0 Client for Serverless Next.js Runtime
 * 
 * Implements:
 * 1. Safe in-memory access token caching with auto-refresh.
 * 2. Automated domestic order creation via /shopping/order/createOrderV2.
 * 3. Idempotency handling for CJ error code 1603003.
 * 4. LogisticsMiss defensive assertion checks.
 * 5. Tracking status queries via /shopping/order/getOrderDetail.
 * 6. Zero secret leakage in logs.
 */

import { FALLBACK_PRODUCTS } from "./api";

const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

export interface CjOrderProduct {
  vid: string;
  quantity: number;
}

export interface CjCreateOrderParams {
  orderNumber: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  shippingCountryCode?: string;
  shippingPhone?: string;
  customerEmail: string;
  products: CjOrderProduct[];
  logisticName?: string;
  remark?: string;
}

export interface CjOrderResult {
  success: boolean;
  cjOrderId?: string | null;
  postageAmount?: number;
  status: "CREATED" | "IDEMPOTENT_DUPLICATE" | "FAILED" | "LOGISTICS_MISS";
  message?: string;
  rawResponse?: any;
}

/**
 * Retrieve or refresh CJ Access Token with in-memory caching.
 */
export async function getCjAccessToken(forceRefresh = false): Promise<string | null> {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    console.warn("[CJ Client] CJ_API_KEY is not configured in environment.");
    return null;
  }

  const now = Date.now();
  // Reuse existing token if valid for at least 5 more minutes
  if (!forceRefresh && cachedAccessToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  try {
    const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[CJ Client] Auth HTTP error ${res.status}`);
      return null;
    }

    const json = await res.json();
    if ((json.code === 200 || json.result === true) && json.data?.accessToken) {
      cachedAccessToken = json.data.accessToken;
      // Default to 15 days expiry buffer
      tokenExpiresAt = now + 15 * 24 * 60 * 60 * 1000;
      return cachedAccessToken;
    }

    console.error("[CJ Client] Auth failure response:", json.message || json.code);
    return null;
  } catch (err: any) {
    console.error("[CJ Client] Auth network/timeout exception:", err?.message || err);
    return null;
  }
}

/**
 * Helper to resolve the correct CJ Variant ID (VID) for an ordered line item.
 */
export function resolveItemVid(item: any): string | null {
  if (item.vid && typeof item.vid === "string" && item.vid.length > 5) {
    return item.vid;
  }
  if (item.variant_id && typeof item.variant_id === "string" && item.variant_id.length > 5) {
    return item.variant_id;
  }

  // Look up variant in catalog
  const pid = item.pid || item.product_id;
  const sku = item.sku || item.variant_sku;
  const color = (item.color || item.selectedColor || "").toLowerCase();
  const size = (item.size || item.selectedSize || "").toLowerCase();

  const product = FALLBACK_PRODUCTS.find((p) => p.pid === pid || p.title === item.title || p.title === item.product_title);
  if (product && product.variants && product.variants.length > 0) {
    if (sku) {
      const match = product.variants.find((v) => v.sku === sku);
      if (match?.vid) return match.vid;
    }
    if (color || size) {
      const match = product.variants.find((v) => {
        const vColor = (v.color || v.display_name || "").toLowerCase();
        const vSize = (v.size || "").toLowerCase();
        return (color && vColor.includes(color)) || (size && vSize === size);
      });
      if (match?.vid) return match.vid;
    }
    return product.variants[0].vid || null;
  }

  return null;
}

/**
 * Dispatch an order to CJ Dropshipping with defensive assertions and idempotency.
 */
export async function createCjOrder(params: CjCreateOrderParams): Promise<CjOrderResult> {
  const token = await getCjAccessToken();
  if (!token) {
    return {
      success: false,
      status: "FAILED",
      message: "CJ API credentials unavailable or authentication failed.",
    };
  }

  // Filter and validate products
  const validProducts = params.products.filter((p) => p.vid && p.quantity > 0);
  if (validProducts.length === 0) {
    return {
      success: false,
      status: "FAILED",
      message: "No valid product variants (VID) found for fulfillment.",
    };
  }

  const payload = {
    orderNumber: params.orderNumber,
    shippingCustomerName: params.shippingName,
    fromCountryCode: "US",
    logisticName: params.logisticName || "USPS US to US",
    shippingCountry: "United States",
    shippingCountryCode: params.shippingCountryCode || "US",
    shippingProvince: params.shippingProvince,
    shippingCity: params.shippingCity,
    shippingAddress: params.shippingAddress,
    shippingZip: params.shippingZip,
    shippingPhone: params.shippingPhone || "2135550199",
    email: params.customerEmail,
    remark: params.remark || "Vastire Headless Store Order",
    payType: "3",
    products: validProducts.map((p) => ({
      vid: p.vid,
      quantity: p.quantity,
    })),
  };

  try {
    const res = await fetch(`${CJ_BASE_URL}/shopping/order/createOrderV2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    const json = await res.json().catch(() => ({}));
    const code = json.code;
    const msg = json.message || "";
    const data = json.data || {};

    // 1. Idempotency Check: CJ Code 1603003 ("Order exist, please do not duplicate create")
    if (code === 1603003 || msg.includes("Order exist")) {
      console.warn(`[CJ Client] Idempotent duplicate recognized for order: ${params.orderNumber}`);
      return {
        success: true,
        status: "IDEMPOTENT_DUPLICATE",
        message: "Duplicate order submission recognized as idempotent success.",
        rawResponse: json,
      };
    }

    // 2. Supplier Error Check
    if (code !== 200 && json.result !== true) {
      console.error(`[CJ Client] Supplier rejected order ${params.orderNumber}: Code ${code} - ${msg}`);
      return {
        success: false,
        status: "FAILED",
        message: `CJ Supplier Error (${code}): ${msg}`,
        rawResponse: json,
      };
    }

    // 3. Defensive Gate: logisticsMiss assertion check
    const logisticsMiss = Boolean(data.logisticsMiss);
    const postageAmount = parseFloat(data.postageAmount || "0");
    if (logisticsMiss === true || postageAmount <= 0) {
      console.error(
        `[CJ Client] Defensive gate triggered for ${params.orderNumber}: logisticsMiss=${logisticsMiss}, postage=$${postageAmount}`
      );
      return {
        success: false,
        status: "LOGISTICS_MISS",
        message: `Supplier logistics miss or zero postage (logisticsMiss=${logisticsMiss}, postageAmount=${postageAmount})`,
        rawResponse: json,
      };
    }

    const cjOrderId = data.orderId ? String(data.orderId).trim() : null;
    return {
      success: true,
      status: "CREATED",
      cjOrderId,
      postageAmount,
      message: `Order submitted successfully to CJ Dropshipping. CJ Order ID: ${cjOrderId || "N/A"}`,
      rawResponse: json,
    };
  } catch (err: any) {
    console.error(`[CJ Client] Order dispatch exception for ${params.orderNumber}:`, err?.message || err);
    return {
      success: false,
      status: "FAILED",
      message: `Fulfillment gateway timeout/error: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Query order details and tracking status from CJ Dropshipping.
 */
export async function queryVariantUsStockByVid(
  vid: string,
  providedToken?: string
): Promise<{
  ok: boolean;
  usStock: number;
  code?: number;
  message?: string;
}> {
  const token = providedToken || (await getCjAccessToken());
  if (!token) {
    return {
      ok: false,
      usStock: 0,
      message: "CJ API authentication failed or CJ_API_KEY is invalid.",
    };
  }

  try {
    const url = `${CJ_BASE_URL}/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`;
    const res = await fetch(url, {
      headers: { "CJ-Access-Token": token },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 429) {
      return { ok: false, usStock: 0, code: 429, message: "CJ API HTTP 429 rate limited" };
    }
    if (!res.ok) {
      return { ok: false, usStock: 0, code: res.status, message: `CJ HTTP ${res.status}` };
    }

    const json = await res.json().catch(() => ({}));
    const code = Number(json.code || 0);
    if (code === 1600200) {
      return { ok: false, usStock: 0, code, message: "CJ silent rate limit (1600200)" };
    }
    if (code !== 200 && json.result !== true) {
      return {
        ok: false,
        usStock: 0,
        code,
        message: String(json.message || "CJ stock query failed"),
      };
    }

    const records = Array.isArray(json.data) ? json.data : [];
    let usStock = 0;
    for (const rec of records) {
      const country = String(rec?.countryCode || "").toUpperCase();
      const areaId = String(rec?.areaId ?? "").trim();
      const warehouseName = `${rec?.warehouseName || ""} ${rec?.areaEn || ""}`.toUpperCase();
      const qty = Number(rec?.storageNum ?? rec?.cjInventoryNum ?? rec?.inventoryNum ?? 0);
      if (country === "US" || areaId === "2" || warehouseName.includes("US")) {
        usStock += Number.isFinite(qty) ? qty : 0;
      }
    }

    return { ok: true, usStock };
  } catch (err: any) {
    return {
      ok: false,
      usStock: 0,
      message: err?.message || "Network error during CJ stock check",
    };
  }
}

export async function fetchCjOrderTracking(targetId: string): Promise<{
  found: boolean;
  cj_order_id?: string | null;
  status?: string;
  tracking_number?: string | null;
  carrier_name?: string | null;
} | null> {
  const token = await getCjAccessToken();
  if (!token) return null;

  try {
    // 1. Try getOrderDetail with targetId
    const queryUrl = `${CJ_BASE_URL}/shopping/order/getOrderDetail?orderId=${encodeURIComponent(targetId)}`;
    const resp = await fetch(queryUrl, {
      headers: { "CJ-Access-Token": token },
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok) {
      const resJson = await resp.json();
      if ((resJson.code === 200 || resJson.result === true) && resJson.data) {
        const d = resJson.data;
        const tracking = d.trackingNumber || d.trackNumber || null;
        const carrier = d.logisticName || d.shippingMethod || "USPS";
        const cjStatus = d.orderStatus || d.status || "PROCESSING";
        return {
          found: true,
          cj_order_id: String(d.orderId || targetId),
          status: cjStatus,
          tracking_number: tracking,
          carrier_name: carrier,
        };
      }
    }
  } catch (err) {
    console.warn("[CJ Client] getOrderDetail error:", err);
  }

  try {
    // 2. Fallback to shopping/order/list search
    const listUrl = `${CJ_BASE_URL}/shopping/order/list?orderNum=${encodeURIComponent(targetId)}`;
    const resp = await fetch(listUrl, {
      headers: { "CJ-Access-Token": token },
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok) {
      const resJson = await resp.json();
      const list = resJson.data?.list;
      if (Array.isArray(list) && list.length > 0) {
        const item = list[0];
        const tracking = item.trackingNumber || item.trackNumber || null;
        const carrier = item.logisticName || item.shippingMethod || "USPS";
        return {
          found: true,
          cj_order_id: String(item.orderId || targetId),
          status: item.orderStatus || item.status || "PROCESSING",
          tracking_number: tracking,
          carrier_name: carrier,
        };
      }
    }
  } catch (err) {
    console.warn("[CJ Client] order/list search error:", err);
  }

  return { found: false };
}
