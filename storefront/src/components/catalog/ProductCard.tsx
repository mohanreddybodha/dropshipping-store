"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Product } from "../../lib/types";
import { showToast } from "../ui/Toast";
import { auth } from "../../lib/firebase";
import { toggleUserWatchlist } from "../../lib/api";

interface ProductCardProps {
  product: Product;
}

// Global in-memory cache of saved slugs (hydrated ONCE across all cards, zero 48x disk read lag)
let cachedSavedSlugs: Set<string> | null = null;
const watchlistListeners = new Set<() => void>();

function getWatchlistSlugs(): Set<string> {
  if (cachedSavedSlugs === null) {
    cachedSavedSlugs = new Set();
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("watchlist_items");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item?.slug) cachedSavedSlugs!.add(item.slug);
            });
          }
        }
      } catch {
        // Storage disabled or error
      }
    }
  }
  return cachedSavedSlugs;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const syncState = () => {
      setIsSaved(getWatchlistSlugs().has(product.slug));
    };
    syncState();
    watchlistListeners.add(syncState);
    return () => {
      watchlistListeners.delete(syncState);
    };
  }, [product.slug]);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("watchlist_items");
      let list: Product[] = raw ? JSON.parse(raw) : [];
      const slugs = getWatchlistSlugs();

      if (isSaved) {
        list = list.filter((p) => p.slug !== product.slug);
        slugs.delete(product.slug);
        setIsSaved(false);
        showToast("Removed from Watchlist", "watchlist-remove");
      } else {
        list.push(product);
        slugs.add(product.slug);
        setIsSaved(true);
        showToast("Added to Watchlist", "watchlist-add");
      }

      localStorage.setItem("watchlist_items", JSON.stringify(list));
      watchlistListeners.forEach((fn) => fn());
      window.dispatchEvent(new Event("watchlist_updated"));

      // Synchronize with database if user is logged in
      if (auth.currentUser && product.pid) {
        toggleUserWatchlist(auth.currentUser.uid, product.pid).catch(() => {});
      }
    } catch {
      // Ignore
    }
  };

  const primaryVariant = product.variants[0];
  const variantPrices = (product.variants || [])
    .map((v) => v.retail_price_1x)
    .filter((p) => typeof p === "number" && p > 0);
  const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : (primaryVariant?.retail_price_1x || 24.99);

  const comparePrice = +(minPrice * 1.25).toFixed(2);
  const heroImage = product.hero_image_url || product.images?.[0] || "/placeholder.jpg";

  const [imgSrc, setImgSrc] = useState(heroImage);

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between">
      {/* Clickable Card Body */}
      <Link
        href={`/products/${product.slug}`}
        prefetch={false}
        className="block space-y-3"
      >
        {/* 1:1 Aspect Ratio Image Stage */}
        <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={product.title}
            onError={() => {
              if (imgSrc !== "/placeholder.jpg") {
                setImgSrc("/placeholder.jpg");
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>

        {/* Fixed 2-Line Title Container ensuring all cards match in height */}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 h-9 sm:h-10 leading-snug">
          {product.title}
        </h3>
      </Link>

      {/* Watchlist Quick Toggle Button (Cleanly isolated outside the <a> link) */}
      <button
        type="button"
        onClick={toggleWatchlist}
        aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
        title={isSaved ? "In Watchlist" : "Add to Watchlist"}
        className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-white transition-all duration-150 active:scale-90 border border-slate-100"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isSaved ? "fill-rose-500 text-rose-500" : "text-slate-600"
          }`}
        />
      </button>

      {/* Price & Discount Row */}
      <Link
        href={`/products/${product.slug}`}
        prefetch={false}
        className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between block"
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm sm:text-base font-black text-slate-900">
            ${minPrice.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 line-through">
            ${comparePrice.toFixed(2)}
          </span>
        </div>

        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/90 px-2 py-0.5 rounded-full uppercase tracking-tight whitespace-nowrap flex-shrink-0">
          Save 20%
        </span>
      </Link>
    </div>
  );
}
