"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../../lib/cart";
import {
  getLineSellingDisplayPrices,
  normalizeCartItemPricing,
  summarizeCartBreakdown,
} from "../../lib/bundlePricing";
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import { Product } from "../../lib/types";
import { getCatalog, FALLBACK_PRODUCTS } from "../../lib/api";
import HorizontalProductRow from "../../components/catalog/HorizontalProductRow";
import { showToast } from "../../components/ui/Toast";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const breakdown = summarizeCartBreakdown(items);
  const [mounted, setMounted] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<Product[]>([]);

  useEffect(() => {
    setMounted(true);
    const cartSlugs = new Set(items.map((i) => i.product.slug));
    let watchlistList: Product[] = [];
    let recentList: Product[] = [];

    // 1. Retrieve Watchlist items (excluding items in cart)
    try {
      const rawWatchlist = localStorage.getItem("watchlist_items");
      if (rawWatchlist) {
        const parsed: Product[] = JSON.parse(rawWatchlist);
        if (Array.isArray(parsed)) {
          watchlistList = parsed.filter((p) => !cartSlugs.has(p.slug));
          setWatchlistItems(watchlistList);
        }
      }
    } catch {
      // Ignore
    }

    const watchlistSlugs = new Set(watchlistList.map((p) => p.slug));

    // 2. Retrieve Recently Viewed items (strictly excluding items in cart AND items in watchlist)
    try {
      const rawRecent = localStorage.getItem("recently_viewed_products");
      if (rawRecent) {
        const parsed: Product[] = JSON.parse(rawRecent);
        if (Array.isArray(parsed)) {
          recentList = parsed.filter((p) => !cartSlugs.has(p.slug) && !watchlistSlugs.has(p.slug));
          setRecentlyViewed(recentList);
        }
      }
    } catch {
      // Ignore
    }

    const recentSlugs = new Set(recentList.map((p) => p.slug));

    // 3. Instant In-Memory Suggested Items (0ms latency, zero redundant network calls)
    const suggested = FALLBACK_PRODUCTS.filter(
      (p) => !cartSlugs.has(p.slug) && !watchlistSlugs.has(p.slug) && !recentSlugs.has(p.slug)
    ).slice(0, 10);
    setSuggestedItems(suggested);
  }, [items]);


  // Dynamic unit text that accurately reflects exact units without double multiplication
  const getUnitText = (quantity: number, tier: string) => {
    const q = Number(quantity) || 1;
    if (tier === "2x") {
      return `${q} Units (Double Pack Bundle)`;
    }
    if (tier === "3x") {
      return `${q} Units (Family Pack Bundle)`;
    }
    return q === 1 ? "1 Unit" : `${q} Units`;
  };

  // Flipkart-style Buy Now: checks out only this specific product at the user's selected quantity
  const handleBuyNow = (item: (typeof items)[0]) => {
    const query = new URLSearchParams({
      buyNow: "true",
      vid: item.variant.vid,
      tier: item.tier,
      qty: (item.quantity || 1).toString(),
    });
    if (item.selectedSize) query.set("size", item.selectedSize);
    if (item.selectedColor) query.set("color", item.selectedColor);
    router.push(`/checkout?${query.toString()}`);
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-12">
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
      <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10 pt-2.5 sm:pt-4 pb-20 md:pb-8 space-y-5 sm:space-y-6">


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
              Discover domestic essentials dispatched from US warehouses with estimated 3–5 business day tracked delivery to physical street addresses in the 48 contiguous US states.
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
    <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-6 lg:px-8 xl:px-10 pt-2.5 sm:pt-4 pb-20 md:pb-8 space-y-5 sm:space-y-6">
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
        <div className="flex items-center">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearCart();
                showToast("Cart cleared", "cart-remove");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Clear all cart items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Cart Items List (Mobile-Optimized Flipkart Card Layout) */}
        <div className="lg:col-span-8 space-y-3.5">
          {items.map((rawItem) => {
            const item = normalizeCartItemPricing(rawItem);
            const linePrices = getLineSellingDisplayPrices(item);
            const heroImg =
              item.variant?.image_url ||
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";
            const maxStock =
              item.variant?.us_warehouse_stock && item.variant.us_warehouse_stock > 0
                ? Math.min(99, item.variant.us_warehouse_stock)
                : 99;

            const upsellText =
              item.quantity === 1
                ? "Add 1 more item to keep saving 12%"
                : item.quantity === 2
                ? "Add 1 more item to keep saving 18%"
                : "Add 1 more unit to keep saving 18% bundle discount";

            return (
              <div
                key={`${item.variant.vid}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-5 shadow-xs transition hover:border-slate-300 space-y-3"
              >
                {/* Top Section: Thumbnail + Title, Variations & 20% Selling Price Display */}
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <Link
                    href={`/products/${item.product.slug}`}
                    prefetch={true}
                    className="w-14 h-14 sm:w-20 sm:h-20 min-w-[3.5rem] min-h-[3.5rem] sm:min-w-[5rem] sm:min-h-[5rem] rounded-lg sm:rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center flex-shrink-0 group block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImg}
                      alt={item.product.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                  </Link>

                  {/* Main Product Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.product.slug}`}
                        prefetch={true}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-2 leading-snug"
                      >
                        {item.product.title}
                      </Link>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            ${linePrices.discounted20LineTotal.toFixed(2)}
                          </span>
                          {linePrices.sellingLineTotal > linePrices.discounted20LineTotal && (
                            <span className="text-[11px] sm:text-xs text-slate-400 line-through">
                              ${linePrices.sellingLineTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {linePrices.sellingLineTotal > linePrices.discounted20LineTotal && (
                          <span className="inline-block mt-0.5 text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded-full uppercase tracking-tight">
                            Save 20%
                          </span>
                        )}
                      </div>
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
                      <span className="text-slate-500 font-medium">
                        {getUnitText(item.quantity, item.tier)}
                      </span>
                    </div>

                    {/* Quick-Select Bundle Tiers (Moved from PDP cleanly onto Cart) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {(
                        [
                          { tier: "1x" as const, qty: 1, label: "1x Standard" },
                          { tier: "2x" as const, qty: 2, label: "2x Pack • Save 12%" },
                          { tier: "3x" as const, qty: 3, label: "3x Bundle • Save 18%" },
                        ]
                      ).map((opt) => {
                        const isActive =
                          opt.tier === "3x"
                            ? item.quantity >= 3
                            : item.quantity === opt.qty;
                        const isDisabled = opt.qty > maxStock;
                        return (
                          <button
                            key={opt.tier}
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                              updateQuantity(
                                item.variant.vid,
                                item.tier,
                                opt.qty,
                                item.selectedSize,
                                item.selectedColor
                              )
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      {item.savings > 0 && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                          Bundle -${item.savings.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar: Quantity Stepper + Buy Now + Remove */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
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
                      className="w-8 h-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90 flex items-center justify-center cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1 text-xs font-black text-slate-900 bg-white min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= maxStock}
                      onClick={() =>
                        updateQuantity(
                          item.variant.vid,
                          item.tier,
                          item.quantity + 1,
                          item.selectedSize,
                          item.selectedColor
                        )
                      }
                      className="w-8 h-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition text-xs font-bold active:scale-90 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Actions: Buy Now + Remove */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBuyNow(item)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      title="Proceed to checkout with only this product"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white text-white" />
                      <span>Buy Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        removeItem(item.variant.vid, item.tier, item.selectedSize, item.selectedColor);
                        showToast("Item removed from cart", "cart-remove");
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 active:scale-95 cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Bundle Upsell Banner Below Each Cart Card */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] text-emerald-800 font-semibold">
                  <span>{upsellText}</span>
                  {item.quantity < maxStock && (
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
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2 py-0.5 rounded-md transition active:scale-95 flex-shrink-0 cursor-pointer"
                    >
                      + Add 1
                    </button>
                  )}
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
                <span>Selling Price:</span>
                <span className="font-semibold text-slate-900">${breakdown.sellingPriceTotal.toFixed(2)}</span>
              </div>
              {breakdown.sellingDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount on Selling Price (20%):</span>
                  <span>-${breakdown.sellingDiscount.toFixed(2)}</span>
                </div>
              )}
              {breakdown.bundleDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Bundle Discounts:</span>
                  <span>-${breakdown.bundleDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Domestic Shipping:</span>
                <span className="font-bold text-emerald-600">Free</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Sales Tax:</span>
                <span className="font-bold text-slate-900">$0.00</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Total Amount:</span>
              <span className="text-2xl font-black text-slate-900">
                ${breakdown.totalAmount.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              prefetch={true}
              className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 text-center"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>


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
