import { Product, Variant } from "./types";

export const SITE_URL = "https://vastire.com";
export const SITE_NAME = "Vastire";
export const SUPPORT_EMAIL = "support@vastire.com";

export const STORE_CATEGORIES = [
  "Home & Kitchen",
  "Workspace & Tech",
  "Smart Lighting",
  "Outdoor & Patio",
  "Everyday Carry & Auto",
] as const;

export interface CategorySeoProfile {
  headline: string;
  title: string;
  description: string;
  keywords: string[];
}

export const CATEGORY_SEO_PROFILES: Record<string, CategorySeoProfile> = {
  "All Products": {
    headline: "Curated Home, Kitchen & Workspace Essentials",
    title: "Vastire | Curated Home, Kitchen & Workspace Essentials — Free US Shipping",
    description:
      "Shop curated everyday essentials for home, kitchen, workspace, lighting, and outdoors at Vastire. Tracked 3–5 day domestic US delivery and bundle savings up to 18%.",
    keywords: [
      "Vastire",
      "curated home essentials",
      "modern kitchen tools",
      "workspace tech accessories",
      "smart lighting decor",
      "US domestic shipping store",
    ],
  },
  "Home & Kitchen": {
    headline: "Home & Kitchen Essentials",
    title: "Home & Kitchen Essentials | Organizers, Drinkware & Tools — Vastire",
    description:
      "Upgrade daily living with Vastire Home & Kitchen essentials: kitchen prep tools, storage racks, cabinet hardware, and insulated drinkware with free 3–5 day US shipping.",
    keywords: [
      "home and kitchen essentials",
      "kitchen prep tools",
      "bathroom shower organizer",
      "cabinet hardware pulls",
      "insulated coffee tumbler",
    ],
  },
  "Workspace & Tech": {
    headline: "Workspace & Desk Tech Accessories",
    title: "Workspace & Desk Tech Accessories | Charging & Desk Gear — Vastire",
    description:
      "Shop ergonomic desk tools, high-velocity cooling fans, USB hubs, and charging essentials engineered for productive modern workspaces. Free tracked US shipping.",
    keywords: [
      "workspace tech accessories",
      "USB turbo desk fan",
      "desk organization gear",
      "home office setup tools",
      "fast charging accessories",
    ],
  },
  "Smart Lighting": {
    headline: "Smart & Ambient Lighting",
    title: "Smart Lighting & LED Decor | Bedside, Desk & Ambient Lamps — Vastire",
    description:
      "Discover flicker-free LED lamps, digital backlit alarm clocks, and ambient night lights crafted for bedrooms and desks. Free 3–5 day tracked US delivery.",
    keywords: [
      "smart lighting decor",
      "LED bedside night light",
      "digital backlit alarm clock",
      "USB ambient lamp",
      "modern home lighting",
    ],
  },
  "Outdoor & Patio": {
    headline: "Outdoor, Garden & Patio Essentials",
    title: "Outdoor & Patio Gear | Weather-Ready Living Essentials — Vastire",
    description:
      "Explore practical outdoor, portable cooling, and backyard gear built for US homes and travel. Ships fast from domestic US hubs with zero surprise fees.",
    keywords: [
      "outdoor and patio essentials",
      "portable travel gear",
      "backyard living tools",
      "summer outdoor cooling",
    ],
  },
  "Everyday Carry & Auto": {
    headline: "Everyday Carry & Automotive Care",
    title: "Everyday Carry & Auto Care Essentials | Tools & Maintenance — Vastire",
    description:
      "Keep your vehicle and daily carry sharp with automotive detailing sprays, compact utility gear, and portable tools dispatched fast within the United States.",
    keywords: [
      "everyday carry essentials",
      "auto care detailing spray",
      "rust remover automotive",
      "compact utility tools",
    ],
  },
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toAbsoluteUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${SITE_URL}${trimmed}`;
  }
  return `${SITE_URL}/${trimmed}`;
}

export function stripHtmlTags(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
    .replace(/&rsquo;|&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateAtWord(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(maxLen * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.replace(/[,.;:\-–—]+$/, "").trim()}…`;
}

export function normalizeBrandName(rawBrand?: string | null): string {
  const clean = (rawBrand || "").trim();
  const lower = clean.toLowerCase();
  if (
    !clean ||
    lower === "vastire curated" ||
    lower === "domestic lab" ||
    lower === "domesticlab"
  ) {
    return SITE_NAME;
  }
  return clean;
}

/**
 * Replaces raw supplier slug placeholders inside `pas_description_html` (e.g. garbled
 * `<strong>New For Keeping Turbo Fans For With</strong>`) with the clean editorial title.
 */
export function sanitizeProductDescriptionHtml(
  html: string | undefined | null,
  cleanTitle: string
): string {
  if (!html) return "";
  const escapedTitle = escapeHtml(cleanTitle.trim());
  let replacedFirstStrong = false;
  return html.replace(/<strong>([^<]{2,140})<\/strong>/i, (full, inner) => {
    if (replacedFirstStrong) return full;
    replacedFirstStrong = true;
    const normalizedInner = String(inner || "").trim();
    if (!normalizedInner || normalizedInner.toLowerCase() === cleanTitle.trim().toLowerCase()) {
      return full;
    }
    return `<strong>${escapedTitle}</strong>`;
  });
}

