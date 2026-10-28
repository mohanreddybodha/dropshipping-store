"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BundleTier, CartItem, Product, Variant } from "./types";
import { auth, onAuthStateChanged } from "./firebase";
import { saveUserCart, getUserAuthState, FALLBACK_PRODUCTS } from "./api";

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

  // Load cart from localStorage on client mount (Hydration-safe with self-healing migration)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize and defensively repair any stale fields from previous builds
          const sanitized: CartItem[] = parsed
            .filter((item) => item && item.product && item.variant)
            .map((item) => {
              const retail = Number(item.variant?.retail_price_1x) || 24.99;
              const unitPrice = Number(item.unitPrice) || retail;
              const tierMultiplier = item.tier === "2x" ? 2 : item.tier === "3x" ? 3 : 1;
              const totalPrice = Number(item.totalPrice) || +(unitPrice * tierMultiplier).toFixed(2);
              const quantity = Number(item.quantity) || tierMultiplier;
              return {
                ...item,
                unitPrice,
                totalPrice,
                quantity,
                savings: Number(item.savings) || 0,
              };
            });
          setItems(sanitized);
        }
      }
      localStorage.setItem(CART_VERSION_KEY, CURRENT_CART_VERSION);
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Cross-device cloud sync: fetch & merge database cart on user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const remoteState = await getUserAuthState(
          user.uid,
          user.email,
          user.phoneNumber
        );
        if (remoteState?.cart && Array.isArray(remoteState.cart) && remoteState.cart.length > 0) {
          setItems((localPrev) => {
            const merged = [...localPrev];
            for (const rc of remoteState.cart) {
              const matchedProduct =
                FALLBACK_PRODUCTS.find(
                  (p) =>
                    p.pid === rc.product_pid ||
                    p.variants?.some((v) => v.vid === rc.variant_vid) ||
                    p.title.toLowerCase() === (rc.title || "").toLowerCase()
                ) || FALLBACK_PRODUCTS[0];

              const matchedVariant =
                matchedProduct.variants?.find((v) => v.vid === rc.variant_vid) ||
                matchedProduct.variants?.[0];

              const tierStr: BundleTier = rc.tier === 2 ? "2x" : rc.tier === 3 ? "3x" : "1x";
              const existingIdx = merged.findIndex(
                (item) =>
                  item.variant?.vid === rc.variant_vid &&
                  item.tier === tierStr &&
                  (item.selectedSize || "") === (rc.selected_size || "")
              );

              if (existingIdx > -1) {
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  quantity: Math.max(merged[existingIdx].quantity, rc.quantity || 1),
                };
              } else if (matchedProduct && matchedVariant) {
                const retail = matchedVariant.retail_price_1x || 24.99;
                const unitPrice = rc.unit_price || retail;
                merged.push({
                  product: matchedProduct,
                  variant: matchedVariant,
                  selectedSize: rc.selected_size || undefined,
                  tier: tierStr,
                  quantity: rc.quantity || 1,
                  unitPrice,
                  totalPrice: +(unitPrice * (rc.quantity || 1)).toFixed(2),
                  savings: 0,
                });
              }
            }
            return merged;
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
        image_url: item.product?.hero_image_url || "",
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
    const qty = tier === "1x" ? 1 : tier === "2x" ? 2 : 3;
    let totalPrice = variant.retail_price_1x;
    let savings = 0;

    if (tier === "2x") {
      totalPrice = variant.bundle_2_price;
      savings = +(variant.retail_price_1x * 2 - variant.bundle_2_price).toFixed(2);
    } else if (tier === "3x") {
      totalPrice = variant.bundle_3_price;
      savings = +(variant.retail_price_1x * 3 - variant.bundle_3_price).toFixed(2);
    }

    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.variant.vid === variant.vid &&
          i.tier === tier &&
          i.selectedSize === selectedSize &&
          i.selectedColor === selectedColor
      );
      if (existingIdx > -1) {
        return prev;
      }
      return [
        ...prev,
        {
          product,
          variant,
          selectedSize,
          selectedColor,
          tier,
          quantity: qty,
          unitPrice: +(totalPrice / qty).toFixed(2),
          totalPrice,
          savings,
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
        if (
          i.variant.vid === vid &&
          i.tier === tier &&
          i.selectedSize === selectedSize &&
          i.selectedColor === selectedColor
        ) {
          const newTotal = +(i.unitPrice * quantity).toFixed(2);
          return {
            ...i,
            quantity,
            totalPrice: newTotal,
          };
        }
        return i;
      })
    );
  };

  const removeItem = (
    vid: string,
    tier: BundleTier,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          !(
            i.variant.vid === vid &&
            i.tier === tier &&
            i.selectedSize === selectedSize &&
            i.selectedColor === selectedColor
          )
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalAmount = +items.reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2);
  const totalSavings = +items.reduce((acc, curr) => acc + curr.savings, 0).toFixed(2);
  const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

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
