"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Check } from "lucide-react";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { showToast } from "../ui/Toast";

interface MobileStickyBuyBarProps {
  product: Product;
  variant?: Variant;
}

export default function MobileStickyBuyBar({ product, variant }: MobileStickyBuyBarProps) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const [currentTier, setCurrentTier] = useState<BundleTier>("1x");
  const [currentPrice, setCurrentPrice] = useState<number>(variant?.retail_price_1x || 24.99);
  const [currentSize, setCurrentSize] = useState<string>("");
  const [currentColor, setCurrentColor] = useState<string>("");
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (variant?.retail_price_1x) {
      setCurrentPrice(variant.retail_price_1x);
    }
  }, [variant]);

  // Synchronize reactively with bundle tier selections in ProductInteractivePanel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          tier: BundleTier;
          price: number;
          size?: string;
          color?: string;
        }>
      ).detail;
      if (detail) {
        if (detail.tier) setCurrentTier(detail.tier);
        if (detail.price) setCurrentPrice(detail.price);
        if (detail.size !== undefined) setCurrentSize(detail.size);
        if (detail.color !== undefined) setCurrentColor(detail.color);
        setIsAdded(false);
      }
    };
    window.addEventListener("product:tier_change", handler);
    return () => window.removeEventListener("product:tier_change", handler);
  }, []);

  // Check if configuration already exists in cart
  useEffect(() => {
    if (!variant) return;
    const existing = items.some(
      (item) =>
        item.variant.vid === variant.vid &&
        item.tier === currentTier &&
        (item.selectedSize || "") === (currentSize || "") &&
        (item.selectedColor || "") === (currentColor || "")
    );
    if (existing) {
      setIsAdded(true);
    }
  }, [items, variant, currentTier, currentSize, currentColor]);

  if (!variant) return null;

  const handleButtonClick = () => {
    if (isAdded) {
      // AJIO Style: Morph into View Cart -> instant navigation
      router.push("/cart");
      return;
    }

    addItem(product, variant, currentTier, currentSize || undefined, currentColor || undefined);
    setIsAdded(true);
    showToast("Added to Cart", "cart-add");
  };

  const tierLabel =
    currentTier === "1x"
      ? "1 Unit"
      : currentTier === "2x"
      ? "2 Units (Save 12%)"
      : "3 Units (Save 18%)";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 px-4 flex items-center justify-between shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div>
        <span className="text-[10px] text-slate-500 font-bold block">{tierLabel}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black text-slate-900">${currentPrice.toFixed(2)}</span>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            Free Delivery
          </span>
        </div>
      </div>

      {/* Morphing Button: Add to Cart -> View Cart */}
      <button
        type="button"
        onClick={handleButtonClick}
        className={`flex items-center gap-1.5 py-2.5 px-5 font-bold rounded-xl text-xs active:scale-95 transition-all duration-300 shadow-md ${
          isAdded
            ? "bg-slate-950 text-white shadow-slate-950/20 border border-slate-800"
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Cart</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </>
        ) : (
          <>
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </>
        )}
      </button>
    </div>
  );
}
