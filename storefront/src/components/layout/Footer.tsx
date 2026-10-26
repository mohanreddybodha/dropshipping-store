"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-sm mt-6 pb-24 sm:pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        {/* Minimal Footer Legal Information & Order Tracking */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Domestic Lab. All rights reserved. US domestic fulfillment partner.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-500 font-medium">
            <Link
              href="/profile"
              className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
            >
              Track Order
            </Link>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Damage Replacement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
