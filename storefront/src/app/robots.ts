import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ["Pinterestbot", "Pinterest"],
        allow: [
          "/",
          "/collections/",
          "/products/",
          "/catalog.xml",
          "/feed.xml",
          "/merchant-feed.xml",
          "/api/catalog/feed",
          "/privacy",
          "/terms",
          "/shipping-policy",
          "/refund-policy",
        ],
        disallow: [
          "/admin/",
          "/cart",
          "/checkout",
          "/orders",
          "/profile",
          "/watchlist",
        ],
      },
      {
        userAgent: "*",
        allow: [
          "/",
          "/collections/",
          "/products/",
          "/catalog.xml",
          "/feed.xml",
          "/merchant-feed.xml",
          "/api/catalog/feed",
          "/privacy",
          "/terms",
          "/shipping-policy",
          "/refund-policy",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/cart",
          "/checkout",
          "/orders",
          "/profile",
          "/watchlist",
          "/__/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
