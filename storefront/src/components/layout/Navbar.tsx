"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

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

  const clearSearch = () => {
    setSearchQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    router.push(`/?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/97 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo & Name: Explicitly visible on mobile AND desktop */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 group focus:outline-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-sm group-hover:bg-slate-800 transition-colors duration-200">
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

          {/* Search Bar: Opposite Brand Name, taking available width on mobile & desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 max-w-md sm:max-w-lg relative items-center"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 text-xs sm:text-sm rounded-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 sm:right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>
    </header>
  );
}
