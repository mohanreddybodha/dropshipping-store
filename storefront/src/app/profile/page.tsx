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
  User as UserIcon,
  LogOut,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  X,
  AlertCircle,
  Lock,
  MapPin,
} from "lucide-react";
import {
  auth,
  loginWithGoogle,
  logoutUser,
  FirebaseUser,
} from "../../lib/firebase";
import {
  syncUserAuth,
  lookupOrdersDualFactor,
  getCustomerOrders,
  createCheckoutOrder,
  FALLBACK_PRODUCTS,
} from "../../lib/api";
import { CustomerOrder } from "../../lib/types";

// Helper to resolve product image, title, and link for order items (Flipkart/Amazon style)
function resolveOrderItemInfo(item: any) {
  const title = item.product_title || item.title || "Domestic Lab Essential";
  let imageUrl = item.image_url;
  let slug = item.slug;

  if (!imageUrl || imageUrl === "/placeholder.jpg" || !slug) {
    const cleanT = (title || "").toLowerCase();
    const matched = FALLBACK_PRODUCTS.find(
      (p) =>
        p.title.toLowerCase() === cleanT ||
        cleanT.includes(p.title.toLowerCase()) ||
        p.title.toLowerCase().includes(cleanT)
    );
    if (matched) {
      if (!imageUrl || imageUrl === "/placeholder.jpg") {
        imageUrl = matched.hero_image_url || matched.images?.[0];
      }
      if (!slug) slug = matched.slug;
    }
  }

  // Defensively ensure imageUrl is never a broken link; fallback to catalog hero image
  if (!imageUrl || imageUrl === "/placeholder.jpg") {
    imageUrl = FALLBACK_PRODUCTS[0]?.hero_image_url || "";
  }

  return {
    title,
    imageUrl,
    slug: slug ? `/products/${slug}` : undefined,
    size: item.size,
    color: item.color,
    quantity: item.quantity || 1,
    price: Number(item.price || item.unit_price || 0),
  };
}

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

