"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

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
  };

  const handleCloseSearch = () => {
    setIsSearchExpanded(false);
    if (searchQuery) {
      setSearchQuery("");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      router.push(`/?${params.toString()}`);
    }
  };

  const handleOpenFilter = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:open_filter"));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/97 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* ── Mode A: Full-Width Animated Search Bar (When Search Icon Clicked) ── */}
          {isSearchExpanded ? (
            <form
              onSubmit={handleSearchSubmit}
              className="w-full flex items-center gap-3 animate-fade-in"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search domestic catalog, electronics, home essentials..."
                  className="w-full bg-slate-100 hover:bg-slate-200/80 focus:bg-white text-slate-900 text-sm rounded-full pl-11 pr-10 py-3 border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition p-1"
                    aria-label="Clear input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Close Button: Restores normal header */}
              <button
                type="button"
                onClick={handleCloseSearch}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition flex-shrink-0 active:scale-95"
                aria-label="Close search bar"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          ) : (
            /* ── Mode B: Normal Header (Logo + Brand Name + Sort/Filter Icon + Search Icon) ── */
            <>
              {/* Brand Logo & Name (Visible on mobile & desktop) */}
              <Link
                href="/"
                className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 group focus:outline-none"
              >
                <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:bg-slate-800 transition-colors duration-200">
                  D
                </div>
                <div className="block">
                  <span className="text-xs sm:text-base font-black tracking-tight text-slate-950 uppercase block leading-none">
                    Domestic Lab
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-emerald-700 tracking-wider sm:tracking-widest uppercase block mt-0.5">
                    US Warehouse Direct
                  </span>
                </div>
              </Link>

              {/* Right Action Icons: Sort & Filter Icon + Search Icon */}
              <div className="flex items-center gap-2">
                {/* Sort & Filter Icon Button */}
                <button
                  type="button"
                  onClick={handleOpenFilter}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                  aria-label="Open Filter and Sort options"
                  title="Filter & Sort"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                </button>

                {/* Search Icon Button */}
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs"
                  aria-label="Open search bar"
                  title="Search products"
                >
                  <Search className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
