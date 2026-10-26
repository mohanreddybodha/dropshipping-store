"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PROMO_CARDS = [
  {
    emoji: "⚡",
    label: "Trending Now",
    heading: "Home & Kitchen",
    sub: "Smart upgrades for your space",
    category: "Home & Kitchen",
    from: "from-amber-500/20",
    to: "to-orange-600/10",
    accent: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
  {
    emoji: "💡",
    label: "Most Popular",
    heading: "Smart Lighting",
    sub: "Illuminate every corner",
    category: "Smart Lighting",
    from: "from-yellow-400/20",
    to: "to-amber-500/10",
    accent: "text-yellow-300",
    badge: "bg-yellow-400/15 text-yellow-200 border-yellow-400/25",
  },
  {
    emoji: "🖥️",
    label: "Work Smarter",
    heading: "Workspace & Tech",
    sub: "Gear for the modern desk",
    category: "Workspace & Tech",
    from: "from-blue-500/20",
    to: "to-indigo-600/10",
    accent: "text-blue-300",
    badge: "bg-blue-500/15 text-blue-200 border-blue-500/25",
  },
  {
    emoji: "🌿",
    label: "Get Outside",
    heading: "Outdoor & Patio",
    sub: "Built for the elements",
    category: "Outdoor & Patio",
    from: "from-emerald-500/20",
    to: "to-teal-600/10",
    accent: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/25",
  },
  {
    emoji: "🚗",
    label: "Auto Essentials",
    heading: "Everyday Carry & Auto",
    sub: "Road-ready upgrades",
    category: "Everyday Carry & Auto",
    from: "from-slate-400/20",
    to: "to-slate-600/10",
    accent: "text-slate-300",
    badge: "bg-slate-400/15 text-slate-200 border-slate-400/25",
  },
];

export default function CategoryShowcase() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "right" ? 280 : -280,
      behavior: "smooth",
    });
  };

  const handleCardClick = (category: string) => {
    router.push(`/?category=${encodeURIComponent(category)}#catalog-section`);
  };

  return (
    <div className="relative">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Shop by Category
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All in stock — ships same day from US warehouses
          </p>
        </div>

        {/* Scroll controls (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal scrollable promo cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-1"
      >
        {PROMO_CARDS.map((card, i) => (
          <button
            key={card.category}
            onClick={() => handleCardClick(card.category)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`relative overflow-hidden fade-up flex-shrink-0 w-56 sm:w-64 rounded-2xl bg-gradient-to-br from-slate-900 ${card.from} ${card.to} border border-slate-700/60 p-5 text-left group hover:border-slate-500 hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.97] cursor-pointer`}
          >
            {/* Label pill */}
            <span
              className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mb-3 ${card.badge}`}
            >
              {card.label}
            </span>

            {/* Emoji + Heading */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl leading-none">{card.emoji}</span>
              <div>
                <h3 className={`text-sm font-black text-white leading-tight ${card.accent}`}>
                  {card.heading}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
              Shop collection
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Subtle shimmer overlay */}
            <div className="absolute inset-0 rounded-2xl card-shimmer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
}
