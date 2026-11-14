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
  ChevronRight,
  User as UserIcon,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Search,
  X,
  AlertCircle,
  Lock,
  RotateCcw,
  FileText,
  Headphones,
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
} from "../../lib/api";
import { CustomerOrder } from "../../lib/types";
import NavigationBackButton from "../../components/ui/NavigationBackButton";


// Helper to resolve product image, title, and link for order items
function resolveOrderItemInfo(item: any) {
  const title = item.product_title || item.title || "Vastire Essential";
  let imageUrl = item.image_url;
  const slug = item.slug;

  if (!imageUrl || imageUrl === "/placeholder.jpg") {
    imageUrl = "/placeholder.jpg";
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

// ── FAQ Accordion Item (All Closed by Default) ──────────────────────────────
function FaqAccordionItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200/90 rounded-xl bg-slate-50/50 overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left group gap-3 cursor-pointer"
        aria-expanded={open}
      >
        <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 px-3.5 sm:px-4 pb-3.5 sm:pb-4" : "grid-rows-[0fr] opacity-0 px-3.5 sm:px-4 pb-0"
        }`}
      >
        <div className="overflow-hidden text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-200/70">
          {answer}
        </div>
      </div>
    </div>
  );
}

type ModalType =
  | "track-order"
  | "faqs"
  | "terms"
  | "refund"
  | "shipping"
  | "privacy"
  | "support"
  | null;

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  // Active Interactive Modal Drawer (Animated from bottom)
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Dual-Factor Lookup State
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupZip, setLookupZip] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<CustomerOrder[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Listen for Firebase Auth State Changes & Sync Data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        const userEmail =
          user.email ||
          (user.phoneNumber
            ? `${user.phoneNumber.replace(/\D/g, "")}@phone.vastire.com`
            : `uid_${user.uid.slice(0, 16)}@user.vastire.com`);

        // Instant local render
        try {
          const rawOrders = localStorage.getItem("customer_orders");
          if (rawOrders) {
            const parsedOrders = JSON.parse(rawOrders);
            if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
              setOrders(parsedOrders);
            }
          }
        } catch {
          // Ignore parse errors
        }

        // Non-blocking background sync with database
        (async () => {
          try {
            // Push locally cached guest orders
            try {
              const rawOrders = localStorage.getItem("customer_orders");
              if (rawOrders) {
                const parsedOrders = JSON.parse(rawOrders);
                if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
                  const syncTasks = parsedOrders.map((lo) => {
                    const orderEmail = (lo.customer_email || "").toLowerCase();
                    const currentEmail = (user.email || userEmail).toLowerCase();
                    if (!orderEmail || orderEmail === currentEmail) {
                      return createCheckoutOrder({
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
                    return Promise.resolve();
                  });
                  Promise.allSettled(syncTasks).catch(() => {});
                }
              }
            } catch {}

            // Background cloud sync
            const syncRes = await syncUserAuth({
              firebase_uid: user.uid,
              email: user.email || userEmail,
              phone_number: user.phoneNumber,
              display_name: user.displayName,
              photo_url: user.photoURL,
            });

            if (syncRes?.orders) {
              mergeAndSetOrders(userEmail, syncRes.orders);
            } else {
              const directOrders = await getCustomerOrders(userEmail);
              mergeAndSetOrders(userEmail, directOrders);
            }
          } catch (err) {
            console.warn("Background auth sync notice:", err);
          }
        })();
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

  // Prevent background scroll & listen for Escape key when modal is open
  useEffect(() => {
    if (activeModal || showSignOutConfirm) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActiveModal(null);
          setShowSignOutConfirm(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = original;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeModal, showSignOutConfirm]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (loginPending) return;
    setLoginPending(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      setAuthError(err?.message || "Google Sign-In could not be completed. Please try again.");
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <Truck className="w-3.5 h-3.5" />
          In Transit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        Processing
      </span>
    );
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-[82px] md:pb-6 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2">
        <NavigationBackButton fallbackHref="/" />
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Account Profile
        </h1>
      </div>
      {/* ── AUTH STATUS SKELETON ── */}
      {authLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2.5">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading account...</p>
        </div>
      )}

      {/* ── HERO PROFILE / SIGN IN CARD (Clean, no redundant buttons) ── */}
      {!authLoading && (
        <>
          {currentUser ? (
            /* Logged-In User Profile Card (Name + Email only, zero redundant buttons) */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              {currentUser.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User"}
                  className="w-12 h-12 rounded-full border border-slate-200 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center flex-shrink-0">
                  {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {currentUser.displayName || "Customer"}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-mono mt-0.5 truncate">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            /* Clean Unauthenticated Login Card */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Login / Sign In with Email
                </h2>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loginPending}
                  className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  <GoogleIcon />
                  <span>{loginPending ? "Signing in..." : "Continue with Google"}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {authError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-800 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{authError}</span>
          <button
            onClick={() => setAuthError(null)}
            className="text-rose-400 hover:text-rose-700 text-sm font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* ── CLEAN NAVIGATION BUTTONS (Standard Readable Font Size) ── */}
      <div className="space-y-4">
        {/* SECTION 1: ORDERS & TRACKING */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
            Orders & Tracking
          </h3>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
            {/* Track Order */}
            <button
              type="button"
              onClick={() => {
                setActiveModal("track-order");
                setLookupResults(null);
                setLookupError(null);
              }}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0 text-sky-600 group-hover:bg-sky-100 transition">
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Track Order
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Orders */}
            <Link
              href="/orders"
              prefetch={true}
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 group-hover:bg-emerald-100 transition">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Orders
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER CARE */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
            Customer Care
          </h3>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
            {/* Frequently Asked Questions */}
            <button
              type="button"
              onClick={() => setActiveModal("faqs")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 group-hover:bg-amber-100 transition">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Frequently Asked Questions
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Support */}
            <button
              type="button"
              onClick={() => setActiveModal("support")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 group-hover:bg-purple-100 transition">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Support
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* SECTION 3: STORE POLICIES */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
            Store Policies
          </h3>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
            {/* Terms and Conditions */}
            <button
              type="button"
              onClick={() => setActiveModal("terms")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-700 group-hover:bg-slate-200 transition">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Terms and Conditions
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Refund Policy */}
            <button
              type="button"
              onClick={() => setActiveModal("refund")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700 group-hover:bg-teal-100 transition">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Refund Policy
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Shipping Policy */}
            <button
              type="button"
              onClick={() => setActiveModal("shipping")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 group-hover:bg-emerald-100 transition">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Shipping Policy
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Privacy Policy */}
            <button
              type="button"
              onClick={() => setActiveModal("privacy")}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition active:scale-[0.99] group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 group-hover:bg-blue-100 transition">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Privacy Policy
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* SECTION 4: ACCOUNT SECURITY (Single Sign-Out Button) */}
        {currentUser && (
          <div className="space-y-1 pt-1">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 px-1">
              Account Security
            </h3>

            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-rose-50/50 transition active:scale-[0.99] group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 group-hover:bg-rose-100 transition">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-rose-700 group-hover:text-rose-800 transition">
                    Sign Out
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-rose-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sign Out Confirmation Pop-up Modal ── */}
      {showSignOutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-dialog-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 id="signout-dialog-title" className="text-base font-black text-slate-900">
                  Sign Out
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm account sign out
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to sign out of your account on Vastire?
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignOutConfirm(false);
                  await handleSignOut();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE MODAL DRAWERS (Animated from bottom) ── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl max-h-[85vh] bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-sheet-slide-up">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {activeModal === "track-order" && (
                  <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Search className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "faqs" && (
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "terms" && (
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "refund" && (
                  <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "shipping" && (
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                    <Truck className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "privacy" && (
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                    <Lock className="w-5 h-5" />
                  </div>
                )}
                {activeModal === "support" && (
                  <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Headphones className="w-5 h-5" />
                  </div>
                )}

                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {activeModal === "track-order" && "Track Order"}
                  {activeModal === "faqs" && "Frequently Asked Questions"}
                  {activeModal === "terms" && "Terms and Conditions"}
                  {activeModal === "refund" && "Refund Policy"}
                  {activeModal === "shipping" && "Shipping Policy"}
                  {activeModal === "privacy" && "Privacy Policy"}
                  {activeModal === "support" && "Customer Support"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition flex-shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-sm sm:text-base text-slate-600 leading-relaxed">
              {/* 1. TRACK ORDER */}
              {activeModal === "track-order" && (
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-500">
                    Enter your checkout Email Address and 5-Digit US Delivery ZIP Code to look up your order status.
                  </p>

                  <form onSubmit={handleLookupSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        placeholder="buyer@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                        5-Digit US ZIP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={lookupZip}
                        onChange={(e) => setLookupZip(e.target.value)}
                        placeholder="90210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    {lookupError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-rose-800 font-semibold">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{lookupError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {lookupLoading ? "Looking up..." : "Track Order"}
                    </button>
                  </form>

                  {/* Results */}
                  {lookupResults && lookupResults.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                        {lookupResults.length} {lookupResults.length === 1 ? "Order Found" : "Orders Found"}:
                      </h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {lookupResults.map((order) => (
                          <div
                            key={order.internal_order_number}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs sm:text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900">
                                {order.internal_order_number}
                              </span>
                              {renderStatusBadge(order.status)}
                            </div>

                            <div className="text-slate-600 text-xs sm:text-sm space-y-0.5">
                              <p>
                                Destination: {order.shipping_city}, {order.shipping_province} {order.shipping_zip}
                              </p>
                              {order.tracking_number && (
                                <p className="font-mono text-emerald-700 font-bold">
                                  USPS: {order.tracking_number}
                                </p>
                              )}
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                                {order.items.map((item, idx) => {
                                  const info = resolveOrderItemInfo(item);
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 bg-white p-2 rounded-lg border border-slate-200/60"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={info.imageUrl}
                                        alt={info.title}
                                        onError={(e) => {
                                          e.currentTarget.src = "/placeholder.jpg";
                                        }}
                                        className="w-9 h-9 object-contain rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0"
                                      />
                                      <span className="font-medium flex-1 min-w-0 truncate">
                                        {info.title}
                                      </span>
                                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs flex-shrink-0">
                                        Qty {info.quantity}
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
              )}

              {/* 2. FAQS (Accurate, Comprehensive, Closed by default) */}
              {activeModal === "faqs" && (
                <div className="space-y-2.5">
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="How long does shipping take?"
                    answer="Orders are typically processed from domestic US fulfillment centers within 1–2 business days. Estimated tracked domestic ground delivery (USPS / UPS / FedEx) takes 3–5 business days to physical street addresses within the 48 contiguous United States."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="How do I track my package?"
                    answer="As soon as the domestic carrier scans your parcel, you will receive an email confirmation with your live door-to-door tracking link. You can also look up current milestone updates anytime in Track Order using your email and ZIP code."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="Can I deliver to a PO Box or military address?"
                    answer="No. Because our domestic US fulfillment centers dispatch through commercial ground couriers (UPS, FedEx, and USPS ground), we only deliver to physical residential or commercial street addresses within the 48 contiguous United States (plus D.C.). P.O. Boxes, military APO/FPO/DPO addresses, Alaska, Hawaii, and US territories are not supported."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="Can I modify my shipping address or cancel my order?"
                    answer="Yes. We offer an automated 30-minute grace window immediately after checkout. During these 30 minutes, you can update your shipping address or cancel for an immediate 100% full refund directly from the Orders tab."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="What is your return & refund policy?"
                    answer="We offer a 7-day return reporting window exclusively for items that arrive defective, damaged in transit, or mismatched from what you ordered. Because orders are fulfilled directly by domestic fulfillment centers, we do not accept returns or refunds for buyer remorse, change of mind, personal dissatisfaction, or customer sizing mistakes. Eligible claims must be submitted to support@vastire.com with photo evidence within 7 calendar days of delivery for supplier verification and replacement or refund."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="What payment methods do you accept?"
                    answer="We accept PayPal, Visa, MasterCard, American Express, and Discover. All transactions are tokenized via PCI-DSS compliant PayPal Enterprise infrastructure."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="Do you ship internationally or to Alaska/Hawaii?"
                    answer="Currently, Vastire ships exclusively to physical street addresses within the 48 contiguous United States (plus D.C.). Alaska, Hawaii, US territories, P.O. Boxes, military APO/FPO/DPO addresses, and international destinations are not supported. Estimated domestic transit is 3–5 business days with zero unexpected customs or tariff charges."
                  />
                  <FaqAccordionItem
                    defaultOpen={false}
                    question="How do I reach customer support?"
                    answer="You can email our customer support team directly at support@vastire.com with your order number. Support inquiries are handled Monday through Saturday (9:00 AM – 6:00 PM EST) with a 1–2 business day response target."
                  />
                </div>
              )}

              {/* 3. TERMS AND CONDITIONS */}
              {activeModal === "terms" && (
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">Purchase Agreement</p>
                    <p className="text-slate-600 leading-relaxed">
                      All orders are subject to domestic inventory verification and address validation. We reserve the right to cancel orders with invalid addresses or fraud indicators.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <h4 className="font-bold text-slate-900">Transparent Pricing</h4>
                      <p className="text-slate-600 leading-relaxed">
                        All prices are in USD ($). Every order includes free tracked domestic ground shipping across the 48 contiguous US states with zero hidden checkout or customs fees.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">30-Minute Cancellation Window</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Orders can be canceled for a 100% refund during the initial 30-minute post-purchase window before automated fulfillment locks the parcel for packaging.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. REFUND POLICY */}
              {activeModal === "refund" && (
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                    <p className="font-bold text-sm sm:text-base text-amber-900">7-Day Defective Item Return Policy</p>
                    <p className="text-amber-800 leading-relaxed">
                      We offer a 7-day reporting window from delivery strictly for defective, damaged, or incorrect items. We do not accept returns or refunds for buyer remorse, change of mind, or customer sizing mistakes.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-slate-600">
                    <div>
                      <h4 className="font-bold text-slate-900">Defective & Damaged Items Only</h4>
                      <p className="leading-relaxed">
                        If an item arrives damaged, defective, or mismatched from what you ordered, email <strong>support@vastire.com</strong> within 7 calendar days of delivery with photos of the item and shipping label. Once verified with our supplier, a replacement or refund will be issued.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">No Returns for Sizing or Decision Changes</h4>
                      <p className="leading-relaxed">
                        Please review sizing charts and product details carefully before placing your order. We cannot accept returns, exchanges, or refunds for customer size selection errors or change of mind.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">30-Minute Cancellation Window</h4>
                      <p className="leading-relaxed">
                        Orders can be canceled directly from the Orders tab within 30 minutes of purchase for an instant 100% refund before warehouse processing begins.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">Refund Processing</h4>
                      <p className="leading-relaxed">
                        Approved refunds are returned to your original payment method (PayPal / Card) within 3 to 5 business days once approved by our supplier claims team.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SHIPPING POLICY */}
              {activeModal === "shipping" && (
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                      <span className="text-xs font-bold uppercase text-slate-400">Processing Window</span>
                      <p className="text-sm sm:text-base font-black text-slate-900">1–2 Business Days</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                      <span className="text-xs font-bold uppercase text-emerald-700">Estimated Transit</span>
                      <p className="text-sm sm:text-base font-black text-emerald-950">3–5 Business Days</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-slate-600">
                    <p>
                      <strong>Free Contiguous US Shipping:</strong> Free tracked ground shipping across the 48 contiguous United States (plus Washington, D.C.).
                    </p>
                    <p>
                      <strong>Carrier Tracking:</strong> Orders dispatch via tracked US domestic ground carriers (USPS / UPS / FedEx) with tracking emailed upon carrier intake.
                    </p>
                    <p>
                      <strong>Physical Street Addresses Only:</strong> P.O. Boxes, military APO/FPO/DPO addresses, Alaska, Hawaii, and US territories are not supported.
                    </p>
                  </div>
                </div>
              )}

              {/* 6. PRIVACY POLICY */}
              {activeModal === "privacy" && (
                <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                  <div>
                    <h4 className="font-bold text-slate-900">Zero Data Selling</h4>
                    <p className="leading-relaxed">
                      We never sell, rent, or trade your contact info or browsing data to third-party brokers or advertisers.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">Payment Security</h4>
                    <p className="leading-relaxed">
                      Transactions are secured via PCI-DSS compliant PayPal Enterprise tokenization. Vastire never stores raw credit card details.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">Consumer Rights</h4>
                    <p className="leading-relaxed">
                      In compliance with CCPA regulations, you may request permanent deletion of your customer records by emailing support@vastire.com.
                    </p>
                  </div>
                </div>
              )}

              {/* 7. SUPPORT (With requested description on top) */}
              {activeModal === "support" && (
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <p className="text-slate-600 leading-relaxed">
                    If you have any questions, inquiries, or need assistance with your order, please reach out to us:
                  </p>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-400 block">Direct Email</span>
                      <a
                        href="mailto:support@vastire.com"
                        className="font-bold text-emerald-700 hover:underline text-sm sm:text-base"
                      >
                        support@vastire.com
                      </a>
                    </div>
                    <a
                      href="mailto:support@vastire.com"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-lg transition active:scale-95"
                    >
                      Email Us
                    </a>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-xs uppercase font-bold text-slate-400 block">Support Hours & SLA</span>
                    <p className="font-bold text-slate-900 text-sm">Monday – Saturday: 9:00 AM – 6:00 PM EST</p>
                    <p className="text-xs sm:text-sm text-slate-500">1–2 business day response target for all inquiries.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Direct Page Link & Close Action */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                {activeModal === "terms" && (
                  <Link
                    href="/terms"
                    prefetch={true}
                    onClick={() => setActiveModal(null)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>Full Policy Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {activeModal === "refund" && (
                  <Link
                    href="/refund-policy"
                    prefetch={true}
                    onClick={() => setActiveModal(null)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>Full Policy Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {activeModal === "shipping" && (
                  <Link
                    href="/shipping-policy"
                    prefetch={true}
                    onClick={() => setActiveModal(null)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>Full Policy Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {activeModal === "privacy" && (
                  <Link
                    href="/privacy"
                    prefetch={true}
                    onClick={() => setActiveModal(null)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>Full Policy Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {activeModal === "support" && (
                  <a
                    href="mailto:support@vastire.com"
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>support@vastire.com</span>
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
                {activeModal === "faqs" && (
                  <button
                    type="button"
                    onClick={() => setActiveModal("support")}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>Need help? Contact Support</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeModal === "track-order" && (
                  <span className="text-xs text-slate-400">
                    Dual-factor protected
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
