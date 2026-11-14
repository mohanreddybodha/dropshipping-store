import { NextRequest, NextResponse } from "next/server";
import { getAuthoritativeCatalog } from "@/lib/catalogServer";
import { SITE_URL, toAbsoluteUrl } from "@/lib/seo";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html?: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeCsvField(val: string | number): string {
  const str = String(val ?? "").trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Pinterest Catalogs & Google Merchant Product Feed Endpoint
 * Supports:
 * - ?format=xml (Default): Standard Google Merchant / Pinterest XML RSS 2.0
 * - ?format=csv: Pinterest Catalogs CSV format
 * - ?format=rss: Standard Media RSS feed for Pinterest RSS Auto-Publish
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "xml").toLowerCase();

    const rawProducts = await getAuthoritativeCatalog(2500);
    const activeProducts = rawProducts.filter(
      (p) => p.is_active !== false && Array.isArray(p.variants) && p.variants.length > 0
    );

    // ==========================================
    // 1. Pinterest Catalogs CSV Format
    // ==========================================
    if (format === "csv") {
      const headers = [
        "id",
        "title",
        "description",
        "link",
        "image_link",
        "price",
        "availability",
        "condition",
        "brand",
        "product_type",
        "google_product_category",
        "shipping",
      ];

      const rows: string[] = [headers.join(",")];

      for (const p of activeProducts) {
        const price = p.variants?.[0]?.retail_price_1x || 29.99;
        const desc = p.seo_meta?.meta_description || stripHtml(p.pas_description_html) || p.title;
        const link = `${SITE_URL}/products/${p.slug}`;
        const imageLink = toAbsoluteUrl(p.hero_image_url || p.images?.[0] || "");
        const category = p.category || "Home & Living";

        rows.push(
          [
            escapeCsvField(p.slug),
            escapeCsvField(p.title),
            escapeCsvField(desc.slice(0, 5000)),
            escapeCsvField(link),
            escapeCsvField(imageLink),
            escapeCsvField(`${price.toFixed(2)} USD`),
            escapeCsvField("in stock"),
            escapeCsvField("new"),
            escapeCsvField("Vastire"),
            escapeCsvField(category),
            escapeCsvField("Home & Garden"),
            escapeCsvField("US:::0.00 USD"),
          ].join(",")
        );
      }

      return new NextResponse(rows.join("\r\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'inline; filename="pinterest-catalog.csv"',
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    // ==========================================
    // 2. Standard Media RSS (for Pinterest RSS auto-publish & scrapers)
    // ==========================================
    if (format === "rss") {
      const itemsXml = activeProducts
        .map((p) => {
          const link = `${SITE_URL}/products/${p.slug}`;
          const imageLink = toAbsoluteUrl(p.hero_image_url || p.images?.[0] || "");
          const desc = p.seo_meta?.meta_description || stripHtml(p.pas_description_html) || p.title;
          const pubDate = new Date().toUTCString();

          return `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${imageLink ? `<enclosure url="${escapeXml(imageLink)}" length="102400" type="image/jpeg" />` : ""}
      ${imageLink ? `<media:content url="${escapeXml(imageLink)}" medium="image" type="image/jpeg">
        <media:title><![CDATA[${p.title}]]></media:title>
        <media:description><![CDATA[${desc}]]></media:description>
      </media:content>` : ""}
    </item>`;
        })
        .join("\n");

      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vastire - Modern Home &amp; Living</title>
    <link>${SITE_URL}</link>
    <description>Curated modern essentials for your home, kitchen and personal workspace. Free 3-5 day tracked US shipping.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

      return new NextResponse(rssXml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    // ==========================================
    // 3. Pinterest Catalogs / Google Merchant XML (Default)
    // ==========================================
    const itemsXml = activeProducts
      .map((p) => {
        const price = p.variants?.[0]?.retail_price_1x || 29.99;
        const link = `${SITE_URL}/products/${p.slug}`;
        const imageLink = toAbsoluteUrl(p.hero_image_url || p.images?.[0] || "");
        const additionalImages = (p.images || [])
          .filter((img) => img !== p.hero_image_url)
          .slice(0, 5)
          .map((img) => `<g:additional_image_link>${escapeXml(toAbsoluteUrl(img))}</g:additional_image_link>`)
          .join("\n        ");

        const desc = p.seo_meta?.meta_description || stripHtml(p.pas_description_html) || p.title;
        const category = p.category || "Home & Living";

        return `    <item>
      <g:id>${escapeXml(p.slug)}</g:id>
      <g:title><![CDATA[${p.title}]]></g:title>
      <g:description><![CDATA[${desc}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      ${additionalImages ? `${additionalImages}` : ""}
      <g:price>${price.toFixed(2)} USD</g:price>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Vastire</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
      <g:product_type><![CDATA[${category}]]></g:product_type>
      <g:google_product_category>Home &amp; Garden</g:google_product_category>
      <g:shipping>
        <g:country>US</g:country>
        <g:service>Standard</g:service>
        <g:price>0.00 USD</g:price>
      </g:shipping>
    </item>`;
      })
      .join("\n");

    const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Vastire Product Catalog</title>
    <link>${SITE_URL}</link>
    <description>Curated modern essentials for your home, kitchen, and workspace. Free 3-5 day tracked US shipping.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(feedXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to generate catalog feed" }, { status: 500 });
  }
}
