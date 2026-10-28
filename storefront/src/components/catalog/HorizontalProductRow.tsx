"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "./ProductCard";

interface HorizontalProductRowProps {
  title: "Categorizer" | "Your Watchlist" | "Recently Viewed" | "Suggested For You";
  viewAllHref?: string;
  viewAllText?: string;
  products: Product[];
  emptyMessage?: string;
}

export default function HorizontalProductRow({
  title,
  viewAllHref = "/",
  viewAllText = "View All",
  products,
  emptyMessage,
}: HorizontalProductRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!products || products.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="pt-6 border-t border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              <span>{viewAllText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="pt-6 border-t border-slate-200/80 space-y-3">
      {/* Header Row: Title & View All (No description below heading) */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {/* Desktop Left/Right Navigation Chevrons */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label={`Scroll ${title} left`}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label={`Scroll ${title} right`}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              <span>{viewAllText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={rowRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((item) => (
          <div
            key={item.slug}
            className="w-[165px] sm:w-[200px] md:w-[225px] flex-shrink-0 snap-start"
          >
            <ProductCard product={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
