"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../../lib/cart";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck, Sparkles } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, totalSavings } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration layout flash
  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Discover our curated collection of everyday problem-solving home, tech, and outdoor essentials.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow-md active:scale-95"
          >
            Start Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {items.reduce((acc, curr) => acc + curr.quantity, 0)} items ready for dispatch
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
        >
          Continue Shopping →
        </Link>
      </div>

      {/* Free Domestic Delivery Progress Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 text-xs sm:text-sm text-emerald-900 font-semibold">
        <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span>
          🎉 You unlocked <strong>Free Tracked Domestic Delivery (3–5 Days)</strong> on all items!
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const heroImg =
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";

            return (
              <div
                key={`${item.variant.vid}-${item.tier}-${item.selectedSize}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between transition hover:border-slate-300"
              >
                <div className="flex items-center gap-4">
                  {/* Clickable Product Image */}
                  <Link
                    href={`/products/${item.product.slug}`}
                    prefetch={true}
                    className="flex-shrink-0 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImg}
                      alt={item.product.title}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform"
                    />
                  </Link>
                  <div className="space-y-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      prefetch={true}
                      className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-2 leading-snug"
                    >
                      {item.product.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {item.selectedSize && item.selectedSize !== "Standard" && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          Size: {item.selectedSize}
                        </span>
                      )}
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                        {item.tier === "1x"
                          ? "Single Unit"
                          : item.tier === "2x"
                          ? "2x Double Pack"
                          : "3x Family Pack"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      ${item.unitPrice.toFixed(2)} / unit
                    </div>

                    {/* Interactive Quantity Adjuster */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Qty:</span>
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.variant.vid,
                              item.tier,
                              item.quantity - 1,
                              item.selectedSize
                            )
                          }
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 py-1 text-xs font-black text-slate-900 bg-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.variant.vid,
                              item.tier,
                              item.quantity + 1,
                              item.selectedSize
                            )
                          }
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-2">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                    {item.savings > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600">
                        Saved ${item.savings.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      removeItem(item.variant.vid, item.tier, item.selectedSize)
                    }
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold p-1.5 rounded-lg hover:bg-rose-50 transition flex items-center gap-1"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Operational Policy Note */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Damage-Free Delivery Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every order is dispatched in shock-resistant packaging. If an item arrives damaged or broken during transit, send us a photo within 7 days of delivery and our US support team will dispatch an immediate free replacement at zero cost.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-lg font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Domestic Shipping:</span>
                <span className="font-bold text-emerald-600 uppercase tracking-tight">FREE</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Bundle Discounts:</span>
                  <span>-${totalSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Sales Tax:</span>
                <span className="font-bold text-slate-900">$0.00</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-slate-900 block">Total Due:</span>
                <span className="text-[10px] text-slate-400">USD (Free domestic shipping included)</span>
              </div>
              <span className="text-2xl font-black text-slate-900">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 text-center"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Reassurance Micro-List */}
            <div className="pt-2 space-y-2 text-[11px] text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Tracked 3–5 Business Day Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Free replacement on damaged arrivals</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Charges will appear as <strong>DOMESTICLAB</strong> on your statement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
