"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "../../components/catalog/ProductCard";

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
    } catch {
      // Storage remove error
    }
  };

  const handleRemoveItem = (slug: string) => {
    try {
      const updated = items.filter((p) => p.slug !== slug);
      localStorage.setItem("watchlist_items", JSON.stringify(updated));
      setItems(updated);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              Tap the heart icon on any product to save it here for later reference.
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
        /* Grid of Saved Products */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {items.map((product) => (
            <div key={product.slug} className="relative group/card">
              <ProductCard product={product} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveItem(product.slug);
                }}
                className="absolute top-2 right-12 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm text-slate-400 hover:text-rose-600 shadow-sm flex items-center justify-center transition active:scale-90"
                title="Remove from watchlist"
                aria-label="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
