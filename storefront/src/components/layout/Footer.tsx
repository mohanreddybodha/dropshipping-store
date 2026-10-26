"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, CreditCard, Package } from "lucide-react";

const TRUST_PILLARS = [
  {
    icon: Truck,
    title: "3–5 Day US Delivery",
    subtitle: "Fast tracked domestic dispatch",
  },
  {
    icon: ShieldCheck,
    title: "Damage-Free Guarantee",
    subtitle: "Free replacement on damaged goods",
  },
  {
    icon: CreditCard,
    title: "Verified Secure Checkout",
    subtitle: "Apple Pay, Google Pay, Cards",
  },
  {
    icon: Package,
    title: "US Warehouse Direct",
    subtitle: "Dispatched from US distribution hubs",
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm">
      {/* Trust Pillars */}
      <div className="border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {TRUST_PILLARS.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm leading-tight">{title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 Domestic Lab Inc. All rights reserved. US domestic fulfillment partner.</p>
        <div className="flex gap-5">
          <Link href="/profile" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Track Order
          </Link>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Damage Replacement Policy</span>
        </div>
      </div>
    </footer>
  );
}
