"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Package, X } from "lucide-react";

const CATEGORIES = [
  "All Products",
  "Home & Kitchen",
  "Workspace & Tech",
  "Smart Lighting",
  "Outdoor & Patio",
  "Everyday Carry & Auto",
];

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // When mobile search opens, auto-focus the input
  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const currentCategory = searchParams.get("category") || "All Products";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
    setMobileSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/?${params.toString()}`);
  };

  const handleCategoryClick = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All Products") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/97 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 group focus:outline-none"
          >
            <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:bg-slate-800 transition-colors duration-200">
              D
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-black tracking-tight text-slate-950 uppercase block leading-none">
                Domestic Lab
              </span>
              <span className="text-[10px] font-bold text-emerald-700 tracking-widest uppercase block mt-0.5">
                US Warehouse Direct
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl relative items-center"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, lamps, organizers..."
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 text-sm rounded-full pl-10 pr-10 py-2.5 border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Order Tracking Link (Desktop) */}
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-xl transition active:scale-95"
            >
              <Package className="w-3.5 h-3.5 text-slate-600" />
              <span>Track Orders</span>
            </Link>

            {/* Mobile animated search icon */}
            <div className="md:hidden flex items-center">
              {mobileSearchOpen ? (
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 animate-expand"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={mobileInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-48 bg-slate-100 text-slate-900 text-sm rounded-full pl-9 pr-4 py-2 border border-transparent focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-full bg-slate-100 flex-shrink-0"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition active:scale-95"
                  aria-label="Open search"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pill Bar ── */}
      <div className="border-t border-slate-100 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 text-xs font-bold whitespace-nowrap">
          {CATEGORIES.map((cat) => {
            const isActive =
              cat === "All Products"
                ? currentCategory === "All Products"
                : currentCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3.5 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
