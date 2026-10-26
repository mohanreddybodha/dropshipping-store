"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, CreditCard, Package } from "lucide-react";

const TRUST_PILLARS = [
  {
    icon: Truck,
    title: "3–5 Day US Delivery",
    subtitle: "Fast tracked domestic dispatch via USPS",
  },
  {
    icon: ShieldCheck,
    title: "Damage-Free Guarantee",
    subtitle: "Free replacement on damaged arrivals",
  },
  {
    icon: CreditCard,
    title: "Secure Checkout",
    subtitle: "Instant Apple Pay, Cards & Wallets",
  },
  {
    icon: Package,
    title: "US Warehouse Direct",
    subtitle: "Dispatched from US distribution hubs",
  },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/90 text-slate-600 text-sm mt-12 pb-24 sm:pb-20 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-10">
        {/* Four Trust Info Cards - Displayed cleanly above the mobile nav */}
        <section aria-label="Customer Guarantees and Trust Pillars">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {TRUST_PILLARS.map(({ icon: Icon, title, subtitle }) => (
              <div
                key={title}
                className="bg-slate-50 border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center gap-2.5 shadow-sm transition hover:shadow-md"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm leading-snug">
                    {title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight line-clamp-2">
                    {subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Minimal Footer Links & Legal Information */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
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
