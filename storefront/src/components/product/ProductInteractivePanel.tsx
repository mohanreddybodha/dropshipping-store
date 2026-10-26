"use client";

import React, { useState } from "react";
import { BundleTier, Product, Variant } from "../../lib/types";
import { useCart } from "../../lib/cart";
import { ShieldCheck, Truck, ShoppingBag } from "lucide-react";
import SizeSelector from "./SizeSelector";

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
  const [selectedTier, setSelectedTier] = useState<BundleTier>("2x"); // Default to Tier 2 (Most Popular)

  // Determine initial size default
  const titleLower = product.title.toLowerCase();
  const isApparel =
    titleLower.includes("romper") ||
    titleLower.includes("women") ||
    titleLower.includes("hooded") ||
    titleLower.includes("pocket") ||
    titleLower.includes("shirt");
  const [selectedSize, setSelectedSize] = useState<string>(isApparel ? "M" : "Standard");

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

  const isLowStock = selectedVariant.us_warehouse_stock < 15;

  const handleSizeChange = (size: string, v: Variant) => {
    setSelectedSize(size);
    setSelectedVariant(v);
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, selectedTier, selectedSize);
  };

  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      {/* Consumer Inventory Status */}
      <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
        <span className="flex items-center gap-2 font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <span
            className={`w-2 h-2 rounded-full ${
              isLowStock ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse-dot"
            }`}
          />
          {isLowStock ? "High Demand — Limited Clearance Stock" : "In Stock — Ships Today from US"}
        </span>
        <span className="text-slate-400 font-semibold text-[11px]">Free Domestic Express</span>
      </div>

      {/* Dynamic Subtotal Banner */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-3xl sm:text-4xl font-black text-slate-900">
            ${currentPrice.toFixed(2)}
          </span>
          <span className="text-sm text-slate-500 ml-2 font-medium">
            (${unitPrice}/each)
          </span>
        </div>
        {savings > 0 && (
          <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
            You Save ${savings.toFixed(2)}
          </span>
        )}
      </div>

      {/* SIZE / OPTION SELECTOR WITH STOCK CLEARANCE */}
      <SizeSelector
        product={product}
        currentVariant={selectedVariant}
        selectedSize={selectedSize}
        onSelectSize={handleSizeChange}
      />

      {/* CRO ENGINE: Interactive Tiered Bundle Selector */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-black tracking-wider uppercase text-slate-700">
          Select Quantity & Bundle Savings:
        </label>

        {/* Tier 1: 1x Unit */}
        <div
          onClick={() => setSelectedTier("1x")}
          className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative flex items-center justify-between ${
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
              <p className="text-xs text-slate-500">Standard domestic order</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-slate-900">${price1x.toFixed(2)}</span>
            <p className="text-[11px] text-slate-400">Regular price</p>
          </div>
        </div>

        {/* Tier 2: 2x Units (Most Popular) */}
        <div
          onClick={() => setSelectedTier("2x")}
          className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative flex items-center justify-between ${
            selectedTier === "2x"
              ? "border-emerald-600 bg-emerald-50/40 shadow-md ring-1 ring-emerald-600"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
            Most Popular • Save 12%
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
            <p className="text-[11px] text-slate-400 line-through">
              ${(price1x * 2).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tier 3: 3x Units (Best Value) */}
        <div
          onClick={() => setSelectedTier("3x")}
          className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative flex items-center justify-between ${
            selectedTier === "3x"
              ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className="absolute -top-3 right-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
            Best Value • Save 18%
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
            <p className="text-[11px] text-slate-400 line-through">
              ${(price1x * 3).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Main High-Conversion Call To Action */}
      <button
        onClick={handleAddToCart}
        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-600/25 transition active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <ShoppingBag className="w-5 h-5" />
        <span>
          Add {currentUnitCount}x {selectedSize} to Cart — ${currentPrice.toFixed(2)}
        </span>
      </button>

      {/* Real-World Consumer Signals */}
      <div className="pt-2 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Free Tracked Delivery (3–5 Days)</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Free Replacement on Damage</span>
        </div>
      </div>
    </div>
  );
}
