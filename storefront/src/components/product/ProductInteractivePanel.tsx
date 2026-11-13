"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { getComparePrice1x, getVariantBundlePrices } from "../../lib/bundlePricing";
import { ShoppingBag, ArrowRight, Check, ArrowDown } from "lucide-react";
import SizeSelector, { parseApparelVariant } from "./SizeSelector";
import { showToast } from "../ui/Toast";

interface ProductInteractivePanelProps {
  product: Product;
  variant: Variant;
  initialSize?: string;
  initialColor?: string;
}

export default function ProductInteractivePanel({
  product,
  variant,
  initialSize,
  initialColor,
}: ProductInteractivePanelProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const initialVariant = variant || product.variants[0];
  const [selectedVariant, setSelectedVariant] = useState<Variant>(initialVariant);
  const [isAdded, setIsAdded] = useState(false);

  // Inferred initial color and size from genuine variant or explicit query params
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (initialSize) return initialSize;
    const parsed = parseApparelVariant(initialVariant);
    if (parsed) return parsed.size;
    if (initialVariant?.size) {
      const clean = initialVariant.size.includes("-")
        ? initialVariant.size.split("-").pop()?.trim().toUpperCase() || ""
        : initialVariant.size.trim().toUpperCase();
      if (clean) return clean;
    }
    return "";
  });

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (initialColor) return initialColor;
    const parsed = parseApparelVariant(initialVariant);
    if (parsed) return parsed.color;
    if (initialVariant?.color && !initialVariant.color.includes("-")) return initialVariant.color;
    return "";
  });

  // Ensure gallery switches to initial variant image if present
  useEffect(() => {
    if (typeof window !== "undefined" && initialVariant?.image_url) {
      window.dispatchEvent(
        new CustomEvent("product:variant_image_change", {
          detail: { imageUrl: initialVariant.image_url },
        })
      );
    }
  }, [initialVariant]);

  // Sync in-page Add -> View Cart morphing ONLY for this active visit (fresh visits always start as Add to Cart)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isAdded?: boolean }>).detail;
      if (detail && typeof detail.isAdded === "boolean") {
        setIsAdded(detail.isAdded);
      }
    };
    window.addEventListener("product:cart_added", handler);
    return () => window.removeEventListener("product:cart_added", handler);
  }, []);

  const { price1x } = getVariantBundlePrices(selectedVariant);
  const comparePrice1x = getComparePrice1x(price1x);
  const currentPrice = price1x;

  // Reactively broadcast price, size, color, and variant updates to the mobile sticky buy bar
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("product:tier_change", {
          detail: {
            tier: "1x" as BundleTier,
            price: currentPrice,
            size: selectedSize,
            color: selectedColor,
            variant: selectedVariant,
          },
        })
      );
    }
  }, [currentPrice, selectedSize, selectedColor, selectedVariant]);

  const handleSizeChange = (size: string, v: Variant) => {
    setSelectedSize(size);
    setSelectedVariant(v);
    setIsAdded(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("product:cart_added", { detail: { isAdded: false } }));
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setIsAdded(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("product:cart_added", { detail: { isAdded: false } }));
    }
  };

  const handleButtonClick = () => {
    if (isAdded) {
      // Morph back to View Cart navigation only on the active visit after adding
      router.push("/cart");
      return;
    }

    addItem(
      product,
      selectedVariant,
      "1x",
      selectedSize || selectedVariant.display_name || selectedVariant.variant_name || undefined,
      selectedColor || undefined
    );
    setIsAdded(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("product:cart_added", { detail: { isAdded: true } }));
    }
    showToast("Added to Cart", "cart-add");
  };

  return (
    <div className="space-y-4 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm">
      {/* Price Banner: Discounted selling price + strikethrough original compare price + Save 20% badge opposite */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-3xl font-black text-slate-900">
            ${currentPrice.toFixed(2)}
          </span>
          {comparePrice1x > currentPrice && (
            <span className="text-sm sm:text-base text-slate-400 line-through font-semibold">
              ${comparePrice1x.toFixed(2)}
            </span>
          )}
        </div>
        {comparePrice1x > currentPrice && (
          <span className="inline-flex items-center gap-0.5 text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap flex-shrink-0">
            <ArrowDown className="w-3 h-3 stroke-[2.5]" />
            <span>20%</span>
          </span>
        )}
      </div>

      {/* Genuine Size & Color Options (Only shown when genuine options exist) */}
      <SizeSelector
        product={product}
        currentVariant={selectedVariant}
        selectedSize={selectedSize}
        selectedColor={selectedColor}
        onSelectSize={handleSizeChange}
        onSelectColor={handleColorChange}
      />

      {/* Desktop-Only Morphing Add to Cart -> View Cart button (AJIO pattern) */}
      <div className="hidden md:block pt-1">
        <button
          type="button"
          onClick={handleButtonClick}
          className={`w-full py-3.5 px-6 font-extrabold text-sm rounded-2xl shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 ${
            isAdded
              ? "bg-slate-950 hover:bg-slate-900 text-white shadow-slate-950/20 border border-slate-800"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>View in Cart</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart — ${currentPrice.toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
