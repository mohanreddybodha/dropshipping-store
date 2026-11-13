"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, ShieldCheck, RotateCcw, Lock, Tag } from "lucide-react";
import VastireLogo from "../ui/VastireLogo";
import { COLLECTION_DEFINITIONS } from "../../lib/seo";

export default function Footer() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Only keep the footer on the homepage.
  // On Watchlist, Cart, Profile, Product pages, and other subpages, do not render at the bottom of the page.
  if (!isHome) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-xs mt-3 sm:mt-5 pb-[82px] md:pb-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4">
        {/* ── Bottom Feature & Hashtag Card: Shown ONLY on the Home Page, Removed on Watchlist & Profile ── */}
        {isHome && (
          <div className="space-y-3 pb-3 border-b border-slate-100">
            {/* 4 Feature Pillars with Icon & Name */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                  3–5 Day US Delivery
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                  Verified Quality
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                  Damage Replacement
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                  Encrypted Checkout
                </span>
              </div>
            </div>

            {/* Collection Hashtag Categories */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 text-xs">
              <span className="font-bold text-slate-500 text-[11px] flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>Categories:</span>
              </span>
              {COLLECTION_DEFINITIONS.map((col) => (
                <Link
                  key={col.slug}
                  href={`/collections/${col.slug}`}
                  className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold text-[11px] transition-colors"
                >
                  <span className="text-emerald-600 font-bold">#</span>
                  <span>{col.category}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Brand Logo & Quick Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <Link href="/" aria-label="Vastire Home">
            <VastireLogo size="md" />
          </Link>

          <div className="flex flex-wrap items-center gap-3.5 sm:gap-6 font-semibold text-[11px] sm:text-xs">
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
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-slate-400 border-t border-slate-100 pt-3 text-[11px] sm:text-xs">
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
