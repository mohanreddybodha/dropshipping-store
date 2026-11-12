import type { BundleTier, CartItem, Product, Variant } from "./types";

export interface VariantBundlePrices {
  price1x: number;
  price2x: number;
  price3x: number;
}

export interface ComputedBundlePricing extends VariantBundlePrices {
  tier: BundleTier;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  savings: number;
}

/** Round a non-negative dollar amount cleanly to 2 decimal places. */
export function roundCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Number(value.toFixed(2));
}

/**
 * Compute struck-through pre-discount "Selling Price" matching ProductCard (`retail_price_1x * 1.25`),
 * so displayed 20% savings reconcile identically across ProductCard, PDP, Cart, and Checkout.
 */
export function getComparePrice1x(retailPrice1x: number): number {
  return roundCents(retailPrice1x * 1.25);
}

/**
 * Authoritative 2x Value Bundle formula matching `calculate_pricing` in `src/models/database.py`:
 *   ROUND(retail_1x * 2.0 * 0.88, 2) - 0.01  (12% volume discount)
 */
export function deriveBundle2Price(retailPrice1x: number): number {
  if (!Number.isFinite(retailPrice1x) || retailPrice1x <= 0) return 0;
  const discounted = Number((retailPrice1x * 2 * 0.88).toFixed(2));
  return Math.max(0.01, Number((discounted - 0.01).toFixed(2)));
}

/**
 * Authoritative 3x Pro Bundle formula matching `calculate_pricing` in `src/models/database.py`:
 *   ROUND(retail_1x * 3.0 * 0.82, 2) - 0.01  (18% volume discount)
 */
export function deriveBundle3Price(retailPrice1x: number): number {
  if (!Number.isFinite(retailPrice1x) || retailPrice1x <= 0) return 0;
  const discounted = Number((retailPrice1x * 3 * 0.82).toFixed(2));
  return Math.max(0.01, Number((discounted - 0.01).toFixed(2)));
}

/**
 * Resolve authoritative 1x, 2x, and 3x prices for a variant, using stored
 * database/catalog bundle columns first and deriving only when absent.
 */
export function getVariantBundlePrices(
  variant?: Partial<Variant> | null,
  fallbackUnitPrice = 0
): VariantBundlePrices {
  const raw1x = Number(variant?.retail_price_1x || 0);
  const price1x =
    Number.isFinite(raw1x) && raw1x > 0
      ? roundCents(raw1x)
      : roundCents(Number(fallbackUnitPrice) || 0);

  if (price1x <= 0) {
    return { price1x: 0, price2x: 0, price3x: 0 };
  }

  const raw2x = Number(variant?.bundle_2_price || 0);
  const price2x =
    Number.isFinite(raw2x) && raw2x > 0 && raw2x < price1x * 2
      ? roundCents(raw2x)
      : deriveBundle2Price(price1x);

  const raw3x = Number(variant?.bundle_3_price || 0);
  const price3x =
    Number.isFinite(raw3x) && raw3x > 0 && raw3x < price1x * 3
      ? roundCents(raw3x)
      : deriveBundle3Price(price1x);

  return { price1x, price2x, price3x };
}

/**
 * Authoritative bundle pricing calculator shared by PDP, Cart, Checkout, and PayPal verification.
 *
 * Bundle tier and savings scale strictly from quantity:
 * - qty === 1 -> tier "1x", full `retail_price_1x`, savings === 0
 * - qty === 2 -> tier "2x", `bundle_2_price` (12% off), savings = 2*P1 - P2
 * - qty === 3 -> tier "3x", `bundle_3_price` (18% off), savings = 3*P1 - P3
 * - qty >= 4  -> tier "3x", per-unit rate = round(P3 / 3, 2), lineTotal = unitPrice * qty
 */
