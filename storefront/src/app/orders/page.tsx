"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  ExternalLink,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Search,
  MapPin,
  AlertCircle,
  X,
  Edit2,
  Check,
  ShieldCheck,
  Loader2,
  Ban,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  getCustomerOrders,
  updateOrderAddress,
  cancelCustomerOrder,
  FALLBACK_PRODUCTS,
} from "@/lib/api";
import { CustomerOrder } from "@/lib/types";
import ThemedDropdown, { ThemedDropdownOption } from "@/components/ui/ThemedDropdown";

const US_STATES: ThemedDropdownOption[] = [
  { value: "AL", label: "Alabama (AL)" },
  { value: "AK", label: "Alaska (AK)" },
  { value: "AZ", label: "Arizona (AZ)" },
  { value: "AR", label: "Arkansas (AR)" },
  { value: "CA", label: "California (CA)" },
  { value: "CO", label: "Colorado (CO)" },
  { value: "CT", label: "Connecticut (CT)" },
  { value: "DE", label: "Delaware (DE)" },
  { value: "FL", label: "Florida (FL)" },
  { value: "GA", label: "Georgia (GA)" },
  { value: "HI", label: "Hawaii (HI)" },
  { value: "ID", label: "Idaho (ID)" },
  { value: "IL", label: "Illinois (IL)" },
  { value: "IN", label: "Indiana (IN)" },
  { value: "IA", label: "Iowa (IA)" },
  { value: "KS", label: "Kansas (KS)" },
  { value: "KY", label: "Kentucky (KY)" },
  { value: "LA", label: "Louisiana (LA)" },
  { value: "ME", label: "Maine (ME)" },
  { value: "MD", label: "Maryland (MD)" },
  { value: "MA", label: "Massachusetts (MA)" },
  { value: "MI", label: "Michigan (MI)" },
  { value: "MN", label: "Minnesota (MN)" },
  { value: "MS", label: "Mississippi (MS)" },
  { value: "MO", label: "Missouri (MO)" },
  { value: "MT", label: "Montana (MT)" },
  { value: "NE", label: "Nebraska (NE)" },
  { value: "NV", label: "Nevada (NV)" },
  { value: "NH", label: "New Hampshire (NH)" },
  { value: "NJ", label: "New Jersey (NJ)" },
  { value: "NM", label: "New Mexico (NM)" },
  { value: "NY", label: "New York (NY)" },
  { value: "NC", label: "North Carolina (NC)" },
  { value: "ND", label: "North Dakota (ND)" },
  { value: "OH", label: "Ohio (OH)" },
  { value: "OK", label: "Oklahoma (OK)" },
  { value: "OR", label: "Oregon (OR)" },
  { value: "PA", label: "Pennsylvania (PA)" },
  { value: "RI", label: "Rhode Island (RI)" },
  { value: "SC", label: "South Carolina (SC)" },
  { value: "SD", label: "South Dakota (SD)" },
  { value: "TN", label: "Tennessee (TN)" },
  { value: "TX", label: "Texas (TX)" },
  { value: "UT", label: "Utah (UT)" },
  { value: "VT", label: "Vermont (VT)" },
  { value: "VA", label: "Virginia (VA)" },
  { value: "WA", label: "Washington (WA)" },
  { value: "WV", label: "West Virginia (WV)" },
  { value: "WI", label: "Wisconsin (WI)" },
  { value: "WY", label: "Wyoming (WY)" },
];

interface FlatOrderItem {
  orderNumber: string;
  orderId: number;
  orderCreatedAt: string;
  orderStatus: string;
  totalRetail: number;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingZip?: string;
  shippingPhone?: string;
  carrierName?: string;
  trackingNumber?: string | null;
  itemTitle: string;
  itemSlug?: string;
  itemImage: string;
  itemQuantity: number;
  itemPrice: number;
  itemSize?: string;
  itemColor?: string;
  itemIndex: number;
}

