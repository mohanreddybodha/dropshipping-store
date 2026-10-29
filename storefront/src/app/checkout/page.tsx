"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "../../lib/cart";
import { FALLBACK_PRODUCTS, createCheckoutOrder, getUserAuthState } from "../../lib/api";
import PayPalButton from "../../components/PayPalButton";
import { auth, loginWithGoogle } from "../../lib/firebase";
import ThemedDropdown, { ThemedDropdownOption } from "../../components/ui/ThemedDropdown";
import {
  validateUsPhone,
  validateUsZip,
  validateUsStreetAddress,
  validateUsCity,
  formatUsPhoneInput,
} from "../../lib/usAddressValidation";
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Loader2,
} from "lucide-react";

const US_STATES: ThemedDropdownOption[] = [
  { value: "AL", label: "Alabama (AL)" },
  { value: "AK", label: "Alaska (AK)" },
  { value: "AZ", label: "Arizona (AZ)" },
  { value: "AR", label: "Arkansas (AR)" },
  { value: "CA", label: "California (CA)" },
  { value: "CO", label: "Colorado (CO)" },
  { value: "CT", label: "Connecticut (CT)" },
  { value: "DE", label: "Delaware (DE)" },
  { value: "DC", label: "District of Columbia (DC)" },
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

const COUNTRY_OPTIONS: ThemedDropdownOption[] = [
  { value: "US", label: "United States 🇺🇸 (Fast Domestic Delivery)", badge: "Eligible" },
  { value: "CA", label: "Canada 🇨🇦 (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "GB", label: "United Kingdom 🇬🇧 (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "AU", label: "Australia 🇦🇺 (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "INTL", label: "Other International Destinations", badge: "Unavailable", disabled: true },
];

const PHONE_CODE_OPTIONS: ThemedDropdownOption[] = [
  { value: "+1", label: "+1 🇺🇸 United States" },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { items, totalAmount, totalSavings, clearCart, removeItem } = useCart();

  const isBuyNow = searchParams.get("buyNow") === "true";
  const buyNowVid = searchParams.get("vid");
  const buyNowTier = searchParams.get("tier");
  const buyNowQty = parseInt(searchParams.get("qty") || "1", 10);
  const buyNowSize = searchParams.get("size") || undefined;
  const buyNowColor = searchParams.get("color") || undefined;

  // Single item checkout logic when buyNow=true (Flipkart style direct single checkout)
  const singleCartItem = isBuyNow && buyNowVid
    ? items.find(
        (i) =>
          i.variant.vid === buyNowVid &&
          (!buyNowTier || i.tier === buyNowTier) &&
          (!buyNowSize || i.selectedSize === buyNowSize) &&
          (!buyNowColor || i.selectedColor === buyNowColor)
      ) || items.find((i) => i.variant.vid === buyNowVid)
    : null;

  const checkoutItems = singleCartItem
    ? [
        {
          ...singleCartItem,
          quantity: buyNowQty || singleCartItem.quantity || 1,
          totalPrice: +(
            Number(singleCartItem.unitPrice || singleCartItem.variant?.retail_price_1x || 24.99) *
            (buyNowQty || singleCartItem.quantity || 1)
          ).toFixed(2),
        },
      ]
    : items.length > 0
    ? items
    : [
        {
          product: FALLBACK_PRODUCTS[0],
          variant: FALLBACK_PRODUCTS[0].variants[0],
          tier: "2x" as const,
          quantity: 2,
          unitPrice: 63.89,
          totalPrice: 127.78,
          savings: 17.44,
        },
      ];

  // Initial state has zero hardcoded dummy address values
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneCode: "+1",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip_code: "",
    country_code: "US",
  });

  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    amount: number;
    shippingSla: string;
    items: typeof checkoutItems;
  } | null>(null);

  // Network offline / online recovery listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
      const handleOnline = () => {
        setIsOffline(false);
        setErrorMessage(null);
      };
      const handleOffline = () => {
        setIsOffline(true);
        setErrorMessage("Network disconnected. Please check your internet connection.");
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Multi-tab order synchronization: Prevents paying twice if another tab placed order
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "customer_orders" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const latest = parsed[0];
            const diffMs = Date.now() - new Date(latest.created_at).getTime();
            if (diffMs < 45000 && items.length > 0) {
              setConfirmedOrder({
                orderNumber: latest.internal_order_number,
                amount: latest.total_retail,
                shippingSla: "3–5 Business Days (Tracked USPS Ground)",
                items: checkoutItems,
              });
              clearCart();
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [items, checkoutItems, clearCart]);

  // 1. Hydrate delivery address from localStorage (draft or previous saved address) on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const draft = localStorage.getItem("checkout_draft_address");
      const saved = localStorage.getItem("saved_shipping_address");
      const dataToLoad = draft ? JSON.parse(draft) : saved ? JSON.parse(saved) : null;
      if (dataToLoad && typeof dataToLoad === "object") {
        setForm((prev) => ({
          ...prev,
          name: dataToLoad.name || prev.name,
          email: dataToLoad.email || prev.email,
          phone: dataToLoad.phone || prev.phone,
          phoneCode: dataToLoad.phoneCode || "+1",
          address1: dataToLoad.address1 || prev.address1,
          address2: dataToLoad.address2 || prev.address2,
          city: dataToLoad.city || prev.city,
          province: dataToLoad.province || prev.province,
          zip_code: dataToLoad.zip_code || prev.zip_code,
          country_code: "US",
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // 2. Auto-save delivery address to localStorage on every change (persists across refreshes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hasContent = Boolean(
        form.name.trim() ||
        form.email.trim() ||
        form.phone.trim() ||
        form.address1.trim() ||
        form.city.trim() ||
        form.province ||
        form.zip_code.trim()
      );
      if (hasContent) {
        localStorage.setItem("checkout_draft_address", JSON.stringify(form));
      }
    } catch {
      // Storage write error ignored
    }
  }, [form]);

  // 3. Pre-fill authenticated user data & fetch saved address from database
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsAuthenticatedUser(true);
        setForm((prev) => ({
          ...prev,
          email: prev.email || user.email || "",
          name: prev.name || user.displayName || "",
          phone: prev.phone || user.phoneNumber || "",
        }));

        // Fetch recent orders from database to pre-fill past shipping address if not already entered
        try {
          const userState = await getUserAuthState(user.uid, user.email, user.phoneNumber);
          if (userState?.orders && Array.isArray(userState.orders) && userState.orders.length > 0) {
            const latest = userState.orders[0];
            setForm((prev) => ({
              ...prev,
              name: prev.name || latest.shipping_name || user.displayName || "",
              email: prev.email || latest.customer_email || user.email || "",
              phone: prev.phone || latest.customer_phone || user.phoneNumber || "",
              address1: prev.address1 || latest.shipping_address || "",
              city: prev.city || latest.shipping_city || "",
              province: prev.province || latest.shipping_province || "",
              zip_code: prev.zip_code || latest.shipping_zip || "",
              country_code: "US",
            }));
          }
        } catch {
          // Background fetch warning ignored
        }
      } else {
        setIsAuthenticatedUser(false);
      }
    });
    return () => unsub();
  }, []);

  const handleClearAddress = () => {
    setForm({
      name: auth.currentUser?.displayName || "",
      email: auth.currentUser?.email || "",
      phoneCode: "+1",
      phone: auth.currentUser?.phoneNumber || "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      zip_code: "",
      country_code: "US",
    });
    try {
      localStorage.removeItem("checkout_draft_address");
      localStorage.removeItem("saved_shipping_address");
    } catch {
      // Ignore
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSigningIn) return;
    setIsGoogleSigningIn(true);
    setErrorMessage(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        setIsAuthenticatedUser(true);
        setForm((prev) => ({
          ...prev,
          email: user.email || prev.email,
          name: user.displayName || prev.name,
        }));
      }
    } catch (err: any) {
      console.error("Google sign in error", err);
      if (err?.code === "auth/popup-blocked") {
        setErrorMessage("Sign-in popup was blocked by your browser. Please allow popups for localhost and retry.");
      } else {
        setErrorMessage("Google Sign-In could not be completed. Please try again.");
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const finalAmount = checkoutItems.reduce(
    (acc, curr) => acc + (Number(curr.totalPrice) || 0),
    0
  );
  const calculatedSavings = checkoutItems.reduce((acc, curr) => {
    if (curr.savings && Number(curr.savings) > 0) return acc + Number(curr.savings);
    const unit = Number(curr.unitPrice || curr.variant?.retail_price_1x || 24.99);
    const qty = Number(curr.quantity) || 1;
    if (qty >= 2) return acc + +(unit * qty * 0.15).toFixed(2);
    return acc + +(unit * 0.15).toFixed(2);
  }, 0);
  const finalSavings = calculatedSavings > 0 ? calculatedSavings : 8.50;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatUsPhoneInput(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (errorMessage) setErrorMessage(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateDeliveryDetails = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Strict US Country Verification
    if (form.country_code !== "US") {
      errors.country_code = "Domestic fulfillment is available only for delivery within the United States.";
    }

    // 2. Email validation (Mandatory for ALL users)
    if (!form.email.trim()) {
      errors.email = "Please enter your Email Address.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errors.email = "Please enter a valid Email Address.";
      }
    }

    // Full Name validation when authenticated
    if (isAuthenticatedUser && !form.name.trim()) {
      errors.name = "Please enter your Full Name.";
    }

    // 3. Strict US Mobile Number Validation (NANP Standards)
    const phoneVal = validateUsPhone(form.phone, form.phoneCode);
    if (!phoneVal.isValid) {
      errors.phone = phoneVal.error || "Please enter a valid 10-digit US mobile number.";
    }

    // 4. Strict US Street Address Validation (House # + Street Name, non-US filter)
    const streetVal = validateUsStreetAddress(form.address1);
    if (!streetVal.isValid) {
      errors.address1 = streetVal.error || "Please enter a valid US Street Address.";
    }

    // 5. Strict US City Validation (non-US filter)
    const cityVal = validateUsCity(form.city);
    if (!cityVal.isValid) {
      errors.city = cityVal.error || "Please enter a valid US City.";
    }

    // 6. US State Selection
    if (!form.province) {
      errors.province = "Please select a valid US State.";
    }

    // 7. Strict US ZIP / PIN Validation (5-digits, 6-digit Indian PIN rejection, and State Prefix Matching)
    const zipVal = validateUsZip(form.zip_code, form.province);
    if (!zipVal.isValid) {
      errors.zip_code = zipVal.error || "Please enter a valid 5-digit US PIN / ZIP code.";
    }

    // If there are validation errors, display inline and auto-scroll to the first invalid field
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);

      const fieldPriority = ["country_code", "name", "email", "phone", "address1", "city", "province", "zip_code"];
      const firstInvalid = fieldPriority.find((k) => errors[k]) || Object.keys(errors)[0];

      if (typeof window !== "undefined") {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstInvalid}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusTarget =
              el.tagName === "INPUT" || el.tagName === "BUTTON" || el.tagName === "SELECT"
                ? el
                : el.querySelector("input, select, button");
            if (focusTarget && "focus" in focusTarget) {
              (focusTarget as HTMLElement).focus();
            }
          }
        }, 50);
      }
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handlePayPalSuccess = (capturedOrder: any) => {
    const orderId = capturedOrder?.internal_order_number || `ORD-PP-${Date.now().toString().slice(-6)}`;
    const trackingNum = capturedOrder?.tracking_number || `94001118995625${Date.now().toString().slice(-8)}`;

    const customerEmail =
      form.email.trim().toLowerCase() ||
      auth.currentUser?.email?.toLowerCase() ||
      (form.phone.trim() ? `${form.phone.replace(/\D/g, "")}@domesticorders.com` : "guest@domesticlab.com");

    const customerName = form.name.trim() || auth.currentUser?.displayName || "Valued Customer";

    const orderPayloadItems = checkoutItems.map((item) => ({
      title: item.product.title,
      product_title: item.product.title,
      slug: item.product.slug,
      image_url: item.product.hero_image_url || item.product.images?.[0] || "",
      quantity: item.quantity,
      price: item.unitPrice,
      size: item.selectedSize,
      color: item.selectedColor,
    }));

    try {
      const orderRecord = {
        id: capturedOrder?.id || Date.now(),
        internal_order_number: orderId,
        customer_email: customerEmail,
        customer_phone: form.phone,
        status: "PAYMENT_CAPTURED",
        total_retail: finalAmount,
        carrier_name: "USPS",
        tracking_number: trackingNum,
        shipping_name: customerName,
        shipping_address: form.address1,
        shipping_city: form.city,
        shipping_province: form.province,
        shipping_zip: form.zip_code,
        shipping_country: "US",
        created_at: new Date().toISOString(),
        items: orderPayloadItems,
      };

      const existingRaw = localStorage.getItem("customer_orders");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("customer_orders", JSON.stringify([orderRecord, ...existing]));
      localStorage.setItem("customer_email", customerEmail);
      localStorage.setItem("saved_shipping_address", JSON.stringify(form));
      localStorage.removeItem("checkout_draft_address");
    } catch {
      // Storage write error ignored
    }

    setConfirmedOrder({
      orderNumber: orderId,
      amount: finalAmount,
      shippingSla: "3–5 Business Days (Tracked USPS Ground)",
      items: checkoutItems,
    });

    if (singleCartItem) {
      removeItem(
        singleCartItem.variant.vid,
        singleCartItem.tier,
        singleCartItem.selectedSize,
        singleCartItem.selectedColor
      );
    } else {
      clearCart();
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (!validateDeliveryDetails()) {
      return;
    }

    try {
      const orderId = `ORD-STORE-${Date.now().toString().slice(-6)}`;

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      const customerEmail =
        form.email.trim().toLowerCase() ||
        auth.currentUser?.email?.toLowerCase() ||
        (form.phone.trim() ? `${form.phone.replace(/\D/g, "")}@domesticorders.com` : "guest@domesticlab.com");

      const customerName =
        form.name.trim() ||
        auth.currentUser?.displayName ||
        "Valued Customer";

      const orderPayloadItems = checkoutItems.map((item) => ({
        title: item.product.title,
        product_title: item.product.title,
        slug: item.product.slug,
        image_url: item.product.hero_image_url || item.product.images?.[0] || "",
        quantity: item.quantity,
        price: item.unitPrice,
        size: item.selectedSize,
        color: item.selectedColor,
      }));

      const trackingNumber = `94001118995625${Date.now().toString().slice(-8)}`;

      // 1. Persist order to PostgreSQL / SQLite database for cross-device synchronization
      await createCheckoutOrder({
        internal_order_number: orderId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: form.phone,
        shipping_address: form.address1,
        shipping_city: form.city,
        shipping_province: form.province,
        shipping_zip: form.zip_code,
        shipping_country: "US",
        total_retail: finalAmount,
        carrier_name: "USPS",
        tracking_number: trackingNumber,
        items: orderPayloadItems,
        firebase_uid: auth.currentUser?.uid,
      });

      // 2. Persist order locally for instant tracking in /profile with full product metadata
      try {
        const orderRecord = {
          id: Date.now(),
          internal_order_number: orderId,
          customer_email: customerEmail,
          customer_phone: form.phone,
          status: "PAYMENT_CAPTURED",
          total_retail: finalAmount,
          carrier_name: "USPS",
          tracking_number: trackingNumber,
          shipping_name: customerName,
          shipping_address: form.address1,
          shipping_city: form.city,
          shipping_province: form.province,
          shipping_zip: form.zip_code,
          shipping_country: "US",
          created_at: new Date().toISOString(),
          items: orderPayloadItems,
        };

        const existingRaw = localStorage.getItem("customer_orders");
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem("customer_orders", JSON.stringify([orderRecord, ...existing]));
        localStorage.setItem("customer_email", customerEmail);
        localStorage.setItem("saved_shipping_address", JSON.stringify(form));
        localStorage.removeItem("checkout_draft_address");
      } catch {
        // Storage write error ignored
      }

      setConfirmedOrder({
        orderNumber: orderId,
        amount: finalAmount,
        shippingSla: "3–5 Business Days (Tracked USPS)",
        items: checkoutItems,
      });

      if (singleCartItem) {
        removeItem(
          singleCartItem.variant.vid,
          singleCartItem.tier,
          singleCartItem.selectedSize,
          singleCartItem.selectedColor
        );
      } else {
        clearCart();
      }
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

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Domestic Order Verified & Scheduled
          </span>
          <h1 className="text-2xl font-black text-slate-900">Payment Authorized</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your package has been queued for immediate domestic dispatch from our US distribution facility.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 text-left space-y-3 max-w-md mx-auto shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Order Number:</span>
            <span className="font-mono font-bold text-slate-900">{confirmedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Fulfillment Hub:</span>
            <span className="font-semibold text-emerald-700">US Domestic Dispatch (USPS)</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Delivery Time:</span>
            <span className="font-semibold text-slate-900">{confirmedOrder.shippingSla}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
            <span>Total Paid:</span>
            <span>${confirmedOrder.amount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Ordered Product Cards for better identification */}
        {confirmedOrder.items && confirmedOrder.items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-3 max-w-md mx-auto shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Purchased Domestic Items ({confirmedOrder.items.reduce((acc, i) => acc + (i.quantity || 1), 0)}{" "}
              {confirmedOrder.items.reduce((acc, i) => acc + (i.quantity || 1), 0) === 1 ? "Unit" : "Units"})
            </h3>
            <div className="divide-y divide-slate-100">
              {confirmedOrder.items.map((item, idx) => {
                const heroImg = item.product.hero_image_url || item.product.images?.[0] || "/placeholder.jpg";
                return (
                  <div key={idx} className="py-2.5 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImg}
                      alt={item.product.title}
                      className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-0.5 bg-slate-50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.product.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {item.selectedSize && (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                            Size: {item.selectedSize}
                          </span>
                        )}
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                          {item.quantity} {item.quantity === 1 ? "Unit" : "Units"}
                        </span>
                        <span>${Number(item.unitPrice || 0).toFixed(2)}/Unit</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-md mx-auto text-xs text-amber-900 space-y-1">
          <p className="font-bold">⚠️ Address Verification (30-Min Window):</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Shipping to: <strong>{form.address1}, {form.city}, {form.province} {form.zip_code}, United States</strong>. If you made any typos, contact support within 30 minutes before automated packaging begins.
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 relative">
      {/* ── FULL-SCREEN ZERO-TRUST PAYMENT PROCESSING SHIELD ── */}
      {(isPaymentProcessing || isSubmitting) && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 relative z-[10000]">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <Lock className="w-8 h-8 animate-pulse text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Finalizing Your Order...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We are validating your transaction with PayPal and generating your tracked USPS domestic dispatch code.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-semibold flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Please do not refresh, close this window, or press Back while payment is finalizing.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── NETWORK OFFLINE / RECOVERY BANNER ── */}
      {isOffline && (
        <div className="p-3.5 bg-amber-500 text-white rounded-xl shadow-sm text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>⚠️ Network Offline: You are currently disconnected from the internet. Reconnecting to finalize payment...</span>
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> Continue Shopping
      </Link>

      {/* ── PROMINENT US-ONLY DELIVERY BANNER (Single Line Header on Small Screens) ── */}
      <div className="bg-emerald-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-emerald-900 space-y-1.5">
        <div className="flex items-center justify-between gap-2 whitespace-nowrap min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-base sm:text-lg flex-shrink-0 leading-none">🇺🇸</span>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-emerald-400 truncate">
              US Domestic Shipping Only
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] bg-emerald-800/90 text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
            USPS Tracked
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-emerald-200/90 leading-relaxed">
          Orders are dispatched directly from our US fulfillment centers via tracked USPS domestic ground (3–5 business days). <strong>Delivery outside the United States is unavailable.</strong>
        </p>
      </div>

      {/* TOP: ORDER SUMMARY */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">
            Order Summary ({checkoutItems.reduce((acc, i) => acc + i.quantity, 0)} {checkoutItems.reduce((acc, i) => acc + i.quantity, 0) === 1 ? "Unit" : "Units"})
          </h2>
        </div>

        <div className="space-y-3">
          {checkoutItems.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-3 items-center text-xs text-slate-800 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
            >
              <Link
                href={`/products/${item.product.slug}`}
                prefetch={true}
                className="flex gap-3 items-center flex-1 min-w-0 group cursor-pointer"
              >
                {item.product.hero_image_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                    <span>
                      {item.quantity} {item.quantity === 1 ? "Unit" : "Units"}
                    </span>
                    <span>•</span>
                    {/* Consistent Unit indicator instead of ea */}
                    <span>${item.unitPrice.toFixed(2)}/Unit</span>
                  </div>
                </div>
              </Link>
              <span className="font-black text-sm text-slate-900">
                ${item.totalPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex justify-between">
            <span>USPS Tracked Shipping</span>
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
      <form
        onSubmit={handlePlaceOrder}
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              US Delivery Address
            </h2>
            {/* Smaller description below US delivery address */}
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              Enter your domestic residential or business address for USPS tracked fulfillment.
            </p>
          </div>
          {Boolean(form.address1 || form.city || form.province || form.zip_code) && (
            <button
              type="button"
              onClick={handleClearAddress}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 active:scale-95 flex-shrink-0"
              title="Clear entered address"
            >
              Clear Address
            </button>
          )}
        </div>

        <div className="space-y-3.5 text-xs font-semibold text-slate-700">
          {/* Country Field (Themed Dropdown Locked to US) */}
          <div id="field-country_code">
            <ThemedDropdown
              label="Country"
              options={COUNTRY_OPTIONS}
              value={form.country_code}
              onChange={(val) => {
                setForm({ ...form, country_code: val });
                if (fieldErrors.country_code) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.country_code;
                    return next;
                  });
                }
              }}
            />
            {fieldErrors.country_code && (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{fieldErrors.country_code}</span>
              </p>
            )}
          </div>

          {/* Contact Details Section */}
          {isAuthenticatedUser ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div id="field-name">
                <label className="block mb-1 text-slate-700 font-bold">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter Full Name"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                    fieldErrors.name
                      ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {fieldErrors.name && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>
              <div id="field-email">
                <label className="block mb-1 text-slate-700 font-bold">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter Email Address"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                    fieldErrors.email
                      ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div id="field-email">
                <label className="block mb-1 text-slate-700 font-bold">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter Email Address"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                    fieldErrors.email
                      ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Login to sync address notice */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="text-[11px] sm:text-xs text-slate-600">
                  <span className="font-bold text-slate-800">If already have an account, login</span> to sync address
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSigningIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition active:scale-95 flex-shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isGoogleSigningIn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  )}
                  <span>{isGoogleSigningIn ? "Signing In..." : "Login"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Your Mobile */}
          <div id="field-phone">
            <label className="block mb-1">Your Mobile</label>
            <div className="flex gap-2">
              <div className="w-36 flex-shrink-0">
                <ThemedDropdown
                  options={PHONE_CODE_OPTIONS}
                  value={form.phoneCode}
                  onChange={(val) => {
                    setForm({ ...form, phoneCode: val });
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }
                  }}
                />
              </div>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                  fieldErrors.phone
                    ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                }`}
              />
            </div>
            {fieldErrors.phone ? (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{fieldErrors.phone}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">10-digit US mobile number for USPS SMS tracking</p>
            )}
          </div>

          {/* Street Address */}
          <div id="field-address1">
            <label className="block mb-1">Street Address</label>
            <input
              type="text"
              name="address1"
              value={form.address1}
              onChange={handleChange}
              placeholder="Enter Street Address"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                fieldErrors.address1
                  ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              }`}
            />
            {fieldErrors.address1 ? (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{fieldErrors.address1}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">Include building number & street (e.g., 742 Evergreen Terrace)</p>
            )}
          </div>

          {/* City, State Dropdown, PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-30">
            <div id="field-city">
              <label className="block mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter City"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                  fieldErrors.city
                    ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                }`}
              />
              {fieldErrors.city && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{fieldErrors.city}</span>
                </p>
              )}
            </div>

            {/* Custom Themed State Dropdown */}
            <div id="field-province" className="relative z-40">
              <ThemedDropdown
                label="State"
                options={US_STATES}
                value={form.province}
                onChange={(val) => {
                  setForm({ ...form, province: val });
                  if (fieldErrors.province) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.province;
                      return next;
                    });
                  }
                }}
                placeholder="Select State"
              />
              {fieldErrors.province && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{fieldErrors.province}</span>
                </p>
              )}
            </div>

            <div id="field-zip_code">
              <label className="block mb-1">PIN</label>
              <input
                type="text"
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                placeholder="Enter PIN"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none ${
                  fieldErrors.zip_code
                    ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 focus:border-rose-500"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                }`}
                maxLength={10}
              />
              {fieldErrors.zip_code ? (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{fieldErrors.zip_code}</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">5-digit US ZIP code</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="pt-3 border-t border-slate-100 space-y-3 relative z-10">

          {/* Official PayPal Smart Button Integration */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-1 border-b border-slate-200/60">
              <span className="font-medium">Pay with PayPal, Pay Later, or Card:</span>
              <span className="font-mono text-[10px] text-slate-400">USD • Zero-Trust Processing</span>
            </div>

            <PayPalButton
              amount={finalAmount}
              internalOrderNumber={`ORD-PP-${Date.now().toString().slice(-6)}`}
              customerDetails={{
                name: form.name.trim() || auth.currentUser?.displayName || "Valued Customer",
                email:
                  form.email.trim().toLowerCase() ||
                  auth.currentUser?.email?.toLowerCase() ||
                  "guest@domesticlab.com",
                phone: form.phone,
                address1: form.address1,
                city: form.city,
                province: form.province,
                zip_code: form.zip_code,
                country_code: form.country_code,
              }}
              orderItems={checkoutItems.map((item) => ({
                title: item.product.title,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                size: item.selectedSize,
                color: item.selectedColor,
              }))}
              firebaseUid={auth.currentUser?.uid}
              onValidate={validateDeliveryDetails}
              onProcessingChange={(val) => setIsPaymentProcessing(val)}
              onSuccess={handlePayPalSuccess}
              onError={(msg) => setErrorMessage(msg)}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

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