export function computeBundlePricing(
  variant?: Partial<Variant> | null,
  rawQuantity = 1,
  options?: { fallbackUnitPrice?: number }
): ComputedBundlePricing {
  const quantity = Math.min(99, Math.max(1, Math.floor(Number(rawQuantity) || 1)));
  const { price1x, price2x, price3x } = getVariantBundlePrices(
    variant,
    options?.fallbackUnitPrice || 0
  );

  if (price1x <= 0) {
    return {
      price1x: 0,
      price2x: 0,
      price3x: 0,
      tier: quantity >= 3 ? "3x" : quantity === 2 ? "2x" : "1x",
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      savings: 0,
    };
  }

  if (quantity === 1) {
    return {
      price1x,
      price2x,
      price3x,
      tier: "1x",
      quantity: 1,
      unitPrice: price1x,
      totalPrice: price1x,
      savings: 0,
    };
  }

  if (quantity === 2) {
    const totalPrice = price2x > 0 ? price2x : roundCents(price1x * 2);
    const unitPrice = roundCents(totalPrice / 2);
    const savings = roundCents(Math.max(0, price1x * 2 - totalPrice));
    return {
      price1x,
      price2x,
      price3x,
      tier: "2x",
      quantity: 2,
      unitPrice,
      totalPrice,
      savings,
    };
  }

  const unitPrice =
    price3x > 0 ? roundCents(price3x / 3) : price1x;
  const totalPrice =
    quantity === 3 && price3x > 0
      ? price3x
      : roundCents(unitPrice * quantity);
  const savings = roundCents(Math.max(0, price1x * quantity - totalPrice));

  return {
    price1x,
    price2x,
    price3x,
    tier: "3x",
    quantity,
    unitPrice,
    totalPrice,
    savings,
  };
}

/** Return a copy of `item` with tier, unitPrice, totalPrice, and savings normalized to match `quantity`. */
export function normalizeCartItemPricing(item: CartItem, overrideQuantity?: number): CartItem {
  const qty = overrideQuantity ?? item.quantity ?? 1;
  const computed = computeBundlePricing(item.variant, qty, {
    fallbackUnitPrice: item.unitPrice,
  });

  const normalizedVariant: Variant = item.variant
    ? {
        ...item.variant,
        retail_price_1x: computed.price1x || item.variant.retail_price_1x,
        bundle_2_price: computed.price2x || item.variant.bundle_2_price,
        bundle_3_price: computed.price3x || item.variant.bundle_3_price,
      }
    : item.variant;

  return {
    ...item,
    variant: normalizedVariant,
    tier: computed.tier,
    quantity: computed.quantity,
    unitPrice: computed.unitPrice,
    totalPrice: computed.totalPrice,
    savings: computed.savings,
  };
}

/** Summarize total amount, total bundle savings, and unit count across cart/checkout items. */
export function summarizeCartTotals(items: Array<Pick<CartItem, "totalPrice" | "savings" | "quantity">>): {
  totalAmount: number;
  totalSavings: number;
  itemCount: number;
} {
  let totalAmount = 0;
  let totalSavings = 0;
  let itemCount = 0;

  for (const item of items) {
    totalAmount += Number(item.totalPrice) || 0;
    totalSavings += Math.max(0, Number(item.savings) || 0);
    itemCount += Math.max(0, Math.floor(Number(item.quantity) || 0));
  }

  return {
    totalAmount: roundCents(totalAmount),
    totalSavings: roundCents(totalSavings),
    itemCount,
  };
}

export interface LineSellingDisplayPrices {
  unitRetail: number;
  unitCompare: number;
  sellingLineTotal: number;
  discounted20LineTotal: number;
  selling20Discount: number;
  bundleDiscount: number;
  finalLineTotal: number;
}

export interface CartBreakdownSummary {
  sellingPriceTotal: number;
  retailSubtotal: number;
  sellingDiscount: number;
  bundleDiscount: number;
  totalAmount: number;
  itemCount: number;
}

/**
 * Compute per-line selling display breakdown:
 *   sellingLineTotal (comparePrice * qty) - selling20Discount (20% off) - bundleDiscount = finalLineTotal
 */
export function getLineSellingDisplayPrices(
  item: Pick<CartItem, "variant" | "unitPrice" | "quantity" | "totalPrice" | "savings">
): LineSellingDisplayPrices {
  const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const unitRetail =
    getVariantBundlePrices(item.variant, item.unitPrice).price1x ||
    roundCents(Number(item.unitPrice) || 0);
  const unitCompare = getComparePrice1x(unitRetail);
  const sellingLineTotal = roundCents(unitCompare * qty);
  const discounted20LineTotal = roundCents(unitRetail * qty);
  const selling20Discount = roundCents(Math.max(0, sellingLineTotal - discounted20LineTotal));
  const bundleDiscount = Math.max(0, roundCents(Number(item.savings) || 0));
  const finalLineTotal =
    Number(item.totalPrice) > 0
      ? roundCents(Number(item.totalPrice))
      : roundCents(Math.max(0, discounted20LineTotal - bundleDiscount));

  return {
    unitRetail,
    unitCompare,
    sellingLineTotal,
    discounted20LineTotal,
    selling20Discount,
    bundleDiscount,
    finalLineTotal,
  };
}

