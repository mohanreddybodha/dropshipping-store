"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Heart } from "lucide-react";
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
    } catch {
      // Ignore
    }
  };

  const primaryVariant = product.variants[0];
  const retailPrice = primaryVariant?.retail_price_1x || 24.99;
  const comparePrice = +(retailPrice * 1.25).toFixed(2);
  const stock = primaryVariant?.us_warehouse_stock || 50;
  const isLowStock = stock < 15;
  const heroImage = product.hero_image_url || product.images?.[0] || "/placeholder.jpg";
  const rating = product.rating || 4.8;
  const reviewCount = product.review_count || 128;

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

          {/* Floating Fast Shipping Badge */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="bg-emerald-600/90 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">
              Free Shipping
            </span>
          </div>

          {/* Watchlist Quick Toggle Button */}
          <button
            type="button"
            onClick={toggleWatchlist}
            aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-white transition-all duration-150 active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isSaved ? "fill-rose-500 text-rose-500" : "text-slate-600"
              }`}
            />
          </button>

          {/* Live Stock Status Indicator */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLowStock ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span>{isLowStock ? "Few Left" : "In Stock"}</span>
          </div>

          {/* Rating Badge in bottom-right corner of image below watchlist button */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-600 shadow-sm border border-slate-100">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({reviewCount})</span>
          </div>
        </div>

        {/* Clean 2-Line Clamped Title */}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
          {product.title}
        </h3>
      </div>

      {/* Price & Discount Row (Optimized space without non-functional bag icon) */}
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
