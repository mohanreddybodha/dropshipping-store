"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { showToast } from "../ui/Toast";

interface MobileStickyBuyBarProps {
  product: Product;
  variant?: Variant;
}

export default function MobileStickyBuyBar({ product, variant }: MobileStickyBuyBarProps) {
  const { addItem } = useCart();
  const [currentTier, setCurrentTier] = useState<BundleTier>("1x");
  const [currentPrice, setCurrentPrice] = useState<number>(variant?.retail_price_1x || 24.99);
  const [currentSize, setCurrentSize] = useState<string>("Standard");

  useEffect(() => {
    if (variant?.retail_price_1x) {
      setCurrentPrice(variant.retail_price_1x);
    }
  }, [variant]);

  // Synchronize reactively with bundle tier selections in ProductInteractivePanel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tier: BundleTier; price: number; size?: string }>).detail;
      if (detail) {
        if (detail.tier) setCurrentTier(detail.tier);
        if (detail.price) setCurrentPrice(detail.price);
        if (detail.size) setCurrentSize(detail.size);
      }
    };
    window.addEventListener("product:tier_change", handler);
    return () => window.removeEventListener("product:tier_change", handler);
  }, []);

  if (!variant) return null;

  const handleQuickAdd = () => {
    addItem(product, variant, currentTier, currentSize);
    showToast(`Added ${currentTier} to Cart`, "success");
  };

  const tierLabel =
    currentTier === "1x" ? "1 Unit" : currentTier === "2x" ? "2 Units (Save 12%)" : "3 Units (Save 18%)";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 flex items-center justify-between shadow-2xl pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div>
        <span className="text-[11px] text-slate-500 font-bold block">{tierLabel}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black text-slate-900">${currentPrice.toFixed(2)}</span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            Free Delivery
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleQuickAdd}
        className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 text-xs active:scale-95 transition"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Add to Cart</span>
      </button>
    </div>
  );
}
