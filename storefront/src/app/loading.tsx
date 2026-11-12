import React from "react";

export default function Loading() {
  return (
    <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10 py-4 animate-in fade-in duration-75">
      {/* Top thin progress bar for immediate visual feedback */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-emerald-500/20 overflow-hidden">
        <div className="h-full bg-emerald-600 animate-pulse w-full" />
      </div>

      {/* Skeleton Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none no-scrollbar">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-28 bg-slate-200/60 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>

      {/* Skeleton Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/70 p-3 space-y-2.5 shadow-xs animate-pulse"
          >
            <div className="aspect-square bg-slate-100 rounded-xl" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 bg-slate-100 rounded-md w-4/5" />
              <div className="h-3 bg-slate-100 rounded-md w-2/5" />
            </div>
            <div className="h-4 bg-slate-100 rounded-md w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
