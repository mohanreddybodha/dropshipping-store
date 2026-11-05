import React from "react";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getProductBySlug, getCatalog, FALLBACK_PRODUCTS } from "../../../lib/api";
import {
  ProductGallery,
  ProductInteractivePanel,
  ProductAccordion,
  MobileStickyBuyBar,
  ProductBackButton,
  ProductShareButton,
  ProductWatchlistButton,
  InfiniteCatalogFeed,
} from "../../../components/product";
import TrackRecentlyViewed from "../../../components/product/TrackRecentlyViewed";
import HorizontalProductRow from "../../../components/catalog/HorizontalProductRow";
import { Truck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const dynamicParams = true;
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ vid?: string; size?: string; color?: string }>;
}

export async function generateStaticParams() {
  return FALLBACK_PRODUCTS.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.seo_meta?.meta_title || `${product.title} | Fast US Shipping — Same-Day Dispatch`,
    description:
      product.seo_meta?.meta_description ||
      "Free domestic delivery with fast dispatch. Verified quality product.",
  };
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Product Unavailable</h1>
        <p className="text-xs text-slate-500">This item is currently out of stock.</p>
      </div>
    );
  }

  // Canonical URL Enforcement: redirect non-standard or spaced slugs to the official slug
  if (product.slug && decodeURIComponent(slug).trim() !== product.slug) {
    permanentRedirect(`/products/${product.slug}`);
  }

  // Fetch catalog and project lightweight summary representations (eliminates 450KB RSC Flight bloat)
  const allProducts = await getCatalog({ limit: 100 });
  const categoryName = product.category || "Featured";

  const toCardSummary = (p: typeof product) => ({
    id: p.id,
    pid: p.pid,
    slug: p.slug,
    title: p.title,
    hero_image_url: p.hero_image_url || p.images?.[0] || "/placeholder.jpg",
    category: p.category || "General",
    variants: [
      {
        vid: p.variants?.[0]?.vid || "default",
        title: p.variants?.[0]?.title || "Default",
        retail_price_1x: p.variants?.[0]?.retail_price_1x || 24.99,
      } as any,
    ],
  } as typeof product);

  // Section 1: Same category products (lightweight card projections, max 10)
  const sameCategoryProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.category?.toLowerCase() === product.category?.toLowerCase()
    )
    .slice(0, 10)
    .map(toCardSummary);

  // Section 2: Suggested For You (lightweight card projections, max 24)
  const suggestedProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.category?.toLowerCase() !== product.category?.toLowerCase()
    )
    .slice(0, 24)
    .map(toCardSummary);

  // Match requested variant from deep link if vid, size, or color query parameters are present
  let targetVariant = product.variants[0];
  if (sp.vid) {
    const foundByVid = product.variants.find((v) => v.vid === sp.vid);
    if (foundByVid) targetVariant = foundByVid;
  } else if (sp.color || sp.size) {
    const foundByOption = product.variants.find((v) => {
      const matchColor = !sp.color || (v.color && v.color.toLowerCase() === sp.color.toLowerCase()) || (v.variant_name && v.variant_name.toLowerCase().includes(sp.color.toLowerCase()));
      const matchSize = !sp.size || (v.size && v.size.toLowerCase() === sp.size.toLowerCase()) || (v.variant_name && v.variant_name.toLowerCase().includes(sp.size.toLowerCase()));
      return matchColor && matchSize;
    });
    if (foundByOption) targetVariant = foundByOption;
  }
  const primaryVariant = targetVariant;

  // Programmatic JSON-LD Schema
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "sku": primaryVariant?.sku || product.pid,
    "image": product.images || [product.hero_image_url],
    "description": product.pas_description_html?.replace(/<[^>]*>?/gm, "").slice(0, 200),
    "brand": {
      "@type": "Brand",
      "name": product.brand_title || "Vastire",
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": primaryVariant?.retail_price_1x || 24.99,
      "availability": "https://schema.org/InStock",
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": { "@type": "MonetaryAmount", "value": "0.00", "currency": "USD" },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "transitTime": { "@type": "QuantitativeValue", "minValue": 3, "maxValue": 5, "unitCode": "DAY" },
        },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-24 sm:pb-28 md:pb-10 space-y-5 sm:space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <TrackRecentlyViewed product={product} />

      {/* Top Action Row: Back Button on left, Watchlist & Share Buttons on right (Zero wasted space) */}
      <div className="flex items-center justify-between">
        <ProductBackButton />
        <div className="flex items-center gap-2">
          <ProductWatchlistButton product={product} />
          <ProductShareButton title={product.title} />
        </div>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Left Column: Visual Showcase (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Title */}
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {product.title}
            </h1>
          </div>

          {/* Interactive Product Gallery with All Variant Images */}
          {(() => {
            const allImages: string[] = [];
            if (targetVariant?.image_url) allImages.push(targetVariant.image_url);
            if (product.hero_image_url) allImages.push(product.hero_image_url);
            if (product.images && Array.isArray(product.images)) {
              allImages.push(...product.images);
            }
            if (product.variants && Array.isArray(product.variants)) {
              product.variants.forEach((v) => {
                if (v.image_url) allImages.push(v.image_url);
              });
            }
            const uniqueImages = Array.from(new Set(allImages.filter(Boolean)));
            return (
              <ProductGallery
                images={uniqueImages.length > 0 ? uniqueImages : ["/placeholder.jpg"]}
                title={product.title}
              />
            );
          })()}

          {/* Free Delivery & Domestic Fulfillment Status opposite each other below images */}
          <div className="flex items-center justify-between py-1.5 px-1 text-xs border-b border-slate-100">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5 text-[11px]">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Free Delivery
            </span>

            {/* Fulfillment Trust Badge */}
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contiguous US Fulfillment</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Bundle Selector + Product Details Accordion (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          <ProductInteractivePanel
            product={product}
            variant={targetVariant}
            initialSize={sp.size}
            initialColor={sp.color}
          />

          {/* Compact Product Details, Specs & Features Accordion (collapsed by default, smooth animated) */}
          <ProductAccordion product={product} />
        </div>
      </div>

      {/* 1. More in Category (Horizontal Swipeable Carousel) */}
      {sameCategoryProducts.length > 0 && (
        <HorizontalProductRow
          title={`More in ${categoryName}`}
          viewAllHref={`/?category=${encodeURIComponent(categoryName)}`}
          viewAllText="View All"
          products={sameCategoryProducts.slice(0, 10)}
        />
      )}

      {/* 2. Suggested For You (Vertical 2-Column Endless Scroll, Zero Category Overlap) */}
      <InfiniteCatalogFeed
        products={suggestedProducts}
        title="Suggested For You"
      />

      {/* Mobile Sticky Bottom Action Bar */}
      <MobileStickyBuyBar product={product} variant={targetVariant} />
    </div>
  );
}