export function getCategorySeoProfile(category?: string | null): CategorySeoProfile {
  if (!category) return CATEGORY_SEO_PROFILES["All Products"];
  const normalized = category.trim().toLowerCase();
  const matchedKey = Object.keys(CATEGORY_SEO_PROFILES).find(
    (k) => k.toLowerCase() === normalized || k.toLowerCase().includes(normalized)
  );
  if (matchedKey) return CATEGORY_SEO_PROFILES[matchedKey];
  const label = category.trim();
  return {
    headline: label,
    title: `${label} | ${SITE_NAME} — Free US Shipping`,
    description: `Browse ${label} essentials on ${SITE_NAME}. Dispatched from US domestic centers with free 3–5 day tracked USPS delivery and multi-pack bundle savings.`,
    keywords: [label, SITE_NAME, `${label} online`, "fast US shipping"],
  };
}

export interface ProductSeoMetadataResult {
  title: string;
  description: string;
  canonicalUrl: string;
  keywords: string[];
  images: string[];
  brandName: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
}

function getPriceBounds(product: Product): { minPrice: number; maxPrice: number; inStock: boolean } {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = variants.filter((v) => v.is_available !== false);
  const pricePool = (activeVariants.length > 0 ? activeVariants : variants)
    .map((v) => Number(v.retail_price_1x))
    .filter((n) => Number.isFinite(n) && n > 0);

  const minPrice = pricePool.length > 0 ? Math.min(...pricePool) : 24.99;
  const maxPrice = pricePool.length > 0 ? Math.max(...pricePool) : minPrice;
  const inStock =
    variants.length === 0 ||
    variants.some((v) => v.is_available !== false && (v.us_warehouse_stock === undefined || v.us_warehouse_stock > 0));

  return { minPrice, maxPrice, inStock };
}

export function getProductImages(product: Product): string[] {
  const raw: string[] = [];
  if (product.hero_image_url) raw.push(product.hero_image_url);
  if (Array.isArray(product.images)) raw.push(...product.images);
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v.image_url) raw.push(v.image_url);
    }
  }
  const abs = Array.from(
    new Set(
      raw
        .map((img) => toAbsoluteUrl(img))
        .filter((u) => u && !u.endsWith("/placeholder.jpg"))
    )
  );
  return abs.length > 0 ? abs : [`${SITE_URL}/icon-512.png`];
}

export function buildProductSeoMeta(product: Product): ProductSeoMetadataResult {
  const cleanTitle = (product.title || "Essential Home Product").trim();
  const category = (product.category || "Home & Kitchen").trim();
  const brandName = normalizeBrandName(product.brand_title);
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;
  const { minPrice, maxPrice, inStock } = getPriceBounds(product);
  const images = getProductImages(product);

  // SERP-optimal title anchored cleanly on human buyer-intent product title
  const metaTitle =
    cleanTitle.length <= 36
      ? `${cleanTitle} | Free US Shipping — ${SITE_NAME}`
      : `${cleanTitle} | ${SITE_NAME}`;

  // Clean benefit-focused snippet combining feature proof + price + domestic SLA
  const cleanHtml = sanitizeProductDescriptionHtml(product.pas_description_html, cleanTitle);
  const plainDesc = stripHtmlTags(cleanHtml);
  const firstFeature = product.features?.find(
    (f) => f?.desc && !f.desc.toLowerCase().includes("money-back")
  );
  const benefitPhrase = firstFeature?.desc
    ? firstFeature.desc.trim().replace(/\.$/, "")
    : plainDesc.slice(0, 95);

  const priceTag =
    minPrice < maxPrice ? `from $${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)}`;
  const prefix = `${cleanTitle} (${priceTag}) — `;
  const suffix = " Free 3–5 day US shipping & up to 18% bundle savings at Vastire.";
  const remainingBudget = Math.max(0, 158 - prefix.length - suffix.length);
  const rawCompact = remainingBudget >= 28 ? truncateAtWord(benefitPhrase.replace(/\.$/, ""), remainingBudget - 1) : "";
  const compactBenefit = rawCompact ? (rawCompact.endsWith("…") ? rawCompact : `${rawCompact}.`) : "";
  const description = truncateAtWord(`${prefix}${compactBenefit}${suffix}`.replace(/\s+/g, " ").trim(), 160);

  const variantTerms = (product.variants || [])
    .flatMap((v) => [v.color, v.size, v.display_name])
    .filter((x): x is string => Boolean(x && x !== "Default" && x !== "Standard Edition"))
    .slice(0, 6);

  const featureTerms = (product.features || [])
    .map((f) => f.title)
    .filter(Boolean)
    .slice(0, 4);

  const keywords = Array.from(
    new Set([
      cleanTitle,
      `buy ${cleanTitle.toLowerCase()}`,
      category,
      brandName,
      ...featureTerms,
      ...variantTerms,
      "free US shipping",
      "tracked USPS delivery",
    ])
  );

  return {
    title: metaTitle,
    description,
    canonicalUrl,
    keywords,
    images,
    brandName,
    minPrice,
    maxPrice,
    inStock,
  };
}

