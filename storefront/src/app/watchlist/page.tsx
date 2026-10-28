"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowLeft, ShoppingBag, Star } from "lucide-react";
import { Product } from "../../lib/types";
import { showToast } from "../../components/ui/Toast";
import { auth } from "../../lib/firebase";
import { toggleUserWatchlist } from "../../lib/api";

/** Watchlist card: same layout as ProductCard but with a delete icon replacing the heart */
function WatchlistCard({ product, onRemove }: { product: Product; onRemove: () => void }) {
  const primaryVariant = product.variants[0];
  const retailPrice = primaryVariant?.retail_price_1x || 24.99;
  const comparePrice = +(retailPrice * 1.25).toFixed(2);
  const heroImage = product.hero_image_url || product.images?.[0] || "/placeholder.jpg";
  const rating = product.rating || 4.8;
  const reviewCount = product.review_count || 128;

  return (
    <div className="group block bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-200 flex flex-col justify-between">
      {/* Image Stage */}
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Free Shipping Badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-emerald-600/90 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">
              Free Shipping
            </span>
          </div>
          {/* DELETE ICON (replaces heart in watchlist) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove from watchlist"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 active:scale-90"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 text-amber-500 text-[11px] font-bold mb-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{rating.toFixed(1)}</span>
          <span className="text-slate-400 font-normal">({reviewCount})</span>
        </div>

        {/* Title */}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-700 transition line-clamp-2 leading-snug">
          {product.title}
        </h3>
      </Link>

      {/* Price Row */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900">
              ${retailPrice.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 line-through">
              ${comparePrice.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">
            Save 20%
          </span>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition shadow-sm"
        >
          <ShoppingBag className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      // Storage read error
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const handleClearAll = () => {
    try {
      localStorage.removeItem("watchlist_items");
      setItems([]);
      showToast("Watchlist cleared", "watchlist-remove");
    } catch {
      // Storage remove error
    }
  };

  const handleRemoveItem = (slug: string) => {
    try {
      const target = items.find((p) => p.slug === slug);
      const updated = items.filter((p) => p.slug !== slug);
      localStorage.setItem("watchlist_items", JSON.stringify(updated));
      setItems(updated);
      showToast("Removed from Watchlist", "watchlist-remove");

      // Defensive cloud sync if authenticated
      if (auth.currentUser && target?.pid) {
        toggleUserWatchlist(auth.currentUser.uid, target.pid).catch(() => {});
      }
    } catch {
      // Storage write error
    }
  };

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400 text-sm">
        Loading watchlist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 pb-20 md:pb-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition active:scale-95"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
              Watchlist
            </h1>
            <p className="text-xs text-slate-500">
              {items.length === 1 ? "1 saved item" : `${items.length} saved items`}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Your Watchlist is Empty</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tap the heart icon on any product to save it here for later.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              prefetch={true}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {items.map((product) => (
            <WatchlistCard
              key={product.slug}
              product={product}
              onRemove={() => handleRemoveItem(product.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
