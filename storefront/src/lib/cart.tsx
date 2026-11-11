"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { BundleTier, CartItem, Product, Variant } from "./types";
import { auth, onAuthStateChanged } from "./firebase";
import { saveUserCart, getUserAuthState, getCatalog, FALLBACK_PRODUCTS } from "./api";
import {
  computeBundlePricing,
  normalizeCartItemPricing,
  summarizeCartTotals,
} from "./bundlePricing";

function findCatalogEntryByVid(
  vid: string,
  catalogList: Product[] = FALLBACK_PRODUCTS
): { product: Product; variant: Variant } | null {
  if (!vid) return null;
  for (const p of catalogList) {
    for (const v of p.variants || []) {
      if (v.vid === vid) {
        return { product: p, variant: v };
      }
    }
  }
  return null;
}

function getStockCap(variant?: Variant | null): number {
  const stock = Number(variant?.us_warehouse_stock || 0);
  return stock > 0 ? Math.min(99, stock) : 99;
}

function isSameCartLine(
  item: CartItem,
  vid: string,
  selectedSize?: string,
  selectedColor?: string
): boolean {
  return (
    item.variant?.vid === vid &&
    (item.selectedSize || "") === (selectedSize || "") &&
    (item.selectedColor || "") === (selectedColor || "")
  );
}

