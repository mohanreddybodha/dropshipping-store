"use client";

import React from "react";
import Link from "next/link";
import VastireLogo from "../ui/VastireLogo";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-xs mt-8 pb-24 sm:pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        {/* Brand Logo & Quick Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link href="/" aria-label="Vastire Home">
            <VastireLogo size="md" />
          </Link>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold">
            <Link
              href="/profile"
              className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors"
            >
              Track Order
            </Link>
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Catalog
            </Link>
            <Link href="/cart" className="hover:text-slate-900 transition-colors">
              Cart
            </Link>
            <a
              href="mailto:support@vastire.com"
              className="hover:text-slate-900 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>

        {/* Legal Policy Links */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 border-t border-slate-100 pt-4">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/shipping-policy" className="hover:text-slate-600 transition-colors">
            Shipping Policy
          </Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-slate-600 transition-colors">
            Refund Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
