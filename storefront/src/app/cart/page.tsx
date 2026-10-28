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
} from "lucide-react";
import { Product } from "../../lib/types";
import { FALLBACK_PRODUCTS, getCatalog } from "../../lib/api";
import HorizontalProductRow from "../../components/catalog/HorizontalProductRow";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, totalSavings } = useCart();
  const [mounted, setMounted] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<Product[]>(
    FALLBACK_PRODUCTS.slice(0, 10)
  );

  useEffect(() => {
    setMounted(true);
    const cartSlugs = new Set(items.map((i) => i.product.slug));

    // 1. Retrieve Watchlist items
    try {
      const rawWatchlist = localStorage.getItem("watchlist_items");
      if (rawWatchlist) {
        const parsed: Product[] = JSON.parse(rawWatchlist);
        if (Array.isArray(parsed)) {
          setWatchlistItems(parsed.filter((p) => !cartSlugs.has(p.slug)));
        }
      }
    } catch {
      // Ignore
    }

    // 2. Retrieve Recently Viewed items
    try {
      const rawRecent = localStorage.getItem("recently_viewed_products");
      if (rawRecent) {
        const parsed: Product[] = JSON.parse(rawRecent);
        if (Array.isArray(parsed)) {
          setRecentlyViewed(parsed.filter((p) => !cartSlugs.has(p.slug)));
        }
      }
    } catch {
      // Ignore
    }

    // 3. Retrieve Suggested For You from catalog
    getCatalog({ limit: 15 })
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setSuggestedItems(res.filter((p) => !cartSlugs.has(p.slug)));
        }
      })
      .catch(() => {
        setSuggestedItems(FALLBACK_PRODUCTS.filter((p) => !cartSlugs.has(p.slug)).slice(0, 10));
      });
  }, [items]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-4 h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ── EMPTY CART VIEW ──
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 pb-20 md:pb-8 space-y-6">
        {/* Centered Empty Cart Card */}
        <div className="max-w-md mx-auto text-center space-y-4 py-8 px-6 sm:px-8 bg-white border border-slate-200/90 rounded-3xl shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-8 h-8 text-slate-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Your Cart is Empty
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Discover domestic essentials dispatched directly from US warehouses with guaranteed 3–5 day delivery.
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md active:scale-95"
            >
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 1. Priority: Your Watchlist (Horizontal Scrolling, No Description) */}
        {watchlistItems.length > 0 && (
          <HorizontalProductRow
            title="Your Watchlist"
            viewAllHref="/watchlist"
            viewAllText="View All"
            products={watchlistItems}
          />
        )}

        {/* 2. Recently Viewed (Horizontal Scrolling, No Description) */}
        {recentlyViewed.length > 0 && (
          <HorizontalProductRow
            title="Recently Viewed"
            viewAllHref="/"
            viewAllText="View All"
            products={recentlyViewed}
          />
        )}

        {/* 3. Suggested For You (Horizontal Scrolling, No Description) */}
        <HorizontalProductRow
          title="Suggested For You"
          viewAllHref="/"
          viewAllText="View All"
          products={suggestedItems}
        />
      </div>
    );
  }

  // ── ACTIVE CART VIEW ──
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 pb-20 md:pb-8 space-y-6">
      {/* Cart Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            {items.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0)} items ready for domestic checkout
          </p>
        </div>
        <div className="flex items-center gap-4">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition"
              title="Reset and clear all cart items"
            >
              Clear Cart
            </button>
          )}
          <Link
            href="/"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
          >
            <span>Continue Shopping</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-3.5">
          {items.map((item) => {
            const heroImg =
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";

            return (
              <div
                key={`${item.variant.vid}-${item.tier}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-row items-center gap-3.5 sm:gap-5 transition hover:border-slate-300"
              >
                {/* Proportional Thumbnail */}
                <Link
                  href={`/products/${item.product.slug}`}
                  prefetch={true}
                  className="w-18 h-18 sm:w-24 sm:h-24 min-w-[4.5rem] min-h-[4.5rem] sm:min-w-[6rem] sm:min-h-[6rem] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 group block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImg}
                    alt={item.product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </Link>

                {/* Main Product Info & Controls */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/products/${item.product.slug}`}
                      prefetch={true}
                      className="text-xs sm:text-base font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-1 leading-snug"
                    >
                      {item.product.title}
                    </Link>
                    <span className="text-sm sm:text-base font-black text-slate-900 flex-shrink-0">
                      ${(Number(item.totalPrice) || Number(item.variant?.retail_price_1x) || 24.99).toFixed(2)}
                    </span>
                  </div>

                  {/* Variation tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                    {item.selectedSize && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        Size: {item.selectedSize}
                      </span>
                    )}
                    {item.selectedColor && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        Color: {item.selectedColor}
                      </span>
                    )}
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                      {item.tier === "1x"
                        ? "Single Unit"
                        : item.tier === "2x"
                        ? "2x Double Pack"
                        : "3x Family Pack"}
                    </span>
                    <span className="text-slate-400">
                      (${(Number(item.unitPrice) || Number(item.variant?.retail_price_1x) || 24.99).toFixed(2)}/unit)
                    </span>
                  </div>

                  {/* Quantity Controller & Remove Action */}
                  <div className="flex items-center justify-between pt-1.5">
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
                            item.selectedSize,
                            item.selectedColor
                          )
                        }
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        removeItem(item.variant.vid, item.tier, item.selectedSize, item.selectedColor)
                      }
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold p-1.5 rounded-lg hover:bg-rose-50 transition flex items-center gap-1"
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

        {/* Right Column: Order Summary & Checkout Action */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Domestic Shipping:</span>
                <span className="font-bold text-emerald-600">Free (USPS Tracked)</span>
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
              <span className="text-xs sm:text-sm font-bold text-slate-900">Total Due:</span>
              <span className="text-2xl font-black text-slate-900">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 text-center"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="pt-2.5 flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-100">
              <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Free 3–5 Business Day Delivery via USPS Domestic</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BELOW PROCEED TO CHECKOUT: 3 ROWS IN EXACT ORDER ── */}

      {/* 1. First priority: Your Watchlist (Horizontal Scroll, No Description, View All opposite) */}
      {watchlistItems.length > 0 && (
        <HorizontalProductRow
          title="Your Watchlist"
          viewAllHref="/watchlist"
          viewAllText="View All"
          products={watchlistItems}
        />
      )}

      {/* 2. Second priority: Recently Viewed (Horizontal Scroll, No Description, View All opposite) */}
      {recentlyViewed.length > 0 && (
        <HorizontalProductRow
          title="Recently Viewed"
          viewAllHref="/"
          viewAllText="View All"
          products={recentlyViewed}
        />
      )}

      {/* 3. Third priority: Suggested For You (Horizontal Scroll, No Description, View All opposite) */}
      <HorizontalProductRow
        title="Suggested For You"
        viewAllHref="/"
        viewAllText="View All"
        products={suggestedItems}
      />
    </div>
  );
}
