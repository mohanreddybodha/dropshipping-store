import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getAuthoritativeCatalog } from "../../../lib/catalogServer";
import { CatalogExplorer } from "../../../components/catalog";
import {
  COLLECTION_DEFINITIONS,
  SITE_NAME,
  SITE_URL,
  buildCatalogItemListJsonLd,
  getCategorySeoProfile,
  getCollectionBySlug,
  toAbsoluteUrl,
} from "../../../lib/seo";

export const revalidate = 3600;

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COLLECTION_DEFINITIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) {
    return {
      title: `Collection Not Found | ${SITE_NAME}`,
      robots: { index: false, follow: false },
    };
  }

  const profile = getCategorySeoProfile(collection.category);
  const canonicalUrl = `${SITE_URL}/collections/${collection.slug}`;
  const catalog = await getAuthoritativeCatalog(1200);
  const firstMatch = catalog.find((p) =>
    (p.category || "").toLowerCase().includes(collection.category.toLowerCase())
  );
  const ogImage = toAbsoluteUrl(
    firstMatch?.hero_image_url || firstMatch?.images?.[0] || "/icon-512.png"
  );

  return {
    title: profile.title,
    description: profile.description,
    keywords: profile.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: ogImage, alt: profile.headline }],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.title,
      description: profile.description,
      images: [ogImage],
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) {
    notFound();
  }

  const allProducts = await getAuthoritativeCatalog(1200);
  const categoryProducts = allProducts.filter(
    (p) =>
      (p.category &&
        p.category.toLowerCase().includes(collection.category.toLowerCase())) ||
      (p.seo_meta?.category &&
        p.seo_meta.category.toLowerCase().includes(collection.category.toLowerCase()))
  );

  const profile = getCategorySeoProfile(collection.category);
  const canonicalUrl = `${SITE_URL}/collections/${collection.slug}`;
  const collectionSchema = buildCatalogItemListJsonLd(
    categoryProducts,
    collection.category,
    canonicalUrl
  );
  const breadcrumbSchema = {
    "@context": "https://schema.org",
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
        name: collection.category,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 pt-1.5 sm:pt-2.5 pb-[82px] md:pb-6 space-y-3">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([collectionSchema, breadcrumbSchema]),
        }}
      />

      {/* Semantic Breadcrumb & Collection Intro */}
      <div className="space-y-1.5 pb-1">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"
        >
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">{collection.category}</span>
        </nav>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {profile.headline}
          </h1>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            {categoryProducts.length} Curated Items
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
          {collection.shortDesc}
        </p>
      </div>

      {/* Full SSR Category Catalog Grid */}
      <CatalogExplorer
        initialProducts={categoryProducts}
        initialCategory={collection.category}
        initialPageSize={Math.max(60, categoryProducts.length)}
        isCollectionPage={true}
      />

      {/* Internal Cross-Collection Links for SEO Crawlability */}
      <section
        aria-label="Explore More Collections"
        className="pt-4 border-t border-slate-200/80 space-y-2.5"
      >
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Explore Other Collections
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition"
          >
            All Products
          </Link>
          {COLLECTION_DEFINITIONS.filter((c) => c.slug !== collection.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition"
            >
              {c.category}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
