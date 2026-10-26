"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isCheckout = pathname === "/checkout";
  const isHome = pathname === "/";
  const isProduct = pathname.startsWith("/products/");

  if (isCheckout) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Distraction-Free Checkout Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center font-black text-base shadow-sm">
                D
              </div>
              <span className="font-black text-sm uppercase tracking-tight text-slate-950">
                Domestic Lab
              </span>
            </Link>

            <div className="flex items-center gap-4 text-xs">
              <span className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Secure Checkout
              </span>
              <Link
                href="/cart"
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Cart
              </Link>
            </div>
          </div>
        </header>

        {/* Checkout Main Flow */}
        <main className="flex-1">{children}</main>

        {/* Minimal Checkout Compliance Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
          <p>© {new Date().getFullYear()} Domestic Lab. All rights reserved.</p>
          <p className="mt-1">
            Need assistance with your order? Contact{" "}
            <a href="mailto:support@domesticlab.com" className="text-slate-600 underline">
              support@domesticlab.com
            </a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header ONLY rendered on the home screen */}
      {isHome && (
        <Suspense fallback={<div className="h-16 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
      )}

      {/* Main Content: Adds bottom padding on mobile non-home screens so bottom nav doesn't overlap */}
      <main className={`flex-1 ${!isProduct && !isHome ? "pb-20 md:pb-0" : ""}`}>{children}</main>

      {/* Retail Trust Pillars & Footer on Home (Shown on both mobile & desktop with safe clearance above nav) */}
      {isHome && <Footer />}

      {/* Native App-Style Mobile Bottom Navigation Bar: Hidden on product pages and checkout */}
      {!isProduct && <MobileBottomNav />}
    </div>
  );
}
