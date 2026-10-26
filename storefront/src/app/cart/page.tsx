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
  ShieldCheck,
  Truck,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

// ── Delivery & Order Questions Accordion with smooth Google-style transition ─
function CartFaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "How fast will my order arrive?",
      a: "Orders ship within 24 hours from verified domestic distribution centers (Monday through Friday). Delivery takes 3 to 5 business days with tracked updates provided via USPS Ground Advantage.",
    },
    {
      q: "What if my item arrives broken or damaged?",
      a: "We guarantee that every product arrives in 100% working condition. If an item is damaged or broken during transit, do not return it. Simply email support@domesticlab.com with 1 photo within 7 days of delivery and our team will dispatch an immediate free replacement.",
    },
    {
      q: "Can I update my shipping address after ordering?",
      a: "Orders enter warehouse fulfillment within 30 minutes. If you made an address typo, email support@domesticlab.com immediately with the subject line 'URGENT ADDRESS CORRECTION'. If the shipping label has not yet printed, we will update it immediately.",
    },
    {
      q: "What will appear on my credit card statement?",
      a: "All charges will appear under the verified merchant descriptor DOMESTICLAB on your bank or credit card statement.",
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
        Frequently Asked Questions
      </h3>

      <div className="divide-y divide-slate-100 text-xs">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="py-2.5 first:pt-1 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between text-left font-bold text-slate-800 hover:text-emerald-700 transition"
                aria-expanded={isOpen}
              >
                <span className="text-[11px] sm:text-xs pr-2">{faq.q}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                    isOpen ? "rotate-180 text-emerald-600" : ""
                  }`}
                />
              </button>
              {/* Google-Style smooth CSS Grid transition */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, totalSavings } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 pb-20 md:pb-6 space-y-4">
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
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const heroImg =
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";

            return (
              <div
                key={`${item.variant.vid}-${item.tier}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3.5 sm:items-center justify-between transition hover:border-slate-300"
              >
                <div className="flex items-center gap-3.5">
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
                      className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-50 border border-slate-100 group-hover:scale-105 transition-transform"
                    />
                  </Link>

                  <div className="space-y-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      prefetch={true}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-2 leading-snug"
                    >
                      {item.product.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
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
                    </div>

                    <div className="text-[11px] text-slate-400">
                      ${item.unitPrice.toFixed(2)} / unit
                    </div>

                    {/* Interactive Quantity Adjuster */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] font-semibold text-slate-500">Qty:</span>
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
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-1.5">
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-slate-900">
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
            );
          })}
        </div>

        {/* Right Column: Order Summary -> Damage-Free Guarantee -> FAQs (Placed strictly below damage guarantee!) */}
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

            {/* Reassurance Micro-List */}
            <div className="pt-2 space-y-1.5 text-[10px] text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Tracked 3–5 Business Day Delivery</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Charges will appear as <strong>DOMESTICLAB</strong> on your statement.
              </p>
            </div>
          </div>

          {/* Damage-Free Delivery Guarantee Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Damage-Free Delivery Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every package is thoroughly inspected. If an item arrives damaged or broken during transit,
              email us with 1 photo within 7 days of delivery and our support team will dispatch an
              immediate free replacement at zero extra charge.
            </p>
          </div>

          {/* Frequently Asked Questions Accordion: Exactly Below the Damage Guarantee Card */}
          <CartFaqAccordion />
        </div>
      </div>
    </div>
  );
}
