"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Check } from "lucide-react";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { getComparePrice1x, getVariantBundlePrices } from "../../lib/bundlePricing";
import { showToast } from "../ui/Toast";

interface MobileStickyBuyBarProps {
  product: Product;
  variant?: Variant;
}

export default function MobileStickyBuyBar({ product, variant }: MobileStickyBuyBarProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [currentVariant, setCurrentVariant] = useState<Variant | undefined>(variant);
  const [currentTier, setCurrentTier] = useState<BundleTier>("1x");
  const [currentPrice, setCurrentPrice] = useState<number>(
    getVariantBundlePrices(variant).price1x
  );
  const [currentSize, setCurrentSize] = useState<string>("");
  const [currentColor, setCurrentColor] = useState<string>("");
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (variant) {
      setCurrentVariant(variant);
      setCurrentPrice(getVariantBundlePrices(variant).price1x);
    }
  }, [variant]);

  // Synchronize reactively with bundle tier & in-page add state in ProductInteractivePanel
  useEffect(() => {
    const tierHandler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          tier: BundleTier;
          price: number;
          size?: string;
          color?: string;
          variant?: Variant;
        }>
      ).detail;
      if (detail) {
        if (detail.tier) setCurrentTier(detail.tier);
        if (detail.price !== undefined) setCurrentPrice(detail.price);
        if (detail.size !== undefined) setCurrentSize(detail.size);
        if (detail.color !== undefined) setCurrentColor(detail.color);
        if (detail.variant) setCurrentVariant(detail.variant);
      }
    };
    const addedHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ isAdded?: boolean }>).detail;
      if (detail && typeof detail.isAdded === "boolean") {
        setIsAdded(detail.isAdded);
      }
    };
    window.addEventListener("product:tier_change", tierHandler);
    window.addEventListener("product:cart_added", addedHandler);
    return () => {
      window.removeEventListener("product:tier_change", tierHandler);
      window.removeEventListener("product:cart_added", addedHandler);
    };
  }, []);

  const activeVariant = currentVariant || variant;

  if (!activeVariant) return null;

  const handleButtonClick = () => {
    if (isAdded) {
      router.push("/cart");
      return;
    }

    const effectiveSize =
      currentSize || activeVariant.display_name || activeVariant.variant_name || undefined;
    addItem(product, activeVariant, currentTier, effectiveSize, currentColor || undefined);
    setIsAdded(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("product:cart_added", { detail: { isAdded: true } }));
    }
    showToast("Added to Cart", "cart-add");
  };

  const comparePrice = getComparePrice1x(currentPrice);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 px-4 flex items-center justify-between shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black text-slate-900">${currentPrice.toFixed(2)}</span>
          {comparePrice > currentPrice && (
            <span className="text-xs text-slate-400 line-through font-semibold">
              ${comparePrice.toFixed(2)}
            </span>
          )}
          {comparePrice > currentPrice && (
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/80 uppercase">
              Save 20%
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-emerald-700 block">
          Free Delivery
        </span>
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
