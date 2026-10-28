"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "../catalog/ProductCard";

interface InfiniteCatalogFeedProps {
  products: Product[];
  title?: string;
}

const BATCH_SIZE = 12;

export default function InfiniteCatalogFeed({
  products,
  title = "Suggested For You",
}: InfiniteCatalogFeedProps) {
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, products.length));
  }, [products.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!products || products.length === 0) return null;

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <section className="pt-8 border-t border-slate-200/80 space-y-4">
      {/* Clean Header: Heading on left (no AI icon, no description), View All on right */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        <Link
          href="/"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {visibleProducts.map((item) => (
          <ProductCard key={item.slug} product={item} />
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore ? (
        <div ref={sentinelRef} className="py-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Loading more domestic products…</span>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 border-t border-slate-100 mt-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>You&apos;ve explored all verified domestic products</span>
        </div>
      )}
    </section>
  );
}
