"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { popNavigationHistory } from "../../lib/navigationHistory";

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
    popNavigationHistory(router, fallbackHref);
  };

  if (label) {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={`inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition active:scale-95 cursor-pointer ${className}`}
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
      className={`w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition active:scale-95 flex-shrink-0 cursor-pointer shadow-xs ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
