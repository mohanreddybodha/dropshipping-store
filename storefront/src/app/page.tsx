import React, { Suspense } from "react";
import { getCatalog } from "../lib/api";
import { CatalogExplorer } from "../components/catalog";

export const revalidate = 60;

export default async function HomePage() {
  const products = await getCatalog({ limit: 200 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3.5 pb-20 md:pb-6">
      <Suspense
        fallback={
          <div className="py-20 text-center text-slate-400 text-sm font-medium">
            Loading catalog…
          </div>
        }
      >
        <CatalogExplorer initialProducts={products} />
      </Suspense>
    </div>
  );
}
