"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../../lib/cart";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import { Product } from "../../lib/types";
import ProductCard from "../../components/catalog/ProductCard";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, totalSavings } = useCart();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    setMounted(true);

    // Retrieve saved customer user if signed in
    try {
      const storedUser = localStorage.getItem("customer_auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserEmail(parsed.email || null);
      } else {
        const savedEmail = localStorage.getItem("customer_email");
        if (savedEmail) setUserEmail(savedEmail);
      }
    } catch {
      // Ignore
    }

    // Retrieve recently viewed products
    try {
      const raw = localStorage.getItem("recently_viewed_products");
      if (raw) {
        const list: Product[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cartSlugs = new Set(items.map((i) => i.product.slug));
          const filtered = list.filter((p) => !cartSlugs.has(p.slug));
          setRecentlyViewed(filtered.slice(0, 4));
        }
      }
    } catch {
      // Ignore
    }
  }, [items]);

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse mb-5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Your Cart is Empty
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Explore our collection of problem-solving domestic essentials with free shipping.
        </p>
        <div className="pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-md active:scale-95"
          >
            Start Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recently viewed products when cart is empty */}
        {recentlyViewed.length > 0 && (
          <div className="pt-10 text-left border-t border-slate-200/80 space-y-4">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Recently Viewed Products
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentlyViewed.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 pb-16 md:pb-6 space-y-6">
      {/* Cart Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {items.reduce((acc, curr) => acc + curr.quantity, 0)} items ready for checkout
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
        >
          Continue Shopping →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
        {/* Left Column: Cart Items List (Consistent Proportional Row Layout on Mobile & Desktop) */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const heroImg =
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";

            return (
              <div
                key={`${item.variant.vid}-${item.tier}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-row items-center gap-3 sm:gap-4 transition hover:border-slate-300"
              >
                {/* Fixed Proportional Thumbnail */}
                <Link
                  href={`/products/${item.product.slug}`}
                  prefetch={true}
                  className="w-16 h-16 sm:w-20 sm:h-20 min-w-[4rem] min-h-[4rem] sm:min-w-[5rem] sm:min-h-[5rem] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 group block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImg}
                    alt={item.product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </Link>

                {/* Main Product Info & Controls */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${item.product.slug}`}
                      prefetch={true}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-1 leading-snug"
                    >
                      {item.product.title}
                    </Link>
                    <span className="text-xs sm:text-sm font-black text-slate-900 flex-shrink-0">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Variation tags */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                    {item.selectedSize && (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Size: {item.selectedSize}
                      </span>
                    )}
                    {item.selectedColor && (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Color: {item.selectedColor}
                      </span>
                    )}
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                      {item.tier === "1x"
                        ? "Single Unit"
                        : item.tier === "2x"
                        ? "2x Double Pack"
                        : "3x Family Pack"}
                    </span>
                    <span className="text-slate-400">
                      (${item.unitPrice.toFixed(2)}/unit)
                    </span>
                  </div>

                  {/* Quantity Controller & Remove Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.variant.vid,
                            item.tier,
                            item.quantity - 1,
                            item.selectedSize,
                            item.selectedColor
                          )
                        }
                        className="px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-black text-slate-900 bg-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.variant.vid,
                            item.tier,
                            item.quantity + 1,
                            item.selectedSize,
                            item.selectedColor
                          )
                        }
                        className="px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        removeItem(item.variant.vid, item.tier, item.selectedSize, item.selectedColor)
                      }
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold p-1 rounded-lg hover:bg-rose-50 transition flex items-center gap-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary & Account/Checkout Action */}
        <div className="space-y-3.5">
          {/* Order Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight border-b border-slate-100 pb-2.5">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Domestic Shipping:</span>
                <span className="font-bold text-emerald-600">Free</span>
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

            <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-xs font-bold text-slate-900">Total Due:</span>
              <span className="text-xl font-black text-slate-900">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 text-center"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Account / Sign-in Status Prompt */}
            {userEmail ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-700">
                <span className="truncate">Signed in: <strong>{userEmail}</strong></span>
                <Link href="/profile" className="text-emerald-700 font-bold hover:underline ml-2 flex-shrink-0">
                  Orders →
                </Link>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Have an account?</span>
                </div>
                <Link
                  href="/profile"
                  className="font-bold text-emerald-700 hover:text-emerald-800 transition"
                >
                  Sign In →
                </Link>
              </div>
            )}

            {/* Tracked Delivery Reassurance (Without unconfigured payment assumptions) */}
            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100">
              <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Tracked 3–5 Business Day Delivery via USPS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Below Proceed to Checkout: Recently Viewed Products (No empty gap) */}
      {recentlyViewed.length > 0 && (
        <section className="pt-6 border-t border-slate-200/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Recently Viewed Products
            </h2>
            <Link
              href="/"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              <span>Explore More</span>
              <span>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {recentlyViewed.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
