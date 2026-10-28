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
} from "../../../components/product";
import ProductCard from "../../../components/catalog/ProductCard";
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

  // Fetch catalog for suggested & related products
  const allProducts = await getCatalog({ limit: 60 });
  const categoryName = product.category || "Featured";

  // Section 1: Same category products (excluding current product)
  const sameCategoryProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.category?.toLowerCase() === product.category?.toLowerCase()
    )
    .slice(0, 4);

  // Section 2: Related products from other categories (excluding current product)
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.category?.toLowerCase() !== product.category?.toLowerCase()
    )
    .slice(0, 8);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-4 pb-32 sm:pb-36 md:pb-14 space-y-6 sm:space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Top Action Row: Back Button on left, Share Button on right (Zero wasted space) */}
      <div className="flex items-center justify-between">
        <ProductBackButton />
        <ProductShareButton title={product.title} />
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

      {/* Suggested Products: Section 1 — More in Same Category */}
      {sameCategoryProducts.length > 0 && (
        <section className="pt-8 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                More in {categoryName}
              </h2>
              <p className="text-xs text-slate-500">
                Top picks in this collection with free domestic delivery
              </p>
            </div>
            <Link
              href={`/?category=${encodeURIComponent(categoryName)}`}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              <span>View All</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {sameCategoryProducts.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Suggested Products: Section 2 — Related & Trending Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-6 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                You May Also Like
              </h2>
              <p className="text-xs text-slate-500">
                Popular items frequently explored by our shoppers
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              <span>Explore All</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <MobileStickyBuyBar product={product} variant={primaryVariant} />
    </div>
  );
}
