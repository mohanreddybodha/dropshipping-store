import React from "react";
import type { Metadata } from "next";
import { getAuthoritativeCatalog } from "../lib/catalogServer";
import { Product } from "../lib/types";
import { CatalogExplorer } from "../components/catalog";
import {
  SITE_NAME,
  SITE_URL,
  buildCatalogItemListJsonLd,
} from "../lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Vastire | Problem-Solving Home & Everyday Essentials",
  description:
    "Curated problem-solving home, kitchen, workspace, and outdoor living essentials. US domestic ground delivery within 3–5 business days.",
  keywords: [
    "problem-solving products",
    "home essentials",
    "kitchen gadgets",
    "workspace accessories",
    "everyday carry",
    "US domestic ground shipping",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Vastire | Problem-Solving Home & Everyday Essentials",
    description:
      "Curated everyday essentials for home, kitchen, and workspace. US domestic dispatch with 3–5 day tracked delivery.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Vastire" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vastire | Problem-Solving Home & Everyday Essentials",
    description:
      "Curated everyday essentials for home, kitchen, and workspace. US domestic dispatch with 3–5 day tracked delivery.",
    images: ["/icon-512.png"],
  },
};

export default async function HomePage() {
  const allProducts: Product[] = await getAuthoritativeCatalog(200);

  const itemListSchema = buildCatalogItemListJsonLd(
    allProducts,
    undefined,
    SITE_URL
  );

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 pt-1.5 sm:pt-2 pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <CatalogExplorer
        initialProducts={allProducts}
        initialCategory="All Products"
      />
    </div>
  );
}
