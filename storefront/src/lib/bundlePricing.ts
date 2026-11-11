import type { BundleTier, CartItem, Variant } from "./types";

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
