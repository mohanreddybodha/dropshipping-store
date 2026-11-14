"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface NavigationBackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
}

export default function NavigationBackButton({
  label,
  fallbackHref = "/",
  className = "",
}: NavigationBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined") {
      // 1. Highest Priority: Explicit 'from' or 'returnUrl' query parameter
      try {
        const params = new URLSearchParams(window.location.search);
        const fromParam = params.get("from") || params.get("returnUrl");
        if (fromParam && fromParam.startsWith("/")) {
          router.push(fromParam);
          return;
        }
      } catch {
        // Ignore URL parsing errors
      }

      // 2. Second Priority: Recorded internal application route from sessionStorage
      try {
        const lastInternalRoute = sessionStorage.getItem("vastire_last_internal_route");
        if (
          lastInternalRoute &&
          lastInternalRoute.startsWith("/") &&
          lastInternalRoute !== window.location.pathname
        ) {
          router.push(lastInternalRoute);
          return;
        }
      } catch {
        // Ignore sessionStorage access errors
      }

      // 3. Third Priority: Browser history if document.referrer came from this origin
      try {
        const isInternalReferrer =
          Boolean(document.referrer) &&
          document.referrer.includes(window.location.host);

        if (isInternalReferrer && window.history.length > 1) {
          router.back();
          return;
        }
      } catch {
        // Ignore referrer access errors
      }
    }

    // 4. Default Fallback (Directly opened page, new tab, or external traffic) -> navigate to Home
    router.push(fallbackHref || "/");
  };

  if (label) {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer ${className}`}
        aria-label={label}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition active:scale-95 flex-shrink-0 cursor-pointer ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
