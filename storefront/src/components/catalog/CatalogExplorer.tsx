"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Filter, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
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

export default function CatalogExplorer({
  initialProducts,
  categoriesSummary = {},
}: CatalogExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State
  const activeCategory = searchParams.get("category") || "All Products";
  const activeSearch = searchParams.get("search") || "";

  // Local Filter States
  const [selectedPriceRange, setSelectedPriceRange] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const itemsPerPage = 24;

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // 1. Category Filter
    if (activeCategory && activeCategory !== "All Products") {
      result = result.filter(
        (p) =>
          (p.category && p.category.toLowerCase().includes(activeCategory.toLowerCase())) ||
          (p.seo_meta?.category && p.seo_meta.category.toLowerCase().includes(activeCategory.toLowerCase()))
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

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All Products") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    setCurrentPage(1);
    router.push(`/?${params.toString()}#catalog-section`);
  };

  const clearAllFilters = () => {
    setSelectedPriceRange(0);
    setSortBy("featured");
    setCurrentPage(1);
    router.push("/#catalog-section");
  };

  return (
    <div id="catalog-section" className="space-y-6">
      {/* Catalog Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Results Count & Active Category */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activeCategory}
            </h2>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              {totalItems} Items
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} verified in-stock products
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mobile Filter Sheet Button */}
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter & Sort</span>
          </button>

          {/* Desktop Price Range Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {PRICE_RANGES.map((r, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedPriceRange(idx);
                  setCurrentPage(1);
                }}
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
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
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
              Category: {activeCategory}
              <button onClick={() => handleCategoryChange("All Products")}>
                <X className="w-3 h-3 hover:text-red-600" />
              </button>
            </span>
          )}
          {activeSearch && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
              Search: &quot;{activeSearch}&quot;
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
              Price: {PRICE_RANGES[selectedPriceRange].label}
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

      {/* Mobile Slide-Over Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-6 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
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

              {/* Price Filter */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_RANGES.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPriceRange(idx);
                        setCurrentPage(1);
                      }}
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
                      onClick={() => {
                        setSortBy(opt.value);
                        setCurrentPage(1);
                      }}
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
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md text-sm"
            >
              Apply Filters ({totalItems} Items)
            </button>
          </div>
        </div>
      )}

      {/* Retail 2/3/4-Column Product Grid */}
      {paginatedItems.length === 0 ? (
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
          {paginatedItems.map((product) => (
            <ProductCard key={product.pid} product={product} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-slate-700 shadow-sm">
          <button
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 350, behavior: "smooth" });
            }}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-slate-500 font-semibold">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 350, behavior: "smooth" });
            }}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
