"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  ChevronDown,
  ShoppingBag,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import { auth, loginWithGoogle, logoutUser, FirebaseUser } from "@/lib/firebase";

interface AdminOrderItem {
  product_title?: string;
  title?: string;
  pid?: string;
  slug?: string;
  image_url?: string;
  size?: string;
  color?: string;
  quantity?: number;
  price?: number;
}

interface AdminOrder {
  id: number;
  internal_order_number: string;
  cj_order_id: string | null;
  customer_email: string;
  customer_phone: string;
  status: string;
  total_retail: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_zip: string;
  shipping_country: string;
  carrier_name: string;
  tracking_number: string | null;
  items: AdminOrderItem[];
  created_at: string;
  grace_period_remaining_seconds: number;
  is_grace_active: boolean;
}

export default function AdminOrdersPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "ready" | "grace" | "processing" | "shipped">("ready");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingCj, setSyncingCj] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Edit / Fulfillment state per order
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [cjOrderIdInput, setCjOrderIdInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    if (!currentUser?.email) return;
    setLoadingOrders(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/admin/orders", {
        headers: {
          "x-admin-email": currentUser.email,
        },
      });

      if (res.status === 403) {
        setIsAuthorized(false);
        setOrders([]);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load orders");
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setIsAuthorized(true);
    } catch (err: any) {
      console.error("Admin order fetch error:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.email) {
      fetchOrders();
    }
  }, [currentUser, fetchOrders]);

  // Live grace countdown ticker (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.grace_period_remaining_seconds > 0) {
            const nextSec = order.grace_period_remaining_seconds - 1;
            return {
              ...order,
              grace_period_remaining_seconds: nextSec,
              is_grace_active: nextSec > 0 && (order.status === "ORDER_PLACED" || order.status === "PAYMENT_CAPTURED"),
            };
          }
          return order;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyAddress = (order: AdminOrder) => {
    const text = [
      `Name: ${order.shipping_name}`,
      `Address: ${order.shipping_address}`,
      `City: ${order.shipping_city}`,
      `State: ${order.shipping_province}`,
      `ZIP: ${order.shipping_zip}`,
      `Country: ${order.shipping_country || "United States"}`,
      `Phone: ${order.customer_phone || "N/A"}`,
      `Email: ${order.customer_email}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(order.internal_order_number);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveFulfillment = async (orderNumber: string) => {
    if (!currentUser?.email) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": currentUser.email,
        },
        body: JSON.stringify({
          internal_order_number: orderNumber,
          cj_order_id: cjOrderIdInput || undefined,
          tracking_number: trackingInput || undefined,
          status: statusInput || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }

      setEditingOrder(null);
      await fetchOrders();
    } catch (err: any) {
      alert("Error saving order: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncCjTracking = async () => {
    if (!currentUser?.email) return;
    setSyncingCj(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/admin/sync-cj", {
        method: "POST",
        headers: {
          "x-admin-email": currentUser.email,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setSyncResult(
          `Sync complete: Checked ${data.checked || 0} order(s), successfully updated ${data.synced || 0} with CJ tracking.`
        );
        await fetchOrders();
      } else {
        setSyncResult(`Sync notice: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setSyncResult("Error syncing tracking: " + err.message);
    } finally {
      setSyncingCj(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Search match
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.internal_order_number.toLowerCase().includes(q) ||
      (order.cj_order_id || "").toLowerCase().includes(q) ||
      order.customer_email.toLowerCase().includes(q) ||
      order.shipping_name.toLowerCase().includes(q) ||
      (order.tracking_number || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Tab filter
    if (selectedTab === "ready") {
      return !order.is_grace_active && !order.cj_order_id && order.status !== "CANCELLED";
    }
    if (selectedTab === "grace") {
      return order.is_grace_active;
    }
    if (selectedTab === "processing") {
      return order.status === "SUPPLIER_PROCESSING" || (order.cj_order_id && !order.tracking_number);
    }
    if (selectedTab === "shipped") {
      return order.status === "SHIPPED" || !!order.tracking_number;
    }

    return true;
  });

  // Top summary counters
  const counts = {
    ready: orders.filter((o) => !o.is_grace_active && !o.cj_order_id && o.status !== "CANCELLED").length,
    grace: orders.filter((o) => o.is_grace_active).length,
    processing: orders.filter((o) => o.status === "SUPPLIER_PROCESSING" || (o.cj_order_id && !o.tracking_number)).length,
    shipped: orders.filter((o) => o.status === "SHIPPED" || !!o.tracking_number).length,
    all: orders.length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Verifying administrator access...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Domestic Lab Admin</h1>
            <p className="text-xs text-slate-400 mt-1">
              Please sign in with your authorized administrator Google account to access fulfillment operations.
            </p>
          </div>
          <button
            onClick={() => loginWithGoogle()}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Signed in but unauthorized
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/60 rounded-2xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">403 Access Denied</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Your Google account (<span className="text-slate-200 font-mono">{currentUser.email}</span>) is not on the authorized administrator whitelist.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => logoutUser()}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* ── HEADER ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
              title="Return to Store"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Fulfillment Command Center</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  Admin
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Connected: <span className="text-slate-300 font-mono">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCjTracking}
              disabled={syncingCj}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncingCj ? "animate-spin" : ""}`} />
              <span>{syncingCj ? "Syncing CJ..." : "Sync CJ Tracking"}</span>
            </button>

            <button
              onClick={() => logoutUser()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── SYNC NOTICE BANNER ── */}
      {syncResult && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <span>{syncResult}</span>
            <button onClick={() => setSyncResult(null)} className="text-emerald-400 hover:text-white">
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── METRICS & FILTER TABS ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setSelectedTab("ready")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedTab === "ready"
                ? "bg-emerald-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>🚀 Ready to Fulfill</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-200 border border-emerald-700">
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab("grace")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedTab === "grace"
                ? "bg-amber-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>⏳ In Grace Period</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-200 border border-amber-700">
              {counts.grace}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab("processing")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedTab === "processing"
                ? "bg-sky-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>📦 Awaiting CJ Tracking</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-200 border border-sky-700">
              {counts.processing}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab("shipped")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedTab === "shipped"
                ? "bg-slate-700 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>🚚 Dispatched</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {counts.shipped}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedTab === "all"
                ? "bg-slate-700 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>All Orders ({counts.all})</span>
          </button>

          {/* Search Box */}
          <div className="ml-auto w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search order, email, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* ── ORDERS LIST ── */}
        {loadingOrders ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading order records from Neon DB...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No orders match this filter.</p>
            <p className="text-xs text-slate-500">All customer orders in this category are fully up to date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const minutesLeft = Math.floor(order.grace_period_remaining_seconds / 60);
              const secondsLeft = order.grace_period_remaining_seconds % 60;
              const isEditing = editingOrder === order.internal_order_number;

              return (
                <div
                  key={order.internal_order_number}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                >
                  {/* Row 1: Header & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-white">
                          {order.internal_order_number}
                        </span>

                        {/* Grace Status Badge */}
                        {order.is_grace_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Grace Active: {minutesLeft}m {secondsLeft}s (Hold fulfillment)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Grace Expired · Ready for CJ
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                          Status: {order.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        Placed:{" "}
                        {new Date(order.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · Total: <span className="font-bold text-emerald-400">${order.total_retail.toFixed(2)}</span>
                      </p>
                    </div>

                    {/* Action: Copy Address Button */}
                    <button
                      onClick={() => handleCopyAddress(order)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                        copiedId === order.internal_order_number
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      }`}
                    >
                      {copiedId === order.internal_order_number ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied for CJ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Shipping Address</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Row 2: Customer Address Card & Products */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Destination Box */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Customer & Delivery Info:
                      </span>
                      <p className="font-bold text-slate-200">{order.shipping_name}</p>
                      <p className="text-slate-400">{order.shipping_address}</p>
                      <p className="text-slate-400">
                        {order.shipping_city}, {order.shipping_province} {order.shipping_zip} ({order.shipping_country})
                      </p>
                      <p className="text-slate-500 font-mono text-[11px] pt-1">
                        Email: {order.customer_email} {order.customer_phone ? `· Phone: ${order.customer_phone}` : ""}
                      </p>
                    </div>

                    {/* CJ & Logistics Info Box */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Supplier & Fulfillment Details:
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingOrder(order.internal_order_number);
                              setCjOrderIdInput(order.cj_order_id || "");
                              setTrackingInput(order.tracking_number || "");
                              setStatusInput(order.status || "CONFIRMED");
                            }}
                            className="text-[11px] font-bold text-emerald-400 hover:underline"
                          >
                            Edit Fulfillment
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">CJ Order ID</label>
                            <input
                              type="text"
                              placeholder="e.g. CJ1793284029"
                              value={cjOrderIdInput}
                              onChange={(e) => setCjOrderIdInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Tracking Number (USPS)</label>
                            <input
                              type="text"
                              placeholder="e.g. 9400..."
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Status</label>
                            <select
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              <option value="ORDER_PLACED">ORDER_PLACED (Grace active)</option>
                              <option value="CONFIRMED">CONFIRMED (Ready to order on CJ)</option>
                              <option value="SUPPLIER_PROCESSING">SUPPLIER_PROCESSING (Paid on CJ)</option>
                              <option value="SHIPPED">SHIPPED (Tracking available)</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED (Refunded)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleSaveFulfillment(order.internal_order_number)}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                              {isSubmitting ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingOrder(null)}
                              className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-slate-300">
                            CJ Order ID:{" "}
                            {order.cj_order_id ? (
                              <span className="font-mono font-bold text-emerald-400">{order.cj_order_id}</span>
                            ) : (
                              <span className="text-slate-500 italic">Not placed on CJ yet</span>
                            )}
                          </p>

                          <p className="text-slate-300">
                            USPS Tracking:{" "}
                            {order.tracking_number ? (
                              <a
                                href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{order.tracking_number}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">Pending warehouse dispatch</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Items Ordered with direct CJ Product links */}
                  <div className="border-t border-slate-800/80 pt-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Ordered Products ({order.items?.length || 0}) — Direct Supplier Link:
                    </span>
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => {
                        const title = item.product_title || item.title || "Product";
                        // Construct direct link to CJ Dropshipping product or search
                        const cjUrl = item.pid
                          ? `https://cjdropshipping.com/product/details?id=${item.pid}`
                          : `https://cjdropshipping.com/search/${encodeURIComponent(title)}.html`;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {item.image_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.image_url}
                                  alt={title}
                                  className="w-10 h-10 object-contain rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600">
                                  <ShoppingBag className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                                  {title}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span>Qty: {item.quantity || 1}</span>
                                  {item.size && <span>· Size: {item.size}</span>}
                                  {item.color && <span>· Color: {item.color}</span>}
                                  {item.price ? <span>· ${Number(item.price).toFixed(2)}</span> : null}
                                </div>
                              </div>
                            </div>

                            {/* Direct CJ Link Button */}
                            <a
                              href={cjUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                            >
                              <span>Open on CJ Dropshipping</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
