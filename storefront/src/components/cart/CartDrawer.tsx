"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, Trash2, ArrowRight, Truck } from "lucide-react";
import { useCart } from "../../lib/cart";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, totalAmount, totalSavings } = useCart();

  // Prevent background scroll when cart drawer is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Your Cart
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </h2>
            <button
              onClick={closeCart}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Alert Bar */}
          <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex items-center gap-3 text-xs text-emerald-800 font-medium">
            <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>🎉 You qualify for <strong>FREE 3–5 Day US Domestic Shipping!</strong></span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                <Truck className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-800">Your cart is empty</p>
                <p className="text-sm text-slate-500 mt-1">Discover verified US domestic products with fast shipping.</p>
                <button
                  onClick={closeCart}
                  className="mt-6 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.variant.vid}-${item.tier}-${item.selectedSize || "default"}`}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-2 relative"
                >
                  <div className="flex justify-between items-start gap-3">
                    {/* Clickable Product Header & Thumbnail Navigating to PDP */}
                    <Link
                      href={`/products/${item.product.slug}`}
                      onClick={closeCart}
                      className="flex gap-3 items-start min-w-0 group cursor-pointer flex-1"
                    >
                      {item.product.hero_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product.hero_image_url}
                          alt={item.product.title}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0 bg-white group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                          {item.product.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.selectedSize && (
                            <span className="text-[11px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                              Size: {item.selectedSize}
                            </span>
                          )}
                          <span className="text-xs text-emerald-600 font-semibold">
                            US Domestic
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={() => removeItem(item.variant.vid, item.tier, item.selectedSize)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                    <span className="text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded font-medium">
                      Bundle: {item.tier.toUpperCase()} ({item.quantity} {item.quantity === 1 ? "unit" : "units"})
                    </span>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                      {item.savings > 0 && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          Saved ${item.savings.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal & Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-white space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Bundle Savings</span>
                    <span>-${totalSavings.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Subtotal</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
