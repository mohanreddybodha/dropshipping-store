"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "../../lib/cart";
import {
  getLineSellingDisplayPrices,
  normalizeCartItemPricing,
  summarizeCartBreakdown,
} from "../../lib/bundlePricing";
import {
  getUserAuthState,
  getUserSavedAddresses,
  saveUserAddress,
  UserSavedAddress,
} from "../../lib/api";
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
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Loader2,
  Check,
  Plus,
  Minus,
  Bookmark,
  Clock,
  Send,
  Package,
} from "lucide-react";

const US_STATES: ThemedDropdownOption[] = [
  { value: "AL", label: "Alabama (AL)" },
  { value: "AK", label: "Alaska (AK) — Contiguous US Only", badge: "Unavailable", disabled: true },
  { value: "AZ", label: "Arizona (AZ)" },
  { value: "AR", label: "Arkansas (AR)" },
  { value: "CA", label: "California (CA)" },
  { value: "CO", label: "Colorado (CO)" },
  { value: "CT", label: "Connecticut (CT)" },
  { value: "DE", label: "Delaware (DE)" },
  { value: "DC", label: "District of Columbia (DC)" },
  { value: "FL", label: "Florida (FL)" },
  { value: "GA", label: "Georgia (GA)" },
  { value: "HI", label: "Hawaii (HI) — Contiguous US Only", badge: "Unavailable", disabled: true },
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
  { value: "US", label: "United States", badge: "Eligible" },
  { value: "CA", label: "Canada (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "GB", label: "United Kingdom (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "AU", label: "Australia (Unavailable)", badge: "Unavailable", disabled: true },
  { value: "INTL", label: "Other International Destinations", badge: "Unavailable", disabled: true },
];

const PHONE_CODE_OPTIONS: ThemedDropdownOption[] = [
  { value: "+1", label: "+1 US" },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { items, isHydrated, updateQuantity, clearCart, removeItem } = useCart();

  const isBuyNow = searchParams.get("buyNow") === "true";
  const buyNowVid = searchParams.get("vid");
  const buyNowTier = searchParams.get("tier");
  const buyNowQtyParam = parseInt(searchParams.get("qty") || "1", 10);
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

  const initialBuyNowQty = Math.max(1, buyNowQtyParam || singleCartItem?.quantity || 1);
  const [buyNowQty, setBuyNowQty] = useState<number>(initialBuyNowQty);

  useEffect(() => {
    setBuyNowQty(Math.max(1, buyNowQtyParam || singleCartItem?.quantity || 1));
  }, [buyNowVid, buyNowQtyParam, singleCartItem?.quantity]);

  const checkoutItems = singleCartItem
    ? [normalizeCartItemPricing(singleCartItem, buyNowQty)]
    : items.length > 0
    ? items.map((item) => normalizeCartItemPricing(item))
    : [];

  // Initial state has zero hardcoded dummy address values
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneCode: "+1",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    county: "",
    province: "",
    zip_code: "",
    country_code: "US",
  });

  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<UserSavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">("new");
  const [saveAddressLabel, setSaveAddressLabel] = useState<"Home" | "Office" | "New" | null>(null);
  const [customAddressLabel, setCustomAddressLabel] = useState("");
  const [makeDefaultAddress, setMakeDefaultAddress] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checkoutOrderNumber] = useState<string>(() => {
    const ts = Date.now().toString(36).toUpperCase();
    let rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      const buf = new Uint8Array(3);
      window.crypto.getRandomValues(buf);
      rand = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    return `ORD-PP-${ts}-${rand}`;
  });

  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    amount: number;
    shippingSla: string;
    items: typeof checkoutItems;
  } | null>(null);

  const [isCelebrating, setIsCelebrating] = useState(false);
  const [celebrationProgress, setCelebrationProgress] = useState(0);

  useEffect(() => {
    if (!confirmedOrder || !isCelebrating) return;

    const startTime = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setCelebrationProgress(progress);
      if (elapsed >= duration) {
        clearInterval(interval);
        setIsCelebrating(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [confirmedOrder, isCelebrating]);

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
                shippingSla: "3–5 Business Days",
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
          county: dataToLoad.county || prev.county,
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

        if (user.email) {
          setIsLoadingAddresses(true);
          try {
            const addrs = await getUserSavedAddresses(user.email);
            setSavedAddresses(addrs);
            if (addrs.length > 0) {
              const def = addrs.find((a) => a.is_default) || addrs[0];
              setSelectedAddressId(def.id);
              setForm((prev) => ({
                ...prev,
                name: def.recipient_name || prev.name,
                email: user.email || prev.email,
                phone: def.phone || prev.phone,
                address1: def.street_address,
                address2: "",
                city: def.city,
                county: def.county || "",
                province: def.province,
                zip_code: def.zip_code,
                country_code: "US",
              }));
            } else {
              // Fallback to latest past order if no dedicated saved addresses
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
                  county: prev.county || (latest as any).shipping_county || "",
                  province: prev.province || latest.shipping_province || "",
                  zip_code: prev.zip_code || latest.shipping_zip || "",
                  country_code: "US",
                }));
              }
            }
          } catch (err) {
            console.error("Failed to load saved addresses:", err);
          } finally {
            setIsLoadingAddresses(false);
          }
        }
      } else {
        setIsAuthenticatedUser(false);
        setSavedAddresses([]);
        setSelectedAddressId("new");
      }
    });
    return () => unsub();
  }, []);

  const handleClearAddress = () => {
    setSelectedAddressId("new");
    setForm({
      name: auth.currentUser?.displayName || "",
      email: auth.currentUser?.email || "",
      phoneCode: "+1",
      phone: auth.currentUser?.phoneNumber || "",
      address1: "",
      address2: "",
      city: "",
      county: "",
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

  const checkoutBreakdown = summarizeCartBreakdown(checkoutItems);
  const finalAmount = checkoutBreakdown.totalAmount;

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

    // 6. US State / Province Selection (Mandatory for USPS domestic logistics & CJ Dropshipping)
    if (!form.province) {
      errors.province = "Please select a valid US State / Province.";
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

  const selectedSavedAddressObj = savedAddresses.find((a) => a.id === selectedAddressId);

  const getNextAddressDefaultLabel = (addresses: UserSavedAddress[]): string => {
    const existingNumbers = addresses
      .map((a) => {
        const match = (a.label || "").match(/^Address\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `Address ${nextNum}`;
  };

  const getEffectiveLabelForNew = (
    saveLabel: "Home" | "Office" | "New" | null,
    customLabel: string,
    addresses: UserSavedAddress[]
  ): string => {
    if (saveLabel === "Home") return "Home";
    if (saveLabel === "Office") return "Office";
    if (saveLabel === "New" && customLabel.trim()) return customLabel.trim();
    return getNextAddressDefaultLabel(addresses);
  };

  const handleExplicitSaveAddress = async (
    labelToUse?: string,
    asDefault = makeDefaultAddress,
    existingId?: number
  ) => {
    const finalLabel = (
      labelToUse ||
      getEffectiveLabelForNew(saveAddressLabel, customAddressLabel, savedAddresses)
    ).trim();

    const customerEmail =
      form.email.trim().toLowerCase() ||
      auth.currentUser?.email?.toLowerCase() ||
      "";

    if (!customerEmail) {
      setErrorMessage("Please enter your email or sign in to save this address.");
      return;
    }

    if (!form.address1.trim() || !form.city.trim() || !form.province || !form.zip_code.trim()) {
      validateDeliveryDetails();
      return;
    }

    setIsSavingAddress(true);
    setErrorMessage(null);
    try {
      const res = await saveUserAddress({
        id: existingId || (selectedAddressId !== "new" ? Number(selectedAddressId) : undefined),
        email: customerEmail,
        label: finalLabel,
        recipient_name: form.name.trim() || auth.currentUser?.displayName || "Valued Customer",
        street_address: form.address1.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        county: form.county.trim() || undefined,
        zip_code: form.zip_code.trim(),
        phone: form.phone.trim(),
        is_default: asDefault,
      });

      setAddressSavedSuccess(true);
      setTimeout(() => setAddressSavedSuccess(false), 4000);

      // Re-fetch addresses to update horizontal pills
      const updated = await getUserSavedAddresses(customerEmail);
      setSavedAddresses(updated);
      if (res?.address?.id) {
        setSelectedAddressId(res.address.id);
      }
    } catch (err: any) {
      console.error("Save address error:", err);
      setErrorMessage(err.message || "Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handlePayPalSuccess = (capturedOrder: any) => {
    const orderId = capturedOrder?.internal_order_number || checkoutOrderNumber;
    const trackingNum = capturedOrder?.tracking_number || null;

    const customerEmail =
      form.email.trim().toLowerCase() ||
      auth.currentUser?.email?.toLowerCase() ||
      "";

    const customerName = form.name.trim() || auth.currentUser?.displayName || "Valued Customer";

    const orderPayloadItems = checkoutItems.map((item) => ({
      title: item.product.title,
      product_title: item.product.title,
      pid: item.product.pid,
      sku: item.variant?.sku,
      vid: item.variant?.vid,
      variant_title: item.variant?.variant_name || item.selectedSize || "Standard",
      variant_sku: item.variant?.sku || "",
      slug: item.product.slug,
      image_url: item.variant?.image_url || item.product.hero_image_url || item.product.images?.[0] || "",
      quantity: item.quantity,
      price: item.unitPrice,
      unit_price: item.unitPrice,
      size: item.selectedSize,
      color: item.selectedColor,
      status: "ORDER_PLACED",
    }));

    try {
      const orderRecord = {
        id: capturedOrder?.id || Date.now(),
        internal_order_number: orderId,
        customer_email: customerEmail,
        customer_phone: form.phone,
        status: capturedOrder?.status || "ORDER_PLACED",
        total_retail: Number(capturedOrder?.total_retail) || finalAmount,
        carrier_name: "USPS",
        tracking_number: trackingNum,
        shipping_name: customerName,
        shipping_address: form.address1,
        shipping_city: form.city,
        shipping_province: form.province,
        shipping_county: form.county.trim() || undefined,
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

    if (customerEmail && form.address1.trim() && form.city.trim() && form.province && form.zip_code.trim()) {
      if (selectedAddressId !== "new") {
        const existing = savedAddresses.find((a) => a.id === selectedAddressId);
        saveUserAddress({
          id: Number(selectedAddressId),
          email: customerEmail,
          label: existing?.label || "Home",
          recipient_name: customerName,
          street_address: form.address1.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          county: form.county.trim() || undefined,
          zip_code: form.zip_code.trim(),
          phone: form.phone.trim(),
          is_default: existing?.is_default ?? false,
        }).catch(() => {});
      } else {
        const finalLabel = getEffectiveLabelForNew(saveAddressLabel, customAddressLabel, savedAddresses);
        saveUserAddress({
          email: customerEmail,
          label: finalLabel,
          recipient_name: customerName,
          street_address: form.address1.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          county: form.county.trim() || undefined,
          zip_code: form.zip_code.trim(),
          phone: form.phone.trim(),
          is_default: makeDefaultAddress,
        }).catch(() => {});
      }
    }

    setConfirmedOrder({
      orderNumber: orderId,
      amount: Number(capturedOrder?.total_retail) || finalAmount,
      shippingSla: "3–5 Business Days",
      items: checkoutItems,
    });
    setCelebrationProgress(0);
    setIsCelebrating(true);

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

  if (!confirmedOrder && !isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Loading secure checkout...</span>
      </div>
    );
  }

  if (!confirmedOrder && checkoutItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Your checkout bag is empty</h1>
        <p className="text-xs text-slate-500">
          Add a product to your cart before proceeding to payment.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Browse Catalog
        </Link>
      </div>
    );
  }

  if (confirmedOrder && isCelebrating) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in duration-300 relative select-none">
        {/* Inline Keyframe Styles for Centered, Calm & Elegant Success Seal */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes calmSealBloom {
            0% { transform: scale(0.85); opacity: 0; }
            50% { transform: scale(1.04); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes calmGlowPulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.28); opacity: 0.15; }
          }
          @keyframes checkDraw {
            0% { stroke-dashoffset: 40; opacity: 0; }
            40% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes textFade {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}} />

        {/* ── CENTERED ELEGANT CONFIRMATION SEAL (Apple Pay / Stripe Style) ── */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Gentle Centered Ambient Ring */}
          <div
            className="absolute w-28 h-28 rounded-full bg-emerald-500/15 pointer-events-none"
            style={{ animation: "calmGlowPulse 2.8s ease-in-out infinite" }}
          />

          {/* Central Hero Seal */}
          <div
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-600/25 ring-4 ring-emerald-50"
            style={{
              animation: "calmSealBloom 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            {/* Elegant Vector Checkmark */}
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 25L21 32L34 17"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 40,
                  strokeDashoffset: 40,
                  animation: "checkDraw 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
                }}
              />
            </svg>
          </div>
        </div>

        {/* ── TRIUMPHANT SUCCESS HEADLINE (Centered) ── */}
        <div
          className="space-y-2 max-w-md mx-auto"
          style={{
            animation: "textFade 0.6s ease-out 0.45s both",
          }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Order Confirmed</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Your order placed successfully
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Preparing your domestic fulfillment package...
          </p>
        </div>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6 animate-in fade-in duration-300">
        {/* 30-Minute Grace Window Banner (STARTS DIRECTLY HERE - NO TICK, NO CONGRATULATIONS TEXT) */}
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-left max-w-md mx-auto space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>30-Minute Grace Window Active</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Shipping to: <strong>{form.address1}, {form.city}, {form.province} {form.zip_code}</strong>. You have <strong>30 minutes</strong> to edit your delivery address directly from your <strong>My Orders</strong> page before fulfillment locks.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 text-left space-y-3 max-w-md mx-auto shadow-xs">
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Order Reference:</span>
            <span className="font-mono font-bold text-slate-900">{confirmedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Current Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Order Placed (Grace Period)
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Fulfillment Hub:</span>
            <span className="font-semibold text-emerald-700">US Domestic Distribution (USPS)</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span>Estimated Delivery:</span>
            <span className="font-semibold text-slate-900">{confirmedOrder.shippingSla}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
            <span>Total Paid:</span>
            <span>${confirmedOrder.amount.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Purchased Items List */}
        {confirmedOrder.items && confirmedOrder.items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-3 max-w-md mx-auto shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Purchased Items ({confirmedOrder.items.reduce((acc, i) => acc + (i.quantity || 1), 0)}{" "}
              {confirmedOrder.items.reduce((acc, i) => acc + (i.quantity || 1), 0) === 1 ? "Unit" : "Units"})
            </h3>
            <div className="divide-y divide-slate-100">
              {confirmedOrder.items.map((item, idx) => {
                const heroImg = item.variant?.image_url || item.product.hero_image_url || item.product.images?.[0] || "/placeholder.jpg";
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/orders"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>View in My Orders</span>
            <ArrowRight className="w-4 h-4" />
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
    <div className="max-w-2xl mx-auto px-2.5 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6 relative">
      {/* ── FULL-SCREEN SECURE PAYMENT VERIFICATION MODAL ── */}
      {(isPaymentProcessing || isSubmitting) && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 relative z-[10000]">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Waiting for payment confirmation...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Verifying bank authentication and reserving your domestic warehouse stock. Please wait a moment.
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-[11px] font-medium flex items-center gap-2 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Secure encrypted verification in progress. Please do not refresh or press back.</span>
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

      {/* ── PROMINENT CONTIGUOUS US DELIVERY BANNER ── */}
      <div className="bg-emerald-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-emerald-900 space-y-1.5">
        <div className="flex items-center justify-between gap-2 whitespace-nowrap min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-emerald-400 truncate">
              Contiguous 48 US States Only
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] bg-emerald-800/90 text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
            US Domestic Ground (Est. 3–5 Days)
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-emerald-200/90 leading-relaxed">
          Orders dispatch from domestic US fulfillment centers via tracked ground couriers (USPS / UPS / FedEx, est. 3–5 business days). <strong>Delivery is serviced strictly to physical street addresses across the 48 Contiguous US States (No P.O. Boxes, Military APO/FPO, Alaska, Hawaii, or US Territories).</strong>
        </p>
      </div>

      {/* TOP: ORDER SUMMARY */}
      <section className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">
            Order Summary ({checkoutItems.reduce((acc, i) => acc + i.quantity, 0)} {checkoutItems.reduce((acc, i) => acc + i.quantity, 0) === 1 ? "Unit" : "Units"})
          </h2>
        </div>

        <div className="space-y-3">
          {checkoutItems.map((item, idx) => {
            const specParts: string[] = [];
            if (item.selectedColor) specParts.push(`Color: ${item.selectedColor}`);
            if (item.selectedSize) specParts.push(`Size: ${item.selectedSize}`);
            if (specParts.length === 0 && item.variant?.variant_name && item.variant.variant_name.toLowerCase() !== "default") {
              specParts.push(item.variant.variant_name);
            }
            const hasCustomSpec = specParts.length > 0;
            const specText = specParts.join(" • ");
            const itemThumbnail =
              item.variant?.image_url ||
              item.product.hero_image_url ||
              item.product.images?.[0] ||
              "/placeholder.jpg";
            const maxStock =
              item.variant?.us_warehouse_stock && item.variant.us_warehouse_stock > 0
                ? Math.min(99, item.variant.us_warehouse_stock)
                : 99;

            const adjustItemQty = (delta: number) => {
              const nextQty = Math.min(maxStock, Math.max(1, item.quantity + delta));
              if (nextQty === item.quantity) return;
              if (singleCartItem) {
                setBuyNowQty(nextQty);
              } else {
                updateQuantity(
                  item.variant.vid,
                  item.tier,
                  nextQty,
                  item.selectedSize,
                  item.selectedColor
                );
              }
            };
            const linePrices = getLineSellingDisplayPrices(item);

            return (
              <div
                key={`${item.variant?.vid || idx}-${item.selectedSize || "default"}-${item.selectedColor || "default"}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-800 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
              >
                <Link
                  href={`/products/${item.product.slug}`}
                  prefetch={true}
                  className="flex gap-3 items-center flex-1 min-w-0 group cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemThumbnail}
                    alt={item.product.title}
                    className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-0.5 flex-shrink-0 bg-white group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Line 1: Product Name strictly in 1 line with ellipsis */}
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-emerald-700 transition">
                      {item.product.title}
                    </h3>

                    {/* Line 2: Selected Specification / Size / Color (no bundle tags per item) */}
                    <div className="text-[11px] font-semibold line-clamp-1">
                      {hasCustomSpec ? (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] inline-block font-bold">
                          {specText}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Standard Specification</span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-15 sm:pl-0 flex-shrink-0">
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() => adjustItemQty(-1)}
                      className="w-7 h-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Decrease checkout quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 py-1 text-xs font-black text-slate-900 bg-white min-w-[1.75rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= maxStock}
                      onClick={() => adjustItemQty(1)}
                      className="w-7 h-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Increase checkout quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[5.25rem]">
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className="font-black text-sm text-slate-900 whitespace-nowrap">
                        ${linePrices.discounted20LineTotal.toFixed(2)}
                      </span>
                      {linePrices.sellingLineTotal > linePrices.discounted20LineTotal && (
                        <span className="text-[11px] text-slate-400 line-through whitespace-nowrap">
                          ${linePrices.sellingLineTotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {linePrices.sellingLineTotal > linePrices.discounted20LineTotal && (
                      <span className="inline-block mt-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded-full uppercase">
                        Save 20%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex justify-between">
            <span>Selling Price</span>
            <span className="font-semibold text-slate-900">${checkoutBreakdown.sellingPriceTotal.toFixed(2)}</span>
          </div>
          {checkoutBreakdown.sellingDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Discount on Selling Price (20%)</span>
              <span>-${checkoutBreakdown.sellingDiscount.toFixed(2)}</span>
            </div>
          )}
          {checkoutBreakdown.bundleDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Bundle Discounts</span>
              <span>-${checkoutBreakdown.bundleDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Domestic Shipping</span>
            <span className="text-emerald-700 font-bold">Free</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Sales Tax</span>
            <span className="font-semibold text-slate-900">$0.00</span>
          </div>
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total Amount</span>
            <span>${finalAmount.toFixed(2)} USD</span>
          </div>
        </div>
      </section>

      {/* BOTTOM: SHIPPING ADDRESS & PAYMENT FORM */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 space-y-5 shadow-sm"
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
          {/* Horizontal Saved Addresses Quick-Select (Flipkart / Amazon style) */}
          {isAuthenticatedUser && savedAddresses.length > 0 && (
            <div className="space-y-1.5 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Select Delivery Address:
                </span>
                {selectedAddressId !== "new" && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Autofilled</span>
                  </span>
                )}
              </div>

              {/* Horizontal pills row: Saved addresses and + New */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setSaveAddressLabel(null);
                        setCustomAddressLabel("");
                        setForm((prev) => ({
                          ...prev,
                          name: addr.recipient_name || prev.name,
                          address1: addr.street_address,
                          address2: "",
                          city: addr.city,
                          county: addr.county || "",
                          province: addr.province,
                          zip_code: addr.zip_code,
                          phone: addr.phone || prev.phone,
                        }));
                        setFieldErrors({});
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center whitespace-nowrap border cursor-pointer active:scale-95 ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{addr.label}</span>
                    </button>
                  );
                })}

                {/* + New pill (Acts as New Address: clears all input fields) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressId("new");
                    setSaveAddressLabel(null);
                    setCustomAddressLabel("");
                    setMakeDefaultAddress(false);
                    setForm((prev) => ({
                      ...prev,
                      address1: "",
                      address2: "",
                      city: "",
                      county: "",
                      province: "",
                      zip_code: "",
                    }));
                    setFieldErrors({});
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center whitespace-nowrap border cursor-pointer active:scale-95 ${
                    selectedAddressId === "new"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-slate-50"
                  }`}
                >
                  <span>+ New</span>
                </button>
              </div>
            </div>
          )}

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
              <div className="w-32 flex-shrink-0">
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

          {/* City & State / Province (Mandatory for USPS & CJ Dropshipping) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
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

            <div id="field-province" className="relative z-40">
              <ThemedDropdown
                label="State / Province"
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
                placeholder="Select State / Province"
              />
              {fieldErrors.province && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{fieldErrors.province}</span>
                </p>
              )}
            </div>
          </div>

          {/* PIN / ZIP Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
            <div id="field-zip_code">
              <label className="block mb-1">PIN / ZIP Code</label>
              <input
                type="text"
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                placeholder="Enter PIN / ZIP"
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

          {/* ── ADDRESS SAVE & TAGGING PREFERENCES (Flipkart / Amazon Style) ── */}
          {/* New Address or First-Time User */}
          {(savedAddresses.length === 0 || selectedAddressId === "new") && (() => {
            const effectiveLabelForNew = getEffectiveLabelForNew(saveAddressLabel, customAddressLabel, savedAddresses);
            return (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Save this new address as:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(["Home", "Office", "New"] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          setSaveAddressLabel((prev) => (prev === lbl ? null : lbl));
                          if (lbl !== "New") setCustomAddressLabel("");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                          saveAddressLabel === lbl
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Name Input when "New" is selected (No examples shown) */}
                {saveAddressLabel === "New" && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-200/60 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={customAddressLabel}
                      onChange={(e) => setCustomAddressLabel(e.target.value)}
                      placeholder="Enter category name"
                      maxLength={30}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={makeDefaultAddress}
                      onChange={(e) => setMakeDefaultAddress(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span>
                      {savedAddresses.length === 0
                        ? "Set as default delivery address"
                        : "Make default delivery address"}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      handleExplicitSaveAddress(
                        effectiveLabelForNew,
                        makeDefaultAddress
                      )
                    }
                    disabled={
                      isSavingAddress ||
                      !form.address1.trim() ||
                      !form.city.trim() ||
                      !form.zip_code.trim()
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0"
                  >
                    {isSavingAddress ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : addressSavedSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    ) : null}
                    <span>
                      {isSavingAddress
                        ? "Saving..."
                        : addressSavedSuccess
                        ? `Saved as ${effectiveLabelForNew}!`
                        : `Save as ${effectiveLabelForNew}`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Payment Section */}
        <div className="pt-3 border-t border-slate-100 space-y-3 relative z-10">

          {/* Official PayPal Smart Button Integration */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
            <div className="text-xs text-slate-600 pb-1 border-b border-slate-200/60">
              <span className="font-semibold">Pay with PayPal, Pay Later, or Card:</span>
            </div>

            <PayPalButton
              amount={finalAmount}
              internalOrderNumber={checkoutOrderNumber}
              customerDetails={{
                name: form.name.trim() || auth.currentUser?.displayName || "Valued Customer",
                email:
                  form.email.trim().toLowerCase() ||
                  auth.currentUser?.email?.toLowerCase() ||
                  "",
                phone: form.phone,
                address1: form.address1,
                city: form.city,
                province: form.province,
                zip_code: form.zip_code,
                country_code: form.country_code,
              }}
              orderItems={checkoutItems.map((item) => ({
                title: item.product.title,
                product_title: item.product.title,
                pid: item.product.pid,
                slug: item.product.slug,
                vid: item.variant?.vid,
                tier: item.tier,
                image_url: item.variant?.image_url || item.product.hero_image_url || item.product.images?.[0] || "",
                quantity: item.quantity,
                unit_price: item.unitPrice,
                price: item.unitPrice,
                total_price: item.totalPrice,
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
