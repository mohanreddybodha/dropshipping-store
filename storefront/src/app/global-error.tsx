"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Application Error</h2>
          <p className="text-sm text-slate-600">
            An unexpected error occurred. Please try refreshing the page or return to the main store.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Page
            </button>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
