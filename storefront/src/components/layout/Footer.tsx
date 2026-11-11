"use client";

import React from "react";
import Link from "next/link";
import VastireLogo from "../ui/VastireLogo";
import { COLLECTION_DEFINITIONS } from "../../lib/seo";
import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-sm mt-10 pb-24 sm:pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        {/* ── Trust Pillars Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">3–5 Day Tracked Delivery</p>
              <p className="text-[11px] text-slate-500">Fast USPS ground shipping</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Verified Quality</p>
              <p className="text-[11px] text-slate-500">Hand-inspected essentials</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <RotateCcw className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Damage Replacement</p>
              <p className="text-[11px] text-slate-500">Hassle-free resolutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Encrypted Payments</p>
              <p className="text-[11px] text-slate-500">PayPal & major credit cards</p>
            </div>
          </div>
        </div>

        {/* ── Brand Summary & Quick Navigation ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-sm">
            <Link href="/" aria-label="Vastire Home">
              <VastireLogo size="md" />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Curated everyday problem-solving essentials for home, kitchen, workspace, and outdoor living. Stocked and dispatched from domestic US facilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 sm:gap-7 text-xs text-slate-600 font-semibold">
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

        {/* ── Collection Hubs (Internal Crawlability) ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-2">
          <span className="font-bold text-slate-700">Collections:</span>
          {COLLECTION_DEFINITIONS.map((col) => (
            <Link
              key={col.slug}
              href={`/collections/${col.slug}`}
              className="hover:text-emerald-700 font-medium transition-colors"
            >
              {col.category}
            </Link>
          ))}
        </div>

        {/* ── Bottom Legal & Copyright ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-100 pt-6">
          <p>© 2026 Vastire (vastire.com). All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/shipping-policy" className="hover:text-slate-600 transition-colors">
              Shipping SLA
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-slate-600 transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
