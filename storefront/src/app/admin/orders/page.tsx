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
  MapPin,
  Calendar,
  DollarSign,
  User,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { auth, loginWithGoogle, logoutUser, FirebaseUser } from "@/lib/firebase";

interface AdminOrderItem {
  product_title?: string;
  title?: string;
  pid?: string;
  sku?: string;
  vid?: string;
  variant_title?: string;
  variant_sku?: string;
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
  total_wholesale: number;
  net_profit: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_county?: string;
  shipping_zip: string;
  shipping_country: string;
  carrier_name: string;
  tracking_number: string | null;
  fulfillment_status?: string;
  fulfillment_error?: string | null;
  dlq_retry_count?: number;
  items: AdminOrderItem[];
  created_at: string;
  grace_period_remaining_seconds: number;
  is_grace_active: boolean;
}

export default function AdminOrdersPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [denyReason, setDenyReason] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"ready" | "grace" | "processing" | "shipped" | "dlq" | "all">("ready");
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncingCj, setSyncingCj] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // CJ Instant Single-Order Sync State
  const [orderSyncInputs, setOrderSyncInputs] = useState<Record<string, string>>({});
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [orderSyncNotices, setOrderSyncNotices] = useState<
    Record<string, { type: "success" | "info" | "error"; message: string }>
  >({});

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
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        setDenyReason(errData?.reason || null);
        setIsAuthorized(false);
        setOrders([]);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load orders");
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setDenyReason(null);
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

  const handleCopySingle = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAddress = (order: AdminOrder) => {
    // Formatted 1:1 matching CJ Dropshipping "Add Address" modal
    const text = [
      `Country/Region: ${order.shipping_country || "United States"}`,
      `Province: ${order.shipping_province}`,
      `City: ${order.shipping_city}`,
      `County: ${order.shipping_county || ""}`,
      `Phone Number: ${order.customer_phone || ""}`,
      `Postcode: ${order.shipping_zip}`,
      `Email: ${order.customer_email}`,
      `Consignee ID: ${order.shipping_name}`,
      `Street Address: ${order.shipping_address}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(order.internal_order_number);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveFulfillment = async (orderNumber: string) => {
    if (!currentUser?.email) return;
    setIsSubmitting(true);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/sync-cj", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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

  const handleSyncSingleOrder = async (orderNumber: string) => {
    if (!currentUser?.email) return;
    const existingOrder = orders.find((o) => o.internal_order_number === orderNumber);
    const inputVal = orderSyncInputs[orderNumber]?.trim();
    const cjIdToUse = inputVal !== undefined && inputVal !== "" ? inputVal : existingOrder?.cj_order_id || "";

    if (!cjIdToUse) {
      setOrderSyncNotices((prev) => ({
        ...prev,
        [orderNumber]: {
          type: "error",
          message: "Please enter or paste a CJ Order ID (e.g. SD261025... or 261025...) before syncing.",
        },
      }));
      return;
    }

    setSyncingOrderId(orderNumber);
    setOrderSyncNotices((prev) => {
      const next = { ...prev };
      delete next[orderNumber];
      return next;
    });

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/sync-cj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internal_order_number: orderNumber,
          cj_order_id: cjIdToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to sync with CJ");
      }

      // Immediately update local orders state
      setOrders((prev) =>
        prev.map((o) => {
          if (o.internal_order_number === orderNumber) {
            return {
              ...o,
              cj_order_id: data.order?.cj_order_id || cjIdToUse,
              status: data.order?.status || (o.status === "ORDER_PLACED" ? "SUPPLIER_PROCESSING" : o.status),
              tracking_number: data.order?.tracking_number || o.tracking_number,
              carrier_name: data.order?.carrier_name || o.carrier_name || "USPS",
              is_grace_active: false,
            };
          }
          return o;
        })
      );

      setOrderSyncNotices((prev) => ({
        ...prev,
        [orderNumber]: {
          type: data.has_tracking ? "success" : "info",
          message: data.message || "Order updated and synced with CJ successfully.",
        },
      }));
    } catch (err: any) {
      setOrderSyncNotices((prev) => ({
        ...prev,
        [orderNumber]: {
          type: "error",
          message: err.message || "Failed to sync order with CJ.",
        },
      }));
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleRetryFulfillment = async (orderNumber: string) => {
    if (!currentUser) return;
    setRetryingOrderId(orderNumber);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/orders/retry-fulfillment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ internal_order_number: orderNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Order fulfillment pushed to CJ successfully!");
        await fetchOrders();
      } else {
        alert("Fulfillment notice: " + (data.message || data.error || "Retry failed"));
        await fetchOrders();
      }
    } catch (err: any) {
      alert("Error retrying fulfillment: " + err.message);
    } finally {
      setRetryingOrderId(null);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.internal_order_number.toLowerCase().includes(q) ||
      (order.cj_order_id || "").toLowerCase().includes(q) ||
      order.customer_email.toLowerCase().includes(q) ||
      order.shipping_name.toLowerCase().includes(q) ||
      (order.tracking_number || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedTab === "ready") {
      return !order.is_grace_active && !order.cj_order_id && order.status !== "CANCELLED" && order.fulfillment_status !== "FULFILLMENT_FAILED";
    }
    if (selectedTab === "grace") {
      return order.is_grace_active && !order.cj_order_id && order.status !== "CANCELLED";
    }
    if (selectedTab === "processing") {
      return !!order.cj_order_id && !order.tracking_number && order.status !== "CANCELLED";
    }
    if (selectedTab === "shipped") {
      return !!order.cj_order_id && !!order.tracking_number && order.status !== "CANCELLED";
    }
    if (selectedTab === "dlq") {
      return (order.fulfillment_status === "FULFILLMENT_FAILED" || order.status === "FULFILLMENT_FAILED") && !order.cj_order_id;
    }

    return true;
  });

  // Top summary counters
  const counts = {
    ready: orders.filter((o) => !o.is_grace_active && !o.cj_order_id && o.status !== "CANCELLED" && o.fulfillment_status !== "FULFILLMENT_FAILED").length,
    grace: orders.filter((o) => o.is_grace_active && !o.cj_order_id && o.status !== "CANCELLED").length,
    processing: orders.filter((o) => !!o.cj_order_id && !o.tracking_number && o.status !== "CANCELLED").length,
    shipped: orders.filter((o) => !!o.cj_order_id && !!o.tracking_number && o.status !== "CANCELLED").length,
    dlq: orders.filter((o) => (o.fulfillment_status === "FULFILLMENT_FAILED" || o.status === "FULFILLMENT_FAILED") && !o.cj_order_id).length,
    all: orders.length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-700">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Fulfillment Command Center</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sign in with your authorized store administrator account to manage customer orders and supplier fulfillment.
            </p>
          </div>
          <button
            onClick={() => loginWithGoogle()}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign in with Google</span>
          </button>
          <Link
            href="/"
            className="inline-block text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
          >
            ← Return to storefront
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but unauthorized
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-extrabold text-slate-900">Access Restricted</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {denyReason === "ADMIN_EMAILS_NOT_CONFIGURED" ? (
                <>
                  No <span className="text-slate-800 font-mono font-semibold">ADMIN_EMAILS</span> whitelist is active in Vercel Production environment variables. Add your email and redeploy.
                </>
              ) : denyReason === "FIREBASE_AUTH_FAILED" ? (
                <>
                  Unable to verify Google session token for <span className="text-slate-800 font-mono font-semibold">{currentUser.email}</span>. Try signing out and signing back in.
                </>
              ) : (
                <>
                  Your Google account (<span className="text-slate-800 font-mono font-semibold">{currentUser.email}</span>) is not on the administrator whitelist.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => logoutUser()}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Sign Out
            </button>
            <Link
              href="/"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans pb-24 antialiased">
      {/* ── TOP NAV HEADER ── */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition flex-shrink-0"
              title="Return to Store"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Orders & Fulfillment
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Manual Pay Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Admin: <span className="text-slate-700 font-medium">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCjTracking}
              disabled={syncingCj}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs hover:border-slate-300 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncingCj ? "animate-spin" : ""}`} />
              <span>{syncingCj ? "Syncing CJ..." : "Sync CJ Tracking"}</span>
            </button>

            <button
              onClick={() => logoutUser()}
              className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition shadow-2xs cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── SYNC NOTICE BANNER ── */}
      {syncResult && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 animate-in fade-in">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
            <span>{syncResult}</span>
            <button
              onClick={() => setSyncResult(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold px-1.5 cursor-pointer text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-5">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Ready to Fulfill */}
          <div
            onClick={() => setSelectedTab("ready")}
            className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer ${
              selectedTab === "ready"
                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
              <span>Ready to Order</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.ready}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Grace period expired</p>
          </div>

          {/* Card 2: In Grace Period */}
          <div
            onClick={() => setSelectedTab("grace")}
            className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer ${
              selectedTab === "grace"
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
              <span>In Grace Period</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.grace}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Hold fulfillment</p>
          </div>

          {/* Card 3: Awaiting Tracking */}
          <div
            onClick={() => setSelectedTab("processing")}
            className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer ${
              selectedTab === "processing"
                ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-sky-700 mb-1">
              <span>Ordered on CJ</span>
              <Package className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.processing}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting USPS label</p>
          </div>

          {/* Card 4: Dispatched */}
          <div
            onClick={() => setSelectedTab("shipped")}
            className={`p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer ${
              selectedTab === "shipped"
                ? "bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Dispatched</span>
              <Truck className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts.shipped}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Tracking live</p>
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedTab("ready")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedTab === "ready"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Ready to Order ({counts.ready})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("grace")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedTab === "grace"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>In Grace ({counts.grace})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("processing")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedTab === "processing"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Ordered on CJ ({counts.processing})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("shipped")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedTab === "shipped"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Dispatched ({counts.shipped})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("dlq")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1 ${
                selectedTab === "dlq"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>DLQ / Failed ({counts.dlq})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedTab === "all"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>All ({counts.all})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search order #, customer, zip..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* ── ORDERS LIST ── */}
        {loadingOrders ? (
          <div className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-2xl">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading order records...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <p className="text-sm font-extrabold text-slate-800">No orders in this queue</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedTab === "ready"
                ? "All customer orders have been processed or are still in their 30-minute grace period."
                : "No customer orders currently match your filter criteria."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const minutesLeft = Math.floor(order.grace_period_remaining_seconds / 60);
              const secondsLeft = order.grace_period_remaining_seconds % 60;
              const isEditing = editingOrder === order.internal_order_number;

              // Progress percentage (30 min = 1800 sec)
              const graceProgressPct = Math.max(
                0,
                Math.min(100, Math.round(((1800 - order.grace_period_remaining_seconds) / 1800) * 100))
              );

              return (
                <div
                  key={order.internal_order_number}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs hover:border-slate-300 transition"
                >
                  {/* Top Bar: Order ID, Date, Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {order.internal_order_number}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        ${order.total_retail.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(order.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Quick 1-Click Copy Shipping Address */}
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(order)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-2xs active:scale-95 ${
                        copiedId === order.internal_order_number
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {copiedId === order.internal_order_number ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied for CJ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Address for CJ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ── THE 30-MINUTE GRACE COUNTDOWN / ACTION BANNER ── */}
                  {order.is_grace_active && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-black text-amber-900">
                            Hold Order: {minutesLeft}m {secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}s Left in Grace Period
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                          Do not place on CJ yet
                        </span>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${graceProgressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Customer has 30 minutes from purchase to update their shipping address or request an instant cancellation.
                      </p>
                    </div>
                  )}

                  {/* ── CJ DROPSHIPPING FULFILLMENT & INSTANT SYNC PANEL ── */}
                  <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 fill-emerald-600/30 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                            CJ Dropshipping Sync
                            {order.cj_order_id && (
                              <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {order.cj_order_id}
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Paste CJ Order ID to sync live carrier tracking and delivery status.
                          </p>
                        </div>
                      </div>

                      {/* Dynamic Status Badge */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {order.status === "DELIVERED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Delivered</span>
                          </span>
                        ) : order.cj_order_id && order.tracking_number ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Shipped ({order.carrier_name || "USPS"})</span>
                          </span>
                        ) : order.cj_order_id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                            <Package className="w-3.5 h-3.5 text-sky-600" />
                            <span>Ordered on CJ</span>
                          </span>
                        ) : order.fulfillment_status === "FULFILLMENT_FAILED" || order.status === "FULFILLMENT_FAILED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Fulfillment Failed (DLQ)</span>
                          </span>
                        ) : order.is_grace_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>In Grace Period</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ready to Order</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Input Field + Sync Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Paste CJ Order ID (e.g. SD261025... or 261025...)"
                          value={orderSyncInputs[order.internal_order_number] ?? (order.cj_order_id || "")}
                          onChange={(e) =>
                            setOrderSyncInputs((prev) => ({
                              ...prev,
                              [order.internal_order_number]: e.target.value,
                            }))
                          }
                          className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSyncSingleOrder(order.internal_order_number)}
                        disabled={syncingOrderId === order.internal_order_number}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer flex-shrink-0"
                      >
                        {syncingOrderId === order.internal_order_number ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Syncing with CJ...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{order.cj_order_id ? "Sync Tracking" : "Save & Sync with CJ"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Notice Message if returned */}
                    {orderSyncNotices[order.internal_order_number] && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-semibold flex items-start justify-between gap-2 border animate-in fade-in ${
                          orderSyncNotices[order.internal_order_number].type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : orderSyncNotices[order.internal_order_number].type === "error"
                            ? "bg-rose-50 text-rose-900 border-rose-200"
                            : "bg-sky-50 text-sky-900 border-sky-200"
                        }`}
                      >
                        <span>{orderSyncNotices[order.internal_order_number].message}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setOrderSyncNotices((prev) => {
                              const next = { ...prev };
                              delete next[order.internal_order_number];
                              return next;
                            })
                          }
                          className="text-slate-400 hover:text-slate-600 font-bold px-1 text-sm leading-none cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* ── DEAD-LETTER QUEUE (DLQ) RETRY PANEL ── */}
                    {(order.fulfillment_status === "FULFILLMENT_FAILED" || order.fulfillment_error) && !order.cj_order_id && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-black text-rose-800">
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            <span>Fulfillment Failed (DLQ Alert)</span>
                            <span className="text-[10px] bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded font-mono">
                              Retries: {order.dlq_retry_count || 0}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRetryFulfillment(order.internal_order_number)}
                            disabled={retryingOrderId === order.internal_order_number}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            {retryingOrderId === order.internal_order_number ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Retrying...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>Retry CJ Fulfillment</span>
                              </>
                            )}
                          </button>
                        </div>
                        {order.fulfillment_error && (
                          <p className="text-[11px] text-rose-700 font-mono bg-white/80 p-2 rounded border border-rose-200 break-all">
                            {order.fulfillment_error}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── READY ORDER MANUAL DISPATCH BUTTON ── */}
                    {!order.cj_order_id && !order.is_grace_active && order.fulfillment_status !== "FULFILLMENT_FAILED" && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleRetryFulfillment(order.internal_order_number)}
                          disabled={retryingOrderId === order.internal_order_number}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {retryingOrderId === order.internal_order_number ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Submitting to CJ...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Auto-Push to CJ Dropshipping</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Live Tracking link if available and confirmed placed */}
                    {order.cj_order_id && order.tracking_number && (
                      <div className="bg-white border border-emerald-200/90 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-700">
                            Carrier Tracking:
                          </span>
                          <a
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-black text-emerald-700 hover:underline inline-flex items-center gap-1 text-xs"
                          >
                            <span>{order.carrier_name || "USPS"}: {order.tracking_number}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Live CJ Tracking Link
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Customer Info & Fulfillment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Customer Destination Box - Aligned 1:1 with CJ Dropshipping "Add Address" Modal */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 pb-1.5 border-b border-slate-200/60">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          CJ Address Modal Fields:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAddress(order)}
                          className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          title="Copy formatted 1:1 address block for CJ Dropshipping modal"
                        >
                          {copiedId === order.internal_order_number ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied for CJ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy All for CJ</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        {/* Consignee / Name */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Consignee ID:</span>
                            <span className="font-bold text-slate-900 truncate block">{order.shipping_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySingle(order.shipping_name, `name-${order.internal_order_number}`)}
                            className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                            title="Copy Consignee Name"
                          >
                            {copiedField === `name-${order.internal_order_number}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Phone Number */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Phone Number:</span>
                            <span className="font-bold text-slate-900 truncate block">{order.customer_phone || "N/A"}</span>
                          </div>
                          {order.customer_phone && (
                            <button
                              type="button"
                              onClick={() => handleCopySingle(order.customer_phone, `phone-${order.internal_order_number}`)}
                              className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                              title="Copy Phone Number"
                            >
                              {copiedField === `phone-${order.internal_order_number}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Province / State */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Province:</span>
                            <span className="font-bold text-slate-900 truncate block">{order.shipping_province}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySingle(order.shipping_province, `prov-${order.internal_order_number}`)}
                            className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                            title="Copy Province"
                          >
                            {copiedField === `prov-${order.internal_order_number}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* City */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">City:</span>
                            <span className="font-bold text-slate-900 truncate block">{order.shipping_city}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySingle(order.shipping_city, `city-${order.internal_order_number}`)}
                            className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                            title="Copy City"
                          >
                            {copiedField === `city-${order.internal_order_number}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* County */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">County:</span>
                            <span className={`font-bold truncate block ${order.shipping_county ? "text-slate-900" : "text-slate-400 italic"}`}>
                              {order.shipping_county || "Optional / Auto"}
                            </span>
                          </div>
                          {order.shipping_county && (
                            <button
                              type="button"
                              onClick={() => handleCopySingle(order.shipping_county!, `county-${order.internal_order_number}`)}
                              className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                              title="Copy County"
                            >
                              {copiedField === `county-${order.internal_order_number}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Postcode / ZIP */}
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5">
                          <div className="min-w-0 pr-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Postcode:</span>
                            <span className="font-mono font-bold text-slate-900 truncate block">{order.shipping_zip}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySingle(order.shipping_zip, `zip-${order.internal_order_number}`)}
                            className="text-slate-400 hover:text-emerald-700 p-1 rounded"
                            title="Copy Postcode"
                          >
                            {copiedField === `zip-${order.internal_order_number}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Street Address */}
                      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-[11px]">
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Street Address:</span>
                          <span className="font-bold text-slate-900 break-words block">{order.shipping_address}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySingle(order.shipping_address, `addr-${order.internal_order_number}`)}
                          className="text-slate-400 hover:text-emerald-700 p-1 rounded flex-shrink-0"
                          title="Copy Street Address"
                        >
                          {copiedField === `addr-${order.internal_order_number}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Customer Email */}
                      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-[11px]">
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Email:</span>
                          <span className="font-mono font-bold text-slate-800 truncate block">{order.customer_email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySingle(order.customer_email, `email-${order.internal_order_number}`)}
                          className="text-slate-400 hover:text-emerald-700 p-1 rounded flex-shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === `email-${order.internal_order_number}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Fulfillment Details / Edit Box */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                          Fulfillment Record:
                        </span>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrder(order.internal_order_number);
                              setCjOrderIdInput(order.cj_order_id || "");
                              setTrackingInput(order.tracking_number || "");
                              setStatusInput(order.status || "CONFIRMED");
                            }}
                            className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                          >
                            Update Status / Tracking
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2.5 pt-1 bg-white p-3 rounded-lg border border-slate-200 animate-in fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              CJ Dropshipping Order ID
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. CJ1793284029"
                              value={cjOrderIdInput}
                              onChange={(e) => setCjOrderIdInput(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              USPS Tracking Number
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 940011189956..."
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Order Status
                            </label>
                            <select
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="ORDER_PLACED">ORDER_PLACED (Grace active)</option>
                              <option value="CONFIRMED">CONFIRMED (Grace ended · Ready to order)</option>
                              <option value="SUPPLIER_PROCESSING">SUPPLIER_PROCESSING (Paid on CJ)</option>
                              <option value="SHIPPED">SHIPPED (Tracking available)</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED (Refunded)</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveFulfillment(order.internal_order_number)}
                              disabled={isSubmitting}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
                            >
                              {isSubmitting ? "Saving..." : "Save Record"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOrder(null)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-slate-700">
                            CJ Order ID:{" "}
                            {order.cj_order_id ? (
                              <span className="font-mono font-bold text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                {order.cj_order_id}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not placed on CJ yet</span>
                            )}
                          </p>

                          <p className="text-slate-700">
                            USPS Tracking:{" "}
                            {order.tracking_number ? (
                              <a
                                href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{order.tracking_number}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Pending warehouse dispatch</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products & Direct CJ Supplier Link */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Ordered Products ({order.items?.length || 0}) — Direct Supplier Link:
                    </span>
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => {
                        const title = item.product_title || item.title || "Product";
                        const cleanT = title.toLowerCase().trim();

                        const effectivePid = item.pid || "";
                        const matchedProduct: any = null;
                        const matchedVariant: any = null;

                        const effectiveVid = matchedVariant?.vid || item.vid || "";
                        const effectiveSku = matchedVariant?.sku || item.variant_sku || item.sku || "";
                        const effectiveVariantTitle =
                          item.variant_title ||
                          matchedVariant?.variant_name ||
                          item.size ||
                          item.color ||
                          "Standard";

                        const effectiveImage =
                          matchedVariant?.image_url ||
                          matchedProduct?.hero_image_url ||
                          matchedProduct?.images?.[0] ||
                          (item.image_url && item.image_url !== "/placeholder.jpg" ? item.image_url : "");
                        const effectiveSlug = matchedProduct?.slug || item.slug;

                        const cleanSlug = (effectiveSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-+|-+$/g, "");
                        // Canonical CJ direct product page: https://cjdropshipping.com/product/{slug}-p-{pid}.html
                        const cjDirectUrl = effectivePid
                          ? `https://cjdropshipping.com/product/${cleanSlug}-p-${effectivePid}.html`
                          : null;
                        const cjSearchUrl = `https://cjdropshipping.com/search/${encodeURIComponent(effectiveSku || title)}.html`;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {effectiveImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={effectiveImage}
                                  alt={title}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder.png";
                                  }}
                                  className="w-14 h-14 object-contain rounded-xl bg-white border border-slate-200 p-1 flex-shrink-0 shadow-2xs"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                                  <ShoppingBag className="w-6 h-6" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-1">
                                <p className="text-xs font-black text-slate-900 truncate max-w-sm sm:max-w-md">
                                  {title}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                                  <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                    Qty: {item.quantity || 1}
                                  </span>

                                  {/* Genuine CJ Variant Title / Option */}
                                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-md">
                                    Option: {effectiveVariantTitle}
                                  </span>

                                  {/* VID Badge with quick-copy */}
                                  {effectiveVid && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopySingle(effectiveVid, `vid-${order.internal_order_number}-${idx}`)}
                                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-700 transition"
                                      title="Copy CJ Variant ID (VID)"
                                    >
                                      <span>VID: {effectiveVid.slice(-8)}</span>
                                      {copiedField === `vid-${order.internal_order_number}-${idx}` ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                                      )}
                                    </button>
                                  )}

                                  {/* SKU Badge with quick-copy */}
                                  {effectiveSku && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopySingle(effectiveSku, `sku-${order.internal_order_number}-${idx}`)}
                                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px] text-slate-700 transition"
                                      title="Copy CJ SKU"
                                    >
                                      <span>SKU: {effectiveSku}</span>
                                      {copiedField === `sku-${order.internal_order_number}-${idx}` ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                                      )}
                                    </button>
                                  )}

                                  {item.price ? (
                                    <span className="font-extrabold text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      ${Number(item.price).toFixed(2)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Direct Supplier Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                              {effectiveSlug && (
                                <Link
                                  href={`/products/${effectiveSlug}`}
                                  target="_blank"
                                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                                  title="View product on storefront"
                                >
                                  <span>Store</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </Link>
                              )}

                              <a
                                href={cjDirectUrl || cjSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                title="Open direct product page on CJ Dropshipping"
                              >
                                <span>Open on CJ Dropshipping</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              <a
                                href={cjSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="Search alternate suppliers on CJ"
                              >
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <span className="hidden sm:inline">Alternate Suppliers</span>
                              </a>
                            </div>
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
