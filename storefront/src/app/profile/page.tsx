"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Truck,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  ChevronDown,
} from "lucide-react";
import { getCustomerOrders } from "../../lib/api";
import { CustomerOrder } from "../../lib/types";

// ── FAQ Accordion Item with smooth Google-style transition ───────────────────
function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-left group"
        aria-expanded={open}
      >
        <span className="text-xs font-bold text-slate-900 pr-4 group-hover:text-emerald-700 transition">
          {question}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 mb-2.5" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden text-xs text-slate-500 leading-relaxed pr-2">
          {answer}
        </div>
      </div>
    </div>
  );
}

// ── Damaged Package Collapsible Card with smooth transition ──────────────────
function DamagedPackageCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${open ? "bg-slate-900 border-transparent shadow-md" : "bg-white border-slate-200"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 sm:p-4 text-left"
        aria-expanded={open}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${open ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-rose-50 border border-rose-200"}`}>
          <ShieldAlert className={`w-4 h-4 ${open ? "text-emerald-400" : "text-rose-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-xs sm:text-sm font-bold ${open ? "text-white" : "text-slate-900"}`}>
            Package Arrived Damaged or Defective?
          </h3>
          <p className={`text-[11px] mt-0.5 ${open ? "text-slate-400" : "text-slate-500"}`}>
            {open ? "Zero-friction domestic replacement protocol" : "Tap to see our replacement guarantee →"}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-emerald-400" : "text-slate-400"}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden px-4 sm:px-5 pb-4">
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            We guarantee that every product arrives in 100% working order. If your package was
            damaged by the carrier during transit, <strong>do not return it</strong>. Email our
            domestic support team at{" "}
            <a
              href="mailto:support@domesticlab.com?subject=Damaged%20Item%20Replacement%20Request"
              className="text-emerald-400 underline font-semibold"
            >
              support@domesticlab.com
            </a>{" "}
            with your <strong>Order Number</strong> and <strong>1 clear photo</strong> of the
            damage within 7 days of delivery. We will dispatch an immediate replacement to your door
            at zero cost.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-populate email from localStorage if user completed a checkout
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("customer_email");
      if (savedEmail) {
        setEmail(savedEmail);
        fetchOrders(savedEmail);
      } else {
        const localOrdersRaw = localStorage.getItem("customer_orders");
        if (localOrdersRaw) {
          const parsed = JSON.parse(localOrdersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
            if (parsed[0].customer_email) {
              setEmail(parsed[0].customer_email);
            }
          }
        }
      }
    } catch {
      // Local storage read error ignored
    }
  }, []);

  const fetchOrders = async (lookupEmail: string) => {
    if (!lookupEmail.trim()) {
      setErrorMessage("Please enter the email address used at checkout.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const remoteOrders = await getCustomerOrders(lookupEmail.trim());

      let localOrders: CustomerOrder[] = [];
      try {
        const localRaw = localStorage.getItem("customer_orders");
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            localOrders = parsed.filter(
              (o) =>
                (o.customer_email || "").toLowerCase() ===
                lookupEmail.trim().toLowerCase()
            );
          }
        }
      } catch {
        // Ignore local parse errors
      }

      const orderMap = new Map<string, CustomerOrder>();
      localOrders.forEach((o) => orderMap.set(o.internal_order_number, o));
      remoteOrders.forEach((o) => orderMap.set(o.internal_order_number, o));

      const merged = Array.from(orderMap.values()).sort(
        (a, b) =>
          new Date(b.created_at || Date.now()).getTime() -
          new Date(a.created_at || Date.now()).getTime()
      );

      setOrders(merged);
    } catch {
      setErrorMessage("Unable to retrieve order history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(email);
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s.includes("DELIVERED")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Delivered
        </span>
      );
    }
    if (s.includes("TRANSIT") || s.includes("DISPATCH") || s.includes("CREATED")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <Truck className="w-3.5 h-3.5" />
          In Transit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        Processing at Warehouse
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 pb-20 md:pb-6 space-y-4">
      {/* Page Header */}
      <div className="text-center sm:text-left space-y-1 border-b border-slate-200 pb-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center sm:justify-start gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          My Orders & Package Tracking
        </h1>
        <p className="text-xs text-slate-500 max-w-xl">
          Enter your checkout email to view real-time delivery status, USPS tracking numbers, and past order receipts.
        </p>
      </div>

      {/* Email Lookup Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Lookup Orders by Customer Email:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jane.smith@example.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? "Searching…" : "Track Orders"}</span>
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Orders List Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center justify-between">
          <span>Order History</span>
          {orders.length > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          )}
        </h2>

        {orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {hasSearched ? "No Orders Found for This Email" : "No Recent Orders Displayed"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {hasSearched
                ? "Double-check your email spelling or contact our support team."
                : "Enter your checkout email above to load your past purchases and live tracking codes."}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const trackingUrl = order.tracking_number
                ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`
                : null;

              return (
                <div
                  key={order.internal_order_number}
                  className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition hover:border-slate-300"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {order.internal_order_number}
                        </span>
                        {renderStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Placed on{" "}
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString()
                          : "Recent"}{" "}
                        • Total Paid: ${order.total_retail?.toFixed(2) || "0.00"} USD
                      </p>
                    </div>

                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition self-start sm:self-auto"
                      >
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span>USPS: {order.tracking_number}</span>
                        <ExternalLink className="w-3 h-3 text-emerald-600" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                        Tracking assigned within 24h
                      </span>
                    )}
                  </div>

                  {/* Destination Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Shipping To:</span>
                      <span className="font-semibold text-slate-900">
                        {order.shipping_name || "Customer"}
                      </span>
                      <span className="block text-slate-500">
                        {order.shipping_city}, {order.shipping_province || "US"}{" "}
                        {order.shipping_zip}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Carrier & Service:</span>
                      <span className="font-semibold text-slate-900">
                        {order.carrier_name || "USPS Tracked Domestic Ground"}
                      </span>
                      <span className="block text-emerald-700 font-medium">
                        3–5 Business Day Transit
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  {order.items && order.items.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Items in this Shipment:
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 text-slate-700"
                          >
                            <span className="font-medium line-clamp-1">
                              {item.quantity || 1}x {item.title || "Curated Domestic Item"}
                            </span>
                            <span className="font-bold text-slate-900 ml-4">
                              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible Damaged Package Card */}
      <DamagedPackageCard />

      {/* FAQ Accordion */}
      <div className="border border-slate-200/90 bg-white rounded-2xl p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          Delivery & Order Questions
        </h3>
        <div className="divide-y divide-slate-100">
          <FaqItem
            question="How long does shipping take?"
            answer="All items are dispatched from verified US warehouses within 24 hours (Monday through Friday). Standard domestic delivery takes 3 to 5 business days with tracked updates provided by USPS Ground Advantage."
          />
          <FaqItem
            question="Can I update my shipping address after ordering?"
            answer={
              <>
                Orders enter automated warehouse packing within 30 minutes. If you made a typo, contact{" "}
                <a
                  href="mailto:support@domesticlab.com"
                  className="text-emerald-600 underline font-semibold"
                >
                  support@domesticlab.com
                </a>{" "}
                immediately with the subject line <strong>&quot;URGENT ADDRESS CORRECTION&quot;</strong>. If the shipping label has not yet printed, we will update it immediately.
              </>
            }
          />
          <FaqItem
            question="What will appear on my credit card statement?"
            answer={
              <>
                Your bank statement will show the verified charge descriptor as{" "}
                <strong>DOMESTICLAB</strong>.
              </>
            }
          />
          <FaqItem
            question="Can I cancel my order?"
            answer="Orders can be cancelled within 30 minutes of placement before warehouse processing. Contact support@domesticlab.com immediately with your Order Number for a prompt full refund."
          />
          <FaqItem
            question="Do you offer free returns?"
            answer="Damaged or defective items are covered 100% with free replacements without needing to return the broken item. For unused products in original packaging, contact support within 7 days of delivery."
          />
        </div>
      </div>
    </div>
  );
}