// ── FAQ Accordion Item ───────────────────────────────────────────────────────
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Dual-Factor Lookup Modal State
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupZip, setLookupZip] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<CustomerOrder[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // 1. Listen for Firebase Auth State Changes & Sync Data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        setOrdersLoading(true);
        const userEmail = user.email || (user.phoneNumber ? `${user.phoneNumber.replace(/\D/g, "")}@phone.domesticlab.com` : `uid_${user.uid.slice(0, 16)}@user.domesticlab.com`);

        try {
          // Push any locally cached orders from previous device activity into the database for immediate cross-device sync
          try {
            const rawOrders = localStorage.getItem("customer_orders");
            if (rawOrders) {
              const parsedOrders = JSON.parse(rawOrders);
              if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
                for (const lo of parsedOrders) {
                  const orderEmail = (lo.customer_email || "").toLowerCase();
                  const currentEmail = (user.email || userEmail).toLowerCase();
                  if (!orderEmail || orderEmail === currentEmail) {
                    await createCheckoutOrder({
                      internal_order_number: lo.internal_order_number,
                      customer_name: lo.shipping_name || user.displayName || "Valued Customer",
                      customer_email: user.email || lo.customer_email || userEmail,
                      customer_phone: lo.customer_phone,
                      shipping_address: lo.shipping_address || "US Address",
                      shipping_city: lo.shipping_city || "New York",
                      shipping_province: lo.shipping_province || "NY",
                      shipping_zip: lo.shipping_zip || "10001",
                      shipping_country: lo.shipping_country || "US",
                      total_retail: lo.total_retail || 0,
                      carrier_name: lo.carrier_name || "USPS",
                      tracking_number: lo.tracking_number,
                      items: lo.items || [],
                      firebase_uid: user.uid,
                    }).catch(() => {});
                  }
                }
              }
            }
          } catch {
            // Ignore push sync error
          }

          // Read guest cart & watchlist from localStorage
          let guestCart: any[] = [];
          let guestWatchlist: string[] = [];
          try {
            const rawCart = localStorage.getItem("app_cart");
            if (rawCart) {
              const parsed = JSON.parse(rawCart);
              if (Array.isArray(parsed)) {
                guestCart = parsed.map((item) => ({
                  variant_vid: item.variant?.vid || item.variant_vid,
                  product_pid: item.product?.pid || item.product_pid,
                  title: item.product?.title || item.title,
                  image_url: item.product?.hero_image_url || item.image_url,
                  tier: item.tier === "2x" ? 2 : item.tier === "3x" ? 3 : 1,
                  selected_size: item.selectedSize || null,
                  quantity: item.quantity || 1,
                  unit_price: item.unitPrice || item.variant?.retail_price_1x || 0,
                }));
              }
            }
            const rawWatch = localStorage.getItem("watchlist_items");
            if (rawWatch) {
              const parsed = JSON.parse(rawWatch);
              if (Array.isArray(parsed)) {
                guestWatchlist = parsed.map((p: any) => (typeof p === "string" ? p : p.pid)).filter(Boolean);
              }
            }
          } catch {
            // Ignore parse errors
          }

          // Trigger backend cloud sync
          const syncRes = await syncUserAuth({
            firebase_uid: user.uid,
            email: user.email || userEmail,
            phone_number: user.phoneNumber,
            display_name: user.displayName,
            photo_url: user.photoURL,
            guest_cart: guestCart,
            guest_watchlist: guestWatchlist,
          });

          if (syncRes?.orders) {
            mergeAndSetOrders(userEmail, syncRes.orders);
          } else {
            // Fallback: query orders directly
            const directOrders = await getCustomerOrders(userEmail);
            mergeAndSetOrders(userEmail, directOrders);
          }
        } catch (err) {
          console.error("Auth sync failure:", err);
          const fallbackOrders = await getCustomerOrders(userEmail);
          mergeAndSetOrders(userEmail, fallbackOrders);
        } finally {
          setOrdersLoading(false);
        }
      } else {
        try {
          const rawOrders = localStorage.getItem("customer_orders");
          if (rawOrders) {
            const parsed = JSON.parse(rawOrders);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setOrders(parsed);
              return;
            }
          }
        } catch {
          // Ignore parse errors
        }
        setOrders([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Merge remote orders with any recent locally-saved session orders
  const mergeAndSetOrders = (email: string, remote: CustomerOrder[]) => {
    let localOrders: CustomerOrder[] = [];
    try {
      const raw = localStorage.getItem("customer_orders");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localOrders = parsed.filter(
            (o) =>
              !o.customer_email ||
              (o.customer_email || "").toLowerCase() === (email || "").toLowerCase()
          );
        }
      }
    } catch {
      // Ignore
    }

    const map = new Map<string, CustomerOrder>();
    localOrders.forEach((o) => map.set(o.internal_order_number, o));
    remote.forEach((o) => map.set(o.internal_order_number, o));

    const merged = Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.created_at || Date.now()).getTime() -
        new Date(a.created_at || Date.now()).getTime()
    );
    setOrders(merged);
  };

  // Helper to format OAuth error codes with actionable guidance
  const parseAuthError = (err: any) => {
    if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
      return null;
    }
    if (err?.code === "auth/unauthorized-domain") {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "your domain";
      return `Authorized Domain Missing: Please add "${currentHost}" in Firebase Console → Authentication → Settings → Authorized domains.`;
    }
    if (err?.code === "auth/operation-not-allowed") {
      return "Google Sign-In is not enabled yet in Firebase Console → Authentication → Sign-in method.";
    }
    if (err?.code === "auth/popup-blocked") {
      return "Popup was blocked by your browser. Please allow popups for this site and retry.";
    }
    if (err?.code === "auth/configuration-not-found") {
      return "Google OAuth is not configured in your Firebase project.";
    }
    return err?.message || "Google Sign-In could not be completed. Please try again.";
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (loginPending) return;
    setLoginPending(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const formatted = parseAuthError(err);
      if (formatted) setAuthError(formatted);
    } finally {
      setLoginPending(false);
    }
  };

  // Sign-Out Handler
  const handleSignOut = async () => {
    try {
      await logoutUser();
      setOrders([]);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  // Prevent background scroll when Dual-Factor modal is open
  useEffect(() => {
    if (showLookupModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showLookupModal]);

  // Dual-Factor Guest Order Lookup
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);
    setLookupResults(null);

    try {
      let res: CustomerOrder[] = [];
      try {
        res = await lookupOrdersDualFactor(lookupEmail, lookupZip);
      } catch (apiErr) {
        console.warn("Dual-factor backend API lookup warning, checking local storage session:", apiErr);
      }

      if (!res || res.length === 0) {
        // Fallback to checking local session orders (e.g. newly completed checkout)
        try {
          const raw = localStorage.getItem("customer_orders");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const matched = parsed.filter(
                (o) =>
                  (o.customer_email || "").toLowerCase() === lookupEmail.trim().toLowerCase() &&
                  (o.shipping_zip || "").startsWith(lookupZip.trim().slice(0, 5))
              );
              if (matched.length > 0) {
                res = matched;
              }
            }
          }
        } catch {
          // Ignore
        }
      }

      setLookupResults(res);
      if (res.length === 0) {
        setLookupError("No domestic orders found matching this Email and ZIP code combination.");
      }
    } catch (err: any) {
      setLookupError(err.message || "Unable to look up orders. Please check your details.");
    } finally {
      setLookupLoading(false);
    }
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
    if (
      s.includes("TRANSIT") ||
      s.includes("DISPATCH") ||
      s.includes("CREATED") ||
      s.includes("CAPTURED")
    ) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 pb-20 md:pb-8 space-y-5">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/"
            className="hidden sm:flex w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 items-center justify-center text-slate-600 transition active:scale-95 flex-shrink-0"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <span className="truncate">Account & Orders</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Manage profile & track orders
            </p>
          </div>
        </div>

        {currentUser && (
          <button
            onClick={handleSignOut}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs active:scale-95 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
            <span className="whitespace-nowrap">Sign Out</span>
          </button>
        )}
      </div>

      {/* ── LOADING SKELETON ── */}
      {authLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Checking authentication session...</p>
        </div>
      )}

      {/* ── TOP ACCOUNT / GUEST STATUS SECTION ── */}
      {!authLoading && (
        <div className="space-y-6">
          {currentUser ? (
            /* User Profile Summary Card (Logged In) */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {currentUser.photoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">
                      {currentUser.displayName || "Verified Customer"}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                </div>
              </div>

              {/* Secondary Action on Authenticated View */}
              <button
                type="button"
                onClick={() => {
                  setShowLookupModal(true);
                  setLookupResults(null);
                  setLookupError(null);
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-slate-600" />
                <span>Track Orders Under Another Email</span>
              </button>
            </div>
          ) : orders.length > 0 ? (
            /* Guest Session Banner with Orders Present */
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-white px-2.5 py-1 rounded-full border border-emerald-200 inline-block">
                  Guest Order Session
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 pt-0.5">
                  Orders Placed on this Device
                </h2>
                <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                  You have active domestic USPS orders placed during your guest checkout session. Sign in with Google to permanently link them to your account.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loginPending}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <GoogleIcon />
                  <span>{loginPending ? "Connecting..." : "Sign in with Google"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLookupModal(true);
                    setLookupResults(null);
                    setLookupError(null);
                  }}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition shadow-2xs active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Track Another Email</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty Unauthenticated State */
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 inline-block">
                    Secure Account Access
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 pt-1">
                    Sign in with Google
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                    Sign in securely with your Google account. Automatically sync your cart, save watchlist items permanently, and review USPS delivery status across all your devices.
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800 font-medium">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed flex-1">{authError}</span>
                      <button
                        onClick={() => setAuthError(null)}
                        className="text-rose-400 hover:text-rose-700 text-sm font-bold ml-1 px-1"
                        aria-label="Dismiss error"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loginPending}
                    className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition active:scale-98 disabled:opacity-60"
                  >
                    <GoogleIcon />
                    <span>{loginPending ? "Connecting to Google..." : "Continue with Google"}</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Zero-password authentication powered by Google Firebase Enterprise.</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-emerald-700" />
                    Placed an order with a different email or as a guest?
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md">
                    Look up order receipts and USPS tracking using your checkout Email address and 5-digit delivery ZIP code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowLookupModal(true);
                    setLookupResults(null);
                    setLookupError(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 transition shadow-2xs active:scale-95 flex-shrink-0"
                >
                  Track Orders Under Another Email →
                </button>
              </div>
            </div>
          )}

          {/* Orders History Section: Rendered when user is logged in OR has local guest orders */}
          {(currentUser || orders.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-1.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 min-w-0 flex-1">
                  <Package className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="flex-shrink-0 whitespace-nowrap">Orders for</span>
                  <span
                    title={currentUser?.email?.toLowerCase() || orders[0]?.customer_email?.toLowerCase() || "Guest"}
                    className="lowercase truncate flex-1 min-w-0 font-bold text-slate-700 block"
                  >
                    {currentUser?.email?.toLowerCase() || orders[0]?.customer_email?.toLowerCase() || "Guest"}
                  </span>
                  <span className="flex-shrink-0 font-bold text-emerald-700 whitespace-nowrap">
                    ({orders.length})
                  </span>
                </h2>
              </div>

            {ordersLoading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading your order history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You haven’t placed any orders with this email yet. Explore our US warehouse catalog to get started.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                >
                  Explore Catalog →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.internal_order_number || order.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {order.internal_order_number}
                          </span>
                          {renderStatusBadge(order.status)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on{" "}
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently"}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          ${Number(order.total_retail || 0).toFixed(2)} USD
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700">
                          Free US Domestic Ground
                        </span>
                      </div>
                    </div>

                    {/* Delivery & USPS Tracking Information */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800">
                            Carrier: {order.carrier_name || "USPS"}
                          </span>
                          {order.shipping_city && order.shipping_province && (
                            <span className="text-slate-500 text-[11px] block">
                              Shipping to {order.shipping_city}, {order.shipping_province}{" "}
                              {order.shipping_zip}
                            </span>
                          )}
                        </div>
                      </div>

                      {order.tracking_number ? (
                        <a
                          href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-800 text-[11px] hover:underline"
                        >
                          <span>{order.tracking_number}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">
                          Tracking generates within 24h
                        </span>
                      )}
                    </div>

                    {/* Order Product Items (Full Flipkart/Amazon Product Card Presentation) */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ordered Items ({order.items.reduce((acc, i) => acc + (i.quantity || 1), 0)} Units)
                        </span>
                        <div className="space-y-2.5">
                          {order.items.map((item, idx) => {
                            const info = resolveOrderItemInfo(item);
                            const productLink = info.slug || "/";

                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition group"
                              >
                                {/* High-Fidelity Thumbnail */}
                                <Link
                                  href={productLink}
                                  prefetch={true}
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:border-emerald-300 transition"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={info.imageUrl}
                                    alt={info.title}
                                    onError={(e) => {
                                      e.currentTarget.src = FALLBACK_PRODUCTS[0]?.hero_image_url || "";
                                    }}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                  />
                                </Link>

                                {/* Product Title & Details */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <Link
                                      href={productLink}
                                      prefetch={true}
                                      className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug"
                                    >
                                      {info.title}
                                    </Link>
                                  </div>

                                  {/* Badges: Size, Color, Amount before Unit (no amount/unit) */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 pt-0.5">
                                    {info.size && (
                                      <span className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                        Size: {info.size}
                                      </span>
                                    )}
                                    {info.color && (
                                      <span className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                        Color: {info.color}
                                      </span>
                                    )}
                                    {info.price > 0 && (
                                      <span className="font-black text-slate-900 bg-slate-100 border border-slate-200/90 px-1.5 py-0.2 rounded text-[11px]">
                                        ${(info.price * info.quantity).toFixed(2)}
                                      </span>
                                    )}
                                    <span className="bg-emerald-100/70 border border-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                      {info.quantity} {info.quantity === 1 ? "Unit" : "Units"}
                                    </span>
                                  </div>

                                  {/* Domestic Fulfillment Badge */}
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium pt-0.5">
                                    <Truck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                    <span>USPS Domestic Tracked</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ── DUAL-FACTOR ORDER LOOKUP MODAL (Clean Full-Screen Dark Overlay) ── */}
      {showLookupModal && (
        <div
          className="fixed inset-0 z-[9999] w-full h-full min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-black/60 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLookupModal(false);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Track Orders Under Another Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              To protect customer privacy, order tracking requires both the <strong>Email Address</strong> and the <strong>5-Digit US Delivery ZIP Code</strong> used during checkout.
            </p>

            <form onSubmit={handleLookupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Email Address
                </label>
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="e.g. buyer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5-Digit US Delivery ZIP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={lookupZip}
                  onChange={(e) => setLookupZip(e.target.value)}
                  placeholder="e.g. 90210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {lookupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {lookupLoading ? "Verifying & Retrieving..." : "Lookup Verified Orders"}
              </button>
            </form>

            {/* Lookup Results */}
            {lookupResults && lookupResults.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Found {lookupResults.length} Matching Orders:
                </h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {lookupResults.map((order) => (
                    <div
                      key={order.internal_order_number}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">
                          {order.internal_order_number}
                        </span>
                        {renderStatusBadge(order.status)}
                      </div>

                      <div className="text-slate-600 text-[11px] space-y-0.5">
                        <p>
                          Recipient: <strong>{(order as any).masked_recipient || "Customer"}</strong>
                        </p>
                        <p>
                          Destination: {order.shipping_city}, {order.shipping_province}{" "}
                          {order.shipping_zip}
                        </p>
                        {order.tracking_number && (
                          <p className="font-mono text-emerald-700 font-bold">
                            USPS Tracking: {order.tracking_number}
                          </p>
                        )}
                      </div>

                      {/* Purchased Items within Guest Lookup */}
                      {order.items && order.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          {order.items.map((item, idx) => {
                            const info = resolveOrderItemInfo(item);
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-[11px] text-slate-800 bg-white p-2 rounded-lg border border-slate-200/60"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={info.imageUrl}
                                  alt={info.title}
                                  onError={(e) => {
                                    e.currentTarget.src = FALLBACK_PRODUCTS[0]?.hero_image_url || "";
                                  }}
                                  className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0"
                                />
                                <span className="font-semibold flex-1 min-w-0 truncate">
                                  {info.title}
                                </span>
                                {info.price > 0 && (
                                  <span className="font-black text-slate-900 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                                    ${(info.price * info.quantity).toFixed(2)}
                                  </span>
                                )}
                                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                                  {info.quantity} {info.quantity === 1 ? "Unit" : "Units"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOMER SUPPORT & FAQ ACCORDION ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
            Domestic Shipping & Tracking FAQs
          </h3>
        </div>

        <FaqItem
          question="How do I track my USPS package?"
          answer="Once your order dispatches from our US distribution center (usually within 24 business hours), a USPS tracking number is generated and linked on your profile. You can click on the tracking number to view real-time delivery status on USPS.com."
        />
        <FaqItem
          question="Can I deliver to PO Boxes or APO/FPO addresses?"
          answer="Yes! Because we ship exclusively via USPS domestic services, standard PO Boxes, residential addresses, and military APO/FPO destinations within the United States are fully eligible."
        />
        <FaqItem
          question="Can I modify my shipping address after checkout?"
          answer="We offer a 30-minute grace window after checkout before orders are automatically sent to our automated packaging facility. Contact our support team immediately if you need to correct your address."
        />
        <FaqItem
          question="Why can’t I order to addresses outside the United States?"
          answer="To guarantee rapid 3–5 business day delivery and zero unexpected import duties, Domestic Lab operates exclusively within the domestic US supply chain."
        />
      </div>
    </div>
  );
}