/** Compute full Order Summary breakdown for Cart and Checkout UI. */
export function summarizeCartBreakdown(
  items: Array<Pick<CartItem, "variant" | "unitPrice" | "quantity" | "totalPrice" | "savings">>
): CartBreakdownSummary {
  let sellingPriceTotal = 0;
  let retailSubtotal = 0;
  let bundleDiscount = 0;
  let totalAmount = 0;
  let itemCount = 0;

  for (const item of items) {
    const line = getLineSellingDisplayPrices(item);
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    sellingPriceTotal += line.sellingLineTotal;
    retailSubtotal += line.discounted20LineTotal;
    bundleDiscount += line.bundleDiscount;
    totalAmount += line.finalLineTotal;
    itemCount += qty;
  }

  const roundedSelling = roundCents(sellingPriceTotal);
  const roundedRetail = roundCents(retailSubtotal);
  const roundedSellingDiscount = roundCents(Math.max(0, roundedSelling - roundedRetail));
  const roundedBundle = roundCents(bundleDiscount);
  const roundedTotal = roundCents(totalAmount);

  return {
    sellingPriceTotal: roundedSelling,
    retailSubtotal: roundedRetail,
    sellingDiscount: roundedSellingDiscount,
    bundleDiscount: roundedBundle,
    totalAmount: roundedTotal,
    itemCount,
  };
}

/** Max purchasable quantity per cart line capped at US stock (or 99). */
export function getStockCap(variant?: Partial<Variant> | null): number {
  const stock = Number(variant?.us_warehouse_stock || 0);
  return stock > 0 ? Math.min(99, stock) : 99;
}

/**
 * Determine whether two cart entries represent the same purchasable variant.
 * Every distinct size/color/specification in the catalog has a unique `variant.vid`,
 * so matching by non-empty `vid` avoids duplicating identical variants whose display
 * vs raw label (`display_name` vs `variant_name`) differs across views.
 */
export function isSameCartVariant(
  item: Pick<CartItem, "variant" | "selectedSize" | "selectedColor">,
  vid: string,
  selectedSize?: string,
  selectedColor?: string
): boolean {
  const itemVid = String(item.variant?.vid || "").trim();
  const targetVid = String(vid || "").trim();
  if (itemVid && targetVid) {
    return itemVid === targetVid;
  }
  return (
    itemVid === targetVid &&
    (item.selectedSize || "") === (selectedSize || "") &&
    (item.selectedColor || "") === (selectedColor || "")
  );
}

/**
 * Merge or append a variant addition into an existing cart list.
 * Re-adding the same variant (whether the same or a different 1x/2x/3x pack tier)
 * increments its unit count in one consolidated line item and recalculates bundle pricing.
 */
export function upsertMergedCartItem(
  prev: CartItem[],
  addition: {
    product: Product;
    variant: Variant;
    tier: BundleTier;
    selectedSize?: string;
    selectedColor?: string;
  }
): CartItem[] {
  const { product, variant, tier, selectedSize, selectedColor } = addition;
  const addQty = tier === "3x" ? 3 : tier === "2x" ? 2 : 1;
  const stockCap = getStockCap(variant);
  const existingIdx = prev.findIndex((i) =>
    isSameCartVariant(i, variant.vid, selectedSize, selectedColor)
  );

  if (existingIdx > -1) {
    const existing = prev[existingIdx];
    const nextQty = Math.min(stockCap, (existing.quantity || 1) + addQty);
    const updated = [...prev];
    updated[existingIdx] = normalizeCartItemPricing(
      {
        ...existing,
        product,
        variant,
        selectedSize: selectedSize || existing.selectedSize,
        selectedColor: selectedColor || existing.selectedColor,
      },
      nextQty
    );
    return updated;
  }

  const pricing = computeBundlePricing(variant, Math.min(stockCap, addQty));
  return [
    ...prev,
    {
      product,
      variant: {
        ...variant,
        retail_price_1x: pricing.price1x || variant.retail_price_1x,
        bundle_2_price: pricing.price2x || variant.bundle_2_price,
        bundle_3_price: pricing.price3x || variant.bundle_3_price,
      },
      selectedSize,
      selectedColor,
      tier: pricing.tier,
      quantity: pricing.quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.totalPrice,
      savings: pricing.savings,
    },
  ];
}
