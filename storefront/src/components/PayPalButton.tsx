"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPayPalOrder, capturePayPalOrder } from "../lib/api";
import { AlertCircle, Loader2 } from "lucide-react";

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  province: string;
  zip_code: string;
  country_code: string;
}

interface PayPalButtonProps {
  amount: number;
  internalOrderNumber: string;
  customerDetails: CustomerDetails;
  orderItems: any[];
  firebaseUid?: string;
  onValidate: () => boolean;
  onProcessingChange?: (isProcessing: boolean) => void;
  onSuccess: (orderData: any) => void;
  onError: (errMsg: string) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({
  amount,
  internalOrderNumber,
  customerDetails,
  orderItems,
  firebaseUid,
  onValidate,
  onProcessingChange,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isRenderedRef = useRef(false);
  const isLockedRef = useRef(false);

  // Store latest props in a ref to avoid re-rendering PayPal buttons on user input changes
  const latestPropsRef = useRef({
    amount,
    internalOrderNumber,
    customerDetails,
    orderItems,
    firebaseUid,
    onValidate,
    onProcessingChange,
    onSuccess,
    onError,
  });

  useEffect(() => {
    latestPropsRef.current = {
      amount,
      internalOrderNumber,
      customerDetails,
      orderItems,
      firebaseUid,
      onValidate,
      onProcessingChange,
      onSuccess,
      onError,
    };
  });

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  // Step 1: Load SDK script once
  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      setLoadError("Payment processor configuration missing. Please verify environment variables.");
      return;
    }

    if (window.paypal) {
      setSdkReady(true);
      return;
    }

    const scriptId = "paypal-sdk-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement;
    if (existing) {
      existing.addEventListener("load", () => {
        if (isMounted) setSdkReady(true);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture&components=buttons`;
    script.async = true;

    script.onload = () => {
      if (isMounted) setSdkReady(true);
    };

    script.onerror = () => {
      if (isMounted) {
        setLoadError("Failed to load PayPal secure checkout gateway.");
        onError("Failed to initialize payment gateway. Check network connection.");
      }
    };

    document.body.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, [clientId, onError]);

  // Step 2: Render PayPal Buttons exactly once into container
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.paypal || isRenderedRef.current) return;

    isRenderedRef.current = true;
    const container = containerRef.current;

    try {
      window.paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 44,
          },
          createOrder: async () => {
            const current = latestPropsRef.current;

            // Anti-Spam Mutex: Disallow duplicate clicks if already processing
            if (isLockedRef.current) {
              throw new Error("Payment authorization is already in progress. Please wait.");
            }

            const isValid = current.onValidate();
            if (!isValid) {
              throw new Error("Please complete the required delivery address fields above.");
            }

            try {
              isLockedRef.current = true;
              const res = await createPayPalOrder(
                current.amount,
                current.internalOrderNumber,
                current.customerDetails
              );
              isLockedRef.current = false;
              return res.order_id;
            } catch (err: any) {
              isLockedRef.current = false;
              current.onProcessingChange?.(false);
              const msg = err.message || "Failed to create secure payment order.";
              current.onError(msg);
              throw err;
            }
          },
          onApprove: async (data: any) => {
            const current = latestPropsRef.current;
            current.onProcessingChange?.(true);

            const capturePayload = {
              paypal_order_id: data.orderID,
              internal_order_number: current.internalOrderNumber,
              customer_name: current.customerDetails.name,
              customer_email: current.customerDetails.email,
              customer_phone: current.customerDetails.phone,
              shipping_address: current.customerDetails.address1,
              shipping_city: current.customerDetails.city,
              shipping_province: current.customerDetails.province,
              shipping_zip: current.customerDetails.zip_code,
              shipping_country: current.customerDetails.country_code || "US",
              items: current.orderItems,
              firebase_uid: current.firebaseUid,
            };

            let captured = null;
            let lastError = null;

            // Self-Healing Retry Loop (Resilient against momentary cellular/Wi-Fi drops)
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                captured = await capturePayPalOrder(capturePayload);
                if (captured) break;
              } catch (err: any) {
                lastError = err;
                console.warn(`[PayPal Capture] Attempt ${attempt} failed:`, err.message);
                if (attempt < 3) {
                  await new Promise((r) => setTimeout(r, 1200 * attempt));
                }
              }
            }

            if (captured) {
              current.onSuccess(captured);
            } else {
              isLockedRef.current = false;
              current.onProcessingChange?.(false);
              const msg = lastError?.message || "Payment capture timed out. Please check network connection.";
              current.onError(msg);
            }
          },
          onError: (err: any) => {
            isLockedRef.current = false;
            latestPropsRef.current.onProcessingChange?.(false);
            if (err?.message?.includes("container element removed")) return;
            latestPropsRef.current.onError("Payment encountered an issue. Please verify your details and retry.");
          },
          onCancel: () => {
            isLockedRef.current = false;
            latestPropsRef.current.onProcessingChange?.(false);
          },
        })
        .render(container)
        .catch((err: any) => {
          if (err?.message?.includes("container element removed")) return;
          console.error("[PayPalButton] Render error:", err);
        });
    } catch (renderErr: any) {
      if (!renderErr?.message?.includes("container element removed")) {
        console.error("[PayPalButton] Initialization failed:", renderErr);
      }
    }

    return () => {
      isRenderedRef.current = false;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [sdkReady]);

  if (loadError) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>{loadError}</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {!sdkReady && (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Connecting to PayPal Zero-Trust Encryption Gateway...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full min-h-[44px]" />
    </div>
  );
}