function consolidateAndNormalizeCart(
  rawItems: CartItem[],
  catalogList: Product[] = FALLBACK_PRODUCTS
): CartItem[] {
  const merged: CartItem[] = [];

  for (const raw of rawItems) {
    if (!raw || !raw.product || !raw.variant || !raw.variant.vid) continue;
    const match = findCatalogEntryByVid(raw.variant.vid, catalogList);
    const product = match ? match.product : raw.product;
    const variant = match ? match.variant : raw.variant;

    const candidate: CartItem = {
      ...raw,
      product,
      variant,
    };

    const existingIdx = merged.findIndex((m) =>
      isSameCartLine(m, variant.vid, raw.selectedSize, raw.selectedColor)
    );

    if (existingIdx > -1) {
      const combinedQty = Math.min(
        getStockCap(variant),
        Math.max(1, (merged[existingIdx].quantity || 1) + (raw.quantity || 1))
      );
      merged[existingIdx] = normalizeCartItemPricing(
        { ...merged[existingIdx], product, variant },
        combinedQty
      );
    } else {
      const safeQty = Math.min(
        getStockCap(variant),
        Math.max(1, Math.floor(Number(raw.quantity) || 1))
      );
      const normalized = normalizeCartItemPricing(candidate, safeQty);
      if (normalized.unitPrice > 0) {
        merged.push(normalized);
      }
    }
  }

  return merged;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (
    product: Product,
    variant: Variant,
    tier: BundleTier,
    selectedSize?: string,
    selectedColor?: string
  ) => void;
  updateQuantity: (
    vid: string,
    tier: BundleTier,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => void;
  removeItem: (vid: string, tier: BundleTier, selectedSize?: string, selectedColor?: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalSavings: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "app_cart";
const CART_VERSION_KEY = "app_cart_version";
const CURRENT_CART_VERSION = "2.2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const didCatalogReconcileRef = useRef(false);

  // Load cart from localStorage on client mount (Hydration-safe with authoritative pricing normalization)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(consolidateAndNormalizeCart(parsed, FALLBACK_PRODUCTS));
        }
      }
      localStorage.setItem(CART_VERSION_KEY, CURRENT_CART_VERSION);
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Reconcile hydrated localStorage items once against live /api/catalog pricing
  useEffect(() => {
    if (!isHydrated || didCatalogReconcileRef.current || items.length === 0) return;
    didCatalogReconcileRef.current = true;
    let cancelled = false;

    getCatalog({ limit: 500 })
      .then((liveCatalog) => {
        if (cancelled || !Array.isArray(liveCatalog) || liveCatalog.length === 0) return;
        setItems((prev) => consolidateAndNormalizeCart(prev, liveCatalog));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isHydrated, items.length]);

  // Cross-device cloud sync: fetch & merge database cart on user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const [remoteState, liveCatalog] = await Promise.all([
          getUserAuthState(user.uid, user.email, user.phoneNumber),
          getCatalog({ limit: 500 }).catch(() => FALLBACK_PRODUCTS),
        ]);
        const catalogList =
          Array.isArray(liveCatalog) && liveCatalog.length > 0
            ? liveCatalog
            : FALLBACK_PRODUCTS;

        if (remoteState?.cart && Array.isArray(remoteState.cart) && remoteState.cart.length > 0) {
          setItems((localPrev) => {
            const incomingItems: CartItem[] = [...localPrev];
            for (const rc of remoteState.cart) {
              const catalogMatch = findCatalogEntryByVid(rc.variant_vid, catalogList);
              const live1x = Number(rc.retail_price_1x || 0);
              const rawSavedUnit = Number(rc.unit_price || 0);
              const inferred1x =
                live1x > 0
                  ? live1x
                  : rc.tier === 3 && rawSavedUnit > 0
                  ? +(rawSavedUnit / 0.82).toFixed(2)
                  : rc.tier === 2 && rawSavedUnit > 0
                  ? +(rawSavedUnit / 0.88).toFixed(2)
                  : rawSavedUnit;

              const matchedVariant: Variant = catalogMatch?.variant || {
                id: 0,
                vid: rc.variant_vid,
                sku: rc.sku || rc.variant_vid,
                variant_name: rc.variant_name || undefined,
                display_name: rc.display_name || undefined,
                title: rc.title || "Default",
                image_url: rc.image_url || undefined,
                wholesale_cost: Number(rc.wholesale_cost || 0),
                shipping_cost: Number(rc.shipping_cost || 0),
                retail_price_1x: inferred1x,
                bundle_2_price: Number(rc.bundle_2_price || 0),
                bundle_3_price: Number(rc.bundle_3_price || 0),
                us_warehouse_stock: Number(rc.us_warehouse_stock ?? 100),
                carrier_name: "USPS",
                delivery_sla: "3-5 Days",
                is_available: true,
              };

              if (!matchedVariant.retail_price_1x || matchedVariant.retail_price_1x <= 0) {
                continue;
              }

              const matchedProduct: Product = catalogMatch?.product || {
                id: 0,
                pid: rc.product_pid,
                slug: rc.slug || rc.product_pid || "item",
                title: rc.title || "Selected Item",
                hero_image_url: rc.image_url || "/placeholder.jpg",
                category: rc.category || "General",
                is_active: true,
                variants: [matchedVariant],
              };

              const existingIdx = incomingItems.findIndex((item) =>
                isSameCartLine(item, matchedVariant.vid, rc.selected_size || undefined)
              );

              if (existingIdx > -1) {
                const mergedQty = Math.max(
                  incomingItems[existingIdx].quantity || 1,
                  Number(rc.quantity) || 1
                );
                incomingItems[existingIdx] = normalizeCartItemPricing(
                  {
                    ...incomingItems[existingIdx],
                    product: matchedProduct,
                    variant: matchedVariant,
                  },
                  mergedQty
                );
              } else {
                const qty = Number(rc.quantity) || 1;
                const pricing = computeBundlePricing(matchedVariant, qty);
                incomingItems.push({
                  product: matchedProduct,
                  variant: {
                    ...matchedVariant,
                    retail_price_1x: pricing.price1x,
                    bundle_2_price: pricing.price2x,
                    bundle_3_price: pricing.price3x,
                  },
                  selectedSize: rc.selected_size || undefined,
                  tier: pricing.tier,
                  quantity: pricing.quantity,
                  unitPrice: pricing.unitPrice,
                  totalPrice: pricing.totalPrice,
                  savings: pricing.savings,
                });
              }
            }
            return consolidateAndNormalizeCart(incomingItems, catalogList);
          });
        }
      } catch (err) {
        console.warn("Failed fetching remote cart:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("app_cart", JSON.stringify(items));
    } catch {
      // Ignore
    }

    // Defensive cloud sync if user is authenticated with Firebase
    const currentUser = auth.currentUser;
    if (currentUser) {
      const payload = items.map((item) => ({
        variant_vid: item.variant?.vid || "",
        product_pid: item.product?.pid || "",
        title: item.product?.title || "",
        image_url: item.variant?.image_url || item.product?.hero_image_url || "",
        tier: item.tier === "2x" ? 2 : item.tier === "3x" ? 3 : 1,
        selected_size: item.selectedSize || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));
      saveUserCart(currentUser.uid, payload).catch(() => {});
    }
  }, [items, isHydrated]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addItem = (
    product: Product,
    variant: Variant,
    tier: BundleTier,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    const addQty = tier === "3x" ? 3 : tier === "2x" ? 2 : 1;

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) =>
        isSameCartLine(i, variant.vid, selectedSize, selectedColor)
      );
      if (existingIdx > -1) {
        const existing = prev[existingIdx];
        if (existing.tier === tier) {
          return prev;
        }
        const nextQty = Math.min(getStockCap(variant), existing.quantity + addQty);
        const updated = [...prev];
        updated[existingIdx] = normalizeCartItemPricing(
          { ...existing, product, variant },
          nextQty
        );
        return updated;
      }

      const pricing = computeBundlePricing(variant, addQty);
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
    });

    setIsOpen(true);
  };

  const updateQuantity = (
    vid: string,
    tier: BundleTier,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    if (quantity <= 0) {
      removeItem(vid, tier, selectedSize, selectedColor);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (isSameCartLine(i, vid, selectedSize, selectedColor)) {
          const cappedQty = Math.min(
            getStockCap(i.variant),
            Math.max(1, Math.floor(quantity))
          );
          return normalizeCartItemPricing(i, cappedQty);
        }
        return i;
      })
    );
  };

  const removeItem = (
    vid: string,
    _tier: BundleTier,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setItems((prev) =>
      prev.filter((i) => !isSameCartLine(i, vid, selectedSize, selectedColor))
    );
  };

  const clearCart = () => setItems([]);

  const { totalAmount, totalSavings, itemCount } = summarizeCartTotals(items);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        isHydrated,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalAmount,
        totalSavings,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
