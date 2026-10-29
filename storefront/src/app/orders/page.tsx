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
} from "lucide-react";
import { auth, loginWithGoogle } from "@/lib/firebase";
import {
  getUserAuthState,
  getCustomerOrders,
  lookupOrdersDualFactor,
  updateOrderAddress,
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
  if (!img || img === "/placeholder.jpg" || !slug) {
    const cleanT = (title || "").toLowerCase();
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

  // Live Timer tick for 30-min countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate Orders from Neon Database & Local Storage
  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setLoading(true);
      const combinedMap = new Map<string, CustomerOrder>();

      // 1. Read local storage
      try {
        const rawLocal = localStorage.getItem("customer_orders");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach((o: CustomerOrder) => {
              if (o.internal_order_number) combinedMap.set(o.internal_order_number, o);
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
              if (o.internal_order_number) combinedMap.set(o.internal_order_number, o);
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
      const orderItems = order.items && order.items.length > 0 ? order.items : [];
      if (orderItems.length === 0) {
        // Fallback placeholder item if order has no items_json
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
          trackingNumber: order.tracking_number,
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
            trackingNumber: order.tracking_number,
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

  // Open Edit Address Modal
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
      const res = await updateOrderAddress({
        orderNumber: activeItemModal.orderNumber,
        shipping_name: addressForm.shipping_name,
        shipping_address: addressForm.shipping_address,
        shipping_city: addressForm.shipping_city,
        shipping_province: addressForm.shipping_province,
        shipping_zip: addressForm.shipping_zip,
        shipping_phone: addressForm.shipping_phone,
      });

      // Update local state
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

      // Update active modal
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
      }, 1500);
    } catch (err: any) {
      setAddressError(err?.message || "Failed to update delivery address.");
    } finally {
      setAddressSubmitting(false);
    }
  }

  // Render Status Badge
  function renderStatusBadge(status: string, createdAt: string) {
    const s = (status || "").toUpperCase();
    const remaining = getGracePeriodRemaining(createdAt);

    if (s.includes("DELIVERED")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Delivered
        </span>
      );
    }
    if (s.includes("SHIPPED") || s.includes("TRANSIT")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Truck className="w-3.5 h-3.5" />
          Dispatched • In Transit
        </span>
      );
    }
    if (s.includes("SUPPLIER") || s.includes("PROCESSING")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
          <Package className="w-3.5 h-3.5 text-sky-600" />
          Packaging at US Hub
        </span>
      );
    }
    if (remaining) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Order Placed ({remaining} left to edit)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <Check className="w-3.5 h-3.5 text-blue-600" />
        Order Confirmed
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Store Home
        </Link>
        <span>/</span>
        <Link href="/profile" className="hover:text-slate-900 transition">
          My Account
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-black">My Orders</span>
      </div>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            <span>My Orders</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track individual items, view genuine carrier status, or adjust your delivery address.
          </p>
        </div>

        {/* Search Filter */}
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
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 animate-pulse">
              <div className="w-20 h-20 bg-slate-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* ── EMPTY STATE ── */
        <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
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
        /* ── ITEM-CENTRIC ORDERS LIST (FLIPKART / AMAZON STYLE) ── */
        <div className="space-y-3.5">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.orderNumber}-${item.itemIndex}-${idx}`}
              onClick={() => setActiveItemModal(item)}
              className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.itemImage}
                  alt={item.itemTitle}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2">
                    {item.itemTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {item.itemSize && (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Size: {item.itemSize}
                      </span>
                    )}
                    {item.itemColor && (
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Color: {item.itemColor}
                      </span>
                    )}
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {item.itemQuantity} {item.itemQuantity === 1 ? "Unit" : "Units"}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-900">${item.itemPrice.toFixed(2)}/Unit</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-0.5">
                    <span>Order: {item.orderNumber}</span>
                    <span>•</span>
                    <span>{new Date(item.orderCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </div>

              {/* Right: Status Badge & Chevron */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:flex-shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                <div>{renderStatusBadge(item.orderStatus, item.orderCreatedAt)}</div>
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRODUCT ORDER DETAIL MODAL ── */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setActiveItemModal(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header: Item Details */}
            <div className="flex items-start gap-3.5 pr-8 border-b border-slate-100 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeItemModal.itemImage}
                alt={activeItemModal.itemTitle}
                className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {activeItemModal.orderNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5">
                  {activeItemModal.itemTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mt-1">
                  <span>${activeItemModal.itemPrice.toFixed(2)} USD</span>
                  <span>•</span>
                  <span>{activeItemModal.itemQuantity} {activeItemModal.itemQuantity === 1 ? "Unit" : "Units"}</span>
                </div>
              </div>
            </div>

            {/* Tracking Status Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Fulfillment Status:</span>
                <div>{renderStatusBadge(activeItemModal.orderStatus, activeItemModal.orderCreatedAt)}</div>
              </div>

              {/* Carrier Tracking ID */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 block">US Domestic Carrier:</span>
                  <span className="text-xs font-bold text-slate-800">{activeItemModal.carrierName || "USPS Ground"}</span>
                </div>
                <div>
                  {activeItemModal.trackingNumber ? (
                    <a
                      href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${activeItemModal.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track: {activeItemModal.trackingNumber}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Tracking ID assigned upon hub dispatch
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 5-Step Visual Progress Tracker */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Fulfillment Journey</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="space-y-1">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-[10px] font-bold">
                    ✓
                  </div>
                  <div className="text-[11px] font-bold text-slate-900">Placed</div>
                  <div className="text-[10px] text-slate-400">Paid</div>
                </div>
                <div className="space-y-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                    activeItemModal.orderStatus !== "ORDER_PLACED" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {activeItemModal.orderStatus !== "ORDER_PLACED" ? "✓" : "2"}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900">Confirmed</div>
                  <div className="text-[10px] text-slate-400">Locked</div>
                </div>
                <div className="space-y-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                    activeItemModal.trackingNumber || activeItemModal.orderStatus.includes("SHIPPED") ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {activeItemModal.trackingNumber ? "✓" : "3"}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900">Packaging</div>
                  <div className="text-[10px] text-slate-400">US Hub</div>
                </div>
                <div className="space-y-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[10px] font-bold ${
                    activeItemModal.orderStatus.includes("DELIVERED") ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {activeItemModal.orderStatus.includes("DELIVERED") ? "✓" : "4"}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900">Delivery</div>
                  <div className="text-[10px] text-slate-400">3–5 Days</div>
                </div>
              </div>
            </div>

            {/* Delivery Address & 30-Minute Grace Window Control */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>US Delivery Address</span>
                </span>
                {getGracePeriodRemaining(activeItemModal.orderCreatedAt) ? (
                  <button
                    onClick={() => handleStartEditAddress(activeItemModal)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Address</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    🔒 Address Locked
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-900">{activeItemModal.shippingName || "Valued Customer"}</div>
                <div>{activeItemModal.shippingAddress || "Pending delivery address entry"}</div>
                <div>{activeItemModal.shippingCity}, {activeItemModal.shippingProvince} {activeItemModal.shippingZip}</div>
                {activeItemModal.shippingPhone && (
                  <div className="text-[11px] text-slate-500 mt-1">Phone: {activeItemModal.shippingPhone}</div>
                )}
              </div>

              {/* Grace countdown helper */}
              {getGracePeriodRemaining(activeItemModal.orderCreatedAt) && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                  <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>
                    You have <strong>{getGracePeriodRemaining(activeItemModal.orderCreatedAt)}</strong> to modify this address before automated packing begins.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveItemModal(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADDRESS EDIT MODAL ── */}
      {isEditingAddress && activeItemModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Update US Delivery Address</h3>
              </div>
              <button
                onClick={() => setIsEditingAddress(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {addressSuccess ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Address Updated!</h4>
                <p className="text-xs text-slate-500">Your order has been updated with the new delivery destination.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-semibold text-slate-700">Recipient Full Name</label>
                  <input
                    type="text"
                    required
                    value={addressForm.shipping_name}
                    onChange={(e) => setAddressForm({ ...addressForm, shipping_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-700">Street Address &amp; Apt/Suite</label>
                  <input
                    type="text"
                    required
                    value={addressForm.shipping_address}
                    onChange={(e) => setAddressForm({ ...addressForm, shipping_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 123 Main St, Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">City</label>
                    <input
                      type="text"
                      required
                      value={addressForm.shipping_city}
                      onChange={(e) => setAddressForm({ ...addressForm, shipping_city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. Los Angeles"
                    />
                  </div>

                  <div>
                    <ThemedDropdown
                      label="State"
                      options={US_STATES}
                      value={addressForm.shipping_province}
                      onChange={(val) => setAddressForm({ ...addressForm, shipping_province: val })}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">5-Digit US ZIP</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={addressForm.shipping_zip}
                      onChange={(e) => setAddressForm({ ...addressForm, shipping_zip: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. 90210"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">Contact Phone</label>
                    <input
                      type="tel"
                      value={addressForm.shipping_phone}
                      onChange={(e) => setAddressForm({ ...addressForm, shipping_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                {addressError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{addressError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {addressSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Address</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
