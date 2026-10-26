"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { BundleTier, CartItem, Product, Variant } from "./types";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on client mount (Hydration-safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_cart");
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("app_cart", JSON.stringify(items));
    } catch {
      // Ignore
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
