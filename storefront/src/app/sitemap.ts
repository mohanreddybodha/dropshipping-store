import type { MetadataRoute } from "next";
import { getAuthoritativeCatalog } from "@/lib/catalogServer";
import { SITE_URL, COLLECTION_DEFINITIONS, toAbsoluteUrl } from "@/lib/seo";

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

  // Use strictly active, compliant, >15-stock catalog (with automatic seed fallback inside catalogServer)
  const liveProducts = await getAuthoritativeCatalog(2500);
  for (const p of liveProducts) {
    if (p.is_active !== false && Array.isArray(p.variants) && p.variants.length > 0) {
      register(p.slug, p.hero_image_url, p.images);
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
    ...COLLECTION_DEFINITIONS.map((col) => ({
      url: `${SITE_URL}/collections/${col.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
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