function resolveItemImage(title: string, rawImg?: string, rawSlug?: string) {
  let img = rawImg;
  let slug = rawSlug;
  const cleanT = (title || "").toLowerCase();

  // If knife, ensure valid high-carbon steel knife image
  if (cleanT.includes("knife") && (!img || img.includes("1715848") || img === "/placeholder.jpg")) {
    img = "https://cf.cjdropshipping.com/20180906/286623069125331.png";
  }

  if (!img || img === "/placeholder.jpg" || !slug) {
    const matched = FALLBACK_PRODUCTS.find(
      (p) =>
        p.title.toLowerCase() === cleanT ||
        cleanT.includes(p.title.toLowerCase()) ||
        p.title.toLowerCase().includes(cleanT)
    );
    if (matched) {
      if (!img || img === "/placeholder.jpg") img = matched.hero_image_url || matched.images?.[0];
      if (!slug) slug = matched.slug;
    }
  }
  return {
    image: img && img !== "/placeholder.jpg" ? img : FALLBACK_PRODUCTS[0]?.hero_image_url || "/placeholder.jpg",
    slug: slug ? `/products/${slug}` : undefined,
  };
}

function sanitizeTrackingNumber(tracking: string | null | undefined, status: string): string | null {
  if (!tracking) return null;
  const s = (status || "").toUpperCase();
  const isDispatched = s.includes("SHIPPED") || s.includes("TRANSIT") || s.includes("DELIVERED");
  if (!isDispatched) return null;
  if (tracking.startsWith("9400111899223344556677")) return null;
  return tracking;
}

