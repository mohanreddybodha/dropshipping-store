"use client";

import React, { useMemo, useState } from "react";
import { Check, Info, Package, Layers, CheckCircle2 } from "lucide-react";
import { Product, Variant } from "../../lib/types";

interface SizeSelectorProps {
  product: Product;
  selectedSize?: string;
  selectedColor?: string;
  onSelectSize: (size: string, variant: Variant) => void;
  onSelectColor?: (color: string) => void;
  currentVariant: Variant;
}

export const APPAREL_SIZE_REGEX = /^(xxs|xs|s|m|l|xl|xxl|2xl|3xl|4xl|5xl)$/i;

export const SIZE_ORDER: Record<string, number> = {
  XXS: 1,
  XS: 2,
  S: 3,
  M: 4,
  L: 5,
  XL: 6,
  XXL: 7,
  "2XL": 8,
  "3XL": 9,
  "4XL": 10,
  "5XL": 11,
};

/**
 * Robust apparel color & size parser.
 * Handles both "Color-Size" (Dark grey-M) and "Size-Color" (S-White) conventions.
 */
export function parseApparelVariant(v: Variant): { color: string; size: string } | null {
  if (!v) return null;
  // If clean size and color are already properly separated
  if (v.size && APPAREL_SIZE_REGEX.test(v.size.trim()) && v.color && !v.color.includes("-")) {
    return { color: v.color.trim(), size: v.size.trim().toUpperCase() };
  }
  const name = (v.variant_name || "").trim();
  if (!name.includes("-")) {
    if (APPAREL_SIZE_REGEX.test(name)) {
      return { color: "Standard", size: name.toUpperCase() };
    }
    return null;
  }

  const parts = name.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Case A: Size is at the end (e.g., "Dark grey-M", "Black-XL")
  const lastPart = parts[parts.length - 1];
  if (APPAREL_SIZE_REGEX.test(lastPart)) {
    const color = parts.slice(0, parts.length - 1).join(" ");
    return { color: color || "Standard", size: lastPart.toUpperCase() };
  }

  // Case B: Size is at the start (e.g., "S-White", "2XL-Navy")
  const firstPart = parts[0];
  if (APPAREL_SIZE_REGEX.test(firstPart)) {
    const color = parts.slice(1).join(" ");
    return { color: color || "Standard", size: firstPart.toUpperCase() };
  }

  return null;
}

/**
 * Get the customer-facing label for a variant.
 * Priority: display_name (curated) > variant_name (raw CJ) > sku fallback.
 */
export function getVariantLabel(v: Variant): string {
  if (v.display_name && v.display_name.trim()) return v.display_name.trim();
  const raw = v.variant_name || v.sku || "Standard";
  return raw.replace(/_+/g, " ").trim();
}

function getColorDotClass(colorName: string): string {
  const c = colorName.toLowerCase();
  if (c.includes("black")) return "bg-slate-950";
  if (c.includes("white")) return "bg-white border border-slate-300";
  if (c.includes("red")) return "bg-rose-600";
  if (c.includes("blue") || c.includes("navy")) return "bg-blue-800";
  if (c.includes("green")) return "bg-emerald-600";
  if (c.includes("yellow")) return "bg-amber-400";
  if (c.includes("pink")) return "bg-pink-400";
  if (c.includes("gray") || c.includes("grey")) return "bg-slate-500";
  if (c.includes("silver")) return "bg-slate-300 border border-slate-400";
  if (c.includes("orange")) return "bg-orange-500";
  if (c.includes("purple") || c.includes("violet")) return "bg-purple-600";
  if (c.includes("brown") || c.includes("coffee")) return "bg-amber-900";
  if (c.includes("beige") || c.includes("khaki")) return "bg-amber-100 border border-slate-300";
  return "bg-slate-400";
}

function isSetOrBundle(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("set") ||
    lower.includes("piece") ||
    lower.includes("pcs") ||
    lower.includes("pack") ||
    lower.includes("bundle") ||
    lower.includes("kit") ||
    lower.includes("+")
  );
}

