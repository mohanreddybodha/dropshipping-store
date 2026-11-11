import React from "react";
import type { Metadata } from "next";
import { getAuthoritativeCatalog } from "../lib/catalogServer";
import { Product } from "../lib/types";
import { CatalogExplorer } from "../components/catalog";
import {
  SITE_NAME,
  SITE_URL,
  getCategorySeoProfile,
  buildCatalogItemListJsonLd,
} from "../lib/seo";

export const revalidate = 60;

interface HomePageProps {
  searchParams?: Promise<{ category?: string; search?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  const category = sp.category?.trim();
  const search = sp.search?.trim();
  const pageNum = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  if (search) {
    return {
      title: `Search results for "${search}" | ${SITE_NAME}`,
      description: `Browse search results for ${search} on ${SITE_NAME}.`,
      alternates: { canonical: SITE_URL },
      robots: { index: false, follow: true },
    };
  }

  const profile = getCategorySeoProfile(category);

  return {
    title: pageNum > 1 ? `${profile.title} — Page ${pageNum}` : profile.title,
    description: profile.description,
    keywords: profile.keywords,
    alternates: { canonical: SITE_URL },
    ...(pageNum > 1 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: SITE_URL,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: profile.headline }],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.title,
      description: profile.description,
      images: ["/icon-512.png"],
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = searchParams ? await searchParams : {};
  const initialCategory = sp.category?.trim() || "All Products";
  const initialSearch = sp.search?.trim() || "";
  const initialPage = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const allProducts: Product[] = await getAuthoritativeCatalog(2000);
  let products = allProducts;

  if (initialCategory !== "All Products") {
    const cat = initialCategory.toLowerCase();
    products = products.filter(
      (p) =>
        (p.category && p.category.toLowerCase().includes(cat)) ||
        (p.seo_meta?.category && p.seo_meta.category.toLowerCase().includes(cat))
    );
  }
  if (initialSearch) {
    const q = initialSearch.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.features?.some((f) => f.title.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
    );
  }

  const itemListSchema = buildCatalogItemListJsonLd(
    products,
    initialCategory !== "All Products" ? initialCategory : undefined,
    SITE_URL
  );

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3.5 pb-20 md:pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <CatalogExplorer
        initialProducts={allProducts}
        initialCategory={initialCategory}
        initialSearch={initialSearch}
        initialPage={initialPage}
      />
    </div>
  );
}
