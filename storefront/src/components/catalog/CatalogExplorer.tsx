"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Check } from "lucide-react";
import { Product } from "../../lib/types";
import { getCatalog } from "../../lib/api";
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

export default function CatalogExplorer({ initialProducts }: CatalogExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dynamic Product State with Client Hydration Fallback
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    if (initialProducts.length > products.length) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  useEffect(() => {
    // If SSR or build only had partial/fallback products, revalidate live catalog
    if (products.length < 20) {
      getCatalog({ limit: 200 }).then((live) => {
        if (live && live.length > products.length) {
          setProducts(live);
        }
      });
    }
  }, [products.length]);

  // Active URL State
  const activeCategory = searchParams.get("category") || "All Products";
  const activeSearch = searchParams.get("search") || "";

  // Local Filter States
  const [selectedPriceRange, setSelectedPriceRange] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // Pending Modal States (User adjusts these; they ONLY apply when "Apply Filters" is clicked!)
  const [pendingCategory, setPendingCategory] = useState<string>(activeCategory);
  const [pendingPriceRange, setPendingPriceRange] = useState<number>(selectedPriceRange);
  const [pendingSortBy, setPendingSortBy] = useState<string>(sortBy);

  // Listen to open_filter event triggered by the top Navbar icon
  useEffect(() => {
    const handleOpen = () => {
      setPendingCategory(activeCategory);
      setPendingPriceRange(selectedPriceRange);
      setPendingSortBy(sortBy);
      setIsFilterModalOpen(true);
    };
    window.addEventListener("app:open_filter", handleOpen);
    return () => window.removeEventListener("app:open_filter", handleOpen);
  }, [activeCategory, selectedPriceRange, sortBy]);

  // Lock background body scroll when filter drawer is open
  useEffect(() => {
    if (isFilterModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isFilterModalOpen]);

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    let result = [...products];

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
      return a.id - b.id;
    });

    return result;
  }, [products, activeCategory, activeSearch, selectedPriceRange, sortBy]);

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
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const totalItems = filteredProducts.length;
  const hasMore = visibleCount < totalItems;

  // Apply filters ONLY when the user clicks the "Apply Filters" button in the modal!
  const handleApplyFilters = () => {
    setSelectedPriceRange(pendingPriceRange);
    setSortBy(pendingSortBy);

    const params = new URLSearchParams(searchParams.toString());
    if (pendingCategory === "All Products") {
      params.delete("category");
    } else {
      params.set("category", pendingCategory);
    }
    router.push(`/?${params.toString()}`);
    setIsFilterModalOpen(false);
  };

  const clearAllFilters = () => {
    setSelectedPriceRange(0);
    setSortBy("featured");
    setPendingCategory("All Products");
    setPendingPriceRange(0);
    setPendingSortBy("featured");
    router.push("/");
  };

  const hasActiveFilters =
    activeCategory !== "All Products" || activeSearch || selectedPriceRange !== 0 || sortBy !== "featured";

  return (
    <div id="catalog-section" className="space-y-3">
      {/* Active Filter Chips Bar (Shown cleanly only when filters are active) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pb-1 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Filters:</span>
          {activeCategory !== "All Products" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
              {activeCategory}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("category");
                  router.push(`/?${params.toString()}`);
                }}
                aria-label="Remove category"
              >
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {activeSearch && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
              &ldquo;{activeSearch}&rdquo;
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("search");
                  router.push(`/?${params.toString()}`);
                }}
                aria-label="Remove search"
              >
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {selectedPriceRange !== 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
              {PRICE_RANGES[selectedPriceRange].label}
              <button onClick={() => setSelectedPriceRange(0)} aria-label="Remove price filter">
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {sortBy !== "featured" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-full font-bold text-[11px]">
              Sort: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              <button onClick={() => setSortBy("featured")} aria-label="Reset sort">
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-slate-500 hover:text-rose-600 underline font-semibold text-[11px] ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Slide-Over Sort & Filter Drawer ── */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-sm bg-white h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Sort & Filter</h3>
                  <p className="text-xs text-slate-400">Customize catalog view</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Category Selection (Does NOT auto-close modal!) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Category
                </label>
                <div className="space-y-1.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = pendingCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPendingCategory(cat)}
                        className={`w-full text-left py-2.5 px-3.5 text-xs rounded-xl font-bold border flex items-center justify-between transition ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Price Range Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_RANGES.map((r, idx) => {
                    const isSelected = pendingPriceRange === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPendingPriceRange(idx)}
                        className={`py-2 px-3 text-xs rounded-xl font-bold border transition ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Sort By Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sort Order
                </label>
                <div className="space-y-1.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = pendingSortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPendingSortBy(opt.value)}
                        className={`w-full text-left py-2.5 px-3.5 text-xs rounded-xl font-bold border flex items-center justify-between transition ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky "Apply Filters" Button at the bottom */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/25 text-sm transition active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Grid: Zero empty space, direct and fast flow ── */}
      {visibleProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <p className="text-slate-500 text-sm font-medium">No products match your selected filters.</p>
          <button
            onClick={clearAllFilters}
            className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {visibleProducts.map((product) => (
            <ProductCard key={product.pid} product={product} />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-6" />

      {/* Loading indicator */}
      {hasMore && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
            Loading more products…
          </div>
        </div>
      )}
    </div>
  );
}