function getDynamicInclusionsText(variant: Variant, product: Product): string {
  const label = getVariantLabel(variant).toLowerCase();
  const prodTitle = product.title.toLowerCase();

  if (prodTitle.includes("knife")) {
    if (label.includes("23-piece") || label.includes("23pcs")) {
      return "Includes complete 23-Piece culinary master collection: full chef, santoku, bread, boning, utility, steak knives & hardwood block.";
    }
    if (label.includes("10-knife") || label.includes("ten piece")) {
      return "Includes 10-Piece complete knife set with chef, bread, carving, santoku, utility, paring knives and counter display block.";
    }
    if (label.includes("8-knife") || label.includes("8 piece") || label.includes("9pcs")) {
      return "Includes 8–9 piece professional cutlery block set: essential prep knives with heavy-duty storage block.";
    }
    if (label.includes("6-knife") || label.includes("six piece")) {
      return "Includes 6-Piece kitchen block set: 8\" Chef, Santoku, Utility, Paring knife, Kitchen Shears and Counter Block.";
    }
    if (label.includes("5-knife") || label.includes("5-piece") || label.includes("5set")) {
      return "Includes 5-Piece kitchen collection covering all primary culinary prep needs.";
    }
    if (label.includes("4-knife") || label.includes("4pcs") || label.includes("4 piece")) {
      return "Includes 4-Piece essential kitchen knife set.";
    }
    if (label.includes("3-knife") || label.includes("three piece") || label.includes("3.5+5+7")) {
      return "Includes 3-Piece trio: Chef knife, Santoku knife, and Paring knife.";
    }
    if (label.includes("2-knife") || label.includes("2 pieces") || label.includes("chef knife + santoku")) {
      return "Includes 2-Piece dual knife set: 8\" Chef Knife + 7\" Santoku Knife.";
    }
    if (label.includes("chef")) {
      return "Includes 1x Professional 8-Inch Chef Knife with hand-honed razor edge for slicing, dicing & chopping.";
    }
    if (label.includes("santoku")) {
      return "Includes 1x Japanese-Style 7-Inch Santoku Knife with hollow-ground fluting.";
    }
    if (label.includes("boning")) {
      return "Includes 1x Precision 6-Inch Boning / Fillet Knife with flexible tapered blade.";
    }
    if (label.includes("paring") || label.includes("fruit")) {
      return "Includes 1x Precision 3.5-Inch Paring / Fruit Knife for peeling and detailed prep.";
    }
    if (label.includes("utility")) {
      return "Includes 1x Versatile 5-Inch Utility Knife for everyday kitchen cutting.";
    }
    if (label.includes("cleaver") || label.includes("chopping") || label.includes("meat")) {
      return "Includes 1x Heavy-Duty Meat & Bone Cleaver forged for maximum chopping power.";
    }
    if (label.includes("bread")) {
      return "Includes 1x Serrated 8-Inch Bread Knife with scalloped teeth for effortless crust slicing.";
    }
  }

  if (prodTitle.includes("light") || prodTitle.includes("lamp")) {
    if (label.includes("remote") || label.includes("touch + remote")) {
      return "Includes 1x Rechargeable LED Night Lamp + 1x Wireless Multi-Color Remote Control + USB-C Cable.";
    }
    if (label.includes("voice") || label.includes("voice control")) {
      return "Includes 1x Intelligent Voice + Touch Controlled Silicone Animal LED Night Lamp + USB-C Cable.";
    }
    if (label.includes("deluxe") || label.includes("accessories")) {
      return "Includes 1x LED Lamp, Wireless Remote, Lanyard Strap, and Deluxe Gift Box.";
    }
    if (label.includes("2-pack") || label.includes("set of 2") || label.includes("2-light") || label.includes("2 pack")) {
      return "Includes 2x Identical Matching Units. Dual domestic packaging.";
    }
    if (label.includes("4-pack") || label.includes("4-light")) {
      return "Includes 4x Complete Units with mounting hardware.";
    }
    if (label.includes("6-pack") || label.includes("6-light") || label.includes("8-light")) {
      return "Includes full multi-pack collection with all necessary mounting and power accessories.";
    }
  }

  if (prodTitle.includes("steamer") || prodTitle.includes("iron")) {
    if (label.includes("us plug")) {
      return "Includes 1x Handheld Garment Steamer with US Standard 110V-120V 2-Prong Polarized Plug.";
    }
    if (label.includes("uk plug")) {
      return "Includes 1x Handheld Garment Steamer with UK Standard 230V 3-Pin Fused Plug.";
    }
    if (label.includes("eu plug")) {
      return "Includes 1x Handheld Garment Steamer with European Type-C/E 230V Round Pin Plug.";
    }
    if (label.includes("au plug")) {
      return "Includes 1x Handheld Garment Steamer with AU/NZ Standard 230V Angled 2-Pin Plug.";
    }
  }

  if (prodTitle.includes("charger")) {
    if (label.includes("2-pack")) {
      return "Includes 2x Fast Car Chargers. Verified 100W dual-port output.";
    }
    if (label.includes("3-pack")) {
      return "Includes 3x Fast Car Chargers. Multi-vehicle family bundle.";
    }
  }

  // Generic fallback
  return `Includes 1x verified ${getVariantLabel(variant)} specification. Dispatched from US domestic warehouses via tracked ground carrier (est. 3–5 business days, 48 contiguous US states street addresses).`;
}

