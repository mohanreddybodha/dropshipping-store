import { NextResponse } from "next/server";
import { getAuthoritativeCatalog } from "@/lib/catalogServer";
import { Product, Variant } from "@/lib/types";
import {
  SITE_NAME,
  SITE_URL,
  getProductImages,
  normalizeBrandName,
  sanitizeProductDescriptionHtml,
  stripHtmlTags,
  toAbsoluteUrl,
} from "@/lib/seo";

export const revalidate = 3600;

const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  "home & kitchen": "Home & Garden",
  "workspace & tech": "Electronics > Electronics Accessories",
  "smart lighting": "Home & Garden > Lighting",
  "outdoor & patio": "Home & Garden > Lawn & Garden",
  "everyday carry & auto": "Vehicles & Parts > Vehicle Maintenance, Care & Decor",
};

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveGoogleCategory(category?: string | null): string {
  const key = (category || "").trim().toLowerCase();
  return GOOGLE_CATEGORY_MAP[key] || "Home & Garden";
}

function buildItemDescription(product: Product): string {
  const cleanHtml = sanitizeProductDescriptionHtml(
    product.pas_description_html,
    product.title
  );
  const overview = stripHtmlTags(cleanHtml)
    .replace(/30-day money-back guarantee/gi, "30-day defect replacement & return support")
    .trim();

  const featureBullets = (product.features || [])
    .filter((f) => f?.title && f?.desc)
    .map((f) => `${f.title.trim()}: ${f.desc.trim()}`)
    .join(" | ");

  const combined = [overview, featureBullets, "Free 3-5 day tracked US shipping via USPS."]
    .filter(Boolean)
    .join(" ");

  return combined.slice(0, 4900);
}

function getVariantLabel(variant: Variant): string {
  const candidate = (variant.display_name || variant.variant_name || "").trim();
  if (
    !candidate ||
    candidate.toLowerCase() === "default" ||
    candidate.toLowerCase() === "standard edition"
  ) {
    return "";
  }
  return candidate;
}

export async function GET() {
  const catalog = await getAuthoritativeCatalog(2500);
  const seenIds = new Set<string>();
  const itemsXml: string[] = [];

  for (const product of catalog) {
    if (!product?.slug || !product?.title || product.is_active === false) continue;

    const variants =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants
        : [];
    if (variants.length === 0) continue;

    const hasMultipleVariants = variants.length > 1;
    const baseDescription = buildItemDescription(product);
    const baseImages = getProductImages(product);
    const brandName = normalizeBrandName(product.brand_title);
    const googleCategory = resolveGoogleCategory(product.category);
    const productType = (product.category || "Home & Kitchen").trim();

    for (const variant of variants) {
      const price = Number(variant.retail_price_1x);
      if (!Number.isFinite(price) || price <= 0) continue;

      const itemId = String(variant.vid || variant.sku || `${product.pid}-${variant.id || "1"}`)
        .trim()
        .slice(0, 50);
      if (!itemId || seenIds.has(itemId)) continue;
      seenIds.add(itemId);

      const variantLabel = getVariantLabel(variant);
      const itemTitle =
        hasMultipleVariants && variantLabel && !product.title.toLowerCase().includes(variantLabel.toLowerCase())
          ? `${product.title} - ${variantLabel}`.slice(0, 150)
          : product.title.slice(0, 150);

      const itemLink = hasMultipleVariants && variant.vid
        ? `${SITE_URL}/products/${product.slug}?vid=${encodeURIComponent(variant.vid)}`
        : `${SITE_URL}/products/${product.slug}`;

      const variantImg = toAbsoluteUrl(variant.image_url);
      const primaryImage =
        variantImg && !variantImg.endsWith("/placeholder.jpg")
          ? variantImg
          : baseImages[0];

      const additionalImages = baseImages
        .filter((img) => img !== primaryImage)
        .slice(0, 9);

      const isAvailable =
        variant.is_available !== false &&
        (variant.us_warehouse_stock === undefined || variant.us_warehouse_stock > 0);
      const availability = isAvailable ? "in_stock" : "out_of_stock";

      const colorVal = (variant.color || "").trim();
      const sizeVal = (variant.size || "").trim();

      const lines = [
        "    <item>",
        `      <g:id>${escapeXml(itemId)}</g:id>`,
        ...(hasMultipleVariants && product.pid
          ? [`      <g:item_group_id>${escapeXml(String(product.pid).slice(0, 50))}</g:item_group_id>`]
          : []),
        `      <g:title>${escapeXml(itemTitle)}</g:title>`,
        `      <g:description>${escapeXml(baseDescription)}</g:description>`,
        `      <g:link>${escapeXml(itemLink)}</g:link>`,
        `      <g:image_link>${escapeXml(primaryImage)}</g:image_link>`,
        ...additionalImages.map(
          (img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`
        ),
        "      <g:condition>new</g:condition>",
        `      <g:availability>${availability}</g:availability>`,
        `      <g:price>${price.toFixed(2)} USD</g:price>`,
        `      <g:brand>${escapeXml(brandName)}</g:brand>`,
        "      <g:identifier_exists>false</g:identifier_exists>",
        `      <g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`,
        `      <g:product_type>${escapeXml(productType)}</g:product_type>`,
        ...(colorVal ? [`      <g:color>${escapeXml(colorVal.slice(0, 100))}</g:color>`] : []),
        ...(sizeVal ? [`      <g:size>${escapeXml(sizeVal.slice(0, 100))}</g:size>`] : []),
        "      <g:shipping>",
        "        <g:country>US</g:country>",
        "        <g:service>USPS Ground Advantage</g:service>",
        "        <g:price>0.00 USD</g:price>",
        "        <g:min_handling_time>1</g:min_handling_time>",
        "        <g:max_handling_time>2</g:max_handling_time>",
        "        <g:min_transit_time>3</g:min_transit_time>",
        "        <g:max_transit_time>5</g:max_transit_time>",
        "      </g:shipping>",
        "    </item>",
      ];

      itemsXml.push(lines.join("\n"));
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    `    <title>${escapeXml(SITE_NAME)} Product Feed</title>`,
    `    <link>${SITE_URL}</link>`,
    "    <description>Curated Home, Kitchen, Workspace &amp; Living Essentials from Vastire with free 3-5 day tracked US delivery.</description>",
    ...itemsXml,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
