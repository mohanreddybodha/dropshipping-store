"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Plus } from "lucide-react";
import { Product } from "../../lib/types";
import { showToast } from "../ui/Toast";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        const list: Product[] = JSON.parse(raw);
        setIsSaved(list.some((p) => p.slug === product.slug));
      }
    } catch {
      // Ignore
    }
  }, [product.slug]);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("watchlist_items");
      let list: Product[] = raw ? JSON.parse(raw) : [];
      if (isSaved) {
        list = list.filter((p) => p.slug !== product.slug);
        setIsSaved(false);
        showToast("Removed from Watchlist", "watchlist-remove");
      } else {
        list.push(product);
        setIsSaved(true);
        showToast("Added to Watchlist ❤️", "watchlist-add");
      }
      localStorage.setItem("watchlist_items", JSON.stringify(list));
      window.dispatchEvent(new Event("watchlist_updated"));
    } catch {
      // Ignore
    }
  };

  const primaryVariant = product.variants[0];
  const retailPrice = primaryVariant?.retail_price_1x || 24.99;
  const comparePrice = +(retailPrice * 1.25).toFixed(2);
  const heroImage = product.hero_image_url || product.images?.[0] || "/placeholder.jpg";
  const rating = product.rating || 4.8;

  return (
    <Link
      href={`/products/${product.slug}`}
      prefetch={true}
      className="group block bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer"
    >
      <div className="space-y-3">
        {/* 1:1 Aspect Ratio Image Stage */}
        <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Watchlist Quick Toggle Button (Flipkart-Style Plus Icon) */}
          <button
            type="button"
            onClick={toggleWatchlist}
            aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
            title={isSaved ? "In Watchlist" : "Add to Watchlist"}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-all duration-150 active:scale-90 border ${
              isSaved
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white/95 backdrop-blur-sm text-slate-700 border-slate-200/80 hover:bg-white hover:text-emerald-700"
            }`}
          >
            <Plus
              className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${
                isSaved ? "rotate-45" : ""
              }`}
            />
          </button>

          {/* Rating Badge in bottom-right corner of image (Rating number only, no count) */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-600 shadow-sm border border-slate-100">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Fixed 2-Line Title Container ensuring all cards match in height */}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 h-9 sm:h-10 leading-snug">
          {product.title}
        </h3>
      </div>

      {/* Price & Discount Row (Consistent across all cards) */}
      <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base font-black text-slate-900">
            ${retailPrice.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 line-through">
            ${comparePrice.toFixed(2)}
          </span>
        </div>

        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/90 px-2 py-0.5 rounded-full uppercase tracking-tight">
          Save 20%
        </span>
      </div>
    </Link>
  );
}
