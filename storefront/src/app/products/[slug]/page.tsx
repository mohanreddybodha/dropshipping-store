import React from "react";
import Link from "next/link";
import { getProductBySlug, getCatalog } from "../../../lib/api";
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
import ProductCard from "../../../components/catalog/ProductCard";
import HorizontalProductRow from "../../../components/catalog/HorizontalProductRow";
import ProductRecentlyViewedRow from "../../../components/product/ProductRecentlyViewedRow";
import { Star, Truck } from "lucide-react";
import type { Metadata } from "next";

export const dynamicParams = true;
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [];
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

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Product Unavailable</h1>
        <p className="text-xs text-slate-500">This item is currently out of stock.</p>
      </div>
    );
  }

  // Fetch full catalog for suggested, related & continuous infinite feed
  const allProducts = await getCatalog({ limit: 200 });
  const categoryName = product.category || "Featured";

  // Section 1: Same category products (excluding current product)
  const sameCategoryProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.category?.toLowerCase() === product.category?.toLowerCase()
    )
    .slice(0, 4);

  const sameCategorySlugs = new Set(sameCategoryProducts.map((p) => p.slug));

  // Section 2: Related products from other categories (excluding current product)
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        !sameCategorySlugs.has(p.slug) &&
        p.category?.toLowerCase() !== product.category?.toLowerCase()
    )
    .slice(0, 8);

  const relatedSlugs = new Set(relatedProducts.map((p) => p.slug));

  // Section 3: Remaining products for continuous infinite scroll feed
  const remainingProducts = allProducts.filter(
    (p) =>
      p.slug !== product.slug &&
      !sameCategorySlugs.has(p.slug) &&
      !relatedSlugs.has(p.slug)
  );

  const primaryVariant = product.variants[0];
  const rating = product.rating || 4.8;
  const reviewCount = product.review_count || 142;

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
      "name": "Domestic Lab",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "reviewCount": reviewCount,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-24 sm:pb-28 md:pb-10 space-y-6 sm:space-y-8">
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
          {/* Title & In-Stock Status (clean, no duplicate stock badges) */}
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {product.title}
            </h1>
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
              In Stock
            </p>
          </div>

          {/* Interactive Product Gallery */}
          <ProductGallery
            images={
              product.images && product.images.length > 0
                ? product.images
                : [product.hero_image_url || "/placeholder.jpg"]
            }
            title={product.title}
          />

          {/* Free Delivery & Rating opposite each other below images */}
          <div className="flex items-center justify-between py-1.5 px-1 text-xs border-b border-slate-100">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1.5 text-[11px]">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Free Delivery
            </span>

            {/* Clean Rating */}
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-slate-900 ml-0.5">{rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Bundle Selector + Product Details Accordion (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          <ProductInteractivePanel product={product} variant={primaryVariant} />

          {/* Compact Product Details, Specs & Features Accordion (collapsed by default, smooth animated) */}
          <ProductAccordion product={product} />
        </div>
      </div>

      {/* 1. More in Same Category */}
      {sameCategoryProducts.length > 0 && (
        <HorizontalProductRow
          title={`More in ${categoryName}`}
          viewAllHref={`/?category=${encodeURIComponent(categoryName)}`}
          viewAllText="View All"
          products={sameCategoryProducts}
        />
      )}

      {/* 2. You May Also Like */}
      {relatedProducts.length > 0 && (
        <HorizontalProductRow
          title="You May Also Like"
          viewAllHref="/"
          viewAllText="Explore All"
          products={relatedProducts}
        />
      )}

      {/* 3. Recently Viewed */}
      <ProductRecentlyViewedRow currentSlug={product.slug} />

      {/* 4. Continuous Infinite Discovery Feed of All Remaining Catalog Products */}
      <InfiniteCatalogFeed products={remainingProducts} />

      {/* Mobile Sticky Bottom Action Bar */}
      <MobileStickyBuyBar product={product} variant={primaryVariant} />
    </div>
  );
}
