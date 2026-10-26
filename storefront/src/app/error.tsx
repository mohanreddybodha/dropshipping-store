"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for diagnostics
    console.error("Storefront Client Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 border border-amber-200">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        Temporarily Unavailable
      </h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        We encountered a temporary issue while loading this page. Our domestic catalog and checkout systems remain operational.
      </p>
      {error?.message && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 max-w-lg overflow-x-auto text-left">
          {error.message}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          <Home className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>
    </div>
  );
}
