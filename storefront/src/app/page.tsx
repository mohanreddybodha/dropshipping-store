import React from "react";
import type { Metadata } from "next";
import { getCatalog } from "../lib/api";
import { CatalogExplorer } from "../components/catalog";
import {
  SITE_NAME,
  SITE_URL,
  getCategorySeoProfile,
  buildCatalogItemListJsonLd,
} from "../lib/seo";

interface HomePageProps {
  searchParams?: Promise<{ category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  const category = sp.category?.trim();
  const search = sp.search?.trim();

  if (search) {
    return {
      title: `Search results for "${search}" | ${SITE_NAME}`,
      description: `Browse search results for ${search} on ${SITE_NAME}.`,
      alternates: { canonical: SITE_URL },
      robots: { index: false, follow: true },
    };
  }

  const profile = getCategorySeoProfile(category);
  const canonicalUrl =
    category && category !== "All Products"
      ? `${SITE_URL}/?category=${encodeURIComponent(category)}`
      : SITE_URL;

  return {
    title: profile.title,
    description: profile.description,
    keywords: profile.keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: canonicalUrl,
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

  const products = await getCatalog({
    limit: 200,
    ...(initialCategory !== "All Products" ? { category: initialCategory } : {}),
    ...(initialSearch ? { search: initialSearch } : {}),
  });

  // Always pass full catalog when unfiltered or allow seamless switching
  const allProducts =
    initialCategory !== "All Products" || initialSearch
      ? await getCatalog({ limit: 200 })
      : products;

  const itemListSchema = buildCatalogItemListJsonLd(
    products,
    initialCategory !== "All Products" ? initialCategory : undefined
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
      />
    </div>
  );
}
