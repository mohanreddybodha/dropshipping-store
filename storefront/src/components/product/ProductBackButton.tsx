"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { popNavigationHistory } from "../../lib/navigationHistory";

export default function ProductBackButton() {
  const router = useRouter();

  const handleBack = () => {
    popNavigationHistory(router, "/");
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={handleBack}
        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-xs cursor-pointer"
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
