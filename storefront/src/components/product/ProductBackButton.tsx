"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ProductBackButton() {
  const router = useRouter();

  const handleBack = () => {
    // If user navigated from within our site, return to previous page; otherwise fallback to home
    if (typeof window !== "undefined") {
      const hasHistory = window.history.length > 1;
      const isInternalReferrer =
        document.referrer && document.referrer.includes(window.location.host);

      if (hasHistory && isInternalReferrer) {
        router.back();
        return;
      }
    }
    router.push("/");
  };

  return (
    <div className="block md:hidden">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
        aria-label="Continue Shopping / Go Back"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-600" />
        <span>Continue Shopping</span>
      </button>
    </div>
  );
}
