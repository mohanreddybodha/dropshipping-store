"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Star,
  Truck,
  User,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { Product } from "../../lib/types";
import { FALLBACK_PRODUCTS, getCatalog } from "../../lib/api";
import { useCart } from "../../lib/cart";

const SUGGESTED_SEARCHES = [
  "Turbo Fans",
  "Corner Shelf",
  "Digital Alarm Clock",
  "Cabinet Pulls",
  "Kitchen Utensil Set",
  "Casual Hooded Women",
  "Saw Blades",
  "Wine Stopper",
  "Night Light",
  "Rust Remover Spray",
];

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { itemCount } = useCart();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Read Watchlist count from localStorage for desktop badge
  useEffect(() => {
    try {
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchlistCount(parsed.length);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Preload live product catalog for instant search matching
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const res = await getCatalog({ limit: 150 });
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setCatalog(res);
        }
      } catch {
        // Fallback already assigned
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Lock background scroll when search overlay is open
  useEffect(() => {
    if (isSearchExpanded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSearchExpanded]);

  // Live intelligent product matching (exact phrase match + token matches)
  const matchingProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);

    // 1. Exact phrase matches first
    const exact = catalog.filter((p) => {
      const text = `${p.title} ${p.category || ""} ${p.brand_title || ""}`.toLowerCase();
      const featText = (p.features || []).map((f) => `${f.title} ${f.desc}`).join(" ").toLowerCase();
      return text.includes(q) || featText.includes(q);
    });

    // 2. Token / partial keyword matches
    const tokenMatches = catalog.filter((p) => {
      if (exact.some((e) => e.pid === p.pid)) return false;
      const text = `${p.title} ${p.category || ""} ${p.brand_title || ""}`.toLowerCase();
      return tokens.some((t) => text.includes(t));
    });

    return [...exact, ...tokenMatches];
  }, [catalog, searchQuery]);

  // Handle Search Submission (Pressing Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchExpanded(false);
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleViewAllResults = () => {
    setIsSearchExpanded(false);
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    router.push(`/?${params.toString()}`);
  };

  const handleCloseSearch = () => {
    setIsSearchExpanded(false);
    setSearchQuery("");
  };

  const handleOpenFilter = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:open_filter"));
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* ── Mode A: Full-Width Search Input Bar (When Active) ── */}
            {isSearchExpanded ? (
              <form
                onSubmit={handleSearchSubmit}
                className="w-full flex items-center gap-2.5 sm:gap-3 animate-fade-in"
              >
                <div className="relative flex-1 flex items-center">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 sm:left-4 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type product name (e.g. fans, clock, shelf)..."
                    className="w-full bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-slate-900 text-xs sm:text-sm rounded-full pl-10 sm:pl-11 pr-9 sm:pr-10 py-2.5 sm:py-3 border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition p-1"
                      aria-label="Clear input"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition flex-shrink-0 active:scale-95"
                  aria-label="Close search bar"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            ) : (
              /* ── Mode B: Normal Header (Logo + Brand + Action Icons) ── */
              <>
                {/* Brand Logo & Name */}
                <Link
                  href="/"
                  className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 group focus:outline-none"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xs group-hover:bg-slate-800 transition-colors duration-200">
                    D
                  </div>
                  <div className="block">
                    <span className="text-xs sm:text-base font-black tracking-tight text-slate-900 uppercase block leading-none">
                      Domestic Lab
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-bold text-emerald-700 tracking-wider sm:tracking-widest uppercase block mt-0.5">
                      US Warehouse Direct
                    </span>
                  </div>
                </Link>

                {/* Right Action Icons: Filter, Search, Watchlist, Cart, Profile */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Sort & Filter Icon Button */}
                  <button
                    type="button"
                    onClick={handleOpenFilter}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                    aria-label="Open Filter and Sort options"
                    title="Filter & Sort"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                  </button>

                  {/* Search Icon Button */}
                  <button
                    type="button"
                    onClick={() => setIsSearchExpanded(true)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                    aria-label="Open search bar"
                    title="Search products"
                  >
                    <Search className="w-4 h-4 text-slate-700" />
                  </button>

                  {/* Watchlist Link (Desktop & Tablet) */}
                  <Link
                    href="/watchlist"
                    className="hidden sm:flex relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                    aria-label="Watchlist"
                    title="Saved Watchlist"
                  >
                    <Heart className="w-4 h-4 text-slate-700" />
                    {watchlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {watchlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart Link (Desktop & Tablet) */}
                  <Link
                    href="/cart"
                    className="hidden sm:flex relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                    aria-label="Shopping Cart"
                    title="Shopping Cart"
                  >
                    <ShoppingBag className="w-4 h-4 text-slate-700" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {itemCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile Link (Desktop & Tablet) */}
                  <Link
                    href="/profile"
                    className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                    aria-label="Account & Orders"
                    title="Account & Orders"
                  >
                    <User className="w-4 h-4 text-slate-700" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Live Product Search Overlay ── */}
      {isSearchExpanded && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-[80] bg-white/98 backdrop-blur-2xl overflow-y-auto pb-24 md:pb-8 animate-fade-in">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-5">
            {/* 1. Automated Search Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Popular & Suggested Searches:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SEARCHES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition active:scale-95 border ${
                      searchQuery.toLowerCase() === item.toLowerCase()
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Live Search Results (When typing) vs You May Also Like (When 0 or empty) */}
            {searchQuery.trim() ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Products Matching &ldquo;{searchQuery}&rdquo; ({matchingProducts.length})
                  </h3>
                  {matchingProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleViewAllResults}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      View all in catalog
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {matchingProducts.length === 0 ? (
                  /* Zero Results Fallback: Show "You May Also Like" with catalog products */
                  <div className="space-y-4">
                    <div className="py-6 text-center space-y-1.5 bg-slate-50 rounded-2xl border border-slate-200/80 p-4">
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        No direct matches found for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Try one of the suggested tags above or discover related products below.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>You May Also Like:</span>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        {catalog.slice(0, 6).map((product) => {
                          const heroImg =
                            product.hero_image_url ||
                            product.images?.[0] ||
                            "/placeholder.jpg";
                          const price = product.variants?.[0]?.retail_price_1x || 24.99;
                          const rating = product.rating || 4.8;

                          return (
                            <Link
                              key={product.pid}
                              href={`/products/${product.slug}`}
                              onClick={() => setIsSearchExpanded(false)}
                              className="flex items-center gap-3.5 p-3 hover:bg-slate-50 transition group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={heroImg}
                                alt={product.title}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-slate-100 border border-slate-200/80 flex-shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                                  {product.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {rating.toFixed(1)}
                                  </span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <Truck className="w-3 h-3" /> Free Delivery
                                  </span>
                                  <span>•</span>
                                  <span className="text-slate-600 font-medium">In Stock</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 pl-2">
                                <span className="text-sm font-black text-slate-900">
                                  ${price.toFixed(2)}
                                </span>
                                <span className="block text-[10px] font-bold text-emerald-700">
                                  Direct Ships
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Direct Matching Results */
                  <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    {matchingProducts.slice(0, 8).map((product) => {
                      const heroImg =
                        product.hero_image_url ||
                        product.images?.[0] ||
                        "/placeholder.jpg";
                      const price = product.variants?.[0]?.retail_price_1x || 24.99;
                      const rating = product.rating || 4.8;

                      return (
                        <Link
                          key={product.pid}
                          href={`/products/${product.slug}`}
                          onClick={() => setIsSearchExpanded(false)}
                          className="flex items-center gap-3.5 p-3 hover:bg-slate-50 transition group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={heroImg}
                            alt={product.title}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-slate-100 border border-slate-200/80 flex-shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                              {product.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {rating.toFixed(1)}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Free Delivery
                              </span>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">In Stock</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 pl-2">
                            <span className="text-sm font-black text-slate-900">
                              ${price.toFixed(2)}
                            </span>
                            <span className="block text-[10px] font-bold text-emerald-700">
                              Direct Ships
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* When search query is empty, show trending items */
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Trending & Popular Products:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {catalog.slice(0, 6).map((product) => {
                    const heroImg =
                      product.hero_image_url ||
                      product.images?.[0] ||
                      "/placeholder.jpg";
                    const price = product.variants?.[0]?.retail_price_1x || 24.99;

                    return (
                      <Link
                        key={product.pid}
                        href={`/products/${product.slug}`}
                        onClick={() => setIsSearchExpanded(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-emerald-300 transition group shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={heroImg}
                          alt={product.title}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                            {product.title}
                          </h4>
                          <span className="text-xs font-black text-slate-900 mt-0.5 block">
                            ${price.toFixed(2)}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
