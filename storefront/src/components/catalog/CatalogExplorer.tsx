"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Filter, X, Check, ChevronDown } from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "./ProductCard";

interface CatalogExplorerProps {
  initialProducts: Product[];
  categoriesSummary?: Record<string, number>;
  totalCount?: number;
}

const PRICE_RANGES = [
  { label: "All Prices", min: undefined, max: undefined },
  { label: "Under $25", min: 0, max: 25 },
  { label: "$25 to $35", min: 25, max: 35 },
  { label: "$35+", min: 35, max: undefined },
];

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Highest Rated", value: "rating" },
];

const CATEGORIES = [
  "All Products",
  "Home & Kitchen",
  "Workspace & Tech",
  "Smart Lighting",
  "Outdoor & Patio",
  "Everyday Carry & Auto",
];

const PAGE_SIZE = 24;

export default function CatalogExplorer({
  initialProducts,
}: CatalogExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State
  const activeCategory = searchParams.get("category") || "All Products";
  const activeSearch = searchParams.get("search") || "";

  // Local Filter States
  const [selectedPriceRange, setSelectedPriceRange] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // 1. Category Filter
    if (activeCategory && activeCategory !== "All Products") {
      result = result.filter(
        (p) =>
          (p.category && p.category.toLowerCase().includes(activeCategory.toLowerCase())) ||
          (p.seo_meta?.category &&
            p.seo_meta.category.toLowerCase().includes(activeCategory.toLowerCase()))
      );
    }

    // 2. Search Filter
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.features?.some((f) => f.title.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
      );
    }

    // 3. Price Filter
    const range = PRICE_RANGES[selectedPriceRange];
    if (range.min !== undefined || range.max !== undefined) {
      result = result.filter((p) => {
        const price = p.variants[0]?.retail_price_1x || 25;
        if (range.min !== undefined && price < range.min) return false;
        if (range.max !== undefined && price > range.max) return false;
        return true;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      const priceA = a.variants[0]?.retail_price_1x || 0;
      const priceB = b.variants[0]?.retail_price_1x || 0;
      const ratingA = a.rating || 4.8;
      const ratingB = b.rating || 4.8;
      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "rating") return ratingB - ratingA;
      return a.id - b.id; // Featured default
    });

    return result;
  }, [initialProducts, activeCategory, activeSearch, selectedPriceRange, sortBy]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, activeSearch, selectedPriceRange, sortBy]);

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredProducts.length));
  }, [filteredProducts.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const totalItems = filteredProducts.length;
  const hasMore = visibleCount < totalItems;

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All Products") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    router.push(`/?${params.toString()}#catalog-section`);
  };

  const clearAllFilters = () => {
    setSelectedPriceRange(0);
    setSortBy("featured");
    router.push("/#catalog-section");
  };

  return (
    <div id="catalog-section" className="space-y-6">
      {/* Catalog Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Results Count */}
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {activeSearch ? `"${activeSearch}"` : activeCategory}
          </h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full flex-shrink-0">
            {totalItems}
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category dropdown (visible on all screen sizes) */}
          <div className="relative flex items-center">
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            <select
              value={activeCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Filter Sheet Button */}
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter & Sort</span>
            {(selectedPriceRange !== 0 || sortBy !== "featured") && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                !
              </span>
            )}
          </button>

          {/* Desktop Price Range Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {PRICE_RANGES.map((r, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPriceRange(idx)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedPriceRange === idx
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {(activeCategory !== "All Products" || activeSearch || selectedPriceRange !== 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 font-semibold">Active filters:</span>
          {activeCategory !== "All Products" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
              {activeCategory}
              <button onClick={() => handleCategoryChange("All Products")}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {activeSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
              Search: &ldquo;{activeSearch}&rdquo;
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("search");
                  router.push(`/?${params.toString()}`);
                }}
              >
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {selectedPriceRange !== 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
              {PRICE_RANGES[selectedPriceRange].label}
              <button onClick={() => setSelectedPriceRange(0)}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-slate-500 hover:text-red-600 underline font-semibold ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile Filter Sheet — z-[60] ensures it renders ABOVE bottom nav (z-50) */}
      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-lg font-black text-slate-900">Filter & Sort</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        handleCategoryChange(cat);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left py-2 px-3 text-xs rounded-xl font-bold border flex items-center justify-between transition ${
                        activeCategory === cat
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{cat}</span>
                      {activeCategory === cat && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_RANGES.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPriceRange(idx)}
                      className={`py-2 px-3 text-xs rounded-xl font-bold border transition ${
                        selectedPriceRange === idx
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sort By
                </label>
                <div className="space-y-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`w-full text-left py-2 px-3 text-xs rounded-xl font-bold border flex items-center justify-between transition ${
                        sortBy === opt.value
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md text-sm sticky bottom-0"
            >
              Show {totalItems} Results
            </button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {visibleProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <p className="text-slate-500 font-medium">No products match your selected filters.</p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {visibleProducts.map((product) => (
            <ProductCard key={product.pid} product={product} />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading indicator */}
      {hasMore && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
            Loading more products…
          </div>
        </div>
      )}

      {/* End of catalog */}
      {!hasMore && totalItems > PAGE_SIZE && (
        <div className="text-center py-4 text-xs font-semibold text-slate-400">
          All {totalItems} products loaded ✓
        </div>
      )}
    </div>
  );
}