function OrdersContent() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItemModal, setActiveItemModal] = useState<FlatOrderItem | null>(null);

  // Address Edit Modal State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    shipping_name: "",
    shipping_address: "",
    shipping_city: "",
    shipping_province: "CA",
    shipping_zip: "",
    shipping_phone: "",
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState(false);

  // Cancellation Modal State
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelReason, setCancelReason] = useState("Ordered by mistake");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  // Live Timer tick for 30-min countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lock background body scrolling when modal is open
  useEffect(() => {
    if (activeItemModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeItemModal]);

  // Hydrate Orders from Neon Database & Local Storage
  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setLoading(true);
      const combinedMap = new Map<string, CustomerOrder>();

      // 1. Read local storage (and sanitize any dirty old mock tracking numbers)
      try {
        const rawLocal = localStorage.getItem("customer_orders");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach((o: CustomerOrder) => {
              if (o.internal_order_number) {
                o.tracking_number = sanitizeTrackingNumber(o.tracking_number, o.status);
                combinedMap.set(o.internal_order_number, o);
              }
            });
          }
        }
      } catch {}

      // 2. Fetch authenticated DB orders if signed in
      const currentUser = auth.currentUser;
      if (currentUser?.email) {
        try {
          const dbOrders = await getCustomerOrders(currentUser.email);
          if (Array.isArray(dbOrders)) {
            dbOrders.forEach((o: CustomerOrder) => {
              if (o.internal_order_number) {
                o.tracking_number = sanitizeTrackingNumber(o.tracking_number, o.status);
                combinedMap.set(o.internal_order_number, o);
              }
            });
          }
        } catch {}
      }

      const list = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (isMounted) {
        setOrders(list);
        setLoading(false);
      }
    }

    loadOrders();

    const unsub = auth.onAuthStateChanged(() => {
      loadOrders();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Flatten orders into item-centric cards
  const flatItems: FlatOrderItem[] = useMemo(() => {
    const items: FlatOrderItem[] = [];
    orders.forEach((order) => {
      const cleanTracking = sanitizeTrackingNumber(order.tracking_number, order.status);
      const orderItems = order.items && order.items.length > 0 ? order.items : [];
      if (orderItems.length === 0) {
        const resolved = resolveItemImage("Domestic Lab Essential");
        items.push({
          orderNumber: order.internal_order_number,
          orderId: order.id,
          orderCreatedAt: order.created_at,
          orderStatus: order.status || "ORDER_PLACED",
          totalRetail: Number(order.total_retail || 0),
          shippingName: order.shipping_name,
          shippingAddress: order.shipping_address,
          shippingCity: order.shipping_city,
          shippingProvince: order.shipping_province,
          shippingZip: order.shipping_zip,
          shippingPhone: order.customer_phone,
          carrierName: order.carrier_name,
          trackingNumber: cleanTracking,
          itemTitle: "Domestic Lab Essential",
          itemSlug: resolved.slug,
          itemImage: resolved.image,
          itemQuantity: 1,
          itemPrice: Number(order.total_retail || 0),
          itemIndex: 0,
        });
      } else {
        orderItems.forEach((it: any, idx: number) => {
          const rawTitle = it.product_title || it.title || "Domestic Lab Essential";
          const rawImg = it.image_url || it.image || it.hero_image_url;
          const resolved = resolveItemImage(rawTitle, rawImg, it.slug);
          items.push({
            orderNumber: order.internal_order_number,
            orderId: order.id,
            orderCreatedAt: order.created_at,
            orderStatus: order.status || "ORDER_PLACED",
            totalRetail: Number(order.total_retail || 0),
            shippingName: order.shipping_name,
            shippingAddress: order.shipping_address,
            shippingCity: order.shipping_city,
            shippingProvince: order.shipping_province,
            shippingZip: order.shipping_zip,
            shippingPhone: order.customer_phone,
            carrierName: order.carrier_name,
            trackingNumber: cleanTracking,
            itemTitle: rawTitle,
            itemSlug: resolved.slug,
            itemImage: resolved.image,
            itemQuantity: Number(it.quantity || 1),
            itemPrice: Number(it.price || it.unit_price || 0),
            itemSize: it.size || it.selectedSize,
            itemColor: it.color || it.selectedColor,
            itemIndex: idx,
          });
        });
      }
    });
    return items;
  }, [orders]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return flatItems;
    const q = searchQuery.toLowerCase().trim();
    return flatItems.filter(
      (item) =>
        item.itemTitle.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        (item.trackingNumber && item.trackingNumber.toLowerCase().includes(q))
    );
  }, [flatItems, searchQuery]);

  // Grace Period Calculator
  function getGracePeriodRemaining(createdAt: string) {
    const createdMs = new Date(createdAt).getTime();
    const expireMs = createdMs + 30 * 60 * 1000;
    const diff = expireMs - currentTime;
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }

  // Open Edit Address Mode
  function handleStartEditAddress(item: FlatOrderItem) {
    setAddressForm({
      shipping_name: item.shippingName || "",
      shipping_address: item.shippingAddress || "",
      shipping_city: item.shippingCity || "",
      shipping_province: item.shippingProvince || "CA",
      shipping_zip: item.shippingZip || "",
      shipping_phone: item.shippingPhone || "",
    });
    setAddressError(null);
    setAddressSuccess(false);
    setIsEditingAddress(true);
  }

  // Save Address via Server API
  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!activeItemModal) return;

    setAddressSubmitting(true);
    setAddressError(null);

    try {
      await updateOrderAddress({
        orderNumber: activeItemModal.orderNumber,
        shipping_name: addressForm.shipping_name,
        shipping_address: addressForm.shipping_address,
        shipping_city: addressForm.shipping_city,
        shipping_province: addressForm.shipping_province,
        shipping_zip: addressForm.shipping_zip,
        shipping_phone: addressForm.shipping_phone,
      });

      // Update orders in state
      setOrders((prev) =>
        prev.map((o) => {
          if (o.internal_order_number === activeItemModal.orderNumber) {
            return {
              ...o,
              shipping_name: addressForm.shipping_name,
              shipping_address: addressForm.shipping_address,
              shipping_city: addressForm.shipping_city,
              shipping_province: addressForm.shipping_province,
              shipping_zip: addressForm.shipping_zip,
              customer_phone: addressForm.shipping_phone,
            };
          }
          return o;
        })
      );

      // Update active item modal
      setActiveItemModal((prev) =>
        prev
          ? {
              ...prev,
              shippingName: addressForm.shipping_name,
              shippingAddress: addressForm.shipping_address,
              shippingCity: addressForm.shipping_city,
              shippingProvince: addressForm.shipping_province,
              shippingZip: addressForm.shipping_zip,
              shippingPhone: addressForm.shipping_phone,
            }
          : null
      );

      setAddressSuccess(true);
      setTimeout(() => {
        setIsEditingAddress(false);
        setAddressSuccess(false);
      }, 1200);
    } catch (err: any) {
      setAddressError(err?.message || "Failed to update delivery address.");
    } finally {
      setAddressSubmitting(false);
    }
  }

  // Confirm Cancellation & Automated 100% Full Refund via PayPal
  async function handleConfirmCancel() {
    if (!activeItemModal) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const userEmail = auth.currentUser?.email || undefined;
      const res = await cancelCustomerOrder({
        orderNumber: activeItemModal.orderNumber,
        customer_email: userEmail,
        reason: cancelReason,
      });

      setCancelSuccess(
        res.message || "Order cancelled successfully. 100% full refund issued."
      );

      // Optimistically update active modal
      setActiveItemModal((prev) =>
        prev
          ? {
              ...prev,
              orderStatus: "CANCELLED",
            }
          : null
      );

      // Optimistically update orders in list
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.internal_order_number === activeItemModal.orderNumber
            ? { ...o, status: "CANCELLED" }
            : o
        )
      );

      setTimeout(() => {
        setIsCancellingOrder(false);
        setCancelSuccess(null);
      }, 2000);
    } catch (err: any) {
      setCancelError(err?.message || "Failed to cancel order. Please try again.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  // Render Status Badge for Modal (WITHOUT countdown timer to avoid duplication)
  function renderModalStatusBadge(status: string, createdAt: string) {
    const s = (status || "").toUpperCase();
    const remaining = getGracePeriodRemaining(createdAt);

    if (s.includes("CANCEL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <X className="w-3 h-3 text-rose-600" />
          Order Cancelled (Refunded)
        </span>
      );
    }
    if (s.includes("DELIVERED")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Delivered
        </span>
      );
    }
    if (s.includes("SHIPPED") || s.includes("TRANSIT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Truck className="w-3 h-3" />
          Dispatched • In Transit
        </span>
      );
    }
    if (s.includes("SUPPLIER") || s.includes("PROCESSING")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
          <Package className="w-3 h-3 text-sky-600" />
          Packaging at US Hub
        </span>
      );
    }
    if (remaining) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Order Placed (Grace Window)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <Check className="w-3 h-3 text-blue-600" />
        Order Confirmed
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pb-16 space-y-4">
      {/* ── HEADER (Back button before icon, no breadcrumbs, no description) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition flex-shrink-0"
            aria-label="Back to account"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            My Orders
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ordered items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* ── LOADING SKELETON ── */}
      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 animate-pulse">
              <div className="w-16 h-16 bg-slate-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* ── EMPTY STATE ── */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery ? "No ordered items matched your search query." : "You have not placed any orders yet. Discover our top-rated domestic essentials!"}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <span>Start Shopping</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* ── CLEAN ITEM CARDS: ONLY Product Image, Name, Unit & Price ── */
        <div className="space-y-2.5">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.orderNumber}-${item.itemIndex}-${idx}`}
              onClick={() => {
                setActiveItemModal(item);
                setIsEditingAddress(false);
                setIsCancellingOrder(false);
                setCancelError(null);
                setCancelSuccess(null);
              }}
              className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-xs transition-all duration-200 cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.itemImage}
                  alt={item.itemTitle}
                  onError={(e) => {
                    const isKnife = (item.itemTitle || "").toLowerCase().includes("knife");
                    e.currentTarget.src = isKnife
                      ? "https://cf.cjdropshipping.com/20180906/286623069125331.png"
                      : FALLBACK_PRODUCTS[0]?.hero_image_url || "/placeholder.jpg";
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1 leading-snug">
                    {item.itemTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-xs">
                      {item.itemQuantity} {item.itemQuantity === 1 ? "Unit" : "Units"}
                    </span>
                    <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                      ${(item.itemPrice * item.itemQuantity).toFixed(2)}
                    </span>
                    {item.orderStatus && item.orderStatus.toUpperCase().includes("CANCEL") ? (
                      <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                        Cancelled
                      </span>
                    ) : (
                      item.orderCreatedAt && (
                        <span className="text-[11px] font-semibold text-slate-400 pl-0.5">
                          • {new Date(item.orderCreatedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Right Arrow */}
              <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition flex-shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ORDER DETAIL POP-UP (Uniform backdrop-blur-sm, z-[9999], scroll locked, space optimized) ── */}
      {activeItemModal && (
        <div
          className="fixed inset-0 z-[9999] w-full h-full min-h-[100dvh] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveItemModal(null);
              setIsEditingAddress(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-4 sm:p-5 space-y-3.5 border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => {
                setActiveItemModal(null);
                setIsEditingAddress(false);
              }}
              className="absolute right-3.5 top-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Order Number & Product */}
            <div className="flex items-center gap-3 pr-8 border-b border-slate-100 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeItemModal.itemImage}
                alt={activeItemModal.itemTitle}
                onError={(e) => {
                  const isKnife = (activeItemModal.itemTitle || "").toLowerCase().includes("knife");
                  e.currentTarget.src = isKnife
                    ? "https://cf.cjdropshipping.com/20180906/286623069125331.png"
                    : FALLBACK_PRODUCTS[0]?.hero_image_url || "/placeholder.jpg";
                }}
                className="w-12 h-12 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase truncate">
                  {activeItemModal.orderNumber}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                  {activeItemModal.itemTitle}
                </h3>
                <div className="text-[11px] font-semibold text-emerald-700">
                  ${activeItemModal.itemPrice.toFixed(2)} USD • {activeItemModal.itemQuantity} {activeItemModal.itemQuantity === 1 ? "Unit" : "Units"}
                </div>
              </div>
            </div>

            {/* If In Address Edit Mode, show form right here */}
            {isEditingAddress ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Update Delivery Address</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                {addressSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                    <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800">Address Updated Successfully!</p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAddress} className="space-y-2.5 text-xs">
                    <div>
                      <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">Full Name</label>
                      <input
                        type="text"
                        required
                        value={addressForm.shipping_name}
                        onChange={(e) => setAddressForm({ ...addressForm, shipping_name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">Street Address</label>
                      <input
                        type="text"
                        required
                        value={addressForm.shipping_address}
                        onChange={(e) => setAddressForm({ ...addressForm, shipping_address: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">City</label>
                        <input
                          type="text"
                          required
                          value={addressForm.shipping_city}
                          onChange={(e) => setAddressForm({ ...addressForm, shipping_city: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">State</label>
                        <ThemedDropdown
                          options={US_STATES}
                          value={addressForm.shipping_province}
                          onChange={(val) => setAddressForm({ ...addressForm, shipping_province: val })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">ZIP Code</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={addressForm.shipping_zip}
                          onChange={(e) => setAddressForm({ ...addressForm, shipping_zip: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5 text-[11px] font-semibold text-slate-600">Phone</label>
                        <input
                          type="tel"
                          value={addressForm.shipping_phone}
                          onChange={(e) => setAddressForm({ ...addressForm, shipping_phone: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {addressError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
                        {addressError}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={addressSubmitting}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                      >
                        {addressSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save New Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : isCancellingOrder ? (
              /* ── ORDER CANCELLATION VIEW (Within 30-min Grace Window) ── */
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Order #{activeItemModal.orderNumber}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCancellingOrder(false);
                      setCancelError(null);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Go Back
                  </button>
                </div>

                {cancelSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1 animate-in fade-in">
                    <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800">{cancelSuccess}</p>
                    <p className="text-[11px] text-emerald-700">
                      100% of your payment has been automatically refunded to your original payment method.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {/* Grace Period Notification */}
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1 text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>30-Minute Cancellation Grace Window</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        You have <strong>{getGracePeriodRemaining(activeItemModal.orderCreatedAt)}</strong> left to cancel. Once confirmed, orders enter warehouse packaging and cannot be voided.
                      </p>
                    </div>

                    {/* Refund Guarantee */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                        <span>Total Refund Amount:</span>
                        <span className="text-emerald-700 font-extrabold text-sm">
                          ${activeItemModal.totalRetail.toFixed(2)} USD
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        100% full refund directly returned to your original payment method via PayPal. Zero fees deducted.
                      </p>
                    </div>

                    {/* Reason Selector */}
                    <div>
                      <label className="block mb-1 text-[11px] font-semibold text-slate-700">
                        Reason for cancellation:
                      </label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="Ordered by mistake">Ordered by mistake</option>
                        <option value="Need to change shipping address or item">Need to change shipping address or item</option>
                        <option value="Found better price elsewhere">Found better price elsewhere</option>
                        <option value="Changed mind / No longer needed">Changed mind / No longer needed</option>
                        <option value="Delivery time is too long">Delivery time is too long</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {cancelError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px] leading-snug">
                        {cancelError}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={cancelSubmitting}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {cancelSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing Refund...</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Confirm Cancellation ($ {activeItemModal.totalRetail.toFixed(2)})</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancellingOrder(false);
                          setCancelError(null);
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                      >
                        Keep Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Detail View */
              <>
                {/* Fulfillment Status & Tracking in ONE sleek box */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Fulfillment Status:</span>
                    <div>{renderModalStatusBadge(activeItemModal.orderStatus, activeItemModal.orderCreatedAt)}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Domestic Carrier:</span>
                      <span className="font-bold text-slate-800 text-[11px]">{activeItemModal.carrierName || "USPS Ground"}</span>
                    </div>
                    <div>
                      {activeItemModal.trackingNumber ? (
                        <a
                          href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${activeItemModal.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                        >
                          <Truck className="w-3 h-3" />
                          <span>{activeItemModal.trackingNumber}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Assigned upon dispatch
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 4-STEP FULFILLMENT STEPPER OR CANCELLED BANNER ── */}
                {activeItemModal.orderStatus.toUpperCase().includes("CANCEL") ? (
                  <div className="border border-rose-200 bg-rose-50/70 rounded-xl p-3.5 text-center space-y-1.5">
                    <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto text-xs font-bold">
                      ✕
                    </div>
                    <div className="text-xs font-bold text-rose-900">
                      Order Cancelled & 100% Refunded
                    </div>
                    <div className="text-[11px] text-rose-700 leading-relaxed max-w-xs mx-auto">
                      A 100% full refund of <strong>${activeItemModal.totalRetail.toFixed(2)} USD</strong> has been automatically returned to your original payment method via PayPal.
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Fulfillment Progress
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {/* Step 1: Placed */}
                      <div className="space-y-0.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-[10px] font-bold">
                          ✓
                        </div>
                        <div className="text-[10px] font-bold text-slate-900">Placed</div>
                        <div className="text-[9px] text-slate-400">Verified</div>
                      </div>

                      {/* Step 2: Confirmed */}
                      {(() => {
                        const isGrace = !!getGracePeriodRemaining(activeItemModal.orderCreatedAt);
                        const isConfirmed = !isGrace;
                        return (
                          <div className="space-y-0.5">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                                isConfirmed ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {isConfirmed ? "✓" : "2"}
                            </div>
                            <div className="text-[10px] font-bold text-slate-900">Confirmed</div>
                            <div className="text-[9px] text-slate-400">{isConfirmed ? "Locked" : "Grace"}</div>
                          </div>
                        );
                      })()}

                      {/* Step 3: Packaging */}
                      {(() => {
                        const s = (activeItemModal.orderStatus || "").toUpperCase();
                        const isPackaged = s.includes("SHIPPED") || s.includes("TRANSIT") || s.includes("DELIVERED");
                        const isPackagingInProgress = s.includes("SUPPLIER") || s.includes("PROCESSING");

                        return (
                          <div className="space-y-0.5">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                                isPackaged
                                  ? "bg-emerald-600 text-white"
                                  : isPackagingInProgress
                                  ? "bg-sky-100 text-sky-800 border border-sky-300"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {isPackaged ? (
                                "✓"
                              ) : isPackagingInProgress ? (
                                <Clock className="w-3 h-3 text-sky-700 animate-spin" />
                              ) : (
                                <Clock className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-slate-900">Packaging</div>
                            <div className="text-[9px] text-slate-400">
                              {isPackaged ? "Completed" : isPackagingInProgress ? "In Hub" : "Queued"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 4: Delivery */}
                      {(() => {
                        const s = (activeItemModal.orderStatus || "").toUpperCase();
                        const isDelivered = s.includes("DELIVERED");
                        const isShipped = s.includes("SHIPPED") || s.includes("TRANSIT");

                        return (
                          <div className="space-y-0.5">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                                isDelivered
                                  ? "bg-emerald-600 text-white"
                                  : isShipped
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-100 text-slate-400 border border-slate-200"
                              }`}
                            >
                              {isDelivered ? "✓" : isShipped ? <Truck className="w-3 h-3" /> : "4"}
                            </div>
                            <div className="text-[10px] font-bold text-slate-900">Delivery</div>
                            <div className="text-[9px] text-slate-400">
                              {isDelivered ? "Delivered" : isShipped ? "In Transit" : "3–5 Days"}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── US DELIVERY ADDRESS & GRACE WINDOW (Timer ONLY here) ── */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>US Delivery Address</span>
                    </span>
                    {activeItemModal.orderStatus.toUpperCase().includes("CANCEL") ? (
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Order Voided
                      </span>
                    ) : getGracePeriodRemaining(activeItemModal.orderCreatedAt) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setIsCancellingOrder(true);
                            setIsEditingAddress(false);
                            setCancelError(null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                        >
                          <Ban className="w-3 h-3 text-rose-600" />
                          <span>Cancel Order</span>
                        </button>
                        <button
                          onClick={() => {
                            handleStartEditAddress(activeItemModal);
                            setIsCancellingOrder(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Address</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        🔒 Address Locked
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="font-bold text-slate-900">{activeItemModal.shippingName || "Valued Customer"}</div>
                    <div>{activeItemModal.shippingAddress || "Pending delivery address entry"}</div>
                    <div>
                      {activeItemModal.shippingCity}, {activeItemModal.shippingProvince} {activeItemModal.shippingZip}
                    </div>
                    {activeItemModal.shippingPhone && (
                      <div className="text-[10px] text-slate-400 mt-0.5">Phone: {activeItemModal.shippingPhone}</div>
                    )}
                  </div>

                  {/* Grace Countdown Helper - ONLY placed here */}
                  {getGracePeriodRemaining(activeItemModal.orderCreatedAt) &&
                    !activeItemModal.orderStatus.toUpperCase().includes("CANCEL") && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/80">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>
                          You have <strong>{getGracePeriodRemaining(activeItemModal.orderCreatedAt)}</strong> left to edit this address or cancel for a 100% full refund.
                        </span>
                      </div>
                    )}
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setActiveItemModal(null)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-xs font-semibold">
          Loading Orders...
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
