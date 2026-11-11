import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { FALLBACK_PRODUCTS } from "@/lib/api";
import { SITE_URL, toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

interface SitemapProductRecord {
  slug: string;
  images: string[];
}

async function getSitemapProducts(): Promise<SitemapProductRecord[]> {
  const bySlug = new Map<string, SitemapProductRecord>();

  const register = (slug?: string, hero?: string, imgs?: unknown) => {
    const cleanSlug = (slug || "").trim();
    if (!cleanSlug) return;
    const rawImages: string[] = [];
    if (hero) rawImages.push(hero);
    if (Array.isArray(imgs)) {
      for (const im of imgs) {
        if (typeof im === "string") rawImages.push(im);
      }
    }
    const validImages = Array.from(
      new Set(
        rawImages
          .map((u) => toAbsoluteUrl(u))
          .filter((u) => u.startsWith("https://") || u.startsWith("http://"))
          .map((u) => u.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;"))
      )
    ).slice(0, 6);

    bySlug.set(cleanSlug, { slug: cleanSlug, images: validImages });
  };

  for (const p of FALLBACK_PRODUCTS) {
    if (p.is_active !== false) {
      register(p.slug, p.hero_image_url, p.images);
    }
  }

  if (process.env.DATABASE_URL) {
    try {
      const sql = getDb();
      const dbPromise = sql`
        SELECT slug, hero_image_url, images_json
        FROM products
        WHERE is_active = true
        ORDER BY id ASC
        LIMIT 500
      `;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sitemap DB timeout")), 2500)
      );
      const rows = (await Promise.race([dbPromise, timeoutPromise])) as any[];
      for (const r of rows) {
        register(r.slug, r.hero_image_url, r.images_json);
      }
    } catch {
      // Fallback catalog already populated above
    }
  }

  return Array.from(bySlug.values());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getSitemapProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/shipping-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
    ...(p.images.length > 0 ? { images: p.images } : {}),
  }));

  return [...staticRoutes, ...productRoutes];
}
