import { CustomerOrder, PaginatedCatalogResponse, Product } from "./types";
import seedData from "./seedCatalog.json";

export function getApiBaseUrl(): string {
  // 1. If explicit NEXT_PUBLIC_API_URL is configured
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim();
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
      return raw.replace(/\/$/, "");
    }
  }
  // 2. Client-side browser defaults to same-origin /api
  if (typeof window !== "undefined") {
    return "/api";
  }
  // 3. Server-side Next.js SSR defaults to Vercel or local port
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api`;
  }
  return `http://localhost:${process.env.PORT || 3000}/api`;
}

export const FALLBACK_PRODUCTS: Product[] = seedData as unknown as Product[];

export interface CatalogQueryOptions {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  page?: number;
  limit?: number;
  paginate?: boolean;
}

export function filterFallbackProducts(options?: CatalogQueryOptions): Product[] {
  let list = [...FALLBACK_PRODUCTS];

  // 1. Category Filter
  if (options?.category && options.category.toLowerCase() !== "all" && options.category.toLowerCase() !== "all products") {
    const cat = options.category.toLowerCase().trim();
    list = list.filter(
      (p) =>
        (p.category && p.category.toLowerCase().includes(cat)) ||
        (p.seo_meta?.category && p.seo_meta.category.toLowerCase().includes(cat))
    );
  }

  // 2. Search Filter
  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.features?.some((f) => f.title.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
    );
  }

  // 3. Price Filter
  if (options?.min_price !== undefined) {
    list = list.filter((p) => (p.variants[0]?.retail_price_1x || 0) >= options.min_price!);
  }
  if (options?.max_price !== undefined) {
    list = list.filter((p) => (p.variants[0]?.retail_price_1x || 0) <= options.max_price!);
  }

  // 4. Sorting
  if (options?.sort === "price_asc") {
    list.sort((a, b) => (a.variants[0]?.retail_price_1x || 0) - (b.variants[0]?.retail_price_1x || 0));
  } else if (options?.sort === "price_desc") {
    list.sort((a, b) => (b.variants[0]?.retail_price_1x || 0) - (a.variants[0]?.retail_price_1x || 0));
  } else if (options?.sort === "rating") {
    list.sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));
  }

  if (options?.limit) {
    list = list.slice(0, options.limit);
  }

  return list;
}

export async function getCatalog(options?: CatalogQueryOptions): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (options?.category && options.category.toLowerCase() !== "all" && options.category.toLowerCase() !== "all products") {
      params.set("category", options.category);
    }
    if (options?.search) params.set("search", options.search);
    if (options?.min_price !== undefined) params.set("min_price", options.min_price.toString());
    if (options?.max_price !== undefined) params.set("max_price", options.max_price.toString());
    if (options?.sort) params.set("sort", options.sort);
    if (options?.limit) params.set("limit", options.limit.toString());
    else params.set("limit", "200");

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getApiBaseUrl()}/catalog${queryStr}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("Catalog fetch failed");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      return data.items;
    }
    return filterFallbackProducts(options);
  } catch {
    return filterFallbackProducts(options);
  }
}

export async function getPaginatedCatalog(options?: CatalogQueryOptions): Promise<PaginatedCatalogResponse> {
  try {
    const params = new URLSearchParams();
    params.set("paginate", "true");
    if (options?.category && options.category.toLowerCase() !== "all" && options.category.toLowerCase() !== "all products") {
      params.set("category", options.category);
    }
    if (options?.search) params.set("search", options.search);
    if (options?.min_price !== undefined) params.set("min_price", options.min_price.toString());
    if (options?.max_price !== undefined) params.set("max_price", options.max_price.toString());
    if (options?.sort) params.set("sort", options.sort);
    if (options?.page) params.set("page", options.page.toString());
    if (options?.limit) params.set("limit", options.limit.toString());
    else params.set("limit", "24");

    const res = await fetch(`${getApiBaseUrl()}/catalog?${params.toString()}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("Paginated catalog fetch failed");
    return await res.json();
  } catch {
    const filtered = filterFallbackProducts(options);
    const limit = options?.limit || 24;
    const page = options?.page || 1;
    const totalPages = Math.ceil(filtered.length / limit) || 1;
    const items = filtered.slice((page - 1) * limit, page * limit);

    const categories_summary: Record<string, number> = {};
    for (const p of FALLBACK_PRODUCTS) {
      const cat = p.category || "General";
      categories_summary[cat] = (categories_summary[cat] || 0) + 1;
    }

    return {
      items,
      total_count: filtered.length,
      total_pages: totalPages,
      current_page: page,
      categories_summary,
    };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/catalog/${slug}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("Product fetch failed");
    return await res.json();
  } catch {
    const fallback = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
    return fallback || null;
  }
}

export async function getCustomerOrders(email: string): Promise<CustomerOrder[]> {
  try {
    const cleanEmail = encodeURIComponent(email.trim().toLowerCase());
    const res = await fetch(`${getApiBaseUrl()}/orders?email=${cleanEmail}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

export async function lookupOrdersDualFactor(
  email: string,
  zipCode: string
): Promise<CustomerOrder[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/orders/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), zip_code: zipCode.trim() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.detail || "Lookup failed");
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  } catch (err: any) {
    throw new Error(err.message || "Failed to retrieve orders.");
  }
}

export async function syncUserAuth(payload: {
  firebase_uid: string;
  email?: string | null;
  phone_number?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
  guest_cart?: any[];
  guest_watchlist?: string[];
}): Promise<any> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || "Sync failed");
    }
    return await res.json();
  } catch {
    // Fail silently without cluttering developer browser console
    return null;
  }
}

export async function getUserAuthState(
  firebaseUid: string,
  email?: string | null,
  phone?: string | null
): Promise<any> {
  try {
    const params = new URLSearchParams({ firebase_uid: firebaseUid });
    if (email) params.append("email", email);
    if (phone) params.append("phone", phone);

    const res = await fetch(`${getApiBaseUrl()}/auth/state?${params.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createCheckoutOrder(payload: {
  internal_order_number?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_zip: string;
  shipping_country?: string;
  total_retail: number;
  carrier_name?: string;
  tracking_number?: string;
  items: any[];
  firebase_uid?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || "Order checkout failed");
    }
    return await res.json();
  } catch (err: any) {
    console.warn("Direct order persistence to backend failed, cached locally:", err.message);
    return null;
  }
}

export async function saveUserCart(
  firebaseUid: string,
  items: any[]
): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/cart/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebase_uid: firebaseUid, items }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleUserWatchlist(
  firebaseUid: string,
  productPid: string
): Promise<any> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/watchlist/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebase_uid: firebaseUid, product_pid: productPid }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
