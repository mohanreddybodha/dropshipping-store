"use client";

import React, { useState, useEffect } from "react";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { ShoppingBag } from "lucide-react";
import SizeSelector from "./SizeSelector";
import { showToast } from "../ui/Toast";

interface ProductInteractivePanelProps {
  product: Product;
  variant: Variant;
}

export default function ProductInteractivePanel({
  product,
  variant,
}: ProductInteractivePanelProps) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<Variant>(variant);
  // Default to 1x Single Unit
  const [selectedTier, setSelectedTier] = useState<BundleTier>("1x");

  const titleLower = product.title.toLowerCase();
  const isApparel =
    titleLower.includes("dress") ||
    titleLower.includes("romper") ||
    titleLower.includes("women") ||
    titleLower.includes("hooded") ||
    titleLower.includes("pocket") ||
    titleLower.includes("shirt") ||
    titleLower.includes("jacket") ||
    titleLower.includes("pants");

  const [selectedSize, setSelectedSize] = useState<string>(isApparel ? "M" : "");
  const [selectedColor, setSelectedColor] = useState<string>(isApparel ? "Black" : "");

  const price1x = selectedVariant.retail_price_1x;
  const price2x = selectedVariant.bundle_2_price;
  const price3x = selectedVariant.bundle_3_price;

  const currentPrice =
    selectedTier === "1x" ? price1x : selectedTier === "2x" ? price2x : price3x;

  const currentUnitCount = selectedTier === "1x" ? 1 : selectedTier === "2x" ? 2 : 3;
  const unitPrice = +(currentPrice / currentUnitCount).toFixed(2);

  const savings =
    selectedTier === "2x"
      ? +(price1x * 2 - price2x).toFixed(2)
      : selectedTier === "3x"
      ? +(price1x * 3 - price3x).toFixed(2)
      : 0;

  // Reactively broadcast tier, price, size, and color updates to the mobile sticky buy bar
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("product:tier_change", {
          detail: {
            tier: selectedTier,
            price: currentPrice,
            size: selectedSize,
            color: selectedColor,
          },
        })
      );
    }
  }, [selectedTier, currentPrice, selectedSize, selectedColor]);

  const handleSizeChange = (size: string, v: Variant) => {
    setSelectedSize(size);
    setSelectedVariant(v);
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, selectedTier, selectedSize || undefined, selectedColor || undefined);
    showToast("Added to Cart", "cart-add", "View Cart →", "/cart");
  };

  return (
    <div className="space-y-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
      {/* Price Banner without duplicate in-stock tags */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-3xl sm:text-4xl font-black text-slate-900">
            ${currentPrice.toFixed(2)}
          </span>
          <span className="text-xs text-slate-500 ml-2 font-medium">
            (${unitPrice}/each)
          </span>
        </div>
        {savings > 0 && (
          <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
            Save ${savings.toFixed(2)}
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
        onSelectColor={setSelectedColor}
      />

      {/* Quantity & Bundle Savings Selector */}
      <div className="space-y-2.5">
        <label className="block text-xs font-black tracking-wider uppercase text-slate-700">
          Select Quantity & Bundle Savings:
        </label>

        {/* 1x Single Unit (Default) */}
        <div
          onClick={() => setSelectedTier("1x")}
          className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all relative flex items-center justify-between ${
            selectedTier === "1x"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              checked={selectedTier === "1x"}
              onChange={() => setSelectedTier("1x")}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">1x Single Unit</p>
              <p className="text-xs text-slate-500">Standard single order</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-slate-900">${price1x.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400">Regular price</p>
          </div>
        </div>

        {/* 2x Double Pack */}
        <div
          onClick={() => setSelectedTier("2x")}
          className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all relative flex items-center justify-between ${
            selectedTier === "2x"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            Save 12%
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              checked={selectedTier === "2x"}
              onChange={() => setSelectedTier("2x")}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">2x Double Pack</p>
              <p className="text-xs text-emerald-700 font-semibold">
                ${(price2x / 2).toFixed(2)} each (Save ${(price1x * 2 - price2x).toFixed(2)})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-slate-900">${price2x.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 line-through">${(price1x * 2).toFixed(2)}</p>
          </div>
        </div>

        {/* 3x Family Bundle */}
        <div
          onClick={() => setSelectedTier("3x")}
          className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all relative flex items-center justify-between ${
            selectedTier === "3x"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="absolute -top-2.5 right-4 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
            Save 18%
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              checked={selectedTier === "3x"}
              onChange={() => setSelectedTier("3x")}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">3x Family Bundle</p>
              <p className="text-xs text-emerald-700 font-semibold">
                ${(price3x / 3).toFixed(2)} each (Save ${(price1x * 3 - price3x).toFixed(2)})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-slate-900">${price3x.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 line-through">${(price1x * 3).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Desktop-Only Add to Cart button (On mobile, the bottom sticky bar handles this!) */}
      <div className="hidden md:block pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add to Cart — ${currentPrice.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}