export default function SizeSelector({
  product,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
  currentVariant,
}: SizeSelectorProps) {
  const [filterTab, setFilterTab] = useState<"all" | "sets" | "singles">("all");

  const variants = useMemo(() => {
    return (product.variants || []).filter(
      (v) =>
        v.is_available !== false &&
        (v.us_warehouse_stock === undefined || v.us_warehouse_stock > 15)
    );
  }, [product.variants]);

  // Check if variants follow Color-Size or Size-Color apparel convention
  const isColorSizeApparel = useMemo(() => {
    if (variants.length <= 1) return false;
    let matches = 0;
    for (const v of variants) {
      if (parseApparelVariant(v)) {
        matches++;
      }
    }
    return matches >= Math.min(2, variants.length);
  }, [variants]);

  // Apparel grouping: Map of Color -> List of { size, variant }
  const apparelData = useMemo(() => {
    if (!isColorSizeApparel) return null;
    const colorMap = new Map<string, { size: string; variant: Variant }[]>();
    for (const v of variants) {
      const parsed = parseApparelVariant(v);
      if (!parsed) continue;
      const { color, size } = parsed;
      if (!colorMap.has(color)) {
        colorMap.set(color, []);
      }
      colorMap.get(color)!.push({ size, variant: v });
    }
    const colors = Array.from(colorMap.keys());
    return { colorMap, colors };
  }, [isColorSizeApparel, variants]);

  // Active color for apparel
  const activeColor = useMemo(() => {
    if (!apparelData) return "";
    if (selectedColor && apparelData.colorMap.has(selectedColor)) return selectedColor;
    const curParsed = parseApparelVariant(currentVariant);
    if (curParsed && apparelData.colorMap.has(curParsed.color)) return curParsed.color;
    return apparelData.colors[0] || "";
  }, [apparelData, selectedColor, currentVariant]);

  // Available sizes for the active color, naturally sorted by XS -> S -> M -> L -> XL -> 2XL
  const availableSizes = useMemo(() => {
    if (!apparelData || !activeColor) return [];
    const sizes = apparelData.colorMap.get(activeColor) || [];
    return [...sizes].sort((a, b) => {
      const orderA = SIZE_ORDER[a.size] || 99;
      const orderB = SIZE_ORDER[b.size] || 99;
      return orderA - orderB;
    });
  }, [apparelData, activeColor]);

  // Sets vs Singles categorization for high-variant non-apparel goods
  const hasSetsAndSingles = useMemo(() => {
    if (variants.length < 6 || isColorSizeApparel) return false;
    const setMatches = variants.filter((v) => isSetOrBundle(getVariantLabel(v))).length;
    return setMatches >= 2 && variants.length - setMatches >= 2;
  }, [variants, isColorSizeApparel]);

  const filteredVariants = useMemo(() => {
    if (!hasSetsAndSingles || filterTab === "all") return variants;
    if (filterTab === "sets") {
      return variants.filter((v) => isSetOrBundle(getVariantLabel(v)));
    }
    return variants.filter((v) => !isSetOrBundle(getVariantLabel(v)));
  }, [variants, hasSetsAndSingles, filterTab]);

  // Single variant products: show verified stock guarantee badge
  if (variants.length <= 1) {
    const single = variants[0];
    return (
      <div className="pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="font-bold text-slate-900">Standard Model:</span>
          <span className="text-slate-600 truncate">
            {single ? getVariantLabel(single) : "Verified US Domestic Warehouse Stock"}
          </span>
        </div>
      </div>
    );
  }

  // 1. Genuine Color-Size Apparel & Pet Gear Selector
  if (isColorSizeApparel && apparelData) {
    const titleLower = (product.title || "").toLowerCase();
    const categoryLower = (product.category || "").toLowerCase();
    const isPetProduct =
      titleLower.includes("dog") ||
      titleLower.includes("pet") ||
      titleLower.includes("cat") ||
      titleLower.includes("carrier") ||
      titleLower.includes("muzzle") ||
      titleLower.includes("collar") ||
      titleLower.includes("crate") ||
      categoryLower.includes("pet");

    const isApparel =
      titleLower.includes("hoodie") ||
      titleLower.includes("shirt") ||
      titleLower.includes("t-shirt") ||
      titleLower.includes("pants") ||
      titleLower.includes("trousers") ||
      titleLower.includes("romper") ||
      titleLower.includes("jacket") ||
      titleLower.includes("dress") ||
      categoryLower.includes("clothing") ||
      categoryLower.includes("apparel");

    const curParsed = parseApparelVariant(currentVariant);
    const rawSize =
      curParsed?.size ||
      (selectedSize && APPAREL_SIZE_REGEX.test(selectedSize.trim())
        ? selectedSize.trim().toUpperCase()
        : availableSizes[0]?.size || "M");
    const curSize = rawSize.includes("-")
      ? rawSize.split("-").pop()?.trim().toUpperCase() || rawSize
      : rawSize;

    return (
      <div className="space-y-3.5 pt-1 border-t border-slate-100">
        {/* Color Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-700">
              Color: <strong className="text-emerald-700">[{activeColor}]</strong>
            </span>
            <span className="text-[10px] text-slate-400">{apparelData.colors.length} Available</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {apparelData.colors.map((color) => {
              const isSelected = activeColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    if (onSelectColor) onSelectColor(color);
                    const matchingSizes = apparelData.colorMap.get(color) || [];
                    const sameSizeMatch = matchingSizes.find(
                      (s) => s.size.toLowerCase() === (selectedSize || "").toLowerCase()
                    );
                    const nextVariant = sameSizeMatch ? sameSizeMatch.variant : matchingSizes[0]?.variant;
                    if (nextVariant) {
                      onSelectSize(sameSizeMatch?.size || matchingSizes[0]?.size || "M", nextVariant);
                      if (typeof window !== "undefined" && (nextVariant.image_url || product.hero_image_url)) {
                        window.dispatchEvent(
                          new CustomEvent("product:variant_image_change", {
                            detail: { imageUrl: nextVariant.image_url || product.hero_image_url },
                          })
                        );
                      }
                    }
                  }}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs font-bold ring-1 ring-slate-900"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${getColorDotClass(color)} flex-shrink-0`} />
                  <span>{color}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Size Selection (Only displayed when genuine multiple sizes exist for the chosen color) */}
        {availableSizes.length > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Size: <strong className="text-emerald-700 font-mono">[{curSize}]</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isPetProduct ? "Pet Breed & Weight Sizing" : isApparel ? "US Standard Sizing" : "Standard Sizing"}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableSizes.map(({ size, variant }) => {
                const isSelected = currentVariant.vid === variant.vid;
                return (
                  <button
                    key={variant.vid}
                    type="button"
                    onClick={() => {
                      onSelectSize(size, variant);
                      if (typeof window !== "undefined" && (variant.image_url || product.hero_image_url)) {
                        window.dispatchEvent(
                          new CustomEvent("product:variant_image_change", {
                            detail: { imageUrl: variant.image_url || product.hero_image_url },
                          })
                        );
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs ring-1 ring-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-extrabold text-xs">{size}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? "text-emerald-300 font-bold" : "text-slate-500"
                      }`}
                    >
                      ${variant.retail_price_1x.toFixed(2)}
                    </span>
                    {isSelected && (
                      <span className="inline-block mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Active Selection & Inclusions Card for Apparel & Pet Gear */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 text-xs">
            <div className="flex items-start gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-slate-900 font-bold leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Active Selection
                </span>
                <span className="text-emerald-700 font-extrabold break-words">
                  {activeColor}{availableSizes.length > 1 ? ` / ${curSize}` : ""}
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] whitespace-nowrap flex-shrink-0">
              ${currentVariant.retail_price_1x.toFixed(2)} / unit
            </span>
          </div>
          <p className="text-[11px] text-slate-600">
            {isPetProduct
              ? "Verified pet carrier specifications. Dispatched from US domestic hubs via tracked ground delivery (est. 3–5 business days, 48 contiguous US street addresses only)."
              : isApparel
              ? "US Standard Sizing. Dispatched from US domestic hubs via tracked ground delivery (est. 3–5 business days, 48 contiguous US street addresses only)."
              : "Verified specifications. Dispatched from US domestic hubs via tracked ground delivery (est. 3–5 business days, 48 contiguous US street addresses only)."}
          </p>
        </div>
      </div>
    );
  }

  // 2. High-Performance Multi-Specification / Model Selector with Real Price Variation & Inclusions Breakdown
  const selectionNote = product.variant_selection_note;
  const currentLabel = getVariantLabel(currentVariant);
  const inclusionDesc = getDynamicInclusionsText(currentVariant, product);

  return (
    <div className="space-y-3 pt-1 border-t border-slate-100">
      {/* Header with Option Count & Current Selection */}
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Select Model / Specification:</span>
        </label>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          {variants.length} Options
        </span>
      </div>

      {/* Categorized Filter Tabs (Visible when product mixes sets with single tools/knives) */}
      {hasSetsAndSingles && (
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
              filterTab === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All ({variants.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("sets")}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
              filterTab === "sets"
                ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Sets & Collections</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("singles")}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
              filterTab === "singles"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Individual Items
          </button>
        </div>
      )}

      {/* Grid of Specification Options with Dynamic Scroll Container for Large Catalogs */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
          filteredVariants.length > 8
            ? "max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200"
            : ""
        }`}
      >
        {filteredVariants.map((v) => {
          const isSelected = currentVariant.vid === v.vid;
          const displayLabel = getVariantLabel(v);
          const isSet = isSetOrBundle(displayLabel);

          return (
            <button
              key={v.vid}
              type="button"
              onClick={() => {
                onSelectSize(displayLabel, v);
                if (typeof window !== "undefined" && (v.image_url || product.hero_image_url)) {
                  window.dispatchEvent(
                    new CustomEvent("product:variant_image_change", {
                      detail: { imageUrl: v.image_url || product.hero_image_url },
                    })
                  );
                }
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between gap-2 cursor-pointer active:scale-98 ${
                isSelected
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs ring-1 ring-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                {v.image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={v.image_url}
                    alt={displayLabel}
                    className="w-8 h-8 object-cover rounded-lg border border-black/10 flex-shrink-0 bg-white"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1 truncate">
                    {isSet && (
                      <span
                        className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                          isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        SET
                      </span>
                    )}
                    <span className="truncate leading-tight">{displayLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className={`text-xs font-black ${
                    isSelected ? "text-emerald-300" : "text-slate-900 font-mono"
                  }`}
                >
                  ${v.retail_price_1x.toFixed(2)}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── DYNAMIC SPECIFICATION & INCLUSIONS BREAKDOWN CARD ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 animate-in fade-in duration-200">
        <div className="flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-1.5 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-slate-900 font-bold leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Active Selection
              </span>
              <span className="text-emerald-700 font-extrabold break-words">
                {currentLabel}
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] whitespace-nowrap flex-shrink-0">
            ${currentVariant.retail_price_1x.toFixed(2)} / unit
          </span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          {inclusionDesc}
        </p>
      </div>

      {/* Clarification banner for set/pack/quantity-named products */}
      {selectionNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{selectionNote}</span>
        </div>
      )}
    </div>
  );
}
