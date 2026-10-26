"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ProductBackButton() {
  const router = useRouter();

  const handleBack = () => {
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
    <div className="flex items-center">
      <button
        type="button"
        onClick={handleBack}
        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition active:scale-95 shadow-sm"
        aria-label="Back to store"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
