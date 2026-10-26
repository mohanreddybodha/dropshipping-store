"use client";

import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { Product, Variant } from "../../lib/types";

interface SizeSelectorProps {
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  onSelectSize: (size: string, variant: Variant) => void;
  onSelectColor?: (color: string) => void;
  currentVariant: Variant;
}

const APPAREL_SIZES = ["S", "M", "L", "XL"];
const DEFAULT_COLORS = ["Black", "White", "Navy Blue", "Beige", "Gray"];

export default function SizeSelector({
  product,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
  currentVariant,
}: SizeSelectorProps) {
  const titleLower = product.title.toLowerCase();
  const catLower = (product.category || "").toLowerCase();

  // Check if product is apparel / clothing
  const isApparel = useMemo(() => {
    return (
      catLower.includes("apparel") ||
      catLower.includes("cloth") ||
      catLower.includes("fashion") ||
      titleLower.includes("dress") ||
      titleLower.includes("romper") ||
      titleLower.includes("women") ||
      titleLower.includes("hooded") ||
      titleLower.includes("pocket") ||
      titleLower.includes("shirt") ||
      titleLower.includes("sleeve") ||
      titleLower.includes("jacket") ||
      titleLower.includes("pants") ||
      titleLower.includes("legging") ||
      titleLower.includes("underwear")
    );
  }, [titleLower, catLower]);

  // If product has multiple genuine variants in DB
  const hasMultipleVariants = product.variants && product.variants.length > 1;

  // If not apparel and has only 1 standard variant, DO NOT fabricate mock "Deluxe / Plus" options!
  if (!isApparel && !hasMultipleVariants) {
    return null;
  }

  return (
    <div className="space-y-4 pt-1 border-t border-slate-100">
      {/* Apparel Size Selection */}
      {isApparel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-700">
              Select Size: <strong className="text-emerald-700 font-mono">[{selectedSize || "M"}]</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {APPAREL_SIZES.map((size) => {
              const isSelected = (selectedSize || "M") === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSelectSize(size, currentVariant)}
                  className={`py-2 px-3 rounded-xl border text-center transition-all duration-150 font-bold text-xs flex items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>{size}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Apparel Color Selection */}
      {isApparel && onSelectColor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-700">
              Select Color: <strong className="text-emerald-700">[{selectedColor || "Black"}]</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {DEFAULT_COLORS.map((col) => {
              const isSelected = (selectedColor || "Black") === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => onSelectColor(col)}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm font-bold"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border border-black/10 ${
                      col === "Black"
                        ? "bg-slate-950"
                        : col === "White"
                        ? "bg-white"
                        : col === "Navy Blue"
                        ? "bg-blue-900"
                        : col === "Beige"
                        ? "bg-amber-200"
                        : "bg-slate-400"
                    }`}
                  />
                  <span>{col}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Variant Product Option Selector (if not apparel, but has real distinct variants) */}
      {!isApparel && hasMultipleVariants && (
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Option / Model:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {product.variants.map((v, idx) => {
              const label = v.variant_name || v.size || `Option ${idx + 1}`;
              const isSelected = currentVariant.vid === v.vid;
              return (
                <button
                  key={v.vid}
                  type="button"
                  onClick={() => onSelectSize(label, v)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="truncate">{label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
