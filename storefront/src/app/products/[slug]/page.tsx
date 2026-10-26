import React from "react";
import { getProductBySlug } from "../../../lib/api";
import {
  ProductGallery,
  ProductInteractivePanel,
  ProductAccordion,
  MobileStickyBuyBar,
  ProductBackButton,
} from "../../../components/product";
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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Product Unavailable</h1>
        <p className="text-sm text-slate-500">This item is currently out of stock.</p>
      </div>
    );
  }

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
    /* pb-36 on mobile ensures full scrolling clearance above the sticky buy bar! */
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 pb-36 sm:pb-16 space-y-4 sm:space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Sleek round back button with no excess top space */}
      <ProductBackButton />

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        {/* Left Column: Visual Showcase (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Title & In-Stock Status (no unwanted warehouse stock details) */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {product.title}
            </h1>
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
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
          <div className="flex items-center justify-between py-2 px-1 text-xs border-b border-slate-100">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Free Delivery
            </span>

            {/* Clean Rating */}
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-slate-900 ml-0.5">{rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Bundle Selector + Accordions (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <ProductInteractivePanel product={product} variant={primaryVariant} />

          {/* Compact Accordions: Details, Damage Replacement & FAQs */}
          <ProductAccordion product={product} variant={primaryVariant} />
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <MobileStickyBuyBar product={product} variant={primaryVariant} />
    </div>
  );
}
