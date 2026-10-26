"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useCart } from "../../lib/cart";
import { FALLBACK_PRODUCTS } from "../../lib/api";
import { Truck, Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function CheckoutContent() {
  const { items, totalAmount, totalSavings, clearCart } = useCart();

  const [form, setForm] = useState({
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "213-555-0199",
    address1: "742 Evergreen Terrace",
    address2: "",
    city: "Los Angeles",
    province: "CA",
    zip_code: "90001",
    country_code: "US",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    amount: number;
    shippingSla: string;
  } | null>(null);

  // Fallback demo product if user accesses checkout directly without adding item
  const checkoutItems = items.length > 0 ? items : [
    {
      product: FALLBACK_PRODUCTS[0],
      variant: FALLBACK_PRODUCTS[0].variants[0],
      tier: "2x" as const,
      quantity: 2,
      unitPrice: 63.89,
      totalPrice: 127.78,
      savings: 17.44
    }
  ];

  const finalAmount = items.length > 0 ? totalAmount : 127.78;
  const finalSavings = items.length > 0 ? totalSavings : 17.44;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // US Zip validation matching FastAPI Pydantic schema
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(form.zip_code.trim())) {
      setErrorMessage("Please enter a valid 5-digit US postal code (e.g. 90001).");
      setIsSubmitting(false);
      return;
    }

    try {
      const orderId = `ORD-STORE-${Date.now().toString().slice(-6)}`;
      
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Persist order locally for instant tracking in /profile
      try {
        const orderRecord = {
          id: Date.now(),
          internal_order_number: orderId,
          customer_email: form.email.trim().toLowerCase(),
          status: "PAYMENT_CAPTURED",
          total_retail: finalAmount,
          carrier_name: "USPS",
          tracking_number: `94001118995625${Date.now().toString().slice(-8)}`,
          shipping_name: form.name,
          shipping_city: form.city,
          shipping_province: form.province,
          shipping_zip: form.zip_code,
          created_at: new Date().toISOString(),
          items: checkoutItems.map((item) => ({
            title: item.product.title,
            quantity: item.quantity,
            price: item.unitPrice,
            size: item.selectedSize,
          })),
        };

        const existingRaw = localStorage.getItem("customer_orders");
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem("customer_orders", JSON.stringify([orderRecord, ...existing]));
        localStorage.setItem("customer_email", form.email.trim().toLowerCase());
      } catch {
        // Storage write error ignored
      }

      setConfirmedOrder({
        orderNumber: orderId,
        amount: finalAmount,
        shippingSla: "3–5 Business Days (Tracked USPS)",
      });
      clearCart();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Checkout error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Order Confirmed!
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto">
          Thank you for your order. A receipt and USPS tracking updates have been sent to <strong>{form.email}</strong>.
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 text-left space-y-3 max-w-md mx-auto shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Order Number:</span>
            <span className="font-mono font-bold text-slate-900">{confirmedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Fulfillment Hub:</span>
            <span className="font-semibold text-emerald-700">US Domestic Dispatch</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Delivery:</span>
            <span className="font-semibold text-slate-900">{confirmedOrder.shippingSla}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
            <span>Total Paid:</span>
            <span>${confirmedOrder.amount.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-md mx-auto text-xs text-amber-900 space-y-1">
          <p className="font-bold">⚠️ Address Verification (30-Min Window):</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Shipping to: <strong>{form.address1}, {form.city}, {form.province} {form.zip_code}</strong>. If you made any typos, reply to your confirmation email immediately within 30 minutes before automated packaging begins.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition shadow-md active:scale-95"
          >
            Track Order in Profile →
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition active:scale-95">
        <ArrowLeft className="w-4 h-4" /> Continue Shopping
      </Link>

      {/* TOP: ORDER SUMMARY (Shown on top of address as requested) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">
            Order Summary ({checkoutItems.reduce((acc, i) => acc + i.quantity, 0)} Items)
          </h2>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Free Shipping
          </span>
        </div>

        <div className="space-y-3">
          {checkoutItems.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-center text-xs text-slate-800 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
              <Link
                href={`/products/${item.product.slug}`}
                prefetch={true}
                className="flex gap-3 items-center flex-1 min-w-0 group cursor-pointer"
              >
                {item.product.hero_image_url && (
                  <img
                    src={item.product.hero_image_url}
                    alt={item.product.title}
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0 bg-white group-hover:scale-105 transition-transform"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold line-clamp-1 group-hover:text-emerald-700 transition">
                    {item.product.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    {item.selectedSize && (
                      <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                        Size: {item.selectedSize}
                      </span>
                    )}
                    <span>Qty: {item.quantity}</span>
                    <span>•</span>
                    <span>${item.unitPrice.toFixed(2)}/ea</span>
                  </div>
                </div>
              </Link>
              <span className="font-black text-sm text-slate-900">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="text-emerald-700 font-bold">FREE ($0.00)</span>
          </div>
          {finalSavings > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Bundle Discount</span>
              <span>-${finalSavings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>${finalAmount.toFixed(2)} USD</span>
          </div>
        </div>
      </section>

      {/* BOTTOM: SHIPPING ADDRESS & PAYMENT FORM */}
      <form onSubmit={handlePlaceOrder} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-900">Shipping Address</h2>
          <p className="text-xs text-slate-500 mt-0.5">Enter your US delivery address for tracked postal delivery.</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3.5 text-xs font-semibold text-slate-700">
          <div>
            <label className="block mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block mb-1">Email (for Tracking)</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Street Address</label>
            <input
              type="text"
              name="address1"
              required
              value={form.address1}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1">City</label>
              <input
                type="text"
                name="city"
                required
                value={form.city}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1">State</label>
              <input
                type="text"
                name="province"
                required
                value={form.province}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-sm"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block mb-1">ZIP Code</label>
              <input
                type="text"
                name="zip_code"
                required
                value={form.zip_code}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Payment Method
            </span>
            <span className="text-[11px] text-slate-400">Instant Test Card</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
            <span className="font-medium">💳 Card / Apple Pay Simulation</span>
            <span className="font-mono text-emerald-700 font-bold text-[11px]">ACTIVE</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition text-sm disabled:opacity-50 active:scale-98"
        >
          {isSubmitting ? "Processing Order..." : `Complete Order • $${finalAmount.toFixed(2)}`}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          <span>Ships in 24 hours via tracked USPS</span>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
