"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "../catalog/ProductCard";

interface InfiniteCatalogFeedProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

const BATCH_SIZE = 12;

export default function InfiniteCatalogFeed({
  products,
  title = "Suggested For You",
  subtitle,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
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
