"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  ExternalLink,
  HelpCircle,
  Clock,
  CheckCircle2,
  Mail,
  ChevronDown,
  User,
  LogOut,
  ArrowRight,
  ShieldCheck,
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

export default function ProfilePage() {
  const [emailInput, setEmailInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check saved session on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("customer_auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email) {
          setUserEmail(parsed.email);
          fetchOrders(parsed.email);
          return;
        }
      }
      const savedEmail = localStorage.getItem("customer_email");
      if (savedEmail) {
        setUserEmail(savedEmail);
        fetchOrders(savedEmail);
      }
    } catch {
      // Storage read error ignored
    }
  }, []);

  const fetchOrders = async (lookupEmail: string) => {
    if (!lookupEmail.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch from remote backend API
      const remoteOrders = await getCustomerOrders(lookupEmail);

      // 2. Fetch locally stored demo orders (e.g. from checkout simulation)
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

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      localStorage.setItem("customer_auth_user", JSON.stringify({ email: clean }));
      localStorage.setItem("customer_email", clean);
    } catch {
      // Ignore
    }

    setUserEmail(clean);
    fetchOrders(clean);
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem("customer_auth_user");
    } catch {
      // Ignore
    }
    setUserEmail(null);
    setOrders([]);
    setEmailInput("");
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
    if (s.includes("TRANSIT") || s.includes("DISPATCH") || s.includes("CREATED") || s.includes("CAPTURED")) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 pb-16 md:pb-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            My Orders & Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View real-time delivery status, USPS tracking numbers, and past order receipts.
          </p>
        </div>

        {userEmail && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition px-2.5 py-1 rounded-lg hover:bg-slate-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* STATE 1: User Not Signed In -> Show Sign In Form */}
      {!userEmail ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Sign In to View Orders
            </h2>
            <p className="text-xs text-slate-500">
              Enter the email address used during checkout to access your tracking details and order receipts.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. jane.smith@example.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
            </div>

            {errorMessage && (
              <p className="text-xs font-medium text-rose-600">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Signing In..." : "Sign In with Email"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* STATE 2: User Signed In -> Show Orders History */
        <div className="space-y-4">
          {/* Account Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-500 block text-[10px]">Signed in as:</span>
                <span className="font-bold text-slate-900">{userEmail}</span>
              </div>
            </div>
            <button
              onClick={() => fetchOrders(userEmail)}
              disabled={isLoading}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                We couldn&apos;t find any orders placed under <strong>{userEmail}</strong>.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm"
                >
                  Browse Catalog
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {orders.map((order) => {
                const trackingUrl = order.tracking_number
                  ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`
                  : null;

                return (
                  <div
                    key={order.internal_order_number}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {order.internal_order_number}
                          </span>
                          {renderStatusBadge(order.status)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on{" "}
                          {new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Total Retail</span>
                        <span className="font-black text-slate-900 text-base">
                          ${(order.total_retail || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Tracking details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">USPS Tracking:</span>
                        {order.tracking_number ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-900 block truncate">
                              {order.tracking_number}
                            </span>
                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                              >
                                <span>Track on USPS.com</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Label creating at warehouse</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Destination:</span>
                        <span className="font-semibold text-slate-900 block">
                          {order.shipping_name || "Domestic Customer"}
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
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-0.5 text-slate-700"
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
      )}

      {/* Accurate Delivery & Order Questions (Zero mock or unconfigured assumptions) */}
      <div className="border border-slate-200/90 bg-white rounded-2xl p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          Delivery & Order Questions
        </h3>
        <div className="divide-y divide-slate-100">
          <FaqItem
            question="How long does domestic shipping and fulfillment take?"
            answer="Orders are packed and dispatched from verified US domestic warehouses within 1 to 2 business days (Monday through Friday). Standard domestic delivery via USPS Ground Advantage takes 3 to 5 business days within the contiguous United States."
          />
          <FaqItem
            question="How do I track my order?"
            answer="As soon as the warehouse packs your parcel, a USPS tracking barcode is generated. You can view your real-time tracking number directly on this page or enter it on USPS.com for detailed transit milestone updates."
          />
          <FaqItem
            question="Can I change my delivery address after placing an order?"
            answer="Address modifications can only be accommodated before warehouse processing and label generation commence. Please ensure all apartment, suite, and ZIP code details are accurate during checkout."
          />
          <FaqItem
            question="Can I cancel an order?"
            answer="Cancellations can only be requested before warehouse fulfillment begins. Once the warehouse creates the shipping label and parcels the goods, the shipment cannot be intercepted in transit."
          />
          <FaqItem
            question="What should I do if my tracking status has not updated?"
            answer="USPS scans typically take 24 to 48 hours to register after the parcel leaves the distribution center. If your tracking has not updated after 5 business days, please check with your local postal carrier."
          />
        </div>
      </div>
    </div>
  );
}
