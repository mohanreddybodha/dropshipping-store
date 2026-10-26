"use client";

import React, { useMemo } from "react";
import { Flame, Check, AlertCircle } from "lucide-react";
import { Product, Variant, SizeOption } from "../../lib/types";

interface SizeSelectorProps {
  product: Product;
  selectedSize: string;
  onSelectSize: (size: string, variant: Variant) => void;
  currentVariant: Variant;
}

export default function SizeSelector({
  product,
  selectedSize,
  onSelectSize,
  currentVariant,
}: SizeSelectorProps) {
  // Determine realistic size options and stock clearance levels
  const sizeOptions: SizeOption[] = useMemo(() => {
    // 1. If product already has multiple variants, map each variant directly
    if (product.variants && product.variants.length > 1) {
      return product.variants.map((v, idx) => {
        const name = v.size || v.variant_name || (idx === 0 ? "Standard" : idx === 1 ? "Large" : `Option ${idx + 1}`);
        return {
          name,
          stock: v.us_warehouse_stock,
          isClearance: v.us_warehouse_stock > 0 && v.us_warehouse_stock < 15,
          isSoldOut: v.us_warehouse_stock <= 0,
          sku: v.sku,
        };
      });
    }

    // 2. Intelligently determine size options based on product type/category
    const titleLower = product.title.toLowerCase();
    const catLower = (product.category || "").toLowerCase();

    const isApparelOrWearable =
      titleLower.includes("romper") ||
      titleLower.includes("women") ||
      titleLower.includes("hooded") ||
      titleLower.includes("pocket") ||
      titleLower.includes("shirt") ||
      titleLower.includes("sleeve") ||
      titleLower.includes("hat") ||
      titleLower.includes("glove");

    const baseStock = currentVariant.us_warehouse_stock || 60;

    if (isApparelOrWearable) {
      return [
        {
          name: "S",
          stock: Math.max(3, baseStock % 9),
          isClearance: true, // Low clearance stock
          isSoldOut: false,
        },
        {
          name: "M",
          stock: Math.max(25, Math.floor(baseStock * 0.55)),
          isClearance: false,
          isSoldOut: false,
        },
        {
          name: "L",
          stock: Math.max(7, baseStock % 14),
          isClearance: true, // Clearance alert
          isSoldOut: false,
        },
        {
          name: "XL",
          stock: 0,
          isClearance: false,
          isSoldOut: true, // Sold out clearance state
        },
      ];
    }

    // Hardware, Home, Kitchen, Tech, Auto items
    const isMultiPackOrDimension =
      titleLower.includes("pack") ||
      titleLower.includes("pcs") ||
      titleLower.includes("set") ||
      titleLower.includes("shelf") ||
      titleLower.includes("rack") ||
      titleLower.includes("board") ||
      titleLower.includes("light") ||
      titleLower.includes("cord") ||
      titleLower.includes("cable") ||
      titleLower.includes("organizer");

    if (isMultiPackOrDimension) {
      return [
        {
          name: "Standard",
          stock: Math.max(18, Math.floor(baseStock * 0.7)),
          isClearance: false,
          isSoldOut: false,
        },
        {
          name: "Pro / Large",
          stock: Math.max(5, baseStock % 11),
          isClearance: true,
          isSoldOut: false,
        },
      ];
    }

    // Default sizing option for impulse domestic goods
    return [
      {
        name: "Standard",
        stock: baseStock,
        isClearance: baseStock < 15,
        isSoldOut: baseStock <= 0,
      },
      {
        name: "Deluxe / Plus",
        stock: Math.max(6, baseStock % 12),
        isClearance: true,
        isSoldOut: false,
      },
    ];
  }, [product, currentVariant]);

  const activeOption = sizeOptions.find((o) => o.name === selectedSize) || sizeOptions[0];

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>Select Size / Option:</span>
          <span className="text-emerald-700 font-extrabold font-mono">[{selectedSize}]</span>
        </label>

        {activeOption && (
          <span
            className={`font-bold flex items-center gap-1 ${
              activeOption.isSoldOut
                ? "text-rose-600"
                : activeOption.isClearance
                ? "text-amber-600"
                : "text-emerald-700"
            }`}
          >
            {activeOption.isClearance && <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
            {activeOption.isSoldOut
              ? "Size Sold Out"
              : activeOption.isClearance
              ? `Clearance: Only ${activeOption.stock} Left!`
              : `In Stock: ${activeOption.stock} Units`}
          </span>
        )}
      </div>

      {/* Size Option Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {sizeOptions.map((opt) => {
          const isSelected = selectedSize === opt.name;
          return (
            <button
              key={opt.name}
              type="button"
              disabled={opt.isSoldOut}
              onClick={() => onSelectSize(opt.name, currentVariant)}
              className={`relative py-3 px-3 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                opt.isSoldOut
                  ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed line-through"
                  : isSelected
                  ? "bg-emerald-50/60 border-emerald-600 text-slate-900 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {/* Size Name */}
              <span className="text-sm font-black tracking-tight">{opt.name}</span>

              {/* Stock Clearance Pill */}
              <div className="text-[10px] font-bold">
                {opt.isSoldOut ? (
                  <span className="text-rose-500">Sold Out</span>
                ) : opt.isClearance ? (
                  <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-tight">
                    <Flame className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                    {opt.stock} Left
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">{opt.stock} In Stock</span>
                )}
              </div>

              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-1 right-1.5 text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Stock Clearance Alert Banner */}
      {activeOption?.isClearance && !activeOption.isSoldOut && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
          <Flame className="w-4 h-4 text-amber-600 fill-amber-500 flex-shrink-0" />
          <p className="font-semibold leading-tight">
            <strong>Stock Clearance Alert:</strong> Only {activeOption.stock} units remaining in domestic fulfillment center. Ships today before clearance inventory exhausts.
          </p>
        </div>
      )}

      {activeOption?.isSoldOut && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <p className="font-semibold leading-tight">
            This size is currently sold out in all US warehouses. Please choose another size option above.
          </p>
        </div>
      )}
    </div>
  );
}
