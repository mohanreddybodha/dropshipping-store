"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";

interface MobileStickyBuyBarProps {
  product: Product;
  variant?: Variant;
}

export default function MobileStickyBuyBar({ product, variant }: MobileStickyBuyBarProps) {
  const { addItem } = useCart();

  if (!variant) return null;

  const price = variant.retail_price_1x;

  const handleQuickAdd = () => {
    addItem(product, variant, "1x");
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 flex items-center justify-between shadow-2xl">
      <div>
        <span className="text-xs text-slate-500 font-semibold block">Total Price</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black text-slate-900">${price.toFixed(2)}</span>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            Free Shipping
          </span>
        </div>
      </div>

      <button
        onClick={handleQuickAdd}
        className="flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 text-xs active:scale-95 transition"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Add to Cart</span>
      </button>
    </div>
  );
}
