"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  TrendingUp,
  Tag,
  ArrowRight,
  Truck,
  User,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { Product } from "../../lib/types";
import { getCatalog, FALLBACK_PRODUCTS } from "../../lib/api";
import { useCart } from "../../lib/cart";
import VastireLogo from "../ui/VastireLogo";

const SUGGESTED_SEARCHES = [
  "Desk Fan",
  "Alarm Clock",
  "Night Light",
  "Shower Caddy",
  "Knife Set",
  "Desk Lamp",
  "Power Bank",
  "Dog Collar",
  "Coffee Tumbler",
  "Car Phone Mount",
];

function stemSearchToken(token: string): string {
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBrowseSurface = pathname === "/" || pathname.startsWith("/collections/");
  const { itemCount } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  // Client hydration guard & read initial search param + Watchlist count from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const q = new URLSearchParams(window.location.search).get("search");
      if (q) setSearchQuery(q);
      const raw = localStorage.getItem("watchlist_items");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchlistCount(parsed.length);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Listen to cross-component watchlist sync events
  useEffect(() => {
    const handleWatchlistUpdate = () => {
      try {
        const raw = localStorage.getItem("watchlist_items");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setWatchlistCount(parsed.length);
        } else {
          setWatchlistCount(0);
        }
      } catch {}
    };
    window.addEventListener("watchlist_updated", handleWatchlistUpdate);
    window.addEventListener("storage", handleWatchlistUpdate);
    return () => {
      window.removeEventListener("watchlist_updated", handleWatchlistUpdate);
      window.removeEventListener("storage", handleWatchlistUpdate);
    };
  }, []);

  // Close expanded search cleanly whenever route changes (prevents stale overlay/scroll locks)
  useEffect(() => {
    setIsSearchExpanded(false);
  }, [pathname]);

  // Lazy-load live extended catalog when search is active or focused (zero blocking network overhead on SSR)
  useEffect(() => {
    if (!isSearchExpanded && !searchQuery) return;
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const res = await getCatalog({ limit: 150 });
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setCatalog(res);
        }
      } catch {
        // Fallback already populated via FALLBACK_PRODUCTS
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [isSearchExpanded, searchQuery]);

  // Auto-focus mobile search input when expanded on mobile
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current && window.innerWidth < 768) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Support Escape key to dismiss search overlay cleanly back to page view
  useEffect(() => {
    if (!isSearchExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchExpanded(false);
        desktopSearchInputRef.current?.blur();
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  // Live intelligent product matching (exact phrase match + stemmed token matches)
  const matchingProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean).map(stemSearchToken);

    // 1. Exact phrase matches first
    const exact = catalog.filter((p) => {
      const text = `${p.title} ${p.category || ""} ${p.brand_title || ""}`.toLowerCase();
      const featText = (p.features || []).map((f) => `${f.title} ${f.desc}`).join(" ").toLowerCase();
      return text.includes(q) || featText.includes(q);
    });

    // 2. Token / partial keyword matches (including plural/singular stems)
    const tokenMatches = catalog.filter((p) => {
      if (exact.some((e) => e.pid === p.pid)) return false;
      const text = `${p.title} ${p.category || ""} ${p.brand_title || ""}`.toLowerCase();
      return tokens.some((t) => text.includes(t));
    });

    return [...exact, ...tokenMatches];
  }, [catalog, searchQuery]);

  // Fallback similar & recommended products when search query yields zero direct matches
  const similarProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || matchingProducts.length > 0) return catalog.slice(0, 6);

    const prefixTokens = q
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .map((t) => t.slice(0, Math.min(4, t.length)));

    if (prefixTokens.length === 0) return catalog.slice(0, 6);

    const scored = catalog
      .map((p) => {
        const hay = `${p.title} ${p.category || ""}`.toLowerCase();
        const score = prefixTokens.reduce((acc, pref) => (hay.includes(pref) ? acc + 1 : acc), 0);
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.p);

    return scored.slice(0, 6);
  }, [catalog, searchQuery, matchingProducts.length]);

  // Handle Search Submission (Pressing Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchExpanded(false);
    desktopSearchInputRef.current?.blur();
    searchInputRef.current?.blur();
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.delete("filter");
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setIsSearchExpanded(true);
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      desktopSearchInputRef.current?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleViewAllResults = () => {
    setIsSearchExpanded(false);
    desktopSearchInputRef.current?.blur();
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.delete("filter");
    router.push(`/?${params.toString()}`);
  };

  const handleCloseSearch = () => {
    setIsSearchExpanded(false);
    setSearchQuery("");
    desktopSearchInputRef.current?.blur();
    searchInputRef.current?.blur();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("search")) {
        params.delete("search");
        params.delete("page");
        const nextQs = params.toString();
        router.push(nextQs ? `/?${nextQs}` : "/");
      }
    }
  };

  const handleOpenFilter = () => {
    setIsSearchExpanded(false);
    if (typeof window !== "undefined") {
      if (isBrowseSurface) {
        window.dispatchEvent(new CustomEvent("app:open_filter"));
      } else {
        router.push("/?filter=open");
      }
    }
  };

  return (
    <>
      <header
        className={`${
          isHome ? "block" : "hidden md:block"
        } sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-2xs`}
      >
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="h-16 flex items-center justify-between gap-3 sm:gap-6">
            {/* ── Mode A: Full-Width Search Input Bar (When Active on Mobile Home) ── */}
            {isSearchExpanded ? (
              <form
                onSubmit={handleSearchSubmit}
                className="w-full flex items-center gap-2.5 sm:gap-3 animate-fade-in md:hidden"
              >
                <div className="relative flex-1 flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type product name (e.g. fan, clock, shelf)..."
                    className="w-full bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-slate-900 text-xs rounded-full pl-10 pr-10 py-2.5 border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="absolute right-2.5 w-6 h-6 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition"
                    aria-label="Close search and return home"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : null}

            {/* ── Mode B: Production Header (Logo + Desktop Centered Search + Desktop Nav Cluster + Mobile Controls) ── */}
            <div className={`w-full flex items-center justify-between gap-4 lg:gap-8 ${isSearchExpanded ? "hidden md:flex" : "flex"}`}>
              {/* Left: Brand Logo & Wordmark */}
              <Link
                href="/"
                onClick={handleCloseSearch}
                className="flex items-center flex-shrink-0 group focus:outline-none"
                aria-label="Vastire Home"
              >
                <VastireLogo size="md" />
              </Link>

              {/* Center: Always-Visible Search Bar (Single Search Icon + Input + Rightmost X + Right-Side Filters Trigger) */}
              <div className="hidden md:flex flex-1 max-w-2xl xl:max-w-3xl items-center relative">
                <form
                  onSubmit={handleSearchSubmit}
                  className="w-full flex items-center bg-slate-100 hover:bg-slate-200/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/25 focus-within:border-emerald-500 rounded-full border border-slate-200/80 transition-all shadow-inner overflow-hidden"
                >
                  {/* Desktop Search Input Field: leading Search icon + input + rightmost X close/clear */}
                  <div className="relative flex-1 flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      ref={desktopSearchInputRef}
                      type="text"
                      value={searchQuery}
                      onFocus={() => setIsSearchExpanded(true)}
                      onClick={() => setIsSearchExpanded(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!isSearchExpanded) setIsSearchExpanded(true);
                      }}
                      placeholder="Search across all categories (e.g. fan, clock, kitchen, lamp)..."
                      className="w-full bg-transparent text-slate-900 text-xs lg:text-sm pl-10 pr-10 py-2.5 focus:outline-none"
                    />
                    {(isSearchExpanded || searchQuery.length > 0) && (
                      <button
                        type="button"
                        onClick={handleCloseSearch}
                        className="absolute right-2.5 w-6 h-6 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 flex items-center justify-center transition cursor-pointer"
                        aria-label="Close search and show home screen"
                        title="Close search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Right-Side Category / Sort Filter Trigger seamlessly styled inside the search bar */}
                  <button
                    type="button"
                    onClick={handleOpenFilter}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 text-xs font-bold border-l border-slate-200/80 transition flex-shrink-0 select-none cursor-pointer active:scale-95"
                    title="Filter catalog by category, price, or sort order"
                    aria-label="Open Filter and Sort options"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden lg:inline">Filters</span>
                  </button>
                </form>
              </div>

              {/* Right Action Icons: Filter, Search (Mobile), Watchlist, Cart, Profile */}
              <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 flex-shrink-0">
                {/* Mobile Sort & Filter Button */}
                <button
                  type="button"
                  onClick={handleOpenFilter}
                  className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                  aria-label="Open Filter and Sort options"
                  title="Filter & Sort"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                </button>

                {/* Mobile Search Button */}
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                  aria-label="Open search bar"
                  title="Search products"
                >
                  <Search className="w-4 h-4 text-slate-700" />
                </button>

                {/* Watchlist Link (Desktop & Tablet) */}
                <Link
                  href="/watchlist"
                  prefetch={true}
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition active:scale-95 group relative"
                  aria-label="Watchlist"
                  title="Saved Watchlist"
                >
                  <div className="relative flex items-center justify-center">
                    <Heart className="w-4 h-4 text-slate-700 group-hover:text-rose-600 transition" />
                    {mounted && watchlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {watchlistCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-slate-800">Watchlist</span>
                </Link>

                {/* Cart Link (Desktop & Tablet) */}
                <Link
                  href="/cart"
                  prefetch={true}
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition active:scale-95 group relative"
                  aria-label="Shopping Cart"
                  title="Shopping Cart"
                >
                  <div className="relative flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-slate-700 group-hover:text-emerald-600 transition" />
                    {mounted && itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {itemCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-slate-800">Cart</span>
                </Link>

                {/* Profile / Account Link (Desktop & Tablet) */}
                <Link
                  href="/profile"
                  prefetch={true}
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition active:scale-95 group"
                  aria-label="Account & Orders"
                  title="Account & Orders"
                >
                  <User className="w-4 h-4 text-slate-700 group-hover:text-emerald-600 transition" />
                  <span className="hidden xl:inline text-xs font-bold text-slate-800">Account</span>
                </Link>
              </div>
            </div>
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
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
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
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span>Similar &amp; Recommended Products:</span>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        {similarProducts.map((product) => {
                          const heroImg =
                            product.hero_image_url ||
                            product.images?.[0] ||
                            "/placeholder.jpg";
                          const price = product.variants?.[0]?.retail_price_1x || 0;
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
                      const price = product.variants?.[0]?.retail_price_1x || 0;
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
                    const price = product.variants?.[0]?.retail_price_1x || 0;

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
