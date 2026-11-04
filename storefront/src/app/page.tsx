import React from "react";
import { getCatalog } from "../lib/api";
import { CatalogExplorer } from "../components/catalog";

export const revalidate = 60;

export default async function HomePage() {
  const products = await getCatalog({ limit: 200 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3.5 pb-20 md:pb-6">
      <CatalogExplorer initialProducts={products} />
    </div>
  );
}
