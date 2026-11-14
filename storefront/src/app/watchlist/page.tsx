"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowLeft, ShoppingBag, ArrowDown } from "lucide-react";
import { Product } from "../../lib/types";
import { showToast } from "../../components/ui/Toast";
import { auth, onAuthStateChanged } from "../../lib/firebase";
import { toggleUserWatchlist, getUserAuthState, getCatalog } from "../../lib/api";
import HorizontalProductRow from "../../components/catalog/HorizontalProductRow";

/** Watchlist card: clean card with delete icon replacing heart, rating in bottom-right of image, and consistent 2-line title */
function WatchlistCard({ product, onRemove }: { product: Product; onRemove: () => void }) {
  const primaryVariant = product.variants[0];
  const retailPrice = primaryVariant?.retail_price_1x || 0;
  const comparePrice = +(retailPrice * 1.25).toFixed(2);
  const heroImage = product.hero_image_url || product.images?.[0] || "/placeholder.jpg";

  return (
    <div className="group block bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-200 flex flex-col justify-between">
      {/* Image Stage */}
      <Link href={`/products/${product.slug}`} prefetch={true} className="block space-y-1 sm:space-y-1.5">
        <div className="relative w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* DELETE ICON (replaces heart in watchlist) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove from watchlist"
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 active:scale-90"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Fixed 2-Line Title Container ensuring all cards match in height */}
        <h3 className="text-[11px] sm:text-[13px] font-bold text-slate-900 group-hover:text-rose-700 transition line-clamp-2 h-7 sm:h-8 leading-tight">
          {product.title}
        </h3>
      </Link>

      {/* Price & Discount Row (Total consistency with ProductCard, no bag icon) */}
      <div className="pt-1 sm:pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm sm:text-base font-black text-slate-900">
            ${retailPrice.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 line-through">
            ${comparePrice.toFixed(2)}
          </span>
        </div>
        <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/90 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" />
          <span>20%</span>
        </span>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<Product[]>([]);

  useEffect(() => {
    let currentSaved: Product[] = [];
    try {
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        currentSaved = JSON.parse(raw);
        setItems(currentSaved);
      }
    } catch {
      // Storage read error
    } finally {
      setIsHydrated(true);
    }

    const savedSlugs = new Set(currentSaved.map((p) => p.slug));
    let recentList: Product[] = [];

    // 1. Retrieve Recently Viewed (strictly excluding anything already in Watchlist)
    try {
      const rawRecent = localStorage.getItem("recently_viewed_products");
      if (rawRecent) {
        const parsed: Product[] = JSON.parse(rawRecent);
        if (Array.isArray(parsed)) {
          recentList = parsed.filter((p) => !savedSlugs.has(p.slug));
          setRecentlyViewed(recentList);
        }
      }
    } catch {
      // Ignore
    }

    const recentSlugs = new Set(recentList.map((p) => p.slug));

    // 2. Fetch full live catalog to reconcile saved items & suggested items concurrently
    getCatalog({ limit: 500 }).then((cat) => {
      if (Array.isArray(cat) && cat.length > 0) {
        // Reconcile saved items with live catalog so slugs, images, and prices are 100% active and canonical
        setItems((prevItems) => {
          const updated: Product[] = [];
          for (const item of prevItems) {
            const liveMatch = cat.find(
              (c) =>
                (c.pid && item.pid && String(c.pid) === String(item.pid)) ||
                (c.id && item.id && String(c.id) === String(item.id)) ||
                (c.slug && item.slug && c.slug === item.slug) ||
                (c.title && item.title && (c.title.toLowerCase().includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(c.title.toLowerCase())))
            );
            // Strictly retain active verified catalog products, automatically pruning discontinued/stale items
            if (liveMatch) {
              updated.push(liveMatch);
            }
          }
          try {
            localStorage.setItem("watchlist_items", JSON.stringify(updated));
          } catch {}
          return updated;
        });

        const activeSlugs = new Set(currentSaved.map((p) => p.slug));
        const filtered = cat.filter(
          (p) => !activeSlugs.has(p.slug) && !recentSlugs.has(p.slug)
        ).slice(0, 10);
        setSuggestedItems(filtered);
      }
    }).catch(() => {});

    // 3. Cross-device cloud sync: sync user watchlist on auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const remoteState = await getUserAuthState(user.uid, user.email, user.phoneNumber);
        if (remoteState?.watchlist && Array.isArray(remoteState.watchlist) && remoteState.watchlist.length > 0) {
          const remotePids = new Set<string>(remoteState.watchlist);
          const fullCatalog = await getCatalog({ limit: 500 });
          setItems((localPrev) => {
            const merged = [...localPrev];
            const existingPids = new Set(merged.map((p) => p.pid));
            for (const pid of remotePids) {
              if (!existingPids.has(pid)) {
                const found = fullCatalog.find((p) => p.pid === pid);
                if (found) {
                  merged.push(found);
                  existingPids.add(pid);
                }
              }
            }
            try {
              localStorage.setItem("watchlist_items", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("Failed fetching remote watchlist:", err);
      }
    });

    return () => unsubscribe();
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
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-16 text-center text-slate-400 text-sm">
        Loading watchlist...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 pt-1.5 sm:pt-2.5 pb-[82px] md:pb-6 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          My Collections
        </h1>

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

      {/* Main Watchlist Items State */}
      {items.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-12 px-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">My Collections is Empty</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tap the heart icon on any product to save it here for later.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              prefetch={true}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6 gap-1.5 sm:gap-2.5 md:gap-3">
          {items.map((product) => (
            <WatchlistCard
              key={product.slug}
              product={product}
              onRemove={() => handleRemoveItem(product.slug)}
            />
          ))}
        </div>
      )}

      {/* ── AFTER WATCHLIST IS COMPLETED: RECENTLY VIEWED & SUGGESTED FOR YOU ── */}

      {/* 1. Recently Viewed (Horizontal Scrolling, No Description, View All opposite) */}
      {recentlyViewed.length > 0 && (
        <HorizontalProductRow
          title="Recently Viewed"
          viewAllHref="/"
          viewAllText="View All"
          products={recentlyViewed}
        />
      )}

      {/* 2. Suggested For You (Horizontal Scrolling, No Description, View All opposite) */}
      <HorizontalProductRow
        title="Suggested For You"
        viewAllHref="/"
        viewAllText="View All"
        products={suggestedItems}
      />
    </div>
  );
}