function getPriceValidUntilIso(): string {
  const nextYear = new Date();
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  return nextYear.toISOString().split("T")[0];
}

const SHARED_US_SHIPPING_DETAILS = {
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: "0.00",
    currency: "USD",
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "US",
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 2,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: 3,
      maxValue: 5,
      unitCode: "DAY",
    },
  },
};

const SHARED_US_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "US",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 30,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
};

export function buildGlobalOrganizationGraph(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "OnlineStore"],
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon-512.png`,
          width: 512,
          height: 512,
        },
        email: SUPPORT_EMAIL,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: SUPPORT_EMAIL,
          availableLanguage: ["English"],
          areaServed: "US",
        },
        hasMerchantReturnPolicy: SHARED_US_RETURN_POLICY,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function buildCatalogItemListJsonLd(
  products: Product[],
  category?: string
): Record<string, unknown> {
  const profile = getCategorySeoProfile(category);
  const pageUrl =
    category && category !== "All Products"
      ? `${SITE_URL}/?category=${encodeURIComponent(category)}`
      : SITE_URL;

  const listItems = products.slice(0, 36).map((p, idx) => {
    const price = p.variants?.[0]?.retail_price_1x || 24.99;
    return {
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.title,
      image: toAbsoluteUrl(p.hero_image_url || p.images?.[0] || "/icon-512.png"),
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: price.toFixed(2),
        availability: "https://schema.org/InStock",
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: profile.headline,
    description: profile.description,
    url: pageUrl,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listItems.length,
      itemListElement: listItems,
    },
  };
}

export function buildProductJsonLdGraph(
  product: Product,
  primaryVariant?: Variant
): Record<string, unknown> {
  const seo = buildProductSeoMeta(product);
  const cleanHtml = sanitizeProductDescriptionHtml(product.pas_description_html, product.title);
  const plainOverview = stripHtmlTags(cleanHtml);
  const fullDescription =
    plainOverview ||
    `${product.title} from ${seo.brandName}. Fast tracked 3–5 business day domestic US shipping.`;

  const validUntil = getPriceValidUntilIso();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const priceValues = variants
    .map((v) => Number(v.retail_price_1x))
    .filter((n) => Number.isFinite(n) && n > 0);
  const hasMultiplePrices =
    priceValues.length > 1 && Math.min(...priceValues) !== Math.max(...priceValues);

  const buildOfferForVariant = (v?: Variant) => ({
    "@type": "Offer",
    url: v?.vid ? `${seo.canonicalUrl}?vid=${encodeURIComponent(v.vid)}` : seo.canonicalUrl,
    sku: v?.sku || product.pid,
    priceCurrency: "USD",
    price: Number(v?.retail_price_1x || seo.minPrice).toFixed(2),
    priceValidUntil: validUntil,
    itemCondition: "https://schema.org/NewCondition",
    availability:
      v && (v.is_available === false || v.us_warehouse_stock === 0)
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    seller: { "@id": `${SITE_URL}/#organization` },
    shippingDetails: SHARED_US_SHIPPING_DETAILS,
    hasMerchantReturnPolicy: SHARED_US_RETURN_POLICY,
  });

  const offersBlock = hasMultiplePrices
    ? {
        "@type": "AggregateOffer",
        url: seo.canonicalUrl,
        priceCurrency: "USD",
        lowPrice: seo.minPrice.toFixed(2),
        highPrice: seo.maxPrice.toFixed(2),
        offerCount: variants.length,
        offers: variants.slice(0, 12).map((v) => buildOfferForVariant(v)),
      }
    : buildOfferForVariant(primaryVariant || variants[0]);

  const additionalProperty = Object.entries(product.specs || {})
    .filter(
      ([k, val]) =>
        k !== "warranty" &&
        k !== "carrier_sla" &&
        k !== "fulfillment_origin" &&
        val !== null &&
        val !== undefined &&
        typeof val !== "object" &&
        String(val).trim() !== ""
    )
    .slice(0, 8)
    .map(([k, val]) => ({
      "@type": "PropertyValue",
      name: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(val).trim(),
    }));

  const categoryName = (product.category || "Home & Kitchen").trim();

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Product",
      "@id": `${seo.canonicalUrl}#product`,
      name: product.title,
      url: seo.canonicalUrl,
      sku: primaryVariant?.sku || product.pid,
      mpn: primaryVariant?.sku || product.pid,
      productID: product.pid,
      category: categoryName,
      image: seo.images,
      description: truncateAtWord(fullDescription, 500),
      brand: {
        "@type": "Brand",
        name: seo.brandName,
      },
      ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
      offers: offersBlock,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: categoryName,
          item: `${SITE_URL}/?category=${encodeURIComponent(categoryName)}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.title,
          item: seo.canonicalUrl,
        },
      ],
    },
  ];

  const validFaqs = (product.faq_schema || []).filter(
    (faq) => faq?.question?.trim() && faq?.answer?.trim()
  );
  if (validFaqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: validFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question.trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer.trim(),
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
